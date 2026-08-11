import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { QualityKpiCard } from "../../../src/components/QualityKpiCard";
import { QualityPageHero } from "../../../src/components/QualityPageHero";

export default function AdminAssetSettingsPage() {
  return (
    <AdminSettingsPage
      title="Asset Settings"
      description="Placeholder settings area for asset categories, status values, inspection intervals, maintenance intervals, and calibration presets."
      latestLabel="Latest Asset Setting"
      status="Asset Settings shell ready. Existing Asset Management data and forms are unchanged."
      kpis={[
        { title: "Asset Categories", value: "Pending", accent: "#63B1BC" },
        { title: "Status Values", value: "Pending", accent: "#005670" },
        { title: "Inspection Rules", value: "Future", accent: "#FFAD00" },
        { title: "Document ID Codes", value: "Controlled", accent: "#53565A" },
      ]}
      panels={[
        { title: "Future Editable Settings", text: "Asset categories, status values, calibration frequencies, inspection intervals, maintenance intervals, and controlled Document ID Code rules." },
        { title: "Current Pass", text: "Shell only. Existing asset create/edit, QR, inspection, maintenance, calibration, and reporting logic remains untouched." },
      ]}
    />
  );
}

type Kpi = { title: string; value: ReactNode; accent: string };
type Panel = { title: string; text: string };
function AdminSettingsPage({ title, description, latestLabel, status, kpis, panels }: { title: string; description: string; latestLabel: string; status: string; kpis: Kpi[]; panels: Panel[] }) {
  return <main><QualityPageHero label="ADMIN / SETTINGS" title={title} description={description} contextCards={[{ label: "Last Refreshed", value: "Shell only" }, { label: latestLabel, value: "No settings changes yet" }]} /><div style={topMetaRowStyle}><Link href="/home" style={backLinkStyle}>← Back to IMS Home</Link><div style={statusBannerStyle}><strong>Status:</strong> {status}</div></div><section style={statsGridStyle}>{kpis.map((kpi) => <QualityKpiCard key={kpi.title} title={kpi.title} value={kpi.value} accent={kpi.accent} />)}</section><section style={panelGridStyle}>{panels.map((panel) => <SectionCard key={panel.title} title={panel.title}>{panel.text}</SectionCard>)}</section></main>;
}
function SectionCard({ title, children }: { title: string; children: ReactNode }) { return <section style={panelStyle}><h2 style={sectionTitleStyle}>{title}</h2><p style={emptyTextStyle}>{children}</p></section>; }
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
const backLinkStyle: CSSProperties = { color: "#005670", fontWeight: 700, textDecoration: "none" };
const statusBannerStyle: CSSProperties = { background: "white", borderRadius: "12px", padding: "12px 16px", boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)", color: "#000000" };
const statsGridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "16px", marginBottom: "20px" };
const panelGridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "20px" };
const panelStyle: CSSProperties = { background: "white", borderRadius: "18px", padding: "20px", boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)" };
const sectionTitleStyle: CSSProperties = { margin: "0 0 10px", fontSize: "20px", color: "#000000" };
const emptyTextStyle: CSSProperties = { color: "#53565A", margin: 0, lineHeight: 1.55 };
