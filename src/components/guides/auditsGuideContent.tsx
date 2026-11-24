import type { CSSProperties, ReactElement } from "react";
import { imsColours, imsTableStyle, imsTableHeadStyle, imsTableCellStyle } from "../imsTheme";
import {
  GuideDefinition, GuideSectionDef,
  eyebrow, h2Style, h3Style, pStyle, codeStyle,
  stepList, Step, callout,
  mockPanel, mockHero, mockHeroEyebrow, mockLabel, flowWrap, flowStep, arrow,
  mockInput, mockFieldLabel, mockRow, mockField, btn, pill, tintPill, RecordScreenMock,
} from "./guideKit";

type SectionKey =
  | "overview" | "dashboard" | "create" | "programme" | "recordscreen" | "documents"
  | "raise" | "manage" | "wordloop" | "reports" | "statuses" | "faq";

const sections: GuideSectionDef[] = [
  { key: "overview",   label: "Overview",                     group: "Getting Started" },
  { key: "dashboard",  label: "Dashboard",                    group: "Getting Started" },
  { key: "create",     label: "Creating an Audit",            group: "Audit Programme" },
  { key: "programme",  label: "The Audit Programme",          group: "Audit Programme" },
  { key: "recordscreen", label: "The record screen",          group: "Audit Programme" },
  { key: "documents",  label: "Documents & Linked Items",     group: "Audit Programme" },
  { key: "raise",      label: "Raising a Finding",            group: "Findings" },
  { key: "manage",     label: "Managing & Closing Findings",  group: "Findings" },
  { key: "wordloop",   label: "Finding Reports & Word Upload", group: "Findings" },
  { key: "reports",    label: "Audit Reports & Exports",      group: "Reports" },
  { key: "statuses",   label: "Status Reference",             group: "Reference" },
  { key: "faq",        label: "Common Questions",             group: "Reference" },
];

function badge(status: string): CSSProperties {
  const map: Record<string, "ok" | "warn" | "bad" | "neu" | "brand"> = {
    planned: "neu",
    "in progress": "brand",
    completed: "ok",
    overdue: "bad",
    cancelled: "neu",
    open: "warn",
    closed: "ok",
    major: "bad",
    minor: "warn",
    ofi: "brand",
    obs: "neu",
    increase: "bad",
    maintain: "neu",
    reduce: "ok",
  };
  return tintPill(map[status.toLowerCase()] || "neu");
}

function SectionOverview() {
  return (
    <>
      <div style={eyebrow}>Getting Started</div>
      <h2 style={h2Style}>Overview</h2>
      <p style={pStyle}>The Audits module is where Enshore plans its audit programme, records what each audit found, and follows every finding through to closure. It covers three kinds of audit: <strong>Internal</strong>, <strong>External</strong> (for example a certification audit) and <strong>Supplier</strong>.</p>
      <div style={flowWrap}>
        <div style={flowStep()}>Create Audit</div><div style={arrow}>→</div>
        <div style={flowStep()}>Carry out audit</div><div style={arrow}>→</div>
        <div style={flowStep()}>Raise Findings</div><div style={arrow}>→</div>
        <div style={flowStep()}>Owner responds</div><div style={arrow}>→</div>
        <div style={flowStep(true)}>Close Findings</div>
      </div>
      <h3 style={h3Style}>The five tabs</h3>
      <table style={imsTableStyle}>
        <thead>
          <tr>{["Tab", "What it is for"].map(h => <th key={h} style={imsTableHeadStyle}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {[
            ["Dashboard", "Totals for audits and findings, a chart of findings by audit type, and the Top 5 Problem Audits / Areas."],
            ["Audit Programme", "The register of all audits. Open one to see its record screen: plan it, send findings out as Word, raise findings, then close it out with its report and linked items."],
            ["Create Audit", "Add a new audit to the programme."],
            ["Findings", "Every Open Finding (or Closed Finding) across all audits in one list, with a search box, filters, Export PDF, Export Excel and an edit panel."],
            ["Reports", "Generate Open, Closed, Custom and Programme Snapshot reports as PDF or Word."],
          ].map(([a, b]) => (
            <tr key={a}>
              <td style={{ ...imsTableCellStyle, fontWeight: 800, whiteSpace: "nowrap" }}>{a}</td>
              <td style={imsTableCellStyle}>{b}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={callout("info")}>
        <span>ℹ</span>
        <div>The <code style={codeStyle}>Status:</code> banner at the top of the page tells you what just happened, for example <em>&quot;INT-26-001 created successfully.&quot;</em> or a reason why something did not save. Check it after every action.</div>
      </div>
      <div style={callout("warning")}>
        <span>⚠</span>
        <div>What you can do depends on your permissions for this IMS area. Creating audits and raising findings needs <strong>Create</strong> permission. Saving changes, uploading files, linking items and deleting needs <strong>Edit</strong> permission. If a button is greyed out, or you see a message saying a permission is required, ask your administrator.</div>
      </div>
    </>
  );
}

function SectionDashboard() {
  return (
    <>
      <div style={eyebrow}>Getting Started</div>
      <h2 style={h2Style}>Dashboard</h2>
      <div style={mockPanel}>
        <div style={mockLabel}>Dashboard — click any card to jump to the matching list</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {[
            ["Remaining Audits", "6"], ["In Progress", "1"], ["Overdue", "2"], ["Completed", "14"],
            ["Open Findings", "9"], ["Closed Findings", "31"], ["Major Findings", "3"],
          ].map(([t, v]) => (
            <div key={t} style={{ background: "#fff", border: `1px solid ${imsColours.border}`, borderRadius: 8, padding: "8px 12px", minWidth: 100 }}>
              <div style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", color: imsColours.muted }}>{t}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: imsColours.brand }}>{v}</div>
            </div>
          ))}
        </div>
      </div>
      <p style={pStyle}>The seven cards are clickable. <strong>Remaining Audits</strong> (audits with status Planned), <strong>In Progress</strong>, <strong>Overdue</strong> and <strong>Completed</strong> take you to the Audit Programme filtered to that status. <strong>Open Findings</strong> and <strong>Closed Findings</strong> take you to the Findings tab. <strong>Major Findings</strong> takes you to the Audit Programme showing only audits that have at least one Major finding.</p>
      <h3 style={h3Style}>Findings by Audit Type</h3>
      <p style={pStyle}>A bar for Internal, External and Supplier audits showing open findings (amber) and closed findings (teal). Click a coloured segment to open the Findings tab already filtered to that audit type.</p>
      <h3 style={h3Style}>Top 5 Problem Audits / Areas</h3>
      <p style={pStyle}>Groups audits that share the same title and lists the five with the most findings, with each area&apos;s <strong>Risk</strong> score and <strong>Frequency Outcome</strong> (Reduce, Maintain or Increase). How the score works is explained in <strong>The Audit Programme</strong>.</p>
    </>
  );
}

function SectionCreate() {
  return (
    <>
      <div style={eyebrow}>Audit Programme</div>
      <h2 style={h2Style}>Creating an Audit</h2>
      <p style={pStyle}>Use the <strong>Create Audit</strong> tab to add an audit to the programme, whether it is planned for later or already done.</p>
      <div style={mockPanel}>
        <div style={{ ...mockHero, marginTop: 0 }}>
          <div style={mockHeroEyebrow}>Audit Management</div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>Create Audit</div>
        </div>
        <div style={mockRow}>
          <div style={mockField()}><div style={mockFieldLabel}>Audit Type</div><div style={mockInput}>Internal</div></div>
          <div style={mockField()}><div style={mockFieldLabel}>Audit Number</div><div style={{ ...mockInput, color: imsColours.muted }}>INT-26-001 (automatic)</div></div>
          <div style={mockField(2)}><div style={mockFieldLabel}>Title / Function</div><div style={mockInput}>e.g. Supplier Audit - Parkburn</div></div>
        </div>
        <div style={mockRow}>
          <div style={mockField()}><div style={mockFieldLabel}>Auditee</div><div style={mockInput}>Department / Supplier / Site</div></div>
          <div style={mockField()}><div style={mockFieldLabel}>Lead Auditor</div><div style={mockInput}>Lead auditor</div></div>
          <div style={mockField()}><div style={mockFieldLabel}>Audit Date</div><div style={mockInput}>2026-03-12</div></div>
          <div style={mockField()}><div style={mockFieldLabel}>Status</div><div style={mockInput}>Planned</div></div>
        </div>
        <div style={mockFieldLabel}>Standards</div>
        <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
          <span style={pill(imsColours.brand, "#fff")}>ISO 9001:2015</span>
          <span style={pill(imsColours.page, imsColours.muted)}>ISO 14001:2015</span>
          <span style={pill(imsColours.page, imsColours.muted)}>ISO 45001:2018</span>
        </div>
        <span style={btn("primary")}>Create Audit</span>
      </div>
      <div style={stepList}>
        <Step n={1}>Open the <strong>Create Audit</strong> tab and choose the <code style={codeStyle}>Audit Type</code>: Internal, External or Supplier.</Step>
        <Step n={2}>Enter the <code style={codeStyle}>Title / Function</code>, the <code style={codeStyle}>Auditee</code> (department, supplier or site) and the <code style={codeStyle}>Lead Auditor</code>. For Internal audits the Lead Auditor box suggests names from People Management as you type.</Step>
        <Step n={3}>Fill in the type-specific field: <code style={codeStyle}>Certification Body</code> (External) or <code style={codeStyle}>Location</code> (Internal and Supplier). Internal audits also have a <code style={codeStyle}>Procedure Reference</code>; External audits also have an <code style={codeStyle}>Audit Location</code>.</Step>
        <Step n={4}>Set the <code style={codeStyle}>Audit Date</code>, <code style={codeStyle}>Scheduled Month</code> and <code style={codeStyle}>Status</code> (Planned, In Progress, Completed, Overdue or Cancelled).</Step>
        <Step n={5}>Choose the <code style={codeStyle}>Standards</code> the audit covers. ISO 9001:2015 is ticked by default; click a standard to switch it on or off.</Step>
        <Step n={6}>Click <strong>Create Audit</strong>. The Status banner confirms the new audit number.</Step>
      </div>
      <p style={pStyle}>The <code style={codeStyle}>Audit Number</code> is automatic and cannot be typed. It is built from the type prefix, the two-digit year of the Audit Date and the next free number: <strong>INT</strong>-26-001, <strong>EXT</strong>-26-001 or <strong>SUP</strong>-26-001.</p>
      <div style={callout("info")}>
        <span>ℹ</span>
        <div>The form will not save unless it has a title, an auditee, a lead auditor and at least one standard. The page&apos;s own hint reads: <em>Internal = standards + procedure. Supplier = ISO only. External = certification audit.</em></div>
      </div>
    </>
  );
}

function SectionProgramme() {
  return (
    <>
      <div style={eyebrow}>Audit Programme</div>
      <h2 style={h2Style}>The Audit Programme</h2>
      <p style={pStyle}>The <strong>Audit Programme</strong> tab is the main working view. It lists every audit with its schedule, finding counts and risk outcome.</p>
      <div style={mockPanel}>
        <div style={mockLabel}>Audit Programme</div>
        <table style={imsTableStyle}>
          <thead>
            <tr>
              {["Audit No.", "Title / Function", "Type", "Scheduled", "Major", "Minor", "OFI/OBS", "Risk Score", "Frequency Outcome", "Status"].map(h => (
                <th key={h} style={imsTableHeadStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ ...imsTableCellStyle, fontWeight: 800, color: imsColours.brand, whiteSpace: "nowrap" }}>INT-26-004</td>
              <td style={imsTableCellStyle}>Document control</td>
              <td style={imsTableCellStyle}>Internal</td>
              <td style={imsTableCellStyle}>March 2026</td>
              <td style={imsTableCellStyle}>1</td>
              <td style={imsTableCellStyle}>2</td>
              <td style={imsTableCellStyle}>1</td>
              <td style={imsTableCellStyle}>13</td>
              <td style={imsTableCellStyle}><span style={badge("maintain")}>Maintain</span></td>
              <td style={imsTableCellStyle}><span style={badge("completed")}>Completed</span></td>
            </tr>
          </tbody>
        </table>
      </div>
      <h3 style={h3Style}>Finding the audit you want</h3>
      <div style={stepList}>
        <Step n={1}>Type in the search box. It searches audit number, title, lead auditor, location, standards, procedure reference, certification body and any linked NCR or Action number. The buttons beside it, left to right, are <strong>Clear Filters</strong>, <strong>Export PDF</strong>, <strong>Export Excel</strong> and <strong>Show Filters</strong>.</Step>
        <Step n={2}>Click <strong>Show Filters</strong> to filter by <code style={codeStyle}>All Status</code>, <code style={codeStyle}>All Types</code> and <code style={codeStyle}>All Months</code>. Click <strong>Hide Filters</strong> to tuck them away again.</Step>
        <Step n={3}>Use the sort chips (<strong>Scheduled</strong>, <strong>Audit No.</strong>, <strong>Title</strong>, <strong>Type</strong>, <strong>Lead</strong>, <strong>Findings</strong>). Click a chip again to reverse the order.</Step>
        <Step n={4}>Click a row. The <strong>Audit Detail</strong> panel opens underneath with the record screen (see The record screen). <strong>Hide Panel</strong> closes it.</Step>
      </div>
      <p style={pStyle}>The line above the list shows how many audits match, for example <em>Showing 8 of 40 audits</em>. <strong>Export PDF</strong> saves the audits currently shown as a PDF, and <strong>Export Excel</strong> downloads them as a workbook. Both follow your search and filters.</p>
      <h3 style={h3Style}>Editing an audit</h3>
      <p style={pStyle}>In the Audit Detail panel, step 1 <strong>Plan</strong> holds the <strong>Audit Record</strong> section with the same fields as Create Audit (the Audit Number is fixed). Change what you need and click <strong>Save Audit Changes</strong>. Changing the Audit Date also updates the Audit Month for you.</p>
      <p style={pStyle}>Under the Audit Record are <strong>Save Audit Changes</strong> and <strong>Delete Audit</strong>. Deleting asks you to confirm and also removes the audit&apos;s uploaded files. <strong>Raise Finding</strong> is in step 3 <strong>Findings</strong>, and <strong>Generate PDF Report</strong> (a one-audit report with the audit details and findings summary) is in step 4 <strong>Close-out</strong>.</p>
      <h3 style={h3Style}>Risk Score and Frequency Outcome</h3>
      <p style={pStyle}>These help decide how often an area needs auditing. The score starts at 1 and adds <strong>5</strong> for each Major finding, <strong>3</strong> for each Minor, <strong>1</strong> for each OFI or OBS, and <strong>2</strong> for each repeat finding (a finding whose description matches another finding anywhere in the audit records).</p>
      <table style={imsTableStyle}>
        <thead>
          <tr>{["Score", "Frequency Outcome"].map(h => <th key={h} style={imsTableHeadStyle}>{h}</th>)}</tr>
        </thead>
        <tbody>
          <tr><td style={imsTableCellStyle}>Above 20</td><td style={imsTableCellStyle}><span style={badge("increase")}>Increase</span> audit more often</td></tr>
          <tr><td style={imsTableCellStyle}>11 to 20</td><td style={imsTableCellStyle}><span style={badge("maintain")}>Maintain</span></td></tr>
          <tr><td style={imsTableCellStyle}>10 or below</td><td style={imsTableCellStyle}><span style={badge("maintain")}>Maintain</span> for a single audit. <span style={badge("reduce")}>Reduce</span> only appears in the dashboard&apos;s Top 5 list, for an area audited more than once.</td></tr>
        </tbody>
      </table>
      <div style={callout("info")}>
        <span>ℹ</span>
        <div>An audit whose date has passed, and which is not Completed or Cancelled, shows as <span style={badge("overdue")}>Overdue</span> in the programme automatically. If it has no Audit Date, the Scheduled month is used instead.</div>
      </div>
    </>
  );
}

function SectionRecordScreen() {
  return (
    <>
      <div style={eyebrow}>Audit Programme</div>
      <h2 style={h2Style}>The record screen</h2>
      <p style={pStyle}>Click an audit in the Audit Programme and the <strong>Audit Detail</strong> panel opens on the <strong>record screen</strong>. It holds everything that used to be in one long panel, split into four steps.</p>
      <RecordScreenMock
        id="INT-26-004"
        title="Document control"
        status="In Progress"
        tone="brand"
        nextButton="Mark Completed"
        track={["Planned", "In Progress", "Completed"]}
        steps={[
          { label: "Plan", pct: 100 },
          { label: "Conduct", pct: 50 },
          { label: "Findings", pct: 33 },
          { label: "Close-out", pct: 25 },
        ]}
        active={1}
        missing={["1 finding still open", "Audit report not uploaded"]}
        gate="this audit is completed"
        summaryTitle="Audit report"
        summaryRows={[["Number", "INT-26-004"], ["Lead auditor", "A. Person"], ["Report upload", null]]}
      />
      <h3 style={h3Style}>The header</h3>
      <p style={pStyle}>The top shows the audit number, title and status, a track reading Planned, In Progress, Completed, and the <strong>Mark Completed</strong> button next to <strong>Hide Panel</strong>. The track marks the status saved on the audit; an audit saved as Overdue or Cancelled has no step marked. Mark Completed is hidden once the audit is Completed or Cancelled, and needs Edit permission. If you can view the audit but not change it, the header says so.</p>
      <h3 style={h3Style}>The four steps</h3>
      <div style={stepList}>
        <Step n={1}><strong>Plan</strong> (type, lead, dates, status): the Audit Record fields, <strong>Save Audit Changes</strong> and <strong>Delete Audit</strong>.</Step>
        <Step n={2}><strong>Conduct</strong> (Word loop): each finding with its Word returned tag and the <strong>Generate Word report</strong> and <strong>Upload completed Word</strong> buttons.</Step>
        <Step n={3}><strong>Findings</strong> (classes, owners, status): the Major, Minor, OFI and OBS counts, <strong>Raise Finding</strong>, <strong>Open Findings tab (all audits)</strong> and the Findings Register.</Step>
        <Step n={4}><strong>Close-out</strong> (report, links, frequency): risk score, frequency outcome, closure dates, <strong>Save Audit Changes</strong>, <strong>Generate PDF Report</strong>, Audit Documents and Linked Items.</Step>
      </div>
      <p style={pStyle}>Each step shows a percentage. Plan counts the title, auditee, lead auditor, audit date and standards. Conduct counts whether the audit is In Progress or Completed and, once findings exist, whether each has a returned Word. Findings counts how many findings are Closed with a closure date, and reads <em>None raised</em> until you raise one. Close-out counts Completed status, no open findings, an uploaded audit document, and a closure date on every closed finding. The screen opens on the first step below 100%.</p>
      <h3 style={h3Style}>Still missing</h3>
      <p style={pStyle}>A box lists what is still missing before the audit is completed, as chips such as Lead auditor, <em>1 finding still open</em>, <em>Completed Word not returned for 2 open findings</em>, <em>Closure date required on 1 closed finding</em> or <em>Audit report not uploaded</em>. Click a chip to jump to the step that holds it.</p>
      <div style={callout("info")}>
        <span>ℹ</span>
        <div>The chips warn, they never block. If you click <strong>Mark Completed</strong> with items missing you are asked &ldquo;N items are still missing: ... Mark completed anyway?&rdquo; and can carry on. Mark Completed saves the audit with the status Completed, the same save as Save Audit Changes.</div>
      </div>
      <h3 style={h3Style}>Form, Split and Audit report</h3>
      <p style={pStyle}><strong>Form</strong> shows only the fields, <strong>Split</strong> (the default) shows them beside the live <strong>Audit report</strong> summary, and <strong>Audit report</strong> shows the summary on its own. The summary lists the audit details, a findings summary and the outcome. Blanks show as an amber &ldquo;to be completed&rdquo; that you can click to jump to the right step.</p>
      <h3 style={h3Style}>All sections</h3>
      <p style={pStyle}>The <strong>All sections</strong> button shows every section on one long page, as the Audit Detail panel used to. Click it again to return to one step at a time.</p>
    </>
  );
}

function SectionDocuments() {
  return (
    <>
      <div style={eyebrow}>Audit Programme</div>
      <h2 style={h2Style}>Documents & Linked Items</h2>
      <h3 style={h3Style}>Audit Documents</h3>
      <p style={pStyle}>In step 4 <strong>Close-out</strong> of the Audit Detail panel you can attach the signed or issued audit report and anything else that belongs to the audit.</p>
      <div style={stepList}>
        <Step n={1}>Open the audit from the Audit Programme and go to step 4 <strong>Close-out</strong>.</Step>
        <Step n={2}>Click <strong>Upload document</strong> and choose the file. PDF, Word, Excel, PowerPoint and photos are all accepted (plus CSV and plain text). On a phone you can pick a photo from your gallery.</Step>
        <Step n={3}>The file appears in the list with its size and upload time. Use <strong>Open / View</strong> to view it or <strong>Remove</strong> to delete it.</Step>
      </div>
      <p style={pStyle}>Each file is uploaded one at a time. If you have both a PDF and a Word version, upload them as two separate files.</p>
      <h3 style={h3Style}>Linked NCRs and Actions</h3>
      <p style={pStyle}>Link an audit to the NCRs and Actions that came out of it so anyone can trace between them.</p>
      <div style={stepList}>
        <Step n={1}>In <strong>Linked Items</strong> (also in step 4 <strong>Close-out</strong>), choose a record in <code style={codeStyle}>Add Linked NCR</code> (<em>Select NCR</em>) or <code style={codeStyle}>Add Linked Action</code> (<em>Select Action</em>).</Step>
        <Step n={2}>Click <strong>+ Add</strong>. It is saved straight away and appears under <strong>Linked NCRs</strong> or <strong>Linked Actions</strong>.</Step>
        <Step n={3}>Click a linked number to open it in the NCR / CAPA or Actions page. Click the <strong>×</strong> beside it to unlink it.</Step>
      </div>
      <div style={callout("info")}>
        <span>ℹ</span>
        <div>Unlinking only removes the link from the audit. The NCR or Action itself is not changed or deleted. Linked numbers are also searchable from the Audit Programme search box.</div>
      </div>
    </>
  );
}

function SectionRaise() {
  return (
    <>
      <div style={eyebrow}>Findings</div>
      <h2 style={h2Style}>Raising a Finding</h2>
      <p style={pStyle}>A finding is raised against a single audit, from step 3 <strong>Findings</strong> of that audit&apos;s Audit Detail panel.</p>
      <div style={mockPanel}>
        <div style={mockLabel}>Raise Finding</div>
        <div style={mockRow}>
          <div style={mockField()}><div style={mockFieldLabel}>Reference</div><div style={{ ...mockInput, color: imsColours.muted }}>F-001 (automatic)</div></div>
          <div style={mockField()}><div style={mockFieldLabel}>Category</div><div style={mockInput}>Minor</div></div>
          <div style={mockField()}><div style={mockFieldLabel}>Clause / Reference</div><div style={mockInput}>ISO 9001 7.5.3</div></div>
          <div style={mockField()}><div style={mockFieldLabel}>Owner</div><div style={mockInput}>— Select owner —</div></div>
        </div>
        <div style={mockRow}>
          <div style={mockField()}><div style={mockFieldLabel}>Status</div><div style={mockInput}>Open</div></div>
          <div style={mockField()}><div style={mockFieldLabel}>Due Date</div><div style={mockInput}>dd/mm/yyyy</div></div>
          <div style={mockField()}><div style={mockFieldLabel}>Closure Date</div><div style={mockInput}>dd/mm/yyyy</div></div>
        </div>
        <div style={mockFieldLabel}>Description</div>
        <div style={{ ...mockInput, marginBottom: 10 }}>Finding statement / objective evidence</div>
        <span style={btn("primary")}>Save Finding</span> <span style={btn("ghost")}>Cancel</span>
      </div>
      <div style={stepList}>
        <Step n={1}>In the Audit Programme, open the audit, go to step 3 <strong>Findings</strong> and click <strong>Raise Finding</strong>.</Step>
        <Step n={2}>Choose the <code style={codeStyle}>Category</code> (see below) and enter the <code style={codeStyle}>Clause / Reference</code>, for example the ISO clause the finding relates to. The <code style={codeStyle}>Reference</code> (F-001, F-002 and so on) is given automatically.</Step>
        <Step n={3}>Write the <code style={codeStyle}>Description</code> as the finding statement plus the objective evidence.</Step>
        <Step n={4}>Choose the <code style={codeStyle}>Owner</code> from the list. If you leave it empty, the Auditee is used. Set the <code style={codeStyle}>Due Date</code>.</Step>
        <Step n={5}>Optionally add the <code style={codeStyle}>Root Cause</code>, <code style={codeStyle}>Containment Action</code> and <code style={codeStyle}>Corrective Action</code> if you already know them. The owner can complete these later.</Step>
        <Step n={6}>Click <strong>Save Finding</strong>.</Step>
      </div>
      <h3 style={h3Style}>Finding categories</h3>
      <table style={imsTableStyle}>
        <thead>
          <tr>{["Category", "Counts in risk score as"].map(h => <th key={h} style={imsTableHeadStyle}>{h}</th>)}</tr>
        </thead>
        <tbody>
          <tr><td style={imsTableCellStyle}><span style={badge("major")}>Major</span></td><td style={imsTableCellStyle}>5 points</td></tr>
          <tr><td style={imsTableCellStyle}><span style={badge("minor")}>Minor</span></td><td style={imsTableCellStyle}>3 points. This is the default.</td></tr>
          <tr><td style={imsTableCellStyle}><span style={badge("ofi")}>OFI</span></td><td style={imsTableCellStyle}>1 point. Opportunity for improvement.</td></tr>
          <tr><td style={imsTableCellStyle}><span style={badge("obs")}>OBS</span></td><td style={imsTableCellStyle}>1 point. Observation.</td></tr>
        </tbody>
      </table>
      <div style={callout("info")}>
        <span>✉</span>
        <div>When a finding is saved with an owner who has an email address in People Management, that person is emailed a link straight to the finding. The owner list only contains active people from the People register.</div>
      </div>
    </>
  );
}

function SectionManage() {
  return (
    <>
      <div style={eyebrow}>Findings</div>
      <h2 style={h2Style}>Managing & Closing Findings</h2>
      <p style={pStyle}>There are two places to work on findings. Both change the same records.</p>
      <h3 style={h3Style}>1. The Findings Register inside an audit</h3>
      <p style={pStyle}>In the Audit Detail panel, step 3 <strong>Findings</strong> has a <strong>Findings Register</strong> that shows a card for each finding. Change any field and it <strong>saves automatically</strong> a moment later, and the Status banner says <em>Finding changes saved.</em> There is no Save button on these cards.</p>
      <h3 style={h3Style}>2. The Findings tab</h3>
      <div style={mockPanel}>
        <div style={mockLabel}>Findings — Open Findings</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
          <span style={{ ...mockInput, width: 220 }}>Search finding ref, audit, owner...</span>
          <span style={btn("ghost")}>Clear Filters</span>
          <span style={btn("primary")}>Export PDF</span>
          <span style={btn("ghost")}>Export Excel</span>
          <span style={btn("primary")}>Show Filters</span>
          <span style={btn("ghost")}>Back to Audit Register</span>
        </div>
        <table style={imsTableStyle}>
          <thead>
            <tr>
              {["Finding Ref", "Audit Number", "Audit Title", "Category", "Description", "Owner", "Due Date", "Status", "Root Cause", "Actions / Edit"].map(h => (
                <th key={h} style={imsTableHeadStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ ...imsTableCellStyle, fontWeight: 800 }}>F-002</td>
              <td style={imsTableCellStyle}>INT-26-004</td>
              <td style={imsTableCellStyle}>Document control</td>
              <td style={imsTableCellStyle}><span style={badge("minor")}>Minor</span></td>
              <td style={imsTableCellStyle}>Obsolete form in use…</td>
              <td style={imsTableCellStyle}>A. Person</td>
              <td style={imsTableCellStyle}>30 Apr 2026</td>
              <td style={imsTableCellStyle}><span style={badge("open")}>Open</span></td>
              <td style={imsTableCellStyle}>-</td>
              <td style={imsTableCellStyle}>Edit finding</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p style={pStyle}>This tab lists every open finding across all audits (or every closed finding, if you came from <strong>Closed Findings</strong>). Use the search box to find a finding by reference, audit, description, owner or root cause. Click <strong>Show Filters</strong> to narrow the list by <code style={codeStyle}>All Audit Types</code>, <code style={codeStyle}>All Categories</code> and <code style={codeStyle}>All Audit Titles</code>; <strong>Clear Filters</strong> resets them. <strong>Export PDF</strong> saves the findings currently shown as a PDF (the Open or Closed Audit NCR Report, depending on the view) and <strong>Export Excel</strong> downloads them as a workbook. Click a row to open the edit panel underneath.</p>
      <div style={stepList}>
        <Step n={1}>Click the finding. Update <code style={codeStyle}>Category</code>, <code style={codeStyle}>Status</code>, <code style={codeStyle}>Clause / Reference</code>, <code style={codeStyle}>Owner</code>, <code style={codeStyle}>Due Date</code>, <code style={codeStyle}>Closure Date</code>, <code style={codeStyle}>Description</code>, <code style={codeStyle}>Root Cause</code>, <code style={codeStyle}>Containment Action</code> and <code style={codeStyle}>Corrective Action</code>.</Step>
        <Step n={2}>Click <strong>Save Finding</strong> (this panel does need the button).</Step>
        <Step n={3}>Use <strong>Hide Panel</strong> to close it.</Step>
      </div>
      <h3 style={h3Style}>Evidence and the More options menu</h3>
      <p style={pStyle}>Under each finding, uploaded evidence is listed with <strong>Open / Preview</strong> and <strong>Delete Evidence</strong> buttons (or <em>No evidence uploaded</em>). The <strong>More options ···</strong> menu holds:</p>
      <div style={stepList}>
        <Step n={1}><strong>Generate PDF report</strong> and <strong>Generate Word report</strong> for this one finding.</Step>
        <Step n={2}><strong>Upload completed Word</strong>, covered in the next section.</Step>
        <Step n={3}><strong>Upload evidence</strong>. You can choose several files at once, such as photos, PDFs, Word, Excel or PowerPoint files.</Step>
        <Step n={4}><strong>Delete finding</strong> (red). It asks you to confirm and the finding is permanently deleted.</Step>
      </div>
      <h3 style={h3Style}>Closing a finding</h3>
      <div style={stepList}>
        <Step n={1}>Check the owner has finished the Root Cause, Containment Action and Corrective Action, and that evidence is attached.</Step>
        <Step n={2}>Set <code style={codeStyle}>Status</code> to <strong>Closed</strong>. If <code style={codeStyle}>Closure Date</code> is empty, today&apos;s date is filled in. Change it if the real closure date was different.</Step>
        <Step n={3}>Save (the Findings tab) or just wait for the automatic save (the audit&apos;s Findings Register).</Step>
        <Step n={4}>The finding leaves <strong>Open Findings</strong> and appears under <strong>Closed Findings</strong>, which shows the Closure Date column instead of Status.</Step>
      </div>
      <div style={callout("info")}>
        <span>ℹ</span>
        <div>If you set a closed finding back to Open or In Progress, its Closure Date is cleared. Saving in the Findings tab also emails the owner if the owner or the status changed. Edits to other fields do not send an email.</div>
      </div>
    </>
  );
}

function SectionWordLoop() {
  return (
    <>
      <div style={eyebrow}>Findings</div>
      <h2 style={h2Style}>Finding Reports & Word Upload</h2>
      <p style={pStyle}>For owners who prefer to respond in Word, you can send them a finding report, then upload their completed copy and let the IMS read the answers back in. You check every change before it is applied.</p>
      <div style={flowWrap}>
        <div style={flowStep()}>Generate Word report</div><div style={arrow}>→</div>
        <div style={flowStep()}>Owner completes it</div><div style={arrow}>→</div>
        <div style={flowStep()}>Upload completed Word</div><div style={arrow}>→</div>
        <div style={flowStep()}>Review changes</div><div style={arrow}>→</div>
        <div style={flowStep(true)}>Approve Updates</div>
      </div>
      <div style={stepList}>
        <Step n={1}>Open the finding (in the audit or in the Findings tab), open <strong>More options ···</strong> and choose <strong>Generate Word report</strong>. A <code style={codeStyle}>.docx</code> file is saved. This also works on a phone. In the audit, step 2 <strong>Conduct</strong> lists every finding with <strong>Generate Word report</strong> and <strong>Upload completed Word</strong> buttons and a <em>Word returned</em> or <em>Word not returned</em> tag, so you can run the whole Word loop from there.</Step>
        <Step n={2}>Send it to the owner. They fill in <strong>Owner</strong>, <strong>Status</strong>, <strong>Due Date</strong>, <strong>Closure Date</strong>, <strong>Root Cause</strong>, <strong>Containment Action</strong> and <strong>Corrective Action</strong> in the Word file and send it back. They should not change the labels or the Finding Ref.</Step>
        <Step n={3}>Open the same finding, open <strong>More options ···</strong> and choose <strong>Upload completed Word</strong> (or use the button in step 2 <strong>Conduct</strong>). Pick the returned file.</Step>
        <Step n={4}>A <strong>Returned finding review</strong> box appears. For each field that differs it shows <strong>Current IMS</strong> beside <strong>Returned Word</strong>.</Step>
        <Step n={5}>Click <strong>Approve Updates</strong> to apply the changes, or <strong>Discard</strong> to throw the upload away.</Step>
      </div>
      <h3 style={h3Style}>What to expect</h3>
      <table style={imsTableStyle}>
        <thead>
          <tr>{["Situation", "What happens"].map(h => <th key={h} style={imsTableHeadStyle}>{h}</th>)}</tr>
        </thead>
        <tbody>
          <tr><td style={imsTableCellStyle}>Only Word files</td><td style={imsTableCellStyle}>Only <code style={codeStyle}>.docx</code> files up to 15 MB are accepted.</td></tr>
          <tr><td style={imsTableCellStyle}>Wrong finding</td><td style={imsTableCellStyle}>The upload is refused if the file is for a different finding, or is not a report generated by the IMS.</td></tr>
          <tr><td style={imsTableCellStyle}>Blank answers</td><td style={imsTableCellStyle}>Blank fields in the Word file never overwrite what is already in the IMS.</td></tr>
          <tr><td style={imsTableCellStyle}>Nothing different</td><td style={imsTableCellStyle}>The box says <em>No populated fields differ from the current IMS record</em> and Approve Updates is greyed out.</td></tr>
          <tr><td style={imsTableCellStyle}>Closing via Word</td><td style={imsTableCellStyle}>If the returned Status is Closed but there is no Closure Date, approval is blocked until a closure date is given.</td></tr>
          <tr><td style={imsTableCellStyle}>The returned file</td><td style={imsTableCellStyle}>After approval it is kept with the finding&apos;s evidence as <em>F-001 completed response - filename</em>.</td></tr>
        </tbody>
      </table>
      <div style={callout("info")}>
        <span>ℹ</span>
        <div>The Word and PDF reports also list the finding&apos;s uploaded evidence with secure links. The links stop working after about six months, so regenerate the report if you need fresh ones.</div>
      </div>
    </>
  );
}

function SectionReports() {
  return (
    <>
      <div style={eyebrow}>Reports</div>
      <h2 style={h2Style}>Audit Reports & Exports</h2>
      <p style={pStyle}>Reports are created on your device when you click and then saved or downloaded. Word and PDF reports save reliably on phones and tablets as well as computers. Nothing is emailed automatically.</p>
      <h3 style={h3Style}>Reports tab</h3>
      <div style={mockPanel}>
        <div style={mockLabel}>Audit Reports</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {["Open Audit NCR Report", "Internal Audit NCR Report", "External Audit NCR Report", "Supplier Audit NCR Report", "Closed Audit NCR Report", "Custom Audit Report", "Audit Programme Snapshot"].map(t => (
            <div key={t} style={{ background: "#fff", border: `1px solid ${imsColours.border}`, borderRadius: 8, padding: "8px 12px", fontSize: 11, fontWeight: 700, color: imsColours.brand }}>{t}</div>
          ))}
        </div>
      </div>
      <table style={imsTableStyle}>
        <thead>
          <tr>{["Report", "What you get"].map(h => <th key={h} style={imsTableHeadStyle}>{h}</th>)}</tr>
        </thead>
        <tbody>
          <tr><td style={{ ...imsTableCellStyle, fontWeight: 800 }}>Open Audit NCR Report</td><td style={imsTableCellStyle}>PDF of open findings. Shows each finding with its audit, category, description, owner, due date, status, root cause, containment and corrective action. Overdue due dates are highlighted. It follows the audit type and category filters from the Findings tab.</td></tr>
          <tr><td style={{ ...imsTableCellStyle, fontWeight: 800 }}>Internal / External / Supplier Audit NCR Report</td><td style={imsTableCellStyle}>The same, limited to open findings from that audit type.</td></tr>
          <tr><td style={{ ...imsTableCellStyle, fontWeight: 800 }}>Closed Audit NCR Report</td><td style={imsTableCellStyle}>PDF of closed findings, using the same filters.</td></tr>
          <tr><td style={{ ...imsTableCellStyle, fontWeight: 800 }}>Custom Audit Report</td><td style={imsTableCellStyle}>Pick the audits and findings you want, then save as Word or PDF. Ideal for a client pack.</td></tr>
          <tr><td style={{ ...imsTableCellStyle, fontWeight: 800 }}>Audit Programme Snapshot</td><td style={imsTableCellStyle}>A clean table of completed and upcoming audits, saved as Word or PDF, or captured with your snipping tool for a monthly report.</td></tr>
        </tbody>
      </table>
      <p style={pStyle}>If nothing matches the filters you will see a message such as <em>No open audit findings match the current filters</em> and no file is created.</p>
      <h3 style={h3Style}>Custom Audit Report</h3>
      <div style={stepList}>
        <Step n={1}>Click the <strong>Custom Audit Report</strong> card.</Step>
        <Step n={2}>Filter the list by search, audit type, status and month. Tick each audit you want. <strong>Select all filtered</strong>, <strong>Clear filtered</strong> and <strong>Clear all</strong> save time, and ticks are kept when you change a filter.</Step>
        <Step n={3}>Choose which findings to include: <em>Open and closed findings</em>, <em>Open findings only</em>, <em>In-progress findings only</em> or <em>Closed findings only</em>, and optionally a single category.</Step>
        <Step n={4}>Click <strong>Generate Word Report</strong> or <strong>Generate PDF Report</strong>. The button shows how many findings will be included.</Step>
      </div>
      <h3 style={h3Style}>Audit Programme Snapshot</h3>
      <div style={stepList}>
        <Step n={1}>Click the <strong>Audit Programme Snapshot</strong> card and filter by search, <em>Completed and upcoming / Completed only / Upcoming only</em>, audit type and month.</Step>
        <Step n={2}>Tick the audits in the <strong>Include</strong> column (or <strong>Select all filtered</strong>).</Step>
        <Step n={3}>Click <strong>Prepare snip</strong> for a clean table of just the chosen audits, ready for a screenshot. <strong>Edit audit selection</strong> takes you back.</Step>
        <Step n={4}>Or click <strong>Generate Word</strong> / <strong>Generate PDF</strong> to save the selection as a file.</Step>
      </div>
      <h3 style={h3Style}>Other exports</h3>
      <p style={pStyle}><strong>Export PDF</strong> and <strong>Export Excel</strong> in the Audit Programme and in the Findings tab save the rows currently shown. <strong>Generate PDF Report</strong> in step 4 <strong>Close-out</strong> of an audit saves that one audit with its findings summary. <strong>Generate PDF report</strong> and <strong>Generate Word report</strong> in a finding&apos;s More options menu save that one finding.</p>
    </>
  );
}

function SectionStatuses() {
  return (
    <>
      <div style={eyebrow}>Reference</div>
      <h2 style={h2Style}>Status Reference</h2>
      <h3 style={h3Style}>Audit status</h3>
      <table style={imsTableStyle}>
        <thead>
          <tr>{["Status", "Meaning"].map(h => <th key={h} style={imsTableHeadStyle}>{h}</th>)}</tr>
        </thead>
        <tbody>
          <tr><td style={{ ...imsTableCellStyle, whiteSpace: "nowrap" }}><span style={badge("planned")}>Planned</span></td><td style={imsTableCellStyle}>In the programme, not yet started. Counted as a Remaining Audit on the dashboard.</td></tr>
          <tr><td style={{ ...imsTableCellStyle, whiteSpace: "nowrap" }}><span style={badge("in progress")}>In Progress</span></td><td style={imsTableCellStyle}>The audit is under way.</td></tr>
          <tr><td style={{ ...imsTableCellStyle, whiteSpace: "nowrap" }}><span style={badge("completed")}>Completed</span></td><td style={imsTableCellStyle}>The audit has been carried out.</td></tr>
          <tr><td style={{ ...imsTableCellStyle, whiteSpace: "nowrap" }}><span style={badge("overdue")}>Overdue</span></td><td style={imsTableCellStyle}>Shown automatically when the audit date (or scheduled month) has passed and the audit is not Completed or Cancelled. It can also be chosen by hand.</td></tr>
          <tr><td style={{ ...imsTableCellStyle, whiteSpace: "nowrap" }}><span style={badge("cancelled")}>Cancelled</span></td><td style={imsTableCellStyle}>Will not go ahead. Never shown as overdue.</td></tr>
        </tbody>
      </table>
      <h3 style={h3Style}>Finding status</h3>
      <table style={imsTableStyle}>
        <thead>
          <tr>{["Status", "Meaning"].map(h => <th key={h} style={imsTableHeadStyle}>{h}</th>)}</tr>
        </thead>
        <tbody>
          <tr><td style={{ ...imsTableCellStyle, whiteSpace: "nowrap" }}><span style={badge("open")}>Open</span></td><td style={imsTableCellStyle}>Raised, response not yet started. Listed under Open Findings.</td></tr>
          <tr><td style={{ ...imsTableCellStyle, whiteSpace: "nowrap" }}><span style={badge("in progress")}>In Progress</span></td><td style={imsTableCellStyle}>The owner is working on it. Still listed under Open Findings.</td></tr>
          <tr><td style={{ ...imsTableCellStyle, whiteSpace: "nowrap" }}><span style={badge("closed")}>Closed</span></td><td style={imsTableCellStyle}>Complete. Has a Closure Date and is listed under Closed Findings.</td></tr>
        </tbody>
      </table>
      <h3 style={h3Style}>Finding category</h3>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        <span style={badge("major")}>Major</span>
        <span style={badge("minor")}>Minor</span>
        <span style={badge("ofi")}>OFI</span>
        <span style={badge("obs")}>OBS</span>
      </div>
      <h3 style={h3Style}>Numbering</h3>
      <p style={pStyle}>Audits: <code style={codeStyle}>INT-26-001</code>, <code style={codeStyle}>EXT-26-001</code>, <code style={codeStyle}>SUP-26-001</code>. Findings: <code style={codeStyle}>F-001</code>, <code style={codeStyle}>F-002</code>, counted separately within each audit.</p>
    </>
  );
}

function SectionFaq() {
  const qa: [string, string][] = [
    ["I cannot see Create Audit, or Save is greyed out.", "Your IMS permissions do not include Create or Edit for this area. The Status banner will say which permission is needed. Ask your administrator."],
    ["The owner I want is not in the list.", "Owners come from the active people in the People register. Ask an administrator to add or reactivate the person there. Names are not typed freely."],
    ["Why did the audit number change when I changed the date or type?", "On the Create Audit tab the number is worked out from the type and the year of the audit date, so it updates as you change them. It is fixed once the audit is saved."],
    ["I changed a finding in the audit but there was no Save button.", "Cards in the Findings Register save by themselves a moment after you change them. Watch the Status banner for Finding changes saved. The edit panel in the Findings tab does have a Save Finding button."],
    ["A finding has disappeared from Open Findings.", "It has been set to Closed. Look under Closed Findings, from the dashboard card or the audit type bar. Check the filters are cleared too."],
    ["Upload completed Word was refused.", "It must be a .docx report generated by the IMS for that same finding, under 15 MB. Documents from another finding, or ones that have lost the Finding Ref, are rejected."],
    ["Which file types can I attach?", "Audit documents: PDF, Word, Excel, PowerPoint and photos (also CSV and text). Finding evidence: choose several files at once, including photos and the same document types."],
    ["Can I use Audits on my phone?", "Yes. Panel buttons wrap onto extra lines on small screens, evidence photos can be picked from your gallery, and generated Word and PDF reports save properly on phones."],
    ["Does unlinking an NCR or Action delete it?", "No. It only removes the link from the audit."],
    ["Who gets emailed?", "The finding owner, if they have an email in People Management: when a finding is raised with them as owner, when they are newly assigned, and when the status changes while saving in the Findings tab."],
  ];
  return (
    <>
      <div style={eyebrow}>Reference</div>
      <h2 style={h2Style}>Common Questions</h2>
      {qa.map(([q, a]) => (
        <div key={q}>
          <h3 style={h3Style}>{q}</h3>
          <p style={pStyle}>{a}</p>
        </div>
      ))}
    </>
  );
}

const sectionComponents: Record<SectionKey, () => ReactElement> = {
  overview:  SectionOverview,
  dashboard: SectionDashboard,
  create:    SectionCreate,
  programme: SectionProgramme,
  recordscreen: SectionRecordScreen,
  documents: SectionDocuments,
  raise:     SectionRaise,
  manage:    SectionManage,
  wordloop:  SectionWordLoop,
  reports:   SectionReports,
  statuses:  SectionStatuses,
  faq:       SectionFaq,
};

export const auditsGuide: GuideDefinition = {
  id: "audits",
  navLabel: "Audits",
  guideLabel: "Audits",
  defaultSection: "overview",
  sections,
  sectionComponents,
};
