const express = require('express');
const router = express.Router();
const grievanceController = require('../controllers/grievanceController');
const { authMiddleware } = require('../middleware/auth');

router.post('/', authMiddleware, grievanceController.createGrievance);
router.get('/', authMiddleware, grievanceController.getGrievancesByUser);
router.get('/:id', authMiddleware, grievanceController.getGrievanceById);
router.put('/:id/status', authMiddleware, grievanceController.updateGrievanceStatus);

module.exports = router;
