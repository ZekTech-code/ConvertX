import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart, Bar, PieChart, Pie, Cell,
  AreaChart, Area, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine, Customized,
} from "recharts";
import {
  BarChart2, Activity, PieChart as PieChartIcon,
  TrendingUp,InboxIcon, Waves,
} from "lucide-react";
import { useTheme } from "../../context/useTheme";
import { formatRate } from "../../utils/formatRate";
import { exportConversionHistoryAsCsv } from "../../utils/exportCsv";
import ConvertXIcon from "./ConvertXIcon";

const TABS = [
  { id: "flow",       label: "Flow Volume",   Icon: BarChart2 },
  { id: "net",        label: "Net Position",  Icon: Activity },
  { id: "frequency",  label: "Pair Activity", Icon: PieChartIcon },
  { id: "cumulative", label: "Cumulative",    Icon: TrendingUp },
  { id: "ratetrend",  label: "Rate Trend",    Icon: Waves },
];

const PERIODS = ["7D", "30D", "ALL"];

function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getLocalMonthKey(date = new Date()) {
  return getLocalDateKey(date).slice(0, 7);
}

function getTransactionDateKey(timestamp) {
  if (!timestamp) return getLocalDateKey();
  if (typeof timestamp === "string" && !timestamp.includes("T")) {
    return timestamp.slice(0, 10);
  }
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? getLocalDateKey() : getLocalDateKey(date);
}




const PALETTE = [
  "#E88F2B",
  "#f59e0b",
  "#f97316",
  "#eab308",
  "#94a3b8",
  "#d4d4d4",
  "#10b981",
  "#8b5cf6",
];




function fmtVal(v) {
  if (v == null) return "0";
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000)     return `${(v / 1_000).toFixed(2)}K`;
  return v.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function DonutTooltip({ active, payload, darkMode: dm = true }) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  const color = d.payload.fill || PALETTE[0];
  return (
    <div style={{
      background: dm ? "#000000" : "#ffffff",
      border: `1px solid ${color}55`,
      borderRadius: 10,
      padding: "9px 13px",
      boxShadow: `0 4px 20px ${color}22`,
    }}>
      <p style={{ fontSize: 12, fontWeight: 800, color: dm ? "#f8fafc" : "#000000", fontFamily: "monospace" }}>{d.name}</p>
      <p style={{ fontSize: 11, color: color, fontWeight: 700, marginTop: 2 }}>
        {d.payload.pct}% &nbsp;
        <span style={{ color: dm ? "#64748b" : "#94a3b8", fontSize: 10 }}>({fmtVal(d.value)})</span>
      </p>
    </div>
  );
}


function DonutPanel({ data, centerLabel, title, valueKey = "value", themeColors }) {
  const total = data.reduce((s, d) => s + (d[valueKey] || 0), 0);
  return (
    <div style={{
      background: themeColors.bgCard,
      border: `1px solid ${themeColors.border}`,
      borderRadius: 16,
      padding: "20px 18px",
      display: "flex",
      flexDirection: "column",
    }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: themeColors.textMuted, textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: 16 }}>
        {title}
      </p>

      <div style={{ position: "relative", alignSelf: "center" }}>
        <PieChart width={168} height={168}>
          <defs>
            {data.map((entry, idx) => (
              <linearGradient key={entry.name} id={`dg-${idx}`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%"   stopColor={PALETTE[idx % PALETTE.length]} stopOpacity={1} />
                <stop offset="100%" stopColor={PALETTE[idx % PALETTE.length]} stopOpacity={0.7} />
              </linearGradient>
            ))}
          </defs>
          <Pie
            data={data}
            cx="50%" cy="50%"
            innerRadius={50} outerRadius={78}
            paddingAngle={3}
            dataKey={valueKey}
            strokeWidth={0}
            isAnimationActive animationDuration={800}
          >
            {data.map((entry, idx) => (
              <Cell
                key={entry.name}
                fill={`url(#dg-${idx})`}
                stroke={themeColors.bgSecondary}
                strokeWidth={2}
              />
            ))}
          </Pie>
          <Tooltip content={<DonutTooltip />} />
        </PieChart>
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          transform: "translate(-50%,-50%)",
          textAlign: "center", pointerEvents: "none",
        }}>
          <p style={{ fontSize: 15, fontWeight: 900, color: themeColors.text, fontFamily: "monospace", lineHeight: 1 }}>
            {fmtVal(total)}
          </p>
          <p style={{ fontSize: 8, fontWeight: 700, color: themeColors.textDimmer, textTransform: "uppercase", letterSpacing: "0.07em", marginTop: 3 }}>
            {centerLabel}
          </p>
        </div>
      </div>

      <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 9 }}>
        {[...data].sort((a, b) => b[valueKey] - a[valueKey]).map((entry,) => {
          const origIdx = data.findIndex(d => d.name === entry.name);
          const color   = PALETTE[origIdx % PALETTE.length];
          const barW    = total > 0 ? ((entry[valueKey] / total) * 100).toFixed(1) : "0";
          return (
            <div key={entry.name}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: color, flexShrink: 0 }} />
                  <span style={{ fontSize: 11, fontWeight: 700, fontFamily: "monospace", color: themeColors.text }}>{entry.name}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 10, fontFamily: "monospace", color: themeColors.textMuted }}>{fmtVal(entry[valueKey])}</span>
                  <span style={{
                    fontSize: 9, fontWeight: 800, fontFamily: "monospace",
                    color: color, background: `${color}22`,
                    padding: "1px 5px", borderRadius: 4,
                  }}>
                    {entry.pct ?? ((entry[valueKey] / total) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
              <div style={{ height: 3, background: themeColors.borderLight, borderRadius: 99, overflow: "hidden" }}>
                <div style={{
                  height: "100%", width: `${barW}%`,
                  background: color, borderRadius: 99,
                  boxShadow: `0 0 4px ${color}55`,
                }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


function SectionTitle({ title, subtitle, themeColors }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <p style={{ fontSize: 12, fontWeight: 800, color: themeColors.text, letterSpacing: "0.01em" }}>{title}</p>
      {subtitle && <p style={{ fontSize: 10, color: themeColors.textMuted, marginTop: 2 }}>{subtitle}</p>}
    </div>
  );
}


function yFmt(v) {
  if (v === undefined || v === null || isNaN(v)) return "0";
  const abs = Math.abs(v);
  if (abs >= 1_000_000) {
    const formatted = parseFloat((v / 1_000_000).toFixed(2));
    return `${formatted}M`;
  }
  if (abs >= 1_000) {
    const formatted = parseFloat((v / 1_000).toFixed(2));
    return `${formatted}K`;
  }
  if (typeof v === "number" && !Number.isInteger(v)) {
    return String(parseFloat(v.toFixed(2)));
  }
  return String(v);
}


function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-500">
      <InboxIcon size={36} strokeWidth={1.2} />
      <p className="text-sm font-semibold text-center max-w-xs">
        No exchange data yet. Confirm a conversion above to start tracking your analytics.
      </p>
    </div>
  );
}


export default function ExchangeFlowChart({ recentConversions = [], chartData = [], from = "USD", to = "NGN", loading = false }) {
  const { darkMode } = useTheme();

  const themeColors = {
    bg: darkMode ? "#000000" : "#f8fafc",
    bgSecondary: darkMode ? "#000000" : "#f1f5f9",
    bgCard: darkMode ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.03)",
    border: darkMode ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.1)",
    borderLight: darkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.06)",
    text: darkMode ? "#e2e8f0" : "#1e293b",
    textMuted: darkMode ? "#94a3b8" : "#64748b",
    textDimmer: darkMode ? "#475569" : "#94a3b8",
    gridStroke: darkMode ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.08)",
    buttonBg: darkMode ? "#1e293b" : "#f1f5f9",
    buttonBgHover: darkMode ? "#334155" : "#e2e8f0",
    tooltip: darkMode ? "#000000" : "#ffffff",
  };

  const [activeTab, setActiveTab] = useState("flow");
  const [period, setPeriod]       = useState("30D");
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window === "undefined" ? 1440 : window.innerWidth
  );
  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);



  const [currentTime, setCurrentTime] = useState(() => Date.now());

useEffect(() => {
  const interval = setInterval(() => {
    setCurrentTime(Date.now());
  }, 60_000);

  return () => clearInterval(interval);
}, []);

  
  const filteredConversions = useMemo(() => {
  if (period === "ALL") return recentConversions;

  const days = period === "7D" ? 7 : 30;
  const cutoff = currentTime - days * 86_400_000;

  return recentConversions.filter(
    tx => new Date(tx.timestamp).getTime() >= cutoff
  );
  }, [recentConversions, period, currentTime]);
  const hasData = filteredConversions.length > 0;


  const allPairs = useMemo(() => {
    const set = new Set(filteredConversions.map(tx => `${tx.from}/${tx.to}`));
    return Array.from(set);
  }, [filteredConversions]);


  const flowVolumeData = useMemo(() => {
    if (!hasData) return [];
    const dayMap = {};
    for (const tx of filteredConversions) {
      const date = getTransactionDateKey(tx.timestamp);
      const pair = `${tx.from}/${tx.to}`;
      if (!dayMap[date]) dayMap[date] = { date };
      dayMap[date][pair] = (dayMap[date][pair] ?? 0) + (tx.fromAmount || 0);
    }
    return Object.values(dayMap).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredConversions, hasData]);

  const visibleFlowBarLimit = viewportWidth < 640 ? 5 : 20;
  const visibleFlowVolumeData = useMemo(() => {
    if (allPairs.length === 0) return [];

    const byDate = new Map(flowVolumeData.map((day) => [day.date, day]));
    const latestFlowDate = flowVolumeData.length > 0
      ? new Date(`${flowVolumeData[flowVolumeData.length - 1].date}T00:00:00`)
      : new Date();
    const latestFlowMonthKey = getLocalMonthKey(latestFlowDate);
    const currentMonthStart = new Date(`${latestFlowMonthKey}-01T00:00:00`);
    const currentMonthEnd = latestFlowDate;

    const startDate = new Date(currentMonthEnd);
    startDate.setDate(currentMonthEnd.getDate() - (visibleFlowBarLimit - 1));

    if (startDate < currentMonthStart) {
      startDate.setTime(currentMonthStart.getTime());
    }

    const dayCount = Math.max(
      1,
      Math.min(
        visibleFlowBarLimit,
        Math.floor((currentMonthEnd - startDate) / 86_400_000) + 1
      )
    );

    return Array.from({ length: dayCount }, (_, index) => {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + index);
      const key = getLocalDateKey(date);
      const existingDay = byDate.get(key);

      return allPairs.reduce(
        (day, pair) => ({
          ...day,
          [pair]: existingDay?.[pair] || 0,
        }),
        { date: key }
      );
    });
  }, [allPairs, flowVolumeData, visibleFlowBarLimit]);


  const volumeByPair = useMemo(() => {
    if (!hasData) return [];
    const map = {};
    for (const tx of filteredConversions) {
      const pair = `${tx.from}/${tx.to}`;
      map[pair] = (map[pair] ?? 0) + (tx.fromAmount || 0);
    }
    const total = Object.values(map).reduce((s, v) => s + v, 0);
    return Object.entries(map)
      .map(([name, value]) => ({ name, value: parseFloat(value.toFixed(4)), pct: ((value / total) * 100).toFixed(1) }))
      .sort((a, b) => b.value - a.value);
  }, [filteredConversions, hasData]);


  const netPositionData = useMemo(() => {
    if (!hasData) return [];
    const map = {};
    for (const tx of filteredConversions) {
      map[tx.from] = (map[tx.from] ?? 0) - (tx.fromAmount || 0);
      map[tx.to]   = (map[tx.to]   ?? 0) + (tx.toAmount   || 0);
    }
    return Object.entries(map)
      .map(([currency, net]) => ({ currency, net: parseFloat(net.toFixed(4)) }))
      .sort((a, b) => b.net - a.net);
  }, [filteredConversions, hasData]);

  const netDonutData = useMemo(() => {
    if (!hasData) return [];
    const total = netPositionData.reduce((s, d) => s + Math.abs(d.net), 0);
    return netPositionData.map(d => ({
      name: d.currency,
      value: Math.abs(d.net),
      pct: total > 0 ? ((Math.abs(d.net) / total) * 100).toFixed(1) : "0",
    }));
  }, [netPositionData, hasData]);


  const pairActivityData = useMemo(() => {
    if (!hasData) return [];
    const map = {};
    for (const tx of filteredConversions) {
      const pair = `${tx.from}/${tx.to}`;
      map[pair] = (map[pair] ?? 0) + 1;
    }
    const total = filteredConversions.length;
    return Object.entries(map)
      .map(([name, value]) => ({ name, value, pct: ((value / total) * 100).toFixed(1) }))
      .sort((a, b) => b.value - a.value);
  }, [filteredConversions, hasData]);

  const pairBarData = useMemo(() => {
    const map = {};
    for (const tx of filteredConversions) {
      const pair = `${tx.from}/${tx.to}`;
      if (!map[pair]) map[pair] = { name: pair, count: 0, volume: 0, rateSum: 0 };
      map[pair].count  += 1;
      map[pair].volume += tx.fromAmount || 0;
      map[pair].rateSum += tx.rate || 0;
    }
    return Object.values(map).map(d => ({
      name:    d.name,
      count:   d.count,
      volume:  parseFloat(d.volume.toFixed(2)),
      avgRate: parseFloat((d.rateSum / d.count).toFixed(4)),
    })).sort((a, b) => b.volume - a.volume);
  }, [filteredConversions]);


  const dailyVolumeByPair = useMemo(() => {
    if (!hasData) return [];
    const dayMap = {};
    for (const tx of filteredConversions) {
      const date = getTransactionDateKey(tx.timestamp);
      const pair = `${tx.from}/${tx.to}`;
      if (!dayMap[date]) dayMap[date] = { date };
      dayMap[date][pair] = (dayMap[date][pair] ?? 0) + (tx.fromAmount || 0);
    }
    return Object.values(dayMap).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredConversions, hasData]);

  const cumulativeGraphData = useMemo(() => {
    if (!hasData) return [];
    let runningVolume = 0;
    let runningReceived = 0;

    return dailyVolumeByPair.map((day) => {
      const dayVolume = allPairs.reduce((sum, pair) => sum + (day[pair] || 0), 0);
      const dayReceived = filteredConversions
        .filter((tx) => getTransactionDateKey(tx.timestamp) === day.date)
        .reduce((sum, tx) => sum + (tx.toAmount || 0), 0);

      runningVolume += dayVolume;
      runningReceived += dayReceived;

      return {
        date: day.date,
        sent: parseFloat(runningVolume.toFixed(4)),
        received: parseFloat(runningReceived.toFixed(4)),
        trades: filteredConversions.filter((tx) => getTransactionDateKey(tx.timestamp) === day.date).length,
      };
    });
  }, [allPairs, dailyVolumeByPair, filteredConversions, hasData]);


  const kpis = useMemo(() => {
    if (!hasData) return null;
    const totalTrades  = filteredConversions.length;
    const topPairEntry = pairActivityData.reduce((best, d) => d.value > best.value ? d : best, { name: "--", value: 0 });
    const totalVolume  = filteredConversions.reduce((s, tx) => s + (tx.fromAmount || 0), 0);
    const avgRate      = filteredConversions.reduce((s, tx) => s + (tx.rate || 0), 0) / totalTrades;
    return { totalTrades, topPair: topPairEntry.name, totalVolume, avgRate };
  }, [filteredConversions, hasData, pairActivityData]);


  const axisStyle  = { fill: themeColors.textDimmer, fontSize: 10, fontWeight: 600 };
  const gridStroke = themeColors.gridStroke;


  return (
    <div style={{
      background: darkMode ? "rgba(0,0,0,0.95)" : "rgba(248,250,252,0.95)",
      border: `1px solid ${themeColors.border}`,
      borderRadius: "24px",
      boxShadow: darkMode ? "0 20px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.06)" : "0 20px 40px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.1)",
      backdropFilter: "blur(24px)",
      WebkitBackdropFilter: "blur(24px)",
      overflow: "hidden",
    }}>

      <div style={{
        padding: "24px",
        paddingBottom: "16px",
        borderBottom: `1px solid ${themeColors.borderLight}`,
      }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <span style={{ position: "relative", display: "inline-flex", height: "8px", width: "8px" }}>
                <span style={{
                  animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                  position: "absolute",
                  display: "inline-flex",
                  height: "100%",
                  width: "100%",
                  borderRadius: "9999px",
                  background: "#E88F2B",
                  opacity: 0.6,
                }} />
                <span style={{
                  position: "relative",
                  display: "inline-flex",
                  height: "8px",
                  width: "8px",
                  borderRadius: "9999px",
                  background: "#E88F2B",
                }} />
              </span>
              <h3 style={{ fontSize: "16px", fontWeight: "900", color: themeColors.text }}>
                Exchange Flow Analytics
              </h3>
            </div>
            <p style={{ fontSize: "12px", color: themeColors.textMuted, marginTop: "4px" }}>
              Visual breakdown of your personal exchange activity and trade patterns
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              background: themeColors.buttonBg,
              borderRadius: "12px",
              padding: "4px",
              gap: "4px",
            }}>
              {PERIODS.map(p => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "8px",
                    fontSize: "10px",
                    fontWeight: "700",
                    border: "none",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    background: period === p ? (darkMode ? "rgba(255,255,255,0.1)" : "#ffffff") : "transparent",
                    color: period === p ? (darkMode ? "#ffffff" : "#1e293b") : themeColors.textMuted,
                    boxShadow: period === p && !darkMode ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                  }}
                >
                  {p}
                </button>
              ))}
            </div>

            <button
              onClick={() => exportConversionHistoryAsCsv(recentConversions)}
              disabled={recentConversions.length === 0}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 12px",
                borderRadius: "12px",
                background: themeColors.buttonBg,
                border: `1px solid ${themeColors.borderLight}`,
                fontSize: "10px",
                fontWeight: "700",
                color: themeColors.textMuted,
                cursor: recentConversions.length === 0 ? "not-allowed" : "pointer",
                opacity: recentConversions.length === 0 ? 0.4 : 1,
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                if (recentConversions.length > 0) {
                  e.target.style.borderColor = "#E88F2B";
                  e.target.style.color = "#E88F2B";
                }
              }}
              onMouseLeave={(e) => {
                e.target.style.borderColor = themeColors.borderLight;
                e.target.style.color = themeColors.textMuted;
              }}
            >
              <ConvertXIcon size={12} />
              Export
            </button>
          </div>
        </div>

        {kpis && (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: "12px",
            marginTop: "16px",
          }}>
            {[
              { label: "Total Trades",  value: kpis.totalTrades },
              { label: "Top Pair",      value: kpis.topPair,     mono: true },
              { label: "Total Volume",  value: `${kpis.totalVolume.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${from}` },
              { label: "Avg Rate",      value: formatRate(kpis.avgRate), mono: true },
            ].map(({ label, value, mono }) => (
              <div
                key={label}
                style={{
                  background: themeColors.bgCard,
                  border: `1px solid ${themeColors.borderLight}`,
                  borderRadius: "16px",
                  padding: "12px 16px",
                }}
              >
                <p style={{
                  fontSize: "9px",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: themeColors.textMuted,
                  fontWeight: "700",
                  marginBottom: "4px",
                }}>{label}</p>
                <p style={{
                  fontSize: "14px",
                  fontWeight: "900",
                  color: themeColors.text,
                  fontFamily: mono ? "monospace" : "inherit",
                }}>{value}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{
        padding: "16px 24px 0",
        display: "flex",
        alignItems: "center",
        gap: "4px",
        overflowX: "auto",
        WebkitOverflowScrolling: "touch",
        borderBottom: `1px solid ${themeColors.borderLight}`,
        paddingBottom: "0",
        scrollBehavior: "smooth",
      }}>
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "12px 16px",
              fontSize: "12px",
              fontWeight: "700",
              whiteSpace: "nowrap",
              cursor: "pointer",
              border: "none",
              background: "transparent",
              color: activeTab === id ? "#E88F2B" : themeColors.textMuted,
              transition: "color 0.2s ease",
            }}
            onMouseEnter={(e) => {
              if (activeTab !== id) e.target.style.color = themeColors.text;
            }}
            onMouseLeave={(e) => {
              if (activeTab !== id) e.target.style.color = themeColors.textMuted;
            }}
          >
            <Icon size={13} style={{ position: "relative", zIndex: 10 }} />
            <span style={{ position: "relative", zIndex: 10 }}>{label}</span>
            {activeTab === id && (
              <motion.div
                layoutId="activeTabIndicator"
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: "2px",
                  background: "#E88F2B",
                }}
              />
            )}
          </button>
        ))}
      </div>

      <div style={{ padding: "20px 24px 24px" }}>
        {!hasData ? (
          <EmptyState />
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="w-full"
            >
            {activeTab === "flow" && (
              <div className="flex flex-col gap-5">
                {allPairs.slice(0, 20).map((pair, idx) => {
                  const color = PALETTE[idx % 6];
                  const colorShift = PALETTE[(idx + 1) % 6];
                  const strokeId   = `fvS-${idx}`;
                  const fillId     = `fvF-${idx}`;
                  const glowId     = `fvGlow-${idx}`;
                  const pairData   = flowVolumeData.filter(d => (d[pair] || 0) > 0);
                  const pairTotal  = flowVolumeData.reduce((s, d) => s + (d[pair] || 0), 0);
                  const pairPeak   = flowVolumeData.reduce((best, d) => Math.max(best, d[pair] || 0), 0);
                  const peakDate   = flowVolumeData.find(d => (d[pair] || 0) === pairPeak)?.date ?? "—";
                  const avgVol     = pairData.length > 0 ? pairTotal / pairData.length : 0;
                  const daysActive = pairData.length;
                  const lastVal    = flowVolumeData.length > 0 ? (flowVolumeData[flowVolumeData.length - 1][pair] || 0) : 0;
                  const prevVal    = flowVolumeData.length > 1 ? (flowVolumeData[flowVolumeData.length - 2][pair] || 0) : 0;
                  const pctChange  = prevVal > 0 ? (((lastVal - prevVal) / prevVal) * 100).toFixed(1) : null;
                  const isUp       = pctChange !== null && parseFloat(pctChange) >= 0;

                  return (
                    <div key={pair} className={`w-full border shadow-xl ${darkMode ? 'bg-black/95 border-white/10 shadow-black/30' : 'bg-white border-slate-200 shadow-slate-200/40'}`} style={{
                      borderRadius: 10,
                      padding: "18px 18px 14px",
                      position: "relative",
                      overflow: "hidden",
                    }}>
                      <div style={{
                        position: "absolute", top: -60, left: -60,
                        width: 220, height: 220,
                        background: `radial-gradient(circle, ${color}14 0%, transparent 65%)`,
                        pointerEvents: "none",
                      }} />
                      <div style={{
                        position: "absolute", bottom: -40, right: -40,
                        width: 160, height: 160,
                        background: `radial-gradient(circle, ${colorShift}0e 0%, transparent 65%)`,
                        pointerEvents: "none",
                      }} />

                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18, position: "relative" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <div style={{
                            background: `linear-gradient(135deg, ${color}22, ${colorShift}14)`,
                            border: `1px solid ${color}40`,
                            borderRadius: 10,
                            padding: "6px 12px",
                            display: "flex", flexDirection: "column", alignItems: "center",
                          }}>
                            <span style={{ fontSize: 13, fontWeight: 900, fontFamily: "monospace", color, letterSpacing: "0.08em", lineHeight: 1 }}>
                              {pair}
                            </span>
                            <span style={{ fontSize: 8, color: `${color}99`, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 2 }}>
                              Volume Flow
                            </span>
                          </div>
                          {pctChange !== null && (
                            <div style={{
                              display: "flex", alignItems: "center", gap: 4,
                              background: isUp ? "rgba(16,185,129,0.12)" : "rgba(244,63,94,0.12)",
                              border: `1px solid ${isUp ? "#10b981" : "#f43f5e"}30`,
                              borderRadius: 8, padding: "4px 9px",
                            }}>
                              <span style={{ fontSize: 11, fontWeight: 800, fontFamily: "monospace", color: isUp ? "#10b981" : "#f43f5e" }}>
                                {isUp ? "▲" : "▼"} {Math.abs(pctChange)}%
                              </span>
                              <span style={{ fontSize: 8, color: darkMode ? "#475569" : "#94a3b8", fontWeight: 600 }}>vs prev day</span>
                            </div>
                          )}
                        </div>

                        <div style={{ textAlign: "right" }}>
                          <p style={{ fontSize: 8, color: darkMode ? "#94a3b8" : "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: 2 }}>
                            Total Volume
                          </p>
                          <p style={{ fontSize: 22, fontWeight: 900, fontFamily: "monospace", color, lineHeight: 1, letterSpacing: "-0.01em" }}>
                            {pairTotal.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} <span style={{ fontSize: 13, fontWeight: 700, opacity: 0.8, marginLeft: 2 }}>{pair.split("/")[0]}</span>
                          </p>
                        </div>
                      </div>

                      <div style={{
                        position: "relative",
                        borderRadius: 16,
                        overflow: "hidden",
                        background: darkMode
                          ? "#000000"
                          : "linear-gradient(180deg, #f8fafc 0%, #eef6ff 100%)",
                        border: `1px solid ${darkMode ? "rgba(232,143,43,0.12)" : "rgba(232,143,43,0.16)"}`,
                        boxShadow: darkMode
                          ? "inset 0 1px 0 rgba(255,255,255,0.04), 0 18px 40px rgba(2,6,23,0.18)"
                          : "inset 0 1px 0 rgba(255,255,255,0.75), 0 18px 36px rgba(0,0,0,0.08)",
                      }}>
                        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${color}20, transparent)` }} />

                        <ResponsiveContainer width="100%" height={320}>
                          <BarChart data={visibleFlowVolumeData} margin={{ top: 16, right: 18, left: -8, bottom: 4 }} barCategoryGap="28%" barSize={52}>
                            <defs>
                              <linearGradient id={strokeId} x1="0" y1="0" x2="1" y2="0">
                                <stop offset="0%"   stopColor={colorShift} />
                                <stop offset="50%"  stopColor={color} />
                                <stop offset="100%" stopColor={colorShift} />
                              </linearGradient>
                              <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%"   stopColor={color} stopOpacity={1} />
                                <stop offset="55%"  stopColor={color} stopOpacity={0.9} />
                                <stop offset="100%" stopColor={color} stopOpacity={0.78} />
                              </linearGradient>
                              <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
                                <feGaussianBlur stdDeviation="3" result="blur" />
                                <feMerge>
                                  <feMergeNode in="blur" />
                                  <feMergeNode in="SourceGraphic" />
                                </feMerge>
                              </filter>
                            </defs>
                            <Customized
                              component={({ width, height }) => (
                                <rect
                                  x={0}
                                  y={0}
                                  width={width}
                                  height={height}
                                  fill={darkMode ? "#030712" : "#f8fafc"}
                                  opacity={0.78}
                                />
                              )}
                            />

                            <CartesianGrid
                              strokeDasharray="3 8"
                              vertical={false}
                              stroke={darkMode ? "rgba(148,163,184,0.13)" : "rgba(14,165,233,0.12)"}
                            />
                            <XAxis
                              dataKey="date"
                              tickLine={false}
                              axisLine={false}
                              tick={{ fill: themeColors.textMuted, fontSize: 9, fontWeight: 600 }}
                              tickFormatter={d => d.slice(5)}
                            />
                            <YAxis
                              tickLine={false}
                              axisLine={false}
                              tick={{ fill: themeColors.textMuted, fontSize: 9, fontWeight: 600 }}
                              tickFormatter={yFmt}
                            />
                            <Tooltip
                              cursor={{ fill: darkMode ? "rgba(232,143,43,0.06)" : "rgba(14,165,233,0.08)" }}
                              content={({ active, payload }) => {
                                if (!active || !payload?.length) return null;
                                const d = payload[0];
                                return (
                                  <div style={{
                                    border: `1px solid rgba(56,189,248,0.18)`,
                                    borderRadius: 18,
                                    padding: "14px 18px",
                                    background: darkMode ? "rgba(0,0,0,0.94)" : "rgba(255,255,255,0.96)",
                                    backdropFilter: "blur(12px)",
                                  }}>
                                    <p style={{ fontSize: 10, color: darkMode ? "#94a3b8" : "#64748b", marginBottom: 8, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>
                                      {d.payload.date}
                                    </p>
                                    <p style={{ fontSize: 22, fontWeight: 900, fontFamily: "monospace", color, lineHeight: 1.05, marginBottom: 4 }}>
                                      {yFmt(d.value)}
                                    </p>
                                    <p style={{ fontSize: 10, color: darkMode ? "#94a3b8" : "#64748b", marginTop: 0, fontWeight: 600 }}>
                                      units exchanged
                                    </p>
                                  </div>
                                );
                              }}
                            />
                            <Bar
                              dataKey={pair}
                              fill={`url(#${fillId})`}
                              filter={`url(#${glowId})`}
                              radius={[3, 3, 0, 0]}
                              minPointSize={3}
                              isAnimationActive
                              animationDuration={1000 + idx * 150}
                              animationEasing="ease-out"
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4" style={{
                        borderTop: `1px solid ${color}20`,
                      }}>
                        {[
                          { label: "Peak Day",    value: `${pairPeak.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${pair.split("/")[0]}` },
                          { label: "Peak Date",   value: peakDate.slice(5) },
                          { label: "Avg / Day",   value: `${avgVol.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${pair.split("/")[0]}` },
                          { label: "Days Active", value: String(daysActive) },
                        ].map(({ label, value }) => (
                          <div key={label} className={`backdrop-blur-md transition ${darkMode ? 'bg-white/5 hover:bg-white/8' : 'bg-slate-50/80 hover:bg-slate-100'}`} style={{
                            border: `1px solid ${color}30`,
                            borderRadius: 12,
                            padding: "10px 8px",
                            textAlign: "center",
                          }}>
                            <p style={{ fontSize: "9px", color: darkMode ? "#94a3b8" : "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
                              {label}
                            </p>
                            <p style={{ fontSize: "13px", fontWeight: 800, fontFamily: "monospace", color, lineHeight: 1.2 }}>
                              {value}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}


            {activeTab === "net" && (
              <div>
                <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_250px] gap-4">

                  <div style={{
                    background: themeColors.bgCard,
                    border: `1px solid ${themeColors.border}`,
                    borderRadius: 16,
                    padding: "20px 16px 16px",
                  }}>
                    <SectionTitle
                      title="Net Position by Currency"
                      subtitle="Positive = net inflow · Negative = net outflow"
                      themeColors={themeColors}
                    />
                    <ResponsiveContainer width="100%" height={Math.max(220, netPositionData.length * 56)}>
                      <BarChart
                        data={netPositionData}
                        layout="vertical"
                        margin={{ top: 4, right: 72, left: 0, bottom: 4 }}
                        barSize={22}
                      >
                        <defs>
                          <linearGradient id="posG" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#E88F2B" stopOpacity={0.8} />
                            <stop offset="100%" stopColor="#10b981" stopOpacity={1} />
                          </linearGradient>
                          <linearGradient id="negG" x1="1" y1="0" x2="0" y2="0">
                            <stop offset="0%" stopColor="#f97316" stopOpacity={0.8} />
                            <stop offset="100%" stopColor="#f43f5e" stopOpacity={1} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid horizontal={false} strokeDasharray="4 4" stroke={gridStroke} />
                        <XAxis type="number" tickLine={false} axisLine={false} tick={axisStyle} tickFormatter={yFmt} />
                        <YAxis
                          type="category"
                          dataKey="currency"
                          tickLine={false}
                          axisLine={false}
                          width={44}
                          tick={({ x, y, payload }) => (
                            <g transform={`translate(${x},${y})`}>
                              <rect x={-40} y={-11} width={36} height={22} rx={6} ry={6}
                                fill="rgba(148,163,184,0.1)" stroke="rgba(148,163,184,0.15)" strokeWidth={1}
                              />
                              <text x={-22} y={4} textAnchor="middle"
                                fill="#94a3b8" fontSize={9} fontWeight={800} fontFamily="monospace">
                                {payload.value}
                              </text>
                            </g>
                          )}
                        />
                        <ReferenceLine x={0} stroke="rgba(148,163,184,0.25)" strokeWidth={1} />
                        <Tooltip
                          cursor={{ fill: "rgba(148,163,184,0.06)" }}
                          content={({ active, payload }) => {
                            if (!active || !payload?.length) return null;
                            const d       = payload[0];
                            const pos     = d.value >= 0;
                            const color   = pos ? "#10b981" : "#f43f5e";
                            return (
                              <div style={{
                                background: darkMode ? "#000000" : "#ffffff",
                                border: `1px solid ${color}44`,
                                borderRadius: 10,
                                padding: "9px 13px",
                                boxShadow: `0 4px 20px ${color}22`,
                              }}>
                                <p style={{ fontSize: 12, fontWeight: 800, color: darkMode ? "#f8fafc" : "#000000", fontFamily: "monospace" }}>
                                  {d.payload.currency}
                                </p>
                                <p style={{ fontSize: 14, fontWeight: 900, color, fontFamily: "monospace", marginTop: 3 }}>
                                  {pos ? "+" : ""}{fmtVal(d.value)}
                                </p>
                                <p style={{ fontSize: 9, color: darkMode ? "#475569" : "#94a3b8", marginTop: 2, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                                  {pos ? "Net Inflow" : "Net Outflow"}
                                </p>
                              </div>
                            );
                          }}
                        />
                        <Bar
                          dataKey="net"
                          radius={[0, 5, 5, 0]}
                          isAnimationActive
                          animationDuration={800}
                          animationEasing="ease-out"
                          label={{
                            position: "right",
                            formatter: v => (v >= 0 ? "+" : "") + fmtVal(v),
                            style: { fontSize: 10, fontWeight: 800, fontFamily: "monospace", fill: darkMode ? "#64748b" : "#94a3b8" },
                          }}
                        >
                          {netPositionData.map(({ currency, net }) => (
                            <Cell key={currency} fill={net >= 0 ? "url(#posG)" : "url(#negG)"} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>

                    <div style={{ display: "flex", gap: 20, marginTop: 10 }}>
                      {[
                        { label: "Net Inflow",  color: "#10b981", grad: "linear-gradient(90deg,#E88F2B,#10b981)" },
                        { label: "Net Outflow", color: "#f43f5e", grad: "linear-gradient(90deg,#f97316,#f43f5e)" },
                      ].map(({ label, grad }) => (
                        <div key={label} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                          <span style={{ display: "inline-block", width: 22, height: 5, borderRadius: 99, background: grad }} />
                          <span style={{ fontSize: 10, fontWeight: 700, color: darkMode ? "#475569" : "#64748b" }}>{label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <DonutPanel
                    data={netDonutData}
                    title="Flow Distribution"
                    centerLabel="Total Flow"
                    themeColors={themeColors}
                  />
                </div>
              </div>
            )}

            {activeTab === "frequency" && (
              <div style={{
                background: themeColors.bgCard,
                border: `1px solid ${themeColors.border}`,
                borderRadius: 16,
                padding: "20px 20px 16px",
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <SectionTitle
                    title="Pair Activity Overview"
                    subtitle="Grouped bars per pair — conversions, total volume, and average rate"
                    themeColors={themeColors}
                  />
                  <div style={{ display: "flex", gap: 12 }}>
                    {[
                      { key: "count",   label: "Conversions", color: "#E88F2B" },
                      { key: "volume",  label: "Volume",      color: "#8b5cf6" },
                      { key: "avgRate", label: "Avg Rate",    color: "#10b981" },
                    ].map(({ label, color }) => (
                      <div key={label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <span style={{ width: 8, height: 8, borderRadius: 2, background: color, flexShrink: 0 }} />
                        <span style={{ fontSize: 10, fontWeight: 700, color: darkMode ? "#64748b" : "#94a3b8" }}>{label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart
                    data={pairBarData}
                    margin={{ top: 20, right: 20, left: -10, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="paCount"   x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"   stopColor="#E88F2B" stopOpacity={1} />
                        <stop offset="100%" stopColor="#E88F2B" stopOpacity={0.45} />
                      </linearGradient>
                      <linearGradient id="paVolume"  x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"   stopColor="#8b5cf6" stopOpacity={1} />
                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.45} />
                      </linearGradient>
                      <linearGradient id="paAvgRate" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"   stopColor="#10b981" stopOpacity={1} />
                        <stop offset="100%" stopColor="#10b981" stopOpacity={0.45} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="4 4" vertical={false} stroke={gridStroke} />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} tick={axisStyle} />
                    <YAxis tickLine={false} axisLine={false} tick={axisStyle} tickFormatter={yFmt} width={46} />
                    <Tooltip
                      cursor={{ fill: "rgba(148,163,184,0.05)" }}
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null;
                        const colors = { count: "#E88F2B", volume: "#8b5cf6", avgRate: "#10b981" };
                        const labels = { count: "Conversions", volume: "Volume", avgRate: "Avg Rate" };
                        return (
                          <div style={{
                            background: darkMode ? "#000000" : "#ffffff",
                            border: darkMode ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.1)",
                            borderRadius: 10,
                            padding: "10px 14px",
                            minWidth: 160,
                          }}>
                            <p style={{ fontSize: 11, fontWeight: 800, color: darkMode ? "#94a3b8" : "#64748b", marginBottom: 8, fontFamily: "monospace" }}>{label}</p>
                            {payload.map(e => (
                              <div key={e.dataKey} style={{ display: "flex", justifyContent: "space-between", gap: 16, marginBottom: 4 }}>
                                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                  <span style={{ width: 7, height: 7, borderRadius: 2, background: colors[e.dataKey] }} />
                                  <span style={{ fontSize: 10, color: darkMode ? "#cbd5e1" : "#334155" }}>{labels[e.dataKey]}</span>
                                </span>
                                <span style={{ fontSize: 10, fontWeight: 800, fontFamily: "monospace", color: colors[e.dataKey] }}>
                                  {fmtVal(e.value)}
                                </span>
                              </div>
                            ))}
                          </div>
                        );
                      }}
                    />
                    <Area dataKey="count" name="Conversions" type="monotone" stroke="#E88F2B" strokeWidth={2.5} fill="url(#paCount)" isAnimationActive animationDuration={600}
                      dot={{ r: 3, fill: "#E88F2B", strokeWidth: 0 }}
                    />
                    <Area dataKey="volume" name="Volume" type="monotone" stroke="#8b5cf6" strokeWidth={2.5} fill="url(#paVolume)" fillOpacity={0.25} isAnimationActive animationDuration={700}
                      dot={{ r: 3, fill: "#8b5cf6", strokeWidth: 0 }}
                    />
                    <Area dataKey="avgRate" name="Avg Rate" type="monotone" stroke="#10b981" strokeWidth={2.5} fill="url(#paAvgRate)" fillOpacity={0.18} isAnimationActive animationDuration={800}
                      dot={{ r: 3, fill: "#10b981", strokeWidth: 0 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            {activeTab === "cumulative" && (
              <div>
                <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_250px] gap-4">

                  <div style={{
                    background: themeColors.bgCard,
                    border: `1px solid ${themeColors.border}`,
                    borderRadius: 16,
                    padding: "20px 16px 16px",
                  }}>
                    <SectionTitle
                      title="Cumulative Volume by Day"
                      subtitle="Daily volume stacked by pair — watch your overall activity grow"
                      themeColors={themeColors}
                    />
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={cumulativeGraphData} margin={{ top: 10, right: 14, left: -10, bottom: 0 }}>
                        <defs>
                          <linearGradient id="cumulativeSent" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#E88F2B" stopOpacity={0.35} />
                            <stop offset="100%" stopColor="#E88F2B" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="cumulativeReceived" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#10b981" stopOpacity={0.28} />
                            <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="4 4" vertical={false} stroke={gridStroke} />
                        <XAxis dataKey="date" tickLine={false} axisLine={false} tick={axisStyle} tickFormatter={d => d.slice(5)} />
                        <YAxis tickLine={false} axisLine={false} tick={axisStyle} tickFormatter={yFmt} width={48} />
                        <Tooltip
                          content={({ active, payload, label }) => {
                            if (!active || !payload?.length) return null;
                            return (
                              <div style={{ background: darkMode ? "#000000" : "#ffffff", border: darkMode ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.1)", borderRadius: 10, padding: "10px 14px" }}>
                                <p style={{ fontSize: 11, fontWeight: 800, color: darkMode ? "#94a3b8" : "#64748b", marginBottom: 8, fontFamily: "monospace" }}>{label}</p>
                                {payload.map((e) => (
                                  <div key={e.dataKey} style={{ display: "flex", justifyContent: "space-between", gap: 18, marginBottom: 4 }}>
                                    <span style={{ fontSize: 10, color: darkMode ? "#cbd5e1" : "#334155" }}>{e.name}</span>
                                    <span style={{ fontSize: 10, fontWeight: 800, fontFamily: "monospace", color: e.color }}>{fmtVal(e.value)}</span>
                                  </div>
                                ))}
                              </div>
                            );
                          }}
                        />
                        <Legend
                          layout="horizontal"
                          verticalAlign="bottom"
                          align="left"
                          iconType="plain line"
                          iconSize={9}
                          wrapperStyle={{ fontSize: 10, color: darkMode ? "#64748b" : "#94a3b8", paddingTop: 12 }}
                        />
                        <Area dataKey="sent" name="Cumulative Sent" type="monotone" stroke="#E88F2B" strokeWidth={2.5} fill="url(#cumulativeSent)" dot={{ r: 3 }} />
                        <Area dataKey="received" name="Cumulative Received" type="monotone" stroke="#10b981" strokeWidth={2.5} fill="url(#cumulativeReceived)" dot={{ r: 3 }} />
                        <Line dataKey="trades" name="Trades" type="monotone" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  <DonutPanel
                    data={volumeByPair}
                    title="Total Volume Share"
                    centerLabel="All-Time Vol."
                    themeColors={themeColors}
                  />
                </div>
              </div>
            )}

            {activeTab === "ratetrend" && (
              <div style={{
                background: themeColors.bgCard,
                border: `1px solid ${themeColors.border}`,
                borderRadius: 16,
                padding: "20px 16px 16px",
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 800, color: themeColors.text, letterSpacing: "0.01em" }}>
                      Live {from}/{to} Rate Trend
                    </p>
                    <p style={{ fontSize: 10, color: darkMode ? "#475569" : "#94a3b8", marginTop: 2 }}>
                      30-day historical rate — sourced from open.er-api.com
                    </p>
                  </div>
                  <span style={{
                    fontSize: 9, fontWeight: 800, fontFamily: "monospace",
                    color: "#E88F2B", background: "rgba(232,143,43,0.1)",
                    border: "1px solid rgba(232,143,43,0.2)",
                    padding: "3px 10px", borderRadius: 99, letterSpacing: "0.08em", textTransform: "uppercase",
                  }}>
                    {from}/{to} · Month View
                  </span>
                </div>

                {loading || chartData.length === 0 ? (
                  <div style={{ height: 280, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, color: darkMode ? "#475569" : "#94a3b8" }}>
                    <Waves size={28} style={{ opacity: 0.4 }} />
                    <p style={{ fontSize: 12, fontWeight: 600 }}>Loading market trend data…</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="rtGradient" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#E88F2B" />
                          <stop offset="100%" stopColor="#818cf8" />
                        </linearGradient>
                        <linearGradient id="rtFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#E88F2B" stopOpacity={0.22} />
                          <stop offset="100%" stopColor="#E88F2B" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)"} />
                      <XAxis
                        dataKey="date"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: darkMode ? "#475569" : "#94a3b8", fontSize: 9, fontWeight: 600 }}
                        tickFormatter={(d) => `Day ${d.split("-")[2]}`}
                      />
                      <YAxis
                        domain={["auto", "auto"]}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: darkMode ? "#475569" : "#94a3b8", fontSize: 9, fontWeight: 600 }}
                        tickFormatter={(v) => v.toFixed(2)}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          const d = payload[0].payload;
                          return (
                            <div style={{
                              background: darkMode ? "#000000" : "#ffffff",
                              border: darkMode ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.1)",
                              borderRadius: 10,
                              padding: "10px 14px",
                              boxShadow: darkMode ? "0 8px 32px rgba(0,0,0,0.4)" : "0 8px 32px rgba(0,0,0,0.08)",
                            }}>
                              <p style={{ fontSize: 10, fontWeight: 700, color: darkMode ? "#64748b" : "#94a3b8", marginBottom: 4, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                                Date: {d.date}
                              </p>
                              <p style={{ fontSize: 13, fontWeight: 900, fontFamily: "monospace", color: "#E88F2B" }}>
                                {d.rate?.toFixed ? d.rate.toFixed(6) : d.rate}
                              </p>
                            </div>
                          );
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="rate"
                        stroke="url(#rtGradient)"
                        strokeWidth={2.5}
                        fill="url(#rtFill)"
                        isAnimationActive={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}

                <p style={{ fontSize: 9, color: darkMode ? "#334155" : "#94a3b8", marginTop: 10, fontWeight: 600 }}>
                  * Rates sourced from open.er-api.com · Auto-refreshes every 60 seconds · Historical data covers last 30 days.
                </p>
              </div>
            )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
