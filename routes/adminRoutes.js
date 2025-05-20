// Admin routes for Quisin
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const { checkRole } = require('../middleware/roleMiddleware');
const userModel = require('../models/userModel');

// Import controllers
// These will be implemented as we develop the features
const adminController = require('../controllers/admin/adminController');
const supportController = require('../controllers/admin/supportController');

// Middleware to check if user is an admin
const adminAuth = [authenticateToken, checkRole([userModel.ROLES.ADMIN])];

// Dashboard overview route
router.get('/dashboard', adminAuth, adminController.getDashboardStats);

// Restaurant setup routes
router.get('/restaurant', adminAuth, adminController.getRestaurantDetails);
router.put('/restaurant', adminAuth, adminController.updateRestaurantDetails);
router.get('/restaurant/admin', adminAuth, adminController.getAdminRestaurant);
router.get('/restaurant/branches', adminAuth, adminController.getRestaurantBranches);

// Table management routes
router.get('/tables', adminAuth, adminController.getAllTables);
router.post('/tables', adminAuth, adminController.createTable);
router.get('/tables/:id', adminAuth, adminController.getTableById);
router.put('/tables/:id', adminAuth, adminController.updateTable);
router.put('/tables/:id/status', adminAuth, adminController.updateTableStatus);
router.get('/tables/:id/qrcode', adminAuth, adminController.generateTableQRCode);

// Menu & Inventory management routes
router.get('/categories', adminAuth, adminController.getAllCategories);
router.post('/categories', adminAuth, adminController.createCategory);
router.put('/categories/:id', adminAuth, adminController.updateCategory);
router.delete('/categories/:id', adminAuth, adminController.deleteCategory);

router.get('/dishes', adminAuth, adminController.getAllDishes);
router.post('/dishes', adminAuth, adminController.createDish);
router.get('/dishes/:id', adminAuth, adminController.getDishById);
router.put('/dishes/:id', adminAuth, adminController.updateDish);
router.delete('/dishes/:id', adminAuth, adminController.deleteDish);
router.put('/dishes/:id/availability', adminAuth, adminController.updateDishAvailability);

router.get('/inventory', adminAuth, adminController.getInventory);
router.post('/inventory/restock', adminAuth, adminController.restockInventory);

// Reservation handling routes
router.get('/reservations', adminAuth, adminController.getAllReservations);
router.post('/reservations', adminAuth, adminController.createReservation);
router.get('/reservations/:id', adminAuth, adminController.getReservationById);
router.put('/reservations/:id', adminAuth, adminController.updateReservation);
router.put('/reservations/:id/status', adminAuth, adminController.updateReservationStatus);

// Support ticket routes
router.get('/support-tickets', adminAuth, supportController.getAllTickets);
router.post('/support-tickets', adminAuth, supportController.createTicket);
router.get('/support-tickets/:id', adminAuth, supportController.getTicketById);
router.put('/support-tickets/:id/status', adminAuth, supportController.updateTicketStatus);
router.post('/support-tickets/:id/messages', adminAuth, supportController.addMessage);

// Staff management routes
router.get('/staff', adminAuth, adminController.getAllStaff);
router.post('/staff', adminAuth, adminController.createStaff);
router.post('/staff/bulk', adminAuth, adminController.bulkCreateStaff);
router.get('/staff/:id', adminAuth, adminController.getStaffById);
router.put('/staff/:id', adminAuth, adminController.updateStaff);
router.put('/staff/:id/status', adminAuth, adminController.updateStaffStatus);
router.post('/staff/:id/regenerate-credentials', adminAuth, adminController.regenerateStaffCredentials);
router.get('/staff/:id/credentials-pdf', adminAuth, adminController.generateStaffCredentialsPDF);

router.get('/roles', adminAuth, adminController.getAllRoles);
router.post('/roles', adminAuth, adminController.createRole);
router.put('/roles/:id', adminAuth, adminController.updateRole);
router.delete('/roles/:id', adminAuth, adminController.deleteRole);

// Analytics routes
router.get('/analytics/sales', adminAuth, adminController.getSalesAnalytics);
router.get('/analytics/items', adminAuth, adminController.getItemsAnalytics);
router.get('/analytics/peak-hours', adminAuth, adminController.getPeakHoursAnalytics);
router.get('/analytics/chains', adminAuth, adminController.getChainsAnalytics);

// Customer feedback routes
router.get('/reviews', adminAuth, adminController.getAllReviews);
router.put('/reviews/:id/moderate', adminAuth, adminController.moderateReview);

module.exports = router;
