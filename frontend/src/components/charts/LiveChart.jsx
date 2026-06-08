import { useEffect, useRef, useState } from 'react';
import { createChart, CrosshairMode, LineStyle } from 'lightweight-charts';
import { useStore } from '../../store/useStore';
import { fetchHistory } from '../../utils/api';

const INTERVALS = [
  { label: '5M', days: 1, resolution: '5min' },
  { label: '15M', days: 3, resolution: '15min' },
  { label: '1H', days: 7, resolution: '1h' },
  { label: '4H', days: 30, resolution: '4h' },
  { label: '1D', days: 1, resolution: 'day' },
  { label: '1W', days: 7, resolution: 'day' },
  { label: '1M', days: 30, resolution: 'day' },
  { label: '3M', days: 90, resolution: 'day' },
  { label: '6M', days: 180, resolution: 'day' },
  { label: '1Y', days: 365, resolution: 'day' },
  { label: '3Y', days: 1095, resolution: 'day' },
  { label: '5Y', days: 1825, resolution: 'day' },
  { label: 'MAX', days: 7300, resolution: 'day' },
];

export default function LiveChart({ symbol }) {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const candleSeries = useRef(null);
  const volumeSeries = useRef(null);
  const [activeInterval, setActiveInterval] = useState('1Y');
  const [loading, setLoading] = useState(false);
  const [crosshairData, setCrosshairData] = useState(null);
  const [error, setError] = useState(null);
  const quotes = useStore((s) => s.quotes);

  useEffect(() => {
    if (!chartRef.current) return;

    const chart = createChart(chartRef.current, {
      layout: {
        background: { color: '#111111' },
        textColor: '#6b6b6b',
        fontSize: 11,
        fontFamily: "'JetBrains Mono', monospace",
      },
      grid: {
        vertLines: { color: '#1a1a1a' },
        horzLines: { color: '#1a1a1a' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: '#444', style: LineStyle.Dashed, width: 1 },
        horzLine: { color: '#444', style: LineStyle.Dashed, width: 1 },
      },
      rightPriceScale: { borderColor: '#222', textColor: '#6b6b6b' },
      timeScale: {
        borderColor: '#222',
        timeVisible: true,
        secondsVisible: false,
        barSpacing: 6,
      },
      handleScroll: { mouseWheel: true, pressedMouseMove: true },
      handleScale: { mouseWheel: true, pinch: true },
      width: chartRef.current.clientWidth,
      height: chartRef.current.clientHeight,
    });

    chartInstance.current = chart;

    const cs = chart.addCandlestickSeries({
      upColor: '#00d084',
      downColor: '#ff4444',
      borderUpColor: '#00d084',
      borderDownColor: '#ff4444',
      wickUpColor: '#00d084',
      wickDownColor: '#ff4444',
    });
    candleSeries.current = cs;

    const vs = chart.addHistogramSeries({
      color: '#26a69a',
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
      scaleMargins: { top: 0.8, bottom: 0 },
    });
    volumeSeries.current = vs;

    chart.subscribeCrosshairMove((param) => {
      if (param.time && candleSeries.current) {
        const data = param.seriesData?.get(cs);
        if (data) setCrosshairData(data);
      }
    });

    const ro = new ResizeObserver(() => {
      if (chartRef.current) {
        chart.applyOptions({
          width: chartRef.current.clientWidth,
          height: chartRef.current.clientHeight,
        });
      }
    });
    ro.observe(chartRef.current);

    return () => { ro.disconnect(); chart.remove(); };
  }, []);

  useEffect(() => {
    if (!candleSeries.current || !symbol) return;
    loadCandles();
  }, [symbol, activeInterval]);

  async function loadCandles() {
    setLoading(true);
    setError(null);
    try {
      const iv = INTERVALS.find((i) => i.label === activeInterval) || INTERVALS[9];
      const to = new Date().toISOString().split('T')[0];
      const from = new Date(Date.now() - iv.days * 86400000).toISOString().split('T')[0];

      const candles = await fetchHistory(symbol, from, to);
      if (!candles?.length) {
        setError('No chart data available');
        return;
      }

      const sorted = candles.sort((a, b) => new Date(a.time) - new Date(b.time));

      candleSeries.current.setData(
        sorted.map((c) => ({
          time: c.time,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        }))
      );

      volumeSeries.current.setData(
        sorted.map((c) => ({
          time: c.time,
          value: c.volume,
          color: c.close >= c.open ? 'rgba(0,208,132,0.3)' : 'rgba(255,68,68,0.3)',
        }))
      );

      chartInstance.current.timeScale().fitContent();
    } catch (e) {
      setError('Failed to load chart data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const q = quotes[symbol];
    if (!q || !candleSeries.current) return;
    const today = new Date().toISOString().split('T')[0];
    try {
      candleSeries.current.update({
        time: today,
        open: q.open,
        high: q.high,
        low: q.low,
        close: q.ltp,
      });
    } catch {}
  }, [quotes[symbol]?.ltp]);

  const q = quotes[symbol];
  const isUp = q ? q.changePct >= 0 : true;

  const intraday = ['5M', '15M', '1H', '4H'];
  const daily = ['1D', '1W', '1M', '3M', '6M', '1Y', '3Y', '5Y', 'MAX'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#111' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderBottom: '1px solid #222', flexShrink: 0, flexWrap: 'wrap' }}>

        {/* Price display */}
        {crosshairData ? (
          <div style={{ display: 'flex', gap: 12, fontFamily: 'JetBrains Mono', fontSize: 11 }}>
            <span style={{ color: '#6b6b6b' }}>O <span style={{ color: '#e8e8e8' }}>{crosshairData.open?.toFixed(2)}</span></span>
            <span style={{ color: '#6b6b6b' }}>H <span style={{ color: '#00d084' }}>{crosshairData.high?.toFixed(2)}</span></span>
            <span style={{ color: '#6b6b6b' }}>L <span style={{ color: '#ff4444' }}>{crosshairData.low?.toFixed(2)}</span></span>
            <span style={{ color: '#6b6b6b' }}>C <span style={{ color: '#e8e8e8' }}>{crosshairData.close?.toFixed(2)}</span></span>
          </div>
        ) : (
          <div style={{ fontFamily: 'JetBrains Mono', fontSize: 13, fontWeight: 600 }}>
            <span style={{ color: isUp ? '#00d084' : '#ff4444' }}>{q ? q.ltp?.toFixed(2) : '—'}</span>
            {q && <span style={{ fontSize: 11, marginLeft: 8, color: isUp ? '#00d084' : '#ff4444' }}>{isUp ? '▲' : '▼'} {Math.abs(q.changePct)?.toFixed(2)}%</span>}
          </div>
        )}

        <div style={{ flex: 1 }} />

        {loading && <span style={{ fontSize: 10, color: '#f5a623', fontFamily: 'monospace' }}>LOADING...</span>}
        {error && <span style={{ fontSize: 10, color: '#ff4444', fontFamily: 'monospace' }}>{error}</span>}

        {/* Intraday group */}
        <div style={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <span style={{ fontSize: 8, color: '#333', fontFamily: 'JetBrains Mono', marginRight: 4 }}>INTRA</span>
          {intraday.map((iv) => (
            <button key={iv} onClick={() => setActiveInterval(iv)}
              style={{ padding: '2px 7px', fontSize: 10, fontFamily: 'JetBrains Mono', background: activeInterval === iv ? '#4a9eff' : 'transparent', color: activeInterval === iv ? '#000' : '#6b6b6b', border: 'none', borderRadius: 3, cursor: 'pointer', fontWeight: 600 }}>
              {iv}
            </button>
          ))}
        </div>

        <div style={{ width: 1, height: 16, background: '#2a2a2a' }} />

        {/* Daily group */}
        <div style={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <span style={{ fontSize: 8, color: '#333', fontFamily: 'JetBrains Mono', marginRight: 4 }}>DAILY</span>
          {daily.map((iv) => (
            <button key={iv} onClick={() => setActiveInterval(iv)}
              style={{ padding: '2px 7px', fontSize: 10, fontFamily: 'JetBrains Mono', background: activeInterval === iv ? '#f5a623' : 'transparent', color: activeInterval === iv ? '#000' : '#6b6b6b', border: 'none', borderRadius: 3, cursor: 'pointer', fontWeight: 600 }}>
              {iv}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div ref={chartRef} style={{ flex: 1, width: '100%' }} />
    </div>
  );
}