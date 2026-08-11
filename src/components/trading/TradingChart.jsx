import { useState, useEffect, useRef, useMemo } from "react";
import { createChart } from "lightweight-charts";
import { Activity } from "lucide-react";
import { getOHLCData, getBinanceOHLC } from "../../services/ExchangeApi";

function calculateEMA(data, period) {
  const k = 2 / (period + 1);
  let ema = data[0]?.value ?? data[0]?.close ?? 0;
  const result = [{ time: data[0].time, value: ema }];
  for (let i = 1; i < data.length; i++) {
    const val = data[i].value ?? data[i].close ?? ema;
    ema = val * k + ema * (1 - k);
    result.push({ time: data[i].time, value: +ema.toFixed(8) });
  }
  return result;
}

function calculateSMA(data, period) {
  const result = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) { result.push({ time: data[i].time, value: data[i].close }); continue; }
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += data[j].close;
    result.push({ time: data[i].time, value: +(sum / period).toFixed(8) });
  }
  return result;
}

function calculateBollinger(data, period = 20, multiplier = 2) {
  const sma = calculateSMA(data, period);
  const upper = [];
  const lower = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      upper.push({ time: data[i].time, value: data[i].close });
      lower.push({ time: data[i].time, value: data[i].close });
      continue;
    }
    let sumSq = 0;
    for (let j = i - period + 1; j <= i; j++) sumSq += Math.pow(data[j].close - sma[i].value, 2);
    const std = Math.sqrt(sumSq / period);
    upper.push({ time: data[i].time, value: +(sma[i].value + multiplier * std).toFixed(8) });
    lower.push({ time: data[i].time, value: +(sma[i].value - multiplier * std).toFixed(8) });
  }
  return { upper, middle: sma, lower };
}

function calculateMACD(data) {
  const ema12 = (() => {
    const k = 2 / 13;
    let ema = data[0].close;
    const arr = [{ time: data[0].time, value: ema }];
    for (let i = 1; i < data.length; i++) {
      ema = data[i].close * k + ema * (1 - k);
      arr.push({ time: data[i].time, value: +ema.toFixed(8) });
    }
    return arr;
  })();
  const ema26 = (() => {
    const k = 2 / 27;
    let ema = data[0].close;
    const arr = [{ time: data[0].time, value: ema }];
    for (let i = 1; i < data.length; i++) {
      ema = data[i].close * k + ema * (1 - k);
      arr.push({ time: data[i].time, value: +ema.toFixed(8) });
    }
    return arr;
  })();

  const macdLine = ema12.map((e, i) => ({
    time: e.time,
    value: +(e.value - ema26[i].value).toFixed(8),
  }));

  const k = 2 / 10;
  let signal = macdLine[0].value;
  const signalLine = [{ time: macdLine[0].time, value: signal }];
  for (let i = 1; i < macdLine.length; i++) {
    signal = macdLine[i].value * k + signal * (1 - k);
    signalLine.push({ time: macdLine[i].time, value: +signal.toFixed(8) });
  }

  const histogram = macdLine.map((m, i) => ({
    time: m.time,
    value: +(m.value - signalLine[i].value).toFixed(8),
    color: m.value - signalLine[i].value >= 0 ? "rgba(34,197,94,0.6)" : "rgba(239,68,68,0.6)",
  }));

  return { macdLine, signalLine, histogram };
}

function generateSyntheticCandles(startPrice, timeframe) {
  if (!startPrice || startPrice <= 0) return [];
  const count = 80;
  const nowSec = Math.floor(Date.now() / 1000);
  const intervalMap = { "1H": 3600, "4H": 14400, "1D": 86400, "1W": 604800 };
  const interval = intervalMap[timeframe] || 86400;
  const candles = [];
  let prev = startPrice * (1 + (Math.random() - 0.5) * 0.02);

  for (let i = count; i > 0; i--) {
    const time = nowSec - i * interval;
    const volatility = 0.008 + Math.random() * 0.012;
    const drift = (Math.random() - 0.5) * startPrice * volatility;
    const open = prev;
    const close = open + drift;
    const high = Math.max(open, close) + Math.random() * startPrice * volatility * 0.3;
    const low = Math.min(open, close) - Math.random() * startPrice * volatility * 0.3;
    const volume = Math.floor(Math.random() * 1000000) + 100000;
    candles.push({ time, open, high, low, close, volume });
    prev = close;
  }
  return candles;
}

const TIMEFRAME_DAYS = { "1H": 1, "4H": 7, "1D": 30, "1W": 90 };

export default function TradingChart({ asset, darkMode, currentPrice, pricesReady, onDataReady }) {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const candleSeriesRef = useRef(null);
  const ema9Ref = useRef(null);
  const ema21Ref = useRef(null);
  const bbUpperRef = useRef(null);
  const bbLowerRef = useRef(null);
  const volumeSeriesRef = useRef(null);
  const macdChartRef = useRef(null);
  const macdLineRef = useRef(null);
  const macdSignalRef = useRef(null);
  const macdHistRef = useRef(null);
  const activeCandleRef = useRef(null);
  const [timeframe, setTimeframe] = useState("1H");
  const [indicator, setIndicator] = useState("ema");
  const [dataSource, setDataSource] = useState("loading");

  const candleDataRef = useRef([]);
  const currentPriceRef = useRef(currentPrice);
  const timeframeRef = useRef(timeframe);

  useEffect(() => { currentPriceRef.current = currentPrice; }, [currentPrice]);
  useEffect(() => { timeframeRef.current = timeframe; }, [timeframe]);

  const digits = useMemo(() => {
    if (!currentPrice) return 2;
    if (currentPrice > 1000) return 2;
    if (currentPrice > 100) return 3;
    if (currentPrice > 1) return 4;
    return 6;
  }, [currentPrice]);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const container = chartContainerRef.current;
    const rect = container.getBoundingClientRect();
    const mainHeight = indicator === "macd" ? Math.max(rect.height * 0.7, 250) : Math.max(rect.height - 80, 300);
    const macdHeight = indicator === "macd" ? Math.max(rect.height * 0.22, 80) : 0;
    activeCandleRef.current = null;

    const chart = createChart(container, {
      width: rect.width,
      height: mainHeight,
      layout: {
        attributionLogo: false,
        background: { type: "solid", color: darkMode ? "#000000" : "#ffffff" },
        textColor: darkMode ? "#94a3b8" : "#475569",
      },
      grid: {
        vertLines: { color: darkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)" },
        horzLines: { color: darkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)" },
      },
      rightPriceScale: { borderColor: darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)" },
      timeScale: {
        borderColor: darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: { mode: 0 },
      handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: false, vertTouchDrag: false },
      handleScale: { mouseWheel: true, pinch: false, axisPressedMouseMove: true },
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: "#22c55e", downColor: "#ef4444",
      borderUpColor: "#22c55e", borderDownColor: "#ef4444",
      wickUpColor: "#22c55e", wickDownColor: "#ef4444",
    });

    const ema9Series = chart.addLineSeries({ color: "#E88F2B", lineWidth: 1.5, title: "EMA 9", priceLineVisible: false, lastValueVisible: false });
    const ema21Series = chart.addLineSeries({ color: "#fbbf24", lineWidth: 1.5, title: "EMA 21", priceLineVisible: false, lastValueVisible: false });

    const bbUpperSeries = chart.addLineSeries({ color: "rgba(99,102,241,0.4)", lineWidth: 1, lineStyle: 2, priceLineVisible: false, lastValueVisible: false, visible: indicator === "bb" });
    const bbLowerSeries = chart.addLineSeries({ color: "rgba(99,102,241,0.4)", lineWidth: 1, lineStyle: 2, priceLineVisible: false, lastValueVisible: false, visible: indicator === "bb" });

    const volumeSeries = chart.addHistogramSeries({
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
    });
    chart.priceScale("volume").applyOptions({
      scaleMargins: { top: 0.85, bottom: 0 },
    });

    const price = currentPriceRef.current || 1;
    const initialData = generateSyntheticCandles(price, timeframeRef.current);
    candleSeries.setData(initialData);
    candleDataRef.current = initialData;
    ema9Series.setData(calculateEMA(initialData, 9));
    ema21Series.setData(calculateEMA(initialData, 21));

    const bb = calculateBollinger(initialData);
    bbUpperSeries.setData(bb.upper);
    bbLowerSeries.setData(bb.lower);

    const volData = initialData.map((c) => ({ time: c.time, value: c.volume || 0, color: c.close >= c.open ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)" }));
    volumeSeries.setData(volData);

    chart.timeScale().fitContent();

    const markers = [];
    for (let i = 5; i < initialData.length - 5; i++) {
      const c = initialData[i];
      const p = initialData[i - 1];
      const n = initialData[i + 1];
      if (c.close > p.close && c.close > n.close && c.close > (initialData[i - 2]?.close || 0)) {
        markers.push({ time: c.time, position: "aboveBar", color: "#22c55e", shape: "circle", size: 0.5 });
      }
      if (c.close < p.close && c.close < n.close && c.close < (initialData[i - 2]?.close || 0)) {
        markers.push({ time: c.time, position: "belowBar", color: "#ef4444", shape: "circle", size: 0.5 });
      }
    }
    candleSeries.setMarkers(markers);

    let macdChart = null;
    let macdLineSeries = null;
    let macdSignalSeries = null;
    let macdHistSeries = null;

    if (indicator === "macd") {
      const macdContainer = document.createElement("div");
      macdContainer.style.height = `${macdHeight}px`;
      macdContainer.style.width = "100%";
      container.appendChild(macdContainer);

      macdChart = createChart(macdContainer, {
        width: rect.width,
        height: macdHeight,
        layout: {
          attributionLogo: false,
          background: { type: "solid", color: darkMode ? "#000000" : "#ffffff" },
          textColor: darkMode ? "#94a3b8" : "#475569",
        },
        grid: {
          vertLines: { color: darkMode ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)" },
          horzLines: { color: darkMode ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)" },
        },
        rightPriceScale: { borderColor: darkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" },
        timeScale: { visible: false },
        crosshair: { mode: 0 },
      });

      macdLineSeries = macdChart.addLineSeries({ color: "#3b82f6", lineWidth: 1.5, priceLineVisible: false, lastValueVisible: false });
      macdSignalSeries = macdChart.addLineSeries({ color: "#E88F2B", lineWidth: 1.5, priceLineVisible: false, lastValueVisible: false });
      macdHistSeries = macdChart.addHistogramSeries({ priceLineVisible: false, lastValueVisible: false });

      const macdData = calculateMACD(initialData);
      macdLineSeries.setData(macdData.macdLine);
      macdSignalSeries.setData(macdData.signalLine);
      macdHistSeries.setData(macdData.histogram);
    }

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    ema9Ref.current = ema9Series;
    ema21Ref.current = ema21Series;
    bbUpperRef.current = bbUpperSeries;
    bbLowerRef.current = bbLowerSeries;
    volumeSeriesRef.current = volumeSeries;
    macdChartRef.current = macdChart;
    macdLineRef.current = macdLineSeries;
    macdSignalRef.current = macdSignalSeries;
    macdHistRef.current = macdHistSeries;

    const handleResize = () => {
      if (chartContainerRef.current) {
        const { width, height } = chartContainerRef.current.getBoundingClientRect();
        const mainH = indicator === "macd" ? Math.max(height * 0.7, 250) : Math.max(height - 80, 300);
        chart.applyOptions({ width, height: mainH });
        if (macdChart) {
          const macdH = indicator === "macd" ? Math.max(height * 0.22, 80) : 0;
          macdChart.applyOptions({ width, height: macdH });
        }
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);
    window.addEventListener("resize", handleResize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", handleResize);
      if (macdChart) macdChart.remove();
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      ema9Ref.current = null;
      ema21Ref.current = null;
      bbUpperRef.current = null;
      bbLowerRef.current = null;
      volumeSeriesRef.current = null;
      macdChartRef.current = null;
    };
  }, [asset?.id, darkMode, indicator]);

  useEffect(() => {
    if (!asset?.id) return;
    const days = TIMEFRAME_DAYS[timeframe] || 30;
    let cancelled = false;

    const applyCandleData = (candles) => {
      if (cancelled || !candleSeriesRef.current || candles.length === 0) return false;

      const formatted = candles.map((c) => ({
        time: c.time,
        open: +c.open.toFixed(digits),
        high: +c.high.toFixed(digits),
        low: +c.low.toFixed(digits),
        close: +c.close.toFixed(digits),
        volume: c.volume || Math.floor(Math.random() * 500000) + 50000,
      })).filter((c) => c.time > 0);

      const seen = new Set();
      const deduped = [];
      for (const c of formatted) {
        if (!seen.has(c.time)) { seen.add(c.time); deduped.push(c); }
      }
      if (deduped.length < 20) return false;

      candleSeriesRef.current.setData(deduped);
      ema9Ref.current?.setData(calculateEMA(deduped, 9));
      ema21Ref.current?.setData(calculateEMA(deduped, 21));

      const bb = calculateBollinger(deduped);
      bbUpperRef.current?.setData(bb.upper);
      bbLowerRef.current?.setData(bb.lower);

      const volData = deduped.map((c) => ({ time: c.time, value: c.volume || 0, color: c.close >= c.open ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)" }));
      volumeSeriesRef.current?.setData(volData);

      if (indicator === "macd" && macdLineRef.current) {
        const macdData = calculateMACD(deduped);
        macdLineRef.current.setData(macdData.macdLine);
        macdSignalRef.current?.setData(macdData.signalLine);
        macdHistRef.current?.setData(macdData.histogram);
      }

      chartRef.current?.timeScale().fitContent();
      activeCandleRef.current = null;
      candleDataRef.current = deduped;
      onDataReady?.(deduped);
      return true;
    };

    const loadRealData = async () => {
      let candles = [];

      if (!cancelled) {
        candles = await getBinanceOHLC(asset.id, timeframe, 100);
      }
      if (cancelled) return;

      if (candles && candles.length >= 20) {
        setDataSource("Binance");
        applyCandleData(candles);
        return;
      }

      if (pricesReady) {
        candles = await getOHLCData(asset.id, days);
      }
      if (cancelled) return;

      if (candles && candles.length >= 20) {
        setDataSource("CoinGecko");
        applyCandleData(candles);
        return;
      }

      candles = generateSyntheticCandles(currentPriceRef.current || 1, timeframe);
      setDataSource("Synthetic");
      applyCandleData(candles);
    };

    loadRealData();
    return () => { cancelled = true; };
  }, [asset?.id, timeframe, digits, pricesReady, indicator, onDataReady]);

  useEffect(() => {
    if (!candleSeriesRef.current || !currentPrice) return;

    const interval = setInterval(() => {
      const cs = candleSeriesRef.current;
      if (!cs) return;

      const nowSec = Math.floor(Date.now() / 1000);
      const intervalMap = { "1H": 3600, "4H": 14400, "1D": 86400, "1W": 604800 };
      const intervalSec = intervalMap[timeframe] || 86400;
      const candleTime = Math.floor(nowSec / intervalSec) * intervalSec;

      if (activeCandleRef.current && candleTime < activeCandleRef.current.time) return;

      const prevClose = activeCandleRef.current?.close || currentPrice;
      const newClose = +currentPrice.toFixed(digits);

      if (!activeCandleRef.current || activeCandleRef.current.time !== candleTime) {
        activeCandleRef.current = {
          time: candleTime, open: prevClose,
          high: Math.max(prevClose, newClose), low: Math.min(prevClose, newClose),
          close: newClose, volume: Math.floor(Math.random() * 100000) + 10000,
        };
      } else {
        activeCandleRef.current.close = newClose;
        activeCandleRef.current.high = Math.max(activeCandleRef.current.high, newClose);
        activeCandleRef.current.low = Math.min(activeCandleRef.current.low, newClose);
      }

      try { cs.update(activeCandleRef.current); } catch {}

      const liveBase = candleDataRef.current.slice();
      const lastIdx = liveBase.length - 1;
      if (liveBase[lastIdx]?.time === activeCandleRef.current.time) {
        liveBase[lastIdx] = activeCandleRef.current;
      } else {
        liveBase.push(activeCandleRef.current);
      }
      candleDataRef.current = liveBase;

      try {
        const liveCloses = liveBase.map((c) => c.close);
        const ema9 = calculateEMA(liveCloses, 9);
        const ema21 = calculateEMA(liveCloses, 21);
        if (ema9Ref.current && ema9.length) ema9Ref.current.update({ time: candleTime, value: ema9[ema9.length - 1] });
        if (ema21Ref.current && ema21.length) ema21Ref.current.update({ time: candleTime, value: ema21[ema21.length - 1] });
        if (volumeSeriesRef.current) volumeSeriesRef.current.update({ time: candleTime, value: activeCandleRef.current.volume, color: newClose >= prevClose ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)" });
      } catch {}

      onDataReady?.(liveBase);

    }, 5000);

    return () => clearInterval(interval);
  }, [currentPrice, digits, timeframe, onDataReady]);

  return (
    <div
      className="rounded-2xl overflow-hidden flex flex-col"
      style={{
        background: darkMode ? "rgba(255,255,255,0.015)" : "rgba(15,23,42,0.015)",
        border: darkMode ? "1px solid rgba(255,255,255,0.05)" : "1px solid rgba(148,163,184,0.12)",
        height: "650px",
      }}
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 pb-2">
        <div className="flex items-center gap-2">
          <Activity size={14} className="text-[#E88F2B] animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: darkMode ? "#94a3b8" : "#475569" }}>
            {asset?.symbol || "Asset"} Price Chart
          </span>
          {currentPrice && (
            <span className="text-xs font-mono font-bold ml-2" style={{ color: darkMode ? "#cbd5e1" : "#334155" }}>
              ${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          )}
          {dataSource !== "loading" && (
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ml-1 ${
              dataSource === "Binance" ? "text-green-500 bg-green-500/10" :
              dataSource === "CoinGecko" ? "text-amber-500 bg-amber-500/10" :
              "text-red-500 bg-red-500/10"
            }`}>
              {dataSource}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex gap-1 bg-slate-500/5 p-1 rounded-lg">
            {["1H", "4H", "1D", "1W"].map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className="px-2.5 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer"
                style={{
                  background: timeframe === tf ? "linear-gradient(135deg, #E88F2B, #d97706)" : "transparent",
                  color: timeframe === tf ? "#000" : darkMode ? "#94a3b8" : "#475569",
                }}
              >
                {tf}
              </button>
            ))}
          </div>
          <div className="flex gap-1 bg-slate-500/5 p-1 rounded-lg">
            {["ema", "bb", "macd", "none"].map((ind) => (
              <button
                key={ind}
                onClick={() => setIndicator(ind)}
                className="px-2.5 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer uppercase"
                style={{
                  background: indicator === ind ? "linear-gradient(135deg, #E88F2B, #d97706)" : "transparent",
                  color: indicator === ind ? "#000" : darkMode ? "#94a3b8" : "#475569",
                }}
              >
                {ind === "ema" ? "EMA" : ind === "bb" ? "BB" : ind === "macd" ? "MACD" : "Off"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="relative w-full flex-1 min-h-0" style={{ background: darkMode ? "#000000" : "#ffffff" }}>
        <div
          ref={chartContainerRef}
          className="w-full h-full"
          style={{ touchAction: "pan-y", pointerEvents: "auto" }}
        />
      </div>
    </div>
  );
}
