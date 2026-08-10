// Re-capture all screens with proper scrolling/framing for the PowerPoint
const puppeteer = require("puppeteer-core");
const fs = require("fs");
const path = require("path");

const EMAIL = process.env.SCREENSHOT_LOGIN_EMAIL || "";
const PASS  = process.env.SCREENSHOT_LOGIN_PASSWORD || "";
const OUT   = "C:\\Users\\JBeaton\\asset-quality-webapp\\screenshots-ll\\";

const chromePaths = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  process.env.LOCALAPPDATA + "\\Google\\Chrome\\Application\\chrome.exe",
];
const chromePath = chromePaths.find(p => fs.existsSync(p));

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
  await page.waitForSelector('input[type="email"]');
  await (await page.$('input[type="email"]')).type(EMAIL);
  await (await page.$('input[type="password"]')).type(PASS);
  await (await page.$('button[type="submit"]')).click();
  await page.waitForFunction(() => !window.location.pathname.startsWith("/login"), { timeout: 15000 });
  await new Promise(r => setTimeout(r, 2000));
  console.log("Logged in");

  // ── LOGIN PAGE (for "request access" guide)
  await page.goto("http://localhost:3000/login", { waitUntil: "networkidle2", timeout: 15000 });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: OUT + "A_login.png" });
  console.log("✅ A_login");

  // ── DASHBOARD tab — KPI cards + "What We've Learned" card
  await page.goto("http://localhost:3000/lessons-learned", { waitUntil: "networkidle2", timeout: 20000 });
  await new Promise(r => setTimeout(r, 4000));
  await page.screenshot({ path: OUT + "B_dashboard.png" });
  console.log("✅ B_dashboard");

  // ── REGISTER tab — show the table with rows clearly
  await page.click('button::-p-text("Register")');
  await new Promise(r => setTimeout(r, 2000));
  // Scroll just enough to get the table header and first rows visible
  await page.evaluate(() => window.scrollTo(0, 250));
  await new Promise(r => setTimeout(r, 800));
  await page.screenshot({ path: OUT + "C_register.png" });
  console.log("✅ C_register");

  // ── REGISTER — wider viewport to show more columns
  await page.setViewport({ width: 1920, height: 1080 });
  await page.evaluate(() => window.scrollTo(0, 250));
  await new Promise(r => setTimeout(r, 800));
  await page.screenshot({ path: OUT + "D_register_wide.png" });
  console.log("✅ D_register_wide");
  await page.setViewport({ width: 1440, height: 900 });

  // ── TREND ANALYSIS tab — full chart
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.click('button::-p-text("Trend Analysis")');
  await new Promise(r => setTimeout(r, 4000));
  // Scroll a little to cut the KPI cards and show just the chart
  await page.evaluate(() => window.scrollTo(0, 330));
  await new Promise(r => setTimeout(r, 800));
  await page.screenshot({ path: OUT + "E_trend.png" });
  console.log("✅ E_trend");

  // Also capture with full chart visible (scroll to chart position)
  await page.evaluate(() => window.scrollTo(0, 280));
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: OUT + "F_trend_full.png" });
  console.log("✅ F_trend_full");

  // ── CREATE tab — show full form
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.click('button::-p-text("Create")');
  await new Promise(r => setTimeout(r, 2000));
  await page.evaluate(() => window.scrollTo(0, 280));
  await new Promise(r => setTimeout(r, 800));
  await page.screenshot({ path: OUT + "G_create.png" });
  console.log("✅ G_create");

  await browser.close();
  console.log("\nAll screenshots saved to:", OUT);
})();
