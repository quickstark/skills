---
name: qs-code-build
description: "Implement one scoped change with an evidence-based test and validation strategy."
disable-model-invocation: true
---

# Build a scoped change

Implement the requested specification, ticket, or bounded change. Preserve unrelated work and do not expand the mutation scope silently.

## Test strategy

Before editing, choose one strategy from actual evidence:

- Use the internal TDD loop when behavior has a stable, meaningful test seam.
- Add characterization coverage before changing insufficiently protected existing behavior.
- Use a credible alternative validation strategy when test-first work is impractical; record why and never manufacture a failing test.

Use internal module decomposition only when it improves the selected implementation boundary. Neither capability creates a nested run or report.

## Behavior

1. Confirm scope, governing requirements, repository instructions, and existing dirty state.
2. Locate the smallest coherent implementation seam.
3. Implement incrementally and run focused checks regularly.
4. Keep behavior, tests, configuration, and required documentation synchronized.
5. Run the relevant full validation once the scoped change is complete.
6. Inspect the final diff for scope, correctness, secrets, and unrelated files.

Sequence work into independently verifiable units. Exercise the real artifact or caller path when feasible, migrate affected callers before deleting a legacy interface, and preserve enough evidence that another session can resume without reconstructing hidden state.

Finish every in-scope acceptance requirement authorized by the request. After implementation, review and repair the resulting diff inside this root, run the focused and required wider checks, and repeat the repair-and-check loop until the requirements pass or a concrete external blocker remains. Do not stop at a partial implementation merely because another public review, debug, or test skill could continue it.

Do not return `continuation-required` merely to ask another public skill to perform implementation, review, repair, testing, or validation that belongs to this scoped build. Use that status only when a genuinely distinct workflow or separately authorized scope remains.

Do not automatically invoke review, Git, deployment, or another public skill. Do not commit or publish unless the user included that authority in the request.

## Completion report and next steps

This invocation has one root skill: `/qs-code-build`. Internal capabilities and bounded helpers stay inside this run and never appear as separately used skills. Present the result directly in chat and create no secondary result artifact or URL.

Normalize explicit flags first, then clear natural-language intent, then defaults. `effort=quick|standard|deep` controls evidence depth and defaults to `standard`; `report=brief|full` controls presentation and defaults to `brief`. Neither changes mutation authority.

Resolve governing work context from explicit input, referenced task history available in the host, repository specifications or ticket plans, and a verified tracker when configured. Do not treat completion of the current root as proof that the larger project is complete. Every result must include `Specs:` with clickable Markdown links to verified specifications; when none can be located, write `Specs: Not located` and never invent a link. Never omit `Specs:` or `Work summary:`.
Write `Work summary:` as a compact readout with `Finished —` naming the bounded outcome, meaningful validation, and material outputs, followed by `Next —` outlining up to three highest-priority verified pending or blocked tickets, specifications, issues, or grouped work items as `linked id — state — next action`. Group items only when they share the same state and next action. When no remaining item can be verified, write `Next — None verified after checking the linked specs, available task history, and tracker context.`

Use `complete`, `continuation-required`, `input-required`, or `failed`. The current root being `complete` does not prove that the larger project is complete. Emit at most one copy-ready next-work prompt when a distinct verified actionable item remains and an eligible route owns it. Failed required checks or actionable P0/P1 findings prohibit `complete`.

Eligible next routes: `/qs-git-merge`. Failure routes: `/qs-code-debug`, `/qs-flow-handoff`. Select one route only when it owns unfinished work. Do not recommend a review, verification, planning, diagnosis, or implementation step already completed without new evidence that it must be repeated.

Before responding, apply the internal clear-writing pass: lead with the outcome, use concrete nouns and verbs, preserve necessary qualifications and technical terms, and remove repetition. It never appears as another skill, status, or continuation.

Brief output always contains status, outcome, specs, the compact work summary with Finished and Next entries, noteworthy failed checks, material outputs, and the Next work prompt label. Full adds the evidence trail, never more prompts. Omit empty optional sections and routine success detail; never omit the required readout fields.

Status: Complete | Continuation required | Input required | Failed
Skills used: /qs-code-build
Outcome: Concise verified result.
Specs: verified specification link(s) | Not located
Work summary:
- Finished — exact bounded outcome, meaningful validation, and material outputs
- Next — up to three linked pending or blocked items with state and next action | None verified after checking available sources
Next work prompt: None | one copy-ready prompt in a fenced `text` block

Always write `Next work prompt:`. When a distinct verified actionable item exists, put one fenced `text` block beneath it beginning with its exact Codex literal ($qs-skills:qs-git-merge, $qs-skills:qs-code-debug, $qs-skills:qs-flow-handoff); Claude uses `/qs-git-merge`, `/qs-code-debug`, `/qs-flow-handoff`; Pi uses `/skill:qs-git-merge`, `/skill:qs-code-debug`, `/skill:qs-flow-handoff`. Name the exact verified ticket, specification, issue, or grouped work item it advances and carry forward only decisive evidence. Do not replace the fenced block with inline prose, a bare command, or a link. When `Next` lists a pending or blocked actionable item and an eligible route owns it, the fenced `text` prompt is required even when the current root is complete. Only when no eligible actionable item remains, write `Next work prompt: None — no follow-on needed.` The fenced prompt is copy-ready only; plain skill Markdown cannot request or guarantee an Add action. Keep model guidance outside the fence and never change the active model or reasoning setting.
