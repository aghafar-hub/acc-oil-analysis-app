# Google Sheet schema

The Apps Script reads/writes these tabs in the connected Google Sheet.
Columns are listed 0-indexed (as used in `matchCols`/array code) with the
1-indexed spreadsheet column letter alongside for reference.

**This document was verified directly against the live sheet** (opened as
an `.xlsx` export and inspected cell-by-cell with `openpyxl`, not just
inferred from the app's minified code) — every column position, row-start
offset, and match key below was cross-checked against real data, not
assumed. Row/column counts as of that check: **264 action rows**, **851
sample rows**, **150 oil change rows**, **152 registered equipment**.

This layout is load-bearing: it must match both the Apps Script's
`dataStartRowFor()` / `readSheet()` functions and this app's `parsers.js`.
If a column is ever inserted/removed/reordered in the sheet, update
`parsers.js` (and the Apps Script) to match — don't just add a field and
assume it lines up.

## Action Tracker

Data starts at **row 6** (rows 1–5 are title/filter-controls/status-summary/header).

| Index  | Column                   | Field                                                              |
| ------ | ------------------------ | ------------------------------------------------------------------ |
| 0 (A)  | Ac. No.                  | `acNo`                                                             |
| 1 (B)  | Equipment Code           | `equipmentCode`                                                    |
| 2 (C)  | Description              | `description`                                                      |
| 3 (D)  | Oil Type                 | `oilType`                                                          |
| 4 (E)  | Revision Date            | `revisionDate`                                                     |
| 5 (F)  | Sample Date              | `sampleDate`                                                       |
| 6 (G)  | Sample Result            | `sampleResult`                                                     |
| 7 (H)  | Sample Analysis          | `sampleAnalysis`                                                   |
| 8 (I)  | Last Change              | `lastChange`                                                       |
| 9 (J)  | Status                   | `status`                                                           |
| 10 (K) | Contractor Action        | `contractorAction`                                                 |
| 11 (L) | Contractor               | `contractor`                                                       |
| 12 (M) | Completed Date           | `completedDate`                                                    |
| 13 (N) | Prev Month Agreed Action | `prevMonthAgreedAction`                                            |
| 14 (O) | Acc Action               | `accAction`                                                        |
| 15 (P) | Agreed Action            | `agreedAction`                                                     |
| 16 (Q) | Last Modified            | _(written automatically by the Apps Script; not read by this app)_ |

Real values seen: `Status` is one of `Open` (57) / `In Progress` (3) /
`Waiting Stoppage` (32) / `Closed` (171); `Sample Result` includes `ALERT`,
`CAUTION`, `NORMAL`, `MISSING`, and `Oil Changed` — the last two weren't in
this app's badge-color maps until this check, now added
(`theme.js`'s `badge()` and `LastActionsPanel.jsx`'s `RESULT_COLOR`).

**A row is matched for update/delete on columns [0, 1]** — `acNo` +
`equipmentCode` together. This isn't just theoretical caution: the live
data has two real cases (`O-242`, `O-251`) where the **same Ac. No. is
reused across two different equipment codes** (e.g. `O-242` appears once
for `R2.322.HY110` and once for `R2.332.FN110(Fr.B.)`). Matching on `acNo`
alone would silently hit whichever of those two rows the sheet happens to
list first — matching on the pair is what keeps that safe, and both
values are always the row's _original_ identity, never the edited one
(see `api.js`'s `saveAction`).

## Oil Change Log

Data starts at **row 4** (rows 1–3 are title/subtitle/header).

| Index     | Column                 | Field                                                                                                 |
| --------- | ---------------------- | ----------------------------------------------------------------------------------------------------- |
| 0 (A)     | Asset                  | `equipmentCode`                                                                                       |
| 1 (B)     | Asset Name             | `assetName` (e.g. "Apron Feeder", "Belt Conveyor" — an equipment category, not unique per row)        |
| 2 (C)     | Lubrication Points     | `lubricationPoint`                                                                                    |
| 3 (D)     | Frequncy \[sic]        | `frequency`                                                                                           |
| 4 (E)     | Oil Type               | `oilType`                                                                                             |
| 5 (F)     | Brand                  | `brand`                                                                                               |
| 6 (G)     | Qty (ltr.)             | `quantity`                                                                                            |
| 7–8 (H–I) | \[merged] Change Dates | historical change-date columns; not read/written by this app                                          |
| 9 (J)     | Last change            | `changeDate`                                                                                          |
| 10 (K)    | Next Oil Change        | `nextDueDate`                                                                                         |
| 11 (L)    | Status                 | `status` — **a sheet formula**; the Apps Script's `updateRow` never writes this column, only reads it |
| 12 (M)    | Last Modified          | _(written automatically)_                                                                             |

Column 1 ("Asset Name") was previously read as blank by this app — fixed;
it's real data and now shown. It's still never written on update (the
Apps Script's `updateRow` special-cases this sheet to only ever touch
columns 9 and 10, regardless of what the rest of the row contains), so
there's no risk of accidentally clobbering it.

Matched on columns **[0, 2, 4]** — Equipment Code + Lubrication Point + Oil
Type together (a piece of equipment can have more than one lubrication
point / oil type combination). Verified unique across all 150 real rows —
no collisions found.

## Data_Entry (samples)

Data starts at **row 6** (rows 1–5 are title/instructions/header).

| Index | Field                 | Index | Field                                 |
| ----- | --------------------- | ----- | ------------------------------------- |
| 0     | `unitId`              | 18    | `wear.Cr`                             |
| 1     | `description`         | 19    | `wear.Cu`                             |
| 2     | `sampleId`            | 20    | `wear.Fe`                             |
| 3     | `sampledDate`         | 21    | `wear.Mo`                             |
| 4     | `reportStatus`        | 22    | `wear.Ni`                             |
| 5     | `contaminationRating` | 23    | `wear.Pb`                             |
| 6     | `equipmentRating`     | 24    | `wear.Sn`                             |
| 7     | `lubricantRating`     | 25    | `contaminants.K`                      |
| 8     | `particleCount4um`    | 26    | `contaminants.Na`                     |
| 9     | `particleCount6um`    | 27    | `contaminants.Si`                     |
| 10    | `particleCount14um`   | 28    | `additives.B`                         |
| 11    | `pqIndex`             | 29    | `additives.Ba`                        |
| 12    | `visc40C`             | 30    | `additives.Ca`                        |
| 13    | `tan`                 | 31    | `additives.Mg`                        |
| 14    | `oxidation`           | 32    | `additives.P`                         |
| 15    | `water`               | 33    | `additives.Zn`                        |
| 16    | `wear.Ag`             | 34    | `alertType`                           |
| 17    | `wear.Al`             | 35    | `recommendations` ("Sample Analysis") |

Column 34 is a real field, "Alert Type" — a short classification (e.g.
`"Caution – Elevated Fe & Si"`) distinct from column 35's longer free-text
analysis. Both the original app and an earlier pass of this rebuild
silently dropped it (via `,` in a destructuring pattern) — fixed, and now
shown on the Oil Analysis Report page.

**Column 36 (37th column, 1-indexed)** is `Last Modified`, written
automatically by the Apps Script. **The real sheet is only 37 columns wide
(A–AK)** — an earlier draft of this doc described a legacy `reportedDate`
value at column 87 based on the original app's minified code; that column
doesn't exist in the live sheet, so that code path was always reading
`undefined`. Removed here rather than carried forward as dead code.

Matched on columns **[0, 2]** — Equipment Code + Sample ID. **Not
guaranteed unique**: 42 real (equipmentCode, sampleId) pairs repeat across
different sample dates in the live data (e.g. `111.HC100 (IR)` has two
distinct samples, dated 3-Jun-2026 and 12-Jul-2026, sharing the same
Sample ID `26165146253`) — the lab appears to reuse sample ID numbering
across sampling rounds for the same equipment. This app currently only
**appends** new samples (no edit/update), so this doesn't cause a bug
today — but it means `_matchCols: [0, 2]` is not safe to use for updating
an existing sample. If sample editing is ever added, the match key needs
to include `sampledDate` as well (or the sheet's own row position) to
reliably target one specific sample row.

## Equipment Registry

Row 1 = title, row 2 = header, row 3+ = data (152 rows in the live sheet).

| Column A       | B           | C        | D           | E               | F        | G            | H     | I    |
| -------------- | ----------- | -------- | ----------- | --------------- | -------- | ------------ | ----- | ---- |
| Equipment Code | Description | Asset ID | Asset Class | Lubricant Grade | Interval | Manufacturer | Model | Area |

This is the **authoritative equipment list** — every registered piece of
equipment, independent of whether it has a sample yet. `App.jsx` now
fetches this (`api.getEquipmentRegistry`) and uses it to build
`equipmentOptions` (the dropdowns on Add Sample / Add Action), falling back
to equipment codes derived from samples + actions if this sheet tab is
missing. This matters in practice: 12 equipment codes referenced in Action
Tracker have zero rows in Data_Entry, so deriving the dropdown from samples
alone (as an earlier version of this app did) would have made those pieces
of equipment impossible to select when adding a new action for them.

## Why this matters for the sync-verification fix

`api.js`'s write functions compare a freshly-read row against the row they
just tried to write, cell-by-cell, to confirm a save actually landed (see
[ARCHITECTURE.md](./ARCHITECTURE.md#the-sync-bug-and-its-fix)). That
comparison is only meaningful if the column order here exactly matches
what's in the sheet — a mismatch would either produce false "save failed"
errors or, worse, false "success" on a save that actually wrote to the
wrong columns. That's now been checked against the real sheet, not just
the original app's code.
