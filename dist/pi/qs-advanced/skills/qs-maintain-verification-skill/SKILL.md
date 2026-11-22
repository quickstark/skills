---
name: qs-maintain-verification-skill
description: "Reconcile an existing verification workflow with observed product behavior."
disable-model-invocation: true
---

# Maintain a verification workflow

<!-- qs-runtime-start -->
Before doing any task work, read [the shared run contract](../../capabilities/runtime/run-contract.md) relative to this invoked `SKILL.md`. Use the actual skill location supplied by the host to resolve it within the same package or canonical tree. Read through the end marker before selecting task tools, delegating, or acting. Then post the contract's initial checklist and progress update in the conversation before starting the task.
Confirm the file starts with `# QuickStark runtime run contract` and ends with `<!-- qs-runtime-run-contract:end -->`. If the host lacks usable read access or cannot locate this skill, report `Input required`. If the expected file is missing, unreadable, invalid, or resolves outside the owning tree, report `Failed`. Give `Status:`, `Skills used: /qs-maintain-verification-skill` and an `Outcome:` naming the owning package (qs-advanced) and prerequisite. Include `Specs: Not located` and a short `Work summary:` with `Finished —` and `Next —`. Write `Next work prompt: None — shared run contract unavailable.` Stop before task work. Emit no executable continuation, perform no repair, and use no alternate copy.
<!-- qs-runtime-end -->

Update only the explicitly selected verification assets; product behavior remains outside this command's mutation scope.

## Behavior

1. Discover the existing driver, feature map, harness, and repository conventions.
2. Run doctor before driving a new session and after a surprising failure; reset or relaunch a wedged state that doctor cannot detect. Execute current checks against real artifacts and classify drift as product, harness, feature-map, or environment drift.
3. Account for every mapped feature: exercise it, record a product failure, or report the attempted route and concrete unreachable prerequisite. An unreachable feature is not a passing behavior check.
4. Reconcile stale setup, actions, observables, and checks with verified current behavior. Re-drive every harness correction against the real target before accepting it.
5. Preserve still-valid coverage and make every operation rerunnable. Clean only owned resources after failed iterations and final driving; confirm captured evidence survives each cleanup at its named location.
6. Report product defects without repairing product source or rewriting the map to conceal a regression.

If no usable harness or verification workflow exists, stop with `input-required` or `continuation-required`; do not silently invent a host-specific replacement.

## Internal capabilities

Load only the relevant private references for the current question and evidence. They stay inside this root and never authorize another public invocation.

- [decision-trail](../../capabilities/advanced/internal/decision-trail.md)
- [typescript-discipline](../../capabilities/advanced/internal/typescript-discipline.md)
- [plain-writing](../../capabilities/advanced/internal/plain-writing.md)
- [boundary-discipline](../../capabilities/advanced/internal/boundary-discipline.md)
- [rerunnable-tooling](../../capabilities/advanced/internal/rerunnable-tooling.md)
- [structural-enforcement](../../capabilities/advanced/internal/structural-enforcement.md)
- [minimal-change](../../capabilities/advanced/internal/minimal-change.md)
- [idempotent-operations](../../capabilities/advanced/internal/idempotent-operations.md)
- [type-system-discipline](../../capabilities/advanced/internal/type-system-discipline.md)

## Completion report and next steps

Apply the shared run contract. Report `Status:`, `Skills used: /qs-maintain-verification-skill`, and `Outcome:`.
Include `Specs:` and `Work summary:` with `Finished —` and `Next —`.
Include `Next work prompt:`. Use the exact available literal for the active host. Route entries list Codex, bare slash, and Pi spellings in that order.
Normal routes: `$qs-skills:qs-review-code` / `/qs-review-code` / `/skill:qs-review-code`, `$qs-advanced:qs-create-verification-skill` / `/qs-create-verification-skill` / `/skill:qs-create-verification-skill`, `$qs-skills:qs-flow-handoff` / `/qs-flow-handoff` / `/skill:qs-flow-handoff`.
Recovery routes: `$qs-advanced:qs-create-verification-skill` / `/qs-create-verification-skill` / `/skill:qs-create-verification-skill`, `$qs-skills:qs-code-debug` / `/qs-code-debug` / `/skill:qs-code-debug`, `$qs-skills:qs-flow-handoff` / `/qs-flow-handoff` / `/skill:qs-flow-handoff`.
