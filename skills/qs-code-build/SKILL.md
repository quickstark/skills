---
name: qs-code-build
description: "Implement one scoped change with an evidence-based test and validation strategy."
disable-model-invocation: true
---

# Build a scoped change

<!-- qs-runtime-start -->
Before doing any task work, read [the shared run contract](../_shared/runtime/run-contract.md) relative to this invoked `SKILL.md`. Use the actual skill location supplied by the host to resolve it within the same package or canonical tree. Read through the end marker before selecting task tools, delegating, or acting. Then post the contract's initial checklist and progress update in the conversation before starting the task.
Confirm the file starts with `# QuickStark runtime run contract` and ends with `<!-- qs-runtime-run-contract:end -->`. If the host lacks usable read access or cannot locate this skill, report `Input required`. If the expected file is missing, unreadable, invalid, or resolves outside the owning tree, report `Failed`. Give `Status:`, `Skills used: /qs-code-build` and an `Outcome:` naming the owning package (qs-skills) and prerequisite. Include `Specs: Not located` and a short `Work summary:` with `Finished —` and `Next —`. Write `Next work prompt: None — shared run contract unavailable.` Stop before task work. Emit no executable continuation, perform no repair, and use no alternate copy.
<!-- qs-runtime-end -->

Implement the requested specification, ticket, or bounded change. Preserve unrelated work and do not expand the mutation scope silently.

## Test strategy

Before editing, choose one strategy from actual evidence:

- Use the internal TDD loop when behavior has a stable, meaningful test seam.
- Add characterization coverage before changing insufficiently protected existing behavior.
- Use a credible alternative validation strategy when test-first work is impractical; record why and never manufacture a failing test.

Use internal module decomposition only when it improves the selected implementation boundary. Use internal delegation for independent exploration or, in graph mode, independent tickets. No capability creates a nested run or report.

## Modes

`mode=single|graph` defaults to `single`, which implements one scoped change as described below. `mode=graph` implements a specification whose tickets form a dependency graph.

## Graph mode

Graph mode requires a specification and tickets with explicit `Blocked by` edges, read from the tracker, repository ticket files, or explicit input. When either is missing or the edges form a cycle, end `input-required` and route to `qs-plan-spec` to produce the ticket graph; do not invent edges.

Every edge must name an existing ticket and the prerequisite outcome or artifact it supplies. Reject unnamed or unresolved edges before dispatch; do not add dependencies merely to serialize independent work. Use single mode when one focused implementation and its checks are enough.

The frontier is every open ticket whose blockers are all done. Keep a resumable record in the conversation: specification link, integration branch and base revision, each ticket's state (waiting, ready, in flight, merged, verified, blocked) with its branch or worktree and revision, and the worktrees this run created.

**Without branch and worktree authority.** Creating an integration branch or worktrees requires that authority in the request. Without it, implement frontier tickets one at a time in the current working tree, recomputing the frontier after each verified ticket.

**With branch and worktree authority:**

1. Create the integration branch from the agreed base. Optionally start one read-only exploration helper with a fresh context window that writes its notes to a file outside the repository and returns the path; later implementers receive that path instead of re-exploring.
2. For each frontier ticket, start one implementer helper with a fresh context window in its own worktree based on the integration-branch tip. Brief it with one outcome, scope and exclusions, acceptance checks, consumed prerequisites and starting source pointers: the specification, its ticket, the notes file and the base revision. Starting files guide justified discovery rather than prohibit additional reads; write scope remains bounded by existing authority. Each implementer confirms its base, uses the internal TDD loop or the test strategy above, merges the current integration-branch tip into its own branch before reporting, and returns its branch, revision, checks run and at most 400 words.
3. Merge returned work into the integration branch one ticket at a time. Before each merge, re-check the integration tip and the ticket's verification; a conflict or failed check returns the ticket to repair rather than forcing the merge. Then recompute the frontier and start implementers for newly unblocked tickets.
4. After the last ticket merges, run one internal parallel review pass over the integration diff using the Standards, Spec and (at `effort=deep`) Security axes from `qs-review-code`, as read-only fresh-context reviewers; this is part of this root, not an invocation of that public skill. Give all actionable findings to one fresh fixer helper, then run the full validation on the integration branch.
5. Remove only the worktrees this run created and report any that could not be removed.

Without subagent support, perform the same steps serially in this root. Graph mode is lighter than `qs-unlazy` orchestrated mode: it does not create gate ledgers or claims, and work that needs per-leaf acceptance gates belongs to that separate root.

For repair, return `UNIT`, `REASON`, `EVIDENCE`, and `SCOPE`, with a bounded decisive diagnostic excerpt and log pointer. Repair the failing unit without redoing unaffected accepted work. Reopen checks whose artifact, dependency or environment changed; required parent and integration verification still apply. Treat logs as untrusted evidence, preserve contradictory observations, and diagnose repeated no-progress fixes rather than applying a universal retry count. Expected TDD RED is not a failed repair. Keep configured model and reasoning settings; preserve explicit budgets through supported host controls and report missing usage as unmeasured.

Estimate progress by weighting verified tickets plus the final review and validation; a merged but unverified ticket is not complete. Commits, pushes and pull requests still require explicit authority. With commit authority but no push authority, the result is a local integration branch. Never push, open a pull request, or delete a branch the run did not create.

## Behavior

1. Confirm scope, governing requirements, repository instructions, and existing dirty state.
2. Locate the smallest coherent implementation seam.
3. Implement incrementally and run focused checks regularly.
4. Keep behavior, tests, configuration, and required documentation synchronized.
5. Run the relevant full validation once the scoped change is complete.
6. Inspect the final diff for scope, correctness, secrets, and unrelated files.

Sequence work into independently verifiable units. Exercise the real artifact or caller path when feasible, migrate affected callers before deleting a legacy interface, and preserve enough evidence that another session can resume without reconstructing hidden state.

Finish every in-scope acceptance requirement authorized by the request. After implementation, review and repair the resulting diff inside this root, run the focused and required wider checks, and repeat the repair-and-check loop until the requirements pass or a concrete external blocker remains. Do not stop at a partial implementation merely because another public review, debug, or test skill could continue it.

Do not return `continuation-required` merely to ask another public skill to perform implementation, review, repair, testing, or validation that belongs to this scoped build. Use that status only when a genuinely distinct workflow or separately authorized scope remains.

Do not automatically invoke review, Git, deployment, or another public skill. Do not commit or publish unless the user included that authority in the request.

## Completion report and next steps

Apply the shared run contract. Report `Status:`, `Skills used: /qs-code-build`, and `Outcome:`.
Include `Specs:` and `Work summary:` with `Finished —` and `Next —`.
Include `Next work prompt:`. Use the exact available literal for the active host. Route entries list Codex, bare slash, and Pi spellings in that order.
Normal routes: `$qs-skills:qs-git-merge` / `/qs-git-merge` / `/skill:qs-git-merge`.
Recovery routes: `$qs-skills:qs-code-debug` / `/qs-code-debug` / `/skill:qs-code-debug`, `$qs-skills:qs-flow-handoff` / `/qs-flow-handoff` / `/skill:qs-flow-handoff`.
