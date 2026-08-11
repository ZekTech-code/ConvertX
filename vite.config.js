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

      rollupOptions: {
        input: {
          app: fileURLToPath(new URL('index.html', import.meta.url)),
        },
        output: isProduction
          ? {
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
              chunkFileNames:  'assets/[name]-[hash].js',
              entryFileNames:  'assets/[name]-[hash].js',
              assetFileNames:  'assets/[name]-[hash][extname]',
            },
      },
    },
  }
})
