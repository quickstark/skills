---
name: qs-why
description: "Explain why a behavior or design exists from attributable evidence."
---

# Explain why a behavior exists

Investigate one rationale question without treating chronology or correlation as intent.

## Behavior

1. Define the behavior, design choice, and competing explanations.
2. Gather current code, tests, specifications, decisions, and optionally selected history.
3. Label facts, supported inferences, alternatives, and uncertainty separately.
4. Attribute every material rationale claim to its evidence.
5. State when intent cannot be proven and identify the smallest missing source.

Issue trackers, chat, version history, and observability are optional adapters, never mandatory providers. This command is read-only and does not redesign or repair the behavior.

## Internal capabilities

Load only the relevant private references for the current question and evidence. They stay inside this root and never authorize another public invocation.

- [parallel-coverage](../../capabilities/advanced/internal/parallel-coverage.md)
- [typescript-discipline](../../capabilities/advanced/internal/typescript-discipline.md)
- [plain-writing](../../capabilities/advanced/internal/plain-writing.md)
- [context-discipline](../../capabilities/advanced/internal/context-discipline.md)
- [concurrency-ownership](../../capabilities/advanced/internal/concurrency-ownership.md)
- [type-system-discipline](../../capabilities/advanced/internal/type-system-discipline.md)

## Completion report and next steps

Keep a checklist in the conversation. Report the current stage and estimated stage and overall completion, whether progress is continuing, and whether you need anything from me. Verify each completed stage. Finish with a short explanation of what was configured, which checks passed, and what remains.

Start with a concise checklist of meaningful stages; one stage is enough for a short task. Label stages pending, active, verified, skipped, blocked, or failed. Only verified stages receive completed checkboxes; explain skipped stages. Verify each stage against relevant artifacts, command results, sources, or observable behavior before checking it off. A failing required check prevents completion; reopen a verified stage when later evidence invalidates it.

During long operations, aim for updates within sixty seconds when the host allows control to return. State the current stage, observed progress or waiting state, and whether user input is needed. Distinguish a process that is running from confirmed progress; elapsed time alone proves neither progress nor completion. Finish with what changed or was configured, checks passed or failed, and remaining work. Read-only runs describe findings without implying mutations. Apply this contract regardless of effort or report mode; brief output may compress evidence but retains blockers and failed checks.

Report at task start, meaningful stage transitions, material progress changes, blockers, resumption, and completion. Use: `Stage: <name> | Stage estimate: ~<N>% | Overall estimate: ~<N>% | <state> — <observed progress or waiting>. Input needed: <none or exact need>`. Overall means the bounded root task for a standalone skill, or the entire authorized goal for a submitted multi-stage workflow. Within a goal, label a root's own completion separately; finishing one root does not make the goal 100% complete.

Assign meaningful stages approximate effort weights at the start and compute overall progress as sum(weight × stage estimate) / sum(in-scope weights). Base stage estimates on verified milestones, observed partial work, and remaining effort; checklist item counts, elapsed time, token consumption, or a running process alone are not progress. Use coarse estimates without decimal precision and explain low confidence. Keep weights stable unless evidence changes the work breakdown; explain recalibration, added work, reopened checks, and any decrease. Explain skipped stages: remove out-of-scope work from the denominator without awarding credit, and credit previously satisfied in-scope work only with current verification evidence; a skipped label alone earns nothing. Helpers contribute evidence to their parent's estimate without separate public reports or double-counting.

Keep the last defensible estimate while waiting or blocked unless evidence changes it; state the required input or external event. Preserve the scope, weights, estimates, and supporting revision/evidence for resumption; reuse only still-valid evidence and reopen invalidated checks. Never reset valid progress or count resumed work twice. Reserve stage 100% for verified stage completion and overall 100% for verified completion of the whole stated scope. Cap unverified estimates at 95% when rounding to coarse values so rounding cannot imply completion. Failed required checks, unresolved acceptance criteria, or actionable P0/P1 findings prohibit completion regardless of the estimate. Percentages never override status or verification gates.
A user-submitted explicit goal workflow may coordinate successive authorized roots after verified completion. Each root retains its report and authority. Suppress redundant continuation prompts only for work already scheduled by that coordinator; ordinary invocations never start another public skill automatically.

This invocation has one root skill: `/qs-why`. Internal capabilities and bounded helpers stay inside this run and never appear as separately used skills. Present the result directly in chat and create no secondary result artifact or URL.

Normalize explicit flags first, then clear natural-language intent, then defaults. `effort=quick|standard|deep` controls evidence depth and defaults to `standard`; `report=brief|full` controls presentation and defaults to `brief`. Neither changes mutation authority.

Use `complete`, `continuation-required`, `input-required`, or `failed`. The current root being `complete` does not prove that the larger project is complete. Emit at most one copy-ready next-work prompt when a distinct verified actionable item remains and an eligible route owns it. Failed required checks or actionable P0/P1 findings prohibit `complete`.

Eligible next routes: `/qs-plan-clarify`, `/qs-how`, `/qs-blast-radius`. Failure routes: `/qs-plan-clarify`, `/qs-flow-handoff`, `/qs-how`. Select one route only when it owns unfinished work. Do not recommend a review, verification, planning, diagnosis, or implementation step already completed without new evidence that it must be repeated.

Before responding, apply the internal clear-writing pass: lead with the outcome, use concrete nouns and verbs, preserve necessary qualifications and technical terms, and remove repetition. It never appears as another skill, status, or continuation.

Brief output always contains status, outcome, noteworthy failed checks, material outputs, and the Next work prompt label. Full adds the evidence trail, never more prompts. Omit empty optional sections and routine success detail; never omit the required result fields.

Status: Complete | Continuation required | Input required | Failed
Skills used: /qs-why
Outcome: Concise verified result.
Next work prompt: None | one copy-ready prompt in a fenced `text` block

Always write `Next work prompt:`. When a distinct verified actionable item exists, put one fenced `text` block beneath it beginning with its exact Codex literal ($qs-skills:qs-plan-clarify, $qs-advanced:qs-how, $qs-advanced:qs-blast-radius, $qs-skills:qs-flow-handoff); Claude uses `/qs-plan-clarify`, `/qs-how`, `/qs-blast-radius`, `/qs-flow-handoff`; Pi uses `/skill:qs-plan-clarify`, `/skill:qs-how`, `/skill:qs-blast-radius`, `/skill:qs-flow-handoff`. Name the exact verified ticket, specification, issue, or grouped work item it advances and carry forward only decisive evidence. Do not replace the fenced block with inline prose, a bare command, or a link. Only when no eligible actionable item remains, write `Next work prompt: None — no follow-on needed.` The fenced prompt is copy-ready only; plain skill Markdown cannot request or guarantee an Add action. Keep model guidance outside the fence and never change the active model or reasoning setting.
