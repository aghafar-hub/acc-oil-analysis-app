# ACC Oil Analysis App (v2)

A rebuild of the Arabian Cement Oil Analysis Management app as real, readable
React source (the previous repo, `oil-analysis-app`, only ever contained
pre-built minified bundles with no source code, which made it effectively
impossible to maintain or fix bugs in).

This app uses the same Google Sheet as its database, through the same Apps
Script Web App webhook contract (`readAll` / `append` / `updateRow` /
`deleteRow` / `getDashboard` / `getEquipment`, etc.) — no changes to the
sheet or the Apps Script are required to use this app, other than the
optional `Debug Log` tab and logging additions made while diagnosing the
original sync bug (safe to keep or remove).

## What was fixed vs. the original app

The original app wrote every change (add/edit/delete an action, update an
oil change, add a sample) with:

```js
fetch(webhookUrl, { method: "POST", mode: "no-cors", body: ... })
```

`no-cors` is required because the Apps Script Web App doesn't send CORS
headers on POST responses — but it also means the browser cannot read the
response. If the write failed on the server (row not found, a thrown error,
anything), the app had no way to know. It optimistically updated the screen
and assumed success. The edit looked saved, then reverted on the next sync
because it was never actually written to the sheet.

This rebuild (`src/api.js`) fixes that: every write is followed by a
**verifying read** (a plain GET, which — unlike POST — does get readable
CORS-enabled responses from Apps Script). If the freshly re-fetched row
doesn't match what was just saved, the app throws a real error and shows it
to the user via a toast, instead of silently pretending the save worked.
Local app state is only updated after that verification succeeds.

Action data is also lifted to one shared state array in `App.jsx`, used
identically by both the Oil Analysis Report page's "Last 5 Actions" panel
and the Action Tracker page — so an edit made from either page is reflected
on the other immediately, with no separate copies to fall out of sync.

## Setup

```bash
npm install
npm run dev
```

Open the app, go to **Settings**, and paste your Apps Script Web App URL
(the same one the original app used, e.g.
`https://script.google.com/macros/s/XXXX/exec`). It's stored only in your
browser's localStorage — never committed to this repo.

## Build & deploy

```bash
npm run build
```

Outputs to `dist/`. Deploy `dist/` to any static host (GitHub Pages, etc.).
`vite.config.js` sets `base: "/acc-oil-analysis-app/"` to match being served
from a `github.io/acc-oil-analysis-app/` style path — change it if you
deploy elsewhere (e.g. `base: "/"` for a custom domain or root deploy).

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
    LastActionsPanel.jsx     shared "Last N Actions" widget (Report + Tracker)
    EditActionModal.jsx
  pages/
    Dashboard.jsx
    Equipment.jsx
    OilAnalysisReport.jsx
    ActionTracker.jsx
    AddSample.jsx
    OilChangeLog.jsx
    SampleTracker.jsx
    HowToUse.jsx
    Settings.jsx
```

## Notes / known gaps vs. the original

- The original `Data_Entry` sheet has a legacy "Reported Date" column far out
  at column 87, unrelated to the other 36 columns this app reads/writes;
  that one field is read but never written by this app (same as the
  original).
- The "Sample Tracker" page here shows each equipment's sample history
  directly from `Data_Entry` rather than reading the separate
  "Oil Sample Tracker" monthly-grid sheet tab — simpler and doesn't require
  that sheet's cell-format parsing to stay correct.
- Field coverage on the Add Sample / Edit Action forms favors the fields
  visible in the original UI; a few less-used columns (e.g. particle counts,
  PQ index, some additive fields) can be added the same way if needed.
