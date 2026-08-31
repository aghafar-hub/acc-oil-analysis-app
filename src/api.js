// Client for the Google Apps Script webhook that backs this app.
//
// THE BUG THIS FIXES: the original app wrote every change with
// `fetch(url, { mode: "no-cors" })`. That's required because Apps Script Web
// Apps don't send CORS headers on POST responses — but it also means the
// browser is *not allowed to read the response*. The write could fail on the
// server (row not found, a thrown error) and the app would have no way to
// know; it just assumed success. The edit would look saved, then vanish on
// the next sync.
//
// GET requests are different: Apps Script's Web App response for a GET is
// served from a `content.googleusercontent.com` redirect that *does* carry
// permissive CORS headers, so plain `fetch()` reads work fine and are not
// blind.
//
// The fix: every write is followed by a verifying read. If the freshly
// re-fetched row doesn't match what we tried to save, we surface a real
// error instead of pretending it worked.

import { rowToAction, actionToRow, ACTION_HEADERS, rowToOilChange, oilChangeToRow, rowToSample, sampleToRow } from "./parsers";

export class SaveVerificationError extends Error {
  constructor(message) {
    super(message);
    this.name = "SaveVerificationError";
  }
}

async function getJSON(webhookUrl, params) {
  const url = new URL(webhookUrl);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Server returned ${res.status}`);
  const json = await res.json();
  if (json && json.error) throw new Error(json.error);
  return json;
}

async function postBlind(webhookUrl, body) {
  try {
    await fetch(webhookUrl, { method: "POST", mode: "no-cors", body: JSON.stringify(body) });
  } catch (err) {
    throw new Error(`Network error while saving: ${err.message}`);
  }
}

function rowsEqual(a, b) {
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    if (String(a[i] ?? "").trim() !== String(b[i] ?? "").trim()) return false;
  }
  return true;
}

// ── Reads ─────────────────────────────────────────────────────────────────

export async function readAll(webhookUrl) {
  const json = await getJSON(webhookUrl, { action: "readAll" });
  return {
    samples: (json.samples || []).filter((r) => Array.isArray(r) && r[0]).map(rowToSample),
    actions: (json.actions || []).filter((r) => Array.isArray(r) && r[0]).map(rowToAction),
    oilChanges: (json.oilChanges || []).filter((r) => Array.isArray(r) && r[0]).map(rowToOilChange),
  };
}

export async function getDashboard(webhookUrl) {
  return getJSON(webhookUrl, { action: "getDashboard" });
}

// The Equipment Registry sheet is the authoritative equipment list — it has
// every registered piece of equipment (confirmed ~152 rows against the live
// sheet), independent of whether that equipment has any samples yet. Used
// to build equipment dropdowns instead of deriving them from `samples`,
// which only covers equipment that happens to already have a sample row
// (confirmed ~144 of those, missing several equipment codes that do appear
// in Action Tracker).
export async function getEquipmentRegistry(webhookUrl) {
  const json = await getJSON(webhookUrl, { action: "readEquipmentRegistry" });
  return json.equipment || [];
}

export async function getEquipmentRows(webhookUrl, equipmentCode) {
  return getJSON(webhookUrl, { action: "getEquipment", id: equipmentCode });
}

// ── Writes (each verified by a follow-up read) ──────────────────────────

export async function saveAction(webhookUrl, action, { isNew }) {
  const row = actionToRow(action);
  if (isNew) {
    await postBlind(webhookUrl, { action: "append", sheet: "Action Tracker", row, headers: ACTION_HEADERS });
  } else {
    const matchCols = action._matchCols || [0, 1];
    const matchValues = action._matchValues || [action.acNo || "", action.equipmentCode || action.unitId || ""];
    await postBlind(webhookUrl, { action: "updateRow", sheet: "Action Tracker", matchCols, matchValues, row });
  }

  const verify = await getEquipmentRows(webhookUrl, action.equipmentCode || action.unitId || "");
  const savedRow = (verify.actions || []).find((r) => String(r[0]).trim() === String(row[0]).trim());
  if (!savedRow || !rowsEqual(savedRow, row)) {
    throw new SaveVerificationError(
      `The action wasn't confirmed saved to the sheet. It may not have written — please check the Action Tracker tab and try again.`
    );
  }
  return rowToAction(savedRow);
}

export async function deleteAction(webhookUrl, action) {
  const matchCols = action._matchCols || [0, 1];
  const matchValues = action._matchValues || [action.acNo || "", action.equipmentCode || action.unitId || ""];
  await postBlind(webhookUrl, { action: "deleteRow", sheet: "Action Tracker", matchCols, matchValues });

  const verify = await getEquipmentRows(webhookUrl, action.equipmentCode || action.unitId || "");
  const stillThere = (verify.actions || []).some((r) => String(r[0]).trim() === String(matchValues[0]).trim());
  if (stillThere) {
    throw new SaveVerificationError(`The action wasn't confirmed deleted from the sheet — please try again.`);
  }
}

export async function saveOilChange(webhookUrl, oilChange) {
  const row = oilChangeToRow(oilChange);
  const matchCols = oilChange._matchCols || [0, 2, 4];
  const matchValues = oilChange._matchValues || [oilChange.equipmentCode || "", oilChange.lubricationPoint || "", oilChange.oilType || ""];
  await postBlind(webhookUrl, { action: "updateRow", sheet: "Oil Change Log", matchCols, matchValues, row });

  const verify = await getEquipmentRows(webhookUrl, oilChange.equipmentCode || "");
  const savedRow = (verify.oilChanges || []).find(
    (r) => String(r[2]).trim() === String(matchValues[1]).trim() && String(r[4]).trim() === String(matchValues[2]).trim()
  );
  // Only columns 10 (Last Change) and 11 (Next Due) are ever written by the
  // backend for this sheet — see updateRow's special-case in the Apps Script.
  if (!savedRow || String(savedRow[9] ?? "").trim() !== String(row[9] ?? "").trim()) {
    throw new SaveVerificationError(`The oil change wasn't confirmed saved to the sheet — please try again.`);
  }
  return rowToOilChange(savedRow);
}

export async function saveSample(webhookUrl, sample, headers) {
  const row = sampleToRow(sample);
  await postBlind(webhookUrl, { action: "append", sheet: "Data_Entry", row, headers });

  const verify = await getEquipmentRows(webhookUrl, sample.unitId || "");
  const savedRow = (verify.samples || []).find((r) => String(r[2]).trim() === String(sample.sampleId).trim());
  if (!savedRow) {
    throw new SaveVerificationError(`The sample wasn't confirmed saved to the sheet — please try again.`);
  }
  return rowToSample(savedRow);
}
