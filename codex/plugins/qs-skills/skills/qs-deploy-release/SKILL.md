---
name: qs-deploy-release
description: "Validate and execute an explicitly approved documented release or deployment."
---

# Deploy or release

Distinguish configuration, validation, actual execution, and independently verified deployment evidence. A configured target is not a deployed or healthy service.

Never invent a deployment target or external release workflow. Use only the project's verified documentation and explicitly selected environment.

## Gates

1. Confirm the exact artifact, version, environment, documented workflow, and requested execution boundary.
2. Inspect branch/commit publication, required checks, credentials availability without exposing secrets, the documented rollback path, and environmental prerequisites.
3. Run non-mutating validation first.
4. Obtain explicit confirmation for any destructive, externally visible, or production-changing step not already authorized.
5. Execute only the documented release/deployment steps.
6. Verify artifact availability, remote version/tag, marketplace or package surface, health checks, and rollback readiness from authoritative sources.

Failure before publication leaves the previous release available and must not be reported as deployed. End after the approved release outcome; do not start debugging or follow-up work automatically.

## Completion report and next steps

This invocation has one root skill: `/qs-deploy-release`. Internal capabilities and bounded helpers remain part of this run; never automatically invoke another public skill or create another skill report.

Normalize explicit flags first, then unambiguous natural-language intent, then defaults: `effort=quick|standard|deep` defaults to `standard`; `report=brief|full` defaults to `brief`. Effort changes evidence depth, not mutation scope or report length.

Produce one normalized result using `complete`, `continuation-required`, `input-required`, or `failed`. This release command is terminal and emits no next prompts. Failed required checks or actionable P0/P1 findings prohibit `complete`.

Do not invent a follow-on workflow after release. Report any release failure directly in this result.

Create a small JSON input with the actual root `skill`, `effort`, `report`, `completionState`, concise `outcome`, and only real decisions, findings, outputs, checks, execution evidence, and continuation. List only the root public skill in `skillsUsed`; internal capabilities are evidence, not skills used. Follow the shared policy in `docs/skill-run-contract.md`.

Render the one authenticated report:

```bash
node "<QuickStark root>/scripts/qs-skill-readout.mjs" render --require-hosted --input "<absolute-path-to-readout.json>"
```

Present only the independently accepted `https://reports.quickstark.com/` URL. If authentication or hosted publication fails, state `Readout: Not created — <actual reason>` and preserve any private recovery artifact without exposing its path, localhost, or a private-IP URL.

Brief in-chat output contains Status, Outcome, up to three important findings or decisions, noteworthy failed checks, material outputs, and Readout. Full adds the evidence trail. Omit empty sections and routine successful detail.

Status: Complete | Continuation required | Input required | Failed
Skills used: /qs-deploy-release
Outcome: Concise verified result.
Readout: Verified https://reports.quickstark.com/ report URL only.
Next prompts: None — release is terminal.

Never add a speculative prompt merely to keep the workflow moving.
