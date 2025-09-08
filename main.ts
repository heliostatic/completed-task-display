import { App, Plugin, addIcon, PluginManifest, PluginSettingTab, Setting } from 'obsidian';

interface TaskHiderSettings {
    hiddenState: boolean;
    incompleteSymbols: string[]; // symbols considered NOT completed in source view
}

const DEFAULT_SETTINGS: TaskHiderSettings = {
    hiddenState: true,
    incompleteSymbols: []
};

export default class TaskHiderPlugin extends Plugin {
	statusBar: HTMLElement;
	settings: TaskHiderSettings = { ...DEFAULT_SETTINGS };
	private dynamicStyleEl: HTMLStyleElement | null = null;

	constructor(app: App, manifest: PluginManifest) {
		super(app, manifest);
		this.statusBar = this.addStatusBarItem();
	}

	async toggleCompletedTaskView() {
		this.settings.hiddenState = !this.settings.hiddenState;
		document.body.toggleClass('hide-completed-tasks', this.settings.hiddenState);
		this.statusBar.setText(this.settings.hiddenState ? 'Hiding Completed Tasks' : 'Showing Completed Tasks');
		await this.saveSettings();
	}

	private buildDynamicCss(): string {
		// Build a CSS rule for source view that hides any non-empty data-task
		// except the explicitly configured incompleteSymbols and a single space.
		const exc = (this.settings.incompleteSymbols || []).map(s => s.trim()).filter(Boolean);
		const escapeCssValue = (val: string) => val.replace(/\\/g, "\\\\").replace(/\"/g, '\\"');
		const nots = ['[data-task=" "]', ...exc.map(s => `[data-task="${escapeCssValue(s)}"]`)];
		const selector = `body.hide-completed-tasks .markdown-source-view .HyperMD-task-line[data-task]${nots.map(n => `:not(${n})`).join('')}`;
		return `${selector} { display: none; }`;
	}

	private applyDynamicCss() {
		const css = this.buildDynamicCss();
		if (!this.dynamicStyleEl) {
			this.dynamicStyleEl = document.createElement('style');
			this.dynamicStyleEl.id = 'task-hider-dynamic-css';
			document.head.appendChild(this.dynamicStyleEl);
		}
		this.dynamicStyleEl.textContent = css;
	}

	async saveSettings() {
		await this.saveData({ ...this.settings });
		// Refresh CSS in case settings changed
		this.applyDynamicCss();
	}

	async loadSettings() {
		const data = await this.loadData();
		// Backward compatibility with old shape { hiddenState: boolean }
		if (data) {
			this.settings = {
				...DEFAULT_SETTINGS,
				hiddenState: typeof data.hiddenState === 'boolean' ? data.hiddenState : DEFAULT_SETTINGS.hiddenState,
				incompleteSymbols: Array.isArray(data.incompleteSymbols) ? data.incompleteSymbols : DEFAULT_SETTINGS.incompleteSymbols,
			};
		} else {
			this.settings = { ...DEFAULT_SETTINGS };
		}
	}

	async onload() {
		console.log('loading completed-task-display plugin');
		await this.loadSettings();
		this.statusBar.setText(this.settings.hiddenState ? 'Hiding Completed Tasks' : 'Showing Completed Tasks');
		document.body.toggleClass('hide-completed-tasks', this.settings.hiddenState);
		this.applyDynamicCss();

		addIcon('tasks', taskShowIcon);
		this.addRibbonIcon('tasks', 'Task Hider', () => {
			this.toggleCompletedTaskView();
		});
		this.addCommand({
			id: "toggle-completed-task-view",
			name: "Toggle Completed Task View",
			callback: () => {
				this.toggleCompletedTaskView();
			}
		});

		// Settings tab
		this.addSettingTab(new TaskHiderSettingTab(this.app, this));
	}

	onunload() {
		console.log('unloading completed-task-display plugin');
		if (this.dynamicStyleEl && this.dynamicStyleEl.parentElement) {
			this.dynamicStyleEl.parentElement.removeChild(this.dynamicStyleEl);
			this.dynamicStyleEl = null;
		}
	}
}

const taskShowIcon = `<svg aria-hidden="true" focusable="false" data-prefix="fal" data-icon="tasks" class="svg-inline--fa fa-tasks fa-w-16" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="currentColor" d="M145.35 207a8 8 0 0 0-11.35 0l-71 71-39-39a8 8 0 0 0-11.31 0L1.35 250.34a8 8 0 0 0 0 11.32l56 56a8 8 0 0 0 11.31 0l88-88a8 8 0 0 0 0-11.32zM62.93 384c-17.67 0-32.4 14.33-32.4 32s14.73 32 32.4 32a32 32 0 0 0 0-64zm82.42-337A8 8 0 0 0 134 47l-71 71-39-39a8 8 0 0 0-11.31 0L1.35 90.34a8 8 0 0 0 0 11.32l56 56a8 8 0 0 0 11.31 0l88-88a8 8 0 0 0 0-11.32zM503 400H199a8 8 0 0 0-8 8v16a8 8 0 0 0 8 8h304a8 8 0 0 0 8-8v-16a8 8 0 0 0-8-8zm0-320H199a8 8 0 0 0-8 8v16a8 8 0 0 0 8 8h304a8 8 0 0 0 8-8V88a8 8 0 0 0-8-8zm0 160H199a8 8 0 0 0-8 8v16a8 8 0 0 0 8 8h304a8 8 0 0 0 8-8v-16a8 8 0 0 0-8-8z"></path></svg>`;

class TaskHiderSettingTab extends PluginSettingTab {
    plugin: TaskHiderPlugin;

    constructor(app: App, plugin: TaskHiderPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        containerEl.createEl('h2', { text: 'Completed Task Display Settings' });

        new Setting(containerEl)
            .setName('Unchecked symbols (source view)')
            .setDesc('Comma- or space-separated list of symbols to treat as NOT completed in source mode. Example: !, ?, -')
            .addText(text => {
                const current = (this.plugin.settings.incompleteSymbols || []).join(', ');
                text.setPlaceholder('!, ?, -')
                    .setValue(current)
                    .onChange(async (value) => {
                        const parts = value
                            .split(/[,\s]+/)
                            .map(s => s.trim())
                            .filter(Boolean);
                        this.plugin.settings.incompleteSymbols = parts;
                        await this.plugin.saveSettings();
                    });
            });
    }
}
