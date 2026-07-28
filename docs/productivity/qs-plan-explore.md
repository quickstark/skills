Quickstart:

```bash
codex plugin marketplace add ./codex
codex plugin add qs-skills@quickstark
```

[Source](https://github.com/mattpocock/skills/tree/main/skills/productivity/grill-me)

## What it does

`qs-plan-explore` runs a relentless interview about a plan or design, walking every branch of the decision tree until you and the agent reach a **shared understanding**.

It asks **one question at a time** and waits. It never dumps a batch of questions at you — that is bewildering — and where a question can be answered by reading the codebase, it goes and reads rather than asking. Each question comes with the agent's own recommended answer, so you are reacting to a proposal, not staring at a blank prompt.

## When to reach for it

You invoke this by typing `/qs-plan-explore` — the agent won't reach for it on its own.

Reach for it before you build, when a plan feels roughly right but you can sense unresolved decisions hiding in it — the moment you want the soft spots found and forced into the open. If you want that same interrogation to also leave a paper trail of ADRs and a glossary behind, use [qs-plan-clarify](https://aihero.dev/skills-grill-with-docs) instead. And if the effort is too big to hold in one session and the route to the goal is still foggy — a greenfield project, a huge feature build — start further upstream with [qs-plan-roadmap](https://aihero.dev/skills-wayfinder), which charts it as a map of decisions first and then merges back into this flow.

## The decision tree

The session walks the plan as a tree of decisions, resolving dependencies between them one by one — a parent decision settled before the choices that hang off it. The point is not to reach agreement quickly; it is to make every implicit call explicit, so nothing important is left silently assumed. You come out the other side with a plan whose branches have all been visited.

`qs-plan-explore` is **stateless**: it writes nothing and leaves no workspace behind. It runs anywhere, and the only artifact is the sharpened understanding in the conversation itself. That is the deliberate contrast with [qs-plan-clarify](https://aihero.dev/skills-grill-with-docs), which captures the same interview as durable ADRs and a glossary.

## Output and next steps

`/qs-plan-explore` automatically starts or reuses a private, health-checked readout viewer; generates an architecture-quality, self-contained HTML readout; and closes with the same concise report used across the collection: status, skills actually used, outcome, actual execution machine, the verified viewer link and real readout path, real outputs or checks where applicable, and up to three copy-ready top next prompts. Present each complete prompt prominently in its own fenced text code block and place its suggested model and suggested thinking underneath in a visually muted callout. Each prompt embeds its catalog-approved follow-on skill and builds on the actual outcome, findings, decisions, outputs, and checks rather than merely recommending a skill name. Automatically generated prompts use the Codex-native `$qs-...` skill spelling; legacy explicit `/qs-...` prompts remain valid. Only the Codex composer and its skill picker can resolve a native skill mention into a blue token; a report cannot manufacture that UI state. Model and thinking guidance are explicitly heuristic; they are not measured model performance and never change the active configuration. Each skill uses its own compact, purpose-specific visual report profile; charts, concept maps, review matrices, and check summaries represent only actual recorded results. Relevant runs can include verified deployment environments and URLs, repository-relative files actually changed, independently verified GitHub pull requests, actually closed issues, released versions, complete Git commit hashes, and explicitly observed visual relationships. Local commits are never labeled as published, and issue closure is never attributed to an unverified release. On a Mac the viewer uses localhost; on a headless or SSH-connected Linux dev box it uses a protected private home-network URL. Tailscale is not required. Its readout uses the shared `scripts/qs-skill-readout.mjs` generator and defaults to the OS temporary `quickstark-readouts` directory. Set `QS_READOUT_DIR=/docker/appdata/quickstark-readouts` to opt into durable, project-organized storage and open one full-height, project-first Project Workbench with verified project navigation, searchable actual skill runs, and complete immutable readouts. Catalog previews remain explicitly identified, and no report claims that a suggested skill has already run.

To automatically publish actual skill reports from Linux, macOS, or Windows, `QS_READOUT_PRODUCER_TOKEN` is the only required setting. Configure that authorized token privately; the reporting API derives the producer identity, while the skill automatically identifies the Codex harness and the project from its current working directory. Use the Git origin when available; otherwise derive a safe, stable local-workspace identity without revealing the absolute filesystem path. The default reports endpoint is `https://reports.quickstark.com/api/v1/readouts`; ordinary runs require no project list, owner pattern, producer identifier, harness setting, GitHub verification, Git remote, or locally running viewer. Generate the immutable local report first and present a hosted report URL only after authenticated acceptance. Never expose the private token, mislabel another project, accept unsafe project paths, or claim that a failed submission succeeded.
A completed report displays a compact Skill run metrics section near the top, immediately after Top next prompts. It shows actual skill-attributed model, reasoning effort, provider-reported input and output tokens, total tokens, and active duration only when the running harness or provider genuinely captured them. Show `Not captured` for unavailable values, preserve thread-level evidence under its actual scope, and never invent measurements or attach skill-run metrics to a catalog preview.

When this skill leaves a genuine user action, its readout may include `commands` containing the exact terminal command, a clear title, and a `detail` explaining why or when the user should run it. When actual source deserves attention, its readout may include `keyCode` containing the exact code, language, and optional safe repository-relative file path. Both appear as separate, copyable code blocks. Execution logs and already executed commands are not user instructions; omit both sections when they are not applicable. Never include secrets, credentials, tokens, private keys, invented code, or speculative terminal instructions.

Depending on the actual completed work, tailor one to three top next prompts from:

**1. [`/qs-plan-clarify`](https://github.com/quickstark/skills/blob/main/skills/engineering/qs-plan-clarify/SKILL.md)**

Ground the explored idea in an actual codebase and durable decisions.

```text
Use $qs-plan-clarify to clarify this project and document the resulting decisions.
```

> Suggested model: `gpt-5.6-sol` · Suggested thinking: `high`
>
> Heuristic: Clarification benefits from deeper reasoning about requirements and trade-offs.

**2. [`/qs-plan-research`](https://github.com/quickstark/skills/blob/main/skills/engineering/qs-plan-research/SKILL.md)**

Investigate assumptions or unknowns exposed during exploration.

```text
Use $qs-plan-research to research this question and capture evidence-backed findings.
```

> Suggested model: `gpt-5.6-sol` · Suggested thinking: `high`
>
> Heuristic: Research benefits from comparing evidence, uncertainty, and primary sources.

**3. [`/qs-plan-spec`](https://github.com/quickstark/skills/blob/main/skills/engineering/qs-plan-spec/SKILL.md)**

Capture a sufficiently settled idea as a specification.

```text
Use $qs-plan-spec to turn the agreed requirements into an actionable specification.
```

> Suggested model: `gpt-5.6-sol` · Suggested thinking: `high`
>
> Heuristic: A specification benefits from reconciling boundaries, decisions, and requirements.

## Where it fits

`qs-plan-explore` is a reach-for-it-anytime standalone — the pre-build stress test you run whenever a plan needs hardening. It is the stateless, user-invoked front door to the [qs-plan-interview](https://aihero.dev/skills-grilling) primitive; its closest neighbour is [qs-plan-clarify](https://aihero.dev/skills-grill-with-docs), the stateful sibling that runs the same interview but additionally records the decisions as ADRs and a glossary. If the outcome is a spec you want written down, hand off to [qs-plan-spec](https://aihero.dev/skills-to-spec), which synthesises the settled understanding into a spec without re-interviewing you. When you're unsure which flow fits, [qs-help](https://aihero.dev/skills-ask-matt) routes you.
