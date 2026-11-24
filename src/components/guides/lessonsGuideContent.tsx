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
  | "overview" | "register" | "create" | "field" | "evidence"
  | "prevention" | "brief" | "trends" | "faq";

const sections: GuideSectionDef[] = [
  { key: "overview",   label: "Overview",                          group: "Getting Started" },
  { key: "register",   label: "The Register",                      group: "Getting Started" },
  { key: "create",     label: "Capturing a Lesson",                group: "Capturing Lessons" },
  { key: "field",      label: "Capturing a Lesson on a Phone",     group: "Capturing Lessons" },
  { key: "evidence",   label: "Evidence & Photos",                 group: "Capturing Lessons" },
  { key: "prevention", label: "Asking a Question / Reviewing a Procedure", group: "Prevention Intelligence" },
  { key: "brief",      label: "Reading the Brief & PDF",           group: "Prevention Intelligence" },
  { key: "trends",     label: "Trends & Importing",                group: "Analysis" },
  { key: "faq",        label: "Common Questions",                  group: "Reference" },
];

const outcomeBadge = (outcome: string): CSSProperties => {
  const map: Record<string, { bg: string; color: string }> = {
    failure:     { bg: imsColours.danger,      color: "#ffffff" },
    success:     { bg: imsColours.brand,       color: "#ffffff" },
    opportunity: { bg: imsColours.brandAccent, color: "#ffffff" },
  };
  const t = map[outcome.toLowerCase()] || map.failure;
  return pill(t.bg, t.color);
};

const fieldBox: CSSProperties = { ...mockInput, minHeight: 30, color: imsColours.muted };
const tallBox: CSSProperties = { ...mockInput, minHeight: 54, color: imsColours.muted };
const cardBox: CSSProperties = {
  background: imsColours.panel,
  border: `1px solid ${imsColours.border}`,
  borderRadius: 10,
  padding: 12,
  marginBottom: 10,
  fontSize: 12,
  lineHeight: 1.55,
};

function SectionOverview() {
  return (
    <>
      <div style={eyebrow}>Getting Started</div>
      <h2 style={h2Style}>Overview</h2>
      <p style={pStyle}>Lessons Learnt is the central place where Enshore records what we have learnt from projects — what went wrong, what went well, and what should change — so that other teams can find it and avoid repeating the same mistakes. Every lesson is searchable, can carry photos and documents as evidence, and can be linked to an action and an owner.</p>
      <div style={flowWrap}>
        <div style={flowStep()}>Capture a lesson</div><div style={arrow}>→</div>
        <div style={flowStep()}>Add evidence</div><div style={arrow}>→</div>
        <div style={flowStep()}>Find it in the Register</div><div style={arrow}>→</div>
        <div style={flowStep(true)}>Use it in Prevention Intelligence</div>
      </div>
      <h3 style={h3Style}>The six tabs</h3>
      <table style={imsTableStyle}>
        <thead>
          <tr>{["Tab", "What it is for"].map(h => <th key={h} style={imsTableHeadStyle}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {([
            ["Dashboard", "The headline picture: a rotating “What We’ve Learnt” panel, failure charts by department and project, outcome mix and recurring themes."],
            ["Register", "Search and filter every lesson. Click a row to open, edit or add evidence to it."],
            ["Prevention Intelligence", "Ask a question, or upload a procedure, and get a brief of cautions based on our historic failure lessons."],
            ["Create", "Record a new lesson using the full form."],
            ["Import", "Load lessons in bulk from the master Excel workbook."],
            ["Trend Analysis", "Lessons over time, repeat themes, action status and criticality."],
          ] as [string, string][]).map(([tab, use]) => (
            <tr key={tab}>
              <td style={{ ...imsTableCellStyle, fontWeight: 800, whiteSpace: "nowrap" }}>{tab}</td>
              <td style={imsTableCellStyle}>{use}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h3 style={h3Style}>Outcome: Failure, Success or Opportunity</h3>
      <p style={pStyle}>Each lesson has an <code style={codeStyle}>Outcome</code>.</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <span style={outcomeBadge("failure")}>Failure</span>
        <span style={outcomeBadge("success")}>Success</span>
        <span style={outcomeBadge("opportunity")}>Opportunity</span>
      </div>
      <p style={pStyle}>Use <strong>Failure</strong> for something that went wrong, <strong>Success</strong> for a practice that worked and is worth repeating, and <strong>Opportunity</strong> for an improvement idea. Prevention Intelligence draws on <strong>Failure</strong> lessons.</p>
      <div style={callout("info")}>
        <span>ℹ</span>
        <div>Write lessons without blame. The form asks you to describe what happened and why in terms of systems, planning, interfaces, controls, information, equipment or process — not individuals.</div>
      </div>
      <div style={callout("info")}>
        <span>ℹ</span>
        <div>If you only have read-only access you can browse and search, but saving, importing or deleting shows a message such as <em>Read-only access: you cannot create lessons.</em> Ask an IMS administrator if you need more access.</div>
      </div>
    </>
  );
}

function SectionRegister() {
  return (
    <>
      <div style={eyebrow}>Getting Started</div>
      <h2 style={h2Style}>The Register</h2>
      <div style={mockPanel}>
        <div style={{ ...mockHero, marginTop: 0 }}>
          <div style={mockHeroEyebrow}>Lessons Learnt</div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>Lessons Learnt Register</div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
          {["Total Lessons", "Open Actions", "High / Critical", "Unowned Actions"].map(k => (
            <span key={k} style={pill(imsColours.brandSoft, imsColours.brand)}>{k}</span>
          ))}
        </div>
        <table style={imsTableStyle}>
          <thead>
            <tr>
              {["ID", "Project", "Date", "Department", "Subject", "Outcome", "Criticality", "Status", "Repeat", "Evidence"].map(h => (
                <th key={h} style={imsTableHeadStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ ...imsTableCellStyle, fontWeight: 800, color: imsColours.brand, whiteSpace: "nowrap" }}>LL-00123</td>
              <td style={imsTableCellStyle}>ENS25-004 · Example project</td>
              <td style={imsTableCellStyle}>2025-06-12</td>
              <td style={imsTableCellStyle}>Operations</td>
              <td style={imsTableCellStyle}>Example subject line</td>
              <td style={imsTableCellStyle}><span style={outcomeBadge("failure")}>Failure</span></td>
              <td style={imsTableCellStyle}>High</td>
              <td style={imsTableCellStyle}>Open</td>
              <td style={imsTableCellStyle}>3</td>
              <td style={imsTableCellStyle}>2</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p style={pStyle}>Every lesson gets its own number automatically (for example <code style={codeStyle}>LL-00123</code>). <strong>Repeat</strong> shows how many lessons share the same repeat group, and <strong>Evidence</strong> shows how many files are attached.</p>
      <h3 style={h3Style}>Finding lessons</h3>
      <div style={stepList}>
        <Step n={1}>Open the <strong>Register</strong> tab.</Step>
        <Step n={2}>Type in <code style={codeStyle}>Search within the active dataset</code> — it searches lesson number, project, department, subject, what happened, root cause, lesson learnt, recommended action and keywords.</Step>
        <Step n={3}>Click the filters button to narrow by <code style={codeStyle}>Project</code>, <code style={codeStyle}>Department</code>, <code style={codeStyle}>Status</code>, <code style={codeStyle}>Criticality</code>, <code style={codeStyle}>Outcome</code> or <code style={codeStyle}>Year</code>.</Step>
        <Step n={4}>Click <strong>Clear Filters</strong> or <strong>Reset Dataset</strong> to go back to all lessons.</Step>
        <Step n={5}>Click any row to open the full record underneath the table.</Step>
      </div>
      <p style={pStyle}>The cards across the top (<strong>Total Lessons</strong>, <strong>Open Actions</strong>, <strong>High / Critical</strong>, <strong>Unowned Actions</strong>) are also shortcuts — click one to see just those lessons. An action counts as <em>open</em> when the lesson has a Recommended Action or Action Taken and its status is not Implemented or Closed. It is <em>unowned</em> when no Action Owner is set.</p>
      <p style={pStyle}>The Dashboard and Trend Analysis charts work the same way: click a bar, point or theme and you land in the Register showing just those lessons, with the <strong>Active dataset</strong> line telling you what you are looking at.</p>
      <div style={callout("info")}>
        <span>ℹ</span>
        <div>The Register shows the first 500 matches. If you see a note saying so, narrow the filters to reach a specific record.</div>
      </div>
      <h3 style={h3Style}>Editing or deleting a lesson</h3>
      <p style={pStyle}>Open a lesson, change what you need, and click <strong>Save Lesson</strong>. <strong>Close</strong> puts the panel away without saving. <strong>Delete</strong> asks you to confirm first — only delete a lesson that was entered by mistake.</p>
    </>
  );
}

function SectionCreate() {
  return (
    <>
      <div style={eyebrow}>Capturing Lessons</div>
      <h2 style={h2Style}>Capturing a Lesson</h2>
      <p style={pStyle}>Use the <strong>Create</strong> tab on a computer. (On a phone, use the shorter form described in the next section.)</p>
      <div style={mockPanel}>
        <div style={mockLabel}>Create a New Lesson</div>
        <div style={mockRow}>
          <div style={mockField()}><div style={mockFieldLabel}>Project Code</div><div style={fieldBox}>Select project code</div></div>
          <div style={mockField()}><div style={mockFieldLabel}>Project Name</div><div style={fieldBox}>Select project name</div></div>
          <div style={mockField()}><div style={mockFieldLabel}>Report Date</div><div style={fieldBox}>dd/mm/yyyy</div></div>
        </div>
        <div style={mockRow}>
          <div style={mockField()}><div style={mockFieldLabel}>Outcome</div><div style={fieldBox}>Failure</div></div>
          <div style={mockField()}><div style={mockFieldLabel}>Status</div><div style={fieldBox}>Open</div></div>
          <div style={mockField()}><div style={mockFieldLabel}>Criticality</div><div style={fieldBox}>Medium</div></div>
        </div>
        <div style={{ marginBottom: 10 }}><div style={mockFieldLabel}>Subject</div><div style={fieldBox}>Clear, searchable subject</div></div>
        <div style={{ marginBottom: 10 }}><div style={mockFieldLabel}>What Happened?</div><div style={tallBox}>Describe the event and its operational context without attributing blame.</div></div>
        <div style={{ marginBottom: 10 }}><div style={mockFieldLabel}>Lesson Learnt</div><div style={tallBox} /></div>
        <span style={btn("primary")}>Save Lesson</span>
      </div>
      <div style={stepList}>
        <Step n={1}>Click the <strong>Create</strong> tab.</Step>
        <Step n={2}>Choose the <code style={codeStyle}>Project Code</code> or <code style={codeStyle}>Project Name</code> — picking one fills in the other. If the project is not listed, choose <strong>+ Add New Project</strong>, enter the code and name, and click <strong>Add Project</strong>.</Step>
        <Step n={3}>Set the <code style={codeStyle}>Report Date</code>, <code style={codeStyle}>Outcome</code> (Failure, Success or Opportunity), <code style={codeStyle}>Criticality</code> and <code style={codeStyle}>Status</code>.</Step>
        <Step n={4}>Write a short, searchable <code style={codeStyle}>Subject</code>, then describe <code style={codeStyle}>What Happened?</code> and the <code style={codeStyle}>Lesson Learnt</code> — what another team should know or repeat.</Step>
        <Step n={5}>Fill in <code style={codeStyle}>Root Cause / Contributing Factors</code>, <code style={codeStyle}>Action Taken</code> and <code style={codeStyle}>Recommended Action</code> where you can.</Step>
        <Step n={6}>Choose an <code style={codeStyle}>Action Owner</code> and <code style={codeStyle}>Target Date</code> if someone needs to follow it up. People are picked from People Management.</Step>
        <Step n={7}>Attach photos or documents if you have them (see <strong>Evidence &amp; Photos</strong>), then click <strong>Save Lesson</strong>.</Step>
      </div>
      <div style={callout("warning")}>
        <span>⚠</span>
        <div>Four things are required: <strong>Project</strong>, <strong>Subject</strong>, <strong>What Happened?</strong> and <strong>Lesson Learnt</strong>. Saving is blocked until all four are filled in.</div>
      </div>
      <h3 style={h3Style}>Optional fields that make a lesson more useful</h3>
      <table style={imsTableStyle}>
        <thead>
          <tr>{["Field", "Why it helps"].map(h => <th key={h} style={imsTableHeadStyle}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {([
            ["Department, Asset, Stage / Phase, Vessel / Office", "Lets people filter and find lessons for the same kind of work."],
            ["Root Cause / Contributing Factors", "The most valuable part for spotting patterns. Describe systems and conditions, not people."],
            ["Repeat Group", "A common label (for example “Document control at mobilisation”) shared by lessons about the same theme. Lessons with the same repeat group show up under Recurring Themes."],
            ["Keywords", "Comma-separated words to make the lesson easier to find."],
            ["Originator, Line Manager", "Picked from People Management."],
            ["Completion Date", "Fill in when the action is done."],
          ] as [string, string][]).map(([f, why]) => (
            <tr key={f}>
              <td style={{ ...imsTableCellStyle, fontWeight: 800 }}>{f}</td>
              <td style={imsTableCellStyle}>{why}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p style={pStyle}>The <code style={codeStyle}>Status</code> of a lesson moves through <strong>Open</strong>, <strong>In Progress</strong>, <strong>Implemented</strong>, <strong>Shared</strong> and <strong>Closed</strong>. After you save, the lesson appears in the Register straight away.</p>
    </>
  );
}

function SectionField() {
  return (
    <>
      <div style={eyebrow}>Capturing Lessons</div>
      <h2 style={h2Style}>Capturing a Lesson on a Phone</h2>
      <p style={pStyle}>Field capture is a shorter, phone-friendly version of the Create form, designed so you can record a lesson while it is fresh — on a vessel, at a yard or on a site — and add the detail later.</p>
      <h3 style={h3Style}>How to open it</h3>
      <div style={stepList}>
        <Step n={1}>Sign in to the IMS on your phone and open <strong>Field Tools</strong>.</Step>
        <Step n={2}>Under <strong>Learning</strong>, tap <strong>Capture a Lesson</strong>.</Step>
        <Step n={3}>Alternatively, open the address <code style={codeStyle}>/lessons-learned?view=create&amp;mode=field</code> directly — a good one to save as a bookmark or home-screen shortcut.</Step>
      </div>
      <div style={callout("info")}>
        <span>ℹ</span>
        <div>The <strong>Capture a Lesson</strong> tile only appears if your account has Lessons Learnt access, and you must be signed in.</div>
      </div>
      <h3 style={h3Style}>What you will see</h3>
      <div style={{ ...mockPanel, maxWidth: 360 }}>
        <div style={{ ...mockHero, marginTop: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>Capture a Lesson</div>
          <div style={{ fontSize: 11, opacity: 0.85 }}>Record the learning now; optional detail can be added or refined later.</div>
        </div>
        {(["Project", "Report Date", "Vessel / Office", "Department", "Outcome", "Criticality", "Subject"] as string[]).map(l => (
          <div key={l} style={{ marginBottom: 8 }}><div style={mockFieldLabel}>{l}</div><div style={fieldBox} /></div>
        ))}
        <div style={{ marginBottom: 8 }}><div style={mockFieldLabel}>What Happened?</div><div style={tallBox} /></div>
        <div style={{ marginBottom: 8 }}><div style={mockFieldLabel}>Lesson Learnt</div><div style={tallBox} /></div>
        <div style={{ marginBottom: 8 }}><div style={mockFieldLabel}>Recommended Action</div><div style={tallBox} /></div>
        <div style={{ marginBottom: 8 }}><div style={mockFieldLabel}>Photo / File Evidence</div><div style={fieldBox}>Choose files</div></div>
        <div style={{ marginBottom: 10 }}><div style={mockFieldLabel}>Evidence Note</div><div style={fieldBox}>Optional description</div></div>
        <div style={{ ...cardBox, fontWeight: 800, color: imsColours.brand }}>▸ Optional detail</div>
        <span style={{ ...btn("primary"), width: "100%", justifyContent: "center", boxSizing: "border-box" }}>Save Lesson</span>
      </div>
      <h3 style={h3Style}>Step by step</h3>
      <div style={stepList}>
        <Step n={1}>The <code style={codeStyle}>Report Date</code> is already set to today. Change it if needed.</Step>
        <Step n={2}>Choose the <code style={codeStyle}>Project</code>. If it is not in the list, choose <strong>+ Add New Project</strong>, enter the code and name, then tap <strong>Add Project</strong>.</Step>
        <Step n={3}>Fill in <code style={codeStyle}>Vessel / Office</code>, <code style={codeStyle}>Department</code>, <code style={codeStyle}>Outcome</code> and <code style={codeStyle}>Criticality</code>.</Step>
        <Step n={4}>Write the <code style={codeStyle}>Subject</code>, <code style={codeStyle}>What Happened?</code> and <code style={codeStyle}>Lesson Learnt</code>. Add a <code style={codeStyle}>Recommended Action</code> if you have one.</Step>
        <Step n={5}>Tap <strong>Photo / File Evidence</strong> to take a photo or pick a file from your phone (see <strong>Evidence &amp; Photos</strong>).</Step>
        <Step n={6}>Tap <strong>Optional detail</strong> only if you want to add more — date of incident, asset, originator, line manager, status, impact rating, root cause, action taken, action owner, target and completion dates, repeat group, keywords or source file.</Step>
        <Step n={7}>Tap <strong>Save Lesson</strong>. The button stays pinned to the bottom of the screen so you can always reach it.</Step>
      </div>
      <p style={pStyle}>When it saves, the status line shows <em>Lesson saved to the central repository.</em> and the form clears (with today&apos;s date) ready for the next lesson — you stay on the field screen. Use <strong>Back to Field Tools</strong> at the top when you have finished.</p>
      <div style={callout("warning")}>
        <span>⚠</span>
        <div>The same four required fields apply on the phone: <strong>Project</strong>, <strong>Subject</strong>, <strong>What Happened?</strong> and <strong>Lesson Learnt</strong>. You can fill in the rest later from the Register on a computer — open the lesson and click <strong>Save Lesson</strong> when done.</div>
      </div>
    </>
  );
}

function SectionEvidence() {
  return (
    <>
      <div style={eyebrow}>Capturing Lessons</div>
      <h2 style={h2Style}>Evidence &amp; Photos</h2>
      <p style={pStyle}>Evidence is any file that backs up a lesson — a photo of the failure, a procedure extract, a spreadsheet, an email or a presentation. Evidence is attached to the lesson and counted in the <strong>Evidence</strong> column of the Register.</p>
      <h3 style={h3Style}>What you can upload</h3>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        {["Photos (JPG, PNG, WebP, HEIC)", "PDF", "Word (.doc, .docx)", "Excel (.xls, .xlsx, .xlsm)", "PowerPoint (.ppt, .pptx)", "CSV", "Text (.txt)"].map(t => (
          <span key={t} style={pill(imsColours.brandSoft, imsColours.brand)}>{t}</span>
        ))}
      </div>
      <p style={pStyle}>You can choose several files at once. On a phone, the file box also offers the camera, so you can take a photo and attach it straight away.</p>
      <h3 style={h3Style}>Adding evidence</h3>
      <div style={stepList}>
        <Step n={1}>On the lesson form, click <code style={codeStyle}>Photo / File Evidence</code> and choose one or more files.</Step>
        <Step n={2}>Optionally add an <code style={codeStyle}>Evidence Note</code> describing what the files show. The note is applied to every file you add in that save.</Step>
        <Step n={3}>Click <strong>Save Lesson</strong>. The files upload when the lesson is saved.</Step>
      </div>
      <p style={pStyle}>To add evidence to a lesson that already exists, open it from the Register, choose the files, and click <strong>Save Lesson</strong>.</p>
      <h3 style={h3Style}>Opening evidence</h3>
      <p style={pStyle}>Open the lesson in the Register. Its files are listed as cards under the form, showing the file name and note. Click a card to open the file — this works on phones as well as computers, and Word, Excel and PowerPoint files open in the right app.</p>
      <div style={callout("warning")}>
        <span>⚠</span>
        <div>If the lesson saves but a file fails to upload, the status line says <em>Lesson saved, but evidence failed</em>, with the reason. The lesson itself is safe — open it from the Register and add the file again.</div>
      </div>
      <div style={callout("info")}>
        <span>ℹ</span>
        <div>Don&apos;t put confidential personal information in photos or documents unless it is genuinely needed — lessons are shared knowledge across the company.</div>
      </div>
    </>
  );
}

function SectionPrevention() {
  return (
    <>
      <div style={eyebrow}>Prevention Intelligence</div>
      <h2 style={h2Style}>Asking a Question / Reviewing a Procedure</h2>
      <p style={pStyle}>Prevention Intelligence uses AI to search Enshore&apos;s historic <strong>failure</strong> lessons and pull out the patterns that matter for a particular job. It has two uses:</p>
      <div style={stepList}>
        <Step n={1}><strong>Ask a question</strong> — for example, what trenching failures should we plan for? You get a short brief of consolidated cautions.</Step>
        <Step n={2}><strong>Review a procedure</strong> — upload a procedure and get the same kind of brief, comparing the procedure against the historic failures.</Step>
      </div>
      <div style={mockPanel}>
        <div style={mockLabel}>Ask Prevention Intelligence</div>
        <div style={{ marginBottom: 10 }}>
          <div style={mockFieldLabel}>What do you need to prevent?</div>
          <div style={tallBox}>What rigging failures must our lift plans prevent?</div>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10, alignItems: "center" }}>
          <span style={{ color: imsColours.muted }}>Try:</span>
          {["What should we check before mobilisation?", "What rigging failures must our lift plans prevent?", "What communication failures have repeated offshore?"].map(t => (
            <span key={t} style={pill(imsColours.brandSoft, imsColours.brand)}>{t}</span>
          ))}
        </div>
        <div style={{ marginBottom: 10 }}>
          <div style={mockFieldLabel}>Optional procedure</div>
          <div style={fieldBox}>Choose file — PDF, DOC, DOCX or TXT</div>
        </div>
        <span style={btn("primary")}>Generate Prevention Brief</span>
      </div>
      <h3 style={h3Style}>Asking a question</h3>
      <div style={stepList}>
        <Step n={1}>Open the <strong>Prevention Intelligence</strong> tab.</Step>
        <Step n={2}>In <code style={codeStyle}>What do you need to prevent?</code>, describe the activity, equipment, phase or risk. Be specific. At least 8 characters are needed and the limit is 2,000. You can also click one of the <strong>Try:</strong> suggestions.</Step>
        <Step n={3}>Click <strong>Generate Prevention Brief</strong> and wait. The status line tells you what it is doing.</Step>
      </div>
      <h3 style={h3Style}>Reviewing a procedure</h3>
      <div style={stepList}>
        <Step n={1}>Type a question as above (or leave the suggested one) — it tells the review what to focus on.</Step>
        <Step n={2}>Under <code style={codeStyle}>Optional procedure</code>, choose a PDF, Word (.doc or .docx) or text file. It can be up to 50 MB. Text, tables and scanned PDF pages are supported.</Step>
        <Step n={3}>The main button changes to <strong>Review Procedure</strong>. Click it. The status line shows the document being read, then compared with relevant lessons.</Step>
        <Step n={4}>Changed your mind about the document? Click <strong>Remove Procedure</strong> to go back to a plain question.</Step>
      </div>
      <div style={callout("info")}>
        <span>ℹ</span>
        <div>The document is uploaded only as a temporary working copy and is removed once the review finishes. Its contents are read and sent to Enshore&apos;s business AI service to produce the brief.</div>
      </div>
      <div style={callout("warning")}>
        <span>⚠</span>
        <div>A procedure review is <strong>advice only</strong>. It points out where a procedure seems to cover — or may miss — controls that past failures suggest. It does not approve the procedure, does not say it is compliant, and does not replace review by a competent person.</div>
      </div>
      <h3 style={h3Style}>What the AI does — and does not do</h3>
      <table style={imsTableStyle}>
        <thead>
          <tr>{["It does", "It does not"].map(h => <th key={h} style={imsTableHeadStyle}>{h}</th>)}</tr>
        </thead>
        <tbody>
          <tr>
            <td style={imsTableCellStyle}>Search the failure lessons held in the register for those most relevant to your question or procedure.</td>
            <td style={imsTableCellStyle}>Look at anything outside the Lessons Learnt register — no external incidents, standards or internet sources.</td>
          </tr>
          <tr>
            <td style={imsTableCellStyle}>Group similar failures into a handful of prioritised cautions, each with suggested controls.</td>
            <td style={imsTableCellStyle}>List every matching record — the brief is deliberately consolidated.</td>
          </tr>
          <tr>
            <td style={imsTableCellStyle}>Link every caution to the specific lessons that support it, so you can check the evidence.</td>
            <td style={imsTableCellStyle}>Approve, certify or sign off a procedure.</td>
          </tr>
          <tr>
            <td style={imsTableCellStyle}>Flag where the historic evidence is thin or weak, under Evidence Limitations.</td>
            <td style={imsTableCellStyle}>Change your lessons or your procedure. Nothing is edited automatically.</td>
          </tr>
        </tbody>
      </table>
      <p style={pStyle}>It can still get things wrong or miss something, so always read the supporting lessons for any caution you plan to act on.</p>
    </>
  );
}

function SectionBrief() {
  return (
    <>
      <div style={eyebrow}>Prevention Intelligence</div>
      <h2 style={h2Style}>Reading the Brief &amp; PDF</h2>
      <p style={pStyle}>Once the analysis finishes, a <strong>Prevention Brief</strong> appears under the question box.</p>
      <div style={mockPanel}>
        <div style={mockLabel}>Prevention Brief</div>
        <div style={{ ...cardBox, background: imsColours.brandSoft }}>
          A short summary of the main patterns found in the historic failure lessons.
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 8, color: imsColours.muted, fontWeight: 800, fontSize: 11 }}>
            <span>1,240 records screened</span><span>85 candidate records analysed</span><span>5 prioritised cautions</span><span>14 strongest records cited</span>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <span style={btn("ghost")}>Open Cited Lessons</span>
            <span style={btn("ghost")}>Generate PDF</span>
          </div>
        </div>
        <div style={cardBox}>
          <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 2 }}>1 · Example caution title</div>
          <div style={{ color: imsColours.muted, fontSize: 11, marginBottom: 8 }}>High confidence · 4 cited lessons</div>
          <div><strong>What failed</strong> — a plain description of the repeated failure.</div>
          <div><strong>Why it matters</strong> — the consequence.</div>
          <div><strong>Controls to consider</strong> — practical checks, hold points or responsibilities.</div>
          <div style={{ marginTop: 6 }}><strong>Supporting lessons</strong> — LL-00123 · LL-00456</div>
          <div style={{ marginTop: 8 }}><span style={btn("ghost")}>View Supporting Lessons</span></div>
        </div>
      </div>
      <h3 style={h3Style}>How to read it</h3>
      <div style={stepList}>
        <Step n={1}>Read the summary at the top, then the numbered caution cards. Each card says what failed, why it matters and controls to consider.</Step>
        <Step n={2}><strong>Confidence</strong> on each card reflects the evidence: <em>High</em> when several clear records support the same pattern, <em>Medium</em> when the evidence is smaller or mixed, and <em>Low</em> when the historic wording is weak.</Step>
        <Step n={3}>Click <strong>View Supporting Lessons</strong> on a card to jump to the Register showing just the lessons behind that caution. Click <strong>Open Cited Lessons</strong> to see all the lessons cited across the brief.</Step>
        <Step n={4}>When you have finished reading the evidence, click <strong>Back to Prevention Brief</strong> (top of the Register) to return to the brief where you left off.</Step>
        <Step n={5}>Read <strong>Evidence Limitations</strong> if shown — it explains where historic record quality limits how firmly findings can be stated.</Step>
      </div>
      <p style={pStyle}>The line under the brief title says whether the search used <strong>Meaning-based retrieval</strong> or <strong>Keyword retrieval fallback</strong>. Meaning-based finds similar failures even where the wording differs; keyword matching is the fallback and may miss some.</p>
      <h3 style={h3Style}>Generating the PDF</h3>
      <div style={stepList}>
        <Step n={1}>With a brief on screen, click <strong>Generate PDF</strong>.</Step>
        <Step n={2}>A file named <code style={codeStyle}>Enshore-Prevention-Brief-…pdf</code> downloads to your device.</Step>
      </div>
      <p style={pStyle}>The PDF is headed <em>ENSHORE IMS - PREVENTION BRIEF</em> and includes the date generated, an analysis reference, the scope and management summary, a counts table, each caution with its controls and supporting lesson numbers, the evidence limitations, and a landscape <strong>Relevant Lessons Appendix</strong> listing every lesson retrieved as evidence with its description, learning and recommended action. Every page has a footer and page number.</p>
      <div style={callout("info")}>
        <span>ℹ</span>
        <div>Each analysis is saved in an audit log against the person who ran it. Close the page and the on-screen brief is gone, so generate the PDF if you want to keep it.</div>
      </div>
      <h3 style={h3Style}>Keeping the search up to date (administrators)</h3>
      <p style={pStyle}>When you save a lesson, it is added to the meaning-based search index automatically. Users with full access or Master Admin rights also see a <strong>Semantic Index</strong> panel at the bottom of the tab, showing how many failure lessons are indexed. <strong>Build / Refresh Index</strong> catches up any that are missing and runs in batches; rebuilding the whole index needs Master Admin access. If the panel says the connection or database set-up is not ready, the button stays disabled — speak to the IMS administrator.</p>
    </>
  );
}

function SectionTrends() {
  return (
    <>
      <div style={eyebrow}>Analysis</div>
      <h2 style={h2Style}>Trends &amp; Importing</h2>
      <h3 style={h3Style}>Dashboard</h3>
      <p style={pStyle}>The Dashboard opens with <strong>What We&apos;ve Learnt</strong> — a rotating selection of clear, reusable takeaways drawn from well-completed failure records. Hover to pause it, use the arrows to step through, or click the card to open the lesson (or all the lessons on the same repeat theme). Below it are charts for <strong>Failure Concentration by Department</strong>, <strong>High-Risk Mix by Department</strong>, <strong>Failure Concentration by Project</strong>, <strong>Outcome Mix</strong> and <strong>Recurring Themes</strong>.</p>
      <p style={pStyle}>This panel only shows lessons with a clear, specific Lesson Learnt — which is a good reason to take care writing that field.</p>
      <h3 style={h3Style}>Trend Analysis</h3>
      <table style={imsTableStyle}>
        <thead>
          <tr>{["Chart", "Shows"].map(h => <th key={h} style={imsTableHeadStyle}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {([
            ["Lessons Over Time", "Failures, successes and opportunities by report year."],
            ["Repeat-Theme Pareto", "The largest recurring themes and their cumulative share."],
            ["Action Status", "Progress of lessons that have an action."],
            ["Criticality Distribution", "Risk profile of captured lessons."],
            ["Continuous Failings", "The most common repeat groups."],
            ["Repeat-Failure Watchlist", "Themes that have appeared on more than one project."],
          ] as [string, string][]).map(([c, s]) => (
            <tr key={c}>
              <td style={{ ...imsTableCellStyle, fontWeight: 800, whiteSpace: "nowrap" }}>{c}</td>
              <td style={imsTableCellStyle}>{s}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p style={pStyle}>Click any bar, point or row to open the matching lessons in the Register.</p>
      <h3 style={h3Style}>Importing from the master workbook</h3>
      <p style={pStyle}>The <strong>Import</strong> tab loads lessons in bulk from the Enshore master lessons learnt Excel workbook. This is mainly used for historic records.</p>
      <div style={stepList}>
        <Step n={1}>Open the <strong>Import</strong> tab and choose the workbook under <code style={codeStyle}>Excel File</code> (.xlsx or .xls).</Step>
        <Step n={2}>Check the preview. Each row shows <em>Ready</em>, <em>Ready</em> with a note about how a missing field was filled in from another, or a blocking problem such as <em>Project Name is required</em> or <em>Already exists</em>.</Step>
        <Step n={3}>Click <strong>Import N Lessons</strong>. Only the rows that are ready are imported; blocked rows are skipped. Use <strong>Clear Preview</strong> to cancel.</Step>
      </div>
      <div style={callout("warning")}>
        <span>⚠</span>
        <div>Importing needs permission to create lessons, and it adds records to the central register for everyone. Check the preview carefully before importing.</div>
      </div>
    </>
  );
}

function SectionFaq() {
  const faqs: [string, ReactElement][] = [
    ["Which fields do I have to fill in?", <>Only <strong>Project</strong>, <strong>Subject</strong>, <strong>What Happened?</strong> and <strong>Lesson Learnt</strong>. Everything else is optional, but root cause, recommended action and owner make a lesson much more useful.</>],
    ["Can I add photos or documents after I have saved?", <>Yes. Open the lesson from the <strong>Register</strong>, choose the files under <code style={codeStyle}>Photo / File Evidence</code> and click <strong>Save Lesson</strong>.</>],
    ["What file types can I attach?", <>Photos, PDF, Word, Excel, PowerPoint, CSV and text files. They open on phones as well as computers.</>],
    ["I am on site with poor signal. What should I do?", <>Capture the essentials on the field screen as soon as you can connect — only four fields are needed — and add detail later from the Register. If a save fails, the status line shows the reason; try again once you have a better connection.</>],
    ["How do I edit or remove a lesson?", <>Click it in the Register, make your changes and click <strong>Save Lesson</strong>. <strong>Delete</strong> asks you to confirm and needs permission to edit lessons.</>],
    ["Does Prevention Intelligence use my lesson straight away?", <>New and edited lessons are added to the search automatically when you save, so they should be picked up quickly. If a very new lesson does not appear, ask an administrator to run <strong>Build / Refresh Index</strong>. Only lessons with the outcome <strong>Failure</strong> are used.</>],
    ["Can the AI make things up?", <>It is instructed to use only the lessons found and the procedure you uploaded, and every caution must link to supporting lessons. It can still misread or miss things, so use <strong>View Supporting Lessons</strong> to check the evidence before acting.</>],
    ["Does a procedure review mean my procedure is approved?", <>No. It is advice only and does not approve or certify anything. The normal review and approval process still applies.</>],
    ["The brief says “Keyword retrieval fallback”. Is that a problem?", <>Not a fault — it means the meaning-based search was not available for that run, so a simpler keyword search was used. Results may be less complete. Tell an administrator if it happens regularly.</>],
    ["It says Prevention Intelligence is “awaiting the Enshore business API key”.", <>The AI connection has not been set up yet. Contact the IMS administrator.</>],
    ["My document would not review.", <>Check it is a PDF, Word (.doc or .docx) or text file under 50 MB, and not password protected or corrupt. If the message says the document could not be read, try saving a fresh copy and uploading again. Large documents can also run out of time — wait a moment and retry.</>],
    ["Is the document I upload kept?", <>No. The temporary working copy is removed after the review. Download the PDF if you want a copy of the brief.</>],
    ["Why can I see lessons but not save?", <>Your account has read-only access to Lessons Learnt. Ask an IMS administrator.</>],
  ];
  return (
    <>
      <div style={eyebrow}>Reference</div>
      <h2 style={h2Style}>Common Questions</h2>
      {faqs.map(([q, a]) => (
        <div key={q} style={cardBox}>
          <div style={{ fontWeight: 800, color: imsColours.brand, marginBottom: 4 }}>{q}</div>
          <div>{a}</div>
        </div>
      ))}
    </>
  );
}

const sectionComponents: Record<SectionKey, () => ReactElement> = {
  overview:   SectionOverview,
  register:   SectionRegister,
  create:     SectionCreate,
  field:      SectionField,
  evidence:   SectionEvidence,
  prevention: SectionPrevention,
  brief:      SectionBrief,
  trends:     SectionTrends,
  faq:        SectionFaq,
};

export const lessonsGuide: GuideDefinition = {
  id: "lessons",
  navLabel: "Lessons Learnt",
  guideLabel: "Lessons Learnt",
  defaultSection: "overview",
  sections,
  sectionComponents,
};
