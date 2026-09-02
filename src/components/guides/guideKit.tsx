import type { CSSProperties, ReactNode } from "react";
import { imsColours, imsPanelStyle } from "../imsTheme";

// Shared visual toolkit for all Process Guides (Document Control, NCR, MOC, AINM, ...).
// Keep this the single source of layout/typography/mock-UI styling so every guide
// stays visually identical; module-specific content lives in its own guide file.

export type GuideSectionDef = { key: string; label: string; group: string };

export type GuideDefinition = {
  id: string;
  navLabel: string;
  guideLabel: string;
  defaultSection: string;
  sections: GuideSectionDef[];
  sectionComponents: Record<string, () => ReactNode>;
};

// ── Layout ────────────────────────────────────────────────────────────────────

export const page: CSSProperties = { display: "grid", gap: 16 };

export const guideSwitchBar: CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap" as const,
};

export const guideSwitchBtn = (active: boolean): CSSProperties => ({
  background: active ? imsColours.brand : imsColours.panel,
  color: active ? "#ffffff" : imsColours.ink,
  border: `1px solid ${active ? imsColours.brand : imsColours.border}`,
  borderRadius: 10,
  padding: "10px 16px",
  fontSize: 13,
  fontWeight: 800,
  cursor: "pointer",
  minHeight: 42,
});

export const navBar: CSSProperties = {
  background: imsColours.panel,
  border: `1px solid ${imsColours.border}`,
  borderRadius: 14,
  padding: "10px 14px",
  display: "flex",
  gap: 6,
  flexWrap: "wrap" as const,
  alignItems: "center",
};

export const navGroup: CSSProperties = {
  fontSize: 9,
  fontWeight: 800,
  letterSpacing: "0.08em",
  textTransform: "uppercase" as const,
  color: imsColours.muted,
  marginRight: 4,
  marginLeft: 6,
  whiteSpace: "nowrap" as const,
};

export const navBtn = (active: boolean): CSSProperties => ({
  background: active ? imsColours.brand : imsColours.page,
  color: active ? "#ffffff" : imsColours.ink,
  border: "none",
  borderRadius: 8,
  padding: "6px 11px",
  fontSize: 11,
  fontWeight: 700,
  cursor: "pointer",
  whiteSpace: "nowrap" as const,
});

export const content: CSSProperties = {
  ...imsPanelStyle,
  padding: "28px 32px",
  minHeight: 400,
};

// ── Typography ────────────────────────────────────────────────────────────────

export const eyebrow: CSSProperties = {
  fontSize: 9,
  fontWeight: 800,
  letterSpacing: "0.1em",
  textTransform: "uppercase" as const,
  color: imsColours.brandAccent,
  marginBottom: 6,
};

export const h2Style: CSSProperties = {
  fontSize: 18,
  fontWeight: 700,
  color: imsColours.brand,
  marginBottom: 14,
  paddingBottom: 10,
  borderBottom: `2px solid ${imsColours.page}`,
};

export const h3Style: CSSProperties = {
  fontSize: 13,
  fontWeight: 800,
  color: imsColours.ink,
  margin: "20px 0 8px",
};

export const pStyle: CSSProperties = {
  fontSize: 13,
  lineHeight: 1.7,
  color: imsColours.ink,
  marginBottom: 10,
};

export const codeStyle: CSSProperties = {
  background: imsColours.page,
  border: `1px solid ${imsColours.border}`,
  borderRadius: 4,
  padding: "1px 6px",
  fontSize: 11,
  fontFamily: "monospace",
  color: imsColours.brand,
  fontWeight: 700,
};

// ── Steps ─────────────────────────────────────────────────────────────────────

export const stepList: CSSProperties = {
  display: "flex",
  flexDirection: "column" as const,
  gap: 8,
  margin: "14px 0",
};

export const stepRow: CSSProperties = {
  display: "flex",
  gap: 12,
  alignItems: "flex-start",
  fontSize: 13,
  lineHeight: 1.55,
};

export const stepNum: CSSProperties = {
  flexShrink: 0,
  width: 22,
  height: 22,
  background: imsColours.brand,
  color: "#ffffff",
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 10,
  fontWeight: 800,
  marginTop: 1,
};

export function Step({ n, children }: { n: number; children: ReactNode }) {
  return (
    <div style={stepRow}>
      <div style={stepNum}>{n}</div>
      <div>{children}</div>
    </div>
  );
}

// ── Callouts ──────────────────────────────────────────────────────────────────

export const callout = (tone: "info" | "warning" | "danger"): CSSProperties => ({
  display: "flex",
  gap: 10,
  alignItems: "flex-start",
  padding: "11px 14px",
  borderRadius: 8,
  margin: "14px 0",
  fontSize: 12,
  lineHeight: 1.55,
  background: imsColours.brandSoft,
  border: `1px solid ${tone === "danger" ? imsColours.danger : imsColours.brandAccent}`,
  color: tone === "danger" ? imsColours.danger : imsColours.brand,
});

// ── Mock UI panels ────────────────────────────────────────────────────────────

export const mockPanel: CSSProperties = {
  background: imsColours.page,
  border: `1px solid ${imsColours.border}`,
  borderRadius: 10,
  padding: 14,
  margin: "16px 0",
  fontSize: 12,
};

export const mockHero: CSSProperties = {
  background: `linear-gradient(135deg, ${imsColours.brand} 0%, ${imsColours.brand} 60%, ${imsColours.brandAccent} 160%)`,
  borderRadius: "8px 8px 0 0",
  padding: "13px 16px",
  color: "#fff",
  marginBottom: 8,
};

export const mockHeroEyebrow: CSSProperties = {
  fontSize: 9,
  fontWeight: 800,
  letterSpacing: "0.08em",
  color: imsColours.brandAccent,
  textTransform: "uppercase" as const,
  marginBottom: 3,
};

export const mockLabel: CSSProperties = {
  fontSize: 9,
  fontWeight: 800,
  letterSpacing: "0.07em",
  textTransform: "uppercase" as const,
  color: imsColours.muted,
  marginBottom: 8,
  display: "flex",
  alignItems: "center",
  gap: 6,
};

export function pill(bg: string, color: string): CSSProperties {
  return {
    display: "inline-block",
    fontSize: 10,
    fontWeight: 800,
    padding: "2px 9px",
    borderRadius: 999,
    background: bg,
    color,
    whiteSpace: "nowrap" as const,
  };
}

export const flowWrap: CSSProperties = {
  display: "flex",
  alignItems: "center",
  flexWrap: "wrap" as const,
  gap: 4,
  margin: "16px 0",
};

export const flowStep = (active?: boolean): CSSProperties => ({
  background: active ? imsColours.brand : imsColours.page,
  color: active ? "#fff" : imsColours.ink,
  border: `1px solid ${active ? imsColours.brand : imsColours.border}`,
  borderRadius: 8,
  padding: "7px 12px",
  fontSize: 11,
  fontWeight: 700,
  textAlign: "center" as const,
});

export const arrow: CSSProperties = {
  fontSize: 13,
  color: imsColours.muted,
  padding: "0 2px",
};

export const mockInput: CSSProperties = {
  width: "100%",
  padding: "7px 10px",
  border: `1px solid ${imsColours.border}`,
  borderRadius: 7,
  background: "#fff",
  color: imsColours.ink,
  fontSize: 12,
  fontFamily: "inherit",
};

export const mockFieldLabel: CSSProperties = {
  fontSize: 10,
  fontWeight: 800,
  color: imsColours.muted,
  marginBottom: 3,
  textTransform: "uppercase" as const,
  letterSpacing: "0.05em",
};

export const mockRow: CSSProperties = { display: "flex", gap: 10, marginBottom: 10, flexWrap: "wrap" as const };
export const mockField = (flex = 1): CSSProperties => ({ flex, minWidth: 140 });

export const btn = (tone: "primary" | "ghost" | "danger"): CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  padding: "7px 13px",
  borderRadius: 8,
  fontSize: 12,
  fontWeight: 700,
  border: tone === "ghost" ? `1px solid ${imsColours.border}` : "none",
  background: tone === "primary" ? imsColours.brand : tone === "danger" ? imsColours.danger : "#fff",
  color: tone === "ghost" ? imsColours.brand : "#fff",
  cursor: "default",
});

export const emailMock: CSSProperties = {
  background: "#fff",
  border: `1px solid ${imsColours.border}`,
  borderRadius: 8,
  overflow: "hidden",
  fontSize: 12,
  lineHeight: 1.6,
};

export const emailHeader: CSSProperties = {
  background: `linear-gradient(135deg, ${imsColours.brand} 0%, ${imsColours.brand} 60%, ${imsColours.brandAccent} 160%)`,
  padding: "13px 16px",
};

export const emailBody: CSSProperties = { padding: "14px 16px" };
