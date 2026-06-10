const pptxgen = require("pptxgenjs");
const fs = require("fs");
const path = require("path");

const pres = new pptxgen();
pres.layout = "LAYOUT_16x9";
pres.author = "Enshore Subsea";
pres.title = "Enshore IMS – Integrated Management System";

const SS = "C:\\Users\\JBeaton\\asset-quality-webapp\\screenshots\\";

// ─── PALETTE ────────────────────────────────────────────────────
const C = {
  brand:      "3A9B98",
  brandDark:  "2F7F7D",
  brandDeep:  "1A4F4E",
  brandMid:   "245958",
  accent:     "02C39A",
  accentWarm: "F59E0B",
  white:      "FFFFFF",
  offWhite:   "F0F9F8",
  ink:        "0F172A",
  slate:      "334155",
  muted:      "64748B",
  danger:     "DC2626",
  lightTeal:  "D1F2F0",
  darkPanel:  "0D2B2A",
  midPanel:   "164241",
};

const makeShadow  = () => ({ type: "outer", color: "000000", blur: 12, offset: 3, angle: 135, opacity: 0.18 });
const cardShadow  = () => ({ type: "outer", color: "000000", blur: 6,  offset: 2, angle: 135, opacity: 0.10 });

function imgPath(name) {
  return path.join(SS, name + ".jpg");
}

// ─── SCREEN FRAME helper ────────────────────────────────────────
function addScreenFrame(s, x, y, w, h, imgFile, caption) {
  // Drop shadow under frame
  s.addShape(pres.shapes.RECTANGLE, {
    x: x + 0.08, y: y + 0.08, w, h,
    fill: { color: "000000", transparency: 65 }, line: { color: "000000", width: 0 },
  });
  // White border
  s.addShape(pres.shapes.RECTANGLE, {
    x, y, w, h,
    fill: { color: C.white }, line: { color: C.brand, width: 2 },
  });
  // Browser chrome bar
  s.addShape(pres.shapes.RECTANGLE, {
    x, y, w, h: 0.22,
    fill: { color: C.brandDeep }, line: { color: C.brand, width: 0 },
  });
  // Traffic light dots
  [0, 1, 2].forEach(i => {
    s.addShape(pres.shapes.OVAL, {
      x: x + 0.08 + i * 0.14, y: y + 0.06, w: 0.09, h: 0.09,
      fill: { color: i === 0 ? "DC2626" : i === 1 ? "F59E0B" : "16A34A" },
      line: { color: C.brandDeep, width: 0 },
    });
  });
  // URL bar
  s.addShape(pres.shapes.RECTANGLE, {
    x: x + 0.55, y: y + 0.04, w: w - 0.65, h: 0.14,
    fill: { color: C.brandMid }, line: { color: C.brandMid, width: 0 },
  });
  s.addText("localhost:3000", {
    x: x + 0.56, y: y + 0.03, w: w - 0.68, h: 0.16,
    fontSize: 6, color: "A0D4D2", valign: "middle", margin: 0,
  });
  // Screenshot
  if (fs.existsSync(imgFile)) {
    s.addImage({ path: imgFile, x: x + 0.02, y: y + 0.22, w: w - 0.04, h: h - 0.24 });
  }
  if (caption) {
    s.addText(caption, {
      x, y: y + h + 0.04, w, h: 0.22,
      fontSize: 8, color: C.muted, align: "center", italic: true, margin: 0,
    });
  }
}

// ─── STAT CALLOUT ───────────────────────────────────────────────
function addStat(s, x, y, w, h, number, label, color) {
  s.addShape(pres.shapes.RECTANGLE, {
    x, y, w, h,
    fill: { color: color || C.brand },
    line: { color: color || C.brand, width: 0 },
    shadow: cardShadow(),
  });
  s.addText(number, {
    x, y: y + 0.05, w, h: h * 0.55,
    fontSize: 28, bold: true, color: C.white, align: "center", valign: "bottom", margin: 0,
  });
  s.addText(label, {
    x, y: y + h * 0.58, w, h: h * 0.38,
    fontSize: 9, color: "C8F0EF", align: "center", valign: "top", margin: 0, wrap: true,
  });
}

// ─── BADGE ──────────────────────────────────────────────────────
function addBadge(s, x, y, label, color) {
  s.addShape(pres.shapes.RECTANGLE, {
    x, y, w: 1.5, h: 0.3,
    fill: { color: color || C.accent }, line: { color: color || C.accent, width: 0 },
  });
  s.addText(label, {
    x, y, w: 1.5, h: 0.3,
    fontSize: 8, bold: true, color: C.white, align: "center", valign: "middle",
    charSpacing: 1, margin: 0,
  });
}

const TOTAL = 20;
function pn(s, n) {
  s.addText(`${n} / ${TOTAL}`, {
    x: 9.3, y: 5.3, w: 0.6, h: 0.22,
    fontSize: 8, color: C.muted, align: "right", margin: 0,
  });
}

// ════════════════════════════════════════════════════════════════
// SLIDE 1 — BOLD COVER
// ════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.ink };

  // Full-width teal gradient band
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 1.8, w: 10, h: 2.4,
    fill: { color: C.brand }, line: { color: C.brand, width: 0 },
  });
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 1.8, w: 3.5, h: 2.4,
    fill: { color: C.brandDeep }, line: { color: C.brandDeep, width: 0 },
  });

  // Home screenshot on the right
  s.addImage({ path: imgPath("01_home"), x: 5.5, y: 0.2, w: 4.3, h: 2.7,
    transparency: 15 });
  s.addShape(pres.shapes.RECTANGLE, {
    x: 5.5, y: 0.2, w: 4.3, h: 2.7,
    fill: { color: C.ink, transparency: 50 }, line: { color: C.brand, width: 2 },
  });

  s.addText("ENSHORE SUBSEA", {
    x: 0.5, y: 0.3, w: 5, h: 0.4,
    fontSize: 10, bold: true, color: C.accent, charSpacing: 6, margin: 0,
  });
  s.addText("Integrated\nManagement\nSystem", {
    x: 0.5, y: 0.75, w: 5, h: 1.5,
    fontSize: 32, bold: true, color: C.white, margin: 0, lineSpacingMultiple: 1.1,
  });

  s.addText("One platform. Every department.", {
    x: 0.5, y: 2.0, w: 9, h: 0.55,
    fontSize: 22, bold: true, color: C.white, margin: 0,
  });
  s.addText("Quality · HSE · Document Control · Risk · Assets · Actions", {
    x: 0.5, y: 2.6, w: 9, h: 0.4,
    fontSize: 13, color: C.lightTeal, margin: 0,
  });

  // Module badges
  const badges = ["Live Dashboards", "Auto PDF Reports", "Mobile Friendly", "QR Code Access", "Role-Based Security", "Paperless Workflow"];
  badges.forEach((b, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    addBadge(s, 0.5 + col * 1.7, 4.3 + row * 0.38, b, i % 2 === 0 ? C.brand : C.brandDark);
  });

  s.addText("Bespoke for Enshore Subsea  ·  Cloud-hosted  ·  Always-on", {
    x: 0.5, y: 5.25, w: 9, h: 0.25,
    fontSize: 8.5, color: C.muted, margin: 0,
  });
}

// ════════════════════════════════════════════════════════════════
// SLIDE 2 — THE PROBLEM (Why you need this)
// ════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.darkPanel };
  pn(s, 2);

  s.addText("Sound familiar?", {
    x: 0.6, y: 0.3, w: 9, h: 0.6,
    fontSize: 32, bold: true, color: C.white, margin: 0,
  });
  s.addText("The old way of managing HSEQ — scattered, slow, and impossible to audit.", {
    x: 0.6, y: 0.95, w: 9, h: 0.35,
    fontSize: 13, color: "A0D4D2", italic: true, margin: 0,
  });

  const pains = [
    ["📁", "Documents scattered across shared drives — no version control, no review dates, no audit trail."],
    ["📧", "Review and approval chased over email — no visibility of who's approved what or when."],
    ["📋", "Inspections on paper forms — data entered hours later, findings lost, reports never generated."],
    ["📊", "Monthly HSEQ reports take hours to compile from multiple Excel sheets and folders."],
    ["⚠️", "Actions raised in meetings, written on whiteboards — no tracking, no accountability, no closure."],
    ["🔍", "Audit preparation means a frantic search for evidence across email threads and network drives."],
  ];

  pains.forEach((p, i) => {
    const y = 1.45 + i * 0.65;
    s.addShape(pres.shapes.RECTANGLE, {
      x: 0.5, y, w: 9.0, h: 0.55,
      fill: { color: i % 2 === 0 ? C.midPanel : C.brandDeep }, line: { color: C.brand, width: 0 },
    });
    s.addShape(pres.shapes.RECTANGLE, {
      x: 0.5, y, w: 0.06, h: 0.55,
      fill: { color: C.danger }, line: { color: C.danger, width: 0 },
    });
    s.addText(p[0], {
      x: 0.6, y, w: 0.5, h: 0.55,
      fontSize: 16, align: "center", valign: "middle", margin: 0,
    });
    s.addText(p[1], {
      x: 1.2, y, w: 8.1, h: 0.55,
      fontSize: 10.5, color: "C8F0EF", valign: "middle", margin: 0,
    });
  });
}

// ════════════════════════════════════════════════════════════════
// SLIDE 3 — THE SOLUTION (Overview)
// ════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.offWhite };
  pn(s, 3);

  s.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 10, h: 0.5,
    fill: { color: C.brand }, line: { color: C.brand, width: 0 },
  });
  s.addText("THE ENSHORE IMS SOLUTION", {
    x: 0.4, y: 0, w: 9, h: 0.5,
    fontSize: 10, bold: true, color: C.white, valign: "middle", charSpacing: 4, margin: 0,
  });

  s.addText("One connected system. Zero paper. Total visibility.", {
    x: 0.5, y: 0.65, w: 9, h: 0.6,
    fontSize: 26, bold: true, color: C.ink, margin: 0,
  });

  // Home screenshot
  addScreenFrame(s, 0.4, 1.35, 5.5, 3.4, imgPath("01_home"), "IMS Command Hub — every module in one place");

  // Key points
  const points = [
    ["🌐", "Cloud-hosted", "Access from any device, anywhere — no VPN, no install."],
    ["📱", "Mobile-first", "Full mobile support for on-site inspections and field capture."],
    ["🔗", "Fully connected", "Every module feeds the same operational picture — no silos."],
    ["⚡", "Always live", "Real-time dashboards update the moment data is entered."],
    ["🔒", "Role-based access", "Staff see only what they need to see — built-in security."],
    ["📄", "Auto-reports", "One click generates a fully formatted PDF report — no Excel."],
  ];
  points.forEach((pt, i) => {
    const row = i % 3;
    const col = Math.floor(i / 3);
    const x = 6.15 + col * 1.95;
    const y = 1.35 + row * 1.1;
    s.addShape(pres.shapes.RECTANGLE, {
      x, y, w: 1.8, h: 1.0,
      fill: { color: C.white }, line: { color: "D1F2F0", width: 1 },
      shadow: cardShadow(),
    });
    s.addShape(pres.shapes.RECTANGLE, {
      x, y, w: 1.8, h: 0.06,
      fill: { color: C.brand }, line: { color: C.brand, width: 0 },
    });
    s.addText(pt[0], { x, y: y + 0.1, w: 1.8, h: 0.4, fontSize: 18, align: "center", margin: 0 });
    s.addText(pt[1], { x, y: y + 0.48, w: 1.8, h: 0.26, fontSize: 9.5, bold: true, color: C.ink, align: "center", margin: 0 });
    s.addText(pt[2], { x, y: y + 0.72, w: 1.8, h: 0.26, fontSize: 8, color: C.muted, align: "center", margin: 0, wrap: true });
  });
}

// ════════════════════════════════════════════════════════════════
// SLIDE 4 — LIVE DASHBOARDS
// ════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.ink };
  pn(s, 4);

  s.addText("Live, Interactive Dashboards", {
    x: 0.5, y: 0.2, w: 9, h: 0.55,
    fontSize: 30, bold: true, color: C.white, margin: 0,
  });
  s.addText("Every module has its own live dashboard — KPIs, charts, and overdue alerts updating in real time.", {
    x: 0.5, y: 0.8, w: 9, h: 0.32,
    fontSize: 12, color: "A0D4D2", margin: 0,
  });

  // 3 dashboard screenshots
  addScreenFrame(s, 0.3, 1.2, 3.0, 1.9, imgPath("02_quality"), "Quality Dashboard");
  addScreenFrame(s, 3.5, 1.2, 3.0, 1.9, imgPath("03_hse"),     "HSE Dashboard");
  addScreenFrame(s, 6.7, 1.2, 3.0, 1.9, imgPath("09_assets"),  "Asset Dashboard");

  addScreenFrame(s, 0.3, 3.3, 3.0, 1.9, imgPath("06_ncr"),     "NCR / CAPA");
  addScreenFrame(s, 3.5, 3.3, 3.0, 1.9, imgPath("08_risk"),    "Risk Dashboard");
  addScreenFrame(s, 6.7, 3.3, 3.0, 1.9, imgPath("13_actions"), "Action Management");
}

// ════════════════════════════════════════════════════════════════
// SLIDE 5 — DOCUMENT CONTROL
// ════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.offWhite };
  pn(s, 5);

  s.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 10, h: 0.5,
    fill: { color: C.brand }, line: { color: C.brand, width: 0 },
  });
  s.addText("DOCUMENT CONTROL", {
    x: 0.4, y: 0, w: 9, h: 0.5,
    fontSize: 10, bold: true, color: C.white, valign: "middle", charSpacing: 4, margin: 0,
  });

  s.addText("468 controlled documents.\nOne register. Always current.", {
    x: 0.5, y: 0.6, w: 4.5, h: 1.1,
    fontSize: 22, bold: true, color: C.ink, margin: 0, lineSpacingMultiple: 1.1,
  });
  s.addText("Forget searching shared drives or emailing for the latest revision.\nEvery document — procedures, forms, certificates — is version-controlled,\nreview-dated, and accessible to the right people instantly.", {
    x: 0.5, y: 1.75, w: 4.5, h: 0.9,
    fontSize: 10.5, color: C.slate, margin: 0, lineSpacingMultiple: 1.3,
  });

  addScreenFrame(s, 5.1, 0.6, 4.7, 3.0, imgPath("04_documents"), "Document Control Dashboard — 468 live documents");

  // Stats row
  const stats = [["468", "Total Documents"], ["425", "Live & Approved"], ["61", "Reviews Overdue"], ["Auto", "PDF Generated"]];
  stats.forEach((st, i) => {
    addStat(s, 0.5 + i * 1.22, 2.82, 1.1, 0.78, st[0], st[1], i === 2 ? C.danger : C.brand);
  });

  // Feature list
  const feats = [
    "✅  Auto document numbering (Dept + Type + Sequence)",
    "✅  Draft → Review → Approval → Live workflow",
    "✅  Email notifications at every workflow step",
    "✅  Full revision history and archive",
    "✅  Overdue review alerts on the dashboard",
    "✅  PDF report pack — one click, fully formatted",
  ];
  feats.forEach((f, i) => {
    s.addText(f, {
      x: 0.5, y: 3.75 + i * 0.3, w: 9.0, h: 0.27,
      fontSize: 10, color: i % 2 === 0 ? C.ink : C.slate, margin: 0,
    });
  });
}

// ════════════════════════════════════════════════════════════════
// SLIDE 6 — DOCUMENT REGISTER (live screenshot)
// ════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.ink };
  pn(s, 6);

  s.addText("Your full document library.\nSearchable. Filterable. Live.", {
    x: 0.5, y: 0.2, w: 5, h: 1.1,
    fontSize: 24, bold: true, color: C.white, margin: 0, lineSpacingMultiple: 1.15,
  });
  s.addText("Find any document in seconds. Filter by department, type, status, owner, or review date.\nClick any row to open the full document detail, upload files, and trigger workflow.", {
    x: 0.5, y: 1.4, w: 4.8, h: 0.8,
    fontSize: 10.5, color: "A0D4D2", margin: 0, lineSpacingMultiple: 1.4,
  });

  addScreenFrame(s, 5.0, 0.3, 4.75, 3.1, imgPath("05_doc_register"), "Document Register — 468 records, live");

  const callouts = [
    ["Document No.", "Auto-generated, structured, unique"],
    ["Live Status", "Approved / Draft / In Review at a glance"],
    ["Next Review", "In Date / Overdue flagged automatically"],
    ["Workflow Status", "Current stage visible on every row"],
  ];
  callouts.forEach((c, i) => {
    const y = 3.55 + i * 0.45;
    s.addShape(pres.shapes.RECTANGLE, {
      x: 0.5, y, w: 9.0, h: 0.38,
      fill: { color: i % 2 === 0 ? C.midPanel : C.brandDeep }, line: { color: C.brand, width: 0 },
    });
    s.addText(`• ${c[0]}`, { x: 0.65, y, w: 2.5, h: 0.38, fontSize: 10, bold: true, color: C.accent, valign: "middle", margin: 0 });
    s.addText(c[1], { x: 3.2, y, w: 6.2, h: 0.38, fontSize: 10, color: "C8F0EF", valign: "middle", margin: 0 });
  });
}

// ════════════════════════════════════════════════════════════════
// SLIDE 7 — AUTO PDF REPORTS
// ════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.darkPanel };
  pn(s, 7);

  s.addText("One click.\nInstant PDF report.", {
    x: 0.5, y: 0.25, w: 9, h: 1.2,
    fontSize: 34, bold: true, color: C.white, margin: 0, lineSpacingMultiple: 1.1,
  });
  s.addText("No more copying data into Word. No more waiting for someone to compile the monthly report.", {
    x: 0.5, y: 1.5, w: 9, h: 0.4,
    fontSize: 13, color: "A0D4D2", italic: true, margin: 0,
  });

  const reports = [
    ["📋", "NCR / CAPA Report", "Full nonconformance register with status, severity, root cause, actions, and closure rate. Auto-numbered, department-branded."],
    ["🔒", "PTW Report Pack", "Every Permit to Work as a formatted PDF — work description, hazards, precautions, signatures, and close-out status."],
    ["🔍", "Inspection Report", "Site inspection checklists converted to PDF — findings, pass/fail, evidence photos, linked corrective actions."],
    ["⚠️", "AINM Report", "Accident, Incident and Near Miss investigation packs — event details, investigation, root cause, and preventive actions."],
    ["📊", "Monthly HSEQ Pack", "Combined performance report — KPIs, trend charts, open actions, overdue items — all auto-populated from live data."],
    ["📄", "Document Register Report", "Full controlled document register as a PDF — status, revision, owner, review dates — for client or auditor submission."],
  ];

  const cols = 3;
  reports.forEach((r, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = 0.4 + col * 3.18;
    const y = 2.05 + row * 1.6;
    s.addShape(pres.shapes.RECTANGLE, {
      x, y, w: 3.0, h: 1.45,
      fill: { color: col % 2 === 0 ? C.midPanel : C.brandDeep }, line: { color: C.brand, width: 1 },
      shadow: cardShadow(),
    });
    s.addShape(pres.shapes.RECTANGLE, {
      x, y, w: 3.0, h: 0.07,
      fill: { color: C.accent }, line: { color: C.accent, width: 0 },
    });
    s.addText(r[0] + "  " + r[1], {
      x: x + 0.15, y: y + 0.12, w: 2.7, h: 0.35,
      fontSize: 10.5, bold: true, color: C.white, margin: 0,
    });
    s.addText(r[2], {
      x: x + 0.15, y: y + 0.5, w: 2.7, h: 0.88,
      fontSize: 9, color: "A0D4D2", margin: 0, wrap: true,
    });
  });

  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.4, y: 5.1, w: 9.2, h: 0.38,
    fill: { color: C.accent }, line: { color: C.accent, width: 0 },
  });
  s.addText("⚡  Reports are generated in seconds directly from live system data — no manual data entry, no errors, no delays.", {
    x: 0.55, y: 5.14, w: 9.0, h: 0.3,
    fontSize: 10, bold: true, color: C.ink, valign: "middle", margin: 0,
  });
}

// ════════════════════════════════════════════════════════════════
// SLIDE 8 — HSE MANAGEMENT
// ════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.offWhite };
  pn(s, 8);

  s.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 10, h: 0.5,
    fill: { color: C.brand }, line: { color: C.brand, width: 0 },
  });
  s.addText("HSE MANAGEMENT", {
    x: 0.4, y: 0, w: 9, h: 0.5,
    fontSize: 10, bold: true, color: C.white, valign: "middle", charSpacing: 4, margin: 0,
  });

  addScreenFrame(s, 0.3, 0.6, 4.5, 2.8, imgPath("03_hse"), "HSE Dashboard — live AINM, inspection, and action KPIs");
  addScreenFrame(s, 5.0, 0.6, 4.7, 2.8, imgPath("11_ainm"), "AINM — Accident, Incident & Near Miss register");

  const hsefeats = [
    ["🚨", "AINM", "Log accidents, incidents and near misses. Two-part investigation workflow with automatic report generation."],
    ["👁️", "Observations", "Positive and negative safety observations. Public submission link for field teams — no login needed."],
    ["🔒", "Permit to Work", "Digital PTW with 6-stage workflow — work type, description, precautions, issue, extensions, closure."],
    ["🔍", "Inspections", "6 live digital inspection forms — mobile-friendly, evidence upload, PDF output, register tracking."],
    ["📅", "HSE Calendar", "Recurring inspection planner — overdue items flagged, upcoming schedule visible."],
  ];
  hsefeats.forEach((f, i) => {
    const x = 0.3 + (i % 5) * 1.88;
    s.addShape(pres.shapes.RECTANGLE, {
      x, y: 3.58, w: 1.75, h: 1.55,
      fill: { color: C.white }, line: { color: "D1F2F0", width: 1 },
      shadow: cardShadow(),
    });
    s.addText(f[0], { x, y: 3.65, w: 1.75, h: 0.45, fontSize: 20, align: "center", margin: 0 });
    s.addText(f[1], { x, y: 4.1, w: 1.75, h: 0.28, fontSize: 9.5, bold: true, color: C.ink, align: "center", margin: 0 });
    s.addText(f[2], { x: x + 0.08, y: 4.38, w: 1.6, h: 0.7, fontSize: 8, color: C.muted, align: "center", margin: 0, wrap: true });
  });
}

// ════════════════════════════════════════════════════════════════
// SLIDE 9 — MOBILE & FIELD INSPECTIONS
// ════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.ink };
  pn(s, 9);

  s.addText("On the job.\nOn your phone.", {
    x: 0.5, y: 0.25, w: 5, h: 1.1,
    fontSize: 30, bold: true, color: C.white, margin: 0, lineSpacingMultiple: 1.1,
  });
  s.addText("No clipboards. No paper forms. No transcription errors.\nInspect on-site, enter findings in real time, upload photo evidence,\nand generate the PDF report before you leave the platform.", {
    x: 0.5, y: 1.45, w: 5.0, h: 0.85,
    fontSize: 10.5, color: "A0D4D2", margin: 0, lineSpacingMultiple: 1.4,
  });

  addScreenFrame(s, 5.4, 0.3, 4.3, 2.8, imgPath("10_inspections"), "HSE Inspections — 6 digital forms, mobile-ready");

  const mobilepts = [
    ["📱", "Mobile-Friendly Interface", "Touch-optimised controls for use on tablets and phones on-site. No pinching or zooming needed."],
    ["📸", "Evidence Photo Upload", "Capture and attach photos directly from your device camera — evidence linked to the specific finding."],
    ["📄", "Instant PDF Output", "Completed inspection auto-generates a branded, formatted PDF — ready for the client or file within seconds."],
    ["📋", "6 Live Forms", "Vessel Pre-Sail, Workplace (Office / Offshore / Base & Site / Mobilisation / Dropped Objects) — all digitised."],
    ["🔗", "Register Tracking", "Every inspection saved to the register — searchable, filterable, with open findings tracked to closure."],
    ["📡", "Public QR Observation Link", "Share a QR code for anonymous safety observations from the field — no login, instant submission."],
  ];
  mobilepts.forEach((m, i) => {
    const row = i % 3;
    const col = Math.floor(i / 3);
    const x = 0.4 + col * 2.5;
    const y = 2.45 + row * 1.05;
    s.addShape(pres.shapes.RECTANGLE, {
      x, y, w: 2.35, h: 0.92,
      fill: { color: C.midPanel }, line: { color: C.brand, width: 1 },
    });
    s.addText(m[0], { x: x + 0.08, y, w: 0.5, h: 0.92, fontSize: 18, valign: "middle", align: "center", margin: 0 });
    s.addText(m[1], { x: x + 0.6, y: y + 0.08, w: 1.65, h: 0.3, fontSize: 9, bold: true, color: C.accent, margin: 0 });
    s.addText(m[2], { x: x + 0.6, y: y + 0.38, w: 1.65, h: 0.48, fontSize: 8, color: "A0D4D2", margin: 0, wrap: true });
  });
}

// ════════════════════════════════════════════════════════════════
// SLIDE 10 — QR CODES
// ════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.darkPanel };
  pn(s, 10);

  s.addText("Functional QR Codes.\nInstant field access.", {
    x: 0.5, y: 0.3, w: 9, h: 1.1,
    fontSize: 30, bold: true, color: C.white, margin: 0, lineSpacingMultiple: 1.15,
  });

  const qruses = [
    ["🔗", "Public Safety Observation Link", "Post a QR code on-site or offshore. Workers scan and submit safety observations instantly — no login, no app download, no friction."],
    ["📋", "Asset Inspection Access", "QR code on each piece of equipment links directly to that asset's inspection form — one scan and the right form opens pre-populated."],
    ["🔒", "Permit to Work", "QR code on work areas links to the active PTW — supervisors scan to confirm controls in place before work starts."],
    ["📄", "Document Quick Access", "QR codes on physical equipment or notice boards link to the live controlled document — always the current revision, not a printed copy."],
  ];

  qruses.forEach((q, i) => {
    const y = 1.6 + i * 0.95;
    s.addShape(pres.shapes.RECTANGLE, {
      x: 0.5, y, w: 9.0, h: 0.82,
      fill: { color: i % 2 === 0 ? C.midPanel : C.brandDeep }, line: { color: C.brand, width: 0 },
    });
    s.addShape(pres.shapes.RECTANGLE, {
      x: 0.5, y, w: 0.07, h: 0.82,
      fill: { color: C.accent }, line: { color: C.accent, width: 0 },
    });
    s.addText(q[0], { x: 0.65, y, w: 0.6, h: 0.82, fontSize: 22, align: "center", valign: "middle", margin: 0 });
    s.addText(q[1], { x: 1.35, y: y + 0.08, w: 7.9, h: 0.3, fontSize: 11, bold: true, color: C.white, margin: 0 });
    s.addText(q[2], { x: 1.35, y: y + 0.42, w: 7.9, h: 0.36, fontSize: 9.5, color: "A0D4D2", margin: 0, wrap: true });
  });

  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.5, y: 5.4, w: 9.0, h: 0.08,
    fill: { color: C.accent }, line: { color: C.accent, width: 0 },
  });
}

// ════════════════════════════════════════════════════════════════
// SLIDE 11 — QUALITY MANAGEMENT
// ════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.offWhite };
  pn(s, 11);

  s.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 10, h: 0.5,
    fill: { color: C.brand }, line: { color: C.brand, width: 0 },
  });
  s.addText("QUALITY MANAGEMENT", {
    x: 0.4, y: 0, w: 9, h: 0.5,
    fontSize: 10, bold: true, color: C.white, valign: "middle", charSpacing: 4, margin: 0,
  });

  addScreenFrame(s, 0.3, 0.6, 4.5, 2.85, imgPath("06_ncr"), "NCR / CAPA Dashboard");
  addScreenFrame(s, 5.0, 0.6, 4.7, 2.85, imgPath("07_moc"), "Management of Change");

  const qfeats = [
    ["⚠️", "NCR / CAPA", "Log nonconformances, assign root cause, corrective and preventive actions. Track to closure with full audit trail."],
    ["🔄", "Management of Change", "Formal MOC process — temporary and permanent changes, impact assessment, approval routing, expiry tracking."],
    ["🔍", "Audits", "Internal and external audit programme, findings register, corrective actions, and programme status reporting."],
    ["📊", "Quality Dashboard", "Live KPIs — open NCRs, audit findings, MOC workload, overdue actions, closure rates — all in one view."],
  ];
  qfeats.forEach((f, i) => {
    const x = 0.3 + (i % 4) * 2.35;
    s.addShape(pres.shapes.RECTANGLE, {
      x, y: 3.62, w: 2.2, h: 1.55,
      fill: { color: C.white }, line: { color: "D1F2F0", width: 1 }, shadow: cardShadow(),
    });
    s.addShape(pres.shapes.RECTANGLE, {
      x, y: 3.62, w: 2.2, h: 0.06,
      fill: { color: C.brand }, line: { color: C.brand, width: 0 },
    });
    s.addText(f[0] + "  " + f[1], { x: x + 0.1, y: 3.72, w: 2.0, h: 0.34, fontSize: 10, bold: true, color: C.ink, margin: 0 });
    s.addText(f[2], { x: x + 0.1, y: 4.1, w: 2.0, h: 1.0, fontSize: 8.5, color: C.slate, margin: 0, wrap: true });
  });
}

// ════════════════════════════════════════════════════════════════
// SLIDE 12 — RISK MANAGEMENT
// ════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.ink };
  pn(s, 12);

  s.addText("Risk Management", {
    x: 0.5, y: 0.25, w: 9, h: 0.55,
    fontSize: 28, bold: true, color: C.white, margin: 0,
  });
  s.addText("Identify, assess, control and review risks — with a live register, rating matrix, and audit-ready reporting.", {
    x: 0.5, y: 0.85, w: 9, h: 0.35,
    fontSize: 12, color: "A0D4D2", margin: 0,
  });

  addScreenFrame(s, 0.3, 1.3, 4.8, 3.0, imgPath("08_risk"), "Risk Management Dashboard");

  const riskpts = [
    "Live risk register with inherent and residual ratings",
    "Controls register — document controls and track effectiveness",
    "Opportunities register — track improvement potential",
    "Formal review scheduling — overdue reviews flagged",
    "Risk by category, department, and rating dashboards",
    "One-click PDF risk register export for client/audit",
  ];
  riskpts.forEach((r, i) => {
    s.addShape(pres.shapes.RECTANGLE, {
      x: 5.3, y: 1.3 + i * 0.48, w: 4.4, h: 0.42,
      fill: { color: i % 2 === 0 ? C.midPanel : C.brandDeep }, line: { color: C.brand, width: 0 },
    });
    s.addShape(pres.shapes.OVAL, {
      x: 5.42, y: 1.38 + i * 0.48, w: 0.22, h: 0.22,
      fill: { color: C.accent }, line: { color: C.accent, width: 0 },
    });
    s.addText(r, {
      x: 5.7, y: 1.3 + i * 0.48, w: 3.9, h: 0.42,
      fontSize: 9.5, color: "C8F0EF", valign: "middle", margin: 0,
    });
  });
}

// ════════════════════════════════════════════════════════════════
// SLIDE 13 — ASSET MANAGEMENT
// ════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.offWhite };
  pn(s, 13);

  s.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 10, h: 0.5,
    fill: { color: C.brand }, line: { color: C.brand, width: 0 },
  });
  s.addText("ASSET MANAGEMENT", {
    x: 0.4, y: 0, w: 9, h: 0.5,
    fontSize: 10, bold: true, color: C.white, valign: "middle", charSpacing: 4, margin: 0,
  });

  addScreenFrame(s, 5.0, 0.6, 4.7, 3.2, imgPath("09_assets"), "Asset Dashboard — overdue attention board");

  s.addText("Never miss a calibration.\nNever miss an inspection.", {
    x: 0.4, y: 0.65, w: 4.4, h: 1.0,
    fontSize: 22, bold: true, color: C.ink, margin: 0, lineSpacingMultiple: 1.15,
  });
  s.addText("The Asset Dashboard flags overdue calibrations, inspections, and maintenance items the moment they fall due — no spreadsheet chasing needed.", {
    x: 0.4, y: 1.7, w: 4.4, h: 0.8,
    fontSize: 10.5, color: C.slate, margin: 0, lineSpacingMultiple: 1.35,
  });

  const astats = [["9", "Registered Assets"], ["3", "Inspections Overdue"], ["0", "Calibrations Overdue"], ["5", "Recent Activity Items"]];
  astats.forEach((st, i) => {
    addStat(s, 0.4 + i * 1.12, 2.65, 1.0, 0.75, st[0], st[1], i === 1 ? "D97706" : C.brand);
  });

  const afeats = [
    "Asset register with document ID codes for QR linking",
    "Calibration tracking — certificates, due dates, alerts",
    "Inspection scheduling and history per asset",
    "Maintenance work orders — planned and reactive",
    "Overdue Attention Board — all asset issues in one view",
    "Reports — calibration status, inspection compliance",
  ];
  afeats.forEach((f, i) => {
    s.addText(`• ${f}`, {
      x: 0.4, y: 3.55 + i * 0.33, w: 9.2, h: 0.3,
      fontSize: 10, color: i % 2 === 0 ? C.ink : C.slate, margin: 0,
    });
  });
}

// ════════════════════════════════════════════════════════════════
// SLIDE 14 — ACTION MANAGEMENT
// ════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.ink };
  pn(s, 14);

  s.addText("Every action. Tracked. Closed.", {
    x: 0.5, y: 0.25, w: 9, h: 0.58,
    fontSize: 28, bold: true, color: C.white, margin: 0,
  });
  s.addText("Actions from every module — Quality, HSE, Risk, Assets — flow into one central register.\nNothing slips through the cracks.", {
    x: 0.5, y: 0.88, w: 9, h: 0.5,
    fontSize: 11.5, color: "A0D4D2", margin: 0,
  });

  addScreenFrame(s, 0.3, 1.48, 4.8, 3.1, imgPath("13_actions"), "Action Intelligence Dashboard");

  const apts = [
    ["📊", "Intelligence Dashboard", "Actions by status, source, owner, due date pressure, and closure trend — all on one screen."],
    ["⭐", "My Actions", "Every user sees only their own actions — clear personal accountability without noise."],
    ["⚠️", "Overdue / Priority View", "'Overdue First' and 'Due This Week' smart views — know exactly what needs chasing."],
    ["📎", "Evidence Upload", "Attach photos, documents, or emails as proof of closure — evidence stored against the action forever."],
    ["🔗", "Cross-Module Linking", "Every action linked back to its source — NCR, MOC, audit finding, or inspection — full traceability."],
  ];
  apts.forEach((pt, i) => {
    const y = 1.48 + i * 0.62;
    s.addShape(pres.shapes.RECTANGLE, {
      x: 5.35, y, w: 4.35, h: 0.54,
      fill: { color: i % 2 === 0 ? C.midPanel : C.brandDeep }, line: { color: C.brand, width: 0 },
    });
    s.addText(pt[0], { x: 5.42, y, w: 0.5, h: 0.54, fontSize: 16, valign: "middle", align: "center", margin: 0 });
    s.addText(pt[1], { x: 5.98, y: y + 0.04, w: 3.6, h: 0.24, fontSize: 9.5, bold: true, color: C.accent, margin: 0 });
    s.addText(pt[2], { x: 5.98, y: y + 0.28, w: 3.6, h: 0.24, fontSize: 8.5, color: "A0D4D2", margin: 0 });
  });
}

// ════════════════════════════════════════════════════════════════
// SLIDE 15 — VS SERVER-BASED SYSTEMS
// ════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.darkPanel };
  pn(s, 15);

  s.addText("Why cloud beats server.", {
    x: 0.5, y: 0.25, w: 9, h: 0.55,
    fontSize: 28, bold: true, color: C.white, margin: 0,
  });
  s.addText("Server-based HSEQ systems were built for the office. Enshore IMS is built for the way you actually work.", {
    x: 0.5, y: 0.85, w: 9, h: 0.35,
    fontSize: 12, color: "A0D4D2", italic: true, margin: 0,
  });

  // Column headers
  s.addShape(pres.shapes.RECTANGLE, {
    x: 3.3, y: 1.35, w: 3.0, h: 0.42,
    fill: { color: C.muted }, line: { color: C.muted, width: 0 },
  });
  s.addText("Traditional Server System", {
    x: 3.3, y: 1.35, w: 3.0, h: 0.42,
    fontSize: 10, bold: true, color: C.white, align: "center", valign: "middle", margin: 0,
  });
  s.addShape(pres.shapes.RECTANGLE, {
    x: 6.5, y: 1.35, w: 3.3, h: 0.42,
    fill: { color: C.brand }, line: { color: C.brand, width: 0 },
  });
  s.addText("✅  Enshore IMS", {
    x: 6.5, y: 1.35, w: 3.3, h: 0.42,
    fontSize: 11, bold: true, color: C.white, align: "center", valign: "middle", margin: 0,
  });

  const compare = [
    ["Access", "Office only / VPN required", "Any device, anywhere, any time"],
    ["Mobile / Field", "Desktop browser only", "Full mobile-optimised interface"],
    ["Inspections", "Paper → manual data entry", "Digital, on-site, evidence upload"],
    ["Reports", "Hours to compile in Excel/Word", "One click — instant PDF output"],
    ["Notifications", "Manual email chasing", "Automatic at every workflow step"],
    ["Updates", "IT team, downtime risk", "Instant, zero downtime"],
    ["Disaster Recovery", "Server backup risk", "Cloud-hosted, always replicated"],
    ["Cost", "Hardware + licences + IT support", "Subscription, no infrastructure"],
  ];
  compare.forEach((row, i) => {
    const y = 1.88 + i * 0.44;
    const bg = i % 2 === 0 ? C.midPanel : C.brandDeep;
    s.addShape(pres.shapes.RECTANGLE, { x: 0.5, y, w: 2.7, h: 0.38, fill: { color: bg }, line: { color: C.brand, width: 0 } });
    s.addText(row[0], { x: 0.6, y, w: 2.5, h: 0.38, fontSize: 9.5, bold: true, color: C.accent, valign: "middle", margin: 0 });
    s.addShape(pres.shapes.RECTANGLE, { x: 3.3, y, w: 3.0, h: 0.38, fill: { color: bg }, line: { color: C.brand, width: 0 } });
    s.addText("✗  " + row[1], { x: 3.38, y, w: 2.85, h: 0.38, fontSize: 9, color: "F87171", valign: "middle", margin: 0 });
    s.addShape(pres.shapes.RECTANGLE, { x: 6.5, y, w: 3.3, h: 0.38, fill: { color: bg }, line: { color: C.brand, width: 0 } });
    s.addText("✓  " + row[2], { x: 6.58, y, w: 3.15, h: 0.38, fontSize: 9, color: C.accent, valign: "middle", margin: 0 });
  });
}

// ════════════════════════════════════════════════════════════════
// SLIDE 16 — ROLE-BASED ACCESS & SECURITY
// ════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.offWhite };
  pn(s, 16);

  s.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 10, h: 0.5,
    fill: { color: C.brand }, line: { color: C.brand, width: 0 },
  });
  s.addText("ROLE-BASED ACCESS & SECURITY", {
    x: 0.4, y: 0, w: 9, h: 0.5,
    fontSize: 10, bold: true, color: C.white, valign: "middle", charSpacing: 4, margin: 0,
  });

  s.addText("Right person. Right data.\nRight time.", {
    x: 0.5, y: 0.65, w: 9, h: 1.0,
    fontSize: 26, bold: true, color: C.ink, margin: 0, lineSpacingMultiple: 1.15,
  });
  s.addText("Role-based permissions ensure every user sees exactly what they need — nothing more.\nAdmin-configurable with per-module permission overrides.", {
    x: 0.5, y: 1.72, w: 9, h: 0.5,
    fontSize: 11, color: C.slate, margin: 0,
  });

  const roles = [
    { r: "Manager", m: "All modules, full access", c: C.brand },
    { r: "HSE Officer", m: "HSE + Actions", c: "0D9488" },
    { r: "Quality Engineer", m: "Quality + Documents + Actions", c: "0891B2" },
    { r: "Document Controller", m: "Documents + Actions", c: "7C3AED" },
    { r: "Asset Manager", m: "Assets + Actions", c: "D97706" },
    { r: "Viewer", m: "Read-only across all modules", c: C.muted },
  ];
  roles.forEach((role, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 0.5 + col * 3.1;
    const y = 2.4 + row * 1.3;
    s.addShape(pres.shapes.RECTANGLE, {
      x, y, w: 2.9, h: 1.1,
      fill: { color: C.white }, line: { color: "D1F2F0", width: 1 }, shadow: cardShadow(),
    });
    s.addShape(pres.shapes.RECTANGLE, {
      x, y, w: 0.08, h: 1.1,
      fill: { color: role.c }, line: { color: role.c, width: 0 },
    });
    s.addText(role.r, { x: x + 0.18, y: y + 0.12, w: 2.6, h: 0.36, fontSize: 12, bold: true, color: C.ink, margin: 0 });
    s.addText(role.m, { x: x + 0.18, y: y + 0.52, w: 2.6, h: 0.5, fontSize: 9.5, color: C.slate, margin: 0, wrap: true });
  });
}

// ════════════════════════════════════════════════════════════════
// SLIDE 17 — PEOPLE & NOTIFICATIONS
// ════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.ink };
  pn(s, 17);

  s.addText("Automated workflows.\nZero chasing.", {
    x: 0.5, y: 0.25, w: 5.2, h: 1.1,
    fontSize: 28, bold: true, color: C.white, margin: 0, lineSpacingMultiple: 1.1,
  });
  s.addText("Email notifications fire automatically at every workflow step — document reviews, approvals, action assignments, and overdue alerts. Your team always knows what needs their attention.", {
    x: 0.5, y: 1.45, w: 5.0, h: 0.85,
    fontSize: 10.5, color: "A0D4D2", margin: 0, lineSpacingMultiple: 1.4,
  });

  addScreenFrame(s, 5.5, 0.3, 4.3, 2.8, imgPath("14_people"), "People Management — shared directory");

  const notifs = [
    ["📧", "Document submitted for review", "Reviewer receives email with direct link to the document."],
    ["📧", "Document approved", "Originator notified when their document goes Live."],
    ["📧", "Action assigned", "Owner receives immediate notification with due date."],
    ["📧", "Overdue action alert", "Automatic reminders for actions past their due date."],
    ["📧", "AINM investigation due", "Investigator notified when Part 1 or Part 2 is overdue."],
  ];
  notifs.forEach((n, i) => {
    const y = 3.28 + i * 0.44;
    s.addShape(pres.shapes.RECTANGLE, {
      x: 0.5, y, w: 9.0, h: 0.38,
      fill: { color: i % 2 === 0 ? C.midPanel : C.brandDeep }, line: { color: C.brand, width: 0 },
    });
    s.addText(n[0], { x: 0.62, y, w: 0.45, h: 0.38, fontSize: 14, valign: "middle", align: "center", margin: 0 });
    s.addText(n[1], { x: 1.18, y, w: 3.6, h: 0.38, fontSize: 9.5, bold: true, color: C.white, valign: "middle", margin: 0 });
    s.addText(n[2], { x: 4.85, y, w: 4.5, h: 0.38, fontSize: 9, color: "A0D4D2", valign: "middle", margin: 0 });
  });
}

// ════════════════════════════════════════════════════════════════
// SLIDE 18 — KEY METRICS / VALUE SUMMARY
// ════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.brandDeep };
  pn(s, 18);

  s.addText("What the system delivers today.", {
    x: 0.5, y: 0.25, w: 9, h: 0.55,
    fontSize: 28, bold: true, color: C.white, margin: 0,
  });

  const metrics = [
    ["468", "Controlled\nDocuments"],
    ["6", "Live Digital\nInspection Forms"],
    ["7", "Integrated\nModules"],
    ["100%", "Cloud-Hosted\nAlways On"],
    ["1-click", "PDF Report\nGeneration"],
    ["Auto", "Email Workflow\nNotifications"],
    ["QR", "Field-Ready\nAccess"],
    ["Mobile", "On-Site\nCapture"],
  ];

  metrics.forEach((m, i) => {
    const col = i % 4;
    const row = Math.floor(i / 4);
    const x = 0.4 + col * 2.3;
    const y = 1.1 + row * 2.0;
    s.addShape(pres.shapes.RECTANGLE, {
      x, y, w: 2.15, h: 1.7,
      fill: { color: row === 0 ? C.brand : C.midPanel }, line: { color: C.accent, width: 1 },
      shadow: makeShadow(),
    });
    s.addText(m[0], {
      x, y: y + 0.2, w: 2.15, h: 0.85,
      fontSize: 30, bold: true, color: C.white, align: "center", margin: 0,
    });
    s.addText(m[1], {
      x, y: y + 1.0, w: 2.15, h: 0.55,
      fontSize: 9.5, color: C.lightTeal, align: "center", margin: 0, wrap: true,
    });
  });
}

// ════════════════════════════════════════════════════════════════
// SLIDE 19 — IMPLEMENTATION & GETTING STARTED
// ════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.offWhite };
  pn(s, 19);

  s.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 10, h: 0.5,
    fill: { color: C.brand }, line: { color: C.brand, width: 0 },
  });
  s.addText("GETTING STARTED", {
    x: 0.4, y: 0, w: 9, h: 0.5,
    fontSize: 10, bold: true, color: C.white, valign: "middle", charSpacing: 4, margin: 0,
  });

  s.addText("Up and running in days, not months.", {
    x: 0.5, y: 0.65, w: 9, h: 0.55,
    fontSize: 24, bold: true, color: C.ink, margin: 0,
  });
  s.addText("No servers to procure. No software to install. No IT project to manage.\nUsers access the system via browser — desktop, tablet, or phone.", {
    x: 0.5, y: 1.25, w: 9, h: 0.5,
    fontSize: 11, color: C.slate, margin: 0,
  });

  const steps = [
    { n: "1", t: "User Setup", d: "Admin creates user accounts and assigns roles. People records added for workflow notifications." },
    { n: "2", t: "Reference Data", d: "Departments, document types, inspection forms, and asset categories configured in Admin / Settings." },
    { n: "3", t: "Document Import", d: "Existing documents imported into the register. Review dates and owners assigned." },
    { n: "4", t: "Team Training", d: "Module walkthroughs for each role group. Most users are confident within a single session." },
    { n: "5", t: "Go Live", d: "System goes live. All workflows, notifications, and dashboards active from day one." },
  ];
  steps.forEach((st, i) => {
    const y = 1.9 + i * 0.7;
    s.addShape(pres.shapes.RECTANGLE, {
      x: 0.5, y, w: 9.0, h: 0.62,
      fill: { color: i % 2 === 0 ? C.white : C.lightTeal }, line: { color: "D1F2F0", width: 1 },
    });
    s.addShape(pres.shapes.OVAL, {
      x: 0.6, y: y + 0.1, w: 0.42, h: 0.42,
      fill: { color: C.brand }, line: { color: C.brand, width: 0 },
    });
    s.addText(st.n, { x: 0.6, y: y + 0.1, w: 0.42, h: 0.42, fontSize: 13, bold: true, color: C.white, align: "center", valign: "middle", margin: 0 });
    s.addText(st.t, { x: 1.18, y: y + 0.08, w: 2.2, h: 0.28, fontSize: 11, bold: true, color: C.ink, margin: 0 });
    s.addText(st.d, { x: 1.18, y: y + 0.35, w: 8.15, h: 0.25, fontSize: 9.5, color: C.slate, margin: 0 });
  });
}

// ════════════════════════════════════════════════════════════════
// SLIDE 20 — CLOSING CTA
// ════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.ink };

  // Teal block on right
  s.addShape(pres.shapes.RECTANGLE, {
    x: 5.5, y: 0, w: 4.5, h: 5.625,
    fill: { color: C.brand }, line: { color: C.brand, width: 0 },
  });

  // Home screenshot in teal block
  s.addImage({ path: imgPath("01_home"), x: 5.55, y: 0.4, w: 4.3, h: 2.7, transparency: 30 });
  s.addShape(pres.shapes.RECTANGLE, {
    x: 5.55, y: 0.4, w: 4.3, h: 2.7,
    fill: { color: C.brand, transparency: 45 }, line: { color: C.white, width: 1 },
  });

  s.addText("ENSHORE SUBSEA", {
    x: 0.6, y: 0.5, w: 4.5, h: 0.4,
    fontSize: 10, bold: true, color: C.accent, charSpacing: 6, margin: 0,
  });
  s.addText("One system.\nEvery module.\nTotal control.", {
    x: 0.6, y: 1.0, w: 4.7, h: 1.7,
    fontSize: 26, bold: true, color: C.white, margin: 0, lineSpacingMultiple: 1.15,
  });

  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.6, y: 2.85, w: 1.2, h: 0.07,
    fill: { color: C.accent }, line: { color: C.accent, width: 0 },
  });

  s.addText("Live dashboards  ·  Auto PDF reports  ·  Mobile inspections\nQR code access  ·  Email workflows  ·  Role-based security", {
    x: 0.6, y: 3.05, w: 4.6, h: 0.75,
    fontSize: 10.5, color: "A0D4D2", margin: 0, lineSpacingMultiple: 1.5,
  });

  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.6, y: 3.92, w: 2.8, h: 0.5,
    fill: { color: C.accent }, line: { color: C.accent, width: 0 },
  });
  s.addText("Request a Live Demo", {
    x: 0.6, y: 3.92, w: 2.8, h: 0.5,
    fontSize: 12, bold: true, color: C.ink, align: "center", valign: "middle", margin: 0,
  });

  s.addText("jbeaton@enshoresubsea.com", {
    x: 0.6, y: 4.55, w: 4.5, h: 0.35,
    fontSize: 11, color: "6B9E9D", margin: 0,
  });
  s.addText("Built by Enshore Subsea  ·  Hosted on Vercel  ·  Powered by Supabase", {
    x: 0.6, y: 5.15, w: 4.5, h: 0.28,
    fontSize: 8, color: C.muted, margin: 0,
  });

  // Right panel text
  s.addText("Quality · HSE · Documents\nRisk · Assets · Actions", {
    x: 5.55, y: 3.3, w: 4.35, h: 0.8,
    fontSize: 14, bold: true, color: C.white, align: "center", margin: 0, lineSpacingMultiple: 1.4,
  });
  s.addText("One platform built for subsea operations.", {
    x: 5.55, y: 4.2, w: 4.35, h: 0.4,
    fontSize: 10, color: C.lightTeal, align: "center", italic: true, margin: 0,
  });
  s.addText("enshore-ims.vercel.app", {
    x: 5.55, y: 4.75, w: 4.35, h: 0.35,
    fontSize: 11, bold: true, color: C.white, align: "center", margin: 0,
  });
}

// ─── WRITE ────────────────────────────────────────────────────
pres.writeFile({ fileName: "C:\\Users\\JBeaton\\asset-quality-webapp\\Enshore_IMS_Sales_Deck.pptx" })
  .then(() => console.log("✅  Saved: Enshore_IMS_Sales_Deck.pptx"))
  .catch(err => console.error("❌", err));
