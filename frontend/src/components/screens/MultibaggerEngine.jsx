import { useState, useEffect, useCallback } from 'react';
import {
  fetchQuote, fetchFundamentals, fetchStockNews, fetchMacroNews,
  fetchInsider, fetchFinancials, fetchProfile
} from '../../utils/api';

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
  govt_policy: { label: 'GOVT/PLI', color: '#00d084', icon: '🇮🇳' },
  flows: { label: 'FII/DII FLOWS', color: '#a78bfa', icon: '💹' },
  commodity: { label: 'COMMODITY/OIL', color: '#f97316', icon: '🛢️' },
  global: { label: 'GLOBAL/US/CHINA', color: '#4a9eff', icon: '🌍' },
  general: { label: 'GENERAL', color: '#888', icon: '📰' },
};

const INVESTORS = [
  { name: 'Warren Buffett', emoji: '🎩', rule: (d) => d.pe < 15 && d.roe > 18 ? 'Strong moat at fair price. This is a BUY.' : d.pe < 25 && d.roe > 15 ? 'Decent business. Watch for a better entry point.' : d.debt < 0.5 ? 'Low debt is good. But show me the moat first.' : 'Price too rich for my blood. I will wait for panic.' },
  { name: 'Rakesh Jhunjhunwala', emoji: '🦁', rule: (d) => d.div > 5 ? 'Income plus growth combo. Rare beast. Load up on dips.' : d.epsGrowth > 20 ? 'EPS rocket launching. India growth story intact. Buy.' : d.pe < 20 && d.revenueGrowth > 15 ? 'Market sleeping on this. My kind of contrarian bet.' : 'Good business. Wait for market panic to get better entry.' },
  { name: 'Vijay Kedia', emoji: '🦅', rule: (d) => d.pe < 12 ? 'Market has not discovered this yet. Aggressively accumulate.' : d.roe > 20 && d.revenueGrowth > 15 ? 'SMILE framework passed. Quality compounder at work.' : d.revenueGrowth > 20 ? 'Top-line growing explosively. Earnings will follow. Buy.' : 'Needs more growth visibility before I commit capital.' },
  { name: 'Peter Lynch', emoji: '📊', rule: (d) => d.pe > 0 && d.epsGrowth > 0 && d.pe < d.epsGrowth * 100 ? 'PEG ratio attractive. This is exactly what I hunt for.' : d.epsGrowth > 20 ? 'Growth hiding in plain sight. Classic ten-bagger setup.' : d.div > 3 ? 'Pays me to wait. Patient capital always wins.' : 'Know what you own. Does this fit your circle?' },
  { name: 'Charlie Munger', emoji: '🧠', rule: (d) => d.roe > 20 && d.debt < 0.5 ? 'Wonderful company at fair price. Better than fair at wonderful.' : d.grossMargin > 40 ? 'Pricing power evident. That IS the moat. Hold forever.' : d.pe > 50 ? 'Paying too much for future hope. Speculating not investing.' : 'Invert, always invert. What could go catastrophically wrong?' },
  { name: 'Howard Marks', emoji: '⚖️', rule: (d) => d.beta > 1.5 ? 'High beta. Are you compensated adequately for this risk?' : d.debt > 2 ? 'Debt is the silent killer of companies. Approach with caution.' : d.targetUpside > 30 ? 'Significant analyst upside. But where are we in the cycle?' : 'Risk control first. Returns are a byproduct of that.' },
  { name: 'George Soros', emoji: '🌊', rule: (d) => d.beta > 1.3 ? 'Reflexivity in play. Momentum building. Ride the wave carefully.' : d.epsGrowth > 25 ? 'Positive feedback loop forming. Market narrative will catch up.' : d.revenueGrowth > 20 ? 'Growth accelerating. The prevailing bias is shifting bullish.' : 'Find the prevailing bias, exploit it, then exit before reversal.' },
  { name: 'Ashish Kacholia', emoji: '🔬', rule: (d) => d.pe < 25 && d.revenueGrowth > 20 ? 'Hidden gem with explosive growth. Classic smallcap multibagger.' : d.roe > 18 && d.debt < 1 ? 'Capital efficient with skin in game. Promoter holding matters.' : d.grossMargin > 35 ? 'High gross margins mean strong product. This can scale.' : 'Need more ground-level research before taking a large position.' },
  { name: 'Porinju Veliyath', emoji: '🚀', rule: (d) => d.pe < 10 ? 'Deep value. Market completely wrong here. Contrarian STRONG BUY.' : d.revenueGrowth > 30 ? 'Explosive top-line growth. This is a multibagger in early stages.' : d.pb < 1.5 && d.roe > 12 ? 'Trading near book with decent returns. Margin of safety present.' : 'Contrarian bets require patience. The market will eventually agree.' },
  { name: 'Ramesh Damani', emoji: '🏛️', rule: (d) => d.div > 3 && d.roe > 15 ? 'Long India story compounding quietly. Hold for decades.' : d.pe < 20 && d.revenueGrowth > 10 ? 'Sensex will 10x by 2050. Quality stocks like this will do 20x.' : d.epsGrowth > 15 ? 'Earnings upgrade cycle beginning. This is bull market fuel.' : 'India demographic story intact. Stay invested in quality businesses.' },
];

const CATALYSTS = [
  'India GDP growth tailwind', 'RBI rate cut cycle beginning', 'Demerger / restructuring trigger',
  'New product / segment launch', 'Capex cycle turning positive', 'FII buying momentum building',
  'Debt reduction on track', 'Market share gaining rapidly', 'Subsidiary listing potential', 'Regulatory clearance received',
];

const fmt = (n, d) => n != null && !isNaN(n) ? Number(n).toLocaleString('en-IN', { maximumFractionDigits: d != null ? d : 2 }) : '-';
const fmtCr = (n) => { if (!n) return '-'; const cr = n / 1e7; if (cr >= 1e5) return 'Rs ' + (cr/1e5).toFixed(2) + 'L Cr'; if (cr >= 1e3) return 'Rs ' + (cr/1e3).toFixed(2) + 'K Cr'; return 'Rs ' + cr.toFixed(2) + ' Cr'; };
const fmtDate = (ts) => { if (!ts) return '-'; return new Date(ts * 1000).toLocaleDateString('en-IN'); };

function normalize(q) {
  return {
    pe: q.pe || null, pb: q.pb || null,
    roe: q.roe ? q.roe * 100 : null,
    debt: q.debt || null,
    div: q.div ? q.div * 100 : null,
    beta: q.beta || 1,
    eps: q.eps || null, forwardEps: q.forwardEps || null,
    epsGrowth: q.epsGrowth ? q.epsGrowth * 100 : null,
    revenueGrowth: q.revenueGrowth ? q.revenueGrowth * 100 : null,
    grossMargin: q.grossMargin ? q.grossMargin * 100 : null,
    operatingMargin: q.operatingMargin ? q.operatingMargin * 100 : null,
    currentRatio: q.currentRatio || null,
    targetPrice: q.targetPrice || null,
    rec: q.recommendation || null,
    ltp: q.ltp || 0, marketCap: q.marketCap || null,
    sector: q.sector || '',
    targetUpside: q.targetPrice && q.ltp ? ((q.targetPrice - q.ltp) / q.ltp) * 100 : null,
  };
}

function getSentiment(title) {
  const t = title.toLowerCase();
  const pos = ['surge','rise','gain','rally','growth','profit','beat','record','buy','upgrade','strong','boost','wins','soar','jump','expand','invest','order','contract','approved','launch','dividend','bonus'];
  const neg = ['fall','drop','loss','decline','miss','cut','warn','risk','sell','downgrade','weak','crash','slump','crisis','fraud','penalty','fine','ban','reject','delay','resign'];
  const ps = pos.filter(w => t.includes(w)).length;
  const ns = neg.filter(w => t.includes(w)).length;
  return ps > ns ? 'bullish' : ns > ps ? 'bearish' : 'neutral';
}

function timeAgo(d) {
  const diff = (Date.now() - new Date(d).getTime()) / 1000;
  if (diff < 3600) return Math.floor(diff/60) + 'm ago';
  if (diff < 86400) return Math.floor(diff/3600) + 'h ago';
  return Math.floor(diff/86400) + 'd ago';
}

// UI Components
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
        {badge && <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 3, background: pass ? 'rgba(0,208,132,0.15)' : 'rgba(255,68,68,0.15)', color: pass ? '#00d084' : '#ff4444', border: '1px solid ' + (pass ? '#00d084' : '#ff4444'), fontFamily: 'JetBrains Mono', fontWeight: 700 }}>{pass ? 'PASS' : 'FAIL'}</span>}
      </div>
    </div>
  );
}

function GaugeMeter({ value, max, label, color }) {
  const p = Math.min(Math.max((value / (max || 10)) * 100, 0), 100);
  const c = color || (p > 66 ? '#00d084' : p > 33 ? '#f5a623' : '#ff4444');
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ position: 'relative', width: 80, height: 80, margin: '0 auto' }}>
        <svg viewBox="0 0 80 80" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="40" cy="40" r="32" fill="none" stroke="#1a1a1a" strokeWidth="8" />
          <circle cx="40" cy="40" r="32" fill="none" stroke={c} strokeWidth="8" strokeDasharray={p * 2.01 + ' 201'} strokeLinecap="round" style={{ transition: 'stroke-dasharray 1.2s ease' }} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 14, fontWeight: 700, fontFamily: 'JetBrains Mono', color: c }}>{value.toFixed(1)}</span>
        </div>
      </div>
      <div style={{ fontSize: 9, color: '#555', fontFamily: 'JetBrains Mono', marginTop: 4, letterSpacing: 1 }}>{label}</div>
    </div>
  );
}

function ProgressBar({ label, value, max, color, suffix }) {
  const p = Math.min(Math.max(((value || 0) / (max || 100)) * 100, 0), 100);
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
  const cat = NEWS_CATEGORIES[news.type] || NEWS_CATEGORIES.general;
  const sentiment = news.sentiment
    ? news.sentiment.toLowerCase().includes('bullish') ? 'bullish'
      : news.sentiment.toLowerCase().includes('bearish') ? 'bearish' : 'neutral'
    : getSentiment(news.title);
  const sc = sentiment === 'bullish' ? '#00d084' : sentiment === 'bearish' ? '#ff4444' : '#888';
  const [h, setH] = useState(false);
  return (
    <a href={news.link} target="_blank" rel="noreferrer"
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ display: 'flex', gap: 10, padding: '10px 12px', background: h ? '#141414' : '#0d0d0d', borderRadius: 6, border: '1px solid #1a1a1a', borderLeft: '3px solid ' + sc, textDecoration: 'none', transition: 'background 0.15s' }}>
      <div style={{ flexShrink: 0, width: 28, height: 28, background: cat.color + '18', border: '1px solid ' + cat.color + '33', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>{cat.icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: '#e0e0e0', lineHeight: 1.5, marginBottom: 4 }}>{news.title}</div>
        {news.summary && (
          <div style={{ fontSize: 9, fontFamily: 'JetBrains Mono', color: '#444', lineHeight: 1.5, marginBottom: 5 }}>{news.summary.slice(0, 120)}...</div>
        )}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 8, padding: '1px 6px', borderRadius: 2, background: cat.color + '18', color: cat.color, border: '1px solid ' + cat.color + '33', fontFamily: 'JetBrains Mono', fontWeight: 700 }}>{cat.label}</span>
          <span style={{ fontSize: 8, padding: '1px 6px', borderRadius: 2, background: sc + '18', color: sc, border: '1px solid ' + sc + '33', fontFamily: 'JetBrains Mono', fontWeight: 700 }}>
            {sentiment === 'bullish' ? '▲ BULLISH' : sentiment === 'bearish' ? '▼ BEARISH' : '● NEUTRAL'}
            {news.sentimentScore ? ' ' + (news.sentimentScore > 0 ? '+' : '') + news.sentimentScore.toFixed(2) : ''}
          </span>
          {news.topics?.slice(0, 2).map(t => (
            <span key={t} style={{ fontSize: 8, padding: '1px 6px', borderRadius: 2, background: '#0d0d0d', color: '#444', border: '1px solid #1a1a1a', fontFamily: 'JetBrains Mono' }}>{t.replace(/_/g, ' ').toUpperCase()}</span>
          ))}
          <span style={{ fontSize: 8, color: '#444', fontFamily: 'JetBrains Mono' }}>{news.publisher}</span>
          <span style={{ fontSize: 8, color: '#333', fontFamily: 'JetBrains Mono' }}>{timeAgo(news.publishedAt)}</span>
        </div>
        {news.tickers?.length > 0 && (
          <div style={{ display: 'flex', gap: 4, marginTop: 5, flexWrap: 'wrap' }}>
            {news.tickers.slice(0, 4).map(t => (
              <span key={t.ticker} style={{ fontSize: 8, padding: '1px 5px', borderRadius: 2, background: '#0a0a0a', color: t.sentiment?.includes('Bullish') ? '#00d084' : t.sentiment?.includes('Bearish') ? '#ff4444' : '#555', fontFamily: 'JetBrains Mono', border: '1px solid #141414' }}>
                {t.ticker} {t.sentiment?.includes('Bullish') ? '▲' : t.sentiment?.includes('Bearish') ? '▼' : '●'}
              </span>
            ))}
          </div>
        )}
      </div>
    </a>
  );
}
 

// MODULE 1: Goldman Sachs
function GoldmanScreener({ q, r, fundamentals }) {
  const bullTarget = r.targetPrice || r.ltp * 1.4;
  const moatScore = Math.min(10, (r.roe > 15 ? 2 : r.roe > 10 ? 1 : 0) + (r.revenueGrowth > 10 ? 2 : r.revenueGrowth > 5 ? 1 : 0) + (r.grossMargin > 35 ? 2 : r.grossMargin > 20 ? 1 : 0) + (r.operatingMargin > 15 ? 2 : r.operatingMargin > 8 ? 1 : 0) + (r.debt < 0.5 ? 2 : r.debt < 1 ? 1 : 0));
  const riskScore = Math.min(10, Math.max(1, (r.beta > 1.5 ? 4 : r.beta > 1.2 ? 3 : r.beta > 0.8 ? 2 : 1) + (r.debt > 2 ? 3 : r.debt > 1 ? 2 : 1) + (r.currentRatio < 1 ? 2 : r.currentRatio < 1.5 ? 1 : 0)));
  const recColor = r.rec && r.rec.includes('strong_buy') ? '#00d084' : r.rec && r.rec.includes('buy') ? '#4a9eff' : r.rec && r.rec.includes('hold') ? '#f5a623' : '#ff4444';
  return (
    <div>
      <SectionHeader title="01 - GOLDMAN SACHS SCREENER" subtitle="Quality check + analyst consensus + price levels" />
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
          <StatRow label="Market Cap" value={fmtCr(r.marketCap)} color="#e8e8e8" />
        </div>
        <div>
          <div style={{ marginBottom: 14, padding: '12px', background: '#0d0d0d', borderRadius: 6, border: '1px solid ' + recColor + '33' }}>
            <div style={{ fontSize: 9, color: '#555', fontFamily: 'JetBrains Mono', marginBottom: 6 }}>ANALYST CONSENSUS</div>
            <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'JetBrains Mono', color: recColor, marginBottom: 8 }}>{r.rec ? r.rec.replace('_', ' ').toUpperCase() : 'N/A'}</div>
            {r.targetPrice && <div>
              <div style={{ fontSize: 10, color: '#888', fontFamily: 'JetBrains Mono' }}>Price Target</div>
              <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'JetBrains Mono', color: '#00d084' }}>Rs {fmt(r.targetPrice)}</div>
              {r.targetUpside != null && <div style={{ fontSize: 11, color: r.targetUpside > 0 ? '#00d084' : '#ff4444', fontFamily: 'JetBrains Mono', marginTop: 4 }}>{r.targetUpside > 0 ? 'UP' : 'DOWN'} {Math.abs(r.targetUpside).toFixed(1)}% potential</div>}
            </div>}
          </div>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 9, color: '#555', fontFamily: 'JetBrains Mono', marginBottom: 8 }}>PRICE LEVELS</div>
            {[{ label: 'ANALYST TARGET', val: bullTarget, color: '#00d084' }, { label: 'ENTRY ZONE 1 (-5%)', val: r.ltp * 0.95, color: '#f5a623' }, { label: 'ENTRY ZONE 2 (-12%)', val: r.ltp * 0.88, color: '#f5a623' }, { label: 'STOP LOSS (-20%)', val: r.ltp * 0.80, color: '#ff4444' }, { label: 'BEAR CASE (-28%)', val: r.ltp * 0.72, color: '#ff4444' }].map(t => (
              <div key={t.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 8px', borderBottom: '1px solid #111', borderLeft: '3px solid ' + t.color, marginBottom: 3, background: '#0d0d0d' }}>
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
      {fundamentals && fundamentals.ratios && Object.keys(fundamentals.ratios).length > 0 && (
        <div style={{ marginTop: 14, padding: '12px', background: '#0d0d0d', borderRadius: 6, borderLeft: '2px solid #f5a623' }}>
          <div style={{ fontSize: 9, color: '#444', fontFamily: 'JetBrains Mono', marginBottom: 8 }}>SCREENER.IN LIVE RATIOS</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
            {['ROCE', 'ROE', 'Stock P/E', 'Promoter holding', 'FII holding', 'Debt to equity', 'EPS', 'Dividend Yield', 'Current ratio', 'Piotroski score'].map(k => fundamentals.ratios[k] ? (
              <div key={k} style={{ padding: '6px 8px', background: '#141414', borderRadius: 4 }}>
                <div style={{ fontSize: 8, color: '#444', fontFamily: 'JetBrains Mono', marginBottom: 3 }}>{k.toUpperCase()}</div>
                <div style={{ fontSize: 12, fontFamily: 'JetBrains Mono', fontWeight: 700, color: '#e8e8e8' }}>{fundamentals.ratios[k]}</div>
              </div>
            ) : null)}
          </div>
        </div>
      )}
    </div>
  );
}

// MODULE 2: DCF
function DCFValuation({ r }) {
  const [growth, setGrowth] = useState(15);
  const [tg, setTg] = useState(7);
  const wacc = r.beta ? parseFloat((RISK_FREE_RATE + r.beta * ERP).toFixed(2)) : 12;
  const eps = r.eps || 0;
  const proj = Array.from({ length: 5 }, (_, i) => { const yr = i + 1; const pe = eps * Math.pow(1 + growth / 100, yr); return { yr, projEps: pe, pv: pe / Math.pow(1 + wacc / 100, yr) }; });
  const tv = proj[4].projEps * (1 + tg / 100) / ((wacc - tg) / 100);
  const pvTv = tv / Math.pow(1 + wacc / 100, 5);
  const intrinsic = proj.reduce((s, p) => s + p.pv, 0) + pvTv;
  const mos = ((intrinsic - r.ltp) / intrinsic) * 100;
  const verdict = mos > 20 ? 'UNDERVALUED' : mos > -10 ? 'FAIRLY VALUED' : 'OVERVALUED';
  const vc = mos > 20 ? '#00d084' : mos > -10 ? '#f5a623' : '#ff4444';
  const wr = [wacc - 1, wacc, wacc + 1];
  const gr = [growth - 2, growth, growth + 2];
  return (
    <div>
      <SectionHeader title="02 - MORGAN STANLEY DCF VALUATION" subtitle="Live beta auto-WACC + 5-year projection + sensitivity table" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        <div>
          <div style={{ padding: '10px', background: '#0d0d0d', borderRadius: 6, marginBottom: 12, border: '1px solid #1e1e1e' }}>
            <StatRow label="Trailing EPS" value={eps ? 'Rs ' + fmt(eps) : '-'} />
            <StatRow label="Forward EPS" value={r.forwardEps ? 'Rs ' + fmt(r.forwardEps) : '-'} color="#a78bfa" />
            <StatRow label="Beta (live)" value={fmt(r.beta)} />
            <StatRow label="Risk-Free Rate" value={RISK_FREE_RATE + '%'} />
            <StatRow label="WACC (auto)" value={wacc + '%'} color="#4a9eff" />
          </div>
          <div style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 10, fontFamily: 'JetBrains Mono', color: '#888' }}>EPS Growth Rate</span>
              <span style={{ fontSize: 12, fontFamily: 'JetBrains Mono', color: '#f5a623', fontWeight: 700 }}>{growth}%</span>
            </div>
            <input type="range" min="5" max="40" value={growth} onChange={e => setGrowth(Number(e.target.value))} style={{ width: '100%', accentColor: '#f5a623' }} />
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 10, fontFamily: 'JetBrains Mono', color: '#888' }}>Terminal Growth</span>
              <span style={{ fontSize: 12, fontFamily: 'JetBrains Mono', color: '#4a9eff', fontWeight: 700 }}>{tg}%</span>
            </div>
            <input type="range" min="3" max="12" value={tg} onChange={e => setTg(Number(e.target.value))} style={{ width: '100%', accentColor: '#4a9eff' }} />
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 9, color: '#555', fontFamily: 'JetBrains Mono', marginBottom: 6 }}>INTRINSIC VALUE</div>
            <div style={{ fontSize: 36, fontWeight: 700, fontFamily: 'JetBrains Mono', color: vc }}>Rs {fmt(intrinsic)}</div>
            <div style={{ fontSize: 11, color: '#888', fontFamily: 'JetBrains Mono', marginTop: 4 }}>CMP: Rs {fmt(r.ltp)}</div>
            {r.targetPrice && <div style={{ fontSize: 10, color: '#555', fontFamily: 'JetBrains Mono' }}>Analyst: Rs {fmt(r.targetPrice)}</div>}
          </div>
          <div style={{ padding: '8px 24px', borderRadius: 8, border: '2px solid ' + vc, background: vc + '18' }}>
            <span style={{ fontSize: 15, fontWeight: 700, fontFamily: 'JetBrains Mono', color: vc }}>{verdict}</span>
          </div>
          <div style={{ fontSize: 13, fontFamily: 'JetBrains Mono', color: vc, fontWeight: 600 }}>MOS: {mos.toFixed(1)}%</div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div>
          <div style={{ fontSize: 9, color: '#555', fontFamily: 'JetBrains Mono', marginBottom: 8 }}>5-YEAR PROJECTION</div>
          <table style={{ width: '100%', fontSize: 11, fontFamily: 'JetBrains Mono', borderCollapse: 'collapse' }}>
            <thead><tr>{['YEAR','PROJ EPS','PV'].map(h => <th key={h} style={{ padding: '5px 8px', textAlign: 'right', color: '#444', fontSize: 9, borderBottom: '1px solid #1e1e1e', background: '#0a0a0a' }}>{h}</th>)}</tr></thead>
            <tbody>
              {proj.map(p => <tr key={p.yr}><td style={{ padding: '5px 8px', textAlign: 'right', color: '#f5a623' }}>FY+{p.yr}</td><td style={{ padding: '5px 8px', textAlign: 'right', color: '#e8e8e8' }}>Rs {fmt(p.projEps)}</td><td style={{ padding: '5px 8px', textAlign: 'right', color: '#00d084' }}>Rs {fmt(p.pv)}</td></tr>)}
              <tr style={{ borderTop: '1px solid #222' }}><td style={{ padding: '5px 8px', textAlign: 'right', color: '#888' }}>Terminal</td><td style={{ padding: '5px 8px', textAlign: 'right', color: '#888' }}>-</td><td style={{ padding: '5px 8px', textAlign: 'right', color: '#4a9eff', fontWeight: 700 }}>Rs {fmt(pvTv)}</td></tr>
            </tbody>
          </table>
        </div>
        <div>
          <div style={{ fontSize: 9, color: '#555', fontFamily: 'JetBrains Mono', marginBottom: 8 }}>SENSITIVITY TABLE (WACC vs GROWTH)</div>
          <table style={{ width: '100%', fontSize: 10, fontFamily: 'JetBrains Mono', borderCollapse: 'collapse' }}>
            <thead><tr><th style={{ padding: '4px 6px', color: '#444', fontSize: 8, borderBottom: '1px solid #1e1e1e', background: '#0a0a0a' }}>W\G</th>{gr.map(g => <th key={g} style={{ padding: '4px 6px', textAlign: 'center', color: '#444', fontSize: 8, borderBottom: '1px solid #1e1e1e', background: '#0a0a0a' }}>{g}%</th>)}</tr></thead>
            <tbody>{wr.map(w => <tr key={w}><td style={{ padding: '4px 6px', color: '#888', fontSize: 9 }}>{w}%</td>{gr.map(g => { const s = proj.reduce((a, p) => a + (eps * Math.pow(1 + g / 100, p.yr)) / Math.pow(1 + w / 100, p.yr), 0); const stv = (eps * Math.pow(1 + g / 100, 5) * (1 + tg / 100)) / ((w - tg) / 100) / Math.pow(1 + w / 100, 5); const si = s + stv; const diff = ((si - r.ltp) / r.ltp) * 100; return <td key={g} style={{ padding: '4px 6px', textAlign: 'center', color: diff > 0 ? '#00d084' : '#ff4444', fontWeight: 600 }}>{fmt(si, 0)}</td>; })}</tr>)}</tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// MODULE 3: TITAN - Insider + Institutional Data
function TitanInsiderModule({ symbol }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('insider');

  useEffect(() => {
    setLoading(true);
    fetchInsider(symbol).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, [symbol]);

  const getTransactionColor = (type) => {
    if (!type) return '#888';
    const t = type.toLowerCase();
    if (t.includes('purchase') || t.includes('buy') || t.includes('acquisition')) return '#00d084';
    if (t.includes('sale') || t.includes('sell') || t.includes('disposed')) return '#ff4444';
    return '#f5a623';
  };

  const tabs = [
    { key: 'insider', label: 'INSIDER TRANSACTIONS' },
    { key: 'holders', label: 'INSIDER HOLDERS' },
    { key: 'institutional', label: 'INSTITUTIONAL' },
    { key: 'analyst', label: 'UPGRADES/DOWNGRADES' },
    { key: 'trend', label: 'RECOMMENDATION TREND' },
  ];

  return (
    <div>
      <SectionHeader title="03 - TITAN INSIDER INTELLIGENCE" subtitle="Insider transactions + institutional holders + analyst upgrades (live)" color="#a78bfa" />
      <div style={{ display: 'flex', gap: 5, marginBottom: 14, flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ padding: '4px 12px', fontSize: 9, fontFamily: 'JetBrains Mono', background: tab === t.key ? '#a78bfa' : '#141414', color: tab === t.key ? '#000' : '#555', border: '1px solid ' + (tab === t.key ? '#a78bfa' : '#222'), borderRadius: 3, cursor: 'pointer', fontWeight: 700 }}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '20px 0', color: '#555', fontFamily: 'JetBrains Mono', fontSize: 11 }}>
          <div style={{ width: 16, height: 16, border: '2px solid #333', borderTop: '2px solid #a78bfa', borderRadius: '50%', animation: 'mbspin 1s linear infinite' }} />
          Fetching insider data from Yahoo Finance...
        </div>
      ) : !data ? (
        <div style={{ color: '#444', fontFamily: 'JetBrains Mono', fontSize: 11, padding: 20 }}>
          Insider data not available for this stock. This is common for smaller stocks.
        </div>
      ) : (
        <div>
          {tab === 'insider' && (
            <div>
              <div style={{ fontSize: 9, color: '#555', fontFamily: 'JetBrains Mono', marginBottom: 10 }}>
                RECENT INSIDER BUY/SELL TRANSACTIONS — Watch this closely. When insiders buy, it is the strongest signal.
              </div>
              {data.insiderTransactions && data.insiderTransactions.length > 0 ? (
                <table style={{ width: '100%', fontSize: 11, fontFamily: 'JetBrains Mono', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>{['NAME', 'RELATION', 'DATE', 'TRANSACTION', 'SHARES', 'VALUE'].map(h => <th key={h} style={{ padding: '6px 8px', textAlign: 'left', color: '#444', fontSize: 9, borderBottom: '1px solid #1e1e1e', background: '#0a0a0a' }}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {data.insiderTransactions.slice(0, 15).map((t, i) => {
                      const tc = getTransactionColor(t.transactionDescription || t.transaction);
                      return (
                        <tr key={i} style={{ borderBottom: '1px solid #111' }}>
                          <td style={{ padding: '6px 8px', color: '#e8e8e8', fontWeight: 600 }}>{t.filerName || '-'}</td>
                          <td style={{ padding: '6px 8px', color: '#666', fontSize: 10 }}>{t.relation || '-'}</td>
                          <td style={{ padding: '6px 8px', color: '#888', fontSize: 10 }}>{fmtDate(t.startDate || t.transactionDate)}</td>
                          <td style={{ padding: '6px 8px', color: tc, fontWeight: 700, fontSize: 10 }}>{(t.transactionDescription || t.transaction || '-').toUpperCase()}</td>
                          <td style={{ padding: '6px 8px', color: '#e8e8e8', textAlign: 'right' }}>{t.shares ? fmt(t.shares, 0) : '-'}</td>
                          <td style={{ padding: '6px 8px', color: tc, textAlign: 'right', fontWeight: 600 }}>{t.value ? fmtCr(t.value) : '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div style={{ color: '#444', fontFamily: 'JetBrains Mono', fontSize: 11 }}>No recent insider transactions found</div>
              )}
            </div>
          )}

          {tab === 'holders' && (
            <div>
              <div style={{ fontSize: 9, color: '#555', fontFamily: 'JetBrains Mono', marginBottom: 10 }}>INSIDER HOLDERS — Key promoters and insiders holding the stock</div>
              {data.insiderHolders && data.insiderHolders.length > 0 ? (
                <table style={{ width: '100%', fontSize: 11, fontFamily: 'JetBrains Mono', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>{['NAME', 'POSITION', 'SHARES', 'VALUE', 'LATEST TX'].map(h => <th key={h} style={{ padding: '6px 8px', textAlign: 'left', color: '#444', fontSize: 9, borderBottom: '1px solid #1e1e1e', background: '#0a0a0a' }}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {data.insiderHolders.map((h, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #111' }}>
                        <td style={{ padding: '6px 8px', color: '#f5a623', fontWeight: 600 }}>{h.name || '-'}</td>
                        <td style={{ padding: '6px 8px', color: '#666', fontSize: 10 }}>{h.relation || '-'}</td>
                        <td style={{ padding: '6px 8px', color: '#e8e8e8', textAlign: 'right' }}>{h.positionDirect ? fmt(h.positionDirect, 0) : '-'}</td>
                        <td style={{ padding: '6px 8px', color: '#00d084', textAlign: 'right' }}>{h.positionDirectDate ? fmtDate(h.positionDirectDate) : '-'}</td>
                        <td style={{ padding: '6px 8px', color: '#888', fontSize: 10 }}>{h.latestTransType || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <div style={{ color: '#444', fontFamily: 'JetBrains Mono', fontSize: 11 }}>No insider holder data available</div>}
            </div>
          )}

          {tab === 'institutional' && (
            <div>
              <div style={{ fontSize: 9, color: '#555', fontFamily: 'JetBrains Mono', marginBottom: 10 }}>INSTITUTIONAL OWNERSHIP — FIIs, mutual funds, and big money positions</div>
              {data.institutionOwnership && data.institutionOwnership.length > 0 ? (
                <table style={{ width: '100%', fontSize: 11, fontFamily: 'JetBrains Mono', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>{['INSTITUTION', 'SHARES', 'VALUE', 'PCT HELD', 'CHANGE'].map(h => <th key={h} style={{ padding: '6px 8px', textAlign: 'left', color: '#444', fontSize: 9, borderBottom: '1px solid #1e1e1e', background: '#0a0a0a' }}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {data.institutionOwnership.slice(0, 15).map((inst, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #111' }}>
                        <td style={{ padding: '6px 8px', color: '#4a9eff', fontWeight: 600 }}>{inst.organization || '-'}</td>
                        <td style={{ padding: '6px 8px', color: '#e8e8e8', textAlign: 'right' }}>{inst.position ? fmt(inst.position, 0) : '-'}</td>
                        <td style={{ padding: '6px 8px', color: '#00d084', textAlign: 'right' }}>{inst.value ? fmtCr(inst.value) : '-'}</td>
                        <td style={{ padding: '6px 8px', color: '#f5a623', textAlign: 'right' }}>{inst.pctHeld ? (inst.pctHeld * 100).toFixed(2) + '%' : '-'}</td>
                        <td style={{ padding: '6px 8px', textAlign: 'right', color: inst.pctChange > 0 ? '#00d084' : inst.pctChange < 0 ? '#ff4444' : '#888' }}>
                          {inst.pctChange != null ? (inst.pctChange > 0 ? '+' : '') + (inst.pctChange * 100).toFixed(2) + '%' : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <div style={{ color: '#444', fontFamily: 'JetBrains Mono', fontSize: 11 }}>No institutional data available</div>}
            </div>
          )}

          {tab === 'analyst' && (
            <div>
              <div style={{ fontSize: 9, color: '#555', fontFamily: 'JetBrains Mono', marginBottom: 10 }}>RECENT ANALYST UPGRADES & DOWNGRADES — Follow the smart money ratings</div>
              {data.upgradeDowngrade && data.upgradeDowngrade.length > 0 ? (
                <table style={{ width: '100%', fontSize: 11, fontFamily: 'JetBrains Mono', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>{['DATE', 'FIRM', 'FROM', 'TO', 'ACTION'].map(h => <th key={h} style={{ padding: '6px 8px', textAlign: 'left', color: '#444', fontSize: 9, borderBottom: '1px solid #1e1e1e', background: '#0a0a0a' }}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {data.upgradeDowngrade.slice(0, 20).map((u, i) => {
                      const isUpgrade = u.action === 'up' || (u.toGrade && u.fromGrade && u.toGrade > u.fromGrade);
                      const ac = isUpgrade ? '#00d084' : '#ff4444';
                      return (
                        <tr key={i} style={{ borderBottom: '1px solid #111' }}>
                          <td style={{ padding: '6px 8px', color: '#888', fontSize: 10 }}>{fmtDate(u.epochGradeDate)}</td>
                          <td style={{ padding: '6px 8px', color: '#4a9eff', fontWeight: 600 }}>{u.firm || '-'}</td>
                          <td style={{ padding: '6px 8px', color: '#888', fontSize: 10 }}>{u.fromGrade || '-'}</td>
                          <td style={{ padding: '6px 8px', color: ac, fontWeight: 700 }}>{u.toGrade || '-'}</td>
                          <td style={{ padding: '6px 8px', color: ac, fontSize: 10, fontWeight: 700 }}>{u.action ? u.action.toUpperCase() : (isUpgrade ? 'UPGRADE' : 'DOWNGRADE')}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : <div style={{ color: '#444', fontFamily: 'JetBrains Mono', fontSize: 11 }}>No upgrade/downgrade history available</div>}
            </div>
          )}

          {tab === 'trend' && data.recommendationTrend && data.recommendationTrend.length > 0 && (
            <div>
              <div style={{ fontSize: 9, color: '#555', fontFamily: 'JetBrains Mono', marginBottom: 10 }}>ANALYST RECOMMENDATION TREND — How many analysts say buy vs sell</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                {data.recommendationTrend.slice(0, 4).map((t, i) => {
                  const total = (t.strongBuy || 0) + (t.buy || 0) + (t.hold || 0) + (t.sell || 0) + (t.strongSell || 0);
                  const bullish = (t.strongBuy || 0) + (t.buy || 0);
                  const bullPct = total > 0 ? Math.round((bullish / total) * 100) : 0;
                  return (
                    <div key={i} style={{ padding: '10px', background: '#0d0d0d', borderRadius: 6, border: '1px solid #1e1e1e' }}>
                      <div style={{ fontSize: 9, color: '#555', fontFamily: 'JetBrains Mono', marginBottom: 8 }}>{t.period || 'Period ' + (i + 1)}</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {[['STRONG BUY', t.strongBuy, '#00d084'], ['BUY', t.buy, '#4a9eff'], ['HOLD', t.hold, '#f5a623'], ['SELL', t.sell, '#ff4444'], ['STRONG SELL', t.strongSell, '#ff0000']].map(([label, val, color]) => (
                          <div key={label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: 9, fontFamily: 'JetBrains Mono', color: '#555' }}>{label}</span>
                            <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono', fontWeight: 700, color }}>{val || 0}</span>
                          </div>
                        ))}
                      </div>
                      <div style={{ marginTop: 8, height: 4, background: '#1a1a1a', borderRadius: 2 }}>
                        <div style={{ height: '100%', width: bullPct + '%', background: '#00d084', borderRadius: 2 }} />
                      </div>
                      <div style={{ fontSize: 10, color: '#00d084', fontFamily: 'JetBrains Mono', marginTop: 4, textAlign: 'center', fontWeight: 700 }}>{bullPct}% BULLISH</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// MODULE 4: Financials Deep Dive
function FinancialsDeep({ symbol, r }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('income');

  useEffect(() => {
    setLoading(true);
    fetchFinancials(symbol).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, [symbol]);

  const tabs = [
    { key: 'income', label: 'INCOME STATEMENT' },
    { key: 'balance', label: 'BALANCE SHEET' },
    { key: 'cashflow', label: 'CASH FLOW' },
    { key: 'earnings', label: 'EARNINGS HISTORY' },
  ];

  const formatVal = (v) => { if (!v) return '-'; if (Math.abs(v) >= 1e9) return 'Rs ' + (v / 1e9).toFixed(2) + 'B'; if (Math.abs(v) >= 1e7) return 'Rs ' + (v / 1e7).toFixed(2) + 'Cr'; return 'Rs ' + fmt(v, 0); };

  return (
    <div>
      <SectionHeader title="04 - LIVE FINANCIAL STATEMENTS" subtitle="Income statement + balance sheet + cash flow + earnings history" color="#4a9eff" />
      <div style={{ display: 'flex', gap: 5, marginBottom: 14 }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ padding: '4px 12px', fontSize: 9, fontFamily: 'JetBrains Mono', background: tab === t.key ? '#4a9eff' : '#141414', color: tab === t.key ? '#000' : '#555', border: '1px solid ' + (tab === t.key ? '#4a9eff' : '#222'), borderRadius: 3, cursor: 'pointer', fontWeight: 700 }}>
            {t.label}
          </button>
        ))}
      </div>
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '20px 0', color: '#555', fontFamily: 'JetBrains Mono', fontSize: 11 }}>
          <div style={{ width: 16, height: 16, border: '2px solid #333', borderTop: '2px solid #4a9eff', borderRadius: '50%', animation: 'mbspin 1s linear infinite' }} />
          Fetching financial statements...
        </div>
      ) : !data ? (
        <div style={{ color: '#444', fontFamily: 'JetBrains Mono', fontSize: 11, padding: 20 }}>Financial statement data not available</div>
      ) : (
        <div>
          {tab === 'income' && data.incomeStatements && (
            <div>
              <div style={{ fontSize: 9, color: '#555', fontFamily: 'JetBrains Mono', marginBottom: 10 }}>ANNUAL INCOME STATEMENTS — Revenue, profit, margins over years</div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', fontSize: 11, fontFamily: 'JetBrains Mono', borderCollapse: 'collapse', minWidth: 600 }}>
                  <thead>
                    <tr>
                      <th style={{ padding: '6px 8px', textAlign: 'left', color: '#444', fontSize: 9, borderBottom: '1px solid #1e1e1e', background: '#0a0a0a' }}>METRIC</th>
                      {data.incomeStatements.slice(0, 4).map((s, i) => (
                        <th key={i} style={{ padding: '6px 8px', textAlign: 'right', color: '#f5a623', fontSize: 9, borderBottom: '1px solid #1e1e1e', background: '#0a0a0a' }}>
                          {s.endDate ? new Date(s.endDate * 1000).getFullYear() : 'FY' + (i + 1)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: 'Total Revenue', key: 'totalRevenue' },
                      { label: 'Gross Profit', key: 'grossProfit' },
                      { label: 'Operating Income', key: 'operatingIncome' },
                      { label: 'Net Income', key: 'netIncome' },
                      { label: 'EBITDA', key: 'ebitda' },
                      { label: 'Total Expenses', key: 'totalOperatingExpenses' },
                    ].map(row => (
                      <tr key={row.label} style={{ borderBottom: '1px solid #111' }}>
                        <td style={{ padding: '6px 8px', color: '#888' }}>{row.label}</td>
                        {data.incomeStatements.slice(0, 4).map((s, i) => {
                          const val = s[row.key]?.raw || s[row.key];
                          const isPos = val > 0;
                          return <td key={i} style={{ padding: '6px 8px', textAlign: 'right', color: isPos ? '#e8e8e8' : '#ff4444', fontWeight: row.key === 'netIncome' ? 700 : 400 }}>{formatVal(val)}</td>;
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'balance' && data.balanceSheets && (
            <div>
              <div style={{ fontSize: 9, color: '#555', fontFamily: 'JetBrains Mono', marginBottom: 10 }}>BALANCE SHEET — Assets, liabilities, equity position</div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', fontSize: 11, fontFamily: 'JetBrains Mono', borderCollapse: 'collapse', minWidth: 500 }}>
                  <thead>
                    <tr>
                      <th style={{ padding: '6px 8px', textAlign: 'left', color: '#444', fontSize: 9, borderBottom: '1px solid #1e1e1e', background: '#0a0a0a' }}>METRIC</th>
                      {data.balanceSheets.slice(0, 4).map((s, i) => <th key={i} style={{ padding: '6px 8px', textAlign: 'right', color: '#f5a623', fontSize: 9, borderBottom: '1px solid #1e1e1e', background: '#0a0a0a' }}>{s.endDate ? new Date(s.endDate * 1000).getFullYear() : 'FY' + (i + 1)}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: 'Total Assets', key: 'totalAssets' },
                      { label: 'Total Liabilities', key: 'totalLiab' },
                      { label: 'Stockholder Equity', key: 'totalStockholderEquity' },
                      { label: 'Cash & Equivalents', key: 'cash' },
                      { label: 'Total Debt', key: 'totalDebt' },
                      { label: 'Net Tangible Assets', key: 'netTangibleAssets' },
                    ].map(row => (
                      <tr key={row.label} style={{ borderBottom: '1px solid #111' }}>
                        <td style={{ padding: '6px 8px', color: '#888' }}>{row.label}</td>
                        {data.balanceSheets.slice(0, 4).map((s, i) => {
                          const val = s[row.key]?.raw || s[row.key];
                          return <td key={i} style={{ padding: '6px 8px', textAlign: 'right', color: '#e8e8e8' }}>{formatVal(val)}</td>;
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'cashflow' && data.cashflows && (
            <div>
              <div style={{ fontSize: 9, color: '#555', fontFamily: 'JetBrains Mono', marginBottom: 10 }}>CASH FLOW STATEMENT — Operating, investing, financing activities</div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', fontSize: 11, fontFamily: 'JetBrains Mono', borderCollapse: 'collapse', minWidth: 500 }}>
                  <thead>
                    <tr>
                      <th style={{ padding: '6px 8px', textAlign: 'left', color: '#444', fontSize: 9, borderBottom: '1px solid #1e1e1e', background: '#0a0a0a' }}>METRIC</th>
                      {data.cashflows.slice(0, 4).map((s, i) => <th key={i} style={{ padding: '6px 8px', textAlign: 'right', color: '#f5a623', fontSize: 9, borderBottom: '1px solid #1e1e1e', background: '#0a0a0a' }}>{s.endDate ? new Date(s.endDate * 1000).getFullYear() : 'FY' + (i + 1)}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: 'Operating Cash Flow', key: 'totalCashFromOperatingActivities' },
                      { label: 'Investing Cash Flow', key: 'totalCashflowsFromInvestingActivities' },
                      { label: 'Financing Cash Flow', key: 'totalCashFromFinancingActivities' },
                      { label: 'Free Cash Flow', key: 'freeCashflow' },
                      { label: 'Capital Expenditure', key: 'capitalExpenditures' },
                      { label: 'Dividends Paid', key: 'dividendsPaid' },
                    ].map(row => (
                      <tr key={row.label} style={{ borderBottom: '1px solid #111' }}>
                        <td style={{ padding: '6px 8px', color: '#888' }}>{row.label}</td>
                        {data.cashflows.slice(0, 4).map((s, i) => {
                          const val = s[row.key]?.raw || s[row.key];
                          const isPos = val > 0;
                          return <td key={i} style={{ padding: '6px 8px', textAlign: 'right', color: isPos ? '#00d084' : '#ff4444', fontWeight: row.key === 'freeCashflow' ? 700 : 400 }}>{formatVal(val)}</td>;
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'earnings' && data.earningsHistory && (
            <div>
              <div style={{ fontSize: 9, color: '#555', fontFamily: 'JetBrains Mono', marginBottom: 10 }}>EARNINGS HISTORY — Actual vs estimate EPS surprise</div>
              <table style={{ width: '100%', fontSize: 11, fontFamily: 'JetBrains Mono', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>{['QUARTER', 'EST EPS', 'ACTUAL EPS', 'SURPRISE', 'SURPRISE %'].map(h => <th key={h} style={{ padding: '6px 8px', textAlign: 'right', color: '#444', fontSize: 9, borderBottom: '1px solid #1e1e1e', background: '#0a0a0a' }}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {data.earningsHistory.slice(0, 8).map((e, i) => {
                    const surprise = e.surprisePercent?.raw || e.surprisePercent || 0;
                    const sc = surprise > 5 ? '#00d084' : surprise < -5 ? '#ff4444' : '#f5a623';
                    return (
                      <tr key={i} style={{ borderBottom: '1px solid #111' }}>
                        <td style={{ padding: '6px 8px', color: '#f5a623' }}>{e.quarter?.fmt || 'Q' + (i + 1)}</td>
                        <td style={{ padding: '6px 8px', textAlign: 'right', color: '#888' }}>Rs {e.epsEstimate?.fmt || '-'}</td>
                        <td style={{ padding: '6px 8px', textAlign: 'right', color: '#e8e8e8', fontWeight: 700 }}>Rs {e.epsActual?.fmt || '-'}</td>
                        <td style={{ padding: '6px 8px', textAlign: 'right', color: sc }}>Rs {e.epsDifference?.fmt || '-'}</td>
                        <td style={{ padding: '6px 8px', textAlign: 'right', color: sc, fontWeight: 700 }}>{surprise ? (surprise > 0 ? '+' : '') + surprise.toFixed(2) + '%' : '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// MODULE 5: Macro + News
function MacroModule({ q, r }) {
  const [stockNews, setStockNews] = useState([]);
  const [macroNews, setMacroNews] = useState([]);
  const [loadingSN, setLoadingSN] = useState(true);
  const [loadingMN, setLoadingMN] = useState(true);
  const [tab, setTab] = useState('stock');
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLoadingSN(true); setLoadingMN(true);
    setStockNews([]); setMacroNews([]);
    fetchStockNews(q.symbol).then(d => { setStockNews(d || []); setLoadingSN(false); }).catch(() => setLoadingSN(false));
    fetchMacroNews().then(d => { setMacroNews(d || []); setLoadingMN(false); }).catch(() => setLoadingMN(false));
  }, [q.symbol]);

  const signals = [];
  if (r.beta > 1.2) signals.push({ event: 'High Market Sensitivity', detail: 'Beta ' + fmt(r.beta) + ' amplifies Nifty moves by ' + ((r.beta - 1) * 100).toFixed(0) + '%', type: 'risk', icon: '📊' });
  if (r.debt < 0.3) signals.push({ event: 'Fortress Balance Sheet', detail: 'Near-zero debt - immune to rate cycles', type: 'positive', icon: '🏰' });
  if (r.revenueGrowth > 15) signals.push({ event: 'India GDP Beneficiary', detail: fmt(r.revenueGrowth) + '% revenue growth', type: 'positive', icon: '🇮🇳' });
  if (r.grossMargin > 40) signals.push({ event: 'Inflation Shield', detail: fmt(r.grossMargin) + '% gross margin - strong pricing power', type: 'positive', icon: '🛡️' });
  if (r.epsGrowth > 20) signals.push({ event: 'Earnings Rocket', detail: fmt(r.epsGrowth) + '% EPS growth - strong momentum', type: 'positive', icon: '🚀' });
  if (r.debt > 1) signals.push({ event: 'Rate Hike Risk', detail: 'D/E ' + fmt(r.debt) + ' - costs rise if rates go up', type: 'risk', icon: '🏦' });
  if (r.targetUpside > 25) signals.push({ event: 'Strong Analyst Conviction', detail: fmt(r.targetUpside) + '% consensus target upside', type: 'positive', icon: '🎯' });
  if (r.rec === 'strong_buy') signals.push({ event: 'Institutional Accumulation Likely', detail: 'Strong buy - expect institutional buying', type: 'positive', icon: '🟢' });

  const displayNews = tab === 'stock' ? stockNews : macroNews;
  const isLoading = tab === 'stock' ? loadingSN : loadingMN;
  const cats = ['all', ...new Set(displayNews.map(n => n.type))];
  const filtered = displayNews.filter(n => (filter === 'all' || n.type === filter) && (!search || n.title.toLowerCase().includes(search.toLowerCase())));
  const bullish = displayNews.filter(n => getSentiment(n.title) === 'bullish').length;
  const bearish = displayNews.filter(n => getSentiment(n.title) === 'bearish').length;
  const neutral = displayNews.length - bullish - bearish;
  const sp = displayNews.length > 0 ? Math.round((bullish / displayNews.length) * 100) : 50;
  const sc = sp > 60 ? '#00d084' : sp < 40 ? '#ff4444' : '#f5a623';

  return (
    <div>
      <SectionHeader title="05 - COSMIC MACRO IMPACT ANALYZER" subtitle="Live news + sentiment scoring + financial signals" color="#4a9eff" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 16 }}>
        {signals.map((s, i) => (
          <div key={i} style={{ padding: '8px 10px', background: s.type === 'positive' ? 'rgba(0,208,132,0.06)' : 'rgba(255,68,68,0.06)', border: '1px solid ' + (s.type === 'positive' ? 'rgba(0,208,132,0.15)' : 'rgba(255,68,68,0.15)'), borderRadius: 5 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
              <span>{s.icon}</span>
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: 9, fontWeight: 700, color: s.type === 'positive' ? '#00d084' : '#ff4444' }}>{s.event}</span>
            </div>
            <div style={{ fontSize: 9, fontFamily: 'JetBrains Mono', color: '#555', lineHeight: 1.5 }}>{s.detail}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 12 }}>
        {[['SENTIMENT', sp > 60 ? 'BULLISH' : sp < 40 ? 'BEARISH' : 'MIXED', sc, sp + '% bullish'], ['BULLISH', bullish, '#00d084', null], ['BEARISH', bearish, '#ff4444', null], ['TOTAL NEWS', displayNews.length, '#888', null]].map(([label, val, color, sub], i) => (
          <div key={i} style={{ padding: '8px 10px', background: '#0d0d0d', border: '1px solid ' + color + '33', borderRadius: 5, textAlign: 'center' }}>
            <div style={{ fontSize: 8, color: '#555', fontFamily: 'JetBrains Mono', marginBottom: 3 }}>{label}</div>
            <div style={{ fontSize: i === 0 ? 14 : 18, fontWeight: 700, fontFamily: 'JetBrains Mono', color }}>{val}</div>
            {sub && <div style={{ fontSize: 9, color, fontFamily: 'JetBrains Mono' }}>{sub}</div>}
          </div>
        ))}
      </div>
      <div style={{ height: 5, background: '#1a1a1a', borderRadius: 3, overflow: 'hidden', display: 'flex', marginBottom: 12 }}>
        <div style={{ width: (bullish / Math.max(displayNews.length, 1)) * 100 + '%', background: '#00d084' }} />
        <div style={{ width: (neutral / Math.max(displayNews.length, 1)) * 100 + '%', background: '#444' }} />
        <div style={{ flex: 1, background: '#ff4444' }} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 5 }}>
          {[{ key: 'stock', label: q.symbol + ' (' + stockNews.length + ')' }, { key: 'macro', label: 'MACRO (' + macroNews.length + ')' }].map(t => (
            <button key={t.key} onClick={() => { setTab(t.key); setFilter('all'); }}
              style={{ padding: '4px 12px', fontSize: 9, fontFamily: 'JetBrains Mono', background: tab === t.key ? '#4a9eff' : '#141414', color: tab === t.key ? '#000' : '#555', border: '1px solid ' + (tab === t.key ? '#4a9eff' : '#222'), borderRadius: 3, cursor: 'pointer', fontWeight: 700 }}>
              {t.label}
            </button>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search news..." style={{ background: '#141414', border: '1px solid #222', borderRadius: 4, padding: '4px 10px', color: '#e8e8e8', fontFamily: 'JetBrains Mono', fontSize: 10, outline: 'none', width: 150 }} />
      </div>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 10 }}>
        {cats.map(cat => {
          const ci = NEWS_CATEGORIES[cat];
          const cnt = cat === 'all' ? displayNews.length : displayNews.filter(n => n.type === cat).length;
          return <button key={cat} onClick={() => setFilter(cat)} style={{ padding: '2px 8px', fontSize: 8, fontFamily: 'JetBrains Mono', background: filter === cat ? (ci ? ci.color : '#f5a623') : '#141414', color: filter === cat ? '#000' : (ci ? ci.color : '#888'), border: '1px solid ' + (filter === cat ? (ci ? ci.color : '#f5a623') : '#222'), borderRadius: 3, cursor: 'pointer', fontWeight: 700 }}>{ci ? ci.icon + ' ' + ci.label : 'ALL'} ({cnt})</button>;
        })}
      </div>
      {isLoading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '20px 0', color: '#555', fontFamily: 'JetBrains Mono', fontSize: 11 }}>
          <div style={{ width: 16, height: 16, border: '2px solid #333', borderTop: '2px solid #4a9eff', borderRadius: '50%', animation: 'mbspin 1s linear infinite' }} />
          Fetching live news...
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ color: '#444', fontFamily: 'JetBrains Mono', fontSize: 11, padding: '20px 0', textAlign: 'center' }}>No news found</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {filtered.map((news, i) => <NewsCard key={i} news={news} />)}
        </div>
      )}
    </div>
  );
}

// MODULE 6: Bridgewater Risk
function BridgewaterRisk({ r }) {
  const mr = Math.min(10, r.beta * 5);
  const dr = Math.min(10, (r.debt || 0) * 4);
  const lr = r.currentRatio ? Math.max(0, 10 - r.currentRatio * 3) : 5;
  const mgr = r.operatingMargin ? Math.max(0, 10 - r.operatingMargin / 3) : 5;
  const overall = ((mr + dr + lr + mgr) / 4).toFixed(1);
  return (
    <div>
      <SectionHeader title="06 - BRIDGEWATER RISK ANALYSIS" subtitle="Multi-dimensional risk scoring + stress test + hedging" color="#a78bfa" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 20 }}>
        <GaugeMeter value={parseFloat(mr.toFixed(1))} label="MARKET" color={mr > 6 ? '#ff4444' : mr > 4 ? '#f5a623' : '#00d084'} />
        <GaugeMeter value={parseFloat(dr.toFixed(1))} label="DEBT" color={dr > 6 ? '#ff4444' : dr > 3 ? '#f5a623' : '#00d084'} />
        <GaugeMeter value={parseFloat(lr.toFixed(1))} label="LIQUIDITY" color={lr > 6 ? '#ff4444' : lr > 3 ? '#f5a623' : '#00d084'} />
        <GaugeMeter value={parseFloat(mgr.toFixed(1))} label="MARGIN" color={mgr > 6 ? '#ff4444' : mgr > 3 ? '#f5a623' : '#00d084'} />
        <GaugeMeter value={parseFloat(overall)} label="OVERALL" color={overall > 6 ? '#ff4444' : overall > 4 ? '#f5a623' : '#00d084'} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div>
          <StatRow label="Beta" value={fmt(r.beta)} color={r.beta < 1 ? '#00d084' : r.beta < 1.5 ? '#f5a623' : '#ff4444'} />
          <StatRow label="Est. Max Drawdown" value={Math.min(60, (r.beta * 20 + (r.debt || 0) * 5)).toFixed(1) + '%'} color="#ff4444" />
          <StatRow label="D/E Ratio" value={r.debt ? fmt(r.debt) : '-'} color={r.debt < 1 ? '#00d084' : '#ff4444'} />
          <StatRow label="Current Ratio" value={r.currentRatio ? fmt(r.currentRatio) : '-'} color={r.currentRatio > 1.5 ? '#00d084' : '#f5a623'} />
          <StatRow label="Volatility Grade" value={r.beta > 1.5 ? 'HIGH' : r.beta > 1 ? 'MEDIUM' : 'LOW'} color={r.beta > 1.5 ? '#ff4444' : r.beta > 1 ? '#f5a623' : '#00d084'} />
        </div>
        <div>
          {[{ label: 'Add GOLDBEES', reason: 'Gold allocation for macro hedge', color: '#f5a623' }, { label: 'Add MODEFENCE', reason: 'Defence diversification', color: '#4a9eff' }, { label: r.beta > 1.3 ? 'Reduce position size' : 'Normal sizing OK', reason: r.beta > 1.3 ? 'High beta - keep max 5% of portfolio' : 'Beta manageable', color: r.beta > 1.3 ? '#ff4444' : '#00d084' }, { label: r.debt > 1.5 ? 'Monitor debt closely' : 'Debt comfortable', reason: 'D/E ' + fmt(r.debt), color: r.debt > 1.5 ? '#ff4444' : '#00d084' }].map((s, i) => (
            <div key={i} style={{ padding: '7px 10px', borderLeft: '2px solid ' + s.color, marginBottom: 6, background: '#0d0d0d', borderRadius: '0 4px 4px 0' }}>
              <div style={{ fontSize: 10, fontFamily: 'JetBrains Mono', color: s.color, fontWeight: 700 }}>{s.label}</div>
              <div style={{ fontSize: 9, fontFamily: 'JetBrains Mono', color: '#555', marginTop: 2 }}>{s.reason}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// MODULE 7: Returns Engine
function ReturnsEngine({ r }) {
  const [shares, setShares] = useState(100);
  const [buyPrice, setBuyPrice] = useState(Math.round(r.ltp));
  const [catalysts, setCatalysts] = useState([]);

  useEffect(() => {
    const auto = [];
    if (r.revenueGrowth > 10) auto.push(0);
    if (r.epsGrowth > 10) auto.push(5);
    if (r.debt < 0.5) auto.push(6);
    if (r.rec === 'strong_buy' || r.rec === 'buy') auto.push(4);
    if (r.grossMargin > 35) auto.push(7);
    if (r.targetUpside > 20) auto.push(3);
    setCatalysts(auto);
  }, [r.revenueGrowth, r.epsGrowth, r.debt, r.rec, r.grossMargin, r.targetUpside]);

  const inv = shares * buyPrice;
  const cur = shares * r.ltp;
  const gl = cur - inv;
  const glp = inv > 0 ? (gl / inv) * 100 : 0;
  const cagrs = [10, 12, 15, 18, 20];
  const years = [1, 3, 5, 10, 15, 20];
  const colors = ['#888', '#f5a623', '#4a9eff', '#a78bfa', '#00d084'];
  const toggle = (i) => setCatalysts(prev => prev.includes(i) ? prev.filter(c => c !== i) : [...prev, i]);

  return (
    <div>
      <SectionHeader title="07 - MULTIBAGGER BEAST RETURN ENGINE" subtitle="Compounding projections + auto catalyst scoring from live data" color="#00d084" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
        <div style={{ padding: '10px', background: '#0d0d0d', borderRadius: 6, border: '1px solid #1e1e1e' }}>
          <div style={{ fontSize: 9, color: '#555', fontFamily: 'JetBrains Mono', marginBottom: 5 }}>SHARES OWNED</div>
          <input type="number" value={shares} onChange={e => setShares(Number(e.target.value))} style={{ width: '100%', background: '#111', border: '1px solid #222', borderRadius: 4, padding: '5px 8px', color: '#f5a623', fontFamily: 'JetBrains Mono', fontSize: 14, fontWeight: 700 }} />
        </div>
        <div style={{ padding: '10px', background: '#0d0d0d', borderRadius: 6, border: '1px solid #1e1e1e' }}>
          <div style={{ fontSize: 9, color: '#555', fontFamily: 'JetBrains Mono', marginBottom: 5 }}>BUY PRICE (Rs)</div>
          <input type="number" value={buyPrice} onChange={e => setBuyPrice(Number(e.target.value))} style={{ width: '100%', background: '#111', border: '1px solid #222', borderRadius: 4, padding: '5px 8px', color: '#4a9eff', fontFamily: 'JetBrains Mono', fontSize: 14, fontWeight: 700 }} />
        </div>
        <div style={{ padding: '10px', background: gl >= 0 ? 'rgba(0,208,132,0.08)' : 'rgba(255,68,68,0.08)', borderRadius: 6, border: '1px solid ' + (gl >= 0 ? 'rgba(0,208,132,0.2)' : 'rgba(255,68,68,0.2)') }}>
          <div style={{ fontSize: 9, color: '#555', fontFamily: 'JetBrains Mono', marginBottom: 4 }}>P&L</div>
          <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'JetBrains Mono', color: gl >= 0 ? '#00d084' : '#ff4444' }}>{gl >= 0 ? '+' : ''}Rs {fmt(gl)}</div>
          <div style={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: gl >= 0 ? '#00d084' : '#ff4444' }}>{glp.toFixed(1)}% return</div>
        </div>
      </div>
      <div style={{ marginBottom: 16, overflowX: 'auto' }}>
        <div style={{ fontSize: 9, color: '#555', fontFamily: 'JetBrains Mono', marginBottom: 8 }}>WEALTH PROJECTION FROM Rs {fmt(inv, 0)}</div>
        <table style={{ width: '100%', fontSize: 10, fontFamily: 'JetBrains Mono', borderCollapse: 'collapse' }}>
          <thead><tr><th style={{ padding: '5px 8px', textAlign: 'left', color: '#444', fontSize: 9, borderBottom: '1px solid #1e1e1e', background: '#0a0a0a' }}>YEAR</th>{cagrs.map((c, i) => <th key={c} style={{ padding: '5px 8px', textAlign: 'right', color: colors[i], fontSize: 9, borderBottom: '1px solid #1e1e1e', background: '#0a0a0a' }}>{c}% CAGR</th>)}</tr></thead>
          <tbody>{years.map(yr => <tr key={yr} style={{ borderBottom: '1px solid #111', background: yr === 10 || yr === 20 ? 'rgba(255,255,255,0.02)' : 'transparent' }}><td style={{ padding: '5px 8px', color: '#888', fontWeight: yr >= 10 ? 700 : 400 }}>Year {yr} ({2026 + yr})</td>{cagrs.map((c, ci) => { const val = inv * Math.pow(1 + c / 100, yr); return <td key={c} style={{ padding: '5px 8px', textAlign: 'right', color: colors[ci], fontWeight: yr >= 10 ? 700 : 400 }}>Rs {fmt(val, 0)}</td>; })}</tr>)}</tbody>
        </table>
      </div>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ fontSize: 9, color: '#555', fontFamily: 'JetBrains Mono' }}>CATALYST CHECKLIST (AUTO-FILLED FROM LIVE DATA)</div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'JetBrains Mono', color: catalysts.length >= 7 ? '#00d084' : catalysts.length >= 4 ? '#f5a623' : '#ff4444' }}>{catalysts.length}/10</div>
            <div style={{ fontSize: 9, color: catalysts.length >= 7 ? '#00d084' : catalysts.length >= 4 ? '#f5a623' : '#ff4444', fontFamily: 'JetBrains Mono' }}>{catalysts.length >= 7 ? 'STRONG BUY' : catalysts.length >= 4 ? 'MODERATE' : 'WEAK'}</div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
          {CATALYSTS.map((c, i) => (
            <div key={i} onClick={() => toggle(i)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: catalysts.includes(i) ? 'rgba(0,208,132,0.08)' : '#0d0d0d', border: '1px solid ' + (catalysts.includes(i) ? '#00d084' : '#1e1e1e'), borderRadius: 4, cursor: 'pointer', transition: 'all 0.15s' }}>
              <div style={{ width: 14, height: 14, borderRadius: 3, border: '2px solid ' + (catalysts.includes(i) ? '#00d084' : '#333'), background: catalysts.includes(i) ? '#00d084' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {catalysts.includes(i) && <span style={{ fontSize: 9, color: '#000', fontWeight: 700 }}>v</span>}
              </div>
              <span style={{ fontSize: 10, fontFamily: 'JetBrains Mono', color: catalysts.includes(i) ? '#00d084' : '#666' }}>{c}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// MODULE 8: Company Profile
function CompanyProfile({ symbol }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchProfile(symbol).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, [symbol]);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '20px 0', color: '#555', fontFamily: 'JetBrains Mono', fontSize: 11 }}>
      <div style={{ width: 16, height: 16, border: '2px solid #333', borderTop: '2px solid #f5a623', borderRadius: '50%', animation: 'mbspin 1s linear infinite' }} />
      Loading company profile...
    </div>
  );

  if (!data) return null;

  return (
    <div>
      <SectionHeader title="08 - COMPANY PROFILE & MANAGEMENT" subtitle="Business description, officers, key info" color="#ec4899" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div style={{ padding: '12px', background: '#0d0d0d', borderRadius: 6, border: '1px solid #1e1e1e' }}>
          <StatRow label="Sector" value={data.sector || '-'} color="#f5a623" />
          <StatRow label="Industry" value={data.industry || '-'} color="#4a9eff" />
          <StatRow label="Employees" value={data.employees ? fmt(data.employees, 0) : '-'} />
          <StatRow label="Country" value={data.country || 'India'} />
          <StatRow label="City" value={data.city || '-'} />
          {data.website && <div style={{ marginTop: 8 }}><a href={data.website} target="_blank" rel="noreferrer" style={{ fontSize: 10, color: '#4a9eff', fontFamily: 'JetBrains Mono' }}>{data.website}</a></div>}
        </div>
        <div>
          {data.description && (
            <div style={{ padding: '10px', background: '#0d0d0d', borderRadius: 6, border: '1px solid #1e1e1e', borderLeft: '2px solid #ec4899' }}>
              <div style={{ fontSize: 9, color: '#555', fontFamily: 'JetBrains Mono', marginBottom: 6 }}>BUSINESS DESCRIPTION</div>
              <div style={{ fontSize: 10, color: '#888', fontFamily: 'JetBrains Mono', lineHeight: 1.7 }}>{data.description.slice(0, 400)}...</div>
            </div>
          )}
        </div>
      </div>
      {data.officers && data.officers.length > 0 && (
        <div>
          <div style={{ fontSize: 9, color: '#555', fontFamily: 'JetBrains Mono', marginBottom: 8 }}>KEY MANAGEMENT OFFICERS</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
            {data.officers.slice(0, 9).map((o, i) => (
              <div key={i} style={{ padding: '8px 10px', background: '#0d0d0d', borderRadius: 5, border: '1px solid #1e1e1e' }}>
                <div style={{ fontSize: 10, fontFamily: 'JetBrains Mono', color: '#f5a623', fontWeight: 700, marginBottom: 2 }}>{o.name || '-'}</div>
                <div style={{ fontSize: 9, fontFamily: 'JetBrains Mono', color: '#555' }}>{o.title || '-'}</div>
                {o.totalPay && <div style={{ fontSize: 9, fontFamily: 'JetBrains Mono', color: '#444', marginTop: 2 }}>Pay: {fmtCr(o.totalPay?.raw || o.totalPay)}</div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Investor Verdicts
function InvestorVerdicts({ r }) {
  return (
    <div>
      <SectionHeader title="10 LEGEND INVESTOR VERDICTS" subtitle="Auto-generated from live financial data" color="#f5a623" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
        {INVESTORS.map(inv => (
          <div key={inv.name} style={{ padding: '10px 14px', background: '#0d0d0d', border: '1px solid #1e1e1e', borderRadius: 6, borderLeft: '2px solid #f5a623' }}>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: 11, fontWeight: 700, color: '#f5a623', marginBottom: 5 }}>{inv.emoji} {inv.name}</div>
            <div style={{ fontSize: 10, fontFamily: 'JetBrains Mono', color: '#777', lineHeight: 1.7, fontStyle: 'italic' }}>"{inv.rule(r)}"</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 7-Step Panel
function SevenStepPanel({ r }) {
  const checks = [
    { label: 'P/E < 20', actual: r.pe ? fmt(r.pe) : '-', pass: r.pe != null && r.pe < 20 },
    { label: 'ROIC > 15%', actual: r.roe ? fmt(r.roe) + '%' : '-', pass: r.roe != null && r.roe > 15 },
    { label: 'D/E < 1', actual: r.debt ? fmt(r.debt) : '-', pass: r.debt != null && r.debt < 1 },
    { label: 'EPS > 10%', actual: r.epsGrowth ? fmt(r.epsGrowth) + '%' : '-', pass: r.epsGrowth != null && r.epsGrowth > 10 },
    { label: 'ROE > 15%', actual: r.roe ? fmt(r.roe) + '%' : '-', pass: r.roe != null && r.roe > 15 },
    { label: 'OpMgn > 10%', actual: r.operatingMargin ? fmt(r.operatingMargin) + '%' : '-', pass: r.operatingMargin != null && r.operatingMargin > 10 },
    { label: 'GrsMgn > 30%', actual: r.grossMargin ? fmt(r.grossMargin) + '%' : '-', pass: r.grossMargin != null && r.grossMargin > 30 },
  ];
  const pc = checks.filter(c => c.pass).length;
  const sc = pc === 7 ? '#f5a623' : pc >= 5 ? '#00d084' : pc >= 3 ? '#f5a623' : '#ff4444';
  return (
    <div style={{ padding: '14px 20px', background: '#080808', borderTop: '1px solid #1e1e1e', flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontFamily: 'JetBrains Mono', fontSize: 11, fontWeight: 700, color: '#f5a623', letterSpacing: 2 }}>7-STEP FORMULA (LIVE DATA)</div>
        <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'JetBrains Mono', color: sc }}>{pc}/7 {pc === 7 ? 'PERFECT' : pc >= 5 ? 'STRONG' : pc >= 3 ? 'AVERAGE' : 'WEAK'}</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 5 }}>
        {checks.map(c => (
          <div key={c.label} style={{ padding: '5px 6px', background: c.pass ? 'rgba(0,208,132,0.1)' : 'rgba(255,68,68,0.1)', border: '1px solid ' + (c.pass ? 'rgba(0,208,132,0.3)' : 'rgba(255,68,68,0.3)'), borderRadius: 4, textAlign: 'center' }}>
            <div style={{ fontSize: 8, fontFamily: 'JetBrains Mono', color: '#555', marginBottom: 2 }}>{c.label}</div>
            <div style={{ fontSize: 11, fontFamily: 'JetBrains Mono', fontWeight: 700, color: c.pass ? '#00d084' : c.actual === '-' ? '#555' : '#ff4444' }}>{c.actual}</div>
            <div style={{ fontSize: 8, color: c.pass ? '#00d084' : c.actual === '-' ? '#333' : '#ff4444', fontFamily: 'JetBrains Mono', marginTop: 1 }}>{c.actual === '-' ? 'N/A' : c.pass ? 'PASS' : 'FAIL'}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// MAIN
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
    { key: 'insider', label: '03 INSIDER' },
    { key: 'financials', label: '04 FINANCIALS' },
    { key: 'macro', label: '05 MACRO' },
    { key: 'risk', label: '06 RISK' },
    { key: 'returns', label: '07 RETURNS' },
    { key: 'profile', label: '08 PROFILE' },
    { key: 'verdicts', label: '10 LEGENDS' },
  ];

  const isActive = (key) => activeModules.includes('all') || activeModules.includes(key);
  const toggleModule = (key) => {
    if (key === 'all') { setActiveModules(['all']); return; }
    setActiveModules(prev => { const w = prev.filter(m => m !== 'all'); return w.includes(key) ? w.filter(m => m !== key) : [...w, key]; });
  };

  const loadData = useCallback((sym) => {
    if (!sym) return;
    setLoading(true); setError(null);
    Promise.allSettled([fetchQuote(sym), fetchFundamentals(sym)]).then(([qr, fr]) => {
      const quote = qr.status === 'fulfilled' ? qr.value : null;
      const fund = fr.status === 'fulfilled' ? fr.value : null;
      if (!quote) { setError('No data found for ' + sym); setLoading(false); return; }
      setData({ quote, fundamentals: fund });
      setLastUpdated(new Date());
      localStorage.setItem('mb_last_ticker', sym);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('mb_last_ticker');
    const sym = symbol || saved || 'RELIANCE';
    setTicker(sym);
    loadData(sym);
  }, [symbol]);

  const r = data && data.quote ? normalize(data.quote) : null;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#0a0a0a', overflow: 'hidden' }}>
      <style>{`@keyframes mbspin{to{transform:rotate(360deg)}}@keyframes mbpulse{0%,100%{opacity:1}50%{opacity:0.3}}.mbspin{animation:mbspin 1s linear infinite}`}</style>

      <div style={{ padding: '10px 16px', borderBottom: '1px solid #1e1e1e', background: '#0d0d0d', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
          <div style={{ fontFamily: 'JetBrains Mono', fontSize: 13, fontWeight: 700, color: '#f5a623', letterSpacing: 2 }}>MULTIBAGGER ENGINE</div>
          <div style={{ fontSize: 9, color: '#444', fontFamily: 'JetBrains Mono' }}>COSMIC TITAN - 8 MODULES + INSIDER + FINANCIALS + LIVE NEWS + 10 LEGENDS</div>
          <div style={{ flex: 1 }} />
          {data && data.quote && r && (
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: 12 }}>
              <span style={{ color: '#f5a623', fontWeight: 700 }}>{ticker}</span>
              <span style={{ marginLeft: 10, color: data.quote.changePct >= 0 ? '#00d084' : '#ff4444', fontWeight: 600 }}>Rs {fmt(data.quote.ltp)} ({data.quote.changePct >= 0 ? '+' : ''}{fmt(data.quote.changePct)}%)</span>
              {r.rec && <span style={{ marginLeft: 8, fontSize: 9, color: r.rec.includes('buy') ? '#00d084' : '#f5a623', border: '1px solid currentColor', padding: '1px 5px', borderRadius: 3 }}>{r.rec.replace('_', ' ').toUpperCase()}</span>}
            </div>
          )}
          {lastUpdated && <div style={{ fontSize: 9, color: '#333', fontFamily: 'JetBrains Mono' }}>{lastUpdated.toLocaleTimeString('en-IN')}</div>}
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <input value={ticker} onChange={e => setTicker(e.target.value.toUpperCase())} onKeyDown={e => e.key === 'Enter' && loadData(ticker)} placeholder="Enter NSE symbol..." style={{ flex: 1, background: '#141414', border: '1px solid #2a2a2a', borderRadius: 4, padding: '7px 12px', color: '#e8e8e8', fontFamily: 'JetBrains Mono', fontSize: 12, outline: 'none' }} />
          <button onClick={() => loadData(ticker)} style={{ padding: '7px 24px', background: '#f5a623', border: 'none', borderRadius: 4, color: '#000', fontFamily: 'JetBrains Mono', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>ANALYZE</button>
          <button onClick={() => loadData(ticker)} style={{ padding: '7px 12px', background: '#141414', border: '1px solid #2a2a2a', borderRadius: 4, color: '#666', fontFamily: 'JetBrains Mono', fontSize: 14, cursor: 'pointer' }}>↻</button>
        </div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          <button onClick={() => toggleModule('all')} style={{ padding: '3px 12px', fontSize: 9, fontFamily: 'JetBrains Mono', background: activeModules.includes('all') ? '#f5a623' : '#141414', color: activeModules.includes('all') ? '#000' : '#555', border: '1px solid ' + (activeModules.includes('all') ? '#f5a623' : '#222'), borderRadius: 3, cursor: 'pointer', fontWeight: 700 }}>ALL MODE</button>
          {modules.map(m => <button key={m.key} onClick={() => toggleModule(m.key)} style={{ padding: '3px 10px', fontSize: 9, fontFamily: 'JetBrains Mono', background: isActive(m.key) && !activeModules.includes('all') ? 'rgba(245,166,35,0.15)' : '#141414', color: isActive(m.key) ? '#f5a623' : '#444', border: '1px solid ' + (isActive(m.key) ? 'rgba(245,166,35,0.5)' : '#222'), borderRadius: 3, cursor: 'pointer' }}>{m.label}</button>)}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 300, gap: 16 }}>
            <div className="mbspin" style={{ width: 48, height: 48, border: '3px solid #1e1e1e', borderTop: '3px solid #f5a623', borderRadius: '50%' }} />
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: 13, color: '#f5a623', letterSpacing: 3, animation: 'mbpulse 1.5s ease-in-out infinite' }}>ACTIVATING COSMIC TITAN MODE...</div>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: 10, color: '#444' }}>Yahoo Finance + Screener.in + Insider Data + Financial Statements</div>
          </div>
        )}
        {error && !loading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200, gap: 12 }}>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: 12, color: '#ff4444' }}>DATA FETCH FAILED</div>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: 10, color: '#555' }}>{error}</div>
            <button onClick={() => loadData(ticker)} style={{ padding: '6px 20px', background: '#f5a623', border: 'none', borderRadius: 4, color: '#000', fontFamily: 'JetBrains Mono', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>RETRY</button>
          </div>
        )}
        {!loading && !error && data && r && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {isActive('goldman') && <div style={{ padding: '20px', background: '#111', border: '1px solid #1e1e1e', borderRadius: 8 }}><GoldmanScreener q={data.quote} r={r} fundamentals={data.fundamentals} /></div>}
            {isActive('dcf') && <div style={{ padding: '20px', background: '#111', border: '1px solid #1e1e1e', borderRadius: 8 }}><DCFValuation r={r} /></div>}
            {isActive('insider') && <div style={{ padding: '20px', background: '#111', border: '1px solid #1e1e1e', borderRadius: 8 }}><TitanInsiderModule symbol={ticker} /></div>}
            {isActive('financials') && <div style={{ padding: '20px', background: '#111', border: '1px solid #1e1e1e', borderRadius: 8 }}><FinancialsDeep symbol={ticker} r={r} /></div>}
            {isActive('macro') && <div style={{ padding: '20px', background: '#111', border: '1px solid #1e1e1e', borderRadius: 8 }}><MacroModule q={data.quote} r={r} /></div>}
            {isActive('risk') && <div style={{ padding: '20px', background: '#111', border: '1px solid #1e1e1e', borderRadius: 8 }}><BridgewaterRisk r={r} /></div>}
            {isActive('returns') && <div style={{ padding: '20px', background: '#111', border: '1px solid #1e1e1e', borderRadius: 8 }}><ReturnsEngine r={r} /></div>}
            {isActive('profile') && <div style={{ padding: '20px', background: '#111', border: '1px solid #1e1e1e', borderRadius: 8 }}><CompanyProfile symbol={ticker} /></div>}
            {isActive('verdicts') && <div style={{ padding: '20px', background: '#111', border: '1px solid #1e1e1e', borderRadius: 8 }}><InvestorVerdicts r={r} /></div>}
          </div>
        )}
      </div>

      {data && r && !loading && <SevenStepPanel r={r} />}
    </div>
  );
}