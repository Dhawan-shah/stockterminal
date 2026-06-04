import { useEffect } from 'react';
import { useStore } from '../store/useStore';
import { useWebSocket } from '../hooks/useWebSocket';
import { useHotkeys } from 'react-hotkeys-hook';
import Header from './layout/Header';
import Watchlist from './layout/Watchlist';
import LiveChart from './charts/LiveChart';
import StockOverview from './screens/StockOverview';
import Fundamentals from './screens/Fundamentals';
import MarketOverview from './screens/MarketOverview';

const TABS = [
  { key: 'chart', label: 'CHART' },
  { key: 'overview', label: 'OVERVIEW' },
  { key: 'fundamentals', label: 'FUNDAMENTALS' },
  { key: 'market', label: 'MARKET' },
];

export default function App() {
  const { activeSymbol, activeTab, setActiveTab, setSearchOpen } = useStore();
  useWebSocket();

  useHotkeys('meta+k, ctrl+k', (e) => {
    e.preventDefault();
    setSearchOpen(true);
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0a0a0a', overflow: 'hidden' }}>
      <Header />

      {/* Main layout: sidebar + content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Watchlist sidebar */}
        <div style={{ width: 200, flexShrink: 0, overflow: 'hidden' }}>
          <Watchlist />
        </div>

        {/* Main content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Tab bar */}
          <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid #1e1e1e', background: '#0d0d0d', flexShrink: 0 }}>
            {TABS.map((tab) => (
              <button
                key={tab.key}
                className="tab-btn"
                onClick={() => setActiveTab(tab.key)}
                style={{
                  color: activeTab === tab.key ? '#f5a623' : '#555',
                  borderBottom: `2px solid ${activeTab === tab.key ? '#f5a623' : 'transparent'}`,
                  padding: '6px 16px',
                }}
              >
                {tab.label}
              </button>
            ))}

            <div style={{ flex: 1 }} />

            {/* Active symbol badge */}
            <div style={{ marginRight: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 10, color: '#444', fontFamily: 'JetBrains Mono' }}>VIEWING</span>
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: 11, fontWeight: 700, color: '#f5a623' }}>{activeSymbol}</span>
            </div>
          </div>

          {/* Panel content */}
          <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
            {activeTab === 'chart' && (
              <div style={{ height: '100%', display: 'flex' }}>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <LiveChart symbol={activeSymbol} />
                </div>
                <div style={{ width: 220, borderLeft: '1px solid #1e1e1e', overflowY: 'auto' }}>
                  <StockOverview symbol={activeSymbol} />
                </div>
              </div>
            )}

            {activeTab === 'overview' && (
              <div style={{ height: '100%', display: 'grid', gridTemplateColumns: '260px 1fr', overflow: 'hidden' }}>
                <div style={{ borderRight: '1px solid #1e1e1e', overflowY: 'auto' }}>
                  <StockOverview symbol={activeSymbol} />
                </div>
                <div style={{ overflow: 'hidden' }}>
                  <LiveChart symbol={activeSymbol} />
                </div>
              </div>
            )}

            {activeTab === 'fundamentals' && (
              <div style={{ height: '100%', overflow: 'hidden' }}>
                <Fundamentals symbol={activeSymbol} />
              </div>
            )}

            {activeTab === 'market' && (
              <div style={{ height: '100%', overflow: 'hidden' }}>
                <MarketOverview />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom status bar */}
      <div style={{ height: 20, background: '#080808', borderTop: '1px solid #1a1a1a', display: 'flex', alignItems: 'center', padding: '0 12px', gap: 20, flexShrink: 0 }}>
        <span style={{ fontSize: 9, fontFamily: 'JetBrains Mono', color: '#333' }}>NSE DATA • SCREENER.IN FUNDAMENTALS • TRADINGVIEW CHARTS</span>
        <span style={{ fontSize: 9, fontFamily: 'JetBrains Mono', color: '#333' }}>PRESS ⌘K TO SEARCH</span>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 9, fontFamily: 'JetBrains Mono', color: '#2a2a2a' }}>STOCKTERMINAL v1.0</span>
      </div>
    </div>
  );
}