import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { QualityKpiCard } from "../../../src/components/QualityKpiCard";
import { QualityPageHero } from "../../../src/components/QualityPageHero";

export default function RiskReportsPage() {
  return (
    <RiskShellPage
      title="Risk Reports"
      description="Risk reporting shell for management summaries, review packs, trends, controls, opportunities, and linked actions."
      latestLabel="Latest Report"
      status="Risk Reports shell ready. Report persistence and PDF generation have not been configured yet."
      kpis={[
        { title: "Monthly Reports", value: "-", accent: "#005670" },
        { title: "Open High Risks", value: "-", accent: "#F93822" },
        { title: "Controls Due", value: "-", accent: "#FFAD00" },
        { title: "Linked Actions", value: "-", accent: "#53565A" },
      ]}
      panels={[
        {
          title: "Management Snapshot",
          text: "Future reporting will summarise risk profile, top movements, overdue reviews, control assurance, opportunities, and linked actions.",
        },
        {
          title: "Saved Reports",
          text: "No saved Risk reports exist yet because this pass intentionally avoids schema and persistence changes.",
        },
      ]}
    />
  );
}

type Kpi = {
  title: string;
  value: ReactNode;
  accent: string;
};

type Panel = {
  title: string;
  text: string;
};

function RiskShellPage({
  title,
  description,
  latestLabel,
  status,
  kpis,
  panels,
}: {
  title: string;
  description: string;
  latestLabel: string;
  status: string;
  kpis: Kpi[];
  panels: Panel[];
}) {
  return (
    <main>
      <QualityPageHero
        label="RISK MANAGEMENT"
        title={title}
        description={description}
        contextCards={[
          { label: "Last Refreshed", value: "Shell only" },
          { label: latestLabel, value: "No records yet" },
        ]}
      />

      <div className="ims-top-meta-row" style={topMetaRowStyle}>
        <Link href="/home" style={backLinkStyle}>
          ← Back to IMS Home
        </Link>

        <div style={statusBannerStyle}>
          <strong>Status:</strong> {status}
        </div>
      </div>

      <section style={statsGridStyle}>
        {kpis.map((kpi) => (
          <QualityKpiCard key={kpi.title} title={kpi.title} value={kpi.value} accent={kpi.accent} />
        ))}
      </section>

      <section style={panelGridStyle}>
        {panels.map((panel) => (
          <SectionCard key={panel.title} title={panel.title}>
            <p style={emptyTextStyle}>{panel.text}</p>
          </SectionCard>
        ))}
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
  border: "1px solid #D0D0CE",
  borderRadius: "16px",
  padding: "12px 14px",
  boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)",
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
  color: "#000000",
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
  color: "#000000",
};

const emptyTextStyle: CSSProperties = {
  color: "#53565A",
  margin: 0,
  lineHeight: 1.55,
};
