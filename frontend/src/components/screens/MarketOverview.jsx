import { useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { fetchIndices, fetchGainers, fetchLosers } from '../../utils/api';

export default function MarketOverview() {
  const { indices, gainers, losers, setIndices, setGainers, setLosers, setActiveSymbol } = useStore();

  useEffect(() => {
    const load = () => {
      fetchIndices().then(setIndices).catch(() => {});
      fetchGainers().then(setGainers).catch(() => {});
      fetchLosers().then(setLosers).catch(() => {});
    };
    load();
    const iv = setInterval(load, 30000);
    return () => clearInterval(iv);
  }, []);

  const mainIndices = indices.filter((i) =>
    ['NIFTY 50', 'NIFTY BANK', 'NIFTY IT', 'NIFTY NEXT 50', 'NIFTY MIDCAP 100',
     'NIFTY SMALLCAP 100', 'NIFTY AUTO', 'NIFTY FMCG', 'NIFTY PHARMA', 'NIFTY REALTY', 'SENSEX'].includes(i.name)
  );

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: 12 }}>

      {/* Indices grid */}
      <div style={{ fontSize: 9, fontFamily: 'JetBrains Mono', color: '#555', letterSpacing: 1, marginBottom: 8 }}>INDICES</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 6, marginBottom: 20 }}>
        {mainIndices.map((idx) => {
          const isUp = idx.changePct >= 0;
          return (
            <div key={idx.name} style={{ padding: '8px 10px', background: '#141414', border: `1px solid ${isUp ? 'rgba(0,208,132,0.15)' : 'rgba(255,68,68,0.15)'}`, borderRadius: 4 }}>
              <div style={{ fontSize: 9, color: '#555', fontFamily: 'JetBrains Mono', marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{idx.name}</div>
              <div style={{ fontFamily: 'JetBrains Mono', fontSize: 14, fontWeight: 700, color: isUp ? '#00d084' : '#ff4444' }}>
                {idx.last?.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: 10, fontFamily: 'JetBrains Mono', color: isUp ? '#00d084' : '#ff4444', marginTop: 2 }}>
                {isUp ? '+' : '-'} {Math.abs(idx.changePct)?.toFixed(2)}%
              </div>
              <div style={{ marginTop: 6, fontSize: 9, color: '#444', display: 'flex', gap: 8 }}>
                <span style={{ color: '#00d084' }}>A:{idx.advances}</span>
                <span style={{ color: '#ff4444' }}>D:{idx.declines}</span>
                <span>U:{idx.unchanged}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Gainers and Losers */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <GainerLoserTable title="TOP GAINERS" data={gainers} color="#00d084" onSelect={setActiveSymbol} />
        <GainerLoserTable title="TOP LOSERS" data={losers} color="#ff4444" onSelect={setActiveSymbol} />
      </div>
    </div>
  );
}

function GainerLoserTable({ title, data, color, onSelect }) {
  return (
    <div>
      <div style={{ fontSize: 9, fontFamily: 'JetBrains Mono', color: '#555', letterSpacing: 1, marginBottom: 6 }}>{title}</div>
      <table style={{ width: '100%', fontSize: 11, fontFamily: 'JetBrains Mono', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', padding: '5px 8px', color: '#6b6b6b', fontSize: 10, textTransform: 'uppercase', borderBottom: '1px solid #222', background: '#161616' }}>SYMBOL</th>
            <th style={{ textAlign: 'right', padding: '5px 8px', color: '#6b6b6b', fontSize: 10, textTransform: 'uppercase', borderBottom: '1px solid #222', background: '#161616' }}>LTP</th>
            <th style={{ textAlign: 'right', padding: '5px 8px', color: '#6b6b6b', fontSize: 10, textTransform: 'uppercase', borderBottom: '1px solid #222', background: '#161616' }}>CHG%</th>
          </tr>
        </thead>
        <tbody>
          {data.slice(0, 10).map((s, i) => (
            <tr key={i} onClick={() => s.symbol && onSelect(s.symbol)} style={{ cursor: 'pointer' }}>
              <td style={{ padding: '5px 8px', borderBottom: '1px solid rgba(34,34,34,0.5)', color: '#e8e8e8', fontWeight: 600 }}>{s.symbol || s.name}</td>
              <td style={{ padding: '5px 8px', borderBottom: '1px solid rgba(34,34,34,0.5)', textAlign: 'right' }}>Rs {Number(s.ltp || s.lastPrice)?.toFixed(2)}</td>
              <td style={{ padding: '5px 8px', borderBottom: '1px solid rgba(34,34,34,0.5)', textAlign: 'right', color }}>{Number(s.pChange || s.changePct)?.toFixed(2)}%</td>
            </tr>
          ))}
          {!data.length && (
            <tr>
              <td colSpan={3} style={{ color: '#444', textAlign: 'center', padding: 16 }}>Loading...</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}