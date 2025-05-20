// Role-based access control middleware for Quisin

const checkRole = (allowedRoles) => {
  return (req, res, next) => {
    // User role should be included in the JWT payload
    const { role } = req.user;
    
    if (!role) {
      return res.status(403).json({ message: 'Role not specified in token.' });
    }
    
    if (allowedRoles.includes(role)) {
      next(); // Role is allowed, proceed to the next middleware
    } else {
      res.status(403).json({ 
        message: 'Access denied. You do not have permission to access this resource.' 
      });
    }
  };
};

module.exports = { checkRole };
