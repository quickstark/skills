# QuickStark Skills

A personal collection of namespaced engineering and productivity skills for Codex and Claude Code, adapted from Matt Pocock's MIT-licensed upstream. Promoted commands share the `/qs-` prefix and are organized by purpose. `/qs-setup` emits per-project configuration; `/qs-help` explains the complete workflow.

## Language

**Issue tracker**: The tool that hosts a project's issues: GitHub Issues, Linear, a local `.scratch/` Markdown convention, or another explicitly configured system. `/qs-plan-tickets`, `/qs-plan-spec`, and `/qs-flow-triage` read from or write to it.

**Issue**: A tracked unit of work in the issue tracker, such as a bug, specification, request, or implementation slice.

**Decision ticket**: A `/qs-plan-roadmap` unit that records a question whose resolution is a decision rather than an implementation deliverable.

**Triage role**: A state-machine label applied to an issue by `/qs-flow-triage`. Its actual label string is documented in `docs/agents/triage-labels.md` for the project using the skill.

**Promoted skill**: A canonical skill in `skills/engineering/` or `skills/productivity/`, registered in the skill catalog and included in both plugin distributions.

**Upstream skill**: Matt Pocock's original, unprefixed version. The original-to-personal name mapping is recorded in `scripts/qs-skill-catalog.mjs`.

## Relationships

- An issue tracker holds many issues.
- An issue carries one triage role at a time.
- A decision ticket is an issue used by the roadmap workflow.
- A promoted skill is the source of truth for its generated Codex-plugin copy.
- Each adapted promoted skill retains an identifiable upstream counterpart.
