const express = require('express');
const router = express.Router();
const Device = require('../models/Device');

// GET all devices
router.get('/', async (req, res) => {
  try {
    const devices = await Device.find({ userId: 'default' });
    res.json(devices);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST register device
router.post('/', async (req, res) => {
  try {
    const device = new Device(req.body);
    await device.save();
    req.io.emit('device:registered', device);
    res.status(201).json(device);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT update device status
router.put('/:id', async (req, res) => {
  try {
    const device = await Device.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!device) return res.status(404).json({ error: 'Device not found' });
    req.io.emit('device:updated', device);
    res.json(device);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE device
router.delete('/:id', async (req, res) => {
  try {
    const device = await Device.findByIdAndDelete(req.params.id);
    if (!device) return res.status(404).json({ error: 'Device not found' });
    req.io.emit('device:removed', { id: device._id });
    res.json({ message: 'Device removed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
