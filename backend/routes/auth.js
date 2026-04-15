const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb } = require('../config/sqlite');
const { authMiddleware, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    
    const db = getDb();
    if (!db) {
      return res.status(500).json({ error: 'Database not ready' });
    }
    
    const stmt = db.prepare('SELECT * FROM users WHERE username = ? AND is_active = 1');
    const user = stmt.getAsObject([username]);
    
    if (!user.id) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const isValidPassword = await bcrypt.compare(password, user.password);
    
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '8h' }
    );
    
    console.log('Login successful for user:', user.username);
    
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        role: user.role,
        permissions: JSON.parse(user.permissions || '[]'),
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get current user
router.get('/me', authMiddleware, async (req, res) => {
  res.json({
    id: req.user.id,
    username: req.user.username,
    full_name: req.user.full_name,
    role: req.user.role,
    permissions: req.user.permissions || [],
  });
});

// Change password
router.post('/change-password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password required' });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    
    const db = getDb();
    if (!db) {
      return res.status(500).json({ error: 'Database not ready' });
    }
    
    const stmt = db.prepare('SELECT password FROM users WHERE id = ?');
    const user = stmt.getAsObject([req.user.id]);
    
    if (!user.password) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const isValid = await bcrypt.compare(currentPassword, user.password);
    
    if (!isValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    const updateStmt = db.prepare('UPDATE users SET password = ?, updated_at = datetime("now") WHERE id = ?');
    updateStmt.run([hashedPassword, req.user.id]);
    db.saveToFile();
    
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: Create new user
router.post('/users', authMiddleware, async (req, res) => {
  try {
    const { username, password, full_name, role, permissions = [] } = req.body;
    
    if (!username || !password || !full_name || !role) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    
    if (!['admin', 'receptionist', 'housekeeping'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    
    const db = getDb();
    if (!db) {
      return res.status(500).json({ error: 'Database not ready' });
    }
    
    // Check if username already exists
    const checkStmt = db.prepare('SELECT id FROM users WHERE username = ?');
    const existingUser = checkStmt.getAsObject([username]);
    
    if (existingUser.id) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const insertStmt = db.prepare(
      `INSERT INTO users (username, password, full_name, role, permissions, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, 1, datetime('now'))`
    );
    const result = insertStmt.run([username, hashedPassword, full_name, role, JSON.stringify(permissions)]);
    
    const newUserStmt = db.prepare(
      'SELECT id, username, full_name, role, permissions, is_active, created_at FROM users WHERE id = ?'
    );
    const newUser = newUserStmt.getAsObject([result.lastInsertRowid]);
    try { newUser.permissions = JSON.parse(newUser.permissions || '[]'); } catch(e) { newUser.permissions = []; }
    
    db.saveToFile();
    res.status(201).json(newUser);
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: Get all users
router.get('/users', authMiddleware, async (req, res) => {
  try {
    const db = getDb();
    if (!db) {
      return res.status(500).json({ error: 'Database not ready' });
    }
    
    const result = db.exec(
      `SELECT id, username, full_name, role, permissions, is_active, created_at
       FROM users
       ORDER BY created_at DESC`
    );
    const users = result.length > 0 ? result[0].values.map(row => {
      const obj = {};
      result[0].columns.forEach((col, i) => obj[col] = row[i]);
      try { obj.permissions = JSON.parse(obj.permissions || '[]'); } catch(e) { obj.permissions = []; }
      return obj;
    }) : [];
    
    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: Update user
router.put('/users/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, role, is_active, permissions } = req.body;
    
    const db = getDb();
    if (!db) {
      return res.status(500).json({ error: 'Database not ready' });
    }
    
    // Check if user exists
    const checkStmt = db.prepare('SELECT * FROM users WHERE id = ?');
    const existingUser = checkStmt.getAsObject([id]);
    
    if (!existingUser.id) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const updateStmt = db.prepare(
      `UPDATE users SET 
       full_name = COALESCE(?, full_name),
       role = COALESCE(?, role),
       permissions = COALESCE(?, permissions),
       is_active = COALESCE(?, is_active),
       updated_at = datetime('now')
       WHERE id = ?`
    );
    updateStmt.run([full_name, role, permissions ? JSON.stringify(permissions) : null, is_active, id]);
    
    const updatedStmt = db.prepare(
      'SELECT id, username, full_name, role, permissions, is_active, updated_at FROM users WHERE id = ?'
    );
    const updatedUser = updatedStmt.getAsObject([id]);
    try { updatedUser.permissions = JSON.parse(updatedUser.permissions || '[]'); } catch(e) { updatedUser.permissions = []; }
    
    db.saveToFile();
    res.json(updatedUser);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: Delete user
router.delete('/users/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Prevent deleting yourself
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }
    
    const db = getDb();
    if (!db) {
      return res.status(500).json({ error: 'Database not ready' });
    }
    
    const deleteStmt = db.prepare('DELETE FROM users WHERE id = ?');
    deleteStmt.run([id]);
    db.saveToFile();
    
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
