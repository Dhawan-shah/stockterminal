import { useState, useEffect, useRef } from 'react';
import { useStore } from '../../store/useStore';
import { searchStocks } from '../../utils/api';

const POPULAR = ['RELIANCE','TCS','HDFCBANK','ICICIBANK','INFY','SBIN','WIPRO','BAJFINANCE','TITAN','ADANIENT'];

export default function SearchModal() {
  const { searchOpen, setSearchOpen, setActiveSymbol, setActiveTab } = useStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (searchOpen) { setQuery(''); setResults([]); setTimeout(() => inputRef.current?.focus(), 50); }
  }, [searchOpen]);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const t = setTimeout(() => {
      setLoading(true);
      searchStocks(query).then(r => { setResults(r.slice(0, 8)); setLoading(false); }).catch(() => setLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  const select = (sym) => {
    setActiveSymbol(sym);
    setActiveTab('chart');
    setSearchOpen(false);
  };

  if (!searchOpen) return null;

  return (
    <div onClick={() => setSearchOpen(false)}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 120, backdropFilter: 'blur(4px)' }}>
      <div onClick={e => e.stopPropagation()}
        style={{ width: 520, background: '#0d0d0d', border: '1px solid #2a2a2a', borderRadius: 10, overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,0.8)' }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #1a1a1a', gap: 10 }}>
          <span style={{ color: '#555', fontSize: 16 }}>⌕</span>
          <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value.toUpperCase())}
            onKeyDown={e => { if (e.key === 'Escape') setSearchOpen(false); if (e.key === 'Enter' && results.length) select(results[0].symbol); }}
            placeholder="Search NSE/BSE symbol..."
            style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#e8e8e8', fontFamily: 'JetBrains Mono', fontSize: 14 }} />
          {loading && <div style={{ width: 14, height: 14, border: '2px solid #333', borderTop: '2px solid #f5a623', borderRadius: '50%', animation: 'hpulse 1s linear infinite' }} />}
          <span onClick={() => setSearchOpen(false)} style={{ color: '#444', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>×</span>
        </div>

        {!query && (
          <div style={{ padding: '12px 16px' }}>
            <div style={{ fontSize: 9, color: '#444', fontFamily: 'JetBrains Mono', letterSpacing: 1, marginBottom: 10 }}>POPULAR STOCKS</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
              {POPULAR.map(s => (
                <div key={s} onClick={() => select(s)}
                  style={{ padding: '7px 10px', background: '#141414', border: '1px solid #1e1e1e', borderRadius: 5, cursor: 'pointer', fontFamily: 'JetBrains Mono', fontSize: 11, color: '#888', textAlign: 'center', transition: 'all 0.1s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#1a1a1a'; e.currentTarget.style.color = '#f5a623'; e.currentTarget.style.borderColor = '#f5a62333'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#141414'; e.currentTarget.style.color = '#888'; e.currentTarget.style.borderColor = '#1e1e1e'; }}>
                  {s}
                </div>
              ))}
            </div>
          </div>
        )}

        {results.length > 0 && (
          <div>
            {results.map((r, i) => (
              <div key={r.symbol} onClick={() => select(r.symbol)}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 16px', borderBottom: '1px solid #111', cursor: 'pointer', transition: 'background 0.1s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#141414'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <div>
                  <div style={{ fontFamily: 'JetBrains Mono', fontSize: 13, fontWeight: 700, color: '#f5a623' }}>{r.symbol}</div>
                  <div style={{ fontSize: 10, color: '#555', fontFamily: 'JetBrains Mono', marginTop: 2 }}>{r.name}</div>
                </div>
                <span style={{ fontSize: 9, padding: '2px 8px', background: '#1a1a1a', borderRadius: 3, color: '#444', fontFamily: 'JetBrains Mono' }}>{r.exchange || 'NSE'}</span>
              </div>
            ))}
          </div>
        )}

        <div style={{ padding: '8px 16px', borderTop: '1px solid #111', display: 'flex', gap: 16 }}>
          {[['↵', 'Select'], ['ESC', 'Close'], ['↑↓', 'Navigate']].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
              <span style={{ fontSize: 9, padding: '1px 5px', background: '#141414', borderRadius: 3, color: '#555', fontFamily: 'JetBrains Mono' }}>{k}</span>
              <span style={{ fontSize: 9, color: '#333', fontFamily: 'JetBrains Mono' }}>{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}