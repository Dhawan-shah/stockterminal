import { create } from 'zustand';

export const useStore = create((set) => ({
  // Active symbol being viewed
  activeSymbol: 'RELIANCE',
  setActiveSymbol: (sym) => set({ activeSymbol: sym.toUpperCase() }),

  // Live quote data keyed by symbol
  quotes: {},
  updateQuote: (symbol, data) =>
    set((s) => ({ quotes: { ...s.quotes, [symbol]: data } })),

  // Watchlist
  watchlist: ['RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'ICICIBANK', 'WIPRO', 'SBIN', 'BAJFINANCE', 'ADANIENT', 'HINDUNILVR'],
  addToWatchlist: (sym) =>
    set((s) => ({ watchlist: [...new Set([...s.watchlist, sym.toUpperCase()])] })),
  removeFromWatchlist: (sym) =>
    set((s) => ({ watchlist: s.watchlist.filter((s2) => s2 !== sym) })),

  // Indices data
  indices: [],
  setIndices: (indices) => set({ indices }),

  // Gainers/losers
  gainers: [],
  losers: [],
  setGainers: (g) => set({ gainers: g }),
  setLosers: (l) => set({ losers: l }),

  // Fundamentals cache
  fundamentals: {},
  setFundamentals: (sym, data) =>
    set((s) => ({ fundamentals: { ...s.fundamentals, [sym]: data } })),

  // Historical candles cache
  candles: {},
  setCandles: (sym, data) =>
    set((s) => ({ candles: { ...s.candles, [sym]: data } })),

  // Chart settings
  chartInterval: '1Y',
  setChartInterval: (i) => set({ chartInterval: i }),

  // Active tab
  activeTab: 'chart',
  setActiveTab: (t) => set({ activeTab: t }),

  // WebSocket status
  wsConnected: false,
  setWsConnected: (v) => set({ wsConnected: v }),

  // Search
  searchOpen: false,
  setSearchOpen: (v) => set({ searchOpen: v }),
}));