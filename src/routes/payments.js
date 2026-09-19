const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authMiddleware } = require('../middleware/auth');

router.post('/', authMiddleware, paymentController.createPayment);
router.get('/', authMiddleware, paymentController.getPaymentsByUser);
router.get('/transaction/:txId', authMiddleware, paymentController.getPaymentsByTransaction);
router.put('/:id/status', authMiddleware, paymentController.updatePaymentStatus);

module.exports = router;
