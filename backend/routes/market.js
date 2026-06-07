const express = require('express');
const router = express.Router();
const { getGainersLosers } = require('../services/nseService');
const YahooFinance = require('yahoo-finance2');
const yahooFinance = new YahooFinance.default();
const NodeCache = require('node-cache');

const newsCache = new NodeCache({ stdTTL: 300 });

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

// Live news for a stock
router.get('/news/:symbol', async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const cacheKey = `news_${symbol}`;
    const cached = newsCache.get(cacheKey);
    if (cached) return res.json({ success: true, data: cached });

    const suffixes = ['.NS', '.BO'];
    let news = [];

    for (const suffix of suffixes) {
      try {
        const result = await yahooFinance.search(symbol, {
          newsCount: 15,
          quotesCount: 0,
        }, { validateResult: false });
        if (result?.news?.length) {
          news = result.news;
          break;
        }
      } catch { continue; }
    }

    // Also fetch general India market news
    let indiaNews = [];
    try {
      const indiaResult = await yahooFinance.search('India stock market Nifty Sensex', {
        newsCount: 8,
        quotesCount: 0,
      }, { validateResult: false });
      indiaNews = indiaResult?.news || [];
    } catch {}

    const formatted = [
      ...news.map((n) => ({
        title: n.title,
        publisher: n.publisher,
        link: n.link,
        publishedAt: new Date(n.providerPublishTime * 1000).toISOString(),
        type: 'stock',
        thumbnail: n.thumbnail?.resolutions?.[0]?.url || null,
      })),
      ...indiaNews.map((n) => ({
        title: n.title,
        publisher: n.publisher,
        link: n.link,
        publishedAt: new Date(n.providerPublishTime * 1000).toISOString(),
        type: 'market',
        thumbnail: n.thumbnail?.resolutions?.[0]?.url || null,
      })),
    ].sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

    newsCache.set(cacheKey, formatted, 300);
    res.json({ success: true, data: formatted });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Global macro news
router.get('/macro', async (req, res) => {
  try {
    const cacheKey = 'macro_news';
    const cached = newsCache.get(cacheKey);
    if (cached) return res.json({ success: true, data: cached });

    const queries = [
      'India economy RBI GDP',
      'US Federal Reserve interest rates',
      'China economy trade',
      'crude oil prices OPEC',
      'India stock market FII',
    ];

    const results = await Promise.allSettled(
      queries.map((q) =>
        yahooFinance.search(q, { newsCount: 4, quotesCount: 0 }, { validateResult: false })
      )
    );

    const allNews = results
      .filter((r) => r.status === 'fulfilled')
      .flatMap((r) => r.value?.news || [])
      .map((n) => ({
        title: n.title,
        publisher: n.publisher,
        link: n.link,
        publishedAt: new Date(n.providerPublishTime * 1000).toISOString(),
        type: 'macro',
      }))
      .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
      .slice(0, 20);

    newsCache.set(cacheKey, allNews, 300);
    res.json({ success: true, data: allNews });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;