const mongoose = require('mongoose');

const DeviceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: {
    type: String,
    enum: ['laptop', 'phone', 'tablet', 'desktop', 'other'],
    default: 'other'
  },
  signalStrength: { type: Number, default: 4, min: 0, max: 4 },
  connectionType: {
    type: String,
    enum: ['bluetooth', 'wifi', 'both'],
    default: 'both'
  },
  socketId: { type: String, default: null },
  isOnline: { type: Boolean, default: false },
  lastSync: { type: Date, default: null },
  userId: { type: String, default: 'default' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Device', DeviceSchema);
