const { db } = require('../database');

function logActivity(vehicleId, action, description, user = 'Admin') {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO activity_log (vehicle_id, action, description, user) VALUES (?, ?, ?, ?)`,
      [vehicleId, action, description, user],
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