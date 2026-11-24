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
  | "evidence" | "linkedaction" | "import" | "supplier" | "reports" | "statuses";

const sections: GuideSectionDef[] = [
  { key: "overview",     label: "Overview",                  group: "Getting Started" },
  { key: "register",     label: "Dashboard & Register",      group: "Getting Started" },
  { key: "raise",        label: "Raising an NCR",             group: "Core Workflows" },
  { key: "containment",  label: "Containment & Correction",   group: "Core Workflows" },
  { key: "rootcause",    label: "Root Cause",                 group: "Core Workflows" },
  { key: "evidence",     label: "Evidence",                   group: "Core Workflows" },
  { key: "linkedaction", label: "Linked Actions",             group: "Linked Records" },
  { key: "import",       label: "Bulk Excel Import",          group: "Reports & Import" },
  { key: "supplier",     label: "Supplier / Client Response", group: "Reports & Import" },
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
      <p style={pStyle}>The NCR (Non-Conformance Report) register is the central record of quality non-conformances raised against Enshore work, suppliers, or documentation. Every NCR captures the non-conformance itself, the containment put in place, the root cause, and the corrective action taken — all in one traceable record, with its evidence and any supplier or client response alongside.</p>
      <p style={pStyle}>The NCR page has five tabs: <strong>Dashboard</strong>, <strong>NCR Register</strong>, <strong>Create NCR</strong>, <strong>Import</strong>, and <strong>Reports</strong>.</p>
      <div style={callout("info")}>
        <span>ℹ</span>
        <div>NCR is the only workflow offered in this module. There is no CAPA tab or Create CAPA form on screen, and new NCRs do not use CAPA language. Older CAPA records are kept in the data for history only.</div>
      </div>
      <h3 style={h3Style}>Key fields</h3>
      <p style={pStyle}><strong>Owner</strong> — the person selected from People Management responsible for closing the NCR out.<br /><strong>Severity</strong> — Low, Medium, or High.<br /><strong>Status</strong> — Open, In Progress, or Closed.<br /><strong>Source Type</strong> — Internal, Supplier, or External.<br /><strong>Area / Project</strong> — where the non-conformance occurred, used for filtering and reporting.<br /><strong>Due Date</strong> — the close-out date. Closed NCRs are never counted as overdue.</p>
      <h3 style={h3Style}>Permissions</h3>
      <p style={pStyle}>Creating and importing NCRs needs <strong>Create</strong> permission. Editing, deleting, uploading or deleting evidence, saving a PDF, and applying a returned supplier response need <strong>Edit</strong> permission. If a button is greyed out, ask an administrator to check your access for this area.</p>
    </>
  );
}

function SectionRegister() {
  return (
    <>
      <div style={eyebrow}>Getting Started</div>
      <h2 style={h2Style}>The NCR Dashboard & Register</h2>
      <h3 style={h3Style}>Dashboard tab</h3>
      <p style={pStyle}>The Dashboard shows six KPI tiles for the selected year (this year by default): <strong>Open Items</strong>, <strong>In Progress</strong>, <strong>Closed NCRs</strong>, <strong>Overdue</strong>, <strong>Due in 7 Days</strong>, and <strong>Total NCRs</strong>, plus the NCR Story charts (status, severity, source type, due-date pressure) and a closure rate. Click any tile to jump to the NCR Register already filtered to match.</p>
      <div style={mockPanel}>
        <div style={{ ...mockHero, marginTop: 0 }}>
          <div style={mockHeroEyebrow}>Enshore IMS · Quality Management</div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>NCR</div>
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
          {[["9","Open Items"],["12","In Progress"],["19","Closed NCRs"],["13","Overdue"],["4","Due in 7 Days"],["40","Total NCRs"]].map(([v,l]) => (
            <div key={l} style={{ background: "#fff", border: `1px solid ${imsColours.border}`, borderRadius: 8, padding: "8px 14px", textAlign: "center" }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: imsColours.brand }}>{v}</div>
              <div style={{ fontSize: 9, fontWeight: 700, color: imsColours.muted, textTransform: "uppercase", letterSpacing: "0.05em" }}>{l}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 12, color: imsColours.muted, marginBottom: 8 }}>Showing 21 of 40 NCR records for 2026 &nbsp;☐ Show closed NCRs (19 hidden)</div>
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
              <td style={{ ...imsTableCellStyle, fontWeight: 800, color: imsColours.brand, whiteSpace: "nowrap" }}>NCR-032</td>
              <td style={imsTableCellStyle}>Incorrect torque values recorded on inspection sheet</td>
              <td style={imsTableCellStyle}>High</td>
              <td style={imsTableCellStyle}>Louise Harvey</td>
              <td style={{ ...imsTableCellStyle, color: imsColours.danger, fontWeight: 700 }}>19/08/2026</td>
              <td style={imsTableCellStyle}><span style={badge("open")}>Open</span></td>
            </tr>
          </tbody>
        </table>
      </div>
      <h3 style={h3Style}>NCR Register tab</h3>
      <p style={pStyle}>Use <strong>Show Filters</strong> to filter by Status, Severity, Source Type, Year, and Project, and the search box to find an NCR by number, title, owner, or project. Click the <strong>NCR No.</strong>, <strong>Severity</strong>, <strong>Due Date</strong>, or <strong>Status</strong> column heading to sort (click again to reverse). <strong>Clear Filters</strong> resets everything, including the year back to the current year. Click a row to open its detail panel beside the register.</p>
      <div style={callout("info")}>
        <span>ℹ</span>
        <div><strong>Closed NCRs are hidden by default</strong> so the register shows live work. Tick <strong>Show closed NCRs</strong> above the table to include them — it shows how many are hidden, for example &ldquo;19 hidden&rdquo;. Closed NCRs also appear automatically when you click the Closed NCRs or Total NCRs tile, set Status to Closed, or type in the search box. (The same tick box reads <strong>Show closed CAPAs</strong> on the legacy CAPA list, which is not offered as a tab on screen.)</div>
      </div>
      <div style={callout("info")}>
        <span>ℹ</span>
        <div>The year filter uses the year the NCR was raised and defaults to this year. Choose <strong>All Years</strong> to see older NCRs.</div>
      </div>
    </>
  );
}

function SectionRaise() {
  return (
    <>
      <div style={eyebrow}>Core Workflows</div>
      <h2 style={h2Style}>Raising an NCR</h2>
      <div style={stepList}>
        <Step n={1}>Open the <strong>Create NCR</strong> tab.</Step>
        <Step n={2}>In <strong>A. Core NCR Information</strong>, enter the <code style={codeStyle}>Title</code> (required) and a clear <code style={codeStyle}>Description</code> of the non-conformance.</Step>
        <Step n={3}>Enter the <code style={codeStyle}>Project</code> and <code style={codeStyle}>Area</code>, and set <code style={codeStyle}>Severity</code> (Low / Medium / High — defaults to Medium) and <code style={codeStyle}>Source Type</code> (Internal / Supplier / External — defaults to Internal).</Step>
        <Step n={4}>Select the <code style={codeStyle}>Owner</code> from the dropdown of active People Management records — this is the person accountable for closing out the NCR.</Step>
        <Step n={5}>Set the <code style={codeStyle}>Due Date</code> for close-out. <code style={codeStyle}>Status</code> starts at Open.</Step>
        <Step n={6}>Optionally complete B. Containment Action, C. Root Cause, D. Corrective Action, and attach evidence (E) now — all can be added later.</Step>
        <Step n={7}>Click <strong>Create NCR</strong>. The record is created with the next free NCR number (for example NCR-033). <strong>Clear</strong> empties the form.</Step>
      </div>
      <div style={mockPanel}>
        <div style={mockLabel}>Create NCR form</div>
        <div style={mockRow}>
          <div style={mockField(2)}><div style={mockFieldLabel}>Title</div><input style={mockInput} defaultValue="Incorrect torque values recorded on inspection sheet" readOnly /></div>
          <div style={mockField()}><div style={mockFieldLabel}>Severity</div><select style={mockInput}><option>High</option></select></div>
        </div>
        <div style={mockRow}>
          <div style={mockField()}><div style={mockFieldLabel}>Owner</div><select style={mockInput}><option>Louise Harvey</option></select></div>
          <div style={mockField()}><div style={mockFieldLabel}>Source Type</div><select style={mockInput}><option>Internal</option></select></div>
          <div style={mockField()}><div style={mockFieldLabel}>Due Date</div><input style={mockInput} defaultValue="19/08/2026" readOnly /></div>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <span style={btn("primary")}>Create NCR</span>
          <span style={btn("ghost")}>Clear</span>
        </div>
      </div>
      <div style={callout("info")}>
        <span>ℹ</span>
        <div>The owner is emailed when an NCR is assigned to them (if they have an email on file in People Management). <strong>Owner</strong> can be reassigned at any time — reassigning does not change the NCR number or severity. The owner is also emailed if the status changes on an NCR they already own.</div>
      </div>
    </>
  );
}

function SectionContainment() {
  return (
    <>
      <div style={eyebrow}>Core Workflows</div>
      <h2 style={h2Style}>Containment & Corrective Action</h2>
      <p style={pStyle}>Every NCR captures two distinct actions, recorded as free text on the Create NCR form and in the detail panel:</p>
      <h3 style={h3Style}>B. Containment Action</h3>
      <p style={pStyle}>The immediate action taken to stop the non-conformance affecting anything further — for example, quarantining a batch or stopping a task. Record this as soon as it&apos;s known.</p>
      <h3 style={h3Style}>D. Corrective Action</h3>
      <p style={pStyle}>The action taken to prevent the non-conformance recurring — this addresses the root cause, not just the immediate symptom.</p>
      <div style={stepList}>
        <Step n={1}>Open the NCR from the <strong>NCR Register</strong> (tick <strong>Show closed NCRs</strong> if it is already closed).</Step>
        <Step n={2}>In the detail panel, enter or update <code style={codeStyle}>Containment Action</code> and <code style={codeStyle}>Corrective Action</code>.</Step>
        <Step n={3}>Move <code style={codeStyle}>Status</code> to <span style={badge("in progress")}>In Progress</span> once containment is underway.</Step>
        <Step n={4}>Click <strong>Save Changes</strong>.</Step>
      </div>
      <div style={callout("warning")}>
        <span>⚠</span>
        <div>Moving an NCR to <span style={badge("closed")}>Closed</span> without a recorded corrective action is possible but not recommended — it leaves no evidence the root cause was actually addressed. Saving as Closed records the close date; moving it back out of Closed clears that date.</div>
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
        <Step n={1}>Open the NCR and scroll to <strong>C. Root Cause</strong> in the detail panel (it is also on the Create NCR form).</Step>
        <Step n={2}>Select a <code style={codeStyle}>Root Cause Category</code>: Human Error, Procedure Gap, Training / Competence, Supplier Issue, Design Issue, Equipment Failure, or Other.</Step>
        <Step n={3}>If <strong>Other</strong> is selected, an <strong>Other Root Cause Category</strong> text field appears to describe the category.</Step>
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
      <p style={pStyle}>Photos, inspection sheets, correspondence, or any other supporting file can be attached directly to the NCR — PDF, Word, Excel, PowerPoint, and photos are all supported. You can add files when creating the NCR (the optional Evidence Files box) or at any time afterwards.</p>
      <div style={stepList}>
        <Step n={1}>Open the NCR and find the <strong>Evidence</strong> card below the detail panel.</Step>
        <Step n={2}>Click <strong>Select Files</strong> and choose one or more files — on a phone you can pick from your files or photo library. Optionally add <strong>Evidence Notes</strong>, which are stored against each file in this upload.</Step>
        <Step n={3}>Click <strong>Upload Evidence</strong>.</Step>
        <Step n={4}>Each file appears in the evidence list with its size, type, upload date, any note, an <strong>Open</strong> button and a <strong>Delete</strong> button. Open works on phones as well as desktops.</Step>
      </div>
      <div style={callout("warning")}>
        <span>⚠</span>
        <div>Deleting an evidence file asks you to confirm, then is permanent and removes it from storage immediately — there is no recovery step. Deleting the NCR itself does not remove its evidence files.</div>
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
        <Step n={1}>Open the NCR and click <strong>Generate Linked Action</strong> at the bottom of the detail panel.</Step>
        <Step n={2}>The Action page opens on <strong>Create Action</strong> with Source set to <code style={codeStyle}>NCR/CAPA</code>, the project and owner carried over from the NCR, and the NCR linked. Add the title, description, priority, and target date.</Step>
        <Step n={3}>Click <strong>Add Action</strong>. The new Action appears in central <strong>Actions</strong> with a chip linking back to this NCR.</Step>
        <Step n={4}>The NCR&apos;s <strong>Linked Actions</strong> panel lists each linked Action with its status, owner and due date, and an <strong>Open Linked Action</strong> button. The Action also shows in the assigned person&apos;s <strong>My Actions</strong> view.</Step>
      </div>
    </>
  );
}

function SectionImport() {
  return (
    <>
      <div style={eyebrow}>Reports & Import</div>
      <h2 style={h2Style}>Bulk Excel Import</h2>
      <p style={pStyle}>Use bulk import to bring in a batch of NCRs from an existing spreadsheet tracker rather than raising each one individually. It needs Create permission.</p>
      <div style={stepList}>
        <Step n={1}>Open the <strong>Import</strong> tab.</Step>
        <Step n={2}>Choose an <strong>.xlsx</strong> workbook. Only the first worksheet is read, and columns are matched by heading.</Step>
        <Step n={3}>Review the preview table. Each row shows its proposed NCR number and a Validation column reading <strong>OK</strong> or listing what is wrong.</Step>
        <Step n={4}>Fix any errors in the spreadsheet and choose the file again, or click <strong>Clear Preview</strong> to start over. The import button stays disabled until every row is valid.</Step>
        <Step n={5}>Click <strong>Import N NCRs</strong>. Each row is created as a new NCR with the next sequential number.</Step>
      </div>
      <h3 style={h3Style}>Columns</h3>
      <p style={pStyle}><strong>Required:</strong> Title, Description, Project, Owner, Severity (Low / Medium / High), Status (Open / In Progress / Closed), Due Date.<br /><strong>Optional:</strong> Source Type (Internal / Supplier / External — defaults to Internal), Area, Containment Action, Corrective Action, Root Cause Category (one of the dropdown categories), Root Cause Description, Evidence Files, Evidence Notes.</p>
      <div style={callout("info")}>
        <span>ℹ</span>
        <div>The Evidence Files and Evidence Notes columns are kept as text at the end of the Root Cause Description under &ldquo;Imported Evidence Reference&rdquo; — the files themselves are not uploaded, so attach them on the NCR afterwards.</div>
      </div>
      <div style={callout("warning")}>
        <span>⚠</span>
        <div>Owner names are not checked against People Management during import, and no assignment emails are sent. Use names exactly as they appear in the People register so the Owner dropdown, filters and My Actions stay consistent. Rows imported as Closed are given today&apos;s date as the close date.</div>
      </div>
    </>
  );
}

function SectionSupplier() {
  return (
    <>
      <div style={eyebrow}>Reports & Import</div>
      <h2 style={h2Style}>Supplier / Client Response</h2>
      <p style={pStyle}>When an NCR involves a supplier or client, send them the NCR form to complete and bring their answer back into the record without retyping it.</p>
      <div style={stepList}>
        <Step n={1}>Open the NCR and, in <strong>Report Export</strong>, tick <strong>Supplier / Client facing issue</strong>.</Step>
        <Step n={2}>Click <strong>Generate Word Report</strong> (or Generate / Save PDF) and send it. The form is titled &ldquo;Supplier / Client NCR Response Form&rdquo; and includes section E for their response and acknowledgement.</Step>
        <Step n={3}>When the completed Word document comes back, click <strong>Upload Completed Word</strong> and choose it. Only <strong>.docx</strong> files made by the IMS, up to 15 MB, are accepted, and the NCR number in the document must match the NCR you have open.</Step>
        <Step n={4}>Review <strong>Returned NCR response review</strong>, which shows Current IMS against Returned Word for each field that differs: Containment Action, Corrective Action, Root Cause Category and Description, Response / Proposed Action, and Acknowledgement / Responsible Contact.</Step>
        <Step n={5}>Click <strong>Approve Updates</strong> to write the changes into the NCR, or <strong>Reject - Keep as Evidence</strong> to change nothing. <strong>Discard</strong> abandons the review without saving the file.</Step>
      </div>
      <div style={callout("info")}>
        <span>ℹ</span>
        <div>Either way (Approve or Reject), the returned file is saved to the NCR&apos;s evidence, so every round of the exchange stays on record and a revised response can go through the same steps again. Nothing is written until you click one of the two buttons.</div>
      </div>
      <div style={callout("warning")}>
        <span>⚠</span>
        <div>Status is never changed by a returned document. Closing or reopening an NCR is always a manual decision made in the detail panel.</div>
      </div>
      <p style={pStyle}>You can also type the response straight into <strong>E. Supplier / Client Response</strong> in the detail panel and click <strong>Save Changes</strong>.</p>
    </>
  );
}

function SectionReports() {
  const rows: [string, string][] = [
    ["Header table", "NCR number, status, title, severity, source type, project, owner, due date."],
    ["A. NCR DETAILS", "Issue / description."],
    ["B. CONTAINMENT ACTION", "Containment action."],
    ["C. ROOT CAUSE", "Root cause category and description."],
    ["D. CORRECTIVE ACTION", "Corrective action."],
    ["E. SUPPLIER / CLIENT RESPONSE", "Response / proposed action and acknowledgement. Printed when Supplier / Client facing issue is ticked, or when a supplier response has already been recorded."],
    ["F. EVIDENCE LIST", "Only when Include evidence list is ticked. A table of every evidence file with an Open evidence link, followed by an Evidence Images section with any photos."],
  ];
  return (
    <>
      <div style={eyebrow}>Reports & Import</div>
      <h2 style={h2Style}>NCR Forms & Filtered Reports</h2>
      <h3 style={h3Style}>Individual NCR Form</h3>
      <p style={pStyle}>Open an NCR and use the <strong>Report Export</strong> panel to produce a matching PDF or Word form. <strong>Generate / Save PDF</strong> (shown as <strong>Regenerate PDF</strong> once one exists) builds the PDF and saves it to the NCR — the panel shows the latest saved time and version count, and <strong>Open Saved PDF</strong> reopens the latest. <strong>Generate Word Report</strong> downloads a .docx to your device and does not keep a saved copy. Both work on phones.</p>
      <p style={pStyle}>The report is built from what is on screen, so text you have typed but not yet saved is included. Sections are lettered the same way as the NCR form:</p>
      <div style={{ overflowX: "auto" }}>
        <table style={imsTableStyle}>
          <thead>
            <tr>{["Section", "Contents"].map(h => <th key={h} style={imsTableHeadStyle}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map(([sec, desc]) => (
              <tr key={sec}>
                <td style={{ ...imsTableCellStyle, fontWeight: 800, color: imsColours.brand, whiteSpace: "nowrap" }}>{sec}</td>
                <td style={imsTableCellStyle}>{desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={callout("info")}>
        <span>ℹ</span>
        <div><strong>Include evidence list</strong> is ticked by default; <strong>Supplier / Client facing issue</strong> is unticked. Both reset each time you open an NCR. Evidence links in an exported report stay valid for about six months, so they work for recipients with no IMS access.</div>
      </div>
      <h3 style={h3Style}>Filtered Register Report</h3>
      <div style={stepList}>
        <Step n={1}>Apply any combination of filters on the NCR Register or the <strong>Reports</strong> tab — status, severity, source type, year, project, or search.</Step>
        <Step n={2}>Click <strong>Generate PDF Report</strong>. The Reports tab shows how many NCRs will be included.</Step>
        <Step n={3}>The landscape PDF lists exactly the NCRs matching the current filters, with a filter summary, overdue days, the containment, root cause and corrective action text, the Enshore branded header, and page numbering.</Step>
      </div>
      <div style={callout("warning")}>
        <span>⚠</span>
        <div>Closed NCRs are left out of the filtered report unless they are shown in the register — tick <strong>Show closed NCRs</strong> on the NCR Register tab, or set Status to Closed, before generating if you want them included.</div>
      </div>
    </>
  );
}

function SectionStatuses() {
  const rows: [string, string, string][] = [
    ["open", "Open", "Raised, not yet actioned. Containment and corrective action still pending."],
    ["in progress", "In Progress", "Containment and/or corrective action underway."],
    ["closed", "Closed", "Corrective action complete. Hidden from the register unless Show closed NCRs is ticked. Closing is always a manual decision."],
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
  supplier:     SectionSupplier,
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
