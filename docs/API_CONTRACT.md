# Apps Script webhook contract

This app talks to a Google Apps Script deployed as a Web App (**Execute
as: Me**, **Who has access: Anyone**). The script itself lives in your
Google Sheet's Apps Script project, not in this repo. This document
describes the HTTP contract this app relies on, so the script can be
maintained independently as long as the contract holds.

Base URL is whatever you paste into **Settings** — an
`https://script.google.com/macros/s/XXXX/exec` URL.

## Reads — `GET`

Plain `fetch(url)` works for these (see
[ARCHITECTURE.md](./ARCHITECTURE.md#the-sync-bug-and-its-fix) for why reads,
unlike writes, don't need `no-cors`). Query params:

| `action`                                            | Params                  | Returns                                                                                                                                                               |
| --------------------------------------------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `readAll`                                           | —                       | `{ samples, actions, oilChanges, tracker }` — full sheet dump, each as arrays of raw row arrays                                                                       |
| `getEquipment`                                      | `id`                    | `{ samples, actions, oilChanges }` filtered to one equipment code — used both for the Equipment view and, in this app, as the **verification read** after every write |
| `getDashboard`                                      | —                       | Aggregated counts, server-cached 5 minutes                                                                                                                            |
| `searchEquipment`                                   | `q`                     | Up to 20 matching rows                                                                                                                                                |
| `getActions` / `getOilChanges` / `getRecentSamples` | `page`, `limit`         | Paginated raw rows                                                                                                                                                    |
| `getChanges`                                        | `since` (ISO timestamp) | Rows modified after `since`, for incremental sync (not currently used by this app — see note below)                                                                   |
| `readEquipmentRegistry`                             | —                       | Equipment master data, if that sheet tab exists                                                                                                                       |

`api.js` currently only uses `readAll` (full sync) and `getEquipment`
(write verification). The paginated/incremental endpoints exist on the
backend and are straightforward to wire up if the sheet grows large enough
that a full sync becomes slow.

## Writes — `POST`

Sent as `fetch(url, { method: "POST", mode: "no-cors", body: JSON.stringify(payload) })`.
Because of `no-cors`, **the response is not readable** by this app — see
the architecture doc for why, and how this app compensates with a
verification read.

| `payload.action`      | Payload shape                                                          | Effect                                                                                                                                               |
| --------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `append`              | `{ action: "append", sheet, row, headers }`                            | Appends `row` to `sheet`, creating the sheet with `headers` if it doesn't exist                                                                      |
| `updateRow`           | `{ action: "updateRow", sheet, matchCols, matchValues, row }`          | Finds the row where columns `matchCols` equal `matchValues`, overwrites it with `row`                                                                |
| `deleteRow`           | `{ action: "deleteRow", sheet, matchCols, matchValues }`               | Deletes the matched row                                                                                                                              |
| `updateSampleTracker` | `{ action: "updateSampleTracker", equipmentCode, sampleDate, status }` | Updates the separate "Oil Sample Tracker" monthly-grid sheet (not used by this app's `SampleTracker.jsx`, which reads `Data_Entry` directly instead) |

`matchCols` is an array of 0-indexed column numbers; `matchValues` is the
corresponding array of values to match. See
[SHEET_SCHEMA.md](./SHEET_SCHEMA.md) for which columns each sheet is
matched on.

## Error handling on the backend

The Apps Script wraps `doPost` in a try/catch and always returns a JSON
body describing the outcome (`{status: "ok"}`, `{status: "row_not_found"}`,
`{status: "error", message}`) — but because writes go through `no-cors`,
**this app never sees that body**. If you're debugging a write that isn't
landing, the fastest path is:

1. Open the Apps Script project → **Executions** (left sidebar, clock
   icon) to see whether `doPost` ran at all and whether it errored.
2. If nothing shows there for a request you just made, the request isn't
   reaching the script — check the deployed Web App version matches the
   code you're reading (**Deploy → Manage deployments**), since Apps
   Script doesn't auto-publish code changes to the live URL.
3. For anything beyond a hard crash (e.g. a silent `row_not_found`), add
   temporary logging to a sheet tab (append a row to a "Debug Log" sheet
   from inside `doPost`'s branches) — the Executions log only reliably
   surfaces uncaught exceptions, not handled-but-unexpected return values.

This app's own verification-read approach (in `api.js`) is a client-side
way to catch the same class of problem without needing access to the
Apps Script's execution logs at all.
