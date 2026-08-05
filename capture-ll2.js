// Capture additional Lessons Learned tabs for the deck
const puppeteer = require("puppeteer-core");
const fs = require("fs");
const path = require("path");

const LOGIN_EMAIL = process.env.SCREENSHOT_LOGIN_EMAIL || "";
const LOGIN_PASSWORD = process.env.SCREENSHOT_LOGIN_PASSWORD || "";
const OUT_DIR = "C:\\Users\\JBeaton\\asset-quality-webapp\\screenshots-ll";

const chromePaths = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  process.env.LOCALAPPDATA + "\\Google\\Chrome\\Application\\chrome.exe",
];
const chromePath = chromePaths.find(p => fs.existsSync(p));
if (!chromePath) { console.error("Chrome not found"); process.exit(1); }

(async () => {
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--window-size=1440,900"],
    defaultViewport: { width: 1440, height: 900 },
  });

  const page = await browser.newPage();

  // Login
  await page.goto("http://localhost:3000/login", { waitUntil: "networkidle2", timeout: 20000 });
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });
  await (await page.$('input[type="email"]')).type(LOGIN_EMAIL);
  await (await page.$('input[type="password"]')).type(LOGIN_PASSWORD);
  await (await page.$('button[type="submit"]')).click();
  await page.waitForFunction(() => !window.location.pathname.startsWith("/login"), { timeout: 15000 });
  await new Promise(r => setTimeout(r, 2000));

  // ── Dashboard (clean, 1440px)
  await page.goto("http://localhost:3000/lessons-learned", { waitUntil: "networkidle2", timeout: 20000 });
  await new Promise(r => setTimeout(r, 3500));
  await page.screenshot({ path: path.join(OUT_DIR, "05_dashboard_1440.png") });
  console.log("✅ 05_dashboard_1440");

  // ── Click Register tab
  await page.click('button::-p-text("Register")');
  await new Promise(r => setTimeout(r, 3000));
  await page.screenshot({ path: path.join(OUT_DIR, "06_register.png") });
  console.log("✅ 06_register");

  // ── Scroll register down slightly to show rows
  await page.evaluate(() => window.scrollBy(0, 200));
  await new Promise(r => setTimeout(r, 800));
  await page.screenshot({ path: path.join(OUT_DIR, "07_register_rows.png") });
  console.log("✅ 07_register_rows");

  // ── Click Trend Analysis tab
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.click('button::-p-text("Trend Analysis")');
  await new Promise(r => setTimeout(r, 4000));
  await page.screenshot({ path: path.join(OUT_DIR, "08_trend_analysis.png") });
  console.log("✅ 08_trend_analysis");

  // ── Scroll trend analysis
  await page.evaluate(() => window.scrollBy(0, 400));
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(OUT_DIR, "09_trend_scrolled.png") });
  console.log("✅ 09_trend_scrolled");

  // ── Click Create tab
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.click('button::-p-text("Create")');
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: path.join(OUT_DIR, "10_create_form.png") });
  console.log("✅ 10_create_form");

  await browser.close();
  console.log("\nDone.");
})();
