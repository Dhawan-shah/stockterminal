import { useState, useEffect, useRef } from 'react';
import { useStore } from '../../store/useStore';
import { searchStocks } from '../../utils/api';

const POPULAR = ['RELIANCE','TCS','HDFCBANK','ICICIBANK','INFY','SBIN','BAJFINANCE','TITAN','ADANIENT','WIPRO'];

export default function SearchModal() {
  const { searchOpen, setSearchOpen, setActiveSymbol, setActiveTab } = useStore();
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (searchOpen) { setQ(''); setResults([]); setSelected(0); setTimeout(() => inputRef.current?.focus(), 60); }
  }, [searchOpen]);

  useEffect(() => {
    if (!q.trim()) { setResults([]); return; }
    const t = setTimeout(() => {
      setLoading(true);
      searchStocks(q).then(r => { setResults(r.slice(0, 8)); setLoading(false); setSelected(0); }).catch(() => setLoading(false));
    }, 280);
    return () => clearTimeout(t);
  }, [q]);

  const select = (sym) => { setActiveSymbol(sym); setActiveTab('chart'); setSearchOpen(false); };

  const onKey = (e) => {
    if (e.key === 'Escape') setSearchOpen(false);
    if (e.key === 'ArrowDown') setSelected(s => Math.min(s + 1, results.length - 1));
    if (e.key === 'ArrowUp') setSelected(s => Math.max(s - 1, 0));
    if (e.key === 'Enter') { if (results[selected]) select(results[selected].symbol); else if (q.length >= 2) select(q); }
  };

  if (!searchOpen) return null;

  return (
    <div onClick={() => setSearchOpen(false)}
      style={{ position: 'fixed', inset: 0, background: 'rgba(3,3,10,0.88)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 100, backdropFilter: 'blur(6px)' }}>

      <div onClick={e => e.stopPropagation()}
        style={{ width: 520, background: '#08081a', border: '1px solid #1a1a36', borderRadius: 12, overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,0.9), 0 0 0 1px rgba(91,106,240,0.1)', animation: 'slideUp 0.18s ease' }}>

        {/* Input */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #0e0e22', gap: 10 }}>
          <span style={{ color: '#3a3a6a', fontSize: 18 }}>⌕</span>
          <input ref={inputRef} value={q} onChange={e => setQ(e.target.value.toUpperCase())} onKeyDown={onKey}
            placeholder="Search NSE / BSE symbol..."
            style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#e2e2f0', fontFamily: 'JetBrains Mono', fontSize: 14, letterSpacing: '0.04em' }} />
          {loading && <div style={{ width: 14, height: 14, border: '2px solid #1a1a36', borderTop: '2px solid #5b6af0', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />}
          <div onClick={() => setSearchOpen(false)} style={{ color: '#2a2a4a', cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: '0 4px' }}>×</div>
        </div>

        {/* Popular */}
        {!q && (
          <div style={{ padding: '12px 16px' }}>
            <div style={{ fontSize: 9, color: '#1e1e38', fontFamily: 'JetBrains Mono', letterSpacing: '0.1em', marginBottom: 10 }}>POPULAR STOCKS</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
              {POPULAR.map(s => (
                <div key={s} onClick={() => select(s)}
                  style={{ padding: '7px 0', background: '#0d0d20', border: '1px solid #0e0e22', borderRadius: 6, cursor: 'pointer', fontFamily: 'JetBrains Mono', fontSize: 10, color: '#5050a0', textAlign: 'center', transition: 'all 0.12s', fontWeight: 600 }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#5b6af0'; e.currentTarget.style.color = '#818cf8'; e.currentTarget.style.background = 'rgba(91,106,240,0.08)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#0e0e22'; e.currentTarget.style.color = '#5050a0'; e.currentTarget.style.background = '#0d0d20'; }}>
                  {s}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        {results.length > 0 && results.map((r, i) => (
          <div key={r.symbol} onClick={() => select(r.symbol)}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 16px', borderBottom: '1px solid #0a0a16', cursor: 'pointer', background: i === selected ? 'rgba(91,106,240,0.08)' : 'transparent', transition: 'background 0.1s', borderLeft: i === selected ? '2px solid #5b6af0' : '2px solid transparent' }}
            onMouseEnter={e => { setSelected(i); }}
          >
            <div>
              <div style={{ fontFamily: 'JetBrains Mono', fontSize: 13, fontWeight: 700, color: i === selected ? '#818cf8' : '#f5a623', letterSpacing: '0.04em' }}>{r.symbol}</div>
              <div style={{ fontSize: 10, color: '#2a2a4a', fontFamily: 'JetBrains Mono', marginTop: 3 }}>{r.name}</div>
            </div>
            <span style={{ fontSize: 9, padding: '2px 8px', background: '#0d0d1e', borderRadius: 3, color: '#2a2a4a', fontFamily: 'JetBrains Mono', border: '1px solid #1a1a30' }}>{r.exchange || 'NSE'}</span>
          </div>
        ))}

        {/* Hints */}
        <div style={{ padding: '7px 16px', borderTop: '1px solid #0a0a14', display: 'flex', gap: 16 }}>
          {[['↵', 'Select'], ['ESC', 'Close'], ['↑↓', 'Navigate']].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
              <span style={{ fontSize: 9, padding: '1px 5px', background: '#0d0d1e', borderRadius: 3, color: '#2a2a4a', fontFamily: 'JetBrains Mono', border: '1px solid #1a1a30' }}>{k}</span>
              <span style={{ fontSize: 9, color: '#1a1a34', fontFamily: 'JetBrains Mono' }}>{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}