"use client";

// Workbench pieces for the MOC form: the stage bar, the readiness checks that mirror what the PDF/Word output prints,
// and a live preview of the document. Everything here is read-only; the form itself stays in app/moc/page.tsx.

import type { CSSProperties } from "react";

export type MocStage = "describe" | "assess" | "plan" | "signoff";

export type MocViewMode = "form" | "split" | "report";

const VIEW_OPTIONS: Array<{ key: MocViewMode; label: string; hint: string }> = [
  { key: "form", label: "Form", hint: "Full-width form, report hidden" },
  { key: "split", label: "Split", hint: "Form beside the report as it builds" },
  { key: "report", label: "Report", hint: "Full-width report" },
];

// Chooses how much of the screen the form and the live report get.
export function MocViewToggle({ view, onChange }: { view: MocViewMode; onChange: (view: MocViewMode) => void }) {
  return (
    <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      <span style={{ fontSize: 12, color: "#53565A", fontWeight: 700 }}>View</span>
      <div role="group" aria-label="Form and report layout" style={{ display: "inline-flex", border: "1px solid #D0D0CE", borderRadius: 10, overflow: "hidden", background: "#ffffff" }}>
        {VIEW_OPTIONS.map((option) => {
          const active = view === option.key;
          return (
            <button
              key={option.key}
              type="button"
              title={option.hint}
              aria-pressed={active}
              onClick={() => onChange(option.key)}
              style={{
                border: 0,
                padding: "7px 16px",
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
                background: active ? "#005670" : "#ffffff",
                color: active ? "#ffffff" : "#000000",
              }}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export const MOC_STAGES: Array<{ key: MocStage; label: string; sections: string }> = [
  { key: "describe", label: "1  Describe", sections: "Sections A, B" },
  { key: "assess", label: "2  Assess", sections: "Sections D, F, G, H, I" },
  { key: "plan", label: "3  Plan", sections: "Sections C, E, J" },
  { key: "signoff", label: "4  Sign-off", sections: "Sections K, L, M" },
];

type Loose = Record<string, string | number | boolean | string[] | null | undefined>;
type ActionLike = { action_no: string; description: string; responsible_person: string; target_date: string; status: string };
type DocLike = { number: string; title: string; rev: string };
type ReviewLike = { involved_party: string; approve_flag: boolean; inform_flag: boolean; name: string; position: string; approved_value: string };
type SignoffLike = { role_label: string; name: string; signoff_date: string };

export type MocPreviewData = {
  report: Loose;
  actions: ActionLike[];
  affectedDocuments: DocLike[];
  riskDocuments: DocLike[];
  reviews: ReviewLike[];
  acceptance: SignoffLike[];
  closeout: SignoffLike[];
};

export type MocCheck = { stage: MocStage; label: string; ok: boolean };

const IMPACT_LABELS: Array<[string, string]> = [
  ["impact_health_safety", "Health & Safety"],
  ["impact_environment", "Environment"],
  ["impact_quality", "Quality"],
  ["impact_scm", "SCM"],
  ["impact_schedule", "Schedule"],
  ["impact_equipment", "Equipment"],
  ["impact_fabrication_opps", "Fabrication Opps"],
  ["impact_engineering", "Engineering"],
  ["impact_marine_operations", "Marine operations"],
  ["impact_organization", "Organization"],
  ["impact_regulatory", "Regulatory"],
  ["impact_documentation", "Documentation"],
  ["impact_reputation", "Reputation"],
  ["impact_simops", "SIMOPS"],
  ["impact_other", "Other"],
];

const text = (report: Loose, key: string) => String(report[key] ?? "").trim();

// The things the generated PDF / Word document prints. A blank here is a blank in the document.
export function computeMocChecks(data: MocPreviewData): MocCheck[] {
  const r = data.report;
  const checks: MocCheck[] = [];
  const add = (stage: MocStage, label: string, ok: boolean) => checks.push({ stage, label, ok });

  add("describe", "Title", Boolean(text(r, "moc_report_title")));
  add("describe", "Project / worksite", Boolean(text(r, "project_worksite_address")));
  add("describe", "MOC co-ordinator", Boolean(text(r, "moc_coordinator_name")));
  add("describe", "Responsible manager", Boolean(text(r, "responsible_manager_name")));
  add("describe", "Description of the change", Boolean(text(r, "proposed_change_description")));
  add("describe", "Reason for the change", Boolean(text(r, "reason_for_change")));
  if (text(r, "change_type") === "Temporary") {
    add("describe", "Temporary dates", Boolean(text(r, "temporary_valid_from") && text(r, "temporary_valid_to")));
  }

  add("assess", "At least one impact area", IMPACT_LABELS.some(([key]) => Boolean(r[key])));
  if (r["impact_other"]) add("assess", "Other impact specified", Boolean(text(r, "impact_other_text")));
  if (text(r, "hira_required") === "No") add("assess", "Reason a HIRA is not required", Boolean(text(r, "hira_reason")));
  if (text(r, "lifting_change_status") === "Yes") add("assess", "Lifting change described", Boolean(text(r, "lifting_change_description")));
  if (text(r, "ptw_change_status") === "Yes") add("assess", "PTW change described", Boolean(text(r, "ptw_change_description")));
  add("assess", "Hazards and risks", Boolean(text(r, "hazard_risks_description")));
  add("assess", "Proposed mitigations", Boolean(text(r, "proposed_risk_mitigations")));
  add("assess", "Cost impact", Boolean(text(r, "cost_review_description")));
  add("assess", "Schedule impact", Boolean(text(r, "schedule_review_description")));

  add("plan", "At least one action", data.actions.some((row) => row.description.trim()));

  const reviewers = data.reviews.filter((row) => row.approve_flag || row.inform_flag);
  add("signoff", "Reviewers chosen (Approve or Inform)", reviewers.length > 0);
  add("signoff", "A person named for every chosen reviewer", reviewers.length > 0 && reviewers.every((row) => row.name.trim()));
  add("signoff", "Acceptance names (first two rows)", data.acceptance.slice(0, 2).every((row) => row.name.trim()) && data.acceptance.length >= 2);
  return checks;
}

export function stageProgress(checks: MocCheck[], stage: MocStage) {
  const own = checks.filter((check) => check.stage === stage);
  if (!own.length) return 1;
  return own.filter((check) => check.ok).length / own.length;
}

const navy = "#005670";
const line = "#D0D0CE";

const stageBarStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8, margin: "4px 0 14px" };

export function MocStageBar({ stage, onChange, checks }: { stage: MocStage; onChange: (stage: MocStage) => void; checks: MocCheck[] }) {
  return (
    <div style={stageBarStyle} role="tablist" aria-label="MOC stages">
      {MOC_STAGES.map((item) => {
        const progress = stageProgress(checks, item.key);
        const active = stage === item.key;
        return (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.key)}
            style={{
              display: "grid",
              gap: 6,
              textAlign: "left",
              padding: "10px 12px",
              borderRadius: 10,
              border: `1px solid ${active ? navy : line}`,
              boxShadow: active ? `inset 0 -3px 0 ${navy}` : "none",
              background: "#ffffff",
              color: "#000000",
              cursor: "pointer",
            }}
          >
            <span style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 13 }}>
              <span>{item.label}</span>
              <span style={{ color: progress === 1 ? "#005670" : "#53565A" }}>{Math.round(progress * 100)}%</span>
            </span>
            <span style={{ fontSize: 11.5, color: "#53565A" }}>{item.sections}</span>
            <span style={{ height: 4, borderRadius: 9, background: "#ECECE7", overflow: "hidden" }}>
              <span style={{ display: "block", height: "100%", width: `${progress * 100}%`, background: progress === 1 ? "#005670" : navy }} />
            </span>
          </button>
        );
      })}
    </div>
  );
}

const paperStyle: CSSProperties = { background: "#ffffff", color: "#000000", border: `1px solid ${line}`, borderRadius: 6, padding: "20px 22px", fontSize: 12, display: "grid", gap: 10 };
const bandStyle: CSSProperties = { background: navy, color: "#ffffff", fontSize: 10.5, letterSpacing: "0.08em", textTransform: "uppercase", padding: "4px 8px", fontWeight: 700 };
const cellStyle: CSSProperties = { border: "1px solid #D0D0CE", padding: "4px 6px", textAlign: "left", verticalAlign: "top", fontSize: 11.5 };
const headStyle: CSSProperties = { ...cellStyle, background: "#ECECE7", fontSize: 10, textTransform: "uppercase" };
const emptyStyle: CSSProperties = { color: "#53565A", fontStyle: "italic" };

function Value({ value }: { value: string }) {
  return value.trim() ? <>{value}</> : <span style={emptyStyle}>not yet entered</span>;
}

export function MocLivePreview({ data, onJump, wide = false }: { data: MocPreviewData; onJump: (stage: MocStage) => void; wide?: boolean }) {
  const r = data.report;
  const checks = computeMocChecks(data);
  const gaps = checks.filter((check) => !check.ok);
  const impacts = IMPACT_LABELS.filter(([key]) => Boolean(r[key])).map(([key, label]) => (key === "impact_other" && text(r, "impact_other_text") ? `${label} (${text(r, "impact_other_text")})` : label));
  const actions = data.actions.filter((row) => row.description.trim());
  const affected = data.affectedDocuments.filter((row) => row.number.trim() || row.title.trim());
  const risk = data.riskDocuments.filter((row) => row.number.trim() || row.title.trim());
  const reviewers = data.reviews.filter((row) => row.approve_flag || row.inform_flag);

  return (
    <aside
      style={wide ? { display: "grid", gap: 10, alignContent: "start", maxWidth: 980, width: "100%", margin: "0 auto" } : { display: "grid", gap: 10, alignContent: "start", position: "sticky", top: 12, maxHeight: "calc(100vh - 24px)", overflowY: "auto", overscrollBehavior: "contain", paddingRight: 4 }}
      aria-label="Live MOC document preview"
    >
      <div style={{ border: `1px solid ${gaps.length ? "#FFAD00" : "#005670"}`, background: gaps.length ? "#ECECE7" : "#EEF7F8", borderRadius: 8, padding: "10px 12px", fontSize: 12.5 }}>
        <strong>{gaps.length ? `${gaps.length} item${gaps.length === 1 ? "" : "s"} the PDF and Word document will print blank` : "Everything the PDF and Word document print is filled in"}</strong>
        {gaps.length ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
            {gaps.map((gap) => (
              <button
                key={`${gap.stage}-${gap.label}`}
                type="button"
                onClick={() => onJump(gap.stage)}
                style={{ border: "1px solid #FFAD00", background: "#ffffff", borderRadius: 99, padding: "3px 10px", fontSize: 11.5, cursor: "pointer", color: "#000000" }}
              >
                {gap.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div style={paperStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
          <strong style={{ fontSize: 15 }}>Management of Change Report</strong>
          <strong style={{ color: navy }}>{text(r, "moc_report_no")}</strong>
        </div>

        <div style={bandStyle}>A. MOC report details</div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            <tr><th style={headStyle}>Title</th><td style={cellStyle} colSpan={3}><Value value={text(r, "moc_report_title")} /></td></tr>
            <tr><th style={headStyle}>Project</th><td style={cellStyle}><Value value={text(r, "project_worksite_address")} /></td><th style={headStyle}>Status</th><td style={cellStyle}>{text(r, "status")}</td></tr>
            <tr><th style={headStyle}>Co-ordinator</th><td style={cellStyle}><Value value={text(r, "moc_coordinator_name")} /></td><th style={headStyle}>Manager</th><td style={cellStyle}><Value value={text(r, "responsible_manager_name")} /></td></tr>
          </tbody>
        </table>

        <div style={bandStyle}>B. Change identification</div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            <tr><th style={headStyle}>Type</th><td style={cellStyle}>{text(r, "change_type")}{text(r, "change_type") === "Temporary" ? ` (${text(r, "temporary_valid_from") || "?"} to ${text(r, "temporary_valid_to") || "?"})` : ""}</td></tr>
            <tr><th style={headStyle}>Change</th><td style={cellStyle}><Value value={text(r, "proposed_change_description")} /></td></tr>
            <tr><th style={headStyle}>Reason</th><td style={cellStyle}><Value value={text(r, "reason_for_change")} /></td></tr>
          </tbody>
        </table>

        <div style={bandStyle}>C. Action plan</div>
        {actions.length ? (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><th style={headStyle}>#</th><th style={headStyle}>Action</th><th style={headStyle}>Owner</th><th style={headStyle}>Target</th><th style={headStyle}>Status</th></tr></thead>
            <tbody>
              {actions.slice(0, 12).map((row, index) => (
                <tr key={index}><td style={cellStyle}>{row.action_no || index + 1}</td><td style={cellStyle}>{row.description}</td><td style={cellStyle}>{row.responsible_person || "-"}</td><td style={cellStyle}>{row.target_date || "-"}</td><td style={cellStyle}>{row.status || "Open"}</td></tr>
              ))}
              {actions.length > 12 ? <tr><td style={cellStyle} colSpan={5}>{actions.length - 12} more in the document</td></tr> : null}
            </tbody>
          </table>
        ) : <span style={emptyStyle}>no actions yet</span>}

        <div style={bandStyle}>D. Change impact</div>
        <div>{impacts.length ? impacts.map((label) => <span key={label} style={{ display: "inline-block", background: "#EEF7F8", color: navy, borderRadius: 3, padding: "1px 6px", margin: 2, fontSize: 11, fontWeight: 600 }}>{label}</span>) : <span style={emptyStyle}>none selected</span>}</div>

        <div style={bandStyle}>E. Affected documentation</div>
        {affected.length ? <div>{affected.map((row, index) => <div key={index}>{row.number} {row.title} {row.rev ? `Rev ${row.rev}` : ""}</div>)}</div> : <span style={emptyStyle}>none listed</span>}

        <div style={bandStyle}>F. Risk management</div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            <tr><th style={headStyle}>HIRA required</th><td style={cellStyle}>{text(r, "hira_required") || "N/A"}{text(r, "hira_required") === "No" ? ` - ${text(r, "hira_reason") || "reason needed"}` : ""}</td></tr>
            <tr><th style={headStyle}>Lifting change</th><td style={cellStyle}>{text(r, "lifting_change_status") || "N/A"}</td></tr>
            <tr><th style={headStyle}>PTW change</th><td style={cellStyle}>{text(r, "ptw_change_status") || "N/A"}</td></tr>
            {risk.length ? <tr><th style={headStyle}>Risk documents</th><td style={cellStyle}>{risk.map((row) => `${row.number} ${row.title}`).join("; ")}</td></tr> : null}
          </tbody>
        </table>

        <div style={bandStyle}>G. Hazards and mitigating actions</div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            <tr><th style={headStyle}>Hazards</th><td style={cellStyle}><Value value={text(r, "hazard_risks_description")} /></td></tr>
            <tr><th style={headStyle}>Mitigations</th><td style={cellStyle}><Value value={text(r, "proposed_risk_mitigations")} /></td></tr>
          </tbody>
        </table>

        <div style={bandStyle}>H and I. Cost and schedule</div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            <tr><th style={headStyle}>Cost</th><td style={cellStyle}><Value value={text(r, "cost_review_description")} /></td></tr>
            <tr><th style={headStyle}>Schedule</th><td style={cellStyle}><Value value={text(r, "schedule_review_description")} /></td></tr>
          </tbody>
        </table>

        <div style={bandStyle}>K. Review and endorsement</div>
        {reviewers.length ? (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><th style={headStyle}>Party</th><th style={headStyle}>Name</th><th style={headStyle}>Role</th><th style={headStyle}>Decision</th></tr></thead>
            <tbody>
              {reviewers.map((row, index) => (
                <tr key={index}>
                  <td style={cellStyle}>{row.involved_party}</td>
                  <td style={cellStyle}>{row.name || <span style={emptyStyle}>choose a person</span>}</td>
                  <td style={cellStyle}>{row.approve_flag ? "Approve" : "Inform"}</td>
                  <td style={cellStyle}>{row.approved_value === "Yes" ? "Approved" : row.approved_value === "No" ? "Rejected" : row.inform_flag && !row.approve_flag ? "For information" : "Awaiting"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <span style={emptyStyle}>no reviewers chosen yet</span>}

        <div style={bandStyle}>L. Change acceptance</div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            {data.acceptance.map((row, index) => (
              <tr key={index}><th style={headStyle}>{row.role_label}</th><td style={cellStyle}>{row.name || <span style={emptyStyle}>not yet named</span>}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </aside>
  );
}
