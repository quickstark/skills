---
name: qs-design-image-to-code
description: "Implement an authoritative design reference"
---

# Implement an authoritative design reference

<!-- qs-runtime-start -->
Before doing any task work, read [the shared run contract](../../capabilities/runtime/run-contract.md) relative to this invoked `SKILL.md`. Use the actual skill location supplied by the host to resolve it within the same package or canonical tree. Read through the end marker before selecting task tools, delegating, or acting. Then post the contract's initial checklist and progress update in the conversation before starting the task.
Confirm the file starts with `# QuickStark runtime run contract` and ends with `<!-- qs-runtime-run-contract:end -->`. If the host lacks usable read access or cannot locate this skill, report `Input required`. If the expected file is missing, unreadable, invalid, or resolves outside the owning tree, report `Failed`. Give `Status:`, `Skills used: /qs-design-image-to-code` and an `Outcome:` naming the owning package (qs-frontend) and prerequisite. Include `Specs: Not located` and a short `Work summary:` with `Finished —` and `Next —`. Write `Next work prompt: None — shared run contract unavailable.` Stop before task work. Emit no executable continuation, perform no repair, and use no alternate copy.
<!-- qs-runtime-end -->

Turn the selected image or design reference into responsive working frontend code.
Inspect the supplied reference and preserve it as the source of truth. Never
regenerate, replace, crop or restyle a supplied parity target to make matching easier.
Generate a new design only when design generation is part of the authorized task;
use private prompt construction rather than invoking an image skill.

Recover the [shared brief](../../capabilities/frontend/internal/brief.md) and read
[implementation](../../capabilities/frontend/internal/implementation.md). Use
[prompt construction](../../capabilities/frontend/internal/prompt-construction.md) and
[design direction](../../capabilities/frontend/internal/design-direction.md) only when creating
a new design is in scope. Preserve brand, real content, stable IDs, routes, analytics,
integrations and behavior unless their change was requested.

Extract layout, type, spacing, color, assets and interaction/state requirements,
then implement within the existing stack. Verify actual narrow/wide layouts,
keyboard behavior, focus, reduced motion and required states. Exact parity requires
a frozen baseline, declared coverage/environment and repository or user-approved
tolerance before implementation edits; a subjective visual pass is insufficient.
Keep the dedicated QS visual-parity workflow available as a distinct outcome,
without automatically invoking it or another public root. Report missing references
or capabilities honestly; do not invent an image or tested result.

## Completion report and next steps

Apply the shared run contract. Report `Status:`, `Skills used: /qs-design-image-to-code`, and `Outcome:`.
Include `Specs:` and `Work summary:` with `Finished —` and `Next —`.
Include `Next work prompt:`. Use the exact available literal for the active host. Route entries list Codex, bare slash, and Pi spellings in that order.
Normal routes: `$qs-skills:qs-flow-handoff` / `/qs-flow-handoff` / `/skill:qs-flow-handoff`.
Recovery routes: `$qs-skills:qs-flow-handoff` / `/qs-flow-handoff` / `/skill:qs-flow-handoff`.
