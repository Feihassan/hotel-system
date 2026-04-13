const express = require('express');
const { getDb } = require('../config/sqlite');
const { authMiddleware, receptionistOrAdmin } = require('../middleware/auth');

const router = express.Router();

// Dashboard summary
router.get('/dashboard', authMiddleware, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const db = getDb();
    if (!db) {
      return res.status(500).json({ error: 'Database not ready' });
    }
    
    const execFirst = (sql, params) => {
      const stmt = db.prepare(sql);
      const row = stmt.getAsObject(params || []);
      stmt.free();
      return row;
    };

    const roomStats = execFirst(`
      SELECT
        COUNT(*) as total_rooms,
        SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as available_rooms,
        SUM(CASE WHEN status = 'occupied' THEN 1 ELSE 0 END) as occupied_rooms,
        SUM(CASE WHEN status = 'cleaning' THEN 1 ELSE 0 END) as cleaning_rooms,
        SUM(CASE WHEN status = 'maintenance' THEN 1 ELSE 0 END) as maintenance_rooms
      FROM rooms
    `);

    const todayCheckIns = execFirst(
      `SELECT COUNT(*) as count FROM bookings WHERE check_in_date = ? AND status = 'checked_in'`,
      [today]
    );

    const todayCheckOuts = execFirst(
      `SELECT COUNT(*) as count FROM bookings WHERE check_out_date = ? AND status IN ('checked_in', 'checked_out')`,
      [today]
    );

    const activeStays = execFirst(
      `SELECT COUNT(*) as count FROM bookings WHERE status = 'checked_in'`
    );

    res.json({
      rooms: {
        total_rooms: parseInt(roomStats.total_rooms || 0),
        available_rooms: parseInt(roomStats.available_rooms || 0),
        occupied_rooms: parseInt(roomStats.occupied_rooms || 0),
        cleaning_rooms: parseInt(roomStats.cleaning_rooms || 0),
        maintenance_rooms: parseInt(roomStats.maintenance_rooms || 0),
      },
      today_check_ins: parseInt(todayCheckIns.count || 0),
      today_check_outs: parseInt(todayCheckOuts.count || 0),
      active_stays: parseInt(activeStays.count || 0),
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Daily report
router.get('/daily', receptionistOrAdmin, async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    const db = getDb();
    if (!db) {
      return res.status(500).json({ error: 'Database not ready' });
    }
    
    // Check-ins
    const checkInsStmt = db.prepare(
      `SELECT b.*, g.full_name as guest_name, g.phone as guest_phone, r.room_number
       FROM bookings b
       JOIN guests g ON b.guest_id = g.id
       JOIN rooms r ON b.room_id = r.id
       WHERE b.check_in_date = ?
       ORDER BY r.room_number`
    );
    const checkIns = checkInsStmt.all([targetDate]);
    
    // Check-outs
    const checkOutsStmt = db.prepare(
      `SELECT b.*, g.full_name as guest_name, g.phone as guest_phone, r.room_number
       FROM bookings b
       JOIN guests g ON b.guest_id = g.id
       JOIN rooms r ON b.room_id = r.id
       WHERE b.check_out_date = ?
       ORDER BY r.room_number`
    );
    const checkOuts = checkOutsStmt.all([targetDate]);
    
    // Payments
    const paymentsStmt = db.prepare(
      `SELECT p.*, g.full_name as guest_name, r.room_number
       FROM payments p
       JOIN bookings b ON p.booking_id = b.id
       JOIN guests g ON b.guest_id = g.id
       JOIN rooms r ON b.room_id = r.id
       WHERE DATE(p.created_at) = ? AND p.status = 'completed'
       ORDER BY p.created_at`
    );
    const payments = paymentsStmt.all([targetDate]);
    
    const totalRevenue = payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
    
    // Room occupancy end of day
    const roomOccupancyStmt = db.prepare(
      `SELECT r.room_number, rt.name as room_type, r.status
       FROM rooms r
       LEFT JOIN room_types rt ON r.room_type_id = rt.id
       ORDER BY r.room_number`
    );
    const roomOccupancy = roomOccupancyStmt.all();
    
    res.json({
      date: targetDate,
      check_ins: {
        count: checkIns.length,
        details: checkIns,
      },
      check_outs: {
        count: checkOuts.length,
        details: checkOuts,
      },
      payments: {
        count: payments.length,
        total: totalRevenue,
        details: payments,
      },
      room_occupancy: roomOccupancy,
    });
  } catch (error) {
    console.error('Daily report error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Revenue report
router.get('/revenue', receptionistOrAdmin, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    if (!start_date || !end_date) {
      return res.status(400).json({ error: 'Start and end dates required' });
    }
    
    const db = getDb();
    if (!db) {
      return res.status(500).json({ error: 'Database not ready' });
    }
    
    // Room charges
    const roomChargesStmt = db.prepare(
      `SELECT
         DATE(b.created_at) as date,
         COUNT(DISTINCT b.id) as bookings,
         SUM(b.total_amount) as room_revenue
       FROM bookings b
       WHERE DATE(b.created_at) BETWEEN ? AND ?
       GROUP BY DATE(b.created_at)
       ORDER BY date`
    );
    const roomCharges = roomChargesStmt.all([start_date, end_date]);
    
    // Extra charges
    const extraChargesStmt = db.prepare(
      `SELECT
         DATE(ec.created_at) as date,
         SUM(ec.amount) as extra_revenue
       FROM extra_charges ec
       WHERE DATE(ec.created_at) BETWEEN ? AND ?
       GROUP BY DATE(ec.created_at)
       ORDER BY date`
    );
    const extraCharges = extraChargesStmt.all([start_date, end_date]);
    
    // Payments by method
    const paymentsByMethodStmt = db.prepare(
      `SELECT
         p.payment_method,
         SUM(p.amount) as total,
         COUNT(*) as count
       FROM payments p
       WHERE DATE(p.created_at) BETWEEN ? AND ? AND p.status = 'completed'
       GROUP BY p.payment_method`
    );
    const paymentsByMethod = paymentsByMethodStmt.all([start_date, end_date]);
    
    // Combine data
    const dates = new Set([
      ...roomCharges.map(r => r.date),
      ...extraCharges.map(e => e.date),
    ]);
    
    const dailyData = Array.from(dates).sort().map(date => {
      const room = roomCharges.find(r => r.date === date) || { bookings: 0, room_revenue: 0 };
      const extra = extraCharges.find(e => e.date === date) || { extra_revenue: 0 };
      
      return {
        date,
        bookings: parseInt(room.bookings || 0),
        room_revenue: parseFloat(room.room_revenue || 0),
        extra_revenue: parseFloat(extra.extra_revenue || 0),
        total_revenue: parseFloat(room.room_revenue || 0) + parseFloat(extra.extra_revenue || 0),
      };
    });
    
    const totals = {
      total_bookings: dailyData.reduce((sum, d) => sum + d.bookings, 0),
      total_room_revenue: dailyData.reduce((sum, d) => sum + d.room_revenue, 0),
      total_extra_revenue: dailyData.reduce((sum, d) => sum + d.extra_revenue, 0),
      grand_total: dailyData.reduce((sum, d) => sum + d.total_revenue, 0),
    };
    
    res.json({
      period: { start_date, end_date },
      daily: dailyData,
      totals,
      by_payment_method: paymentsByMethod,
    });
  } catch (error) {
    console.error('Revenue report error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Occupancy report
router.get('/occupancy', receptionistOrAdmin, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    const today = new Date().toISOString().split('T')[0];
    const targetDate = start_date || today;
    
    const db = getDb();
    if (!db) {
      return res.status(500).json({ error: 'Database not ready' });
    }
    
    // Room status summary
    const roomSummaryStmt = db.prepare(`
      SELECT
        COUNT(*) as total_rooms,
        SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as available,
        SUM(CASE WHEN status = 'occupied' THEN 1 ELSE 0 END) as occupied,
        SUM(CASE WHEN status = 'cleaning' THEN 1 ELSE 0 END) as cleaning,
        SUM(CASE WHEN status = 'maintenance' THEN 1 ELSE 0 END) as maintenance
      FROM rooms
    `);
    const roomSummary = roomSummaryStmt.getAsObject();
    
    // Current occupancy by room type
    const occupancyByTypeStmt = db.prepare(`
      SELECT
        rt.name as room_type,
        COUNT(r.id) as total_rooms,
        SUM(CASE WHEN r.status = 'occupied' THEN 1 ELSE 0 END) as occupied
      FROM room_types rt
      LEFT JOIN rooms r ON r.room_type_id = rt.id
      GROUP BY rt.name
      ORDER BY rt.base_price
    `);
    const occupancyByType = occupancyByTypeStmt.all();
    
    // Calculate occupancy rate
    const totalRooms = parseInt(roomSummary.total_rooms || 0);
    const occupied = parseInt(roomSummary.occupied || 0);
    const occupancyRate = totalRooms > 0 ? ((occupied / totalRooms) * 100).toFixed(1) : 0;
    
    res.json({
      date: targetDate,
      summary: {
        ...roomSummary,
        occupancy_rate: occupancyRate,
      },
      by_room_type: occupancyByType,
    });
  } catch (error) {
    console.error('Occupancy report error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Receptionist activity report
router.get('/receptionist-activity', authMiddleware, (req, res) => {
  try {
    const { user_id, date } = req.query;
    const db = getDb();
    if (!db) return res.status(500).json({ error: 'Database not ready' });

    const filterUserId = req.user.role === 'admin' ? (user_id || null) : req.user.id;
    const dateFilter = date || new Date().toISOString().split('T')[0];

    let staffQuery = `
      SELECT
        u.id, u.full_name,
        COUNT(DISTINCT CASE WHEN DATE(b.actual_check_in_time) = ? THEN b.id END) as check_ins,
        COUNT(DISTINCT CASE WHEN DATE(b.actual_check_out_time) = ? THEN b.id END) as check_outs,
        COALESCE(SUM(CASE WHEN DATE(p.created_at) = ? AND p.status = 'completed' THEN p.amount ELSE 0 END), 0) as revenue
      FROM users u
      LEFT JOIN bookings b ON (b.checked_in_by = u.id OR b.checked_out_by = u.id)
      LEFT JOIN payments p ON p.processed_by = u.id
      WHERE u.role IN ('receptionist', 'admin')
    `;
    const params = [dateFilter, dateFilter, dateFilter];
    if (filterUserId) { staffQuery += ' AND u.id = ?'; params.push(filterUserId); }
    staffQuery += ' GROUP BY u.id ORDER BY check_ins DESC';

    const staff = db.prepare(staffQuery).all(params);
    res.json({ date: dateFilter, staff });
  } catch (error) {
    console.error('Receptionist activity error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Shift performance report
router.get('/shift-performance', authMiddleware, (req, res) => {
  try {
    const { user_id, date } = req.query;
    const db = getDb();
    if (!db) return res.status(500).json({ error: 'Database not ready' });

    const filterUserId = req.user.role === 'admin' ? (user_id || null) : req.user.id;
    const dateFilter = date || new Date().toISOString().split('T')[0];

    let query = `
      SELECT
        s.id as shift_id, s.started_at, s.ended_at, s.status, s.summary,
        u.id as user_id, u.full_name as receptionist_name,
        COUNT(DISTINCT CASE WHEN b.actual_check_in_time >= s.started_at AND
          (s.ended_at IS NULL OR b.actual_check_in_time <= s.ended_at) THEN b.id END) as check_ins,
        COUNT(DISTINCT CASE WHEN b.actual_check_out_time >= s.started_at AND
          (s.ended_at IS NULL OR b.actual_check_out_time <= s.ended_at) THEN b.id END) as check_outs,
        COALESCE(SUM(CASE WHEN p.created_at >= s.started_at AND
          (s.ended_at IS NULL OR p.created_at <= s.ended_at) AND p.status = 'completed' THEN p.amount ELSE 0 END), 0) as revenue
      FROM shifts s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN bookings b ON (b.checked_in_by = s.user_id OR b.checked_out_by = s.user_id)
      LEFT JOIN payments p ON p.processed_by = s.user_id
      WHERE DATE(s.started_at) = ?
    `;
    const params = [dateFilter];
    if (filterUserId) { query += ' AND s.user_id = ?'; params.push(filterUserId); }
    query += ' GROUP BY s.id ORDER BY s.started_at DESC';

    const shifts = db.prepare(query).all(params);
    shifts.forEach(s => {
      try { s.summary = JSON.parse(s.summary || '{}'); } catch (e) { s.summary = {}; }
    });
    res.json({ date: dateFilter, shifts });
  } catch (error) {
    console.error('Shift performance error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Guest history report
router.get('/guests', receptionistOrAdmin, async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    
    const db = getDb();
    if (!db) {
      return res.status(500).json({ error: 'Database not ready' });
    }
    
    const stmt = db.prepare(`
      SELECT
        g.id,
        g.full_name,
        g.phone,
        g.id_number,
        COUNT(b.id) as total_stays,
        MAX(b.created_at) as last_stay,
        SUM(b.total_amount) as total_spent
      FROM guests g
      LEFT JOIN bookings b ON b.guest_id = g.id
      GROUP BY g.id
      ORDER BY last_stay DESC
      LIMIT ?
    `);
    const result = stmt.all([parseInt(limit)]);
    
    res.json(result);
  } catch (error) {
    console.error('Guest report error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
