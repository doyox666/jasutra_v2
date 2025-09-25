const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const database = require('./database');
const queueRoutes = require('./routes/queue');
const adminRoutes = require('./routes/admin');
const reportRoutes = require('./routes/report');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../public')));

app.use('/api/queue', queueRoutes(io));
app.use('/api/admin', adminRoutes(io));
app.use('/api/report', reportRoutes);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/display.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/admin.html'));
});

// Function to schedule daily reset
function scheduleDailyReset() {
  const now = new Date();
  const night = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1, // Next day
    0, // 00 hours
    1, // 01 minutes
    0  // 00 seconds
  );
  
  const msToMidnight = night.getTime() - now.getTime();
  
  // Schedule first reset for next 00:01
  setTimeout(() => {
    database.resetDailyQueue()
      .then(() => {
        console.log('[SCHEDULER] Daily reset completed at 00:01');
        // Emit event to update all connected clients
        io.emit('dailyReset', { message: 'Queue numbers have been reset for a new day' });
      })
      .catch(err => {
        console.error('[SCHEDULER] Error in daily reset:', err);
      });
    
    // Schedule subsequent resets every 24 hours
    setInterval(() => {
      database.resetDailyQueue()
        .then(() => {
          console.log('[SCHEDULER] Daily reset completed at 00:01');
          io.emit('dailyReset', { message: 'Queue numbers have been reset for a new day' });
        })
        .catch(err => {
          console.error('[SCHEDULER] Error in daily reset:', err);
        });
    }, 24 * 60 * 60 * 1000); // 24 hours in milliseconds
  }, msToMidnight);
  
  console.log(`[SCHEDULER] Daily reset scheduled for ${night.toLocaleString('id-ID')}`);
}

// Function to check and perform reset if needed on startup
async function checkAndResetIfNeeded() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  // Check last reset time from database
  return new Promise((resolve, reject) => {
    database.db.get(`SELECT value FROM settings WHERE key = 'last_reset_date'`, async (err, row) => {
      if (err) {
        console.error('[STARTUP] Error checking last reset date:', err);
        resolve(); // Continue startup even if check fails
        return;
      }
      
      const lastResetDate = row ? new Date(row.value) : null;
      
      // If no reset date or reset date is before today, perform reset
      if (!lastResetDate || lastResetDate < today) {
        try {
          await database.resetDailyQueue();
          // Update last reset date
          database.db.run(
            `INSERT OR REPLACE INTO settings (key, value) VALUES ('last_reset_date', ?)`,
            [today.toISOString()],
            (updateErr) => {
              if (updateErr) console.error('[STARTUP] Error updating reset date:', updateErr);
            }
          );
          console.log('[STARTUP] Performed startup daily reset');
        } catch (resetErr) {
          console.error('[STARTUP] Error performing startup reset:', resetErr);
        }
      } else {
        console.log('[STARTUP] No reset needed, last reset was today');
      }
      resolve();
    });
  });
}

database.init().then(async () => {
  // Check and reset if needed on startup
  await checkAndResetIfNeeded();
  
  server.listen(PORT, () => {
    console.log(`JS Carwash Server running on port ${PORT}`);
    console.log(`Display: http://localhost:${PORT}`);
    console.log(`Admin: http://localhost:${PORT}/admin`);
    
    // Schedule daily reset
    scheduleDailyReset();
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
});