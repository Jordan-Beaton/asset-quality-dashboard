import type { CSSProperties, ReactElement } from "react";
import { imsColours, imsTableStyle, imsTableHeadStyle, imsTableCellStyle } from "../imsTheme";
import {
  GuideDefinition, GuideSectionDef,
  eyebrow, h2Style, h3Style, pStyle, codeStyle,
  stepList, Step, callout,
  mockPanel, mockHero, mockHeroEyebrow, mockLabel, flowWrap, flowStep, arrow,
  mockInput, mockFieldLabel, mockRow, mockField, btn, pill,
} from "./guideKit";

type SectionKey =
  | "overview" | "register" | "create" | "form" | "temporary"
  | "workflow" | "linkedaction" | "reports" | "statuses";

const sections: GuideSectionDef[] = [
  { key: "overview",     label: "Overview",                 group: "Getting Started" },
  { key: "register",     label: "The Register",             group: "Getting Started" },
  { key: "create",       label: "Starting an MOC",           group: "Core Workflows" },
  { key: "form",         label: "Completing the Form",       group: "Core Workflows" },
  { key: "temporary",    label: "Temporary Changes",         group: "Core Workflows" },
  { key: "workflow",     label: "Review & Approval",         group: "Core Workflows" },
  { key: "linkedaction", label: "Linked Actions",            group: "Linked Records" },
  { key: "reports",      label: "PDF & Word Output",         group: "Reports" },
  { key: "statuses",     label: "Status Reference",          group: "Reference" },
];

function badge(status: string): CSSProperties {
  const map: Record<string, { bg: string; color: string }> = {
    draft:      { bg: imsColours.page,       color: imsColours.muted },
    "in review": { bg: imsColours.warning,   color: "#ffffff" },
    approved:   { bg: imsColours.brand,      color: "#ffffff" },
    closed:     { bg: imsColours.brandAccent, color: "#ffffff" },
  };
  const t = map[status.toLowerCase()] || map.draft;
  return pill(t.bg, t.color);
}

function SectionOverview() {
  return (
    <>
      <div style={eyebrow}>Getting Started</div>
      <h2 style={h2Style}>Overview</h2>
      <p style={pStyle}>Management of Change (MOC) formally records any change to a project, process, or work method before it happens — capturing what&apos;s changing, why, the risk and cost impact, and who has reviewed and endorsed it. Every MOC is a full, structured form built from thirteen lettered sections (A–M), covering everything from change identification through to close-out verification.</p>
      <div style={flowWrap}>
        <div style={flowStep()}>Draft</div><div style={arrow}>→</div>
        <div style={flowStep()}>In Review</div><div style={arrow}>→</div>
        <div style={flowStep()}>Approved</div><div style={arrow}>→</div>
        <div style={flowStep(true)}>Closed</div>
      </div>
      <h3 style={h3Style}>Change type</h3>
      <p style={pStyle}>Every MOC is tagged <strong>Permanent</strong> or <strong>Temporary</strong> at creation. A Temporary change carries a validity end date and is surfaced on the dashboard&apos;s <strong>Temporary Change Watch</strong> as it approaches or passes that date, so it isn&apos;t forgotten and quietly left in place.</p>
    </>
  );
}

function SectionRegister() {
  return (
    <>
      <div style={eyebrow}>Getting Started</div>
      <h2 style={h2Style}>The MOC Register</h2>
      <div style={mockPanel}>
        <div style={{ ...mockHero, marginTop: 0 }}>
          <div style={mockHeroEyebrow}>Enshore IMS · Quality Management</div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>MOC Register</div>
        </div>
        <table style={imsTableStyle}>
          <thead>
            <tr>
              {["MOC No.", "Title", "Change Type", "Status", "Valid To"].map(h => (
                <th key={h} style={imsTableHeadStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ ...imsTableCellStyle, fontWeight: 800, color: imsColours.brand, whiteSpace: "nowrap" }}>MOC-0014</td>
              <td style={imsTableCellStyle}>Temporary re-route of cable lay vessel due to weather</td>
              <td style={imsTableCellStyle}>Temporary</td>
              <td style={imsTableCellStyle}><span style={badge("in review")}>In Review</span></td>
              <td style={{ ...imsTableCellStyle, color: imsColours.danger, fontWeight: 700 }}>02 Sep 2026 ⚠</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p style={pStyle}>The Dashboard tab shows <strong>MOC Workload</strong> (a quick split of Draft / In Review / Approved / Closed) and <strong>Temporary Change Watch</strong> for time-bound changes needing attention. Click any row in the register to open the full detail panel.</p>
    </>
  );
}

function SectionCreate() {
  return (
    <>
      <div style={eyebrow}>Core Workflows</div>
      <h2 style={h2Style}>Starting an MOC</h2>
      <div style={stepList}>
        <Step n={1}>Go to the <strong>Create</strong> tab. The <code style={codeStyle}>MOC Report No.</code> is generated automatically and <code style={codeStyle}>Status</code> starts at <span style={badge("draft")}>Draft</span>.</Step>
        <Step n={2}>Enter the <code style={codeStyle}>MOC Report Title</code> and <code style={codeStyle}>Project / Worksite Address</code>.</Step>
        <Step n={3}>Select the <code style={codeStyle}>MOC Co-Ordinator Name</code> and <code style={codeStyle}>Responsible ENS Manager / Supervisor</code> — both from People Management.</Step>
        <Step n={4}>Choose <code style={codeStyle}>Change Type</code> — <strong>Permanent</strong> or <strong>Temporary</strong>. If Temporary, a validity end date field appears.</Step>
        <Step n={5}>Click <strong>Create MOC</strong>. The record opens in the full detail panel to complete the remaining sections.</Step>
      </div>
      <div style={mockPanel}>
        <div style={mockLabel}>Create MOC starter form</div>
        <div style={mockRow}>
          <div style={mockField()}><div style={mockFieldLabel}>MOC Report No.</div><input style={mockInput} defaultValue="MOC-0014" readOnly /></div>
          <div style={mockField()}><div style={mockFieldLabel}>Status</div><input style={mockInput} defaultValue="Draft" readOnly /></div>
        </div>
        <div style={mockRow}>
          <div style={mockField()}><div style={mockFieldLabel}>MOC Co-Ordinator</div><select style={mockInput}><option>Jordan Beaton</option></select></div>
          <div style={mockField()}><div style={mockFieldLabel}>Change Type</div><select style={mockInput}><option>Temporary</option></select></div>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <span style={btn("primary")}>Create MOC</span>
        </div>
      </div>
    </>
  );
}

function SectionForm() {
  const rows: [string, string][] = [
    ["A", "MOC Report Details — report number, title, coordinator, and dates."],
    ["B", "Change Identification — what is changing and why."],
    ["C", "Action Plan — the steps required to implement the change."],
    ["D", "Change Impact — who and what the change affects."],
    ["E", "Affected Documentation — procedures, drawings, or records that need updating."],
    ["F", "Risk Management — risk assessment for the change."],
    ["G", "Hazards & Mitigating Actions — specific hazards introduced and how they're controlled."],
    ["H", "Cost Review — cost impact of the change."],
    ["I", "Schedule Review — schedule impact of the change."],
    ["J", "Supporting Documentation and Information — attach any supporting files."],
    ["K", "Review and Endorsement — reviewer sign-off before approval."],
    ["L", "MOC Change Acceptance — formal acceptance of the change."],
    ["M", "MOC Close-out Verification — confirmation the change was implemented as planned."],
  ];
  return (
    <>
      <div style={eyebrow}>Core Workflows</div>
      <h2 style={h2Style}>Completing the MOC Form</h2>
      <p style={pStyle}>The detail panel walks through thirteen lettered sections in order. All sections are editable at any status — there is no requirement to complete them strictly top to bottom, but Section K should be completed before moving the MOC to Approved, and Section M before Closing it.</p>
      <div style={{ overflowX: "auto" }}>
        <table style={imsTableStyle}>
          <thead>
            <tr>
              {["Section", "Covers"].map(h => <th key={h} style={imsTableHeadStyle}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map(([letter, desc]) => (
              <tr key={letter}>
                <td style={{ ...imsTableCellStyle, fontWeight: 800, color: imsColours.brand, whiteSpace: "nowrap" }}>{letter}.</td>
                <td style={imsTableCellStyle}>{desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={callout("info")}>
        <span>ℹ</span>
        <div>Click <strong>Save Changes</strong> from any point in the form — you do not need to complete every section in a single sitting.</div>
      </div>
    </>
  );
}

function SectionTemporary() {
  return (
    <>
      <div style={eyebrow}>Core Workflows</div>
      <h2 style={h2Style}>Temporary Changes</h2>
      <p style={pStyle}>A <strong>Temporary</strong> change must have a clear end date and a plan to revert once that date passes. The system tracks this automatically.</p>
      <div style={stepList}>
        <Step n={1}>Set <code style={codeStyle}>Change Type</code> to <strong>Temporary</strong> in Section A or at creation.</Step>
        <Step n={2}>Enter the <code style={codeStyle}>Valid To</code> date — the date the temporary change must be reverted or made permanent.</Step>
        <Step n={3}>The MOC appears on the Dashboard&apos;s <strong>Temporary Change Watch</strong> as that date approaches, and is flagged once it passes.</Step>
        <Step n={4}>When the change is resolved, either revert it and set <code style={codeStyle}>Status</code> to <span style={badge("closed")}>Closed</span>, or raise a new MOC to make it permanent.</Step>
      </div>
      <div style={callout("warning")}>
        <span>⚠</span>
        <div>A Temporary MOC past its <code style={codeStyle}>Valid To</code> date counts as a <strong>Critical Pressure</strong> item on the Quality dashboard until it&apos;s closed or superseded by a Permanent MOC.</div>
      </div>
    </>
  );
}

function SectionWorkflow() {
  return (
    <>
      <div style={eyebrow}>Core Workflows</div>
      <h2 style={h2Style}>Review & Approval</h2>
      <p style={pStyle}>MOC status progresses in a single direction, one step at a time, using the workflow button in the detail panel — its label changes depending on the current status.</p>
      <div style={stepList}>
        <Step n={1}>With Sections A–J complete, click <strong>Mark In Review</strong>. Status moves from <span style={badge("draft")}>Draft</span> to <span style={badge("in review")}>In Review</span>.</Step>
        <Step n={2}>Complete Section K — Review and Endorsement — recording who reviewed the change.</Step>
        <Step n={3}>Click <strong>Mark Approved</strong>. Status moves to <span style={badge("approved")}>Approved</span>, and Section L (MOC Change Acceptance) should be completed.</Step>
        <Step n={4}>Once the change has been implemented and verified, complete Section M — Close-out Verification.</Step>
        <Step n={5}>Click <strong>Mark Closed</strong>. Status moves to <span style={badge("closed")}>Closed</span>.</Step>
      </div>
    </>
  );
}

function SectionLinkedAction() {
  return (
    <>
      <div style={eyebrow}>Linked Records</div>
      <h2 style={h2Style}>Generating a Linked Action</h2>
      <p style={pStyle}>Use a linked central Action for any follow-up task from the MOC that needs its own owner, priority, and due date tracked outside the MOC record itself — for example, a specific implementation step from the Action Plan in Section C.</p>
      <div style={stepList}>
        <Step n={1}>Open the MOC and click <strong>Generate Linked Action</strong>.</Step>
        <Step n={2}>Complete the Action&apos;s title, description, department, owner, priority, and target date.</Step>
        <Step n={3}>Click <strong>Save Action</strong>. It appears in central <strong>Actions</strong> tagged with source <code style={codeStyle}>MOC</code> and a chip linking back to this MOC, and in the owner&apos;s <strong>My Actions</strong> view.</Step>
      </div>
    </>
  );
}

function SectionReports() {
  return (
    <>
      <div style={eyebrow}>Reports</div>
      <h2 style={h2Style}>PDF & Word Output</h2>
      <div style={stepList}>
        <Step n={1}>Open the MOC and go to the <strong>Reports</strong> tab, or use the MOC Reports workspace tab for saved records.</Step>
        <Step n={2}>Click <strong>Generate PDF</strong> or <strong>Generate Word</strong>.</Step>
        <Step n={3}>The output includes all thirteen lettered sections, the Enshore branded header, and the current status — suitable for circulation to stakeholders who don&apos;t have IMS access.</Step>
      </div>
      <div style={callout("info")}>
        <span>ℹ</span>
        <div>Generated outputs reflect a point-in-time snapshot. Re-generate after any further edits to the MOC so circulated copies stay current.</div>
      </div>
    </>
  );
}

function SectionStatuses() {
  const rows: [string, string, string][] = [
    ["draft", "Draft", "Being drafted. Sections can be completed in any order."],
    ["in review", "In Review", "Submitted for review — Section K (Review and Endorsement) should be completed."],
    ["approved", "Approved", "Endorsed and accepted — Section L should be completed. Change may proceed."],
    ["closed", "Closed", "Change implemented and verified — Section M complete."],
  ];
  return (
    <>
      <div style={eyebrow}>Reference</div>
      <h2 style={h2Style}>Status Reference</h2>
      <table style={imsTableStyle}>
        <thead>
          <tr>
            {["Status", "Meaning"].map(h => <th key={h} style={imsTableHeadStyle}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map(([key, label, meaning]) => (
            <tr key={label}>
              <td style={{ ...imsTableCellStyle, whiteSpace: "nowrap" }}><span style={badge(key)}>{label}</span></td>
              <td style={imsTableCellStyle}>{meaning}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

const sectionComponents: Record<SectionKey, () => ReactElement> = {
  overview:     SectionOverview,
  register:     SectionRegister,
  create:       SectionCreate,
  form:         SectionForm,
  temporary:    SectionTemporary,
  workflow:     SectionWorkflow,
  linkedaction: SectionLinkedAction,
  reports:      SectionReports,
  statuses:     SectionStatuses,
};

export const mocGuide: GuideDefinition = {
  id: "moc",
  navLabel: "MOC",
  guideLabel: "MOC",
  defaultSection: "overview",
  sections,
  sectionComponents,
};
