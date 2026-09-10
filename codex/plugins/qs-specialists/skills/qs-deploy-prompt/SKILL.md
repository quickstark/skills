---
name: qs-deploy-prompt
description: "Generate one execution-ready goal prompt for autonomous feature delivery without executing it."
---

# Generate a deployment prompt

The bounded outcome is one self-contained, copy-ready execution prompt. Inspect the requested scope and verified project evidence read-only. Do not create or update a goal, execute selected workflows, edit product files, install skills, change permissions, publish, or deploy during generation.

## Resolve the inputs

1. Resolve the feature outcome, observable acceptance criteria, scope, exclusions, repository path, governing instructions and specifications, current branch/revision, and completed work evidence.
2. Resolve the documented deployment workflow and explicitly selected environment, artifact expectations, health checks, rollback procedure, and prerequisites. Identify credentials availability without reading or displaying secret values. Never invent a deployment target or infer production authorization from a staging request. Documentation of a rollback command establishes a recovery option, not permission to execute it. Include rollback execution only when the user already authorized that operation; otherwise preserve rollback readiness and request authority only if recovery becomes necessary.
3. Record the user's standing authorization as exact operations and targets: for example build in this repository, commit on this branch, push to this remote, merge this PR into this branch, and deploy to this environment. Preserve constraints and revocations. Generate no permissions the user has not granted.
4. Inspect registered workflow metadata and the host's actually available skills and goal tools. Use exact host literals (Codex $package:skill, Claude /skill-name, Pi /skill:skill-name). Catalog membership alone does not establish installation. Do not import other packages' skill bodies or silently install missing dependencies. This specialist can operate alone to diagnose missing prerequisites.
5. Preserve an explicitly supplied token budget; otherwise leave it unspecified. Do not change model, reasoning, sandbox, or approval settings.

Inspect available evidence before requesting input. Missing material scope, deployment target, authorization, required skills, credentials, or goal support produces Input required with the exact missing prerequisite. Do not present unresolved placeholders as an execution-ready prompt. Absence of goal tools is a real capability limitation, not permission to silently substitute ordinary execution.

## Select the stages

Choose only necessary, available public workflows. Use clarification for unresolved material decisions, roadmap for substantial sequencing, and specification for missing implementation requirements. Use qs-code-build for implementation with its owned review, repair and verification. Add a review or test specialist only for a distinct unmet requirement. Use qs-git-merge for authorized integration/publication and qs-deploy-release for the selected documented deployment.

For each selected stage record its exact skill literal, reason, artifact/revision-specific verification, required operations and targets. Preserve each selected root's actual output and mutation contract: a chat-only specification stays in the conversation and must not be assigned a fictional file path. Refer to newly produced artifacts only after they exist. Mark already-satisfied stages skipped with evidence; do not request a generic repeat review or validation. All selected skills must be available. Core-only projects can use core build verification without requiring optional testing specialists. Omit unrelated research, installation, or publication steps.

## Construct the sole execution prompt

Start with an explicit instruction to establish or resume the scoped goal through the host's real tools before any mutation or stage execution. Include the objective, exact repository and artifact references, acceptance criteria, exclusions, selected environment and documented workflow, authorized operations/targets, goal capability checks, ordered stages, verification evidence, recovery rules, and the shared conversation checklist. The prompt must stand alone in a fresh task; never rely on “the scope above.”

Include all of these execution rules in the generated prompt:

- Read actual goal state first. Resume a matching active goal; create one only when the host permits it and no unrelated active goal exists. Never replace an unrelated goal. Verify the tool result before claiming goal mode is active. Follow the host's own budget, cancellation, blocked-state and completion rules; do not invent a token budget or immediate blocked transition. Missing goal capability or conflicting goal stops before mutation.
- Submission explicitly authorizes this named sequence and the listed operations/targets. Each stage remains a separate public root with its own truthful completion report and authority boundary. The outer goal coordinator advances stages; no leaf automatically launches another root.
- Advance only after verified bounded completion. A Continuation required result advances only if its bounded outcome is verified and its requested next skill exactly matches the next authorized stage. Preserve the reported status. Do not advance on Failed, Input required, failed required checks, or actionable P0/P1 findings. Continue authorized repair and rechecking inside the active root; a separate recovery root must already be authorized or requires a decision.
- Carry standing authorization forward without repeat confirmations. Preserve host controls, protected branches, changed targets, revoked authority, and missing credentials as real boundaries. A changed artifact or revision reopens affected checks. Newly changed scope or targets need a decision before dependent work.
- Keep one conversation checklist with pending, active, verified, skipped, blocked, and failed stages. Only verified stages receive completed checkboxes. During long operations report the stage, observed progress or waiting state, and whether input is needed, aiming within sixty seconds when control returns. Running or elapsed time alone does not establish progress. Reopen invalidated evidence.
- Preserve per-root reports, but suppress redundant copy-ready continuation prompts for already-scheduled work. Record current revision, verified stages, pending work, authorization, and goal state for resumption. Before repeating a side effect, inspect remote state to avoid duplicate commits, publication, or deployment.
- Release remains terminal within its root. Configuration, a queued job, or a successful command is not a healthy deployment. Complete the goal only after all required stages pass and authoritative evidence identifies the deployed artifact/version, selected target, and health; summarize what changed, checks, and remaining work. Do not start speculative follow-up work.

The successful output contains exactly one fenced text execution prompt under Next work prompt. The initial goal instruction is intentional; this command's primary deliverable is not an ordinary single-skill continuation. Generation completion does not mean the goal ran. State “Prompt generated; execution has not started.” On missing input or failed readiness checks, report the blocker instead of an executable prompt; at most one eligible recovery prompt may be offered.

## Completion report and next steps

Keep a checklist in the conversation. During long operations, tell me the current stage, whether progress is continuing, and whether you need anything from me. Verify each completed stage. Finish with a short explanation of what was configured, which checks passed, and what remains.

Start with a concise checklist of meaningful stages; one stage is enough for a short task. Label stages pending, active, verified, skipped, blocked, or failed. Only verified stages receive completed checkboxes; explain skipped stages. Verify each stage against relevant artifacts, command results, sources, or observable behavior before checking it off. A failing required check prevents completion; reopen a verified stage when later evidence invalidates it.

During long operations, aim for updates within sixty seconds when the host allows control to return. State the current stage, observed progress or waiting state, and whether user input is needed. Distinguish a process that is running from confirmed progress; elapsed time alone proves neither progress nor completion. Finish with what changed or was configured, checks passed or failed, and remaining work. Read-only runs describe findings without implying mutations. Apply this contract regardless of effort or report mode; brief output may compress evidence but retains blockers and failed checks.
A user-submitted explicit goal workflow may coordinate successive authorized roots after verified completion. Each root retains its report and authority. Suppress redundant continuation prompts only for work already scheduled by that coordinator; ordinary invocations never start another public skill automatically.

This invocation has one root skill: `/qs-deploy-prompt`. Internal capabilities and bounded helpers stay inside this run and never appear as separately used skills. Present the result directly in chat and create no secondary result artifact or URL.

Normalize explicit flags first, then clear natural-language intent, then defaults. `effort=quick|standard|deep` controls evidence depth and defaults to `standard`; `report=brief|full` controls presentation and defaults to `brief`. Neither changes mutation authority.

Resolve governing work context from explicit input, referenced task history available in the host, repository specifications or ticket plans, and a verified tracker when configured. Do not treat completion of the current root as proof that the larger project is complete. Every result must include `Specs:` with clickable Markdown links to verified specifications; when none can be located, write `Specs: Not located` and never invent a link. Never omit `Specs:` or `Work summary:`.
Write `Work summary:` as a compact readout with `Finished —` naming the bounded outcome, meaningful validation, and material outputs, followed by `Next —` outlining up to three highest-priority verified pending or blocked tickets, specifications, issues, or grouped work items as `linked id — state — next action`. Group items only when they share the same state and next action. When no remaining item can be verified, write `Next — None verified after checking the linked specs, available task history, and tracker context.`

Use `complete`, `continuation-required`, `input-required`, or `failed`. The current root being `complete` does not prove that the larger project is complete. Emit at most one copy-ready next-work prompt when a distinct verified actionable item remains and an eligible route owns it. Failed required checks or actionable P0/P1 findings prohibit `complete`.

Eligible next routes: None — primary deliverable is the goal prompt. Failure routes: `/qs-plan-clarify`, `/qs-flow-handoff`. Select one route only when it owns unfinished work. Do not recommend a review, verification, planning, diagnosis, or implementation step already completed without new evidence that it must be repeated.

Before responding, apply the internal clear-writing pass: lead with the outcome, use concrete nouns and verbs, preserve necessary qualifications and technical terms, and remove repetition. It never appears as another skill, status, or continuation.

Brief output always contains status, outcome, specs, the compact work summary with Finished and Next entries, noteworthy failed checks, material outputs, and the Next work prompt label. Full adds the evidence trail, never more prompts. Omit empty optional sections and routine success detail; never omit the required readout fields.

Status: Complete | Continuation required | Input required | Failed
Skills used: /qs-deploy-prompt
Outcome: Concise verified result.
Specs: verified specification link(s) | Not located
Work summary:
- Finished — exact bounded outcome, meaningful validation, and material outputs
- Next — up to three linked pending or blocked items with state and next action | None verified after checking available sources
Next work prompt: None | one copy-ready prompt in a fenced `text` block

Always write `Next work prompt:`. On success, write exactly one fenced `text` block containing the execution prompt under Next work prompt: beginning with the instruction to establish or resume the scoped goal before mutations. Include exact selected skill literals, scope, evidence, authorization, stage checks and deployment evidence. This is the primary deliverable, not an ordinary continuation; emit no second prompt. State: Prompt generated; execution has not started. On missing material inputs, use Input required and do not emit an executable deployment prompt; at most one eligible recovery prompt is allowed ($qs-skills:qs-plan-clarify, $qs-skills:qs-flow-handoff); Claude uses `/qs-plan-clarify`, `/qs-flow-handoff`; Pi uses `/skill:qs-plan-clarify`, `/skill:qs-flow-handoff`. The fenced prompt is copy-ready only; plain skill Markdown cannot request or guarantee an Add action. Do not replace the fenced block with inline prose. Name the exact verified ticket, specification, issue, or grouped work item.
