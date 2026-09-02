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
  | "overview" | "register" | "notification" | "part1" | "part2"
  | "linkedaction" | "signoff" | "external" | "reports" | "statuses";

const sections: GuideSectionDef[] = [
  { key: "overview",     label: "Overview",               group: "Getting Started" },
  { key: "register",     label: "The Register",           group: "Getting Started" },
  { key: "notification", label: "Raising a Notification", group: "Core Workflows" },
  { key: "part1",        label: "Part 1 — Immediate Response", group: "Core Workflows" },
  { key: "part2",        label: "Part 2 — Investigation",  group: "Core Workflows" },
  { key: "signoff",      label: "Sign-off",                group: "Core Workflows" },
  { key: "linkedaction", label: "Linked Actions",          group: "Linked Records" },
  { key: "external",     label: "External AINM",           group: "External Notifications" },
  { key: "reports",      label: "Reports & Compiled PDF",  group: "Reports" },
  { key: "statuses",     label: "Status Reference",        group: "Reference" },
];

function badge(status: string): CSSProperties {
  const map: Record<string, { bg: string; color: string }> = {
    open:          { bg: imsColours.danger,     color: "#ffffff" },
    "in progress": { bg: imsColours.warning,    color: "#ffffff" },
    closed:        { bg: imsColours.brand,      color: "#ffffff" },
    "not started": { bg: imsColours.page,       color: imsColours.muted },
    draft:         { bg: imsColours.page,       color: imsColours.muted },
    issued:        { bg: imsColours.brandAccent, color: "#ffffff" },
    complete:      { bg: imsColours.brand,      color: "#ffffff" },
  };
  const t = map[status.toLowerCase()] || map.open;
  return pill(t.bg, t.color);
}

function SectionOverview() {
  return (
    <>
      <div style={eyebrow}>Getting Started</div>
      <h2 style={h2Style}>Overview</h2>
      <p style={pStyle}>AINM (Accident, Incident, Near-Miss) is the HSE module for recording and investigating any event that caused, or could have caused, harm, damage, or loss. Every internal AINM moves through three stages — <strong>Notification</strong>, <strong>Part 1</strong>, and <strong>Part 2</strong> — each independently tracked so the record always shows how far the investigation has progressed.</p>
      <div style={flowWrap}>
        <div style={flowStep()}>Notification</div><div style={arrow}>→</div>
        <div style={flowStep()}>Part 1 — Immediate Response</div><div style={arrow}>→</div>
        <div style={flowStep(true)}>Part 2 — Investigation</div>
      </div>
      <h3 style={h3Style}>Internal vs External</h3>
      <p style={pStyle}><strong>Internal AINM</strong> — a full event that Enshore is directly investigating, using the Notification / Part 1 / Part 2 structure below.<br /><strong>External AINM</strong> — an event reported by a third party (supplier, client, contractor) where Enshore is tracking status and any resulting actions without running the full internal investigation. See <strong>External AINM</strong> in this guide.</p>
      <div style={callout("info")}>
        <span>ℹ</span>
        <div>Every AINM has an <code style={codeStyle}>Overall Status</code> of Open, In Progress, or Closed, tracked separately from the individual Notification / Part 1 / Part 2 stage statuses.</div>
      </div>
    </>
  );
}

function SectionRegister() {
  return (
    <>
      <div style={eyebrow}>Getting Started</div>
      <h2 style={h2Style}>The AINM Register</h2>
      <div style={mockPanel}>
        <div style={{ ...mockHero, marginTop: 0 }}>
          <div style={mockHeroEyebrow}>Enshore IMS · HSE Management</div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>AINM Register</div>
        </div>
        <table style={imsTableStyle}>
          <thead>
            <tr>
              {["AINM No.", "Title", "Classification", "Part 1", "Part 2", "Overall"].map(h => (
                <th key={h} style={imsTableHeadStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ ...imsTableCellStyle, fontWeight: 800, color: imsColours.brand, whiteSpace: "nowrap" }}>AINM-0041</td>
              <td style={imsTableCellStyle}>Dropped object during lifting operation</td>
              <td style={imsTableCellStyle}>Near-Miss</td>
              <td style={imsTableCellStyle}><span style={badge("complete")}>Complete</span></td>
              <td style={imsTableCellStyle}><span style={badge("draft")}>Draft</span></td>
              <td style={imsTableCellStyle}><span style={badge("in progress")}>In Progress</span></td>
            </tr>
          </tbody>
        </table>
      </div>
      <p style={pStyle}>The Dashboard tab shows event classification trends and open/closed splits for the selected year. Use the register filters to search by classification, Accident/Incident/Near-Miss type, or overall status. Click a row to scroll straight to the detail panel.</p>
    </>
  );
}

function SectionNotification() {
  return (
    <>
      <div style={eyebrow}>Core Workflows</div>
      <h2 style={h2Style}>Raising a Notification</h2>
      <p style={pStyle}>The Notification is the first, fastest stage — capturing the essential facts as soon as an event happens, before the fuller Part 1 response.</p>
      <div style={stepList}>
        <Step n={1}>Go to the AINM <strong>Create</strong> tab and select <strong>Incident</strong> or <strong>Accident</strong> as the type.</Step>
        <Step n={2}>Enter <code style={codeStyle}>Title</code>, <code style={codeStyle}>Project</code>, <code style={codeStyle}>Location / Site</code>, <code style={codeStyle}>Event Date</code> and <code style={codeStyle}>Event Time</code>.</Step>
        <Step n={3}>Select the <code style={codeStyle}>Event Classification</code> and enter <code style={codeStyle}>Brief Event Details</code>.</Step>
        <Step n={4}>Assign an <code style={codeStyle}>Owner</code> from People Management — this is the person accountable for progressing the investigation.</Step>
        <Step n={5}>Click <strong>Save</strong>. The Notification stage status moves from <span style={badge("not started")}>Not Started</span> to <span style={badge("issued")}>Issued</span>.</Step>
      </div>
    </>
  );
}

function SectionPart1() {
  return (
    <>
      <div style={eyebrow}>Core Workflows</div>
      <h2 style={h2Style}>Part 1 — Immediate Response</h2>
      <p style={pStyle}>Part 1 captures what happened immediately after the event and the containment put in place — completed as soon as practical after the Notification.</p>
      <div style={stepList}>
        <Step n={1}>Open the AINM and go to the <strong>Part 1</strong> tab.</Step>
        <Step n={2}>Complete <code style={codeStyle}>Injury / Release / Damage Details</code>, <code style={codeStyle}>Initial Response Details</code>, and <code style={codeStyle}>Casualty Management</code> / <code style={codeStyle}>Site Management</code> as relevant.</Step>
        <Step n={3}>Record every <strong>Immediate Containment Action</strong> taken — each gets its own row with an action number.</Step>
        <Step n={4}>Tick the relevant items in the attachments checklist (photos, witness statements, equipment records, and so on). Selecting <strong>Other</strong> reveals a free-text box to describe what else is attached.</Step>
        <Step n={5}>Add <code style={codeStyle}>Investigation Team Members</code> who will carry out Part 2.</Step>
        <Step n={6}>Record the <code style={codeStyle}>Part 1 Reviewer Name</code> and <code style={codeStyle}>Position</code>, then click <strong>Complete Part 1</strong>.</Step>
      </div>
      <div style={callout("info")}>
        <span>ℹ</span>
        <div>You can create a central Action directly from Part 1 for any immediate containment item that needs its own tracked owner and due date — see <strong>Linked Actions</strong> in this guide.</div>
      </div>
    </>
  );
}

function SectionPart2() {
  return (
    <>
      <div style={eyebrow}>Core Workflows</div>
      <h2 style={h2Style}>Part 2 — Investigation</h2>
      <p style={pStyle}>Part 2 is the full root-cause investigation, typically completed by the investigation team named in Part 1.</p>
      <div style={stepList}>
        <Step n={1}>Open the AINM and go to the <strong>Part 2</strong> tab.</Step>
        <Step n={2}>Complete <code style={codeStyle}>Initial Cause</code> and <code style={codeStyle}>Additional Information</code>.</Step>
        <Step n={3}>Record investigation findings against each of <strong>People</strong>, <strong>Equipment</strong>, <strong>Environment</strong>, and <strong>Process</strong> — this structure keeps root-cause analysis consistent across every AINM.</Step>
        <Step n={4}>List any <code style={codeStyle}>Reference Documents</code> consulted, and add <code style={codeStyle}>Further Comments</code>.</Step>
        <Step n={5}>Add corrective action recommendations — either as legacy tracker rows or as linked central Actions (see <strong>Linked Actions</strong>).</Step>
        <Step n={6}>Click <strong>Complete Part 2</strong>.</Step>
      </div>
    </>
  );
}

function SectionSignoff() {
  return (
    <>
      <div style={eyebrow}>Core Workflows</div>
      <h2 style={h2Style}>Sign-off</h2>
      <p style={pStyle}>Once Part 2 is complete, the AINM is signed off by up to four parties, each with their own name, position, and date:</p>
      <div style={stepList}>
        <Step n={1}><strong>Location</strong> sign-off — the site or vessel representative.</Step>
        <Step n={2}><strong>HSEQ</strong> sign-off.</Step>
        <Step n={3}><strong>Project Manager</strong> sign-off.</Step>
        <Step n={4}><strong>SMT</strong> (Senior Management Team) sign-off — typically the last stage before the AINM is considered fully closed out.</Step>
      </div>
      <div style={callout("warning")}>
        <span>⚠</span>
        <div>Sign-off fields can be completed independently and in any order — the AINM&apos;s <code style={codeStyle}>Overall Status</code> is not automatically set to Closed until it is changed manually, so confirm all sign-offs are in before closing the record.</div>
      </div>
    </>
  );
}

function SectionLinkedAction() {
  return (
    <>
      <div style={eyebrow}>Linked Records</div>
      <h2 style={h2Style}>Creating Linked Actions</h2>
      <p style={pStyle}>Both Part 1 and Part 2 support creating a central Action inline, without leaving the AINM.</p>
      <div style={stepList}>
        <Step n={1}>In Part 1 or Part 2, find the <strong>Actions</strong> row and click <strong>+ Add Action</strong>.</Step>
        <Step n={2}>Complete <code style={codeStyle}>Action Title</code>, <code style={codeStyle}>Description</code>, <code style={codeStyle}>Department</code> (selected explicitly — it is never inferred from the accountable person), <code style={codeStyle}>Accountable Person</code>, <code style={codeStyle}>Priority</code>, and <code style={codeStyle}>Target Date</code>.</Step>
        <Step n={3}>Click <strong>Save Action</strong>. It appears in central <strong>Actions</strong> tagged with source <code style={codeStyle}>AINM</code>, linked back to this AINM, and in the accountable person&apos;s <strong>My Actions</strong> view.</Step>
        <Step n={4}>To open the full Action form instead — for a case needing more detail — use <strong>Open Full Action Form</strong>; it keeps the AINM link and project context but leaves title, description, department, and owner for manual entry.</Step>
      </div>
    </>
  );
}

function SectionExternal() {
  return (
    <>
      <div style={eyebrow}>External Notifications</div>
      <h2 style={h2Style}>External AINM</h2>
      <p style={pStyle}>External AINM tracks events reported by a third party — a supplier, client, or contractor — where Enshore needs visibility and possibly to raise its own actions, without running a full internal Part 1 / Part 2 investigation.</p>
      <div style={stepList}>
        <Step n={1}>Go to the <strong>External</strong> tab and click <strong>+ New External AINM</strong>.</Step>
        <Step n={2}>Select the <code style={codeStyle}>External Party Type</code> and enter the <code style={codeStyle}>Supplier Name</code> and their own reference number if they have one.</Step>
        <Step n={3}>Enter <code style={codeStyle}>Project</code>, <code style={codeStyle}>Location / Site</code>, <code style={codeStyle}>Event Date</code>, <code style={codeStyle}>Event Type</code>, and the <code style={codeStyle}>Enshore Contact</code> handling it.</Step>
        <Step n={4}>Complete <code style={codeStyle}>Summary</code> and <code style={codeStyle}>Immediate Actions</code>.</Step>
        <Step n={5}>Set whether the event should <strong>Include in Statistics</strong> for Enshore&apos;s own HSE reporting.</Step>
        <Step n={6}>Track progress by moving <code style={codeStyle}>Status</code> through Logged → Under Review → Action Required → Closed.</Step>
      </div>
    </>
  );
}

function SectionReports() {
  return (
    <>
      <div style={eyebrow}>Reports</div>
      <h2 style={h2Style}>Reports & Compiled PDF</h2>
      <div style={stepList}>
        <Step n={1}>Open the AINM and go to the <strong>Reports</strong> tab.</Step>
        <Step n={2}>Generate the <strong>Notification</strong>, <strong>Part 1</strong>, or <strong>Part 2</strong> report individually as Word, or generate the <strong>Compiled PDF</strong> for the full record in one document.</Step>
        <Step n={3}>The compiled PDF mirrors the Word report structure — labelled Part 1 and Part 2 subsections, corrective actions/recommendations, findings, references, and sign-off — and includes both legacy tracker actions and any linked central Actions with their title, description, and target date.</Step>
      </div>
      <p style={pStyle}>Every generated report is saved and remains visible in the report history for that AINM, so previous versions are never lost when a new one is generated.</p>
    </>
  );
}

function SectionStatuses() {
  const stageRows: [string, string][] = [
    ["not started", "Not Started"],
    ["draft", "Draft"],
    ["issued", "Issued"],
    ["complete", "Complete"],
  ];
  return (
    <>
      <div style={eyebrow}>Reference</div>
      <h2 style={h2Style}>Status Reference</h2>
      <h3 style={h3Style}>Stage status (Notification / Part 1 / Part 2)</h3>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {stageRows.map(([key, label]) => <span key={label} style={badge(key)}>{label}</span>)}
      </div>
      <h3 style={h3Style}>Overall status</h3>
      <table style={imsTableStyle}>
        <thead>
          <tr>
            {["Status", "Meaning"].map(h => <th key={h} style={imsTableHeadStyle}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ ...imsTableCellStyle, whiteSpace: "nowrap" }}><span style={badge("open")}>Open</span></td>
            <td style={imsTableCellStyle}>Newly raised, investigation not yet underway.</td>
          </tr>
          <tr>
            <td style={{ ...imsTableCellStyle, whiteSpace: "nowrap" }}><span style={badge("in progress")}>In Progress</span></td>
            <td style={imsTableCellStyle}>Part 1 and/or Part 2 underway.</td>
          </tr>
          <tr>
            <td style={{ ...imsTableCellStyle, whiteSpace: "nowrap" }}><span style={badge("closed")}>Closed</span></td>
            <td style={imsTableCellStyle}>Investigation and sign-off complete.</td>
          </tr>
        </tbody>
      </table>
    </>
  );
}

const sectionComponents: Record<SectionKey, () => ReactElement> = {
  overview:     SectionOverview,
  register:     SectionRegister,
  notification: SectionNotification,
  part1:        SectionPart1,
  part2:        SectionPart2,
  signoff:      SectionSignoff,
  linkedaction: SectionLinkedAction,
  external:     SectionExternal,
  reports:      SectionReports,
  statuses:     SectionStatuses,
};

export const ainmGuide: GuideDefinition = {
  id: "ainm",
  navLabel: "AINM",
  guideLabel: "AINM",
  defaultSection: "overview",
  sections,
  sectionComponents,
};
