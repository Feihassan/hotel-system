const jwt = require('jsonwebtoken');
const { getDb } = require('../config/sqlite');

const JWT_SECRET = process.env.JWT_SECRET || 'hotel-management-secret-key-2024';

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Access token required' });
    }
    
    const token = authHeader.split(' ')[1];
    
    const decoded = jwt.verify(token, JWT_SECRET);
    
    const db = getDb();
    if (!db) {
      return res.status(500).json({ error: 'Database not ready' });
    }
    
    const stmt = db.prepare('SELECT id, username, full_name, role, permissions, is_active FROM users WHERE id = ?');
    const user = stmt.getAsObject([decoded.userId]);
    stmt.free();
    
    if (!user.id || !user.is_active) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }
    
    try {
      user.permissions = JSON.parse(user.permissions || '[]');
    } catch(e) {
      user.permissions = [];
    }
    
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
};

const roleMiddleware = (...allowedRoles) => {
  return [authMiddleware, (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied. Insufficient permissions.' });
    }
    
    next();
  }];
};

const adminOnly = roleMiddleware('admin');
const receptionistOrAdmin = roleMiddleware('admin', 'receptionist');
const housekeepingOrAdmin = roleMiddleware('admin', 'housekeeping');

module.exports = { authMiddleware, roleMiddleware, adminOnly, receptionistOrAdmin, housekeepingOrAdmin, JWT_SECRET };
