const express = require('express');
const router = express.Router();
const Groq = require('groq-sdk');
const NodeCache = require('node-cache');

const aiCache = new NodeCache({ stdTTL: 3600 });

router.post('/analyze', async (req, res) => {
  try {
    const { symbol, quote, fundamentals } = req.body;
    if (!symbol) return res.status(400).json({ success: false, error: 'Symbol required' });

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ success: false, error: 'GROQ_API_KEY missing in .env file' });
    }

    // Cache key includes symbol + today's date + price to ensure freshness
    const priceKey = quote?.ltp ? Math.round(quote.ltp) : 'unknown';
    const cacheKey = `ai_${symbol}_${new Date().toDateString()}_${priceKey}`;
    const cached = aiCache.get(cacheKey);
    if (cached) return res.json({ success: true, data: cached, fromCache: true });

    const groq = new Groq({ apiKey });

    const q = quote || {};
    const f = fundamentals?.ratios || {};

    // Build rich context from live data
    const ltp = q.ltp || 0;
    const pe = q.pe || f['Stock P/E'] || null;
    const roe = q.roe ? (q.roe * 100).toFixed(2) : null;
    const roce = f['ROCE'] || null;
    const debt = q.debt || f['Debt to equity'] || null;
    const revGrowth = q.revenueGrowth ? (q.revenueGrowth * 100).toFixed(2) : null;
    const epsGrowth = q.epsGrowth ? (q.epsGrowth * 100).toFixed(2) : null;
    const grossMargin = q.grossMargin ? (q.grossMargin * 100).toFixed(2) : null;
    const opMargin = q.operatingMargin ? (q.operatingMargin * 100).toFixed(2) : null;
    const promoterHolding = f['Promoter holding'] || null;
    const fiiHolding = f['FII holding'] || null;
    const diiHolding = f['DII holding'] || null;
    const targetPrice = q.targetPrice || null;
    const upside = targetPrice ? (((targetPrice - ltp) / ltp) * 100).toFixed(1) : null;
    const week52High = q.weekHigh52 || 0;
    const week52Low = q.weekLow52 || 0;
    const fromHigh = week52High ? (((ltp - week52High) / week52High) * 100).toFixed(1) : null;
    const fromLow = week52Low ? (((ltp - week52Low) / week52Low) * 100).toFixed(1) : null;

    const prompt = `You are Dhruv Shah, India's top stock market analyst with 30 years experience on NSE/BSE. Today's date is ${new Date().toLocaleDateString('en-IN')}. You must analyze ONLY this specific stock using the LIVE data provided below. Every single section of your analysis must be 100% specific to ${symbol} - not generic.

═══════════════════════════════════════
LIVE DATA FOR ${symbol} (${q.name || symbol})
═══════════════════════════════════════
Exchange: ${q.exchange || 'NSE'}
Sector: ${q.sector || 'Unknown'}
Current Price: Rs ${ltp}
Today Change: ${q.change?.toFixed(2) || 'N/A'} (${q.changePct?.toFixed(2) || 'N/A'}%)
Market Cap: ${q.marketCap ? 'Rs ' + (q.marketCap / 1e7).toFixed(0) + ' Cr' : 'N/A'}
Volume Today: ${q.volume ? q.volume.toLocaleString('en-IN') : 'N/A'}

52W HIGH: Rs ${week52High} | FROM HIGH: ${fromHigh}%
52W LOW: Rs ${week52Low} | FROM LOW: ${fromLow}%

VALUATION:
P/E: ${pe || 'N/A'} | P/B: ${q.pb || 'N/A'}
EPS TTM: Rs ${q.eps || 'N/A'} | Forward EPS: Rs ${q.forwardEps || 'N/A'}
EPS Growth: ${epsGrowth || 'N/A'}% | Revenue Growth: ${revGrowth || 'N/A'}%

PROFITABILITY:
ROE: ${roe || 'N/A'}% | ROCE: ${roce || 'N/A'}
Gross Margin: ${grossMargin || 'N/A'}% | Operating Margin: ${opMargin || 'N/A'}%
Dividend Yield: ${q.div ? (q.div * 100).toFixed(2) + '%' : 'N/A'}

BALANCE SHEET:
Debt/Equity: ${debt || 'N/A'} | Current Ratio: ${q.currentRatio || 'N/A'}
Beta: ${q.beta || 'N/A'}

OWNERSHIP:
Promoter: ${promoterHolding || 'N/A'} | FII: ${fiiHolding || 'N/A'} | DII: ${diiHolding || 'N/A'}

ANALYST CONSENSUS:
Target Price: ${targetPrice ? 'Rs ' + targetPrice : 'N/A'}
Upside from CMP: ${upside || 'N/A'}%
Recommendation: ${q.recommendation?.replace('_', ' ').toUpperCase() || 'N/A'}

SCREENER DATA: ${Object.entries(f).slice(0, 10).map(([k,v]) => k + ': ' + v).join(' | ')}
═══════════════════════════════════════

CRITICAL INSTRUCTIONS:
1. Every analysis point MUST mention ${symbol} by name
2. Use the exact numbers from live data above
3. Reference India 2025-2026 macro conditions
4. Be specific about which world events affect ${symbol}'s sector
5. Mention actual competitors of ${symbol}
6. Identify real institutional investors known to hold this type of stock
7. Return ONLY valid JSON starting with { and ending with }

{
  "verdict": "STRONG BUY or BUY or HOLD or SELL or STRONG SELL based on data",
  "verdictColor": "green or yellow or red",
  "confidenceScore": number between 1 and 100,
  "priceTarget12M": realistic number based on fundamentals,
  "updownside": realistic percentage,
  "summary": "3 sentences mentioning ${symbol} specifically, its current price Rs ${ltp}, and key driver right now",
  "sentimentScore": number between 1 and 100,
  "sentimentLabel": "BULLISH or BEARISH or NEUTRAL",
  "bullishFactors": [
    "${symbol} specific bull point 1 with actual numbers from data",
    "${symbol} specific bull point 2 with actual numbers",
    "${symbol} specific bull point 3",
    "${symbol} specific bull point 4",
    "${symbol} specific bull point 5"
  ],
  "bearishFactors": [
    "${symbol} specific risk 1 with actual numbers",
    "${symbol} specific risk 2",
    "${symbol} specific risk 3"
  ],
  "macroImpact": {
    "globalFactors": [
      {"factor": "US Fed Rate Cuts 2025", "impact": "POSITIVE or NEGATIVE or NEUTRAL", "explanation": "Specifically how Fed cuts affect ${symbol} in ${q.sector || 'its'} sector with numbers"},
      {"factor": "China+1 Strategy", "impact": "POSITIVE or NEGATIVE or NEUTRAL", "explanation": "How China+1 specifically benefits or hurts ${symbol}"},
      {"factor": "Crude Oil at Current Levels", "impact": "POSITIVE or NEGATIVE or NEUTRAL", "explanation": "Exact impact of current oil prices on ${symbol} cost structure or revenue"},
      {"factor": "INR Depreciation vs USD", "impact": "POSITIVE or NEGATIVE or NEUTRAL", "explanation": "How rupee movement specifically impacts ${symbol} revenues or costs"},
      {"factor": "Global AI and Tech Boom", "impact": "POSITIVE or NEGATIVE or NEUTRAL", "explanation": "How AI revolution impacts ${symbol} business model"}
    ],
    "indiaFactors": [
      {"factor": "RBI Rate Cut Cycle 2025", "impact": "POSITIVE or NEGATIVE or NEUTRAL", "explanation": "Specific impact of RBI rate cuts on ${symbol}"},
      {"factor": "India GDP 7 percent Growth", "impact": "POSITIVE or NEGATIVE or NEUTRAL", "explanation": "How India GDP growth directly drives ${symbol} business"},
      {"factor": "PLI and Govt Schemes", "impact": "POSITIVE or NEGATIVE or NEUTRAL", "explanation": "Name specific PLI schemes or govt programs that benefit ${symbol}"},
      {"factor": "Union Budget FY26", "impact": "POSITIVE or NEGATIVE or NEUTRAL", "explanation": "Specific budget allocations or policies that affect ${symbol}"},
      {"factor": "FII Buying in India 2025", "impact": "POSITIVE or NEGATIVE or NEUTRAL", "explanation": "How FII inflows affect ${symbol} specifically"}
    ]
  },
  "stakeActivity": {
    "promoterTrend": "INCREASING or DECREASING or STABLE based on ${promoterHolding || 'data'}",
    "fiiTrend": "BUYING or SELLING or NEUTRAL based on ${fiiHolding || 'data'}",
    "diiTrend": "BUYING or SELLING or NEUTRAL based on ${diiHolding || 'data'}",
    "institutionalActivity": "Specific description of institutional activity in ${symbol} mentioning actual FII DII numbers ${fiiHolding || ''} and ${diiHolding || ''} and what this means",
    "keyInstitutions": ["Real institution known to invest in ${q.sector || 'Indian'} sector 1", "Real institution 2", "Real institution 3"]
  },
  "sectorAnalysis": {
    "sectorOutlook": "BULLISH or BEARISH or NEUTRAL",
    "sectorTailwinds": ["Specific tailwind for ${q.sector || symbol} sector in India 2025", "Tailwind 2 with specifics", "Tailwind 3 with specifics"],
    "sectorHeadwinds": ["Specific headwind for ${q.sector || symbol} sector", "Headwind 2 specific"],
    "competitivePosition": "Where ${symbol} stands vs its actual competitors in ${q.sector || 'its'} sector"
  },
  "growthDrivers": [
    {"driver": "Specific growth driver for ${symbol}", "timeline": "Short-term", "impact": "HIGH", "description": "Detailed explanation specific to ${symbol} with numbers"},
    {"driver": "Specific growth driver 2 for ${symbol}", "timeline": "Medium-term", "impact": "HIGH", "description": "Detailed explanation with numbers from data"},
    {"driver": "Specific growth driver 3 for ${symbol}", "timeline": "Long-term", "impact": "MEDIUM", "description": "Detailed long term thesis for ${symbol}"}
  ],
  "supplyDemandAnalysis": {
    "demandOutlook": "Specific demand analysis for ${symbol} products or services in India and globally",
    "supplyChainRisks": "Specific supply chain risks for ${symbol}",
    "pricingPower": "HIGH or MEDIUM or LOW with reason specific to ${symbol}",
    "competitiveIntensity": "HIGH or MEDIUM or LOW with reason specific to ${symbol} sector"
  },
  "technicalView": {
    "trend": "UPTREND or DOWNTREND or SIDEWAYS based on price Rs ${ltp} vs 52W high Rs ${week52High} and low Rs ${week52Low}",
    "supportLevel": ${Math.round(ltp * 0.92)},
    "resistanceLevel": ${Math.round(ltp * 1.08)},
    "rsi": "OVERBOUGHT or OVERSOLD or NEUTRAL based on current price position",
    "recommendation": "Specific entry recommendation for ${symbol}"
  },
  "investmentHorizon": {
    "shortTerm": "3-6 month view for ${symbol} with specific price range Rs X to Rs Y and key near term catalyst",
    "mediumTerm": "1-2 year view for ${symbol} with specific price target and key medium term catalyst",
    "longTerm": "3-5 year view for ${symbol} with compounding potential and long term thesis"
  },
  "keyRisks": [
    {"risk": "Specific risk 1 for ${symbol}", "severity": "HIGH", "mitigation": "How to manage this risk when investing in ${symbol}"},
    {"risk": "Specific risk 2 for ${symbol}", "severity": "MEDIUM", "mitigation": "Mitigation strategy"},
    {"risk": "Specific risk 3 for ${symbol}", "severity": "LOW", "mitigation": "Mitigation strategy"}
  ],
  "catalysts": [
    {"catalyst": "Specific upcoming catalyst for ${symbol}", "expectedDate": "Q2 FY26", "potentialImpact": "HIGH"},
    {"catalyst": "Specific catalyst 2 for ${symbol}", "expectedDate": "H2 FY26", "potentialImpact": "MEDIUM"},
    {"catalyst": "Specific catalyst 3 for ${symbol}", "expectedDate": "FY27", "potentialImpact": "HIGH"}
  ],
  "finalRecommendation": "4 sentences: 1) Overall verdict for ${symbol} at Rs ${ltp}. 2) Specific entry strategy with price levels. 3) Price target and timeline. 4) Stop loss and risk management for ${symbol}"
}`;

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `You are India's top stock analyst. Today is ${new Date().toLocaleDateString('en-IN')}. You analyze ${symbol} specifically. Return ONLY valid JSON with no markdown, no backticks, no text outside JSON.`,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 4000,
    });

    const rawText = completion.choices[0]?.message?.content || '';

    if (!rawText) {
      return res.status(500).json({ success: false, error: 'AI returned empty response' });
    }

    let analysis;
    try {
      const clean = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const jsonStart = clean.indexOf('{');
      const jsonEnd = clean.lastIndexOf('}');
      const jsonStr = clean.slice(jsonStart, jsonEnd + 1);
      analysis = JSON.parse(jsonStr);
    } catch (parseErr) {
      console.error('JSON parse error:', parseErr.message);
      analysis = {
        verdict: 'HOLD',
        verdictColor: 'yellow',
        confidenceScore: 50,
        priceTarget12M: targetPrice || Math.round(ltp * 1.1),
        updownside: upside ? parseFloat(upside) : 10,
        summary: `${symbol} is currently trading at Rs ${ltp}. Analysis is available but JSON formatting had an issue. Raw analysis: ${rawText.slice(0, 200)}`,
        sentimentScore: 50,
        sentimentLabel: 'NEUTRAL',
        bullishFactors: [`${symbol} current price Rs ${ltp}`, `52W Range: Rs ${week52Low} - Rs ${week52High}`, 'Analyst target: Rs ' + (targetPrice || 'N/A')],
        bearishFactors: ['Monitor quarterly results', 'Track FII flows', 'Watch sector headwinds'],
        finalRecommendation: `${symbol} at Rs ${ltp}. Analyst target Rs ${targetPrice || 'N/A'}. Monitor key levels before entry.`,
      };
    }

    aiCache.set(cacheKey, analysis, 3600);
    res.json({ success: true, data: analysis, symbol, price: ltp });

  } catch (e) {
    console.error('AI Route Error:', e.message);
    if (e.error) {
      return res.status(500).json({ success: false, error: 'Groq Error: ' + (e.error?.message || e.message) });
    }
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;