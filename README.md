# ACC Oil Analysis App (v2)

![CI](https://github.com/aghafar-hub/acc-oil-analysis-app/actions/workflows/ci.yml/badge.svg)

The Arabian Cement Oil Analysis Management app, rebuilt as real, readable
React source. The previous repo (`oil-analysis-app`) only ever contained
pre-built minified bundles with no source code, which made it effectively
impossible to maintain or fix bugs in — this repo replaces that with a
standard, linted, tested-by-CI project anyone can read and extend.

It uses the **same Google Sheet as its database**, through the same Apps
Script Web App webhook contract — no changes to the sheet or the Apps
Script are required to use this app.

**📖 Full documentation: [`docs/`](./docs/README.md)** — architecture,
a file-by-file code guide, the Google Sheet schema, the webhook API
contract, and deployment instructions.

## Quick start

```bash
npm install
npm run dev
```

Open the app, go to **Settings**, and paste your Apps Script Web App URL
(the same one the original app used, e.g.
`https://script.google.com/macros/s/XXXX/exec`). It's stored only in your
browser's localStorage — never committed to this repo.

```bash
npm run lint          # ESLint
npm run format        # Prettier (auto-fix)
npm run format:check  # Prettier (check only, used in CI)
npm run build         # production build to dist/
```

## What this rebuild actually fixes

The original app silently lost edits: it wrote every change with
`fetch(webhookUrl, { mode: "no-cors" })`, which cannot read the server's
response, so a failed save looked identical to a successful one — the
screen updated, then the edit vanished on the next sync because it was
never actually written to the sheet.

This version (`src/api.js`) follows every write with a **verifying read**
and only updates the screen once the sheet actually reflects the change;
otherwise it shows a real error instead of a false "saved". Action data is
also lifted to one shared state array (`App.jsx`), used identically by the
Oil Analysis Report page and the Action Tracker page, so an edit made from
either one is reflected on the other immediately.

Full explanation, with the diagnosis that led to it: see
[`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md#the-sync-bug-and-its-fix).

## Project structure

```
src/
  api.js                     Apps Script webhook client (reads + verified writes)
  parsers.js                 row <-> object mapping for each sheet tab
  theme.js                   shared style tokens/helpers
  config.js                  localStorage persistence (webhook URL, cache)
  App.jsx                    top-level state (samples/actions/oilChanges) + routing
  components/
    Sidebar.jsx
    Toast.jsx
    ErrorBoundary.jsx
    LastActionsPanel.jsx     shared "Last N Actions" widget (Report + Tracker)
    EditActionModal.jsx
  pages/
    Dashboard.jsx / Equipment.jsx / OilAnalysisReport.jsx / ActionTracker.jsx
    AddSample.jsx / OilChangeLog.jsx / SampleTracker.jsx / HowToUse.jsx / Settings.jsx
docs/                        full documentation (start at docs/README.md)
.github/workflows/ci.yml     lint + format-check + build on every push/PR
```

See [`docs/CODE_GUIDE.md`](./docs/CODE_GUIDE.md) for what each file does.

## Known gaps vs. the original

- The `Data_Entry` sheet has a legacy "Reported Date" column far out at
  column 87, unrelated to the other 36 columns this app reads/writes; it's
  read but never written by this app (same as the original).
- The "Sample Tracker" page shows each equipment's sample history directly
  from `Data_Entry` rather than reading the separate "Oil Sample Tracker"
  monthly-grid sheet tab.
- Form field coverage favors what's visible in the original UI; a few
  less-used columns (particle counts, PQ index, some additive fields) can
  be added the same way — see [`docs/SHEET_SCHEMA.md`](./docs/SHEET_SCHEMA.md).
