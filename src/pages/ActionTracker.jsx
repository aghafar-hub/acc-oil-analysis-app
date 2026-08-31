import { useMemo, useState } from "react";
import { useTheme } from "../ThemeContext";
import { formatDate } from "../parsers";
import EquipmentSearch from "../components/EquipmentSearch";
import EditActionModal from "../components/EditActionModal";

const STATUS_COLOR_KEY = { Open: "danger", "In Progress": "warning", "Waiting Stoppage": "accent", Closed: "success" };
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// This page renders its own accordion grouped-by-equipment view rather than
// reusing <LastActionsPanel>, but it is wired to the exact same `actions`
// array and the exact same onAddAction/onUpdateAction/onDeleteAction
// callbacks that the Oil Analysis Report page uses (both passed down from
// App's lifted state) — that shared wiring, plus the verified writes in
// api.js, is what actually fixes the original sync bug.
export default function ActionTracker({
  actions,
  oilChanges,
  equipmentRegistry,
  equipmentOptions,
  onAddAction,
  onUpdateAction,
  onDeleteAction,
}) {
  const { T, s } = useTheme();
  const [equipCode, setEquipCode] = useState("");
  const [month, setMonth] = useState("All");
  const [year, setYear] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [areaFilter, setAreaFilter] = useState("All");
  const [expanded, setExpanded] = useState(null);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const registry = equipmentRegistry || [];
  const areas = ["All", ...Array.from(new Set(registry.map((r) => r.area).filter(Boolean)))];
  const years = [
    "All",
    ...Array.from(
      new Set(actions.map((a) => (a.revisionDate ? new Date(a.revisionDate).getFullYear().toString() : null)).filter(Boolean))
    ).sort((a, b) => b - a),
  ];
  const hasDateFilter = month !== "All" || year !== "All";

  function matchesFilter(a) {
    const d = a.revisionDate ? new Date(a.revisionDate) : null;
    if (month !== "All" && (!d || d.getMonth() !== parseInt(month, 10))) return false;
    if (year !== "All" && (!d || d.getFullYear().toString() !== year)) return false;
    if (statusFilter !== "All" && a.status !== statusFilter) return false;
    return true;
  }

  const byEquip = useMemo(() => {
    const map = {};
    actions.forEach((a) => {
      const code = a.equipmentCode || a.unitId || "—";
      (map[code] ||= []).push(a);
    });
    Object.values(map).forEach((list) => list.sort((a, b) => new Date(b.revisionDate || 0) - new Date(a.revisionDate || 0)));
    return map;
  }, [actions]);

  const areaCodes = areaFilter === "All" ? null : new Set(registry.filter((r) => r.area === areaFilter).map((r) => r.code));

  let equipCodes = Object.keys(byEquip).sort();
  if (equipCode) equipCodes = equipCodes.filter((c) => c === equipCode);
  if (areaCodes) equipCodes = equipCodes.filter((c) => areaCodes.has(c));

  const statusCounts = {
    Open: actions.filter((a) => a.status === "Open").length,
    "In Progress": actions.filter((a) => a.status === "In Progress").length,
    "Waiting Stoppage": actions.filter((a) => a.status === "Waiting Stoppage").length,
    Closed: actions.filter((a) => a.status === "Closed").length,
  };

  const visibleList = (code) => {
    const list = byEquip[code] || [];
    return hasDateFilter || statusFilter !== "All" ? list.filter(matchesFilter) : list;
  };
  const visibleCodes = equipCodes.filter((code) =>
    hasDateFilter || statusFilter !== "All" ? visibleList(code).length > 0 : (byEquip[code] || []).length > 0
  );

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
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(110px,1fr))", gap: 10, marginBottom: 20 }}>
        {Object.entries(statusCounts).map(([label, count]) => (
          <div
            key={label}
            style={{
              ...s.card,
              textAlign: "center",
              padding: "10px 8px",
              cursor: "pointer",
              border: `2px solid ${statusFilter === label ? T[STATUS_COLOR_KEY[label]] : "transparent"}`,
              marginBottom: 0,
            }}
            onClick={() => setStatusFilter((f) => (f === label ? "All" : label))}
          >
            <div style={{ fontSize: 24, fontWeight: 800, color: T[STATUS_COLOR_KEY[label]] }}>{count}</div>
            <div style={{ fontSize: 10, color: T.textSecondary, marginTop: 2 }}>{label}</div>
          </div>
        ))}
        <div style={{ ...s.card, textAlign: "center", padding: "10px 8px", marginBottom: 0 }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: T.textSecondary }}>{actions.length}</div>
          <div style={{ fontSize: 10, color: T.textSecondary, marginTop: 2 }}>Total</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <EquipmentSearch
          options={registry}
          value={equipCode || "All"}
          onChange={(v) => setEquipCode(v === "All" ? "" : v)}
          allowAll
          width={220}
          placeholder="All Equipment"
        />
        <select style={{ ...s.select, minWidth: 110, fontSize: 12 }} value={month} onChange={(e) => setMonth(e.target.value)}>
          <option value="All">All Months</option>
          {MONTHS.map((m, i) => (
            <option key={m} value={i}>
              {m}
            </option>
          ))}
        </select>
        <select style={{ ...s.select, minWidth: 90, fontSize: 12 }} value={year} onChange={(e) => setYear(e.target.value)}>
          {years.map((y) => (
            <option key={y}>{y}</option>
          ))}
        </select>
        {(equipCode || month !== "All" || year !== "All" || statusFilter !== "All") && (
          <button
            style={{ ...s.btn, fontSize: 12, color: T.danger, borderColor: T.danger }}
            onClick={() => {
              setEquipCode("");
              setMonth("All");
              setYear("All");
              setStatusFilter("All");
            }}
          >
            <i className="ti ti-x" aria-hidden="true" /> Clear
          </button>
        )}
        {areas.length > 1 &&
          areas.map((a) => (
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
        <button
          style={{ ...s.btnPrimary, marginLeft: "auto" }}
          onClick={() => setEditing({ action: { equipmentCode: equipmentOptions?.[0] || "" }, isNew: true })}
        >
          <i className="ti ti-plus" aria-hidden="true" /> Add Action
        </button>
      </div>

      <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 10 }}>
        {hasDateFilter || statusFilter !== "All"
          ? `Showing ${visibleCodes.reduce((n, c) => n + visibleList(c).length, 0)} actions across ${visibleCodes.length} equipment`
          : `${visibleCodes.length} equipment · showing latest action per equipment · tap to expand all`}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {visibleCodes.length === 0 && (
          <div style={{ ...s.card, textAlign: "center", padding: 30, color: T.textMuted, fontSize: 13 }}>
            No actions match the current filters.
          </div>
        )}
        {visibleCodes.map((code) => {
          const full = byEquip[code] || [];
          const list = visibleList(code);
          const latest = (hasDateFilter || statusFilter !== "All" ? list : full)[0];
          const isOpen = expanded === code;
          return (
            <div key={code} style={{ ...s.card, borderLeft: `3px solid ${T[STATUS_COLOR_KEY[latest.status]] || T.border}` }}>
              <div
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}
                onClick={() => setExpanded(isOpen ? null : code)}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <strong>{code}</strong>
                    <span style={s.badge(latest.status)}>{latest.status || "—"}</span>
                  </div>
                  <div style={{ fontSize: 13, marginTop: 4 }}>{latest.agreedAction || "—"}</div>
                  <div style={{ fontSize: 12, color: T.textSecondary, marginTop: 2 }}>{latest.description}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 12, color: T.textSecondary }}>{full.length}</span>
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
                    {full.map((a) => (
                      <tr key={a._id}>
                        <td style={{ ...s.td, fontFamily: "monospace" }}>{a.acNo}</td>
                        <td style={s.td}>{formatDate(a.revisionDate)}</td>
                        <td style={s.td}>
                          <span style={{ color: T[STATUS_COLOR_KEY[a.status]] || T.textSecondary }}>{a.status}</span>
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
      </div>

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
