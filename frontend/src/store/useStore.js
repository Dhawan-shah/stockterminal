import { create } from 'zustand';

export const useStore = create((set, get) => ({
  activeSymbol: 'RELIANCE',
  activeTab: 'chart',
  searchOpen: false,
  wsConnected: false,

  watchlist: [
    'RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'ICICIBANK',
    'WIPRO', 'SBIN', 'BAJFINANCE', 'ADANIENT', 'HINDUNILVR',
  ],

  quotes: {},
  indices: [],
  fundamentals: {},
  candles: {},

  setActiveSymbol: (sym) => set({ activeSymbol: sym }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setSearchOpen: (v) => set({ searchOpen: v }),
  setWsConnected: (v) => set({ wsConnected: v }),
  setIndices: (indices) => set({ indices }),

  // Supports both:
  // setQuotes({ RELIANCE: {...}, TCS: {...} })  — full replace / bulk set
  // setQuotes(prev => ({ ...prev, RELIANCE: {...} }))  — functional merge
  setQuotes: (quotesOrFn) => set((state) => ({
    quotes: typeof quotesOrFn === 'function'
      ? quotesOrFn(state.quotes)
      : { ...state.quotes, ...quotesOrFn },
  })),

  updateQuote: (symbol, data) => set((state) => ({
    quotes: { ...state.quotes, [symbol]: { ...(state.quotes[symbol] || {}), ...data } },
  })),

  setFundamentals: (sym, data) => set((state) => ({
    fundamentals: { ...state.fundamentals, [sym]: data },
  })),

  setCandles: (sym, data) => set((state) => ({
    candles: { ...state.candles, [sym]: data },
  })),

  addToWatchlist: (sym) => set((state) => ({
    watchlist: state.watchlist.includes(sym) ? state.watchlist : [...state.watchlist, sym],
  })),

  removeFromWatchlist: (sym) => set((state) => ({
    watchlist: state.watchlist.filter(s => s !== sym),
  })),
}));