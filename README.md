## Completed Task Display

This is a plugin for [Obsidian](https://obsidian.md) that allows you to toggle the display of completed tasks in markdown preview mode.

### Features
- Ribbon button to hide/show completed tasks globally.
- Exception symbols: define symbols that should be treated as not completed (e.g. `!` so `- [!]` stays visible).
- Invert rule: optionally hide only items whose checkbox symbol matches the list (e.g. hide all `- [!]`).
 
### Demo
![](demo-assets/ribbon-button.gif)
## How to install

In Obsidian go to `Settings > Third-party plugins > Community Plugins > Browse` and search for `Completed Task Display`.

### Manual installation

Unzip the [latest release](https://github.com/heliostatic/completed-task-display/releases/latest) into your `<vault>/.obsidian/plugins/` folder.

### Settings
- Unchecked symbols: comma- or space-separated symbols. Normal mode keeps these visible; with Invert rule enabled, these are hidden. Applies to both reading and source (Live Preview) views.
- Invert rule: when enabled, the list works as a hide-list instead of a keep-list.

Notes
- In Obsidian reading view, any non-space checkbox marker is considered “checked” by default. This plugin respects your symbols list to keep them visible (normal) or hide them (invert).
