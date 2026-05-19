const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  tag: {
    type: String,
    enum: ['assignment', 'deadline', 'project', 'event', 'crypto'],
    default: 'project'
  },
  priority: {
    type: String,
    enum: ['high', 'mid', 'low', 'crypto'],
    default: 'mid'
  },
  due: { type: String, default: 'TBD' },
  progress: { type: Number, default: 0, min: 0, max: 100 },
  column: { type: Number, default: 0, min: 0, max: 3 },
  avatars: [{ type: String }],
  alarm: { type: Boolean, default: false },
  order: { type: Number, default: 0 },
  userId: { type: String, default: 'default' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

TaskSchema.pre('save', function () {
  this.updatedAt = Date.now();
});

module.exports = mongoose.model('Task', TaskSchema);
