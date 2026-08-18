import { defineConfig } from "vite";

const here = new URL(".", import.meta.url).pathname;

export default defineConfig({
  root: here,
  base: "./",
  build: {
    outDir: here + "../dist-harness",
    emptyOutDir: true,
    rollupOptions: { input: here + "test-page.html" },
    // One JS chunk and one CSS file, so inline-test-page.mjs can fold them in
    cssCodeSplit: false,
    modulePreload: { polyfill: false },
  },
});
