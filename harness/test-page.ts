/**
 * Interactive bench for the plugin's edit-mode hiding.
 *
 * Runs the plugin's own decorations and stylesheet over an editable CodeMirror
 * document, next to a live Reading-view render of the same text. The 1.0.11
 * stylesheet is included behind a switch so the original bug can be reproduced
 * on demand.
 */
import { Compartment, EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { hideTasksField, taskHiderSettingsFacet, TaskHiderSettings } from "../decorations";
import { computeHiddenLines } from "../utils";
import { obsidianSimulation } from "./obsidian-sim";
import { renderReadingView } from "./reading-view";
import readingStyles from "../styles.css?inline";
import "../styles.css";
import "./legacy.css";
import "./test-page.css";

const DOC = [
  "## From issue #38",
  "",
  "- [ ] Jitsi #Tasks-Common 📅 2026-08-17",
  "    - [ ] Set up the machine for jitsi #Tasks-Common #Me 📅 2026-08-17",
  "    - [ ] Install jitsi #Tasks-Common #NotMe 📅 2026-08-18",
  "",
  "## Completed tasks — these are the only lines that should vanish",
  "",
  "- [x] Buy milk #Tasks-Common 📅 2026-08-16",
  "- [X] Uppercase X counts too 📅 2026-08-15",
  "",
  "## Completed task with children (children go only with 'Hide sub-bullets')",
  "",
  "- [x] Ship the release #Tasks-Common 📅 2026-08-14",
  "    - notes that belong to it",
  "    - [ ] a leftover subtask",
  "        - [x] nested and done",
  "- [ ] Next thing #Tasks-Common 📅 2026-08-20",
  "",
  "## Custom statuses — none of these should ever hide",
  "",
  "- [?] Maybe later 📅 2026-08-19",
  "- [/] In progress 📅 2026-08-19",
  "- [-] Cancelled 📅 2026-08-19",
  "- [!] Urgent 📅 2026-08-19",
  "",
  "## Tabs instead of spaces",
  "",
  "- [x] Tab-indented parent 📅 2026-08-13",
  "\t- tab-indented child",
  "- [ ] Still here 📅 2026-08-21",
  "",
  "## Blank line ends the nesting",
  "",
  "- [x] Done, with a gap after it 📅 2026-08-12",
  "",
  "    - this is after a blank line and must stay",
  "",
  "Plain paragraph, never touched.",
].join("\n");

const settingsCompartment = new Compartment();
const simulationCompartment = new Compartment();

const readSettings = (): TaskHiderSettings => ({
  hiddenState: checkbox("hiddenState").checked,
  showStatusBar: true,
  hideSubBullets: checkbox("hideSubBullets").checked,
});

function checkbox(id: string): HTMLInputElement {
  return document.getElementById(id) as HTMLInputElement;
}

const view = new EditorView({
  state: EditorState.create({
    doc: DOC,
    extensions: [
      simulationCompartment.of(obsidianSimulation()),
      settingsCompartment.of(taskHiderSettingsFacet.of(readSettings())),
      hideTasksField,
      EditorView.updateListener.of((update) => {
        if (update.docChanged || update.selectionSet) refresh();
      }),
    ],
  }),
  parent: document.getElementById("editor")!,
});

const readingFrame = document.getElementById("reading") as HTMLIFrameElement;

function renderReading() {
  const doc = readingFrame.contentDocument!;
  doc.open();
  doc.write(
    `<!doctype html><html><head><style>${readingStyles}</style><style>
       body { margin: 0; padding: 12px 14px; background: #262626; color: #dcddde;
              font-family: -apple-system, "Segoe UI", sans-serif; font-size: 13px; line-height: 1.6; }
       ul { margin: 0 0 10px; padding-left: 22px; }
       h2 { font-size: 13px; color: #9aa0a6; margin: 14px 0 6px; }
     </style></head><body></body></html>`,
  );
  doc.close();

  // Exactly the classes TaskHiderPlugin.updateBodyClasses() sets
  doc.body.classList.toggle("hide-completed-tasks", checkbox("hiddenState").checked);
  doc.body.classList.toggle("hide-sub-bullets", checkbox("hideSubBullets").checked);
  doc.body.innerHTML = renderReadingView(view.state.doc.toString());
}

/**
 * Compare what the plugin intended to hide with what the browser actually
 * rendered, so the page checks itself rather than asking to be trusted.
 */
function refresh() {
  renderReading();

  const lines = view.state.doc.toString().split("\n");
  const expected = checkbox("hiddenState").checked
    ? computeHiddenLines(lines, checkbox("hideSubBullets").checked)
    : new Set<number>();

  const rows = [...view.dom.querySelectorAll<HTMLElement>(".cm-line")];
  const actuallyHidden = new Set<number>();
  rows.forEach((row, index) => {
    if (row.getBoundingClientRect().height === 0) actuallyHidden.add(index);
  });

  const describe = (index: number) => `line ${index + 1}: ${lines[index]?.trim() || "(blank)"}`;
  const hiddenButShouldShow = [...actuallyHidden].filter((i) => !expected.has(i));
  const shownButShouldHide = [...expected].filter((i) => !actuallyHidden.has(i));

  document.getElementById("report")!.innerHTML = actuallyHidden.size
    ? `<strong>${actuallyHidden.size} line(s) hidden</strong><ul>${[...actuallyHidden]
        .sort((a, b) => a - b)
        .map((i) => `<li>${escapeHtml(describe(i))}</li>`)
        .join("")}</ul>`
    : "<strong>Nothing hidden</strong>";

  const verdict = document.getElementById("verdict")!;
  const problems = [
    ...hiddenButShouldShow.map((i) => `hidden but should be visible — ${describe(i)}`),
    ...shownButShouldHide.map((i) => `visible but should be hidden — ${describe(i)}`),
  ];

  if (problems.length) {
    verdict.className = "verdict bad";
    verdict.textContent = problems.join(" · ");
  } else {
    verdict.className = "verdict good";
    verdict.textContent = `Rendering matches intent — ${expected.size} line(s) should hide, ${actuallyHidden.size} did.`;
  }
}

const escapeHtml = (value: string) =>
  value.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!);

checkbox("hiddenState").addEventListener("change", applySettings);
checkbox("hideSubBullets").addEventListener("change", applySettings);

checkbox("widgets").addEventListener("change", () => {
  view.dispatch({
    effects: simulationCompartment.reconfigure(
      checkbox("widgets").checked ? obsidianSimulation() : [],
    ),
  });
  requestAnimationFrame(refresh);
});

checkbox("legacy").addEventListener("change", () => {
  document.getElementById("editor")!.parentElement!.classList.toggle(
    "legacy-mode",
    checkbox("legacy").checked,
  );
  requestAnimationFrame(refresh);
});

function applySettings() {
  // The same compartment reconfigure the plugin performs on toggle
  view.dispatch({
    effects: settingsCompartment.reconfigure(taskHiderSettingsFacet.of(readSettings())),
  });
  requestAnimationFrame(refresh);
}

refresh();
