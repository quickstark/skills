---
name: qs-code-debug
description: "Diagnose and repair one reproducible defect before changing behavior."
---

# Debug a defect

Preserve diagnosis-first behavior. Do not guess at a fix before obtaining evidence.

## Behavior

1. Capture the observed failure, expected behavior, environment, and reproduction.
2. Reduce the failure to the smallest reliable reproducer.
3. Trace inputs and state across the relevant boundary until the causal mechanism is supported by evidence.
4. Add a regression test at the most stable seam when practical.
5. Apply the smallest coherent repair.
6. Re-run the reproducer, focused regression checks, and relevant wider validation.

Repair the causal mechanism rather than only suppressing its visible symptom. When performance is involved, establish a measurement baseline and falsify competing explanations before changing behavior.

Diagnosis, repair, regression coverage, and validation are one owned outcome. Do not stop after identifying the cause when the requested scope authorizes the repair. Continue through the smallest coherent fix, review the resulting diff, and rerun the reproducer plus relevant wider checks until they pass or a concrete external blocker remains.

Do not return `continuation-required` merely to ask another public skill to implement, review, test, or validate the diagnosed repair. Use that status only when a genuinely distinct workflow or separately authorized scope remains.

If reproduction is impossible, report the missing evidence and one concrete input request. Do not convert an unverified hypothesis into a completed fix or broaden into architecture improvement automatically.

## Completion report and next steps

This invocation has one root skill: `/qs-code-debug`. Internal capabilities and bounded helpers stay inside this run and never appear as separately used skills. Present the result directly in chat and create no secondary result artifact or URL.

Normalize explicit flags first, then clear natural-language intent, then defaults. `effort=quick|standard|deep` controls evidence depth and defaults to `standard`; `report=brief|full` controls presentation and defaults to `brief`. Neither changes mutation authority.

Resolve governing work context from explicit input, referenced task history available in the host, repository specifications or ticket plans, and a verified tracker when configured. Do not treat completion of the current root as proof that the larger project is complete. Every result must include `Specs:` with clickable Markdown links to verified specifications; when none can be located, write `Specs: Not located` and never invent a link. Never omit `Specs:` or `Work summary:`.
Write `Work summary:` as a compact readout with `Finished —` naming the bounded outcome, meaningful validation, and material outputs, followed by `Next —` outlining up to three highest-priority verified pending or blocked tickets, specifications, issues, or grouped work items as `linked id — state — next action`. Group items only when they share the same state and next action. When no remaining item can be verified, write `Next — None verified after checking the linked specs, available task history, and tracker context.`

Use `complete`, `continuation-required`, `input-required`, or `failed`. The current root being `complete` does not prove that the larger project is complete. Emit at most one copy-ready next-work prompt when a distinct verified actionable item remains and an eligible route owns it. Failed required checks or actionable P0/P1 findings prohibit `complete`.

Eligible next routes: `/qs-git-merge`, `/qs-code-build`. Failure routes: `/qs-flow-handoff`. Select one route only when it owns unfinished work. Do not recommend a review, verification, planning, diagnosis, or implementation step already completed without new evidence that it must be repeated.

Before responding, apply the internal clear-writing pass: lead with the outcome, use concrete nouns and verbs, preserve necessary qualifications and technical terms, and remove repetition. It never appears as another skill, status, or continuation.

Brief output always contains status, outcome, specs, the compact work summary with Finished and Next entries, noteworthy failed checks, material outputs, and the Next work prompt label. Full adds the evidence trail, never more prompts. Omit empty optional sections and routine success detail; never omit the required readout fields.

Status: Complete | Continuation required | Input required | Failed
Skills used: /qs-code-debug
Outcome: Concise verified result.
Specs: verified specification link(s) | Not located
Work summary:
- Finished — exact bounded outcome, meaningful validation, and material outputs
- Next — up to three linked pending or blocked items with state and next action | None verified after checking available sources
Next work prompt: None | one copy-ready prompt in a fenced `text` block

Always write `Next work prompt:`. When a distinct verified actionable item exists, put one fenced `text` block beneath it beginning with its exact Codex literal ($qs-skills:qs-git-merge, $qs-skills:qs-code-build, $qs-skills:qs-flow-handoff); Claude uses `/qs-git-merge`, `/qs-code-build`, `/qs-flow-handoff`; Pi uses `/skill:qs-git-merge`, `/skill:qs-code-build`, `/skill:qs-flow-handoff`. Name the exact verified ticket, specification, issue, or grouped work item it advances and carry forward only decisive evidence. Do not replace the fenced block with inline prose, a bare command, or a link. When `Next` lists a pending or blocked actionable item and an eligible route owns it, the fenced `text` prompt is required even when the current root is complete. Only when no eligible actionable item remains, write `Next work prompt: None — no follow-on needed.` The fenced prompt is copy-ready only; plain skill Markdown cannot request or guarantee an Add action. Keep model guidance outside the fence and never change the active model or reasoning setting.
