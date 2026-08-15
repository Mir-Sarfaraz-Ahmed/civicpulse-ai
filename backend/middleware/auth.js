const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'civicpulse_hackathon_jwt_secret_2026_key';

// Middleware to authenticate JWT
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Format: "Bearer TOKEN"

  if (!token) {
    req.user = null;
    return next();
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.warn('[Auth Middleware] Invalid token received.');
      req.user = null;
      return next();
    }
    req.user = user;
    next();
  });
}

// Middleware to require authentication
function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized: Authentication required.' });
  }
  next();
}

// Middleware to require a specific role
function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required.' });
    }
    if (req.user.role !== role) {
      console.warn(`[Security Alert] User ${req.user.email} attempted to access an admin endpoint.`);
      return res.status(403).json({ error: 'Forbidden: Insufficient privileges.' });
    }
    next();
  };
}

module.exports = {
  authenticateToken,
  requireAuth,
  requireRole,
  JWT_SECRET
};
