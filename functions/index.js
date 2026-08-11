const { onRequest } = require("firebase-functions/v2/https");
const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

const CMC_API_KEY = functions.config().coinmarketcap?.key || process.env.CMC_API_KEY;

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
