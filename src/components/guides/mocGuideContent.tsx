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
  | "workflow" | "signoff" | "linkedaction" | "reports" | "statuses";

const sections: GuideSectionDef[] = [
  { key: "overview",     label: "Overview",                 group: "Getting Started" },
  { key: "register",     label: "Dashboard & Register",     group: "Getting Started" },
  { key: "create",       label: "Starting an MOC",           group: "Core Workflows" },
  { key: "form",         label: "Completing the Form",       group: "Core Workflows" },
  { key: "temporary",    label: "Temporary Changes",         group: "Core Workflows" },
  { key: "workflow",     label: "Review & Approval",         group: "Core Workflows" },
  { key: "signoff",      label: "Email Sign-Off",            group: "Core Workflows" },
  { key: "linkedaction", label: "Actions & Linked Actions",  group: "Linked Records" },
  { key: "reports",      label: "Reports & Register Annex",  group: "Reports" },
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
      <p style={pStyle}>The MOC page has four tabs: <strong>Dashboard</strong>, <strong>MOC Register</strong>, <strong>Create MOC</strong>, and <strong>Reports</strong>.</p>
      <h3 style={h3Style}>Change type</h3>
      <p style={pStyle}>Every MOC is tagged <strong>Permanent</strong> or <strong>Temporary</strong> at creation. A Temporary change carries a validity period (From / To dates in Section B) and is tracked as it approaches or passes its end date — shown on the MOC Dashboard, in the register, and on the Quality dashboard — so it isn&apos;t forgotten and quietly left in place.</p>
      <h3 style={h3Style}>Numbering and projects</h3>
      <p style={pStyle}>MOC numbers are allocated automatically from a series when the MOC is created. Company-wide MOCs use the <code style={codeStyle}>ENS-MOC-001</code> series; MOCs for a client project use that project&apos;s own series (for example <code style={codeStyle}>NEX-MOC-001</code> for Wadden Sea) so the client&apos;s numbering has no gaps. Project MOCs also carry which part(s) of the project they apply to, plus project reporting fields used in the client register report.</p>
      <h3 style={h3Style}>Permissions</h3>
      <p style={pStyle}>Creating an MOC needs <strong>Create</strong> permission. Saving, moving status, deleting, attachments, and sending sign-off emails need <strong>Edit</strong> permission.</p>
    </>
  );
}

function SectionRegister() {
  return (
    <>
      <div style={eyebrow}>Getting Started</div>
      <h2 style={h2Style}>The MOC Dashboard & Register</h2>
      <h3 style={h3Style}>Dashboard tab</h3>
      <p style={pStyle}>Six KPI tiles — <strong>Active MOCs</strong>, <strong>Temporary MOCs</strong>, <strong>In Review</strong>, <strong>Approved MOCs</strong>, <strong>Expiry in 7 Days</strong>, and <strong>Recently Created</strong> (last 30 days) — plus two panels: <strong>MOC Workload</strong> (Active / In Review / Approved) and <strong>Temporary Change Watch</strong> (Temporary / Expiry in 7 Days / Draft Ageing, meaning Drafts older than 14 days). Click any tile or number to open the register filtered to match.</p>
      <h3 style={h3Style}>MOC Register tab</h3>
      <div style={mockPanel}>
        <div style={{ ...mockHero, marginTop: 0 }}>
          <div style={mockHeroEyebrow}>Enshore IMS · Quality Management</div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>MOC Register</div>
        </div>
        <table style={imsTableStyle}>
          <thead>
            <tr>
              {["MOC Report No.", "MOC Report Title", "Change Type", "Status", "Created / Updated"].map(h => (
                <th key={h} style={imsTableHeadStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ ...imsTableCellStyle, fontWeight: 800, color: imsColours.brand, whiteSpace: "nowrap" }}>ENS-MOC-014</td>
              <td style={imsTableCellStyle}>Temporary re-route of cable lay vessel due to weather</td>
              <td style={imsTableCellStyle}>Temporary<div style={{ color: imsColours.danger, fontWeight: 700, fontSize: 11 }}>Expired 3 days ago</div></td>
              <td style={imsTableCellStyle}><span style={badge("in review")}>In Review</span></td>
              <td style={imsTableCellStyle}>02/09/2026 09:14</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p style={pStyle}>The register also shows the project / worksite (with the parts it applies to), the MOC Co-Ordinator, the Responsible ENS Manager / Supervisor, and a <strong>PDF</strong> button on each row. Use the search box and <strong>Show Filters</strong> to narrow by status (including <strong>Active</strong>, meaning not Closed), change type, project (or Company-wide), and a view: <strong>Recently Created</strong>, <strong>Expired Temporary</strong>, <strong>Expiry Soon</strong>, or <strong>Draft Ageing</strong>. Click a row to open the detail panel below the register.</p>
      <p style={pStyle}>The toolbar above the register runs left to right: the search box, <strong>Clear Filters</strong>, <strong>Export PDF</strong>, <strong>Export Excel</strong> and <strong>Show Filters</strong>. <strong>Export PDF</strong> makes a PDF register of the MOCs currently shown, and <strong>Export Excel</strong> downloads a workbook of them. Both follow your search and filters and are greyed out when nothing is showing. They are separate from the <strong>PDF</strong> button on each row, which makes the full report for that one MOC.</p>
    </>
  );
}

function SectionCreate() {
  return (
    <>
      <div style={eyebrow}>Core Workflows</div>
      <h2 style={h2Style}>Starting an MOC</h2>
      <div style={stepList}>
        <Step n={1}>Open the <strong>Create MOC</strong> tab. Answer <strong>Does this change belong to a project?</strong> — <em>No, company-wide</em> or <em>Yes, a project</em>.</Step>
        <Step n={2}>For a project, choose <strong>Which project?</strong> and then <strong>Which parts does it affect?</strong> (one or more parts, or <strong>All</strong>). The parts question only appears for projects that have parts, and you must answer it.</Step>
        <Step n={3}>The <code style={codeStyle}>MOC Report No.</code> shows the next number in the chosen series; the real number is allocated when you create the MOC. <code style={codeStyle}>Status</code> starts at <span style={badge("draft")}>Draft</span>.</Step>
        <Step n={4}>Enter the <code style={codeStyle}>MOC Report Title</code> and <code style={codeStyle}>Project / Worksite Address</code> (for a project MOC this defaults to the project name if left blank).</Step>
        <Step n={5}>Select the <code style={codeStyle}>MOC Co-Ordinator Name</code> and <code style={codeStyle}>Responsible ENS Manager / Supervisor</code> using the people search — both from People Management.</Step>
        <Step n={6}>Choose <code style={codeStyle}>Change Type</code> — <strong>Permanent</strong> or <strong>Temporary</strong>. For a Temporary change you enter the From / To dates in Section B once the record is open.</Step>
        <Step n={7}>Click <strong>Create MOC</strong>. The record opens in the detail panel to complete the remaining sections. <strong>Clear</strong> resets the starter form.</Step>
      </div>
      <div style={mockPanel}>
        <div style={mockLabel}>Create MOC starter form</div>
        <div style={mockRow}>
          <div style={mockField()}><div style={mockFieldLabel}>MOC Report No.</div><input style={mockInput} defaultValue="ENS-MOC-014" readOnly /></div>
          <div style={mockField()}><div style={mockFieldLabel}>Status</div><input style={mockInput} defaultValue="Draft" readOnly /></div>
        </div>
        <div style={mockRow}>
          <div style={mockField()}><div style={mockFieldLabel}>MOC Co-Ordinator</div><select style={mockInput}><option>Jordan Beaton</option></select></div>
          <div style={mockField()}><div style={mockFieldLabel}>Change Type</div><select style={mockInput}><option>Temporary</option></select></div>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <span style={btn("primary")}>Create MOC</span>
          <span style={btn("ghost")}>Clear</span>
        </div>
      </div>
    </>
  );
}

function SectionForm() {
  const rows: [string, string][] = [
    ["A", "MOC Report Details — report number, title, project / worksite, coordinator and responsible manager (with positions)."],
    ["B", "Change Identification — description of the change, reason, Permanent / Temporary (with From / To dates), how it will be implemented."],
    ["C", "Action Plan — the actions to implement the change, each with owner, target date, status and files. Linked automatically to central Actions."],
    ["D", "Change Impact — tick every area affected (Health & Safety, Environment, Quality, SCM, Schedule, Equipment, Fabrication Opps, Engineering, Marine operations, Organization, Regulatory, Documentation, Reputation, SIMOPS, Other)."],
    ["E", "Affected Documentation — procedures, drawings, or records that need updating (number, title, revision)."],
    ["F", "Risk Management — risk documents, whether a HIRA is required, changes to lifting or PTW philosophy, environmental impact."],
    ["G", "Hazards & Mitigating Actions — hazards and risks introduced and the proposed mitigations."],
    ["H", "Cost Review — cost impact of the change."],
    ["I", "Schedule Review — schedule impact of the change."],
    ["J", "Supporting Documentation and Information — notes, Variation Order reference (or N/A), and the Supporting Documents upload list."],
    ["K", "Review and Endorsement — reviewers sent the MOC by email to approve or be informed."],
    ["L", "MOC Change Acceptance — formal acceptance, signed off by email."],
    ["M", "MOC Close-out Verification — confirmation the change was implemented as planned, signed off by email."],
  ];
  const locks: [string, string][] = [
    ["Draft", "Everything is editable, including adding, removing and reordering rows and changing Change Type."],
    ["In Review", "Content can be edited, but rows cannot be added, removed or reordered and Change Type is locked."],
    ["Approved", "Implementation content (action plan, hazards, cost, schedule, supporting information) and close-out (M) stay editable; the proposal and review structure is locked."],
    ["Closed", "Fully locked, including attachments (which can still be opened)."],
  ];
  return (
    <>
      <div style={eyebrow}>Core Workflows</div>
      <h2 style={h2Style}>Completing the MOC Form</h2>
      <p style={pStyle}>Click an MOC in the register to open the detail panel. The thirteen sections are grouped into four stages along the top of the panel — <strong>1 Describe</strong> (A, B), <strong>2 Assess</strong> (D, F, G, H, I), <strong>3 Plan</strong> (C, E, J), and <strong>4 Sign-off</strong> (K, L, M). Each stage shows a checklist of what is still missing; this is a guide and does not block you from saving or moving status.</p>
      <p style={pStyle}>Use the <strong>Form</strong> / <strong>Split</strong> / <strong>Report</strong> switch to show the form full width, the form beside a live preview of the report as it builds, or the report full width. Your choice is remembered on that browser.</p>
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
        <div>Click <strong>Save MOC</strong> from any point in the form — you do not need to complete every section in a single sitting.</div>
      </div>
      <h3 style={h3Style}>Project reporting (project MOCs only)</h3>
      <p style={pStyle}>MOCs in a client project series have an extra <strong>Project Reporting</strong> block in stage 1: Applies to (parts), Client reference, Implementation from / to, Next step with owner and due date, a <strong>Status still to be confirmed</strong> tick, and <strong>Internal notes</strong>, which are never included in the client report. These feed the monthly register report on the Reports tab.</p>
      <h3 style={h3Style}>Attachments</h3>
      <p style={pStyle}><strong>Supporting Documents</strong> (under Section J) — click <strong>Upload Document</strong> to attach PDF, Word, Excel (.xls, .xlsx, .xlsm), PowerPoint (.ppt, .pptx), CSV, text, or photo files (.png, .jpg, .jpeg, .webp, .heic, .heif), one or many at a time, including from a phone. Each file has <strong>Open / Download</strong> and <strong>Remove</strong>. Files for an individual action are added from the <strong>Files</strong> column in Section C (see Actions &amp; Linked Actions).</p>
      <h3 style={h3Style}>What can be edited at each status</h3>
      <table style={imsTableStyle}>
        <thead>
          <tr>{["Status", "Editing"].map(h => <th key={h} style={imsTableHeadStyle}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {locks.map(([key, text]) => (
            <tr key={key}>
              <td style={{ ...imsTableCellStyle, whiteSpace: "nowrap" }}><span style={badge(key)}>{key}</span></td>
              <td style={imsTableCellStyle}>{text}</td>
            </tr>
          ))}
        </tbody>
      </table>
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
        <Step n={1}>Set <code style={codeStyle}>Change Type</code> to <strong>Temporary</strong> at creation, or in Section B while the MOC is still Draft.</Step>
        <Step n={2}>In Section B enter <code style={codeStyle}>If Temporary, From</code> and <code style={codeStyle}>If Temporary, To</code> — the To date is when the temporary change must be reverted or closed out. A hint under the dates shows the current state, for example &ldquo;Expires in 5 days&rdquo;.</Step>
        <Step n={3}>The register shows the validity under the Change Type (&ldquo;Expires in N days&rdquo; within 14 days, red once &ldquo;Expired N days ago&rdquo;). The <strong>Expiry in 7 Days</strong> tile and Temporary Change Watch on the MOC Dashboard count temporary MOCs ending within 7 days, and the <strong>Expired Temporary</strong> and <strong>Expiry Soon</strong> register views list them.</Step>
        <Step n={4}>When the change is resolved, revert it and move the MOC to <span style={badge("closed")}>Closed</span> (closed MOCs stop being flagged). If it is to stay, raise a new Permanent MOC.</Step>
      </div>
      <div style={callout("warning")}>
        <span>⚠</span>
        <div>A Temporary MOC past its <code style={codeStyle}>To</code> date counts as a <strong>Critical Pressure</strong> item on the Quality dashboard until it is closed, and one ending within 7 days counts as a warning item.</div>
      </div>
    </>
  );
}

function SectionWorkflow() {
  return (
    <>
      <div style={eyebrow}>Core Workflows</div>
      <h2 style={h2Style}>Review & Approval</h2>
      <p style={pStyle}>MOC status progresses in a single direction, one step at a time, using the workflow button at the top of the detail panel — its label changes depending on the current status. Moving status also saves the form.</p>
      <div style={stepList}>
        <Step n={1}>Complete the proposal (stages 1–3) and click <strong>Mark In Review</strong>. Status moves from <span style={badge("draft")}>Draft</span> to <span style={badge("in review")}>In Review</span>.</Step>
        <Step n={2}>In Section K, tick <strong>Approve</strong> or <strong>Inform</strong> for each party, choose the person, and send the emails (see Email Sign-Off).</Step>
        <Step n={3}>Click <strong>Mark Approved</strong>. Status moves to <span style={badge("approved")}>Approved</span>. It cannot be approved while an Approve reviewer has rejected it — resolve the rejection first.</Step>
        <Step n={4}>Once the change has been implemented and verified, complete Section M — Close-out Verification.</Step>
        <Step n={5}>Click <strong>Mark Closed</strong>. Status moves to <span style={badge("closed")}>Closed</span> and the MOC is locked.</Step>
      </div>
      <div style={callout("warning")}>
        <span>⚠</span>
        <div>Closed MOCs cannot be edited and there is no button to reopen them. MOCs numbered in a client project series cannot be deleted — close a withdrawn project MOC instead, because the client holds its number. Company-wide MOCs show a <strong>Delete</strong> button.</div>
      </div>
    </>
  );
}

function SectionSignoff() {
  const states: [string, string][] = [
    ["Pending", "Email sent; waiting for a decision."],
    ["Approved", "The person approved."],
    ["Rejected", "The person rejected, with a reason. The MOC Co-Ordinator is emailed."],
    ["Needs Attention", "The person returned comments. Comments neither approve nor reject; the MOC Co-Ordinator is emailed to follow up."],
    ["Informed", "Information-only email sent; resolved immediately."],
  ];
  return (
    <>
      <div style={eyebrow}>Core Workflows</div>
      <h2 style={h2Style}>Email Sign-Off (Sections K, L, M)</h2>
      <p style={pStyle}>Sections K, L, and M are not signed by typing or uploading a signature. Each row is emailed to a named person, who responds from a secure page — no IMS login needed.</p>
      <h3 style={h3Style}>Section K — Review and Endorsement</h3>
      <div style={stepList}>
        <Step n={1}>For each involved party (HSE, Quality, PM, Marine, Engineering, SCM, Operations, Assets, Finance, Crewing, SMT, CEO / COO — add or rename rows while Draft), choose the <strong>Person</strong>. Nobody is chosen for you, and their email must be on their People Management record.</Step>
        <Step n={2}>Tick <strong>Approve</strong> if they must make a decision, or <strong>Inform</strong> if they only need to know. A row with neither ticked shows &ldquo;Not included&rdquo;. If both are ticked, Approve wins.</Step>
        <Step n={3}>Click <strong>Send for Sign-Off</strong> (or <strong>Send for Information</strong>) on a row, or <strong>Email all chosen reviewers</strong> to send every ticked row that has not been sent yet (you confirm the list first). Sending saves the MOC and attaches the full MOC PDF.</Step>
        <Step n={4}>The Decision column then shows Awaiting, Approved, or Rejected with the date and any comment, and the Email column shows the request status with <strong>Resend email</strong>.</Step>
      </div>
      <h3 style={h3Style}>Sections L and M</h3>
      <p style={pStyle}>Acceptance (L) and Close-out (M) rows have a Role, Name, and Position, then a <strong>Send for Sign-Off</strong> button. The Decided date and Comments are filled in from the person&apos;s response. L and M have no Approve / Inform choice — they always ask for a decision. The Acceptance (L) rows are editable while the MOC is Draft or In Review, and Close-out (M) rows until the MOC is Closed.</p>
      <h3 style={h3Style}>What the recipient sees</h3>
      <p style={pStyle}>The email carries a link to a sign-off page showing the MOC number, title, and the role they are reviewing as. They type their name and choose <strong>Approve</strong>, <strong>Reject</strong>, or <strong>Comments</strong> (Reject and Comments need a note). The link expires after 30 days; use <strong>Resend email</strong> for a fresh one.</p>
      <table style={imsTableStyle}>
        <thead>
          <tr>{["Request status", "Meaning"].map(h => <th key={h} style={imsTableHeadStyle}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {states.map(([key, text]) => (
            <tr key={key}>
              <td style={{ ...imsTableCellStyle, whiteSpace: "nowrap", fontWeight: 700 }}>{key}</td>
              <td style={imsTableCellStyle}>{text}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={callout("info")}>
        <span>ℹ</span>
        <div>A decision that arrives by email is never overwritten by saving the form on a screen that was opened earlier.</div>
      </div>
    </>
  );
}

function SectionLinkedAction() {
  const statuses: [string, string][] = [
    ["Open", "Open"],
    ["Hold", "Open"],
    ["Ongoing", "In Progress"],
    ["Complete", "Closed"],
  ];
  return (
    <>
      <div style={eyebrow}>Linked Records</div>
      <h2 style={h2Style}>Actions & Linked Actions</h2>
      <h3 style={h3Style}>Action Plan (Section C) syncs to central Actions</h3>
      <p style={pStyle}>Every action row in Section C that has a description is automatically copied into the central <strong>Actions</strong> register when you click <strong>Save MOC</strong> (or move status), with source <code style={codeStyle}>MOC</code>, the MOC number, Medium priority, the owner&apos;s department (HSEQ if none), the target date, and the status mapped as below. You do not create these by hand.</p>
      <table style={imsTableStyle}>
        <thead>
          <tr>{["MOC action status", "Central Action status"].map(h => <th key={h} style={imsTableHeadStyle}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {statuses.map(([from, to]) => (
            <tr key={from}>
              <td style={imsTableCellStyle}>{from}</td>
              <td style={imsTableCellStyle}>{to}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <ul style={{ ...pStyle, paddingLeft: 20 }}>
        <li>The sync is one-way, from the MOC to Actions. Edit the action in the MOC; changes made directly to the central Action are overwritten on the next MOC save.</li>
        <li>Removing a row and saving removes its central Action too.</li>
        <li>The owner sees the action once in <strong>My Actions</strong> — the central Action that names its MOC — not twice.</li>
        <li><strong>View in Action Management ↗</strong> above the table opens Actions searched for this MOC.</li>
        <li>Tip: paste rows copied from Excel (Action, Owner, Target, Status) into an Action cell to add many at once (while the MOC is Draft).</li>
        <li>Each row&apos;s <strong>Files</strong> cell has <strong>+ Add file</strong> (save the MOC first). Files show as links with a ✕ to remove, and are listed in the PDF&apos;s &ldquo;C. Action Plan - Attachments&rdquo; table.</li>
      </ul>
      <h3 style={h3Style}>Generating an extra linked Action</h3>
      <p style={pStyle}>For a follow-up that is not part of the action plan, use a one-off linked Action.</p>
      <div style={stepList}>
        <Step n={1}>Open the MOC and click <strong>Generate Linked Action</strong> at the bottom of the detail panel.</Step>
        <Step n={2}>The Action page opens on <strong>Create Action</strong> with source <code style={codeStyle}>MOC</code>, the project and owner carried over from the MOC, and the MOC linked. Add the title, description, priority, and target date.</Step>
        <Step n={3}>Click <strong>Add Action</strong>. It appears in central <strong>Actions</strong> with a chip linking back to this MOC, and in the owner&apos;s <strong>My Actions</strong> view.</Step>
      </div>
    </>
  );
}

function SectionReports() {
  return (
    <>
      <div style={eyebrow}>Reports</div>
      <h2 style={h2Style}>Reports & Register Annex</h2>
      <h3 style={h3Style}>Individual MOC — PDF & Word</h3>
      <div style={stepList}>
        <Step n={1}>For the open MOC, click <strong>Generate PDF</strong> or <strong>Generate Word</strong> at the bottom of the detail panel. These use what is on screen, including unsaved edits.</Step>
        <Step n={2}>For a saved MOC without opening it, click the <strong>PDF</strong> button on its register row, or choose it from the <strong>Reports</strong> tab (which lists the 12 most recently updated). These use the saved record.</Step>
        <Step n={3}>The output follows the controlled MOC form with all thirteen lettered sections, the Enshore branded header, and the current status, including action-plan and supporting-document attachment links — suitable for circulation to people without IMS access. Word downloads save reliably on phones.</Step>
      </div>
      <div style={callout("info")}>
        <span>ℹ</span>
        <div>Generated outputs reflect a point-in-time snapshot. Re-generate after any further edits to the MOC so circulated copies stay current.</div>
      </div>
      <h3 style={h3Style}>Client MOC register report (project annex)</h3>
      <p style={pStyle}>When at least one project series exists, the Reports tab has a <strong>Client MOC register report</strong> — the monthly Word and PDF register of a project&apos;s MOCs and open actions.</p>
      <div style={stepList}>
        <Step n={1}>Choose the <strong>Project</strong>. By default the report reads the project&apos;s live MOC register in the IMS; click <strong>Refresh from the IMS</strong> after changing an MOC. Alternatively set <strong>Read the register from</strong> to <em>An uploaded workbook (.xlsx)</em> and upload an older register (it needs a Register sheet; nothing from the workbook is stored).</Step>
        <Step n={2}>If the project has parts, choose the <strong>Part</strong>, and set <strong>Position at</strong> to the report date.</Step>
        <Step n={3}>Optionally tick <strong>Hide closed and not implemented MOCs</strong> and <strong>Leave out the open actions table</strong>.</Step>
        <Step n={4}>Check the KPI tiles and preview. The <strong>Check before this goes in the monthly report</strong> note lists MOCs whose status is still to be confirmed and MOCs past their implementation end date but not closed.</Step>
        <Step n={5}>Click <strong>Generate Word</strong> or <strong>Generate PDF</strong>.</Step>
      </div>
      <p style={pStyle}>Cost and internal notes are never included in the client report.</p>
    </>
  );
}

function SectionStatuses() {
  const rows: [string, string, string][] = [
    ["draft", "Draft", "Being drafted. Fully editable, including adding and removing rows."],
    ["in review", "In Review", "Out for review. Sections K and L are sent by email; content edits only, rows are locked."],
    ["approved", "Approved", "Endorsed. Change may proceed; implementation content and Section M close-out remain editable."],
    ["closed", "Closed", "Change implemented and verified — Section M complete. Fully locked."],
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
  signoff:      SectionSignoff,
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
