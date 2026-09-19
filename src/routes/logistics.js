const express = require('express');
const router = express.Router();
const logisticsController = require('../controllers/logisticsController');
const { authMiddleware } = require('../middleware/auth');

router.post('/', authMiddleware, logisticsController.createLogistics);
router.get('/', authMiddleware, logisticsController.getMyLogistics);
router.get('/transaction/:txId', authMiddleware, logisticsController.getLogisticsByTransaction);
router.put('/:id/status', authMiddleware, logisticsController.updateLogisticsStatus);

module.exports = router;
