import { useState, useEffect, useCallback, useRef } from "react";
import {
  TrendingUp,
  TrendingDown,
  Plus,
  X,
  RefreshCw,
  Eye,
  AlertCircle,
} from "lucide-react";
import { getMultiRates } from "../../services/ExchangeApi";
import { CURRENCY_INFO } from "../../utils/currencyData";

const DEFAULT_WATCHLIST = ["EUR", "GBP", "JPY", "CAD", "AUD", "CHF", "NGN"];
const AVAILABLE_CURRENCIES = [
  "EUR","GBP","JPY","CAD","AUD","CHF","NGN","CNY","INR","ZAR","AED","BTC",
  "SEK","NOK","MXN","SGD","HKD","TRY","BRL","KRW",
];

function formatWatchRate(val) {
  if (val == null) return "--";
  if (val >= 1000) return val.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (val >= 1)    return val.toFixed(4);
  return val.toFixed(6);
}

export default function WatchlistWidget({ baseCurrency = "USD" }) {
  const [watchlist, setWatchlist] = useState(() => {
    const saved = localStorage.getItem("convertx_watchlist");
    return saved ? JSON.parse(saved) : DEFAULT_WATCHLIST;
  });

  const [rates, setRates]       = useState({});
  const [prevRates, setPrevRates] = useState({});
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(false);
  const [showAdd, setShowAdd]   = useState(false);
  const [search, setSearch]     = useState("");
  const ratesRef = useRef({});

  const fetchRates = useCallback(async () => {
    if (watchlist.length === 0) return;
    setLoading(true);
    setError(false);
    try {
      setPrevRates(ratesRef.current);
      const data = await getMultiRates(baseCurrency, watchlist);
      ratesRef.current = data;
      setRates(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [baseCurrency, watchlist]);

  useEffect(() => {
    const initialFetch = setTimeout(fetchRates, 0);
    const interval = setInterval(fetchRates, 30_000);
    return () => {
      clearTimeout(initialFetch);
      clearInterval(interval);
    };
  }, [fetchRates]);

  useEffect(() => {
    localStorage.setItem("convertx_watchlist", JSON.stringify(watchlist));
  }, [watchlist]);

  const addCurrency = (code) => {
    if (!watchlist.includes(code)) {
      setWatchlist((prev) => [...prev, code]);
    }
    setShowAdd(false);
    setSearch("");
  };

  const removeCurrency = (code) => {
    setWatchlist((prev) => prev.filter((c) => c !== code));
  };

  const filteredAvailable = AVAILABLE_CURRENCIES.filter(
    (c) =>
      !watchlist.includes(c) &&
      (c.toLowerCase().includes(search.toLowerCase()) ||
        CURRENCY_INFO[c]?.name?.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-3xl p-5 shadow-xl backdrop-blur-xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Eye size={15} className="text-[#E88F2B]" />
          <h3 className="text-sm font-bold font-sans">Watchlist</h3>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-sans">
            vs {baseCurrency}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={fetchRates}
            title="Refresh watchlist"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-[#E88F2B] hover:bg-slate-100 dark:hover:bg-white/5 transition cursor-pointer"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          </button>

          <button
            onClick={() => setShowAdd((v) => !v)}
            title="Add currency"
            className="w-7 h-7 rounded-lg flex items-center justify-center bg-[#E88F2B]/10 text-[#E88F2B] hover:bg-[#E88F2B]/20 transition cursor-pointer border border-[#E88F2B]/20"
          >
            <Plus size={13} />
          </button>
        </div>
      </div>

      {showAdd && (
        <div className="mb-3 bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-2xl p-3 space-y-2">
          <input
            id="watchlist-search"
            name="watchlist-search"
            type="text"
            placeholder="Search currency..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10 text-xs font-sans text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#E88F2B] transition"
            autoFocus
          />
          <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
            {filteredAvailable.slice(0, 20).map((code) => (
              <button
                key={code}
                onClick={() => addCurrency(code)}
                className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:border-[#E88F2B] hover:text-[#E88F2B] transition cursor-pointer font-mono"
              >
                {code}
              </button>
            ))}
            {filteredAvailable.length === 0 && (
              <p className="text-[10px] text-slate-400 px-1">No results</p>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-1.5 text-[10px] text-rose-400 mb-3">
          <AlertCircle size={11} />
          <span>Failed to fetch live rates</span>
        </div>
      )}

      {watchlist.length === 0 ? (
        <p className="text-center text-xs text-slate-400 dark:text-slate-500 py-4 font-sans">
          No currencies in watchlist. Add one above.
        </p>
      ) : (
        <div className="space-y-1.5">
          {watchlist.map((code) => {
            const rate = rates[code];
            const prev = prevRates[code];
            const changed = prev != null && rate != null && rate !== prev;
            const up = changed && rate > prev;

            return (
              <div
                key={code}
                className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-white/10 flex items-center justify-center shrink-0">
                    <span className="text-[10px] font-black text-slate-600 dark:text-slate-300">
                      {code.slice(0, 2)}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black font-mono text-slate-800 dark:text-slate-100">
                      {code}
                    </p>
                    <p className="text-[9px] text-slate-400 dark:text-slate-500 font-sans truncate">
                      {CURRENCY_INFO[code]?.name ?? code}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {loading && rate == null ? (
                    <span className="w-14 h-3 bg-slate-200 dark:bg-white/10 rounded animate-pulse" />
                  ) : (
                    <span
                      className={`text-xs font-mono font-bold tabular-nums transition-colors duration-500 ${
                        changed
                          ? up
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-rose-600 dark:text-rose-400"
                          : "text-slate-700 dark:text-slate-200"
                      }`}
                    >
                      {formatWatchRate(rate)}
                    </span>
                  )}

                  {changed && (
                    <span className={up ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}>
                      {up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                    </span>
                  )}

                  <button
                    onClick={() => removeCurrency(code)}
                    className="w-5 h-5 rounded-md flex items-center justify-center text-slate-300 dark:text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 transition opacity-0 group-hover:opacity-100 cursor-pointer"
                    title="Remove"
                  >
                    <X size={10} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-[9px] text-slate-400 dark:text-slate-600 mt-3 font-sans text-right">
        Auto-refreshes every 30s
      </p>
    </div>
  );
}
