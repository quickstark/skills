# QuickStark Skills context

QuickStark is a personal collection of namespaced skills for Codex, Claude Code, and Pi. The QS packages preserve attributed upstream adaptations, including Matt Pocock and Lauren Tan, plus the frontend, HyperFrames and Unlazy sources listed in docs/upstream/provenance.md.

## Language

**Promoted command**: A canonical public command registered in exactly one collection and projected into its assigned Claude, Codex, and Pi packages.

**Core command**: One of twelve lifecycle-ordered commands in `qs-skills`.

**Specialist command**: One of eight optional commands in `qs-specialists`. Core commands never require this package to complete.

**Advanced command**: One of twelve distinct PS-derived outcomes in optional `qs-advanced`. Historical PS names remain provenance and transition records, not aliases.

**Internal capability**: Non-command instructions used inside one root run. It never produces a separate status, skills-used entry, result, or continuation.

**Root command**: The single public command that owns an invocation and its bounded result.

**Skill run**: One actual invocation of a promoted command. A recommendation or example is not a run.

**Effort mode**: `quick`, `standard`, or `deep`; it controls evidence depth and defaults to `standard`. It never expands mutation authority.

**Report mode**: `brief` or `full`; it controls chat presentation and defaults to `brief`. It does not change execution depth.

**Completion state**: `complete`, `continuation-required`, `input-required`, or `failed`.

**Chat result**: The root command's concise direct response containing status, outcome, decision-grade evidence, noteworthy failures, material outputs, and ranked continuations when applicable. It exists only in the current conversation.

**Clear-writing pass**: The internal final synthesis applied to every QS and PS result. It leads with the outcome, uses concrete language, preserves necessary qualifications, and removes repetition.

**Next prompt**: At most one eligible copy-ready continuation tied to verified unfinished work. It uses the exact installed host literal. Release is terminal and emits none.

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

Optional specialists are `qs-plan-research`, `qs-design-prototype`, `qs-code-document`, `qs-test-author`, `qs-test-verify`, `qs-learn-teach`, `qs-skill-write`, and `qs-deploy-prompt`.

Optional advanced, frontend, video and execution membership is defined by the respective collection catalogs. Frontend has four output-specific roots; video and execution have one root each with private modules.

## Invariants

- The registry contains 12 core, 8 specialist, 12 advanced, 4 frontend, 1 video and 1 execution commands. Optional selection determines installed exposure; no arbitrary global cap applies.
- Every public command belongs to exactly one package and has matching canonical source, metadata, documentation, and generated projections.
- Invocation policy remains catalog-owned; preserve the generated Codex compatibility exception.
- Public commands never automatically invoke another public command.
- Internal capabilities remain inside the owning root run.
- TDD remains internal to `qs-code-build`; ticket decomposition remains internal to `qs-plan-spec`.
- Every non-release result includes the Next work prompt label and at most one eligible catalog-approved continuation.
- Every result receives the same internal clear-writing pass and appears directly in chat.
- Commands return their results in the current conversation without an external output system or separate credentials.
- Generated Claude, Codex, and Pi package snapshots are never edited independently.
- Personal changes publish only to `origin`; `upstream` remains read-only.
