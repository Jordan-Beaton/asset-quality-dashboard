// Capture Lessons Learned screenshots for the L&L deck
const puppeteer = require("puppeteer-core");
const fs = require("fs");
const path = require("path");

const LOGIN_EMAIL = process.env.SCREENSHOT_LOGIN_EMAIL || "";
const LOGIN_PASSWORD = process.env.SCREENSHOT_LOGIN_PASSWORD || "";
const OUT_DIR = "C:\\Users\\JBeaton\\asset-quality-webapp\\screenshots-ll";
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR);

const chromePaths = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  process.env.LOCALAPPDATA + "\\Google\\Chrome\\Application\\chrome.exe",
];
const chromePath = chromePaths.find(p => fs.existsSync(p));
if (!chromePath) { console.error("Chrome not found"); process.exit(1); }

const PAGES = [
  { name: "01_ll_main",     url: "http://localhost:3000/lessons-learned" },
  { name: "02_ll_main_b",   url: "http://localhost:3000/lessons-learned" },  // second pass after scroll
  { name: "03_home",        url: "http://localhost:3000/home" },
];

(async () => {
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: false,   // visible so we can see it
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--window-size=1440,900"],
    defaultViewport: { width: 1440, height: 900 },
  });

  const page = await browser.newPage();

  // Login
  console.log("Logging in...");
  await page.goto("http://localhost:3000/login", { waitUntil: "networkidle2", timeout: 20000 });
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });
  const emailInput = await page.$('input[type="email"]');
  await emailInput.click({ clickCount: 3 });
  await emailInput.type(LOGIN_EMAIL);
  const passwordInput = await page.$('input[type="password"]');
  await passwordInput.click({ clickCount: 3 });
  await passwordInput.type(LOGIN_PASSWORD);
  const submitBtn = await page.$('button[type="submit"]');
  await submitBtn.click();
  await page.waitForFunction(() => !window.location.pathname.startsWith("/login"), { timeout: 15000 });
  await new Promise(r => setTimeout(r, 2000));
  console.log("Logged in:", await page.url());

  // Capture lessons-learned main page
  await page.goto("http://localhost:3000/lessons-learned", { waitUntil: "networkidle2", timeout: 20000 });
  await new Promise(r => setTimeout(r, 3000)); // let charts/tables load

  // Full-page screenshot
  await page.screenshot({
    path: path.join(OUT_DIR, "01_ll_main.png"),
    fullPage: false,
  });
  console.log("✅ 01_ll_main.png — top of page");

  // Scroll down a bit and capture more
  await page.evaluate(() => window.scrollBy(0, 400));
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({
    path: path.join(OUT_DIR, "02_ll_scrolled.png"),
    fullPage: false,
  });
  console.log("✅ 02_ll_scrolled.png — scrolled view");

  // Back to top for a clean shot
  await page.evaluate(() => window.scrollTo(0, 0));
  await new Promise(r => setTimeout(r, 500));
  // Try to widen viewport to 1920 for full table visibility
  await page.setViewport({ width: 1920, height: 1080 });
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({
    path: path.join(OUT_DIR, "03_ll_wide.png"),
    fullPage: false,
  });
  console.log("✅ 03_ll_wide.png — 1920px wide");

  // Home dashboard
  await page.goto("http://localhost:3000/home", { waitUntil: "networkidle2", timeout: 15000 });
  await new Promise(r => setTimeout(r, 2000));
  await page.setViewport({ width: 1440, height: 900 });
  await page.screenshot({
    path: path.join(OUT_DIR, "04_home.png"),
    fullPage: false,
  });
  console.log("✅ 04_home.png — home dashboard");

  await browser.close();
  console.log("\nDone. Screenshots in:", OUT_DIR);
})();
