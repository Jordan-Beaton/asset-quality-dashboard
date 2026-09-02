import type { CSSProperties, ReactElement } from "react";
import { imsColours, imsTableStyle, imsTableHeadStyle, imsTableCellStyle } from "../imsTheme";
import {
  GuideDefinition, GuideSectionDef,
  eyebrow, h2Style, h3Style, pStyle, codeStyle,
  stepList, Step, callout,
  mockPanel, mockHero, mockHeroEyebrow, mockLabel,
  mockInput, mockFieldLabel, mockRow, mockField, btn, pill,
} from "./guideKit";

type SectionKey =
  | "overview" | "register" | "raise" | "containment" | "rootcause"
  | "evidence" | "linkedaction" | "import" | "reports" | "statuses";

const sections: GuideSectionDef[] = [
  { key: "overview",     label: "Overview",                  group: "Getting Started" },
  { key: "register",     label: "The Register",              group: "Getting Started" },
  { key: "raise",        label: "Raising an NCR",             group: "Core Workflows" },
  { key: "containment",  label: "Containment & Correction",   group: "Core Workflows" },
  { key: "rootcause",    label: "Root Cause",                 group: "Core Workflows" },
  { key: "evidence",     label: "Evidence",                   group: "Core Workflows" },
  { key: "linkedaction", label: "Linked Actions",             group: "Linked Records" },
  { key: "import",       label: "Bulk Excel Import",          group: "Reports & Import" },
  { key: "reports",      label: "NCR Forms & Filtered PDF",   group: "Reports & Import" },
  { key: "statuses",     label: "Status Reference",           group: "Reference" },
];

function badge(status: string): CSSProperties {
  const map: Record<string, { bg: string; color: string }> = {
    open:        { bg: imsColours.danger,     color: "#ffffff" },
    "in progress": { bg: imsColours.warning,  color: "#ffffff" },
    closed:      { bg: imsColours.brand,      color: "#ffffff" },
  };
  const t = map[status.toLowerCase()] || map.open;
  return pill(t.bg, t.color);
}

function SectionOverview() {
  return (
    <>
      <div style={eyebrow}>Getting Started</div>
      <h2 style={h2Style}>Overview</h2>
      <p style={pStyle}>The NCR (Non-Conformance Report) register is the central record of quality non-conformances raised against Enshore work, suppliers, or documentation. Every NCR captures the non-conformance itself, the containment put in place, the corrective action taken, and the root cause — all in one traceable record.</p>
      <div style={callout("info")}>
        <span>ℹ</span>
        <div>NCR is now the only visible workflow in this module — CAPA fields exist in the data model for historic records, but new NCRs do not surface CAPA language on screen.</div>
      </div>
      <h3 style={h3Style}>Key fields</h3>
      <p style={pStyle}><strong>Owner</strong> — the person selected from People Management responsible for closing the NCR out.<br /><strong>Severity</strong> — Low, Medium, or High.<br /><strong>Status</strong> — Open, In Progress, or Closed.<br /><strong>Area / Project</strong> — where the non-conformance occurred, used for filtering and reporting.</p>
    </>
  );
}

function SectionRegister() {
  return (
    <>
      <div style={eyebrow}>Getting Started</div>
      <h2 style={h2Style}>The NCR Register</h2>
      <div style={mockPanel}>
        <div style={{ ...mockHero, marginTop: 0 }}>
          <div style={mockHeroEyebrow}>Enshore IMS · Quality Management</div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>NCR Register</div>
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
          {[["40","Total"],["19","Closed"],["13","Overdue"],["3","High Severity"]].map(([v,l]) => (
            <div key={l} style={{ background: "#fff", border: `1px solid ${imsColours.border}`, borderRadius: 8, padding: "8px 14px", textAlign: "center" }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: imsColours.brand }}>{v}</div>
              <div style={{ fontSize: 9, fontWeight: 700, color: imsColours.muted, textTransform: "uppercase", letterSpacing: "0.05em" }}>{l}</div>
            </div>
          ))}
        </div>
        <table style={imsTableStyle}>
          <thead>
            <tr>
              {["NCR No.", "Title", "Severity", "Owner", "Due Date", "Status"].map(h => (
                <th key={h} style={imsTableHeadStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ ...imsTableCellStyle, fontWeight: 800, color: imsColours.brand, whiteSpace: "nowrap" }}>NCR-0032</td>
              <td style={imsTableCellStyle}>Incorrect torque values recorded on inspection sheet</td>
              <td style={imsTableCellStyle}>High</td>
              <td style={imsTableCellStyle}>Louise Harvey</td>
              <td style={{ ...imsTableCellStyle, color: imsColours.danger, fontWeight: 700 }}>19 Aug 2026 ⚠</td>
              <td style={imsTableCellStyle}><span style={badge("open")}>Open</span></td>
            </tr>
          </tbody>
        </table>
      </div>
      <p style={pStyle}>KPI tiles are clickable — click <strong>Overdue</strong> or <strong>High Severity</strong> to jump straight to a filtered view of the register. Use the filter bar to search by NCR number, title, owner, severity, status, project, or date range.</p>
    </>
  );
}

function SectionRaise() {
  return (
    <>
      <div style={eyebrow}>Core Workflows</div>
      <h2 style={h2Style}>Raising an NCR</h2>
      <div style={stepList}>
        <Step n={1}>Click <strong>＋ New NCR</strong> in the register toolbar.</Step>
        <Step n={2}>Enter the <code style={codeStyle}>Title</code> and a clear <code style={codeStyle}>Description</code> of the non-conformance.</Step>
        <Step n={3}>Set <code style={codeStyle}>Severity</code> (Low / Medium / High), <code style={codeStyle}>Area</code>, and <code style={codeStyle}>Project</code>.</Step>
        <Step n={4}>Select the <code style={codeStyle}>Owner</code> from People Management — this is the person accountable for closing out the NCR.</Step>
        <Step n={5}>Set the <code style={codeStyle}>Due Date</code> for close-out.</Step>
        <Step n={6}>Click <strong>Save NCR</strong>. The record is created in <span style={badge("open")}>Open</span> status with the next sequential NCR number.</Step>
      </div>
      <div style={mockPanel}>
        <div style={mockLabel}>New NCR form</div>
        <div style={mockRow}>
          <div style={mockField(2)}><div style={mockFieldLabel}>Title</div><input style={mockInput} defaultValue="Incorrect torque values recorded on inspection sheet" readOnly /></div>
          <div style={mockField()}><div style={mockFieldLabel}>Severity</div><select style={mockInput}><option>High</option></select></div>
        </div>
        <div style={mockRow}>
          <div style={mockField()}><div style={mockFieldLabel}>Owner</div><select style={mockInput}><option>Louise Harvey</option></select></div>
          <div style={mockField()}><div style={mockFieldLabel}>Due Date</div><input style={mockInput} defaultValue="19 Aug 2026" readOnly /></div>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <span style={btn("primary")}>Save NCR</span>
          <span style={btn("ghost")}>Cancel</span>
        </div>
      </div>
      <div style={callout("info")}>
        <span>ℹ</span>
        <div>Once created, <strong>Owner</strong> can be reassigned at any time — reassigning does not reset the NCR number, severity, or status.</div>
      </div>
    </>
  );
}

function SectionContainment() {
  return (
    <>
      <div style={eyebrow}>Core Workflows</div>
      <h2 style={h2Style}>Containment & Corrective Action</h2>
      <p style={pStyle}>Every NCR captures two distinct actions, recorded as free text on the detail panel:</p>
      <h3 style={h3Style}>Containment Action</h3>
      <p style={pStyle}>The immediate action taken to stop the non-conformance affecting anything further — for example, quarantining a batch or stopping a task. Record this as soon as it&apos;s known.</p>
      <h3 style={h3Style}>Corrective Action</h3>
      <p style={pStyle}>The action taken to prevent the non-conformance recurring — this addresses the root cause, not just the immediate symptom.</p>
      <div style={stepList}>
        <Step n={1}>Open the NCR from the register.</Step>
        <Step n={2}>Enter or update <code style={codeStyle}>Containment Action</code> and <code style={codeStyle}>Corrective Action</code> in the detail panel.</Step>
        <Step n={3}>Move <code style={codeStyle}>Status</code> to <span style={badge("in progress")}>In Progress</span> once containment is underway.</Step>
        <Step n={4}>Click <strong>Save Changes</strong>.</Step>
      </div>
      <div style={callout("warning")}>
        <span>⚠</span>
        <div>Moving an NCR to <span style={badge("closed")}>Closed</span> without a recorded corrective action is possible but not recommended — it leaves no evidence the root cause was actually addressed.</div>
      </div>
    </>
  );
}

function SectionRootCause() {
  return (
    <>
      <div style={eyebrow}>Core Workflows</div>
      <h2 style={h2Style}>Root Cause Analysis</h2>
      <div style={stepList}>
        <Step n={1}>Open the NCR and scroll to <strong>Root Cause</strong>.</Step>
        <Step n={2}>Select a <code style={codeStyle}>Root Cause Category</code>: Human Error, Procedure Gap, Training / Competence, Supplier Issue, Design Issue, Equipment Failure, or Other.</Step>
        <Step n={3}>If <strong>Other</strong> is selected, a free-text field appears to describe the category.</Step>
        <Step n={4}>Enter the full <code style={codeStyle}>Root Cause Description</code> explaining why the non-conformance actually happened.</Step>
        <Step n={5}>Click <strong>Save Changes</strong>.</Step>
      </div>
      <div style={callout("info")}>
        <span>ℹ</span>
        <div>Root cause category feeds the <strong>Top Problem Areas</strong> insight on the Quality dashboard, so choosing the closest matching category (rather than defaulting to Other) keeps that analysis meaningful.</div>
      </div>
    </>
  );
}

function SectionEvidence() {
  return (
    <>
      <div style={eyebrow}>Core Workflows</div>
      <h2 style={h2Style}>Evidence</h2>
      <p style={pStyle}>Photos, inspection sheets, correspondence, or any other supporting file can be attached directly to the NCR.</p>
      <div style={stepList}>
        <Step n={1}>Open the NCR and find the <strong>Evidence</strong> section in the detail panel.</Step>
        <Step n={2}>Click <strong>Upload Evidence</strong> and select one or more files.</Step>
        <Step n={3}>Each file appears in the evidence list with an <strong>Open</strong> link and a <strong>Delete</strong> control.</Step>
      </div>
      <div style={callout("warning")}>
        <span>⚠</span>
        <div>Deleting an evidence file is permanent and removes it from storage immediately — there is no recovery step.</div>
      </div>
    </>
  );
}

function SectionLinkedAction() {
  return (
    <>
      <div style={eyebrow}>Linked Records</div>
      <h2 style={h2Style}>Generating a Linked Action</h2>
      <p style={pStyle}>When an NCR needs a tracked follow-up task with its own owner, priority, and due date — separate from the NCR&apos;s own closure — generate a linked central Action directly from it.</p>
      <div style={stepList}>
        <Step n={1}>Open the NCR and click <strong>Generate Linked Action</strong>.</Step>
        <Step n={2}>The Action form opens pre-filled with the NCR&apos;s number and title as context — complete title, description, department, owner, priority, and target date.</Step>
        <Step n={3}>Click <strong>Save Action</strong>. The new Action appears in central <strong>Actions</strong> tagged with source <code style={codeStyle}>NCR/CAPA</code> and a chip linking back to this NCR.</Step>
        <Step n={4}>The linked Action also appears automatically in that person&apos;s <strong>My Actions</strong> view, and on this NCR&apos;s own record, once it&apos;s assigned to them.</Step>
      </div>
    </>
  );
}

function SectionImport() {
  return (
    <>
      <div style={eyebrow}>Reports & Import</div>
      <h2 style={h2Style}>Bulk Excel Import</h2>
      <p style={pStyle}>Use bulk import to bring in a batch of NCRs from an existing spreadsheet tracker rather than raising each one individually.</p>
      <div style={stepList}>
        <Step n={1}>Click <strong>Import from Excel</strong> in the register toolbar.</Step>
        <Step n={2}>Choose the workbook — the importer maps columns such as Title, Severity, Owner, Status, and Due Date automatically.</Step>
        <Step n={3}>Review the preview. Rows with missing required fields or an unrecognised status are flagged before import.</Step>
        <Step n={4}>Confirm the import. Each valid row is created as a new NCR with the next sequential number.</Step>
      </div>
      <div style={callout("info")}>
        <span>ℹ</span>
        <div>Owner names that don&apos;t already exist in People Management are flagged during preview so you can add them first, keeping ownership consistent with the People directory.</div>
      </div>
    </>
  );
}

function SectionReports() {
  return (
    <>
      <div style={eyebrow}>Reports & Import</div>
      <h2 style={h2Style}>NCR Forms & Filtered Reports</h2>
      <h3 style={h3Style}>Individual NCR Form</h3>
      <p style={pStyle}>Open an NCR and click <strong>Generate / Save PDF</strong> to produce a formal NCR form as PDF or Word — suitable for sending to a supplier or client for response. An <strong>External-facing</strong> option strips internal-only fields before generating.</p>
      <h3 style={h3Style}>Filtered Register Report</h3>
      <div style={stepList}>
        <Step n={1}>Apply any combination of filters on the register — status, severity, owner, project, or date range.</Step>
        <Step n={2}>Click <strong>Generate PDF Report</strong>.</Step>
        <Step n={3}>The report reflects exactly the filtered set of rows currently on screen, with the Enshore branded header and page numbering.</Step>
      </div>
    </>
  );
}

function SectionStatuses() {
  const rows: [string, string, string][] = [
    ["open", "Open", "Raised, not yet actioned. Containment and corrective action still pending."],
    ["in progress", "In Progress", "Containment and/or corrective action underway."],
    ["closed", "Closed", "Corrective action complete and verified effective."],
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
  raise:        SectionRaise,
  containment:  SectionContainment,
  rootcause:    SectionRootCause,
  evidence:     SectionEvidence,
  linkedaction: SectionLinkedAction,
  import:       SectionImport,
  reports:      SectionReports,
  statuses:     SectionStatuses,
};

export const ncrGuide: GuideDefinition = {
  id: "ncr",
  navLabel: "NCR",
  guideLabel: "NCR",
  defaultSection: "overview",
  sections,
  sectionComponents,
};
