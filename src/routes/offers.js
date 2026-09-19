const express = require('express');
const router = express.Router();
const offerController = require('../controllers/offerController');
const { authMiddleware } = require('../middleware/auth');

router.post('/', authMiddleware, offerController.createOffer);
router.get('/', authMiddleware, offerController.getMyOffers);
router.patch('/:offerId/accept', authMiddleware, offerController.acceptOffer);
router.patch('/:offerId/reject', authMiddleware, offerController.rejectOffer);

module.exports = router;
