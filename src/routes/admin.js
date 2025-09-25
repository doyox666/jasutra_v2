const express = require('express');
const { db } = require('../database');
const { logActivity } = require('../utils/activity');

module.exports = (io) => {
  const router = express.Router();

  // Get all vehicles for today
  router.get('/vehicles/today', (req, res) => {
    const query = `
      SELECT * FROM vehicles 
      WHERE DATE(created_at) = DATE('now')
      ORDER BY queue_number DESC
    `;
    
    db.all(query, [], (err, rows) => {
      if (err) {
        res.status(500).json({ error: err.message });
      } else {
        res.json(rows);
      }
    });
  });

  // Get all vehicles (for management)
  router.get('/vehicles', (req, res) => {
    const { status, service_type, date } = req.query;
    let query = `SELECT * FROM vehicles WHERE 1=1`;
    const params = [];
    
    if (status && status !== 'all') {
      query += ` AND status = ?`;
      params.push(status);
    }
    
    if (service_type && service_type !== 'all') {
      query += ` AND service_type = ?`;
      params.push(service_type);
    }
    
    if (date) {
      query += ` AND DATE(created_at) = DATE(?)`;
      params.push(date);
    } else {
      query += ` AND DATE(created_at) = DATE('now')`;
    }
    
    query += ` ORDER BY queue_number DESC`;
    
    db.all(query, params, (err, rows) => {
      if (err) {
        res.status(500).json({ error: err.message });
      } else {
        res.json(rows);
      }
    });
  });

  // Delete vehicle
  router.delete('/vehicles/:id', (req, res) => {
    const { id } = req.params;
    
    db.get(`SELECT * FROM vehicles WHERE id = ?`, [id], (err, vehicle) => {
      if (err) {
        res.status(500).json({ error: err.message });
      } else if (!vehicle) {
        res.status(404).json({ error: 'Vehicle not found' });
      } else {
        db.run(`DELETE FROM vehicles WHERE id = ?`, [id], function(err) {
          if (err) {
            res.status(500).json({ error: err.message });
          } else {
            logActivity(id, 'DELETED', `Vehicle ${vehicle.plate_number} deleted from system`);
            io.emit('queueUpdate', { action: 'deleted', vehicleId: id });
            res.json({ success: true, message: 'Vehicle deleted successfully' });
          }
        });
      }
    });
  });

  // Get dashboard statistics
  router.get('/statistics', (req, res) => {
    const queries = {
      today_total: `SELECT COUNT(*) as count FROM vehicles WHERE DATE(created_at) = DATE('now')`,
      today_completed: `SELECT COUNT(*) as count FROM vehicles WHERE DATE(created_at) = DATE('now') AND status = 'completed'`,
      today_waiting: `SELECT COUNT(*) as count FROM vehicles WHERE DATE(created_at) = DATE('now') AND status = 'waiting'`,
      today_in_progress: `SELECT COUNT(*) as count FROM vehicles WHERE DATE(created_at) = DATE('now') AND status IN ('washing', 'drying', 'detailing')`,
      week_total: `SELECT COUNT(*) as count FROM vehicles WHERE DATE(created_at) >= DATE('now', '-7 days')`,
      month_total: `SELECT COUNT(*) as count FROM vehicles WHERE DATE(created_at) >= DATE('now', '-30 days')`
    };

    const stats = {};
    const promises = Object.entries(queries).map(([key, query]) => {
      return new Promise((resolve, reject) => {
        db.get(query, (err, row) => {
          if (err) reject(err);
          else {
            stats[key] = row.count;
            resolve();
          }
        });
      });
    });

    Promise.all(promises)
      .then(() => res.json(stats))
      .catch(err => res.status(500).json({ error: err.message }));
  });

  // Get activity log
  router.get('/activity', (req, res) => {
    const { limit = 50, offset = 0 } = req.query;
    
    const query = `
      SELECT 
        a.*,
        v.plate_number,
        v.queue_number,
        v.service_type
      FROM activity_log a
      LEFT JOIN vehicles v ON a.vehicle_id = v.id
      ORDER BY a.created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    db.all(query, [limit, offset], (err, rows) => {
      if (err) {
        res.status(500).json({ error: err.message });
      } else {
        db.get(`SELECT COUNT(*) as total FROM activity_log`, (err, count) => {
          if (err) {
            res.status(500).json({ error: err.message });
          } else {
            res.json({
              activities: rows,
              total: count.total,
              limit: parseInt(limit),
              offset: parseInt(offset)
            });
          }
        });
      }
    });
  });

  // Manual reset queue (for testing/admin purposes)
  router.post('/reset-queue', async (req, res) => {
    const { password } = req.body;
    
    // Simple password protection (you can change this)
    if (password !== 'admin123') {
      return res.status(401).json({ error: 'Invalid password' });
    }
    
    try {
      const { resetDailyQueue } = require('../database');
      await resetDailyQueue();
      
      // Emit reset event to all clients
      io.emit('dailyReset', { message: 'Queue numbers have been manually reset' });
      
      res.json({ 
        success: true, 
        message: 'Queue numbers have been reset successfully' 
      });
    } catch (error) {
      console.error('Error resetting queue:', error);
      res.status(500).json({ error: 'Failed to reset queue' });
    }
  });

  return router;
};