---
name: qs-review-code
description: "Review a change or selected codebase scope and optionally improve or refactor it safely."
---

# Review, improve, or refactor code

Accept two independent inputs:

- `target=changes|<module|component|package|path|named concern>`
- `action=review|improve|refactor`, defaulting to `review`

`refactor` is a first-class scoped improvement intent. It preserves externally observable behavior unless the user explicitly authorizes a behavior change.

## Safety boundary

- Review is read-only.
- Improve or refactor requires explicit mutation intent and a narrow validated target.
- “Improve/refactor the whole codebase” does not authorize broad edits. Perform a bounded review, rank the highest-value candidates, and end `input-required` with one scope-selection prompt.
- Authorized edits stay inside the selected target plus directly required tests and configuration.

## Review dimensions

Assess correctness, maintainability, architecture, testability, security, and operational risk when relevant. Keep repository-standards and specification findings as separate axes. Prioritize findings by impact and confidence; actionable P0/P1 findings or failed required checks prohibit completion.

## Scoped improvement and refactoring

1. Establish behavior-preserving characterization tests when existing coverage is insufficient.
2. State the selected smell, boundary, invariant, or maintainability outcome.
3. Make the smallest coherent structural edits.
4. Re-run focused and relevant wider checks.
5. Report behavior preserved, files changed, and residual risks.

Domain modeling and module decomposition may inform the review as internal capabilities. They never become separate runs. Do not automatically invoke build, Git, or deployment.

## Completion report and next steps

This invocation has one root skill: `/qs-review-code`. Internal capabilities and bounded helpers remain part of this run; never automatically invoke another public skill or create another skill report.

Normalize explicit flags first, then unambiguous natural-language intent, then defaults: `effort=quick|standard|deep` defaults to `standard`; `report=brief|full` defaults to `brief`. Effort changes evidence depth, not mutation scope or report length.

Produce one normalized result using `complete`, `continuation-required`, `input-required`, or `failed`. A complete result has no next prompt. Continuation-required and input-required have exactly one copy-ready prompt. Failed has at most one concrete recovery prompt. Failed required checks or actionable P0/P1 findings prohibit `complete`.

When a distinct workflow is genuinely required, the catalog-approved continuation is `/qs-git-merge`; tailor one prompt to the actual result instead of starting it.

Create a small JSON input with the actual root `skill`, `effort`, `report`, `completionState`, concise `outcome`, and only real decisions, findings, outputs, checks, execution evidence, and continuation. List only the root public skill in `skillsUsed`; internal capabilities are evidence, not skills used. Follow the shared policy in `docs/skill-run-contract.md`.

Render the one authenticated report:

```bash
node "<QuickStark root>/scripts/qs-skill-readout.mjs" render --require-hosted --input "<absolute-path-to-readout.json>"
```

Present only the independently accepted `https://reports.quickstark.com/` URL. If authentication or hosted publication fails, state `Readout: Not created — <actual reason>` and preserve any private recovery artifact without exposing its path, localhost, or a private-IP URL.

Brief in-chat output contains Status, Outcome, up to three important findings or decisions, noteworthy failed checks, material outputs, Readout, and the one continuation only when required. Full adds the evidence trail and alternatives but never extra prompts. Omit empty sections and routine successful detail.

```text
Status: Complete | Continuation required | Input required | Failed
Skills used: /qs-review-code
Outcome: Concise verified result.
Readout: Verified https://reports.quickstark.com/ report URL only.
Top next prompt: None — the requested work is complete. | one fenced copy-ready prompt
```

When continuation is required, place the single complete prompt in its own fenced `text` block and put heuristic model/thinking guidance in a muted blockquote beneath it. Never change the active model or reasoning setting.
