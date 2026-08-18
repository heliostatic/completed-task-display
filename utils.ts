/**
 * Utility functions for task hiding logic
 * Separated for testability
 */

/**
 * Regex to match completed task lines
 */
export const COMPLETED_TASK_REGEX = /^(\s*[-*+])\s+\[(x|X)\]/;

/**
 * Get indentation level from line text (count leading spaces/tabs)
 */
export function getIndentLevelFromText(text: string): number {
  const match = text.match(/^(\s*)/);
  if (!match) return 0;

  const whitespace = match[1];
  // Count tabs as 4 spaces
  return whitespace.replace(/\t/g, "    ").length;
}

/**
 * CSS class applied to editor lines that this plugin hides.
 *
 * Hidden lines are marked explicitly instead of being inferred from the DOM,
 * so styling can never collapse a line the plugin did not choose to hide.
 */
export const HIDDEN_LINE_CLASS = "ctd-hidden-line";

/**
 * Determine which lines of a document should be hidden.
 *
 * @param lines Document lines, in order, without line separators
 * @param hideSubBullets Whether indented content beneath a completed task is hidden too
 * @returns Zero-based indices of the lines to hide
 */
export function computeHiddenLines(lines: string[], hideSubBullets: boolean): Set<number> {
  const hidden = new Set<number>();

  for (let i = 0; i < lines.length; i++) {
    if (!COMPLETED_TASK_REGEX.test(lines[i])) {
      continue;
    }

    hidden.add(i);

    if (!hideSubBullets) {
      continue;
    }

    const taskIndent = getIndentLevelFromText(lines[i]);

    // Walk forward while lines stay nested beneath the completed task
    for (let j = i + 1; j < lines.length; j++) {
      const subLineText = lines[j];

      // Empty line breaks the nesting - content after is independent
      if (subLineText.trim() === "") {
        break;
      }

      // Equal or lower indentation ends the nested block
      if (getIndentLevelFromText(subLineText) <= taskIndent) {
        break;
      }

      hidden.add(j);
    }
  }

  return hidden;
}
