// Admin controller for Quisin
const db = require('../../config/db');
const userModel = require('../../models/userModel');
const bcrypt = require('bcrypt');
const { generatePDF } = require('../../utils/pdfGenerator');
const QRCode = require('qrcode');

// Get dashboard statistics
const getDashboardStats = async (req, res) => {
  try {
    const { id: adminId } = req.user;
    
    // Get the restaurant ID for this admin
    const restaurantQuery = `
      SELECT r.id
      FROM restaurants r
      JOIN restaurant_admins ra ON r.id = ra.restaurant_id
      WHERE ra.admin_id = $1
    `;
    
    const restaurantResult = await db.query(restaurantQuery, [adminId]);
    
    if (restaurantResult.rows.length === 0) {
      return res.status(404).json({ message: 'Restaurant not found for this admin' });
    }
    
    const restaurantId = restaurantResult.rows[0].id;
    
    const stats = {
      totalOrders: 0,
      totalRevenue: 0,
      activeTables: 0,
      inactiveTables: 0,
      totalMenuItems: 0,
      totalChains: 0,
      activeStaff: 0,
      inactiveStaff: 0,
      totalReservations: 0,
      averageRating: 0,
      activeAlerts: 0,
      recentActivities: []
    };
    
    res.status(200).json(stats);
  } catch (error) {
    console.error('Error getting dashboard stats:', error);
    res.status(500).json({ message: 'Error getting dashboard stats', error: error.message });
  }
};

// Get restaurant details
const getRestaurantDetails = async (req, res) => {
  try {
    const { id: adminId } = req.user;
    
    const restaurantQuery = `
      SELECT r.*
      FROM restaurants r
      JOIN restaurant_admins ra ON r.id = ra.restaurant_id
      WHERE ra.admin_id = $1
    `;
    
    const restaurantResult = await db.query(restaurantQuery, [adminId]);
    
    if (restaurantResult.rows.length === 0) {
      return res.status(404).json({ message: 'Restaurant not found for this admin' });
    }
    
    res.status(200).json(restaurantResult.rows[0]);
  } catch (error) {
    console.error('Error getting restaurant details:', error);
    res.status(500).json({ message: 'Error getting restaurant details', error: error.message });
  }
};

module.exports = {
  getDashboardStats,
  getRestaurantDetails
};
