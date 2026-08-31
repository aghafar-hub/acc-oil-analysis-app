import { useState } from "react";
import { s, T } from "../theme";
import { RATING_OPTIONS } from "../theme";

const EMPTY = {
  unitId: "",
  description: "",
  sampleId: "",
  sampledDate: "",
  reportStatus: "Normal",
  contaminationRating: "Normal",
  equipmentRating: "Normal",
  lubricantRating: "Normal",
  visc40C: "",
  tan: "",
  oxidation: "",
  water: "",
  wear: { Ag: "", Al: "", Cr: "", Cu: "", Fe: "", Mo: "", Ni: "", Pb: "", Sn: "" },
};

export default function AddSample({ equipmentOptions, onAdd }) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }
  function setWear(metal, value) {
    setForm((f) => ({ ...f, wear: { ...f.wear, [metal]: value } }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.unitId || !form.sampleId || !form.sampledDate) return;
    setSaving(true);
    try {
      await onAdd(form);
      setForm(EMPTY);
    } catch {
      // toast already shown by App
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ maxWidth: 720 }}>
      <h1 style={{ fontSize: 20, marginBottom: 20 }}>Add Sample</h1>
      <form onSubmit={handleSubmit} style={s.card}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12, marginBottom: 16 }}>
          <div>
            <label style={s.label}>Equipment Code *</label>
            <input list="equip-list" style={s.input} value={form.unitId} onChange={(e) => set("unitId", e.target.value)} required />
            <datalist id="equip-list">
              {(equipmentOptions || []).map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
          <div>
            <label style={s.label}>Description</label>
            <input style={s.input} value={form.description} onChange={(e) => set("description", e.target.value)} />
          </div>
          <div>
            <label style={s.label}>Sample ID *</label>
            <input style={s.input} value={form.sampleId} onChange={(e) => set("sampleId", e.target.value)} required />
          </div>
          <div>
            <label style={s.label}>Sampled Date *</label>
            <input style={s.input} type="date" value={form.sampledDate} onChange={(e) => set("sampledDate", e.target.value)} required />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12, marginBottom: 16 }}>
          {["reportStatus", "contaminationRating", "equipmentRating", "lubricantRating"].map((key) => (
            <div key={key}>
              <label style={s.label}>{key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase())}</label>
              <select style={{ ...s.input, cursor: "pointer" }} value={form[key]} onChange={(e) => set(key, e.target.value)}>
                {RATING_OPTIONS.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </div>
          ))}
        </div>

        <p style={{ fontSize: 12, fontWeight: 700, color: T.accent, marginBottom: 10 }}>Lubricant Properties</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 12, marginBottom: 16 }}>
          {[
            ["visc40C", "Visc@40°C (cSt)"],
            ["tan", "TAN (mg KOH/g)"],
            ["oxidation", "Oxidation (Ab/cm)"],
            ["water", "Water (Vol%)"],
          ].map(([key, label]) => (
            <div key={key}>
              <label style={s.label}>{label}</label>
              <input style={s.input} type="number" step="any" value={form[key]} onChange={(e) => set(key, e.target.value)} />
            </div>
          ))}
        </div>

        <p style={{ fontSize: 12, fontWeight: 700, color: T.accent, marginBottom: 10 }}>Wear Metals (ppm)</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(90px,1fr))", gap: 10, marginBottom: 20 }}>
          {Object.keys(EMPTY.wear).map((metal) => (
            <div key={metal}>
              <label style={s.label}>{metal}</label>
              <input style={s.input} type="number" step="any" value={form.wear[metal]} onChange={(e) => setWear(metal, e.target.value)} />
            </div>
          ))}
        </div>

        <button type="submit" style={s.btnPrimary} disabled={saving}>
          {saving ? "Saving…" : "Save Sample"}
        </button>
      </form>
    </div>
  );
}
