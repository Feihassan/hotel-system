const express = require('express');
const { getDb } = require('../config/sqlite');
const { authMiddleware, receptionistOrAdmin } = require('../middleware/auth');

const router = express.Router();

// Start a new shift
router.post('/start', receptionistOrAdmin, (req, res) => {
  try {
    const db = getDb();
    if (!db) return res.status(500).json({ error: 'Database not ready' });

    // Check if user already has an open shift
    const open = db.prepare(
      `SELECT id FROM shifts WHERE user_id = ? AND status = 'open'`
    ).getAsObject([req.user.id]);

    if (open.id) {
      return res.status(400).json({ error: 'You already have an open shift. Close it before starting a new one.' });
    }

    const result = db.prepare(
      `INSERT INTO shifts (user_id, started_at, status) VALUES (?, datetime('now'), 'open')`
    ).run([req.user.id]);

    try {
      db.prepare(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, created_at)
         VALUES (?, 'shift_start', 'shift', ?, 'Shift started', datetime('now'))`
      ).run([req.user.id, result.lastInsertRowid]);
    } catch (e) { /* audit_logs table may not exist yet */ }

    db.saveToFile();

    const shift = db.prepare('SELECT * FROM shifts WHERE id = ?').getAsObject([result.lastInsertRowid]);
    res.status(201).json(shift);
  } catch (error) {
    console.error('Start shift error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Close shift and get summary
router.post('/:id/close', receptionistOrAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const db = getDb();
    if (!db) return res.status(500).json({ error: 'Database not ready' });

    const shift = db.prepare('SELECT * FROM shifts WHERE id = ?').getAsObject([id]);
    if (!shift.id) return res.status(404).json({ error: 'Shift not found' });
    if (shift.status === 'closed') return res.status(400).json({ error: 'Shift already closed' });

    // Only owner or admin can close
    if (shift.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to close this shift' });
    }

    // Build summary
    const checkIns = db.prepare(
      `SELECT COUNT(*) as count FROM bookings WHERE checked_in_by = ? AND actual_check_in_time >= ?`
    ).getAsObject([shift.user_id, shift.started_at]);

    const checkOuts = db.prepare(
      `SELECT COUNT(*) as count FROM bookings WHERE checked_out_by = ? AND actual_check_out_time >= ?`
    ).getAsObject([shift.user_id, shift.started_at]);

    const revenue = db.prepare(
      `SELECT COALESCE(SUM(p.amount), 0) as total
       FROM payments p
       WHERE p.processed_by = ? AND p.created_at >= ? AND p.status = 'completed'`
    ).getAsObject([shift.user_id, shift.started_at]);

    const pendingBookings = db.prepare(
      `SELECT COUNT(*) as count FROM bookings
       WHERE checked_in_by = ? AND status = 'checked_in'`
    ).getAsObject([shift.user_id]);

    const summary = {
      check_ins: parseInt(checkIns.count || 0),
      check_outs: parseInt(checkOuts.count || 0),
      revenue_handled: parseFloat(revenue.total || 0),
      pending_bookings: parseInt(pendingBookings.count || 0),
    };

    db.prepare(
      `UPDATE shifts SET status = 'closed', ended_at = datetime('now'), summary = ? WHERE id = ?`
    ).run([JSON.stringify(summary), id]);

    try {
      db.prepare(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, created_at)
         VALUES (?, 'shift_close', 'shift', ?, ?, datetime('now'))`
      ).run([req.user.id, id, JSON.stringify(summary)]);
    } catch (e) { /* audit_logs table may not exist yet */ }

    db.saveToFile();

    const closed = db.prepare('SELECT * FROM shifts WHERE id = ?').getAsObject([id]);
    try { closed.summary = JSON.parse(closed.summary || '{}'); } catch (e) { closed.summary = {}; }
    res.json({ ...closed, summary });
  } catch (error) {
    console.error('Close shift error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get current open shift for logged-in user
router.get('/my/current', receptionistOrAdmin, (req, res) => {
  try {
    const db = getDb();
    if (!db) return res.status(500).json({ error: 'Database not ready' });

    const shift = db.prepare(
      `SELECT s.*, u.full_name as receptionist_name
       FROM shifts s JOIN users u ON s.user_id = u.id
       WHERE s.user_id = ? AND s.status = 'open'`
    ).getAsObject([req.user.id]);

    res.json(shift.id ? shift : null);
  } catch (error) {
    console.error('Get current shift error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all shifts (admin) or own shifts (receptionist)
router.get('/', authMiddleware, (req, res) => {
  try {
    const { user_id, status, date } = req.query;
    const db = getDb();
    if (!db) return res.status(500).json({ error: 'Database not ready' });

    let query = `
      SELECT s.*, u.full_name as receptionist_name
      FROM shifts s JOIN users u ON s.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    // Non-admins can only see their own shifts
    const filterUserId = req.user.role === 'admin' ? (user_id || null) : req.user.id;
    if (filterUserId) { query += ' AND s.user_id = ?'; params.push(filterUserId); }
    if (status) { query += ' AND s.status = ?'; params.push(status); }
    if (date) { query += ' AND DATE(s.started_at) = ?'; params.push(date); }

    query += ' ORDER BY s.started_at DESC LIMIT 100';

    const shifts = db.prepare(query).all(params);
    shifts.forEach(s => {
      try { s.summary = JSON.parse(s.summary || '{}'); } catch (e) { s.summary = {}; }
    });
    res.json(shifts);
  } catch (error) {
    console.error('Get shifts error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get audit logs
router.get('/audit-logs', authMiddleware, (req, res) => {
  try {
    const { user_id, action, entity_type, date, limit = 100 } = req.query;
    const db = getDb();
    if (!db) return res.status(500).json({ error: 'Database not ready' });

    let query = `
      SELECT al.*, u.full_name as user_name, u.role as user_role
      FROM audit_logs al JOIN users u ON al.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    const filterUserId = req.user.role === 'admin' ? (user_id || null) : req.user.id;
    if (filterUserId) { query += ' AND al.user_id = ?'; params.push(filterUserId); }
    if (action) { query += ' AND al.action = ?'; params.push(action); }
    if (entity_type) { query += ' AND al.entity_type = ?'; params.push(entity_type); }
    if (date) { query += ' AND DATE(al.created_at) = ?'; params.push(date); }

    query += ` ORDER BY al.created_at DESC LIMIT ?`;
    params.push(parseInt(limit));

    const logs = db.prepare(query).all(params);
    res.json(logs);
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
