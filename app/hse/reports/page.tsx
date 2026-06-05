import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { QualityKpiCard } from "../../../src/components/QualityKpiCard";
import { QualityPageHero } from "../../../src/components/QualityPageHero";

export default function HseReportsPage() {
  return (
    <main>
      <QualityPageHero
        label="HSE MANAGEMENT"
        title="HSE Reports"
        description="Placeholder HSE reporting workspace for future incident, inspection, risk assessment, environmental, and action summaries."
        contextCards={[
          { label: "Last Refreshed", value: "Shell only" },
          { label: "Latest HSE Report", value: "No reports yet" },
        ]}
      />
      <TopRow status="HSE Reports shell ready. No HSE reporting data or PDF generation has been configured yet." />
      <section style={statsGridStyle}>
        <QualityKpiCard title="Monthly Reports" value="-" accent="#3A9B98" />
        <QualityKpiCard title="Incident Reports" value="-" accent="#dc2626" />
        <QualityKpiCard title="Inspection Reports" value="-" accent="#2563eb" />
        <QualityKpiCard title="Environmental Reports" value="-" accent="#16a34a" />
      </section>
      <section style={panelGridStyle}>
        <SectionCard title="Management Reporting">Future HSE reports can mirror Quality Management report layout and PDF styling.</SectionCard>
        <SectionCard title="Readiness">This shell prepares the page structure only. No report history or persistence exists in this pass.</SectionCard>
      </section>
    </main>
  );
}

function TopRow({ status }: { status: string }) {
  return <div style={topMetaRowStyle}><Link href="/hse" style={backLinkStyle}>&larr; Back to Dashboard</Link><div style={statusBannerStyle}><strong>Status:</strong> {status}</div></div>;
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
