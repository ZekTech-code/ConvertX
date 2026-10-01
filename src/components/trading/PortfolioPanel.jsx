import { useMemo } from "react";
import { Wallet, TrendingUp, TrendingDown, X } from "lucide-react";
import { getCoinIcon } from "../../utils/coinIcons";
import { ACCENT, BORDER, NEGATIVE, pick, POSITIVE, SURFACE, SURFACE_MUTED } from "../../styles/colors";

export default function PortfolioPanel({ balance, positions, getPositionPnL, portfolioValue, totalPnL, initialBalance, darkMode, onClosePosition }) {
  const totalValue = useMemo(() => portfolioValue(), [portfolioValue]);
  const pnl = useMemo(() => totalPnL(), [totalPnL]);
  const pnlPercent = initialBalance > 0 ? ((totalValue - initialBalance) / initialBalance) * 100 : 0;

  const tc = (dark, light) => ({ color: darkMode ? dark : light });

  const formatPrice = (p) => {
    if (!p && p !== 0) return "---";
    if (Math.abs(p) > 1000) return p.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (Math.abs(p) > 1) return p.toFixed(4);
    return p.toFixed(6);
  };

  return (
    <div
      className="rounded-2xl p-4 flex h-full w-full flex-col gap-3"
      style={{
        background: pick(SURFACE, darkMode),
        border: "1px solid " + pick(BORDER, darkMode),
      }}
    >
      <div className="flex items-center gap-2 mb-1">
        <Wallet size={18} className="text-accent" />
        <span className="text-lg font-black uppercase tracking-wider" style={tc("#94a3b8", "#475569")}>
          Portfolio
        </span>
      </div>

      {positions.length > 0 && (
        <div
          className="rounded-xl p-3"
          style={{
            background: pick(SURFACE_MUTED, darkMode),
            border: "1px solid " + pick(BORDER, darkMode),
          }}
        >
          <span className="text-[13px] font-bold block mb-2" style={tc("#64748b", "#475569")}>Allocation</span>
          <div className="h-2 rounded-full overflow-hidden flex gap-0.5" style={{ background: pick(SURFACE_MUTED, darkMode) }}>
            <div className="h-full rounded-full" style={{ width: `${(balance / totalValue) * 100}%`, background: pick(ACCENT, darkMode) }} title={`Cash: ${((balance / totalValue) * 100).toFixed(1)}%`} />
            {positions.map((pos, i) => {
              const posVal = getPositionPnL(pos.id);
              const pct = posVal ? (posVal.currentValue / totalValue) * 100 : 0;
              const colors = ["#3b82f6", pick(POSITIVE, darkMode), "#a855f7", pick(NEGATIVE, darkMode), "#14b8a6", "#f59e0b", "#ec4899"];
              return <div key={pos.id} className="h-full rounded-full" style={{ width: `${pct}%`, background: colors[i % colors.length] }} title={`${pos.assetSymbol}: ${pct.toFixed(1)}%`} />;
            })}
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full" style={{ background: pick(ACCENT, darkMode) }} />
              <span className="text-[11px] font-bold" style={tc("#64748b", "#475569")}>Cash {((balance / totalValue) * 100).toFixed(1)}%</span>
            </div>
            {positions.map((pos, i) => {
              const posVal = getPositionPnL(pos.id);
              const pct = posVal ? (posVal.currentValue / totalValue) * 100 : 0;
              const colors = ["#3b82f6", pick(POSITIVE, darkMode), "#a855f7", pick(NEGATIVE, darkMode), "#14b8a6", "#f59e0b", "#ec4899"];
              return (
                <div key={pos.id} className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full" style={{ background: colors[i % colors.length] }} />
                  <span className="text-[11px] font-bold" style={tc("#64748b", "#475569")}>{pos.assetSymbol} {pct.toFixed(1)}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div
        className="rounded-xl p-3 flex items-center justify-between"
        style={{
          background: pnl.total >= 0 ? "rgba(34,197,94,0.06)" : "rgba(239,68,68,0.06)",
          border: `1px solid ${pnl.total >= 0 ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)"}`,
        }}
      >
        <div>
          <span className="text-[13px] font-bold block" style={tc("#64748b", "#475569")}>Total P&L</span>
          <div className="flex items-center gap-2">
            <span
              className="text-base font-mono font-black"
              style={{ color: pnl.total >= 0 ? pick(POSITIVE, darkMode) : pick(NEGATIVE, darkMode) }}
            >
              {pnl.total >= 0 ? "+" : ""}${pnl.total.toFixed(2)}
            </span>
            <span
              className="text-[14px] font-bold"
              style={{ color: pnlPercent >= 0 ? pick(POSITIVE, darkMode) : pick(NEGATIVE, darkMode) }}
            >
              ({pnlPercent >= 0 ? "+" : ""}{pnlPercent.toFixed(2)}%)
            </span>
          </div>
        </div>
        {pnl.total >= 0 ? (
          <TrendingUp size={20} className="text-positive" />
        ) : (
          <TrendingDown size={20} className="text-negative" />
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="text-center">
          <span className="text-[13px] font-bold block" style={tc("#64748b", "#475569")}>Realized</span>
          <span
            className="text-sm font-mono font-bold"
            style={{ color: pnl.realized >= 0 ? pick(POSITIVE, darkMode) : pick(NEGATIVE, darkMode) }}
          >
            {pnl.realized >= 0 ? "+" : ""}${pnl.realized.toFixed(2)}
          </span>
        </div>
        <div className="text-center">
          <span className="text-[13px] font-bold block" style={tc("#64748b", "#475569")}>Unrealized</span>
          <span
            className="text-sm font-mono font-bold"
            style={{ color: pnl.unrealized >= 0 ? pick(POSITIVE, darkMode) : pick(NEGATIVE, darkMode) }}
          >
            {pnl.unrealized >= 0 ? "+" : ""}${pnl.unrealized.toFixed(2)}
          </span>
        </div>
      </div>

      {positions.length > 0 && (
        <div className="space-y-2">
          <span className="text-[14px] font-bold uppercase tracking-wider" style={tc("#64748b", "#475569")}>
            Open Positions ({positions.length})
          </span>
          {positions.map((pos) => {
            const posPnL = getPositionPnL(pos.id);
            if (!posPnL) return null;
            return (
              <div
                key={pos.id}
                className="rounded-xl p-3 flex items-center justify-between"
                style={{
                  background: pick(SURFACE_MUTED, darkMode),
                  border: "1px solid " + pick(BORDER, darkMode),
                }}
              >
                <div className="flex items-center gap-2.5">
                  <img src={getCoinIcon(pos.assetId)} alt="" width={34} height={34} className="rounded-full object-cover" style={{width: 34, height: 34}} />
                  <div>
                    <span className="text-sm font-black" style={tc("#e2e8f0", "#1e293b")}>{pos.assetSymbol}</span>
                    <div className="text-[14px]" style={tc("#64748b", "#475569")}>
                      {pos.quantity.toFixed(pos.quantity > 1 ? 4 : 8)} @ ${formatPrice(pos.avgPrice)}
                    </div>
                    <div className="text-[14px]" style={tc("#94a3b8", "#475569")}>
                      Current: ${formatPrice(posPnL.currentValue / pos.quantity)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <span
                      className="text-sm font-mono font-bold block"
                      style={{ color: posPnL.unrealized >= 0 ? pick(POSITIVE, darkMode) : pick(NEGATIVE, darkMode) }}
                    >
                      {posPnL.unrealized >= 0 ? "+" : ""}${posPnL.unrealized.toFixed(2)}
                    </span>
                    <span
                      className="text-[14px] font-bold"
                      style={{ color: posPnL.percentChange >= 0 ? pick(POSITIVE, darkMode) : pick(NEGATIVE, darkMode) }}
                    >
                      {posPnL.percentChange >= 0 ? "+" : ""}{posPnL.percentChange.toFixed(2)}%
                    </span>
                  </div>
                  <button
                    onClick={() => onClosePosition(pos.id)}
                    className="w-6 h-6 rounded-lg flex items-center justify-center bg-danger-soft hover:bg-danger/20 transition-all cursor-pointer"
                    title="Close position"
                  >
                    <X size={10} className="text-negative" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {positions.length === 0 && (
        <div className="text-center py-4">
          <p className="text-[15px]" style={tc("#64748b", "#475569")}>No open positions</p>
          <p className="text-[14px]" style={tc("#475569", "#64748b")}>Place a trade to start building your portfolio</p>
        </div>
      )}
    </div>
  );
}
