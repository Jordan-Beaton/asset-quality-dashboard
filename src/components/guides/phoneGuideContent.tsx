import type { CSSProperties, ReactElement, ReactNode } from "react";
import { imsColours, imsTableStyle, imsTableHeadStyle, imsTableCellStyle } from "../imsTheme";
import {
  GuideDefinition, GuideSectionDef,
  eyebrow, h2Style, h3Style, pStyle, codeStyle,
  stepList, Step, callout,
  mockPanel, mockLabel, flowWrap, flowStep, arrow,
  mockInput, btn, pill,
} from "./guideKit";

type SectionKey =
  | "start" | "home" | "observation" | "incident"
  | "assets" | "files" | "moving" | "faq";

const sections: GuideSectionDef[] = [
  { key: "start",       label: "Getting Started",           group: "Getting Started" },
  { key: "home",        label: "Home & Field Tools",        group: "Getting Started" },
  { key: "observation", label: "Observation Card",          group: "Logging on the Go" },
  { key: "incident",    label: "Incidents & Inspections",   group: "Logging on the Go" },
  { key: "assets",      label: "Asset Checks & Lessons",    group: "Logging on the Go" },
  { key: "files",       label: "Photos, Files & Downloads", group: "Files" },
  { key: "moving",      label: "Moving Around",             group: "Reading on a Phone" },
  { key: "faq",         label: "Common Questions",          group: "Reference" },
];

// ── Small phone-shaped mock frame (visual only) ───────────────────────────────

const phoneFrame: CSSProperties = {
  width: 280,
  maxWidth: "100%",
  margin: "0 auto",
  background: "#fff",
  border: `2px solid ${imsColours.border}`,
  borderRadius: 22,
  padding: 12,
  boxSizing: "border-box",
};

function PhoneFrame({ children }: { children: ReactNode }) {
  return <div style={phoneFrame}>{children}</div>;
}

const logBtn: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  minHeight: 44,
  padding: "6px 8px",
  borderRadius: 10,
  background: imsColours.brand,
  color: "#fff",
  fontSize: 12,
  fontWeight: 800,
};

const logIcon: CSSProperties = {
  width: 26,
  height: 26,
  borderRadius: 7,
  background: "rgba(255,255,255,0.16)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 14,
  flexShrink: 0,
};

const toolCard: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: 10,
  border: `1px solid ${imsColours.border}`,
  borderRadius: 12,
  background: imsColours.page,
  marginBottom: 8,
};

const toolBadge: CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: 9,
  background: imsColours.brand,
  flexShrink: 0,
};

const bottomBar: CSSProperties = {
  display: "flex",
  gap: 6,
  padding: "8px 6px",
  marginTop: 10,
  borderTop: `1px solid ${imsColours.border}`,
  overflow: "hidden",
};

const bottomIcon = (active?: boolean): CSSProperties => ({
  width: 38,
  height: 38,
  borderRadius: 10,
  flexShrink: 0,
  background: active ? imsColours.brand : imsColours.page,
  color: active ? "#fff" : imsColours.brand,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 10,
  fontWeight: 800,
});

const cardRow: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 8,
  fontSize: 11,
  padding: "3px 0",
};

const sideBySide: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: 16,
  alignItems: "start",
  margin: "16px 0",
};

const caption: CSSProperties = {
  fontSize: 11,
  color: imsColours.muted,
  textAlign: "center",
  marginTop: 6,
};

// ── Sections ──────────────────────────────────────────────────────────────────

function SectionStart() {
  return (
    <>
      <div style={eyebrow}>Getting Started</div>
      <h2 style={h2Style}>Using the IMS on a Phone</h2>
      <p style={pStyle}>
        Most people use the IMS on a phone to <strong>log something quickly</strong> &mdash; an observation, an incident, a site inspection or an asset check &mdash; while they are still on site. You can also read registers, open files and check dashboards, but the phone is built for logging first.
      </p>
      <div style={callout("info")}>
        <span>ℹ</span>
        <div>The IMS changes layout automatically when your screen is <strong>720 pixels wide or narrower</strong> (a normal phone held upright). On a wider screen, including some large phones held sideways, you get the full desktop layout instead.</div>
      </div>

      <h3 style={h3Style}>Signing in</h3>
      <div style={stepList}>
        <Step n={1}>Open the IMS address in your phone&apos;s browser. If you are not signed in, you are taken to the <strong>Sign in</strong> page.</Step>
        <Step n={2}>Enter your <code style={codeStyle}>Email</code> and <code style={codeStyle}>Password</code>, then tap <strong>Sign in</strong>.</Step>
        <Step n={3}>You are sent back to the page you were trying to reach, not just to the home page.</Step>
      </div>
      <p style={pStyle}>
        On the Sign in page, <strong>Forgot password?</strong> sends you a reset link by email, and <strong>Request access</strong> lets you ask an IMS Administrator for an account. The link in an invite or reset email opens the same page so you can set your password.
      </p>
      <div style={callout("warning")}>
        <span>⚠</span>
        <div>The <strong>Observation Card</strong> is the only field page that needs no sign-in. Every other field page asks you to sign in first.</div>
      </div>

      <h3 style={h3Style}>Putting the IMS on your home screen</h3>
      <p style={pStyle}>
        The IMS runs in your phone&apos;s browser &mdash; there is no app to download. To get a one-tap shortcut, use your browser&apos;s own <strong>Add to Home Screen</strong> option. On an iPhone this is in Safari&apos;s Share menu; on Android it is in the Chrome menu (the three dots). Open the page you use most first &mdash; <strong>Field Tools</strong> is a good choice &mdash; and add that page, so the shortcut opens straight to it.
      </p>
      <div style={callout("info")}>
        <span>ℹ</span>
        <div>The shortcut works like a bookmark: it opens the IMS in your browser, and you still sign in as normal. The exact wording of the menu depends on your phone and browser.</div>
      </div>
    </>
  );
}

function SectionHome() {
  return (
    <>
      <div style={eyebrow}>Getting Started</div>
      <h2 style={h2Style}>Home &amp; Field Tools</h2>
      <p style={pStyle}>
        On a phone, IMS Home opens with a <strong>Log something</strong> strip at the top, followed by a simple list of your workspaces. The strip has big buttons for the four things people log most often.
      </p>

      <div style={sideBySide}>
        <div>
          <div style={mockPanel}>
            <div style={mockLabel}>IMS Home on a phone</div>
            <PhoneFrame>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8, fontSize: 12, fontWeight: 900, color: imsColours.brand }}>
                <span>Log something</span>
                <span style={{ fontSize: 11 }}>All field tools</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                <div style={logBtn}><span style={logIcon}>+</span>Observation</div>
                <div style={logBtn}><span style={logIcon}>!</span>Incident</div>
                <div style={logBtn}><span style={logIcon}>✓</span>Site inspection</div>
                <div style={logBtn}><span style={logIcon}>⚙</span>Asset check</div>
              </div>
              <div style={{ margin: "12px 0 6px", fontSize: 10, fontWeight: 800, color: imsColours.muted, textTransform: "uppercase", letterSpacing: "0.07em" }}>Your workspaces</div>
              <div style={{ ...toolCard, padding: 8, marginBottom: 6 }}><div style={{ ...toolBadge, width: 28, height: 28 }} /><strong style={{ fontSize: 12 }}>HSE Management</strong></div>
              <div style={{ ...toolCard, padding: 8, marginBottom: 0 }}><div style={{ ...toolBadge, width: 28, height: 28 }} /><strong style={{ fontSize: 12 }}>Asset Management</strong></div>
            </PhoneFrame>
            <div style={caption}>Illustration only &mdash; your workspaces depend on your access.</div>
          </div>
        </div>
        <div>
          <h3 style={{ ...h3Style, marginTop: 0 }}>What each button opens</h3>
          <table style={imsTableStyle}>
            <thead>
              <tr>
                <th style={imsTableHeadStyle}>Button</th>
                <th style={imsTableHeadStyle}>Opens</th>
                <th style={imsTableHeadStyle}>Shown to</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ ...imsTableCellStyle, fontWeight: 800 }}>Observation</td>
                <td style={imsTableCellStyle}>The Observation Card</td>
                <td style={imsTableCellStyle}>Everyone</td>
              </tr>
              <tr>
                <td style={{ ...imsTableCellStyle, fontWeight: 800 }}>Incident</td>
                <td style={imsTableCellStyle}>AINM field entry</td>
                <td style={imsTableCellStyle}>People with HSE access</td>
              </tr>
              <tr>
                <td style={{ ...imsTableCellStyle, fontWeight: 800 }}>Site inspection</td>
                <td style={imsTableCellStyle}>Choose an HSE inspection form</td>
                <td style={imsTableCellStyle}>People with HSE access</td>
              </tr>
              <tr>
                <td style={{ ...imsTableCellStyle, fontWeight: 800 }}>Asset check</td>
                <td style={imsTableCellStyle}>Choose an asset to inspect</td>
                <td style={imsTableCellStyle}>People with Assets access</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <h3 style={h3Style}>All field tools</h3>
      <p style={pStyle}>
        Tap <strong>All field tools</strong> to open the <strong>Field Tools</strong> page (&ldquo;What do you need to do?&rdquo;). It groups every field task into sections. A section only appears if you have access to that part of the IMS.
      </p>
      <table style={imsTableStyle}>
        <thead>
          <tr>
            {["Section", "Tool", "What it does"].map(h => <th key={h} style={imsTableHeadStyle}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={imsTableCellStyle}>HSE</td>
            <td style={{ ...imsTableCellStyle, fontWeight: 800 }}>Site Inspection</td>
            <td style={imsTableCellStyle}>Complete an HSE inspection and add evidence.</td>
          </tr>
          <tr>
            <td style={imsTableCellStyle}>HSE</td>
            <td style={{ ...imsTableCellStyle, fontWeight: 800 }}>Report an Incident</td>
            <td style={imsTableCellStyle}>Raise or continue an AINM notification.</td>
          </tr>
          <tr>
            <td style={imsTableCellStyle}>HSE</td>
            <td style={{ ...imsTableCellStyle, fontWeight: 800 }}>Observation Card</td>
            <td style={imsTableCellStyle}>Submit a safety observation quickly. Marked <em>No sign-in required</em>.</td>
          </tr>
          <tr>
            <td style={imsTableCellStyle}>Assets</td>
            <td style={{ ...imsTableCellStyle, fontWeight: 800 }}>Asset Inspection</td>
            <td style={imsTableCellStyle}>Choose an asset and record an inspection.</td>
          </tr>
          <tr>
            <td style={imsTableCellStyle}>Assets</td>
            <td style={{ ...imsTableCellStyle, fontWeight: 800 }}>Asset Maintenance</td>
            <td style={imsTableCellStyle}>Choose an asset and record maintenance.</td>
          </tr>
          <tr>
            <td style={imsTableCellStyle}>Learning</td>
            <td style={{ ...imsTableCellStyle, fontWeight: 800 }}>Capture a Lesson</td>
            <td style={imsTableCellStyle}>Record a learning, improvement or successful practice while it is fresh. Marked <em>Sign-in required</em>.</td>
          </tr>
        </tbody>
      </table>
      <div style={callout("info")}>
        <span>ℹ</span>
        <div>If you see <strong>No field tools are assigned to your account</strong>, ask an IMS administrator to review your HSE, Asset or Lessons Learnt permissions.</div>
      </div>
    </>
  );
}

function SectionObservation() {
  return (
    <>
      <div style={eyebrow}>Logging on the Go</div>
      <h2 style={h2Style}>Observation Card</h2>
      <p style={pStyle}>
        The Observation Card is the quickest way to report something you have seen &mdash; good or bad. It is a public page: <strong>no sign-in is needed</strong>, so contractors, clients and visitors can use it too. It has its own clean screen with no IMS menus, and can also be reached by scanning the Observation QR code.
      </p>
      <div style={stepList}>
        <Step n={1}>Under <strong>Who is submitting?</strong> tap one of <strong>Employee</strong>, <strong>Contractor</strong>, <strong>Client</strong>, <strong>Visitor</strong> or <strong>Quick Fill</strong>. The form opens once you have chosen.</Step>
        <Step n={2}>Enter your <code style={codeStyle}>Name</code> and <code style={codeStyle}>Company</code> (not shown for Quick Fill). If you want HSE to be able to follow up, tap <strong>Add optional contact details</strong>.</Step>
        <Step n={3}>Under <strong>Observation details</strong>, choose the <code style={codeStyle}>Project</code>, and enter <code style={codeStyle}>Vessel / worksite</code> and <code style={codeStyle}>Exact location</code>. <code style={codeStyle}>Date</code> and <code style={codeStyle}>Time</code> are filled in for you.</Step>
        <Step n={4}>Choose the <code style={codeStyle}>Observation type</code> (for example Positive Observation, Unsafe Act or Unsafe Condition), a <code style={codeStyle}>Category</code> and a <code style={codeStyle}>Risk / attention level</code>.</Step>
        <Step n={5}>Type a <code style={codeStyle}>Short title</code> and describe <strong>What was observed?</strong> &mdash; this is the only required box. <code style={codeStyle}>Immediate action taken</code> and <code style={codeStyle}>Suggested action</code> are optional.</Step>
        <Step n={6}>Add photos if you have them (see <strong>Photos, Files &amp; Downloads</strong>), then tap <strong>Submit Observation</strong>.</Step>
      </div>

      <div style={mockPanel}>
        <div style={mockLabel}>What you see when it is sent</div>
        <div style={{ background: imsColours.brandSoft, border: `1px solid ${imsColours.brandAccent}`, borderRadius: 10, padding: "10px 12px", color: imsColours.brand, fontSize: 12 }}>
          <strong>Logged:</strong> Thank you. Your observation has been logged as <strong>[your observation number]</strong>.
        </div>
        <div style={{ ...btn("primary"), marginTop: 10 }}>Submitted - [your observation number]</div>
        <div style={caption}>Your real observation number is shown here on your screen.</div>
      </div>

      <div style={callout("info")}>
        <span>ℹ</span>
        <div>Note the number shown after you submit &mdash; it is how HSE will refer to your observation. If the project you need is missing and you have permission, a <strong>+</strong> button beside the project box lets you add it.</div>
      </div>
    </>
  );
}

function SectionIncident() {
  return (
    <>
      <div style={eyebrow}>Logging on the Go</div>
      <h2 style={h2Style}>Incidents &amp; Inspections</h2>
      <p style={pStyle}>
        These pages need you to be signed in. While you are on one of them the screen switches to a compact <strong>field header</strong> (the Enshore logo and the page name) and the bottom menu is hidden, so you can concentrate on the form. Use the <strong>Back</strong> link at the bottom of the page to return to the full IMS.
      </p>

      <h3 style={h3Style}>Reporting an incident (AINM)</h3>
      <p style={pStyle}>
        <strong>Incident</strong> on the Log something strip (or <strong>Report an Incident</strong> in Field Tools) opens <strong>AINM Mobile</strong>. It captures the first notification at the point of contact; Part 1 and Part 2 can be continued later from the AINM register on a computer.
      </p>
      <div style={stepList}>
        <Step n={1}>Under <strong>Start New AINM</strong>, tap <strong>Incident / Near Miss</strong> or <strong>Accident</strong>. To carry on with an existing record, search under <strong>Continue Existing</strong> and tap it.</Step>
        <Step n={2}>On <strong>Initial Notification</strong>, the <code style={codeStyle}>AINM No.</code> is created for you. Fill in <code style={codeStyle}>Title</code>, <code style={codeStyle}>Project / Work Title</code>, <code style={codeStyle}>Location / Site</code>, <code style={codeStyle}>Date of Event</code> and <code style={codeStyle}>Time of Event</code>.</Step>
        <Step n={3}>Choose a <code style={codeStyle}>Classification</code> and describe the event under <strong>Brief details of the event</strong>. Please avoid names &mdash; use a job title or &ldquo;IP&rdquo; (Injured Person).</Step>
        <Step n={4}>Complete the injury / release / damage details and the initial response boxes (<strong>Casualty Management</strong>, <strong>Site / Location Management</strong>, <strong>Cause Identification</strong>, <strong>Additional Information</strong>).</Step>
        <Step n={5}>Tap <strong>Save AINM Notification</strong> to keep it as a draft, or <strong>Mark as Issued</strong> when the notification is ready to go.</Step>
        <Step n={6}>To add photos or files, save the AINM first, then use <strong>Upload Evidence</strong> under <strong>Notification Evidence</strong>.</Step>
      </div>

      <h3 style={h3Style}>Completing a site inspection</h3>
      <div style={flowWrap}>
        <div style={flowStep()}>Site inspection</div><div style={arrow}>→</div>
        <div style={flowStep()}>Choose Inspection</div><div style={arrow}>→</div>
        <div style={flowStep()}>Answer each item</div><div style={arrow}>→</div>
        <div style={flowStep(true)}>Save Inspection</div>
      </div>
      <div style={stepList}>
        <Step n={1}>Tap <strong>Site inspection</strong>. On <strong>Choose Inspection</strong>, tap the form you need. Six HSE inspection forms are listed (Vessel Pre-Sail, and Workplace Inspections for Office, Offshore, Mobilisation, Base and Site, and Dropped Objects), each with its form number.</Step>
        <Step n={2}>Fill in the header details (title, inspection date, project / work scope, vessel / spread, area / zone and so on).</Step>
        <Step n={3}>Work down the checklist. For each item choose <strong>N/A</strong>, <strong>Yes</strong> or <strong>No</strong>, add any <strong>Comments / action notes</strong>, and tap <strong>Upload evidence for item</strong> to attach a photo to that item.</Step>
        <Step n={4}>Photos added while creating a new inspection are staged under <strong>Evidence Upload</strong> (you can <strong>Remove</strong> one before saving) and are uploaded when you tap <strong>Save Inspection</strong>.</Step>
      </div>
      <div style={callout("info")}>
        <span>ℹ</span>
        <div>HSE can also show a <strong>Mobile QR Access</strong> code on the HSE Inspections page. Scanning it opens the same <strong>Choose Inspection</strong> page on your phone.</div>
      </div>
    </>
  );
}

function SectionAssets() {
  return (
    <>
      <div style={eyebrow}>Logging on the Go</div>
      <h2 style={h2Style}>Asset Checks &amp; Lessons</h2>

      <h3 style={{ ...h3Style, marginTop: 0 }}>Asset inspection or maintenance</h3>
      <p style={pStyle}>
        <strong>Asset check</strong> (or <strong>Asset Inspection</strong> / <strong>Asset Maintenance</strong> in Field Tools) opens a <strong>Choose Asset</strong> list. These pages need you to be signed in and to have Assets access.
      </p>
      <div style={stepList}>
        <Step n={1}>Type in the search box &mdash; you can search by asset code, name, serial number or location.</Step>
        <Step n={2}>Tap the asset. Each card shows the asset code, status, name, serial number and location.</Step>
        <Step n={3}>The inspection (or maintenance) form opens already set to that asset. Fill it in, add photos or documents under <strong>Upload Photos / Documents</strong>, then tap <strong>Save Inspection Record</strong> (or <strong>Save Maintenance Record</strong>).</Step>
      </div>

      <div style={mockPanel}>
        <div style={mockLabel}>Choose Asset &mdash; illustration</div>
        <PhoneFrame>
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 6 }}>Choose Asset</div>
          <div style={{ ...mockInput, marginBottom: 8, color: imsColours.muted }}>Search asset, serial number, or location</div>
          <div style={{ border: `1px solid ${imsColours.border}`, borderRadius: 12, padding: 10, marginBottom: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 10, fontWeight: 900, color: imsColours.brand }}>ASSET-CODE</span>
              <span style={pill(imsColours.page, imsColours.brand)}>Active</span>
            </div>
            <div style={{ fontSize: 13, fontWeight: 800, margin: "4px 0 2px" }}>Asset name</div>
            <div style={{ fontSize: 11, color: imsColours.muted }}>Location: Workshop</div>
          </div>
        </PhoneFrame>
      </div>

      <h3 style={h3Style}>Capturing a lesson</h3>
      <p style={pStyle}>
        <strong>Capture a Lesson</strong> in Field Tools opens Lessons Learnt in a compact field mode. The tabs and dashboard figures are hidden, and the <strong>Back to Field Tools</strong> link takes you back. Only the essentials are shown.
      </p>
      <div style={stepList}>
        <Step n={1}>Choose the <code style={codeStyle}>Project</code>, <code style={codeStyle}>Report Date</code>, <code style={codeStyle}>Vessel / Office</code> and <code style={codeStyle}>Department</code>.</Step>
        <Step n={2}>Set the <code style={codeStyle}>Outcome</code> (Failure, Success or Opportunity) and <code style={codeStyle}>Criticality</code>.</Step>
        <Step n={3}>Write a <code style={codeStyle}>Subject</code>, then <strong>What Happened?</strong>, <strong>Lesson Learnt</strong> and <strong>Recommended Action</strong>. Describe events without blame.</Step>
        <Step n={4}>Add photos or files under <strong>Photo / File Evidence</strong>, with an optional <strong>Evidence Note</strong>.</Step>
        <Step n={5}>Tap <strong>Save Lesson</strong>. The form clears so you can capture another straight away.</Step>
      </div>
      <p style={pStyle}>
        Ownership, dates, contributing factors, repeat groups and other extras are tucked into <strong>Optional detail</strong> &mdash; tap it to open the extra fields if you have them to hand.
      </p>
    </>
  );
}

function SectionFiles() {
  return (
    <>
      <div style={eyebrow}>Files</div>
      <h2 style={h2Style}>Photos, Files &amp; Downloads</h2>

      <h3 style={{ ...h3Style, marginTop: 0 }}>Attaching photos and files</h3>
      <p style={pStyle}>
        Every upload box in the IMS accepts the same kinds of file, so you can attach what you have without converting it first:
      </p>
      <ul style={{ ...pStyle, paddingLeft: 20 }}>
        <li><strong>Photos:</strong> PNG, JPG / JPEG, WEBP, and HEIC / HEIF (the format iPhones use).</li>
        <li><strong>Documents:</strong> PDF, Word (.doc, .docx), Excel (.xls, .xlsx, .xlsm), PowerPoint (.ppt, .pptx), plus CSV and plain text (.txt).</li>
      </ul>
      <div style={stepList}>
        <Step n={1}>Tap the file box (<strong>Photos or supporting evidence</strong>, <strong>Upload Photos / Files</strong>, <strong>Upload Evidence</strong> and so on).</Step>
        <Step n={2}>Your phone offers its own choices &mdash; typically to take a new photo, choose from your photo library, or browse files. Pick one.</Step>
        <Step n={3}>Check the file name appears in the list, then carry on with the form.</Step>
      </div>
      <table style={imsTableStyle}>
        <thead>
          <tr>
            {["Where", "How photos are collected"].map(h => <th key={h} style={imsTableHeadStyle}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ ...imsTableCellStyle, fontWeight: 800 }}>Observation Card</td>
            <td style={imsTableCellStyle}>Photos build up in a list as you add them, one at a time if you like. Each shows a <strong>Remove</strong> button, and the heading counts &ldquo;attachments ready to upload&rdquo;.</td>
          </tr>
          <tr>
            <td style={{ ...imsTableCellStyle, fontWeight: 800 }}>HSE inspection (new)</td>
            <td style={imsTableCellStyle}>Staged under <strong>Evidence Upload</strong>; uploaded when you tap <strong>Save Inspection</strong>. Use <strong>Remove</strong> to take one off the list first.</td>
          </tr>
          <tr>
            <td style={{ ...imsTableCellStyle, fontWeight: 800 }}>AINM field entry</td>
            <td style={imsTableCellStyle}>Save the AINM first, then <strong>Upload Evidence</strong>. Files are listed straight away; tap one to open it.</td>
          </tr>
          <tr>
            <td style={{ ...imsTableCellStyle, fontWeight: 800 }}>Capture a Lesson</td>
            <td style={imsTableCellStyle}>Choose all the files you want in one go. Choosing again replaces the earlier selection.</td>
          </tr>
        </tbody>
      </table>

      <h3 style={h3Style}>Opening files and reports on your phone</h3>
      <ul style={{ ...pStyle, paddingLeft: 20 }}>
        <li><strong>Uploaded evidence and documents</strong> (buttons such as <strong>Open / Preview</strong>) open in a new browser tab. If your browser blocks the new tab, the file opens in the same tab instead &mdash; use your browser&apos;s <strong>Back</strong> button to return to the IMS.</li>
        <li><strong>Monthly management report PDFs</strong> (<strong>Generate Monthly PDF</strong>) are built on your phone. They open in a new tab where your browser allows it; otherwise they are saved to your phone.</li>
        <li><strong>Word reports</strong> (for example <strong>Generate Word</strong> on the project report annexes) are saved to your phone. Open them from your browser&apos;s downloads list or your phone&apos;s Files app, in Word or any app that opens Word files.</li>
      </ul>
      <div style={callout("info")}>
        <span>ℹ</span>
        <div>Where a download lands, and which app opens it, is decided by your phone and browser rather than the IMS. If you cannot find a file, check the browser&apos;s downloads list first.</div>
      </div>
    </>
  );
}

function SectionMoving() {
  return (
    <>
      <div style={eyebrow}>Reading on a Phone</div>
      <h2 style={h2Style}>Moving Around</h2>
      <p style={pStyle}>
        Outside the field entry pages, the IMS keeps its normal pages but rearranges them to fit a phone.
      </p>

      <div style={sideBySide}>
        <div>
          <div style={mockPanel}>
            <div style={mockLabel}>Bottom navigation bar</div>
            <PhoneFrame>
              <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 4 }}>HSE Management</div>
              <div style={{ fontSize: 11, color: imsColours.muted }}>Page content appears here.</div>
              <div style={{ height: 70 }} />
              <div style={bottomBar}>
                <div style={bottomIcon(true)}>Home</div>
                <div style={bottomIcon()}>▦</div>
                <div style={bottomIcon()}>▣</div>
                <div style={bottomIcon()}>△</div>
                <div style={bottomIcon()}>◔</div>
              </div>
            </PhoneFrame>
            <div style={caption}>Swipe the bar sideways to see more.</div>
          </div>
        </div>
        <div>
          <h3 style={{ ...h3Style, marginTop: 0 }}>The bottom bar</h3>
          <p style={pStyle}>
            The side menu you see on a computer becomes a bar of <strong>icons along the bottom</strong> of the screen. It shows the pages of the module you are in (for example HSE: Dashboard, Calendar, AINM, Observations and so on). <strong>Home</strong> is always first. If there are more icons than fit, swipe the bar sideways.
          </p>
          <p style={pStyle}>
            The top header is shortened to the logo, the page name, the dark / light switch and <strong>Sign out</strong>. Field entry pages and the Observation Card have no bottom bar &mdash; use their Back links.
          </p>
        </div>
      </div>

      <h3 style={h3Style}>Tables become cards</h3>
      <p style={pStyle}>
        Registers are wide tables on a computer. On a phone each row becomes a <strong>card</strong> showing the label and value for each field. The most important fields stay visible (such as number, title, status, owner, due date, project and location). Everything else is hidden until you tap <strong>Expand</strong>.
      </p>
      <div style={mockPanel}>
        <div style={mockLabel}>A register row on a phone</div>
        <PhoneFrame>
          <div style={{ border: `1px solid ${imsColours.border}`, borderRadius: 12, padding: 10, background: imsColours.page }}>
            <div style={cardRow}><span style={{ color: imsColours.muted }}>AINM No.</span><strong>AINM-0041</strong></div>
            <div style={cardRow}><span style={{ color: imsColours.muted }}>Title</span><strong>Dropped object</strong></div>
            <div style={cardRow}><span style={{ color: imsColours.muted }}>Status</span><span style={pill(imsColours.warning, "#fff")}>In Progress</span></div>
            <div style={{ marginTop: 8 }}><span style={{ ...btn("ghost"), minHeight: 36, fontSize: 12 }}>Expand</span></div>
          </div>
        </PhoneFrame>
        <div style={caption}>Tap <strong>Expand</strong> to see the other fields; the button then reads <strong>Collapse</strong>.</div>
      </div>
      <ul style={{ ...pStyle, paddingLeft: 20 }}>
        <li>A few wide, grid-style tables are left as scrolling tables because turning them into cards would lose their meaning &mdash; swipe sideways to read them.</li>
        <li>Large panels have a <strong>Collapse</strong> / <strong>Expand</strong> control so you can fold away sections you are not using.</li>
        <li>Tabs along the top of a page scroll sideways when there are too many to fit.</li>
        <li>Forms become one column, with larger boxes and buttons that are easy to tap.</li>
      </ul>

      <div style={callout("info")}>
        <span>ℹ</span>
        <div>Everything you are allowed to do on a computer you can do on a phone, and nothing more &mdash; permissions are exactly the same. If a button is blocked, you will see a message saying your IMS permissions do not allow it.</div>
      </div>
    </>
  );
}

function SectionFaq() {
  const rows: [string, string][] = [
    ["I cannot see Incident, Site inspection or Asset check on Home.", "Those buttons only appear if you have HSE or Assets access. Ask an IMS administrator to check your permissions. The Observation button is always shown."],
    ["The Field Tools page says no tools are assigned to me.", "Your account has no HSE, Assets or Lessons Learnt access. Ask an IMS administrator to review it."],
    ["I get an Access Restricted page.", "Your role or personal permissions do not include that area. Tap Back to IMS Home and ask an Admin if you think this is wrong."],
    ["Do I need to sign in to submit an Observation Card?", "No. It is the one field page that is open without signing in. Every other field page needs you to be signed in."],
    ["I added a photo to an AINM but cannot upload it.", "Save the AINM first (Save AINM Notification), then use Upload Evidence. Until it is saved there is nothing for the file to attach to."],
    ["Can I attach a Word, Excel or PowerPoint file?", "Yes. PDF, Word, Excel, PowerPoint, CSV, text files and photos (including iPhone HEIC photos) are all accepted."],
    ["I cannot find the PDF or Word file I generated.", "Check your browser's downloads list, then your phone's Files app. Monthly PDFs normally open in a new tab; Word reports are saved to the phone."],
    ["A file opened in the same tab and I lost my place.", "That happens when the browser blocks new tabs. Tap your browser's Back button to return to the IMS."],
    ["The page looks like the computer version.", "The phone layout applies when the screen is 720 pixels wide or narrower. Turn your phone upright, or check the browser is not set to 'Desktop site'."],
    ["Where did the other fields in a register go?", "They are behind the Expand button on each card. Tap Expand to see them and Collapse to fold them away."],
    ["Can I install the IMS as an app?", "There is no separate app. Use your browser's Add to Home Screen option to create a shortcut that opens the IMS."],
  ];
  return (
    <>
      <div style={eyebrow}>Reference</div>
      <h2 style={h2Style}>Common Questions</h2>
      <table style={imsTableStyle}>
        <thead>
          <tr>
            {["Question", "Answer"].map(h => <th key={h} style={imsTableHeadStyle}>{h}</th>)}
          </tr>
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
    </>
  );
}

const sectionComponents: Record<SectionKey, () => ReactElement> = {
  start:       SectionStart,
  home:        SectionHome,
  observation: SectionObservation,
  incident:    SectionIncident,
  assets:      SectionAssets,
  files:       SectionFiles,
  moving:      SectionMoving,
  faq:         SectionFaq,
};

export const phoneGuide: GuideDefinition = {
  id: "phone",
  navLabel: "Using the IMS on a Phone",
  guideLabel: "Using the IMS on a Phone",
  defaultSection: "start",
  sections,
  sectionComponents,
};
