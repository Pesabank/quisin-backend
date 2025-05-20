// Authentication routes for Quisin
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Login route
router.post('/login', authController.login);

// Register superadmin route (initial setup only)
router.post('/register-superadmin', authController.registerSuperadmin);

// Get current user profile
router.get('/me', authenticateToken, authController.getCurrentUser);

module.exports = router;
