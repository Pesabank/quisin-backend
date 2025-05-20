// User model for Quisin
const db = require('../config/db');
const bcrypt = require('bcrypt');

// User roles
const ROLES = {
  SUPERADMIN: 'superadmin',
  ADMIN: 'admin',
  KITCHEN: 'kitchen',
  WAITER: 'waiter',
  CUSTOMER: 'customer'
};

// Create a new user
const createUser = async (userData) => {
  const { firstName, lastName, email, password, role, phoneNumber } = userData;
  
  // Hash the password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);
  
  const query = `
    INSERT INTO users (first_name, last_name, email, password, role, phone, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, NOW())
    RETURNING id, first_name, last_name, email, role, phone, created_at
  `;
  
  const values = [firstName, lastName, email, hashedPassword, role, phoneNumber];
  
  try {
    const result = await db.query(query, values);
    return result.rows[0];
  } catch (error) {
    throw error;
  }
};

// Get user by email
const getUserByEmail = async (email) => {
  const query = 'SELECT * FROM users WHERE email = $1';
  console.log('Getting user by email:', email);
  
  try {
    const result = await db.query(query, [email]);
    console.log('Database result:', result.rows[0]);
    return result.rows[0];
  } catch (error) {
    console.error('Database error:', error);
    throw error;
  }
};

// Get user by ID
const getUserById = async (id) => {
  const query = 'SELECT id, first_name, last_name, email, role, phone, created_at FROM users WHERE id = $1';
  
  try {
    const result = await db.query(query, [id]);
    return result.rows[0];
  } catch (error) {
    throw error;
  }
};

// Update user
const updateUser = async (id, userData) => {
  const { firstName, lastName, email, phoneNumber, role } = userData;
  
  const query = `
    UPDATE users
    SET first_name = $1, last_name = $2, email = $3, phone = $4, role = $5, updated_at = NOW()
    WHERE id = $6
    RETURNING id, first_name, last_name, email, role, phone, updated_at
  `;
  
  const values = [firstName, lastName, email, phoneNumber, role, id];
  
  try {
    const result = await db.query(query, values);
    return result.rows[0];
  } catch (error) {
    throw error;
  }
};

// Update user password
const updatePassword = async (id, newPassword) => {
  // Hash the new password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(newPassword, salt);
  
  const query = `
    UPDATE users
    SET password = $1, updated_at = NOW()
    WHERE id = $2
    RETURNING id
  `;
  
  try {
    const result = await db.query(query, [hashedPassword, id]);
    return result.rows[0];
  } catch (error) {
    throw error;
  }
};

// Validate password
const validatePassword = async (plainPassword, hashedPassword) => {
  console.log('Validating password:');
  console.log('Plain password:', plainPassword);
  console.log('Stored hash:', hashedPassword);
  const isValid = await bcrypt.compare(plainPassword, hashedPassword);
  console.log('Password comparison result:', isValid);
  return isValid;
};

module.exports = {
  ROLES,
  createUser,
  getUserByEmail,
  getUserById,
  updateUser,
  updatePassword,
  validatePassword
};
