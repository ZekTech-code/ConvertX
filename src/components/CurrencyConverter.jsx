import { useState, useEffect, useMemo, useRef, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRightLeft,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  ShieldCheck,
  History,
  ChevronDown,
} from "lucide-react";
import MobileBottomNav from "./MobileBottomNav";
import Navbar from "./Navbar";
import PageLoader from "./PageLoader";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { useTheme } from "../context/useTheme";
import { useAuth } from "../context/useAuth";
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
import { AVATARS } from "../Data/avatars.jsx";


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
  
  // Calculate a realistic amplitude: 2% to 4% of base rate
  const amplitude = baseRate * (0.02 + (pairSeed % 5) * 0.005);
  
  // Ensure a realistic drift direction and magnitude
  const driftDirection = (pairSeed % 2 === 0 ? 1 : -1);
  const driftMagnitude = 0.012 + (pairSeed % 3) * 0.008; // 1.2% to 2.8% over 30 days

  return Array.from({ length: 30 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (29 - index));

    // Sinusoidal fluctuations
    const wave =
      Math.sin(index / 2.5 + phase) * amplitude * 0.45 +
      Math.cos(index / 6.0 + phase) * amplitude * 0.25;
      
    // Linear drift trend
    const gentleDrift = ((index - 29) / 29) * amplitude * driftDirection * driftMagnitude * 10;

    // Deterministic daily market noise (between -0.06% and +0.06%)
    const noiseFactor = getDeterministicNoise(index, pairSeed);
    const dailyNoise = (noiseFactor - 0.5) * amplitude * 0.15;

    // Daily rate with noise
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
        className={`w-full p-3 rounded-xl bg-slate-50 dark:bg-black/35 border text-slate-800 dark:text-white font-bold outline-none cursor-pointer transition font-sans flex items-center justify-between gap-2 ${
          isOpen
            ? "border-[#E88F2B] ring-1 ring-[#E88F2B]"
            : "border-slate-200 dark:border-white/10"
        }`}
      >
        <span className="min-w-0 truncate font-mono text-sm">
          {value}
        </span>
        <CurrencyFlag code={value} />
        <ChevronDown
          className={`w-4 h-4 shrink-0 text-slate-500 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div
          id={`${id}-menu`}
          role="listbox"
          aria-labelledby={`${id}-button`}
          className="absolute left-0 top-[calc(100%+0.5rem)] z-50 w-full max-h-72 overflow-y-auto rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0e172e] shadow-2xl shadow-slate-950/20 dark:shadow-black/50 py-1"
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
                    ? "bg-[#E88F2B]/10 text-[#d97706] dark:text-[#f0a04b]"
                    : "text-slate-800 hover:bg-slate-100 dark:text-white dark:hover:bg-white/10"
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

function CustomTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;

    return (
      <div className="bg-slate-900/95 border border-slate-800 backdrop-blur-md rounded-2xl p-4.5 shadow-2xl font-sans text-xs">
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
          Date: {data.date}
        </p>
        <p className="text-sm font-black text-white mt-1">
          Rate: <span className="font-mono text-[#E88F2B]">{formatRate(data.rate)}</span>
        </p>
      </div>
    );
  }

  return null;
}

export default function CurrencyConverter() {
  const navigate = useNavigate();
  const { darkMode } = useTheme();
  const { user, conversions, addConversion, clearConversions } = useAuth();


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
    const timer = setTimeout(() => setPageReady(true), 1800);
    return () => clearTimeout(timer);
  }, []);

  const [saving, setSaving] = useState(false);
  const previousRateRef = useRef(null);
  const previousPairRef = useRef("");
  const currencyPickerRef = useRef(null);
  const [openCurrencyPicker, setOpenCurrencyPicker] = useState(null);

  const [dashError, setDashError] = useState("");
  const [dashSuccess, setDashSuccess] = useState("");
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    if (!dashSuccess) return;

    const timer = window.setTimeout(() => {
      setDashSuccess("");
    }, 3000);

    return () => window.clearTimeout(timer);
  }, [dashSuccess]);

  // Security and Chart States
  const rateLimitTimestampsRef = useRef([]);
  const [chartData, setChartData] = useState([]);


  // NOTE: conversion history is now managed by AuthContext (synced to Firestore).
  // No local recentConversions state needed here.

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

  // Sync the latest applyLiveRateData into the ref so the
  // online/offline effect can read it without a dep on the function.
  useEffect(() => { applyLiveRateDataRef.current = applyLiveRateData; });

  const updateCurrencyPair = async (newFrom, newTo) => {
    setFrom(newFrom);
    setTo(newTo);
    await fetchRates(newFrom, newTo);
  };

  // Shared logic: fetch latest rates and apply them
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

  // Online/offline handler + initial fetch when pair changes
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

    // Online/offline listeners
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

    // 60-second auto-refresh
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

  // Fetch historical snapshots for the active pair
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

  // Convert operation
  const handleExecuteExchange = async () => {
    setDashError("");
    setDashSuccess("");

    // Sanitization & Safety checks
    const sanitizedAmountText = sanitizeInput(amount.toString());
    const amt = parseFloat(sanitizedAmountText);

    if (isNaN(amt) || amt <= 0) {
      setDashError("Please enter a valid conversion amount.");
      return;
    }

    // Rate Limiter Check (Max 5 clicks in 10s)
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

    // Add current timestamp to tracker (ref is synchronous, no race condition)
    rateLimitTimestampsRef.current = [...activeTimestamps, now];

    const latest = await fetchRates(from, to);
    if (!latest?.rate) {
      setDashError("Could not verify the current live exchange rate. Please try again.");
      return;
    }

    const currentRateVal = getDisplayRateValue(latest.rate);
    const result = amt * currentRateVal;

    // Save to Conversion History — written to Firestore via AuthContext
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


    // Audit logs
    addSecurityLog(
      user?.email,
      "CONVERSION_EXECUTED",
      `Exchanged ${amt} ${from} to ${result.toFixed(decimalPlaces)} ${to} securely`,
      "SUCCESS"
    );

    setDashSuccess("Conversion saved successfully.");
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

  // Use conversions from AuthContext as the single source of truth
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

  // 30-day percentage change: compare first data point to last
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
    <div className="min-h-screen bg-slate-50 dark:bg-[#000000] text-slate-800 dark:text-slate-100 transition-colors duration-300 flex flex-col relative overflow-hidden">
      {/* Background glow blooms */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-125 h-125 bg-[#E88F2B]/10 dark:bg-[#E88F2B]/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-125 h-125 bg-[#E88F2B]/10 dark:bg-[#E88F2B]/5 rounded-full blur-[100px]" />
      </div>

      {/* Header / Navbar */}
      <Navbar />

      {/* Crypto Ticker sub-bar */}
      <Suspense fallback={<div className="h-9 w-full bg-slate-100 dark:bg-black/35 animate-pulse" />}>
        <CryptoTicker />
      </Suspense>

      {/* Main Container */}
      <motion.main
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 md:pb-8 space-y-6"
      >
        
        {/* Caption & Title */}
        <motion.div variants={itemVariants}>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#E88F2B]/10 text-[#E88F2B] dark:text-[#E88F2B] border border-[#E88F2B]/20 text-xs font-bold uppercase tracking-wider mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            Verified Security Protocols Active
          </span>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight font-sans">
            Welcome, {user?.firstName || getUserDisplayName(user)}!
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-0.5 font-sans leading-relaxed">
            Calculator outputs sync live with market rates. View live fluctuations on the monthly trend tracker.
          </p>
        </motion.div>

        {/* Dashboard Grid */}
        <div className="grid lg:grid-cols-5 gap-6 items-start">
          {/* Left Column: Calculator Card */}
          <div className="lg:col-span-2">
            {/* The Secure Converter Calculator */}
            <motion.div
              variants={itemVariants}
              className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-3xl p-6 shadow-xl backdrop-blur-xl flex flex-col gap-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xl sm:text-2xl font-black font-sans">Calculator Utility</h3>
                
                <button 
                  onClick={swapCurrencies}
                  className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 flex items-center justify-center shadow-xs cursor-pointer active:scale-95 transition"
                  title="Swap currencies"
                >
                  <ArrowRightLeft className="w-4 h-4" />
                </button>
              </div>

              {/* Status Message */}
              {(isOffline || dashError) && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-[11px] font-semibold flex items-start gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>{dashError || "Offline mode. Cached rates may apply."}</span>
                </div>
              )}

              {dashSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[11px] font-bold flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{dashSuccess}</span>
                </div>
              )}

              {/* Amount Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-500 font-sans ml-1">
                    Amount
                  </label>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setAmount("")}
                      className="text-[9px] px-2 py-0.5 rounded-md bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/10 cursor-pointer font-bold font-sans transition"
                    >
                      Clear
                    </button>
                  </div>
                </div>
                <input
                  type="text"
                  inputMode="decimal"
                  value={formatInputAmount(amount)}
                  onChange={(e) => {
                    const input = e.target;
                    const selectionStart = input.selectionStart;
                    const oldLength = input.value.length;
                    const raw = input.value.replace(/,/g, "");
                    // Allow empty, numbers, and one decimal point
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
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-black/35 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white font-mono font-bold text-lg focus:border-[#E88F2B] focus:ring-1 focus:ring-[#E88F2B] outline-none transition"
                  placeholder="Enter amount..."
                />
              </div>

              {/* Select Currencies */}
              <div ref={currencyPickerRef} className="grid grid-cols-1 sm:grid-cols-2 gap-4 overflow-visible">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-500 mb-1.5 ml-1 font-sans">
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
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-500 mb-1.5 ml-1 sm:ml-0 sm:mr-1 sm:text-right font-sans">
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

              {/* Result Block */}
              <div className="bg-linear-to-b from-slate-50 to-slate-100/50 dark:from-black/40 dark:to-black/20 border border-slate-200/80 dark:border-white/10 p-5 rounded-2xl shadow-inner relative overflow-hidden flex flex-col gap-3">
                <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-[#E88F2B]/10 rounded-full blur-xl pointer-events-none" />
                
                <div>
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 block mb-1 font-sans uppercase tracking-wider">Converted Result</span>
                  
                  <div className="py-2 animate-pulse" style={{ display: loading ? 'block' : 'none' }}>
                    <div className="h-8 w-44 bg-slate-200 dark:bg-white/10 rounded-lg" />
                  </div>
                  
                  <div className="space-y-1" style={{ display: loading ? 'none' : 'block' }}>
                    <div className="text-3xl font-black font-mono text-[#E88F2B] dark:text-[#E88F2B] tracking-tight">
                      {convertedResult.toLocaleString(undefined, { minimumFractionDigits: decimalPlaces, maximumFractionDigits: decimalPlaces })} {to}
                    </div>
                    <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 font-sans">
                      {Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2 })} {from} = {convertedResult.toLocaleString(undefined, { minimumFractionDigits: decimalPlaces, maximumFractionDigits: decimalPlaces })} {to}
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-200 dark:border-white/5 pt-3 space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-sans">
                    <span className="text-slate-400 dark:text-slate-500 font-medium">Exchange Rate</span>
                    <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                      1 {from} = {formatRate(displayRate)} {to}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-sans">
                    <span className="text-slate-400 dark:text-slate-500 font-medium">Inverse Rate</span>
                    <span className="font-mono font-bold text-slate-500 dark:text-slate-400">
                      1 {to} = {displayRate > 0 ? formatRate(1 / displayRate) : "0.00"} {from}
                    </span>
                  </div>
                </div>
              </div>

              {/* Spread Estimator */}
              <Suspense fallback={<div className="h-40 w-full bg-slate-50 dark:bg-black/20 animate-pulse rounded-2xl" />}>
                <SpreadEstimator rate={displayRate} from={from} to={to} amount={amount} />
              </Suspense>

              <button
                onClick={handleExecuteExchange}
                disabled={loading || saving}
                className="w-full bg-linear-to-r from-[#E88F2B] to-[#d97706] hover:scale-[1.01] active:scale-99 text-black font-bold py-3 rounded-xl shadow-lg shadow-[#E88F2B]/10 hover:shadow-[#E88F2B]/25 transition duration-200 cursor-pointer disabled:opacity-50 font-sans text-xs flex items-center justify-center gap-2"
              >
                <ShieldCheck size={16} />
                <span>{saving ? "Saving..." : loading ? "Checking Live Rate..." : "Confirm Conversion & Save"}</span>
              </button>
            </motion.div>
          </div>
 
          {/* Right Column: Popular Pairs & Live Exchange Trend Chart */}
          <div className="lg:col-span-3 space-y-5">
            {/* Popular Currency Pairs */}
            <motion.div variants={itemVariants} className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-3xl p-6 shadow-xl backdrop-blur-xl space-y-4">
              <div>
                <h3 className="text-sm font-bold font-sans">Popular Currency Pairs</h3>
                <p className="text-xs text-slate-500 dark:text-slate-500 mt-0.5 font-sans">Quickly preset converter values to benchmark markets</p>
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
                          ? "border-[#E88F2B] bg-[#E88F2B]/10 text-[#d97706] dark:text-[#E88F2B] font-bold"
                          : "border-slate-200 dark:border-white/10 hover:border-[#E88F2B]/40 text-slate-700 dark:text-slate-300 bg-slate-50/50 dark:bg-transparent"
                      }`}
                    >
                      <span className="text-[10px] font-black font-mono text-slate-500 dark:text-slate-500">
                        {pFrom} / {pTo}
                      </span>
                      <span className="text-xs font-bold font-mono">{pairStr}</span>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>

            {/* Watchlist Widget */}
            <motion.div variants={itemVariants}>
              <Suspense fallback={<div className="h-60 w-full bg-white dark:bg-white/5 animate-pulse rounded-3xl" />}>
                <WatchlistWidget baseCurrency={from} />
              </Suspense>
            </motion.div>

            {/* Live Exchange Rate Trend Chart — Redesigned */}
            <motion.div
              variants={itemVariants}
              className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-5 shadow-xl backdrop-blur-xl"
            >
              {/* ── Header row ── */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <h3 className="text-sm font-bold font-sans leading-none">
                    {from}/{to} Rate Trend
                  </h3>
                </div>
                <span className="text-[9px] px-2 py-1 bg-[#E88F2B]/10 text-[#E88F2B] dark:text-[#E88F2B] rounded-lg font-bold border border-[#E88F2B]/20 uppercase tracking-widest font-mono">
                  {isSyntheticData ? "30D · Estimated" : "30D · Live"}
                </span>
              </div>

              {/* ── 4 compact stat chips ── */}
              <div className="grid grid-cols-4 gap-2 mb-4">
                <div className="bg-slate-50 dark:bg-black/25 border border-slate-100 dark:border-white/5 rounded-xl p-2.5 text-center">
                  <span className="block text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Rate</span>
                  <span className="block text-[11px] font-black font-mono text-slate-700 dark:text-white truncate">{formatRate(displayRate)}</span>
                </div>
                <div className="bg-slate-50 dark:bg-black/25 border border-slate-100 dark:border-white/5 rounded-xl p-2.5 text-center">
                  <span className="block text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">30d Chg</span>
                  <span className={`block text-[11px] font-black font-mono ${
                    changePct >= 0 ? "text-emerald-500 dark:text-emerald-400" : "text-rose-500"
                  }`}>
                    {changePct >= 0 ? "+" : ""}{changePct.toFixed(2)}%
                  </span>
                </div>
                <div className="bg-slate-50 dark:bg-black/25 border border-slate-100 dark:border-white/5 rounded-xl p-2.5 text-center">
                  <span className="block text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">High</span>
                  <span className="block text-[11px] font-black font-mono text-emerald-600 dark:text-emerald-400 truncate">{formatRate(rateStats.high)}</span>
                </div>
                <div className="bg-slate-50 dark:bg-black/25 border border-slate-100 dark:border-white/5 rounded-xl p-2.5 text-center">
                  <span className="block text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Low</span>
                  <span className="block text-[11px] font-black font-mono text-rose-500 truncate">{formatRate(rateStats.low)}</span>
                </div>
              </div>

              {/* ── Chart area ── */}
              <div className="h-36 w-full relative">
                {/* Loading state */}
                {(loading || waveChartData.length === 0) && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-400 font-sans text-xs">
                    <RefreshCw className="w-4 h-4 animate-spin text-[#E88F2B]" />
                    <span>Loading trend data...</span>
                  </div>
                )}
                {/* Chart */}
                {!loading && waveChartData.length > 0 && (
                  <ResponsiveContainer width="100%" height={144}>
                    <AreaChart data={waveChartData} margin={{ top: 6, right: 4, left: 10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="rateGradient" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#06b6d4" />
                          <stop offset="50%" stopColor="#E88F2B" />
                          <stop offset="100%" stopColor="#38bdf8" />
                        </linearGradient>
                        <linearGradient id="rateFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#E88F2B" stopOpacity={0.28} />
                          <stop offset="100%" stopColor="#E88F2B" stopOpacity={0} />
                        </linearGradient>
                        <filter id="waveGlow" x="-20%" y="-30%" width="140%" height="160%">
                          <feGaussianBlur stdDeviation="2.5" result="blur" />
                          <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                          </feMerge>
                        </filter>
                      </defs>
                      <CartesianGrid strokeDasharray="3 8" vertical={false} stroke="rgba(148,163,184,0.10)" />
                      <XAxis
                        dataKey="date"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: "#94a3b8", fontSize: 8, fontWeight: 600 }}
                        tickFormatter={(d) => `${d.split("-")[2]}`}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        domain={["auto", "auto"]}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: "#94a3b8", fontSize: 8, fontWeight: 600 }}
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
                      <Tooltip content={<CustomTooltip />} />
                      <Area
                        type="natural"
                        dataKey="rate"
                        stroke="url(#rateGradient)"
                        strokeWidth={2.5}
                        fill="url(#rateFill)"
                        dot={false}
                        activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff", fill: "#E88F2B" }}
                        filter="url(#waveGlow)"
                        isAnimationActive={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* ── Footer ── */}
              <div className="flex items-center justify-center mt-3 pt-3 border-t border-slate-100 dark:border-white/5">
                <div className="px-4 py-1.5 rounded-full bg-slate-50 dark:bg-black/35 border border-slate-200/60 dark:border-white/5 shadow-xs flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#E88F2B] animate-pulse" />
                  <span className="text-xs font-black font-mono text-slate-700 dark:text-[#E88F2B]">
                    1 {from} = {formatRate(displayRate)} {to}
                  </span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Bottom Row: User Conversion History */}
        <motion.div variants={itemVariants} className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-3xl p-6 shadow-xl backdrop-blur-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 font-sans text-[#E88F2B] font-bold text-sm">
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
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-[10px] font-bold text-slate-500 dark:text-slate-400 hover:border-[#E88F2B] hover:text-[#E88F2B] transition cursor-pointer font-sans"
                  title="Export printable statement"
                >
                  <ConvertXIcon size={11} />
                  Export Statement
                </button>
              )}
              {recentConversions.length > 0 && (
                <button
                  onClick={handleClearHistory}
                  className="text-[10px] font-bold text-rose-500 hover:text-rose-400 hover:underline transition bg-transparent border-none cursor-pointer"
                >
                  Clear History
                </button>
              )}
            </div>
          </div>

          {recentConversions.length === 0 ? (
            <div className="py-8 text-center border border-dashed border-slate-200 dark:border-white/5 rounded-2xl bg-slate-50/50 dark:bg-black/5 text-slate-500 dark:text-slate-500 text-xs font-semibold font-sans">
              No conversions logged. Enter values in the converter and click "Confirm Conversion &amp; Save" above to save your first trade.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-white/5">
              <table className="w-full text-left text-xs font-sans">
                <thead>
                  <tr className="bg-slate-100 dark:bg-black/25 text-slate-650 dark:text-slate-400 uppercase tracking-wider font-bold">
                    <th className="px-4 py-3">Date &amp; Time</th>
                    <th className="px-4 py-3">Exchanged Amount</th>
                    <th className="px-4 py-3">Received Amount</th>
                    <th className="px-4 py-3 text-right">Execution Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5 font-semibold">
                  {recentConversions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-100/30 dark:hover:bg-white/5 transition">
                      <td className="px-4 py-2.5 text-slate-500 dark:text-slate-450 text-[11px]">
                        {new Date(tx.timestamp).toLocaleString()}
                      </td>
                      <td className="px-4 py-2.5 text-slate-700 dark:text-slate-200 font-mono">
                        {tx.fromAmount.toLocaleString(undefined, { minimumFractionDigits: decimalPlaces, maximumFractionDigits: decimalPlaces })} {tx.from}
                      </td>
                      <td className="px-4 py-2.5 text-emerald-600 dark:text-emerald-450 font-mono">
                        +{tx.toAmount.toLocaleString(undefined, { minimumFractionDigits: decimalPlaces, maximumFractionDigits: decimalPlaces })} {tx.to}
                      </td>
                      <td className="px-4 py-2.5 text-right text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                        1 {tx.from} = {formatRate(tx.rate)} {tx.to}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>

        {/* Exchange Flow Analytics Chart — only shown when data exists */}
        {recentConversions.length > 0 && (
          <motion.div variants={itemVariants}>
            <Suspense fallback={<div className="h-48 w-full bg-white dark:bg-white/5 animate-pulse rounded-3xl" />}>
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

      {/* Footer */}
      <footer className="hidden md:block border-t border-slate-200 dark:border-white/10 py-6 mb-16 md:mb-0">
        <div className="max-w-7xl mx-auto px-4 text-center text-[10px] text-slate-450 dark:text-slate-500 font-sans">
          <p>© {new Date().getFullYear()} ConvertX Platform. Rates are sourced securely under 256-bit SSL encryption. All rights reserved.</p>
        </div>
      </footer>

      {/* Mobile Bottom Navigation Bar */}
      <MobileBottomNav />
    </div>
  );
}
