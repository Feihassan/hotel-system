const express = require('express');
const { getDb } = require('../config/sqlite');
const { authMiddleware, housekeepingOrAdmin } = require('../middleware/auth');

const router = express.Router();

// Get all housekeeping tasks
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { status, priority, room_id } = req.query;
    
    const db = getDb();
    if (!db) {
      return res.status(500).json({ error: 'Database not ready' });
    }
    
    let query = `
      SELECT ht.*,
             r.room_number,
             rt.name as room_type_name,
             creator.full_name as created_by_name,
             assignee.full_name as assigned_to_name
      FROM housekeeping_tasks ht
      JOIN rooms r ON ht.room_id = r.id
      LEFT JOIN room_types rt ON r.room_type_id = rt.id
      LEFT JOIN users creator ON ht.created_by = creator.id
      LEFT JOIN users assignee ON ht.assigned_to = assignee.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (status) {
      query += ` AND ht.status = ?`;
      params.push(status);
    }
    
    if (priority) {
      query += ` AND ht.priority = ?`;
      params.push(priority);
    }
    
    if (room_id) {
      query += ` AND ht.room_id = ?`;
      params.push(room_id);
    }
    
    query += ' ORDER BY ht.created_at DESC';
    
    const stmt = db.prepare(query);
    const result = stmt.all(params);
    res.json(result);
  } catch (error) {
    console.error('Get housekeeping tasks error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get rooms needing cleaning
router.get('/pending', authMiddleware, async (req, res) => {
  try {
    const db = getDb();
    if (!db) {
      return res.status(500).json({ error: 'Database not ready' });
    }
    
    const stmt = db.prepare(
      `SELECT r.*, rt.name as room_type_name, rt.base_price
       FROM rooms r
       LEFT JOIN room_types rt ON r.room_type_id = rt.id
       WHERE r.status = 'cleaning'
       ORDER BY r.room_number`
    );
    const result = stmt.all();
    
    res.json(result);
  } catch (error) {
    console.error('Get pending cleaning error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create housekeeping task
router.post('/', housekeepingOrAdmin, async (req, res) => {
  try {
    const { room_id, task_type, priority, notes, assigned_to } = req.body;
    
    if (!room_id || !task_type) {
      return res.status(400).json({ error: 'Room and task type are required' });
    }
    
    const db = getDb();
    if (!db) {
      return res.status(500).json({ error: 'Database not ready' });
    }
    
    const stmt = db.prepare(
      `INSERT INTO housekeeping_tasks (room_id, task_type, priority, notes, assigned_to, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`
    );
    const result = stmt.run([room_id, task_type, priority || 'normal', notes || null, assigned_to || null, req.user.id]);
    
    const newTaskStmt = db.prepare('SELECT * FROM housekeeping_tasks WHERE id = ?');
    const newTask = newTaskStmt.getAsObject([result.lastInsertRowid]);
    
    db.saveToFile();
    res.status(201).json(newTask);
  } catch (error) {
    console.error('Create housekeeping task error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update task status
router.patch('/:id/status', housekeepingOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!['pending', 'in_progress', 'completed', 'verified'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    const db = getDb();
    if (!db) {
      return res.status(500).json({ error: 'Database not ready' });
    }
    
    let query = `UPDATE housekeeping_tasks SET status = ?`;
    const params = [status];
    
    if (status === 'completed') {
      query += `, completed_at = datetime('now')`;
    }
    
    if (status === 'verified') {
      query += `, verified_at = datetime('now')`;
    }
    
    query += ` WHERE id = ?`;
    params.push(id);
    
    const updateStmt = db.prepare(query);
    updateStmt.run(params);
    
    const taskStmt = db.prepare('SELECT * FROM housekeeping_tasks WHERE id = ?');
    const task = taskStmt.getAsObject([id]);
    
    if (!task.id) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    // If task is verified as completed, update room status to available
    if (status === 'verified') {
      const updateRoomStmt = db.prepare('UPDATE rooms SET status = ?, updated_at = datetime(\'now\') WHERE id = ?');
      updateRoomStmt.run(['available', task.room_id]);
    }
    
    // If marked as in progress, update room status
    if (status === 'in_progress') {
      const updateRoomStmt = db.prepare('UPDATE rooms SET status = ?, updated_at = datetime(\'now\') WHERE id = ?');
      updateRoomStmt.run(['cleaning', task.room_id]);
    }
    
    db.saveToFile();
    res.json(task);
  } catch (error) {
    console.error('Update task status error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Quick mark room as cleaned (from room status)
router.post('/mark-clean/:roomId', housekeepingOrAdmin, async (req, res) => {
  try {
    const { roomId } = req.params;
    
    const db = getDb();
    if (!db) {
      return res.status(500).json({ error: 'Database not ready' });
    }
    
    // Check room exists
    const roomStmt = db.prepare('SELECT * FROM rooms WHERE id = ?');
    const room = roomStmt.getAsObject([roomId]);
    
    if (!room.id) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    if (room.status !== 'cleaning') {
      return res.status(400).json({ error: 'Room is not in cleaning status' });
    }
    
    // Update room status
    const updateRoomStmt = db.prepare('UPDATE rooms SET status = ?, updated_at = datetime(\'now\') WHERE id = ?');
    updateRoomStmt.run(['available', roomId]);
    
    // Complete any pending tasks for this room
    const updateTasksStmt = db.prepare(
      `UPDATE housekeeping_tasks
       SET status = 'completed',
           completed_at = datetime('now'),
           verified_at = datetime('now')
       WHERE room_id = ? AND status IN ('pending', 'in_progress')`
    );
    updateTasksStmt.run([roomId]);
    
    db.saveToFile();
    res.json({ message: 'Room marked as available', room_number: room.room_number });
  } catch (error) {
    console.error('Mark clean error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Assign task to housekeeping staff
router.patch('/:id/assign', housekeepingOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { assigned_to } = req.body;
    
    const db = getDb();
    if (!db) {
      return res.status(500).json({ error: 'Database not ready' });
    }
    
    const updateStmt = db.prepare('UPDATE housekeeping_tasks SET assigned_to = ? WHERE id = ?');
    updateStmt.run([assigned_to, id]);
    
    const taskStmt = db.prepare('SELECT * FROM housekeeping_tasks WHERE id = ?');
    const task = taskStmt.getAsObject([id]);
    
    if (!task.id) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    db.saveToFile();
    res.json(task);
  } catch (error) {
    console.error('Assign task error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get housekeeping stats
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const db = getDb();
    if (!db) {
      return res.status(500).json({ error: 'Database not ready' });
    }
    
    const stmt = db.prepare(
      `SELECT
         (SELECT COUNT(*) FROM rooms WHERE status = 'cleaning') as rooms_pending_cleaning,
         (SELECT COUNT(*) FROM rooms WHERE status = 'available') as rooms_available,
         (SELECT COUNT(*) FROM housekeeping_tasks WHERE status = 'pending') as tasks_pending,
         (SELECT COUNT(*) FROM housekeeping_tasks WHERE status = 'in_progress') as tasks_in_progress,
         (SELECT COUNT(*) FROM housekeeping_tasks WHERE status = 'completed' AND DATE(completed_at) = ?) as tasks_completed_today`
    );
    const stats = stmt.getAsObject([today]);
    
    res.json(stats);
  } catch (error) {
    console.error('Get housekeeping stats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
