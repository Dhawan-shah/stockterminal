const { getQuote, getIndices, getGainersLosers } = require('./nseService');

// Default watchlist symbols to pre-warm on startup
const WARMUP_SYMBOLS = [
  'RELIANCE','TCS','HDFCBANK','ICICIBANK','INFY','SBIN',
  'WIPRO','BAJFINANCE','ADANIENT','HINDUNILVR','KOTAKBANK',
  'AXISBANK','LT','ASIANPAINT','MARUTI','TITAN','BHARTIARTL',
  'NESTLEIND','ULTRACEMCO','POWERGRID',
];

async function warmCache() {
  console.log('🔥 Pre-warming cache...');
  try {
    // Fire all in parallel, don't wait for all to finish
    const tasks = [
      getIndices().catch(() => {}),
      getGainersLosers('gainers').catch(() => {}),
      getGainersLosers('losers').catch(() => {}),
      ...WARMUP_SYMBOLS.map(s => getQuote(s).catch(() => {})),
    ];
    await Promise.allSettled(tasks);
    console.log('✅ Cache warm — terminal will load instantly');
  } catch (e) {
    console.log('⚠️  Cache warm partial:', e.message);
  }
}

// Run immediately on import, then every 18 seconds to keep cache fresh
warmCache();
setInterval(warmCache, 18000);

module.exports = { warmCache };