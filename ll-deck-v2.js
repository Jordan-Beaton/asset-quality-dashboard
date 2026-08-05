// Enshore Lessons Learnt — Lunch & Learn v2
// Simpler story. Template-aligned style. Live screenshots embedded.
// Run: $env:NODE_PATH="C:\Users\JBeaton\AppData\Roaming\npm\node_modules"; node ll-deck-v2.js

const pptxgen = require("pptxgenjs");
const fs = require("fs");
const path = require("path");

const OUT = "C:\\Users\\JBeaton\\asset-quality-webapp\\Enshore_LL_LunchLearn.pptx";
const SS  = "C:\\Users\\JBeaton\\asset-quality-webapp\\screenshots-ll\\";
const MEDIA = "C:\\Users\\JBeaton\\AppData\\Local\\Temp\\claude\\template-unpacked\\ppt\\media\\";

// ── Brand ──────────────────────────────────────────────────────────────────
const B = {
  navy:   "0E2841",
  teal:   "005670",
  blue:   "156082",
  orange: "E97132",
  sky:    "0F9ED5",
  green:  "196B24",
  grey:   "E8E8E8",
  white:  "FFFFFF",
  offWht: "F4F6F8",
  muted:  "64748B",
  ink:    "1E293B",
};

// ── Helpers ────────────────────────────────────────────────────────────────
function img(file) {
  const full = fs.existsSync(file) ? file : path.join(SS, file);
  if (!fs.existsSync(full)) { console.warn("Missing:", full); return null; }
  const ext = path.extname(full).replace(".", "").toLowerCase();
  const mime = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : "image/png";
  return mime + ";base64," + fs.readFileSync(full).toString("base64");
}

const LOGO = img(path.join(MEDIA, "image4.png"));

// Add Enshore logo top-left (small, for content slides)
function logo(s) {
  if (LOGO) s.addImage({ data: LOGO, x: 0.25, y: 0.08, w: 1.1, h: 0.5 });
}

// Teal header bar with title — matches template look
function header(s, title, sub) {
  s.addShape(pres.ShapeType.rect, {
    x: 0, y: 0, w: 10, h: sub ? 0.95 : 0.75,
    fill: { color: B.teal }, line: { color: B.teal, width: 0 },
  });
  s.addText(title, {
    x: 1.55, y: 0.08, w: 8.2, h: 0.45,
    fontSize: 18, bold: true, color: B.white, valign: "middle", margin: 0,
  });
  if (sub) {
    s.addText(sub, {
      x: 1.55, y: 0.52, w: 8.2, h: 0.35,
      fontSize: 10, color: "A8D4E8", margin: 0,
    });
  }
  logo(s);
}

// Orange accent strip left edge (template motif)
function leftStrip(s) {
  s.addShape(pres.ShapeType.rect, {
    x: 0, y: 0, w: 0.15, h: 5.625,
    fill: { color: B.orange }, line: { color: B.orange, width: 0 },
  });
}

// Slide number bottom right
function pn(s, n, total) {
  s.addText(`${n} / ${total}`, {
    x: 9.1, y: 5.38, w: 0.8, h: 0.18,
    fontSize: 8, color: B.muted, align: "right", margin: 0,
  });
}

// Full-slide screenshot with branded header overlay
function screenshotSlide(s, imgData, title) {
  if (imgData) {
    s.addImage({ data: imgData, x: 0, y: 0.75, w: 10, h: 4.875 });
  }
  // Teal header strip over the top
  s.addShape(pres.ShapeType.rect, {
    x: 0, y: 0, w: 10, h: 0.75,
    fill: { color: B.teal }, line: { color: B.teal, width: 0 },
  });
  s.addText(title, {
    x: 1.55, y: 0, w: 8.0, h: 0.75,
    fontSize: 16, bold: true, color: B.white, valign: "middle", margin: 0,
  });
  logo(s);
}

// ── Build ──────────────────────────────────────────────────────────────────
const pres = new pptxgen();
pres.layout = "LAYOUT_16x9";
pres.author = "Enshore Subsea";
pres.title  = "Lessons Learnt — Lunch & Learn";

const TOTAL = 10;

// ════════════════════════════════════════════════════════════════════════════
// SLIDE 1 — COVER
// ════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: B.navy };

  // Left orange strip
  s.addShape(pres.ShapeType.rect, {
    x: 0, y: 0, w: 0.15, h: 5.625,
    fill: { color: B.orange }, line: { color: B.orange, width: 0 },
  });
  // Bottom teal band
  s.addShape(pres.ShapeType.rect, {
    x: 0.15, y: 4.0, w: 9.85, h: 1.625,
    fill: { color: B.teal }, line: { color: B.teal, width: 0 },
  });
  // Top-right accent block
  s.addShape(pres.ShapeType.rect, {
    x: 7.2, y: 0, w: 2.8, h: 4.0,
    fill: { color: B.blue }, line: { color: B.blue, width: 0 },
  });

  // Logo on blue block
  if (LOGO) s.addImage({ data: LOGO, x: 7.45, y: 0.2, w: 2.3, h: 1.05 });

  // Main headline
  s.addText("Lessons Learnt", {
    x: 0.4, y: 0.5, w: 6.6, h: 0.5,
    fontSize: 13, bold: true, color: B.orange, charSpacing: 5, margin: 0,
  });
  s.addText("What we have,\nwhere it lives,\nand how to use it.", {
    x: 0.4, y: 1.1, w: 6.5, h: 2.4,
    fontSize: 36, bold: true, color: B.white, margin: 0, lineSpacingMultiple: 1.15,
  });

  // Stats preview on blue block
  [
    { n: "2,990", l: "Lessons\nCaptured", y: 1.4 },
    { n: "67",    l: "Projects\nCovered",  y: 3.0 },
  ].forEach(st => {
    s.addText(st.n, { x: 7.2, y: st.y, w: 2.8, h: 0.75, fontSize: 34, bold: true, color: B.white, align: "center", margin: 0 });
    s.addText(st.l, { x: 7.2, y: st.y + 0.72, w: 2.8, h: 0.5, fontSize: 10, color: "A8D4E8", align: "center", margin: 0, lineSpacingMultiple: 1.2 });
  });

  // Bottom band text
  s.addText("Lunch & Learn  ·  Enshore Subsea  ·  2026", {
    x: 0.4, y: 4.15, w: 6.5, h: 0.35,
    fontSize: 11, color: "A8D4E8", margin: 0,
  });
  s.addText("Jordan Beaton — IMS Administrator", {
    x: 0.4, y: 4.55, w: 6.5, h: 0.3,
    fontSize: 10, color: B.grey, margin: 0,
  });

  s.addNotes("Welcome. Today we're talking about lessons learnt — not as a concept, but as 17 years of actual project data that Enshore now has in one searchable place.");
}

// ════════════════════════════════════════════════════════════════════════════
// SLIDE 2 — THE NUMBERS
// ════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: B.navy };
  leftStrip(s);
  pn(s, 2, TOTAL);
  if (LOGO) s.addImage({ data: LOGO, x: 0.35, y: 0.12, w: 1.2, h: 0.55 });

  s.addText("The Scale of What We Have", {
    x: 0.4, y: 0.85, w: 9.2, h: 0.55,
    fontSize: 26, bold: true, color: B.white, margin: 0,
  });
  s.addText("From the Deep Ocean days of 2009 through to today — one combined dataset.", {
    x: 0.4, y: 1.42, w: 9.2, h: 0.32,
    fontSize: 12, color: "A8D4E8", margin: 0,
  });

  // 4 big stats
  const stats = [
    { n: "2,990", l: "Lessons\nLearnt", c: B.orange, x: 0.4  },
    { n: "67",    l: "Projects\nCovered", c: B.sky,   x: 2.8  },
    { n: "17",    l: "Years of\nData",   c: B.blue,  x: 5.2  },
    { n: "10",    l: "Source\nFiles",    c: B.teal,  x: 7.55 },
  ];
  stats.forEach(st => {
    s.addShape(pres.ShapeType.rect, {
      x: st.x, y: 2.0, w: 2.2, h: 2.85,
      fill: { color: st.c }, line: { color: st.c, width: 0 },
      shadow: { type: "outer", color: "000000", blur: 10, offset: 3, angle: 135, opacity: 0.2 },
    });
    s.addText(st.n, { x: st.x, y: 2.1, w: 2.2, h: 1.4, fontSize: 48, bold: true, color: B.white, align: "center", margin: 0 });
    s.addText(st.l, { x: st.x, y: 3.5, w: 2.2, h: 0.75, fontSize: 13, color: "D4ECF7", align: "center", margin: 0, lineSpacingMultiple: 1.3 });
  });

  s.addNotes("The headline number: 2,990 individual lessons learnt records. This is the combined dataset from 10 separate project Excel files, covering 67 projects across 17 years. It's all now in one place.");
}

// ════════════════════════════════════════════════════════════════════════════
// SLIDE 3 — THE PROBLEM (Excel)
// ════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: B.offWht };
  leftStrip(s);
  pn(s, 3, TOTAL);
  header(s, "The Challenge: It's All Sat in Excel");

  // Two columns
  // Left: what we have (positives)
  s.addShape(pres.ShapeType.rect, {
    x: 0.3, y: 1.1, w: 4.3, h: 0.4,
    fill: { color: B.teal }, line: { color: B.teal, width: 0 },
  });
  s.addText("What we DO have", {
    x: 0.3, y: 1.1, w: 4.3, h: 0.4,
    fontSize: 12, bold: true, color: B.white, valign: "middle", margin: 8,
  });

  const haves = [
    "2,990 lessons from 67 projects",
    "Data going back to 2009",
    "Project codes, dates, departments",
    "Issue descriptions and actions",
    "Criticality ratings on most records",
  ];
  haves.forEach((t, i) => {
    s.addShape(pres.ShapeType.rect, {
      x: 0.3, y: 1.55 + i * 0.65, w: 4.3, h: 0.58,
      fill: { color: i % 2 === 0 ? B.white : B.grey }, line: { color: "#D0D7DE", width: 0 },
    });
    s.addText("✓  " + t, {
      x: 0.4, y: 1.55 + i * 0.65, w: 4.1, h: 0.58,
      fontSize: 11, color: B.teal, valign: "middle", margin: 0, bold: true,
    });
  });

  // Right: what we CAN'T easily do
  s.addShape(pres.ShapeType.rect, {
    x: 4.85, y: 1.1, w: 4.9, h: 0.4,
    fill: { color: B.orange }, line: { color: B.orange, width: 0 },
  });
  s.addText("What we CAN'T easily do", {
    x: 4.85, y: 1.1, w: 4.9, h: 0.4,
    fontSize: 12, bold: true, color: B.white, valign: "middle", margin: 8,
  });

  const cannots = [
    ["🔍", "Search across all projects at once"],
    ["📊", "Run trend analysis without opening 10 files"],
    ["🔁", "Know if the same mistake happened on a previous job"],
    ["📋", "Find relevant lessons before a new project kicks off"],
    ["📤", "Share or report on lessons easily"],
  ];
  cannots.forEach((t, i) => {
    s.addShape(pres.ShapeType.rect, {
      x: 4.85, y: 1.55 + i * 0.65, w: 4.9, h: 0.58,
      fill: { color: i % 2 === 0 ? B.white : B.grey }, line: { color: "#D0D7DE", width: 0 },
    });
    s.addText(t[0] + "  " + t[1], {
      x: 4.95, y: 1.55 + i * 0.65, w: 4.7, h: 0.58,
      fontSize: 11, color: B.ink, valign: "middle", margin: 0,
    });
  });

  // Bottom callout
  s.addShape(pres.ShapeType.rect, {
    x: 0.3, y: 4.85, w: 9.45, h: 0.6,
    fill: { color: B.navy }, line: { color: B.navy, width: 0 },
  });
  s.addText("The data is there. It just isn't accessible. That's what we've built the new system to fix.", {
    x: 0.5, y: 4.85, w: 9.25, h: 0.6,
    fontSize: 12, bold: true, color: B.white, valign: "middle", margin: 0,
  });

  s.addNotes("The data exists — that's not the problem. The problem is it's locked in spreadsheets that are hard to query, compare, or share. Nobody checks the lessons file before starting a project because it's too hard to search.");
}

// ════════════════════════════════════════════════════════════════════════════
// SLIDE 4 — INTRODUCING IMS LESSONS LEARNED
// ════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: B.teal };
  leftStrip(s);
  pn(s, 4, TOTAL);

  if (LOGO) s.addImage({ data: LOGO, x: 0.35, y: 0.12, w: 1.2, h: 0.55 });

  s.addText("Meet the IMS\nLessons Learned System", {
    x: 0.4, y: 0.85, w: 9.2, h: 1.5,
    fontSize: 34, bold: true, color: B.white, margin: 0, lineSpacingMultiple: 1.2,
  });
  s.addText("All 2,990 lessons. One place. Searchable, filterable, and linked to actions.", {
    x: 0.4, y: 2.45, w: 9.2, h: 0.4,
    fontSize: 15, color: "A8D4E8", margin: 0,
  });

  // 4 feature pills
  const feats = [
    { icon: "🔍", t: "Search & Filter",    d: "Find any lesson by project, keyword, department, or date" },
    { icon: "📊", t: "Trend Analysis",     d: "Charts showing patterns across all years and projects built in" },
    { icon: "🔗", t: "Linked Actions",     d: "Log a lesson, assign an action, track it to closure" },
    { icon: "➕", t: "Easy Submission",    d: "Structured form ensures quality data every time" },
  ];
  feats.forEach((f, i) => {
    const x = 0.4 + i * 2.4;
    s.addShape(pres.ShapeType.rect, {
      x, y: 3.1, w: 2.2, h: 2.2,
      fill: { color: "006080" }, line: { color: "007090", width: 1 },
      shadow: { type: "outer", color: "000000", blur: 8, offset: 2, angle: 135, opacity: 0.2 },
    });
    s.addText(f.icon, { x, y: 3.18, w: 2.2, h: 0.6, fontSize: 26, align: "center", margin: 0 });
    s.addText(f.t, { x: x + 0.1, y: 3.8, w: 2.0, h: 0.38, fontSize: 11, bold: true, color: B.white, align: "center", margin: 0 });
    s.addText(f.d, { x: x + 0.1, y: 4.2, w: 2.0, h: 0.9, fontSize: 9, color: "A8D4E8", align: "center", margin: 0, wrap: true });
  });

  s.addNotes("This is the new module inside the IMS. It replaces nothing — the data from all 10 Excel files has been imported. From now on, new lessons go in here, not into spreadsheets.");
}

// ════════════════════════════════════════════════════════════════════════════
// SLIDE 5 — SCREENSHOT: DASHBOARD
// ════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  const shot = img(SS + "05_dashboard_1440.png");
  screenshotSlide(s, shot, "The Dashboard — 2,990 lessons at a glance");
  pn(s, 5, TOTAL);
  s.addNotes("Walk through the KPI cards: Total Lessons (2990), Open Actions (599), High/Critical (681), Repeated Lessons (1120). That last one — 1,120 repeated lessons across projects — is the one to call out. Same mistakes, different jobs.");
}

// ════════════════════════════════════════════════════════════════════════════
// SLIDE 6 — SCREENSHOT: REGISTER (searchable table)
// ════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  const shot = img(SS + "06_register.png");
  screenshotSlide(s, shot, "The Register — search and filter all 2,990 records");
  pn(s, 6, TOTAL);
  s.addNotes("This is the full register. Every lesson is here — searchable by keyword, filterable by project, department, criticality, date. Before starting a new project, this is where you come first.");
}

// ════════════════════════════════════════════════════════════════════════════
// SLIDE 7 — SCREENSHOT: TREND ANALYSIS
// ════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  const shot = img(SS + "08_trend_analysis.png");
  screenshotSlide(s, shot, "Trend Analysis — patterns across 17 years, built in");
  pn(s, 7, TOTAL);
  s.addNotes("The trend analysis tab shows failures, successes and opportunities over time — from 2009 through to 2026. The spike in 2026 is us entering data into the system now. The 2011-2014 and 2018 peaks are the big installation projects.");
}

// ════════════════════════════════════════════════════════════════════════════
// SLIDE 8 — SCREENSHOT: LOGGING A LESSON
// ════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  const shot = img(SS + "10_create_form.png");
  screenshotSlide(s, shot, "Logging a Lesson — structured form, 5 minutes");
  pn(s, 8, TOTAL);
  s.addNotes("Creating a lesson is a structured form — project, department, date, criticality, what happened, the lesson, the action. Takes about 5 minutes. The structure means every record is searchable and comparable.");
}

// ════════════════════════════════════════════════════════════════════════════
// SLIDE 9 — WHAT WE NEED FROM YOU
// ════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: B.offWht };
  leftStrip(s);
  pn(s, 9, TOTAL);
  header(s, "What We Need From You", "Three simple asks to make this work");

  const asks = [
    {
      n: "1", c: B.orange, icon: "✍️",
      head: "Log lessons as they happen",
      body: "When something goes wrong (or right) on a project — log it in the IMS, not a spreadsheet or email. It takes 5 minutes and it stays searchable forever.",
    },
    {
      n: "2", c: B.blue, icon: "🔍",
      head: "Search before you start",
      body: "Before your next project kick-off, spend 10 minutes in the Register. Search your project type, vessel, or operation. The knowledge is already there — use it.",
    },
    {
      n: "3", c: B.teal, icon: "📢",
      head: "Tell your team it exists",
      body: "The system is only as useful as the number of people who know about it. Share the link. Point your team at it. Lessons learnt shouldn't live in one person's head.",
    },
  ];

  asks.forEach((a, i) => {
    const y = 1.1 + i * 1.45;
    s.addShape(pres.ShapeType.rect, {
      x: 0.3, y, w: 9.45, h: 1.32,
      fill: { color: B.white }, line: { color: B.grey, width: 1 },
      shadow: { type: "outer", color: "000000", blur: 5, offset: 2, angle: 135, opacity: 0.08 },
    });
    s.addShape(pres.ShapeType.rect, {
      x: 0.3, y, w: 0.65, h: 1.32,
      fill: { color: a.c }, line: { color: a.c, width: 0 },
    });
    s.addText(a.n, { x: 0.3, y, w: 0.65, h: 0.65, fontSize: 20, bold: true, color: B.white, align: "center", valign: "middle", margin: 0 });
    s.addText(a.icon, { x: 0.3, y: y + 0.66, w: 0.65, h: 0.66, fontSize: 20, align: "center", valign: "middle", margin: 0 });
    s.addText(a.head, { x: 1.1, y: y + 0.1, w: 8.5, h: 0.36, fontSize: 14, bold: true, color: B.navy, margin: 0 });
    s.addText(a.body, { x: 1.1, y: y + 0.5, w: 8.5, h: 0.72, fontSize: 10.5, color: B.muted, margin: 0, wrap: true });
  });

  s.addNotes("Keep this conversational. Ask the room: who's had a lesson learnt on a project that never got written down? That's the gap we're closing.");
}

// ════════════════════════════════════════════════════════════════════════════
// SLIDE 10 — CLOSE / Q&A
// ════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: B.navy };

  s.addShape(pres.ShapeType.rect, {
    x: 0, y: 0, w: 0.15, h: 5.625,
    fill: { color: B.orange }, line: { color: B.orange, width: 0 },
  });
  s.addShape(pres.ShapeType.rect, {
    x: 0.15, y: 3.9, w: 9.85, h: 1.725,
    fill: { color: B.teal }, line: { color: B.teal, width: 0 },
  });
  s.addShape(pres.ShapeType.rect, {
    x: 7.2, y: 0, w: 2.8, h: 3.9,
    fill: { color: B.blue }, line: { color: B.blue, width: 0 },
  });

  if (LOGO) s.addImage({ data: LOGO, x: 7.45, y: 0.2, w: 2.3, h: 1.05 });

  s.addText("Thank You", { x: 0.4, y: 0.5, w: 6.6, h: 0.65, fontSize: 38, bold: true, color: B.white, margin: 0 });
  s.addText("Questions?", { x: 0.4, y: 1.25, w: 6.6, h: 0.55, fontSize: 26, bold: true, color: B.orange, margin: 0 });
  s.addText("The IMS Lessons Learned module is live now.\nLog in and search — 17 years of knowledge is waiting.", {
    x: 0.4, y: 4.05, w: 6.8, h: 0.9,
    fontSize: 12, color: "A8D4E8", margin: 0, lineSpacingMultiple: 1.5,
  });

  // Stats recap
  [
    { n: "2,990", l: "Lessons", y: 1.4 },
    { n: "67",    l: "Projects", y: 2.55 },
    { n: "17",    l: "Years",    y: 3.35 },
  ].forEach(st => {
    s.addText(st.n, { x: 7.2, y: st.y, w: 2.8, h: 0.65, fontSize: 30, bold: true, color: B.white, align: "center", margin: 0 });
    s.addText(st.l, { x: 7.2, y: st.y + 0.63, w: 2.8, h: 0.3, fontSize: 10, color: "A8D4E8", align: "center", margin: 0 });
  });

  s.addNotes("Close here. Remind the room the system is live today. If anyone wants a demo walk-through one-to-one, offer to book 30 minutes.");
}

// ── Write ──────────────────────────────────────────────────────────────────
pres.writeFile({ fileName: OUT })
  .then(() => {
    console.log("✅  Done:", OUT);
    const mb = (fs.statSync(OUT).size / 1024 / 1024).toFixed(1);
    console.log("    File size:", mb, "MB");
  })
  .catch(err => console.error("❌", err));
