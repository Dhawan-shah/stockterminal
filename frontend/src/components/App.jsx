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
import AIAnalysis from './screens/AIAnalysis';
import MarketScreener from './screens/MarketScreener';

const TABS = [
  { key: 'chart', label: 'CHART' },
  { key: 'overview', label: 'OVERVIEW' },
  { key: 'fundamentals', label: 'FUNDAMENTALS' },
  { key: 'market', label: 'MARKET' },
  { key: 'multibagger', label: '🔥 MULTIBAGGER' },
  { key: 'screener', label: '🛸 SCREENER' },
  { key: 'ai', label: '🤖 AI ANALYSIS' },
];

const NO_SIDEBAR_TABS = ['multibagger', 'screener', 'ai'];

export default function App() {
  const { activeSymbol, activeTab, setActiveTab, setSearchOpen, setActiveSymbol } = useStore();
  useWebSocket();

  useHotkeys('meta+k, ctrl+k', (e) => {
    e.preventDefault();
    setSearchOpen(true);
  });

  const handleSelectFromScreener = (symbol) => {
    setActiveSymbol(symbol);
    setActiveTab('multibagger');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0a0a0a', overflow: 'hidden' }}>
      <Header />

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {!NO_SIDEBAR_TABS.includes(activeTab) && (
          <div style={{ width: 200, flexShrink: 0, overflow: 'hidden' }}>
            <Watchlist />
          </div>
        )}

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid #1e1e1e', background: '#0d0d0d', flexShrink: 0, overflowX: 'auto' }}>
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  padding: '6px 16px',
                  fontSize: NO_SIDEBAR_TABS.includes(tab.key) ? 11 : 10,
                  fontFamily: 'JetBrains Mono',
                  letterSpacing: '0.05em',
                  background: 'none',
                  border: 'none',
                  borderBottom: activeTab === tab.key ? '2px solid #f5a623' : '2px solid transparent',
                  color: activeTab === tab.key ? '#f5a623' : '#555',
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  transition: 'all 0.15s',
                  fontWeight: NO_SIDEBAR_TABS.includes(tab.key) ? 700 : 400,
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                {tab.label}
              </button>
            ))}

            <div style={{ flex: 1 }} />

            <div style={{ marginRight: 12, display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <span style={{ fontSize: 10, color: '#444', fontFamily: 'JetBrains Mono' }}>VIEWING</span>
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: 11, fontWeight: 700, color: '#f5a623' }}>{activeSymbol}</span>
            </div>
          </div>

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

            {activeTab === 'screener' && (
              <div style={{ height: '100%', overflow: 'hidden' }}>
                <MarketScreener onSelectStock={handleSelectFromScreener} />
              </div>
            )}

            {activeTab === 'ai' && (
              <div style={{ height: '100%', overflow: 'hidden' }}>
                <AIAnalysis symbol={activeSymbol} />
              </div>
            )}

          </div>
        </div>
      </div>

      <div style={{ height: 20, background: '#080808', borderTop: '1px solid #1a1a1a', display: 'flex', alignItems: 'center', padding: '0 12px', gap: 20, flexShrink: 0 }}>
        <span style={{ fontSize: 9, fontFamily: 'JetBrains Mono', color: '#333' }}>NSE DATA • SCREENER.IN FUNDAMENTALS • TRADINGVIEW CHARTS</span>
        <span style={{ fontSize: 9, fontFamily: 'JetBrains Mono', color: '#333' }}>PRESS CTRL+K TO SEARCH</span>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 9, fontFamily: 'JetBrains Mono', color: '#2a2a2a' }}>STOCKTERMINAL v3.0</span>
      </div>
    </div>
  );
}