import { useEffect, useState } from 'react';
import { useStore } from '../../store/useStore';
import { fetchFundamentals, fetchPeers } from '../../utils/api';

function RatioCard({ label, value }) {
  return (
    <div style={{ padding: '10px 12px', background: '#0d0d0d', border: '1px solid #1e1e1e', borderRadius: 6, transition: 'border 0.15s' }}>
      <div style={{ fontSize: 9, fontFamily: 'JetBrains Mono', color: '#444', letterSpacing: 1.5, marginBottom: 6, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 15, fontFamily: 'JetBrains Mono', fontWeight: 700, color: '#e8e8e8' }}>{value || '-'}</div>
    </div>
  );
}

const KEY_RATIOS = [
  'Market Cap', 'Current Price', 'High / Low', 'Stock P/E', 'Book Value',
  'Dividend Yield', 'ROCE', 'ROE', 'Face Value', 'P/B',
  'EPS', 'Debt to equity', 'Current ratio', 'Quick ratio',
  'Promoter holding', 'FII holding', 'DII holding', 'Piotroski score',
];

function DataTable({ headers, rows }) {
  if (!rows || !rows.length) return (
    <div style={{ color: '#555', fontFamily: 'JetBrains Mono', fontSize: 11, padding: 20 }}>No data</div>
  );
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', fontSize: 11, fontFamily: 'JetBrains Mono', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={i} style={{ textAlign: i === 0 ? 'left' : 'right', padding: '8px 10px', color: '#555', fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', borderBottom: '1px solid #1e1e1e', background: '#0a0a0a', position: 'sticky', top: 0, whiteSpace: 'nowrap' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ borderBottom: '1px solid #141414' }}>
              {headers.map((h, j) => (
                <td key={j} style={{ padding: '7px 10px', color: j === 0 ? '#888' : '#e0e0e0', textAlign: j === 0 ? 'left' : 'right', whiteSpace: 'nowrap', fontSize: 11 }}>
                  {row[h] || row.label || '-'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function HoldingsTable({ shareholding }) {
  if (!shareholding || !shareholding.length) return (
    <div style={{ color: '#555', fontFamily: 'JetBrains Mono', fontSize: 11, padding: 20 }}>No holdings data</div>
  );

  // Get all unique quarter labels from the first row that has values
  const maxCols = Math.max(...shareholding.map((r) => r.values.length));
  const quarters = Array.from({ length: maxCols }, (_, i) => `Q${maxCols - i}`).reverse();

  // Color map for categories
  const colorMap = {
    'Promoters': '#f5a623',
    'FIIs': '#4a9eff',
    'DIIs': '#00d084',
    'Government': '#a78bfa',
    'Public': '#ff4444',
    'Others': '#6b6b6b',
  };

  const getColor = (category) => {
    for (const key of Object.keys(colorMap)) {
      if (category.toLowerCase().includes(key.toLowerCase())) return colorMap[key];
    }
    return '#888';
  };

  const getLatestValue = (values) => {
    if (!values || !values.length) return 0;
    const last = values[values.length - 1];
    return parseFloat(last?.replace('%', '') || 0);
  };

  // Latest quarter data for pie-like bar
  const mainCategories = shareholding.filter((r) =>
    ['promoters', 'fiis', 'diis', 'public', 'government', 'others'].some((k) =>
      r.category.toLowerCase().includes(k)
    ) && !r.category.includes('+')
  );

  return (
    <div>
      {/* Visual breakdown bar */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 9, fontFamily: 'JetBrains Mono', color: '#444', letterSpacing: 1.5, marginBottom: 10 }}>LATEST QUARTER BREAKDOWN</div>
        <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 10 }}>
          {mainCategories.map((row, i) => {
            const val = getLatestValue(row.values);
            if (!val) return null;
            return (
              <div
                key={i}
                style={{ width: `${val}%`, background: getColor(row.category), transition: 'width 0.3s' }}
                title={`${row.category}: ${val}%`}
              />
            );
          })}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          {mainCategories.map((row, i) => {
            const val = getLatestValue(row.values);
            if (!val) return null;
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: getColor(row.category) }} />
                <span style={{ fontSize: 10, fontFamily: 'JetBrains Mono', color: '#888' }}>{row.category.replace(' +', '')}</span>
                <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: getColor(row.category), fontWeight: 700 }}>{val}%</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Proper table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', fontSize: 11, fontFamily: 'JetBrains Mono', borderCollapse: 'collapse', minWidth: 600 }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '8px 10px', color: '#444', fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', borderBottom: '1px solid #1e1e1e', background: '#0a0a0a', position: 'sticky', top: 0, minWidth: 160 }}>CATEGORY</th>
              {quarters.map((q, i) => (
                <th key={i} style={{ textAlign: 'right', padding: '8px 10px', color: '#444', fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', borderBottom: '1px solid #1e1e1e', background: '#0a0a0a', position: 'sticky', top: 0, whiteSpace: 'nowrap' }}>{q}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shareholding.map((row, i) => {
              const isSubRow = row.category.includes('+');
              const color = getColor(row.category);
              return (
                <tr key={i} style={{ borderBottom: '1px solid #111', background: isSubRow ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                  <td style={{ padding: '7px 10px', color: isSubRow ? '#444' : color, fontWeight: isSubRow ? 400 : 600, paddingLeft: isSubRow ? 24 : 10, fontSize: isSubRow ? 10 : 11, whiteSpace: 'nowrap' }}>
                    {row.category.replace(' +', '')}
                  </td>
                  {Array.from({ length: maxCols }, (_, j) => (
                    <td key={j} style={{ padding: '7px 10px', textAlign: 'right', color: row.values[j] ? '#e0e0e0' : '#333', fontSize: 11 }}>
                      {row.values[j] || '-'}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function Fundamentals({ symbol }) {
  const { fundamentals, setFundamentals } = useStore();
  const data = fundamentals[symbol];
  const [loading, setLoading] = useState(false);
  const [peers, setPeers] = useState(null);
  const [activeSection, setActiveSection] = useState('ratios');
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!symbol || data) return;
    setLoading(true);
    setError(null);
    fetchFundamentals(symbol)
      .then((d) => setFundamentals(symbol, d))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [symbol]);

  useEffect(() => {
    if (activeSection === 'peers' && !peers) {
      fetchPeers(symbol).then(setPeers).catch(() => {});
    }
  }, [activeSection, symbol]);

  const sections = [
    { key: 'ratios', label: 'RATIOS' },
    { key: 'quarterly', label: 'QUARTERLY' },
    { key: 'annual', label: 'ANNUAL' },
    { key: 'balance', label: 'BALANCE' },
    { key: 'shareholding', label: 'HOLDINGS' },
    { key: 'peers', label: 'PEERS' },
  ];

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12 }}>
      <div style={{ width: 32, height: 32, border: '2px solid #1e1e1e', borderTop: '2px solid #f5a623', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <div style={{ color: '#555', fontFamily: 'JetBrains Mono', fontSize: 11, letterSpacing: 2 }}>FETCHING FUNDAMENTALS...</div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (error) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60%', gap: 12, padding: 40 }}>
      <div style={{ fontFamily: 'JetBrains Mono', fontSize: 12, color: '#ff4444' }}>FAILED TO LOAD</div>
      <div style={{ fontFamily: 'JetBrains Mono', fontSize: 10, color: '#555', textAlign: 'center' }}>
        Screener.in may be rate limiting.
        <br />
        Try again in a minute.
      </div>
      <button
        onClick={() => { setError(null); setFundamentals(symbol, null); }}
        style={{ fontFamily: 'JetBrains Mono', fontSize: 11, color: '#f5a623', border: '1px solid #f5a623', borderRadius: 4, padding: '6px 16px', background: 'none', cursor: 'pointer' }}
      >
        RETRY
      </button>
    </div>
  );

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>

      {/* Section tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #1a1a1a', flexShrink: 0, background: '#0a0a0a' }}>
        {sections.map((s) => (
          <button
            key={s.key}
            onClick={() => setActiveSection(s.key)}
            style={{
              padding: '8px 16px',
              fontSize: 10,
              fontFamily: 'JetBrains Mono',
              letterSpacing: 1.5,
              background: 'none',
              border: 'none',
              borderBottom: activeSection === s.key ? '2px solid #f5a623' : '2px solid transparent',
              color: activeSection === s.key ? '#f5a623' : '#444',
              cursor: 'pointer',
              textTransform: 'uppercase',
              transition: 'all 0.15s',
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>

        {/* About */}
        {data && data.about && (
          <div style={{ fontSize: 10, color: '#666', lineHeight: 1.8, marginBottom: 16, padding: '10px 14px', background: '#0d0d0d', borderRadius: 6, borderLeft: '2px solid #f5a623' }}>
            {data.about.slice(0, 400)}...
          </div>
        )}

        {activeSection === 'ratios' && !data && (
          <div style={{ color: '#444', fontFamily: 'JetBrains Mono', fontSize: 11, paddingTop: 40, textAlign: 'center' }}>
            Select a stock to load fundamentals
          </div>
        )}

        {activeSection === 'ratios' && data && data.ratios && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {KEY_RATIOS.map((key) => data.ratios[key] ? (
              <RatioCard key={key} label={key} value={data.ratios[key]} />
            ) : null)}
            {Object.entries(data.ratios)
              .filter(([k]) => !KEY_RATIOS.includes(k))
              .map(([k, v]) => (
                <RatioCard key={k} label={k} value={v} />
              ))}
          </div>
        )}

        {activeSection === 'quarterly' && data && data.quarterly && (
          <DataTable headers={data.quarterly.headers} rows={data.quarterly.data} />
        )}

        {activeSection === 'annual' && data && data.annual && (
          <DataTable headers={data.annual.headers} rows={data.annual.data} />
        )}

        {activeSection === 'balance' && data && data.balanceSheet && (
          <DataTable headers={data.balanceSheet.headers} rows={data.balanceSheet.data} />
        )}

        {activeSection === 'shareholding' && data && data.shareholding && (
          <HoldingsTable shareholding={data.shareholding} />
        )}

        {activeSection === 'peers' && (
          peers
            ? <DataTable headers={peers.headers} rows={peers.peers} />
            : <div style={{ color: '#555', fontFamily: 'JetBrains Mono', fontSize: 11, paddingTop: 20 }}>Loading peers...</div>
        )}

      </div>
    </div>
  );
}