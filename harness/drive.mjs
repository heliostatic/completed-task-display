/**
 * Drives the harness the way a user drives the plugin: toggle hiding off and
 * back on, complete a task while hiding is active, and arrow past a hidden
 * line. Reports what the browser actually renders after each step.
 */
import { chromium } from "playwright";

const shotDir = process.argv[2];
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 2 });
const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push(String(e)));

await page.goto("http://localhost:5199/", { waitUntil: "networkidle" });
await page.waitForSelector(".cm-content");
await page.waitForTimeout(300);

const readPane = (index) =>
  page.evaluate((i) => {
    const pane = document.querySelectorAll(".pane")[i];
    const rows = [...pane.querySelectorAll(".cm-line")].map((l) => ({
      text: l.textContent,
      height: Math.round(l.getBoundingClientRect().height),
      top: Math.round(l.getBoundingClientRect().top),
      marked: l.classList.contains("ctd-hidden-line"),
    }));
    const gutter = [...pane.querySelectorAll(".cm-lineNumbers .cm-gutterElement")]
      .slice(1) // first element is the spacer
      .map((g) => ({
        number: g.textContent,
        height: Math.round(g.getBoundingClientRect().height),
        top: Math.round(g.getBoundingClientRect().top),
      }));
    return {
      visible: rows.filter((r) => r.height > 0).map((r) => r.text),
      hidden: rows.filter((r) => r.height === 0).map((r) => ({ text: r.text, marked: r.marked })),
      gutter,
      // Any vertical gap where a hidden line used to be would show up here
      rowTops: rows.filter((r) => r.height > 0).map((r) => r.top),
    };
  }, index);

const steps = [];
const record = async (name, index, shot) => {
  const state = await readPane(index);
  steps.push({ step: name, ...state });
  if (shot) await page.screenshot({ path: `${shotDir}/${shot}`, fullPage: true });
};

// 1. Baseline
await record("initial (pane 3, hiding on)", 2);
await record("initial (pane 5, gutter)", 4);

// 2. Toggle hiding off, as the ribbon button does
await page.evaluate(() => window.__harness.setSettings(2, { hiddenState: false }));
await page.waitForTimeout(200);
await record("pane 3 after toggling hiding OFF", 2, "toggled-off.png");

// 3. Toggle back on
await page.evaluate(() => window.__harness.setSettings(2, { hiddenState: true }));
await page.waitForTimeout(200);
await record("pane 3 after toggling hiding back ON", 2, "toggled-on.png");

// 4. Complete a task by typing, with hiding active
await page.evaluate(() => {
  const view = window.__harness.panes[2].view;
  const pos = view.state.doc.line(1).from + 3; // the space inside "- [ ]"
  view.dispatch({ changes: { from: pos, to: pos + 1, insert: "x" } });
});
await page.waitForTimeout(200);
await record("pane 3 after typing x into line 1", 2, "after-edit.png");

// 5. Cursor movement across a hidden line: start on the line above it, press Down
const cursorWalk = await page.evaluate(async () => {
  const view = window.__harness.panes[4].view; // pane 5, doc unchanged
  view.focus();
  const line3 = view.state.doc.line(3);
  view.dispatch({ selection: { anchor: line3.to } });
  return { startLine: view.state.doc.lineAt(view.state.selection.main.head).number };
});
await page.keyboard.press("ArrowDown");
await page.waitForTimeout(150);
const afterDown = await page.evaluate(() => {
  const view = window.__harness.panes[4].view;
  const head = view.state.selection.main.head;
  const line = view.state.doc.lineAt(head);
  return { line: line.number, text: line.text };
});

console.log(JSON.stringify({ errors, steps, cursor: { ...cursorWalk, afterArrowDown: afterDown } }, null, 2));
await browser.close();
