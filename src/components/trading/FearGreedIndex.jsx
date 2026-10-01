import { useState, useEffect, useCallback } from "react";
import { TrendingUp, TrendingDown, Minus, RefreshCw } from "lucide-react";
import { BORDER, NEGATIVE, pick, POSITIVE, statusAlpha, SURFACE, SURFACE_MUTED, SURFACE_SUNKEN, TEXT_MUTED, TEXT_SECONDARY, WARNING } from "../../styles/colors";

// Sentiment scale: red -> amber -> green. Semantic, never the brand accent.
const FEAR_GREED_LABELS = {
  "Extreme Fear": { tone: "negative" },
  "Fear": { tone: "negative" },
  "Neutral": { tone: "warning" },
  "Greed": { tone: "positive" },
  "Extreme Greed": { tone: "positive" },
};

function getLabel(value) {
  if (value <= 25) return "Extreme Fear";
  if (value <= 45) return "Fear";
  if (value <= 55) return "Neutral";
  if (value <= 75) return "Greed";
  return "Extreme Greed";
}

const toneColor = (tone, darkMode) =>
  tone === "positive" ? pick(POSITIVE, darkMode) : tone === "warning" ? pick(WARNING, darkMode) : pick(NEGATIVE, darkMode);

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

  const label = data ? getLabel(data.current) : "Neutral";
  const sentiment = FEAR_GREED_LABELS[label] || FEAR_GREED_LABELS.Neutral;
  const change = data ? data.current - data.previous : 0;

  return (
    <div
      className="rounded-2xl p-4 flex flex-col gap-3"
      style={{
        background: pick(SURFACE, darkMode),
        border: "1px solid " + pick(BORDER, darkMode),
      }}
    >
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="text-lg font-black uppercase tracking-wider" style={{ color: pick(TEXT_SECONDARY, darkMode) }}>
            Fear & Greed
          </span>
          <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-md bg-accent/10 text-accent">
            LIVE
          </span>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="p-1.5 rounded-lg transition-all cursor-pointer disabled:opacity-40"
          style={{
            background: pick(SURFACE_MUTED, darkMode),
            border: "1px solid " + pick(BORDER, darkMode),
          }}
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} style={{ color: pick(TEXT_SECONDARY, darkMode) }} />
        </button>
      </div>

      {loading && !data && (
        <div className="text-center py-4">
          <span className="text-[14px]" style={{ color: pick(TEXT_MUTED, darkMode) }}>Loading market sentiment...</span>
        </div>
      )}

      {error && (
        <div className="text-center py-4">
          <span className="text-[14px] text-negative">Failed to load data</span>
        </div>
      )}

      {data && (
        <>
          <div
            className="rounded-xl p-4 text-center"
            style={{ background: statusAlpha(sentiment.tone, darkMode, 0.12), border: `1px solid ${statusAlpha(sentiment.tone, darkMode, 0.26)}` }}
          >
            {data.current <= 45 ? (
              <TrendingDown size={28} className="mx-auto mb-2" style={{ color: toneColor(sentiment.tone, darkMode) }} />
            ) : data.current <= 55 ? (
              <Minus size={28} className="mx-auto mb-2" style={{ color: toneColor(sentiment.tone, darkMode) }} />
            ) : (
              <TrendingUp size={28} className="mx-auto mb-2" style={{ color: toneColor(sentiment.tone, darkMode) }} />
            )}
            <div className="text-3xl font-black" style={{ color: toneColor(sentiment.tone, darkMode) }}>
              {data.current}
            </div>
            <div className="text-sm font-bold mt-1" style={{ color: toneColor(sentiment.tone, darkMode) }}>
              {label}
            </div>
            <div className="mt-3 h-2 rounded-full overflow-hidden" style={{ background: pick(SURFACE_SUNKEN, darkMode) }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${data.current}%`,
                  background: toneColor(sentiment.tone, darkMode),
                }}
              />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[11px] font-bold text-negative">Fear</span>
              <span className="text-[11px] font-bold" style={{ color: pick(POSITIVE, darkMode) }}>Greed</span>
            </div>
          </div>

          <div
            className="rounded-xl p-3 flex items-center justify-between"
            style={{
              background: pick(SURFACE_MUTED, darkMode),
              border: "1px solid " + pick(BORDER, darkMode),
            }}
          >
            <div>
              <span className="text-[13px] font-bold block" style={{ color: pick(TEXT_MUTED, darkMode) }}>Previous</span>
              <span className="text-sm font-mono font-black" style={{ color: toneColor(FEAR_GREED_LABELS[getLabel(data.previous)]?.tone ?? "warning", darkMode) }}>
                {data.previous} â€” {getLabel(data.previous)}
              </span>
            </div>
            <span
              className="text-sm font-bold"
              style={{ color: change > 0 ? pick(POSITIVE, darkMode) : change < 0 ? pick(NEGATIVE, darkMode) : pick(WARNING, darkMode) }}
            >
              {change > 0 ? "+" : ""}{change}
            </span>
          </div>
        </>
      )}

      <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-accent/5 border border-accent/10">
        <span className="text-[13px]" style={{ color: pick(TEXT_MUTED, darkMode) }}>
          Source: Alternative.me
        </span>
      </div>
    </div>
  );
}
