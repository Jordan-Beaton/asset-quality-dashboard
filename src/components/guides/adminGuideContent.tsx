import type { CSSProperties, ReactElement, ReactNode } from "react";
import { imsColours, imsTableStyle, imsTableHeadStyle, imsTableCellStyle } from "../imsTheme";
import {
  GuideDefinition, GuideSectionDef,
  eyebrow, h2Style, h3Style, pStyle, codeStyle,
  stepList, Step, callout,
  mockPanel, mockHero, mockHeroEyebrow, mockLabel, flowWrap, flowStep, arrow,
  mockInput, mockFieldLabel, mockRow, mockField, btn, pill,
} from "./guideKit";

type SectionKey =
  | "overview" | "people" | "refdata" | "invite" | "links" | "requests"
  | "permissions" | "deactivate" | "modsettings" | "reference" | "faq";

const sections: GuideSectionDef[] = [
  { key: "overview",    label: "Overview",                      group: "Getting Started" },
  { key: "people",      label: "The People Register",           group: "Getting Started" },
  { key: "refdata",     label: "Departments, Projects & Parts", group: "Setting Up the System" },
  { key: "invite",      label: "Inviting a New User",           group: "Users & Access" },
  { key: "links",       label: "Invite, Setup Link & Passwords", group: "Users & Access" },
  { key: "requests",    label: "Access Requests",               group: "Users & Access" },
  { key: "permissions", label: "Roles & Permissions",           group: "Users & Access" },
  { key: "deactivate",  label: "Deactivating People",           group: "Users & Access" },
  { key: "modsettings", label: "Module Settings & Audit Log",   group: "Settings" },
  { key: "reference",   label: "Reference",                     group: "Reference" },
  { key: "faq",         label: "Common Questions",              group: "Reference" },
];

function statusPill(label: string, tone: "good" | "warn" | "danger" | "neutral" = "neutral"): ReactElement {
  const map = {
    good:    { bg: imsColours.brand,       color: "#ffffff" },
    warn:    { bg: imsColours.warning,     color: "#ffffff" },
    danger:  { bg: imsColours.danger,      color: "#ffffff" },
    neutral: { bg: imsColours.page,        color: imsColours.muted },
  }[tone];
  return <span style={pill(map.bg, map.color)}>{label}</span>;
}

function Table({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <table style={imsTableStyle}>
      <thead>
        <tr>{head.map(h => <th key={h} style={imsTableHeadStyle}>{h}</th>)}</tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i}>
            {row.map((cell, j) => (
              <td key={j} style={{ ...imsTableCellStyle, fontWeight: j === 0 ? 700 : 400 }}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const segmented: CSSProperties = { display: "inline-flex", gap: 4 };
const seg = (active: boolean): CSSProperties => ({
  fontSize: 10,
  fontWeight: 800,
  padding: "3px 9px",
  borderRadius: 6,
  border: `1px solid ${active ? imsColours.brand : imsColours.border}`,
  background: active ? imsColours.brand : "#fff",
  color: active ? "#fff" : imsColours.ink,
});

// ── Sections ──────────────────────────────────────────────────────────────────

function SectionOverview() {
  return (
    <>
      <div style={eyebrow}>Getting Started</div>
      <h2 style={h2Style}>Overview</h2>
      <div style={callout("danger")}>
        <span>⚠</span>
        <div><strong>This guide is for IMS Administrators only.</strong> The Admin Console is only open to people whose system role is Admin (or who are the Master Admin). If you are not an Administrator, you do not need this guide.</div>
      </div>
      <p style={pStyle}>Administrators run the IMS themselves. Adding a person, a department, a project or a user login is done from the screens described here. It never needs a developer, a database script, or SQL.</p>
      <h3 style={h3Style}>Two separate things</h3>
      <p style={pStyle}><strong>People</strong> (People Management) is the register of everyone who can be named anywhere in the IMS — as an owner, auditor, reviewer or approver.<br /><strong>Admin / Settings</strong> controls who can sign in to the IMS and what they can see and do. Keep the two ideas apart: a person can be in the register without a login, and the register is where names come from.</p>
      <div style={callout("info")}>
        <span>ℹ</span>
        <div>Names used in the IMS come <strong>only</strong> from the People register. Never type a name freehand into an owner, auditor or reviewer field. If a person is missing from a list, add them to the People register first.</div>
      </div>
      <h3 style={h3Style}>The Admin Console tabs</h3>
      <p style={pStyle}>Open <strong>Admin / Settings</strong> from IMS Home. The console has four tabs:</p>
      <Table
        head={["Tab", "What it is for"]}
        rows={[
          ["Users & Access", "Invite users, review access requests, set permissions, send setup links, deactivate access."],
          ["Reference Data", "Departments, projects (with MOC numbering and parts), and vessels / sites / clients."],
          ["Speak Up", "Manage the list of Speak Up handlers and download the site poster."],
          ["Audit Log", "Read-only record of what Administrators have changed."],
        ]}
      />
      <div style={callout("info")}>
        <span>ℹ</span>
        <div>Sign-in is by email and password only. A Microsoft sign-in option is being considered but is <strong>not built yet</strong>, so do not tell users it is available.</div>
      </div>
    </>
  );
}

function SectionPeople() {
  return (
    <>
      <div style={eyebrow}>Getting Started</div>
      <h2 style={h2Style}>The People Register</h2>
      <p style={pStyle}>The People register (<strong>People Management</strong>, from IMS Home) is the single source of names for the whole IMS. NCR owners, Lead Auditors, MOC names and many other dropdowns read from it. Keeping it accurate keeps every module accurate.</p>
      <div style={mockPanel}>
        <div style={{ ...mockHero, marginTop: 0 }}>
          <div style={mockHeroEyebrow}>System Management</div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>People</div>
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
          <span style={pill(imsColours.panel, imsColours.muted)}>42 total</span>
          <span style={pill(imsColours.panel, imsColours.muted)}>39 active</span>
          <span style={pill(imsColours.panel, imsColours.muted)}>3 inactive</span>
          <span style={pill(imsColours.panel, imsColours.muted)}>9 departments</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(160px, 1fr) 2fr", gap: 12 }}>
          <div style={{ display: "grid", gap: 6, alignContent: "start" }}>
            <input style={mockInput} readOnly value="Search name, email, or role" />
            <div style={{ display: "flex", gap: 4 }}>
              <span style={seg(true)}>All</span><span style={seg(false)}>Active</span><span style={seg(false)}>Inactive</span>
            </div>
            <span style={{ ...btn("primary"), justifyContent: "center" }}>+ Add Person</span>
            <div style={{ background: "#fff", border: `1px solid ${imsColours.border}`, borderRadius: 8, padding: 8, fontSize: 11 }}>
              <strong>Example Person</strong><br /><span style={{ color: imsColours.muted }}>Quality · Quality Engineer</span>
            </div>
          </div>
          <div style={{ background: "#fff", border: `1px solid ${imsColours.border}`, borderRadius: 8, padding: 12 }}>
            <div style={mockLabel}>Person Detail</div>
            <div style={mockRow}>
              <div style={mockField()}><div style={mockFieldLabel}>Name</div><input style={mockInput} readOnly value="Example Person" /></div>
              <div style={mockField()}><div style={mockFieldLabel}>Email</div><input style={mockInput} readOnly value="Email address" /></div>
            </div>
            <div style={mockRow}>
              <div style={mockField()}><div style={mockFieldLabel}>Role</div><input style={mockInput} readOnly value="Role (optional)" /></div>
              <div style={mockField()}><div style={mockFieldLabel}>Department</div><input style={mockInput} readOnly value="Select department" /></div>
            </div>
            <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
              <span style={btn("ghost")}>Deactivate</span><span style={btn("danger")}>Delete Person</span><span style={btn("primary")}>Save Changes</span>
            </div>
          </div>
        </div>
      </div>
      <h3 style={h3Style}>Add one person</h3>
      <div style={stepList}>
        <Step n={1}>Open <strong>People Management</strong> and click <strong>+ Add Person</strong>.</Step>
        <Step n={2}>Enter <code style={codeStyle}>Name</code> (the full name exactly as it should appear everywhere), <code style={codeStyle}>Email</code>, <code style={codeStyle}>Role</code> (optional) and <code style={codeStyle}>Department</code>.</Step>
        <Step n={3}>Click <strong>Add Person</strong>. New people are created as Active. Only <code style={codeStyle}>Name</code> is required.</Step>
      </div>
      <h3 style={h3Style}>Add many people from Excel</h3>
      <div style={stepList}>
        <Step n={1}>In <strong>Import People from Excel</strong>, choose an <code style={codeStyle}>.xlsx</code> file. Only the first worksheet is read.</Step>
        <Step n={2}>Use these column headings: <code style={codeStyle}>Name</code> (or Full Name / Person), <code style={codeStyle}>Email</code>, <code style={codeStyle}>Role</code> (or Job Title / Position), <code style={codeStyle}>Department</code>, <code style={codeStyle}>Active</code> (or Status).</Step>
        <Step n={3}>Check the preview. Each row shows <strong>Ready</strong> or the reason it will be skipped. Rows with a duplicate name or email (already in the register, or twice in the file) are skipped. A row with no name is an error.</Step>
        <Step n={4}>Click <strong>Import n People</strong>. Use <strong>Clear Preview</strong> to start again.</Step>
      </div>
      <p style={pStyle}>A department that is not on the People department list is left blank rather than guessed. The department is optional.</p>
      <h3 style={h3Style}>Change or retire a person</h3>
      <p style={pStyle}>Click a person in the list, edit the fields and click <strong>Save Changes</strong>. <strong>Deactivate</strong> marks them Inactive but keeps them on historic records; <strong>Reactivate</strong> reverses it. <strong>Delete Person</strong> removes the record after a confirmation prompt. Prefer Deactivate for anyone who has appeared on records.</p>
      <div style={callout("warning")}>
        <span>⚠</span>
        <div>People Management only holds the person&apos;s record. It does not give them a login or change what they can do in the IMS. Logins and permissions are managed in <strong>Admin / Settings → Users &amp; Access</strong>.</div>
      </div>
    </>
  );
}

function SectionRefData() {
  return (
    <>
      <div style={eyebrow}>Setting Up the System</div>
      <h2 style={h2Style}>Departments, Projects &amp; Parts</h2>
      <p style={pStyle}>Open <strong>Admin / Settings → Reference Data</strong>. It holds the controlled lists that feed dropdowns across the IMS. Adding to them needs <em>create</em> permission on the Admin area (Master Admin and Full Access users have it).</p>
      <h3 style={h3Style}>Add a department</h3>
      <div style={stepList}>
        <Step n={1}>In the <strong>Departments</strong> panel, type a <code style={codeStyle}>Department name</code> and a <code style={codeStyle}>Code</code> (capitalised automatically).</Step>
        <Step n={2}>Click <strong>Add</strong>. New departments are Active and appear in the Invite User form and on the public Request access form.</Step>
      </div>
      <h3 style={h3Style}>Add a project (with MOC numbering and parts)</h3>
      <p style={pStyle}>Use the <strong>Add a project</strong> panel. The project and its MOC numbering are created together, so it is available straight away in Project Management, Create MOC and the project menu. Only Administrators can do this.</p>
      <div style={mockPanel}>
        <div style={mockLabel}>Add a project</div>
        <div style={mockRow}>
          <div style={mockField()}><div style={mockFieldLabel}>Project name</div><input style={mockInput} readOnly value="For example: Baltic Power" /></div>
          <div style={mockField()}><div style={mockFieldLabel}>MOC prefix</div><input style={mockInput} readOnly value="3 to 4 letters" /></div>
        </div>
        <div style={{ marginBottom: 10 }}>
          <div style={mockFieldLabel}>Parts or sections (optional)</div>
          <input style={mockInput} readOnly value="Type a part, press Enter" />
        </div>
        <div style={{ ...mockPanel, margin: "0 0 10px", background: "#fff" }}>First MOC number will be <strong style={{ color: imsColours.brand }}>ABC-MOC-001</strong></div>
        <span style={btn("primary")}>Add project</span>
      </div>
      <div style={stepList}>
        <Step n={1}>Enter the <code style={codeStyle}>Project name</code> (2 to 60 characters; it must be different from every existing project).</Step>
        <Step n={2}>Enter the <code style={codeStyle}>MOC prefix</code>: 3 or 4 capital letters, not used by another project. It starts every MOC number for the project and <strong>cannot be changed once the first MOC is raised</strong>.</Step>
        <Step n={3}>Optionally add <code style={codeStyle}>Parts or sections</code>: type a part and press Enter (or comma) for each one. If a project has parts, people are asked which ones a MOC applies to. Leave it empty and that question never appears.</Step>
        <Step n={4}>Check the preview of the first MOC number, then click <strong>Add project</strong>.</Step>
      </div>
      <div style={callout("warning")}>
        <span>⚠</span>
        <div>Parts are entered when the project is created. This screen has no control for adding parts to an existing project later, so decide the parts before you click Add project.</div>
      </div>
      <h3 style={h3Style}>Add a vessel, site or client</h3>
      <p style={pStyle}>In <strong>Projects / Vessels / Sites</strong>, enter a <code style={codeStyle}>Project code</code>, the name, and choose <strong>Vessel</strong>, <strong>Site</strong> or <strong>Client</strong>, then click <strong>Add</strong>. Add real projects with the Add a project panel above so they get their MOC numbering; use this form for vessels, sites and clients.</p>
      <div style={callout("info")}>
        <span>ℹ</span>
        <div>The lists show each value as <strong>Active</strong> or <strong>Inactive</strong>. This page adds values; it has no edit or deactivate button for existing departments or projects.</div>
      </div>
    </>
  );
}

function SectionInvite() {
  return (
    <>
      <div style={eyebrow}>Users &amp; Access</div>
      <h2 style={h2Style}>Inviting a New User</h2>
      <p style={pStyle}>Use <strong>Invite User</strong> for someone who needs a login and is not yet in the system. For a person who is already in the People register, use the user list instead (see <strong>Invite, Setup Link &amp; Passwords</strong>).</p>
      <div style={flowWrap}>
        <div style={flowStep()}>Fill in the form</div><div style={arrow}>→</div>
        <div style={flowStep()}>Set permissions</div><div style={arrow}>→</div>
        <div style={flowStep(true)}>Send Invite Link</div><div style={arrow}>→</div>
        <div style={flowStep()}>User creates a password</div>
      </div>
      <div style={stepList}>
        <Step n={1}>Go to <strong>Users &amp; Access</strong> and, in the <strong>Invite User</strong> panel, click <strong>Invite New User</strong>.</Step>
        <Step n={2}>Enter <code style={codeStyle}>Name</code> (full name, spelt as it should appear in the register), <code style={codeStyle}>Email</code>, <code style={codeStyle}>Job Role</code> and <code style={codeStyle}>Department</code> (chosen from the Reference Data departments).</Step>
        <Step n={3}>In <strong>Permissions</strong>, set each module to <strong>Full</strong>, <strong>Part Access</strong> or <strong>None</strong>. For Part Access, tick <strong>View</strong>, <strong>Create</strong> and <strong>Edit</strong> against each internal tab. Every module starts at None.</Step>
        <Step n={4}>Add an optional <code style={codeStyle}>Notes</code> line explaining the access.</Step>
        <Step n={5}>Click <strong>Send Invite Link</strong>.</Step>
      </div>
      <h3 style={h3Style}>What happens when you click Send Invite Link</h3>
      <div style={stepList}>
        <Step n={1}>The person is saved to the People register (matched by email, so an existing record is updated rather than duplicated) with access status <strong>Invited</strong>, and their permissions are saved.</Step>
        <Step n={2}>An email is sent with a button to set up their access. The link is valid for 30 days.</Step>
        <Step n={3}>If the email cannot be sent, the person and their permissions are still saved. The message tells you the email failed. Use <strong>Send Invite</strong> from the user list later, or <strong>Copy Setup Link</strong>.</Step>
        <Step n={4}>If the invite came from an access request, that request is marked Approved.</Step>
      </div>
      <div style={callout("info")}>
        <span>ℹ</span>
        <div>Giving a new user <strong>Full</strong> on the Admin / Settings module in this form also sets their system role to Admin. Only do this for people who should run the IMS.</div>
      </div>
    </>
  );
}

function SectionLinks() {
  return (
    <>
      <div style={eyebrow}>Users &amp; Access</div>
      <h2 style={h2Style}>Invite, Setup Link &amp; Passwords</h2>
      <p style={pStyle}>The <strong>Users &amp; Access</strong> table lists everyone in the People register. Each row shows a login status and the buttons you can use.</p>
      <div style={mockPanel}>
        <div style={mockLabel}>Users &amp; Access</div>
        <input style={{ ...mockInput, marginBottom: 8 }} readOnly value="Search user name, email, role or department..." />
        <table style={imsTableStyle}>
          <thead>
            <tr>{["Name", "Email", "Access", "Last Login", "Actions"].map(h => <th key={h} style={imsTableHeadStyle}>{h}</th>)}</tr>
          </thead>
          <tbody>
            <tr>
              <td style={imsTableCellStyle}><strong>Example Person</strong><div style={{ marginTop: 4 }}>{statusPill("Invite pending", "warn")}</div></td>
              <td style={imsTableCellStyle}>name@example.com</td>
              <td style={imsTableCellStyle}>{statusPill("Invited", "good")}</td>
              <td style={imsTableCellStyle}>-</td>
              <td style={imsTableCellStyle}>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <span style={btn("ghost")}>Open Panel</span>
                  <span style={btn("ghost")}>Send Invite</span>
                  <span style={btn("ghost")}>Copy Setup Link</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <h3 style={h3Style}>Which button to use</h3>
      <Table
        head={["Button", "What it does", "Use it when"]}
        rows={[
          ["Send Invite", "Emails the person a link to set up their access. Shown for people with no login yet.", "The person has never signed in and email is working."],
          ["Resend Setup", "Same button once a login exists but the person has not signed in yet. Emails a password setup link.", "The person started setting up but never finished."],
          ["Copy Setup Link", "Creates a fresh setup link and copies it to your clipboard. Nothing is emailed.", "Invite emails are failing or delayed, or you want to give the link to the person yourself."],
          ["Send Reset Email", "In the person's panel. Sends a password reset email to a person who already has a login.", "Someone has forgotten their password and cannot use Forgot password."],
        ]}
      />
      <h3 style={h3Style}>Using Copy Setup Link</h3>
      <div style={stepList}>
        <Step n={1}>Find the person and click <strong>Copy Setup Link</strong>. The status line confirms the link was copied.</Step>
        <Step n={2}>Send it to that person privately (for example in a direct message). Treat it like a password: anyone with the link can set up the account.</Step>
        <Step n={3}>The person opens it, clicks <strong>Set up my IMS access</strong>, creates and confirms a password, then signs in as normal.</Step>
      </div>
      <div style={callout("warning")}>
        <span>⚠</span>
        <div>Creating a new link (by Send Invite, Resend Setup or Copy Setup Link) replaces any earlier link for that person, so the older one stops working. Links last 30 days. After the first click the link keeps working for a limited retry window (24 hours), so an interrupted setup can usually be reopened.</div>
      </div>
      <h3 style={h3Style}>Login status labels</h3>
      <p style={pStyle}>{statusPill("No login yet", "warn")} {statusPill("Invite pending", "warn")} {statusPill("Setup pending", "warn")} {statusPill("Active login", "good")} {statusPill("No email", "warn")} {statusPill("Deactivated", "danger")}</p>
      <p style={pStyle}>A person with no email address cannot be invited. The Send Invite, Resend Setup and Copy Setup Link buttons are not offered for the Master Admin or for deactivated people, and Send Invite / Resend Setup disappears once the person has signed in.</p>
      <div style={callout("info")}>
        <span>ℹ</span>
        <div>Users can also reset their own password from the sign-in page with <strong>Forgot password?</strong>. A Microsoft sign-in option is being considered but is not built yet.</div>
      </div>
    </>
  );
}

function SectionRequests() {
  return (
    <>
      <div style={eyebrow}>Users &amp; Access</div>
      <h2 style={h2Style}>Access Requests</h2>
      <p style={pStyle}>Anyone with an Enshore email address can ask for access from the sign-in page. A request does <strong>not</strong> create an account. It joins a queue for an Administrator to review.</p>
      <h3 style={h3Style}>What the requester does</h3>
      <div style={stepList}>
        <Step n={1}>On the sign-in page, click <strong>Request access</strong>.</Step>
        <Step n={2}>Complete <code style={codeStyle}>First Name</code>, <code style={codeStyle}>Last Name</code>, <code style={codeStyle}>Enshore Email Address</code>, <code style={codeStyle}>Department</code>, <code style={codeStyle}>Reason Access Is Required</code>, and tick the <code style={codeStyle}>Requested Modules</code>.</Step>
        <Step n={3}>Click <strong>Submit Access Request</strong>.</Step>
      </div>
      <p style={pStyle}>Only <code style={codeStyle}>@enshoresubsea.com</code> addresses are accepted, the department must be an active one from Reference Data, and a second request is blocked while one is still Pending for the same email. The Admin / Settings module cannot be requested. Active Administrators receive a notification that links to the Admin Console.</p>
      <h3 style={h3Style}>What you do</h3>
      <div style={mockPanel}>
        <div style={mockLabel}>Pending Access Requests (1)</div>
        <div style={{ background: "#fff", border: `1px solid ${imsColours.border}`, borderRadius: 8, padding: 12 }}>
          <strong>Example Person</strong>
          <div style={{ fontSize: 11, color: imsColours.muted }}>name@example.com · Quality · date and time</div>
          <p style={{ ...pStyle, margin: "6px 0" }}>Reason given by the requester appears here.</p>
          <div style={{ fontSize: 11, color: imsColours.muted, marginBottom: 8 }}>Requested: Quality Management, Document Control</div>
          <div style={{ display: "flex", gap: 6 }}>
            <span style={btn("primary")}>Review &amp; Prepare</span>
            <span style={btn("danger")}>Reject</span>
          </div>
        </div>
      </div>
      <div style={stepList}>
        <Step n={1}>Go to <strong>Users &amp; Access</strong>. Pending requests are in <strong>Pending Access Requests</strong>, at the top.</Step>
        <Step n={2}>Click <strong>Review &amp; Prepare</strong>. The Invite User form opens pre-filled with the name, email, department and the reason (in Notes). The requested modules are set to <strong>view-only</strong> to start with.</Step>
        <Step n={3}>Review and adjust the permissions. Do not just accept what was asked for: grant only what the person needs.</Step>
        <Step n={4}>Click <strong>Send Invite Link</strong>. The request is marked <strong>Approved</strong> and the person is invited as described in <strong>Inviting a New User</strong>.</Step>
        <Step n={5}>To decline, click <strong>Reject</strong> instead and optionally give a reason. The rejection is recorded in the Audit Log.</Step>
      </div>
      <div style={callout("warning")}>
        <span>⚠</span>
        <div>Check the department and reason before approving. If the requester is not a real colleague or the access is not justified, reject it.</div>
      </div>
    </>
  );
}

function SectionPermissions() {
  return (
    <>
      <div style={eyebrow}>Users &amp; Access</div>
      <h2 style={h2Style}>Roles &amp; Permissions</h2>
      <p style={pStyle}>Access is set per person, per module, and for part-access per internal tab. Click <strong>Open Panel</strong> on a person (or click their row) to see their permissions.</p>
      <div style={mockPanel}>
        <div style={mockLabel}>Selected user</div>
        <div style={{ ...mockRow, marginBottom: 10 }}>
          <div style={mockField()}><div style={mockFieldLabel}>Access</div><input style={mockInput} readOnly value="Active" /></div>
          <div style={mockField()}><div style={mockFieldLabel}>Permission Override</div><input style={mockInput} readOnly value="Custom" /></div>
        </div>
        <div style={{ background: "#fff", border: `1px solid ${imsColours.border}`, borderRadius: 8, padding: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div><strong>HSE Management</strong><div style={{ fontSize: 10, color: imsColours.muted }}>Part access - selected tabs only</div></div>
            <div style={segmented}><span style={seg(false)}>Full</span><span style={seg(true)}>Part Access</span><span style={seg(false)}>None</span></div>
          </div>
          <table style={imsTableStyle}>
            <thead><tr>{["Internal tab", "View", "Create", "Edit"].map(h => <th key={h} style={imsTableHeadStyle}>{h}</th>)}</tr></thead>
            <tbody>
              <tr><td style={imsTableCellStyle}><strong>AINM</strong></td><td style={imsTableCellStyle}>☑</td><td style={imsTableCellStyle}>☑</td><td style={imsTableCellStyle}>☐</td></tr>
              <tr><td style={imsTableCellStyle}><strong>Observations</strong></td><td style={imsTableCellStyle}>☑</td><td style={imsTableCellStyle}>☐</td><td style={imsTableCellStyle}>☐</td></tr>
            </tbody>
          </table>
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
          <span style={btn("primary")}>Save Permissions</span>
          <span style={btn("ghost")}>Send Reset Email</span>
        </div>
      </div>
      <h3 style={h3Style}>Module access levels</h3>
      <Table
        head={["Level", "Meaning"]}
        rows={[
          ["Full", "Every tab in the module, including creating and editing."],
          ["Part Access", "Only the tabs you tick. Tick View for each tab the person should open, plus Create and/or Edit if they should add or change records."],
          ["None", "No access to the module. The module card on IMS Home stays visible but shows No Access."],
        ]}
      />
      <h3 style={h3Style}>Permission Override presets</h3>
      <Table
        head={["Override", "Effect when you pick it"]}
        rows={[
          ["Role Default", "No custom access recorded; the person follows their role."],
          ["Custom", "Set automatically as soon as you change any module Full / Part Access / None."],
          ["Full System Access", "Sets every module to Full."],
          ["Read Only", "Sets every module to Read, with Admin / Settings set to None."],
        ]}
      />
      <h3 style={h3Style}>Change someone&apos;s permissions</h3>
      <div style={stepList}>
        <Step n={1}>Go to <strong>Users &amp; Access</strong>, find the person (use the search box) and click <strong>Open Panel</strong>.</Step>
        <Step n={2}>For each module choose <strong>Full</strong>, <strong>Part Access</strong> or <strong>None</strong>. For Part Access, tick the <strong>View</strong>, <strong>Create</strong> and <strong>Edit</strong> boxes for each internal tab.</Step>
        <Step n={3}>Add a <code style={codeStyle}>Permission Notes</code> line saying why, if the access is custom.</Step>
        <Step n={4}>Click <strong>Save Permissions</strong>. The button stays disabled until you change something.</Step>
      </div>
      <h3 style={h3Style}>Who can use the Admin Console itself</h3>
      <p style={pStyle}>The Admin / Settings module has its own three tabs in the permission list: Users &amp; Access, Reference Data and Audit Log. Anyone with only view access to it sees a read-only banner and the write buttons are disabled. <strong>Create</strong> permission is needed to invite users and add departments and projects; <strong>Edit</strong> permission is needed to change access, send setup or reset links and save permissions. Messages such as &quot;Read-only access: you do not have permission to&hellip;&quot; show when a restricted person tries.</p>
      <div style={callout("info")}>
        <span>ℹ</span>
        <div>The Master Admin account shown in the Admin Console header is protected: its access is fixed at Full and it cannot be deactivated.</div>
      </div>
      <div style={callout("info")}>
        <span>ℹ</span>
        <div>Management of Change is its own module. Until a person has MOC-specific permissions it follows their Quality Management access.</div>
      </div>
    </>
  );
}

function SectionDeactivate() {
  return (
    <>
      <div style={eyebrow}>Users &amp; Access</div>
      <h2 style={h2Style}>Deactivating People</h2>
      <p style={pStyle}>When someone leaves or no longer needs the IMS, do two things: stop their login, then retire their record. They are separate because logins and the People register are separate.</p>
      <h3 style={h3Style}>1. Stop their login (Admin / Settings)</h3>
      <div style={stepList}>
        <Step n={1}>Go to <strong>Users &amp; Access</strong> and click <strong>Open Panel</strong> on the person.</Step>
        <Step n={2}>Set <code style={codeStyle}>Access</code> to <strong>Deactivated</strong>.</Step>
        <Step n={3}>Click <strong>Save Permissions</strong>. Their account is blocked from signing in and the change is written to the Audit Log.</Step>
      </div>
      <p style={pStyle}>Deactivated people cannot be sent invites or setup links. To restore access, set <code style={codeStyle}>Access</code> back to <strong>Active</strong> and save. The Master Admin account cannot be deactivated.</p>
      <h3 style={h3Style}>2. Retire their record (People Management)</h3>
      <div style={stepList}>
        <Step n={1}>Open <strong>People Management</strong> and click the person.</Step>
        <Step n={2}>Click <strong>Deactivate</strong>. They show as Inactive but remain visible on historical records.</Step>
      </div>
      <div style={callout("warning")}>
        <span>⚠</span>
        <div>The People Management <strong>Deactivate</strong> button only changes the register. It does not, on its own, switch off their sign-in. Always set Access to Deactivated in Users &amp; Access for a leaver. Avoid <strong>Delete Person</strong> for anyone who has appeared on records; deactivating keeps the history intact.</div>
      </div>
    </>
  );
}

function SectionModSettings() {
  const rows: [string, string][] = [
    ["Action Settings", "Priorities, statuses, source labels, escalation rules."],
    ["Asset Settings", "Asset categories, status values, inspection / maintenance intervals, calibration presets."],
    ["Document Control Settings", "Document types, codes, review cycles, numbering rules, notification defaults."],
    ["Risk Settings", "Risk categories, scoring labels, thresholds, response strategies, review rules."],
    ["People / Roles", "Role groups, responsibility mapping, reviewer eligibility."],
    ["System Settings", "Organisation details, branding, report defaults, notifications."],
    ["Departments", "Department codes, ownership, active / inactive governance."],
  ];
  return (
    <>
      <div style={eyebrow}>Settings</div>
      <h2 style={h2Style}>Module Settings &amp; Audit Log</h2>
      <h3 style={h3Style}>Where each module&apos;s settings live today</h3>
      <p style={pStyle}>Each module has a settings page under Admin / Settings, but these are <strong>placeholders</strong> at the moment. Each one carries the status &quot;shell ready&quot; and nothing on them can be edited yet. Existing module behaviour (numbering, scoring, action logic) is unchanged and is not controlled from here.</p>
      <Table head={["Settings page", "Planned for"]} rows={rows} />
      <p style={pStyle}>The settings that <strong>do</strong> work today are on the Admin Console tabs: Users &amp; Access, Reference Data (departments, projects, parts), Speak Up and the Audit Log. Use those.</p>
      <h3 style={h3Style}>Speak Up tab</h3>
      <p style={pStyle}>Under <strong>Speak Up</strong> you manage who can receive Speak Up reports. Add a handler with <code style={codeStyle}>Name</code>, <code style={codeStyle}>Work email</code> and <code style={codeStyle}>Role</code> (Case handler, Independent handler or Both), then click <strong>Add handler</strong>. You can <strong>Remove</strong> or <strong>Reactivate</strong> a handler, <strong>Reset key</strong>, or <strong>Release cases</strong>. You cannot approve anyone yourself: a new handler, a new role or a reactivated handler waits until a current handler approves them. The panel also has <strong>Download poster (PDF)</strong> for the site QR-code poster.</p>
      <h3 style={h3Style}>Audit Log</h3>
      <p style={pStyle}>The <strong>Audit Log</strong> tab is a read-only trace of Administrator actions, newest first, up to the most recent 80 entries. Columns: <strong>Date</strong>, <strong>Actor</strong>, <strong>Action</strong>, <strong>Target</strong>, <strong>Summary</strong>.</p>
      <p style={pStyle}>It records actions such as inviting a user, sending or copying a setup link, sending a reset, updating access or tab permissions, adding or updating departments and projects, rejecting an access request and failed invite emails. Use it to answer &quot;who changed this and when?&quot;.</p>
    </>
  );
}

function SectionReference() {
  const registry: [string, string][] = [
    ["Quality Management", "Dashboard, Calendar, NCR, Audits, Actions, Reports"],
    ["Management of Change", "MOC Register"],
    ["Lessons Learnt", "Lessons Learnt Workspace"],
    ["Project Management", "Projects, Wadden Sea Dashboard, Supplier ITP Programme, NOI Register and Creator, Project Reports and Open Points, Baltic Power, Overall Inspections"],
    ["Document Control", "Document Control, Certification"],
    ["HSE Management", "Dashboard, Calendar, AINM, Observations, PTW, Inspections, Actions, Reports"],
    ["Asset Management", "Dashboard, Asset Register, Calibration, Inspection, Maintenance, 3D Print Requests, Actions, Reports"],
    ["Risk Management", "Dashboard, Risk Register, Reviews, Controls, Opportunities, Actions, Reports"],
    ["Action Management", "Action Register"],
    ["Management Review", "Management Review"],
    ["People Management", "People Register"],
    ["Admin / Settings", "Users & Access, Reference Data, Audit Log"],
  ];
  return (
    <>
      <div style={eyebrow}>Reference</div>
      <h2 style={h2Style}>Reference</h2>
      <h3 style={h3Style}>Modules and their internal tabs (permission list)</h3>
      <p style={pStyle}>These are the modules and tabs you can grant in Part Access.</p>
      <Table head={["Module", "Internal tabs"]} rows={registry} />
      <h3 style={h3Style}>Access status</h3>
      <p style={pStyle}>{statusPill("Active", "good")} {statusPill("Invited", "good")} {statusPill("Deactivated", "danger")}</p>
      <h3 style={h3Style}>Fields on the People register</h3>
      <Table
        head={["Field", "Notes"]}
        rows={[
          ["Name", "Required. The name every module will show."],
          ["Email", "Optional in the register, but needed for a login or an invite."],
          ["Role", "Free text job title (Job Role on the invite form)."],
          ["Department", "Optional. Left blank rather than defaulted."],
          ["Active", "Active or Inactive. Inactive people stay on historic records."],
        ]}
      />
      <h3 style={h3Style}>Quick routine tasks</h3>
      <Table
        head={["I need to…", "Go to…"]}
        rows={[
          ["Add a colleague to dropdowns only", "People Management → + Add Person"],
          ["Add a colleague who needs to sign in", "Admin / Settings → Users & Access → Invite New User"],
          ["Add a project", "Admin / Settings → Reference Data → Add a project"],
          ["Add a department", "Admin / Settings → Reference Data → Departments → Add"],
          ["Send or copy a setup link", "Users & Access → the person's row"],
          ["Review a sign-in request", "Users & Access → Pending Access Requests"],
          ["Stop a leaver signing in", "Users & Access → Open Panel → Access: Deactivated → Save Permissions"],
          ["Check who changed something", "Admin / Settings → Audit Log"],
        ]}
      />
    </>
  );
}

function SectionFaq() {
  const qa: [string, string][] = [
    ["A name I need is missing from a dropdown.", "Add the person in People Management (or invite them if they need a login). Dropdown names come only from the People register. Do not type names freehand."],
    ["Can I add a project without help from a developer?", "Yes. Use Reference Data → Add a project. It sets up the project and its MOC numbering in one step. No SQL or Claude is needed."],
    ["I need to add a part to a project that already exists.", "The Add a project panel only takes parts when the project is created. This screen has no way to add parts to an existing project."],
    ["The invite email did not arrive.", "Check the person's junk folder, then use Copy Setup Link and pass the link to them directly. The user and their permissions are already saved even if the email failed."],
    ["A link says it has expired.", "Create a new one with Send Invite, Resend Setup or Copy Setup Link. The person can also use Forgot password? on the sign-in page."],
    ["What is the difference between Send Invite and Copy Setup Link?", "Send Invite emails the link for you. Copy Setup Link copies the same kind of link to your clipboard without sending anything, so you can pass it on yourself."],
    ["Someone signed in before but says they are locked out.", "Check their Access in the panel is Active (not Deactivated), then send a reset email or a new setup link."],
    ["Can people sign in with their Microsoft account?", "Not yet. A Microsoft sign-in option is being considered but is not built. Sign-in is email and password."],
    ["Why are some buttons greyed out for me?", "Your Admin permissions are view-only (or create-only / edit-only). Ask the Master Admin to give you the permission you need."],
    ["Do the settings pages for Assets, Risk, Actions and Document Control change anything?", "Not yet. They are placeholders with nothing editable."],
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
  people:      SectionPeople,
  refdata:     SectionRefData,
  invite:      SectionInvite,
  links:       SectionLinks,
  requests:    SectionRequests,
  permissions: SectionPermissions,
  deactivate:  SectionDeactivate,
  modsettings: SectionModSettings,
  reference:   SectionReference,
  faq:         SectionFaq,
};

export const adminGuide: GuideDefinition = {
  id: "admin",
  navLabel: "Admin & People",
  guideLabel: "Administration & People",
  defaultSection: "overview",
  sections,
  sectionComponents,
};
