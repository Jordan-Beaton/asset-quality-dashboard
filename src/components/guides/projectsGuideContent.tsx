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
  | "overview" | "workspace"
  | "tracker" | "upload"
  | "gates" | "teamcomments" | "issuing" | "phasesignoff"
  | "noitracker" | "noicreator"
  | "records"
  | "wadden"
  | "questions";

const sections: GuideSectionDef[] = [
  { key: "overview",     label: "Overview",                   group: "Getting Started" },
  { key: "workspace",    label: "Projects & the Dashboard",   group: "Getting Started" },
  { key: "tracker",      label: "The ITP Tracker",            group: "ITP Tracker" },
  { key: "upload",       label: "Uploading an ITP or Revision", group: "ITP Tracker" },
  { key: "gates",        label: "The Two Gates",              group: "Stage Gates & Sign-off" },
  { key: "teamcomments", label: "Team Comments (Gate 1)",     group: "Team Comments" },
  { key: "issuing",      label: "Issuing Comments to the Supplier", group: "Team Comments" },
  { key: "phasesignoff", label: "ITP Phase Sign-Off",         group: "Stage Gates & Sign-off" },
  { key: "noitracker",   label: "NOI Tracker",                group: "Notices of Inspection" },
  { key: "noicreator",   label: "NOI Creator",                group: "Notices of Inspection" },
  { key: "records",      label: "Inspection Records & Packs", group: "Inspection Records" },
  { key: "wadden",       label: "Wadden Sea Reports & Open Points", group: "Project Registers" },
  { key: "questions",    label: "Common Questions",           group: "Reference" },
];

// ── Small shared pieces ───────────────────────────────────────────────────────

const chip = {
  supplier: pill(imsColours.panel, imsColours.danger),
  review:   pill(imsColours.panel, imsColours.warning),
  approved: pill(imsColours.brandSoft, imsColours.brand),
  waiting:  pill(imsColours.panel, imsColours.warning),
  finished: pill(imsColours.brandSoft, imsColours.brand),
  muted:    pill(imsColours.page, imsColours.muted),
};

const tile: CSSProperties = { background: "#fff", border: `1px solid ${imsColours.border}`, borderRadius: 8, padding: "8px 14px", textAlign: "center", minWidth: 110 };
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

function Code({ children }: { children: ReactNode }) {
  return <code style={codeStyle}>{children}</code>;
}

function TabsMock({ active, tabs }: { active: string; tabs?: string[] }) {
  const list = tabs || ["Dashboard", "ITP Tracker", "NOI Tracker", "NOI Creator", "Review Points", "Inspection Records", "ITP Sign-Off", "MOC"];
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
      {list.map((tab) => <span key={tab} style={tab === active ? btn("primary") : btn("ghost")}>{tab}</span>)}
    </div>
  );
}

function SimpleTable({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <table style={imsTableStyle}>
      <thead><tr>{head.map((h) => <th key={h} style={imsTableHeadStyle}>{h}</th>)}</tr></thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex} style={{ ...imsTableCellStyle, fontSize: 12, verticalAlign: "top" }}>{cell}</td>)}</tr>
        ))}
      </tbody>
    </table>
  );
}

// ── Getting Started ───────────────────────────────────────────────────────────

function SectionOverview() {
  return (
    <>
      <Heading group="Getting Started" title="Overview" />
      <p style={pStyle}>
        Project Management is where each project&apos;s supplier ITPs (Inspection and Test Plans), inspection notices and inspection evidence are controlled. Every project has its own workspace with the same set of tabs, so once you know one you know them all.
      </p>
      <div style={flowWrap}>
        <div style={flowStep()}>Upload the supplier ITP</div><span style={arrow}>→</span>
        <div style={flowStep()}>Gate 1 · Review</div><span style={arrow}>→</span>
        <div style={flowStep()}>Gate 2 · Approval</div><span style={arrow}>→</span>
        <div style={flowStep(true)}>Approved (controlled revision)</div><span style={arrow}>→</span>
        <div style={flowStep()}>Scan W/H points</div><span style={arrow}>→</span>
        <div style={flowStep()}>Create NOIs</div><span style={arrow}>→</span>
        <div style={flowStep()}>Attach inspection records</div>
      </div>
      <h3 style={h3Style}>The tabs in a project workspace</h3>
      <div style={mockPanel}>
        <div style={mockLabel}>Project workspace tabs</div>
        <TabsMock active="ITP Tracker" />
      </div>
      <SimpleTable
        head={["Tab", "What it is for"]}
        rows={[
          [<strong key="a">Dashboard</strong>, "Counts and shortcuts: current ITPs, upcoming inspections, NOIs outstanding."],
          [<strong key="b">ITP Tracker</strong>, "One record per supplier ITP, with a two-gate review and approval."],
          [<strong key="c">NOI Tracker</strong>, "The register of witness (W) and hold (H) points taken from approved ITPs."],
          [<strong key="d">NOI Creator</strong>, "Produces the Notice of Inspection in Word and PDF."],
          [<strong key="e">Review Points</strong>, <>Review (R) and approval (A) points from the same ITPs. Has its own guide: <strong>ITP Review Points</strong>.</>],
          [<strong key="f">Inspection Records</strong>, "Links completed inspection documents to an NOI and notifies the recipients."],
          [<strong key="g">Project Reports</strong>, "Wadden Sea only: monthly annexes, 8-week lookahead and the Open Points register."],
          [<strong key="h">ITP Sign-Off</strong>, "Sends whole ITP phases to an outside person for a verified approve or reject."],
          [<strong key="i">MOC</strong>, "Opens the Management of Change register for that project."],
        ]}
      />
      <Note>The tabs shown depend on the project. Wadden Sea has <strong>Project Reports</strong>; Baltic Power does not. Everything else is the same.</Note>
    </>
  );
}

function SectionWorkspace() {
  return (
    <>
      <Heading group="Getting Started" title="Projects & the Dashboard" />
      <h3 style={h3Style}>The project list</h3>
      <p style={pStyle}>
        Go to <strong>Project Management</strong>. Under <strong>Project workspaces</strong> there is one card for each project, marked <strong>Active</strong> with its short code. Click a card, or <strong>Open project workspace →</strong>, to enter it. The last card, <strong>Overall Inspections</strong>, is the cross-project 8-week lookahead rather than a project.
      </p>
      <div style={mockPanel}>
        <div style={mockLabel}>Project workspaces</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {[["Baltic Power", "BLP", "Active"], ["Wadden Sea Project", "WSP", "Active"], ["Overall Inspections", "OVI", "All projects"]].map(([name, code, badgeText]) => (
            <div key={name} style={{ flex: "1 1 170px", background: "#fff", border: `1px solid ${imsColours.border}`, borderRadius: 10, padding: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={chip.approved}>{badgeText}</span><span style={{ fontSize: 10, fontWeight: 800, color: imsColours.muted }}>{code}</span>
              </div>
              <div style={{ fontWeight: 800, color: imsColours.ink }}>{name}</div>
              <div style={{ fontSize: 11, color: imsColours.brand, marginTop: 6, fontWeight: 700 }}>Open project workspace →</div>
            </div>
          ))}
        </div>
      </div>
      <h3 style={h3Style}>Adding a new project (admins only)</h3>
      <p style={pStyle}>
        Admins see an <strong>Add a project</strong> panel at the bottom of the page. Enter the <Code>Project name</Code> and a <Code>MOC prefix</Code> of 3 or 4 letters. You can also list <Code>Parts or sections</Code> if MOCs for that project apply to particular parts. Click <strong>Add project</strong>. The project appears straight away in the list, in Create MOC and in the project menu. The prefix cannot be changed once the first MOC is raised. Nobody needs to ask for the project to be set up in the background.
      </p>
      <h3 style={h3Style}>The project dashboard</h3>
      <p style={pStyle}>The <strong>Dashboard</strong> tab has three views along the top:</p>
      <div style={stepList}>
        <Step n={1}><strong>Overview</strong>: tiles for <em>Current ITPs</em>, <em>ITPs Requiring Attention</em>, <em>Upcoming Inspections</em>, <em>NOI Outstanding</em>, <em>Overdue Inspections</em> and <em>NOI Requirements</em>, plus a shortcut to <em>NOI Creator</em> (the standard project dashboard also has <em>Open MOCs</em> and <em>ITP Sign-Off</em>). Click a tile to go straight to that list.</Step>
        <Step n={2}><strong>Inspection Planning</strong>: <em>Upcoming inspections</em> over the next 8 weeks and <em>ITP review priorities</em>.</Step>
        <Step n={3}><strong>Project Controls</strong>: quick links to upload or review an ITP, maintain NOI requirements, and (Wadden Sea) prepare monthly annexes.</Step>
      </div>
    </>
  );
}

// ── ITP Tracker ───────────────────────────────────────────────────────────────

function SectionTracker() {
  const cell: CSSProperties = { ...imsTableCellStyle, fontSize: 11 };
  return (
    <>
      <Heading group="ITP Tracker" title="The ITP Tracker" />
      <p style={pStyle}>
        The ITP Tracker holds one controlled record for each supplier ITP. Each ITP has revisions, and only the <strong>current</strong> revision is reviewed. The page tells you at a glance where every ITP is stuck and who it is waiting on.
      </p>
      <h3 style={h3Style}>The four stage tiles</h3>
      <p style={pStyle}>Across the top are four tiles. Click one to filter the list to that stage; click it again to clear the filter.</p>
      <div style={mockPanel}>
        <div style={mockLabel}>ITPs by stage gate</div>
        <Tiles items={[["2", "With supplier · Waiting for a new revision"], ["3", "Awaiting review · Gate 1"], ["1", "Awaiting approval · Gate 2"], ["12", "Approved · Controlled revision"]]} />
        <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
          <span style={btn("ghost")}>My queue 1</span>
          <span style={btn("ghost")}>Overdue 2</span>
          <span style={btn("ghost")}>Clear filters</span>
        </div>
        <table style={imsTableStyle}>
          <thead><tr>{["ITP", "Rev", "Stage gate", "Waiting on", "Due"].map((h) => <th key={h} style={imsTableHeadStyle}>{h}</th>)}</tr></thead>
          <tbody>
            <tr>
              <td style={cell}><strong style={{ color: imsColours.brand }}>ITP-285</strong><br />Cable pull-in procedure<br /><span style={{ color: imsColours.muted }}>Stalkon · Trencher</span></td>
              <td style={cell}><strong>B</strong></td>
              <td style={cell}>Review → Approval</td>
              <td style={cell}>Louise Harvey<br /><span style={{ color: imsColours.muted }}>2 days</span></td>
              <td style={cell}><span style={{ color: imsColours.danger, fontWeight: 800 }}>24 Nov<br />1 day late</span></td>
            </tr>
            <tr>
              <td style={cell}><strong style={{ color: imsColours.brand }}>ITP-301</strong><br />Cable termination<br /><span style={{ color: imsColours.muted }}>Dynpap · Barge</span></td>
              <td style={cell}><strong>A</strong></td>
              <td style={cell}>Review: comments</td>
              <td style={cell}>Dynpap<br /><span style={{ color: imsColours.muted }}>revised ITP due</span></td>
              <td style={cell}>—</td>
            </tr>
          </tbody>
        </table>
      </div>
      <h3 style={h3Style}>Finding things</h3>
      <div style={stepList}>
        <Step n={1}>Use <strong>My queue</strong> to see only the ITPs where it is your turn to review or approve. The number beside it is how many you have.</Step>
        <Step n={2}>Use <strong>Overdue</strong> to see only the ITPs past their due date.</Step>
        <Step n={3}>Use the search box (ITP number, title, supplier or package) and the scope drop-down (<em>All scopes</em>, Trencher, Barge).</Step>
        <Step n={4}>Switch between <strong>Table</strong> and <strong>Board</strong>. The board is one column per stage.</Step>
        <Step n={5}>Click any row or card to open the ITP record.</Step>
      </div>
      <p style={pStyle}>The list is sorted so the most urgent is at the top: overdue first, then ITPs waiting on a review or approval, then ITPs with the supplier, then the rest. In the table, <strong>Waiting on</strong> shows the person and how many days they have had it; <strong>Due</strong> shows the date and, if late, how many days late.</p>
      <h3 style={h3Style}>Current register and Revision archive</h3>
      <p style={pStyle}>
        Two buttons sit above the list. <strong>Current register</strong> shows one line per ITP. <strong>Revision archive</strong> lists every superseded revision, read-only, with an <strong>Open archived file</strong> button. Older revisions never disappear.
      </p>
      <Note>An ITP approved before the stage gate was introduced shows <strong>Approved before the stage gate</strong>. No reviewer or approver names were recorded for those.</Note>
    </>
  );
}

function SectionUpload() {
  return (
    <>
      <Heading group="ITP Tracker" title="Uploading an ITP or Revision" />
      <p style={pStyle}>The same button is used for a brand-new ITP and for a new revision of one that is already there.</p>
      <div style={stepList}>
        <Step n={1}>On the ITP Tracker click <strong>+ Upload ITP / revision</strong>.</Step>
        <Step n={2}>Choose the file. The tracker accepts <strong>Excel, PDF or Word</strong> and keeps the original. It reads the document number, title, revision, supplier and date from the file where it can.</Step>
        <Step n={3}>Check the <Code>Extraction confidence</Code> line, then confirm <Code>Document number *</Code>, <Code>Revision *</Code> and <Code>ITP title *</Code>. Fill in <Code>Supplier</Code>, <Code>Scope</Code> and <Code>Revision date</Code> if blank.</Step>
        <Step n={4}>Under <strong>Who looks at this ITP?</strong> choose the <Code>Reviewer · Gate 1</Code>, optionally the <Code>Approver · Gate 2</Code> (it can be chosen once the review is done) and anyone to copy in under <Code>Also copy in</Code>. People come only from People Management.</Step>
        <Step n={5}>Click <strong>Save and email reviewer</strong>. If you left the reviewer blank the button reads <strong>Save controlled revision</strong> instead.</Step>
      </div>
      <div style={mockPanel}>
        <div style={mockLabel}>Upload ITP or new revision</div>
        <div style={{ border: `2px dashed ${imsColours.brandAccent}`, borderRadius: 10, padding: 14, textAlign: "center", color: imsColours.brand, marginBottom: 10, background: "#fff" }}>
          <strong>Stalkon-ITP-285-RevB.xlsx</strong><div style={{ fontSize: 11 }}>Excel, PDF, or Word · the original file will be retained</div>
        </div>
        <div style={mockRow}>
          <div style={mockField()}><div style={mockFieldLabel}>Document number *</div><div style={mockInput}>ITP-285</div></div>
          <div style={mockField(0.5)}><div style={mockFieldLabel}>Revision *</div><div style={mockInput}>B</div></div>
        </div>
        <div style={mockRow}>
          <div style={mockField()}><div style={mockFieldLabel}>Reviewer · Gate 1</div><div style={mockInput}>Louise Harvey · QA Engineer, Quality</div></div>
          <div style={mockField()}><div style={mockFieldLabel}>Approver · Gate 2</div><div style={mockInput}>Choose when the review is done</div></div>
        </div>
        <span style={btn("primary")}>Save and email reviewer</span>
      </div>
      <h3 style={h3Style}>Uploading a new revision of an existing ITP</h3>
      <p style={pStyle}>
        If the document number matches an ITP that is already in the register, the tracker says so, fills in the supplier and scope, and <strong>carries forward the previous reviewer, approver and copy list</strong>. The new revision becomes current and the old one moves to the <strong>Revision archive</strong>. The review <strong>restarts at Gate 1</strong>.
      </p>
      <Note tone="warning">
        The tracker stops you uploading a revision letter that already exists for that ITP, and asks you to confirm if the new revision looks older than the current one. If a document looks like an existing ITP but has a different number, it asks whether to continue as a separate ITP. Read these prompts rather than clicking through.
      </Note>
      <h3 style={h3Style}>When the reviewer is emailed</h3>
      <p style={pStyle}>
        Choosing a reviewer opens Gate 1 and emails them straight away; the three-working-day clock starts. With no reviewer chosen, <strong>nobody is emailed and the clock does not start</strong>. The ITP shows <em>No reviewer · choose one to start the clock</em>; open it and use <strong>Assign and email reviewer</strong>.
      </p>
      <h3 style={h3Style}>Files and phones</h3>
      <p style={pStyle}>
        Documents and photos uploaded in the IMS are stored with the right file type, so Word, Excel and PowerPoint files open in the right app, including on a phone. <strong>Open document ↗</strong> and the other file links open in a new tab, or in the same tab if the phone blocks a new one (use Back to return to the IMS). Where you pick a document for upload on the <strong>ITP Sign-Off</strong> page, PDF, Word, Excel, PowerPoint, text files and photos are all accepted.
      </p>
    </>
  );
}

// ── Stage Gates ───────────────────────────────────────────────────────────────

function SectionGates() {
  return (
    <>
      <Heading group="Stage Gates & Sign-off" title="The Two Gates" />
      <p style={pStyle}>Every ITP revision passes two gates, each with its own named person and a <strong>three working day</strong> clock (Monday to Friday; public holidays are not excluded).</p>
      <div style={flowWrap}>
        <div style={flowStep()}>Received</div><span style={arrow}>→</span>
        <div style={flowStep(true)}>Gate 1 · Review</div><span style={arrow}>→</span>
        <div style={flowStep()}>Gate 2 · Approval</div><span style={arrow}>→</span>
        <div style={flowStep()}>Approved</div>
      </div>
      <h3 style={h3Style}>The ITP record page</h3>
      <p style={pStyle}>
        Click an ITP in the tracker to open its record. At the top is the summary with <strong>Open document ↗</strong>, <strong>Revision history</strong>, <strong>Edit details</strong> and (admins only) <strong>Delete</strong>, and a progress bar: <em>Received</em>, <em>Gate 1 · Review</em>, <em>Gate 2 · Approval</em>, <em>Approved</em>. Below it, on the left: the action panel for your turn, <strong>People on this ITP</strong> and <strong>Comments</strong>. On the right: <strong>Activity</strong> (a dated trail of every change and email) and <strong>Linked records</strong>.
      </p>
      <h3 style={h3Style}>Gate 1: the reviewer</h3>
      <p style={pStyle}>Only the named reviewer sees the <strong>Your review</strong> panel. Open the document, check it against the supplier PO and Enshore requirements, then choose one decision:</p>
      <SimpleTable
        head={["Decision", "What it does", "Button"]}
        rows={[
          [<strong key="a">Share for team comments</strong>, <>Asks colleagues for comments first. Nothing goes to the supplier and the gate stays with you. See <strong>Team Comments (Gate 1)</strong>.</>, "Share for comments"],
          [<strong key="b">Recommend for approval</strong>, "Opens Gate 2. The approver is emailed. If none is chosen yet, you must choose one (not yourself).", "Submit and email approver"],
          [<strong key="c">Record comments as issued</strong>, <>Use after you have emailed comments to the supplier yourself. The ITP moves to <em>With supplier</em>. See <strong>Issuing Comments to the Supplier</strong>.</>, "Record comments as issued"],
          [<strong key="d">Reject</strong>, "Not acceptable as issued. A written reason is required and is emailed to the uploader to pass to the supplier.", "Reject ITP"],
        ]}
      />
      <p style={pStyle}>A <strong>Review note</strong> box is optional (visible to the approver). Rejection needs a reason.</p>
      <h3 style={h3Style}>Gate 2: the approver</h3>
      <p style={pStyle}>Only the named approver sees the <strong>Your approval</strong> panel, with the reviewer&apos;s note quoted at the top.</p>
      <SimpleTable
        head={["Decision", "What it does"]}
        rows={[
          [<strong key="a">Approve Rev X</strong>, "The revision becomes the controlled revision. The reviewer and uploader are emailed."],
          [<strong key="b">Return to reviewer</strong>, "Reopens Gate 1 with your reason. Nothing goes to the supplier. A reason is required."],
          [<strong key="c">Reject to supplier</strong>, "Goes back to the uploader with your reason, for the supplier. A reason is required."],
        ]}
      />
      <div style={mockPanel}>
        <div style={mockLabel}>Your review · Rev B</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
          <span style={chip.waiting}>Due 26 Nov</span><span style={{ fontSize: 11, color: imsColours.muted }}>Louise Harvey approves next.</span>
        </div>
        {[
          ["Share for team comments", "Colleagues you choose are emailed and add their comments. Nothing goes to the supplier yet.", false],
          ["Recommend for approval", "Sends it to the approver for the second gate.", true],
          ["Record comments as issued", "Use after you have sent your own email to the supplier.", false],
          ["Reject", "Not acceptable as issued. A written reason is required.", false],
        ].map(([title, text, on]) => (
          <div key={String(title)} style={{ display: "flex", gap: 8, padding: "7px 10px", border: `1px solid ${on ? imsColours.brandAccent : imsColours.border}`, borderRadius: 8, background: on ? imsColours.brandSoft : "#fff", marginBottom: 6 }}>
            <span>{on ? "◉" : "○"}</span><div><strong>{title}</strong><div style={{ fontSize: 11, color: imsColours.muted }}>{text}</div></div>
          </div>
        ))}
        <span style={btn("primary")}>Submit and email approver</span>
      </div>
      <h3 style={h3Style}>People on this ITP</h3>
      <p style={pStyle}>
        This card shows the <Code>Reviewer · Gate 1</Code>, the <Code>Approver · Gate 2</Code> and <Code>Also copied on every email</Code>. The uploader, the reviewer, the Quality Lead or an administrator can change them (only the Quality Lead, an administrator or the uploader can change the reviewer). Changing the person at an open gate emails the new person and <strong>restarts that gate&apos;s three-day clock</strong>. The approver cannot also be the reviewer; an administrator can override this by giving a reason, which is recorded in the activity trail. People are locked once an ITP is approved.
      </p>
      <h3 style={h3Style}>Reminders</h3>
      <p style={pStyle}>
        The IMS emails whoever holds a gate: the day before it is due, then daily once overdue (the Quality Lead is copied on the third overdue reminder, then it drops to weekly). The reviewer, uploader, Quality Lead or an administrator can also use <strong>Send a reminder now</strong> (once a day). If a gate has no one assigned, the uploader is nudged.
      </p>
      <h3 style={h3Style}>When it is With supplier or Approved</h3>
      <p style={pStyle}>
        <strong>With supplier</strong> means comments were issued or the ITP was rejected; the next step is a new revision from the supplier (<strong>Upload new revision</strong>), which restarts Gate 1. <strong>Approved</strong> unlocks <strong>Linked records</strong>: counts of NOI points (W/H) and review points (R/A), with buttons to the NOI Tracker, Review Points and ITP Sign-Off.
      </p>
      <Note>Comments from an earlier revision that are still marked <strong>Open</strong> are flagged on the new revision. Check the new revision deals with them, then close them in the Comments panel.</Note>
    </>
  );
}

// ── Team comments ─────────────────────────────────────────────────────────────

function SectionTeamComments() {
  return (
    <>
      <Heading group="Team Comments" title="Team Comments (Gate 1)" />
      <p style={pStyle}>
        Sometimes the reviewer wants colleagues&apos; views before deciding what goes back to the supplier. Team comments let the reviewer share the ITP inside Enshore, collect everyone&apos;s comments on the ITP page, and then decide. <strong>The supplier decision always stays with the reviewer</strong>, and nothing reaches the supplier from this step.
      </p>
      <div style={flowWrap}>
        <div style={flowStep()}>Reviewer shares</div><span style={arrow}>→</span>
        <div style={flowStep()}>Colleagues comment</div><span style={arrow}>→</span>
        <div style={flowStep()}>Each presses finished</div><span style={arrow}>→</span>
        <div style={flowStep(true)}>Reviewer collates and decides</div>
      </div>
      <h3 style={h3Style}>If you are the reviewer: sharing</h3>
      <div style={stepList}>
        <Step n={1}>Open the ITP and, in <strong>Your review</strong>, choose <strong>Share for team comments</strong>.</Step>
        <Step n={2}>Under <Code>Who should comment?</Code> pick people (from People Management only). The list starts with the approver and anyone copied in, minus you and anyone already asked. Add or remove as needed.</Step>
        <Step n={3}>Set <Code>Comments due by</Code>. It defaults to three working days ahead and cannot be in the past.</Step>
        <Step n={4}>Edit the <Code>Note to them</Code> if you wish (optional), then click <strong>Share for comments</strong>. Each person is emailed straight away.</Step>
      </div>
      <p style={pStyle}>You can share again later with more people: the option then reads <strong>Share with more people</strong>.</p>
      <div style={mockPanel}>
        <div style={mockLabel}>Team comments</div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <strong>Team comments</strong><span style={chip.waiting}>1 of 3 finished</span>
        </div>
        {[
          ["Andy Miller", "Has no comments · finished 24 Nov", "finished"],
          ["Sam Okafor", "2 comments so far · due 25 Nov", "waiting"],
          ["Priya Shah", "due 25 Nov · 1 day late", "late"],
        ].map(([name, sub, status]) => (
          <div key={name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 10px", border: `1px solid ${imsColours.border}`, borderRadius: 8, background: "#fff", marginBottom: 6 }}>
            <div><strong>{name}</strong><div style={{ fontSize: 11, color: imsColours.muted }}>{sub}</div></div>
            {status === "finished" ? <span style={chip.finished}>Finished</span> : <span style={{ display: "flex", gap: 6, alignItems: "center" }}><span style={status === "late" ? pill(imsColours.panel, imsColours.danger) : chip.waiting}>Waiting</span><span style={btn("ghost")}>Remind</span></span>}
          </div>
        ))}
        <div style={{ fontSize: 11, color: imsColours.muted }}>You can decide at any point. Anyone who has not finished is told the review has moved on, and their comments stay on the page.</div>
      </div>
      <h3 style={h3Style}>While you wait</h3>
      <div style={stepList}>
        <Step n={1}>The progress bar on the ITP shows <em>Team comments 1 of 3</em>, and the <strong>Team comments</strong> card lists each person as <span style={chip.waiting}>Waiting</span> or <span style={chip.finished}>Finished</span>, with how many comments they have added and any days late.</Step>
        <Step n={2}>Use <strong>Remind</strong> beside a person to nudge them. It works once a day per person and then shows <em>Reminded today</em>. Late requests are also chased automatically.</Step>
        <Step n={3}>You are emailed each time someone finishes, and again when <strong>everyone</strong> has finished.</Step>
        <Step n={4}>When you are ready, tick and issue the comments (see <strong>Issuing Comments to the Supplier</strong>) or choose any other decision. You do not have to wait for everybody.</Step>
      </div>
      <h3 style={h3Style}>If you have been asked to comment</h3>
      <div style={stepList}>
        <Step n={1}>Open the link in the email. The ITP shows a <strong>Your comments are wanted</strong> panel with the due date and the reviewer&apos;s note.</Step>
        <Step n={2}>Click <strong>Open document ↗</strong> and read it.</Step>
        <Step n={3}>Click <strong>Go to comments</strong>. In <strong>Add a comment</strong> enter an optional <Code>Section / ref</Code> and your comment, then <strong>Add comment</strong>. Add as many as you need.</Step>
        <Step n={4}>Press <strong>I have finished commenting</strong>. If you added nothing the button reads <strong>I have no comments</strong>. The reviewer is emailed.</Step>
      </div>
      <Note>You can read everything on the ITP but only the reviewer can record the decision. Once the reviewer has moved the ITP on, comments are closed and the finish button no longer works. Your earlier comments stay on the ITP.</Note>
    </>
  );
}

function SectionIssuing() {
  return (
    <>
      <Heading group="Team Comments" title="Issuing Comments to the Supplier" />
      <p style={pStyle}>
        The IMS does not email the supplier for you. The reviewer sends their own email, so their signature and recipients are used, and then records here that comments were issued. The IMS prepares the text and files.
      </p>
      <div style={stepList}>
        <Step n={1}>In <strong>Your review</strong> choose <strong>Record comments as issued</strong>.</Step>
        <Step n={2}>Under <strong>Comments to issue to the supplier</strong>, every comment already on the page is ticked (including team comments). <strong>Untick anything internal.</strong> Unticked comments stay on the ITP with no Open marker and do not go to the supplier.</Step>
        <Step n={3}>Add anything else under <strong>Add another comment</strong> (<Code>Section / ref</Code> and <Code>What needs to change?</Code>); <strong>+ Add another comment</strong> adds a row.</Step>
        <Step n={4}>Check the <strong>Text for your email to the supplier</strong>. Tick <strong>Show who raised each comment</strong> if you want names on it.</Step>
        <Step n={5}>Click <strong>Copy for email</strong> and paste it into your own email, or click <strong>Download Word</strong> or <strong>Download Excel</strong> to attach a comments table. Copying does not email anyone.</Step>
        <Step n={6}>After your email has gone, click <strong>I have sent it. Record as issued</strong> (or <strong>Record comments as issued</strong>).</Step>
      </div>
      <div style={mockPanel}>
        <div style={mockLabel}>Comments to issue to the supplier</div>
        {[
          ["4.2 · Louise Harvey", "Hold point missing before pull-in.", true],
          ["General · Sam Okafor", "Internal note on schedule. Not for supplier.", false],
        ].map(([head, body, on]) => (
          <div key={String(head)} style={{ display: "flex", gap: 8, padding: "7px 10px", border: `1px solid ${imsColours.border}`, borderRadius: 8, background: on ? "#fff" : imsColours.page, opacity: on ? 1 : 0.7, marginBottom: 6 }}>
            <span>{on ? "☑" : "☐"}</span><div><div style={{ fontSize: 10, fontWeight: 800, color: imsColours.muted }}>{head}</div>{body}</div>
          </div>
        ))}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
          <span style={btn("primary")}>Copy for email</span><span style={btn("ghost")}>Download Word</span><span style={btn("ghost")}>Download Excel</span>
        </div>
      </div>
      <h3 style={h3Style}>What happens when you record it</h3>
      <p style={pStyle}>
        The ITP moves to <strong>With supplier</strong>. Each ticked comment becomes a <strong>Supplier comment</strong> with an <span style={chip.waiting}>Open</span> marker; close each (<strong>Close</strong>) as the supplier&apos;s revised ITP deals with it. The activity trail records who issued how many comments and notes that nothing was emailed by the IMS. Tick <strong>Also email … to say comments were issued</strong> if you want the uploader told as well. A <strong>Reject</strong> always emails the uploader with the reason.
      </p>
      <h3 style={h3Style}>The Word and Excel files</h3>
      <p style={pStyle}>
        Both are named like <Code>ITP-285-Rev-B-comments</Code> and hold a table with <em>No.</em>, <em>Section / ref</em>, <em>Comment</em>, optionally <em>Raised by</em>, and an empty <em>Supplier response</em> column for the supplier to fill in. Downloads are built to save reliably on phones and tablets as well as desktops.
      </p>
      <Note tone="warning">If your browser will not copy automatically, the text is selected for you; press Ctrl+C. Do not click <strong>Record as issued</strong> until your email to the supplier has actually been sent.</Note>
    </>
  );
}

function SectionPhaseSignOff() {
  return (
    <>
      <Heading group="Stage Gates & Sign-off" title="ITP Phase Sign-Off" />
      <p style={pStyle}>
        This is a separate tool from the two-gate review. <strong>ITP Sign-Off</strong> sends complete numbered phases of an ITP to an outside person (for example a client) for a verified <strong>Approve</strong> or <strong>Reject</strong>. No drawn signature is needed: the evidence is the person&apos;s name, their verified email, the decision and the exact date and time.
      </p>
      <h3 style={h3Style}>Sending a request</h3>
      <div style={stepList}>
        <Step n={1}>Open the <strong>ITP Sign-Off</strong> tab and use <strong>Create sign-off request</strong>.</Step>
        <Step n={2}>Choose <strong>Use a tracked ITP</strong> and pick it from <Code>Tracked ITP</Code> (it uses the current revision), or choose <strong>Upload a document</strong> and select the file.</Step>
        <Step n={3}>Enter the <Code>Recipient email</Code>.</Step>
        <Step n={4}>Wait while the IMS finds the <strong>Detected phase headings</strong>. Tick each phase you want to send, then tick the individual tasks within it (<strong>Select all</strong> and <strong>Clear</strong> help). At least one task per phase is needed.</Step>
        <Step n={5}>Click <strong>Send N tasks in M phases</strong>. Each phase becomes its own request with its own decision.</Step>
      </div>
      <Note>For a large file use <strong>Use a tracked ITP</strong>. Files over about 4 MB cannot be uploaded directly on this page.</Note>
      <h3 style={h3Style}>What the recipient does</h3>
      <div style={stepList}>
        <Step n={1}>They open the link in their email, which shows the ITP, the phase and every task included.</Step>
        <Step n={2}>They enter their full name, click <strong>Send code to</strong> their email address, and type the six-digit <Code>Email verification code</Code>.</Step>
        <Step n={3}>They click <strong>Approve phase</strong> or <strong>Reject phase</strong> (a reason is required when rejecting).</Step>
        <Step n={4}>An evidence certificate PDF is generated and the link cannot be used again.</Step>
      </div>
      <h3 style={h3Style}>The Sign-off evidence register</h3>
      <p style={pStyle}>
        The page shows <em>Requests</em>, <em>Pending</em>, <em>Approved</em> and <em>Rejected</em> tiles, then one row per phase: ITP, phase, number of items (click to list them), recipient and when it was sent, <strong>Status</strong>, decision evidence (name, email, note and a SHA-256 fingerprint), decision date and time, and <strong>Open ITP</strong> / <strong>Certificate PDF</strong> links. Until a reply arrives the evidence shows <em>Awaiting response</em>.
      </p>
      <div style={mockPanel}>
        <div style={mockLabel}>Sign-off evidence register</div>
        <SimpleTable
          head={["ITP", "Phase", "Recipient", "Status", "Decision evidence", "Documents"]}
          rows={[
            ["ITP-285 RevB.xlsx", <><strong key="p">Phase 3</strong><br />Pull-in</>, "client@example.com", <span key="s" style={chip.approved}>Approved</span>, "J. Smith · 24/11/2026 10:42", "Open ITP · Certificate PDF"],
            ["ITP-285 RevB.xlsx", <><strong key="p">Phase 4</strong><br />Termination</>, "client@example.com", <span key="s" style={chip.waiting}>Pending</span>, "Awaiting response", "Open ITP"],
          ]}
        />
      </div>
    </>
  );
}

// ── NOI ───────────────────────────────────────────────────────────────────────

function SectionNoiTracker() {
  return (
    <>
      <Heading group="Notices of Inspection" title="NOI Tracker" />
      <p style={pStyle}>
        The NOI Tracker is the register of <strong>witness (W)</strong> and <strong>hold (H)</strong> points that Enshore must be told about, taken from the current revision of each supplier ITP. Each point is tracked from <em>Planned</em> through to <em>Completed</em>.
      </p>
      <Tiles items={[["84", "Total Points"], ["60", "Contains W"], ["31", "Contains H"], ["7", "Composite Codes"], ["52", "Outstanding"]]} />
      <h3 style={h3Style}>Adding points by scanning an ITP</h3>
      <p style={pStyle}>Open <strong>ITP scanner</strong> (<em>Extract or add W/H points</em>); the panel is collapsed until you click it.</p>
      <div style={stepList}>
        <Step n={1}>Pick the <Code>Current ITP</Code> and click <strong>Scan current revision</strong>. Only the current revision is scanned, so approve or upload the right revision first.</Step>
        <Step n={2}>The IMS finds the inspection columns in the ITP (PDF, Word or Excel). Under <strong>Choose Enshore&apos;s column</strong> click the card that is Enshore&apos;s column. It may be marked <em>Suggested</em> or <em>Your choice</em>; a column that looks like the supplier&apos;s is marked <em>Supplier</em>. Marks in other columns are ignored.</Step>
        <Step n={3}>Leave <strong>Remember this choice for ITPs with these columns</strong> ticked to save repeating this for similar ITPs.</Step>
        <Step n={4}>In <strong>Review extracted points</strong> untick anything that does not apply and correct any description or code.</Step>
        <Step n={5}>Click <strong>Add selected points to register</strong>. Points already in the register are not duplicated.</Step>
      </div>
      <Note tone="warning">If some pages are scanned images or have a layout that cannot be read as text, the IMS asks you to confirm before it sends those pages to an external vision service to read them. Choose <strong>Cancel</strong> to carry on without them and add those points manually.</Note>
      <p style={pStyle}>
        A second panel, <strong>Review points</strong>, lists review (R) and approval (A) marks found in the same column. <strong>Add selected review points</strong> sends them to the Review Points tab as Pending. See the <strong>ITP Review Points</strong> guide for what happens next.
      </p>
      <h3 style={h3Style}>Adding a point by hand</h3>
      <p style={pStyle}>
        Click <strong>Add manual point</strong> and complete <Code>Section / item *</Code>, <Code>Activity description *</Code> and <Code>W/H code *</Code>. The code must contain a W or an H, for example W, H, W/H or R/W. The other fields are optional. Click <strong>Add point to register</strong>.
      </p>
      <h3 style={h3Style}>The register</h3>
      <p style={pStyle}>
        <strong>Project NOI requirements</strong> groups the points under their ITP, with the supplier, the revision and an <em>x of y issued</em> progress bar. Filter by search, ITP number, ITP title, supplier, point type and status. Each filter only offers values that still match the others. Click <strong>Clear all</strong> to reset.
      </p>
      <div style={stepList}>
        <Step n={1}>Edit the activity, point code, <Code>Planned date</Code>, <Code>NOI number</Code> and <Code>Notes</Code> straight in the table. Changes save when you leave the field.</Step>
        <Step n={2}>Set <strong>Status</strong> to <em>Planned</em>, <em>NOI Required</em>, <em>NOI Issued</em>, <em>Completed</em> or <em>Cancelled</em>.</Step>
        <Step n={3}>The <strong>↗</strong> button on a row with an NOI number opens it in the NOI Creator. <strong>✕</strong> deletes a point (you are asked to confirm).</Step>
        <Step n={4}>Use <strong>Download Excel</strong> or <strong>Download PDF</strong> to export exactly what the current filters show.</Step>
      </div>
      <Note>Outstanding means any point that is not <em>Completed</em> or <em>Cancelled</em>. NOI Creator sets the status to <em>NOI Issued</em> for you when it issues a notice.</Note>
    </>
  );
}

function SectionNoiCreator() {
  return (
    <>
      <Heading group="Notices of Inspection" title="NOI Creator" />
      <p style={pStyle}>The NOI Creator produces a Notice of Inspection from points in the NOI Tracker, as a Word file and a PDF, and keeps the details so the NOI can be edited later.</p>
      <h3 style={h3Style}>Creating an NOI</h3>
      <div style={stepList}>
        <Step n={1}>Open the <strong>NOI Creator</strong> tab. Under <strong>Step 1 · Select inspection points</strong> choose the <Code>Supplier</Code> and tick the points the notice covers. One NOI covers one supplier&apos;s points.</Step>
        <Step n={2}>In <strong>Step 2 · Complete NOI details</strong> fill in <Code>Project details</Code>, <Code>Inspection date</Code>, <Code>Start time / duration</Code> and <Code>Inspection location</Code>. These four are required. If every ticked point has the same planned date it fills in for you.</Step>
        <Step n={3}>Add the <Code>Host</Code> name, telephone, position and email.</Step>
        <Step n={4}>Add attendees (name, company, contact number, email). Two rows are provided; <strong>Add attendee</strong> allows up to five.</Step>
        <Step n={5}>Click <strong>Generate NOI nnn · Word &amp; PDF</strong>.</Step>
      </div>
      <div style={mockPanel}>
        <div style={mockHero}>
          <div style={mockHeroEyebrow}>Wadden Sea · Inspection control</div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>NOI Creator</div>
        </div>
        <div style={mockRow}>
          <div style={mockField()}><div style={mockFieldLabel}>Supplier</div><div style={mockInput}>Stalkon</div></div>
          <div style={mockField(0.4)}><div style={mockFieldLabel}>NOI number</div><div style={mockInput}>NOI 012</div></div>
        </div>
        <div style={mockRow}>
          <div style={mockField()}><div style={mockFieldLabel}>Inspection date</div><div style={mockInput}>02/12/2026</div></div>
          <div style={mockField()}><div style={mockFieldLabel}>Start time / duration</div><div style={mockInput}>09:00 / 4 hours</div></div>
        </div>
        <span style={btn("primary")}>Generate NOI 012 · Word &amp; PDF</span>
      </div>
      <h3 style={h3Style}>What the IMS does for you</h3>
      <p style={pStyle}>
        The NOI number is the next in the project&apos;s sequence and cannot clash with an existing one. On generating, the ticked points are given that NOI number and the status <strong>NOI Issued</strong>, their planned date becomes the inspection date, and the Word and PDF are saved, downloaded and attached to the matching inspection record.
      </p>
      <h3 style={h3Style}>Editing or deleting an NOI</h3>
      <p style={pStyle}>
        Use the <strong>↗</strong> button on the NOI Tracker row. The saved details load, so change what you need and click <strong>Save changes to NOI nnn · Word &amp; PDF</strong>. <strong>Open saved Word</strong> and <strong>Open saved PDF</strong> download the last version. <strong>Delete NOI</strong> removes the saved files and returns its points to <em>Planned</em>; the number is then available again.
      </p>
      <Note>A NOI for an inspection added by hand on <strong>Overall Inspections</strong> is created from that page&apos;s edit link. The page then shows <em>Manual inspection being covered</em> instead of the point list.</Note>
    </>
  );
}

// ── Inspection records ────────────────────────────────────────────────────────

function SectionRecords() {
  return (
    <>
      <Heading group="Inspection Records" title="Inspection Records & Packs" />
      <p style={pStyle}>
        Inspection Records link the finished inspection paperwork (reports, certificates, photos) to the NOI it relates to, and email it to the people who need it as a single download.
      </p>
      <Tiles items={[["18", "Total Records"], ["14", "Complete"], ["4", "Pending Records"]]} />
      <p style={pStyle}><strong>Complete</strong> means the record has at least one file. A record with no files yet is <strong>Pending records</strong>. Use the <strong>Status</strong> filter to see either.</p>
      <h3 style={h3Style}>Adding a record</h3>
      <div style={stepList}>
        <Step n={1}>Open the <strong>Inspection Records</strong> tab and click <strong>＋ Add Inspection Record</strong>. On a pending record you can click <strong>＋ Add Records</strong> instead, which pre-selects that NOI.</Step>
        <Step n={2}>Tick the <Code>NOI references</Code> this record covers. Tick one, or several when one set of paperwork covers more than one NOI (for example eight NOIs issued to the same supplier). Only NOIs already issued on this project are listed, so a record never mixes projects.</Step>
        <Step n={3}>Under <strong>ITP Points Called Up</strong> the points are grouped by NOI. Tick which points this record covers (all are ticked to start), or use <strong>Clear all</strong> / <strong>Select all</strong> for a whole NOI.</Step>
        <Step n={4}>Add <strong>Recipients</strong>: name and email, then <strong>Add</strong>.</Step>
        <Step n={5}>Under <strong>Attach Records</strong> choose the files. PDF, Word, Excel, PowerPoint files and photos can all be attached, and several at once. Files can be added in more than one go and removed again. When the record covers several NOIs each file has <strong>Applies to</strong> tick boxes (all ticked means it applies to every NOI). Add optional <strong>Notes</strong>.</Step>
        <Step n={6}>Click <strong>Save Record</strong>. If you added recipients the button reads <strong>Save &amp; Send Notification</strong> and they are emailed as long as there is at least one file.</Step>
      </div>
      <div style={mockPanel}>
        <div style={mockLabel}>Inspection Records</div>
        <SimpleTable
          head={["NOI Ref", "ITP Points", "Files", "Status", "Document Pack", "Evidence"]}
          rows={[
            [<strong key="a" style={{ color: imsColours.brand }}>NOI-011</strong>, "§4.2 H  §4.3 W", "3", <span key="b" style={chip.approved}>Complete</span>, <span key="c" style={btn("ghost")}>Download ZIP</span>, <span key="d" style={btn("ghost")}>📎 Open Evidence</span>],
            [<strong key="e" style={{ color: imsColours.brand }}>NOI-012</strong>, "§5.1 W", "—", <span key="f" style={chip.waiting}>Pending records</span>, "—", <span key="g" style={btn("ghost")}>＋ Add Records</span>],
          ]}
        />
      </div>
      <h3 style={h3Style}>Opening a record</h3>
      <p style={pStyle}>
        <strong>Open Evidence</strong> shows the NOI, its points, who uploaded it and when, the recipients, each attached file with an <strong>Open ↗</strong> link, and any notes. From here you can <strong>Upload additional files to this record</strong>, and click <strong>Send Notification</strong> (or <strong>Resend Notification</strong>) to email the recipients again. A banner shows when it was last notified and how many times.
      </p>
      <h3 style={h3Style}>The document pack</h3>
      <p style={pStyle}>
        Recipients get an email listing the NOI, ITP and points, and a link to a <strong>ZIP of all the files</strong>. The link works for about six months and is on the storage domain, which recipients&apos; web filters normally allow. A very large record is split into numbered ZIPs (part 1 of 2 and so on), and the email says to download every part. The <strong>Download ZIP</strong> button in the table gives you the same pack yourself.
      </p>
      <Note>Files uploaded from a phone keep their right type, so Word, Excel and PowerPoint open in the right app. If a file link is blocked from opening in a new tab by a phone, it opens in the same tab; use Back to return.</Note>
    </>
  );
}

// ── Project registers ─────────────────────────────────────────────────────────

function SectionWadden() {
  return (
    <>
      <Heading group="Project Registers" title="Wadden Sea Reports & Open Points" />
      <p style={pStyle}>
        Wadden Sea has the same ITP, NOI and inspection tabs as every project, plus a <strong>Project Reports</strong> tab for the client reporting it needs. Its dashboard is the same layout (Overview, Inspection Planning, Project Controls).
      </p>
      <h3 style={h3Style}>Project Reports</h3>
      <p style={pStyle}>Five tabs sit across the top of the page:</p>
      <SimpleTable
        head={["Tab", "What it is for"]}
        rows={[
          [<strong key="a">Audit NCR Report</strong>, "Select audits and generate the Audit NCR annex as Word or PDF."],
          [<strong key="b">Audit Programme</strong>, "Select audits and generate the Audit Programme annex as Word or PDF."],
          [<strong key="c">8-Week Lookahead</strong>, "The next eight weeks of inspections, including those entered by hand on Overall Inspections, with Word and PDF export for the client."],
          [<strong key="d">Open Points</strong>, "The Wadden Sea Open Points register (below)."],
          [<strong key="e">MOC Register</strong>, "The project&apos;s MOC register as an annex."],
        ]}
      />
      <h3 style={h3Style}>Open Points</h3>
      <p style={pStyle}>
        An Open Point records physical work still outstanding after an inspection or test. The register has four views: <strong>Dashboard</strong> (tiles for Total Open, Critical, Major, Minor, Overdue, Employer Raised, Awaiting Verification and CDE Mirror Due, and an <em>ADM Compliance Monitor</em>), <strong>Register</strong>, <strong>Raise Open Point</strong> and <strong>Settings</strong>.
      </p>
      <div style={stepList}>
        <Step n={1}>Click <strong>Raise Open Point</strong>. Enter <Code>Title</Code>, <Code>Date Identified</Code>, <Code>Source</Code> (Enshore, Employer, Subcontractor or Supplier), <Code>Raised By</Code> and <Code>Owner</Code> (both from People), <Code>Severity</Code> (Critical, Major or Minor), <Code>Project Phase</Code> and <Code>What is outstanding?</Code>.</Step>
        <Step n={2}>Use <strong>Additional project links</strong> for company, inspection/test reference, SBS, WBS, a linked NCR and notes.</Step>
        <Step n={3}>Click <strong>Save Open Point</strong>. Click any row in <strong>Register</strong> to reopen and edit it.</Step>
        <Step n={4}>To close it, move <Code>Status</Code> to <em>Closed</em> (or <em>Formal Employer Close-out</em>) and complete <strong>Resolution and closure</strong>: resolution action, verifier, verification date and closure date, and upload closure or Employer evidence. Without all of these the IMS refuses to close it.</Step>
        <Step n={5}>Use <strong>Generate Closure Report</strong> for a single record, or <strong>Excel</strong>, <strong>Word</strong> and <strong>PDF</strong> on the register for the filtered list.</Step>
      </div>
      <p style={pStyle}>
        Statuses are <em>Draft</em>, <em>Open</em>, <em>In Progress</em>, <em>Ready for Verification</em>, <em>Employer Review</em>, <em>Closed</em>, <em>Converted to NCR</em> (needs a linked NCR), <em>Unable to Correct</em> (needs a reason; stays visibly open) and <em>Formal Employer Close-out</em> (needs the Employer reference).
      </p>
      <h3 style={h3Style}>Deadlines and the client system (CDE)</h3>
      <p style={pStyle}>
        Critical and Major points fall due at the end of their project phase and Minor points at Taking-Over, unless an agreed Employer extension or Taking-Over inclusion changes it. A point raised by the Employer gets a seven-day deadline to register it in the client&apos;s CDE. The <strong>Client Copy</strong> column shows when it was last copied; click it and enter the transmittal reference to record a copy. Overdue copies show as <em>Copy due</em>.
      </p>
      <Note tone="warning">The IMS is not connected to the client&apos;s CDE. Someone still has to upload the export there and then record it here. The phases, Taking-Over date, SBS and WBS values come from <strong>Settings</strong>, so keep them current or the deadline warnings cannot be relied on.</Note>
      <p style={pStyle}>
        Evidence is uploaded on the record under <strong>Evidence and Closure Records</strong> (types: Supporting Evidence, Closure Evidence, CDE Submission, Employer Acceptance, Joint Inspection, Formal Close-out) and opens from there. Every change is kept in a history.
      </p>
    </>
  );
}

// ── Reference ─────────────────────────────────────────────────────────────────

function Q({ q, children }: { q: string; children: ReactNode }) {
  return (
    <>
      <h3 style={h3Style}>{q}</h3>
      <p style={pStyle}>{children}</p>
    </>
  );
}

function SectionQuestions() {
  return (
    <>
      <Heading group="Reference" title="Common Questions" />
      <Q q="Why has nobody been emailed about my new ITP?">
        You did not choose a reviewer when you uploaded it, so Gate 1 has not started. Open the ITP and choose one under <strong>Choose a reviewer</strong>. They are emailed straight away and the three-day clock starts.
      </Q>
      <Q q="Why can I not press the decision button?">
        Only the named person can decide: the reviewer at Gate 1 and the approver at Gate 2. Everyone else sees <em>Waiting on …</em> and can read, comment and (if allowed) send a reminder. Check <strong>People on this ITP</strong>. If it should be you, ask the uploader, the Quality Lead or an administrator to reassign.
      </Q>
      <Q q="Can the same person review and approve?">
        No. They must be different people. An administrator can override this by giving a reason, which is logged.
      </Q>
      <Q q="I shared an ITP for team comments. Do I have to wait for everyone?">
        No. You can decide at any point. People who had not finished are told the review has moved on, and their comments stay on the ITP.
      </Q>
      <Q q="A colleague added comments. Do they go to the supplier automatically?">
        No. Nothing goes to the supplier from the IMS. You tick the comments you want to issue, copy or download them, and send your own email. Unticked comments stay internal.
      </Q>
      <Q q="The supplier has sent a new revision. What now?">
        Use <strong>Upload new revision</strong> (on the ITP record or the tracker). The earlier reviewer, approver and copy list carry forward and Gate 1 restarts. Check any earlier comments still marked <strong>Open</strong> and close those that are now dealt with.
      </Q>
      <Q q="My NOI scan found nothing, or the wrong marks.">
        Check you scanned the current revision, and choose Enshore&apos;s column in the column picker. If no columns could be read, use <strong>Add manual point</strong>. Marks that are R or A (review or approval) go to <strong>Review Points</strong>; see the ITP Review Points guide.
      </Q>
      <Q q="I need to change an NOI after it was issued.">
        Open it from the NOI Tracker with <strong>↗</strong>, edit the details and click <strong>Save changes to NOI nnn · Word &amp; PDF</strong>. Deleting an NOI returns its points to <em>Planned</em>.
      </Q>
      <Q q="Which files can I upload, and will they open on my phone?">
        PDF, Word, Excel and PowerPoint files and photos can be uploaded where the IMS asks for evidence or a document (the ITP upload itself takes Excel, PDF or Word). Files are stored with the right type, so they open in the correct app on a phone. If a phone blocks a new tab, the file opens in the same tab; use Back to return.
      </Q>
      <Q q="A download did not save on my phone.">
        Word, Excel and PDF downloads are built to save reliably on phones as well as desktops. If a download still fails, try once more, then check your browser&apos;s downloads list before asking for help.
      </Q>
      <h3 style={h3Style}>Status reference</h3>
      <SimpleTable
        head={["Where", "Status", "Meaning"]}
        rows={[
          ["ITP", <span key="a" style={chip.review}>Awaiting review</span>, "Gate 1. The reviewer has it."],
          ["ITP", <span key="b" style={chip.review}>Awaiting approval</span>, "Gate 2. The approver has it."],
          ["ITP", <span key="c" style={chip.supplier}>With supplier</span>, "Comments issued or rejected. Waiting for a new revision."],
          ["ITP", <span key="d" style={chip.approved}>Approved</span>, "The controlled revision."],
          ["NOI point", "Planned / NOI Required / NOI Issued / Completed / Cancelled", "Where the inspection point is in its life."],
          ["Inspection record", <span key="e" style={chip.waiting}>Pending records</span>, "No files attached yet."],
          ["Inspection record", <span key="f" style={chip.approved}>Complete</span>, "At least one file is attached."],
          ["Phase sign-off", "Pending / Approved / Rejected", "The outside person's verified decision on a phase."],
        ]}
      />
    </>
  );
}

const sectionComponents: Record<SectionKey, () => ReactElement> = {
  overview:     SectionOverview,
  workspace:    SectionWorkspace,
  tracker:      SectionTracker,
  upload:       SectionUpload,
  gates:        SectionGates,
  teamcomments: SectionTeamComments,
  issuing:      SectionIssuing,
  phasesignoff: SectionPhaseSignOff,
  noitracker:   SectionNoiTracker,
  noicreator:   SectionNoiCreator,
  records:      SectionRecords,
  wadden:       SectionWadden,
  questions:    SectionQuestions,
};

export const projectsGuide: GuideDefinition = {
  id: "projects",
  navLabel: "Projects & ITPs",
  guideLabel: "Project Management & ITPs",
  defaultSection: "overview",
  sections,
  sectionComponents,
};
