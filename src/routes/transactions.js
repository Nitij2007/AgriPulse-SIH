const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const { authMiddleware } = require('../middleware/auth');

router.post('/', authMiddleware, transactionController.createTransaction);
router.get('/farmer', authMiddleware, transactionController.getFarmerTransactions);
router.get('/buyer', authMiddleware, transactionController.getBuyerTransactions);
router.get('/:id', authMiddleware, transactionController.getTransactionById);
router.put('/:id/status', authMiddleware, transactionController.updateTransactionStatus);

module.exports = router;
