const express = require('express');
const router = express.Router();
const YahooFinance = require('yahoo-finance2');
const yahooFinance = new YahooFinance.default();
const { getGainersLosers } = require('../services/nseService');
const NodeCache = require('node-cache');

const newsCache = new NodeCache({ stdTTL: 300 });

function categorizeNews(title) {
  const t = (title || '').toLowerCase();
  if (t.match(/dividend|bonus|split|buyback/)) return 'corporate_action';
  if (t.match(/result|earning|profit|revenue|quarter|q[1-4]|ebitda/)) return 'earnings';
  if (t.match(/order|contract|deal|win|award|tender|bagged/)) return 'order_win';
  if (t.match(/expand|invest|capex|plant|factory|capacity|launch/)) return 'expansion';
  if (t.match(/acqui|merger|takeover|stake|buyout/)) return 'ma';
  if (t.match(/board|director|ceo|cfo|management|appoint|resign/)) return 'management';
  if (t.match(/rbi|repo|rate|monetary|credit policy/)) return 'rbi_policy';
  if (t.match(/budget|fiscal|government|ministry|scheme|pli|subsidy/)) return 'govt_policy';
  if (t.match(/fii|dii|foreign|institutional|flow/)) return 'flows';
  if (t.match(/oil|crude|opec|commodity/)) return 'commodity';
  if (t.match(/china|us |america|fed |global|world/)) return 'global';
  if (t.match(/outlook|forecast|target|guidance|future/)) return 'outlook';
  if (t.match(/upgrade|downgrade|analyst|rating/)) return 'analyst';
  return 'general';
}

function getSentiment(title) {
  const t = (title || '').toLowerCase();
  const pos = ['surge','rise','gain','rally','growth','profit','beat','record','buy','upgrade','strong','boost','wins','soar','jump','expand','invest','order','approved','dividend','bonus','positive','bullish'];
  const neg = ['fall','drop','loss','decline','miss','cut','warn','risk','sell','downgrade','weak','crash','slump','crisis','fraud','penalty','fine','ban','reject','delay','resign','negative','bearish'];
  const ps = pos.filter(w => t.includes(w)).length;
  const ns = neg.filter(w => t.includes(w)).length;
  if (ps > ns) return { label: 'Bullish', score: +(ps * 0.15).toFixed(2) };
  if (ns > ps) return { label: 'Bearish', score: -(ns * 0.15).toFixed(2) };
  return { label: 'Neutral', score: 0 };
}

function formatArticle(n) {
  const sentiment = getSentiment(n.title);
  return {
    title: n.title,
    publisher: n.publisher,
    link: n.link,
    publishedAt: new Date((n.providerPublishTime || 0) * 1000).toISOString(),
    type: categorizeNews(n.title),
    sentiment: sentiment.label,
    sentimentScore: sentiment.score,
    summary: n.summary || '',
    banner: n.thumbnail?.resolutions?.[0]?.url || null,
    topics: [],
    tickers: [],
  };
}

// Deep stock-specific news — 8 parallel targeted queries on Yahoo Finance
router.get('/news/:symbol', async (req, res) => {
  try {
    const sym = req.params.symbol.toUpperCase();
    const cacheKey = 'ynews_' + sym;
    const cached = newsCache.get(cacheKey);
    if (cached) return res.json({ success: true, data: cached, fromCache: true });

    const queries = [
      sym + ' NSE India stock',
      sym + ' quarterly results earnings profit loss revenue',
      sym + ' dividend bonus split buyback',
      sym + ' expansion investment order win contract',
      sym + ' merger acquisition stake deal',
      sym + ' management CEO board director',
      sym + ' outlook analyst target recommendation',
      sym + ' India stock market news 2025 2026',
    ];

    const results = await Promise.allSettled(
      queries.map(q =>
        Promise.race([
          yahooFinance.search(q, { newsCount: 8, quotesCount: 0 }, { validateResult: false }),
          new Promise((_, r) => setTimeout(() => r(new Error('timeout')), 5000)),
        ])
      )
    );

    const seen = new Set();
    const allNews = results
      .filter(r => r.status === 'fulfilled')
      .flatMap(r => r.value?.news || [])
      .filter(n => {
        if (!n.title || seen.has(n.title)) return false;
        seen.add(n.title);
        return true;
      })
      .map(formatArticle)
      .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

    newsCache.set(cacheKey, allNews, 300);
    res.json({ success: true, data: allNews });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// India + Global macro news — 15 targeted Yahoo Finance queries
router.get('/macro', async (req, res) => {
  try {
    const cacheKey = 'ymacro_india';
    const cached = newsCache.get(cacheKey);
    if (cached) return res.json({ success: true, data: cached, fromCache: true });

    const queries = [
      'India economy GDP growth 2025 2026',
      'RBI Reserve Bank India interest rate repo policy',
      'India stock market Nifty Sensex FII DII flows',
      'India Budget fiscal policy PLI scheme government',
      'India inflation rupee dollar exchange rate',
      'India exports imports trade balance current account',
      'US Federal Reserve rate cut inflation 2025 2026',
      'China economy slowdown India exports impact',
      'crude oil OPEC price India impact energy',
      'India manufacturing PMI industrial output growth',
      'India IT sector exports Infosys TCS Wipro',
      'India pharma sector exports FDA approval',
      'India infrastructure capex railway defence',
      'India FDI foreign investment startup unicorn',
      'global recession risk emerging markets India',
    ];

    const results = await Promise.allSettled(
      queries.map(q =>
        Promise.race([
          yahooFinance.search(q, { newsCount: 5, quotesCount: 0 }, { validateResult: false }),
          new Promise((_, r) => setTimeout(() => r(new Error('timeout')), 5000)),
        ])
      )
    );

    const seen = new Set();
    const allNews = results
      .filter(r => r.status === 'fulfilled')
      .flatMap(r => r.value?.news || [])
      .filter(n => {
        if (!n.title || seen.has(n.title)) return false;
        seen.add(n.title);
        return true;
      })
      .map(formatArticle)
      .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
      .slice(0, 60);

    newsCache.set(cacheKey, allNews, 300);
    res.json({ success: true, data: allNews });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.get('/gainers', async (req, res) => {
  try {
    res.json({ success: true, data: await getGainersLosers('gainers') });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.get('/losers', async (req, res) => {
  try {
    res.json({ success: true, data: await getGainersLosers('losers') });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;