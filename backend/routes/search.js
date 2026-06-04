const express = require('express');
const router = express.Router();
const { searchSymbols } = require('../services/nseService');

router.get('/', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 1) return res.json({ success: true, data: [] });
    const results = await searchSymbols(q);
    res.json({ success: true, data: results });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;