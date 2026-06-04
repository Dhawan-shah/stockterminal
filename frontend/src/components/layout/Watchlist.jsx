import { useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { fetchBatch } from '../../utils/api';

export default function Watchlist() {
  const { watchlist, quotes, updateQuote, activeSymbol, setActiveSymbol } = useStore();

  useEffect(() => {
    const load = async () => {
      try {
        const results = await fetchBatch(watchlist);
        results.forEach((r) => { if (r.data) updateQuote(r.symbol, r.data); });
      } catch {}
    };
    load();
    const iv = setInterval(load, 15000);
    return () => clearInterval(iv);
  }, [watchlist.join(',')]);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#0f0f0f', borderRight: '1px solid #1e1e1e' }}>

      {/* Header */}
      <div style={{ padding: '8px 10px', borderBottom: '1px solid #1e1e1e', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 9, fontFamily: 'JetBrains Mono', color: '#555', letterSpacing: 2 }}>WATCHLIST</span>
        <span style={{ fontSize: 9, color: '#444' }}>{watchlist.length}</span>
      </div>

      {/* Column headers */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 70px 52px', padding: '4px 8px', borderBottom: '1px solid #1a1a1a' }}>
        {['SYMBOL', 'LTP', 'CHG%'].map((h) => (
          <span key={h} style={{ fontSize: 9, fontFamily: 'JetBrains Mono', color: '#444', letterSpacing: 1, textAlign: h === 'SYMBOL' ? 'left' : 'right' }}>{h}</span>
        ))}
      </div>

      {/* Stocks list */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {watchlist.map((sym) => {
          const q = quotes[sym];
          const isUp = q ? q.changePct >= 0 : null;
          const isActive = sym === activeSymbol;

          return (
            <div
              key={sym}
              onClick={() => setActiveSymbol(sym)}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 70px 52px',
                padding: '6px 8px',
                cursor: 'pointer',
                borderBottom: '1px solid rgba(30,30,30,0.6)',
                background: isActive ? 'rgba(245,166,35,0.08)' : 'transparent',
                borderLeft: isActive ? '2px solid #f5a623' : '2px solid transparent',
                transition: 'background 0.1s',
              }}
            >
              <div>
                <div style={{ fontFamily: 'JetBrains Mono', fontSize: 11, fontWeight: 600, color: isActive ? '#f5a623' : '#e0e0e0' }}>{sym}</div>
                {q?.sector && <div style={{ fontSize: 9, color: '#555', marginTop: 1 }}>{q.sector.slice(0, 14)}</div>}
              </div>
              <div style={{ textAlign: 'right', fontFamily: 'JetBrains Mono', fontSize: 11, fontWeight: 500, color: isUp === null ? '#666' : isUp ? '#00d084' : '#ff4444', alignSelf: 'center' }}>
                {q ? q.ltp?.toFixed(2) : '—'}
              </div>
              <div style={{ textAlign: 'right', fontFamily: 'JetBrains Mono', fontSize: 10, color: isUp === null ? '#555' : isUp ? '#00d084' : '#ff4444', alignSelf: 'center' }}>
                {q ? `${isUp ? '+' : ''}${q.changePct?.toFixed(2)}%` : '—'}
              </div>
            </div>
          );
        })}
      </div>

      {/* Market breadth */}
      <div style={{ padding: '8px 10px', borderTop: '1px solid #1e1e1e' }}>
        <div style={{ fontSize: 9, fontFamily: 'JetBrains Mono', color: '#555', marginBottom: 6, letterSpacing: 1 }}>MARKET BREADTH</div>
        {(() => {
          const total = watchlist.length;
          const up = watchlist.filter((s) => (quotes[s]?.changePct || 0) >= 0).length;
          const down = total - up;
          const upPct = total ? (up / total) * 100 : 50;
          return (
            <>
              <div style={{ display: 'flex', borderRadius: 2, overflow: 'hidden', height: 4, marginBottom: 4 }}>
                <div style={{ width: `${upPct}%`, background: '#00d084' }} />
                <div style={{ flex: 1, background: '#ff4444' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 9, color: '#00d084', fontFamily: 'JetBrains Mono' }}>▲ {up}</span>
                <span style={{ fontSize: 9, color: '#ff4444', fontFamily: 'JetBrains Mono' }}>▼ {down}</span>
              </div>
            </>
          );
        })()}
      </div>
    </div>
  );
}