/**
 * The 1.0.11 decoration builder, copied from main.ts at commit dc7cc5f so the
 * released behaviour can be rendered side by side with the fix.
 */
import { Decoration, DecorationSet, EditorView } from "@codemirror/view";
import { EditorState, RangeSetBuilder, StateField } from "@codemirror/state";
import { COMPLETED_TASK_REGEX, getIndentLevelFromText } from "../utils";

function buildLegacyDecorations(state: EditorState): DecorationSet {
  const doc = state.doc;
  const linesToHide = new Set<number>();

  for (let lineNum = 1; lineNum <= doc.lines; lineNum++) {
    const lineText = doc.line(lineNum).text;
    if (!COMPLETED_TASK_REGEX.test(lineText)) continue;

    linesToHide.add(lineNum);

    const taskIndent = getIndentLevelFromText(lineText);
    for (let subLineNum = lineNum + 1; subLineNum <= doc.lines; subLineNum++) {
      const subLineText = doc.line(subLineNum).text;
      if (subLineText.trim() === "") break;
      if (getIndentLevelFromText(subLineText) <= taskIndent) break;
      linesToHide.add(subLineNum);
    }
  }

  const builder = new RangeSetBuilder<Decoration>();

  for (let lineNum = 1; lineNum <= doc.lines; lineNum++) {
    if (!linesToHide.has(lineNum)) continue;

    const line = doc.line(lineNum);
    const nextLineAlsoHidden = linesToHide.has(lineNum + 1);
    const isLastLine = lineNum === doc.lines;
    const endPos = nextLineAlsoHidden && !isLastLine ? line.to + 1 : line.to;

    builder.add(line.from, endPos, Decoration.replace({}));
  }

  return builder.finish();
}

export const legacyHideTasksField = StateField.define<DecorationSet>({
  create: buildLegacyDecorations,
  update: (deco, tr) => (tr.docChanged ? buildLegacyDecorations(tr.state) : deco.map(tr.changes)),
  provide: (field) => EditorView.decorations.from(field),
});
