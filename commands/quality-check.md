---
description: Run a full code-quality workflow on course-api/
---
Run this workflow on the course-api/ folder:

**Step 1 (in parallel):** Launch two code-reviewer subagents at the same time:
one for the routes, one for the middleware and utilities.
They are independent, so they must run simultaneously.

**Step 2 (depends on step 1):** Wait for both reviews. Merge the findings
and remove duplicates.

**Step 3 (sequential):** Pass the high and medium findings to the
test-writer subagent so it writes tests that cover those problems.

Finally, show a summary: findings by severity and the tests created.