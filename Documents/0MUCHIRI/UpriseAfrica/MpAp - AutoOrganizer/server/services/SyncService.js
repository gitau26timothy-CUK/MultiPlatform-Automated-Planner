const Task = require('../models/Task');
const Event = require('../models/Event');

class SyncService {
  constructor(io) {
    this.io = io;
    this.connectedDevices = new Map(); // socketId -> deviceInfo
  }

  // Register a device connection
  registerDevice(socketId, deviceInfo) {
    this.connectedDevices.set(socketId, {
      ...deviceInfo,
      socketId,
      connectedAt: new Date()
    });
    console.log(`[SYNC] Device connected: ${deviceInfo.name} (${socketId})`);
    this.broadcastDeviceList();
  }

  // Remove a device on disconnect
  removeDevice(socketId) {
    const device = this.connectedDevices.get(socketId);
    if (device) {
      console.log(`[SYNC] Device disconnected: ${device.name} (${socketId})`);
      this.connectedDevices.delete(socketId);
      this.broadcastDeviceList();
    }
  }

  // Push all planned tasks to a specific device (server knows tasks)
  async pushTasksToDevice(socketId) {
    try {
      const tasks = await Task.find({ userId: 'default' }).sort({ column: 1, order: 1 });
      this.io.to(socketId).emit('sync:tasks', tasks);
      console.log(`[SYNC] Pushed ${tasks.length} tasks to ${socketId}`);
    } catch (err) {
      console.error('[SYNC] Error pushing tasks:', err);
    }
  }

  // Push all events to a specific device
  async pushEventsToDevice(socketId) {
    try {
      const events = await Event.find({ userId: 'default' }).sort({ date: 1, time: 1 });
      this.io.to(socketId).emit('sync:events', events);
      console.log(`[SYNC] Pushed ${events.length} events to ${socketId}`);
    } catch (err) {
      console.error('[SYNC] Error pushing events:', err);
    }
  }

  // Push full state to a device (on initial connection)
  async pushFullState(socketId) {
    await this.pushTasksToDevice(socketId);
    await this.pushEventsToDevice(socketId);
    this.io.to(socketId).emit('sync:complete', {
      timestamp: new Date(),
      deviceCount: this.connectedDevices.size
    });
  }

  // Broadcast updated task to all connected devices
  broadcastTaskUpdate(task) {
    this.io.emit('task:updated', task);
    console.log(`[SYNC] Broadcast task update: ${task._id} to ${this.connectedDevices.size} devices`);
  }

  // Broadcast updated event to all connected devices
  broadcastEventUpdate(event) {
    this.io.emit('event:updated', event);
  }

  // Broadcast current device list
  broadcastDeviceList() {
    const devices = Array.from(this.connectedDevices.values()).map(d => ({
      name: d.name,
      type: d.type,
      signalStrength: d.signalStrength,
      connectionType: d.connectionType,
      connectedAt: d.connectedAt
    }));
    this.io.emit('devices:list', devices);
  }

  // Get overdue tasks with alarms (for notification push)
  async getOverdueAlarms() {
    try {
      const now = new Date();
      const tasks = await Task.find({
        userId: 'default',
        alarm: true,
        column: { $lt: 3 } // not done
      });
      return tasks.filter(t => {
        const dueStr = t.due.toLowerCase();
        return dueStr === 'today' || dueStr === 'overdue';
      });
    } catch (err) {
      console.error('[SYNC] Error getting overdue alarms:', err);
      return [];
    }
  }

  // Push alarm notifications to all devices
  async pushAlarmNotifications() {
    const overdue = await this.getOverdueAlarms();
    if (overdue.length > 0) {
      this.io.emit('alarms:overdue', overdue);
      console.log(`[SYNC] Pushed ${overdue.length} overdue alarms to all devices`);
    }
  }

  // Get connected device count
  getDeviceCount() {
    return this.connectedDevices.size;
  }
}

module.exports = SyncService;
