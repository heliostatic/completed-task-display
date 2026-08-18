/**
 * Builds the DOM Obsidian's Reading view produces for a task list, so the
 * preview-mode half of styles.css can be checked as well. Reading view is
 * plain rendered HTML — no CodeMirror — and the plugin drives it purely
 * through the `hide-completed-tasks` / `hide-sub-bullets` body classes.
 */
const TASK = /^(\s*)[-*+]\s+(?:\[(.)\]\s*)?(.*)$/;

interface Item {
  indent: number;
  status: string | null;
  text: string;
  children: Item[];
}

function parse(markdown: string): Item[] {
  const roots: Item[] = [];
  const stack: Item[] = [];

  for (const line of markdown.split("\n")) {
    const match = line.match(TASK);
    if (!match) continue;

    const item: Item = {
      indent: match[1].replace(/\t/g, "    ").length,
      status: match[2] ?? null,
      text: match[3],
      children: [],
    };

    while (stack.length && stack[stack.length - 1].indent >= item.indent) stack.pop();
    (stack.length ? stack[stack.length - 1].children : roots).push(item);
    stack.push(item);
  }

  return roots;
}

function renderList(items: Item[]): string {
  const listItems = items.map((item) => {
    const isTask = item.status !== null;
    const completed = isTask && item.status!.toLowerCase() === "x";
    const attrs = isTask
      ? ` data-task="${item.status}" class="task-list-item${completed ? " is-checked" : ""}"`
      : "";
    const checkbox = isTask
      ? `<input type="checkbox" class="task-list-item-checkbox"${completed ? " checked" : ""}> `
      : "";
    const children = item.children.length ? renderList(item.children) : "";
    return `<li${attrs}>${checkbox}${item.text}${children}</li>`;
  });

  return `<ul class="contains-task-list has-list-bullet">${listItems.join("")}</ul>`;
}

export function renderReadingView(markdown: string): string {
  return `<div class="markdown-preview-view markdown-rendered">${renderList(parse(markdown))}</div>`;
}
