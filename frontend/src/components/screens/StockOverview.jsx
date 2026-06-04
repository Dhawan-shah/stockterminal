import { useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { fetchQuote } from '../../utils/api';

function Stat({ label, value, color }) {
  return (
    <div style={{ padding: '6px 0', borderBottom: '1px solid #1a1a1a' }}>
      <div style={{ fontSize: 9, fontFamily: 'JetBrains Mono', color: '#555', letterSpacing: 1, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 12, fontFamily: 'JetBrains Mono', color: color || '#e8e8e8', fontWeight: 500 }}>{value ?? '-'}</div>
    </div>
  );
}

export default function StockOverview({ symbol }) {
  const { quotes, updateQuote } = useStore();
  const q = quotes[symbol];

  useEffect(() => {
    if (!symbol) return;
    fetchQuote(symbol).then((d) => updateQuote(symbol, d)).catch(() => {});
    const iv = setInterval(() => {
      fetchQuote(symbol).then((d) => updateQuote(symbol, d)).catch(() => {});
    }, 10000);
    return () => clearInterval(iv);
  }, [symbol]);

  const fmt = (n, dec = 2) =>
    n != null ? Number(n).toLocaleString('en-IN', { maximumFractionDigits: dec }) : '-';

  const fmtCr = (n) => {
    if (!n) return '-';
    const cr = n / 1e7;
    if (cr >= 1e5) return `Rs ${(cr / 1e5).toFixed(2)}L Cr`;
    if (cr >= 1e3) return `Rs ${(cr / 1e3).toFixed(2)}K Cr`;
    return `Rs ${cr.toFixed(2)} Cr`;
  };

  const isUp = q ? q.changePct >= 0 : true;

  return (
    <div style={{ padding: '10px 12px', height: '100%', overflowY: 'auto' }}>

      {/* Symbol header */}
      <div style={{ marginBottom: 12, paddingBottom: 10, borderBottom: '1px solid #222' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
          <span style={{ fontFamily: 'JetBrains Mono', fontSize: 14, fontWeight: 700, color: '#f5a623' }}>{symbol}</span>
          <span style={{ fontSize: 9, color: '#444', border: '1px solid #333', borderRadius: 2, padding: '1px 5px', fontFamily: 'JetBrains Mono' }}>NSE</span>
          <span style={{ fontSize: 9, color: '#444', border: '1px solid #333', borderRadius: 2, padding: '1px 5px', fontFamily: 'JetBrains Mono' }}>{q?.series || 'EQ'}</span>
        </div>
        {q?.name && <div style={{ fontSize: 10, color: '#666', marginBottom: 8 }}>{q.name}</div>}

        {/* LTP */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span style={{ fontFamily: 'JetBrains Mono', fontSize: 22, fontWeight: 700, color: isUp ? '#00d084' : '#ff4444' }}>
            Rs {fmt(q?.ltp)}
          </span>
          <div>
            <span style={{ fontSize: 12, fontFamily: 'JetBrains Mono', color: isUp ? '#00d084' : '#ff4444' }}>
              {isUp ? '+' : '-'} {fmt(Math.abs(q?.change))} ({Math.abs(q?.changePct)?.toFixed(2)}%)
            </span>
          </div>
        </div>

        {/* Day range bar */}
        {q?.low && q?.high && (
          <div style={{ marginTop: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <span style={{ fontSize: 9, fontFamily: 'JetBrains Mono', color: '#ff4444' }}>L {fmt(q.low)}</span>
              <span style={{ fontSize: 9, fontFamily: 'JetBrains Mono', color: '#555' }}>DAY RANGE</span>
              <span style={{ fontSize: 9, fontFamily: 'JetBrains Mono', color: '#00d084' }}>H {fmt(q.high)}</span>
            </div>
            <div style={{ height: 3, background: '#1a1a1a', borderRadius: 2, position: 'relative' }}>
              {q.ltp && q.low && q.high && (
                <div style={{
                  position: 'absolute',
                  left: `${((q.ltp - q.low) / (q.high - q.low)) * 100}%`,
                  top: -2, width: 7, height: 7,
                  background: isUp ? '#00d084' : '#ff4444',
                  borderRadius: '50%',
                  transform: 'translateX(-50%)',
                }} />
              )}
              <div style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, background: 'linear-gradient(to right, #ff4444, #00d084)', borderRadius: 2, opacity: 0.3 }} />
            </div>
          </div>
        )}
      </div>

      {/* Key stats */}
      <div style={{ fontSize: 9, fontFamily: 'JetBrains Mono', color: '#555', letterSpacing: 1, marginBottom: 6 }}>KEY STATS</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
        <Stat label="OPEN" value={`Rs ${fmt(q?.open)}`} />
        <Stat label="PREV CLOSE" value={`Rs ${fmt(q?.close)}`} />
        <Stat label="52W HIGH" value={`Rs ${fmt(q?.weekHigh52)}`} color="#00d084" />
        <Stat label="52W LOW" value={`Rs ${fmt(q?.weekLow52)}`} color="#ff4444" />
        <Stat label="VOLUME" value={fmt(q?.volume, 0)} />
        <Stat label="MKT CAP" value={fmtCr(q?.marketCap)} />
        <Stat label="BUY QTY" value={fmt(q?.totalBuyQty, 0)} color="#00d084" />
        <Stat label="SELL QTY" value={fmt(q?.totalSellQty, 0)} color="#ff4444" />
      </div>

      {/* Sector */}
      {q?.sector && (
        <div style={{ marginTop: 10, padding: '6px 8px', background: '#1a1a1a', borderRadius: 4 }}>
          <div style={{ fontSize: 9, color: '#555', fontFamily: 'JetBrains Mono', marginBottom: 2 }}>SECTOR</div>
          <div style={{ fontSize: 11, color: '#e8e8e8', fontFamily: 'JetBrains Mono' }}>{q.sector}</div>
        </div>
      )}

      {/* ISIN */}
      {q?.isin && (
        <div style={{ marginTop: 6, padding: '6px 8px', background: '#1a1a1a', borderRadius: 4 }}>
          <div style={{ fontSize: 9, color: '#555', fontFamily: 'JetBrains Mono', marginBottom: 2 }}>ISIN</div>
          <div style={{ fontSize: 10, color: '#888', fontFamily: 'JetBrains Mono' }}>{q.isin}</div>
        </div>
      )}
    </div>
  );
}