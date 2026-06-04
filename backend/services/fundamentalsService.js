const axios = require('axios');
const cheerio = require('cheerio');
const NodeCache = require('node-cache');

const cache = new NodeCache({ stdTTL: 3600 });

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
  'Referer': 'https://www.screener.in/',
};

async function getFundamentals(symbol) {
  const cacheKey = `fund_${symbol}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  try {
    const url = `https://www.screener.in/company/${symbol}/`;
    const { data: html } = await axios.get(url, { headers: HEADERS, timeout: 15000 });
    const $ = cheerio.load(html);

    const ratios = {};

    // Parse top ratios
    $('#top-ratios li').each((_, el) => {
      const name = $(el).find('.name').text().trim();
      const val = $(el).find('.value').text().trim().replace(/[,\s]+/g, '');
      if (name && val) ratios[name] = val;
    });

    // Parse quarterly results
    const quarterlyData = [];
    const qTable = $('section#quarters table');
    const qHeaders = [];
    qTable.find('thead th').each((_, th) => qHeaders.push($(th).text().trim()));
    qTable.find('tbody tr').each((_, tr) => {
      const row = {};
      const label = $(tr).find('td:first-child').text().trim();
      $(tr).find('td').each((i, td) => {
        if (i > 0 && qHeaders[i]) row[qHeaders[i]] = $(td).text().trim();
      });
      if (label) quarterlyData.push({ label, ...row });
    });

    // Parse annual P&L
    const annualData = [];
    const aTable = $('section#profit-loss table');
    const aHeaders = [];
    aTable.find('thead th').each((_, th) => aHeaders.push($(th).text().trim()));
    aTable.find('tbody tr').each((_, tr) => {
      const label = $(tr).find('td:first-child').text().trim();
      const row = {};
      $(tr).find('td').each((i, td) => {
        if (i > 0 && aHeaders[i]) row[aHeaders[i]] = $(td).text().trim();
      });
      if (label) annualData.push({ label, ...row });
    });

    // Balance sheet
    const balanceSheet = [];
    const bTable = $('section#balance-sheet table');
    const bHeaders = [];
    bTable.find('thead th').each((_, th) => bHeaders.push($(th).text().trim()));
    bTable.find('tbody tr').each((_, tr) => {
      const label = $(tr).find('td:first-child').text().trim();
      const row = {};
      $(tr).find('td').each((i, td) => {
        if (i > 0 && bHeaders[i]) row[bHeaders[i]] = $(td).text().trim();
      });
      if (label) balanceSheet.push({ label, ...row });
    });

    // Shareholding
    const shareholding = [];
    $('section#shareholding table tbody tr').each((_, tr) => {
      const label = $(tr).find('td:first-child').text().trim();
      const vals = [];
      $(tr).find('td').each((i, td) => { if (i > 0) vals.push($(td).text().trim()); });
      if (label) shareholding.push({ category: label, values: vals });
    });

    const about = $('div.company-profile p').first().text().trim();

    const result = {
      symbol,
      ratios,
      about,
      quarterly: { headers: qHeaders, data: quarterlyData },
      annual: { headers: aHeaders, data: annualData },
      balanceSheet: { headers: bHeaders, data: balanceSheet },
      shareholding,
      screenerUrl: url,
      fetchedAt: new Date().toISOString(),
    };

    cache.set(cacheKey, result, 3600);
    return result;
  } catch (e) {
    throw new Error(`Fundamentals fetch failed for ${symbol}: ${e.message}`);
  }
}

async function getPeers(symbol) {
  const cacheKey = `peers_${symbol}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  try {
    const url = `https://www.screener.in/company/${symbol}/peers/`;
    const { data: html } = await axios.get(url, { headers: HEADERS, timeout: 15000 });
    const $ = cheerio.load(html);

    const peers = [];
    const headers = [];
    $('table.data-table thead th').each((_, th) => headers.push($(th).text().trim()));

    $('table.data-table tbody tr').each((_, tr) => {
      const row = {};
      $(tr).find('td').each((i, td) => {
        if (headers[i]) row[headers[i]] = $(td).text().trim();
      });
      if (Object.keys(row).length) peers.push(row);
    });

    cache.set(cacheKey, { headers, peers }, 3600);
    return { headers, peers };
  } catch (e) {
    return { headers: [], peers: [] };
  }
}

module.exports = { getFundamentals, getPeers };