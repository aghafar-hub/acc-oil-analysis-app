# Google Sheet schema

The Apps Script reads/writes these tabs in the connected Google Sheet.
Columns are listed 0-indexed (as used in `matchCols`/array code) with the
1-indexed spreadsheet column letter alongside for reference.

This layout is load-bearing: it must match both the Apps Script's
`dataStartRowFor()` / `readSheet()` functions and this app's `parsers.js`.
If a column is ever inserted/removed/reordered in the sheet, update
`parsers.js` (and the Apps Script) to match — don't just add a field and
assume it lines up.

## Action Tracker

Data starts at **row 6** (rows 1–5 are title/instructions/header).

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

A row is matched for update/delete on columns **[0, 1]** — `acNo` +
`equipmentCode` together, i.e. Ac. No. is only unique per equipment, not
sheet-wide.

## Oil Change Log

Data starts at **row 4** (rows 1–3 are title/subtitle/header).

| Index     | Column            | Field                                                                                                 |
| --------- | ----------------- | ----------------------------------------------------------------------------------------------------- |
| 0 (A)     | Equipment Code    | `equipmentCode`                                                                                       |
| 1 (B)     | _(unused)_        | —                                                                                                     |
| 2 (C)     | Lubrication Point | `lubricationPoint`                                                                                    |
| 3 (D)     | Frequency         | `frequency`                                                                                           |
| 4 (E)     | Oil Type          | `oilType`                                                                                             |
| 5 (F)     | Brand             | `brand`                                                                                               |
| 6 (G)     | Quantity          | `quantity`                                                                                            |
| 7–8 (H–I) | _(unused)_        | —                                                                                                     |
| 9 (J)     | Last Change       | `changeDate`                                                                                          |
| 10 (K)    | Next Oil Change   | `nextDueDate`                                                                                         |
| 11 (L)    | Status            | `status` — **a sheet formula**; the Apps Script's `updateRow` never writes this column, only reads it |
| 12 (M)    | Last Modified     | _(written automatically)_                                                                             |

Matched on columns **[0, 2, 4]** — Equipment Code + Lubrication Point + Oil
Type together (a piece of equipment can have more than one lubrication
point / oil type combination).

## Data_Entry (samples)

Data starts at **row 6** (rows 1–5 are title/instructions/header).

| Index | Field                 | Index | Field                                |
| ----- | --------------------- | ----- | ------------------------------------ |
| 0     | `unitId`              | 18    | `wear.Cr`                            |
| 1     | `description`         | 19    | `wear.Cu`                            |
| 2     | `sampleId`            | 20    | `wear.Fe`                            |
| 3     | `sampledDate`         | 21    | `wear.Mo`                            |
| 4     | `reportStatus`        | 22    | `wear.Ni`                            |
| 5     | `contaminationRating` | 23    | `wear.Pb`                            |
| 6     | `equipmentRating`     | 24    | `wear.Sn`                            |
| 7     | `lubricantRating`     | 25    | `contaminants.K`                     |
| 8     | `particleCount4um`    | 26    | `contaminants.Na`                    |
| 9     | `particleCount6um`    | 27    | `contaminants.Si`                    |
| 10    | `particleCount14um`   | 28    | `additives.B`                        |
| 11    | `pqIndex`             | 29    | `additives.Ba`                       |
| 12    | `visc40C`             | 30    | `additives.Ca`                       |
| 13    | `tan`                 | 31    | `additives.Mg`                       |
| 14    | `oxidation`           | 32    | `additives.P`                        |
| 15    | `water`               | 33    | `additives.Zn`                       |
| 16    | `wear.Ag`             | 34    | _(unused)_                           |
| 17    | `wear.Al`             | 35    | `recommendations` (semicolon-joined) |

Matched on columns **[0, 2]** — Equipment Code + Sample ID.

**Column 36 (37th column, 1-indexed)** is `Last Modified`, written
automatically by the Apps Script.

**Column 86 (index)** holds a legacy `reportedDate` value that predates
both this app and its predecessor — far outside the 36 columns above, with
an unknown number of manually-maintained columns in between. This app
_reads_ it (`row[86]`) for display but never writes it, matching the
original app's behavior. If your sheet doesn't have data that far out,
`reportedDate` will just come back blank.

## Why this matters for the sync-verification fix

`api.js`'s write functions compare a freshly-read row against the row they
just tried to write, cell-by-cell, to confirm a save actually landed (see
[ARCHITECTURE.md](./ARCHITECTURE.md#the-sync-bug-and-its-fix)). That
comparison is only meaningful if the column order here exactly matches
what's in the sheet — a mismatch would either produce false "save failed"
errors or, worse, false "success" on a save that actually wrote to the
wrong columns.
