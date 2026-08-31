// Row <-> object converters for each sheet tab. These mirror the exact column
// layout the Apps Script backend (doPost/doGet) reads and writes, so this app
// stays compatible with the existing Google Sheet without changing its schema.

export function formatDate(v) {
  if (!v) return "";
  const d = v instanceof Date ? v : new Date(v);
  if (isNaN(d.getTime())) return typeof v === "string" ? v : "";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

// ── Action Tracker ───────────────────────────────────────────────────────
// Columns: 0 Ac.No, 1 Equipment Code, 2 Description, 3 Oil Type,
// 4 Revision Date, 5 Sample Date, 6 Sample Result, 7 Sample Analysis,
// 8 Last Change, 9 Status, 10 Contractor Action, 11 Contractor,
// 12 Completed Date, 13 Prev Month Agreed Action, 14 Acc Action, 15 Agreed Action

export const ACTION_HEADERS = [
  "Ac. No.",
  "Equipment Code",
  "Description",
  "Oil Type",
  "Revision Date",
  "Sample Date",
  "Sample Result",
  "Sample Analysis",
  "Last Change",
  "Status",
  "Contractor Action",
  "Contractor",
  "Completed Date",
  "Prev Month Agreed Action",
  "Acc Action",
  "Agreed Action",
];

export function rowToAction(row) {
  const [
    acNo,
    equipmentCode,
    description,
    oilType,
    revisionDate,
    sampleDate,
    sampleResult,
    sampleAnalysis,
    lastChange,
    status,
    contractorAction,
    contractor,
    completedDate,
    prevMonthAgreedAction,
    accAction,
    agreedAction,
  ] = row;
  return {
    acNo,
    equipmentCode,
    unitId: equipmentCode,
    description,
    oilType,
    revisionDate: formatDate(revisionDate),
    sampleDate: formatDate(sampleDate),
    sampleResult,
    sampleAnalysis,
    lastChange: formatDate(lastChange),
    status,
    contractorAction,
    contractor,
    completedDate: formatDate(completedDate),
    prevMonthAgreedAction,
    accAction,
    agreedAction,
    _id: `${equipmentCode}_${acNo}_${revisionDate}`,
    _matchCols: [0, 1],
    _matchValues: [acNo, equipmentCode],
  };
}

export function actionToRow(a) {
  return [
    a.acNo || "",
    a.equipmentCode || a.unitId || "",
    a.description || "",
    a.oilType || "",
    a.revisionDate || "",
    a.sampleDate || "",
    a.sampleResult || "",
    a.sampleAnalysis || "",
    a.lastChange || "",
    a.status || "",
    a.contractorAction || "",
    a.contractor || "",
    a.completedDate || "",
    a.prevMonthAgreedAction || "",
    a.accAction || "",
    a.agreedAction || "",
  ];
}

export function nextAcNo(actions) {
  let max = 0;
  for (const a of actions || []) {
    const m = String(a.acNo || "").match(/(\d+)/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `0-${max + 1}`;
}

// ── Oil Change Log ───────────────────────────────────────────────────────
// Columns: 0 Equipment Code, 1 Asset Name, 2 Lubrication Point, 3 Frequency,
// 4 Oil Type, 5 Brand, 6 Quantity, 7-8 (unused), 9 Last Change, 10 Next Due,
// 11 Status (sheet formula — never overwritten by updateRow)

export function rowToOilChange(row) {
  const equipmentCode = row[0];
  const lubricationPoint = row[2];
  const oilType = row[4];
  return {
    equipmentCode,
    assetName: row[1] || equipmentCode,
    lubricationPoint,
    frequency: row[3],
    oilType,
    brand: row[5],
    quantity: row[6],
    changeDate: formatDate(row[9]),
    nextDueDate: formatDate(row[10]),
    status: (row[11] || "").toString().trim() || "Current",
    _id: `${equipmentCode}_${lubricationPoint}_${oilType}`,
    _matchCols: [0, 2, 4],
    _matchValues: [equipmentCode, lubricationPoint, oilType],
    _rawRow: row,
  };
}

export function oilChangeToRow(o) {
  return [
    o.equipmentCode || "",
    o.assetName || "",
    o.lubricationPoint || "",
    o.frequency || "Oil Analysis",
    o.oilType || "",
    o.brand || "",
    o.quantity || "",
    "",
    "",
    o.changeDate || "",
    o.nextDueDate || "",
    o.status || "Current",
  ];
}

// ── Data_Entry (samples) ─────────────────────────────────────────────────
// 37 columns: the 36 data columns below, plus Last Modified at index 36.
// Column 34 ("Alert Type") is real sheet data — a short classification like
// "Caution – Elevated Fe & Si" — distinct from column 35 ("Sample Analysis",
// the longer free-text recommendation). Both the original app and an early
// version of this rebuild silently dropped Alert Type; confirmed against the
// live sheet (openpyxl inspection) and fixed here.

export function rowToSample(row) {
  const [
    unitId,
    description,
    sampleId,
    sampledDate,
    reportStatus,
    contaminationRating,
    equipmentRating,
    lubricantRating,
    particleCount4um,
    particleCount6um,
    particleCount14um,
    pqIndex,
    visc40C,
    tan,
    oxidation,
    water,
    Ag,
    Al,
    Cr,
    Cu,
    Fe,
    Mo,
    Ni,
    Pb,
    Sn,
    K,
    Na,
    Si,
    B,
    Ba,
    Ca,
    Mg,
    P,
    Zn,
    alertType,
    recommendationsRaw,
  ] = row;
  const num = (v) => (v === "" || v === null || v === undefined ? "" : parseFloat(v));
  return {
    unitId,
    description,
    sampleId,
    sampledDate: formatDate(sampledDate),
    reportStatus,
    alertType,
    contaminationRating,
    equipmentRating,
    lubricantRating,
    particleCount4um: num(particleCount4um),
    particleCount6um: num(particleCount6um),
    particleCount14um: num(particleCount14um),
    pqIndex: num(pqIndex),
    visc40C: num(visc40C),
    tan: num(tan),
    oxidation: num(oxidation),
    water: num(water),
    wear: { Ag, Al, Cr, Cu, Fe, Mo, Ni, Pb, Sn },
    contaminants: { K, Na, Si },
    additives: { B, Ba, Ca, Mg, P, Zn },
    recommendations: recommendationsRaw ? [recommendationsRaw] : [],
    _id: `${unitId}_${sampleId}_${sampledDate}`,
    _matchCols: [0, 2],
    _matchValues: [unitId, sampleId],
  };
}

export function sampleToRow(s) {
  const wear = s.wear || {};
  const contaminants = s.contaminants || {};
  const additives = s.additives || {};
  return [
    s.unitId || "",
    s.description || "",
    s.sampleId || "",
    s.sampledDate || "",
    s.reportStatus || "",
    s.contaminationRating || "",
    s.equipmentRating || "",
    s.lubricantRating || "",
    s.particleCount4um || "",
    s.particleCount6um || "",
    s.particleCount14um || "",
    s.pqIndex || "",
    s.visc40C || "",
    s.tan || "",
    s.oxidation || "",
    s.water || "",
    wear.Ag || "",
    wear.Al || "",
    wear.Cr || "",
    wear.Cu || "",
    wear.Fe || "",
    wear.Mo || "",
    wear.Ni || "",
    wear.Pb || "",
    wear.Sn || "",
    contaminants.K || "",
    contaminants.Na || "",
    contaminants.Si || "",
    additives.B || "",
    additives.Ba || "",
    additives.Ca || "",
    additives.Mg || "",
    additives.P || "",
    additives.Zn || "",
    s.alertType || "",
    (s.recommendations || []).join("; "),
  ];
}
