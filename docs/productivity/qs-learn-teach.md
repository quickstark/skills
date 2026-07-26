Quickstart:

```bash
codex plugin marketplace add ./codex
codex plugin add qs-skills@quickstark
```

[Source](https://github.com/mattpocock/skills/tree/main/skills/productivity/teach)

## What it does

`qs-learn-teach` turns the current directory into a standing teaching workspace and teaches you one topic across many sessions — devising short, beautiful, interactive lessons tied to *why* you want to learn.

It does **not** teach from the model's own memory. Parametric knowledge is treated as untrusted; before it can teach, it gathers high-trust resources and grounds every claim in a citation. And it is stateful — the workspace remembers what you've learned, so each session picks up where the last left off rather than starting from scratch.

## When to reach for it

You invoke this by typing `/qs-learn-teach` — the agent won't reach for it on its own.

Reach for it when you want to *learn* a topic over time — a language, a framework, yoga, theoretical physics — and want the sessions to accumulate rather than evaporate. It is not for a one-off explanation; if you just need something clarified in the moment, ask directly. Reach for `qs-learn-teach` when the learning is a project.

## Prerequisites

`qs-learn-teach` builds a whole directory in place, so run it somewhere you're happy to keep as a dedicated workspace. Over time it writes:

- `MISSION.md` — the reason you're learning this, which grounds everything else. If it's empty, `qs-learn-teach`'s first job is to question you until it isn't.
- `RESOURCES.md` — the vetted, high-trust sources it teaches from.
- `./lessons/*.html` — the numbered, self-contained lessons (the primary unit of teaching).
- `./reference/*.html` — compressed cheat-sheets, algorithms, glossaries you'll return to.
- `./learning-records/*.md` — what you've learned, ADR-style, used to judge what to teach next.
- `./assets/*` — reusable components (a shared stylesheet first) so the lessons look like one course.
- `NOTES.md` — your teaching preferences.

## Mission, and the zone of proximal development

Every lesson hangs off the **mission**. Without it, knowledge has nothing to attach to and lessons feel abstract — so the mission is the first thing `qs-learn-teach` pins down and keeps updating as you grow. From the mission and your learning records it computes your **zone of proximal development**: the next lesson should challenge you *just enough*, no more.

## Storage strength, not fluency

The word to think with is **storage strength** — long-term retention — as opposed to **fluency**, the in-the-moment recall that feels like mastery but isn't. `qs-learn-teach` deliberately builds the former through desirable difficulty: retrieval practice, spacing, and interleaving. Knowledge is taught first (where difficulty is the enemy), then skills are drilled through a tight feedback loop (where difficulty is the tool).

## Output and next steps

`/qs-learn-teach` automatically starts or reuses a private, health-checked readout viewer; generates an architecture-quality, self-contained HTML readout; and closes with the same concise report used across the collection: status, skills actually used, outcome, actual execution machine, the verified viewer link and real readout path, real outputs or checks where applicable, and up to three copy-ready top next prompts. Present each complete prompt prominently in its own fenced text code block and place its suggested model and suggested thinking underneath in a visually muted callout. Each prompt embeds its catalog-approved follow-on skill and builds on the actual outcome, findings, decisions, outputs, and checks rather than merely recommending a skill name. Model and thinking guidance are explicitly heuristic; they are not measured model performance and never change the active configuration. Each skill uses its own compact, purpose-specific visual report profile; charts, concept maps, review matrices, and check summaries represent only actual recorded results. Relevant runs can include verified deployment environments and URLs, repository-relative files actually changed, independently verified GitHub pull requests, actually closed issues, released versions, complete Git commit hashes, and explicitly observed visual relationships. Local commits are never labeled as published, and issue closure is never attributed to an unverified release. On a Mac the viewer uses localhost; on a headless or SSH-connected Linux dev box it uses a protected private home-network URL. Tailscale is not required. Its readout uses the shared `scripts/qs-skill-readout.mjs` generator and defaults to the OS temporary `quickstark-readouts` directory. Set `QS_READOUT_DIR=/docker/appdata/quickstark-readouts` to opt into durable, project-organized storage and browse verified projects, searchable reports, and actual recent activity. Catalog previews remain explicitly identified, and no report claims that a suggested skill has already run.

Depending on the actual completed work, tailor one to three top next prompts from:

**1. [`/qs-plan-research`](https://github.com/quickstark/skills/blob/main/skills/engineering/qs-plan-research/SKILL.md)**

Find authoritative sources for the next learning objective.

```text
Use /qs-plan-research to research this question and capture evidence-backed findings.
```

> Suggested model: `gpt-5.6-sol` · Suggested thinking: `high`
>
> Heuristic: Research benefits from comparing evidence, uncertainty, and primary sources.

**2. [`/qs-design-prototype`](https://github.com/quickstark/skills/blob/main/skills/engineering/qs-design-prototype/SKILL.md)**

Practice the new concept through a focused working example.

```text
Use /qs-design-prototype to build a focused prototype to answer this design question.
```

> Suggested model: `gpt-5.6-terra` · Suggested thinking: `high`
>
> Heuristic: A focused prototype benefits from practical implementation and design iteration.

**3. [`/qs-skill-write`](https://github.com/quickstark/skills/blob/main/skills/productivity/qs-skill-write/SKILL.md)**

Capture a repeatable learned workflow as an agent skill.

```text
Use /qs-skill-write to create or improve an effective, reliable agent skill.
```

> Suggested model: `gpt-5.6-sol` · Suggested thinking: `high`
>
> Heuristic: Skill authoring benefits from predictable instructions and invocation boundaries.

## Where it fits

`qs-learn-teach` is a reach-for-it-anytime standalone — a long-running learning project you drive session by session, not a step in a build chain. It shares no workflow with the other productivity skills; it simply owns its workspace directory and lives there. When you're unsure which skill or flow fits, [qs-help](https://aihero.dev/skills-ask-matt) routes you.
