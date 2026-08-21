# Specification: Cursor-neutral pstack incorporation as `ps-skills`

> Historical implementation record — hosted-output requirements are superseded by the direct-chat completion contract. The fixed PS inventory, package isolation, explicit invocation, and safety boundaries remain applicable.

Status: Implemented (2026-08-19)

Release boundary: Add one optional package without changing the QuickStark core or specialist command counts. This document specifies the work; it does not implement or publish it.

Upstream baseline: [`cursor/plugins/pstack` 0.14.1 at `63d938c2e4a165a0fec1bd0f61a8e325f0cb751e`](https://github.com/cursor/plugins/tree/63d938c2e4a165a0fec1bd0f61a8e325f0cb751e/pstack)

Repository contracts: [architecture](../architecture.md), [skill-run contract](../skill-run-contract.md), [QuickStark v3 consolidation](./quickstark-v3-skill-consolidation.md), and root `AGENTS.md`.

Companion plan: [dependency-aware implementation tickets](./pstack-skills-incorporation-ticket-plan.md).

## Problem

pstack contains valuable investigative, verification, evaluation, optimization, and operational workflows, but its native shape conflicts with this repository's v3 contracts:

- it exposes a broad unnamespaced surface;
- its mode routes automatically among public skills and can remain active across turns;
- several workflows assume host-specific commands, agents, model names, paths, background execution, and task APIs;
- several capabilities duplicate existing QuickStark commands or internal capabilities;
- its package includes high-authority workflows whose mutation and publication boundaries need to be explicit;
- the current QuickStark generators and readout runtime assume only `qs-skills` and `qs-specialists`.

Copying the upstream tree into this repository would therefore create overlapping commands, bypass the one-root contract, and make generated packages host-dependent. The adaptation needs an intentionally smaller public surface, a complete disposition record for all upstream material, and repository-native generation and validation.

## Goals

1. Add one optional package named `ps-skills` with exactly thirteen public commands.
2. Namespace every public command with `ps-` and use `$ps-skills:<command>` as its Codex literal.
3. Preserve the QuickStark core at exactly twelve commands and `qs-specialists` at exactly seven commands.
4. Classify every one of the 72 pinned upstream candidates exactly once as public, internal, merged into QS, dependency/integration, or omitted.
5. Adapt useful pstack behavior into explicit-only, host-neutral, safety-bounded workflows.
6. Apply the existing one-root, one-result, one-hosted-readout contract to every `ps-*` run.
7. Generate isolated Claude and Codex package projections from canonical sources.
8. Preserve the upstream MIT license and attribution in source and generated distributions.
9. Make catalog coverage, portability, package isolation, readout behavior, and high-risk operations mechanically verifiable.

## Non-goals

- Do not install or vendor the upstream pstack tree verbatim.
- Do not add a persistent mode, automatic router, wrapper command, alias, or public-skill chain.
- Do not change the twelve-command QS core or seven-command specialist membership.
- Do not add upstream agents as installable agents.
- Do not create a Benny automation package in this release.
- Do not require a particular model, provider, task API, issue tracker, observability vendor, browser driver, Git stack tool, or chat-history provider.
- Do not make `ps-skills` a prerequisite of either QS package.
- Do not merge, deploy, release, delete worktrees, or publish changes without the authority required by the selected root command.
- Do not publish this repository or its packages as part of implementation.

## Governing decisions

### One optional package, one namespace

The package is `ps-skills`. Its public commands are `ps-*`. `ps-help` is a new package router; the other twelve public commands are adaptations of selected upstream candidates.

The package is optional and additive. It has its own catalog and documentation collection. It is not added to `scripts/qs-skill-catalog.mjs`, the root QS indexes, or `qs-help`.

### One public root per run

Every invocation has exactly one public root, one bounded result, and one hosted readout. A `ps-*` command may use internal capabilities and bounded helpers, but it never invokes a `ps-*` or `qs-*` public command automatically. Follow-on workflows appear only as three ranked, copy-ready continuation prompts.

Internal capabilities never receive public metadata, a command literal, a separate status, a `skillsUsed` entry, a separate readout, or their own continuation prompts.

### Invocation policy

All thirteen commands are explicit-only in v1. Every canonical `SKILL.md` uses `disable-model-invocation: true`, and every `agents/openai.yaml` uses `policy.allow_implicit_invocation: false`.

No command becomes model-invokable implicitly during v1 implementation. A later invocation-policy change requires separate evidence, specification, catalog, metadata, documentation, and test updates; it is not part of this release.

### Cross-package continuations are recommendations, not dependencies

`ps-skills` may recommend installed QS commands by exact literal. It must not import their skill bodies, start them, or assume they are available at execution time. The readout/catalog registry owns literal resolution. If a recommended package is unavailable, the prompt remains a transparent recommendation rather than an attempted invocation.

### Upstream content is adapted, not mirrored

Canonical instructions are rewritten around repository contracts and host capabilities. Upstream structure and language may inform the result, but host-specific mechanisms are replaced with capability-based contracts and duplicated QS behavior is merged into its existing owner.

## Domain model

| Term | Meaning | Invariant |
|---|---|---|
| PS collection | The optional pstack-derived command collection | Exactly one package, `ps-skills` |
| PS public command | An explicitly invokable `ps-*` workflow | Exactly thirteen, lifecycle ordered |
| PS internal capability | A reusable technique owned by one or more roots | Never installable or independently reported |
| Upstream candidate | One pinned upstream skill, principle, playbook, agent, or Benny skill | Exactly 72 and exactly one disposition |
| Disposition | `public`, `internal`, `merge`, `dependency`, or `omit` | One and only one per candidate |
| Canonical source | Repository-authored source used to generate package projections | Never edit a generated projection independently |
| Host adapter | A capability-based seam for optional tools or providers | Detected at run time; absence degrades or blocks honestly |
| Verification driver | A project-selected way to exercise real behavior | No hardcoded host control API |
| Continuation | A copy-ready prompt for a later public root | Recommendation only; never automatic |
| Immutable baseline | A verified reference artifact used by a comparison workflow | The workflow may not modify it |

## Package and source layout

The implementation uses these boundaries:

```text
scripts/
  ps-skill-catalog.mjs                 # PS membership, dispositions, metadata, profiles, continuations
  skill-collection-registry.mjs        # Cross-collection lookup and exact command literals
skills/
  pstack/
    commands/
      ps-help/
      ... twelve more public roots ...
    internal/
      ... non-command capabilities ...
docs/
  pstack/
    index.md
    ps-help.md
    ... twelve more generated command pages ...
packages/
  ps-skills/                           # Generated Claude package
codex/plugins/
  ps-skills/                           # Generated Codex package
tests/fixtures/
  pstack-0.14.1-inventory.json         # Pinned, offline 72-candidate inventory
THIRD_PARTY_NOTICES.md                 # Lauren Tan and existing upstream notices
```

`scripts/ps-skill-catalog.mjs` is authoritative for:

- the pinned upstream repository, version, and commit;
- the 72 candidate dispositions;
- the thirteen public commands and lifecycle positions;
- source locations and package projection;
- invocation policy and display metadata;
- report profiles;
- default and recovery continuations;
- PS internal capability ownership.

`scripts/skill-collection-registry.mjs` combines catalog metadata needed by shared tooling. It resolves a command to its collection and installed literal without changing either collection's membership. Existing QS exports may remain as compatibility facades, but new shared code must not infer a package from a `qs-` prefix or hardcode a two-package list.

Generated package directories are projections only. Canonical skill sources, internal capabilities, catalog data, documentation generators, and projection logic remain outside generated trees.

## Public command catalog

The lifecycle is package-local and exact.

| Position | Command | Upstream source | Primary outcome | Invocation | Mutation boundary |
|---:|---|---|---|---|---|
| 10 | `ps-help` | New | Select one PS or QS workflow from the user's desired outcome | Explicit | Read-only |
| 20 | `ps-how` | skill `how` | Explain how a selected subsystem actually works from code and observed interfaces | Explicit | Read-only |
| 30 | `ps-why` | skill `why` | Explain why a behavior or design exists from attributable evidence | Explicit | Read-only |
| 40 | `ps-blast-radius` | skill `blast-radius` | Map affected callers, data, interfaces, tests, and operational surfaces around one proposed change | Explicit | Read-only |
| 50 | `ps-runtime-forensics` | playbook `runtime-forensics` | Diagnose one live runtime symptom from actual measurements | Explicit | Diagnosis only; temporary artifacts outside tracked product source are allowed |
| 60 | `ps-trace-forensics` | playbook `trace-forensics` | Diagnose one supplied profiling or trace artifact | Explicit | Read-only |
| 70 | `ps-create-verification-skill` | skill `create-verification-skill` | Create a project-local, rerunnable verification workflow and feature map | Explicit | Verification assets only |
| 80 | `ps-maintain-verification-skill` | skill `maintain-verification-skill` | Reconcile an existing verification workflow with observed product behavior | Explicit | Verification assets only; no product-behavior edits |
| 90 | `ps-skill-eval` | playbook `eval` | Compare a skill or prompt change using blinded, recorded trials | Explicit | Evaluation fixtures and selected skill source only |
| 100 | `ps-hillclimb` | playbook `hillclimb` | Improve one declared metric through bounded, measured experiments | Explicit | User-selected implementation scope only; no commit, push, or publication |
| 110 | `ps-visual-parity` | playbook `visual-parity` | Converge a selected implementation toward a verified immutable visual baseline | Explicit | User-selected implementation scope; baseline is immutable |
| 120 | `ps-pr-babysit` | playbook `babysit` | Drive one selected PR to a truthful merge-ready assessment and resolve authorized blockers | Explicit | Selected PR branch/worktree only; never merge, deploy, or release |
| 130 | `ps-worktree-cleanup` | playbook `worktree-cleanup` | Audit reclaimable worktrees and perform only explicitly confirmed removals | Explicit | Read-only first; destructive action requires exact confirmed targets |

### Command-specific safety contracts

#### `ps-help`

- Route from the requested outcome, not from keyword matching alone.
- Prefer PS when its command owns the final requested outcome; otherwise recommend the existing QS owner.
- Return guidance only. Never start the selected workflow.

#### `ps-how`, `ps-why`, and `ps-blast-radius`

- Inspect only the explicitly selected subsystem, question, or proposed change.
- Separate observed facts, source-backed inference, and unresolved uncertainty.
- `ps-why` may use detected source-control, issue, documentation, chat, telemetry, or error-tracking adapters, but no provider is mandatory.
- `ps-blast-radius` must prove at least one critical safety claim with executable or directly observable evidence; otherwise report the claim as unproven.

#### `ps-runtime-forensics` and `ps-trace-forensics`

- Diagnose one symptom or artifact and stop before repair.
- Establish a baseline before interpreting a change.
- Existing project instrumentation may be used. If tracked product-code instrumentation is necessary, return `continuation-required` rather than silently editing it.
- Preserve sensitive traces privately and summarize only the evidence needed for the diagnosis.

#### Verification commands

- Detect the repository's declared local-skill or verification convention; do not hardcode a host directory.
- The created workflow must exercise a real product surface through the repository's actual harness.
- `ps-create-verification-skill` may add project-local verification instructions, adapters, fixtures, and feature maps, but not alter product behavior.
- `ps-maintain-verification-skill` starts with a source inventory and one live pass, changes only verification assets, and reports product defects without repairing them.

#### `ps-skill-eval`

- Declare the evaluated variant, control, task set, rubric, and stopping condition before trials.
- Blind scoring when practical and record failures as evidence rather than retrying until they disappear.
- Use observable trial inputs, outputs, checks, and explicitly selected run artifacts as the primary evidence.
- Treat transcript or run-history evidence as an optional adapter. Use it only when the user explicitly selects the source and scope; never scan unrelated workspaces or private history by default.
- Do not treat model identity or subjective preference as a measured result.

#### `ps-hillclimb`

- Declare one metric, baseline, target, budget, and rollback criterion.
- Change one causal variable per experiment when practical.
- Keep accepted improvements only when the same measurement path confirms them.
- Do not commit, push, open a PR, merge, publish, or deploy.

#### `ps-visual-parity`

- Resolve and verify the authoritative baseline before editing.
- Never regenerate, overwrite, crop, rescale, or otherwise alter the baseline to manufacture agreement.
- Use the same viewport, fonts, assets, state, and capture method for comparisons.
- Resolve the comparison metric and acceptable tolerance from repository configuration before the first edit. If the repository declares no tolerance, require the user to approve one or return `input-required`; do not invent a universal threshold.
- A zero tolerance is valid when the project requires exact matching. Completion otherwise requires the measured residual to be at or below the declared tolerance under the controlled capture environment.
- Report the metric, tolerance, measured residual, and any remaining mismatch honestly.

#### `ps-pr-babysit`

- Start by resolving the exact PR, branch, worktree, review state, and required checks.
- Inspection is always allowed; fixes or pushes require authority in the initiating request.
- Limit edits to blockers for the selected PR and verify the current head after each accepted repair.
- Never merge, enable merge-when-ready, change stack topology, deploy, or release.

#### `ps-worktree-cleanup`

- Produce a read-only audit before proposing deletion.
- Resolve every worktree to an absolute path, branch, head, merge state, dirty state, and ownership signal.
- Never use unresolved variables, broad roots, globs, or inferred abandoned status as deletion targets.
- Default scope is worktrees only. Simulators, application state, and package or build caches are excluded unless the user explicitly requests a named secondary cleanup scope.
- Require explicit confirmation of the exact worktree target list before removal. Any requested secondary cleanup scope receives its own audit, exact targets, and separate confirmation; worktree approval never authorizes those removals.
- Report what was removed and whether recovery is possible.

## Internal capability catalog

The following sixteen adaptations are non-command capabilities. Their canonical documents live under `skills/pstack/internal/` and declare their owning roots.

| Capability | Upstream source | Primary owners |
|---|---|---|
| `multi-candidate-exploration` | skill `arena` | `ps-skill-eval`, `ps-hillclimb`, `ps-visual-parity` |
| `decision-trail` | skill `show-me-your-work` | all mutating PS roots |
| `parallel-coverage` | skill `swarm` | `ps-how`, `ps-why`, `ps-blast-radius`, `ps-skill-eval` |
| `typescript-discipline` | skill `typescript-best-practices` | any PS root operating on TypeScript |
| `plain-writing` | skill `unslop` | all PS roots' final synthesis |
| `boundary-discipline` | principle | verification and operational roots |
| `rerunnable-tooling` | principle `build-the-lever` | verification, evaluation, and optimization roots |
| `structural-enforcement` | principle `encode-lessons-in-structure` | verification and skill-evaluation roots |
| `experience-first` | principle | `ps-visual-parity`, `ps-hillclimb` |
| `context-discipline` | principle `guard-the-context-window` | roots using bounded helpers or subagents |
| `minimal-change` | principle `laziness-protocol` | all mutating PS roots |
| `idempotent-operations` | principle `make-operations-idempotent` | verification and cleanup roots |
| `outcome-oriented-execution` | principle | optimization and operational roots |
| `concurrency-ownership` | principle `separate-before-serializing-shared-state` | parallel and operational roots |
| `type-system-discipline` | principle | all code-aware PS roots |
| `bounded-autonomous-loop` | playbook `autonomous-run` | `ps-hillclimb`, `ps-pr-babysit` |

These capabilities may describe how to use host-provided subagents, but must not require delegation. When subagents are available, they inherit the parent model unless the user explicitly requests another supported configuration.

## QS merge boundary

Thirty upstream candidates improve existing owners instead of becoming PS commands. Merges add focused guidance or references; they do not add aliases, wrappers, routers, new public commands, automatic chaining, or a dependency from QS to the PS package.

| Existing owner | Adapted concerns |
|---|---|
| `qs-plan-clarify` | authority-aware handling of human input from `principle-never-block-on-the-human` |
| `qs-plan-roadmap` and `qs-plan-spec` | architecture-first planning, foundational structures, first-principles redesign, and multi-phase decomposition |
| Internal `domain-modeling` and `module-decomposition` | domain structure and caller/module boundaries |
| `qs-design-prototype` | comparing a small set of genuinely different designs |
| `qs-code-build` and internal `tdd-loop` | feature execution, TDD, and verifiable sequencing |
| `qs-code-debug` | reproduction, root-cause analysis, and measured performance diagnosis |
| `qs-review-code` | adversarial review, caller migration, reader load, subtractive design, and refactoring discipline |
| `qs-git-merge` | opening a PR, verified shipping preparation, and verifiable delivery units |
| `qs-flow-handoff` | pause and session-resumption evidence |
| `qs-test-verify` and the shared run contract | proof against the real artifact |
| `qs-code-document` and `qs-skill-write` | layered technical writing and skill-authoring guidance |
| `qs-learn-teach` | explanation that combines implementation and rationale |

## Cursor-neutral substitutions

Canonical and generated PS skill content uses capabilities, not one host's vocabulary.

| Upstream assumption | Repository-native substitution |
|---|---|
| Cursor plugin manifest | Generated Claude and Codex manifests owned by the package projector |
| Slash command examples | `$ps-skills:ps-*` for Codex and `/ps-*` for Claude |
| Cursor task/subagent API | Optional host-provided bounded subagent capability; parent model inherited by default |
| Hardcoded model slugs and model rule file | Omit; use heuristic, non-binding guidance outside copy-ready prompts |
| Interactive question tool | Host-provided user-input mechanism or a concise `input-required` result |
| Long-running loop command | Bounded wait/monitor capability with explicit stop conditions |
| Background execution flags | Host scheduler when available; otherwise degrade or stop clearly |
| Cursor-local skill directory | Repository-declared local skill/verification convention |
| Cursor chat transcripts | Optional history adapter used only for an explicitly selected source and scope; absent or unauthorized history never blocks output-based evaluation |
| Built-in control UI/CLI | Project verification-driver interface backed by the real harness |
| Built-in skill creator | Internal authoring guidance or a continuation to `qs-skill-write` |
| Automatic mode routing | Internal capabilities plus ranked continuation prompts |
| Sticky mode and reminder behavior | Omit |
| Graphite CLI and stack assumptions | Optional detected adapter; ordinary Git/GitHub state is the default |
| Benny automation runtime | Deferred optional integration boundary |

The portability test scans canonical PS instructions, internal capabilities, generated PS skill projections, and metadata. Provenance and license files are the only allowed locations for the upstream host name or repository URL.

## Continuation catalog

Each non-terminal PS result emits exactly three ranked prompts. The catalog stores the union of normal and failure routes; normalization selects the appropriate three without inventing a route at run time.

| Root | Normal routes, ranked | Failed routes, ranked |
|---|---|---|
| `ps-help` | `ps-how`, `ps-why`, `qs-plan-clarify` | `qs-plan-clarify`, `qs-flow-handoff`, `ps-how` |
| `ps-how` | `ps-blast-radius`, `qs-plan-spec`, `ps-why` | `qs-plan-clarify`, `qs-flow-handoff`, `ps-why` |
| `ps-why` | `qs-plan-clarify`, `ps-how`, `ps-blast-radius` | `qs-plan-clarify`, `qs-flow-handoff`, `ps-how` |
| `ps-blast-radius` | `qs-plan-spec`, `qs-review-code`, `qs-flow-handoff` | `qs-plan-clarify`, `qs-flow-handoff`, `ps-how` |
| `ps-runtime-forensics` | `qs-code-debug`, `ps-trace-forensics`, `qs-flow-handoff` | `qs-code-debug`, `qs-flow-handoff`, `ps-trace-forensics` |
| `ps-trace-forensics` | `qs-code-debug`, `ps-runtime-forensics`, `qs-flow-handoff` | `qs-code-debug`, `qs-flow-handoff`, `ps-runtime-forensics` |
| `ps-create-verification-skill` | `ps-maintain-verification-skill`, `qs-review-code`, `qs-git-merge` | `qs-code-debug`, `qs-review-code`, `qs-flow-handoff` |
| `ps-maintain-verification-skill` | `qs-review-code`, `ps-create-verification-skill`, `qs-flow-handoff` | `ps-create-verification-skill`, `qs-code-debug`, `qs-flow-handoff` |
| `ps-skill-eval` | `qs-skill-write`, `qs-plan-clarify`, `qs-flow-handoff` | `qs-plan-clarify`, `qs-skill-write`, `qs-flow-handoff` |
| `ps-hillclimb` | `qs-review-code`, `qs-test-verify`, `qs-flow-handoff` | `qs-code-debug`, `qs-test-verify`, `qs-flow-handoff` |
| `ps-visual-parity` | `qs-review-code`, `qs-test-verify`, `qs-flow-handoff` | `qs-code-debug`, `qs-test-verify`, `qs-flow-handoff` |
| `ps-pr-babysit` | `qs-git-merge`, `qs-code-debug`, `qs-flow-handoff` | `qs-code-debug`, `qs-review-code`, `qs-flow-handoff` |
| `ps-worktree-cleanup` | `qs-flow-handoff`, `qs-setup`, `ps-help` | `qs-flow-handoff`, `ps-help`, `qs-setup` |

Publication-only routes are success-only. A failed result must never recommend merge or release. No PS command is terminal, so all thirteen emit exactly three prompts.

## Readout profiles

PS commands use the existing normalized completion states, effort/report modes, hosted delivery, and prompt presentation. `skillsUsed` contains only the root PS command.

| Command | Profile title | Visual | Section order |
|---|---|---|---|
| `ps-help` | Workflow recommendation | flow | decisions, findings, outputs, checks |
| `ps-how` | Subsystem walkthrough | flow | findings, decisions, outputs, checks |
| `ps-why` | Rationale evidence | matrix | findings, decisions, checks, outputs |
| `ps-blast-radius` | Change impact map | matrix | findings, checks, decisions, outputs |
| `ps-runtime-forensics` | Runtime diagnosis | flow | findings, checks, decisions, outputs |
| `ps-trace-forensics` | Trace diagnosis | bars | findings, checks, decisions, outputs |
| `ps-create-verification-skill` | Verification workflow creation | checks | outputs, checks, decisions, findings |
| `ps-maintain-verification-skill` | Verification coverage maintenance | matrix | findings, outputs, checks, decisions |
| `ps-skill-eval` | Blinded skill evaluation | matrix | checks, findings, decisions, outputs |
| `ps-hillclimb` | Metric experiment ledger | bars | checks, findings, decisions, outputs |
| `ps-visual-parity` | Visual parity matrix | matrix | checks, findings, outputs, decisions |
| `ps-pr-babysit` | PR readiness | checks | checks, findings, decisions, outputs |
| `ps-worktree-cleanup` | Cleanup audit | checks | findings, decisions, checks, outputs |

The shared runtime becomes collection-aware:

- native skill lookup searches registered public catalogs;
- exact Codex literals come from package metadata rather than a `qs-` assumption;
- report filenames accept the registered collection prefix and remain collision-safe;
- envelopes record collection identity while remaining backward-compatible with existing QS v1 readouts;
- gallery and Workbench filters display both collections without treating PS as an external skill;
- package-local generated support remains self-contained;
- existing QS report behavior and URLs remain unchanged.

## Package projection and manifests

The projector's package record gains explicit fields instead of name-based conditionals:

- canonical command root;
- documentation root;
- collection/catalog provider;
- Codex root;
- optional Claude root;
- internal capability files;
- support/runtime files;
- license/notice files;
- keywords and default prompts;
- marketplace source.

The new record projects:

- Claude: `packages/ps-skills/` with `.claude-plugin/plugin.json`;
- Codex: `codex/plugins/ps-skills/` with `.codex-plugin/plugin.json`;
- Claude marketplace entry: `./packages/ps-skills`;
- Codex marketplace entry: `./plugins/ps-skills`.

All three packages use the repository version. The pinned pstack version remains provenance, not the package version. The root lockfile, both existing Claude manifests, the new Claude manifest, all three Codex manifests, and both marketplaces must agree on the repository version.

The generated PS package includes only PS public commands, the internal capabilities those commands need, shared self-contained readout support, and the required third-party notice. It must not include upstream agents, Benny automation, omitted candidates, or QS skill bodies.

## Licensing and provenance

The adaptation remains MIT. `THIRD_PARTY_NOTICES.md` preserves, verbatim, the full pstack MIT notice:

- `Copyright (c) 2026 Lauren Tan`;
- upstream repository `https://github.com/cursor/plugins`;
- pstack version `0.14.1`;
- pinned commit `63d938c2e4a165a0fec1bd0f61a8e325f0cb751e`.

The existing Matt Pocock attribution remains intact. The PS notice is copied into both generated PS package roots and validated byte-for-byte.

Technical-writing guidance is paraphrased and links to its primary standards where needed. Do not reproduce a substantial upstream prose corpus merely because the source is MIT-licensed.

## Complete upstream disposition

The following tables are normative. The catalog encodes the same 72 IDs and tests compare them with the pinned offline inventory.

### Top-level skills: 23

| Candidate | Disposition | Target or reason |
|---|---|---|
| `architect` | merge | `qs-plan-spec` and internal `module-decomposition` |
| `arena` | internal | `multi-candidate-exploration` |
| `automate-me` | merge | `qs-skill-write` |
| `blast-radius` | public | `ps-blast-radius` |
| `bro` | omit | style-only restatement does not warrant a command |
| `create-verification-skill` | public | `ps-create-verification-skill` |
| `figure-it-out` | merge | `qs-plan-roadmap` and `qs-plan-spec` |
| `how` | public | `ps-how` |
| `interrogate` | merge | `qs-review-code` |
| `maintain-verification-skill` | public | `ps-maintain-verification-skill` |
| `no-comments` | omit | blanket comment removal conflicts with evidence-based review |
| `poteto-mode` | omit | persistent automatic router conflicts with one-root runs |
| `recall` | dependency | optional history adapter; no public command until a host-neutral contract exists |
| `reflect` | merge | `qs-skill-write` |
| `setup-pstack` | omit | model/provider configuration is host-specific |
| `show-me-your-work` | internal | `decision-trail` |
| `swarm` | internal | `parallel-coverage` |
| `tdd` | merge | internal `tdd-loop` and `qs-code-build` |
| `teach` | merge | `qs-learn-teach` |
| `technical-writing` | merge | `qs-code-document` and `qs-skill-write` |
| `typescript-best-practices` | internal | `typescript-discipline` |
| `unslop` | internal | `plain-writing` |
| `why` | public | `ps-why` |

### Principles: 21

| Candidate | Disposition | Target or reason |
|---|---|---|
| `principle-boundary-discipline` | internal | `boundary-discipline` |
| `principle-build-the-lever` | internal | `rerunnable-tooling` |
| `principle-encode-lessons-in-structure` | internal | `structural-enforcement` |
| `principle-exhaust-the-design-space` | merge | `qs-design-prototype` |
| `principle-experience-first` | internal | `experience-first` |
| `principle-fix-root-causes` | merge | `qs-code-debug` |
| `principle-foundational-thinking` | merge | `qs-plan-spec` and internal `module-decomposition` |
| `principle-guard-the-context-window` | internal | `context-discipline` |
| `principle-laziness-protocol` | internal | `minimal-change` |
| `principle-make-operations-idempotent` | internal | `idempotent-operations` |
| `principle-migrate-callers-then-delete-legacy-apis` | merge | `qs-review-code` |
| `principle-minimize-reader-load` | merge | `qs-review-code` |
| `principle-model-the-domain` | merge | internal `domain-modeling` |
| `principle-never-block-on-the-human` | merge | `qs-plan-clarify`, rewritten around authority and safe input boundaries |
| `principle-outcome-oriented-execution` | internal | `outcome-oriented-execution` |
| `principle-prove-it-works` | merge | `qs-test-verify` and shared run contract |
| `principle-redesign-from-first-principles` | merge | `qs-plan-spec` and `qs-review-code` |
| `principle-separate-before-serializing-shared-state` | internal | `concurrency-ownership` |
| `principle-sequence-verifiable-units` | merge | `qs-code-build` and `qs-git-merge` |
| `principle-subtract-before-you-add` | merge | `qs-review-code` |
| `principle-type-system-discipline` | internal | `type-system-discipline` |

### Playbooks: 23

| Candidate | Disposition | Target or reason |
|---|---|---|
| `authoring-a-skill` | merge | `qs-skill-write` |
| `autonomous-run` | internal | `bounded-autonomous-loop` |
| `autopilot-full` | omit | automatic publication/merging and fleet ownership exceed a bounded root |
| `autopilot-stack` | omit | automatic stack construction/publication exceeds a bounded root |
| `babysit` | public | `ps-pr-babysit` |
| `bug-fix` | merge | `qs-code-debug` |
| `eval` | public | `ps-skill-eval` |
| `feature` | merge | `qs-code-build` |
| `hillclimb` | public | `ps-hillclimb` |
| `investigation` | omit | redundant router over `ps-how`, `ps-why`, and forensics roots |
| `multi-phase-plan` | merge | `qs-plan-roadmap` and `qs-plan-spec` |
| `opening-a-pr` | merge | `qs-git-merge` |
| `orchestrate` | omit | standing multi-day coordinator conflicts with bounded root ownership |
| `pause-safely` | merge | `qs-flow-handoff` |
| `perf-issue` | merge | `qs-code-debug` |
| `prototype` | merge | `qs-design-prototype` |
| `refactoring` | merge | `qs-review-code` |
| `runtime-forensics` | public | `ps-runtime-forensics` |
| `session-pickup` | merge | `qs-flow-handoff` |
| `shipping` | merge | `qs-git-merge` |
| `trace-forensics` | public | `ps-trace-forensics` |
| `visual-parity` | public | `ps-visual-parity` |
| `worktree-cleanup` | public | `ps-worktree-cleanup` |

### Agents: 2

| Candidate | Disposition | Target or reason |
|---|---|---|
| `comment-sicko` | omit | blanket comment-removal agent is not a safe reusable boundary |
| `poteto-agent` | omit | persona/mode wrapper conflicts with host neutrality and one-root runs |

### Benny automation skills: 3

| Candidate | Disposition | Target or reason |
|---|---|---|
| `setup-benny` | dependency | deferred issue-provider and scheduler integration |
| `triage-issue-reports` | dependency | deferred issue-provider integration |
| `reproduce-and-fix-issues` | dependency | deferred issue, verification-driver, and scheduler integration |

Disposition totals are exact: 12 public + 16 internal + 30 merge + 4 dependency + 10 omit = 72. `ps-help` is repository-authored and therefore is not counted among upstream candidates.

## Validation contract

### Pre-implementation baseline gate

Do not accept a red repository suite as the PS baseline. Before adding `scripts/ps-skill-catalog.mjs` or any canonical `ps-*` source, restore a trustworthy test execution environment and obtain one green repository-wide run.

The detailed implementation contract is [PS-00 hermetic test baseline and safe Git readability](./ps-00-hermetic-test-baseline.md).

The observed pre-implementation failures do not currently justify product or readout repairs:

- inherited `QS_READOUT_HARNESS`, `QS_READOUT_INGESTION_URL`, `QS_READOUT_PRODUCER_ID`, `QS_READOUT_PRODUCER_TOKEN`, and `QS_READOUT_PUBLISH_PROJECTS` values leak host configuration into tests that expect isolated fixtures;
- this checkout's `.git/config` is unreadable by the test user, preventing origin discovery, current-project selection, hosted publication authorization, Git evidence capture, GitHub issue observation, and Changesets divergence checks;
- removing the inherited reporting variables reduced the isolated `qs-skills` failures from eight to four;
- supplying the verified current-project identity directly made the affected Workbench selection and activity-ordering assertions pass;
- the core v3 contract suite passes independently.

Resolve the baseline through test/environment isolation, not by weakening assertions or changing production behavior to accommodate the broken checkout. The gate is satisfied only when:

1. the ordinary test user can read the repository's local Git configuration and resolve `origin`, `HEAD`, and `main`;
2. the repository test entrypoint isolates ambient `QS_READOUT_*` producer/runtime variables unless a test explicitly supplies them;
3. `npm run changeset -- status` succeeds against the actual repository;
4. `npm run check:codex` passes;
5. an ordinary `npm test` run passes without ad hoc shell cleanup; and
6. any failure that remains after those corrections is treated as a real pre-existing defect and repaired before PS changes touch the same subsystem.

This is a prerequisite ticket, not an accepted permanent exception. It changes neither PS scope nor the 72-candidate disposition.

Implementation is acceptable only when all of the following are automated or explicitly recorded:

1. The PS catalog contains exactly thirteen public commands in the specified lifecycle order.
2. Every public name starts with `ps-`, every Codex literal starts with `$ps-skills:`, every Claude literal is `/ps-*`, and every command is explicit-only in v1.
3. The pinned fixture contains exactly 72 unique upstream candidate IDs and every ID has exactly one allowed disposition.
4. Disposition counts are exactly 12 public, 16 internal, 30 merge, 4 dependency, and 10 omit.
5. Every public disposition targets one of the twelve upstream-derived public commands; `ps-help` is separately marked repository-authored.
6. QS membership remains exactly twelve core and seven specialist commands, in the existing order.
7. No PS public command automatically invokes another public command or creates another root report.
8. Canonical and generated PS content contains no host-specific API, path, command, model, agent, or stack-tool references outside allowlisted provenance/license fields.
9. Every PS command has matching canonical folder, frontmatter name, OpenAI metadata, invocation policy, docs page, report profile, continuations, and exactly one package projection.
10. Generated Claude and Codex PS projections are deterministic, self-contained, and source-synchronized.
11. Both PS projections contain the exact Lauren Tan MIT notice and no upstream agent or Benny assets.
12. The readout runtime recognizes PS as a native collection, renders `$ps-skills:` prompts, preserves QS behavior, and rejects unknown or ambiguous collection identities.
13. Behavioral fixtures exercise the safety boundaries for runtime diagnosis, trace handling, verification assets, blinded evaluation with optional scoped history, bounded optimization, immutable visual baselines with declared tolerances, PR mutation/publication, and worktree-first destructive cleanup.
14. `npm run sync:codex`, `npm run check:codex`, and `npm test` pass from a clean generated state.
15. When Claude Code is available, strict validation passes for `.`, `packages/qs-specialists`, and `packages/ps-skills`.

## Acceptance criteria

- One optional `ps-skills` package installs independently in Claude and Codex.
- It exposes exactly the thirteen specified commands and no agents.
- All thirteen commands are explicit-only in v1.
- The QS 12/7 package contract is unchanged.
- All 72 pinned upstream candidates have a tested, unique disposition with exact totals.
- The pre-implementation baseline gate is green before the first PS catalog or command change lands.
- Canonical PS content is host-neutral and the generated projections contain no disallowed host references.
- All public runs obey one-root reporting and never chain automatically.
- Destructive or externally mutating operations are bounded by explicit authority and exact targets.
- Cross-package continuation literals render correctly without importing or invoking another package's skill body.
- License, attribution, provenance, catalogs, docs, manifests, marketplaces, and generated projections are consistent.
- Required repository checks pass, and no publication or release occurs during implementation.

## Rollback

Because the package is additive, rollback removes the PS package record, canonical PS source, PS catalog, PS docs, PS projections, marketplace entries, PS-only tests, and its notice stanza. Shared registry changes may be reverted only if the existing QS test suite proves byte-for-byte-equivalent behavior. No rollback may alter the QS 12/7 membership or remove the pre-existing Matt Pocock attribution.
