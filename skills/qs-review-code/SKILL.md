---
name: qs-review-code
description: "Review a change or selected codebase scope and optionally improve or refactor it safely."
---

# Review, improve, or refactor code

<!-- qs-runtime-start -->
Before doing any task work, read [the shared run contract](../_shared/runtime/run-contract.md) relative to this invoked `SKILL.md`. Use the actual skill location supplied by the host to resolve it within the same package or canonical tree. Read through the end marker before selecting task tools, delegating, or acting. Then post the contract's initial checklist and progress update in the conversation before starting the task.
Confirm the file starts with `# QuickStark runtime run contract` and ends with `<!-- qs-runtime-run-contract:end -->`. If the host lacks usable read access or cannot locate this skill, report `Input required`. If the expected file is missing, unreadable, invalid, or resolves outside the owning tree, report `Failed`. Give `Status:`, `Skills used: /qs-review-code` and an `Outcome:` naming the owning package (qs-skills) and prerequisite. Include `Specs: Not located` and a short `Work summary:` with `Finished —` and `Next —`. Write `Next work prompt: None — shared run contract unavailable.` Stop before task work. Emit no executable continuation, perform no repair, and use no alternate copy.
<!-- qs-runtime-end -->

Accept two independent inputs:

- `target=changes|<module|component|package|path|named concern>`
- `action=review|improve|refactor`, defaulting to `review` only when neither explicit flags nor clear natural-language mutation intent selects another action

`refactor` is a first-class scoped improvement intent. It preserves externally observable behavior unless the user explicitly authorizes a behavior change.

## Safety boundary

- Review is read-only.
- Improve or refactor requires explicit mutation intent and a narrow validated target.
- “Improve/refactor the whole codebase” does not authorize broad edits. Perform a bounded review, rank the highest-value candidates, and end `input-required` with one scope-selection prompt.
- Authorized edits stay inside the selected target plus directly required tests and configuration.
- Requests to fix, address, apply, improve, or resolve findings are clear natural-language mutation intent and select `action=improve` when no explicit action conflicts.

## Review dimensions

Assess correctness, maintainability, architecture, testability, security, and operational risk when relevant. Keep repository-standards and specification findings as separate axes. Prioritize findings by impact and confidence; actionable P0/P1 findings or failed required checks prohibit completion.

## Parallel review axes

Give each reviewer the relevant starting files, immutable revision or content identity, exact question and acceptance standard. Starting pointers permit justified discovery; reviewers remain read-only. Return bounded decisive evidence with source pointers and retain contradictions. Reuse accepted evidence only while its relevant artifact and inputs remain valid; changed shared dependencies reopen affected axes rather than automatically repeating every review.

Before any fan-out, validate the target: resolve the fixed point or selected path, confirm the diff or scope is non-empty, and locate the governing specification and repository standards. A bad reference or empty target fails here, not inside helpers.

Apply the internal delegation capability to the axes:

- **Standards**: the selected target against documented repository standards and the review dimensions above.
- **Spec**: the selected target against the governing specification — missing or partial requirements, unrequested behavior, and requirements implemented incorrectly. Skip this axis and say so when no specification exists.
- **Security**: added at `effort=deep`, or when the target touches authentication, secrets, input handling or permissions.

When the host provides subagents, run each axis as a parallel read-only reviewer started with a fresh context window. Brief each with the diff command or target path, the source list for its axis, and a bounded return of at most 400 words citing file, hunk and rule or requirement. Without subagent support, review the same axes serially in this root.

Present the axes side by side under their own headings. Do not merge or rerank findings across axes; a target can pass one axis and fail another. Summarize finding counts and the most severe finding within each axis. Reviewers never edit, even when this run's action is `improve` or `refactor`; authorized repair stays in this root.

Prefer subtractive improvements before adding abstractions. Reduce reader load, require callers to migrate before legacy interfaces disappear, and ask whether the type system or module boundary can make the repaired invariant structural.

## Host inline comments

When the active client supplies the `::code-comment{...}` inline-comment contract, load [INLINE-COMMENTS.md](INLINE-COMMENTS.md) before emitting directives. Keep every finding in the readable report with verified evidence and a defensible file/line anchor. Only actionable, unrepaired findings within the host's actual rendering surface receive a directive; missing anchors stay in prose. Redact secrets from evidence and untrusted excerpts before reporting them. Loading the adapter does not authorize external comments, edits, another workflow or a claim that the host rendered the result.

## Scoped improvement and refactoring

1. Establish behavior-preserving characterization tests when existing coverage is insufficient.
2. State the selected smell, boundary, invariant, or maintainability outcome.
3. Make the smallest coherent structural edits.
4. Re-run focused and relevant wider checks.
5. Report behavior preserved, files changed, and residual risks.

For `action=improve` or `action=refactor`, resolve every in-scope actionable finding that can be repaired under the user's authority. Review the resulting diff and rerun focused plus relevant wider checks inside this root until they pass or a concrete external blocker remains. Do not leave an authorized repair for a separate Build, Debug, Review, or Test run merely to preserve a workflow boundary.

Do not return `continuation-required` merely to ask another public skill to implement, review, repair, test, or validate work owned by the selected action. Use that status only when a genuinely distinct workflow or separately authorized scope remains.

Domain modeling, module decomposition and delegation may inform the review as internal capabilities. They never become separate runs. Do not automatically invoke build, Git, or deployment.

## Completion report and next steps

Apply the shared run contract. Report `Status:`, `Skills used: /qs-review-code`, and `Outcome:`.
Include `Specs:` and `Work summary:` with `Finished —` and `Next —`.
Include `Next work prompt:`. Use the exact available literal for the active host. Route entries list Codex, bare slash, and Pi spellings in that order.
Normal routes: `$qs-skills:qs-git-merge` / `/qs-git-merge` / `/skill:qs-git-merge`.
Recovery routes: `$qs-skills:qs-code-build` / `/qs-code-build` / `/skill:qs-code-build`, `$qs-skills:qs-code-debug` / `/qs-code-debug` / `/skill:qs-code-debug`, `$qs-skills:qs-flow-handoff` / `/qs-flow-handoff` / `/skill:qs-flow-handoff`.
