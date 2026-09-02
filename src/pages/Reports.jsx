import { useMemo, useState } from "react";
import { useTheme } from "../ThemeContext";
import { generateContractorActionReport, generateOilChangeContractorReport } from "../reportGenerators";

const FOCUS_STATUSES = ["Open", "In Progress", "Waiting Stoppage"];
// Must match the "All" sentinel the report generators default to.
const ALL = "All";

// Two well-designed, downloadable PDF reports built straight from the data
// already loaded in the app — no server round trip. Each card lets you
// scope the report to one contractor (or all of them) and shows a live
// preview of what will be in the PDF before it's generated.
export default function Reports({ actions, oilChanges, equipmentRegistry }) {
  const { T, s } = useTheme();
  const [generating, setGenerating] = useState(null); // "action" | "oilchange" | null
  const [actionContractor, setActionContractor] = useState(ALL);
  const [oilChangeContractor, setOilChangeContractor] = useState(ALL);

  const registryByCode = useMemo(() => {
    const map = {};
    (equipmentRegistry || []).forEach((r) => (map[r.code] = r));
    return map;
  }, [equipmentRegistry]);

  const contractorList = useMemo(
    () => [ALL, ...Array.from(new Set((equipmentRegistry || []).map((r) => r.contractor).filter(Boolean))).sort()],
    [equipmentRegistry]
  );

  const actionPreview = useMemo(() => {
    let unresolved = (actions || []).filter((a) => FOCUS_STATUSES.includes(a.status));
    const contractorOf = (a) => a.contractor || registryByCode[a.equipmentCode]?.contractor || "Unassigned";
    if (actionContractor !== ALL) unresolved = unresolved.filter((a) => contractorOf(a) === actionContractor);
    const contractors = new Set(unresolved.map(contractorOf));
    return {
      unresolved: unresolved.length,
      waiting: unresolved.filter((a) => a.status === "Waiting Stoppage").length,
      contractors: contractors.size,
    };
  }, [actions, registryByCode, actionContractor]);

  const oilChangePreview = useMemo(() => {
    const codes =
      oilChangeContractor === ALL
        ? null
        : new Set((equipmentRegistry || []).filter((r) => r.contractor === oilChangeContractor).map((r) => r.code));
    const points = codes ? (oilChanges || []).filter((o) => codes.has(o.equipmentCode)) : oilChanges || [];
    const contractors =
      oilChangeContractor === ALL
        ? new Set((equipmentRegistry || []).map((r) => r.contractor).filter(Boolean))
        : new Set([oilChangeContractor]);
    return {
      contractors: contractors.size,
      overdue: points.filter((o) => o.status === "Overdue").length,
      totalPoints: points.length,
    };
  }, [oilChanges, equipmentRegistry, oilChangeContractor]);

  async function handleGenerate(kind) {
    setGenerating(kind);
    try {
      if (kind === "action") await generateContractorActionReport({ actions, equipmentRegistry, contractor: actionContractor });
      else await generateOilChangeContractorReport({ oilChanges, equipmentRegistry, actions, contractor: oilChangeContractor });
    } finally {
      setGenerating(null);
    }
  }

  const cardStyle = { ...s.card, display: "flex", flexDirection: "column", gap: 14, marginBottom: 0 };
  const statBox = (value, label, color) => (
    <div
      key={label}
      style={{ flex: 1, minWidth: 90, background: T.cardSubBg, border: `1px solid ${T.border2}`, borderRadius: 8, padding: "10px 12px" }}
    >
      <div style={{ fontSize: 20, fontWeight: 800, color: color || T.textPrimary }}>{value}</div>
      <div style={{ fontSize: 10, color: T.textSecondary, marginTop: 2 }}>{label}</div>
    </div>
  );
  const contractorPicker = (selected, onSelect) => (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {contractorList.map((c) => (
        <button
          key={c}
          onClick={() => onSelect(c)}
          style={{
            ...s.btn,
            fontSize: 11.5,
            padding: "5px 11px",
            background: selected === c ? T.accent : "transparent",
            color: selected === c ? T.accentText : T.textSecondary,
            borderColor: selected === c ? T.accent : T.border,
          }}
        >
          {c === ALL ? "All Contractors" : c}
        </button>
      ))}
    </div>
  );

  return (
    <div>
      <p style={{ ...s.sectionTitle, margin: "0 0 6px" }}>Reports</p>
      <p style={{ fontSize: 13, color: T.textSecondary, margin: "0 0 20px" }}>
        Generate a clean, printable PDF straight from current data — nothing is saved or sent anywhere. Choose one contractor or all of them
        before generating.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(340px,1fr))", gap: 16 }}>
        <div style={cardStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: T.danger + "22",
                color: T.danger,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <i className="ti ti-clipboard-list" style={{ fontSize: 19 }} aria-hidden="true" />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: T.textPrimary }}>Contractor Action Status</div>
              <div style={{ fontSize: 11.5, color: T.textSecondary }}>Open · In Progress · Waiting Stoppage</div>
            </div>
          </div>

          <div>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: T.textMuted, textTransform: "uppercase", marginBottom: 6 }}>
              Contractor
            </div>
            {contractorPicker(actionContractor, setActionContractor)}
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {statBox(actionPreview.unresolved, "Unresolved", T.danger)}
            {statBox(actionPreview.waiting, "Waiting Stoppage", T.accent)}
            {actionContractor === ALL && statBox(actionPreview.contractors, "Contractors")}
          </div>

          <button
            style={{ ...s.btnPrimary, alignSelf: "flex-start" }}
            onClick={() => handleGenerate("action")}
            disabled={generating === "action"}
          >
            <i className={`ti ${generating === "action" ? "ti-loader" : "ti-download"}`} aria-hidden="true" />{" "}
            {generating === "action" ? "Generating…" : "Download PDF"}
          </button>
        </div>

        <div style={cardStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: T.warning + "22",
                color: T.warning,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <i className="ti ti-droplet" style={{ fontSize: 19 }} aria-hidden="true" />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: T.textPrimary }}>Oil Change Contractor Performance</div>
              <div style={{ fontSize: 11.5, color: T.textSecondary }}>On-time % and closure rate, plus overdue equipment</div>
            </div>
          </div>

          <div>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: T.textMuted, textTransform: "uppercase", marginBottom: 6 }}>
              Contractor
            </div>
            {contractorPicker(oilChangeContractor, setOilChangeContractor)}
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {statBox(oilChangePreview.overdue, "Overdue Points", T.danger)}
            {statBox(oilChangePreview.totalPoints, "Total Points")}
            {oilChangeContractor === ALL && statBox(oilChangePreview.contractors, "Contractors")}
          </div>

          <button
            style={{ ...s.btnPrimary, alignSelf: "flex-start" }}
            onClick={() => handleGenerate("oilchange")}
            disabled={generating === "oilchange"}
          >
            <i className={`ti ${generating === "oilchange" ? "ti-loader" : "ti-download"}`} aria-hidden="true" />{" "}
            {generating === "oilchange" ? "Generating…" : "Download PDF"}
          </button>
        </div>
      </div>
    </div>
  );
}
