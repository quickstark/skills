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

Do not automatically invoke review, Git, deployment, or another public skill. Do not commit or publish unless the user included that authority in the request.

## Completion report and next steps

This invocation has one root skill: `/qs-code-build`. Internal capabilities and bounded helpers stay inside this run and never appear as separately used skills. Present the result directly in chat and create no secondary result artifact or URL.

Normalize explicit flags first, then clear natural-language intent, then defaults. `effort=quick|standard|deep` controls evidence depth and defaults to `standard`; `report=brief|full` controls presentation and defaults to `brief`. Neither changes mutation authority.

Resolve governing specifications from explicit input, repository documentation, or a verified tracker. Every result includes `Specs:` with clickable Markdown links to verified specifications; when none can be located, write `Specs: Not located` and never invent a link. Include `Remaining build:` with a known total when available and a preview of up to three highest-priority pending requirements or tickets. Write `None identified against linked specs` only after verifying completion against those specs.

Use `complete`, `continuation-required`, `input-required`, or `failed`. Emit exactly three ranked copy-ready prompts: one preferred route and two alternatives. Failed required checks or actionable P0/P1 findings prohibit `complete`.

Default routes: `/qs-review-code`, `/qs-code-debug`, `/qs-git-merge`. Failure routes: `/qs-code-debug`, `/qs-review-code`, `/qs-flow-handoff`. Tailor every prompt to the completed work. When the remaining objective fits, the preferred prompt may use this catalog-approved composite workflow: $qs-skills:qs-review-code, then $qs-specialists:qs-test-verify, then $qs-skills:qs-git-merge. Treat every step as a separate public root with its own completion report and authority boundary. Continue in this session only after a Complete result; stop on continuation-required, input-required, failed. This combined prompt does not grant commit, merge, push, release, deployment, installation, or other mutation authority unless the shared objective explicitly grants that exact action. This preserves each separate public root, must stop on a non-complete result, and does not add mutation authority.

Before responding, apply the internal clear-writing pass: lead with the outcome, use concrete nouns and verbs, preserve necessary qualifications and technical terms, and remove repetition. It never appears as another skill, status, or continuation.

Brief output contains status, outcome, up to three important findings or decisions, noteworthy failed checks, material outputs, and all three prompts. Full adds the evidence trail, never more prompts. Omit empty sections and routine success detail.

Status: Complete | Continuation required | Input required | Failed
Skills used: /qs-code-build
Outcome: Concise verified result.
Specs: verified specification link(s) | Not located
Remaining build: concise verified preview
Preferred next prompt: one copy-ready prompt in a fenced `text` block
Alternative next prompts: two copy-ready prompts, each in its own fenced `text` block

Label prompts `Preferred next prompt:` and `Alternative next prompt:`. Put each in its own fenced `text` block, beginning with its exact Codex literal ($qs-skills:qs-review-code, $qs-skills:qs-code-debug, $qs-skills:qs-git-merge, $qs-skills:qs-flow-handoff); Claude uses `/qs-review-code`, `/qs-code-debug`, `/qs-git-merge`, `/qs-flow-handoff`; Pi uses `/skill:qs-review-code`, `/skill:qs-code-debug`, `/skill:qs-git-merge`, `/skill:qs-flow-handoff`. Carry forward only the outcome and highest-value evidence. Keep model guidance outside the fence and never change the active model or reasoning setting.
