import { useStore } from '../../store/useStore';
import { useEffect, useState } from 'react';
import { fetchQuote } from '../../utils/api';

function Skeleton() {
  return (
    <div style={{ padding: '10px 12px', borderBottom: '1px solid #080810' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ width: 55, height: 9, background: '#0e0e1e', borderRadius: 2, animation: 'shimmer 1.5s infinite' }} />
        <div style={{ width: 45, height: 9, background: '#0e0e1e', borderRadius: 2, animation: 'shimmer 1.5s infinite' }} />
      </div>
      <div style={{ width: 80, height: 7, background: '#0a0a14', borderRadius: 2, marginTop: 5, animation: 'shimmer 1.5s infinite' }} />
    </div>
  );
}

export default function Watchlist() {
  const { watchlist, quotes, setQuotes, activeSymbol, setActiveSymbol, setActiveTab } = useStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    // Fetch ALL symbols individually in parallel — no batch timeout bottleneck
    const fetchAll = async () => {
      setLoading(true);

      // Fire all requests at once
      const promises = watchlist.map(sym =>
        fetchQuote(sym).then(q => ({ sym, q })).catch(() => ({ sym, q: null }))
      );

      // Process each result as it arrives — update UI immediately per stock
      promises.forEach(p =>
        p.then(({ sym, q }) => {
          if (cancelled || !q) return;
          setQuotes(prev => ({ ...prev, [sym]: q }));
        })
      );

      // Set loading false after first 3 resolve
      await Promise.race([
        promises[0], promises[1], promises[2],
        new Promise(r => setTimeout(r, 1500)),
      ]);
      if (!cancelled) setLoading(false);
    };

    fetchAll();

    // Refresh prices every 15 seconds
    const id = setInterval(fetchAll, 15000);
    return () => { cancelled = true; clearInterval(id); };
  }, [watchlist.join(',')]);

  const all = Object.values(quotes);
  const upCount = all.filter(q => q.changePct >= 0).length;
  const downCount = all.filter(q => q.changePct < 0).length;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#04040b' }}>

      <div style={{ padding: '8px 12px', borderBottom: '1px solid #0a0a14', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 9, fontFamily: 'JetBrains Mono', color: '#2a2a4a', letterSpacing: '0.1em' }}>WATCHLIST</span>
        <span style={{ fontSize: 9, fontFamily: 'JetBrains Mono', color: '#1e1e38', background: '#0a0a18', padding: '1px 6px', borderRadius: 3, border: '1px solid #0e0e22' }}>{watchlist.length}</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {watchlist.map((sym) => {
          const q = quotes[sym];
          const active = sym === activeSymbol;
          const isUp = q ? q.changePct >= 0 : true;
          const chg = q ? Math.abs(q.changePct || 0).toFixed(2) : null;

          // Show skeleton only if this specific stock hasn't loaded yet
          if (!q && loading) return <Skeleton key={sym} />;

          return (
            <div key={sym}
              onClick={() => { setActiveSymbol(sym); setActiveTab('chart'); }}
              style={{ padding: '9px 12px', borderBottom: '1px solid #060610', cursor: 'pointer', background: active ? 'rgba(91,106,240,0.06)' : 'transparent', borderLeft: '2px solid ' + (active ? '#5b6af0' : 'transparent'), transition: 'all 0.12s' }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ fontFamily: 'JetBrains Mono', fontSize: 11, fontWeight: active ? 700 : 500, color: active ? '#818cf8' : '#9090b0', letterSpacing: '0.04em' }}>{sym}</div>
                <div style={{ fontFamily: 'JetBrains Mono', fontSize: 11, fontWeight: 600, color: q ? '#d8d8f0' : '#2a2a4a' }}>
                  {q ? '₹' + q.ltp?.toFixed(2) : '—'}
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 3 }}>
                <div style={{ fontSize: 9, color: '#2a2a4a', fontFamily: 'JetBrains Mono', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 90 }}>
                  {q?.name?.slice(0, 14) || sym}
                </div>
                {chg ? (
                  <div style={{ fontSize: 9, fontFamily: 'JetBrains Mono', color: isUp ? '#22d3a5' : '#f43f5e', fontWeight: 600, background: isUp ? 'rgba(34,211,165,0.08)' : 'rgba(244,63,94,0.08)', padding: '1px 5px', borderRadius: 3 }}>
                    {isUp ? '+' : '-'}{chg}%
                  </div>
                ) : (
                  <div style={{ width: 36, height: 7, background: '#0e0e1e', borderRadius: 2, animation: 'shimmer 1.5s infinite' }} />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Market breadth */}
      <div style={{ padding: '8px 12px', borderTop: '1px solid #0a0a14' }}>
        <div style={{ fontSize: 8, color: '#1e1e38', fontFamily: 'JetBrains Mono', letterSpacing: '0.1em', marginBottom: 5 }}>BREADTH</div>
        <div style={{ height: 3, background: '#0a0a18', borderRadius: 2, overflow: 'hidden', display: 'flex' }}>
          <div style={{ width: (upCount / Math.max(upCount + downCount, 1)) * 100 + '%', background: '#22d3a5', transition: 'width 1s ease' }} />
          <div style={{ flex: 1, background: '#f43f5e' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
          <span style={{ fontSize: 9, color: '#22d3a5', fontFamily: 'JetBrains Mono' }}>▲ {upCount}</span>
          <span style={{ fontSize: 9, color: '#f43f5e', fontFamily: 'JetBrains Mono' }}>▼ {downCount}</span>
        </div>
      </div>
    </div>
  );
}