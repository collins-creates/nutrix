const express = require('express');
const router = express.Router();
const searchController = require('../controllers/searchController');

// Search foods
router.get('/search', (req, res, next) => {
  console.log('Search route hit!', req.query);
  next();
}, searchController.search);

// Autocomplete suggestions
router.get('/autocomplete',
  searchController.autocomplete
);

// Get food details
router.get('/food/:id',
  searchController.getFoodDetails
);

module.exports = router;
