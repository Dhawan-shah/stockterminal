const YahooFinance = require('yahoo-finance2');
const yahooFinance = new YahooFinance.default();
const NodeCache = require('node-cache');

// Longer TTLs so Render's cold requests always hit cache
const liveCache  = new NodeCache({ stdTTL: 30   });   // prices: 30s
const fundCache  = new NodeCache({ stdTTL: 900  });   // fundamentals: 15min
const histCache  = new NodeCache({ stdTTL: 600  });   // history: 10min
const staticCache= new NodeCache({ stdTTL: 3600 });   // search/static: 1hr

async function getQuote(symbol) {
  const key = 'q_' + symbol;
  const hit = liveCache.get(key);
  if (hit) return hit;

  for (const suffix of ['.NS', '.BO']) {
    try {
      const q = await Promise.race([
        yahooFinance.quote(symbol + suffix, {}, { validateResult: false }),
        new Promise((_, r) => setTimeout(() => r(new Error('t/o')), 4000)),
      ]);
      if (!q || !q.regularMarketPrice) continue;

      const result = {
        symbol, exchange: suffix === '.NS' ? 'NSE' : 'BSE',
        name: q.longName || q.shortName || symbol,
        ltp: q.regularMarketPrice || 0,
        open: q.regularMarketOpen || 0,
        high: q.regularMarketDayHigh || 0,
        low: q.regularMarketDayLow || 0,
        close: q.regularMarketPreviousClose || 0,
        change: q.regularMarketChange || 0,
        changePct: q.regularMarketChangePercent || 0,
        volume: q.regularMarketVolume || 0,
        marketCap: q.marketCap || null,
        weekHigh52: q.fiftyTwoWeekHigh || 0,
        weekLow52: q.fiftyTwoWeekLow || 0,
        pe: q.trailingPE || null,
        eps: q.trailingEps || null,
        beta: q.beta || 1,
        div: q.dividendYield || null,
        sector: q.sector || '',
        timestamp: Date.now(),
      };

      liveCache.set(key, result);
      // Kick off background enrichment without blocking
      enrichBackground(symbol, suffix);
      return result;
    } catch { continue; }
  }
  throw new Error('No data for ' + symbol);
}

async function enrichBackground(symbol, suffix) {
  const enrichKey = 'enriched_' + symbol;
  if (fundCache.get(enrichKey)) return;

  try {
    const summary = await Promise.race([
      yahooFinance.quoteSummary(symbol + suffix, {
        modules: ['financialData', 'defaultKeyStatistics', 'summaryDetail'],
      }, { validateResult: false }),
      new Promise((_, r) => setTimeout(() => r(new Error('t/o')), 7000)),
    ]);

    const fin   = summary?.financialData;
    const stats = summary?.defaultKeyStatistics;
    const det   = summary?.summaryDetail;
    const base  = liveCache.get('q_' + symbol) || {};

    const enriched = Object.assign({}, base, {
      pe: (det?.trailingPE) || base.pe,
      pb: stats?.priceToBook || null,
      roe: fin?.returnOnEquity ? fin.returnOnEquity * 100 : null,
      debt: fin?.debtToEquity ? fin.debtToEquity / 100 : null,
      div: det?.dividendYield ? det.dividendYield * 100 : base.div,
      beta: stats?.beta || base.beta,
      eps: stats?.trailingEps || base.eps,
      forwardEps: stats?.forwardEps || null,
      epsGrowth: fin?.earningsGrowth ? fin.earningsGrowth * 100 : null,
      revenueGrowth: fin?.revenueGrowth ? fin.revenueGrowth * 100 : null,
      grossMargin: fin?.grossMargins ? fin.grossMargins * 100 : null,
      operatingMargin: fin?.operatingMargins ? fin.operatingMargins * 100 : null,
      currentRatio: fin?.currentRatio || null,
      targetPrice: fin?.targetMeanPrice || null,
      recommendation: fin?.recommendationKey || null,
      enriched: true,
    });

    liveCache.set('q_' + symbol, enriched, 600);
    fundCache.set('enriched_' + symbol, enriched, 900);
  } catch {}
}

async function getQuoteFull(symbol) {
  const cached = fundCache.get('enriched_' + symbol);
  if (cached) return cached;
  // Fall back to base quote and trigger enrichment
  const base = await getQuote(symbol);
  return base;
}

async function getBatchQuotes(symbols) {
  const res = await Promise.allSettled(symbols.map(s => getQuote(s)));
  return res.map(r => r.status === 'fulfilled' ? r.value : null).filter(Boolean);
}

async function getHistoricalData(symbol, from, to) {
  const key = 'hist_' + symbol + '_' + (from || '') + '_' + (to || '');
  const hit = histCache.get(key);
  if (hit) return hit;

  for (const suffix of ['.NS', '.BO']) {
    try {
      const toD  = to   ? new Date(to)   : new Date();
      const fromD = from ? new Date(from) : new Date(Date.now() - 365*86400000);
      const data = await yahooFinance.historical(symbol + suffix, { period1: fromD, period2: toD, interval: '1d' }, { validateResult: false });
      if (!data?.length) continue;
      const candles = data.map(d => ({
        time: d.date.toISOString().split('T')[0],
        open: d.open, high: d.high, low: d.low, close: d.close, volume: d.volume,
      }));
      histCache.set(key, candles);
      return candles;
    } catch { continue; }
  }
  throw new Error('Historical data failed for ' + symbol);
}

async function getIndices() {
  const hit = liveCache.get('indices');
  if (hit) return hit;

  const INDICES = [
    { yahoo: '^NSEI',      name: 'NIFTY 50' },
    { yahoo: '^NSEBANK',   name: 'NIFTY BANK' },
    { yahoo: '^CNXIT',     name: 'NIFTY IT' },
    { yahoo: '^BSESN',     name: 'SENSEX' },
    { yahoo: '^CNXAUTO',   name: 'NIFTY AUTO' },
    { yahoo: '^CNXFMCG',   name: 'NIFTY FMCG' },
    { yahoo: '^CNXPHARMA', name: 'NIFTY PHARMA' },
    { yahoo: '^NSMIDCP100',name: 'NIFTY MIDCAP' },
  ];

  const res = await Promise.allSettled(
    INDICES.map(i => Promise.race([
      yahooFinance.quote(i.yahoo, {}, { validateResult: false }),
      new Promise((_, r) => setTimeout(() => r(new Error('t/o')), 5000)),
    ]))
  );

  const data = res.map((r, i) => {
    if (r.status === 'rejected') return null;
    const q = r.value;
    if (!q?.regularMarketPrice) return null;
    return {
      name: INDICES[i].name,
      last: q.regularMarketPrice,
      change: q.regularMarketChange || 0,
      changePct: q.regularMarketChangePercent || 0,
      open: q.regularMarketOpen || 0,
      high: q.regularMarketDayHigh || 0,
      low: q.regularMarketDayLow || 0,
      previousClose: q.regularMarketPreviousClose || 0,
    };
  }).filter(Boolean);

  liveCache.set('indices', data, 30);
  return data;
}

async function getGainersLosers(type) {
  const key = 'gl_' + type;
  const hit = liveCache.get(key);
  if (hit) return hit;

  const TOP = ['RELIANCE','TCS','INFY','HDFCBANK','ICICIBANK','WIPRO','SBIN','BAJFINANCE','ADANIENT','HINDUNILVR','KOTAKBANK','AXISBANK','LT','ASIANPAINT','MARUTI','TITAN','BHARTIARTL','NESTLEIND','ULTRACEMCO','POWERGRID'];
  const res = await Promise.allSettled(TOP.map(s => getQuote(s)));
  const quotes = res.map((r, i) => r.status === 'fulfilled' && r.value ? { symbol: TOP[i], ltp: r.value.ltp, lastPrice: r.value.ltp, changePct: r.value.changePct, pChange: r.value.changePct } : null)
    .filter(Boolean)
    .sort((a, b) => type === 'gainers' ? b.changePct - a.changePct : a.changePct - b.changePct)
    .slice(0, 10);

  liveCache.set(key, quotes, 60);
  return quotes;
}

async function searchSymbols(query) {
  const key = 'search_' + query;
  const hit = staticCache.get(key);
  if (hit) return hit;
  try {
    const data = await yahooFinance.search(query, {}, { validateResult: false });
    const results = (data.quotes || [])
      .filter(s => s.exchange === 'NSI' || s.exchange === 'BSE' || s.exchange === 'NSE')
      .map(s => ({ symbol: s.symbol.replace('.NS','').replace('.BO',''), name: s.longname || s.shortname || s.symbol, exchange: s.exchange === 'NSI' ? 'NSE' : 'BSE' }));
    staticCache.set(key, results, 600);
    return results;
  } catch { return []; }
}

module.exports = { getQuote, getQuoteFull, getBatchQuotes, getHistoricalData, getMarketDepth: () => null, getIndices, getGainersLosers, searchSymbols };