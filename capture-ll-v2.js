/**
 * Captures clean 1440×810 (16:9) screenshots of the Lessons Learned module.
 * Each screenshot fills a PowerPoint slide with no distortion.
 */
const puppeteer = require("puppeteer-core");
const fs  = require("fs");
const path = require("path");

const EMAIL = process.env.SCREENSHOT_LOGIN_EMAIL || "";
const PASS  = process.env.SCREENSHOT_LOGIN_PASSWORD || "";
const OUT   = path.join(__dirname, "screenshots-ll-v2");

// Exactly 16:9 — matches slide ratio perfectly
const VW = 1440, VH = 810;

const chromePaths = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  process.env.LOCALAPPDATA + "\\Google\\Chrome\\Application\\chrome.exe",
];
const chromePath = chromePaths.find(p => fs.existsSync(p));
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function waitForData(page, timeout = 12000) {
  // Wait until the page stops showing 0s or loading spinners
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const loaded = await page.evaluate(() => {
      const text = document.body.innerText;
      // Look for actual lesson counts (non-zero numbers)
      return /[1-9]\d*/.test(text) && !document.querySelector('.animate-spin, [data-loading="true"]');
    });
    if (loaded) return;
    await sleep(800);
  }
}

if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", `--window-size=${VW},${VH}`],
    defaultViewport: { width: VW, height: VH },
  });
  const page = await browser.newPage();

  // ── Login ─────────────────────────────────────────────────────────────────
  console.log("🔐 Logging in...");
  await page.goto("http://localhost:3000/login", { waitUntil: "domcontentloaded", timeout: 60000 });
  await sleep(5000);
  await page.waitForSelector('input[type="email"]', { timeout: 30000 });
  await page.click('input[type="email"]');
  await page.type('input[type="email"]', EMAIL, { delay: 40 });
  await page.click('input[type="password"]');
  await page.type('input[type="password"]', PASS, { delay: 40 });

  // Capture login page BEFORE submitting (for Request Access slide)
  await page.screenshot({ path: path.join(OUT, "00_login.png") });
  console.log("✅ 00_login (before submit)");

  await page.click('button[type="submit"]');
  await page.waitForFunction(() => !window.location.pathname.startsWith("/login"), { timeout: 30000 });
  await sleep(3000);
  console.log("✅ Logged in");

  // ── 1: Dashboard ──────────────────────────────────────────────────────────
  console.log("\n📸 Dashboard...");
  await page.goto("http://localhost:3000/lessons-learned", { waitUntil: "domcontentloaded", timeout: 60000 }); await sleep(1500);
  await sleep(2000);
  // Click Dashboard tab explicitly to ensure we're on it
  await page.evaluate(() => {
    const b = [...document.querySelectorAll("button")].find(b => b.textContent.trim() === "Dashboard");
    if (b) b.click();
  });
  await sleep(1000);
  // Wait for real data to load (not zeros)
  await waitForData(page, 15000);
  await sleep(2000); // extra wait for charts/graphs to render
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(500);
  await page.screenshot({ path: path.join(OUT, "01_dashboard.png") });
  console.log("✅ 01_dashboard");

  // ── 2: Register ───────────────────────────────────────────────────────────
  console.log("📸 Register...");
  await page.evaluate(() => {
    const b = [...document.querySelectorAll("button")].find(b => b.textContent.trim() === "Register");
    if (b) b.click();
  });
  await sleep(3000);
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(500);
  await page.screenshot({ path: path.join(OUT, "02_register.png") });
  console.log("✅ 02_register");

  // ── 3: Prevention Intelligence — input ────────────────────────────────────
  console.log("📸 Prevention Intelligence (input)...");
  await page.evaluate(() => {
    const b = [...document.querySelectorAll("button")].find(b => /prevention intelligence/i.test(b.textContent));
    if (b) b.click();
  });
  await sleep(2500);
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(500);
  await page.screenshot({ path: path.join(OUT, "03_pi_input.png") });
  console.log("✅ 03_pi_input");

  // ── 4: Prevention Intelligence — generate + results ───────────────────────
  console.log("📸 Prevention Intelligence (generating brief, please wait)...");
  await page.evaluate(() => {
    const b = [...document.querySelectorAll("button")].find(b => /generate/i.test(b.textContent));
    if (b) b.click();
  });
  const genStart = Date.now();
  while (Date.now() - genStart < 240000) {
    await sleep(3000);
    const done = await page.evaluate(() =>
      document.body.innerText.toLowerCase().includes("prevention brief") ||
      document.body.innerText.toLowerCase().includes("recommended action") ||
      document.body.innerText.toLowerCase().includes("key finding") ||
      document.body.innerText.toLowerCase().includes("recommendation")
    );
    if (done) { console.log("  ✅ Brief generated"); break; }
  }
  await sleep(2000);
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(500);
  await page.screenshot({ path: path.join(OUT, "04_pi_results.png") });
  console.log("✅ 04_pi_results");

  // ── 5: Upload — choose file ───────────────────────────────────────────────
  console.log("📸 Upload (selecting file)...");
  // Still on Prevention Intelligence page — scroll to file input
  const UPLOAD_FILE = "C:\\Users\\JBeaton\\OneDrive - Enshore Subsea\\Desktop\\ENS24-011-ENG-PRO-002 Landfall Pull-In Procedure Rev A.pdf";
  const fileInput = await page.$('input[type="file"]');
  if (fileInput) {
    await page.evaluate(() => window.scrollTo(0, 0));
    await sleep(300);
    await fileInput.uploadFile(UPLOAD_FILE);
    await sleep(1200);
    await page.screenshot({ path: path.join(OUT, "05_upload_selected.png") });
    console.log("✅ 05_upload_selected");

    // Submit upload
    await page.evaluate(() => {
      const b = [...document.querySelectorAll("button")].find(b => /generate/i.test(b.textContent));
      if (b) b.click();
    });
    console.log("  ⏳ Processing upload...");
    const upStart = Date.now();
    while (Date.now() - upStart < 240000) {
      await sleep(3000);
      const done = await page.evaluate(() => {
        const t = document.body.innerText.toLowerCase();
        return t.includes("prevention brief") || t.includes("finding") || t.includes("result") || t.includes("comparison");
      });
      if (done) { console.log("  ✅ Upload results ready"); break; }
    }
    await sleep(2000);
    await page.evaluate(() => window.scrollTo(0, 0));
    await sleep(500);
    await page.screenshot({ path: path.join(OUT, "06_upload_results.png") });
    console.log("✅ 06_upload_results");
  } else {
    console.log("  ⚠️  No file input found");
    fs.copyFileSync(path.join(OUT, "04_pi_results.png"), path.join(OUT, "06_upload_results.png"));
  }

  // ── 6: Create ─────────────────────────────────────────────────────────────
  console.log("📸 Create...");
  await page.evaluate(() => {
    const b = [...document.querySelectorAll("button")].find(b => b.textContent.trim() === "Create");
    if (b) b.click();
  });
  await sleep(2500);
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(500);
  await page.screenshot({ path: path.join(OUT, "07_create.png") });
  console.log("✅ 07_create");

  // ── 7: Trend Analysis ────────────────────────────────────────────────────
  console.log("📸 Trend Analysis...");
  await page.evaluate(() => {
    const b = [...document.querySelectorAll("button")].find(b => /trend analysis/i.test(b.textContent));
    if (b) b.click();
  });
  // Charts need significant render time
  await sleep(3000);
  await waitForData(page, 15000);
  await sleep(4000); // extra for chart.js/recharts to render
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(500);
  await page.screenshot({ path: path.join(OUT, "08_trend.png") });
  console.log("✅ 08_trend");

  await browser.close();
  console.log("\n✅ All done:");
  fs.readdirSync(OUT).sort().forEach(f => {
    const kb = Math.round(fs.statSync(path.join(OUT, f)).size / 1024);
    console.log(`  ${f} — ${kb} KB`);
  });
})();
