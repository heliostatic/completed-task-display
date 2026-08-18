/**
 * Renders the plugin's edit-mode hiding in a real browser, against a DOM shaped
 * like Obsidian's, so the CSS and decorations can be checked visually rather
 * than only through the decoration set. Driven by shoot.mjs.
 */
import { Compartment, EditorState, Extension } from "@codemirror/state";
import { EditorView, lineNumbers } from "@codemirror/view";
import { hideTasksField, taskHiderSettingsFacet, TaskHiderSettings } from "../decorations";
import { legacyHideTasksField } from "./legacy";
import { obsidianSimulation } from "./obsidian-sim";
import "../styles.css";
import "./legacy.css";

// The document from issue #38, plus a completed and a custom-status task
const DOC = [
  "- [ ] Jitsi #Tasks-Common 📅 2026-08-17",
  "    - [ ] Set up the machine for jitsi #Tasks-Common #Me 📅 2026-08-17",
  "    - [ ] Install jitsi #Tasks-Common #NotMe 📅 2026-08-18",
  "- [x] Buy milk #Tasks-Common 📅 2026-08-16",
  "- [?] Maybe later #Tasks-Common 📅 2026-08-19",
].join("\n");

const SUB_BULLET_DOC = [
  "- [ ] Jitsi #Tasks-Common 📅 2026-08-17",
  "    - [ ] Set up the machine for jitsi #Tasks-Common #Me 📅 2026-08-17",
  "- [x] Buy milk #Tasks-Common 📅 2026-08-16",
  "    - remember oat milk",
  "    - [ ] and coffee",
  "- [?] Maybe later #Tasks-Common 📅 2026-08-19",
].join("\n");

// Cursor on line 2, which is why Live Preview leaves that line as raw text
const CURSOR = DOC.indexOf("Set up");

const settings = (overrides: Partial<TaskHiderSettings> = {}): TaskHiderSettings => ({
  hiddenState: true,
  showStatusBar: true,
  hideSubBullets: false,
  ...overrides,
});

interface PaneOptions {
  title: string;
  note: string;
  doc?: string;
  settings?: Partial<TaskHiderSettings>;
  legacy?: boolean;
  gutter?: boolean;
  checkboxLabel?: boolean;
}

const panes: { title: string; view: EditorView; compartment: Compartment }[] = [];

function addPane({
  title,
  note,
  doc = DOC,
  settings: overrides,
  legacy,
  gutter,
  checkboxLabel,
}: PaneOptions) {
  const pane = document.createElement("div");
  pane.className = "pane";
  pane.innerHTML = `<h2>${title}</h2><p>${note}</p>`;

  const host = document.createElement("div");
  host.className = legacy ? "editor legacy-mode" : "editor";

  // Obsidian's editor container classes, which the plugin's CSS keys off
  const sourceView = document.createElement("div");
  sourceView.className = "markdown-source-view mod-cm6";
  host.appendChild(sourceView);
  pane.appendChild(host);
  document.getElementById("panes")!.appendChild(pane);

  // The plugin swaps settings through a compartment, so the harness does too
  const compartment = new Compartment();
  const plugin: Extension = legacy
    ? legacyHideTasksField
    : [compartment.of(taskHiderSettingsFacet.of(settings(overrides))), hideTasksField];

  const view = new EditorView({
    state: EditorState.create({
      doc,
      selection: { anchor: Math.min(CURSOR, doc.length) },
      extensions: [obsidianSimulation({ checkboxLabel }), gutter ? lineNumbers() : [], plugin],
    }),
    parent: sourceView,
  });

  panes.push({ title, view, compartment });
}

document.body.classList.add("hide-completed-tasks");

addPane({
  title: "1. No plugin",
  note: "What the file looks like with hiding off — five lines.",
  settings: { hiddenState: false },
});

addPane({
  title: "2. Released 1.0.11 — the bug",
  note: "Old CSS heuristic: uncompleted lines with a rendered widget vanish.",
  legacy: true,
});

addPane({
  title: "3. This branch — fixed",
  note: "Only [x] is hidden; uncompleted and custom-status lines stay.",
});

addPane({
  title: "4. This branch, hide sub-bullets on",
  note: "Completed task and its nested lines hidden; unrelated lines untouched.",
  doc: SUB_BULLET_DOC,
  settings: { hideSubBullets: true },
});

addPane({
  title: "5. This branch, with line-number gutter",
  note: "Gutter must stay aligned: line 4 goes with its line, leaving no blank row.",
  gutter: true,
});

addPane({
  title: "6. Live Preview checkboxes — released 1.0.11",
  note: "Completed lines hide correctly here — the plugin's replace empties the line, so the old rule matched. Pane 2 is where it went wrong.",
  legacy: true,
  checkboxLabel: true,
});

addPane({
  title: "7. Live Preview checkboxes — this branch",
  note: "Same result, without depending on what the surrounding DOM happens to contain.",
  checkboxLabel: true,
});

// shoot.mjs drives these to check toggling, editing and cursor movement
(window as any).__harness = {
  panes,
  setSettings(index: number, overrides: Partial<TaskHiderSettings>) {
    const { view, compartment } = panes[index];
    view.dispatch({
      effects: compartment.reconfigure(taskHiderSettingsFacet.of(settings(overrides))),
    });
  },
};
