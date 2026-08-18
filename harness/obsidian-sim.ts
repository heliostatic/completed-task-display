/**
 * A stripped-down stand-in for the DOM Obsidian produces around task lines in
 * Edit/Live Preview mode, so the plugin's CSS can be checked against something
 * shaped like the real thing:
 *
 * - each task line is a `.cm-line.HyperMD-task-line[data-task="<status>"]`
 * - inline content other plugins render (here: the Tasks due-date pill) becomes
 *   an atomic widget carrying `contenteditable="false"`, on every line except
 *   the one holding the cursor, which Live Preview leaves as raw text
 * - optionally a `<label>` wrapped checkbox, which is the other shape the old
 *   CSS heuristic keyed off
 */
import { Decoration, DecorationSet, EditorView, WidgetType } from "@codemirror/view";
import { EditorState, Range, StateField } from "@codemirror/state";

const TASK_LINE = /^\s*[-*+]\s+\[(.)\]/;
const DUE_DATE = /📅 \d{4}-\d{2}-\d{2}/;

class CheckboxWidget extends WidgetType {
  constructor(readonly status: string) {
    super();
  }

  toDOM(): HTMLElement {
    const label = document.createElement("label");
    label.className = "task-list-label";
    label.contentEditable = "false";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.className = "task-list-item-checkbox";
    input.checked = this.status.toLowerCase() === "x";
    label.appendChild(input);
    return label;
  }
}

class DatePillWidget extends WidgetType {
  constructor(readonly text: string) {
    super();
  }

  toDOM(): HTMLElement {
    const pill = document.createElement("span");
    pill.className = "tasks-date-pill";
    pill.contentEditable = "false";
    pill.textContent = this.text;
    return pill;
  }
}

function buildObsidianDecorations(state: EditorState, checkboxLabel: boolean): DecorationSet {
  const cursorLine = state.doc.lineAt(state.selection.main.head).number;
  const ranges: Range<Decoration>[] = [];

  for (let lineNum = 1; lineNum <= state.doc.lines; lineNum++) {
    const line = state.doc.line(lineNum);
    const task = line.text.match(TASK_LINE);
    if (!task) continue;

    ranges.push(
      Decoration.line({
        class: "HyperMD-task-line",
        attributes: { "data-task": task[1] },
      }).range(line.from),
    );

    // Live Preview leaves the line the cursor sits on as plain text
    if (lineNum === cursorLine) continue;

    if (checkboxLabel) {
      const marker = line.text.indexOf("[");
      ranges.push(
        Decoration.replace({ widget: new CheckboxWidget(task[1]) }).range(
          line.from + marker,
          line.from + marker + 3,
        ),
      );
    }

    const due = line.text.match(DUE_DATE);
    if (due && due.index !== undefined) {
      ranges.push(
        Decoration.replace({ widget: new DatePillWidget(due[0]) }).range(
          line.from + due.index,
          line.from + due.index + due[0].length,
        ),
      );
    }
  }

  return Decoration.set(ranges, true);
}

export function obsidianSimulation({ checkboxLabel = false } = {}) {
  return StateField.define<DecorationSet>({
    create: (state) => buildObsidianDecorations(state, checkboxLabel),
    update: (deco, tr) =>
      tr.docChanged || tr.selection
        ? buildObsidianDecorations(tr.state, checkboxLabel)
        : deco.map(tr.changes),
    provide: (field) => EditorView.decorations.from(field),
  });
}
