---
name: qs-code-build
description: "Implement one scoped change with an evidence-based test and validation strategy."
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

This invocation has one root skill: `/qs-code-build`. Internal capabilities and bounded helpers remain part of this run; never automatically invoke another public skill or create another skill report.

Normalize explicit flags first, then unambiguous natural-language intent, then defaults: `effort=quick|standard|deep` defaults to `standard`; `report=brief|full` defaults to `brief`. Effort changes evidence depth, not mutation scope or report length.

Produce one normalized result using `complete`, `continuation-required`, `input-required`, or `failed`. Every result emits three ranked copy-ready prompts: one opinionated preferred prompt followed by two alternatives. Failed required checks or actionable P0/P1 findings prohibit `complete`.

The default ranked continuations are `/qs-review-code`, `/qs-code-debug`, `/qs-git-merge`. A failed result instead ranks `/qs-code-debug`, `/qs-review-code`, `/qs-flow-handoff`. Tailor each prompt to the actual result instead of starting it.

Create a small JSON input with the actual root `skill`, `effort`, `report`, `completionState`, concise `outcome`, and only real decisions, findings, outputs, checks, execution evidence, and continuation. List only the root public skill in `skillsUsed`; internal capabilities are evidence, not skills used. Follow the shared policy in `docs/skill-run-contract.md`.

Render the one authenticated report:

```bash
node "<QuickStark root>/scripts/qs-skill-readout.mjs" render --require-hosted --input "<absolute-path-to-readout.json>"
```

Present only the independently accepted `https://reports.quickstark.com/` URL. If authentication or hosted publication fails, state `Readout: Not created — <actual reason>` and preserve any private recovery artifact without exposing its path, localhost, or a private-IP URL.

Brief in-chat output contains Status, Outcome, up to three important findings or decisions, noteworthy failed checks, material outputs, Readout, one preferred prompt, and two alternatives. Full adds the evidence trail but never extra prompts. Omit empty sections and routine successful detail.

Status: Complete | Continuation required | Input required | Failed
Skills used: /qs-code-build
Outcome: Concise verified result.
Readout: Verified https://reports.quickstark.com/ report URL only.
Preferred next prompt: one copy-ready prompt in a fenced `text` block
Alternative next prompts: two copy-ready prompts, each in its own fenced `text` block

Present prompts in normalized rank order. Label the first `Preferred next prompt:` and the remaining two `Alternative next prompt:`. Put each complete prompt in its own fenced `text` block beginning with its exact Codex skill literal ($qs-skills:qs-review-code, $qs-skills:qs-code-debug, $qs-skills:qs-git-merge, $qs-skills:qs-flow-handoff); Claude uses `/qs-review-code`, `/qs-code-debug`, `/qs-git-merge`, `/qs-flow-handoff`. The fence info string must be exactly `text` so the chat renders it as Plain text; never use `markdown`, `bash`, `json`, or another language. Keep every prompt concise and carry forward only the outcome plus the single highest-value evidence item. Put heuristic model/thinking guidance outside each fence in a muted blockquote. Never change the active model or reasoning setting.
