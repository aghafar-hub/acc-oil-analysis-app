import { useMemo } from "react";
import { s, T } from "../theme";
import { formatDate } from "../parsers";

function StatTile({ label, value, color }) {
  return (
    <div style={{ ...s.card, marginBottom: 0, flex: 1 }}>
      <div style={{ fontSize: 12, color: T.textSecondary, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: color || T.textPrimary }}>{value}</div>
    </div>
  );
}

export default function Dashboard({ samples, actions, oilChanges, onSelectSample }) {
  const stats = useMemo(() => {
    const latestByEquip = {};
    for (const sample of samples) {
      const existing = latestByEquip[sample.unitId];
      if (!existing || new Date(sample.sampledDate) > new Date(existing.sampledDate)) {
        latestByEquip[sample.unitId] = sample;
      }
    }
    let critical = 0, warning = 0, normal = 0;
    Object.values(latestByEquip).forEach((s) => {
      if (s.reportStatus === "Alert") critical++;
      else if (s.reportStatus === "Caution" || s.reportStatus === "Warning") warning++;
      else normal++;
    });
    const overdueOilChanges = oilChanges.filter((o) => o.status === "Overdue").length;
    const pendingActions = actions.filter((a) => a.status === "Open" || a.status === "In Progress" || a.status === "Waiting Stoppage").length;
    return { critical, warning, normal, overdueOilChanges, pendingActions, totalEquipment: Object.keys(latestByEquip).length, totalSamples: samples.length };
  }, [samples, actions, oilChanges]);

  const recent = useMemo(
    () => [...samples].sort((a, b) => new Date(b.sampledDate) - new Date(a.sampledDate)).slice(0, 10),
    [samples]
  );

  return (
    <div>
      <h1 style={{ fontSize: 20, marginBottom: 20 }}>Dashboard</h1>
      <div style={{ display: "flex", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
        <StatTile label="Critical (Alert)" value={stats.critical} color={T.danger} />
        <StatTile label="Warning (Caution)" value={stats.warning} color={T.warning} />
        <StatTile label="Normal" value={stats.normal} color={T.success} />
        <StatTile label="Overdue Oil Changes" value={stats.overdueOilChanges} color={T.danger} />
        <StatTile label="Pending Actions" value={stats.pendingActions} color={T.accent} />
        <StatTile label="Equipment Tracked" value={stats.totalEquipment} />
      </div>

      <div style={s.card}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Recent Samples</div>
        {recent.length === 0 ? (
          <div style={{ color: T.textMuted, fontSize: 13 }}>No samples yet — sync from Settings or add a sample.</div>
        ) : (
          <table style={s.table}>
            <thead>
              <tr>
                {["Equipment", "Sampled", "Status", ""].map((h) => <th key={h} style={s.th}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {recent.map((sam, i) => (
                <tr key={sam._id || i}>
                  <td style={s.td}>{sam.unitId}</td>
                  <td style={s.td}>{formatDate(sam.sampledDate)}</td>
                  <td style={s.td}><span style={s.badge(sam.reportStatus)}>{sam.reportStatus}</span></td>
                  <td style={s.td}>
                    <button style={{ ...s.btn, padding: "3px 10px", fontSize: 12 }} onClick={() => onSelectSample(sam)}>Open</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
