import { useState } from "react";
import { s, T } from "../theme";

export default function Settings({ config, onSave, onSync, syncState, syncMsg }) {
  const [webhookUrl, setWebhookUrl] = useState(config.webhookUrl || "");

  return (
    <div style={{ maxWidth: 640 }}>
      <h1 style={{ fontSize: 20, marginBottom: 20 }}>Settings</h1>
      <div style={s.card}>
        <label style={s.label}>Apps Script Web App URL</label>
        <input
          style={s.input}
          placeholder="https://script.google.com/macros/s/XXXX/exec"
          value={webhookUrl}
          onChange={(e) => setWebhookUrl(e.target.value)}
        />
        <p style={{ fontSize: 12, color: T.textSecondary, marginTop: 8 }}>
          Deploy your Apps Script as a Web App (Execute as: Me, Who has access: Anyone), then paste
          the <code>/exec</code> URL here. This is stored only in your browser (localStorage) — it
          is never committed to the repository.
        </p>
        <button style={{ ...s.btnPrimary, marginTop: 12 }} onClick={() => onSave({ webhookUrl })}>
          Save
        </button>
      </div>

      <div style={s.card}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontWeight: 600 }}>Sync status</div>
            <div style={{ fontSize: 12, color: T.textSecondary, marginTop: 4 }}>{syncMsg || "Not synced yet"}</div>
          </div>
          <button style={s.btn} onClick={onSync} disabled={syncState === "loading"}>
            <i className="ti ti-refresh" aria-hidden="true" /> {syncState === "loading" ? "Syncing…" : "Sync now"}
          </button>
        </div>
      </div>
    </div>
  );
}
