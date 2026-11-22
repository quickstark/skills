---
name: qs-deploy-release
description: "Validate and execute an explicitly approved documented release or deployment."
disable-model-invocation: true
---

# Deploy or release

<!-- qs-runtime-start -->
Before doing any task work, read [the shared run contract](../../capabilities/runtime/run-contract.md) relative to this invoked `SKILL.md`. Use the actual skill location supplied by the host to resolve it within the same package or canonical tree. Read through the end marker before selecting task tools, delegating, or acting. Then post the contract's initial checklist and progress update in the conversation before starting the task.
Confirm the file starts with `# QuickStark runtime run contract` and ends with `<!-- qs-runtime-run-contract:end -->`. If the host lacks usable read access or cannot locate this skill, report `Input required`. If the expected file is missing, unreadable, invalid, or resolves outside the owning tree, report `Failed`. Give `Status:`, `Skills used: /qs-deploy-release` and an `Outcome:` naming the owning package (qs-skills) and prerequisite. Include `Specs: Not located` and a short `Work summary:` with `Finished —` and `Next —`. Stop before task work. Emit no executable continuation, perform no repair, and use no alternate copy.
<!-- qs-runtime-end -->

Distinguish configuration, validation, actual execution, and independently verified deployment evidence. A configured target is not a deployed or healthy service.

Never invent a deployment target or external release workflow. Use only the project's verified documentation and explicitly selected environment.

## Gates

1. Confirm the exact artifact, version, environment, documented workflow, and requested execution boundary.
2. Inspect branch/commit publication, required checks, credentials availability without exposing secrets, the documented rollback path, and environmental prerequisites.
3. Run non-mutating validation first.
4. Obtain explicit confirmation for any destructive, externally visible, or production-changing step not already authorized.
5. Execute only the documented release/deployment steps.
6. Verify artifact availability, remote version/tag, marketplace or package surface, health checks, and rollback readiness from authoritative sources.

Distinguish failure before publication from partial publication or deployment. Inspect authoritative remote state and report the actual artifact/version, affected target, remaining checks and next permitted recovery action; do not assume the previous release is untouched after a partial operation. Rollback readiness is not authority to execute rollback. End after the approved release outcome; do not start debugging or follow-up work automatically.

## Completion report and next steps

Apply the shared run contract. Report `Status:`, `Skills used: /qs-deploy-release`, and `Outcome:`.
Include `Specs:` and `Work summary:` with `Finished —` and `Next —`.
Release is terminal. Report the release result. Next prompts: None.
