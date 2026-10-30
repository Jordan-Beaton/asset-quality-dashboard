import type { CSSProperties, ReactElement } from "react";
import { imsColours, imsTableStyle, imsTableHeadStyle, imsTableCellStyle } from "../imsTheme";
import {
  GuideDefinition, GuideSectionDef,
  eyebrow, h2Style, h3Style, pStyle, codeStyle,
  stepList, Step, callout,
  flowWrap, flowStep, arrow, pill,
} from "./guideKit";

type SectionKey =
  | "overview" | "signin" | "arrives" | "working" | "independent" | "closing"
  | "targets" | "team" | "problems" | "rules";

const sections: GuideSectionDef[] = [
  { key: "overview",    label: "Overview",                  group: "Getting Started" },
  { key: "signin",      label: "Your first sign-in",        group: "Getting Started" },
  { key: "arrives",     label: "When a report arrives",     group: "Handling a Report" },
  { key: "working",     label: "Working a case",            group: "Handling a Report" },
  { key: "independent", label: "HR, management or IT reports", group: "Handling a Report" },
  { key: "closing",     label: "Closing a case",            group: "Handling a Report" },
  { key: "targets",     label: "Targets and reminders",     group: "Reference" },
  { key: "team",        label: "Handlers and approvals",    group: "Reference" },
  { key: "problems",    label: "If something goes wrong",   group: "Reference" },
  { key: "rules",       label: "Dos and don'ts",            group: "Reference" },
];

function statusPill(label: string, tone: "brand" | "warn" | "plain" = "plain"): CSSProperties {
  void label;
  if (tone === "brand") return pill(imsColours.brand, "#ffffff");
  if (tone === "warn") return pill(imsColours.warning, imsColours.ink);
  return pill(imsColours.page, imsColours.ink);
}

function SectionOverview() {
  return (
    <>
      <div style={eyebrow}>Getting Started</div>
      <h2 style={h2Style}>Overview</h2>
      <p style={pStyle}>Speak Up is how Enshore employees raise a concern in confidence: a safety, quality, environmental, legal or integrity matter, or bullying and harassment. A reporter chooses to be <strong>anonymous</strong>, <strong>confidential</strong> (contact details given, seen only by handlers) or <strong>named</strong>. They reach the page by scanning a QR code or opening a link. They do not sign in.</p>
      <div style={flowWrap}>
        <div style={flowStep()}>Report sent</div><div style={arrow}>→</div>
        <div style={flowStep()}>Every handler emailed</div><div style={arrow}>→</div>
        <div style={flowStep()}>One handler assigned</div><div style={arrow}>→</div>
        <div style={flowStep()}>Investigated, with the reporter kept informed</div><div style={arrow}>→</div>
        <div style={flowStep(true)}>Outcome shared and case closed</div>
      </div>
      <h3 style={h3Style}>Why nobody else can read a report</h3>
      <p style={pStyle}>A report is locked on the reporter&apos;s own phone before it is sent. It can only be unlocked with the key of a handler it was locked for. The IMS administrator and the people who run the database cannot read it. The system holds no network addresses and sets no tracking cookies for reporters. The reporter gets a <strong>reference</strong> and a one-time <strong>access code</strong>, and that is the only way back into their case.</p>
      <div style={callout("info")}>
        <span>ℹ</span>
        <div>Because the locking happens in the browser, <strong>nobody can recover a lost passphrase or access code</strong>. Treat both as you would a password to a safe.</div>
      </div>
      <h3 style={h3Style}>Two groups of handlers</h3>
      <p style={pStyle}><strong>Case handlers</strong> receive ordinary reports. <strong>Independent handlers</strong> receive reports where the reporter ticked <em>involves HR, management or IT</em>, so that the people concerned never see them.</p>
    </>
  );
}

function SectionSignIn() {
  return (
    <>
      <div style={eyebrow}>Getting Started</div>
      <h2 style={h2Style}>Your first sign-in</h2>
      <p style={pStyle}>You are on the handler list once the IMS administrator has added your work email. Before you can read anything you set up two protections.</p>
      <div style={stepList}>
        <Step n={1}>Sign in to the IMS and open the <strong>Speak Up</strong> tile, then <strong>Cases</strong>.</Step>
        <Step n={2}>On <strong>Confirm it is you</strong>, scan the QR code with an authenticator app on your phone (for example Microsoft Authenticator) and type in the 6-digit number it shows. Next time you only type the number.</Step>
        <Step n={3}>On <strong>Set up your case key</strong>, choose a passphrase of at least 16 characters: four or more unrelated words, or 24 or more characters. Avoid obvious words and patterns. Store it in your password manager.</Step>
        <Step n={4}>You are now <strong>waiting for approval</strong>. Another handler approves you from their <strong>Handlers</strong> tab after checking your <strong>key fingerprint</strong> with you. It is shown on your own Handlers tab: read it to them in person or by phone. You receive reports once approved.</Step>
      </div>
      <h3 style={h3Style}>Every visit after that</h3>
      <p style={pStyle}>You enter the authenticator number, then your passphrase. The screen locks itself after 15 quiet minutes, and you can use <strong>Lock now</strong> whenever you step away.</p>
      <div style={callout("warning")}>
        <span>⚠</span>
        <div>If a message ever says your key does not match, or has changed, <strong>do not open any cases</strong>. Tell HR and the IMS administrator straight away.</div>
      </div>
    </>
  );
}

function SectionArrives() {
  return (
    <>
      <div style={eyebrow}>Handling a Report</div>
      <h2 style={h2Style}>When a report arrives</h2>
      <p style={pStyle}>Every approved handler who can open the report gets the same short email: <em>Speak Up: a new report has been received</em>. It holds the reference only, never any detail of the report.</p>
      <div style={stepList}>
        <Step n={1}>Click <strong>Open this case</strong> in the email. Sign in, enter your authenticator number and passphrase, and the case opens.</Step>
        <Step n={2}>Read the report. Look at the category, whether contact details were given, and any photos (<strong>View</strong>).</Step>
        <Step n={3}>In <strong>Assigned to</strong>, click <strong>Assign to me</strong>, or choose a colleague who can open the case and click <strong>Assign</strong>. The assigned handler looks after the case, and is the only person emailed when the reporter writes back.</Step>
        <Step n={4}>Acknowledge the report within 7 days: send the reporter a message, or set the status to <span style={statusPill("Acknowledged")}>Acknowledged</span>.</Step>
      </div>
      <div style={callout("info")}>
        <span>ℹ</span>
        <div>Until someone assigns the case it shows an amber <strong>Unassigned</strong> badge and counts under the <strong>Unassigned</strong> card on the register. If you cannot take it, you can leave it for a colleague, or return it with <strong>Return to unassigned</strong>, and everyone is emailed again.</div>
      </div>
      <p style={pStyle}>A colleague can only be assigned a case they can already open. A handler approved after a report arrived does not see it until you share it with them under <strong>Who can see this case</strong>.</p>
    </>
  );
}

function SectionWorking() {
  return (
    <>
      <div style={eyebrow}>Handling a Report</div>
      <h2 style={h2Style}>Working a case</h2>
      <h3 style={h3Style}>Talking to the reporter</h3>
      <p style={pStyle}>Use <strong>Messages</strong> in the case. The reporter sees your message when they check their case with their reference and access code; an anonymous reporter cannot be contacted any other way. Ask for what you need to look into the concern, and <strong>never ask who they are</strong> if they chose not to say.</p>
      <p style={pStyle}>When the reporter replies, the assigned handler is emailed once. A <span style={statusPill("New reply", "warn")}>New reply from reporter</span> badge shows in the register until you answer.</p>
      <h3 style={h3Style}>Statuses</h3>
      <table style={imsTableStyle}>
        <thead><tr>{["Status", "Meaning"].map((h) => <th key={h} style={imsTableHeadStyle}>{h}</th>)}</tr></thead>
        <tbody>
          <tr><td style={imsTableCellStyle}><span style={statusPill("Received")}>Received</span></td><td style={imsTableCellStyle}>Arrived, not yet acknowledged.</td></tr>
          <tr><td style={imsTableCellStyle}><span style={statusPill("Acknowledged")}>Acknowledged</span></td><td style={imsTableCellStyle}>The reporter has been told it is being looked at.</td></tr>
          <tr><td style={imsTableCellStyle}><span style={statusPill("Investigating")}>Investigating</span></td><td style={imsTableCellStyle}>Under investigation.</td></tr>
          <tr><td style={imsTableCellStyle}><span style={statusPill("Awaiting reporter")}>Awaiting reporter</span></td><td style={imsTableCellStyle}>You have asked the reporter something. Sending a message sets this automatically; their reply moves it back to Investigating.</td></tr>
          <tr><td style={imsTableCellStyle}><span style={statusPill("Outcome shared")}>Outcome shared</span></td><td style={imsTableCellStyle}>The reporter has been told what happened.</td></tr>
          <tr><td style={imsTableCellStyle}><span style={statusPill("Closed", "brand")}>Closed</span></td><td style={imsTableCellStyle}>Finished. Needs an outcome and starts the retention clock.</td></tr>
        </tbody>
      </table>
      <p style={pStyle}>Every opening, message, status change, assignment and share is recorded in the case&apos;s <strong>Activity log</strong>. The log never holds anything the reporter wrote.</p>
    </>
  );
}

function SectionIndependent() {
  return (
    <>
      <div style={eyebrow}>Handling a Report</div>
      <h2 style={h2Style}>HR, management or IT reports, and conflicts of interest</h2>
      <p style={pStyle}>When a reporter ticks <em>This involves someone in HR, management or IT</em>, the report goes <strong>only to independent handlers</strong>. Ordinary case handlers are not emailed, cannot see it in the register and cannot open it. The case shows an <strong>Independent route</strong> badge.</p>
      <h3 style={h3Style}>If you have a conflict of interest</h3>
      <p style={pStyle}>If a report concerns you, a close colleague or your own work, do not handle it. Open the case and click <strong>I have a conflict of interest</strong>, give a short reason, and pass it to the other group. It moves to everyone approved in that group, becomes unassigned, and you lose access to it straight away. The reason is recorded in the activity log.</p>
      <div style={callout("info")}>
        <span>ℹ</span>
        <div>A person who holds <strong>both</strong> roles has no other group to pass a case to. Ask the IMS administrator to change the role of whoever is conflicted, or to reassign the case.</div>
      </div>
    </>
  );
}

function SectionClosing() {
  return (
    <>
      <div style={eyebrow}>Handling a Report</div>
      <h2 style={h2Style}>Closing a case</h2>
      <div style={stepList}>
        <Step n={1}>Tell the reporter what happened, in a message, in general terms. Set the status to <span style={statusPill("Outcome shared")}>Outcome shared</span> if you want that recorded.</Step>
        <Step n={2}>In <strong>Status</strong>, choose <span style={statusPill("Closed", "brand")}>Closed</span>, then an <strong>Outcome</strong>: <em>No further action</em> or <em>Action taken</em>. Click <strong>Update status</strong>.</Step>
        <Step n={3}>The case now shows a <strong>Keep until</strong> date. The reporter sees the outcome in plain words when they check their case, and can no longer add messages.</Step>
      </div>
      <h3 style={h3Style}>Keeping and deleting</h3>
      <p style={pStyle}>Closed cases are kept for <strong>12 months</strong> when no further action was taken and <strong>6 years</strong> when action was taken. These periods are subject to confirmation by HR and legal. When the date passes, the case appears under <strong>Due for deletion</strong>, where it can be deleted permanently, including its photos. Deletion cannot be undone. A closed case can be reopened by changing its status.</p>
    </>
  );
}

function SectionTargets() {
  return (
    <>
      <div style={eyebrow}>Reference</div>
      <h2 style={h2Style}>Targets and reminders</h2>
      <p style={pStyle}>Enshore&apos;s internal targets are to <strong>acknowledge a report within 7 days</strong> and to <strong>give the reporter feedback within 3 months</strong>. The register shows amber and red badges as these approach and pass.</p>
      <h3 style={h3Style}>Daily reminder email</h3>
      <p style={pStyle}>Each morning every handler receives one email listing the cases that need them, if there are any. It holds references and dates only. The assigned handler is told about their own cases; an unassigned case is listed for everyone who can open it. A case is listed when:</p>
      <table style={imsTableStyle}>
        <thead><tr>{["Reason", "When"].map((h) => <th key={h} style={imsTableHeadStyle}>{h}</th>)}</tr></thead>
        <tbody>
          <tr><td style={imsTableCellStyle}>Acknowledgement due or overdue</td><td style={imsTableCellStyle}>Not yet acknowledged, and 2 days or less remain (or past due)</td></tr>
          <tr><td style={imsTableCellStyle}>Feedback due or overdue</td><td style={imsTableCellStyle}>No outcome shared yet, and 14 days or less remain (or past due)</td></tr>
          <tr><td style={imsTableCellStyle}>Not assigned</td><td style={imsTableCellStyle}>Nobody has taken the case for more than a day</td></tr>
          <tr><td style={imsTableCellStyle}>Reporter message waiting</td><td style={imsTableCellStyle}>The reporter wrote last and has had no reply for more than 2 days</td></tr>
        </tbody>
      </table>
    </>
  );
}

function SectionTeam() {
  return (
    <>
      <div style={eyebrow}>Reference</div>
      <h2 style={h2Style}>Handlers and approvals</h2>
      <p style={pStyle}>The <strong>IMS administrator</strong> manages the list in <strong>Admin / Settings, Speak Up</strong>: adding and removing people, changing roles, and making the poster. The administrator <strong>cannot approve</strong> anyone to receive reports.</p>
      <p style={pStyle}>A new handler, a new role, or someone reactivated after removal waits for approval from a handler who already holds that role. The first person in each group is approved automatically because nobody can approve them.</p>
      <h3 style={h3Style}>Approving a colleague</h3>
      <div style={stepList}>
        <Step n={1}>Open <strong>Handlers</strong>. Anyone waiting appears under <strong>Waiting for your approval</strong>, and you are emailed when someone sets up their key.</Step>
        <Step n={2}>Ask them, in person or by phone, to read out the <strong>key fingerprint</strong> on their own Handlers tab. Check it matches the one shown to you.</Step>
        <Step n={3}>Click <strong>Approve</strong>. They receive reports that arrive from now on. To give them an earlier case, share it under <strong>Who can see this case</strong>.</Step>
      </div>
      <p style={pStyle}>Every change to the list is emailed to the handlers and shown in <strong>Recent changes to the handler list</strong>. If you see a change you did not expect, tell HR straight away.</p>
    </>
  );
}

function SectionProblems() {
  return (
    <>
      <div style={eyebrow}>Reference</div>
      <h2 style={h2Style}>If something goes wrong</h2>
      <table style={imsTableStyle}>
        <thead><tr>{["Problem", "What to do"].map((h) => <th key={h} style={imsTableHeadStyle}>{h}</th>)}</tr></thead>
        <tbody>
          <tr><td style={imsTableCellStyle}>You forgot your passphrase</td><td style={imsTableCellStyle}>It cannot be recovered. Tell the IMS administrator, who resets your key in <code style={codeStyle}>Admin / Settings, Speak Up</code>. You then set a new passphrase and need approval again. Ask a colleague to share your open cases with themselves first, as any case only you could open becomes unreadable.</td></tr>
          <tr><td style={imsTableCellStyle}>A message says your key does not match or has changed</td><td style={imsTableCellStyle}>Do not open cases. Tell HR and the IMS administrator straight away.</td></tr>
          <tr><td style={imsTableCellStyle}>A reporter lost their access code</td><td style={imsTableCellStyle}>It cannot be recovered and you cannot identify them. They can send a new report.</td></tr>
          <tr><td style={imsTableCellStyle}>A case was assigned to the wrong person</td><td style={imsTableCellStyle}>Open it and assign it again, or use <strong>Return to unassigned</strong>.</td></tr>
          <tr><td style={imsTableCellStyle}>A case was closed by mistake</td><td style={imsTableCellStyle}>Change its status to reopen it. The outcome and keep-until date clear.</td></tr>
          <tr><td style={imsTableCellStyle}>You are going away</td><td style={imsTableCellStyle}>Return your assigned cases to unassigned, or assign them to a colleague who can open them, before you go.</td></tr>
        </tbody>
      </table>
    </>
  );
}

function SectionRules() {
  return (
    <>
      <div style={eyebrow}>Reference</div>
      <h2 style={h2Style}>Dos and don&apos;ts</h2>
      <h3 style={h3Style}>Do</h3>
      <div style={stepList}>
        <Step n={1}>Keep everything about a report inside the case. Use its messages and its activity log.</Step>
        <Step n={2}>Treat the identity of a reporter who gave contact details as strictly confidential, and share it only if they agree.</Step>
        <Step n={3}>Give feedback in good time, even if it is only that the matter is still being looked into.</Step>
        <Step n={4}>Lock the screen, or use <strong>Lock now</strong>, whenever you step away.</Step>
      </div>
      <h3 style={h3Style}>Don&apos;t</h3>
      <div style={stepList}>
        <Step n={1}>Try to work out who an anonymous reporter is, or ask them to say.</Step>
        <Step n={2}>Copy, forward, print or screenshot a report, or paste it into email, chat or another system.</Step>
        <Step n={3}>Discuss a case with anyone who does not need to know, including the person it concerns.</Step>
        <Step n={4}>Allow any detriment to a reporter for raising a concern.</Step>
      </div>
      <div style={callout("info")}>
        <span>ℹ</span>
        <div>This guide explains how the system works. The whistleblowing procedure owned by HR sets out what Enshore expects of you in handling a concern, and takes precedence.</div>
      </div>
    </>
  );
}

const sectionComponents: Record<SectionKey, () => ReactElement> = {
  overview: SectionOverview,
  signin: SectionSignIn,
  arrives: SectionArrives,
  working: SectionWorking,
  independent: SectionIndependent,
  closing: SectionClosing,
  targets: SectionTargets,
  team: SectionTeam,
  problems: SectionProblems,
  rules: SectionRules,
};

export const speakUpGuide: GuideDefinition = {
  id: "speak-up",
  navLabel: "Speak Up",
  guideLabel: "Speak Up (handlers)",
  defaultSection: "overview",
  sections,
  sectionComponents,
};
