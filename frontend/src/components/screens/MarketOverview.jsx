import { useEffect, useState } from 'react';
import { useStore } from '../../store/useStore';
import { fetchIndices, fetchGainers, fetchLosers } from '../../utils/api';

export default function MarketOverview() {
  const { indices, setIndices, setActiveSymbol } = useStore();
  const [gainers, setGainers] = useState([]);
  const [losers, setLosers] = useState([]);

  useEffect(() => {
    const load = () => {
      fetchIndices().then(setIndices).catch(() => {});
      fetchGainers().then(d => setGainers(d || [])).catch(() => {});
      fetchLosers().then(d => setLosers(d || [])).catch(() => {});
    };
    load();
    const iv = setInterval(load, 30000);
    return () => clearInterval(iv);
  }, []);

  const mainIndices = (indices || []).filter((i) =>
    ['NIFTY 50', 'NIFTY BANK', 'NIFTY IT', 'SENSEX', 'NIFTY AUTO',
     'NIFTY FMCG', 'NIFTY PHARMA', 'NIFTY MIDCAP'].includes(i.name)
  );

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: 16, background: '#050508' }}>

      {/* Indices grid */}
      <div style={{ fontSize: 9, fontFamily: 'JetBrains Mono', color: '#2a2a4a', letterSpacing: '0.1em', marginBottom: 10 }}>INDICES</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(175px, 1fr))', gap: 8, marginBottom: 24 }}>
        {mainIndices.length === 0
          ? Array(8).fill(0).map((_, i) => (
              <div key={i} style={{ height: 80, background: '#0a0a14', borderRadius: 6, animation: 'shimmer 1.5s infinite' }} />
            ))
          : mainIndices.map((idx) => {
              const isUp = (idx.changePct || 0) >= 0;
              return (
                <div key={idx.name} style={{ padding: '10px 12px', background: '#08080f', border: '1px solid ' + (isUp ? 'rgba(34,211,165,0.12)' : 'rgba(244,63,94,0.12)'), borderRadius: 6, borderTop: '2px solid ' + (isUp ? '#22d3a5' : '#f43f5e') }}>
                  <div style={{ fontSize: 9, color: '#2a2a4a', fontFamily: 'JetBrains Mono', marginBottom: 6, letterSpacing: '0.05em' }}>{idx.name}</div>
                  <div style={{ fontFamily: 'JetBrains Mono', fontSize: 15, fontWeight: 700, color: '#d8d8f0' }}>
                    {idx.last?.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </div>
                  <div style={{ fontSize: 10, fontFamily: 'JetBrains Mono', color: isUp ? '#22d3a5' : '#f43f5e', marginTop: 4, fontWeight: 600 }}>
                    {isUp ? '▲' : '▼'} {Math.abs(idx.changePct || 0).toFixed(2)}%
                    <span style={{ color: '#1e1e38', marginLeft: 6, fontWeight: 400 }}>
                      {isUp ? '+' : ''}{idx.change?.toFixed(2)}
                    </span>
                  </div>
                </div>
              );
            })}
      </div>

      {/* Gainers and Losers */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <GainerLoserTable title="TOP GAINERS" data={gainers} color="#22d3a5" onSelect={setActiveSymbol} />
        <GainerLoserTable title="TOP LOSERS" data={losers} color="#f43f5e" onSelect={setActiveSymbol} />
      </div>
    </div>
  );
}

function GainerLoserTable({ title, data, color, onSelect }) {
  const safe = Array.isArray(data) ? data : [];
  return (
    <div style={{ background: '#08080f', border: '1px solid #0e0e1e', borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ padding: '10px 14px', borderBottom: '1px solid #0e0e1e', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
        <span style={{ fontSize: 10, fontFamily: 'JetBrains Mono', color: '#3a3a6a', letterSpacing: '0.1em', fontWeight: 700 }}>{title}</span>
      </div>
      <table style={{ width: '100%', fontSize: 11, fontFamily: 'JetBrains Mono', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#060610' }}>
            {['SYMBOL', 'LTP', 'CHG%'].map((h, i) => (
              <th key={h} style={{ textAlign: i === 0 ? 'left' : 'right', padding: '6px 12px', color: '#2a2a4a', fontSize: 9, letterSpacing: '0.08em', borderBottom: '1px solid #0e0e1e', fontWeight: 600 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {safe.length === 0
            ? Array(5).fill(0).map((_, i) => (
                <tr key={i}>
                  <td colSpan={3} style={{ padding: '8px 12px' }}>
                    <div style={{ height: 8, background: '#0e0e1e', borderRadius: 2, animation: 'shimmer 1.5s infinite' }} />
                  </td>
                </tr>
              ))
            : safe.slice(0, 10).map((s, i) => (
                <tr key={i}
                  onClick={() => s.symbol && onSelect(s.symbol)}
                  style={{ cursor: 'pointer', borderBottom: '1px solid #060610', transition: 'background 0.1s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '7px 12px', color: '#9090b0', fontWeight: 600, fontSize: 11 }}>{s.symbol || s.name}</td>
                  <td style={{ padding: '7px 12px', textAlign: 'right', color: '#c8c8e8' }}>₹{Number(s.ltp || s.lastPrice || 0).toFixed(2)}</td>
                  <td style={{ padding: '7px 12px', textAlign: 'right', color, fontWeight: 700 }}>
                    {Number(s.pChange || s.changePct || 0).toFixed(2)}%
                  </td>
                </tr>
              ))}
        </tbody>
      </table>
    </div>
  );
}