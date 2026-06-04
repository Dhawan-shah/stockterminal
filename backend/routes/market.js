const express = require('express');
const router = express.Router();
const { getGainersLosers } = require('../services/nseService');

router.get('/gainers', async (req, res) => {
  try {
    const data = await getGainersLosers('gainers');
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.get('/losers', async (req, res) => {
  try {
    const data = await getGainersLosers('losers');
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;