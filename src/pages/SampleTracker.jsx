import { useMemo } from "react";
import { s, T } from "../theme";
import { formatDate } from "../parsers";

// Shows every equipment's full sample history — the underlying data this
// app already has from Data_Entry, presented as a per-equipment timeline
// rather than requiring the separate "Oil Sample Tracker" sheet tab.
export default function SampleTracker({ samples }) {
  const groups = useMemo(() => {
    const byEquip = {};
    for (const s of samples) {
      if (!byEquip[s.unitId]) byEquip[s.unitId] = [];
      byEquip[s.unitId].push(s);
    }
    return Object.entries(byEquip)
      .map(([code, list]) => ({ code, list: [...list].sort((a, b) => new Date(b.sampledDate) - new Date(a.sampledDate)) }))
      .sort((a, b) => a.code.localeCompare(b.code));
  }, [samples]);

  return (
    <div>
      <h1 style={{ fontSize: 20, marginBottom: 20 }}>Sample Tracker</h1>
      {groups.length === 0 && <div style={{ color: T.textMuted, fontSize: 13 }}>No samples yet.</div>}
      {groups.map((g) => (
        <div key={g.code} style={s.card}>
          <div style={{ fontWeight: 700, marginBottom: 10 }}>{g.code}</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {g.list.map((sample, i) => (
              <div key={sample._id || i} style={{ ...s.badge(sample.reportStatus), padding: "6px 10px" }} title={formatDate(sample.sampledDate)}>
                {formatDate(sample.sampledDate)}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
