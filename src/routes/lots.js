const express = require('express');
const router = express.Router();
const lotController = require('../controllers/lotController');
const { authMiddleware } = require('../middleware/auth');

router.post('/', authMiddleware, lotController.createLot);
router.get('/', authMiddleware, lotController.getLots);

module.exports = router;
