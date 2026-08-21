# Ticket plan: Cursor-neutral `ps-skills` incorporation

> Historical implementation record — the hosted-output ticket is superseded by the direct-chat completion contract. The fixed PS inventory, package isolation, and safety boundaries remain applicable.

Status: Implemented (2026-08-19)

Source specification: [Cursor-neutral pstack incorporation as `ps-skills`](./pstack-skills-incorporation.md)

Implementation rule: complete tickets in dependency order. A ticket is complete only when its scoped acceptance evidence passes. Do not publish, merge, deploy, or release as part of this plan.

## Dependency graph

```text
PS-00
└── PS-01
    ├── PS-02 ── PS-03
    │        └── PS-07
    ├── PS-04
    ├── PS-05
    └── PS-06

PS-04 + PS-07 ── PS-08
               ├─ PS-09 ── PS-10
               ├─ PS-11
               ├─ PS-12
               ├─ PS-13
               ├─ PS-14
               └─ PS-15

PS-03 + PS-05 + PS-06 + PS-08..PS-15 ── PS-16
PS-03 + PS-07..PS-16 ── PS-17 ── PS-18
PS-16 + PS-17 + PS-18 ── PS-19
```

Tickets on the same branch of the graph may be implemented independently after their shared dependencies are complete. The dependency frontier is explicit to avoid creating command bodies before the catalog, shared runtime, and safety boundaries can validate them.

## PS-00 — Restore a trustworthy green repository baseline

Status: Complete (2026-08-19)

Blocked by: none

Detailed specification: [PS-00 hermetic test baseline and safe Git readability](./ps-00-hermetic-test-baseline.md)

Outcome: the ordinary repository test entrypoint runs in a hermetic environment with readable Git identity and passes before any PS implementation begins.

Scope:

- Restore safe ownership/readability of this checkout's `.git/config` for the ordinary test user without broadening it beyond what Git requires.
- Verify that `origin`, `HEAD`, `main`, branch/revision state, and Changesets divergence can be resolved.
- Isolate inherited `QS_READOUT_HARNESS`, `QS_READOUT_INGESTION_URL`, `QS_READOUT_PRODUCER_ID`, `QS_READOUT_PRODUCER_TOKEN`, and `QS_READOUT_PUBLISH_PROJECTS` values at the repository test-entrypoint boundary.
- Preserve tests that explicitly install their own reporting variables.
- Rerun the complete suite through the ordinary documented commands.
- If a failure survives both environment corrections, classify it as an actual pre-existing defect and repair it before PS work touches that subsystem.

Exclusions:

- Do not weaken, skip, snapshot over, or delete failing assertions.
- Do not change production readout, Workbench, GitHub, or Changesets behavior merely to accommodate an unreadable checkout or ambient secrets.
- Do not begin the PS catalog or command implementation in this ticket.

Acceptance evidence:

- `git remote get-url origin`, `git branch --show-current`, and `git rev-parse HEAD` succeed for the ordinary test user.
- `npm run changeset -- status` succeeds.
- `npm run check:codex` succeeds.
- An ordinary `npm test` succeeds without a manually prefixed environment-cleanup command.
- A focused test proves that ambient `QS_READOUT_*` values cannot contaminate fixture-owned reporting configuration.
- No credential value is printed or persisted in test output.

## PS-01 — Establish the PS catalog and pinned disposition ledger

Status: Complete (2026-08-19)

Blocked by: PS-00

Outcome: one authoritative PS catalog records package identity, the exact thirteen-command lifecycle, the pinned upstream provenance, all 72 candidate dispositions, internal capability ownership, report profiles, and continuation metadata.

Scope:

- Add `scripts/ps-skill-catalog.mjs`.
- Add `tests/fixtures/pstack-0.14.1-inventory.json` from the pinned commit.
- Encode the exact public/internal/merge/dependency/omit mappings from the specification.
- Represent the new `ps-help` command as repository-authored, outside the 72-candidate count.
- Encode all thirteen commands as explicit-only in v1.
- Export validation functions analogous to the QS catalog without importing or modifying QS membership.

Exclusions:

- Do not create command folders, docs, manifests, or package projections.
- Do not fetch upstream at test time.

Acceptance evidence:

- A focused catalog test proves 13 ordered public commands.
- A focused invocation-policy test proves all thirteen commands are explicit-only.
- A focused coverage test proves 72 unique fixture IDs, one disposition each, and totals 12/16/30/4/10.
- The catalog records pstack `0.14.1`, the exact commit, repository URL, and Lauren Tan attribution.
- Importing `scripts/qs-skill-catalog.mjs` still yields exactly twelve core and seven specialist commands.

## PS-02 — Generalize shared collection and command-literal lookup

Status: Complete (2026-08-19)

Blocked by: PS-01

Outcome: shared tooling resolves QS and PS commands through collection metadata instead of prefix or two-package assumptions.

Scope:

- Add `scripts/skill-collection-registry.mjs`.
- Register the existing QS catalog and new PS catalog without changing either catalog's membership.
- Resolve public skill identity, distribution, collection, report profile, continuations, and exact Codex/Claude literals.
- Reject duplicate command names, duplicate package literals, missing targets, and ambiguous identities.
- Preserve compatibility exports where existing tests or scripts still import QS helpers directly.

Exclusions:

- Do not change readout rendering or package generation yet.
- Do not import public skill bodies across packages.

Acceptance evidence:

- Focused tests resolve `$qs-skills:qs-help`, `$qs-specialists:qs-plan-research`, and `$ps-skills:ps-how` correctly.
- Unknown and duplicate commands fail deterministically.
- QS catalog tests remain unchanged and passing.

## PS-03 — Make package projection and marketplaces data-driven

Status: Complete (2026-08-19)

Blocked by: PS-01, PS-02

Outcome: the existing projector can generate three isolated packages from explicit package records, including `ps-skills`, without package-name conditionals.

Scope:

- Extend `scripts/sync-codex-plugin.mjs` package records with canonical roots, documentation roots, catalogs, capability files, support files, notices, manifest metadata, and marketplace sources.
- Add generated Claude root `packages/ps-skills/`.
- Add generated Codex root `codex/plugins/ps-skills/`.
- Add PS entries to both marketplaces.
- Ensure all manifests use the repository version and explicit package metadata.
- Copy only declared capabilities and notices into each projection.

Exclusions:

- Do not hand-edit generated package content.
- Do not include upstream agents, Benny assets, or QS skill bodies in PS projections.

Acceptance evidence:

- A projector check detects missing, extra, stale, or symlinked PS files.
- Both marketplaces expose exactly three packages with correct local sources.
- Existing QS projections remain source-synchronized.
- PS generation can start with placeholder command sources only after the relevant command tickets land; until then the focused projector test may use fixtures.

## PS-04 — Author the sixteen PS internal capabilities

Status: Complete (2026-08-19)

Blocked by: PS-01

Outcome: reusable pstack techniques exist as concise, host-neutral, non-command capability documents with explicit owners and safety boundaries.

Scope:

- Add the sixteen files specified under `skills/pstack/internal/`.
- Give each capability a purpose, entry conditions, method, stop conditions, evidence contract, and public owners.
- Describe subagent use as optional and bounded; inherit the parent model by default.
- Keep decision trails and temporary evidence inside the root run.

Exclusions:

- No `SKILL.md`, public metadata, command literal, report, or continuation for an internal capability.
- No host-specific task API or model names.

Acceptance evidence:

- A catalog test proves exactly sixteen capabilities and valid public owners.
- A static test proves no capability is installable or appears in marketplace/package skill lists.
- Portability scanning passes for all capability files.

## PS-05 — Merge planning, design, teaching, and authoring lessons into QS owners

Status: Complete (2026-08-19)

Blocked by: PS-01

Outcome: the planning- and knowledge-oriented merge dispositions improve existing QS owners without adding public surface area or a PS dependency.

Scope:

- Adapt the mapped concerns into `qs-plan-clarify`, `qs-plan-roadmap`, `qs-plan-spec`, internal domain/module decomposition, `qs-design-prototype`, `qs-code-document`, `qs-learn-teach`, and `qs-skill-write`.
- Rewrite `never-block-on-the-human` as authority-aware progress: continue only with safe, in-scope assumptions; otherwise request input.
- Paraphrase technical-writing guidance and cite primary standards where appropriate.
- Update only necessary documentation and tests.

Exclusions:

- No aliases or new QS commands.
- No automatic public-skill invocation.
- No references requiring the PS package to be installed.

Acceptance evidence:

- Each relevant merge disposition has at least one canonical owner assertion.
- QS membership remains exactly 12/7.
- Existing owner behavior and output-contract tests pass.

## PS-06 — Merge build, debug, review, verification, Git, and handoff lessons into QS owners

Status: Complete (2026-08-19)

Blocked by: PS-01

Outcome: implementation- and delivery-oriented merge dispositions strengthen existing QS behavior without duplicating pstack playbooks.

Scope:

- Adapt the mapped concerns into `qs-code-build`, internal `tdd-loop`, `qs-code-debug`, `qs-review-code`, `qs-test-verify`, the shared run contract, `qs-git-merge`, and `qs-flow-handoff`.
- Preserve the selected root's mutation and publication authority.
- Make real-artifact proof, caller migration, subtractive review, and resumable evidence explicit where missing.

Exclusions:

- No automatic route to another public command.
- No automatic PR opening, merging, stack operations, or release.

Acceptance evidence:

- Each relevant merge disposition has at least one canonical owner assertion.
- Failed checks and actionable P0/P1 findings still prohibit `complete`.
- QS output-contract and behavioral tests pass.

## PS-07 — Make hosted readouts collection-aware

Status: Complete (2026-08-19)

Blocked by: PS-02

Outcome: PS commands render as native QuickStark collection reports with exact `$ps-skills:` prompts while all existing QS readouts remain compatible.

Scope:

- Replace direct QS-only catalog imports in the shared readout path with collection-registry lookup.
- Record native collection identity in normalized reports and ingestion envelopes.
- Generalize safe report filenames to registered collection prefixes.
- Render PS display metadata, profiles, prompts, gallery filters, and Workbench details as native skills.
- Preserve backward compatibility for existing QS v1 reports and externally ingested skills.
- Keep hosted publication, credential validation, immutable artifacts, and canonical URL rules unchanged.

Exclusions:

- No new report host, endpoint, or authentication flow.
- No local or private URL fallback for actual runs.

Acceptance evidence:

- Existing QS readout tests pass without changed expected behavior.
- Focused tests render a PS preview and normalized PS result with `$ps-skills:` continuations.
- Unknown, mismatched, or ambiguous collection identity is rejected.
- Hosted envelopes preserve immutable skill and collection identity.

## PS-08 — Author `ps-help`, `ps-how`, and `ps-why`

Status: Complete (2026-08-19)

Blocked by: PS-04, PS-07

Outcome: the PS package has a non-executing router and two evidence-based understanding commands.

Scope:

- Add canonical command folders, `SKILL.md`, and `agents/openai.yaml` for the three commands.
- Implement the v1 invocation policy: all three commands are explicit-only.
- Make facts, inferences, uncertainty, source attribution, and missing-adapter behavior explicit.
- Generate output contracts and documentation pages through shared tooling.

Exclusions:

- `ps-help` must not invoke the selected workflow.
- `ps-why` must not require any particular issue, chat, or observability provider.

Acceptance evidence:

- Metadata names, prompts, invocation policy, lifecycle positions, profiles, and continuations match the catalog.
- Fixture runs produce one result, one root `skillsUsed` entry, one PS readout, and exactly three prompts.
- Read-only behavior is tested.

## PS-09 — Author `ps-blast-radius`

Status: Complete (2026-08-19)

Blocked by: PS-04, PS-07

Outcome: one proposed change can be traced across callers, contracts, data, tests, and operations with at least one directly proven critical safety claim.

Scope:

- Add canonical command source and metadata.
- Define explicit scope resolution, impact categories, evidence ranking, and unproven-claim handling.
- Use internal domain, boundary, type, and parallel-coverage capabilities when relevant.

Exclusions:

- No implementation, repair, or speculative expansion beyond the selected change.

Acceptance evidence:

- A fixture with executable proof reports the verified invariant.
- A fixture without proof labels the safety claim unproven and cannot claim complete proof.
- One-root and read-only tests pass.

## PS-10 — Author runtime and trace forensics commands

Status: Complete (2026-08-19)

Blocked by: PS-09

Outcome: live symptoms and captured artifacts have separate, diagnosis-only public roots with bounded evidence handling.

Scope:

- Add `ps-runtime-forensics` and `ps-trace-forensics` canonical sources and metadata.
- Define baseline, measurement, artifact handling, hypothesis, falsification, diagnosis, and stop conditions.
- Permit temporary non-product artifacts and existing instrumentation.
- Return `continuation-required` when tracked product instrumentation or repair is needed.

Exclusions:

- No product repair, durable instrumentation edit, secret-bearing report content, or automatic debug invocation.

Acceptance evidence:

- Runtime and trace fixtures remain distinct and route to their specified report profiles.
- A repair-required fixture stops before mutation and recommends `qs-code-debug`.
- Sensitive artifact-path and content redaction tests pass.

## PS-11 — Author verification-skill creation and maintenance commands

Status: Complete (2026-08-19)

Blocked by: PS-04, PS-07

Outcome: repositories can create and maintain a real-harness verification workflow without changing product behavior or assuming a host-specific skill directory.

Scope:

- Add both canonical command sources and metadata.
- Define repository convention discovery, verification-driver interface, feature-map schema, rerunnable checks, and drift reconciliation.
- Separate verification defects from product defects.
- Limit writes to explicitly selected project-local verification assets.

Exclusions:

- No product-source repairs.
- No automatic PR creation or follow-on command.

Acceptance evidence:

- Fixtures cover a declared local-skill convention, a generic verification directory, missing harness input, and a drifting feature map.
- File-scope tests reject product-source changes.
- Create and maintain profiles and continuations render correctly.

## PS-12 — Author `ps-skill-eval`

Status: Complete (2026-08-19)

Blocked by: PS-04, PS-07

Outcome: a skill or prompt variant can be compared with a control through declared, blinded, reproducible trials.

Scope:

- Add canonical command source and metadata.
- Define control/variant isolation, task-set selection, rubric, randomized/blinded scoring, retry policy, budget, and stopping rule.
- Make observable trial inputs, outputs, and checks sufficient evidence without transcript access.
- Permit transcript or run-history evidence only through an optional adapter when the user explicitly selects its source and scope.
- Store only bounded evaluation fixtures and results.

Exclusions:

- No hidden model switching, performance claims without measurements, cross-workspace history scan, assumed private transcript access, or change to unrelated skill sources.

Acceptance evidence:

- Deterministic fixtures prove control/variant isolation and score aggregation.
- Fixtures prove evaluation succeeds without a history adapter and rejects unselected or over-broad transcript scope.
- Failed trials remain visible rather than being silently retried away.
- Mutation-scope and one-root tests pass.

## PS-13 — Author `ps-hillclimb`

Status: Complete (2026-08-19)

Blocked by: PS-04, PS-07

Outcome: one selected metric can improve through a bounded experiment ledger with honest baselines, rollback, and no publication side effects.

Scope:

- Add canonical command source and metadata.
- Require metric, baseline, target, experiment budget, measurement command, accepted-change rule, and rollback criterion.
- Record each hypothesis, change, result, and keep/revert decision.
- Use bounded autonomous looping only within the declared budget.

Exclusions:

- No commit, push, PR, merge, deploy, release, or unrelated optimization.

Acceptance evidence:

- Fixtures cover improvement, regression/rollback, noisy measurement, exhausted budget, and missing baseline.
- External publication commands are rejected by behavioral tests.
- Only the declared implementation scope changes.

## PS-14 — Author `ps-visual-parity`

Status: Complete (2026-08-19)

Blocked by: PS-04, PS-07

Outcome: a selected implementation can converge toward a verified visual baseline through repeatable, honest comparisons.

Scope:

- Add canonical command source and metadata.
- Define baseline identity, capture environment, comparison metric, repository-declared or user-approved tolerance, iteration budget, and residual mismatch reporting.
- Return `input-required` before implementation edits when neither the repository nor the user supplies a tolerance; never invent a universal threshold.
- Reuse a detected repository browser or screenshot harness through the verification-driver interface.

Exclusions:

- No modification, regeneration, rescaling, cropping, or replacement of the baseline.
- No claim of exact parity based only on subjective inspection.
- No completion claim when the measured residual exceeds the declared tolerance.

Acceptance evidence:

- Tests fail when the baseline hash changes.
- Fixtures cover zero-tolerance exact match, within-tolerance completion, above-tolerance residual mismatch, missing tolerance, missing assets/fonts, and capture-environment drift.
- Every comparison result records the metric, tolerance, and measured residual.
- Changes remain inside the selected implementation scope.

## PS-15 — Author safe PR babysitting and worktree cleanup commands

Status: Complete (2026-08-19)

Blocked by: PS-04, PS-07

Outcome: the two operational roots expose strong authority boundaries for external mutation and destructive cleanup.

Scope:

- Add `ps-pr-babysit` and `ps-worktree-cleanup` canonical sources and metadata.
- For PR babysitting, resolve exact PR/head/check/review state and distinguish inspect-only from authorized repair/push.
- For cleanup, default to worktrees only and require a read-only audit followed by exact-target confirmation.
- Treat simulators, application state, and package or build caches as named secondary scopes that require explicit request, their own audit, and separate confirmation.
- Define bounded wait behavior, stop conditions, and recovery reporting.

Exclusions:

- PR babysitting never merges, enables merge-when-ready, changes stack topology, deploys, or releases.
- Cleanup never deletes from a broad root, unresolved path, glob, dirty/unmerged worktree without exact confirmation, or inferred target list.
- Worktree approval never authorizes simulator, application-state, package-cache, or build-cache removal.

Acceptance evidence:

- Inspect-only PR fixtures cannot mutate or push.
- Authorized repair fixtures remain on the selected PR branch and still cannot merge.
- Cleanup fixtures prove the worktree-only default, audit-before-delete, confirmation binding, dirty/unmerged protection, explicit target resolution, separate secondary-scope authorization, and removal reporting.
- Cancellation and timeout produce honest non-complete states.

## PS-16 — Generate PS docs, indexes, output contracts, and notices

Status: Complete (2026-08-19)

Blocked by: PS-03, PS-05, PS-06, PS-08, PS-09, PS-10, PS-11, PS-12, PS-13, PS-14, PS-15

Outcome: every PS command has concise generated documentation and completion text, and repository-level docs describe the optional package without weakening QS contracts.

Scope:

- Generalize documentation and output-contract generators to registered collections and configurable docs roots.
- Add `docs/pstack/index.md` and thirteen generated command pages.
- Update README installation/usage, architecture, contributing guidance, AGENTS/CLAUDE/CONTEXT summaries, and changelog as appropriate.
- Add `THIRD_PARTY_NOTICES.md` with the full required pstack notice and preserve existing attribution.
- Copy the notice into both PS projections.

Exclusions:

- Do not hand-edit generated completion sections or generated package copies.
- Do not describe PS as part of the default QS core.

Acceptance evidence:

- Documentation checks detect stale pages, indexes, completion sections, or notices.
- Root documentation consistently states 12 core, 7 specialist, and 13 optional PS commands.
- Every PS page states one-root behavior and correct install/literal syntax.

## PS-17 — Add catalog, portability, projection, and licensing tests

Status: Complete (2026-08-19)

Blocked by: PS-03, PS-08, PS-09, PS-10, PS-11, PS-12, PS-13, PS-14, PS-15, PS-16

Outcome: structural regressions in membership, dispositions, host neutrality, package isolation, source synchronization, and attribution fail locally.

Scope:

- Add exact 13-command and lifecycle tests.
- Add exact 72-candidate coverage and disposition-total tests.
- Assert every public name, literal, frontmatter name, metadata prompt, explicit-only invocation policy, profile, and continuation.
- Add static forbidden-reference scans with narrow provenance/license allowlists.
- Assert no automatic public invocation language or executable chaining contract.
- Verify deterministic Claude/Codex PS projections, marketplace entries, versions, excluded assets, and byte-identical notice text.
- Assert unchanged QS 12/7 membership.

Exclusions:

- Do not rely on network access or current upstream main.

Acceptance evidence:

- Each test fails against a deliberate local fixture violation and passes against canonical source.
- Existing QS structural tests remain passing.

## PS-18 — Add behavioral safety and readout tests

Status: Complete (2026-08-19)

Blocked by: PS-07, PS-08, PS-09, PS-10, PS-11, PS-12, PS-13, PS-14, PS-15

Outcome: the highest-risk PS behaviors are verified with deterministic harnesses, including collection-aware readouts and authority gates.

Scope:

- Add normalized-result fixtures for all thirteen roots and all four completion states where meaningful.
- Verify only the root command appears in `skillsUsed`.
- Verify exactly three ranked prompts and correct PS/QS literals.
- Cover diagnosis-only behavior, verification write boundaries, blinded evaluation without required transcript access, scoped optional history, metric rollback, immutable visual baselines with declared tolerances, PR authority, wait cancellation, worktree-only defaults, and exact secondary-scope cleanup confirmation.
- Add regression coverage for existing QS readouts and external-skill ingestion.

Exclusions:

- No live external mutation, destructive filesystem test, real PR merge, or hosted credential requirement in unit tests.

Acceptance evidence:

- Tests use disposable fixtures and fakes for all external/destructive boundaries.
- Failed required checks and actionable P0/P1 findings cannot normalize to `complete`.
- PS hosted envelope tests validate exact native collection identity.

## PS-19 — Synchronize, validate, and prepare the additive release

Status: Complete (2026-08-19)

Blocked by: PS-16, PS-17, PS-18

Outcome: canonical sources and all generated outputs are synchronized, the repository passes its complete validation suite, and the change is ready for a separately authorized release workflow.

Scope:

- Run `npm run sync:codex`.
- Run `npm run check:codex`.
- Run `npm test`.
- When available, run strict Claude validation for `.`, `packages/qs-specialists`, and `packages/ps-skills`.
- Inspect the final diff for generated/source drift, package leakage, unintended QS membership changes, upstream artifacts, and secrets.
- Add the repository-standard changeset or version note if required, keeping every manifest and lockfile on one version.

Exclusions:

- No commit, push, PR, merge, package publication, deployment, or release unless separately requested.

Acceptance evidence:

- All required commands pass from the synchronized tree.
- Strict Claude validation passes or is recorded as unavailable, not silently skipped.
- Final inventory reports exactly 12 QS core, 7 QS specialists, 13 PS commands, 16 PS internal capabilities, and 72 classified upstream candidates.
- The final diff contains no ungenerated edits under package projection roots.

## Recommended implementation slices

The safest execution sequence is:

1. PS-00 establishes a green, hermetic repository baseline.
2. PS-01 through PS-04 establish catalogs, registry, package seams, and internal vocabulary.
3. PS-05 and PS-06 land the non-public QS merges independently.
4. PS-07 makes the shared reporting contract collection-aware before command content depends on it.
5. PS-08 through PS-15 add public roots in small outcome families, with high-authority operations last.
6. PS-16 synchronizes user-facing documentation and notices.
7. PS-17 and PS-18 close structural and behavioral gaps.
8. PS-19 performs the repository-wide clean-generation and validation gate.

This sequence allows a reviewer to stop after any ticket with a coherent, verified repository state. No ticket relies on an automatic public-skill hop, and no ticket broadens authority beyond its own declared scope.
