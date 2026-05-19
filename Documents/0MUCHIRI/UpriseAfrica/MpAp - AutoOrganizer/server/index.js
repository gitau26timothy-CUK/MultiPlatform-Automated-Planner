require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');

const taskRoutes = require('./routes/tasks');
const eventRoutes = require('./routes/events');
const deviceRoutes = require('./routes/devices');
const aiRoutes = require('./routes/ai');
const SyncService = require('./services/SyncService');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE'] }
});

// Middleware
app.use(cors());
app.use(express.json());

// Attach io to req for route access
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Routes
app.use('/api/tasks', taskRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/ai', aiRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    devices: syncService.getDeviceCount(),
    uptime: process.uptime()
  });
});

// Sync service
const syncService = new SyncService(io);

// Socket.io — Bluetooth device sync
io.on('connection', (socket) => {
  console.log(`[SOCKET] Client connected: ${socket.id}`);

  // Device registers itself (simulating BT/WiFi connection)
  socket.on('device:connect', async (deviceInfo) => {
    syncService.registerDevice(socket.id, deviceInfo);
    // Server knows all planned tasks — push full state to newly connected device
    await syncService.pushFullState(socket.id);
  });

  // Device requests full sync
  socket.on('sync:request', async () => {
    await syncService.pushFullState(socket.id);
  });

  // Device reports a task change (from local edit)
  socket.on('task:update', async (taskData) => {
    const Task = require('./models/Task');
    try {
      const task = await Task.findByIdAndUpdate(taskData._id, taskData, { new: true });
      if (task) {
        // Broadcast to ALL other devices
        socket.broadcast.emit('task:updated', task);
      }
    } catch (err) {
      console.error('[SOCKET] Task update error:', err);
    }
  });

  // Device requests alarm check
  socket.on('alarms:check', async () => {
    await syncService.pushAlarmNotifications();
  });

  // Disconnect
  socket.on('disconnect', () => {
    syncService.removeDevice(socket.id);
  });
});

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('[DB] Connected to MongoDB');
    seedData();
  })
  .catch(err => console.error('[DB] Connection error:', err));

// Seed initial data if empty
async function seedData() {
  const Task = require('./models/Task');
  const Event = require('./models/Event');
  const count = await Task.countDocuments();
  if (count === 0) {
    console.log('[DB] Seeding initial data...');
    await Task.insertMany([
      { title: 'Literature review — AI Ethics paper', tag: 'assignment', priority: 'mid', due: 'May 3', progress: 15, column: 0, avatars: ['AK'], alarm: false, order: 0 },
      { title: 'Setup DeFi staking strategy', tag: 'crypto', priority: 'crypto', due: 'May 5', progress: 0, column: 0, avatars: ['AK'], alarm: false, order: 1 },
      { title: 'Quantum Computing pset 4', tag: 'assignment', priority: 'high', due: 'Apr 29', progress: 40, column: 1, avatars: ['AK', 'TM'], alarm: true, order: 0 },
      { title: 'Research proposal draft v2', tag: 'project', priority: 'mid', due: 'Apr 30', progress: 65, column: 1, avatars: ['AK', 'JL'], alarm: false, order: 1 },
      { title: 'Solidity smart contract audit', tag: 'crypto', priority: 'low', due: 'May 2', progress: 20, column: 1, avatars: ['AK'], alarm: false, order: 2 },
      { title: 'STEM Lab Report — Physics 301', tag: 'deadline', priority: 'high', due: 'TODAY', progress: 80, column: 2, avatars: ['AK'], alarm: true, order: 0 },
      { title: 'Protein folding simulation run', tag: 'project', priority: 'mid', due: 'Apr 30', progress: 55, column: 2, avatars: ['AK', 'MR'], alarm: false, order: 1 },
      { title: 'ETH portfolio rebalancing', tag: 'crypto', priority: 'crypto', due: 'Apr 28', progress: 70, column: 2, avatars: ['AK'], alarm: false, order: 2 },
      { title: 'Midterm study plan', tag: 'assignment', priority: 'low', due: 'Apr 25', progress: 100, column: 3, avatars: ['AK'], alarm: false, order: 0 },
      { title: 'BTC DCA schedule setup', tag: 'crypto', priority: 'crypto', due: 'Apr 26', progress: 100, column: 3, avatars: ['AK'], alarm: false, order: 1 }
    ]);

    await Event.insertMany([
      { title: 'ML Lecture — Room 3B', time: '09:00', duration: '90min', source: 'google', color: '#7c3aed', detail: 'Google Cal' },
      { title: 'Lab Report Deadline', time: '11:30', duration: '', source: 'manual', color: '#ef4444', detail: 'URGENT · 2h remaining' },
      { title: 'STEM Group Sync', time: '14:00', duration: '1h', source: 'outlook', color: '#10b981', detail: 'Zoom · 1h' },
      { title: 'BTC/ETH Portfolio Review', time: '17:00', duration: '', source: 'manual', color: '#f59e0b', detail: 'Crypto · self-scheduled' },
      { title: 'Study Block', time: '20:00', duration: '2h', source: 'ical', color: '#00d4ff', detail: 'Auto-blocked · 2h' }
    ]);

    console.log('[DB] Seeding complete');
  }
}

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`[SERVER] Running on port ${PORT}`);
  console.log(`[SERVER] API: http://localhost:${PORT}/api`);
  console.log(`[SERVER] Socket.io: ws://localhost:${PORT}`);
});
