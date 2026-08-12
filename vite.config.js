import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production'
  const rootDir = fileURLToPath(new URL('.', import.meta.url))
  const env = loadEnv(mode, process.cwd(), '')
  const cmcApiKey = env.CMC_API_KEY || ''

  return {
    root: rootDir,

    plugins: [
      react(),
      tailwindcss(),

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

    esbuild: isProduction
      ? {
          drop: ['console', 'debugger'],

          legalComments: 'none',

        }
      : undefined,

    build: {
      sourcemap: false,

      minify: 'esbuild',

      chunkSizeWarningLimit: 600,

      rolldownOptions: {
        output: isProduction
          ? {
              chunkFileNames:  'assets/[hash].js',
              entryFileNames:  'assets/[hash].js',
              assetFileNames:  'assets/[hash][extname]',
            }
          : {
              chunkFileNames:  'assets/[name]-[hash].js',
              entryFileNames:  'assets/[name]-[hash].js',
              assetFileNames:  'assets/[name]-[hash][extname]',
            },
      },
    },
  }
})
