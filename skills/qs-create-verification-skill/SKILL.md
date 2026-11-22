---
name: qs-create-verification-skill
description: "Create a project-local rerunnable verification workflow and feature map."
disable-model-invocation: true
---

# Create a verification workflow

<!-- qs-runtime-start -->
Before doing any task work, read [the shared run contract](../_shared/runtime/run-contract.md) relative to this invoked `SKILL.md`. Use the actual skill location supplied by the host to resolve it within the same package or canonical tree. Read through the end marker before selecting task tools, delegating, or acting. Then post the contract's initial checklist and progress update in the conversation before starting the task.
Confirm the file starts with `# QuickStark runtime run contract` and ends with `<!-- qs-runtime-run-contract:end -->`. If the host lacks usable read access or cannot locate this skill, report `Input required`. If the expected file is missing, unreadable, invalid, or resolves outside the owning tree, report `Failed`. Give `Status:`, `Skills used: /qs-create-verification-skill` and an `Outcome:` naming the owning package (qs-advanced) and prerequisite. Include `Specs: Not located` and a short `Work summary:` with `Finished —` and `Next —`. Write `Next work prompt: None — shared run contract unavailable.` Stop before task work. Emit no executable continuation, perform no repair, and use no alternate copy.
<!-- qs-runtime-end -->

Create only explicitly selected project-local verification assets. Do not change product behavior.

## Behavior

1. Discover repository conventions, existing harnesses, local skill locations, and permitted write scope.
2. If the required real harness or target behavior is unavailable, request the missing input before writing.
3. Define a host-neutral verification-driver interface: setup/launch, readiness/doctor, execute/drive, observe/capture evidence, compare, and clean up. Use stable user-facing selectors or commands from the real application.
4. Create a feature map recording feature identity, setup, action, observable result, checks, and evidence.
5. Make checks rerunnable, bounded, deterministic where practical, and safe after partial failure.
6. Run launch, doctor, one mapped feature end to end, evidence capture, and cleanup against real artifacts. Repeat the workflow to verify rerun safety; distinguish verification defects from product defects.
7. Clean only resources owned by this run, including failed-iteration residue. After cleanup, verify owned processes have stopped and captured evidence still exists at its named location. An unexecuted workflow remains a draft.

Use a declared local-skill convention when one exists; otherwise use a clearly named generic verification directory approved by the user. Never repair product source or automatically publish the assets.

## Internal capabilities

Load only the relevant private references for the current question and evidence. They stay inside this root and never authorize another public invocation.

- [decision-trail](../_shared/advanced/internal/decision-trail.md)
- [typescript-discipline](../_shared/advanced/internal/typescript-discipline.md)
- [plain-writing](../_shared/advanced/internal/plain-writing.md)
- [boundary-discipline](../_shared/advanced/internal/boundary-discipline.md)
- [rerunnable-tooling](../_shared/advanced/internal/rerunnable-tooling.md)
- [structural-enforcement](../_shared/advanced/internal/structural-enforcement.md)
- [minimal-change](../_shared/advanced/internal/minimal-change.md)
- [idempotent-operations](../_shared/advanced/internal/idempotent-operations.md)
- [type-system-discipline](../_shared/advanced/internal/type-system-discipline.md)

## Completion report and next steps

Apply the shared run contract. Report `Status:`, `Skills used: /qs-create-verification-skill`, and `Outcome:`.
Include `Specs:` and `Work summary:` with `Finished —` and `Next —`.
Include `Next work prompt:`. Use the exact available literal for the active host. Route entries list Codex, bare slash, and Pi spellings in that order.
Normal routes: `$qs-advanced:qs-maintain-verification-skill` / `/qs-maintain-verification-skill` / `/skill:qs-maintain-verification-skill`, `$qs-skills:qs-review-code` / `/qs-review-code` / `/skill:qs-review-code`, `$qs-skills:qs-git-merge` / `/qs-git-merge` / `/skill:qs-git-merge`.
Recovery routes: `$qs-skills:qs-code-debug` / `/qs-code-debug` / `/skill:qs-code-debug`, `$qs-skills:qs-review-code` / `/qs-review-code` / `/skill:qs-review-code`, `$qs-skills:qs-flow-handoff` / `/qs-flow-handoff` / `/skill:qs-flow-handoff`.
