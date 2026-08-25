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

This invocation has one root skill: `/qs-deploy-release`. Internal capabilities and bounded helpers stay inside this run and never appear as separately used skills. Present the result directly in chat and create no secondary result artifact or URL.

Normalize explicit flags first, then clear natural-language intent, then defaults. `effort=quick|standard|deep` controls evidence depth and defaults to `standard`; `report=brief|full` controls presentation and defaults to `brief`. Neither changes mutation authority.

Resolve governing work context from explicit input, referenced task history available in the host, repository specifications or ticket plans, and a verified tracker when configured. Do not treat completion of the current root as proof that the larger project is complete. Every result must include `Specs:` with clickable Markdown links to verified specifications; when none can be located, write `Specs: Not located` and never invent a link. Never omit `Specs:` or `Work summary:`.
Write `Work summary:` as a compact readout with `Finished —` naming the bounded outcome, meaningful validation, and material outputs, followed by `Next —` outlining up to three highest-priority verified pending or blocked tickets, specifications, issues, or grouped work items as `linked id — state — next action`. Group items only when they share the same state and next action. When no remaining item can be verified, write `Next — None verified after checking the linked specs, available task history, and tracker context.`

Use `complete`, `continuation-required`, `input-required`, or `failed`. This release command is terminal and emits no next prompts. Failed required checks or actionable P0/P1 findings prohibit `complete`.

Do not invent a follow-on workflow after release. State any release failure in this result.

Before responding, apply the internal clear-writing pass: lead with the outcome, use concrete nouns and verbs, preserve necessary qualifications and technical terms, and remove repetition. It never appears as another skill, status, or continuation.

Brief output contains status, outcome, up to three important findings or decisions, noteworthy failed checks, and material outputs. Full adds the evidence trail. Omit empty sections and routine success detail.

Status: Complete | Continuation required | Input required | Failed
Skills used: /qs-deploy-release
Outcome: Concise verified result.
Specs: verified specification link(s) | Not located
Work summary:
- Finished — exact bounded outcome, meaningful validation, and material outputs
- Next — up to three linked pending or blocked items with state and next action | None verified after checking available sources
Next prompts: None — release is terminal.

Never add a speculative prompt merely to keep the workflow moving.
