# Skill review by source — 2026-09-25

This is an analysis and adoption backlog, not a specification declaring migrations
complete. The [source index](./README.md) records all six repositories, immutable
baselines, reviewed revisions, licenses and the eighteen contributor path mappings.
Reviewed and adopted revisions are different facts. No source pin, public skill,
package identity, installed copy or version was changed by this analysis.

The resulting [adoption specification](../specs/quickstark-upstream-adoption.md)
turns groups A–E into required behavior, package boundaries, migration order and
acceptance criteria. The review remains the source comparison; the specification
records the implementation decisions.

## Direction

Keep meaningful user intents separate. Put frequently used commands in the QS
namespace, keep technical detail in conditionally loaded modules, and retain
optional specialists when they produce a distinct result or require distinct
evidence. There is no numerical target for the total collection. Installation
profiles and package selection should control menu size without deleting useful
capabilities. Do not equate a QS command name with membership in the default core.

- Preserve `qs-deploy-prompt`, `qs-skill-write` and the planning workflows.
  Generating an execution prompt, writing a reusable skill, and executing work
  have different outputs and authority. Frontend image prompts and HyperFrames
  creative prompt expansion also remain available.
- Preserve visual parity as a dedicated specialist, with `qs-visual-parity` a
  proposed name. Its original reference, fixed tolerance and residual differences
  must survive; it must not become a generic “make this prettier” mode.
- Do not delete pstack wholesale. Consolidate genuinely duplicated routing and
  consider related create/maintain modes; retain forensic, evaluation,
  optimization, monitoring and parity contracts where they differ.
- Do not concatenate the nine HyperFrames skills. Consolidate entry points only
  after routing and rendering trials, with all necessary modules, references,
  scripts and dependencies preserved.
- Preserve original identities in provenance even when public names change.
  Independently managed vendor plugins remain outside this repository's naming
  migration; this review cannot promise a total count for the entire host menu.

## Findings with the highest practical value

1. **Resolve local contradictions before adding upstream prose.** `qs-help`
   recommends one root in its opening but three commands and prompts in its
   routing rules. `qs-flow-handoff` retains alternatives alongside the shared
   one-prompt contract. Prototype helper files retain production-promotion advice
   that conflicts with the disposable public root. Conditional reference loading
   needs an authority check, not just shorter files.
2. **Reduce repeated reporting instructions carefully.** The generated completion
   section dominates several small workflows. Consolidate repeated wording in
   the generator, while keeping progress, evidence, failure, scope and continuation
   rules available wherever the skill runs. Preserve the recently added weighted
   progress behavior. Repository trial fixtures bind to exact source hashes;
   fresh actual model trials are required after changing these instructions.
3. **Apply selective correctness improvements.** Useful candidates include debug
   artifact redaction, revisiting failed premises, independently derived test
   expectations, expand/migrate/contract refactor slices, conditional reference
   pointers and source-bound worker evidence. Existing concise adaptations already
   cover many upstream changes; do not add a public command for every principle.
4. **Treat HyperFrames as a dependency migration.** All nine managed directories
   changed. Media helpers moved into CLI commands, process references moved between
   modules, runtime conventions changed, and named workflows can install further
   skills. Updating names or `SKILL.md` alone is insufficient.
5. **Separate frontend style from task intent.** Seven unchanged upstream skills
   still contain local opportunities: select style presets, distinguish image-only
   output from code, and keep reference fidelity separate from creative redesign.

## Measured efficiency baseline

Counts below use whitespace-delimited words, not model tokens. “Before completion”
includes frontmatter, title and workflow. Counts cover canonical `SKILL.md` text
at repository HEAD `5d0d0ba`, not the tokens loaded in a particular run.

| Skill | Before completion section | Completion section | Completion share |
| --- | ---: | ---: | ---: |
| `qs-code-debug` | 236 | 1,149 | 83% |
| `qs-skill-write` | 131 | 1,155 | 90% |
| `ps-how` | 115 | 922 | 89% |

These figures identify a compression candidate, not a demonstrated speed or
quality improvement. Measure loaded tokens, tool/image calls, latency and task
outcomes on the same scenarios before and after changes. Keep rules for authority,
failed checks and completion in the root; move examples and uncommon branches
behind explicit pointers. Do not remove an instruction solely because a capable
model sometimes follows it without prompting.

The relevant generators are [progress reporting](../../scripts/progress-reporting-contract.mjs)
and [completion contracts](../../scripts/sync-skill-output-contracts.mjs).
[Deployment-prompt tests](../../tests/deploy-prompt.test.mjs) bind actual recorded
generation/execution responses to source hashes. Updating hashes without fresh
responses would discard that evidence. Preserve cancellation, weighted progress,
waiting/resumption, changed scope, no automatic execution, publication boundaries
and recovery behavior in the comparison.

## HyperFrames consolidation risk

The nine installed roots currently contain 12,239 whitespace-delimited words in
their `SKILL.md` files and 419 files across their directories. These are source
footprint counts, not a claim that every invocation loads them all. The existing
design already loads domain references on demand.

| Risk | Why it matters | Required preservation evidence |
| --- | --- | --- |
| Missed domain routing | “Zoom and fade the music” needs composition, keyframe and audio contracts together. | Mixed-edit cases load every required domain and do not rerun fresh-project intake. |
| Lost script/reference dependencies | Local imports, relative media paths and process documents span directories. | Isolated installed-layout checks; no dependency on the upstream repository checkout. |
| Skills/runtime mismatch | Media resolution moved to CLI commands; canvas and audio conventions changed. | A declared compatible CLI version plus actual check/render/audio trials. |
| Changed output | New carve strength and render quality options affect sound and delivery. | Audition/render comparison with deliberate acceptance of differences. |
| Menu grows again | Router calls `hyperframes skills update <workflow>`, installing/refreshing dependencies outside the nine managed entries. | Inventory transitive workflows; package compatible private modules or explicitly managed optional additions. |
| Hidden side effects | Upstream asks for feedback submission and automatic project-pin upgrades. | QS adaptation respects task authority and does not treat a search miss or render request as permission to send reports or upgrade a project. |

A concise QS video entry backed by intact private modules is a candidate. Retain
separate direct audio/render entries if actual usage and routing trials justify
them. First prove fresh creation, resume, render-only, caption-only, mixed editing,
asset failure, random seek and sub-composition cases. A successful static lint is
not proof of identical frames or an intelligible audio mix.

## Namespace and provenance migration requirements

Current catalogs own membership and identity. Change them before renaming public
folders or metadata. The present 12 core / 8 specialist / 13 PS package constraints
remain in force until the catalogs, validators, indexes, manifests and projections
are migrated together. Proposed names in this review are not aliases to install
alongside old commands.

The contributor manifest currently identifies exact upstream directories and
digests. Renaming their frontmatter creates adapted content: preserve the upstream
name/path/revision/digest and track the derived identity separately. Do not relabel
modified bytes as an unchanged upstream pin. For each adopted change, record:

| Provenance field | Purpose |
| --- | --- |
| QS owner and public/private role | Where the capability now lives |
| Original repository, name and path | Where it originated, including multiple contributing sources |
| Original baseline, reviewed revision, adopted revision | Which comparison was made and what actually shipped |
| Disposition and adaptation notes | Kept, merged, renamed, split or intentionally omitted behavior |
| License and retained notices | Preserve source attribution alongside private modules and packages |
| Source digest and derived-content identity | Distinguish upstream integrity from local adaptation |
| Compatibility and verification evidence | Supported runtime/host and demonstrated preservation |

The [current reconciler](../../scripts/personal-skills/reconcile.mjs) plans desired
names but has no general retirement operation for removed names. A simple rename
can leave both old and new commands installed. Migration must detect owned,
unchanged old copies; preserve locally modified or independently managed copies;
update links/locks; and support rollback. Test all three harness projections and
the no-duplicate case. Codex's explicit-invocation compatibility exception means
frontmatter flags alone cannot hide private modules: exclude them from command
catalogs and package them as references, without public-root chaining.

## Source batches

The following entries cover all 33 current QS/PS public commands and eighteen
managed contributor skills, plus the twenty QS/PS internal capabilities. Each
entry separates a proposed disposition from preservation and acceptance evidence.
Checks described here are **proposed adoption checks**, not claims that migrated
skills or updated external runtimes were exercised in this review.

### Batch 1 — QuickStark and Matt Pocock

Twenty public commands and four private techniques. Public mappings preserve historical names; the renamed upstream writing-for-agents is a successor, not a rewrite of original provenance. PS influences are named where already incorporated. Mandatory TDD seam approvals/no-refactor and domain context-map concepts predate this review interval; they are existing divergences, not new upstream updates.

| Current identity | Origin | Proposed disposition |
| --- | --- | --- |
| `qs-help` | Matt ask-matt; QS adaptation | Keep daily QS router; reconcile stale routing text |
| `qs-setup` | Matt setup-matt-pocock-skills; QS adaptation | Keep daily QS setup |
| `qs-plan-clarify` | Matt grill-with-docs, absorbed grill-me/grilling; PS never-block-on-human adaptation | Keep dedicated planning root |
| `qs-plan-roadmap` | Matt wayfinder; PS figure-it-out and multi-phase-plan | Keep separate outcome-sequencing root |
| `qs-plan-spec` | Matt to-spec + to-tickets; PS architect, figure-it-out, foundational-thinking, redesign-from-first-principles, multi-phase-plan | Keep specs and tickets together with internal ticket branch |
| `qs-code-build` | Matt implement; PS feature, tdd, sequence-verifiable-units | Keep daily implementation root |
| `qs-code-debug` | Matt diagnosing-bugs; PS bug-fix, perf-issue, fix-root-causes | Keep daily diagnosis and repair root; high-priority targeted update |
| `qs-review-code` | Matt code-review + absorbed improve-codebase-architecture; PS interrogate, refactoring and review principles | Keep dedicated review/improve/refactor root |
| `qs-git-merge` | Matt resolving-merge-conflicts; PS opening-a-pr, shipping, sequence-verifiable-units | Keep daily integration/publication root |
| `qs-deploy-release` | Repository authored QS; no Matt upstreamName | Keep separate terminal release command |
| `qs-flow-triage` | Matt triage; QS bounded adaptation | Keep daily incoming-work route |
| `qs-flow-handoff` | Matt handoff; PS pause-safely/session-pickup | Keep daily handoff root; reconcile stale alternatives |
| `qs-plan-research` | Matt research; QS adaptation | Keep independent research specialist |
| `qs-design-prototype` | Matt prototype; PS prototype and exhaust-the-design-space | Keep standalone prototype; update conditional helpers |
| `qs-code-document` | Repository authored QS; PS technical-writing guidance | Keep specialist; clarify evidence/provenance integration |
| `qs-test-author` | Repository authored QS | Keep standalone test-authoring specialist |
| `qs-test-verify` | Repository authored QS; PS prove-it-works | Keep standalone read-only verification specialist |
| `qs-learn-teach` | Matt teach; PS teach | Keep distinct learning specialist |
| `qs-skill-write` | Matt writing-great-skills (current successor writing-for-agents); PS automate-me, reflect, technical-writing, authoring-a-skill | Preserve dedicated QS skill/prompt-building specialist |
| `qs-deploy-prompt` | Repository authored QS | Preserve dedicated QS prompt generator; do not absorb into Build/Release |
| `internal:domain-modeling` | Matt domain-modeling; QS internal adaptation | Keep private under Clarify/Spec/Review |
| `internal:module-decomposition` | Matt codebase-design; PS architect/foundational-thinking | Keep private under Spec/Build/Review |
| `internal:ticket-decomposition` | Matt to-tickets; QS internal adaptation | Keep private; adopt targeted migration update |
| `internal:tdd-loop` | Matt tdd; PS tdd | Keep private; preserve practical red/green/refactor |

#### qs-help

Remove instruction to emit three copy-ready prompts. Also distinguish the primary router answer from ordinary continuation policy: Help can describe all commands but its generated next-route list only permits clarify/triage/setup. Let metadata produce a usable literal for the selected installed root without importing optional skill bodies. Fresh Matt phase-boundaries provides continuity reasoning; do not import fixed 150k context threshold, /clear, /compact or mandatory subagents across hosts.

**Preserve:** One bounded recommendation, installed literal lookup, optional specialists do not become core dependencies.

**Acceptance:** Trials: prompt-authoring request routes to qs-deploy-prompt or qs-skill-write; parity remains discoverable; ordinary route emits at most one actionable prompt.

Evidence: [SKILL.md](../../skills/engineering/qs-help/SKILL.md) — Reviewed current canonical behavior and completion contract.; [PHASE-BOUNDARIES.md](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/ask-matt/PHASE-BOUNDARIES.md) — New continuity decision tree includes host-specific commands and context threshold.


#### qs-setup

No substantive upstream workflow refresh required; latest changes mainly punctuation and removed obsolete qa reference. Add explicit conditional pointers to existing tracker/domain templates after checking their permissions against root; root currently does not name those helper files. Setup is the appropriate owner of any future managed-skill installation/migration, not Help.

**Preserve:** Inspect existing conventions; reversible project-owned config only; no remote-resource creation without authority.

**Acceptance:** Existing-project rerun makes no duplicate blocks; GitHub/GitLab/local layouts stay intact; migration dry run identifies aliases and preserves unrelated installed skills.

Evidence: [SKILL.md](../../skills/engineering/qs-setup/SKILL.md) — Reviewed current canonical behavior and completion contract.; [SKILL.md](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/setup-matt-pocock-skills/SKILL.md) — Reviewed baseline diff; no new material configuration behavior.


#### qs-plan-clarify

Keep evidence-before-question behavior. Fresh grilling changes one question into whole prerequisite-ready rounds and requires exhaustive tree completion and confirmation; do not import wholesale. A bounded batch of independent questions can be optional only when user preference/host supports it, not a replacement for current focused clarification.

**Preserve:** Settled decisions remain settled; material choices requested; reversible investigation continues; no automatic spec/build.

**Acceptance:** Cases with answered questions, missing facts, independent decisions and authority ambiguity; count unnecessary questions and confirm no inferred permission.

Evidence: [SKILL.md](../../skills/engineering/qs-plan-clarify/SKILL.md) — Reviewed current canonical behavior and completion contract.; [SKILL.md](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/productivity/grilling/SKILL.md) — New frontier rounds and subagent lookups are real semantic change.


#### qs-plan-roadmap

No new Matt roadmap policy to adopt beyond source terminology and explicit Skill calls, which conflict with one-root design. Clarify known decision gates versus deliberately unspecific future work and require exact owner/dependency before parallel claims. Avoid automatically creating/closing tracker tickets or resolving every decision during roadmap creation.

**Preserve:** Outcome milestones, alternatives, real dependencies, observable completion evidence.

**Acceptance:** Large initiative with unknown dependencies produces honest decision gates; small task does not acquire artificial phases or ticket side effects.

Evidence: [SKILL.md](../../skills/engineering/qs-plan-roadmap/SKILL.md) — Reviewed current canonical behavior and completion contract.; [SKILL.md](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/wayfinder/SKILL.md) — Reviewed changed lines: mainly typography and explicit public Skill invocations; map/fog distinction predates baseline.


#### qs-plan-spec

Adopt newly explicit expand-contract ticket sequencing through internal reference: add parallel interface, migrate bounded caller batches, remove only after no callers; use integration-branch final verification when isolated batches cannot stay green. Keep specification-only path free of ticket creation.

**Preserve:** Confirmed decisions, testable acceptance evidence, scope and migration impact; no implementation/publication by default.

**Acceptance:** Migration scenario produces dependency-correct expand/migrate/contract graph; isolated-green and integration-only variants state distinct completion gates.

Evidence: [SKILL.md](../../skills/engineering/qs-plan-spec/SKILL.md) — Reviewed current canonical behavior and completion contract.; [SKILL.md](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/to-tickets/SKILL.md) — New wide-refactor exception describes expand-contract and integration-branch final ticket.


#### qs-code-build

No new Matt implement delta; retain local stronger full-outcome ownership. Add conditional acceptance-gate / negative-control guidance for risky work through shared internal references, and avoid repeating broad checks per micro-step once relevant full validation passed. Upstream automatic commit and nested review calls remain deliberate non-adoptions.

**Preserve:** Implementation owns review, repair, meaningful tests and required validation; no handoff merely to finish its job.

**Acceptance:** Known bug cannot pass via no-op test; user-authorized scope completes without skill hopping; unrelated dirty file remains unstaged.

Evidence: [SKILL.md](../../skills/engineering/qs-code-build/SKILL.md) — Reviewed current canonical behavior and completion contract.; [SKILL.md](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/implement/SKILL.md) — Current upstream still invokes public TDD/review and commits current branch; no baseline-to-head file changes.


#### qs-code-debug

Adopt upstream new redaction of commands, outputs, auth-bearing traces and artifacts before displaying/sharing. Add capture helper warning: captured values are echoed; capture observations, perform sign-in as user step. Use bounded hypothesis re-evaluation after evidence disproves repairs, without importing a rigid minimum hypothesis count or refusing all useful source inspection before executable reproduction.

**Preserve:** Causal diagnosis, stable regression seam, smallest coherent fix, measured performance baseline, owned repair and validation.

**Acceptance:** Synthetic auth-bearing HAR/output remains redacted; helper does not request secret capture; original reproducer and stable regression both prove fix.

Evidence: [SKILL.md](../../skills/engineering/qs-code-debug/SKILL.md) — Reviewed current canonical behavior and completion contract.; [SKILL.md](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/diagnosing-bugs/SKILL.md) — New Redact section and artifact redaction in baseline diff.


#### qs-review-code

Move host-specific inline-comment smoke-testing detail behind a strong conditional reference while retaining essential host availability, verified anchors and secrecy guardrails inline. Keep standards/spec axes with impact-ranked synthesis. Latest upstream mainly editorial; do not import unconditional two-agent fanout or blanket skip of tool-enforced issues when a real failure escapes checks.

**Preserve:** Read-only default; clear mutation intent; narrow target; repairs within authorized improve/refactor; no fabricated findings.

**Acceptance:** Same grounded findings across brief/full and inline/non-inline hosts; no missing actionable finding when anchor unavailable; empty/clean diff does not manufacture comment.

Evidence: [SKILL.md](../../skills/engineering/qs-review-code/SKILL.md) — Reviewed current canonical behavior and completion contract.; [SKILL.md](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/code-review/SKILL.md) — Baseline diff largely punctuation; removes host-specific Agent-call mechanics, retains two-agent model.


#### qs-git-merge

Borrow concise observable before/after proof, risks and rollback impact from new upstream in-progress/pr for PR descriptions, not its whole workflow. Preserve Dex Horthy/humanlayer credit if copying shape-of-change material. Reject upstream existing stage-everything and never-abort directives.

**Preserve:** Explicit operation/remote authority, unrelated dirty files, verified remote state, no automatic deployment.

**Acceptance:** Dirty-worktree conflict scenario stages only selected changes; already-published retry is idempotent; description proof refers to actual changed artifact.

Evidence: [SKILL.md](../../skills/engineering/qs-git-merge/SKILL.md) — Reviewed current canonical behavior and completion contract.; [SKILL.md](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/in-progress/pr/SKILL.md) — New PR guidance focuses on motivating bug, proof and risk.


#### qs-deploy-release

No source synchronization needed. Make failure report distinguish pre-publication failure from partial publication/deployment and identify observed remote state and next permitted recovery; retain terminal boundary. This is a local operational clarity improvement, not imported upstream feature.

**Preserve:** Exact artifact/environment, existing authorization, authoritative deployed-version and health proof; rollback readiness distinct from authority to execute.

**Acceptance:** Queued job/success exit cannot count as healthy deploy; staging request cannot authorize production; partial publish reports actual state.

Evidence: [SKILL.md](../../skills/engineering/qs-deploy-release/SKILL.md) — Reviewed current canonical behavior and completion contract.; [qs-skill-catalog.mjs](../../scripts/qs-skill-catalog.mjs) — upstreamName null and no continuations; repository-authored identity.


#### qs-flow-triage

Add conditional pointers to existing brief/prior-rejection references, scoped by tracker authority. Preserve useful distinction between already implemented and rejected so dedup records do not poison future triage. Latest upstream mostly punctuation and public Skill calls, not a reason to import all state-machine ceremony.

**Preserve:** One disposition/route per issue; no implementation; tracker changes only authorized.

**Acceptance:** Already-implemented feature is not recorded as rejected; prior decision surfaced without automatic close/reopen; PR triage respects configured request surface.

Evidence: [SKILL.md](../../skills/engineering/qs-flow-triage/SKILL.md) — Reviewed current canonical behavior and completion contract.; [SKILL.md](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/triage/SKILL.md) — Changed upstream grilling now invokes two skills and question rounds; keep internal/root boundary.


#### qs-flow-handoff

Remove stale preferred-plus-two-alternatives instruction in favor of current at-most-one actionable continuation. Retain concise resumption record with exact revision, evidence, authority and invalidated checks. Fresh Matt phase-boundary advice can inform when to recommend handoff, without restricting it to their five host-specific options.

**Preserve:** Portable verified state, unrelated dirty work, exact remaining boundary, no secrets or fictional receiving execution.

**Acceptance:** Fresh task can resume with scope/authority/evidence intact; no redundant checks or duplicate side effects; at most one eligible prompt.

Evidence: [SKILL.md](../../skills/productivity/qs-flow-handoff/SKILL.md) — Reviewed current canonical behavior and completion contract.; [SKILL.md](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/productivity/handoff/SKILL.md) — Latest delta only explicit Skill-tool wording.


#### qs-plan-research

Keep current bounded evidence standard; add revision/date specificity when comparing fast-changing sources and a claim-to-source ledger only for larger reviews. Upstream changes are punctuation only, so do not replace concise local body with background-agent/file-output assumptions.

**Preserve:** Primary sources, freshness, uncertainty, decision-sufficient stopping and no automatic implementation.

**Acceptance:** Conflicting sources remain distinguished; obsolete release versus newer unreleased code accurately labeled; research can finish without file artifact or subagent.

Evidence: [SKILL.md](../../skills/engineering/qs-plan-research/SKILL.md) — Reviewed current canonical behavior and completion contract.; [SKILL.md](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/research/SKILL.md) — Only punctuation changed; upstream background agent and Markdown output are preexisting differences.


#### qs-design-prototype

Adopt self-contained HTML logic demos as an option for nontechnical reviewers, retaining terminal option when appropriate. Reconcile retained UI/LOGIC helper instructions that fold winning code into production or create branches with current root isolation/authorization; then add explicit conditional pointers. Do not force every tiny uncertainty into multiple polished designs.

**Preserve:** One hypothesis, disposable isolation, common candidate evaluation criteria and no automatic production promotion.

**Acceptance:** Logic demo tests invalid and valid state transitions; UI alternative answers same question; code remains isolated; no branch or production promotion without authority.

Evidence: [SKILL.md](../../skills/engineering/qs-design-prototype/SKILL.md) — Reviewed current canonical behavior and completion contract.; [LOGIC.md](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/prototype/LOGIC.md) — Real new upstream change replaces TUI with shareable single-file HTML and guided scenarios.


#### qs-code-document

Use centralized provenance index as authoritative origin map, distinguish current/adopted/reviewed revisions, and reference rather than duplicating mutable environment facts. Current body repeats current-versus-planned distinction; remove repetition during measured contract compression.

**Preserve:** Verified behavior, reader purpose, primary technical standards, selected doc-only scope.

**Acceptance:** Command/link checks cover edited docs; planned behavior labeled; source origin includes multiple contributors when guidance was merged.

Evidence: [SKILL.md](../../skills/engineering/qs-code-document/SKILL.md) — Reviewed current canonical behavior and completion contract.; [qs-skill-catalog.mjs](../../scripts/qs-skill-catalog.mjs) — Repository-authored identity, upstreamName null.


#### qs-test-author

Add independent oracle/negative-control criterion when a test could be tautological: establish expected outcome from contract and demonstrate representative defect changes verdict. Keep absence/configuration tests when they protect a real contract, avoiding wholesale test-shape bans.

**Preserve:** Already-established behavior, test-only mutation, stable observable seam, no silent production testability refactor.

**Acceptance:** Representative known-bad or empty implementation fails relevant behavior test; configuration/absence contract test retained; production diff remains empty.

Evidence: [SKILL.md](../../skills/engineering/qs-test-author/SKILL.md) — Reviewed current canonical behavior and completion contract.; [SKILL.md](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/tdd/SKILL.md) — Independent expected values predate current delta; useful existing principle, not a new Matt update.


#### qs-test-verify

Current matrix, bounded retry and real-artifact proof are already strong. Add evidence identity/revision and stale-result invalidation concisely; avoid merging with Author or Debug because read-only authority is materially different.

**Preserve:** No source/snapshot/dependency mutations; required/optional/unavailable classification; both retry attempts retained.

**Acceptance:** Changed artifact invalidates prior pass; unavailable required check blocks completion; retry cannot erase first failure; source state preserved.

Evidence: [SKILL.md](../../skills/engineering/qs-test-verify/SKILL.md) — Reviewed current canonical behavior and completion contract.; [qs-skill-catalog.mjs](../../scripts/qs-skill-catalog.mjs) — V3-only repository authored identity.


#### qs-learn-teach

No substantive new upstream lesson behavior. Add conditional pointers only if retained glossary/mission/learning-record templates are wanted for explicit longitudinal courses; avoid loading all course scaffold for one explanation. Keep practice and feedback; do not merge technical explanation roots until user outcome tests prove equivalence.

**Preserve:** Bounded learner goal, prerequisite sequence, practice, feedback, no automatic implementation/research.

**Acceptance:** Brief question gives explanation and exercise without unsolicited files; multi-session course preserves progress when explicitly requested.

Evidence: [SKILL.md](../../skills/productivity/qs-learn-teach/SKILL.md) — Reviewed current canonical behavior and completion contract.; [SKILL.md](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/productivity/teach/SKILL.md) — Current changes are editorial; HTML lessons and persistent-course assumptions are preexisting.


#### qs-skill-write

Adopt successor context-pointer branches, progressive disclosure, co-location, environment lookup instead of stale caches, and model-relative no-op tests. Keep core safety bounds inline. Replace or archive stale unlinked GLOSSARY only after mapping useful concepts. Absorb retrospective instruction improvements here; no new retro/writing-for-agents dropdown required. Do not import claims that all explicit-only skills have zero model-context cost: Codex projection intentionally differs.

**Preserve:** Observable intent, invocation boundary, tools/mutations, failure behavior, tested contract, publication verified separately.

**Acceptance:** Routing test matrix and held-out task outcomes before/after; measure text/token cost separately from success; narrow edit does not weaken authorization or completion. Preserve historical source and successor mapping.

Evidence: [SKILL.md](../../skills/productivity/qs-skill-write/SKILL.md) — Reviewed current canonical behavior and completion contract.; [SKILL.md](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/productivity/writing-for-agents/SKILL.md) — New successor contains information hierarchy and source-of-truth pruning guidance.


#### qs-deploy-prompt

Keep exact generation-versus-execution distinction. Compression must separate root report from generated prompt: generated prompt still needs full standalone authorization, stage, progress and resumption semantics. Improve concise question gathering without dropping unavailable-tool/target gates. Existing source-hash trial fixtures require real fresh trials when instruction text changes.

**Preserve:** One self-contained copy-ready prompt; generation never executes goal/skills/deployment; exact standing authority and revocations; rollback readiness not implied authority.

**Acceptance:** Rerun generation/execution and estimation cases using actual agents; missing goals/skills or target yields blocker not executable placeholder; no hashes-only fixture updates.

Evidence: [SKILL.md](../../skills/engineering/qs-deploy-prompt/SKILL.md) — Reviewed current canonical behavior and completion contract.; [qs-skill-catalog.mjs](../../scripts/qs-skill-catalog.mjs) — V3-only authoring identity and goal-workflow-prompt output kind.


#### internal:domain-modeling

No significant new context-map policy in reviewed delta: public trigger wording changed, templates mostly punctuation. Add compact bounded-context/term ambiguity examples only when demonstrated useful; do not restore separate command or automatic CONTEXT.md/ADR mutation.

**Preserve:** Responsibilities, identity, lifecycle, relationships, valid/invalid states and existing language.

**Acceptance:** Overloaded customer/account term resolved against evidence without renaming established terms or creating unauthorized glossary/ADR files.

Evidence: [domain-modeling.md](../../skills/internal/domain-modeling.md) — Reviewed current private capability and parent-only progress contract.; [SKILL.md](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/domain-modeling/SKILL.md) — Trigger changed to terminology/CONTEXT.md/ADR editing; context-map behavior existed at baseline.


#### internal:module-decomposition

Retain deep-module and migration reasoning without importing vocabulary bans or automatic multi-agent design sweeps. A concise optional interface checklist can restore useful invariants/error/configuration details while avoiding full upstream theory in every run. Latest source mostly editorial.

**Preserve:** Cohesion, narrow interfaces, explicit ownership/failure boundary, caller migration, no speculative rewrite.

**Acceptance:** Compare two real interface boundaries; chosen design accounts for error/configuration contract and migrations; small feature does not trigger architecture survey.

Evidence: [module-decomposition.md](../../skills/internal/module-decomposition.md) — Reviewed current private capability and parent-only progress contract.; [SKILL.md](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/codebase-design/SKILL.md) — Interface includes invariants, ordering, errors, config and performance; global terminology bans are preexisting choices to exclude.


#### internal:ticket-decomposition

Add expand-contract plan pattern with dependency-correct caller batches and final old-interface deletion; explicitly state integration branch exception when intermediate commits cannot independently pass. Avoid creating a new ticket-writing dropdown.

**Preserve:** One observable result per ticket, real dependencies, explicit exclusions, no tracker work for spec-only request.

**Acceptance:** Graph verifier/scenario review checks delete depends on every caller batch; parent integration gate captures non-independently-green work.

Evidence: [ticket-decomposition.md](../../skills/internal/ticket-decomposition.md) — Reviewed current private capability and parent-only progress contract.; [SKILL.md](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/to-tickets/SKILL.md) — New wide mechanical refactor exception is substantive update, unlike surrounding punctuation.


#### internal:tdd-loop

Add independently grounded expected outcome/negative control when useful; otherwise no semantic Matt update required. New codebase-design invocation intent already served by local private module decomposition. Mandatory pre-agreed seam approvals and no-refactor rule are preexisting upstream divergences, not new updates; do not import.

**Preserve:** Meaningful failing test, smallest behavior, green refactor, characterization, credible non-test-first alternative.

**Acceptance:** Known-bad behavior fails; implementation refactor leaves contract test green; lack of credible test seam does not manufacture failure or force unnecessary user approval.

Evidence: [tdd-loop.md](../../skills/internal/tdd-loop.md) — Reviewed current private capability and parent-only progress contract.; [SKILL.md](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/tdd/SKILL.md) — Baseline diff adds codebase-design reference; mandatory consent and red/green-only already existed.

### Batch 2 — Pstack / Lauren Tan

Thirteen public commands and sixteen private capabilities. Compare adopted 0.14.1 with reviewed 0.15.5. Some recommendations restore valuable baseline details omitted during abbreviation; they are distinguished from new upstream changes. Do not import fixed model choices, automatic external actions or mandatory review fan-out.

| Current identity | Origin | Proposed disposition |
| --- | --- | --- |
| `ps-help` | Repository-authored router | Consolidate routing into qs-help when namespace migration is implemented. |
| `ps-how` | Lauren Tan / cursor/plugins pstack, adapted from how/SKILL.md | Preserve standalone as proposed qs-how; share private explanation guidance with qs-learn-teach only where useful. |
| `ps-why` | Lauren Tan / cursor/plugins pstack, adapted from why/SKILL.md | Preserve standalone as proposed qs-why. |
| `ps-blast-radius` | Lauren Tan / cursor/plugins pstack, adapted from blast-radius/SKILL.md | Preserve standalone as proposed qs-blast-radius; do not bury impact analysis inside an editing review. |
| `ps-runtime-forensics` | Lauren Tan / cursor/plugins pstack, adapted from poteto-mode/playbooks/runtime-forensics.md | Preserve standalone as proposed qs-runtime-forensics for now; share artifact parsing privately with trace forensics. |
| `ps-trace-forensics` | Lauren Tan / cursor/plugins pstack, adapted from poteto-mode/playbooks/trace-forensics.md | Preserve standalone as proposed qs-trace-forensics for now. |
| `ps-create-verification-skill` | Lauren Tan / cursor/plugins pstack, adapted from create-verification-skill/SKILL.md | Consolidation candidate with maintain under one proposed qs-verification-workflow, explicit create/maintain modes; preserve until behavioral tests pass. |
| `ps-maintain-verification-skill` | Lauren Tan / cursor/plugins pstack, adapted from maintain-verification-skill/SKILL.md | Consolidation candidate with create under proposed qs-verification-workflow; maintain mode must not silently create or repair product code. |
| `ps-skill-eval` | Lauren Tan / cursor/plugins pstack, adapted from poteto-mode/playbooks/eval.md | Preserve standalone as proposed qs-skill-eval; do not fold into general qs-skill-write. |
| `ps-hillclimb` | Lauren Tan / cursor/plugins pstack, adapted from poteto-mode/playbooks/hillclimb.md | Preserve standalone as proposed qs-hillclimb. |
| `ps-visual-parity` | Lauren Tan / cursor/plugins pstack, adapted from poteto-mode/playbooks/visual-parity.md | Preserve standalone as proposed qs-visual-parity, separate from creative frontend redesign. |
| `ps-pr-babysit` | Lauren Tan / cursor/plugins pstack, adapted from poteto-mode/playbooks/babysit.md | Preserve standalone as proposed qs-pr-babysit; do not merge into a one-shot qs-git-merge root. |
| `ps-worktree-cleanup` | Lauren Tan / cursor/plugins pstack, adapted from poteto-mode/playbooks/worktree-cleanup.md | Preserve standalone as proposed qs-worktree-cleanup. |
| `internal:multi-candidate-exploration` | Lauren Tan / cursor/plugins pstack adaptation, arena/SKILL.md; baseline 0.14.1, reviewed 0.15.5 | Retain private capability under its registered owners; rename ownership references with any public namespace migration. |
| `internal:decision-trail` | Lauren Tan / cursor/plugins pstack adaptation, show-me-your-work/SKILL.md; baseline 0.14.1, reviewed 0.15.5 | Retain private capability under its registered owners; rename ownership references with any public namespace migration. |
| `internal:parallel-coverage` | Lauren Tan / cursor/plugins pstack adaptation, swarm/SKILL.md; baseline 0.14.1, reviewed 0.15.5 | Retain private capability under its registered owners; rename ownership references with any public namespace migration. |
| `internal:typescript-discipline` | Lauren Tan / cursor/plugins pstack adaptation, typescript-best-practices/SKILL.md; baseline 0.14.1, reviewed 0.15.5 | Retain private capability under its registered owners; rename ownership references with any public namespace migration. |
| `internal:plain-writing` | Lauren Tan / cursor/plugins pstack adaptation, unslop/SKILL.md; baseline 0.14.1, reviewed 0.15.5 | Retain private capability under its registered owners; rename ownership references with any public namespace migration. |
| `internal:boundary-discipline` | Lauren Tan / cursor/plugins pstack adaptation, principle-boundary-discipline/SKILL.md; baseline 0.14.1, reviewed 0.15.5 | Retain private capability under its registered owners; rename ownership references with any public namespace migration. |
| `internal:rerunnable-tooling` | Lauren Tan / cursor/plugins pstack adaptation, principle-build-the-lever/SKILL.md; baseline 0.14.1, reviewed 0.15.5 | Retain private capability under its registered owners; rename ownership references with any public namespace migration. |
| `internal:structural-enforcement` | Lauren Tan / cursor/plugins pstack adaptation, principle-encode-lessons-in-structure/SKILL.md; baseline 0.14.1, reviewed 0.15.5 | Retain private capability under its registered owners; rename ownership references with any public namespace migration. |
| `internal:experience-first` | Lauren Tan / cursor/plugins pstack adaptation, principle-experience-first/SKILL.md; baseline 0.14.1, reviewed 0.15.5 | Retain private capability under its registered owners; rename ownership references with any public namespace migration. |
| `internal:context-discipline` | Lauren Tan / cursor/plugins pstack adaptation, principle-guard-the-context-window/SKILL.md; baseline 0.14.1, reviewed 0.15.5 | Retain private capability under its registered owners; rename ownership references with any public namespace migration. |
| `internal:minimal-change` | Lauren Tan / cursor/plugins pstack adaptation, principle-laziness-protocol/SKILL.md; baseline 0.14.1, reviewed 0.15.5 | Retain private capability under its registered owners; rename ownership references with any public namespace migration. |
| `internal:idempotent-operations` | Lauren Tan / cursor/plugins pstack adaptation, principle-make-operations-idempotent/SKILL.md; baseline 0.14.1, reviewed 0.15.5 | Retain private capability under its registered owners; rename ownership references with any public namespace migration. |
| `internal:outcome-oriented-execution` | Lauren Tan / cursor/plugins pstack adaptation, principle-outcome-oriented-execution/SKILL.md; baseline 0.14.1, reviewed 0.15.5 | Retain private capability under its registered owners; rename ownership references with any public namespace migration. |
| `internal:concurrency-ownership` | Lauren Tan / cursor/plugins pstack adaptation, principle-separate-before-serializing-shared-state/SKILL.md; baseline 0.14.1, reviewed 0.15.5 | Retain private capability under its registered owners; rename ownership references with any public namespace migration. |
| `internal:type-system-discipline` | Lauren Tan / cursor/plugins pstack adaptation, principle-type-system-discipline/SKILL.md; baseline 0.14.1, reviewed 0.15.5 | Retain private capability under its registered owners; rename ownership references with any public namespace migration. |
| `internal:bounded-autonomous-loop` | Lauren Tan / cursor/plugins pstack adaptation, poteto-mode/playbooks/autonomous-run.md; baseline 0.14.1, reviewed 0.15.5 | Retain private capability under its registered owners; rename ownership references with any public namespace migration. |

#### ps-help

Use the shared collection registry for one outcome-to-command index; retain former PS name lookup in documentation without creating duplicate public aliases.

**Preserve:** Read-only recommendation, exact package literal, no automatic invocation; PS specialist outcomes stay discoverable.

**Acceptance:** Route a parity request, rationale question, verification authoring request and ordinary QS build request; assert one appropriate root and no mutations.

Evidence: [SKILL.md](../../skills/pstack/commands/ps-help/SKILL.md) — Canonical bounded behavior and authority reviewed before generated completion contract.; [ps-skill-catalog.mjs](../../scripts/ps-skill-catalog.mjs) — Repository-authored candidateId null; currently overlaps QS help and searches both catalogs.


#### ps-how

Local is already simpler than upstream, whose latest removes a critic stage but still mandates one explainer helper. Keep direct execution for narrow questions, bounded evidence partitions only for complex ones. Add an explicit source-to-input-to-output example when it clarifies a subsystem.

**Preserve:** Read-only subsystem explanation; code evidence near claims; optional adapters. A teaching request and an implementation walkthrough remain distinguishable.

**Acceptance:** Compare one-function and cross-service prompts for correct flow, cited claims and no unnecessary helpers; missing history must not block a code explanation.

Evidence: [SKILL.md](../../skills/pstack/commands/ps-how/SKILL.md) — Canonical bounded behavior and authority reviewed before generated completion contract.; [SKILL.md](https://github.com/cursor/plugins/blob/12d587dfb20741cafc376c42c696c5f6e2a64487/pstack/skills/how/SKILL.md) — Latest how has simple/complex paths; baseline-to-latest deletes critic-prompt.md and critique-rubric.md. These were never required by the local abbreviated command.


#### ps-why

Adopt a concise code anchor and Preserve / Change / Avoid / Risk conclusion when the question precedes a change; preserve task-scoped source selection rather than mandatory seven-category fan-out. This is useful retained upstream material, not necessarily a newly introduced requirement.

**Preserve:** Facts versus supported inference and unknown intent; optional history/connectors, read-only boundary. Do not infer motivation from recent commits alone.

**Acceptance:** Use conflicting PR rationale and current code plus unavailable connector cases; explanation must retain uncertainty and identify exact missing evidence without unrelated-source scans.

Evidence: [SKILL.md](../../skills/pstack/commands/ps-why/SKILL.md) — Canonical bounded behavior and authority reviewed before generated completion contract.; [SKILL.md](https://github.com/cursor/plugins/blob/12d587dfb20741cafc376c42c696c5f6e2a64487/pstack/skills/why/SKILL.md) — Latest why still defaults full parallel seven-category investigation, defines confidence framework, code anchor and final change constraints. Local already owns the valuable epistemic distinction.


#### ps-blast-radius

Add pinned dependency versions/local patches and serialized cross-language or persistence contracts to the concise tracing checklist. Existing upstream guidance remains valuable; latest changes are largely wording.

**Preserve:** Read-only change impact; strongest safety claim tested when feasible; executable/static/documented/inferred evidence distinguished; unresolved claims remain unproven.

**Acceptance:** Fixture with an apparently unused symbol referenced through JSON or persisted data; analysis must find the contract and avoid declaring safety from zero text matches.

Evidence: [SKILL.md](../../skills/pstack/commands/ps-blast-radius/SKILL.md) — Canonical bounded behavior and authority reviewed before generated completion contract.; [SKILL.md](https://github.com/cursor/plugins/blob/12d587dfb20741cafc376c42c696c5f6e2a64487/pstack/skills/blast-radius/SKILL.md) — Upstream steps explicitly inspect pinned library source, local patches, scheduling and wire/DB contracts beyond grep.


#### ps-runtime-forensics

Retain artifact-to-source attribution (file, symbol, causal observation). Clarify that a causal intervention against a live process needs the selected access authority; do not copy upstream hotfix-live-code language into diagnosis-only default.

**Preserve:** Live measurement versus conjecture; temporary evidence allowed, tracked product instrumentation and repair outside scope; redacted results.

**Acceptance:** Live-profile case must gather fresh signal and trace it to code; inaccessible instrumentation must yield bounded uncertainty, not an invented diagnosis or product edit.

Evidence: [SKILL.md](../../skills/pstack/commands/ps-runtime-forensics/SKILL.md) — Canonical bounded behavior and authority reviewed before generated completion contract.; [runtime-forensics.md](https://github.com/cursor/plugins/blob/12d587dfb20741cafc376c42c696c5f6e2a64487/pstack/skills/poteto-mode/playbooks/runtime-forensics.md) — Latest changes mostly wording; upstream allows CDP injection or live hotfix to prove mechanism, whereas canonical local deliberately narrows authority.


#### ps-trace-forensics

Add explicit source-symbol resolution and paired-capture comparison when available; without corroboration label the strongest artifact-supported hypothesis, not a proven regression cause. A queryable reduction can be private tooling when artifact size warrants it.

**Preserve:** Immutable supplied dataset; no recapture or live process mutation inferred from a dropped file; identity/time/environment recorded; redaction.

**Acceptance:** Profile lacking symbols must expose that limit; paired before/after traces should discriminate regression from background cost; no live commands on artifact-only request.

Evidence: [SKILL.md](../../skills/pstack/commands/ps-trace-forensics/SKILL.md) — Canonical bounded behavior and authority reviewed before generated completion contract.; [trace-forensics.md](https://github.com/cursor/plugins/blob/12d587dfb20741cafc376c42c696c5f6e2a64487/pstack/skills/poteto-mode/playbooks/trace-forensics.md) — Latest upstream retains source-symbol and paired-capture requirements; local broad competing-hypothesis step can state this more concretely.


#### ps-create-verification-skill

Restore compact requirements for readiness/doctor, exact owned cleanup, stable user-facing selectors and proof that evidence survives cleanup. This source did not change since the pinned baseline: the improvement fills abbreviated-local omissions.

**Preserve:** Author verification assets only, not product behavior; discover existing harness; execute generated instructions against real app; host-neutral path convention.

**Acceptance:** Create a fixture driver, run launch/doctor/drive/evidence/cleanup; verify second run safe, owned process gone and evidence still exists; unavailable real harness cannot produce a verified deliverable.

Evidence: [SKILL.md](../../skills/pstack/commands/ps-create-verification-skill/SKILL.md) — Canonical bounded behavior and authority reviewed before generated completion contract.; [SKILL.md](https://github.com/cursor/plugins/blob/12d587dfb20741cafc376c42c696c5f6e2a64487/pstack/skills/create-verification-skill/SKILL.md) — Upstream creation owns executable helpers, launch/doctor/drive/evidence/cleanup and one feature end-to-end proof; no diff in this source since 0.14.1.


#### ps-maintain-verification-skill

Add explicit feature-map coverage accounting: exercise each mapped feature or report its concrete unreachable prerequisite. Re-drive every harness correction, recheck doctor after surprising failures, preserve captured evidence across cleanup. Baseline guidance, not a new upstream delta.

**Preserve:** Existing assets only; classify product/harness/map/environment drift and retain valid coverage; do not edit documentation to normalize a product regression.

**Acceptance:** Fixture with one unreachable feature, one stale selector and one real product regression; outcome must cover each, fix only harness/map drift and keep product defect visible.

Evidence: [SKILL.md](../../skills/pstack/commands/ps-maintain-verification-skill/SKILL.md) — Canonical bounded behavior and authority reviewed before generated completion contract.; [SKILL.md](https://github.com/cursor/plugins/blob/12d587dfb20741cafc376c42c696c5f6e2a64487/pstack/skills/maintain-verification-skill/SKILL.md) — Upstream unchanged since 0.14.1; every-feature live coverage, doctor recovery and evidence-survival are materially more concrete than current local six-step summary.


#### ps-skill-eval

Strengthen blinding detail: natural task prompts, sanitized labels and working paths, rubric withheld from candidates, same scale across variants, parent inspect all outputs. Use source-revision and method bindings in trial records.

**Preserve:** Declared control/task/rubric/budget/retry policy before runs; failed trials retained; observed outputs sufficient; private transcripts only when selected; no undisclosed model change.

**Acceptance:** Leakage fixture with variant-identifying directory names, failed candidates and model mismatch must be rejected or disclosed; repeated matched trials before any efficacy claim.

Evidence: [SKILL.md](../../skills/pstack/commands/ps-skill-eval/SKILL.md) — Canonical bounded behavior and authority reviewed before generated completion contract.; [eval.md](https://github.com/cursor/plugins/blob/12d587dfb20741cafc376c42c696c5f6e2a64487/pstack/skills/poteto-mode/playbooks/eval.md) — Upstream eval changes mostly wording. Existing blinding instructions are useful; do not import mandatory different models or automatic transcript scans.


#### ps-hillclimb

Require a representative workload, prove harness sensitivity with contrasting workloads, freeze measurement definition and preserve a green regression gate before optimization. These are retained baseline details worth restoring locally. Apply premise reconsideration after repeated failed fixes, without a universal per-actor census.

**Preserve:** One metric, credible baseline, budget, noise handling, per-trial hypothesis/measurement/keep-revert, selected code only; no automatic commits or PRs.

**Acceptance:** Insensitive harness negative control must fail setup; noisy apparent win must not count; real speedup with regression must revert; unchanged valid small code must be allowed without forced iteration floor.

Evidence: [SKILL.md](../../skills/pstack/commands/ps-hillclimb/SKILL.md) — Canonical bounded behavior and authority reviewed before generated completion contract.; [hillclimb.md](https://github.com/cursor/plugins/blob/12d587dfb20741cafc376c42c696c5f6e2a64487/pstack/skills/poteto-mode/playbooks/hillclimb.md) — Latest upstream mostly wording/model changes and still mandates delegation, commits and Opening a PR; local correctly excludes those publication and host assumptions.


#### ps-visual-parity

Keep comparison implementation/settings fixed once baseline and metric are accepted; identify state/viewport coverage, migrate shared primitives before dependent components, and treat harness changes as invalidating prior comparisons. These strengthen retained parity guidance, not a new 0.15.5 feature.

**Preserve:** Immutable baseline identity/hash, stable capture environment/assets/fonts/scale/engine, declared budget, approved or repository tolerance, metric/tolerance/residual in report, completion only inside tolerance. Never replace baseline with generated design.

**Acceptance:** Baseline tamper, threshold relaxation, skipped UI state or renderer mismatch must fail; missing tolerance must block edits; genuine measured match across declared states can complete.

Evidence: [SKILL.md](../../skills/pstack/commands/ps-visual-parity/SKILL.md) — Canonical bounded behavior and authority reviewed before generated completion contract.; [visual-parity.md](https://github.com/cursor/plugins/blob/12d587dfb20741cafc376c42c696c5f6e2a64487/pstack/skills/poteto-mode/playbooks/visual-parity.md) — Upstream parity diff only wording; zero-pixel threshold upstream is intentionally adapted locally to declared tolerance. Upstream explicitly prohibits harness modification and baseline tampering.


#### ps-pr-babysit

Retain one authoritative forge snapshot and recheck review threads/mergeability after head changes, not just green check summaries. Add explicit one-pass versus bounded monitoring intent and classify failures before retriggering. Latest upstream adds Origin forge handling; use optional adapter only if needed, no new mandatory CLI.

**Preserve:** Exact selected PR/head/worktree, inspect versus authorized repair, deadline/cancellation/retry cap, explicit push authority; never merge or alter stack topology.

**Acceptance:** Cancelled duplicate check, stale head, new review blocker, malicious comment text, cancellation and simultaneous repair cases; no false ready and no merge action.

Evidence: [SKILL.md](../../skills/pstack/commands/ps-pr-babysit/SKILL.md) — Canonical bounded behavior and authority reviewed before generated completion contract.; [babysit.md](https://github.com/cursor/plugins/blob/12d587dfb20741cafc376c42c696c5f6e2a64487/pstack/skills/poteto-mode/playbooks/babysit.md) — Latest babysit resolves forge and separates Origin from GitHub watcher verdicts; retains single owner, conflicts-before-CI and untrusted review-comment handling. Local has no watcher dependency.


#### ps-worktree-cleanup

Check active/pinned task ownership through available host metadata or selected user evidence before treating a clean merged worktree as reclaimable. Do not import broad transcript searches, force-removal fallback or simulator/cache purge defaults.

**Preserve:** Read-only audit first; canonical exact paths; active/dirty/untracked/ambiguous exclusions; confirmation bound to exact target list and fresh revalidation; separate secondary scopes.

**Acceptance:** Clean merged but active/pinned worktree must be excluded; path moves or newly dirty state after audit invalidate removal; refusal cannot trigger rm -rf fallback.

Evidence: [SKILL.md](../../skills/pstack/commands/ps-worktree-cleanup/SKILL.md) — Canonical bounded behavior and authority reviewed before generated completion contract.; [worktree-cleanup.md](https://github.com/cursor/plugins/blob/12d587dfb20741cafc376c42c696c5f6e2a64487/pstack/skills/poteto-mode/playbooks/worktree-cleanup.md) — Latest upstream is wording-only here. Upstream acknowledges clean/merged can still be in use; its transcript scanning and force/cache deletions are deliberately absent locally.


#### internal:multi-candidate-exploration

Keep optional bounded candidate exploration; freeze common grounding and selection criterion, inspect every completed candidate and record dropouts. Do not import latest provider/fallback model matrix.

**Preserve:** Distinct hypotheses, isolated outputs, same evidence path and budget; one root selects and verifies synthesis.

**Acceptance:** Divergent and dropped candidates must preserve coverage gaps; selection cannot start from partially written output.

Evidence: [multi-candidate-exploration.md](../../skills/pstack/internal/multi-candidate-exploration.md) — Canonical purpose, entry/stop conditions, method and explicit owners reviewed; [SKILL.md](https://github.com/cursor/plugins/blob/12d587dfb20741cafc376c42c696c5f6e2a64487/pstack/skills/arena/SKILL.md) — Latest substantive changes configure model families; local model-neutral method already avoids that coupling.


#### internal:decision-trail

Adopt append-only corrections and explicit run identity when a later chat/agent resumes a shared log. Scope verification to this run and any earlier claims it invalidates. If a log helper is adopted, initialize by appending rather than truncating existing rows after a misleading stat result.

**Preserve:** Evidence-bearing material decisions only; compact logs, redacted sensitive content, no mandatory private transcript access or different-model audit.

**Acceptance:** Resume/interleaved-run fixture must preserve previous entries and append a correction with a resolvable evidence pointer rather than rewriting history.

Evidence: [decision-trail.md](../../skills/pstack/internal/decision-trail.md) — Canonical purpose, entry/stop conditions, method and explicit owners reviewed; [SKILL.md](https://github.com/cursor/plugins/blob/12d587dfb20741cafc376c42c696c5f6e2a64487/pstack/skills/show-me-your-work/SKILL.md) — New start-phase run boundaries and append-only audit corrections are meaningful latest changes, unlike most prose edits.


#### internal:parallel-coverage

Adopt exact revision bindings for verification workers and method bindings for measurements: sample count, sample definition and execution order. Reject unmatched reports as gaps.

**Preserve:** Read-only evidence partitions, bounded return shape, parent reconciles coverage/contradictions, no helpers when coordination costs more.

**Acceptance:** Stale SHA, wrong sample order and missing worker fixture must not pass coverage even when the worker reports success.

Evidence: [parallel-coverage.md](../../skills/pstack/internal/parallel-coverage.md) — Canonical purpose, entry/stop conditions, method and explicit owners reviewed; [SKILL.md](https://github.com/cursor/plugins/blob/12d587dfb20741cafc376c42c696c5f6e2a64487/pstack/skills/swarm/SKILL.md) — New upstream worker SHA/method reporting and invalid-report gap handling are meaningful improvements; provider/cloud defaults are not portable.


#### internal:typescript-discipline

Prefer repository-owned runtime schemas before new hand-written property guards; infer the type from the schema and parse external input into a named domain value. No new schema dependency for one guard.

**Preserve:** Precise boundary types, inferred locals, runtime checks plus type checks, no unrelated type cleanup; load only on TypeScript scope.

**Acceptance:** Known schema should be reused; invalid input must fail runtime parse; repository without schema library must not gain a dependency reflexively.

Evidence: [typescript-discipline.md](../../skills/pstack/internal/typescript-discipline.md) — Canonical purpose, entry/stop conditions, method and explicit owners reviewed; [SKILL.md](https://github.com/cursor/plugins/blob/12d587dfb20741cafc376c42c696c5f6e2a64487/pstack/skills/typescript-best-practices/SKILL.md) — Latest adds Schemas before guards and 21-line example in references/patterns.md, explicitly reuses existing library and forbids one-guard dependency addition.


#### internal:plain-writing

Retain concise whole sentences: latest warns that overly abbreviated fragments/arrows make readers decode. Apply this to generated reports rather than adding another public rewriting skill.

**Preserve:** Outcome first, concrete words, preserved evidence and uncertainty; no artificial personality or mandatory cosmetic style churn.

**Acceptance:** Compare brief/full reports: both must keep qualifications and be readable once; shortening must not erase failed checks.

Evidence: [plain-writing.md](../../skills/pstack/internal/plain-writing.md) — Canonical purpose, entry/stop conditions, method and explicit owners reviewed; [SKILL.md](https://github.com/cursor/plugins/blob/12d587dfb20741cafc376c42c696c5f6e2a64487/pstack/skills/unslop/SKILL.md) — Latest removes forced soul/voice section, adds mannered-prose and over-compression rules. Local already focuses on clarity and precision.


#### internal:boundary-discipline

Clarify provenance as a substantial reinterpretation: upstream validates external data/types; local controls workflow authority. Keep actual data-boundary guidance with type-system/TypeScript capabilities rather than falsely claiming exact equivalence.

**Preserve:** Exact owned paths and authority, revalidation after changes, no authority borrowed from another root.

**Acceptance:** A selected asset edit must not authorize product/remote writes; separately verify invalid external values are parsed by data-boundary owner.

Evidence: [boundary-discipline.md](../../skills/pstack/internal/boundary-discipline.md) — Canonical purpose, entry/stop conditions, method and explicit owners reviewed; [SKILL.md](https://github.com/cursor/plugins/blob/12d587dfb20741cafc376c42c696c5f6e2a64487/pstack/skills/principle-boundary-discipline/SKILL.md) — Upstream is functional core/thin shell and boundary validation; local purpose is read/write/authority/external-effect scope. Latest diff mostly wording.


#### internal:rerunnable-tooling

Retain cost-based tooling, and compare first automated result with a known correct manual example when creating a repeated transformation. Deterministic processing should avoid redundant agent fan-out.

**Preserve:** Inputs/outputs/exit/cleanup stated; tool inside root mutation scope; real entrypoint executed; stop if tooling costs more than task.

**Acceptance:** One fixture transformed manually and mechanically must agree; second execution must preserve evidence and state.

Evidence: [rerunnable-tooling.md](../../skills/pstack/internal/rerunnable-tooling.md) — Canonical purpose, entry/stop conditions, method and explicit owners reviewed; [SKILL.md](https://github.com/cursor/plugins/blob/12d587dfb20741cafc376c42c696c5f6e2a64487/pstack/skills/principle-build-the-lever/SKILL.md) — Latest mostly wording; upstream mandates levers for almost every nontrivial task. Local deliberately uses a narrower repetition/cost trigger.


#### internal:structural-enforcement

Add the new behavior-testing principle selectively: independent expected outcomes and a known-bad negative control for a mechanical rule. Do not adopt its blanket undefined heuristic or delete valid absence/config/contract tests.

**Preserve:** Smallest stable schema/lint/test seam; known violation rejected; contextual judgment remains prose.

**Acceptance:** Mutated implementation must fail intended test while valid configuration pins and absence assertions remain when their contract is real.

Evidence: [structural-enforcement.md](../../skills/pstack/internal/structural-enforcement.md) — Canonical purpose, entry/stop conditions, method and explicit owners reviewed; [SKILL.md](https://github.com/cursor/plugins/blob/12d587dfb20741cafc376c42c696c5f6e2a64487/pstack/skills/principle-encode-lessons-in-structure/SKILL.md) — Structure principle changes mostly wording. New principle-test-behavior-not-implementation is useful but wrongly lists toBeDefined/toBeTruthy among assertions that pass undefined.


#### internal:experience-first

Keep workload/user-visible baseline and final path; include library caller/maintainer experience where the target is an API instead of UI.

**Preserve:** Real observed experience, declared metric, correctness floor and same capture path; no subjective delight overriding parity baseline.

**Acceptance:** UI and API prompts must choose representative user/caller behavior; visual parity cannot redesign approved target for aesthetic reasons.

Evidence: [experience-first.md](../../skills/pstack/internal/experience-first.md) — Canonical purpose, entry/stop conditions, method and explicit owners reviewed; [SKILL.md](https://github.com/cursor/plugins/blob/12d587dfb20741cafc376c42c696c5f6e2a64487/pstack/skills/principle-experience-first/SKILL.md) — Latest mostly wording; upstream explicitly counts maintainers/library consumers as users.


#### internal:context-discipline

Use bounded excerpts and source pointers with uncertainty intact; record source revision for reduced evidence when source can move. Avoid literal claims that host context is non-renewable or mandatory delegation.

**Preserve:** Exact question, smallest useful return shape, source-verified synthesis and honest missing-access limits.

**Acceptance:** Large trace reduction must retain source/capture identity and contradictory evidence; summary alone cannot prove a causal claim.

Evidence: [context-discipline.md](../../skills/pstack/internal/context-discipline.md) — Canonical purpose, entry/stop conditions, method and explicit owners reviewed; [SKILL.md](https://github.com/cursor/plugins/blob/12d587dfb20741cafc376c42c696c5f6e2a64487/pstack/skills/principle-guard-the-context-window/SKILL.md) — Latest prose removes redundant selective-read line; local bounded evidence reduction already captures useful intent without host-specific context assumptions.


#### internal:minimal-change

Keep causal minimality; after repeated failures question the shared premise before adding compensating machinery. Add as debugging/optimization guidance, not another command.

**Preserve:** Focused preservation checks; no unrelated cleanup or speculative layers; stop when bounded outcome met.

**Acceptance:** Two failed tweaks must trigger premise review and discriminating evidence, not automatic architectural rewrite.

Evidence: [minimal-change.md](../../skills/pstack/internal/minimal-change.md) — Canonical purpose, entry/stop conditions, method and explicit owners reviewed; [SKILL.md](https://github.com/cursor/plugins/blob/12d587dfb20741cafc376c42c696c5f6e2a64487/pstack/skills/principle-laziness-protocol/SKILL.md) — Latest laziness diff mostly wording. New principle-attack-the-premise suggests repeated-failure trigger, but per-actor census and even-census exclusion are domain-specific and not generally sound.


#### internal:idempotent-operations

Keep unchanged; concise local module already states the practical retry contract and exact cleanup ownership.

**Preserve:** Already-satisfied no-op; repeated setup/cleanup safe; evidence survives; exact confirmed resources only.

**Acceptance:** Successful repeat and interrupted retry must converge without deleting evidence or unrelated state.

Evidence: [idempotent-operations.md](../../skills/pstack/internal/idempotent-operations.md) — Canonical purpose, entry/stop conditions, method and explicit owners reviewed; [SKILL.md](https://github.com/cursor/plugins/blob/12d587dfb20741cafc376c42c696c5f6e2a64487/pstack/skills/principle-make-operations-idempotent/SKILL.md) — No upstream change to this source since pinned 0.14.1; no update needed merely because package version changed.


#### internal:outcome-oriented-execution

Keep final verification requirement even though upstream deleted its redundant reminder; local stop predicate evidence is necessary to distinguish activity from completion.

**Preserve:** One result, authority-bound adaptive work, explicit budget/cancellation/blocker states.

**Acceptance:** Completed actions with unmet predicate must not produce complete; cancellation must halt the next operation.

Evidence: [outcome-oriented-execution.md](../../skills/pstack/internal/outcome-oriented-execution.md) — Canonical purpose, entry/stop conditions, method and explicit owners reviewed; [SKILL.md](https://github.com/cursor/plugins/blob/12d587dfb20741cafc376c42c696c5f6e2a64487/pstack/skills/principle-outcome-oriented-execution/SKILL.md) — Latest removes always-run-final-verification prose; local still requires final predicate evidence in the owning root.


#### internal:concurrency-ownership

Make writable ownership concrete through isolated artifacts or structural lock/serialization where sharing is unavoidable. Distinguish a prose ownership map from actual mutual exclusion.

**Preserve:** Immutable starting point, disjoint writes/read-only partitions, serialized acceptance after current-state check.

**Acceptance:** Overlapping output paths must prevent concurrent writes; stale accepted results require reconciliation rather than blind merge.

Evidence: [concurrency-ownership.md](../../skills/pstack/internal/concurrency-ownership.md) — Canonical purpose, entry/stop conditions, method and explicit owners reviewed; [SKILL.md](https://github.com/cursor/plugins/blob/12d587dfb20741cafc376c42c696c5f6e2a64487/pstack/skills/principle-separate-before-serializing-shared-state/SKILL.md) — Latest wording-only; retained upstream says instructions/conventions alone are not concurrency control, stronger than a verbal owner assignment.


#### internal:type-system-discipline

Retain language-neutral domain invariants; include deriving types from authoritative schema and strengthening only where partial operations force it. Keep TypeScript syntax in its separate private module.

**Preserve:** Trusted internal values versus parsed external input, caller correctness plus runtime validation, no blanket maximal type precision.

**Acceptance:** Empty total operation stays simple while partial head operation represents empty case; schema change propagates to boundary type without duplicate interface drift.

Evidence: [type-system-discipline.md](../../skills/pstack/internal/type-system-discipline.md) — Canonical purpose, entry/stop conditions, method and explicit owners reviewed; [SKILL.md](https://github.com/cursor/plugins/blob/12d587dfb20741cafc376c42c696c5f6e2a64487/pstack/skills/principle-type-system-discipline/SKILL.md) — Latest mostly prose; existing upstream simplest-total-type and authoritative-schema principles remain useful omissions from compact local method.


#### internal:bounded-autonomous-loop

Keep explicit budget and stop reason; prefer event-driven waits when host supports them, while preserving deadline and cancellation. Do not import automatic side-fix PRs or nested public workflows.

**Preserve:** One root, one authority scope, each unit verified, cancellation before next unit, no publication implied.

**Acceptance:** Budget exhaustion, canceled authority and unrelated discovered defect cases must stop or report correctly; no automatic commit/publication.

Evidence: [bounded-autonomous-loop.md](../../skills/pstack/internal/bounded-autonomous-loop.md) — Canonical purpose, entry/stop conditions, method and explicit owners reviewed; [autonomous-run.md](https://github.com/cursor/plugins/blob/12d587dfb20741cafc376c42c696c5f6e2a64487/pstack/skills/poteto-mode/playbooks/autonomous-run.md) — Latest autonomous-run diff wording-only; upstream unrestricted mid-run side-fix and commit semantics deliberately exceed local scope.

### Batch 3 — Taste frontend and image direction

All seven upstream directories are unchanged since their approved pin. These are local adaptation/consolidation opportunities, not reasons to bump pins. Keep web/mobile image-only outputs, prompt authoring and code implementation distinguishable. Style presets must not contaminate one another or override real content and brand.

| Current identity | Origin | Proposed disposition |
| --- | --- | --- |
| `design-taste-frontend` | Leonxlnx/taste-skill; skills/taste-skill/SKILL.md. | Retain as the principal source for a concise proposed qs-design-frontend root; keep greenfield and preserve/overhaul redesign modes explicit. Move implementation snippets, design-system install reference and style vocabulary to private references. Do not turn it into a universal product-UX root. |
| `high-end-visual-design` | Leonxlnx/taste-skill; skills/soft-skill/SKILL.md. | Retain as an opt-in internal dimensional/animated style preset under proposed qs-design-frontend, not a universal second competing frontend workflow. Keep independent exposure if deliberate repeated direct usage warrants it. |
| `minimalist-ui` | Leonxlnx/taste-skill; skills/minimalist-skill/SKILL.md. | Retain as a separate opt-in internal editorial/flat style preset under proposed qs-design-frontend, with a documented original-name lookup. Do not erase its distinct flat treatment. |
| `redesign-existing-projects` | Leonxlnx/taste-skill; skills/redesign-skill/SKILL.md. | Consolidate its audit/fix technique into the explicit redesign mode of proposed qs-design-frontend; preserve its checklist as a private reference. A dedicated qs-design-redesign specialist remains reasonable if audit-only/redesign intent proves hard to route or frequently selected. |
| `image-to-code` | Leonxlnx/taste-skill; skills/image-to-code-skill/SKILL.md. | Preserve as an independently invocable proposed qs-image-to-code workflow. Narrow description to creative design-reference generation plus implementation, or explicitly separate supplied-reference versus generate-new-reference modes. Do not absorb ps-visual-parity into this workflow. |
| `imagegen-frontend-web` | Leonxlnx/taste-skill; skills/imagegen-frontend-web/SKILL.md. | Preserve dedicated image/prompt direction as proposed qs-design-web-images, or a web mode of qs-design-images only if output-routing trials preserve behavior. Keep image-only output distinct from coding. |
| `imagegen-frontend-mobile` | Leonxlnx/taste-skill; skills/imagegen-frontend-mobile/SKILL.md. | Preserve dedicated mobile image/prompt direction as proposed qs-design-mobile-images, or a mobile mode of qs-design-images after routing validation. Sharing image-generation mechanics with web is plausible; merging platform/flow contracts into generic frontend design is risky. |

#### design-taste-frontend

The current root is 12,853 whitespace-delimited words/1,206 lines in one file. Extract the brief, existing-brand/stack precedence, scope, implementation and verification contract into the root. Load only relevant platform, motion and styling references. Reconcile contextual preamble with blanket imagery, dual-theme, exact hero-copy-length and section-variation mandates; these can cause extra image calls or unsolicited redesign outside a brief. Treat style choices as defaults subordinate to existing approved content and brand. No evidence yet proves shorter instructions improve output quality.

**Preserve:** Brief inference, audience and reference signals, official-design-system honesty, dependency verification, responsive behavior, reduced-motion behavior and redesign preservation of URLs, brand, content voice, analytics, accessibility and functionality. Dashboards/data tables/multistep product UI remain explicitly outside this marketing-focused recipe. Existing qs-deploy-prompt and qs-skill-write remain dedicated prompt-building roots.

**Acceptance:** Compare current and proposed root on greenfield landing page, restrained text-only brief, existing branded public-service page, and dense dashboard request. Check correct scope routing, no unnecessary imagery/theme/stack change, preserved URLs/events/copy, responsive keyboard/reduced-motion behavior. Record loaded words/tokens, image/tool calls, time and blinded output judgment; word reduction alone is not quality proof.

Evidence: [SKILL.md](https://github.com/Leonxlnx/taste-skill/blob/e988add20dab0fa97d7a76781c48961c8184288e/skills/taste-skill/SKILL.md#L8) — Explicit scope excludes dashboards, data tables and multistep product UI; line 9 says every rule contextual.; [SKILL.md](https://github.com/Leonxlnx/taste-skill/blob/e988add20dab0fa97d7a76781c48961c8184288e/skills/taste-skill/SKILL.md#L234) — Mandatory hero fit, headline/subtext lengths, composition repetition limits and CTA label shortening can alter approved content if transplanted literally.


#### high-end-visual-design

1,456 words/98 lines, one file. Replace absolute font/icon bans, random variance, universal nested shells, pill buttons, giant spacing and mandatory entrances with conditional style guidance. Add explicit brand/design-system precedence, reduced-motion/static fallback, keyboard/contrast checks and dependency availability. Do not concatenate this preset with minimalist-ui: instructions directly conflict.

**Preserve:** Concrete nested-shell radius relationship, responsive collapse, optional material/texture archetypes and transform/opacity performance considerations where the requested aesthetic warrants them. Preserve useful visual recipes as selectable references rather than deleting them.

**Acceptance:** Same content/brand under dimensional and minimalist presets should select only the requested treatment. Test established Inter/Lucide project, reduced-motion setting, missing premium font, keyboard menu and narrow-screen layout. Reject a consolidation that always adds shells, changes existing icons gratuitously or hides content when motion is disabled.

Evidence: [SKILL.md](https://github.com/Leonxlnx/taste-skill/blob/e988add20dab0fa97d7a76781c48961c8184288e/skills/soft-skill/SKILL.md#L15) — Absolute banned fonts/icons/layouts/motion ignore existing systems if applied globally.; [SKILL.md](https://github.com/Leonxlnx/taste-skill/blob/e988add20dab0fa97d7a76781c48961c8184288e/skills/soft-skill/SKILL.md#L41) — Double-Bezel directive mandates nested shells for every card/container; primary buttons must be fully rounded pills.


#### minimalist-ui

1,089 words/85 lines, one file. Resolve self-conflicting no-gradient rule versus prescribed radial gradients/ambient blobs, transform/opacity-only rule versus box-shadow transitions, and mandatory entrance motion. Replace rigid font/icon bans and exact pale borders with a chosen token set that respects existing brand and accessibility. Keep the restrained preset selectable independently of the dimensional preset.

**Preserve:** Editorial typography hierarchy, deliberate muted palette, flat surfaces, restrained controls, contextual copy, readable hierarchy and consistent spacing. Flatness and restrained color are legitimate requested outcomes, not defects to fix automatically with imagery/depth.

**Acceptance:** Use a brief explicitly requesting flat, gradient-free, low-motion UI and assert no contradictory preset contamination. Verify requested brand fonts survive, small text contrast remains readable, focus visible, and controls fit narrow viewports. Evaluate screenshot quality as well as instruction-following.

Evidence: [SKILL.md](https://github.com/Leonxlnx/taste-skill/blob/e988add20dab0fa97d7a76781c48961c8184288e/skills/minimalist-skill/SKILL.md#L12) — Bans gradients and pill primary buttons; opposite of high-end preset pill mandate.; [SKILL.md](https://github.com/Leonxlnx/taste-skill/blob/e988add20dab0fa97d7a76781c48961c8184288e/skills/minimalist-skill/SKILL.md#L38) — Flat component specifications use 1px #EAEAEA borders and small radii.


#### redesign-existing-projects

2,210 words/178 lines, one file. Existing scan/diagnose/fix largely overlaps design-taste-frontend section 11. Keep one preservation contract rather than stacking two roots. Distinguish audit-only requests from authorized editing. Convert visual novelty prescriptions into candidate changes tied to user goal; do not rewrite real dates, statistics, names or brand merely to make data look less generic. Run targeted verification after meaningful batches rather than treating each tiny reversible edit as a mandatory full test run.

**Preserve:** Inspect current framework/styling/dependencies, small reviewable changes, existing functionality, complete interaction states, keyboard focus, semantic HTML and meaningful alt text. Combine with stronger URL/analytics/brand/copy preservation from the main Taste source.

**Acceptance:** Run audit-only, visual polish and full-overhaul requests on the same existing fixture. Confirm mutation scope, URL/analytics/form IDs/content fidelity, existing stack, interaction states and accessibility. Include real identical publication dates and legitimate round metrics as negative controls against gratuitous content fabrication.

Evidence: [SKILL.md](https://github.com/Leonxlnx/taste-skill/blob/e988add20dab0fa97d7a76781c48961c8184288e/skills/redesign-skill/SKILL.md#L6) — Scan then diagnose then fix, explicit existing-stack and targeted-upgrade workflow.; [SKILL.md](https://github.com/Leonxlnx/taste-skill/blob/e988add20dab0fa97d7a76781c48961c8184288e/skills/redesign-skill/SKILL.md#L31) — Color and surface prescriptions include one accent and added texture irrespective of original brand unless adaptation overrides.


#### image-to-code

5,820 words/1,228 lines, one file. Consolidate repeated generation/count/regeneration/extraction clauses into one output contract and one reference checklist. Choose image count from the approved requested design scope/readability and actual tool support, with a bounded refinement budget. If a user supplies a design, preserve it as the source; generating replacements must be a deliberate new-design choice. Treat generated text as draft, never as authority to replace verified prices/legal/product claims. Preserve the prompt-authoring and design-bible work even if duplicated stylistic prose moves into references.

**Preserve:** Distinct end product: executable frontend with deliberate reference extraction (text, typography, spacing, color, structure), responsive first view, coherent assets and anti-drift implementation. Supplied visual-parity baseline remains immutable under the separate parity root, including its environment, metric, tolerance and measured residual.

**Acceptance:** Evaluate new-design-to-code, supplied screenshot implementation, exact parity request and technical CSS bugfix separately. Verify no unnecessary generation on supplied-baseline/parity/technical tasks, correct code versus image-only deliverable, responsive extraction and working interactions. Exact parity must pass its original measured tolerance without altering original baseline. Measure image calls/tokens/time and fidelity before removing repeated instruction blocks.

Evidence: [SKILL.md](https://github.com/Leonxlnx/taste-skill/blob/e988add20dab0fa97d7a76781c48961c8184288e/skills/image-to-code-skill/SKILL.md#L55) — Requires generating images itself and declares generated images primary visual source of truth.; [SKILL.md](https://github.com/Leonxlnx/taste-skill/blob/e988add20dab0fa97d7a76781c48961c8184288e/skills/image-to-code-skill/SKILL.md#L133) — Image-count and fresh-generation rules repeat through sections 3–7 and 18; fresh regeneration replaces unclear views.


#### imagegen-frontend-web

5,819 words/987 lines, one file. Replace unbounded defaults with a planned requested set and explicit readability/refinement criteria; preserve one-image-per-section when requested or needed. Current unspecified landing/site requests default six/eight separate generations; this is a clear possible cost driver, not measured waste. Move theme/component/palette examples to selected private references. Retain scene/section prompt construction, shared design bible and narrative/CTA direction. Let actual image-tool aspect-ratio/output support constrain the plan.

**Preserve:** Images as final deliverable, implementation-readable composition, varied section rhythm, coherent typography/palette across a set, brief-over-default precedence and readable narrative/conversion sequence. Do not erase this prompt-building capability by replacing it with generic qs-code-build or assuming all visual tasks want code.

**Acceptance:** Compare single hero, explicitly eight sections, unspecified small landing concept, and typography-only brief. Preserve requested images/count, avoid code implementation, keep coherent references and do not infer a large set when a bounded sample would satisfy an explicit small scope. Measure generation count, iterations, latency and visual coherence. Prompt-only asks should remain prompt-only when that is the user instruction.

Evidence: [SKILL.md](https://github.com/Leonxlnx/taste-skill/blob/e988add20dab0fa97d7a76781c48961c8184288e/skills/imagegen-frontend-web/SKILL.md#L6) — Hard rule one separate horizontal image for every section, defaults landing six/full website eight and sequential calls.; [SKILL.md](https://github.com/Leonxlnx/taste-skill/blob/e988add20dab0fa97d7a76781c48961c8184288e/skills/imagegen-frontend-web/SKILL.md#L103) — Adaptation priority says brief overrides defaults; includes explicit typography-only/minimalist allowance.


#### imagegen-frontend-mobile

6,552 words/1,465 lines, one file. Collapse repeated non-genericity/readability/style dial sections into a brief and design-bible checklist. Keep platform mode, user journey, safe-area, navigation and frame rules as focused mobile references. Bound extra-screen/detail-regeneration loops to identified missing requested states; choose repeatable style definitions over many overlapping numeric dials. Preserve requested raw-screen output and do not force visible devices.

**Preserve:** Images only; no SwiftUI/Flutter/React Native/HTML code. iOS/Android/cross-platform distinction, safe areas, believable navigation/state progression, consistent device framing when requested, readable text and stable product identity. This is broader mobile product-flow design than the marketing-only main Taste root.

**Acceptance:** Use iOS onboarding, Android commerce flow, neutral settings screen, raw-screen-only request and image-only request in an implementation repo. Verify correct platform, complete requested flow, safe areas, consistent framing/no frame when requested, no code changes and no website-hero substitution. Compare image count/iterations and flow consistency before approving a shared web/mobile root.

Evidence: [SKILL.md](https://github.com/Leonxlnx/taste-skill/blob/e988add20dab0fa97d7a76781c48961c8184288e/skills/imagegen-frontend-mobile/SKILL.md#L14) — Targets auth/onboarding/settings/chat/commerce/mobile flows; explicitly excludes websites and code.; [SKILL.md](https://github.com/Leonxlnx/taste-skill/blob/e988add20dab0fa97d7a76781c48961c8184288e/skills/imagegen-frontend-mobile/SKILL.md#L84) — Images-only contract; no switching into coding mode.

### Batch 4 — HyperFrames

All nine managed directories changed; adopt only with compatible runtime and transitive-module coverage. Current public roots can become privately loaded domains, but the behavior and resources must survive. Runtime strings and directory references need not share the new public command name.

| Current identity | Origin | Proposed disposition |
| --- | --- | --- |
| `hyperframes` | HyperFrames | Keep one QS video entry; retain workflow routing as internal modules. |
| `hyperframes-animation` | HyperFrames | Keep a private motion domain; do not flatten into prose. |
| `hyperframes-audio` | HyperFrames | Keep a distinct mixing module; optional QS audio entry if direct use warrants it. |
| `hyperframes-cli` | HyperFrames | Keep one technical operations reference; a separate QS render entry is optional. |
| `hyperframes-core` | HyperFrames | Preserve as required technical module for every author/edit route. |
| `hyperframes-creative` | HyperFrames | Keep private creative direction and prompt-expansion references. |
| `hyperframes-keyframes` | HyperFrames | Keep private seek-safe implementation domain, separate from scene strategy. |
| `hyperframes-registry` | HyperFrames | Keep private component discovery/wiring module. |
| `media-use` | HyperFrames | Keep private asset sourcing/generation module; expose QS media only for an independently useful workflow. |

#### hyperframes

New creator-language routes distinguish cuts, zooms, audio mixing and Studio. Inventory transitive workflow dependencies before wrapping: the installed router runs skills update <workflow>, which installs/refreshes more than the nine manifest entries. Replace implicit upstream refresh with managed compatible module resolution.

**Preserve:** Fresh creation intake, existing-project resumption and operation-only requests; selected workflow ownership. Keep underlying names/paths where scripts depend on them; a public QS root must not auto-invoke other public roots.

**Acceptance:** Route fresh topic, existing BRIEF, render-only, caption-only and combined edit cases; verify no unintended brief interview, plugin installation, publication or pin bump.

Evidence: [SKILL.md](https://github.com/heygen-com/hyperframes/blob/2734ee2c02ef858f3c877c18b56ebcfbb846cb4c/skills/hyperframes/SKILL.md) — Installed contract and pinned-to-reviewed source comparison; [skill-lifecycle.md](https://github.com/heygen-com/hyperframes/blob/2734ee2c02ef858f3c877c18b56ebcfbb846cb4c/skills/hyperframes/references/skill-lifecycle.md) — Named workflow update installs dependencies; bare update refreshes existing skills.


#### hyperframes-animation

Adopt seek-safe CSS push correction and self-contained installed-script imports; add motion-blur/character pointers only when relevant.

**Preserve:** Atomic rules, scene blueprints, transitions, runtime adapters and analysis scripts; deterministic random-seek behavior.

**Acceptance:** Render transition start/mid/end and seek backwards in shuffled order; execute animation-map from an isolated installed directory without repository-relative imports.

Evidence: [SKILL.md](https://github.com/heygen-com/hyperframes/blob/2734ee2c02ef858f3c877c18b56ebcfbb846cb4c/skills/hyperframes-animation/SKILL.md) — Installed contract and pinned-to-reviewed source comparison; [css-push.md](https://github.com/heygen-com/hyperframes/blob/2734ee2c02ef858f3c877c18b56ebcfbb846cb4c/skills/hyperframes-animation/transitions/css-push.md) — Push destination remains opaque during transition.


#### hyperframes-audio

Adopt role-pure voice groups for repeatable carve and new submix bus rules only with a supporting runtime. Default carve changes from 0.25 to 0.8; treat that as an audible behavior change, not a harmless docs refresh.

**Preserve:** Placed-track mixing versus sourcing; clip-local versus composition-time automation; carve on the bed clip, never the group bus.

**Acceptance:** Mix several narration clips over music, add a later narration clip and re-analyze, exclude SFX/music from voice group; audition and render-check levels, timing and preview/export agreement.

Evidence: [SKILL.md](https://github.com/heygen-com/hyperframes/blob/2734ee2c02ef858f3c877c18b56ebcfbb846cb4c/skills/hyperframes-audio/SKILL.md) — Installed contract and pinned-to-reviewed source comparison.


#### hyperframes-cli

Review timeline inspection, background preview and changed render quality names (looks/delivery), plus updated command aliases. Keep costly cloud/render operations task-directed. Remove automatic external feedback from a QS adaptation.

**Preserve:** Local versus cloud rendering, diagnostics, batch variables, exact supported flags and explicit publish intent.

**Acceptance:** On the chosen pinned CLI: help/doctor/check, draft and delivery render, preview lifecycle and one batch. Unsupported flags fail visibly; render-only request must not publish or install skills.

Evidence: [SKILL.md](https://github.com/heygen-com/hyperframes/blob/2734ee2c02ef858f3c877c18b56ebcfbb846cb4c/skills/hyperframes-cli/SKILL.md) — Installed contract and pinned-to-reviewed source comparison.


#### hyperframes-core

Update canvas sizing (runtime-sized root), registration after async build, sub-composition transport details and creator-editing recipes. Process references move to router directory; copying only SKILL.md breaks the dependency graph.

**Preserve:** Timing attributes, source trims, media playback ownership, sub-composition IDs, deterministic seeks and snapshots.

**Acceptance:** Minimal standalone and templated sub-composition render with fonts and local assets; aspect-ratio change, adjacent trims and overlapping clips; validate random seeks and runtime registration.

Evidence: [SKILL.md](https://github.com/heygen-com/hyperframes/blob/2734ee2c02ef858f3c877c18b56ebcfbb846cb4c/skills/hyperframes-core/SKILL.md) — Installed contract and pinned-to-reviewed source comparison; [creator-editing-recipes.md](https://github.com/heygen-com/hyperframes/blob/2734ee2c02ef858f3c877c18b56ebcfbb846cb4c/skills/hyperframes-core/references/creator-editing-recipes.md) — Combined editing contracts and limits.


#### hyperframes-creative

Adopt source-traceable visual vocabulary, updated typography and self-contained script loading. Share selected brief/style facts with frontend only through neutral data, not frontend layout/motion mandates.

**Preserve:** Video-specific readability, pacing, narration, beat planning, style presets and creative prompt building.

**Acceptance:** Compare a sourced explainer and product video: every quantitative/visual claim traceable, text readable at delivery resolution, no repeated intake; exercise audio-data helper from installed layout.

Evidence: [SKILL.md](https://github.com/heygen-com/hyperframes/blob/2734ee2c02ef858f3c877c18b56ebcfbb846cb4c/skills/hyperframes-creative/SKILL.md) — Installed contract and pinned-to-reviewed source comparison; [story-spine.md](https://github.com/heygen-com/hyperframes/blob/2734ee2c02ef858f3c877c18b56ebcfbb846cb4c/skills/hyperframes-creative/references/story-spine.md) — New source-traceable visual guidance.


#### hyperframes-keyframes

Adopt plain-language zoom/reframe/camera routing and truthful cut/retime/freeze limits. Animate inner crop wrappers rather than timed clips.

**Preserve:** Pose continuity, timeline registration, random seeking and cross-domain audio/timing boundaries; no invented face tracking or automatic frame matching.

**Acceptance:** Punch-in plus hard cut, smooth multi-state reframe and picture/sound crossfade at random timestamps; source time stays correct and no duplicate audio ownership.

Evidence: [SKILL.md](https://github.com/heygen-com/hyperframes/blob/2734ee2c02ef858f3c877c18b56ebcfbb846cb4c/skills/hyperframes-keyframes/SKILL.md) — Installed contract and pinned-to-reviewed source comparison.


#### hyperframes-registry

Search existing named effects before hand-authoring; reflect English-only search and cached-discovery versus network-install distinction. Do not copy upstream automatic search-miss feedback submission.

**Preserve:** Discovery does not install; block/sub-composition versus snippet wiring; no automatic contributions or public reports.

**Acceptance:** Non-English brief with English discovery query; unavailable network with cached catalog; confirm install failure is reported and no fallback reports/PRs are submitted.

Evidence: [SKILL.md](https://github.com/heygen-com/hyperframes/blob/2734ee2c02ef858f3c877c18b56ebcfbb846cb4c/skills/hyperframes-registry/SKILL.md) — Installed contract and pinned-to-reviewed source comparison.


#### media-use

Major runtime move: resolver and helpers are now hyperframes media-use commands instead of skill-local scripts. Update skills/runtime together and preserve provider setup, local fallback, asset caches and license/source metadata.

**Preserve:** Media generation versus placed-track mixing; official logo sourcing; image/voice prompt construction and selected media treatments.

**Acceptance:** Resolve an existing local asset, one available provider path and an unavailable-provider path; verify paths/provenance; exercise CLI doctor without assuming authentication or buying/generating assets.

Evidence: [SKILL.md](https://github.com/heygen-com/hyperframes/blob/2734ee2c02ef858f3c877c18b56ebcfbb846cb4c/skills/media-use/SKILL.md) — Installed contract and pinned-to-reviewed source comparison; [setup-providers.md](https://github.com/heygen-com/hyperframes/blob/2734ee2c02ef858f3c877c18b56ebcfbb846cb4c/skills/media-use/references/setup-providers.md) — Provider/runtime setup remains a prerequisite.

### Batch 5 — Unlazy

Review the pinned source against the unreleased target 2.1.0 source tree. This is executable tooling as well as instruction text. Do not treat a prose refresh as adoption of checker/process fixes.

| Current identity | Origin | Proposed disposition |
| --- | --- | --- |
| `unlazy` | Leonxlnx/unlazy | Retain opt-in completion discipline; a QS-named adaptation can keep its scripts private. |

#### unlazy

Prioritize definition-bound evidence, stale-evidence rejection, non-successful abandonment, gate lint, installed-file safety and process timeout fixes. Keep whole-project checks at integration branches instead of every leaf. Do not import mandatory atomic fan-out into every task.

**Preserve:** Gates before substantial work, direct evidence, independent re-verification, no hooks without authorization, coordination is not a sandbox. Upstream source is unreleased target 2.1.0.

**Acceptance:** Test changed CHECK/EXPECT/CWD invalidates evidence, abandoned leaf prevents complete, edited dependent artifact fails reverify, isolated script import, timeout cleanup and Windows behavior. Upstream suite is required before pin adoption; not run in this analysis.

Evidence: [SKILL.md](https://github.com/Leonxlnx/unlazy/blob/754d9a68109e39b836cc72a39fb9a823f9d6b613/SKILL.md) — Installed contract and pinned-to-reviewed source comparison; [SKILL.md](https://github.com/Leonxlnx/unlazy/blob/16671491f6679ad9378f52604d3bc2415b4120c7/SKILL.md) — New bound evidence and verification layers.

### Batch 6 — Find Skills

The skill directory is unchanged. The separately pinned Skills CLI installer is a different dependency; this review does not approve an installer upgrade.

| Current identity | Origin | Proposed disposition |
| --- | --- | --- |
| `find-skills` | vercel-labs/skills | Fold discovery into QS Help and managed adoption into QS Setup; preserve source credit. |

#### find-skills

Upstream skill unchanged. Narrow generic how-do-I triggers to explicit capability discovery; assess task fit and actual instruction quality, not stars/install counts alone. Recommend approved pinned workflow instead of broad npx skills update.

**Preserve:** Search-and-compare capability, source links and no-match fallback; finding a skill does not authorize global installation.

**Acceptance:** Ordinary coding question gets answered without installation search; explicit find request checks existing catalog then external options; install/update respects manifest, integrity and local-edit conflicts.

Evidence: [SKILL.md](https://github.com/vercel-labs/skills/blob/c6f69c631292444cc541ac6d91e2226b0ff247da/skills/find-skills/SKILL.md) — Installed contract and pinned-to-reviewed source comparison.

## Unpromoted reference inventory

These nineteen inherited entries are not packaged public skills. This is a
scope/disposition inventory, not a full update or behavioral audit of dormant
material. Keep them outside all installable projections. Their original paths
remain provenance; none needs a QS alias merely to normalize the active menu.

| Reference | Disposition |
| --- | --- |
| `misc/git-guardrails-claude-code` | Host-specific hook recipe; retain reference, no unsolicited hook install. |
| `misc/migrate-to-shoehorn` | Specific test-data migration; keep reference, no blanket dependency adoption. |
| `misc/scaffold-exercises` | Author's course-specific CLI/layout; do not promote into general teaching. |
| `misc/setup-pre-commit` | Optional setup recipe; adopt only for an actual project need. |
| `personal/edit-article` | Personal writing process; not a reason to constrain all QS prose to short paragraphs. |
| `personal/obsidian-vault` | Author-specific absolute vault path; do not expose as portable capability. |
| `in-progress/batch-grill-me` | Optional independent-question technique; no exhaustive interview default. |
| `in-progress/claude-handoff` | Host-specific background launch; QS handoff preserves evidence without launching work. |
| `in-progress/loop-me` | Workflow discovery ideas can inform Clarify/Spec; no separate automatic loop. |
| `in-progress/setup-ts-deep-modules` | Optional architecture enforcement recipe, not unconditional dependency installation. |
| `in-progress/to-questionnaire` | Useful async stakeholder intake template; consider inside Clarify when requested. |
| `in-progress/wizard` | Manual setup script template; consider inside Setup with explicit mutation/secret handling. |
| `in-progress/writing-beats` | Personal article assembly; retain, no new default command. |
| `in-progress/writing-fragments` | Personal exploratory writing; retain, no new default command. |
| `in-progress/writing-shape` | Personal article shaping; retain, no new default command. |
| `deprecated/design-an-interface` | Interface exploration belongs to private module/candidate techniques; no forced three-agent sweep. |
| `deprecated/qa` | Intake and issue work belong to current Triage/Debug/Verify with their own authority. |
| `deprecated/request-refactor-plan` | Clarify/Spec/Review cover the useful intents without an exhaustive interview mandate. |
| `deprecated/ubiquitous-language` | Domain vocabulary remains private capability; no automatic glossary-file mutation. |

## Adoption sequence and proof required

| Group | Priority and owner | Concrete scope | Acceptance before adoption |
| --- | --- | --- | --- |
| A — local clarity and targeted correctness | First; current QS/PS owners | Help/Handoff contradiction, prototype helper authority, conditional pointers, debug redaction, expand-contract slicing, independent test oracles, source-bound evidence. | Scenario checks for actual behavior changes; no extra public commands or approval gates; generated projections and repository checks pass. |
| B — instruction efficiency | Next; shared generators and Skill Write | Compress repeated contract text; extract conditional host/style/examples. | Fresh actual generation/execution trials and task-matched before/after cost and outcome measurements. Never update fixture hashes alone. |
| C — frontend consolidation | After preservation cases are defined; proposed QS frontend/image owners | Share brief/redesign preservation, select style presets, retain image-only web/mobile and image-to-code contracts, keep parity independent. | Existing-brand, real-content, accessibility, platform-flow, image-only and supplied-reference cases pass without extra image calls or unintended edits. |
| D — namespace and install migration | Alongside adopted surface changes; catalogs/projector/control plane | QS public names, provenance mappings, optional package membership, private modules, safe old-name retirement. | Clean install, upgrade, local-edit conflict, duplicate detection and rollback across Claude/Codex/Pi; no imports of another package's public skill bodies. |
| E — executable upstream refresh | Separate compatibility batch; Unlazy and HyperFrames | Pin reviewed checker improvements and coordinated video/runtime changes with transitive dependency inventory. | Upstream tests where applicable, isolated installed-layout checks and meaningful render/audio/seek evidence; retain existing pin on unresolved incompatibility. |

These groups describe implementation work remaining after the analysis. The
current source snapshot still contains the identified problems. A larger skill
count is acceptable when each exposed command earns its place through a distinct
user intent; it is not justification for promoting all internal capabilities.

## Verification of this review

- Exact coverage checked against both catalogs and the contributor manifest:
  51 public/contributor entries and 20 private capabilities. Missing-row and
  duplicate-row negative controls were rejected. This proves coverage, not
  recommendation quality; source/authority review supplies the latter evidence.
- Source paths, local documentation links and reported footprint counts checked.
  All eighteen installed contributor directories still match approved digests.
- `npm run sync:codex` passed without changing canonical output contracts or
  generated command documentation; `npm run check:codex` passed.
- `npm test`: 237 passed, zero failed. Claude CLI was unavailable, so its optional
  three-root plugin validation was not run.
- No proposed consolidation, runtime update or compressed instruction set has
  been deployed or behaviorally benchmarked. Those acceptance checks remain in
  the adoption sequence above.
