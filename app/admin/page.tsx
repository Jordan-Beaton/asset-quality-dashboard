import type { CSSProperties, ReactNode } from "react";
import { QualityKpiCard } from "../../src/components/QualityKpiCard";
import { QualityPageHero } from "../../src/components/QualityPageHero";

export default function AdminDashboardPage() {
  return (
    <main>
      <QualityPageHero
        label="ADMIN / SETTINGS"
        title="Admin Dashboard"
        description="Controlled shell for master data, reference values, roles, document settings, module settings, and system configuration."
        contextCards={[
          { label: "Last Refreshed", value: "Shell only" },
          { label: "Latest Setting Update", value: "No editable settings yet" },
        ]}
      />

      <div style={topMetaRowStyle}>
        <div style={statusBannerStyle}>
          <strong>Status:</strong> Admin / Settings shell ready. No live reference data is editable in this pass.
        </div>
      </div>

      <section style={statsGridStyle}>
        <QualityKpiCard title="Departments" value="Configured" accent="#3A9B98" />
        <QualityKpiCard title="People / Roles" value="Linked" accent="#2563eb" />
        <QualityKpiCard title="Document Settings" value="Pending" accent="#7c3aed" />
        <QualityKpiCard title="Asset Settings" value="Pending" accent="#f59e0b" />
        <QualityKpiCard title="Risk Settings" value="Pending" accent="#dc2626" />
        <QualityKpiCard title="System Settings" value="Shell" accent="#64748b" />
      </section>

      <section style={dashboardGridStyle}>
        <DashboardPanel title="Master Data Control" text="Future settings can control departments, reference values, and active/inactive master data safely." />
        <DashboardPanel title="Numbering & Document Control" text="Future settings can govern document types, department codes, review cycles, and numbering rules without changing existing documents." />
        <DashboardPanel title="Module Reference Settings" text="Asset, Risk, Action, HSE, and Quality reference values can be reviewed here before any editable configuration is introduced." />
        <DashboardPanel title="System Configuration" text="Branding, report defaults, notification settings, and governance controls can be introduced in later phases." />
      </section>
    </main>
  );
}

function DashboardPanel({ title, text }: { title: string; text: string }) {
  return (
    <section style={panelStyle}>
      <h2 style={panelTitleStyle}>{title}</h2>
      <p style={emptyTextStyle}>{text}</p>
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
const statusBannerStyle: CSSProperties = { background: "white", borderRadius: "12px", padding: "12px 16px", boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)", color: "#0f172a" };
const statsGridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(6, minmax(0, 1fr))", gap: "16px", marginBottom: "20px" };
const dashboardGridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "20px" };
const panelStyle: CSSProperties = { background: "white", borderRadius: "18px", padding: "20px", boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)" };
const panelTitleStyle: CSSProperties = { margin: "0 0 10px", fontSize: "20px", color: "#0f172a" };
const emptyTextStyle: CSSProperties = { color: "#64748b", margin: 0, lineHeight: 1.55 };
