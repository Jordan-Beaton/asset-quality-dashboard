import type { CSSProperties } from "react";

export const imsColours = {
  brand: "#005670",
  brandDark: "#005670",
  brandAccent: "#63B1BC",
  brandSoft: "#ECECE7",
  brandBorder: "#D0D0CE",
  ink: "#000000",
  muted: "#53565A",
  slate: "#53565A",
  page: "#ECECE7",
  panel: "#ffffff",
  panelAlt: "#ECECE7",
  border: "#D0D0CE",
  borderSoft: "#D0D0CE",
  danger: "#F93822",
  dangerBright: "#F93822",
  warning: "#FFAD00",
  success: "#005670",
  purple: "#53565A",
  blue: "#63B1BC",
} as const;

export const imsRadii = {
  hero: "24px",
  panel: "18px",
  card: "16px",
  control: "10px",
  pill: "999px",
} as const;

export const imsShadows = {
  hero: "0 24px 44px rgba(0, 86, 112, 0.18)",
  panel: "0 1px 3px rgba(15, 23, 42, 0.08)",
  card: "0 1px 3px rgba(15, 23, 42, 0.08)",
  lift: "0 14px 28px rgba(15, 23, 42, 0.075)",
} as const;

export const imsHeroStyle: CSSProperties = {
  width: "100%",
  marginBottom: "20px",
  padding: "0 28px",
  borderRadius: imsRadii.hero,
  background: `linear-gradient(135deg, ${imsColours.brand} 0%, ${imsColours.brand} 64%, ${imsColours.brandAccent} 160%)`,
  color: "#ffffff",
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  gap: "0",
  height: "76px",
  boxSizing: "border-box",
  overflow: "hidden",
  boxShadow: imsShadows.hero,
};

export const imsPanelStyle: CSSProperties = {
  background: imsColours.panel,
  borderRadius: imsRadii.panel,
  border: `1px solid ${imsColours.border}`,
  boxShadow: imsShadows.panel,
  padding: "16px",
  boxSizing: "border-box",
};

export const imsTopMetaRowStyle: CSSProperties = {
  minHeight: "48px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
  flexWrap: "wrap",
  marginBottom: "20px",
  padding: "8px 12px",
  borderRadius: "14px",
  background: "#ffffff",
  border: `1px solid ${imsColours.border}`,
  boxShadow: imsShadows.panel,
  boxSizing: "border-box",
};

export const imsBackLinkStyle: CSSProperties = {
  color: imsColours.brand,
  fontWeight: 700,
  textDecoration: "none",
  display: "inline-flex",
  alignItems: "center",
};

export const imsStatusBannerStyle: CSSProperties = {
  background: imsColours.page,
  color: imsColours.ink,
  padding: "8px 12px",
  borderRadius: "10px",
  boxShadow: "none",
};

export const imsTabListStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  flexWrap: "wrap",
  marginBottom: "20px",
};

export const imsTabButtonStyle: CSSProperties = {
  border: "none",
  background: "#eef7f8",
  color: imsColours.ink,
  borderRadius: imsRadii.control,
  padding: "10px 14px",
  fontWeight: 800,
  cursor: "pointer",
  minHeight: "44px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  lineHeight: 1.2,
  boxSizing: "border-box",
};

export const imsActiveTabButtonStyle: CSSProperties = {
  ...imsTabButtonStyle,
  borderColor: imsColours.brand,
  background: imsColours.brand,
  color: "#ffffff",
};

export const imsButtonBaseStyle: CSSProperties = {
  border: "none",
  borderRadius: imsRadii.control,
  padding: "11px 16px",
  fontWeight: 800,
  fontSize: "14px",
  cursor: "pointer",
  minHeight: "42px",
  lineHeight: 1,
  boxSizing: "border-box",
};


export const imsPrimaryButtonStyle: CSSProperties = {
  ...imsButtonBaseStyle,
  background: imsColours.brand,
  color: "#ffffff",
};

export const imsSecondaryButtonStyle: CSSProperties = {
  ...imsButtonBaseStyle,
  background: imsColours.brandSoft,
  color: imsColours.ink,
};

export const imsDangerButtonStyle: CSSProperties = {
  ...imsButtonBaseStyle,
  background: imsColours.danger,
  color: "#ffffff",
};

export const imsGhostButtonStyle: CSSProperties = {
  ...imsButtonBaseStyle,
  background: "#ffffff",
  color: imsColours.brandDark,
  border: `1px solid ${imsColours.brandBorder}`,
};

export const imsInputStyle: CSSProperties = {
  width: "100%",
  minHeight: "42px",
  borderRadius: imsRadii.control,
  border: `1px solid ${imsColours.border}`,
  padding: "10px 12px",
  fontSize: "14px",
  background: "#ffffff",
  color: imsColours.ink,
  boxSizing: "border-box",
};

export const imsTextareaStyle: CSSProperties = {
  ...imsInputStyle,
  minHeight: "96px",
  height: "auto",
  lineHeight: 1.45,
  resize: "vertical",
};

export const imsFieldStyle: CSSProperties = {
  display: "grid",
  gap: "6px",
  minWidth: 0,
  alignContent: "start",
};

export const imsLabelStyle: CSSProperties = {
  color: imsColours.muted,
  fontSize: "13px",
  fontWeight: 800,
  lineHeight: 1.4,
};

export const imsFormGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "12px",
  alignItems: "start",
};

export const imsFieldsetStyle: CSSProperties = {
  minWidth: 0,
  margin: 0,
  padding: "14px",
  border: `1px solid ${imsColours.border}`,
  borderRadius: "12px",
  background: imsColours.panel,
  boxSizing: "border-box",
};

export const imsFilterPanelStyle: CSSProperties = {
  display: "grid",
  gap: "12px",
  padding: "14px",
  borderRadius: "16px",
  border: `1px solid ${imsColours.border}`,
  background: imsColours.panelAlt,
  boxShadow: "0 1px 3px rgba(0, 86, 112, 0.06)",
  marginBottom: "14px",
};

export const imsFilterActionRowStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(260px, 1fr) auto",
  gap: "10px",
  alignItems: "center",
};

export const imsFilterGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "10px",
  alignItems: "end",
};

export const imsTableInfoRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-start",
  gap: "4px",
  flexWrap: "wrap",
  color: imsColours.slate,
  fontSize: "13px",
  fontWeight: 700,
  margin: "12px 0",
};

export const imsTableStyle: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  background: imsColours.panel,
  fontSize: "12px",
};

export const imsTableHeadStyle: CSSProperties = {
  textAlign: "left",
  padding: "9px 10px",
  background: imsColours.brand,
  color: "#ffffff",
  fontSize: "10px",
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  borderBottom: `1px solid ${imsColours.brand}`,
  whiteSpace: "nowrap",
};

export const imsTableCellStyle: CSSProperties = {
  padding: "10px",
  borderBottom: `1px solid ${imsColours.border}`,
  color: imsColours.ink,
  verticalAlign: "middle",
  fontSize: "12px",
  fontWeight: 400,
  lineHeight: 1.35,
  textAlign: "left",
};
