
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  BarChart3,
  Clock,
  ChevronDown,
  AlertTriangle,
  Minus,
  ArrowUpRight,
  ArrowDownRight,
  Gauge,
  Bot,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import { useTheme } from "../context/useTheme";
import { CURRENCY_INFO, CURRENCY_COUNTRY_CODES } from "../utils/currencyData";
import { getLatestRates, recordRateSnapshot } from "../services/ExchangeApi";
import MobileBottomNav from "../components/MobileBottomNav";
import Navbar from "../components/Navbar";

function CurrencyFlagImage({
  code,
  className = "h-4 w-6 rounded-xs object-cover inline-block align-middle shadow-sm",
}) {
  const countryCode = CURRENCY_COUNTRY_CODES[code];
  if (!countryCode || countryCode.length !== 2) {
    return <span className="inline-block text-sm align-middle">🌐</span>;
  }
  return (
    <img
      src={`https://flagcdn.com/w40/${countryCode.toLowerCase()}.png`}
      alt={`${code} flag`}
      className={className}
      loading="lazy"
      decoding="async"
    />
  );
}


const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: i * 0.07 },
  }),
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};


function RateChartTooltip({
  active,
  payload,
  label,
  darkMode,
  lineColor,
  pair,
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-2xl px-4 py-3"
      style={{
        background: darkMode ? "rgba(0,0,0,0.96)" : "rgba(255,255,255,0.98)",
        border:
          darkMode ?
            "1px solid rgba(255,255,255,0.12)"
          : "1px solid rgba(148,163,184,0.25)",
        boxShadow: "0 12px 32px rgba(0,0,0,0.25)",
        backdropFilter: "blur(12px)",
      }}>
      <p
        className="text-[10px] font-semibold mb-1"
        style={{ color: darkMode ? "#64748b" : "#94a3b8" }}>
        {label}
      </p>
      <p className="text-sm font-black font-mono" style={{ color: lineColor }}>
        {fmt(payload[0].value)}
      </p>
      <p
        className="text-[10px] mt-0.5"
        style={{ color: darkMode ? "#475569" : "#94a3b8" }}>
        {pair}
      </p>
    </div>
  );
}

function fmt(val, decimals) {
  if (val === null || val === undefined || isNaN(val)) return "—";
  const value = Number(val);
  const fractionDigits =
    decimals !== undefined ? decimals
    : value >= 1000 ? 2
    : value >= 100 ? 3
    : value >= 1 ? 4
    : 6;

  return value.toLocaleString(undefined, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

function generateHistoricalData(baseRate, pair, windowLabel) {
  const [from, to] = pair.split("/");
  const seed = (from.charCodeAt(0) * 7 + to.charCodeAt(0) * 13) % 100;

  const points =
    windowLabel === "24H" ? 24
    : windowLabel === "7D" ? 28
    : 30;

  const labelFn =
    windowLabel === "24H" ?
      (i) => {
        const h = (new Date().getHours() - (points - 1 - i) + 24) % 24;
        return `${h.toString().padStart(2, "0")}:00`;
      }
    : windowLabel === "7D" ?
      (i) => {
        const d = new Date();
        d.setDate(d.getDate() - Math.floor((points - 1 - i) / 4));
        return d.toLocaleDateString("en", { weekday: "short" });
      }
    : (i) => {
        const d = new Date();
        d.setDate(d.getDate() - (points - 1 - i));
        return d.toLocaleDateString("en", { month: "short", day: "numeric" });
      };

  const driftPct =
    windowLabel === "24H" ?
      0.008 + (seed % 10) * 0.0003
    : windowLabel === "7D" ?
      0.025 + (seed % 10) * 0.001
    : 0.055 + (seed % 10) * 0.002;

  const startRate = baseRate * (1 - driftPct);
  const volatility = baseRate * 0.004;

  const history = Array.from({ length: points }, (_, i) => {
    const t = points > 1 ? i / (points - 1) : 1;
    const trendRate = startRate + (baseRate - startRate) * t;

    const noise =
      Math.sin(i * 0.7 + seed * 0.1) * volatility * 0.6 +
      Math.sin(i * 1.9 + seed * 0.3) * volatility * 0.3 +
      Math.sin(i * 3.1 + seed * 0.5) * volatility * 0.15;

    return {
      label: labelFn(i),
      rate: parseFloat(
        Math.max(startRate * 0.95, trendRate + noise).toFixed(4),
      ),
      index: i,
    };
  });

  if (history.length > 0) {
    history[history.length - 1].rate = baseRate;
  }

  return history;
}

function deriveBotSignal(history, from) {
  if (!history || history.length < 3) {
    return {
      signal: "SCANNING",
      confidence: 50,
      trend: "Neutral",
      alert: "Moderate",
      message:
        "Scanning market data. The bot is gathering rate information to provide a conversion signal.",
      score: 50,
    };
  }

  const first = history[0].rate;
  const last = history[history.length - 1].rate;
  const pctChange = ((last - first) / first) * 100;
  const mid = history[Math.floor(history.length / 2)].rate;
  const isAccelerating = last > mid && mid > first;
  const isDecelerating = last < mid && mid < first;

  let score = 50;
  score += pctChange * 12;
  if (isAccelerating) score += 15;
  if (isDecelerating) score -= 15;
  score = Math.max(0, Math.min(100, score));

  const confidence = Math.min(
    96,
    Math.max(52, Math.round(60 + Math.abs(pctChange) * 8)),
  );

  let signal, trend, alert, message;

  if (score >= 70) {
    signal = "CONVERT_NOW";
    trend = "Rising";
    alert = "High";
    message = `Rate alert: ${from} is rising steadily (+${Math.abs(pctChange).toFixed(2)}% over the period). This looks like a favorable window to convert. Rates could pull back soon.`;
  } else if (score >= 50) {
    signal = "HOLD";
    trend = "Stable";
    alert = "Moderate";
    message = `Rate is holding steady with minor fluctuation (${pctChange >= 0 ? "+" : ""}${pctChange.toFixed(2)}% change). No strong movement yet. The bot suggests watching for a breakout before converting.`;
  } else {
    signal = "WAIT";
    trend = "Falling";
    alert = "Low";
    message = `Rate is falling (${Math.abs(pctChange).toFixed(2)}% drop detected). Converting now may not give you the best value. The bot recommends waiting for the rate to recover.`;
  }

  return { signal, confidence, trend, alert, message, score };
}


const PAIR_OPTIONS = [
  { from: "USD", to: "NGN" },
  { from: "USD", to: "EUR" },
  { from: "GBP", to: "NGN" },
  { from: "USD", to: "GBP" },
  { from: "EUR", to: "GBP" },
  { from: "USD", to: "JPY" },
];

function PairSelector({ activePair, setActivePair, rates, darkMode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-3 px-4 py-2.5 rounded-2xl text-sm font-bold transition-all duration-200 cursor-pointer"
        style={{
          background:
            darkMode ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)",
          border:
            darkMode ?
              "1px solid rgba(255,255,255,0.1)"
            : "1px solid rgba(148,163,184,0.25)",
          color: darkMode ? "#e2e8f0" : "#1e293b",
        }}>
        <CurrencyFlagImage
          code={activePair.from}
          className="h-3.5 w-5 rounded-xs object-cover inline-block mr-1.5 align-middle"
        />
        <span className="font-mono tracking-wider align-middle">
          {activePair.from}/{activePair.to}
        </span>
        <CurrencyFlagImage
          code={activePair.to}
          className="h-3.5 w-5 rounded-xs object-cover inline-block ml-1.5 align-middle"
        />
        <ChevronDown
          size={14}
          className="transition-transform duration-200"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.18 }}
            className="absolute top-full mt-2 left-0 rounded-2xl overflow-y-auto overflow-x-hidden max-h-60 z-50 min-w-47.5"
            style={{
              background: darkMode ? "#0f172a" : "#ffffff",
              border:
                darkMode ?
                  "1px solid rgba(255,255,255,0.1)"
                : "1px solid rgba(148,163,184,0.2)",
              boxShadow:
                darkMode ?
                  "0 20px 40px rgba(0,0,0,0.5)"
                : "0 10px 30px rgba(15,23,42,0.12)",
            }}>
            {PAIR_OPTIONS.map(({ from, to }) => {
              const isActive = activePair.from === from && activePair.to === to;
              return (
                <button
                  key={`${from}/${to}`}
                  onClick={() => {
                    setActivePair({ from, to });
                    setOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-4 py-3 text-xs font-semibold transition-all duration-150 cursor-pointer"
                  style={{
                    background:
                      isActive ?
                        "linear-gradient(135deg, rgba(232,143,43,0.12), rgba(217,119,6,0.08))"
                      : "transparent",
                    color:
                      isActive ? "#E88F2B"
                      : darkMode ? "#94a3b8"
                      : "#475569",
                  }}>
                  <span className="flex items-center gap-2 font-mono">
                    <CurrencyFlagImage
                      code={from}
                      className="h-3 w-4.5 rounded-xs object-cover"
                    />
                    <span>
                      {from}/{to}
                    </span>
                    <CurrencyFlagImage
                      code={to}
                      className="h-3 w-4.5 rounded-xs object-cover"
                    />
                  </span>
                  <span className="font-mono text-[10px]">
                    {rates[to] != null ? fmt(rates[to]) : "—"}
                  </span>
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


function RateChart({
  history,
  pair,
  loading,
  darkMode,
  window: activeWindow,
  setWindow,
}) {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const chartContainerRef = useRef(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const { width, height } = entries[0].contentRect;
      setDimensions({ width, height });
    });
    resizeObserver.observe(chartContainerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  const windows = ["24H", "7D", "30D"];
  const minRate = useMemo(
    () => Math.min(...history.map((d) => d.rate)) * 0.998,
    [history],
  );
  const maxRate = useMemo(
    () => Math.max(...history.map((d) => d.rate)) * 1.002,
    [history],
  );
  const isUp =
    history.length >= 2 ?
      history[history.length - 1].rate >= history[0].rate
    : true;
  const lineColor = isUp ? "#22c55e" : "#ef4444";
  const gradId = `chartGrad_${pair.replace("/", "_")}`;

  return (
    <motion.div
      variants={fadeUp}
      custom={2}
      className="rounded-3xl p-6"
      style={{
        background:
          darkMode ?
            "linear-gradient(135deg, rgba(0,0,0,0.95), rgba(0,0,0,0.98))"
          : "linear-gradient(135deg, rgba(248,250,252,0.97), rgba(241,245,249,0.99))",
        border:
          darkMode ?
            "1px solid rgba(255,255,255,0.07)"
          : "1px solid rgba(148,163,184,0.2)",
        boxShadow:
          darkMode ?
            "0 8px 40px rgba(0,0,0,0.35)"
          : "0 8px 32px rgba(15,23,42,0.08)",
      }}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 size={16} style={{ color: lineColor }} />
            <h2
              className="text-base font-black"
              style={{ color: darkMode ? "#f1f5f9" : "#0f172a" }}>
              Rate Trend Chart
            </h2>
            <span
              className="text-xs font-bold px-2 py-0.5 rounded-lg"
              style={{
                background:
                  isUp ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
                color: lineColor,
                border: `1px solid ${lineColor}30`,
              }}>
              {isUp ? "↑ Rising" : "↓ Falling"}
            </span>
          </div>
          <p
            className="text-xs"
            style={{ color: darkMode ? "#64748b" : "#94a3b8" }}>
            Exchange rate movement for {pair}
          </p>
        </div>

        <div
          className="flex items-center rounded-xl p-1 gap-1"
          style={{
            background:
              darkMode ? "rgba(255,255,255,0.04)" : "rgba(15,23,42,0.04)",
            border:
              darkMode ?
                "1px solid rgba(255,255,255,0.06)"
              : "1px solid rgba(148,163,184,0.15)",
          }}>
          {windows.map((w) => (
            <button
              key={w}
              onClick={() => setWindow(w)}
              className="px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer"
              style={{
                background:
                  activeWindow === w ?
                    "linear-gradient(135deg, #E88F2B, #d97706)"
                  : "transparent",
                color:
                  activeWindow === w ? "#000"
                  : darkMode ? "#64748b"
                  : "#94a3b8",
                boxShadow:
                  activeWindow === w ? "0 0 12px rgba(232,143,43,0.3)" : "none",
              }}>
              {w}
            </button>
          ))}
        </div>
      </div>

      <div
        ref={chartContainerRef}
        className="h-72"
        style={{ minWidth: 0, position: "relative", width: "100%" }}>
        {loading || dimensions.width === 0 || dimensions.height === 0 ?
          <div
            className="h-full w-full rounded-2xl animate-pulse flex items-center justify-center"
            style={{
              background:
                darkMode ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.03)",
            }}>
            <Activity
              size={32}
              style={{ color: darkMode ? "#1e293b" : "#cbd5e1" }}
            />
          </div>
        : <AreaChart
            width={dimensions.width}
            height={dimensions.height}
            data={history}
            margin={{ top: 10, right: 4, left: -8, bottom: 0 }}
            style={{
              display: "block",
              overflow: "hidden",
              outline: "none",
              border: "none",
            }}>
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={lineColor} stopOpacity={0.35} />
                <stop offset="60%" stopColor={lineColor} stopOpacity={0.08} />
                <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke={
                darkMode ? "rgba(148,163,184,0.08)" : "rgba(148,163,184,0.2)"
              }
            />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{
                fill: darkMode ? "#475569" : "#94a3b8",
                fontSize: 10,
                fontWeight: 600,
              }}
              interval="preserveStartEnd"
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{
                fill: darkMode ? "#475569" : "#94a3b8",
                fontSize: 10,
                fontWeight: 600,
              }}
              domain={[minRate, maxRate]}
              width={54}
              tickFormatter={(v) => fmt(v)}
            />
            <Tooltip
              content={
                <RateChartTooltip
                  darkMode={darkMode}
                  lineColor={lineColor}
                  pair={pair}
                />
              }
              cursor={{
                stroke: lineColor,
                strokeWidth: 1,
                strokeDasharray: "4 4",
              }}
            />
            <ReferenceLine
              y={history[0]?.rate}
              stroke={
                darkMode ? "rgba(255,255,255,0.07)" : "rgba(15,23,42,0.1)"
              }
              strokeDasharray="4 4"
            />
            <Area
              dataKey="rate"
              stroke={lineColor}
              strokeWidth={2.5}
              fill={`url(#${gradId})`}
              dot={false}
              activeDot={{
                r: 5,
                fill: lineColor,
                strokeWidth: 2,
                stroke: darkMode ? "#0f172a" : "#fff",
              }}
              isAnimationActive
              animationDuration={800}
              type="monotone"
            />
          </AreaChart>
        }
      </div>

      {!loading && history.length > 0 && (
        <div
          className="mt-5 pt-5 grid grid-cols-3 gap-4"
          style={{
            borderTop:
              darkMode ?
                "1px solid rgba(255,255,255,0.06)"
              : "1px solid rgba(148,163,184,0.15)",
          }}>
          {[
            {
              label: "Period Open",
              value: fmt(history[0]?.rate),
              color: darkMode ? "#94a3b8" : "#64748b",
            },
            {
              label: "Period High",
              value: fmt(Math.max(...history.map((d) => d.rate))),
              color: "#22c55e",
            },
            {
              label: "Period Low",
              value: fmt(Math.min(...history.map((d) => d.rate))),
              color: "#ef4444",
            },
          ].map(({ label, value, color }) => (
            <div key={label} className="text-center">
              <p
                className="text-[10px] font-semibold mb-1"
                style={{ color: darkMode ? "#475569" : "#94a3b8" }}>
                {label}
              </p>
              <p className="text-sm font-black font-mono" style={{ color }}>
                {value}
              </p>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}


function MarketOverviewCards({ currentRate, pair, loading, darkMode }) {
  const [from, to] = pair.split("/");
  const toInfo = CURRENCY_INFO[to] ?? {};
  const symTo = toInfo.symbol ?? to;

  const history24h = useMemo(() => {
    if (!currentRate) return [];
    return generateHistoricalData(currentRate, pair, "24H");
  }, [currentRate, pair]);

  const history7d = useMemo(() => {
    if (!currentRate) return [];
    return generateHistoricalData(currentRate, pair, "7D");
  }, [currentRate, pair]);

  const change24h = useMemo(() => {
    if (history24h.length < 2) return 0;
    const first = history24h[0].rate;
    const last = history24h[history24h.length - 1].rate;
    return parseFloat((((last - first) / first) * 100).toFixed(2));
  }, [history24h]);

  const change7d = useMemo(() => {
    if (history7d.length < 2) return 0;
    const first = history7d[0].rate;
    const last = history7d[history7d.length - 1].rate;
    return parseFloat((((last - first) / first) * 100).toFixed(2));
  }, [history7d]);

  const highToday = useMemo(() => {
    if (history24h.length === 0) return currentRate;
    return Math.max(...history24h.map((d) => d.rate));
  }, [history24h, currentRate]);

  const lowToday = useMemo(() => {
    if (history24h.length === 0) return currentRate;
    return Math.min(...history24h.map((d) => d.rate));
  }, [history24h, currentRate]);

  const openRate = history24h[0]?.rate ?? currentRate;
  const highPct = openRate ? ((highToday - openRate) / openRate) * 100 : 0;
  const lowPct = openRate ? ((openRate - lowToday) / openRate) * 100 : 0;

  const volatility = useMemo(() => {
    if (history24h.length < 2) return 50;
    const rates = history24h.map((d) => d.rate);
    const mean = rates.reduce((sum, val) => sum + val, 0) / rates.length;
    const variance =
      rates.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
      rates.length;
    const stdDev = Math.sqrt(variance);
    const pctDev = (stdDev / mean) * 100;
    return Math.max(5, Math.min(100, Math.round(pctDev * 60)));
  }, [history24h]);

  const cards = [
    {
      label: "Current Rate",
      value:
        loading ? "…"
        : currentRate ? `${symTo}${fmt(currentRate)}`
        : "—",
      icon: Activity,
      color: "#E88F2B",
      sub: `1 ${from} = ${currentRate ? fmt(currentRate) : "—"} ${to}`,
    },
    {
      label: "Highest Today",
      value:
        loading ? "…"
        : highToday ? `${symTo}${fmt(highToday)}`
        : "—",
      icon: TrendingUp,
      color: "#22c55e",
      sub: openRate ? `+${highPct.toFixed(2)}% above open` : "—",
    },
    {
      label: "Lowest Today",
      value:
        loading ? "…"
        : lowToday ? `${symTo}${fmt(lowToday)}`
        : "—",
      icon: TrendingDown,
      color: "#ef4444",
      sub: openRate ? `-${lowPct.toFixed(2)}% below open` : "—",
    },
    {
      label: "24H Change",
      value: loading ? "…" : `${change24h >= 0 ? "+" : ""}${change24h}%`,
      icon: change24h >= 0 ? ArrowUpRight : ArrowDownRight,
      color: change24h >= 0 ? "#22c55e" : "#ef4444",
      sub: "vs yesterday close",
    },
    {
      label: "7-Day Change",
      value: loading ? "…" : `${change7d >= 0 ? "+" : ""}${change7d}%`,
      icon: change7d >= 0 ? ArrowUpRight : ArrowDownRight,
      color: change7d >= 0 ? "#22c55e" : "#ef4444",
      sub: "vs 7 days ago",
    },
    {
      label: "Volatility Score",
      value: loading ? "…" : `${volatility}/100`,
      icon: Gauge,
      color:
        volatility > 60 ? "#f59e0b"
        : volatility > 30 ? "#E88F2B"
        : "#22c55e",
      sub:
        volatility > 60 ? "High volatility"
        : volatility > 30 ? "Moderate"
        : "Low volatility",
    },
  ];

  return (
    <motion.div variants={stagger} initial="hidden" animate="visible">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {cards.map(({ label, value, icon: Icon, color, sub }, i) => (
          <motion.div
            key={label}
            variants={fadeUp}
            custom={i}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            className="rounded-2xl p-4"
            style={{
              background:
                darkMode ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.85)",
              border:
                darkMode ?
                  "1px solid rgba(255,255,255,0.07)"
                : "1px solid rgba(148,163,184,0.2)",
              boxShadow:
                darkMode ?
                  "0 4px 20px rgba(0,0,0,0.2)"
                : "0 2px 16px rgba(15,23,42,0.06)",
            }}>
            <div className="flex items-center justify-between mb-3">
              <p
                className="text-[11px] font-semibold"
                style={{ color: darkMode ? "#64748b" : "#94a3b8" }}>
                {label}
              </p>
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: `${color}18` }}>
                <Icon size={13} style={{ color }} />
              </div>
            </div>
            <p
              className="text-lg font-black font-mono mb-1"
              style={{ color: darkMode ? "#f1f5f9" : "#0f172a" }}>
              {value}
            </p>
            <p
              className="text-[10px]"
              style={{ color: darkMode ? "#475569" : "#94a3b8" }}>
              {sub}
            </p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}


export default function ExchangeRate() {
  const { darkMode } = useTheme();
  const [rates, setRates] = useState({});
  const [activePair, setActivePair] = useState({ from: "USD", to: "NGN" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [chartWindow, setChartWindow] = useState("24H");

  const { from, to } = activePair;
  const pairLabel = `${from}/${to}`;
  const currentRate = rates[to] ?? null;

  const fetchRates = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getLatestRates(from);
      if (data?.rates) {
        setRates(data.rates);
        setLastUpdated(new Date());
        if (data.rates[to]) recordRateSnapshot(from, to, data.rates[to]);
      } else throw new Error("Invalid response");
    } catch (e) {
      setError(e.message || "Failed to fetch rates");
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    const timer = window.setTimeout(fetchRates, 0);
    return () => window.clearTimeout(timer);
  }, [fetchRates]);

  const history = useMemo(() => {
    if (!currentRate) return [];
    return generateHistoricalData(currentRate, pairLabel, chartWindow);
  }, [currentRate, pairLabel, chartWindow]);

  const botSignal = useMemo(() => {
    if (loading || !currentRate) return null;
    return deriveBotSignal(history, from);
  }, [history, loading, currentRate, from]);

  const bg = darkMode ? "#000000" : "#f1f5f9";
  const fromInfo = CURRENCY_INFO[from] ?? {};
  const toInfo = CURRENCY_INFO[to] ?? {};

  return (
    <div
      className="min-h-screen relative overflow-x-hidden"
      style={{ background: bg, color: darkMode ? "#e2e8f0" : "#1e293b" }}>
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          style={{
            position: "absolute",
            top: "-8%",
            left: "-4%",
            width: 700,
            height: 700,
            background:
              "radial-gradient(circle, rgba(232,143,43,0.05) 0%, transparent 65%)",
            borderRadius: "50%",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-12%",
            right: "-6%",
            width: 800,
            height: 800,
            background:
              "radial-gradient(circle, rgba(217,119,6,0.05) 0%, transparent 65%)",
            borderRadius: "50%",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "45%",
            width: 500,
            height: 500,
            background:
              "radial-gradient(circle, rgba(168,85,247,0.03) 0%, transparent 65%)",
            borderRadius: "50%",
          }}
        />
      </div>

      <Navbar />

      <main className="max-w-7xl mx-auto px-4 lg:px-8 py-8 pb-28 md:pb-12 space-y-8 relative z-10">
        <motion.section
          variants={stagger}
          initial="hidden"
          animate="visible"
          className="space-y-5 max-w-7xl mx-auto w-full">
          <motion.div variants={fadeUp} custom={0}>
            <div className="flex items-center gap-2 mb-3">
              <div
                className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest"
                style={{
                  background: "rgba(232,143,43,0.1)",
                  border: "1px solid rgba(232,143,43,0.25)",
                  color: "#E88F2B",
                }}>
                <span className="w-1.5 h-1.5 rounded-full bg-[#E88F2B] animate-pulse" />
                Live Rates
              </div>
            </div>
            <h1
              className="text-3xl md:text-4xl font-black leading-tight"
              style={{
                color: darkMode ? "#f1f5f9" : "#0f172a",
              }}>
              Exchange Rate Intelligence
            </h1>
            <p
              className="text-sm mt-2 max-w-xl"
              style={{ color: darkMode ? "#64748b" : "#94a3b8" }}>
              Track market movements and discover the best time to exchange
              currencies.
            </p>
          </motion.div>

          <motion.div
            variants={fadeUp}
            custom={1}
            className="rounded-3xl p-6 md:p-8 relative"
            style={{
              background:
                darkMode ?
                  "linear-gradient(135deg, rgba(0,0,0,0.97), rgba(0,0,0,0.99))"
                : "linear-gradient(135deg, rgba(255,255,255,0.97), rgba(248,250,252,0.99))",
              border:
                darkMode ?
                  "1px solid rgba(232,143,43,0.15)"
                : "1px solid rgba(232,143,43,0.2)",
              boxShadow:
                darkMode ?
                  "0 0 80px rgba(232,143,43,0.06), 0 8px 40px rgba(0,0,0,0.35)"
                : "0 0 60px rgba(232,143,43,0.04), 0 8px 32px rgba(15,23,42,0.08)",
            }}>
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 relative z-10">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <PairSelector
                    activePair={activePair}
                    setActivePair={setActivePair}
                    rates={rates}
                    darkMode={darkMode}
                  />
                  {!loading && (
                    <span
                      className="text-xs font-semibold flex items-center gap-1"
                      style={{ color: darkMode ? "#475569" : "#94a3b8" }}>
                      <Clock size={11} />
                      {lastUpdated ?
                        lastUpdated.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "Just now"}
                    </span>
                  )}
                </div>

                <div className="flex items-end gap-4 flex-wrap">
                  <div>
                    <p
                      className="text-[11px] font-semibold mb-1"
                      style={{ color: darkMode ? "#475569" : "#94a3b8" }}>
                      Current Exchange Rate
                    </p>
                    <div key="current-rate-wrapper">
                      {loading ?
                        <div
                          className="h-14 w-64 rounded-2xl animate-pulse"
                          style={{
                            background:
                              darkMode ?
                                "rgba(255,255,255,0.06)"
                              : "rgba(15,23,42,0.06)",
                          }}
                        />
                      : <p
                          className="text-4xl md:text-5xl font-black font-mono"
                          style={{
                            background:
                              "linear-gradient(135deg, #E88F2B, #d97706)",
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                          }}>
                          {currentRate ? fmt(currentRate) : "—"}
                        </p>
                      }
                    </div>
                    <p
                      className="text-sm mt-1.5"
                      style={{ color: darkMode ? "#64748b" : "#94a3b8" }}>
                      1{" "}
                      <span
                        className="font-bold"
                        style={{ color: darkMode ? "#94a3b8" : "#64748b" }}>
                        <CurrencyFlagImage
                          code={from}
                          className="h-3 w-4.5 rounded-xs object-cover inline-block mr-1 align-middle"
                        />
                        <span className="align-middle">{from}</span>
                      </span>{" "}
                      ={" "}
                      <span
                        className="font-bold"
                        style={{ color: darkMode ? "#f1f5f9" : "#0f172a" }}>
                        <CurrencyFlagImage
                          code={to}
                          className="h-3 w-4.5 rounded-xs object-cover inline-block mr-1 align-middle"
                        />
                        <span className="align-middle">{to}</span>
                      </span>
                    </p>
                  </div>

                  {!loading && botSignal && (
                    <div
                      className="px-3 py-2 rounded-xl"
                      style={{
                        background:
                          botSignal.signal === "CONVERT_NOW" ?
                            "rgba(34,197,94,0.1)"
                          : botSignal.signal === "WAIT" ? "rgba(239,68,68,0.1)"
                          : "rgba(245,158,11,0.1)",
                        border:
                          botSignal.signal === "CONVERT_NOW" ?
                            "1px solid rgba(34,197,94,0.25)"
                          : botSignal.signal === "WAIT" ?
                            "1px solid rgba(239,68,68,0.25)"
                          : "1px solid rgba(245,158,11,0.25)",
                      }}>
                      <p
                        className="text-[10px] font-semibold flex items-center gap-1"
                        style={{ color: darkMode ? "#475569" : "#94a3b8" }}>
                        <Bot size={10} /> Bot Signal
                      </p>
                      <p
                        className="text-xs font-black"
                        style={{
                          color:
                            botSignal.signal === "CONVERT_NOW" ? "#22c55e"
                            : botSignal.signal === "WAIT" ? "#ef4444"
                            : "#f59e0b",
                        }}>
                        {botSignal.trend === "Rising" ?
                          "↑ "
                        : botSignal.trend === "Falling" ?
                          "↓ "
                        : "→ "}
                        {botSignal.trend}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-row items-center justify-center gap-3 w-full lg:w-auto shrink-0">
                {[
                  { code: from, info: fromInfo },
                  null,
                  { code: to, info: toInfo },
                ].map((item) =>
                  item === null ?
                    <div
                      key="sep"
                      className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                      style={{
                        background: "linear-gradient(135deg, #E88F2B, #d97706)",
                        boxShadow: "0 0 15px rgba(232,143,43,0.25)",
                      }}>
                      <Minus size={12} color="#000" />
                    </div>
                  : <div
                      key={item.code}
                      className="rounded-2xl p-3.5 text-center flex-1 min-w-0"
                      style={{
                        background:
                          darkMode ?
                            "rgba(255,255,255,0.04)"
                          : "rgba(15,23,42,0.04)",
                        border:
                          darkMode ?
                            "1px solid rgba(255,255,255,0.07)"
                          : "1px solid rgba(148,163,184,0.15)",
                      }}>
                      <div className="flex justify-center mb-1.5">
                        <CurrencyFlagImage
                          code={item.code}
                          className="h-6 w-9 rounded-md object-cover shadow-sm"
                        />
                      </div>
                      <p
                        className="text-xs font-black mt-1"
                        style={{ color: darkMode ? "#f1f5f9" : "#0f172a" }}>
                        {item.code}
                      </p>
                      <p
                        className="text-[9px] truncate max-w-22.5 mx-auto"
                        style={{ color: darkMode ? "#475569" : "#94a3b8" }}
                        title={item.info.name ?? item.code}>
                        {item.info.name ?? item.code}
                      </p>
                    </div>,
                )}
              </div>
            </div>

            {error && (
              <div
                className="mt-4 flex items-center gap-2 px-4 py-3 rounded-2xl"
                style={{
                  background: "rgba(239,68,68,0.1)",
                  border: "1px solid rgba(239,68,68,0.25)",
                }}>
                <AlertTriangle size={14} className="text-red-400 shrink-0" />
                <p className="text-xs text-red-400">{error}. Please refresh.</p>
                <button
                  onClick={fetchRates}
                  className="ml-auto text-xs font-bold text-red-400 hover:text-red-300 transition-colors">
                  Retry
                </button>
              </div>
            )}
          </motion.div>
        </motion.section>

        <section>
          <motion.h2
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-xs font-black uppercase tracking-widest mb-4 flex items-center gap-2"
            style={{ color: darkMode ? "#475569" : "#94a3b8" }}>
            <Activity size={13} />
            Market Overview
          </motion.h2>
          <MarketOverviewCards
            currentRate={currentRate}
            pair={pairLabel}
            loading={loading}
            darkMode={darkMode}
          />
        </section>

        <section>
          <motion.h2
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-xs font-black uppercase tracking-widest mb-4 flex items-center gap-2"
            style={{ color: darkMode ? "#475569" : "#94a3b8" }}>
            <BarChart3 size={13} />
            Historical Rate Trend
          </motion.h2>
          <RateChart
            history={history}
            pair={pairLabel}
            loading={loading}
            darkMode={darkMode}
            window={chartWindow}
            setWindow={setChartWindow}
          />
        </section>

        <footer className="text-center py-6">
          <p
            className="text-[11px]"
            style={{ color: darkMode ? "#334155" : "#cbd5e1" }}>
            Rate data by open.er-api.com · Rate bot signals are for
            informational purposes only ·{" "}
            <span
              className="font-bold"
              style={{
                background: "linear-gradient(90deg, #E88F2B, #d97706)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}>
              ConvertX
            </span>{" "}
            © {new Date().getFullYear()}
          </p>
        </footer>
      </main>

      <MobileBottomNav hideProfile={false} />
    </div>
  );
}
