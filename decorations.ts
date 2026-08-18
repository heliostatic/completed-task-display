import { EditorView, Decoration, DecorationSet } from "@codemirror/view";
import { StateField, Facet, RangeSetBuilder, EditorState } from "@codemirror/state";
import { computeHiddenLines, HIDDEN_LINE_CLASS } from "./utils";

export interface TaskHiderSettings {
  hiddenState: boolean;
  showStatusBar: boolean;
  hideSubBullets: boolean;
}

export const DEFAULT_SETTINGS: TaskHiderSettings = {
  hiddenState: true,
  showStatusBar: true,
  hideSubBullets: false,
};

// Facet for providing settings to the CodeMirror extension
export const taskHiderSettingsFacet = Facet.define<TaskHiderSettings, TaskHiderSettings>({
  combine: (values) => values[0] || DEFAULT_SETTINGS,
});

/**
 * StateField that tracks which lines should be hidden
 * This uses replace decorations to properly remove content from the editor layout
 */
export const hideTasksField = StateField.define<DecorationSet>({
  create(state): DecorationSet {
    return buildLineDecorations(state);
  },
  update(oldDecorations, tr): DecorationSet {
    // Rebuild decorations if document changed or facet reconfigured
    if (tr.docChanged || tr.reconfigured) {
      return buildLineDecorations(tr.state);
    }
    // Otherwise, map the existing decorations to account for changes
    return oldDecorations.map(tr.changes);
  },
  provide: (field) => EditorView.decorations.from(field),
});

// Marks a line as hidden so styles.css can collapse exactly these lines
const hiddenLineDecoration = Decoration.line({ class: HIDDEN_LINE_CLASS });
const hiddenTextDecoration = Decoration.replace({});

/**
 * Build the decorations that hide completed tasks.
 *
 * Every hidden line gets two decorations:
 * - a line decoration carrying `HIDDEN_LINE_CLASS`, so styles.css can collapse
 *   exactly the lines this plugin selected (and nothing else)
 * - a replace decoration over the line's text, so the content is removed from
 *   the editor layout and keeps the gutter aligned
 */
function buildLineDecorations(state: EditorState): DecorationSet {
  const settings = state.facet(taskHiderSettingsFacet);

  if (!settings.hiddenState) {
    return Decoration.none;
  }

  const doc = state.doc;
  const lines: string[] = [];
  for (let lineNum = 1; lineNum <= doc.lines; lineNum++) {
    lines.push(doc.line(lineNum).text);
  }

  const hiddenLines = computeHiddenLines(lines, settings.hideSubBullets);

  const builder = new RangeSetBuilder<Decoration>();

  for (let lineNum = 1; lineNum <= doc.lines; lineNum++) {
    if (!hiddenLines.has(lineNum - 1)) {
      continue;
    }

    const line = doc.line(lineNum);

    // Line decoration first: at an identical position it sorts before the
    // replace decoration, which RangeSetBuilder requires.
    builder.add(line.from, line.from, hiddenLineDecoration);

    // A zero-length line has nothing to replace
    if (line.to > line.from) {
      builder.add(line.from, line.to, hiddenTextDecoration);
    }
  }

  return builder.finish();
}
