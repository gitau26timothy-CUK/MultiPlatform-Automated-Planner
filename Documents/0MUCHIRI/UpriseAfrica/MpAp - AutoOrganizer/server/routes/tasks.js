const express = require('express');
const router = express.Router();
const Task = require('../models/Task');

// GET all tasks
router.get('/', async (req, res) => {
  try {
    const tasks = await Task.find({ userId: 'default' }).sort({ column: 1, order: 1 });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create task
router.post('/', async (req, res) => {
  try {
    const task = new Task(req.body);
    await task.save();
    req.io.emit('task:created', task);
    res.status(201).json(task);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT update task
router.put('/:id', async (req, res) => {
  try {
    const task = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!task) return res.status(404).json({ error: 'Task not found' });
    req.io.emit('task:updated', task);
    res.json(task);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE task
router.delete('/:id', async (req, res) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    req.io.emit('task:deleted', { id: task._id });
    res.json({ message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT toggle alarm
router.put('/:id/alarm', async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    task.alarm = !task.alarm;
    await task.save();
    req.io.emit('task:updated', task);
    res.json(task);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST bulk reorder
router.post('/reorder', async (req, res) => {
  try {
    const { updates } = req.body; // [{ id, column, order }]
    for (const u of updates) {
      await Task.findByIdAndUpdate(u.id, { column: u.column, order: u.order });
    }
    req.io.emit('task:reordered', updates);
    res.json({ message: 'Reordered' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
