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

Resolve governing specifications from explicit input, repository documentation, or a verified tracker. Every result includes `Specs:` with clickable Markdown links to verified specifications; when none can be located, write `Specs: Not located` and never invent a link. Include `Work summary:` with known done, pending, and blocked totals when available, then outline up to three highest-priority verified tickets, specifications, issues, or grouped work items as `linked id — state — next action`. Group items only when they share the same state and next action. Write `None identified against linked specs` only after verifying completion against those specs.

Use `complete`, `continuation-required`, `input-required`, or `failed`. This release command is terminal and emits no next prompts. Failed required checks or actionable P0/P1 findings prohibit `complete`.

Do not invent a follow-on workflow after release. State any release failure in this result.

Before responding, apply the internal clear-writing pass: lead with the outcome, use concrete nouns and verbs, preserve necessary qualifications and technical terms, and remove repetition. It never appears as another skill, status, or continuation.

Brief output contains status, outcome, up to three important findings or decisions, noteworthy failed checks, and material outputs. Full adds the evidence trail. Omit empty sections and routine success detail.

Status: Complete | Continuation required | Input required | Failed
Skills used: /qs-deploy-release
Outcome: Concise verified result.
Specs: verified specification link(s) | Not located
Work summary: verified totals and up to three linked items with state and next action
Next prompts: None — release is terminal.

Never add a speculative prompt merely to keep the workflow moving.
