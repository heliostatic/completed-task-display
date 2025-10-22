# Contributing to Completed Task Display

Thank you for your interest in contributing to Completed Task Display! This document provides guidelines and instructions for contributing to the project.

## Code of Conduct

- Be respectful and inclusive
- Welcome newcomers and help them get started
- Focus on constructive feedback
- Respect differing viewpoints and experiences

## How Can I Contribute?

### Reporting Bugs

Before creating a bug report, please:

1. **Check existing issues** to see if the problem has already been reported
2. **Update to the latest version** to see if the issue has been fixed
3. **Test in a clean vault** to rule out conflicts with other plugins

When creating a bug report, include:

- **Clear title** describing the issue
- **Steps to reproduce** the problem
- **Expected behavior** vs actual behavior
- **Obsidian version** (Settings → About)
- **Plugin version** (can be found in manifest.json or Community Plugins list)
- **Platform** (Windows, macOS, Linux, iOS, Android)
- **Console errors** (if any) - Open Developer Tools (Ctrl/Cmd+Shift+I)

### Suggesting Features

Feature requests are welcome! When suggesting a feature:

- **Check existing issues** for similar requests
- **Describe the problem** you're trying to solve
- **Explain your proposed solution** clearly
- **Consider alternatives** you've thought about
- **Explain why this would be useful** to other users

### Pull Requests

We love pull requests! Here's how to submit one:

1. **Fork the repository** and create your branch from `master`
2. **Make your changes** following the coding standards below
3. **Test your changes** thoroughly
4. **Update documentation** if needed
5. **Write a clear commit message** describing your changes
6. **Submit the pull request**

## Development Setup

See the [Development section](README.md#development) in the README for setup instructions.

## Coding Standards

### TypeScript

- Use TypeScript for all code
- Follow existing code style and formatting
- Use meaningful variable and function names
- Add type annotations where helpful
- Avoid `any` types when possible

### Code Style

- **Indentation**: Use tabs (not spaces)
- **Quotes**: Use double quotes for strings
- **Semicolons**: Use semicolons
- **Line length**: Keep lines under 100 characters when reasonable
- **Comments**: Add comments for complex logic

Example:

```typescript
async toggleCompletedTaskView() {
	this.hiddenState = !this.hiddenState;
	document.body.toggleClass("hide-completed-tasks", this.hiddenState);
	this.statusBar.setText(
		this.hiddenState ? "Hiding Completed Tasks" : "Showing Completed Tasks",
	);
	await this.saveHiddenState();
}
```

### CSS

- Use meaningful class names
- Add comments for sections
- Follow existing formatting
- Use kebab-case for class names

Example:

```css
/* Hide completed tasks in preview mode */
body.hide-completed-tasks
	.markdown-preview-view
	ul
	> li.task-list-item.is-checked {
	display: none;
}
```

## Testing

### Manual Testing

Before submitting a PR, test your changes:

1. **Build the plugin**:
   ```bash
   npm run build
   ```

2. **Test in a development vault**:
   - Create a test note with various task types
   - Toggle completed tasks on/off
   - Test in both Reading and Edit modes
   - Restart Obsidian to test state persistence

3. **Test edge cases**:
   - Empty notes
   - Notes with only completed tasks
   - Notes with only uncompleted tasks
   - Mixed task statuses (if applicable)
   - Very long task lists

### Test Checklist

- [ ] Plugin loads without errors
- [ ] Ribbon button appears and works
- [ ] Command palette command works
- [ ] Status bar updates correctly
- [ ] State persists after restart
- [ ] No console errors
- [ ] Works in Reading mode
- [ ] Works in Edit/Live Preview mode
- [ ] Custom task statuses still visible (for task status changes)

## Commit Messages

Write clear, concise commit messages:

- Use the present tense ("Add feature" not "Added feature")
- Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
- First line should be 50 characters or less
- Reference issues and PRs when relevant

### Commit Message Format

```
<type>: <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Example:**

```
fix: only hide completed tasks [x], not all custom statuses

Previously, the plugin was hiding ALL task statuses except empty [ ],
including custom statuses like [?], [!], [/], etc.

Changed CSS selector to specifically target only [x] and [X].

Fixes #3, addresses #13 and #19
```

## Pull Request Process

1. **Update documentation** if you're changing functionality
2. **Ensure all tests pass** and the plugin builds successfully
3. **Update the README** if adding new features
4. **Link related issues** in your PR description
5. **Be responsive** to feedback and requested changes

### PR Checklist

- [ ] Code follows the style guidelines
- [ ] Changes have been tested
- [ ] Documentation has been updated
- [ ] Commit messages are clear
- [ ] No unnecessary files are included
- [ ] Build succeeds without errors

## Project Structure

Understanding the codebase:

```
completed-task-display/
├── .github/
│   └── workflows/
│       └── release.yml        # Automated release workflow
├── main.ts                    # Main plugin code
├── styles.css                 # Plugin styles
├── manifest.json              # Plugin metadata
├── versions.json              # Obsidian version compatibility
├── package.json               # NPM configuration
├── tsconfig.json              # TypeScript configuration
├── rollup.config.js           # Build configuration
├── README.md                  # User documentation
├── CONTRIBUTING.md            # This file
└── LICENSE                    # MIT license
```

### Key Files

- **main.ts**: Contains the main plugin class and all functionality
- **styles.css**: CSS for hiding completed tasks
- **manifest.json**: Plugin metadata (name, version, author, etc.)
- **versions.json**: Maps plugin versions to minimum Obsidian versions

## Release Process

Releases are automated via GitHub Actions when a tag is pushed:

1. Version numbers are updated in `manifest.json`, `package.json`, and `versions.json`
2. Changes are committed and pushed
3. A tag is created (`git tag -a 1.0.x -m "Release 1.0.x"`)
4. Tag is pushed (`git push origin 1.0.x`)
5. GitHub Actions builds and creates the release with assets

**Note**: Only maintainers can create releases.

## Getting Help

- **Questions**: Open a [GitHub issue](https://github.com/heliostatic/completed-task-display/issues)
- **Discussion**: Use the issue comments for discussions
- **Bugs**: File a bug report with details

## Recognition

Contributors will be recognized in:
- GitHub's contributor list
- Release notes (for significant contributions)
- Project documentation (for major features)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to make Completed Task Display better! 🎉
