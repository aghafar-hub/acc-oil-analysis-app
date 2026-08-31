import { useMemo, useState } from "react";
import { s, T } from "../theme";
import { formatDate } from "../parsers";

export default function Equipment({ samples, actions, onOpenReport }) {
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    const latestByEquip = {};
    for (const sample of samples) {
      const existing = latestByEquip[sample.unitId];
      if (!existing || new Date(sample.sampledDate) > new Date(existing.sampledDate)) {
        latestByEquip[sample.unitId] = sample;
      }
    }
    const openActionsByEquip = {};
    for (const a of actions) {
      if (a.status === "Open" || a.status === "In Progress" || a.status === "Waiting Stoppage") {
        openActionsByEquip[a.equipmentCode] = (openActionsByEquip[a.equipmentCode] || 0) + 1;
      }
    }
    return Object.values(latestByEquip)
      .filter((s) => !query || (s.unitId + " " + (s.description || "")).toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => (a.unitId || "").localeCompare(b.unitId || ""))
      .map((s) => ({ ...s, openActions: openActionsByEquip[s.unitId] || 0 }));
  }, [samples, actions, query]);

  return (
    <div>
      <h1 style={{ fontSize: 20, marginBottom: 20 }}>Equipment</h1>
      <input
        style={{ ...s.input, maxWidth: 320, marginBottom: 16 }}
        placeholder="Search equipment code or description…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div style={s.card}>
        {rows.length === 0 ? (
          <div style={{ color: T.textMuted, fontSize: 13 }}>No equipment found.</div>
        ) : (
          <table style={s.table}>
            <thead>
              <tr>
                {["Equipment Code", "Description", "Last Sample", "Status", "Open Actions", ""].map((h) => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.unitId}>
                  <td style={{ ...s.td, fontFamily: "monospace" }}>{r.unitId}</td>
                  <td style={s.td}>{r.description || "—"}</td>
                  <td style={s.td}>{formatDate(r.sampledDate)}</td>
                  <td style={s.td}><span style={s.badge(r.reportStatus)}>{r.reportStatus}</span></td>
                  <td style={s.td}>{r.openActions > 0 ? <span style={s.badge("Alert")}>{r.openActions}</span> : "—"}</td>
                  <td style={s.td}>
                    <button style={{ ...s.btn, padding: "3px 10px", fontSize: 12 }} onClick={() => onOpenReport(r)}>Open Report</button>
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
