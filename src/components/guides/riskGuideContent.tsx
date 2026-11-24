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
  | "overview" | "dashboard" | "register" | "scoring" | "create"
  | "review" | "export" | "otherpages" | "reference" | "faq";

const sections: GuideSectionDef[] = [
  { key: "overview",   label: "Overview",                  group: "Getting Started" },
  { key: "dashboard",  label: "The Risk Dashboard",        group: "Getting Started" },
  { key: "register",   label: "The Risk Register",         group: "Getting Started" },
  { key: "scoring",    label: "How Risks Are Scored",      group: "Core Workflows" },
  { key: "create",     label: "Creating & Editing a Risk", group: "Core Workflows" },
  { key: "review",     label: "Reviews & Closing Risks",   group: "Core Workflows" },
  { key: "export",     label: "Risk Register PDF",         group: "Reports" },
  { key: "otherpages", label: "Pages Still Being Built",   group: "Other Pages" },
  { key: "reference",  label: "Reference",                 group: "Reference" },
  { key: "faq",        label: "Common Questions",          group: "Reference" },
];

function ratingPill(rating: string): CSSProperties {
  const map: Record<string, { bg: string; color: string }> = {
    low:      { bg: imsColours.brand,   color: "#ffffff" },
    medium:   { bg: imsColours.page,    color: imsColours.ink },
    high:     { bg: imsColours.warning, color: "#ffffff" },
    critical: { bg: imsColours.danger,  color: "#ffffff" },
  };
  const t = map[rating.toLowerCase()] || map.low;
  return pill(t.bg, t.color);
}

function SectionOverview() {
  return (
    <>
      <div style={eyebrow}>Getting Started</div>
      <h2 style={h2Style}>Overview</h2>
      <p style={pStyle}>The Risk Management module is where Enshore records project risks, scores them, assigns an owner and tracks how well they are being treated. Each risk is scored twice: once <strong>before</strong> any controls (the Initial Assessment) and once <strong>after</strong> controls (the Residual Assessment).</p>
      <div style={flowWrap}>
        <div style={flowStep()}>Create Risk</div><div style={arrow}>→</div>
        <div style={flowStep()}>Initial score</div><div style={arrow}>→</div>
        <div style={flowStep()}>Response / Mitigation</div><div style={arrow}>→</div>
        <div style={flowStep()}>Residual score</div><div style={arrow}>→</div>
        <div style={flowStep(true)}>Review &amp; Close</div>
      </div>
      <h3 style={h3Style}>What is working today</h3>
      <p style={pStyle}><strong>Risk Dashboard</strong> and <strong>Risk Register</strong> are fully working. You can create, edit, score, filter and delete risks, and produce a Risk Register PDF.</p>
      <h3 style={h3Style}>What is still a placeholder</h3>
      <p style={pStyle}><strong>Controls / Mitigations</strong>, <strong>Opportunities</strong>, <strong>Risk Reviews</strong>, <strong>Risk Actions</strong>, <strong>Risk Reports</strong> and the HSE <strong>Risk Assessments</strong> page are screens only for now. They show headings and empty counters but do not store any records. See <strong>Pages Still Being Built</strong>.</p>
      <div style={callout("info")}>
        <span>ℹ</span>
        <div>Risk access is controlled by your IMS permissions. If you only have read-only access you can view everything but the Create Risk, Save Changes and Delete Risk buttons will not work.</div>
      </div>
    </>
  );
}

function SectionDashboard() {
  return (
    <>
      <div style={eyebrow}>Getting Started</div>
      <h2 style={h2Style}>The Risk Dashboard</h2>
      <p style={pStyle}>The dashboard gives a quick picture of the whole register. It has two tabs, <strong>Overview</strong> and <strong>Analytics</strong>. The page header shows <code style={codeStyle}>Last Refreshed</code> and <code style={codeStyle}>Latest Risk Update</code> (the most recently changed risk).</p>
      <div style={mockPanel}>
        <div style={{ ...mockHero, marginTop: 0 }}>
          <div style={mockHeroEyebrow}>Risk Management</div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>Risk Dashboard</div>
        </div>
        <div style={mockLabel}>Overview tab</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          {["Open Risks", "High / Critical", "Overdue Reviews", "Linked Actions"].map(k => (
            <div key={k} style={{ flex: 1, minWidth: 110, background: "#fff", border: `1px solid ${imsColours.border}`, borderRadius: 8, padding: "8px 10px" }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: imsColours.muted }}>{k}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: imsColours.brand }}>{k === "Linked Actions" ? "-" : "0"}</div>
            </div>
          ))}
        </div>
        <div style={mockLabel}>Risk profile by rating · Residual rating distribution</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {["Critical", "High", "Medium", "Low"].map(r => <span key={r} style={ratingPill(r)}>{r}</span>)}
        </div>
      </div>
      <h3 style={h3Style}>Overview tab</h3>
      <table style={imsTableStyle}>
        <thead><tr>{["Tile", "What it counts"].map(h => <th key={h} style={imsTableHeadStyle}>{h}</th>)}</tr></thead>
        <tbody>
          <tr><td style={imsTableCellStyle}><strong>Open Risks</strong></td><td style={imsTableCellStyle}>Every risk whose status is not Closed or Archived.</td></tr>
          <tr><td style={imsTableCellStyle}><strong>High / Critical</strong></td><td style={imsTableCellStyle}>Risks whose <em>residual</em> rating is High or Critical.</td></tr>
          <tr><td style={imsTableCellStyle}><strong>Overdue Reviews</strong></td><td style={imsTableCellStyle}>Open risks whose <code style={codeStyle}>Next Review Due</code> date is before today.</td></tr>
          <tr><td style={imsTableCellStyle}><strong>Linked Actions</strong></td><td style={imsTableCellStyle}>Shows &ldquo;-&rdquo; for now. Risks are not yet linked to Actions.</td></tr>
        </tbody>
      </table>
      <p style={pStyle}>Below the tiles, <strong>Risk profile by rating</strong> shows how many risks sit at each residual rating (Critical, High, Medium, Low).</p>
      <h3 style={h3Style}>Analytics tab</h3>
      <p style={pStyle}>Three bar charts, each showing up to the six largest groups: <strong>Open risks by category</strong>, <strong>Open risks by department</strong> and <strong>Response status</strong>. Risks with no value are grouped as &ldquo;Unassigned&rdquo;.</p>
    </>
  );
}

function SectionRegister() {
  return (
    <>
      <div style={eyebrow}>Getting Started</div>
      <h2 style={h2Style}>The Risk Register</h2>
      <p style={pStyle}>The register lists every risk, numbered automatically as <code style={codeStyle}>RSK-001</code>, <code style={codeStyle}>RSK-002</code> and so on. The four tiles at the top show <strong>Total Risks</strong>, <strong>Open Risks</strong>, <strong>High / Critical</strong> and <strong>Overdue Reviews</strong>.</p>
      <div style={mockPanel}>
        <div style={mockLabel}>Risk Register · Filter and select a risk. Details open below the register.</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
          <span style={btn("primary")}>Create Risk</span>
          <span style={btn("ghost")}>Generate Risk Register PDF</span>
          <span style={btn("primary")}>Show Filters</span>
        </div>
        <table style={imsTableStyle}>
          <thead>
            <tr>{["Risk ID", "Risk", "Phase", "Owner", "Initial", "Residual", "Response", "Status", "Target / Review"].map(h => <th key={h} style={imsTableHeadStyle}>{h}</th>)}</tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ ...imsTableCellStyle, fontWeight: 800, color: imsColours.brand, whiteSpace: "nowrap" }}>RSK-001</td>
              <td style={imsTableCellStyle}>Weather downtime on offshore campaign</td>
              <td style={imsTableCellStyle}>Execution</td>
              <td style={imsTableCellStyle}>A. Example</td>
              <td style={imsTableCellStyle}><span style={ratingPill("High")}>12 High</span></td>
              <td style={imsTableCellStyle}><span style={ratingPill("Medium")}>6 Medium</span></td>
              <td style={imsTableCellStyle}>In Progress</td>
              <td style={imsTableCellStyle}>Under Review</td>
              <td style={imsTableCellStyle}>Review 15 Dec 2026</td>
            </tr>
          </tbody>
        </table>
      </div>
      <h3 style={h3Style}>Filtering</h3>
      <p style={pStyle}>Click <strong>Show Filters</strong>, then narrow the list by <code style={codeStyle}>Status</code>, <code style={codeStyle}>Residual rating</code>, <code style={codeStyle}>Department</code>, <code style={codeStyle}>Owner</code>, <code style={codeStyle}>Category</code> or <code style={codeStyle}>Project</code>. A line under the filters tells you how many risks are showing (for example &ldquo;Showing 3 of 12 risks&rdquo;). <strong>Clear Filters</strong> resets everything.</p>
      <p style={pStyle}>Filters, the selected risk and the open/closed state of the panels are held in the page address, so you can bookmark or share a link to a filtered view.</p>
      <h3 style={h3Style}>Opening a risk</h3>
      <p style={pStyle}>Click any row. A <strong>RSK-xxx Details</strong> panel opens below the register with the full form. Use <strong>Hide Details</strong> / <strong>Show Details</strong> to collapse it.</p>
    </>
  );
}

function SectionScoring() {
  const bands: [string, string, string][] = [
    ["Low", "1 to 4", "Low"],
    ["Medium", "5 to 9", "Medium"],
    ["High", "10 to 16", "High"],
    ["Critical", "17 to 25", "Critical"],
  ];
  return (
    <>
      <div style={eyebrow}>Core Workflows</div>
      <h2 style={h2Style}>How Risks Are Scored</h2>
      <p style={pStyle}>Scoring is automatic. You choose a <strong>Probability</strong> and an <strong>Impact</strong>, each from <strong>1 to 5</strong>. The system multiplies them and works out the rating for you.</p>
      <div style={flowWrap}>
        <div style={flowStep()}>Probability (1-5)</div><div style={arrow}>×</div>
        <div style={flowStep()}>Impact (1-5)</div><div style={arrow}>=</div>
        <div style={flowStep()}>Score (1-25)</div><div style={arrow}>→</div>
        <div style={flowStep(true)}>Rating</div>
      </div>
      <h3 style={h3Style}>Rating bands</h3>
      <table style={imsTableStyle}>
        <thead><tr>{["Score", "Rating"].map(h => <th key={h} style={imsTableHeadStyle}>{h}</th>)}</tr></thead>
        <tbody>
          {bands.map(([r, range]) => (
            <tr key={r}>
              <td style={imsTableCellStyle}>{range}</td>
              <td style={imsTableCellStyle}><span style={ratingPill(r)}>{r}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
      <h3 style={h3Style}>Example</h3>
      <div style={mockPanel}>
        <div style={mockLabel}>C. Initial Assessment</div>
        <div style={mockRow}>
          <div style={mockField()}><div style={mockFieldLabel}>Probability</div><div style={mockInput}>4</div></div>
          <div style={mockField()}><div style={mockFieldLabel}>Impact</div><div style={mockInput}>3</div></div>
          <div style={mockField()}><div style={mockFieldLabel}>Score</div><div style={{ ...mockInput, fontWeight: 800 }}>12</div></div>
          <div style={mockField()}><div style={mockFieldLabel}>Rating</div><span style={ratingPill("High")}>High</span></div>
        </div>
      </div>
      <p style={pStyle}>4 × 3 = 12, which falls in the 10 to 16 band, so the rating is <strong>High</strong>. The Score and Rating boxes update as soon as you change either dropdown.</p>
      <h3 style={h3Style}>Initial vs Residual</h3>
      <p style={pStyle}><strong>Initial Assessment</strong> (section C) is the risk as it stands before your mitigation. <strong>Residual Assessment</strong> (section F, using <code style={codeStyle}>Residual Probability</code> and <code style={codeStyle}>Residual Impact</code>) is what remains after the controls and response are in place. The dashboard, the High / Critical tile and the register filter all use the <strong>residual</strong> rating.</p>
      <div style={callout("warning")}>
        <span>⚠</span>
        <div>The Residual Assessment starts at 1 × 1 = 1 (Low). If you forget to set it, the risk will count as Low on the dashboard. Always complete section F.</div>
      </div>
    </>
  );
}

function SectionCreate() {
  return (
    <>
      <div style={eyebrow}>Core Workflows</div>
      <h2 style={h2Style}>Creating &amp; Editing a Risk</h2>
      <div style={stepList}>
        <Step n={1}>On the Risk Register, click <strong>Create Risk</strong>. The panel shows the <strong>Next risk number</strong> that will be used.</Step>
        <Step n={2}><strong>A. Core Details</strong>: enter <code style={codeStyle}>Risk Title</code> (required), then pick <code style={codeStyle}>Category</code>, <code style={codeStyle}>Department</code>, <code style={codeStyle}>Risk Owner</code>, <code style={codeStyle}>Project</code> and <code style={codeStyle}>Project Phase</code>.</Step>
        <Step n={3}><strong>B. Description and Impacted Work</strong>: describe the risk, and note the <code style={codeStyle}>Impacted Activities</code> and <code style={codeStyle}>Milestones Impacted</code>.</Step>
        <Step n={4}><strong>C. Initial Assessment</strong>: choose Probability and Impact (see <strong>How Risks Are Scored</strong>).</Step>
        <Step n={5}><strong>D. Response / Mitigation</strong>: choose a <code style={codeStyle}>Response Strategy</code> and <code style={codeStyle}>Response Status</code>, set the <code style={codeStyle}>Target Response Date</code>, add a <code style={codeStyle}>Procedure Number</code> if one applies, and describe the controls in <code style={codeStyle}>Mitigation Action / Controls / Window of Opportunity</code>.</Step>
        <Step n={6}><strong>E. Impact Areas</strong>: tick any that apply: Quality / Fit for Purpose, Operation, Financial, Schedule. Add an <code style={codeStyle}>Estimated Financial Impact</code> if known.</Step>
        <Step n={7}><strong>F. Residual Assessment</strong>: set Residual Probability and Residual Impact for the risk after controls.</Step>
        <Step n={8}><strong>G. Status / Closure / Learning</strong>: leave <code style={codeStyle}>Status</code> as Open for a new risk and set the review dates (see next section).</Step>
        <Step n={9}>Click the <strong>Create Risk</strong> button at the bottom of the form. The footer shows the Initial and Residual score and rating you are about to save.</Step>
      </div>
      <div style={callout("info")}>
        <span>ℹ</span>
        <div>Only the title is required. The system takes the lowest unused RSK number, so a number freed by a deleted risk can be reused.</div>
      </div>
      <h3 style={h3Style}>Risk Owner</h3>
      <p style={pStyle}>Owner and <code style={codeStyle}>Closed By</code> are picked from a list of active people in People Management, not typed. If someone is missing from the list, they need adding or activating in People first.</p>
      <h3 style={h3Style}>Editing</h3>
      <div style={stepList}>
        <Step n={1}>Click the risk in the register and make sure the details panel is showing.</Step>
        <Step n={2}>Change the fields you need. Scores and ratings are recalculated from your Probability and Impact choices when you save.</Step>
        <Step n={3}>Click <strong>Save Changes</strong>. The footer shows when the risk was created and last updated.</Step>
      </div>
      <h3 style={h3Style}>Deleting</h3>
      <p style={pStyle}>Click <strong>Delete Risk</strong> in the details panel and confirm the prompt. Deleting is permanent, so if a risk is simply finished, set its status to Closed or Archived instead (see below).</p>
    </>
  );
}

function SectionReview() {
  return (
    <>
      <div style={eyebrow}>Core Workflows</div>
      <h2 style={h2Style}>Reviews &amp; Closing Risks</h2>
      <p style={pStyle}>The register keeps two review dates under <strong>G. Status / Closure / Learning</strong>:</p>
      <div style={stepList}>
        <Step n={1}><code style={codeStyle}>Review Date</code> is the date the risk was last reviewed.</Step>
        <Step n={2}><code style={codeStyle}>Next Review Due</code> is when it should be reviewed again. This is the date used for the <strong>Overdue Reviews</strong> counts.</Step>
      </div>
      <p style={pStyle}>A risk is counted as an overdue review when its Next Review Due is before today and its status is not Closed or Archived. The register shows the date under the <strong>Target / Review</strong> column.</p>
      <h3 style={h3Style}>Closing a risk</h3>
      <div style={stepList}>
        <Step n={1}>Open the risk and change <code style={codeStyle}>Status</code> to <strong>Closed</strong> (or <strong>Archived</strong> for old records you want out of the open counts).</Step>
        <Step n={2}>Enter the <code style={codeStyle}>Date Closed</code> and choose <code style={codeStyle}>Closed By</code>.</Step>
        <Step n={3}>Add <code style={codeStyle}>Comments</code> and any <code style={codeStyle}>Lesson Learnt</code> so the knowledge is kept.</Step>
        <Step n={4}>Click <strong>Save Changes</strong>.</Step>
      </div>
      <div style={callout("warning")}>
        <span>⚠</span>
        <div>Status and Date Closed are separate fields. Setting a Date Closed does not change the Status, and changing the Status does not fill in the Date Closed. Complete both.</div>
      </div>
    </>
  );
}

function SectionExport() {
  return (
    <>
      <div style={eyebrow}>Reports</div>
      <h2 style={h2Style}>Risk Register PDF</h2>
      <p style={pStyle}>Click <strong>Generate Risk Register PDF</strong> above the register to create a landscape A4 report titled <strong>Risk Register Report</strong>, intended for project risk review meetings.</p>
      <div style={stepList}>
        <Step n={1}>Apply any filters first. The PDF contains only the risks currently showing, and the filter choices are printed at the top of the report.</Step>
        <Step n={2}>Click <strong>Generate Risk Register PDF</strong>. The button reads &ldquo;Generating PDF...&rdquo; while it works.</Step>
        <Step n={3}>The file is saved as <code style={codeStyle}>risk-register-YYYY-MM-DD.pdf</code> and the status bar says &ldquo;Risk Register PDF generated successfully.&rdquo;</Step>
      </div>
      <p style={pStyle}>If no risks match the filters you will see &ldquo;No risks match the current filters for PDF export.&rdquo;</p>
      <h3 style={h3Style}>What is in the report</h3>
      <p style={pStyle}>One row per risk with: Risk ID, Project, Phase, Activities, Description of Risk, Prob, Impact, Score, Strategy, Mitigation / Controls, Target, Response, Res Prob, Res Impact, Res Score, Owner and Status. Residual scores that are High or Critical are shaded and bold. Every page has a page number in the footer.</p>
      <h3 style={h3Style}>Using the page on a phone</h3>
      <p style={pStyle}>Buttons in panel headers wrap onto a new line on small screens, so Show Details / Hide Details and the other header buttons stay reachable. The register table scrolls sideways on a narrow screen.</p>
    </>
  );
}

function SectionOtherPages() {
  const rows: [string, string, string][] = [
    ["Controls / Mitigations", "/risk/controls", "Future control library (owner, risk link, effectiveness, assurance) and mitigation planning."],
    ["Opportunities", "/risk/opportunities", "Future register for positive risk and improvement ideas."],
    ["Risk Reviews", "/risk/reviews", "Future review queue and governance rhythm."],
    ["Risk Actions", "/risk/actions", "Will use the central Actions register. Has an Open Central Actions button."],
    ["Risk Reports", "/risk/reports", "Future management snapshots and saved reports."],
    ["HSE Risk Assessments", "/hse/risk-assessments", "Future task, site and environmental hazard assessments under HSE Management."],
  ];
  return (
    <>
      <div style={eyebrow}>Other Pages</div>
      <h2 style={h2Style}>Pages Still Being Built</h2>
      <p style={pStyle}>These pages are placeholders and are not in the Risk menu, so you will not normally reach them. If you open one from a saved link, its counters show &ldquo;-&rdquo;, their status bar says the data has not been configured yet, and nothing you do there is saved. Do not rely on them yet.</p>
      <table style={imsTableStyle}>
        <thead><tr>{["Page", "Address", "Planned purpose"].map(h => <th key={h} style={imsTableHeadStyle}>{h}</th>)}</tr></thead>
        <tbody>
          {rows.map(([name, path, text]) => (
            <tr key={name}>
              <td style={{ ...imsTableCellStyle, fontWeight: 700 }}>{name}</td>
              <td style={imsTableCellStyle}><code style={codeStyle}>{path}</code></td>
              <td style={imsTableCellStyle}>{text}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={callout("info")}>
        <span>ℹ</span>
        <div>For now, record risk reviews by updating <code style={codeStyle}>Review Date</code> and <code style={codeStyle}>Next Review Due</code> on the risk in the Risk Register, and track mitigation work in the central Actions page.</div>
      </div>
    </>
  );
}

function SectionReference() {
  const lists: [string, string][] = [
    ["Status", "Open, Under Review, Treatment Required, Accepted, Closed, Archived"],
    ["Response Status", "Not Started, In Progress, Complete, Overdue, On Hold"],
    ["Response Strategy", "Avoid, Reduce, Transfer, Accept, Exploit, Share, Enhance"],
    ["Category", "Operational, Project, Compliance, Commercial, Financial, HSEQ, People, Supply Chain, Technical"],
    ["Department", "Assets, Commercial, Crewing, Engineering, Finance, Human Resources, Logistics, Marketing, Operations, Procurement, Project, Survey, HSEQ"],
    ["Project Phase", "Tender, Planning, Engineering, Procurement, Execution, Closeout, Operations"],
    ["Probability / Impact", "1, 2, 3, 4, 5"],
    ["Rating", "Low, Medium, High, Critical"],
  ];
  return (
    <>
      <div style={eyebrow}>Reference</div>
      <h2 style={h2Style}>Reference</h2>
      <h3 style={h3Style}>Dropdown values</h3>
      <table style={imsTableStyle}>
        <thead><tr>{["Field", "Choices"].map(h => <th key={h} style={imsTableHeadStyle}>{h}</th>)}</tr></thead>
        <tbody>
          {lists.map(([f, v]) => (
            <tr key={f}>
              <td style={{ ...imsTableCellStyle, fontWeight: 700, whiteSpace: "nowrap" }}>{f}</td>
              <td style={imsTableCellStyle}>{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h3 style={h3Style}>Rating bands (Probability × Impact)</h3>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        <span style={ratingPill("Low")}>Low 1-4</span>
        <span style={ratingPill("Medium")}>Medium 5-9</span>
        <span style={ratingPill("High")}>High 10-16</span>
        <span style={ratingPill("Critical")}>Critical 17-25</span>
      </div>
      <h3 style={h3Style}>Form sections</h3>
      <p style={pStyle}>A. Core Details · B. Description and Impacted Work · C. Initial Assessment · D. Response / Mitigation · E. Impact Areas · F. Residual Assessment · G. Status / Closure / Learning</p>
      <h3 style={h3Style}>What counts as &ldquo;open&rdquo;</h3>
      <p style={pStyle}>Any risk whose status is anything other than Closed or Archived. Accepted risks are still counted as open.</p>
    </>
  );
}

function SectionFaq() {
  const faqs: [string, string][] = [
    ["Why does my new risk show as Low on the dashboard?", "The dashboard uses the residual rating, which starts at 1 × 1. Open the risk and set Residual Probability and Residual Impact in section F."],
    ["Can I type my own score or rating?", "No. Pick Probability and Impact (1 to 5) and the system calculates the score and rating."],
    ["Why can't I click Create Risk or Save Changes?", "You have read-only access. The status bar will say you do not have permission. Ask your administrator for create or edit rights on Risk Management."],
    ["Why is my name missing from the Risk Owner list?", "Owners come from active people in People Management. Ask an administrator to add or reactivate the person."],
    ["Why does a closed risk still appear in High / Critical?", "That tile counts every risk with a High or Critical residual rating, including closed ones. Open Risks and Overdue Reviews ignore Closed and Archived risks."],
    ["Can I link a risk to an Action?", "Not yet. The Linked Actions tile shows \"-\" and the Risk Actions page is a placeholder. Create the action in central Actions and mention the risk number in its description."],
    ["Does the PDF include every risk?", "Only the risks matching your current filters. Clear the filters first to export the whole register."],
    ["Can I undo a delete?", "No. Deleting a risk is permanent. Use Closed or Archived to retire a risk but keep its history."],
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
  overview:   SectionOverview,
  dashboard:  SectionDashboard,
  register:   SectionRegister,
  scoring:    SectionScoring,
  create:     SectionCreate,
  review:     SectionReview,
  export:     SectionExport,
  otherpages: SectionOtherPages,
  reference:  SectionReference,
  faq:        SectionFaq,
};

export const riskGuide: GuideDefinition = {
  id: "risk",
  navLabel: "Risk",
  guideLabel: "Risk Management",
  defaultSection: "overview",
  sections,
  sectionComponents,
};
