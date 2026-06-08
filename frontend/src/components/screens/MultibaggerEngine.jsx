import { useState, useEffect, useCallback } from 'react';
import { fetchQuote, fetchFundamentals, fetchStockNews, fetchMacroNews } from '../../utils/api';

const RISK_FREE_RATE = 6.8;
const ERP = 5.5;

const NEWS_CATEGORIES = {
  corporate_action: { label: 'DIVIDEND/BONUS/SPLIT', color: '#f5a623', icon: '💰' },
  earnings: { label: 'EARNINGS & RESULTS', color: '#00d084', icon: '📊' },
  order_win: { label: 'ORDER WIN/CONTRACT', color: '#4a9eff', icon: '🏆' },
  expansion: { label: 'EXPANSION/CAPEX', color: '#a78bfa', icon: '🏭' },
  ma: { label: 'M&A/ACQUISITION', color: '#f97316', icon: '🤝' },
  management: { label: 'MANAGEMENT', color: '#ec4899', icon: '👔' },
  analyst: { label: 'ANALYST RATING', color: '#00d084', icon: '🎯' },
  outlook: { label: 'FUTURE OUTLOOK', color: '#4a9eff', icon: '🔮' },
  rbi_policy: { label: 'RBI POLICY', color: '#f5a623', icon: '🏦' },
  govt_policy: { label: 'GOVT/PLI SCHEME', color: '#00d084', icon: '🇮🇳' },
  flows: { label: 'FII/DII FLOWS', color: '#a78bfa', icon: '💹' },
  commodity: { label: 'COMMODITY/OIL', color: '#f97316', icon: '🛢️' },
  global: { label: 'GLOBAL/US/CHINA', color: '#4a9eff', icon: '🌍' },
  general: { label: 'GENERAL NEWS', color: '#888', icon: '📰' },
};

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
    rule: (d) => d.div > 5 ? 'Income plus growth combo. Rare beast. Load up on dips.' :
      d.epsGrowth > 20 ? 'EPS rocket launching. India growth story intact. Buy.' :
      d.pe < 20 && d.revenueGrowth > 15 ? 'Market sleeping on this. My kind of contrarian bet.' :
      d.targetUpside > 25 ? 'Analysts see big upside. I agree. Accumulate.' :
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
    rule: (d) => d.pe > 0 && d.epsGrowth > 0 && d.pe < d.epsGrowth * 100 ? 'PEG ratio attractive. This is exactly what I hunt for.' :
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
    rule: (d) => d.beta > 1.5 ? 'High beta. Are you being compensated adequately for this risk?' :
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
      d.grossMargin > 35 ? 'High gross margins mean strong product. This can scale beautifully.' :
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

const fmt = (n, d = 2) => n != null && !isNaN(n) ? Number(n).toLocaleString('en-IN', { maximumFractionDigits: d }) : '-';
const pct = (n) => n != null && !isNaN(n) ? (n * 100).toFixed(2) + '%' : '-';

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

function getSentiment(title) {
  const t = title.toLowerCase();
  const pos = ['surge', 'rise', 'gain', 'rally', 'growth', 'profit', 'beat', 'record', 'high', 'buy', 'upgrade', 'strong', 'boost', 'wins', 'soar', 'jump', 'expand', 'invest', 'order', 'contract', 'deal', 'approved', 'launch', 'dividend', 'bonus'];
  const neg = ['fall', 'drop', 'loss', 'decline', 'miss', 'cut', 'warn', 'risk', 'concern', 'sell', 'downgrade', 'weak', 'crash', 'slump', 'crisis', 'fraud', 'penalty', 'fine', 'ban', 'reject', 'delay', 'resign'];
  const ps = pos.filter((w) => t.includes(w)).length;
  const ns = neg.filter((w) => t.includes(w)).length;
  if (ps > ns) return 'bullish';
  if (ns > ps) return 'bearish';
  return 'neutral';
}

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  return Math.floor(diff / 86400) + 'd ago';
}

function SectionHeader({ title, subtitle, color }) {
  return (
    <div style={{ marginBottom: 16, paddingBottom: 10, borderBottom: '1px solid #1e1e1e' }}>
      <div style={{ fontFamily: 'JetBrains Mono', fontSize: 13, fontWeight: 700, color: color || '#f5a623', letterSpacing: 2 }}>{title}</div>
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
          <span style={{ fontSize: 9, fontFamily: 'JetBrains Mono', padding: '2px 8px', borderRadius: 3, background: pass ? 'rgba(0,208,132,0.15)' : 'rgba(255,68,68,0.15)', color: pass ? '#00d084' : '#ff4444', border: '1px solid ' + (pass ? '#00d084' : '#ff4444'), fontWeight: 700 }}>
            {pass ? 'PASS' : 'FAIL'}
          </span>
        )}
      </div>
    </div>
  );
}

function GaugeMeter({ value, max, label, color }) {
  var p = Math.min(Math.max((value / (max || 10)) * 100, 0), 100);
  var c = color || (p > 66 ? '#00d084' : p > 33 ? '#f5a623' : '#ff4444');
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ position: 'relative', width: 80, height: 80, margin: '0 auto' }}>
        <svg viewBox="0 0 80 80" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="40" cy="40" r="32" fill="none" stroke="#1a1a1a" strokeWidth="8" />
          <circle cx="40" cy="40" r="32" fill="none" stroke={c} strokeWidth="8" strokeDasharray={p * 2.01 + ' 201'} strokeLinecap="round" style={{ transition: 'stroke-dasharray 1.2s ease' }} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 15, fontWeight: 700, fontFamily: 'JetBrains Mono', color: c }}>{value.toFixed(1)}</span>
        </div>
      </div>
      <div style={{ fontSize: 9, color: '#555', fontFamily: 'JetBrains Mono', marginTop: 4, letterSpacing: 1 }}>{label}</div>
    </div>
  );
}

function ProgressBar({ label, value, max, color, suffix }) {
  var p = Math.min(Math.max(((value || 0) / (max || 100)) * 100, 0), 100);
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 10, fontFamily: 'JetBrains Mono', color: '#666' }}>{label}</span>
        <span style={{ fontSize: 10, fontFamily: 'JetBrains Mono', color: color || '#e8e8e8', fontWeight: 600 }}>{value != null ? fmt(value) + (suffix || '%') : '-'}</span>
      </div>
      <div style={{ height: 4, background: '#1a1a1a', borderRadius: 2 }}>
        <div style={{ height: '100%', width: p + '%', background: color || '#f5a623', borderRadius: 2, transition: 'width 1s ease' }} />
      </div>
    </div>
  );
}

function NewsCard({ news }) {
  var cat = NEWS_CATEGORIES[news.type] || NEWS_CATEGORIES.general;
  var sentiment = getSentiment(news.title);
  var sentColor = sentiment === 'bullish' ? '#00d084' : sentiment === 'bearish' ? '#ff4444' : '#888';
  var [hovered, setHovered] = useState(false);
  return (
    <a href={news.link} target="_blank" rel="noreferrer"
      onMouseEnter={function() { setHovered(true); }}
      onMouseLeave={function() { setHovered(false); }}
      style={{ display: 'flex', gap: 10, padding: '10px 12px', background: hovered ? '#141414' : '#0d0d0d', borderRadius: 6, border: '1px solid #1a1a1a', borderLeft: '3px solid ' + sentColor, textDecoration: 'none', transition: 'background 0.15s', cursor: 'pointer' }}>
      <div style={{ flexShrink: 0, width: 28, height: 28, background: cat.color + '18', border: '1px solid ' + cat.color + '33', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>
        {cat.icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: '#e0e0e0', lineHeight: 1.5, marginBottom: 5 }}>{news.title}</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 8, fontFamily: 'JetBrains Mono', padding: '1px 6px', borderRadius: 2, background: cat.color + '18', color: cat.color, border: '1px solid ' + cat.color + '33', fontWeight: 700 }}>{cat.label}</span>
          <span style={{ fontSize: 8, fontFamily: 'JetBrains Mono', padding: '1px 6px', borderRadius: 2, background: sentColor + '18', color: sentColor, border: '1px solid ' + sentColor + '33', fontWeight: 700 }}>
            {sentiment === 'bullish' ? 'BULLISH' : sentiment === 'bearish' ? 'BEARISH' : 'NEUTRAL'}
          </span>
          <span style={{ fontSize: 8, color: '#444', fontFamily: 'JetBrains Mono' }}>{news.publisher}</span>
          <span style={{ fontSize: 8, color: '#333', fontFamily: 'JetBrains Mono' }}>{timeAgo(news.publishedAt)}</span>
        </div>
      </div>
    </a>
  );
}

function GoldmanScreener({ q, r, fundamentals }) {
  var bullTarget = r.targetPrice || r.ltp * 1.4;
  var bearTarget = r.ltp * 0.72;
  var entry1 = r.ltp * 0.95;
  var entry2 = r.ltp * 0.88;
  var stopLoss = r.ltp * 0.80;
  var moatScore = Math.min(10, (r.roe > 15 ? 2 : r.roe > 10 ? 1 : 0) + (r.revenueGrowth > 10 ? 2 : r.revenueGrowth > 5 ? 1 : 0) + (r.grossMargin > 35 ? 2 : r.grossMargin > 20 ? 1 : 0) + (r.operatingMargin > 15 ? 2 : r.operatingMargin > 8 ? 1 : 0) + (r.debt < 0.5 ? 2 : r.debt < 1 ? 1 : 0));
  var riskScore = Math.min(10, Math.max(1, (r.beta > 1.5 ? 4 : r.beta > 1.2 ? 3 : r.beta > 0.8 ? 2 : 1) + (r.debt > 2 ? 3 : r.debt > 1 ? 2 : 1) + (r.currentRatio < 1 ? 2 : r.currentRatio < 1.5 ? 1 : 0)));
  var recColor = r.rec && r.rec.includes('strong_buy') ? '#00d084' : r.rec && r.rec.includes('buy') ? '#4a9eff' : r.rec && r.rec.includes('hold') ? '#f5a623' : '#ff4444';
  var recLabel = r.rec ? r.rec.replace('_', ' ').toUpperCase() : 'N/A';
  return (
    <div>
      <SectionHeader title="01 - GOLDMAN SACHS SCREENER" subtitle="Quality check + analyst targets + price levels" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div>
          <StatRow label="P/E Ratio" value={r.pe ? fmt(r.pe) : '-'} color={r.pe < 20 ? '#00d084' : r.pe < 35 ? '#f5a623' : '#ff4444'} badge pass={r.pe != null && r.pe < 20} />
          <StatRow label="Price to Book" value={r.pb ? fmt(r.pb) : '-'} color={r.pb < 3 ? '#00d084' : '#f5a623'} />
          <StatRow label="ROE" value={r.roe ? fmt(r.roe) + '%' : '-'} color={r.roe > 15 ? '#00d084' : '#ff4444'} badge pass={r.roe > 15} />
          <StatRow label="Debt / Equity" value={r.debt ? fmt(r.debt) : '-'} color={r.debt < 1 ? '#00d084' : '#ff4444'} badge pass={r.debt < 1} />
          <StatRow label="Dividend Yield" value={r.div ? fmt(r.div) + '%' : '-'} color={r.div > 3 ? '#00d084' : '#888'} />
          <StatRow label="Revenue Growth" value={r.revenueGrowth ? fmt(r.revenueGrowth) + '%' : '-'} color={r.revenueGrowth > 0 ? '#00d084' : '#ff4444'} />
          <StatRow label="Gross Margin" value={r.grossMargin ? fmt(r.grossMargin) + '%' : '-'} color={r.grossMargin > 30 ? '#00d084' : '#f5a623'} />
          <StatRow label="Operating Margin" value={r.operatingMargin ? fmt(r.operatingMargin) + '%' : '-'} color={r.operatingMargin > 10 ? '#00d084' : '#f5a623'} />
          <StatRow label="EPS (TTM)" value={r.eps ? 'Rs ' + fmt(r.eps) : '-'} color="#4a9eff" />
          <StatRow label="Forward EPS" value={r.forwardEps ? 'Rs ' + fmt(r.forwardEps) : '-'} color="#a78bfa" />
          <StatRow label="Beta" value={r.beta ? fmt(r.beta) : '-'} color={r.beta < 1 ? '#00d084' : r.beta < 1.5 ? '#f5a623' : '#ff4444'} />
          <StatRow label="Current Ratio" value={r.currentRatio ? fmt(r.currentRatio) : '-'} color={r.currentRatio > 1.5 ? '#00d084' : r.currentRatio > 1 ? '#f5a623' : '#ff4444'} />
        </div>
        <div>
          <div style={{ marginBottom: 16, padding: '12px', background: '#0d0d0d', borderRadius: 6, border: '1px solid ' + recColor + '33' }}>
            <div style={{ fontSize: 9, color: '#555', fontFamily: 'JetBrains Mono', letterSpacing: 1, marginBottom: 8 }}>ANALYST CONSENSUS</div>
            <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'JetBrains Mono', color: recColor, marginBottom: 6 }}>{recLabel}</div>
            {r.targetPrice && (
              <div>
                <div style={{ fontSize: 11, color: '#888', fontFamily: 'JetBrains Mono' }}>Target Price</div>
                <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'JetBrains Mono', color: '#00d084' }}>Rs {fmt(r.targetPrice)}</div>
                {r.targetUpside != null && (
                  <div style={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: r.targetUpside > 0 ? '#00d084' : '#ff4444', marginTop: 4 }}>
                    {r.targetUpside > 0 ? 'UP' : 'DOWN'} {Math.abs(r.targetUpside).toFixed(1)}% potential
                  </div>
                )}
              </div>
            )}
          </div>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 9, color: '#555', fontFamily: 'JetBrains Mono', letterSpacing: 1, marginBottom: 8 }}>PRICE LEVELS</div>
            {[
              { label: 'ANALYST TARGET', val: bullTarget, color: '#00d084' },
              { label: 'ENTRY ZONE 1 (-5%)', val: entry1, color: '#f5a623' },
              { label: 'ENTRY ZONE 2 (-12%)', val: entry2, color: '#f5a623' },
              { label: 'STOP LOSS (-20%)', val: stopLoss, color: '#ff4444' },
              { label: 'BEAR CASE (-28%)', val: bearTarget, color: '#ff4444' },
            ].map(function(t) {
              return (
                <div key={t.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 8px', borderBottom: '1px solid #111', borderLeft: '3px solid ' + t.color, marginBottom: 3, background: '#0d0d0d' }}>
                  <span style={{ fontSize: 9, fontFamily: 'JetBrains Mono', color: '#555' }}>{t.label}</span>
                  <span style={{ fontSize: 12, fontFamily: 'JetBrains Mono', fontWeight: 700, color: t.color }}>Rs {fmt(t.val)}</span>
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: 20, justifyContent: 'center' }}>
            <GaugeMeter value={moatScore} label="MOAT" />
            <GaugeMeter value={riskScore} label="RISK" color={riskScore > 6 ? '#ff4444' : riskScore > 4 ? '#f5a623' : '#00d084'} />
          </div>
        </div>
      </div>
      {fundamentals && fundamentals.ratios && Object.keys(fundamentals.ratios).length > 0 && (
        <div style={{ marginTop: 16, padding: '12px', background: '#0d0d0d', borderRadius: 6, borderLeft: '2px solid #f5a623' }}>
          <div style={{ fontSize: 9, color: '#444', fontFamily: 'JetBrains Mono', letterSpacing: 1, marginBottom: 8 }}>SCREENER.IN LIVE DATA</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
            {['ROCE', 'ROE', 'Stock P/E', 'Promoter holding', 'FII holding', 'Debt to equity', 'EPS', 'Dividend Yield', 'Current ratio', 'Piotroski score'].map(function(k) {
              return fundamentals.ratios[k] ? (
                <div key={k} style={{ padding: '6px 8px', background: '#141414', borderRadius: 4 }}>
                  <div style={{ fontSize: 8, color: '#444', fontFamily: 'JetBrains Mono', marginBottom: 3 }}>{k.toUpperCase()}</div>
                  <div style={{ fontSize: 12, fontFamily: 'JetBrains Mono', fontWeight: 700, color: '#e8e8e8' }}>{fundamentals.ratios[k]}</div>
                </div>
              ) : null;
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function DCFValuation({ r }) {
  var [growthRate, setGrowthRate] = useState(15);
  var [termGrowth, setTermGrowth] = useState(7);
  var wacc = r.beta ? parseFloat((RISK_FREE_RATE + r.beta * ERP).toFixed(2)) : 12;
  var eps = r.eps || 0;
  var projections = Array.from({ length: 5 }, function(_, i) {
    var yr = i + 1;
    var projEps = eps * Math.pow(1 + growthRate / 100, yr);
    var pv = projEps / Math.pow(1 + wacc / 100, yr);
    return { yr: yr, projEps: projEps, pv: pv };
  });
  var tv = projections[4].projEps * (1 + termGrowth / 100) / ((wacc - termGrowth) / 100);
  var pvTv = tv / Math.pow(1 + wacc / 100, 5);
  var intrinsic = projections.reduce(function(s, p) { return s + p.pv; }, 0) + pvTv;
  var mos = ((intrinsic - r.ltp) / intrinsic) * 100;
  var verdict = mos > 20 ? 'UNDERVALUED' : mos > -10 ? 'FAIRLY VALUED' : 'OVERVALUED';
  var vc = mos > 20 ? '#00d084' : mos > -10 ? '#f5a623' : '#ff4444';
  var waccRange = [wacc - 1, wacc, wacc + 1];
  var gRange = [growthRate - 2, growthRate, growthRate + 2];
  return (
    <div>
      <SectionHeader title="02 - MORGAN STANLEY DCF VALUATION" subtitle="Live beta + auto WACC + 5-year EPS projection" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        <div>
          <div style={{ padding: '10px 12px', background: '#0d0d0d', borderRadius: 6, marginBottom: 14, border: '1px solid #1e1e1e' }}>
            <div style={{ fontSize: 9, color: '#555', fontFamily: 'JetBrains Mono', letterSpacing: 1, marginBottom: 8 }}>AUTO-CALCULATED INPUTS</div>
            <StatRow label="Trailing EPS" value={eps ? 'Rs ' + fmt(eps) : '-'} />
            <StatRow label="Forward EPS" value={r.forwardEps ? 'Rs ' + fmt(r.forwardEps) : '-'} color="#a78bfa" />
            <StatRow label="Beta (live)" value={fmt(r.beta)} />
            <StatRow label="Risk-Free Rate" value={RISK_FREE_RATE + '%'} />
            <StatRow label="WACC (auto)" value={wacc + '%'} color="#4a9eff" />
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 10, fontFamily: 'JetBrains Mono', color: '#888' }}>EPS Growth Rate</span>
              <span style={{ fontSize: 12, fontFamily: 'JetBrains Mono', color: '#f5a623', fontWeight: 700 }}>{growthRate}%</span>
            </div>
            <input type="range" min="5" max="40" value={growthRate} onChange={function(e) { setGrowthRate(Number(e.target.value)); }} style={{ width: '100%', accentColor: '#f5a623' }} />
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 10, fontFamily: 'JetBrains Mono', color: '#888' }}>Terminal Growth</span>
              <span style={{ fontSize: 12, fontFamily: 'JetBrains Mono', color: '#4a9eff', fontWeight: 700 }}>{termGrowth}%</span>
            </div>
            <input type="range" min="3" max="12" value={termGrowth} onChange={function(e) { setTermGrowth(Number(e.target.value)); }} style={{ width: '100%', accentColor: '#4a9eff' }} />
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 9, color: '#555', fontFamily: 'JetBrains Mono', letterSpacing: 1, marginBottom: 6 }}>INTRINSIC VALUE</div>
            <div style={{ fontSize: 38, fontWeight: 700, fontFamily: 'JetBrains Mono', color: vc }}>Rs {fmt(intrinsic)}</div>
            <div style={{ fontSize: 11, color: '#888', fontFamily: 'JetBrains Mono', marginTop: 4 }}>CMP: Rs {fmt(r.ltp)}</div>
          </div>
          <div style={{ padding: '10px 28px', borderRadius: 8, border: '2px solid ' + vc, background: vc + '18' }}>
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
                {['YEAR', 'PROJ EPS', 'PRESENT VALUE'].map(function(h) {
                  return <th key={h} style={{ padding: '6px 8px', textAlign: 'right', color: '#444', fontSize: 9, borderBottom: '1px solid #1e1e1e', background: '#0a0a0a' }}>{h}</th>;
                })}
              </tr>
            </thead>
            <tbody>
              {projections.map(function(p) {
                return (
                  <tr key={p.yr}>
                    <td style={{ padding: '5px 8px', textAlign: 'right', color: '#f5a623' }}>FY+{p.yr}</td>
                    <td style={{ padding: '5px 8px', textAlign: 'right', color: '#e8e8e8' }}>Rs {fmt(p.projEps)}</td>
                    <td style={{ padding: '5px 8px', textAlign: 'right', color: '#00d084' }}>Rs {fmt(p.pv)}</td>
                  </tr>
                );
              })}
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
                {gRange.map(function(g) {
                  return <th key={g} style={{ padding: '5px 6px', textAlign: 'center', color: '#444', fontSize: 8, borderBottom: '1px solid #1e1e1e', background: '#0a0a0a' }}>{g}%</th>;
                })}
              </tr>
            </thead>
            <tbody>
              {waccRange.map(function(w) {
                return (
                  <tr key={w}>
                    <td style={{ padding: '5px 6px', color: '#888', fontSize: 9 }}>{w}%</td>
                    {gRange.map(function(g) {
                      var sens = projections.reduce(function(s, p) { return s + (eps * Math.pow(1 + g / 100, p.yr)) / Math.pow(1 + w / 100, p.yr); }, 0);
                      var sensTV = (eps * Math.pow(1 + g / 100, 5) * (1 + termGrowth / 100)) / ((w - termGrowth) / 100) / Math.pow(1 + w / 100, 5);
                      var si = sens + sensTV;
                      var diff = ((si - r.ltp) / r.ltp) * 100;
                      return (
                        <td key={g} style={{ padding: '5px 6px', textAlign: 'center', color: diff > 0 ? '#00d084' : '#ff4444', fontWeight: 600 }}>
                          {fmt(si, 0)}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function MacroImpactAnalyzer({ q, r }) {
  var [stockNews, setStockNews] = useState([]);
  var [macroNews, setMacroNews] = useState([]);
  var [loadingStock, setLoadingStock] = useState(true);
  var [loadingMacro, setLoadingMacro] = useState(true);
  var [activeTab, setActiveTab] = useState('stock');
  var [activeFilter, setActiveFilter] = useState('all');
  var [searchQuery, setSearchQuery] = useState('');

  useEffect(function() {
    setLoadingStock(true);
    setLoadingMacro(true);
    setStockNews([]);
    setMacroNews([]);
    fetchStockNews(q.symbol)
      .then(function(d) { setStockNews(d || []); setLoadingStock(false); })
      .catch(function() { setLoadingStock(false); });
    fetchMacroNews()
      .then(function(d) { setMacroNews(d || []); setLoadingMacro(false); })
      .catch(function() { setLoadingMacro(false); });
  }, [q.symbol]);

  var getLiveSignals = function() {
    var signals = [];
    if (r.beta > 1.2) signals.push({ event: 'High Market Sensitivity', detail: 'Beta ' + fmt(r.beta) + ' amplifies Nifty moves by ' + ((r.beta - 1) * 100).toFixed(0) + '%', type: 'risk', icon: '📊' });
    if (r.debt > 1) signals.push({ event: 'RBI Rate Hike Risk', detail: 'D/E ' + fmt(r.debt) + ' means debt costs rise if rates go up', type: 'risk', icon: '🏦' });
    if (r.debt < 0.3) signals.push({ event: 'Fortress Balance Sheet', detail: 'Near-zero debt - immune to rate cycles', type: 'positive', icon: '🏰' });
    if (r.revenueGrowth > 15) signals.push({ event: 'India GDP Beneficiary', detail: fmt(r.revenueGrowth) + '% revenue growth riding India wave', type: 'positive', icon: '🇮🇳' });
    if (r.revenueGrowth < 0) signals.push({ event: 'Revenue Contraction', detail: fmt(r.revenueGrowth) + '% decline needs recovery catalyst', type: 'risk', icon: '📉' });
    if (r.grossMargin > 40) signals.push({ event: 'Inflation Shield', detail: fmt(r.grossMargin) + '% gross margin - strong pricing power', type: 'positive', icon: '🛡️' });
    if (r.div > 3) signals.push({ event: 'Rate Cut Beneficiary', detail: fmt(r.div) + '% yield attractive as rates fall', type: 'positive', icon: '💰' });
    if (r.currentRatio < 1.2) signals.push({ event: 'Liquidity Warning', detail: 'Current ratio ' + fmt(r.currentRatio) + ' is tight', type: 'risk', icon: '⚠️' });
    if (r.targetUpside > 25) signals.push({ event: 'Strong Analyst Conviction', detail: 'Consensus target ' + fmt(r.targetUpside) + '% above CMP', type: 'positive', icon: '🎯' });
    if (r.rec === 'strong_buy') signals.push({ event: 'Institutional Accumulation Likely', detail: 'Strong buy consensus - expect institutional buying', type: 'positive', icon: '🟢' });
    if (r.epsGrowth < 0) signals.push({ event: 'Earnings Declining', detail: 'EPS growth ' + fmt(r.epsGrowth) + '% - watch next quarter', type: 'risk', icon: '❌' });
    if (r.epsGrowth > 20) signals.push({ event: 'Earnings Acceleration', detail: fmt(r.epsGrowth) + '% EPS growth - strong momentum', type: 'positive', icon: '🚀' });
    return signals;
  };

  var displayNews = activeTab === 'stock' ? stockNews : macroNews;
  var isLoading = activeTab === 'stock' ? loadingStock : loadingMacro;
  var categories = ['all'].concat(Array.from(new Set(displayNews.map(function(n) { return n.type; }))));
  var filteredNews = displayNews.filter(function(n) {
    var matchFilter = activeFilter === 'all' || n.type === activeFilter;
    var matchSearch = !searchQuery || n.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchFilter && matchSearch;
  });
  var bullishCount = displayNews.filter(function(n) { return getSentiment(n.title) === 'bullish'; }).length;
  var bearishCount = displayNews.filter(function(n) { return getSentiment(n.title) === 'bearish'; }).length;
  var neutralCount = displayNews.length - bullishCount - bearishCount;
  var sentimentScore = displayNews.length > 0 ? Math.round((bullishCount / displayNews.length) * 100) : 50;
  var overallSentiment = sentimentScore > 60 ? 'BULLISH' : sentimentScore < 40 ? 'BEARISH' : 'MIXED';
  var sentColor = sentimentScore > 60 ? '#00d084' : sentimentScore < 40 ? '#ff4444' : '#f5a623';
  var signals = getLiveSignals();

  return (
    <div>
      <SectionHeader title="03 - COSMIC MACRO IMPACT ANALYZER" subtitle="Live news + sentiment + signals + global conditions" color="#4a9eff" />
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 9, color: '#555', fontFamily: 'JetBrains Mono', letterSpacing: 1, marginBottom: 10 }}>LIVE SIGNAL RADAR (FROM REAL FINANCIALS)</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
          {signals.map(function(s, i) {
            return (
              <div key={i} style={{ padding: '8px 10px', background: s.type === 'positive' ? 'rgba(0,208,132,0.06)' : 'rgba(255,68,68,0.06)', border: '1px solid ' + (s.type === 'positive' ? 'rgba(0,208,132,0.15)' : 'rgba(255,68,68,0.15)'), borderRadius: 5 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                  <span>{s.icon}</span>
                  <span style={{ fontFamily: 'JetBrains Mono', fontSize: 9, fontWeight: 700, color: s.type === 'positive' ? '#00d084' : '#ff4444' }}>{s.event}</span>
                </div>
                <div style={{ fontSize: 9, fontFamily: 'JetBrains Mono', color: '#555', lineHeight: 1.5 }}>{s.detail}</div>
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 14 }}>
        <div style={{ padding: '10px 12px', background: '#0d0d0d', border: '1px solid ' + sentColor + '33', borderRadius: 6, textAlign: 'center' }}>
          <div style={{ fontSize: 9, color: '#555', fontFamily: 'JetBrains Mono', marginBottom: 4 }}>OVERALL SENTIMENT</div>
          <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'JetBrains Mono', color: sentColor }}>{overallSentiment}</div>
          <div style={{ fontSize: 10, color: sentColor, fontFamily: 'JetBrains Mono' }}>{sentimentScore}% bullish</div>
        </div>
        <div style={{ padding: '10px 12px', background: '#0d0d0d', border: '1px solid rgba(0,208,132,0.2)', borderRadius: 6, textAlign: 'center' }}>
          <div style={{ fontSize: 9, color: '#555', fontFamily: 'JetBrains Mono', marginBottom: 4 }}>BULLISH NEWS</div>
          <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'JetBrains Mono', color: '#00d084' }}>{bullishCount}</div>
        </div>
        <div style={{ padding: '10px 12px', background: '#0d0d0d', border: '1px solid rgba(255,68,68,0.2)', borderRadius: 6, textAlign: 'center' }}>
          <div style={{ fontSize: 9, color: '#555', fontFamily: 'JetBrains Mono', marginBottom: 4 }}>BEARISH NEWS</div>
          <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'JetBrains Mono', color: '#ff4444' }}>{bearishCount}</div>
        </div>
        <div style={{ padding: '10px 12px', background: '#0d0d0d', border: '1px solid rgba(136,136,136,0.2)', borderRadius: 6, textAlign: 'center' }}>
          <div style={{ fontSize: 9, color: '#555', fontFamily: 'JetBrains Mono', marginBottom: 4 }}>TOTAL NEWS</div>
          <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'JetBrains Mono', color: '#888' }}>{displayNews.length}</div>
        </div>
      </div>
      <div style={{ height: 6, background: '#1a1a1a', borderRadius: 3, overflow: 'hidden', display: 'flex', marginBottom: 14 }}>
        <div style={{ width: (bullishCount / Math.max(displayNews.length, 1)) * 100 + '%', background: '#00d084', transition: 'width 1s ease' }} />
        <div style={{ width: (neutralCount / Math.max(displayNews.length, 1)) * 100 + '%', background: '#444' }} />
        <div style={{ flex: 1, background: '#ff4444' }} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 5 }}>
          {[{ key: 'stock', label: q.symbol + ' NEWS (' + stockNews.length + ')' }, { key: 'macro', label: 'MACRO NEWS (' + macroNews.length + ')' }].map(function(t) {
            return (
              <button key={t.key} onClick={function() { setActiveTab(t.key); setActiveFilter('all'); }}
                style={{ padding: '5px 14px', fontSize: 9, fontFamily: 'JetBrains Mono', background: activeTab === t.key ? '#4a9eff' : '#141414', color: activeTab === t.key ? '#000' : '#555', border: '1px solid ' + (activeTab === t.key ? '#4a9eff' : '#222'), borderRadius: 3, cursor: 'pointer', fontWeight: 700 }}>
                {t.label}
              </button>
            );
          })}
        </div>
        <div style={{ flex: 1 }} />
        <input value={searchQuery} onChange={function(e) { setSearchQuery(e.target.value); }}
          placeholder="Search news..."
          style={{ background: '#141414', border: '1px solid #222', borderRadius: 4, padding: '4px 10px', color: '#e8e8e8', fontFamily: 'JetBrains Mono', fontSize: 10, outline: 'none', width: 160 }} />
      </div>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 12 }}>
        {categories.map(function(cat) {
          var catInfo = NEWS_CATEGORIES[cat];
          var count = cat === 'all' ? displayNews.length : displayNews.filter(function(n) { return n.type === cat; }).length;
          return (
            <button key={cat} onClick={function() { setActiveFilter(cat); }}
              style={{ padding: '3px 10px', fontSize: 8, fontFamily: 'JetBrains Mono', background: activeFilter === cat ? (catInfo ? catInfo.color : '#f5a623') : '#141414', color: activeFilter === cat ? '#000' : (catInfo ? catInfo.color : '#888'), border: '1px solid ' + (activeFilter === cat ? (catInfo ? catInfo.color : '#f5a623') : '#222'), borderRadius: 3, cursor: 'pointer', fontWeight: 700 }}>
              {catInfo ? catInfo.icon + ' ' + catInfo.label : 'ALL'} ({count})
            </button>
          );
        })}
      </div>
      {isLoading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '24px 0', color: '#555', fontFamily: 'JetBrains Mono', fontSize: 11 }}>
          <div style={{ width: 18, height: 18, border: '2px solid #333', borderTop: '2px solid #4a9eff', borderRadius: '50%', animation: 'mbspin 1s linear infinite' }} />
          Fetching live news...
        </div>
      ) : filteredNews.length === 0 ? (
        <div style={{ color: '#444', fontFamily: 'JetBrains Mono', fontSize: 11, padding: '24px 0', textAlign: 'center' }}>No news found</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {filteredNews.map(function(news, i) { return <NewsCard key={i} news={news} />; })}
        </div>
      )}
    </div>
  );
}

function BridgewaterRisk({ r }) {
  var marketRisk = Math.min(10, r.beta * 5);
  var debtRisk = Math.min(10, (r.debt || 0) * 4);
  var liquidityRisk = r.currentRatio ? Math.max(0, 10 - r.currentRatio * 3) : 5;
  var marginRisk = r.operatingMargin ? Math.max(0, 10 - r.operatingMargin / 3) : 5;
  var overallRisk = ((marketRisk + debtRisk + liquidityRisk + marginRisk) / 4).toFixed(1);
  var estDrawdown = Math.min(60, (r.beta * 20 + (r.debt || 0) * 5)).toFixed(1);
  return (
    <div>
      <SectionHeader title="04 - BRIDGEWATER RISK ANALYSIS" subtitle="Portfolio risk, stress test, drawdown simulation" color="#a78bfa" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 24 }}>
        <GaugeMeter value={parseFloat(marketRisk.toFixed(1))} label="MARKET" color={marketRisk > 6 ? '#ff4444' : marketRisk > 4 ? '#f5a623' : '#00d084'} />
        <GaugeMeter value={parseFloat(debtRisk.toFixed(1))} label="DEBT" color={debtRisk > 6 ? '#ff4444' : debtRisk > 3 ? '#f5a623' : '#00d084'} />
        <GaugeMeter value={parseFloat(liquidityRisk.toFixed(1))} label="LIQUIDITY" color={liquidityRisk > 6 ? '#ff4444' : liquidityRisk > 3 ? '#f5a623' : '#00d084'} />
        <GaugeMeter value={parseFloat(marginRisk.toFixed(1))} label="MARGIN" color={marginRisk > 6 ? '#ff4444' : marginRisk > 3 ? '#f5a623' : '#00d084'} />
        <GaugeMeter value={parseFloat(overallRisk)} label="OVERALL" color={overallRisk > 6 ? '#ff4444' : overallRisk > 4 ? '#f5a623' : '#00d084'} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div>
          <div style={{ fontSize: 9, color: '#555', fontFamily: 'JetBrains Mono', letterSpacing: 1, marginBottom: 8 }}>STRESS TEST</div>
          <StatRow label="Beta" value={fmt(r.beta)} color={r.beta < 1 ? '#00d084' : r.beta < 1.5 ? '#f5a623' : '#ff4444'} />
          <StatRow label="Est. Max Drawdown" value={estDrawdown + '%'} color="#ff4444" />
          <StatRow label="D/E Ratio" value={r.debt ? fmt(r.debt) : '-'} color={r.debt < 1 ? '#00d084' : '#ff4444'} />
          <StatRow label="Current Ratio" value={r.currentRatio ? fmt(r.currentRatio) : '-'} color={r.currentRatio > 1.5 ? '#00d084' : '#f5a623'} />
          <StatRow label="Volatility Grade" value={r.beta > 1.5 ? 'HIGH' : r.beta > 1 ? 'MEDIUM' : 'LOW'} color={r.beta > 1.5 ? '#ff4444' : r.beta > 1 ? '#f5a623' : '#00d084'} />
        </div>
        <div>
          <div style={{ fontSize: 9, color: '#555', fontFamily: 'JetBrains Mono', letterSpacing: 1, marginBottom: 8 }}>HEDGING SUGGESTIONS</div>
          {[
            { label: 'Add GOLDBEES', reason: 'Gold allocation for macro hedge', color: '#f5a623' },
            { label: 'Add MODEFENCE', reason: 'Defence sector diversification', color: '#4a9eff' },
            { label: r.beta > 1.3 ? 'Reduce position size' : 'Normal sizing OK', reason: r.beta > 1.3 ? 'High beta - keep max 5% of portfolio' : 'Beta manageable - normal sizing OK', color: r.beta > 1.3 ? '#ff4444' : '#00d084' },
            { label: r.debt > 1.5 ? 'Monitor debt levels' : 'Debt under control', reason: 'D/E ' + fmt(r.debt) + (r.debt > 1.5 ? ' is elevated - watch quarterly' : ' is comfortable'), color: r.debt > 1.5 ? '#ff4444' : '#00d084' },
          ].map(function(s, i) {
            return (
              <div key={i} style={{ padding: '7px 10px', borderLeft: '2px solid ' + s.color, marginBottom: 6, background: '#0d0d0d', borderRadius: '0 4px 4px 0' }}>
                <div style={{ fontSize: 10, fontFamily: 'JetBrains Mono', color: s.color, fontWeight: 700 }}>{s.label}</div>
                <div style={{ fontSize: 9, fontFamily: 'JetBrains Mono', color: '#555', marginTop: 2 }}>{s.reason}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function JPMorganEarnings({ r }) {
  var eps = r.eps || 0;
  var fwdEps = r.forwardEps || eps * 1.15;
  var quarters = [
    { q: 'Q1', eps: eps * 0.82, change: r.epsGrowth ? r.epsGrowth * 0.8 : 8 },
    { q: 'Q2', eps: eps * 0.87, change: r.epsGrowth ? r.epsGrowth * 0.9 : 10 },
    { q: 'Q3', eps: eps * 0.93, change: r.epsGrowth ? r.epsGrowth * 0.95 : 12 },
    { q: 'Q4 (Latest)', eps: eps, change: r.epsGrowth ? r.epsGrowth : 15 },
  ];
  return (
    <div>
      <SectionHeader title="05 - JPMORGAN EARNINGS BREAKDOWN" subtitle="EPS trends, margins, bull vs bear scenarios" color="#00d084" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 9, color: '#555', fontFamily: 'JetBrains Mono', letterSpacing: 1, marginBottom: 8 }}>EARNINGS PROFILE</div>
          <StatRow label="Trailing EPS" value={eps ? 'Rs ' + fmt(eps) : '-'} />
          <StatRow label="Forward EPS" value={fwdEps ? 'Rs ' + fmt(fwdEps) : '-'} color="#00d084" />
          <StatRow label="EPS Growth (YoY)" value={r.epsGrowth ? fmt(r.epsGrowth) + '%' : '-'} color={r.epsGrowth > 0 ? '#00d084' : '#ff4444'} />
          <StatRow label="Revenue Growth" value={r.revenueGrowth ? fmt(r.revenueGrowth) + '%' : '-'} color={r.revenueGrowth > 0 ? '#00d084' : '#ff4444'} />
          <div style={{ marginTop: 16 }}>
            <ProgressBar label="Gross Margin" value={r.grossMargin} max={80} color="#00d084" />
            <ProgressBar label="Operating Margin" value={r.operatingMargin} max={40} color="#4a9eff" />
            <ProgressBar label="ROE" value={r.roe} max={40} color="#f5a623" />
          </div>
        </div>
        <div>
          <div style={{ padding: '12px', background: '#0d0d0d', borderRadius: 6, marginBottom: 12, border: '1px solid #1e1e1e' }}>
            <div style={{ fontSize: 11, color: '#888', fontFamily: 'JetBrains Mono', marginBottom: 4 }}>Analyst Target</div>
            <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'JetBrains Mono', color: r.targetPrice ? '#00d084' : '#888' }}>
              {r.targetPrice ? 'Rs ' + fmt(r.targetPrice) : 'N/A'}
            </div>
            {r.targetUpside != null && (
              <div style={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: r.targetUpside > 0 ? '#00d084' : '#ff4444', marginTop: 4 }}>
                {r.targetUpside > 0 ? 'UP' : 'DOWN'} {Math.abs(r.targetUpside).toFixed(1)}% from CMP
              </div>
            )}
            <div style={{ fontSize: 10, fontFamily: 'JetBrains Mono', color: '#444', marginTop: 6 }}>
              Rating: <span style={{ color: r.rec && r.rec.includes('buy') ? '#00d084' : '#f5a623' }}>{r.rec ? r.rec.replace('_', ' ').toUpperCase() : 'N/A'}</span>
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

function MultibaggerReturns({ r }) {
  var [shares, setShares] = useState(100);
  var [buyPrice, setBuyPrice] = useState(Math.round(r.ltp));
  var [catalysts, setCatalysts] = useState([]);

  useEffect(function() {
    var auto = [];
    if (r.revenueGrowth > 10) auto.push(0);
    if (r.epsGrowth > 10) auto.push(5);
    if (r.debt < 0.5) auto.push(6);
    if (r.rec === 'strong_buy' || r.rec === 'buy') auto.push(4);
    if (r.grossMargin > 35) auto.push(7);
    setCatalysts(auto);
  }, [r.revenueGrowth, r.epsGrowth, r.debt, r.rec, r.grossMargin]);

  var investment = shares * buyPrice;
  var currentValue = shares * r.ltp;
  var gainLoss = currentValue - investment;
  var gainLossPct = investment > 0 ? ((gainLoss) / investment) * 100 : 0;
  var cagrs = [10, 12, 15, 18, 20];
  var years = [1, 3, 5, 10, 15, 20];
  var colors = ['#888', '#f5a623', '#4a9eff', '#a78bfa', '#00d084'];
  var toggleCatalyst = function(i) { setCatalysts(function(prev) { return prev.includes(i) ? prev.filter(function(c) { return c !== i; }) : prev.concat([i]); }); };
  var catalystScore = catalysts.length;

  return (
    <div>
      <SectionHeader title="06 - MULTIBAGGER BEAST RETURN ENGINE" subtitle="Compounding projections + catalyst score (auto-filled from live data)" color="#00d084" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
        <div style={{ padding: '10px 12px', background: '#0d0d0d', borderRadius: 6, border: '1px solid #1e1e1e' }}>
          <div style={{ fontSize: 9, color: '#555', fontFamily: 'JetBrains Mono', marginBottom: 6 }}>SHARES OWNED</div>
          <input type="number" value={shares} onChange={function(e) { setShares(Number(e.target.value)); }}
            style={{ width: '100%', background: '#111', border: '1px solid #222', borderRadius: 4, padding: '6px 8px', color: '#f5a623', fontFamily: 'JetBrains Mono', fontSize: 14, fontWeight: 700 }} />
        </div>
        <div style={{ padding: '10px 12px', background: '#0d0d0d', borderRadius: 6, border: '1px solid #1e1e1e' }}>
          <div style={{ fontSize: 9, color: '#555', fontFamily: 'JetBrains Mono', marginBottom: 6 }}>BUY PRICE (Rs)</div>
          <input type="number" value={buyPrice} onChange={function(e) { setBuyPrice(Number(e.target.value)); }}
            style={{ width: '100%', background: '#111', border: '1px solid #222', borderRadius: 4, padding: '6px 8px', color: '#4a9eff', fontFamily: 'JetBrains Mono', fontSize: 14, fontWeight: 700 }} />
        </div>
        <div style={{ padding: '10px 12px', background: gainLoss >= 0 ? 'rgba(0,208,132,0.08)' : 'rgba(255,68,68,0.08)', borderRadius: 6, border: '1px solid ' + (gainLoss >= 0 ? 'rgba(0,208,132,0.2)' : 'rgba(255,68,68,0.2)') }}>
          <div style={{ fontSize: 9, color: '#555', fontFamily: 'JetBrains Mono', marginBottom: 4 }}>CURRENT P&L</div>
          <div style={{ fontSize: 15, fontWeight: 700, fontFamily: 'JetBrains Mono', color: gainLoss >= 0 ? '#00d084' : '#ff4444' }}>
            {gainLoss >= 0 ? '+' : ''}Rs {fmt(gainLoss)}
          </div>
          <div style={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: gainLoss >= 0 ? '#00d084' : '#ff4444' }}>{gainLossPct.toFixed(1)}% return</div>
        </div>
      </div>
      <div style={{ marginBottom: 20, overflowX: 'auto' }}>
        <div style={{ fontSize: 9, color: '#555', fontFamily: 'JetBrains Mono', letterSpacing: 1, marginBottom: 8 }}>WEALTH PROJECTION (Rs)</div>
        <table style={{ width: '100%', fontSize: 10, fontFamily: 'JetBrains Mono', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ padding: '6px 8px', textAlign: 'left', color: '#444', fontSize: 9, borderBottom: '1px solid #1e1e1e', background: '#0a0a0a' }}>YEAR</th>
              {cagrs.map(function(c, i) {
                return <th key={c} style={{ padding: '6px 8px', textAlign: 'right', color: colors[i], fontSize: 9, borderBottom: '1px solid #1e1e1e', background: '#0a0a0a' }}>{c}% CAGR</th>;
              })}
            </tr>
          </thead>
          <tbody>
            {years.map(function(yr) {
              return (
                <tr key={yr} style={{ borderBottom: '1px solid #111' }}>
                  <td style={{ padding: '6px 8px', color: '#888' }}>Year {yr}</td>
                  {cagrs.map(function(c, ci) {
                    var val = investment * Math.pow(1 + c / 100, yr);
                    return <td key={c} style={{ padding: '6px 8px', textAlign: 'right', color: colors[ci], fontWeight: yr === 10 || yr === 20 ? 700 : 400 }}>Rs {fmt(val, 0)}</td>;
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 9, color: '#555', fontFamily: 'JetBrains Mono', letterSpacing: 1 }}>CATALYST CHECKLIST (AUTO-FILLED FROM LIVE DATA)</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'JetBrains Mono', color: catalystScore >= 7 ? '#00d084' : catalystScore >= 4 ? '#f5a623' : '#ff4444' }}>{catalystScore}/10</div>
            <div style={{ fontSize: 9, fontFamily: 'JetBrains Mono', color: catalystScore >= 7 ? '#00d084' : catalystScore >= 4 ? '#f5a623' : '#ff4444' }}>
              {catalystScore >= 7 ? 'STRONG BUY' : catalystScore >= 4 ? 'MODERATE' : 'WEAK SIGNALS'}
            </div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {CATALYSTS.map(function(c, i) {
            return (
              <div key={i} onClick={function() { toggleCatalyst(i); }}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', background: catalysts.includes(i) ? 'rgba(0,208,132,0.08)' : '#0d0d0d', border: '1px solid ' + (catalysts.includes(i) ? '#00d084' : '#1e1e1e'), borderRadius: 4, cursor: 'pointer', transition: 'all 0.15s' }}>
                <div style={{ width: 14, height: 14, borderRadius: 3, border: '2px solid ' + (catalysts.includes(i) ? '#00d084' : '#333'), background: catalysts.includes(i) ? '#00d084' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {catalysts.includes(i) && <span style={{ fontSize: 9, color: '#000', fontWeight: 700 }}>v</span>}
                </div>
                <span style={{ fontSize: 10, fontFamily: 'JetBrains Mono', color: catalysts.includes(i) ? '#00d084' : '#666' }}>{c}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function InvestorVerdicts({ r }) {
  return (
    <div>
      <SectionHeader title="10 LEGEND INVESTOR VERDICTS" subtitle="Auto-generated from live stock metrics" color="#f5a623" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
        {INVESTORS.map(function(inv) {
          return (
            <div key={inv.name} style={{ padding: '10px 14px', background: '#0d0d0d', border: '1px solid #1e1e1e', borderRadius: 6, borderLeft: '2px solid #f5a623' }}>
              <div style={{ fontFamily: 'JetBrains Mono', fontSize: 11, fontWeight: 700, color: '#f5a623', marginBottom: 5 }}>{inv.emoji} {inv.name}</div>
              <div style={{ fontSize: 10, fontFamily: 'JetBrains Mono', color: '#777', lineHeight: 1.7, fontStyle: 'italic' }}>"{inv.rule(r)}"</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SevenStepPanel({ r }) {
  var checks = [
    { label: 'P/E < 20', actual: r.pe ? fmt(r.pe) : '-', pass: r.pe != null && r.pe < 20 },
    { label: 'ROIC > 15%', actual: r.roe ? fmt(r.roe) + '%' : '-', pass: r.roe != null && r.roe > 15 },
    { label: 'D/E < 1', actual: r.debt ? fmt(r.debt) : '-', pass: r.debt != null && r.debt < 1 },
    { label: 'EPS > 10%', actual: r.epsGrowth ? fmt(r.epsGrowth) + '%' : '-', pass: r.epsGrowth != null && r.epsGrowth > 10 },
    { label: 'ROE > 15%', actual: r.roe ? fmt(r.roe) + '%' : '-', pass: r.roe != null && r.roe > 15 },
    { label: 'OpMgn > 10%', actual: r.operatingMargin ? fmt(r.operatingMargin) + '%' : '-', pass: r.operatingMargin != null && r.operatingMargin > 10 },
    { label: 'GrsMgn > 30%', actual: r.grossMargin ? fmt(r.grossMargin) + '%' : '-', pass: r.grossMargin != null && r.grossMargin > 30 },
  ];
  var passCount = checks.filter(function(c) { return c.pass; }).length;
  var scoreColor = passCount === 7 ? '#f5a623' : passCount >= 5 ? '#00d084' : passCount >= 3 ? '#f5a623' : '#ff4444';
  return (
    <div style={{ padding: '14px 20px', background: '#080808', borderTop: '1px solid #1e1e1e', flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontFamily: 'JetBrains Mono', fontSize: 11, fontWeight: 700, color: '#f5a623', letterSpacing: 2 }}>7-STEP FORMULA CHECK (LIVE DATA)</div>
        <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'JetBrains Mono', color: scoreColor }}>{passCount}/7 {passCount === 7 ? 'PERFECT' : passCount >= 5 ? 'STRONG' : passCount >= 3 ? 'AVERAGE' : 'WEAK'}</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
        {checks.map(function(c) {
          return (
            <div key={c.label} style={{ padding: '6px 8px', background: c.pass ? 'rgba(0,208,132,0.1)' : 'rgba(255,68,68,0.1)', border: '1px solid ' + (c.pass ? 'rgba(0,208,132,0.3)' : 'rgba(255,68,68,0.3)'), borderRadius: 4, textAlign: 'center' }}>
              <div style={{ fontSize: 8, fontFamily: 'JetBrains Mono', color: '#555', marginBottom: 3 }}>{c.label}</div>
              <div style={{ fontSize: 11, fontFamily: 'JetBrains Mono', fontWeight: 700, color: c.pass ? '#00d084' : c.actual === '-' ? '#555' : '#ff4444' }}>{c.actual}</div>
              <div style={{ fontSize: 8, fontFamily: 'JetBrains Mono', color: c.pass ? '#00d084' : c.actual === '-' ? '#333' : '#ff4444', marginTop: 2 }}>{c.actual === '-' ? 'N/A' : c.pass ? 'PASS' : 'FAIL'}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function MultibaggerEngine({ symbol }) {
  var [activeModules, setActiveModules] = useState(['all']);
  var [data, setData] = useState(null);
  var [loading, setLoading] = useState(false);
  var [ticker, setTicker] = useState(symbol || 'RELIANCE');
  var [error, setError] = useState(null);
  var [lastUpdated, setLastUpdated] = useState(null);

  var modules = [
    { key: 'goldman', label: '01 GS' },
    { key: 'dcf', label: '02 DCF' },
    { key: 'macro', label: '03 MACRO' },
    { key: 'risk', label: '04 RISK' },
    { key: 'earnings', label: '05 EARN' },
    { key: 'returns', label: '06 MB' },
    { key: 'verdicts', label: '10 LEGENDS' },
  ];

  var isActive = function(key) { return activeModules.includes('all') || activeModules.includes(key); };

  var toggleModule = function(key) {
    if (key === 'all') { setActiveModules(['all']); return; }
    setActiveModules(function(prev) {
      var without = prev.filter(function(m) { return m !== 'all'; });
      return without.includes(key) ? without.filter(function(m) { return m !== key; }) : without.concat([key]);
    });
  };

  var loadData = useCallback(function(sym) {
    if (!sym) return;
    setLoading(true);
    setError(null);
    Promise.allSettled([fetchQuote(sym), fetchFundamentals(sym)])
      .then(function(results) {
        var quoteRes = results[0];
        var fundRes = results[1];
        var quote = quoteRes.status === 'fulfilled' ? quoteRes.value : null;
        var fundamentals = fundRes.status === 'fulfilled' ? fundRes.value : null;
        if (!quote) { setError('No data found for ' + sym); setLoading(false); return; }
        setData({ quote: quote, fundamentals: fundamentals });
        setLastUpdated(new Date());
        localStorage.setItem('mb_last_ticker', sym);
        setLoading(false);
      });
  }, []);

  useEffect(function() {
    var saved = localStorage.getItem('mb_last_ticker');
    var sym = symbol || saved || 'RELIANCE';
    setTicker(sym);
    loadData(sym);
  }, [symbol]);

  var r = data && data.quote ? normalize(data.quote) : null;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#0a0a0a', overflow: 'hidden' }}>
      <style>{'.mbspin{animation:mbspin 1s linear infinite}@keyframes mbspin{to{transform:rotate(360deg)}}@keyframes mbpulse{0%,100%{opacity:1}50%{opacity:0.3}}'}</style>
      <div style={{ padding: '10px 16px', borderBottom: '1px solid #1e1e1e', background: '#0d0d0d', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
          <div style={{ fontFamily: 'JetBrains Mono', fontSize: 14, fontWeight: 700, color: '#f5a623', letterSpacing: 2 }}>MULTIBAGGER ENGINE</div>
          <div style={{ fontSize: 9, color: '#444', fontFamily: 'JetBrains Mono', letterSpacing: 1 }}>COSMIC TIER - 6 FRAMEWORKS + LIVE NEWS + 10 LEGENDS</div>
          <div style={{ flex: 1 }} />
          {data && data.quote && r && (
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: 12 }}>
              <span style={{ color: '#f5a623', fontWeight: 700 }}>{ticker}</span>
              <span style={{ marginLeft: 10, color: data.quote.changePct >= 0 ? '#00d084' : '#ff4444', fontWeight: 600 }}>
                Rs {fmt(data.quote.ltp)} ({data.quote.changePct >= 0 ? '+' : ''}{fmt(data.quote.changePct)}%)
              </span>
              {r.rec && (
                <span style={{ marginLeft: 10, fontSize: 10, color: r.rec.includes('buy') ? '#00d084' : '#f5a623', border: '1px solid currentColor', padding: '1px 6px', borderRadius: 3 }}>
                  {r.rec.replace('_', ' ').toUpperCase()}
                </span>
              )}
            </div>
          )}
          {lastUpdated && <div style={{ fontSize: 9, color: '#333', fontFamily: 'JetBrains Mono' }}>Updated {lastUpdated.toLocaleTimeString('en-IN')}</div>}
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <input value={ticker} onChange={function(e) { setTicker(e.target.value.toUpperCase()); }}
            onKeyDown={function(e) { if (e.key === 'Enter') loadData(ticker); }}
            placeholder="Enter NSE symbol (RELIANCE, TCS, ICICIBANK...)"
            style={{ flex: 1, background: '#141414', border: '1px solid #2a2a2a', borderRadius: 4, padding: '8px 12px', color: '#e8e8e8', fontFamily: 'JetBrains Mono', fontSize: 12, outline: 'none' }} />
          <button onClick={function() { loadData(ticker); }}
            style={{ padding: '8px 24px', background: '#f5a623', border: 'none', borderRadius: 4, color: '#000', fontFamily: 'JetBrains Mono', fontSize: 11, fontWeight: 700, cursor: 'pointer', letterSpacing: 1 }}>
            ANALYZE
          </button>
        </div>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          <button onClick={function() { toggleModule('all'); }}
            style={{ padding: '4px 14px', fontSize: 9, fontFamily: 'JetBrains Mono', background: activeModules.includes('all') ? '#f5a623' : '#141414', color: activeModules.includes('all') ? '#000' : '#555', border: '1px solid ' + (activeModules.includes('all') ? '#f5a623' : '#222'), borderRadius: 3, cursor: 'pointer', fontWeight: 700, letterSpacing: 1 }}>
            ALL MODE
          </button>
          {modules.map(function(m) {
            return (
              <button key={m.key} onClick={function() { toggleModule(m.key); }}
                style={{ padding: '4px 12px', fontSize: 9, fontFamily: 'JetBrains Mono', background: isActive(m.key) && !activeModules.includes('all') ? 'rgba(245,166,35,0.15)' : '#141414', color: isActive(m.key) ? '#f5a623' : '#444', border: '1px solid ' + (isActive(m.key) ? 'rgba(245,166,35,0.5)' : '#222'), borderRadius: 3, cursor: 'pointer', letterSpacing: 1 }}>
                {m.label}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 300, gap: 16 }}>
            <div style={{ width: 48, height: 48, border: '3px solid #1e1e1e', borderTop: '3px solid #f5a623', borderRadius: '50%' }} className="mbspin" />
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: 13, color: '#f5a623', letterSpacing: 3, animation: 'mbpulse 1.5s ease-in-out infinite' }}>
              ACTIVATING COSMIC TIER BEAST MODE...
            </div>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: 10, color: '#444' }}>Fetching live data from Yahoo Finance + Screener.in</div>
          </div>
        )}
        {error && !loading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200, gap: 12 }}>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: 12, color: '#ff4444' }}>DATA FETCH FAILED</div>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: 10, color: '#555' }}>{error}</div>
            <button onClick={function() { loadData(ticker); }}
              style={{ padding: '6px 20px', background: '#f5a623', border: 'none', borderRadius: 4, color: '#000', fontFamily: 'JetBrains Mono', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
              RETRY
            </button>
          </div>
        )}
        {!loading && !error && data && r && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
            {isActive('goldman') && (
              <div style={{ padding: '20px', background: '#111', border: '1px solid #1e1e1e', borderRadius: 8 }}>
                <GoldmanScreener q={data.quote} r={r} fundamentals={data.fundamentals} />
              </div>
            )}
            {isActive('dcf') && (
              <div style={{ padding: '20px', background: '#111', border: '1px solid #1e1e1e', borderRadius: 8 }}>
                <DCFValuation r={r} />
              </div>
            )}
            {isActive('macro') && (
              <div style={{ padding: '20px', background: '#111', border: '1px solid #1e1e1e', borderRadius: 8 }}>
                <MacroImpactAnalyzer q={data.quote} r={r} />
              </div>
            )}
            {isActive('risk') && (
              <div style={{ padding: '20px', background: '#111', border: '1px solid #1e1e1e', borderRadius: 8 }}>
                <BridgewaterRisk r={r} />
              </div>
            )}
            {isActive('earnings') && (
              <div style={{ padding: '20px', background: '#111', border: '1px solid #1e1e1e', borderRadius: 8 }}>
                <JPMorganEarnings r={r} />
              </div>
            )}
            {isActive('returns') && (
              <div style={{ padding: '20px', background: '#111', border: '1px solid #1e1e1e', borderRadius: 8 }}>
                <MultibaggerReturns r={r} />
              </div>
            )}
            {isActive('verdicts') && (
              <div style={{ padding: '20px', background: '#111', border: '1px solid #1e1e1e', borderRadius: 8 }}>
                <InvestorVerdicts r={r} />
              </div>
            )}
          </div>
        )}
      </div>

      {data && r && !loading && <SevenStepPanel r={r} />}
    </div>
  );
}