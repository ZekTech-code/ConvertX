import { useMemo, useState } from "react";
import { BarChart2, TrendingUp, TrendingDown, Search } from "lucide-react";
import { getCoinIcon } from "../../utils/coinIcons";
import { accentAlpha, BORDER, NEGATIVE, pick, POSITIVE, PRIMARY, SURFACE, SURFACE_MUTED, TEXT, TEXT_SECONDARY } from "../../styles/colors";

export default function RateMonitor({ allPrices, darkMode, onSelectAsset, selectedAssetId }) {
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const sortedPrices = useMemo(() => {
    let items = [...allPrices];
    if (filter === "crypto") items = items.filter((p) => p.type === "crypto");
    if (filter === "forex") items = items.filter((p) => p.type === "forex");
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (p) =>
          p.symbol?.toLowerCase().includes(q) ||
          p.name?.toLowerCase().includes(q)
      );
    }
    return items.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
  }, [allPrices, filter, searchQuery]);

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
        background: pick(SURFACE, darkMode),
        border: "1px solid " + pick(BORDER, darkMode),
      }}
    >
      <div className="flex items-center gap-2 mb-1">
        <BarChart2 size={18} className="text-accent" />
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
              background: filter === tab ? pick(PRIMARY, darkMode) : "transparent",
              color: filter === tab ? "#ffffff" : pick(TEXT_SECONDARY, darkMode),
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={tc("#475569", "#94a3b8")} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by asset name or symbol..."
          className="w-full pl-9 pr-3 py-2 rounded-lg text-[13px] font-medium outline-none transition-all"
          style={{
            background: pick(SURFACE_MUTED, darkMode),
            border: "1px solid " + pick(BORDER, darkMode),
            color: pick(TEXT, darkMode),
          }}
        />
      </div>

      <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
        {sortedPrices.length === 0 && (
          <div className="text-center py-6">
            <p className="text-[15px]" style={tc("#64748b", "#475569")}>No assets found</p>
            <p className="text-[14px]" style={tc("#475569", "#64748b")}>Try a different search term</p>
          </div>
        )}
        {sortedPrices.map((item) => {
          const isSelected = item.id === selectedAssetId;
          return (
            <button
              key={item.id}
              onClick={() => onSelectAsset(item)}
              className="w-full flex items-center justify-between px-3 py-3 rounded-xl transition-all cursor-pointer text-left"
              style={{
                background: isSelected
                  ? accentAlpha(darkMode, 0.14)
                  : pick(SURFACE_MUTED, darkMode),
                border: isSelected
                  ? `1px solid ${accentAlpha(darkMode, 0.32)}`
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
                  {item.price != null && item.price > 0 && Number.isFinite(item.change) ? (
                    <>
                      {item.change >= 0 ? (
                        <TrendingUp size={9} className="text-positive" />
                      ) : (
                        <TrendingDown size={9} className="text-negative" />
                      )}
                      <span
                        className="text-[14px] font-bold"
                        style={{ color: item.change >= 0 ? pick(POSITIVE, darkMode) : pick(NEGATIVE, darkMode) }}
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
