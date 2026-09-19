const express = require('express');
const router = express.Router();
const mandiController = require('../controllers/mandiController');

// GET /api/market-prices
router.get('/', mandiController.getMarketPrices);

module.exports = router;
