import { useState } from "react";
import { Bell, Trash2, AlertCircle } from "lucide-react";
import { formatRate } from "../../utils/formatRate";

export default function RateAlert({
  activePair = { from: "USD", to: "NGN" },
  currentRate,
  alerts = [],
  onCreateAlert,
  onDeleteAlert,
}) {
  const [targetRate, setTargetRate] = useState("");
  const [condition, setCondition] = useState("Above");
  const [errorText, setErrorText] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorText("");

    const parsedRate = parseFloat(targetRate);
    if (isNaN(parsedRate) || parsedRate <= 0) {
      setErrorText("Please enter a valid target rate greater than 0.");
      return;
    }

    if (onCreateAlert) {
      onCreateAlert({
        targetRate: parsedRate,
        condition,
        from: activePair.from,
        to: activePair.to,
      });
      setTargetRate("");
    }
  };

  return (
    <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="text-[#E88F2B]" size={18} />
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Rate Alerts</h2>
        </div>
        {activePair.from && activePair.to && (
          <span className="text-xs text-slate-500 dark:text-slate-400 px-3 py-1 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-full font-mono">
            Current {activePair.from}/{activePair.to}: {currentRate !== null && currentRate !== undefined ? formatRate(currentRate) : "--"}
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid md:grid-cols-3 gap-4">
          <div className="relative flex items-center">
            <input
              type="number"
              step="any"
              value={targetRate}
              onChange={(e) => setTargetRate(e.target.value)}
              placeholder="Target Rate"
              className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 outline-none text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-[#E88F2B]/50 transition-colors"
            />
            {activePair.to && (
              <span className="absolute right-4 text-xs text-slate-400 font-bold pointer-events-none">
                {activePair.to}
              </span>
            )}
          </div>

          <select
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
            className="bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-700 dark:text-slate-300 outline-none focus:border-[#E88F2B]/50 transition-colors cursor-pointer"
          >
            <option value="Above">Above</option>
            <option value="Below">Below</option>
          </select>

          <button
            type="submit"
            className="bg-[#E88F2B] hover:bg-[#d97706] text-black rounded-xl px-4 py-3 font-semibold transition active:scale-97 cursor-pointer"
          >
            Create Alert
          </button>
        </div>

        {errorText && (
          <p className="text-rose-400 text-xs flex items-center gap-1">
            <AlertCircle size={12} /> {errorText}
          </p>
        )}
      </form>

      <div className="space-y-3 pt-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Your Alerts ({alerts.length})
        </h3>

        {!alerts.length ? (
          <div className="text-center py-6 text-slate-500 text-sm border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
            No rate alerts created yet.
          </div>
        ) : (
          <div className="max-h-60 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className="flex items-center justify-between p-4 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 rounded-2xl hover:border-slate-300 dark:hover:border-slate-700/50 transition-all duration-200"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      alert.status === "active"
                        ? "bg-emerald-400 animate-pulse"
                        : "bg-slate-400"
                    }`}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900 dark:text-slate-200">
                        {alert.from}/{alert.to}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                          alert.condition === "Above"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-[#E88F2B]/10 text-[#E88F2B]"
                        }`}
                      >
                        {alert.condition}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Target Rate:{" "}
                      <span className="text-slate-900 dark:text-slate-200 font-mono font-semibold">
                        {formatRate(alert.targetRate)}
                      </span>
                      {alert.status === "triggered" && (
                        <span className="text-amber-400 font-medium ml-2">
                          (Triggered)
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => onDeleteAlert && onDeleteAlert(alert.id)}
                  className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-200 dark:hover:bg-slate-900 transition-colors cursor-pointer"
                  title="Delete alert"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
