import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'

const PREAMBLE_ID = '/@vite-react-preamble.js'

function reactPreambleExternalPlugin(): Plugin {
  let isDev = false
  return {
    name: 'react-preamble-external',
    configResolved(config) {
      isDev = config.command === 'serve'
    },
    resolveId(id) {
      if (isDev && id === PREAMBLE_ID) return '\0' + PREAMBLE_ID
    },
    load(id) {
      if (isDev && id === '\0' + PREAMBLE_ID) {
        return react.preambleCode.replace('__BASE__', '/')
      }
    },
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        if (!isDev) return html
        return html.replace(
          /<script type="module">([\s\S]*?import \{ injectIntoGlobalHook \}[\s\S]*?)<\/script>/,
          `<script type="module" src="${PREAMBLE_ID}"></script>`
        )
      },
    },
  }
}

function tigerProxyPlugin(): Plugin {
  return {
    name: 'tiger-proxy',
    async configureServer(server) {
      const { default: express } = await import('express')
      const { default: helmet } = await import('helmet')
      const { default: rateLimit } = await import('express-rate-limit')
      const { createProxyMiddleware } = await import('http-proxy-middleware')
      const { config } = await import('dotenv')
      config()

      const API_KEY = process.env.TIGER_API_KEY
      if (!API_KEY) {
        throw new Error('TIGER_API_KEY is not set in .env')
      }

      const proxy = express()
      proxy.use(helmet())
      proxy.use(
        '/api/tiger',
        rateLimit({ windowMs: 15 * 60 * 1000, max: 60, standardHeaders: true, legacyHeaders: false })
      )
      proxy.use(
        '/api/tiger',
        createProxyMiddleware({
          target: 'https://api.tiger-sms.com',
          changeOrigin: true,
          pathRewrite: { '^/api/tiger': '/stubs/handler_api.php' },
          on: {
            proxyReq: (proxyReq, req) => {
              const url = new URL(req.url!, 'http://localhost')
              url.searchParams.set('api_key', API_KEY)
              proxyReq.path = '/stubs/handler_api.php?' + url.searchParams.toString()
            },
            error: (_err, _req, res) => {
              if (!('headersSent' in res && res.headersSent)) {
                (res as import('http').ServerResponse).writeHead(502)
                res.end(JSON.stringify({ error: 'Upstream service unavailable.' }))
              }
            },
          },
        })
      )

      server.middlewares.use(proxy)
    },
  }
}

export default defineConfig({
  plugins: [react(), reactPreambleExternalPlugin(), tigerProxyPlugin()],
})
