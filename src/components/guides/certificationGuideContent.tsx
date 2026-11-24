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
  | "overview" | "dashboard" | "upload" | "register" | "manage" | "expiry"
  | "reference" | "faq";

const sections: GuideSectionDef[] = [
  { key: "overview",  label: "Overview",                  group: "Getting Started" },
  { key: "dashboard", label: "The Dashboard",             group: "Getting Started" },
  { key: "upload",    label: "Uploading a Certificate",   group: "Core Workflows" },
  { key: "register",  label: "The Certificate Register",  group: "Core Workflows" },
  { key: "manage",    label: "Opening & Deleting",        group: "Core Workflows" },
  { key: "expiry",    label: "Expiry Tracking",           group: "Expiry Control" },
  { key: "reference", label: "Reference",                 group: "Reference" },
  { key: "faq",       label: "Common Questions",          group: "Reference" },
];

function expiryBadge(state: string): CSSProperties {
  const map: Record<string, { bg: string; color: string }> = {
    "in date":   { bg: imsColours.page, color: imsColours.brand },
    "due soon":  { bg: imsColours.page, color: imsColours.ink },
    expired:     { bg: imsColours.danger, color: "#ffffff" },
    archived:    { bg: imsColours.page, color: imsColours.muted },
    "no expiry": { bg: imsColours.page, color: imsColours.brand },
  };
  const t = map[state.toLowerCase()] || map["in date"];
  return pill(t.bg, t.color);
}

function SectionOverview() {
  return (
    <>
      <div style={eyebrow}>Getting Started</div>
      <h2 style={h2Style}>Overview</h2>
      <p style={pStyle}>Certification is the Quality Management register for ISO-style certificates and other external certification evidence — for example ISO 9001, ISO 14001 and ISO 45001. It keeps one controlled copy of each certificate, who issued it, and when it expires, so nobody has to hunt for it at audit time.</p>
      <div style={flowWrap}>
        <div style={flowStep()}>Upload Certificate</div><div style={arrow}>→</div>
        <div style={flowStep(true)}>Certificate Register</div><div style={arrow}>→</div>
        <div style={flowStep()}>Dashboard watches expiry</div>
      </div>
      <p style={pStyle}>The page has three tabs:</p>
      <div style={stepList}>
        <Step n={1}><strong>Dashboard</strong> — four headline counts and an expiry watch list.</Step>
        <Step n={2}><strong>Certificate Register</strong> — search, filter, open and delete certificate records.</Step>
        <Step n={3}><strong>Upload Certificate</strong> — add a new certificate and its file.</Step>
      </div>
      <div style={callout("info")}>
        <span>ℹ</span>
        <div>Certificates can be uploaded as PDF, Word, Excel, PowerPoint or photos, and they open on phones and tablets as well as desktops. The file is optional — you can record a certificate without one and still track its dates.</div>
      </div>
    </>
  );
}

function SectionDashboard() {
  return (
    <>
      <div style={eyebrow}>Getting Started</div>
      <h2 style={h2Style}>The Dashboard</h2>
      <div style={mockPanel}>
        <div style={{ ...mockHero, marginTop: 0 }}>
          <div style={mockHeroEyebrow}>Quality Management</div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>Certification</div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
          {[["Active Certificates", "4"], ["Expiring in 90 Days", "1"], ["Expired", "0"], ["Files Uploaded", "4"]].map(([label, value]) => (
            <div key={label} style={{ flex: 1, minWidth: 120, background: imsColours.panel, border: `1px solid ${imsColours.border}`, borderRadius: 8, padding: "8px 10px" }}>
              <div style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", color: imsColours.muted }}>{label}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: imsColours.brand }}>{value}</div>
            </div>
          ))}
        </div>
        <div style={mockLabel}>Upcoming Expiry Watch</div>
        <div style={{ background: imsColours.panel, border: `1px solid ${imsColours.border}`, borderRadius: 8, padding: "8px 10px" }}>
          <div style={{ fontWeight: 800 }}>ISO 14001 Certificate</div>
          <div style={{ color: imsColours.muted, fontSize: 11 }}>ISO 14001:2015 · Due Soon · 15 Jan 2027</div>
        </div>
      </div>
      <h3 style={h3Style}>The four cards</h3>
      <p style={pStyle}>Each card is clickable and takes you to the register already filtered:</p>
      <table style={imsTableStyle}>
        <thead>
          <tr>{["Card", "What it counts", "When you click it"].map(h => <th key={h} style={imsTableHeadStyle}>{h}</th>)}</tr>
        </thead>
        <tbody>
          <tr><td style={imsTableCellStyle}><strong>Active Certificates</strong></td><td style={imsTableCellStyle}>Certificates with Status Active.</td><td style={imsTableCellStyle}>Register filtered to Active.</td></tr>
          <tr><td style={imsTableCellStyle}><strong>Expiring in 90 Days</strong></td><td style={imsTableCellStyle}>Certificates that expire within the next 90 days (including today).</td><td style={imsTableCellStyle}>Register filtered to Due Soon.</td></tr>
          <tr><td style={imsTableCellStyle}><strong>Expired</strong></td><td style={imsTableCellStyle}>Certificates whose expiry date has passed.</td><td style={imsTableCellStyle}>Register filtered to Expired.</td></tr>
          <tr><td style={imsTableCellStyle}><strong>Files Uploaded</strong></td><td style={imsTableCellStyle}>Certificates that have a file attached.</td><td style={imsTableCellStyle}>Register, unfiltered.</td></tr>
        </tbody>
      </table>
      <h3 style={h3Style}>Upcoming Expiry Watch</h3>
      <p style={pStyle}>Lists up to five certificates, with the nearest expiry first. Archived certificates are left out. Each line shows the standard, the expiry state and the expiry date — click one to jump to it in the register.</p>
    </>
  );
}

function SectionUpload() {
  return (
    <>
      <div style={eyebrow}>Core Workflows</div>
      <h2 style={h2Style}>Uploading a Certificate</h2>
      <div style={stepList}>
        <Step n={1}>Open the <strong>Upload Certificate</strong> tab.</Step>
        <Step n={2}>Enter the <code style={codeStyle}>Certificate Title</code> (for example &quot;ISO 9001 Certificate&quot;). This is required.</Step>
        <Step n={3}>Choose the <code style={codeStyle}>Standard</code>: ISO 9001:2015, ISO 14001:2015, ISO 45001:2018 or Other. It starts on ISO 9001:2015, so check it is right.</Step>
        <Step n={4}>Complete what you know: <code style={codeStyle}>Certificate Number</code>, <code style={codeStyle}>Issuing Body</code> (for example LRQA, DNV, BSI), <code style={codeStyle}>Issue Date</code> and <code style={codeStyle}>Expiry Date</code>.</Step>
        <Step n={5}>Set the <code style={codeStyle}>Status</code> — Active, Pending or Archived. It starts on Active.</Step>
        <Step n={6}>Under <code style={codeStyle}>Certificate File</code>, choose the file. On a phone you can pick a saved file or a photo.</Step>
        <Step n={7}>Add the <code style={codeStyle}>Scope</code> (the coverage statement on the certificate) and any <code style={codeStyle}>Notes</code>.</Step>
        <Step n={8}>Click <strong>Save Certificate</strong>. You are taken to the register and the status line says &quot;Certificate uploaded successfully.&quot;</Step>
      </div>
      <div style={mockPanel}>
        <div style={mockLabel}>Upload Certificate</div>
        <div style={mockRow}>
          <div style={mockField(2)}><div style={mockFieldLabel}>Certificate Title</div><input style={mockInput} readOnly value="ISO 9001 Certificate" /></div>
          <div style={mockField()}><div style={mockFieldLabel}>Standard</div><input style={mockInput} readOnly value="ISO 9001:2015" /></div>
        </div>
        <div style={mockRow}>
          <div style={mockField()}><div style={mockFieldLabel}>Issuing Body</div><input style={mockInput} readOnly value="LRQA" /></div>
          <div style={mockField()}><div style={mockFieldLabel}>Expiry Date</div><input style={mockInput} readOnly value="15/01/2027" /></div>
          <div style={mockField()}><div style={mockFieldLabel}>Status</div><input style={mockInput} readOnly value="Active" /></div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <span style={btn("primary")}>Save Certificate</span>
          <span style={btn("ghost")}>Clear Form</span>
        </div>
      </div>
      <h3 style={h3Style}>Which files can I upload?</h3>
      <p style={pStyle}>PDF, Word (<code style={codeStyle}>.doc</code>, <code style={codeStyle}>.docx</code>), Excel (<code style={codeStyle}>.xls</code>, <code style={codeStyle}>.xlsx</code>, <code style={codeStyle}>.xlsm</code>), PowerPoint (<code style={codeStyle}>.ppt</code>, <code style={codeStyle}>.pptx</code>), CSV and text files, and photos (PNG, JPG, WebP, HEIC). Phones sometimes do not report a file&apos;s type; the IMS works it out from the file name so Word, Excel and PowerPoint files still open in the right app later.</p>
      <div style={callout("warning")}>
        <span>⚠</span>
        <div>Only <strong>Certificate Title</strong> and <strong>Standard</strong> are required, but a certificate saved without an <strong>Expiry Date</strong> shows as &quot;No Expiry&quot; and will never appear in the expiry warnings. Always enter the expiry date if the certificate has one. <strong>Clear Form</strong> empties every box, including the chosen file.</div>
      </div>
    </>
  );
}

function SectionRegister() {
  return (
    <>
      <div style={eyebrow}>Core Workflows</div>
      <h2 style={h2Style}>The Certificate Register</h2>
      <div style={mockPanel}>
        <div style={mockLabel}>Certificate Register</div>
        <table style={imsTableStyle}>
          <thead>
            <tr>{["Certificate", "Standard", "Issuing Body", "Issue Date", "Expiry", "File", "Action"].map(h => <th key={h} style={imsTableHeadStyle}>{h}</th>)}</tr>
          </thead>
          <tbody>
            <tr>
              <td style={imsTableCellStyle}><strong>ISO 14001 Certificate</strong></td>
              <td style={imsTableCellStyle}>ISO 14001:2015</td>
              <td style={imsTableCellStyle}>LRQA</td>
              <td style={imsTableCellStyle}>16 Jan 2024</td>
              <td style={imsTableCellStyle}><span style={expiryBadge("due soon")}>Due Soon</span><div style={{ color: imsColours.muted, fontSize: 11, marginTop: 4 }}>15 Jan 2027</div></td>
              <td style={imsTableCellStyle}>iso14001.pdf</td>
              <td style={imsTableCellStyle}><span style={btn("ghost")}>Open</span> <span style={btn("danger")}>Delete</span></td>
            </tr>
          </tbody>
        </table>
      </div>
      <p style={pStyle}>Records are listed with the soonest expiry first; certificates with no expiry date come last. The line above the table says how many are showing, for example &quot;Showing 3 of 5 certificates&quot;.</p>
      <h3 style={h3Style}>Searching and filtering</h3>
      <div style={stepList}>
        <Step n={1}>Type in the search box. It looks at the certificate title, number, standard, issuing body, scope and notes.</Step>
        <Step n={2}>Click the filters button to show <code style={codeStyle}>Standard</code> and <code style={codeStyle}>Status / Expiry</code>.</Step>
        <Step n={3}>Pick a standard, and/or a status or expiry state: Active, Pending, Archived, In Date, Due Soon, Expired or No Expiry.</Step>
        <Step n={4}>Click <strong>Clear Filters</strong> to go back to everything.</Step>
      </div>
      <h3 style={h3Style}>The selected certificate</h3>
      <p style={pStyle}>Click any row to select it. A panel under the table shows its scope and its Standard, Issuing Body, Issue Date, Expiry Date, Status and File. Selected rows are kept in the page address, so a link copied from your browser opens on the same certificate and filters.</p>
    </>
  );
}

function SectionManage() {
  return (
    <>
      <div style={eyebrow}>Core Workflows</div>
      <h2 style={h2Style}>Opening & Deleting</h2>
      <h3 style={h3Style}>Opening the file</h3>
      <div style={stepList}>
        <Step n={1}>In the <strong>Certificate Register</strong>, find the certificate.</Step>
        <Step n={2}>Click <strong>Open</strong>. The file opens in a new tab.</Step>
      </div>
      <p style={pStyle}>If your phone or browser blocks the new tab, the file opens in the same tab instead — use the Back button to return to the IMS. The <strong>Open</strong> button is greyed out when no file was uploaded; the File column then reads &quot;No file uploaded&quot;.</p>
      <h3 style={h3Style}>Deleting a certificate</h3>
      <div style={stepList}>
        <Step n={1}>Click <strong>Delete</strong> on the certificate&apos;s row.</Step>
        <Step n={2}>Confirm the pop-up question &quot;Delete (title)?&quot;.</Step>
      </div>
      <div style={callout("danger")}>
        <span>⚠</span>
        <div>Deleting removes the record <strong>and</strong> its uploaded file, and it cannot be undone. The register has no Edit button, so if you entered a wrong date or title, upload the corrected certificate first and then delete the incorrect one.</div>
      </div>
      <div style={callout("info")}>
        <span>ℹ</span>
        <div>When a certificate is renewed, add the new certificate as a new record. Records set to <strong>Archived</strong> are left out of the expiry warnings and the Upcoming Expiry Watch. The register has no way to change a status after saving, so Archived can only be chosen when a certificate is first uploaded.</div>
      </div>
    </>
  );
}

function SectionExpiry() {
  return (
    <>
      <div style={eyebrow}>Expiry Control</div>
      <h2 style={h2Style}>Expiry Tracking</h2>
      <p style={pStyle}>The IMS works out an expiry state for every certificate from its <code style={codeStyle}>Expiry Date</code> and <code style={codeStyle}>Status</code>. It is recalculated each time you open the page, so nothing needs updating by hand.</p>
      <table style={imsTableStyle}>
        <thead>
          <tr>{["State", "When it applies"].map(h => <th key={h} style={imsTableHeadStyle}>{h}</th>)}</tr>
        </thead>
        <tbody>
          <tr><td style={{ ...imsTableCellStyle, whiteSpace: "nowrap" }}><span style={expiryBadge("in date")}>In Date</span></td><td style={imsTableCellStyle}>Expires in more than 90 days.</td></tr>
          <tr><td style={{ ...imsTableCellStyle, whiteSpace: "nowrap" }}><span style={expiryBadge("due soon")}>Due Soon</span></td><td style={imsTableCellStyle}>Expires within the next 90 days, including today.</td></tr>
          <tr><td style={{ ...imsTableCellStyle, whiteSpace: "nowrap" }}><span style={expiryBadge("expired")}>Expired</span></td><td style={imsTableCellStyle}>The expiry date is before today.</td></tr>
          <tr><td style={{ ...imsTableCellStyle, whiteSpace: "nowrap" }}><span style={expiryBadge("no expiry")}>No Expiry</span></td><td style={imsTableCellStyle}>No expiry date was entered.</td></tr>
          <tr><td style={{ ...imsTableCellStyle, whiteSpace: "nowrap" }}><span style={expiryBadge("archived")}>Archived</span></td><td style={imsTableCellStyle}>Status is Archived — this overrides the dates.</td></tr>
        </tbody>
      </table>
      <h3 style={h3Style}>A weekly routine</h3>
      <div style={stepList}>
        <Step n={1}>Open <strong>Certification</strong> and look at the <strong>Expiring in 90 Days</strong> and <strong>Expired</strong> cards.</Step>
        <Step n={2}>Click a card that is not zero to see which certificates are affected.</Step>
        <Step n={3}>Arrange renewal with the issuing body, then upload the new certificate when it arrives.</Step>
      </div>
      <div style={callout("warning")}>
        <span>⚠</span>
        <div>The page does not send reminder emails. Expiry is only highlighted when someone opens Certification, so build the check into your routine.</div>
      </div>
    </>
  );
}

function SectionReference() {
  const fields: [string, string, string][] = [
    ["Certificate Title", "Yes", "Free text."],
    ["Standard", "Yes", "ISO 9001:2015, ISO 14001:2015, ISO 45001:2018 or Other."],
    ["Certificate Number", "No", "The number printed on the certificate."],
    ["Issuing Body", "No", "For example LRQA, DNV, BSI."],
    ["Issue Date / Expiry Date", "No", "Expiry drives all the warnings."],
    ["Status", "Yes (pre-set to Active)", "Active, Pending or Archived."],
    ["Certificate File", "No", "PDF, Word, Excel, PowerPoint, CSV, text or photo."],
    ["Scope", "No", "The coverage statement."],
    ["Notes", "No", "Anything else worth recording."],
  ];
  return (
    <>
      <div style={eyebrow}>Reference</div>
      <h2 style={h2Style}>Reference</h2>
      <h3 style={h3Style}>Upload form fields</h3>
      <table style={imsTableStyle}>
        <thead>
          <tr>{["Field", "Required", "Notes"].map(h => <th key={h} style={imsTableHeadStyle}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {fields.map(([f, r, n]) => (
            <tr key={f}>
              <td style={{ ...imsTableCellStyle, fontWeight: 800 }}>{f}</td>
              <td style={imsTableCellStyle}>{r}</td>
              <td style={imsTableCellStyle}>{n}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h3 style={h3Style}>Status</h3>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        <span style={pill(imsColours.brand, "#ffffff")}>Active</span>
        <span style={pill(imsColours.page, imsColours.muted)}>Pending</span>
        <span style={pill(imsColours.page, imsColours.muted)}>Archived</span>
      </div>
      <p style={pStyle}>Status is something you choose; expiry state is worked out from the dates. The register&apos;s <strong>Status / Expiry</strong> filter understands both.</p>
    </>
  );
}

function SectionFaq() {
  const qa: [string, string][] = [
    ["Can I upload from my phone?", "Yes. Use the Upload Certificate tab, choose the file or take a photo, and Save Certificate. The file opens on phones from the register's Open button."],
    ["I picked the wrong file or typed a wrong date. Can I edit it?", "There is no Edit button. Upload a corrected record and then delete the wrong one."],
    ["Why is a certificate not in the expiry warnings?", "Either it has no Expiry Date (shown as No Expiry), it is more than 90 days from expiry, or its Status is Archived."],
    ["Why is Open greyed out?", "No file was uploaded for that record."],
    ["Why do I see Load failed or Save failed in the status line?", "The message after the word failed says why. Check your connection and try again, and tell the IMS administrator if it keeps happening."],
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
  overview:  SectionOverview,
  dashboard: SectionDashboard,
  upload:    SectionUpload,
  register:  SectionRegister,
  manage:    SectionManage,
  expiry:    SectionExpiry,
  reference: SectionReference,
  faq:       SectionFaq,
};

export const certificationGuide: GuideDefinition = {
  id: "certification",
  navLabel: "Certification",
  guideLabel: "Certification",
  defaultSection: "overview",
  sections,
  sectionComponents,
};
