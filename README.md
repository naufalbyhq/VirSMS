# VirSMS

A clean, self-hosted dashboard for purchasing temporary virtual phone numbers via Tiger SMS — receive OTP codes in real-time with a zero-config backend proxy that keeps your API key server-side.

## Features

- Browse 1000+ services (WhatsApp, Telegram, Google, and more) with live pricing and stock
- Filter by country and service, hide out-of-stock numbers
- Real-time SMS polling — codes appear automatically with a chime notification
- Copy number or code with one click (also `C` / `Enter` keyboard shortcut)
- Request another code or cancel an activation
- Full history log with CSV export
- API key never reaches the browser — injected server-side by the Express proxy
- Rate limiting and security headers on the proxy

## Stack

- **React 19** + **TypeScript** + **Vite 7**
- **Tailwind CSS** + **Lucide** icons
- **Express 5** proxy (server-side API key injection)
- **Helmet** + **express-rate-limit** for security
- [Tiger SMS API](https://tiger-sms.com)

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/yourname/virsms.git
cd virsms
npm install
```

### 2. Set your API key

```bash
cp .env.example .env
```

Open `.env` and fill in your key:

```env
TIGER_API_KEY=your_tiger_sms_api_key_here
```

Get your key from [tiger-sms.com](https://tiger-sms.com) → Account → API.

### 3. Run in development

```bash
npm run dev
```

Opens at [http://localhost:5173](http://localhost:5173). The Express proxy runs embedded in the Vite dev server — no separate process needed.

### 4. Build for production

```bash
npm run build        # compiles to dist/
npm run server       # starts the Express proxy on port 3001
```

Serve the `dist/` folder with any static host (Nginx, Caddy, etc.) and point it to the Express proxy. Set `TIGER_API_KEY` as an environment variable on your server — never deploy your `.env` file.

## Project Structure

```
virsms/
├── server.js                  # Express proxy — holds the API key server-side
├── src/
│   ├── App.tsx                # Main application
│   ├── components/
│   │   └── HistoryTable.tsx   # History log table
│   ├── lib/
│   │   ├── api.ts             # Tiger SMS API client (no key — uses proxy)
│   │   ├── format.ts          # Phone number formatter
│   │   └── utils.ts           # cn() utility
│   └── constants/
│       ├── services.ts        # Service list with icons
│       ├── countries.ts       # Country list
│       ├── countryFlags.ts    # Flag emoji mapping
│       └── countryCodes.ts    # Dial code mapping
├── .env.example               # Environment variable template
└── vite.config.ts             # Vite config + dev proxy plugin
```

## Security

- The Tiger SMS API key is read from `process.env` in `server.js` and injected into upstream requests. It is **never** sent to the browser or included in the JS bundle.
- The proxy enforces **60 requests per 15 minutes** per IP via `express-rate-limit`.
- HTTP security headers are set by **Helmet**.
- `.env` is gitignored — never commit it.

## License

MIT
