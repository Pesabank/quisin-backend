// Authentication middleware for Quisin
const jwt = require('jsonwebtoken');
const { logLogin } = require('../utils/systemLogger');

const authenticateToken = (req, res, next) => {
  // Get the token from the Authorization header
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN format

  if (!token) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verified;

    // Log successful token verification
    logLogin(
      verified.id,
      req.ip,
      true,
      null
    ).catch(err => console.error('Error logging authentication:', err));

    next();
  } catch (error) {
    // Log failed authentication attempt
    if (error.name === 'TokenExpiredError') {
      logLogin(
        null,
        req.ip,
        false,
        'Token expired'
      ).catch(err => console.error('Error logging authentication:', err));
    } else {
      logLogin(
        null,
        req.ip,
        false,
        'Invalid token'
      ).catch(err => console.error('Error logging authentication:', err));
    }

    res.status(403).json({ message: 'Invalid token.' });
  }
};

module.exports = { authenticateToken };
