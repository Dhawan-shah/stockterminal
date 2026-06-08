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

router.get('/news/:symbol', async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const cacheKey = 'deepnews_' + symbol;
    const cached = newsCache.get(cacheKey);
    if (cached) return res.json({ success: true, data: cached });

    const queries = [
      symbol,
      symbol + ' dividend bonus split buyback',
      symbol + ' results earnings profit revenue',
      symbol + ' expansion investment capex order',
      symbol + ' acquisition merger deal stake',
      symbol + ' management board director CEO',
      symbol + ' outlook guidance forecast target',
      symbol + ' NSE BSE India stock market',
    ];

    const results = await Promise.allSettled(
      queries.map((q) =>
        yahooFinance.search(q, { newsCount: 8, quotesCount: 0 }, { validateResult: false })
      )
    );

    const seen = new Set();
    const allNews = results
      .filter((r) => r.status === 'fulfilled')
      .flatMap((r) => r.value?.news || [])
      .filter((n) => {
        if (seen.has(n.title)) return false;
        seen.add(n.title);
        return true;
      })
      .map((n) => ({
        title: n.title,
        publisher: n.publisher,
        link: n.link,
        publishedAt: new Date(n.providerPublishTime * 1000).toISOString(),
        type: categorizeNews(n.title),
      }))
      .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

    newsCache.set(cacheKey, allNews, 300);
    res.json({ success: true, data: allNews });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.get('/macro', async (req, res) => {
  try {
    const cacheKey = 'macro_news_deep';
    const cached = newsCache.get(cacheKey);
    if (cached) return res.json({ success: true, data: cached });

    const queries = [
      'India GDP growth economy 2025 2026',
      'RBI Reserve Bank India interest rate policy',
      'India stock market Nifty Sensex FII DII',
      'US Federal Reserve rate cut inflation',
      'China economy trade slowdown',
      'crude oil OPEC price energy',
      'India budget fiscal policy government spending',
      'India infrastructure PLI scheme investment',
      'rupee dollar exchange rate currency',
      'India exports imports trade deficit',
      'global recession risk growth outlook',
      'India corporate earnings results quarter',
      'India manufacturing PMI industrial output',
      'geopolitical risk war conflict supply chain',
      'India foreign investment FDI FPI flows',
    ];

    const results = await Promise.allSettled(
      queries.map((q) =>
        yahooFinance.search(q, { newsCount: 5, quotesCount: 0 }, { validateResult: false })
      )
    );

    const seen = new Set();
    const allNews = results
      .filter((r) => r.status === 'fulfilled')
      .flatMap((r) => r.value?.news || [])
      .filter((n) => {
        if (seen.has(n.title)) return false;
        seen.add(n.title);
        return true;
      })
      .map((n) => ({
        title: n.title,
        publisher: n.publisher,
        link: n.link,
        publishedAt: new Date(n.providerPublishTime * 1000).toISOString(),
        type: categorizeNews(n.title),
      }))
      .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
      .slice(0, 50);

    newsCache.set(cacheKey, allNews, 300);
    res.json({ success: true, data: allNews });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

function categorizeNews(title) {
  const t = title.toLowerCase();
  if (t.match(/dividend|bonus|split|buyback/)) return 'corporate_action';
  if (t.match(/result|earning|profit|revenue|quarter|q[1-4]/)) return 'earnings';
  if (t.match(/order|contract|deal|win|award|tender/)) return 'order_win';
  if (t.match(/expand|invest|capex|plant|factory|capacity/)) return 'expansion';
  if (t.match(/acqui|merger|takeover|stake|buy out/)) return 'ma';
  if (t.match(/board|director|ceo|cfo|management|appoint/)) return 'management';
  if (t.match(/rbi|repo|rate|policy|monetary|credit/)) return 'rbi_policy';
  if (t.match(/budget|fiscal|government|ministry|scheme|pli/)) return 'govt_policy';
  if (t.match(/fii|dii|foreign|institutional|flow/)) return 'flows';
  if (t.match(/oil|crude|energy|fuel|gas/)) return 'commodity';
  if (t.match(/china|us |america|fed |global|world/)) return 'global';
  if (t.match(/outlook|forecast|target|guidance|future|2025|2026/)) return 'outlook';
  if (t.match(/upgrade|downgrade|analyst|rating|buy|sell|hold/)) return 'analyst';
  return 'general';
}

module.exports = router;