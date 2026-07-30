Quickstart:

```bash
codex plugin marketplace add ./codex
codex plugin add qs-skills@quickstark
```

[Source](https://github.com/mattpocock/skills/tree/main/skills/engineering/domain-modeling)

## What it does

`qs-design-domain` builds and sharpens a project's **ubiquitous language** as you design — challenging fuzzy terms, stress-testing relationships with concrete scenarios, and writing the glossary and decisions down the moment they crystallise.

This is the **active** discipline, not the passive one. Merely reading `CONTEXT.md` to borrow its vocabulary is a one-line habit any skill can do; this skill is for when you are *changing* the model — coining a canonical term, catching a contradiction between the code and what you just said, recording a hard-to-reverse decision. And it keeps the glossary clean: `CONTEXT.md` is a glossary and nothing else — no implementation details, no spec, no scratch pad.

## When to reach for it

Type `/qs-design-domain`, or the agent reaches for it automatically when a task fits — when you are pinning down terminology, resolving an overloaded word, or recording an architectural decision.

Reach for it when the *words* are the problem: two people mean different things by "cancellation", "account" is doing three jobs, or a design conversation keeps snagging on a concept that has never been named precisely. If instead the module's *shape* is the problem — where the seam goes, how deep the interface is — use [qs-design-modules](https://aihero.dev/skills-codebase-design). If you want the plan itself interrogated before you build, use [qs-plan-interview](https://aihero.dev/skills-grilling).

## Prerequisites

The skill writes into two places, both created lazily — only once there is something to record. Resolved terms go into `CONTEXT.md` at the root (or, in a multi-context repo flagged by a `CONTEXT-MAP.md`, into the per-context `CONTEXT.md`). Decisions go into `docs/adr/`. Nothing needs to exist up front; the first resolved term creates the glossary, the first real trade-off creates the ADR.

## Glossary vs. ADR

Two artifacts, two different bars:

- **The glossary** (`CONTEXT.md`) captures language. Every time a vague term is made canonical, it's written down inline — not batched — so the shared vocabulary stays current with the conversation. It stays ruthlessly free of implementation detail.
- **An ADR** captures a decision, and the bar is high: offered only when the choice is **hard to reverse**, **surprising without context**, and **the result of a real trade-off**. Miss any one of the three and there is no ADR. This is what keeps `docs/adr/` a record of consequential forks rather than a diary.

The move that makes it click: when you state how something works, the skill cross-references the code and surfaces the contradiction — "your code cancels entire Orders, but you just said partial cancellation is possible — which is right?" The language and the code are forced to agree.

## Pulled out on purpose

`qs-design-domain` is the **single source of truth** for building the project's ubiquitous language, split out as its own model-invoked skill so any other skill can reach it. [qs-plan-clarify](https://aihero.dev/skills-grill-with-docs) leans on it to record terms and decisions as a grilling session runs, [qs-flow-triage](https://aihero.dev/skills-triage) uses it to keep tickets in the project's own words, and [qs-design-architecture](https://aihero.dev/skills-improve-codebase-architecture) reaches for it while it works.

Keeping it standalone means you can also reach for it directly — as a **reference** for how to sharpen a model — without committing to the steps any of those skills mandate. The language lives in one place, and everything that needs it points there.

## Output and next steps

`/qs-design-domain` automatically starts or reuses a private, health-checked readout viewer; generates an architecture-quality, self-contained HTML readout; and closes with the same concise report used across the collection: status, skills actually used, outcome, actual execution machine, the verified viewer link and real readout path, real outputs or checks where applicable, and up to three copy-ready top next prompts. Present each complete prompt prominently in its own fenced text code block and place its suggested model and suggested thinking underneath in a visually muted callout. Each prompt embeds its catalog-approved follow-on skill and builds on the actual outcome, findings, decisions, outputs, and checks rather than merely recommending a skill name. Automatically generated prompts use the Codex-native `$qs-...` skill spelling; legacy explicit `/qs-...` prompts remain valid. Only the Codex composer and its skill picker can resolve a native skill mention into a blue token; a report cannot manufacture that UI state. Model and thinking guidance are explicitly heuristic; they are not measured model performance and never change the active configuration. Each skill uses its own compact, purpose-specific visual report profile; charts, concept maps, review matrices, and check summaries represent only actual recorded results. Relevant runs can include verified deployment environments and URLs, repository-relative files actually changed, independently verified GitHub pull requests, actually closed issues, released versions, complete Git commit hashes, and explicitly observed visual relationships. Local commits are never labeled as published, and issue closure is never attributed to an unverified release. On a Mac the viewer uses localhost; on a headless or SSH-connected Linux dev box it uses a protected private home-network URL. Tailscale is not required. Its readout uses the shared `scripts/qs-skill-readout.mjs` generator and defaults to the OS temporary `quickstark-readouts` directory. Set `QS_READOUT_DIR=/docker/appdata/quickstark-readouts` to opt into durable, project-organized storage and open one full-height, project-first Project Workbench with verified project navigation, searchable actual skill runs, and complete immutable readouts. Catalog previews remain explicitly identified, and no report claims that a suggested skill has already run.

To automatically publish actual skill reports from Linux, macOS, or Windows, `QS_READOUT_PRODUCER_TOKEN` remains the only required setting when no owner-only profile credential is installed. Linux and Windows preserve valid explicit-token precedence. On macOS the renderer first selects the current `.codex` or `.codex-demo` profile's private file or named Keychain token so a shared desktop environment cannot replace that profile's producer; the valid explicit token remains supported when neither profile credential exists. A safely installed machine token and the legacy macOS Keychain entry remain supported. Reject user-home escapes and symbolic links in every profile or credential ancestor. The reporting API derives the producer identity, while the skill automatically identifies the Codex harness and the project from its current working directory. Use the Git origin when available; otherwise derive a safe, stable local-workspace identity without revealing the absolute filesystem path. The default reports endpoint is `https://reports.quickstark.com/api/v1/readouts`; ordinary runs require no project list, owner pattern, producer identifier, harness setting, GitHub verification, Git remote, or private-IP viewer. Generate the immutable local report first and present the hosted `https://reports.quickstark.com/` report URL only after authenticated acceptance. Explicit local, LAN, or SSH viewers remain available. Never expose the private token, mislabel another project, accept unsafe project paths, or claim that a failed submission succeeded.
A completed report displays a compact Skill run metrics section near the top, immediately after Top next prompts. It shows actual skill-attributed model, reasoning effort, provider-reported input and output tokens, total tokens, and active duration only when the running harness or provider genuinely captured them. Show `Not captured` for unavailable values, preserve thread-level evidence under its actual scope, and never invent measurements or attach skill-run metrics to a catalog preview.

When this skill leaves a genuine user action, its readout may include `commands` containing the exact terminal command, a clear title, and a `detail` explaining why or when the user should run it. When actual source deserves attention, its readout may include `keyCode` containing the exact code, language, and optional safe repository-relative file path. Both appear as separate, copyable code blocks. Execution logs and already executed commands are not user instructions; omit both sections when they are not applicable. Never include secrets, credentials, tokens, private keys, invented code, or speculative terminal instructions.

Depending on the actual completed work, tailor one to three top next prompts from:

**1. [`/qs-design-modules`](https://github.com/quickstark/skills/blob/main/skills/engineering/qs-design-modules/SKILL.md)**

Design software boundaries using the clarified domain vocabulary.

```text
Use $qs-design-modules to design a clean, deep, and testable module for this problem.
```

> Suggested model: `gpt-5.6-sol` · Suggested thinking: `high`
>
> Heuristic: Module design benefits from carefully reasoning about interfaces and seams.

**2. [`/qs-plan-clarify`](https://github.com/quickstark/skills/blob/main/skills/engineering/qs-plan-clarify/SKILL.md)**

Use the domain model to settle feature or refactoring requirements.

```text
Use $qs-plan-clarify to clarify this project and document the resulting decisions.
```

> Suggested model: `gpt-5.6-sol` · Suggested thinking: `high`
>
> Heuristic: Clarification benefits from deeper reasoning about requirements and trade-offs.

**3. [`/qs-plan-spec`](https://github.com/quickstark/skills/blob/main/skills/engineering/qs-plan-spec/SKILL.md)**

Write the specification in the project's agreed domain language.

```text
Use $qs-plan-spec to turn the agreed requirements into an actionable specification.
```

> Suggested model: `gpt-5.6-sol` · Suggested thinking: `high`
>
> Heuristic: A specification benefits from reconciling boundaries, decisions, and requirements.

## Where it fits

`qs-design-domain` is a **reach-for-it-anytime standalone** that runs *underneath* other skills as often as at a fixed step. Its closest neighbour is [qs-design-modules](https://aihero.dev/skills-codebase-design), because a shared language is what lets you name a deep module and its seam precisely; downstream, a settled glossary is exactly what [qs-plan-spec](https://aihero.dev/skills-to-spec) synthesises into a spec written in the project's own words. When you're unsure which skill or flow fits, [qs-help](https://aihero.dev/skills-ask-matt) routes you.
