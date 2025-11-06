import { App, Plugin, PluginSettingTab, Setting, addIcon, PluginManifest } from "obsidian";
import { EditorView, Decoration, DecorationSet } from "@codemirror/view";
import { StateField, StateEffect, Extension, Facet, RangeSetBuilder, EditorState } from "@codemirror/state";

interface TaskHiderSettings {
  hiddenState: boolean;
  showStatusBar: boolean;
  hideSubBullets: boolean;
}

const DEFAULT_SETTINGS: TaskHiderSettings = {
  hiddenState: true,
  showStatusBar: true,
  hideSubBullets: false,
};

// Facet for providing settings to the CodeMirror extension
const taskHiderSettingsFacet = Facet.define<TaskHiderSettings, TaskHiderSettings>({
  combine: (values) => values[0] || DEFAULT_SETTINGS,
});

// Effect to trigger reconfiguration when settings change
const reconfigureEffect = StateEffect.define<null>();

/**
 * Get indentation level from line text (count leading spaces/tabs)
 */
function getIndentLevelFromText(text: string): number {
  const match = text.match(/^(\s*)/);
  if (!match) return 0;

  const whitespace = match[1];
  // Count tabs as 4 spaces
  return whitespace.replace(/\t/g, "    ").length;
}

/**
 * StateField that tracks which lines should be hidden
 * This uses replace decorations to properly remove content from the editor layout
 */
const hideTasksField = StateField.define<DecorationSet>({
  create(state): DecorationSet {
    return buildLineDecorations(state);
  },
  update(oldDecorations, tr): DecorationSet {
    // Rebuild decorations if document changed or settings changed
    if (tr.docChanged || tr.effects.some((e) => e.is(reconfigureEffect))) {
      return buildLineDecorations(tr.state);
    }
    // Otherwise, map the existing decorations to account for changes
    return oldDecorations.map(tr.changes);
  },
  provide: (field) => EditorView.decorations.from(field),
});

/**
 * Build replace decorations that actually hide the content
 * This properly removes lines from the editor layout, fixing gutter alignment
 */
function buildLineDecorations(state: EditorState): DecorationSet {
  const settings = state.facet(taskHiderSettingsFacet);

  if (!settings.hiddenState) {
    return Decoration.none;
  }

  const builder = new RangeSetBuilder<Decoration>();
  const doc = state.doc;

  // Identify completed task lines and their sub-bullets
  for (let lineNum = 1; lineNum <= doc.lines; lineNum++) {
    const line = doc.line(lineNum);
    const lineText = line.text;

    // Check if this is a completed task line
    const isCompletedTask = /^(\s*[-*+])\s+\[(x|X)\]/.test(lineText);

    if (isCompletedTask) {
      // Use a replace decoration to hide the entire line
      // This properly removes it from the layout so the gutter aligns correctly
      builder.add(
        line.from,
        line.to,
        Decoration.replace({})
      );

      // If hideSubBullets is enabled, mark nested items
      if (settings.hideSubBullets) {
        const taskIndent = getIndentLevelFromText(lineText);

        // Look at subsequent lines to find sub-bullets
        for (let subLineNum = lineNum + 1; subLineNum <= doc.lines; subLineNum++) {
          const subLine = doc.line(subLineNum);
          const subLineText = subLine.text;

          // Skip empty lines
          if (subLineText.trim() === "") {
            continue;
          }

          const subIndent = getIndentLevelFromText(subLineText);

          // If we hit a line with equal or less indentation, stop
          if (subIndent <= taskIndent) {
            break;
          }

          // Hide the sub-bullet line
          builder.add(
            subLine.from,
            subLine.to,
            Decoration.replace({})
          );
        }
      }
    }
  }

  return builder.finish();
}

export default class TaskHiderPlugin extends Plugin {
  statusBar: HTMLElement | null = null;
  settings: TaskHiderSettings;

  constructor(app: App, manifest: PluginManifest) {
    super(app, manifest);
    // Status bar will be created in onload to ensure proper initialization on mobile
  }

  async toggleCompletedTaskView() {
    this.settings.hiddenState = !this.settings.hiddenState;

    // Toggle body class for preview mode CSS
    document.body.toggleClass("hide-completed-tasks", this.settings.hiddenState);

    if (this.statusBar && this.settings.showStatusBar) {
      this.statusBar.setText(
        this.settings.hiddenState ? "Hiding Completed Tasks" : "Showing Completed Tasks",
      );
    }

    // Update all editor instances with new settings
    this.updateEditorExtensions();

    await this.saveSettings();
  }

  /**
   * Update body classes to reflect current settings
   */
  updateBodyClasses() {
    document.body.toggleClass("hide-completed-tasks", this.settings.hiddenState);
    document.body.toggleClass("hide-sub-bullets", this.settings.hideSubBullets);
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  /**
   * Create the CodeMirror extension with current settings
   */
  createEditorExtension(): Extension {
    return [
      taskHiderSettingsFacet.of(this.settings),
      hideTasksField,
    ];
  }

  /**
   * Update all editor instances to use the new settings
   */
  updateEditorExtensions() {
    // Get all markdown views and dispatch reconfigure effect
    this.app.workspace.iterateAllLeaves((leaf) => {
      if (leaf.view.getViewType() === "markdown") {
        const view = (leaf.view as any).editor;
        if (view && view.cm) {
          const cm = view.cm as EditorView;

          // Just dispatch our custom effect to trigger a rebuild of decorations
          // Don't use StateEffect.reconfigure as it would remove Obsidian's extensions
          cm.dispatch({
            effects: [reconfigureEffect.of(null)],
          });
        }
      }
    });
  }

  async onload() {
    try {
      // Load settings first
      await this.loadSettings();

      // Create status bar item if enabled
      if (this.settings.showStatusBar) {
        this.statusBar = this.addStatusBarItem();
      }

      // Register command (available immediately)
      this.addCommand({
        id: "toggle-completed-task-view",
        name: "Toggle Completed Task View",
        callback: () => {
          this.toggleCompletedTaskView();
        },
      });

      // Add settings tab
      this.addSettingTab(new TaskHiderSettingTab(this.app, this));

      // Register CodeMirror extension for hiding tasks
      this.registerEditorExtension(this.createEditorExtension());

      // Wait for workspace to be ready before manipulating DOM and UI
      // This is especially important on mobile platforms like iOS
      this.app.workspace.onLayoutReady(() => {
        try {
          // Set initial body classes for preview mode
          this.updateBodyClasses();

          // Update status bar if enabled
          if (this.statusBar && this.settings.showStatusBar) {
            this.statusBar.setText(
              this.settings.hiddenState ? "Hiding Completed Tasks" : "Showing Completed Tasks",
            );
          }

          // Register icon and ribbon button
          addIcon("tasks", taskShowIcon);
          this.addRibbonIcon("tasks", "Task Hider", () => {
            this.toggleCompletedTaskView();
          });
        } catch (error) {
          console.error("Failed to initialize Completed Task Display UI:", error);
        }
      });
    } catch (error) {
      console.error("Failed to load Completed Task Display plugin:", error);
      // Ensure default settings even if loading fails
      this.settings = DEFAULT_SETTINGS;
    }
  }

  onunload() {
    // CodeMirror extensions are automatically cleaned up by Obsidian
  }
}

class TaskHiderSettingTab extends PluginSettingTab {
  plugin: TaskHiderPlugin;

  constructor(app: App, plugin: TaskHiderPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();

    containerEl.createEl("h2", { text: "Completed Task Display Settings" });

    new Setting(containerEl)
      .setName("Show status bar message")
      .setDesc("Display 'Hiding/Showing Completed Tasks' in the status bar")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.showStatusBar)
          .onChange(async (value) => {
            this.plugin.settings.showStatusBar = value;
            await this.plugin.saveSettings();

            // Update status bar visibility
            if (value && !this.plugin.statusBar) {
              this.plugin.statusBar = this.plugin.addStatusBarItem();
              this.plugin.statusBar.setText(
                this.plugin.settings.hiddenState
                  ? "Hiding Completed Tasks"
                  : "Showing Completed Tasks",
              );
            } else if (!value && this.plugin.statusBar) {
              this.plugin.statusBar.remove();
              this.plugin.statusBar = null;
            }
          }),
      );

    new Setting(containerEl)
      .setName("Hide sub-bullets")
      .setDesc(
        "In Edit/Live Preview mode: hide sub-bullets (indented items) beneath completed tasks. Note: In Reading view, sub-bullets are automatically hidden with their parent task.",
      )
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.hideSubBullets).onChange(async (value) => {
          this.plugin.settings.hideSubBullets = value;
          await this.plugin.saveSettings();

          // Update body classes for CSS
          this.plugin.updateBodyClasses();

          // Update all editor extensions with new settings
          this.plugin.updateEditorExtensions();
        }),
      );
  }
}

const taskShowIcon = `<svg aria-hidden="true" focusable="false" data-prefix="fal" data-icon="tasks" class="svg-inline--fa fa-tasks fa-w-16" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="currentColor" d="M145.35 207a8 8 0 0 0-11.35 0l-71 71-39-39a8 8 0 0 0-11.31 0L1.35 250.34a8 8 0 0 0 0 11.32l56 56a8 8 0 0 0 11.31 0l88-88a8 8 0 0 0 0-11.32zM62.93 384c-17.67 0-32.4 14.33-32.4 32s14.73 32 32.4 32a32 32 0 0 0 0-64zm82.42-337A8 8 0 0 0 134 47l-71 71-39-39a8 8 0 0 0-11.31 0L1.35 90.34a8 8 0 0 0 0 11.32l56 56a8 8 0 0 0 11.31 0l88-88a8 8 0 0 0 0-11.32zM503 400H199a8 8 0 0 0-8 8v16a8 8 0 0 0 8 8h304a8 8 0 0 0 8-8v-16a8 8 0 0 0-8-8zm0-320H199a8 8 0 0 0-8 8v16a8 8 0 0 0 8 8h304a8 8 0 0 0 8-8V88a8 8 0 0 0-8-8zm0 160H199a8 8 0 0 0-8 8v16a8 8 0 0 0 8 8h304a8 8 0 0 0 8-8v-16a8 8 0 0 0-8-8z"></path></svg>`;
