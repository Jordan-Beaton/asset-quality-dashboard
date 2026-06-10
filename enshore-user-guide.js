const pptxgen = require("pptxgenjs");

const pres = new pptxgen();
pres.layout = "LAYOUT_16x9";
pres.author = "Enshore Subsea";
pres.title = "Enshore IMS – User Guide";

// ─── BRAND PALETTE ───────────────────────────────────────────────
const C = {
  brand:     "3A9B98",
  brandDark: "2F7F7D",
  brandDeep: "1E5E5C",
  white:     "FFFFFF",
  offWhite:  "F1F5F9",
  ink:       "0F172A",
  muted:     "64748B",
  slate:     "475569",
  border:    "DBE3EF",
  cardBg:    "FFFFFF",
  lightTeal: "EEF8F7",
  accent:    "02C39A",
};

const makeShadow = () => ({ type: "outer", color: "000000", blur: 8, offset: 2, angle: 135, opacity: 0.10 });

// ─── HELPERS ─────────────────────────────────────────────────────
function addSlideBackground(slide, color) {
  slide.background = { color: color || C.offWhite };
}

function addPageNumber(slide, num, total) {
  slide.addText(`${num} / ${total}`, {
    x: 8.8, y: 5.2, w: 1, h: 0.3,
    fontSize: 9, color: C.muted, align: "right", margin: 0,
  });
}

function addBrandBar(slide, text) {
  // Left teal accent bar
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 10, h: 0.45,
    fill: { color: C.brand }, line: { color: C.brand, width: 0 },
  });
  slide.addText("ENSHORE IMS", {
    x: 0.25, y: 0, w: 4, h: 0.45,
    fontSize: 9, color: C.white, bold: true, valign: "middle", margin: 0, charSpacing: 3,
  });
  if (text) {
    slide.addText(text, {
      x: 5, y: 0, w: 4.75, h: 0.45,
      fontSize: 9, color: "C8F0EF", align: "right", valign: "middle", margin: 0,
    });
  }
}

function sectionIcon(slide, emoji, x, y, size) {
  // Teal circle background
  slide.addShape(pres.shapes.OVAL, {
    x: x, y: y, w: size, h: size,
    fill: { color: C.brand }, line: { color: C.brand, width: 0 },
  });
  slide.addText(emoji, {
    x: x, y: y, w: size, h: size,
    fontSize: size * 18, align: "center", valign: "middle", margin: 0,
  });
}

function addCard(slide, x, y, w, h, title, body, iconEmoji) {
  slide.addShape(pres.shapes.RECTANGLE, {
    x, y, w, h,
    fill: { color: C.white },
    line: { color: C.border, width: 1 },
    shadow: makeShadow(),
  });
  // Top teal accent
  slide.addShape(pres.shapes.RECTANGLE, {
    x, y, w, h: 0.05,
    fill: { color: C.brand }, line: { color: C.brand, width: 0 },
  });
  if (iconEmoji) {
    slide.addText(iconEmoji, {
      x: x + 0.15, y: y + 0.12, w: 0.4, h: 0.4,
      fontSize: 16, align: "center", valign: "middle", margin: 0,
    });
  }
  slide.addText(title, {
    x: x + (iconEmoji ? 0.55 : 0.18), y: y + 0.1, w: w - (iconEmoji ? 0.7 : 0.3), h: 0.35,
    fontSize: 11, bold: true, color: C.ink, valign: "middle", margin: 0,
  });
  slide.addText(body, {
    x: x + 0.18, y: y + 0.5, w: w - 0.36, h: h - 0.65,
    fontSize: 9.5, color: C.slate, valign: "top", margin: 0, wrap: true,
  });
}

const TOTAL = 22;

// ════════════════════════════════════════════════════════════════
// SLIDE 1 — COVER
// ════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.brandDeep };

  // Large teal circle decoration
  s.addShape(pres.shapes.OVAL, {
    x: 6.5, y: -1.5, w: 6, h: 6,
    fill: { color: C.brand, transparency: 75 }, line: { color: C.brand, width: 0 },
  });
  s.addShape(pres.shapes.OVAL, {
    x: 7.5, y: 2.5, w: 3.5, h: 3.5,
    fill: { color: C.accent, transparency: 85 }, line: { color: C.accent, width: 0 },
  });

  s.addText("ENSHORE SUBSEA", {
    x: 0.6, y: 0.7, w: 8, h: 0.45,
    fontSize: 11, color: "C8F0EF", bold: true, charSpacing: 5, margin: 0,
  });
  s.addText("Integrated Management System", {
    x: 0.6, y: 1.25, w: 8, h: 1.0,
    fontSize: 38, color: C.white, bold: true, margin: 0,
  });
  s.addText("User Guide", {
    x: 0.6, y: 2.35, w: 8, h: 0.7,
    fontSize: 28, color: "C8F0EF", margin: 0,
  });

  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.6, y: 3.15, w: 1.2, h: 0.06,
    fill: { color: C.accent }, line: { color: C.accent, width: 0 },
  });

  s.addText("Complete guide to Quality, HSE, Document Control, Risk, Assets, and more", {
    x: 0.6, y: 3.35, w: 7.5, h: 0.6,
    fontSize: 13, color: "A8D8D7", italic: true, margin: 0,
  });
  s.addText("Version 1.0  ·  2026", {
    x: 0.6, y: 5.1, w: 4, h: 0.35,
    fontSize: 10, color: "6B9E9D", margin: 0,
  });
}

// ════════════════════════════════════════════════════════════════
// SLIDE 2 — TABLE OF CONTENTS
// ════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  addSlideBackground(s);
  addBrandBar(s, "Table of Contents");
  addPageNumber(s, 2, TOTAL);

  s.addText("What's Inside", {
    x: 0.5, y: 0.6, w: 9, h: 0.55,
    fontSize: 26, bold: true, color: C.ink, margin: 0,
  });

  const items = [
    ["01", "Getting Started", "Login, navigation, and the home dashboard"],
    ["02", "Quality Management", "Dashboard, MOC, NCR/CAPA, Audits, Actions"],
    ["03", "Document Control", "Register, create, workflow, archive"],
    ["04", "HSE Management", "AINM, Observations, Inspections, PTW, Calendar"],
    ["05", "Risk Management", "Risk register, controls, opportunities, reviews"],
    ["06", "Asset Management", "Assets, calibration, inspection, maintenance"],
    ["07", "People Management", "People directory and roles"],
    ["08", "Admin / Settings", "Departments, users, reference data, system config"],
    ["09", "Action Management", "Cross-module action tracking and follow-up"],
  ];

  const colW = 4.4;
  items.forEach((item, i) => {
    const col = i < 5 ? 0 : 1;
    const row = i < 5 ? i : i - 5;
    const x = 0.5 + col * 4.8;
    const y = 1.35 + row * 0.73;

    s.addShape(pres.shapes.RECTANGLE, {
      x, y, w: colW, h: 0.58,
      fill: { color: i % 2 === 0 ? C.white : C.lightTeal },
      line: { color: C.border, width: 1 },
    });
    s.addText(item[0], {
      x: x + 0.1, y, w: 0.45, h: 0.58,
      fontSize: 14, bold: true, color: C.brand, valign: "middle", align: "center", margin: 0,
    });
    s.addShape(pres.shapes.RECTANGLE, {
      x: x + 0.55, y: y + 0.12, w: 0.03, h: 0.34,
      fill: { color: C.brand }, line: { color: C.brand, width: 0 },
    });
    s.addText(item[1], {
      x: x + 0.65, y, w: colW - 0.75, h: 0.3,
      fontSize: 10, bold: true, color: C.ink, valign: "bottom", margin: 0,
    });
    s.addText(item[2], {
      x: x + 0.65, y: y + 0.29, w: colW - 0.75, h: 0.29,
      fontSize: 8, color: C.muted, valign: "top", margin: 0,
    });
  });
}

// ════════════════════════════════════════════════════════════════
// SLIDE 3 — GETTING STARTED: LOGIN + NAVIGATION
// ════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  addSlideBackground(s);
  addBrandBar(s, "Getting Started");
  addPageNumber(s, 3, TOTAL);

  s.addText("Getting Started", {
    x: 0.5, y: 0.58, w: 9, h: 0.5,
    fontSize: 24, bold: true, color: C.ink, margin: 0,
  });
  s.addText("Login, navigation and finding your way around the system", {
    x: 0.5, y: 1.05, w: 9, h: 0.35,
    fontSize: 12, color: C.muted, margin: 0,
  });

  // Login card
  addCard(s, 0.5, 1.5, 2.9, 1.5, "🔐  Logging In",
    "Navigate to your Enshore IMS URL and sign in with your company email and password. Your role and module access are configured by your System Administrator.",
    null);

  // Home dashboard card
  addCard(s, 3.55, 1.5, 2.9, 1.5, "🏠  Home Dashboard",
    "After login you land on the Home Dashboard — a summary of outstanding actions, recent activity, and quick-links to every module you have access to.",
    null);

  // Navigation card
  addCard(s, 6.6, 1.5, 2.9, 1.5, "🧭  Navigation Rail",
    "The icon rail on the left-hand side switches between modules. The active module is highlighted in teal. The header shows which module you are in.",
    null);

  // Role access card
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.5, y: 3.15, w: 9.0, h: 1.4,
    fill: { color: C.lightTeal }, line: { color: C.brandDark, width: 1 },
  });
  s.addText("👥  Roles & Access Control", {
    x: 0.7, y: 3.25, w: 8.6, h: 0.35,
    fontSize: 11, bold: true, color: C.brandDark, margin: 0,
  });
  const roles = [
    ["Manager", "Full access to all modules"],
    ["Quality Engineer", "Quality, Documents, Actions"],
    ["HSE Officer", "HSE, Actions"],
    ["Document Controller", "Documents, Actions"],
    ["Asset Manager", "Assets, Actions"],
    ["Viewer", "Read-only access"],
  ];
  roles.forEach((r, i) => {
    const x = 0.7 + (i % 3) * 3.0;
    const y = 3.65 + Math.floor(i / 3) * 0.35;
    s.addText(`• ${r[0]}: `, { x, y, w: 1.5, h: 0.28, fontSize: 9, bold: true, color: C.brandDark, margin: 0 });
    s.addText(r[1], { x: x + 1.4, y, w: 1.5, h: 0.28, fontSize: 9, color: C.slate, margin: 0 });
  });
}

// ════════════════════════════════════════════════════════════════
// SLIDE 4 — QUALITY MANAGEMENT OVERVIEW
// ════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  addSlideBackground(s);
  addBrandBar(s, "Quality Management");
  addPageNumber(s, 4, TOTAL);

  s.addText("Quality Management", {
    x: 0.5, y: 0.58, w: 9, h: 0.5,
    fontSize: 24, bold: true, color: C.ink, margin: 0,
  });
  s.addText("Central hub for quality performance — dashboard, nonconformances, changes, and audits", {
    x: 0.5, y: 1.05, w: 9, h: 0.35,
    fontSize: 12, color: C.muted, margin: 0,
  });

  const modules = [
    ["📊", "Quality Dashboard", "KPI cards, charts, and summary views. Year filter lets you compare periods at a glance."],
    ["🔄", "Management of Change (MOC)", "Raise, track and close changes to systems, processes or equipment. Supports impact assessment and approval routing."],
    ["⚠️", "NCR / CAPA", "Log nonconformances and corrective actions. Tracks root cause, containment, corrective and preventive actions through to closure."],
    ["🔍", "Audits", "Schedule internal and external audits, record findings, assign corrective actions, and track closure. Reports summarise audit performance."],
    ["✅", "Actions", "Quality-specific actions linked to MOC, NCR/CAPA, and audits. Priority, due date, owner, and evidence tracking."],
    ["📈", "Reports", "Export and view quality performance trends, open items and closure rates."],
  ];

  const cols = 3;
  modules.forEach((m, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = 0.5 + col * 3.12;
    const y = 1.55 + row * 1.9;
    addCard(s, x, y, 2.98, 1.75, `${m[0]}  ${m[1]}`, m[2], null);
  });
}

// ════════════════════════════════════════════════════════════════
// SLIDE 5 — NCR / CAPA DETAIL
// ════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  addSlideBackground(s);
  addBrandBar(s, "Quality Management · NCR / CAPA");
  addPageNumber(s, 5, TOTAL);

  s.addText("NCR / CAPA — How It Works", {
    x: 0.5, y: 0.58, w: 9, h: 0.5,
    fontSize: 24, bold: true, color: C.ink, margin: 0,
  });

  // Workflow steps
  const steps = [
    ["1", "Create NCR", "Log the nonconformance with title, description, category, source, department, and severity."],
    ["2", "Assign & Investigate", "Assign an owner. Add root cause analysis and containment actions."],
    ["3", "Corrective Action", "Define and assign CAPA. Set due dates and link evidence files."],
    ["4", "Review & Close", "Reviewer confirms action effectiveness. NCR is closed with closure notes."],
    ["5", "Reports", "Dashboard shows open vs closed trend, NCR source breakdown, and overdue items."],
  ];

  steps.forEach((step, i) => {
    const y = 1.2 + i * 0.83;
    // Number circle
    s.addShape(pres.shapes.OVAL, {
      x: 0.5, y: y + 0.05, w: 0.48, h: 0.48,
      fill: { color: C.brand }, line: { color: C.brand, width: 0 },
    });
    s.addText(step[0], {
      x: 0.5, y: y + 0.05, w: 0.48, h: 0.48,
      fontSize: 14, bold: true, color: C.white, align: "center", valign: "middle", margin: 0,
    });
    // Connector line (not on last)
    if (i < steps.length - 1) {
      s.addShape(pres.shapes.RECTANGLE, {
        x: 0.71, y: y + 0.54, w: 0.06, h: 0.33,
        fill: { color: C.border }, line: { color: C.border, width: 0 },
      });
    }
    s.addText(step[1], {
      x: 1.15, y: y + 0.04, w: 3.5, h: 0.3,
      fontSize: 11, bold: true, color: C.ink, margin: 0,
    });
    s.addText(step[2], {
      x: 1.15, y: y + 0.33, w: 8.3, h: 0.4,
      fontSize: 9.5, color: C.slate, margin: 0, wrap: true,
    });
  });

  // Tab list
  s.addShape(pres.shapes.RECTANGLE, {
    x: 5.2, y: 1.1, w: 4.3, h: 3.5,
    fill: { color: C.lightTeal }, line: { color: C.brandDark, width: 1 },
  });
  s.addText("Tabs in NCR / CAPA", {
    x: 5.4, y: 1.2, w: 3.8, h: 0.35,
    fontSize: 11, bold: true, color: C.brandDark, margin: 0,
  });
  const tabs = ["Dashboard", "NCR Register", "Create NCR", "Import", "Reports"];
  tabs.forEach((tab, i) => {
    s.addText(`→  ${tab}`, {
      x: 5.4, y: 1.65 + i * 0.5, w: 3.8, h: 0.4,
      fontSize: 10, color: C.ink, margin: 0,
    });
  });
}

// ════════════════════════════════════════════════════════════════
// SLIDE 6 — MOC DETAIL
// ════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  addSlideBackground(s);
  addBrandBar(s, "Quality Management · Management of Change");
  addPageNumber(s, 6, TOTAL);

  s.addText("Management of Change (MOC)", {
    x: 0.5, y: 0.58, w: 9, h: 0.5,
    fontSize: 24, bold: true, color: C.ink, margin: 0,
  });
  s.addText("Control and track all changes to systems, processes, and equipment", {
    x: 0.5, y: 1.05, w: 9, h: 0.35,
    fontSize: 12, color: C.muted, margin: 0,
  });

  addCard(s, 0.5, 1.5, 4.4, 1.5, "📝  Raising a Change",
    "Navigate to MOC and click Create MOC. Enter the change title, description, change type, department, and risk level. Assign an owner and set a target completion date.", null);

  addCard(s, 5.1, 1.5, 4.4, 1.5, "👥  Impact Assessment",
    "Complete the impact assessment fields — identify affected systems, documents, people, and training requirements. This ensures downstream impacts are captured before approval.", null);

  addCard(s, 0.5, 3.2, 4.4, 1.5, "✅  Approval & Closure",
    "MOC routes for review and approval. Once approved and implemented, the change is closed with implementation evidence. The status banner shows current stage at all times.", null);

  addCard(s, 5.1, 3.2, 4.4, 1.5, "📊  MOC Register & Reports",
    "The MOC register shows all changes with status, owner, and dates. Filter by type, department, or status. Reports track open changes, overdue items, and closure trends.", null);
}

// ════════════════════════════════════════════════════════════════
// SLIDE 7 — DOCUMENT CONTROL
// ════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  addSlideBackground(s);
  addBrandBar(s, "Document Control");
  addPageNumber(s, 7, TOTAL);

  s.addText("Document Control", {
    x: 0.5, y: 0.58, w: 9, h: 0.5,
    fontSize: 24, bold: true, color: C.ink, margin: 0,
  });
  s.addText("Controlled documents, certification, reviews, approvals, and revision history", {
    x: 0.5, y: 1.05, w: 9, h: 0.35,
    fontSize: 12, color: C.muted, margin: 0,
  });

  const tabs = [
    ["📊", "Dashboard", "KPI overview — total documents, Live vs Draft counts, overdue reviews, recent activity, and upcoming review calendar."],
    ["📋", "Document Register", "Searchable and filterable full register of all controlled documents. Click any row to open the detail panel. Filter by type, department, status, or review date."],
    ["➕", "Create New Document", "Fill in Document Details, Review Settings, Originator and Notes. Document number is auto-generated. Click 'Create Draft Document →' to save."],
    ["🔄", "Workflow", "Review Queue and Approval Queue in one place. Reviewers and approvers act on documents assigned to them. Status tracks through Draft → Review → Approval → Live."],
    ["🗄️", "Archive", "Superseded and archived documents. Documents moved here remain accessible for reference but are no longer considered Live."],
    ["📈", "Reports", "Document performance reporting — review cycle compliance, overdue documents, document type distribution, and department coverage."],
  ];

  const cols = 3;
  tabs.forEach((t, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = 0.5 + col * 3.12;
    const y = 1.5 + row * 1.95;
    addCard(s, x, y, 2.98, 1.8, `${t[0]}  ${t[1]}`, t[2], null);
  });
}

// ════════════════════════════════════════════════════════════════
// SLIDE 8 — DOCUMENT WORKFLOW JOURNEY
// ════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  addSlideBackground(s);
  addBrandBar(s, "Document Control · Workflow");
  addPageNumber(s, 8, TOTAL);

  s.addText("Document Lifecycle", {
    x: 0.5, y: 0.58, w: 9, h: 0.5,
    fontSize: 24, bold: true, color: C.ink, margin: 0,
  });
  s.addText("How a document moves from creation to Live status", {
    x: 0.5, y: 1.05, w: 9, h: 0.35,
    fontSize: 12, color: C.muted, margin: 0,
  });

  const stages = [
    { label: "Draft", color: C.muted, desc: "Document created. Originator fills in details. File can be uploaded via Document Register." },
    { label: "In Review", color: "2563EB", desc: "Submitted for review. Assigned Reviewer receives email notification and acts via the Workflow tab." },
    { label: "Pending\nApproval", color: "7C3AED", desc: "Review complete. Assigned Approver receives email notification and approves or rejects." },
    { label: "Live", color: C.brandDark, desc: "Approved and published. Document is now the current controlled version." },
    { label: "Archived", color: "78716C", desc: "Superseded by a new revision or manually archived. Remains accessible for reference." },
  ];

  stages.forEach((st, i) => {
    const x = 0.5 + i * 1.85;
    // Stage box
    s.addShape(pres.shapes.RECTANGLE, {
      x, y: 1.55, w: 1.65, h: 0.65,
      fill: { color: st.color }, line: { color: st.color, width: 0 },
    });
    s.addText(st.label, {
      x, y: 1.55, w: 1.65, h: 0.65,
      fontSize: 11, bold: true, color: C.white, align: "center", valign: "middle", margin: 0,
    });
    // Arrow (not on last)
    if (i < stages.length - 1) {
      s.addShape(pres.shapes.RECTANGLE, {
        x: x + 1.65, y: 1.78, w: 0.2, h: 0.18,
        fill: { color: C.border }, line: { color: C.border, width: 0 },
      });
    }
    // Description
    s.addText(st.desc, {
      x, y: 2.35, w: 1.65, h: 2.8,
      fontSize: 9, color: C.slate, align: "left", valign: "top", margin: 0, wrap: true,
    });
  });

  // Tip box
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.5, y: 5.0, w: 9.0, h: 0.45,
    fill: { color: C.lightTeal }, line: { color: C.brand, width: 1 },
  });
  s.addText("💡  Tip: Email notifications are sent automatically at each workflow step. No manual chasing needed — the system does it for you.", {
    x: 0.65, y: 5.05, w: 8.7, h: 0.35,
    fontSize: 9.5, color: C.brandDark, margin: 0,
  });
}

// ════════════════════════════════════════════════════════════════
// SLIDE 9 — HSE MANAGEMENT
// ════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  addSlideBackground(s);
  addBrandBar(s, "HSE Management");
  addPageNumber(s, 9, TOTAL);

  s.addText("HSE Management", {
    x: 0.5, y: 0.58, w: 9, h: 0.5,
    fontSize: 24, bold: true, color: C.ink, margin: 0,
  });
  s.addText("Health, Safety and Environment — incidents, observations, inspections, PTW, and calendar", {
    x: 0.5, y: 1.05, w: 9, h: 0.35,
    fontSize: 12, color: C.muted, margin: 0,
  });

  const modules = [
    ["📊", "HSE Dashboard", "Live KPIs: AINM split, inspection status, action pressure, calendar pressure, and HSE action load by person."],
    ["📅", "HSE Calendar", "Plan and track recurring HSE inspections and events. Overdue and upcoming items flagged automatically."],
    ["🚨", "AINM", "Accident, Incident and Near Miss register. Log events, assign investigation, track closure, and report trends."],
    ["👁️", "Observations", "Log safety observations (positive and negative). Assign follow-up actions and track resolution."],
    ["🔒", "Permit to Work (PTW)", "Issue, manage and close permits to work. Ensures hazard controls are in place before work begins."],
    ["🔍", "Inspections", "Schedule and record HSE inspections. Field inspection mode available on mobile. Log findings and corrective actions."],
    ["✅", "HSE Actions", "All HSE-originated actions in one register. Priority, owner, due date, and evidence upload."],
    ["📈", "Reports", "HSE performance reports — incident trends, inspection rates, action closure, and RIDDOR-style summaries."],
  ];

  const cols = 4;
  modules.forEach((m, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = 0.5 + col * 2.35;
    const y = 1.5 + row * 1.95;
    addCard(s, x, y, 2.22, 1.8, `${m[0]}  ${m[1]}`, m[2], null);
  });
}

// ════════════════════════════════════════════════════════════════
// SLIDE 10 — HSE: AINM & OBSERVATIONS
// ════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  addSlideBackground(s);
  addBrandBar(s, "HSE Management · AINM & Observations");
  addPageNumber(s, 10, TOTAL);

  s.addText("AINM & Observations", {
    x: 0.5, y: 0.58, w: 9, h: 0.5,
    fontSize: 24, bold: true, color: C.ink, margin: 0,
  });

  // AINM section
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.5, y: 1.15, w: 4.4, h: 0.4,
    fill: { color: C.brand }, line: { color: C.brand, width: 0 },
  });
  s.addText("AINM — Accidents, Incidents & Near Misses", {
    x: 0.6, y: 1.15, w: 4.2, h: 0.4,
    fontSize: 10, bold: true, color: C.white, valign: "middle", margin: 0,
  });

  const ainmSteps = [
    "Select AINM from the HSE menu",
    "Click 'Create Record' and choose type: Accident, Incident, or Near Miss",
    "Complete the event details — date, location, description, people involved",
    "Assign an investigator and set investigation due date",
    "Record root cause and corrective actions",
    "Close the record once all actions are complete",
  ];
  ainmSteps.forEach((step, i) => {
    s.addText(`${i + 1}.  ${step}`, {
      x: 0.65, y: 1.65 + i * 0.52, w: 4.1, h: 0.45,
      fontSize: 9.5, color: C.slate, margin: 0,
    });
  });

  // Observations section
  s.addShape(pres.shapes.RECTANGLE, {
    x: 5.1, y: 1.15, w: 4.4, h: 0.4,
    fill: { color: C.brandDark }, line: { color: C.brandDark, width: 0 },
  });
  s.addText("Observations — Safety Observations Register", {
    x: 5.2, y: 1.15, w: 4.2, h: 0.4,
    fontSize: 10, bold: true, color: C.white, valign: "middle", margin: 0,
  });

  const obsItems = [
    ["Positive", "Record safe behaviours, good practice, and near-miss prevention."],
    ["Negative", "Log unsafe acts or conditions requiring follow-up."],
    ["Actions", "Assign corrective actions directly from an observation."],
    ["Public Link", "A public observation submission link can be shared with field teams — no login required."],
  ];
  obsItems.forEach((obs, i) => {
    s.addShape(pres.shapes.RECTANGLE, {
      x: 5.1, y: 1.65 + i * 0.82, w: 4.4, h: 0.7,
      fill: { color: i % 2 === 0 ? C.white : C.lightTeal }, line: { color: C.border, width: 1 },
    });
    s.addText(obs[0], {
      x: 5.25, y: 1.72 + i * 0.82, w: 1.0, h: 0.25,
      fontSize: 9.5, bold: true, color: C.brandDark, margin: 0,
    });
    s.addText(obs[1], {
      x: 5.25, y: 1.97 + i * 0.82, w: 4.1, h: 0.35,
      fontSize: 9, color: C.slate, margin: 0, wrap: true,
    });
  });
}

// ════════════════════════════════════════════════════════════════
// SLIDE 11 — HSE: INSPECTIONS & PTW
// ════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  addSlideBackground(s);
  addBrandBar(s, "HSE Management · Inspections & PTW");
  addPageNumber(s, 11, TOTAL);

  s.addText("Inspections & Permit to Work", {
    x: 0.5, y: 0.58, w: 9, h: 0.5,
    fontSize: 24, bold: true, color: C.ink, margin: 0,
  });

  addCard(s, 0.5, 1.15, 4.4, 1.7, "🔍  Conducting an Inspection",
    "Go to HSE → Inspections. Create a new inspection, select the inspection type and date. Work through the checklist items, marking each as Pass / Fail / N/A and adding comments. Raise corrective actions directly from failed items.", null);

  addCard(s, 5.1, 1.15, 4.4, 1.7, "📱  Field Inspection Mode",
    "On tablets and phones, HSE Inspections can be opened in Field Mode — a simplified, touch-friendly interface designed for use on-site. Access it by clicking the field inspection icon in the header.", null);

  addCard(s, 0.5, 3.0, 4.4, 1.8, "🔒  Permit to Work (PTW)",
    "Navigate to HSE → PTW. Issue a new permit by selecting the work type, location, hazards, and required controls. The permit must be approved before work starts and closed on completion. Permits cannot be reopened once closed.", null);

  addCard(s, 5.1, 3.0, 4.4, 1.8, "📅  HSE Calendar",
    "The HSE Calendar shows all scheduled inspections and recurring HSE events. Items overdue are highlighted in red. Click any event to view or update it. Use the calendar to ensure inspection compliance and forward planning.", null);
}

// ════════════════════════════════════════════════════════════════
// SLIDE 12 — RISK MANAGEMENT
// ════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  addSlideBackground(s);
  addBrandBar(s, "Risk Management");
  addPageNumber(s, 12, TOTAL);

  s.addText("Risk Management", {
    x: 0.5, y: 0.58, w: 9, h: 0.5,
    fontSize: 24, bold: true, color: C.ink, margin: 0,
  });
  s.addText("Risk register, controls, opportunities, reviews, and reporting", {
    x: 0.5, y: 1.05, w: 9, h: 0.35,
    fontSize: 12, color: C.muted, margin: 0,
  });

  const modules = [
    ["📊", "Risk Dashboard", "Overview of risk profile — risk by category, high/medium/low distribution, residual risk trend, and outstanding actions."],
    ["📋", "Risk Register", "Full register of all identified risks. Filter by category, rating, department, or owner. Click a risk to view full details, controls, and history."],
    ["🛡️", "Controls", "Document and track the controls in place for each risk. Link controls to specific risks and track their effectiveness review dates."],
    ["🌟", "Opportunities", "Log and track improvement opportunities identified during risk reviews. Assign owners and track to closure."],
    ["🔄", "Reviews", "Schedule and record formal risk reviews. Track review dates, attendees, and outcomes. Flag risks requiring re-assessment."],
    ["✅", "Risk Actions", "Actions arising from risk reviews and control gaps. Full action tracking with owner, due date, priority, and evidence."],
    ["📈", "Reports", "Risk performance reporting — risk profile trends, control effectiveness, action closure rates, and review compliance."],
  ];

  const cols = 4;
  modules.forEach((m, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = 0.5 + col * 2.35;
    const y = 1.55 + row * 1.95;
    if (i < 8) addCard(s, x, y, 2.22, 1.8, `${m[0]}  ${m[1]}`, m[2], null);
  });
}

// ════════════════════════════════════════════════════════════════
// SLIDE 13 — RISK REGISTER: ADDING & RATING RISKS
// ════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  addSlideBackground(s);
  addBrandBar(s, "Risk Management · Register");
  addPageNumber(s, 13, TOTAL);

  s.addText("Working with the Risk Register", {
    x: 0.5, y: 0.58, w: 9, h: 0.5,
    fontSize: 24, bold: true, color: C.ink, margin: 0,
  });

  const steps = [
    ["Add a Risk", "Go to Risk → Register. Click 'Add Risk'. Enter the risk title, description, category, and the department it applies to."],
    ["Rate the Risk", "Set the Likelihood and Consequence scores (1–5). The system calculates the Inherent Risk Rating automatically."],
    ["Add Controls", "Navigate to Risk → Controls to document the controls in place. Link each control back to the relevant risk(s)."],
    ["Residual Rating", "After controls, re-rate the Residual Likelihood and Consequence. This gives you the Residual Risk Rating."],
    ["Assign Owner", "Set a risk owner who is responsible for monitoring and reviewing the risk on its scheduled review cycle."],
    ["Review Cycle", "Risk reviews are scheduled and tracked. The register flags overdue reviews. Record review outcomes in Risk → Reviews."],
  ];

  steps.forEach((step, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 0.5 + col * 4.8;
    const y = 1.2 + row * 1.35;
    s.addShape(pres.shapes.RECTANGLE, {
      x, y, w: 4.5, h: 1.2,
      fill: { color: i % 2 === 0 ? C.white : C.lightTeal }, line: { color: C.border, width: 1 },
    });
    s.addShape(pres.shapes.OVAL, {
      x: x + 0.12, y: y + 0.12, w: 0.42, h: 0.42,
      fill: { color: C.brand }, line: { color: C.brand, width: 0 },
    });
    s.addText(String(i + 1), {
      x: x + 0.12, y: y + 0.12, w: 0.42, h: 0.42,
      fontSize: 12, bold: true, color: C.white, align: "center", valign: "middle", margin: 0,
    });
    s.addText(step[0], {
      x: x + 0.65, y: y + 0.1, w: 3.7, h: 0.3,
      fontSize: 10, bold: true, color: C.ink, margin: 0,
    });
    s.addText(step[1], {
      x: x + 0.65, y: y + 0.42, w: 3.7, h: 0.65,
      fontSize: 9, color: C.slate, margin: 0, wrap: true,
    });
  });
}

// ════════════════════════════════════════════════════════════════
// SLIDE 14 — ASSET MANAGEMENT
// ════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  addSlideBackground(s);
  addBrandBar(s, "Asset Management");
  addPageNumber(s, 14, TOTAL);

  s.addText("Asset Management", {
    x: 0.5, y: 0.58, w: 9, h: 0.5,
    fontSize: 24, bold: true, color: C.ink, margin: 0,
  });
  s.addText("Asset register, calibration, inspection, maintenance, and performance reporting", {
    x: 0.5, y: 1.05, w: 9, h: 0.35,
    fontSize: 12, color: C.muted, margin: 0,
  });

  const modules = [
    ["📊", "Asset Dashboard", "Asset health overview — status distribution, upcoming calibrations and inspections, overdue maintenance."],
    ["🏭", "Asset Register", "Full searchable register of all assets. View asset details, linked documents, inspection history, and current status."],
    ["📐", "Calibration", "Track calibration due dates, record calibration results, and manage calibration certificates. Overdue items are flagged."],
    ["🔍", "Inspections", "Log asset inspections, checklist completion, and findings. Link inspection outcomes to maintenance actions."],
    ["🔧", "Maintenance", "Schedule and record planned and reactive maintenance. Track work orders, technician assignment, and completion."],
    ["✅", "Asset Actions", "Actions arising from inspections, maintenance, or audits. Full tracking with owner, due date, and evidence."],
    ["📈", "Reports", "Asset performance reporting — inspection compliance, maintenance costs, calibration status, and asset availability."],
  ];

  const cols = 4;
  modules.forEach((m, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = 0.5 + col * 2.35;
    const y = 1.55 + row * 1.95;
    if (i < 8) addCard(s, x, y, 2.22, 1.8, `${m[0]}  ${m[1]}`, m[2], null);
  });
}

// ════════════════════════════════════════════════════════════════
// SLIDE 15 — PEOPLE MANAGEMENT
// ════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  addSlideBackground(s);
  addBrandBar(s, "People Management");
  addPageNumber(s, 15, TOTAL);

  s.addText("People Management", {
    x: 0.5, y: 0.58, w: 9, h: 0.5,
    fontSize: 24, bold: true, color: C.ink, margin: 0,
  });
  s.addText("Shared people directory used across all modules for ownership, notification and assignment", {
    x: 0.5, y: 1.05, w: 9, h: 0.35,
    fontSize: 12, color: C.muted, margin: 0,
  });

  addCard(s, 0.5, 1.5, 4.4, 1.7, "👤  People Directory",
    "The People register is the master list of all personnel in the system. Every person record holds their name, email, department, and role. This directory is referenced across Quality, HSE, Documents, Assets, and Risk for owner and reviewer assignment.", null);

  addCard(s, 5.1, 1.5, 4.4, 1.7, "🔗  System-Wide Linking",
    "When assigning an Originator, Reviewer, Approver, Action Owner, or Investigation Lead across any module, the People directory is the source. Changing a person's email here updates all future notifications automatically.", null);

  addCard(s, 0.5, 3.35, 4.4, 1.7, "📧  Email Notifications",
    "People records include the email address that receives workflow notifications. Ensure all personnel have a valid email in the People register to receive review requests, action assignments, and due date reminders.", null);

  addCard(s, 5.1, 3.35, 4.4, 1.7, "🛡️  Roles & Permissions",
    "System roles (Manager, HSE Officer, Quality Engineer, etc.) are managed in Admin / Settings. People are linked to their login account and assigned a role that controls which modules and actions they can access.", null);
}

// ════════════════════════════════════════════════════════════════
// SLIDE 16 — ACTION MANAGEMENT
// ════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  addSlideBackground(s);
  addBrandBar(s, "Action Management");
  addPageNumber(s, 16, TOTAL);

  s.addText("Action Management", {
    x: 0.5, y: 0.58, w: 9, h: 0.5,
    fontSize: 24, bold: true, color: C.ink, margin: 0,
  });
  s.addText("Central action register pulling together actions from every module", {
    x: 0.5, y: 1.05, w: 9, h: 0.35,
    fontSize: 12, color: C.muted, margin: 0,
  });

  const cards = [
    ["📊", "Action Dashboard", "Intelligence view — actions by status, source module, owner, priority, due date pressure, and closure trend charts."],
    ["📋", "Action Register", "Every action across all modules in one register. Filter by owner, source, priority, status, or due date."],
    ["➕", "Create Action", "Standalone actions can be created here and linked to a module, project, or asset. Assigns owner and priority automatically."],
    ["⭐", "My Actions", "Filtered view showing only actions assigned to the currently logged-in user. Quick way to see what needs doing."],
    ["⚠️", "Overdue & Priority", "'Overdue First' and 'Due This Week' views make it easy to chase critical actions without manual sorting."],
    ["📎", "Evidence Upload", "Each action supports file evidence upload. Attach photos, documents, or emails as proof of completion."],
  ];

  const cols = 3;
  cards.forEach((c, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = 0.5 + col * 3.12;
    const y = 1.5 + row * 1.95;
    addCard(s, x, y, 2.98, 1.8, `${c[0]}  ${c[1]}`, c[2], null);
  });
}

// ════════════════════════════════════════════════════════════════
// SLIDE 17 — ADMIN / SETTINGS
// ════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  addSlideBackground(s);
  addBrandBar(s, "Admin / Settings");
  addPageNumber(s, 17, TOTAL);

  s.addText("Admin / Settings", {
    x: 0.5, y: 0.58, w: 9, h: 0.5,
    fontSize: 24, bold: true, color: C.ink, margin: 0,
  });
  s.addText("Master data, user management, reference data, and system configuration — Admin access required", {
    x: 0.5, y: 1.05, w: 9, h: 0.35,
    fontSize: 12, color: C.muted, margin: 0,
  });

  const areas = [
    ["🏢", "Departments", "Create and manage departments. Departments are used across all modules for ownership, filtering, and reporting."],
    ["👥", "People & Roles", "Manage user accounts, assign system roles, and set individual module permission overrides."],
    ["📄", "Document Control", "Configure document types, numbering formats, and default review cycles for Document Control."],
    ["🏭", "Assets", "Configure asset categories, asset ID codes, and default inspection types for Asset Management."],
    ["⚖️", "Risk", "Set risk rating matrices, risk categories, and review cycle defaults for the Risk module."],
    ["✅", "Actions", "Configure action categories, priority levels, and default escalation rules."],
    ["⚙️", "System", "System-level settings — company name, branding, session configuration, and audit log."],
  ];

  const cols = 4;
  areas.forEach((a, i) => {
    if (i >= 8) return;
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = 0.5 + col * 2.35;
    const y = 1.5 + row * 1.95;
    addCard(s, x, y, 2.22, 1.8, `${a[0]}  ${a[1]}`, a[2], null);
  });

  // Admin only note
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.5, y: 5.1, w: 9.0, h: 0.38,
    fill: { color: "FEF3C7" }, line: { color: "F59E0B", width: 1 },
  });
  s.addText("⚠️  Admin / Settings is only accessible to users with the Admin role. Contact your System Administrator if you need changes made.", {
    x: 0.65, y: 5.14, w: 8.6, h: 0.28,
    fontSize: 9, color: "92400E", margin: 0,
  });
}

// ════════════════════════════════════════════════════════════════
// SLIDE 18 — TIPS & BEST PRACTICES
// ════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  addSlideBackground(s);
  addBrandBar(s, "Tips & Best Practices");
  addPageNumber(s, 18, TOTAL);

  s.addText("Tips & Best Practices", {
    x: 0.5, y: 0.58, w: 9, h: 0.5,
    fontSize: 24, bold: true, color: C.ink, margin: 0,
  });

  const tips = [
    ["🔢", "Document Numbering", "Document numbers are auto-generated from Department + Document Type + Sequence. Always select the correct Department and Type to get the right number format."],
    ["👤", "Keep People Records Updated", "All workflow notifications rely on the email in the People register. Always update a person's email when it changes."],
    ["📎", "Upload Evidence", "Wherever an evidence file upload is available, use it. Attaching proof of closure (photos, emails, certificates) makes audits far simpler."],
    ["🔄", "Use the Workflow Tab", "Don't email people to review or approve documents. Submit via the system — they receive a notification email with a direct link."],
    ["✅", "Close Actions Promptly", "Overdue actions affect your Quality and HSE KPI dashboards. Close actions as soon as work is complete — don't leave them open unnecessarily."],
    ["📊", "Check Dashboards Weekly", "Each module's dashboard is the quickest way to see what needs attention. A 5-minute weekly check prevents things from going overdue."],
    ["🔍", "Use Filters", "Every register has search and filter options. Use Department, Status, Type, and Date filters to quickly find what you need."],
    ["📅", "Review Due Dates", "The system flags documents and items with upcoming review dates. Check the Document Control and HSE Calendar dashboards regularly."],
  ];

  const cols = 2;
  tips.forEach((tip, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = 0.5 + col * 4.8;
    const y = 1.2 + row * 1.0;

    s.addShape(pres.shapes.RECTANGLE, {
      x, y, w: 4.6, h: 0.88,
      fill: { color: row % 2 === 0 ? C.white : C.lightTeal }, line: { color: C.border, width: 1 },
    });
    s.addText(tip[0], {
      x: x + 0.1, y: y + 0.08, w: 0.45, h: 0.45,
      fontSize: 18, align: "center", valign: "middle", margin: 0,
    });
    s.addText(tip[1], {
      x: x + 0.6, y: y + 0.06, w: 3.85, h: 0.28,
      fontSize: 10, bold: true, color: C.ink, margin: 0,
    });
    s.addText(tip[2], {
      x: x + 0.6, y: y + 0.35, w: 3.85, h: 0.46,
      fontSize: 8.5, color: C.slate, margin: 0, wrap: true,
    });
  });
}

// ════════════════════════════════════════════════════════════════
// SLIDE 19 — COMMON TASKS QUICK REFERENCE
// ════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  addSlideBackground(s);
  addBrandBar(s, "Quick Reference");
  addPageNumber(s, 19, TOTAL);

  s.addText("Common Tasks — Quick Reference", {
    x: 0.5, y: 0.58, w: 9, h: 0.5,
    fontSize: 24, bold: true, color: C.ink, margin: 0,
  });

  const tasks = [
    ["Create a new controlled document", "Documents → Create Document tab → fill form → Create Draft Document →"],
    ["Submit a document for review", "Documents → Document Register → click document → Submit for Review"],
    ["Approve a document", "Documents → Workflow tab → find document → Approve"],
    ["Log a nonconformance", "Quality → NCR / CAPA → Create NCR tab → complete form → Submit"],
    ["Raise a change request", "Quality → MOC → Create MOC → complete impact assessment"],
    ["Log an HSE incident", "HSE → AINM → Create Record → select type → complete details"],
    ["Conduct an inspection", "HSE → Inspections → New Inspection → complete checklist → Save"],
    ["Add a risk to the register", "Risk → Register → Add Risk → rate likelihood & consequence"],
    ["Close an overdue action", "Actions → Register (or My Actions) → find action → add closure note → Close"],
    ["Add a new person", "People → Add Person → enter name, email, department"],
    ["Change a user's role", "Admin → People & Roles → find user → update role"],
    ["Check what's overdue today", "Home Dashboard → overdue action panel, or module Dashboard"],
  ];

  tasks.forEach((task, i) => {
    const y = 1.2 + i * 0.345;
    s.addShape(pres.shapes.RECTANGLE, {
      x: 0.5, y, w: 9.0, h: 0.32,
      fill: { color: i % 2 === 0 ? C.white : C.lightTeal }, line: { color: C.border, width: 0 },
    });
    s.addText(task[0], {
      x: 0.6, y, w: 3.9, h: 0.32,
      fontSize: 9, bold: true, color: C.ink, valign: "middle", margin: 0,
    });
    s.addShape(pres.shapes.RECTANGLE, {
      x: 4.5, y: y + 0.06, w: 0.04, h: 0.2,
      fill: { color: C.brand }, line: { color: C.brand, width: 0 },
    });
    s.addText(task[1], {
      x: 4.6, y, w: 4.8, h: 0.32,
      fontSize: 8.5, color: C.brandDark, valign: "middle", margin: 0,
    });
  });
}

// ════════════════════════════════════════════════════════════════
// SLIDE 20 — GETTING HELP & SUPPORT
// ════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  addSlideBackground(s);
  addBrandBar(s, "Support");
  addPageNumber(s, 20, TOTAL);

  s.addText("Getting Help & Support", {
    x: 0.5, y: 0.58, w: 9, h: 0.5,
    fontSize: 24, bold: true, color: C.ink, margin: 0,
  });

  addCard(s, 0.5, 1.2, 4.4, 1.7, "🔐  Access Issues",
    "If you cannot log in or cannot see a module you need, contact your System Administrator. They can check your role and module permissions in Admin → People & Roles.", null);

  addCard(s, 5.1, 1.2, 4.4, 1.7, "⚙️  System Configuration",
    "Changes to document types, department lists, risk rating scales, or user roles must be made by an Admin. These are managed in Admin / Settings.", null);

  addCard(s, 0.5, 3.05, 4.4, 1.7, "📧  Notification Issues",
    "If you are not receiving email notifications, check with your Admin that your People record has a valid email address and that your account email matches your login.", null);

  addCard(s, 5.1, 3.05, 4.4, 1.7, "🐞  Reporting a Problem",
    "If something isn't working as expected, note the module, tab, and what action you were performing. Screenshot the error if one appears. Pass this to your System Administrator.", null);
}

// ════════════════════════════════════════════════════════════════
// SLIDE 21 — GLOSSARY
// ════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  addSlideBackground(s);
  addBrandBar(s, "Glossary");
  addPageNumber(s, 21, TOTAL);

  s.addText("Glossary of Terms", {
    x: 0.5, y: 0.58, w: 9, h: 0.5,
    fontSize: 24, bold: true, color: C.ink, margin: 0,
  });

  const terms = [
    ["MOC", "Management of Change — a formal process to assess and control changes to systems, processes, or equipment."],
    ["NCR", "Nonconformance Report — a record of something that does not meet a specified requirement."],
    ["CAPA", "Corrective and Preventive Action — actions taken to eliminate the cause of a nonconformance and prevent recurrence."],
    ["AINM", "Accident, Incident and Near Miss — HSE event reporting categories."],
    ["PTW", "Permit to Work — a formal safety system ensuring hazard controls are in place before work begins."],
    ["IMS", "Integrated Management System — the combined platform covering Quality, HSE, Documents, Risk, and Assets."],
    ["RLS", "Row Level Security — database-level control ensuring users only see data they are authorised to access."],
    ["Draft", "A document that has been created but not yet submitted for review or approval."],
    ["Live", "A document that has been reviewed, approved, and is the current controlled version."],
    ["Residual Risk", "The risk remaining after controls have been applied."],
    ["Originator", "The person who created a document or record."],
    ["Reviewer / Approver", "The person responsible for reviewing or giving final approval to a document."],
  ];

  const cols = 2;
  terms.forEach((term, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = 0.5 + col * 4.8;
    const y = 1.2 + row * 0.68;

    s.addShape(pres.shapes.RECTANGLE, {
      x, y, w: 4.6, h: 0.6,
      fill: { color: i % 2 === 0 ? C.white : C.lightTeal }, line: { color: C.border, width: 1 },
    });
    s.addText(term[0], {
      x: x + 0.1, y, w: 1.1, h: 0.6,
      fontSize: 10, bold: true, color: C.brandDark, valign: "middle", margin: 0,
    });
    s.addShape(pres.shapes.RECTANGLE, {
      x: x + 1.2, y: y + 0.1, w: 0.04, h: 0.4,
      fill: { color: C.border }, line: { color: C.border, width: 0 },
    });
    s.addText(term[1], {
      x: x + 1.3, y, w: 3.2, h: 0.6,
      fontSize: 8.5, color: C.slate, valign: "middle", margin: 0, wrap: true,
    });
  });
}

// ════════════════════════════════════════════════════════════════
// SLIDE 22 — CLOSING SLIDE
// ════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.brandDeep };

  s.addShape(pres.shapes.OVAL, {
    x: -1.5, y: 2.5, w: 5, h: 5,
    fill: { color: C.brand, transparency: 80 }, line: { color: C.brand, width: 0 },
  });
  s.addShape(pres.shapes.OVAL, {
    x: 7.5, y: -1.5, w: 5, h: 5,
    fill: { color: C.accent, transparency: 85 }, line: { color: C.accent, width: 0 },
  });

  s.addText("You're ready to go.", {
    x: 1, y: 1.3, w: 8, h: 0.9,
    fontSize: 36, bold: true, color: C.white, align: "center", margin: 0,
  });
  s.addText("The Enshore IMS is designed to make quality, safety, and compliance\nsimple, traceable, and efficient for your whole team.", {
    x: 1, y: 2.35, w: 8, h: 0.9,
    fontSize: 14, color: "A8D8D7", align: "center", italic: true, margin: 0,
  });

  s.addShape(pres.shapes.RECTANGLE, {
    x: 3.5, y: 3.4, w: 3.0, h: 0.06,
    fill: { color: C.accent }, line: { color: C.accent, width: 0 },
  });

  s.addText("Questions? Contact your System Administrator.", {
    x: 1, y: 3.6, w: 8, h: 0.45,
    fontSize: 12, color: "C8F0EF", align: "center", margin: 0,
  });

  s.addText("ENSHORE SUBSEA  ·  Integrated Management System  ·  Version 1.0  ·  2026", {
    x: 1, y: 5.05, w: 8, h: 0.35,
    fontSize: 9, color: "6B9E9D", align: "center", charSpacing: 1, margin: 0,
  });
}

// ─── WRITE FILE ───────────────────────────────────────────────
pres.writeFile({ fileName: "C:\\Users\\JBeaton\\asset-quality-webapp\\Enshore_IMS_User_Guide.pptx" })
  .then(() => console.log("✅  Saved: Enshore_IMS_User_Guide.pptx"))
  .catch((err) => console.error("❌  Error:", err));
