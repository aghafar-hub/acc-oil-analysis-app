// Visual theme + shared style helpers, matching the original app's Navy Dark look.

export const T = {
  appBg: "#0B1622",
  cardBg: "#13212F",
  cardSubBg: "#0F1B27",
  sidebarBg: "#0B1622",
  border: "#1A2E45",
  textPrimary: "#E7EDF3",
  textSecondary: "#8CA0B3",
  textMuted: "#5B6C7C",
  textHighlight: "#C9D6E3",
  accent: "#3E9DFF",
  success: "#2ECC71",
  successBg: "#1D3B2A",
  warning: "#F5A524",
  warningBg: "#3B2E14",
  danger: "#E63946",
  dangerBg: "#3B1A1E",
  infoBarBg: "#1A2230",
};

export const s = {
  card: {
    background: T.cardBg,
    border: `1px solid ${T.border}`,
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
  },
  btn: {
    background: T.cardSubBg,
    border: `1px solid ${T.border}`,
    color: T.textPrimary,
    borderRadius: 6,
    padding: "8px 14px",
    fontSize: 13,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
  },
  btnPrimary: {
    background: T.accent,
    border: "none",
    color: "#fff",
    borderRadius: 6,
    padding: "8px 14px",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
  },
  input: {
    width: "100%",
    background: T.cardSubBg,
    border: `1px solid ${T.border}`,
    color: T.textPrimary,
    borderRadius: 6,
    padding: "8px 10px",
    boxSizing: "border-box",
  },
  label: {
    display: "block",
    color: T.textSecondary,
    marginBottom: 4,
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  th: {
    textAlign: "left",
    padding: "8px 10px",
    borderBottom: `1px solid ${T.border}`,
    color: T.textSecondary,
    fontWeight: 600,
  },
  td: {
    padding: "8px 10px",
    borderBottom: `1px solid ${T.border}`,
    color: T.textPrimary,
  },
  alertPulse: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: T.danger,
    display: "inline-block",
    animation: "pulse 1.5s ease-in-out infinite",
  },
  badge(value) {
    const map = {
      Alert: T.danger,
      ALERT: T.danger,
      Caution: T.warning,
      CAUTION: T.warning,
      Normal: T.success,
      NORMAL: T.success,
      Satisfactory: T.success,
      SATISFACTORY: T.success,
      Unsatisfactory: T.danger,
      UNSATISFACTORY: T.danger,
    };
    const color = map[value] || T.textSecondary;
    return {
      background: color + "22",
      color,
      borderRadius: 4,
      padding: "2px 8px",
      fontSize: 11,
      fontWeight: 700,
      display: "inline-block",
    };
  },
};

export const RATING_OPTIONS = ["Normal", "Caution", "Alert"];
