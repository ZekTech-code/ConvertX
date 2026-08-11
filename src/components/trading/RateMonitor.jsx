import { useMemo, useState } from "react";
import { BarChart2, TrendingUp, TrendingDown } from "lucide-react";
import { getCoinIcon } from "../../utils/coinIcons";

export default function RateMonitor({ allPrices, darkMode, onSelectAsset, selectedAssetId }) {
  const [filter, setFilter] = useState("all");

  const sortedPrices = useMemo(() => {
    let items = [...allPrices];
    if (filter === "crypto") items = items.filter((p) => p.type === "crypto");
    if (filter === "forex") items = items.filter((p) => p.type === "forex");
    return items.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
  }, [allPrices, filter]);

  const formatPrice = (p, type) => {
    if (!p) return "---";
    if (type === "crypto") {
      if (p > 1000) return p.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      if (p > 1) return p.toFixed(4);
      return p.toFixed(6);
    }
    return p.toFixed(4);
  };

  const formatVolume = (v) => {
    if (!v) return "";
    if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
    if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
    if (v >= 1e3) return `$${(v / 1e3).toFixed(1)}K`;
    return "";
  };

  const tc = (dark, light) => ({ color: darkMode ? dark : light });

  return (
    <div
      className="rounded-2xl p-4 flex flex-col gap-3"
      style={{
        background: darkMode ? "rgba(255,255,255,0.02)" : "rgba(15,23,42,0.02)",
        border: darkMode ? "1px solid rgba(255,255,255,0.05)" : "1px solid rgba(148,163,184,0.12)",
      }}
    >
      <div className="flex items-center gap-2 mb-1">
        <BarChart2 size={18} className="text-[#E88F2B]" />
        <span className="text-lg font-black uppercase tracking-wider" style={tc("#94a3b8", "#475569")}>
          Market Watch
        </span>
        <span className="text-[13px] font-bold ml-auto" style={tc("#475569", "#334155")}>
          {sortedPrices.length} pairs
        </span>
      </div>

      <div className="flex gap-2">
        {["all", "crypto", "forex"].map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className="px-3 py-1.5 rounded-md text-[13px] font-bold uppercase tracking-wider transition-all cursor-pointer"
            style={{
              background: filter === tab ? "linear-gradient(135deg, #E88F2B, #d97706)" : "transparent",
              color: filter === tab ? "#000" : darkMode ? "#64748b" : "#475569",
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
        {sortedPrices.map((item) => {
          const isSelected = item.id === selectedAssetId;
          return (
            <button
              key={item.id}
              onClick={() => onSelectAsset(item)}
              className="w-full flex items-center justify-between px-3 py-3 rounded-xl transition-all cursor-pointer text-left"
              style={{
                background: isSelected
                  ? "linear-gradient(135deg, rgba(232,143,43,0.12), rgba(217,119,6,0.08))"
                  : darkMode ? "rgba(255,255,255,0.01)" : "rgba(15,23,42,0.01)",
                border: isSelected
                  ? "1px solid rgba(232,143,43,0.3)"
                  : darkMode ? "1px solid rgba(255,255,255,0.03)" : "1px solid rgba(148,163,184,0.06)",
              }}
            >
              <div className="flex items-center gap-2.5">
                <img src={getCoinIcon(item.id)} alt="" width={36} height={36} className="rounded-full object-cover" style={{width: 36, height: 36}} />
                <div>
                  <span className="text-[15px] font-black block" style={tc("#e2e8f0", "#1e293b")}>{item.symbol}</span>
                  <span className="text-[13px]" style={tc("#64748b", "#475569")}>{item.name}</span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[15px] font-mono font-bold block" style={tc("#e2e8f0", "#1e293b")}>
                  {item.price != null && item.price > 0 ? `${item.type === "forex" ? "" : "$"}${formatPrice(item.price, item.type)}` : "—"}
                </span>
                <div className="flex items-center gap-1 justify-end">
                  {item.price != null && item.price > 0 ? (
                    <>
                      {item.change >= 0 ? (
                        <TrendingUp size={9} className="text-green-400" />
                      ) : (
                        <TrendingDown size={9} className="text-red-400" />
                      )}
                      <span
                        className="text-[14px] font-bold"
                        style={{ color: item.change >= 0 ? "#22c55e" : "#ef4444" }}
                      >
                        {item.change >= 0 ? "+" : ""}{item.change.toFixed(2)}%
                      </span>
                    </>
                  ) : (
                    <span className="text-[14px] font-bold" style={tc("#64748b", "#475569")}>—</span>
                  )}
                </div>
                {item.volume > 0 && (
                  <span className="text-[12px]" style={tc("#475569", "#64748b")}>{formatVolume(item.volume)}</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
