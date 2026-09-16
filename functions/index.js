const { onRequest } = require("firebase-functions/v2/https");
const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

const CMC_API_KEY = functions.config().coinmarketcap?.key || process.env.CMC_API_KEY;
const CG_BASE_URL = "https://api.coingecko.com/api/v3";
const CG_CACHE_MAX_AGE_MS = 15 * 60 * 1000;
const cgCache = new Map();

function setCors(req, res) {
  const origin = req.get("origin") || "";
  if (
    /^https:\/\/convertxapp\.firebaseapp\.com$/.test(origin) ||
    /^https:\/\/convertxapp\.web\.app$/.test(origin) ||
    /^http:\/\/localhost:\d+$/.test(origin) ||
    /^http:\/\/127\.0\.0\.1:\d+$/.test(origin)
  ) {
    res.set("Access-Control-Allow-Origin", origin);
    res.set("Vary", "Origin");
  }
  res.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Accept");
}

function getCoinGeckoCacheTtl(pathname) {
  if (pathname.includes("/market_chart")) return 10 * 60 * 1000;
  if (pathname.includes("/ohlc")) return 10 * 60 * 1000;
  if (pathname.includes("/simple/price")) return 60 * 1000;
  if (pathname.includes("/tickers")) return 10 * 60 * 1000;
  return 5 * 60 * 1000;
}

function readCgCache(cacheKey, allowStale = false) {
  const cached = cgCache.get(cacheKey);
  if (!cached) return null;

  const age = Date.now() - cached.timestamp;
  if (!allowStale && age > cached.ttlMs) return null;
  if (allowStale && age > CG_CACHE_MAX_AGE_MS) return null;
  return cached;
}

function isAllowedCoinGeckoPath(pathname) {
  return [
    /^\/simple\/price$/,
    /^\/coins\/[a-z0-9-]+\/market_chart$/,
    /^\/coins\/[a-z0-9-]+\/ohlc$/,
    /^\/coins\/[a-z0-9-]+\/tickers$/,
  ].some((pattern) => pattern.test(pathname));
}

exports.cmcProxy = onRequest(
  {
    cors: [/convertxapp\.firebaseapp\.com$/, /convertxapp\.web\.app$/],
    region: "us-central1",
    invoker: "public",
  },
  async (req, res) => {
    if (!CMC_API_KEY || CMC_API_KEY === "YOUR_API_KEY_HERE") {
      res.status(503).json({ error: "CoinMarketCap API key not configured." });
      return;
    }

    if (req.method !== "GET") {
      res.status(405).json({ error: "Method not allowed." });
      return;
    }

    try {
      const path = req.path.replace(/^\/+/, "");
      const queryString = new URL(req.url).search;
      const targetUrl = `https://pro-api.coinmarketcap.com/v1/${path}${queryString}`;

      const response = await fetch(targetUrl, {
        method: "GET",
        headers: {
          "X-CMC_PRO_API_KEY": CMC_API_KEY,
          "Accept": "application/json",
        },
      });

      const data = await response.json();
      res.status(response.status).json(data);
    } catch (error) {
      console.error("CMC proxy error:", error.message);
      res.status(502).json({ error: "Failed to fetch from CoinMarketCap." });
    }
  }
);

exports.coingeckoProxy = onRequest(
  {
    cors: false,
    region: "us-central1",
    invoker: "public",
  },
  async (req, res) => {
    setCors(req, res);

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    if (req.method !== "GET") {
      res.status(405).json({ error: "Method not allowed." });
      return;
    }

    const pathname = `/${req.path.replace(/^\/+/, "")}`;
    if (!isAllowedCoinGeckoPath(pathname)) {
      res.status(400).json({ error: "Unsupported CoinGecko endpoint." });
      return;
    }

    const queryString = new URL(req.url, "https://convertx.local").search;
    const cacheKey = `${pathname}${queryString}`;
    const cached = readCgCache(cacheKey);
    if (cached) {
      res.set("Cache-Control", "public, max-age=60, stale-while-revalidate=600");
      res.set("X-ConvertX-Cache", "hit");
      res.status(cached.status).json(cached.data);
      return;
    }

    const targetUrl = `${CG_BASE_URL}${pathname}${queryString}`;

    try {
      const response = await fetch(targetUrl, {
        method: "GET",
        headers: { "Accept": "application/json" },
      });

      const data = await response.json();
      const ttlMs = getCoinGeckoCacheTtl(pathname);

      if (response.ok) {
        cgCache.set(cacheKey, {
          data,
          status: response.status,
          timestamp: Date.now(),
          ttlMs,
        });
      }

      if (response.status === 429) {
        const stale = readCgCache(cacheKey, true);
        if (stale) {
          res.set("Cache-Control", "public, max-age=30, stale-while-revalidate=600");
          res.set("X-ConvertX-Cache", "stale");
          res.status(stale.status).json(stale.data);
          return;
        }
      }

      const retryAfter = response.headers.get("retry-after");
      if (retryAfter) res.set("Retry-After", retryAfter);
      res.set("Cache-Control", response.ok ? "public, max-age=60" : "no-store");
      res.set("X-ConvertX-Cache", "miss");
      res.status(response.status).json(data);
    } catch (error) {
      const stale = readCgCache(cacheKey, true);
      if (stale) {
        res.set("Cache-Control", "public, max-age=30, stale-while-revalidate=600");
        res.set("X-ConvertX-Cache", "stale");
        res.status(stale.status).json(stale.data);
        return;
      }

      console.error("CoinGecko proxy error:", error.message);
      res.status(502).json({ error: "Failed to fetch from CoinGecko." });
    }
  }
);
