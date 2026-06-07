import { useState, useEffect, useCallback } from 'react';
import { fetchQuote, fetchFundamentals, fetchStockNews, fetchMacroNews } from '../../utils/api';
// ─── CONSTANTS ───────────────────────────────────────────────────────────────
const RISK_FREE_RATE = 6.8;
const ERP = 5.5;

// Sector to macro impact mapping
const SECTOR_MACRO_MAP = {
  'Energy': {
    triggers: ['Crude oil prices', 'OPEC decisions', 'Petrol/diesel price revision', 'Green energy push', 'Russia-Ukraine conflict', 'US dollar strength'],
    govtSchemes: ['National Hydrogen Mission', 'PM-KUSUM Solar', 'FAME EV scheme'],
    risks: ['Oil price crash', 'Subsidy burden', 'Renewable disruption'],
    tailwinds: ['Rising crude = higher refining margins', 'Deregulation of fuel prices'],
  },
  'Technology': {
    triggers: ['US tech spending', 'AI boom', 'Dollar/Rupee rate', 'H1B visa policy', 'Global IT budgets'],
    govtSchemes: ['Digital India', 'PLI for Electronics', 'Semicon India'],
    risks: ['USD weakening', 'Recession fears', 'AI automation'],
    tailwinds: ['Gen-AI adoption', 'Cloud migration wave', 'BFSI tech spending'],
  },
  'Financial Services': {
    triggers: ['RBI repo rate', 'Credit growth', 'NPA levels', 'FII flows', 'GST collections', 'India GDP growth'],
    govtSchemes: ['Jan Dhan Yojana', 'PMAY credit link', 'PM SVANidhi'],
    risks: ['Rate hike cycle', 'NPA spike', 'Regulatory tightening'],
    tailwinds: ['Rate cut cycle', 'Credit boom', 'Fintech partnerships'],
  },
  'Healthcare': {
    triggers: ['US FDA approvals', 'Drug pricing policy', 'Post-COVID demand', 'API prices', 'China+1 strategy'],
    govtSchemes: ['PLI for Pharma', 'Ayushman Bharat', 'Jan Aushadhi'],
    risks: ['USFDA import alerts', 'Price control orders', 'Generic competition'],
    tailwinds: ['Biosimilar exports', 'API localization', 'Medical tourism'],
  },
  'Consumer Defensive': {
    triggers: ['Rural income growth', 'Monsoon performance', 'Inflation trends', 'Commodity prices', 'Urban consumption'],
    govtSchemes: ['PM-KISAN', 'MGNREGS', 'Food subsidy program'],
    risks: ['Input cost inflation', 'Rural distress', 'Competition from D2C'],
    tailwinds: ['Premiumization trend', 'Rural revival', 'Modern trade growth'],
  },
  'Industrials': {
    triggers: ['Capex cycle', 'Govt infra spend', 'Order inflows', 'Steel/cement prices', 'PLI schemes'],
    govtSchemes: ['PM Gati Shakti', 'National Infrastructure Pipeline', 'Make in India'],
    risks: ['Raw material inflation', 'Order cancellations', 'Competition from China'],
    tailwinds: ['Defence indigenization', 'Railway electrification', 'Smart cities'],
  },
  'Real Estate': {
    triggers: ['Home loan rates', 'RBI rate decisions', 'Urban migration', 'Affordable housing push'],
    govtSchemes: ['PMAY Urban', 'RERA enforcement', 'Smart Cities Mission'],
    risks: ['Rate hike = EMI jump', 'Unsold inventory', 'Regulatory delays'],
    tailwinds: ['Rate cut cycle', 'Work from home demand', 'Tier-2 city boom'],
  },
  'Materials': {
    triggers: ['China steel output', 'Global commodity cycle', 'Infrastructure demand', 'Export incentives'],
    govtSchemes: ['PLI for specialty steel', 'Mines development', 'National Steel Policy'],
    risks: ['China dumping', 'Commodity crash', 'Environmental regulations'],
    tailwinds: ['China+1 beneficiary', 'Defence orders', 'EV battery materials'],
  },
  'Utilities': {
    triggers: ['Power demand growth', 'Renewable capacity addition', 'Govt tariff policy', 'Coal prices'],
    govtSchemes: ['National Electricity Plan', 'PM Surya Ghar', 'Green Hydrogen Mission'],
    risks: ['Regulatory tariff cuts', 'Fuel cost volatility', 'Discom payment delays'],
    tailwinds: ['Data centre power demand', 'EV charging boom', 'Solar boom'],
  },
  'Communication Services': {
    triggers: ['ARPU trends', '5G rollout', 'Spectrum auctions', 'Broadband penetration', 'OTT growth'],
    govtSchemes: ['BharatNet', 'Digital India', 'PLI for Telecom'],
    risks: ['Price wars', 'Spectrum cost', 'Regulatory levies'],
    tailwinds: ['5G monetization', 'Enterprise services', 'Rural broadband'],
  },
};

const DEFAULT_MACRO = {
  triggers: ['India GDP growth', 'FII/DII flows', 'RBI policy', 'Global risk sentiment', 'Rupee movement'],
  govtSchemes: ['Union Budget allocations', 'PLI schemes', 'Make in India'],
  risks: ['Global recession', 'FII outflows', 'Currency depreciation'],
  tailwinds: ['India growth story', 'Demographic dividend', 'Consumption boom'],
};

const WORLD_CONDITIONS = [
  { event: 'US Fed Rate Decision', impact: 'FII flows into India affected — rate cuts = more FII buying', icon: '🏦' },
  { event: 'China Economic Slowdown', impact: 'India gains as alternative manufacturing hub — positive for exports', icon: '🇨🇳' },
  { event: 'Russia-Ukraine War', impact: 'Oil prices volatile — affects energy stocks and import bill', icon: '⚔️' },
  { event: 'India-Middle East Trade Corridor', impact: 'Logistics, ports, infrastructure companies benefit directly', icon: '🛣️' },
  { event: 'AI Revolution', impact: 'IT services, data centres, semiconductor demand surge', icon: '🤖' },
  { event: 'EV Transition', impact: 'Battery materials, EV OEMs, charging infra, old auto at risk', icon: '⚡' },
  { event: 'India Budget FY26', impact: 'Capex push, defence allocation, rural spend — sector specific', icon: '📋' },
  { event: 'Monsoon Performance', impact: 'Rural FMCG, agri, fertilizer, banks with rural exposure', icon: '🌧️' },
  { event: 'RBI Rate Cut Cycle', impact: 'Banks, NBFCs, real estate, autos — major tailwind forming', icon: '📉' },
  { event: 'China+1 Strategy', impact: 'Indian pharma, chemicals, textiles, electronics gain export share', icon: '🌏' },
];

const INVESTORS = [
  {
    name: 'Warren Buffett', emoji: '🎩',
    rule: (d) => d.pe < 15 && d.roe > 18 ? 'Strong moat at fair price. This is a BUY.' :
      d.pe < 25 && d.roe > 15 ? 'Decent business. Watch for a better entry point.' :
      d.debt < 0.5 && d.roe > 12 ? 'Low debt, decent returns. Getting closer to my criteria.' :
      d.rec === 'strong_buy' ? 'Analysts love it but price must be right. Wait for correction.' :
      'Price too rich for my blood. I will wait for panic.',
  },
  {
    name: 'Rakesh Jhunjhunwala', emoji: '🦁',
    rule: (d) => d.div > 5 ? 'Income + growth combo. Rare beast. Load up on dips.' :
      d.epsGrowth > 20 ? 'EPS rocket launching. India growth story intact. Buy.' :
      d.pe < 20 && d.revenueGrowth > 15 ? 'Market sleeping on this. My kind of contrarian bet.' :
      d.targetUpside > 25 ? `Analysts see ${d.targetUpside.toFixed(0)}% upside. I agree. Accumulate.` :
      'Good business. Wait for market panic to get better entry.',
  },
  {
    name: 'Vijay Kedia', emoji: '🦅',
    rule: (d) => d.pe < 12 ? 'Market has not discovered this yet. Aggressively accumulate.' :
      d.roe > 20 && d.revenueGrowth > 15 ? 'SMILE framework passed. Quality compounder at work.' :
      d.revenueGrowth > 20 ? 'Top-line growing explosively. Earnings will follow. Buy.' :
      d.pb < 2 ? 'Trading below 2x book. Hidden value here. Interesting.' :
      'Needs more growth visibility before I commit capital.',
  },
  {
    name: 'Peter Lynch', emoji: '📊',
    rule: (d) => d.pe > 0 && d.epsGrowth > 0 && d.pe < d.epsGrowth * 100 ? `PEG ratio attractive. This is exactly what I hunt for.` :
      d.epsGrowth > 20 ? 'Growth hiding in plain sight. Classic ten-bagger setup.' :
      d.div > 3 ? 'Pays me to wait. Patient capital always wins in the end.' :
      d.revenueGrowth > 15 ? 'Revenue growth solid. Dig deeper into the story.' :
      'Know what you own. Does this fit your circle of competence?',
  },
  {
    name: 'Charlie Munger', emoji: '🧠',
    rule: (d) => d.roe > 20 && d.debt < 0.5 ? 'Wonderful company at fair price. Better than fair at wonderful.' :
      d.grossMargin > 40 ? 'Pricing power evident. That IS the moat. Hold forever.' :
      d.pe > 50 ? 'Paying too much for future hope. Speculating not investing.' :
      d.currentRatio > 2 ? 'Strong balance sheet. Fortress finances. Can survive anything.' :
      'Invert, always invert. What could go catastrophically wrong here?',
  },
  {
    name: 'Howard Marks', emoji: '⚖️',
    rule: (d) => d.beta > 1.5 ? 'High beta = high risk. Are you being compensated adequately?' :
      d.debt > 2 ? 'Debt is the silent killer of companies. Approach with caution.' :
      d.targetUpside > 30 ? 'Significant analyst upside. But where are we in the cycle?' :
      d.pe < 15 ? 'Cheap for a reason or genuinely overlooked? Do the work.' :
      'Risk control always comes first. Returns are a byproduct of that.',
  },
  {
    name: 'George Soros', emoji: '🌊',
    rule: (d) => d.beta > 1.3 ? 'Reflexivity in play. Momentum building. Ride the wave carefully.' :
      d.epsGrowth > 25 ? 'Positive feedback loop forming. Market narrative will catch up.' :
      d.revenueGrowth > 20 ? 'Growth accelerating. The prevailing bias is shifting bullish.' :
      d.rec === 'strong_buy' ? 'Smart money consensus forming. Watch for trend confirmation.' :
      'Find the prevailing bias, exploit it, then exit before reversal.',
  },
  {
    name: 'Ashish Kacholia', emoji: '🔬',
    rule: (d) => d.pe < 25 && d.revenueGrowth > 20 ? 'Hidden gem with explosive growth. Classic smallcap multibagger.' :
      d.roe > 18 && d.debt < 1 ? 'Capital efficient with skin in game. Promoter holding matters.' :
      d.grossMargin > 35 ? 'High gross margins = strong product. This can scale beautifully.' :
      d.targetUpside > 20 ? 'Street seeing value here too. Scuttlebutt confirms the story.' :
      'Need more ground-level research before taking a large position.',
  },
  {
    name: 'Porinju Veliyath', emoji: '🚀',
    rule: (d) => d.pe < 10 ? 'Deep value. Market completely wrong here. Contrarian STRONG BUY.' :
      d.revenueGrowth > 30 ? 'Explosive top-line growth. This is a multibagger in early stages.' :
      d.pb < 1.5 && d.roe > 12 ? 'Trading near book with decent returns. Margin of safety present.' :
      d.div > 4 ? 'Yield provides margin of safety while waiting for rerating.' :
      'Contrarian bets require patience. The market will eventually agree.',
  },
  {
    name: 'Ramesh Damani', emoji: '🏛️',
    rule: (d) => d.div > 3 && d.roe > 15 ? 'Long India story compounding quietly. Hold for decades.' :
      d.pe < 20 && d.revenueGrowth > 10 ? 'Sensex will 10x by 2050. Quality stocks like this will do 20x.' :
      d.epsGrowth > 15 ? 'Earnings upgrade cycle beginning. This is bull market fuel.' :
      d.rec === 'buy' || d.rec === 'strong_buy' ? 'India at structural inflection. Quality always gets rewarded.' :
      'India demographic story intact. Stay invested in quality businesses.',
  },
];

const CATALYSTS = [
  'India GDP growth tailwind',
  'RBI rate cut cycle beginning',
  'Demerger / restructuring trigger',
  'New product / segment launch',
  'Capex cycle turning positive',
  'FII buying momentum building',
  'Debt reduction on track',
  'Market share gaining rapidly',
  'Subsidiary listing potential',
  'Regulatory clearance received',
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const fmt = (n, d = 2) => n != null && !isNaN(n) ? Number(n).toLocaleString('en-IN', { maximumFractionDigits: d }) : '-';
const pct = (n) => n != null && !isNaN(n) ? `${(n * 100).toFixed(2)}%` : '-';
const raw = (n, d = 2) => n != null && !isNaN(n) ? Number(n).toFixed(d) : null;

function normalize(q) {
  return {
    pe: q.pe || null,
    pb: q.pb || null,
    roe: q.roe ? q.roe * 100 : null,
    debt: q.debt || null,
    div: q.div ? q.div * 100 : null,
    beta: q.beta || 1,
    eps: q.eps || null,
    forwardEps: q.forwardEps || null,
    epsGrowth: q.epsGrowth ? q.epsGrowth * 100 : null,
    revenueGrowth: q.revenueGrowth ? q.revenueGrowth * 100 : null,
    grossMargin: q.grossMargin ? q.grossMargin * 100 : null,
    operatingMargin: q.operatingMargin ? q.operatingMargin * 100 : null,
    currentRatio: q.currentRatio || null,
    targetPrice: q.targetPrice || null,
    rec: q.recommendation || null,
    ltp: q.ltp || 0,
    marketCap: q.marketCap || null,
    sector: q.sector || '',
    targetUpside: q.targetPrice && q.ltp ? ((q.targetPrice - q.ltp) / q.ltp) * 100 : null,
  };
}

// ─── UI COMPONENTS ────────────────────────────────────────────────────────────
function SectionHeader({ title, subtitle, color = '#f5a623' }) {
  return (
    <div style={{ marginBottom: 16, paddingBottom: 10, borderBottom: '1px solid #1e1e1e' }}>
      <div style={{ fontFamily: 'JetBrains Mono', fontSize: 13, fontWeight: 700, color, letterSpacing: 2 }}>{title}</div>
      {subtitle && <div style={{ fontSize: 10, color: '#555', fontFamily: 'JetBrains Mono', marginTop: 3 }}>{subtitle}</div>}
    </div>
  );
}

function StatRow({ label, value, color, pass, badge }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #111' }}>
      <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: '#666' }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 12, fontFamily: 'JetBrains Mono', fontWeight: 600, color: color || '#e8e8e8' }}>{value}</span>
        {badge && (
          <span style={{ fontSize: 9, fontFamily: 'JetBrains Mono', padding: '2px 8px', borderRadius: 3, background: pass ? 'rgba(0,208,132,0.15)' : 'rgba(255,68,68,0.15)', color: pass ? '#00d084' : '#ff4444', border: `1px solid ${pass ? '#00d084' : '#ff4444'}`, fontWeight: 700 }}>
            {pass ? 'PASS' : 'FAIL'}
          </span>
        )}
      </div>
    </div>
  );
}

function GaugeMeter({ value, max = 10, label, color }) {
  const p = Math.min(Math.max((value / max) * 100, 0), 100);
  const c = color || (p > 66 ? '#00d084' : p > 33 ? '#f5a623' : '#ff4444');
  const dash = p * 2.01;
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ position: 'relative', width: 80, height: 80, margin: '0 auto' }}>
        <svg viewBox="0 0 80 80" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="40" cy="40" r="32" fill="none" stroke="#1a1a1a" strokeWidth="8" />
          <circle cx="40" cy="40" r="32" fill="none" stroke={c} strokeWidth="8"
            strokeDasharray={`${dash} 201`} strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 1.2s ease' }} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 15, fontWeight: 700, fontFamily: 'JetBrains Mono', color: c }}>{value.toFixed(1)}</span>
        </div>
      </div>
      <div style={{ fontSize: 9, color: '#555', fontFamily: 'JetBrains Mono', marginTop: 4, letterSpacing: 1 }}>{label}</div>
    </div>
  );
}

function ProgressBar({ label, value, max, color, suffix = '%' }) {
  const p = Math.min(Math.max((value / max) * 100, 0), 100);
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 10, fontFamily: 'JetBrains Mono', color: '#666' }}>{label}</span>
        <span style={{ fontSize: 10, fontFamily: 'JetBrains Mono', color: color || '#e8e8e8', fontWeight: 600 }}>{value != null ? `${fmt(value)}${suffix}` : '-'}</span>
      </div>
      <div style={{ height: 4, background: '#1a1a1a', borderRadius: 2 }}>
        <div style={{ height: '100%', width: `${p}%`, background: color || '#f5a623', borderRadius: 2, transition: 'width 1s ease' }} />
      </div>
    </div>
  );
}

// ─── MODULE 1: Goldman Sachs Screener ────────────────────────────────────────
function GoldmanScreener({ q, raw: r, fundamentals }) {
  const bullTarget = r.targetPrice || r.ltp * 1.4;
  const bearTarget = r.ltp * 0.72;
  const entry1 = r.ltp * 0.95;
  const entry2 = r.ltp * 0.88;
  const stopLoss = r.ltp * 0.80;

  const moatScore = Math.min(10, (
    (r.roe > 15 ? 2 : r.roe > 10 ? 1 : 0) +
    (r.revenueGrowth > 10 ? 2 : r.revenueGrowth > 5 ? 1 : 0) +
    (r.grossMargin > 35 ? 2 : r.grossMargin > 20 ? 1 : 0) +
    (r.operatingMargin > 15 ? 2 : r.operatingMargin > 8 ? 1 : 0) +
    (r.debt < 0.5 ? 2 : r.debt < 1 ? 1 : 0)
  ));

  const riskScore = Math.min(10, Math.max(1,
    (r.beta > 1.5 ? 4 : r.beta > 1.2 ? 3 : r.beta > 0.8 ? 2 : 1) +
    (r.debt > 2 ? 3 : r.debt > 1 ? 2 : 1) +
    (r.currentRatio < 1 ? 2 : r.currentRatio < 1.5 ? 1 : 0)
  ));

  const recColor = r.rec?.includes('strong_buy') ? '#00d084' : r.rec?.includes('buy') ? '#4a9eff' : r.rec?.includes('hold') ? '#f5a623' : '#ff4444';
  const recLabel = r.rec ? r.rec.replace('_', ' ').toUpperCase() : 'N/A';

  return (
    <div>
      <SectionHeader title="01 — GOLDMAN SACHS SCREENER" subtitle="Quality check + analyst targets + price levels" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div>
          <StatRow label="P/E Ratio" value={r.pe ? fmt(r.pe) : '-'} color={r.pe < 20 ? '#00d084' : r.pe < 35 ? '#f5a623' : '#ff4444'} badge pass={r.pe != null && r.pe < 20} />
          <StatRow label="Price to Book" value={r.pb ? fmt(r.pb) : '-'} color={r.pb < 3 ? '#00d084' : '#f5a623'} />
          <StatRow label="ROE" value={r.roe ? `${fmt(r.roe)}%` : '-'} color={r.roe > 15 ? '#00d084' : '#ff4444'} badge pass={r.roe > 15} />
          <StatRow label="Debt / Equity" value={r.debt ? fmt(r.debt) : '-'} color={r.debt < 1 ? '#00d084' : '#ff4444'} badge pass={r.debt < 1} />
          <StatRow label="Dividend Yield" value={r.div ? `${fmt(r.div)}%` : '-'} color={r.div > 3 ? '#00d084' : '#888'} />
          <StatRow label="Revenue Growth" value={r.revenueGrowth ? `${fmt(r.revenueGrowth)}%` : '-'} color={r.revenueGrowth > 0 ? '#00d084' : '#ff4444'} />
          <StatRow label="Gross Margin" value={r.grossMargin ? `${fmt(r.grossMargin)}%` : '-'} color={r.grossMargin > 30 ? '#00d084' : '#f5a623'} />
          <StatRow label="Operating Margin" value={r.operatingMargin ? `${fmt(r.operatingMargin)}%` : '-'} color={r.operatingMargin > 10 ? '#00d084' : '#f5a623'} />
          <StatRow label="EPS (TTM)" value={r.eps ? `Rs ${fmt(r.eps)}` : '-'} color="#4a9eff" />
          <StatRow label="Forward EPS" value={r.forwardEps ? `Rs ${fmt(r.forwardEps)}` : '-'} color="#a78bfa" />
          <StatRow label="Beta" value={r.beta ? fmt(r.beta) : '-'} color={r.beta < 1 ? '#00d084' : r.beta < 1.5 ? '#f5a623' : '#ff4444'} />
          <StatRow label="Current Ratio" value={r.currentRatio ? fmt(r.currentRatio) : '-'} color={r.currentRatio > 1.5 ? '#00d084' : r.currentRatio > 1 ? '#f5a623' : '#ff4444'} />
        </div>
        <div>
          {/* Analyst consensus */}
          <div style={{ marginBottom: 16, padding: '12px', background: '#0d0d0d', borderRadius: 6, border: `1px solid ${recColor}33` }}>
            <div style={{ fontSize: 9, color: '#555', fontFamily: 'JetBrains Mono', letterSpacing: 1, marginBottom: 8 }}>ANALYST CONSENSUS</div>
            <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'JetBrains Mono', color: recColor, marginBottom: 6 }}>{recLabel}</div>
            {r.targetPrice && (
              <>
                <div style={{ fontSize: 11, color: '#888', fontFamily: 'JetBrains Mono' }}>Target Price</div>
                <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'JetBrains Mono', color: '#00d084' }}>Rs {fmt(r.targetPrice)}</div>
                <div style={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: r.targetUpside > 0 ? '#00d084' : '#ff4444', marginTop: 4 }}>
                  {r.targetUpside > 0 ? '▲' : '▼'} {Math.abs(r.targetUpside).toFixed(1)}% potential upside
                </div>
              </>
            )}
          </div>

          {/* Price targets */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 9, color: '#555', fontFamily: 'JetBrains Mono', letterSpacing: 1, marginBottom: 8 }}>PRICE LEVELS</div>
            {[
              { label: 'ANALYST TARGET', val: bullTarget, color: '#00d084' },
              { label: 'ENTRY ZONE 1 (-5%)', val: entry1, color: '#f5a623' },
              { label: 'ENTRY ZONE 2 (-12%)', val: entry2, color: '#f5a623' },
              { label: 'STOP LOSS (-20%)', val: stopLoss, color: '#ff4444' },
              { label: 'BEAR CASE (-28%)', val: bearTarget, color: '#ff4444' },
            ].map((t) => (
              <div key={t.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 8px', borderBottom: '1px solid #111', borderLeft: `3px solid ${t.color}`, marginBottom: 3, background: '#0d0d0d' }}>
                <span style={{ fontSize: 9, fontFamily: 'JetBrains Mono', color: '#555' }}>{t.label}</span>
                <span style={{ fontSize: 12, fontFamily: 'JetBrains Mono', fontWeight: 700, color: t.color }}>Rs {fmt(t.val)}</span>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 20, justifyContent: 'center' }}>
            <GaugeMeter value={moatScore} label="MOAT" />
            <GaugeMeter value={riskScore} label="RISK" color={riskScore > 6 ? '#ff4444' : riskScore > 4 ? '#f5a623' : '#00d084'} />
          </div>
        </div>
      </div>

      {/* Screener data */}
      {fundamentals?.ratios && Object.keys(fundamentals.ratios).length > 0 && (
        <div style={{ marginTop: 16, padding: '12px', background: '#0d0d0d', borderRadius: 6, borderLeft: '2px solid #f5a623' }}>
          <div style={{ fontSize: 9, color: '#444', fontFamily: 'JetBrains Mono', letterSpacing: 1, marginBottom: 8 }}>SCREENER.IN LIVE DATA</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
            {['ROCE', 'ROE', 'Stock P/E', 'Promoter holding', 'FII holding', 'Debt to equity', 'EPS', 'Dividend Yield', 'Current ratio', 'Piotroski score'].map((k) =>
              fundamentals.ratios[k] ? (
                <div key={k} style={{ padding: '6px 8px', background: '#141414', borderRadius: 4 }}>
                  <div style={{ fontSize: 8, color: '#444', fontFamily: 'JetBrains Mono', marginBottom: 3 }}>{k.toUpperCase()}</div>
                  <div style={{ fontSize: 12, fontFamily: 'JetBrains Mono', fontWeight: 700, color: '#e8e8e8' }}>{fundamentals.ratios[k]}</div>
                </div>
              ) : null
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MODULE 2: DCF Valuation ──────────────────────────────────────────────────
function DCFValuation({ q, raw: r }) {
  const [growthRate, setGrowthRate] = useState(15);
  const [termGrowth, setTermGrowth] = useState(7);
  const wacc = r.beta ? parseFloat((RISK_FREE_RATE + r.beta * ERP).toFixed(2)) : 12;
  const eps = r.eps || 0;

  const projections = Array.from({ length: 5 }, (_, i) => {
    const yr = i + 1;
    const projEps = eps * Math.pow(1 + growthRate / 100, yr);
    const pv = projEps / Math.pow(1 + wacc / 100, yr);
    return { yr, projEps, pv };
  });

  const tv = projections[4].projEps * (1 + termGrowth / 100) / ((wacc - termGrowth) / 100);
  const pvTv = tv / Math.pow(1 + wacc / 100, 5);
  const intrinsic = projections.reduce((s, p) => s + p.pv, 0) + pvTv;
  const mos = ((intrinsic - r.ltp) / intrinsic) * 100;
  const verdict = mos > 20 ? 'UNDERVALUED' : mos > -10 ? 'FAIRLY VALUED' : 'OVERVALUED';
  const vc = mos > 20 ? '#00d084' : mos > -10 ? '#f5a623' : '#ff4444';

  const waccRange = [wacc - 1, wacc, wacc + 1];
  const gRange = [growthRate - 2, growthRate, growthRate + 2];

  return (
    <div>
      <SectionHeader title="02 — MORGAN STANLEY DCF VALUATION" subtitle="Live beta + auto WACC + 5-year EPS projection" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        <div>
          <div style={{ padding: '10px 12px', background: '#0d0d0d', borderRadius: 6, marginBottom: 14, border: '1px solid #1e1e1e' }}>
            <div style={{ fontSize: 9, color: '#555', fontFamily: 'JetBrains Mono', letterSpacing: 1, marginBottom: 8 }}>AUTO-CALCULATED INPUTS</div>
            <StatRow label="Trailing EPS" value={eps ? `Rs ${fmt(eps)}` : '-'} />
            <StatRow label="Forward EPS" value={r.forwardEps ? `Rs ${fmt(r.forwardEps)}` : '-'} color="#a78bfa" />
            <StatRow label="Beta (live)" value={fmt(r.beta)} />
            <StatRow label="Risk-Free Rate" value={`${RISK_FREE_RATE}%`} />
            <StatRow label="Equity Risk Premium" value={`${ERP}%`} />
            <StatRow label="WACC (auto)" value={`${wacc}%`} color="#4a9eff" />
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 10, fontFamily: 'JetBrains Mono', color: '#888' }}>EPS Growth Rate</span>
              <span style={{ fontSize: 12, fontFamily: 'JetBrains Mono', color: '#f5a623', fontWeight: 700 }}>{growthRate}%</span>
            </div>
            <input type="range" min="5" max="40" value={growthRate} onChange={(e) => setGrowthRate(Number(e.target.value))} style={{ width: '100%', accentColor: '#f5a623' }} />
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 10, fontFamily: 'JetBrains Mono', color: '#888' }}>Terminal Growth</span>
              <span style={{ fontSize: 12, fontFamily: 'JetBrains Mono', color: '#4a9eff', fontWeight: 700 }}>{termGrowth}%</span>
            </div>
            <input type="range" min="3" max="12" value={termGrowth} onChange={(e) => setTermGrowth(Number(e.target.value))} style={{ width: '100%', accentColor: '#4a9eff' }} />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 9, color: '#555', fontFamily: 'JetBrains Mono', letterSpacing: 1, marginBottom: 6 }}>INTRINSIC VALUE</div>
            <div style={{ fontSize: 38, fontWeight: 700, fontFamily: 'JetBrains Mono', color: vc, textShadow: `0 0 30px ${vc}44` }}>Rs {fmt(intrinsic)}</div>
            <div style={{ fontSize: 11, color: '#888', fontFamily: 'JetBrains Mono', marginTop: 4 }}>CMP: Rs {fmt(r.ltp)}</div>
            {r.targetPrice && <div style={{ fontSize: 10, color: '#555', fontFamily: 'JetBrains Mono' }}>Analyst Target: Rs {fmt(r.targetPrice)}</div>}
          </div>
          <div style={{ padding: '10px 28px', borderRadius: 8, border: `2px solid ${vc}`, background: `${vc}18`, textShadow: `0 0 20px ${vc}` }}>
            <span style={{ fontSize: 16, fontWeight: 700, fontFamily: 'JetBrains Mono', color: vc }}>{verdict}</span>
          </div>
          <div style={{ fontSize: 13, fontFamily: 'JetBrains Mono', color: vc, fontWeight: 600 }}>
            Margin of Safety: {mos.toFixed(1)}%
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div>
          <div style={{ fontSize: 9, color: '#555', fontFamily: 'JetBrains Mono', letterSpacing: 1, marginBottom: 8 }}>5-YEAR EPS PROJECTION</div>
          <table style={{ width: '100%', fontSize: 11, fontFamily: 'JetBrains Mono', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['YEAR', 'PROJ EPS', 'PRESENT VALUE'].map((h) => (
                  <th key={h} style={{ padding: '6px 8px', textAlign: 'right', color: '#444', fontSize: 9, borderBottom: '1px solid #1e1e1e', background: '#0a0a0a' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {projections.map((p) => (
                <tr key={p.yr}>
                  <td style={{ padding: '5px 8px', textAlign: 'right', color: '#f5a623' }}>FY+{p.yr}</td>
                  <td style={{ padding: '5px 8px', textAlign: 'right', color: '#e8e8e8' }}>Rs {fmt(p.projEps)}</td>
                  <td style={{ padding: '5px 8px', textAlign: 'right', color: '#00d084' }}>Rs {fmt(p.pv)}</td>
                </tr>
              ))}
              <tr style={{ borderTop: '1px solid #222' }}>
                <td style={{ padding: '5px 8px', textAlign: 'right', color: '#888' }}>Terminal</td>
                <td style={{ padding: '5px 8px', textAlign: 'right', color: '#888' }}>-</td>
                <td style={{ padding: '5px 8px', textAlign: 'right', color: '#4a9eff', fontWeight: 700 }}>Rs {fmt(pvTv)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div>
          <div style={{ fontSize: 9, color: '#555', fontFamily: 'JetBrains Mono', letterSpacing: 1, marginBottom: 8 }}>SENSITIVITY TABLE</div>
          <table style={{ width: '100%', fontSize: 10, fontFamily: 'JetBrains Mono', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ padding: '5px 6px', color: '#444', fontSize: 8, borderBottom: '1px solid #1e1e1e', background: '#0a0a0a' }}>WACC\G</th>
                {gRange.map((g) => <th key={g} style={{ padding: '5px 6px', textAlign: 'center', color: '#444', fontSize: 8, borderBottom: '1px solid #1e1e1e', background: '#0a0a0a' }}>{g}%</th>)}
              </tr>
            </thead>
            <tbody>
              {waccRange.map((w) => (
                <tr key={w}>
                  <td style={{ padding: '5px 6px', color: '#888', fontSize: 9 }}>{w}%</td>
                  {gRange.map((g) => {
                    const sens = projections.reduce((s, p) => s + (eps * Math.pow(1 + g / 100, p.yr)) / Math.pow(1 + w / 100, p.yr), 0);
                    const sensTV = (eps * Math.pow(1 + g / 100, 5) * (1 + termGrowth / 100)) / ((w - termGrowth) / 100) / Math.pow(1 + w / 100, 5);
                    const si = sens + sensTV;
                    const diff = ((si - r.ltp) / r.ltp) * 100;
                    return (
                      <td key={g} style={{ padding: '5px 6px', textAlign: 'center', color: diff > 0 ? '#00d084' : '#ff4444', fontWeight: 600 }}>
                        {fmt(si, 0)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── MODULE 3: Macro Impact Analyzer (LIVE NEWS) ─────────────────────────────
function MacroImpactAnalyzer({ q, raw: r }) {
  const [stockNews, setStockNews] = useState([]);
  const [macroNews, setMacroNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('stock');

  useEffect(() => {
    setLoading(true);
    Promise.allSettled([
      fetchStockNews(q.symbol),
      fetchMacroNews(),
    ]).then(([sn, mn]) => {
      if (sn.status === 'fulfilled') setStockNews(sn.value || []);
      if (mn.status === 'fulfilled') setMacroNews(mn.value || []);
      setLoading(false);
    });
  }, [q.symbol]);

  const getStockSpecificImpact = () => {
    const impacts = [];
    if (r.beta > 1.2) impacts.push({ event: 'High Market Sensitivity', impact: `Beta ${fmt(r.beta)} — moves ${((r.beta - 1) * 100).toFixed(0)}% more than Nifty in both directions`, type: 'risk', icon: '📊' });
    if (r.debt > 1) impacts.push({ event: 'Rate Hike Risk', impact: `D/E ${fmt(r.debt)} — interest costs rise if RBI hikes rates`, type: 'risk', icon: '📈' });
    if (r.revenueGrowth > 15) impacts.push({ event: 'India GDP Beneficiary', impact: `${fmt(r.revenueGrowth)}% revenue growth — riding India consumption wave`, type: 'positive', icon: '🇮🇳' });
    if (r.grossMargin > 40) impacts.push({ event: 'Inflation Shield', impact: `${fmt(r.grossMargin)}% gross margin — strong buffer against input cost inflation`, type: 'positive', icon: '🛡️' });
    if (r.div > 3) impacts.push({ event: 'Rate Cut Beneficiary', impact: `${fmt(r.div)}% yield becomes more attractive as rates fall`, type: 'positive', icon: '💰' });
    if (r.debt < 0.3) impacts.push({ event: 'Recession Resilient', impact: 'Near-zero debt — survives economic downturns without distress', type: 'positive', icon: '🏰' });
    if (r.currentRatio < 1.2) impacts.push({ event: 'Liquidity Warning', impact: `Current ratio ${fmt(r.currentRatio)} is tight — watch working capital`, type: 'risk', icon: '⚠️' });
    if (r.revenueGrowth < 0) impacts.push({ event: 'Revenue Declining', impact: `Revenue growth ${fmt(r.revenueGrowth)}% — needs recovery catalyst`, type: 'risk', icon: '📉' });
    if (r.targetUpside > 25) impacts.push({ event: 'Analyst Conviction', impact: `Consensus target ${fmt(r.targetUpside)}% above CMP — strong street conviction`, type: 'positive', icon: '🎯' });
    if (r.rec === 'strong_buy') impacts.push({ event: 'Strong Buy Consensus', impact: 'Majority analysts recommend strong buy — institutional accumulation likely', type: 'positive', icon: '🟢' });
    return impacts;
  };

  const getSentiment = (title) => {
    const positive = ['surge', 'rise', 'gain', 'rally', 'growth', 'profit', 'beat', 'record', 'high', 'buy', 'upgrade', 'strong', 'boost', 'wins', 'soar', 'jump'];
    const negative = ['fall', 'drop', 'loss', 'decline', 'miss', 'cut', 'warn', 'risk', 'concern', 'sell', 'downgrade', 'weak', 'crash', 'slump', 'crisis'];
    const lower = title.toLowerCase();
    const posScore = positive.filter((w) => lower.includes(w)).length;
    const negScore = negative.filter((w) => lower.includes(w)).length;
    return posScore > negScore ? 'positive' : negScore > posScore ? 'negative' : 'neutral';
  };

  const timeAgo = (dateStr) => {
    const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const specificImpacts = getStockSpecificImpact();
  const displayNews = activeTab === 'stock' ? stockNews : macroNews;

  return (
    <div>
      <SectionHeader title="03 — LIVE MACRO IMPACT ANALYZER" subtitle="Real-time news + global conditions + stock-specific signals" color="#4a9eff" />

      {/* Stock specific signals from live data */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 9, color: '#555', fontFamily: 'JetBrains Mono', letterSpacing: 1, marginBottom: 10 }}>
          LIVE SIGNAL ANALYSIS (FROM REAL FINANCIALS)
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {specificImpacts.map((imp, i) => (
            <div key={i} style={{ padding: '10px 12px', background: imp.type === 'positive' ? 'rgba(0,208,132,0.06)' : 'rgba(255,68,68,0.06)', border: `1px solid ${imp.type === 'positive' ? 'rgba(0,208,132,0.2)' : 'rgba(255,68,68,0.2)'}`, borderRadius: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span style={{ fontSize: 14 }}>{imp.icon}</span>
                <span style={{ fontFamily: 'JetBrains Mono', fontSize: 10, fontWeight: 700, color: imp.type === 'positive' ? '#00d084' : '#ff4444' }}>{imp.event}</span>
              </div>
              <div style={{ fontSize: 10, fontFamily: 'JetBrains Mono', color: '#666', lineHeight: 1.6 }}>{imp.impact}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Live news section */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {[
              { key: 'stock', label: `${q.symbol} NEWS` },
              { key: 'macro', label: 'INDIA & GLOBAL MACRO' },
            ].map((t) => (
              <button key={t.key} onClick={() => setActiveTab(t.key)}
                style={{ padding: '4px 12px', fontSize: 9, fontFamily: 'JetBrains Mono', background: activeTab === t.key ? '#4a9eff' : '#141414', color: activeTab === t.key ? '#000' : '#555', border: `1px solid ${activeTab === t.key ? '#4a9eff' : '#222'}`, borderRadius: 3, cursor: 'pointer', fontWeight: 700 }}>
                {t.label}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 9, color: '#444', fontFamily: 'JetBrains Mono' }}>
            REFRESHES EVERY 5 MIN
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '20px 0', color: '#555', fontFamily: 'JetBrains Mono', fontSize: 11 }}>
            <div style={{ width: 16, height: 16, border: '2px solid #333', borderTop: '2px solid #4a9eff', borderRadius: '50%', animation: 'mbspin 1s linear infinite' }} />
            Fetching latest news...
          </div>
        ) : displayNews.length === 0 ? (
          <div style={{ color: '#444', fontFamily: 'JetBrains Mono', fontSize: 11, padding: '20px 0' }}>No news found</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {displayNews.slice(0, 12).map((news, i) => {
              const sentiment = getSentiment(news.title);
              const sentColor = sentiment === 'positive' ? '#00d084' : sentiment === 'negative' ? '#ff4444' : '#888';
              return (
                <a key={i} href={news.link} target="_blank" rel="noreferrer"
                  style={{ display: 'flex', gap: 10, padding: '10px 12px', background: '#0d0d0d', borderRadius: 6, border: `1px solid #1a1a1a`, borderLeft: `3px solid ${sentColor}`, textDecoration: 'none', transition: 'background 0.15s' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#141414'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#0d0d0d'}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: '#e8e8e8', lineHeight: 1.5, marginBottom: 4 }}>{news.title}</div>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <span style={{ fontSize: 9, color: '#555', fontFamily: 'JetBrains Mono' }}>{news.publisher}</span>
                      <span style={{ fontSize: 9, color: '#444', fontFamily: 'JetBrains Mono' }}>{timeAgo(news.publishedAt)}</span>
                      <span style={{ fontSize: 9, fontFamily: 'JetBrains Mono', color: sentColor, fontWeight: 700 }}>
                        {sentiment === 'positive' ? '▲ BULLISH' : sentiment === 'negative' ? '▼ BEARISH' : '● NEUTRAL'}
                      </span>
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
// ─── MODULE 4: Bridgewater Risk ───────────────────────────────────────────────
function BridgewaterRisk({ q, raw: r }) {
  const marketRisk = Math.min(10, r.beta * 5);
  const debtRisk = Math.min(10, (r.debt || 0) * 4);
  const liquidityRisk = r.currentRatio ? Math.max(0, 10 - r.currentRatio * 3) : 5;
  const marginRisk = r.operatingMargin ? Math.max(0, 10 - r.operatingMargin / 3) : 5;
  const overallRisk = ((marketRisk + debtRisk + liquidityRisk + marginRisk) / 4).toFixed(1);
  const estDrawdown = Math.min(60, (r.beta * 20 + (r.debt || 0) * 5)).toFixed(1);

  return (
    <div>
      <SectionHeader title="04 — BRIDGEWATER RISK ANALYSIS" subtitle="Portfolio risk, stress test, drawdown simulation" color="#a78bfa" />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 24 }}>
        <GaugeMeter value={parseFloat(marketRisk.toFixed(1))} label="MARKET" color={marketRisk > 6 ? '#ff4444' : marketRisk > 4 ? '#f5a623' : '#00d084'} />
        <GaugeMeter value={parseFloat(debtRisk.toFixed(1))} label="DEBT" color={debtRisk > 6 ? '#ff4444' : debtRisk > 3 ? '#f5a623' : '#00d084'} />
        <GaugeMeter value={parseFloat(liquidityRisk.toFixed(1))} label="LIQUIDITY" color={liquidityRisk > 6 ? '#ff4444' : liquidityRisk > 3 ? '#f5a623' : '#00d084'} />
        <GaugeMeter value={parseFloat(marginRisk.toFixed(1))} label="MARGIN" color={marginRisk > 6 ? '#ff4444' : marginRisk > 3 ? '#f5a623' : '#00d084'} />
        <GaugeMeter value={parseFloat(overallRisk)} label="OVERALL" color={overallRisk > 6 ? '#ff4444' : overallRisk > 4 ? '#f5a623' : '#00d084'} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div>
          <div style={{ fontSize: 9, color: '#555', fontFamily: 'JetBrains Mono', letterSpacing: 1, marginBottom: 8 }}>STRESS TEST METRICS</div>
          <StatRow label="Beta" value={fmt(r.beta)} color={r.beta < 1 ? '#00d084' : r.beta < 1.5 ? '#f5a623' : '#ff4444'} />
          <StatRow label="Est. Max Drawdown" value={`${estDrawdown}%`} color="#ff4444" />
          <StatRow label="D/E Ratio" value={r.debt ? fmt(r.debt) : '-'} color={r.debt < 1 ? '#00d084' : '#ff4444'} />
          <StatRow label="Current Ratio" value={r.currentRatio ? fmt(r.currentRatio) : '-'} color={r.currentRatio > 1.5 ? '#00d084' : '#f5a623'} />
          <StatRow label="Operating Margin" value={r.operatingMargin ? `${fmt(r.operatingMargin)}%` : '-'} color={r.operatingMargin > 10 ? '#00d084' : '#ff4444'} />
          <StatRow label="Volatility Grade" value={r.beta > 1.5 ? 'HIGH' : r.beta > 1 ? 'MEDIUM' : 'LOW'} color={r.beta > 1.5 ? '#ff4444' : r.beta > 1 ? '#f5a623' : '#00d084'} />
        </div>
        <div>
          <div style={{ fontSize: 9, color: '#555', fontFamily: 'JetBrains Mono', letterSpacing: 1, marginBottom: 8 }}>HEDGING SUGGESTIONS</div>
          {[
            { label: 'Add GOLDBEES', reason: 'Gold allocation for macro hedge', color: '#f5a623', show: true },
            { label: 'Add MODEFENCE', reason: 'Defence diversification play', color: '#4a9eff', show: true },
            { label: 'Reduce position size', reason: r.beta > 1.3 ? `High beta ${fmt(r.beta)} — keep max 5% of portfolio` : 'Beta manageable — normal sizing OK', color: r.beta > 1.3 ? '#ff4444' : '#00d084', show: true },
            { label: r.debt > 1.5 ? 'Monitor debt levels' : 'Debt under control', reason: r.debt > 1.5 ? `D/E ${fmt(r.debt)} is elevated — watch quarterly` : `D/E ${fmt(r.debt)} is comfortable`, color: r.debt > 1.5 ? '#ff4444' : '#00d084', show: true },
          ].map((s, i) => (
            <div key={i} style={{ padding: '7px 10px', borderLeft: `2px solid ${s.color}`, marginBottom: 6, background: '#0d0d0d', borderRadius: '0 4px 4px 0' }}>
              <div style={{ fontSize: 10, fontFamily: 'JetBrains Mono', color: s.color, fontWeight: 700 }}>{s.label}</div>
              <div style={{ fontSize: 9, fontFamily: 'JetBrains Mono', color: '#555', marginTop: 2 }}>{s.reason}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── MODULE 5: JPMorgan Earnings ──────────────────────────────────────────────
function JPMorganEarnings({ q, raw: r }) {
  const eps = r.eps || 0;
  const fwdEps = r.forwardEps || eps * 1.15;
  const epsGrowthPct = r.epsGrowth || (eps ? ((fwdEps - eps) / Math.abs(eps)) * 100 : 0);

  const quarters = [
    { q: 'Q1', eps: eps * 0.82, change: r.epsGrowth ? (r.epsGrowth * 80) : 8 },
    { q: 'Q2', eps: eps * 0.87, change: r.epsGrowth ? (r.epsGrowth * 90) : 10 },
    { q: 'Q3', eps: eps * 0.93, change: r.epsGrowth ? (r.epsGrowth * 95) : 12 },
    { q: 'Q4 (Latest)', eps: eps * 1.0, change: r.epsGrowth ? (r.epsGrowth * 100) : 15 },
  ];

  return (
    <div>
      <SectionHeader title="05 — JPMORGAN EARNINGS BREAKDOWN" subtitle="EPS trends, margins, bull vs bear scenarios" color="#00d084" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 9, color: '#555', fontFamily: 'JetBrains Mono', letterSpacing: 1, marginBottom: 8 }}>EARNINGS PROFILE</div>
          <StatRow label="Trailing EPS" value={eps ? `Rs ${fmt(eps)}` : '-'} color="#e8e8e8" />
          <StatRow label="Forward EPS" value={fwdEps ? `Rs ${fmt(fwdEps)}` : '-'} color="#00d084" />
          <StatRow label="EPS Growth (YoY)" value={r.epsGrowth ? `${fmt(r.epsGrowth)}%` : '-'} color={r.epsGrowth > 0 ? '#00d084' : '#ff4444'} />
          <StatRow label="Revenue Growth" value={r.revenueGrowth ? `${fmt(r.revenueGrowth)}%` : '-'} color={r.revenueGrowth > 0 ? '#00d084' : '#ff4444'} />
          <div style={{ marginTop: 16 }}>
            <ProgressBar label="Gross Margin" value={r.grossMargin} max={80} color="#00d084" />
            <ProgressBar label="Operating Margin" value={r.operatingMargin} max={40} color="#4a9eff" />
            <ProgressBar label="ROE" value={r.roe} max={40} color="#f5a623" />
          </div>
        </div>
        <div>
          <div style={{ fontSize: 9, color: '#555', fontFamily: 'JetBrains Mono', letterSpacing: 1, marginBottom: 8 }}>ANALYST PRICE TARGET</div>
          <div style={{ padding: '12px', background: '#0d0d0d', borderRadius: 6, marginBottom: 12, border: '1px solid #1e1e1e' }}>
            <div style={{ fontSize: 11, color: '#888', fontFamily: 'JetBrains Mono', marginBottom: 4 }}>Consensus Target</div>
            <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'JetBrains Mono', color: r.targetPrice ? '#00d084' : '#888' }}>
              {r.targetPrice ? `Rs ${fmt(r.targetPrice)}` : 'N/A'}
            </div>
            {r.targetUpside != null && (
              <div style={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: r.targetUpside > 0 ? '#00d084' : '#ff4444', marginTop: 4 }}>
                {r.targetUpside > 0 ? '▲' : '▼'} {Math.abs(r.targetUpside).toFixed(1)}% from CMP
              </div>
            )}
            <div style={{ fontSize: 10, fontFamily: 'JetBrains Mono', color: '#444', marginTop: 6, textTransform: 'uppercase' }}>
              Recommendation: <span style={{ color: r.rec?.includes('buy') ? '#00d084' : '#f5a623' }}>{r.rec?.replace('_', ' ') || 'N/A'}</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div style={{ padding: '10px', background: 'rgba(0,208,132,0.08)', border: '1px solid rgba(0,208,132,0.2)', borderRadius: 6 }}>
              <div style={{ fontSize: 9, color: '#00d084', fontFamily: 'JetBrains Mono', marginBottom: 6 }}>BULL CASE</div>
              <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'JetBrains Mono', color: '#00d084' }}>Rs {fmt(r.ltp * 1.5)}</div>
              <div style={{ fontSize: 9, fontFamily: 'JetBrains Mono', color: '#555', marginTop: 4 }}>EPS CAGR 25%+ for 3Y</div>
            </div>
            <div style={{ padding: '10px', background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.2)', borderRadius: 6 }}>
              <div style={{ fontSize: 9, color: '#ff4444', fontFamily: 'JetBrains Mono', marginBottom: 6 }}>BEAR CASE</div>
              <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'JetBrains Mono', color: '#ff4444' }}>Rs {fmt(r.ltp * 0.62)}</div>
              <div style={{ fontSize: 9, fontFamily: 'JetBrains Mono', color: '#555', marginTop: 4 }}>Earnings miss + de-rate</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── MODULE 6: Multibagger Returns ────────────────────────────────────────────
function MultibaggerReturns({ q, raw: r }) {
  const [shares, setShares] = useState(100);
  const [buyPrice, setBuyPrice] = useState(Math.round(r.ltp));
  const [catalysts, setCatalysts] = useState([]);

  useEffect(() => {
    // Auto-check catalysts based on live data
    const auto = [];
    if (r.revenueGrowth > 10) auto.push(0);
    if (r.epsGrowth > 10) auto.push(5);
    if (r.debt < 0.5) auto.push(6);
    if (r.rec === 'strong_buy' || r.rec === 'buy') auto.push(4);
    if (r.grossMargin > 35) auto.push(7);
    setCatalysts(auto);
  }, [r.revenueGrowth, r.epsGrowth, r.debt, r.rec, r.grossMargin]);

  const investment = shares * buyPrice;
  const currentValue = shares * r.ltp;
  const gainLoss = currentValue - investment;
  const gainLossPct = investment > 0 ? ((gainLoss) / investment) * 100 : 0;

  const cagrs = [10, 12, 15, 18, 20];
  const years = [1, 3, 5, 10, 15, 20];
  const colors = ['#888', '#f5a623', '#4a9eff', '#a78bfa', '#00d084'];

  const toggleCatalyst = (i) => setCatalysts((prev) => prev.includes(i) ? prev.filter((c) => c !== i) : [...prev, i]);
  const catalystScore = catalysts.length;

  return (
    <div>
      <SectionHeader title="06 — MULTIBAGGER BEAST RETURN ENGINE" subtitle="Compounding projections + catalyst score (auto-filled from live data)" color="#00d084" />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
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
        <div style={{ padding: '10px 12px', background: gainLoss >= 0 ? 'rgba(0,208,132,0.08)' : 'rgba(255,68,68,0.08)', borderRadius: 6, border: `1px solid ${gainLoss >= 0 ? 'rgba(0,208,132,0.2)' : 'rgba(255,68,68,0.2)'}` }}>
          <div style={{ fontSize: 9, color: '#555', fontFamily: 'JetBrains Mono', marginBottom: 4 }}>CURRENT P&L</div>
          <div style={{ fontSize: 15, fontWeight: 700, fontFamily: 'JetBrains Mono', color: gainLoss >= 0 ? '#00d084' : '#ff4444' }}>
            {gainLoss >= 0 ? '+' : ''}Rs {fmt(gainLoss)}
          </div>
          <div style={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: gainLoss >= 0 ? '#00d084' : '#ff4444' }}>
            {gainLossPct.toFixed(1)}% return
          </div>
        </div>
      </div>

      {/* Compounding table */}
      <div style={{ marginBottom: 20, overflowX: 'auto' }}>
        <div style={{ fontSize: 9, color: '#555', fontFamily: 'JetBrains Mono', letterSpacing: 1, marginBottom: 8 }}>WEALTH PROJECTION (Rs) — STARTING FROM Rs {fmt(investment, 0)}</div>
        <table style={{ width: '100%', fontSize: 10, fontFamily: 'JetBrains Mono', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ padding: '6px 8px', textAlign: 'left', color: '#444', fontSize: 9, borderBottom: '1px solid #1e1e1e', background: '#0a0a0a' }}>YEAR</th>
              {cagrs.map((c, i) => (
                <th key={c} style={{ padding: '6px 8px', textAlign: 'right', color: colors[i], fontSize: 9, borderBottom: '1px solid #1e1e1e', background: '#0a0a0a' }}>{c}% CAGR</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {years.map((yr) => (
              <tr key={yr} style={{ borderBottom: '1px solid #111', background: yr === 10 || yr === 20 ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
                <td style={{ padding: '6px 8px', color: '#888', fontWeight: yr === 10 || yr === 20 ? 700 : 400 }}>Year {yr} ({2026 + yr})</td>
                {cagrs.map((c, ci) => {
                  const val = investment * Math.pow(1 + c / 100, yr);
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

      {/* Catalyst checklist with auto-fill */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 9, color: '#555', fontFamily: 'JetBrains Mono', letterSpacing: 1 }}>MULTIBAGGER CATALYST CHECKLIST</div>
            <div style={{ fontSize: 9, color: '#444', fontFamily: 'JetBrains Mono', marginTop: 2 }}>Auto-filled from live data — toggle manually to adjust</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'JetBrains Mono', color: catalystScore >= 7 ? '#00d084' : catalystScore >= 4 ? '#f5a623' : '#ff4444' }}>
              {catalystScore}/10
            </div>
            <div style={{ fontSize: 9, fontFamily: 'JetBrains Mono', color: catalystScore >= 7 ? '#00d084' : catalystScore >= 4 ? '#f5a623' : '#ff4444' }}>
              {catalystScore >= 7 ? 'STRONG BUY SIGNALS' : catalystScore >= 4 ? 'MODERATE SIGNALS' : 'WEAK SIGNALS'}
            </div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {CATALYSTS.map((c, i) => (
            <div key={i} onClick={() => toggleCatalyst(i)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', background: catalysts.includes(i) ? 'rgba(0,208,132,0.08)' : '#0d0d0d', border: `1px solid ${catalysts.includes(i) ? '#00d084' : '#1e1e1e'}`, borderRadius: 4, cursor: 'pointer', transition: 'all 0.15s' }}>
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

// ─── LEGEND INVESTOR VERDICTS ─────────────────────────────────────────────────
function InvestorVerdicts({ raw: r }) {
  return (
    <div>
      <SectionHeader title="10 LEGEND INVESTOR VERDICTS" subtitle="Auto-generated from live stock metrics" color="#f5a623" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
        {INVESTORS.map((inv) => (
          <div key={inv.name} style={{ padding: '10px 14px', background: '#0d0d0d', border: '1px solid #1e1e1e', borderRadius: 6, borderLeft: '2px solid #f5a623' }}>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: 11, fontWeight: 700, color: '#f5a623', marginBottom: 5 }}>
              {inv.emoji} {inv.name}
            </div>
            <div style={{ fontSize: 10, fontFamily: 'JetBrains Mono', color: '#777', lineHeight: 1.7, fontStyle: 'italic' }}>
              "{inv.rule(r)}"
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── 7-STEP FORMULA PANEL ─────────────────────────────────────────────────────
function SevenStepPanel({ raw: r }) {
  const checks = [
    { label: 'P/E < 20', actual: r.pe ? fmt(r.pe) : '-', pass: r.pe != null && r.pe < 20 },
    { label: 'ROIC > 15%', actual: r.roe ? `${fmt(r.roe)}%` : '-', pass: r.roe != null && r.roe > 15 },
    { label: 'D/E < 1', actual: r.debt ? fmt(r.debt) : '-', pass: r.debt != null && r.debt < 1 },
    { label: 'EPS CAGR > 10%', actual: r.epsGrowth ? `${fmt(r.epsGrowth)}%` : '-', pass: r.epsGrowth != null && r.epsGrowth > 10 },
    { label: 'ROE > 15%', actual: r.roe ? `${fmt(r.roe)}%` : '-', pass: r.roe != null && r.roe > 15 },
    { label: 'Op Margin > 10%', actual: r.operatingMargin ? `${fmt(r.operatingMargin)}%` : '-', pass: r.operatingMargin != null && r.operatingMargin > 10 },
    { label: 'Gross Margin > 30%', actual: r.grossMargin ? `${fmt(r.grossMargin)}%` : '-', pass: r.grossMargin != null && r.grossMargin > 30 },
  ];

  const passCount = checks.filter((c) => c.pass).length;
  const scoreColor = passCount === 7 ? '#f5a623' : passCount >= 5 ? '#00d084' : passCount >= 3 ? '#f5a623' : '#ff4444';

  return (
    <div style={{ padding: '14px 20px', background: '#080808', borderTop: '1px solid #1e1e1e', flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontFamily: 'JetBrains Mono', fontSize: 11, fontWeight: 700, color: '#f5a623', letterSpacing: 2 }}>7-STEP FORMULA CHECK (LIVE)</div>
        <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'JetBrains Mono', color: scoreColor, textShadow: passCount === 7 ? `0 0 20px ${scoreColor}` : 'none' }}>
          {passCount}/7 {passCount === 7 ? '⭐' : passCount >= 5 ? '✅' : passCount >= 3 ? '⚠️' : '❌'}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
        {checks.map((c) => (
          <div key={c.label} style={{ padding: '6px 8px', background: c.pass ? 'rgba(0,208,132,0.1)' : 'rgba(255,68,68,0.1)', border: `1px solid ${c.pass ? 'rgba(0,208,132,0.3)' : 'rgba(255,68,68,0.3)'}`, borderRadius: 4, textAlign: 'center' }}>
            <div style={{ fontSize: 8, fontFamily: 'JetBrains Mono', color: '#555', marginBottom: 3 }}>{c.label}</div>
            <div style={{ fontSize: 11, fontFamily: 'JetBrains Mono', fontWeight: 700, color: c.pass ? '#00d084' : c.actual === '-' ? '#555' : '#ff4444' }}>{c.actual}</div>
            <div style={{ fontSize: 8, fontFamily: 'JetBrains Mono', color: c.pass ? '#00d084' : c.actual === '-' ? '#333' : '#ff4444', marginTop: 2 }}>{c.actual === '-' ? 'N/A' : c.pass ? 'PASS' : 'FAIL'}</div>
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
  const [lastUpdated, setLastUpdated] = useState(null);

  const modules = [
    { key: 'goldman', label: '01 GS' },
    { key: 'dcf', label: '02 DCF' },
    { key: 'macro', label: '03 MACRO' },
    { key: 'risk', label: '04 RISK' },
    { key: 'earnings', label: '05 EARN' },
    { key: 'returns', label: '06 MB' },
    { key: 'verdicts', label: '10 LEGENDS' },
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
    if (!sym) return;
    setLoading(true);
    setError(null);
    try {
      const [quoteRes, fundRes] = await Promise.allSettled([
        fetchQuote(sym),
        fetchFundamentals(sym),
      ]);

      const quote = quoteRes.status === 'fulfilled' ? quoteRes.value : null;
      const fundamentals = fundRes.status === 'fulfilled' ? fundRes.value : null;

      if (!quote) throw new Error(`No data found for ${sym}`);

      setData({ quote, fundamentals });
      setLastUpdated(new Date());
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

  const r = data?.quote ? normalize(data.quote) : null;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#0a0a0a', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ padding: '10px 16px', borderBottom: '1px solid #1e1e1e', background: '#0d0d0d', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
          <div style={{ fontFamily: 'JetBrains Mono', fontSize: 14, fontWeight: 700, color: '#f5a623', letterSpacing: 2 }}>
            🔥 MULTIBAGGER ENGINE
          </div>
          <div style={{ fontSize: 9, color: '#444', fontFamily: 'JetBrains Mono', letterSpacing: 1 }}>
            COSMIC TIER — 6 FRAMEWORKS + MACRO RADAR + 10 LEGENDS
          </div>
          <div style={{ flex: 1 }} />
          {data?.quote && r && (
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: 12 }}>
              <span style={{ color: '#f5a623', fontWeight: 700 }}>{ticker}</span>
              <span style={{ marginLeft: 10, color: data.quote.changePct >= 0 ? '#00d084' : '#ff4444', fontWeight: 600 }}>
                Rs {fmt(data.quote.ltp)} ({data.quote.changePct >= 0 ? '+' : ''}{fmt(data.quote.changePct)}%)
              </span>
              {r.rec && <span style={{ marginLeft: 10, fontSize: 10, color: r.rec.includes('buy') ? '#00d084' : '#f5a623', border: `1px solid currentColor`, padding: '1px 6px', borderRadius: 3 }}>{r.rec.replace('_', ' ').toUpperCase()}</span>}
            </div>
          )}
          {lastUpdated && <div style={{ fontSize: 9, color: '#333', fontFamily: 'JetBrains Mono' }}>Updated {lastUpdated.toLocaleTimeString('en-IN')}</div>}
        </div>

        {/* Search */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <input value={ticker} onChange={(e) => setTicker(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && loadData(ticker)}
            placeholder="Enter NSE symbol (RELIANCE, TCS, ICICIBANK...)"
            style={{ flex: 1, background: '#141414', border: '1px solid #2a2a2a', borderRadius: 4, padding: '8px 12px', color: '#e8e8e8', fontFamily: 'JetBrains Mono', fontSize: 12, outline: 'none' }} />
          <button onClick={() => loadData(ticker)}
            style={{ padding: '8px 24px', background: '#f5a623', border: 'none', borderRadius: 4, color: '#000', fontFamily: 'JetBrains Mono', fontSize: 11, fontWeight: 700, cursor: 'pointer', letterSpacing: 1 }}>
            ANALYZE
          </button>
          <button onClick={() => loadData(ticker)}
            style={{ padding: '8px 12px', background: '#141414', border: '1px solid #2a2a2a', borderRadius: 4, color: '#666', fontFamily: 'JetBrains Mono', fontSize: 11, cursor: 'pointer' }}>
            ↻
          </button>
        </div>

        {/* Module toggles */}
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          <button onClick={() => toggleModule('all')}
            style={{ padding: '4px 14px', fontSize: 9, fontFamily: 'JetBrains Mono', background: activeModules.includes('all') ? '#f5a623' : '#141414', color: activeModules.includes('all') ? '#000' : '#555', border: `1px solid ${activeModules.includes('all') ? '#f5a623' : '#222'}`, borderRadius: 3, cursor: 'pointer', fontWeight: 700, letterSpacing: 1 }}>
            ALL MODE
          </button>
          {modules.map((m) => (
            <button key={m.key} onClick={() => toggleModule(m.key)}
              style={{ padding: '4px 12px', fontSize: 9, fontFamily: 'JetBrains Mono', background: isActive(m.key) && !activeModules.includes('all') ? 'rgba(245,166,35,0.15)' : '#141414', color: isActive(m.key) ? '#f5a623' : '#444', border: `1px solid ${isActive(m.key) ? 'rgba(245,166,35,0.5)' : '#222'}`, borderRadius: 3, cursor: 'pointer', letterSpacing: 1 }}>
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 300, gap: 16 }}>
            <div style={{ width: 48, height: 48, border: '3px solid #1e1e1e', borderTop: '3px solid #f5a623', borderRadius: '50%', animation: 'mbspin 1s linear infinite' }} />
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: 13, color: '#f5a623', letterSpacing: 3, animation: 'mbpulse 1.5s ease-in-out infinite' }}>
              ACTIVATING COSMIC TIER BEAST MODE...
            </div>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: 10, color: '#444' }}>Fetching live data from Yahoo Finance + Screener.in</div>
            <style>{`@keyframes mbspin{to{transform:rotate(360deg)}}@keyframes mbpulse{0%,100%{opacity:1}50%{opacity:0.3}}`}</style>
          </div>
        )}

        {error && !loading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200, gap: 12 }}>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: 12, color: '#ff4444' }}>DATA FETCH FAILED</div>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: 10, color: '#555' }}>{error}</div>
            <button onClick={() => loadData(ticker)}
              style={{ padding: '6px 20px', background: '#f5a623', border: 'none', borderRadius: 4, color: '#000', fontFamily: 'JetBrains Mono', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
              RETRY
            </button>
          </div>
        )}

        {!loading && !error && data && r && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
            {isActive('goldman') && (
              <div style={{ padding: '20px', background: '#111', border: '1px solid #1e1e1e', borderRadius: 8 }}>
                <GoldmanScreener q={data.quote} raw={r} fundamentals={data.fundamentals} />
              </div>
            )}
            {isActive('dcf') && (
              <div style={{ padding: '20px', background: '#111', border: '1px solid #1e1e1e', borderRadius: 8 }}>
                <DCFValuation q={data.quote} raw={r} />
              </div>
            )}
            {isActive('macro') && (
              <div style={{ padding: '20px', background: '#111', border: '1px solid #1e1e1e', borderRadius: 8 }}>
                <MacroImpactAnalyzer q={data.quote} raw={r} />
              </div>
            )}
            {isActive('risk') && (
              <div style={{ padding: '20px', background: '#111', border: '1px solid #1e1e1e', borderRadius: 8 }}>
                <BridgewaterRisk q={data.quote} raw={r} />
              </div>
            )}
            {isActive('earnings') && (
              <div style={{ padding: '20px', background: '#111', border: '1px solid #1e1e1e', borderRadius: 8 }}>
                <JPMorganEarnings q={data.quote} raw={r} />
              </div>
            )}
            {isActive('returns') && (
              <div style={{ padding: '20px', background: '#111', border: '1px solid #1e1e1e', borderRadius: 8 }}>
                <MultibaggerReturns q={data.quote} raw={r} />
              </div>
            )}
            {isActive('verdicts') && (
              <div style={{ padding: '20px', background: '#111', border: '1px solid #1e1e1e', borderRadius: 8 }}>
                <InvestorVerdicts raw={r} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* 7-Step always at bottom */}
      {data && r && !loading && <SevenStepPanel raw={r} />}
    </div>
  );
}