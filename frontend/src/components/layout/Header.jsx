import { useEffect, useState } from 'react';
import { useStore } from '../../store/useStore';
import { fetchIndices } from '../../utils/api';
import SearchModal from './SearchModal';

export default function Header() {
  const { wsConnected, indices, setIndices, setSearchOpen, searchOpen } = useStore();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    fetchIndices().then(setIndices).catch(() => {});
    const iv = setInterval(() => fetchIndices().then(setIndices).catch(() => {}), 30000);
    const ticker = setInterval(() => setTime(new Date()), 1000);
    return () => { clearInterval(iv); clearInterval(ticker); };
  }, []);

  const keyIndices = indices.filter((i) =>
    ['NIFTY 50', 'NIFTY BANK', 'NIFTY IT', 'NIFTY MIDCAP 100', 'SENSEX'].includes(i.name)
  );

  const isMarketOpen = () => {
    const now = new Date();
    const h = now.getHours(), m = now.getMinutes();
    const mins = h * 60 + m;
    return mins >= 555 && mins <= 930;
  };

  return (
    <>
      <header style={{ background: '#0d0d0d', borderBottom: '1px solid #222', flexShrink: 0 }}>
        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '0 12px', height: 36, borderBottom: '1px solid #1a1a1a' }}>

          {/* Logo */}
          <div style={{ fontFamily: 'JetBrains Mono', fontSize: 13, fontWeight: 600, color: '#f5a623', letterSpacing: 2, marginRight: 24 }}>
            ▸ STOCKTERM
          </div>

          {/* Market status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginRight: 20 }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: isMarketOpen() ? '#00d084' : '#ff4444',
              boxShadow: isMarketOpen() ? '0 0 6px #00d084' : '0 0 6px #ff4444',
            }} />
            <span style={{ fontSize: 10, fontFamily: 'JetBrains Mono', color: '#6b6b6b' }}>
              {isMarketOpen() ? 'MARKET OPEN' : 'MARKET CLOSED'}
            </span>
          </div>

          {/* WS status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginRight: 'auto' }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: wsConnected ? '#00d084' : '#ff4444' }} />
            <span style={{ fontSize: 9, fontFamily: 'JetBrains Mono', color: '#444' }}>
              {wsConnected ? 'LIVE' : 'CONNECTING'}
            </span>
          </div>

          {/* Clock */}
          <div style={{ fontFamily: 'JetBrains Mono', fontSize: 11, color: '#555', marginRight: 16 }}>
            {time.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false })} IST
          </div>

          {/* Search */}
          <button
            onClick={() => setSearchOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 4, padding: '4px 12px', cursor: 'pointer', color: '#6b6b6b', fontFamily: 'JetBrains Mono', fontSize: 11 }}
          >
            <span>⌕</span>
            <span>Search symbol</span>
            <span style={{ marginLeft: 8, fontSize: 9, color: '#444', border: '1px solid #333', borderRadius: 2, padding: '1px 4px' }}>⌘K</span>
          </button>
        </div>

        {/* Indices ticker */}
        <div style={{ display: 'flex', alignItems: 'center', height: 28, overflow: 'hidden' }}>
          <div style={{ display: 'flex', gap: 0 }}>
            {[...keyIndices, ...keyIndices].map((idx, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 20px', borderRight: '1px solid #1a1a1a', flexShrink: 0 }}>
                <span style={{ fontFamily: 'JetBrains Mono', fontSize: 10, color: '#888', whiteSpace: 'nowrap' }}>{idx.name}</span>
                <span style={{ fontFamily: 'JetBrains Mono', fontSize: 11, fontWeight: 600, color: '#e8e8e8' }}>
                  {idx.last?.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </span>
                <span style={{ fontFamily: 'JetBrains Mono', fontSize: 10, color: idx.changePct >= 0 ? '#00d084' : '#ff4444' }}>
                  {idx.changePct >= 0 ? '▲' : '▼'} {Math.abs(idx.changePct)?.toFixed(2)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </header>

      {searchOpen && <SearchModal />}
    </>
  );
}