import type { CSSProperties, ReactElement } from "react";
import { imsColours, imsTableStyle, imsTableHeadStyle, imsTableCellStyle } from "../imsTheme";
import {
  GuideDefinition, GuideSectionDef,
  eyebrow, h2Style, h3Style, pStyle, codeStyle,
  stepList, Step, callout,
  mockPanel, mockHero, mockHeroEyebrow, mockLabel, flowWrap, flowStep, arrow,
  mockInput, mockFieldLabel, mockRow, mockField, btn,
  emailMock, emailHeader, emailBody, pill,
} from "./guideKit";

type SectionKey =
  | "overview" | "register" | "add" | "upload" | "metadata" | "owners"
  | "submit" | "review" | "approval" | "approve" | "reject" | "bulk"
  | "periodic" | "token" | "newrevision" | "supersede" | "statuses";

const sections: GuideSectionDef[] = [
  { key: "overview",    label: "Overview",               group: "Getting Started" },
  { key: "register",    label: "The Register",           group: "Getting Started" },
  { key: "add",         label: "Adding a Document",      group: "Core Workflows" },
  { key: "upload",      label: "Uploading a File",       group: "Core Workflows" },
  { key: "metadata",    label: "Editing Metadata",       group: "Core Workflows" },
  { key: "owners",      label: "Changing Owners",        group: "Core Workflows" },
  { key: "submit",      label: "Submit for Review",      group: "Review & Approval" },
  { key: "review",      label: "Accept / Reject Review", group: "Review & Approval" },
  { key: "approval",    label: "Send to Approver",       group: "Review & Approval" },
  { key: "approve",     label: "Approving",              group: "Review & Approval" },
  { key: "reject",      label: "Rejecting",              group: "Review & Approval" },
  { key: "bulk",        label: "Bulk Review Rounds",     group: "Review & Approval" },
  { key: "periodic",    label: "Periodic Review",        group: "Periodic Review" },
  { key: "token",       label: "Approver Confirmation",  group: "Periodic Review" },
  { key: "newrevision", label: "New Revision",           group: "Revisions" },
  { key: "supersede",   label: "Superseding",            group: "Revisions" },
  { key: "statuses",    label: "Status Reference",       group: "Reference" },
];

function badge(type: string): CSSProperties {
  const map: Record<string, { bg: string; color: string }> = {
    draft:      { bg: imsColours.page,       color: imsColours.muted },
    review:     { bg: imsColours.warning,    color: "#ffffff" },
    reviewed:   { bg: imsColours.brandAccent, color: "#ffffff" },
    approved:   { bg: imsColours.brand,      color: "#ffffff" },
    rejected:   { bg: imsColours.danger,     color: "#ffffff" },
    superseded: { bg: imsColours.page,       color: imsColours.muted },
  };
  const t = map[type] || map.draft;
  return pill(t.bg, t.color);
}

function SectionOverview() {
  return (
    <>
      <div style={eyebrow}>Getting Started</div>
      <h2 style={h2Style}>Overview</h2>
      <p style={pStyle}>The Document Control module is the authoritative register of all Enshore controlled documents. Every document passes through a structured workflow before it can be used operationally. The system tracks revisions, responsible persons, review cycles, and maintains a full activity log. It works on a phone as well as a desktop.</p>
      <div style={flowWrap}>
        <div style={flowStep()}>Draft</div><div style={arrow}>→</div>
        <div style={flowStep()}>Pending Review</div><div style={arrow}>→</div>
        <div style={flowStep()}>Reviewed</div><div style={arrow}>→</div>
        <div style={flowStep()}>Pending Approval</div><div style={arrow}>→</div>
        <div style={flowStep(true)}>Approved / Live</div>
      </div>
      <h3 style={h3Style}>Key roles</h3>
      <p style={pStyle}><strong>Originator</strong> — creates the document and manages its content. Chosen from People Management.<br /><strong>Reviewer</strong> — checks content and accepts or rejects before approval.<br /><strong>Approver</strong> — final authority; their approval makes the document live.<br /><strong>Review cycle</strong> — how often the document must be formally reviewed (1, 2 or 3 years). The system tracks <code style={codeStyle}>Next Review Date</code> and surfaces overdue documents automatically.</p>
      <p style={pStyle}>The reviewer and approver can act in two ways: with the buttons inside the document in the IMS, or with the secure buttons in the notification email. Both are recorded in the document activity log.</p>
    </>
  );
}

function SectionRegister() {
  return (
    <>
      <div style={eyebrow}>Getting Started</div>
      <h2 style={h2Style}>The Document Register</h2>
      <div style={mockPanel}>
        <div style={{ ...mockLabel, marginBottom: 0, marginLeft: 0 }}>Document Register</div>
        <div style={{ ...mockHero, marginTop: 8 }}>
          <div style={mockHeroEyebrow}>Enshore IMS · Document Control</div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>Document Control</div>
        </div>
        <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
          {["Dashboard", "Document Register", "Create Document", "Workflow", "Archive", "Reports"].map((tab) => (
            <span key={tab} style={tab === "Document Register" ? btn("primary") : btn("ghost")}>{tab}</span>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
          {[["42","Total Documents"],["31","Live Documents"],["4","Pending Review"],["7","Review Overdue"]].map(([v,l]) => (
            <div key={l} style={{ background: "#fff", border: `1px solid ${imsColours.border}`, borderRadius: 8, padding: "8px 14px", textAlign: "center" }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: imsColours.brand }}>{v}</div>
              <div style={{ fontSize: 9, fontWeight: 700, color: imsColours.muted, textTransform: "uppercase", letterSpacing: "0.05em" }}>{l}</div>
            </div>
          ))}
        </div>
        <table style={imsTableStyle}>
          <thead>
            <tr>
              {["Document No.", "Title", "Type", "Owner", "Revision", "Workflow", "Status", "Next Review"].map(h => (
                <th key={h} style={imsTableHeadStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ ...imsTableCellStyle, fontWeight: 800, color: imsColours.brand, whiteSpace: "nowrap" }}>ENS-HSEQ-PRO-001</td>
              <td style={imsTableCellStyle}>Document Control Procedure</td>
              <td style={imsTableCellStyle}>Procedure</td>
              <td style={imsTableCellStyle}>HSEQ</td>
              <td style={imsTableCellStyle}>B</td>
              <td style={imsTableCellStyle}><span style={badge("approved")}>Approved</span></td>
              <td style={imsTableCellStyle}>Live</td>
              <td style={imsTableCellStyle}>12 Jan 2027<br /><span style={{ color: imsColours.brand, fontSize: 10, fontWeight: 700 }}>In date</span></td>
            </tr>
            <tr>
              <td style={{ ...imsTableCellStyle, fontWeight: 800, color: imsColours.brand, whiteSpace: "nowrap" }}>ENS-HSEQ-TMP-001</td>
              <td style={imsTableCellStyle}>Monthly Safety Inspection Checklist</td>
              <td style={imsTableCellStyle}>Template</td>
              <td style={imsTableCellStyle}>HSEQ</td>
              <td style={imsTableCellStyle}>A</td>
              <td style={imsTableCellStyle}><span style={badge("review")}>Pending Review</span></td>
              <td style={imsTableCellStyle}>Under Review</td>
              <td style={{ ...imsTableCellStyle, color: imsColours.danger, fontWeight: 700 }}>19 Aug 2026<br /><span style={{ fontSize: 10 }}>Overdue</span></td>
            </tr>
          </tbody>
        </table>
      </div>
      <h3 style={h3Style}>The workspace tabs</h3>
      <p style={pStyle}><strong>Dashboard</strong> — KPI cards (each one is a shortcut that filters the register), overdue reviews by department, the review pipeline, the workflow queue, and a people coverage strip showing how many documents have an originator, reviewer and approver set (and how many have all three). On a phone the strip wraps so every figure stays readable. A warning appears when live documents have no review date; <strong>Filter &amp; fix →</strong> takes you to them.<br />
      <strong>Document Register</strong> — every controlled document.<br />
      <strong>Create Document</strong> — the new document form.<br />
      <strong>Workflow</strong> — the register pre-filtered to documents in Pending Review, Reviewed, Pending Approval or Rejected.<br />
      <strong>Archive</strong> — archived, superseded and obsolete documents.<br />
      <strong>Reports</strong> — PDF reports (see below).</p>
      <h3 style={h3Style}>Searching and filtering</h3>
      <p style={pStyle}>Type in the search box to find a document by number, title, description, type, department or asset. Click <strong>Show Filters</strong> to filter by status, workflow status, type, owner and review state (Overdue, Due soon, In date, Not set); <strong>Clear Filters</strong> resets everything. Click any row to open a control summary beside the register, then <strong>Open Full Detail / Edit</strong> to load the full detail panel. If a file is attached, <strong>Open Controlled File</strong> opens it straight away. The review-state badge is <strong>Due soon</strong> inside 30 days of the next review date and red <strong>Overdue</strong> once it has passed. The filter buttons (Show/Hide Filters, Clear Filters) are clearly outlined white buttons, and on a phone the filter bar and the panel header buttons wrap onto extra lines so nothing is cut off.</p>
      <h3 style={h3Style}>Reports</h3>
      <p style={pStyle}>On the <strong>Reports</strong> tab choose <strong>Overdue Review Report</strong>, <strong>Due Soon Review Report</strong> or <strong>Filtered Register Report</strong> (which follows the search and filters currently applied). Each one downloads as a landscape PDF.</p>
    </>
  );
}

function SectionAdd() {
  return (
    <>
      <div style={eyebrow}>Core Workflows</div>
      <h2 style={h2Style}>Adding a New Document</h2>
      <div style={callout("info")}>
        <span>ℹ</span>
        <div>The document number is auto-generated from the scope, type, and department you select — you cannot enter it manually. Company documents use <code style={codeStyle}>ENS-[DEPT]-[TYPE]-###</code> (for example ENS-HSEQ-PRO-035); asset documents use <code style={codeStyle}>[Asset Document ID Code]-AST-[TYPE]-###</code>. The next free sequence number is shown beside the Create button.</div>
      </div>
      <div style={stepList}>
        <Step n={1}>Open the <strong>Create Document</strong> tab.</Step>
        <Step n={2}>Tick <code style={codeStyle}>Asset Specific Document?</code> only if the document belongs to one asset, then pick the <code style={codeStyle}>Asset</code>. The asset must have a Document ID Code or it cannot be used. Leave it unticked for a company/system document.</Step>
        <Step n={3}>Select <code style={codeStyle}>Document Type</code> (Procedure, Form, Register, Policy, Specification, List, Work Instruction, Template, Plan, Chart, Report, Risk Assessment, Rescue Plan, Training or Exam) and <code style={codeStyle}>Department</code> (HSEQ, Assets, Human Resources, Commercial, Crewing, Engineering, Finance, Logistics, Procurement, Project or Operations). Department is fixed for asset documents.</Step>
        <Step n={4}>Enter the <code style={codeStyle}>Title</code>. <code style={codeStyle}>Current Revision</code> defaults to A.</Step>
        <Step n={5}>Set the <code style={codeStyle}>Review Cycle</code> (1, 2 or 3 years).</Step>
        <Step n={6}>Choose the <code style={codeStyle}>Originator</code> by typing a name and picking from People Management. The email is filled in for you.</Step>
        <Step n={7}>Add an optional <code style={codeStyle}>Description</code> and <code style={codeStyle}>General Comments</code>.</Step>
        <Step n={8}>Click <strong>Create Draft Document →</strong>. The document is created in <span style={badge("draft")}>Draft</span>.</Step>
      </div>
      <div style={callout("info")}>
        <span>ℹ</span>
        <div>The Reviewer and Approver are <strong>not</strong> chosen on this form. You pick them in the document&apos;s workflow box when you click <strong>Send to Reviewer</strong>, and you can upload the controlled file once the record exists.</div>
      </div>
      <div style={mockPanel}>
        <div style={mockLabel}>Create New Document form</div>
        <div style={mockRow}>
          <div style={mockField()}><div style={mockFieldLabel}>Asset Specific Document?</div><select style={mockInput}><option>No - company/system</option></select></div>
          <div style={mockField()}><div style={mockFieldLabel}>Document Type</div><select style={mockInput}><option>Procedure</option></select></div>
          <div style={mockField()}><div style={mockFieldLabel}>Department</div><select style={mockInput}><option>HSEQ</option></select></div>
        </div>
        <div style={mockRow}>
          <div style={{ ...mockField(2) }}><div style={mockFieldLabel}>Title</div><input style={mockInput} defaultValue="Document Control Procedure" readOnly /></div>
          <div style={mockField()}><div style={mockFieldLabel}>Review Cycle</div><input style={mockInput} defaultValue="2 years" readOnly /></div>
        </div>
        <div style={mockRow}>
          <div style={mockField()}><div style={mockFieldLabel}>Originator</div><input style={mockInput} defaultValue="Jordan Beaton" readOnly /></div>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <span style={btn("primary")}>Create Draft Document →</span>
          <span style={btn("ghost")}>Cancel</span>
        </div>
      </div>
    </>
  );
}

function SectionUpload() {
  return (
    <>
      <div style={eyebrow}>Core Workflows</div>
      <h2 style={h2Style}>Uploading a Controlled File</h2>
      <p style={pStyle}>A document record can exist without a file, but upload the controlled file before you send the document to the reviewer so they have something to review. The file is what the reviewer and approver open from their emails.</p>
      <div style={stepList}>
        <Step n={1}>Open the document from the register (<strong>Open Full Detail / Edit</strong>).</Step>
        <Step n={2}>Go to the <strong>File</strong> tab. Click <strong>Upload new version</strong>.</Step>
        <Step n={3}>Choose the file from your computer or phone. You can upload PDF, Word, Excel, PowerPoint, CSV, text files and photos. It is stored securely — signed links are generated automatically and the file is never publicly accessible.</Step>
        <Step n={4}>Once uploaded the file shows with its name, revision, size and upload date. Click <strong>Open ↗</strong> (or <strong>Open Controlled File</strong> in the register summary) to view it. Stored files open on phones, including iPhones.</Step>
        <Step n={5}>Use <strong>Remove file</strong> if the wrong file was uploaded.</Step>
      </div>
      <div style={callout("info")}>
        <span>ℹ</span>
        <div>Files are view and download only inside the IMS — they cannot be edited here. <strong>Upload new version</strong> replaces the file on the <em>current revision</em>; the files of earlier revisions stay available in the <strong>History</strong> tab.</div>
      </div>
      <div style={callout("warning")}>
        <span>⚠</span>
        <div>Uploading a new file to an <strong>Approved</strong> document does not change its status or revision. To issue a new revision use <strong>Up-rev</strong> (see New Revision).</div>
      </div>
    </>
  );
}

function SectionMetadata() {
  return (
    <>
      <div style={eyebrow}>Core Workflows</div>
      <h2 style={h2Style}>Editing Document Metadata</h2>
      <p style={pStyle}>Title, description, type, department, review cycle, issue date, originator and comments can be updated from the <strong>Details</strong> tab of the document.</p>
      <div style={stepList}>
        <Step n={1}>Open the document from the register (<strong>Open Full Detail / Edit</strong>) and stay on the <strong>Details</strong> tab.</Step>
        <Step n={2}>Update any of: <code style={codeStyle}>Title</code>, <code style={codeStyle}>Document Type</code>, <code style={codeStyle}>Department</code>, <code style={codeStyle}>Review Cycle</code>, <code style={codeStyle}>Issue Date</code>, <code style={codeStyle}>Originator</code>, <code style={codeStyle}>Description</code> and <code style={codeStyle}>General Comments</code>.</Step>
        <Step n={3}>Click <strong>Save Changes</strong> at the foot of the panel.</Step>
      </div>
      <div style={callout("info")}>
        <span>ℹ</span>
        <div>The <strong>document number</strong> is locked after creation and <code style={codeStyle}>Next Review Date</code> is calculated for you (issue date plus review cycle), so it is shown read-only. Normally the revision letter only changes through <strong>Up-rev</strong>. The General Comments box is also where the &quot;What&apos;s changed&quot; note comes from (see Submit for Review).</div>
      </div>
      <div style={callout("warning")}>
        <span>⚠</span>
        <div><strong>Delete Document</strong> (bottom right of the panel) asks you to confirm. Live (approved) documents cannot be deleted — supersede or archive them instead.</div>
      </div>
    </>
  );
}

function SectionOwners() {
  return (
    <>
      <div style={eyebrow}>Core Workflows</div>
      <h2 style={h2Style}>Changing Document Owners</h2>
      <p style={pStyle}>The Originator is chosen when the document is created; the Reviewer and Approver are chosen when it is sent to review. All three can be updated at any time from <strong>Update responsible persons</strong>. Changes take effect on the next workflow action — emails already sent are not recalled.</p>
      <div style={stepList}>
        <Step n={1}>Open the document, go to the <strong>File</strong> tab and click <strong>Update responsible persons</strong>.</Step>
        <Step n={2}>Update the Originator, Reviewer, and/or Approver — each is selected from People Management, which resolves their email automatically.</Step>
        <Step n={3}>Click <strong>Save changes</strong>. The change (old name → new name) is recorded in the document activity log without up-revving.</Step>
      </div>
      <div style={mockPanel}>
        <div style={mockLabel}>Update Responsible Persons</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          {[["Originator","Jordan Beaton","jbeaton@enshoresubsea.com"],["Reviewer","Louise Harvey","l.harvey@enshoresubsea.com"],["Approver","Jordan Beaton","jbeaton@enshoresubsea.com"]].map(([role, name, email]) => (
            <div key={role} style={{ background: "#fff", border: `1px solid ${imsColours.border}`, borderRadius: 7, padding: "8px 10px" }}>
              <div style={{ fontSize: 9, fontWeight: 800, color: imsColours.muted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3 }}>{role}</div>
              <div style={{ fontSize: 12, fontWeight: 700 }}>{name}</div>
              <div style={{ fontSize: 11, color: imsColours.muted }}>{email}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={callout("warning")}>
        <span>⚠</span>
        <div>If you change the Approver while a document is <strong>Pending Approval</strong>, the new approver will not automatically receive a new email. Send the document through the workflow step again to trigger a fresh notification.</div>
      </div>
    </>
  );
}

function SectionSubmit() {
  return (
    <>
      <div style={eyebrow}>Review & Approval</div>
      <h2 style={h2Style}>Submit for Review</h2>
      <p style={pStyle}>A document in <strong>Draft</strong> (or <strong>Rejected</strong>, after rework) is sent to its Reviewer from the workflow box in the left-hand side of the document panel. This emails the Reviewer with secure action buttons.</p>
      <div style={stepList}>
        <Step n={1}>Open the document. Check the controlled file is uploaded, and put a short summary of the changes in <code style={codeStyle}>General Comments</code> on the Details tab (click <strong>Save Changes</strong>) if you want the reviewer to see it.</Step>
        <Step n={2}>In the workflow box (headed <strong>Send to reviewer</strong>) pick the <code style={codeStyle}>Reviewer</code> and the <code style={codeStyle}>Approver</code> from People Management. Both are required, and both need an email on their People record. The Originator must also be set.</Step>
        <Step n={3}>Click <strong>Send to Reviewer</strong>.</Step>
        <Step n={4}>The document moves to <span style={badge("review")}>Pending Review</span>.</Step>
        <Step n={5}>The Reviewer receives an email with <strong>Accept Review</strong> and <strong>Reject</strong> action buttons and a link to the controlled file. If General Comments has text, it is included as a &quot;What&apos;s changed&quot; note.</Step>
      </div>
      <div style={mockPanel}>
        <div style={mockLabel}>Email received by reviewer</div>
        <div style={emailMock}>
          <div style={emailHeader}>
            <div style={mockHeroEyebrow}>Enshore IMS · Document Control</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>ENS-HSEQ-PRO-001 submitted for review</div>
          </div>
          <div style={emailBody}>
            <p><strong>Document:</strong> ENS-HSEQ-PRO-001 &nbsp;|&nbsp; <strong>Revision:</strong> A</p>
            <p><strong>Originator:</strong> Jordan Beaton</p>
            <div style={{ display: "flex", gap: 8, margin: "12px 0", flexWrap: "wrap" }}>
              <span style={btn("primary")}>✓ Accept Review</span>
              <span style={btn("danger")}>✗ Reject</span>
            </div>
            <p style={{ fontSize: 11, color: imsColours.muted }}>Links are single-use and expire automatically (after 14 days).</p>
          </div>
        </div>
      </div>
    </>
  );
}

function SectionReview() {
  return (
    <>
      <div style={eyebrow}>Review & Approval</div>
      <h2 style={h2Style}>Accepting or Rejecting a Review</h2>
      <p style={pStyle}>The Reviewer can decide from the email, or from inside the document in the IMS. Each email button is a single-use secure link that opens a <strong>Workflow Confirmation</strong> page showing the document, revision, current status and who the action is for.</p>
      <h3 style={h3Style}>Accept Review — from the email</h3>
      <div style={stepList}>
        <Step n={1}>Click <strong>Accept Review</strong> in the notification email.</Step>
        <Step n={2}>On the confirmation page, check the details and click <strong>Confirm Accept Review</strong>.</Step>
        <Step n={3}>The review is recorded against the Reviewer&apos;s name. Because the Approver was already chosen when the document was sent, the document goes straight to <span style={badge("review")}>Pending Approval</span> and the Approver is emailed automatically.</Step>
      </div>
      <h3 style={h3Style}>Accept Review — in the IMS</h3>
      <div style={stepList}>
        <Step n={1}>Open the document. In the workflow box (<strong>Reviewer decision</strong>) click <strong>Accept Review</strong>.</Step>
        <Step n={2}>The document moves to <span style={badge("reviewed")}>Reviewed</span>. Nothing is emailed at this point.</Step>
        <Step n={3}>The Originator (or whoever is progressing it) then clicks <strong>Send to Approver</strong> (see the next section).</Step>
      </div>
      <h3 style={h3Style}>Reject from Review</h3>
      <div style={stepList}>
        <Step n={1}>From the email: click <strong>Reject</strong>, enter the rejection reason on the confirmation page and click <strong>Confirm Reject Document</strong>. In the IMS: in the workflow box choose <code style={codeStyle}>Rejected By</code>, type the <code style={codeStyle}>Rejection Reason</code> (required) and click <strong>Reject</strong>.</Step>
        <Step n={2}>The document returns to <span style={badge("rejected")}>Rejected</span>. The reason is recorded in the activity log and the originator, reviewer and approver are notified.</Step>
        <Step n={3}>The Originator should update the document, upload a revised file, and send it to the reviewer again with <strong>Send to Reviewer</strong>.</Step>
      </div>
      <div style={callout("info")}>
        <span>ℹ</span>
        <div>Email links are <strong>single-use</strong> and expire after 14 days. If a link is used a second time, or has expired, the page says so. Send the document to the reviewer again to generate fresh links.</div>
      </div>
    </>
  );
}

function SectionApproval() {
  return (
    <>
      <div style={eyebrow}>Review & Approval</div>
      <h2 style={h2Style}>Sending to Approver</h2>
      <p style={pStyle}>When the review was accepted <em>in the IMS</em>, the document waits at <strong>Reviewed</strong> until someone sends it on. This deliberate step allows final adjustments first. (If the reviewer accepted from the email, this step has already happened automatically.)</p>
      <div style={stepList}>
        <Step n={1}>Open the document — it should show <span style={badge("reviewed")}>Reviewed</span>.</Step>
        <Step n={2}>In the workflow box (<strong>Send to approver</strong>) confirm or change the <code style={codeStyle}>Approver</code>.</Step>
        <Step n={3}>Click <strong>Send to Approver</strong>.</Step>
        <Step n={4}>The document moves to <span style={badge("review")}>Pending Approval</span>.</Step>
        <Step n={5}>The Approver receives an email with <strong>Approve Document</strong> and <strong>Reject</strong> buttons, plus a link to the controlled file and, if General Comments has text, a &quot;What&apos;s changed&quot; note.</Step>
      </div>
    </>
  );
}

function SectionApprove() {
  return (
    <>
      <div style={eyebrow}>Review & Approval</div>
      <h2 style={h2Style}>Approving a Document</h2>
      <div style={stepList}>
        <Step n={1}>Click <strong>Approve Document</strong> in the notification email and, on the confirmation page, click <strong>Confirm Approve Document</strong>. Or open the document in the IMS and click <strong>Approve Document</strong> in the workflow box (<strong>Approver decision</strong>).</Step>
        <Step n={2}>The document moves to <span style={badge("approved")}>Approved</span> and its status becomes Live. <code style={codeStyle}>Approved By</code>, <code style={codeStyle}>Approved At</code>, and <code style={codeStyle}>Next Review Date</code> are set automatically.</Step>
        <Step n={3}>A confirmation email goes to the originator, reviewer and approver.</Step>
      </div>
      <div style={callout("info")}>
        <span>ℹ</span>
        <div>Approving automatically calculates <code style={codeStyle}>Next Review Date</code> by adding the document&apos;s <code style={codeStyle}>Review Cycle (years)</code> to today&apos;s date.</div>
      </div>
    </>
  );
}

function SectionReject() {
  return (
    <>
      <div style={eyebrow}>Review & Approval</div>
      <h2 style={h2Style}>Rejecting a Document</h2>
      <div style={stepList}>
        <Step n={1}>Click <strong>Reject</strong> in the approval notification email, enter the rejection reason on the confirmation page and confirm. Or, in the IMS, choose <code style={codeStyle}>Rejected By</code>, type the <code style={codeStyle}>Rejection Reason</code> and click <strong>Reject</strong>.</Step>
        <Step n={2}>The document returns to <span style={badge("rejected")}>Rejected</span> and the originator, reviewer and approver are notified with the reason. The reason is also shown on the document&apos;s Details tab.</Step>
        <Step n={3}>The Originator should address the feedback, upload a revised file if needed, and click <strong>Send to Reviewer</strong> to restart the review.</Step>
      </div>
    </>
  );
}

function SectionBulk() {
  return (
    <>
      <div style={eyebrow}>Review & Approval</div>
      <h2 style={h2Style}>Bulk Review Rounds</h2>
      <p style={pStyle}>Before an audit, a whole group of overdue documents (for example every overdue HSEQ document) can be put through review and approval together. An administrator starts the round. You then receive <strong>one email for the whole batch</strong> instead of one per document.</p>
      <div style={flowWrap}>
        <div style={flowStep()}>Round started</div><div style={arrow}>→</div>
        <div style={flowStep()}>Reviewer: &quot;You have N documents to review&quot;</div><div style={arrow}>→</div>
        <div style={flowStep()}>Approver: &quot;You have N documents to approve&quot;</div><div style={arrow}>→</div>
        <div style={flowStep(true)}>Documents Live</div>
      </div>
      <h3 style={h3Style}>If you are the reviewer</h3>
      <div style={stepList}>
        <Step n={1}>Open the link in the digest email while signed in to the IMS as yourself.</Step>
        <Step n={2}>The <strong>Bulk review</strong> page lists the documents still waiting. All are ticked; untick any you are not ready to accept.</Step>
        <Step n={3}>Click <strong>Accept review for N documents</strong>. The approver is sent the matching approval digest automatically.</Step>
      </div>
      <h3 style={h3Style}>If you are the approver</h3>
      <div style={stepList}>
        <Step n={1}>Open your digest link while signed in to the IMS. The page is titled <strong>Bulk approval</strong>.</Step>
        <Step n={2}>Untick anything you want to hold back and click <strong>Approve for N documents</strong>. They go Live straight away, and the next review date restarts from the approval date and each document&apos;s review cycle.</Step>
      </div>
      <div style={callout("info")}>
        <span>ℹ</span>
        <div>The link only lets you act when you are signed in as the person it was addressed to; anyone else can look but not confirm. Each document gets its own activity-log entry with your name, and anything left unticked can still be handled from its own page. Links expire after 14 days.</div>
      </div>
    </>
  );
}

function SectionPeriodic() {
  return (
    <>
      <div style={eyebrow}>Periodic Review</div>
      <h2 style={h2Style}>Mark Reviewed — No Changes</h2>
      <p style={pStyle}>For documents that are already Approved and due for their periodic review, you can record that no changes were required without running the full Draft → Review → Approval cycle.</p>
      <div style={callout("warning")}>
        <span>⚠</span>
        <div>The <code style={codeStyle}>Next Review Date</code> does <strong>not</strong> advance immediately. It only advances once the Approver confirms via their email token — ensuring every periodic review has a formal sign-off.</div>
      </div>
      <div style={stepList}>
        <Step n={1}>Open the document. It must be in <span style={badge("approved")}>Approved</span> status.</Step>
        <Step n={2}>Go to the <strong>File</strong> tab and click <strong>Mark reviewed — no changes</strong>. The button only appears on Approved documents.</Step>
        <Step n={3}>Add any notes in the box that appears (optional), then confirm. Cancelling leaves the document unchanged.</Step>
        <Step n={4}>The review is recorded in the activity log and in the document&apos;s history (the revision does not change). A notification email is sent to the Approver with <strong>Confirm — No Changes Required</strong> and <strong>Raise a Concern</strong> buttons.</Step>
        <Step n={5}>A success message confirms: <em>&quot;Periodic review recorded. An email has been sent to [Approver] to confirm — the next review date will update once they confirm.&quot;</em></Step>
      </div>
      <div style={mockPanel}>
        <div style={mockLabel}>Approver notification email</div>
        <div style={emailMock}>
          <div style={emailHeader}>
            <div style={mockHeroEyebrow}>Enshore IMS · Document Control</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>ENS-HSEQ-TMP-001 periodic review completed — please confirm</div>
          </div>
          <div style={emailBody}>
            <p><strong>Reviewed by:</strong> Jordan Beaton &nbsp;|&nbsp; <strong>Outcome:</strong> No changes required</p>
            <div style={{ display: "flex", gap: 8, margin: "12px 0", flexWrap: "wrap" }}>
              <span style={btn("primary")}>✓ Confirm — No Changes Required</span>
              <span style={btn("danger")}>⚠ Raise a Concern</span>
            </div>
            <p style={{ fontSize: 11, color: imsColours.muted }}>Links are single-use and expire automatically.</p>
          </div>
        </div>
      </div>
    </>
  );
}

function SectionToken() {
  return (
    <>
      <div style={eyebrow}>Periodic Review</div>
      <h2 style={h2Style}>Approver Confirmation</h2>
      <h3 style={h3Style}>Confirm — No Changes Required</h3>
      <div style={stepList}>
        <Step n={1}>Click <strong>Confirm — No Changes Required</strong> in the email.</Step>
        <Step n={2}>On the secure confirmation page, check the details and click <strong>Confirm Action</strong>.</Step>
        <Step n={3}>The system advances <code style={codeStyle}>Next Review Date</code> by the document&apos;s review cycle, sets <code style={codeStyle}>Approved At</code> to today, and records the activity.</Step>
        <Step n={4}>The reviewer who recorded the periodic review is notified that the approver has confirmed it.</Step>
      </div>
      <h3 style={h3Style}>Raise a Concern</h3>
      <div style={stepList}>
        <Step n={1}>Click <strong>Raise a Concern</strong> in the email.</Step>
        <Step n={2}>Describe the concern if you are asked to, and confirm on the secure confirmation page.</Step>
        <Step n={3}>The document <strong>remains Approved</strong> — the concern is logged in the activity and the reviewer is notified. No dates are changed.</Step>
        <Step n={4}>The reviewer should follow up with the approver directly, potentially issuing a new revision or re-running the full review cycle.</Step>
      </div>
    </>
  );
}

function SectionNewRevision() {
  return (
    <>
      <div style={eyebrow}>Revisions</div>
      <h2 style={h2Style}>Issuing a New Revision</h2>
      <p style={pStyle}>When an approved document needs substantive changes, issue a new revision. This archives the current revision and starts the full workflow again at Draft. Describe what&apos;s changing when prompted — that description is saved to General Comments and carries through automatically into the reviewer and approver emails.</p>
      <div style={stepList}>
        <Step n={1}>Open the document and go to the <strong>File</strong> tab.</Step>
        <Step n={2}>Click <strong>Up-rev to [next letter]</strong> and enter the comments for the new revision in the prompt. A description is required — cancelling or leaving it empty does not open the revision.</Step>
        <Step n={3}>The revision letter advances (A → B → C, etc.). The previous revision&apos;s file and approval record are kept in the <strong>History</strong> tab.</Step>
        <Step n={4}>The document resets to <span style={badge("draft")}>Draft</span> at the new revision with no file attached, and the description is saved to General Comments.</Step>
        <Step n={5}>Upload the updated controlled file and send it through the full review and approval workflow — the reviewer and approver will see a &quot;What&apos;s changed&quot; note in their emails automatically.</Step>
      </div>
      <div style={flowWrap}>
        <div style={flowStep(true)}>Rev A — Approved</div><div style={arrow}>→</div>
        <div style={flowStep(true)}>Rev B — Draft</div><div style={arrow}>→</div>
        <div style={flowStep()}>Review</div><div style={arrow}>→</div>
        <div style={flowStep()}>Approval</div><div style={arrow}>→</div>
        <div style={flowStep()}>Rev B — Approved</div>
      </div>
    </>
  );
}

function SectionSupersede() {
  return (
    <>
      <div style={eyebrow}>Revisions</div>
      <h2 style={h2Style}>Superseding a Document</h2>
      <p style={pStyle}>Use <strong>Supersede &amp; Create New</strong> when content needs to move to a brand-new document number — for example when a procedure is being split into two separate documents.</p>
      <div style={stepList}>
        <Step n={1}>Open an <span style={badge("approved")}>Approved</span> document and click <strong>Supersede &amp; Create New</strong> in the workflow box. Confirm the prompt. You need both edit and create permission.</Step>
        <Step n={2}>A new document record is created in Draft at revision A, with the next number in the same sequence, the same title, type, department, review cycle and originator. The reviewer and approver are cleared, so choose them when you send it for review. Its General Comments say which document it supersedes.</Step>
        <Step n={3}>The original document is marked <span style={badge("superseded")}>Superseded</span> and the change is logged and emailed.</Step>
        <Step n={4}>The new document opens in the register ready for you to upload its file.</Step>
      </div>
      <div style={callout("danger")}>
        <span style={{ color: imsColours.danger }}>⛔</span>
        <div>Superseding is <strong>irreversible</strong>. The original document cannot be returned to Approved once marked Superseded. Confirm carefully before proceeding.</div>
      </div>
    </>
  );
}

function SectionStatuses() {
  const rows: [string, string, string, string][] = [
    ["draft",      "Draft",           "Created, not yet in review. Upload a controlled file, choose reviewer and approver.", "Send to Reviewer"],
    ["review",     "Pending Review",  "Reviewer notified. Awaiting Accept Review or Reject (email or IMS).",      "Reviewer accepts or rejects"],
    ["reviewed",   "Reviewed",        "Reviewer accepted in the IMS. Waiting to be sent to the approver.",        "Click Send to Approver"],
    ["review",     "Pending Approval","Approver notified. Awaiting Approve or Reject (email or IMS).",            "Approver approves or rejects"],
    ["approved",   "Approved",        "Fully approved; status shows Live. Next Review Date has been set.",        "Periodic review when due"],
    ["rejected",   "Rejected",        "Rejected at review or approval stage. Reason recorded in activity log.",   "Revise and Send to Reviewer"],
    ["superseded", "Superseded",      "Replaced by a newer document. Shown in the Archive tab. No forward action.", "—"],
    ["superseded", "Archived",        "Retired from use (also shown in the Archive tab). No forward action.",     "—"],
  ];
  return (
    <>
      <div style={eyebrow}>Reference</div>
      <h2 style={h2Style}>Status Reference</h2>
      <div style={{ overflowX: "auto" }}>
        <table style={imsTableStyle}>
          <thead>
            <tr>
              {["Status", "Meaning", "Next Action"].map(h => (
                <th key={h} style={imsTableHeadStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(([key, label, meaning, next]) => (
              <tr key={label}>
                <td style={{ ...imsTableCellStyle, whiteSpace: "nowrap" }}><span style={badge(key)}>{label}</span></td>
                <td style={imsTableCellStyle}>{meaning}</td>
                <td style={{ ...imsTableCellStyle, whiteSpace: "nowrap", color: imsColours.muted }}>{next}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

const sectionComponents: Record<SectionKey, () => ReactElement> = {
  overview:    SectionOverview,
  register:    SectionRegister,
  add:         SectionAdd,
  upload:      SectionUpload,
  metadata:    SectionMetadata,
  owners:      SectionOwners,
  submit:      SectionSubmit,
  review:      SectionReview,
  approval:    SectionApproval,
  approve:     SectionApprove,
  reject:      SectionReject,
  bulk:        SectionBulk,
  periodic:    SectionPeriodic,
  token:       SectionToken,
  newrevision: SectionNewRevision,
  supersede:   SectionSupersede,
  statuses:    SectionStatuses,
};

export const documentControlGuide: GuideDefinition = {
  id: "documents",
  navLabel: "Document Control",
  guideLabel: "Document Control",
  defaultSection: "overview",
  sections,
  sectionComponents,
};
