/**
 * Folds the built JS and CSS into the HTML so the test page is a single file
 * that opens from disk with no server, no npm, no network.
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const dist = new URL("../dist-harness/", import.meta.url).pathname;
const out = process.argv[2] ?? join(dist, "completed-task-display-test-page.html");

let html = readFileSync(join(dist, "test-page.html"), "utf8");
const assets = readdirSync(join(dist, "assets"));

const js = assets.find((f) => f.endsWith(".js"));
const css = assets.find((f) => f.endsWith(".css"));

// Replacements go through functions: bundle text is full of `$` sequences
// that String.replace would otherwise treat as substitution patterns.
html = html.replace(
  new RegExp(`<script[^>]*src="[^"]*${js}"[^>]*></script>`),
  () => `<script type="module">\n${readFileSync(join(dist, "assets", js), "utf8")}\n</script>`,
);

if (css) {
  html = html.replace(
    new RegExp(`<link[^>]*href="[^"]*${css}"[^>]*>`),
    () => `<style>\n${readFileSync(join(dist, "assets", css), "utf8")}\n</style>`,
  );
}

if (/<script[^>]*src=|<link[^>]*stylesheet/.test(html)) {
  throw new Error("test page still references external assets");
}

writeFileSync(out, html);
console.log(`${out} — ${(Buffer.byteLength(html) / 1024).toFixed(0)} KB`);
