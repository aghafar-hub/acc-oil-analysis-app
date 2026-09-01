import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import { formatDate } from "./parsers";

// Two printable-to-PDF reports, generated entirely client-side from the
// same live data the rest of the app already has in memory — no server
// round trip, no template file to keep in sync.

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

function toFileDate() {
  return new Date().toISOString().slice(0, 10);
}

function daysSince(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d)) return null;
  return Math.round((Date.now() - d.getTime()) / 86400000);
}

function newDoc(title, subtitle) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setFillColor(...BRAND.navy);
  doc.rect(0, 0, pageWidth, 64, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text("Arabian Cement Company", 36, 27);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(title, 36, 45);
  doc.setFontSize(8.5);
  doc.setTextColor(190, 202, 215);
  const generated = `Generated ${new Date().toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}`;
  doc.text(generated, pageWidth - 36, 27, { align: "right" });
  if (subtitle) doc.text(subtitle, pageWidth - 36, 45, { align: "right" });
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

function needsNewPage(doc, y, minSpace = 110) {
  if (y <= doc.internal.pageSize.getHeight() - minSpace) return y;
  doc.addPage();
  return 40;
}

// ── Report 1: Contractor Action Status ──────────────────────────────────
// Focused on the three unresolved statuses — Open, In Progress, Waiting
// Stoppage — since Closed actions are history, not something a contractor
// needs to act on. One summary table, then one detail table per contractor
// sorted oldest-open-first, matching Action Tracker's own urgency sort.
const FOCUS_STATUSES = ["Open", "In Progress", "Waiting Stoppage"];

export function generateContractorActionReport({ actions, equipmentRegistry }) {
  const registryByCode = {};
  (equipmentRegistry || []).forEach((r) => (registryByCode[r.code] = r));
  const contractorOf = (a) => a.contractor || registryByCode[a.equipmentCode]?.contractor || "Unassigned";

  const unresolved = (actions || []).filter((a) => FOCUS_STATUSES.includes(a.status));
  const byContractor = {};
  unresolved.forEach((a) => (byContractor[contractorOf(a)] ||= []).push(a));
  const contractors = Object.keys(byContractor).sort((a, b) => byContractor[b].length - byContractor[a].length);

  const doc = newDoc("Contractor Action Status Report", "Open · In Progress · Waiting Stoppage");
  let y = 84;

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

  contractors.forEach((c) => {
    y = needsNewPage(doc, y, 120);
    y = sectionTitle(doc, `${c} — ${byContractor[c].length} unresolved`, y);
    const rows = [...byContractor[c]]
      .sort((a, b) => (daysSince(b.revisionDate) ?? 0) - (daysSince(a.revisionDate) ?? 0))
      .map((a) => [
        a.acNo || "—",
        a.equipmentCode || "—",
        a.description || "—",
        a.status,
        daysSince(a.revisionDate) == null ? "—" : `${daysSince(a.revisionDate)}d`,
        a.agreedAction || "—",
      ]);
    autoTable(doc, {
      startY: y,
      head: [["Ac. No", "Equipment", "Description", "Status", "Days Open", "Agreed Action"]],
      body: rows,
      theme: "striped",
      headStyles: { fillColor: BRAND.headBg, textColor: BRAND.navy, fontSize: 8.5 },
      styles: { fontSize: 8.5, cellPadding: 4, lineColor: BRAND.border, lineWidth: 0.4 },
      columnStyles: { 2: { cellWidth: 110 }, 5: { cellWidth: 140 } },
      margin: { left: 36, right: 36 },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 3) {
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
  }

  addFooter(doc);
  doc.save(`Contractor-Action-Status-Report-${toFileDate()}.pdf`);
}

// ── Report 2: Oil Change Log — Contractor Performance ───────────────────
// Same on-time% / closure-rate% definitions as the Dashboard's Contractor
// Performance card, plus a dedicated overdue-equipment table sorted most
// overdue first.
export function generateOilChangeContractorReport({ oilChanges, equipmentRegistry, actions }) {
  const registryByCode = {};
  (equipmentRegistry || []).forEach((r) => (registryByCode[r.code] = r));
  const contractorList = Array.from(new Set((equipmentRegistry || []).map((r) => r.contractor).filter(Boolean)));

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

  const overdueList = [...(oilChanges || [])]
    .filter((o) => o.status === "Overdue")
    .sort((a, b) => new Date(a.nextDueDate || 0) - new Date(b.nextDueDate || 0));

  const doc = newDoc("Oil Change Log — Contractor Performance Report", "Focus: overdue lubrication points");
  let y = 84;

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

  y = needsNewPage(doc, y, 120);
  y = sectionTitle(doc, `Overdue Equipment — ${overdueList.length} point${overdueList.length === 1 ? "" : "s"}`, y);
  const overdueRows = overdueList.map((o) => {
    const reg = registryByCode[o.equipmentCode];
    const days = daysSince(o.nextDueDate);
    return [
      o.equipmentCode,
      reg?.description || o.assetName || "—",
      o.lubricationPoint || "—",
      reg?.contractor || "—",
      formatDate(o.nextDueDate) || "—",
      days == null ? "—" : `${days}d`,
    ];
  });
  autoTable(doc, {
    startY: y,
    head: [["Equipment", "Description", "Point", "Contractor", "Next Due", "Days Overdue"]],
    body: overdueRows.length ? overdueRows : [["No overdue oil changes right now", "", "", "", "", ""]],
    theme: "striped",
    headStyles: { fillColor: BRAND.headBg, textColor: BRAND.navy, fontSize: 8.5 },
    styles: { fontSize: 8.5, cellPadding: 4, lineColor: BRAND.border, lineWidth: 0.4 },
    margin: { left: 36, right: 36 },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 5) {
        data.cell.styles.textColor = BRAND.danger;
        data.cell.styles.fontStyle = "bold";
      }
    },
  });

  addFooter(doc);
  doc.save(`Oil-Change-Contractor-Performance-Report-${toFileDate()}.pdf`);
}
