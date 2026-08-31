import { s, T } from "../theme";

export default function HowToUse() {
  return (
    <div style={{ maxWidth: 720 }}>
      <h1 style={{ fontSize: 20, marginBottom: 20 }}>How to Use</h1>
      <div style={s.card}>
        <h3 style={{ marginTop: 0 }}>1. Connect to your Google Sheet</h3>
        <p style={{ color: T.textSecondary, fontSize: 13, lineHeight: 1.6 }}>
          Go to <strong>Settings</strong>, paste your Apps Script Web App URL, and save. The app
          will sync samples, actions, and oil change records from your sheet.
        </p>
        <h3>2. Review equipment status</h3>
        <p style={{ color: T.textSecondary, fontSize: 13, lineHeight: 1.6 }}>
          The <strong>Dashboard</strong> and <strong>Equipment</strong> pages summarize the latest
          sample per piece of equipment. Click any row to open its full report.
        </p>
        <h3>3. Manage actions in one place</h3>
        <p style={{ color: T.textSecondary, fontSize: 13, lineHeight: 1.6 }}>
          Actions are shared data — editing an action from the Oil Analysis Report page or from
          the Action Tracker page updates the exact same record. Every save is verified against the
          sheet before the screen updates; if a save doesn't actually land, you'll see an error
          instead of a silent, misleading "success".
        </p>
        <h3>4. Add new samples</h3>
        <p style={{ color: T.textSecondary, fontSize: 13, lineHeight: 1.6 }}>
          Use <strong>Add Sample</strong> to append a new row to the Data_Entry sheet.
        </p>
      </div>
    </div>
  );
}
