/**
 * Builds the Enshore Lessons Learned Lunch & Learn PowerPoint — v2.
 *
 * Layout per screenshot slide:
 *   - Screenshot fills the FULL slide (no distortion — captured at 1440×810 = 16:9)
 *   - Teal title bar overlaid at top (semi-transparent so slide header is still visible)
 *   - White title + italic subtitle text on the bar
 *   - Enshore wave + logo come from the slide layout (L_WHITE = slideLayout69)
 *
 * Teal slides (title, story, access): explicit teal rect background + white text.
 */

const fs   = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const BASE_PPTX = path.join(__dirname, "Enshore_LL_LunchLearn_v3.pptx");
const SHOTS     = path.join(__dirname, "screenshots-ll-v2");
const WORK      = "C:\\Users\\JBeaton\\AppData\\Local\\Temp\\claude\\ll-v2-deck";
const OUT       = path.join(__dirname, "Enshore_LL_LunchLearn_v2.pptx");
const QR_FILE   = path.join(__dirname, "screenshots-ll-v2", "qr_access.png");

// Slide canvas
const SW = 10160000, SH = 5715000;

// Layouts
const L_TEAL     = "../slideLayouts/slideLayout5.xml";
const L_WHITE    = "../slideLayouts/slideLayout69.xml";
const L_THANKYOU = "../slideLayouts/slideLayout89.xml";

// ── XML helpers ───────────────────────────────────────────────────────────────
function esc(s) {
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}
const write = (p,c) => fs.writeFileSync(p, c, "utf8");
const read  = p => fs.readFileSync(p, "utf8");

function txt({ id, x, y, cx, cy, lines, sz=1800, bold=false, color="FFFFFF",
               align="l", anchor="t", italic=false, lineSpacing=null }) {
  const lsp = lineSpacing ? `<a:lnSpc><a:spcPts val="${lineSpacing}"/></a:lnSpc>` : "";
  const paras = (Array.isArray(lines) ? lines : [lines]).map(line =>
    `<a:p><a:pPr algn="${align}">${lsp}</a:pPr><a:r>
      <a:rPr lang="en-GB" sz="${sz}" b="${bold?1:0}" i="${italic?1:0}" dirty="0">
        <a:solidFill><a:srgbClr val="${color}"/></a:solidFill>
        <a:latin typeface="Calibri"/>
      </a:rPr>
      <a:t>${esc(line)}</a:t>
    </a:r></a:p>`
  ).join("");
  return `<p:sp>
    <p:nvSpPr><p:cNvPr id="${id}" name="t${id}"/>
      <p:cNvSpPr txBox="1"><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr/></p:nvSpPr>
    <p:spPr>
      <a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm>
      <a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/>
    </p:spPr>
    <p:txBody><a:bodyPr wrap="square" anchor="${anchor}"/><a:lstStyle/>${paras}</p:txBody>
  </p:sp>`;
}

function bullets({ id, x, y, cx, cy, items, sz=1700, color="FFFFFF", accent="A0E0E0" }) {
  const paras = items.map(item => {
    const [bold, ...rest] = item.includes("::") ? item.split("::") : [null, item];
    const body = rest.length ? rest.join("::") : item;
    return `<a:p>
      <a:pPr marL="342900" indent="-342900" spcBef="120">
        <a:buClr><a:srgbClr val="${accent}"/></a:buClr>
        <a:buFont typeface="Arial"/><a:buChar char="▸"/>
      </a:pPr>
      ${bold && rest.length
        ? `<a:r><a:rPr lang="en-GB" sz="${sz}" b="1" dirty="0"><a:solidFill><a:srgbClr val="${color}"/></a:solidFill><a:latin typeface="Calibri"/></a:rPr><a:t>${esc(bold + "  ")}</a:t></a:r>
           <a:r><a:rPr lang="en-GB" sz="${sz}" b="0" dirty="0"><a:solidFill><a:srgbClr val="${color}"/></a:solidFill><a:latin typeface="Calibri"/></a:rPr><a:t>${esc(body)}</a:t></a:r>`
        : `<a:r><a:rPr lang="en-GB" sz="${sz}" b="0" dirty="0"><a:solidFill><a:srgbClr val="${color}"/></a:solidFill><a:latin typeface="Calibri"/></a:rPr><a:t>${esc(item)}</a:t></a:r>`}
    </a:p>`;
  }).join("");
  return `<p:sp>
    <p:nvSpPr><p:cNvPr id="${id}" name="b${id}"/>
      <p:cNvSpPr txBox="1"><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr/></p:nvSpPr>
    <p:spPr>
      <a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm>
      <a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/>
    </p:spPr>
    <p:txBody><a:bodyPr wrap="square" anchor="t"/><a:lstStyle/>${paras}</p:txBody>
  </p:sp>`;
}

function solidRect({ id, x, y, cx, cy, fill, alpha=100000 }) {
  return `<p:sp>
    <p:nvSpPr><p:cNvPr id="${id}" name="r${id}"/>
      <p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr/></p:nvSpPr>
    <p:spPr>
      <a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm>
      <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
      <a:solidFill><a:srgbClr val="${fill}"><a:alpha val="${alpha}"/></a:srgbClr></a:solidFill>
      <a:ln><a:noFill/></a:ln>
    </p:spPr>
    <p:txBody><a:bodyPr/><a:lstStyle/><a:p/></p:txBody>
  </p:sp>`;
}

function picture({ id, rId, x, y, cx, cy }) {
  return `<p:pic>
    <p:nvPicPr>
      <p:cNvPr id="${id}" name="pic${id}"/>
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

function slideXml(shapes, layout, transition=true) {
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

function slideRels(layout, media=[]) {
  const mRels = media.map(m =>
    `<Relationship Id="${m.rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/${m.file}"/>`
  ).join("\n  ");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="${layout}"/>
  ${mRels}
</Relationships>`;
}

// ── Screenshot slide: screenshot fills full slide, overlay title bar at top ──
// Title bar: solid teal, from y=0, full width, 720px tall (650000 EMU)
const BAR_H = 660000;
const BAR_Y = 0;

function screenshotSlide({ title, subtitle="", shotRId, layout=L_WHITE, extra="" }) {
  return `
    ${picture({ id:10, rId: shotRId, x:0, y:0, cx:SW, cy:SH })}
    ${solidRect({ id:11, x:0, y:BAR_Y, cx:SW, cy:BAR_H, fill:"005C5C", alpha:97000 })}
    ${txt({ id:12, x:152400, y:BAR_Y+80000, cx:SW-304800, cy:370000,
      lines:[title], sz:2800, bold:true, color:"FFFFFF", align:"l", anchor:"ctr" })}
    ${subtitle ? txt({ id:13, x:152400, y:BAR_Y+430000, cx:SW-304800, cy:220000,
      lines:[subtitle], sz:1400, bold:false, color:"CCF0F0", align:"l", italic:true, anchor:"t" }) : ""}
    ${extra}`;
}

// ── Teal background slide (no screenshot) ────────────────────────────────────
// Explicit dark teal rect covers full slide so text is readable regardless of layout
function tealBg() {
  return solidRect({ id:2, x:0, y:0, cx:SW, cy:SH, fill:"00505A", alpha:100000 });
}

// ── Define slides ─────────────────────────────────────────────────────────────
function buildDeck(hasQR) {
  return [

    // 1 — Title
    {
      layout: L_TEAL,
      media: [],
      xml: slideXml(`
        ${tealBg()}
        ${txt({ id:10, x:609600, y:1066800, cx:8940800, cy:1066800,
          lines:["Lessons Learned"], sz:5400, bold:true, color:"FFFFFF", align:"ctr", anchor:"ctr" })}
        ${txt({ id:11, x:609600, y:2200000, cx:8940800, cy:500000,
          lines:["IMS Module Walkthrough"], sz:2600, color:"CCF0F0", align:"ctr" })}
        ${txt({ id:12, x:609600, y:2780000, cx:8940800, cy:350000,
          lines:["Lunch & Learn  ·  Enshore Subsea"], sz:1600, color:"88CCCC", align:"ctr" })}
        ${solidRect({ id:20, x:914400, y:3480000, cx:1981200, cy:950000, fill:"FFFFFF", alpha:18000 })}
        ${txt({ id:21, x:914400, y:3530000, cx:1981200, cy:500000,
          lines:["2,990"], sz:4000, bold:true, color:"FFFFFF", align:"ctr", anchor:"ctr" })}
        ${txt({ id:22, x:914400, y:4020000, cx:1981200, cy:300000,
          lines:["Lessons Captured"], sz:1300, color:"CCF0F0", align:"ctr" })}
        ${solidRect({ id:23, x:3200400, y:3480000, cx:1981200, cy:950000, fill:"FFFFFF", alpha:18000 })}
        ${txt({ id:24, x:3200400, y:3530000, cx:1981200, cy:500000,
          lines:["67"], sz:4000, bold:true, color:"FFFFFF", align:"ctr", anchor:"ctr" })}
        ${txt({ id:25, x:3200400, y:4020000, cx:1981200, cy:300000,
          lines:["Projects"], sz:1300, color:"CCF0F0", align:"ctr" })}
        ${solidRect({ id:26, x:5486400, y:3480000, cx:1981200, cy:950000, fill:"FFFFFF", alpha:18000 })}
        ${txt({ id:27, x:5486400, y:3530000, cx:1981200, cy:500000,
          lines:["AI"], sz:4000, bold:true, color:"FFFFFF", align:"ctr", anchor:"ctr" })}
        ${txt({ id:28, x:5486400, y:4020000, cx:1981200, cy:300000,
          lines:["Prevention Intelligence"], sz:1300, color:"CCF0F0", align:"ctr" })}
        ${solidRect({ id:29, x:7772400, y:3480000, cx:1981200, cy:950000, fill:"FFFFFF", alpha:18000 })}
        ${txt({ id:30, x:7772400, y:3530000, cx:1981200, cy:500000,
          lines:["Live"], sz:4000, bold:true, color:"FFFFFF", align:"ctr", anchor:"ctr" })}
        ${txt({ id:31, x:7772400, y:4020000, cx:1981200, cy:300000,
          lines:["Real-Time Dashboard"], sz:1300, color:"CCF0F0", align:"ctr" })}
      `, L_TEAL),
    },

    // 2 — Why Are We Here?
    {
      layout: L_TEAL,
      media: [],
      xml: slideXml(`
        ${tealBg()}
        ${txt({ id:10, x:609600, y:380000, cx:8940800, cy:760000,
          lines:["Why Are We Here?"], sz:3800, bold:true, color:"FFFFFF", align:"l" })}
        ${txt({ id:11, x:609600, y:1200000, cx:8940800, cy:420000,
          lines:["Enshore has captured 2,990 lessons learned across 67 projects — built and maintained at zero additional cost to the business."],
          sz:1700, color:"CCF0F0", align:"l" })}
        ${bullets({ id:12, x:609600, y:1760000, cx:8940800, cy:3200000,
          items:[
            "The data exists — but trend analysis in a spreadsheet is time-consuming and error-prone",
            "Today we're moving from passive data storage to active operational intelligence",
            "Prevention Intelligence uses AI to turn 2,990 lessons into targeted prevention briefs",
            "Any team member can search, filter and learn from 67 projects in seconds",
            "This session is your guided tour of what the system can do for you right now",
          ], sz:1750, color:"FFFFFF", accent:"88CCCC" })}
      `, L_TEAL),
    },

    // 3 — Dashboard
    {
      layout: L_WHITE,
      media: [{ rId:"rId10", file:"shot_01_dashboard.png" }],
      xml: slideXml(screenshotSlide({
        title: "Dashboard",
        subtitle: "Live KPIs, recent lessons and module overview — 2,990 lessons across 67 projects at a glance",
        shotRId: "rId10",
      }), L_WHITE),
    },

    // 4 — Register
    {
      layout: L_WHITE,
      media: [{ rId:"rId10", file:"shot_02_register.png" }],
      xml: slideXml(screenshotSlide({
        title: "Lessons Register",
        subtitle: "Browse, filter and search every captured lesson — by project, discipline, category, status and more",
        shotRId: "rId10",
      }), L_WHITE),
    },

    // 5 — Prevention Intelligence: input
    {
      layout: L_WHITE,
      media: [{ rId:"rId10", file:"shot_03_pi_input.png" }],
      xml: slideXml(screenshotSlide({
        title: "Prevention Intelligence",
        subtitle: "Describe what you need to prevent — the AI queries your entire lesson bank and returns a targeted prevention brief",
        shotRId: "rId10",
      }), L_WHITE),
    },

    // 6 — Prevention Intelligence: results
    {
      layout: L_WHITE,
      media: [{ rId:"rId10", file:"shot_04_pi_results.png" }],
      xml: slideXml(screenshotSlide({
        title: "Prevention Intelligence — Results",
        subtitle: "Actionable brief in real time: root causes, recommended controls and supporting lessons drawn directly from your project history",
        shotRId: "rId10",
      }), L_WHITE),
    },

    // 7 — Upload to Prevention Intelligence
    {
      layout: L_WHITE,
      media: [{ rId:"rId10", file:"shot_06_upload_results.png" }],
      xml: slideXml(screenshotSlide({
        title: "Upload to Prevention Intelligence",
        subtitle: "Drop in any procedure, report or NCR — the system cross-references it against your full lesson bank instantly",
        shotRId: "rId10",
      }), L_WHITE),
    },

    // 8 — Trend Analysis
    {
      layout: L_WHITE,
      media: [{ rId:"rId10", file:"shot_08_trend.png" }],
      xml: slideXml(screenshotSlide({
        title: "Trend Analysis",
        subtitle: "Visualise patterns across projects, disciplines and time — see where failures cluster and where to focus prevention effort",
        shotRId: "rId10",
      }), L_WHITE),
    },

    // 9 — Request Access (login screenshot + QR code)
    {
      layout: L_WHITE,
      media: [
        { rId:"rId10", file:"shot_00_login.png" },
        ...(hasQR ? [{ rId:"rId11", file:"qr_access.png" }] : []),
      ],
      xml: slideXml(`
        ${solidRect({ id:5, x:0, y:0, cx:SW, cy:SH, fill:"F4FAFA", alpha:100000 })}
        ${solidRect({ id:6, x:0, y:0, cx:SW, cy:BAR_H, fill:"005C5C", alpha:100000 })}
        ${txt({ id:7, x:152400, y:80000, cx:SW-304800, cy:BAR_H-100000,
          lines:["How to Request Access"], sz:2800, bold:true, color:"FFFFFF", align:"l", anchor:"ctr" })}
        ${picture({ id:10, rId:"rId10", x:4877400, y:800000, cx:5130200, cy:4600000 })}
        ${bullets({ id:20, x:304800, y:880000, cx:4420000, cy:2800000,
          items:[
            "Go to the IMS login page",
            "Click Request Access below the sign-in form",
            "Your request is reviewed by the system administrator",
            "You'll receive a confirmation email with your login details",
            "Access levels:  View  ·  Contributor  ·  Project Admin",
          ], sz:1700, color:"1A1A1A", accent:"006E6E" })}
        ${hasQR ? `
          ${solidRect({ id:30, x:304800, y:3780000, cx:1676400, cy:1676400, fill:"FFFFFF", alpha:100000 })}
          ${picture({ id:31, rId:"rId11", x:354800, y:3830000, cx:1576400, cy:1576400 })}
          ${txt({ id:32, x:2100000, y:3900000, cx:2500000, cy:350000,
            lines:["Scan to access the IMS"], sz:1500, bold:true, color:"005C5C", align:"l" })}
          ${txt({ id:33, x:2100000, y:4280000, cx:2500000, cy:280000,
            lines:["ims.enshoresubsea.com"], sz:1300, color:"444444", align:"l", italic:true })}
        ` : ""}
      `, L_WHITE),
    },

    // 10 — Thank You
    {
      layout: L_THANKYOU,
      media: [],
      xml: slideXml(`
        ${tealBg()}
        ${txt({ id:10, x:609600, y:1600000, cx:8940800, cy:1200000,
          lines:["Thank You"], sz:6400, bold:true, color:"FFFFFF", align:"ctr", anchor:"ctr" })}
        ${txt({ id:11, x:609600, y:2950000, cx:8940800, cy:500000,
          lines:["Enshore IMS  ·  Lessons Learned Module"], sz:2000, color:"CCF0F0", align:"ctr" })}
        ${txt({ id:12, x:609600, y:3580000, cx:8940800, cy:380000,
          lines:["jbeaton@enshoresubsea.com"], sz:1500, color:"88CCCC", align:"ctr" })}
      `, L_THANKYOU),
    },
  ];
}

// ── Assemble deck ─────────────────────────────────────────────────────────────
(async () => {
  const shotMap = {
    "shot_00_login.png":        "00_login.png",
    "shot_01_dashboard.png":    "01_dashboard.png",
    "shot_02_register.png":     "02_register.png",
    "shot_03_pi_input.png":     "03_pi_input.png",
    "shot_04_pi_results.png":   "04_pi_results.png",
    "shot_06_upload_results.png": "06_upload_results.png",
    "shot_08_trend.png":        "08_trend.png",
  };

  // Check for QR code
  const hasQR = fs.existsSync(QR_FILE);
  if (!hasQR) console.log("  ⚠️  QR code not found — access slide will skip QR");

  console.log("📂 Extracting base PPTX...");
  if (fs.existsSync(WORK)) fs.rmSync(WORK, { recursive: true, force: true });
  fs.mkdirSync(WORK, { recursive: true });
  execSync(
    `powershell -NoProfile -Command "Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::ExtractToDirectory('${BASE_PPTX}', '${WORK}')"`,
    { shell: "cmd.exe" }
  );

  const mediaDir = path.join(WORK, "ppt", "media");

  console.log("🖼  Copying screenshots...");
  for (const [dest, src] of Object.entries(shotMap)) {
    const srcPath = path.join(SHOTS, src);
    if (fs.existsSync(srcPath)) {
      fs.copyFileSync(srcPath, path.join(mediaDir, dest));
      const kb = Math.round(fs.statSync(srcPath).size / 1024);
      console.log(`  ✅ ${dest} (${kb} KB)`);
    } else {
      console.warn(`  ⚠️  Missing: ${src}`);
    }
  }
  if (hasQR) {
    fs.copyFileSync(QR_FILE, path.join(mediaDir, "qr_access.png"));
    console.log("  ✅ qr_access.png");
  }

  const slides = buildDeck(hasQR);
  const slidesDir = path.join(WORK, "ppt", "slides");
  const relsDir   = path.join(slidesDir, "_rels");

  // Remove old slides
  fs.readdirSync(slidesDir).filter(f => /^slide\d+\.xml$/.test(f)).forEach(f => fs.unlinkSync(path.join(slidesDir, f)));
  fs.readdirSync(relsDir).filter(f => /^slide\d+\.xml\.rels$/.test(f)).forEach(f => fs.unlinkSync(path.join(relsDir, f)));

  console.log("\n📝 Writing slides...");
  slides.forEach((s, i) => {
    const n = i + 1;
    write(path.join(slidesDir, `slide${n}.xml`), s.xml);
    write(path.join(relsDir, `slide${n}.xml.rels`), slideRels(s.layout, s.media));
  });

  // presentation.xml
  let presXml = read(path.join(WORK, "ppt", "presentation.xml"));
  presXml = presXml.replace(
    /<p:sldIdLst>[\s\S]*?<\/p:sldIdLst>/,
    `<p:sldIdLst>${slides.map((_,i) => `<p:sldId id="${300+i}" r:id="rId${100+i}"/>`).join("")}</p:sldIdLst>`
  );
  write(path.join(WORK, "ppt", "presentation.xml"), presXml);

  // presentation.xml.rels
  let presRels = read(path.join(WORK, "ppt", "_rels", "presentation.xml.rels"));
  presRels = presRels.replace(/<Relationship[^>]*Target="slides\/slide\d+\.xml"[^/]*\/>/g, "");
  presRels = presRels.replace("</Relationships>",
    slides.map((_,i) =>
      `<Relationship Id="rId${100+i}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${i+1}.xml"/>`
    ).join("\n  ") + "\n</Relationships>"
  );
  write(path.join(WORK, "ppt", "_rels", "presentation.xml.rels"), presRels);

  // [Content_Types].xml
  const ctPath = path.join(WORK, "[Content_Types].xml");
  let ct = read(ctPath);
  ct = ct.replace("presentationml.template.main+xml", "presentationml.presentation.main+xml");
  for (let i = 1; i <= 20; i++) {
    ct = ct.replace(
      `<Override PartName="/ppt/slides/slide${i}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`, ""
    );
  }
  ct = ct.replace("</Types>",
    slides.map((_,i) =>
      `<Override PartName="/ppt/slides/slide${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`
    ).join("") + "</Types>"
  );
  write(ctPath, ct);

  // Zip
  console.log(`\n📦 Packaging...`);
  if (fs.existsSync(OUT)) fs.unlinkSync(OUT);
  execSync(
    `powershell -NoProfile -Command "Add-Type -AssemblyName System.IO.Compression; Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::CreateFromDirectory('${WORK}', '${OUT}', [System.IO.Compression.CompressionLevel]::Optimal, $false)"`,
    { shell: "cmd.exe" }
  );
  const mb = (fs.statSync(OUT).size / 1024 / 1024).toFixed(1);
  console.log(`\n🎉 ${path.basename(OUT)} — ${mb} MB · ${slides.length} slides`);
})();
