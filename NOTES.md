# NOTES

## What the plugin does and how to install it

- `code-quality` is a plugin that reviews an Express API and writes tests for the problems it finds.
- It bundles two subagents (`code-reviewer`, `test-writer`), one workflow command (`/code-quality:quality-check`), one skill (`api-conventions`) and one hook.
- The hook runs `node --check` after every edit to a `.js` file, so syntax errors are caught immediately.
- The skill holds the API conventions: validate input, return errors as `{ "error": "..." }`, pass exceptions to `next(err)`.
- Install:
  - `/plugin marketplace add https://github.com/Erick43245/claude-multi-agent-workflow`
  - `/plugin install code-quality@evgenii-tools`
- Run: `/code-quality:quality-check`
- Local testing: `claude --plugin-dir .` from the repo root, then `/reload-plugins` after edits.

## Scoping decision

- `code-reviewer` only gets `Read, Grep, Glob`. Its job is to find problems, not to change code. Without `Write`, `Edit` or `Bash`, it cannot modify files or run commands by accident, so running several reviewers at once is safe.
- `test-writer` gets `Write`, `Edit` and `Bash` on top of the read tools. It has to create test files and run them to check they pass, so it needs those tools.
- Both use the `sonnet` model. Reviewing needs real reasoning about bugs and security, and writing correct tests also needs a capable model.

## Orchestration decision

- Step 1 runs in parallel: two `code-reviewer` agents review different parts of the code (routes vs. middleware and utilities). They read different files and do not depend on each other, so running them together saves time.
- Step 2 is sequential: merging and deduplicating findings needs both reviews to be finished.
- Step 3 is sequential: `test-writer` needs the merged list of problems as its input, so it must wait for the earlier results.
- Rule of thumb: independent work runs together, and any step that needs earlier results waits for them.