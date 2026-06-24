import { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import SearchModal from './SearchModal';
import { fetchIndices } from '../../utils/api';

function MarketStatus() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const check = () => {
      const ist = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
      const h = ist.getHours(), m = ist.getMinutes(), d = ist.getDay();
      setOpen(d > 0 && d < 6 && (h > 9 || (h === 9 && m >= 15)) && (h < 15 || (h === 15 && m <= 30)));
    };
    check();
    const id = setInterval(check, 30000);
    return () => clearInterval(id);
  }, []);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ width: 7, height: 7, borderRadius: '50%', background: open ? '#22d3a5' : '#f43f5e', boxShadow: '0 0 10px ' + (open ? '#22d3a5' : '#f43f5e'), animation: 'pulse 2s infinite' }} />
      <span style={{ fontSize: 9, fontFamily: 'JetBrains Mono', color: open ? '#22d3a5' : '#f43f5e', fontWeight: 700, letterSpacing: '0.1em' }}>
        {open ? 'MARKET OPEN' : 'MARKET CLOSED'}
      </span>
    </div>
  );
}

function Clock() {
  const [time, setTime] = useState('');
  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 10px', background: '#0a0a15', borderRadius: 4, border: '1px solid #0e0e22' }}>
      <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: '#3a3a6a', letterSpacing: '0.05em' }}>{time}</span>
      <span style={{ fontSize: 9, fontFamily: 'JetBrains Mono', color: '#2a2a4a' }}>IST</span>
    </div>
  );
}

export default function Header() {
  const { setSearchOpen, wsConnected } = useStore();
  const [indices, setIndices] = useState([]);

  useEffect(() => {
    fetchIndices().then(setIndices).catch(() => {});
    const id = setInterval(() => fetchIndices().then(setIndices).catch(() => {}), 30000);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{ background: '#030307', borderBottom: '1px solid #0e0e18', flexShrink: 0 }}>

      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '0 14px', height: 46, borderBottom: '1px solid #0a0a14' }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginRight: 20 }}>
          <div style={{ width: 28, height: 28, background: '#f5a623', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 12px rgba(245,166,35,0.4)' }}>
            <span style={{ fontSize: 14, fontWeight: 900, color: '#000' }}>▶</span>
          </div>
          <div>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: 13, fontWeight: 800, color: '#f5a623', letterSpacing: '0.25em', lineHeight: 1 }}>STOCKTERM</div>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: 7, color: '#2a2a4a', letterSpacing: '0.15em', marginTop: 1 }}>INDIA TERMINAL</div>
          </div>
        </div>

        <div style={{ width: 1, height: 22, background: '#0e0e22', marginRight: 16 }} />
        <MarketStatus />
        <div style={{ width: 1, height: 22, background: '#0e0e22', margin: '0 16px' }} />

        {/* WS status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: wsConnected ? '#22d3a5' : '#3a3a5c', animation: wsConnected ? 'pulse 2s infinite' : 'none' }} />
          <span style={{ fontSize: 9, color: wsConnected ? '#22d3a5' : '#3a3a5c', fontFamily: 'JetBrains Mono', letterSpacing: '0.1em' }}>LIVE</span>
        </div>

        <div style={{ flex: 1 }} />

        <Clock />

        {/* Search button */}
        <button onClick={() => setSearchOpen(true)}
          style={{ marginLeft: 12, display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px', background: '#0a0a18', border: '1px solid #1a1a30', borderRadius: 6, cursor: 'pointer', color: '#3a3a6a', fontFamily: 'JetBrains Mono', fontSize: 11, transition: 'all 0.15s' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#f5a623'; e.currentTarget.style.color = '#f5a623'; e.currentTarget.style.boxShadow = '0 0 12px rgba(245,166,35,0.15)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#1a1a30'; e.currentTarget.style.color = '#3a3a6a'; e.currentTarget.style.boxShadow = 'none'; }}>
          <span style={{ fontSize: 13 }}>⌕</span>
          <span>Search symbol</span>
          <span style={{ fontSize: 9, padding: '1px 6px', background: '#0d0d20', borderRadius: 3, color: '#2a2a4a', border: '1px solid #1a1a30' }}>⌘K</span>
        </button>
      </div>

      {/* Indices strip */}
      <div style={{ height: 38, display: 'flex', alignItems: 'center', padding: '0 14px', overflowX: 'auto', scrollbarWidth: 'none', gap: 0 }}>
        {indices.length === 0 ? (
          Array(6).fill(0).map((_, i) => (
            <div key={i} style={{ width: 140, height: 18, background: '#0a0a14', borderRadius: 3, marginRight: 28, animation: 'shimmer 1.5s infinite' }} />
          ))
        ) : (
          indices.map((idx, i) => (
            <div key={idx.name} style={{ display: 'flex', alignItems: 'center', gap: 8, paddingRight: 24, marginRight: 24, borderRight: i < indices.length - 1 ? '1px solid #0e0e18' : 'none', flexShrink: 0 }}>
              <span style={{ fontSize: 9, color: '#2a2a4a', fontFamily: 'JetBrains Mono', letterSpacing: '0.08em' }}>{idx.name}</span>
              <span style={{ fontSize: 12, fontWeight: 600, fontFamily: 'JetBrains Mono', color: '#c8c8e8', letterSpacing: '0.02em' }}>
                {idx.last?.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </span>
              <span style={{ fontSize: 10, fontFamily: 'JetBrains Mono', color: (idx.changePct || 0) >= 0 ? '#22d3a5' : '#f43f5e', fontWeight: 600 }}>
                {(idx.changePct || 0) >= 0 ? '▲' : '▼'} {Math.abs(idx.changePct || 0).toFixed(2)}%
              </span>
            </div>
          ))
        )}
      </div>

      <SearchModal />
    </div>
  );
}