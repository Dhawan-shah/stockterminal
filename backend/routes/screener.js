const express = require('express');
const router = express.Router();
const YahooFinance = require('yahoo-finance2');
const yahooFinance = new YahooFinance.default();
const Groq = require('groq-sdk');

const ALL_INDIA_STOCKS = [
  'RELIANCE','TCS','HDFCBANK','ICICIBANK','INFY','SBIN','HINDUNILVR','ITC','BHARTIARTL','KOTAKBANK',
  'LT','AXISBANK','ASIANPAINT','MARUTI','SUNPHARMA','TITAN','WIPRO','BAJFINANCE','NTPC','POWERGRID',
  'ULTRACEMCO','NESTLEIND','TATAMOTORS','ADANIENT','JSWSTEEL','TATASTEEL','HCLTECH','TECHM','DRREDDY',
  'ONGC','COALINDIA','BPCL','GRASIM','HINDALCO','CIPLA','DIVISLAB','EICHERMOT','APOLLOHOSP','BAJAJFINSV',
  'BRITANNIA','HEROMOTOCO','INDUSINDBK','M&M','SBILIFE','HDFCLIFE','ADANIPORTS','BAJAJ-AUTO','TATACONSUM',
  'AMBUJACEM','DMART','BERGEPAINT','BIOCON','COLPAL','DABUR','GODREJCP','HAVELLS','HDFCAMC','ICICIGI',
  'INDIGO','INDUSTOWER','IOC','LUPIN','MCDOWELL-N','MUTHOOTFIN','PAGEIND','PIDILITIND','PIIND','RECLTD',
  'SAIL','SIEMENS','SRF','TATACOMM','TORNTPHARM','TVSMOTOR','UBL','VEDL','VOLTAS','ZOMATO',
  'ABCAPITAL','ABFRL','AAVAS','ACE','AFFLE','AJANTPHARM','AKZOINDIA','ALKYLAMINE',
  'AMARAJABAT','AMBER','ANGELONE','APTUS','ARVINDFASN','ASTRAL','ATUL','AUBANK','AURPHARMA',
  'AVANTIFEED','BAJAJHLDNG','BALKRISIND','BALRAMCHIN','BANDHANBNK','BANKBARODA','BATAINDIA',
  'BEL','BHEL','BLUEDART','BOSCHLTD','BRIGADE','BSE','CAMS','CANFINHOME','CARBORUNIV',
  'CASTROLIND','CDSL','CEATLTD','CENTURYPLY','CGPOWER','CHAMBLFERT','CHOLAFIN','CLEAN',
  'COCHINSHIP','COFORGE','COROMANDEL','CRISIL','CROMPTON','CUMMINSIND','CYIENT','DATAPATTNS',
  'DEEPAKNTR','DELHIVERY','DIXON','EASEMYTRIP','EMAMILTD','ENDURANCE','ESCORTS','EXIDEIND',
  'FEDERALBNK','FINEORG','FIVESTAR','FLUOROCHEM','FORTIS','GLAND','GLENMARK','GMRAIRPORT',
  'GODFRYPHLP','GODREJPROP','GPPL','GRANULES','GRINDWELL','GSPL','HAPPSTMNDS','HATSUN',
  'HEG','HFCL','HINDCOPPER','HINDPETRO','HONAUT','HUDCO','IDFCFIRSTB','IEX','IIFL',
  'INDIAMART','INDHOTEL','IPCALAB','IRCTC','IRFC','ISEC','JBCHEPHARM','JINDALSTEL',
  'JKCEMENT','JSWENERGY','JUBLFOOD','JUBLPHARMA','JYOTHYLAB','KAJARIACER','KALYANKJIL',
  'KANSAINER','KEC','KEI','KFINTECH','KIMS','KPITTECH','KPRMILL','KRBL','LALPATHLAB',
  'LATENTVIEW','LAURUSLABS','LICHSGFIN','LICI','LODHA','LTF','LTIM','LTTS','LUPIN',
  'MANAPPURAM','MANKIND','MARICO','MASTEK','MAXHEALTH','MAZAGON','METROBRAND','MFSL',
  'MGL','MOTILALOFS','MPHASIS','MRF','MUTHOOTFIN','NATCOPHARM','NATIONALUM','NAUKRI',
  'NAVINFLUOR','NBCC','NCC','NESCO','NH','NMDC','NUVAMA','NYKAA','OBEROIRLTY','OFSS',
  'OIL','OLECTRA','PATANJALI','PAYTM','PERSISTENT','PETRONET','PFC','PFIZER','PHOENIXLTD',
  'PIIND','POLICYBZR','POLYCAB','POONAWALLA','PRESTIGE','PRSMJOHNSN','PVRINOX','RADICO',
  'RAILTEL','RAINBOW','RAJESHEXPO','RAMCOCEM','RATNAMANI','RBLBANK','RELAXO','REDINGTON',
  'RITES','RVNL','SAIL','SAREGAMA','SCHAEFFLER','SCHNEIDER','SHREECEM','SHRIRAMFIN',
  'SIGNATURE','SJVN','SKFINDIA','SOBHA','SOLARINDS','SONACOMS','STARHEALTH','SUMICHEM',
  'SUNDARMFIN','SUNDRMFAST','SUNTV','SUPREMEIND','SUZLON','SWANENERGY','SYNGENE',
  'TANLA','TATACHEM','TATAELXSI','TATAPOWER','TATATECH','TEJASNET','THERMAX','THYROCARE',
  'TIINDIA','TIMKEN','TITAGARH','TORNTPOWER','TRENT','TRIDENT','TRITURBINE','TTML',
  'UCOBANK','UJJIVANSFB','UNOMINDA','UPL','VBL','VGUARD','VINATIORGA','VMART',
  'VTL','WABAG','WELCORP','WESTLIFE','WHIRLPOOL','YESBANK','ZEEL','ZENSARTECH','ZYDUSLIFE',
];

async function fetchStockData(symbol) {
  const suffixes = ['.NS', '.BO'];
  for (const suffix of suffixes) {
    try {
      const [quoteRes, summaryRes] = await Promise.allSettled([
        yahooFinance.quote(symbol + suffix, {}, { validateResult: false }),
        Promise.race([
          yahooFinance.quoteSummary(symbol + suffix, {
            modules: ['financialData', 'defaultKeyStatistics', 'summaryDetail'],
          }, { validateResult: false }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 4000)),
        ]),
      ]);

      const q = quoteRes.status === 'fulfilled' ? quoteRes.value : null;
      if (!q || !q.regularMarketPrice || q.regularMarketPrice < 1) continue;

      const fin = summaryRes.status === 'fulfilled' ? summaryRes.value?.financialData : null;
      const stats = summaryRes.status === 'fulfilled' ? summaryRes.value?.defaultKeyStatistics : null;
      const detail = summaryRes.status === 'fulfilled' ? summaryRes.value?.summaryDetail : null;

      return {
        symbol: symbol,
        name: q.longName || q.shortName || symbol,
        exchange: suffix === '.NS' ? 'NSE' : 'BSE',
        sector: q.sector || 'Unknown',
        ltp: q.regularMarketPrice || 0,
        changePct: q.regularMarketChangePercent || 0,
        marketCap: q.marketCap || 0,
        volume: q.regularMarketVolume || 0,
        weekHigh52: q.fiftyTwoWeekHigh || 0,
        weekLow52: q.fiftyTwoWeekLow || 0,
        pe: (detail && detail.trailingPE) || q.trailingPE || null,
        pb: (stats && stats.priceToBook) || null,
        roe: (fin && fin.returnOnEquity) ? fin.returnOnEquity * 100 : null,
        debt: (fin && fin.debtToEquity) ? fin.debtToEquity / 100 : null,
        revenueGrowth: (fin && fin.revenueGrowth) ? fin.revenueGrowth * 100 : null,
        epsGrowth: (fin && fin.earningsGrowth) ? fin.earningsGrowth * 100 : null,
        grossMargin: (fin && fin.grossMargins) ? fin.grossMargins * 100 : null,
        operatingMargin: (fin && fin.operatingMargins) ? fin.operatingMargins * 100 : null,
        currentRatio: (fin && fin.currentRatio) || null,
        eps: (stats && stats.trailingEps) || null,
        forwardEps: (stats && stats.forwardEps) || null,
        beta: (stats && stats.beta) || 1,
        div: (detail && detail.dividendYield) ? detail.dividendYield * 100 : null,
        targetPrice: (fin && fin.targetMeanPrice) || null,
        recommendation: (fin && fin.recommendationKey) || null,
        freeCashflow: (fin && fin.freeCashflow) || null,
        totalCash: (fin && fin.totalCash) || null,
        totalDebt: (fin && fin.totalDebt) || null,
        fetchedAt: new Date().toISOString(),
      };
    } catch (e) {
      continue;
    }
  }
  return null;
}

function scoreStock(s) {
  let score = 0;
  const reasons = [];
  const warnings = [];

  if (s.roe > 20) { score += 15; reasons.push('ROE ' + s.roe.toFixed(1) + '% - Buffett quality moat'); }
  else if (s.roe > 15) { score += 8; reasons.push('ROE ' + s.roe.toFixed(1) + '% - decent returns'); }
  else if (s.roe !== null && s.roe < 10) { score -= 5; warnings.push('Low ROE ' + s.roe.toFixed(1) + '%'); }

  if (s.pe && s.epsGrowth && s.epsGrowth > 0) {
    const peg = s.pe / s.epsGrowth;
    if (peg < 0.5) { score += 20; reasons.push('PEG ' + peg.toFixed(2) + ' - extreme undervaluation (Lynch loves this)'); }
    else if (peg < 1) { score += 12; reasons.push('PEG ' + peg.toFixed(2) + ' - undervalued growth (Lynch BUY zone)'); }
    else if (peg < 1.5) { score += 5; reasons.push('PEG ' + peg.toFixed(2) + ' - fairly valued growth'); }
    else if (peg > 3) { score -= 5; warnings.push('PEG ' + peg.toFixed(2) + ' - overvalued'); }
  }

  if (s.revenueGrowth > 25) { score += 15; reasons.push('Revenue growth ' + s.revenueGrowth.toFixed(1) + '% - explosive top-line'); }
  else if (s.revenueGrowth > 15) { score += 10; reasons.push('Revenue growth ' + s.revenueGrowth.toFixed(1) + '% - strong growth'); }
  else if (s.revenueGrowth > 8) { score += 5; reasons.push('Revenue growth ' + s.revenueGrowth.toFixed(1) + '% - steady growth'); }
  else if (s.revenueGrowth !== null && s.revenueGrowth < 0) { score -= 8; warnings.push('Revenue declining ' + s.revenueGrowth.toFixed(1) + '%'); }

  if (s.epsGrowth > 25) { score += 12; reasons.push('EPS growth ' + s.epsGrowth.toFixed(1) + '% - earnings rocket'); }
  else if (s.epsGrowth > 15) { score += 7; reasons.push('EPS growth ' + s.epsGrowth.toFixed(1) + '% - strong earnings'); }
  else if (s.epsGrowth !== null && s.epsGrowth < 0) { score -= 5; warnings.push('EPS declining'); }

  if (s.pe && s.pe < 15) { score += 10; reasons.push('P/E ' + s.pe.toFixed(1) + ' - deep value territory'); }
  else if (s.pe && s.pe < 25) { score += 5; reasons.push('P/E ' + s.pe.toFixed(1) + ' - reasonable valuation'); }
  else if (s.pe && s.pe > 60) { score -= 8; warnings.push('P/E ' + s.pe.toFixed(1) + ' - expensive'); }

  if (s.pb && s.pb < 1.5) { score += 8; reasons.push('P/B ' + s.pb.toFixed(2) + ' - trading near book value'); }
  else if (s.pb && s.pb < 3) { score += 3; }
  else if (s.pb && s.pb > 10) { score -= 3; warnings.push('High P/B ' + s.pb.toFixed(1)); }

  if (s.debt !== null && s.debt < 0.3) { score += 10; reasons.push('Debt/Equity ' + s.debt.toFixed(2) + ' - fortress balance sheet'); }
  else if (s.debt !== null && s.debt < 1) { score += 5; reasons.push('Debt/Equity ' + s.debt.toFixed(2) + ' - manageable debt'); }
  else if (s.debt !== null && s.debt > 2) { score -= 8; warnings.push('High debt D/E ' + s.debt.toFixed(2)); }

  if (s.currentRatio > 2) { score += 5; reasons.push('Current ratio ' + s.currentRatio.toFixed(2) + ' - strong liquidity'); }
  else if (s.currentRatio !== null && s.currentRatio < 1) { score -= 5; warnings.push('Low current ratio ' + s.currentRatio.toFixed(2)); }

  if (s.grossMargin > 50) { score += 10; reasons.push('Gross margin ' + s.grossMargin.toFixed(1) + '% - exceptional pricing power'); }
  else if (s.grossMargin > 35) { score += 6; reasons.push('Gross margin ' + s.grossMargin.toFixed(1) + '% - strong pricing power'); }
  else if (s.grossMargin > 20) { score += 3; }

  if (s.operatingMargin > 20) { score += 8; reasons.push('Op margin ' + s.operatingMargin.toFixed(1) + '% - best-in-class efficiency'); }
  else if (s.operatingMargin > 12) { score += 4; }
  else if (s.operatingMargin !== null && s.operatingMargin < 5) { score -= 4; warnings.push('Low operating margin'); }

  if (s.weekHigh52 && s.ltp) {
    const fromHigh = ((s.ltp - s.weekHigh52) / s.weekHigh52) * 100;
    if (fromHigh < -40) { score += 8; reasons.push(Math.abs(fromHigh).toFixed(0) + '% below 52W high - deep discount opportunity'); }
    else if (fromHigh < -20) { score += 4; reasons.push(Math.abs(fromHigh).toFixed(0) + '% below 52W high - correction opportunity'); }
    else if (fromHigh > -5) { score -= 2; }
  }

  if (s.recommendation === 'strong_buy') { score += 8; reasons.push('Analyst consensus: STRONG BUY'); }
  else if (s.recommendation === 'buy') { score += 4; reasons.push('Analyst consensus: BUY'); }
  else if (s.recommendation === 'sell' || s.recommendation === 'strong_sell') { score -= 6; warnings.push('Analyst consensus: SELL'); }

  if (s.targetPrice && s.ltp) {
    const upside = ((s.targetPrice - s.ltp) / s.ltp) * 100;
    if (upside > 40) { score += 10; reasons.push('Analyst target upside ' + upside.toFixed(0) + '% - massive potential'); }
    else if (upside > 20) { score += 5; reasons.push('Analyst target upside ' + upside.toFixed(0) + '%'); }
    else if (upside < 0) { score -= 5; warnings.push('Analyst target below CMP'); }
  }

  if (s.beta < 0.8) { score += 3; reasons.push('Low beta ' + s.beta.toFixed(2) + ' - stable stock'); }
  else if (s.beta > 2) { score -= 3; warnings.push('Very high beta ' + s.beta.toFixed(2)); }

  if (s.div > 4) { score += 5; reasons.push('Dividend yield ' + s.div.toFixed(1) + '% - income + growth'); }
  else if (s.div > 2) { score += 2; }

  if (s.marketCap > 0 && s.marketCap < 5e9) { score += 5; reasons.push('Smallcap - higher multibagger potential'); }
  else if (s.marketCap < 50e9) { score += 2; reasons.push('Midcap - growth + stability balance'); }

  score = Math.min(100, Math.max(0, score));

  const grade = score >= 80 ? 'A+' : score >= 70 ? 'A' : score >= 60 ? 'B+' : score >= 50 ? 'B' : score >= 40 ? 'C' : 'D';
  const verdict = score >= 75 ? 'STRONG BUY' : score >= 60 ? 'BUY' : score >= 45 ? 'HOLD' : score >= 30 ? 'WATCH' : 'AVOID';
  const verdictColor = score >= 75 ? '#00d084' : score >= 60 ? '#4a9eff' : score >= 45 ? '#f5a623' : '#ff4444';

  return { score: score, grade: grade, verdict: verdict, verdictColor: verdictColor, reasons: reasons, warnings: warnings };
}

async function getAIVerdictsForTop(stocks, groq) {
  if (!stocks.length) return {};
  const summaries = stocks.map(function(s) {
    return s.symbol + ' (' + s.name + ', ' + s.sector + '): CMP Rs ' + s.ltp + ', Score ' + s.score + '/100 Grade ' + s.grade + ', P/E ' + (s.pe ? s.pe.toFixed(1) : 'N/A') + ', ROE ' + (s.roe ? s.roe.toFixed(1) : 'N/A') + '%, RevGrowth ' + (s.revenueGrowth ? s.revenueGrowth.toFixed(1) : 'N/A') + '%, EPSGrowth ' + (s.epsGrowth ? s.epsGrowth.toFixed(1) : 'N/A') + '%, D/E ' + (s.debt ? s.debt.toFixed(2) : 'N/A') + ', Target Rs ' + (s.targetPrice || 'N/A') + ', Analyst ' + (s.recommendation || 'N/A');
  }).join('\n');

  const prompt = 'You are India\'s sharpest equity analyst, channeling the styles of Rakesh Jhunjhunwala, Vijay Kedia, Radhakishan Damani, and Warren Buffett. Today is ' + new Date().toLocaleDateString('en-IN') + '. Below are stocks that just passed a LIVE fundamental scan of the Indian market right now. Give each one a sharp, opinionated verdict grounded ONLY in the actual numbers given below - do not invent numbers not present.\n\n' + summaries + '\n\nReturn ONLY a JSON array, no markdown, no commentary outside JSON:\n[\n  {\n    "symbol": "SYMBOL",\n    "aiVerdict": "one of: RAKESH JHUNJHUNWALA PICK / VIJAY KEDIA TERRITORY / WARREN BUFFETT QUALITY / DEEP VALUE PLAY / GROWTH ROCKET / HIDDEN GEM / AVOID",\n    "oneLineSummary": "one sharp sentence grounded in the real numbers given above",\n    "entryPrice": number near CMP,\n    "targetPrice": number,\n    "stopLoss": number below CMP,\n    "timeHorizon": "6 months or 1-2 years or 3-5 years",\n    "riskLevel": "LOW or MEDIUM or HIGH",\n    "catalysts": ["specific catalyst 1", "specific catalyst 2"],\n    "risks": ["specific risk 1", "specific risk 2"]\n  }\n]';

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.4,
    max_tokens: 3500,
  });

  const rawText = completion.choices[0]?.message?.content || '[]';
  try {
    const clean = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const start = clean.indexOf('[');
    const end = clean.lastIndexOf(']');
    const arr = JSON.parse(clean.slice(start, end + 1));
    const map = {};
    arr.forEach(function(p) { map[p.symbol] = p; });
    return map;
  } catch (e) {
    return {};
  }
}

// LIVE full-market scan - no caching of results. Every call re-fetches every
// stock fresh from Yahoo Finance and re-runs AI on the top 20.
router.post('/scan', async (req, res) => {
  try {
    const stocks = ALL_INDIA_STOCKS.slice(0, 80);
    const results = [];
    const batchSize = 10;

    for (let i = 0; i < stocks.length; i += batchSize) {
      const batch = stocks.slice(i, i + batchSize);
      const batchResults = await Promise.allSettled(batch.map(fetchStockData));
      batchResults.forEach(function(r) {
        if (r.status === 'fulfilled' && r.value) {
          const stock = r.value;
          const scoring = scoreStock(stock);
          results.push(Object.assign({}, stock, scoring));
        }
      });
    }

    const sorted = results
      .filter(function(s) { return s.score >= 40; })
      .sort(function(a, b) { return b.score - a.score; });

    const top20 = sorted.slice(0, 20);

    let aiVerdicts = {};
    const apiKey = process.env.GROQ_API_KEY;
    if (apiKey && top20.length) {
      try {
        const groq = new Groq({ apiKey: apiKey });
        aiVerdicts = await getAIVerdictsForTop(top20, groq);
      } catch (aiErr) {
        console.error('AI verdict generation failed:', aiErr.message);
      }
    }

    const data = {
      total: results.length,
      topMultibaggers: top20,
      aiVerdicts: aiVerdicts,
      allResults: sorted.slice(0, 100),
      scanTime: new Date().toISOString(),
      live: true,
      categories: {
        strongBuy: results.filter(function(s) { return s.verdict === 'STRONG BUY'; }).length,
        buy: results.filter(function(s) { return s.verdict === 'BUY'; }).length,
        hold: results.filter(function(s) { return s.verdict === 'HOLD'; }).length,
        avoid: results.filter(function(s) { return s.verdict === 'AVOID'; }).length,
      },
    };

    res.json({ success: true, data: data });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.post('/ai-picks', async (req, res) => {
  try {
    const stocks = req.body.stocks;
    if (!stocks || !stocks.length) return res.status(400).json({ success: false, error: 'No stocks provided' });

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return res.status(500).json({ success: false, error: 'GROQ_API_KEY missing' });

    const groq = new Groq({ apiKey: apiKey });
    const picksMap = await getAIVerdictsForTop(stocks.slice(0, 20), groq);
    res.json({ success: true, data: Object.values(picksMap) });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.get('/symbols', (req, res) => {
  res.json({ success: true, data: ALL_INDIA_STOCKS, total: ALL_INDIA_STOCKS.length });
});

module.exports = router;