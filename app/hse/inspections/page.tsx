import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { QualityKpiCard } from "../../../src/components/QualityKpiCard";
import { QualityPageHero } from "../../../src/components/QualityPageHero";

export default function HseInspectionsPage() {
  return (
    <main>
      <QualityPageHero
        label="HSE MANAGEMENT"
        title="Site Inspections"
        description="Placeholder site inspection workspace for planned HSE inspections, observations, close-out, and readiness monitoring."
        contextCards={[
          { label: "Last Refreshed", value: "Shell only" },
          { label: "Latest Inspection", value: "No records yet" },
        ]}
      />
      <TopRow status="Site Inspections shell ready. Inspection workflow data has not been configured yet." />
      <section style={statsGridStyle}>
        <QualityKpiCard title="Inspections Due" value="-" accent="#f59e0b" />
        <QualityKpiCard title="Overdue Inspections" value="-" accent="#dc2626" />
        <QualityKpiCard title="Open Findings" value="-" accent="#2563eb" />
        <QualityKpiCard title="Completed This Month" value="-" accent="#16a34a" />
      </section>
      <section style={panelGridStyle}>
        <SectionCard title="Inspection Schedule">Future rows can show site, inspection type, inspector, due date, completion status, and linked actions.</SectionCard>
        <SectionCard title="Observation Follow-Up">Inspection findings will link to central actions when the HSE module moves beyond shell stage.</SectionCard>
      </section>
    </main>
  );
}

function TopRow({ status }: { status: string }) {
  return (
    <div style={topMetaRowStyle}>
      <Link href="/hse" style={backLinkStyle}>← Back to Dashboard</Link>
      <div style={statusBannerStyle}><strong>Status:</strong> {status}</div>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  return <section style={panelStyle}><h2 style={sectionTitleStyle}>{title}</h2><p style={emptyTextStyle}>{children}</p></section>;
}

const topMetaRowStyle: CSSProperties = { marginBottom: 20, display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" };
const backLinkStyle: CSSProperties = { color: "#0f766e", fontWeight: 700, textDecoration: "none" };
const statusBannerStyle: CSSProperties = { background: "white", borderRadius: "12px", padding: "12px 16px", boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)", color: "#0f172a" };
const statsGridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "16px", marginBottom: "20px" };
const panelGridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "20px" };
const panelStyle: CSSProperties = { background: "white", borderRadius: "18px", padding: "20px", boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)" };
const sectionTitleStyle: CSSProperties = { margin: "0 0 10px", fontSize: "20px", color: "#0f172a" };
const emptyTextStyle: CSSProperties = { color: "#64748b", margin: 0, lineHeight: 1.55 };
