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
  | "overview" | "card" | "phone" | "dashboard" | "register"
  | "review" | "recordscreen" | "exports" | "statuses" | "faq";

const sections: GuideSectionDef[] = [
  { key: "overview",  label: "Overview",                   group: "Getting Started" },
  { key: "card",      label: "Submitting an Observation Card", group: "Getting Started" },
  { key: "phone",     label: "Submitting from a Phone",    group: "Getting Started" },
  { key: "dashboard", label: "The Dashboard",              group: "HSE Review" },
  { key: "register",  label: "The Observation Register",   group: "HSE Review" },
  { key: "review",    label: "Reviewing & Closing Out",    group: "HSE Review" },
  { key: "recordscreen", label: "The record screen",       group: "HSE Review" },
  { key: "exports",   label: "Exporting PDF & Excel",      group: "Reports" },
  { key: "statuses",  label: "Status & Field Reference",   group: "Reference" },
  { key: "faq",       label: "Common Questions",           group: "Reference" },
];

function statusBadge(status: string): CSSProperties {
  const map: Record<string, "ok" | "warn" | "bad" | "neu" | "brand"> = {
    new: "warn",
    "in review": "brand",
    "action required": "bad",
    closed: "ok",
  };
  return tintPill(map[status.toLowerCase()] || "warn");
}

function SectionOverview() {
  return (
    <>
      <div style={eyebrow}>Getting Started</div>
      <h2 style={h2Style}>Overview</h2>
      <p style={pStyle}>An HSE Observation is a quick note about something someone has seen: a safe behaviour worth praising, an unsafe act or condition, an environmental concern, or a quality / process issue. Anyone can submit one using the public <strong>Observation Card</strong> — no IMS sign-in is needed, so employees, contractors, clients and visitors can all use it. HSE staff then review each card in the <strong>Observation Register</strong> inside the IMS.</p>
      <div style={flowWrap}>
        <div style={flowStep()}>Someone submits a card</div><div style={arrow}>→</div>
        <div style={flowStep()}>Logged as OBS-xxx, status New</div><div style={arrow}>→</div>
        <div style={flowStep()}>HSE reviews and assigns</div><div style={arrow}>→</div>
        <div style={flowStep(true)}>Closed out</div>
      </div>
      <h3 style={h3Style}>Two places, two audiences</h3>
      <p style={pStyle}><strong>The Observation Card</strong> — a mobile-friendly form that can only be used to submit. It does not show the IMS menus.<br /><strong>The Observation Cards page</strong> (HSE Management in the IMS) — where HSE staff use three tabs: <strong>Dashboard</strong>, <strong>Observation Register</strong> and <strong>QR Submit Link</strong>.</p>
      <div style={callout("info")}>
        <span>ℹ</span>
        <div>Public users can submit only. Reviewing, assigning, closing out, deleting and exporting all happen inside the IMS, and saving changes needs Edit permission for this IMS area.</div>
      </div>
    </>
  );
}

function SectionCard() {
  return (
    <>
      <div style={eyebrow}>Getting Started</div>
      <h2 style={h2Style}>Submitting an Observation Card</h2>
      <p style={pStyle}>The card opens on a <strong>Who is submitting?</strong> choice. The form only appears once you pick one.</p>
      <div style={mockPanel}>
        <div style={mockLabel}>Who is submitting?</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {["Employee", "Contractor", "Client", "Visitor", "Quick Fill"].map((t, i) => (
            <span key={t} style={{ ...btn(i === 0 ? "primary" : "ghost"), minWidth: 90, justifyContent: "center" }}>{t}</span>
          ))}
        </div>
      </div>
      <div style={stepList}>
        <Step n={1}>Open the Observation Card link (or scan the QR code) and choose <strong>Employee</strong>, <strong>Contractor</strong>, <strong>Client</strong>, <strong>Visitor</strong> or <strong>Quick Fill</strong>.</Step>
        <Step n={2}>Under <strong>Contact Details</strong>, enter your <code style={codeStyle}>Name</code> and <code style={codeStyle}>Company</code>. Choosing <strong>Quick Fill</strong> hides these two boxes. Use <strong>Add optional contact details</strong> to give a phone number or email if HSE may need to follow up.</Step>
        <Step n={3}>Under <strong>Observation details</strong>, pick the <code style={codeStyle}>Project</code>, then enter <code style={codeStyle}>Vessel / worksite</code> and <code style={codeStyle}>Exact location</code> (area, deck, room, workshop, yard).</Step>
        <Step n={4}>Check <code style={codeStyle}>Date</code> and <code style={codeStyle}>Time</code> — they start as today and now, but you can change them.</Step>
        <Step n={5}>Choose the <code style={codeStyle}>Observation type</code>, <code style={codeStyle}>Category</code> and <code style={codeStyle}>Risk / attention level</code>, and add a <code style={codeStyle}>Short title</code>.</Step>
        <Step n={6}>Describe it in <code style={codeStyle}>What was observed?</code> — this is the only compulsory box. Optionally fill in <code style={codeStyle}>Immediate action taken</code> and <code style={codeStyle}>Suggested action</code>.</Step>
        <Step n={7}>Optionally add photos or files under <strong>Photos or supporting evidence</strong>.</Step>
        <Step n={8}>Press <strong>Submit Observation</strong>. A green <strong>Logged</strong> message confirms your reference, for example OBS-014.</Step>
      </div>
      <div style={mockPanel}>
        <div style={mockLabel}>Observation details (extract)</div>
        <div style={mockRow}>
          <div style={mockField()}><div style={mockFieldLabel}>Project</div><div style={mockInput}>Select project</div></div>
          <div style={mockField()}><div style={mockFieldLabel}>Vessel / worksite</div><div style={mockInput}>Vessel name or worksite</div></div>
        </div>
        <div style={mockRow}>
          <div style={mockField()}><div style={mockFieldLabel}>Observation type</div><div style={mockInput}>Unsafe Condition</div></div>
          <div style={mockField()}><div style={mockFieldLabel}>Risk / attention level</div><div style={mockInput}>Select level</div></div>
        </div>
        <div style={mockFieldLabel}>What was observed?</div>
        <div style={{ ...mockInput, minHeight: 44 }}>Describe what happened, what you saw, or what could be improved.</div>
        <div style={{ marginTop: 10 }}><span style={btn("primary")}>Submit Observation</span></div>
      </div>
      <h3 style={h3Style}>Choices on the card</h3>
      <table style={imsTableStyle}>
        <thead>
          <tr>{["Field", "Options"].map(h => <th key={h} style={imsTableHeadStyle}>{h}</th>)}</tr>
        </thead>
        <tbody>
          <tr><td style={{ ...imsTableCellStyle, fontWeight: 700 }}>Observation type</td><td style={imsTableCellStyle}>Positive Observation, Unsafe Act, Unsafe Condition, Environmental, Quality / Process, Other</td></tr>
          <tr><td style={{ ...imsTableCellStyle, fontWeight: 700 }}>Category</td><td style={imsTableCellStyle}>People, Equipment, Environment, Process, Housekeeping, Access / Egress, Lifting, Dropped Object, PTW / Controls, Other</td></tr>
          <tr><td style={{ ...imsTableCellStyle, fontWeight: 700 }}>Risk / attention level</td><td style={imsTableCellStyle}>Low, Medium, High, Immediate attention</td></tr>
        </tbody>
      </table>
      <h3 style={h3Style}>Project and Vessel / worksite</h3>
      <p style={pStyle}>The <strong>Project</strong> list is shared. If you are signed in to the IMS, a <strong>+</strong> button appears beside it: enter a <code style={codeStyle}>Project name</code> (and optionally a <code style={codeStyle}>Project number</code>), then press <strong>Add project</strong>. If the project is already in the list you are told and it is selected for you. People who are not signed in do not see the <strong>+</strong> button.</p>
      <p style={pStyle}><strong>Vessel / worksite</strong> is free text, but it suggests names already used before — those used with the project you picked appear first. Choosing a suggestion keeps spellings consistent in reports.</p>
      <div style={callout("info")}>
        <span>ℹ</span>
        <div>Every card is logged with status <strong>New</strong> and the next free number in the OBS-001 sequence. To send a second card straight after, press <strong>Change</strong> and choose who is submitting again.</div>
      </div>
    </>
  );
}

function SectionPhone() {
  return (
    <>
      <div style={eyebrow}>Getting Started</div>
      <h2 style={h2Style}>Submitting from a Phone</h2>
      <p style={pStyle}>The Observation Card is built for quick use on a phone, in the field or on a vessel. There is nothing to install and no sign-in. The boxes are large, text is easy to read, and on a narrow screen the five &quot;Who is submitting?&quot; buttons sit in two columns.</p>
      <div style={{ ...mockPanel, maxWidth: 300 }}>
        <div style={mockLabel}>Phone view</div>
        <div style={{ ...mockHero, borderRadius: 8, textAlign: "center" }}>
          <div style={mockHeroEyebrow}>HSE Management</div>
          <div style={{ fontSize: 13, fontWeight: 700 }}>Your observation starts here.</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 10 }}>
          {["Employee", "Contractor", "Client", "Visitor"].map(t => (
            <span key={t} style={{ ...btn("ghost"), justifyContent: "center" }}>{t}</span>
          ))}
          <span style={{ ...btn("ghost"), justifyContent: "center", gridColumn: "1 / -1" }}>Quick Fill</span>
        </div>
        <span style={{ ...btn("primary"), width: "100%", justifyContent: "center" }}>Submit Observation</span>
      </div>
      <div style={stepList}>
        <Step n={1}>Scan the QR code on the poster, vessel notice board or toolbox-talk slide — or open the link you were sent.</Step>
        <Step n={2}>Tap <strong>Quick Fill</strong> if you are short of time: it skips your name and company. Otherwise tap <strong>Employee</strong>, <strong>Contractor</strong>, <strong>Client</strong> or <strong>Visitor</strong>.</Step>
        <Step n={3}>Pick the project, type what you saw in <strong>What was observed?</strong>, and choose a risk / attention level. Date and time are filled in for you.</Step>
        <Step n={4}>Tap the file box under <strong>Photos or supporting evidence</strong>. On most phones you can take a photo with the camera or choose one from your gallery.</Step>
        <Step n={5}>To add more photos, tap the file box again. Each new photo is added to the list — it does not replace the ones already there. Use <strong>Remove</strong> beside any file you added by mistake.</Step>
        <Step n={6}>Tap <strong>Submit Observation</strong> and wait for the green <strong>Logged</strong> message with your OBS number.</Step>
      </div>
      <div style={callout("warning")}>
        <span>⚠</span>
        <div>Wait for the <strong>Logged</strong> message before closing the page — large photos can take a moment on a weak signal. If you see an error message, check your connection and press <strong>Submit Observation</strong> again.</div>
      </div>
      <div style={callout("info")}>
        <span>ℹ</span>
        <div>HSE staff reviewing on a phone can open evidence too: photos and documents open in a new tab, or in the same tab if the phone blocks the new one (use Back to return to the IMS).</div>
      </div>
    </>
  );
}

function SectionDashboard() {
  const kpis: [string, string][] = [
    ["2026 Observations", "All cards for the year"],
    ["Open Observations", "Anything not Closed"],
    ["New Cards", "Status New"],
    ["High Attention", "High or Immediate attention"],
    ["Evidence Files", "Files uploaded"],
  ];
  return (
    <>
      <div style={eyebrow}>HSE Review</div>
      <h2 style={h2Style}>The Dashboard</h2>
      <p style={pStyle}>Open <strong>HSE Management → Observation Cards</strong>. The <strong>Dashboard</strong> tab opens first and gives a quick picture of the year. Use the <strong>Year</strong> box at the top right to change year — it applies to the Dashboard and the Register.</p>
      <div style={mockPanel}>
        <div style={mockLabel}>Dashboard tiles</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {kpis.map(([t, s]) => (
            <div key={t} style={{ flex: "1 1 120px", background: "#fff", border: `1px solid ${imsColours.border}`, borderRadius: 8, padding: "8px 10px" }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: imsColours.muted, textTransform: "uppercase" }}>{t}</div>
              <div style={{ fontSize: 10, color: imsColours.muted, marginTop: 4 }}>{s}</div>
            </div>
          ))}
        </div>
      </div>
      <p style={pStyle}>Click a tile to jump to the register: <strong>New Cards</strong> filters to status New, and <strong>High Attention</strong> filters to risk High.</p>
      <h3 style={h3Style}>Charts and latest cards</h3>
      <div style={stepList}>
        <Step n={1}><strong>Observation Types</strong> — a bar chart of how many cards of each type.</Step>
        <Step n={2}><strong>Status Mix</strong> — a ring chart of New, In Review, Action Required and Closed.</Step>
        <Step n={3}><strong>Risk / Attention Level</strong> — a bar chart by risk level.</Step>
        <Step n={4}><strong>Latest Observations</strong> — the six most recent cards. Click one to open it in the register.</Step>
      </div>
      <div style={callout("info")}>
        <span>ℹ</span>
        <div>Dashboard counts include closed observations. The &quot;Open Observations&quot; tile is the only one that leaves closed cards out.</div>
      </div>
    </>
  );
}

function SectionRegister() {
  return (
    <>
      <div style={eyebrow}>HSE Review</div>
      <h2 style={h2Style}>The Observation Register</h2>
      <div style={mockPanel}>
        <div style={{ ...mockHero, marginTop: 0 }}>
          <div style={mockHeroEyebrow}>HSE Management</div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>Observation Register</div>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
          <span style={{ ...mockInput, width: 220 }}>Search observation no., details...</span>
          <span style={btn("primary")}>Show Closed</span>
          <span style={btn("ghost")}>Clear Filters</span>
          <span style={btn("primary")}>Export PDF</span>
          <span style={btn("ghost")}>Export Excel</span>
          <span style={btn("primary")}>Show Filters</span>
        </div>
        <table style={imsTableStyle}>
          <thead>
            <tr>
              {["Observation No.", "Type", "Project", "Risk", "Status", "Submitted As", "Date"].map(h => (
                <th key={h} style={imsTableHeadStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ ...imsTableCellStyle, fontWeight: 800, color: imsColours.brand, whiteSpace: "nowrap" }}>OBS-014</td>
              <td style={imsTableCellStyle}>Unsafe Condition</td>
              <td style={imsTableCellStyle}>Blyth Base</td>
              <td style={imsTableCellStyle}>High</td>
              <td style={imsTableCellStyle}><span style={statusBadge("new")}>New</span></td>
              <td style={imsTableCellStyle}>Contractor</td>
              <td style={imsTableCellStyle}>12 Mar 2026</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p style={pStyle}>The register also shows <strong>Vessel / Worksite</strong>, <strong>Location</strong> and <strong>Submitted By</strong> columns. A line above the table reads, for example, <em>Showing 12 of 40 observations · closed observations are hidden</em>. Click any row to open its record screen underneath (see The record screen).</p>
      <p style={pStyle}>The toolbar runs left to right: search, <strong>Show Closed</strong>, <strong>Clear Filters</strong>, <strong>Export PDF</strong>, <strong>Export Excel</strong> and <strong>Show Filters</strong>.</p>
      <h3 style={h3Style}>Closed observations are hidden by default</h3>
      <p style={pStyle}>To keep the list focused on live items, closed observations do not appear until you ask for them.</p>
      <div style={stepList}>
        <Step n={1}>Press <strong>Show Closed</strong> to include closed observations. The button changes to <strong>Hide Closed</strong>.</Step>
        <Step n={2}>Press <strong>Hide Closed</strong> to hide them again.</Step>
        <Step n={3}>Choosing a Status of <strong>Closed</strong> in the filters also shows closed observations — picking a status counts as asking to see it.</Step>
      </div>
      <h3 style={h3Style}>Searching and filtering</h3>
      <p style={pStyle}>Type in the search box to match observation number, title, description, project, vessel / worksite, location, reporter name or reporter company. Open the filters to narrow further:</p>
      <table style={imsTableStyle}>
        <thead>
          <tr>{["Filter", "Choices"].map(h => <th key={h} style={imsTableHeadStyle}>{h}</th>)}</tr>
        </thead>
        <tbody>
          <tr><td style={{ ...imsTableCellStyle, fontWeight: 700 }}>Project</td><td style={imsTableCellStyle}>All projects, or any project that has a card in the selected year</td></tr>
          <tr><td style={{ ...imsTableCellStyle, fontWeight: 700 }}>Status</td><td style={imsTableCellStyle}>All statuses, New, In Review, Action Required, Closed</td></tr>
          <tr><td style={{ ...imsTableCellStyle, fontWeight: 700 }}>Type</td><td style={imsTableCellStyle}>All types, or one of the six observation types</td></tr>
          <tr><td style={{ ...imsTableCellStyle, fontWeight: 700 }}>Risk / Attention</td><td style={imsTableCellStyle}>All levels, Low, Medium, High, Immediate attention</td></tr>
          <tr><td style={{ ...imsTableCellStyle, fontWeight: 700 }}>Submitted As</td><td style={imsTableCellStyle}>All submitter types, Employee, Contractor, Client, Visitor, Quick Fill</td></tr>
        </tbody>
      </table>
      <p style={pStyle}><strong>Clear Filters</strong> empties the search and every filter, and hides closed observations again.</p>
    </>
  );
}

function SectionReview() {
  return (
    <>
      <div style={eyebrow}>HSE Review</div>
      <h2 style={h2Style}>Reviewing &amp; Closing Out</h2>
      <p style={pStyle}>Click a row in the register and the observation opens on the <strong>record screen</strong> below the list (see The record screen). Step 1 <strong>Card</strong> shows what the submitter entered (who and where, type, risk, date and time, title, observation, immediate action and suggested action). Step 2 <strong>Review</strong> is where you assign and assess it.</p>
      <div style={mockPanel}>
        <div style={mockLabel}>Step 2 Review - OBS-014</div>
        <div style={mockRow}>
          <div style={mockField()}><div style={mockFieldLabel}>Status</div><div style={mockInput}>In Review</div></div>
          <div style={mockField()}><div style={mockFieldLabel}>Assigned To</div><div style={mockInput}>Unassigned</div></div>
        </div>
        <div style={mockFieldLabel}>Close-out / Review Notes</div>
        <div style={{ ...mockInput, minHeight: 40 }}> </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
          <span style={btn("primary")}>Save Review</span>
          <span style={btn("danger")}>Delete Observation</span>
        </div>
      </div>
      <div style={stepList}>
        <Step n={1}>Read the card in step 1 <strong>Card</strong>. Evidence is under step 4 <strong>Close-out</strong>: open any file with <strong>Open Evidence</strong> (each file shows its size and upload time).</Step>
        <Step n={2}>In step 2 <strong>Review</strong>, set <code style={codeStyle}>Assigned To</code> from the list of active people — the list comes from People Management.</Step>
        <Step n={3}>Move the <code style={codeStyle}>Status</code> on: <span style={statusBadge("in review")}>In Review</span> while HSE considers it, <span style={statusBadge("action required")}>Action Required</span> when something must be done.</Step>
        <Step n={4}>Add what was done or decided in <code style={codeStyle}>Close-out / Review Notes</code>.</Step>
        <Step n={5}>Press <strong>Save Review</strong>. The status line at the top confirms with &quot;OBS-014 updated.&quot;</Step>
        <Step n={6}>When the matter is dealt with, press <strong>Close Out</strong> at the top of the record screen. It sets the Status to <span style={statusBadge("closed")}>Closed</span> and saves the review, and the observation then drops out of the default register view. You can also set the Status to Closed by hand and press <strong>Save Review</strong>.</Step>
      </div>
      <h3 style={h3Style}>Follow-up actions</h3>
      <p style={pStyle}>Press <strong>Create HSE Action</strong> (at the top of the record screen, or in step 3 <strong>Actions</strong>) to open the Actions create screen with the source set to Observation, the department to HSE, and the project and observation number carried across. Once the action is saved it appears under <strong>Linked Actions</strong> in step 3 <strong>Actions</strong>, with its owner, due date and status, and an <strong>Open Linked Action</strong> button.</p>
      <h3 style={h3Style}>Automatic emails</h3>
      <p style={pStyle}>The IMS sends an email, but only when the person&apos;s name matches an active person in People Management that has an email address:</p>
      <div style={stepList}>
        <Step n={1}>The person newly chosen in <strong>Assigned To</strong> is told they have been assigned the observation. Saving other changes does not re-send it.</Step>
        <Step n={2}>The person who submitted the card (if their name matches) is told when the status changes, and when new close-out notes are added.</Step>
      </div>
      <div style={callout("warning")}>
        <span>⚠</span>
        <div><strong>Delete Observation</strong> asks for confirmation, then removes the observation and its uploaded evidence files. It cannot be undone — close the observation instead unless it was raised in error. <strong>Save Review</strong> and <strong>Delete Observation</strong> need Edit permission; <strong>Create HSE Action</strong> needs Create permission. <strong>Close Out</strong> needs Edit permission. Without the right permission the buttons are greyed out.</div>
      </div>
    </>
  );
}

function SectionRecordScreen() {
  return (
    <>
      <div style={eyebrow}>HSE Review</div>
      <h2 style={h2Style}>The record screen</h2>
      <p style={pStyle}>When you open an observation from the register, it appears on the <strong>record screen</strong> underneath the list. The same details and buttons as before are there, grouped into four steps.</p>
      <RecordScreenMock
        id="OBS-014"
        title="Trip hazard at gangway"
        status="In Review"
        tone="brand"
        nextButton="Close Out"
        track={["New", "In Review", "Action Required", "Closed"]}
        steps={[
          { label: "Card", state: "Received" },
          { label: "Review", state: "Assigned" },
          { label: "Actions", state: "1 linked" },
          { label: "Close-out", state: "Not started" },
        ]}
        active={1}
        missing={["Review / close-out note", "Linked action closed"]}
        gate="this card can be closed"
        summaryTitle="History"
        summaryRows={[["Submitted", "12 Mar 2026 09:14"], ["Last updated", "13 Mar 2026 11:02"]]}
      />
      <h3 style={h3Style}>The header</h3>
      <p style={pStyle}>The top shows the observation number, title and status, with a track reading New, In Review, Action Required, Closed that marks where the card is now. The buttons are <strong>Create HSE Action</strong>, <strong>Close Out</strong> and <strong>Hide Panel</strong>. A line under the track reminds you that status is set by hand in the Review step.</p>
      <h3 style={h3Style}>The four steps</h3>
      <div style={stepList}>
        <Step n={1}><strong>Card</strong> (as submitted): the details the submitter entered. The step reads <em>Received</em>.</Step>
        <Step n={2}><strong>Review</strong> (assign and assess): Status, Assigned To, Close-out / Review Notes, <strong>Save Review</strong> and <strong>Delete Observation</strong>. The step reads <em>Assigned</em> or <em>Unassigned</em>.</Step>
        <Step n={3}><strong>Actions</strong> (linked HSE actions): the Linked Actions list with an <strong>Open Linked Action</strong> button on each, and <strong>Create HSE Action</strong>. The step reads, for example, <em>1 linked</em>.</Step>
        <Step n={4}><strong>Close-out</strong> (notes, evidence): the notes, who closed it and when, <strong>Save Review</strong> and the Evidence list. The step reads <em>Not started</em>, <em>Notes added</em> or <em>Closed</em>.</Step>
      </div>
      <p style={pStyle}>Observations have no percentages: each step shows a short state word instead. The screen opens on step 1.</p>
      <h3 style={h3Style}>Still missing</h3>
      <p style={pStyle}>A box lists what is still missing before the card can be closed: <em>Review / close-out note</em> (the review notes and the close-out notes are the same box), and <em>Linked action closed</em> when a linked action is still open. Click a chip to jump to that step.</p>
      <div style={callout("info")}>
        <span>ℹ</span>
        <div>The chips warn, they never block. If you press <strong>Close Out</strong> with items missing you are asked &ldquo;N items are still missing: ... Close anyway?&rdquo;, or simply &ldquo;Close OBS-014?&rdquo; when nothing is missing. Close Out sets the status to Closed and saves, the same save as Save Review. It is greyed out once the card is Closed.</div>
      </div>
      <h3 style={h3Style}>Form, Split and History</h3>
      <p style={pStyle}>The buttons above the steps change the layout: <strong>Form</strong> shows only the fields, <strong>Split</strong> shows them beside a <strong>History</strong> panel (submitted, last updated, and closed by and when), and <strong>History</strong> shows that panel on its own. The History panel only appears once the card has dates to show.</p>
      <h3 style={h3Style}>All sections</h3>
      <p style={pStyle}>The <strong>All sections</strong> button shows all four steps on one long page, as the detail panel used to. Click it again to return to one step at a time.</p>
    </>
  );
}

function SectionExports() {
  return (
    <>
      <div style={eyebrow}>Reports</div>
      <h2 style={h2Style}>Exporting PDF &amp; Excel</h2>
      <p style={pStyle}>Both exports contain <strong>exactly the observations the register is showing</strong>. Set the Year, Project, Status, Type, Risk / Attention, Submitted As, search and <strong>Show Closed</strong> / <strong>Hide Closed</strong> first; the export follows them. The filters used are printed at the top of each file so readers know what they are looking at. If the register is empty, both export buttons are greyed out.</p>
      <h3 style={h3Style}>Export PDF</h3>
      <div style={stepList}>
        <Step n={1}>Press <strong>Export PDF</strong>. A panel of options opens.</Step>
        <Step n={2}>Under <strong>Group by</strong>, choose <strong>Project (recommended)</strong>, <strong>Observation type</strong>, <strong>Risk level</strong> or <strong>No grouping</strong>.</Step>
        <Step n={3}>Under <strong>Order within each group</strong>, choose <strong>Newest first</strong>, <strong>Oldest first</strong> or <strong>Highest risk first</strong>.</Step>
        <Step n={4}>Under <strong>Add under each description</strong>, tick any of <strong>Immediate action</strong>, <strong>Suggested action</strong>, <strong>Assigned to</strong> and <strong>Close-out notes</strong>.</Step>
        <Step n={5}>Press <strong>Download PDF</strong>. Press <strong>Export PDF</strong> again to close the panel.</Step>
      </div>
      <div style={mockPanel}>
        <div style={mockLabel}>PDF options</div>
        <div style={{ display: "flex", gap: 18, flexWrap: "wrap", fontSize: 12 }}>
          <div><strong>Group by</strong><br />(•) Project (recommended)<br />( ) Observation type<br />( ) Risk level<br />( ) No grouping</div>
          <div><strong>Order within each group</strong><br />(•) Newest first<br />( ) Oldest first<br />( ) Highest risk first</div>
          <div><strong>Add under each description</strong><br />[ ] Immediate action<br />[ ] Suggested action<br />[ ] Assigned to<br />[ ] Close-out notes</div>
        </div>
        <div style={{ marginTop: 10 }}><span style={btn("primary")}>Download PDF</span></div>
      </div>
      <p style={pStyle}>The PDF is landscape A4 with the Enshore and Recognise / Report / Resolve logos, a summary strip (Observations, Open, New, High / immediate attention, Closed), then one block per group, each headed with its count and how many are open. Every row shows number, date, type, location, risk, status, title and the full description. Photos and reporter details are <strong>not</strong> included. The file is named like <code style={codeStyle}>HSE-Observations-Blyth-Base-2026-03-12.pdf</code>.</p>
      <h3 style={h3Style}>Export Excel</h3>
      <p style={pStyle}>Press <strong>Export Excel</strong> to download a workbook with a sheet called <strong>Observation Register</strong>. Every field has its own column, the heading row stays in view as you scroll, and filters are already switched on so you can sort and filter straight away. The columns are:</p>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
        {["Observation No.", "Date", "Time", "Project", "Vessel / Worksite", "Site / Location", "Type", "Category", "Risk Level", "Status", "Title", "Description", "Immediate Action", "Suggested Action", "Assigned To", "Submitted As", "Reporter", "Reporter Company", "Close-out Notes", "Closed By", "Closed On"].map(c => (
          <span key={c} style={pill(imsColours.page, imsColours.ink)}>{c}</span>
        ))}
      </div>
      <p style={pStyle}>Unlike the PDF, the Excel file includes <strong>Reporter</strong> and <strong>Reporter Company</strong>, so treat it as an internal document. The file is named like <code style={codeStyle}>observation-register-Blyth-Base-2026-03-12.xlsx</code>.</p>
      <div style={callout("info")}>
        <span>ℹ</span>
        <div>Want closed observations in a report? Press <strong>Show Closed</strong> before exporting. Want one project only? Pick it in the <strong>Project</strong> filter first.</div>
      </div>
    </>
  );
}

function SectionStatuses() {
  return (
    <>
      <div style={eyebrow}>Reference</div>
      <h2 style={h2Style}>Status &amp; Field Reference</h2>
      <h3 style={h3Style}>Status</h3>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        {["New", "In Review", "Action Required", "Closed"].map(s => <span key={s} style={statusBadge(s)}>{s}</span>)}
      </div>
      <table style={imsTableStyle}>
        <thead>
          <tr>{["Status", "Meaning"].map(h => <th key={h} style={imsTableHeadStyle}>{h}</th>)}</tr>
        </thead>
        <tbody>
          <tr><td style={{ ...imsTableCellStyle, whiteSpace: "nowrap" }}><span style={statusBadge("new")}>New</span></td><td style={imsTableCellStyle}>Just submitted. Every card starts here automatically.</td></tr>
          <tr><td style={{ ...imsTableCellStyle, whiteSpace: "nowrap" }}><span style={statusBadge("in review")}>In Review</span></td><td style={imsTableCellStyle}>HSE is looking at it.</td></tr>
          <tr><td style={{ ...imsTableCellStyle, whiteSpace: "nowrap" }}><span style={statusBadge("action required")}>Action Required</span></td><td style={imsTableCellStyle}>Something needs to be done about it.</td></tr>
          <tr><td style={{ ...imsTableCellStyle, whiteSpace: "nowrap" }}><span style={statusBadge("closed")}>Closed</span></td><td style={imsTableCellStyle}>Dealt with. Hidden in the register until you press <strong>Show Closed</strong>.</td></tr>
        </tbody>
      </table>
      <p style={pStyle}>Statuses are changed by hand on the record screen (the Status box in step 2 <strong>Review</strong>, or the <strong>Close Out</strong> button); the system does not move them on by itself.</p>
      <h3 style={h3Style}>Reference number</h3>
      <p style={pStyle}>Each card is given the next number in the sequence <code style={codeStyle}>OBS-001</code>, <code style={codeStyle}>OBS-002</code> and so on. The number is shown to the submitter when the card is logged.</p>
      <h3 style={h3Style}>Risk / attention levels</h3>
      <table style={imsTableStyle}>
        <thead>
          <tr>{["Level", "Notes"].map(h => <th key={h} style={imsTableHeadStyle}>{h}</th>)}</tr>
        </thead>
        <tbody>
          <tr><td style={{ ...imsTableCellStyle, fontWeight: 700 }}>Low</td><td style={imsTableCellStyle}>Lowest priority.</td></tr>
          <tr><td style={{ ...imsTableCellStyle, fontWeight: 700 }}>Medium</td><td style={imsTableCellStyle}>Shown in bold in the PDF.</td></tr>
          <tr><td style={{ ...imsTableCellStyle, fontWeight: 700 }}>High</td><td style={imsTableCellStyle}>Shown in red in the PDF; counted under the Dashboard&apos;s High Attention tile.</td></tr>
          <tr><td style={{ ...imsTableCellStyle, fontWeight: 700 }}>Immediate attention</td><td style={imsTableCellStyle}>Highest. Shown as a red cell in the PDF; counted under High Attention.</td></tr>
        </tbody>
      </table>
      <h3 style={h3Style}>Submitted As</h3>
      <p style={pStyle}>Employee, Contractor, Client, Visitor or Quick Fill. A card with no choice recorded is shown as Quick Fill. Quick Fill cards normally have no name, so <strong>Submitted By</strong> reads &quot;Not provided&quot;.</p>
      <h3 style={h3Style}>Evidence files accepted</h3>
      <p style={pStyle}>Photos (including phone camera photos), PDF, Word, Excel, PowerPoint, CSV and text files. Several files can be added to one card.</p>
    </>
  );
}

function SectionFaq() {
  const qa: [string, ReactElement][] = [
    ["Do contractors and visitors need an IMS login to submit?", <>No. The Observation Card is public. Share the link or the QR code from the <strong>QR Submit Link</strong> tab, where you can press <strong>Open QR Form</strong> or <strong>Copy Link</strong>.</>],
    ["Where did my closed observation go?", <>Closed observations are hidden by default. Press <strong>Show Closed</strong> above the register, or pick Closed in the Status filter.</>],
    ["Can I submit anonymously?", <>Yes. Choose <strong>Quick Fill</strong> and leave the contact details empty — only <strong>What was observed?</strong> is compulsory. Anonymous submitters cannot be emailed about progress.</>],
    ["I cannot see my project in the list.", <>If you are signed in to the IMS, use the <strong>+</strong> button beside Project to add it. Otherwise ask someone with IMS access to add it.</>],
    ["The PDF or Excel has fewer observations than I expected.", <>The export matches the register as it is now. Check the Year, filters, search and whether closed observations are hidden (<strong>Show Closed</strong>). The filters used are printed at the top of the file.</>],
    ["The export buttons are greyed out.", <>No observations match the current filters. Press <strong>Clear Filters</strong> or change the Year.</>],
    ["Why is Save Review greyed out?", <>Your account does not have Edit permission for this IMS area. Ask an IMS administrator.</>],
    ["Who gets an email when I save a review?", <>Only a newly chosen <strong>Assigned To</strong> person, and the original submitter when the status or close-out notes change — and only if their name matches an active person with an email address in People Management.</>],
    ["A photo did not appear on the observation.", <>Open the observation in the register and look under <strong>Evidence</strong>. If a file failed to upload the card is still logged, so ask the submitter to resend the photo.</>],
    ["Can I open a link straight to one observation?", <>Yes. A link ending <code style={codeStyle}>?observation=OBS-014</code> opens the register on that observation, even if it is closed. The emails use this link.</>],
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
  card:      SectionCard,
  phone:     SectionPhone,
  dashboard: SectionDashboard,
  register:  SectionRegister,
  review:    SectionReview,
  recordscreen: SectionRecordScreen,
  exports:   SectionExports,
  statuses:  SectionStatuses,
  faq:       SectionFaq,
};

export const observationsGuide: GuideDefinition = {
  id: "observations",
  navLabel: "Observations",
  guideLabel: "HSE Observations",
  defaultSection: "overview",
  sections,
  sectionComponents,
};
