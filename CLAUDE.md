1. How is Work Managed? (The Source of Truth)

The **Beads issue tracker is the single source of truth** for all tasks. Do not rely on other documentation files for project status or to determine the next task.

Any time you make a plan, create the appropriate epics and tasks in Beads. Use `bd quickstart` to learn how to use Beads effectively.
All todos should be created in Beads.
Instead of using the `bd` commands in Bash, you can also try to use `/beads` if you have that plugin installed.

---

2. What is the Workflow? (Your Primary Loop)

Follow this development cycle for every feature you build:

1.  **Find the next task:** Run `bd ready` to see the list of unblocked tasks.
2.  **Start the task:** Run `bd update <issue-id> --status in_progress`.
3.  **Implement the feature:** Write the necessary code to complete the task.
4.  **Add tests:** All new features must be accompanied by automated tests in the `/tests` directory.
5.  **Verify your work:** Run the full test suite to ensure all tests pass.
6.  **Commit your changes:** Use a descriptive commit message that references the issue ID (e.g., `feat: Add new feature (library-crm-X)`).
7.  **Close the task:** Run `bd close <issue-id> --reason "Description of work completed."`.
8.  **Update Changelog (if applicable):** After closing a major epic, update the `CHANGELOG.md` file. See the next section for details.
9.  **Repeat.**

---

3. Updating the Changelog

After completing a significant body of work (typically after closing an epic), you must update the `CHANGELOG.md` file.

- **Format:** The changelog is organized by completed epics, with the most recent at the top.
- **Process:**
  1.  Add a new `##` section for the epic you just completed. Include its title and ID.
  2.  Add a completion date.
  3.  Write a bulleted list summarizing the key features or value delivered in that epic.
  4.  Ensure your new entry follows the format of the existing entries in the file.

---

4. What Should I Work On Now?

Run the following command to see the next available tasks:

```bash
bd ready
```
