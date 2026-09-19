const express = require('express');
const router = express.Router();
const reqController = require('../controllers/requirementController');
const { authMiddleware } = require('../middleware/auth');

router.post('/', authMiddleware, reqController.createRequirement);
router.get('/', authMiddleware, reqController.getRequirements);

module.exports = router;
