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
      ORDER BY 
        CASE 
          WHEN status = 'completed' THEN completed_at
          ELSE created_at
        END ASC,
        queue_number ASC
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
    
    query += ` ORDER BY 
      CASE 
        WHEN status = 'completed' THEN completed_at
        ELSE created_at
      END ASC,
      queue_number ASC`;
    
    db.all(query, params, (err, rows) => {
      if (err) {
        res.status(500).json({ error: err.message });
      } else {
        res.json(rows);
      }
    });
  });

  // Delete vehicle (only completed vehicles can be deleted)
  router.delete('/vehicles/:id', (req, res) => {
    const { id } = req.params;
    
    db.get(`SELECT * FROM vehicles WHERE id = ?`, [id], (err, vehicle) => {
      if (err) {
        res.status(500).json({ error: err.message });
      } else if (!vehicle) {
        res.status(404).json({ error: 'Kendaraan tidak ditemukan' });
      } else if (vehicle.status !== 'completed') {
        // Only allow deletion of completed vehicles
        res.status(400).json({ error: 'Hanya kendaraan yang sudah selesai yang dapat dihapus' });
      } else {
        db.run(`DELETE FROM vehicles WHERE id = ?`, [id], function(err) {
          if (err) {
            res.status(500).json({ error: err.message });
          } else {
            logActivity(id, 'DELETED', `Kendaraan ${vehicle.plate_number} (${vehicle.queue_number}) dihapus dari kolom selesai`);
            io.emit('queueUpdate', { action: 'deleted', vehicleId: id });
            res.json({ success: true, message: 'Kendaraan berhasil dihapus dari kolom selesai' });
          }
        });
      }
    });
  });

  // Move vehicle from cuci to detailing
  router.put('/vehicles/:id/move-to-detailing', (req, res) => {
    const { id } = req.params;
    
    db.get(`SELECT * FROM vehicles WHERE id = ?`, [id], async (err, vehicle) => {
      if (err) {
        res.status(500).json({ error: err.message });
      } else if (!vehicle) {
        res.status(404).json({ error: 'Kendaraan tidak ditemukan' });
      } else if (vehicle.service_type !== 'cuci') {
        res.status(400).json({ error: 'Hanya kendaraan dengan layanan cuci yang dapat dipindahkan' });
      } else if (vehicle.status === 'completed') {
        res.status(400).json({ error: 'Kendaraan yang sudah selesai tidak dapat dipindahkan' });
      } else {
        try {
          // Get new queue number for detailing
          const { getNextQueueNumber } = require('../database');
          const newQueueNumber = await getNextQueueNumber('detailing');
          
          // Update vehicle to detailing service with new queue number and reset status to waiting
          db.run(
            `UPDATE vehicles SET service_type = ?, queue_number = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
            ['detailing', newQueueNumber, 'waiting', id],
            function(updateErr) {
              if (updateErr) {
                res.status(500).json({ error: updateErr.message });
              } else {
                logActivity(id, 'MOVED_TO_DETAILING', `Kendaraan ${vehicle.plate_number} dipindahkan dari Cuci (${vehicle.queue_number}) ke Detailing (${newQueueNumber})`);
                io.emit('queueUpdate', { action: 'moved_to_detailing', vehicleId: id });
                res.json({ 
                  success: true, 
                  message: 'Kendaraan berhasil dipindahkan ke antrian detailing',
                  newQueueNumber: newQueueNumber
                });
              }
            }
          );
        } catch (error) {
          res.status(500).json({ error: error.message });
        }
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