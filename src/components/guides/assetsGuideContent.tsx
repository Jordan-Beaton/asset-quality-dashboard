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
  | "overview" | "register" | "assetedit" | "calibration" | "calrecord"
  | "maintinsp" | "print" | "printjobs" | "field" | "reports"
  | "reference" | "faq";

const sections: GuideSectionDef[] = [
  { key: "overview",    label: "Overview",                  group: "Getting Started" },
  { key: "register",    label: "The Asset Register",        group: "Asset Register" },
  { key: "assetedit",   label: "Adding & Editing Assets",   group: "Asset Register" },
  { key: "calibration", label: "The Calibration Register",  group: "Calibration" },
  { key: "calrecord",   label: "Recording Calibrations",    group: "Calibration" },
  { key: "maintinsp",   label: "Maintenance & Inspection",  group: "Maintenance & Inspection" },
  { key: "print",       label: "Requesting a 3D Print",     group: "3D Print Requests" },
  { key: "printjobs",   label: "Running the Print Queue",   group: "3D Print Requests" },
  { key: "field",       label: "Using a Phone (QR Codes)",  group: "Field Use on a Phone" },
  { key: "reports",     label: "Dashboards & Monthly Reports", group: "Reports" },
  { key: "reference",   label: "Statuses, Actions & People", group: "Reference" },
  { key: "faq",         label: "Common Questions",          group: "Reference" },
];

function statusBadge(status: string): CSSProperties {
  const map: Record<string, { bg: string; color: string }> = {
    active:             { bg: imsColours.brand,       color: "#ffffff" },
    inactive:           { bg: imsColours.page,        color: imsColours.muted },
    quarantine:         { bg: imsColours.danger,      color: "#ffffff" },
    "under maintenance":{ bg: imsColours.warning,     color: "#ffffff" },
    overdue:            { bg: imsColours.danger,      color: "#ffffff" },
    "due soon":         { bg: imsColours.warning,     color: "#ffffff" },
    "in date":          { bg: imsColours.brand,       color: "#ffffff" },
    "not set":          { bg: imsColours.page,        color: imsColours.muted },
    queued:             { bg: imsColours.page,        color: imsColours.muted },
    printing:           { bg: imsColours.brandAccent, color: "#ffffff" },
    completed:          { bg: imsColours.brand,       color: "#ffffff" },
  };
  const t = map[status.toLowerCase()] || map["not set"];
  return pill(t.bg, t.color);
}

function SectionOverview() {
  return (
    <>
      <div style={eyebrow}>Getting Started</div>
      <h2 style={h2Style}>Overview</h2>
      <p style={pStyle}>The Asset Management module is where Enshore keeps its equipment records. It holds the register of every asset, the calibration certificates for measuring equipment, the inspection and maintenance history, the 3D print request queue, and a monthly management report. The aim is simple: every asset is known, every check is in date, and the evidence is stored against the asset it belongs to.</p>
      <div style={flowWrap}>
        <div style={flowStep()}>Add asset</div><div style={arrow}>→</div>
        <div style={flowStep()}>Calibrate</div><div style={arrow}>→</div>
        <div style={flowStep()}>Inspect &amp; maintain</div><div style={arrow}>→</div>
        <div style={flowStep()}>Raise actions</div><div style={arrow}>→</div>
        <div style={flowStep(true)}>Monthly report</div>
      </div>
      <h3 style={h3Style}>What is in the module</h3>
      <table style={imsTableStyle}>
        <thead>
          <tr>{["Page", "Use it to"].map(h => <th key={h} style={imsTableHeadStyle}>{h}</th>)}</tr>
        </thead>
        <tbody>
          <tr><td style={{ ...imsTableCellStyle, fontWeight: 800, whiteSpace: "nowrap" }}>Assets</td><td style={imsTableCellStyle}>Add, find and edit assets. Open an asset to see its files, QR code, history and quality links.</td></tr>
          <tr><td style={{ ...imsTableCellStyle, fontWeight: 800, whiteSpace: "nowrap" }}>Calibration</td><td style={imsTableCellStyle}>Keep calibration certificates and due dates for measuring items, including spares.</td></tr>
          <tr><td style={{ ...imsTableCellStyle, fontWeight: 800, whiteSpace: "nowrap" }}>Inspection Log</td><td style={imsTableCellStyle}>Record inspections (Pass, Fail, Pass with Observations).</td></tr>
          <tr><td style={{ ...imsTableCellStyle, fontWeight: 800, whiteSpace: "nowrap" }}>Maintenance Log</td><td style={imsTableCellStyle}>Record preventative and corrective maintenance.</td></tr>
          <tr><td style={{ ...imsTableCellStyle, fontWeight: 800, whiteSpace: "nowrap" }}>3D Print Requests</td><td style={imsTableCellStyle}>Request and track 3D printed parts.</td></tr>
          <tr><td style={{ ...imsTableCellStyle, fontWeight: 800, whiteSpace: "nowrap" }}>Dashboard</td><td style={imsTableCellStyle}>See the overall asset control picture and what needs attention.</td></tr>
          <tr><td style={{ ...imsTableCellStyle, fontWeight: 800, whiteSpace: "nowrap" }}>Reports</td><td style={imsTableCellStyle}>Save and print the monthly asset management PDF.</td></tr>
          <tr><td style={{ ...imsTableCellStyle, fontWeight: 800, whiteSpace: "nowrap" }}>Asset Actions / People</td><td style={imsTableCellStyle}>See follow-up actions raised from assets, and keep the list of asset people up to date.</td></tr>
        </tbody>
      </table>
      <div style={callout("info")}>
        <span>ℹ</span>
        <div>Most pages open on a <strong>Dashboard</strong> tab, with a register tab and a <strong>Create</strong> tab beside it. The grey <strong>Status</strong> line near the top of each page tells you what the page just did, or why something was blocked.</div>
      </div>
      <h3 style={h3Style}>Permissions</h3>
      <p style={pStyle}>What you can do depends on your IMS access. Adding a record needs <strong>create</strong> access; changing or deleting one needs <strong>edit</strong> access. If you lack it, the page does not save and the Status line says <code style={codeStyle}>Permission required</code>. Ask an IMS administrator if you need more access.</p>
    </>
  );
}

function SectionRegister() {
  return (
    <>
      <div style={eyebrow}>Asset Register</div>
      <h2 style={h2Style}>The Asset Register</h2>
      <p style={pStyle}>Open <strong>Assets</strong> from the IMS home page. The page has four tabs: <strong>Dashboard</strong>, <strong>Asset Register</strong>, <strong>Create Asset</strong> and <strong>Reports</strong>.</p>
      <div style={mockPanel}>
        <div style={{ ...mockHero, marginTop: 0 }}>
          <div style={mockHeroEyebrow}>Asset Management</div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>Assets</div>
        </div>
        <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
          {["Dashboard", "Asset Register", "Create Asset", "Reports"].map((t, i) => (
            <span key={t} style={{ ...btn(i === 1 ? "primary" : "ghost"), fontSize: 11 }}>{t}</span>
          ))}
        </div>
        <div style={mockRow}>
          <div style={mockField(2)}><div style={mockFieldLabel}>Search</div><div style={mockInput}>Search asset code, name, category, serial, location, or responsible person</div></div>
          <div style={mockField()}><div style={mockFieldLabel}>Status</div><div style={mockInput}>All Status</div></div>
        </div>
        <table style={imsTableStyle}>
          <thead>
            <tr>{["Asset No. / Code", "Name / Title", "Category", "Condition", "Responsible Person", "Location", "Inspection Due", "Maintenance Due"].map(h => <th key={h} style={imsTableHeadStyle}>{h}</th>)}</tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ ...imsTableCellStyle, fontWeight: 800, color: imsColours.brand, whiteSpace: "nowrap" }}>AST-TRENCH-2611231045</td>
              <td style={imsTableCellStyle}><strong>Trencher skid</strong></td>
              <td style={imsTableCellStyle}>Subsea</td>
              <td style={imsTableCellStyle}>Good</td>
              <td style={imsTableCellStyle}>A. Person</td>
              <td style={imsTableCellStyle}>Aberdeen</td>
              <td style={imsTableCellStyle}>14 Jan 2027</td>
              <td style={imsTableCellStyle}>02 Mar 2027</td>
            </tr>
          </tbody>
        </table>
      </div>
      <h3 style={h3Style}>Dashboard tab</h3>
      <p style={pStyle}>Cards for <strong>Total Assets</strong>, <strong>Active Assets</strong>, <strong>Under Maintenance</strong>, <strong>Quality Linked</strong> and <strong>Action Needed</strong>. Click a card to jump to the register already filtered. Below them are three panels: <strong>Due Watch</strong> (inspection and maintenance overdue or due in the next 30 days), <strong>Quality Links</strong> and <strong>Register Health</strong>.</p>
      <h3 style={h3Style}>Finding an asset</h3>
      <div style={stepList}>
        <Step n={1}>Click the <strong>Asset Register</strong> tab.</Step>
        <Step n={2}>Type in the search box. It searches asset code, name, category, serial number, location and responsible person.</Step>
        <Step n={3}>To narrow further, open the filters and choose a <code style={codeStyle}>Status</code>, <code style={codeStyle}>Location</code> or <code style={codeStyle}>Responsible Person</code>. <strong>Clear Filters</strong> resets everything.</Step>
        <Step n={4}>Click a row. The <strong>Asset Detail</strong> panel opens underneath. Use <strong>Hide Panel</strong> / <strong>Open Panel</strong> to close or reopen it.</Step>
      </div>
    </>
  );
}

function SectionAssetEdit() {
  return (
    <>
      <div style={eyebrow}>Asset Register</div>
      <h2 style={h2Style}>Adding &amp; Editing Assets</h2>
      <h3 style={h3Style}>Adding an asset</h3>
      <div style={stepList}>
        <Step n={1}>Go to <strong>Assets</strong> then the <strong>Create Asset</strong> tab.</Step>
        <Step n={2}>Enter the <code style={codeStyle}>Name</code>. This is the only required field. Fill in what you know: <code style={codeStyle}>Category</code>, <code style={codeStyle}>Subcategory</code>, <code style={codeStyle}>Document ID Code</code>, <code style={codeStyle}>Description</code>, <code style={codeStyle}>Manufacturer</code>, <code style={codeStyle}>Model</code>, <code style={codeStyle}>Serial Number</code>, <code style={codeStyle}>Condition</code>, <code style={codeStyle}>Responsible Person</code> and <code style={codeStyle}>Location</code>.</Step>
        <Step n={3}>Choose a <code style={codeStyle}>Status</code>: Active, Inactive, Quarantine or Under Maintenance.</Step>
        <Step n={4}>Set <code style={codeStyle}>Purchase Date</code>, <code style={codeStyle}>Maintenance Due Date</code> and <code style={codeStyle}>Inspection Due Date</code> if known.</Step>
        <Step n={5}>Click <strong>Add Asset</strong>. The Status line confirms it was added.</Step>
      </div>
      <div style={callout("info")}>
        <span>ℹ</span>
        <div>You do not choose the asset code. The system generates it when you save (it starts <code style={codeStyle}>AST-</code>). The <code style={codeStyle}>Document ID Code</code> is your own short code, for example <em>1100</em> or <em>C4</em>.</div>
      </div>
      <h3 style={h3Style}>The Asset Detail panel</h3>
      <p style={pStyle}>Click a row in the register to open an asset. The panel is split into sections:</p>
      <table style={imsTableStyle}>
        <thead>
          <tr>{["Section", "What it holds"].map(h => <th key={h} style={imsTableHeadStyle}>{h}</th>)}</tr>
        </thead>
        <tbody>
          <tr><td style={{ ...imsTableCellStyle, fontWeight: 800 }}>Asset Identity / Status</td><td style={imsTableCellStyle}>Name, status and condition badges, and a summary strip. Inspection Due and Maintenance Due are coloured by how close they are.</td></tr>
          <tr><td style={{ ...imsTableCellStyle, fontWeight: 800 }}>Files / Image</td><td style={imsTableCellStyle}>The asset photo. <strong>Upload image</strong>, <strong>Open image</strong>, <strong>Remove image</strong>.</td></tr>
          <tr><td style={{ ...imsTableCellStyle, fontWeight: 800 }}>Asset QR / Field Access</td><td style={imsTableCellStyle}>QR code for phones, plus shortcuts: <strong>Start Inspection</strong>, <strong>Start Maintenance</strong>, <strong>View Calibration</strong>, <strong>Raise Action</strong>.</td></tr>
          <tr><td style={{ ...imsTableCellStyle, fontWeight: 800 }}>Master Data</td><td style={imsTableCellStyle}>All the fields you entered, editable. Asset Code is read-only.</td></tr>
          <tr><td style={{ ...imsTableCellStyle, fontWeight: 800 }}>Inspection / Maintenance History</td><td style={imsTableCellStyle}>The latest records for this asset (up to six of each), each with an <strong>Open file</strong> button if a file was attached. Records are added from the Inspection and Maintenance pages, not here.</td></tr>
          <tr><td style={{ ...imsTableCellStyle, fontWeight: 800 }}>Asset History Timeline</td><td style={imsTableCellStyle}>One combined list of files, calibration, inspection, maintenance and linked actions.</td></tr>
          <tr><td style={{ ...imsTableCellStyle, fontWeight: 800 }}>Quality Links</td><td style={imsTableCellStyle}>Linked NCRs and actions, calibration and inspection references with certificate uploads, and quality notes.</td></tr>
        </tbody>
      </table>
      <h3 style={h3Style}>Editing an asset</h3>
      <div style={stepList}>
        <Step n={1}>Open the asset, go to <strong>Master Data</strong> and change the fields you need.</Step>
        <Step n={2}>Click <strong>Save Asset Changes</strong>.</Step>
      </div>
      <h3 style={h3Style}>Linking NCRs and actions, and attaching evidence</h3>
      <div style={stepList}>
        <Step n={1}>In <strong>Quality Links</strong>, pick an item under <code style={codeStyle}>Add Linked NCR</code> or <code style={codeStyle}>Add Linked Action</code> and click <strong>+ Add</strong>.</Step>
        <Step n={2}>To attach a certificate or inspection record, click <strong>+ Add Calibration Record</strong> or <strong>+ Add Inspection Record</strong>, type a <code style={codeStyle}>Reference</code>, then click <strong>Upload cert</strong> / <strong>Upload record</strong> and choose the file.</Step>
        <Step n={3}>Optionally set <code style={codeStyle}>Last Quality Review</code> and <code style={codeStyle}>Quality Notes</code>.</Step>
        <Step n={4}>Click <strong>Save Quality Section</strong>. Uploads are not final until you do.</Step>
      </div>
      <div style={callout("info")}>
        <span>ℹ</span>
        <div>You can upload <strong>PDF, Word, Excel, PowerPoint</strong>, text/CSV files and <strong>photos</strong> (including iPhone photos). Stored files open from the <strong>Open file</strong> buttons, including on a phone.</div>
      </div>
      <h3 style={h3Style}>Deleting an asset</h3>
      <p style={pStyle}>Click <strong>Delete Asset</strong> and confirm the prompt <em>Delete this asset?</em> This removes the asset and its stored image and certificate/inspection files. It needs edit access.</p>
      <div style={callout("warning")}>
        <span>⚠</span>
        <div>If an asset is simply no longer used, set its <code style={codeStyle}>Status</code> to <strong>Inactive</strong> instead of deleting it, so its history is kept.</div>
      </div>
    </>
  );
}

function SectionCalibration() {
  return (
    <>
      <div style={eyebrow}>Calibration</div>
      <h2 style={h2Style}>The Calibration Register</h2>
      <p style={pStyle}>The Calibration page keeps a certificate and due date for every item that needs calibrating. An item can belong to an asset, or be a <strong>spare or standalone item</strong> with no asset. The tabs are <strong>Dashboard</strong>, <strong>Calibration Register</strong>, <strong>Create Calibration</strong> and <strong>Bulk Upload</strong>.</p>
      <div style={mockPanel}>
        <div style={mockLabel}>Calibration Register</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
          {[["Overdue", "2"], ["Due Soon", "5"], ["In Date", "48"], ["Total Records", "55"]].map(([l, v]) => (
            <div key={l} style={{ flex: 1, minWidth: 100, background: "#fff", border: `1px solid ${imsColours.border}`, borderRadius: 8, padding: "8px 10px" }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: imsColours.muted, textTransform: "uppercase" }}>{l}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: imsColours.brand }}>{v}</div>
            </div>
          ))}
        </div>
        <table style={imsTableStyle}>
          <thead>
            <tr>{["Status", "Item Status", "Item / Description", "Serial Number", "Due Date", "Certificate"].map(h => <th key={h} style={imsTableHeadStyle}>{h}</th>)}</tr>
          </thead>
          <tbody>
            <tr>
              <td style={imsTableCellStyle}><span style={statusBadge("due soon")}>Due Soon</span></td>
              <td style={imsTableCellStyle}>In Use</td>
              <td style={imsTableCellStyle}><strong>Pressure gauge</strong></td>
              <td style={imsTableCellStyle}>PG-2291</td>
              <td style={imsTableCellStyle}>12 Dec 2026<br /><span style={{ fontSize: 10, color: imsColours.muted }}>18 days remaining</span></td>
              <td style={imsTableCellStyle}>CERT-4410<br /><span style={{ fontSize: 10, color: imsColours.muted }}>Certificate attached</span></td>
            </tr>
          </tbody>
        </table>
      </div>
      <h3 style={h3Style}>How the calibration status works</h3>
      <p style={pStyle}>The status comes from the <code style={codeStyle}>Calibration Due Date</code>.</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <span style={statusBadge("overdue")}>Overdue: due date has passed</span>
        <span style={statusBadge("due soon")}>Due Soon: within 30 days</span>
        <span style={statusBadge("in date")}>In Date: more than 30 days away</span>
        <span style={statusBadge("not set")}>Not Set: no due date</span>
      </div>
      <h3 style={h3Style}>Item Status (is the item in use?)</h3>
      <p style={pStyle}>Each item also has an <code style={codeStyle}>Item Status</code>: <strong>In Use</strong>, <strong>Not In Use</strong>, <strong>Damaged</strong>, <strong>Missing / Lost</strong> or <strong>Historic</strong>. Only <strong>In Use</strong> items count towards the calibration dashboard figures. The others are still visible, under <strong>Excluded Items</strong>.</p>
      <h3 style={h3Style}>Finding records</h3>
      <div style={stepList}>
        <Step n={1}>Open the <strong>Calibration Register</strong> tab.</Step>
        <Step n={2}>Search by item description, asset, serial number, certificate or supplier, or open the filters: <code style={codeStyle}>Asset</code> (including <em>Unassigned / spare items</em>), <code style={codeStyle}>Calibration Status</code> and <code style={codeStyle}>Item Status</code>.</Step>
        <Step n={3}>By default <strong>Historic</strong> items are hidden. Choose <em>All item statuses</em> to see them.</Step>
        <Step n={4}>Click <strong>Export Register</strong> to save what is on screen as an Excel file.</Step>
      </div>
      <div style={callout("info")}>
        <span>ℹ</span>
        <div>The register shows the <strong>current</strong> record for each item. Older certificates are kept as history, see <strong>Recording Calibrations</strong>.</div>
      </div>
    </>
  );
}

function SectionCalRecord() {
  return (
    <>
      <div style={eyebrow}>Calibration</div>
      <h2 style={h2Style}>Recording Calibrations</h2>
      <h3 style={h3Style}>Adding a new calibration record</h3>
      <div style={mockPanel}>
        <div style={mockLabel}>Create Calibration</div>
        <div style={mockRow}>
          <div style={mockField(2)}><div style={mockFieldLabel}>Item Description</div><div style={mockInput}>Describe the calibrated item, equipment, tool, or spare</div></div>
          <div style={mockField()}><div style={mockFieldLabel}>Asset</div><div style={mockInput}>Unassigned / spare item</div></div>
          <div style={mockField()}><div style={mockFieldLabel}>Calibration Type</div><div style={mockInput}>External</div></div>
        </div>
        <div style={mockRow}>
          <div style={mockField()}><div style={mockFieldLabel}>Date Issued</div><div style={mockInput}>dd/mm/yyyy</div></div>
          <div style={mockField()}><div style={mockFieldLabel}>Frequency</div><div style={mockInput}>1 year</div></div>
          <div style={mockField()}><div style={mockFieldLabel}>Calibration Due Date</div><div style={mockInput}>Filled in for you</div></div>
        </div>
        <span style={btn("primary")}>Add Calibration Record</span>
      </div>
      <div style={stepList}>
        <Step n={1}>Go to <strong>Calibration</strong> then the <strong>Create Calibration</strong> tab.</Step>
        <Step n={2}>Enter the <code style={codeStyle}>Item Description</code>. Choose an <code style={codeStyle}>Asset</code>, or leave it as <em>Unassigned / spare item</em>. Enter the <code style={codeStyle}>Serial Number</code>.</Step>
        <Step n={3}>Choose the <code style={codeStyle}>Calibration Type</code>: <strong>Internal</strong> or <strong>External</strong>. For External, pick the <code style={codeStyle}>Calibration Supplier</code> (or <em>Other supplier</em> and type the name). For Internal, pick the person in <code style={codeStyle}>Calibrated By</code>.</Step>
        <Step n={4}>Enter <code style={codeStyle}>Calibration Date</code>, <code style={codeStyle}>Date Issued</code> and <code style={codeStyle}>Frequency</code> (1 to 5 years). The <code style={codeStyle}>Calibration Due Date</code> is suggested from Date Issued plus the Frequency. You can overtype it.</Step>
        <Step n={5}>Enter the <code style={codeStyle}>Certificate Number</code>, set the <code style={codeStyle}>Item Status</code>, and click <strong>Upload Certificate</strong> to attach the file. Add any <code style={codeStyle}>Notes</code>.</Step>
        <Step n={6}>Click <strong>Add Calibration Record</strong>.</Step>
      </div>
      <p style={pStyle}>Description, Calibration Date, Date Issued and Due Date are required. Certificates can be PDF, Word, Excel, PowerPoint, text/CSV files or photos.</p>
      <h3 style={h3Style}>Recording a renewal (new certificate)</h3>
      <p style={pStyle}>When an item is calibrated again, add a new history entry rather than overwriting the old one. The old certificate stays on file for traceability.</p>
      <div style={stepList}>
        <Step n={1}>Open the <strong>Calibration Register</strong>, click the item (or <strong>Open</strong>). The <strong>Calibration Record Detail</strong> panel opens. Item Description and Serial Number are locked.</Step>
        <Step n={2}>Enter the new <code style={codeStyle}>Certificate Number</code>, <code style={codeStyle}>Calibration Date</code>, <code style={codeStyle}>Date Issued</code>, <code style={codeStyle}>Frequency</code> and <code style={codeStyle}>Calibration Due Date</code>.</Step>
        <Step n={3}>Use <strong>Upload New Certificate</strong> to attach the new certificate (optional, but recommended).</Step>
        <Step n={4}>Click <strong>Save New History Record</strong>.</Step>
      </div>
      <h3 style={h3Style}>Other buttons in the detail panel</h3>
      <table style={imsTableStyle}>
        <thead>
          <tr>{["Button", "What it does"].map(h => <th key={h} style={imsTableHeadStyle}>{h}</th>)}</tr>
        </thead>
        <tbody>
          <tr><td style={{ ...imsTableCellStyle, fontWeight: 800, whiteSpace: "nowrap" }}>Open Certificate</td><td style={imsTableCellStyle}>Opens the stored certificate (only shown if one is attached).</td></tr>
          <tr><td style={{ ...imsTableCellStyle, fontWeight: 800, whiteSpace: "nowrap" }}>Attach Certificate</td><td style={imsTableCellStyle}>Shown when the record has no certificate yet (for example after a bulk upload). Choose a file, then click it. No new history entry is created.</td></tr>
          <tr><td style={{ ...imsTableCellStyle, fontWeight: 800, whiteSpace: "nowrap" }}>Save Item Status</td><td style={imsTableCellStyle}>Changes the Item Status. You must type a reason in <code style={codeStyle}>Lifecycle Reason / Status Notes</code>. Changes are logged under <strong>Item Status History</strong>.</td></tr>
          <tr><td style={{ ...imsTableCellStyle, fontWeight: 800, whiteSpace: "nowrap" }}>Generate Action</td><td style={imsTableCellStyle}>Opens the central Actions page ready to raise an action linked to this calibration.</td></tr>
          <tr><td style={{ ...imsTableCellStyle, fontWeight: 800, whiteSpace: "nowrap" }}>Historic / Hide Historic</td><td style={imsTableCellStyle}>Shows every earlier calibration for the item, each with its own <strong>Open Certificate</strong>.</td></tr>
          <tr><td style={{ ...imsTableCellStyle, fontWeight: 800, whiteSpace: "nowrap" }}>Remove Record</td><td style={imsTableCellStyle}>Deletes the selected record. Needs edit access.</td></tr>
        </tbody>
      </table>
      <h3 style={h3Style}>Bulk upload from a spreadsheet</h3>
      <div style={stepList}>
        <Step n={1}>Open the <strong>Bulk Upload</strong> tab and click <strong>Choose File</strong>. Pick an Excel (.xlsx, .xls) or CSV file. The first sheet is used.</Step>
        <Step n={2}>The columns should be headed <code style={codeStyle}>Description</code>, <code style={codeStyle}>Serial Number</code>, <code style={codeStyle}>Certificate Number</code>, <code style={codeStyle}>Calibration Date</code>, <code style={codeStyle}>Date of Issue</code>, <code style={codeStyle}>Frequency</code>, <code style={codeStyle}>Calibration Due</code> and <code style={codeStyle}>Supplier</code>.</Step>
        <Step n={3}>Check the preview table. Rows marked <strong>Ready</strong> will import; rows marked <strong>Review</strong> show what is wrong and are skipped.</Step>
        <Step n={4}>Click <strong>Import</strong> (the button shows how many, for example <em>Import 40 Records</em>). Certificates are attached afterwards, item by item.</Step>
      </div>
    </>
  );
}

function SectionMaintInsp() {
  return (
    <>
      <div style={eyebrow}>Maintenance &amp; Inspection</div>
      <h2 style={h2Style}>Maintenance &amp; Inspection</h2>
      <p style={pStyle}>The <strong>Inspection Log</strong> and <strong>Maintenance Log</strong> pages work the same way. Each has three tabs: <strong>Dashboard</strong>, a register (<strong>Inspection Register</strong> or <strong>Maintenance Register</strong>) and a create tab (<strong>Create Inspection</strong> or <strong>Create Maintenance</strong>). Every event is saved as its own record with an automatic number.</p>
      <h3 style={h3Style}>Recording an inspection</h3>
      <div style={mockPanel}>
        <div style={mockLabel}>Add Inspection Record</div>
        <div style={mockRow}>
          <div style={mockField()}><div style={mockFieldLabel}>Inspection Number</div><div style={mockInput}>Assigned on save</div></div>
          <div style={mockField()}><div style={mockFieldLabel}>Asset</div><div style={mockInput}>Select asset</div></div>
          <div style={mockField()}><div style={mockFieldLabel}>Carried Out By</div><div style={mockInput}>Select person</div></div>
        </div>
        <div style={mockRow}>
          <div style={mockField()}><div style={mockFieldLabel}>Inspection Date</div><div style={mockInput}>dd/mm/yyyy</div></div>
          <div style={mockField()}><div style={mockFieldLabel}>Result</div><div style={mockInput}>Pass with Observations</div></div>
          <div style={mockField()}><div style={mockFieldLabel}>Next Inspection Due</div><div style={mockInput}>dd/mm/yyyy</div></div>
        </div>
        <span style={btn("primary")}>Save Inspection Record</span>
      </div>
      <div style={stepList}>
        <Step n={1}>Open <strong>Inspection Log</strong> and the <strong>Create Inspection</strong> tab.</Step>
        <Step n={2}>Choose the <code style={codeStyle}>Asset</code>, <code style={codeStyle}>Carried Out By</code> and <code style={codeStyle}>Inspection Date</code>. These three are required.</Step>
        <Step n={3}>Choose the <code style={codeStyle}>Result</code>: <strong>Pass</strong>, <strong>Fail</strong> or <strong>Pass with Observations</strong>.</Step>
        <Step n={4}>Set <code style={codeStyle}>Next Inspection Due</code>. This also updates the asset&apos;s Inspection Due Date.</Step>
        <Step n={5}>Set <code style={codeStyle}>Action Required</code> to Yes or No, write the <code style={codeStyle}>Findings</code> and any <code style={codeStyle}>Actions Required</code>, and use <code style={codeStyle}>Upload Photos / Documents</code> for evidence.</Step>
        <Step n={6}>Click <strong>Save Inspection Record</strong>. The Status line shows the new number.</Step>
      </div>
      <h3 style={h3Style}>Recording maintenance</h3>
      <div style={stepList}>
        <Step n={1}>Open <strong>Maintenance Log</strong> and the <strong>Create Maintenance</strong> tab.</Step>
        <Step n={2}>Choose the <code style={codeStyle}>Asset</code>, <code style={codeStyle}>Carried Out By</code> and <code style={codeStyle}>Maintenance Date</code>, and write <code style={codeStyle}>Work Completed / Description</code>. All four are required.</Step>
        <Step n={3}>Choose the <code style={codeStyle}>Maintenance Type</code>: <strong>Preventative</strong> or <strong>Corrective</strong>.</Step>
        <Step n={4}>Set <code style={codeStyle}>Next Maintenance Due</code> (this also updates the asset&apos;s Maintenance Due Date), <code style={codeStyle}>Action Required</code>, and attach photos or documents.</Step>
        <Step n={5}>Click <strong>Save Maintenance Record</strong>.</Step>
      </div>
      <div style={callout("info")}>
        <span>ℹ</span>
        <div>The <code style={codeStyle}>Carried Out By</code> list shows active people from the People list. If a name is missing, see <strong>Statuses, Actions &amp; People</strong>.</div>
      </div>
      <h3 style={h3Style}>Reviewing, editing and acting on records</h3>
      <div style={stepList}>
        <Step n={1}>Open the register tab. Search, or filter by <code style={codeStyle}>Asset Filter</code>, <code style={codeStyle}>Result Filter</code> / <code style={codeStyle}>Maintenance Type Filter</code>, and <code style={codeStyle}>Due Status</code>.</Step>
        <Step n={2}>Click a row to open its detail panel. Edit the fields and click <strong>Save Changes</strong>, or use <strong>Remove</strong> to delete the record.</Step>
        <Step n={3}>If <code style={codeStyle}>Action Required</code> is Yes, a <strong>Generate Action</strong> button appears. It opens the central Actions page with the asset and record already linked.</Step>
        <Step n={4}>Click <strong>Open File</strong> to view an attached photo or document.</Step>
      </div>
      <p style={pStyle}>The <strong>Due Status</strong> is worked out from the Next Due date, in the same way as calibration: <span style={statusBadge("overdue")}>Overdue</span> <span style={statusBadge("due soon")}>Due Soon</span> (within 30 days) <span style={statusBadge("in date")}>In Date</span> <span style={statusBadge("not set")}>Not Set</span>.</p>
    </>
  );
}

function SectionPrint() {
  return (
    <>
      <div style={eyebrow}>3D Print Requests</div>
      <h2 style={h2Style}>Requesting a 3D Print</h2>
      <p style={pStyle}>Anyone who is signed in can ask for a part to be 3D printed. One <strong>request</strong> can hold several <strong>objects</strong>. Each object gets its own job number (for example <code style={codeStyle}>JOB-004-A</code>) and moves through the queue on its own. The register page has three tabs: <strong>Register</strong>, <strong>Create Request</strong> and, for print admins only, <strong>Team</strong>.</p>
      <div style={flowWrap}>
        <div style={flowStep()}>Request submitted</div><div style={arrow}>→</div>
        <div style={flowStep()}>Queued</div><div style={arrow}>→</div>
        <div style={flowStep()}>Printing</div><div style={arrow}>→</div>
        <div style={flowStep(true)}>Completed</div>
      </div>
      <div style={stepList}>
        <Step n={1}>Open <strong>3D Print Requests</strong> and the <strong>Create Request</strong> tab. Your name fills in as the <code style={codeStyle}>Requester</code>.</Step>
        <Step n={2}>Optionally choose a <code style={codeStyle}>Project</code> and say <code style={codeStyle}>Why print instead of buy (optional)</code>.</Step>
        <Step n={3}>For <strong>Object 1</strong>, enter the <code style={codeStyle}>Object description</code>, <code style={codeStyle}>Quantity</code>, <code style={codeStyle}>Needed by</code> date and <code style={codeStyle}>Priority</code> (High, Medium or Low).</Step>
        <Step n={4}>Enter the <code style={codeStyle}>Estimated cost to buy, total £ (from procurement RFQ)</code>. This must be above £0 and should come from a procurement RFQ.</Step>
        <Step n={5}>Add <code style={codeStyle}>Examples of the component</code> (photos, drawings or CAD files). Click the box or drag files onto it. You can add several.</Step>
        <Step n={6}>Need another part? Click <strong>Add Another Object</strong>. Use <strong>Discard Object</strong> to remove one.</Step>
        <Step n={7}>Click <strong>Submit Request</strong>. The Status line shows the request number, for example <em>REQ-004 submitted with 2 objects</em>.</Step>
      </div>
      <div style={callout("warning")}>
        <span>⚠</span>
        <div>Every object must have a description, a quantity of at least 1, a needed-by date and a cost estimate above £0. If one is missing, the request is not sent and the Status line says which.</div>
      </div>
      <h3 style={h3Style}>Following your request</h3>
      <p style={pStyle}>On the <strong>Register</strong> tab, requesters see only their own jobs. The columns show the job number, urgency, needed-by date, status and operator. Click a row to open <strong>Print Job Detail</strong>. To order the same thing again, use <strong>Repeat Request</strong>, set new dates, and submit.</p>
    </>
  );
}

function SectionPrintJobs() {
  return (
    <>
      <div style={eyebrow}>3D Print Requests</div>
      <h2 style={h2Style}>Running the Print Queue</h2>
      <h3 style={h3Style}>Roles</h3>
      <table style={imsTableStyle}>
        <thead>
          <tr>{["Role", "What you can do"].map(h => <th key={h} style={imsTableHeadStyle}>{h}</th>)}</tr>
        </thead>
        <tbody>
          <tr><td style={{ ...imsTableCellStyle, fontWeight: 800 }}>Requester</td><td style={imsTableCellStyle}>Raise requests, see your own jobs, add or remove reference files on your own requests.</td></tr>
          <tr><td style={{ ...imsTableCellStyle, fontWeight: 800 }}>Operator</td><td style={imsTableCellStyle}>See every job. Use <strong>Assign To Me</strong> on an unassigned job, then print and cost the jobs assigned to you.</td></tr>
          <tr><td style={{ ...imsTableCellStyle, fontWeight: 800 }}>Print admin</td><td style={imsTableCellStyle}>Everything an operator can do, plus assigning jobs, deleting jobs, managing the Team tab, and bypassing the progression rules. System administrators always have admin access.</td></tr>
        </tbody>
      </table>
      <h3 style={h3Style}>The queue</h3>
      <p style={pStyle}>Staff see two buttons above the register: <strong>All Jobs</strong> and <strong>My Tasks</strong>. Jobs are ordered automatically: overdue first, then highest priority, nearest deadline. Cards show <strong>Overdue</strong>, <strong>High Priority Open</strong>, <strong>Open Objects</strong>, <strong>Unassigned</strong>, <strong>Hours Logged This Month</strong> and (admins) <strong>Est. Saved vs Buying</strong>. Click a card to filter. <strong>Export Excel</strong> and <strong>Export PDF</strong> save the current view.</p>
      <h3 style={h3Style}>Moving a job through the queue</h3>
      <div style={stepList}>
        <Step n={1}>Click the job row to open <strong>Print Job Detail</strong>. Review the object and the <strong>Reference Examples</strong> (click <strong>Open</strong> to view a file).</Step>
        <Step n={2}>Operators: if the job is unassigned, click <strong>Assign To Me</strong>. Print admins are notified. Admins can choose the <code style={codeStyle}>Operator</code> from a list instead.</Step>
        <Step n={3}>Enter <code style={codeStyle}>Actual hours (time taken to print)</code> and <code style={codeStyle}>Actual material cost £ (material used)</code>, then click <strong>Start Printing</strong>. The job becomes <span style={statusBadge("printing")}>Printing</span>.</Step>
        <Step n={4}>When finished, write the <code style={codeStyle}>Operator notes (print errors, design modifications)</code>, tick <strong>I have checked the actual hours are correct</strong>, and click <strong>Mark Complete</strong>. The job becomes <span style={statusBadge("completed")}>Completed</span>.</Step>
        <Step n={5}>Use <strong>Save Job</strong> to save figures without changing the status. <strong>Return To Queue</strong> moves a Printing job back to Queued; <strong>Reopen Job</strong> moves a Completed job back to Printing.</Step>
      </div>
      <div style={callout("warning")}>
        <span>⚠</span>
        <div>Printing cannot start until hours and material cost are entered. A job cannot be completed until operator notes are entered and the hours are confirmed. Operators are blocked and told what is missing. Print admins are asked and may bypass; this is recorded on the job as <em>Rules Bypassed By</em>.</div>
      </div>
      <h3 style={h3Style}>Managing the print team (admins)</h3>
      <div style={stepList}>
        <Step n={1}>Open the <strong>Team</strong> tab.</Step>
        <Step n={2}>Choose a <code style={codeStyle}>Person</code> and a <code style={codeStyle}>Role</code> (<strong>Operator</strong> or <strong>Print admin</strong>) and click <strong>Add To Team</strong>. The person needs an email on their People record.</Step>
        <Step n={3}>Change a role from the table, or click <strong>Remove</strong>. Jobs already assigned keep their assignment.</Step>
      </div>
      <p style={pStyle}>Admins also have <strong>Delete Job</strong> in the job detail. It asks you to confirm and cannot be undone.</p>
    </>
  );
}

function SectionField() {
  return (
    <>
      <div style={eyebrow}>Field Use on a Phone</div>
      <h2 style={h2Style}>Using a Phone (QR Codes)</h2>
      <p style={pStyle}>Every asset has a QR code. Stick it on the equipment and anyone can scan it with a phone camera to open that asset and record an inspection or maintenance on the spot.</p>
      <h3 style={h3Style}>Getting the QR code</h3>
      <div style={stepList}>
        <Step n={1}>Open the asset in the register and find <strong>Asset QR / Field Access</strong>.</Step>
        <Step n={2}>Click <strong>Generate / View QR Code</strong>.</Step>
        <Step n={3}>Use <strong>Print QR</strong> to print it (allow pop-ups if asked), <strong>Download QR</strong> to save the image, or <strong>Copy Link</strong> to share the link.</Step>
      </div>
      <h3 style={h3Style}>After scanning</h3>
      <div style={mockPanel}>
        <div style={{ maxWidth: 280, margin: "0 auto" }}>
          <div style={{ ...mockHero, borderRadius: 12, marginBottom: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.04em", textTransform: "uppercase" }}>Asset Field Access</div>
          </div>
          <div style={{ background: "#fff", border: `1px solid ${imsColours.border}`, borderRadius: 12, padding: 12, marginBottom: 8 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: imsColours.brand }}>AST-TRENCH-2611231045</div>
            <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>Trencher skid</div>
            <div style={{ fontSize: 11, color: imsColours.muted, marginBottom: 6 }}>Serial: TS-0042<br />Location: Aberdeen</div>
            <span style={statusBadge("active")}>Active</span>
          </div>
          <div style={{ ...btn("primary"), width: "100%", justifyContent: "center", marginBottom: 6, padding: "12px 13px" }}>Carry Out Inspection</div>
          <div style={{ ...btn("primary"), width: "100%", justifyContent: "center", padding: "12px 13px" }}>Carry Out Maintenance</div>
        </div>
      </div>
      <div style={stepList}>
        <Step n={1}>Scan the QR code. The <strong>Asset Field Access</strong> page shows the asset name, serial number, location and status.</Step>
        <Step n={2}>Tap <strong>Carry Out Inspection</strong> or <strong>Carry Out Maintenance</strong>. The form opens with the asset already chosen.</Step>
        <Step n={3}>Fill in the form (see <strong>Maintenance &amp; Inspection</strong>), attach a photo if useful, and tap <strong>Save Inspection Record</strong> or <strong>Save Maintenance Record</strong>.</Step>
        <Step n={4}>Use <strong>Back to Field Access</strong> to return to the asset, or <strong>Back to Asset Register</strong> on the field page.</Step>
      </div>
      <h3 style={h3Style}>No QR code to hand?</h3>
      <p style={pStyle}>Open <strong>Field Tools</strong> and choose <strong>Asset Inspection</strong> or <strong>Asset Maintenance</strong>. The page <strong>Asset Field Inspection</strong> or <strong>Asset Field Maintenance</strong> lists every asset. Type in <em>Search asset, serial number, or location</em>, tap the asset, and the same form opens. The IMS home page also has an <strong>Asset check</strong> button that goes to the inspection list.</p>
      <div style={callout("info")}>
        <span>ℹ</span>
        <div>Photos and documents attached on a phone are uploaded in the normal way, and stored files open on a phone when you tap <strong>Open File</strong> or <strong>Open file</strong>. If your phone blocks the new tab, the file opens in the same tab; use Back to return to the IMS.</div>
      </div>
    </>
  );
}

function SectionReports() {
  return (
    <>
      <div style={eyebrow}>Reports</div>
      <h2 style={h2Style}>Dashboards &amp; Monthly Reports</h2>
      <h3 style={h3Style}>Asset Dashboard</h3>
      <p style={pStyle}>Open <strong>Dashboard</strong> in the Asset Management menu for the whole-module picture. It has three tabs.</p>
      <table style={imsTableStyle}>
        <thead>
          <tr>{["Tab", "What you see"].map(h => <th key={h} style={imsTableHeadStyle}>{h}</th>)}</tr>
        </thead>
        <tbody>
          <tr><td style={{ ...imsTableCellStyle, fontWeight: 800 }}>Overview</td><td style={imsTableCellStyle}>The <strong>Asset control score</strong> (shown as <em>Control Health</em>) and <strong>Operational Pressure</strong> for calibration, inspection, maintenance and actions. Click a row to open the live register.</td></tr>
          <tr><td style={{ ...imsTableCellStyle, fontWeight: 800 }}>Analytics</td><td style={imsTableCellStyle}>KPI cards (Total Assets, Due Risk Items, Overdue Controls, Open Asset Actions, File Coverage, Control Records), <strong>Asset Status Split</strong>, <strong>Due Date Control</strong>, <strong>Location Picture</strong> and <strong>Ownership Mix</strong>.</td></tr>
          <tr><td style={{ ...imsTableCellStyle, fontWeight: 800 }}>Attention &amp; Planning</td><td style={imsTableCellStyle}><strong>Asset Attention Board</strong>, <strong>Upcoming Calibrations</strong>, <strong>Inspection Watchlist</strong> and <strong>Maintenance Watchlist</strong>, each with an <strong>Open</strong> link to the full register.</td></tr>
        </tbody>
      </table>
      <p style={pStyle}>The control score starts at 100% and drops for overdue and due-soon items and overdue asset actions. It improves a little with asset file coverage. It is a guide, not an audit result.</p>
      <h3 style={h3Style}>Monthly Management Report</h3>
      <div style={stepList}>
        <Step n={1}>Open <strong>Reports</strong> (also reachable from the <strong>Reports</strong> tab on the Assets page via <strong>Open Asset Reports</strong>).</Step>
        <Step n={2}>Under <strong>Create Monthly Management Report</strong>, pick the <code style={codeStyle}>Month</code> and <code style={codeStyle}>Year</code>.</Step>
        <Step n={3}>Optionally write an <code style={codeStyle}>Executive Summary</code> and <code style={codeStyle}>Next Month Focus / Planned Activity</code>.</Step>
        <Step n={4}>Check the <strong>Management Snapshot</strong> on the right. These figures come live from the register, calibration, inspection, maintenance and actions data.</Step>
        <Step n={5}>Click <strong>Save Monthly Report</strong> to keep it, and/or <strong>Generate Monthly PDF</strong> to produce the PDF.</Step>
      </div>
      <h3 style={h3Style}>Saved reports</h3>
      <p style={pStyle}>Each saved month appears under <strong>Saved Monthly Reports</strong>. Use the search or the <code style={codeStyle}>Report Year</code> filter, then <strong>PDF</strong> to produce the PDF, <strong>Edit</strong> to change the wording (button becomes <strong>Update Monthly Report</strong>), or <strong>Delete</strong>.</p>
      <div style={callout("info")}>
        <span>ℹ</span>
        <div>PDFs and Excel exports (calibration register, 3D print register) save to your device, including on phones. If a PDF opens in a new tab instead, use your browser&apos;s share or save option.</div>
      </div>
    </>
  );
}

function SectionReference() {
  return (
    <>
      <div style={eyebrow}>Reference</div>
      <h2 style={h2Style}>Statuses, Actions &amp; People</h2>
      <h3 style={h3Style}>Asset status</h3>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <span style={statusBadge("active")}>Active</span>
        <span style={statusBadge("inactive")}>Inactive</span>
        <span style={statusBadge("quarantine")}>Quarantine</span>
        <span style={statusBadge("under maintenance")}>Under Maintenance</span>
      </div>
      <table style={imsTableStyle}>
        <thead>
          <tr>{["Status", "Use it when"].map(h => <th key={h} style={imsTableHeadStyle}>{h}</th>)}</tr>
        </thead>
        <tbody>
          <tr><td style={{ ...imsTableCellStyle, fontWeight: 800 }}>Active</td><td style={imsTableCellStyle}>The asset is in normal use.</td></tr>
          <tr><td style={{ ...imsTableCellStyle, fontWeight: 800 }}>Inactive</td><td style={imsTableCellStyle}>Not in use or parked. The record is kept.</td></tr>
          <tr><td style={{ ...imsTableCellStyle, fontWeight: 800 }}>Quarantine</td><td style={imsTableCellStyle}>Set aside and not to be used until resolved.</td></tr>
          <tr><td style={{ ...imsTableCellStyle, fontWeight: 800 }}>Under Maintenance</td><td style={imsTableCellStyle}>Currently being maintained or repaired.</td></tr>
        </tbody>
      </table>
      <p style={pStyle}>Statuses are set by hand in the asset&apos;s <strong>Master Data</strong>. They do not change automatically when you log an inspection or maintenance.</p>
      <h3 style={h3Style}>Item status (calibration)</h3>
      <p style={pStyle}><strong>In Use</strong>, <strong>Not In Use</strong>, <strong>Damaged</strong>, <strong>Missing / Lost</strong>, <strong>Historic</strong>. Only In Use items count in calibration compliance figures.</p>
      <h3 style={h3Style}>Due status (calibration, inspection, maintenance)</h3>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <span style={statusBadge("overdue")}>Overdue</span>
        <span style={statusBadge("due soon")}>Due Soon</span>
        <span style={statusBadge("in date")}>In Date</span>
        <span style={statusBadge("not set")}>Not Set</span>
      </div>
      <p style={pStyle}>Overdue means the date has passed. Due Soon means within the next 30 days. Not Set means no date has been entered.</p>
      <h3 style={h3Style}>3D print job status</h3>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <span style={statusBadge("queued")}>Queued</span>
        <span style={statusBadge("printing")}>Printing</span>
        <span style={statusBadge("completed")}>Completed</span>
      </div>
      <h3 style={h3Style}>Asset Actions</h3>
      <p style={pStyle}>When an inspection, maintenance or calibration needs follow-up, use <strong>Generate Action</strong> (or <strong>Raise Action</strong> on the asset). The action is created in central Action Management with department <strong>Assets</strong>, linked back to the asset and record. The <strong>Asset Actions</strong> page lists them (tabs <strong>Dashboard</strong>, <strong>Action Register</strong>, <strong>Create Action</strong>), filterable by <code style={codeStyle}>Status</code> (Open, In Progress, Closed), <code style={codeStyle}>Owner</code> and <code style={codeStyle}>Priority</code> (Low, Medium, High). Click <strong>Open Central</strong> to update an action in the main Actions page.</p>
      <h3 style={h3Style}>Asset People</h3>
      <p style={pStyle}>The <strong>People</strong> page holds the list of people who appear in the <code style={codeStyle}>Carried Out By</code> and <code style={codeStyle}>Calibrated By</code> drop-downs.</p>
      <div style={stepList}>
        <Step n={1}>To add someone, enter <code style={codeStyle}>Name</code> and an optional <code style={codeStyle}>Role</code> under <strong>Add Person</strong> and click <strong>Add Person</strong>. They are active when saved.</Step>
        <Step n={2}>To change someone, click them in the <strong>People Register</strong>, edit, and click <strong>Save Changes</strong>.</Step>
        <Step n={3}>When someone leaves, click <strong>Deactivate</strong> rather than deleting. They disappear from new drop-downs but their name stays on old records. <strong>Reactivate</strong> brings them back.</Step>
      </div>
    </>
  );
}

function SectionFaq() {
  const qa: [string, string][] = [
    ["Why can't I choose the asset code?", "It is created automatically when you save a new asset. Use the Document ID Code for your own short reference."],
    ["I uploaded a certificate on an asset but it has not stuck.", "Uploads in the asset's Quality Links section only count once you click Save Quality Section."],
    ["What file types can I upload for certificates and inspection or maintenance evidence?", "PDF, Word, Excel, PowerPoint, text/CSV files and photos (including iPhone photos)."],
    ["The file will not open on my phone.", "Tap Open File or Open certificate again. If the new tab is blocked, the file opens in the same tab and Back returns you to the IMS."],
    ["A person is missing from Carried Out By.", "They may be inactive or not on the Asset People list. Add or reactivate them on the People page."],
    ["I logged an inspection but the asset's Inspection Due Date did not change.", "The asset is only updated if you filled in Next Inspection Due (or Next Maintenance Due for maintenance)."],
    ["Why is a calibration item not in the dashboard figures?", "Only items with Item Status In Use are counted. Check whether it is Not In Use, Damaged, Missing / Lost or Historic."],
    ["How do I record a new calibration certificate for an item?", "Open the item in the Calibration Register, enter the new dates and certificate number, and click Save New History Record. The old certificate is kept."],
    ["I see a calibration with no certificate.", "Open it and use Attach Certificate. This is common after a bulk upload."],
    ["Why did a 3D print job refuse to start or complete?", "Starting needs actual hours and material cost. Completing needs operator notes and the tick to confirm hours. A print admin can bypass this."],
    ["I cannot see other people's 3D print jobs.", "Requesters only see their own. Operators and print admins see all jobs."],
    ["I get 'Permission required'.", "Your IMS access does not allow that action. Ask an administrator for create or edit access."],
  ];
  return (
    <>
      <div style={eyebrow}>Reference</div>
      <h2 style={h2Style}>Common Questions</h2>
      {qa.map(([q, a]) => (
        <div key={q} style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: imsColours.brand, marginBottom: 3 }}>{q}</div>
          <p style={{ ...pStyle, marginBottom: 0 }}>{a}</p>
        </div>
      ))}
    </>
  );
}

const sectionComponents: Record<SectionKey, () => ReactElement> = {
  overview:    SectionOverview,
  register:    SectionRegister,
  assetedit:   SectionAssetEdit,
  calibration: SectionCalibration,
  calrecord:   SectionCalRecord,
  maintinsp:   SectionMaintInsp,
  print:       SectionPrint,
  printjobs:   SectionPrintJobs,
  field:       SectionField,
  reports:     SectionReports,
  reference:   SectionReference,
  faq:         SectionFaq,
};

export const assetsGuide: GuideDefinition = {
  id: "assets",
  navLabel: "Assets",
  guideLabel: "Asset Management",
  defaultSection: "overview",
  sections,
  sectionComponents,
};
