import { useStore } from '../../store/useStore';
import { useEffect, useState } from 'react';
import { fetchBatch } from '../../utils/api';

function SkeletonRow() {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 12px', borderBottom: '1px solid #0d0d0d' }}>
      <div style={{ width: 60, height: 10, background: '#1a1a1a', borderRadius: 3, animation: 'skeleton 1.5s infinite' }} />
      <div style={{ width: 50, height: 10, background: '#1a1a1a', borderRadius: 3, animation: 'skeleton 1.5s infinite' }} />
    </div>
  );
}

export default function Watchlist() {
  const { watchlist, quotes, setQuotes, activeSymbol, setActiveSymbol, setActiveTab } = useStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchBatch(watchlist).then((data) => {
      const map = {};
      data.forEach((q) => { if (q) map[q.symbol] = q; });
      setQuotes(map);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [watchlist.join(',')]);

  const up = Object.values(quotes).filter(q => q.changePct >= 0).length;
  const down = Object.values(quotes).filter(q => q.changePct < 0).length;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#080808', borderRight: '1px solid #111' }}>
      <style>{`@keyframes skeleton{0%,100%{opacity:0.4}50%{opacity:1}}`}</style>
      <div style={{ padding: '8px 12px', borderBottom: '1px solid #111', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 9, fontFamily: 'JetBrains Mono', color: '#444', letterSpacing: 1 }}>WATCHLIST</span>
        <span style={{ fontSize: 9, fontFamily: 'JetBrains Mono', color: '#333' }}>{watchlist.length}</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading ? (
          Array(watchlist.length).fill(0).map((_, i) => <SkeletonRow key={i} />)
        ) : (
          watchlist.map((sym) => {
            const q = quotes[sym];
            const isActive = sym === activeSymbol;
            const isUp = q ? q.changePct >= 0 : true;
            return (
              <div key={sym}
                onClick={() => { setActiveSymbol(sym); setActiveTab('chart'); }}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 12px', borderBottom: '1px solid #0d0d0d', cursor: 'pointer', background: isActive ? '#111' : 'transparent', borderLeft: isActive ? '2px solid #f5a623' : '2px solid transparent', transition: 'all 0.1s' }}>
                <div>
                  <div style={{ fontFamily: 'JetBrains Mono', fontSize: 11, fontWeight: isActive ? 700 : 500, color: isActive ? '#f5a623' : '#e8e8e8' }}>{sym}</div>
                  {q && <div style={{ fontSize: 9, color: '#333', fontFamily: 'JetBrains Mono', marginTop: 2 }}>{q.name?.slice(0, 12)}</div>}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'JetBrains Mono', fontSize: 11, fontWeight: 600, color: q ? (isUp ? '#e8e8e8' : '#e8e8e8') : '#333' }}>
                    {q ? q.ltp?.toFixed(2) : '...'}
                  </div>
                  {q && <div style={{ fontSize: 9, fontFamily: 'JetBrains Mono', color: isUp ? '#00d084' : '#ff4444', marginTop: 2 }}>
                    {isUp ? '+' : ''}{q.changePct?.toFixed(2)}%
                  </div>}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Market breadth */}
      <div style={{ padding: '8px 12px', borderTop: '1px solid #111' }}>
        <div style={{ fontSize: 9, color: '#333', fontFamily: 'JetBrains Mono', marginBottom: 5, letterSpacing: 1 }}>MARKET BREADTH</div>
        <div style={{ height: 4, background: '#1a1a1a', borderRadius: 2, overflow: 'hidden', display: 'flex' }}>
          <div style={{ width: (up / Math.max(up + down, 1)) * 100 + '%', background: '#00d084', transition: 'width 1s ease' }} />
          <div style={{ flex: 1, background: '#ff4444' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          <span style={{ fontSize: 9, color: '#00d084', fontFamily: 'JetBrains Mono' }}>▲ {up}</span>
          <span style={{ fontSize: 9, color: '#ff4444', fontFamily: 'JetBrains Mono' }}>▼ {down}</span>
        </div>
      </div>
    </div>
  );
}