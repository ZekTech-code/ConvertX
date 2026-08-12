import { useState, useEffect, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { useTheme } from "../context/useTheme";
import { useAuth } from "../context/useAuth";
import { useMarketData } from "../hooks/useMarketData";
import { useTrading } from "../hooks/useTrading";
import TradingChart from "../components/trading/TradingChart";
import CoinMarkets from "../components/trading/CoinMarkets";
import OrderPanel from "../components/trading/OrderPanel";
import SignalPanel from "../components/trading/SignalPanel";
import FearGreedIndex from "../components/trading/FearGreedIndex";
import PriceAlerts from "../components/trading/PriceAlerts";
import AlertToast from "../components/trading/AlertToast";
import PortfolioPanel from "../components/trading/PortfolioPanel";
import TradeHistory from "../components/trading/TradeHistory";
import RateMonitor from "../components/trading/RateMonitor";
import MobileBottomNav from "../components/MobileBottomNav";
import { getCoinIcon } from "../utils/coinIcons";
import { RefreshCw, RotateCcw, BarChart3, ChevronDown, Menu, X, Wallet, History, Zap, Shield, Users, BarChart2, Bell, ArrowLeft, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PageLoader from "../components/PageLoader";

function formatPrice(p) {
  if (!p) return "---";
  if (p > 1000) return p.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (p > 1) return p.toFixed(4);
  return p.toFixed(6);
}

export default function Trade() {
  const { darkMode } = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();
  const marketData = useMarketData();
  const [showAssetPicker, setShowAssetPicker] = useState(false);
  const [priceHistory, setPriceHistory] = useState([]);
  const [priceHistoryMeta, setPriceHistoryMeta] = useState({ source: null, isSynthetic: false });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileNavTarget, setMobileNavTarget] = useState(null);
  const [marketSearch, setMarketSearch] = useState("");
  const [pageReady, setPageReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setPageReady(true), 1800);
    return () => clearTimeout(timer);
  }, []);

  const getPrice = useCallback(
    (assetId) => {
      if (!assetId) return null;
      if (assetId.length === 6 && assetId === assetId.toUpperCase() && /[A-Z]{3}[A-Z]{3}/.test(assetId)) {
        const base = assetId.slice(0, 3);
        const quote = assetId.slice(3, 6);
        return marketData.getForexRate(base, quote);
      }
      return marketData.getCryptoPrice(assetId);
    },
    [marketData]
  );

  const trading = useTrading(getPrice);
  const toastAlert = trading.lastTriggeredAlerts?.[0] || null;

  const handleChartDataReady = useCallback((history, meta = {}) => {
    setPriceHistory(history);
    setPriceHistoryMeta({
      source: meta.source || null,
      isSynthetic: Boolean(meta.isSynthetic),
    });
  }, []);

  const allPrices = useMemo(() => marketData.getAllPrices(), [marketData]);

  const filteredPrices = useMemo(() => {
    if (!marketSearch.trim()) return allPrices;
    const q = marketSearch.toLowerCase();
    return allPrices.filter(
      (a) =>
        a.symbol.toLowerCase().includes(q) ||
        a.name.toLowerCase().includes(q)
    );
  }, [allPrices, marketSearch]);

  const [selectedAssetId, setSelectedAssetId] = useState(null);

  const selectedAsset = useMemo(() => {
    if (!allPrices.length) return null;
    return allPrices.find((a) => a.id === selectedAssetId) || allPrices[0];
  }, [allPrices, selectedAssetId]);

  const currentPrice = useMemo(() => {
    if (!selectedAsset) return null;
    return getPrice(selectedAsset.id) || selectedAsset.price || null;
  }, [selectedAsset, getPrice]);

  const pricesReady = useMemo(() => {
    return currentPrice != null && currentPrice > 0 && !marketData.loading;
  }, [currentPrice, marketData.loading]);

  const handleSelectAsset = useCallback((asset) => {
    setSelectedAssetId(asset.id);
    setShowAssetPicker(false);
    setMarketSearch("");
  }, []);

  const handleClosePosition = useCallback(
    (positionId) => {
      try {
        trading.closePosition(positionId);
      } catch (err) {
        console.error("Failed to close position:", err.message);
      }
    },
    [trading]
  );

  const handleReset = useCallback(() => {
    if (window.confirm("Reset your trading account? This will clear all positions and history.")) {
      trading.resetAccount();
    }
  }, [trading]);

  if (!user) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? "bg-[#000000]" : "bg-white"}`}>
        <div className="text-center p-8">
          <BarChart3 size={48} className="mx-auto mb-4 text-[#E88F2B]" />
          <h2 className={`text-xl font-black mb-2 ${darkMode ? "text-white" : "text-slate-900"}`}>
            Sign In to Trade
          </h2>
          <p className={`text-sm ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
            You need an account to access the trading dashboard.
          </p>
        </div>
      </div>
    );
  }

  if (!pageReady) {
    return <PageLoader title="Loading Trading Dashboard" subtitle="Fetching live market data..." />;
  }

  const cardStyle = {
    background: darkMode ? "rgba(255,255,255,0.02)" : "rgba(15,23,42,0.02)",
    border: darkMode ? "1px solid rgba(255,255,255,0.05)" : "1px solid rgba(148,163,184,0.12)",
  };

  return (
    <div className={`h-screen flex flex-col overflow-hidden transition-colors duration-300 ${darkMode ? "bg-[#000000]" : "bg-slate-50"}`}>
      <div className="max-w-400 mx-auto px-2 pt-3 w-full shrink-0">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-2 mb-2"
        >
          <div className="relative flex items-center justify-center min-h-14">
            <div className="absolute left-0 hidden lg:flex">
              <button
                onClick={() => navigate("/")}
                className="flex items-center gap-1.5 text-[13px] font-bold transition-all cursor-pointer"
                style={{ color: darkMode ? "#64748b" : "#475569" }}
              >
                <ArrowLeft size={14} />
                Back
              </button>
            </div>
            <div className="min-w-0 text-center px-12 sm:px-16">
              <h1 className={`text-lg sm:text-3xl lg:text-4xl font-black tracking-tight whitespace-nowrap ${darkMode ? "text-white" : "text-slate-900"}`}>
                Trading Dashboard
              </h1>
              <p className={`text-xs sm:text-sm mt-1 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                {marketData.loading ? "Loading market data..." : "Live data"}
                {!marketData.loading && marketData.lastUpdated && (
                  <span className="ml-2 text-slate-600">
                    Updated {new Date(marketData.lastUpdated).toLocaleTimeString()}
                  </span>
                )}
              </p>
            </div>
            <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center justify-end gap-2">
              <button
                onClick={marketData.refresh}
                disabled={marketData.loading}
                className="hidden lg:flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer disabled:opacity-40"
                style={{
                  background: darkMode ? "rgba(255,255,255,0.04)" : "rgba(15,23,42,0.04)",
                  border: darkMode ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(148,163,184,0.15)",
                  color: darkMode ? "#94a3b8" : "#475569",
                }}
              >
                <RefreshCw size={12} className={marketData.loading ? "animate-spin" : ""} />
                Refresh
              </button>
              <button
                onClick={handleReset}
                className="hidden lg:flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer"
                style={{
                  background: "rgba(239,68,68,0.08)",
                  border: "1px solid rgba(239,68,68,0.2)",
                  color: "#ef4444",
                }}
              >
                <RotateCcw size={12} />
                Reset
              </button>
              <div className="relative">
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="lg:hidden flex items-center justify-center w-10 h-10 rounded-xl transition-all cursor-pointer"
                  style={{
                    background: mobileMenuOpen ? "rgba(232,143,43,0.15)" : darkMode ? "rgba(255,255,255,0.04)" : "rgba(15,23,42,0.04)",
                    border: mobileMenuOpen ? "1px solid rgba(232,143,43,0.3)" : darkMode ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(148,163,184,0.15)",
                    color: "#E88F2B",
                  }}
                >
                  {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
                </button>
      {mobileMenuOpen && (
                  <div
                    className="absolute top-full right-0 mt-2 rounded-xl py-2 min-w-55 z-50"
                    style={{
                      background: darkMode ? "#0a0a0a" : "#fff",
                      border: darkMode ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(148,163,184,0.2)",
                      boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
                    }}
                  >
                    {[
                      { id: "place-order", label: "Place Order", icon: Zap },
                      { id: "signals", label: "Trading Signals", icon: Shield },
                      { id: "market-watch", label: "Market Watch", icon: BarChart2 },
                      { id: "sentiment", label: "Fear & Greed Index", icon: Users },
                      { id: "alerts", label: "Price Alerts", icon: Bell },
                      { id: "portfolio", label: "Portfolio", icon: Wallet },
                      { id: "history", label: "Trade History", icon: History },
                    ].map((item) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          setMobileNavTarget(item.id);
                          setMobileMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 transition-all cursor-pointer text-left"
                        style={{
                          color: darkMode ? "#e2e8f0" : "#1e293b",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "rgba(232,143,43,0.08)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "transparent";
                        }}
                      >
                        <item.icon size={16} style={{ color: "#E88F2B" }} />
                        <span className="text-sm font-bold">{item.label}</span>
                      </button>
                    ))}
                    <div className="mx-3 my-1" style={{ borderTop: darkMode ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(148,163,184,0.1)" }} />
                    <button
                      onClick={() => {
                        marketData.refresh();
                        setMobileMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 transition-all cursor-pointer text-left"
                      style={{ color: darkMode ? "#94a3b8" : "#64748b" }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "rgba(232,143,43,0.08)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                      }}
                    >
                      <RefreshCw size={16} style={{ color: "#E88F2B" }} />
                      <span className="text-sm font-bold">Refresh Data</span>
                    </button>
                    <button
                      onClick={() => {
                        handleReset();
                        setMobileMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 transition-all cursor-pointer text-left"
                      style={{ color: "#ef4444" }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "rgba(239,68,68,0.08)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                      }}
                    >
                      <RotateCcw size={16} />
                      <span className="text-sm font-bold">Reset Account</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="max-w-400 mx-auto px-2 pb-24 md:pb-2 w-full flex-1 min-h-0 overflow-y-auto">
        <div className="grid grid-cols-1 lg:grid-cols-[420px_1px_1fr_1px_420px] lg:h-full gap-2">

          <div className="hidden lg:block min-h-0 overflow-y-auto space-y-2">
            <div className="rounded-2xl p-4 flex flex-col gap-3" style={cardStyle}>
              <div className="flex items-center gap-2 mb-1">
                <BarChart3 size={18} className="text-[#E88F2B]" />
                <span className="text-lg font-black uppercase tracking-wider" style={{ color: darkMode ? "#94a3b8" : "#475569" }}>
                  Market Watch
                </span>
                <span className="text-[13px] font-bold ml-auto" style={{ color: darkMode ? "#475569" : "#334155" }}>
                  {allPrices.length} assets
                </span>
              </div>

              <div className="relative">
                {selectedAsset && (
                  <button
                    onClick={() => setShowAssetPicker(!showAssetPicker)}
                    className="w-full flex items-center gap-2 p-2 rounded-xl transition-all cursor-pointer"
                    style={{
                      background: darkMode ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.03)",
                      border: darkMode ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(148,163,184,0.1)",
                    }}
                  >
                    <img src={getCoinIcon(selectedAsset.id)} alt="" width={36} height={36} className="rounded-full object-cover" style={{width: 36, height: 36}} />
                    <div className="flex-1 text-left">
                      <span className={`text-base font-black ${darkMode ? "text-white" : "text-slate-900"}`}>
                        {selectedAsset.name}
                      </span>
                      <span className={`text-sm ml-2 ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                        {selectedAsset.symbol}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className={`text-2xl font-mono font-black ${darkMode ? "text-white" : "text-slate-900"}`}>
                        ${formatPrice(currentPrice)}
                      </span>
                      <span
                        className="text-sm font-bold ml-2"
                        style={{ color: selectedAsset.change >= 0 ? "#22c55e" : "#ef4444" }}
                      >
                        {selectedAsset.change >= 0 ? "+" : ""}{selectedAsset.change.toFixed(2)}%
                      </span>
                    </div>
                    <ChevronDown size={16} className={`${darkMode ? "text-slate-400" : "text-slate-500"} transition-transform ${showAssetPicker ? "rotate-180" : ""}`} />
                  </button>
                )}

                {showAssetPicker && (
                  <div
                    className="absolute top-full left-0 right-0 mt-1 rounded-xl max-h-100 overflow-y-auto z-50"
                    style={{
                      background: darkMode ? "#0a0a0a" : "#fff",
                      border: darkMode ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(148,163,184,0.2)",
                      boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
                    }}
                  >
                    <div className="sticky top-0 z-10 p-2" style={{
                      background: darkMode ? "#0a0a0a" : "#fff",
                      borderBottom: darkMode ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(148,163,184,0.1)",
                    }}>
                      <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg" style={{
                        background: darkMode ? "rgba(255,255,255,0.04)" : "rgba(15,23,42,0.04)",
                        border: darkMode ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(148,163,184,0.15)",
                      }}>
                        <Search size={14} style={{ color: darkMode ? "#64748b" : "#475569" }} />
                        <input
                          id="trade-market-search"
                          name="trade-market-search"
                          type="text"
                          value={marketSearch}
                          onChange={(e) => setMarketSearch(e.target.value)}
                          placeholder="Search coins & currencies..."
                          autoFocus
                          className="flex-1 bg-transparent outline-none text-sm font-bold"
                          style={{ color: darkMode ? "#e2e8f0" : "#0f172a" }}
                        />
                        {marketSearch && (
                          <button onClick={() => setMarketSearch("")} className="cursor-pointer">
                            <X size={12} style={{ color: darkMode ? "#64748b" : "#475569" }} />
                          </button>
                        )}
                      </div>
                    </div>
                    {filteredPrices.length === 0 && (
                      <div className="px-4 py-6 text-center">
                        <span className="text-[13px]" style={{ color: darkMode ? "#64748b" : "#475569" }}>
                          No results for "{marketSearch}"
                        </span>
                      </div>
                    )}
                    {filteredPrices.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleSelectAsset(item)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 transition-all cursor-pointer text-left hover:bg-white/3"
                        style={{
                          borderBottom: darkMode ? "1px solid rgba(255,255,255,0.03)" : "1px solid rgba(148,163,184,0.06)",
                        }}
                      >
                        <img src={getCoinIcon(item.id)} alt="" width={28} height={28} className="rounded-full object-cover" style={{width: 28, height: 28}} />
                        <div className="flex-1">
                          <span className="text-sm font-black" style={{ color: darkMode ? "#e2e8f0" : "#1e293b" }}>{item.symbol}</span>
                          <span className="text-[13px] ml-1.5" style={{ color: darkMode ? "#64748b" : "#475569" }}>{item.name}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-mono font-bold" style={{ color: darkMode ? "#e2e8f0" : "#1e293b" }}>
                            {item.price != null && item.price > 0 ? `$${formatPrice(item.price)}` : "—"}
                          </span>
                          {item.price != null && item.price > 0 ? (
                            <span
                              className="text-[14px] font-bold ml-1.5"
                              style={{ color: item.change >= 0 ? "#22c55e" : "#ef4444" }}
                            >
                              {item.change >= 0 ? "+" : ""}{item.change.toFixed(2)}%
                            </span>
                          ) : (
                            <span className="text-[14px] font-bold ml-1.5" style={{ color: darkMode ? "#64748b" : "#94a3b8" }}>
                              —
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <RateMonitor
              allPrices={allPrices}
              darkMode={darkMode}
              onSelectAsset={handleSelectAsset}
              selectedAssetId={selectedAsset?.id}
            />

            <div className="rounded-2xl overflow-hidden" style={cardStyle}>
              <div className="p-4 pb-0">
                <FearGreedIndex darkMode={darkMode} />
              </div>
            </div>

            <div className="rounded-2xl overflow-hidden" style={cardStyle}>
              <div className="p-4 pb-0">
                <PriceAlerts
                  alerts={trading.alerts}
                  onAddAlert={trading.addAlert}
                  onRemoveAlert={trading.removeAlert}
                  currentPrice={currentPrice}
                  selectedAsset={selectedAsset}
                  darkMode={darkMode}
                />
              </div>
            </div>
          </div>

          <div className={`${darkMode ? "bg-white/6" : "bg-slate-200"} hidden lg:block`} />

          <div style={{ touchAction: "pan-y" }}>
                <TradingChart
                  asset={selectedAsset}
                  darkMode={darkMode}
                  currentPrice={currentPrice}
                  pricesReady={pricesReady}
                  onDataReady={handleChartDataReady}
                />
          </div>

          <div className={`${darkMode ? "bg-white/6" : "bg-slate-200"} hidden lg:block`} />

          <div className="hidden lg:block min-h-0 overflow-y-auto space-y-2">
            <div className="rounded-2xl overflow-hidden" style={cardStyle}>
              <div className="p-4 pb-0">
                <OrderPanel
                  asset={selectedAsset}
                  currentPrice={currentPrice}
                  darkMode={darkMode}
                  balance={trading.balance}
                  onExecuteOrder={trading.executeOrder}
                />
              </div>
            </div>

            <div className="rounded-2xl overflow-hidden" style={cardStyle}>
              <div className="p-4 pb-0">
                <SignalPanel
                  asset={selectedAsset}
                  currentPrice={currentPrice}
                  priceHistory={priceHistory}
                  priceHistoryMeta={priceHistoryMeta}
                  darkMode={darkMode}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="h-[4vh] shrink-0" />

        <div className="mt-[2%]">
          {selectedAsset && (
            <CoinMarkets
              asset={selectedAsset}
              darkMode={darkMode}
              currentPrice={currentPrice}
              pricesReady={pricesReady}
            />
          )}
        </div>

        <div className="hidden lg:grid grid-cols-2 gap-2 mt-2">
          <div className="rounded-2xl overflow-hidden" style={cardStyle}>
            <div className="p-4 pb-0">
              <PortfolioPanel
                balance={trading.balance}
                positions={trading.positions}
                getPositionPnL={trading.getPositionPnL}
                portfolioValue={trading.portfolioValue}
                totalPnL={trading.totalPnL}
                initialBalance={trading.startingBalance}
                darkMode={darkMode}
                onClosePosition={handleClosePosition}
              />
            </div>
          </div>

          <div className="rounded-2xl overflow-hidden" style={cardStyle}>
            <div className="p-4 pb-0">
              <TradeHistory trades={trading.trades} darkMode={darkMode} />
            </div>
          </div>
        </div>

        <div className="h-8" />
      </div>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60"
                onClick={() => { setMobileMenuOpen(false); setMobileNavTarget(null); }}
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="absolute right-0 top-0 bottom-0 w-full max-w-md overflow-y-auto"
            ref={(el) => {
              if (el && mobileNavTarget) {
                setTimeout(() => {
                  const section = el.querySelector(`[data-section="${mobileNavTarget}"]`);
                  if (section) section.scrollIntoView({ behavior: "smooth", block: "start" });
                }, 300);
              }
            }}
            style={{
              background: darkMode ? "#050505" : "#f8fafc",
              borderLeft: darkMode ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(148,163,184,0.15)",
            }}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3" style={{
              background: darkMode ? "rgba(5,5,5,0.95)" : "rgba(248,250,252,0.95)",
              backdropFilter: "blur(12px)",
              borderBottom: darkMode ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(148,163,184,0.1)",
            }}>
              <span className="text-lg font-black uppercase tracking-wider" style={{ color: "#E88F2B" }}>
                Trade Menu
              </span>
              <button
                onClick={() => { setMobileMenuOpen(false); setMobileNavTarget(null); }}
                className="w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer"
                style={{
                  background: darkMode ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)",
                  border: darkMode ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(148,163,184,0.15)",
                  color: darkMode ? "#94a3b8" : "#475569",
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-3 space-y-3 pb-24">
              <div data-section="place-order" className="rounded-2xl overflow-hidden" style={cardStyle}>
                <div className="p-4 pb-0">
                  <OrderPanel
                    asset={selectedAsset}
                    currentPrice={currentPrice}
                    darkMode={darkMode}
                    balance={trading.balance}
                    onExecuteOrder={trading.executeOrder}
                  />
                </div>
              </div>

              <div data-section="signals" className="rounded-2xl overflow-hidden" style={cardStyle}>
                <div className="p-4 pb-0">
                  <SignalPanel
                    asset={selectedAsset}
                    currentPrice={currentPrice}
                    priceHistory={priceHistory}
                    priceHistoryMeta={priceHistoryMeta}
                    darkMode={darkMode}
                  />
                </div>
              </div>

              <div data-section="market-watch" className="rounded-2xl overflow-hidden" style={cardStyle}>
                <div className="p-4 pb-0">
                  <RateMonitor
                    allPrices={allPrices}
                    darkMode={darkMode}
                    onSelectAsset={handleSelectAsset}
                    selectedAssetId={selectedAsset?.id}
                  />
                </div>
              </div>

              <div data-section="sentiment" className="rounded-2xl overflow-hidden" style={cardStyle}>
                <div className="p-4 pb-0">
                  <FearGreedIndex darkMode={darkMode} />
                </div>
              </div>

              <div data-section="alerts" className="rounded-2xl overflow-hidden" style={cardStyle}>
                <div className="p-4 pb-0">
                  <PriceAlerts
                    alerts={trading.alerts}
                    onAddAlert={trading.addAlert}
                    onRemoveAlert={trading.removeAlert}
                    currentPrice={currentPrice}
                    selectedAsset={selectedAsset}
                    darkMode={darkMode}
                  />
                </div>
              </div>

              <div data-section="portfolio" className="rounded-2xl overflow-hidden" style={cardStyle}>
                <div className="p-4 pb-0">
                  <PortfolioPanel
                    balance={trading.balance}
                    positions={trading.positions}
                    getPositionPnL={trading.getPositionPnL}
                    portfolioValue={trading.portfolioValue}
                    totalPnL={trading.totalPnL}
                    initialBalance={trading.startingBalance}
                    darkMode={darkMode}
                    onClosePosition={handleClosePosition}
                  />
                </div>
              </div>

              <div data-section="history" className="rounded-2xl overflow-hidden" style={cardStyle}>
                <div className="p-4 pb-0">
                  <TradeHistory trades={trading.trades} darkMode={darkMode} />
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      <MobileBottomNav />

      <AlertToast
        key={toastAlert?.id ?? "none"}
        alert={toastAlert}
        onDismiss={trading.clearTriggeredAlerts}
        darkMode={darkMode}
      />
    </div>
  );
}
