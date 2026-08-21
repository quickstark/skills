# QuickStark Skills context

QuickStark is a personal collection of namespaced skills for Codex and Claude Code. The QS packages adapt Matt Pocock's MIT-licensed work; the optional PS package adapts Lauren Tan's MIT-licensed pstack without Cursor-specific mechanisms.

## Language

**Promoted command**: A canonical public command registered in exactly one collection and projected into its assigned Claude and Codex plugins.

**Core command**: One of twelve lifecycle-ordered commands in `qs-skills`.

**Specialist command**: One of seven optional commands in `qs-specialists`. Core commands never require this package to complete.

**PS command**: One of thirteen explicit-only commands in `ps-skills`. Its Codex literal is `$ps-skills:<command>`.

**Internal capability**: Non-command instructions used inside one root run. It never produces a separate status, skills-used entry, result, or continuation.

**Root command**: The single public command that owns an invocation and its bounded result.

**Skill run**: One actual invocation of a promoted command. A recommendation or example is not a run.

**Effort mode**: `quick`, `standard`, or `deep`; it controls evidence depth and defaults to `standard`. It never expands mutation authority.

**Report mode**: `brief` or `full`; it controls chat presentation and defaults to `brief`. It does not change execution depth.

**Completion state**: `complete`, `continuation-required`, `input-required`, or `failed`.

**Chat result**: The root command's concise direct response containing status, outcome, decision-grade evidence, noteworthy failures, material outputs, and ranked continuations when applicable. It exists only in the current conversation.

**Clear-writing pass**: The internal final synthesis applied to every QS and PS result. It leads with the outcome, uses concrete language, preserves necessary qualifications, and removes repetition.

**Next prompt**: One of three ranked copy-ready continuations emitted by every non-release command. The first is preferred and the other two are alternatives. Each appears in its own fenced `text` block and begins with the exact installed plugin literal in Codex or slash command in Claude. `/qs-deploy-release` is terminal and emits none.

**Finding priority**: An explicitly assessed `P0`, `P1`, `P2`, or `P3`. Omit it when urgency was not assessed.

**Review axis**: An independent code-review perspective: repository standards or specification requirements.

**Issue tracker**: The configured system that owns project work, such as GitHub Issues, Linear, or a local Markdown convention.

**Decision ticket**: A roadmap unit whose resolution is a decision rather than an implementation deliverable.

**Delivery evidence**: Independently verified proof of an actual remote commit, pull request, issue transition, tag, release, or deployment. Local configuration never proves publication.

## Canonical command order

The core catalog order is:

1. `qs-help`
2. `qs-setup`
3. `qs-plan-clarify`
4. `qs-plan-roadmap`
5. `qs-plan-spec`
6. `qs-code-build`
7. `qs-code-debug`
8. `qs-review-code`
9. `qs-git-merge`
10. `qs-deploy-release`
11. `qs-flow-triage`
12. `qs-flow-handoff`

Optional specialists are `qs-plan-research`, `qs-design-prototype`, `qs-code-document`, `qs-test-author`, `qs-test-verify`, `qs-learn-teach`, and `qs-skill-write`.

The PS catalog contains `ps-help`, `ps-how`, `ps-why`, `ps-blast-radius`, `ps-runtime-forensics`, `ps-trace-forensics`, `ps-create-verification-skill`, `ps-maintain-verification-skill`, `ps-skill-eval`, `ps-hillclimb`, `ps-visual-parity`, `ps-pr-babysit`, and `ps-worktree-cleanup`.

## Invariants

- The registry contains exactly 12 core, 7 specialist, and 13 PS commands.
- Every public command belongs to exactly one package and has matching canonical source, metadata, documentation, and generated projections.
- All PS commands are explicit-only; QS invocation policy remains catalog-owned.
- Public commands never automatically invoke another public command.
- Internal capabilities remain inside the owning root run.
- TDD remains internal to `qs-code-build`; ticket decomposition remains internal to `qs-plan-spec`.
- Every non-release result has exactly three catalog-approved continuations in ranked order.
- Every result receives the same internal clear-writing pass and appears directly in chat.
- Commands return their results in the current conversation without an external output system or separate credentials.
- Generated Claude and Codex package snapshots are never edited independently.
- Personal changes publish only to `origin`; `upstream` remains read-only.
