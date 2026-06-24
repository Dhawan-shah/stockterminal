import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL || '/api';

// Two axios instances:
// fast - 6s timeout for price data (should be from cache, near instant)
// slow - 20s timeout for fundamentals, AI, screener
const fast = axios.create({ baseURL: BASE, timeout: 6000 });
const slow = axios.create({ baseURL: BASE, timeout: 20000 });

export const fetchQuote = (symbol) =>
  fast.get('/stocks/' + symbol).then(r => r.data.data);

export const fetchHistory = (symbol, from, to) =>
  slow.get('/stocks/' + symbol + '/history', { params: { from, to } }).then(r => r.data.data);

export const fetchBatch = (symbols) =>
  fast.post('/stocks/batch', { symbols }, { timeout: 8000 }).then(r => r.data.data);

export const fetchFundamentals = (symbol) =>
  slow.get('/fundamentals/' + symbol).then(r => r.data.data);

export const fetchPeers = (symbol) =>
  slow.get('/fundamentals/' + symbol + '/peers').then(r => r.data.data);

export const fetchIndices = () =>
  fast.get('/indices').then(r => r.data.data);

export const fetchGainers = () =>
  fast.get('/market/gainers').then(r => r.data.data);

export const fetchLosers = () =>
  fast.get('/market/losers').then(r => r.data.data);

export const searchStocks = (q) =>
  fast.get('/search', { params: { q } }).then(r => r.data.data);

export const fetchStockNews = (symbol) =>
  slow.get('/market/news/' + symbol).then(r => r.data.data);

export const fetchMacroNews = () =>
  slow.get('/market/macro').then(r => r.data.data);

export const fetchInsider = (symbol) =>
  slow.get('/deep/insider/' + symbol).then(r => r.data.data);

export const fetchFinancials = (symbol) =>
  slow.get('/deep/financials/' + symbol).then(r => r.data.data);

export const fetchProfile = (symbol) =>
  slow.get('/deep/profile/' + symbol).then(r => r.data.data);

export const fetchAIAnalysis = (symbol, quote, fundamentals) =>
  slow.post('/ai/analyze', { symbol, quote, fundamentals }, { timeout: 35000 }).then(r => r.data.data);

export const runMarketScan = () =>
  slow.post('/screener/scan', {}, { timeout: 150000 }).then(r => r.data.data);

export const getAIPicks = (stocks) =>
  slow.post('/screener/ai-picks', { stocks }, { timeout: 40000 }).then(r => r.data.data);

export default fast;