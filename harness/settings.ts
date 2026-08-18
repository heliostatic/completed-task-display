/**
 * Renders every combination of the plugin's two display settings, in both of
 * the modes it touches:
 *
 * - Edit/Live Preview, where hiding is done by CodeMirror decorations + the
 *   `.ctd-hidden-line` rule
 * - Reading view, where hiding is done entirely by body classes against
 *   rendered HTML
 *
 * `showStatusBar` is deliberately absent: it only decides whether the plugin
 * asks Obsidian for a status bar item, and changes nothing about the note.
 */
import { Compartment, EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { hideTasksField, taskHiderSettingsFacet, TaskHiderSettings } from "../decorations";
import { obsidianSimulation } from "./obsidian-sim";
import { renderReadingView } from "./reading-view";
import styleSheet from "../styles.css?inline";
import "../styles.css";

const DOC = [
  "- [ ] Jitsi #Tasks-Common 📅 2026-08-17",
  "    - [ ] Set up the machine for jitsi #Tasks-Common #Me 📅 2026-08-17",
  "- [x] Buy milk #Tasks-Common 📅 2026-08-16",
  "    - remember oat milk",
  "    - [ ] and coffee",
  "- [?] Maybe later #Tasks-Common 📅 2026-08-19",
].join("\n");

const COMBINATIONS: { hiddenState: boolean; hideSubBullets: boolean }[] = [
  { hiddenState: false, hideSubBullets: false },
  { hiddenState: false, hideSubBullets: true },
  { hiddenState: true, hideSubBullets: false },
  { hiddenState: true, hideSubBullets: true },
];

const label = (c: { hiddenState: boolean; hideSubBullets: boolean }) =>
  `hiddenState: ${c.hiddenState ? "ON" : "off"} · hideSubBullets: ${c.hideSubBullets ? "ON" : "off"}`;

const settings = (overrides: Partial<TaskHiderSettings>): TaskHiderSettings => ({
  hiddenState: true,
  showStatusBar: true,
  hideSubBullets: false,
  ...overrides,
});

function pane(section: string, title: string): HTMLElement {
  const el = document.createElement("div");
  el.className = "pane";
  el.innerHTML = `<h2>${title}</h2>`;
  document.querySelector(`#${section} .panes`)!.appendChild(el);
  return el;
}

const editors: { compartment: Compartment; view: EditorView }[] = [];

for (const combination of COMBINATIONS) {
  const host = document.createElement("div");
  host.className = "editor";
  const sourceView = document.createElement("div");
  sourceView.className = "markdown-source-view mod-cm6";
  host.appendChild(sourceView);
  pane("edit", label(combination)).appendChild(host);

  const compartment = new Compartment();
  editors.push({
    compartment,
    view: new EditorView({
      state: EditorState.create({
        doc: DOC,
        selection: { anchor: DOC.indexOf("Set up") },
        extensions: [
          obsidianSimulation(),
          compartment.of(taskHiderSettingsFacet.of(settings(combination))),
          hideTasksField,
        ],
      }),
      parent: sourceView,
    }),
  });
}

// Reading view depends on classes set on <body>, so each combination needs its
// own document — an iframe carrying the plugin's real stylesheet.
for (const combination of COMBINATIONS) {
  const frame = document.createElement("iframe");
  frame.className = "reading-frame";
  pane("reading", label(combination)).appendChild(frame);

  const doc = frame.contentDocument!;
  doc.open();
  doc.write(`<!doctype html><html><head><style>${styleSheet}</style><style>
      body { margin: 0; padding: 10px 4px; background: #262626; color: #dcddde;
             font-family: -apple-system, sans-serif; font-size: 13px; }
      ul { margin: 0; padding-left: 22px; }
    </style></head><body></body></html>`);
  doc.close();

  // Exactly what TaskHiderPlugin.updateBodyClasses() sets
  doc.body.classList.toggle("hide-completed-tasks", combination.hiddenState);
  doc.body.classList.toggle("hide-sub-bullets", combination.hideSubBullets);
  doc.body.innerHTML = renderReadingView(DOC);
}

(window as any).__settingsHarness = {
  setSettings(index: number, overrides: Partial<TaskHiderSettings>) {
    const { view, compartment } = editors[index];
    view.dispatch({
      effects: compartment.reconfigure(taskHiderSettingsFacet.of(settings(overrides))),
    });
  },
};
