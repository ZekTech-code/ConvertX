import { useState, useEffect, useCallback } from "react";
import { TrendingUp, TrendingDown, Minus, RefreshCw } from "lucide-react";

const FEAR_GREED_LABELS = {
  "Extreme Fear": { color: "#ef4444", bg: "rgba(239,68,68,0.1)", border: "rgba(239,68,68,0.2)" },
  "Fear": { color: "#f97316", bg: "rgba(249,115,22,0.1)", border: "rgba(249,115,22,0.2)" },
  "Neutral": { color: "#f59e0b", bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.2)" },
  "Greed": { color: "#22c55e", bg: "rgba(34,197,94,0.1)", border: "rgba(34,197,94,0.2)" },
  "Extreme Greed": { color: "#16a34a", bg: "rgba(22,163,74,0.1)", border: "rgba(22,163,74,0.2)" },
};

function getLabel(value) {
  if (value <= 25) return "Extreme Fear";
  if (value <= 45) return "Fear";
  if (value <= 55) return "Neutral";
  if (value <= 75) return "Greed";
  return "Extreme Greed";
}

export default function FearGreedIndex({ darkMode }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("https://api.alternative.me/fng/?limit=2&format=json");
      const json = await res.json();
      if (json?.data) {
        setData({
          current: parseInt(json.data[0].value),
          currentLabel: json.data[0].value_classification,
          previous: parseInt(json.data[1].value),
          previousLabel: json.data[1].value_classification,
          timestamp: parseInt(json.data[0].timestamp) * 1000,
        });
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(fetchData, 0);
    return () => clearTimeout(timeout);
  }, [fetchData]);

  const tc = (dark, light) => ({ color: darkMode ? dark : light });

  const label = data ? getLabel(data.current) : "Neutral";
  const style = FEAR_GREED_LABELS[label] || FEAR_GREED_LABELS.Neutral;
  const change = data ? data.current - data.previous : 0;

  return (
    <div
      className="rounded-2xl p-4 flex flex-col gap-3"
      style={{
        background: darkMode ? "rgba(255,255,255,0.02)" : "rgba(15,23,42,0.02)",
        border: darkMode ? "1px solid rgba(255,255,255,0.05)" : "1px solid rgba(148,163,184,0.12)",
      }}
    >
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="text-lg font-black uppercase tracking-wider" style={tc("#94a3b8", "#475569")}>
            Fear & Greed
          </span>
          <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-md bg-[#E88F2B]/10 text-[#E88F2B]">
            LIVE
          </span>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="p-1.5 rounded-lg transition-all cursor-pointer disabled:opacity-40"
          style={{
            background: darkMode ? "rgba(255,255,255,0.04)" : "rgba(15,23,42,0.04)",
            border: darkMode ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(148,163,184,0.1)",
          }}
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} style={tc("#94a3b8", "#475569")} />
        </button>
      </div>

      {loading && !data && (
        <div className="text-center py-4">
          <span className="text-[14px]" style={tc("#64748b", "#475569")}>Loading market sentiment...</span>
        </div>
      )}

      {error && (
        <div className="text-center py-4">
          <span className="text-[14px] text-red-400">Failed to load data</span>
        </div>
      )}

      {data && (
        <>
          <div
            className="rounded-xl p-4 text-center"
            style={{ background: style.bg, border: `1px solid ${style.border}` }}
          >
            {data.current <= 45 ? (
              <TrendingDown size={28} className="mx-auto mb-2" style={{ color: style.color }} />
            ) : data.current <= 55 ? (
              <Minus size={28} className="mx-auto mb-2" style={{ color: style.color }} />
            ) : (
              <TrendingUp size={28} className="mx-auto mb-2" style={{ color: style.color }} />
            )}
            <div className="text-3xl font-black" style={{ color: style.color }}>
              {data.current}
            </div>
            <div className="text-sm font-bold mt-1" style={{ color: style.color }}>
              {label}
            </div>
            <div className="mt-3 h-2 rounded-full overflow-hidden" style={{ background: darkMode ? "rgba(255,255,255,0.05)" : "rgba(15,23,42,0.05)" }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${data.current}%`,
                  background: `linear-gradient(90deg, #ef4444, #f59e0b 50%, #22c55e)`,
                }}
              />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[11px] font-bold" style={{ color: "#ef4444" }}>Fear</span>
              <span className="text-[11px] font-bold" style={{ color: "#22c55e" }}>Greed</span>
            </div>
          </div>

          <div
            className="rounded-xl p-3 flex items-center justify-between"
            style={{
              background: darkMode ? "rgba(255,255,255,0.02)" : "rgba(15,23,42,0.02)",
              border: darkMode ? "1px solid rgba(255,255,255,0.04)" : "1px solid rgba(148,163,184,0.08)",
            }}
          >
            <div>
              <span className="text-[13px] font-bold block" style={tc("#64748b", "#475569")}>Previous</span>
              <span className="text-sm font-mono font-black" style={{ color: FEAR_GREED_LABELS[getLabel(data.previous)]?.color || "#f59e0b" }}>
                {data.previous} — {getLabel(data.previous)}
              </span>
            </div>
            <span
              className="text-sm font-bold"
              style={{ color: change > 0 ? "#22c55e" : change < 0 ? "#ef4444" : "#f59e0b" }}
            >
              {change > 0 ? "+" : ""}{change}
            </span>
          </div>
        </>
      )}

      <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-[#E88F2B]/5 border border-[#E88F2B]/10">
        <span className="text-[13px]" style={tc("#64748b", "#475569")}>
          Source: Alternative.me
        </span>
      </div>
    </div>
  );
}
