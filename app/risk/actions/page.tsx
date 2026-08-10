import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { QualityKpiCard } from "../../../src/components/QualityKpiCard";
import { QualityPageHero } from "../../../src/components/QualityPageHero";

export default function RiskActionsPage() {
  return (
    <main>
      <QualityPageHero
        label="RISK MANAGEMENT"
        title="Risk Actions"
        description="Risk actions will use the central Action Management register. This page is a Risk module shell and does not create a separate risk actions database."
        contextCards={[
          { label: "Last Refreshed", value: "Shell only" },
          { label: "Latest Risk Action", value: "Central Actions link pending" },
        ]}
      />

      <div style={topMetaRowStyle}>
        <Link href="/home" style={backLinkStyle}>
          ← Back to IMS Home
        </Link>

        <div style={topMetaActionsStyle}>
          <Link href="/actions" style={primaryLinkStyle}>
            Open Central Actions
          </Link>
          <div style={statusBannerStyle}>
            <strong>Status:</strong> Risk action linking will use the existing central Actions register.
          </div>
        </div>
      </div>

      <section style={statsGridStyle}>
        <QualityKpiCard title="Risk-Linked Actions" value="-" accent="#005670" />
        <QualityKpiCard title="Open Actions" value="-" accent="#63B1BC" />
        <QualityKpiCard title="Overdue Actions" value="-" accent="#F93822" />
        <QualityKpiCard title="Completed Actions" value="-" accent="#005670" />
      </section>

      <section style={panelGridStyle}>
        <SectionCard title="Central Action Register">
          <p style={emptyTextStyle}>
            Risk will not maintain a separate actions database in this pass. Future risk records will create
            and link actions through the existing central /actions register.
          </p>
        </SectionCard>
        <SectionCard title="Future Risk Linkage">
          <p style={emptyTextStyle}>
            Later implementation can prefill source, title, description, owner, and linked risk references
            into central Actions without disrupting Quality, Asset, Audit, NCR/CAPA, or MOC workflows.
          </p>
        </SectionCard>
      </section>
    </main>
  );
}

function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={panelStyle}>
      <h2 style={sectionTitleStyle}>{title}</h2>
      {children}
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

const topMetaActionsStyle: CSSProperties = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
  alignItems: "center",
};

const backLinkStyle: CSSProperties = {
  color: "#005670",
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

const primaryLinkStyle: CSSProperties = {
  background: "#005670",
  color: "white",
  border: "none",
  padding: "11px 16px",
  borderRadius: "10px",
  cursor: "pointer",
  fontWeight: 700,
  textDecoration: "none",
};

const statsGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: "16px",
  marginBottom: "20px",
};

const panelGridStyle: CSSProperties = {
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

const sectionTitleStyle: CSSProperties = {
  margin: "0 0 10px",
  fontSize: "20px",
  color: "#0f172a",
};

const emptyTextStyle: CSSProperties = {
  color: "#64748b",
  margin: 0,
  lineHeight: 1.55,
};
