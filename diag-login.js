const puppeteer = require("puppeteer-core");
const fs = require("fs");
const path = require("path");

const chromePaths = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  process.env.LOCALAPPDATA + "\\Google\\Chrome\\Application\\chrome.exe",
];
const chromePath = chromePaths.find(p => fs.existsSync(p));

(async () => {
  console.log("Chrome:", chromePath);
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    defaultViewport: { width: 1440, height: 810 },
  });
  const page = await browser.newPage();

  // Capture console messages
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERR:', err.message));

  console.log("Navigating to login...");
  const resp = await page.goto("http://localhost:3000/login", {
    waitUntil: "domcontentloaded",
    timeout: 60000
  });
  console.log("Status:", resp.status(), "URL:", page.url());

  await new Promise(r => setTimeout(r, 3000));
  console.log("URL after 3s:", page.url());

  const html = await page.content();
  const bodyText = await page.evaluate(() => document.body ? document.body.innerHTML.substring(0, 2000) : "NO BODY");
  console.log("Body snippet:", bodyText);

  const inputs = await page.evaluate(() =>
    [...document.querySelectorAll('input')].map(i => `${i.type}:${i.name}:${i.id}:${i.placeholder}`)
  );
  console.log("Inputs found:", inputs);

  await page.screenshot({ path: path.join(__dirname, "screenshots-ll-v2", "diag_login.png") });
  console.log("Screenshot saved");

  await browser.close();
})();
