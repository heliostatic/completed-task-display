/** Drives test-page.html the way a person would, and reports what it showed. */
import { chromium } from "playwright";

const shot = process.argv[2];
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const page = await browser.newPage({ viewport: { width: 1500, height: 1000 }, deviceScaleFactor: 2 });
const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push(String(e)));

await page.goto("http://localhost:5199/test-page.html", { waitUntil: "networkidle" });
await page.waitForSelector(".cm-content");
await page.waitForTimeout(400);

const state = async (label) => ({
  step: label,
  verdict: (await page.textContent("#verdict")).slice(0, 160),
  verdictClass: await page.getAttribute("#verdict", "class"),
  hiddenCount: (await page.textContent("#report")).match(/(\d+) line/)?.[1] ?? "0",
  readingItems: await page.evaluate(
    () =>
      [...document.querySelector("#reading").contentDocument.querySelectorAll("li")].filter(
        (li) => li.getBoundingClientRect().height > 0,
      ).length,
  ),
});

const steps = [await state("initial (hiding on, widgets on)")];
await page.screenshot({ path: `${shot}/test-page.png`, fullPage: true });

await page.uncheck("#hiddenState");
await page.waitForTimeout(150);
steps.push(await state("hiding off"));

await page.check("#hiddenState");
await page.check("#hideSubBullets");
await page.waitForTimeout(150);
steps.push(await state("hiding on + sub-bullets on"));

await page.uncheck("#hideSubBullets");
await page.check("#legacy");
await page.waitForTimeout(200);
steps.push(await state("1.0.11 stylesheet — expect the bug"));
await page.screenshot({ path: `${shot}/test-page-legacy.png`, fullPage: true });

await page.uncheck("#legacy");
await page.waitForTimeout(150);
steps.push(await state("back to the fixed stylesheet"));

// Typing must keep working: complete a task by hand
await page.click(".cm-content");
const typed = await page.evaluate(() => {
  const view = document.querySelector(".cm-editor").cmView?.view;
  return !!view;
});
await page.keyboard.press("Control+End");
await page.keyboard.type("\n- [ ] typed by hand");
await page.waitForTimeout(200);
const afterTyping = await page.evaluate(() => {
  const lines = [...document.querySelectorAll(".cm-line")];
  const last = lines[lines.length - 1];
  return { text: last.textContent, visible: last.getBoundingClientRect().height > 0, lineCount: lines.length };
});

console.log(JSON.stringify({ errors, steps, typingWorks: afterTyping, cmViewExposed: typed }, null, 2));
await browser.close();
