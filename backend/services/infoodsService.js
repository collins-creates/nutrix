const Fuse = require('fuse.js');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

class INFOODSService {
  constructor() {
    this.foods = [];
    this.fuseOptions = {
      keys: ['description'],
      threshold: 0.4,
      includeScore: true,
      minMatchCharLength: 2
    };
    this.fuse = null;
  }

  async initialize() {
    try {
      const dataPath = path.join(__dirname, '../../data/infoods_fallback.json');
      const data = await fs.readFile(dataPath, 'utf8');
      const parsedData = JSON.parse(data);
      
      this.foods = parsedData.foods.map(food => this.formatFoodData(food));
      this.fuse = new Fuse(this.foods, this.fuseOptions);
      
      logger.info(`Loaded ${this.foods.length} INFOODS foods`);
    } catch (error) {
      logger.error('Failed to load INFOODS data:', error);
      this.foods = [];
      this.fuse = null;
    }
  }

  formatFoodData(food) {
    const nutrients = {};
    
    Object.entries(food.nutrients || {}).forEach(([name, data]) => {
      nutrients[name] = {
        name: name,
        amount: data.amount,
        unitName: data.unitName
      };
    });

    return {
      fdcId: food.fdcId,
      description: food.description,
      dataType: food.dataType,
      servingSize: food.servingSize || 100,
      servingSizeUnit: food.servingSizeUnit || 'g',
      nutrients: nutrients,
      macros: this.extractMacros(nutrients),
      calories: this.getCalories(nutrients),
      brandOwner: '',
      ingredients: ''
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

  searchFoods(query, pageSize = 20, pageNumber = 1) {
    if (!this.fuse || this.foods.length === 0) {
      return {
        foods: [],
        totalHits: 0,
        currentPage: pageNumber,
        pageSize: pageSize,
        source: 'infoods'
      };
    }

    const results = this.fuse.search(query);
    const startIndex = (pageNumber - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedResults = results.slice(startIndex, endIndex).map(result => result.item);

    return {
      foods: paginatedResults,
      totalHits: results.length,
      currentPage: pageNumber,
      pageSize: pageSize,
      source: 'infoods'
    };
  }

  getFoodDetails(fdcId) {
    const food = this.foods.find(f => f.fdcId === fdcId);
    if (!food) {
      throw new Error('Food not found in INFOODS database');
    }
    return food;
  }

  async getAutocompleteSuggestions(query, limit = 10) {
    if (!this.fuse || !query || query.length < 2) {
      return [];
    }

    const results = this.fuse.search(query, { limit: limit });
    return results.map(result => ({
      fdcId: result.item.fdcId,
      description: result.item.description,
      brandOwner: result.item.brandOwner || '',
      dataType: result.item.dataType,
      score: result.score
    }));
  }

  isAvailable() {
    return this.foods.length > 0 && this.fuse !== null;
  }
}

module.exports = new INFOODSService();
