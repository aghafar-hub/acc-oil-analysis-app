import { useMemo, useState } from "react";
import { useTheme } from "../ThemeContext";
import { formatDate } from "../parsers";

// SVG donut-slice path — ported from the original app's own arc-drawing
// function, not a charting library.
function arcPath(startFrac, fracLen, radius, cx, cy) {
  if (fracLen <= 0) return "";
  const start = startFrac * 2 * Math.PI - Math.PI / 2;
  const end = (startFrac + fracLen) * 2 * Math.PI - Math.PI / 2;
  const x1 = cx + radius * Math.cos(start);
  const y1 = cy + radius * Math.sin(start);
  const x2 = cx + radius * Math.cos(end);
  const y2 = cy + radius * Math.sin(end);
  const largeArc = fracLen > 0.5 ? 1 : 0;
  return `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
}

function statusColor(T, status) {
  if (status === "Alert") return T.danger;
  if (status === "Caution" || status === "Warning") return T.warning;
  if (status === "Normal") return T.success;
  return T.textSecondary;
}

function daysBetween(dateStr, refMs) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d)) return null;
  return Math.round((refMs - d.getTime()) / 86400000);
}

const CONTRACTOR_COLORS = ["#00B4D8", "#B369FF", "#F4A261", "#2DC653"];

export default function Dashboard({ samples, actions, oilChanges, equipmentRegistry, onSelectSample }) {
  const { T, s } = useTheme();
  const [statusFilter, setStatusFilter] = useState("All");
  const [areaFilter, setAreaFilter] = useState("All");
  const now = Date.now();

  const registry = useMemo(() => equipmentRegistry || [], [equipmentRegistry]);

  const areas = useMemo(() => ["All", ...Array.from(new Set(registry.map((e) => e.area).filter(Boolean)))], [registry]);
  const areaCodes = areaFilter === "All" ? null : new Set(registry.filter((e) => e.area === areaFilter).map((e) => e.code));

  const scopedSamples = areaCodes ? samples.filter((s2) => areaCodes.has(s2.unitId)) : samples;
  const scopedActions = areaCodes ? actions.filter((a) => areaCodes.has(a.equipmentCode)) : actions;
  const scopedOilChanges = areaCodes ? oilChanges.filter((o) => areaCodes.has(o.equipmentCode)) : oilChanges;
  const scopedRegistry = areaCodes ? registry.filter((r) => areaCodes.has(r.code)) : registry;

  const latestByEquip = useMemo(() => {
    const map = {};
    scopedSamples.forEach((sm) => {
      if (!sm.unitId) return;
      if (!map[sm.unitId] || new Date(sm.sampledDate) > new Date(map[sm.unitId].sampledDate)) map[sm.unitId] = sm;
    });
    return map;
  }, [scopedSamples]);
  const latestList = Object.values(latestByEquip);

  const openActions = scopedActions.filter((a) => a.status === "Open").length;
  const overdueOilChanges = scopedOilChanges.filter((o) => o.status === "Overdue").length;

  const statusCounts = {
    Normal: latestList.filter((d) => d.reportStatus === "Normal").length,
    Caution: latestList.filter((d) => d.reportStatus === "Caution" || d.reportStatus === "Warning").length,
    Alert: latestList.filter((d) => d.reportStatus === "Alert").length,
  };
  const totalWithStatus = statusCounts.Normal + statusCounts.Caution + statusCounts.Alert || 1;
  const fracNormal = statusCounts.Normal / totalWithStatus;
  const fracCaution = statusCounts.Caution / totalWithStatus;
  const totalEquipment = areaCodes ? areaCodes.size : registry.length;

  const filteredRows =
    statusFilter === "All"
      ? latestList
      : latestList.filter((d) =>
          statusFilter === "Caution" ? d.reportStatus === "Caution" || d.reportStatus === "Warning" : d.reportStatus === statusFilter
        );
  const severityOrder = { Alert: 0, Caution: 1, Warning: 1, Normal: 2 };
  const sortedRows = [...filteredRows].sort((a, b) => (severityOrder[a.reportStatus] ?? 3) - (severityOrder[b.reportStatus] ?? 3));

  const recentSamples = useMemo(
    () => [...samples].sort((a, b) => new Date(b.sampledDate || 0) - new Date(a.sampledDate || 0)).slice(0, 8),
    [samples]
  );

  // ── counting cards: real recent-activity windows, not a fabricated
  // week-over-week delta the app has no stored history to compute ──────
  const alertSamplesNew7d = scopedSamples.filter(
    (sm) => sm.reportStatus === "Alert" && (daysBetween(sm.sampledDate, now) ?? 999) <= 7
  ).length;
  const openActionsNew7d = scopedActions.filter((a) => a.status === "Open" && (daysBetween(a.revisionDate, now) ?? 999) <= 7).length;
  const newlyOverdue7d = scopedOilChanges.filter((o) => o.status === "Overdue" && (daysBetween(o.nextDueDate, now) ?? 999) <= 7).length;
  const closedThisMonth = scopedActions.filter((a) => {
    if (a.status !== "Closed" || !a.completedDate) return false;
    const d = new Date(a.completedDate);
    const t = new Date(now);
    return !isNaN(d) && d.getMonth() === t.getMonth() && d.getFullYear() === t.getFullYear();
  }).length;

  const countingCards = [
    {
      label: "Alert Samples",
      value: statusCounts.Alert,
      sub: alertSamplesNew7d > 0 ? `${alertSamplesNew7d} new in last 7d` : "none new this week",
      color: "danger",
      icon: "ti-alert-triangle",
    },
    {
      label: "Open Actions",
      value: openActions,
      sub: openActionsNew7d > 0 ? `${openActionsNew7d} opened in last 7d` : "none opened this week",
      color: "danger",
      icon: "ti-clipboard-list",
    },
    {
      label: "Overdue Oil Changes",
      value: overdueOilChanges,
      sub: newlyOverdue7d > 0 ? `${newlyOverdue7d} newly overdue` : "none newly overdue",
      color: "warning",
      icon: "ti-clock-alert",
    },
    { label: "Closed This Month", value: closedThisMonth, sub: "actions completed", color: "success", icon: "ti-check" },
  ];

  // ── Action Tracker mini summary ───────────────────────────────────
  const actionStatusCounts = {
    Open: scopedActions.filter((a) => a.status === "Open").length,
    "In Progress": scopedActions.filter((a) => a.status === "In Progress").length,
    "Waiting Stoppage": scopedActions.filter((a) => a.status === "Waiting Stoppage").length,
    Closed: scopedActions.filter((a) => a.status === "Closed").length,
  };
  const oldestOpenAction = scopedActions
    .filter((a) => a.status !== "Closed" && a.revisionDate)
    .sort((a, b) => (daysBetween(b.revisionDate, now) ?? -1) - (daysBetween(a.revisionDate, now) ?? -1))[0];

  // ── Oil Change Forecast mini summary ──────────────────────────────
  const nextDue = scopedOilChanges
    .filter((o) => o.status !== "Overdue" && o.nextDueDate)
    .sort((a, b) => new Date(a.nextDueDate) - new Date(b.nextDueDate))[0];

  // ── Contractor performance: on-time oil changes % and action closure
  // rate %, both computed straight from live data — no assumed SLA. ────
  const contractorList = Array.from(new Set(scopedRegistry.map((r) => r.contractor).filter(Boolean)));
  const contractorStats = contractorList.map((c, i) => {
    const codesForC = new Set(scopedRegistry.filter((r) => r.contractor === c).map((r) => r.code));
    const pointsForC = scopedOilChanges.filter((o) => codesForC.has(o.equipmentCode));
    const onTimePct = pointsForC.length
      ? Math.round((pointsForC.filter((o) => o.status !== "Overdue").length / pointsForC.length) * 100)
      : null;
    const actionsForC = scopedActions.filter((a) => a.contractor === c);
    const closureRatePct = actionsForC.length
      ? Math.round((actionsForC.filter((a) => a.status === "Closed").length / actionsForC.length) * 100)
      : null;
    return {
      name: c,
      color: CONTRACTOR_COLORS[i % CONTRACTOR_COLORS.length],
      onTimePct,
      closureRatePct,
      pointCount: pointsForC.length,
      actionCount: actionsForC.length,
    };
  });

  // ── Needs Attention: cross-system insights, computed from live data ──
  const insights = useMemo(() => {
    const list = [];
    scopedRegistry.forEach((reg) => {
      const latest = latestByEquip[reg.code];
      const openForEquip = scopedActions.filter((a) => (a.equipmentCode || a.unitId) === reg.code && a.status !== "Closed");
      const overdueForEquip = scopedOilChanges.filter((o) => o.equipmentCode === reg.code && o.status === "Overdue");
      const sampleFlagged =
        latest && (latest.reportStatus === "Alert" || latest.reportStatus === "Caution" || latest.reportStatus === "Warning");
      const signals = [sampleFlagged, openForEquip.length > 0, overdueForEquip.length > 0].filter(Boolean).length;

      if (signals >= 2) {
        const tags = [];
        if (sampleFlagged) tags.push([`${latest.reportStatus} sample`, latest.reportStatus === "Alert" ? "danger" : "warning"]);
        if (openForEquip.length > 0) {
          const oldest = Math.max(...openForEquip.map((a) => daysBetween(a.revisionDate, now) ?? 0));
          tags.push([`Open action · ${oldest}d`, "danger"]);
        }
        if (overdueForEquip.length > 0) tags.push([`Oil change overdue`, "warning"]);
        list.push({
          key: `risk-${reg.code}`,
          sev: sampleFlagged && latest.reportStatus === "Alert" ? "danger" : "warning",
          icon: "ti-alert-triangle",
          title: `${reg.description || reg.code} — ${reg.code}`,
          tags,
          desc: `${signals} of 3 systems flag this equipment — worth checking now instead of separately across pages.`,
          sample: latest,
          priority: 3 + signals,
        });
      } else if (sampleFlagged && openForEquip.length === 0) {
        list.push({
          key: `noaction-${reg.code}`,
          sev: latest.reportStatus === "Alert" ? "danger" : "warning",
          icon: "ti-clipboard-x",
          title: `${reg.code} — ${reg.description || ""}`,
          tags: [
            [`${latest.reportStatus} sample`, latest.reportStatus === "Alert" ? "danger" : "warning"],
            ["No action yet", "warning"],
          ],
          desc: `Latest sample came back ${latest.reportStatus} and doesn't have an action raised yet.`,
          sample: latest,
          priority: 2,
        });
      }
    });

    // Contractor clustering: 3+ points due (not yet overdue) within 14 days.
    contractorList.forEach((c) => {
      const codesForC = new Set(scopedRegistry.filter((r) => r.contractor === c).map((r) => r.code));
      const soon = scopedOilChanges.filter((o) => {
        if (!codesForC.has(o.equipmentCode) || o.status === "Overdue") return false;
        const daysSince = daysBetween(o.nextDueDate, now);
        if (daysSince == null) return false;
        const daysUntilDue = -daysSince;
        return daysUntilDue >= 0 && daysUntilDue <= 14;
      });
      if (soon.length >= 3) {
        list.push({
          key: `bundle-${c}`,
          sev: "accent",
          icon: "ti-users",
          title: `${c} has ${soon.length} points due within 2 weeks`,
          tags: [
            [c, "accent"],
            [`${soon.length} points`, "warning"],
          ],
          desc: `${soon
            .slice(0, 4)
            .map((o) => o.equipmentCode)
            .join(", ")} are all due for ${c} within the next 2 weeks — bundling into one visit instead of separate call-outs.`,
          sample: null,
          priority: 1,
        });
      }
    });

    return list.sort((a, b) => b.priority - a.priority).slice(0, 6);
  }, [scopedRegistry, scopedActions, scopedOilChanges, latestByEquip, contractorList, now]);

  const insightSevColor = { danger: T.danger, warning: T.warning, accent: T.accent };

  return (
    <div>
      <style>{`
        .dash-table-mobile { display: none; }
        @media (max-width: 700px) {
          .dash-table-desktop { display: none !important; }
          .dash-table-mobile { display: flex !important; }
        }
      `}</style>
      <p style={{ ...s.sectionTitle, margin: "0 0 8px" }}>Dashboard</p>

      {areas.length > 1 && (
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          {areas.map((a) => (
            <button
              key={a}
              style={{
                ...s.btn,
                fontSize: 12,
                background: areaFilter === a ? T.accent : "transparent",
                color: areaFilter === a ? T.accentText : T.textSecondary,
                borderColor: areaFilter === a ? T.accent : T.border,
              }}
              onClick={() => setAreaFilter(a)}
            >
              {a}
            </button>
          ))}
        </div>
      )}

      {/* ── Systems Overview ──────────────────────────────────────────── */}
      <p
        style={{
          fontSize: 12,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: 0.5,
          color: T.textSecondary,
          margin: "0 0 12px",
        }}
      >
        Systems Overview
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 14, marginBottom: 14 }}>
        <div style={{ ...s.card, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", marginBottom: 0 }}>
          <svg width="100" height="100" viewBox="0 0 120 120">
            {totalWithStatus > 0 && (
              <>
                <path d={arcPath(0, fracNormal, 54, 60, 60)} fill={T.success} opacity="0.9" />
                <path d={arcPath(fracNormal, fracCaution, 54, 60, 60)} fill={T.warning} opacity="0.9" />
                <path
                  d={arcPath(fracNormal + fracCaution, statusCounts.Alert / totalWithStatus, 54, 60, 60)}
                  fill={T.danger}
                  opacity="0.9"
                />
                <circle cx="60" cy="60" r="34" fill={T.cardBg} />
              </>
            )}
            <text x="60" y="56" textAnchor="middle" fontSize="18" fontWeight="800" fill={T.textPrimary}>
              {totalEquipment}
            </text>
            <text x="60" y="70" textAnchor="middle" fontSize="9" fill={T.textSecondary}>
              equipment
            </text>
          </svg>
          <div style={{ flex: 1, minWidth: 140 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: T.textPrimary }}>Equipment Health</span>
            </div>
            {[
              { label: "Normal", count: statusCounts.Normal, color: T.success, status: "Normal" },
              { label: "Caution", count: statusCounts.Caution, color: T.warning, status: "Caution" },
              { label: "Alert", count: statusCounts.Alert, color: T.danger, status: "Alert" },
            ].map((d) => (
              <div
                key={d.label}
                onClick={() => setStatusFilter(statusFilter === d.status ? "All" : d.status)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 7,
                  cursor: "pointer",
                  opacity: statusFilter !== "All" && statusFilter !== d.status ? 0.4 : 1,
                }}
              >
                <div style={{ width: 9, height: 9, borderRadius: "50%", background: d.color, flexShrink: 0 }} />
                <div style={{ flex: 1, height: 6, borderRadius: 4, background: T.border, overflow: "hidden" }}>
                  <div style={{ width: `${(d.count / totalWithStatus) * 100}%`, height: "100%", background: d.color, borderRadius: 4 }} />
                </div>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: d.color, minWidth: 18, textAlign: "right" }}>{d.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ ...s.card, marginBottom: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.textPrimary, marginBottom: 12 }}>Action Tracker</div>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            {Object.entries(actionStatusCounts).map(([label, n]) => (
              <div
                key={label}
                style={{
                  flex: 1,
                  textAlign: "center",
                  background: T.cardSubBg,
                  border: `1px solid ${T.border2}`,
                  borderRadius: 8,
                  padding: "7px 3px",
                }}
              >
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 800,
                    color: T[{ Open: "danger", "In Progress": "warning", "Waiting Stoppage": "accent", Closed: "success" }[label]],
                  }}
                >
                  {n}
                </div>
                <div style={{ fontSize: 8.5, color: T.textMuted, marginTop: 2, textTransform: "uppercase" }}>{label}</div>
              </div>
            ))}
          </div>
          {oldestOpenAction ? (
            <div style={{ fontSize: 11.5, color: T.textSecondary, display: "flex", alignItems: "center", gap: 6 }}>
              <i className="ti ti-clock-alert" style={{ color: T.danger }} aria-hidden="true" />
              Oldest open: <b style={{ color: T.danger, fontFamily: "monospace" }}>{oldestOpenAction.equipmentCode}</b>
              <span>· {daysBetween(oldestOpenAction.revisionDate, now)}d</span>
            </div>
          ) : (
            <div style={{ fontSize: 11.5, color: T.textMuted }}>No open actions.</div>
          )}
        </div>

        <div style={{ ...s.card, marginBottom: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.textPrimary, marginBottom: 12 }}>Oil Change Forecast</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: overdueOilChanges > 0 ? T.danger : T.success }}>
            {overdueOilChanges} <span style={{ fontSize: 11, fontWeight: 600, color: T.textSecondary }}>overdue</span>
          </div>
          <div style={{ fontSize: 11.5, color: T.textSecondary, marginTop: 8 }}>
            {nextDue ? (
              <>
                Next due: <b style={{ color: T.textPrimary, fontFamily: "monospace" }}>{nextDue.equipmentCode}</b> —{" "}
                {formatDate(nextDue.nextDueDate)}
              </>
            ) : (
              "Nothing else due soon."
            )}
          </div>
        </div>
      </div>

      {contractorStats.length > 0 && (
        <div style={{ ...s.card, marginBottom: 20 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: T.textPrimary, marginBottom: 16 }}>Contractor Performance</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 22 }}>
            {[
              ["On-Time Oil Changes", "onTimePct"],
              ["Action Closure Rate", "closureRatePct"],
            ].map(([label, key]) => {
              const withData = contractorStats.filter((c) => c[key] != null);
              const winner = withData.length > 1 ? withData.reduce((a, b) => (b[key] > a[key] ? b : a)) : null;
              return (
                <div
                  key={label}
                  style={{ background: T.cardSubBg, border: `1px solid ${T.border2}`, borderRadius: 10, padding: "12px 14px" }}
                >
                  <div style={{ fontSize: 12, fontWeight: 700, color: T.textPrimary, marginBottom: 10 }}>
                    {label}
                    {winner && (
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 800,
                          color: "#fff",
                          background: winner.color,
                          borderRadius: 999,
                          padding: "2px 8px",
                          marginLeft: 8,
                        }}
                      >
                        {winner.name} leads
                      </span>
                    )}
                  </div>
                  {contractorStats.map((c) => (
                    <div key={c.name} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                      <span style={{ width: 44, fontSize: 11, fontWeight: 800, color: c.color, flexShrink: 0 }}>{c.name}</span>
                      <span style={{ flex: 1, height: 14, borderRadius: 999, background: T.border, overflow: "hidden" }}>
                        <span
                          style={{ display: "block", height: "100%", width: `${c[key] ?? 0}%`, borderRadius: 999, background: c.color }}
                        />
                      </span>
                      <span style={{ width: 40, fontSize: 12.5, fontWeight: 800, color: c.color, textAlign: "right", flexShrink: 0 }}>
                        {c[key] == null ? "—" : `${c[key]}%`}
                      </span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── counting cards ────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 12, marginBottom: 20 }}>
        {countingCards.map((m) => (
          <div key={m.label} style={{ ...s.metricCard, display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 9,
                background: T[m.color] + "2A",
                color: T[m.color],
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <i className={`ti ${m.icon}`} style={{ fontSize: 16 }} aria-hidden="true" />
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: T[m.color] }}>{m.value}</div>
              <div style={{ fontSize: 10, color: T.textSecondary }}>{m.label}</div>
              <div style={{ fontSize: 9.5, color: T.textMuted, marginTop: 1 }}>{m.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Needs Attention ───────────────────────────────────────────── */}
      <p
        style={{
          fontSize: 12,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: 0.5,
          color: T.textSecondary,
          margin: "0 0 12px",
        }}
      >
        Needs Attention
      </p>
      <div style={{ marginBottom: 20 }}>
        {insights.length === 0 && (
          <div style={{ ...s.card, textAlign: "center", padding: 24, color: T.textMuted, fontSize: 13 }}>
            Nothing flagged across samples, actions, and oil changes right now.
          </div>
        )}
        {insights.map((ins) => (
          <div
            key={ins.key}
            style={{
              ...s.card,
              marginBottom: 10,
              display: "flex",
              alignItems: "flex-start",
              gap: 14,
              borderLeft: `3px solid ${insightSevColor[ins.sev]}`,
              padding: "14px 16px",
            }}
          >
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 9,
                background: insightSevColor[ins.sev] + "2A",
                color: insightSevColor[ins.sev],
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <i className={`ti ${ins.icon}`} style={{ fontSize: 16 }} aria-hidden="true" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.textHighlight }}>{ins.title}</div>
              <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                {ins.tags.map(([t, c]) => (
                  <span
                    key={t}
                    style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: T[c] + "22", color: T[c] }}
                  >
                    {t}
                  </span>
                ))}
              </div>
              <div style={{ fontSize: 12, color: T.textSecondary, marginTop: 6, lineHeight: 1.5 }}>{ins.desc}</div>
            </div>
            {ins.sample && onSelectSample && (
              <button style={{ ...s.btn, flexShrink: 0 }} onClick={() => onSelectSample(ins.sample)}>
                View Report
              </button>
            )}
          </div>
        ))}
      </div>

      {/* ── Equipment Status ──────────────────────────────────────────── */}
      <p
        style={{
          fontSize: 12,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: 0.5,
          color: T.textSecondary,
          margin: "0 0 12px",
        }}
      >
        Equipment Status
      </p>
      <div style={{ ...s.card, padding: 0 }}>
        <div
          style={{
            padding: "12px 16px",
            borderBottom: `1px solid ${T.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <span style={{ fontWeight: 600, color: T.textPrimary, fontSize: 13 }}>Latest Sample per Equipment</span>
          <div style={{ display: "flex", gap: 6 }}>
            {["All", "Normal", "Caution", "Alert"].map((d) => (
              <button
                key={d}
                onClick={() => setStatusFilter(d)}
                style={{
                  ...s.btn,
                  fontSize: 11,
                  padding: "3px 10px",
                  background: statusFilter === d ? statusColor(T, d === "All" ? "" : d) || T.border : "transparent",
                  color: statusFilter === d ? (d === "All" ? T.textPrimary : "#fff") : T.textSecondary,
                  border: `1px solid ${statusFilter === d ? statusColor(T, d === "All" ? "" : d) || T.border : T.border}`,
                }}
              >
                {d} {d !== "All" && `(${statusCounts[d] || 0})`}
              </button>
            ))}
          </div>
        </div>

        {sortedRows.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center", color: T.textMuted, fontSize: 13 }}>
            No {statusFilter !== "All" ? statusFilter : ""} samples recorded yet.
          </div>
        ) : (
          <>
            <div className="dash-table-desktop" style={{ overflowX: "auto" }}>
              <table style={s.table}>
                <thead>
                  <tr>
                    {["Equipment ID", "Description", "Sample Date", "Status", "Equipment Rating", "Lubricant Rating", "Contamination"].map(
                      (h) => (
                        <th key={h} style={s.th}>
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {sortedRows.map((d, i) => (
                    <tr
                      key={d._id || i}
                      style={{ cursor: onSelectSample ? "pointer" : "default" }}
                      onClick={() => onSelectSample && onSelectSample(d)}
                    >
                      <td style={s.td}>
                        {d.reportStatus === "Alert" && <span style={s.alertPulse} />}
                        <span style={{ fontWeight: 600, color: T.accent, marginLeft: d.reportStatus === "Alert" ? 6 : 0 }}>{d.unitId}</span>
                      </td>
                      <td style={{ ...s.td, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {d.description}
                      </td>
                      <td style={s.td}>{formatDate(d.sampledDate)}</td>
                      <td style={s.td}>
                        <span style={s.badge(d.reportStatus)}>{d.reportStatus}</span>
                      </td>
                      <td style={s.td}>
                        <span style={s.badge(d.equipmentRating)}>{d.equipmentRating || "—"}</span>
                      </td>
                      <td style={s.td}>
                        <span style={s.badge(d.lubricantRating)}>{d.lubricantRating || "—"}</span>
                      </td>
                      <td style={s.td}>
                        <span style={s.badge(d.contaminationRating)}>{d.contaminationRating || "—"}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="dash-table-mobile" style={{ flexDirection: "column", gap: 6, padding: 12 }}>
              {sortedRows.map((d, i) => (
                <div
                  key={d._id || i}
                  style={{
                    background: T.cardSubBg,
                    border: `1px solid ${T.border}`,
                    borderRadius: 8,
                    padding: "10px 12px",
                    cursor: onSelectSample ? "pointer" : "default",
                  }}
                  onClick={() => onSelectSample && onSelectSample(d)}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                    {d.reportStatus === "Alert" && <span style={s.alertPulse} />}
                    <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 12, color: T.accent }}>{d.unitId}</span>
                    <span
                      style={{
                        fontSize: 11,
                        color: T.textSecondary,
                        flex: 1,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {d.description}
                    </span>
                    <span style={{ fontSize: 11, color: T.textMuted, whiteSpace: "nowrap", flexShrink: 0 }}>
                      {formatDate(d.sampledDate)}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {d.reportStatus && <span style={s.badge(d.reportStatus)}>{d.reportStatus}</span>}
                    {d.equipmentRating && <span style={s.badge(d.equipmentRating)}>Equip: {d.equipmentRating}</span>}
                    {d.lubricantRating && <span style={s.badge(d.lubricantRating)}>Lub: {d.lubricantRating}</span>}
                    {d.contaminationRating && <span style={s.badge(d.contaminationRating)}>Cont: {d.contaminationRating}</span>}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {recentSamples.length > 0 && (
        <div style={{ ...s.card, marginTop: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.textPrimary, marginBottom: 10 }}>Recent Samples Added</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {recentSamples.map((d, i) => (
              <div
                key={d._id || i}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: `1px solid ${T.border2}` }}
              >
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: statusColor(T, d.reportStatus), flexShrink: 0 }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: T.accent, minWidth: 140 }}>{d.unitId}</span>
                <span style={{ fontSize: 11, color: T.textSecondary, flex: 1 }}>{formatDate(d.sampledDate)}</span>
                <span style={s.badge(d.reportStatus)}>{d.reportStatus}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
