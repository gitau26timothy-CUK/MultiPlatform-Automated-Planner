const express = require('express');
const router = express.Router();
const aiService = require('../services/AIService');

// POST execute AI command
router.post('/', async (req, res) => {
  try {
    const { command } = req.body;
    if (!command) return res.status(400).json({ error: 'Command is required' });

    const result = await aiService.execute(command);
    if (result.success) {
      req.io.emit('ai:result', result);
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
