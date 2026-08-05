// Enshore Subsea — Lessons Learnt Lunch & Learn Presentation
// Run: $env:NODE_PATH="C:\Users\JBeaton\AppData\Roaming\npm\node_modules"; node lessons-learnt-deck.js

const pptxgen = require("pptxgenjs");
const fs   = require("fs");
const path = require("path");
const JSZip = require("jszip");   // bundled with pptxgenjs

const OUT = "C:\\Users\\JBeaton\\asset-quality-webapp\\Enshore_Lessons_Learnt.pptx";
const MEDIA = "C:\\Users\\JBeaton\\AppData\\Local\\Temp\\claude\\template-unpacked\\ppt\\media\\";

// ─── BRAND ──────────────────────────────────────────────────────────────────
const B = {
  navy:    "0E2841",   // deep background
  teal:    "005670",   // title text / dark section
  blue:    "156082",   // primary accent
  orange:  "E97132",   // warm accent
  sky:     "0F9ED5",   // data accent
  green:   "196B24",   // success
  grey:    "E8E8E8",   // subtle bg
  white:   "FFFFFF",
  offWhite:"F4F6F8",
  muted:   "64748B",
  ink:     "1E293B",
};

// Logo — pull from template media (largest PNG = logo)
function logoData(file) {
  try {
    const buf = fs.readFileSync(path.join(MEDIA, file));
    return "image/png;base64," + buf.toString("base64");
  } catch { return null; }
}
const LOGO = logoData("image4.png");

// ─── DATA ────────────────────────────────────────────────────────────────────
const YEAR_DATA = {
  labels: ["2009","2010","2011","2012","2013","2014","2015","2016","2017","2018","2019","2023","2024","2025","2026"],
  values: [79,    153,   332,   230,   332,   305,   78,    43,    136,   321,   100,   1,     13,    28,    440],
};
// Dept (top 7)
const DEPT_LABELS = ["Projects","Operations","Engineering","Mobilisation","Project Eng.","Planning","HSEQ"];
const DEPT_VALUES = [1476,304,158,134,123,111,55];
// Stage (top 6)
const STAGE_LABELS = ["Operational Issues","Mobilisation","Planning","Trenching","Cable Splice","Trencher Mob."];
const STAGE_VALUES = [811,451,336,130,63,53];
// Criticality (known only)
const CRIT_LABELS = ["Medium","Low","High","Critical"];
const CRIT_VALUES = [992,735,673,8];
// Status
const STATUS_LABELS = ["Failure / Observation","Success","Closed","Open"];
const STATUS_VALUES = [1957,250,33,14];

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function shadow() {
  return { type:"outer", color:"000000", blur:10, offset:3, angle:135, opacity:0.15 };
}
function cardShadow() {
  return { type:"outer", color:"000000", blur:6, offset:2, angle:135, opacity:0.10 };
}

// Logo top-right on content slides
function addLogo(s) {
  if (!LOGO) return;
  s.addImage({ data: LOGO, x:8.9, y:0.08, w:0.9, h:0.42 });
}

// Slide-number bottom-right
function pn(s, n, total) {
  s.addText(`${n} / ${total}`, {
    x:9.1, y:5.35, w:0.8, h:0.2,
    fontSize:8, color:B.muted, align:"right", margin:0,
  });
}

// Section divider card (reusable for Morph)
function sectionCard(s, icon, title, sub, shapeName) {
  // central navy card
  s.addShape(pres.ShapeType.rect, {
    name: shapeName || "section-card",
    x:1.5, y:1.2, w:7.0, h:3.25,
    fill:{color:B.blue}, line:{color:B.blue, width:0},
    shadow: shadow(),
  });
  s.addText(icon, { x:1.5, y:1.35, w:7.0, h:0.8, fontSize:36, align:"center", margin:0 });
  s.addText(title, {
    x:1.5, y:2.2, w:7.0, h:0.85,
    fontSize:28, bold:true, color:B.white, align:"center", margin:0,
  });
  s.addText(sub, {
    x:1.5, y:3.1, w:7.0, h:0.7,
    fontSize:13, color:"A8D4E8", align:"center", margin:0,
  });
}

// ─── BUILD PRESENTATION ───────────────────────────────────────────────────────
const pres = new pptxgen();
pres.layout = "LAYOUT_16x9";
pres.author = "Enshore Subsea";
pres.title  = "Lessons Learnt — Lunch & Learn";

const TOTAL = 19;

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 1 — COVER
// ═══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: B.navy };

  // Accent block left edge
  s.addShape(pres.ShapeType.rect, {
    x:0, y:0, w:0.18, h:5.625,
    fill:{color:B.orange}, line:{color:B.orange, width:0},
  });
  // Blue horizontal band lower
  s.addShape(pres.ShapeType.rect, {
    x:0.18, y:3.5, w:9.82, h:2.125,
    fill:{color:B.teal}, line:{color:B.teal, width:0},
  });
  // Light accent block upper-right
  s.addShape(pres.ShapeType.rect, {
    x:7.5, y:0, w:2.5, h:3.5,
    fill:{color:B.blue}, line:{color:B.blue, width:0},
  });

  // Headline
  s.addText("LESSONS LEARNT", {
    x:0.5, y:0.55, w:6.8, h:0.55,
    fontSize:13, bold:true, color:B.orange, charSpacing:5, margin:0,
  });
  s.addText("From Deep Ocean Days\nto Digital", {
    x:0.5, y:1.15, w:6.8, h:2.0,
    fontSize:38, bold:true, color:B.white, margin:0, lineSpacingMultiple:1.1,
  });
  s.addText("Lunch & Learn — How we capture, analyse and act on\n17 years of project intelligence", {
    x:0.5, y:3.65, w:7.0, h:0.9,
    fontSize:13, color:"A8D4E8", margin:0, lineSpacingMultiple:1.4,
  });
  s.addText("Jordan Beaton  ·  Enshore Subsea  ·  2026", {
    x:0.5, y:5.05, w:7.0, h:0.35,
    fontSize:10, color:B.grey, margin:0,
  });

  // Logo on blue block
  if (LOGO) s.addImage({ data:LOGO, x:7.65, y:0.18, w:2.15, h:1.0 });

  // Stats preview (small — these names match slide 5 for Morph)
  const prev = [
    { n:"2,990", l:"Lessons Learnt", x:7.65 },
    { n:"67",    l:"Projects",        x:8.6  },
  ];
  prev.forEach((p) => {
    s.addText(p.n, { x:p.x, y:1.6,  w:1.2, h:0.55, fontSize:22, bold:true, color:B.white, align:"center", margin:0 });
    s.addText(p.l, { x:p.x, y:2.15, w:1.2, h:0.3,  fontSize:8,  color:"A8D4E8",  align:"center", margin:0 });
  });

  s.addNotes("Cover slide. Welcome everyone. Today we're talking about lessons learnt — not the filing cabinet version, but 17 years of project intelligence now in one searchable, filterable system.");
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 2 — AGENDA
// ═══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: B.offWhite };
  addLogo(s);
  pn(s, 2, TOTAL);

  s.addShape(pres.ShapeType.rect, {
    x:0, y:0, w:3.2, h:5.625,
    fill:{color:B.navy}, line:{color:B.navy, width:0},
  });
  s.addText("AGENDA", { x:0, y:0.2, w:3.2, h:0.55, fontSize:11, bold:true, color:B.orange, charSpacing:5, align:"center", margin:0 });
  s.addText("Today's\nsession", { x:0, y:0.9, w:3.2, h:1.0, fontSize:22, bold:true, color:B.white, align:"center", margin:0 });

  const items = [
    ["01", "The Challenge", "Why the old way wasn't working"],
    ["02", "The Database", "2,990 lessons — what's actually in there"],
    ["03", "Trend Analysis", "Patterns across 17 years & 67 projects"],
    ["04", "The New System", "IMS Lessons Learnt — how it works"],
    ["05", "Before vs After", "Excel vs the new platform"],
    ["06", "Live Demo", "See it in action"],
    ["07", "What's Next", "Roadmap and how you can contribute"],
  ];
  items.forEach((item, i) => {
    const y = 0.55 + i * 0.72;
    s.addShape(pres.ShapeType.rect, {
      x:3.35, y, w:6.5, h:0.62,
      fill:{color: i % 2 === 0 ? B.white : B.grey}, line:{color:B.grey, width:0},
    });
    s.addText(item[0], { x:3.45, y, w:0.55, h:0.62, fontSize:14, bold:true, color:B.blue, valign:"middle", margin:0 });
    s.addText(item[1], { x:4.05, y: y+0.04, w:5.6, h:0.3, fontSize:12, bold:true, color:B.ink, margin:0 });
    s.addText(item[2], { x:4.05, y: y+0.34, w:5.6, h:0.24, fontSize:9, color:B.muted, margin:0 });
  });

  s.addNotes("Walk through the agenda briefly. Emphasise that this is a two-way session — we want people to start thinking about contributing their own lessons.");
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 3 — SECTION: THE CHALLENGE
// ═══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: B.navy };
  addLogo(s);
  pn(s, 3, TOTAL);
  sectionCard(s, "📁", "The Challenge", "How did we manage lessons learnt before?", "section-challenge");
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 4 — THE OLD WAY (Excel pain points)
// ═══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: B.offWhite };
  addLogo(s);
  pn(s, 4, TOTAL);

  s.addText("The Old Way: 10 Spreadsheets, Zero Visibility", {
    x:0.4, y:0.15, w:9.0, h:0.55,
    fontSize:24, bold:true, color:B.navy, margin:0,
  });
  s.addText("From 2009 to 2026, lessons learnt lived in isolated project files — never connected, rarely actioned.", {
    x:0.4, y:0.72, w:9.0, h:0.35,
    fontSize:11, color:B.muted, margin:0,
  });

  // Excel column headers parody
  s.addShape(pres.ShapeType.rect, {
    x:0.4, y:1.15, w:4.4, h:0.38,
    fill:{color:"217346"}, line:{color:"217346", width:0},
  });
  s.addText("A       B              C               D                E               F", {
    x:0.4, y:1.15, w:4.4, h:0.38,
    fontSize:8, bold:true, color:B.white, valign:"middle", margin:4,
  });
  const xlRows = [
    ["LL1","J7177","North Bardawill","Failure","Low","Delivery of 3rd party items..."],
    ["LL2","J7177","North Bardawill","Failure","Med","Document issue on vessel..."],
    ["LL3","J9022","Ensign","Success","Low","CTC logistics improved..."],
    ["LL4","J9099","Bard","Failure","High","Survey equipment delay..."],
    ["...","...","...","...","...","(2,985 more rows across 10 files)"],
  ];
  xlRows.forEach((r, i) => {
    const y = 1.55 + i * 0.34;
    const bg = i === 4 ? "FFF3CD" : i % 2 === 0 ? B.white : "F0F4F0";
    s.addShape(pres.ShapeType.rect, { x:0.4, y, w:4.4, h:0.32, fill:{color:bg}, line:{color:"D0D0D0", width:0} });
    s.addText(r.join("   "), { x:0.44, y, w:4.32, h:0.32, fontSize:7.5, color: i===4 ? B.orange : B.ink, valign:"middle", margin:0 });
  });

  // Pain points
  const pains = [
    ["🔍", "No search", "Need to open every file manually to find a relevant lesson"],
    ["🔗", "No links", "Actions raised — never tracked. Who did what? No one knows."],
    ["📊", "No analysis", "Trend analysis means 10 pivots in 10 different Excel files"],
    ["🔒", "No control", "10 versions of the 'master' — which one is actually current?"],
    ["📤", "No sharing", "Offshore teams couldn't access it. Knowledge stayed onshore."],
    ["❌", "No action loop", "Lessons noted. Lessons filed. Rarely acted on. Repeated."],
  ];
  pains.forEach((p, i) => {
    const row = i % 3;
    const col = Math.floor(i / 3);
    const x = 5.0 + col * 2.38;
    const y = 1.15 + row * 1.42;
    s.addShape(pres.ShapeType.rect, {
      x, y, w:2.25, h:1.3,
      fill:{color:B.white}, line:{color:B.grey, width:1}, shadow:cardShadow(),
    });
    s.addShape(pres.ShapeType.rect, {
      x, y, w:2.25, h:0.07,
      fill:{color:B.orange}, line:{color:B.orange, width:0},
    });
    s.addText(p[0], { x, y:y+0.08, w:2.25, h:0.4, fontSize:20, align:"center", margin:0 });
    s.addText(p[1], { x:x+0.1, y:y+0.46, w:2.06, h:0.26, fontSize:10, bold:true, color:B.navy, margin:0 });
    s.addText(p[2], { x:x+0.1, y:y+0.72, w:2.06, h:0.52, fontSize:8.5, color:B.muted, margin:0, wrap:true });
  });

  s.addNotes("The core problem: lessons learnt existed in isolation. Nobody could see across projects. The Deep Ocean → Enshore transition made this worse — files ended up in different places with different formats.");
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 5 — THE NUMBERS (stat callout — Morph target from slide 1 preview)
// ═══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: B.navy };
  addLogo(s);
  pn(s, 5, TOTAL);

  s.addText("What's Actually in the Database?", {
    x:0.5, y:0.18, w:9.0, h:0.5,
    fontSize:24, bold:true, color:B.white, margin:0,
  });
  s.addText("10 source files. One standard layout. Every lesson, every project, back to 2009.", {
    x:0.5, y:0.7, w:9.0, h:0.32,
    fontSize:12, color:"A8D4E8", margin:0,
  });

  // Big stat cards
  const stats = [
    { n:"2,990", l:"Total Lessons\nLearnt", c:B.blue,   x:0.4  },
    { n:"67",    l:"Distinct\nProjects",    c:B.orange,  x:2.9  },
    { n:"17",    l:"Years of\nData",        c:B.sky,     x:5.4  },
    { n:"10",    l:"Source\nFiles",         c:B.teal,    x:7.9  },
  ];
  stats.forEach(st => {
    s.addShape(pres.ShapeType.rect, {
      name: `stat-card-${st.l.replace(/\s/g,"")}`,
      x:st.x, y:1.15, w:2.35, h:2.4,
      fill:{color:st.c}, line:{color:st.c, width:0}, shadow:shadow(),
    });
    s.addText(st.n, {
      x:st.x, y:1.3, w:2.35, h:1.3,
      fontSize:52, bold:true, color:B.white, align:"center", margin:0,
    });
    s.addText(st.l, {
      x:st.x, y:2.55, w:2.35, h:0.75,
      fontSize:12, color:"D4ECF7", align:"center", margin:0, wrap:true,
    });
  });

  // Breakdown bullets below
  const bullets = [
    ["📅 Date Range", "2009 – 2026  (Deep Ocean days through to today)"],
    ["⭐ Top Project", "Inch Cape — 420 individual lessons"],
    ["🏭 Top Source", "Projects department — 1,476 entries (49% of total)"],
    ["⚠️ Status", "78% logged as Failures / Observations  ·  10% as Successes"],
  ];
  bullets.forEach((b, i) => {
    const y = 3.72 + i * 0.46;
    s.addShape(pres.ShapeType.rect, {
      x:0.4, y, w:9.2, h:0.4,
      fill:{color: i%2===0 ? "112A3E" : "0A1F30"}, line:{color:"1C3B52", width:0},
    });
    s.addText(b[0], { x:0.55, y, w:2.0, h:0.4, fontSize:10, bold:true, color:B.orange, valign:"middle", margin:0 });
    s.addText(b[1], { x:2.6,  y, w:6.8, h:0.4, fontSize:10, color:"C8E6F0", valign:"middle", margin:0 });
  });

  s.addNotes("Let this land. 2,990 lessons across 67 projects — this is a significant body of knowledge that Enshore has never had in one place before.");
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 6 — SECTION: TREND ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: B.navy };
  addLogo(s);
  pn(s, 6, TOTAL);
  sectionCard(s, "📈", "Trend Analysis", "What patterns emerge when you look at 17 years of data?", "section-trends");
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 7 — LESSONS BY YEAR (column chart)
// ═══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: B.offWhite };
  addLogo(s);
  pn(s, 7, TOTAL);

  s.addText("Lessons Learnt by Year", {
    x:0.4, y:0.15, w:7.5, h:0.5,
    fontSize:22, bold:true, color:B.navy, margin:0,
  });
  s.addText("Volume peaks in active offshore installation years. 2026 reflects new IMS data-entry drive.", {
    x:0.4, y:0.65, w:9.0, h:0.3,
    fontSize:11, color:B.muted, margin:0,
  });

  const chartColors = YEAR_DATA.values.map(v => v >= 300 ? B.orange : v >= 150 ? B.blue : B.sky);

  s.addChart(pres.ChartType.bar, [
    {
      name: "Lessons",
      labels: YEAR_DATA.labels,
      values: YEAR_DATA.values,
    }
  ], {
    x:0.4, y:1.05, w:9.2, h:4.3,
    barDir: "col",
    chartColors: [B.blue],
    showValue: true,
    dataLabelPosition: "outEnd",
    dataLabelFontSize: 9,
    dataLabelColor: B.ink,
    showLegend: false,
    showTitle: false,
    valAxisMaxVal: 500,
    valAxisMinVal: 0,
    valGridLine: { color: "E0E0E0", size: 0.5 },
    catGridLine: { style: "none" },
    valAxisLabelColor: B.muted,
    catAxisLabelColor: B.ink,
    valAxisLabelFontSize: 9,
    catAxisLabelFontSize: 9,
    plotAreaBorderColor: "FFFFFF",
    border: { color: "FFFFFF" },
  });

  // Annotation callout
  s.addShape(pres.ShapeType.rect, {
    x:7.6, y:1.05, w:1.95, h:0.6,
    fill:{color:B.orange}, line:{color:B.orange, width:0}, shadow:cardShadow(),
  });
  s.addText("2026: New IMS\ndata entry drive", {
    x:7.6, y:1.05, w:1.95, h:0.6,
    fontSize:8, bold:true, color:B.white, align:"center", valign:"middle", margin:0,
  });

  s.addNotes("Key story: the 2011-2014 peak reflects the big offshore wind installation years. 2016-2017 dip = quieter period. 2026 spike = we're actively entering historical data into the new system. More to come.");
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 8 — BY DEPARTMENT (horizontal bar)
// ═══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: B.offWhite };
  addLogo(s);
  pn(s, 8, TOTAL);

  s.addText("Where Do Lessons Come From?", {
    x:0.4, y:0.15, w:7.5, h:0.5,
    fontSize:22, bold:true, color:B.navy, margin:0,
  });
  s.addText("By originating department — Projects dominates, reflecting offshore installation work volumes.", {
    x:0.4, y:0.65, w:9.0, h:0.3,
    fontSize:11, color:B.muted, margin:0,
  });

  s.addChart(pres.ChartType.bar, [
    { name:"Count", labels:DEPT_LABELS, values:DEPT_VALUES }
  ], {
    x:3.2, y:1.0, w:6.5, h:4.4,
    barDir:"bar",
    chartColors:[B.blue, B.sky, B.blue, B.sky, B.blue, B.sky, B.blue],
    showValue:true,
    dataLabelPosition:"inEnd",
    dataLabelFontSize:10,
    dataLabelColor:B.white,
    showLegend:false,
    showTitle:false,
    valGridLine:{ color:"E0E0E0", size:0.5 },
    catGridLine:{ style:"none" },
    valAxisLabelColor:B.muted,
    catAxisLabelColor:B.ink,
    valAxisLabelFontSize:9,
    catAxisLabelFontSize:10,
    plotAreaBorderColor:"FFFFFF",
    border:{ color:"FFFFFF" },
  });

  // Insight card left
  s.addShape(pres.ShapeType.rect, {
    x:0.4, y:1.0, w:2.65, h:4.4,
    fill:{color:B.navy}, line:{color:B.navy, width:0}, shadow:cardShadow(),
  });
  s.addText("49%", { x:0.4, y:1.3, w:2.65, h:0.9, fontSize:44, bold:true, color:B.orange, align:"center", margin:0 });
  s.addText("of all lessons\ncome from the\nProjects team", {
    x:0.4, y:2.2, w:2.65, h:0.85,
    fontSize:12, color:B.white, align:"center", margin:0, lineSpacingMultiple:1.3,
  });
  s.addShape(pres.ShapeType.rect, {
    x:0.65, y:3.15, w:2.15, h:0.06,
    fill:{color:B.orange}, line:{color:B.orange, width:0},
  });
  s.addText("Engineering, HSE, Mobilisation\nand Planning make up\na further 19%", {
    x:0.4, y:3.3, w:2.65, h:0.85,
    fontSize:9.5, color:"A8D4E8", align:"center", margin:0,
  });
  s.addText("HSE underrepresented —\nopportunity to improve\nreporting culture", {
    x:0.4, y:4.25, w:2.65, h:0.75,
    fontSize:9, color:B.orange, align:"center", margin:0, italic:true,
  });

  s.addNotes("The big insight here is HSE is significantly underrepresented at only 55 entries out of 2,990. HSE incidents and near-misses rarely become formal lessons. That's a gap we need to close.");
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 9 — BY STAGE (top failure stages)
// ═══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: B.offWhite };
  addLogo(s);
  pn(s, 9, TOTAL);

  s.addText("When Do Things Go Wrong?", {
    x:0.4, y:0.15, w:7.5, h:0.5,
    fontSize:22, bold:true, color:B.navy, margin:0,
  });
  s.addText("Operational Issues accounts for 27% of all lessons — the largest single category.", {
    x:0.4, y:0.65, w:9.0, h:0.3,
    fontSize:11, color:B.muted, margin:0,
  });

  s.addChart(pres.ChartType.bar, [
    { name:"Count", labels:STAGE_LABELS, values:STAGE_VALUES }
  ], {
    x:3.2, y:1.05, w:6.5, h:4.3,
    barDir:"bar",
    chartColors:[B.orange, B.blue, B.sky, B.blue, B.sky, B.blue],
    showValue:true,
    dataLabelPosition:"inEnd",
    dataLabelFontSize:10,
    dataLabelColor:B.white,
    showLegend:false,
    showTitle:false,
    valGridLine:{ color:"E0E0E0", size:0.5 },
    catGridLine:{ style:"none" },
    valAxisLabelColor:B.muted,
    catAxisLabelColor:B.ink,
    valAxisLabelFontSize:9,
    catAxisLabelFontSize:10,
    plotAreaBorderColor:"FFFFFF",
    border:{ color:"FFFFFF" },
  });

  // Left insight
  s.addShape(pres.ShapeType.rect, {
    x:0.4, y:1.05, w:2.65, h:4.3,
    fill:{color:B.teal}, line:{color:B.teal, width:0}, shadow:cardShadow(),
  });
  s.addText("Top 3\nstages =", { x:0.4, y:1.2, w:2.65, h:0.7, fontSize:14, bold:true, color:B.white, align:"center", margin:0 });
  s.addText("53%", { x:0.4, y:1.9, w:2.65, h:0.9, fontSize:44, bold:true, color:B.orange, align:"center", margin:0 });
  s.addText("of all lessons", { x:0.4, y:2.8, w:2.65, h:0.32, fontSize:11, color:B.white, align:"center", margin:0 });
  const stageInsights = [
    "Ops Issues = live site\nunpredictability",
    "Mobilisation = where\nplanning meets reality",
    "Planning = assumptions\nthat don't survive contact",
  ];
  stageInsights.forEach((t, i) => {
    s.addShape(pres.ShapeType.rect, {
      x:0.52, y:3.25 + i * 0.65, w:2.4, h:0.56,
      fill:{color:"006080"}, line:{color:"006080", width:0},
    });
    s.addText(t, {
      x:0.52, y:3.25 + i * 0.65, w:2.4, h:0.56,
      fontSize:8.5, color:B.white, align:"center", valign:"middle", margin:0,
    });
  });

  s.addNotes("Operational Issues + Mobilisation + Planning = more than half of everything we've ever logged. This isn't surprising but it does tell us where to focus pre-project planning and SOP reviews.");
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 10 — CRITICALITY BREAKDOWN (donut + stat side panel)
// ═══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: B.offWhite };
  addLogo(s);
  pn(s, 10, TOTAL);

  s.addText("Criticality & Status Split", {
    x:0.4, y:0.15, w:9.0, h:0.5,
    fontSize:22, bold:true, color:B.navy, margin:0,
  });
  s.addText("Of the 2,990 lessons, 580 have unknown criticality — a data quality issue to fix in the new system.", {
    x:0.4, y:0.65, w:9.0, h:0.3,
    fontSize:11, color:B.muted, margin:0,
  });

  // Criticality donut (left)
  s.addChart(pres.ChartType.doughnut, [
    { name:"Criticality", labels:CRIT_LABELS, values:CRIT_VALUES }
  ], {
    x:0.4, y:1.05, w:4.5, h:4.3,
    chartColors:[B.blue, B.sky, B.orange, "DC2626"],
    showLabel:true,
    showValue:false,
    showPercent:true,
    showLegend:true,
    legendPos:"b",
    legendFontSize:10,
    legendColor:B.ink,
    showTitle:false,
    dataLabelFontSize:10,
    dataLabelColor:B.white,
    holeSize:55,
    plotAreaBorderColor:"FFFFFF",
  });

  // Status + insight panels right
  s.addShape(pres.ShapeType.rect, {
    x:5.1, y:1.05, w:4.5, h:1.9,
    fill:{color:B.navy}, line:{color:B.navy, width:0}, shadow:cardShadow(),
  });
  s.addText("Status of Known Records", { x:5.2, y:1.1, w:4.3, h:0.32, fontSize:11, bold:true, color:B.white, margin:0 });

  const statuses = [
    { label:"Failure / Observation", val:1957, pct:"78%", c:B.orange },
    { label:"Success",               val:250,  pct:"10%", c:B.green  },
    { label:"Closed",                val:33,   pct:"1%",  c:B.sky    },
    { label:"Open",                  val:14,   pct:"0.6%",c:"DC2626" },
  ];
  statuses.forEach((st, i) => {
    const y = 1.52 + i * 0.38;
    s.addShape(pres.ShapeType.rect, { x:5.2, y, w:0.06, h:0.28, fill:{color:st.c}, line:{color:st.c, width:0} });
    s.addText(st.label, { x:5.35, y, w:2.8, h:0.28, fontSize:9.5, color:B.white, valign:"middle", margin:0 });
    s.addText(st.pct, { x:8.1, y, w:1.3, h:0.28, fontSize:12, bold:true, color:st.c, align:"right", valign:"middle", margin:0 });
  });

  // High criticality call-out
  const insights = [
    { icon:"⚠️", head:"673 HIGH criticality lessons", body:"22% of classified records — each one a significant operational risk if ignored." },
    { icon:"💡", head:"Only 10% logged as Successes", body:"We know what goes wrong better than what goes right. Good lesson: celebrate what works." },
    { icon:"🎯", head:"Data quality opportunity", body:"580 entries (19%) have unknown criticality. Cleaning this up is a quick win in the new system." },
  ];
  insights.forEach((ins, i) => {
    const y = 3.1 + i * 0.82;
    s.addShape(pres.ShapeType.rect, {
      x:5.1, y, w:4.5, h:0.72,
      fill:{color: i===0 ? "2D1B00" : B.white}, line:{color:B.grey, width:1}, shadow:cardShadow(),
    });
    s.addText(ins.icon, { x:5.2, y, w:0.5, h:0.72, fontSize:18, valign:"middle", align:"center", margin:0 });
    s.addText(ins.head, { x:5.75, y:y+0.05, w:3.7, h:0.26, fontSize:9.5, bold:true, color: i===0 ? B.orange : B.navy, margin:0 });
    s.addText(ins.body, { x:5.75, y:y+0.34, w:3.7, h:0.33, fontSize:8.5, color: i===0 ? "C8B08A" : B.muted, margin:0, wrap:true });
  });

  s.addNotes("The 78% failure rate sounds alarming but is actually normal for LL logs — people record problems, not smooth running. The 10% success rate is what we need to grow. What went right matters as much as what went wrong.");
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 11 — KEY INSIGHTS (3 takeaways)
// ═══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: B.offWhite };
  addLogo(s);
  pn(s, 11, TOTAL);

  s.addText("Three Things the Data Is Telling Us", {
    x:0.4, y:0.18, w:9.2, h:0.5,
    fontSize:24, bold:true, color:B.navy, margin:0,
  });
  s.addText("Before we look at the new system, here's what the data says about where to focus.", {
    x:0.4, y:0.7, w:9.2, h:0.32,
    fontSize:11, color:B.muted, margin:0,
  });

  const takeaways = [
    {
      n:"01", c:B.blue, icon:"🔁",
      head:"We repeat the same mistakes",
      body:"Operational Issues and Mobilisation failures recur across projects spanning 15 years. Planning assumptions that fail on Project A are repeated on Project B two years later — because nobody checked.",
      stat:"811 Operational issues logged",
    },
    {
      n:"02", c:B.orange, icon:"🔕",
      head:"HSE lessons are under-reported",
      body:"With 1,476 lessons from Projects vs only 55 from HSEQ, there's a clear cultural gap. Safety observations, near-misses, and toolbox talk learnings rarely reach the formal log. This is a risk.",
      stat:"HSE = 1.8% of total database",
    },
    {
      n:"03", c:B.teal, icon:"💾",
      head:"Knowledge leaves when people leave",
      body:"With 10 separate files, no central search, and no ownership process — the database only works if someone knows it exists. Knowledge walks out the door with every staff transition.",
      stat:"10 disconnected source files",
    },
  ];

  takeaways.forEach((t, i) => {
    const y = 1.1 + i * 1.48;
    s.addShape(pres.ShapeType.rect, {
      x:0.4, y, w:9.2, h:1.35,
      fill:{color:B.white}, line:{color:B.grey, width:1}, shadow:cardShadow(),
    });
    s.addShape(pres.ShapeType.rect, {
      x:0.4, y, w:0.75, h:1.35,
      fill:{color:t.c}, line:{color:t.c, width:0},
    });
    s.addText(t.n, { x:0.4, y:y+0.05, w:0.75, h:0.55, fontSize:22, bold:true, color:B.white, align:"center", margin:0 });
    s.addText(t.icon, { x:0.4, y:y+0.6, w:0.75, h:0.55, fontSize:22, align:"center", margin:0 });
    s.addText(t.head, { x:1.25, y:y+0.08, w:6.3, h:0.32, fontSize:13, bold:true, color:B.navy, margin:0 });
    s.addText(t.body, { x:1.25, y:y+0.42, w:6.3, h:0.82, fontSize:9.5, color:B.muted, margin:0, wrap:true });
    // Stat badge
    s.addShape(pres.ShapeType.rect, {
      x:7.65, y:y+0.08, w:1.85, h:1.18,
      fill:{color:t.c}, line:{color:t.c, width:0},
    });
    s.addText(t.stat, {
      x:7.65, y:y+0.08, w:1.85, h:1.18,
      fontSize:9.5, bold:true, color:B.white, align:"center", valign:"middle", margin:4, wrap:true,
    });
  });

  s.addNotes("This slide is the pivot. We've diagnosed the problem from the data. Now we show the solution — the new IMS Lessons Learnt system.");
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 12 — SECTION: THE NEW SYSTEM (Morph from slide 11 → 12)
// Shape named "section-card" matches the section slides for morph
// ═══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: B.navy };
  addLogo(s);
  pn(s, 12, TOTAL);
  sectionCard(s, "🚀", "The New System", "IMS Lessons Learnt — built into the Enshore Management System", "section-ims");
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 13 — WHAT IS THE IMS LL SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: B.offWhite };
  addLogo(s);
  pn(s, 13, TOTAL);

  s.addText("What Is the IMS Lessons Learnt System?", {
    x:0.4, y:0.15, w:9.0, h:0.5,
    fontSize:22, bold:true, color:B.navy, margin:0,
  });
  s.addText("A dedicated module inside the Enshore IMS — connected to every other quality and HSE process.", {
    x:0.4, y:0.65, w:9.0, h:0.3,
    fontSize:11, color:B.muted, margin:0,
  });

  // Two-column: workflow + features
  const steps = [
    { n:"1", t:"Log It",    d:"Submit a lesson from any device — desktop, tablet or mobile — linked to a project, department, and category.", c:B.blue   },
    { n:"2", t:"Classify",  d:"Assign criticality (Critical / High / Medium / Low), stage/phase, and type. Required fields enforce data quality.", c:B.sky    },
    { n:"3", t:"Review",    d:"Line manager reviews and endorses. Notifications fire automatically — no chasing required.",                    c:B.teal   },
    { n:"4", t:"Action",    d:"Corrective or preventive actions created directly from the lesson — tracked in the Action Management module.",   c:B.orange },
    { n:"5", t:"Search",    d:"Any user can search, filter, and find relevant lessons before starting a project. Knowledge stays inside Enshore.", c:B.green  },
  ];
  steps.forEach((st, i) => {
    const y = 1.05 + i * 0.91;
    s.addShape(pres.ShapeType.rect, {
      x:0.4, y, w:4.8, h:0.82,
      fill:{color:B.white}, line:{color:B.grey, width:1}, shadow:cardShadow(),
    });
    s.addShape(pres.ShapeType.rect, {
      x:0.4, y, w:0.5, h:0.82,
      fill:{color:st.c}, line:{color:st.c, width:0},
    });
    s.addText(st.n, { x:0.4, y, w:0.5, h:0.82, fontSize:16, bold:true, color:B.white, align:"center", valign:"middle", margin:0 });
    s.addText(st.t, { x:1.02, y:y+0.06, w:4.0, h:0.28, fontSize:12, bold:true, color:B.navy, margin:0 });
    s.addText(st.d, { x:1.02, y:y+0.36, w:4.0, h:0.44, fontSize:9,  color:B.muted, margin:0, wrap:true });
    // Arrow between steps
    if (i < 4) {
      s.addText("↓", { x:0.62, y:y+0.82, w:0.4, h:0.09, fontSize:9, color:B.muted, align:"center", margin:0 });
    }
  });

  // Right panel: key features
  const feats = [
    ["🔍", "Instant Search",    "Full text search + multi-filter: project, dept, stage, criticality, date range"],
    ["📊", "Live Dashboard",    "KPIs, open counts, by-department and by-criticality summary — always current"],
    ["📤", "Export",            "One-click PDF report or Excel export of the filtered register"],
    ["📱", "Mobile Access",     "Log a lesson from site on your phone — no paper, no delay"],
    ["🔗", "Linked Actions",    "Actions created from lessons are tracked right to closure in the same system"],
    ["📧", "Auto Notifications","Email alerts to reviewers — no more chasing approvals over email"],
  ];
  feats.forEach((f, i) => {
    const row = i % 3;
    const col = Math.floor(i / 3);
    const x = 5.5 + col * 2.2;
    const y = 1.05 + row * 1.52;
    s.addShape(pres.ShapeType.rect, {
      x, y, w:2.05, h:1.4,
      fill:{color:B.white}, line:{color:B.grey, width:1}, shadow:cardShadow(),
    });
    s.addShape(pres.ShapeType.rect, {
      x, y, w:2.05, h:0.07,
      fill:{color:B.blue}, line:{color:B.blue, width:0},
    });
    s.addText(f[0], { x, y:y+0.08, w:2.05, h:0.45, fontSize:22, align:"center", margin:0 });
    s.addText(f[1], { x:x+0.1, y:y+0.52, w:1.86, h:0.3, fontSize:10, bold:true, color:B.navy, margin:0 });
    s.addText(f[2], { x:x+0.1, y:y+0.82, w:1.86, h:0.53, fontSize:8, color:B.muted, margin:0, wrap:true });
  });

  s.addNotes("Walk through the 5-step workflow. Emphasise the link to actions — this is what turns a lesson into an improvement. The system enforces that loop.");
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 14 — EXCEL vs IMS (Morph-ready: "before-card" names match slide 15)
// ═══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: B.offWhite };
  addLogo(s);
  pn(s, 14, TOTAL);

  s.addText("Before vs After", {
    x:0.4, y:0.15, w:9.0, h:0.5,
    fontSize:24, bold:true, color:B.navy, margin:0,
  });

  // Column headers
  s.addShape(pres.ShapeType.rect, {
    name:"before-header",
    x:0.4, y:0.75, w:4.5, h:0.45,
    fill:{color:"217346"}, line:{color:"217346", width:0},
  });
  s.addText("📊  Before: Excel / Shared Drive", {
    name:"before-header-text",
    x:0.4, y:0.75, w:4.5, h:0.45,
    fontSize:12, bold:true, color:B.white, valign:"middle", margin:8,
  });
  s.addShape(pres.ShapeType.rect, {
    name:"after-header",
    x:5.1, y:0.75, w:4.5, h:0.45,
    fill:{color:B.blue}, line:{color:B.blue, width:0},
  });
  s.addText("🚀  After: Enshore IMS", {
    name:"after-header-text",
    x:5.1, y:0.75, w:4.5, h:0.45,
    fontSize:12, bold:true, color:B.white, valign:"middle", margin:8,
  });

  const rows = [
    ["Access",          "Office only, VPN for remote",            "Any device, anywhere, mobile-ready"],
    ["Search",          "Open all 10 files manually",             "Instant full-text search + filters"],
    ["Data quality",    "Free-text, inconsistent fields",          "Required fields + dropdown controls"],
    ["Actions",         "None — raised in meetings, lost",         "Linked to Action Management module"],
    ["Reporting",       "Manual pivot tables per file",            "Live dashboard + one-click PDF"],
    ["Review process",  "Email thread, no audit trail",            "Structured workflow with notifications"],
    ["HSE integration", "Separate from safety processes",          "Connected to AINM, observations, PTW"],
    ["Cross-project",   "Impossible without opening all files",    "Filter by any combination of fields"],
  ];
  rows.forEach((r, i) => {
    const y = 1.3 + i * 0.54;
    const bg = i % 2 === 0 ? B.white : B.offWhite;
    // Category
    s.addShape(pres.ShapeType.rect, { x:0.4, y, w:1.25, h:0.48, fill:{color:B.grey}, line:{color:"D0D0D0", width:0} });
    s.addText(r[0], { x:0.44, y, w:1.17, h:0.48, fontSize:9, bold:true, color:B.navy, valign:"middle", margin:0 });
    // Before
    s.addShape(pres.ShapeType.rect, { x:1.66, y, w:3.24, h:0.48, fill:{color:bg}, line:{color:"D0D0D0", width:0} });
    s.addText("✗  " + r[1], { x:1.72, y, w:3.12, h:0.48, fontSize:9, color:"C0392B", valign:"middle", margin:0 });
    // After
    s.addShape(pres.ShapeType.rect, { x:5.1, y, w:4.5, h:0.48, fill:{color:bg}, line:{color:"D0D0D0", width:0} });
    s.addText("✓  " + r[2], { x:5.16, y, w:4.38, h:0.48, fontSize:9, color:B.green, valign:"middle", margin:0 });
  });

  s.addNotes("This is the key value proposition slide. Read down the 'After' column — every row is a pain removed. Pause on the HSE integration and cross-project rows — those are new capabilities that didn't exist at all before.");
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 15 — LIVE DEMO
// ═══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: B.navy };
  addLogo(s);
  pn(s, 15, TOTAL);

  s.addShape(pres.ShapeType.rect, {
    x:2.0, y:1.0, w:6.0, h:3.625,
    fill:{color:B.blue}, line:{color:B.blue, width:0}, shadow:shadow(),
  });
  s.addText("🖥️", { x:2.0, y:1.2, w:6.0, h:1.0, fontSize:44, align:"center", margin:0 });
  s.addText("Live Demo", {
    x:2.0, y:2.3, w:6.0, h:0.7,
    fontSize:32, bold:true, color:B.white, align:"center", margin:0,
  });
  s.addText("Let's open the system and explore together", {
    x:2.0, y:3.05, w:6.0, h:0.4,
    fontSize:13, color:"A8D4E8", align:"center", margin:0,
  });

  const demoSteps = ["Search for 'mobilisation' across all projects", "Filter by High criticality + 2011–2014", "Show the dashboard KPIs", "Log a new lesson live", "Show the action link"];
  demoSteps.forEach((d, i) => {
    s.addText(`${i+1}.  ${d}`, {
      x:3.0, y:3.6 + i * 0.32, w:4.0, h:0.28,
      fontSize:10, color:B.white, margin:0,
    });
  });

  s.addNotes("Open the browser at localhost:3000/lessons (or the live URL). Walk through the demo steps listed on the slide — they're there as a reminder, not to read aloud.");
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 16 — HOW YOU CAN CONTRIBUTE
// ═══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: B.offWhite };
  addLogo(s);
  pn(s, 16, TOTAL);

  s.addText("How You Can Contribute", {
    x:0.4, y:0.15, w:9.0, h:0.5,
    fontSize:22, bold:true, color:B.navy, margin:0,
  });
  s.addText("The database is only as good as the lessons people put in it. Here's what we need from you.", {
    x:0.4, y:0.67, w:9.0, h:0.32,
    fontSize:11, color:B.muted, margin:0,
  });

  const roles = [
    { role:"Everyone",            icon:"👤", c:B.blue,   items:["Log lessons as they happen — not 6 months later","Classify properly — check the criticality field","Link corrective actions before you submit"] },
    { role:"Project Managers",    icon:"📋", c:B.orange,  items:["Build LL reviews into project close-out","Share the link with clients / partners where appropriate","Review and endorse your team's submissions"] },
    { role:"Department Heads",    icon:"🏢", c:B.teal,   items:["Require LL reporting as part of mobilisation packs","Review open lessons at monthly team meetings","Call out repeat mistakes — they're in the data"] },
    { role:"HSEQ Team",           icon:"⛑️", c:B.green,  items:["Use LL to feed AINM investigations","Connect near-misses and toolbox talks to the register","Build LL into audit and compliance reporting"] },
  ];
  roles.forEach((r, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 0.4 + col * 4.85;
    const y = 1.15 + row * 2.15;
    s.addShape(pres.ShapeType.rect, {
      x, y, w:4.55, h:2.0,
      fill:{color:B.white}, line:{color:B.grey, width:1}, shadow:cardShadow(),
    });
    s.addShape(pres.ShapeType.rect, {
      x, y, w:4.55, h:0.48,
      fill:{color:r.c}, line:{color:r.c, width:0},
    });
    s.addText(r.icon + "  " + r.role, {
      x:x+0.1, y, w:4.35, h:0.48,
      fontSize:12, bold:true, color:B.white, valign:"middle", margin:0,
    });
    r.items.forEach((item, j) => {
      s.addText("→  " + item, {
        x:x+0.15, y:y+0.55+j*0.44, w:4.25, h:0.4,
        fontSize:9.5, color:B.ink, margin:0, wrap:true,
      });
    });
  });

  s.addNotes("Engagement slide. Make it clear this isn't a top-down system — the value comes from contribution. Ask if anyone has a lesson they remember right now that should go in. Usually someone does.");
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 17 — WHAT'S NEXT / ROADMAP
// ═══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: B.offWhite };
  addLogo(s);
  pn(s, 17, TOTAL);

  s.addText("What's Next", {
    x:0.4, y:0.15, w:9.0, h:0.5,
    fontSize:22, bold:true, color:B.navy, margin:0,
  });
  s.addText("Three horizons for the Lessons Learnt system over the next 12 months.", {
    x:0.4, y:0.65, w:9.0, h:0.32,
    fontSize:11, color:B.muted, margin:0,
  });

  const horizons = [
    {
      h:"Now — Data Quality",  c:B.blue, icon:"🔧",
      items:[
        "Clean up 580 unknown criticality records",
        "Verify and validate the historical 10-file import",
        "Assign owners to high-criticality lessons without actions",
        "Complete the 2026 data entry backlog",
      ],
    },
    {
      h:"3 Months — Adoption",  c:B.orange, icon:"📣",
      items:[
        "Lessons Learnt review embedded in every project close-out",
        "Monthly LL report to Senior Management",
        "Offline inspection form linked to LL submission",
        "Client-facing export template for project reports",
      ],
    },
    {
      h:"12 Months — Intelligence",  c:B.teal, icon:"🧠",
      items:[
        "AI-assisted search: 'find lessons relevant to this project type'",
        "Automatic LL suggestions on new project setup",
        "Cross-project risk pattern alerts",
        "Lessons Learnt KPIs on the IMS Home dashboard",
      ],
    },
  ];
  horizons.forEach((h, i) => {
    const x = 0.4 + i * 3.17;
    s.addShape(pres.ShapeType.rect, {
      x, y:1.05, w:3.0, h:0.48,
      fill:{color:h.c}, line:{color:h.c, width:0}, shadow:cardShadow(),
    });
    s.addText(h.icon + "  " + h.h, {
      x:x+0.08, y:1.05, w:2.84, h:0.48,
      fontSize:10.5, bold:true, color:B.white, valign:"middle", margin:0,
    });
    s.addShape(pres.ShapeType.rect, {
      x, y:1.55, w:3.0, h:3.85,
      fill:{color:B.white}, line:{color:B.grey, width:1}, shadow:cardShadow(),
    });
    h.items.forEach((item, j) => {
      s.addShape(pres.ShapeType.rect, {
        x:x+0.12, y:1.65+j*0.92, w:0.28, h:0.28,
        fill:{color:h.c}, line:{color:h.c, width:0},
      });
      s.addText(item, {
        x:x+0.48, y:1.65+j*0.92, w:2.42, h:0.75,
        fontSize:9.5, color:B.ink, margin:0, wrap:true,
      });
    });
  });

  s.addNotes("Be clear: the Now items are already in progress. The 3-month items need team buy-in — that starts today. The 12-month items are aspirational but grounded — we have the data foundation to support them.");
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 18 — KEY ASKS (3 specific actions)
// ═══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: B.navy };
  addLogo(s);
  pn(s, 18, TOTAL);

  s.addText("Three Asks Before You Leave", {
    x:0.5, y:0.25, w:9.0, h:0.55,
    fontSize:26, bold:true, color:B.white, margin:0,
  });
  s.addText("This session only matters if something changes. Here's what we're asking for.", {
    x:0.5, y:0.82, w:9.0, h:0.32,
    fontSize:12, color:"A8D4E8", margin:0,
  });

  const asks = [
    {
      n:"1", icon:"✍️", c:B.orange,
      ask:"Log one lesson this week",
      detail:"Think of a project moment that should have been captured. Go to the IMS Lessons Learnt module and log it. Takes 5 minutes. Keeps the knowledge inside Enshore.",
    },
    {
      n:"2", icon:"📢", c:B.sky,
      ask:"Tell your team the system exists",
      detail:"Share the link. Explain that this is now the place to log lessons — not a shared drive, not a project file. The system works when everyone contributes, not just Quality.",
    },
    {
      n:"3", icon:"🔍", c:B.green,
      ask:"Search it before your next project kick-off",
      detail:"Before the next project planning meeting, spend 10 minutes searching for lessons from similar projects. Filter by vessel type, operation stage, or client. Use what's already there.",
    },
  ];
  asks.forEach((ask, i) => {
    const y = 1.3 + i * 1.42;
    s.addShape(pres.ShapeType.rect, {
      x:0.5, y, w:9.0, h:1.3,
      fill:{color:"112A3E"}, line:{color:ask.c, width:2}, shadow:shadow(),
    });
    s.addShape(pres.ShapeType.rect, {
      x:0.5, y, w:0.7, h:1.3,
      fill:{color:ask.c}, line:{color:ask.c, width:0},
    });
    s.addText(ask.n, { x:0.5, y, w:0.7, h:0.65, fontSize:22, bold:true, color:"112A3E", align:"center", valign:"middle", margin:0 });
    s.addText(ask.icon, { x:0.5, y:y+0.65, w:0.7, h:0.65, fontSize:22, align:"center", valign:"middle", margin:0 });
    s.addText(ask.ask, { x:1.35, y:y+0.08, w:7.9, h:0.36, fontSize:14, bold:true, color:ask.c, margin:0 });
    s.addText(ask.detail, { x:1.35, y:y+0.5, w:7.9, h:0.73, fontSize:10, color:"C8E6F0", margin:0, wrap:true });
  });

  s.addNotes("End energetically. These three asks are concrete and immediate. If people leave with one action in mind, the session has done its job. Open the floor for questions.");
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 19 — CLOSING / Q&A
// ═══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: B.navy };

  s.addShape(pres.ShapeType.rect, {
    x:0, y:0, w:0.18, h:5.625,
    fill:{color:B.orange}, line:{color:B.orange, width:0},
  });
  s.addShape(pres.ShapeType.rect, {
    x:0.18, y:3.8, w:9.82, h:1.825,
    fill:{color:B.teal}, line:{color:B.teal, width:0},
  });
  s.addShape(pres.ShapeType.rect, {
    x:7.5, y:0, w:2.5, h:3.8,
    fill:{color:B.blue}, line:{color:B.blue, width:0},
  });

  s.addText("Thank You", {
    x:0.5, y:0.5, w:6.7, h:0.85,
    fontSize:40, bold:true, color:B.white, margin:0,
  });
  s.addText("Questions?", {
    x:0.5, y:1.45, w:6.7, h:0.6,
    fontSize:28, bold:true, color:B.orange, margin:0,
  });
  s.addText("The IMS Lessons Learnt system is live.\nLog in at your desk and let's keep 17 years of knowledge working for us.", {
    x:0.5, y:4.0, w:6.7, h:0.8,
    fontSize:12, color:"A8D4E8", margin:0, lineSpacingMultiple:1.4,
  });

  // Stats closing reminder
  [
    {n:"2,990", l:"Lessons ready\nto search", y:0.4},
    {n:"67",    l:"Projects\ncaptured",        y:1.55},
    {n:"17",    l:"Years of\nintelligence",    y:2.7},
  ].forEach(st => {
    s.addText(st.n, { x:7.55, y:st.y, w:2.35, h:0.75, fontSize:30, bold:true, color:B.white, align:"center", margin:0 });
    s.addText(st.l, { x:7.55, y:st.y+0.72, w:2.35, h:0.55, fontSize:9.5, color:"A8D4E8", align:"center", margin:0, wrap:true });
  });

  if (LOGO) s.addImage({ data:LOGO, x:7.65, y:3.25, w:2.15, h:0.65 });

  s.addNotes("Thank the room. Remind people the system is live right now. If there's time, take 2–3 questions before wrapping up.");
}

// ─── WRITE FILE ──────────────────────────────────────────────────────────────
pres.writeFile({ fileName: OUT })
  .then(async () => {
    console.log("✅  Written:", OUT);

    // ─── PATCH MORPH TRANSITIONS ────────────────────────────────────────────
    // Slides (1-indexed in pptxgenjs output order) that should receive Morph:
    //   Slide 6  — arriving after slide 5 (stats → section break): Morph makes the section card grow
    //   Slide 12 — arriving after slide 11 (insights → IMS section): fresh Morph entrance
    //   Slide 19 — arriving after slide 18 (asks → close): smooth finale
    const MORPH_SLIDES = [6, 12, 19]; // 1-indexed

    const buf = fs.readFileSync(OUT);
    const zip = await JSZip.loadAsync(buf);

    for (const slideIdx of MORPH_SLIDES) {
      const slideName = `ppt/slides/slide${slideIdx}.xml`;
      const slideFile = zip.file(slideName);
      if (!slideFile) { console.log("  ⚠️  Not found:", slideName); continue; }
      let xml = await slideFile.async("string");
      // Inject morph transition before </p:sld>
      if (!xml.includes("<p:transition")) {
        const morphXml = `<p:transition dur="1000"><p14:morph xmlns:p14="http://schemas.microsoft.com/office/powerpoint/2010/main" option="byObject"/></p:transition>`;
        xml = xml.replace("</p:sld>", morphXml + "</p:sld>");
        zip.file(slideName, xml);
        console.log("  ✅  Morph patched:", slideName);
      }
    }

    const patched = await zip.generateAsync({ type:"nodebuffer", compression:"DEFLATE" });
    fs.writeFileSync(OUT, patched);
    console.log("✅  Morph transitions patched. File ready.");
    console.log("\nSlides with Morph transitions: 6, 12, 19");
    console.log("To add more Morph transitions: open in PowerPoint, select the slide, Transitions → Morph");
    console.log("\nFor best Morph effect on section break slides, name shapes consistently across slide pairs.");
  })
  .catch(err => console.error("❌", err));
