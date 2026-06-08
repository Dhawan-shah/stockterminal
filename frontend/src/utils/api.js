import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: BASE,
  timeout: 20000,
});

export const fetchQuote = (symbol) =>
  api.get('/stocks/' + symbol).then((r) => r.data.data);

export const fetchHistory = (symbol, from, to) =>
  api.get('/stocks/' + symbol + '/history', { params: { from, to } }).then((r) => r.data.data);

export const fetchBatch = (symbols) =>
  api.post('/stocks/batch', { symbols }).then((r) => r.data.data);

export const fetchFundamentals = (symbol) =>
  api.get('/fundamentals/' + symbol).then((r) => r.data.data);

export const fetchPeers = (symbol) =>
  api.get('/fundamentals/' + symbol + '/peers').then((r) => r.data.data);

export const fetchIndices = () =>
  api.get('/indices').then((r) => r.data.data);

export const fetchGainers = () =>
  api.get('/market/gainers').then((r) => r.data.data);

export const fetchLosers = () =>
  api.get('/market/losers').then((r) => r.data.data);

export const searchStocks = (q) =>
  api.get('/search', { params: { q } }).then((r) => r.data.data);

export const fetchStockNews = (symbol) =>
  api.get('/market/news/' + symbol).then((r) => r.data.data);

export const fetchMacroNews = () =>
  api.get('/market/macro').then((r) => r.data.data);

// TITAN MODE - Deep data
export const fetchInsider = (symbol) =>
  api.get('/deep/insider/' + symbol).then((r) => r.data.data);

export const fetchFinancials = (symbol) =>
  api.get('/deep/financials/' + symbol).then((r) => r.data.data);

export const fetchProfile = (symbol) =>
  api.get('/deep/profile/' + symbol).then((r) => r.data.data);

export default api;