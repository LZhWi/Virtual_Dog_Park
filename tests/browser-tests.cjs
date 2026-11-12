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
    if (round >= 2) {
      await page.getByRole("button", { name: "Adopt", exact: true }).click();
      assert.match(await page.locator("#name-error").innerText(), /1 to 20/);
      await page.locator("#dog-name").fill("   ");
      await page.getByRole("button", { name: "Adopt", exact: true }).click();
      assert.ok(await page.locator("#adoption-form").isVisible());
      await page.locator("#dog-name").fill("");
      await page.locator("#dog-name").pressSequentially("ABCDEFGHIJKLMNOPQRSTUVWXYZ");
      assert.equal((await page.locator("#dog-name").inputValue()).length, 20);
      for (const breed of ["Beagle", "Golden Retriever", "Poodle"]) {
        await page.locator("#breed").selectOption(breed);
        await page.locator("#dog-name").fill("  <Buddy & Co>  ");
        await page.getByRole("button", { name: "Adopt", exact: true }).click();
        assert.equal(await page.locator("#pet-name").innerText(), "<Buddy & Co>");
        assert.equal(await page.locator("#pet-name *").count(), 0);
        assert.equal(await page.locator("#pet-breed").innerText(), breed);
        await page.reload();
        if (round >= 3) {
          assert.equal(await page.locator("#pet-name").innerText(), "<Buddy & Co>");
          assert.equal(await page.locator("#pet-breed").innerText(), breed);
          await page.evaluate(() => localStorage.removeItem("virtualDogParkPetV1"));
          await page.reload();
        }
      }
      await page.locator("#dog-name").fill("Buddy");
      await page.getByRole("button", { name: "Adopt", exact: true }).click();
      assert.equal(await page.locator("#pet-day").innerText(), "1");
      assert.equal(await page.locator("#pet-stage").innerText(), "Puppy");
      assert.equal(await page.locator("#pet-happiness").innerText(), "50");
      assert.ok(await page.locator("#adoption-form").isHidden());
      if (round >= 3) {
        await page.reload();
        assert.equal(await page.locator("#pet-name").innerText(), "Buddy");
        assert.equal(await page.locator("#pet-happiness").innerText(), "50");
      }
      await page.locator("#feed").click();
      if (round >= 3) await page.reload();
      assert.equal(await page.locator("#pet-happiness").innerText(), "60");
      await page.locator("#play").click();
      if (round >= 3) await page.reload();
      assert.equal(await page.locator("#pet-happiness").innerText(), "70");
      for (let click = 0; click < 6; click++) await page.locator("#play").click();
      assert.equal(await page.locator("#pet-happiness").innerText(), "100");
    }
    if (round >= 3) {
      assert.equal(await page.locator("#growth").evaluate(bar => bar.value), 1);
      for (const [day, stage, happiness, growth] of [
        [2, "Young Dog", 95, "2"], [3, "Young Dog", 90, "2"], [4, "Adult Dog", 85, "3"],
      ]) {
        await page.locator("#next-day").click();
        await page.reload();
        assert.equal(await page.locator("#pet-day").innerText(), String(day));
        assert.equal(await page.locator("#pet-stage").innerText(), stage);
        assert.equal(await page.locator("#pet-happiness").innerText(), String(happiness));
        assert.equal(await page.locator("#growth").evaluate(bar => bar.value), Number(growth));
      }
      await page.locator("#feed").click();
      await page.reload();
      assert.equal(await page.locator("#pet-happiness").innerText(), "95");
      const beforeCancel = await page.evaluate(() => localStorage.getItem("virtualDogParkPetV1"));
      page.once("dialog", dialog => dialog.dismiss());
      await page.locator("#start-over").click();
      await page.reload();
      assert.equal(await page.evaluate(() => localStorage.getItem("virtualDogParkPetV1")), beforeCancel);
      assert.equal(await page.locator("#pet-name").innerText(), "Buddy");
      for (let day = 0; day < 21; day++) await page.locator("#next-day").click();
      await page.reload();
      assert.equal(await page.locator("#pet-happiness").innerText(), "0");
      assert.equal(await page.locator("#pet-stage").innerText(), "Adult Dog");
      page.once("dialog", dialog => dialog.accept());
      await page.locator("#start-over").click();
      await page.reload();
      assert.ok(await page.locator("#adoption-form").isVisible());
      assert.equal(await page.evaluate(() => localStorage.getItem("virtualDogParkPetV1")), null);
      // Leave a Day 4 dog visible for the screenshots.
      await page.locator("#dog-name").fill("Buddy");
      await page.getByRole("button", { name: "Adopt", exact: true }).click();
      for (let day = 0; day < 3; day++) await page.locator("#next-day").click();
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
    if (round >= 2) report.checks.push("blank names rejected", "20-character input limit",
      "trimmed names and literal special characters", "all three breeds adopt",
      "Day 1 Puppy starts at 50", "Feed and Play add 10 and cap at 100");
    if (round >= 3) report.checks.push("refresh restores adoption, Feed, Play and Next Day",
      "Day 2 and 3 Young Dog; Day 4 Adult Dog", "three distinct growth bar values",
      "Next Day subtracts 5 and stops at zero", "Cancel preserves saved dog",
      "Confirm clears saved dog across refresh");
    fs.writeFileSync(path.join(results, "round-" + round + ".json"), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; })
  .finally(() => server.close());
