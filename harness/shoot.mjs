import { chromium } from "playwright";

const out = process.argv[2];
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 2 });
const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push(String(e)));

await page.goto("http://localhost:5199/", { waitUntil: "networkidle" });
await page.waitForSelector(".cm-content");
await page.waitForTimeout(500);

// Report what each pane actually renders, as the browser sees it
const panes = await page.$$eval(".pane", (nodes) =>
  nodes.map((pane) => ({
    title: pane.querySelector("h2").textContent,
    visibleLines: [...pane.querySelectorAll(".cm-line")]
      .filter((l) => l.getBoundingClientRect().height > 0)
      .map((l) => l.textContent),
    hiddenLines: [...pane.querySelectorAll(".cm-line")]
      .filter((l) => l.getBoundingClientRect().height === 0)
      .map((l) => ({ text: l.textContent, class: l.className })),
  })),
);

console.log(JSON.stringify({ errors, panes }, null, 2));
await page.locator("#panes").screenshot({ path: out });
await browser.close();
