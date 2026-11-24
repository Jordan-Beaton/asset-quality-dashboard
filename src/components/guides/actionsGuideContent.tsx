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
  | "overview" | "register" | "recordscreen" | "create" | "update" | "myactions"
  | "linked" | "bulk" | "reports" | "statuses" | "faq";

const sections: GuideSectionDef[] = [
  { key: "overview",  label: "Overview",                  group: "Getting Started" },
  { key: "register",  label: "The Action Register",       group: "Getting Started" },
  { key: "recordscreen", label: "The record screen",      group: "Core Workflows" },
  { key: "create",    label: "Creating an Action",        group: "Core Workflows" },
  { key: "update",    label: "Updating & Closing Out",    group: "Core Workflows" },
  { key: "myactions", label: "My Actions & Today",        group: "Core Workflows" },
  { key: "bulk",      label: "Bulk Upload",               group: "Core Workflows" },
  { key: "linked",    label: "Linked Records & Modules",  group: "Linked Records" },
  { key: "reports",   label: "PDF & Excel Reports",       group: "Reports" },
  { key: "statuses",  label: "Status Reference",          group: "Reference" },
  { key: "faq",       label: "Common Questions",          group: "Reference" },
];

function badge(status: string): CSSProperties {
  const map: Record<string, "ok" | "warn" | "bad" | "neu" | "brand"> = {
    open: "warn",
    "in progress": "brand",
    closed: "ok",
    overdue: "bad",
    neutral: "neu",
    link: "brand",
  };
  return tintPill(map[status.toLowerCase()] || "neu");
}

const tabRow: CSSProperties = { display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 };
const tabChip = (active?: boolean): CSSProperties => ({
  background: active ? imsColours.brand : imsColours.panel,
  color: active ? "#ffffff" : imsColours.ink,
  border: `1px solid ${active ? imsColours.brand : imsColours.border}`,
  borderRadius: 8,
  padding: "5px 10px",
  fontSize: 11,
  fontWeight: 700,
});

function SectionOverview() {
  return (
    <>
      <div style={eyebrow}>Getting Started</div>
      <h2 style={h2Style}>Overview</h2>
      <p style={pStyle}>Action Management is the one central place where every action in the IMS is recorded, owned, chased and closed. Whether an action came from an audit, an NCR, an inspection, an AINM, a Management of Change or was simply typed in by hand, it lives in the same register with a number like <code style={codeStyle}>ACT-012</code>.</p>
      <div style={flowWrap}>
        <div style={flowStep()}>Create Action</div><div style={arrow}>→</div>
        <div style={flowStep()}>Owner is notified</div><div style={arrow}>→</div>
        <div style={flowStep()}>Update status &amp; add evidence</div><div style={arrow}>→</div>
        <div style={flowStep(true)}>Close out</div>
      </div>
      <h3 style={h3Style}>The seven tabs</h3>
      <div style={mockPanel}>
        <div style={{ ...mockHero, marginTop: 0 }}>
          <div style={mockHeroEyebrow}>Action Management</div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>Action Management</div>
        </div>
        <div style={tabRow}>
          {["Dashboard", "Action Register", "Create Action", "My Actions", "Today", "Overdue / Priority", "Bulk Upload"].map((t, i) => (
            <span key={t} style={tabChip(i === 1)}>{t}</span>
          ))}
        </div>
      </div>
      <table style={imsTableStyle}>
        <thead>
          <tr>{["Tab", "Use it to"].map(h => <th key={h} style={imsTableHeadStyle}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {([
            ["Dashboard", "See the big picture: counts and charts. Click any number or bar to jump to the matching actions in the register."],
            ["Action Register", "Search, filter, open, edit and delete any action. Also where you use Export PDF and Export Excel."],
            ["Create Action", "Add a single new action, with optional evidence files."],
            ["My Actions", "Your personal list of everything assigned to you."],
            ["Today", "Your items sorted by urgency: Overdue, Due Today, Due This Week, Later."],
            ["Overdue / Priority", "Three quick lists of what needs chasing: Overdue First, Due This Week, High Priority Open."],
            ["Bulk Upload", "Import many actions at once from an Excel tracker."],
          ] as [string, string][]).map(([a, b]) => (
            <tr key={a}>
              <td style={{ ...imsTableCellStyle, fontWeight: 800, whiteSpace: "nowrap" }}>{a}</td>
              <td style={imsTableCellStyle}>{b}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h3 style={h3Style}>The Dashboard</h3>
      <p style={pStyle}>The Dashboard has one row of six number cards: <strong>Open</strong>, <strong>Closed</strong>, <strong>Overdue</strong>, <strong>Evidence</strong>, <strong>Mine</strong> (your open actions) and <strong>Link issues</strong> (actions missing the record they should link to). Below them, the Action Intelligence Dashboard shows charts for <strong>Actions by Status</strong>, <strong>Actions by Source / Module</strong>, <strong>Open Actions by Owner</strong>, <strong>Due Date Pressure</strong>, <strong>Priority Mix</strong> and <strong>Closure Trend</strong>. Every card and chart is clickable and takes you to the register already filtered.</p>
      <div style={callout("info")}>
        <span>ℹ</span>
        <div>Closed actions are hidden from the register by default so you only see work still to do. See <strong>The Action Register</strong> for how to include them.</div>
      </div>
      <div style={callout("info")}>
        <span>ℹ</span>
        <div><strong>Using it on a phone:</strong> the tabs wrap onto several lines and the tables scroll sideways. <strong>My Actions</strong> shows a card for each item instead of a wide table, with <strong>Start</strong>, <strong>Close</strong> and <strong>Add evidence</strong> buttons, so use it to work through your own items.</div>
      </div>
    </>
  );
}

function SectionRegister() {
  return (
    <>
      <div style={eyebrow}>Getting Started</div>
      <h2 style={h2Style}>The Action Register</h2>
      <p style={pStyle}>The <strong>Action Register</strong> tab lists every central action. Click a row (or its <strong>Open</strong> button) to open the action on the <strong>record screen</strong> in the <strong>Action Detail</strong> panel underneath (see The record screen).</p>
      <div style={mockPanel}>
        <div style={mockLabel}>Action Register</div>
        <div style={{ ...mockRow, alignItems: "center" }}>
          <div style={mockField(3)}><input style={mockInput} readOnly placeholder="Search action no. / title / project / owner" /></div>
          <span style={btn("primary")}>Show Closed</span>
          <span style={btn("ghost")}>Clear Filters</span>
          <span style={btn("primary")}>Export PDF</span>
          <span style={btn("ghost")}>Export Excel</span>
          <span style={btn("primary")}>Show Filters</span>
        </div>
        <div style={{ fontSize: 11, color: imsColours.muted, marginBottom: 8 }}>Showing <strong>14</strong> of <strong>63</strong> actions showing <strong>open/non-closed</strong></div>
        <table style={imsTableStyle}>
          <thead>
            <tr>
              {["Action No.", "Title", "Department", "Source", "Linked Record", "Owner", "Due Date", "Status", "Actions"].map(h => (
                <th key={h} style={imsTableHeadStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ ...imsTableCellStyle, fontWeight: 800, color: imsColours.brand, whiteSpace: "nowrap" }}>ACT-041</td>
              <td style={imsTableCellStyle}>Replace worn lifting strops</td>
              <td style={imsTableCellStyle}>Assets</td>
              <td style={imsTableCellStyle}><span style={badge("link")}>Asset Inspection</span></td>
              <td style={imsTableCellStyle}>Inspection INS-0112</td>
              <td style={imsTableCellStyle}>A. Example</td>
              <td style={imsTableCellStyle}>12 Dec 2026<br /><span style={{ color: imsColours.danger, fontWeight: 700 }}>3 days overdue</span></td>
              <td style={imsTableCellStyle}><span style={badge("in progress")}>In Progress</span></td>
              <td style={imsTableCellStyle}>Open · Delete</td>
            </tr>
          </tbody>
        </table>
      </div>
      <h3 style={h3Style}>Closed actions are hidden by default</h3>
      <p style={pStyle}>When you open the register it shows <strong>open and in-progress actions only</strong>. To see closed ones as well:</p>
      <div style={stepList}>
        <Step n={1}>Click <strong>Show Closed</strong> in the toolbar. The button changes to <strong>Hide Closed</strong> and closed actions appear in the list.</Step>
        <Step n={2}>Click <strong>Hide Closed</strong> to hide them again.</Step>
      </div>
      <p style={pStyle}>Choosing a value in the <code style={codeStyle}>All Status</code> filter (for example Closed) also shows those actions. <strong>Clear Filters</strong> puts everything back to the default: open actions only.</p>
      <p style={pStyle}>The toolbar runs left to right: the search box, <strong>Show Closed</strong>, <strong>Clear Filters</strong>, <strong>Export PDF</strong>, <strong>Export Excel</strong> and <strong>Show Filters</strong>.</p>
      <h3 style={h3Style}>Searching and filtering</h3>
      <p style={pStyle}>Type in the search box to find an action by number, title, project, owner or linked record number. Click <strong>Show Filters</strong> to reveal:</p>
      <table style={imsTableStyle}>
        <thead>
          <tr>{["Filter", "Options"].map(h => <th key={h} style={imsTableHeadStyle}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {([
            ["All Status", "Open, In Progress, Closed"],
            ["All Priorities", "Low, Medium, High"],
            ["All Owners / All Projects", "Everyone and every project that appears on an action"],
            ["All Sources", "Where the action came from. Every source is listed: Manual, Audit, Audit Finding, Asset Inspection, Asset Maintenance, Asset Calibration, NCR/CAPA, MOC, AINM, HSE Inspection, Observation, Risk, HSE and Other"],
            ["All Departments", "Assets, Base, Commercial, Crewing, Engineering, Finance, Human Resources, Logistics, Marketing, Operations, Procurement, Project, Quality, Survey, HSE, HSEQ"],
            ["Include All Due Status / Showing Overdue Only", "Toggle button: switch to overdue actions only"],
          ] as [string, string][]).map(([a, b]) => (
            <tr key={a}>
              <td style={{ ...imsTableCellStyle, fontWeight: 800 }}>{a}</td>
              <td style={imsTableCellStyle}>{b}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p style={pStyle}>The line above the table (&ldquo;Showing 14 of 63 actions&rdquo;) tells you how many actions match the filters you have on, so you always know whether something is being hidden.</p>
      <div style={callout("info")}>
        <span>ℹ</span>
        <div>Overdue actions show the number of days overdue in red under the due date. The date shown as &ldquo;Due today&rdquo;, &ldquo;Due tomorrow&rdquo; or &ldquo;Due in N days&rdquo; updates automatically.</div>
      </div>
    </>
  );
}

function SectionRecordScreen() {
  return (
    <>
      <div style={eyebrow}>Core Workflows</div>
      <h2 style={h2Style}>The record screen</h2>
      <p style={pStyle}>When you open an action from the Action Register, My Actions or a link from another module, it appears on the <strong>record screen</strong>. It has the same fields and buttons as the old Action Detail panel, arranged in three steps with the status, the next-step button and a linked-record card in view.</p>
      <RecordScreenMock
        id="ACT-041"
        title="Replace worn lifting strops"
        status="In Progress"
        tone="brand"
        nextButton="Close"
        track={["Open", "In Progress", "Closed"]}
        steps={[
          { label: "Details", state: "Complete" },
          { label: "Evidence", state: "0 files" },
          { label: "Linked record", state: "INS-0112" },
        ]}
        active={1}
        missing={["Evidence attached", "Closing note"]}
        gate="closing"
        summaryTitle="Linked record"
        summaryRows={[["Source", "Asset Inspection"], ["Record", "INS-0112"], ["Due", "Overdue 3 days"]]}
      />
      <h3 style={h3Style}>The header</h3>
      <p style={pStyle}>The top shows the action number, title, status and priority, with a track reading Open, In Progress, Closed. A line underneath gives the due date wording (for example &ldquo;Due in 3 days&rdquo; or &ldquo;Overdue 4 days&rdquo;) and where the action was raised from. One next-step button moves the action on:</p>
      <div style={stepList}>
        <Step n={1}><strong>Mark In Progress</strong> while the action is Open.</Step>
        <Step n={2}><strong>Close</strong> while it is In Progress.</Step>
        <Step n={3}>No button once it is Closed.</Step>
      </div>
      <p style={pStyle}>The button saves the action with its new status using the normal checks and emails. It needs Edit permission. <strong>Hide Panel</strong> closes the record. AINM actions also have <strong>Send Notification</strong> and <strong>← Back to AINM</strong> in the header.</p>
      <h3 style={h3Style}>The three steps</h3>
      <div style={stepList}>
        <Step n={1}><strong>Details</strong> (what, who, when): the fields, Close-out Comments and the Description. The step reads <em>Complete</em>, or how many of Title, Owner and Due Date are still to fill.</Step>
        <Step n={2}><strong>Evidence</strong> (files for closure): upload, open and delete files. The step reads how many files are attached.</Step>
        <Step n={3}><strong>Linked record</strong> (where it came from): the Linked Record Intelligence box. The step reads the linked record number, or <em>None</em>.</Step>
      </div>
      <p style={pStyle}>Actions use state words rather than percentages. The record opens on Details, except when you press <strong>Add evidence</strong> on a My Actions card, which opens it on Evidence. <strong>Save Action</strong> stays below the steps.</p>
      <h3 style={h3Style}>Still missing</h3>
      <p style={pStyle}>While an action is not yet closed, a box lists <em>Evidence attached</em> and <em>Closing note</em> when they are missing. Click a chip to jump to that step.</p>
      <div style={callout("info")}>
        <span>ℹ</span>
        <div>The chips warn, they never block. Closing with items missing asks &ldquo;N items are still missing: ... Close anyway?&rdquo; and you can go ahead.</div>
      </div>
      <h3 style={h3Style}>Form, Split and Summary</h3>
      <p style={pStyle}><strong>Form</strong> shows only the steps, <strong>Split</strong> shows them beside a <strong>Linked record</strong> card, and <strong>Summary</strong> shows that card on its own. The card lists the Source, Record, Due, Owner, Created and Updated, and has a button to open the linked record (for example <strong>Open NCR NCR-0023</strong>), or warns &ldquo;No linked record is stored on this action.&rdquo;</p>
      <h3 style={h3Style}>All sections</h3>
      <p style={pStyle}>The <strong>All sections</strong> button shows every step on one long page, as the Action Detail panel used to. Click it again to go back to one step at a time.</p>
    </>
  );
}

function SectionCreate() {
  return (
    <>
      <div style={eyebrow}>Core Workflows</div>
      <h2 style={h2Style}>Creating an Action</h2>
      <p style={pStyle}>Use the <strong>Create Action</strong> tab for any action raised by hand. You can also arrive here already filled in: when you press a create-action button from another module (for example an NCR or an AINM), the form opens with the source, record and project completed, and a message reads &ldquo;Action form prefilled from linked record. Review and save when ready.&rdquo;</p>
      <div style={mockPanel}>
        <div style={mockLabel}>Create Action</div>
        <div style={mockRow}>
          <div style={mockField()}><div style={mockFieldLabel}>Action Number</div><input style={mockInput} readOnly value="ACT-064" /></div>
          <div style={mockField()}><div style={mockFieldLabel}>Project</div><input style={mockInput} readOnly placeholder="e.g. Wadden Sea" /></div>
          <div style={mockField()}><div style={mockFieldLabel}>Department</div><input style={mockInput} readOnly placeholder="Select department" /></div>
        </div>
        <div style={mockRow}>
          <div style={mockField(2)}><div style={mockFieldLabel}>Title</div><input style={mockInput} readOnly placeholder="Enter action title" /></div>
          <div style={mockField()}><div style={mockFieldLabel}>Owner</div><input style={mockInput} readOnly placeholder="Select owner" /></div>
        </div>
        <div style={mockRow}>
          <div style={mockField()}><div style={mockFieldLabel}>Priority</div><input style={mockInput} readOnly value="Medium" /></div>
          <div style={mockField()}><div style={mockFieldLabel}>Status</div><input style={mockInput} readOnly value="Open" /></div>
          <div style={mockField()}><div style={mockFieldLabel}>Source</div><input style={mockInput} readOnly value="Manual" /></div>
          <div style={mockField()}><div style={mockFieldLabel}>Due Date</div><input style={mockInput} readOnly placeholder="dd/mm/yyyy" /></div>
        </div>
        <span style={btn("primary")}>Add Action</span>
      </div>
      <div style={stepList}>
        <Step n={1}>Go to the <strong>Create Action</strong> tab. <code style={codeStyle}>Action Number</code> is filled in for you and cannot be changed. It takes the next free number.</Step>
        <Step n={2}>Enter a <code style={codeStyle}>Title</code>. This is the only required field. Keep it short; put the detail in <code style={codeStyle}>Description</code>.</Step>
        <Step n={3}>Pick the <code style={codeStyle}>Department</code>, type the <code style={codeStyle}>Project</code>, and choose the <code style={codeStyle}>Owner</code> from the list (the list comes from People Management).</Step>
        <Step n={4}>Set <code style={codeStyle}>Priority</code> (Low, Medium, High), <code style={codeStyle}>Status</code> (Open, In Progress, Closed) and a <code style={codeStyle}>Due Date</code>.</Step>
        <Step n={5}>Choose the <code style={codeStyle}>Source</code>. If the action belongs to another record, extra fields appear so you can link it. See <strong>Linked Records &amp; Modules</strong>.</Step>
        <Step n={6}>Optionally add <code style={codeStyle}>Evidence Files (optional)</code> and <code style={codeStyle}>Evidence Notes (optional)</code>. Files upload as soon as the action has been created.</Step>
        <Step n={7}>Click <strong>Add Action</strong>. A message confirms the new action number, and the owner is emailed that the action has been assigned to them.</Step>
      </div>
      <div style={callout("warning")}>
        <span>⚠</span>
        <div>If you have view-only access the form is switched off and a message says &ldquo;Read-only access: you do not have permission to create actions.&rdquo; Ask your IMS administrator if you need create rights.</div>
      </div>
    </>
  );
}

function SectionUpdate() {
  return (
    <>
      <div style={eyebrow}>Core Workflows</div>
      <h2 style={h2Style}>Updating &amp; Closing Out</h2>
      <h3 style={h3Style}>Opening and editing an action</h3>
      <div style={stepList}>
        <Step n={1}>In the <strong>Action Register</strong>, click the action row or its <strong>Open</strong> button. The <strong>Action Detail</strong> panel opens below the table on the record screen (see The record screen).</Step>
        <Step n={2}>Change any of <code style={codeStyle}>Source</code>, <code style={codeStyle}>Department</code>, <code style={codeStyle}>Title</code>, <code style={codeStyle}>Owner</code>, <code style={codeStyle}>Project</code>, <code style={codeStyle}>Priority</code>, <code style={codeStyle}>Status</code>, <code style={codeStyle}>Due Date</code> or <code style={codeStyle}>Description</code>. <code style={codeStyle}>Raised By</code> and <code style={codeStyle}>Action Number</code> are shown for information and cannot be edited.</Step>
        <Step n={3}>Click <strong>Save Action</strong>, below the steps. The message &ldquo;Action updated successfully.&rdquo; confirms it.</Step>
        <Step n={4}>Click <strong>Hide Panel</strong> when you have finished.</Step>
      </div>
      <h3 style={h3Style}>Closing an action</h3>
      <div style={stepList}>
        <Step n={1}>Open the action. Write what was done in <code style={codeStyle}>Close-out Comments</code> (step 1 <strong>Details</strong>).</Step>
        <Step n={2}>Upload any proof in step 2 <strong>Evidence</strong> (see below).</Step>
        <Step n={3}>Click <strong>Close</strong> in the header. If the action is still Open, the button reads <strong>Mark In Progress</strong> first; click it, then click <strong>Close</strong>. You can also set <code style={codeStyle}>Status</code> to <span style={badge("closed")}>Closed</span> by hand and click <strong>Save Action</strong>.</Step>
      </div>
      <p style={pStyle}>If anything is missing (no evidence attached, or no closing note), you are asked &ldquo;N items are still missing: ... Close anyway?&rdquo; and can choose to go ahead. Closing is never blocked.</p>
      <p style={pStyle}>Once saved as Closed, the action drops out of the default register view and out of My Actions and Today. It is not lost: include closed actions whenever you need it.</p>
      <h3 style={h3Style}>Evidence</h3>
      <p style={pStyle}>Step 2 <strong>Evidence</strong> of the record screen holds the files for that action.</p>
      <div style={stepList}>
        <Step n={1}>Under <code style={codeStyle}>Select files</code>, choose one or more files. You can add an optional <code style={codeStyle}>Evidence Notes (optional)</code>.</Step>
        <Step n={2}>Click <strong>Upload Evidence</strong>.</Step>
        <Step n={3}>The file appears under <strong>Attached Files</strong> with its size, type and upload date. Click <strong>Open</strong> to view it, or <strong>Delete</strong> to remove it (you are asked to confirm).</Step>
      </div>
      <p style={pStyle}>You can upload PDF, Word, Excel, PowerPoint, CSV and text files, and photos. On a phone, files open straight from the <strong>Open</strong> button.</p>
      <h3 style={h3Style}>Who gets emailed</h3>
      <table style={imsTableStyle}>
        <thead>
          <tr>{["When", "Who is emailed"].map(h => <th key={h} style={imsTableHeadStyle}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {([
            ["An action is created with an owner, or the owner is changed", "The new owner"],
            ["The Status changes", "The person who raised the action, and the owner"],
            ["Close-out Comments are added or changed", "The person who raised the action, and the owner"],
          ] as [string, string][]).map(([a, b]) => (
            <tr key={a}>
              <td style={imsTableCellStyle}>{a}</td>
              <td style={imsTableCellStyle}>{b}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={callout("info")}>
        <span>ℹ</span>
        <div>Actions with the source <strong>AINM</strong> do not send these emails automatically, because AINM actions are often entered after the work is already done. Instead, open the action and click <strong>Send Notification</strong> when you want the owner and raiser told.</div>
      </div>
      <h3 style={h3Style}>Deleting an action</h3>
      <p style={pStyle}>Click <strong>Delete</strong> on the register row and confirm. The prompt warns that attached evidence files are not deleted automatically. Deleting cannot be undone, so close an action rather than deleting it if you may need the history.</p>
    </>
  );
}

function SectionMyActions() {
  return (
    <>
      <div style={eyebrow}>Core Workflows</div>
      <h2 style={h2Style}>My Actions &amp; Today</h2>
      <p style={pStyle}>These two tabs show only work assigned to <strong>you</strong>. The IMS matches your sign-in email to your active record in People Management. If no match is found, a message under the heading explains why and no list is shown. Ask an administrator to check that your email is on your People record.</p>
      <h3 style={h3Style}>What is included</h3>
      <p style={pStyle}>Central Actions, NCRs, Audit Findings, AINMs, Observations and MOC actions assigned to you, all in one list. The <strong>Type</strong> column tells you which kind each item is.</p>
      <div style={callout("info")}>
        <span>ℹ</span>
        <div>An action that came from a Management of Change action plan appears <strong>once</strong>, as the central Action that refers to the MOC, not twice. A MOC action that has no central Action copy in your list appears as a <strong>MOC</strong> item.</div>
      </div>
      <h3 style={h3Style}>My Actions</h3>
      <div style={mockPanel}>
        <div style={mockLabel}>My Actions</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
          {["My Total Items", "My Open Items", "My Closed Items", "My Overdue", "My Due This Week"].map((k, i) => (
            <span key={k} style={tabChip(i === 1)}>{k}</span>
          ))}
        </div>
        <div style={{ ...mockRow, alignItems: "center" }}>
          <span style={btn("primary")}>Show Closed</span>
          <span style={btn("ghost")}>Clear Filters</span>
          <span style={btn("primary")}>Export PDF</span>
          <span style={btn("ghost")}>Export Excel</span>
          <span style={btn("primary")}>Show Filters</span>
        </div>
        <table style={imsTableStyle}>
          <thead>
            <tr>
              {["Type", "Reference", "Title", "Source", "Linked Record", "Priority", "Due Date", "Status", "Action"].map(h => (
                <th key={h} style={imsTableHeadStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={imsTableCellStyle}>Action</td>
              <td style={{ ...imsTableCellStyle, fontWeight: 800, color: imsColours.brand }}>ACT-041</td>
              <td style={imsTableCellStyle}>Replace worn lifting strops</td>
              <td style={imsTableCellStyle}>Asset Inspection</td>
              <td style={imsTableCellStyle}>Inspection INS-0112</td>
              <td style={imsTableCellStyle}>High</td>
              <td style={imsTableCellStyle}>12 Dec 2026</td>
              <td style={imsTableCellStyle}><span style={badge("open")}>Open</span></td>
              <td style={imsTableCellStyle}>Open</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div style={stepList}>
        <Step n={1}>Click the <strong>My Actions</strong> tab. The five cards at the top (<strong>My Total Items</strong>, <strong>My Open Items</strong>, <strong>My Closed Items</strong>, <strong>My Overdue</strong>, <strong>My Due This Week</strong>) count your items. Click a card to filter the list below it.</Step>
        <Step n={2}>The list opens showing <strong>open items only</strong>. To see closed items too, click <strong>Show Closed</strong> (it then reads <strong>Hide Closed</strong>) or the <strong>My Total Items</strong> card. <strong>My Closed Items</strong> shows only the closed ones.</Step>
        <Step n={3}>Click <strong>Show Filters</strong> for a status filter (<code style={codeStyle}>All Status</code>, Open, Closed) and a type filter (<code style={codeStyle}>All Types</code>: Action, NCR, AINM, Observation, Audit Finding, MOC). <strong>Clear Filters</strong> returns to the default open-only view.</Step>
        <Step n={4}>Click a row (or <strong>Open</strong>). A central Action opens in the Action Register; an NCR, Audit Finding, AINM, Observation or MOC item takes you to that module&apos;s own page.</Step>
        <Step n={5}>Use <strong>Export PDF</strong> or <strong>Export Excel</strong> to download the list you are looking at. See <strong>PDF &amp; Excel Reports</strong>.</Step>
      </div>
      <h3 style={h3Style}>My Actions on a phone</h3>
      <p style={pStyle}>On a phone, My Actions shows one card per item instead of the table, with overdue items first. Each card shows the type, number, status, title, project and due date, and these buttons: <strong>Start</strong> (moves an Open action to In Progress), <strong>Close</strong>, <strong>Add evidence</strong> (opens the action on its Evidence step) and <strong>Open</strong>. Start, Close and Add evidence appear for central Actions only; an NCR, Audit Finding, AINM, Observation or MOC item has just <strong>Open</strong>. <strong>Close</strong> asks &ldquo;Close anyway?&rdquo; if evidence or a closing note is missing. Long lists show 25 cards, then a <strong>Show more</strong> button.</p>
      <h3 style={h3Style}>Today</h3>
      <p style={pStyle}>The <strong>Today</strong> tab shows your open items in four buckets, most urgent first: <strong>Overdue</strong>, <strong>Due Today</strong>, <strong>Due This Week</strong> and <strong>Later</strong> (the card for this reads <strong>Later / No Date</strong>). Closed items are not shown here. Items with no due date, such as AINMs and Observations, appear under Later.</p>
      <h3 style={h3Style}>Overdue / Priority</h3>
      <p style={pStyle}>This tab (headed <strong>Priority View</strong>, &ldquo;What needs chasing right now&rdquo;) shows three lists for the whole register, not just you: <strong>Overdue First</strong>, <strong>Due This Week</strong> and <strong>High Priority Open</strong>. Use it for a quick chase list in team meetings.</p>
    </>
  );
}

function SectionBulk() {
  return (
    <>
      <div style={eyebrow}>Core Workflows</div>
      <h2 style={h2Style}>Bulk Upload</h2>
      <p style={pStyle}>Use <strong>Bulk Upload</strong> when you already have actions in an Excel tracker and want to bring them into the central register in one go.</p>
      <div style={stepList}>
        <Step n={1}>Open the <strong>Bulk Upload</strong> tab and choose your <code style={codeStyle}>.xlsx</code> file. Only the first sheet is read, and it must have a header row.</Step>
        <Step n={2}>Check the preview table. Each row shows an <strong>Import Status</strong>: <strong>Ready</strong>, or the reason it needs attention (for example &ldquo;Title/Action is required.&rdquo; or &ldquo;Duplicate action in uploaded file.&rdquo;). A summary says how many rows are ready and how many are skipped.</Step>
        <Step n={3}>Click <strong>Import N Actions</strong>. Only the ready rows are imported, each getting the next free action number.</Step>
        <Step n={4}>To start again, click <strong>Clear Preview</strong>.</Step>
      </div>
      <h3 style={h3Style}>Column headings it understands</h3>
      <table style={imsTableStyle}>
        <thead>
          <tr>{["Information", "Accepted column headings"].map(h => <th key={h} style={imsTableHeadStyle}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {([
            ["Title (required)", "Title, Action Title, Action, Action Required"],
            ["Description", "Description, Action Description, Details (Comments / Notes are added to the description)"],
            ["Department", "Department, Allocation, Action Department, Function"],
            ["Project", "Project, Project / Work Scope, Work Scope"],
            ["Owner", "Owner, Assigned, Assigned To, Action Owner, Responsible Person"],
            ["Priority", "Priority (Low, Medium or High)"],
            ["Status", "Status"],
            ["Due date", "Due Date, Target Date, Target Response Date"],
            ["Source", "Source, Source Type, Module"],
            ["Linked record", "Linked Record, Linked Reference, AINM No, Inspection No, NCR No, MOC No"],
          ] as [string, string][]).map(([a, b]) => (
            <tr key={a}>
              <td style={{ ...imsTableCellStyle, fontWeight: 800 }}>{a}</td>
              <td style={imsTableCellStyle}>{b}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={callout("warning")}>
        <span>⚠</span>
        <div>Anything left blank or not recognised falls back to a default: Department <strong>HSE</strong>, Source <strong>HSE</strong>, Priority <strong>Medium</strong>, Status <strong>Open</strong>. If an owner is not yet in People Management, the preview says &ldquo;Will add to People Management&rdquo; and importing creates a new person for them (the owner needs a first name and surname). Check the Owner column carefully before importing.</div>
      </div>
    </>
  );
}

function SectionLinked() {
  return (
    <>
      <div style={eyebrow}>Linked Records</div>
      <h2 style={h2Style}>Linked Records &amp; Modules</h2>
      <p style={pStyle}>An action&apos;s <strong>Source</strong> says where it came from. Choosing a source on the Create Action form (or on an existing action) reveals the field you need to point it at the actual record:</p>
      <table style={imsTableStyle}>
        <thead>
          <tr>{["Source", "Field to complete"].map(h => <th key={h} style={imsTableHeadStyle}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {([
            ["Audit Finding", "Audit Number, then Finding Reference (choose the audit first)"],
            ["Audit", "The same Audit Number and Finding Reference fields as Audit Finding. With no finding, the source shows as Audit"],
            ["Asset Inspection", "Linked Asset, then Inspection Record"],
            ["Asset Maintenance", "Linked Asset, then Maintenance Record"],
            ["Asset Calibration", "Linked Asset, then Calibration Record"],
            ["NCR/CAPA", "NCR / CAPA Record"],
            ["MOC", "MOC Record"],
            ["AINM", "AINM Record"],
            ["HSE Inspection", "HSE Inspection Record"],
            ["Observation", "Observation Record"],
            ["Manual, Risk, HSE, Other", "No linked-record field to pick"],
          ] as [string, string][]).map(([a, b]) => (
            <tr key={a}>
              <td style={{ ...imsTableCellStyle, fontWeight: 800, whiteSpace: "nowrap" }}>{a}</td>
              <td style={imsTableCellStyle}>{b}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h3 style={h3Style}>What you see on the register</h3>
      <p style={pStyle}>The <strong>Source</strong> and <strong>Linked Record</strong> columns show coloured tags such as <code style={codeStyle}>NCR NCR-0023</code> or <code style={codeStyle}>MOC 014</code>. If an action&apos;s source normally has a linked record but none is stored, the tag reads <code style={codeStyle}>Missing linked record</code> (amber). The Dashboard card <strong>Link issues</strong> counts these, and clicking it lists them so you can fix them.</p>
      <p style={pStyle}>An action with the source <strong>Audit</strong> that has no linked finding shows as <strong>Audit</strong> in the Source column (it used to show as Other), and its linked-record tag shows the audit number and opens that audit when the audit is known. The stored source value is not changed.</p>
      <p style={pStyle}>In step 3 <strong>Linked record</strong> of the record screen, a <strong>Linked Record Intelligence</strong> box repeats the links and gives shortcuts back to the record: <strong>Open Linked Audit</strong>, <strong>Open Linked Inspection Log</strong>, <strong>Open Linked Maintenance Log</strong>, <strong>Open Linked Calibration Log</strong>, <strong>Open Linked NCR</strong>, <strong>Open Linked AINM</strong>, <strong>Open Linked HSE Inspection</strong> and <strong>Open Linked Observation</strong>. For AINM actions there is also a <strong>← Back to AINM</strong> button.</p>
      <h3 style={h3Style}>Module action views</h3>
      <p style={pStyle}>Some modules have their own Actions page that shows the central register filtered to their department:</p>
      <div style={stepList}>
        <Step n={1}><strong>HSE Actions</strong> shows actions with department HSE.</Step>
        <Step n={2}><strong>Quality Actions</strong> shows actions with department Quality.</Step>
        <Step n={3}><strong>Asset Actions</strong> shows actions with department Assets.</Step>
      </div>
      <p style={pStyle}>Each has Dashboard, Register and Create views, and actions made there are saved into the same central register with that department already set. Use <strong>Open Central Actions</strong> to jump to the full register, or <strong>Open Central</strong> on a row to open that one action in it.</p>
      <p style={pStyle}>On HSE Actions and Quality Actions, clicking a row shows the same record screen, but read-only: you can look at the details, evidence and linked record, but changes are made in Central Actions. The next-step button opens the action there. On Quality Actions it reads <strong>Mark In Progress</strong> or <strong>Close</strong>; on HSE Actions it reads <strong>Start in Central Actions</strong> or <strong>Close in Central Actions</strong>, with <strong>Open / Edit in Central Actions</strong> beside it.</p>
      <div style={callout("info")}>
        <span>ℹ</span>
        <div><strong>Risk</strong> is still a valid Source on an action, so actions already logged against it stay in the central register and can be found with the All Sources filter.</div>
      </div>
    </>
  );
}

function SectionReports() {
  return (
    <>
      <div style={eyebrow}>Reports</div>
      <h2 style={h2Style}>PDF &amp; Excel Reports</h2>
      <h3 style={h3Style}>From the Action Register</h3>
      <div style={stepList}>
        <Step n={1}>Set up the register to show exactly the actions you want: search, filters, and the <strong>Show Closed</strong> / <strong>Hide Closed</strong> button.</Step>
        <Step n={2}>Find <strong>Export PDF</strong> and <strong>Export Excel</strong> in the toolbar above the register. They do not need the filters panel to be open.</Step>
        <Step n={3}>Click <strong>Export PDF</strong> or <strong>Export Excel</strong>. The file downloads straight away. Both are greyed out when no actions are showing.</Step>
      </div>
      <p style={pStyle}>The report contains <strong>only the actions currently listed</strong>, so a closed action will be in your report only if you chose to include closed actions. The PDF is a landscape A4 table (Action No., Title, Department, Source, Linked Record, Owner, Priority, Due Date, Status) with overdue dates highlighted. The Excel workbook has the same rows with a line saying which filters were applied, and adds Description, Project, an Overdue column and <strong>Close-out Comments</strong>.</p>
      <h3 style={h3Style}>From My Actions</h3>
      <p style={pStyle}>On the <strong>My Actions</strong> tab, <strong>Export PDF</strong> and <strong>Export Excel</strong> sit in the toolbar next to <strong>Clear Filters</strong>. They report the items currently shown for you, whether that is open items only or everything you chose to show, and the report header records what was showing and for whom.</p>
      <div style={callout("info")}>
        <span>ℹ</span>
        <div>If nothing matches your filters, no file is produced and the status message says there are no items available for export. Widen your filters and try again.</div>
      </div>
    </>
  );
}

function SectionStatuses() {
  return (
    <>
      <div style={eyebrow}>Reference</div>
      <h2 style={h2Style}>Status Reference</h2>
      <h3 style={h3Style}>Action status</h3>
      <table style={imsTableStyle}>
        <thead>
          <tr>{["Status", "Meaning", "Shown by default?"].map(h => <th key={h} style={imsTableHeadStyle}>{h}</th>)}</tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ ...imsTableCellStyle, whiteSpace: "nowrap" }}><span style={badge("open")}>Open</span></td>
            <td style={imsTableCellStyle}>Raised and waiting to be started.</td>
            <td style={imsTableCellStyle}>Yes</td>
          </tr>
          <tr>
            <td style={{ ...imsTableCellStyle, whiteSpace: "nowrap" }}><span style={badge("in progress")}>In Progress</span></td>
            <td style={imsTableCellStyle}>Work is under way.</td>
            <td style={imsTableCellStyle}>Yes</td>
          </tr>
          <tr>
            <td style={{ ...imsTableCellStyle, whiteSpace: "nowrap" }}><span style={badge("closed")}>Closed</span></td>
            <td style={imsTableCellStyle}>Done. Add Close-out Comments and evidence.</td>
            <td style={imsTableCellStyle}>No. Press <strong>Show Closed</strong> (register and My Actions).</td>
          </tr>
        </tbody>
      </table>
      <h3 style={h3Style}>Priority</h3>
      <p style={pStyle}><strong>Low</strong>, <strong>Medium</strong> (the default) and <strong>High</strong>. <strong>High Priority Open</strong> on the Overdue / Priority tab lists High actions that are not closed.</p>
      <h3 style={h3Style}>Due date labels</h3>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        <span style={badge("overdue")}>3 days overdue</span>
        <span style={badge("in progress")}>Due today</span>
        <span style={badge("neutral")}>Due tomorrow</span>
        <span style={badge("neutral")}>Due in 12 days</span>
      </div>
      <p style={pStyle}>An action is <strong>overdue</strong> when its due date has passed and it is not closed. An action with no due date is never overdue; the Dashboard counts it under <strong>No Due Date</strong> in Due Date Pressure.</p>
      <h3 style={h3Style}>Buttons at a glance</h3>
      <table style={imsTableStyle}>
        <thead>
          <tr>{["Button", "What it does"].map(h => <th key={h} style={imsTableHeadStyle}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {([
            ["Show Filters / Hide Filters", "Opens or closes the filter bar"],
            ["Clear Filters", "Removes every filter and returns to open actions only"],
            ["Show Closed / Hide Closed", "Includes or hides closed actions (register) or closed items (My Actions)"],
            ["Export PDF / Export Excel", "Downloads the list you are looking at"],
            ["Mark In Progress / Close", "Header of the record screen: moves the action to its next status"],
            ["Start / Close / Add evidence", "My Actions cards on a phone"],
            ["Add Action", "Saves a new action (Create Action tab)"],
            ["Save Action", "Saves changes to the open action"],
            ["Upload Evidence", "Attaches the chosen files to the open action"],
            ["Send Notification", "AINM actions only: emails the owner and raiser"],
            ["Hide Panel", "Closes the Action Detail panel"],
            ["All sections", "Record screen: shows every step on one long page"],
          ] as [string, string][]).map(([a, b]) => (
            <tr key={a}>
              <td style={{ ...imsTableCellStyle, fontWeight: 800 }}>{a}</td>
              <td style={imsTableCellStyle}>{b}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function SectionFaq() {
  const qa: [string, string][] = [
    ["I cannot see an action I know exists.", "It is probably closed. Closed actions are hidden by default. Press Show Closed, or search by the action number. Also check that no other filter is on, or press Clear Filters."],
    ["My Actions is empty or shows a message instead of a list.", "Your sign-in email has to match an active record in People Management. Ask an administrator to check your People record. Also remember closed items are hidden until you press Show Closed."],
    ["Why does a MOC action show only once?", "Every MOC action is also copied into the central register. If that central Action is already in your list, the MOC row is left out so you do not see it twice."],
    ["Can I change an action's number?", "No. Action Number is read-only and is allocated automatically, using the next free number."],
    ["Who can create, edit or delete actions?", "Only people with create or edit rights. Everyone else sees a \"Read-only access\" message and the buttons are disabled."],
    ["Why did the owner not get an email for my AINM action?", "AINM actions do not send automatic emails. Open the action and click Send Notification."],
    ["I deleted an action. Are its files gone?", "No. Deleting the action does not delete its evidence files. Delete each file with Delete under Attached Files first if you want them removed."],
    ["Can I upload a photo or an Excel file as evidence?", "Yes. Evidence accepts PDF, Word, Excel, PowerPoint, CSV, text and photos, and the files open on phones as well."],
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
  register:  SectionRegister,
  recordscreen: SectionRecordScreen,
  create:    SectionCreate,
  update:    SectionUpdate,
  myactions: SectionMyActions,
  bulk:      SectionBulk,
  linked:    SectionLinked,
  reports:   SectionReports,
  statuses:  SectionStatuses,
  faq:       SectionFaq,
};

export const actionsGuide: GuideDefinition = {
  id: "actions",
  navLabel: "Actions",
  guideLabel: "Action Management",
  defaultSection: "overview",
  sections,
  sectionComponents,
};
