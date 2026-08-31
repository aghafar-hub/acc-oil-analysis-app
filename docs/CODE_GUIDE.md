# Code guide

A walkthrough of every file in `src/`, in the order you'd want to read them
to understand the app.

## Entry point

### `main.jsx`

Mounts `<App />` into `#root`, wrapped in `<ErrorBoundary>` and
`<React.StrictMode>`. Nothing app-specific happens here.

### `App.jsx`

The top of the component tree. Owns:

- **Data state**: `samples`, `actions`, `oilChanges` (arrays), seeded from
  `localStorage` cache on first render.
- **Sync**: `runSync()` calls `api.readAll()` and replaces all three arrays;
  runs once on mount if a webhook URL is configured, and again whenever
  "Full Sync" is clicked.
- **Write handlers**: `onAddAction`, `onUpdateAction`, `onDeleteAction`,
  `onSaveOilChange`, `onAddSample` — each calls the matching `api.js`
  function, updates local state _only on verified success_, and pushes a
  toast either way. These are passed down as props to whichever page needs
  them.
- **Navigation**: a simple `page` string state (no router) plus
  `selectedEquipment` for the currently-open Oil Analysis Report.
- **Derived values**: `equipmentOptions` (unique equipment codes, for
  dropdowns) and `openActionsCount` (for the sidebar badge), via `useMemo`.

## Data layer

### `api.js`

The only file that talks to the network. See
[ARCHITECTURE.md](./ARCHITECTURE.md#the-sync-bug-and-its-fix) for why it's
built the way it is. Exports:

- `readAll(webhookUrl)` — full sync, returns `{ samples, actions, oilChanges }`.
- `getDashboard(webhookUrl)` — the Apps Script's cached aggregate-counts endpoint (available if you want to use it instead of/alongside client-side aggregation).
- `getEquipmentRows(webhookUrl, code)` — raw rows for one equipment code; used both directly and as the verification step after every write.
- `saveAction`, `deleteAction`, `saveOilChange`, `saveSample` — writes, each verified.
- `SaveVerificationError` — thrown when a write can't be confirmed; callers catch it and surface the message via toast.

### `parsers.js`

Pure functions converting between a raw sheet row (`Array`) and the
JS object shape the UI works with, one pair per sheet tab:

- `rowToAction` / `actionToRow` (+ `ACTION_HEADERS`, `nextAcNo`)
- `rowToOilChange` / `oilChangeToRow`
- `rowToSample` / `sampleToRow`

Also `formatDate()`, a small date-formatting helper used everywhere dates
are displayed. See [SHEET_SCHEMA.md](./SHEET_SCHEMA.md) for exactly which
column maps to which field.

### `config.js`

Thin `localStorage` wrapper:

- `loadConfig()` / `saveConfig()` — the webhook URL (and any future
  settings), keyed under `acc_oilapp_config`.
- `readCache(key)` / `writeCache(key, data)` — per-dataset cache
  (`acc_oilapp_cache_samples`, etc.) so the UI has something to show
  immediately on load, before the first sync completes.

### `theme.js`

Design tokens (`T`, the color palette) and shared inline-style objects
(`s.card`, `s.btn`, `s.input`, `s.table`, `s.badge(status)`, etc.) used
across every component. There's no CSS framework — everything is plain
inline styles built from these shared objects, which keeps styling
consistent without adding a build dependency.

## Shared components (`src/components/`)

### `Sidebar.jsx`

Left navigation. Takes the current `page` and an `onNavigate` callback;
purely presentational plus the sync status footer and "Full Sync" button.

### `Toast.jsx`

Renders the stack of transient notifications (`toasts` array from
`App.jsx`). This is the visible half of the sync-bug fix — it's what shows
the user a save actually failed.

### `LastActionsPanel.jsx`

The "Last N Actions" widget, shared verbatim by the Oil Analysis Report
page and reused conceptually (same data/handlers) by the Action Tracker
page. Handles: filtering actions to one equipment code, the table, a
read-only "view" modal on row click, and opening `EditActionModal` for
add/edit. Delegates the actual save/delete to whatever `onAdd` / `onUpdate`
/ `onDelete` it was given — it doesn't know or care whether those go to
Google Sheets or somewhere else.

### `EditActionModal.jsx`

The add/edit form for a single action row — all 16 real Action Tracker
fields, verified field-by-field against both the live sheet and the
original app's edit form (see `docs/SHEET_SCHEMA.md`'s Action Tracker
section). Local form state only; calls `onSave(formValues)` when the user
clicks Save, and lets the parent decide what "save" means (add vs. update)
and how to handle failure.

One field has a cross-sheet side effect: setting **Last Change** here also
computes an `_oilChangeTarget` (the matching Oil Change Log row for that
equipment, disambiguated by a lubrication-point picker if the equipment has
more than one) and attaches it to the saved payload. `App.jsx`'s
`applyOilChangeSideEffect` then pushes a second, separately-verified write
to update that row's `changeDate` after the action itself is confirmed
saved. Leaving Last Change blank instead inherits the existing Oil Change
Log date onto the action, rather than writing anything.

### `ErrorBoundary.jsx`

Standard React error boundary. Catches any render-time exception the app
doesn't otherwise handle and shows a "Something went wrong" screen with a
reload button, instead of a blank white page.

## Pages (`src/pages/`)

Each page is a straightforward function component that receives its data
and callbacks as props from `App.jsx` — none of them fetch data
themselves.

| Page                    | Purpose                                                                                                                                                                    |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Dashboard.jsx`         | Stat tiles (critical/warning/normal counts, overdue oil changes, pending actions) computed client-side from `samples`/`actions`/`oilChanges`, plus a recent-samples table. |
| `Equipment.jsx`         | Searchable list of equipment, one row per equipment code showing its latest sample and open-action count.                                                                  |
| `OilAnalysisReport.jsx` | Full detail view for one sample: ratings, wear metals, additives, recommendations, last oil change, and the `LastActionsPanel`.                                            |
| `ActionTracker.jsx`     | All actions, grouped by equipment, expandable, with search/status filters. Uses the same action CRUD handlers as the report page.                                          |
| `AddSample.jsx`         | Form to append a new row to `Data_Entry`.                                                                                                                                  |
| `OilChangeLog.jsx`      | Table of oil change records with a small modal to update last-change/next-due dates.                                                                                       |
| `SampleTracker.jsx`     | Per-equipment sample history timeline, derived from `Data_Entry` (see the note on this in the main README about the original's separate "Oil Sample Tracker" sheet tab).   |
| `HowToUse.jsx`          | Static help content.                                                                                                                                                       |
| `Settings.jsx`          | Where the webhook URL is entered/saved, plus manual sync trigger and status.                                                                                               |

## Where to make a change

- **Add a field to actions/samples/oil changes**: update the relevant
  `rowTo*`/`*ToRow` pair in `parsers.js` first (matching the real sheet
  column — see [SHEET_SCHEMA.md](./SHEET_SCHEMA.md)), then add the field to
  the relevant form (`EditActionModal.jsx` or `AddSample.jsx`) and display
  it wherever relevant.
- **Change how a write is verified**: `api.js`, in the specific `save*`/`delete*` function.
- **Change styling**: `theme.js` — colors and shared style objects only;
  component-specific one-off styles live inline in that component.
- **Add a page**: create it under `src/pages/`, add a nav entry in
  `Sidebar.jsx`'s `NAV` array, and wire it into the `page === "..."`
  conditionals in `App.jsx`.
