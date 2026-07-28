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

`/qs-learn-teach` automatically starts or reuses a private, health-checked readout viewer; generates an architecture-quality, self-contained HTML readout; and closes with the same concise report used across the collection: status, skills actually used, outcome, actual execution machine, the verified viewer link and real readout path, real outputs or checks where applicable, and up to three copy-ready top next prompts. Present each complete prompt prominently in its own fenced text code block and place its suggested model and suggested thinking underneath in a visually muted callout. Each prompt embeds its catalog-approved follow-on skill and builds on the actual outcome, findings, decisions, outputs, and checks rather than merely recommending a skill name. Automatically generated prompts use the Codex-native `$qs-...` skill spelling; legacy explicit `/qs-...` prompts remain valid. Only the Codex composer and its skill picker can resolve a native skill mention into a blue token; a report cannot manufacture that UI state. Model and thinking guidance are explicitly heuristic; they are not measured model performance and never change the active configuration. Each skill uses its own compact, purpose-specific visual report profile; charts, concept maps, review matrices, and check summaries represent only actual recorded results. Relevant runs can include verified deployment environments and URLs, repository-relative files actually changed, independently verified GitHub pull requests, actually closed issues, released versions, complete Git commit hashes, and explicitly observed visual relationships. Local commits are never labeled as published, and issue closure is never attributed to an unverified release. On a Mac the viewer uses localhost; on a headless or SSH-connected Linux dev box it uses a protected private home-network URL. Tailscale is not required. Its readout uses the shared `scripts/qs-skill-readout.mjs` generator and defaults to the OS temporary `quickstark-readouts` directory. Set `QS_READOUT_DIR=/docker/appdata/quickstark-readouts` to opt into durable, project-organized storage and open one full-height, project-first Project Workbench with verified project navigation, searchable actual skill runs, and complete immutable readouts. Catalog previews remain explicitly identified, and no report claims that a suggested skill has already run.

To automatically publish actual skill reports from Linux, macOS, or Windows, `QS_READOUT_PRODUCER_TOKEN` is the only required setting. Configure that authorized token privately; the reporting API derives the producer identity, while the skill automatically identifies the Codex harness and the project from its current working directory. Use the Git origin when available; otherwise derive a safe, stable local-workspace identity without revealing the absolute filesystem path. The default reports endpoint is `https://reports.quickstark.com/api/v1/readouts`; ordinary runs require no project list, owner pattern, producer identifier, harness setting, GitHub verification, Git remote, or locally running viewer. Generate the immutable local report first and present a hosted report URL only after authenticated acceptance. Never expose the private token, mislabel another project, accept unsafe project paths, or claim that a failed submission succeeded.
A completed report displays a compact Skill run metrics section near the top, immediately after Top next prompts. It shows actual skill-attributed model, reasoning effort, provider-reported input and output tokens, total tokens, and active duration only when the running harness or provider genuinely captured them. Show `Not captured` for unavailable values, preserve thread-level evidence under its actual scope, and never invent measurements or attach skill-run metrics to a catalog preview.

When this skill leaves a genuine user action, its readout may include `commands` containing the exact terminal command, a clear title, and a `detail` explaining why or when the user should run it. When actual source deserves attention, its readout may include `keyCode` containing the exact code, language, and optional safe repository-relative file path. Both appear as separate, copyable code blocks. Execution logs and already executed commands are not user instructions; omit both sections when they are not applicable. Never include secrets, credentials, tokens, private keys, invented code, or speculative terminal instructions.

Depending on the actual completed work, tailor one to three top next prompts from:

**1. [`/qs-plan-research`](https://github.com/quickstark/skills/blob/main/skills/engineering/qs-plan-research/SKILL.md)**

Find authoritative sources for the next learning objective.

```text
Use $qs-plan-research to research this question and capture evidence-backed findings.
```

> Suggested model: `gpt-5.6-sol` · Suggested thinking: `high`
>
> Heuristic: Research benefits from comparing evidence, uncertainty, and primary sources.

**2. [`/qs-design-prototype`](https://github.com/quickstark/skills/blob/main/skills/engineering/qs-design-prototype/SKILL.md)**

Practice the new concept through a focused working example.

```text
Use $qs-design-prototype to build a focused prototype to answer this design question.
```

> Suggested model: `gpt-5.6-terra` · Suggested thinking: `high`
>
> Heuristic: A focused prototype benefits from practical implementation and design iteration.

**3. [`/qs-skill-write`](https://github.com/quickstark/skills/blob/main/skills/productivity/qs-skill-write/SKILL.md)**

Capture a repeatable learned workflow as an agent skill.

```text
Use $qs-skill-write to create or improve an effective, reliable agent skill.
```

> Suggested model: `gpt-5.6-sol` · Suggested thinking: `high`
>
> Heuristic: Skill authoring benefits from predictable instructions and invocation boundaries.

## Where it fits

`qs-learn-teach` is a reach-for-it-anytime standalone — a long-running learning project you drive session by session, not a step in a build chain. It shares no workflow with the other productivity skills; it simply owns its workspace directory and lives there. When you're unsure which skill or flow fits, [qs-help](https://aihero.dev/skills-ask-matt) routes you.
