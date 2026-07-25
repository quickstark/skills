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

**Report profile**: The purpose-specific presentation of a promoted skill's readout. It determines which real results are most useful to understand first.
_Avoid_: Universal template, interchangeable skill layout.

**Primary signal**: The real result a report profile should communicate most prominently, such as evidence, clarified domain terms, test results, review findings, or deployment readiness.
_Avoid_: Decoration, invented metric, placeholder outcome.

**Visual cue**: A compact, accessible presentation that makes an actual status, grouping, count, sequence, or comparison easier to understand at a glance.
_Avoid_: Decorative chart, fabricated progress, simulated activity.

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

## Relationships

- An issue tracker holds many issues.
- An issue carries one triage role at a time.
- A decision ticket is an issue used by the roadmap workflow.
- A promoted skill is the source of truth for its generated Codex-plugin copy.
- Each adapted promoted skill retains an identifiable upstream counterpart.
- A skill run produces one immutable skill readout.
- Each promoted skill has one purpose-specific report profile and primary signal.
- A visual cue represents observed readout information; a catalog preview never represents an actual skill run.
- A project library groups immutable readouts by verified project.
- A publication policy restricts which verified projects can appear in a hosted project library.
