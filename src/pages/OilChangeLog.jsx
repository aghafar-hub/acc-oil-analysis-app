import { useState } from "react";
import { s, T } from "../theme";
import { formatDate } from "../parsers";

export default function OilChangeLog({ oilChanges, onSave }) {
  const [editing, setEditing] = useState(null); // { row, changeDate, nextDueDate }
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await onSave({ ...editing.row, changeDate: editing.changeDate, nextDueDate: editing.nextDueDate });
      setEditing(null);
    } catch {
      // toast already shown
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h1 style={{ fontSize: 20, marginBottom: 20 }}>Oil Change Log</h1>
      <div style={s.card}>
        {oilChanges.length === 0 ? (
          <div style={{ color: T.textMuted, fontSize: 13 }}>No oil change records yet.</div>
        ) : (
          <table style={s.table}>
            <thead>
              <tr>
                {["Equipment", "Lubrication Point", "Oil Type", "Last Change", "Next Due", "Status", ""].map((h) => (
                  <th key={h} style={s.th}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {oilChanges.map((o) => (
                <tr key={o._id}>
                  <td style={{ ...s.td, fontFamily: "monospace" }}>{o.equipmentCode}</td>
                  <td style={s.td}>{o.lubricationPoint}</td>
                  <td style={s.td}>{o.oilType}</td>
                  <td style={s.td}>{formatDate(o.changeDate)}</td>
                  <td style={s.td}>{formatDate(o.nextDueDate)}</td>
                  <td style={s.td}>
                    <span style={s.badge(o.status === "Overdue" ? "Alert" : "Normal")}>{o.status}</span>
                  </td>
                  <td style={s.td}>
                    <button
                      style={{ ...s.btn, padding: "3px 7px" }}
                      onClick={() => setEditing({ row: o, changeDate: o.changeDate, nextDueDate: o.nextDueDate })}
                    >
                      <i className="ti ti-edit" aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editing && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={() => !saving && setEditing(null)}
        >
          <div
            style={{ background: T.cardBg, border: `1px solid ${T.border}`, borderRadius: 12, padding: 24, width: 360 }}
            onClick={(e) => e.stopPropagation()}
          >
            <p style={{ fontWeight: 700, marginBottom: 16 }}>Update Oil Change — {editing.row.equipmentCode}</p>
            <label style={s.label}>Last Change Date</label>
            <input
              style={{ ...s.input, marginBottom: 14 }}
              type="date"
              value={editing.changeDate || ""}
              onChange={(e) => setEditing((x) => ({ ...x, changeDate: e.target.value }))}
            />
            <label style={s.label}>Next Due Date</label>
            <input
              style={{ ...s.input, marginBottom: 20 }}
              type="date"
              value={editing.nextDueDate || ""}
              onChange={(e) => setEditing((x) => ({ ...x, nextDueDate: e.target.value }))}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button style={s.btn} onClick={() => setEditing(null)} disabled={saving}>
                Cancel
              </button>
              <button style={s.btnPrimary} onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
