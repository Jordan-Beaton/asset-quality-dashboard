"use client";

import type { CSSProperties } from "react";
import { QualityPageHero } from "../../src/components/QualityPageHero";
import { ImsTopMetaRow } from "../../src/components/ImsPrimitives";
import { imsColours, imsPanelStyle } from "../../src/components/imsTheme";

type Guide = {
  title: string;
  description: string;
  module: string;
  icon: string;
  url: string;
  tags: string[];
};

const guides: Guide[] = [
  {
    title: "Document Control",
    description: "How to add documents, upload controlled files, submit for review, approve, handle periodic reviews, issue new revisions, and manage responsible persons.",
    module: "Document Control",
    icon: "📋",
    url: "https://claude.ai/code/artifact/d31602ca-ef46-4047-8cff-f2e6d64785ce",
    tags: ["Documents", "Workflow", "Approval"],
  },
];

// ── Styles ────────────────────────────────────────────────────────────────────

const page: CSSProperties = { display: "grid", gap: 16 };

const grid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
  gap: 16,
};

const card: CSSProperties = {
  ...imsPanelStyle,
  display: "flex",
  flexDirection: "column",
  gap: 12,
  cursor: "pointer",
  transition: "box-shadow 0.15s",
  textDecoration: "none",
  color: "inherit",
};

const cardIcon: CSSProperties = {
  fontSize: 32,
  width: 56,
  height: 56,
  background: imsColours.page,
  border: `1px solid ${imsColours.border}`,
  borderRadius: 12,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const cardModule: CSSProperties = {
  fontSize: 10,
  fontWeight: 800,
  letterSpacing: "0.07em",
  textTransform: "uppercase" as const,
  color: imsColours.brandAccent,
  marginBottom: 2,
};

const cardTitle: CSSProperties = {
  fontSize: 15,
  fontWeight: 700,
  color: imsColours.brand,
  marginBottom: 4,
};

const cardDesc: CSSProperties = {
  fontSize: 12,
  color: imsColours.muted,
  lineHeight: 1.6,
  flex: 1,
};

const tagRow: CSSProperties = {
  display: "flex",
  gap: 6,
  flexWrap: "wrap" as const,
  marginTop: 4,
};

const tag: CSSProperties = {
  background: imsColours.page,
  border: `1px solid ${imsColours.border}`,
  borderRadius: 999,
  fontSize: 10,
  fontWeight: 700,
  padding: "2px 8px",
  color: imsColours.muted,
};

const openBtn: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  marginTop: 4,
  background: imsColours.brand,
  color: "#fff",
  border: "none",
  borderRadius: 8,
  padding: "8px 14px",
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
  alignSelf: "flex-start" as const,
  textDecoration: "none",
};

const emptyArea: CSSProperties = {
  ...imsPanelStyle,
  padding: "40px 24px",
  textAlign: "center" as const,
  color: imsColours.muted,
  borderStyle: "dashed",
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function GuidesPage() {
  return (
    <main style={page}>
      <QualityPageHero
        label="Enshore IMS · Process Guides"
        title="Process Guides"
        description="Step-by-step guides for every IMS process — open any guide to walk through the workflow."
      />
      <ImsTopMetaRow
        status={<><strong>Status:</strong> {guides.length} guide{guides.length !== 1 ? "s" : ""} available</>}
      />

      <div style={grid}>
        {guides.map((guide) => (
          <a
            key={guide.title}
            href={guide.url}
            target="_blank"
            rel="noreferrer"
            style={card}
          >
            <div style={cardIcon}>{guide.icon}</div>
            <div>
              <div style={cardModule}>{guide.module}</div>
              <div style={cardTitle}>{guide.title}</div>
              <p style={cardDesc}>{guide.description}</p>
            </div>
            <div style={tagRow}>
              {guide.tags.map((t) => (
                <span key={t} style={tag}>{t}</span>
              ))}
            </div>
            <span style={openBtn}>Open Guide ↗</span>
          </a>
        ))}

        {/* Placeholder card for guides coming soon */}
        <div style={emptyArea}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>🔜</div>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>More guides coming soon</div>
          <div style={{ fontSize: 12 }}>NCR / CAPA, Audits, Actions, and Project Management guides will be added here.</div>
        </div>
      </div>
    </main>
  );
}
