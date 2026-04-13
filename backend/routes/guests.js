const express = require('express');
const { getDb } = require('../config/sqlite');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Get all guests
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { search, limit = 50, offset = 0 } = req.query;
    
    const db = getDb();
    if (!db) {
      return res.status(500).json({ error: 'Database not ready' });
    }
    
    let query = 'SELECT * FROM guests WHERE 1=1';
    const params = [];
    
    if (search) {
      query += ` AND (full_name LIKE ? OR phone LIKE ? OR id_number LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    const stmt = db.prepare(query);
    const result = stmt.all(params);
    res.json(result);
  } catch (error) {
    console.error('Get guests error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Search guests for quick lookup
router.get('/search', authMiddleware, async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.length < 2) {
      return res.json([]);
    }
    
    const db = getDb();
    if (!db) {
      return res.status(500).json({ error: 'Database not ready' });
    }
    
    const stmt = db.prepare(
      `SELECT id, full_name, phone, id_number
       FROM guests
       WHERE full_name LIKE ? OR phone LIKE ? OR id_number LIKE ?
       ORDER BY full_name
       LIMIT 10`
    );
    const result = stmt.all([`%${q}%`, `%${q}%`, `%${q}%`]);
    
    res.json(result);
  } catch (error) {
    console.error('Search guests error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get guest by ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    const db = getDb();
    if (!db) {
      return res.status(500).json({ error: 'Database not ready' });
    }
    
    const stmt = db.prepare('SELECT * FROM guests WHERE id = ?');
    const guest = stmt.getAsObject([id]);
    
    if (!guest.id) {
      return res.status(404).json({ error: 'Guest not found' });
    }
    
    // Get guest's booking history
    const bookingsStmt = db.prepare(
      `SELECT b.*, r.room_number
       FROM bookings b
       JOIN rooms r ON b.room_id = r.id
       WHERE b.guest_id = ?
       ORDER BY b.created_at DESC
       LIMIT 10`
    );
    const bookings = bookingsStmt.all([id]);
    
    res.json({
      ...guest,
      bookings: bookings,
    });
  } catch (error) {
    console.error('Get guest error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create new guest
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { full_name, phone, email, id_number, id_type, address, nationality } = req.body;
    
    if (!full_name) {
      return res.status(400).json({ error: 'Full name is required' });
    }
    
    const db = getDb();
    if (!db) {
      return res.status(500).json({ error: 'Database not ready' });
    }
    
    const stmt = db.prepare(
      `INSERT INTO guests (full_name, phone, email, id_number, id_type, address, nationality, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    );
    const result = stmt.run([full_name, phone || null, email || null, id_number || null, id_type || 'national_id', address || null, nationality || null]);
    
    const newGuestStmt = db.prepare('SELECT * FROM guests WHERE id = ?');
    const newGuest = newGuestStmt.getAsObject([result.lastInsertRowid]);
    
    db.saveToFile();
    res.status(201).json(newGuest);
  } catch (error) {
    console.error('Create guest error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update guest
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, phone, email, id_number, id_type, address, nationality } = req.body;
    
    const db = getDb();
    if (!db) {
      return res.status(500).json({ error: 'Database not ready' });
    }
    
    // Check if guest exists
    const checkStmt = db.prepare('SELECT * FROM guests WHERE id = ?');
    const existing = checkStmt.getAsObject([id]);
    
    if (!existing.id) {
      return res.status(404).json({ error: 'Guest not found' });
    }
    
    const updateStmt = db.prepare(
      `UPDATE guests
       SET full_name = COALESCE(?, full_name),
           phone = COALESCE(?, phone),
           email = COALESCE(?, email),
           id_number = COALESCE(?, id_number),
           id_type = COALESCE(?, id_type),
           address = COALESCE(?, address),
           nationality = COALESCE(?, nationality),
           updated_at = datetime('now')
       WHERE id = ?`
    );
    updateStmt.run([full_name, phone, email, id_number, id_type, address, nationality, id]);
    
    const updatedStmt = db.prepare('SELECT * FROM guests WHERE id = ?');
    const updated = updatedStmt.getAsObject([id]);
    
    db.saveToFile();
    res.json(updated);
  } catch (error) {
    console.error('Update guest error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
