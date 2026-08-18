# Completed Task Display

Obsidian plugin that hides completed tasks (`- [x]`) behind a ribbon toggle, in both Edit/Live Preview (CodeMirror decorations, `decorations.ts`) and Reading view (body classes + `styles.css`).

## Commands

```bash
npm install        # setup
npm test           # vitest suite in /tests
npm run build      # rollup → dist/main.js
npx tsc --noEmit   # typecheck
./release.sh       # cut a release (use --dry-run first)
```

## Workflow

1. Implement the change. Line-selection logic lives in `utils.ts` (pure, tested); CodeMirror wiring in `decorations.ts`; plugin lifecycle in `main.ts`.
2. Add automated tests in `/tests` for any new behavior.
3. Run the full test suite and typecheck before committing.
4. Use descriptive commit messages (`feat:`, `fix:`, `test:`, `chore:`), referencing GitHub issues where relevant (e.g. `fixes #38`).

## Visual verification

`harness/` renders the plugin in a real browser against Obsidian-shaped markup — see `harness/README.md`. Use it when a change affects what the user actually sees; the unit tests only cover decoration data.

`main.ts` must keep a single default export (rollup builds with `output.exports: 'default'`); anything tests need to import belongs in `decorations.ts` or `utils.ts`.
