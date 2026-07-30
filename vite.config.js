import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production'
  const rootDir = fileURLToPath(new URL('.', import.meta.url))
  const env = loadEnv(mode, process.cwd(), '')
  const cmcApiKey = env.CMC_API_KEY || ''
  if (!cmcApiKey && mode === 'development') {
    console.warn('[vite] CMC_API_KEY not set — CMC API proxy will return 401 in dev. Set it via firebase functions:config:set coinmarketcap.key="YOUR_KEY"')
  }

  return {
    root: rootDir,

    plugins: [
      react(),
      tailwindcss(),

      // ── SECURITY ─────────────────────────────────────────────────────────────
      // Strip the CSP <meta> in dev so Vite HMR / React Fast Refresh work freely.
      // In production the CSP is enforced by the meta tag in index.html AND by
      // the HTTP headers set in firebase.json (HTTP headers always win over meta).
      !isProduction && {
        name: 'remove-csp-in-dev',
        transformIndexHtml(html) {
          return html.replace(
            /<meta[^>]*http-equiv=["']Content-Security-Policy["'][^>]*>/is,
            ''
          )
        },
      },
    ].filter(Boolean),

    // ── DEV PROXY ──────────────────────────────────────────────────────────────
    // Route API calls through Vite's dev server to bypass CORS restrictions.
    server: {
      proxy: {
        '/api/cmc': {
          target: 'https://pro-api.coinmarketcap.com/v1',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/cmc/, ''),
          headers: {
            'X-CMC_PRO_API_KEY': cmcApiKey,
            'Accept': 'application/json',
          },
        },

        '/api/coingecko': {
          target: 'https://api.coingecko.com/api/v3',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/coingecko/, ''),
          headers: {
            'Accept': 'application/json',
          },
        },

        '/api/er-api': {
          target: 'https://open.er-api.com/v6',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/er-api/, ''),
        },
      },
    },

    resolve: {
      dedupe: ['react', 'react-dom'],
    },

    // ── ESBUILD OPTIONS ──────────────────────────────────────────────────────
    // Applied to every JS/TS transform (both dev and prod by default).
    // We scope the aggressive options to production only.
    esbuild: isProduction
      ? {
          // Drop console.* and debugger statements at the AST level — more
          // reliable than regex-replace and zero runtime overhead.
          drop: ['console', 'debugger'],

          // Strip JSDoc / license block comments from output.
          legalComments: 'none',

          // Mangle property names whose patterns start with `_` to prevent
          // trivial reverse-engineering of internal field names.
          // (Rollup handles top-level identifier mangling via minifyIdentifiers.)
        }
      : undefined,

    // ── BUILD OPTIONS ────────────────────────────────────────────────────────
    build: {
      // Never emit source maps in production — keeps the compiled bundle
      // unreadable in DevTools and prevents IP disclosure via mapped sources.
      sourcemap: false,

      // esbuild is the default bundler; it is fast and battle-tested.
      minify: 'esbuild',

      // Raise the chunk-size warning threshold slightly so the console stays
      // clean while we are iterating. Adjust as needed.
      chunkSizeWarningLimit: 600,

      rollupOptions: {
        input: {
          app: fileURLToPath(new URL('index.html', import.meta.url)),
        },
        output: isProduction
          ? {
              // ── CHUNK NAME OBFUSCATION ────────────────────────────────────
              // Use content-hash-only filenames in production so an attacker
              // cannot enumerate or guess module names from the network tab.
              chunkFileNames:  'assets/[hash].js',
              entryFileNames:  'assets/[hash].js',
              assetFileNames:  'assets/[hash][extname]',

              manualChunks(id) {
                if (!id.includes('node_modules')) return undefined
                if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
                  return 'vendor-react'
                }
                if (id.includes('firebase') || id.includes('@firebase')) {
                  return 'vendor-firebase'
                }
                if (id.includes('framer-motion')) {
                  return 'vendor-motion'
                }
                if (id.includes('recharts') || id.includes('d3-') || id.includes('victory-vendor')) {
                  return 'vendor-charts'
                }
                if (id.includes('lucide-react')) {
                  return 'vendor-icons'
                }
                return 'vendor'
              },
            }
          : {
              // Readable names in dev for easier debugging.
              chunkFileNames:  'assets/[name]-[hash].js',
              entryFileNames:  'assets/[name]-[hash].js',
              assetFileNames:  'assets/[name]-[hash][extname]',
            },
      },
    },
  }
})
