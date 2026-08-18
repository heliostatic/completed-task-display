import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { EditorState } from "@codemirror/state";
import { Decoration } from "@codemirror/view";
import { hideTasksField, taskHiderSettingsFacet, TaskHiderSettings } from "../decorations";
import { HIDDEN_LINE_CLASS } from "../utils";

const settings = (overrides: Partial<TaskHiderSettings> = {}): TaskHiderSettings => ({
  hiddenState: true,
  showStatusBar: true,
  hideSubBullets: false,
  ...overrides,
});

/**
 * Build the editor state the plugin would produce and report, per line,
 * whether it carries the hidden-line class and whether its text is replaced.
 */
function decorateDoc(doc: string, overrides: Partial<TaskHiderSettings> = {}) {
  const state = EditorState.create({
    doc,
    extensions: [taskHiderSettingsFacet.of(settings(overrides)), hideTasksField],
  });

  const marked = new Set<number>();
  const replaced = new Set<number>();

  state.field(hideTasksField).between(0, state.doc.length, (from, to, deco) => {
    const lineNum = state.doc.lineAt(from).number;
    if ((deco.spec as { class?: string }).class === HIDDEN_LINE_CLASS) {
      marked.add(lineNum);
    } else {
      expect(deco.spec).toEqual(Decoration.replace({}).spec);
      expect(to).toBe(state.doc.lineAt(from).to);
      replaced.add(lineNum);
    }
  });

  return { marked: [...marked].sort((a, b) => a - b), replaced: [...replaced].sort((a, b) => a - b) };
}

describe("hideTasksField decorations", () => {
  it("marks and replaces completed task lines only", () => {
    const { marked, replaced } = decorateDoc(
      ["- [x] completed", "- [ ] pending", "- [X] also completed", "plain text"].join("\n"),
    );

    expect(marked).toEqual([1, 3]);
    expect(replaced).toEqual([1, 3]);
  });

  it("leaves an uncompleted parent and its children untouched (issue #38)", () => {
    const doc = [
      "- [ ] Jitsi #Tasks-Common 📅 2026-08-17",
      "    - [ ] Set up the machine for jitsi #Tasks-Common #Me 📅 2026-08-17",
      "    - [ ] Install jitsi #Tasks-Common #NotMe 📅 2026-08-18",
    ].join("\n");

    expect(decorateDoc(doc)).toEqual({ marked: [], replaced: [] });
    expect(decorateDoc(doc, { hideSubBullets: true })).toEqual({ marked: [], replaced: [] });
  });

  it("leaves custom statuses untouched", () => {
    const doc = ["- [?] maybe", "- [!] urgent", "- [/] in progress"].join("\n");

    expect(decorateDoc(doc)).toEqual({ marked: [], replaced: [] });
  });

  it("marks nested lines when hideSubBullets is on", () => {
    const doc = [
      "- [x] completed",
      "    - nested note",
      "- [ ] independent",
    ].join("\n");

    expect(decorateDoc(doc, { hideSubBullets: true })).toEqual({
      marked: [1, 2],
      replaced: [1, 2],
    });
  });

  it("produces no decorations while showing completed tasks", () => {
    const doc = ["- [x] completed", "- [ ] pending"].join("\n");

    expect(decorateDoc(doc, { hiddenState: false })).toEqual({ marked: [], replaced: [] });
  });

  it("marks an empty hidden line without adding an empty replacement", () => {
    const doc = ["- [x] completed", "", "- [ ] pending"].join("\n");
    // The blank line ends the nested block, so only the task itself is hidden
    expect(decorateDoc(doc, { hideSubBullets: true })).toEqual({ marked: [1], replaced: [1] });
  });

  it("recomputes decorations after an edit", () => {
    const state = EditorState.create({
      doc: "- [ ] pending",
      extensions: [taskHiderSettingsFacet.of(settings()), hideTasksField],
    });

    expect(state.field(hideTasksField).size).toBe(0);

    const completed = state.update({ changes: { from: 3, to: 4, insert: "x" } }).state;
    expect(completed.doc.toString()).toBe("- [x] pending");
    expect(completed.field(hideTasksField).size).toBe(2);
  });
});

describe("styles.css", () => {
  const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");

  it("collapses edit-mode lines by the plugin's own class", () => {
    expect(css).toContain(`.cm-line.${HIDDEN_LINE_CLASS}`);
  });

  it("does not guess at hidden lines from unrelated DOM structure", () => {
    // Guessing from `[data-task]` plus the absence of a checkbox label hid
    // uncompleted tasks that other plugins had rendered widgets into (issue #38)
    expect(css).not.toContain("data-task]:not");
    expect(css).not.toContain("HyperMD-task-line");
    expect(css).not.toContain("contenteditable");
  });
});
