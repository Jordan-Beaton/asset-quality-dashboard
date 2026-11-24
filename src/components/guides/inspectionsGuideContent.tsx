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
  | "overview" | "hsestart" | "hsefill" | "recordscreen" | "hseregister" | "phone"
  | "lookahead" | "manual" | "exports" | "statuses" | "faq";

const sections: GuideSectionDef[] = [
  { key: "overview",    label: "Overview",                       group: "Getting Started" },
  { key: "hsestart",    label: "Dashboard & Starting a Form",    group: "HSE Inspections" },
  { key: "hsefill",     label: "Completing the Form",            group: "HSE Inspections" },
  { key: "recordscreen", label: "The record screen",             group: "HSE Inspections" },
  { key: "hseregister", label: "Register, Evidence & PDF",       group: "HSE Inspections" },
  { key: "phone",       label: "Completing on a Phone",          group: "HSE Inspections" },
  { key: "lookahead",   label: "Lookahead & Register",           group: "Overall Inspections" },
  { key: "manual",      label: "Inspection Details & Manual Entries", group: "Overall Inspections" },
  { key: "exports",     label: "Filters & Exports",              group: "Overall Inspections" },
  { key: "statuses",    label: "Status Reference",               group: "Reference" },
  { key: "faq",         label: "Common Questions",               group: "Reference" },
];

function badge(status: string): CSSProperties {
  const map: Record<string, "ok" | "warn" | "bad" | "neu" | "brand"> = {
    draft: "neu",
    open: "warn",
    complete: "ok",
    closed: "ok",
    planned: "neu",
    confirmed: "brand",
    completed: "ok",
    cancelled: "bad",
  };
  return tintPill(map[status.toLowerCase()] || "neu");
}

const cellStrong: CSSProperties = { ...imsTableCellStyle, fontWeight: 800, color: imsColours.brand, whiteSpace: "nowrap" };
const nowrapCell: CSSProperties = { ...imsTableCellStyle, whiteSpace: "nowrap" };

// ── Overview ─────────────────────────────────────────────────────────────────

function SectionOverview() {
  return (
    <>
      <div style={eyebrow}>Getting Started</div>
      <h2 style={h2Style}>Overview</h2>
      <p style={pStyle}>This guide covers two different pages that both use the word &quot;inspection&quot;. They do different jobs, so it helps to know which one you need.</p>
      <h3 style={h3Style}>HSE Inspections (Site Inspections)</h3>
      <p style={pStyle}>Under <strong>HSE Management</strong>. This is where you <strong>carry out and record</strong> HSE inspections using a checklist: vessel pre-sail, office, offshore, mobilisation, base and site, and dropped objects. Each inspection has Yes / No / N/A answers, comments, photos or documents as evidence, sign-off and a PDF report. It works on a laptop and on a phone.</p>
      <h3 style={h3Style}>Overall Inspections</h3>
      <p style={pStyle}>Under <strong>Project Management</strong>. This is a <strong>planning view</strong> of customer and supplier witness or hold-point inspections across all projects. It brings together inspections that come from ITPs and Notices of Inspection (NOI), plus any you add by hand, in an 8-week lookahead and a full register that you can filter and export.</p>
      <div style={flowWrap}>
        <div style={flowStep()}>HSE Inspections</div><div style={arrow}>→</div>
        <div style={flowStep()}>Pick a form</div><div style={arrow}>→</div>
        <div style={flowStep()}>Answer items</div><div style={arrow}>→</div>
        <div style={flowStep()}>Add evidence</div><div style={arrow}>→</div>
        <div style={flowStep(true)}>Save &amp; PDF</div>
      </div>
      <div style={flowWrap}>
        <div style={flowStep()}>ITP / NOI or manual entry</div><div style={arrow}>→</div>
        <div style={flowStep()}>Overall Inspections</div><div style={arrow}>→</div>
        <div style={flowStep()}>Filter</div><div style={arrow}>→</div>
        <div style={flowStep(true)}>Export Excel / PDF</div>
      </div>
      <div style={callout("info")}>
        <span>ℹ</span>
        <div>What you can do depends on your IMS permissions. If you only have read access, buttons such as <strong>Create Inspection</strong>, <strong>Save Inspection</strong> and <strong>New Manual Inspection</strong> are disabled or hidden, and you will see a message that starts &quot;Read-only access&quot;.</div>
      </div>
    </>
  );
}

// ── HSE: dashboard & starting ────────────────────────────────────────────────

function SectionHseStart() {
  return (
    <>
      <div style={eyebrow}>HSE Inspections</div>
      <h2 style={h2Style}>Dashboard &amp; Starting a Form</h2>
      <p style={pStyle}>The HSE Inspections page (titled <strong>Site Inspections</strong>) has three tabs: <strong>Dashboard</strong>, <strong>Inspection Register</strong> and <strong>Create Inspection</strong>. A status bar under the title shows the latest message, for example &quot;HSE inspections loaded.&quot; or a save result.</p>
      <div style={mockPanel}>
        <div style={{ ...mockHero, marginTop: 0 }}>
          <div style={mockHeroEyebrow}>HSE Management</div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>Site Inspections</div>
        </div>
        <div style={{ display: "flex", gap: 6, margin: "10px 0" }}>
          <span style={btn("primary")}>Dashboard</span>
          <span style={btn("ghost")}>Inspection Register</span>
          <span style={btn("ghost")}>Create Inspection</span>
        </div>
        <div style={mockRow}>
          {[["Open Inspections", "4"], ["Completed / Closed", "11"], ["Open Findings", "9"], ["Evidence Files", "27"]].map(([k, v]) => (
            <div key={k} style={{ ...mockField(), background: "#fff", border: `1px solid ${imsColours.border}`, borderRadius: 8, padding: "8px 10px" }}>
              <div style={mockFieldLabel}>{k}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: imsColours.brand }}>{v}</div>
            </div>
          ))}
        </div>
        <div style={mockLabel}>Inspection Form Library</div>
        <div style={{ fontSize: 11, color: imsColours.muted }}>ENS-HSEQ-FRM-044 · Workplace Inspection - Base and Site · Open blank PDF</div>
      </div>
      <h3 style={h3Style}>The four numbers</h3>
      <table style={imsTableStyle}>
        <thead><tr>{["Card", "What it counts"].map(h => <th key={h} style={imsTableHeadStyle}>{h}</th>)}</tr></thead>
        <tbody>
          <tr><td style={nowrapCell}><strong>Open Inspections</strong></td><td style={imsTableCellStyle}>Every inspection that is not Complete or Closed (so Draft and Open ones). Click it to open the register filtered to <strong>Open</strong>.</td></tr>
          <tr><td style={nowrapCell}><strong>Completed / Closed</strong></td><td style={imsTableCellStyle}>Inspections that are Complete or Closed. Click it to open the register filtered to <strong>Complete</strong>.</td></tr>
          <tr><td style={nowrapCell}><strong>Open Findings</strong></td><td style={imsTableCellStyle}>The total number of checklist items answered <strong>No</strong> across all inspections.</td></tr>
          <tr><td style={nowrapCell}><strong>Evidence Files</strong></td><td style={imsTableCellStyle}>The total number of evidence files uploaded.</td></tr>
        </tbody>
      </table>
      <h3 style={h3Style}>The six forms</h3>
      <table style={imsTableStyle}>
        <thead><tr>{["Form", "Title"].map(h => <th key={h} style={imsTableHeadStyle}>{h}</th>)}</tr></thead>
        <tbody>
          {[
            ["ENS-HSEQ-FRM-041", "Workplace Inspection - Office"],
            ["ENS-HSEQ-FRM-042", "Workplace Inspection - Offshore"],
            ["ENS-HSEQ-FRM-043", "Workplace Inspection - Mobilisation"],
            ["ENS-HSEQ-FRM-044", "Workplace Inspection - Base and Site"],
            ["ENS-HSEQ-FRM-045", "Workplace Inspection - Dropped Objects"],
            ["ENS-HSEQ-FRM-046", "Vessel Pre-Sail Inspection"],
          ].map(([n, t]) => (
            <tr key={n}><td style={cellStrong}>{n}</td><td style={imsTableCellStyle}>{t}</td></tr>
          ))}
        </tbody>
      </table>
      <p style={pStyle}>Each form shows its revision (for example &quot;Rev E&quot;) and the revision date. The revision a record was created on is stored with it and printed on the PDF.</p>
      <h3 style={h3Style}>Starting an inspection</h3>
      <div style={stepList}>
        <Step n={1}>On the <strong>Dashboard</strong>, under <strong>Live Digital Inspections</strong>, click the button for the form you need, for example <strong>Create FRM-044</strong>. You can also use the <strong>Create Inspection</strong> tab and pick a form card.</Step>
        <Step n={2}>The next number is given automatically in the format <code style={codeStyle}>HSE-INS-001</code>. You cannot edit it.</Step>
        <Step n={3}>To print a blank form for paper use, click a card under <strong>Inspection Form Library</strong> (it says <strong>Open blank PDF</strong>). It opens in a new tab.</Step>
      </div>
    </>
  );
}

// ── HSE: completing the form ─────────────────────────────────────────────────

function SectionHseFill() {
  return (
    <>
      <div style={eyebrow}>HSE Inspections</div>
      <h2 style={h2Style}>Completing the Form</h2>
      <p style={pStyle}>Every form has the same layout: <strong>Report Details</strong>, then the checklist sections for that form, then <strong>Additional Comments</strong> and <strong>Sign-Off</strong>. On screen these are the four steps of the record screen (see The record screen): Report details, Checklist, Comments and Sign-off.</p>
      <div style={mockPanel}>
        <div style={mockLabel}>Report Details</div>
        <div style={mockRow}>
          <div style={mockField()}><div style={mockFieldLabel}>Inspection No.</div><div style={{ ...mockInput, background: imsColours.page }}>HSE-INS-042</div></div>
          <div style={mockField()}><div style={mockFieldLabel}>Status</div><div style={mockInput}>Draft</div></div>
          <div style={mockField(2)}><div style={mockFieldLabel}>Title</div><div style={mockInput}>Workplace Inspection - Base and Site</div></div>
        </div>
        <div style={mockRow}>
          <div style={mockField()}><div style={mockFieldLabel}>Department</div><div style={mockInput}>HSEQ</div></div>
          <div style={mockField()}><div style={mockFieldLabel}>Inspection Date</div><div style={mockInput}>2026-11-23</div></div>
          <div style={mockField()}><div style={mockFieldLabel}>Inspector</div><div style={mockInput}>Select person</div></div>
        </div>
        <div style={mockLabel}>2.0 Working Area</div>
        <table style={imsTableStyle}>
          <thead><tr>{["Item", "Description", "N/A", "Yes", "No", "Comments / action notes", "Evidence"].map(h => <th key={h} style={imsTableHeadStyle}>{h}</th>)}</tr></thead>
          <tbody>
            <tr>
              <td style={cellStrong}>2.1</td>
              <td style={imsTableCellStyle}>Housekeeping is satisfactory?</td>
              <td style={imsTableCellStyle}>○</td><td style={imsTableCellStyle}>○</td><td style={imsTableCellStyle}>●</td>
              <td style={imsTableCellStyle}>Pallets blocking walkway</td>
              <td style={imsTableCellStyle}><span style={btn("ghost")}>Upload</span></td>
            </tr>
          </tbody>
        </table>
      </div>
      <div style={stepList}>
        <Step n={1}>Fill in <code style={codeStyle}>Title</code> (required), <code style={codeStyle}>Department</code>, <code style={codeStyle}>Inspection Date</code>, <code style={codeStyle}>Project / Work Scope</code>, <code style={codeStyle}>Vessel / Spread</code> and <code style={codeStyle}>Area / Zone</code>. Pick the <code style={codeStyle}>Inspector</code> from the list; their position is filled in for you and you can change it.</Step>
        <Step n={2}>Work through each checklist section. For every item choose <strong>N/A</strong>, <strong>Yes</strong> or <strong>No</strong>, and type anything useful in <strong>Comments / action notes</strong>. Items with a &quot;No&quot; are counted as <strong>Open Findings</strong> on the Dashboard.</Step>
        <Step n={3}>Use <strong>Upload</strong> on an item row to attach a photo or file to that exact item (see <strong>Register, Evidence &amp; PDF</strong>).</Step>
        <Step n={4}>Add overall remarks under <strong>Additional Comments</strong> (the last numbered section on every form).</Step>
        <Step n={5}>In <strong>Sign-Off</strong>, choose the <code style={codeStyle}>Name</code> from the list, check <code style={codeStyle}>Position</code>, <code style={codeStyle}>Company</code> (defaults to Enshore Subsea) and set the <code style={codeStyle}>Date</code>.</Step>
        <Step n={6}>Set <code style={codeStyle}>Status</code> (see <strong>Status Reference</strong>) and click <strong>Save Inspection</strong>. A message in the status bar confirms it, for example &quot;HSE-INS-042 created.&quot; When the form is finished you can instead click <strong>Complete Inspection</strong> in the header, which sets the status to Complete and saves.</Step>
      </div>
      <div style={callout("warning")}>
        <span>⚠</span>
        <div>A title is required. If it is empty, saving stops with the message &quot;Inspection title is required.&quot; Names for Inspector and Sign-Off come from the People register, so ask an administrator if someone is missing.</div>
      </div>
      <p style={pStyle}>After a new inspection is saved, you are taken to the <strong>Inspection Register</strong> with that record open.</p>
    </>
  );
}

// ── HSE: register, evidence & PDF ────────────────────────────────────────────

function SectionRecordScreen() {
  return (
    <>
      <div style={eyebrow}>HSE Inspections</div>
      <h2 style={h2Style}>The record screen</h2>
      <p style={pStyle}>A new or saved HSE inspection opens on the <strong>record screen</strong>: the same form as before, split into four steps with a live <strong>Inspection report (PDF)</strong> summary beside it.</p>
      <RecordScreenMock
        id="HSE-INS-042"
        title="Workplace Inspection - Base and Site"
        status="Open"
        tone="warn"
        nextButton="Complete Inspection"
        steps={[
          { label: "Report details", pct: 100 },
          { label: "Checklist", pct: 60 },
          { label: "Comments", state: "Optional" },
          { label: "Sign-off", pct: 33 },
        ]}
        active={1}
        missing={["12 checklist items unanswered", "Inspector", "Sign-off date"]}
        gate="this inspection can be completed"
        summaryTitle="Inspection report (PDF)"
        summaryRows={[["Answered", "18 of 30"], ["Evidence files", "3"], ["Signed by", null]]}
      />
      <h3 style={h3Style}>The header</h3>
      <p style={pStyle}>The top shows the inspection number, title and status, with the form number and revision underneath. The buttons are <strong>Complete Inspection</strong> (only while the status is Draft or Open), <strong>Save Inspection</strong> and <strong>Hide Panel</strong>. <strong>Complete Inspection</strong> sets the status to Complete and saves, the same as choosing Complete in the Status box and clicking Save Inspection.</p>
      <h3 style={h3Style}>The four steps</h3>
      <div style={stepList}>
        <Step n={1}><strong>Report details</strong> (site, date, inspector): Inspection No., Status, Title, Department, date, project, vessel, area and inspector. Percentage.</Step>
        <Step n={2}><strong>Checklist</strong>: every checklist section, plus the Evidence panel. It reads how many items are answered, for example <em>18 of 30 answered</em>, and how many notes are needed for items marked No. Percentage is the share answered.</Step>
        <Step n={3}><strong>Comments</strong> (overall remarks): Additional Comments and, on a saved inspection, the Linked Actions panel. It reads <em>Optional</em> until you add a comment.</Step>
        <Step n={4}><strong>Sign-off</strong> (name and date): the sign-off name, position, company and date. Percentage.</Step>
      </div>
      <h3 style={h3Style}>Still missing</h3>
      <p style={pStyle}>A box lists what is still missing before the inspection can be completed: Title, Inspection date, Inspector, <em>N checklist items unanswered</em>, Sign-off name and Sign-off date. A comment on a No answer is optional, so a No without a comment is never listed as missing. Click a chip to jump to its step.</p>
      <div style={callout("info")}>
        <span>ℹ</span>
        <div>The chips warn, they never block. If you click <strong>Complete Inspection</strong> with items missing you are asked &ldquo;N items are still missing: ... Complete anyway?&rdquo; and can carry on. A title is still needed to save.</div>
      </div>
      <h3 style={h3Style}>Form, Split and PDF</h3>
      <p style={pStyle}><strong>Form</strong> shows only the fields, <strong>Split</strong> shows them beside the live <strong>Inspection report (PDF)</strong> summary, and <strong>PDF</strong> shows that summary on its own. The summary shows the report details, how many items are answered, the open findings (every item marked No, with its comment if you wrote one) and the sign-off. Gaps in the report details and sign-off show as an amber &ldquo;to be completed&rdquo; that you can click to jump to the right step.</p>
      <h3 style={h3Style}>All sections</h3>
      <p style={pStyle}>The <strong>All sections</strong> button shows the whole inspection on one long page, as it used to be. Click it again to return to one step at a time. At the bottom of a saved inspection, <strong>Export PDF</strong>, <strong>Save Inspection</strong> and <strong>Delete Inspection</strong> stay in place whichever step you are on; a new inspection shows only <strong>Save Inspection</strong>.</p>
    </>
  );
}

function SectionHseRegister() {
  return (
    <>
      <div style={eyebrow}>HSE Inspections</div>
      <h2 style={h2Style}>Register, Evidence &amp; PDF</h2>
      <h3 style={h3Style}>The Inspection Register</h3>
      <div style={mockPanel}>
        <div style={mockLabel}>Inspection Register</div>
        <div style={{ ...mockRow, alignItems: "center" }}>
          <div style={mockField(2)}><div style={mockInput}>Search inspections</div></div>
          <span style={btn("ghost")}>Clear Filters</span>
          <span style={btn("primary")}>Export PDF</span>
          <span style={btn("ghost")}>Export Excel</span>
          <span style={btn("primary")}>Create Inspection</span>
          <span style={btn("primary")}>Show Filters</span>
        </div>
        <div style={{ fontSize: 11, color: imsColours.muted, marginBottom: 6 }}>Showing 1 of 12 inspections</div>
        <table style={imsTableStyle}>
          <thead><tr>{["Inspection No.", "Type", "Area / Zone", "Inspector", "Date", "Status", "Report"].map(h => <th key={h} style={imsTableHeadStyle}>{h}</th>)}</tr></thead>
          <tbody>
            <tr>
              <td style={cellStrong}>HSE-INS-042</td>
              <td style={imsTableCellStyle}>Workplace Inspection - Base and Site</td>
              <td style={imsTableCellStyle}>Workshop</td>
              <td style={imsTableCellStyle}>A. Example</td>
              <td style={nowrapCell}>23 Nov 2026</td>
              <td style={imsTableCellStyle}><span style={badge("open")}>Open</span></td>
              <td style={imsTableCellStyle}><span style={btn("ghost")}>PDF</span></td>
            </tr>
          </tbody>
        </table>
      </div>
      <div style={stepList}>
        <Step n={1}>Use <strong>Search inspections</strong> to find a record by number, title, form, project, vessel, area or inspector name.</Step>
        <Step n={2}>Click <strong>Show Filters</strong> to reveal an <strong>All Statuses</strong> list (Draft, Open, Complete, Closed). <strong>Clear Filters</strong> resets both the search and the status. The toolbar runs left to right: search, <strong>Clear Filters</strong>, <strong>Export PDF</strong>, <strong>Export Excel</strong>, <strong>Create Inspection</strong> and <strong>Show Filters</strong>.</Step>
        <Step n={3}>Click <strong>Export PDF</strong> for a PDF register of the inspections currently shown (the HSE Inspection Register), or <strong>Export Excel</strong> for a workbook of them. Both follow your search and status filter and are greyed out when nothing is showing.</Step>
        <Step n={4}>Click a row. The record opens on the record screen in a panel on the page, where you can change anything on the form.</Step>
        <Step n={5}>Click <strong>Save Inspection</strong> to keep your changes, <strong>Complete Inspection</strong> when it is finished, <strong>Export PDF</strong> at the bottom of the record for that one inspection&apos;s report, or <strong>Delete Inspection</strong> to remove it. Delete asks you to confirm and also removes the linked evidence records.</Step>
      </div>
      <h3 style={h3Style}>Evidence (photos and files)</h3>
      <p style={pStyle}>You can attach <strong>photos, PDF, Word, Excel, PowerPoint, CSV and text files</strong>. You can choose several files at once.</p>
      <div style={mockPanel}>
        <div style={mockLabel}>Evidence Upload</div>
        <div style={mockField(2)}>
          <div style={mockFieldLabel}>Link evidence to item number</div>
          <div style={mockInput}>General inspection evidence</div>
        </div>
        <div style={{ margin: "8px 0" }}><span style={btn("primary")}>Upload Evidence</span></div>
        <div style={{ background: "#fff", border: `1px solid ${imsColours.border}`, borderRadius: 8, padding: "8px 10px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <div>
            <strong>walkway-pallets.jpg</strong>
            <div style={{ fontSize: 11, color: imsColours.muted }}>1.2 MB - Uploaded 23 Nov 2026, 10:14 - Item 2.1</div>
          </div>
          <div style={{ display: "flex", gap: 6 }}><span style={btn("ghost")}>Open / Preview</span><span style={btn("danger")}>Delete</span></div>
        </div>
      </div>
      <div style={stepList}>
        <Step n={1}>Evidence sits in step 2 <strong>Checklist</strong>. Either use the <strong>Upload</strong> button on a checklist row (it links the file to that item), or use the <strong>Evidence Upload</strong> panel and first choose an item in <strong>Link evidence to item number</strong>. Leave it on <strong>General inspection evidence</strong> if the file is not about one item.</Step>
        <Step n={2}>Click <strong>Upload Evidence</strong> (or <strong>Upload Photos / Files</strong> when creating) and pick the files.</Step>
        <Step n={3}>To look at a file, click <strong>Open / Preview</strong>. It opens in a new tab. If your browser blocks new tabs, it opens in the same tab, and the Back button brings you back to the IMS.</Step>
        <Step n={4}>To remove a file, click <strong>Delete</strong> and confirm.</Step>
      </div>
      <div style={callout("info")}>
        <span>ℹ</span>
        <div>When you are <strong>creating</strong> a new inspection, files are only <strong>staged</strong> (listed under &quot;Evidence Upload&quot; with a <strong>Remove</strong> button). They are uploaded when you click <strong>Save Inspection</strong>. On an inspection that is already saved, files upload straight away. If you try to upload before saving, you get &quot;Save the inspection before uploading evidence.&quot;</div>
      </div>
      <h3 style={h3Style}>Linked Actions</h3>
      <p style={pStyle}>Findings that need follow-up are handled as central Actions. In a saved inspection, the <strong>Linked Actions</strong> panel (in step 3 <strong>Comments</strong>) has a <strong>Create Linked HSE Action</strong> button. It opens the central Action form with the source set to HSE Inspection, department HSEQ, and the project and inspection number filled in. Linked actions are listed in the panel (action number, title, owner, status, due date), each with an <strong>Open Action</strong> link.</p>
      <h3 style={h3Style}>The PDF report</h3>
      <p style={pStyle}>Click <strong>PDF</strong> on a register row, or <strong>Export PDF</strong> at the bottom of the open record. The report contains the header details, every checklist section with N/A / Yes / No ticks and comments, <strong>Additional Comments</strong>, <strong>Actions</strong> (the linked central actions), <strong>Sign-Off</strong>, and an <strong>Evidence Register</strong> with an <strong>Open Evidence</strong> link for each file. PNG, JPG and WEBP photos are also placed in an <strong>Evidence Photos</strong> section.</p>
      <p style={pStyle}>The PDF opens in a new tab. If your browser or phone does not allow that, the file is saved to your device instead, so it is never lost. The file name is the inspection number followed by the form title.</p>
    </>
  );
}

// ── HSE: phone ───────────────────────────────────────────────────────────────

function SectionPhone() {
  return (
    <>
      <div style={eyebrow}>HSE Inspections</div>
      <h2 style={h2Style}>Completing an Inspection on a Phone</h2>
      <p style={pStyle}>The same inspection page works on a phone. On a narrow screen the checklist changes to one card per item with large <strong>N/A</strong>, <strong>Yes</strong> and <strong>No</strong> buttons, so it is easy to use with one hand.</p>
      <h3 style={h3Style}>Getting there</h3>
      <div style={stepList}>
        <Step n={1}>On a computer, open <strong>HSE Inspections</strong> and find <strong>Mobile QR Access</strong> on the Dashboard. Scan the QR code with your phone camera, or use <strong>Open mobile inspection page</strong>.</Step>
        <Step n={2}>On the <strong>Choose Inspection</strong> page, tap the form you want. All six show a <strong>Ready</strong> label.</Step>
        <Step n={3}>The form opens with the title, form number and revision at the top, and a message to complete the inspection and upload evidence as you go. The page menu is hidden so you can focus on the form.</Step>
      </div>
      <h3 style={h3Style}>Filling it in</h3>
      <div style={mockPanel}>
        <div style={mockLabel}>2.0 Working Area</div>
        <div style={{ background: "#fff", border: `1px solid ${imsColours.border}`, borderRadius: 10, padding: 12, maxWidth: 360 }}>
          <div style={{ fontSize: 13, marginBottom: 8 }}><strong>2.13</strong> PPE arrangements are complied with?</div>
          <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
            {["N/A", "Yes", "No"].map((a, i) => (
              <div key={a} style={{ flex: 1, textAlign: "center", padding: "8px 0", borderRadius: 8, border: `1px solid ${i === 1 ? imsColours.brand : imsColours.border}`, background: i === 1 ? imsColours.page : "#fff", color: i === 1 ? imsColours.brand : imsColours.ink, fontWeight: 700 }}>{a}</div>
            ))}
          </div>
          <div style={{ ...mockInput, marginBottom: 8, color: imsColours.muted }}>Comments / action notes</div>
          <span style={btn("ghost")}>Upload evidence for item 2.13</span>
        </div>
      </div>
      <div style={stepList}>
        <Step n={1}>Complete <strong>Report Details</strong> (title, date, area, inspector).</Step>
        <Step n={2}>For each item, tap <strong>N/A</strong>, <strong>Yes</strong> or <strong>No</strong> and add <strong>Comments / action notes</strong> if needed.</Step>
        <Step n={3}>Add <strong>Additional Comments</strong> and the <strong>Sign-Off</strong> details at the bottom.</Step>
        <Step n={4}>Tap <strong>Save Inspection</strong>. The record then opens in the register, where it is shown as a card with its status and a <strong>PDF</strong> button. The steps (Report details, Checklist, Comments, Sign-off) and the live <strong>Inspection report (PDF)</strong> summary are on the phone too: the steps sit in two columns above the form, and the still-missing box and summary appear below it.</Step>
      </div>
      <h3 style={h3Style}>Taking or uploading photos and files</h3>
      <div style={stepList}>
        <Step n={1}>Under the item you are looking at, tap <strong>Upload evidence for item 2.13</strong> (the number is that item&apos;s number). For a photo that is not about one item, use the <strong>Evidence Upload</strong> section further down: pick the item (or leave <strong>General inspection evidence</strong>) and tap <strong>Upload Photos / Files</strong>.</Step>
        <Step n={2}>Your phone asks where to get the file from. The exact wording depends on your phone, but you can use the <strong>camera</strong> to take a photo now, choose from your <strong>photo library</strong>, or pick a <strong>document</strong> from your files.</Step>
        <Step n={3}>You can pick more than one file at a time. Photos, PDF, Word, Excel and PowerPoint files are all accepted.</Step>
        <Step n={4}>On a new inspection the files are listed under <strong>Evidence Upload</strong> as staged. Check them there, and tap <strong>Remove</strong> if you chose the wrong one.</Step>
        <Step n={5}>Tap <strong>Save Inspection</strong>. Staged files are uploaded as part of saving, so do not close the page before you have saved. On an already-saved inspection, each file uploads straight away and the button shows <strong>Uploading...</strong> while it works.</Step>
      </div>
      <div style={callout("warning")}>
        <span>⚠</span>
        <div>Staged files are only held on the page until you save. If you close the browser or lose the page first, they are not kept. Save as soon as you have finished, then add any extras afterwards.</div>
      </div>
      <h3 style={h3Style}>Getting the PDF on your phone</h3>
      <p style={pStyle}>In the register, tap <strong>PDF</strong> on the inspection card (or <strong>Export PDF</strong> at the bottom of an open record). The report opens in a new tab. If your phone blocks that, it is saved to the phone (look in your downloads or Files app). Evidence files opened with <strong>Open / Preview</strong> behave the same way.</p>
      <p style={pStyle}>Buttons along the top of panels wrap onto a second line on a small screen, so scroll down if you cannot see one.</p>
    </>
  );
}

// ── Overall: lookahead & register ────────────────────────────────────────────

function SectionLookahead() {
  return (
    <>
      <div style={eyebrow}>Overall Inspections</div>
      <h2 style={h2Style}>Lookahead &amp; Register</h2>
      <p style={pStyle}>Overall Inspections (Project Management) lists every inspection across all projects. Each one comes from one of two places, shown in the <strong>Source</strong> column:</p>
      <table style={imsTableStyle}>
        <thead><tr>{["Source", "Where it comes from"].map(h => <th key={h} style={imsTableHeadStyle}>{h}</th>)}</tr></thead>
        <tbody>
          <tr><td style={nowrapCell}><strong>NOI</strong></td><td style={imsTableCellStyle}>Inspection points planned through a project ITP and its Notice of Inspection. These appear automatically.</td></tr>
          <tr><td style={nowrapCell}><strong>Manual</strong></td><td style={imsTableCellStyle}>Entries added by hand with <strong>New Manual Inspection</strong>.</td></tr>
        </tbody>
      </table>
      <p style={pStyle}>There are three tabs: <strong>8-Week Lookahead</strong>, <strong>Full Register</strong> and <strong>Review Points</strong>. Review Points is a separate list of review points and has its own guide.</p>
      <div style={mockPanel}>
        <div style={mockLabel}>8-Week Lookahead by Project</div>
        <div style={{ display: "grid", gridTemplateColumns: "110px repeat(4, minmax(80px, 1fr))", gap: 4, fontSize: 11 }}>
          <div style={{ fontWeight: 800, color: imsColours.brand }}>PROJECT</div>
          {["W/C 17 Nov", "W/C 24 Nov", "W/C 1 Dec", "W/C 8 Dec"].map(w => <div key={w} style={{ fontWeight: 800, color: imsColours.muted, textAlign: "center" }}>{w}</div>)}
          <div style={{ fontWeight: 800 }}>Project A</div>
          <div style={{ background: "#fff", borderRadius: 8, padding: 6 }}>
            <div style={{ background: imsColours.brandSoft, color: imsColours.brand, borderRadius: 6, padding: "4px 6px" }}>
              <div style={{ fontSize: 9, fontWeight: 900 }}>W · 19 NOV</div>
              <div style={{ fontWeight: 700 }}>FAT of manifold</div>
            </div>
          </div>
          <div style={{ background: imsColours.panel, borderRadius: 8, padding: 6, color: imsColours.muted, textAlign: "center" }}>-</div>
          <div style={{ background: "#fff", borderRadius: 8, padding: 6 }}>
            <div style={{ background: imsColours.brandSoft, color: imsColours.brand, borderRadius: 6, padding: "4px 6px" }}>
              <div style={{ fontSize: 9, fontWeight: 900 }}>H · 2 DEC</div>
              <div style={{ fontWeight: 700 }}>Weld inspection</div>
            </div>
            <div style={{ color: imsColours.brand, fontWeight: 800, marginTop: 4 }}>+1 more</div>
          </div>
          <div style={{ background: imsColours.panel, borderRadius: 8, padding: 6, color: imsColours.muted, textAlign: "center" }}>-</div>
        </div>
      </div>
      <h3 style={h3Style}>8-Week Lookahead</h3>
      <div style={stepList}>
        <Step n={1}>Open the <strong>8-Week Lookahead</strong> tab. The grid has one row per project and one column per week, starting from the Monday of the current week (headed <strong>W/C</strong>, week commencing).</Step>
        <Step n={2}>Each box shows up to two inspections as small chips with the type (W or H) and the date. Click a chip to open its details.</Step>
        <Step n={3}>If a box has more than two, click <strong>+ more</strong> to jump to the Full Register filtered to that project.</Step>
        <Step n={4}>Below the grid, the <strong>8-Week Lookahead Register</strong> lists the same period as a table with the columns Project, Date, Reference, Activity, ITP Ref, Supplier, Type, Attendees, Status, Source and Action.</Step>
      </div>
      <h3 style={h3Style}>Full Register</h3>
      <p style={pStyle}>The <strong>Full Register</strong> tab shows every inspection, past and future, sorted by project and then date. Inspections that do not have a date yet show <strong>Date TBC</strong> (they appear here but not in the lookahead). Click <strong>View</strong> on any row to open its details.</p>
      <div style={mockPanel}>
        <div style={mockLabel}>Summary cards</div>
        <div style={mockRow}>
          {[["In 8-Week Window", "14"], ["Projects Tracked", "6"], ["Manual Entries", "3"], ["Filtered Results", "14"]].map(([k, v]) => (
            <div key={k} style={{ ...mockField(), background: "#fff", border: `1px solid ${imsColours.border}`, borderRadius: 8, padding: "8px 10px" }}>
              <div style={mockFieldLabel}>{k}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: imsColours.brand }}>{v}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={callout("info")}>
        <span>ℹ</span>
        <div>The lookahead grid always lists every project. The <strong>Project</strong> and <strong>Attendee / company</strong> filters narrow the register table below it, not the grid. The other filters (Source, Supplier, Status, Witness / Hold, Client-visible only) apply to both.</div>
      </div>
    </>
  );
}

// ── Overall: details & manual entries ────────────────────────────────────────

function SectionManual() {
  return (
    <>
      <div style={eyebrow}>Overall Inspections</div>
      <h2 style={h2Style}>Inspection Details &amp; Manual Entries</h2>
      <h3 style={h3Style}>Opening an inspection</h3>
      <p style={pStyle}>Click a chip in the grid, or <strong>View</strong> in a register row. A panel opens showing Reference, ITP Reference, Type, Status and whether it is client visible. Below that you can update:</p>
      <div style={stepList}>
        <Step n={1}><code style={codeStyle}>Date</code>, <code style={codeStyle}>Location</code> and <code style={codeStyle}>Duration</code>.</Step>
        <Step n={2}><strong>Attendees</strong>: choose each person from the People Management list (up to six). Use <strong>Add attendee</strong> for another. If an older attendee was typed in freely, it shows &quot;Not in People Management&quot; and you can pick a proper contact to replace it.</Step>
        <Step n={3}><code style={codeStyle}>Internal notes (not exported)</code>. These notes never appear in the Excel or PDF exports.</Step>
        <Step n={4}><strong>Attachments</strong>: click <strong>Add attachment</strong> and choose a file (one at a time). Click a file name to open it.</Step>
        <Step n={5}>Click <strong>Save changes</strong>.</Step>
      </div>
      <p style={pStyle}>If you do not have edit permission, the fields are greyed out and the panel is for viewing only. For inspections that came from an ITP / NOI, use <strong>Open in NOI Creator</strong> to change the underlying NOI. Other details, such as the status of an NOI inspection, are managed there rather than here.</p>
      <h3 style={h3Style}>Adding a manual inspection</h3>
      <p style={pStyle}>Use a manual entry for an inspection that is not in an ITP or NOI, for example a one-off client visit.</p>
      <div style={mockPanel}>
        <div style={mockLabel}>New Manual Inspection</div>
        <div style={mockRow}>
          <div style={mockField()}><div style={mockFieldLabel}>Project</div><div style={mockInput}>Select project</div></div>
          <div style={mockField(2)}><div style={mockFieldLabel}>Title / activity</div><div style={mockInput}> </div></div>
          <div style={mockField()}><div style={mockFieldLabel}>Inspection date</div><div style={mockInput}> </div></div>
        </div>
        <div style={mockRow}>
          <div style={mockField()}><div style={mockFieldLabel}>ITP reference (optional)</div><div style={mockInput}>No ITP reference</div></div>
          <div style={mockField()}><div style={mockFieldLabel}>Witness / Hold (optional)</div><div style={mockInput}>W, H, or W/H</div></div>
          <div style={mockField()}><div style={mockFieldLabel}>Status</div><div style={mockInput}>Planned</div></div>
        </div>
        <span style={btn("primary")}>Add inspection</span>
      </div>
      <div style={stepList}>
        <Step n={1}>Click <strong>New Manual Inspection</strong> (above the register). It only shows if you have permission to create.</Step>
        <Step n={2}>Choose the <code style={codeStyle}>Project</code>, or pick <strong>+ Add new project</strong> and type a <code style={codeStyle}>New project name</code>.</Step>
        <Step n={3}>Enter <code style={codeStyle}>Title / activity</code> and <code style={codeStyle}>Inspection date</code>. These, together with the project, are required. If one is missing you get &quot;Complete the project, title, and inspection date before saving.&quot;</Step>
        <Step n={4}>Optionally add <code style={codeStyle}>Duration</code> (for example 09:00 / 2 hours), <code style={codeStyle}>Location</code>, <code style={codeStyle}>ITP reference (optional)</code>, <code style={codeStyle}>Witness / Hold (optional)</code> (W, H or W/H), and set <code style={codeStyle}>Status</code>.</Step>
        <Step n={5}>If you choose an ITP reference, the <code style={codeStyle}>Supplier</code> is taken from that ITP and cannot be edited. Without an ITP reference, type the supplier yourself.</Step>
        <Step n={6}>Tick or untick <strong>Show to client in exports</strong>. It is ticked by default.</Step>
        <Step n={7}>Add attendees and any attachments, then click <strong>Add inspection</strong>.</Step>
      </div>
      <p style={pStyle}>To change a manual entry later, open it and click <strong>Edit full details</strong>. To remove one, click <strong>Delete</strong> and confirm. Both buttons only appear for manual entries and only if you have edit permission. ITP / NOI entries cannot be deleted from this page.</p>
    </>
  );
}

// ── Overall: filters & exports ───────────────────────────────────────────────

function SectionExports() {
  return (
    <>
      <div style={eyebrow}>Overall Inspections</div>
      <h2 style={h2Style}>Filters &amp; Exports</h2>
      <h3 style={h3Style}>Filters</h3>
      <div style={mockPanel}>
        <div style={mockLabel}>Filters</div>
        <div style={mockRow}>
          <div style={mockField()}><div style={mockFieldLabel}>Project</div><div style={mockInput}>All projects</div></div>
          <div style={mockField()}><div style={mockFieldLabel}>Source</div><div style={mockInput}>All sources</div></div>
          <div style={mockField()}><div style={mockFieldLabel}>Supplier</div><div style={mockInput}>All suppliers</div></div>
          <div style={mockField()}><div style={mockFieldLabel}>Status</div><div style={mockInput}>All statuses</div></div>
        </div>
        <div style={mockRow}>
          <div style={mockField()}><div style={mockFieldLabel}>Witness / Hold</div><div style={mockInput}>All types</div></div>
          <div style={mockField()}><div style={mockFieldLabel}>Attendee / company</div><div style={mockInput}>Search attendees</div></div>
          <div style={mockField()}><div style={mockFieldLabel}>Client-visible only</div><div style={mockInput}>☐</div></div>
        </div>
      </div>
      <table style={imsTableStyle}>
        <thead><tr>{["Filter", "Choices"].map(h => <th key={h} style={imsTableHeadStyle}>{h}</th>)}</tr></thead>
        <tbody>
          <tr><td style={nowrapCell}><strong>Source</strong></td><td style={imsTableCellStyle}>All sources, ITP / NOI, Manual entry</td></tr>
          <tr><td style={nowrapCell}><strong>Witness / Hold</strong></td><td style={imsTableCellStyle}>All types, Witness (W), Hold (H). An inspection marked W/H matches both.</td></tr>
          <tr><td style={nowrapCell}><strong>Status</strong></td><td style={imsTableCellStyle}>Lists the statuses that exist in the data.</td></tr>
          <tr><td style={nowrapCell}><strong>Attendee / company</strong></td><td style={imsTableCellStyle}>Type part of a name or company to find inspections someone is attending.</td></tr>
          <tr><td style={nowrapCell}><strong>Client-visible only</strong></td><td style={imsTableCellStyle}>Hides entries that are marked as not for the client.</td></tr>
        </tbody>
      </table>
      <p style={pStyle}>Your filters stay in the page address, so you can copy the link to share the same view with a colleague. The <strong>Filtered Results</strong> card and the register subtitle (&quot;n matching inspections&quot;) show how many rows match.</p>
      <h3 style={h3Style}>Exporting</h3>
      <div style={stepList}>
        <Step n={1}>Choose the tab (<strong>8-Week Lookahead</strong> or <strong>Full Register</strong>) and set the filters you want.</Step>
        <Step n={2}>For a client copy, tick <strong>Client-visible only</strong> first.</Step>
        <Step n={3}>Click <strong>Export Excel</strong> for a spreadsheet, or <strong>Export PDF</strong> for a landscape report. The file downloads to your device.</Step>
      </div>
      <table style={imsTableStyle}>
        <thead><tr>{["Export", "What you get"].map(h => <th key={h} style={imsTableHeadStyle}>{h}</th>)}</tr></thead>
        <tbody>
          <tr><td style={nowrapCell}><strong>Export Excel</strong></td><td style={imsTableCellStyle}>A file named <code style={codeStyle}>Overall-Inspections-DATE.xlsx</code> with one sheet called Inspections. Columns: Project, Date, Reference, Activity, ITP Reference, Supplier, Type, Attendees, Status, Source.</td></tr>
          <tr><td style={nowrapCell}><strong>Export PDF</strong></td><td style={imsTableCellStyle}>A file named <code style={codeStyle}>Overall-Inspections-DATE.pdf</code> with the Enshore logo, the generation time and page numbers. From the lookahead tab, rows are grouped under <strong>Week Commencing</strong> bands; from the Full Register they run in one list.</td></tr>
        </tbody>
      </table>
      <div style={callout("warning")}>
        <span>⚠</span>
        <div>Exports contain whatever rows are currently shown. Entries marked not for the client are only left out if <strong>Client-visible only</strong> is ticked. Internal notes and attachments are never included.</div>
      </div>
    </>
  );
}

// ── Reference ────────────────────────────────────────────────────────────────

function SectionStatuses() {
  return (
    <>
      <div style={eyebrow}>Reference</div>
      <h2 style={h2Style}>Status Reference</h2>
      <h3 style={h3Style}>HSE inspection status</h3>
      <p style={pStyle}>Set on the form under <strong>Report Details</strong>, or with <strong>Complete Inspection</strong> in the header, which moves a Draft or Open inspection to Complete. New inspections start as <strong>Draft</strong>.</p>
      <table style={imsTableStyle}>
        <thead><tr>{["Status", "Use it when"].map(h => <th key={h} style={imsTableHeadStyle}>{h}</th>)}</tr></thead>
        <tbody>
          <tr><td style={nowrapCell}><span style={badge("draft")}>Draft</span></td><td style={imsTableCellStyle}>Default for a new inspection. Counts as an open inspection on the Dashboard.</td></tr>
          <tr><td style={nowrapCell}><span style={badge("open")}>Open</span></td><td style={imsTableCellStyle}>Counts as an open inspection on the Dashboard.</td></tr>
          <tr><td style={nowrapCell}><span style={badge("complete")}>Complete</span></td><td style={imsTableCellStyle}>Counts as completed on the Dashboard.</td></tr>
          <tr><td style={nowrapCell}><span style={badge("closed")}>Closed</span></td><td style={imsTableCellStyle}>Counts as completed on the Dashboard.</td></tr>
        </tbody>
      </table>
      <p style={pStyle}>Status is chosen by the person completing the form; the system does not change it automatically. On the Dashboard, Draft and Open both count towards <strong>Open Inspections</strong>, and Complete and Closed both count towards <strong>Completed / Closed</strong>.</p>
      <h3 style={h3Style}>Checklist answers</h3>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <span style={pill(imsColours.page, imsColours.muted)}>N/A</span>
        <span style={pill(imsColours.brand, "#ffffff")}>Yes</span>
        <span style={pill(imsColours.danger, "#ffffff")}>No</span>
      </div>
      <p style={pStyle}><strong>No</strong> answers are counted as <strong>Open Findings</strong> on the Dashboard.</p>
      <h3 style={h3Style}>Overall Inspections status (manual entries)</h3>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        {["Planned", "Confirmed", "Completed", "Cancelled"].map(s => <span key={s} style={badge(s)}>{s}</span>)}
      </div>
      <p style={pStyle}>Entries that come from an ITP / NOI take their status from the NOI, so the <strong>Status</strong> filter may list other values as well.</p>
      <h3 style={h3Style}>Witness / Hold</h3>
      <table style={imsTableStyle}>
        <thead><tr>{["Code", "Meaning"].map(h => <th key={h} style={imsTableHeadStyle}>{h}</th>)}</tr></thead>
        <tbody>
          <tr><td style={cellStrong}>W</td><td style={imsTableCellStyle}>Witness point</td></tr>
          <tr><td style={cellStrong}>H</td><td style={imsTableCellStyle}>Hold point</td></tr>
          <tr><td style={cellStrong}>W/H</td><td style={imsTableCellStyle}>Both (matches either filter)</td></tr>
        </tbody>
      </table>
      <h3 style={h3Style}>Files you can attach</h3>
      <table style={imsTableStyle}>
        <thead><tr>{["Where", "Accepted"].map(h => <th key={h} style={imsTableHeadStyle}>{h}</th>)}</tr></thead>
        <tbody>
          <tr><td style={nowrapCell}>HSE inspection evidence</td><td style={imsTableCellStyle}>Photos (including a camera shot on a phone), PDF, Word, Excel, PowerPoint, CSV and text files. Several at once.</td></tr>
          <tr><td style={nowrapCell}>Overall Inspections attachments</td><td style={imsTableCellStyle}>One file at a time, using <strong>Add attachment</strong>.</td></tr>
        </tbody>
      </table>
    </>
  );
}

function SectionFaq() {
  const qa: [string, string][] = [
    ["Why are Create Inspection, Save Inspection or the upload buttons greyed out?", "You have read-only access. You will see a message starting \"Read-only access: you do not have permission to...\". Ask your IMS administrator if you need create or edit rights."],
    ["I cannot find my inspection in the register.", "Check the search box and click Show Filters, then Clear Filters. The status filter may be hiding it."],
    ["Where did Generate PDF Report go?", "It is now called Export PDF. It sits at the bottom of an open inspection for that one report, and on the register toolbar for a PDF of the inspections shown."],
    ["I added photos on a new inspection but nothing shows under Evidence.", "Files are staged until you click Save Inspection. Make sure you saved. After saving, they appear in the Evidence Upload panel of the saved record."],
    ["Can I use a photo I took earlier instead of taking a new one?", "Yes. On a phone, choose the photo library or files option when it asks where to get the file from."],
    ["Can I attach a Word, Excel or PowerPoint file as evidence?", "Yes. PDF, Word, Excel, PowerPoint, CSV, text and photos are accepted. In the PDF report these files appear as links in the Evidence Register. Only PNG, JPG and WEBP photos are also embedded as pictures."],
    ["The PDF did not open on my phone.", "If your phone blocks new tabs, the PDF is saved to the phone instead. Check your downloads or Files app."],
    ["Why does Open Inspections include Drafts?", "The card counts everything that is not Complete or Closed. Clicking it opens the register filtered to Open only."],
    ["Where do I record actions from an inspection?", "In the saved inspection, go to step 3 Comments and use Create Linked HSE Action. Actions are managed in central Action Management and listed under Linked Actions and in the PDF."],
    ["An inspection I expect is missing from the 8-Week Lookahead.", "It may have no date yet, or fall outside the eight weeks from this Monday. Dateless entries appear only in the Full Register as Date TBC. Also check the Source, Supplier, Status, Witness / Hold and Client-visible only filters."],
    ["How do I stop an entry appearing in a client export?", "For a manual entry, untick Show to client in exports (open it, then Edit full details). Then tick Client-visible only before exporting."],
    ["Can I delete an inspection that came from an NOI?", "Not on this page. Delete is only for manual entries. Open in NOI Creator to work on the NOI itself."],
    ["Who can I pick as an attendee, inspector or sign-off?", "Only people in the People register. If someone is missing, ask an administrator to add them there."],
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
  overview:    SectionOverview,
  hsestart:    SectionHseStart,
  hsefill:     SectionHseFill,
  recordscreen: SectionRecordScreen,
  hseregister: SectionHseRegister,
  phone:       SectionPhone,
  lookahead:   SectionLookahead,
  manual:      SectionManual,
  exports:     SectionExports,
  statuses:    SectionStatuses,
  faq:         SectionFaq,
};

export const inspectionsGuide: GuideDefinition = {
  id: "inspections",
  navLabel: "Inspections",
  guideLabel: "Inspections",
  defaultSection: "overview",
  sections,
  sectionComponents,
};
