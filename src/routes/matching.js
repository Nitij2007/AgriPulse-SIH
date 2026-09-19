const express = require('express');
const router = express.Router();
const matchingController = require('../controllers/matchingController');
const { authMiddleware } = require('../middleware/auth');

// GET /api/matching - Run matching engine for buyer's requirements
router.get('/', authMiddleware, matchingController.getMatchingLots);

// GET /api/matching/browse - Browse all listed lots
router.get('/browse', authMiddleware, matchingController.getAllListedLots);

// GET /api/matching/buyers - Run matching engine for farmer's lots against buyer requirements
router.get('/buyers', authMiddleware, matchingController.getMatchingBuyers);

module.exports = router;
