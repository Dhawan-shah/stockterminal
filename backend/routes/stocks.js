const express = require('express');
const router = express.Router();
const { getQuote, getBatchQuotes, getHistoricalData, getMarketDepth } = require('../services/nseService');
const { addSymbol } = require('../services/priceBroadcaster');

router.get('/:symbol', async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    addSymbol(symbol);
    const quote = await getQuote(symbol);
    res.json({ success: true, data: quote });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.get('/:symbol/history', async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const { from, to } = req.query;
    const candles = await getHistoricalData(symbol, from, to);
    res.json({ success: true, data: candles });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.get('/:symbol/depth', async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const depth = await getMarketDepth(symbol);
    res.json({ success: true, data: depth });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.post('/batch', async (req, res) => {
  try {
    const { symbols } = req.body;
    if (!symbols || !Array.isArray(symbols)) {
      return res.status(400).json({ success: false, error: 'symbols array required' });
    }
    const quotes = await getBatchQuotes(symbols);
    const data = symbols.map((symbol) => ({
      symbol,
      data: quotes.find((q) => q.symbol === symbol) || null,
    }));
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;