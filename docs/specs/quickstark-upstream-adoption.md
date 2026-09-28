# Specification: QuickStark upstream adoption and skill interfaces

**Status:** Specified; implementation not started
**Scope:** Adoption groups A–E from the [2026-09-25 source review](../upstream/skill-review-2026-09-25.md)
**Baseline:** QuickStark 3.8.0, repository HEAD `5d0d0ba`
**Decision sources:** The user's confirmed preservation/namespace preferences, the source review, [upstream index](../upstream/README.md), current catalogs, and [skill-run contract](../skill-run-contract.md)
**Delivery boundary:** Specification only; no tickets, installation, publication, version change or runtime migration in this run

This specification governs the proposed adoption. Existing package membership and
validators remain authoritative until the corresponding migration is implemented.
Historical consolidation specs do not override the current direct-chat,
continuation, progress or authorization contracts. This document replaces no
historical provenance record.

## Problem and intended outcome

QuickStark combines concise adapted workflows with eighteen separately installed
contributor skills. Useful upstream improvements coexist with redundant reporting
text, contradictory local instructions and overlapping frontend recipes. Renaming
all installed files would neither preserve their integrity records nor reliably
reduce the command menu. Broad consolidation risks losing prompt authoring,
immutable visual comparisons and video-specific technical behavior.

The outcome is a clear QS command interface backed by attributed, selectively
loaded capabilities. Fix local clarity and correctness first, measure instruction
efficiency, and use optional packages to control exposure. Every existing managed
capability must have a recorded destination or deliberate disposition; fewer
commands alone is not acceptance evidence.

## Governing decisions and exclusions

1. Preserve all twenty current QS public workflows, including separate
   `qs-deploy-prompt`, `qs-skill-write`, planning, test authoring and test verification.
   Their existing names remain stable. Membership can be changed deliberately in
   future work; no frequency ranking is inferred from this conversation.
2. Preserve pstack's distinct public outcomes under QS names. Visual parity remains
   its own command. Runtime evidence collection and analysis of an immutable
   supplied trace remain separate. Evaluation, optimization and PR monitoring
   retain their independent contracts.
3. Consolidate duplicate Help routing. Keep verification creation and maintenance
   as two commands in this adoption: their different starting state and allowed
   edits justify the distinction. A later measured consolidation may combine them;
   this specification does not require that experiment to ship this work.
4. Consolidate frontend workflow duplication and select style presets privately.
   Preserve image-only web/mobile work, image-to-code, image prompt construction,
   supplied references, and real content. Preserve HyperFrames creative prompt
   expansion and every necessary technical module.
5. Use optional packages, not a global count cap. Fresh installation defaults to
   core only. Existing machines preserve their selected capabilities during
   migration. New optional packages are never inferred from an ordinary update.
6. One public root owns one result. Shared internal modules never invoke public
   roots, report separately or require another package's public skill body.
   Existing explicit goal coordination remains the sole narrow exception.
7. Adopt upstream behavior selectively at immutable revisions. An ancestry baseline,
   reviewed source and actually adopted behavior are different records.
8. Publication, installation on this machine, vendor-plugin renaming, dormant
   reference promotion, dashboard/telemetry changes, broad dependency upgrades,
   automatic feedback submission and automatic hook installation are excluded.
   Normal task authority still applies during future execution; optional packages
   and deeper effort do not grant additional mutation or publication authority.

## Current-state evidence

| Evidence | Consequence |
| --- | --- |
| QS catalog owns 12 core and 8 specialist commands; PS owns 13 commands and 16 internal capabilities; QS has 4 private capabilities. | Preserve exact baseline membership until catalog/projector migration lands together. |
| `qs-help` begins with one recommended root but later requests three prompts; its continuation list does not express all advertised routing destinations. | Separate Help's primary routing choice from ordinary continuation restrictions and emit one prompt. |
| Handoff retains preferred-plus-alternatives text; prototype UI/logic helpers retain production promotion instructions. | Reconcile root/helper authority before making those helpers easier to load. |
| Generated completion text is 1,149 of 1,385 words in Debug, 1,155 of 1,286 in Skill Write, and 922 of 1,037 in PS How. | Compression is a measured candidate, not a proven performance improvement. |
| Deployment-prompt fixtures bind actual model responses to exact source/prompt hashes. | Changed instructions need fresh responses; hashes-only fixture updates are invalid. |
| Seven Taste directories and Find Skills are unchanged at the reviewed revisions. | Improve adaptations without claiming upstream updates where none exist. |
| All nine managed HyperFrames directories changed; media helpers moved to CLI commands and process references moved between modules. | Adopt a compatible skills/runtime/dependency set, not isolated instruction files. |
| HyperFrames can install named workflows and refresh core skills during a run. | Resolve a closed, pinned private dependency set; do not let workflow routing change the selected menu. |
| `managed-skills.mjs` passes all maintained packages to manager actions. The personal reconciler iterates desired names without general old-name retirement. | Optional package selection and safe retirement are required implementation, not existing features. |

Sources: [QS catalog](../../scripts/qs-skill-catalog.mjs),
[PS catalog](../../scripts/ps-skill-catalog.mjs),
[registry](../../scripts/skill-collection-registry.mjs),
[managed updater](../../scripts/managed-skills.mjs),
[reconciler](../../scripts/personal-skills/reconcile.mjs),
[recorded trial evidence](../validation/progress-deploy.md).
The source review supplies per-skill evidence and exact external comparison pins.

## Architecture decision

| Boundary | Responsibilities and callers | Migration and failure isolation | Test seam |
| --- | --- | --- | --- |
| One broad QS skill with modes and all source text | A single root selects every engineering, design and video workflow. | Fewer visible entries, but every caller depends on broad routing; loading and authority mistakes affect unrelated tasks. | Large routing matrix; hard to isolate an audio or parity regression. |
| Intent-specific QS commands with optional packages and private modules — selected | Public roots own outcome and authority; internal modules own reusable technical detail; packages own exposure and complete dependency closure. | Rename callers through catalog metadata, migrate one package at a time, retain prior compatible payload on failure. | Root behavior trials, module/asset integrity, package isolation and migration transactions can fail independently. |
| Thin QS aliases over installed upstream public skills | Names are local, behavior stays in external roots. | Creates duplicate exposure, cross-package body dependencies, changing upstream behavior and ambiguous authority. | Alias tests cannot prove actual dependency closure or stable invocation. |

Select intent-specific commands. There is no generic workflow engine or new
cross-package runtime service. Extend existing catalogs, registry, generators and
control-plane modules at their current boundaries. Shared private material may be
copied into each consuming projection from one canonical source; it must be
source-synchronized and independently usable in each package.

## Public interface and optional packages

All names below are proposed target identities. They are not currently installed
commands. Catalogs declare exact membership and invocation metadata; tests assert
that declared membership, rather than treating a total count as product policy.

| Package | Public interface | Installation behavior |
| --- | --- | --- |
| `qs-skills` | Current twelve core roots, unchanged names and lifecycle order | Fresh default; works without optional packages |
| `qs-specialists` | Current eight roots, including `qs-deploy-prompt` and `qs-skill-write` | Optional; preserve existing selection |
| `qs-advanced` | The twelve PS-derived roots mapped below | Replaces selected `ps-skills` functionality during migration |
| `qs-frontend` | `qs-design-frontend`, `qs-design-image-web`, `qs-design-image-mobile`, `qs-design-image-to-code` | Optional frontend and image-authoring workflows |
| `qs-video` | `qs-video`, backed by private workflows and domains | Optional; adoption gated on complete video preservation evidence |
| `qs-execution` | `qs-unlazy`, backed by the reviewed checker/modules | Optional substantial-work completion discipline |

Names have one owner; a root is not shipped in both core and an optional package.
Preserve existing QS invocation policy. Renamed PS roots and new frontend, video
and execution roots start explicit-only in canonical/Claude/Pi metadata; retain
the existing Codex projection exception. Broader implicit activation requires its
own routing evidence and is outside this adoption. Each catalog entry supplies
a purpose-specific display name, short description, default prompt and eligible
continuations; generate exact harness literals rather than embedding package
names in shared prose. `qs-deploy-prompt` alone retains the special
`goal-workflow-prompt` output kind.
Help can describe known optional capabilities using generated metadata. Before
emitting an executable literal, verify actual availability. Missing capability
produces a concise installation prerequisite, not an invented runnable prompt or
automatic install. Available targets use registry-generated Codex/Claude/Pi
literals. Primary Help routing may select any available public root; it still emits
at most one prompt and never starts that root.

### Retained QS membership

This adoption retains these baseline roots and their current package membership.
They remain separate public intents; none is absorbed into a generic root.

| Package | Retained commands |
| --- | --- |
| `qs-skills` | `qs-help`, `qs-setup`, `qs-plan-clarify`, `qs-plan-roadmap`, `qs-plan-spec`, `qs-code-build`, `qs-code-debug`, `qs-review-code`, `qs-git-merge`, `qs-deploy-release`, `qs-flow-triage`, `qs-flow-handoff` |
| `qs-specialists` | `qs-plan-research`, `qs-design-prototype`, `qs-code-document`, `qs-test-author`, `qs-test-verify`, `qs-learn-teach`, `qs-skill-write`, `qs-deploy-prompt` |

### Pstack mapping

| Existing identity | Target identity / owner | Preserved distinction |
| --- | --- | --- |
| `ps-help` | `qs-help`; no replacement alias | Read-only discovery and one root recommendation |
| `ps-how` | `qs-how` in `qs-advanced` | Evidence-backed implementation walkthrough |
| `ps-why` | `qs-why` in `qs-advanced` | Rationale, inference and unknown intent |
| `ps-blast-radius` | `qs-blast-radius` in `qs-advanced` | Read-only impact analysis, including hidden serialized contracts |
| `ps-runtime-forensics` | `qs-runtime-forensics` in `qs-advanced` | Authorized live observation, distinct from product repair |
| `ps-trace-forensics` | `qs-trace-forensics` in `qs-advanced` | Immutable supplied artifact; no inferred live collection |
| `ps-create-verification-skill` | `qs-create-verification-skill` in `qs-advanced` | Create and actually exercise verification assets |
| `ps-maintain-verification-skill` | `qs-maintain-verification-skill` in `qs-advanced` | Repair existing harness/map drift without masking product defects |
| `ps-skill-eval` | `qs-skill-eval` in `qs-advanced` | Controlled, blinded evaluation with retained failed trials |
| `ps-hillclimb` | `qs-hillclimb` in `qs-advanced` | Frozen sensitive measurement harness and keep/revert decisions |
| `ps-visual-parity` | `qs-visual-parity` in `qs-advanced` | Immutable baseline, approved tolerance and measured residual |
| `ps-pr-babysit` | `qs-pr-babysit` in `qs-advanced` | Bounded monitoring, cancellation and current-head evidence |
| `ps-worktree-cleanup` | `qs-worktree-cleanup` in `qs-advanced` | Selected exact paths, active-work exclusions and fresh pre-removal checks |

All sixteen PS private capabilities remain mapped to their owners, including
owners whose names change. All four QS private capabilities remain private.
Keep original PS candidate IDs and the 72-candidate historical disposition
snapshot; a new upstream baseline gets its own reconciled inventory. Do not
pretend a public namespace rename changes the historical source identity.

### Contributor mapping

| Existing source identity | Target owner | Preserved content |
| --- | --- | --- |
| `design-taste-frontend` | `qs-design-frontend` | Brief, brand, responsive implementation and preservation rules |
| `redesign-existing-projects` | `qs-design-frontend`, audit/preserve/overhaul paths | Existing-site diagnosis and scoped changes |
| `high-end-visual-design` | Private dimensional style reference | Optional typography, depth and spacing treatment |
| `minimalist-ui` | Private restrained style reference | Optional flat, low-motion treatment |
| `imagegen-frontend-web` | `qs-design-image-web` | Image-only web references and section prompt construction |
| `imagegen-frontend-mobile` | `qs-design-image-mobile` | Image-only platform-aware flows, safe areas and framing |
| `image-to-code` | `qs-design-image-to-code` | Design extraction, responsive code and interaction implementation |
| `hyperframes` | `qs-video`, private intake/workflow routing | Fresh creation, resumption and operation-only behavior |
| `hyperframes-core` | Private video composition domain | Timing, assets, source ranges, sub-compositions and deterministic registration |
| `hyperframes-animation` | Private video animation domain | Rules, blueprints, transitions, adapters and scripts |
| `hyperframes-keyframes` | Private video keyframe domain | Seek-safe poses, zoom/reframe/camera and honest mechanism limits |
| `hyperframes-creative` | Private video direction domain | Brief/style data, narration, rhythm and prompt expansion |
| `hyperframes-audio` | Private video mixing domain | Placed-track effects, groups, carve and automation |
| `hyperframes-cli` | Private video operations domain | Supported local/cloud commands, diagnostics and rendering |
| `hyperframes-registry` | Private video component domain | Search, selected installation and correct wiring |
| `media-use` | Private video media domain | Sourcing/generation, providers, asset metadata and treatments |
| `unlazy` | `qs-unlazy` | Gate tooling, evidence, verification and optional orchestration |
| `find-skills` | `qs-help` discovery / `qs-setup` managed adoption | Existing-catalog search, source comparison and explicit install boundary |

The single video entry is gated, not an instruction to drop failed routes. If a
route cannot preserve behavior or direct discoverability, retain its existing
managed entry until a tested replacement exists. Additional QS audio/render roots
may be specified from concrete failed cases; no numerical target requires the
single-entry proposal to pass. Other package migrations may proceed independently.

## Group A — local clarity and targeted correctness

Implement these changes within existing owners and package membership first.

| Owner | Required change | Evidence that must remain |
| --- | --- | --- |
| Help and Handoff | Remove contradictory multi-prompt instructions. Align primary Help routing metadata with its advertised destinations. Retain one actionable continuation and exact resumption state. | Prompt-building, parity, build and unavailable-package routing cases; no public execution |
| Prototype and retained UI/LOGIC helpers | Reconcile isolation/cleanup instructions; offer standalone HTML logic demos when useful. Make helper loading conditional on the question and remove automatic production promotion. | Same hypothesis/candidate criteria, valid/invalid state demo and no production edits outside selected scope |
| Setup, Triage, Teach, Review | Add only useful conditional pointers; reconcile helper authority before linking. Move host-specific review details behind relevant pointers without losing evidence/anchor requirements. | No automatic tracker mutation, course scaffolding, inline comment or extra workflow from loading a helper |
| Debug and capture template | Redact displayed/shared auth-bearing evidence; warn that captured observations may be echoed. Revisit the shared premise after repeated disproved fixes. | Synthetic secret redaction, discriminating causal evidence, original reproducer and regression check |
| Spec's ticket-decomposition reference | Add expand → caller migration → contract sequencing and the integration-branch exception for non-independently-green intermediate steps. | Dependency graph requires every migration before deletion; spec-only work creates no tracker tickets |
| Test Author, TDD and structural enforcement | Derive expectations independently and use known-bad controls where a tautological test is plausible. Retain valid absence/configuration/contract checks. | A representative defect fails; no blanket test-shape bans or extra production-seam permission gates |
| Git Merge | Concise observed before/after evidence, material risks and rollback impact in PR descriptions when that operation is authorized. | Actual changed artifacts; no fabricated benchmark, stage-all behavior or extra publication |
| Skill Write | Conditional references, model-relative instruction trials and runtime lookup of discoverable facts. Preserve source/successor attribution. | Dedicated reusable-skill output; no automatic execution or release |
| PS/private evidence owners | Bind reports to source revision and measurement method; append corrections to run-scoped decision records. Reuse existing runtime schemas when relevant. | Stale revision/wrong sample method rejected; prior evidence retained; no reflex dependency installation |
| Verification, evaluation, hillclimb, parity, monitoring | Restore review-identified abbreviated omissions: doctor, complete feature accounting, evidence surviving cleanup, blinded trials, fixed sensitive comparison harnesses and current-head checks. | Product defects stay visible; frozen baseline/tolerance, authority and cancellation boundaries survive |

Remaining per-skill recommendations in the source review are constraints on these
owners, not an instruction to rewrite every unchanged body. Document a no-change
disposition where existing guidance already meets the intended behavior. Do not
import fixed providers, forced agent counts, exhaustive interviews, blanket TDD
seam approvals or automatic public-skill chains.

## Group B — measured instruction efficiency

### Required structure

Change shared contract generators before generated skill copies. Keep essential
root rules inline: result/authority boundaries, effort/report independence,
completion states, required evidence, progress truthfulness, current-root versus
whole-goal completion, one-prompt behavior and cancellation/resumption. Helpers
contribute evidence to one parent without their own public report.

Move examples, unusual host adapters and optional techniques to explicitly named,
condition-triggered references. Do not replace standalone package instructions
with a link into the source repository or another package. A generated execution
prompt remains self-contained; compressing its generator's report is not permission
to omit instructions required by the receiving run.

Preserve weighted stage/overall estimates, stable scope and weights, truthful
waiting, reopening on invalidated evidence, the unverified 95% ceiling and verified
100% boundary. Do not restore obsolete hosted-report or no-prompt-on-complete rules.

### Measurement and acceptance protocol

1. Freeze task inputs, expected authority/outcome checks, candidate source hashes,
   model/host configuration, run order, retry policy and evaluation rubric before
   comparison. Use natural task prompts; candidate labels/paths must not reveal
   which variant is preferred. Record unavailable controls rather than claiming
   identical conditions.
2. Run the current source and candidate against the existing six generation,
   nine execution and ten percentage scenarios, plus Help/Handoff, standalone
   Debug, Skill Write and optional-reference routing cases. Preserve historical
   responses and failed attempts. New inputs supplement existing cases.
3. Use at least three matched repetitions per variant per scenario for an adoption
   comparison. Keep all outputs; interleave variant order. A separate reviewer
   evaluates actual responses against the frozen contract; self-certification and
   deterministic text matching alone are insufficient behavioral evidence.
4. Record total instructions actually loaded, tokenizer/model identity when token
   counts are available, reference loads, tool/image calls, elapsed time and outcome.
   Word counts are a separate source-size measure. Include setup/extra retrieval
   cost; moving text into a reference that is always loaded is not a reduction.
5. Every required authority/completion/preservation case must pass. Retain a
   candidate only with lower median loaded instruction tokens over the fixed
   workload and no new required-outcome failure or unrequested operation. If token
   telemetry is unavailable, establish a named tokenizer measurement or report the
   cost result as unverified and keep the baseline. Do not equate a few passing
   trials with reliability across all models.
6. Evaluate readability/quality on the frozen rubric, with case scores and reviewer
   rationale. The candidate must meet each predeclared quality floor and not lower
   aggregate quality. Any noise margin or expanded sample rule is defined from
   baseline variability before seeing candidate results. Latency/cost improvement
   claims require their own measurements; token reduction alone cannot support them.
7. Preserve raw responses and source/prompt hashes in revisioned validation records.
   Update current-source fixture bindings only after fresh actual responses pass.
   If a required case fails, revise/retest or retain the baseline; never silently
   relax the criterion or rewrite a failed response into passing evidence.

A failed compression candidate does not block verified Group A correctness fixes.
The group is complete when a measured candidate passes or a documented experiment
retains the baseline; only the former may be reported as an efficiency improvement.

## Group C — frontend behavior and consolidation

### Root contracts

- `qs-design-frontend`: produce or revise a selected frontend. Derive audit-only,
  preserve or overhaul intent from the request and existing authority. Audit-only
  emits findings without code edits. Preserve mode retains URLs, real copy/data,
  brand, analytics, IDs and behavior; overhaul changes only the authorized scope.
  Marketing-oriented Taste guidance must not masquerade as a complete dashboard
  or multistep product-UX methodology. Out-of-domain work uses established project
  requirements and appropriate available capability, without imposing a landing
  page recipe or automatically invoking another root.
- `qs-design-image-web`: requested image references or prompt-only output for web
  design. No code implementation. Determine the requested visual scope before
  allocating image calls; no default six/eight-generation expansion for a small
  request. Preserve requested sections, image count and readable detail.
- `qs-design-image-mobile`: requested image references or prompt-only output for
  mobile flows. Preserve platform, navigation, state coverage, safe areas and raw
  screen/device-frame preference. Do not substitute website sections for screens.
- `qs-design-image-to-code`: implement the selected design as responsive code.
  A supplied reference remains authoritative. Generate a new design only when
  design generation is within the task; use private prompt construction rather
  than invoking an image root. An exact parity request retains the independent
  parity contract and cannot be satisfied by replacing or regenerating its target.

Each image-producing root returns its requested primary images; the ordinary
in-chat completion report does not prohibit task deliverables. Prompt-only intent
must not generate images. Missing image capability or incompatible tool parameters
is reported honestly, without invented outputs or mandatory alternate-provider setup.

### Shared references and preservation

One shared brief schema records intent, audience, source references, brand/content
constraints, platform, target states/sizes, requested output and already-settled
choices. Load only relevant style/platform/implementation references. Dimensional
and restrained styles are alternatives, not cumulative requirements. Existing
brand/design-system choices and accessibility override preset font, icon, card,
spacing and motion defaults.

Retain design-bible and prompt-construction techniques; reduce duplicated wording,
not useful design reasoning. Real publication dates, metrics, names, prices and
claims must not be randomized to look less generic. Bound refinements to a stated
missing requested outcome and available budget. Test greenfield, audit-only,
preserve, overhaul, existing-brand, legitimate round metrics, reduced motion,
keyboard/narrow screens, image-only mobile flow, prompt-only and supplied-reference
cases. Compare loaded instructions, image calls and output quality using Group B's
matched-trial principles. Retire an old contributor entry only after its mapped
preservation cases pass and Group D can migrate it safely.

### Visual parity remains independent

`qs-visual-parity` changes only the selected implementation. Record baseline hash,
state/viewport coverage, assets/fonts/engine, comparison method, tolerance and
iteration budget before changes. Missing approved/repository tolerance requires
input before implementation edits. Freeze the comparison settings; changes
invalidate prior results. Complete only when every declared comparison meets its
tolerance. Never crop, rescale, regenerate or replace the baseline to improve the
score. Aesthetic preference cannot override it.

## Group D — identity, provenance and installation migration

### Ownership and schemas

Existing collection catalogs remain owners of public membership and historical
source mappings. Extend the shared registry to describe optional collections,
private capability dependencies and exact literals. Keep QS sources in engineering/
productivity; PS-derived canonical commands may move into those buckets when
renamed. Retain historical PS metadata independently of canonical destination.
Contributor adaptations become repository-owned canonical roots/private modules;
do not edit machine-installed upstream copies as canonical sources.

Introduce these versioned records, with validation and generated documentation:

| Record | Required fields and invariants |
| --- | --- |
| `config/skill-provenance.json` | Stable capability ID; canonical owner/path; public/private role; legacy identities; disposition; source array; adaptation notes; validation evidence. Each source has repository, original name/path, license/notice paths, immutable baseline and reviewed revisions, actually adopted revision or explicit unknown/not-adopted state, and digest where byte identity is claimed. Multiple origins are supported. |
| `config/skill-profiles.json` | Named profiles and explicit package IDs. `core` selects only `qs-skills`; optional selections use registry IDs. No implicit all-packages profile on normal update. |
| `config/skill-migrations.json` | Migration ID/version; old package/skill identities and owned locations; accepted prior digests/versions; replacement IDs; capability coverage; retirement preconditions; rollback metadata. A migration never authorizes arbitrary filesystem deletion. |
| Machine selection, under `~/.config/quickstark/skills-selection.json` | Schema version, selected package IDs and managed standalone resources, profile/explicit additions, template/migration revision and last successful transaction. Configured path override may be supported. This is selection state, not upstream approval or credential storage. |
| Private dependency metadata in catalog/provenance | Owner, internal module ID, source-derived paths/assets/scripts, transitive references, compatible runtime profile and generated destination. No unresolved implicit download or public-skill dependency. |

The source array records reviewed versus adopted separately. Matt's common ancestor
is not an assertion that every current byte derives from that commit. Preserve
original `writing-great-skills` identity and its reviewed `writing-for-agents`
successor. Keep substantial reinterpretations, such as PS authority versus data
boundary discipline, explicit. Preserve Matt/Lauren MIT notices, Taste/Unlazy/
Finder attribution, and required HyperFrames Apache notices and modification
attribution. Do not infer a missing license or source hash.
Repository-authored capabilities may have an empty upstream source array with an
explicit authored disposition; never manufacture an upstream origin for them.

The personal contributor manifest continues to describe unchanged upstream payloads.
An adapted private module is not an upstream byte-identical `agent-skill` entry.
Keep source digests and derived-content digests separate. Retire mapped manifest
entries only through a migration after their replacement is verified. Dormant
misc/personal/in-progress/deprecated material stays unpromoted.

### Selection interface — proposed, not yet implemented

Extend `skills:plan` and `skills:update` with `--profile <id>` and repeatable
`--with-package <id>`. A supplied profile starts a desired selection; additions
extend it. Without selection flags, use saved selection. `plan` is read-only;
`update` persists selection only after the transaction succeeds. Unknown IDs,
conflicting profile state and unavailable package metadata fail before mutation.
Existing `--agent` selection continues to select harnesses independently.

For a fresh machine without saved selection, default to core. For a previously
managed machine without saved selection, construct a migration preview from
verified managed identities and preserve their equivalent capability selection;
never reduce it silently to core or infer ownership of unknown/vendor copies.
Persist the adopted selection with the successful migration. Ordinary no-flag
updates update selected packages/resources only, never opt into newly introduced
optional packages. Removing a package from desired selection is a distinct
retirement operation subject to the same ownership/revalidation safeguards.

If a replacement package would add public outcomes beyond the old selection,
show the exact additions and retain the old usable entries until that broader
package selection is explicitly chosen. A renamed package is not blanket consent
to unrelated capabilities. A conflicting or partially managed old installation
must not be treated as a fresh machine and reset to core-only.

Help remains available to describe optional packages without importing them. Every
package is independently usable. Generate complete manifests, metadata, concise
docs and required private content for Claude/Codex/Pi. A package's discoverable
`SKILL.md` files are exactly its public roots; private upstream instruction bodies
use non-command reference filenames. Rewrite and validate affected internal links
and script dependencies explicitly. Preserve existing runtime filenames where
required; public QS naming does not require changing `.unlazy` or HyperFrames
runtime identifiers.

### Migration transaction and failures

1. **Plan:** inspect selected harnesses, canonical identities, symlink targets,
   ownership records, full digests, versions and actual exposed names. Enumerate
   replacement, retained, conflicting and retireable entries. Bind the plan to
   observed paths/digests and target package versions.
2. **Stage:** generate/fetch only approved replacement payloads into a location
   outside discovery roots. Verify notices, source/derived integrity, package
   closure and compatibility. Network/auth failure leaves active state untouched.
3. **Revalidate:** immediately before changing exposure, verify old paths, hashes,
   selected resources and locks still match the plan. Local edits, changed links,
   unknown ownership or manager conflicts block the affected migration.
4. **Apply:** keep verified backups and a transaction journal. Expose each migrated
   package without simultaneous old/new public identities; when a host manager
   cannot switch atomically, use a recoverable maintenance sequence and verify
   actual discovery before declaring success. A temporary unavailable entry is
   preferable to claiming successful coexistence. Do not promise atomic manager APIs.
5. **Retire and verify:** remove only unchanged, proven-owned old projections and
   links whose replacements passed capability checks. Update lock/selection state;
   verify exact selected exposure, no duplicates and complete private resources.
6. **Recover:** on failure, reverse only journaled owned operations, restore prior
   selection/payload and verify discovery. If rollback itself fails, report exact
   remaining manager/filesystem state and a bounded recovery action; never claim
   the machine converged. Retain backups/evidence until recovery is verified.

A migration conflict preserves the old usable capability and does not authorize
renaming or deleting locally modified/vendor-managed copies. Selected unrelated
packages may update through separate verified transactions, with partial outcomes
reported explicitly. Interrupted retries are idempotent. `ps-skills` remains
available as the previous release until replacement verification; retirement must
not require an old and new package to import each other's bodies.

## Group E — executable upstream refresh

Maintain two independently releasable compatibility tracks. Use the immutable
reviewed revisions in the source index as candidates; do not substitute current
`main` during implementation without recording and reviewing its delta. Taste
and Find Skills need no content-pin bump for this review; the Skills CLI installer
is separately pinned and excluded from blanket updates.

### Unlazy

Adopt the coherent reviewed checker/scripts/reference set after its own regression
suite and isolated-install checks pass. Preserve opt-in substantial-work routing;
trivial requests do not acquire a gate tree. Require definition-bound evidence,
stale-evidence rejection, non-successful abandonment, bounded timeout cleanup,
file/path protections and parent re-verification. Gate lint is advisory unless
explicit strict mode is selected. Keep full-project checks at integration branches
rather than every leaf. Do not make atomic multi-agent dispatch mandatory for all
work. Existing host/developer delegation controls prevail.

A recorded approval binds the declared oracle/environment, not every transitive
script. Reverify artifacts after relevant changes. Leases coordinate cooperating
writers; they are not a sandbox. Keep optional hooks uninstalled unless expressly
authorized. Prove moved-install recovery preserves unrelated hook settings.
Upstream labels this source unreleased target 2.1.0; adoption notes must not call it
a published release. Unsupported host/runtime behavior retains the existing pin
and produces a compatibility gap, not a successful update.

### HyperFrames

The package must include a declared transitive closure of the nine mapped domains
and every supported selected workflow. Intake references, workflow bodies, provider
configuration, animation adapters, scripts and their imports are part of that
closure. Build from reviewed canonical adaptations with pinned origin records;
ordinary use cannot run upstream skill refresh/install to recover an undeclared
module. A missing workflow is reported before authoring dependent output.

Record an exact tested CLI/runtime version, package integrity, supported Node/host
versions, skill revisions and compatibility evidence. The source review has not
established that runtime version; determine it through capability checks and
render tests before pin adoption. This is an implementation gate, not a user
preference or permission question. Do not guess a version or broaden an old
project's pin merely to make new instructions applicable.

Adopt media resolution's CLI interface with doctor/provider/local fallback paths;
composition sizing/registration/sub-composition corrections; seek-safe transitions;
installed-script loading fixes; creator-language routing; and role-correct audio
groups/automation. New carve strength and delivery options require intentional
sound/output acceptance. Do not equate lint success with identical frames or mix.

Required fixture matrix: fresh creation, existing brief/resume, render-only,
caption-only, hard-cut plus zoom, picture/sound crossfade, mixed audio groups with
later narration, non-English catalog query, offline cached discovery versus failed
install, local/provider asset resolution, sub-composition with fonts/assets,
aspect-ratio change, transition endpoints and shuffled/random seeks. Verify actual
render/audio output for applicable cases and disclose unavailable provider paths.
A required unsupported path blocks that package's adoption, not other packages.

Preserve existing project pins and select compatible instructions for them; an
explicitly authorized project upgrade is a separate bounded operation with backup,
check/render evidence and rollback. Ordinary routing must not submit feedback,
search-miss reports, telemetry commands or upstream PRs. Document runtime-provided
telemetry honestly; do not claim complete silence based only on skill behavior.
Cloud rendering, paid generation and publication remain within the user's actual
request and existing authority.

## Acceptance matrix

Every criterion below is pending implementation. Structural tests, actual agent
trials and runtime trials prove different things; none substitutes for the others.

| ID | Required outcome | Decisive evidence |
| --- | --- | --- |
| AC-01 | Complete disposition coverage | Catalog/manifest-derived check covers the 51 baseline public/contributor identities and 20 private capabilities; missing/duplicate/ownerless controls fail. |
| AC-02 | Dedicated prompt-building retained | Separate QS Skill Write/Deploy Prompt identities; real generation trials show one self-contained prompt and no execution; frontend/video prompt-only cases preserve requested output. |
| AC-03 | One correct Help/Handoff route | Available build/prompt/parity and unavailable-package cases; exact literal, one prompt, preserved resumption evidence, zero automatic invocation. |
| AC-04 | Root/helper authority consistent | Prototype, setup, triage, teaching and review cases preserve selected scope; no helper-driven production/tracker/comment mutation. |
| AC-05 | Debug evidence safe and causal | Synthetic auth artifacts remain redacted; changed premise yields discriminating investigation; original failure and regression checks establish repair. |
| AC-06 | Safe decomposition and test oracles | Expand/migrate/contract graph and integration exception; known-bad control fails; legitimate absence/config tests retained. |
| AC-07 | Restored evidence disciplines | Revision/sample-method mismatch rejected, append-only corrections, evidence survives owned cleanup, product failures remain visible. |
| AC-08 | Reporting behavior survives compression | Fresh matched trials pass generation, execution, progress, waiting, reopening, cancellation, recovery and one-root cases; raw failures/history retained. |
| AC-09 | Efficiency claim is measured | Fixed workload and configuration, matched repetitions, actual loaded-token accounting and rubric scores; qualifying candidate or explicit retained-baseline outcome. |
| AC-10 | Frontend contracts survive | Audit/preserve/overhaul, real data, brand, responsiveness/accessibility, image-only/prompt-only, web/mobile and supplied-reference cases pass. |
| AC-11 | Visual parity remains exact | Independent QS root; baseline tamper, relaxed threshold, omitted state and environment mismatch fail; all declared residuals meet fixed tolerances. |
| AC-12 | Pstack capabilities remain available | All twelve non-router outcomes and sixteen private capabilities resolve; live/artifact forensics, create/maintain, evaluation/optimization/monitoring authority cases pass. |
| AC-13 | Provenance survives renames/merges | Every public/private owner has original identities, revision/adoption distinction, disposition, notices and verified claimed digests; multiple-source and unknown-adoption fixtures supported. |
| AC-14 | Optional really means selected | Fresh no-flag install is core-only; saved selection survives update; adding a registry package does not select it; old-machine migration preserves known managed capability selection. |
| AC-15 | Exact public exposure and isolation | Per-harness discovery matches selected catalog roots; private files stay hidden; every package works without another package's public bodies. |
| AC-16 | Migration preserves local/unknown state | Dirty copy, foreign plugin, changed symlink/path/hash and unknown owner block retirement; unrelated state byte-preserved. |
| AC-17 | Retry and rollback converge honestly | Fault injection at stage/exposure/retirement/state-write boundaries; no duplicate identities; interrupted retries idempotent; failed rollback reports actual residual state. |
| AC-18 | HyperFrames dependency closure | Nine domains and supported workflow references/scripts/assets resolve in an isolated installed package; removing a required resource fails the check. |
| AC-19 | Video behavior/runtime preserved | Exact compatibility profile plus actual render/audio/seek fixture evidence; unavailable required runtime/provider path blocks adoption. |
| AC-20 | No route-driven external side effects | Creation/render/search-miss cases trigger no skill refresh, project pin upgrade, external report or publication outside authority. |
| AC-21 | Unlazy correctness and portability | Upstream suite, stale-definition/abandonment/dependent-artifact controls, installed imports, process cleanup and supported-host evidence; hooks remain opt-in. |
| AC-22 | Deterministic projections and metadata | Sync/check/tests, exact literals/frontmatter/display metadata, all registered manifests/version equality; canonical/Claude/Pi explicit flags and Codex projector exception retained. |
| AC-23 | Documentation matches shipped state | Generated provenance/selection/migration docs match records; reviewed, adopted, planned and retained-baseline outcomes clearly distinguished; dormant entries remain unpromoted. |
| AC-24 | Rollout is independently gated | Group/package evidence audit, compatibility failures retain previous usable selection/pins; no release claim from documentation or a queued operation alone. |

## Dependency order and implementation boundaries

These are implementation groups, not newly created tracker tickets.

1. **A first:** fix contradictions and targeted correctness within current names and
   membership. Establish preservation cases and provenance entries for each change.
   Capture the post-A baseline before evaluating compression.
2. **B after A's affected contracts settle:** compare generated-contract candidates
   and conditional references. Ship only verified improvements; an inconclusive
   experiment retains baseline text with evidence.
3. **D foundation:** extend registry/selection/provenance and migration planning
   without exposing new roots. Preserve old valid inputs and add structural
   failure controls. This foundation may proceed alongside B after A's interface
   decisions settle.
4. **C and E privately:** develop frontend adapters and the two runtime tracks
   against D's stable metadata interfaces. Keep candidates outside active discovery.
   Each package supplies its own evidence; neither runtime track blocks unrelated
   local clarity or frontend work.
5. **D activation, package by package:** after relevant C/E/rename preservation
   evidence passes, generate new projections and migrate selected installations.
   Use expand/migrate/contract: replacement validated first, callers and locks next,
   old identities removed only after current consumers are accounted for.
6. **Rollout:** release A/B compatible changes separately where possible. Treat
   command/package renames and selection-default changes as a breaking release with
   migration notes; choose the exact release number through the existing release
   process. Keep all registered manifests and lockfile versions synchronized.
   Publication requires its own authorized execution and validation.

If no independently green slice is possible, use an isolated integration branch
and one explicit final acceptance gate; do not weaken intermediate tests or present
partial activation as a released state. Preserve the previous release for recovery.

Implementation touches canonical skills/private references, collection catalogs,
registry, output/doc/projector generators, managed selection/reconciliation modules,
new provenance/profile/migration records and focused behavioral/migration fixtures.
Generated package copies are never edited independently. No tracker integration,
provider service or generic orchestration platform is introduced by this design.
Update `AGENTS.md`, root/bucket indexes, marketplace entries and installation docs
at the same membership transition. Replace fixed legacy totals with assertions
against the explicitly selected target membership; retain tests that reject
unknown, missing, duplicate and multiply owned commands. Generalizing the registry
must not make accidental public promotion pass validation.

## Validation and completion of implementation

For each changed source/package/doc group, run the repository's required
`npm run sync:codex`, `npm run check:codex` and `npm test`. When Claude is available,
validate each applicable registered package root with `claude plugin validate
<root> --strict`; extend package enumeration as new collections are introduced.
Static fixtures cover all harness projections, but actual host discovery/manager
behavior must be verified on each supported rollout host. Unavailable mandatory
host evidence leaves that rollout pending and must not be reported as passed.

Record acceptance by criterion and package in a durable validation document with
source hashes, environments, commands, raw trial references and limitations. Tests
of the current baseline do not fulfill pending migration criteria. Implementation
is complete only when every in-scope requirement is either adopted with its stated
evidence or, for expressly permitted experiments, retained at baseline with the
failed/inconclusive result recorded. Capability migration requirements cannot be
silently converted into optional experiments to claim completion.

## Open questions

None require a product decision before Group A begins. Exact tested HyperFrames
runtime/host compatibility and compression/consolidation trial outcomes are
implementation evidence gates. They may retain existing behavior or delay the
affected package as specified above; they are not reasons to reopen the user's
settled prompt-building, parity, provenance or optional-package preferences.
