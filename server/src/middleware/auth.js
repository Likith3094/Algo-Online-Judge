const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  const token = req.cookies?.authToken;

  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication required. Please log in.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      id: decoded.id,
      role: decoded.role,
    };
    next();
  } catch (error) {
    // Clear invalid cookie
    res.clearCookie('authToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Session expired. Please log in again.' });
    }

    return res.status(401).json({ success: false, message: 'Invalid authentication token.' });
  }
};

const requireRole = (requiredRole) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    if (req.user.role !== requiredRole) {
      return res.status(403).json({
        success: false,
        message: `Access denied. This resource requires ${requiredRole} privileges.`,
      });
    }

    next();
  };
};

const optionalAuth = (req, res, next) => {
  const token = req.cookies?.authToken;

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = {
        id: decoded.id,
        role: decoded.role,
      };
    } catch (error) {
      // If token is invalid, continue without authentication
      req.user = null;
    }
  } else {
    req.user = null;
  }

  next();
};

module.exports = { authenticateToken, requireRole, optionalAuth };
