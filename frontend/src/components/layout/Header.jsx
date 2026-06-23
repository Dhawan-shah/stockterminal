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
      <div style={{ width: 7, height: 7, borderRadius: '50%', background: open ? '#00d084' : '#ff4444', boxShadow: '0 0 8px ' + (open ? '#00d084' : '#ff4444'), animation: open ? 'hpulse 2s infinite' : 'none' }} />
      <span style={{ fontSize: 10, fontFamily: 'JetBrains Mono', color: open ? '#00d084' : '#ff4444', fontWeight: 600, letterSpacing: 1 }}>{open ? 'MARKET OPEN' : 'MARKET CLOSED'}</span>
    </div>
  );
}

function Clock() {
  const [time, setTime] = useState('');
  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false }) + ' IST');
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: '#555', letterSpacing: 1 }}>{time}</span>;
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
    <div style={{ background: '#080808', borderBottom: '1px solid #111', flexShrink: 0 }}>
      <style>{`@keyframes hpulse{0%,100%{opacity:1}50%{opacity:0.3}}`}</style>

      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '0 16px', height: 44, borderBottom: '1px solid #111' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginRight: 24 }}>
          <div style={{ width: 24, height: 24, background: 'linear-gradient(135deg,#f5a623,#e8960f)', borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 900, color: '#000' }}>▶</span>
          </div>
          <span style={{ fontFamily: 'JetBrains Mono', fontSize: 13, fontWeight: 800, color: '#f5a623', letterSpacing: 3 }}>STOCKTERM</span>
        </div>

        <div style={{ width: 1, height: 20, background: '#1a1a1a', marginRight: 16 }} />
        <MarketStatus />

        <div style={{ marginLeft: 16, display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: wsConnected ? '#00d084' : '#444', animation: wsConnected ? 'hpulse 2s infinite' : 'none' }} />
          <span style={{ fontSize: 9, color: wsConnected ? '#00d084' : '#444', fontFamily: 'JetBrains Mono' }}>LIVE</span>
        </div>

        <div style={{ flex: 1 }} />
        <Clock />

        <button onClick={() => setSearchOpen(true)}
          style={{ marginLeft: 16, display: 'flex', alignItems: 'center', gap: 8, padding: '5px 14px', background: '#111', border: '1px solid #1e1e1e', borderRadius: 5, cursor: 'pointer', color: '#555', fontFamily: 'JetBrains Mono', fontSize: 11, transition: 'all 0.15s' }}
          onMouseEnter={e => { e.currentTarget.style.border = '1px solid #333'; e.currentTarget.style.color = '#888'; }}
          onMouseLeave={e => { e.currentTarget.style.border = '1px solid #1e1e1e'; e.currentTarget.style.color = '#555'; }}>
          <span>⌕</span>
          <span>Search symbol</span>
          <span style={{ fontSize: 9, padding: '1px 5px', background: '#1a1a1a', borderRadius: 3, color: '#333' }}>⌘K</span>
        </button>
      </div>

      {/* Indices strip */}
      <div style={{ height: 40, display: 'flex', alignItems: 'center', padding: '0 16px', gap: 0, overflowX: 'auto', scrollbarWidth: 'none' }}>
        {indices.length === 0 ? (
          Array(6).fill(0).map((_, i) => (
            <div key={i} style={{ width: 140, height: 20, background: '#111', borderRadius: 3, marginRight: 28, animation: 'hpulse 1.5s infinite' }} />
          ))
        ) : (
          indices.map((idx) => (
            <div key={idx.name} style={{ display: 'flex', alignItems: 'center', gap: 8, paddingRight: 28, flexShrink: 0, borderRight: '1px solid #111', marginRight: 28 }}>
              <span style={{ fontSize: 9, color: '#444', fontFamily: 'JetBrains Mono', letterSpacing: 1 }}>{idx.name}</span>
              <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'JetBrains Mono', color: '#e8e8e8' }}>
                {idx.last?.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </span>
              <span style={{ fontSize: 10, fontFamily: 'JetBrains Mono', color: idx.changePct >= 0 ? '#00d084' : '#ff4444' }}>
                {idx.changePct >= 0 ? '▲' : '▼'} {Math.abs(idx.changePct || 0).toFixed(2)}%
              </span>
            </div>
          ))
        )}
      </div>

      <SearchModal />
    </div>
  );
}