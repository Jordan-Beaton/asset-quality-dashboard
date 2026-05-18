import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { QualityKpiCard } from "../../../src/components/QualityKpiCard";
import { QualityPageHero } from "../../../src/components/QualityPageHero";

export default function AdminActionSettingsPage() {
  return (
    <AdminSettingsPage
      title="Action Settings"
      description="Placeholder settings area for priorities, statuses, source labels, escalation rules, and central action governance."
      latestLabel="Latest Action Setting"
      status="Action Settings shell ready. Existing central Action Management behaviour is unchanged."
      kpis={[
        { title: "Priority Values", value: "Current", accent: "#dc2626" },
        { title: "Status Values", value: "Current", accent: "#2563eb" },
        { title: "Source Labels", value: "Pending", accent: "#7c3aed" },
        { title: "Escalations", value: "Future", accent: "#f59e0b" },
      ]}
      panels={[
        { title: "Future Editable Settings", text: "Priority values, status values, source/module labels, overdue escalation rules, and action reporting defaults." },
        { title: "Current Pass", text: "Shell only. Existing action create/edit/evidence/PDF logic and query-param workflows remain untouched." },
      ]}
    />
  );
}

type Kpi = { title: string; value: ReactNode; accent: string };
type Panel = { title: string; text: string };
function AdminSettingsPage({ title, description, latestLabel, status, kpis, panels }: { title: string; description: string; latestLabel: string; status: string; kpis: Kpi[]; panels: Panel[] }) {
  return <main><QualityPageHero label="ADMIN / SETTINGS" title={title} description={description} contextCards={[{ label: "Last Refreshed", value: "Shell only" }, { label: latestLabel, value: "No settings changes yet" }]} /><div style={topMetaRowStyle}><Link href="/admin" style={backLinkStyle}>← Back to Dashboard</Link><div style={statusBannerStyle}><strong>Status:</strong> {status}</div></div><section style={statsGridStyle}>{kpis.map((kpi) => <QualityKpiCard key={kpi.title} title={kpi.title} value={kpi.value} accent={kpi.accent} />)}</section><section style={panelGridStyle}>{panels.map((panel) => <SectionCard key={panel.title} title={panel.title}>{panel.text}</SectionCard>)}</section></main>;
}
function SectionCard({ title, children }: { title: string; children: ReactNode }) { return <section style={panelStyle}><h2 style={sectionTitleStyle}>{title}</h2><p style={emptyTextStyle}>{children}</p></section>; }
const topMetaRowStyle: CSSProperties = { marginBottom: 20, display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" };
const backLinkStyle: CSSProperties = { color: "#0f766e", fontWeight: 700, textDecoration: "none" };
const statusBannerStyle: CSSProperties = { background: "white", borderRadius: "12px", padding: "12px 16px", boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)", color: "#0f172a" };
const statsGridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "16px", marginBottom: "20px" };
const panelGridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "20px" };
const panelStyle: CSSProperties = { background: "white", borderRadius: "18px", padding: "20px", boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)" };
const sectionTitleStyle: CSSProperties = { margin: "0 0 10px", fontSize: "20px", color: "#0f172a" };
const emptyTextStyle: CSSProperties = { color: "#64748b", margin: 0, lineHeight: 1.55 };
