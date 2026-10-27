import type { CSSProperties, ReactElement, ReactNode } from "react";
import { imsColours, imsTableStyle, imsTableHeadStyle, imsTableCellStyle } from "../imsTheme";
import {
  GuideDefinition, GuideSectionDef,
  eyebrow, h2Style, h3Style, pStyle, codeStyle,
  stepList, Step, callout,
  mockPanel, mockHero, mockHeroEyebrow, mockLabel,
  mockInput, mockFieldLabel, mockRow, mockField, btn, pill,
  flowWrap, flowStep, arrow,
} from "./guideKit";

type SectionKey =
  | "overview" | "marks"
  | "scan" | "scanall" | "revisions"
  | "page" | "assign" | "signoff" | "reopen"
  | "reports" | "allprojects"
  | "access" | "troubleshooting";

const sections: GuideSectionDef[] = [
  { key: "overview",        label: "Overview",                     group: "Getting Started" },
  { key: "marks",           label: "Which Marks Count",            group: "Getting Started" },
  { key: "scan",            label: "From the NOI Tracker Scan",    group: "Adding Points" },
  { key: "scanall",         label: "Scan All ITPs in a Project",   group: "Adding Points" },
  { key: "revisions",       label: "Revisions & Re-scanning",      group: "Adding Points" },
  { key: "page",            label: "The Review Points Page",       group: "Working the Points" },
  { key: "assign",          label: "Reviewer & Target Date",       group: "Working the Points" },
  { key: "signoff",         label: "Signing Off",                  group: "Working the Points" },
  { key: "reopen",          label: "Failing, Reopening & History", group: "Working the Points" },
  { key: "reports",         label: "Reports (Internal & Client)",  group: "Reporting & Planning" },
  { key: "allprojects",     label: "All-Projects View",            group: "Reporting & Planning" },
  { key: "access",          label: "Who Can Do What",              group: "Reference" },
  { key: "troubleshooting", label: "Troubleshooting",              group: "Reference" },
];

const status = {
  pending:  pill(imsColours.panel, imsColours.ink),
  accepted: pill(imsColours.brandSoft, imsColours.brand),
  failed:   pill(imsColours.panel, imsColours.danger),
};

const pendingChip: CSSProperties = { ...status.pending, boxShadow: `inset 0 0 0 1px ${imsColours.warning}` };

const tile: CSSProperties = { background: "#fff", border: `1px solid ${imsColours.border}`, borderRadius: 8, padding: "8px 14px", textAlign: "center", minWidth: 96 };
const tileValue: CSSProperties = { fontSize: 18, fontWeight: 800, color: imsColours.brand };
const tileLabel: CSSProperties = { fontSize: 9, fontWeight: 700, color: imsColours.muted, textTransform: "uppercase", letterSpacing: "0.05em" };

function Tiles({ items }: { items: Array<[string, string]> }) {
  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
      {items.map(([value, label]) => (
        <div key={label} style={tile}><div style={tileValue}>{value}</div><div style={tileLabel}>{label}</div></div>
      ))}
    </div>
  );
}

function Heading({ group, title }: { group: string; title: string }) {
  return (
    <>
      <div style={eyebrow}>{group}</div>
      <h2 style={h2Style}>{title}</h2>
    </>
  );
}

function Note({ tone = "info", children }: { tone?: "info" | "warning" | "danger"; children: ReactNode }) {
  return (
    <div style={callout(tone)}>
      <span>{tone === "info" ? "ℹ" : "⚠"}</span>
      <div>{children}</div>
    </div>
  );
}

function RegisterMock({ withProject = false }: { withProject?: boolean }) {
  const cell: CSSProperties = { ...imsTableCellStyle, fontSize: 11 };
  return (
    <table style={imsTableStyle}>
      <thead>
        <tr>
          {["", "ITP", "Section", "Review point", "Code", "Reviewer", "Target date", "Status", "Sign-off"].map((h) => (
            <th key={h} style={imsTableHeadStyle}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style={cell}>☐</td>
          <td style={{ ...cell, fontWeight: 800, color: imsColours.brand }}>ITP-285<br /><span style={{ fontWeight: 400, color: imsColours.muted }}>Stalkon{withProject ? " · Wadden Sea" : ""}</span></td>
          <td style={{ ...cell, fontWeight: 800, color: imsColours.brand }}>1.2</td>
          <td style={cell}>Request of concession / deviation (TQCR)</td>
          <td style={cell}>R</td>
          <td style={cell}>Louise Harvey</td>
          <td style={cell}>26/10/2026<br /><span style={{ color: imsColours.danger, fontWeight: 800 }}>1 day overdue</span></td>
          <td style={cell}><span style={pendingChip}>Pending</span></td>
          <td style={cell}>Awaiting review</td>
        </tr>
        <tr>
          <td style={cell}>☐</td>
          <td style={{ ...cell, fontWeight: 800, color: imsColours.brand }}>ITP-285<br /><span style={{ fontWeight: 400, color: imsColours.muted }}>Stalkon{withProject ? " · Wadden Sea" : ""}</span></td>
          <td style={{ ...cell, fontWeight: 800, color: imsColours.brand }}>1.1</td>
          <td style={cell}>Purchase order and contract review attachments</td>
          <td style={cell}>R</td>
          <td style={cell}>Andy Miller</td>
          <td style={cell}>23/10/2026</td>
          <td style={cell}><span style={status.accepted}>Accepted</span></td>
          <td style={cell}><strong>Accepted by Louise Harvey</strong> on 21/10/2026 14:12</td>
        </tr>
      </tbody>
    </table>
  );
}

function SectionOverview() {
  return (
    <>
      <Heading group="Getting Started" title="Overview" />
      <p style={pStyle}>
        ITPs are full of points that are not witness or hold points but still need Enshore to act: a document to <strong>review</strong> (R) or an item that needs <strong>approval</strong> (A). Review Points is the tracker for those. Each point has a simple decision, <span style={pendingChip}>Pending</span>, <span style={status.accepted}>Accepted</span> or <span style={status.failed}>Failed</span>, signed digitally, with an optional reviewer and target date so the workload can be planned.
      </p>
      <div style={flowWrap}>
        <div style={flowStep()}>Scan the ITP</div><span style={arrow}>→</span>
        <div style={flowStep()}>Points added as Pending</div><span style={arrow}>→</span>
        <div style={flowStep()}>Assign reviewer & date</div><span style={arrow}>→</span>
        <div style={flowStep(true)}>Accept or Fail (signed)</div><span style={arrow}>→</span>
        <div style={flowStep()}>Report</div>
      </div>
      <h3 style={h3Style}>Where to find it</h3>
      <p style={pStyle}>
        <strong>One project:</strong> open the project (for example Wadden Sea) and click the <strong>Review Points</strong> tab, next to NOI Creator.<br />
        <strong>All projects:</strong> open <strong>Overall Inspections</strong> and click the <strong>Review Points</strong> tab.
      </p>
      <div style={mockPanel}>
        <div style={mockLabel}>Project workspace tabs</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {["Dashboard", "ITP Tracker", "NOI Tracker", "NOI Creator", "Review Points", "Inspection Records", "Project Reports", "ITP Sign-Off"].map((tab) => (
            <span key={tab} style={tab === "Review Points" ? btn("primary") : btn("ghost")}>{tab}</span>
          ))}
        </div>
      </div>
      <h3 style={h3Style}>What it is not</h3>
      <p style={pStyle}>Review points have <strong>no attachments</strong> and no approval workflow beyond the decision itself. Witness and hold points still live in the NOI Tracker, and inspection evidence still goes in Inspection Records.</p>
      <Note>Every decision carries a digital sign-off: the signer&apos;s name, the date and the time, set by the server when they sign. It cannot be typed in or backdated, and every change is kept in a history.</Note>
    </>
  );
}

function SectionMarks() {
  const cell: CSSProperties = { ...imsTableCellStyle, fontSize: 12 };
  return (
    <>
      <Heading group="Getting Started" title="Which Marks Count" />
      <p style={pStyle}>Review points are read from the same <strong>Enshore column</strong> that supplies the W/H points, so there is never a second column to choose. A mark becomes a review point when it contains <code style={codeStyle}>R</code> or <code style={codeStyle}>A</code> and nothing else disqualifies it.</p>
      <table style={imsTableStyle}>
        <thead><tr>{["Mark in the ITP", "What happens", "Why"].map((h) => <th key={h} style={imsTableHeadStyle}>{h}</th>)}</tr></thead>
        <tbody>
          {[
            ["R, R/A", "Review point", "Review (and approval)"],
            ["A, A/V", "Review point", "Approval required (and verify)"],
            ["M/R", "Review point", "Monitor / review contains a review"],
            ["W, H, W/H, R/W, H/R", "NOI Tracker only", "Contains a witness or hold, so it is already an NOI point and is never duplicated here"],
            ["M on its own", "Not tracked", "Monitoring only, nothing to sign off"],
            ["N/A", "Never a review point", "Means not applicable"],
          ].map(([mark, result, why]) => (
            <tr key={mark}>
              <td style={{ ...cell, fontWeight: 800 }}>{mark}</td>
              <td style={cell}>{result}</td>
              <td style={cell}>{why}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <Note>If an ITP&apos;s Enshore column holds none of these marks, there is simply nothing to add for that ITP.</Note>
    </>
  );
}

function SectionScan() {
  return (
    <>
      <Heading group="Adding Points" title="From the NOI Tracker Scan" />
      <p style={pStyle}>The quickest way to add one ITP&apos;s points is the scan you already use for W/H points.</p>
      <div style={stepList}>
        <Step n={1}>Open <strong>NOI Tracker</strong>, choose the ITP and click <strong>Scan current revision</strong>.</Step>
        <Step n={2}>Choose Enshore&apos;s column as normal. The W/H list appears first.</Step>
        <Step n={3}>Underneath, a second list, <strong>Review points (n)</strong>, shows the R and A marks from the same column. Untick anything you don&apos;t want and correct a description if needed.</Step>
        <Step n={4}>Click <strong>Add selected review points</strong>. They are added as <span style={pendingChip}>Pending</span>, and a message tells you how many were added and how many were already there.</Step>
      </div>
      <div style={mockPanel}>
        <div style={mockLabel}>Review points (5) · same column as the W/H points</div>
        {[["1.1", "Purchase order and contract review attachments", "R"], ["1.2", "Request of concession / deviation (TQCR)", "R"], ["2.1", "Receiving of materials and components", "A"], ["3.4", "Welding procedure qualification records", "R"], ["5.2", "Review of final documentation", "R"]].map(([section, text, code]) => (
          <div key={section} style={{ display: "grid", gridTemplateColumns: "22px 46px 1fr 44px", gap: 8, padding: "5px 0", borderTop: `1px solid ${imsColours.border}`, alignItems: "center" }}>
            <span>☑</span><strong style={{ color: imsColours.brand }}>{section}</strong><span>{text}</span><span style={codeStyle}>{code}</span>
          </div>
        ))}
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <span style={btn("ghost")}>Discard</span>
          <span style={btn("primary")}>Add selected review points</span>
        </div>
      </div>
      <Note>You can add the W/H points and the review points in either order. Adding one list does not affect the other.</Note>
    </>
  );
}

function SectionScanAll() {
  const cell: CSSProperties = { ...imsTableCellStyle, fontSize: 11 };
  return (
    <>
      <Heading group="Adding Points" title="Scan All ITPs in a Project" />
      <p style={pStyle}>For a first load, or to catch up on ITPs added since, scan the whole project in one go. This needs edit access.</p>
      <div style={stepList}>
        <Step n={1}>On the project&apos;s <strong>Review Points</strong> tab, click <strong>Scan ITPs for review points</strong>.</Step>
        <Step n={2}>The scan reads each ITP&apos;s current revision, one after another, using the Enshore column that is <strong>remembered</strong> from an earlier scan or <strong>suggested</strong> by the scanner. It never guesses.</Step>
        <Step n={3}>Check the table: how many review points each ITP holds and how many of those are new.</Step>
        <Step n={4}>Click <strong>Add N new review points</strong>. They arrive as <span style={pendingChip}>Pending</span>.</Step>
      </div>
      <div style={mockPanel}>
        <div style={mockLabel}>Scan this project&apos;s ITPs for review points</div>
        <table style={imsTableStyle}>
          <thead><tr>{["ITP", "Column used", "How chosen", "Review points", "New", ""].map((h) => <th key={h} style={imsTableHeadStyle}>{h}</th>)}</tr></thead>
          <tbody>
            {[
              ["ITP-285 · Stalkon", "Client Enshore", "Suggested", "20", "20", "Ready"],
              ["ITP-EN01 · Dynpap", "Contractor [Enshore]", "Remembered", "20", "0", "Ready"],
              ["ITP-HPU · Delta Fabs", "-", "-", "-", "-", "Pick a column"],
              ["H2025-0211-001 · Holland Shipyards", "-", "-", "-", "-", "Scanned PDF"],
            ].map((row) => (
              <tr key={row[0]}>
                {row.map((value, index) => (
                  <td key={index} style={cell}>
                    {index === 5 ? <span style={value === "Ready" ? status.accepted : pendingChip}>{value}</span> : value}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <span style={btn("primary")}>Add 20 new review points</span>
          <span style={btn("ghost")}>Close</span>
        </div>
      </div>
      <h3 style={h3Style}>The status chips</h3>
      <p style={pStyle}>
        <span style={status.accepted}>Ready</span> the points can be added.<br />
        <span style={pendingChip}>Pick a column</span> the scanner has no suggested column and none is remembered. Scan that ITP once from the NOI Tracker and confirm its column (leave <strong>Remember this choice</strong> ticked when you add points).<br />
        <span style={pendingChip}>Scanned PDF</span> the pages are images and need the visual reader. Scan that ITP from the NOI Tracker, where you are asked before any page is sent.<br />
        <span style={pendingChip}>No table found</span> or <span style={pendingChip}>Error</span> the ITP could not be read. Hover the chip, or read the note under it, for the reason.
      </p>
    </>
  );
}

function SectionRevisions() {
  return (
    <>
      <Heading group="Adding Points" title="Revisions & Re-scanning" />
      <h3 style={h3Style}>Re-scanning is safe</h3>
      <p style={pStyle}>A review point is identified by its ITP revision, section, code and description. Adding a point that is already there is skipped, so you can re-scan an ITP at any time without creating duplicates or touching a decision already made.</p>
      <h3 style={h3Style}>A new ITP revision starts fresh</h3>
      <p style={pStyle}>Points belong to the revision they were scanned from. When a new revision is uploaded and scanned, its review points arrive as <span style={pendingChip}>Pending</span>. Decisions are <strong>not</strong> carried across, because an approval applies to the revision that was reviewed.</p>
      <Note tone="warning">Points from an earlier revision stay in the list alongside the new revision&apos;s points. Use the status cards and filters to focus on what is still Pending.</Note>
    </>
  );
}

function SectionPage() {
  return (
    <>
      <Heading group="Working the Points" title="The Review Points Page" />
      <div style={mockPanel}>
        <div style={{ ...mockHero, marginTop: 0 }}>
          <div style={mockHeroEyebrow}>Enshore IMS · Project Management</div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>Review Points · Wadden Sea</div>
        </div>
        <Tiles items={[["7", "All review points"], ["4", "Pending"], ["2", "Accepted"], ["1", "Failed"], ["2", "Past target date"]]} />
        <div style={mockRow}>
          <div style={mockField(2)}><div style={mockFieldLabel}>Search</div><input style={mockInput} placeholder="Search ITP, supplier, review point..." readOnly /></div>
          <div style={mockField()}><div style={mockFieldLabel}>ITP</div><select style={mockInput}><option>All ITPs</option></select></div>
          <div style={mockField()}><div style={mockFieldLabel}>Reviewer</div><select style={mockInput}><option>All reviewers</option></select></div>
        </div>
        <RegisterMock />
      </div>
      <h3 style={h3Style}>Status cards</h3>
      <p style={pStyle}>The cards are filters: click <strong>Pending</strong>, <strong>Accepted</strong> or <strong>Failed</strong> to narrow the list, and <strong>All review points</strong> to clear it. <strong>Past target date</strong> counts points that are not accepted and whose target date has passed (it is a count only).</p>
      <h3 style={h3Style}>Filters</h3>
      <p style={pStyle}>Search by section, description, ITP number, supplier or reviewer. Filter by ITP and by reviewer; choose <strong>Unassigned</strong> to find points with no reviewer. <strong>Clear filters</strong> resets everything.</p>
      <h3 style={h3Style}>Two views</h3>
      <p style={pStyle}><strong>Register</strong> is one table of every point. <strong>By ITP</strong> groups the points into a card per ITP with a progress bar (accepted, failed, pending), which is the easier way to work through one ITP at a time and has a <strong>Select all N pending</strong> button.</p>
    </>
  );
}

function SectionAssign() {
  return (
    <>
      <Heading group="Working the Points" title="Reviewer & Target Date" />
      <p style={pStyle}>Give each point an owner and a date so it can be planned. Anyone with edit access to the project can assign. Signing is separate (see Signing Off).</p>
      <div style={stepList}>
        <Step n={1}>Tick one or more points (in either view). A bar appears at the bottom of the page.</Step>
        <Step n={2}>Click <strong>Assign reviewer and date...</strong></Step>
        <Step n={3}>Choose a <strong>Reviewer</strong> from People Management and/or a <strong>Target date</strong>. Leaving the reviewer on <em>Keep as is</em> changes only the date, and the other way round.</Step>
        <Step n={4}>Click <strong>Save</strong>. The change is recorded in each point&apos;s history.</Step>
      </div>
      <div style={mockPanel}>
        <div style={mockLabel}>Assign 3 review points</div>
        <div style={mockRow}>
          <div style={mockField()}><div style={mockFieldLabel}>Reviewer</div><select style={mockInput}><option>Andy Miller</option></select></div>
          <div style={mockField()}><div style={mockFieldLabel}>Target date</div><input style={mockInput} defaultValue="04/11/2026" readOnly /></div>
        </div>
        <div style={{ display: "flex", gap: 8 }}><span style={btn("primary")}>Save</span><span style={btn("ghost")}>Cancel</span></div>
      </div>
      <p style={pStyle}>A point past its target date shows in red with how many days overdue (for example <span style={{ color: imsColours.danger, fontWeight: 800 }}>4 days overdue</span>), and counts in the <strong>Past target date</strong> card. A point due within a week shows <strong>Due in N days</strong>. Once a point is accepted, its date is no longer flagged.</p>
    </>
  );
}

function SectionSignOff() {
  return (
    <>
      <Heading group="Working the Points" title="Signing Off" />
      <p style={pStyle}>Only authorised signers can accept or fail a review point (see Who Can Do What). Everyone else sees the buttons greyed out.</p>
      <h3 style={h3Style}>One point</h3>
      <div style={stepList}>
        <Step n={1}>Click <span style={btn("primary")}>Accept</span> or <span style={{ ...btn("ghost"), color: imsColours.danger }}>Fail</span> on the point&apos;s row.</Step>
        <Step n={2}>In the dialog, add a comment if useful. <strong>A reason is required to fail.</strong></Step>
        <Step n={3}>Tick <em>I confirm that I have reviewed this point</em>. The sign button stays disabled until you do.</Step>
        <Step n={4}>Click <strong>Sign and accept</strong> (or <strong>Sign and fail</strong>).</Step>
      </div>
      <h3 style={h3Style}>Several points at once</h3>
      <p style={pStyle}>Tick the points (or use <strong>Select all N pending</strong> in By ITP view), click <strong>Sign off selected...</strong> and sign once. This is built for clearing retrospective approvals quickly, and it <strong>accepts</strong> only. To fail a point, do it on its own row. Every point still gets its own sign-off stamp and history entry, and points that are no longer Pending are skipped.</p>
      <div style={mockPanel}>
        <div style={mockLabel}>Accept 3 review points</div>
        {[["ITP-285 · 2.1", "Receiving of materials and components"], ["ITP-285 · 5.2", "Review of final documentation"], ["ITP-EN03 · 1.5", "Acceptance WPQR / WPS"]].map(([ref, text]) => (
          <div key={ref} style={{ borderLeft: `3px solid ${imsColours.brand}`, padding: "3px 10px", marginBottom: 5 }}><strong>{ref}</strong> {text}</div>
        ))}
        <div style={{ background: imsColours.brandSoft, borderRadius: 8, padding: "8px 12px", margin: "8px 0", lineHeight: 1.5 }}>
          Signing as <strong style={{ color: imsColours.brand }}>Louise Harvey</strong>. The date and time are recorded by the server when you sign, against your name, one entry per point, and cannot be edited later.
        </div>
        <div style={mockFieldLabel}>Comment (optional)</div>
        <input style={mockInput} readOnly />
        <div style={{ margin: "8px 0" }}>☑ I confirm that I have reviewed these points and my decision is to accept them.</div>
        <div style={{ display: "flex", gap: 8 }}><span style={btn("ghost")}>Cancel</span><span style={btn("primary")}>Sign and accept (3)</span></div>
      </div>
      <h3 style={h3Style}>What gets recorded</h3>
      <p style={pStyle}>The register shows the result like this, and reports print the same wording:</p>
      <p style={pStyle}><span style={status.accepted}>Accepted</span> <strong>Accepted by Louise Harvey</strong> on 27/10/2026 16:39</p>
      <Note>The name comes from People Management (matched on your login email) and the time comes from the server. If you want a different person&apos;s name on a decision, they must sign it themselves.</Note>
    </>
  );
}

function SectionReopen() {
  return (
    <>
      <Heading group="Working the Points" title="Failing, Reopening & History" />
      <h3 style={h3Style}>Failing a point</h3>
      <p style={pStyle}>A failed point stays <span style={status.failed}>Failed</span> with the reason beside the sign-off, for example <em>WPQR for the 12 mm plate is missing. Supplier to resubmit.</em> The reason is shown in the register and in the internal report, and is never included in the client report.</p>
      <h3 style={h3Style}>When the supplier resubmits</h3>
      <p style={pStyle}>Click <strong>Reopen</strong> on the failed point to return it to <span style={pendingChip}>Pending</span>, then review it again and accept or fail it. Reopening is for signers only and is recorded.</p>
      <h3 style={h3Style}>Changing your mind on an accepted point</h3>
      <p style={pStyle}>The same <strong>Reopen</strong> button returns an accepted point to Pending. The earlier decision is not deleted: it is kept in the history as <em>Reopened ... (was accepted by Louise Harvey on 21/10/2026)</em>.</p>
      <h3 style={h3Style}>History</h3>
      <p style={pStyle}>On any point that has been decided, click <strong>History</strong> to see everything that has happened to it, in order.</p>
      <div style={mockPanel}>
        <div style={mockLabel}>History · ITP-285 · 3.4</div>
        {[
          ["Added", "Jordan Beaton", "14/10/2026 09:00", "Added from the ITP scan"],
          ["Assigned", "Jordan Beaton", "14/10/2026 09:10", "Reviewer Louise Harvey, target 2026-10-23"],
          ["Failed", "Louise Harvey", "23/10/2026 10:30", "WPQR for the 12 mm plate is missing. Supplier to resubmit."],
          ["Reopened", "Louise Harvey", "26/10/2026 08:15", "Was failed by Louise Harvey on 2026-10-23"],
        ].map(([what, who, when, detail]) => (
          <div key={what + when} style={{ padding: "4px 0", borderTop: `1px solid ${imsColours.border}`, fontSize: 12 }}>
            <strong>{what}</strong> by {who} on {when} · {detail}
          </div>
        ))}
      </div>
    </>
  );
}

function SectionReports() {
  const cell: CSSProperties = { ...imsTableCellStyle, fontSize: 12 };
  return (
    <>
      <Heading group="Reporting & Planning" title="Reports (Internal & Client)" />
      <div style={stepList}>
        <Step n={1}>Set the page filters first (project, ITP, reviewer, search). The report follows them.</Step>
        <Step n={2}>Click <strong>Report</strong>.</Step>
        <Step n={3}>Choose the <strong>Version</strong>, what to <strong>Include</strong> (all statuses, not yet accepted, pending only, accepted only or failed only) and how to <strong>Group by</strong> (ITP or project).</Step>
        <Step n={4}>Click <strong>Download PDF</strong> or <strong>Download Excel</strong>.</Step>
      </div>
      <h3 style={h3Style}>Internal and Client versions</h3>
      <table style={imsTableStyle}>
        <thead><tr>{["", "Internal", "Client"].map((h) => <th key={h} style={imsTableHeadStyle}>{h}</th>)}</tr></thead>
        <tbody>
          {[
            ["A failed point", "Shown as Failed, with the failure reason", "Shown as \"Pending - resubmission required\", no reason"],
            ["Reviewer and target date", "Included", "Left out"],
            ["Totals", "Accepted, Pending and Failed", "Accepted, Pending (failed counts as pending) and % complete"],
            ["Accepted points", "Sign-off shown", "Sign-off shown"],
            ["Generated by", "Shown", "Not shown"],
            ["Use", "Internal tracking", "Safe to share with the client"],
          ].map(([row, internal, client]) => (
            <tr key={row}><td style={{ ...cell, fontWeight: 800 }}>{row}</td><td style={cell}>{internal}</td><td style={cell}>{client}</td></tr>
          ))}
        </tbody>
      </table>
      <Note tone="warning">Always choose <strong>Client</strong> for anything leaving Enshore. The Internal version includes failure reasons and who is reviewing what.</Note>
      <h3 style={h3Style}>The files</h3>
      <p style={pStyle}>The PDF is landscape A4 with the Enshore logo, the filters used, a summary strip and a table per ITP or project, with page numbers. The Excel file has a <strong>Review points</strong> sheet (filter-ready) and an <strong>About</strong> sheet with the filters and who generated it. Files are named like <code style={codeStyle}>ITP-Review-Points-Client-2026-10-27.pdf</code>.</p>
    </>
  );
}

function SectionAllProjects() {
  return (
    <>
      <Heading group="Reporting & Planning" title="All-Projects View" />
      <p style={pStyle}>Open <strong>Overall Inspections</strong> and click the <strong>Review Points</strong> tab to see every project together. It works like the project page, with a <strong>Project</strong> filter, and adds planning cards at the top.</p>
      <div style={mockPanel}>
        <div style={mockLabel}>Open review points by reviewer</div>
        {[["Unassigned", 14, 0], ["Andy Miller", 9, 2], ["Louise Harvey", 6, 1], ["Jordan Beaton", 4, 0]].map(([name, open, late]) => (
          <div key={String(name)} style={{ display: "grid", gridTemplateColumns: "120px 1fr 28px", gap: 10, alignItems: "center", marginBottom: 6, fontSize: 12 }}>
            <span style={{ fontStyle: name === "Unassigned" ? "italic" : "normal" }}>{name}</span>
            <div style={{ height: 10, borderRadius: 99, background: imsColours.border, overflow: "hidden", display: "flex" }}>
              <i style={{ display: "block", width: `${(Number(late) / 14) * 100}%`, background: imsColours.danger }} />
              <i style={{ display: "block", width: `${((Number(open) - Number(late)) / 14) * 100}%`, background: imsColours.warning }} />
            </div>
            <strong>{open}</strong>
          </div>
        ))}
        <div style={{ fontSize: 10, color: imsColours.muted }}>Orange: on time · Red: past the target date</div>
      </div>
      <h3 style={h3Style}>Using it for resource planning</h3>
      <p style={pStyle}><strong>By reviewer</strong> shows who has how much open, and how much of it is overdue; <strong>Unassigned</strong> is work nobody owns yet. <strong>By project</strong> totals the open points, the ones past target and the ones still unassigned. Filter by reviewer to see one person&apos;s list, and tick points to assign them straight from here.</p>
      <p style={pStyle}>Scanning ITPs is done from each project&apos;s own page, so the all-projects view has no scan button. Reports from this view cover every project unless you filter.</p>
    </>
  );
}

function SectionAccess() {
  const cell: CSSProperties = { ...imsTableCellStyle, fontSize: 12 };
  return (
    <>
      <Heading group="Reference" title="Who Can Do What" />
      <table style={imsTableStyle}>
        <thead><tr>{["Action", "Who"].map((h) => <th key={h} style={imsTableHeadStyle}>{h}</th>)}</tr></thead>
        <tbody>
          {[
            ["View review points and history, download reports", "Anyone who can open Project Management"],
            ["Add points from the NOI Tracker scan", "Anyone with edit access to the NOI Tracker"],
            ["Scan ITPs for review points (project page)", "Anyone with edit access"],
            ["Assign a reviewer and target date", "Anyone with edit access"],
            ["Accept, Fail, Sign off selected, Reopen", "Authorised signers only: currently Jordan Beaton and Louise Harvey"],
          ].map(([action, who]) => (
            <tr key={action}><td style={{ ...cell, fontWeight: 800 }}>{action}</td><td style={cell}>{who}</td></tr>
          ))}
        </tbody>
      </table>
      <h3 style={h3Style}>How signing is enforced</h3>
      <p style={pStyle}>Signing is checked on the server against the signer list, using your login email. Greyed-out buttons are only a convenience: a request from anyone not on the list is refused. The name on a sign-off is taken from People Management (matched on your login email), and the date and time are the server&apos;s.</p>
      <h3 style={h3Style}>Adding or removing a signer</h3>
      <p style={pStyle}>The signer list is a small table in the database (<code style={codeStyle}>project_review_signers</code>: email, name, active). Ask an IMS admin to add a row to allow another person, for example a project engineer, or set <code style={codeStyle}>active</code> to false to remove one. Use the person&apos;s IMS login email in lower case.</p>
    </>
  );
}

function SectionTroubleshooting() {
  const cell: CSSProperties = { ...imsTableCellStyle, fontSize: 12 };
  return (
    <>
      <Heading group="Reference" title="Troubleshooting" />
      <table style={imsTableStyle}>
        <thead><tr>{["What you see", "What it means", "What to do"].map((h) => <th key={h} style={imsTableHeadStyle}>{h}</th>)}</tr></thead>
        <tbody>
          {[
            ["\"One-off setup needed\" instead of the page", "The database tables have not been created yet.", "Ask an IMS admin to run scripts/sql/project_review_points.sql in Supabase."],
            ["Accept / Fail / Reopen are greyed out", "You are not on the signer list.", "You can still assign reviewers and dates. Ask a signer, or ask an admin to add you."],
            ["No \"Scan ITPs for review points\" button", "It only shows on a project page, and only with edit access.", "Use the project page, or ask for edit access."],
            ["An ITP shows \"Pick a column\"", "No Enshore column is remembered or suggested for it.", "Scan it once in the NOI Tracker, confirm the column and leave Remember this choice ticked."],
            ["An ITP shows \"Scanned PDF\"", "Its pages are images and need the visual reader.", "Scan it from the NOI Tracker, where you are asked before any page is sent."],
            ["The scan found 0 review points", "The Enshore column holds no R or A marks, or the wrong column was chosen.", "Check the column on the NOI Tracker scan. R/W and H/R marks are witness/hold points and appear there instead."],
            ["\"Give a reason for failing\"", "Failing needs a reason.", "Type what must be corrected or resubmitted, then sign."],
            ["A point I tried to sign was skipped", "It was no longer Pending (someone else decided it first).", "Refresh the page and check its history."],
            ["A reviewer is missing from the list", "Reviewers come from active people in People Management.", "Add or reactivate them there."],
          ].map(([see, means, doIt]) => (
            <tr key={see}><td style={{ ...cell, fontWeight: 800 }}>{see}</td><td style={cell}>{means}</td><td style={cell}>{doIt}</td></tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

const sectionComponents: Record<SectionKey, () => ReactElement> = {
  overview:        SectionOverview,
  marks:           SectionMarks,
  scan:            SectionScan,
  scanall:         SectionScanAll,
  revisions:       SectionRevisions,
  page:            SectionPage,
  assign:          SectionAssign,
  signoff:         SectionSignOff,
  reopen:          SectionReopen,
  reports:         SectionReports,
  allprojects:     SectionAllProjects,
  access:          SectionAccess,
  troubleshooting: SectionTroubleshooting,
};

export const reviewPointsGuide: GuideDefinition = {
  id: "review-points",
  navLabel: "Review Points",
  guideLabel: "ITP Review Points",
  defaultSection: "overview",
  sections,
  sectionComponents,
};
