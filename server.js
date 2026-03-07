import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();
const PORT = process.env.PORT || 3001;

// ── Validate required env vars at startup ──────────────────────────────────────
const API_KEY = process.env.TIGER_API_KEY;
if (!API_KEY) {
  console.error('FATAL: TIGER_API_KEY is not set in the environment.');
  process.exit(1);
}

// ── Security headers ───────────────────────────────────────────────────────────
app.use(helmet());

// ── Rate limiting: max 60 requests / 15 min per IP ────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.' },
});
app.use('/api/tiger', limiter);

// ── Proxy: inject API key server-side, never expose it to the client ──────────
app.use(
  '/api/tiger',
  createProxyMiddleware({
    target: 'https://api.tiger-sms.com',
    changeOrigin: true,
    pathRewrite: { '^/api/tiger': '/stubs/handler_api.php' },
    on: {
      proxyReq: (proxyReq, req) => {
        // Parse the original query and inject the real API key
        const url = new URL(req.url, 'http://localhost');
        url.searchParams.set('api_key', API_KEY);

        // Strip the proxy prefix so the rewritten path is clean
        const newPath = '/stubs/handler_api.php' + '?' + url.searchParams.toString();
        proxyReq.path = newPath;
      },
      error: (err, req, res) => {
        console.error('[proxy error]', err.message);
        if (!res.headersSent) {
          res.status(502).json({ error: 'Upstream service unavailable.' });
        }
      },
    },
  })
);

app.listen(PORT, () => {
  console.log(`[server] Proxy listening on http://localhost:${PORT}`);
});
