/**
 * Builds the Enshore Lessons Learned Lunch & Learn PowerPoint.
 * Clean, professional layout: Enshore template + properly sized screenshots.
 *
 * Slides:
 *  1  — Title (teal, Layout 5)
 *  2  — The Story (teal, Layout 5) — why this session
 *  3  — Dashboard
 *  4  — Register
 *  5  — Prevention Intelligence (before)
 *  6  — Prevention Intelligence (after — results)
 *  7  — Upload to Prevention Intelligence
 *  8  — Supporting Lessons Learned
 *  9  — Trend Analysis
 * 10  — How to Request Access
 * 11  — Thank You (Layout 89)
 */

const fs   = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const BASE_PPTX = path.join(__dirname, "Enshore_LL_LunchLearn_v3.pptx");
const SHOTS     = path.join(__dirname, "screenshots-ll-final");
const WORK      = "C:\\Users\\JBeaton\\AppData\\Local\\Temp\\claude\\ll-clean-deck";
const OUT       = path.join(__dirname, "Enshore_LL_LunchLearn_Clean.pptx");

// Slide canvas (EMU)
const SW = 10160000;
const SH = 5715000;

// Layout paths (relative from slide to layout)
const L_TEAL     = "../slideLayouts/slideLayout5.xml";
const L_WHITE    = "../slideLayouts/slideLayout69.xml";
const L_THANKYOU = "../slideLayouts/slideLayout89.xml";

// ── helpers ──────────────────────────────────────────────────────────────────
function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
function write(p, c) { fs.writeFileSync(p, c, "utf8"); }
function read(p)     { return fs.readFileSync(p, "utf8"); }

// ── XML primitives ────────────────────────────────────────────────────────────

function txt({ id, x, y, cx, cy, text, sz = 1800, bold = false, color = "FFFFFF",
               align = "l", anchor = "t", wrap = "square", font = "Calibri", italic = false }) {
  return `<p:sp>
    <p:nvSpPr>
      <p:cNvPr id="${id}" name="t${id}"/><p:cNvSpPr txBox="1"><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr/>
    </p:nvSpPr>
    <p:spPr>
      <a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm>
      <a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/>
    </p:spPr>
    <p:txBody>
      <a:bodyPr wrap="${wrap}" anchor="${anchor}"/>
      <a:lstStyle/>
      <a:p><a:pPr algn="${align}"/><a:r>
        <a:rPr lang="en-GB" sz="${sz}" b="${bold ? 1 : 0}" i="${italic ? 1 : 0}" dirty="0">
          <a:solidFill><a:srgbClr val="${color}"/></a:solidFill>
          <a:latin typeface="${font}"/>
        </a:rPr>
        <a:t>${esc(text)}</a:t>
      </a:r></a:p>
    </p:txBody>
  </p:sp>`;
}

function bullets({ id, x, y, cx, cy, items, sz = 1700, color = "FFFFFF", markerColor = null }) {
  const mc = markerColor || color;
  const paras = items.map((item, i) => {
    const [label, ...rest] = item.includes("::") ? item.split("::") : [null, item];
    const body = rest.length ? rest.join("::") : item;
    return `<a:p>
      <a:pPr marL="342900" indent="-342900" spc="80"><a:buClr><a:srgbClr val="${mc}"/></a:buClr><a:buFont typeface="Arial" charset="0"/><a:buChar char="▸"/></a:pPr>
      ${label ? `<a:r><a:rPr lang="en-GB" sz="${sz}" b="1" dirty="0"><a:solidFill><a:srgbClr val="${color}"/></a:solidFill><a:latin typeface="Calibri"/></a:rPr><a:t>${esc(label + "  ")}</a:t></a:r><a:r><a:rPr lang="en-GB" sz="${sz}" b="0" dirty="0"><a:solidFill><a:srgbClr val="${color}"/></a:solidFill><a:latin typeface="Calibri"/></a:rPr><a:t>${esc(body)}</a:t></a:r>` :
      `<a:r><a:rPr lang="en-GB" sz="${sz}" b="0" dirty="0"><a:solidFill><a:srgbClr val="${color}"/></a:solidFill><a:latin typeface="Calibri"/></a:rPr><a:t>${esc(body)}</a:t></a:r>`}
    </a:p>`;
  }).join("");
  return `<p:sp>
    <p:nvSpPr>
      <p:cNvPr id="${id}" name="b${id}"/><p:cNvSpPr txBox="1"><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr/>
    </p:nvSpPr>
    <p:spPr>
      <a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm>
      <a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/>
    </p:spPr>
    <p:txBody><a:bodyPr wrap="square" anchor="t"/><a:lstStyle/>${paras}</p:txBody>
  </p:sp>`;
}

function rect({ id, x, y, cx, cy, fill, alpha = 100000, r = 0 }) {
  const geom = r > 0 ? `roundRect` : `rect`;
  return `<p:sp>
    <p:nvSpPr>
      <p:cNvPr id="${id}" name="r${id}"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr/>
    </p:nvSpPr>
    <p:spPr>
      <a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm>
      <a:prstGeom prst="${geom}"><a:avLst/></a:prstGeom>
      <a:solidFill><a:srgbClr val="${fill}"><a:alpha val="${alpha}"/></a:srgbClr></a:solidFill>
      <a:ln><a:noFill/></a:ln>
    </p:spPr>
    <p:txBody><a:bodyPr/><a:lstStyle/><a:p/></p:txBody>
  </p:sp>`;
}

// Image shape — img positioned within x,y,cx,cy
function img({ id, rId, x, y, cx, cy }) {
  return `<p:pic>
    <p:nvPicPr>
      <p:cNvPr id="${id}" name="img${id}"/>
      <p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr>
      <p:nvPr/>
    </p:nvPicPr>
    <p:blipFill>
      <a:blip r:embed="${rId}" cstate="print"/>
      <a:stretch><a:fillRect/></a:stretch>
    </p:blipFill>
    <p:spPr>
      <a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm>
      <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
      <a:ln><a:noFill/></a:ln>
    </p:spPr>
  </p:pic>`;
}

function morph() {
  return `<p:transition><p14:morph xmlns:p14="http://schemas.microsoft.com/office/powerpoint/2010/main" dur="600" inverted="0"/></p:transition>`;
}

function slide(shapes, layout, transition = true) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
       xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
       xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
       xmlns:p14="http://schemas.microsoft.com/office/powerpoint/2010/main">
  <p:cSld><p:spTree>
    <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
    <p:grpSpPr><a:xfrm>
      <a:off x="0" y="0"/><a:ext cx="${SW}" cy="${SH}"/>
      <a:chOff x="0" y="0"/><a:chExt cx="${SW}" cy="${SH}"/>
    </a:xfrm></p:grpSpPr>
    ${shapes}
  </p:spTree></p:cSld>
  ${transition ? morph() : ""}
</p:sld>`;
}

function rels(layout, mediaRels = []) {
  const mRels = mediaRels.map(m =>
    `<Relationship Id="${m.rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/${m.file}"/>`
  ).join("\n  ");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="${layout}"/>
  ${mRels}
</Relationships>`;
}

// ── Screenshot slide layout ───────────────────────────────────────────────────
// White slide: title bar top, screenshot fills rest, Enshore layout handles wave/logo
//
// Title bar: full width, 76px (692640 EMU) tall, teal
// Screenshot: x=152400 (1cm margins each side), y=title+gap, cx=9855200, proportional height
// Caption bar: below screenshot if needed

const TITLE_BAR_H = 724000;    // height of teal title band
const TITLE_BAR_Y = 304800;    // from top (0.333")
const IMG_Y       = 1143000;   // image starts here (just below title bar)
const IMG_X       = 228600;    // 0.25" left margin
const IMG_CX      = 9702800;   // full width minus margins (9702800 = SW - 2*228600)
const IMG_CY      = SH - IMG_Y - 152400; // fill to near-bottom

function screenshotSlide({ title, subtitle = "", shotFile, shotRId, layout = L_WHITE, extraShapes = "" }) {
  const titleBar = rect({ id: 10, x: 0, y: TITLE_BAR_Y, cx: SW, cy: TITLE_BAR_H, fill: "006E6E", alpha: 100000 });
  const titleTxt = txt({ id: 11, x: 152400, y: TITLE_BAR_Y + 60000, cx: SW - 304800, cy: TITLE_BAR_H - 60000,
    text: title, sz: 2400, bold: true, color: "FFFFFF", align: "l", anchor: "ctr" });
  const subTxt = subtitle ? txt({ id: 12, x: 152400, y: TITLE_BAR_Y + TITLE_BAR_H + 30000, cx: SW - 304800, cy: 280000,
    text: subtitle, sz: 1400, bold: false, color: "404040", align: "l", italic: true }) : "";
  const subOffset = subtitle ? 320000 : 0;
  const imgShape = shotFile ? img({ id: 20, rId: shotRId,
    x: IMG_X, y: IMG_Y + subOffset, cx: IMG_CX, cy: IMG_CY - subOffset }) : "";

  return slide(`${titleBar}${titleTxt}${subTxt}${imgShape}${extraShapes}`, layout);
}

// ── Stat badge (for title slide) ─────────────────────────────────────────────
function statBadge({ id, x, y, num, label, numColor = "006E6E", labelColor = "FFFFFF" }) {
  const badgeW = 1981200, badgeH = 990600;
  return `
  ${rect({ id: id, x, y, cx: badgeW, cy: badgeH, fill: "FFFFFF", alpha: 20000, r: 1 })}
  ${txt({ id: id + 50, x: x + 60000, y: y + 60000, cx: badgeW - 120000, cy: 550000,
    text: num, sz: 3600, bold: true, color: numColor, align: "ctr", anchor: "ctr" })}
  ${txt({ id: id + 51, x: x + 60000, y: y + 620000, cx: badgeW - 120000, cy: 330000,
    text: label, sz: 1200, bold: false, color: labelColor, align: "ctr", anchor: "ctr" })}`;
}

// ── Define all slides ─────────────────────────────────────────────────────────

function buildSlides(shots) {
  // shots = { dashboard, register, pi_before, pi_after, upload, supporting, trend, login }

  return [

    // ── 1: Title ─────────────────────────────────────────────────────────────
    {
      layout: L_TEAL,
      mediaRels: [],
      xml: slide(`
        ${txt({ id: 2, x: 609600, y: 1219200, cx: 8940800, cy: 914400,
          text: "Lessons Learned", sz: 5400, bold: true, color: "FFFFFF", align: "ctr", anchor: "ctr" })}
        ${txt({ id: 3, x: 609600, y: 2200000, cx: 8940800, cy: 500000,
          text: "IMS Module Walkthrough", sz: 2600, bold: false, color: "D4F5F5", align: "ctr" })}
        ${txt({ id: 4, x: 609600, y: 2790000, cx: 8940800, cy: 380000,
          text: "Lunch & Learn  ·  Enshore Subsea  ·  2026", sz: 1600, bold: false, color: "A0E0E0", align: "ctr" })}
        ${statBadge({ id: 5, x: 1219200, y: 3600000, num: "2,990", label: "Lessons Captured", numColor: "D4F5F5" })}
        ${statBadge({ id: 8, x: 3505800, y: 3600000, num: "67", label: "Projects", numColor: "D4F5F5" })}
        ${statBadge({ id: 11, x: 5792400, y: 3600000, num: "AI", label: "Prevention Intelligence", numColor: "D4F5F5" })}
        ${statBadge({ id: 14, x: 8079000, y: 3600000, num: "Live", label: "Real-Time Dashboard", numColor: "D4F5F5" })}
      `, L_TEAL),
    },

    // ── 2: The Story ─────────────────────────────────────────────────────────
    {
      layout: L_TEAL,
      mediaRels: [],
      xml: slide(`
        ${txt({ id: 2, x: 609600, y: 457200, cx: 8940800, cy: 685800,
          text: "Why Are We Here?", sz: 3600, bold: true, color: "FFFFFF", align: "l" })}
        ${txt({ id: 3, x: 609600, y: 1270000, cx: 8940800, cy: 380000,
          text: "Enshore has captured 2,990 lessons learned across 67 projects — built and maintained at zero additional cost.",
          sz: 1700, bold: false, color: "D4F5F5", align: "l" })}
        ${bullets({ id: 4, x: 609600, y: 1900000, cx: 8940800, cy: 2200000,
          items: [
            "The data exists — but it has been hard to analyse in a spreadsheet",
            "Today we're moving from data storage to active intelligence",
            "Prevention Intelligence uses AI to turn your lesson bank into prevention briefs",
            "Any team member can query, filter and learn from 67 projects instantly",
            "This session is your tour of what the system can do for you",
          ], sz: 1700, color: "FFFFFF", markerColor: "A0E0E0" })}
      `, L_TEAL),
    },

    // ── 3: Dashboard ─────────────────────────────────────────────────────────
    {
      layout: L_WHITE,
      mediaRels: shots.dashboard ? [{ rId: "rId10", file: "shot_dashboard.png" }] : [],
      xml: screenshotSlide({
        title: "Dashboard",
        subtitle: "Your at-a-glance view — live KPIs, recent lessons and module summary across all 67 projects",
        shotFile: shots.dashboard,
        shotRId: "rId10",
        layout: L_WHITE,
      }),
    },

    // ── 4: Register ──────────────────────────────────────────────────────────
    {
      layout: L_WHITE,
      mediaRels: shots.register ? [{ rId: "rId10", file: "shot_register.png" }] : [],
      xml: screenshotSlide({
        title: "Lessons Register",
        subtitle: "Browse, filter and search every one of the 2,990 captured lessons — by project, discipline, category and more",
        shotFile: shots.register,
        shotRId: "rId10",
        layout: L_WHITE,
      }),
    },

    // ── 5: Prevention Intelligence — input ────────────────────────────────────
    {
      layout: L_WHITE,
      mediaRels: shots.pi_before ? [{ rId: "rId10", file: "shot_pi_before.png" }] : [],
      xml: screenshotSlide({
        title: "Prevention Intelligence",
        subtitle: "Describe what you want to prevent — the AI analyses your full lesson bank and generates a targeted prevention brief",
        shotFile: shots.pi_before,
        shotRId: "rId10",
        layout: L_WHITE,
      }),
    },

    // ── 6: Prevention Intelligence — results ──────────────────────────────────
    {
      layout: L_WHITE,
      mediaRels: shots.pi_after ? [{ rId: "rId10", file: "shot_pi_after.png" }] : [],
      xml: screenshotSlide({
        title: "Prevention Intelligence — Results",
        subtitle: "Actionable prevention brief generated in real time — root causes, recommendations and supporting lessons from your own project history",
        shotFile: shots.pi_after,
        shotRId: "rId10",
        layout: L_WHITE,
      }),
    },

    // ── 7: Upload to Prevention Intelligence ─────────────────────────────────
    {
      layout: L_WHITE,
      mediaRels: shots.upload ? [{ rId: "rId10", file: "shot_upload.png" }] : [],
      xml: screenshotSlide({
        title: "Upload to Prevention Intelligence",
        subtitle: "Drop in any project document — procedures, reports, NCRs — for instant cross-reference against the full lesson bank",
        shotFile: shots.upload,
        shotRId: "rId10",
        layout: L_WHITE,
      }),
    },

    // ── 8: Create a Lesson ───────────────────────────────────────────────────
    {
      layout: L_WHITE,
      mediaRels: shots.create ? [{ rId: "rId10", file: "shot_supporting.png" }] : [],
      xml: screenshotSlide({
        title: "Logging a New Lesson",
        subtitle: "Capture lessons in real time — project, discipline, category, root cause, action owner and follow-up status all in one form",
        shotFile: shots.create,
        shotRId: "rId10",
        layout: L_WHITE,
      }),
    },

    // ── 9: Trend Analysis ────────────────────────────────────────────────────
    {
      layout: L_WHITE,
      mediaRels: shots.trend ? [{ rId: "rId10", file: "shot_trend.png" }] : [],
      xml: screenshotSlide({
        title: "Trend Analysis",
        subtitle: "Visualise patterns across projects, disciplines and time — spot where lessons cluster and where prevention effort should focus",
        shotFile: shots.trend,
        shotRId: "rId10",
        layout: L_WHITE,
      }),
    },

    // ── 10: How to Request Access ─────────────────────────────────────────────
    {
      layout: L_WHITE,
      mediaRels: shots.login ? [{ rId: "rId10", file: "shot_login.png" }] : [],
      xml: slide(`
        ${rect({ id: 10, x: 0, y: TITLE_BAR_Y, cx: SW, cy: TITLE_BAR_H, fill: "006E6E" })}
        ${txt({ id: 11, x: 152400, y: TITLE_BAR_Y + 60000, cx: SW - 304800, cy: TITLE_BAR_H - 60000,
          text: "How to Request Access", sz: 2400, bold: true, color: "FFFFFF", align: "l", anchor: "ctr" })}
        ${shots.login ? img({ id: 20, rId: "rId10",
          x: 5334000, y: 1143000, cx: 4597400, cy: IMG_CY }) : ""}
        ${bullets({ id: 30, x: 304800, y: 1250000, cx: 4800000, cy: 3800000,
          items: [
            "Visit the IMS login page",
            "Click Request Access below the login form",
            "Your request is reviewed by the system administrator",
            "You will receive a confirmation email with your login credentials",
            "Access levels available:  View-only  ·  Contributor  ·  Project Admin",
          ], sz: 1700, color: "333333", markerColor: "006E6E" })}
        ${txt({ id: 40, x: 304800, y: 4900000, cx: 9550400, cy: 400000,
          text: "Questions? Contact Jordan Beaton  —  jbeaton@enshoresubsea.com",
          sz: 1400, bold: false, color: "888888", align: "l", italic: true })}
      `, L_WHITE),
    },

    // ── 11: Thank You ────────────────────────────────────────────────────────
    {
      layout: L_THANKYOU,
      mediaRels: [],
      xml: slide(`
        ${txt({ id: 2, x: 609600, y: 1600000, cx: 8940800, cy: 1100000,
          text: "Thank You", sz: 6000, bold: true, color: "FFFFFF", align: "ctr", anchor: "ctr" })}
        ${txt({ id: 3, x: 609600, y: 2900000, cx: 8940800, cy: 500000,
          text: "Enshore IMS  ·  Lessons Learned Module", sz: 2000, bold: false, color: "D4F5F5", align: "ctr" })}
        ${txt({ id: 4, x: 609600, y: 3550000, cx: 8940800, cy: 400000,
          text: "jbeaton@enshoresubsea.com", sz: 1500, bold: false, color: "A0E0E0", align: "ctr" })}
      `, L_THANKYOU),
    },
  ];
}

// ── Assemble ──────────────────────────────────────────────────────────────────

function assembleShots() {
  const map = {
    dashboard:  "01_dashboard.png",
    register:   "02_register.png",
    pi_before:  "03_prevention_intel_before.png",
    pi_after:   "03_prevention_intel_after.png",
    upload:     "04_upload_results.png",
    supporting: "05_supporting.png",
    create:     "05_create.png",
    trend:      "06_trend_analysis.png",
    login:      "07_login.png",
  };
  const result = {};
  for (const [key, file] of Object.entries(map)) {
    const full = path.join(SHOTS, file);
    result[key] = fs.existsSync(full) ? file : null;
    if (!result[key]) console.warn(`  ⚠️  Missing screenshot: ${file}`);
  }
  return result;
}

(async () => {
  console.log("📂 Extracting base PPTX...");
  if (fs.existsSync(WORK)) fs.rmSync(WORK, { recursive: true, force: true });
  fs.mkdirSync(WORK, { recursive: true });
  execSync(
    `powershell -NoProfile -Command "Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::ExtractToDirectory('${BASE_PPTX}', '${WORK}')"`,
    { shell: "cmd.exe" }
  );

  const shots = assembleShots();
  const slides = buildSlides(shots);

  // Copy screenshots to ppt/media
  console.log("\n🖼  Copying screenshots to media...");
  const mediaDir = path.join(WORK, "ppt", "media");
  const shotMap = {
    "shot_dashboard.png":  shots.dashboard,
    "shot_register.png":   shots.register,
    "shot_pi_before.png":  shots.pi_before,
    "shot_pi_after.png":   shots.pi_after,
    "shot_upload.png":     shots.upload,
    "shot_supporting.png": shots.create,
    "shot_trend.png":      shots.trend,
    "shot_login.png":      shots.login,
  };
  for (const [dest, src] of Object.entries(shotMap)) {
    if (src) {
      fs.copyFileSync(path.join(SHOTS, src), path.join(mediaDir, dest));
      console.log(`  ✅ ${dest}`);
    }
  }

  // Remove old slides
  const slidesDir = path.join(WORK, "ppt", "slides");
  const relsDir   = path.join(slidesDir, "_rels");
  fs.readdirSync(slidesDir).filter(f => /^slide\d+\.xml$/.test(f)).forEach(f => fs.unlinkSync(path.join(slidesDir, f)));
  fs.readdirSync(relsDir).filter(f => /^slide\d+\.xml\.rels$/.test(f)).forEach(f => fs.unlinkSync(path.join(relsDir, f)));

  // Write new slides
  console.log("\n📝 Writing slides...");
  slides.forEach((s, i) => {
    const n = i + 1;
    write(path.join(slidesDir, `slide${n}.xml`), s.xml);
    write(path.join(relsDir,   `slide${n}.xml.rels`), rels(s.layout, s.mediaRels));
    console.log(`  Slide ${n}`);
  });

  // Update presentation.xml
  let presXml = read(path.join(WORK, "ppt", "presentation.xml"));
  const sldIdLst = `<p:sldIdLst>${slides.map((_,i) => `<p:sldId id="${300+i}" r:id="rId${100+i}"/>`).join("")}</p:sldIdLst>`;
  presXml = presXml.replace(/<p:sldIdLst>[\s\S]*?<\/p:sldIdLst>/, sldIdLst);
  write(path.join(WORK, "ppt", "presentation.xml"), presXml);

  // Update presentation.xml.rels
  let presRels = read(path.join(WORK, "ppt", "_rels", "presentation.xml.rels"));
  presRels = presRels.replace(/<Relationship[^>]*Target="slides\/slide\d+\.xml"[^/]*\/>/g, "");
  const newRels = slides.map((_,i) =>
    `<Relationship Id="rId${100+i}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${i+1}.xml"/>`
  ).join("\n  ");
  presRels = presRels.replace("</Relationships>", `  ${newRels}\n</Relationships>`);
  write(path.join(WORK, "ppt", "_rels", "presentation.xml.rels"), presRels);

  // Fix [Content_Types].xml
  const ctPath = path.join(WORK, "[Content_Types].xml");
  let ct = read(ctPath);
  ct = ct.replace("presentationml.template.main+xml", "presentationml.presentation.main+xml");
  for (let i = 1; i <= 20; i++) {
    ct = ct.replace(
      `<Override PartName="/ppt/slides/slide${i}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`, ""
    );
  }
  const overrides = slides.map((_,i) =>
    `<Override PartName="/ppt/slides/slide${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`
  ).join("");
  ct = ct.replace("</Types>", `${overrides}</Types>`);
  write(ctPath, ct);

  // Zip
  console.log(`\n📦 Packaging ${path.basename(OUT)}...`);
  if (fs.existsSync(OUT)) fs.unlinkSync(OUT);
  execSync(
    `powershell -NoProfile -Command "Add-Type -AssemblyName System.IO.Compression; Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::CreateFromDirectory('${WORK}', '${OUT}', [System.IO.Compression.CompressionLevel]::Optimal, $false)"`,
    { shell: "cmd.exe" }
  );

  const sizeMB = (fs.statSync(OUT).size / 1024 / 1024).toFixed(1);
  console.log(`\n🎉 Done! ${path.basename(OUT)} — ${sizeMB} MB (${slides.length} slides)`);
})();
