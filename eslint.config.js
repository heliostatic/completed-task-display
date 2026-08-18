import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist/", "dist-harness/", "node_modules/", "*.js", "harness/*.mjs"] },
  ...tseslint.configs.recommended,
  {
    rules: {
      // The Obsidian API surface forces a few any-casts (e.g. leaf.view.editor.cm)
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },
  {
    files: ["harness/**/*.ts"],
    rules: {
      // Bench code drives the DOM directly; non-null asserts on known ids are fine
      "@typescript-eslint/no-non-null-assertion": "off",
    },
  },
);
