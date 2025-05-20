const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const { checkRole } = require('../middleware/roleMiddleware');
const userModel = require('../models/userModel');

// Import controllers
const chainController = require('../controllers/admin/chainController');

// Middleware to check if user is an admin
const adminAuth = [authenticateToken, checkRole([userModel.ROLES.ADMIN])];

// Chain management routes
router.get('/parent-restaurant', adminAuth, chainController.getParentRestaurant);
router.get('/branches', adminAuth, chainController.getAllBranches);
router.post('/branches', adminAuth, chainController.createBranch);
router.put('/branches/:branchId', adminAuth, chainController.updateBranch);
router.put('/branches/:branchId/status', adminAuth, chainController.updateBranchStatus);
router.get('/branches/:branchId/analytics', adminAuth, chainController.getBranchAnalytics);
router.put('/branches/menu-logic/all', adminAuth, chainController.updateAllBranchesMenuLogic);

module.exports = router;
