/**
 * Reports what every settings combination renders, in both modes, plus what
 * happens when a setting is flipped at runtime on an open editor.
 */
import { chromium } from "playwright";

const shot = process.argv[2];
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const page = await browser.newPage({ viewport: { width: 1400, height: 1200 }, deviceScaleFactor: 2 });
const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push(String(e)));

await page.goto("http://localhost:5199/settings.html", { waitUntil: "networkidle" });
await page.waitForSelector(".cm-content");
await page.waitForTimeout(400);

const read = () =>
  page.evaluate(() => {
    const visible = (el) => el.getBoundingClientRect().height > 0;
    const edit = [...document.querySelectorAll("#edit .pane")].map((p) => ({
      settings: p.querySelector("h2").textContent,
      shown: [...p.querySelectorAll(".cm-line")].filter(visible).map((l) => l.textContent.trim()),
    }));
    const reading = [...document.querySelectorAll("#reading .pane")].map((p) => {
      const doc = p.querySelector("iframe").contentDocument;
      return {
        settings: p.querySelector("h2").textContent,
        bodyClass: doc.body.className || "(none)",
        shown: [...doc.querySelectorAll("li")]
          .filter(visible)
          .map((li) => li.firstChild.textContent.trim() || li.childNodes[1]?.textContent.trim()),
      };
    });
    return { edit, reading };
  });

const initial = await read();
// Clip to the content so the shot has no dead space below the last pane
const clip = await page.evaluate(() => {
  const panes = [...document.querySelectorAll(".pane")];
  const bottom = Math.max(...panes.map((p) => p.getBoundingClientRect().bottom));
  return { x: 0, y: 0, width: document.documentElement.clientWidth, height: Math.ceil(bottom) + 20 };
});
await page.screenshot({ path: shot, clip });

// Flip hideSubBullets at runtime on the pane that starts with it off
await page.evaluate(() =>
  window.__settingsHarness.setSettings(2, { hiddenState: true, hideSubBullets: true }),
);
await page.waitForTimeout(200);
const afterFlip = await page.evaluate(() => {
  const p = document.querySelectorAll("#edit .pane")[2];
  return [...p.querySelectorAll(".cm-line")]
    .filter((l) => l.getBoundingClientRect().height > 0)
    .map((l) => l.textContent.trim());
});

console.log(JSON.stringify({ errors, ...initial, runtimeFlipToSubBulletsOn: afterFlip }, null, 2));
await browser.close();
