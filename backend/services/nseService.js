const YahooFinance = require('yahoo-finance2');
const yahooFinance = new YahooFinance.default();
const NodeCache = require('node-cache');

// Aggressive caching - live prices: 20s, fundamentals: 10min, indices: 30s
const liveCache = new NodeCache({ stdTTL: 20 });
const fundCache = new NodeCache({ stdTTL: 600 });
const histCache = new NodeCache({ stdTTL: 300 });
const staticCache = new NodeCache({ stdTTL: 3600 });

// Fast quote - tries NS first with tight timeout, falls back to BO
async function getQuote(symbol) {
  const cacheKey = 'q_' + symbol;
  const cached = liveCache.get(cacheKey);
  if (cached) return cached;

  const suffixes = ['.NS', '.BO'];
  for (const suffix of suffixes) {
    try {
      // Fast path: just quote() - no quoteSummary for speed
      const q = await Promise.race([
        yahooFinance.quote(symbol + suffix, {}, { validateResult: false }),
        new Promise((_, r) => setTimeout(() => r(new Error('timeout')), 3000)),
      ]);
      if (!q || !q.regularMarketPrice) continue;

      const result = {
        symbol,
        name: q.longName || q.shortName || symbol,
        exchange: suffix === '.NS' ? 'NSE' : 'BSE',
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
        pb: null,
        eps: q.trailingEps || null,
        beta: q.beta || 1,
        div: q.dividendYield || null,
        sector: q.sector || '',
        timestamp: Date.now(),
      };

      // Async background enrichment - doesn't block quote response
      enrichQuoteBackground(symbol, suffix, result);

      liveCache.set(cacheKey, result, 20);
      return result;
    } catch { continue; }
  }
  throw new Error('No data for ' + symbol);
}

// Runs in background after fast quote returns - enriches cache with fundamentals
async function enrichQuoteBackground(symbol, suffix, baseResult) {
  const enrichKey = 'enrich_' + symbol;
  if (liveCache.get(enrichKey)) return; // already enriched recently
  liveCache.set(enrichKey, true, 300);

  try {
    const summary = await Promise.race([
      yahooFinance.quoteSummary(symbol + suffix, {
        modules: ['financialData', 'defaultKeyStatistics', 'summaryDetail'],
      }, { validateResult: false }),
      new Promise((_, r) => setTimeout(() => r(new Error('timeout')), 6000)),
    ]);

    const fin = summary?.financialData;
    const stats = summary?.defaultKeyStatistics;
    const detail = summary?.summaryDetail;

    const enriched = Object.assign({}, baseResult, {
      pe: (detail && detail.trailingPE) || baseResult.pe,
      pb: (stats && stats.priceToBook) || null,
      roe: (fin && fin.returnOnEquity) ? fin.returnOnEquity * 100 : null,
      debt: (fin && fin.debtToEquity) ? fin.debtToEquity / 100 : null,
      div: (detail && detail.dividendYield) ? detail.dividendYield * 100 : baseResult.div,
      beta: (stats && stats.beta) || baseResult.beta,
      eps: (stats && stats.trailingEps) || baseResult.eps,
      forwardEps: (stats && stats.forwardEps) || null,
      epsGrowth: (fin && fin.earningsGrowth) ? fin.earningsGrowth * 100 : null,
      revenueGrowth: (fin && fin.revenueGrowth) ? fin.revenueGrowth * 100 : null,
      grossMargin: (fin && fin.grossMargins) ? fin.grossMargins * 100 : null,
      operatingMargin: (fin && fin.operatingMargins) ? fin.operatingMargins * 100 : null,
      currentRatio: (fin && fin.currentRatio) || null,
      targetPrice: (fin && fin.targetMeanPrice) || null,
      recommendation: (fin && fin.recommendationKey) || null,
      enriched: true,
    });

    // Update cache with enriched data
    liveCache.set('q_' + symbol, enriched, 300);
    fundCache.set('fund_' + symbol, enriched, 600);
  } catch { /* background failure is fine */ }
}

// Full quote with fundamentals - used by multibagger engine
async function getQuoteFull(symbol) {
  // Check if we already have enriched data
  const fundCached = fundCache.get('fund_' + symbol);
  if (fundCached) return fundCached;

  const suffixes = ['.NS', '.BO'];
  for (const suffix of suffixes) {
    try {
      const [quoteRes, summaryRes] = await Promise.allSettled([
        yahooFinance.quote(symbol + suffix, {}, { validateResult: false }),
        Promise.race([
          yahooFinance.quoteSummary(symbol + suffix, {
            modules: ['financialData', 'defaultKeyStatistics', 'summaryDetail'],
          }, { validateResult: false }),
          new Promise((_, r) => setTimeout(() => r(new Error('timeout')), 5000)),
        ]),
      ]);

      const q = quoteRes.status === 'fulfilled' ? quoteRes.value : null;
      if (!q || !q.regularMarketPrice) continue;

      const fin = summaryRes.status === 'fulfilled' ? summaryRes.value?.financialData : null;
      const stats = summaryRes.status === 'fulfilled' ? summaryRes.value?.defaultKeyStatistics : null;
      const detail = summaryRes.status === 'fulfilled' ? summaryRes.value?.summaryDetail : null;

      const result = {
        symbol,
        name: q.longName || q.shortName || symbol,
        exchange: suffix === '.NS' ? 'NSE' : 'BSE',
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
        sector: q.sector || '',
        pe: (detail && detail.trailingPE) || q.trailingPE || null,
        pb: (stats && stats.priceToBook) || null,
        roe: (fin && fin.returnOnEquity) ? fin.returnOnEquity * 100 : null,
        debt: (fin && fin.debtToEquity) ? fin.debtToEquity / 100 : null,
        div: (detail && detail.dividendYield) ? detail.dividendYield * 100 : null,
        beta: (stats && stats.beta) || q.beta || 1,
        eps: (stats && stats.trailingEps) || q.trailingEps || null,
        forwardEps: (stats && stats.forwardEps) || null,
        epsGrowth: (fin && fin.earningsGrowth) ? fin.earningsGrowth * 100 : null,
        revenueGrowth: (fin && fin.revenueGrowth) ? fin.revenueGrowth * 100 : null,
        grossMargin: (fin && fin.grossMargins) ? fin.grossMargins * 100 : null,
        operatingMargin: (fin && fin.operatingMargins) ? fin.operatingMargins * 100 : null,
        currentRatio: (fin && fin.currentRatio) || null,
        targetPrice: (fin && fin.targetMeanPrice) || null,
        recommendation: (fin && fin.recommendationKey) || null,
        enriched: true,
        timestamp: Date.now(),
      };

      liveCache.set('q_' + symbol, result, 20);
      fundCache.set('fund_' + symbol, result, 600);
      return result;
    } catch { continue; }
  }
  throw new Error('No data for ' + symbol);
}

async function getBatchQuotes(symbols) {
  const results = await Promise.allSettled(symbols.map((s) => getQuote(s)));
  return results.map((r) => r.status === 'fulfilled' ? r.value : null).filter(Boolean);
}

async function getHistoricalData(symbol, from, to) {
  const cacheKey = 'hist_' + symbol + '_' + from + '_' + to;
  const cached = histCache.get(cacheKey);
  if (cached) return cached;

  const suffixes = ['.NS', '.BO'];
  for (const suffix of suffixes) {
    try {
      const toDate = to ? new Date(to) : new Date();
      const fromDate = from ? new Date(from) : new Date(Date.now() - 365 * 86400000);
      const data = await yahooFinance.historical(symbol + suffix, { period1: fromDate, period2: toDate, interval: '1d' }, { validateResult: false });
      if (!data || !data.length) continue;
      const candles = data.map((d) => ({
        time: d.date.toISOString().split('T')[0],
        open: d.open, high: d.high, low: d.low, close: d.close, volume: d.volume,
      }));
      histCache.set(cacheKey, candles);
      return candles;
    } catch { continue; }
  }
  throw new Error('Historical data failed for ' + symbol);
}

async function getIndices() {
  const cacheKey = 'indices_all';
  const cached = liveCache.get(cacheKey);
  if (cached) return cached;

  const indexSymbols = [
    { yahoo: '^NSEI', name: 'NIFTY 50' },
    { yahoo: '^NSEBANK', name: 'NIFTY BANK' },
    { yahoo: '^CNXIT', name: 'NIFTY IT' },
    { yahoo: '^BSESN', name: 'SENSEX' },
    { yahoo: '^CNXAUTO', name: 'NIFTY AUTO' },
    { yahoo: '^CNXFMCG', name: 'NIFTY FMCG' },
    { yahoo: '^CNXPHARMA', name: 'NIFTY PHARMA' },
    { yahoo: '^NSMIDCP100', name: 'NIFTY MIDCAP 100' },
  ];

  const results = await Promise.allSettled(
    indexSymbols.map((idx) =>
      Promise.race([
        yahooFinance.quote(idx.yahoo, {}, { validateResult: false }),
        new Promise((_, r) => setTimeout(() => r(new Error('timeout')), 4000)),
      ])
    )
  );

  const data = results.map((r, i) => {
    if (r.status === 'rejected') return null;
    const q = r.value;
    if (!q || !q.regularMarketPrice) return null;
    return {
      name: indexSymbols[i].name,
      last: q.regularMarketPrice || 0,
      change: q.regularMarketChange || 0,
      changePct: q.regularMarketChangePercent || 0,
      open: q.regularMarketOpen || 0,
      high: q.regularMarketDayHigh || 0,
      low: q.regularMarketDayLow || 0,
      previousClose: q.regularMarketPreviousClose || 0,
    };
  }).filter(Boolean);

  liveCache.set(cacheKey, data, 30);
  return data;
}

async function getGainersLosers(type) {
  const cacheKey = 'gl_' + type;
  const cached = liveCache.get(cacheKey);
  if (cached) return cached;

  const topStocks = [
    'RELIANCE','TCS','INFY','HDFCBANK','ICICIBANK','WIPRO','SBIN','BAJFINANCE',
    'ADANIENT','HINDUNILVR','KOTAKBANK','AXISBANK','LT','ASIANPAINT','MARUTI',
    'TITAN','BHARTIARTL','NESTLEIND','ULTRACEMCO','POWERGRID',
  ];

  const results = await Promise.allSettled(topStocks.map((s) => getQuote(s)));
  const quotes = results
    .map((r, i) => r.status === 'fulfilled' && r.value ? { symbol: topStocks[i], ltp: r.value.ltp, lastPrice: r.value.ltp, changePct: r.value.changePct, pChange: r.value.changePct } : null)
    .filter(Boolean)
    .sort((a, b) => type === 'gainers' ? b.changePct - a.changePct : a.changePct - b.changePct)
    .slice(0, 10);

  liveCache.set(cacheKey, quotes, 60);
  return quotes;
}

async function searchSymbols(query) {
  const cacheKey = 'search_' + query;
  const cached = staticCache.get(cacheKey);
  if (cached) return cached;
  try {
    const data = await yahooFinance.search(query, {}, { validateResult: false });
    const results = (data.quotes || [])
      .filter((s) => s.exchange === 'NSI' || s.exchange === 'BSE' || s.exchange === 'NSE')
      .map((s) => ({
        symbol: s.symbol.replace('.NS', '').replace('.BO', ''),
        name: s.longname || s.shortname || s.symbol,
        exchange: s.exchange === 'NSI' ? 'NSE' : 'BSE',
      }));
    staticCache.set(cacheKey, results, 600);
    return results;
  } catch { return []; }
}

module.exports = { getQuote, getQuoteFull, getBatchQuotes, getHistoricalData, getMarketDepth: () => null, getIndices, getGainersLosers, searchSymbols };