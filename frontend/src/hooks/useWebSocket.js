import { useEffect, useRef, useCallback } from 'react';
import { useStore } from '../store/useStore';

const WS_URL = import.meta.env.VITE_WS_URL || `ws://${window.location.host}/ws`;

export function useWebSocket() {
  const ws = useRef(null);
  const reconnectTimer = useRef(null);
  const { updateQuote, setWsConnected, watchlist, activeSymbol } = useStore();

  const connect = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) return;

    ws.current = new WebSocket(WS_URL);

    ws.current.onopen = () => {
      setWsConnected(true);
      const symbols = [...new Set([...watchlist, activeSymbol])];
      ws.current.send(JSON.stringify({ type: 'subscribe', symbols }));
    };

    ws.current.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'price_update' && msg.symbol && msg.data) {
          updateQuote(msg.symbol, msg.data);
        }
      } catch {}
    };

    ws.current.onclose = () => {
      setWsConnected(false);
      reconnectTimer.current = setTimeout(connect, 3000);
    };

    ws.current.onerror = () => {
      ws.current?.close();
    };
  }, [watchlist, activeSymbol]);

  const subscribe = useCallback((symbols) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: 'subscribe', symbols }));
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimer.current);
      ws.current?.close();
    };
  }, [connect]);

  return { subscribe };
}