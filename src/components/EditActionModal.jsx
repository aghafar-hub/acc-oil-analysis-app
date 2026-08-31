import { useState } from "react";
import { s, T } from "../theme";
import { nextAcNo } from "../parsers";

const STATUS_OPTIONS = ["Open", "In Progress", "Closed", "Waiting Stoppage"];

export default function EditActionModal({ action, isNew, allActions, equipmentOptions, onClose, onSave, onDelete, saving }) {
  const [form, setForm] = useState(() => ({ ...action }));

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleSave() {
    const acNo = isNew ? nextAcNo(allActions || []) : form.acNo;
    onSave({
      ...form,
      acNo,
      equipmentCode: form.equipmentCode || form.unitId,
      _matchCols: isNew ? undefined : form._matchCols || [0, 1],
      _matchValues: isNew ? undefined : form._matchValues || [form.acNo, form.equipmentCode || form.unitId],
    });
  }

  const field = (label, key, type = "text") => (
    <div>
      <label style={{ ...s.label, fontSize: 11 }}>{label}</label>
      <input style={{ ...s.input, fontSize: 13 }} type={type} value={form[key] || ""} onChange={(e) => set(key, e.target.value)} />
    </div>
  );

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: T.cardBg,
          border: `1px solid ${T.border}`,
          borderRadius: 12,
          width: "100%",
          maxWidth: 760,
          maxHeight: "92vh",
          overflowY: "auto",
          padding: 24,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: T.textPrimary }}>{isNew ? "New Action" : "Edit Action"}</p>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: T.textSecondary }}>
              Ac. No. <strong>{isNew ? nextAcNo(allActions || []) : form.acNo}</strong>
              {isNew && <span style={{ marginLeft: 6, color: T.textMuted }}>(auto-generated)</span>}
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {!isNew && onDelete && (
              <button
                style={{ ...s.btn, color: T.danger, borderColor: T.danger }}
                onClick={() => window.confirm("Delete this action from the sheet?") && onDelete()}
              >
                <i className="ti ti-trash" aria-hidden="true" /> Delete
              </button>
            )}
            <button style={{ ...s.btn, padding: "6px 10px" }} onClick={onClose}>
              <i className="ti ti-x" aria-hidden="true" />
            </button>
          </div>
        </div>

        <p style={{ fontSize: 12, fontWeight: 700, color: T.accent, margin: "0 0 10px" }}>Identification</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12, marginBottom: 18 }}>
          <div>
            <label style={{ ...s.label, fontSize: 11 }}>Equipment Code</label>
            <select
              style={{ ...s.input, fontSize: 13, cursor: "pointer" }}
              value={form.equipmentCode || form.unitId || ""}
              onChange={(e) => set("equipmentCode", e.target.value)}
            >
              <option value="">Select equipment…</option>
              {(equipmentOptions || []).map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </div>
          {field("Description", "description")}
          {field("Oil Type", "oilType")}
          {field("Revision Date", "revisionDate", "date")}
          {field("Sample Date", "sampleDate", "date")}
          {field("Sample Result", "sampleResult")}
        </div>

        <p style={{ fontSize: 12, fontWeight: 700, color: T.accent, margin: "0 0 10px" }}>Status &amp; Action</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12, marginBottom: 18 }}>
          <div>
            <label style={{ ...s.label, fontSize: 11 }}>Status</label>
            <select
              style={{ ...s.input, fontSize: 13, cursor: "pointer" }}
              value={form.status || "Open"}
              onChange={(e) => set("status", e.target.value)}
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </div>
          {field("Completed Date", "completedDate", "date")}
          {field("Contractor", "contractor")}
          {field("Contractor Action", "contractorAction")}
        </div>
        <div style={{ marginBottom: 18 }}>
          <label style={{ ...s.label, fontSize: 11 }}>Agreed Action</label>
          <textarea
            style={{ ...s.input, fontSize: 13, minHeight: 60, resize: "vertical" }}
            value={form.agreedAction || ""}
            onChange={(e) => set("agreedAction", e.target.value)}
          />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 22 }}>
          {field("Prev Month Agreed Action", "prevMonthAgreedAction")}
          {field("Acc Action", "accAction")}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button style={s.btn} onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button style={s.btnPrimary} onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
