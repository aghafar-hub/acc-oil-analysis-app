import { useMemo, useState } from "react";
import { useTheme } from "../ThemeContext";
import { formatDate } from "../parsers";
import EquipmentSearch from "../components/EquipmentSearch";
import EditOilChangeModal from "../components/EditOilChangeModal";

export default function OilChangeLog({ oilChanges, equipmentRegistry, onSave }) {
  const { T, s } = useTheme();
  const [equipCode, setEquipCode] = useState("");
  const [areaFilter, setAreaFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [expanded, setExpanded] = useState(null);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const registry = equipmentRegistry || [];
  const areas = ["All", ...Array.from(new Set(registry.map((r) => r.area).filter(Boolean)))];
  const areaCodes = areaFilter === "All" ? null : new Set(registry.filter((r) => r.area === areaFilter).map((r) => r.code));

  const filtered = oilChanges.filter(
    (o) =>
      !(areaCodes && !areaCodes.has(o.equipmentCode || "")) &&
      !(equipCode && o.equipmentCode !== equipCode) &&
      !(statusFilter !== "All" && (o.status || "Current") !== statusFilter)
  );

  const byEquip = useMemo(() => {
    const map = {};
    filtered.forEach((o) => {
      const code = o.equipmentCode || "Unassigned";
      (map[code] ||= []).push(o);
    });
    return map;
  }, [filtered]);
  const codes = Object.keys(byEquip).sort();

  const statusColors = { Current: T.success, Overdue: T.danger, Scheduled: T.accent };
  const counts = {
    Current: oilChanges.filter((o) => (o.status || "Current") === "Current").length,
    Overdue: oilChanges.filter((o) => o.status === "Overdue").length,
    Scheduled: oilChanges.filter((o) => o.status === "Scheduled").length,
  };

  async function handleSave(updated) {
    setSaving(true);
    try {
      await onSave(updated);
      setEditing(null);
    } catch {
      // toast already shown
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <p style={{ ...s.sectionTitle, margin: "0 0 8px" }}>Oil Change Log</p>

      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        {Object.entries(counts).map(([label, count]) => (
          <div
            key={label}
            onClick={() => setStatusFilter((f) => (f === label ? "All" : label))}
            style={{
              ...s.metricCard,
              borderColor: statusFilter === label ? statusColors[label] : "transparent",
              borderWidth: 2,
              borderStyle: "solid",
              cursor: "pointer",
              minWidth: 120,
              flex: 1,
            }}
          >
            <div style={{ fontSize: 11, color: T.textSecondary, marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: statusColors[label] }}>{count}</div>
          </div>
        ))}
      </div>

      <div style={{ ...s.infoBar, marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
        <i className="ti ti-info-circle" style={{ color: T.accent }} aria-hidden="true" />
        <span style={{ fontSize: 12, color: T.textSecondary }}>
          Equipment rows are managed directly in Google Sheets. Only <strong>Last Change</strong> and <strong>Next Oil Change</strong> dates
          can be edited here. Status is auto-calculated by the sheet formula.
        </span>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <EquipmentSearch
          options={registry}
          value={equipCode || "All"}
          onChange={(v) => setEquipCode(v === "All" ? "" : v)}
          allowAll
          width={220}
          placeholder="All Assets"
        />
        <select style={{ ...s.select, minWidth: 140 }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          {["All", "Current", "Overdue", "Scheduled"].map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
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
      </div>

      {codes.length === 0 ? (
        <div style={{ ...s.card, textAlign: "center", padding: "40px 0", color: T.textMuted }}>No oil change records match the filter.</div>
      ) : (
        codes.map((code) => {
          const list = byEquip[code];
          const isOpen = expanded === code;
          const statuses = [...new Set(list.map((o) => o.status || "Current"))];
          return (
            <div key={code} style={{ ...s.card, marginBottom: 12 }}>
              <div
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}
                onClick={() => setExpanded(isOpen ? null : code)}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <i className={`ti ti-chevron-${isOpen ? "up" : "down"}`} style={{ color: T.textMuted }} aria-hidden="true" />
                  <span style={{ fontWeight: 700, color: T.accent, fontFamily: "monospace" }}>{code}</span>
                  <span style={{ fontSize: 12, color: T.textSecondary }}>{list[0]?.assetName || ""}</span>
                  <span style={{ fontSize: 12, color: T.textMuted }}>
                    {list.length} point{list.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  {statuses.map((st) => (
                    <span
                      key={st}
                      style={{
                        background: (statusColors[st] || T.accent) + "22",
                        color: statusColors[st] || T.accent,
                        borderRadius: 4,
                        padding: "2px 8px",
                        fontSize: 11,
                        fontWeight: 700,
                      }}
                    >
                      {st}
                    </span>
                  ))}
                </div>
              </div>
              {isOpen && (
                <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
                  {list.map((o) => (
                    <div
                      key={o._id}
                      style={{
                        background: T.cardSubBg,
                        border: `1px solid ${T.border}`,
                        borderRadius: 8,
                        padding: "10px 12px",
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        flexWrap: "wrap",
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 160 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: T.textPrimary }}>{o.lubricationPoint}</div>
                        <div style={{ fontSize: 11, color: T.textSecondary }}>
                          {o.oilType} {o.brand ? `/ ${o.brand}` : ""}
                        </div>
                      </div>
                      <div style={{ fontSize: 12, color: T.textSecondary }}>Last: {formatDate(o.changeDate) || "—"}</div>
                      <div style={{ fontSize: 12, color: T.textSecondary }}>Next: {formatDate(o.nextDueDate) || "—"}</div>
                      <span
                        style={{
                          background: (statusColors[o.status] || T.accent) + "22",
                          color: statusColors[o.status] || T.accent,
                          borderRadius: 4,
                          padding: "2px 8px",
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      >
                        {o.status || "Current"}
                      </span>
                      <button style={{ ...s.btn, padding: "3px 8px", fontSize: 11 }} onClick={() => setEditing(o)}>
                        <i className="ti ti-edit" aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })
      )}

      {editing && <EditOilChangeModal oilChange={editing} saving={saving} onClose={() => setEditing(null)} onSave={handleSave} />}
    </div>
  );
}
