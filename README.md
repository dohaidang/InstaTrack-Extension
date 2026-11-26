# Instagram Tracker Extension

A Manifest V3 Chrome extension that creates verified, local snapshots of an Instagram account's followers and following lists.

## What it does

- Scans followers and following from an authenticated Instagram tab.
- Shows mutual accounts, new followers, lost followers, and accounts that do not follow back.
- Keeps the lost-account list attached to each retained scan-history entry.
- Keeps independent records for multiple Instagram accounts.
- Stores timestamped scan summaries and exports account lists to CSV.
- Uses an atomic commit: a failed or incomplete scan cannot replace the last verified record.
- Keeps all tracking data in `chrome.storage.local`; there is no private application backend.

## Install from source

```powershell
npm install
npm run check
```

Then open `chrome://extensions`, enable Developer mode, choose **Load unpacked**, and select the generated `dist` directory.

## Development

```powershell
npm run dev
npm test
npm run build
```

The browser development view installs a small in-memory Chrome API mock. The mock is never used inside the packaged extension.

## Scan integrity

A scan is committed only when both follower and following pagination finish naturally. Because Instagram's profile counters can briefly drift from its list API, a completed list may differ by at most 2% and no more than three accounts; larger gaps, HTTP errors, rate limits, timeouts, or page limits leave the previous verified data unchanged.

## Technical stack

- React 18
- TypeScript in strict mode
- Vite
- Tailwind CSS build pipeline
- Chrome Extension Manifest V3
- Local Fraunces and IBM Plex Sans WOFF2 assets

## Limitations

The scanner relies on Instagram web endpoints used from the signed-in browser session. Instagram can change or rate-limit these endpoints. Large accounts take longer because requests are deliberately serialized with delays.

---

Powered by DoHaiDang
