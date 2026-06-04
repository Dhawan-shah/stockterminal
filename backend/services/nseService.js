const YahooFinance = require('yahoo-finance2');
const yahooFinance = new YahooFinance.default();
const NodeCache = require('node-cache');

const liveCache = new NodeCache({ stdTTL: 15 });
const fundCache = new NodeCache({ stdTTL: 300 });
const staticCache = new NodeCache({ stdTTL: 3600 });

async function getQuote(symbol) {
  const cacheKey = `quote_${symbol}`;
  const cached = liveCache.get(cacheKey);
  if (cached) return cached;

  const suffixes = ['.NS', '.BO'];

  for (const suffix of suffixes) {
    try {
      const q = await yahooFinance.quote(`${symbol}${suffix}`, {}, { validateResult: false });
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
        totalBuyQty: 0,
        totalSellQty: 0,
        series: 'EQ',
        isin: '',
        sector: q.sector || '',
        timestamp: new Date().toISOString(),
      };

      liveCache.set(cacheKey, result, 15);
      return result;
    } catch (e) {
      continue;
    }
  }

  throw new Error(`No data found for ${symbol} on NSE or BSE`);
}

async function getBatchQuotes(symbols) {
  try {
    const results = await Promise.allSettled(
      symbols.map((s) => getQuote(s))
    );
    return results
      .map((r) => (r.status === 'fulfilled' ? r.value : null))
      .filter(Boolean);
  } catch (e) {
    return [];
  }
}

async function getHistoricalData(symbol, from, to) {
  const cacheKey = `hist_${symbol}_${from}_${to}`;
  const cached = fundCache.get(cacheKey);
  if (cached) return cached;

  const suffixes = ['.NS', '.BO'];

  for (const suffix of suffixes) {
    try {
      const toDate = to ? new Date(to) : new Date();
      const fromDate = from
        ? new Date(from)
        : new Date(Date.now() - 365 * 86400000);

      const data = await yahooFinance.historical(`${symbol}${suffix}`, {
        period1: fromDate,
        period2: toDate,
        interval: '1d',
      }, { validateResult: false });

      if (!data || !data.length) continue;

      const candles = data.map((d) => ({
        time: d.date.toISOString().split('T')[0],
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
        volume: d.volume,
      }));

      fundCache.set(cacheKey, candles, 300);
      return candles;
    } catch (e) {
      continue;
    }
  }

  throw new Error(`Historical data failed for ${symbol}`);
}

async function getMarketDepth(symbol) {
  return null;
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

  try {
    const results = await Promise.allSettled(
      indexSymbols.map((idx) =>
        yahooFinance.quote(idx.yahoo, {}, { validateResult: false })
      )
    );

    const data = results
      .map((r, i) => {
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
          advances: 0,
          declines: 0,
          unchanged: 0,
        };
      })
      .filter(Boolean);

    liveCache.set(cacheKey, data, 30);
    return data;
  } catch (e) {
    throw new Error('Failed to fetch indices: ' + e.message);
  }
}

async function getGainersLosers(type = 'gainers') {
  const cacheKey = `gl_${type}`;
  const cached = liveCache.get(cacheKey);
  if (cached) return cached;

  const topStocks = [
    'RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'ICICIBANK',
    'WIPRO', 'SBIN', 'BAJFINANCE', 'ADANIENT', 'HINDUNILVR',
    'KOTAKBANK', 'AXISBANK', 'LT', 'ASIANPAINT', 'MARUTI',
    'TITAN', 'BHARTIARTL', 'NESTLEIND', 'ULTRACEMCO', 'POWERGRID',
  ];

  try {
    const results = await Promise.allSettled(
      topStocks.map((s) => getQuote(s))
    );

    const quotes = results
      .map((r, i) => {
        if (r.status === 'rejected') return null;
        const q = r.value;
        if (!q) return null;
        return {
          symbol: topStocks[i],
          ltp: q.ltp || 0,
          lastPrice: q.ltp || 0,
          changePct: q.changePct || 0,
          pChange: q.changePct || 0,
        };
      })
      .filter(Boolean)
      .sort((a, b) =>
        type === 'gainers'
          ? b.changePct - a.changePct
          : a.changePct - b.changePct
      )
      .slice(0, 10);

    liveCache.set(cacheKey, quotes, 60);
    return quotes;
  } catch (e) {
    return [];
  }
}

async function searchSymbols(query) {
  const cacheKey = `search_${query}`;
  const cached = staticCache.get(cacheKey);
  if (cached) return cached;

  try {
    const data = await yahooFinance.search(query, {}, { validateResult: false });

    const results = (data.quotes || [])
      .filter((s) => s.exchange === 'NSI' || s.exchange === 'BSE' || s.exchange === 'NSE')
      .map((s) => ({
        symbol: s.symbol.replace('.NS', '').replace('.BO', ''),
        yahooSymbol: s.symbol,
        name: s.longname || s.shortname || s.symbol,
        exchange: s.exchange === 'NSI' ? 'NSE' : 'BSE',
        type: s.quoteType,
      }));

    staticCache.set(cacheKey, results, 600);
    return results;
  } catch (e) {
    return [];
  }
}

module.exports = {
  getQuote,
  getBatchQuotes,
  getHistoricalData,
  getMarketDepth,
  getIndices,
  getGainersLosers,
  searchSymbols,
};