# AKKAWIT SpeedCheck — Minimal Personal Edition

Single-purpose internet speed test with Midnight Blue theme.

## Run

Requires Node.js 18+. Run `node server.js` then open `http://localhost:3000`. For deployment use a Node.js web service, start command `node server.js`, and set the custom domain `speed.akkawit.com` through your hosting provider and Cloudflare DNS.

## What it does

- Measures HTTP download, upload, ping, and jitter against **this app's server**.
- Shows results only in page memory. **No localStorage, cookies, database, or test history.**
- Reset clears displayed results. Close or reload the tab to discard results.
- No sign-in. HTTP requests and ordinary hosting/CDN logs may still contain metadata such as IP addresses; this application does not write its own result logs.

## Accuracy and cost

This is a basic sequential HTTP speed test, not a calibrated substitute for a commercial multi-stream speed test. Results depend on server capacity, network path, and hosting/CDN limits. Each test transfers tens of MB; mobile data charges and host bandwidth quotas may apply. Free-tier hosting can underestimate fast connections.
