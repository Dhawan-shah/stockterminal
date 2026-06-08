require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const stockRoutes = require('./routes/stocks');
const searchRoutes = require('./routes/search');
const fundamentalsRoutes = require('./routes/fundamentals');
const marketRoutes = require('./routes/market');
const indicesRoutes = require('./routes/indices');
const deepRoutes = require('./routes/deep');

const { startPriceBroadcaster } = require('./services/priceBroadcaster');

const app = express();
const server = http.createServer(app);

const wss = new WebSocket.Server({ server, path: '/ws' });
const subscriptions = new Map();

wss.on('connection', (ws) => {
  ws.subscribedSymbols = new Set();
  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data);
      if (msg.type === 'subscribe' && msg.symbols) {
        msg.symbols.forEach((sym) => {
          ws.subscribedSymbols.add(sym);
          if (!subscriptions.has(sym)) subscriptions.set(sym, new Set());
          subscriptions.get(sym).add(ws);
        });
        ws.send(JSON.stringify({ type: 'subscribed', symbols: msg.symbols }));
      }
      if (msg.type === 'unsubscribe' && msg.symbols) {
        msg.symbols.forEach((sym) => {
          ws.subscribedSymbols.delete(sym);
          if (subscriptions.has(sym)) subscriptions.get(sym).delete(ws);
        });
      }
    } catch (e) {}
  });
  ws.on('close', () => {
    ws.subscribedSymbols.forEach((sym) => {
      if (subscriptions.has(sym)) subscriptions.get(sym).delete(ws);
    });
  });
  ws.send(JSON.stringify({ type: 'connected', message: 'StockTerminal WS ready' }));
});

const broadcast = (symbol, data) => {
  if (!subscriptions.has(symbol)) return;
  const msg = JSON.stringify({ type: 'price_update', symbol, data });
  subscriptions.get(symbol).forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) ws.send(msg);
  });
};

startPriceBroadcaster(broadcast);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization'] }));
app.use(express.json());
app.use(rateLimit({ windowMs: 60 * 1000, max: 300 }));

app.use('/api/stocks', stockRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/fundamentals', fundamentalsRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/indices', indicesRoutes);
app.use('/api/deep', deepRoutes);

app.get('/health', (req, res) =>
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date() })
);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 StockTerminal TITAN MODE running on port ${PORT}`));