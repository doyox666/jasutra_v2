const { db } = require('../database');

function logActivity(vehicleId, action, description, user = 'Admin') {
  return new Promise((resolve, reject) => {
    // Gunakan waktu Indonesia eksplisit untuk konsistensi
    const now = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' });
    
    db.run(
      `INSERT INTO activity_log (vehicle_id, action, description, user, created_at) VALUES (?, ?, ?, ?, ?)`,
      [vehicleId, action, description, user, now],
      function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
  });
}

module.exports = {
  logActivity
};