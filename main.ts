import { App, Plugin, PluginSettingTab, Setting, addIcon, PluginManifest } from "obsidian";

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

export default class TaskHiderPlugin extends Plugin {
  statusBar: HTMLElement | null = null;
  settings: TaskHiderSettings;
  private mutationObserver: MutationObserver | null = null;

  constructor(app: App, manifest: PluginManifest) {
    super(app, manifest);
    // Status bar will be created in onload to ensure proper initialization on mobile
  }

  async toggleCompletedTaskView() {
    this.settings.hiddenState = !this.settings.hiddenState;
    document.body.toggleClass("hide-completed-tasks", this.settings.hiddenState);

    if (this.statusBar && this.settings.showStatusBar) {
      this.statusBar.setText(
        this.settings.hiddenState ? "Hiding Completed Tasks" : "Showing Completed Tasks",
      );
    }

    // Update nested item visibility when main toggle changes
    this.updateNestedItemVisibility();

    // Hide or show completed task gutters
    if (this.settings.hiddenState) {
      this.hideCompletedTaskGutters();
    } else {
      this.restoreGutterElements();
    }

    await this.saveSettings();
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  /**
   * Update nested item visibility in edit mode based on parent task completion
   * This handles hiding sub-bullets under completed tasks in the editor
   */
  updateNestedItemVisibility() {
    if (!this.settings.hideSubBullets || !this.settings.hiddenState) {
      // Remove all hide-nested-item classes and inline styles if settings are disabled
      document.querySelectorAll(".cm-line.hide-nested-item").forEach((el) => {
        el.removeClass("hide-nested-item");
        (el as HTMLElement).style.display = "";
      });
      // Restore gutter elements
      this.restoreGutterElements();
      return;
    }

    // Find all editor content containers
    const editors = document.querySelectorAll(".cm-content");

    editors.forEach((editor) => {
      const lines = Array.from(editor.querySelectorAll(".cm-line"));

      // First, remove all existing hide-nested-item classes
      lines.forEach((line) => line.removeClass("hide-nested-item"));

      // Restore all gutter elements before re-applying hiding
      this.restoreGutterElements();

      // Process each line to find completed tasks and hide their nested items
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i] as HTMLElement;

        // Check if this is a completed task
        const isCompletedTask =
          line.classList.contains("HyperMD-task-line") &&
          (line.getAttribute("data-task") === "x" || line.getAttribute("data-task") === "X");

        if (isCompletedTask) {
          const taskIndent = this.getIndentLevel(line);

          // Hide all subsequent lines that are more indented
          for (let j = i + 1; j < lines.length; j++) {
            const nextLine = lines[j] as HTMLElement;
            const nextIndent = this.getIndentLevel(nextLine);

            // If we hit a line with equal or less indentation, stop
            if (nextIndent <= taskIndent) {
              break;
            }

            // This line is more indented, so it's a child - hide it
            nextLine.addClass("hide-nested-item");

            // Set inline style to hide the element
            if (this.settings.hideSubBullets && this.settings.hiddenState) {
              (nextLine as HTMLElement).style.display = "none";
              // Also hide the corresponding gutter element (line number)
              this.hideGutterElementForLine(nextLine);
            }
          }
        }
      }
    });
  }

  /**
   * Get the indentation level of a line in the editor
   * Returns the text-indent value as a number (e.g., -75px returns 75)
   */
  private getIndentLevel(line: HTMLElement): number {
    const style = window.getComputedStyle(line);
    const textIndent = style.textIndent;

    // Extract numeric value from text-indent (e.g., "-75px" -> 75)
    const match = textIndent.match(/-?(\d+)/);
    if (match) {
      return parseInt(match[1], 10);
    }

    // Check for cm-hmd-list-indent classes as fallback
    const indentMatch = line.className.match(/cm-hmd-list-indent-(\d+)/);
    if (indentMatch) {
      return parseInt(indentMatch[1], 10) * 40; // Approximate indent level
    }

    return 0;
  }

  /**
   * Hide the gutter element (line number) for a given line
   */
  private hideGutterElementForLine(line: HTMLElement) {
    // Find the editor containing this line
    const editorView = line.closest(".cm-editor");
    if (!editorView) return;

    // Find the gutter container
    const gutters = editorView.querySelectorAll(".cm-gutters .cm-gutter");
    if (!gutters.length) return;

    // Get the line index within the editor
    const content = line.closest(".cm-content");
    if (!content) return;

    const allLines = Array.from(content.querySelectorAll(".cm-line"));
    const lineIndex = allLines.indexOf(line);
    if (lineIndex === -1) return;

    // Hide the corresponding gutter element in each gutter
    gutters.forEach((gutter) => {
      const gutterElements = gutter.querySelectorAll(".cm-gutterElement");
      if (gutterElements[lineIndex]) {
        const gutterEl = gutterElements[lineIndex] as HTMLElement;
        gutterEl.style.display = "none";
        gutterEl.style.height = "0px";
        gutterEl.setAttribute("data-hidden-by-plugin", "true");
      }
    });
  }

  /**
   * Restore all hidden gutter elements
   */
  private restoreGutterElements() {
    document.querySelectorAll(".cm-gutterElement[data-hidden-by-plugin]").forEach((el) => {
      const gutterEl = el as HTMLElement;
      gutterEl.style.display = "";
      gutterEl.style.height = "";
      gutterEl.removeAttribute("data-hidden-by-plugin");
    });
  }

  /**
   * Hide gutter elements for all completed tasks in edit mode
   */
  private hideCompletedTaskGutters() {
    if (!this.settings.hiddenState) {
      return;
    }

    // Find all completed task lines
    const completedTasks = document.querySelectorAll(
      ".cm-line.HyperMD-task-line[data-task='x'], .cm-line.HyperMD-task-line[data-task='X']"
    );

    completedTasks.forEach((line) => {
      this.hideGutterElementForLine(line as HTMLElement);
    });
  }

  /**
   * Start observing DOM changes to update nested item visibility
   */
  private startObservingEditor() {
    // Disconnect existing observer if any
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
    }

    // Create a new observer to watch for editor changes
    this.mutationObserver = new MutationObserver(() => {
      if (this.settings.hideSubBullets) {
        this.updateNestedItemVisibility();
      }
      // Always hide completed task gutters when tasks are hidden
      if (this.settings.hiddenState) {
        this.hideCompletedTaskGutters();
      }
    });

    // Observe the workspace for changes
    const workspaceEl = document.querySelector(".workspace");
    if (workspaceEl) {
      this.mutationObserver.observe(workspaceEl, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["data-task"],
      });
    }
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

      // Wait for workspace to be ready before manipulating DOM and UI
      // This is especially important on mobile platforms like iOS
      this.app.workspace.onLayoutReady(() => {
        try {
          // Update status bar if enabled
          if (this.statusBar && this.settings.showStatusBar) {
            this.statusBar.setText(
              this.settings.hiddenState ? "Hiding Completed Tasks" : "Showing Completed Tasks",
            );
          }

          // Apply initial state to DOM
          document.body.toggleClass("hide-completed-tasks", this.settings.hiddenState);
          document.body.toggleClass("hide-sub-bullets", this.settings.hideSubBullets);

          // Register icon and ribbon button
          addIcon("tasks", taskShowIcon);
          this.addRibbonIcon("tasks", "Task Hider", () => {
            this.toggleCompletedTaskView();
          });

          // Start observing editor changes for sub-bullets hiding
          this.startObservingEditor();

          // Initial update of nested item visibility
          if (this.settings.hideSubBullets) {
            this.updateNestedItemVisibility();
          }

          // Initial hiding of completed task gutters
          if (this.settings.hiddenState) {
            this.hideCompletedTaskGutters();
          }
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
    // Disconnect mutation observer
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = null;
    }
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

          // Update DOM class
          document.body.toggleClass("hide-sub-bullets", value);

          // Update nested item visibility in edit mode
          this.plugin.updateNestedItemVisibility();
        }),
      );
  }
}

const taskShowIcon = `<svg aria-hidden="true" focusable="false" data-prefix="fal" data-icon="tasks" class="svg-inline--fa fa-tasks fa-w-16" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="currentColor" d="M145.35 207a8 8 0 0 0-11.35 0l-71 71-39-39a8 8 0 0 0-11.31 0L1.35 250.34a8 8 0 0 0 0 11.32l56 56a8 8 0 0 0 11.31 0l88-88a8 8 0 0 0 0-11.32zM62.93 384c-17.67 0-32.4 14.33-32.4 32s14.73 32 32.4 32a32 32 0 0 0 0-64zm82.42-337A8 8 0 0 0 134 47l-71 71-39-39a8 8 0 0 0-11.31 0L1.35 90.34a8 8 0 0 0 0 11.32l56 56a8 8 0 0 0 11.31 0l88-88a8 8 0 0 0 0-11.32zM503 400H199a8 8 0 0 0-8 8v16a8 8 0 0 0 8 8h304a8 8 0 0 0 8-8v-16a8 8 0 0 0-8-8zm0-320H199a8 8 0 0 0-8 8v16a8 8 0 0 0 8 8h304a8 8 0 0 0 8-8V88a8 8 0 0 0-8-8zm0 160H199a8 8 0 0 0-8 8v16a8 8 0 0 0 8 8h304a8 8 0 0 0 8-8v-16a8 8 0 0 0-8-8z"></path></svg>`;
