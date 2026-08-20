# Second Loop

A mini secondhand shopping app that searches Facebook Marketplace, eBay, Depop, and Poshmark through [`secondhand-mcp`](https://github.com/jlsookiki/secondhand-mcp), then compares recognizable listings with a transparent original-retail-price catalog.

## What it does

- Searches Facebook Marketplace by product and city through MCP.
- Searches Depop and Poshmark without marketplace credentials when Chrome/Chromium is available.
- Searches eBay when developer credentials are configured.
- Lets shoppers select sources before searching and filter returned results by marketplace instantly.
- Shows a floating quick-search dock over results so shoppers can change the query and marketplace sources without scrolling back to the hero.
- Loads full-resolution listing photos on demand and provides previous/next carousel controls when multiple photos are available.
- Proxies approved marketplace CDN images through the local server for reliable rendering and short-lived caching.
- Labels exact and possible catalog matches with a confidence-aware comparison.
- Lets the shopper exclude any result from comparison or enter a trusted retail price manually.
- Clearly labels live, mixed, and sample-data states.

## Run locally

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:5173`.

Facebook works without credentials. To enable eBay, copy `.env.example` to `.env`, add `EBAY_CLIENT_ID` and `EBAY_CLIENT_SECRET`, then load those variables before starting the app. The server launches `secondhand-mcp@0.5.0` over stdio on the first live search.

```bash
npm run build
npm start
```

Set `DEMO_MODE=true` for a predictable offline/demo experience. When live sources fail, the default behavior also returns clearly labeled sample results so the UI remains testable.
