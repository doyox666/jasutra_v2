const express = require('express');
const { db, getNextQueueNumber } = require('../database');
const { logActivity } = require('../utils/activity');

module.exports = (io) => {
  const router = express.Router();

  // Get all active queues
  router.get('/active', (req, res) => {
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
        const cuciQueues = rows.filter(v => v.service_type === 'cuci');
        const detailingQueues = rows.filter(v => v.service_type === 'detailing');
        res.json({ cuci: cuciQueues, detailing: detailingQueues });
      }
    });
  });

  // Register new vehicle
  router.post('/register', async (req, res) => {
    const { plate_number, service_type } = req.body;
    
    if (!plate_number || !service_type) {
      return res.status(400).json({ error: 'Plate number and service type are required' });
    }

    try {
      const queue_number = await getNextQueueNumber(service_type);
      const status = 'waiting';
      
      db.run(
        `INSERT INTO vehicles (queue_number, plate_number, service_type, status) 
         VALUES (?, ?, ?, ?)`,
        [queue_number, plate_number.toUpperCase(), service_type, status],
        function(err) {
          if (err) {
            res.status(500).json({ error: err.message });
          } else {
            const vehicleId = this.lastID;
            
            // Log activity
            logActivity(vehicleId, 'REGISTERED', `Vehicle ${plate_number} registered for ${service_type} service`);
            
            // Get the created vehicle
            db.get(`SELECT * FROM vehicles WHERE id = ?`, [vehicleId], (err, vehicle) => {
              if (err) {
                res.status(500).json({ error: err.message });
              } else {
                // Emit socket event for real-time update
                io.emit('queueUpdate', { action: 'registered', vehicle });
                
                res.json({ 
                  success: true, 
                  vehicle,
                  message: `Vehicle registered with queue number ${queue_number}`
                });
              }
            });
          }
        }
      );
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update vehicle status
  router.put('/:id/status', (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    
    const validStatuses = ['waiting', 'washing', 'drying', 'detailing', 'completed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    let query = `UPDATE vehicles SET status = ?, updated_at = CURRENT_TIMESTAMP`;
    let params = [status];
    
    if (status === 'completed') {
      query += `, completed_at = CURRENT_TIMESTAMP`;
    }
    
    query += ` WHERE id = ?`;
    params.push(id);

    db.run(query, params, function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
      } else {
        // Log activity
        logActivity(id, 'STATUS_CHANGED', `Status changed to ${status}`);
        
        // Get updated vehicle
        db.get(`SELECT * FROM vehicles WHERE id = ?`, [id], (err, vehicle) => {
          if (err) {
            res.status(500).json({ error: err.message });
          } else {
            // Emit socket event
            io.emit('queueUpdate', { action: 'statusChanged', vehicle });
            
            res.json({ success: true, vehicle });
          }
        });
      }
    });
  });

  // Get running text
  router.get('/running-text', (req, res) => {
    db.get(`SELECT value FROM settings WHERE key = 'running_text'`, (err, row) => {
      if (err) {
        res.status(500).json({ error: err.message });
      } else {
        res.json({ text: row ? row.value : '' });
      }
    });
  });

  // Update running text
  router.put('/running-text', (req, res) => {
    const { text } = req.body;
    
    db.run(`UPDATE settings SET value = ? WHERE key = 'running_text'`, [text], (err) => {
      if (err) {
        res.status(500).json({ error: err.message });
      } else {
        io.emit('runningTextUpdate', { text });
        res.json({ success: true, text });
      }
    });
  });

  return router;
};