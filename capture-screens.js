// Uses puppeteer-core with the system Chrome to capture screenshots
// Optional local-only login credentials for screenshot capture.
// Set SCREENSHOT_LOGIN_EMAIL and SCREENSHOT_LOGIN_PASSWORD in your shell or .env.local.
const LOGIN_EMAIL = process.env.SCREENSHOT_LOGIN_EMAIL || "";
const LOGIN_PASSWORD = process.env.SCREENSHOT_LOGIN_PASSWORD || "";

const fs = require("fs");
const path = require("path");

const OUT_DIR = "C:\\Users\\JBeaton\\asset-quality-webapp\\screenshots";
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR);

// Find Chrome
const chromePaths = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  process.env.LOCALAPPDATA + "\\Google\\Chrome\\Application\\chrome.exe",
];
const chromePath = chromePaths.find(p => fs.existsSync(p));

if (!chromePath) {
  console.error("Chrome not found"); process.exit(1);
}
console.log("Chrome:", chromePath);

const puppeteer = require("puppeteer-core");

const PAGES = [
  { name: "01_home",       url: "http://localhost:3000/home" },
  { name: "02_quality",    url: "http://localhost:3000/quality" },
  { name: "03_hse",        url: "http://localhost:3000/hse" },
  { name: "04_documents",  url: "http://localhost:3000/documents" },
  { name: "05_doc_register", url: "http://localhost:3000/documents?view=register" },
  { name: "06_ncr",        url: "http://localhost:3000/ncr-capa" },
  { name: "07_moc",        url: "http://localhost:3000/moc" },
  { name: "08_risk",       url: "http://localhost:3000/risk" },
  { name: "09_assets",     url: "http://localhost:3000/assets/dashboard" },
  { name: "10_inspections",url: "http://localhost:3000/hse/inspections" },
  { name: "11_ainm",       url: "http://localhost:3000/hse/ainm" },
  { name: "12_ptw",        url: "http://localhost:3000/hse/ptw" },
  { name: "13_actions",    url: "http://localhost:3000/actions" },
  { name: "14_people",     url: "http://localhost:3000/people" },
];

(async () => {
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--window-size=1440,900"],
    defaultViewport: { width: 1440, height: 900 },
  });

  const page = await browser.newPage();

  if (LOGIN_EMAIL && LOGIN_PASSWORD) {
    console.log("Logging in for screenshot capture...");
    await page.goto("http://localhost:3000/login", { waitUntil: "networkidle2", timeout: 20000 });

    await page.waitForSelector('input[type="email"], input[name="email"], input[placeholder*="mail" i]', { timeout: 10000 });
    const emailInput = await page.$('input[type="email"]') || await page.$('input[name="email"]');
    await emailInput.click({ clickCount: 3 });
    await emailInput.type(LOGIN_EMAIL);

    const passwordInput = await page.$('input[type="password"]');
    await passwordInput.click({ clickCount: 3 });
    await passwordInput.type(LOGIN_PASSWORD);

    const submitBtn = await page.$('button[type="submit"]') || await page.$('button');
    await submitBtn.click();

    await page.waitForFunction(() => !window.location.pathname.startsWith("/login"), { timeout: 15000 });
    await new Promise(r => setTimeout(r, 2000));
    console.log("Logged in — now at:", await page.url());
  } else {
    console.log("Screenshot login skipped. Set SCREENSHOT_LOGIN_EMAIL and SCREENSHOT_LOGIN_PASSWORD to capture authenticated pages.");
  }

  for (const { name, url } of PAGES) {
    try {
      await page.goto(url, { waitUntil: "networkidle2", timeout: 15000 });
      await new Promise(r => setTimeout(r, 1200)); // wait for charts
      const file = path.join(OUT_DIR, `${name}.jpg`);
      await page.screenshot({ path: file, type: "jpeg", quality: 90 });
      console.log(`✅ ${name}`);
    } catch (e) {
      console.error(`❌ ${name}: ${e.message}`);
    }
  }

  await browser.close();
  console.log("Done. Screenshots in:", OUT_DIR);
})();
