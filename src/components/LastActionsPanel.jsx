import { useState } from "react";
import { s, T } from "../theme";
import { formatDate } from "../parsers";
import EditActionModal from "./EditActionModal";

const STATUS_COLOR = { Open: T.danger, "In Progress": T.warning, Closed: T.success, "Waiting Stoppage": T.accent };
const RESULT_COLOR = { ALERT: T.danger, CAUTION: T.warning, NORMAL: T.success, SATISFACTORY: T.success, UNSATISFACTORY: T.danger };

// Shared by the Oil Analysis Report page and the Action Tracker page. Both
// consumers pass the SAME `actions` array and the SAME onAdd/onUpdate/onDelete
// callbacks (lifted to App), so an edit made here is immediately visible on
// the other page too — no separate copies of the data to fall out of sync.
export default function LastActionsPanel({ equipmentCode, actions, onAdd, onUpdate, onDelete, title, limit, equipmentOptions }) {
  const [viewing, setViewing] = useState(null);
  const [editing, setEditing] = useState(null); // { action, isNew }
  const [saving, setSaving] = useState(false);

  const filtered = (actions || [])
    .filter((a) => (a.equipmentCode || a.unitId || "") === equipmentCode)
    .sort((a, b) => new Date(b.revisionDate || b.sampleDate || 0) - new Date(a.revisionDate || a.sampleDate || 0))
    .slice(0, limit || 5);

  function openNew() {
    setEditing({ action: { equipmentCode, createdAt: new Date().toISOString() }, isNew: true });
  }
  function openEdit(action) {
    setEditing({ action, isNew: false });
    setViewing(null);
  }

  async function handleSave(updated) {
    setSaving(true);
    try {
      if (editing.isNew) await onAdd(updated);
      else await onUpdate(updated);
      setEditing(null);
    } catch (err) {
      // onAdd/onUpdate already surface a toast; keep the modal open so the
      // user can retry instead of losing their edits.
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setSaving(true);
    try {
      await onDelete(editing.action);
      setEditing(null);
    } catch {
      // toast already shown
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={s.card}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <i className="ti ti-checklist" style={{ color: T.accent, fontSize: 18 }} aria-hidden="true" />
          <span style={{ fontWeight: 700, fontSize: 14, color: T.textPrimary }}>
            {title || `Last ${limit || 5} Actions`} — {equipmentCode}
          </span>
        </div>
        <button style={s.btnPrimary} onClick={openNew}>
          <i className="ti ti-plus" aria-hidden="true" /> Add Action
        </button>
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "20px 0", color: T.textMuted, fontSize: 13 }}>
          No actions recorded for this equipment.
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ ...s.table, fontSize: 12 }}>
            <thead>
              <tr>
                {["Ac.No", "Revision Date", "Sample Date", "Sample Result", "Status", "Agreed Action", "Completed Date", ""].map((h) => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((a, i) => (
                <tr key={a._id || i} style={{ cursor: "pointer" }} onClick={() => setViewing(a)}>
                  <td style={{ ...s.td, fontFamily: "monospace", fontSize: 11 }}>{a.acNo || "—"}</td>
                  <td style={{ ...s.td, whiteSpace: "nowrap" }}>{formatDate(a.revisionDate)}</td>
                  <td style={{ ...s.td, whiteSpace: "nowrap" }}>{formatDate(a.sampleDate)}</td>
                  <td style={s.td}>
                    {a.sampleResult && (
                      <span style={{ background: (RESULT_COLOR[(a.sampleResult || "").toUpperCase()] || T.textSecondary) + "22", color: RESULT_COLOR[(a.sampleResult || "").toUpperCase()] || T.textSecondary, borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>
                        {a.sampleResult}
                      </span>
                    )}
                  </td>
                  <td style={s.td}>
                    <span style={{ background: (STATUS_COLOR[a.status] || T.textSecondary) + "22", color: STATUS_COLOR[a.status] || T.textSecondary, borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap" }}>
                      {a.status || "—"}
                    </span>
                  </td>
                  <td style={{ ...s.td, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={a.agreedAction}>
                    {a.agreedAction || "—"}
                  </td>
                  <td style={{ ...s.td, whiteSpace: "nowrap" }}>{formatDate(a.completedDate)}</td>
                  <td style={s.td}>
                    <button
                      style={{ ...s.btn, padding: "3px 7px", fontSize: 11 }}
                      onClick={(e) => { e.stopPropagation(); openEdit(a); }}
                    >
                      <i className="ti ti-edit" aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <EditActionModal
          action={editing.action}
          isNew={editing.isNew}
          allActions={actions}
          equipmentOptions={equipmentOptions}
          saving={saving}
          onClose={() => !saving && setEditing(null)}
          onSave={handleSave}
          onDelete={editing.isNew ? null : handleDelete}
        />
      )}
    </div>
  );
}
