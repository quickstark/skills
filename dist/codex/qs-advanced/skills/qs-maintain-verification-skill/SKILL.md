---
name: qs-maintain-verification-skill
description: "Reconcile an existing verification workflow with observed product behavior."
---

# Maintain a verification workflow

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

Keep a checklist in the conversation. Report the current stage and estimated stage and overall completion, whether progress is continuing, and whether you need anything from me. Verify each completed stage. Finish with a short explanation of what was configured, which checks passed, and what remains.

Start with a concise checklist of meaningful stages; one stage is enough for a short task. Label stages pending, active, verified, skipped, blocked, or failed. Only verified stages receive completed checkboxes; explain skipped stages. Verify each stage against relevant artifacts, command results, sources, or observable behavior before checking it off. A failing required check prevents completion; reopen a verified stage when later evidence invalidates it.

During long operations, aim for updates within sixty seconds when the host allows control to return. State the current stage, observed progress or waiting state, and whether user input is needed. Distinguish a process that is running from confirmed progress; elapsed time alone proves neither progress nor completion. Finish with what changed or was configured, checks passed or failed, and remaining work. Read-only runs describe findings without implying mutations. Apply this contract regardless of effort or report mode; brief output may compress evidence but retains blockers and failed checks.

Report at task start, meaningful stage transitions, material progress changes, blockers, resumption, and completion. Use: `Stage: <name> | Stage estimate: ~<N>% | Overall estimate: ~<N>% | <state> — <observed progress or waiting>. Input needed: <none or exact need>`. Overall means the bounded root task for a standalone skill, or the entire authorized goal for a submitted multi-stage workflow. Within a goal, label a root's own completion separately; finishing one root does not make the goal 100% complete.

Assign meaningful stages approximate effort weights at the start and compute overall progress as sum(weight × stage estimate) / sum(in-scope weights). Base stage estimates on verified milestones, observed partial work, and remaining effort; checklist item counts, elapsed time, token consumption, or a running process alone are not progress. Use coarse estimates without decimal precision and explain low confidence. Keep weights stable unless evidence changes the work breakdown; explain recalibration, added work, reopened checks, and any decrease. Explain skipped stages: remove out-of-scope work from the denominator without awarding credit, and credit previously satisfied in-scope work only with current verification evidence; a skipped label alone earns nothing. Helpers contribute evidence to their parent's estimate without separate public reports or double-counting.

Keep the last defensible estimate while waiting or blocked unless evidence changes it; state the required input or external event. Preserve the scope, weights, estimates, and supporting revision/evidence for resumption; reuse only still-valid evidence and reopen invalidated checks. Never reset valid progress or count resumed work twice. Reserve stage 100% for verified stage completion and overall 100% for verified completion of the whole stated scope. Cap unverified estimates at 95% when rounding to coarse values so rounding cannot imply completion. Failed required checks, unresolved acceptance criteria, or actionable P0/P1 findings prohibit completion regardless of the estimate. Percentages never override status or verification gates.
A user-submitted explicit goal workflow may coordinate successive authorized roots after verified completion. Each root retains its report and authority. Suppress redundant continuation prompts only for work already scheduled by that coordinator; ordinary invocations never start another public skill automatically.

This invocation has one root skill: `/qs-maintain-verification-skill`. Internal capabilities and bounded helpers stay inside this run and never appear as separately used skills. Present the result directly in chat and create no secondary result artifact or URL.

Normalize explicit flags first, then clear natural-language intent, then defaults. `effort=quick|standard|deep` controls evidence depth and defaults to `standard`; `report=brief|full` controls presentation and defaults to `brief`. Neither changes mutation authority.

Resolve governing work context from explicit input, referenced task history available in the host, repository specifications or ticket plans, and a verified tracker when configured. Do not treat completion of the current root as proof that the larger project is complete. Every result must include `Specs:` with clickable Markdown links to verified specifications; when none can be located, write `Specs: Not located` and never invent a link. Never omit `Specs:` or `Work summary:`.
Write `Work summary:` as a compact readout with `Finished —` naming the bounded outcome, meaningful validation, and material outputs, followed by `Next —` outlining up to three highest-priority verified pending or blocked tickets, specifications, issues, or grouped work items as `linked id — state — next action`. Group items only when they share the same state and next action. When no remaining item can be verified, write `Next — None verified after checking the linked specs, available task history, and tracker context.`

Use `complete`, `continuation-required`, `input-required`, or `failed`. The current root being `complete` does not prove that the larger project is complete. Emit at most one copy-ready next-work prompt when a distinct verified actionable item remains and an eligible route owns it. Failed required checks or actionable P0/P1 findings prohibit `complete`.

Eligible next routes: `/qs-review-code`, `/qs-create-verification-skill`, `/qs-flow-handoff`. Failure routes: `/qs-create-verification-skill`, `/qs-code-debug`, `/qs-flow-handoff`. Select one route only when it owns unfinished work. Do not recommend a review, verification, planning, diagnosis, or implementation step already completed without new evidence that it must be repeated.

Before responding, apply the internal clear-writing pass: lead with the outcome, use concrete nouns and verbs, preserve necessary qualifications and technical terms, and remove repetition. It never appears as another skill, status, or continuation.

Brief output always contains status, outcome, specs, the compact work summary with Finished and Next entries, noteworthy failed checks, material outputs, and the Next work prompt label. Full adds the evidence trail, never more prompts. Omit empty optional sections and routine success detail; never omit the required readout fields.

Status: Complete | Continuation required | Input required | Failed
Skills used: /qs-maintain-verification-skill
Outcome: Concise verified result.
Specs: verified specification link(s) | Not located
Work summary:
- Finished — exact bounded outcome, meaningful validation, and material outputs
- Next — up to three linked pending or blocked items with state and next action | None verified after checking available sources
Next work prompt: None | one copy-ready prompt in a fenced `text` block

Always write `Next work prompt:`. When a distinct verified actionable item exists, put one fenced `text` block beneath it beginning with its exact Codex literal ($qs-skills:qs-review-code, $qs-advanced:qs-create-verification-skill, $qs-skills:qs-flow-handoff, $qs-skills:qs-code-debug); Claude uses `/qs-review-code`, `/qs-create-verification-skill`, `/qs-flow-handoff`, `/qs-code-debug`; Pi uses `/skill:qs-review-code`, `/skill:qs-create-verification-skill`, `/skill:qs-flow-handoff`, `/skill:qs-code-debug`. Name the exact verified ticket, specification, issue, or grouped work item it advances and carry forward only decisive evidence. Do not replace the fenced block with inline prose, a bare command, or a link. When `Next` lists a pending or blocked actionable item and an eligible route owns it, the fenced `text` prompt is required even when the current root is complete. Only when no eligible actionable item remains, write `Next work prompt: None — no follow-on needed.` The fenced prompt is copy-ready only; plain skill Markdown cannot request or guarantee an Add action. Keep model guidance outside the fence and never change the active model or reasoning setting.
