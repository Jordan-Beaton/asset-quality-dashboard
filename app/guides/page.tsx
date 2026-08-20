"use client";

import { useState } from "react";
import type { CSSProperties } from "react";
import { QualityPageHero } from "../../src/components/QualityPageHero";
import { ImsTopMetaRow } from "../../src/components/ImsPrimitives";
import {
  imsColours, imsPanelStyle, imsTableStyle,
  imsTableHeadStyle, imsTableCellStyle,
} from "../../src/components/imsTheme";

// ── Types ─────────────────────────────────────────────────────────────────────

type SectionKey =
  | "overview"
  | "register"
  | "add"
  | "upload"
  | "metadata"
  | "owners"
  | "submit"
  | "review"
  | "approval"
  | "approve"
  | "reject"
  | "periodic"
  | "token"
  | "newrevision"
  | "supersede"
  | "statuses";

type Section = { key: SectionKey; label: string; group: string };

const sections: Section[] = [
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
  { key: "periodic",    label: "Periodic Review",        group: "Periodic Review" },
  { key: "token",       label: "Approver Confirmation",  group: "Periodic Review" },
  { key: "newrevision", label: "New Revision",           group: "Revisions" },
  { key: "supersede",   label: "Superseding",            group: "Revisions" },
  { key: "statuses",    label: "Status Reference",       group: "Reference" },
];

// ── Styles ────────────────────────────────────────────────────────────────────

const page: CSSProperties = { display: "grid", gap: 16 };

const navBar: CSSProperties = {
  background: imsColours.panel,
  border: `1px solid ${imsColours.border}`,
  borderRadius: 14,
  padding: "10px 14px",
  display: "flex",
  gap: 6,
  flexWrap: "wrap" as const,
  alignItems: "center",
};

const navGroup: CSSProperties = {
  fontSize: 9,
  fontWeight: 800,
  letterSpacing: "0.08em",
  textTransform: "uppercase" as const,
  color: imsColours.muted,
  marginRight: 4,
  marginLeft: 6,
  whiteSpace: "nowrap" as const,
};

const navBtn = (active: boolean): CSSProperties => ({
  background: active ? imsColours.brand : imsColours.page,
  color: active ? "#ffffff" : imsColours.ink,
  border: "none",
  borderRadius: 8,
  padding: "6px 11px",
  fontSize: 11,
  fontWeight: 700,
  cursor: "pointer",
  whiteSpace: "nowrap" as const,
});

const content: CSSProperties = {
  ...imsPanelStyle,
  padding: "28px 32px",
  minHeight: 400,
};

const eyebrow: CSSProperties = {
  fontSize: 9,
  fontWeight: 800,
  letterSpacing: "0.1em",
  textTransform: "uppercase" as const,
  color: imsColours.brandAccent,
  marginBottom: 6,
};

const h2Style: CSSProperties = {
  fontSize: 18,
  fontWeight: 700,
  color: imsColours.brand,
  marginBottom: 14,
  paddingBottom: 10,
  borderBottom: `2px solid ${imsColours.page}`,
};

const h3Style: CSSProperties = {
  fontSize: 13,
  fontWeight: 800,
  color: imsColours.ink,
  margin: "20px 0 8px",
};

const pStyle: CSSProperties = {
  fontSize: 13,
  lineHeight: 1.7,
  color: imsColours.ink,
  marginBottom: 10,
};

const stepList: CSSProperties = {
  display: "flex",
  flexDirection: "column" as const,
  gap: 8,
  margin: "14px 0",
};

const stepRow: CSSProperties = {
  display: "flex",
  gap: 12,
  alignItems: "flex-start",
  fontSize: 13,
  lineHeight: 1.55,
};

const stepNum: CSSProperties = {
  flexShrink: 0,
  width: 22,
  height: 22,
  background: imsColours.brand,
  color: "#ffffff",
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 10,
  fontWeight: 800,
  marginTop: 1,
};

const callout = (tone: "info" | "warning" | "danger"): CSSProperties => ({
  display: "flex",
  gap: 10,
  alignItems: "flex-start",
  padding: "11px 14px",
  borderRadius: 8,
  margin: "14px 0",
  fontSize: 12,
  lineHeight: 1.55,
  background: tone === "danger"
    ? imsColours.brandSoft
    : imsColours.brandSoft,
  border: `1px solid ${tone === "danger" ? imsColours.danger : imsColours.brandAccent}`,
  color: tone === "danger" ? imsColours.danger : imsColours.brand,
});

const mockPanel: CSSProperties = {
  background: imsColours.page,
  border: `1px solid ${imsColours.border}`,
  borderRadius: 10,
  padding: 14,
  margin: "16px 0",
  fontSize: 12,
};

const mockHero: CSSProperties = {
  background: `linear-gradient(135deg, ${imsColours.brand} 0%, ${imsColours.brand} 60%, ${imsColours.brandAccent} 160%)`,
  borderRadius: "8px 8px 0 0",
  padding: "13px 16px",
  color: "#fff",
  marginBottom: 8,
};

const mockLabel: CSSProperties = {
  fontSize: 9,
  fontWeight: 800,
  letterSpacing: "0.07em",
  textTransform: "uppercase" as const,
  color: imsColours.muted,
  marginBottom: 8,
  display: "flex",
  alignItems: "center",
  gap: 6,
};

const badge = (type: string): CSSProperties => {
  const map: Record<string, { bg: string; color: string }> = {
    draft:     { bg: imsColours.page,      color: imsColours.muted },
    review:    { bg: imsColours.warning,   color: "#ffffff" },
    reviewed:  { bg: imsColours.brandAccent, color: "#ffffff" },
    approved:  { bg: imsColours.brand,     color: "#ffffff" },
    rejected:  { bg: imsColours.danger,    color: "#ffffff" },
    superseded:{ bg: imsColours.page,      color: imsColours.muted },
  };
  const t = map[type] || map.draft;
  return {
    display: "inline-block",
    fontSize: 10, fontWeight: 800,
    padding: "2px 9px", borderRadius: 999,
    background: t.bg, color: t.color,
    whiteSpace: "nowrap" as const,
  };
};

const flowWrap: CSSProperties = {
  display: "flex",
  alignItems: "center",
  flexWrap: "wrap" as const,
  gap: 4,
  margin: "16px 0",
};

const flowStep = (active?: boolean): CSSProperties => ({
  background: active ? imsColours.brand : imsColours.page,
  color: active ? "#fff" : imsColours.ink,
  border: `1px solid ${active ? imsColours.brand : imsColours.border}`,
  borderRadius: 8,
  padding: "7px 12px",
  fontSize: 11,
  fontWeight: 700,
  textAlign: "center" as const,
});

const arrow: CSSProperties = {
  fontSize: 13,
  color: imsColours.muted,
  padding: "0 2px",
};

const mockInput: CSSProperties = {
  width: "100%",
  padding: "7px 10px",
  border: `1px solid ${imsColours.border}`,
  borderRadius: 7,
  background: "#fff",
  color: imsColours.ink,
  fontSize: 12,
  fontFamily: "inherit",
};

const mockFieldLabel: CSSProperties = {
  fontSize: 10,
  fontWeight: 800,
  color: imsColours.muted,
  marginBottom: 3,
  textTransform: "uppercase" as const,
  letterSpacing: "0.05em",
};

const mockRow: CSSProperties = { display: "flex", gap: 10, marginBottom: 10, flexWrap: "wrap" as const };
const mockField = (flex = 1): CSSProperties => ({ flex, minWidth: 140 });

const btn = (tone: "primary" | "ghost" | "danger"): CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  padding: "7px 13px",
  borderRadius: 8,
  fontSize: 12,
  fontWeight: 700,
  border: tone === "ghost" ? `1px solid ${imsColours.border}` : "none",
  background: tone === "primary" ? imsColours.brand : tone === "danger" ? imsColours.danger : "#fff",
  color: tone === "ghost" ? imsColours.brand : "#fff",
  cursor: "default",
});

const emailMock: CSSProperties = {
  background: "#fff",
  border: `1px solid ${imsColours.border}`,
  borderRadius: 8,
  overflow: "hidden",
  fontSize: 12,
  lineHeight: 1.6,
};

const emailHeader: CSSProperties = {
  background: `linear-gradient(135deg, ${imsColours.brand} 0%, ${imsColours.brand} 60%, ${imsColours.brandAccent} 160%)`,
  padding: "13px 16px",
};

const emailBody: CSSProperties = { padding: "14px 16px" };

const codeStyle: CSSProperties = {
  background: imsColours.page,
  border: `1px solid ${imsColours.border}`,
  borderRadius: 4,
  padding: "1px 6px",
  fontSize: 11,
  fontFamily: "monospace",
  color: imsColours.brand,
  fontWeight: 700,
};

// ── Step helper ───────────────────────────────────────────────────────────────

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div style={stepRow}>
      <div style={stepNum}>{n}</div>
      <div>{children}</div>
    </div>
  );
}

// ── Section content ───────────────────────────────────────────────────────────

function SectionOverview() {
  return (
    <>
      <div style={eyebrow}>Getting Started</div>
      <h2 style={h2Style}>Overview</h2>
      <p style={pStyle}>The Document Control module is the authoritative register of all Enshore controlled documents. Every document passes through a structured workflow before it can be used operationally. The system tracks revisions, responsible persons, review cycles, and maintains a full activity log.</p>
      <div style={flowWrap}>
        <div style={flowStep()}>Draft</div><div style={arrow}>→</div>
        <div style={flowStep()}>Pending Review</div><div style={arrow}>→</div>
        <div style={flowStep()}>Reviewed</div><div style={arrow}>→</div>
        <div style={flowStep()}>Pending Approval</div><div style={arrow}>→</div>
        <div style={flowStep(true)}>Approved / Live</div>
      </div>
      <h3 style={h3Style}>Key roles</h3>
      <p style={pStyle}><strong>Originator</strong> — creates the document and manages its content.<br /><strong>Reviewer</strong> — checks content and accepts or rejects before approval.<br /><strong>Approver</strong> — final authority; their approval makes the document live.<br /><strong>Review cycle</strong> — how often the document must be formally reviewed (1–3 years). The system tracks <code style={codeStyle}>Next Review Date</code> and surfaces overdue documents automatically.</p>
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
          <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.08em", color: imsColours.brandAccent, textTransform: "uppercase", marginBottom: 3 }}>Enshore IMS · Document Control</div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>Document Control</div>
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
          {[["42","Total"],["31","Approved"],["4","In Review"],["7","Overdue"]].map(([v,l]) => (
            <div key={l} style={{ background: "#fff", border: `1px solid ${imsColours.border}`, borderRadius: 8, padding: "8px 14px", textAlign: "center" }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: imsColours.brand }}>{v}</div>
              <div style={{ fontSize: 9, fontWeight: 700, color: imsColours.muted, textTransform: "uppercase", letterSpacing: "0.05em" }}>{l}</div>
            </div>
          ))}
        </div>
        <table style={imsTableStyle}>
          <thead>
            <tr>
              {["Doc No.", "Title", "Rev", "Workflow", "Next Review", ""].map(h => (
                <th key={h} style={imsTableHeadStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ ...imsTableCellStyle, fontWeight: 800, color: imsColours.brand, whiteSpace: "nowrap" }}>ENS-HSEQ-PRO-001</td>
              <td style={imsTableCellStyle}>Document Control Procedure</td>
              <td style={imsTableCellStyle}>B</td>
              <td style={imsTableCellStyle}><span style={badge("approved")}>Approved</span></td>
              <td style={imsTableCellStyle}>12 Jan 2027</td>
              <td style={imsTableCellStyle}><span style={{ ...btn("ghost"), padding: "4px 9px", fontSize: 11 }}>Open</span></td>
            </tr>
            <tr>
              <td style={{ ...imsTableCellStyle, fontWeight: 800, color: imsColours.brand, whiteSpace: "nowrap" }}>ENS-HSEQ-TEM-001</td>
              <td style={imsTableCellStyle}>Monthly Safety Inspection Checklist</td>
              <td style={imsTableCellStyle}>A</td>
              <td style={imsTableCellStyle}><span style={badge("review")}>Pending Review</span></td>
              <td style={{ ...imsTableCellStyle, color: imsColours.danger, fontWeight: 700 }}>19 Aug 2026 ⚠</td>
              <td style={imsTableCellStyle}><span style={{ ...btn("ghost"), padding: "4px 9px", fontSize: 11 }}>Open</span></td>
            </tr>
          </tbody>
        </table>
      </div>
      <p style={pStyle}>Use the filter bar to search by document number, title, department, type, or workflow status. Click <strong>Open</strong> on any row to load the full detail panel. Documents with an overdue <code style={codeStyle}>Next Review Date</code> are highlighted in red.</p>
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
        <div>The document number is auto-generated from the scope, type, and department you select — you cannot enter it manually.</div>
      </div>
      <div style={stepList}>
        <Step n={1}>Click <strong>＋ Add Document</strong> in the register toolbar.</Step>
        <Step n={2}>Select <code style={codeStyle}>Document Scope</code> — <strong>Company/System</strong> or <strong>Asset</strong>. If Asset, select the asset from the dropdown that appears.</Step>
        <Step n={3}>Select <code style={codeStyle}>Document Type</code> (Procedure, Form, Template, Policy, etc.) and <code style={codeStyle}>Department Owner</code>. The document number prefix is generated automatically.</Step>
        <Step n={4}>Enter the <code style={codeStyle}>Title</code> and optional <code style={codeStyle}>Description</code>.</Step>
        <Step n={5}>Set the <code style={codeStyle}>Review Cycle</code> in years and the <code style={codeStyle}>Issue Date</code>.</Step>
        <Step n={6}>Assign the <code style={codeStyle}>Reviewer</code> and <code style={codeStyle}>Approver</code> — name and email. These people will receive email notifications at each workflow stage.</Step>
        <Step n={7}>Click <strong>Save Document</strong>. The document is created in <span style={badge("draft")}>Draft</span> at revision <strong>A</strong>.</Step>
      </div>
      <div style={mockPanel}>
        <div style={mockLabel}>Add Document form</div>
        <div style={mockRow}>
          <div style={mockField()}><div style={mockFieldLabel}>Document Scope</div><select style={mockInput}><option>Company/System</option></select></div>
          <div style={mockField()}><div style={mockFieldLabel}>Document Type</div><select style={mockInput}><option>Procedure</option></select></div>
          <div style={mockField()}><div style={mockFieldLabel}>Department Owner</div><select style={mockInput}><option>HSEQ</option></select></div>
        </div>
        <div style={mockRow}>
          <div style={{ ...mockField(2) }}><div style={mockFieldLabel}>Title</div><input style={mockInput} defaultValue="Document Control Procedure" readOnly /></div>
          <div style={mockField()}><div style={mockFieldLabel}>Review Cycle (years)</div><input style={mockInput} defaultValue="2" readOnly /></div>
        </div>
        <div style={mockRow}>
          <div style={mockField()}><div style={mockFieldLabel}>Reviewer Name</div><input style={mockInput} defaultValue="Louise Harvey" readOnly /></div>
          <div style={mockField()}><div style={mockFieldLabel}>Reviewer Email</div><input style={mockInput} defaultValue="l.harvey@enshoresubsea.com" readOnly /></div>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <span style={btn("primary")}>Save Document</span>
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
      <p style={pStyle}>A document record can exist without a file, but a controlled file must be uploaded before it can be submitted through the review workflow.</p>
      <div style={stepList}>
        <Step n={1}>Open the document from the register.</Step>
        <Step n={2}>In the detail panel find the <strong>Controlled File</strong> section. Click <strong>Upload File</strong> or drag and drop onto the upload zone.</Step>
        <Step n={3}>Select the file from your computer. It is stored securely — signed download links are generated automatically and never publicly accessible.</Step>
        <Step n={4}>Once uploaded, an <strong>Open File</strong> button appears. This link is included in all workflow notification emails.</Step>
      </div>
      <div style={callout("warning")}>
        <span>⚠</span>
        <div>Uploading a new file to an <strong>Approved</strong> document does not change its status or revision. To issue a new revision use the <strong>Issue Next Revision</strong> workflow.</div>
      </div>
    </>
  );
}

function SectionMetadata() {
  return (
    <>
      <div style={eyebrow}>Core Workflows</div>
      <h2 style={h2Style}>Editing Document Metadata</h2>
      <p style={pStyle}>Title, description, type, department, review cycle, and dates can be updated at any time regardless of workflow status.</p>
      <div style={stepList}>
        <Step n={1}>Open the document from the register.</Step>
        <Step n={2}>Click <strong>Edit Details</strong> to unlock the fields.</Step>
        <Step n={3}>Update any of: <code style={codeStyle}>Title</code>, <code style={codeStyle}>Description</code>, <code style={codeStyle}>Document Type</code>, <code style={codeStyle}>Department Owner</code>, <code style={codeStyle}>Review Cycle</code>, <code style={codeStyle}>Issue Date</code>, <code style={codeStyle}>Next Review Date</code>.</Step>
        <Step n={4}>Click <strong>Save Changes</strong>. The update is recorded in the activity log with a timestamp.</Step>
      </div>
      <div style={callout("info")}>
        <span>ℹ</span>
        <div>The <strong>document number</strong> and <strong>revision</strong> are system-controlled and cannot be edited.</div>
      </div>
    </>
  );
}

function SectionOwners() {
  return (
    <>
      <div style={eyebrow}>Core Workflows</div>
      <h2 style={h2Style}>Changing Document Owners</h2>
      <p style={pStyle}>The Originator, Reviewer, and Approver are set at creation but can be updated at any time. Changes take effect on the next workflow action — in-progress email notifications are not recalled.</p>
      <div style={stepList}>
        <Step n={1}>Open the document and scroll to the <strong>Responsible Persons</strong> section.</Step>
        <Step n={2}>Click <strong>Edit Persons</strong>.</Step>
        <Step n={3}>Update the name and/or email for the Originator, Reviewer, or Approver as needed.</Step>
        <Step n={4}>Click <strong>Save Persons</strong>.</Step>
      </div>
      <div style={mockPanel}>
        <div style={mockLabel}>Responsible Persons</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
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
        <div>If you change the Approver while a document is <strong>Pending Approval</strong>, the new approver will not automatically receive a new email. Re-submit through the workflow to trigger a fresh notification.</div>
      </div>
    </>
  );
}

function SectionSubmit() {
  return (
    <>
      <div style={eyebrow}>Review & Approval</div>
      <h2 style={h2Style}>Submit for Review</h2>
      <p style={pStyle}>Once a document is in <strong>Draft</strong> with a controlled file attached, it can be submitted for review. This sends a notification email to the assigned Reviewer with secure action buttons.</p>
      <div style={stepList}>
        <Step n={1}>Open the document. Confirm it has a controlled file attached.</Step>
        <Step n={2}>Click <strong>Submit for Review</strong> and confirm the prompt.</Step>
        <Step n={3}>The document moves to <span style={badge("review")}>Pending Review</span>.</Step>
        <Step n={4}>The Reviewer receives an email with <strong>Accept Review</strong> and <strong>Reject</strong> action buttons, plus a signed link to the controlled file.</Step>
      </div>
      <div style={mockPanel}>
        <div style={mockLabel}>Email received by reviewer</div>
        <div style={emailMock}>
          <div style={emailHeader}>
            <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.08em", color: imsColours.brandAccent, textTransform: "uppercase", marginBottom: 3 }}>Enshore IMS · Document Control</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>ENS-HSEQ-PRO-001 submitted for review</div>
          </div>
          <div style={emailBody}>
            <p><strong>Document:</strong> ENS-HSEQ-PRO-001 &nbsp;|&nbsp; <strong>Revision:</strong> A</p>
            <p><strong>Originator:</strong> Jordan Beaton</p>
            <div style={{ display: "flex", gap: 8, margin: "12px 0", flexWrap: "wrap" }}>
              <span style={btn("primary")}>✓ Accept Review</span>
              <span style={btn("danger")}>✗ Reject</span>
            </div>
            <p style={{ fontSize: 11, color: imsColours.muted }}>Links are single-use and expire automatically.</p>
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
      <p style={pStyle}>The Reviewer clicks the action button in their email. Each button is a single-use secure token that opens a confirmation page in the browser.</p>
      <h3 style={h3Style}>Accept Review</h3>
      <div style={stepList}>
        <Step n={1}>Click <strong>Accept Review</strong> in the notification email.</Step>
        <Step n={2}>On the confirmation page, enter your name to confirm identity, then click <strong>Confirm Action</strong>.</Step>
        <Step n={3}>The document moves to <span style={badge("reviewed")}>Reviewed</span>. The Originator receives a notification.</Step>
        <Step n={4}>The Originator must then click <strong>Send to Approver</strong> to progress the document.</Step>
      </div>
      <h3 style={h3Style}>Reject from Review</h3>
      <div style={stepList}>
        <Step n={1}>Click <strong>Reject</strong> in the notification email.</Step>
        <Step n={2}>Enter a rejection reason and your name on the confirmation page, then confirm.</Step>
        <Step n={3}>The document returns to <span style={badge("rejected")}>Rejected</span>. The Originator is notified with the reason.</Step>
        <Step n={4}>The Originator should update the document, upload a revised file, and re-submit for review.</Step>
      </div>
      <div style={callout("info")}>
        <span>ℹ</span>
        <div>Token links are <strong>single-use</strong>. If the reviewer clicks a link a second time they will see an "expired" message. The originator should re-submit to generate fresh tokens if needed.</div>
      </div>
    </>
  );
}

function SectionApproval() {
  return (
    <>
      <div style={eyebrow}>Review & Approval</div>
      <h2 style={h2Style}>Sending to Approver</h2>
      <p style={pStyle}>Once reviewed, the Originator manually progresses the document to the Approver. This deliberate step allows the Originator to make any final adjustments first.</p>
      <div style={stepList}>
        <Step n={1}>Open the document — it should show <span style={badge("reviewed")}>Reviewed</span>.</Step>
        <Step n={2}>Click <strong>Send to Approver</strong>.</Step>
        <Step n={3}>The document moves to <span style={badge("review")}>Pending Approval</span>.</Step>
        <Step n={4}>The Approver receives an email with <strong>Approve Document</strong> and <strong>Reject</strong> buttons, plus a link to the controlled file.</Step>
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
        <Step n={1}>Click <strong>Approve Document</strong> in the notification email.</Step>
        <Step n={2}>Confirm your name on the confirmation page and click <strong>Confirm Action</strong>.</Step>
        <Step n={3}>The document moves to <span style={badge("approved")}>Approved</span>. <code style={codeStyle}>Approved By</code>, <code style={codeStyle}>Approved At</code>, and <code style={codeStyle}>Next Review Date</code> are set automatically.</Step>
        <Step n={4}>The Originator receives a confirmation notification.</Step>
      </div>
      <div style={callout("info")}>
        <span>ℹ</span>
        <div>Approving automatically calculates <code style={codeStyle}>Next Review Date</code> by adding the document's <code style={codeStyle}>Review Cycle (years)</code> to today's date.</div>
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
        <Step n={1}>Click <strong>Reject</strong> in the approval notification email.</Step>
        <Step n={2}>Enter a rejection reason and confirm your name on the confirmation page.</Step>
        <Step n={3}>The document returns to <span style={badge("rejected")}>Rejected</span> and the Originator is notified with the reason.</Step>
        <Step n={4}>The Originator should address the feedback, upload a revised file if needed, and re-submit for review.</Step>
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
        <Step n={2}>Click <strong>Mark Reviewed — No Changes</strong>.</Step>
        <Step n={3}>Add any notes if needed, then confirm.</Step>
        <Step n={4}>The review is recorded in the activity log. A notification email is sent to the Approver with <strong>Confirm — No Changes Required</strong> and <strong>Raise a Concern</strong> buttons.</Step>
        <Step n={5}>A success message confirms: <em>"Periodic review recorded. An email has been sent to [Approver] to confirm — the next review date will update once they confirm."</em></Step>
      </div>
      <div style={mockPanel}>
        <div style={mockLabel}>Approver notification email</div>
        <div style={emailMock}>
          <div style={emailHeader}>
            <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.08em", color: imsColours.brandAccent, textTransform: "uppercase", marginBottom: 3 }}>Enshore IMS · Document Control</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>ENS-HSEQ-TEM-001 periodic review completed — please confirm</div>
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
        <Step n={2}>Confirm your name on the secure confirmation page.</Step>
        <Step n={3}>The system advances <code style={codeStyle}>Next Review Date</code> by the document's review cycle, sets <code style={codeStyle}>Approved At</code> to today, and records the activity.</Step>
        <Step n={4}>The Originator receives a notification confirming the review is closed.</Step>
      </div>
      <h3 style={h3Style}>Raise a Concern</h3>
      <div style={stepList}>
        <Step n={1}>Click <strong>Raise a Concern</strong> in the email.</Step>
        <Step n={2}>Enter the concern and confirm your name on the confirmation page.</Step>
        <Step n={3}>The document <strong>remains Approved</strong> — the concern is logged in the activity and the Originator is notified. No dates are changed.</Step>
        <Step n={4}>The Originator should address the concern, potentially issuing a new revision or re-running the full review cycle.</Step>
      </div>
    </>
  );
}

function SectionNewRevision() {
  return (
    <>
      <div style={eyebrow}>Revisions</div>
      <h2 style={h2Style}>Issuing a New Revision</h2>
      <p style={pStyle}>When an approved document needs substantive changes, issue a new revision. This archives the current revision and starts the full workflow again at Draft.</p>
      <div style={stepList}>
        <Step n={1}>Open the document. It must be in <span style={badge("approved")}>Approved</span> status.</Step>
        <Step n={2}>Click <strong>Issue Next Revision</strong> and confirm the dialog.</Step>
        <Step n={3}>The revision letter advances (A → B → C, etc.). The previous revision's file and approval record are archived.</Step>
        <Step n={4}>The document resets to <span style={badge("draft")}>Draft</span> at the new revision.</Step>
        <Step n={5}>Upload the updated controlled file and submit through the full review and approval workflow.</Step>
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
        <Step n={1}>Open the document and click <strong>Supersede &amp; Create New</strong>.</Step>
        <Step n={2}>The current document is marked <span style={badge("superseded")}>Superseded</span>.</Step>
        <Step n={3}>A new document record is created at revision A, Draft, with the same title prefix and responsible persons.</Step>
        <Step n={4}>The new document references the original in its activity log.</Step>
      </div>
      <div style={callout("danger")}>
        <span style={{ color: imsColours.danger }}>⛔</span>
        <div>Superseding is <strong>irreversible</strong>. The original document cannot be returned to Approved once marked Superseded. Confirm carefully before proceeding.</div>
      </div>
    </>
  );
}

function SectionStatuses() {
  const rows = [
    ["draft",      "Draft",           "Created, not yet in review. Upload a controlled file before submitting.", "Submit for Review"],
    ["review",     "Pending Review",  "Reviewer notified. Awaiting their Accept or Reject via email.",            "Reviewer clicks email link"],
    ["reviewed",   "Reviewed",        "Reviewer accepted. Originator needs to send to Approver.",                 "Click Send to Approver"],
    ["review",     "Pending Approval","Approver notified. Awaiting Approve or Reject via email.",                 "Approver clicks email link"],
    ["approved",   "Approved",        "Fully approved and live. Next Review Date has been set.",                  "Periodic review when due"],
    ["rejected",   "Rejected",        "Rejected at review or approval stage. Reason recorded in activity log.",   "Revise and re-submit"],
    ["superseded", "Superseded",      "Replaced by a newer document or revision. Read-only.",                     "—"],
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

// ── Section map ───────────────────────────────────────────────────────────────

const sectionComponents: Record<SectionKey, () => React.ReactElement> = {
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
  periodic:    SectionPeriodic,
  token:       SectionToken,
  newrevision: SectionNewRevision,
  supersede:   SectionSupersede,
  statuses:    SectionStatuses,
};

// ── Group nav ─────────────────────────────────────────────────────────────────

const groups = Array.from(new Set(sections.map(s => s.group)));

// ── Page ──────────────────────────────────────────────────────────────────────

export default function GuidesPage() {
  const [active, setActive] = useState<SectionKey>("overview");
  const ActiveSection = sectionComponents[active];

  return (
    <main style={page}>
      <QualityPageHero
        label="Enshore IMS · Process Guides"
        title="Process Guides"
        description="Step-by-step guides for every IMS process."
      />
      <ImsTopMetaRow
        status={<><strong>Guide:</strong> Document Control</>}
      />

      {/* Section nav */}
      <div style={navBar}>
        {groups.map(group => (
          <div key={group} style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 4 }}>
            <span style={navGroup}>{group}</span>
            {sections.filter(s => s.group === group).map(s => (
              <button
                key={s.key}
                style={navBtn(active === s.key)}
                onClick={() => setActive(s.key)}
              >
                {s.label}
              </button>
            ))}
          </div>
        ))}
      </div>

      {/* Content */}
      <div style={content}>
        <ActiveSection />
      </div>
    </main>
  );
}
