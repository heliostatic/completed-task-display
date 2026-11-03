/**
 * Loads the bundle rollup actually ships (dist/main.js) against an Obsidian
 * API whose classes are native ES classes, the way Obsidian 1.15 provides them.
 *
 * The other suites import the TypeScript sources through vitest, which never
 * exercises the shipped build. That gap hid #42: with tsconfig `target: es5`
 * the plugin class compiled to `_super.call(this, app, manifest)`, which throws
 * "Class constructor Plugin cannot be invoked without 'new'" against a native
 * class, so Obsidian reported "Failed to load plugin".
 */
import { beforeAll, describe, expect, it, vi } from "vitest";
import { createRequire } from "node:module";
import { rollup } from "rollup";
import config from "../rollup.config.js";
import * as obsidian from "obsidian"; // aliased to tests/mocks/obsidian.ts

const nodeRequire = createRequire(import.meta.url);

async function buildBundle(): Promise<string> {
  const bundle = await rollup({ ...config, onwarn: () => {} });
  try {
    const { output } = await bundle.generate(config.output);
    return output[0].code;
  } finally {
    await bundle.close();
  }
}

/** Evaluate the CommonJS bundle the way Obsidian does, with our mock API. */
function loadPluginClass(code: string): any {
  const module = { exports: {} as any };
  const requireShim = (id: string) => (id === "obsidian" ? obsidian : nodeRequire(id));
  new Function("module", "exports", "require", code)(module, module.exports, requireShim);
  return module.exports;
}

const manifest = { id: "completed-task-display", name: "Completed Task Display", version: "0.0.0" };

describe("shipped bundle (#42)", () => {
  let PluginClass: any;

  beforeAll(async () => {
    PluginClass = loadPluginClass(await buildBundle());
  }, 60_000);

  it("mocks Obsidian's Plugin as a native class, as Obsidian 1.15 does", () => {
    // Guards the guard: an ES5-style function mock would let the old build pass.
    expect(() => (obsidian.Plugin as any)(new obsidian.App(), manifest)).toThrow(TypeError);
  });

  it("constructs the plugin", () => {
    const plugin = new PluginClass(new obsidian.App(), manifest);
    expect(plugin).toBeInstanceOf(obsidian.Plugin);
  });

  it("loads and registers its settings tab without errors", async () => {
    const app = Object.assign(new obsidian.App(), { workspace: { onLayoutReady: () => {} } });
    const plugin = new PluginClass(app, manifest);
    const tabs: unknown[] = [];
    plugin.addSettingTab = (tab: unknown) => tabs.push(tab);
    // onload catches and logs its own errors, so a failure shows up here
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      await plugin.onload();
      expect(consoleError).not.toHaveBeenCalled();
    } finally {
      consoleError.mockRestore();
    }
    expect(tabs).toHaveLength(1);
    expect(tabs[0]).toBeInstanceOf(obsidian.PluginSettingTab);
  });
});
