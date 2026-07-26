Quickstart:

```bash
codex plugin marketplace add ./codex
codex plugin add qs-skills@quickstark
```

[Source](https://github.com/mattpocock/skills/tree/main/skills/productivity/handoff)

## What it does

`qs-flow-handoff` compacts the current conversation into a **handoff document** — a single write-up a fresh agent can read to pick up the work where you left off.

It does **not** re-state what already lives elsewhere. Anything captured in a spec, plan, ADR, issue, commit, or diff is referenced by path or URL, never copied. The document carries only the live thread — what you were doing, why, and what's next — and it's saved to your OS's temporary directory, not into the workspace, so it never becomes another artifact to maintain.

## When to reach for it

You invoke this by typing `/qs-flow-handoff` — the agent won't reach for it on its own. Pass a note about what the next session is for and the document is tailored to it.

Reach for this when a conversation has gone long enough that its context is at risk — you're near a context limit, wrapping for the day, or deliberately handing the work to another agent — and you want the thread preserved without dragging the whole transcript along.

## What the document carries

- **The live thread** — what's in flight and why, in the conversation's own terms, minus anything already written down elsewhere.
- **Suggested skills** — a pointer to the skills the next agent should reach for to continue.
- **References, not copies** — links and paths to the specs, plans, ADRs, issues, and diffs that hold the settled detail.
- **Redacted secrets** — API keys, passwords, and PII stripped before the document is written.

The idea to hold onto is **compaction**: a handoff is the conversation squeezed down to just its resumable core, so a fresh agent inherits the momentum, not the noise.

## Output and next steps

`/qs-flow-handoff` automatically starts or reuses a private, health-checked readout viewer; generates an architecture-quality, self-contained HTML readout; and closes with the same concise report used across the collection: status, skills actually used, outcome, actual execution machine, the verified viewer link and real readout path, real outputs or checks where applicable, and the best next step. Each skill uses its own compact, purpose-specific visual report profile; charts, concept maps, review matrices, and check summaries represent only actual recorded results. Relevant runs can include verified deployment environments and URLs, repository-relative files actually changed, independently verified GitHub pull requests, actually closed issues, released versions, complete Git commit hashes, and explicitly observed visual relationships. Local commits are never labeled as published, and issue closure is never attributed to an unverified release. On a Mac the viewer uses localhost; on a headless or SSH-connected Linux dev box it uses a protected private home-network URL. Tailscale is not required. Its readout uses the shared `scripts/qs-skill-readout.mjs` generator and defaults to the OS temporary `quickstark-readouts` directory. Set `QS_READOUT_DIR=/docker/appdata/quickstark-readouts` to opt into durable, project-organized storage and browse verified projects, searchable reports, and actual recent activity. Catalog previews remain explicitly identified, and no report claims that a suggested skill has already run.

Depending on what actually happened, the next step may be:

- [`/qs-help`](https://github.com/quickstark/skills/blob/main/skills/engineering/qs-help/SKILL.md) — Orient the receiving session around the next appropriate workflow.
- [`/qs-code-build`](https://github.com/quickstark/skills/blob/main/skills/engineering/qs-code-build/SKILL.md) — Resume a clearly documented implementation or ticket.
- [`/qs-plan-clarify`](https://github.com/quickstark/skills/blob/main/skills/engineering/qs-plan-clarify/SKILL.md) — Resume an unresolved decision before continuing implementation.

## Where it fits

`qs-flow-handoff` is a reach-for-it-anytime standalone — it sits at the seam between two sessions rather than inside a build chain. It pairs naturally with the artifact-producing skills whose output it points at: [qs-plan-spec](https://aihero.dev/skills-to-spec), because a finished spec is exactly the kind of settled detail a handoff references instead of repeating. When you're unsure which skill fits the moment, [qs-help](https://aihero.dev/skills-ask-matt) routes you.
