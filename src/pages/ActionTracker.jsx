import { useMemo, useState } from "react";
import { s, T } from "../theme";
import { formatDate } from "../parsers";
import EditActionModal from "../components/EditActionModal";

const STATUS_COLOR = { Open: T.danger, "In Progress": T.warning, Closed: T.success, "Waiting Stoppage": T.accent };

// This page renders its own table (grouped by equipment, expandable) rather
// than reusing <LastActionsPanel>, but it is wired to the exact same
// `actions` array and the exact same onAddAction/onUpdateAction/onDeleteAction
// callbacks that the Oil Analysis Report page uses (both passed down from
// App's lifted state). An edit made on either page updates the one shared
// list, so both pages reflect it immediately — that shared wiring, plus the
// verified writes in api.js, is what actually fixes the original sync bug.
export default function ActionTracker({ actions, oilChanges, equipmentOptions, onAddAction, onUpdateAction, onDeleteAction }) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [expanded, setExpanded] = useState({});
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const grouped = useMemo(() => {
    const byEquip = {};
    for (const a of actions) {
      const code = a.equipmentCode || a.unitId || "Unknown";
      if (!byEquip[code]) byEquip[code] = [];
      byEquip[code].push(a);
    }
    let groups = Object.entries(byEquip).map(([code, list]) => ({
      code,
      list: [...list].sort((a, b) => new Date(b.revisionDate || 0) - new Date(a.revisionDate || 0)),
    }));
    if (query) {
      const q = query.toLowerCase();
      groups = groups.filter(
        (g) => g.code.toLowerCase().includes(q) || g.list.some((a) => (a.agreedAction || "").toLowerCase().includes(q))
      );
    }
    if (statusFilter !== "All") {
      groups = groups.filter((g) => g.list[0]?.status === statusFilter);
    }
    return groups.sort((a, b) => new Date(b.list[0]?.revisionDate || 0) - new Date(a.list[0]?.revisionDate || 0));
  }, [actions, query, statusFilter]);

  async function handleSave(updated) {
    setSaving(true);
    try {
      if (editing.isNew) await onAddAction(updated);
      else await onUpdateAction(updated);
      setEditing(null);
    } catch {
      // toast already shown by App
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setSaving(true);
    try {
      await onDeleteAction(editing.action);
      setEditing(null);
    } catch {
      // toast already shown
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <h1 style={{ fontSize: 20 }}>Action Tracker</h1>
        <button style={s.btnPrimary} onClick={() => setEditing({ action: { equipmentCode: equipmentOptions?.[0] || "" }, isNew: true })}>
          <i className="ti ti-plus" aria-hidden="true" /> Add Action
        </button>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
        <input
          style={{ ...s.input, maxWidth: 320 }}
          placeholder="Search equipment or action…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select style={{ ...s.input, maxWidth: 200 }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          {["All", "Open", "In Progress", "Closed", "Waiting Stoppage"].map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
      </div>
      <div style={{ fontSize: 12, color: T.textSecondary, marginBottom: 10 }}>
        {grouped.length} equipment · showing latest action per equipment · tap to expand
      </div>

      {grouped.map((g) => {
        const latest = g.list[0];
        const isOpen = expanded[g.code];
        return (
          <div key={g.code} style={{ ...s.card, borderLeft: `3px solid ${STATUS_COLOR[latest.status] || T.border}` }}>
            <div
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}
              onClick={() => setExpanded((e) => ({ ...e, [g.code]: !e[g.code] }))}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <strong>{g.code}</strong>
                  <span
                    style={{
                      background: (STATUS_COLOR[latest.status] || T.textSecondary) + "22",
                      color: STATUS_COLOR[latest.status] || T.textSecondary,
                      borderRadius: 4,
                      padding: "2px 8px",
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  >
                    {latest.status || "—"}
                  </span>
                </div>
                <div style={{ fontSize: 13, marginTop: 4 }}>{latest.agreedAction || "—"}</div>
                <div style={{ fontSize: 12, color: T.textSecondary, marginTop: 2 }}>{latest.description}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 12, color: T.textSecondary }}>{g.list.length}</span>
                <i className={`ti ${isOpen ? "ti-chevron-up" : "ti-chevron-down"}`} aria-hidden="true" />
              </div>
            </div>

            {isOpen && (
              <table style={{ ...s.table, fontSize: 12, marginTop: 14 }}>
                <thead>
                  <tr>
                    {["Ac.No", "Revision Date", "Status", "Agreed Action", "Completed Date", ""].map((h) => (
                      <th key={h} style={s.th}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {g.list.map((a) => (
                    <tr key={a._id}>
                      <td style={{ ...s.td, fontFamily: "monospace" }}>{a.acNo}</td>
                      <td style={s.td}>{formatDate(a.revisionDate)}</td>
                      <td style={s.td}>
                        <span style={{ color: STATUS_COLOR[a.status] || T.textSecondary }}>{a.status}</span>
                      </td>
                      <td style={s.td}>{a.agreedAction || "—"}</td>
                      <td style={s.td}>{formatDate(a.completedDate)}</td>
                      <td style={s.td}>
                        <button style={{ ...s.btn, padding: "3px 7px" }} onClick={() => setEditing({ action: a, isNew: false })}>
                          <i className="ti ti-edit" aria-hidden="true" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        );
      })}

      {editing && (
        <EditActionModal
          action={editing.action}
          isNew={editing.isNew}
          allActions={actions}
          oilChanges={oilChanges}
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
