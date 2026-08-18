import { describe, it, expect } from "vitest";
import { computeHiddenLines } from "../utils";

const hidden = (lines: string[], hideSubBullets = false) =>
  [...computeHiddenLines(lines, hideSubBullets)].sort((a, b) => a - b);

describe("computeHiddenLines", () => {
  it("hides only completed tasks", () => {
    const lines = [
      "- [x] completed",
      "- [X] also completed",
      "- [ ] pending",
      "- regular bullet",
      "plain text",
    ];

    expect(hidden(lines)).toEqual([0, 1]);
  });

  it("keeps uncompleted parents and their nested tasks visible (issue #38)", () => {
    const lines = [
      "- [ ] Jitsi #Tasks-Common 📅 2026-08-17",
      "    - [ ] Set up the machine for jitsi #Tasks-Common #Me 📅 2026-08-17",
      "    - [ ] Install jitsi #Tasks-Common #NotMe 📅 2026-08-18",
    ];

    expect(hidden(lines)).toEqual([]);
    expect(hidden(lines, true)).toEqual([]);
  });

  it("keeps custom statuses visible", () => {
    const lines = ["- [?] maybe", "- [!] urgent", "- [/] in progress", "- [-] cancelled"];

    expect(hidden(lines)).toEqual([]);
    expect(hidden(lines, true)).toEqual([]);
  });

  it("leaves sub-bullets alone when hideSubBullets is off", () => {
    const lines = ["- [x] completed", "    - nested note", "- [ ] pending"];

    expect(hidden(lines)).toEqual([0]);
  });

  it("hides nested content when hideSubBullets is on", () => {
    const lines = [
      "- [x] completed",
      "    - nested note",
      "    - [ ] nested pending",
      "- [ ] independent",
    ];

    expect(hidden(lines, true)).toEqual([0, 1, 2]);
  });

  it("stops nesting at an empty line", () => {
    const lines = ["- [x] completed", "    - nested note", "", "    - after blank line"];

    expect(hidden(lines, true)).toEqual([0, 1]);
  });

  it("stops nesting at equal or lower indentation", () => {
    const lines = [
      "    - [x] completed",
      "        - nested",
      "    - [ ] sibling",
      "- [ ] parent level",
    ];

    expect(hidden(lines, true)).toEqual([0, 1]);
  });

  it("treats tabs and spaces consistently when nesting", () => {
    const lines = ["- [x] completed", "\t- nested with tab", "- [ ] sibling"];

    expect(hidden(lines, true)).toEqual([0, 1]);
  });

  it("hides nested content beneath a nested completed task only", () => {
    const lines = [
      "- [ ] parent",
      "    - [x] completed child",
      "        - grandchild",
      "    - [ ] other child",
    ];

    expect(hidden(lines, true)).toEqual([1, 2]);
  });

  it("returns nothing for an empty document", () => {
    expect(hidden([""])).toEqual([]);
    expect(hidden([""], true)).toEqual([]);
  });
});
