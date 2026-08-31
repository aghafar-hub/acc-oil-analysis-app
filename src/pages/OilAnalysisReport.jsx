import { s, T } from "../theme";
import { formatDate } from "../parsers";
import LastActionsPanel from "../components/LastActionsPanel";

function Stat({ label, value }) {
  return (
    <div style={{ background: T.appBg, borderRadius: 6, padding: "10px 14px" }}>
      <div style={{ fontSize: 11, color: T.textSecondary }}>{label}</div>
      <div style={{ fontSize: 13, color: T.textHighlight, marginTop: 2, fontWeight: 500 }}>{value || "—"}</div>
    </div>
  );
}

export default function OilAnalysisReport({ sample, actions, oilChanges, equipmentOptions, onAddAction, onUpdateAction, onDeleteAction }) {
  const lastChange = (oilChanges || [])
    .filter((o) => o.equipmentCode === sample.unitId && o.changeDate)
    .sort((a, b) => new Date(b.changeDate) - new Date(a.changeDate))[0];

  const wear = sample.wear || {};
  const additives = sample.additives || {};

  return (
    <div>
      <div
        style={{
          ...s.card,
          borderTop: `4px solid ${sample.reportStatus === "Alert" ? T.danger : sample.reportStatus === "Caution" ? T.warning : T.success}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {sample.reportStatus === "Alert" && <span style={s.alertPulse} />}
              <span style={{ fontSize: 20, fontWeight: 700 }}>{sample.unitId}</span>
              <span style={s.badge(sample.reportStatus)}>{sample.reportStatus}</span>
            </div>
            <div style={{ fontSize: 13, color: T.textSecondary, marginTop: 4 }}>{sample.description}</div>
          </div>
          <div style={{ textAlign: "right", fontSize: 12, color: T.textSecondary }}>
            <div>Sample ID: {sample.sampleId}</div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 20 }}>
          <Stat label="Sampled" value={formatDate(sample.sampledDate)} />
          <Stat label="Reported" value={formatDate(sample.reportedDate)} />
          <Stat label="Visc @40°C (cSt)" value={sample.visc40C} />
          <Stat label="Water (%)" value={sample.water} />
          <Stat label="Contamination Rating" value={sample.contaminationRating} />
          <Stat label="Equipment Rating" value={sample.equipmentRating} />
        </div>

        <div
          style={{
            background: lastChange ? T.appBg : T.infoBarBg,
            border: `1px solid ${lastChange ? T.successBg : T.dangerBg}`,
            borderRadius: 8,
            padding: "10px 16px",
            marginBottom: 20,
            display: "flex",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={{ fontSize: 11, color: T.textSecondary }}>Last Oil Change</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: lastChange ? T.success : T.danger }}>
              {lastChange ? lastChange.changeDate : "No record found"}
            </div>
          </div>
          {lastChange && (
            <>
              <div>
                <div style={{ fontSize: 11, color: T.textSecondary }}>Oil Type / Brand</div>
                <div style={{ fontSize: 13, color: T.textHighlight }}>
                  {lastChange.oilType || "—"} {lastChange.brand ? `/ ${lastChange.brand}` : ""}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: T.textSecondary }}>Next Due</div>
                <div style={{ fontSize: 13, color: T.textHighlight }}>{formatDate(lastChange.nextDueDate)}</div>
              </div>
            </>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: T.accent, marginBottom: 12 }}>Wear Metals (ppm)</p>
            {Object.entries(wear).map(([k, v]) => (
              <div
                key={k}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "4px 0",
                  borderBottom: `1px solid ${T.border}`,
                  fontSize: 12,
                }}
              >
                <span style={{ color: T.textSecondary }}>{k}</span>
                <span style={{ fontFamily: "monospace" }}>{v || "—"}</span>
              </div>
            ))}
          </div>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: T.accent, marginBottom: 12 }}>Additives (ppm)</p>
            {Object.entries(additives).map(([k, v]) => (
              <div
                key={k}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "4px 0",
                  borderBottom: `1px solid ${T.border}`,
                  fontSize: 12,
                }}
              >
                <span style={{ color: T.textSecondary }}>{k}</span>
                <span style={{ fontFamily: "monospace" }}>{v || "—"}</span>
              </div>
            ))}
          </div>
        </div>

        {sample.recommendations?.length > 0 && (
          <div style={{ background: T.dangerBg, border: `1px solid ${T.danger}`, borderRadius: 8, padding: 16, marginBottom: 16 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: T.danger, margin: "0 0 10px" }}>
              <i className="ti ti-alert-triangle" aria-hidden="true" /> Recommendations
            </p>
            {sample.recommendations.map((r, i) => (
              <div key={i} style={{ fontSize: 13, color: T.warning, marginBottom: 8, lineHeight: 1.6 }}>
                • {r}
              </div>
            ))}
          </div>
        )}

        <p style={{ fontSize: 11, color: T.textMuted, textAlign: "center", marginTop: 8 }}>
          Results and comments of this analysis are advisory only. The validity of the data may be impaired by a non-representative sample
          or incorrect data.
        </p>
      </div>

      <LastActionsPanel
        equipmentCode={sample.unitId}
        actions={actions}
        onAdd={onAddAction}
        onUpdate={onUpdateAction}
        onDelete={onDeleteAction}
        title="Last 5 Actions"
        limit={5}
        equipmentOptions={equipmentOptions}
      />
    </div>
  );
}
