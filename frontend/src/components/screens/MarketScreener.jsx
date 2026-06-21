import { useState, useEffect } from 'react';
import { runMarketScan, getAIPicks } from '../../utils/api';

const fmt = (n, d) => n != null && !isNaN(n) ? Number(n).toLocaleString('en-IN', { maximumFractionDigits: d != null ? d : 2 }) : '-';
const fmtCr = (n) => { if (!n) return '-'; const cr = n / 1e7; if (cr >= 1e5) return 'Rs ' + (cr / 1e5).toFixed(2) + 'L Cr'; if (cr >= 1e3) return 'Rs ' + (cr / 1e3).toFixed(2) + 'K Cr'; return 'Rs ' + cr.toFixed(2) + ' Cr'; };

function ScoreRing({ score, grade, color }) {
  const p = Math.min(Math.max(score, 0), 100);
  return (
    <div style={{ position: 'relative', width: 56, height: 56, flexShrink: 0 }}>
      <svg viewBox="0 0 56 56" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="28" cy="28" r="24" fill="none" stroke="#1a1a1a" strokeWidth="5" />
        <circle cx="28" cy="28" r="24" fill="none" stroke={color} strokeWidth="5" strokeDasharray={(p * 1.51) + ' 151'} strokeLinecap="round" style={{ transition: 'stroke-dasharray 1s ease' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'JetBrains Mono', color }}>{grade}</span>
      </div>
    </div>
  );
}

function StockCard({ stock, onClick, aiPick }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div onClick={() => setExpanded(!expanded)}
      style={{ padding: '14px 16px', background: '#111', border: '1px solid #1e1e1e', borderRadius: 8, borderLeft: '3px solid ' + stock.verdictColor, cursor: 'pointer', transition: 'background 0.15s' }}
      onMouseEnter={(e) => e.currentTarget.style.background = '#141414'}
      onMouseLeave={(e) => e.currentTarget.style.background = '#111'}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <ScoreRing score={stock.score} grade={stock.grade} color={stock.verdictColor} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
            <span style={{ fontFamily: 'JetBrains Mono', fontSize: 14, fontWeight: 700, color: '#f5a623' }}>{stock.symbol}</span>
            <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 3, background: stock.verdictColor + '18', color: stock.verdictColor, border: '1px solid ' + stock.verdictColor + '33', fontFamily: 'JetBrains Mono', fontWeight: 700 }}>{stock.verdict}</span>
            <span style={{ fontSize: 9, color: '#444', fontFamily: 'JetBrains Mono' }}>{stock.sector}</span>
          </div>
          <div style={{ fontSize: 10, color: '#666', fontFamily: 'JetBrains Mono', marginBottom: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{stock.name}</div>
          <div style={{ display: 'flex', gap: 14, fontSize: 10, fontFamily: 'JetBrains Mono', flexWrap: 'wrap' }}>
            <span style={{ color: '#888' }}>Rs {fmt(stock.ltp)} <span style={{ color: stock.changePct >= 0 ? '#00d084' : '#ff4444' }}>({stock.changePct >= 0 ? '+' : ''}{fmt(stock.changePct)}%)</span></span>
            <span style={{ color: '#555' }}>P/E {stock.pe ? fmt(stock.pe) : '-'}</span>
            <span style={{ color: '#555' }}>ROE {stock.roe ? fmt(stock.roe) + '%' : '-'}</span>
            <span style={{ color: '#555' }}>Rev Gr {stock.revenueGrowth ? fmt(stock.revenueGrowth) + '%' : '-'}</span>
            <span style={{ color: '#555' }}>MCap {fmtCr(stock.marketCap)}</span>
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'JetBrains Mono', color: stock.verdictColor }}>{stock.score}</div>
          <div style={{ fontSize: 8, color: '#444', fontFamily: 'JetBrains Mono' }}>SCORE/100</div>
        </div>
      </div>

      {aiPick && (
        <div style={{ marginTop: 10, padding: '8px 10px', background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.25)', borderRadius: 6 }}>
          <div style={{ fontSize: 9, color: '#a78bfa', fontFamily: 'JetBrains Mono', fontWeight: 700, marginBottom: 4 }}>🤖 {aiPick.aiVerdict}</div>
          <div style={{ fontSize: 10, color: '#888', fontFamily: 'JetBrains Mono', lineHeight: 1.6 }}>{aiPick.oneLineSummary}</div>
        </div>
      )}

      {expanded && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #1a1a1a' }}>
          {stock.reasons && stock.reasons.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 9, color: '#00d084', fontFamily: 'JetBrains Mono', fontWeight: 700, marginBottom: 6 }}>WHY THIS SCORED HIGH</div>
              {stock.reasons.map((r, i) => (
                <div key={i} style={{ display: 'flex', gap: 6, padding: '3px 0', fontSize: 10, fontFamily: 'JetBrains Mono', color: '#888' }}>
                  <span style={{ color: '#00d084' }}>+</span>{r}
                </div>
              ))}
            </div>
          )}
          {stock.warnings && stock.warnings.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 9, color: '#ff4444', fontFamily: 'JetBrains Mono', fontWeight: 700, marginBottom: 6 }}>WATCH OUT FOR</div>
              {stock.warnings.map((w, i) => (
                <div key={i} style={{ display: 'flex', gap: 6, padding: '3px 0', fontSize: 10, fontFamily: 'JetBrains Mono', color: '#888' }}>
                  <span style={{ color: '#ff4444' }}>-</span>{w}
                </div>
              ))}
            </div>
          )}
          {aiPick && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 10 }}>
              <div style={{ padding: '8px', background: '#0d0d0d', borderRadius: 4, textAlign: 'center' }}>
                <div style={{ fontSize: 8, color: '#555', fontFamily: 'JetBrains Mono' }}>ENTRY</div>
                <div style={{ fontSize: 12, color: '#f5a623', fontFamily: 'JetBrains Mono', fontWeight: 700 }}>Rs {fmt(aiPick.entryPrice)}</div>
              </div>
              <div style={{ padding: '8px', background: '#0d0d0d', borderRadius: 4, textAlign: 'center' }}>
                <div style={{ fontSize: 8, color: '#555', fontFamily: 'JetBrains Mono' }}>TARGET</div>
                <div style={{ fontSize: 12, color: '#00d084', fontFamily: 'JetBrains Mono', fontWeight: 700 }}>Rs {fmt(aiPick.targetPrice)}</div>
              </div>
              <div style={{ padding: '8px', background: '#0d0d0d', borderRadius: 4, textAlign: 'center' }}>
                <div style={{ fontSize: 8, color: '#555', fontFamily: 'JetBrains Mono' }}>STOP LOSS</div>
                <div style={{ fontSize: 12, color: '#ff4444', fontFamily: 'JetBrains Mono', fontWeight: 700 }}>Rs {fmt(aiPick.stopLoss)}</div>
              </div>
            </div>
          )}
          {stock.targetPrice && (
            <div style={{ marginTop: 8, fontSize: 10, fontFamily: 'JetBrains Mono', color: '#555' }}>
              Analyst Target: Rs {fmt(stock.targetPrice)} ({stock.recommendation ? stock.recommendation.replace('_', ' ').toUpperCase() : 'N/A'})
            </div>
          )}
          <button onClick={(e) => { e.stopPropagation(); onClick(stock.symbol); }}
            style={{ marginTop: 10, padding: '6px 16px', background: '#f5a623', border: 'none', borderRadius: 4, color: '#000', fontFamily: 'JetBrains Mono', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>
            OPEN IN MULTIBAGGER ENGINE →
          </button>
        </div>
      )}
    </div>
  );
}

export default function MarketScreener({ onSelectStock }) {
  const [scanData, setScanData] = useState(null);
  const [aiPicks, setAiPicks] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadingAI, setLoadingAI] = useState(false);
  const [error, setError] = useState(null);
  const [filterGrade, setFilterGrade] = useState('all');
  const [sortBy, setSortBy] = useState('score');
  const [scanTime, setScanTime] = useState(null);

  const runScan = async () => {
    setLoading(true);
    setError(null);
    setAiPicks({});
    try {
      const result = await runMarketScan();
      setScanData(result);
      setScanTime(new Date());
      // AI verdicts now come back already generated as part of the live scan
      if (result?.aiVerdicts && Object.keys(result.aiVerdicts).length > 0) {
        setAiPicks(result.aiVerdicts);
      } else if (result?.topMultibaggers?.length) {
        // Fallback if scan didn't include AI verdicts (e.g. key missing that moment)
        runAIPicks(result.topMultibaggers);
      }
    } catch (e) {
      setError(e.message || 'Scan failed');
    } finally {
      setLoading(false);
    }
  };

  const runAIPicks = async (stocksOverride) => {
    const target = stocksOverride || scanData?.topMultibaggers;
    if (!target?.length) return;
    setLoadingAI(true);
    try {
      const picks = await getAIPicks(target);
      const picksMap = {};
      picks.forEach((p) => { picksMap[p.symbol] = p; });
      setAiPicks(picksMap);
    } catch (e) {
      console.error('AI picks failed', e);
    } finally {
      setLoadingAI(false);
    }
  };

  let displayStocks = scanData?.allResults || [];
  if (filterGrade !== 'all') {
    displayStocks = displayStocks.filter((s) => s.grade === filterGrade || (filterGrade === 'A' && s.grade === 'A+'));
  }
  displayStocks = [...displayStocks].sort((a, b) => {
    if (sortBy === 'score') return b.score - a.score;
    if (sortBy === 'pe') return (a.pe || 999) - (b.pe || 999);
    if (sortBy === 'roe') return (b.roe || -999) - (a.roe || -999);
    if (sortBy === 'growth') return (b.revenueGrowth || -999) - (a.revenueGrowth || -999);
    return 0;
  });

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#0a0a0a', overflow: 'hidden' }}>
      <style>{`@keyframes scspin{to{transform:rotate(360deg)}}@keyframes scpulse{0%,100%{opacity:1}50%{opacity:0.3}}`}</style>

      <div style={{ padding: '12px 16px', borderBottom: '1px solid #1e1e1e', background: '#0d0d0d', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
          <div style={{ fontFamily: 'JetBrains Mono', fontSize: 14, fontWeight: 700, color: '#f5a623', letterSpacing: 2 }}>
            🛸 MARKET SCREENER — MULTIBAGGER HUNTER
          </div>
          <div style={{ fontSize: 9, color: '#444', fontFamily: 'JetBrains Mono' }}>
            100% LIVE — FETCHES EVERY STOCK FRESH FROM YAHOO FINANCE + GROQ AI, NO STORED DATA
          </div>
          <div style={{ flex: 1 }} />
          {scanTime && <div style={{ fontSize: 9, color: '#333', fontFamily: 'JetBrains Mono' }}>Live scan completed {scanTime.toLocaleTimeString('en-IN')}</div>}
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <button onClick={runScan} disabled={loading}
            style={{ padding: '8px 24px', background: loading ? '#333' : '#f5a623', border: 'none', borderRadius: 4, color: loading ? '#666' : '#000', fontFamily: 'JetBrains Mono', fontSize: 11, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', letterSpacing: 1 }}>
            {loading ? 'SCANNING LIVE MARKET...' : '🚀 RUN LIVE MARKET SCAN'}
          </button>

          {scanData && (
            <button onClick={() => runAIPicks()} disabled={loadingAI}
              style={{ padding: '8px 20px', background: loadingAI ? '#333' : 'rgba(167,139,250,0.15)', border: '1px solid ' + (loadingAI ? '#333' : '#a78bfa'), borderRadius: 4, color: loadingAI ? '#666' : '#a78bfa', fontFamily: 'JetBrains Mono', fontSize: 11, fontWeight: 700, cursor: loadingAI ? 'not-allowed' : 'pointer' }}>
              {loadingAI ? 'AI RE-ANALYZING...' : '🤖 RE-RUN AI VERDICTS'}
            </button>
          )}

          {scanData && (
            <>
              <div style={{ width: 1, height: 20, background: '#2a2a2a' }} />
              <span style={{ fontSize: 9, color: '#444', fontFamily: 'JetBrains Mono' }}>SORT</span>
              {[['score', 'SCORE'], ['pe', 'LOW P/E'], ['roe', 'HIGH ROE'], ['growth', 'GROWTH']].map(([key, label]) => (
                <button key={key} onClick={() => setSortBy(key)}
                  style={{ padding: '4px 10px', fontSize: 9, fontFamily: 'JetBrains Mono', background: sortBy === key ? '#4a9eff' : '#141414', color: sortBy === key ? '#000' : '#555', border: '1px solid ' + (sortBy === key ? '#4a9eff' : '#222'), borderRadius: 3, cursor: 'pointer', fontWeight: 700 }}>
                  {label}
                </button>
              ))}
              <div style={{ width: 1, height: 20, background: '#2a2a2a' }} />
              <span style={{ fontSize: 9, color: '#444', fontFamily: 'JetBrains Mono' }}>GRADE</span>
              {['all', 'A', 'B+', 'B', 'C'].map((g) => (
                <button key={g} onClick={() => setFilterGrade(g)}
                  style={{ padding: '4px 10px', fontSize: 9, fontFamily: 'JetBrains Mono', background: filterGrade === g ? '#00d084' : '#141414', color: filterGrade === g ? '#000' : '#555', border: '1px solid ' + (filterGrade === g ? '#00d084' : '#222'), borderRadius: 3, cursor: 'pointer', fontWeight: 700 }}>
                  {g.toUpperCase()}
                </button>
              ))}
            </>
          )}
        </div>

        {scanData && (
          <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
            {[
              ['SCANNED', scanData.total, '#888'],
              ['STRONG BUY', scanData.categories?.strongBuy, '#00d084'],
              ['BUY', scanData.categories?.buy, '#4a9eff'],
              ['HOLD', scanData.categories?.hold, '#f5a623'],
              ['AVOID', scanData.categories?.avoid, '#ff4444'],
            ].map(([label, val, color]) => (
              <div key={label} style={{ padding: '6px 14px', background: '#0d0d0d', borderRadius: 5, border: '1px solid ' + color + '33' }}>
                <span style={{ fontSize: 9, color: '#555', fontFamily: 'JetBrains Mono', marginRight: 6 }}>{label}</span>
                <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'JetBrains Mono', color }}>{val}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>

        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 400, gap: 20 }}>
            <div style={{ width: 56, height: 56, border: '3px solid #1e1e1e', borderTop: '3px solid #f5a623', borderRadius: '50%', animation: 'scspin 1s linear infinite' }} />
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: 14, color: '#f5a623', letterSpacing: 3, animation: 'scpulse 1.5s ease-in-out infinite' }}>
              FETCHING LIVE DATA FOR 200+ STOCKS...
            </div>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: 10, color: '#444' }}>Live quotes + fundamentals from Yahoo Finance, then real-time Groq AI verdicts on the top 20 — this takes 45-90 seconds</div>
          </div>
        )}

        {error && !loading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200, gap: 12 }}>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: 12, color: '#ff4444' }}>SCAN FAILED</div>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: 10, color: '#555' }}>{error}</div>
            <button onClick={runScan}
              style={{ padding: '6px 20px', background: '#f5a623', border: 'none', borderRadius: 4, color: '#000', fontFamily: 'JetBrains Mono', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
              RETRY
            </button>
          </div>
        )}

        {!loading && !error && !scanData && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 400, gap: 16 }}>
            <div style={{ fontSize: 48 }}>🛸</div>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: 14, color: '#444' }}>Click "RUN LIVE MARKET SCAN" to hunt for multibaggers</div>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: 11, color: '#333', textAlign: 'center', maxWidth: 500 }}>
              Fetches live data for 200+ NSE stocks fresh from Yahoo Finance every time you click — scores each with a proprietary 0-100 algorithm (Buffett ROE, Lynch PEG, growth, balance sheet, analyst consensus), then automatically runs real Groq AI analysis on the top 20 candidates. Nothing here is pre-stored.
            </div>
          </div>
        )}

        {!loading && !error && scanData && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontFamily: 'JetBrains Mono', fontWeight: 700, color: '#a78bfa', letterSpacing: 2, marginBottom: 4 }}>
                🏆 TOP 20 MULTIBAGGER CANDIDATES — LIVE SCORED + AI VERIFIED
              </div>
              <div style={{ fontSize: 9, fontFamily: 'JetBrains Mono', color: '#444', marginBottom: 12 }}>
                {loadingAI ? 'AI is generating verdicts in Jhunjhunwala / Kedia / Buffett style right now...' : Object.keys(aiPicks).length > 0 ? 'AI verdicts generated live for this scan — ' + Object.keys(aiPicks).length + ' analyzed' : 'Fundamental scores shown below — AI verdicts unavailable this run'}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {scanData.topMultibaggers.map((s) => (
                  <StockCard key={s.symbol} stock={s} onClick={onSelectStock} aiPick={aiPicks[s.symbol]} />
                ))}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 11, fontFamily: 'JetBrains Mono', fontWeight: 700, color: '#4a9eff', letterSpacing: 2, marginBottom: 12 }}>
                ALL LIVE SCANNED RESULTS ({displayStocks.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {displayStocks.map((s) => (
                  <StockCard key={s.symbol} stock={s} onClick={onSelectStock} aiPick={aiPicks[s.symbol]} />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}