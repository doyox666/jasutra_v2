const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../data.db');
const db = new sqlite3.Database(dbPath);

const init = () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Create vehicles table
      db.run(`CREATE TABLE IF NOT EXISTS vehicles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        queue_number INTEGER NOT NULL,
        plate_number TEXT NOT NULL,
        service_type TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME
      )`, (err) => {
        if (err) reject(err);
      });

      // Create activity_log table
      db.run(`CREATE TABLE IF NOT EXISTS activity_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        vehicle_id INTEGER,
        action TEXT NOT NULL,
        description TEXT,
        user TEXT DEFAULT 'System',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (vehicle_id) REFERENCES vehicles (id)
      )`, (err) => {
        if (err) reject(err);
      });

      // Create settings table
      db.run(`CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT UNIQUE NOT NULL,
        value TEXT NOT NULL
      )`, (err) => {
        if (err) reject(err);
      });

      // Initialize settings
      db.run(`INSERT OR IGNORE INTO settings (key, value) VALUES 
        ('running_text', 'Selamat Datang di JS Carwash - Jl. Raya Perumnas No.235, Sukaluyu, Teluk Jambe Timur, Karawang - Layanan Cuci Mobil & Detailing Profesional'),
        ('last_queue_cuci', '0'),
        ('last_queue_detailing', '0'),
        ('reset_daily', 'true')
      `, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  });
};

const getNextQueueNumber = (serviceType) => {
  return new Promise((resolve, reject) => {
    const key = serviceType === 'cuci' ? 'last_queue_cuci' : 'last_queue_detailing';
    const prefix = serviceType === 'cuci' ? 'C' : 'D';
    
    db.get(`SELECT value FROM settings WHERE key = ?`, [key], (err, row) => {
      if (err) reject(err);
      else {
        const currentNumber = row ? parseInt(row.value) : 0;
        const nextNumber = currentNumber + 1;
        const formattedNumber = `${prefix}${String(nextNumber).padStart(3, '0')}`;
        
        db.run(`UPDATE settings SET value = ? WHERE key = ?`, [nextNumber, key], (updateErr) => {
          if (updateErr) {
            // If update fails, try insert (in case the key doesn't exist)
            db.run(`INSERT INTO settings (key, value) VALUES (?, ?)`, [key, nextNumber], (insertErr) => {
              if (insertErr) reject(insertErr);
              else resolve(formattedNumber);
            });
          } else {
            resolve(formattedNumber);
          }
        });
      }
    });
  });
};

const resetDailyQueue = () => {
  return new Promise((resolve, reject) => {
    console.log('[AUTO-RESET] Resetting daily queue at', new Date().toLocaleString('id-ID'));
    
    // Reset both cuci and detailing counters
    db.run(`UPDATE settings SET value = '0' WHERE key IN ('last_queue_cuci', 'last_queue_detailing')`, (err) => {
      if (err) reject(err);
      else {
        db.run(`UPDATE vehicles SET status = 'completed' WHERE status != 'completed' AND DATE(created_at) < DATE('now')`, (err2) => {
          if (err2) reject(err2);
          else {
            // Log the reset activity
            db.run(
              `INSERT INTO activity_log (vehicle_id, action, description, user) VALUES (NULL, 'SYSTEM_RESET', 'Nomor antrian direset otomatis pada pukul 00:01', 'System')`,
              (err3) => {
                if (err3) console.error('Error logging reset activity:', err3);
                console.log('[AUTO-RESET] Daily queue reset completed successfully');
                resolve();
              }
            );
          }
        });
      }
    });
  });
};

module.exports = {
  db,
  init,
  getNextQueueNumber,
  resetDailyQueue
};