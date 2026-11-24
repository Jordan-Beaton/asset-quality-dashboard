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
  background: imsColours.panel,
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

// ── Status tints and the shared record screen ─────────────────────────────────

export type TintTone = "ok" | "warn" | "bad" | "neu" | "brand";

// Soft status pill matching the app's status tints (green, amber, red, grey, plus the teal tint used for in-flight states).
export function tintPill(tone: TintTone): CSSProperties {
  const bg = tone === "brand" ? "var(--enshore-tint)" : `var(--ims-${tone}-bg)`;
  const color = tone === "brand" ? "var(--ims-brand-ink)" : `var(--ims-${tone}-ink)`;
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

export type RecordMockStep = { label: string; pct?: number; state?: string };

// A small picture of the shared record screen: header with the next-step button, progress steps,
// the "still missing" chips and the live summary on the right. Every record guide uses it.
export function RecordScreenMock({
  id, title, status, tone, nextButton, track, steps, active, missing, gate, summaryTitle, summaryRows,
}: {
  id: string;
  title: string;
  status: string;
  tone: TintTone;
  nextButton: string;
  track?: string[];
  steps: RecordMockStep[];
  active: number;
  missing: string[];
  gate: string;
  summaryTitle: string;
  summaryRows: [string, string | null][];
}) {
  return (
    <div style={mockPanel}>
      <div style={mockLabel}>The record screen</div>
      <div style={{ background: "#fff", border: `1px solid ${imsColours.border}`, borderRadius: 8, padding: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, color: imsColours.brandAccent }}>{id}</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: imsColours.ink }}>{title}</div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span style={tintPill(tone)}>{status}</span>
            <span style={btn("primary")}>{nextButton}</span>
            <span style={btn("ghost")}>Hide Panel</span>
          </div>
        </div>
        {track ? (
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 8 }}>
            {track.map((t) => (
              <span key={t} style={{ ...flowStep(t === status), padding: "3px 10px", fontSize: 10 }}>{t}</span>
            ))}
          </div>
        ) : null}
        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
          <span style={{ ...btn("ghost"), padding: "3px 9px", fontSize: 11 }}>All sections</span>
          <span style={{ ...btn("ghost"), padding: "3px 9px", fontSize: 11 }}>Form</span>
          <span style={{ ...btn("primary"), padding: "3px 9px", fontSize: 11 }}>Split</span>
          <span style={{ ...btn("ghost"), padding: "3px 9px", fontSize: 11 }}>Report</span>
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
          {steps.map((s, i) => (
            <div key={s.label} style={{ flex: 1, minWidth: 110, border: `1px solid ${i === active ? imsColours.brand : imsColours.border}`, borderRadius: 8, padding: "6px 9px", background: i === active ? imsColours.brandSoft : "#fff" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 6, fontSize: 11, fontWeight: 800, color: imsColours.ink }}>
                <span>{i + 1}  {s.label}</span>
                <span style={{ color: imsColours.muted }}>{s.pct == null ? s.state : `${s.pct}%`}</span>
              </div>
              {s.pct == null ? null : (
                <div style={{ height: 4, borderRadius: 2, background: imsColours.border, marginTop: 5 }}>
                  <div style={{ width: `${s.pct}%`, height: 4, borderRadius: 2, background: imsColours.brand }} />
                </div>
              )}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
          <div style={{ flex: 2, minWidth: 200, fontSize: 11, color: imsColours.muted, lineHeight: 1.6, border: `1px dashed ${imsColours.border}`, borderRadius: 8, padding: 10 }}>
            The fields for the step you are on appear here.
          </div>
          <div style={{ flex: 1, minWidth: 200, display: "grid", gap: 8 }}>
            <div style={{ background: "var(--ims-warn-bg)", color: "var(--ims-warn-ink)", borderRadius: 8, padding: "7px 10px", fontSize: 11 }}>
              <strong>{missing.length} item{missing.length === 1 ? "" : "s"} still missing before {gate}</strong>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 5 }}>
                {missing.map((m) => (
                  <span key={m} style={{ background: "#fff", borderRadius: 999, padding: "1px 8px", fontSize: 10, fontWeight: 700 }}>{m}</span>
                ))}
              </div>
            </div>
            <div style={{ background: "#fff", border: `1px solid ${imsColours.border}`, borderRadius: 8, fontSize: 11 }}>
              <div style={{ background: imsColours.brand, color: "#fff", fontWeight: 800, padding: "5px 10px", borderRadius: "8px 8px 0 0" }}>{summaryTitle}</div>
              {summaryRows.map(([label, value]) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "4px 10px", borderTop: `1px solid ${imsColours.border}` }}>
                  <span style={{ color: imsColours.muted, fontWeight: 700 }}>{label}</span>
                  <span style={value ? undefined : { color: "var(--ims-warn-ink)", background: "var(--ims-warn-bg)", borderRadius: 4, padding: "0 5px" }}>{value || "to be completed"}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
