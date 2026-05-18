import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { QualityKpiCard } from "../../../src/components/QualityKpiCard";
import { QualityPageHero } from "../../../src/components/QualityPageHero";

export default function HseActionsPage() {
  return (
    <main>
      <QualityPageHero
        label="HSE MANAGEMENT"
        title="HSE Actions"
        description="HSE actions will use the central Action Management register. This shell does not create a separate HSE action database."
        contextCards={[
          { label: "Last Refreshed", value: "Shell only" },
          { label: "Latest HSE Action", value: "Central Actions link pending" },
        ]}
      />

      <div style={topMetaRowStyle}>
        <Link href="/hse" style={backLinkStyle}>
          ← Back to Dashboard
        </Link>
        <div style={topMetaActionsStyle}>
          <Link href="/actions" style={primaryLinkStyle}>
            Open Central Actions
          </Link>
          <div style={statusBannerStyle}>
            <strong>Status:</strong> HSE actions will use the existing central Action Management register later.
          </div>
        </div>
      </div>

      <section style={statsGridStyle}>
        <QualityKpiCard title="HSE-Linked Actions" value="-" accent="#0f766e" />
        <QualityKpiCard title="Open Actions" value="-" accent="#2563eb" />
        <QualityKpiCard title="Overdue Actions" value="-" accent="#dc2626" />
        <QualityKpiCard title="Completed Actions" value="-" accent="#16a34a" />
      </section>

      <section style={panelGridStyle}>
        <SectionCard title="Central Action Register">
          HSE will not maintain a separate actions database in this shell pass. Future HSE records will create
          and link actions through the existing central /actions register.
        </SectionCard>
        <SectionCard title="Future HSE Linkage">
          Later implementation can prefill source, title, description, owner, and linked HSE references into central Actions.
        </SectionCard>
      </section>
    </main>
  );
}

function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  return <section style={panelStyle}><h2 style={sectionTitleStyle}>{title}</h2><p style={emptyTextStyle}>{children}</p></section>;
}

const topMetaRowStyle: CSSProperties = { marginBottom: 20, display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" };
const topMetaActionsStyle: CSSProperties = { display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" };
const backLinkStyle: CSSProperties = { color: "#0f766e", fontWeight: 700, textDecoration: "none" };
const statusBannerStyle: CSSProperties = { background: "white", borderRadius: "12px", padding: "12px 16px", boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)", color: "#0f172a" };
const primaryLinkStyle: CSSProperties = { background: "#0f766e", color: "white", border: "none", padding: "11px 16px", borderRadius: "10px", cursor: "pointer", fontWeight: 700, textDecoration: "none" };
const statsGridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "16px", marginBottom: "20px" };
const panelGridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "20px" };
const panelStyle: CSSProperties = { background: "white", borderRadius: "18px", padding: "20px", boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)" };
const sectionTitleStyle: CSSProperties = { margin: "0 0 10px", fontSize: "20px", color: "#0f172a" };
const emptyTextStyle: CSSProperties = { color: "#64748b", margin: 0, lineHeight: 1.55 };
