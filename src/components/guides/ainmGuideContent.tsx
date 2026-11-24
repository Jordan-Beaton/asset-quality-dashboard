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
  | "overview" | "register" | "recordscreen" | "notification" | "mobile" | "part1" | "part2"
  | "linkedaction" | "signoff" | "external" | "reports" | "statuses";

const sections: GuideSectionDef[] = [
  { key: "overview",     label: "Overview",               group: "Getting Started" },
  { key: "register",     label: "Dashboard & Register",   group: "Getting Started" },
  { key: "recordscreen",  label: "The record screen",     group: "Core Workflows" },
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
  const map: Record<string, "ok" | "warn" | "bad" | "neu" | "brand"> = {
    open: "warn",
    "in progress": "brand",
    closed: "ok",
    "not started": "neu",
    draft: "brand",
    ongoing: "brand",
    issued: "ok",
    complete: "ok",
    completed: "ok",
  };
  return tintPill(map[status.toLowerCase()] || "warn");
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
      <p style={pStyle}>The page has six tabs: <strong>Dashboard</strong>, <strong>AINM Register</strong>, <strong>Create AINM</strong>, <strong>External AINM</strong>, <strong>Import Tracker</strong> (loads the AINM Action Tracker workbook; AINM numbers that already exist are skipped), and <strong>Reports</strong>. An AINM is opened from the register on the <strong>record screen</strong>, which has six steps: <strong>Notification</strong>, <strong>Part 1</strong>, <strong>Part 2</strong>, <strong>Actions</strong>, <strong>Evidence</strong> and <strong>Reports</strong> (see The record screen).</p>
      <h3 style={h3Style}>Internal vs External</h3>
      <p style={pStyle}><strong>Internal AINM</strong> — a full event that Enshore is directly investigating, using the Notification / Part 1 / Part 2 structure below.<br /><strong>External AINM</strong> — an event reported by a third party (supplier, client, contractor) where Enshore is tracking status and any resulting actions without running the full internal investigation. See <strong>External AINM</strong> in this guide.</p>
      <div style={callout("info")}>
        <span>ℹ</span>
        <div>Every AINM has an <code style={codeStyle}>Overall Status</code> of Open, In Progress, or Closed, tracked alongside the Notification / Part 1 / Part 2 stage statuses. Nobody sets any of these four statuses by hand: each stage status is worked out from how much of that stage is filled in (Not Started, Ongoing or Completed), and the Overall Status follows from the stages. The only way to close an AINM is the <strong>Close AINM</strong> button.</div>
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
              <td style={imsTableCellStyle}><span style={badge("completed")}>Completed</span></td>
              <td style={imsTableCellStyle}><span style={badge("ongoing")}>Ongoing</span></td>
              <td style={imsTableCellStyle}><span style={badge("in progress")}>In Progress</span></td>
            </tr>
          </tbody>
        </table>
      </div>
      <p style={pStyle}>The register also shows Event Date and Notification status columns. Search covers AINM number, title, project, location, classification and owner. Click <strong>Show Filters</strong> for the filter box: <strong>Project</strong> (every project that has an AINM), <strong>Status</strong>, <strong>Stage Status</strong> (Not Started, Ongoing, Issued or Completed; it matches an AINM when any of its three stages has that status), <strong>Report Type</strong> (Incident or Accident) and <strong>Classification</strong>. <strong>Clear Filters</strong> resets them all. The line above the table says how many of the AINMs are showing. Click a row to scroll straight to its record screen.</p>
      <p style={pStyle}>The toolbar runs left to right: search, <strong>Clear Filters</strong>, <strong>Export PDF</strong>, <strong>Export Excel</strong> and <strong>Show Filters</strong>. Export PDF and Export Excel both export exactly the AINMs the register is showing under the current search and filters. See <strong>Reports & Exports</strong>.</p>
    </>
  );
}

function SectionRecordScreen() {
  return (
    <>
      <div style={eyebrow}>Core Workflows</div>
      <h2 style={h2Style}>The record screen</h2>
      <p style={pStyle}>Click an AINM in the register and it opens on the <strong>record screen</strong>. The six old tabs are now six steps along the top, with a live <strong>AINM report</strong> summary beside the form.</p>
      <RecordScreenMock
        id="IR041"
        title="Dropped object during lifting operation"
        status="In Progress"
        tone="brand"
        nextButton="Close AINM"
        steps={[
          { label: "Notification", pct: 100 },
          { label: "Part 1", pct: 75 },
          { label: "Part 2", pct: 22 },
          { label: "Actions", state: "2 linked" },
          { label: "Evidence", state: "3 files" },
          { label: "Reports", state: "No PDF yet" },
        ]}
        active={1}
        missing={["Part 1: complete and issue it", "Root cause: process", "Part 2: complete and issue it"]}
        gate="this AINM can be closed"
        summaryTitle="AINM report"
        summaryRows={[["AINM Ref", "IR041"], ["Classification", "Near Miss"], ["Event details", null]]}
      />
      <h3 style={h3Style}>The header</h3>
      <p style={pStyle}>The top shows the AINM number, title and Overall Status, with <strong>Close AINM</strong> (plus <strong>Reopen AINM</strong> when the AINM is closed) and <strong>Hide Panel</strong>. Under it sit four read-only status chips: <strong>Notification Status</strong>, <strong>Part 1 Status</strong>, <strong>Part 2 Status</strong> and <strong>Overall Status</strong>. You cannot change them by hand; they are worked out from progress (see Automatic statuses below). <strong>Save AINM</strong> and <strong>Delete AINM</strong> are at the bottom of the screen, whichever step you are on.</p>
      <h3 style={h3Style}>The six steps</h3>
      <div style={stepList}>
        <Step n={1}><strong>Notification</strong>: the event facts, initial response and Notification Evidence. It shows a percentage.</Step>
        <Step n={2}><strong>Part 1</strong>: the immediate response, containment and first root cause thinking. It shows a percentage.</Step>
        <Step n={3}><strong>Part 2</strong>: the investigation, findings, references and sign-off. It shows a percentage.</Step>
        <Step n={4}><strong>Actions</strong>: linked central Actions and older tracker actions. It shows a count, for example <em>2 linked</em>.</Step>
        <Step n={5}><strong>Evidence</strong>: files for every stage. It shows a count, for example <em>3 files</em>.</Step>
        <Step n={6}><strong>Reports</strong>: the Word reports and the compiled PDF. It shows <em>No PDF yet</em> or the number of stored PDFs.</Step>
      </div>
      <p style={pStyle}>A link ending <code style={codeStyle}>tab=part1</code> (or notification, part2, actions, evidence, reports) opens the AINM on that step.</p>
      <h3 style={h3Style}>Still missing</h3>
      <p style={pStyle}>A box lists what is still missing before the AINM can be closed. For each stage that is not Completed it says what to do (<em>Notification: complete and issue it</em>, <em>Part 1: complete and issue it</em>, <em>Part 2: complete and issue it</em>). It also lists the key fields of each stage (for example Title, Location / site, Root cause: people, Investigation team member, Location sign-off and HSEQ sign-off), and <em>Linked action closed</em> while a linked central Action is still open. Click a chip to jump to its step.</p>
      <div style={callout("info")}>
        <span>ℹ</span>
        <div>The chips warn, they never block. If you click <strong>Close AINM</strong> with items missing you are asked &ldquo;N items are still missing: ... Close anyway?&rdquo; (the first eight are named), or &ldquo;Close IR041?&rdquo; when nothing is missing. Close AINM sets Overall Status to Closed and saves, the same as Save AINM. It is greyed out once the AINM is Closed or if you do not have Edit permission. It is the only way to close an AINM.</div>
      </div>
      <h3 style={h3Style}>Automatic statuses</h3>
      <p style={pStyle}>Each stage status is worked out from the same fields that drive the percentage on its step. It is recalculated every time the screen draws and every time you save, so it can never disagree with the percentage.</p>
      <table style={imsTableStyle}>
        <thead>
          <tr>
            {["Status", "Meaning"].map(h => <th key={h} style={imsTableHeadStyle}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ ...imsTableCellStyle, whiteSpace: "nowrap" }}><span style={badge("not started")}>Not Started</span></td>
            <td style={imsTableCellStyle}>The stage is at 0% and has not been issued.</td>
          </tr>
          <tr>
            <td style={{ ...imsTableCellStyle, whiteSpace: "nowrap" }}><span style={badge("ongoing")}>Ongoing</span></td>
            <td style={imsTableCellStyle}>The stage is above 0% and has not been issued yet. A stage at 100% that is waiting for its Issue button is also Ongoing.</td>
          </tr>
          <tr>
            <td style={{ ...imsTableCellStyle, whiteSpace: "nowrap" }}><span style={badge("completed")}>Completed</span></td>
            <td style={imsTableCellStyle}>The stage is at 100% and has been issued.</td>
          </tr>
          <tr>
            <td style={{ ...imsTableCellStyle, whiteSpace: "nowrap" }}><span style={badge("issued")}>Issued</span></td>
            <td style={imsTableCellStyle}>Only seen on older Closed AINMs that were saved with the word Issued. On an open AINM a stage that is at 100% and issued shows as Completed.</td>
          </tr>
        </tbody>
      </table>
      <p style={pStyle}>If someone clears a required field on a Completed stage, it drops back to Ongoing, and the Issue button comes back once the stage is at 100% again.</p>
      <h3 style={h3Style}>Issue buttons</h3>
      <p style={pStyle}>When a stage reaches 100% an <strong>Issue Notification</strong>, <strong>Issue Part 1</strong> or <strong>Issue Part 2</strong> button appears at the top of that stage. Pressing it saves the AINM straight away, records the issue date for that stage (Notification sent, Part 1 completed or Part 2 completed) and the stage becomes <strong>Completed</strong>. Issuing needs Edit permission, and the button is greyed out without it.</p>
      <h3 style={h3Style}>Locked stages</h3>
      <p style={pStyle}><strong>Part 1</strong> is locked until the Notification is Completed, and <strong>Part 2</strong> is locked until Part 1 is Completed. A locked stage can still be opened and read, but every field and button in it is greyed out and a banner says what to do first, for example &ldquo;Complete and issue the Notification before Part 1 can be started.&rdquo; On the step bar its line reads <em>Locked: complete the Notification first</em> (or <em>Locked: complete Part 1 first</em>). Actions, Evidence and Reports are never locked.</p>
      <h3 style={h3Style}>Overall Status, Close AINM and Reopen AINM</h3>
      <p style={pStyle}>The Overall Status is <strong>Open</strong> while all three stages are Not Started and <strong>In Progress</strong> as soon as any stage has been started. It becomes <strong>Closed</strong> only when you press <strong>Close AINM</strong> (with the confirmation described above). A Closed AINM shows a <strong>Reopen AINM</strong> button (Edit permission needed). It sets the Overall Status to In Progress and saves, and the stage statuses are then worked out again so the record can be worked on.</p>
      <h3 style={h3Style}>Closed and older AINMs</h3>
      <p style={pStyle}>An AINM that is Closed keeps the stage statuses it was saved with, exactly as stored, and is never locked. They are shown with the new names: Draft shows as Ongoing and Complete shows as Completed. AINMs that are still open use the automatic statuses and the locks, so an open AINM that was saved earlier with Notification set to Complete, but whose Notification is only 64% filled in, now shows Ongoing until it is finished and issued. The register, Dashboard filters, exports and this guide all use the same names. External AINMs are not affected.</p>
      <h3 style={h3Style}>Form, Split and PDF report</h3>
      <p style={pStyle}><strong>Form</strong> shows only the fields, <strong>Split</strong> (the default) shows them beside the <strong>AINM report</strong> summary, and <strong>PDF report</strong> shows the summary on its own. The summary follows the report headings (AINM Summary, Initial Notification and so on), and anything not yet filled in shows as an amber &ldquo;to be completed&rdquo; that you can click to jump to the right step.</p>
      <h3 style={h3Style}>All sections</h3>
      <p style={pStyle}>The <strong>All sections</strong> button shows every step on one long page, as the AINM detail panel used to. Click it again to return to one step at a time.</p>
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
        <Step n={4}>Click <strong>Create AINM</strong>. The record opens in the register. Notification shows <span style={badge("ongoing")}>Ongoing</span> because some of it is filled in, Part 1 and Part 2 are <span style={badge("not started")}>Not Started</span>, and the Overall Status is worked out for you.</Step>
        <Step n={5}>On the <strong>Notification</strong> step of the record screen complete <code style={codeStyle}>Brief details of the injury/release/damage</code> and the initial response: <code style={codeStyle}>Casualty Management</code>, <code style={codeStyle}>Site/Location Management</code>, <code style={codeStyle}>Cause Identification</code> and <code style={codeStyle}>Additional information</code>. Keep names out of the text — use job titles or &quot;IP&quot; (Injured Person).</Step>
        <Step n={6}>Upload any photographs or documents under <strong>Notification Evidence</strong>, and click <strong>Save AINM</strong> at the bottom of the record screen. When the Notification reaches 100%, press <strong>Issue Notification</strong> at the top of the step; it records the date it was sent and the Notification becomes <span style={badge("completed")}>Completed</span>. That unlocks Part 1.</Step>
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
      <p style={pStyle}>The Notification can be raised from a phone at the point of contact. Scan the QR code on the Dashboard, or open <strong>Open Mobile AINM</strong> (<code style={codeStyle}>/hse/ainm/field</code>), and sign in to the IMS as usual. Part 1 and Part 2 are completed later from the record screen on the desktop register.</p>
      <div style={stepList}>
        <Step n={1}>Under <strong>Start New AINM</strong> choose <strong>Incident / Near Miss</strong> or <strong>Accident</strong>. To carry on with an existing record, search under <strong>Continue Existing</strong> by AINM number, title or project and tap it (the 20 best matches are listed).</Step>
        <Step n={2}>Complete the <strong>Initial Notification</strong> form: Title, Project / Work Title, Location / Site, Date and Time of Event, Classification, the brief details of the event and of injury / release / damage, Casualty Management, Site / Location Management, Cause Identification and Additional Information. The AINM No. is generated from the type.</Step>
        <Step n={3}>Tap <strong>Save AINM Notification</strong>. The Notification Status is a read-only chip: the save stores it as Not Started or Ongoing for you. <strong>Issue Notification</strong> (it used to be Mark as Issued) is greyed out until all 11 notification fields are filled in: Title, Project, Location / Site, Date and Time of Event, Classification, the brief details of the event, injury / release / damage details, Casualty Management, Site / Location Management and Cause Identification. A line under the buttons lists what is still missing, and the greyed button shows the same list as a tooltip. When it is pressed the notification is saved and becomes Completed.</Step>
        <Step n={4}>Once the AINM is saved, tap <strong>Upload Evidence</strong> under Notification Evidence. Tap a file in the list to open it.</Step>
      </div>
      <h3 style={h3Style}>Evidence uploads</h3>
      <p style={pStyle}>Evidence can be uploaded to Notification, Part 1 and Part 2, or from the <strong>Evidence</strong> step where you choose the stage (General, Notification, Part 1, Part 2 or Action Evidence) first. On desktop you can drag files onto the upload box. External AINMs have their own documentation upload.</p>
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
      <p style={pStyle}>Part 1 captures what happened immediately after the event, the containment put in place, and the first root-cause thinking — completed as soon as practical after the Notification. The Part 1 step is designed for the desktop.</p>
      <div style={stepList}>
        <Step n={1}>Open the AINM and go to the <strong>Part 1</strong> step. It is locked (readable but greyed out) until the Notification is Completed. The event summary from the Notification is shown at the top.</Step>
        <Step n={2}>Enter <code style={codeStyle}>Company in Control</code> and check the <code style={codeStyle}>Event Details</code>, then build the <strong>Timeline of Events</strong> with <strong>Add Timeline Entry</strong> (a date/time and a description for each point).</Step>
        <Step n={3}>If there was an environmental release, record its <code style={codeStyle}>Type</code> and <code style={codeStyle}>Quantity</code>.</Step>
        <Step n={4}>Record every <strong>Immediate Containment Action</strong> taken. Each gets its own numbered row; use <strong>Add Row</strong> for more.</Step>
        <Step n={5}>Record the <strong>Event investigation and root cause analysis</strong> against each of <strong>People</strong>, <strong>Equipment</strong>, <strong>Environment/Conditions</strong>, and <strong>Process</strong>.</Step>
        <Step n={6}>Tick the relevant items in the attachments checklist (witness statements, toolbox talk, risk assessment, photographs, permit to work, and so on). Selecting <strong>Other</strong> reveals a free-text box to describe what else is attached.</Step>
        <Step n={7}>Add <code style={codeStyle}>Additional Comments</code>, choose the <code style={codeStyle}>Reviewed / Accepted By</code> person from People (or <strong>Add New Person...</strong>) and check their <code style={codeStyle}>Reviewer Position</code>.</Step>
        <Step n={8}>Upload Part 1 evidence and click <strong>Save AINM</strong>. When Part 1 reaches 100%, press <strong>Issue Part 1</strong> at the top of the step and Part 1 becomes Completed, which unlocks Part 2. <strong>Generate Part 1 Report</strong> downloads the Word report (ENS-HSEQ-FRM-028).</Step>
      </div>
      <div style={callout("info")}>
        <span>ℹ</span>
        <div>The Part 1 step includes the <strong>Corrective Actions / Recommendations</strong> panel, where you can create a central Action for any item that needs its own tracked owner and due date — see <strong>Linked Actions</strong> in this guide.</div>
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
        <Step n={1}>Open the AINM and go to the <strong>Part 2</strong> step. It is locked (readable but greyed out) until Part 1 is Completed.</Step>
        <Step n={2}>List the <strong>Investigation Team Members</strong> — name, company, position and investigation role — with <strong>Add Team Member</strong>.</Step>
        <Step n={3}>Record <strong>Investigation Findings</strong> against each of <strong>People</strong>, <strong>Equipment</strong>, <strong>Environment/Conditions</strong>, and <strong>Process</strong> — this structure keeps root-cause analysis consistent across every AINM.</Step>
        <Step n={4}>List the <strong>Reference documentation</strong> used (document title and number) with <strong>Add Reference Document</strong>, and add <code style={codeStyle}>Further comments</code>.</Step>
        <Step n={5}>Add corrective action recommendations as linked central Actions in the <strong>Corrective Actions / Recommendations</strong> panel (see <strong>Linked Actions</strong>). Older tracker actions imported from the AINM Action Tracker appear on the Actions tab.</Step>
        <Step n={6}>Complete the <strong>Investigation Review and Sign-Off</strong> section (see <strong>Sign-off</strong>), upload Part 2 evidence and click <strong>Save AINM</strong>. When Part 2 reaches 100%, press <strong>Issue Part 2</strong> at the top of the step and Part 2 becomes Completed.</Step>
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
      <p style={pStyle}>At the bottom of the Part 2 step, the investigation is reviewed by up to four people, each with a name, position, and date:</p>
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
        <div>Sign-off blocks can be completed independently and in any order — the AINM&apos;s <code style={codeStyle}>Overall Status</code> is not automatically set to Closed, so confirm all sign-offs are in before pressing <strong>Close AINM</strong>.</div>
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
      <p style={pStyle}>The AINM&apos;s own <strong>Actions</strong> step lists <strong>Linked Central Actions</strong> (with owner, due date, priority and status) and any older <strong>AINM Tracker Actions</strong>, and has a <strong>Create Central Action</strong> shortcut. Adding actions needs Edit permission.</p>
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
        <Step n={1}>Open the AINM and go to its <strong>Reports</strong> step.</Step>
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
    ["ongoing", "Ongoing"],
    ["completed", "Completed"],
    ["issued", "Issued (older Closed AINMs only)"],
  ];
  return (
    <>
      <div style={eyebrow}>Reference</div>
      <h2 style={h2Style}>Status Reference</h2>
      <h3 style={h3Style}>Stage status (Notification / Part 1 / Part 2)</h3>
      <p style={pStyle}>Shown as read-only chips under the header of the record screen, in the register and on the phone page. They are worked out from progress and are never chosen by hand: Not Started at 0%, Ongoing from above 0% until the stage is issued, and Completed at 100% once the Issue button has been pressed. Behind the scenes Ongoing is saved as Draft and Completed as Complete, so nothing in the database changes.</p>
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
            <td style={imsTableCellStyle}>All three stages are Not Started. Worked out automatically.</td>
          </tr>
          <tr>
            <td style={{ ...imsTableCellStyle, whiteSpace: "nowrap" }}><span style={badge("in progress")}>In Progress</span></td>
            <td style={imsTableCellStyle}>At least one stage has been started. Worked out automatically. It is also what Reopen AINM sets.</td>
          </tr>
          <tr>
            <td style={{ ...imsTableCellStyle, whiteSpace: "nowrap" }}><span style={badge("closed")}>Closed</span></td>
            <td style={imsTableCellStyle}>Set only by the Close AINM button. A Closed AINM keeps its stage statuses as saved and is never locked. The Dashboard counts every AINM that is not Closed as open.</td>
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
  recordscreen: SectionRecordScreen,
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
