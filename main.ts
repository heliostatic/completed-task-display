import { App, Plugin, PluginSettingTab, Setting, addIcon, PluginManifest } from "obsidian";

interface TaskHiderSettings {
  hiddenState: boolean;
  showStatusBar: boolean;
}

const DEFAULT_SETTINGS: TaskHiderSettings = {
  hiddenState: true,
  showStatusBar: true,
};

export default class TaskHiderPlugin extends Plugin {
  statusBar: HTMLElement | null = null;
  settings: TaskHiderSettings;

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

    await this.saveSettings();
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
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
    // Cleanup handled automatically by Obsidian
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
  }
}

const taskShowIcon = `<svg aria-hidden="true" focusable="false" data-prefix="fal" data-icon="tasks" class="svg-inline--fa fa-tasks fa-w-16" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="currentColor" d="M145.35 207a8 8 0 0 0-11.35 0l-71 71-39-39a8 8 0 0 0-11.31 0L1.35 250.34a8 8 0 0 0 0 11.32l56 56a8 8 0 0 0 11.31 0l88-88a8 8 0 0 0 0-11.32zM62.93 384c-17.67 0-32.4 14.33-32.4 32s14.73 32 32.4 32a32 32 0 0 0 0-64zm82.42-337A8 8 0 0 0 134 47l-71 71-39-39a8 8 0 0 0-11.31 0L1.35 90.34a8 8 0 0 0 0 11.32l56 56a8 8 0 0 0 11.31 0l88-88a8 8 0 0 0 0-11.32zM503 400H199a8 8 0 0 0-8 8v16a8 8 0 0 0 8 8h304a8 8 0 0 0 8-8v-16a8 8 0 0 0-8-8zm0-320H199a8 8 0 0 0-8 8v16a8 8 0 0 0 8 8h304a8 8 0 0 0 8-8V88a8 8 0 0 0-8-8zm0 160H199a8 8 0 0 0-8 8v16a8 8 0 0 0 8 8h304a8 8 0 0 0 8-8v-16a8 8 0 0 0-8-8z"></path></svg>`;
