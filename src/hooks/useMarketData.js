import { useState, useEffect, useCallback, useRef } from "react";
import { enqueueCgRequest } from "../services/ExchangeApi";

const isDev = import.meta.env.DEV;
const CMC_BASE = isDev ? "/api/cmc" : "https://us-central1-convertxapp.cloudfunctions.net/cmcProxy";
const COINGECKO_BASE = isDev ? "/api/coingecko" : "https://api.coingecko.com/api/v3";
const FOREX_BASE = isDev ? "/api/er-api" : "https://open.er-api.com/v6";
const REFRESH_INTERVAL = 60000;
const CACHE_TTL = 300000;

export const CRYPTO_ASSETS = [
  { id: "bitcoin", symbol: "BTC", name: "Bitcoin", cmcSlug: "bitcoin" },
  { id: "ethereum", symbol: "ETH", name: "Ethereum", cmcSlug: "ethereum" },
  { id: "binancecoin", symbol: "BNB", name: "BNB", cmcSlug: "binance-coin" },
  { id: "solana", symbol: "SOL", name: "Solana", cmcSlug: "solana" },
  { id: "ripple", symbol: "XRP", name: "XRP", cmcSlug: "xrp" },
  { id: "cardano", symbol: "ADA", name: "Cardano", cmcSlug: "cardano" },
  { id: "dogecoin", symbol: "DOGE", name: "Dogecoin", cmcSlug: "dogecoin" },
  { id: "tron", symbol: "TRX", name: "TRON", cmcSlug: "tron" },
  { id: "avalanche-2", symbol: "AVAX", name: "Avalanche", cmcSlug: "avalanche-2" },
  { id: "chainlink", symbol: "LINK", name: "Chainlink", cmcSlug: "chainlink" },
  { id: "polkadot", symbol: "DOT", name: "Polkadot", cmcSlug: "polkadot" },
  { id: "shiba-inu", symbol: "SHIB", name: "Shiba Inu", cmcSlug: "shiba-inu" },
  { id: "the-open-network", symbol: "TON", name: "Toncoin", cmcSlug: "the-open-network" },
  { id: "litecoin", symbol: "LTC", name: "Litecoin", cmcSlug: "litecoin" },
  { id: "sui", symbol: "SUI", name: "Sui", cmcSlug: "sui" },
  { id: "pepe", symbol: "PEPE", name: "Pepe", cmcSlug: "pepe" },
  { id: "bitcoin-cash", symbol: "BCH", name: "Bitcoin Cash", cmcSlug: "bitcoin-cash" },
  { id: "near", symbol: "NEAR", name: "NEAR Protocol", cmcSlug: "near" },
  { id: "internet-computer", symbol: "ICP", name: "Internet Computer", cmcSlug: "internet-computer" },
  { id: "uniswap", symbol: "UNI", name: "Uniswap", cmcSlug: "uniswap" },
  { id: "stellar", symbol: "XLM", name: "Stellar", cmcSlug: "stellar" },
  { id: "aptos", symbol: "APT", name: "Aptos", cmcSlug: "aptos" },
  { id: "ethereum-classic", symbol: "ETC", name: "Ethereum Classic", cmcSlug: "ethereum-classic" },
  { id: "filecoin", symbol: "FIL", name: "Filecoin", cmcSlug: "filecoin" },
  { id: "hedera-hashgraph", symbol: "HBAR", name: "Hedera", cmcSlug: "hedera-hashgraph" },
  { id: "arbitrum", symbol: "ARB", name: "Arbitrum", cmcSlug: "arbitrum" },
  { id: "cosmos", symbol: "ATOM", name: "Cosmos", cmcSlug: "cosmos" },
  { id: "render-token", symbol: "RENDER", name: "Render", cmcSlug: "render-token" },
  { id: "vechain", symbol: "VET", name: "VeChain", cmcSlug: "vechain" },
  { id: "kaspa", symbol: "KAS", name: "Kaspa", cmcSlug: "kaspa" },
  { id: "maker", symbol: "MKR", name: "Maker", cmcSlug: "maker" },
  { id: "injective-protocol", symbol: "INJ", name: "Injective", cmcSlug: "injective-protocol" },
  { id: "optimism", symbol: "OP", name: "Optimism", cmcSlug: "optimism" },
  { id: "aave", symbol: "AAVE", name: "Aave", cmcSlug: "aave" },
  { id: "algorand", symbol: "ALGO", name: "Algorand", cmcSlug: "algorand" },
  { id: "the-graph", symbol: "GRT", name: "The Graph", cmcSlug: "the-graph" },
  { id: "fantom", symbol: "FTM", name: "Fantom", cmcSlug: "fantom" },
  { id: "sei-network", symbol: "SEI", name: "Sei", cmcSlug: "sei-network" },
  { id: "polygon-ecosystem-token", symbol: "POL", name: "Polygon", cmcSlug: "polygon-ecosystem-token" },
  { id: "celestia", symbol: "TIA", name: "Celestia", cmcSlug: "celestia" },
  { id: "immutable-x", symbol: "IMX", name: "Immutable", cmcSlug: "immutable-x" },
  { id: "mantle", symbol: "MNT", name: "Mantle", cmcSlug: "mantle" },
  { id: "bonk", symbol: "BONK", name: "Bonk", cmcSlug: "bonk" },
  { id: "jupiter-exchange-solana", symbol: "JUP", name: "Jupiter", cmcSlug: "jupiter-exchange-solana" },
  { id: "floki", symbol: "FLOKI", name: "Floki", cmcSlug: "floki" },
  { id: "gala", symbol: "GALA", name: "Gala", cmcSlug: "gala" },
  { id: "the-sandbox", symbol: "SAND", name: "The Sandbox", cmcSlug: "the-sandbox" },
  { id: "axie-infinity", symbol: "AXS", name: "Axie Infinity", cmcSlug: "axie-infinity" },
  { id: "lido-dao", symbol: "LDO", name: "Lido DAO", cmcSlug: "lido-dao" },
  { id: "worldcoin-wld", symbol: "WLD", name: "Worldcoin", cmcSlug: "worldcoin-wld" },
  { id: "monero", symbol: "XMR", name: "Monero", cmcSlug: "monero" },
  { id: "arweave", symbol: "AR", name: "Arweave", cmcSlug: "arweave" },
  { id: "fetch-ai", symbol: "FET", name: "Fetch.ai", cmcSlug: "fetch-ai" },
  { id: "ondo-finance", symbol: "ONDO", name: "Ondo", cmcSlug: "ondo-finance" },
  { id: "eos", symbol: "EOS", name: "EOS", cmcSlug: "eos" },
  { id: "tezos", symbol: "XTZ", name: "Tezos", cmcSlug: "tezos" },
  { id: "dash", symbol: "DASH", name: "Dash", cmcSlug: "dash" },
  { id: "zcash", symbol: "ZEC", name: "Zcash", cmcSlug: "zcash" },
  { id: "curve-dao-token", symbol: "CRV", name: "Curve", cmcSlug: "curve-dao-token" },
  { id: "compound-governance-token", symbol: "COMP", name: "Compound", cmcSlug: "compound-governance-token" },
  { id: "thorchain", symbol: "RUNE", name: "THORChain", cmcSlug: "thorchain" },
  { id: "flow", symbol: "FLOW", name: "Flow", cmcSlug: "flow" },
  { id: "apecoin", symbol: "APE", name: "ApeCoin", cmcSlug: "apecoin" },
  { id: "chiliz", symbol: "CHZ", name: "Chiliz", cmcSlug: "chiliz" },
  { id: "enjincoin", symbol: "ENJ", name: "Enjin", cmcSlug: "enjincoin" },
  { id: "elrond-erd-2", symbol: "EGLD", name: "MultiversX", cmcSlug: "multiversx-egld" },
  { id: "notcoin", symbol: "NOT", name: "Notcoin", cmcSlug: "notcoin" },
  { id: "wormhole", symbol: "W", name: "Wormhole", cmcSlug: "wormhole" },
  { id: "pyth-network", symbol: "PYTH", name: "Pyth Network", cmcSlug: "pyth-network" },
  { id: "blockstack", symbol: "STX", name: "Stacks", cmcSlug: "stacks" },
  { id: "mina-protocol", symbol: "MINA", name: "Mina", cmcSlug: "mina-protocol" },
];

if (CRYPTO_ASSETS.length !== 71) {
  console.error(`CRYPTO_ASSETS has ${CRYPTO_ASSETS.length} entries, expected 71`);
}

const CMC_SYMBOLS = CRYPTO_ASSETS.map((a) => a.symbol).join(",");
const COINGECKO_IDS = CRYPTO_ASSETS.map((a) => a.id).join(",");

export const FOREX_PAIRS = [
  { base: "USD", quote: "EUR", name: "€/$", baseSymbol: "$", quoteSymbol: "€" },
  { base: "USD", quote: "GBP", name: "£/$", baseSymbol: "$", quoteSymbol: "£" },
  { base: "USD", quote: "JPY", name: "$/¥", baseSymbol: "$", quoteSymbol: "¥" },
  { base: "USD", quote: "CHF", name: "$/₣", baseSymbol: "$", quoteSymbol: "₣" },
  { base: "USD", quote: "CAD", name: "$/C$", baseSymbol: "$", quoteSymbol: "C$" },
  { base: "AUD", quote: "USD", name: "A$/$", baseSymbol: "A$", quoteSymbol: "$" },
  { base: "NZD", quote: "USD", name: "NZ$/$", baseSymbol: "NZ$", quoteSymbol: "$" },
  { base: "EUR", quote: "GBP", name: "€/£", baseSymbol: "€", quoteSymbol: "£" },
  { base: "EUR", quote: "JPY", name: "€/¥", baseSymbol: "€", quoteSymbol: "¥" },
  { base: "GBP", quote: "JPY", name: "£/¥", baseSymbol: "£", quoteSymbol: "¥" },
  { base: "AUD", quote: "JPY", name: "A$/¥", baseSymbol: "A$", quoteSymbol: "¥" },
  { base: "NZD", quote: "JPY", name: "NZ$/¥", baseSymbol: "NZ$", quoteSymbol: "¥" },
  { base: "USD", quote: "CNY", name: "$/¥", baseSymbol: "$", quoteSymbol: "¥" },
  { base: "USD", quote: "HKD", name: "$/HK$", baseSymbol: "$", quoteSymbol: "HK$" },
  { base: "USD", quote: "SGD", name: "$/S$", baseSymbol: "$", quoteSymbol: "S$" },
  { base: "USD", quote: "INR", name: "$/₹", baseSymbol: "$", quoteSymbol: "₹" },
  { base: "USD", quote: "KRW", name: "$/₩", baseSymbol: "$", quoteSymbol: "₩" },
  { base: "USD", quote: "THB", name: "$/฿", baseSymbol: "$", quoteSymbol: "฿" },
  { base: "USD", quote: "MXN", name: "$/Mex$", baseSymbol: "$", quoteSymbol: "Mex$" },
  { base: "USD", quote: "BRL", name: "$/R$", baseSymbol: "$", quoteSymbol: "R$" },
  { base: "USD", quote: "ZAR", name: "$/R", baseSymbol: "$", quoteSymbol: "R" },
  { base: "USD", quote: "TRY", name: "$/₺", baseSymbol: "$", quoteSymbol: "₺" },
  { base: "USD", quote: "SEK", name: "$/kr", baseSymbol: "$", quoteSymbol: "kr" },
  { base: "USD", quote: "NOK", name: "$/kr", baseSymbol: "$", quoteSymbol: "kr" },
  { base: "USD", quote: "NGN", name: "$/₦", baseSymbol: "$", quoteSymbol: "₦" },
  { base: "USD", quote: "PLN", name: "$/zł", baseSymbol: "$", quoteSymbol: "zł" },
  { base: "USD", quote: "PHP", name: "$/₱", baseSymbol: "$", quoteSymbol: "₱" },
  { base: "USD", quote: "IDR", name: "$/Rp", baseSymbol: "$", quoteSymbol: "Rp" },
  { base: "USD", quote: "MYR", name: "$/RM", baseSymbol: "$", quoteSymbol: "RM" },
  { base: "USD", quote: "TWD", name: "$/NT$", baseSymbol: "$", quoteSymbol: "NT$" },
  { base: "EUR", quote: "CHF", name: "€/₣", baseSymbol: "€", quoteSymbol: "₣" },
  { base: "GBP", quote: "CHF", name: "£/₣", baseSymbol: "£", quoteSymbol: "₣" },
  { base: "EUR", quote: "AUD", name: "€/A$", baseSymbol: "€", quoteSymbol: "A$" },
  { base: "EUR", quote: "CAD", name: "€/C$", baseSymbol: "€", quoteSymbol: "C$" },
  { base: "EUR", quote: "NZD", name: "€/NZ$", baseSymbol: "€", quoteSymbol: "NZ$" },
  { base: "EUR", quote: "SGD", name: "€/S$", baseSymbol: "€", quoteSymbol: "S$" },
  { base: "GBP", quote: "AUD", name: "£/A$", baseSymbol: "£", quoteSymbol: "A$" },
  { base: "GBP", quote: "NZD", name: "£/NZ$", baseSymbol: "£", quoteSymbol: "NZ$" },
  { base: "GBP", quote: "CAD", name: "£/C$", baseSymbol: "£", quoteSymbol: "C$" },
];

async function fetchWithTimeout(url, options = {}, timeout = 10000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

async function fetchWithRetry(url, options = {}, timeout = 15000, maxRetries = 2) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetchWithTimeout(url, options, timeout);
      if (res.status === 429 && attempt < maxRetries) {
        const retryAfter = parseInt(res.headers?.get("Retry-After") || "0", 10);
        const delay = retryAfter > 0
          ? Math.max(retryAfter * 1000, 15000)
          : Math.pow(2, attempt) * 10000;
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    } catch (err) {
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 10000));
        continue;
      }
      throw err;
    }
  }
}

function buildCacheKey(prefix) {
  return `market_${prefix}_${Math.floor(Date.now() / CACHE_TTL)}`;
}

function getCached(key) {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setCache(key, data) {
  try {
    sessionStorage.setItem(key, JSON.stringify(data));
  } catch {
  }
}

function getLocalStorage(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.ts > 86400000) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

function setLocalStorage(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data }));
  } catch {
  }
}

function buildEmptyResult() {
  const result = {};
  for (const asset of CRYPTO_ASSETS) {
    result[asset.id] = { usd: 0, usd_24h_change: 0, usd_24h_vol: 0, usd_market_cap: 0 };
  }
  return result;
}

async function fetchCoinGeckoPrices() {
  const url = `${COINGECKO_BASE}/simple/price?ids=${COINGECKO_IDS}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true`;
  const data = await enqueueCgRequest(() => fetchWithRetry(url, {}, 15000));
  if (data?.error_code) throw new Error(data.error_message || "CoinGecko rate limited");
  const result = {};
  for (const asset of CRYPTO_ASSETS) {
    const coinData = data[asset.id];
    if (coinData) {
      result[asset.id] = {
        usd: coinData.usd || 0,
        usd_24h_change: coinData.usd_24h_change || 0,
        usd_24h_vol: coinData.usd_24h_vol || 0,
        usd_market_cap: coinData.usd_market_cap || 0,
      };
    }
  }
  return result;
}

async function fetchCMCPrices() {
  try {
    const cmcRes = await fetchWithTimeout(
      `${CMC_BASE}/cryptocurrency/quotes/latest?symbol=${CMC_SYMBOLS}&convert=USD`,
      { headers: { "Accept": "application/json" } },
      15000
    );
    if (!cmcRes.ok) throw new Error(`CMC HTTP ${cmcRes.status}`);
    const data = await cmcRes.json();
    const result = {};
    const quotes = data?.data || {};
    for (const asset of CRYPTO_ASSETS) {
      const quote = quotes[asset.symbol]?.[0];
      if (quote) {
        result[asset.id] = {
          usd: quote.quote?.USD?.price || 0,
          usd_24h_change: quote.quote?.USD?.percent_change_24h || 0,
          usd_24h_vol: quote.quote?.USD?.volume_24h || 0,
          usd_market_cap: quote.quote?.USD?.market_cap || 0,
        };
      }
    }
    return result;
  } catch {
    return null;
  }
}

export function useMarketData() {
  const [cryptoPrices, setCryptoPrices] = useState(() => getLocalStorage("cg_prices") || buildEmptyResult());
  const [forexRates, setForexRates] = useState(() => getLocalStorage("forex_rates") || {});
  const [cryptoHistory, setCryptoHistory] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const mountedRef = useRef(true);

  const fetchCryptoPricesBackground = useCallback(async (existing) => {
    try {
      const cgPrices = await fetchCoinGeckoPrices();
      if (cgPrices && Object.keys(cgPrices).length > 0 && Object.values(cgPrices).some((v) => v.usd > 0)) {
        const merged = { ...existing, ...cgPrices };
        setCache(buildCacheKey("crypto_prices"), merged);
        setLocalStorage("cg_prices", merged);
        return merged;
      }
    } catch {
    }

    try {
      const cmcPrices = await fetchCMCPrices();
      if (cmcPrices && Object.keys(cmcPrices).length > 0 && Object.values(cmcPrices).some((v) => v.usd > 0)) {
        const merged = { ...existing, ...cmcPrices };
        setCache(buildCacheKey("crypto_prices"), merged);
        setLocalStorage("cg_prices", merged);
        return merged;
      }
    } catch {
    }

    return existing && Object.values(existing).some((v) => v.usd > 0) ? existing : buildEmptyResult();
  }, []);

  const fetchCryptoPrices = useCallback(async () => {
    const cacheKey = buildCacheKey("crypto_prices");
    const cached = getCached(cacheKey);
    if (cached && Object.values(cached).some((v) => v.usd > 0)) {
      fetchCryptoPricesBackground(cached);
      return cached;
    }

    const persistentCache = getLocalStorage("cg_prices");
    if (persistentCache && Object.values(persistentCache).some((v) => v.usd > 0)) {
      fetchCryptoPricesBackground(persistentCache);
      return persistentCache;
    }

    return fetchCryptoPricesBackground(buildEmptyResult());
  }, [fetchCryptoPricesBackground]);

  const fetchCryptoHistory = useCallback(async (coinId, days = 30) => {
    const cacheKey = buildCacheKey(`crypto_hist_${coinId}`);
    const cached = getCached(cacheKey);
    if (cached && cached.length > 0) return cached;

    const persistentKey = `cg_hist_${coinId}_${days}`;
    const persistent = getLocalStorage(persistentKey);
    if (persistent && persistent.length > 0) return persistent;

    if (!coinId) return [];

    try {
      const url = `${COINGECKO_BASE}/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`;
      const data = await enqueueCgRequest(() => fetchWithRetry(url, {}, 15000));
      if (data?.error_code) throw new Error(data.error_message);
      const prices = (data?.prices || []).map(([time, value]) => ({
        time: Math.floor(time / 1000),
        value: value || 0,
      }));
      if (prices.length > 0) {
        setCache(cacheKey, prices);
        setLocalStorage(persistentKey, prices);
      }
      return prices;
    } catch {
      return [];
    }
  }, []);

  const fetchCryptoOHLC = useCallback(async (coinId, days = 30) => {
    const cacheKey = buildCacheKey(`crypto_ohlc_${coinId}_${days}`);
    const cached = getCached(cacheKey);
    if (cached && cached.length > 0) return cached;

    const persistentKey = `cg_ohlc_${coinId}_${days}`;
    const persistent = getLocalStorage(persistentKey);
    if (persistent && persistent.length > 0) return persistent;

    if (!coinId) return [];

    try {
      const url = `${COINGECKO_BASE}/coins/${coinId}/ohlc?vs_currency=usd&days=${days}`;
      const data = await enqueueCgRequest(() => fetchWithRetry(url, {}, 15000));
      if (data?.error_code) throw new Error(data.error_message);
      const candles = (data || []).map(([time, open, high, low, close]) => ({
        time: Math.floor(time / 1000),
        open: open || 0,
        high: high || 0,
        low: low || 0,
        close: close || 0,
      }));
      if (candles.length > 0) {
        setCache(cacheKey, candles);
        setLocalStorage(persistentKey, candles);
      }
      return candles;
    } catch {
      return [];
    }
  }, []);

  const fetchForexRates = useCallback(async () => {
    const cacheKey = buildCacheKey("forex_rates");
    const cached = getCached(cacheKey);
    if (cached && Object.keys(cached).length > 0) return cached;

    try {
      const fxRes = await fetchWithTimeout(`${FOREX_BASE}/latest/USD`);
      if (!fxRes.ok) throw new Error(`Forex HTTP ${fxRes.status}`);
      const fxData = await fxRes.json();
      const result = fxData.rates || {};
      if (Object.keys(result).length > 0) {
        setCache(cacheKey, result);
        setLocalStorage("forex_rates", result);
      }
      return result;
    } catch {
      return getLocalStorage("forex_rates") || {};
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const [prices, rates] = await Promise.all([
        fetchCryptoPrices(),
        fetchForexRates(),
      ]);

      if (!mountedRef.current) return;
      setCryptoPrices(prices);
      setForexRates(rates);
      setLastUpdated(Date.now());
    } catch (err) {
      if (mountedRef.current) setError(err.message);
    } finally {
      if (mountedRef.current) setLoading(false);
    }

    Promise.all(
      CRYPTO_ASSETS.slice(0, 4).map((a) =>
        fetchCryptoHistory(a.id, 30).then((d) => [a.id, d]).catch(() => [a.id, []])
      )
    )
      .then((entries) => {
        if (mountedRef.current) setCryptoHistory(Object.fromEntries(entries));
      })
      .catch(() => {});
  }, [fetchCryptoPrices, fetchForexRates, fetchCryptoHistory]);

  useEffect(() => {
    mountedRef.current = true;
    const initial = setTimeout(() => refresh(), 0);
    const interval = setInterval(refresh, REFRESH_INTERVAL);
    return () => {
      mountedRef.current = false;
      clearTimeout(initial);
      clearInterval(interval);
    };
  }, [refresh]);

  const getCryptoPrice = useCallback(
    (coinId) => {
      const data = cryptoPrices[coinId];
      return data?.usd > 0 ? data.usd : null;
    },
    [cryptoPrices]
  );

  const getCryptoChange = useCallback(
    (coinId) => {
      const data = cryptoPrices[coinId];
      if (!data || data.usd == null) return null;
      const change = Number(data.usd_24h_change);
      return Number.isFinite(change) ? change : null;
    },
    [cryptoPrices]
  );

  const getForexRate = useCallback(
    (base, quote) => {
      if (base === quote) return 1;
      if (base === "USD") return forexRates[quote] || null;
      if (quote === "USD") return forexRates[base] ? 1 / forexRates[base] : null;
      const baseInUSD = forexRates[base];
      const quoteInUSD = forexRates[quote];
      if (!baseInUSD || !quoteInUSD) return null;
      return quoteInUSD / baseInUSD;
    },
    [forexRates]
  );

  const getForexChange = useCallback(() => 0, []);

  const getAllPrices = useCallback(() => {
    const result = [];

    for (const asset of CRYPTO_ASSETS) {
      const price = cryptoPrices[asset.id]?.usd;
      const changeRaw = cryptoPrices[asset.id]?.usd_24h_change;
      const change = changeRaw != null && Number.isFinite(Number(changeRaw)) ? Number(changeRaw) : null;
      if (price != null) {
        result.push({
          type: "crypto",
          id: asset.id,
          symbol: asset.symbol,
          name: asset.name,
          price: price > 0 ? price : null,
          change,
          volume: cryptoPrices[asset.id]?.usd_24h_vol || 0,
          marketCap: cryptoPrices[asset.id]?.usd_market_cap || 0,
        });
      }
    }

    for (const pair of FOREX_PAIRS) {
      const rate = getForexRate(pair.base, pair.quote);
      if (rate) {
        result.push({
          type: "forex",
          id: `${pair.base}${pair.quote}`,
          symbol: `${pair.baseSymbol}/${pair.quoteSymbol}`,
          name: `${pair.base} → ${pair.quote}`,
          price: rate,
          change: getForexChange(pair.base, pair.quote),
          volume: 0,
          marketCap: 0,
          baseSymbol: pair.baseSymbol,
          quoteSymbol: pair.quoteSymbol,
          base: pair.base,
          quote: pair.quote,
        });
      }
    }

    return result;
  }, [cryptoPrices, getForexRate, getForexChange]);

  return {
    cryptoPrices,
    forexRates,
    cryptoHistory,
    loading,
    error,
    lastUpdated,
    refresh,
    getCryptoPrice,
    getCryptoChange,
    getForexRate,
    getForexChange,
    getAllPrices,
    fetchCryptoHistory,
    fetchCryptoOHLC,
    CRYPTO_ASSETS,
    FOREX_PAIRS,
  };
}
