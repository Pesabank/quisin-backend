// Superadmin routes for Quisin
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const { checkRole } = require('../middleware/roleMiddleware');
const userModel = require('../models/userModel');

// Import controllers
// These will be implemented as we develop the features
const superadminController = require('../controllers/superadmin/superadminController');
const supportController = require('../controllers/superadmin/supportController');
const settingsController = require('../controllers/superadmin/settingsController');

// Middleware to check if user is a superadmin
const superadminAuth = [authenticateToken, checkRole([userModel.ROLES.SUPERADMIN])];

// Dashboard overview route
router.get('/dashboard', superadminAuth, superadminController.getDashboardStats);

// Restaurant management routes
router.post('/restaurants', superadminAuth, superadminController.createRestaurant);
router.get('/restaurants', superadminAuth, superadminController.getAllRestaurants);
router.get('/restaurants/:id', superadminAuth, superadminController.getRestaurantById);
router.put('/restaurants/:id', superadminAuth, superadminController.updateRestaurant);
router.put('/restaurants/:id/status', superadminAuth, superadminController.updateRestaurantStatus);

// Staff management routes
router.get('/staff', superadminAuth, superadminController.getAllStaff);
router.put('/staff/:id/status', superadminAuth, superadminController.updateStaffStatus);
router.post('/staff/:id/regenerate-credentials', superadminAuth, superadminController.regenerateStaffCredentials);
router.get('/staff/:userId/admin-credentials', superadminAuth, superadminController.downloadAdminCredentials);

// System logs and audit trail
router.get('/system-logs', superadminAuth, superadminController.getSystemLogs);

// Support tickets
router.get('/support-tickets', superadminAuth, supportController.getAllTickets);
router.get('/support-tickets/:id', superadminAuth, supportController.getTicketById);
router.put('/support-tickets/:id/status', superadminAuth, supportController.updateTicketStatus);
router.post('/support-tickets/:id/messages', superadminAuth, supportController.addMessage);

// Global settings
router.get('/settings', superadminAuth, superadminController.getGlobalSettings);
router.put('/settings', superadminAuth, superadminController.updateGlobalSettings);

// Specific settings routes
router.get('/settings/subscriptions', superadminAuth, settingsController.getSubscriptions);
router.put('/settings/subscriptions', superadminAuth, settingsController.updateSubscriptions);
router.get('/settings/appearance', superadminAuth, settingsController.getAppearance);
router.put('/settings/appearance', superadminAuth, settingsController.updateAppearance);
router.get('/settings/pdf-branding', superadminAuth, settingsController.getPdfBranding);
router.put('/settings/pdf-branding', superadminAuth, settingsController.updatePdfBranding);
router.get('/settings/announcements', superadminAuth, settingsController.getAnnouncements);
router.put('/settings/announcements', superadminAuth, settingsController.updateAnnouncements);

module.exports = router;
