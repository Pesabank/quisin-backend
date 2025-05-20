const db = require('../config/db');

// Action types
const ACTIONS = {
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  STATUS_CHANGE: 'STATUS_CHANGE',
  EXPORT: 'EXPORT',
  IMPORT: 'IMPORT'
};

/**
 * Log a system activity
 * @param {Object} params - Logging parameters
 * @param {string} params.userId - ID of the user performing the action
 * @param {string} params.userEmail - Email of the user performing the action
 * @param {string} params.userRole - Role of the user performing the action
 * @param {string} params.action - Type of action performed (use ACTIONS enum)
 * @param {string} params.details - Human-readable description of the action
 * @param {string} [params.ipAddress] - IP address of the user
 * @param {string} [params.entityType] - Type of entity involved (e.g., 'restaurant', 'staff')
 * @param {string} [params.entityId] - ID of the entity involved
 * @param {string} [params.logType] - Type of log (e.g., 'system', 'security', 'audit')
 * @param {string} [params.status] - Status of the action (e.g., 'success', 'failure')
 */
const logSystemActivity = async (params) => {
  const {
    userId,
    userEmail,
    userRole,
    action,
    details,
    ipAddress,
    entityType,
    entityId,
    logType = 'system',
    status = 'success'
  } = params;

  try {
    const query = `
      INSERT INTO system_logs 
        (user_id, user_email, user_role, action, details, ip_address, entity_type, entity_id, log_type, status)
      VALUES 
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id
    `;

    const values = [
      userId,
      userEmail,
      userRole,
      action,
      details,
      ipAddress,
      entityType,
      entityId,
      logType,
      status
    ];

    await db.query(query, values);
  } catch (error) {
    console.error('Error logging system activity:', error);
    // Don't throw the error - we don't want logging failures to break the main functionality
  }
};

// Helper functions for common log types
const logLogin = async (userId, userEmail, userRole, ipAddress, success = true, error = null) => {
  await logSystemActivity({
    userId,
    userEmail,
    userRole,
    action: ACTIONS.LOGIN,
    details: {
      message: success ? 'User logged in successfully' : 'Login attempt failed',
      success,
      error: error || null,
      timestamp: new Date().toISOString()
    },
    ipAddress,
    logType: 'security',
    status: success ? 'success' : 'failure',
    entityType: 'user',
    entityId: userId
  });
};

const logRestaurantAction = async (userId, userEmail, userRole, action, restaurantId, restaurantName, message) => {
  await logSystemActivity({
    userId,
    userEmail,
    userRole,
    action,
    details: {
      message,
      restaurantId,
      restaurantName,
      timestamp: new Date().toISOString()
    },
    entityType: 'restaurant',
    entityId: restaurantId,
    logType: 'audit'
  });
};

const logStaffAction = async (userId, userEmail, userRole, action, staffId, staffName, message) => {
  await logSystemActivity({
    userId,
    userEmail,
    userRole,
    action,
    details: {
      message,
      staffId,
      staffName,
      timestamp: new Date().toISOString()
    },
    entityType: 'staff',
    entityId: staffId,
    logType: 'audit'
  });
};

module.exports = {
  ACTIONS,
  logSystemActivity,
  logLogin,
  logRestaurantAction,
  logStaffAction
};
