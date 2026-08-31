import { T } from "../theme";

const NAV = [
  { key: "dashboard", label: "Dashboard", icon: "ti-layout-grid-add", badgeKey: "pendingActions404" },
  { key: "equipment", label: "Equipment", icon: "ti-settings-automation" },
  { key: "report", label: "Oil Analysis Report", icon: "ti-file-text" },
  { key: "upload", label: "Add Sample", icon: "ti-plus" },
  { key: "actions", label: "Action Tracker", icon: "ti-clipboard-check", badgeKey: "openActions" },
  { key: "oilchange", label: "Oil Change Log", icon: null },
  { key: "tracker", label: "Sample Tracker", icon: "ti-chart-line" },
  { key: "howto", label: "How to Use", icon: "ti-help-circle" },
  { key: "settings", label: "Settings", icon: "ti-settings" },
];

export default function Sidebar({ page, onNavigate, openActionsCount, syncState, syncMsg, cacheInfo, onFullSync }) {
  return (
    <div style={{ width: 260, background: T.sidebarBg, borderRight: `1px solid ${T.border}`, display: "flex", flexDirection: "column", height: "100vh", position: "sticky", top: 0 }}>
      <div style={{ padding: "20px 20px 8px" }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: T.textPrimary }}>ARABIAN CEMENT</div>
        <div style={{ fontSize: 11, color: T.textSecondary, letterSpacing: 1, marginTop: 2 }}>OIL ANALYSIS MANAGEMENT</div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "8px 12px" }}>
        {NAV.map((item) => {
          const active = page === item.key;
          return (
            <div
              key={item.key}
              onClick={() => onNavigate(item.key)}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "10px 12px", borderRadius: 6, cursor: "pointer", marginBottom: 2,
                background: active ? T.cardSubBg : "transparent",
                borderLeft: active ? `3px solid ${T.accent}` : "3px solid transparent",
                color: active ? T.accent : T.textSecondary, fontSize: 14,
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {item.icon && <i className={`ti ${item.icon}`} aria-hidden="true" />}
                {item.label}
              </span>
              {item.key === "actions" && openActionsCount > 0 && (
                <span style={{ background: T.dangerBg, color: T.danger, borderRadius: 10, fontSize: 11, fontWeight: 700, padding: "1px 7px" }}>
                  {openActionsCount}
                </span>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ padding: 14, borderTop: `1px solid ${T.border}`, fontSize: 11, color: T.textSecondary }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: syncState === "error" ? T.danger : T.success, display: "inline-block" }} />
          {syncMsg || "Not synced yet"}
        </div>
        {cacheInfo?.hasCache && <div>Cached data · {Math.round(cacheInfo.ageMinutes)}m old</div>}
        <button onClick={onFullSync} style={{ marginTop: 10, width: "100%", background: T.accent, border: "none", color: "#fff", borderRadius: 6, padding: "8px 0", fontSize: 13, cursor: "pointer" }}>
          <i className="ti ti-refresh" aria-hidden="true" /> Full Sync
        </button>
      </div>
    </div>
  );
}
