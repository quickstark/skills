# QuickStark Skills

A personal collection of namespaced engineering and productivity skills for Codex and Claude Code, adapted from Matt Pocock's MIT-licensed upstream. Promoted commands share the `/qs-` prefix and are organized by purpose. `/qs-setup` emits per-project configuration; `/qs-help` explains the complete workflow.

## Language

**Issue tracker**: The tool that hosts a project's issues: GitHub Issues, Linear, a local `.scratch/` Markdown convention, or another explicitly configured system. `/qs-plan-tickets`, `/qs-plan-spec`, and `/qs-flow-triage` read from or write to it.

**Issue**: A tracked unit of work in the issue tracker, such as a bug, specification, request, or implementation slice.

**Decision ticket**: A `/qs-plan-roadmap` unit that records a question whose resolution is a decision rather than an implementation deliverable.

**Triage role**: A state-machine label applied to an issue by `/qs-flow-triage`. Its actual label string is documented in `docs/agents/triage-labels.md` for the project using the skill.

**Promoted skill**: A canonical skill in `skills/engineering/` or `skills/productivity/`, registered in the skill catalog and included in both plugin distributions.

**Upstream skill**: Matt Pocock's original, unprefixed version. The original-to-personal name mapping is recorded in `scripts/qs-skill-catalog.mjs`.

**Skill run**: An actual invocation of a promoted skill that produces an observed outcome. A recommendation or preview is not a skill run.
_Avoid_: Suggested skill, simulated run, example execution.

**Skill readout**: The concise, self-contained record of an individual skill run or explicitly labeled preview. Its status, findings, decisions, outputs, and checks describe only what actually occurred.
_Avoid_: Dashboard, generated work, completion claim.

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

## Relationships

- An issue tracker holds many issues.
- An issue carries one triage role at a time.
- A decision ticket is an issue used by the roadmap workflow.
- A promoted skill is the source of truth for its generated Codex-plugin copy.
- Each adapted promoted skill retains an identifiable upstream counterpart.
- A skill run produces one immutable skill readout.
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
