import type { CSSProperties, ReactElement } from "react";
import { imsColours, imsTableStyle, imsTableHeadStyle, imsTableCellStyle } from "../imsTheme";
import {
  GuideDefinition, GuideSectionDef,
  eyebrow, h2Style, h3Style, pStyle, codeStyle,
  stepList, Step, callout,
  mockPanel, mockHero, mockHeroEyebrow, mockLabel, flowWrap, flowStep, arrow,
  mockInput, btn, pill,
} from "./guideKit";

type SectionKey =
  | "overview" | "overviewtab" | "areas" | "period" | "export"
  | "status" | "reference" | "faq";

const sections: GuideSectionDef[] = [
  { key: "overview",    label: "Overview",                 group: "Getting Started" },
  { key: "overviewtab", label: "The Overview Tab",         group: "Getting Started" },
  { key: "areas",       label: "The Business Areas Tab",   group: "Core Workflows" },
  { key: "period",      label: "Choosing the Period",      group: "Core Workflows" },
  { key: "export",      label: "Exporting the Pack",       group: "Core Workflows" },
  { key: "status",      label: "How Status Is Decided",    group: "Reference" },
  { key: "reference",   label: "What Each Area Shows",     group: "Reference" },
  { key: "faq",         label: "Common Questions",         group: "Reference" },
];

function tonePill(tone: "green" | "amber" | "red"): CSSProperties {
  const map = {
    green: imsColours.brand,
    amber: imsColours.warning,
    red: imsColours.danger,
  };
  return pill(map[tone], "#ffffff");
}

function SectionOverview() {
  return (
    <>
      <div style={eyebrow}>Getting Started</div>
      <h2 style={h2Style}>Overview</h2>
      <p style={pStyle}>Management Review (page title <strong>Business Snapshot</strong>) is a live picture of how the business is doing, built from the other IMS modules. It is the page to open before a management review meeting: it shows, for each business area, a status and how many items need attention, and lets you click straight through to the records behind each number.</p>
      <div style={callout("info")}>
        <span>ℹ</span>
        <div>This page does not record meeting minutes, attendees, agenda items or review actions. It reads from Quality, HSE, Document Control, Projects, Assets, Actions and Lessons Learnt, and produces an <strong>Export PDF</strong> or <strong>Export PowerPoint</strong> pack. Record any actions arising from the meeting in the central Actions module.</div>
      </div>
      <div style={flowWrap}>
        <div style={flowStep()}>Open Management Review</div><div style={arrow}>→</div>
        <div style={flowStep()}>Pick the period</div><div style={arrow}>→</div>
        <div style={flowStep()}>Review each area</div><div style={arrow}>→</div>
        <div style={flowStep(true)}>Export the pack</div>
      </div>
      <h3 style={h3Style}>Seven business areas</h3>
      <p style={pStyle}>Quality, HSE, Document Control, Project Delivery, Asset Management, Action Management and Lessons Learnt. You only see the areas you have access to in the IMS, and the totals and exported packs only include the areas you can see.</p>
      <h3 style={h3Style}>Always up to date</h3>
      <p style={pStyle}>The numbers are loaded fresh every time you open the page. The status line at the top shows &quot;Live snapshot loaded.&quot; and the time it is &quot;As of&quot;. To refresh, reload the page. There is no stored or edited data on this page, so nothing can be &quot;saved&quot; wrongly.</p>
    </>
  );
}

function SectionOverviewTab() {
  return (
    <>
      <div style={eyebrow}>Getting Started</div>
      <h2 style={h2Style}>The Overview Tab</h2>
      <div style={mockPanel}>
        <div style={{ ...mockHero, marginTop: 0, borderRadius: 8 }}>
          <div style={mockHeroEyebrow}>Executive Pulse</div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>14 items need attention across the business</div>
          <div style={{ fontSize: 11, opacity: 0.85, marginTop: 4 }}>1 of 7 business areas are flagged Critical.</div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {[["Quality", "red", "Critical", [["3", "Open NCRs"], ["1", "Open Findings"], ["2", "Overdue Actions"]]], ["Document Control", "amber", "Needs Attention", [["0", "Reviews Overdue"], ["4", "Due Soon"], ["2", "Pending Workflow"]]]].map(([title, tone, label, items]) => (
            <div key={title as string} style={{ flex: 1, minWidth: 200, background: imsColours.panel, border: `1px solid ${imsColours.border}`, borderRadius: 8, padding: "10px 12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <strong>{title as string}</strong>
                <span style={tonePill(tone as "red" | "amber")}>{label as string}</span>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                {(items as string[][]).map(([v, l]) => (
                  <div key={l} style={{ flex: 1 }}>
                    <div style={{ fontSize: 16, fontWeight: 800 }}>{v}</div>
                    <div style={{ fontSize: 9, color: imsColours.muted }}>{l}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <p style={pStyle}>The <strong>Executive Pulse</strong> banner gives the total number of items needing attention across every area you can see, and how many areas are flagged Critical.</p>
      <p style={pStyle}>Below it is one card per business area, with its status and three headline numbers. <strong>Click a card</strong> to open that module.</p>
      <div style={callout("info")}>
        <span>ℹ</span>
        <div>There is deliberately no single blended score. Each area reports for itself so every number can be traced back to its source register.</div>
      </div>
    </>
  );
}

function SectionAreas() {
  return (
    <>
      <div style={eyebrow}>Core Workflows</div>
      <h2 style={h2Style}>The Business Areas Tab</h2>
      <p style={pStyle}>Use this tab for the detail behind each card.</p>
      <div style={stepList}>
        <Step n={1}>Click the <strong>Business Areas</strong> tab.</Step>
        <Step n={2}>Each area has its own panel: a <strong>Status</strong> line, a bar chart and four metric tiles.</Step>
        <Step n={3}>Hover over a bar in the chart to see its exact number. If the area has nothing open, the chart says &quot;No open items in this area.&quot;</Step>
        <Step n={4}>Click a metric tile to open the matching register, already filtered — for example, overdue Quality actions.</Step>
        <Step n={5}>Click <strong>Open module</strong> at the top of a panel to go to the whole module.</Step>
      </div>
      <p style={pStyle}>Use <strong>Back to IMS Home</strong> at the top to leave the page.</p>
    </>
  );
}

function SectionPeriod() {
  return (
    <>
      <div style={eyebrow}>Core Workflows</div>
      <h2 style={h2Style}>Choosing the Period</h2>
      <p style={pStyle}>The drop-down next to the tabs sets the reporting period. It offers <strong>All Time</strong> and a list of years (the current year is always there). It starts on the current year.</p>
      <div style={callout("warning")}>
        <span>⚠</span>
        <div>The period only changes the figures that are counted over a time span: <strong>NCRs raised</strong>, <strong>Incidents</strong> and <strong>Accidents</strong>, and <strong>Lessons logged</strong>. Everything else — open NCRs, overdue actions, calibrations, document reviews and so on — is the position <em>today</em>, whichever period is chosen.</div>
      </div>
      <p style={pStyle}>The chosen period is printed on the exported pack, so the reader knows what it covers.</p>
    </>
  );
}

function SectionExport() {
  return (
    <>
      <div style={eyebrow}>Core Workflows</div>
      <h2 style={h2Style}>Exporting the Pack</h2>
      <div style={mockPanel}>
        <div style={mockLabel}>Top of the page</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span style={btn("primary")}>Export PDF</span>
          <span style={btn("primary")}>Export PowerPoint</span>
        </div>
      </div>
      <div style={stepList}>
        <Step n={1}>Wait for the status line to say &quot;Live snapshot loaded.&quot;</Step>
        <Step n={2}>Choose the period you want to report on.</Step>
        <Step n={3}>Click <strong>Export PDF</strong> or <strong>Export PowerPoint</strong>.</Step>
        <Step n={4}>The file is saved to your device, named <code style={codeStyle}>management-review-pack-YYYY-MM-DD</code> with today&apos;s date. The status line confirms &quot;Management Review PDF pack generated.&quot; or &quot;Management Review PowerPoint generated.&quot;</Step>
      </div>
      <h3 style={h3Style}>What is in the PDF</h3>
      <div style={stepList}>
        <Step n={1}>A landscape A4 <strong>Management Review Pack</strong> with the Enshore logo, the date generated and the period.</Step>
        <Step n={2}>A summary table: <strong>Business Area</strong>, <strong>Status</strong> and <strong>Items Needing Attention</strong>.</Step>
        <Step n={3}>One table per area listing its metrics and values.</Step>
        <Step n={4}>An <strong>Unavailable Metrics</strong> table, only if some data could not be loaded.</Step>
        <Step n={5}>A footer on every page: &quot;Enshore Subsea | Management Review Pack&quot; with page numbers.</Step>
      </div>
      <h3 style={h3Style}>What is in the PowerPoint</h3>
      <p style={pStyle}>A title slide (&quot;Business Health Pack&quot;) showing the total items needing attention, a <strong>Business Area Status</strong> slide with one tile per area, then one slide per area with its three headline numbers and detail metrics.</p>
      <div style={callout("info")}>
        <span>ℹ</span>
        <div>Both packs are a snapshot of the moment you click. If the pack fails to generate, the status line says so — reload the page and try again.</div>
      </div>
    </>
  );
}

function SectionStatus() {
  return (
    <>
      <div style={eyebrow}>Reference</div>
      <h2 style={h2Style}>How Status Is Decided</h2>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <span style={tonePill("green")}>On Track</span>
        <span style={tonePill("amber")}>Needs Attention</span>
        <span style={tonePill("red")}>Critical</span>
      </div>
      <p style={pStyle}>Each area gets one of three statuses, worked out automatically. <strong>Items needing attention</strong> is a separate count — it is what feeds the Executive Pulse total and the pack&apos;s summary table.</p>
      <table style={imsTableStyle}>
        <thead>
          <tr>{["Area", "Critical when", "Needs Attention when", "Counted as needing attention"].map(h => <th key={h} style={imsTableHeadStyle}>{h}</th>)}</tr>
        </thead>
        <tbody>
          <tr><td style={imsTableCellStyle}><strong>Quality</strong></td><td style={imsTableCellStyle}>Any overdue Quality action.</td><td style={imsTableCellStyle}>Any open NCR, audit finding or MOC.</td><td style={imsTableCellStyle}>Open NCRs + open findings + overdue Quality actions.</td></tr>
          <tr><td style={imsTableCellStyle}><strong>HSE</strong></td><td style={imsTableCellStyle}>Any open High or Immediate Attention observation.</td><td style={imsTableCellStyle}>Any open AINM, overdue HSE action or overdue calendar item.</td><td style={imsTableCellStyle}>High-risk observations + overdue HSE actions + overdue calendar items.</td></tr>
          <tr><td style={imsTableCellStyle}><strong>Document Control</strong></td><td style={imsTableCellStyle}>Any overdue document review.</td><td style={imsTableCellStyle}>Any review due in 30 days, or any document in workflow.</td><td style={imsTableCellStyle}>Overdue reviews.</td></tr>
          <tr><td style={imsTableCellStyle}><strong>Project Delivery</strong></td><td style={imsTableCellStyle}>Any open Critical open point.</td><td style={imsTableCellStyle}>Any ITP needing attention, overdue open point or overdue NOI.</td><td style={imsTableCellStyle}>Overdue open points + overdue NOIs.</td></tr>
          <tr><td style={imsTableCellStyle}><strong>Asset Management</strong></td><td style={imsTableCellStyle}>Any overdue calibration.</td><td style={imsTableCellStyle}>Any overdue inspection or maintenance record.</td><td style={imsTableCellStyle}>Overdue calibrations + inspections + maintenance.</td></tr>
          <tr><td style={imsTableCellStyle}><strong>Action Management</strong></td><td style={imsTableCellStyle}>More than 5 overdue actions.</td><td style={imsTableCellStyle}>Any open action.</td><td style={imsTableCellStyle}>Overdue actions.</td></tr>
          <tr><td style={imsTableCellStyle}><strong>Lessons Learnt</strong></td><td style={imsTableCellStyle}>Any open High or Critical lesson needing action.</td><td style={imsTableCellStyle}>Any unowned open action or repeat theme.</td><td style={imsTableCellStyle}>High/Critical open + unowned open actions.</td></tr>
        </tbody>
      </table>
      <p style={pStyle}>If none of the &quot;Critical&quot; or &quot;Needs Attention&quot; conditions apply, the area is <strong>On Track</strong>.</p>
    </>
  );
}

function SectionReference() {
  const rows: [string, string, string][] = [
    ["Quality", "Open NCRs, Open Findings, Overdue Actions", "NCRs raised (period), Open MOCs, Open and Overdue Quality Actions."],
    ["HSE", "Open AINMs, High Risk Observations, Overdue Actions", "Incidents and Accidents (period), Calendar Items Overdue, Open HSE Actions. Open AINMs includes external AINMs."],
    ["Document Control", "Reviews Overdue, Due Soon, Pending Workflow", "Total Documents, Live Documents, Reviews Overdue, Pending Workflow."],
    ["Project Delivery", "ITPs Needing Attention, NOIs Overdue, Open Points Overdue", "Open Points (open, overdue, critical), NOIs due next 8 weeks."],
    ["Asset Management", "Calibration In-Date, Calibrations Overdue, Inspections Overdue", "In-Use Items Tracked, Calibrations, Inspection and Maintenance Records Overdue."],
    ["Action Management", "Open Actions, Overdue Actions, Departments With Open Work", "The departments with most open actions, each with its overdue count."],
    ["Lessons Learnt", "Open With Action Needed, High/Critical Open, Unowned Open Actions", "Lessons logged (period), High/Critical Open, Repeat Themes (2+ occurrences), Total Lessons Recorded."],
  ];
  return (
    <>
      <div style={eyebrow}>Reference</div>
      <h2 style={h2Style}>What Each Area Shows</h2>
      <table style={imsTableStyle}>
        <thead>
          <tr>{["Area", "Headline numbers (Overview card)", "Detail (Business Areas tab and the exports)"].map(h => <th key={h} style={imsTableHeadStyle}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map(([a, h, d]) => (
            <tr key={a}>
              <td style={{ ...imsTableCellStyle, fontWeight: 800 }}>{a}</td>
              <td style={imsTableCellStyle}>{h}</td>
              <td style={imsTableCellStyle}>{d}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p style={pStyle}>Every figure is read from the live register it links to, so it will always agree with what you see after clicking through. Asset calibration is judged only on items marked In Use, using each item&apos;s latest calibration record.</p>
      <h3 style={h3Style}>Unavailable Metrics</h3>
      <p style={pStyle}>If any module&apos;s data cannot be loaded, an <strong>Unavailable Metrics</strong> panel appears at the bottom of the page listing which source failed, and the status line says how many sources are unavailable. Treat figures for that area with caution and reload the page. The same list is added to the PDF.</p>
    </>
  );
}

function SectionFaq() {
  const qa: [string, string][] = [
    ["Can I record meeting minutes or actions here?", "No. This page is a read-only snapshot. Raise actions from the meeting in the central Actions module."],
    ["Why can I not see one of the areas?", "Areas only appear if you have access to that module in the IMS. Ask the IMS administrator if you think you should have access."],
    ["Why does the pack total differ between people?", "Each person's total and export only include the areas they can see."],
    ["Do the numbers change if I pick a different year?", "Only the period-based ones: NCRs raised, Incidents, Accidents and Lessons logged. Everything else is today's position."],
    ["Can I get the pack in a different format?", "The page offers PDF and PowerPoint only."],
    ["How do I refresh the numbers?", "Reload the page. The 'As of' time in the status line shows when they were loaded."],
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
  overviewtab: SectionOverviewTab,
  areas:       SectionAreas,
  period:      SectionPeriod,
  export:      SectionExport,
  status:      SectionStatus,
  reference:   SectionReference,
  faq:         SectionFaq,
};

export const managementReviewGuide: GuideDefinition = {
  id: "management-review",
  navLabel: "Management Review",
  guideLabel: "Management Review",
  defaultSection: "overview",
  sections,
  sectionComponents,
};
