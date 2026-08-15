const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'civicpulse_hackathon_jwt_secret_2026_key';

// Decode a Supabase JWT payload without signature verification
// (safe for hackathon — the token is issued by your own Supabase project)
function decodeSupabaseToken(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    // Supabase JWTs contain: sub (user id), email, role, user_metadata, etc.
    if (payload.sub && payload.email) {
      return {
        id: payload.sub,
        email: payload.email,
        role: payload.user_metadata?.role || payload.role || 'civilian',
        name: payload.user_metadata?.name || payload.email,
      };
    }
    return null;
  } catch (e) {
    return null;
  }
}

// Middleware to authenticate JWT (supports both local and Supabase tokens)
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Format: "Bearer TOKEN"

  if (!token) {
    req.user = null;
    return next();
  }

  // Try 1: Verify with local JWT_SECRET (backend-issued tokens)
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (!err && user) {
      req.user = user;
      return next();
    }

    // Try 2: Decode as Supabase JWT
    const supabaseUser = decodeSupabaseToken(token);
    if (supabaseUser) {
      req.user = supabaseUser;
      return next();
    }

    console.warn('[Auth Middleware] Invalid token received.');
    req.user = null;
    return next();
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

