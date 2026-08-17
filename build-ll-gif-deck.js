/**
 * Builds the Enshore Lessons Learned Lunch & Learn PowerPoint
 * from the Enshore POTX template with animated GIFs on each content slide.
 *
 * Slide structure:
 *  1  — Title slide (teal bg, Layout 5)
 *  2  — Agenda (teal bg, Layout 5)
 *  3  — Dashboard GIF (white, Layout 69)
 *  4  — Register GIF (white, Layout 69)
 *  5  — Prevention Intelligence GIF (white, Layout 69)
 *  6  — Upload to PI GIF (white, Layout 69)
 *  7  — Supporting Lessons Learned GIF (white, Layout 69)
 *  8  — Trend Analysis GIF (white, Layout 69)
 *  9  — What's Next / Call to Action (teal bg, Layout 5)
 * 10  — Thank You (Layout 89)
 */

const fs   = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const BASE_PPTX = path.join(__dirname, "Enshore_LL_LunchLearn_v3.pptx");
const GIF_DIR   = path.join(__dirname, "gifs-ll");
const WORK      = "C:\\Users\\JBeaton\\AppData\\Local\\Temp\\claude\\ll-gif-deck";
const OUT       = path.join(__dirname, "Enshore_LL_LunchLearn_GIF.pptx");

const W = 10160000;  // slide EMU width
const H = 5715000;   // slide EMU height

// ── Layout relationship IDs (these are fixed in the template) ──────────────
// Layout 5  = "1_Title Slide Green Background"  → teal/navy
// Layout 69 = "Content Slide White - Green Wave" → white + wave + Enshore logo
// Layout 89 = "THANK YOU Generic"
const LAYOUT_TEAL   = "../slideLayouts/slideLayout5.xml";
const LAYOUT_WHITE  = "../slideLayouts/slideLayout69.xml";
const LAYOUT_THANKYOU = "../slideLayouts/slideLayout89.xml";

// ── helpers ──────────────────────────────────────────────────────────────────
function ensureDir(d) { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); }
function write(p, c)  { fs.writeFileSync(p, c, "utf8"); }
function read(p)      { return fs.readFileSync(p, "utf8"); }

function gifRel(slideNum) { return `rId200`; } // each slide only has 1 GIF
function gifMediaName(n)  { return `gif${n}.gif`; }

// EMU helpers
const gifW  = W;           // fill slide width
const gifH  = H;           // fill slide height
const gifX  = 0;
const gifY  = 0;

// Title-area box on white slides (left of GIF) — GIF takes right 70%, text left 30%
// Actually we'll overlay the GIF full-slide and put a semi-transparent title bar at top
// But simpler: GIF fills full slide, title overlaid as white text at top

function titleBox(title, subtitle = "") {
  return `
  <p:sp>
    <p:nvSpPr>
      <p:cNvPr id="10" name="TitleBox"/>
      <p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr>
      <p:nvPr/>
    </p:nvSpPr>
    <p:spPr>
      <a:xfrm><a:off x="457200" y="228600"/><a:ext cx="9245600" cy="685800"/></a:xfrm>
      <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
      <a:solidFill><a:srgbClr val="006B6B"><a:alpha val="90000"/></a:srgbClr></a:solidFill>
      <a:ln><a:noFill/></a:ln>
    </p:spPr>
    <p:txBody>
      <a:bodyPr anchor="ctr"/>
      <a:lstStyle/>
      <a:p><a:r><a:rPr lang="en-GB" sz="2400" b="1" dirty="0"><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill><a:latin typeface="Calibri"/></a:rPr><a:t>${escXml(title)}</a:t></a:r></a:p>
      ${subtitle ? `<a:p><a:r><a:rPr lang="en-GB" sz="1400" dirty="0"><a:solidFill><a:srgbClr val="E0F7F7"/></a:solidFill><a:latin typeface="Calibri"/></a:rPr><a:t>${escXml(subtitle)}</a:t></a:r></a:p>` : ""}
    </p:txBody>
  </p:sp>`;
}

function escXml(s) { return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }

// GIF image shape — fills entire slide
function gifShape(rId) {
  return `
  <p:pic>
    <p:nvPicPr>
      <p:cNvPr id="20" name="GIFSlide"/>
      <p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr>
      <p:nvPr/>
    </p:nvPicPr>
    <p:blipFill>
      <a:blip r:embed="${rId}"/>
      <a:stretch><a:fillRect/></a:stretch>
    </p:blipFill>
    <p:spPr>
      <a:xfrm><a:off x="${gifX}" y="${gifY}"/><a:ext cx="${gifW}" cy="${gifH}"/></a:xfrm>
      <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
    </p:spPr>
  </p:pic>`;
}

// Text shape for teal/title slides
function textShape({ id=2, x, y, cx, cy, text, sz=2800, bold=false, color="FFFFFF", align="l", wrap="square" }) {
  return `
  <p:sp>
    <p:nvSpPr>
      <p:cNvPr id="${id}" name="txt${id}"/>
      <p:cNvSpPr txBox="1"><a:spLocks noGrp="1"/></p:cNvSpPr>
      <p:nvPr/>
    </p:nvSpPr>
    <p:spPr>
      <a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm>
      <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
      <a:noFill/>
    </p:spPr>
    <p:txBody>
      <a:bodyPr wrap="${wrap}" anchor="t"/>
      <a:lstStyle/>
      <a:p><a:pPr algn="${align}"/><a:r>
        <a:rPr lang="en-GB" sz="${sz}" b="${bold?1:0}" dirty="0">
          <a:solidFill><a:srgbClr val="${color}"/></a:solidFill>
          <a:latin typeface="Calibri"/>
        </a:rPr>
        <a:t>${escXml(text)}</a:t>
      </a:r></a:p>
    </p:txBody>
  </p:sp>`;
}

function bulletShape({ id=2, x, y, cx, cy, items, sz=1600, color="FFFFFF" }) {
  const paras = items.map(item => `
    <a:p>
      <a:pPr marL="342900" indent="-342900">
        <a:buChar char="▸"/>
      </a:pPr>
      <a:r>
        <a:rPr lang="en-GB" sz="${sz}" dirty="0">
          <a:solidFill><a:srgbClr val="${color}"/></a:solidFill>
          <a:latin typeface="Calibri"/>
        </a:rPr>
        <a:t>${escXml(item)}</a:t>
      </a:r>
    </a:p>`).join("");
  return `
  <p:sp>
    <p:nvSpPr>
      <p:cNvPr id="${id}" name="bullets${id}"/>
      <p:cNvSpPr txBox="1"><a:spLocks noGrp="1"/></p:cNvSpPr>
      <p:nvPr/>
    </p:nvSpPr>
    <p:spPr>
      <a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm>
      <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
      <a:noFill/>
    </p:spPr>
    <p:txBody>
      <a:bodyPr wrap="square" anchor="t"/>
      <a:lstStyle/>
      ${paras}
    </p:txBody>
  </p:sp>`;
}

function morphTransition() {
  return `<p:transition><p14:morph xmlns:p14="http://schemas.microsoft.com/office/powerpoint/2010/main" dur="500" inverted="0"/></p:transition>`;
}

function slideXml(spTree, layoutRel, transition = true) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
       xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
       xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
       xmlns:p14="http://schemas.microsoft.com/office/powerpoint/2010/main">
  <p:cSld><p:spTree>
    <p:nvGrpSpPr>
      <p:cNvPr id="1" name=""/>
      <p:cNvGrpSpPr/>
      <p:nvPr/>
    </p:nvGrpSpPr>
    <p:grpSpPr>
      <a:xfrm><a:off x="0" y="0"/><a:ext cx="${W}" cy="${H}"/>
        <a:chOff x="0" y="0"/><a:chExt cx="${W}" cy="${H}"/>
      </a:xfrm>
    </p:grpSpPr>
    ${spTree}
  </p:spTree></p:cSld>
  ${transition ? morphTransition() : ""}
</p:sld>`;
}

// Slide rels with optional GIF media
function slideRels(layoutRel, gifMediaName = null, extraRels = "") {
  const gifRel = gifMediaName
    ? `<Relationship Id="rId200" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/${gifMediaName}"/>`
    : "";
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="${layoutRel}"/>
  ${gifRel}
  ${extraRels}
</Relationships>`;
}

// ── Build slides ──────────────────────────────────────────────────────────────

const slides = [

  // ── Slide 1: Title ──────────────────────────────────────────────────────
  {
    layout: LAYOUT_TEAL,
    gif: null,
    xml: slideXml(`
      ${textShape({ id:2, x:686000, y:1620000, cx:8788000, cy:800000,
        text:"Lessons Learned", sz:4400, bold:true, color:"FFFFFF", align:"ctr" })}
      ${textShape({ id:3, x:686000, y:2500000, cx:8788000, cy:500000,
        text:"IMS Module Walkthrough", sz:2400, bold:false, color:"E0F7F7", align:"ctr" })}
      ${textShape({ id:4, x:686000, y:3200000, cx:8788000, cy:400000,
        text:"Lunch & Learn  ·  Enshore Subsea", sz:1600, bold:false, color:"B2EBEB", align:"ctr" })}
    `, LAYOUT_TEAL),
  },

  // ── Slide 2: Agenda ─────────────────────────────────────────────────────
  {
    layout: LAYOUT_TEAL,
    gif: null,
    xml: slideXml(`
      ${textShape({ id:2, x:686000, y:457200, cx:8788000, cy:600000,
        text:"Today's Agenda", sz:3600, bold:true, color:"FFFFFF", align:"l" })}
      ${bulletShape({ id:3, x:686000, y:1200000, cx:8788000, cy:4000000,
        items:[
          "Dashboard  —  Your at-a-glance view of 2,990 captured lessons",
          "Register  —  Browse & filter the full lessons database",
          "Prevention Intelligence  —  AI-driven analysis of your lesson bank",
          "Upload to Prevention Intelligence  —  Feed project documents for instant insight",
          "Supporting Lessons Learned  —  Drill into lessons linked to findings",
          "Trend Analysis  —  Spot patterns across projects and disciplines",
        ], sz:1800, color:"FFFFFF" })}
    `, LAYOUT_TEAL),
  },

  // ── Slide 3: Dashboard GIF ───────────────────────────────────────────────
  {
    layout: LAYOUT_WHITE,
    gif: "01_dashboard.gif",
    xml: slideXml(`
      ${gifShape("rId200")}
      ${titleBox("Dashboard", "Your live command centre — 2,990 lessons across 67 projects")}
    `, LAYOUT_WHITE),
  },

  // ── Slide 4: Register GIF ────────────────────────────────────────────────
  {
    layout: LAYOUT_WHITE,
    gif: "02_register.gif",
    xml: slideXml(`
      ${gifShape("rId200")}
      ${titleBox("Lessons Register", "Filter, search and review every captured lesson in one place")}
    `, LAYOUT_WHITE),
  },

  // ── Slide 5: Prevention Intelligence GIF ────────────────────────────────
  {
    layout: LAYOUT_WHITE,
    gif: "03_prevention_intelligence.gif",
    xml: slideXml(`
      ${gifShape("rId200")}
      ${titleBox("Prevention Intelligence", "AI analyses your full lesson bank and generates an actionable prevention brief")}
    `, LAYOUT_WHITE),
  },

  // ── Slide 6: Upload to PI GIF ────────────────────────────────────────────
  {
    layout: LAYOUT_WHITE,
    gif: "04_upload_to_pi.gif",
    xml: slideXml(`
      ${gifShape("rId200")}
      ${titleBox("Upload to Prevention Intelligence", "Drop any project document — procedures, reports, NCRs — for instant cross-reference analysis")}
    `, LAYOUT_WHITE),
  },

  // ── Slide 7: Supporting Lessons Learned GIF ─────────────────────────────
  {
    layout: LAYOUT_WHITE,
    gif: "05_supporting_lessons.gif",
    xml: slideXml(`
      ${gifShape("rId200")}
      ${titleBox("Supporting Lessons Learned", "See exactly which lessons informed a finding or recommendation")}
    `, LAYOUT_WHITE),
  },

  // ── Slide 8: Trend Analysis GIF ─────────────────────────────────────────
  {
    layout: LAYOUT_WHITE,
    gif: "06_trend_analysis.gif",
    xml: slideXml(`
      ${gifShape("rId200")}
      ${titleBox("Trend Analysis", "Visualise lesson patterns by discipline, category, project and time")}
    `, LAYOUT_WHITE),
  },

  // ── Slide 9: Call to Action ───────────────────────────────────────────────
  {
    layout: LAYOUT_TEAL,
    gif: null,
    xml: slideXml(`
      ${textShape({ id:2, x:686000, y:800000, cx:8788000, cy:700000,
        text:"How to Get Access", sz:3600, bold:true, color:"FFFFFF", align:"l" })}
      ${bulletShape({ id:3, x:686000, y:1700000, cx:8788000, cy:2800000,
        items:[
          "Visit the IMS login page and click Request Access",
          "Your request is reviewed and approved by the system administrator",
          "You will receive an email confirmation with your login credentials",
          "Access levels: View-only · Contributor · Project Admin",
        ], sz:1900, color:"FFFFFF" })}
      ${textShape({ id:4, x:686000, y:4600000, cx:8788000, cy:600000,
        text:"Questions? Speak to Jordan Beaton  |  jbeaton@enshoresubsea.com",
        sz:1500, bold:false, color:"B2EBEB", align:"l" })}
    `, LAYOUT_TEAL),
  },

  // ── Slide 10: Thank You ───────────────────────────────────────────────────
  {
    layout: LAYOUT_THANKYOU,
    gif: null,
    xml: slideXml(`
      ${textShape({ id:2, x:686000, y:1800000, cx:8788000, cy:900000,
        text:"Thank You", sz:5400, bold:true, color:"FFFFFF", align:"ctr" })}
      ${textShape({ id:3, x:686000, y:2900000, cx:8788000, cy:500000,
        text:"Enshore IMS  ·  Lessons Learned Module", sz:1800, bold:false, color:"E0F7F7", align:"ctr" })}
    `, LAYOUT_THANKYOU),
  },
];

// ── Assemble the deck ─────────────────────────────────────────────────────────

console.log("📂 Extracting base PPTX to work directory...");
if (fs.existsSync(WORK)) fs.rmSync(WORK, { recursive: true, force: true });
fs.mkdirSync(WORK, { recursive: true });
execSync(
  `powershell -NoProfile -Command "Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::ExtractToDirectory('${BASE_PPTX}', '${WORK}')"`,
  { shell: "cmd.exe" }
);

// Remove old slide files
const slidesDir = path.join(WORK, "ppt", "slides");
const relsDir   = path.join(slidesDir, "_rels");
fs.readdirSync(slidesDir).filter(f => f.match(/^slide\d+\.xml$/)).forEach(f => fs.unlinkSync(path.join(slidesDir, f)));
fs.readdirSync(relsDir).filter(f => f.match(/^slide\d+\.xml\.rels$/)).forEach(f => fs.unlinkSync(path.join(relsDir, f)));

// Write slide XMLs and rels
slides.forEach((slide, idx) => {
  const n = idx + 1;
  write(path.join(slidesDir, `slide${n}.xml`), slide.xml);
  write(path.join(relsDir, `slide${n}.xml.rels`), slideRels(slide.layout, slide.gif || null));
});

// Copy GIFs to ppt/media
console.log("🎬 Copying GIFs to media folder...");
const mediaDir = path.join(WORK, "ppt", "media");
slides.forEach(slide => {
  if (slide.gif) {
    const src = path.join(GIF_DIR, slide.gif);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(mediaDir, slide.gif));
      console.log(`  ✅ ${slide.gif} (${(fs.statSync(src).size/1024/1024).toFixed(1)} MB)`);
    } else {
      console.warn(`  ⚠️  Missing: ${slide.gif}`);
    }
  }
});

// Update presentation.xml — rebuild sldIdLst
console.log("📝 Updating presentation.xml...");
let presXml = read(path.join(WORK, "ppt", "presentation.xml"));
const newSldIdLst = `<p:sldIdLst>${slides.map((_,i) => `<p:sldId id="${300+i}" r:id="rId${100+i}"/>`).join("")}</p:sldIdLst>`;
presXml = presXml.replace(/<p:sldIdLst>[\s\S]*?<\/p:sldIdLst>/, newSldIdLst);
write(path.join(WORK, "ppt", "presentation.xml"), presXml);

// Update presentation.xml.rels
console.log("📝 Updating presentation.xml.rels...");
let presRels = read(path.join(WORK, "ppt", "_rels", "presentation.xml.rels"));
presRels = presRels.replace(/<Relationship[^>]*Target="slides\/slide\d+\.xml"[^/]*\/>/g, "");
const newSlideRels = slides.map((_,i) =>
  `<Relationship Id="rId${100+i}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${i+1}.xml"/>`
).join("\n  ");
presRels = presRels.replace("</Relationships>", `  ${newSlideRels}\n</Relationships>`);
write(path.join(WORK, "ppt", "_rels", "presentation.xml.rels"), presRels);

// Fix [Content_Types].xml — set presentation type + add GIFs + remove orphan slides
console.log("📝 Fixing [Content_Types].xml...");
let ct = read(path.join(WORK, "[Content_Types].xml"));
ct = ct.replace('presentationml.template.main+xml', 'presentationml.presentation.main+xml');

// Remove old slide overrides
for (let i = 1; i <= 20; i++) {
  ct = ct.replace(`<Override PartName="/ppt/slides/slide${i}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`, "");
}
// Add gif default type if not present
if (!ct.includes('Extension="gif"')) {
  ct = ct.replace('<Default Extension="png"', '<Default Extension="gif" ContentType="image/gif"/><Default Extension="png"');
}
// Add correct slide overrides before </Types>
const slideOverrides = slides.map((_,i) =>
  `<Override PartName="/ppt/slides/slide${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`
).join("");
ct = ct.replace("</Types>", `${slideOverrides}</Types>`);
write(path.join(WORK, "[Content_Types].xml"), ct);

// ── Zip it up ─────────────────────────────────────────────────────────────────
console.log(`\n📦 Zipping to ${OUT}...`);
if (fs.existsSync(OUT)) fs.unlinkSync(OUT);

const zipCmd = `powershell -NoProfile -Command "` +
  `Add-Type -AssemblyName System.IO.Compression; ` +
  `Add-Type -AssemblyName System.IO.Compression.FileSystem; ` +
  `[System.IO.Compression.ZipFile]::CreateFromDirectory('${WORK}', '${OUT}', [System.IO.Compression.CompressionLevel]::Optimal, $false)"`;
execSync(zipCmd, { shell: "cmd.exe" });

const sizeMB = (fs.statSync(OUT).size / 1024 / 1024).toFixed(1);
console.log(`\n🎉 Done! ${path.basename(OUT)} — ${sizeMB} MB`);
console.log(`   ${slides.length} slides · 6 animated GIFs · Enshore template`);
