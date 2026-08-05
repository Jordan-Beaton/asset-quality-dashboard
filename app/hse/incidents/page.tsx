import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { QualityKpiCard } from "../../../src/components/QualityKpiCard";
import { QualityPageHero } from "../../../src/components/QualityPageHero";

export default function HseIncidentsPage() {
  return (
    <HseShellPage
      title="Incidents / Near Misses"
      description="Placeholder HSE incident and near-miss workspace for future logging, classification, investigation, and learning."
      latestLabel="Latest Incident"
      status="Incidents / Near Misses shell ready. No incident database functionality has been configured yet."
      kpis={[
        { title: "Open Incidents", value: "-", accent: "#F93822" },
        { title: "Near Misses", value: "-", accent: "#FFAD00" },
        { title: "Investigations Due", value: "-", accent: "#63B1BC" },
        { title: "Lessons Learned", value: "-", accent: "#005670" },
      ]}
      panels={[
        {
          title: "Incident Register",
          text: "Future records can show incident type, severity, immediate response, investigator, due dates, and close-out status.",
        },
        {
          title: "Learning Capture",
          text: "This area will support trend review and lessons learned without changing current Quality workflows.",
        },
      ]}
    />
  );
}

type Kpi = { title: string; value: ReactNode; accent: string };
type Panel = { title: string; text: string };

function HseShellPage({
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
        label="HSE MANAGEMENT"
        title={title}
        description={description}
        contextCards={[
          { label: "Last Refreshed", value: "Shell only" },
          { label: latestLabel, value: "No records yet" },
        ]}
      />
      <div style={topMetaRowStyle}>
        <Link href="/hse" style={backLinkStyle}>
          ← Back to Dashboard
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
  border: "1px solid #dbe3ef",
  borderRadius: "16px",
  padding: "12px 14px",
  boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)",
};
const backLinkStyle: CSSProperties = { color: "#005670", fontWeight: 700, textDecoration: "none" };
const statusBannerStyle: CSSProperties = { background: "white", borderRadius: "12px", padding: "12px 16px", boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)", color: "#0f172a" };
const statsGridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "16px", marginBottom: "20px" };
const panelGridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "20px" };
const panelStyle: CSSProperties = { background: "white", borderRadius: "18px", padding: "20px", boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)" };
const sectionTitleStyle: CSSProperties = { margin: "0 0 10px", fontSize: "20px", color: "#0f172a" };
const emptyTextStyle: CSSProperties = { color: "#64748b", margin: 0, lineHeight: 1.55 };
