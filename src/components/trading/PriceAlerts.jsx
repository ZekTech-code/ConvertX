import { useState, useCallback } from "react";
import { Bell, BellOff, Plus, Trash2, TrendingUp, TrendingDown, CheckCircle } from "lucide-react";
import { getCoinIcon } from "../../utils/coinIcons";

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
        background: darkMode ? "rgba(255,255,255,0.02)" : "rgba(15,23,42,0.02)",
        border: darkMode ? "1px solid rgba(255,255,255,0.05)" : "1px solid rgba(148,163,184,0.12)",
      }}
    >
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Bell size={18} className="text-[#E88F2B]" />
          <span className="text-lg font-black uppercase tracking-wider" style={tc("#94a3b8", "#475569")}>
            Price Alerts
          </span>
          {activeAlerts.length > 0 && (
            <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-md bg-[#E88F2B]/10 text-[#E88F2B]">
              {activeAlerts.length}
            </span>
          )}
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="p-1.5 rounded-lg transition-all cursor-pointer"
          style={{
            background: showForm ? "rgba(232,143,43,0.15)" : darkMode ? "rgba(255,255,255,0.04)" : "rgba(15,23,42,0.04)",
            border: showForm ? "1px solid rgba(232,143,43,0.3)" : darkMode ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(148,163,184,0.1)",
            color: "#E88F2B",
          }}
        >
          <Plus size={14} />
        </button>
      </div>

      {showForm && (
        <div
          className="rounded-xl p-3 space-y-2"
          style={{
            background: darkMode ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.03)",
            border: darkMode ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(148,163,184,0.1)",
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
                    background: condition === c ? "rgba(232,143,43,0.12)" : "transparent",
                    border: condition === c ? "1px solid rgba(232,143,43,0.25)" : darkMode ? "1px solid rgba(255,255,255,0.03)" : "1px solid rgba(148,163,184,0.08)",
                    color: condition === c ? "#E88F2B" : darkMode ? "#64748b" : "#475569",
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
                background: darkMode ? "rgba(255,255,255,0.04)" : "rgba(15,23,42,0.04)",
                border: darkMode ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(148,163,184,0.15)",
                color: darkMode ? "#f1f5f9" : "#0f172a",
              }}
            />
          </div>
          <button
            onClick={handleSubmit}
            disabled={!targetPrice}
            className="w-full py-2 rounded-xl text-[13px] font-black uppercase tracking-wider transition-all cursor-pointer disabled:opacity-40"
            style={{
              background: "linear-gradient(135deg, #E88F2B, #d97706)",
              color: "#000",
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
            background: darkMode ? "rgba(255,255,255,0.02)" : "rgba(15,23,42,0.02)",
            border: darkMode ? "1px solid rgba(255,255,255,0.04)" : "1px solid rgba(148,163,184,0.08)",
          }}
        >
          <div className="flex items-center gap-2">
            <img src={getCoinIcon(alert.assetId)} alt="" width={24} height={24} className="rounded-full" style={{width: 24, height: 24}} />
            <div>
              <span className="text-[14px] font-bold" style={tc("#e2e8f0", "#1e293b")}>{alert.assetSymbol}</span>
              <div className="text-[13px]" style={tc("#64748b", "#475569")}>
                {alert.condition === "above" ? <TrendingUp size={10} className="inline mr-1 text-green-400" /> : <TrendingDown size={10} className="inline mr-1 text-red-400" />}
                {alert.condition} ${formatPrice(alert.targetPrice)}
              </div>
            </div>
          </div>
          <button
            onClick={() => handleRemove(alert.id)}
            className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 transition-all cursor-pointer"
          >
            <Trash2 size={12} className="text-red-400" />
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
                  <span className="text-[13px] font-bold text-green-400">
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
                <Trash2 size={10} className="text-red-400/50" />
              </button>
            </div>
          ))}
        </div>
      )}

      {deleteToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-500/10 border border-green-500/20 shadow-lg shadow-green-500/10 backdrop-blur-xl animate-[fadeIn_0.2s_ease]">
          <CheckCircle size={14} className="text-green-500" />
          <span className="text-xs font-bold text-green-500">{deleteToast}</span>
        </div>
      )}
    </div>
  );
}
