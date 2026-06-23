const express = require('express');
const router = express.Router();
const { getQuote, getQuoteFull, getBatchQuotes, getHistoricalData } = require('../services/nseService');

// Fast quote - returns in <1s from cache or quick Yahoo fetch
router.get('/:symbol', async (req, res) => {
  try {
    const data = await getQuote(req.params.symbol.toUpperCase());
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Full quote with fundamentals (for multibagger engine)
router.get('/:symbol/full', async (req, res) => {
  try {
    const data = await getQuoteFull(req.params.symbol.toUpperCase());
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Batch quotes - parallel, returns fast
router.post('/batch', async (req, res) => {
  try {
    const { symbols } = req.body;
    if (!symbols || !symbols.length) return res.json({ success: true, data: [] });
    const data = await getBatchQuotes(symbols.slice(0, 20));
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Historical candles
router.get('/:symbol/history', async (req, res) => {
  try {
    const { from, to } = req.query;
    const data = await getHistoricalData(req.params.symbol.toUpperCase(), from, to);
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;