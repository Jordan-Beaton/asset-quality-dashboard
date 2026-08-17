/**
 * Captures clean full-page screenshots of the Lessons Learned module.
 * First does a diagnostic pass to find all tab names, then captures each section.
 */
const puppeteer = require("puppeteer-core");
const fs  = require("fs");
const path = require("path");

const EMAIL = process.env.SCREENSHOT_LOGIN_EMAIL || "";
const PASS  = process.env.SCREENSHOT_LOGIN_PASSWORD || "";
const OUT   = path.join(__dirname, "screenshots-ll-final");

const chromePaths = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  process.env.LOCALAPPDATA + "\\Google\\Chrome\\Application\\chrome.exe",
];
const chromePath = chromePaths.find(p => fs.existsSync(p));

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--window-size=1440,900"],
    defaultViewport: { width: 1440, height: 900 },
  });
  const page = await browser.newPage();

  // ── Login ────────────────────────────────────────────────────────────────
  console.log("🔐 Logging in...");
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

  // ── Navigate to Lessons Learned ──────────────────────────────────────────
  await page.goto("http://localhost:3000/lessons-learned", { waitUntil: "networkidle2", timeout: 20000 });
  await sleep(3000);

  // ── DIAGNOSTIC: list all tab/button labels ───────────────────────────────
  const tabs = await page.evaluate(() => {
    const els = [...document.querySelectorAll("button, [role='tab'], nav a")];
    return els.map(el => el.textContent.trim()).filter(t => t.length > 0 && t.length < 60);
  });
  console.log("\n📋 All buttons/tabs found:");
  tabs.forEach(t => console.log("  •", t));

  // ── SCREENSHOT 1: Dashboard (full page) ──────────────────────────────────
  console.log("\n📸 1/6 — Dashboard");
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(800);
  // Full-page screenshot
  const dashH = await page.evaluate(() => document.body.scrollHeight);
  await page.setViewport({ width: 1440, height: Math.min(dashH, 4000) });
  await sleep(500);
  await page.screenshot({ path: path.join(OUT, "01_dashboard.png"), fullPage: false });
  await page.setViewport({ width: 1440, height: 900 });

  // ── SCREENSHOT 2: Register ────────────────────────────────────────────────
  console.log("📸 2/6 — Register");
  const regBtn = await page.evaluate(() => {
    const b = [...document.querySelectorAll("button")].find(b => /register/i.test(b.textContent));
    return b ? (b.click(), true) : false;
  });
  await sleep(2500);
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(500);
  const regH = await page.evaluate(() => document.body.scrollHeight);
  await page.setViewport({ width: 1440, height: Math.min(regH, 4000) });
  await sleep(500);
  await page.screenshot({ path: path.join(OUT, "02_register.png"), fullPage: false });
  await page.setViewport({ width: 1440, height: 900 });

  // ── SCREENSHOT 3: Prevention Intelligence ────────────────────────────────
  console.log("📸 3/6 — Prevention Intelligence");
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.evaluate(() => {
    const b = [...document.querySelectorAll("button")].find(b => /prevention/i.test(b.textContent));
    if (b) b.click();
  });
  await sleep(2500);
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(500);
  const piH = await page.evaluate(() => document.body.scrollHeight);
  await page.setViewport({ width: 1440, height: Math.min(piH, 4000) });
  await sleep(500);
  await page.screenshot({ path: path.join(OUT, "03_prevention_intel_before.png"), fullPage: false });
  await page.setViewport({ width: 1440, height: 900 });

  // Click generate and wait for results
  console.log("  ⏳ Generating Prevention Brief (up to 3 min)...");
  await page.evaluate(() => {
    const b = [...document.querySelectorAll("button")].find(b => /generate|analyse|analyze|run|submit/i.test(b.textContent));
    if (b) b.click();
  });
  const genStart = Date.now();
  while (Date.now() - genStart < 180000) {
    await sleep(3000);
    const done = await page.evaluate(() => {
      const t = document.body.innerText.toLowerCase();
      return t.includes("prevention brief") || t.includes("recommended action") ||
             t.includes("key finding") || t.includes("recommendation");
    });
    if (done) { console.log("  ✅ Brief generated"); break; }
  }
  await sleep(1500);
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(500);
  const piH2 = await page.evaluate(() => document.body.scrollHeight);
  await page.setViewport({ width: 1440, height: Math.min(piH2, 5000) });
  await sleep(800);
  await page.screenshot({ path: path.join(OUT, "03_prevention_intel_after.png"), fullPage: false });
  await page.setViewport({ width: 1440, height: 900 });

  // ── SCREENSHOT 4: Upload to Prevention Intelligence ───────────────────────
  console.log("📸 4/6 — Upload to Prevention Intelligence");
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(500);
  const fileInput = await page.$('input[type="file"]');
  const UPLOAD = "C:\\Users\\JBeaton\\OneDrive - Enshore Subsea\\Desktop\\ENS24-011-ENG-PRO-002 Landfall Pull-In Procedure Rev A.pdf";
  if (fileInput) {
    await fileInput.uploadFile(UPLOAD);
    console.log("  📎 File uploaded");
    await sleep(1000);
    // Screenshot showing file selected but before processing
    await page.screenshot({ path: path.join(OUT, "04_upload_selected.png") });
    // Click submit/process
    await page.evaluate(() => {
      const b = [...document.querySelectorAll("button")].find(b => /upload|submit|analyse|analyze|process/i.test(b.textContent));
      if (b) b.click();
    });
    console.log("  ⏳ Processing upload (up to 3 min)...");
    const upStart = Date.now();
    while (Date.now() - upStart < 180000) {
      await sleep(3000);
      const done = await page.evaluate(() => {
        const t = document.body.innerText.toLowerCase();
        return t.includes("analysis complete") || t.includes("extracted") ||
               t.includes("finding") || t.includes("result") || t.includes("lesson");
      });
      if (done) { console.log("  ✅ Upload processed"); break; }
    }
    await sleep(1500);
    await page.evaluate(() => window.scrollTo(0, 0));
    await sleep(500);
    const upH = await page.evaluate(() => document.body.scrollHeight);
    await page.setViewport({ width: 1440, height: Math.min(upH, 5000) });
    await sleep(800);
    await page.screenshot({ path: path.join(OUT, "04_upload_results.png"), fullPage: false });
    await page.setViewport({ width: 1440, height: 900 });
  } else {
    console.log("  ⚠️  No file input found — screenshot current state");
    await page.screenshot({ path: path.join(OUT, "04_upload_results.png") });
  }

  // ── SCREENSHOT 5: Supporting Lessons Learned ──────────────────────────────
  console.log("📸 5/6 — Supporting Lessons Learned");
  await page.evaluate(() => window.scrollTo(0, 0));
  // Try every variation of the tab name
  const supportingClicked = await page.evaluate(() => {
    const b = [...document.querySelectorAll("button, [role='tab'], a")].find(b =>
      /supporting/i.test(b.textContent) || /support/i.test(b.textContent)
    );
    if (b) { b.click(); return b.textContent.trim(); }
    return null;
  });
  console.log("  Tab clicked:", supportingClicked || "NOT FOUND — taking screenshot of current page");
  await sleep(2500);
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(500);
  const supH = await page.evaluate(() => document.body.scrollHeight);
  await page.setViewport({ width: 1440, height: Math.min(supH, 4000) });
  await sleep(500);
  await page.screenshot({ path: path.join(OUT, "05_supporting.png"), fullPage: false });
  await page.setViewport({ width: 1440, height: 900 });

  // ── SCREENSHOT 6: Trend Analysis ──────────────────────────────────────────
  console.log("📸 6/6 — Trend Analysis");
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.evaluate(() => {
    const b = [...document.querySelectorAll("button")].find(b => /trend/i.test(b.textContent));
    if (b) b.click();
  });
  await sleep(4000); // charts need time
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(500);
  const trendH = await page.evaluate(() => document.body.scrollHeight);
  await page.setViewport({ width: 1440, height: Math.min(trendH, 5000) });
  await sleep(1000);
  await page.screenshot({ path: path.join(OUT, "06_trend_analysis.png"), fullPage: false });
  await page.setViewport({ width: 1440, height: 900 });

  // ── SCREENSHOT 7: Login page (request access) ─────────────────────────────
  console.log("📸 7/7 — Login page (Request Access)");
  await page.goto("http://localhost:3000/login", { waitUntil: "networkidle2", timeout: 15000 });
  await sleep(1500);
  await page.screenshot({ path: path.join(OUT, "07_login.png") });

  await browser.close();

  console.log("\n✅ All screenshots saved:");
  fs.readdirSync(OUT).forEach(f => {
    const s = (fs.statSync(path.join(OUT, f)).size / 1024).toFixed(0);
    console.log(`  ${f} — ${s} KB`);
  });
})();
