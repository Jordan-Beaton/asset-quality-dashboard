import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { QualityKpiCard } from "../../../src/components/QualityKpiCard";
import { QualityPageHero } from "../../../src/components/QualityPageHero";

export default function HseEnvironmentalPage() {
  return (
    <main>
      <QualityPageHero
        label="HSE MANAGEMENT"
        title="Environmental / Waste"
        description="Placeholder environmental and waste management workspace for spills, waste tracking, permits, and observations."
        contextCards={[
          { label: "Last Refreshed", value: "Shell only" },
          { label: "Latest Environmental Item", value: "No records yet" },
        ]}
      />
      <TopRow status="Environmental / Waste shell ready. Environmental source data has not been configured yet." />
      <section style={statsGridStyle}>
        <QualityKpiCard title="Open Items" value="-" accent="#3A9B98" />
        <QualityKpiCard title="Waste Records" value="-" accent="#2563eb" />
        <QualityKpiCard title="Spill Events" value="-" accent="#dc2626" />
        <QualityKpiCard title="Reports Due" value="-" accent="#f59e0b" />
      </section>
      <section style={panelGridStyle}>
        <SectionCard title="Environmental Register">Future records can show event type, location, controls, waste stream, disposal route, and close-out status.</SectionCard>
        <SectionCard title="Waste Tracking">This placeholder keeps the module ready without adding schema or workflow logic yet.</SectionCard>
      </section>
    </main>
  );
}

function TopRow({ status }: { status: string }) {
  return <div style={topMetaRowStyle}><Link href="/hse" style={backLinkStyle}>← Back to Dashboard</Link><div style={statusBannerStyle}><strong>Status:</strong> {status}</div></div>;
}

function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  return <section style={panelStyle}><h2 style={sectionTitleStyle}>{title}</h2><p style={emptyTextStyle}>{children}</p></section>;
}

const topMetaRowStyle: CSSProperties = {
  marginBottom: 20,
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap",
  alignItems: "center",
  background: "rgba(255,255,255,0.92)",
  border: "1px solid #dbe3ef",
  borderRadius: "16px",
  padding: "12px 14px",
  boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)",
};
const backLinkStyle: CSSProperties = { color: "#3A9B98", fontWeight: 700, textDecoration: "none" };
const statusBannerStyle: CSSProperties = { background: "white", borderRadius: "12px", padding: "12px 16px", boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)", color: "#0f172a" };
const statsGridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "16px", marginBottom: "20px" };
const panelGridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "20px" };
const panelStyle: CSSProperties = { background: "white", borderRadius: "18px", padding: "20px", boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)" };
const sectionTitleStyle: CSSProperties = { margin: "0 0 10px", fontSize: "20px", color: "#0f172a" };
const emptyTextStyle: CSSProperties = { color: "#64748b", margin: 0, lineHeight: 1.55 };
