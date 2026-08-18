"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { ImsTabs, ImsTopMetaRow } from "../../../src/components/ImsPrimitives";
import { QualityKpiCard } from "../../../src/components/QualityKpiCard";
import { QualityPageHero } from "../../../src/components/QualityPageHero";
import { ProjectWorkspaceNav } from "../../../src/components/ProjectWorkspaceNav";
import { supabase } from "../../../src/lib/supabase";

type ItpRow = {
  id: string;
  document_number: string;
  title: string;
  supplier: string | null;
  overall_stage: string;
  overall_status: string;
  next_action: string | null;
  due_date: string | null;
};

type NoiRow = {
  id: string;
  itp_id: string;
  section_number: string;
  activity_description: string;
  intervention_type: string;
  planned_date: string | null;
  noi_number: string | null;
  status: string;
};

function dateOnly(value: string | null) {
  return value ? new Date(`${value}T00:00:00`) : null;
}

function formatDate(value: string | null) {
  const date = dateOnly(value);
  return date && !Number.isNaN(date.getTime())
    ? date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    : "Date TBC";
}

export default function WaddenSeaPage() {
  const [itps, setItps] = useState<ItpRow[]>([]);
  const [noiPoints, setNoiPoints] = useState<NoiRow[]>([]);
  const [dashboardView, setDashboardView] = useState<"overview" | "planning" | "controls">("overview");
  const [message, setMessage] = useState("Loading Baltic Power project controls...");

  useEffect(() => {
    void (async () => {
      const [itpResult, noiResult] = await Promise.all([
        supabase
          .from("project_itps")
          .select("id,document_number,title,supplier,overall_stage,overall_status,next_action,due_date")
          .eq("project_key", "baltic-power")
          .order("updated_at", { ascending: false }),
        supabase
          .from("project_noi_points")
          .select("id,itp_id,section_number,activity_description,intervention_type,planned_date,noi_number,status")
          .eq("project_key", "baltic-power")
          .order("planned_date", { ascending: true }),
      ]);
      if (itpResult.error || noiResult.error) {
        setMessage(`Project dashboard failed to load: ${itpResult.error?.message || noiResult.error?.message}`);
        return;
      }
      setItps((itpResult.data || []) as ItpRow[]);
      setNoiPoints((noiResult.data || []) as NoiRow[]);
      setMessage("Baltic Power dashboard ready.");
    })();
  }, []);

  const today = useMemo(() => {
    const value = new Date();
    value.setHours(0, 0, 0, 0);
    return value;
  }, []);
  const horizon = useMemo(() => new Date(today.getTime() + 56 * 86400000), [today]);
  const itpById = useMemo(() => new Map(itps.map((itp) => [itp.id, itp])), [itps]);
  const upcoming = useMemo(() => noiPoints.filter((point) => {
    const date = dateOnly(point.planned_date);
    return date && date >= today && date <= horizon && !/completed|cancelled/i.test(point.status);
  }).sort((left, right) => String(left.planned_date).localeCompare(String(right.planned_date))), [horizon, noiPoints, today]);
  const overdue = useMemo(() => noiPoints.filter((point) => {
    const date = dateOnly(point.planned_date);
    return date && date < today && !/completed|cancelled/i.test(point.status);
  }), [noiPoints, today]);
  const itpAttention = useMemo(() => itps.filter((itp) =>
    /review|comment|reject|draft/i.test(`${itp.overall_stage} ${itp.overall_status}`)
    || Boolean(itp.next_action)
  ), [itps]);
  const noiOutstanding = upcoming.filter((point) => !point.noi_number).length;
  const currentItps = itps.filter((itp) => itp.overall_stage !== "Closed").length;

  return (
    <main style={page}>
      <style>{`
        .project-dashboard-command { margin-bottom: 18px; padding: 10px 12px; background: #fff; border: 1px solid #D0D0CE; border-radius: 16px; box-shadow: 0 1px 3px rgba(15,23,42,.08); }
        .project-dashboard-command .ims-tabs { margin-bottom: 0 !important; }
        .project-dashboard-panel { animation: projectViewEnter 220ms ease-out; }
        @keyframes projectViewEnter { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @media (max-width: 720px) { .project-dashboard-grid, .project-dashboard-kpis, .project-dashboard-quick { grid-template-columns: 1fr !important; } }
      `}</style>
      <QualityPageHero label="Project workspace · BLP" title="Baltic Power" description="Live project controls, upcoming inspections, document reviews, and monthly reporting in one workspace." />

      <ImsTopMetaRow backHref="/projects" backLabel="Back to Project Management" status={<><strong>Status:</strong> {message}</>} />

      <ProjectWorkspaceNav projectKey="baltic-power" active="dashboard" />

      <div className="project-dashboard-command">
        <ImsTabs tabs={[{ value: "overview", label: "Overview" }, { value: "planning", label: "Inspection Planning" }, { value: "controls", label: "Project Controls" }]} active={dashboardView} onChange={setDashboardView} ariaLabel="Baltic Power dashboard views" />
      </div>

      {dashboardView === "overview" ? <div className="project-dashboard-panel" role="tabpanel">
      <section className="quality-kpi-grid project-dashboard-kpis" style={metrics}>
        <QualityKpiCard title="Current ITPs" value={currentItps} accent="#63B1BC" href="/projects/baltic-power/itp" />
        <QualityKpiCard title="ITPs Requiring Attention" value={itpAttention.length} accent="#53565A" href="/projects/baltic-power/itp" />
        <QualityKpiCard title="Upcoming Inspections" value={upcoming.length} accent="#005670" href="/projects/baltic-power/noi" />
        <QualityKpiCard title="NOI Outstanding" value={noiOutstanding} accent="#FFAD00" href="/projects/baltic-power/noi" />
        <QualityKpiCard title="Overdue Inspections" value={overdue.length} accent="#F93822" href="/projects/baltic-power/noi" />
        <QualityKpiCard title="NOI Requirements" value={noiPoints.length} accent="#005670" href="/projects/baltic-power/noi" />
        <QualityKpiCard title="NOI Creator" value="Create" accent="#005670" href="/projects/baltic-power/noi/create" />
        <QualityKpiCard title="ITP Sign-Off" value="Issue" accent="#005670" href="/projects/baltic-power/itp-sign-off" />
      </section>
      </div> : null}

      {dashboardView === "planning" ? <div className="project-dashboard-panel" role="tabpanel">
      <section className="project-dashboard-grid" style={dashboardGrid}>
        <div style={panel}>
          <div style={panelHeader}>
            <div><span style={kicker}>Next 8 weeks</span><h2 style={heading}>Upcoming inspections</h2></div>
            <Link href="/projects/baltic-power/reports" style={actionLink}>Open lookahead →</Link>
          </div>
          <div style={list}>
            {upcoming.length ? upcoming.slice(0, 10).map((point) => {
              const itp = itpById.get(point.itp_id);
              return (
                <div key={point.id} style={row}>
                  <span style={point.intervention_type.includes("H") ? hold : witness}>{point.intervention_type}</span>
                  <span style={identity}><strong>{itp?.supplier || "Supplier TBC"} · {point.section_number}</strong><small>{point.activity_description}</small></span>
                  <span style={dateBlock}><strong>{formatDate(point.planned_date)}</strong><small>{point.noi_number ? `NOI ${point.noi_number}` : "NOI required"}</small></span>
                </div>
              );
            }) : <div style={empty}>No inspections are currently planned within the next eight weeks.</div>}
          </div>
        </div>

        <div style={panel}>
          <div style={panelHeader}>
            <div><span style={kicker}>Action required</span><h2 style={heading}>ITP review priorities</h2></div>
            <Link href="/projects/baltic-power/itp" style={actionLink}>Open ITP tracker →</Link>
          </div>
          <div style={list}>
            {itpAttention.length ? itpAttention.slice(0, 10).map((itp) => (
              <div key={itp.id} style={row}>
                <span style={reviewBadge}>{itp.overall_status}</span>
                <span style={identity}><strong>{itp.document_number} · {itp.supplier || "Supplier TBC"}</strong><small>{itp.title}</small></span>
                <span style={dateBlock}><strong>{itp.due_date ? formatDate(itp.due_date) : "No due date"}</strong><small>{itp.next_action || itp.overall_stage}</small></span>
              </div>
            )) : <div style={empty}>No ITP review actions currently require attention.</div>}
          </div>
        </div>
      </section>
      </div> : null}

      {dashboardView === "controls" ? <div className="project-dashboard-panel" role="tabpanel">
      <section style={quickPanel}>
        <div><span style={kicker}>Quick access</span><h2 style={heading}>Project controls</h2></div>
        <div className="project-dashboard-quick" style={quickGrid}>
          <Link href="/projects/baltic-power/itp" style={quickLink}><strong>Upload or review an ITP</strong><span>Manage metadata, revisions and Enshore decisions.</span></Link>
          <Link href="/projects/baltic-power/noi" style={quickLink}><strong>Maintain NOI requirements</strong><span>Update inspection dates, numbers and status.</span></Link>
          <Link href="/projects/baltic-power/reports" style={quickLink}><strong>Prepare monthly annexes</strong><span>Generate audit and eight-week lookahead outputs.</span></Link>
        </div>
      </section>
      </div> : null}
    </main>
  );
}

const page: CSSProperties = { display: "grid", gap: 0 };
const metrics: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 16, marginBottom: 20 };
const dashboardGrid: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 16, marginBottom: 20 };
const panel: CSSProperties = { background: "#fff", border: "1px solid #D0D0CE", borderRadius: 16, overflow: "hidden", boxShadow: "0 1px 3px rgba(15,23,42,.07)" };
const panelHeader: CSSProperties = { padding: 16, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, borderBottom: "1px solid #D0D0CE" };
const kicker: CSSProperties = { color: "#005670", fontSize: 10, fontWeight: 900, letterSpacing: ".1em", textTransform: "uppercase" };
const heading: CSSProperties = { margin: "3px 0 0", fontSize: 19, color: "#53565A" };
const actionLink: CSSProperties = { color: "#005670", fontSize: 12, fontWeight: 900, textDecoration: "none" };
const list: CSSProperties = { display: "grid" };
const row: CSSProperties = { display: "grid", gridTemplateColumns: "70px minmax(200px,1fr) 145px", gap: 12, alignItems: "center", padding: "11px 14px", borderBottom: "1px solid #D0D0CE", minHeight: 54 };
const identity: CSSProperties = { display: "grid", gap: 3, color: "#53565A", fontSize: 12, minWidth: 0 };
const dateBlock: CSSProperties = { display: "grid", gap: 3, color: "#53565A", fontSize: 11, textAlign: "right" };
const hold: CSSProperties = { padding: "5px 8px", borderRadius: 999, background: "#ECECE7", color: "#F93822", fontWeight: 900, textAlign: "center", fontSize: 11 };
const witness: CSSProperties = { ...hold, background: "#ECECE7", color: "#000000" };
const reviewBadge: CSSProperties = { ...hold, background: "#ECECE7", color: "#53565A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };
const empty: CSSProperties = { padding: 30, color: "#53565A", textAlign: "center", fontSize: 13 };
const quickPanel: CSSProperties = { ...panel, padding: 18, display: "grid", gap: 14 };
const quickGrid: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 12 };
const quickLink: CSSProperties = { display: "grid", gap: 5, padding: 14, borderRadius: 12, border: "1px solid #D0D0CE", background: "#ECECE7", color: "#53565A", textDecoration: "none", fontSize: 12 };



