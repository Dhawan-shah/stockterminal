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
  { key: 'chart',       label: 'CHART',        icon: '📈' },
  { key: 'overview',    label: 'OVERVIEW',     icon: '🔍' },
  { key: 'fundamentals',label: 'FUNDAMENTALS', icon: '📋' },
  { key: 'market',      label: 'MARKET',       icon: '🌐' },
  { key: 'multibagger', label: 'MULTIBAGGER',  icon: '🔥', accent: true },
  { key: 'screener',    label: 'SCREENER',     icon: '🛸', accent: true },
  { key: 'ai',          label: 'AI ANALYSIS',  icon: '🤖', accent: true },
];

const WIDE_TABS = ['multibagger', 'screener', 'ai'];

export default function App() {
  const { activeSymbol, activeTab, setActiveTab, setSearchOpen, setActiveSymbol, quotes } = useStore();
  useWebSocket();

  useHotkeys('meta+k, ctrl+k', (e) => { e.preventDefault(); setSearchOpen(true); });

  const q = quotes[activeSymbol];
  const isUp = q ? q.changePct >= 0 : true;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#050508', overflow: 'hidden' }}>
      <Header />

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Sidebar */}
        {!WIDE_TABS.includes(activeTab) && (
          <div style={{ width: 195, flexShrink: 0, overflow: 'hidden', borderRight: '1px solid #0e0e18' }}>
            <Watchlist />
          </div>
        )}

        {/* Main */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

          {/* Tab bar */}
          <div style={{ display: 'flex', alignItems: 'center', background: '#07070e', borderBottom: '1px solid #0e0e18', flexShrink: 0, overflowX: 'auto', scrollbarWidth: 'none' }}>

            <div style={{ display: 'flex', alignItems: 'stretch', gap: 0 }}>
              {TABS.map((tab) => {
                const active = activeTab === tab.key;
                return (
                  <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      padding: '0 18px', height: 40,
                      background: active ? '#0d0d18' : 'transparent',
                      border: 'none',
                      borderBottom: active ? '2px solid ' + (tab.accent ? '#f5a623' : '#5b6af0') : '2px solid transparent',
                      borderRight: '1px solid #0e0e18',
                      color: active ? (tab.accent ? '#f5a623' : '#818cf8') : '#3a3a5c',
                      cursor: 'pointer',
                      fontFamily: 'JetBrains Mono',
                      fontSize: 10,
                      fontWeight: active ? 700 : 400,
                      letterSpacing: '0.08em',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { if (!active) { e.currentTarget.style.color = '#6366f1'; e.currentTarget.style.background = '#09091a'; }}}
                    onMouseLeave={e => { if (!active) { e.currentTarget.style.color = '#3a3a5c'; e.currentTarget.style.background = 'transparent'; }}}>
                    <span style={{ fontSize: 12 }}>{tab.icon}</span>
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            <div style={{ flex: 1 }} />

            {/* Active symbol chip */}
            {q && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginRight: 14, padding: '4px 12px', background: '#0d0d18', borderRadius: 5, border: '1px solid #1a1a2e', flexShrink: 0 }}>
                <span style={{ fontFamily: 'JetBrains Mono', fontSize: 11, fontWeight: 700, color: '#f5a623' }}>{activeSymbol}</span>
                <span style={{ fontSize: 12, fontWeight: 600, fontFamily: 'JetBrains Mono', color: '#e2e2e2' }}>₹{q.ltp?.toFixed(2)}</span>
                <span style={{ fontSize: 10, fontFamily: 'JetBrains Mono', color: isUp ? '#22d3a5' : '#f43f5e', fontWeight: 600 }}>
                  {isUp ? '▲' : '▼'} {Math.abs(q.changePct || 0).toFixed(2)}%
                </span>
              </div>
            )}
          </div>

          {/* Panel */}
          <div style={{ flex: 1, overflow: 'hidden', position: 'relative', background: '#050508' }} className="fade-in">

            {activeTab === 'chart' && (
              <div style={{ height: '100%', display: 'flex' }}>
                <div style={{ flex: 1, overflow: 'hidden' }}><LiveChart symbol={activeSymbol} /></div>
                <div style={{ width: 215, borderLeft: '1px solid #0e0e18', overflowY: 'auto', background: '#07070e' }}>
                  <StockOverview symbol={activeSymbol} />
                </div>
              </div>
            )}

            {activeTab === 'overview' && (
              <div style={{ height: '100%', display: 'grid', gridTemplateColumns: '255px 1fr', overflow: 'hidden' }}>
                <div style={{ borderRight: '1px solid #0e0e18', overflowY: 'auto', background: '#07070e' }}>
                  <StockOverview symbol={activeSymbol} />
                </div>
                <div style={{ overflow: 'hidden' }}><LiveChart symbol={activeSymbol} /></div>
              </div>
            )}

            {activeTab === 'fundamentals' && (
              <div style={{ height: '100%', overflow: 'hidden' }}><Fundamentals symbol={activeSymbol} /></div>
            )}

            {activeTab === 'market' && (
              <div style={{ height: '100%', overflow: 'hidden' }}><MarketOverview /></div>
            )}

            {activeTab === 'multibagger' && (
              <div style={{ height: '100%', overflow: 'hidden' }}><MultibaggerEngine symbol={activeSymbol} /></div>
            )}

            {activeTab === 'screener' && (
              <div style={{ height: '100%', overflow: 'hidden' }}>
                <MarketScreener onSelectStock={(sym) => { setActiveSymbol(sym); setActiveTab('multibagger'); }} />
              </div>
            )}

            {activeTab === 'ai' && (
              <div style={{ height: '100%', overflow: 'hidden' }}><AIAnalysis symbol={activeSymbol} /></div>
            )}

          </div>
        </div>
      </div>

      {/* Status bar */}
      <div style={{ height: 22, background: '#030307', borderTop: '1px solid #0e0e18', display: 'flex', alignItems: 'center', padding: '0 14px', gap: 20, flexShrink: 0 }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22d3a5', animation: 'pulse 2s infinite' }} />
        <span style={{ fontSize: 9, fontFamily: 'JetBrains Mono', color: '#2a2a4a', letterSpacing: 1 }}>LIVE NSE/BSE</span>
        <span style={{ fontSize: 9, fontFamily: 'JetBrains Mono', color: '#1e1e3a' }}>YAHOO FINANCE</span>
        <span style={{ fontSize: 9, fontFamily: 'JetBrains Mono', color: '#1e1e3a' }}>GROQ AI</span>
        <span style={{ fontSize: 9, fontFamily: 'JetBrains Mono', color: '#1e1e3a' }}>SCREENER.IN</span>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 9, fontFamily: 'JetBrains Mono', color: '#1a1a30' }}>CTRL+K SEARCH</span>
        <span style={{ fontSize: 9, fontFamily: 'JetBrains Mono', color: '#141428' }}>STOCKTERMINAL v3.0</span>
      </div>
    </div>
  );
}