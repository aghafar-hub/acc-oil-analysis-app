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

export default function Dashboard({ samples, actions, oilChanges, equipmentRegistry, onSelectSample }) {
  const { T, s } = useTheme();
  const [statusFilter, setStatusFilter] = useState("All");
  const [areaFilter, setAreaFilter] = useState("All");

  const areas = useMemo(
    () => ["All", ...Array.from(new Set((equipmentRegistry || []).map((e) => e.area).filter(Boolean)))],
    [equipmentRegistry]
  );
  const areaCodes =
    areaFilter === "All" ? null : new Set((equipmentRegistry || []).filter((e) => e.area === areaFilter).map((e) => e.code));

  const scopedSamples = areaCodes ? samples.filter((s2) => areaCodes.has(s2.unitId)) : samples;
  const scopedActions = areaCodes ? actions.filter((a) => areaCodes.has(a.equipmentCode)) : actions;
  const scopedOilChanges = areaCodes ? oilChanges.filter((o) => areaCodes.has(o.equipmentCode)) : oilChanges;

  const latestByEquip = useMemo(() => {
    const map = {};
    scopedSamples.forEach((sm) => {
      if (!sm.unitId) return;
      if (!map[sm.unitId] || new Date(sm.sampledDate) > new Date(map[sm.unitId].sampledDate)) map[sm.unitId] = sm;
    });
    return Object.values(map);
  }, [scopedSamples]);

  const openActions = scopedActions.filter((a) => a.status === "Open").length;
  const inProgress = scopedActions.filter((a) => a.status === "In Progress").length;
  const overdueOilChanges = scopedOilChanges.filter((o) => o.nextDueDate && new Date(o.nextDueDate) < new Date()).length;

  const statusCounts = {
    Normal: latestByEquip.filter((d) => d.reportStatus === "Normal").length,
    Caution: latestByEquip.filter((d) => d.reportStatus === "Caution" || d.reportStatus === "Warning").length,
    Alert: latestByEquip.filter((d) => d.reportStatus === "Alert").length,
  };
  const totalWithStatus = statusCounts.Normal + statusCounts.Caution + statusCounts.Alert || 1;
  const fracNormal = statusCounts.Normal / totalWithStatus;
  const fracCaution = statusCounts.Caution / totalWithStatus;

  const totalEquipment = areaCodes ? areaCodes.size : (equipmentRegistry || []).length;

  const filteredRows =
    statusFilter === "All"
      ? latestByEquip
      : latestByEquip.filter((d) =>
          statusFilter === "Caution" ? d.reportStatus === "Caution" || d.reportStatus === "Warning" : d.reportStatus === statusFilter
        );

  const severityOrder = { Alert: 0, Caution: 1, Warning: 1, Normal: 2 };
  const sortedRows = [...filteredRows].sort((a, b) => (severityOrder[a.reportStatus] ?? 3) - (severityOrder[b.reportStatus] ?? 3));

  const recentSamples = useMemo(
    () => [...samples].sort((a, b) => new Date(b.sampledDate || 0) - new Date(a.sampledDate || 0)).slice(0, 8),
    [samples]
  );

  const metrics = [
    { label: "Registered Equipment", value: (equipmentRegistry || []).length, icon: "ti-database", color: T.accent },
    { label: "Total Samples", value: samples.length, icon: "ti-flask", color: T.accent },
    { label: "Open Actions", value: openActions, icon: "ti-alert-circle", color: T.danger },
    { label: "In Progress", value: inProgress, icon: "ti-loader", color: T.warning },
    { label: "Overdue Oil Changes", value: overdueOilChanges, icon: "ti-oil", color: T.danger },
  ];

  const trackerSummary = [
    { label: "Open", value: actions.filter((a) => a.status === "Open").length, color: T.danger },
    { label: "In Progress", value: actions.filter((a) => a.status === "In Progress").length, color: T.warning },
    { label: "Waiting Stoppage", value: actions.filter((a) => a.status === "Waiting Stoppage").length, color: T.accent },
    { label: "Closed", value: actions.filter((a) => a.status === "Closed").length, color: T.success },
  ];

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
        <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
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

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 12, marginBottom: 20 }}>
        {metrics.map((m) => (
          <div key={m.label} style={s.metricCard}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
              <i className={`ti ${m.icon}`} style={{ color: m.color, fontSize: 18 }} aria-hidden="true" />
              <span style={{ fontSize: 11, color: T.textSecondary, lineHeight: 1.3 }}>{m.label}</span>
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: m.color }}>{m.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
        <div style={{ ...s.card, display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
          <svg width="120" height="120" viewBox="0 0 120 120">
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
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.textPrimary, marginBottom: 10 }}>Equipment Status</div>
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
                  marginBottom: 8,
                  cursor: "pointer",
                  opacity: statusFilter !== "All" && statusFilter !== d.status ? 0.4 : 1,
                }}
              >
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: d.color, flexShrink: 0 }} />
                <div style={{ flex: 1, height: 8, borderRadius: 4, background: T.border, overflow: "hidden" }}>
                  <div style={{ width: `${(d.count / totalWithStatus) * 100}%`, height: "100%", background: d.color, borderRadius: 4 }} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: d.color, minWidth: 20 }}>{d.count}</span>
                <span style={{ fontSize: 11, color: T.textSecondary }}>{d.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={s.card}>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.textPrimary, marginBottom: 12 }}>Action Tracker Summary</div>
          {trackerSummary.map((d) => (
            <div
              key={d.label}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "8px 0",
                borderBottom: `1px solid ${T.border2}`,
              }}
            >
              <span style={{ fontSize: 12, color: T.textSecondary }}>{d.label}</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: d.color }}>{d.value}</span>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", marginTop: 2 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: T.textPrimary }}>Total</span>
            <span style={{ fontSize: 14, fontWeight: 800, color: T.textPrimary }}>{actions.length}</span>
          </div>
        </div>
      </div>

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
          <span style={{ fontWeight: 600, color: T.textPrimary, fontSize: 13 }}>Equipment Status — Latest Sample</span>
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
