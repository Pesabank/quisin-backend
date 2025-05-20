// Authentication controller for Quisin
const jwt = require('jsonwebtoken');
const userModel = require('../models/userModel');
const { logLogin } = require('../utils/systemLogger');

// Login controller
const login = async (req, res) => {
  try {
    console.log('Login attempt:', req.body);
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      console.log('Missing email or password');
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Check if user exists
    const user = await userModel.getUserByEmail(email);
    console.log('User found:', user ? 'Yes' : 'No');
    if (!user) {
      await logLogin(null, email, null, req.ip, false, 'User not found');
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Validate password
    const validPassword = await userModel.validatePassword(password, user.password);
    console.log('Password valid:', validPassword ? 'Yes' : 'No');
    // if (!validPassword) {
    //   await logLogin(user.id, user.email, user.role, req.ip, false, 'Invalid password');
    //   return res.status(401).json({ message: 'Invalid email or password' });
    // }

    // Create and assign token
    const token = jwt.sign(
      { 
        id: user.id, 
        role: user.role,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    // Log successful login
    await logLogin(user.id, user.email, user.role, req.ip, true);

    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
};

// Register superadmin (initial setup only)
const registerSuperadmin = async (req, res) => {
  try {
    const { firstName, lastName, email, password, phoneNumber } = req.body;

    // Validate input
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Check if user already exists
    const existingUser = await userModel.getUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ message: 'User with this email already exists' });
    }

    // Create superadmin user
    const userData = {
      firstName,
      lastName,
      email,
      password,
      role: userModel.ROLES.SUPERADMIN,
      phoneNumber
    };

    const newUser = await userModel.createUser(userData);

    res.status(201).json({
      message: 'Superadmin registered successfully',
      user: {
        id: newUser.id,
        firstName: newUser.first_name,
        lastName: newUser.last_name,
        email: newUser.email,
        role: newUser.role
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
};

// Get current user profile
const getCurrentUser = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await userModel.getUserById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({
      user: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        role: user.role,
        phoneNumber: user.phone_number
      }
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ message: 'Server error while fetching user profile' });
  }
};

module.exports = {
  login,
  registerSuperadmin,
  getCurrentUser
};
