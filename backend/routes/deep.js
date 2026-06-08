const express = require('express');
const router = express.Router();
const YahooFinance = require('yahoo-finance2');
const yahooFinance = new YahooFinance.default();
const NodeCache = require('node-cache');

const cache = new NodeCache({ stdTTL: 1800 }); // 30 min cache

const MODULES_FULL = [
  'financialData',
  'defaultKeyStatistics',
  'summaryDetail',
  'summaryProfile',
  'incomeStatementHistory',
  'balanceSheetHistory',
  'cashflowStatementHistory',
  'earningsHistory',
  'insiderHolders',
  'insiderTransactions',
  'institutionOwnership',
  'majorHoldersBreakdown',
  'upgradeDowngradeHistory',
  'recommendationTrend',
  'earningsTrend',
  'industryTrend',
  'indexTrend',
  'sectorTrend',
];

// Fetch deep insider + institutional data
router.get('/insider/:symbol', async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const cacheKey = 'insider_' + symbol;
    const cached = cache.get(cacheKey);
    if (cached) return res.json({ success: true, data: cached });

    const suffixes = ['.NS', '.BO'];
    let data = null;

    for (const suffix of suffixes) {
      try {
        const result = await yahooFinance.quoteSummary(symbol + suffix, {
          modules: [
            'insiderHolders',
            'insiderTransactions',
            'institutionOwnership',
            'majorHoldersBreakdown',
            'upgradeDowngradeHistory',
            'recommendationTrend',
          ]
        }, { validateResult: false });
        if (result) { data = result; break; }
      } catch { continue; }
    }

    if (!data) return res.json({ success: true, data: null });

    const result = {
      insiderHolders: data.insiderHolders?.holders || [],
      insiderTransactions: data.insiderTransactions?.transactions || [],
      institutionOwnership: data.institutionOwnership?.ownershipList || [],
      majorHolders: data.majorHoldersBreakdown || {},
      upgradeDowngrade: data.upgradeDowngradeHistory?.history || [],
      recommendationTrend: data.recommendationTrend?.trend || [],
    };

    cache.set(cacheKey, result, 1800);
    res.json({ success: true, data: result });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Fetch financials - income, balance, cashflow
router.get('/financials/:symbol', async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const cacheKey = 'financials_' + symbol;
    const cached = cache.get(cacheKey);
    if (cached) return res.json({ success: true, data: cached });

    const suffixes = ['.NS', '.BO'];
    let data = null;

    for (const suffix of suffixes) {
      try {
        const result = await yahooFinance.quoteSummary(symbol + suffix, {
          modules: [
            'incomeStatementHistory',
            'balanceSheetHistory',
            'cashflowStatementHistory',
            'earningsHistory',
            'earningsTrend',
            'financialData',
            'defaultKeyStatistics',
          ]
        }, { validateResult: false });
        if (result) { data = result; break; }
      } catch { continue; }
    }

    if (!data) return res.json({ success: true, data: null });

    const result = {
      incomeStatements: data.incomeStatementHistory?.incomeStatementHistory || [],
      balanceSheets: data.balanceSheetHistory?.balanceSheetStatements || [],
      cashflows: data.cashflowStatementHistory?.cashflowStatements || [],
      earningsHistory: data.earningsHistory?.history || [],
      earningsTrend: data.earningsTrend?.trend || [],
      financialData: data.financialData || {},
      keyStats: data.defaultKeyStatistics || {},
    };

    cache.set(cacheKey, result, 1800);
    res.json({ success: true, data: result });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Fetch company profile + ESG
router.get('/profile/:symbol', async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const cacheKey = 'profile_' + symbol;
    const cached = cache.get(cacheKey);
    if (cached) return res.json({ success: true, data: cached });

    const suffixes = ['.NS', '.BO'];
    let data = null;

    for (const suffix of suffixes) {
      try {
        const result = await yahooFinance.quoteSummary(symbol + suffix, {
          modules: ['summaryProfile', 'assetProfile']
        }, { validateResult: false });
        if (result) { data = result; break; }
      } catch { continue; }
    }

    if (!data) return res.json({ success: true, data: null });

    const profile = data.summaryProfile || data.assetProfile || {};
    const result = {
      description: profile.longBusinessSummary || '',
      sector: profile.sector || '',
      industry: profile.industry || '',
      website: profile.website || '',
      employees: profile.fullTimeEmployees || null,
      country: profile.country || 'India',
      city: profile.city || '',
      officers: profile.companyOfficers || [],
    };

    cache.set(cacheKey, result, 3600);
    res.json({ success: true, data: result });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;