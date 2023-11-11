import { App, Plugin, addIcon, PluginManifest, setIcon } from 'obsidian';

interface TaskHiderPluginSettings {
	hide: boolean;
}

export default class TaskHiderPlugin extends Plugin {
	statusBar: HTMLElement;
	settings: TaskHiderPluginSettings;

	constructor(app: App, manifest: PluginManifest) {
		super(app, manifest);
		this.statusBar = this.addStatusBarItem();
		setIcon(this.statusBar, "list-checks");
		this.statusBar.addEventListener('click', this.toggleCompletedTaskView.bind(this));
		this.statusBar.addClass('mod-clickable');
		this.registerEvent(this.app.workspace.on('layout-change', this.skipAnimation.bind(this)));
	}

	async skipAnimation(workspace: any) {
		document.body.removeClass('add-animation');
		await new Promise(resolve => setTimeout(resolve, 1000));
		document.body.addClass('add-animation');
	}

	toggleCompletedTaskView() {
		this.settings.hide = !this.settings.hide;
		this.saveSettings();
		this.update();
	}
	update() {
		document.body.toggleClass('hide-completed-tasks', this.settings.hide);
	}

	async onload() {
		await this.loadSettings();
		this.update();


		addIcon('tasks', taskShowIcon);
		this.addRibbonIcon('tasks', 'Task Hider', this.toggleCompletedTaskView.bind(this));
		this.addCommand({
			id: "toggle-completed-task-view",
			name: "Toggle Completed Task View",
			callback: this.toggleCompletedTaskView.bind(this),
		});
	}

	onunload() {
		console.log('unloading completed-task-display plugin');
	}

	async loadSettings() {
		this.settings = Object.assign({}, { hide: false }, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
const taskShowIcon = `<svg aria-hidden="true" focusable="false" data-prefix="fal" data-icon="tasks" class="svg-inline--fa fa-tasks fa-w-16" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="currentColor" d="M145.35 207a8 8 0 0 0-11.35 0l-71 71-39-39a8 8 0 0 0-11.31 0L1.35 250.34a8 8 0 0 0 0 11.32l56 56a8 8 0 0 0 11.31 0l88-88a8 8 0 0 0 0-11.32zM62.93 384c-17.67 0-32.4 14.33-32.4 32s14.73 32 32.4 32a32 32 0 0 0 0-64zm82.42-337A8 8 0 0 0 134 47l-71 71-39-39a8 8 0 0 0-11.31 0L1.35 90.34a8 8 0 0 0 0 11.32l56 56a8 8 0 0 0 11.31 0l88-88a8 8 0 0 0 0-11.32zM503 400H199a8 8 0 0 0-8 8v16a8 8 0 0 0 8 8h304a8 8 0 0 0 8-8v-16a8 8 0 0 0-8-8zm0-320H199a8 8 0 0 0-8 8v16a8 8 0 0 0 8 8h304a8 8 0 0 0 8-8V88a8 8 0 0 0-8-8zm0 160H199a8 8 0 0 0-8 8v16a8 8 0 0 0 8 8h304a8 8 0 0 0 8-8v-16a8 8 0 0 0-8-8z"></path></svg>`