const puppeteer = require("puppeteer-core");
const fs = require("fs");
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
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--window-size=1440,900"],
    defaultViewport: { width: 1440, height: 900 },
  });
  const page = await browser.newPage();

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

  await page.goto("http://localhost:3000/lessons-learned", { waitUntil: "networkidle2", timeout: 20000 });
  await sleep(3000);

  // Click Create tab
  await page.evaluate(() => {
    const b = [...document.querySelectorAll("button")].find(b => b.textContent.trim() === "Create");
    if (b) b.click();
  });
  await sleep(2000);
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(500);

  const h = await page.evaluate(() => document.body.scrollHeight);
  await page.setViewport({ width: 1440, height: Math.min(h, 5000) });
  await sleep(500);
  await page.screenshot({ path: path.join(OUT, "05_create.png"), fullPage: false });
  console.log("✅ Create tab captured");

  // Also scroll down to capture the form fields
  await page.setViewport({ width: 1440, height: 900 });
  await page.evaluate(() => window.scrollTo(0, 400));
  await sleep(500);
  await page.screenshot({ path: path.join(OUT, "05_create_scrolled.png") });
  console.log("✅ Create tab scrolled captured");

  await browser.close();
})();
