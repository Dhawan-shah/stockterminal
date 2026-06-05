import { useStore } from '../store/useStore';
import { useWebSocket } from '../hooks/useWebSocket';
import { useHotkeys } from 'react-hotkeys-hook';
import Header from './layout/Header';
import Watchlist from './layout/Watchlist';
import LiveChart from './charts/LiveChart';
import StockOverview from './screens/StockOverview';
import Fundamentals from './screens/Fundamentals';
import MarketOverview from './screens/MarketOverview';
import MultibaggerEngine from './screens/MultibaggerEngine';

const TABS = [
  { key: 'chart', label: 'CHART' },
  { key: 'overview', label: 'OVERVIEW' },
  { key: 'fundamentals', label: 'FUNDAMENTALS' },
  { key: 'market', label: 'MARKET' },
  { key: 'multibagger', label: '🔥 MULTIBAGGER' },
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

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Watchlist sidebar — hide on multibagger tab */}
        {activeTab !== 'multibagger' && (
          <div style={{ width: 200, flexShrink: 0, overflow: 'hidden' }}>
            <Watchlist />
          </div>
        )}

        {/* Main content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Tab bar */}
          <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid #1e1e1e', background: '#0d0d0d', flexShrink: 0 }}>
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  padding: '6px 16px',
                  fontSize: tab.key === 'multibagger' ? 11 : 10,
                  fontFamily: 'JetBrains Mono',
                  letterSpacing: '0.05em',
                  background: 'none',
                  border: 'none',
                  borderBottom: activeTab === tab.key ? '2px solid #f5a623' : '2px solid transparent',
                  color: activeTab === tab.key ? '#f5a623' : '#555',
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  transition: 'all 0.15s',
                  fontWeight: tab.key === 'multibagger' ? 700 : 400,
                }}
              >
                {tab.label}
              </button>
            ))}

            <div style={{ flex: 1 }} />

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

            {activeTab === 'multibagger' && (
              <div style={{ height: '100%', overflow: 'hidden' }}>
                <MultibaggerEngine symbol={activeSymbol} />
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Bottom status bar */}
      <div style={{ height: 20, background: '#080808', borderTop: '1px solid #1a1a1a', display: 'flex', alignItems: 'center', padding: '0 12px', gap: 20, flexShrink: 0 }}>
        <span style={{ fontSize: 9, fontFamily: 'JetBrains Mono', color: '#333' }}>NSE DATA • SCREENER.IN FUNDAMENTALS • TRADINGVIEW CHARTS</span>
        <span style={{ fontSize: 9, fontFamily: 'JetBrains Mono', color: '#333' }}>PRESS CTRL+K TO SEARCH</span>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 9, fontFamily: 'JetBrains Mono', color: '#2a2a2a' }}>STOCKTERMINAL v2.0</span>
      </div>
    </div>
  );
}