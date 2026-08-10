/**
 * Enshore LL Lunch & Learn — v3
 * Builds directly on the Enshore POTX template via XML manipulation.
 * Every slide inherits the teal wave + Enshore logo from the slide masters/layouts.
 */

const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ── Paths ──────────────────────────────────────────────────────────────────
const TMPL  = 'C:\\Users\\JBeaton\\AppData\\Local\\Temp\\claude\\template-unpacked';
const SHOTS = 'C:\\Users\\JBeaton\\asset-quality-webapp\\screenshots-ll\\';
const WORK  = 'C:\\Users\\JBeaton\\AppData\\Local\\Temp\\claude\\ll-v3-build';
const OUT   = 'C:\\Users\\JBeaton\\asset-quality-webapp\\Enshore_LL_LunchLearn_v3.pptx';

// ── Slide dimensions (from template presentation.xml) ─────────────────────
const W = 10160000;   // EMU width
const H = 5715000;    // EMU height

// Brand colours
const C = {
  navy:   '0E2841',
  teal:   '005670',
  blue:   '156082',
  orange: 'E97132',
  sky:    '0F9ED5',
  green:  '196B24',
  white:  'FFFFFF',
  ink:    '1E293B',
  muted:  '64748B',
  lgrey:  'F4F6F8',
};

// ── XML helpers ────────────────────────────────────────────────────────────
const esc = s => String(s)
  .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

const NS = `xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"`;

function slideXml(shapes, notes='') {
  const notesXml = notes ? `<p:notes xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree></p:cSld></p:notes>` : '';
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld ${NS}><p:cSld><p:spTree>
<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>
${shapes.join('\n')}
</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>`;
}

function relsXml(layoutNum, images=[]) {
  const imgRels = images.map((img,i) =>
    `<Relationship Id="rId${i+2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/${img}"/>`
  ).join('\n');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout${layoutNum}.xml"/>
${imgRels}
</Relationships>`;
}

// ── Shape primitives ───────────────────────────────────────────────────────
let _id = 10;
const nextId = () => ++_id;

function rect(x, y, w, h, fill, opts={}) {
  const id = nextId();
  const { line='none', lineColor='000000', lineW=0 } = opts;
  const lineXml = line==='none'
    ? `<a:ln><a:noFill/></a:ln>`
    : `<a:ln w="${lineW*12700}"><a:solidFill><a:srgbClr val="${lineColor}"/></a:solidFill></a:ln>`;
  return `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="r${id}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
<p:spPr><a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${w}" cy="${h}"/></a:xfrm>
<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
<a:solidFill><a:srgbClr val="${fill}"/></a:solidFill>${lineXml}</p:spPr>
<p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:endParaRPr/></a:p></p:txBody></p:sp>`;
}

function txt(x, y, w, h, runs, opts={}) {
  const id = nextId();
  const { align='l', valign='t', wrap=true, autofit=true } = opts;
  const bodyPr = wrap
    ? `<a:bodyPr wrap="square" rtlCol="0" anchor="${valign==='m'?'ctr':'t'}">${autofit?'<a:normAutofit/>':''}</a:bodyPr>`
    : `<a:bodyPr wrap="none" rtlCol="0"><a:normAutofit/></a:bodyPr>`;
  const paras = runs.map(r => {
    if (typeof r === 'string') r = { t: r };
    const { t, sz=14, bold=false, color=C.ink, font='Calibri', ital=false, br=false } = r;
    const algn = align==='c'?'ctr':align==='r'?'r':'l';
    if (br) return `<a:p><a:pPr algn="${algn}"/><a:endParaRPr lang="en-GB" dirty="0"/></a:p>`;
    return `<a:p><a:pPr algn="${algn}"/><a:r><a:rPr lang="en-GB" sz="${sz*100}" b="${bold?1:0}" i="${ital?1:0}" dirty="0"><a:solidFill><a:srgbClr val="${color}"/></a:solidFill><a:latin typeface="${font}"/></a:rPr><a:t>${esc(t)}</a:t></a:r></a:p>`;
  });
  return `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="t${id}"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr>
<p:spPr><a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${w}" cy="${h}"/></a:xfrm>
<a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/><a:ln><a:noFill/></a:ln></p:spPr>
<p:txBody>${bodyPr}<a:lstStyle/>${paras.join('')}</p:txBody></p:sp>`;
}

function pic(rId, x, y, w, h) {
  const id = nextId();
  return `<p:pic><p:nvPicPr><p:cNvPr id="${id}" name="img${id}"/><p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr><p:nvPr/></p:nvPicPr>
<p:blipFill><a:blip r:embed="rId${rId}"/><a:stretch><a:fillRect/></a:stretch></p:blipFill>
<p:spPr><a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${w}" cy="${h}"/></a:xfrm>
<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr></p:pic>`;
}

// Fraction helpers
const px = f => Math.round(f * W);   // fraction of slide width
const py = f => Math.round(f * H);   // fraction of slide height

// Standard teal header bar + title for content slides
function headerBar(title, sub='') {
  const shapes = [
    rect(0, 0, W, py(0.12), C.teal),
    txt(px(0.04), py(0.01), px(0.92), py(0.10),
      [{ t: title, sz: 18, bold: true, color: C.white }],
      { valign:'m', align:'l' }),
  ];
  if (sub) shapes.push(
    txt(px(0.04), py(0.10), px(0.92), py(0.06),
      [{ t: sub, sz: 11, color: 'A8D4E8' }])
  );
  return shapes;
}

// ── Screenshot: copy images to build media folder, return filename ─────────
function addShot(buildMedia, src, name) {
  const full = SHOTS + src;
  if (!fs.existsSync(full)) { console.warn('Missing:', full); return null; }
  fs.copyFileSync(full, path.join(buildMedia, name));
  return name;
}

// ── Slide builders ─────────────────────────────────────────────────────────

// Layout refs we'll use (matched to Enshore wave-carrying masters):
// Layout 5  = "1_Title Slide Green Background" (teal/navy bg, wave+logo in layout)
// Layout 69 = "Content Slide White - Green Wave" (white bg, wave+logo in master7)
// Layout 14 = "Full Image - Green Wave" (full img bg, wave+logo in layout)
// Layout 89 = "THANK YOU Generic" (wave+logo in master11)

function slide_cover(media) {
  // Layout 5 = green/teal full-background — we add our own content shapes
  // Just override content; layout provides background + wave + Enshore logo
  const shapes = [
    // Dark overlay to make text readable (layout already has bg, this dims centre)
    txt(px(0.04), py(0.12), px(0.60), py(0.08),
      [{ t: 'LUNCH & LEARN', sz: 11, bold: true, color: 'A8D4E8', charSpacing: 5 }]),
    txt(px(0.04), py(0.20), px(0.70), py(0.30),
      [
        { t: 'Lessons Learnt', sz: 36, bold: true, color: C.white },
        { t: 'From 10 spreadsheets to one system', sz: 18, color: 'A8D4E8' },
      ]),
    txt(px(0.04), py(0.55), px(0.55), py(0.08),
      [{ t: 'Jordan Beaton  ·  IMS Administrator  ·  2026', sz: 11, color: 'A8D4E8' }]),

    // 3 stat pills (bottom left area)
    rect(px(0.04), py(0.68), px(0.16), py(0.12), C.teal, { line:'solid', lineColor:C.sky, lineW:1 }),
    txt(px(0.04), py(0.68), px(0.16), py(0.07), [{ t:'2,990', sz:22, bold:true, color:C.white }], { align:'c' }),
    txt(px(0.04), py(0.75), px(0.16), py(0.05), [{ t:'Lessons', sz:9, color:'A8D4E8' }], { align:'c' }),

    rect(px(0.22), py(0.68), px(0.16), py(0.12), C.teal, { line:'solid', lineColor:C.sky, lineW:1 }),
    txt(px(0.22), py(0.68), px(0.16), py(0.07), [{ t:'67', sz:22, bold:true, color:C.white }], { align:'c' }),
    txt(px(0.22), py(0.75), px(0.16), py(0.05), [{ t:'Projects', sz:9, color:'A8D4E8' }], { align:'c' }),

    rect(px(0.40), py(0.68), px(0.16), py(0.12), C.teal, { line:'solid', lineColor:C.sky, lineW:1 }),
    txt(px(0.40), py(0.68), px(0.16), py(0.07), [{ t:'17 yrs', sz:22, bold:true, color:C.white }], { align:'c' }),
    txt(px(0.40), py(0.75), px(0.16), py(0.05), [{ t:'Data', sz:9, color:'A8D4E8' }], { align:'c' }),
  ];
  return { layout: 5, shapes, images: [] };
}

function slide_challenge(media) {
  const shapes = [
    ...headerBar('The Challenge — It\'s All Sat in Spreadsheets'),

    // Left column header
    rect(px(0.04), py(0.15), px(0.44), py(0.08), C.teal),
    txt(px(0.04), py(0.15), px(0.44), py(0.08),
      [{ t: 'What we DO have', sz: 12, bold: true, color: C.white }], { valign:'m' }),

    // Left rows
    ...['2,990 lessons from 67 projects',
       'Data going back to 2009',
       'Project codes, dates, departments',
       'Issue descriptions & actions',
       'Criticality ratings on most records'
    ].flatMap((t, i) => [
      rect(px(0.04), py(0.24+i*0.10), px(0.44), py(0.09), i%2===0?C.white:'F0F4F8',
        { line:'solid', lineColor:'D0D7DE', lineW:0 }),
      txt(px(0.05), py(0.245+i*0.10), px(0.42), py(0.08),
        [{ t: '✓  '+t, sz: 11, color: C.teal, bold: true }]),
    ]),

    // Right column header
    rect(px(0.52), py(0.15), px(0.44), py(0.08), C.orange),
    txt(px(0.52), py(0.15), px(0.44), py(0.08),
      [{ t: "What we CAN'T easily do", sz: 12, bold: true, color: C.white }], { valign:'m' }),

    // Right rows
    ...['Search across all 10 files at once',
       'Run trend analysis without opening everything',
       'Know if the same mistake happened before',
       'Find lessons before a new project kicks off',
       'Share or report on lessons company-wide',
    ].flatMap((t, i) => [
      rect(px(0.52), py(0.24+i*0.10), px(0.44), py(0.09), i%2===0?C.white:'F0F4F8',
        { line:'solid', lineColor:'D0D7DE', lineW:0 }),
      txt(px(0.53), py(0.245+i*0.10), px(0.42), py(0.08),
        [{ t: '✗  '+t, sz: 11, color: C.ink }]),
    ]),

    // Bottom callout
    rect(px(0.04), py(0.85), px(0.92), py(0.09), C.navy),
    txt(px(0.05), py(0.85), px(0.90), py(0.09),
      [{ t: 'The data exists. It just isn\'t accessible. That\'s what the IMS Lessons Learned module fixes.', sz: 12, bold: true, color: C.white }],
      { valign:'m', align:'l' }),
  ];
  return { layout: 69, shapes, images: [] };
}

function slide_sectionBreak(media, title, sub='') {
  // Uses Layout 5 (teal full-background with wave+logo)
  const shapes = [
    txt(px(0.04), py(0.30), px(0.70), py(0.16),
      [{ t: title, sz: 30, bold: true, color: C.white }]),
    ...(sub ? [txt(px(0.04), py(0.48), px(0.70), py(0.10),
      [{ t: sub, sz: 14, color: 'A8D4E8' }])] : []),
  ];
  return { layout: 5, shapes, images: [] };
}

function slide_screenshot(media, shotFile, destFile, title, sub='') {
  const f = addShot(media, shotFile, destFile);
  const images = f ? [f] : [];
  const shapes = [
    // Screenshot fills content area ABOVE the wave (safe zone)
    ...(f ? [pic(2, px(0.03), py(0.14), px(0.94), py(0.70))] : []),
    // Teal header bar on top
    rect(0, 0, W, py(0.12), C.teal),
    txt(px(0.03), 0, px(0.94), py(0.12),
      [{ t: title, sz: 16, bold: true, color: C.white }], { valign:'m' }),
    ...(sub ? [txt(px(0.03), py(0.09), px(0.94), py(0.05),
      [{ t: sub, sz: 10, color: 'A8D4E8' }])] : []),
  ];
  return { layout: 69, shapes, images };
}

function slide_requestAccess(media) {
  const f = addShot(media, 'A_login.png', 'll_login.png');
  const images = f ? [f] : [];
  const shapes = [
    ...headerBar('Requesting Access to the IMS', 'Anyone with an Enshore email can request access'),

    // Steps on left
    ...[
      ['1', C.teal,   'Go to the IMS login page', 'ims.enshoresubsea.com (or ask your manager for the link)'],
      ['2', C.orange, 'Click "Request access"',   'The link is below the sign-in button on the login page'],
      ['3', C.blue,   'Fill in your details',     'Name, department, reason, and which modules you need'],
      ['4', C.teal,   'Submit & wait for approval','An IMS Administrator will set up your account'],
    ].flatMap(([n, col, head, body], i) => {
      const y = py(0.18 + i * 0.175);
      return [
        rect(px(0.03), y, px(0.06), py(0.15), col),
        txt(px(0.03), y, px(0.06), py(0.15), [{ t: n, sz: 22, bold: true, color: C.white }], { align:'c', valign:'m' }),
        txt(px(0.10), y, px(0.38), py(0.07), [{ t: head, sz: 12, bold: true, color: C.ink }]),
        txt(px(0.10), y+py(0.07), px(0.38), py(0.08), [{ t: body, sz: 10, color: C.muted }]),
      ];
    }),

    // Login screenshot on right
    ...(f ? [pic(2, px(0.52), py(0.16), px(0.44), py(0.70))] : []),
    // Label the screenshot
    rect(px(0.52), py(0.16), px(0.44), py(0.04), C.navy),
    txt(px(0.52), py(0.16), px(0.44), py(0.04),
      [{ t: 'IMS Login Page — "Request access" link highlighted', sz: 8, color: C.white }],
      { align:'c', valign:'m' }),
  ];
  return { layout: 69, shapes, images };
}

function slide_whatWeNeed(media) {
  const shapes = [
    ...headerBar('What We Need From You', 'Three simple asks'),

    ...[
      { n:'1', c:C.orange, head:'Log lessons as they happen',
        body:'When something goes wrong (or right) on a project — log it in the IMS, not a spreadsheet or email. It takes 5 minutes and stays searchable forever.' },
      { n:'2', c:C.blue,   head:'Search before you start',
        body:'Before your next project kick-off, spend 10 minutes in the Register. Search your project type, vessel, or operation. The knowledge is already there.' },
      { n:'3', c:C.teal,   head:'Tell your team it exists',
        body:'The system is only as useful as the number of people who know about it. Share the link. If you see a lesson on another project, log it.' },
    ].flatMap(({ n, c, head, body }, i) => {
      const y = py(0.17 + i * 0.245);
      return [
        rect(px(0.03), y, px(0.94), py(0.22), C.white, { line:'solid', lineColor:'D0D7DE', lineW:1 }),
        rect(px(0.03), y, px(0.07), py(0.22), c),
        txt(px(0.03), y, px(0.07), py(0.22), [{ t: n, sz: 26, bold: true, color: C.white }], { align:'c', valign:'m' }),
        txt(px(0.11), y+py(0.01), px(0.84), py(0.08), [{ t: head, sz: 14, bold: true, color: C.navy }]),
        txt(px(0.11), y+py(0.09), px(0.84), py(0.12), [{ t: body, sz: 11, color: C.muted }]),
      ];
    }),
  ];
  return { layout: 69, shapes, images: [] };
}

function slide_thankyou(media) {
  // Layout 89 = THANK YOU Generic — the layout already has the design
  // We just add a small content override
  const shapes = [
    txt(px(0.04), py(0.20), px(0.60), py(0.18),
      [{ t: 'Thank You', sz: 40, bold: true, color: C.white }]),
    txt(px(0.04), py(0.38), px(0.60), py(0.10),
      [{ t: 'Questions?', sz: 24, bold: true, color: 'E97132' }]),
    txt(px(0.04), py(0.50), px(0.60), py(0.10),
      [{ t: 'The IMS Lessons Learned module is live now. Log in, search, and start contributing.', sz: 13, color: 'A8D4E8' }]),
  ];
  return { layout: 89, shapes, images: [] };
}

// ── Morph transition XML ───────────────────────────────────────────────────
const MORPH = `<p:transition xmlns:p14="http://schemas.microsoft.com/office/powerpoint/2010/main">
  <p14:morph dur="500" inverted="0"/>
</p:transition>`;

// ── Build ──────────────────────────────────────────────────────────────────
if (fs.existsSync(WORK)) execSync(`rmdir /s /q "${WORK}"`, { shell: 'cmd.exe' });
execSync(`xcopy /e /i /q "${TMPL}" "${WORK}"`, { shell: 'cmd.exe' });

const buildSlides = path.join(WORK, 'ppt', 'slides');
const buildMedia  = path.join(WORK, 'ppt', 'media');
const buildRels   = path.join(WORK, 'ppt', 'slides', '_rels');

// Remove old slide XMLs
fs.readdirSync(buildSlides).filter(f => f.match(/^slide\d+\.xml$/)).forEach(f =>
  fs.unlinkSync(path.join(buildSlides, f)));
fs.readdirSync(buildRels).filter(f => f.match(/^slide\d+\.xml\.rels$/)).forEach(f =>
  fs.unlinkSync(path.join(buildRels, f)));

// Define deck slides
const deck = [
  slide_cover,
  m => slide_sectionBreak(m, 'The Scale of What We Have', '17 years · 67 projects · 2,990 individual lessons'),
  slide_challenge,
  m => slide_sectionBreak(m, 'Meet the IMS Lessons Learned System', 'All 2,990 lessons. One place. Searchable, filterable, linked to actions.'),
  m => slide_screenshot(m, 'B_dashboard.png',    'll_dash.png',     'The Dashboard — 2,990 lessons at a glance', 'Total Lessons · Open Actions · High/Critical · Repeated · Cross-Project Repeats'),
  m => slide_screenshot(m, 'C_register.png',     'll_register.png', 'The Register — search and filter all 2,990 records', 'Find any lesson by project, keyword, department, date, criticality'),
  m => slide_screenshot(m, 'E_trend.png',        'll_trend.png',    'Trend Analysis — 17 years of data in one chart', 'Failures, successes and opportunities by year · click any point to inspect records'),
  m => slide_screenshot(m, 'G_create.png',       'll_create.png',   'Logging a Lesson — 5 minutes, structured form', 'Project · department · dates · criticality · what happened · action taken'),
  slide_requestAccess,
  slide_whatWeNeed,
  slide_thankyou,
];

// Slides where Morph transition applies (0-indexed)
const morphSlides = new Set([1, 3, 6, 10]);

// Write slide files
deck.forEach((builder, i) => {
  _id = 10 + i * 100; // reset IDs per slide to avoid collisions
  const { layout, shapes, images } = builder(buildMedia);

  const slideNum = i + 1;
  const slideFile = path.join(buildSlides, `slide${slideNum}.xml`);
  const relsFile  = path.join(buildRels,   `slide${slideNum}.xml.rels`);

  let xml = slideXml(shapes);
  if (morphSlides.has(i)) {
    xml = xml.replace('</p:sld>', MORPH + '</p:sld>');
  }

  fs.writeFileSync(slideFile, xml, 'utf8');
  fs.writeFileSync(relsFile, relsXml(layout, images), 'utf8');
  console.log(`  Slide ${slideNum}: layout ${layout}, images: [${images.join(', ')}]`);
});

// Update presentation.xml — new sldIdLst and rels
const presPath = path.join(WORK, 'ppt', 'presentation.xml');
let presXml = fs.readFileSync(presPath, 'utf8');

// Build new sldIdLst
const sldIds = deck.map((_, i) => `<p:sldId id="${300 + i}" r:id="rId${100 + i}"/>`).join('');
presXml = presXml.replace(/<p:sldIdLst>[\s\S]*?<\/p:sldIdLst>/, `<p:sldIdLst>${sldIds}</p:sldIdLst>`);
fs.writeFileSync(presPath, presXml, 'utf8');

// Update presentation.xml.rels
const presRelsPath = path.join(WORK, 'ppt', '_rels', 'presentation.xml.rels');
let presRels = fs.readFileSync(presRelsPath, 'utf8');
// Remove old slide relationships
presRels = presRels.replace(/<Relationship[^/]*\/officeDocument\/2006\/relationships\/slide[^/]*\/>/g, '');
// Add new ones before </Relationships>
const newSlideRels = deck.map((_, i) =>
  `<Relationship Id="rId${100 + i}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${i + 1}.xml"/>`
).join('');
presRels = presRels.replace('</Relationships>', newSlideRels + '</Relationships>');
fs.writeFileSync(presRelsPath, presRels, 'utf8');

// Remove the old p14:sldId tracking (optional, prevents confusion)
presXml = fs.readFileSync(presPath, 'utf8');
presXml = presXml.replace(/<p:extLst>[\s\S]*?<\/p:extLst>/, '');
fs.writeFileSync(presPath, presXml, 'utf8');

// Zip into PPTX — includeBaseDirectory=false keeps files at ZIP root
if (fs.existsSync(OUT)) fs.unlinkSync(OUT);
execSync(`powershell -NoProfile -Command "Add-Type -AssemblyName System.IO.Compression; Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::CreateFromDirectory('${WORK}', '${OUT}', [System.IO.Compression.CompressionLevel]::Optimal, $false)"`, { shell: 'cmd.exe' });

const sizeMB = (fs.statSync(OUT).size / 1024 / 1024).toFixed(1);
console.log(`\n✅  Done: ${OUT}  (${sizeMB} MB)`);
