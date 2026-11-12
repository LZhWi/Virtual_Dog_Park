// Test tooling only. The website itself needs no packages.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { chromium } = require("playwright");

const root = path.resolve(__dirname, "..");
const round = Number(process.argv[2] || 1);
const results = path.join(__dirname, "results");
fs.mkdirSync(results, { recursive: true });

const server = http.createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
  const file = path.resolve(root, "." + (pathname === "/" ? "/index.html" : pathname));
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    response.writeHead(404).end();
    return;
  }
  const types = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml" };
  response.setHeader("Content-Type", types[path.extname(file)] || "application/octet-stream");
  fs.createReadStream(file).pipe(response);
});

async function main() {
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const browser = await chromium.launch({
    executablePath: process.env.BROWSER_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: true,
  });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto("http://127.0.0.1:" + server.address().port);
    assert.equal(await page.locator(".breed-grid article").count(), 3);
    assert.deepEqual(await page.locator(".breed-grid h3").allTextContents(),
      ["Beagle", "Golden Retriever", "Poodle"]);
    for (const image of await page.locator(".breed-grid img").all()) {
      assert.match(await image.getAttribute("src"), /^assets\//);
      assert.match(await image.getAttribute("alt"), /Illustration of/);
      assert.ok(await image.evaluate(img => img.complete && img.naturalWidth > 0));
    }
    await page.screenshot({ path: path.join(results, "round-" + round + "-desktop.png"), fullPage: true });
    await page.setViewportSize({ width: 375, height: 812 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    const cards = await page.locator(".breed-grid article").all();
    const positions = await Promise.all(cards.map(card => card.boundingBox()));
    assert.ok(positions[1].y >= positions[0].y + positions[0].height);
    await page.screenshot({ path: path.join(results, "round-" + round + "-mobile.png"), fullPage: true });
    assert.deepEqual(errors, []);
    const report = { round, passed: true, browser: await browser.version(),
      checks: ["three breeds", "three local images and alt text", "375px stacked layout", "no JavaScript errors"] };
    fs.writeFileSync(path.join(results, "round-" + round + ".json"), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; })
  .finally(() => server.close());
