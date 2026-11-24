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
  | "overview" | "dashboard" | "create" | "issue" | "extensions"
  | "closure" | "attachments" | "outputs" | "reference" | "faq";

const sections: GuideSectionDef[] = [
  { key: "overview",    label: "Overview",                     group: "Getting Started" },
  { key: "dashboard",   label: "Dashboard & Register",         group: "Getting Started" },
  { key: "create",      label: "Creating a Permit",            group: "Core Workflows" },
  { key: "issue",       label: "Issue & Acceptance",           group: "Core Workflows" },
  { key: "extensions",  label: "Extensions",                   group: "Core Workflows" },
  { key: "closure",     label: "Closing a Permit",             group: "Core Workflows" },
  { key: "attachments", label: "Attachments",                  group: "Supporting Files" },
  { key: "outputs",     label: "Word & PDF Output",            group: "Supporting Files" },
  { key: "reference",   label: "Status & Field Reference",     group: "Reference" },
  { key: "faq",         label: "Common Questions",             group: "Reference" },
];

function badge(status: string): CSSProperties {
  const map: Record<string, { bg: string; color: string }> = {
    draft:            { bg: imsColours.page,        color: imsColours.muted },
    "awaiting issue": { bg: imsColours.warning,     color: "#ffffff" },
    issued:           { bg: imsColours.brandAccent, color: "#ffffff" },
    extended:         { bg: imsColours.brandAccent, color: "#ffffff" },
    closed:           { bg: imsColours.brand,       color: "#ffffff" },
  };
  const t = map[status.toLowerCase()] || map.draft;
  return pill(t.bg, t.color);
}

const workTypes = [
  "General Work", "Hot Work", "Electrical", "High Voltage Isolation", "Pressure Testing",
  "Work at Height", "Lifting Operations", "Entry & Confined Space Work", "Other",
];

const precautions = [
  "Safety Lines", "Hearing Protection", "Warning Signs", "Draining / Emptying", "Eye Protection",
  "Extinguisher", "Life Vest", "Radio / Comms", "Safety Helmet", "Fire Blanket", "Barriers",
  "WAH Rescue Plan", "Hand Protection", "Protective Clothing", "Toolbox Talk Attached", "Other",
];

const attachmentTypes = [
  "Risk Assessment", "Lift Plan", "Isolation Certificate", "Toolbox Talk",
  "Task Plan / Method Statement", "Equipment Certificates", "Photographs", "Other supporting evidence",
];

const chip = (selected: boolean): CSSProperties => ({
  display: "inline-block",
  fontSize: 11,
  fontWeight: 700,
  padding: "5px 10px",
  borderRadius: 8,
  border: `1px solid ${selected ? imsColours.brandAccent : imsColours.border}`,
  background: selected ? imsColours.brandSoft : imsColours.panel,
  color: selected ? imsColours.brand : imsColours.ink,
});

function SectionOverview() {
  return (
    <>
      <div style={eyebrow}>Getting Started</div>
      <h2 style={h2Style}>Overview</h2>
      <p style={pStyle}>The Permit to Work (PTW) page, under <strong>HSE Management</strong>, is where permits are planned, issued, extended and closed. It follows the company form <strong>ENS-HSEQ-FRM-010</strong>: the screen is laid out in the same sections as the paper form, and the Word and PDF outputs reproduce that form.</p>
      <div style={flowWrap}>
        <div style={flowStep()}>1 Work Type</div><div style={arrow}>→</div>
        <div style={flowStep()}>2 Description</div><div style={arrow}>→</div>
        <div style={flowStep()}>3 Precautions</div><div style={arrow}>→</div>
        <div style={flowStep()}>4 Issue / Acceptance</div><div style={arrow}>→</div>
        <div style={flowStep()}>5A–D Extensions</div><div style={arrow}>→</div>
        <div style={flowStep(true)}>5E Closure</div>
      </div>
      <h3 style={h3Style}>The four tabs</h3>
      <table style={imsTableStyle}>
        <thead>
          <tr>{["Tab", "What it is for"].map(h => <th key={h} style={imsTableHeadStyle}>{h}</th>)}</tr>
        </thead>
        <tbody>
          <tr><td style={{ ...imsTableCellStyle, fontWeight: 800 }}>Dashboard</td><td style={imsTableCellStyle}>Counts of permits by status. Clicking a count takes you to the register.</td></tr>
          <tr><td style={{ ...imsTableCellStyle, fontWeight: 800 }}>PTW Register</td><td style={imsTableCellStyle}>The list of every saved permit, with search and filters. Click a row to open it.</td></tr>
          <tr><td style={{ ...imsTableCellStyle, fontWeight: 800 }}>Create PTW</td><td style={imsTableCellStyle}>The permit form itself, used both for new permits and for editing saved ones.</td></tr>
          <tr><td style={{ ...imsTableCellStyle, fontWeight: 800 }}>Template Layout</td><td style={imsTableCellStyle}>A reference list of the sections on the ENS-HSEQ-FRM-010 form.</td></tr>
        </tbody>
      </table>
      <div style={callout("info")}>
        <span>ℹ</span>
        <div>The IMS records and reports the permit. It does <strong>not</strong> block or approve anything for you: the <code style={codeStyle}>Status</code> is chosen by hand, and none of the sign-off blocks are locked or checked. Your site rules still decide who may issue, accept and close a permit.</div>
      </div>
    </>
  );
}

function SectionDashboard() {
  return (
    <>
      <div style={eyebrow}>Getting Started</div>
      <h2 style={h2Style}>Dashboard &amp; Register</h2>
      <h3 style={h3Style}>Dashboard counts</h3>
      <div style={mockPanel}>
        <div style={mockLabel}>Dashboard</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {[
            ["Open PTWs", "Everything not yet Closed"],
            ["Awaiting Issue", "Status is Awaiting Issue"],
            ["Active Work", "Issued or Extended"],
            ["Extensions", "Has an extension date or time filled in"],
            ["Closed PTWs", "Status is Closed"],
          ].map(([t, d]) => (
            <div key={t} style={{ flex: "1 1 130px", background: "#fff", border: `1px solid ${imsColours.border}`, borderRadius: 8, padding: "9px 11px" }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: imsColours.brand }}>{t}</div>
              <div style={{ fontSize: 10, color: imsColours.muted, marginTop: 3 }}>{d}</div>
            </div>
          ))}
        </div>
      </div>
      <h3 style={h3Style}>The PTW Register</h3>
      <div style={mockPanel}>
        <div style={{ ...mockHero, marginTop: 0 }}>
          <div style={mockHeroEyebrow}>HSE Management</div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>PTW Register</div>
        </div>
        <div style={mockRow}>
          <div style={mockField(3)}><div style={{ ...mockInput, color: imsColours.muted }}>Search PTW no., location, work type, issuer...</div></div>
          <div><span style={btn("primary")}>Show Filters</span></div>
        </div>
        <div style={{ fontSize: 11, fontWeight: 700, margin: "4px 0 8px" }}>Showing 1 of 1 PTWs</div>
        <table style={imsTableStyle}>
          <thead>
            <tr>{["PTW No.", "Status", "Work Type", "Location / System", "Start", "End", "Issued By"].map(h => <th key={h} style={imsTableHeadStyle}>{h}</th>)}</tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ ...imsTableCellStyle, fontWeight: 800, color: imsColours.brand, whiteSpace: "nowrap" }}>PTW-001</td>
              <td style={imsTableCellStyle}><span style={badge("issued")}>Issued</span></td>
              <td style={imsTableCellStyle}>Hot Work, Work at Height</td>
              <td style={imsTableCellStyle}>Workshop bay 2</td>
              <td style={imsTableCellStyle}>01 Dec 2026</td>
              <td style={imsTableCellStyle}>01 Dec 2026</td>
              <td style={imsTableCellStyle}>A. Person</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div style={stepList}>
        <Step n={1}>Type in the search box. It looks at the PTW number, status, description of work, location, the issued-by and accepted-by names, and the work types.</Step>
        <Step n={2}>Click <strong>Show Filters</strong> to narrow by <code style={codeStyle}>All Statuses</code> or <code style={codeStyle}>All Work Types</code>. The work type list only offers types that appear on saved permits.</Step>
        <Step n={3}>Click <strong>Clear Filters</strong> to reset the search and both filters.</Step>
        <Step n={4}>Click any row to open that permit on the <strong>Create PTW</strong> tab for viewing or editing.</Step>
      </div>
      <p style={pStyle}>The search and filters are kept in the page address, so you can bookmark or share a filtered view.</p>
    </>
  );
}

function SectionCreate() {
  return (
    <>
      <div style={eyebrow}>Core Workflows</div>
      <h2 style={h2Style}>Creating a Permit</h2>
      <p style={pStyle}>Sections 1 to 3 describe the job and the precautions. You can save at any time, including part-completed, with the status left on <span style={badge("draft")}>Draft</span>.</p>
      <div style={stepList}>
        <Step n={1}>Click <strong>New PTW</strong> (top right of the page, or on the Dashboard). A blank form opens with the next free number already filled in, for example <code style={codeStyle}>PTW-001</code>, <code style={codeStyle}>PTW-002</code>. You can overtype the number.</Step>
        <Step n={2}><strong>Section 1 – Work Type.</strong> Tick every type of work that applies. Ticking <strong>Other</strong> reveals an <code style={codeStyle}>Other Work Type</code> box.</Step>
        <Step n={3}><strong>Section 2 – Description of Work.</strong> Complete <code style={codeStyle}>Description of Work</code>, <code style={codeStyle}>Equipment / Tools to be Used</code> and <code style={codeStyle}>Exact Location of Work / System to be Worked On</code>.</Step>
        <Step n={4}><strong>Section 3 – Preparation and Precautions.</strong> Complete the boxes and Yes/No buttons shown below, then tick the precautions that apply.</Step>
        <Step n={5}>Click <strong>Save PTW</strong>.</Step>
      </div>
      <div style={mockPanel}>
        <div style={mockLabel}>Section 1 – Work Type (tick as applicable)</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {workTypes.map((w, i) => <span key={w} style={chip(i === 1 || i === 5)}>{i === 1 || i === 5 ? "X " : ""}{w}</span>)}
        </div>
      </div>
      <h3 style={h3Style}>Section 3 fields</h3>
      <div style={mockPanel}>
        <div style={mockRow}>
          <div style={mockField()}><div style={mockFieldLabel}>Risk Assessment</div><div style={{ ...mockInput, minHeight: 40 }} /></div>
          <div style={mockField()}><div style={mockFieldLabel}>Lift Plan</div><div style={{ ...mockInput, minHeight: 40 }} /></div>
        </div>
        <div style={mockRow}>
          {["Isolation Required", "Electrical", "Mechanical", "Pressure"].map(l => (
            <div key={l} style={mockField(1)}>
              <div style={mockFieldLabel}>{l}</div>
              <div style={{ display: "flex", gap: 6 }}><span style={chip(false)}>Yes</span><span style={chip(false)}>No</span></div>
            </div>
          ))}
        </div>
        <div style={mockFieldLabel}>Description of Isolation</div>
        <div style={{ ...mockInput, minHeight: 36, marginBottom: 10 }} />
        <div style={mockLabel}>Precautions</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
          {precautions.map((p, i) => <span key={p} style={chip(i === 8 || i === 4)}>{i === 8 || i === 4 ? "X " : ""}{p}</span>)}
        </div>
        <div style={mockRow}>
          <div style={mockField()}><div style={mockFieldLabel}>Check List Used?</div><div style={{ display: "flex", gap: 6 }}><span style={chip(false)}>Yes</span><span style={chip(false)}>No</span></div></div>
          <div style={mockField()}><div style={mockFieldLabel}>Condition of PTE to be Inspected</div><div style={mockInput} /></div>
          <div style={mockField()}><div style={mockFieldLabel}>Hrs. by Issuing Authority</div><div style={mockInput} /></div>
        </div>
      </div>
      <p style={pStyle}>The Yes/No buttons can be clicked again to clear them. Ticking <strong>Other</strong> in the precautions reveals an <code style={codeStyle}>Other Precaution</code> box. <code style={codeStyle}>Hrs. by Issuing Authority</code> accepts a number only.</p>
      <div style={callout("info")}>
        <span>ℹ</span>
        <div>After the first save the permit stays open on the Create PTW tab and the heading shows its number and status. No field is compulsory to save, so check the form is complete before relying on it.</div>
      </div>
    </>
  );
}

function SectionIssue() {
  return (
    <>
      <div style={eyebrow}>Core Workflows</div>
      <h2 style={h2Style}>Issue &amp; Acceptance (Section 4)</h2>
      <p style={pStyle}>Section 4 records when the permit runs and who issued and accepted it. The form shows the printed note <em>Maximum 12 hours or to shift change</em>; the IMS does not check the times you enter against it.</p>
      <div style={stepList}>
        <Step n={1}>Enter <code style={codeStyle}>Start Time</code>, <code style={codeStyle}>Start Date</code>, <code style={codeStyle}>End Time</code> and <code style={codeStyle}>End Date</code>.</Step>
        <Step n={2}>Under <strong>Permit Issued by Authorised Person</strong>, pick the person from the <code style={codeStyle}>Name</code> list (<em>Select person</em>).</Step>
        <Step n={3}>Check <code style={codeStyle}>Position</code>, fill in <code style={codeStyle}>Company</code> and <code style={codeStyle}>Date</code>, and type the confirmation in <code style={codeStyle}>Signature / Confirmation</code>.</Step>
        <Step n={4}>Repeat for <strong>Permit Accepted By</strong>.</Step>
        <Step n={5}>Change <code style={codeStyle}>Status</code> at the top of the form to <span style={badge("awaiting issue")}>Awaiting Issue</span> or <span style={badge("issued")}>Issued</span> as appropriate, and click <strong>Save PTW</strong>.</Step>
      </div>
      <div style={mockPanel}>
        <div style={mockLabel}>Permit Issued by Authorised Person</div>
        <div style={mockRow}>
          <div style={mockField()}><div style={mockFieldLabel}>Name</div><div style={mockInput}>Select person</div></div>
          <div style={mockField()}><div style={mockFieldLabel}>Position</div><div style={mockInput} /></div>
          <div style={mockField()}><div style={mockFieldLabel}>Company</div><div style={mockInput} /></div>
        </div>
        <div style={mockRow}>
          <div style={mockField()}><div style={mockFieldLabel}>Date</div><div style={mockInput} /></div>
          <div style={mockField()}><div style={mockFieldLabel}>Signature / Confirmation</div><div style={mockInput} /></div>
        </div>
      </div>
      <h3 style={h3Style}>Choosing names</h3>
      <p style={pStyle}>The <code style={codeStyle}>Name</code> list is filled from the <strong>People</strong> register and shows active people only, as name and role. Picking a person fills in their name and, if they have a role on record, the <code style={codeStyle}>Position</code>. You can still edit Position. Company, Date and Signature / Confirmation are typed in by hand; the IMS does not capture a drawn signature.</p>
      <div style={callout("warning")}>
        <span>⚠</span>
        <div>If someone is missing from the list, they need adding or reactivating in <strong>People</strong> first. If a saved permit names someone who is no longer active, their name stays on the permit and shows as <em>(saved value)</em>.</div>
      </div>
    </>
  );
}

function SectionExtensions() {
  return (
    <>
      <div style={eyebrow}>Core Workflows</div>
      <h2 style={h2Style}>Extensions (Sections 5A–5D)</h2>
      <p style={pStyle}>The form has four extension blocks, <strong>5A</strong>, <strong>5B</strong>, <strong>5C</strong> and <strong>5D</strong>. The form notes that extensions are <em>only if conditions of PTW have not changed</em>; that is a reminder printed on the form, not something the IMS checks.</p>
      <div style={stepList}>
        <Step n={1}>Open the saved permit from the <strong>PTW Register</strong>.</Step>
        <Step n={2}>In the first unused block (5A first), enter <code style={codeStyle}>PTW Extended To (Time)</code> and <code style={codeStyle}>Date</code>.</Step>
        <Step n={3}>Complete <strong>Permit Extension by Authorised Person</strong> and <strong>Permit Accepted By</strong> (name, position, company, date, signature / confirmation), in the same way as Section 4.</Step>
        <Step n={4}>Set <code style={codeStyle}>Status</code> to <span style={badge("extended")}>Extended</span> and click <strong>Save PTW</strong>.</Step>
      </div>
      <div style={mockPanel}>
        <div style={mockLabel}>Section 5A</div>
        <div style={mockRow}>
          <div style={mockField()}><div style={mockFieldLabel}>PTW Extended To (Time)</div><div style={mockInput} /></div>
          <div style={mockField()}><div style={mockFieldLabel}>Date</div><div style={mockInput} /></div>
        </div>
        <div style={{ fontSize: 11, color: imsColours.muted }}>Then: Permit Extension by Authorised Person, and Permit Accepted By.</div>
      </div>
      <p style={pStyle}>In the Word and PDF outputs, an extension block only appears if something has been entered in it (extended-to date or time, or either name). Empty blocks are left out. On the Dashboard, the <strong>Extensions</strong> count includes any permit with an extended-to date or time filled in.</p>
      <div style={callout("info")}>
        <span>ℹ</span>
        <div>The Status does not change by itself when you add an extension. Set it to Extended yourself if you want the register and the Active Work count to show it. Active Work counts both Issued and Extended.</div>
      </div>
    </>
  );
}

function SectionClosure() {
  return (
    <>
      <div style={eyebrow}>Core Workflows</div>
      <h2 style={h2Style}>Closing a Permit (Section 5E)</h2>
      <p style={pStyle}>Section 5E is headed <em>Permit Closure by Site Manager / Designate</em>, with the note <em>All work completed / suspended. Tags and key returned and area checked as safe and tidy.</em> That wording is printed on the form for the people closing the permit.</p>
      <div style={stepList}>
        <Step n={1}>Open the permit from the <strong>PTW Register</strong>.</Step>
        <Step n={2}>Under <strong>Person Performing the Work</strong>, pick the name and complete position, company, date and signature / confirmation.</Step>
        <Step n={3}>Under <strong>PTW Issuing Authority</strong>, do the same.</Step>
        <Step n={4}>Set <code style={codeStyle}>Status</code> to <span style={badge("closed")}>Closed</span> and click <strong>Save PTW</strong>.</Step>
      </div>
      <p style={pStyle}>Once saved as Closed, the permit drops out of the Dashboard <strong>Open PTWs</strong> count and is included in <strong>Closed PTWs</strong>. You can still find and open it in the register by filtering on <code style={codeStyle}>Closed</code>.</p>
      <div style={callout("warning")}>
        <span>⚠</span>
        <div>Closing is just a status you set. The IMS does not check that the closure names or dates are filled in, and a closed permit can still be edited. There is no separate <em>Cancelled</em> status; the only statuses are Draft, Awaiting Issue, Issued, Extended and Closed.</div>
      </div>
      <h3 style={h3Style}>Deleting a permit</h3>
      <p style={pStyle}>With a saved permit open, <strong>Delete PTW</strong> removes it after you confirm. The button is greyed out for a permit that has not been saved. Deleting takes the record off the register, so use it for mistakes, not for finished work.</p>
    </>
  );
}

function SectionAttachments() {
  return (
    <>
      <div style={eyebrow}>Supporting Files</div>
      <h2 style={h2Style}>Attachments</h2>
      <p style={pStyle}>The <strong>Attachments and Distribution</strong> section lets you list the supporting documents for the permit and upload a file against each one.</p>
      <div style={mockPanel}>
        <div style={mockLabel}>Attachments and Distribution</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
          {attachmentTypes.map((a, i) => <span key={a} style={chip(i === 0 || i === 6)}>{i === 0 || i === 6 ? "X " : ""}{a}</span>)}
        </div>
        <div style={{ background: "#fff", border: `1px solid ${imsColours.border}`, borderRadius: 8, padding: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 12 }}>Risk Assessment</div>
              <div style={{ fontSize: 10, color: imsColours.muted }}>Upload the matching document so it is listed in the generated Word/PDF report.</div>
            </div>
            <span style={btn("ghost")}>Upload</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 11, background: imsColours.page, borderRadius: 6, padding: "6px 8px" }}>
            <span>Risk-assessment.pdf</span><span>240.0 KB</span><span style={{ color: imsColours.danger, fontWeight: 800 }}>Remove</span>
          </div>
        </div>
      </div>
      <div style={stepList}>
        <Step n={1}>Tick the type of document (for example <strong>Risk Assessment</strong> or <strong>Photographs</strong>). A card appears for each ticked type.</Step>
        <Step n={2}>Click <strong>Upload</strong> on the card and choose one or more files. Files must be uploaded against a ticked type.</Step>
        <Step n={3}>If the permit is already saved, the files upload straight away and are listed on the card with their size. If it is not saved yet, they show as <em>Queued</em> and upload when you click <strong>Save PTW</strong>.</Step>
        <Step n={4}>To remove a file, click <strong>Remove</strong> and confirm.</Step>
        <Step n={5}>Use <code style={codeStyle}>Notes / Supporting Evidence References</code> for anything else worth recording, such as a document number.</Step>
      </div>
      <h3 style={h3Style}>What you can attach</h3>
      <p style={pStyle}>PDF, Word, Excel and PowerPoint files, plus photos (also CSV and text files). On a phone, the <strong>Upload</strong> button offers the camera and the photo library as well as files, and Word, Excel and PowerPoint files keep their correct file type so they open in the right app afterwards.</p>
      <h3 style={h3Style}>Distribution note</h3>
      <p style={pStyle}>The form ends with the printed distribution note: <em>Original – Issuing Authority, 1st Copy – Displayed at Work Location, 2nd Copy – At Isolation Point.</em> It is printed in the Word and PDF outputs.</p>
    </>
  );
}

function SectionOutputs() {
  return (
    <>
      <div style={eyebrow}>Supporting Files</div>
      <h2 style={h2Style}>Word &amp; PDF Output</h2>
      <p style={pStyle}>At the bottom of the Create PTW tab, <strong>Generate Word</strong> and <strong>Generate PDF</strong> produce the permit as a document on the ENS-HSEQ-FRM-010 layout.</p>
      <div style={mockPanel}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <span style={btn("primary")}>Save PTW</span>
          <span style={btn("ghost")}>New PTW</span>
          <span style={btn("ghost")}>Reset Form</span>
          <span style={btn("danger")}>Delete PTW</span>
          <span style={btn("ghost")}>Generate Word</span>
          <span style={btn("ghost")}>Generate PDF</span>
        </div>
      </div>
      <div style={stepList}>
        <Step n={1}>Open the permit and make sure it is complete.</Step>
        <Step n={2}>Click <strong>Generate Word</strong> or <strong>Generate PDF</strong>. The file downloads, named after the permit, for example <code style={codeStyle}>PTW-001-permit-to-work.pdf</code> or <code style={codeStyle}>PTW-001-permit-to-work.docx</code>.</Step>
        <Step n={3}>On a phone or tablet, the download is saved to the device in the same way; open it from your downloads or the Files app.</Step>
      </div>
      <h3 style={h3Style}>What is in the document</h3>
      <p style={pStyle}>Permit Details, then Sections 1 to 4, any extensions that have been filled in, Section 5 closure, and Attachments and Distribution. The PDF carries the form reference and page numbers in its footer. The Attachments table lists each ticked document type with the uploaded file name, size and upload date, and an <strong>Open document</strong> link. A ticked type with no file shows <em>No uploaded document</em>.</p>
      <div style={callout("info")}>
        <span>ℹ</span>
        <div>The document is built from what is on screen, so unsaved changes are included. Click <strong>Save PTW</strong> as well, otherwise the saved record will not match the document you sent out. Generating a document does not change the permit and the IMS does not keep a copy of it.</div>
      </div>
      <div style={callout("warning")}>
        <span>⚠</span>
        <div>The <strong>Open document</strong> links work for about six months and carry the access themselves, so anyone with the document can open the attachments. Only send it to people who should see them. Attachments uploaded to a permit that has not been saved yet will not appear until you save.</div>
      </div>
    </>
  );
}

function SectionReference() {
  const statusRows: [string, string, string][] = [
    ["draft", "Draft", "Default for a new permit. Being prepared; not yet in use."],
    ["awaiting issue", "Awaiting Issue", "Prepared and waiting to be issued. Counted in Open PTWs and Awaiting Issue."],
    ["issued", "Issued", "Permit is live. Counted in Open PTWs and Active Work."],
    ["extended", "Extended", "Permit has been extended. Counted in Open PTWs and Active Work."],
    ["closed", "Closed", "Work finished and permit closed. Counted in Closed PTWs only."],
  ];
  return (
    <>
      <div style={eyebrow}>Reference</div>
      <h2 style={h2Style}>Status &amp; Field Reference</h2>
      <h3 style={h3Style}>Permit status</h3>
      <p style={pStyle}>Set from the <code style={codeStyle}>Status</code> drop-down at the top of the permit. The IMS never moves it for you.</p>
      <table style={imsTableStyle}>
        <thead>
          <tr>{["Status", "Meaning"].map(h => <th key={h} style={imsTableHeadStyle}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {statusRows.map(([key, label, meaning]) => (
            <tr key={key}>
              <td style={{ ...imsTableCellStyle, whiteSpace: "nowrap" }}><span style={badge(key)}>{label}</span></td>
              <td style={imsTableCellStyle}>{meaning}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h3 style={h3Style}>Permit types (Section 1)</h3>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
        {workTypes.map(w => <span key={w} style={chip(false)}>{w}</span>)}
      </div>
      <p style={pStyle}>More than one can be ticked on the same permit.</p>
      <h3 style={h3Style}>Where each part of the form sits</h3>
      <table style={imsTableStyle}>
        <thead>
          <tr>{["Section", "Contents"].map(h => <th key={h} style={imsTableHeadStyle}>{h}</th>)}</tr>
        </thead>
        <tbody>
          <tr><td style={{ ...imsTableCellStyle, fontWeight: 800 }}>Section 1</td><td style={imsTableCellStyle}>Work Type</td></tr>
          <tr><td style={{ ...imsTableCellStyle, fontWeight: 800 }}>Section 2</td><td style={imsTableCellStyle}>Description of Work, Equipment / Tools, Exact Location / System</td></tr>
          <tr><td style={{ ...imsTableCellStyle, fontWeight: 800 }}>Section 3</td><td style={imsTableCellStyle}>Risk Assessment, Lift Plan, isolations, precautions, check list, condition of PTE, hours by issuing authority</td></tr>
          <tr><td style={{ ...imsTableCellStyle, fontWeight: 800 }}>Section 4</td><td style={imsTableCellStyle}>Start / end time and date, Permit Issued by Authorised Person, Permit Accepted By</td></tr>
          <tr><td style={{ ...imsTableCellStyle, fontWeight: 800 }}>Section 5A–5D</td><td style={imsTableCellStyle}>Permit extensions</td></tr>
          <tr><td style={{ ...imsTableCellStyle, fontWeight: 800 }}>Section 5E</td><td style={imsTableCellStyle}>Permit closure: Person Performing the Work, PTW Issuing Authority</td></tr>
          <tr><td style={{ ...imsTableCellStyle, fontWeight: 800 }}>Last section</td><td style={imsTableCellStyle}>Attachments and Distribution, Notes / Supporting Evidence References</td></tr>
        </tbody>
      </table>
      <h3 style={h3Style}>Buttons on the permit form</h3>
      <table style={imsTableStyle}>
        <thead>
          <tr>{["Button", "What it does"].map(h => <th key={h} style={imsTableHeadStyle}>{h}</th>)}</tr>
        </thead>
        <tbody>
          <tr><td style={{ ...imsTableCellStyle, fontWeight: 800 }}>Save PTW</td><td style={imsTableCellStyle}>Saves a new permit, or updates the open one, and uploads any queued attachments.</td></tr>
          <tr><td style={{ ...imsTableCellStyle, fontWeight: 800 }}>New PTW</td><td style={imsTableCellStyle}>Opens a blank form with the next number. Unsaved changes on the current form are lost.</td></tr>
          <tr><td style={{ ...imsTableCellStyle, fontWeight: 800 }}>Reset Form</td><td style={imsTableCellStyle}>Puts the form back to how it was last saved (or blank, for a new permit).</td></tr>
          <tr><td style={{ ...imsTableCellStyle, fontWeight: 800 }}>Delete PTW</td><td style={imsTableCellStyle}>Deletes the saved permit after confirmation.</td></tr>
          <tr><td style={{ ...imsTableCellStyle, fontWeight: 800 }}>Generate Word / Generate PDF</td><td style={imsTableCellStyle}>Downloads the permit as a document.</td></tr>
        </tbody>
      </table>
    </>
  );
}

function SectionFaq() {
  const faqs: [string, string][] = [
    [
      "Does the IMS stop work starting if the permit is not signed?",
      "No. It records the permit and produces the paperwork. Status and sign-off fields are filled in by people, and nothing is blocked or checked.",
    ],
    [
      "How do I cancel a permit?",
      "There is no Cancelled status. The options are to set it to Closed, or to delete it with Delete PTW if it was raised in error. Agree with your HSEQ lead which to use.",
    ],
    [
      "I clicked Save PTW but the permit number changed or is blank.",
      "If the PTW No. is left empty, the IMS fills in the next free number when you save. You can overtype the number, so check it is unique before saving.",
    ],
    [
      "I picked a person but the Position is empty.",
      "The Position is filled from the person's role in People. If they have no role recorded, type it in yourself.",
    ],
    [
      "I uploaded a file but cannot see it in the report.",
      "The report lists files from the saved permit under each ticked attachment type. Check the type is ticked, the file shows on its card (not just as Queued), and that you have clicked Save PTW.",
    ],
    [
      "The download did not appear on my phone.",
      "The Word and PDF downloads are built to save on phones. Look in your downloads folder or the Files app. If nothing arrives, check your signal and try again.",
    ],
    [
      "Can I edit a permit after it is closed?",
      "Yes. A closed permit opens from the register like any other and can be changed and saved, so take care when editing one.",
    ],
    [
      "Can I attach photos from my phone?",
      "Yes. The Upload button offers the camera and photo library as well as files.",
    ],
  ];
  return (
    <>
      <div style={eyebrow}>Reference</div>
      <h2 style={h2Style}>Common Questions</h2>
      {faqs.map(([q, a]) => (
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
  dashboard:   SectionDashboard,
  create:      SectionCreate,
  issue:       SectionIssue,
  extensions:  SectionExtensions,
  closure:     SectionClosure,
  attachments: SectionAttachments,
  outputs:     SectionOutputs,
  reference:   SectionReference,
  faq:         SectionFaq,
};

export const ptwGuide: GuideDefinition = {
  id: "ptw",
  navLabel: "Permit to Work",
  guideLabel: "Permit to Work",
  defaultSection: "overview",
  sections,
  sectionComponents,
};
