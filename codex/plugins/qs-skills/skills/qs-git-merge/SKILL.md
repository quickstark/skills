---
name: qs-git-merge
description: "Use when you need to resolve an in-progress git merge/rebase conflict."
---

1. **See the current state** of the merge/rebase. Check git history, and the conflicting files.

2. **Find the primary sources** for each conflict. Understand deeply why each change was made, and what the original intent was. Read the commit messages, check the PRs, check original issues/tickets.

3. **Resolve each hunk.** Preserve both intents where possible. Where incompatible, pick the one matching the merge's stated goal and note the trade-off. Do **not** invent new behaviour. Always resolve; never `--abort`.

4. Discover the project's **automated checks** and run them — typically typecheck, then tests, then format. Fix anything the merge broke.

5. **Finish the merge/rebase.** Stage everything and commit. If rebasing, continue the rebase process until all commits are rebased.

## Completion report and next steps

Finish with a concise, readable completion report. Plain text or restrained Markdown is sufficient; do not create a separate report or HTML file unless this skill's primary workflow requires one.

```text
Status: Completed | Awaiting input | Blocked
Skills used: /qs-git-merge; /another-skill only if actually used
Outcome: What was completed, discovered, decided, or is blocking progress.
Outputs: Real files, reports, decisions, or changes, when applicable.
Checks: Only the tests, validations, or observations actually performed.
Next best: /qs-skill-name — why it is the best next step.
```

Always include **Status**, **Skills used**, **Outcome**, and **Next best**. Omit **Outputs** or **Checks** when none exist. List only skills that actually ran; a recommendation belongs under **Next best**, not **Skills used**. Never claim a check, artifact, or result you did not verify.

Select at most three genuinely relevant follow-ons from:

- `/qs-test-tdd` — Verify that resolving the conflict preserved observable behavior.
- `/qs-review-code` — Review the combined changes and the conflict resolution.
- `/qs-code-debug` — Investigate a behavior regression introduced by the merge.

Explain why the recommendation advances the actual work. If the request is finished, say `Next best: None — the requested work is complete.` If input or approval is required, name the decision and do not imply that a suggested skill has already run.
