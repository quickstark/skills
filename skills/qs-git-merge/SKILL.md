---
name: qs-git-merge
description: "Inspect and safely integrate only explicitly selected Git and GitHub changes."
---

# Integrate selected changes

<!-- qs-runtime-start -->
Before doing any task work, read [the shared run contract](../_shared/runtime/run-contract.md) relative to this invoked `SKILL.md`. Use the actual skill location supplied by the host to resolve it within the same package or canonical tree. Read through the end marker before selecting task tools, delegating, or acting. Then post the contract's initial checklist and progress update in the conversation before starting the task.
Confirm the file starts with `# QuickStark runtime run contract` and ends with `<!-- qs-runtime-run-contract:end -->`. If the host lacks usable read access or cannot locate this skill, report `Input required`. If the expected file is missing, unreadable, invalid, or resolves outside the owning tree, report `Failed`. Give `Status:`, `Skills used: /qs-git-merge` and an `Outcome:` naming the owning package (qs-skills) and prerequisite. Include `Specs: Not located` and a short `Work summary:` with `Finished —` and `Next —`. Write `Next work prompt: None — shared run contract unavailable.` Stop before task work. Emit no executable continuation, perform no repair, and use no alternate copy.
<!-- qs-runtime-end -->

Resolve the repository root, current branch, upstream, ahead/behind state, dirty files, commits, checks, and actual pull request before choosing an operation.

## Safety

- Preserve unrelated dirty files and never stage them implicitly.
- Do not invent a feature branch or pull request when the selected commit is already on the default branch.
- Never force-push, delete, reset, or rewrite published history without explicit authorization.
- A local commit is not published until the tracked remote proves it.
- Treat the `upstream` remote as read-only and never push personalized changes to it.
- Git integration is separate from deployment and release execution.

Perform only the requested push, pull request, merge, rebase, or conflict resolution. Re-run the checks made relevant by integration and verify the remote/PR state afterward. End after Git integration; do not deploy automatically.

Sequence integration into verifiable units. Migrate affected callers before removing legacy interfaces, and make each operation idempotent or explicitly detect already-completed remote state before retrying.

Distinguish the actual cases explicitly: an ahead default branch may require an explicitly requested or approved `git push origin main`, with no branch merge required; a feature branch may require a pull request; an existing pull request may require merge; diverged branches may require merge or rebase conflict resolution. Never describe one case as another.

When an authorized operation creates or updates a PR, lead its description with the concrete problem and resulting behavior. Include concise observed before/after evidence from the actual changed artifact, relevant commands and results, material risks, and the impact on rollback or compatibility. Distinguish measurements from expectations; never fabricate a benchmark or treat rollback documentation as execution authority. Write the exact multiline description to a body file or structured tool argument without shell interpolation.

## Completion report and next steps

Apply the shared run contract. Report `Status:`, `Skills used: /qs-git-merge`, and `Outcome:`.
Include `Specs:` and `Work summary:` with `Finished —` and `Next —`.
Include `Next work prompt:`. Use the exact available literal for the active host. Route entries list Codex, bare slash, and Pi spellings in that order.
Normal routes: `$qs-skills:qs-deploy-release` / `/qs-deploy-release` / `/skill:qs-deploy-release`, `$qs-skills:qs-review-code` / `/qs-review-code` / `/skill:qs-review-code`, `$qs-skills:qs-code-build` / `/qs-code-build` / `/skill:qs-code-build`.
Recovery routes: `$qs-skills:qs-review-code` / `/qs-review-code` / `/skill:qs-review-code`, `$qs-skills:qs-code-debug` / `/qs-code-debug` / `/skill:qs-code-debug`.
