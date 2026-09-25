---
name: qs-help
description: "Choose one bounded QuickStark workflow from the v3 core or optional specialists."
---

# QuickStark help

Inspect the request and available project evidence, then recommend the single best root command. Do not execute it automatically.

## Core commands

| Order | Command | Use when |
| ---: | --- | --- |
| 10 | `/qs-help` | The correct workflow is unclear. |
| 20 | `/qs-setup` | A project needs QuickStark configuration or verification. |
| 30 | `/qs-plan-clarify` | Ambiguity, scope, constraints, or decisions remain. |
| 40 | `/qs-plan-roadmap` | Confirmed outcomes need sequencing across phases. |
| 50 | `/qs-plan-spec` | Confirmed work needs an actionable spec or dependency-aware tickets. |
| 60 | `/qs-code-build` | A scoped change is ready to implement. |
| 70 | `/qs-code-debug` | A reproducible defect needs diagnosis and repair. |
| 80 | `/qs-review-code` | Code or a change needs review, scoped improvement, or refactoring. |
| 90 | `/qs-git-merge` | Selected changes need safe Git integration or publication. |
| 100 | `/qs-deploy-release` | A documented release or deployment is explicitly requested. |
| 110 | `/qs-flow-triage` | Incoming work needs one bounded route. |
| 120 | `/qs-flow-handoff` | Verified state must be transferred. |

## Optional specialists

`/qs-plan-research`, `/qs-design-prototype`, `/qs-code-document`, `/qs-test-author`, `/qs-test-verify`, `/qs-learn-teach`, `/qs-skill-write`, and `/qs-deploy-prompt` are independently installable in `qs-specialists`. Core workflows do not require them.

## Routing rules

- Prefer the command whose primary outcome matches the request, not an intermediate technique.
- Refactoring belongs to `/qs-review-code` with `action=refactor` and a narrow selected target. Whole-codebase refactoring starts with a bounded read-only review.
- Adding or improving tests for already-established behavior belongs to `/qs-test-author`; executing and reporting a read-only verification matrix belongs to `/qs-test-verify`.
- Test-driven development is internal to `/qs-code-build`, not a command.
- Domain modeling, module decomposition, and ticket decomposition are internal planning or implementation capabilities.
- Choose one primary route from the registered public catalog; primary Help routing is not limited to another workflow's continuation list. Use the registry's exact literal for the active host.
- Verify that the selected command is actually available before emitting its one copy-ready prompt. Catalog membership alone does not prove installation. For an unavailable optional capability, report the specific installation prerequisite; do not invent an executable prompt or install it automatically.
- Keep discovery read-only. Describe optional capabilities from metadata without loading or invoking their public bodies. Preserve distinct prompt-authoring and visual-parity outcomes when they are available.

## Completion report and next steps

Keep a checklist in the conversation. Report the current stage and estimated stage and overall completion, whether progress is continuing, and whether you need anything from me. Verify each completed stage. Finish with a short explanation of what was configured, which checks passed, and what remains.

Start with a concise checklist of meaningful stages; one stage is enough for a short task. Label stages pending, active, verified, skipped, blocked, or failed. Only verified stages receive completed checkboxes; explain skipped stages. Verify each stage against relevant artifacts, command results, sources, or observable behavior before checking it off. A failing required check prevents completion; reopen a verified stage when later evidence invalidates it.

During long operations, aim for updates within sixty seconds when the host allows control to return. State the current stage, observed progress or waiting state, and whether user input is needed. Distinguish a process that is running from confirmed progress; elapsed time alone proves neither progress nor completion. Finish with what changed or was configured, checks passed or failed, and remaining work. Read-only runs describe findings without implying mutations. Apply this contract regardless of effort or report mode; brief output may compress evidence but retains blockers and failed checks.

Report at task start, meaningful stage transitions, material progress changes, blockers, resumption, and completion. Use: `Stage: <name> | Stage estimate: ~<N>% | Overall estimate: ~<N>% | <state> — <observed progress or waiting>. Input needed: <none or exact need>`. Overall means the bounded root task for a standalone skill, or the entire authorized goal for a submitted multi-stage workflow. Within a goal, label a root's own completion separately; finishing one root does not make the goal 100% complete.

Assign meaningful stages approximate effort weights at the start and compute overall progress as sum(weight × stage estimate) / sum(in-scope weights). Base stage estimates on verified milestones, observed partial work, and remaining effort; checklist item counts, elapsed time, token consumption, or a running process alone are not progress. Use coarse estimates without decimal precision and explain low confidence. Keep weights stable unless evidence changes the work breakdown; explain recalibration, added work, reopened checks, and any decrease. Explain skipped stages: remove out-of-scope work from the denominator without awarding credit, and credit previously satisfied in-scope work only with current verification evidence; a skipped label alone earns nothing. Helpers contribute evidence to their parent's estimate without separate public reports or double-counting.

Keep the last defensible estimate while waiting or blocked unless evidence changes it; state the required input or external event. Preserve the scope, weights, estimates, and supporting revision/evidence for resumption; reuse only still-valid evidence and reopen invalidated checks. Never reset valid progress or count resumed work twice. Reserve stage 100% for verified stage completion and overall 100% for verified completion of the whole stated scope. Cap unverified estimates at 95% when rounding to coarse values so rounding cannot imply completion. Failed required checks, unresolved acceptance criteria, or actionable P0/P1 findings prohibit completion regardless of the estimate. Percentages never override status or verification gates.
A user-submitted explicit goal workflow may coordinate successive authorized roots after verified completion. Each root retains its report and authority. Suppress redundant continuation prompts only for work already scheduled by that coordinator; ordinary invocations never start another public skill automatically.

This invocation has one root skill: `/qs-help`. Internal capabilities and bounded helpers stay inside this run and never appear as separately used skills. Present the result directly in chat and create no secondary result artifact or URL.

Normalize explicit flags first, then clear natural-language intent, then defaults. `effort=quick|standard|deep` controls evidence depth and defaults to `standard`; `report=brief|full` controls presentation and defaults to `brief`. Neither changes mutation authority.

Use `complete`, `continuation-required`, `input-required`, or `failed`. The current root being `complete` does not prove that the larger project is complete. Emit at most one copy-ready next-work prompt when a distinct verified actionable item remains and an eligible route owns it. Failed required checks or actionable P0/P1 findings prohibit `complete`.

Primary Help routing may select any actually available registered public root. Read [ROUTING.md](ROUTING.md) for registry-generated descriptions and exact Codex/Claude/Pi literals; verify the selected literal in the active host before emitting it. This primary recommendation is separate from ordinary continuation eligibility. Ordinary continuation routes: `/qs-plan-clarify`, `/qs-flow-triage`, `/qs-setup`. Failure routes: `/qs-plan-clarify`, `/qs-flow-triage`, `/qs-setup`. Emit at most one prompt overall and never execute the selected root or install a missing package. Do not recommend a review, verification, planning, diagnosis, or implementation step already completed without new evidence that it must be repeated.

Before responding, apply the internal clear-writing pass: lead with the outcome, use concrete nouns and verbs, preserve necessary qualifications and technical terms, and remove repetition. It never appears as another skill, status, or continuation.

Brief output always contains status, outcome, noteworthy failed checks, material outputs, and the Next work prompt label. Full adds the evidence trail, never more prompts. Omit empty optional sections and routine success detail; never omit the required result fields.

Status: Complete | Continuation required | Input required | Failed
Skills used: /qs-help
Outcome: Concise verified result.
Next work prompt: None | one copy-ready prompt in a fenced `text` block

Always write `Next work prompt:`. For one verified actionable request and an available primary destination, put exactly one fenced `text` block beneath it beginning with the destination's exact installed literal from [ROUTING.md](ROUTING.md). Name the requested work and carry forward only decisive evidence. Do not replace the fenced block with inline prose, a bare command, or a link. A missing or unverified destination produces Input required with its precise package/discovery prerequisite and no executable prompt for that destination; do not claim no follow-on is needed. When there is no verified remaining actionable work, write `Next work prompt: None — no follow-on needed.` Ordinary continuation literals also require verified availability: Codex $qs-skills:qs-plan-clarify, $qs-skills:qs-flow-triage, $qs-skills:qs-setup; Claude uses `/qs-plan-clarify`, `/qs-flow-triage`, `/qs-setup`; Pi uses `/skill:qs-plan-clarify`, `/skill:qs-flow-triage`, `/skill:qs-setup`. The fenced prompt is copy-ready only; plain skill Markdown cannot request or guarantee an Add action. Keep model guidance outside the fence and never change the active model or reasoning setting.
