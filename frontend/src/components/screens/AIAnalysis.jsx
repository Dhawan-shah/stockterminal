import { useState, useEffect } from 'react';
import { fetchQuote, fetchFundamentals, fetchAIAnalysis } from '../../utils/api';

const fmt = (n, d = 2) => n != null && !isNaN(n) ? Number(n).toLocaleString('en-IN', { maximumFractionDigits: d }) : '-';

function ImpactBadge({ impact }) {
  const color = impact === 'POSITIVE' ? '#00d084' : impact === 'NEGATIVE' ? '#ff4444' : '#f5a623';
  const icon = impact === 'POSITIVE' ? '▲' : impact === 'NEGATIVE' ? '▼' : '●';
  return (
    <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 3, background: color + '18', color, border: '1px solid ' + color + '33', fontFamily: 'JetBrains Mono', fontWeight: 700 }}>
      {icon} {impact}
    </span>
  );
}

function SeverityBadge({ severity }) {
  const color = severity === 'HIGH' ? '#ff4444' : severity === 'MEDIUM' ? '#f5a623' : '#00d084';
  return (
    <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 3, background: color + '18', color, border: '1px solid ' + color + '33', fontFamily: 'JetBrains Mono', fontWeight: 700 }}>
      {severity}
    </span>
  );
}

function SectionCard({ title, color, children }) {
  return (
    <div style={{ padding: '16px 18px', background: '#111', border: '1px solid #1e1e1e', borderRadius: 8, borderTop: '2px solid ' + (color || '#f5a623') }}>
      <div style={{ fontFamily: 'JetBrains Mono', fontSize: 11, fontWeight: 700, color: color || '#f5a623', letterSpacing: 2, marginBottom: 14 }}>{title}</div>
      {children}
    </div>
  );
}

export default function AIAnalysis({ symbol }) {
  const [ticker, setTicker] = useState(symbol || 'RELIANCE');
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [quoteData, setQuoteData] = useState(null);

  const runAnalysis = async (sym) => {
    if (!sym) return;
    setLoading(true);
    setError(null);
    setAnalysis(null);
    try {
      const [quote, fundamentals] = await Promise.allSettled([
        fetchQuote(sym),
        fetchFundamentals(sym),
      ]);
      const q = quote.status === 'fulfilled' ? quote.value : null;
      const f = fundamentals.status === 'fulfilled' ? fundamentals.value : null;
      if (q) setQuoteData(q);
      const result = await fetchAIAnalysis(sym, q, f);
      setAnalysis(result);
      setLastUpdated(new Date());
    } catch (e) {
      setError(e.message || 'AI analysis failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (symbol) {
      setTicker(symbol);
      runAnalysis(symbol);
    }
  }, [symbol]);

  const verdictColor = analysis?.verdictColor === 'green' ? '#00d084' : analysis?.verdictColor === 'red' ? '#ff4444' : '#f5a623';

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#0a0a0a', overflow: 'hidden' }}>
      <style>{`@keyframes aispin{to{transform:rotate(360deg)}}@keyframes aipulse{0%,100%{opacity:1}50%{opacity:0.3}}@keyframes aiglow{0%,100%{box-shadow:0 0 10px #f5a62344}50%{box-shadow:0 0 30px #f5a623aa}}`}</style>

      {/* Header */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #1e1e1e', background: '#0d0d0d', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
          <div style={{ fontFamily: 'JetBrains Mono', fontSize: 14, fontWeight: 700, color: '#f5a623', letterSpacing: 2 }}>
            🤖 AI ANALYSIS ENGINE
          </div>
          <div style={{ fontSize: 9, color: '#444', fontFamily: 'JetBrains Mono' }}>
            POWERED BY GROQ AI (LLAMA 3.3 70B) — LIVE DATA + REAL-TIME ANALYSIS
          </div>
          <div style={{ flex: 1 }} />
          {quoteData && (
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: 12 }}>
              <span style={{ color: '#f5a623', fontWeight: 700 }}>{ticker}</span>
              <span style={{ marginLeft: 10, color: quoteData.changePct >= 0 ? '#00d084' : '#ff4444' }}>
                Rs {fmt(quoteData.ltp)} ({quoteData.changePct >= 0 ? '+' : ''}{fmt(quoteData.changePct)}%)
              </span>
            </div>
          )}
          {lastUpdated && <div style={{ fontSize: 9, color: '#333', fontFamily: 'JetBrains Mono' }}>Updated {lastUpdated.toLocaleTimeString('en-IN')}</div>}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && runAnalysis(ticker)}
            placeholder="Enter NSE symbol (RELIANCE, TCS, ICICIBANK...)"
            style={{ flex: 1, background: '#141414', border: '1px solid #2a2a2a', borderRadius: 4, padding: '8px 12px', color: '#e8e8e8', fontFamily: 'JetBrains Mono', fontSize: 12, outline: 'none' }}
          />
          <button
            onClick={() => runAnalysis(ticker)}
            disabled={loading}
            style={{ padding: '8px 24px', background: loading ? '#333' : '#f5a623', border: 'none', borderRadius: 4, color: loading ? '#666' : '#000', fontFamily: 'JetBrains Mono', fontSize: 11, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', letterSpacing: 1 }}>
            {loading ? 'ANALYZING...' : 'AI ANALYZE'}
          </button>
          {analysis && (
            <button onClick={() => runAnalysis(ticker)}
              style={{ padding: '8px 12px', background: '#141414', border: '1px solid #2a2a2a', borderRadius: 4, color: '#666', fontFamily: 'JetBrains Mono', fontSize: 14, cursor: 'pointer' }}>
              ↻
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>

        {/* Loading */}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 400, gap: 20 }}>
            <div style={{ width: 60, height: 60, border: '3px solid #1e1e1e', borderTop: '3px solid #f5a623', borderRadius: '50%', animation: 'aispin 1s linear infinite' }} />
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: 14, color: '#f5a623', letterSpacing: 3, animation: 'aipulse 1.5s ease-in-out infinite' }}>
              AI ANALYZING {ticker}...
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              {['Fetching live market data...', 'Loading fundamentals from Screener.in...', 'Analyzing global macro factors...', 'Running Gemini AI deep analysis...', 'Generating predictions...'].map((msg, i) => (
                <div key={i} style={{ fontSize: 10, color: '#444', fontFamily: 'JetBrains Mono' }}>{msg}</div>
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200, gap: 12 }}>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: 12, color: '#ff4444' }}>AI ANALYSIS FAILED</div>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: 10, color: '#555', textAlign: 'center' }}>{error}</div>
            <div style={{ fontSize: 10, color: '#444', fontFamily: 'JetBrains Mono' }}>Check your GEMINI_API_KEY in backend .env file</div>
            <button onClick={() => runAnalysis(ticker)}
              style={{ padding: '6px 20px', background: '#f5a623', border: 'none', borderRadius: 4, color: '#000', fontFamily: 'JetBrains Mono', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
              RETRY
            </button>
          </div>
        )}

        {/* Analysis Results */}
        {!loading && !error && analysis && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* VERDICT HERO */}
            <div style={{ padding: '24px', background: '#111', border: '2px solid ' + verdictColor, borderRadius: 12, animation: 'aiglow 2s ease-in-out infinite', textAlign: 'center' }}>
              <div style={{ fontSize: 9, color: '#555', fontFamily: 'JetBrains Mono', letterSpacing: 2, marginBottom: 8 }}>AI VERDICT FOR {ticker}</div>
              <div style={{ fontSize: 36, fontWeight: 700, fontFamily: 'JetBrains Mono', color: verdictColor, marginBottom: 8 }}>{analysis.verdict}</div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginBottom: 16 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 9, color: '#555', fontFamily: 'JetBrains Mono', marginBottom: 4 }}>CONFIDENCE</div>
                  <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'JetBrains Mono', color: verdictColor }}>{analysis.confidenceScore}%</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 9, color: '#555', fontFamily: 'JetBrains Mono', marginBottom: 4 }}>12M TARGET</div>
                  <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'JetBrains Mono', color: '#00d084' }}>Rs {fmt(analysis.priceTarget12M)}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 9, color: '#555', fontFamily: 'JetBrains Mono', marginBottom: 4 }}>UPSIDE</div>
                  <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'JetBrains Mono', color: analysis.updownside > 0 ? '#00d084' : '#ff4444' }}>
                    {analysis.updownside > 0 ? '+' : ''}{fmt(analysis.updownside)}%
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 9, color: '#555', fontFamily: 'JetBrains Mono', marginBottom: 4 }}>SENTIMENT</div>
                  <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'JetBrains Mono', color: analysis.sentimentScore > 60 ? '#00d084' : analysis.sentimentScore < 40 ? '#ff4444' : '#f5a623' }}>
                    {analysis.sentimentScore}
                  </div>
                </div>
              </div>

              {/* Sentiment bar */}
              <div style={{ height: 6, background: '#1a1a1a', borderRadius: 3, overflow: 'hidden', maxWidth: 400, margin: '0 auto 12px' }}>
                <div style={{ height: '100%', width: analysis.sentimentScore + '%', background: analysis.sentimentScore > 60 ? '#00d084' : analysis.sentimentScore < 40 ? '#ff4444' : '#f5a623', transition: 'width 1s ease' }} />
              </div>

              <div style={{ fontSize: 12, color: '#888', fontFamily: 'JetBrains Mono', lineHeight: 1.8, maxWidth: 700, margin: '0 auto' }}>
                {analysis.summary}
              </div>
            </div>

            {/* Bullish + Bearish factors */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <SectionCard title="BULLISH FACTORS" color="#00d084">
                {analysis.bullishFactors?.map((f, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: '1px solid #141414' }}>
                    <span style={{ color: '#00d084', fontFamily: 'JetBrains Mono', fontSize: 12, flexShrink: 0 }}>▲</span>
                    <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: '#888', lineHeight: 1.6 }}>{f}</span>
                  </div>
                ))}
              </SectionCard>
              <SectionCard title="BEARISH / RISK FACTORS" color="#ff4444">
                {analysis.bearishFactors?.map((f, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: '1px solid #141414' }}>
                    <span style={{ color: '#ff4444', fontFamily: 'JetBrains Mono', fontSize: 12, flexShrink: 0 }}>▼</span>
                    <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: '#888', lineHeight: 1.6 }}>{f}</span>
                  </div>
                ))}
              </SectionCard>
            </div>

            {/* Global Macro Impact */}
            {analysis.macroImpact && (
              <SectionCard title="GLOBAL MACRO IMPACT ANALYSIS" color="#4a9eff">
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 9, color: '#4a9eff', fontFamily: 'JetBrains Mono', letterSpacing: 1, marginBottom: 10 }}>GLOBAL FACTORS</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {analysis.macroImpact.globalFactors?.map((f, i) => (
                      <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 12px', background: '#0d0d0d', borderRadius: 6, border: '1px solid #1a1a1a' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: '#e8e8e8', fontWeight: 600 }}>{f.factor}</span>
                            <ImpactBadge impact={f.impact} />
                          </div>
                          <div style={{ fontSize: 10, fontFamily: 'JetBrains Mono', color: '#666', lineHeight: 1.6 }}>{f.explanation}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 9, color: '#00d084', fontFamily: 'JetBrains Mono', letterSpacing: 1, marginBottom: 10 }}>INDIA-SPECIFIC FACTORS</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {analysis.macroImpact.indiaFactors?.map((f, i) => (
                      <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 12px', background: '#0d0d0d', borderRadius: 6, border: '1px solid #1a1a1a' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: '#e8e8e8', fontWeight: 600 }}>{f.factor}</span>
                            <ImpactBadge impact={f.impact} />
                          </div>
                          <div style={{ fontSize: 10, fontFamily: 'JetBrains Mono', color: '#666', lineHeight: 1.6 }}>{f.explanation}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </SectionCard>
            )}

            {/* Stake Activity */}
            {analysis.stakeActivity && (
              <SectionCard title="INSTITUTIONAL STAKE ACTIVITY" color="#a78bfa">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
                  {[
                    { label: 'PROMOTER TREND', value: analysis.stakeActivity.promoterTrend, color: analysis.stakeActivity.promoterTrend === 'INCREASING' ? '#00d084' : analysis.stakeActivity.promoterTrend === 'DECREASING' ? '#ff4444' : '#f5a623' },
                    { label: 'FII TREND', value: analysis.stakeActivity.fiiTrend, color: analysis.stakeActivity.fiiTrend === 'BUYING' ? '#00d084' : analysis.stakeActivity.fiiTrend === 'SELLING' ? '#ff4444' : '#f5a623' },
                    { label: 'DII TREND', value: analysis.stakeActivity.diiTrend, color: analysis.stakeActivity.diiTrend === 'BUYING' ? '#00d084' : analysis.stakeActivity.diiTrend === 'SELLING' ? '#ff4444' : '#f5a623' },
                  ].map((item) => (
                    <div key={item.label} style={{ padding: '12px', background: '#0d0d0d', borderRadius: 6, textAlign: 'center', border: '1px solid ' + item.color + '33' }}>
                      <div style={{ fontSize: 9, color: '#555', fontFamily: 'JetBrains Mono', marginBottom: 6 }}>{item.label}</div>
                      <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'JetBrains Mono', color: item.color }}>{item.value}</div>
                    </div>
                  ))}
                </div>
                <div style={{ padding: '10px 12px', background: '#0d0d0d', borderRadius: 6, marginBottom: 12 }}>
                  <div style={{ fontSize: 9, color: '#555', fontFamily: 'JetBrains Mono', marginBottom: 6 }}>INSTITUTIONAL ACTIVITY</div>
                  <div style={{ fontSize: 11, color: '#888', fontFamily: 'JetBrains Mono', lineHeight: 1.7 }}>{analysis.stakeActivity.institutionalActivity}</div>
                </div>
                {analysis.stakeActivity.keyInstitutions && (
                  <div>
                    <div style={{ fontSize: 9, color: '#555', fontFamily: 'JetBrains Mono', marginBottom: 8 }}>KEY INSTITUTIONS LIKELY HOLDING</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {analysis.stakeActivity.keyInstitutions.map((inst, i) => (
                        <span key={i} style={{ fontSize: 10, padding: '4px 10px', background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.3)', borderRadius: 4, color: '#a78bfa', fontFamily: 'JetBrains Mono' }}>{inst}</span>
                      ))}
                    </div>
                  </div>
                )}
              </SectionCard>
            )}

            {/* Growth Drivers */}
            {analysis.growthDrivers && (
              <SectionCard title="AI-IDENTIFIED GROWTH DRIVERS" color="#f5a623">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                  {analysis.growthDrivers.map((d, i) => {
                    const ic = d.impact === 'HIGH' ? '#00d084' : d.impact === 'MEDIUM' ? '#f5a623' : '#888';
                    const tc = d.timeline === 'Short-term' ? '#ff4444' : d.timeline === 'Medium-term' ? '#f5a623' : '#4a9eff';
                    return (
                      <div key={i} style={{ padding: '12px', background: '#0d0d0d', borderRadius: 6, border: '1px solid #1a1a1a' }}>
                        <div style={{ fontFamily: 'JetBrains Mono', fontSize: 11, fontWeight: 700, color: ic, marginBottom: 6 }}>{d.driver}</div>
                        <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                          <span style={{ fontSize: 8, padding: '1px 6px', borderRadius: 2, background: tc + '18', color: tc, border: '1px solid ' + tc + '33', fontFamily: 'JetBrains Mono' }}>{d.timeline}</span>
                          <span style={{ fontSize: 8, padding: '1px 6px', borderRadius: 2, background: ic + '18', color: ic, border: '1px solid ' + ic + '33', fontFamily: 'JetBrains Mono' }}>{d.impact} IMPACT</span>
                        </div>
                        <div style={{ fontSize: 10, color: '#666', fontFamily: 'JetBrains Mono', lineHeight: 1.6 }}>{d.description}</div>
                      </div>
                    );
                  })}
                </div>
              </SectionCard>
            )}

            {/* Supply Demand + Sector */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {analysis.supplyDemandAnalysis && (
                <SectionCard title="SUPPLY & DEMAND ANALYSIS" color="#f97316">
                  <div style={{ padding: '10px 12px', background: '#0d0d0d', borderRadius: 6, marginBottom: 10 }}>
                    <div style={{ fontSize: 9, color: '#555', fontFamily: 'JetBrains Mono', marginBottom: 4 }}>DEMAND OUTLOOK</div>
                    <div style={{ fontSize: 11, color: '#888', fontFamily: 'JetBrains Mono', lineHeight: 1.6 }}>{analysis.supplyDemandAnalysis.demandOutlook}</div>
                  </div>
                  <div style={{ padding: '10px 12px', background: '#0d0d0d', borderRadius: 6, marginBottom: 10 }}>
                    <div style={{ fontSize: 9, color: '#555', fontFamily: 'JetBrains Mono', marginBottom: 4 }}>SUPPLY CHAIN RISKS</div>
                    <div style={{ fontSize: 11, color: '#888', fontFamily: 'JetBrains Mono', lineHeight: 1.6 }}>{analysis.supplyDemandAnalysis.supplyChainRisks}</div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {[['PRICING POWER', analysis.supplyDemandAnalysis.pricingPower], ['COMPETITION', analysis.supplyDemandAnalysis.competitiveIntensity]].map(([label, val]) => {
                      const c = val === 'HIGH' ? '#00d084' : val === 'MEDIUM' ? '#f5a623' : '#888';
                      return (
                        <div key={label} style={{ padding: '8px', background: '#0d0d0d', borderRadius: 4, textAlign: 'center', border: '1px solid ' + c + '33' }}>
                          <div style={{ fontSize: 8, color: '#555', fontFamily: 'JetBrains Mono', marginBottom: 4 }}>{label}</div>
                          <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'JetBrains Mono', color: c }}>{val}</div>
                        </div>
                      );
                    })}
                  </div>
                </SectionCard>
              )}

              {analysis.sectorAnalysis && (
                <SectionCard title="SECTOR ANALYSIS" color="#ec4899">
                  <div style={{ marginBottom: 12, padding: '10px', background: '#0d0d0d', borderRadius: 6, textAlign: 'center' }}>
                    <div style={{ fontSize: 9, color: '#555', fontFamily: 'JetBrains Mono', marginBottom: 4 }}>SECTOR OUTLOOK</div>
                    <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'JetBrains Mono', color: analysis.sectorAnalysis.sectorOutlook === 'BULLISH' ? '#00d084' : analysis.sectorAnalysis.sectorOutlook === 'BEARISH' ? '#ff4444' : '#f5a623' }}>
                      {analysis.sectorAnalysis.sectorOutlook}
                    </div>
                  </div>
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 9, color: '#00d084', fontFamily: 'JetBrains Mono', marginBottom: 6 }}>TAILWINDS</div>
                    {analysis.sectorAnalysis.sectorTailwinds?.map((t, i) => (
                      <div key={i} style={{ display: 'flex', gap: 8, padding: '4px 0', borderBottom: '1px solid #111' }}>
                        <span style={{ color: '#00d084', fontSize: 10 }}>+</span>
                        <span style={{ fontSize: 10, color: '#888', fontFamily: 'JetBrains Mono' }}>{t}</span>
                      </div>
                    ))}
                  </div>
                  <div>
                    <div style={{ fontSize: 9, color: '#ff4444', fontFamily: 'JetBrains Mono', marginBottom: 6 }}>HEADWINDS</div>
                    {analysis.sectorAnalysis.sectorHeadwinds?.map((h, i) => (
                      <div key={i} style={{ display: 'flex', gap: 8, padding: '4px 0', borderBottom: '1px solid #111' }}>
                        <span style={{ color: '#ff4444', fontSize: 10 }}>-</span>
                        <span style={{ fontSize: 10, color: '#888', fontFamily: 'JetBrains Mono' }}>{h}</span>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              )}
            </div>

            {/* Technical View + Investment Horizon */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {analysis.technicalView && (
                <SectionCard title="AI TECHNICAL VIEW" color="#4a9eff">
                  {[
                    ['TREND', analysis.technicalView.trend, analysis.technicalView.trend === 'UPTREND' ? '#00d084' : analysis.technicalView.trend === 'DOWNTREND' ? '#ff4444' : '#f5a623'],
                    ['SUPPORT', 'Rs ' + analysis.technicalView.supportLevel, '#ff4444'],
                    ['RESISTANCE', 'Rs ' + analysis.technicalView.resistanceLevel, '#00d084'],
                    ['RSI STATUS', analysis.technicalView.rsi, analysis.technicalView.rsi === 'OVERSOLD' ? '#00d084' : analysis.technicalView.rsi === 'OVERBOUGHT' ? '#ff4444' : '#f5a623'],
                    ['CALL', analysis.technicalView.recommendation, '#4a9eff'],
                  ].map(([label, val, color]) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #111' }}>
                      <span style={{ fontSize: 10, fontFamily: 'JetBrains Mono', color: '#555' }}>{label}</span>
                      <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono', fontWeight: 600, color }}>{val}</span>
                    </div>
                  ))}
                </SectionCard>
              )}

              {analysis.investmentHorizon && (
                <SectionCard title="INVESTMENT HORIZON OUTLOOK" color="#00d084">
                  {[['SHORT TERM (3-6M)', analysis.investmentHorizon.shortTerm, '#f5a623'], ['MEDIUM TERM (1-2Y)', analysis.investmentHorizon.mediumTerm, '#4a9eff'], ['LONG TERM (3-5Y)', analysis.investmentHorizon.longTerm, '#00d084']].map(([label, val, color]) => (
                    <div key={label} style={{ padding: '10px 12px', background: '#0d0d0d', borderRadius: 6, marginBottom: 8, borderLeft: '2px solid ' + color }}>
                      <div style={{ fontSize: 9, color: color, fontFamily: 'JetBrains Mono', fontWeight: 700, marginBottom: 4 }}>{label}</div>
                      <div style={{ fontSize: 11, color: '#888', fontFamily: 'JetBrains Mono', lineHeight: 1.6 }}>{val}</div>
                    </div>
                  ))}
                </SectionCard>
              )}
            </div>

            {/* Key Risks */}
            {analysis.keyRisks && (
              <SectionCard title="KEY RISKS & MITIGATIONS" color="#ff4444">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                  {analysis.keyRisks.map((risk, i) => (
                    <div key={i} style={{ padding: '12px', background: '#0d0d0d', borderRadius: 6, border: '1px solid #1a1a1a' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: '#ff4444', fontWeight: 700, flex: 1 }}>{risk.risk}</span>
                        <SeverityBadge severity={risk.severity} />
                      </div>
                      <div style={{ fontSize: 9, color: '#555', fontFamily: 'JetBrains Mono', marginBottom: 4 }}>MITIGATION</div>
                      <div style={{ fontSize: 10, color: '#666', fontFamily: 'JetBrains Mono', lineHeight: 1.6 }}>{risk.mitigation}</div>
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}

            {/* Catalysts */}
            {analysis.catalysts && (
              <SectionCard title="UPCOMING CATALYSTS TO WATCH" color="#f5a623">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                  {analysis.catalysts.map((cat, i) => {
                    const ic = cat.potentialImpact === 'HIGH' ? '#00d084' : cat.potentialImpact === 'MEDIUM' ? '#f5a623' : '#888';
                    return (
                      <div key={i} style={{ padding: '12px', background: '#0d0d0d', borderRadius: 6, border: '1px solid ' + ic + '33', borderTop: '2px solid ' + ic }}>
                        <div style={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: '#e8e8e8', fontWeight: 700, marginBottom: 6 }}>{cat.catalyst}</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 9, color: '#555', fontFamily: 'JetBrains Mono' }}>{cat.expectedDate}</span>
                          <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 3, background: ic + '18', color: ic, border: '1px solid ' + ic + '33', fontFamily: 'JetBrains Mono', fontWeight: 700 }}>{cat.potentialImpact}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </SectionCard>
            )}

            {/* Final Recommendation */}
            {analysis.finalRecommendation && (
              <div style={{ padding: '20px 24px', background: '#111', border: '2px solid ' + verdictColor, borderRadius: 12, textAlign: 'center' }}>
                <div style={{ fontSize: 9, color: '#555', fontFamily: 'JetBrains Mono', letterSpacing: 2, marginBottom: 10 }}>AI FINAL RECOMMENDATION</div>
                <div style={{ fontSize: 13, color: '#e8e8e8', fontFamily: 'JetBrains Mono', lineHeight: 1.9, maxWidth: 700, margin: '0 auto' }}>
                  {analysis.finalRecommendation}
                </div>
                <div style={{ marginTop: 12, fontSize: 9, color: '#333', fontFamily: 'JetBrains Mono' }}>
                  Powered by Groq AI (Llama 3.3 70B) • Live NSE/BSE Data • Not financial advice • DYOR
                </div>
              </div>
            )}

          </div>
        )}

        {/* Empty state */}
        {!loading && !error && !analysis && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 400, gap: 16 }}>
            <div style={{ fontSize: 48 }}>🤖</div>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: 14, color: '#444' }}>Enter any NSE stock symbol and click AI ANALYZE</div>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: 11, color: '#333' }}>Powered by Google Gemini • Analyzes 20+ factors • Takes 15-30 seconds</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
              {['RELIANCE', 'TCS', 'ICICIBANK', 'INFY', 'HDFCBANK', 'SBIN'].map(s => (
                <button key={s} onClick={() => { setTicker(s); runAnalysis(s); }}
                  style={{ padding: '6px 14px', background: '#141414', border: '1px solid #2a2a2a', borderRadius: 4, color: '#888', fontFamily: 'JetBrains Mono', fontSize: 11, cursor: 'pointer' }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}