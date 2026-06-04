import { useState, useEffect, useRef } from 'react';
import { useStore } from '../../store/useStore';
import { searchStocks } from '../../utils/api';

export default function SearchModal() {
  const { setSearchOpen, setActiveSymbol, addToWatchlist } = useStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(0);
  const inputRef = useRef(null);

  const popular = [
    'RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'ICICIBANK',
    'SBIN', 'WIPRO', 'BHARTIARTL', 'BAJFINANCE', 'KOTAKBANK',
    'AXISBANK', 'LT', 'ASIANPAINT', 'MARUTI', 'TITAN',
    'ADANIENT', 'HINDUNILVR', 'NESTLEIND', 'POWERGRID', 'ULTRACEMCO',
  ];

  useEffect(() => {
    inputRef.current?.focus();
    const handler = (e) => {
      if (e.key === 'Escape') setSearchOpen(false);
      if (e.key === 'ArrowDown') setSelected((s) => Math.min(s + 1, results.length - 1));
      if (e.key === 'ArrowUp') setSelected((s) => Math.max(s - 1, 0));
      if (e.key === 'Enter' && results[selected]) pick(results[selected]);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [results, selected]);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await searchStocks(query);
        setResults(r.slice(0, 12));
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  const pick = (item) => {
    setActiveSymbol(item.symbol);
    addToWatchlist(item.symbol);
    setSearchOpen(false);
  };

  const pickDirect = (sym) => {
    setActiveSymbol(sym);
    addToWatchlist(sym);
    setSearchOpen(false);
  };

  return (
    <div
      onClick={() => setSearchOpen(false)}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 80, backdropFilter: 'blur(4px)' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: 600, background: '#111', border: '1px solid #2a2a2a', borderRadius: 12, overflow: 'hidden', boxShadow: '0 32px 100px rgba(0,0,0,0.9), 0 0 0 1px rgba(245,166,35,0.1)' }}
      >
        {/* Input */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '0 20px', borderBottom: '1px solid #1e1e1e', background: '#141414' }}>
          <span style={{ color: '#444', fontSize: 18, marginRight: 14 }}>⌕</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search any NSE / BSE stock..."
            style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#e8e8e8', fontFamily: 'JetBrains Mono', fontSize: 14, padding: '18px 0' }}
          />
          {loading
            ? <span style={{ fontSize: 11, color: '#f5a623', fontFamily: 'JetBrains Mono' }}>SEARCHING...</span>
            : <span style={{ fontSize: 10, color: '#333', border: '1px solid #2a2a2a', borderRadius: 4, padding: '2px 6px', fontFamily: 'JetBrains Mono' }}>ESC</span>
          }
        </div>

        {/* Results */}
        <div style={{ maxHeight: 440, overflowY: 'auto' }}>
          {results.length > 0 ? (
            <>
              <div style={{ padding: '8px 20px 4px', fontSize: 9, color: '#444', fontFamily: 'JetBrains Mono', letterSpacing: 2 }}>
                RESULTS ({results.length})
              </div>
              {results.map((r, i) => (
                <div
                  key={r.symbol + i}
                  onClick={() => pick(r)}
                  style={{
                    display: 'flex', alignItems: 'center', padding: '10px 20px', cursor: 'pointer',
                    background: selected === i ? 'rgba(245,166,35,0.08)' : 'transparent',
                    borderLeft: selected === i ? '2px solid #f5a623' : '2px solid transparent',
                    borderBottom: '1px solid #1a1a1a',
                    transition: 'all 0.1s',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: 'JetBrains Mono', fontSize: 13, fontWeight: 700, color: '#f5a623' }}>{r.symbol}</div>
                    <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>{r.name}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span style={{ fontSize: 9, color: '#444', border: '1px solid #2a2a2a', borderRadius: 3, padding: '2px 6px', fontFamily: 'JetBrains Mono' }}>{r.exchange}</span>
                    <span style={{ fontSize: 9, color: '#333', border: '1px solid #222', borderRadius: 3, padding: '2px 6px', fontFamily: 'JetBrains Mono' }}>{r.type}</span>
                  </div>
                </div>
              ))}
            </>
          ) : !query ? (
            <div style={{ padding: '16px 20px' }}>
              <div style={{ fontSize: 9, color: '#444', fontFamily: 'JetBrains Mono', marginBottom: 12, letterSpacing: 2 }}>POPULAR STOCKS</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {popular.map((sym) => (
                  <button
                    key={sym}
                    onClick={() => pickDirect(sym)}
                    onMouseEnter={(e) => { e.target.style.background = '#222'; e.target.style.color = '#f5a623'; e.target.style.borderColor = '#f5a623'; }}
                    onMouseLeave={(e) => { e.target.style.background = '#1a1a1a'; e.target.style.color = '#ccc'; e.target.style.borderColor = '#252525'; }}
                    style={{ background: '#1a1a1a', border: '1px solid #252525', borderRadius: 6, padding: '5px 12px', cursor: 'pointer', color: '#ccc', fontFamily: 'JetBrains Mono', fontSize: 11 }}
                  >
                    {sym}
                  </button>
                ))}
              </div>
              <div style={{ marginTop: 16, padding: '10px', background: '#0d0d0d', borderRadius: 6, border: '1px solid #1a1a1a' }}>
                <div style={{ fontSize: 9, color: '#444', fontFamily: 'JetBrains Mono', marginBottom: 4, letterSpacing: 1 }}>TIP</div>
                <div style={{ fontSize: 10, color: '#444', fontFamily: 'JetBrains Mono' }}>Type any company name or NSE/BSE symbol. Works for all listed stocks.</div>
              </div>
            </div>
          ) : (
            <div style={{ padding: 30, color: '#444', fontSize: 12, textAlign: 'center', fontFamily: 'JetBrains Mono' }}>
              No results for "{query}"
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '8px 20px', borderTop: '1px solid #1a1a1a', background: '#0d0d0d', display: 'flex', gap: 16 }}>
          <span style={{ fontSize: 9, color: '#333', fontFamily: 'JetBrains Mono' }}>↑↓ NAVIGATE</span>
          <span style={{ fontSize: 9, color: '#333', fontFamily: 'JetBrains Mono' }}>ENTER SELECT</span>
          <span style={{ fontSize: 9, color: '#333', fontFamily: 'JetBrains Mono' }}>ESC CLOSE</span>
        </div>
      </div>
    </div>
  );
}