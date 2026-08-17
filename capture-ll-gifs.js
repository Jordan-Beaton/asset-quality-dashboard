/**
 * Captures animated GIFs of the Lessons Learned module for the Lunch & Learn presentation.
 * Scenes: Dashboard, Register, Prevention Intelligence (generate + results),
 *         Upload to PI, Supporting Lessons Learned, Trend Analysis
 */
const puppeteer = require("puppeteer-core");
const fs        = require("fs");
const path      = require("path");
const sharp     = require("sharp");
const GIFEncoder = require("gif-encoder-2");

const EMAIL    = process.env.SCREENSHOT_LOGIN_EMAIL    || "";
const PASS     = process.env.SCREENSHOT_LOGIN_PASSWORD || "";
const OUT_DIR  = path.join(__dirname, "gifs-ll");
const FRAME_DIR = path.join(__dirname, "gif-frames");
const DESKTOP  = "C:\\Users\\JBeaton\\OneDrive - Enshore Subsea\\Desktop";
const UPLOAD_FILE = path.join(DESKTOP, "ENS24-011-ENG-PRO-002 Landfall Pull-In Procedure Rev A.pdf");

// GIF settings — 1280×720 (perfect 16:9 for PowerPoint)
const W = 1280, H = 720;
const FPS = 8;
const DELAY = Math.round(1000 / FPS); // ms per frame

const chromePaths = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  process.env.LOCALAPPDATA + "\\Google\\Chrome\\Application\\chrome.exe",
];
const chromePath = chromePaths.find(p => fs.existsSync(p));

// ── helpers ──────────────────────────────────────────────────────────────────

function ensureDir(d) { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function captureFrames(page, name, durationMs, scrollTarget = null) {
  const dir = path.join(FRAME_DIR, name);
  ensureDir(dir);
  const totalFrames = Math.ceil(durationMs / DELAY);
  console.log(`  📷 Capturing ${totalFrames} frames for "${name}" (${durationMs / 1000}s)...`);

  for (let i = 0; i < totalFrames; i++) {
    await page.screenshot({ path: path.join(dir, `f${String(i).padStart(4, "0")}.png`), type: "png" });
    if (scrollTarget !== null) {
      const scrollStep = scrollTarget / totalFrames;
      await page.evaluate((step) => window.scrollBy(0, step), scrollStep);
    }
    await sleep(DELAY);
  }
  return dir;
}

async function makeGif(frameDir, outName, { width = W, height = H, delay = DELAY } = {}) {
  const files = fs.readdirSync(frameDir).filter(f => f.endsWith(".png")).sort();
  if (!files.length) throw new Error(`No frames in ${frameDir}`);

  const outPath = path.join(OUT_DIR, outName);
  const encoder = new GIFEncoder(width, height, "octree", true);
  const stream  = fs.createWriteStream(outPath);
  encoder.createReadStream().pipe(stream);
  encoder.start();
  encoder.setDelay(delay);
  encoder.setQuality(10);
  encoder.setRepeat(0); // loop forever

  for (const file of files) {
    const raw = await sharp(path.join(frameDir, file))
      .resize(width, height, { fit: "cover", position: "top" })
      .raw()
      .toBuffer();
    encoder.addFrame(raw);
  }

  encoder.finish();
  await new Promise((res, rej) => {
    stream.on("finish", res);
    stream.on("error", rej);
  });

  const size = (fs.statSync(outPath).size / 1024 / 1024).toFixed(1);
  console.log(`  ✅ ${outName} — ${size} MB`);
  return outPath;
}

// ── main ─────────────────────────────────────────────────────────────────────

(async () => {
  ensureDir(OUT_DIR);
  ensureDir(FRAME_DIR);

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", `--window-size=${W},${H}`],
    defaultViewport: { width: W, height: H },
  });

  const page = await browser.newPage();

  // ── Login ────────────────────────────────────────────────────────────────
  console.log("\n🔐 Logging in...");
  await page.goto("http://localhost:3000/login", { waitUntil: "networkidle2", timeout: 20000 });
  await page.waitForSelector('input[type="email"]');
  await page.click('input[type="email"]');
  await page.type('input[type="email"]', EMAIL, { delay: 40 });
  await page.click('input[type="password"]');
  await page.type('input[type="password"]', PASS, { delay: 40 });
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => !window.location.pathname.startsWith("/login"), { timeout: 30000 });
  await sleep(2500);
  console.log("✅ Logged in");

  // ════════════════════════════════════════════════════════════════════════
  // SCENE 1 — Dashboard
  // ════════════════════════════════════════════════════════════════════════
  console.log("\n🎬 Scene 1: Dashboard");
  await page.goto("http://localhost:3000/lessons-learned", { waitUntil: "networkidle2", timeout: 20000 });
  await sleep(3500);
  await page.evaluate(() => window.scrollTo(0, 0));

  // Capture top (KPI cards) — 3s
  let dir = path.join(FRAME_DIR, "01-dashboard");
  ensureDir(dir);
  for (let i = 0; i < FPS * 3; i++) {
    await page.screenshot({ path: path.join(dir, `f${String(i).padStart(4,"0")}.png`) });
    await sleep(DELAY);
  }
  // Slow scroll to bottom — 4s
  const pageH1 = await page.evaluate(() => document.body.scrollHeight);
  const scrollSteps1 = FPS * 4;
  for (let i = 0; i < scrollSteps1; i++) {
    await page.screenshot({ path: path.join(dir, `f${String(FPS * 3 + i).padStart(4,"0")}.png`) });
    await page.evaluate((h, s) => window.scrollBy(0, h / s), pageH1 - H, scrollSteps1);
    await sleep(DELAY);
  }
  // Hold at bottom — 2s
  for (let i = 0; i < FPS * 2; i++) {
    await page.screenshot({ path: path.join(dir, `f${String(FPS * 7 + i).padStart(4,"0")}.png`) });
    await sleep(DELAY);
  }
  await makeGif(dir, "01_dashboard.gif");

  // ════════════════════════════════════════════════════════════════════════
  // SCENE 2 — Register
  // ════════════════════════════════════════════════════════════════════════
  console.log("\n🎬 Scene 2: Register");
  await page.evaluate(() => window.scrollTo(0, 0));
  // Hold on dashboard tab for 1s
  dir = path.join(FRAME_DIR, "02-register");
  ensureDir(dir);
  let fi = 0;
  for (let i = 0; i < FPS * 1; i++, fi++) {
    await page.screenshot({ path: path.join(dir, `f${String(fi).padStart(4,"0")}.png`) });
    await sleep(DELAY);
  }
  // Click Register tab
  await page.click('button::-p-text("Register")');
  await sleep(2500);
  // Capture table — 3s at top
  for (let i = 0; i < FPS * 3; i++, fi++) {
    await page.screenshot({ path: path.join(dir, `f${String(fi).padStart(4,"0")}.png`) });
    await sleep(DELAY);
  }
  // Scroll through rows — 5s
  const pageH2 = await page.evaluate(() => document.body.scrollHeight);
  const scrollSteps2 = FPS * 5;
  for (let i = 0; i < scrollSteps2; i++, fi++) {
    await page.screenshot({ path: path.join(dir, `f${String(fi).padStart(4,"0")}.png`) });
    await page.evaluate((h, s) => window.scrollBy(0, h / s), Math.min(pageH2 - H, 1200), scrollSteps2);
    await sleep(DELAY);
  }
  // Hold — 2s
  for (let i = 0; i < FPS * 2; i++, fi++) {
    await page.screenshot({ path: path.join(dir, `f${String(fi).padStart(4,"0")}.png`) });
    await sleep(DELAY);
  }
  await makeGif(dir, "02_register.gif");

  // ════════════════════════════════════════════════════════════════════════
  // SCENE 3 — Prevention Intelligence (generate + results)
  // ════════════════════════════════════════════════════════════════════════
  console.log("\n🎬 Scene 3: Prevention Intelligence — generating brief...");
  await page.evaluate(() => window.scrollTo(0, 0));
  dir = path.join(FRAME_DIR, "03-prevention");
  ensureDir(dir);
  fi = 0;

  // Click Prevention Intelligence tab
  try {
    await page.click('button::-p-text("Prevention Intelligence")');
  } catch {
    // Try alternate label
    await page.evaluate(() => {
      const btns = [...document.querySelectorAll("button")];
      const b = btns.find(b => b.textContent.toLowerCase().includes("prevention"));
      if (b) b.click();
    });
  }
  await sleep(2500);

  // Show pre-existing text — 3s
  for (let i = 0; i < FPS * 3; i++, fi++) {
    await page.screenshot({ path: path.join(dir, `f${String(fi).padStart(4,"0")}.png`) });
    await sleep(DELAY);
  }

  // Click Generate button
  await page.evaluate(() => {
    const btns = [...document.querySelectorAll("button")];
    const b = btns.find(b => /generate|analyse|analyze|run/i.test(b.textContent));
    if (b) b.click();
  });
  console.log("  ⏳ Waiting for AI generation (up to 3 min)...");

  // Capture loading state — keep shooting frames while waiting (up to 180s)
  const genStart = Date.now();
  let generated = false;
  while (Date.now() - genStart < 180000) {
    await page.screenshot({ path: path.join(dir, `f${String(fi).padStart(4,"0")}.png`) });
    fi++;
    await sleep(DELAY);
    // Check if results appeared
    generated = await page.evaluate(() => {
      const content = document.body.innerText.toLowerCase();
      return content.includes("prevention brief") || content.includes("recommended action") ||
             content.includes("key finding") || content.includes("recommendation") ||
             document.querySelector("[data-result], .result, .prevention-output, .brief-output") !== null;
    });
    if (generated) {
      console.log("  ✅ Results appeared!");
      break;
    }
  }
  await sleep(1500);

  // Scroll through results — 5s
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(500);
  const pageH3 = await page.evaluate(() => document.body.scrollHeight);
  const scrollSteps3 = FPS * 6;
  for (let i = 0; i < scrollSteps3; i++, fi++) {
    await page.screenshot({ path: path.join(dir, `f${String(fi).padStart(4,"0")}.png`) });
    await page.evaluate((h, s) => window.scrollBy(0, h / s), Math.max(pageH3 - H, 400), scrollSteps3);
    await sleep(DELAY);
  }
  // Hold at results — 3s
  for (let i = 0; i < FPS * 3; i++, fi++) {
    await page.screenshot({ path: path.join(dir, `f${String(fi).padStart(4,"0")}.png`) });
    await sleep(DELAY);
  }
  await makeGif(dir, "03_prevention_intelligence.gif");

  // ════════════════════════════════════════════════════════════════════════
  // SCENE 4 — Upload to Prevention Intelligence
  // ════════════════════════════════════════════════════════════════════════
  console.log("\n🎬 Scene 4: Upload to Prevention Intelligence");
  await page.evaluate(() => window.scrollTo(0, 0));
  dir = path.join(FRAME_DIR, "04-upload");
  ensureDir(dir);
  fi = 0;

  // Show page — 2s
  for (let i = 0; i < FPS * 2; i++, fi++) {
    await page.screenshot({ path: path.join(dir, `f${String(fi).padStart(4,"0")}.png`) });
    await sleep(DELAY);
  }

  // Find file input and upload
  const fileInput = await page.$('input[type="file"]');
  if (fileInput) {
    await fileInput.uploadFile(UPLOAD_FILE);
    console.log("  📎 File selected: ENS24-011 Landfall Pull-In...");
    await sleep(1000);

    // Capture file selected state — 2s
    for (let i = 0; i < FPS * 2; i++, fi++) {
      await page.screenshot({ path: path.join(dir, `f${String(fi).padStart(4,"0")}.png`) });
      await sleep(DELAY);
    }

    // Click submit/analyse button if present
    await page.evaluate(() => {
      const btns = [...document.querySelectorAll("button")];
      const b = btns.find(b => /upload|submit|analyse|analyze|process/i.test(b.textContent));
      if (b) b.click();
    });
    console.log("  ⏳ Waiting for upload processing (up to 3 min)...");

    // Capture processing — wait for results
    const uploadStart = Date.now();
    let uploadDone = false;
    while (Date.now() - uploadStart < 180000) {
      await page.screenshot({ path: path.join(dir, `f${String(fi).padStart(4,"0")}.png`) });
      fi++;
      await sleep(DELAY);
      uploadDone = await page.evaluate(() => {
        const t = document.body.innerText.toLowerCase();
        return t.includes("analysis complete") || t.includes("extracted") ||
               t.includes("lessons") || t.includes("finding") || t.includes("result");
      });
      if (uploadDone) {
        console.log("  ✅ Upload results appeared!");
        break;
      }
    }
    await sleep(1500);

    // Scroll through upload results — 5s
    await page.evaluate(() => window.scrollTo(0, 0));
    const pageH4 = await page.evaluate(() => document.body.scrollHeight);
    const scrollSteps4 = FPS * 5;
    for (let i = 0; i < scrollSteps4; i++, fi++) {
      await page.screenshot({ path: path.join(dir, `f${String(fi).padStart(4,"0")}.png`) });
      await page.evaluate((h, s) => window.scrollBy(0, h / s), Math.max(pageH4 - H, 400), scrollSteps4);
      await sleep(DELAY);
    }
    // Hold — 3s
    for (let i = 0; i < FPS * 3; i++, fi++) {
      await page.screenshot({ path: path.join(dir, `f${String(fi).padStart(4,"0")}.png`) });
      await sleep(DELAY);
    }
  } else {
    console.log("  ⚠️  No file input found on this page — capturing current state");
    for (let i = 0; i < FPS * 6; i++, fi++) {
      await page.screenshot({ path: path.join(dir, `f${String(fi).padStart(4,"0")}.png`) });
      await sleep(DELAY);
    }
  }
  await makeGif(dir, "04_upload_to_pi.gif");

  // ════════════════════════════════════════════════════════════════════════
  // SCENE 5 — Supporting Lessons Learned
  // ════════════════════════════════════════════════════════════════════════
  console.log("\n🎬 Scene 5: Supporting Lessons Learned");
  await page.evaluate(() => window.scrollTo(0, 0));
  dir = path.join(FRAME_DIR, "05-supporting");
  ensureDir(dir);
  fi = 0;

  // Try to find and click the Supporting Lessons Learned tab/section
  await page.evaluate(() => {
    const btns = [...document.querySelectorAll("button, a, [role='tab']")];
    const b = btns.find(b => /supporting/i.test(b.textContent));
    if (b) b.click();
  });
  await sleep(2000);

  // Capture top — 3s
  for (let i = 0; i < FPS * 3; i++, fi++) {
    await page.screenshot({ path: path.join(dir, `f${String(fi).padStart(4,"0")}.png`) });
    await sleep(DELAY);
  }
  // Scroll — 5s
  const pageH5 = await page.evaluate(() => document.body.scrollHeight);
  const scrollSteps5 = FPS * 5;
  for (let i = 0; i < scrollSteps5; i++, fi++) {
    await page.screenshot({ path: path.join(dir, `f${String(fi).padStart(4,"0")}.png`) });
    await page.evaluate((h, s) => window.scrollBy(0, h / s), Math.max(pageH5 - H, 400), scrollSteps5);
    await sleep(DELAY);
  }
  // Hold — 2s
  for (let i = 0; i < FPS * 2; i++, fi++) {
    await page.screenshot({ path: path.join(dir, `f${String(fi).padStart(4,"0")}.png`) });
    await sleep(DELAY);
  }
  await makeGif(dir, "05_supporting_lessons.gif");

  // ════════════════════════════════════════════════════════════════════════
  // SCENE 6 — Trend Analysis
  // ════════════════════════════════════════════════════════════════════════
  console.log("\n🎬 Scene 6: Trend Analysis");
  await page.evaluate(() => window.scrollTo(0, 0));
  dir = path.join(FRAME_DIR, "06-trend");
  ensureDir(dir);
  fi = 0;

  await page.click('button::-p-text("Trend Analysis")');
  await sleep(3500); // charts need time to render

  // Hold at top (KPI / filter area) — 2s
  for (let i = 0; i < FPS * 2; i++, fi++) {
    await page.screenshot({ path: path.join(dir, `f${String(fi).padStart(4,"0")}.png`) });
    await sleep(DELAY);
  }

  // Slow scroll through charts — 6s
  const pageH6 = await page.evaluate(() => document.body.scrollHeight);
  const scrollSteps6 = FPS * 6;
  for (let i = 0; i < scrollSteps6; i++, fi++) {
    await page.screenshot({ path: path.join(dir, `f${String(fi).padStart(4,"0")}.png`) });
    await page.evaluate((h, s) => window.scrollBy(0, h / s), Math.max(pageH6 - H, 600), scrollSteps6);
    await sleep(DELAY);
  }

  // Scroll back to top to show a chart — 2s
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(400);
  for (let i = 0; i < FPS * 2; i++, fi++) {
    await page.screenshot({ path: path.join(dir, `f${String(fi).padStart(4,"0")}.png`) });
    await sleep(DELAY);
  }

  // Hold — 2s
  for (let i = 0; i < FPS * 2; i++, fi++) {
    await page.screenshot({ path: path.join(dir, `f${String(fi).padStart(4,"0")}.png`) });
    await sleep(DELAY);
  }
  await makeGif(dir, "06_trend_analysis.gif");

  // ─────────────────────────────────────────────────────────────────────────
  await browser.close();
  console.log("\n🎉 All GIFs created in:", OUT_DIR);
  console.log("Files:");
  fs.readdirSync(OUT_DIR).forEach(f => {
    const s = (fs.statSync(path.join(OUT_DIR, f)).size / 1024 / 1024).toFixed(1);
    console.log(`  ${f} — ${s} MB`);
  });
})();
