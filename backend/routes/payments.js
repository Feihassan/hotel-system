const express = require('express');
const { getDb } = require('../config/sqlite');
const { authMiddleware, receptionistOrAdmin } = require('../middleware/auth');
const { generateReceiptNumber, formatCurrency } = require('../utils/helpers');

const router = express.Router();

// Get payments for a booking
router.get('/booking/:bookingId', authMiddleware, async (req, res) => {
  try {
    const { bookingId } = req.params;
    
    const db = getDb();
    if (!db) {
      return res.status(500).json({ error: 'Database not ready' });
    }
    
    const stmt = db.prepare(
      `SELECT p.*, u.full_name as processed_by_name
       FROM payments p
       LEFT JOIN users u ON p.processed_by = u.id
       WHERE p.booking_id = ?
       ORDER BY p.created_at DESC`
    );
    const result = stmt.all([bookingId]);
    
    res.json(result);
  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Process payment
router.post('/', receptionistOrAdmin, async (req, res) => {
  try {
    const { booking_id, amount, payment_method, payment_type, reference_number, notes } = req.body;
    
    if (!booking_id || !amount || !payment_method) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const db = getDb();
    if (!db) {
      return res.status(500).json({ error: 'Database not ready' });
    }
    
    // Get booking details
    const bookingStmt = db.prepare(
      `SELECT b.*,
              (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE booking_id = ? AND status = 'completed') as paid_amount,
              (SELECT COALESCE(SUM(amount), 0) FROM extra_charges WHERE booking_id = ?) as extra_charges
       FROM bookings b
       WHERE b.id = ?`
    );
    const booking = bookingStmt.getAsObject([booking_id, booking_id, booking_id]);
    
    if (!booking.id) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    const totalAmount = parseFloat(booking.total_amount || 0) + parseFloat(booking.extra_charges || 0);
    const alreadyPaid = parseFloat(booking.paid_amount || 0);
    const paymentAmount = parseFloat(amount);
    
    // All payments are completed — payment_type tracks partial vs full
    const payment_status = 'completed';
    const effective_type = payment_type || (paymentAmount >= (totalAmount - alreadyPaid) ? 'full' : 'partial');
    
    // Create payment
    const receiptNumber = generateReceiptNumber();
    const paymentStmt = db.prepare(
      `INSERT INTO payments (booking_id, amount, payment_method, payment_type, status, reference_number, notes, processed_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    );
    const paymentResult = paymentStmt.run([
      booking_id,
      paymentAmount,
      payment_method,
      effective_type,
      payment_status,
      reference_number || receiptNumber,
      notes || null,
      req.user.id,
    ]);
    
    const newPaymentStmt = db.prepare('SELECT * FROM payments WHERE id = ?');
    const payment = newPaymentStmt.getAsObject([paymentResult.lastInsertRowid]);
    
    // Check if fully paid
    const newPaidAmount = alreadyPaid + paymentAmount;
    if (newPaidAmount >= totalAmount) {
      const updateBookingStmt = db.prepare(
        `UPDATE bookings SET updated_at = datetime('now') WHERE id = ?`
      );
      updateBookingStmt.run([booking_id]);
    }
    
    db.saveToFile();
    
    res.status(201).json({
      ...payment,
      receipt_number: reference_number || receiptNumber,
      total_amount: totalAmount,
      paid_amount: newPaidAmount,
      remaining_balance: totalAmount - newPaidAmount,
    });
  } catch (error) {
    console.error('Process payment error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add extra charge
router.post('/extra-charge', receptionistOrAdmin, async (req, res) => {
  try {
    const { booking_id, description, amount, charge_type, notes } = req.body;
    
    if (!booking_id || !description || !amount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const db = getDb();
    if (!db) {
      return res.status(500).json({ error: 'Database not ready' });
    }
    
    // Check if booking exists
    const bookingStmt = db.prepare('SELECT id, status FROM bookings WHERE id = ?');
    const booking = bookingStmt.getAsObject([booking_id]);
    
    if (!booking.id) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    if (booking.status === 'checked_out') {
      return res.status(400).json({ error: 'Cannot add charges to checked-out booking' });
    }
    
    // Create extra charge
    const stmt = db.prepare(
      `INSERT INTO extra_charges (booking_id, description, amount, charge_type, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))`
    );
    const result = stmt.run([booking_id, description, amount, charge_type || 'misc', req.user.id]);
    
    const newChargeStmt = db.prepare('SELECT * FROM extra_charges WHERE id = ?');
    const newCharge = newChargeStmt.getAsObject([result.lastInsertRowid]);
    
    db.saveToFile();
    res.status(201).json(newCharge);
  } catch (error) {
    console.error('Add extra charge error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get extra charges for booking
router.get('/extra-charges/:bookingId', authMiddleware, async (req, res) => {
  try {
    const { bookingId } = req.params;
    
    const db = getDb();
    if (!db) {
      return res.status(500).json({ error: 'Database not ready' });
    }
    
    const stmt = db.prepare(
      `SELECT ec.*, u.full_name as created_by_name
       FROM extra_charges ec
       LEFT JOIN users u ON ec.created_by = u.id
       WHERE ec.booking_id = ?
       ORDER BY ec.created_at DESC`
    );
    const result = stmt.all([bookingId]);
    
    res.json(result);
  } catch (error) {
    console.error('Get extra charges error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get payment summary for booking
router.get('/summary/:bookingId', authMiddleware, async (req, res) => {
  try {
    const { bookingId } = req.params;
    
    const db = getDb();
    if (!db) {
      return res.status(500).json({ error: 'Database not ready' });
    }
    
    const stmt = db.prepare(
      `SELECT b.total_amount, b.status,
              (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE booking_id = ? AND status = 'completed') as total_paid,
              (SELECT COALESCE(SUM(amount), 0) FROM extra_charges WHERE booking_id = ?) as total_extra_charges
       FROM bookings b
       WHERE b.id = ?`
    );
    const booking = stmt.getAsObject([bookingId, bookingId, bookingId]);
    
    if (!booking.total_amount && booking.total_amount !== 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    const totalAmount = parseFloat(booking.total_amount || 0) + parseFloat(booking.total_extra_charges || 0);
    const totalPaid = parseFloat(booking.total_paid || 0);
    
    res.json({
      room_charge: parseFloat(booking.total_amount || 0),
      extra_charges: parseFloat(booking.total_extra_charges || 0),
      total_amount: totalAmount,
      total_paid: totalPaid,
      balance_due: totalAmount - totalPaid,
      payment_status: booking.status === 'checked_out' ? 'settled' : 
                       totalPaid >= totalAmount ? 'paid' :
                       totalPaid > 0 ? 'partial' : 'unpaid',
    });
  } catch (error) {
    console.error('Get payment summary error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Generate receipt
router.get('/receipt/:paymentId', authMiddleware, async (req, res) => {
  try {
    const { paymentId } = req.params;
    
    const db = getDb();
    if (!db) {
      return res.status(500).json({ error: 'Database not ready' });
    }
    
    const stmt = db.prepare(
      `SELECT p.*, b.check_in_date, b.check_out_date, b.room_id,
              g.full_name as guest_name, g.phone as guest_phone, g.id_number,
              r.room_number,
              u.full_name as processed_by_name
       FROM payments p
       JOIN bookings b ON p.booking_id = b.id
       JOIN guests g ON b.guest_id = g.id
       JOIN rooms r ON b.room_id = r.id
       LEFT JOIN users u ON p.processed_by = u.id
       WHERE p.id = ?`
    );
    const payment = stmt.getAsObject([paymentId]);
    
    if (!payment.id) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    
    // Get all payments for this booking to show breakdown
    const allPaymentsStmt = db.prepare(
      'SELECT * FROM payments WHERE booking_id = ? ORDER BY created_at'
    );
    const allPayments = allPaymentsStmt.all([payment.booking_id]);
    
    const extraChargesStmt = db.prepare(
      'SELECT * FROM extra_charges WHERE booking_id = ? ORDER BY created_at'
    );
    const extraCharges = extraChargesStmt.all([payment.booking_id]);
    
    res.json({
      receipt_number: payment.reference_number || `PAY-${payment.id}`,
      date: payment.created_at,
      guest: {
        name: payment.guest_name,
        phone: payment.guest_phone,
        id_number: payment.id_number,
      },
      room: {
        number: payment.room_number,
        check_in: payment.check_in_date,
        check_out: payment.check_out_date,
      },
      payment: {
        amount: payment.amount,
        method: payment.payment_method,
        type: payment.payment_type,
      },
      all_payments: allPayments,
      extra_charges: extraCharges,
      processed_by: payment.processed_by_name,
    });
  } catch (error) {
    console.error('Generate receipt error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
