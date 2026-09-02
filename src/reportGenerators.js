import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import { formatDate } from "./parsers";
import logoUrl from "./assets/arabian-cement-logo.png";

// Two printable-to-PDF reports, generated entirely client-side from the
// same live data the rest of the app already has in memory — no server
// round trip, no template file to keep in sync. Each can be scoped to a
// single contractor or run across all of them.

const BRAND = {
  navy: [11, 37, 69],
  teal: [0, 180, 216],
  danger: [200, 40, 40],
  warning: [200, 130, 20],
  accent: [123, 60, 176],
  success: [30, 150, 80],
  muted: [110, 125, 145],
  border: [220, 226, 234],
  headBg: [230, 236, 242],
};

const ACTION_STATUS_COLOR = {
  Open: BRAND.danger,
  "In Progress": BRAND.warning,
  "Waiting Stoppage": BRAND.accent,
  Closed: BRAND.success,
};

const LOGO_ASPECT = 160 / 84;

function toFileDate() {
  return new Date().toISOString().slice(0, 10);
}

function daysSince(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d)) return null;
  return Math.round((Date.now() - d.getTime()) / 86400000);
}

// Vite serves the logo as a URL; jsPDF needs actual pixel data, so it's
// drawn to a canvas once and cached as a data URL for every report after
// the first.
let logoDataUrlPromise = null;
function loadLogoDataUrl() {
  if (!logoDataUrlPromise) {
    logoDataUrlPromise = new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          canvas.getContext("2d").drawImage(img, 0, 0);
          resolve(canvas.toDataURL("image/png"));
        } catch {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = logoUrl;
    });
  }
  return logoDataUrlPromise;
}

async function newDoc(title, scopeLine) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setFillColor(...BRAND.navy);
  doc.rect(0, 0, pageWidth, 72, "F");

  const logoData = await loadLogoDataUrl();
  const logoH = 30;
  const logoW = logoH * LOGO_ASPECT;
  const textLeft = logoData ? Math.round(36 + logoW + 14) : 36;
  if (logoData) {
    doc.addImage(logoData, "PNG", 36, (72 - logoH) / 2, logoW, logoH);
  }

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Arabian Cement Company", textLeft, 30);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  doc.text(title, textLeft, 46);
  doc.setFontSize(9);
  doc.setTextColor(120, 220, 235);
  doc.text(scopeLine, textLeft, 60);

  doc.setFontSize(8.5);
  doc.setTextColor(190, 202, 215);
  const generated = `Generated ${new Date().toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}`;
  doc.text(generated, pageWidth - 36, 30, { align: "right" });
  doc.text("Oil Analysis Management", pageWidth - 36, 46, { align: "right" });

  doc.setTextColor(20, 26, 33);
  return doc;
}

function addFooter(doc) {
  const pageCount = doc.internal.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(...BRAND.border);
    doc.setLineWidth(0.75);
    doc.line(36, pageHeight - 34, pageWidth - 36, pageHeight - 34);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...BRAND.muted);
    doc.text("Arabian Cement — Oil Analysis Management", 36, pageHeight - 20);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - 36, pageHeight - 20, { align: "right" });
  }
}

function sectionTitle(doc, text, y) {
  const upper = text.toUpperCase();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...BRAND.navy);
  doc.text(upper, 36, y);
  doc.setDrawColor(...BRAND.teal);
  doc.setLineWidth(1.6);
  doc.line(36, y + 4, 36 + doc.getTextWidth(upper), y + 4);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(20, 26, 33);
  return y + 20;
}

// Wrapped narrative paragraph giving the report a lead-in sentence instead
// of dropping straight into tables.
function summaryParagraph(doc, text, y) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(60, 72, 88);
  const pageWidth = doc.internal.pageSize.getWidth();
  const lines = doc.splitTextToSize(text, pageWidth - 72);
  doc.text(lines, 36, y);
  doc.setTextColor(20, 26, 33);
  return y + lines.length * 12 + 12;
}

function statStrip(doc, stats, y) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const usable = pageWidth - 72;
  const boxW = usable / stats.length;
  stats.forEach((st, i) => {
    const x = 36 + i * boxW;
    doc.setDrawColor(...BRAND.border);
    doc.setLineWidth(0.6);
    doc.roundedRect(x, y, boxW - 8, 40, 3, 3);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(...(st.color || BRAND.navy));
    doc.text(String(st.value), x + 10, y + 22);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...BRAND.muted);
    doc.text(st.label, x + 10, y + 33);
  });
  doc.setTextColor(20, 26, 33);
  return y + 54;
}

function needsNewPage(doc, y, minSpace = 110) {
  if (y <= doc.internal.pageSize.getHeight() - minSpace) return y;
  doc.addPage();
  return 40;
}

// Prepared/Reviewed/Approved sign-off lines — standard on a printed
// maintenance report handed off between the plant and a contractor.
function addSignOff(doc, y) {
  y = needsNewPage(doc, y, 100);
  y += 18;
  const pageWidth = doc.internal.pageSize.getWidth();
  const usable = pageWidth - 72;
  const colW = usable / 3;
  ["Prepared By", "Reviewed By", "Approved By"].forEach((label, i) => {
    const x = 36 + i * colW;
    doc.setDrawColor(...BRAND.muted);
    doc.setLineWidth(0.6);
    doc.line(x, y + 26, x + colW - 20, y + 26);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...BRAND.muted);
    doc.text(label, x, y + 38);
    doc.text("Date: ___________", x, y + 50);
  });
  doc.setTextColor(20, 26, 33);
  return y + 60;
}

function contractorsFromRegistry(equipmentRegistry) {
  return Array.from(new Set((equipmentRegistry || []).map((r) => r.contractor).filter(Boolean)));
}

// ── Report 1: Contractor Action Status ──────────────────────────────────
// Focused on the three unresolved statuses — Open, In Progress, Waiting
// Stoppage — since Closed actions are history, not something a contractor
// needs to act on. Scoped to one contractor, or run across all of them
// (one summary table, then one detail table per contractor).
const FOCUS_STATUSES = ["Open", "In Progress", "Waiting Stoppage"];

export async function generateContractorActionReport({ actions, equipmentRegistry, contractor = "All" }) {
  const registryByCode = {};
  (equipmentRegistry || []).forEach((r) => (registryByCode[r.code] = r));
  const contractorOf = (a) => a.contractor || registryByCode[a.equipmentCode]?.contractor || "Unassigned";

  let unresolved = (actions || []).filter((a) => FOCUS_STATUSES.includes(a.status));
  if (contractor !== "All") unresolved = unresolved.filter((a) => contractorOf(a) === contractor);

  const byContractor = {};
  unresolved.forEach((a) => (byContractor[contractorOf(a)] ||= []).push(a));
  const contractors = Object.keys(byContractor).sort((a, b) => byContractor[b].length - byContractor[a].length);

  const scopeLine = contractor === "All" ? "All Contractors" : `Contractor: ${contractor}`;
  const doc = await newDoc("Contractor Action Status Report", scopeLine);
  let y = 98;

  const oldestOverall = unresolved.reduce((m, a) => Math.max(m, daysSince(a.revisionDate) ?? 0), 0);
  const narrative =
    contractor === "All"
      ? `This report covers every Open, In Progress, and Waiting Stoppage action across all contractors as of ${formatDate(new Date().toISOString())}. Closed actions are excluded — they no longer need contractor attention.`
      : `This report covers every Open, In Progress, and Waiting Stoppage action assigned to ${contractor} as of ${formatDate(new Date().toISOString())}. Closed actions are excluded — they no longer need contractor attention.`;
  y = summaryParagraph(doc, narrative, y);

  y = statStrip(
    doc,
    [
      { value: unresolved.length, label: "TOTAL UNRESOLVED", color: BRAND.navy },
      { value: unresolved.filter((a) => a.status === "Open").length, label: "OPEN", color: BRAND.danger },
      { value: unresolved.filter((a) => a.status === "In Progress").length, label: "IN PROGRESS", color: BRAND.warning },
      { value: unresolved.filter((a) => a.status === "Waiting Stoppage").length, label: "WAITING STOPPAGE", color: BRAND.accent },
      { value: `${oldestOverall}d`, label: "OLDEST OPEN", color: BRAND.navy },
    ],
    y
  );
  y += 12;

  if (contractor === "All") {
    y = sectionTitle(doc, "Summary by Contractor", y);
    const summaryRows = contractors.map((c) => {
      const list = byContractor[c];
      const oldest = list.reduce((m, a) => Math.max(m, daysSince(a.revisionDate) ?? 0), 0);
      return [
        c,
        list.filter((a) => a.status === "Open").length,
        list.filter((a) => a.status === "In Progress").length,
        list.filter((a) => a.status === "Waiting Stoppage").length,
        list.length,
        `${oldest}d`,
      ];
    });
    autoTable(doc, {
      startY: y,
      head: [["Contractor", "Open", "In Progress", "Waiting Stoppage", "Total Unresolved", "Oldest Open"]],
      body: summaryRows.length ? summaryRows : [["No unresolved actions right now", "", "", "", "", ""]],
      theme: "grid",
      headStyles: { fillColor: BRAND.navy, textColor: 255, fontSize: 9 },
      styles: { fontSize: 9, cellPadding: 5, lineColor: BRAND.border, lineWidth: 0.5 },
      margin: { left: 36, right: 36 },
    });
    y = doc.lastAutoTable.finalY + 24;
  }

  const detailHead = ["Ac. No", "Equipment", "Description", "Oil Type", "Status", "Days Open", "Contractor Action", "Agreed Action"];
  contractors.forEach((c) => {
    y = needsNewPage(doc, y, 130);
    y = sectionTitle(doc, contractor === "All" ? `${c} — ${byContractor[c].length} unresolved` : "Unresolved Actions", y);
    const rows = [...byContractor[c]]
      .sort((a, b) => (daysSince(b.revisionDate) ?? 0) - (daysSince(a.revisionDate) ?? 0))
      .map((a) => [
        a.acNo || "—",
        a.equipmentCode || "—",
        a.description || "—",
        a.oilType || "—",
        a.status,
        daysSince(a.revisionDate) == null ? "—" : `${daysSince(a.revisionDate)}d`,
        a.contractorAction || "—",
        a.agreedAction || "—",
      ]);
    autoTable(doc, {
      startY: y,
      head: [detailHead],
      body: rows,
      theme: "striped",
      headStyles: { fillColor: BRAND.headBg, textColor: BRAND.navy, fontSize: 8 },
      styles: { fontSize: 8, cellPadding: 4, lineColor: BRAND.border, lineWidth: 0.4 },
      columnStyles: { 2: { cellWidth: 90 }, 6: { cellWidth: 80 }, 7: { cellWidth: 100 } },
      margin: { left: 36, right: 36 },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 4) {
          data.cell.styles.textColor = ACTION_STATUS_COLOR[data.cell.raw] || BRAND.muted;
          data.cell.styles.fontStyle = "bold";
        }
      },
    });
    y = doc.lastAutoTable.finalY + 24;
  });

  if (contractors.length === 0) {
    doc.setFontSize(10);
    doc.setTextColor(...BRAND.muted);
    doc.text("Nothing to report — no Open, In Progress, or Waiting Stoppage actions on record.", 36, y);
    doc.setTextColor(20, 26, 33);
    y += 20;
  }

  y = addSignOff(doc, y);
  addFooter(doc);
  const scopeSuffix = contractor === "All" ? "" : `-${contractor.replace(/[^a-z0-9]+/gi, "")}`;
  doc.save(`Contractor-Action-Status-Report${scopeSuffix}-${toFileDate()}.pdf`);
}

// ── Report 2: Oil Change Log — Contractor Performance ───────────────────
// Same on-time% / closure-rate% definitions as the Dashboard's Contractor
// Performance card, plus a dedicated overdue-equipment table sorted most
// overdue first. Scoped to one contractor, or run across all of them.
export async function generateOilChangeContractorReport({ oilChanges, equipmentRegistry, actions, contractor = "All" }) {
  const registryByCode = {};
  (equipmentRegistry || []).forEach((r) => (registryByCode[r.code] = r));
  const allContractors = contractorsFromRegistry(equipmentRegistry);
  const contractorList = contractor === "All" ? allContractors : allContractors.filter((c) => c === contractor);

  const stats = contractorList.map((c) => {
    const codes = new Set((equipmentRegistry || []).filter((r) => r.contractor === c).map((r) => r.code));
    const points = (oilChanges || []).filter((o) => codes.has(o.equipmentCode));
    const overdue = points.filter((o) => o.status === "Overdue");
    const onTimePct = points.length ? Math.round(((points.length - overdue.length) / points.length) * 100) : null;
    const contractorActions = (actions || []).filter((a) => a.contractor === c);
    const closureRatePct = contractorActions.length
      ? Math.round((contractorActions.filter((a) => a.status === "Closed").length / contractorActions.length) * 100)
      : null;
    return { name: c, total: points.length, overdue: overdue.length, onTimePct, closureRatePct };
  });
  stats.sort((a, b) => b.overdue - a.overdue);

  const scopedCodes =
    contractor === "All" ? null : new Set((equipmentRegistry || []).filter((r) => r.contractor === contractor).map((r) => r.code));
  const overdueList = [...(oilChanges || [])]
    .filter((o) => o.status === "Overdue")
    .filter((o) => !scopedCodes || scopedCodes.has(o.equipmentCode))
    .sort((a, b) => new Date(a.nextDueDate || 0) - new Date(b.nextDueDate || 0));

  const scopeLine = contractor === "All" ? "All Contractors" : `Contractor: ${contractor}`;
  const doc = await newDoc("Oil Change Log — Contractor Performance Report", scopeLine);
  let y = 98;

  const narrative =
    contractor === "All"
      ? `This report summarizes on-time oil change performance and action closure rate for every contractor, then lists every currently overdue lubrication point ordered from most to least overdue.`
      : `This report summarizes ${contractor}'s on-time oil change performance and action closure rate, then lists every currently overdue lubrication point assigned to ${contractor}, ordered from most to least overdue.`;
  y = summaryParagraph(doc, narrative, y);

  const overallOnTime = stats.length
    ? Math.round(
        (stats.reduce((sum, s) => sum + (s.total - s.overdue), 0) /
          Math.max(
            1,
            stats.reduce((sum, s) => sum + s.total, 0)
          )) *
          100
      )
    : null;
  y = statStrip(
    doc,
    [
      { value: stats.reduce((sum, s) => sum + s.total, 0), label: "TOTAL POINTS", color: BRAND.navy },
      { value: overdueList.length, label: "OVERDUE NOW", color: BRAND.danger },
      { value: overallOnTime == null ? "—" : `${overallOnTime}%`, label: "ON-TIME %", color: BRAND.success },
    ],
    y
  );
  y += 12;

  y = sectionTitle(doc, "Contractor Performance", y);
  autoTable(doc, {
    startY: y,
    head: [["Contractor", "Total Points", "Overdue", "On-Time %", "Action Closure %"]],
    body: stats.length
      ? stats.map((s) => [
          s.name,
          s.total,
          s.overdue,
          s.onTimePct == null ? "—" : `${s.onTimePct}%`,
          s.closureRatePct == null ? "—" : `${s.closureRatePct}%`,
        ])
      : [["No contractors on record", "", "", "", ""]],
    theme: "grid",
    headStyles: { fillColor: BRAND.navy, textColor: 255, fontSize: 9 },
    styles: { fontSize: 9, cellPadding: 5, lineColor: BRAND.border, lineWidth: 0.5 },
    margin: { left: 36, right: 36 },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 2 && Number(data.cell.raw) > 0) {
        data.cell.styles.textColor = BRAND.danger;
        data.cell.styles.fontStyle = "bold";
      }
    },
  });
  y = doc.lastAutoTable.finalY + 24;

  y = needsNewPage(doc, y, 130);
  y = sectionTitle(doc, `Overdue Equipment — ${overdueList.length} point${overdueList.length === 1 ? "" : "s"}`, y);
  const overdueRows = overdueList.map((o) => {
    const reg = registryByCode[o.equipmentCode];
    const days = daysSince(o.nextDueDate);
    return [
      o.equipmentCode,
      reg?.description || o.assetName || "—",
      reg?.area || "—",
      o.lubricationPoint || "—",
      o.oilType || reg?.lubricant || "—",
      reg?.contractor || "—",
      formatDate(o.nextDueDate) || "—",
      days == null ? "—" : `${days}d`,
    ];
  });
  autoTable(doc, {
    startY: y,
    head: [["Equipment", "Description", "Area", "Point", "Oil Type", "Contractor", "Next Due", "Days Overdue"]],
    body: overdueRows.length ? overdueRows : [["No overdue oil changes right now", "", "", "", "", "", "", ""]],
    theme: "striped",
    headStyles: { fillColor: BRAND.headBg, textColor: BRAND.navy, fontSize: 8 },
    styles: { fontSize: 8, cellPadding: 4, lineColor: BRAND.border, lineWidth: 0.4 },
    margin: { left: 36, right: 36 },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 7) {
        data.cell.styles.textColor = BRAND.danger;
        data.cell.styles.fontStyle = "bold";
      }
    },
  });
  y = doc.lastAutoTable.finalY + 24;

  y = addSignOff(doc, y);
  addFooter(doc);
  const scopeSuffix = contractor === "All" ? "" : `-${contractor.replace(/[^a-z0-9]+/gi, "")}`;
  doc.save(`Oil-Change-Contractor-Performance-Report${scopeSuffix}-${toFileDate()}.pdf`);
}
