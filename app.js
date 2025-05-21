// Main application file for Quisin backend
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();
const runMigrations = require('./migrations/run-migrations'); // Import the migration runner

// Import routes
const authRoutes = require('./routes/authRoutes');
const superadminRoutes = require('./routes/superadminRoutes');
const adminRoutes = require('./routes/adminRoutes');
const chainRoutes = require('./routes/chainRoutes');

// Initialize express app
const app = express();

// Middleware
app.use(cors({
  origin: [
    'https://www.quisin.joinbluecollar.com', // Allow this origin
    'https://quisinserver.joinbluecollar.com', // Allow this origin if needed
    /^http:\/\/localhost:\d+$/ // Allow localhost for development
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(morgan('dev'));

// Run migrations before starting the server
(async () => {
  try {
    await runMigrations();
    console.log('Database migrations completed successfully.');
  } catch (error) {
    console.error('Failed to run migrations:', error.message);
    process.exit(1); // Exit the process if migrations fail
  }
})();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/superadmin', superadminRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/chain', chainRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Quisin Restaurant Management System API' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

module.exports = app;
