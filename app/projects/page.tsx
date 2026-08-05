"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { ImsTopMetaRow } from "../../src/components/ImsPrimitives";
import { QualityPageHero } from "../../src/components/QualityPageHero";

export default function ProjectsPage() {
  return (
    <main style={page}>
      <QualityPageHero
        label="Master Module"
        title="Project Management"
        description="Project-specific quality controls, document registers, reporting annexes, and delivery intelligence in one workspace."
      />
      <ImsTopMetaRow backHref="/home" backLabel="Back to Home" status={<><strong>Status:</strong> Project Management ready.</>} />
      <section style={section}>
        <div>
          <div style={kicker}>Active projects</div>
          <h2 style={heading}>Project workspaces</h2>
        </div>
        <div style={grid}>
          <Link href="/projects/wadden-sea" style={card}>
            <div style={cardTop}>
              <span style={badge}>Active</span>
              <span style={code}>WSP</span>
            </div>
            <h3 style={cardTitle}>Wadden Sea Project</h3>
            <p style={copy}>ITP control, monthly report annexes, audit reporting, and the 8-week inspection lookahead.</p>
            <span style={cta}>Open project workspace →</span>
          </Link>
        </div>
      </section>
    </main>
  );
}

const page: CSSProperties = { display: "grid", gap: 20 };
const section: CSSProperties = { background: "#fff", border: "1px solid #dbe4ee", borderRadius: 20, padding: 24, display: "grid", gap: 20 };
const kicker: CSSProperties = { color: "#005670", textTransform: "uppercase", letterSpacing: ".1em", fontWeight: 900, fontSize: 12 };
const heading: CSSProperties = { margin: "5px 0 0", color: "#162436", fontSize: 25 };
const grid: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,420px))", gap: 16 };
const card: CSSProperties = { textDecoration: "none", color: "inherit", border: "1px solid #cddbe8", borderRadius: 17, padding: 22, background: "linear-gradient(145deg,#fff,#f3f8fa)", boxShadow: "0 12px 28px rgba(15,23,42,.07)" };
const cardTop: CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center" };
const badge: CSSProperties = { background: "#dff7e7", color: "#166534", padding: "5px 10px", borderRadius: 999, fontWeight: 800, fontSize: 12 };
const code: CSSProperties = { color: "#64748b", fontWeight: 900, letterSpacing: ".1em", fontSize: 12 };
const cardTitle: CSSProperties = { fontSize: 23, margin: "22px 0 8px", color: "#102338" };
const copy: CSSProperties = { color: "#526477", lineHeight: 1.55, minHeight: 74 };
const cta: CSSProperties = { color: "#005670", fontWeight: 900 };
