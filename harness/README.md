# Visual harness

Renders the plugin's edit-mode hiding in a real browser so it can be checked
with eyes, not just with assertions over the decoration set. Issue #38 was a
CSS bug that no amount of decoration-level testing would have caught: the
decorations were right, the stylesheet hid the wrong lines.

`obsidian-sim.ts` puts CodeMirror into a DOM shaped like Obsidian's editing
mode — `.cm-line.HyperMD-task-line[data-task]`, atomic
`contenteditable="false"` widgets for content other plugins render (a Tasks due
date pill), optional `<label>` checkboxes, and raw text on the line holding the
cursor. `legacy.ts` / `legacy.css` are the 1.0.11 behaviour, copied from commit
dc7cc5f, so the bug and the fix render side by side.

![panes](screenshots/panes.png)

## Running it

```bash
npx vite --config harness/vite.config.ts     # http://localhost:5199
```

The capture scripts need Playwright, which is deliberately not a dependency of
this repo — install it only when you want screenshots:

```bash
npm install --no-save playwright && npx playwright install chromium

node harness/shoot.mjs harness/screenshots/panes.png   # render every pane
node harness/drive.mjs /tmp                            # toggle, edit, arrow keys
```

Both scripts print what the browser measured — which lines have zero height,
where the gutter numbers sit, where the cursor lands. `drive.mjs` additionally
exercises the paths a user hits at runtime: reconfiguring the settings
compartment (the ribbon toggle), completing a task while hiding is on, and
arrowing down across a hidden line.

If a browser is already on the machine, point Playwright at it instead:
`chromium.launch({ executablePath: ... })`, as the scripts do here.
