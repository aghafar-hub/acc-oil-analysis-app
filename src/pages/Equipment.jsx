import { useMemo, useState } from "react";
import { useTheme } from "../ThemeContext";
import { formatDate } from "../parsers";
import EquipmentSearch from "../components/EquipmentSearch";
import EditSampleModal from "../components/EditSampleModal";

function statusColor(T, status) {
  if (status === "Alert") return T.danger;
  if (status === "Caution" || status === "Warning") return T.warning;
  if (status === "Normal") return T.success;
  return T.textSecondary;
}

export default function Equipment({ samples, equipmentRegistry, onSelectSample, onEditSample, onDeleteSample, onOpenReport }) {
  const { T, s } = useTheme();
  const [tab, setTab] = useState("registry");
  const [assetClass, setAssetClass] = useState("All Classes");
  const [equipCode, setEquipCode] = useState("");
  const [areaFilter, setAreaFilter] = useState("All");
  const [expanded, setExpanded] = useState(null);
  const [editing, setEditing] = useState(null);

  const registry = equipmentRegistry || [];
  const areas = ["All", ...Array.from(new Set(registry.map((r) => r.area).filter(Boolean)))];
  const areaCodes = areaFilter === "All" ? null : new Set(registry.filter((r) => r.area === areaFilter).map((r) => r.code));
  const assetClasses = ["All Classes", ...Array.from(new Set(registry.map((r) => r.assetClass).filter(Boolean))).sort()];

  const byEquip = useMemo(() => {
    const map = {};
    samples.forEach((sm) => {
      if (!sm.unitId) return;
      (map[sm.unitId] ||= []).push(sm);
    });
    return map;
  }, [samples]);

  const filteredRegistry = registry.filter((r) => {
    const classOk = assetClass === "All Classes" || r.assetClass === assetClass;
    const codeOk = !equipCode || equipCode === "All" || r.code === equipCode;
    const areaOk = !areaCodes || areaCodes.has(r.code);
    return classOk && codeOk && areaOk;
  });

  function latestFor(code) {
    const list = byEquip[code] || [];
    return list.length ? [...list].sort((a, b) => new Date(b.sampledDate || 0) - new Date(a.sampledDate || 0))[0] : null;
  }

  const tabBtn = (active) => ({
    padding: "8px 20px",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: active ? 700 : 400,
    color: active ? T.accent : T.textSecondary,
    borderBottom: active ? `2px solid ${T.accent}` : "2px solid transparent",
    background: "transparent",
    border: "none",
    outline: "none",
  });

  return (
    <div>
      <div style={{ display: "flex", borderBottom: `1px solid ${T.border}`, marginBottom: 16 }}>
        <button style={tabBtn(tab === "registry")} onClick={() => setTab("registry")}>
          <i className="ti ti-database" aria-hidden="true" style={{ marginRight: 6 }} />
          Equipment Registry ({registry.length})
        </button>
        <button style={tabBtn(tab === "samples")} onClick={() => setTab("samples")}>
          <i className="ti ti-flask" aria-hidden="true" style={{ marginRight: 6 }} />
          Sample History ({Object.keys(byEquip).length})
        </button>
      </div>

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

      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <span style={{ fontSize: 10, color: T.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.6 }}>
            Equipment
          </span>
          <EquipmentSearch
            options={registry}
            value={equipCode || "All"}
            onChange={(v) => setEquipCode(v === "All" ? "" : v)}
            allowAll
            width={220}
            placeholder="All Equipment"
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <span style={{ fontSize: 10, color: T.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.6 }}>
            Asset Class
          </span>
          <select style={{ ...s.select, minWidth: 160, fontSize: 12 }} value={assetClass} onChange={(e) => setAssetClass(e.target.value)}>
            {assetClasses.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        {(equipCode || assetClass !== "All Classes") && (
          <button
            style={{ ...s.btn, fontSize: 12, color: T.danger, borderColor: T.danger }}
            onClick={() => {
              setEquipCode("");
              setAssetClass("All Classes");
            }}
          >
            <i className="ti ti-x" aria-hidden="true" /> Clear
          </button>
        )}
        <span style={{ fontSize: 12, color: T.textMuted, marginLeft: "auto" }}>
          {filteredRegistry.length} of {registry.length} equipment
        </span>
      </div>

      {tab === "registry" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filteredRegistry.map((r) => {
            const latest = latestFor(r.code);
            const count = (byEquip[r.code] || []).length;
            const hasAlert = (byEquip[r.code] || []).some((v) => v.reportStatus === "Alert");
            const isOpen = expanded === r.code;
            const color = statusColor(T, latest == null ? void 0 : latest.reportStatus);
            return (
              <div
                key={r.code}
                style={{ ...s.card, padding: 0, overflow: "hidden", border: `1px solid ${hasAlert ? T.danger + "66" : T.border}` }}
              >
                <div
                  style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer", flexWrap: "wrap" }}
                  onClick={() => setExpanded(isOpen ? null : r.code)}
                >
                  <i
                    className={`ti ti-chevron-${isOpen ? "down" : "right"}`}
                    style={{ fontSize: 13, color: T.textSecondary }}
                    aria-hidden="true"
                  />
                  <div style={{ minWidth: 130, flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {hasAlert && (
                        <span
                          style={{
                            width: 7,
                            height: 7,
                            borderRadius: "50%",
                            background: T.danger,
                            flexShrink: 0,
                            animation: "pulse 1.2s ease-in-out infinite",
                          }}
                        />
                      )}
                      <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 13, color: T.accent }}>{r.code}</span>
                      <span style={{ fontSize: 11, background: T.cardSubBg, color: T.textSecondary, borderRadius: 4, padding: "1px 7px" }}>
                        {r.assetClass}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: T.textSecondary,
                        marginTop: 2,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        maxWidth: 280,
                      }}
                    >
                      {r.description}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginLeft: "auto" }}>
                    <span style={{ fontSize: 11, color: T.textMuted }}>{r.lubricant}</span>
                    <span style={{ fontSize: 11, color: T.textMuted }}>every {r.interval}</span>
                    {latest ? (
                      <span style={s.badge(latest.reportStatus)}>{latest.reportStatus}</span>
                    ) : (
                      <span style={{ background: T.cardSubBg, color: T.textMuted, borderRadius: 4, padding: "2px 8px", fontSize: 11 }}>
                        No samples
                      </span>
                    )}
                    {count > 0 && (
                      <span style={{ fontSize: 11, color: T.textMuted }}>
                        {count} sample{count !== 1 ? "s" : ""}
                      </span>
                    )}
                    {onOpenReport && (
                      <button
                        style={{ ...s.btnPrimary, padding: "4px 10px", fontSize: 11, flexShrink: 0 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenReport(r.code);
                        }}
                      >
                        <i className="ti ti-chart-line" aria-hidden="true" /> Report
                      </button>
                    )}
                  </div>
                </div>
                {isOpen && (
                  <div style={{ borderTop: `1px solid ${T.border}`, background: T.cardSubBg }}>
                    <div
                      style={{ padding: "10px 16px", display: "flex", gap: 10, flexWrap: "wrap", borderBottom: `1px solid ${T.border}` }}
                    >
                      {[
                        ["Asset ID", r.assetId],
                        ["Manufacturer", r.manufacturer],
                        ["Model", r.model],
                        ["Lubricant", r.lubricant],
                        ["Interval", r.interval],
                        ["Asset Class", r.assetClass],
                      ].map(([label, value]) =>
                        value ? (
                          <div
                            key={label}
                            style={{ background: T.cardBg, border: `1px solid ${T.border}`, borderRadius: 6, padding: "4px 10px" }}
                          >
                            <div style={{ fontSize: 9, color: T.textMuted, marginBottom: 1 }}>{label}</div>
                            <div style={{ fontSize: 12, color: T.textPrimary }}>{value}</div>
                          </div>
                        ) : null
                      )}
                    </div>
                    {count === 0 ? (
                      <div style={{ padding: "20px 16px", textAlign: "center", color: T.textMuted, fontSize: 13 }}>
                        No samples recorded for this equipment.
                      </div>
                    ) : (
                      <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
                        <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 700, color: T.textPrimary }}>
                          <i className="ti ti-flask" aria-hidden="true" style={{ marginRight: 6 }} />
                          {count} Sample{count !== 1 ? "s" : ""}
                        </p>
                        {[...byEquip[r.code]]
                          .sort((a, b) => new Date(b.sampledDate || 0) - new Date(a.sampledDate || 0))
                          .map((v, i) => {
                            const c = statusColor(T, v.reportStatus);
                            return (
                              <div
                                key={v._id || i}
                                style={{ background: T.cardBg, border: `1px solid ${T.border}`, borderRadius: 8, padding: "10px 12px" }}
                              >
                                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                                  <span style={{ fontWeight: 600, fontSize: 12, color: T.textPrimary, whiteSpace: "nowrap" }}>
                                    {formatDate(v.sampledDate)}
                                  </span>
                                  <span
                                    style={{
                                      background: c + "22",
                                      color: c,
                                      borderRadius: 4,
                                      padding: "2px 8px",
                                      fontSize: 11,
                                      fontWeight: 700,
                                    }}
                                  >
                                    {v.reportStatus || "—"}
                                  </span>
                                  {v.equipmentRating && <span style={s.badge(v.equipmentRating)}>{v.equipmentRating}</span>}
                                  {v.lubricantRating && <span style={s.badge(v.lubricantRating)}>{v.lubricantRating}</span>}
                                  {v.contaminationRating && <span style={s.badge(v.contaminationRating)}>{v.contaminationRating}</span>}
                                  <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                                    {onSelectSample && (
                                      <button
                                        style={{ ...s.btnPrimary, padding: "3px 8px", fontSize: 11 }}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onSelectSample(v);
                                        }}
                                      >
                                        <i className="ti ti-file-analytics" aria-hidden="true" /> Report
                                      </button>
                                    )}
                                    {onEditSample && (
                                      <button
                                        style={{ ...s.btn, padding: "3px 8px", fontSize: 11 }}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setEditing(v);
                                        }}
                                      >
                                        <i className="ti ti-edit" aria-hidden="true" />
                                      </button>
                                    )}
                                    {onDeleteSample && (
                                      <button
                                        style={{ ...s.btn, padding: "3px 8px", fontSize: 11, color: T.danger, borderColor: T.danger }}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          window.confirm("Delete this sample?") && onDeleteSample(v);
                                        }}
                                      >
                                        <i className="ti ti-trash" aria-hidden="true" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                                <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                                  {[
                                    ["Visc@40°C", v.visc40C],
                                    ["TAN", v.tan],
                                    ["Water", v.water],
                                    ["PQ", v.pqIndex],
                                    ["Sample ID", v.sampleId],
                                  ].map(([label, value]) =>
                                    value ? (
                                      <div key={label}>
                                        <span style={{ fontSize: 10, color: T.textMuted }}>{label}: </span>
                                        <span style={{ fontSize: 11, color: T.textSecondary, fontFamily: "monospace" }}>{value}</span>
                                      </div>
                                    ) : null
                                  )}
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {tab === "samples" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {Object.entries(byEquip)
            .filter(([code]) => !equipCode || equipCode === "All" || code === equipCode)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([code, list]) => {
              const reg = registry.find((r) => r.code === code);
              const sorted = [...list].sort((a, b) => new Date(b.sampledDate || 0) - new Date(a.sampledDate || 0));
              const latest = sorted[0];
              const color = statusColor(T, latest == null ? void 0 : latest.reportStatus);
              const key = code + "_s";
              const isOpen = expanded === key;
              return (
                <div key={code} style={{ ...s.card, padding: 0, overflow: "hidden" }}>
                  <div
                    style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer", flexWrap: "wrap" }}
                    onClick={() => setExpanded(isOpen ? null : key)}
                  >
                    <i
                      className={`ti ti-chevron-${isOpen ? "down" : "right"}`}
                      style={{ fontSize: 13, color: T.textSecondary }}
                      aria-hidden="true"
                    />
                    <div style={{ flex: 1, minWidth: 130 }}>
                      <div style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 13, color: T.accent }}>{code}</div>
                      <div style={{ fontSize: 11, color: T.textSecondary }}>
                        {(reg == null ? void 0 : reg.description) || ""} · {list.length} sample{list.length !== 1 ? "s" : ""}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" }}>
                      <span style={{ fontSize: 11, color: T.textMuted }}>
                        Latest: {formatDate(latest == null ? void 0 : latest.sampledDate)}
                      </span>
                      <span style={{ background: color + "22", color, borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>
                        {(latest == null ? void 0 : latest.reportStatus) || "—"}
                      </span>
                    </div>
                  </div>
                  {isOpen && (
                    <div
                      style={{
                        borderTop: `1px solid ${T.border}`,
                        background: T.cardSubBg,
                        padding: "12px 16px",
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                      }}
                    >
                      {sorted.map((v, i) => {
                        const c = statusColor(T, v.reportStatus);
                        return (
                          <div
                            key={v._id || i}
                            style={{ background: T.cardBg, border: `1px solid ${T.border}`, borderRadius: 8, padding: "10px 12px" }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                              <span style={{ fontWeight: 600, fontSize: 12 }}>{formatDate(v.sampledDate)}</span>
                              <span
                                style={{
                                  background: c + "22",
                                  color: c,
                                  borderRadius: 4,
                                  padding: "2px 8px",
                                  fontSize: 11,
                                  fontWeight: 700,
                                }}
                              >
                                {v.reportStatus || "—"}
                              </span>
                              {v.equipmentRating && <span style={s.badge(v.equipmentRating)}>{v.equipmentRating}</span>}
                              {v.lubricantRating && <span style={s.badge(v.lubricantRating)}>{v.lubricantRating}</span>}
                              <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                                {onSelectSample && (
                                  <button
                                    style={{ ...s.btnPrimary, padding: "3px 8px", fontSize: 11 }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onSelectSample(v);
                                    }}
                                  >
                                    <i className="ti ti-file-analytics" aria-hidden="true" /> Report
                                  </button>
                                )}
                                {onEditSample && (
                                  <button
                                    style={{ ...s.btn, padding: "3px 8px", fontSize: 11 }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditing(v);
                                    }}
                                  >
                                    <i className="ti ti-edit" aria-hidden="true" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      )}

      {editing && (
        <EditSampleModal
          sample={editing}
          onClose={() => setEditing(null)}
          onSave={(updated) => {
            onEditSample(editing, updated);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}
