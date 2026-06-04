const { getQuote } = require('./nseService');

let broadcastFn = null;
const watchedSymbols = new Set(['RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'ICICIBANK']);

function startPriceBroadcaster(broadcast) {
  broadcastFn = broadcast;

  setInterval(async () => {
    if (!broadcastFn) return;
    const symbols = Array.from(watchedSymbols);
    for (const sym of symbols) {
      try {
        const quote = await getQuote(sym);
        broadcastFn(sym, quote);
      } catch (e) {
        // silent fail - don't crash broadcaster
      }
    }
  }, 5000);

  console.log('📡 Price broadcaster started (5s interval)');
}

function addSymbol(symbol) {
  watchedSymbols.add(symbol);
}

function removeSymbol(symbol) {
  watchedSymbols.delete(symbol);
}

module.exports = { startPriceBroadcaster, addSymbol, removeSymbol };