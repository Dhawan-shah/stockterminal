const express = require('express');
const router = express.Router();
const { getFundamentals, getPeers } = require('../services/fundamentalsService');

router.get('/:symbol', async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const data = await getFundamentals(symbol);
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.get('/:symbol/peers', async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const data = await getPeers(symbol);
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;