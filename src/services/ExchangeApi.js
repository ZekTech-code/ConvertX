const HISTORY_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

const isDev = import.meta.env.DEV;

const CMC_BASE = isDev ? "/api/cmc" : "https://us-central1-convertx-bc1b0.cloudfunctions.net/cmcProxy";
const COINGECKO_BASE = isDev ? "/api/coingecko" : "https://api.coingecko.com/api/v3";
const ER_API_BASE = isDev ? "/api/er-api" : "https://open.er-api.com/v6";
const BINANCE_BASE = "https://api.binance.com";

const COIN_ID_TO_BINANCE = {
  "bitcoin": "BTCUSDT",
  "ethereum": "ETHUSDT",
  "ripple": "XRPUSDT",
  "cardano": "ADAUSDT",
  "solana": "SOLUSDT",
  "polkadot": "DOTUSDT",
  "dogecoin": "DOGEUSDT",
  "avalanche-2": "AVAXUSDT",
  "polygon": "MATICUSDT",
  "chainlink": "LINKUSDT",
  "litecoin": "LTCUSDT",
  "bitcoin-cash": "BCHUSDT",
  "stellar": "XLMUSDT",
  "uniswap": "UNIUSDT",
  "tron": "TRXUSDT",
  "near": "NEARUSDT",
  "cosmos": "ATOMUSDT",
  "monero": "XMRUSDT",
  "algorand": "ALGOUSDT",
  "vechain": "VETUSDT",
  "filecoin": "FILUSDT",
  "aptos": "APTUSDT",
  "arbitrum": "ARBUSDT",
  "optimism": "OPUSDT",
  "sui": "SUIUSDT",
  "pepe": "PEPEUSDT",
  "injective": "INJUSDT",
  "render": "RNDRUSDT",
  "fetch-ai": "FETUSDT",
};

const TIMEFRAME_TO_BINANCE_INTERVAL = {
  "1H": "1h",
  "4H": "4h",
  "1D": "1d",
  "1W": "1w",
};

function sanitiseCurrencyCode(code) {
  if (typeof code !== "string" || !/^[A-Z]{2,5}$/.test(code.trim())) {
    throw new Error(`Invalid currency code: "${code}"`);
  }
  return code.trim();
}

function sanitiseCoinId(id) {
  if (typeof id !== "string" || !/^[a-z0-9-]{1,64}$/.test(id.trim())) {
    throw new Error(`Invalid coin ID: "${id}"`);
  }
  return id.trim();
}

async function fetchWithTimeout(resource, options = {}) {
  const { timeout = 8000 } = options;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(resource, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

// --- CoinGecko request queue (serializes requests, respects rate limits) ---
const cgQueue = [];
let cgProcessing = false;
let CG_MIN_GAP_MS = 2000;
let cgLastRequestAt = 0;
let cgConsecutive429s = 0;

function enqueueCgRequest(fn) {
  return new Promise((resolve, reject) => {
    cgQueue.push({ fn, resolve, reject });
    processCgQueue();
  });
}

async function processCgQueue() {
  if (cgProcessing) return;
  cgProcessing = true;
  while (cgQueue.length > 0) {
    const { fn, resolve, reject } = cgQueue.shift();
    const elapsed = Date.now() - cgLastRequestAt;
    if (elapsed < CG_MIN_GAP_MS) {
      await new Promise((r) => setTimeout(r, CG_MIN_GAP_MS - elapsed));
    }
    cgLastRequestAt = Date.now();
    try {
      const result = await fn();
      cgConsecutive429s = 0;
      CG_MIN_GAP_MS = 2000;
      resolve(result);
    } catch (err) {
      if (err?.message?.includes("429")) {
        cgConsecutive429s++;
        CG_MIN_GAP_MS = Math.min(2000 + cgConsecutive429s * 3000, 20000);
      }
      reject(err);
    }
  }
  cgProcessing = false;
}

export { enqueueCgRequest };

async function fetchWithRetry(url, options = {}, maxRetries = 2) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const res = await fetchWithTimeout(url, options);
    if (res.status === 429 && attempt < maxRetries) {
      const retryAfter = parseInt(res.headers?.get("Retry-After") || "0", 10);
      const delay = retryAfter > 0
        ? Math.max(retryAfter * 1000, 10000)
        : Math.pow(2, attempt) * 5000;
      await new Promise((r) => setTimeout(r, delay));
      continue;
    }
    return res;
  }
}

function historyStorageKey(from, to) {
  return `live_rate_history_${from}_${to}`;
}

function getTimestamp(data) {
  if (data?.time_last_update_unix) {
    return data.time_last_update_unix * 1000;
  }
  return Date.now();
}

function readRateHistory(from, to) {
  if (typeof localStorage === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(historyStorageKey(from, to)) || "[]");
    if (!Array.isArray(parsed)) return [];
    const cutoff = Date.now() - HISTORY_WINDOW_MS;
    return parsed
      .filter((item) => Number.isFinite(item?.rate) && Number.isFinite(item?.timestamp))
      .filter((item) => item.timestamp >= cutoff)
      .sort((a, b) => a.timestamp - b.timestamp);
  } catch {
    return [];
  }
}

export function recordRateSnapshot(from, to, rate, timestamp = Date.now()) {
  if (typeof localStorage === "undefined" || !Number.isFinite(rate)) return [];

  const history = readRateHistory(from, to);
  const last = history[history.length - 1];
  const nextPoint = {
    date: new Date(timestamp).toISOString().slice(0, 10),
    timestamp,
    rate,
  };

  const nextHistory = last?.timestamp === timestamp
    ? [...history.slice(0, -1), nextPoint]
    : [...history, nextPoint];

  localStorage.setItem(historyStorageKey(from, to), JSON.stringify(nextHistory));
  return nextHistory;
}

export function getRateFromData(data, from, to) {
  const rates = data?.rates;
  if (!rates) throw new Error("Invalid exchange-rate response");

  if (from === to) return 1;

  const rate = rates[to];
  if (!Number.isFinite(rate)) {
    throw new Error(`Live exchange rate is not available for ${from}/${to}.`);
  }

  return rate;
}

export const getLatestRates = async (base = "USD") => {
  const safeBase = sanitiseCurrencyCode(base);
  const fetchBase = safeBase === "BTC" ? "USD" : safeBase;
  const res = await fetchWithTimeout(`${ER_API_BASE}/latest/${fetchBase}`, { timeout: 8000 });

  if (!res.ok) throw new Error("Network error");

  const data = await res.json();

  if (data?.result && data.result !== "success") {
    throw new Error(data?.["error-type"] || "Exchange-rate API error");
  }

  if (!data?.rates) throw new Error("Invalid response");

  if (base === "BTC") {
    const btcRateToUsd = data.rates["BTC"];
    if (btcRateToUsd) {
      const adjustedRates = {};
      for (const [code, rateVal] of Object.entries(data.rates)) {
        adjustedRates[code] = rateVal / btcRateToUsd;
      }
      adjustedRates["BTC"] = 1;
      data.rates = adjustedRates;
      data.base_code = "BTC";
    }
  }

  return data;
};

export const getHistoricalRates = async (from, to) => {
  const data = await getLatestRates(from);
  const rate = getRateFromData(data, from, to);
  return recordRateSnapshot(from, to, rate, getTimestamp(data));
};

const CMC_SYMBOL_MAP = {
  bitcoin: "BTC",
  ethereum: "ETH",
  binancecoin: "BNB",
  solana: "SOL",
  ripple: "XRP",
  cardano: "ADA",
  dogecoin: "DOGE",
  polkadot: "DOT",
  tron: "TRX",
  "avalanche-2": "AVAX",
  chainlink: "LINK",
  "shiba-inu": "SHIB",
  "the-open-network": "TON",
  sui: "SUI",
  pepe: "PEPE",
  litecoin: "LTC",
  "bitcoin-cash": "BCH",
  near: "NEAR",
  "internet-computer": "ICP",
  uniswap: "UNI",
  stellar: "XLM",
  aptos: "APT",
  "ethereum-classic": "ETC",
  filecoin: "FIL",
  "hedera-hashgraph": "HBAR",
  arbitrum: "ARB",
  cosmos: "ATOM",
  "render-token": "RENDER",
  vechain: "VET",
  kaspa: "KAS",
  maker: "MKR",
  "injective-protocol": "INJ",
  optimism: "OP",
  aave: "AAVE",
  algorand: "ALGO",
  "the-graph": "GRT",
  fantom: "FTM",
  "sei-network": "SEI",
  "polygon-ecosystem-token": "POL",
  celestia: "TIA",
  "immutable-x": "IMX",
  mantle: "MNT",
  bonk: "BONK",
  "jupiter-exchange-solana": "JUP",
  floki: "FLOKI",
  gala: "GALA",
  "the-sandbox": "SAND",
  "axie-infinity": "AXS",
  "lido-dao": "LDO",
  "worldcoin-wld": "WLD",
  monero: "XMR",
  arweave: "AR",
  "fetch-ai": "FET",
  "ondo-finance": "ONDO",
  eos: "EOS",
  tezos: "XTZ",
  dash: "DASH",
  zcash: "ZEC",
  "curve-dao-token": "CRV",
  "compound-governance-token": "COMP",
  thorchain: "RUNE",
  flow: "FLOW",
  apecoin: "APE",
  chiliz: "CHZ",
  enjincoin: "ENJ",
  "elrond-erd-2": "EGLD",
  notcoin: "NOT",
  wormhole: "W",
  "pyth-network": "PYTH",
  blockstack: "STX",
  "mina-protocol": "MINA",
};

const ALL_COIN_IDS = Object.keys(CMC_SYMBOL_MAP);

export const getCryptoPrices = async (
  coinIds = ALL_COIN_IDS,
  vsCurrency = "usd"
) => {
  const safeCoinIds = coinIds.map(sanitiseCoinId);
  const cacheKey = `crypto_prices_cache_cg_${safeCoinIds.join(",")}_${vsCurrency}`;

  const symbols = safeCoinIds
    .map((id) => CMC_SYMBOL_MAP[id])
    .filter(Boolean)
    .join(",");

  try {
    const headers = { "Accept": "application/json" };

    const res = await fetchWithTimeout(
      `${CMC_BASE}/cryptocurrency/quotes/latest?symbol=${symbols}&convert=${vsCurrency.toUpperCase()}`,
      {
        headers,
        timeout: 8000,
      }
    );

    if (!res.ok) throw new Error("CoinMarketCap API error");

    const data = await res.json();
    const result = {};
    const quotes = data?.data || {};

    for (const coinId of safeCoinIds) {
      const symbol = CMC_SYMBOL_MAP[coinId];
      const quote = quotes[symbol]?.[0];
      if (quote) {
        result[coinId] = {
          [vsCurrency]: quote.quote?.[vsCurrency.toUpperCase()]?.price || 0,
          [`${vsCurrency}_24h_change`]: quote.quote?.[vsCurrency.toUpperCase()]?.percent_change_24h || 0,
        };
      }
    }

    localStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), prices: result }));
    return result;
  } catch (error) {
    console.warn("CoinMarketCap API request failed. Attempting cache fallback...", error);
    return getFallbackPrices(safeCoinIds, vsCurrency, cacheKey);
  }
};

function getFallbackPrices(coinIds, vsCurrency, cacheKey) {
  if (cacheKey) {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        return parsed.prices;
      } catch (e) {
        console.error("Failed to parse cached crypto prices:", e);
      }
    }
  }

  const result = {};
  for (const coin of coinIds) {
    result[coin] = { [vsCurrency]: 0, [`${vsCurrency}_24h_change`]: 0 };
  }
  return result;
}

/**
 * Fetch exchange/market pairs for a coin using CoinGecko tickers endpoint.
 * Falls back to curated exchange list if API fails.
 */
export const getMarketPairs = async (slug, limit = 15,) => {
  if (!slug || typeof slug !== "string") return [];

  const cacheKey = `cg_markets_v2_${slug}`;
  const cacheTimeKey = `cg_markets_v2_time_${slug}`;

  try {
    const cached = localStorage.getItem(cacheKey);
    const cachedTime = localStorage.getItem(cacheTimeKey);
    if (cached && cachedTime && (Date.now() - parseInt(cachedTime, 10)) < 86400000) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}

  try {
    const url = `${COINGECKO_BASE}/coins/${slug}/tickers?include_exchange_logo=true&depth=false`;
    const res = await enqueueCgRequest(() => fetchWithRetry(url, { timeout: 12000 }));
    if (!res.ok) throw new Error(`CoinGecko ${res.status}`);
    const data = await res.json();

    if (data?.error || data?.status?.error_code) throw new Error(data.error || data.status?.error_message || "CoinGecko error");

    const tickers = data?.tickers || [];
    const topTickers = tickers.slice(0, Math.min(limit, tickers.length));

    const seenPairs = new Set();
    const markets = [];

    for (const t of topTickers) {
      const exchangeName = t.market?.name || "Unknown";
      const exchangeSlug = t.market?.identifier || "";
      const pair = t.base && t.target ? `${t.base}/${t.target}` : "";
      const pairKey = `${exchangeName.toLowerCase().replace(/[^a-z0-9]/g, "")}-${pair}`;
      if (seenPairs.has(pairKey)) continue;
      seenPairs.add(pairKey);

      markets.push({
        exchange: exchangeName,
        exchangeSlug,
        pair,
        price: t.last || 0,
        volume24h: t.converted_volume?.usd || t.volume || 0,
        volume24hQuote: t.converted_volume?.usd || t.volume || 0,
        marketShare: 0,
        confidenceScore: t.trust_score === "green" ? 95 : t.trust_score === "yellow" ? 80 : 70,
        liquidityScore: t.liquidity_score ? Math.round(t.liquidity_score * 10) : 70,
        lastUpdated: t.last_updated || new Date().toISOString(),
        url: t.trade_url || "",
        logoUrl: t.market?.logo || "",
      });
    }

    const totalVol = markets.reduce((s, m) => s + (m.volume24hQuote || 0), 0);
    const withShare = markets.map((m) => ({
      ...m,
      marketShare: totalVol > 0 ? ((m.volume24hQuote || 0) / totalVol) * 100 : 0,
    }));

    if (withShare.length > 0) {
      try {
        localStorage.setItem(cacheKey, JSON.stringify(withShare));
        localStorage.setItem(cacheTimeKey, String(Date.now()));
      } catch {}
      return withShare;
    }
  } catch {}

  return [];
};

/**
 * Fetch live rates for multiple target currencies from a single base.
 * @param {string} base - Base currency code e.g. "USD"
 * @param {string[]} targets - Array of target currency codes
 * @returns {Object} Map of target currency code -> rate
 */
export const getMultiRates = async (base = "USD", targets = []) => {
  const data = await getLatestRates(base);
  const result = {};
  for (const t of targets) {
    if (data.rates[t] !== undefined) {
      result[t] = data.rates[t];
    }
  }
  return result;
};

/**
 * Fetch OHLC candle data from Binance public API (no key required).
 * Returns data in the same format as getOHLCData.
 */
export const getBinanceOHLC = async (coinId, timeframe = "1D", limit = 100) => {
  const symbol = COIN_ID_TO_BINANCE[coinId];
  if (!symbol) return [];

  const interval = TIMEFRAME_TO_BINANCE_INTERVAL[timeframe] || "1d";
  const cacheKey = `binance_ohlc_${coinId}_${interval}`;
  const cacheTimeKey = `binance_ohlc_time_${coinId}_${interval}`;
  const ttlMs = timeframe === "1H" ? 3600000 : timeframe === "4H" ? 14400000 : timeframe === "1D" ? 86400000 : 604800000;

  try {
    const cached = localStorage.getItem(cacheKey);
    const cachedTime = localStorage.getItem(cacheTimeKey);
    if (cached && cachedTime && (Date.now() - parseInt(cachedTime, 10)) < ttlMs) {
      return JSON.parse(cached);
    }
  } catch {}

  try {
    const url = `${BINANCE_BASE}/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
    const res = await fetchWithTimeout(url, { timeout: 10000 });
    if (!res.ok) return [];

    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return [];

    const candles = data.map((k) => ({
      time: Math.floor(k[0] / 1000),
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
      volume: parseFloat(k[5]),
    })).filter((c) => c.time > 0 && c.close > 0);

    if (candles.length > 0) {
      localStorage.setItem(cacheKey, JSON.stringify(candles));
      localStorage.setItem(cacheTimeKey, String(Date.now()));
    }
    return candles;
  } catch {
    return [];
  }
};

/**
 * Fetch OHLC candle data from CoinGecko for chart rendering.
 * Returns cached data when available.
 */
export const getOHLCData = async (coinId, days = 30) => {
  if (!coinId) return [];

  const cacheKey = `cg_ohlc_cache_${coinId}_${days}`;
  const cacheTimeKey = `cg_ohlc_time_${coinId}_${days}`;

  try {
    const cached = localStorage.getItem(cacheKey);
    const cachedTime = localStorage.getItem(cacheTimeKey);
    if (cached && cachedTime && (Date.now() - parseInt(cachedTime, 10)) < 86400000) {
      return JSON.parse(cached);
    }
  } catch {}

  try {
    const url = `${COINGECKO_BASE}/coins/${coinId}/ohlc?vs_currency=usd&days=${days}`;
    const res = await enqueueCgRequest(() => fetchWithRetry(url, { timeout: 15000 }));
    if (!res.ok) throw new Error(`CoinGecko ${res.status}`);
    const data = await res.json();

    if (data?.error || data?.status?.error_code) throw new Error(data.error || data.status?.error_message || "CoinGecko error");

    const candles = (data || []).map(([time, open, high, low, close]) => ({
      time: Math.floor(time / 1000),
      open: open || 0,
      high: high || 0,
      low: low || 0,
      close: close || 0,
    }));

    if (candles.length > 0) {
      localStorage.setItem(cacheKey, JSON.stringify(candles));
      localStorage.setItem(cacheTimeKey, String(Date.now()));
    }
    return candles;
  } catch {
    return [];
  }
};
