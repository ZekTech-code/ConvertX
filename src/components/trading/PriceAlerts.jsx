import { useState, useCallback } from "react";
import { Bell, BellOff, Plus, Trash2, TrendingUp, TrendingDown, CheckCircle } from "lucide-react";
import { getCoinIcon } from "../../utils/coinIcons";
import { ACCENT, accentAlpha, BORDER, pick, PRIMARY, SURFACE, SURFACE_MUTED, TEXT, TEXT_SECONDARY } from "../../styles/colors";

export default function PriceAlerts({ alerts, selectedAsset, currentPrice, darkMode, onAddAlert, onRemoveAlert }) {
  const [showForm, setShowForm] = useState(false);
  const [targetPrice, setTargetPrice] = useState("");
  const [condition, setCondition] = useState("above");
  const [asset] = useState(selectedAsset);
  const [deleteToast, setDeleteToast] = useState(null);

  const tc = (dark, light) => ({ color: darkMode ? dark : light });

  const handleRemove = useCallback((alertId) => {
    onRemoveAlert(alertId);
    setDeleteToast("Alert deleted");
    setTimeout(() => setDeleteToast(null), 2500);
  }, [onRemoveAlert]);

  const handleSubmit = () => {
    if (!asset || !targetPrice) return;
    const price = parseFloat(targetPrice);
    if (!Number.isFinite(price) || price <= 0) return;

    onAddAlert({
      assetId: asset.id,
      assetSymbol: asset.symbol,
      assetName: asset.name,
      targetPrice: price,
      condition,
    });
    setTargetPrice("");
    setShowForm(false);
  };

  const formatPrice = (p) => {
    if (!p) return "---";
    if (p > 1000) return p.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (p > 1) return p.toFixed(4);
    return p.toFixed(6);
  };

  const activeAlerts = alerts.filter((a) => !a.triggered);
  const triggeredAlerts = alerts.filter((a) => a.triggered);

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
          <Bell size={18} className="text-accent" />
          <span className="text-lg font-black uppercase tracking-wider" style={tc("#94a3b8", "#475569")}>
            Price Alerts
          </span>
          {activeAlerts.length > 0 && (
            <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-md bg-accent/10 text-accent">
              {activeAlerts.length}
            </span>
          )}
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="p-1.5 rounded-lg transition-all cursor-pointer"
          style={{
            background: showForm ? accentAlpha(darkMode, 0.14) : pick(SURFACE_MUTED, darkMode),
            border: showForm ? `1px solid ${accentAlpha(darkMode, 0.32)}` : "1px solid " + pick(BORDER, darkMode),
            color: pick(ACCENT, darkMode),
          }}
        >
          <Plus size={14} />
        </button>
      </div>

      {showForm && (
        <div
          className="rounded-xl p-3 space-y-2"
          style={{
            background: pick(SURFACE_MUTED, darkMode),
            border: "1px solid " + pick(BORDER, darkMode),
          }}
        >
          <div>
            <label className="text-[13px] font-bold uppercase tracking-wider block mb-1" style={tc("#64748b", "#475569")}>
              Condition
            </label>
            <div className="flex gap-2">
              {["above", "below"].map((c) => (
                <button
                  key={c}
                  onClick={() => setCondition(c)}
                  className="flex-1 py-2 rounded-lg text-[13px] font-bold uppercase transition-all cursor-pointer flex items-center justify-center gap-1"
                  style={{
                    background: condition === c ? pick(PRIMARY, darkMode) : "transparent",
                    border: condition === c ? "1px solid " + pick(PRIMARY, darkMode) : "1px solid " + pick(BORDER, darkMode),
                    color: condition === c ? "#ffffff" : pick(TEXT_SECONDARY, darkMode),
                  }}
                >
                  {c === "above" ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label htmlFor="price-alert-target" className="text-[13px] font-bold uppercase tracking-wider block mb-1" style={tc("#64748b", "#475569")}>
              Target Price (USD)
            </label>
            <input
              id="price-alert-target"
              name="price-alert-target"
              type="number"
              value={targetPrice}
              onChange={(e) => setTargetPrice(e.target.value)}
              placeholder={formatPrice(currentPrice)}
              min="0"
              step="0.01"
              className="w-full px-3 py-2 rounded-xl text-sm font-mono font-bold outline-none"
              style={{
                background: pick(SURFACE_MUTED, darkMode),
                border: "1px solid " + pick(BORDER, darkMode),
                color: pick(TEXT, darkMode),
              }}
            />
          </div>
          <button
            onClick={handleSubmit}
            disabled={!targetPrice}
            className="w-full py-2 rounded-xl text-[13px] font-black uppercase tracking-wider transition-all cursor-pointer disabled:opacity-40"
            style={{
              background: pick(ACCENT, darkMode),
              color: "#ffffff",
            }}
          >
            Set Alert
          </button>
        </div>
      )}

      {activeAlerts.length === 0 && triggeredAlerts.length === 0 && (
        <div className="text-center py-3">
          <BellOff size={24} className="mx-auto mb-2" style={tc("#475569", "#94a3b8")} />
          <p className="text-[14px]" style={tc("#64748b", "#475569")}>No alerts set</p>
          <p className="text-[13px]" style={tc("#475569", "#64748b")}>Get notified when price hits your target</p>
        </div>
      )}

      {activeAlerts.map((alert) => (
        <div
          key={alert.id}
          className="flex items-center justify-between px-3 py-2 rounded-lg"
          style={{
            background: pick(SURFACE_MUTED, darkMode),
            border: "1px solid " + pick(BORDER, darkMode),
          }}
        >
          <div className="flex items-center gap-2">
            <img src={getCoinIcon(alert.assetId)} alt="" width={24} height={24} className="rounded-full" style={{width: 24, height: 24}} />
            <div>
              <span className="text-[14px] font-bold" style={tc("#e2e8f0", "#1e293b")}>{alert.assetSymbol}</span>
              <div className="text-[13px]" style={tc("#64748b", "#475569")}>
                {alert.condition === "above" ? <TrendingUp size={10} className="inline mr-1 text-positive" /> : <TrendingDown size={10} className="inline mr-1 text-negative" />}
                {alert.condition} ${formatPrice(alert.targetPrice)}
              </div>
            </div>
          </div>
          <button
            onClick={() => handleRemove(alert.id)}
            className="p-1.5 rounded-lg bg-danger-soft hover:bg-danger/20 transition-all cursor-pointer"
          >
            <Trash2 size={12} className="text-negative" />
          </button>
        </div>
      ))}

      {triggeredAlerts.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-[13px] font-bold uppercase tracking-wider" style={tc("#64748b", "#475569")}>
            Triggered
          </span>
          {triggeredAlerts.slice(0, 5).map((alert) => (
            <div
              key={alert.id}
              className="flex items-center justify-between px-3 py-2 rounded-lg"
              style={{
                background: "rgba(34,197,94,0.06)",
                border: "1px solid rgba(34,197,94,0.15)",
              }}
            >
              <div className="flex items-center gap-2">
                <img src={getCoinIcon(alert.assetId)} alt="" width={20} height={20} className="rounded-full" style={{width: 20, height: 20}} />
                <div>
                  <span className="text-[13px] font-bold text-positive">
                    {alert.assetSymbol} {alert.condition} ${formatPrice(alert.targetPrice)}
                  </span>
                  {alert.triggeredAt && (
                    <span className="text-[11px] block" style={tc("#64748b", "#475569")}>
                      {new Date(alert.triggeredAt).toLocaleTimeString()}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => handleRemove(alert.id)}
                className="p-1 rounded cursor-pointer"
              >
                <Trash2 size={10} className="text-negative/50" />
              </button>
            </div>
          ))}
        </div>
      )}

      {deleteToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-2 px-4 py-2.5 rounded-xl bg-success-soft border border-success-border shadow-pop backdrop-blur-xl animate-[fadeIn_0.2s_ease]">
          <CheckCircle size={14} className="text-positive" />
          <span className="text-xs font-bold text-positive">{deleteToast}</span>
        </div>
      )}
    </div>
  );
}
