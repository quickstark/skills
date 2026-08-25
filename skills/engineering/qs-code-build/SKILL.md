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

Resolve governing specifications from explicit input, repository documentation, or a verified tracker. Every result includes `Specs:` with clickable Markdown links to verified specifications; when none can be located, write `Specs: Not located` and never invent a link. Include `Work summary:` with known done, pending, and blocked totals when available, then outline up to three highest-priority verified tickets, specifications, issues, or grouped work items as `linked id — state — next action`. Group items only when they share the same state and next action. Write `None identified against linked specs` only after verifying completion against those specs.

Use `complete`, `continuation-required`, `input-required`, or `failed`. Emit at most one copy-ready next-work prompt, and only when a distinct actionable item remains. Omit the prompt when the status is `complete` and there is no verified remaining work. Failed required checks or actionable P0/P1 findings prohibit `complete`.

Eligible next routes: `/qs-git-merge`. Failure routes: `/qs-code-debug`, `/qs-flow-handoff`. Select one route only when it owns unfinished work. Do not recommend a review, verification, planning, diagnosis, or implementation step already completed without new evidence that it must be repeated.

Before responding, apply the internal clear-writing pass: lead with the outcome, use concrete nouns and verbs, preserve necessary qualifications and technical terms, and remove repetition. It never appears as another skill, status, or continuation.

Brief output contains status, outcome, up to three important findings or decisions, noteworthy failed checks, material outputs, the work summary when applicable, and the optional next-work prompt. Full adds the evidence trail, never more prompts. Omit empty sections and routine success detail.

Status: Complete | Continuation required | Input required | Failed
Skills used: /qs-code-build
Outcome: Concise verified result.
Specs: verified specification link(s) | Not located
Work summary: verified totals and up to three linked items with state and next action
Next work prompt: None | one copy-ready prompt in a fenced `text` block

Label the optional continuation `Next work prompt:`. When present, put it in one fenced `text` block beginning with its exact Codex literal ($qs-skills:qs-git-merge, $qs-skills:qs-code-debug, $qs-skills:qs-flow-handoff); Claude uses `/qs-git-merge`, `/qs-code-debug`, `/qs-flow-handoff`; Pi uses `/skill:qs-git-merge`, `/skill:qs-code-debug`, `/skill:qs-flow-handoff`. Name the exact verified ticket, specification, issue, or grouped work item it advances and carry forward only decisive evidence. When absent, write `Next work prompt: None — no follow-on needed.` A host may offer an Add action for the fenced prompt, but never claim that it rendered. Keep model guidance outside the fence and never change the active model or reasoning setting.
