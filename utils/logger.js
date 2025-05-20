const db = require('../config/db');

/**
 * Log a system activity
 * @param {Object} params - Logging parameters
 * @param {string} params.userId - ID of the user performing the action
 * @param {string} params.action - Type of action performed
 * @param {string} params.details - Human-readable description of the action
 * @param {Object} [params.metadata] - Additional structured data about the action
 * @param {string} [params.ipAddress] - IP address of the user
 * @param {string} [params.restaurantId] - ID of the restaurant involved (if applicable)
 */
const logSystemActivity = async (params) => {
  const {
    userId,
    action,
    details,
    metadata = {},
    ipAddress,
    restaurantId
  } = params;

  try {
    const query = `
      INSERT INTO system_logs 
        (user_id, action, details, metadata, ip_address, restaurant_id)
      VALUES 
        ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `;

    const values = [
      userId,
      action,
      details,
      metadata,
      ipAddress,
      restaurantId
    ];

    await db.query(query, values);
  } catch (error) {
    console.error('Error logging system activity:', error);
    // Don't throw the error - we don't want logging failures to break the main functionality
  }
};

module.exports = {
  logSystemActivity
};
