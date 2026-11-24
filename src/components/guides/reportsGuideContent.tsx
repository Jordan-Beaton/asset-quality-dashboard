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
  | "overview" | "quality" | "hseassets" | "project"
  | "calendars" | "qualitydash" | "hsedash" | "faq";

const sections: GuideSectionDef[] = [
  { key: "overview",    label: "Overview",                      group: "Getting Started" },
  { key: "quality",     label: "Monthly Management Report",     group: "Reports" },
  { key: "hseassets",   label: "HSE & Asset Monthly Reports",   group: "Reports" },
  { key: "project",     label: "Project Reports",               group: "Reports" },
  { key: "calendars",   label: "Quality & HSE Calendars",       group: "Calendars" },
  { key: "qualitydash", label: "Quality Dashboard",             group: "Dashboards" },
  { key: "hsedash",     label: "HSE Dashboard",                 group: "Dashboards" },
  { key: "faq",         label: "Common Questions",              group: "Reference" },
];

// ── Small mock helpers (visual only) ──────────────────────────────────────────

const tileGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
  gap: 8,
  margin: "10px 0",
};

function Tile({ title, value, accent }: { title: string; value: string; accent: string }) {
  return (
    <div style={{ background: "#fff", border: `1px solid ${imsColours.border}`, borderTop: `3px solid ${accent}`, borderRadius: 10, padding: "9px 11px" }}>
      <div style={{ fontSize: 10, fontWeight: 800, color: imsColours.muted, textTransform: "uppercase", letterSpacing: "0.05em" }}>{title}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color: imsColours.ink, marginTop: 2 }}>{value}</div>
    </div>
  );
}

const tabRow: CSSProperties = { display: "flex", gap: 6, flexWrap: "wrap", margin: "0 0 10px" };
const tabPill = (active?: boolean): CSSProperties => ({
  background: active ? imsColours.brand : "#fff",
  color: active ? "#fff" : imsColours.ink,
  border: `1px solid ${active ? imsColours.brand : imsColours.border}`,
  borderRadius: 8,
  padding: "5px 11px",
  fontSize: 11,
  fontWeight: 700,
});

const twoCol: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: 14,
  margin: "16px 0",
};

const bullets: CSSProperties = { ...pStyle, paddingLeft: 20 };

function tdBold(extra?: CSSProperties): CSSProperties {
  return { ...imsTableCellStyle, fontWeight: 800, ...extra };
}

// ── Sections ──────────────────────────────────────────────────────────────────

function SectionOverview() {
  return (
    <>
      <div style={eyebrow}>Getting Started</div>
      <h2 style={h2Style}>Reports, Calendars &amp; Dashboards</h2>
      <p style={pStyle}>
        This guide covers the pages managers use to see how the IMS is performing and what is coming up: the <strong>monthly management reports</strong>, the <strong>project reports</strong>, the <strong>Quality and HSE calendars</strong>, and the <strong>Quality and HSE dashboards</strong>. All of them are built from live IMS records, so there is nothing to re-type.
      </p>

      <h3 style={h3Style}>Where to find each page</h3>
      <table style={imsTableStyle}>
        <thead>
          <tr>
            {["Page", "Find it", "What it gives you"].map(h => <th key={h} style={imsTableHeadStyle}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={tdBold()}>Reports (Quality)</td>
            <td style={imsTableCellStyle}>Quality menu &rarr; <strong>Reports</strong></td>
            <td style={imsTableCellStyle}>Monthly management report (audits, actions, MOC, NCR, CAPA, documents) as a PDF.</td>
          </tr>
          <tr>
            <td style={tdBold()}>Project Reports</td>
            <td style={imsTableCellStyle}><strong>Project Reports</strong> tab on the Reports page</td>
            <td style={imsTableCellStyle}>Wadden Sea monthly annexes as Word or PDF.</td>
          </tr>
          <tr>
            <td style={tdBold()}>HSE Reports</td>
            <td style={imsTableCellStyle}>HSE menu &rarr; <strong>Reports</strong></td>
            <td style={imsTableCellStyle}>Monthly HSE management report as a PDF.</td>
          </tr>
          <tr>
            <td style={tdBold()}>Asset Reports</td>
            <td style={imsTableCellStyle}>Assets menu &rarr; <strong>Reports</strong></td>
            <td style={imsTableCellStyle}>Monthly asset management report as a PDF.</td>
          </tr>
          <tr>
            <td style={tdBold()}>Quality Calendar</td>
            <td style={imsTableCellStyle}>Quality menu &rarr; <strong>Calendar</strong></td>
            <td style={imsTableCellStyle}>Audit, NCR, finding and action dates, plus holidays and events.</td>
          </tr>
          <tr>
            <td style={tdBold()}>HSE Calendar</td>
            <td style={imsTableCellStyle}>HSE menu &rarr; <strong>Calendar</strong></td>
            <td style={imsTableCellStyle}>AINMs, inspections, observations, HSE action dates and planner items.</td>
          </tr>
          <tr>
            <td style={tdBold()}>Quality Dashboard</td>
            <td style={imsTableCellStyle}>Quality menu &rarr; <strong>Dashboard</strong></td>
            <td style={imsTableCellStyle}>Control score, pressure points and charts for NCRs, audits, MOCs, documents and actions.</td>
          </tr>
          <tr>
            <td style={tdBold()}>HSE Dashboard</td>
            <td style={imsTableCellStyle}>HSE menu &rarr; <strong>Dashboard</strong></td>
            <td style={imsTableCellStyle}>HSE control picture across AINMs, inspections, actions and calendar.</td>
          </tr>
        </tbody>
      </table>

      <div style={callout("info")}>
        <span>ℹ</span>
        <div>Nearly every number and tile is a link. Tapping or clicking it opens the underlying register with a filter already applied, so you land on the exact records behind the number.</div>
      </div>
    </>
  );
}

function SectionQuality() {
  return (
    <>
      <div style={eyebrow}>Reports</div>
      <h2 style={h2Style}>Monthly Management Report</h2>
      <p style={pStyle}>
        The <strong>Reports</strong> page under Quality produces a concise monthly management pack. It shows live figures for the month you choose and turns them into a PDF. It has two tabs along the top: <strong>Monthly Reports</strong> and <strong>Project Reports</strong>.
      </p>

      <div style={mockPanel}>
        <div style={{ ...mockHero, marginTop: 0 }}>
          <div style={mockHeroEyebrow}>Management Reporting</div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>Reports</div>
        </div>
        <div style={tabRow}>
          <span style={tabPill(true)}>Monthly Reports</span>
          <span style={tabPill()}>Project Reports</span>
        </div>
        <div style={mockLabel}>Create Monthly Management Report</div>
        <div style={mockRow}>
          <div style={mockField()}><div style={mockFieldLabel}>Month</div><div style={mockInput}>Choose month</div></div>
          <div style={mockField()}><div style={mockFieldLabel}>Year</div><div style={mockInput}>Year</div></div>
        </div>
        <div style={mockFieldLabel}>Executive Summary</div>
        <div style={{ ...mockInput, minHeight: 36, marginBottom: 10 }}>Optional short management summary for this month.</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span style={btn("primary")}>Save Monthly Report</span>
          <span style={btn("ghost")}>Draft Executive Summary with AI</span>
          <span style={btn("ghost")}>Generate Monthly PDF</span>
        </div>
      </div>

      <h3 style={h3Style}>Producing a report</h3>
      <div style={stepList}>
        <Step n={1}>Choose the <code style={codeStyle}>Month</code> and <code style={codeStyle}>Year</code>. The <strong>Report Period</strong> line confirms what you picked.</Step>
        <Step n={2}>Check the <strong>Management Snapshot</strong> on the right. These are the live figures that will go into the PDF (see the table below).</Step>
        <Step n={3}>Optionally write an <code style={codeStyle}>Executive Summary</code> and a <code style={codeStyle}>Next Month Focus / Planned Activity</code>. Tap <strong>Draft Executive Summary with AI</strong> if you want a first draft written for you from the figures &mdash; read and edit it before using it. If the box already has text, you are asked before it is replaced.</Step>
        <Step n={4}>Tap <strong>Generate Monthly PDF</strong> to create the PDF straight away, or <strong>Save Monthly Report</strong> to keep the period and your wording in the list below.</Step>
      </div>

      <h3 style={h3Style}>What the Management Snapshot contains</h3>
      <table style={imsTableStyle}>
        <thead>
          <tr>
            {["Block", "Figures shown"].map(h => <th key={h} style={imsTableHeadStyle}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          <tr><td style={tdBold()}>A. Audit Summary</td><td style={imsTableCellStyle}>Audits completed in month, Major findings, Minor findings, OFI / Observation. A small note under the card explains how findings are counted.</td></tr>
          <tr><td style={tdBold()}>B. Actions</td><td style={imsTableCellStyle}>Actions raised in month, Actions closed in month, Total open actions, Due in next 30 days.</td></tr>
          <tr><td style={tdBold()}>C. MOC</td><td style={imsTableCellStyle}>MOCs raised in month, MOCs closed in month, Total open MOCs.</td></tr>
          <tr><td style={tdBold()}>D. NCR</td><td style={imsTableCellStyle}>NCRs raised and closed in month, Total open NCRs, open NCRs by severity (Low, Medium, High), and a root cause breakdown.</td></tr>
          <tr><td style={tdBold()}>E. CAPA</td><td style={imsTableCellStyle}>CAPAs raised in month, Total open CAPAs, CAPAs awaiting effectiveness review, and effectiveness status (Pending, Effective, Not Effective).</td></tr>
          <tr><td style={tdBold()}>F. Documents</td><td style={imsTableCellStyle}>Overdue documents, Documents due soon.</td></tr>
        </tbody>
      </table>

      <h3 style={h3Style}>Saved Monthly Reports</h3>
      <p style={pStyle}>
        Saved reports appear in the <strong>Saved Monthly Reports</strong> table with the month, a short snapshot summary and when it was created. Use <strong>Search saved reports</strong> and the <strong>Show Filters</strong> button (year filter, <strong>Clear Filters</strong>) to find one. On each row:
      </p>
      <ul style={bullets}>
        <li><strong>PDF</strong> &mdash; generates the PDF for that saved month and your saved wording.</li>
        <li><strong>Edit</strong> &mdash; loads it back into the form; change it and tap <strong>Update Monthly Report</strong> (or <strong>Cancel Edit</strong>).</li>
        <li><strong>Delete</strong> &mdash; removes the saved report.</li>
      </ul>
      <div style={callout("warning")}>
        <span>⚠</span>
        <div>Saving and editing need create and edit permission on the Reports area. If you only have read access, the buttons are blocked and a message says so. A saved Quality report&apos;s PDF is worked out again from the current records for that month, so figures can move if records have changed since you saved it.</div>
      </div>
    </>
  );
}

function SectionHseAssets() {
  return (
    <>
      <div style={eyebrow}>Reports</div>
      <h2 style={h2Style}>HSE &amp; Asset Monthly Reports</h2>
      <p style={pStyle}>
        The <strong>HSE Reports</strong> and <strong>Asset Reports</strong> pages work the same way as the Quality report: choose a <code style={codeStyle}>Month</code> and <code style={codeStyle}>Year</code>, review the <strong>Management Snapshot</strong>, add an optional <code style={codeStyle}>Executive Summary</code> and <code style={codeStyle}>Next Month Focus / Planned Activity</code>, then use <strong>Save Monthly Report</strong> and <strong>Generate Monthly PDF</strong>. Saved reports are listed under <strong>Saved Monthly Reports</strong>.
      </p>

      <div style={twoCol}>
        <div>
          <h3 style={{ ...h3Style, marginTop: 0 }}>HSE report blocks</h3>
          <table style={imsTableStyle}>
            <thead><tr><th style={imsTableHeadStyle}>Block</th><th style={imsTableHeadStyle}>Figures</th></tr></thead>
            <tbody>
              <tr><td style={tdBold()}>A. AINM Summary</td><td style={imsTableCellStyle}>AINMs raised, Incidents, Accidents, Total open AINMs.</td></tr>
              <tr><td style={tdBold()}>B. AINM Workflow</td><td style={imsTableCellStyle}>Raised and still open, Raised and now closed, AINMs closed in month.</td></tr>
              <tr><td style={tdBold()}>C. HSE Actions</td><td style={imsTableCellStyle}>Actions raised, Open, Overdue, Due in next 30 days.</td></tr>
              <tr><td style={tdBold()}>D. Inspections</td><td style={imsTableCellStyle}>Completed in month, Open, Total inspection records, and whether open items remain.</td></tr>
              <tr><td style={tdBold()}>E. Observations</td><td style={imsTableCellStyle}>Observations raised, split by contractor / client, employee and visitor.</td></tr>
              <tr><td style={tdBold()}>F. Reports</td><td style={imsTableCellStyle}>Reports generated in month, total generated report files, compiled AINM packs.</td></tr>
            </tbody>
          </table>
        </div>
        <div>
          <h3 style={{ ...h3Style, marginTop: 0 }}>Asset report blocks</h3>
          <table style={imsTableStyle}>
            <thead><tr><th style={imsTableHeadStyle}>Block</th><th style={imsTableHeadStyle}>Figures</th></tr></thead>
            <tbody>
              <tr><td style={tdBold()}>A. Assets</td><td style={imsTableCellStyle}>Total assets, Active assets, Inactive / out of service.</td></tr>
              <tr><td style={tdBold()}>B. Calibration</td><td style={imsTableCellStyle}>Due this month, Overdue calibration, Completed this month.</td></tr>
              <tr><td style={tdBold()}>C. Inspection</td><td style={imsTableCellStyle}>Completed this month, Overdue, Due soon (30 days), Failed / attention required.</td></tr>
              <tr><td style={tdBold()}>D. Maintenance</td><td style={imsTableCellStyle}>Completed this month, Overdue, Due soon (30 days), Action required.</td></tr>
              <tr><td style={tdBold()}>E. Linked Actions</td><td style={imsTableCellStyle}>Open linked asset actions, Overdue linked asset actions.</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <h3 style={h3Style}>Differences to be aware of</h3>
      <ul style={bullets}>
        <li><strong>HSE:</strong> has the <strong>Draft Executive Summary with AI</strong> button, like Quality. A saved HSE report keeps the figures as they were when you saved it, and its PDF uses that saved snapshot.</li>
        <li><strong>Assets:</strong> there is no AI draft button. If you leave the Executive Summary blank, the PDF creates a summary from the figures for you. Saved Asset PDFs are worked out again from current records for that month.</li>
        <li><strong>Reports on a phone:</strong> the PDF opens in a new tab where the browser allows it, otherwise it is saved. See the <em>Using the IMS on a Phone</em> guide.</li>
      </ul>
    </>
  );
}

function SectionProject() {
  return (
    <>
      <div style={eyebrow}>Reports</div>
      <h2 style={h2Style}>Project Reports</h2>
      <p style={pStyle}>
        <strong>Project Reports</strong> creates the monthly annexes for the <strong>Wadden Sea</strong> project from the IMS registers, so nobody has to keep a separate tracker. Open it from the <strong>Project Reports</strong> tab on the Reports page, or from the project&apos;s own Reports tab.
      </p>

      <div style={mockPanel}>
        <div style={mockLabel}>Project Reports &mdash; annex tabs and tiles</div>
        <div style={tabRow}>
          <span style={tabPill(true)}>Audit NCR Report</span>
          <span style={tabPill()}>Audit Programme</span>
          <span style={tabPill()}>8-Week Lookahead</span>
          <span style={tabPill()}>Open Points</span>
          <span style={tabPill()}>MOC Register</span>
        </div>
        <div style={tileGrid}>
          <Tile title="Programme Audits" value="n" accent={imsColours.brandAccent} />
          <Tile title="Audit Findings" value="n" accent={imsColours.muted} />
          <Tile title="NOI Requirements" value="n" accent={imsColours.brand} />
          <Tile title="In Eight Weeks" value="n" accent={imsColours.warning} />
          <Tile title="Hold Points" value="n" accent={imsColours.danger} />
          <Tile title="NOI Outstanding" value="n" accent={imsColours.warning} />
        </div>
      </div>

      <h3 style={h3Style}>What the tiles open</h3>
      <table style={imsTableStyle}>
        <thead>
          <tr>{["Tile", "Taking you to"].map(h => <th key={h} style={imsTableHeadStyle}>{h}</th>)}</tr>
        </thead>
        <tbody>
          <tr><td style={tdBold()}>Programme Audits</td><td style={imsTableCellStyle}>The <strong>Audit Programme</strong> tab.</td></tr>
          <tr><td style={tdBold()}>Audit Findings</td><td style={imsTableCellStyle}>The <strong>Audit NCR Report</strong> tab.</td></tr>
          <tr><td style={tdBold()}>NOI Requirements</td><td style={imsTableCellStyle}>The project&apos;s <strong>NOI</strong> page.</td></tr>
          <tr><td style={tdBold()}>In Eight Weeks, Hold Points, NOI Outstanding</td><td style={imsTableCellStyle}>The <strong>8-Week Lookahead</strong> tab.</td></tr>
        </tbody>
      </table>

      <h3 style={h3Style}>Audit NCR Report and Audit Programme annexes</h3>
      <div style={stepList}>
        <Step n={1}>Choose the <strong>Audit NCR Report</strong> or <strong>Audit Programme</strong> tab.</Step>
        <Step n={2}>Use the search box and filters to narrow the live audit register, then <strong>tick only the records that apply to the project</strong>. Records hidden by a filter are not exported.</Step>
        <Step n={3}>Tap <strong>Generate Word</strong> or <strong>Generate PDF</strong>. Both buttons stay greyed out until at least one record is ticked.</Step>
      </div>

      <h3 style={h3Style}>8-Week Lookahead annex</h3>
      <div style={stepList}>
        <Step n={1}>Set the <code style={codeStyle}>Reporting date</code>. The page shows <strong>Week 1</strong> (week commencing) and <strong>Week 8 ends</strong> for that window.</Step>
        <Step n={2}>The live Project NOI register is the main source (the <strong>Primary source</strong> card). If you also keep an Excel tracker, add it with <strong>Add Excel Tracker</strong> (.xlsx or .xls); it is treated as a secondary source for extra activities.</Step>
        <Step n={3}>Check the <strong>Unresolved dates</strong> card &mdash; tap it to review rows where a date could not be read.</Step>
        <Step n={4}>Review the <strong>Upcoming Inspection Calendar</strong> (Upcoming, Hold points, Witness points, NOI outstanding), tick the activities to include, and use <strong>Annex Preview</strong> to <strong>Generate Word</strong> or <strong>Generate PDF</strong>.</Step>
      </div>
      <p style={pStyle}>
        The <strong>Open Points</strong> and <strong>MOC Register</strong> tabs show those project registers inside the same Project Reports page.
      </p>
    </>
  );
}

function SectionCalendars() {
  const quality: [string, string][] = [
    ["NCR", "NCR due dates and closed dates"],
    ["Audit", "Audit dates"],
    ["Audit Finding", "Finding due dates and closure dates"],
    ["Quality Action", "Due dates of Quality actions"],
    ["Holidays / Events", "Items you add yourself: Holiday, Event, Training, Meeting, Reminder"],
  ];
  const hse: [string, string][] = [
    ["AINM", "The event date of each AINM"],
    ["Inspection", "Inspection dates"],
    ["Observation", "Observation dates"],
    ["HSE Action", "Due dates of actions in the HSE department"],
    ["Planner Items", "Items you add yourself: holidays, events, training, meetings, reminders and planned HSE work (Inspection, HSE Check, Review, Drill, Other)"],
  ];
  return (
    <>
      <div style={eyebrow}>Calendars</div>
      <h2 style={h2Style}>Quality &amp; HSE Calendars</h2>
      <p style={pStyle}>
        Both calendars pull dates automatically from the IMS records, so a due date or event date set in a register appears here without any extra work. You can also add your own items. Each calendar has four tabs: <strong>Dashboard</strong>, <strong>Calendar</strong>, <strong>Register</strong> and <strong>Create Event</strong>.
      </p>

      <div style={twoCol}>
        <div>
          <h3 style={{ ...h3Style, marginTop: 0 }}>Quality Calendar shows</h3>
          <table style={imsTableStyle}>
            <thead><tr><th style={imsTableHeadStyle}>Type</th><th style={imsTableHeadStyle}>Dates from</th></tr></thead>
            <tbody>{quality.map(([a, b]) => <tr key={a}><td style={tdBold()}>{a}</td><td style={imsTableCellStyle}>{b}</td></tr>)}</tbody>
          </table>
        </div>
        <div>
          <h3 style={{ ...h3Style, marginTop: 0 }}>HSE Calendar shows</h3>
          <table style={imsTableStyle}>
            <thead><tr><th style={imsTableHeadStyle}>Type</th><th style={imsTableHeadStyle}>Dates from</th></tr></thead>
            <tbody>{hse.map(([a, b]) => <tr key={a}><td style={tdBold()}>{a}</td><td style={imsTableCellStyle}>{b}</td></tr>)}</tbody>
          </table>
        </div>
      </div>

      <h3 style={h3Style}>The four tabs</h3>
      <div style={stepList}>
        <Step n={1}><strong>Dashboard</strong> &mdash; a row of tiles, then <strong>Upcoming</strong> dates (next 30 days, not yet closed) and <strong>Management Attention</strong> (overdue items). Tap a tile to jump to the <strong>Register</strong> filtered to that type.</Step>
        <Step n={2}><strong>Calendar</strong> &mdash; a month view with <strong>Previous</strong> and <strong>Next</strong>. Tap a day to list everything on it; tap <strong>+ Add Item</strong> (or the plus on a day) to create something for that date.</Step>
        <Step n={3}><strong>Register</strong> &mdash; a searchable list with <strong>Type</strong>, <strong>Status</strong> and <strong>Owner</strong> filters. Tap a row to open its detail panel underneath.</Step>
        <Step n={4}><strong>Create Event</strong> &mdash; add a calendar or planner item of your own (Title, Event Type, Assigned To, dates, Status, Priority, Location, Description).</Step>
      </div>

      <h3 style={h3Style}>The tiles and where they click through</h3>
      <table style={imsTableStyle}>
        <thead>
          <tr>{["Calendar", "Tile", "Opens the Register filtered to"].map(h => <th key={h} style={imsTableHeadStyle}>{h}</th>)}</tr>
        </thead>
        <tbody>
          <tr><td style={imsTableCellStyle}>Quality</td><td style={tdBold()}>Audit Dates</td><td style={imsTableCellStyle}>Type: Audit</td></tr>
          <tr><td style={imsTableCellStyle}>Quality</td><td style={tdBold()}>NCR Dates</td><td style={imsTableCellStyle}>Type: NCR</td></tr>
          <tr><td style={imsTableCellStyle}>Quality</td><td style={tdBold()}>Audit Findings</td><td style={imsTableCellStyle}>Type: Audit Finding</td></tr>
          <tr><td style={imsTableCellStyle}>Quality</td><td style={tdBold()}>Open Actions</td><td style={imsTableCellStyle}>Type: Quality Action (open ones are counted)</td></tr>
          <tr><td style={imsTableCellStyle}>Quality</td><td style={tdBold()}>Overdue</td><td style={imsTableCellStyle}>Status: Overdue</td></tr>
          <tr><td style={imsTableCellStyle}>Quality</td><td style={tdBold()}>Holidays / Events</td><td style={imsTableCellStyle}>Your own calendar items</td></tr>
          <tr><td style={imsTableCellStyle}>HSE</td><td style={tdBold()}>AINM Events</td><td style={imsTableCellStyle}>Type: AINM</td></tr>
          <tr><td style={imsTableCellStyle}>HSE</td><td style={tdBold()}>Inspections</td><td style={imsTableCellStyle}>Type: Inspection</td></tr>
          <tr><td style={imsTableCellStyle}>HSE</td><td style={tdBold()}>Observations</td><td style={imsTableCellStyle}>Type: Observation</td></tr>
          <tr><td style={imsTableCellStyle}>HSE</td><td style={tdBold()}>Open Actions</td><td style={imsTableCellStyle}>Type: HSE Action (open ones are counted)</td></tr>
          <tr><td style={imsTableCellStyle}>HSE</td><td style={tdBold()}>Overdue</td><td style={imsTableCellStyle}>Status: Overdue</td></tr>
          <tr><td style={imsTableCellStyle}>HSE</td><td style={tdBold()}>Planner Items</td><td style={imsTableCellStyle}>Your own planner items</td></tr>
        </tbody>
      </table>

      <h3 style={h3Style}>Colours and status</h3>
      <p style={pStyle}>
        Dates that are not closed are marked <span style={pill(imsColours.danger, "#fff")}>Overdue</span> once the date has passed and <span style={pill(imsColours.warning, "#fff")}>Due Soon</span> when it is within the next 7 days (Quality records and HSE actions). Closed, complete and cancelled items are not counted as upcoming.
      </p>

      <h3 style={h3Style}>Opening or editing an item</h3>
      <ul style={bullets}>
        <li><strong>Records from the IMS</strong> (an NCR, audit, AINM and so on) open a read-only <strong>Source Detail</strong> panel with an <strong>Open Source Record</strong> button that takes you to the real record. Change the date in the record itself, not in the calendar.</li>
        <li><strong>Your own items</strong> open <strong>Calendar Detail</strong> where you can change them and tap <strong>Save Calendar Item</strong>, or <strong>Delete Item</strong>. On the HSE calendar, planner items also have <strong>Save Planner Item</strong> and <strong>Complete / Roll Forward</strong> for recurring work.</li>
        <li>On the HSE calendar&apos;s <strong>Create Event</strong> tab, the <strong>Quick team setup</strong> chips fill in <strong>Assigned To</strong> with one tap.</li>
      </ul>
    </>
  );
}

function SectionQualityDash() {
  return (
    <>
      <div style={eyebrow}>Dashboards</div>
      <h2 style={h2Style}>Quality Dashboard</h2>
      <p style={pStyle}>
        The Quality Dashboard gives a management view of NCRs, audits, MOCs, document control and Quality-owned actions. Every tile, row and bar is a link into the register behind it. Use the <strong>Reporting year</strong> box to change the year, and the tabs to switch view.
      </p>
      <div style={tabRow}>
        <span style={tabPill(true)}>Overview</span>
        <span style={tabPill()}>Analytics</span>
        <span style={tabPill()}>Actions &amp; Audits</span>
        <span style={tabPill()}>Architecture</span>
      </div>

      <h3 style={h3Style}>Overview</h3>
      <div style={mockPanel}>
        <div style={mockLabel}>Overview tiles</div>
        <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ width: 84, height: 84, borderRadius: "50%", background: imsColours.brand, color: "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <strong style={{ fontSize: 22 }}>00</strong>
            <span style={{ fontSize: 10 }}>/ 100</span>
          </div>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={tileGrid}>
              <Tile title="Critical pressure" value="n" accent={imsColours.danger} />
              <Tile title="Open workload" value="n" accent={imsColours.brandAccent} />
              <Tile title="This month audits" value="n" accent={imsColours.muted} />
              <Tile title="Reviews overdue" value="n" accent={imsColours.brand} />
            </div>
          </div>
        </div>
      </div>
      <table style={imsTableStyle}>
        <thead>
          <tr>{["Tile", "What it counts", "Click through to"].map(h => <th key={h} style={imsTableHeadStyle}>{h}</th>)}</tr>
        </thead>
        <tbody>
          <tr>
            <td style={tdBold()}>Operational control score (circle)</td>
            <td style={imsTableCellStyle}>A score out of 100 weighted from NCR closure (30%), audit finding closure (30%), MOC closure (20%) and Quality action pressure (20%). A control with no records for the year is left out rather than scored as zero. The circle is teal at 75 or above, amber from 50, and red below that.</td>
            <td style={imsTableCellStyle}>Not clickable. It is a summary only.</td>
          </tr>
          <tr>
            <td style={tdBold()}>Critical pressure</td>
            <td style={imsTableCellStyle}>Overdue NCRs, overdue Quality actions, overdue HSEQ documents and expired temporary MOCs.</td>
            <td style={imsTableCellStyle}>Actions &amp; Audits tab, <strong>Critical Pressure Items</strong></td>
          </tr>
          <tr>
            <td style={tdBold()}>Open workload</td>
            <td style={imsTableCellStyle}>Open NCRs, audit findings, MOCs and Quality actions.</td>
            <td style={imsTableCellStyle}>Actions &amp; Audits tab, <strong>Open Workload Items</strong></td>
          </tr>
          <tr>
            <td style={tdBold()}>This month audits</td>
            <td style={imsTableCellStyle}>Audits planned this month, with how many are outstanding and complete.</td>
            <td style={imsTableCellStyle}>Audits, filtered to this month</td>
          </tr>
          <tr>
            <td style={tdBold()}>Reviews overdue</td>
            <td style={imsTableCellStyle}>Controlled documents past their next review date.</td>
            <td style={imsTableCellStyle}>Document Control, overdue reviews</td>
          </tr>
        </tbody>
      </table>
      <p style={pStyle}>
        Under the tiles, <strong>Management Focus</strong> lists six pressure points &mdash; <strong>Overdue NCRs</strong>, <strong>NCRs Due in 7 Days</strong>, <strong>Overdue Quality Actions</strong>, <strong>Document Reviews Overdue</strong>, <strong>Temporary MOCs Near Expiry</strong> and <strong>Expired Temporary MOCs</strong> &mdash; each linking to the matching filtered register (NCRs, Actions, Documents or MOC). <strong>Top Problem Areas</strong> ranks the audit areas with the most findings; tap one to open Audits searched for that area. The badge beside each (Reduce, Maintain or Increase) comes from the existing risk scoring.
      </p>

      <h3 style={h3Style}>Analytics</h3>
      <ul style={bullets}>
        <li><strong>Operational Pressure</strong> &mdash; one bar each for NCRs, Findings, MOCs, Actions and Docs (open or overdue items). Tap a bar to open that register filtered to the open items.</li>
        <li><strong>Control Health</strong> &mdash; the percentage closed or in date for <strong>NCR Closure</strong>, <strong>Finding Closure</strong>, <strong>HSEQ Docs In Date</strong> and <strong>MOC Closure</strong>, with an overall average. Each row links to its register; a control with no records shows &ldquo;No data&rdquo;.</li>
        <li><strong>KPI tiles</strong> &mdash; Open NCRs, Quality Open Actions, Open Audit Findings, Open MOCs, Temporary MOCs, MOCs In Review, Quality Overdue Actions and Overdue Documents. Each opens its register with the matching filter.</li>
        <li><strong>Charts</strong> &mdash; NCR Closure Mix, NCR Trend, Audit Programme Status, Audit Finding Mix, Document Control Health, MOC Control, MOC Type Split, Quality Action Trend and Quality Action Due Pressure.</li>
      </ul>

      <h3 style={h3Style}>Actions &amp; Audits, and Architecture</h3>
      <ul style={bullets}>
        <li><strong>Actions &amp; Audits</strong> lists the actual items: <strong>Critical Pressure Items</strong>, <strong>Open Workload Items</strong>, <strong>Quality Priority Actions</strong> (top five overdue or high-priority Quality actions) and <strong>Current Month Planned Audits</strong>.</li>
        <li><strong>Architecture</strong> is a reference map of how the IMS is built. It is not part of day-to-day reporting.</li>
      </ul>
    </>
  );
}

function SectionHseDash() {
  return (
    <>
      <div style={eyebrow}>Dashboards</div>
      <h2 style={h2Style}>HSE Dashboard</h2>
      <p style={pStyle}>
        The HSE Dashboard shows the HSE control picture across AINMs, inspections, HSE actions, calendar pressure and generated reports. Like the Quality Dashboard it has a <strong>Reporting year</strong> box and tabs &mdash; <strong>Overview</strong>, <strong>Analytics</strong> and <strong>Planning</strong> &mdash; and every tile links into the source register.
      </p>

      <div style={mockPanel}>
        <div style={mockLabel}>Overview tiles</div>
        <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ width: 84, height: 84, borderRadius: "50%", background: imsColours.brand, color: "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <strong style={{ fontSize: 18 }}>00%</strong>
            <span style={{ fontSize: 8 }}>CONTROL HEALTH</span>
          </div>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={tileGrid}>
              <Tile title="Critical pressure" value="n" accent={imsColours.danger} />
              <Tile title="Open workload" value="n" accent={imsColours.brandAccent} />
              <Tile title="Upcoming pressure" value="n" accent={imsColours.warning} />
              <Tile title="AINM profile" value="n/n" accent={imsColours.brand} />
            </div>
          </div>
        </div>
      </div>

      <table style={imsTableStyle}>
        <thead>
          <tr>{["Tile", "What it counts", "Click through to"].map(h => <th key={h} style={imsTableHeadStyle}>{h}</th>)}</tr>
        </thead>
        <tbody>
          <tr>
            <td style={tdBold()}>Control health (circle)</td>
            <td style={imsTableCellStyle}>A percentage weighted from AINM closure (28%), inspection completion (24%), HSE action pressure (24%) and calendar discipline (24%).</td>
            <td style={imsTableCellStyle}>Not clickable. It is a summary only.</td>
          </tr>
          <tr>
            <td style={tdBold()}>Critical pressure</td>
            <td style={imsTableCellStyle}>Open AINMs, overdue HSE actions and overdue calendar items added together.</td>
            <td style={imsTableCellStyle}>HSE Actions, overdue view</td>
          </tr>
          <tr>
            <td style={tdBold()}>Open workload</td>
            <td style={imsTableCellStyle}>Open AINMs, open inspections and open HSE actions.</td>
            <td style={imsTableCellStyle}>HSE Actions register</td>
          </tr>
          <tr>
            <td style={tdBold()}>Upcoming pressure</td>
            <td style={imsTableCellStyle}>HSE actions due this week plus calendar items due within 30 days.</td>
            <td style={imsTableCellStyle}>HSE Calendar</td>
          </tr>
          <tr>
            <td style={tdBold()}>AINM profile</td>
            <td style={imsTableCellStyle}>Incidents and accidents for the selected year, shown as incidents / accidents.</td>
            <td style={imsTableCellStyle}>AINM register for that year</td>
          </tr>
        </tbody>
      </table>

      <h3 style={h3Style}>Analytics</h3>
      <ul style={bullets}>
        <li><strong>Operational Pressure</strong> &mdash; bars for AINMs, Inspections, Actions, Calendar and Reports. Tap a bar to open: open AINMs, the Inspections register, the Actions register, the HSE Calendar, or the AINM reports view.</li>
        <li><strong>KPI tiles</strong> &mdash; <strong>Open AINMs</strong>, the year&apos;s <strong>Incidents</strong> and <strong>Accidents</strong> (each opens the AINM register filtered by type and year), <strong>Open Inspections</strong>, <strong>Open HSE Actions</strong> and <strong>Calendar Overdue</strong>.</li>
        <li><strong>Charts</strong> &mdash; AINM Incident / Accident Split, AINM Closure Mix, AINM Trend, Inspection Status, HSE Action Pressure, Open Actions by Person and Calendar Pressure. Clicking a chart card opens its register.</li>
      </ul>
      <h3 style={h3Style}>Planning</h3>
      <p style={pStyle}>
        <strong>Upcoming HSE Focus</strong> lists overdue and upcoming planner items (up to eight), each with its due date. Tap any item to open the HSE Calendar.
      </p>
    </>
  );
}

function SectionFaq() {
  const rows: [string, string][] = [
    ["A number on a dashboard does not match what I expect.", "Tap the tile. It opens the register with the same filter the number uses, so you can see exactly which records are counted. Remember the Reporting year box can limit what is counted."],
    ["Why can I see a dashboard but not save a report?", "Saving, editing and deleting reports need create or edit permission on the Reports area. Viewing a dashboard only needs view access. If you need to save reports, ask an IMS administrator to review your permissions."],
    ["I changed an NCR or action date. Why has the calendar not moved yet?", "The calendar reads the live record, so reload the page. The Last Refreshed card at the top shows when the data was loaded."],
    ["How do I change a date I can see on the calendar?", "Records from the IMS (NCRs, audits, AINMs and so on) are changed in the record itself. Use Open Source Record in the detail panel. Only your own calendar or planner items are edited in the calendar."],
    ["What is the difference between the Calendar and Register tabs?", "Calendar is a month view; Register is the same events as a searchable list with Type, Status and Owner filters."],
    ["Does Draft Executive Summary with AI send the report anywhere?", "It uses the figures on the page to write a draft summary into the box. Always read and edit it before you save or generate the PDF."],
    ["Will an old saved report show the same numbers today?", "It depends on the report. A saved HSE report keeps the figures from the day it was saved. Quality and Asset saved reports are worked out again from the current records for that month when you tap PDF."],
    ["Where do the generated PDFs go on my phone?", "They open in a new tab where your browser allows it, otherwise they are saved. Word files are saved to your phone. See the Using the IMS on a Phone guide."],
    ["Why are Generate Word and Generate PDF greyed out on the project annexes?", "Nothing is ticked. Tick at least one audit record or lookahead activity first."],
    ["Where do the Holidays / Events or Planner Items come from?", "From the Create Event tab (or the + on a day in the Calendar tab). They are the only items you can edit in the calendar."],
  ];
  return (
    <>
      <div style={eyebrow}>Reference</div>
      <h2 style={h2Style}>Common Questions</h2>
      <table style={imsTableStyle}>
        <thead>
          <tr>{["Question", "Answer"].map(h => <th key={h} style={imsTableHeadStyle}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map(([q, a]) => (
            <tr key={q}>
              <td style={{ ...imsTableCellStyle, fontWeight: 800, width: "38%" }}>{q}</td>
              <td style={imsTableCellStyle}>{a}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={flowWrap}>
        <div style={flowStep()}>Dashboard tile</div><div style={arrow}>→</div>
        <div style={flowStep()}>Filtered register</div><div style={arrow}>→</div>
        <div style={flowStep(true)}>The record itself</div>
      </div>
      <p style={pStyle}>That three-step path &mdash; tile, filtered register, record &mdash; works the same way across every dashboard and calendar in the IMS.</p>
    </>
  );
}

const sectionComponents: Record<SectionKey, () => ReactElement> = {
  overview:    SectionOverview,
  quality:     SectionQuality,
  hseassets:   SectionHseAssets,
  project:     SectionProject,
  calendars:   SectionCalendars,
  qualitydash: SectionQualityDash,
  hsedash:     SectionHseDash,
  faq:         SectionFaq,
};

export const reportsGuide: GuideDefinition = {
  id: "reports",
  navLabel: "Reports & Calendars",
  guideLabel: "Reports & Calendars",
  defaultSection: "overview",
  sections,
  sectionComponents,
};
