import { useState, useEffect, useMemo, useRef, lazy, Suspense } from "react";
import { motion } from "framer-motion";
import {
  ArrowRightLeft,
  Loader2,
  AlertCircle,
  ShieldCheck,
  History,
  ChevronDown,
} from "lucide-react";
import MobileBottomNav from "./MobileBottomNav";
import Navbar from "./Navbar";
import PageLoader from "./PageLoader";
import Toast from "./Toast";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { useAuth } from "../context/useAuth";
import { useTheme } from "../context/useTheme";
import { ACCENT, pick, SURFACE, TEXT_MUTED } from "../styles/colors";
import { getUserDisplayName } from "../utils/userUtils";
import { sanitizeInput, addSecurityLog } from "../utils/security";
import { formatRate } from "../utils/formatRate";
import {
  getLatestRates,
  getHistoricalRates,
  getRateFromData,
  recordRateSnapshot,
} from "../services/ExchangeApi";
import { exportConversionHistoryAsCsv } from "../utils/exportCsv";
import {
  CURRENCIES,
  CURRENCY_COUNTRY_CODES,
  getCurrencyInfo,
} from "../utils/currencyData";
import ConvertXIcon from "./exchange/ConvertXIcon";


const CryptoTicker = lazy(() => import("./exchange/CryptoTicker"));
const WatchlistWidget = lazy(() => import("./exchange/WatchlistWidget"));
const SpreadEstimator = lazy(() => import("./exchange/SpreadEstimator"));
const ExchangeFlowChart = lazy(() => import("./exchange/ExchangeFlowChart"));

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05
    }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] }
  }
};

const DEFAULT_CURRENCIES = CURRENCIES;
const HIDDEN_CURRENCIES = new Set(["XDR"]);

function getDisplayRateValue(value) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  if (value >= 1000) {
    return Number(value.toFixed(2));
  }

  if (value >= 1) {
    return Number(value.toFixed(4));
  }

  return Number(value.toFixed(6));
}

function getDeterministicNoise(index, seed) {
  const x = Math.sin(index + seed) * 10000;
  return x - Math.floor(x);
}

function buildWaveChartData(chartData, fallbackRate, from, to) {
  if (chartData.length >= 3) {
    return chartData;
  }

  const baseRate = Number.isFinite(chartData[0]?.rate)
    ? chartData[0].rate
    : fallbackRate;

  if (!Number.isFinite(baseRate) || baseRate <= 0) {
    return [];
  }

  const today = new Date();
  const pairSeed = `${from}${to}`
    .split("")
    .reduce((total, char) => total + char.charCodeAt(0), 0);
  const phase = (pairSeed % 12) / 3;
  
  const amplitude = baseRate * (0.02 + (pairSeed % 5) * 0.005);
  
  const driftDirection = (pairSeed % 2 === 0 ? 1 : -1);
  const driftMagnitude = 0.012 + (pairSeed % 3) * 0.008;

  return Array.from({ length: 30 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (29 - index));

    const wave =
      Math.sin(index / 2.5 + phase) * amplitude * 0.45 +
      Math.cos(index / 6.0 + phase) * amplitude * 0.25;
      
    const gentleDrift = ((index - 29) / 29) * amplitude * driftDirection * driftMagnitude * 10;

    const noiseFactor = getDeterministicNoise(index, pairSeed);
    const dailyNoise = (noiseFactor - 0.5) * amplitude * 0.15;

    const calculatedRate = baseRate + wave + gentleDrift + dailyNoise;

    return {
      date: date.toISOString().slice(0, 10),
      timestamp: date.getTime(),
      rate: index === 29 ? baseRate : calculatedRate,
    };
  });
}

function CurrencyFlag({ code, className = "" }) {
  const countryCode = CURRENCY_COUNTRY_CODES[code];
  const info = getCurrencyInfo(code);

  if (!countryCode || countryCode.length !== 2) {
    return (
      <span className={`text-base leading-none ${className}`}>
        {info.flag}
      </span>
    );
  }

  return (
    <img
      src={`https://flagcdn.com/w40/${countryCode.toLowerCase()}.png`}
      alt=""
      className={`h-4 w-6 rounded-xs object-cover shadow-sm ${className}`}
      loading="lazy"
      decoding="async"
    />
  );
}

function formatInputAmount(val) {
  if (val === undefined || val === null || val === "") return "";
  const parts = String(val).split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.join(".");
}

function CurrencyDropdown({ id, value, options, isOpen, onToggle, onChange }) {
  return (
    <div className="relative">
      <button
        type="button"
        id={`${id}-button`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={`${id}-menu`}
        onClick={onToggle}
        className={`w-full p-3 rounded-xl bg-surface-muted border text-text font-bold outline-none cursor-pointer transition font-sans flex items-center justify-between gap-2 ${
          isOpen
            ? "border-accent ring-1 ring-accent"
            : "border-border"
        }`}
      >
        <span className="min-w-0 truncate font-mono text-sm">
          {value}
        </span>
        <CurrencyFlag code={value} />
        <ChevronDown
          className={`w-4 h-4 shrink-0 text-text-secondary transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div
          id={`${id}-menu`}
          role="listbox"
          aria-labelledby={`${id}-button`}
          className="absolute left-0 top-[calc(100%+0.5rem)] z-50 w-full max-h-72 overflow-y-auto rounded-xl border border-border bg-surface shadow-pop py-1"
        >
          {options.map((code) => {
            const selected = code === value;

            return (
              <button
                type="button"
                key={code}
                role="option"
                aria-selected={selected}
                onClick={() => onChange(code)}
                className={`w-full px-3 py-2.5 text-left font-mono text-sm font-bold flex items-center justify-between gap-2 transition ${
                  selected
                    ? "bg-accent/10 text-accent"
                    : "text-text hover:bg-surface-muted dark:hover:bg-white/10"
                }`}
              >
                <span>{code}</span>
                <CurrencyFlag code={code} />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CustomTooltip({ active, payload, darkMode = false }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;

    return (
      <div className={`bg-surface border border-border backdrop-blur-md rounded-2xl p-4 shadow-pop font-sans text-xs ${darkMode ? "text-text" : "text-text"}`}>
        <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider">
          Date: {data.date}
        </p>
        <p className="text-sm font-black text-text mt-1">
          Rate: <span className="font-mono text-accent">{formatRate(data.rate)}</span>
        </p>
      </div>
    );
  }

  return null;
}

export default function CurrencyConverter() {
  const { user, conversions, addConversion, clearConversions } = useAuth();
  const { darkMode } = useTheme();

  const defaultFrom = user?.preferences?.defaultFrom ? String(user.preferences.defaultFrom) : "USD";
  const defaultTo = user?.preferences?.defaultTo ? String(user.preferences.defaultTo) : "NGN";
  const defaultAmount = user?.preferences?.defaultAmount !== undefined ? user?.preferences?.defaultAmount : 100;
  const decimalPlaces = user?.preferences?.decimalPlaces !== undefined ? user?.preferences?.decimalPlaces : 2;

  const [amount, setAmount] = useState(defaultAmount);
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [rate, setRate] = useState(1);
  const [allRates, setAllRates] = useState({});
  const [, setRateDirection] = useState("neutral");
  const [, setRateDeltaPct] = useState(0);
  const [loading, setLoading] = useState(true);
  const [pageReady, setPageReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      if (!cancelled) setPageReady(true);
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  const [saving, setSaving] = useState(false);
  const previousRateRef = useRef(null);
  const previousPairRef = useRef("");
  const currencyPickerRef = useRef(null);
  const [openCurrencyPicker, setOpenCurrencyPicker] = useState(null);

  const [dashError, setDashError] = useState("");
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [conversionToast, setConversionToast] = useState({ show: false, message: "" });

  const rateLimitTimestampsRef = useRef([]);
  const [chartData, setChartData] = useState([]);



  const currencies = useMemo(() => {
    const availableCurrencies = Array.from(
      new Set([...DEFAULT_CURRENCIES, from, to, ...Object.keys(allRates)])
    );

    const normalizedCurrencies = availableCurrencies.includes("ZWG")
      ? availableCurrencies.filter((code) => code !== "ZWL")
      : availableCurrencies;

    return normalizedCurrencies
      .filter(Boolean)
      .filter((code) => !HIDDEN_CURRENCIES.has(code))
      .sort((a, b) => a.localeCompare(b));
  }, [allRates, from, to]);

  useEffect(() => {
    const handleCloseCurrencyPicker = (event) => {
      if (
        event.type === "keydown" &&
        event.key !== "Escape"
      ) {
        return;
      }

      if (
        event.type === "mousedown" &&
        currencyPickerRef.current?.contains(event.target)
      ) {
        return;
      }

      setOpenCurrencyPicker(null);
    };

    document.addEventListener("mousedown", handleCloseCurrencyPicker);
    document.addEventListener("keydown", handleCloseCurrencyPicker);

    return () => {
      document.removeEventListener("mousedown", handleCloseCurrencyPicker);
      document.removeEventListener("keydown", handleCloseCurrencyPicker);
    };
  }, []);

  const applyLiveRateDataRef = useRef(null);

  const applyLiveRateData = (data, pairFrom, pairTo) => {
    const rates = data?.rates || {};
    const latestRate = getRateFromData(data, pairFrom, pairTo);
    const timestamp = data?.time_last_update_unix
      ? data.time_last_update_unix * 1000
      : Date.now();
    const pairKey = `${pairFrom}/${pairTo}`;
    const previousRate = previousPairRef.current === pairKey ? previousRateRef.current : null;

    setAllRates(rates);
    setRate(latestRate);

    if (Number.isFinite(previousRate) && previousRate > 0 && latestRate !== previousRate) {
      setRateDirection(latestRate > previousRate ? "up" : "down");
      setRateDeltaPct(((latestRate - previousRate) / previousRate) * 100);
    } else {
      setRateDirection("neutral");
      setRateDeltaPct(0);
    }

    previousPairRef.current = pairKey;
    previousRateRef.current = latestRate;
    setChartData(recordRateSnapshot(pairFrom, pairTo, latestRate, timestamp));

    return { rate: latestRate, rates };
  };

  useEffect(() => { applyLiveRateDataRef.current = applyLiveRateData; });

  const updateCurrencyPair = async (newFrom, newTo) => {
    setFrom(newFrom);
    setTo(newTo);
    await fetchRates(newFrom, newTo);
  };

  const fetchRates = async (baseCurrency, targetCurrency) => {
    if (!navigator.onLine) {
      setIsOffline(true);
      return null;
    }

    setLoading(true);
    setDashError("");

    try {
      const data = await getLatestRates(baseCurrency);
      return applyLiveRateData(data, baseCurrency, targetCurrency);
    } catch (err) {
      console.error(err);
      setDashError(err.message || "Failed to fetch live exchange rates. Try again.");
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!from || !to) return;

    let cancelled = false;
    const applyLiveRate = applyLiveRateDataRef.current;

    const loadRates = async () => {
      if (!navigator.onLine) { setIsOffline(true); return; }
      setLoading(true);
      setDashError("");
      try {
        const data = await getLatestRates(from);
        if (!cancelled) applyLiveRate(data, from, to);
      } catch (err) {
        if (!cancelled) {
          console.error(err);
          setDashError(err.message || "Failed to fetch live exchange rates. Try again.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadRates();

    const handleOnline = () => {
      setIsOffline(false);
      setDashError("");
      if (!from) return;
      loadRates();
    };
    const handleOffline = () => {
      setIsOffline(true);
      setDashError("No internet connection detected. Offline Mode.");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    const interval = window.setInterval(async () => {
      if (!navigator.onLine || cancelled) return;
      try {
        const data = await getLatestRates(from);
        if (!cancelled) applyLiveRate(data, from, to);
      } catch (err) {
        if (!cancelled) console.error("Live rate refresh failed:", err);
      }
    }, 60000);

    return () => {
      cancelled = true;
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.clearInterval(interval);
    };
  }, [from, to]);

  useEffect(() => {
    if (!from || !to) return;
    let ignore = false;
    const fetchHistory = async () => {
      try {
        const data = await getHistoricalRates(from, to);
        if (!ignore && data) setChartData(data);
      } catch (err) {
        console.error("Historical data fetch failed:", err);
      }
    };
    fetchHistory();
    return () => { ignore = true; };
  }, [from, to]);

  const swapCurrencies = () => {
    setFrom(to);
    setTo(from);
  };

  const handleExecuteExchange = async () => {
    setDashError("");

    const sanitizedAmountText = sanitizeInput(amount.toString());
    const amt = parseFloat(sanitizedAmountText);

    if (isNaN(amt) || amt <= 0) {
      setDashError("Please enter a valid conversion amount.");
      return;
    }

    const now = Date.now();
    const activeTimestamps = rateLimitTimestampsRef.current.filter((t) => now - t < 10000);
    
    if (activeTimestamps.length >= 5) {
      setDashError("Security rate limit exceeded. Please wait 10 seconds.");
      addSecurityLog(
        user?.email,
        "RATE_LIMIT_BLOCKED",
        "Conversion request blocked by local rate limiter",
        "BLOCKED"
      );
      return;
    }

    rateLimitTimestampsRef.current = [...activeTimestamps, now];

    const latest = await fetchRates(from, to);
    if (!latest?.rate) {
      setDashError("Could not verify the current live exchange rate. Please try again.");
      return;
    }

    const currentRateVal = getDisplayRateValue(latest.rate);
    const result = amt * currentRateVal;

    const logItem = {
      id: `tx_${Date.now()}`,
      timestamp: new Date().toISOString(),
      from,
      to,
      fromAmount: amt,
      toAmount: result,
      rate: currentRateVal,
    };
    setSaving(true);
    await addConversion(logItem);
    setSaving(false);


    addSecurityLog(
      user?.email,
      "CONVERSION_EXECUTED",
      `Exchanged ${amt} ${from} to ${result.toFixed(decimalPlaces)} ${to} securely`,
      "SUCCESS"
    );

    setConversionToast({ show: true, message: `Converted ${amt} ${from} to ${result.toFixed(decimalPlaces)} ${to}` });
  };

  const handlePopularPairClick = (pairStr) => {
    const [pFrom, pTo] = pairStr.split("/");
    if (pFrom && pTo) {
      setFrom(pFrom);
      setTo(pTo);
    }
  };

  const handleClearHistory = () => {
    clearConversions();
    addSecurityLog(user?.email, "HISTORY_CLEARED", "Cleared conversion history ledger", "SUCCESS");
  };

  const recentConversions = conversions;


  const displayRate = getDisplayRateValue(rate);
  const convertedResult = (parseFloat(amount) * displayRate) || 0;
  const waveChartData = useMemo(
    () => buildWaveChartData(chartData, rate, from, to),
    [chartData, from, rate, to]
  );

  const isSyntheticData = chartData.length < 3;

  const rateStats = useMemo(() => {
    if (!waveChartData || waveChartData.length === 0) return { high: rate, low: rate };
    const rates = waveChartData.map((d) => d.rate).filter(Number.isFinite);
    if (rates.length === 0) return { high: rate, low: rate };
    return {
      high: Math.max(...rates),
      low: Math.min(...rates),
    };
  }, [waveChartData, rate]);

  const changePct = useMemo(() => {
    if (!waveChartData || waveChartData.length < 2) return 0;
    const first = waveChartData[0]?.rate;
    const last = waveChartData[waveChartData.length - 1]?.rate;
    if (!Number.isFinite(first) || !Number.isFinite(last) || first === 0) return 0;
    return ((last - first) / first) * 100;
  }, [waveChartData]);

  if (!pageReady) {
    return <PageLoader title="Loading Dashboard" subtitle="Fetching live exchange rates..." />;
  }

  return (
    <div className="min-h-screen bg-canvas text-text transition-colors duration-300 flex flex-col relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-125 h-125 bg-accent/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-125 h-125 bg-accent/10 rounded-full blur-[100px]" />
      </div>

      <Navbar />

      <Suspense fallback={<div className="h-9 w-full bg-surface-muted animate-pulse" />}>
        <CryptoTicker />
      </Suspense>

      <motion.main
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 md:pb-8 space-y-6"
      >
        
        <motion.div variants={itemVariants}>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent/10 text-accent border border-accent/20 text-xs font-bold uppercase tracking-wider mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            Verified Security Protocols Active
          </span>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight font-sans">
            Welcome, {getUserDisplayName(user)}!
          </h2>
          <p className="text-text-secondary text-xs sm:text-sm mt-0.5 font-sans leading-relaxed">
            Calculator outputs sync live with market rates. View live fluctuations on the monthly trend tracker.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-5 gap-6 items-start">
          <div className="lg:col-span-2">
            <motion.div
              variants={itemVariants}
              className="bg-surface border border-border rounded-3xl p-6 shadow-xl backdrop-blur-xl flex flex-col gap-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xl sm:text-2xl font-black font-sans">Calculator Utility</h3>
                
                <button 
                  onClick={swapCurrencies}
                  className="w-10 h-10 rounded-xl bg-surface-muted hover:bg-accent-soft dark:hover:bg-accent-soft border border-border text-text flex items-center justify-center shadow-xs cursor-pointer active:scale-95 transition hover:text-accent hover:border-accent"
                  title="Swap currencies"
                >
                  <ArrowRightLeft className="w-4 h-4" />
                </button>
              </div>

              {(isOffline || dashError) && (
                <div className="p-3 rounded-xl bg-danger-soft border border-danger-border text-negative text-[11px] font-semibold flex items-start gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>{dashError || "Offline mode. Cached rates may apply."}</span>
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="convert-amount" className="block text-[10px] font-bold uppercase tracking-wider text-text-secondary font-sans ml-1">
                    Amount
                  </label>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setAmount("")}
                      className="text-[9px] px-2 py-0.5 rounded-md bg-danger-soft hover:bg-danger/20 text-negative border border-danger-border cursor-pointer font-bold font-sans transition"
                    >
                      Clear
                    </button>
                  </div>
                </div>
                <input
                  id="convert-amount"
                  name="convert-amount"
                  type="text"
                  inputMode="decimal"
                  value={formatInputAmount(amount)}
                  onChange={(e) => {
                    const input = e.target;
                    const selectionStart = input.selectionStart;
                    const oldLength = input.value.length;
                    const raw = input.value.replace(/,/g, "");
                    if (raw === "" || /^\d*\.?\d*$/.test(raw)) {
                      setAmount(raw);
                      setTimeout(() => {
                        const newFormatted = formatInputAmount(raw);
                        const newLength = newFormatted.length;
                        const lengthDiff = newLength - oldLength;
                        let newCursorPos = selectionStart + lengthDiff;
                        newCursorPos = Math.max(0, Math.min(newFormatted.length, newCursorPos));
                        input.setSelectionRange(newCursorPos, newCursorPos);
                      }, 0);
                    }
                  }}
                  className="w-full px-4 py-3 rounded-xl bg-surface-muted border border-border text-text font-mono font-bold text-lg focus:border-accent focus:ring-1 focus:ring-accent outline-none transition"
                  placeholder="Enter amount..."
                />
              </div>

              <div ref={currencyPickerRef} className="grid grid-cols-1 sm:grid-cols-2 gap-4 overflow-visible">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-text-secondary mb-1.5 ml-1 font-sans">
                    From
                  </label>
                  <CurrencyDropdown
                    id="from-currency"
                    value={from}
                    options={currencies}
                    isOpen={openCurrencyPicker === "from"}
                    onToggle={() =>
                      setOpenCurrencyPicker((current) =>
                        current === "from" ? null : "from"
                      )
                    }
                    onChange={(code) => {
                      setOpenCurrencyPicker(null);
                      updateCurrencyPair(code, to);
                    }}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-text-secondary mb-1.5 ml-1 sm:ml-0 sm:mr-1 sm:text-right font-sans">
                    To
                  </label>
                  <CurrencyDropdown
                    id="to-currency"
                    value={to}
                    options={currencies}
                    isOpen={openCurrencyPicker === "to"}
                    onToggle={() =>
                      setOpenCurrencyPicker((current) =>
                        current === "to" ? null : "to"
                      )
                    }
                    onChange={(code) => {
                      setOpenCurrencyPicker(null);
                      setTo(code);
                    }}
                  />
                </div>
              </div>

              <div className="bg-surface-muted border border-border p-5 rounded-2xl shadow-inner relative overflow-hidden flex flex-col gap-3">
                <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-accent/10 rounded-full blur-xl pointer-events-none" />
                
                <div>
                  <span className="text-[10px] font-bold text-text-muted block mb-1 font-sans uppercase tracking-wider">Converted Result</span>
                  
                  <div className="py-2 animate-pulse" style={{ display: loading ? 'block' : 'none' }}>
                    <div className="h-8 w-44 bg-surface-sunken/10 rounded-lg" />
                  </div>
                  
                  <div className="space-y-1" style={{ display: loading ? 'none' : 'block' }}>
                    <div className="text-3xl font-black font-mono text-accent tracking-tight">
                      {convertedResult.toLocaleString(undefined, { minimumFractionDigits: decimalPlaces, maximumFractionDigits: decimalPlaces })} {to}
                    </div>
                    <div className="text-[11px] font-bold text-text-muted font-sans">
                      {Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2 })} {from} = {convertedResult.toLocaleString(undefined, { minimumFractionDigits: decimalPlaces, maximumFractionDigits: decimalPlaces })} {to}
                    </div>
                  </div>
                </div>

                <div className="border-t border-border pt-3 space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-sans">
                    <span className="text-text-muted font-medium">Exchange Rate</span>
                    <span className="font-mono font-bold text-text">
                      1 {from} = {formatRate(displayRate)} {to}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-sans">
                    <span className="text-text-muted font-medium">Inverse Rate</span>
                    <span className="font-mono font-bold text-text-secondary">
                      1 {to} = {displayRate > 0 ? formatRate(1 / displayRate) : "0.00"} {from}
                    </span>
                  </div>
                </div>
              </div>

              <Suspense fallback={<div className="h-40 w-full bg-surface-muted animate-pulse rounded-2xl" />}>
                <SpreadEstimator rate={displayRate} from={from} to={to} amount={amount} />
              </Suspense>

              <button
                onClick={handleExecuteExchange}
                disabled={loading || saving}
                className="w-full bg-primary text-on-primary font-bold py-3 rounded-xl hover:bg-primary-hover active:scale-[0.99] transition duration-200 cursor-pointer disabled:opacity-50 font-sans text-xs flex items-center justify-center gap-2 shadow-primary"
              >
                {saving ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck size={16} />
                    <span>{loading ? "Checking Live Rate..." : "Confirm Conversion & Save"}</span>
                  </>
                )}
              </button>
            </motion.div>
          </div>
 
          <div className="lg:col-span-3 space-y-5">
            <motion.div variants={itemVariants} className="bg-surface border border-border rounded-3xl p-6 shadow-xl backdrop-blur-xl space-y-4">
              <div>
                <h3 className="text-sm font-bold font-sans">Popular Currency Pairs</h3>
                <p className="text-xs text-text-secondary mt-0.5 font-sans">Quickly preset converter values to benchmark markets</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {["USD/NGN", "EUR/USD", "GBP/USD", "BTC/USD"].map((pairStr) => {
                  const [pFrom, pTo] = pairStr.split("/");
                  const isActive = from === pFrom && to === pTo;
                      return (
                     <motion.button
                      key={pairStr}
                      whileHover={{ y: -3, scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handlePopularPairClick(pairStr)}
                      className={`p-3 rounded-2xl border text-center transition-all duration-200 cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
                        isActive
                          ? "border-accent bg-accent/10 text-accent font-bold"
                          : "border-border hover:border-accent/40 text-text bg-surface-muted/60 "
                      }`}
                    >
                      <span className="text-[10px] font-black font-mono text-text-secondary">
                        {pFrom} / {pTo}
                      </span>
                      <span className="text-xs font-bold font-mono">{pairStr}</span>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>

            <motion.div variants={itemVariants}>
              <Suspense fallback={<div className="h-60 w-full bg-surface animate-pulse rounded-3xl" />}>
                <WatchlistWidget baseCurrency={from} />
              </Suspense>
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="bg-surface border border-border rounded-2xl p-5 shadow-xl backdrop-blur-xl"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-positive opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-positive"></span>
                  </span>
                  <h3 className="text-sm font-bold font-sans leading-none">
                    {from}/{to} Rate Trend
                  </h3>
                </div>
                <span className="text-[9px] px-2 py-1 bg-accent/10 text-accent rounded-lg font-bold border border-accent/20 uppercase tracking-widest font-mono">
                  {isSyntheticData ? "30D · Estimated" : "30D · Live"}
                </span>
              </div>

              <div className="grid grid-cols-4 gap-2 mb-4">
                <div className="bg-surface-muted border border-border rounded-xl p-2.5 text-center">
                  <span className="block text-[8px] font-bold text-text-muted uppercase tracking-wider mb-1">Rate</span>
                  <span className="block text-[11px] font-black font-mono text-text truncate">{formatRate(displayRate)}</span>
                </div>
                <div className="bg-surface-muted border border-border rounded-xl p-2.5 text-center">
                  <span className="block text-[8px] font-bold text-text-muted uppercase tracking-wider mb-1">30d Chg</span>
                  <span className={`block text-[11px] font-black font-mono ${
                    changePct >= 0 ? "text-positive" : "text-negative"
                  }`}>
                    {changePct >= 0 ? "+" : ""}{changePct.toFixed(2)}%
                  </span>
                </div>
                <div className="bg-surface-muted border border-border rounded-xl p-2.5 text-center">
                  <span className="block text-[8px] font-bold text-text-muted uppercase tracking-wider mb-1">High</span>
                  <span className="block text-[11px] font-black font-mono text-positive truncate">{formatRate(rateStats.high)}</span>
                </div>
                <div className="bg-surface-muted border border-border rounded-xl p-2.5 text-center">
                  <span className="block text-[8px] font-bold text-text-muted uppercase tracking-wider mb-1">Low</span>
                  <span className="block text-[11px] font-black font-mono text-negative truncate">{formatRate(rateStats.low)}</span>
                </div>
              </div>

              <div className="h-36 w-full relative">
                {(loading || waveChartData.length === 0) && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-text-muted font-sans text-xs">
                    <Loader2 className="w-4 h-4 animate-spin text-accent" />
                    <span>Loading trend data...</span>
                  </div>
                )}
                {!loading && waveChartData.length > 0 && (
                  <ResponsiveContainer width="100%" height={144}>
                    <AreaChart data={waveChartData} margin={{ top: 6, right: 4, left: 10, bottom: 0 }}>
                      <defs>
                        
                      </defs>
                      <CartesianGrid strokeDasharray="3 8" vertical={false} stroke={darkMode ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.08)"} />
                      <XAxis
                        dataKey="date"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: pick(TEXT_MUTED, darkMode), fontSize: 8, fontWeight: 600 }}
                        tickFormatter={(d) => `${d.split("-")[2]}`}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        domain={["auto", "auto"]}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: pick(TEXT_MUTED, darkMode), fontSize: 8, fontWeight: 600 }}
                        tickFormatter={(v) => {
                          if (v === 0) return "0";
                          if (v >= 1000) return v.toFixed(0);
                          if (v >= 10) return v.toFixed(1);
                          if (v >= 1) return v.toFixed(2);
                          if (v >= 0.1) return v.toFixed(3);
                          if (v >= 0.01) return v.toFixed(4);
                          return v.toFixed(6);
                        }}
                        width={55}
                      />
                      <Tooltip content={<CustomTooltip darkMode={darkMode} />} />
                      <Area
                        type="natural"
                        dataKey="rate"
                        stroke={pick(ACCENT, darkMode)}
                        strokeWidth={2.5}
                        fill={pick(ACCENT, darkMode)}
                        fillOpacity={0.2}
                        dot={false}
                        activeDot={{ r: 4, strokeWidth: 2, stroke: pick(SURFACE, darkMode), fill: pick(ACCENT, darkMode) }}
                        isAnimationActive={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="flex items-center justify-center mt-3 pt-3 border-t border-border">
                <div className="px-4 py-1.5 rounded-full bg-surface-muted border border-border shadow-xs flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                  <span className="text-xs font-black font-mono text-accent">
                    1 {from} = {formatRate(displayRate)} {to}
                  </span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        <motion.div variants={itemVariants} className="bg-surface border border-border rounded-3xl p-6 shadow-xl backdrop-blur-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 font-sans text-accent font-bold text-sm">
              <History className="w-4.5 h-4.5" />
              <span>Conversion History</span>
            </div>

            <div className="flex items-center gap-2">
              {recentConversions.length > 0 && (
                <button
                  onClick={() => {
                    const accountName = user?.name?.trim() || user?.firstName?.trim() || getUserDisplayName(user) || "Valued Customer";
                    exportConversionHistoryAsCsv(recentConversions, accountName);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-muted border border-border text-[10px] font-bold text-text-secondary hover:border-accent hover:text-accent transition cursor-pointer font-sans"
                  title="Export printable statement"
                >
                  <ConvertXIcon size={11} />
                  Export Statement
                </button>
              )}
              {recentConversions.length > 0 && (
                <button
                  onClick={handleClearHistory}
                  className="text-[10px] font-bold text-negative hover:text-negative hover:underline transition bg-transparent border-none cursor-pointer"
                >
                  Clear History
                </button>
              )}
            </div>
          </div>

          {recentConversions.length === 0 ? (
            <div className="py-8 text-center border border-dashed border-border rounded-2xl bg-surface-muted/60 text-text-secondary text-xs font-semibold font-sans">
              No conversions logged. Enter values in the converter and click "Confirm Conversion &amp; Save" above to save your first trade.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-border">
              <table className="w-full text-left text-xs font-sans">
                <thead>
                  <tr className="bg-surface-muted text-text-secondary uppercase tracking-wider font-bold">
                    <th className="px-4 py-3">Date &amp; Time</th>
                    <th className="px-4 py-3">Exchanged Amount</th>
                    <th className="px-4 py-3">Received Amount</th>
                    <th className="px-4 py-3 text-right">Execution Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border font-semibold">
                  {recentConversions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-surface-muted/60 dark:hover:bg-white/5 transition">
                      <td className="px-4 py-2.5 text-text-secondary text-[11px]">
                        {new Date(tx.timestamp).toLocaleString()}
                      </td>
                      <td className="px-4 py-2.5 text-text font-mono">
                        {tx.fromAmount.toLocaleString(undefined, { minimumFractionDigits: decimalPlaces, maximumFractionDigits: decimalPlaces })} {tx.from}
                      </td>
                      <td className="px-4 py-2.5 text-positive font-mono">
                        +{tx.toAmount.toLocaleString(undefined, { minimumFractionDigits: decimalPlaces, maximumFractionDigits: decimalPlaces })} {tx.to}
                      </td>
                      <td className="px-4 py-2.5 text-right text-text-secondary font-mono text-[11px]">
                        1 {tx.from} = {formatRate(tx.rate)} {tx.to}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>

        {recentConversions.length > 0 && (
          <motion.div variants={itemVariants}>
            <Suspense fallback={<div className="h-48 w-full bg-surface animate-pulse rounded-3xl" />}>
              <ExchangeFlowChart
                recentConversions={recentConversions}
                chartData={chartData}
                from={from}
                to={to}
                loading={loading}
              />
            </Suspense>
          </motion.div>
        )}

      </motion.main>

      <footer className="hidden md:block border-t border-border py-6 mb-16 md:mb-0">
        <div className="max-w-7xl mx-auto px-4 text-center text-[10px] text-text-muted font-sans">
          <p>© {new Date().getFullYear()} ConvertX Platform. Rates are sourced securely under 256-bit SSL encryption. All rights reserved.</p>
        </div>
      </footer>

      <MobileBottomNav />

      <Toast
        show={conversionToast.show}
        type="success"
        variant="toast"
        title="Conversion Successful"
        message={conversionToast.message}
        duration={3000}
        onClose={() => setConversionToast({ show: false, message: "" })}
      />
    </div>
  );
}
