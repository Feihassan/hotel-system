const express = require('express');
const { getDb } = require('../config/sqlite');
const { authMiddleware, receptionistOrAdmin, adminOnly } = require('../middleware/auth');

const router = express.Router();

// Get all rooms with details
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { status, floor, search } = req.query;
    
    const db = getDb();
    if (!db) {
      return res.status(500).json({ error: 'Database not ready' });
    }
    
    let query = `
      SELECT r.*, rt.name as room_type_name, rt.base_price, rt.max_occupancy
      FROM rooms r
      LEFT JOIN room_types rt ON r.room_type_id = rt.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (status) {
      query += ` AND r.status = ?`;
      params.push(status);
    }
    
    if (floor) {
      query += ` AND r.floor = ?`;
      params.push(floor);
    }
    
    if (search) {
      query += ` AND (r.room_number LIKE ? OR r.description LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }
    
    query += ' ORDER BY CAST(r.room_number AS INTEGER)';
    
    const stmt = db.prepare(query);
    const results = stmt.all(params);
    stmt.free();
    res.json(results);
  } catch (error) {
    console.error('Get rooms error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get room by ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    const db = getDb();
    if (!db) {
      return res.status(500).json({ error: 'Database not ready' });
    }
    
    const stmt = db.prepare(
      `SELECT r.*, rt.name as room_type_name, rt.base_price, rt.max_occupancy, rt.description as type_description
       FROM rooms r
       LEFT JOIN room_types rt ON r.room_type_id = rt.id
       WHERE r.id = ?`
    );
    const result = stmt.getAsObject([id]);
    
    if (!result.id) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    res.json(result);
  } catch (error) {
    console.error('Get room error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create new room (admin only)
router.post('/', adminOnly, async (req, res) => {
  try {
    const { room_number, room_type_id, floor, description } = req.body;
    
    if (!room_number || !room_type_id) {
      return res.status(400).json({ error: 'Room number and room type are required' });
    }
    
    const db = getDb();
    if (!db) {
      return res.status(500).json({ error: 'Database not ready' });
    }
    
    // Check if room number already exists
    const checkStmt = db.prepare('SELECT id FROM rooms WHERE room_number = ?');
    const existing = checkStmt.getAsObject([room_number]);
    
    if (existing.id) {
      return res.status(400).json({ error: 'Room number already exists' });
    }
    
    const insertStmt = db.prepare(
      `INSERT INTO rooms (room_number, room_type_id, floor, description, status, created_at)
       VALUES (?, ?, ?, ?, 'available', datetime('now'))`
    );
    const result = insertStmt.run([room_number, room_type_id, floor || null, description || null]);
    
    const newRoomStmt = db.prepare('SELECT * FROM rooms WHERE id = ?');
    const newRoom = newRoomStmt.getAsObject([result.lastInsertRowid]);
    
    db.saveToFile();
    res.status(201).json(newRoom);
  } catch (error) {
    console.error('Create room error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update room
router.put('/:id', adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const { room_number, room_type_id, floor, description, status } = req.body;
    
    const db = getDb();
    if (!db) {
      return res.status(500).json({ error: 'Database not ready' });
    }
    
    // Check if room exists
    const checkStmt = db.prepare('SELECT * FROM rooms WHERE id = ?');
    const existing = checkStmt.getAsObject([id]);
    
    if (!existing.id) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    const updateStmt = db.prepare(
      `UPDATE rooms
       SET room_number = COALESCE(?, room_number),
           room_type_id = COALESCE(?, room_type_id),
           floor = COALESCE(?, floor),
           description = COALESCE(?, description),
           status = COALESCE(?, status),
           updated_at = datetime('now')
       WHERE id = ?`
    );
    updateStmt.run([room_number, room_type_id, floor, description, status, id]);
    
    const updatedStmt = db.prepare('SELECT * FROM rooms WHERE id = ?');
    const updated = updatedStmt.getAsObject([id]);
    
    db.saveToFile();
    res.json(updated);
  } catch (error) {
    console.error('Update room error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update room status (receptionist and housekeeping)
router.patch('/:id/status', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!['available', 'occupied', 'cleaning', 'maintenance'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    const db = getDb();
    if (!db) {
      return res.status(500).json({ error: 'Database not ready' });
    }
    
    // Check if room exists
    const checkStmt = db.prepare('SELECT * FROM rooms WHERE id = ?');
    const existing = checkStmt.getAsObject([id]);
    
    if (!existing.id) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    const updateStmt = db.prepare(
      `UPDATE rooms
       SET status = ?, updated_at = datetime('now')
       WHERE id = ?`
    );
    updateStmt.run([status, id]);
    
    const updatedStmt = db.prepare('SELECT * FROM rooms WHERE id = ?');
    const updated = updatedStmt.getAsObject([id]);
    
    db.saveToFile();
    res.json(updated);
  } catch (error) {
    console.error('Update room status error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete room (admin only)
router.delete('/:id', adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    
    const db = getDb();
    if (!db) {
      return res.status(500).json({ error: 'Database not ready' });
    }
    
    // Check if room has active bookings
    const checkBookingStmt = db.prepare(
      `SELECT id FROM bookings WHERE room_id = ? AND status IN ('confirmed', 'checked_in')`
    );
    const activeBooking = checkBookingStmt.getAsObject([id]);
    
    if (activeBooking.id) {
      return res.status(400).json({ error: 'Cannot delete room with active bookings' });
    }
    
    const deleteStmt = db.prepare('DELETE FROM rooms WHERE id = ?');
    deleteStmt.run([id]);
    db.saveToFile();
    
    res.json({ message: 'Room deleted successfully' });
  } catch (error) {
    console.error('Delete room error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get room types
router.get('/types/list', authMiddleware, async (req, res) => {
  try {
    const db = getDb();
    if (!db) {
      return res.status(500).json({ error: 'Database not ready' });
    }
    
    const stmt = db.prepare('SELECT * FROM room_types ORDER BY base_price');
    const results = stmt.all();
    stmt.free();
    res.json(results);
  } catch (error) {
    console.error('Get room types error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create room type (admin only)
router.post('/types', adminOnly, async (req, res) => {
  try {
    const { name, description, base_price, max_occupancy } = req.body;
    
    if (!name || !base_price) {
      return res.status(400).json({ error: 'Name and base price are required' });
    }
    
    const db = getDb();
    if (!db) {
      return res.status(500).json({ error: 'Database not ready' });
    }
    
    // Check if room type already exists
    const checkStmt = db.prepare('SELECT id FROM room_types WHERE name = ?');
    const existing = checkStmt.getAsObject([name]);
    
    if (existing.id) {
      return res.status(400).json({ error: 'Room type already exists' });
    }
    
    const insertStmt = db.prepare(
      `INSERT INTO room_types (name, description, base_price, max_occupancy, created_at)
       VALUES (?, ?, ?, ?, datetime('now'))`
    );
    const result = insertStmt.run([name, description || null, base_price, max_occupancy || 2]);
    
    const newTypeStmt = db.prepare('SELECT * FROM room_types WHERE id = ?');
    const newType = newTypeStmt.getAsObject([result.lastInsertRowid]);
    
    db.saveToFile();
    res.status(201).json(newType);
  } catch (error) {
    console.error('Create room type error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
