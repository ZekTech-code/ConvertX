import { useState, useEffect, useRef } from "react";
import { TrendingUp, TrendingDown, Minus, Loader } from "lucide-react";
import { getCryptoPrices } from "../../services/ExchangeApi";

const COINS = [
  { id: "bitcoin",      symbol: "BTC", name: "Bitcoin" },
  { id: "ethereum",     symbol: "ETH", name: "Ethereum" },
  { id: "binancecoin", symbol: "BNB", name: "BNB" },
  { id: "solana",       symbol: "SOL", name: "Solana" },
  { id: "xrp",          symbol: "XRP", name: "XRP" },
  { id: "cardano",      symbol: "ADA", name: "Cardano" },
  { id: "dogecoin",     symbol: "DOGE", name: "Dogecoin" },
  { id: "polkadot",     symbol: "DOT", name: "Polkadot" },
  { id: "tron",         symbol: "TRX", name: "TRON" },
  { id: "avalanche-2",  symbol: "AVAX", name: "Avalanche" },
  { id: "chainlink",    symbol: "LINK", name: "Chainlink" },
  { id: "shiba-inu",    symbol: "SHIB", name: "Shiba Inu" },
  { id: "the-open-network", symbol: "TON", name: "Toncoin" },
  { id: "sui",          symbol: "SUI", name: "Sui" },
  { id: "pepe",         symbol: "PEPE", name: "Pepe" },
  { id: "litecoin",     symbol: "LTC", name: "Litecoin" },
];

function formatPrice(value) {
  if (value == null) return "--";
  if (value >= 1000) return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (value >= 1)    return `$${value.toFixed(4)}`;
  return `$${value.toFixed(6)}`;
}

function ChangeChip({ change }) {
  if (change == null) return null;
  const positive = change > 0;
  const neutral   = change === 0;

  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[10px] font-bold tabular-nums ${
        neutral
          ? "text-text-secondary"
          : positive
          ? "text-positive"
          : "text-negative"
      }`}
    >
      {neutral ? (
        <Minus size={9} />
      ) : positive ? (
        <TrendingUp size={9} />
      ) : (
        <TrendingDown size={9} />
      )}
      {positive ? "+" : ""}
      {change.toFixed(2)}%
    </span>
  );
}

export default function CryptoTicker() {
  const [prices, setPrices]     = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(false);
  const intervalRef             = useRef(null);

  const fetchPrices = async () => {
    try {
      const ids  = COINS.map((c) => c.id);
      const data = await getCryptoPrices(ids, "usd");
      setError(false);
      setPrices(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initialFetch = setTimeout(fetchPrices, 0);
    intervalRef.current = setInterval(fetchPrices, 60_000);
    return () => {
      clearTimeout(initialFetch);
      clearInterval(intervalRef.current);
    };
  }, []);

  const items = COINS.map((coin) => {
    const data   = prices?.[coin.id];
    const price  = data?.usd ?? null;
    const change = data?.usd_24h_change ?? null;
    return { ...coin, price, change };
  });

  const doubled = [...items, ...items];

  return (
    <div className="w-full bg-surface-muted border-b border-border backdrop-blur-sm overflow-hidden relative">
      {loading ? (
        <div className="flex items-center gap-2 px-6 py-2 text-text-secondary text-xs">
          <Loader size={12} className="animate-spin text-accent" />
          <span className="font-semibold">Loading crypto prices...</span>
        </div>
      ) : error ? (
        <div className="px-6 py-2 text-text-secondary text-xs font-semibold">
          Crypto ticker unavailable
        </div>
      ) : (
        <div className="flex animate-ticker-scroll whitespace-nowrap py-2">
          {doubled.map((coin, idx) => (
            <span
              key={`${coin.id}-${idx}`}
              className="inline-flex items-center gap-2 px-5 text-xs font-sans border-r border-border-strong/60 last:border-r-0"
            >
              <span className="font-black text-text">{coin.symbol}</span>
              <span className="font-mono text-text tabular-nums">
                {formatPrice(coin.price)}
              </span>
              <ChangeChip change={coin.change} />
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
