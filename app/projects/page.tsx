"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { ImsTopMetaRow } from "../../src/components/ImsPrimitives";
import { QualityPageHero } from "../../src/components/QualityPageHero";
import { AddProjectPanel } from "../../src/components/AddProjectPanel";
import { useImsPermissions } from "../../src/components/ImsPermissions";
import { getProject } from "../../src/lib/projectRegistry";
import { useProjectRegistry } from "../../src/lib/useProjectRegistry";

// Descriptions for the projects that have their own tailored dashboards. Any other project gets the standard one.
const KNOWN_BLURBS: Record<string, string> = {
  "wadden-sea": "ITP control, monthly report annexes, audit reporting, and the 8-week inspection lookahead.",
  "baltic-power": "ITP control, NOI planning, and evidence-based phase sign-off with external approval.",
};
const STANDARD_BLURB = "ITP control, NOI planning, the MOC register, and evidence-based phase sign-off.";

export default function ProjectsPage() {
  const { projects } = useProjectRegistry();
  const permissions = useImsPermissions();

  return (
    <main style={page}>
      <QualityPageHero
        label="Master Module"
        title="Project Management"
        description="Project-specific quality controls, document registers, reporting annexes, and delivery intelligence in one workspace."
      />
      <ImsTopMetaRow backHref="/home" backLabel="Back to IMS Home" status={<><strong>Status:</strong> Project Management ready.</>} />
      <section style={section}>
        <div>
          <div style={kicker}>Active projects</div>
          <h2 style={heading}>Project workspaces</h2>
        </div>
        <div style={grid}>
          {projects.map((project) => (
            <Link key={project.key} href={`/projects/${project.key}`} style={card}>
              <div style={cardTop}>
                <span style={badge}>Active</span>
                <span style={code}>{getProject(project.key).abbreviation}</span>
              </div>
              <h3 style={cardTitle}>{project.key === "wadden-sea" ? "Wadden Sea Project" : project.name}</h3>
              <p style={copy}>{KNOWN_BLURBS[project.key] || STANDARD_BLURB}</p>
              <span style={cta}>Open project workspace →</span>
            </Link>
          ))}
          <Link href="/inspections" style={card}>
            <div style={cardTop}>
              <span style={badge}>All projects</span>
              <span style={code}>OVI</span>
            </div>
            <h3 style={cardTitle}>Overall Inspections</h3>
            <p style={copy}>Cross-project 8-week lookahead of who is covering what, including manual entries, fully filterable for client-ready exports.</p>
            <span style={cta}>Open Overall Inspections →</span>
          </Link>
        </div>
      </section>
      {permissions.isAdmin ? <AddProjectPanel /> : null}
    </main>
  );
}

const page: CSSProperties = { display: "grid", gap: 20 };
const section: CSSProperties = { background: "#fff", border: "1px solid #D0D0CE", borderRadius: 20, padding: 24, display: "grid", gap: 20 };
const kicker: CSSProperties = { color: "#005670", textTransform: "uppercase", letterSpacing: ".1em", fontWeight: 900, fontSize: 12 };
const heading: CSSProperties = { margin: "5px 0 0", color: "#53565A", fontSize: 25 };
const grid: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,420px))", gap: 16 };
const card: CSSProperties = { textDecoration: "none", color: "inherit", border: "1px solid #D0D0CE", borderRadius: 17, padding: 22, background: "linear-gradient(145deg,#fff,#ECECE7)", boxShadow: "0 12px 28px rgba(15,23,42,.07)" };
const cardTop: CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center" };
const badge: CSSProperties = { background: "#ECECE7", color: "#005670", padding: "5px 10px", borderRadius: 999, fontWeight: 800, fontSize: 12 };
const code: CSSProperties = { color: "#53565A", fontWeight: 900, letterSpacing: ".1em", fontSize: 12 };
const cardTitle: CSSProperties = { fontSize: 23, margin: "22px 0 8px", color: "#53565A" };
const copy: CSSProperties = { color: "#53565A", lineHeight: 1.55, minHeight: 74 };
const cta: CSSProperties = { color: "#005670", fontWeight: 900 };
