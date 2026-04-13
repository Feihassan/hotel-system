const express = require('express');
const { getDb } = require('../config/sqlite');
const { authMiddleware, receptionistOrAdmin } = require('../middleware/auth');
const { calculateNights } = require('../utils/helpers');

const router = express.Router();

// Get all bookings
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { status, start_date, end_date, guest_id, room_id } = req.query;
    
    const db = getDb();
    if (!db) {
      return res.status(500).json({ error: 'Database not ready' });
    }
    
    let query = `
      SELECT b.*,
             g.full_name as guest_name, g.phone as guest_phone, g.id_number,
             r.room_number,
             rt.name as room_type_name,
             u.full_name as created_by_name
      FROM bookings b
      LEFT JOIN guests g ON b.guest_id = g.id
      LEFT JOIN rooms r ON b.room_id = r.id
      LEFT JOIN room_types rt ON r.room_type_id = rt.id
      LEFT JOIN users u ON b.created_by = u.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (status) {
      query += ` AND b.status = ?`;
      params.push(status);
    }
    
    if (start_date) {
      query += ` AND b.check_in_date >= ?`;
      params.push(start_date);
    }
    
    if (end_date) {
      query += ` AND b.check_out_date <= ?`;
      params.push(end_date);
    }
    
    if (guest_id) {
      query += ` AND b.guest_id = ?`;
      params.push(guest_id);
    }
    
    if (room_id) {
      query += ` AND b.room_id = ?`;
      params.push(room_id);
    }
    
    query += ' ORDER BY b.created_at DESC';
    
    const stmt = db.prepare(query);
    const result = stmt.all(params);
    res.json(result);
  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get active stays (checked-in guests)
router.get('/active', authMiddleware, async (req, res) => {
  try {
    const db = getDb();
    if (!db) {
      return res.status(500).json({ error: 'Database not ready' });
    }
    
    const stmt = db.prepare(
      `SELECT b.*,
              g.id as guest_id, g.full_name as guest_name, g.phone as guest_phone, g.id_number, g.email,
              r.room_number,
              rt.name as room_type_name, rt.base_price
       FROM bookings b
       LEFT JOIN guests g ON b.guest_id = g.id
       LEFT JOIN rooms r ON b.room_id = r.id
       LEFT JOIN room_types rt ON r.room_type_id = rt.id
       WHERE b.status = 'checked_in'
       ORDER BY b.check_in_date DESC`
    );
    const result = stmt.all();
    
    res.json(result);
  } catch (error) {
    console.error('Get active stays error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get today's check-ins and check-outs
router.get('/today', authMiddleware, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const db = getDb();
    if (!db) {
      return res.status(500).json({ error: 'Database not ready' });
    }
    
    const checkInsStmt = db.prepare(
      `SELECT b.*, g.full_name as guest_name, g.phone as guest_phone, r.room_number
       FROM bookings b
       LEFT JOIN guests g ON b.guest_id = g.id
       LEFT JOIN rooms r ON b.room_id = r.id
       WHERE b.check_in_date = ? AND b.status = 'checked_in'
       ORDER BY r.room_number`
    );
    const checkIns = checkInsStmt.all([today]);
    
    const checkOutsStmt = db.prepare(
      `SELECT b.*, g.full_name as guest_name, g.phone as guest_phone, r.room_number
       FROM bookings b
       LEFT JOIN guests g ON b.guest_id = g.id
       LEFT JOIN rooms r ON b.room_id = r.id
       WHERE b.check_out_date = ? AND b.status IN ('checked_in', 'checked_out')
       ORDER BY r.room_number`
    );
    const checkOuts = checkOutsStmt.all([today]);
    
    res.json({
      check_ins: checkIns,
      check_outs: checkOuts,
      date: today,
    });
  } catch (error) {
    console.error('Get today bookings error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get booking by ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    const db = getDb();
    if (!db) {
      return res.status(500).json({ error: 'Database not ready' });
    }
    
    const stmt = db.prepare(
      `SELECT b.*,
              g.*,
              r.room_number,
              rt.name as room_type_name, rt.base_price,
              u.full_name as created_by_name
       FROM bookings b
       LEFT JOIN guests g ON b.guest_id = g.id
       LEFT JOIN rooms r ON b.room_id = r.id
       LEFT JOIN room_types rt ON r.room_type_id = rt.id
       LEFT JOIN users u ON b.created_by = u.id
       WHERE b.id = ?`
    );
    const result = stmt.getAsObject([id]);
    
    if (!result.id) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    // Get payments for this booking
    const paymentsStmt = db.prepare('SELECT * FROM payments WHERE booking_id = ? ORDER BY created_at');
    const payments = paymentsStmt.all([id]);
    
    // Get extra charges
    const extraChargesStmt = db.prepare('SELECT * FROM extra_charges WHERE booking_id = ? ORDER BY created_at');
    const extraCharges = extraChargesStmt.all([id]);
    
    result.payments = payments;
    result.extra_charges = extraCharges;
    
    res.json(result);
  } catch (error) {
    console.error('Get booking error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Check room availability
router.get('/availability/:roomId', authMiddleware, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { check_in, check_out } = req.query;
    
    if (!check_in || !check_out) {
      return res.status(400).json({ error: 'Check-in and check-out dates required' });
    }
    
    const db = getDb();
    if (!db) {
      return res.status(500).json({ error: 'Database not ready' });
    }
    
    // Check for overlapping bookings
    const conflictStmt = db.prepare(
      `SELECT id FROM bookings
       WHERE room_id = ?
       AND status NOT IN ('cancelled', 'no_show', 'checked_out')
       AND (
         (check_in_date <= ? AND check_out_date >= ?)
         OR (check_in_date >= ? AND check_out_date <= ?)
         OR (check_in_date >= ? AND check_in_date < ?)
       )`
    );
    const conflict = conflictStmt.getAsObject([roomId, check_out, check_in, check_in, check_out, check_in, check_out]);
    
    res.json({ available: !conflict.id });
  } catch (error) {
    console.error('Check availability error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create walk-in booking and check-in
router.post('/check-in', receptionistOrAdmin, async (req, res) => {
  try {
    const { guest, room_id, check_in_date, check_out_date, notes, payment_method, advance_amount } = req.body;
    
    // Validate input
    if (!guest || !guest.full_name || !room_id || !check_in_date || !check_out_date) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const db = getDb();
    if (!db) {
      return res.status(500).json({ error: 'Database not ready' });
    }
    
    // Check room availability
    const roomCheckStmt = db.prepare('SELECT id, status FROM rooms WHERE id = ?');
    const roomCheck = roomCheckStmt.getAsObject([room_id]);
    
    if (!roomCheck.id) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    if (roomCheck.status !== 'available') {
      return res.status(400).json({ error: 'Room is not available' });
    }
    
    // Check for overlapping bookings
    const conflictStmt = db.prepare(
      `SELECT id FROM bookings
       WHERE room_id = ?
       AND status NOT IN ('cancelled', 'no_show', 'checked_out')
       AND check_in_date <= ? AND check_out_date >= ?`
    );
    const conflict = conflictStmt.getAsObject([room_id, check_out_date, check_in_date]);
    
    if (conflict.id) {
      return res.status(400).json({ error: 'Room is already booked for these dates' });
    }
    
    // Create or find guest
    let guestData;
    if (guest.id) {
      const guestStmt = db.prepare('SELECT * FROM guests WHERE id = ?');
      guestData = guestStmt.getAsObject([guest.id]);
      if (!guestData.id) {
        return res.status(404).json({ error: 'Guest not found' });
      }
    } else {
      const insertGuestStmt = db.prepare(
        `INSERT INTO guests (full_name, phone, email, id_number, id_type, address, nationality, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`
      );
      const guestResult = insertGuestStmt.run([
        guest.full_name,
        guest.phone || null,
        guest.email || null,
        guest.id_number || null,
        guest.id_type || 'national_id',
        guest.address || null,
        guest.nationality || null,
      ]);
      
      const newGuestStmt = db.prepare('SELECT * FROM guests WHERE id = ?');
      guestData = newGuestStmt.getAsObject([guestResult.lastInsertRowid]);
    }
    
    // Calculate total amount
    const roomDataStmt = db.prepare(
      `SELECT rt.base_price FROM rooms r
       JOIN room_types rt ON r.room_type_id = rt.id
       WHERE r.id = ?`
    );
    const roomData = roomDataStmt.getAsObject([room_id]);
    
    const nights = calculateNights(check_in_date, check_out_date);
    const totalAmount = roomData.base_price * nights;
    
    // Create booking
    const bookingStmt = db.prepare(
      `INSERT INTO bookings (guest_id, room_id, check_in_date, check_out_date, actual_check_in_time, status, total_amount, notes, created_by, checked_in_by, created_at)
       VALUES (?, ?, ?, ?, datetime('now'), 'checked_in', ?, ?, ?, ?, datetime('now'))`
    );
    const bookingResult = bookingStmt.run([guestData.id, room_id, check_in_date, check_out_date, totalAmount, notes || null, req.user.id, req.user.id]);
    
    const newBookingStmt = db.prepare('SELECT * FROM bookings WHERE id = ?');
    const booking = newBookingStmt.getAsObject([bookingResult.lastInsertRowid]);
    
    // Update room status to occupied
    const updateRoomStmt = db.prepare('UPDATE rooms SET status = ?, updated_at = datetime(\'now\') WHERE id = ?');
    updateRoomStmt.run(['occupied', room_id]);
    
    // Process advance payment if provided
    if (advance_amount && parseFloat(advance_amount) > 0) {
      const paymentStmt = db.prepare(
        `INSERT INTO payments (booking_id, amount, payment_method, payment_type, status, processed_by, created_at)
         VALUES (?, ?, ?, 'advance', 'completed', ?, datetime('now'))`
      );
      paymentStmt.run([booking.id, advance_amount, payment_method || 'cash', req.user.id]);
    }

    // Audit log
    try {
      db.prepare(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, created_at)
         VALUES (?, 'check_in', 'booking', ?, ?, datetime('now'))`
      ).run([req.user.id, booking.id, JSON.stringify({ guest: guestData.full_name, room: room_id })]);
    } catch (e) { /* audit_logs table may not exist yet */ }
    
    db.saveToFile();
    
    res.status(201).json({
      ...booking,
      guest: guestData,
      nights,
      total_amount: totalAmount,
    });
  } catch (error) {
    console.error('Check-in error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Check-out booking
router.post('/:id/check-out', receptionistOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const db = getDb();
    if (!db) {
      return res.status(500).json({ error: 'Database not ready' });
    }
    
    // Get booking
    const bookingStmt = db.prepare(
      `SELECT b.*, r.room_number, rt.base_price
       FROM bookings b
       JOIN rooms r ON b.room_id = r.id
       JOIN room_types rt ON r.room_type_id = rt.id
       WHERE b.id = ?`
    );
    const booking = bookingStmt.getAsObject([id]);
    
    if (!booking.id) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    if (booking.status !== 'checked_in') {
      return res.status(400).json({ error: 'Booking is not checked in' });
    }
    
    // Calculate final amount (including extra charges)
    const extraChargesStmt = db.prepare(
      'SELECT COALESCE(SUM(amount), 0) as total FROM extra_charges WHERE booking_id = ?'
    );
    const extraChargesResult = extraChargesStmt.getAsObject([id]);
    
    const paymentsStmt = db.prepare(
      'SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE booking_id = ? AND status = ?'
    );
    const paymentsResult = paymentsStmt.getAsObject([id, 'completed']);
    
    const extraCharges = parseFloat(extraChargesResult.total || 0);
    const alreadyPaid = parseFloat(paymentsResult.total || 0);
    const totalAmount = parseFloat(booking.total_amount) + extraCharges;
    const remaining = totalAmount - alreadyPaid;
    
    // Update booking status
    const updateBookingStmt = db.prepare(
      `UPDATE bookings
       SET status = 'checked_out',
           actual_check_out_time = datetime('now'),
           checked_out_by = ?,
           updated_at = datetime('now')
       WHERE id = ?`
    );
    updateBookingStmt.run([req.user.id, id]);
    
    // Update room status to cleaning
    const updateRoomStmt = db.prepare('UPDATE rooms SET status = ?, updated_at = datetime(\'now\') WHERE id = ?');
    updateRoomStmt.run(['cleaning', booking.room_id]);

    // Audit log
    try {
      db.prepare(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, created_at)
         VALUES (?, 'check_out', 'booking', ?, ?, datetime('now'))`
      ).run([req.user.id, id, JSON.stringify({ room: booking.room_number, remaining: remaining })]);
    } catch (e) { /* audit_logs table may not exist yet */ }
    
    db.saveToFile();
    
    res.json({
      message: 'Check-out successful',
      booking_id: id,
      room_number: booking.room_number,
      total_amount: totalAmount,
      extra_charges: extraCharges,
      already_paid: alreadyPaid,
      remaining_balance: remaining,
    });
  } catch (error) {
    console.error('Check-out error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update booking
router.put('/:id', receptionistOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { check_in_date, check_out_date, notes, status } = req.body;
    
    const db = getDb();
    if (!db) {
      return res.status(500).json({ error: 'Database not ready' });
    }
    
    // Check if booking exists
    const checkStmt = db.prepare('SELECT * FROM bookings WHERE id = ?');
    const existing = checkStmt.getAsObject([id]);
    
    if (!existing.id) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    const updateStmt = db.prepare(
      `UPDATE bookings
       SET check_in_date = COALESCE(?, check_in_date),
           check_out_date = COALESCE(?, check_out_date),
           notes = COALESCE(?, notes),
           status = COALESCE(?, status),
           updated_at = datetime('now')
       WHERE id = ?`
    );
    updateStmt.run([check_in_date, check_out_date, notes, status, id]);
    
    const updatedStmt = db.prepare('SELECT * FROM bookings WHERE id = ?');
    const updated = updatedStmt.getAsObject([id]);
    
    db.saveToFile();
    res.json(updated);
  } catch (error) {
    console.error('Update booking error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Cancel booking
router.post('/:id/cancel', receptionistOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const db = getDb();
    if (!db) {
      return res.status(500).json({ error: 'Database not ready' });
    }
    
    const bookingStmt = db.prepare('SELECT * FROM bookings WHERE id = ?');
    const booking = bookingStmt.getAsObject([id]);
    
    if (!booking.id) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    if (booking.status === 'checked_out') {
      return res.status(400).json({ error: 'Cannot cancel a checked-out booking' });
    }
    
    const updateBookingStmt = db.prepare(
      `UPDATE bookings SET status = 'cancelled', updated_at = datetime('now') WHERE id = ?`
    );
    updateBookingStmt.run([id]);
    
    // If checked in, free up the room
    if (booking.status === 'checked_in') {
      const updateRoomStmt = db.prepare('UPDATE rooms SET status = ?, updated_at = datetime(\'now\') WHERE id = ?');
      updateRoomStmt.run(['cleaning', booking.room_id]);
    }

    // Audit log
    try {
      db.prepare(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, created_at)
         VALUES (?, 'cancel_booking', 'booking', ?, ?, datetime('now'))`
      ).run([req.user.id, id, JSON.stringify({ previous_status: booking.status })]);
    } catch (e) { /* audit_logs table may not exist yet */ }
    
    db.saveToFile();
    res.json({ message: 'Booking cancelled successfully' });
  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
