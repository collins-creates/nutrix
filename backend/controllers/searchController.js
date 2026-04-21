const { body, query, validationResult } = require('express-validator');
const usdaService = require('../services/usdaService');
const infoodsService = require('../services/infoodsService');
const logger = require('../utils/logger');

class SearchController {
  async search(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { q: query, pageSize = 20, pageNumber = 1 } = req.query;
      const size = Math.min(parseInt(pageSize), 50);
      const page = Math.max(parseInt(pageNumber), 1);

      let results = null;
      let source = 'usda';

      try {
        results = await usdaService.searchFoods(query, size, page);
        source = 'usda';
      } catch (usdaError) {
        logger.warn('USDA search failed, falling back to INFOODS:', usdaError.message);
        
        if (infoodsService.isAvailable()) {
          results = infoodsService.searchFoods(query, size, page);
          source = 'infoods';
        } else {
          throw new Error('Both USDA API and INFOODS fallback are unavailable');
        }
      }

      res.json({
        success: true,
        data: results,
        source: source,
        query: query,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Search endpoint error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }

  async autocomplete(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { q: query, limit = 10 } = req.query;
      const maxLimit = Math.min(parseInt(limit), 20);

      let suggestions = [];

      try {
        suggestions = await usdaService.getAutocompleteSuggestions(query, maxLimit);
      } catch (usdaError) {
        logger.debug('USDA autocomplete failed, trying INFOODS:', usdaError.message);
        suggestions = await infoodsService.getAutocompleteSuggestions(query, maxLimit);
      }

      res.json({
        success: true,
        data: suggestions,
        query: query,
        count: suggestions.length
      });

    } catch (error) {
      logger.error('Autocomplete endpoint error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }

  async getFoodDetails(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { id } = req.params;
      let foodDetails = null;
      let source = 'usda';

      try {
        foodDetails = await usdaService.getFoodDetails(id);
        source = 'usda';
      } catch (usdaError) {
        logger.warn('USDA food details failed, trying INFOODS:', usdaError.message);
        
        try {
          foodDetails = infoodsService.getFoodDetails(id);
          source = 'infoods';
        } catch (infoodsError) {
          throw new Error('Food not found in any database');
        }
      }

      res.json({
        success: true,
        data: foodDetails,
        source: source,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Food details endpoint error:', error);
      res.status(404).json({
        success: false,
        message: error.message || 'Food not found'
      });
    }
  }

  static validateSearch() {
    return [
      query('q')
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Search query must be between 1 and 100 characters')
        .escape(),
      query('pageSize')
        .optional()
        .isInt({ min: 1, max: 50 })
        .withMessage('Page size must be between 1 and 50'),
      query('pageNumber')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page number must be at least 1')
    ];
  }

  static validateAutocomplete() {
    return [
      query('q')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Autocomplete query must be between 2 and 100 characters')
        .escape(),
      query('limit')
        .optional()
        .isInt({ min: 1, max: 20 })
        .withMessage('Limit must be between 1 and 20')
    ];
  }

  static validateFoodId() {
    return [
      body('id')
        .trim()
        .isLength({ min: 1, max: 50 })
        .withMessage('Food ID must be between 1 and 50 characters')
        .matches(/^[a-zA-Z0-9_-]+$/)
        .withMessage('Food ID can only contain letters, numbers, hyphens, and underscores')
    ];
  }
}

const searchControllerInstance = new SearchController();
module.exports = searchControllerInstance;
module.exports.SearchController = SearchController;
