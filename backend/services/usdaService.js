const axios = require('axios');
const config = require('../config/config');
const cache = require('../config/database');
const logger = require('../utils/logger');

class USDAService {
  constructor() {
    this.client = axios.create({
      baseURL: config.usda.baseUrl,
      timeout: 10000
    });
  }

  async searchFoods(query, pageSize = 20, pageNumber = 1) {
    try {
      const cacheKey = `search:${query}:${pageSize}:${pageNumber}`;
      const cached = await cache.get(cacheKey);
      
      if (cached) {
        logger.debug(`Cache hit for search: ${query}`);
        return cached;
      }

      if (!config.usda.apiKey) {
        throw new Error('USDA API key not configured');
      }

      const response = await this.client.get('/foods/search', {
        params: {
          query: query,
          pageSize: pageSize,
          pageNumber: pageNumber,
          api_key: config.usda.apiKey,
          dataType: ['Foundation', 'SR Legacy', 'Survey (FNDDS)']
        }
      });

      const result = {
        foods: response.data.foods || [],
        totalHits: response.data.totalHits || 0,
        currentPage: pageNumber,
        pageSize: pageSize
      };

      await cache.set(cacheKey, result, config.cache.searchTtl);
      logger.info(`Successfully searched for: ${query}, found ${result.totalHits} results`);

      return result;
    } catch (error) {
      logger.error('USDA search error:', error.response?.data || error.message);
      throw this.handleAPIError(error);
    }
  }

  async getFoodDetails(fdcId) {
    try {
      const cacheKey = `food:${fdcId}`;
      const cached = await cache.get(cacheKey);
      
      if (cached) {
        logger.debug(`Cache hit for food: ${fdcId}`);
        return cached;
      }

      if (!config.usda.apiKey) {
        throw new Error('USDA API key not configured');
      }

      const response = await this.client.get(`/food/${fdcId}`, {
        params: {
          api_key: config.usda.apiKey
        }
      });

      const foodData = this.formatFoodData(response.data);
      await cache.set(cacheKey, foodData, config.cache.ttl);
      
      logger.info(`Successfully retrieved food details for FDC ID: ${fdcId}`);
      return foodData;
    } catch (error) {
      logger.error('USDA food details error:', error.response?.data || error.message);
      throw this.handleAPIError(error);
    }
  }

  formatFoodData(food) {
    const nutrients = {};
    const servingSize = food.servingSize || 100;
    const servingUnit = food.servingSizeUnit || 'g';

    food.foodNutrients?.forEach(nutrient => {
      nutrients[nutrient.nutrientName] = {
        id: nutrient.nutrientId,
        name: nutrient.nutrientName,
        amount: nutrient.amount,
        unitName: nutrient.unitName,
        value: nutrient.value
      };
    });

    return {
      fdcId: food.fdcId,
      description: food.description,
      dataType: food.dataType,
      ingredients: food.ingredients || '',
      brandOwner: food.brandOwner || '',
      servingSize: servingSize,
      servingSizeUnit: servingUnit,
      nutrients: nutrients,
      macros: this.extractMacros(nutrients),
      calories: this.getCalories(nutrients)
    };
  }

  extractMacros(nutrients) {
    return {
      protein: nutrients['Protein']?.amount || 0,
      carbohydrates: nutrients['Carbohydrate, by difference']?.amount || 0,
      fat: nutrients['Total lipid (fat)']?.amount || 0,
      fiber: nutrients['Fiber, total dietary']?.amount || 0,
      sugar: nutrients['Sugars, total including NLEA']?.amount || 0,
      sodium: nutrients['Sodium, Na']?.amount || 0,
      cholesterol: nutrients['Cholesterol']?.amount || 0
    };
  }

  getCalories(nutrients) {
    return nutrients['Energy']?.amount || 0;
  }

  handleAPIError(error) {
    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.error?.message || error.response.data?.message || 'Unknown API error';
      
      switch (status) {
        case 401:
          return new Error('Invalid USDA API key');
        case 404:
          return new Error('Food not found');
        case 429:
          return new Error('API rate limit exceeded');
        case 500:
          return new Error('USDA API server error');
        default:
          return new Error(`USDA API error: ${message}`);
      }
    } else if (error.code === 'ECONNABORTED') {
      return new Error('Request timeout');
    } else {
      return error;
    }
  }

  async getAutocompleteSuggestions(query, limit = 10) {
    try {
      if (!query || query.length < 2) {
        return [];
      }

      const cacheKey = `autocomplete:${query}:${limit}`;
      const cached = await cache.get(cacheKey);
      
      if (cached) {
        return cached;
      }

      const searchResult = await this.searchFoods(query, limit, 1);
      const suggestions = searchResult.foods.map(food => ({
        fdcId: food.fdcId,
        description: food.description,
        brandOwner: food.brandOwner || '',
        dataType: food.dataType
      }));

      await cache.set(cacheKey, suggestions, config.cache.searchTtl);
      return suggestions;
    } catch (error) {
      logger.error('Autocomplete error:', error);
      return [];
    }
  }
}

module.exports = new USDAService();
