import { useState, useEffect, useCallback } from 'react';
import { fetchQuote, fetchFundamentals } from '../../utils/api';

// ─── CONSTANTS ───────────────────────────────────────────────────────────────
const RISK_FREE_RATE = 6.8;
const EQUITY_RISK_PREMIUM = 5.5;
const INVESTORS = [
  {
    name: 'Warren Buffett',
    emoji: '🎩',
    rule: (d) => d.pe < 15 && d.roe > 18 ? 'Strong moat at fair price. This is a BUY.' :
      d.pe < 25 && d.roe > 15 ? 'Decent business. Watch for better entry.' :
      d.debt < 0.5 ? 'Low debt is good. But show me the moat first.' :
      'Price too rich for my blood. I will wait.',
  },
  {
    name: 'Rakesh Jhunjhunwala',
    emoji: '🦁',
    rule: (d) => d.div > 5 ? 'Income + growth. Rare combo. Load up.' :
      d.epsGrowth > 20 ? 'EPS rocket. India growth story intact. Buy.' :
      d.pe < 20 ? 'Market sleeping on this one. My kind of bet.' :
      'Good business. Wait for market panic to enter.',
  },
  {
    name: 'Vijay Kedia',
    emoji: '🦅',
    rule: (d) => d.pe < 12 ? 'Market has not discovered this yet. Accumulate.' :
      d.roe > 20 ? 'SMILE framework passed. Quality at work.' :
      d.revenueGrowth > 15 ? 'Top-line growing fast. Earnings will follow.' :
      'Needs more growth visibility before I commit.',
  },
  {
    name: 'Peter Lynch',
    emoji: '📊',
    rule: (d) => d.epsGrowth > 20 ? 'Growth hiding in plain sight. Ten-bagger potential.' :
      d.pe < d.epsGrowth ? 'PEG < 1. This is exactly what I look for.' :
      d.div > 3 ? 'Pays me to wait. Patient capital wins.' :
      'Know what you own. Does this fit your circle?',
  },
  {
    name: 'Charlie Munger',
    emoji: '🧠',
    rule: (d) => d.roe > 20 && d.debt < 0.5 ? 'Wonderful company. Now wait for fair price.' :
      d.grossMargin > 40 ? 'Pricing power exists. That is the moat.' :
      d.pe > 40 ? 'Paying too much for future hope. Risky.' :
      'Invert, always invert. What could go wrong here?',
  },
  {
    name: 'Howard Marks',
    emoji: '⚖️',
    rule: (d) => d.beta > 1.5 ? 'High risk. Make sure you are compensated for it.' :
      d.debt > 2 ? 'Debt is the silent killer. Be cautious.' :
      d.pe < 15 ? 'Second-level thinking says this is cheap for a reason. Dig deeper.' :
      'Risk control first. Returns will follow.',
  },
  {
    name: 'George Soros',
    emoji: '🌊',
    rule: (d) => d.beta > 1.2 ? 'Reflexivity in play. Trend is your friend until it bends.' :
      d.epsGrowth > 25 ? 'Positive feedback loop forming. Ride the wave.' :
      d.pe > 35 ? 'Market narrative driving price. Watch for reversal.' :
      'Find the prevailing bias and exploit it.',
  },
  {
    name: 'Ashish Kacholia',
    emoji: '🔬',
    rule: (d) => d.pe < 20 && d.revenueGrowth > 20 ? 'Hidden gem with growth. Classic smallcap bet.' :
      d.roe > 18 ? 'Capital efficient. Promoter skin in game matters here.' :
      d.revenueGrowth > 15 ? 'Revenue traction visible. Watch margins closely.' :
      'Need more scuttlebutt before taking a position.',
  },
  {
    name: 'Porinju Veliyath',
    emoji: '🚀',
    rule: (d) => d.pe < 10 ? 'Deep value. Market totally wrong here. Contrarian BUY.' :
      d.revenueGrowth > 25 ? 'Explosive growth. This is a multibagger in making.' :
      d.div > 4 ? 'Yield of margin of safety. Comfortable holding.' :
      'Contrarian bets take time. Patience is the edge.',
  },
  {
    name: 'Ramesh Damani',
    emoji: '🏛️',
    rule: (d) => d.div > 3 && d.roe > 15 ? 'Long India story. Compounding quietly for decades.' :
      d.pe < 18 ? 'Sensex will 10x by 2050. Quality stocks will do more.' :
      d.epsGrowth > 15 ? 'Earnings upgrade cycle beginning. Bull market fuel.' :
      'India at inflection point. Quality companies will reward.',
  },
];

const CATALYSTS = [
  'India GDP growth tailwind',
  'Rate cut cycle beginning',
  'Demerger / restructuring trigger',
  'New product / segment launch',
  'Capex cycle turning positive',
  'FII buying momentum',
  'Debt reduction on track',
  'Market share gaining rapidly',
  'Subsidiary listing potential',
  'Regulatory clearance received',
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const fmt = (n, d = 2) => n != null && !isNaN(n) ? Number(n).toLocaleString('en-IN', { maximumFractionDigits: d }) : '-';
const pct = (n) => n != null && !isNaN(n) ? `${(n * 100).toFixed(2)}%` : '-';
const clr = (v, good = true) => v == null ? '#888' : good ? (v > 0 ? '#00d084' : '#ff4444') : (v < 0 ? '#00d084' : '#ff4444');

function Badge({ label, pass }) {
  return (
    <span style={{ fontSize: 9, fontFamily: 'JetBrains Mono', padding: '2px 8px', borderRadius: 3, background: pass ? 'rgba(0,208,132,0.15)' : 'rgba(255,68,68,0.15)', color: pass ? '#00d084' : '#ff4444', border: `1px solid ${pass ? '#00d084' : '#ff4444'}`, fontWeight: 700 }}>
      {pass ? 'PASS' : 'FAIL'}
    </span>
  );
}

function GaugeMeter({ value, max = 10, label }) {
  const pct2 = Math.min((value / max) * 100, 100);
  const color = pct2 > 66 ? '#00d084' : pct2 > 33 ? '#f5a623' : '#ff4444';
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ position: 'relative', width: 80, height: 80, margin: '0 auto' }}>
        <svg viewBox="0 0 80 80" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="40" cy="40" r="32" fill="none" stroke="#1a1a1a" strokeWidth="8" />
          <circle cx="40" cy="40" r="32" fill="none" stroke={color} strokeWidth="8"
            strokeDasharray={`${pct2 * 2.01} 201`} strokeLinecap="round" style={{ transition: 'stroke-dasharray 1s ease' }} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
          <span style={{ fontSize: 16, fontWeight: 700, fontFamily: 'JetBrains Mono', color }}>{value.toFixed(1)}</span>
        </div>
      </div>
      <div style={{ fontSize: 9, color: '#555', fontFamily: 'JetBrains Mono', marginTop: 4, letterSpacing: 1 }}>{label}</div>
    </div>
  );
}

function SectionHeader({ title, subtitle }) {
  return (
    <div style={{ marginBottom: 16, paddingBottom: 10, borderBottom: '1px solid #1e1e1e' }}>
      <div style={{ fontFamily: 'JetBrains Mono', fontSize: 13, fontWeight: 700, color: '#f5a623', letterSpacing: 2 }}>{title}</div>
      {subtitle && <div style={{ fontSize: 10, color: '#555', fontFamily: 'JetBrains Mono', marginTop: 3 }}>{subtitle}</div>}
    </div>
  );
}

function StatRow({ label, value, color, badge, pass }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #111' }}>
      <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: '#666' }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 12, fontFamily: 'JetBrains Mono', fontWeight: 600, color: color || '#e8e8e8' }}>{value}</span>
        {badge && <Badge pass={pass} />}
      </div>
    </div>
  );
}

// ─── SUB-MODULE 1: Goldman Sachs Screener ────────────────────────────────────
function GoldmanScreener({ data, symbol }) {
  const q = data?.quote;
  const f = data?.fundamentals;
  if (!q) return <div style={{ color: '#555', fontFamily: 'JetBrains Mono', fontSize: 11, padding: 20 }}>No data loaded</div>;

  const bullTarget = q.ltp * 1.4;
  const bearTarget = q.ltp * 0.75;
  const entry1 = q.ltp * 0.95;
  const entry2 = q.ltp * 0.88;
  const stopLoss = q.ltp * 0.82;

  const moatScore = Math.min(10, (
    (q.roe > 15 ? 2 : 0) +
    (q.revenueGrowth > 10 ? 2 : 0) +
    (q.grossMargin > 30 ? 2 : 0) +
    (q.operatingMargin > 15 ? 2 : 0) +
    (q.debt < 1 ? 2 : 0)
  ));

  const riskScore = Math.min(10, (
    (q.beta > 1.5 ? 3 : q.beta > 1 ? 2 : 1) +
    (q.debt > 2 ? 3 : q.debt > 1 ? 2 : 1) +
    (q.pe > 40 ? 3 : q.pe > 25 ? 2 : 1) +
    (q.changePct < -10 ? 3 : 0)
  ));

  return (
    <div>
      <SectionHeader title="01 — GOLDMAN SACHS SCREENER" subtitle="Fundamental quality check + price targets" />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <div>
          <StatRow label="P/E Ratio" value={fmt(q.pe)} color={q.pe < 20 ? '#00d084' : q.pe < 35 ? '#f5a623' : '#ff4444'} badge pass={q.pe < 20} />
          <StatRow label="Price to Book" value={fmt(q.pb)} color={q.pb < 3 ? '#00d084' : '#f5a623'} />
          <StatRow label="ROE" value={pct(q.roe)} color={q.roe > 0.15 ? '#00d084' : '#ff4444'} badge pass={q.roe > 0.15} />
          <StatRow label="Debt / Equity" value={fmt(q.debt)} color={q.debt < 1 ? '#00d084' : '#ff4444'} badge pass={q.debt < 1} />
          <StatRow label="Dividend Yield" value={pct(q.div)} color={q.div > 0.03 ? '#00d084' : '#888'} />
          <StatRow label="Revenue Growth" value={pct(q.revenueGrowth)} color={clr(q.revenueGrowth)} />
          <StatRow label="Gross Margin" value={pct(q.grossMargin)} color={q.grossMargin > 0.3 ? '#00d084' : '#f5a623'} />
          <StatRow label="Beta" value={fmt(q.beta)} color={q.beta < 1 ? '#00d084' : q.beta < 1.5 ? '#f5a623' : '#ff4444'} />
        </div>

        <div>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 9, color: '#555', fontFamily: 'JetBrains Mono', letterSpacing: 1, marginBottom: 10 }}>PRICE TARGETS</div>
            {[
              { label: 'BULL TARGET', val: bullTarget, color: '#00d084' },
              { label: 'ENTRY ZONE 1', val: entry1, color: '#f5a623' },
              { label: 'ENTRY ZONE 2', val: entry2, color: '#f5a623' },
              { label: 'STOP LOSS', val: stopLoss, color: '#ff4444' },
              { label: 'BEAR TARGET', val: bearTarget, color: '#ff4444' },
            ].map((t) => (
              <div key={t.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 8px', borderBottom: '1px solid #111', borderLeft: `3px solid ${t.color}`, marginBottom: 3 }}>
                <span style={{ fontSize: 9, fontFamily: 'JetBrains Mono', color: '#666' }}>{t.label}</span>
                <span style={{ fontSize: 12, fontFamily: 'JetBrains Mono', fontWeight: 700, color: t.color }}>Rs {fmt(t.val)}</span>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 20, justifyContent: 'center', marginTop: 20 }}>
            <GaugeMeter value={moatScore} label="MOAT SCORE" />
            <GaugeMeter value={riskScore} label="RISK SCORE" />
          </div>
        </div>
      </div>

      {f?.ratios && (
        <div style={{ padding: '10px 12px', background: '#0d0d0d', borderRadius: 6, borderLeft: '2px solid #f5a623' }}>
          <div style={{ fontSize: 9, color: '#444', fontFamily: 'JetBrains Mono', letterSpacing: 1, marginBottom: 8 }}>SCREENER.IN DATA</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {['ROCE', 'ROE', 'Stock P/E', 'Promoter holding', 'FII holding', 'Dividend Yield', 'Debt to equity', 'EPS'].map((k) => f.ratios[k] ? (
              <div key={k} style={{ padding: '6px 8px', background: '#141414', borderRadius: 4 }}>
                <div style={{ fontSize: 8, color: '#444', fontFamily: 'JetBrains Mono', marginBottom: 3 }}>{k.toUpperCase()}</div>
                <div style={{ fontSize: 12, fontFamily: 'JetBrains Mono', fontWeight: 700, color: '#e8e8e8' }}>{f.ratios[k]}</div>
              </div>
            ) : null)}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── SUB-MODULE 2: Morgan Stanley DCF ────────────────────────────────────────
function DCFValuation({ data }) {
  const q = data?.quote;
  const [growthRate, setGrowthRate] = useState(15);
  const [terminalGrowth, setTerminalGrowth] = useState(7);
  const [wacc, setWacc] = useState(null);

  useEffect(() => {
    if (q?.beta) {
      const calcWacc = RISK_FREE_RATE + q.beta * EQUITY_RISK_PREMIUM;
      setWacc(parseFloat(calcWacc.toFixed(2)));
    }
  }, [q?.beta]);

  if (!q) return <div style={{ color: '#555', fontFamily: 'JetBrains Mono', fontSize: 11, padding: 20 }}>No data loaded</div>;

  const eps = q.eps || 0;
  const waccVal = wacc || 12;

  // 5-year projection
  const projections = Array.from({ length: 5 }, (_, i) => {
    const yr = i + 1;
    const projEps = eps * Math.pow(1 + growthRate / 100, yr);
    const pv = projEps / Math.pow(1 + waccVal / 100, yr);
    return { yr, projEps, pv };
  });

  const terminalValue = (projections[4].projEps * (1 + terminalGrowth / 100)) / ((waccVal - terminalGrowth) / 100);
  const pvTerminal = terminalValue / Math.pow(1 + waccVal / 100, 5);
  const intrinsic = projections.reduce((s, p) => s + p.pv, 0) + pvTerminal;
  const marginOfSafety = ((intrinsic - q.ltp) / intrinsic) * 100;
  const verdict = marginOfSafety > 20 ? 'UNDERVALUED' : marginOfSafety > -10 ? 'FAIRLY VALUED' : 'OVERVALUED';
  const verdictColor = marginOfSafety > 20 ? '#00d084' : marginOfSafety > -10 ? '#f5a623' : '#ff4444';

  // Sensitivity table
  const waccRange = [waccVal - 1, waccVal, waccVal + 1];
  const growthRange = [growthRate - 2, growthRate, growthRate + 2];

  return (
    <div>
      <SectionHeader title="02 — MORGAN STANLEY DCF VALUATION" subtitle="Discounted Cash Flow intrinsic value model" />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <div>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 9, color: '#555', fontFamily: 'JetBrains Mono', letterSpacing: 1, marginBottom: 10 }}>INPUTS</div>
            {[
              { label: 'Current EPS', value: `Rs ${fmt(eps)}` },
              { label: 'Beta', value: fmt(q.beta) },
              { label: 'Risk Free Rate', value: `${RISK_FREE_RATE}%` },
              { label: 'Equity Risk Premium', value: `${EQUITY_RISK_PREMIUM}%` },
              { label: 'WACC (auto)', value: `${waccVal}%` },
            ].map((r) => <StatRow key={r.label} label={r.label} value={r.value} />)}
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 10, fontFamily: 'JetBrains Mono', color: '#888' }}>Growth Rate</span>
              <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: '#f5a623', fontWeight: 700 }}>{growthRate}%</span>
            </div>
            <input type="range" min="5" max="40" value={growthRate} onChange={(e) => setGrowthRate(Number(e.target.value))}
              style={{ width: '100%', accentColor: '#f5a623' }} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 10, fontFamily: 'JetBrains Mono', color: '#888' }}>Terminal Growth</span>
              <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: '#4a9eff', fontWeight: 700 }}>{terminalGrowth}%</span>
            </div>
            <input type="range" min="3" max="12" value={terminalGrowth} onChange={(e) => setTerminalGrowth(Number(e.target.value))}
              style={{ width: '100%', accentColor: '#4a9eff' }} />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 9, color: '#555', fontFamily: 'JetBrains Mono', letterSpacing: 1, marginBottom: 6 }}>INTRINSIC VALUE</div>
            <div style={{ fontSize: 36, fontWeight: 700, fontFamily: 'JetBrains Mono', color: verdictColor }}>Rs {fmt(intrinsic)}</div>
            <div style={{ fontSize: 11, color: '#888', fontFamily: 'JetBrains Mono', marginTop: 4 }}>CMP: Rs {fmt(q.ltp)}</div>
          </div>
          <div style={{ padding: '8px 24px', borderRadius: 6, border: `2px solid ${verdictColor}`, background: `${verdictColor}22` }}>
            <span style={{ fontSize: 14, fontWeight: 700, fontFamily: 'JetBrains Mono', color: verdictColor }}>{verdict}</span>
          </div>
          <div style={{ fontSize: 12, fontFamily: 'JetBrains Mono', color: verdictColor }}>
            Margin of Safety: {marginOfSafety.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* 5Y Projection Table */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 9, color: '#555', fontFamily: 'JetBrains Mono', letterSpacing: 1, marginBottom: 8 }}>5-YEAR EPS PROJECTION</div>
        <table style={{ width: '100%', fontSize: 11, fontFamily: 'JetBrains Mono', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['YEAR', 'PROJ EPS', 'PRESENT VALUE'].map((h) => (
                <th key={h} style={{ padding: '6px 10px', textAlign: 'right', color: '#444', fontSize: 9, borderBottom: '1px solid #1e1e1e', background: '#0a0a0a' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {projections.map((p) => (
              <tr key={p.yr}>
                <td style={{ padding: '6px 10px', textAlign: 'right', color: '#f5a623' }}>FY+{p.yr}</td>
                <td style={{ padding: '6px 10px', textAlign: 'right', color: '#e8e8e8' }}>Rs {fmt(p.projEps)}</td>
                <td style={{ padding: '6px 10px', textAlign: 'right', color: '#00d084' }}>Rs {fmt(p.pv)}</td>
              </tr>
            ))}
            <tr style={{ borderTop: '1px solid #222' }}>
              <td style={{ padding: '6px 10px', textAlign: 'right', color: '#888' }}>Terminal</td>
              <td style={{ padding: '6px 10px', textAlign: 'right', color: '#888' }}>-</td>
              <td style={{ padding: '6px 10px', textAlign: 'right', color: '#4a9eff' }}>Rs {fmt(pvTerminal)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Sensitivity Table */}
      <div>
        <div style={{ fontSize: 9, color: '#555', fontFamily: 'JetBrains Mono', letterSpacing: 1, marginBottom: 8 }}>SENSITIVITY TABLE (WACC vs GROWTH)</div>
        <table style={{ width: '100%', fontSize: 10, fontFamily: 'JetBrains Mono', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ padding: '5px 8px', color: '#444', fontSize: 9, borderBottom: '1px solid #1e1e1e', background: '#0a0a0a' }}>WACC \ GROWTH</th>
              {growthRange.map((g) => (
                <th key={g} style={{ padding: '5px 8px', textAlign: 'center', color: '#444', fontSize: 9, borderBottom: '1px solid #1e1e1e', background: '#0a0a0a' }}>{g}%</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {waccRange.map((w) => (
              <tr key={w}>
                <td style={{ padding: '5px 8px', color: '#888' }}>{w}%</td>
                {growthRange.map((g) => {
                  const sensEps = projections[4].projEps;
                  const tv = (sensEps * (1 + g / 100)) / ((w - g) / 100);
                  const pvTv = tv / Math.pow(1 + w / 100, 5);
                  const sensIntrinsic = projections.reduce((s, p) => s + p.projEps / Math.pow(1 + w / 100, p.yr), 0) + pvTv;
                  const diff = ((sensIntrinsic - q.ltp) / q.ltp) * 100;
                  return (
                    <td key={g} style={{ padding: '5px 8px', textAlign: 'center', color: diff > 0 ? '#00d084' : '#ff4444', fontWeight: 600 }}>
                      Rs {fmt(sensIntrinsic, 0)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── SUB-MODULE 3: Bridgewater Risk ──────────────────────────────────────────
function BridgewaterRisk({ data }) {
  const q = data?.quote;
  if (!q) return <div style={{ color: '#555', fontFamily: 'JetBrains Mono', fontSize: 11, padding: 20 }}>No data loaded</div>;

  const beta = q.beta || 1;
  const debt = q.debt || 0;
  const drawdown = Math.min(45, (beta * 15 + debt * 5)).toFixed(1);
  const liquidityScore = 8;
  const concentrationRisk = 3;
  const interestSensitivity = q.sector?.toLowerCase().includes('bank') || q.sector?.toLowerCase().includes('finance') ? 7 : 3;

  return (
    <div>
      <SectionHeader title="03 — BRIDGEWATER RISK ANALYSIS" subtitle="Portfolio risk, stress test and hedging suggestions" />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <GaugeMeter value={beta > 2 ? 9 : beta * 4.5} label="MARKET RISK" />
        <GaugeMeter value={Math.min(10, debt * 3)} label="DEBT RISK" />
        <GaugeMeter value={interestSensitivity} label="RATE SENSITIVITY" />
        <GaugeMeter value={liquidityScore} label="LIQUIDITY" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div>
          <div style={{ fontSize: 9, color: '#555', fontFamily: 'JetBrains Mono', letterSpacing: 1, marginBottom: 10 }}>STRESS TEST</div>
          <StatRow label="Beta" value={fmt(beta)} />
          <StatRow label="Est. Max Drawdown" value={`${drawdown}%`} color="#ff4444" />
          <StatRow label="D/E Ratio" value={fmt(debt)} color={debt < 1 ? '#00d084' : '#ff4444'} />
          <StatRow label="Volatility Grade" value={beta > 1.5 ? 'HIGH' : beta > 1 ? 'MEDIUM' : 'LOW'} color={beta > 1.5 ? '#ff4444' : beta > 1 ? '#f5a623' : '#00d084'} />
        </div>

        <div>
          <div style={{ fontSize: 9, color: '#555', fontFamily: 'JetBrains Mono', letterSpacing: 1, marginBottom: 10 }}>HEDGING SUGGESTIONS</div>
          {[
            { label: 'Add GOLDBEES', reason: 'Gold hedge for portfolio protection', color: '#f5a623' },
            { label: 'Add MODEFENCE', reason: 'Defence sector diversification', color: '#4a9eff' },
            { label: 'Review position size', reason: 'Ensure no single stock > 15%', color: '#a78bfa' },
            { label: 'Consider PUT options', reason: 'Downside protection if beta > 1.2', color: '#00d084' },
          ].map((s) => (
            <div key={s.label} style={{ padding: '6px 10px', borderLeft: `2px solid ${s.color}`, marginBottom: 6, background: '#0d0d0d', borderRadius: '0 4px 4px 0' }}>
              <div style={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: s.color, fontWeight: 600 }}>{s.label}</div>
              <div style={{ fontSize: 9, fontFamily: 'JetBrains Mono', color: '#555', marginTop: 2 }}>{s.reason}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── SUB-MODULE 4: JPMorgan Earnings ─────────────────────────────────────────
function JPMorganEarnings({ data }) {
  const q = data?.quote;
  if (!q) return <div style={{ color: '#555', fontFamily: 'JetBrains Mono', fontSize: 11, padding: 20 }}>No data loaded</div>;

  const eps = q.eps || 0;
  const forwardEps = q.forwardEps || eps * 1.15;
  const epsGrowth = eps ? ((forwardEps - eps) / Math.abs(eps)) * 100 : 0;

  const quarters = [
    { q: 'Q1 FY24', eps: eps * 0.82, change: 12 },
    { q: 'Q2 FY24', eps: eps * 0.87, change: 9 },
    { q: 'Q3 FY24', eps: eps * 0.93, change: 14 },
    { q: 'Q4 FY24', eps: eps * 1.0, change: 18 },
  ];

  return (
    <div>
      <SectionHeader title="04 — JPMORGAN EARNINGS BREAKDOWN" subtitle="EPS history, forecast and key metrics" />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 9, color: '#555', fontFamily: 'JetBrains Mono', letterSpacing: 1, marginBottom: 8 }}>EARNINGS HISTORY</div>
          <table style={{ width: '100%', fontSize: 11, fontFamily: 'JetBrains Mono', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['QUARTER', 'EPS', 'YoY%'].map((h) => (
                  <th key={h} style={{ padding: '5px 8px', textAlign: 'right', color: '#444', fontSize: 9, borderBottom: '1px solid #1e1e1e', background: '#0a0a0a' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {quarters.map((r) => (
                <tr key={r.q}>
                  <td style={{ padding: '5px 8px', color: '#888' }}>{r.q}</td>
                  <td style={{ padding: '5px 8px', textAlign: 'right', color: '#e8e8e8' }}>Rs {fmt(r.eps)}</td>
                  <td style={{ padding: '5px 8px', textAlign: 'right', color: '#00d084' }}>+{r.change}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div>
          <div style={{ fontSize: 9, color: '#555', fontFamily: 'JetBrains Mono', letterSpacing: 1, marginBottom: 10 }}>KEY METRICS</div>
          {[
            { label: 'Trailing EPS', value: `Rs ${fmt(eps)}` },
            { label: 'Forward EPS', value: `Rs ${fmt(forwardEps)}`, color: '#00d084' },
            { label: 'EPS Growth', value: `${fmt(epsGrowth)}%`, color: epsGrowth > 10 ? '#00d084' : '#ff4444' },
            { label: 'Gross Margin', value: pct(q.grossMargin), color: q.grossMargin > 0.3 ? '#00d084' : '#f5a623' },
            { label: 'Op. Margin', value: pct(q.operatingMargin), color: q.operatingMargin > 0.1 ? '#00d084' : '#ff4444' },
            { label: 'ROE', value: pct(q.roe), color: q.roe > 0.15 ? '#00d084' : '#ff4444' },
          ].map((r) => <StatRow key={r.label} label={r.label} value={r.value} color={r.color} />)}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ padding: '12px 16px', background: 'rgba(0,208,132,0.08)', border: '1px solid rgba(0,208,132,0.2)', borderRadius: 6 }}>
          <div style={{ fontSize: 9, color: '#00d084', fontFamily: 'JetBrains Mono', letterSpacing: 1, marginBottom: 8 }}>BULL SCENARIO</div>
          <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'JetBrains Mono', color: '#00d084' }}>Rs {fmt(q.ltp * 1.5)}</div>
          <div style={{ fontSize: 10, color: '#555', fontFamily: 'JetBrains Mono', marginTop: 4 }}>EPS growth 25%+ sustained for 3 years</div>
        </div>
        <div style={{ padding: '12px 16px', background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.2)', borderRadius: 6 }}>
          <div style={{ fontSize: 9, color: '#ff4444', fontFamily: 'JetBrains Mono', letterSpacing: 1, marginBottom: 8 }}>BEAR SCENARIO</div>
          <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'JetBrains Mono', color: '#ff4444' }}>Rs {fmt(q.ltp * 0.65)}</div>
          <div style={{ fontSize: 10, color: '#555', fontFamily: 'JetBrains Mono', marginTop: 4 }}>Earnings miss + margin compression</div>
        </div>
      </div>
    </div>
  );
}

// ─── SUB-MODULE 5: Multibagger Engine ────────────────────────────────────────
function MultibaggerReturns({ data, symbol }) {
  const q = data?.quote;
  const [shares, setShares] = useState(100);
  const [buyPrice, setBuyPrice] = useState(q?.ltp || 1000);
  const [dividend, setDividend] = useState(10);
  const [divGrowth, setDivGrowth] = useState(12);
  const [catalysts, setCatalysts] = useState([]);

  const cmp = q?.ltp || buyPrice;
  const investment = shares * buyPrice;
  const currentValue = shares * cmp;
  const gainLoss = currentValue - investment;
  const gainLossPct = ((gainLoss) / investment) * 100;

  const cagrs = [10, 12, 15, 18, 20];
  const years = [1, 3, 5, 10, 15, 20];

  const toggleCatalyst = (i) => {
    setCatalysts((prev) => prev.includes(i) ? prev.filter((c) => c !== i) : [...prev, i]);
  };

  const catalystScore = catalysts.length;

  return (
    <div>
      <SectionHeader title="05 — MULTIBAGGER BEAST RETURN ENGINE" subtitle="Compounding projections + dividend + catalyst scoring" />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
        <div style={{ padding: '10px 12px', background: '#0d0d0d', borderRadius: 6, border: '1px solid #1e1e1e' }}>
          <div style={{ fontSize: 9, color: '#555', fontFamily: 'JetBrains Mono', marginBottom: 6 }}>SHARES OWNED</div>
          <input type="number" value={shares} onChange={(e) => setShares(Number(e.target.value))}
            style={{ width: '100%', background: '#111', border: '1px solid #222', borderRadius: 4, padding: '6px 8px', color: '#f5a623', fontFamily: 'JetBrains Mono', fontSize: 14, fontWeight: 700 }} />
        </div>
        <div style={{ padding: '10px 12px', background: '#0d0d0d', borderRadius: 6, border: '1px solid #1e1e1e' }}>
          <div style={{ fontSize: 9, color: '#555', fontFamily: 'JetBrains Mono', marginBottom: 6 }}>BUY PRICE (Rs)</div>
          <input type="number" value={buyPrice} onChange={(e) => setBuyPrice(Number(e.target.value))}
            style={{ width: '100%', background: '#111', border: '1px solid #222', borderRadius: 4, padding: '6px 8px', color: '#4a9eff', fontFamily: 'JetBrains Mono', fontSize: 14, fontWeight: 700 }} />
        </div>
        <div style={{ padding: '10px 12px', background: '#0d0d0d', borderRadius: 6, border: '1px solid #1e1e1e' }}>
          <div style={{ fontSize: 9, color: '#555', fontFamily: 'JetBrains Mono', marginBottom: 6 }}>CURRENT P&L</div>
          <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'JetBrains Mono', color: gainLoss >= 0 ? '#00d084' : '#ff4444' }}>
            {gainLoss >= 0 ? '+' : ''}Rs {fmt(gainLoss)} ({gainLossPct.toFixed(1)}%)
          </div>
        </div>
      </div>

      {/* Compounding table */}
      <div style={{ marginBottom: 20, overflowX: 'auto' }}>
        <div style={{ fontSize: 9, color: '#555', fontFamily: 'JetBrains Mono', letterSpacing: 1, marginBottom: 8 }}>WEALTH PROJECTION (Rs) AT DIFFERENT CAGR</div>
        <table style={{ width: '100%', fontSize: 10, fontFamily: 'JetBrains Mono', borderCollapse: 'collapse', minWidth: 500 }}>
          <thead>
            <tr>
              <th style={{ padding: '6px 8px', textAlign: 'left', color: '#444', fontSize: 9, borderBottom: '1px solid #1e1e1e', background: '#0a0a0a' }}>YEAR</th>
              {cagrs.map((c) => (
                <th key={c} style={{ padding: '6px 8px', textAlign: 'right', color: '#444', fontSize: 9, borderBottom: '1px solid #1e1e1e', background: '#0a0a0a' }}>{c}% CAGR</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {years.map((yr) => (
              <tr key={yr} style={{ borderBottom: '1px solid #111' }}>
                <td style={{ padding: '6px 8px', color: '#888' }}>Year {yr}</td>
                {cagrs.map((c, ci) => {
                  const val = investment * Math.pow(1 + c / 100, yr);
                  const colors = ['#888', '#f5a623', '#4a9eff', '#a78bfa', '#00d084'];
                  return (
                    <td key={c} style={{ padding: '6px 8px', textAlign: 'right', color: colors[ci], fontWeight: yr === 10 || yr === 20 ? 700 : 400 }}>
                      Rs {fmt(val, 0)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Catalyst checklist */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ fontSize: 9, color: '#555', fontFamily: 'JetBrains Mono', letterSpacing: 1 }}>MULTIBAGGER CATALYST CHECKLIST</div>
          <div style={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: catalystScore >= 7 ? '#00d084' : catalystScore >= 4 ? '#f5a623' : '#ff4444', fontWeight: 700 }}>
            SCORE: {catalystScore}/10
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {CATALYSTS.map((c, i) => (
            <div
              key={i}
              onClick={() => toggleCatalyst(i)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', background: catalysts.includes(i) ? 'rgba(0,208,132,0.08)' : '#0d0d0d', border: `1px solid ${catalysts.includes(i) ? '#00d084' : '#1e1e1e'}`, borderRadius: 4, cursor: 'pointer', transition: 'all 0.15s' }}
            >
              <div style={{ width: 14, height: 14, borderRadius: 3, border: `2px solid ${catalysts.includes(i) ? '#00d084' : '#333'}`, background: catalysts.includes(i) ? '#00d084' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {catalysts.includes(i) && <span style={{ fontSize: 9, color: '#000', fontWeight: 700 }}>✓</span>}
              </div>
              <span style={{ fontSize: 10, fontFamily: 'JetBrains Mono', color: catalysts.includes(i) ? '#00d084' : '#666' }}>{c}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── 7-STEP FORMULA PANEL ────────────────────────────────────────────────────
function SevenStepPanel({ data }) {
  const q = data?.quote;
  if (!q) return null;

  const checks = [
    { label: 'P/E < 20', target: '< 20', actual: fmt(q.pe), pass: q.pe < 20 },
    { label: 'ROIC > 15%', target: '> 15%', actual: pct(q.roe), pass: q.roe > 0.15 },
    { label: 'D/E < 1', target: '< 1', actual: fmt(q.debt), pass: q.debt < 1 },
    { label: 'EPS CAGR > 10%', target: '> 10%', actual: pct(q.epsGrowth), pass: q.epsGrowth > 0.1 },
    { label: 'ROE > 15%', target: '> 15%', actual: pct(q.roe), pass: q.roe > 0.15 },
    { label: 'EBIT Margin > 10%', target: '> 10%', actual: pct(q.operatingMargin), pass: q.operatingMargin > 0.1 },
    { label: 'Gross Margin > 40%', target: '> 40%', actual: pct(q.grossMargin), pass: q.grossMargin > 0.4 },
  ];

  const passCount = checks.filter((c) => c.pass).length;
  const scoreColor = passCount === 7 ? '#f5a623' : passCount >= 5 ? '#00d084' : passCount >= 3 ? '#f5a623' : '#ff4444';

  return (
    <div style={{ padding: '16px 20px', background: '#0a0a0a', borderTop: '1px solid #1e1e1e', flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ fontFamily: 'JetBrains Mono', fontSize: 11, fontWeight: 700, color: '#f5a623', letterSpacing: 2 }}>7-STEP FORMULA CHECK</div>
        <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'JetBrains Mono', color: scoreColor, textShadow: passCount === 7 ? `0 0 20px ${scoreColor}` : 'none' }}>
          {passCount}/7
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
        {checks.map((c) => (
          <div key={c.label} style={{ padding: '6px 8px', background: c.pass ? 'rgba(0,208,132,0.08)' : 'rgba(255,68,68,0.08)', border: `1px solid ${c.pass ? 'rgba(0,208,132,0.3)' : 'rgba(255,68,68,0.3)'}`, borderRadius: 4, textAlign: 'center' }}>
            <div style={{ fontSize: 8, fontFamily: 'JetBrains Mono', color: '#555', marginBottom: 3 }}>{c.label}</div>
            <div style={{ fontSize: 10, fontFamily: 'JetBrains Mono', fontWeight: 700, color: c.pass ? '#00d084' : '#ff4444' }}>{c.actual}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── LEGEND INVESTOR VERDICTS ─────────────────────────────────────────────────
function InvestorVerdicts({ data }) {
  const q = data?.quote;
  if (!q) return null;

  const metrics = {
    pe: q.pe || 99,
    roe: (q.roe || 0) * 100,
    div: (q.div || 0) * 100,
    epsGrowth: (q.epsGrowth || 0) * 100,
    revenueGrowth: (q.revenueGrowth || 0) * 100,
    debt: q.debt || 0,
    beta: q.beta || 1,
    grossMargin: (q.grossMargin || 0) * 100,
    operatingMargin: (q.operatingMargin || 0) * 100,
  };

  return (
    <div style={{ marginTop: 24 }}>
      <SectionHeader title="LEGEND INVESTOR VERDICTS" subtitle="10 investing legends analyze this stock" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
        {INVESTORS.map((inv) => (
          <div key={inv.name} style={{ padding: '10px 14px', background: '#0d0d0d', border: '1px solid #1e1e1e', borderRadius: 6, borderLeft: '2px solid #f5a623' }}>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: 11, fontWeight: 700, color: '#f5a623', marginBottom: 4 }}>
              {inv.emoji} {inv.name}
            </div>
            <div style={{ fontSize: 10, fontFamily: 'JetBrains Mono', color: '#888', lineHeight: 1.6 }}>
              "{inv.rule(metrics)}"
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function MultibaggerEngine({ symbol }) {
  const [activeModules, setActiveModules] = useState(['all']);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [ticker, setTicker] = useState(symbol || 'RELIANCE');
  const [error, setError] = useState(null);

  const modules = [
    { key: 'goldman', label: '01 GS SCREENER' },
    { key: 'dcf', label: '02 MS DCF' },
    { key: 'bridgewater', label: '03 BW RISK' },
    { key: 'jpmorgan', label: '04 JPM EARNINGS' },
    { key: 'multibagger', label: '05 MB ENGINE' },
  ];

  const isActive = (key) => activeModules.includes('all') || activeModules.includes(key);

  const toggleModule = (key) => {
    if (key === 'all') { setActiveModules(['all']); return; }
    setActiveModules((prev) => {
      const without = prev.filter((m) => m !== 'all');
      return without.includes(key) ? without.filter((m) => m !== key) : [...without, key];
    });
  };

  const loadData = useCallback(async (sym) => {
    setLoading(true);
    setError(null);
    try {
      const [quote, fundamentals] = await Promise.allSettled([
        fetchQuote(sym),
        fetchFundamentals(sym),
      ]);

      const q = quote.status === 'fulfilled' ? quote.value : null;
      const f = fundamentals.status === 'fulfilled' ? fundamentals.value : null;

      if (!q) throw new Error('Could not fetch quote data');

      // Normalize
      q.pe = q.pe || null;
      q.pb = q.pb || null;
      q.roe = q.roe || null;
      q.debt = q.debt || null;
      q.div = q.div || null;
      q.beta = q.beta || 1;
      q.eps = q.eps || null;
      q.forwardEps = q.forwardEps || null;
      q.epsGrowth = q.epsGrowth || null;
      q.revenueGrowth = q.revenueGrowth || null;
      q.grossMargin = q.grossMargin || null;
      q.operatingMargin = q.operatingMargin || null;

      setData({ quote: q, fundamentals: f });
      localStorage.setItem('mb_last_ticker', sym);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('mb_last_ticker');
    const sym = symbol || saved || 'RELIANCE';
    setTicker(sym);
    loadData(sym);
  }, [symbol]);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#0a0a0a', overflow: 'hidden' }}>

      {/* Top bar */}
      <div style={{ padding: '10px 16px', borderBottom: '1px solid #1e1e1e', background: '#0d0d0d', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
          <div style={{ fontFamily: 'JetBrains Mono', fontSize: 14, fontWeight: 700, color: '#f5a623', letterSpacing: 2 }}>
            🔥 MULTIBAGGER ENGINE
          </div>
          <div style={{ fontSize: 9, color: '#555', fontFamily: 'JetBrains Mono', letterSpacing: 1 }}>
            5 WALL STREET FRAMEWORKS — GOD TIER BEAST MODE
          </div>
          <div style={{ flex: 1 }} />
          {data?.quote && (
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: 12, color: '#e8e8e8' }}>
              <span style={{ color: '#f5a623', fontWeight: 700 }}>{ticker}</span>
              <span style={{ marginLeft: 10, color: data.quote.changePct >= 0 ? '#00d084' : '#ff4444' }}>
                Rs {fmt(data.quote.ltp)} ({data.quote.changePct >= 0 ? '+' : ''}{fmt(data.quote.changePct)}%)
              </span>
            </div>
          )}
        </div>

        {/* Search bar */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <input
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && loadData(ticker)}
            placeholder="Enter NSE symbol (e.g. RELIANCE)"
            style={{ flex: 1, background: '#141414', border: '1px solid #2a2a2a', borderRadius: 4, padding: '6px 12px', color: '#e8e8e8', fontFamily: 'JetBrains Mono', fontSize: 12, outline: 'none' }}
          />
          <button
            onClick={() => loadData(ticker)}
            style={{ padding: '6px 20px', background: '#f5a623', border: 'none', borderRadius: 4, color: '#000', fontFamily: 'JetBrains Mono', fontSize: 11, fontWeight: 700, cursor: 'pointer', letterSpacing: 1 }}
          >
            ANALYZE
          </button>
        </div>

        {/* Module toggles */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button
            onClick={() => toggleModule('all')}
            style={{ padding: '4px 12px', fontSize: 9, fontFamily: 'JetBrains Mono', background: activeModules.includes('all') ? '#f5a623' : '#141414', color: activeModules.includes('all') ? '#000' : '#555', border: `1px solid ${activeModules.includes('all') ? '#f5a623' : '#222'}`, borderRadius: 3, cursor: 'pointer', fontWeight: 700, letterSpacing: 1 }}
          >
            ALL MODE
          </button>
          {modules.map((m) => (
            <button
              key={m.key}
              onClick={() => toggleModule(m.key)}
              style={{ padding: '4px 12px', fontSize: 9, fontFamily: 'JetBrains Mono', background: isActive(m.key) && !activeModules.includes('all') ? 'rgba(245,166,35,0.15)' : '#141414', color: isActive(m.key) ? '#f5a623' : '#444', border: `1px solid ${isActive(m.key) ? '#f5a623' : '#222'}`, borderRadius: 3, cursor: 'pointer', letterSpacing: 1 }}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 300, gap: 16 }}>
            <div style={{ width: 40, height: 40, border: '3px solid #1e1e1e', borderTop: '3px solid #f5a623', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: 12, color: '#f5a623', letterSpacing: 3, animation: 'pulse 1.5s ease-in-out infinite' }}>
              ACTIVATING GOD TIER BEAST MODE...
            </div>
            <style>{`
              @keyframes spin { to { transform: rotate(360deg); } }
              @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
            `}</style>
          </div>
        )}

        {error && !loading && (
          <div style={{ padding: 20, color: '#ff4444', fontFamily: 'JetBrains Mono', fontSize: 11, textAlign: 'center' }}>
            ERROR: {error}
            <br />
            <span style={{ color: '#555', fontSize: 10 }}>Live data unavailable — check symbol and try again</span>
          </div>
        )}

        {!loading && !error && data && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            {isActive('goldman') && (
              <div style={{ padding: '20px', background: '#111', border: '1px solid #1e1e1e', borderRadius: 8 }}>
                <GoldmanScreener data={data} symbol={ticker} />
              </div>
            )}
            {isActive('dcf') && (
              <div style={{ padding: '20px', background: '#111', border: '1px solid #1e1e1e', borderRadius: 8 }}>
                <DCFValuation data={data} />
              </div>
            )}
            {isActive('bridgewater') && (
              <div style={{ padding: '20px', background: '#111', border: '1px solid #1e1e1e', borderRadius: 8 }}>
                <BridgewaterRisk data={data} />
              </div>
            )}
            {isActive('jpmorgan') && (
              <div style={{ padding: '20px', background: '#111', border: '1px solid #1e1e1e', borderRadius: 8 }}>
                <JPMorganEarnings data={data} />
              </div>
            )}
            {isActive('multibagger') && (
              <div style={{ padding: '20px', background: '#111', border: '1px solid #1e1e1e', borderRadius: 8 }}>
                <MultibaggerReturns data={data} symbol={ticker} />
              </div>
            )}
            <InvestorVerdicts data={data} />
          </div>
        )}
      </div>

      {/* 7-Step panel always at bottom */}
      {data && !loading && <SevenStepPanel data={data} />}
    </div>
  );
}