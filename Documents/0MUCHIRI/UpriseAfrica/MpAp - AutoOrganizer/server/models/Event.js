const mongoose = require('mongoose');

const EventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  time: { type: String, required: true },
  date: { type: Date },
  duration: { type: String, default: '' },
  source: {
    type: String,
    enum: ['google', 'outlook', 'ical', 'manual'],
    default: 'manual'
  },
  color: { type: String, default: '#7c3aed' },
  detail: { type: String, default: '' },
  userId: { type: String, default: 'default' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

EventSchema.pre('save', function () {
  this.updatedAt = Date.now();
});

module.exports = mongoose.model('Event', EventSchema);
