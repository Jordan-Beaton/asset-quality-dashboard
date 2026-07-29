"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { QualityPageHero } from "../../../src/components/QualityPageHero";

const tools = [
  { href: "/projects/wadden-sea/itp", title: "ITP Tracker", tag: "Document control", copy: "Upload ITPs, extract core metadata, control revisions, retain every physical file, and manage the Enshore review workflow." },
  { href: "/projects/wadden-sea/noi", title: "NOI Tracker", tag: "Inspection intelligence", copy: "Scan current ITP revisions for Client, Enshore, or Contractor witness and hold points, review the extracted activities, and maintain the project NOI register." },
  { href: "/projects/wadden-sea/reports", title: "Project Reports", tag: "Monthly annexes", copy: "Build Audit NCR, Audit Programme, and 8-week inspection lookahead annexes from one project reporting screen." },
] as const;

export default function WaddenSeaPage() {
  return (
    <main style={page}>
      <QualityPageHero label="Project workspace · WSP" title="Wadden Sea Project" description="The controlled home for project-specific registers, quality documentation, and monthly reporting annexes." />
      <section style={grid}>
        {tools.map((tool) => (
          <Link key={tool.href} href={tool.href} style={card}>
            <span style={tag}>{tool.tag}</span>
            <h2 style={title}>{tool.title}</h2>
            <p style={copy}>{tool.copy}</p>
            <span style={cta}>Open workspace →</span>
          </Link>
        ))}
      </section>
    </main>
  );
}

const page: CSSProperties = { display: "grid", gap: 20 };
const grid: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(310px,1fr))", gap: 18 };
const card: CSSProperties = { textDecoration: "none", color: "inherit", background: "#fff", border: "1px solid #d5e0ea", borderRadius: 20, padding: 25, minHeight: 210, boxShadow: "0 12px 30px rgba(15,23,42,.07)", display: "flex", flexDirection: "column" };
const tag: CSSProperties = { alignSelf: "flex-start", background: "#e7f5f4", color: "#2f7f7d", borderRadius: 999, padding: "6px 10px", fontWeight: 900, fontSize: 12, textTransform: "uppercase", letterSpacing: ".06em" };
const title: CSSProperties = { color: "#13253a", margin: "19px 0 7px", fontSize: 25 };
const copy: CSSProperties = { color: "#536579", lineHeight: 1.6, flex: 1 };
const cta: CSSProperties = { color: "#2f7f7d", fontWeight: 900 };
