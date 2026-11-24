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
  | "overview" | "register" | "notification" | "mobile" | "part1" | "part2"
  | "linkedaction" | "signoff" | "external" | "reports" | "statuses";

const sections: GuideSectionDef[] = [
  { key: "overview",     label: "Overview",               group: "Getting Started" },
  { key: "register",     label: "Dashboard & Register",   group: "Getting Started" },
  { key: "notification", label: "Raising a Notification", group: "Core Workflows" },
  { key: "mobile",       label: "Phone Entry & Evidence", group: "Core Workflows" },
  { key: "part1",        label: "Part 1 — Immediate Response", group: "Core Workflows" },
  { key: "part2",        label: "Part 2 — Investigation",  group: "Core Workflows" },
  { key: "signoff",      label: "Sign-off",                group: "Core Workflows" },
  { key: "linkedaction", label: "Linked Actions",          group: "Linked Records" },
  { key: "external",     label: "External AINM",           group: "External Notifications" },
  { key: "reports",      label: "Reports & Exports",       group: "Reports" },
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
      <h3 style={h3Style}>The AINM workspace</h3>
      <p style={pStyle}>The page has six tabs: <strong>Dashboard</strong>, <strong>AINM Register</strong>, <strong>Create AINM</strong>, <strong>External AINM</strong>, <strong>Import Tracker</strong> (loads the AINM Action Tracker workbook; AINM numbers that already exist are skipped), and <strong>Reports</strong>. An AINM is opened from the register, where it has its own <strong>Notification</strong>, <strong>Part 1</strong>, <strong>Part 2</strong>, <strong>Actions</strong>, <strong>Evidence</strong> and <strong>Reports</strong> tabs.</p>
      <h3 style={h3Style}>Internal vs External</h3>
      <p style={pStyle}><strong>Internal AINM</strong> — a full event that Enshore is directly investigating, using the Notification / Part 1 / Part 2 structure below.<br /><strong>External AINM</strong> — an event reported by a third party (supplier, client, contractor) where Enshore is tracking status and any resulting actions without running the full internal investigation. See <strong>External AINM</strong> in this guide.</p>
      <div style={callout("info")}>
        <span>ℹ</span>
        <div>Every AINM has an <code style={codeStyle}>Overall Status</code> of Open, In Progress, or Closed, tracked separately from the individual Notification / Part 1 / Part 2 stage statuses. All four statuses are set by hand from drop-downs; nothing changes them automatically.</div>
      </div>
      <div style={callout("info")}>
        <span>ℹ</span>
        <div>Creating, saving, uploading evidence and generating the compiled PDF need Create or Edit permission for the HSE area. Without it the buttons are greyed out and the status line explains which permission is missing.</div>
      </div>
    </>
  );
}

function SectionRegister() {
  return (
    <>
      <div style={eyebrow}>Getting Started</div>
      <h2 style={h2Style}>Dashboard & Register</h2>
      <h3 style={h3Style}>The Dashboard</h3>
      <p style={pStyle}>The Dashboard tab shows the AINM Performance Story for the chosen <strong>Dashboard Year</strong> (or All Years) and <strong>AINM Scope</strong> (Internal only, External only, or Combined reporting). The header controls, including <strong>Export Dashboard PDF</strong>, wrap onto extra lines on a narrow screen, so they stay usable on a phone.</p>
      <p style={pStyle}>The cards (Open AINMs, Incidents, Accidents, Part 1 Due, Part 2 Due, External AINMs) are clickable and open the register or External tab. The Event Classifications and Projects / Worksites charts are clickable too: <strong>click a project bar and the register opens filtered to that project</strong>, with the filter box already showing; a classification bar does the same for that classification. The Dashboard also holds the QR code and <strong>Open Mobile AINM</strong> button for phone entry.</p>
      <h3 style={h3Style}>The Register</h3>
      <div style={mockPanel}>
        <div style={{ ...mockHero, marginTop: 0 }}>
          <div style={mockHeroEyebrow}>Enshore IMS · HSE Management</div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>AINM Register</div>
        </div>
        <table style={imsTableStyle}>
          <thead>
            <tr>
              {["AINM No.", "Title", "Type", "Classification", "Project", "Part 1", "Part 2", "Status"].map(h => (
                <th key={h} style={imsTableHeadStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ ...imsTableCellStyle, fontWeight: 800, color: imsColours.brand, whiteSpace: "nowrap" }}>IR041</td>
              <td style={imsTableCellStyle}>Dropped object during lifting operation</td>
              <td style={imsTableCellStyle}>Incident</td>
              <td style={imsTableCellStyle}>Near Miss</td>
              <td style={imsTableCellStyle}>Example project</td>
              <td style={imsTableCellStyle}><span style={badge("complete")}>Complete</span></td>
              <td style={imsTableCellStyle}><span style={badge("draft")}>Draft</span></td>
              <td style={imsTableCellStyle}><span style={badge("in progress")}>In Progress</span></td>
            </tr>
          </tbody>
        </table>
      </div>
      <p style={pStyle}>The register also shows Event Date and Notification status columns. Search covers AINM number, title, project, location, classification and owner. Click <strong>Show Filters</strong> for the filter box: <strong>Project</strong> (every project that has an AINM), <strong>Status</strong>, <strong>Stage Status</strong>, <strong>Report Type</strong> (Incident or Accident) and <strong>Classification</strong>. <strong>Clear Filters</strong> resets them all. The line above the table says how many of the AINMs are showing. Click a row to scroll straight to its detail panel.</p>
      <p style={pStyle}>Two buttons sit beside Clear Filters: <strong>Export PDF</strong> and <strong>Export Excel</strong>. Both export exactly the AINMs the register is showing under the current search and filters. See <strong>Reports & Exports</strong>.</p>
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
        <Step n={1}>Go to the <strong>Create AINM</strong> tab and choose the <code style={codeStyle}>AINM Type</code>: <strong>Incident Report</strong> or <strong>Accident Report</strong> (it starts on a grey Select Type). The <code style={codeStyle}>AINM No.</code> is generated for you (IR001 style for incidents, AR001 style for accidents).</Step>
        <Step n={2}>Enter <code style={codeStyle}>Title</code>, <code style={codeStyle}>Project</code>, <code style={codeStyle}>Location / Site</code>, <code style={codeStyle}>Date of Event</code> and <code style={codeStyle}>Time of Event</code>.</Step>
        <Step n={3}>Select the <code style={codeStyle}>Event Classification</code> and enter <code style={codeStyle}>Brief Event Details</code>. A type, number and title are required.</Step>
        <Step n={4}>Click <strong>Create AINM</strong>. The record opens in the register with Notification, Part 1 and Part 2 all <span style={badge("not started")}>Not Started</span> and Overall Status Open.</Step>
        <Step n={5}>On the <strong>Notification</strong> tab complete <code style={codeStyle}>Brief details of the injury/release/damage</code> and the initial response: <code style={codeStyle}>Casualty Management</code>, <code style={codeStyle}>Site/Location Management</code>, <code style={codeStyle}>Cause Identification</code> and <code style={codeStyle}>Additional information</code>. Keep names out of the text — use job titles or &quot;IP&quot; (Injured Person).</Step>
        <Step n={6}>Upload any photographs or documents under <strong>Notification Evidence</strong>, set <code style={codeStyle}>Notification Status</code> at the top of the tab (for example Issued once it has gone out), and click <strong>Save AINM</strong>.</Step>
      </div>
      <p style={pStyle}><strong>Generate Initial Notification</strong> downloads the Notification as a Word document (ENS-HSEQ-FRM-027). Project, location, date, time and classification carry forward into the Part 1 and Part 2 tabs.</p>
    </>
  );
}

function SectionMobile() {
  return (
    <>
      <div style={eyebrow}>Core Workflows</div>
      <h2 style={h2Style}>Phone Entry & Evidence</h2>
      <h3 style={h3Style}>The AINM phone page</h3>
      <p style={pStyle}>The Notification can be raised from a phone at the point of contact. Scan the QR code on the Dashboard, or open <strong>Open Mobile AINM</strong> (<code style={codeStyle}>/hse/ainm/field</code>), and sign in to the IMS as usual. Part 1 and Part 2 are completed later from the desktop register.</p>
      <div style={stepList}>
        <Step n={1}>Under <strong>Start New AINM</strong> choose <strong>Incident / Near Miss</strong> or <strong>Accident</strong>. To carry on with an existing record, search under <strong>Continue Existing</strong> by AINM number, title or project and tap it (the 20 best matches are listed).</Step>
        <Step n={2}>Complete the <strong>Initial Notification</strong> form: Title, Project / Work Title, Location / Site, Date and Time of Event, Classification, the brief details of the event and of injury / release / damage, Casualty Management, Site / Location Management, Cause Identification and Additional Information. The AINM No. is generated from the type.</Step>
        <Step n={3}>Tap <strong>Save AINM Notification</strong> to save as a Draft, or <strong>Mark as Issued</strong>. You can also choose the Notification Status (Draft, Issued or Complete) yourself.</Step>
        <Step n={4}>Once the AINM is saved, tap <strong>Upload Evidence</strong> under Notification Evidence. Tap a file in the list to open it.</Step>
      </div>
      <h3 style={h3Style}>Evidence uploads</h3>
      <p style={pStyle}>Evidence can be uploaded to Notification, Part 1 and Part 2, or from the <strong>Evidence</strong> tab where you choose the stage (General, Notification, Part 1, Part 2 or Action Evidence) first. On desktop you can drag files onto the upload box. External AINMs have their own documentation upload.</p>
      <p style={pStyle}>Photos, PDF, Word, Excel and PowerPoint files are all accepted, and the phone page&apos;s file picker offers the camera and those same file types. Each file is stored with the correct file type, even when a phone does not report one, so Word, Excel and PowerPoint files open in the right app afterwards. <strong>Open / Preview</strong> opens the file in a new tab; if the phone blocks the new tab it opens in the same tab and the Back button returns you to the IMS. <strong>Delete</strong> asks for confirmation.</p>
      <div style={callout("info")}>
        <span>ℹ</span>
        <div>Word reports download straight to the device using a method that saves reliably on phones as well as desktops.</div>
      </div>
    </>
  );
}

function SectionPart1() {
  return (
    <>
      <div style={eyebrow}>Core Workflows</div>
      <h2 style={h2Style}>Part 1 — Immediate Response</h2>
      <p style={pStyle}>Part 1 captures what happened immediately after the event, the containment put in place, and the first root-cause thinking — completed as soon as practical after the Notification. The Part 1 tab is designed for the desktop.</p>
      <div style={stepList}>
        <Step n={1}>Open the AINM and go to the <strong>Part 1</strong> tab. The event summary from the Notification is shown at the top.</Step>
        <Step n={2}>Enter <code style={codeStyle}>Company in Control</code> and check the <code style={codeStyle}>Event Details</code>, then build the <strong>Timeline of Events</strong> with <strong>Add Timeline Entry</strong> (a date/time and a description for each point).</Step>
        <Step n={3}>If there was an environmental release, record its <code style={codeStyle}>Type</code> and <code style={codeStyle}>Quantity</code>.</Step>
        <Step n={4}>Record every <strong>Immediate Containment Action</strong> taken. Each gets its own numbered row; use <strong>Add Row</strong> for more.</Step>
        <Step n={5}>Record the <strong>Event investigation and root cause analysis</strong> against each of <strong>People</strong>, <strong>Equipment</strong>, <strong>Environment/Conditions</strong>, and <strong>Process</strong>.</Step>
        <Step n={6}>Tick the relevant items in the attachments checklist (witness statements, toolbox talk, risk assessment, photographs, permit to work, and so on). Selecting <strong>Other</strong> reveals a free-text box to describe what else is attached.</Step>
        <Step n={7}>Add <code style={codeStyle}>Additional Comments</code>, choose the <code style={codeStyle}>Reviewed / Accepted By</code> person from People (or <strong>Add New Person...</strong>) and check their <code style={codeStyle}>Reviewer Position</code>.</Step>
        <Step n={8}>Upload Part 1 evidence, set <code style={codeStyle}>Part 1 Status</code> (on the Notification tab) to Complete when finished, and click <strong>Save AINM</strong>. <strong>Generate Part 1 Report</strong> downloads the Word report (ENS-HSEQ-FRM-028).</Step>
      </div>
      <div style={callout("info")}>
        <span>ℹ</span>
        <div>The Part 1 tab includes the <strong>Corrective Actions / Recommendations</strong> panel, where you can create a central Action for any item that needs its own tracked owner and due date — see <strong>Linked Actions</strong> in this guide.</div>
      </div>
    </>
  );
}

function SectionPart2() {
  return (
    <>
      <div style={eyebrow}>Core Workflows</div>
      <h2 style={h2Style}>Part 2 — Investigation</h2>
      <p style={pStyle}>Part 2 is the full investigation, signed off by the reviewers listed in <strong>Sign-off</strong>. It is typically completed by the investigation team.</p>
      <div style={stepList}>
        <Step n={1}>Open the AINM and go to the <strong>Part 2</strong> tab.</Step>
        <Step n={2}>List the <strong>Investigation Team Members</strong> — name, company, position and investigation role — with <strong>Add Team Member</strong>.</Step>
        <Step n={3}>Record <strong>Investigation Findings</strong> against each of <strong>People</strong>, <strong>Equipment</strong>, <strong>Environment/Conditions</strong>, and <strong>Process</strong> — this structure keeps root-cause analysis consistent across every AINM.</Step>
        <Step n={4}>List the <strong>Reference documentation</strong> used (document title and number) with <strong>Add Reference Document</strong>, and add <code style={codeStyle}>Further comments</code>.</Step>
        <Step n={5}>Add corrective action recommendations as linked central Actions in the <strong>Corrective Actions / Recommendations</strong> panel (see <strong>Linked Actions</strong>). Older tracker actions imported from the AINM Action Tracker appear on the Actions tab.</Step>
        <Step n={6}>Complete the <strong>Investigation Review and Sign-Off</strong> section (see <strong>Sign-off</strong>), upload Part 2 evidence, set <code style={codeStyle}>Part 2 Status</code> to Complete, and click <strong>Save AINM</strong>.</Step>
      </div>
      <p style={pStyle}><strong>Generate Part 2 Report</strong> downloads the Word report (ENS-HSEQ-FRM-029).</p>
    </>
  );
}

function SectionSignoff() {
  return (
    <>
      <div style={eyebrow}>Core Workflows</div>
      <h2 style={h2Style}>Sign-off</h2>
      <p style={pStyle}>At the bottom of the Part 2 tab, the investigation is reviewed by up to four people, each with a name, position, and date:</p>
      <div style={stepList}>
        <Step n={1}><strong>Location/Senior Representative</strong> — the site or vessel representative.</Step>
        <Step n={2}><strong>HSEQ Representative</strong>.</Step>
        <Step n={3}><strong>Work/Project Manager</strong> (as applicable).</Step>
        <Step n={4}><strong>Senior Management Team Representative</strong> (as applicable) — typically the last stage before the AINM is considered fully closed out.</Step>
      </div>
      <h3 style={h3Style}>Requesting sign-off by email</h3>
      <div style={stepList}>
        <Step n={1}>Choose the person in the <strong>Name</strong> list. They must have an email address on their People record.</Step>
        <Step n={2}>Click <strong>Send for Sign-Off</strong>. The AINM is saved and the person is emailed a <strong>Review and decide</strong> link, valid for 30 days and usable once. A notification also reaches them in the IMS.</Step>
        <Step n={3}>They see the AINM summary, root cause analysis and investigation findings on the <strong>Investigation Sign-Off</strong> page, enter their name and position, and choose <strong>Approve</strong>, <strong>Reject</strong> (a reason is required) or <strong>Comments</strong> (comments are required, and neither approve nor reject).</Step>
        <Step n={4}>The decision is recorded against that block: the Name field becomes an audit line such as &quot;Approved via email by ...&quot; with the position and date, and a status line shows <strong>Approved</strong>, <strong>Rejected</strong> or <strong>Needs Attention</strong> (or <strong>Pending</strong> while waiting). Both the signer and the person who sent the request receive a confirmation email, and the sender is notified in the IMS.</Step>
        <Step n={5}>To chase or repeat a request, click <strong>Resend email</strong>. A new request replaces any pending one for the same role, and if a decision has been made it goes back to the original recipient.</Step>
      </div>
      <p style={pStyle}>You can also simply choose a person and enter a position and date without sending an email request.</p>
      <div style={callout("warning")}>
        <span>⚠</span>
        <div>Sign-off blocks can be completed independently and in any order — the AINM&apos;s <code style={codeStyle}>Overall Status</code> is not automatically set to Closed, so confirm all sign-offs are in before changing it to Closed yourself.</div>
      </div>
    </>
  );
}

function SectionLinkedAction() {
  return (
    <>
      <div style={eyebrow}>Linked Records</div>
      <h2 style={h2Style}>Creating Linked Actions</h2>
      <p style={pStyle}>Both Part 1 and Part 2 have a <strong>Corrective Actions / Recommendations</strong> panel for creating a central Action without leaving the AINM.</p>
      <div style={stepList}>
        <Step n={1}>In Part 1 or Part 2, find the <strong>Corrective Actions / Recommendations</strong> panel.</Step>
        <Step n={2}>Complete <code style={codeStyle}>Action Title</code>, <code style={codeStyle}>Department</code> (selected explicitly — it is never inferred from the accountable person), <code style={codeStyle}>Accountable Person</code>, <code style={codeStyle}>Description / Completion Requirements</code>, <code style={codeStyle}>Priority</code> (Low, Medium, High or Critical), <code style={codeStyle}>Target Date</code> and <code style={codeStyle}>Status</code>. A title and department are required.</Step>
        <Step n={3}>Click <strong>Add Corrective Action</strong>. It is created in central <strong>Actions</strong> with source <code style={codeStyle}>AINM</code>, the AINM&apos;s project, and a link back to this AINM, and it is listed under the panel with an <strong>Open</strong> link.</Step>
        <Step n={4}>To open the full Action form instead — for a case needing more detail — use <strong>Open Full Action Form</strong>; it keeps the AINM link and project context but leaves title, description, department, and owner for manual entry.</Step>
      </div>
      <p style={pStyle}>The AINM&apos;s own <strong>Actions</strong> tab lists <strong>Linked Central Actions</strong> (with owner, due date, priority and status) and any older <strong>AINM Tracker Actions</strong>, and has a <strong>Create Central Action</strong> shortcut. Adding actions needs Edit permission.</p>
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
        <Step n={1}>Go to the <strong>External AINM</strong> tab. The form at the top creates a new record; the External AINM No. is suggested for you.</Step>
        <Step n={2}>Select the <code style={codeStyle}>External Party Type</code> (Third Party, Supplier, Contractor, Client or Other) and enter the <code style={codeStyle}>External Party / Supplier Name</code> and their own <code style={codeStyle}>External Reference</code> if they have one.</Step>
        <Step n={3}>Enter <code style={codeStyle}>Project / Work Title</code>, <code style={codeStyle}>Location / Site</code>, <code style={codeStyle}>Event Date</code>, <code style={codeStyle}>Event Type</code> (Incident, Accident, Near Miss, Environmental, Equipment Damage or Other), and choose the <code style={codeStyle}>Enshore Contact</code> handling it.</Step>
        <Step n={4}>Complete <code style={codeStyle}>Summary</code> (required) and <code style={codeStyle}>Immediate Actions / Enshore Follow-up</code>, plus any <code style={codeStyle}>Comments</code>.</Step>
        <Step n={5}>Tick <strong>Include this external AINM in combined statistics</strong> only if it should count in Enshore&apos;s own HSE reporting. External AINMs are excluded from the internal dashboard figures by default.</Step>
        <Step n={6}>Set <code style={codeStyle}>Status</code> (Logged, Under Review, Action Required or Closed) and click <strong>Create External AINM</strong>.</Step>
      </div>
      <p style={pStyle}>The <strong>External AINM Register</strong> below has a search box and, under <strong>Show Filters</strong>, Status and External Type filters. Click a row to edit it, upload supplier reports or photographs under <strong>External Documentation / Evidence</strong>, and <strong>Save External AINM</strong> (or <strong>Delete External AINM</strong>).</p>
    </>
  );
}

function SectionReports() {
  return (
    <>
      <div style={eyebrow}>Reports</div>
      <h2 style={h2Style}>Reports & Exports</h2>
      <h3 style={h3Style}>Reports for one AINM</h3>
      <div style={stepList}>
        <Step n={1}>Open the AINM and go to its <strong>Reports</strong> tab.</Step>
        <Step n={2}>Click <strong>Generate Initial Notification</strong>, <strong>Generate Part 1 Report</strong> or <strong>Generate Part 2 Report</strong> to download that stage as a Word document. These Word files download to your device and are not kept in the report history.</Step>
        <Step n={3}>Click <strong>Generate Complete AINM PDF</strong> for the full record in one document. It downloads and a copy is also stored. This needs Edit permission.</Step>
        <Step n={4}>The compiled PDF mirrors the Word report structure — labelled Part 1 and Part 2 subsections, corrective actions/recommendations, findings, references, sign-off, and comments — and includes both legacy tracker actions and any linked central Actions with their title, description, and target date. It also lists the evidence files with an <strong>Open Evidence</strong> link for each.</Step>
      </div>
      <p style={pStyle}>The top-level <strong>Reports</strong> tab lists the stored compiled PDFs, one row per AINM. Use <strong>Show Filters</strong> to show only Incident (IR) or Accident (AR) reports, click <strong>Open Latest PDF</strong> for the newest, or click a row to see every version and open any of them. A new version never overwrites an earlier one.</p>
      <h3 style={h3Style}>Exporting the register</h3>
      <p style={pStyle}>On the <strong>AINM Register</strong> tab, <strong>Export PDF</strong> and <strong>Export Excel</strong> produce a report of exactly the AINMs shown, under whatever search and filters are set (including the Project filter). Both are disabled when no AINMs are showing. Nothing is stored; the file simply downloads.</p>
      <div style={stepList}>
        <Step n={1}><strong>Export PDF</strong> — a landscape A4 <strong>HSE AINM Register Report</strong> in the same layout as the HSE Observations report: Enshore and 3Rs logos, who generated it and when, the filters used, a summary strip (AINMs, Open, Incidents, Accidents, Part 1 due, Part 2 due, Closed), then <strong>one table per project</strong> showing number, event date, type, classification, location, the three stage statuses, overall status and title with the brief event details. The file name includes the project when one is filtered.</Step>
        <Step n={2}><strong>Export Excel</strong> — an <strong>AINM Register</strong> workbook with 22 columns (number, type, title, project, location, event date and time, classification, company in control, owner, the Notification / Part 1 / Part 2 stage statuses and dates, overall status, brief details, injury/release/damage, initial cause, immediate corrective actions and comments). The title, generated date and filters sit above the header row, the header row is frozen, and auto-filter is switched on so you can sort and filter straight away.</Step>
      </div>
      <div style={callout("info")}>
        <span>ℹ</span>
        <div>The Dashboard has its own <strong>Export Dashboard PDF</strong> button, which summarises the figures for the selected year and scope.</div>
      </div>
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
      <p style={pStyle}>Chosen from the drop-downs at the top of the Notification tab (the phone page sets the Notification status).</p>
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
            <td style={imsTableCellStyle}>Newly raised, investigation not yet underway. Every new AINM starts here.</td>
          </tr>
          <tr>
            <td style={{ ...imsTableCellStyle, whiteSpace: "nowrap" }}><span style={badge("in progress")}>In Progress</span></td>
            <td style={imsTableCellStyle}>Part 1 and/or Part 2 underway.</td>
          </tr>
          <tr>
            <td style={{ ...imsTableCellStyle, whiteSpace: "nowrap" }}><span style={badge("closed")}>Closed</span></td>
            <td style={imsTableCellStyle}>Investigation and sign-off complete. The Dashboard counts every AINM that is not Closed as open.</td>
          </tr>
        </tbody>
      </table>
      <h3 style={h3Style}>External AINM status</h3>
      <p style={pStyle}>Logged → Under Review → Action Required → Closed.</p>
      <h3 style={h3Style}>Sign-off request status</h3>
      <p style={pStyle}>Pending (waiting for the person), Approved, Rejected, or Needs Attention (comments returned without a decision).</p>
    </>
  );
}

const sectionComponents: Record<SectionKey, () => ReactElement> = {
  overview:     SectionOverview,
  register:     SectionRegister,
  notification: SectionNotification,
  mobile:       SectionMobile,
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
