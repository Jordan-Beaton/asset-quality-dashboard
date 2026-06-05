import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { QualityKpiCard } from "../../src/components/QualityKpiCard";
import { QualityPageHero } from "../../src/components/QualityPageHero";

export default function HseDashboardPage() {
  return (
    <main>
      <QualityPageHero
        label="HSE MANAGEMENT"
        title="HSE Dashboard"
        description="Health, safety, and environment shell for incidents, inspections, risk assessments, environmental controls, actions, and reporting."
        contextCards={[
          { label: "Last Refreshed", value: "Shell only" },
          { label: "Latest HSE Update", value: "No HSE records yet" },
        ]}
      />

      <div style={topMetaRowStyle}>
        <Link href="/hse" style={{ ...backLinkStyle, visibility: "hidden" }} aria-hidden="true" tabIndex={-1}>
          &larr; Back to Dashboard
        </Link>
        <div style={statusBannerStyle}>
          <strong>Status:</strong> HSE Management dashboard ready.
        </div>
      </div>

      <section style={statsGridStyle}>
        <QualityKpiCard title="Open Incidents" value="-" accent="#dc2626" />
        <QualityKpiCard title="Near Misses This Month" value="-" accent="#f59e0b" />
        <QualityKpiCard title="Inspections Due" value="-" accent="#2563eb" />
        <QualityKpiCard title="Open HSE Actions" value="-" accent="#7c3aed" />
        <QualityKpiCard title="Environmental Items" value="-" accent="#3A9B98" />
        <QualityKpiCard title="Reports Ready" value="Pending" accent="#64748b" />
      </section>

      <section style={dashboardGridStyle}>
        <DashboardPanel title="Incident Profile" subtitle="Placeholder for incident and near-miss trend visibility." />
        <DashboardPanel title="Site Inspection Readiness" subtitle="Placeholder for planned and overdue site inspections." />
        <DashboardPanel title="Risk Assessment Coverage" subtitle="Placeholder for HSE risk assessment status and review coverage." />
        <DashboardPanel title="Environmental / Waste Tracking" subtitle="Placeholder for waste, spill, and environmental control indicators." />
      </section>
    </main>
  );
}

function DashboardPanel({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <section style={panelStyle}>
      <h2 style={panelTitleStyle}>{title}</h2>
      <p style={panelSubtitleStyle}>{subtitle}</p>
      <div style={emptyStateStyle}>Awaiting HSE module build.</div>
    </section>
  );
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

const backLinkStyle: CSSProperties = {
  color: "#3A9B98",
  fontWeight: 700,
  textDecoration: "none",
};

const statusBannerStyle: CSSProperties = {
  background: "white",
  borderRadius: "12px",
  padding: "12px 16px",
  boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)",
  color: "#0f172a",
};

const statsGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
  gap: "16px",
  marginBottom: "20px",
};

const dashboardGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "20px",
};

const panelStyle: CSSProperties = {
  background: "white",
  borderRadius: "18px",
  padding: "20px",
  boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)",
};

const panelTitleStyle: CSSProperties = {
  margin: "0 0 6px",
  fontSize: "20px",
  color: "#0f172a",
};

const panelSubtitleStyle: CSSProperties = {
  margin: "0 0 16px",
  color: "#64748b",
  lineHeight: 1.55,
};

const emptyStateStyle: CSSProperties = {
  border: "1px dashed #cbd5e1",
  borderRadius: "14px",
  padding: "18px",
  background: "#f8fafc",
  color: "#64748b",
};
