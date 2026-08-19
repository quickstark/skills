# QuickStark Skills

A personal collection of namespaced skills for Codex and Claude Code. The QS packages are adapted from Matt Pocock's MIT-licensed upstream; the optional explicit-only PS package adapts Lauren Tan's MIT-licensed pstack without Cursor-specific mechanisms.

## Language

**Issue tracker**: The tool that hosts a project's issues: GitHub Issues, Linear, a local `.scratch/` Markdown convention, or another explicitly configured system. `/qs-plan-tickets`, `/qs-plan-spec`, and `/qs-flow-triage` read from or write to it.

**Issue**: A tracked unit of work in the issue tracker, such as a bug, specification, request, or implementation slice.

**Decision ticket**: A `/qs-plan-roadmap` unit that records a question whose resolution is a decision rather than an implementation deliverable.

**Triage role**: A state-machine label applied to an issue by `/qs-flow-triage`. Its actual label string is documented in `docs/agents/triage-labels.md` for the project using the skill.

**Promoted skill**: A canonical public skill registered in the skill catalog and included in its assigned Claude and Codex plugin distributions.

**Core skill**: A promoted skill shipped in the default `qs-skills` plugin. The core contains the twelve commands used for the main engineering workflow.
_Avoid_: Default skill, bundled helper.

**Specialist skill**: A promoted skill shipped in the optional `qs-specialists` plugin. Core skills never require a specialist skill to complete their work.
_Avoid_: Extra skill, hidden skill.

**PS skill**: One of thirteen explicit-only public commands shipped in the optional `ps-skills` plugin. Its exact Codex literal is `$ps-skills:<ps-command>`; it never starts another public skill automatically.
_Avoid_: Cursor command, automatic router, bundled core skill.

**Internal capability**: Non-command instructions or reference material used inside a root skill run. It never produces its own readout or invokes a public skill.
_Avoid_: Internal skill, chained skill.

**Root skill**: The one public skill explicitly selected for a skill run. One root skill produces one skill readout.
_Avoid_: Parent skill, orchestrator skill.

**Upstream skill**: Matt Pocock's original, unprefixed version. The original-to-personal name mapping is recorded in `scripts/qs-skill-catalog.mjs`.

**Skill run**: An actual invocation of a promoted skill that produces an observed outcome. A recommendation or preview is not a skill run.
_Avoid_: Suggested skill, simulated run, example execution.

**Skill readout**: The concise, self-contained record of an individual skill run or explicitly labeled preview. Its status, findings, decisions, outputs, and checks describe only what actually occurred.
_Avoid_: Dashboard, generated work, completion claim.

**Effort mode**: The `quick`, `standard`, or `deep` bound on how much work a root skill performs. `standard` is the default and effort does not determine report length.
_Avoid_: Runtime promise, model setting.

**Report mode**: The `brief` or `full` presentation depth of a skill readout. `brief` is the default even for deep work.
_Avoid_: Effort mode, execution depth.

**Completion state**: The root skill's explicit `complete`, `continuation-required`, or `input-required` disposition. It determines whether the readout contains a next prompt.
_Avoid_: Skill status, inferred follow-up.

**Next prompt**: One of three ranked copy-ready continuations emitted by every non-release command. The first is the opinionated preferred route and the other two are alternatives. Each appears in its own fenced `text` code block, explicitly invokes a catalog-approved follow-on skill using the exact installed literal (`$qs-skills:<core-command>`, `$qs-specialists:<specialist-command>`, or `$ps-skills:<ps-command>` in Codex; `/<command>` in Claude), and carries forward the outcome plus only the single highest-value evidence item. The fence info string is always exactly `text`, which renders as Plain text in chat; it is never `markdown`, `bash`, `json`, or another language. A subdued callout underneath can suggest a model and thinking level. Model guidance is heuristic, never a measured result or automatic configuration change. A prompt suggests future work; it never claims its embedded skill has already run. Release is terminal and emits no prompts.
_Avoid_: Skill-only recommendation, invented accomplishment, autonomous invocation, mandatory follow-up.

**Execution context**: The automatically observed machine and platform that actually generated a skill readout, plus any independently verified deployments and repository-relative files modified by that specific run.
_Avoid_: Guessed host, full machine path, dirty-worktree snapshot, unrelated change.

**Observed deployment**: An independently verified deployment environment, status, and optional safe HTTP or HTTPS service URL. A configured target is not a completed or healthy deployment.
_Avoid_: Assumed production, guessed service URL, unverified health, embedded credentials.

**Changed project file**: A safe repository-relative file path and explicit added, modified, deleted, or renamed state observed for the current skill run.
_Avoid_: Pre-existing user edit, absolute machine path, secret file, invented diff.

**Report profile**: The purpose-specific presentation of a promoted skill's readout. It determines which real results are most useful to understand first.
_Avoid_: Universal template, interchangeable skill layout.

**Primary signal**: The real result a report profile should communicate most prominently, such as evidence, clarified domain terms, test results, review findings, or deployment readiness.
_Avoid_: Decoration, invented metric, placeholder outcome.

**Visual cue**: A compact, accessible presentation that makes an actual status, grouping, count, sequence, or comparison easier to understand at a glance.
_Avoid_: Decorative chart, fabricated progress, simulated activity.

**Delivery provenance**: Independently verified evidence linking a skill run to actual GitHub pull requests, actually closed issues, a confirmed release version, or a real Git commit. A locally observed commit is not a published commit, and a closed issue is not closed by a release unless that release relationship was separately verified.
_Avoid_: Guessed PR, fabricated release, inferred issue closure, implied push.

**Observed relationship**: An explicitly recorded connection between two actual report findings, decisions, outputs, or checks. A visual graph or arrow represents only such a recorded connection.
_Avoid_: Invented dependency, decorative connector, inferred sequence.

**Review axis**: One independent code-review perspective, either repository standards or specification requirements. Findings remain grouped by their actual axis instead of being combined into an undifferentiated verdict.
_Avoid_: Blended review, flattened finding, overall winner.

**Finding priority**: An observed review finding's explicit `P0`, `P1`, `P2`, or `P3` urgency. Omit the priority when it was not actually assessed.
_Avoid_: Invented severity, unlabeled criticality, decorative warning.

**Catalog preview**: A clearly labeled demonstration of a report profile that does not claim a skill ran, a check passed, a decision was made, or project files changed.
_Avoid_: Completed run, sample results, test evidence.

**Verified project**: A project identified by its canonical repository identity rather than an inferred free-text heading.
_Avoid_: Guessed repository, project label, folder nickname.

**Project library**: The collection of skill readouts grouped by their verified projects. It can be explored by project or actual recent activity.
_Avoid_: Source-code browser, public file share.

**Immutable report**: A skill readout whose unique identity and recorded outcome are preserved after creation.
_Avoid_: Editable latest report, overwritten run.

**Publication policy**: The explicit decision about which verified projects may appear in an externally accessible report library.
_Avoid_: Publish everything, inferred authorization.

**Readout producer**: An explicitly authorized harness instance that submits a skill readout using its own scoped machine credential.
_Avoid_: Anonymous reporter, browser session, globally shared token.

**Producer grant**: The explicit set of verified projects that one readout producer may submit to the hosted project library.
_Avoid_: Implicit trust, unrestricted project access, guessed repository ownership.

**Readout ingestion**: The bounded, authenticated interface that validates a producer, enforces its producer grant and publication policy, and durably accepts one immutable skill readout.
_Avoid_: General file upload, writable report viewer, anonymous report endpoint.

**External skill readout**: An honest, server-rendered record of an authorized skill run from a harness or skill collection outside the promoted QuickStark catalog.
_Avoid_: Fabricated promoted skill, imported HTML, invented delivery evidence.

**Readout publisher**: The portable, explicitly configured adapter that optionally sends one local skill readout to the authenticated ingestion interface without discarding its local report.
_Avoid_: Automatic exfiltration, inferred publication, compulsory remote dependency.

## Canonical command order

The catalog owns discovery order without numeric command-name prefixes:

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

Optional specialists follow as a separate package: `qs-plan-research`, `qs-design-prototype`, `qs-code-document`, `qs-test-author`, `qs-test-verify`, `qs-learn-teach`, and `qs-skill-write`. Hosts that impose alphabetical sorting use that stable host order without renaming commands.

## Relationships

- An issue tracker holds many issues.
- An issue carries one triage role at a time.
- A decision ticket is an issue used by the roadmap workflow.
- A promoted skill is the source of truth for its generated Codex-plugin copy.
- Each adapted promoted skill retains an identifiable upstream counterpart.
- A promoted skill is either a core skill or a specialist skill.
- A skill run has one root skill, can use internal capabilities, and produces one immutable skill readout.
- A public skill never automatically invokes another public skill; only the user can start the next root skill.
- Every non-release skill readout contains three ranked next prompts in every completion state: one preferred route and two alternatives. A release readout is terminal and contains none.
- Effort mode bounds execution while report mode independently controls presentation depth.
- Every actual skill readout records its real execution machine; previews do not describe a run.
- An execution context contains only deployments and project files actually verified for that run.
- A GitHub-facing skill run can record optional delivery provenance only from independently verified records.
- An observed relationship connects two results that the same readout actually recorded.
- A code-review finding belongs to one independently assessed review axis and can have an observed finding priority.
- Each promoted skill has one purpose-specific report profile and primary signal.
- A visual cue represents observed readout information; a catalog preview never represents an actual skill run.
- A project library groups immutable readouts by verified project.
- A publication policy restricts which verified projects can appear in a hosted project library.
- A readout producer owns one explicitly scoped producer grant.
- Readout ingestion accepts a producer's skill readout only when its producer grant and publication policy both authorize the verified project.
- An external skill readout preserves the actual harness, producer, collection, and skill without changing the promoted skill catalog.
- A readout publisher preserves the local skill readout even when optional hosted publication is unavailable or unauthorized.
