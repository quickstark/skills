Quickstart:

```bash
codex plugin marketplace add ./codex
codex plugin add qs-skills@quickstark
```

[Source](https://github.com/mattpocock/skills/tree/main/skills/engineering/to-spec)

## What it does

`qs-plan-spec` turns the current conversation and your codebase understanding into a spec (you may know this document as a PRD), then publishes it to your issue tracker.

It does **not** interview you again. By the time you reach for it, the alignment work is done — `qs-plan-spec` synthesises what is already known rather than asking a fresh round of questions.

## When to reach for it

You invoke this by typing `/qs-plan-spec` — the agent won't reach for it on its own.

Reach for it once a change has been talked through and the domain language is settled, and you want that shared understanding written down before any code is written. If you *haven't* aligned yet, grill first — for that, use [qs-plan-clarify](https://aihero.dev/skills-grill-with-docs). To split the finished spec into tickets, use [qs-plan-tickets](https://aihero.dev/skills-to-tickets).

## Prerequisites

`qs-plan-spec` publishes into your issue tracker, so [qs-setup](https://aihero.dev/skills-setup-matt-pocock-skills) must have configured the tracker and triage labels for this repo first. It applies the `ready-for-agent` label itself — no separate triage pass needed.

## What the spec includes

- **Problem statement** — what is broken or missing, and why it's worth solving, in the project's own vocabulary.
- **Solution** — the shape of the fix at a high level, before any implementation detail.
- **User stories** — an extensive, numbered list of the concrete behaviours the change must support, each one independently checkable.
- **Implementation decisions** — the choices already settled during the conversation, so they aren't relitigated later.
- **Testing decisions** — the seams the feature will be tested at, and what "done" looks like.
- **Out-of-scope items** — what this change deliberately does *not* cover, to keep the ticket bounded.
- **Further notes** — anything else worth carrying forward that doesn't fit the sections above.

## Deep modules

Before writing the spec, `qs-plan-spec` sketches the **seams** at which the feature will be tested and looks for **deep module** opportunities — a lot of functionality hidden behind a small, stable interface. It prefers existing seams to new ones and the highest seam possible, ideally just one across the whole change.

That matters for agentic development: a good interface gives tests something durable to target, so the code underneath can change without the tests moving.

## It's working if

- It starts writing the spec instead of asking you a fresh round of questions.
- It checks the seams with you before writing, and proposes as few as possible.
- The spec comes back in your project's domain vocabulary, not generic boilerplate.

## Output and next steps

`/qs-plan-spec` automatically starts or reuses a private, health-checked readout viewer; generates an architecture-quality, self-contained HTML readout; and closes with the same concise report used across the collection: status, skills actually used, outcome, actual execution machine, the verified viewer link and real readout path, real outputs or checks where applicable, and up to three copy-ready top next prompts. Present each complete prompt prominently in its own fenced text code block and place its suggested model and suggested thinking underneath in a visually muted callout. Each prompt embeds its catalog-approved follow-on skill and builds on the actual outcome, findings, decisions, outputs, and checks rather than merely recommending a skill name. Automatically generated prompts use the Codex-native `$qs-...` skill spelling; legacy explicit `/qs-...` prompts remain valid. Only the Codex composer and its skill picker can resolve a native skill mention into a blue token; a report cannot manufacture that UI state. Model and thinking guidance are explicitly heuristic; they are not measured model performance and never change the active configuration. Each skill uses its own compact, purpose-specific visual report profile; charts, concept maps, review matrices, and check summaries represent only actual recorded results. Relevant runs can include verified deployment environments and URLs, repository-relative files actually changed, independently verified GitHub pull requests, actually closed issues, released versions, complete Git commit hashes, and explicitly observed visual relationships. Local commits are never labeled as published, and issue closure is never attributed to an unverified release. On a Mac the viewer uses localhost; on a headless or SSH-connected Linux dev box it uses a protected private home-network URL. Tailscale is not required. Its readout uses the shared `scripts/qs-skill-readout.mjs` generator and defaults to the OS temporary `quickstark-readouts` directory. Set `QS_READOUT_DIR=/docker/appdata/quickstark-readouts` to opt into durable, project-organized storage and open one full-height, project-first Project Workbench with verified project navigation, searchable actual skill runs, and complete immutable readouts. Catalog previews remain explicitly identified, and no report claims that a suggested skill has already run.

To automatically publish actual skill reports from Linux, macOS, or Windows, `QS_READOUT_PRODUCER_TOKEN` remains the only required setting when no owner-only profile credential is installed. Linux and Windows preserve valid explicit-token precedence. On macOS the renderer first selects the current `.codex` or `.codex-demo` profile's private file or named Keychain token so a shared desktop environment cannot replace that profile's producer; the valid explicit token remains supported when neither profile credential exists. A safely installed machine token and the legacy macOS Keychain entry remain supported. Reject user-home escapes and symbolic links in every profile or credential ancestor. The reporting API derives the producer identity, while the skill automatically identifies the Codex harness and the project from its current working directory. Use the Git origin when available; otherwise derive a safe, stable local-workspace identity without revealing the absolute filesystem path. The default reports endpoint is `https://reports.quickstark.com/api/v1/readouts`; ordinary runs require no project list, owner pattern, producer identifier, harness setting, GitHub verification, Git remote, or private-IP viewer. Generate the immutable local report first and present the hosted `https://reports.quickstark.com/` report URL only after authenticated acceptance. Explicit local, LAN, or SSH viewers remain available. Never expose the private token, mislabel another project, accept unsafe project paths, or claim that a failed submission succeeded.
A completed report displays a compact Skill run metrics section near the top, immediately after Top next prompts. It shows actual skill-attributed model, reasoning effort, provider-reported input and output tokens, total tokens, and active duration only when the running harness or provider genuinely captured them. Show `Not captured` for unavailable values, preserve thread-level evidence under its actual scope, and never invent measurements or attach skill-run metrics to a catalog preview.

When this skill leaves a genuine user action, its readout may include `commands` containing the exact terminal command, a clear title, and a `detail` explaining why or when the user should run it. When actual source deserves attention, its readout may include `keyCode` containing the exact code, language, and optional safe repository-relative file path. Both appear as separate, copyable code blocks. Execution logs and already executed commands are not user instructions; omit both sections when they are not applicable. Never include secrets, credentials, tokens, private keys, invented code, or speculative terminal instructions.

Depending on the actual completed work, tailor one to three top next prompts from:

**1. [`/qs-plan-tickets`](https://github.com/quickstark/skills/blob/main/skills/engineering/qs-plan-tickets/SKILL.md)**

Break a substantial specification into dependency-aware work.

```text
Use $qs-plan-tickets to break this plan into small, dependency-aware implementation tickets.
```

> Suggested model: `gpt-5.6-sol` · Suggested thinking: `high`
>
> Heuristic: Ticket decomposition benefits from reasoning about scope and dependencies.

**2. [`/qs-code-build`](https://github.com/quickstark/skills/blob/main/skills/engineering/qs-code-build/SKILL.md)**

Implement a small, sufficiently clear specification directly.

```text
Use $qs-code-build to implement this specification or ticket with appropriate tests.
```

> Suggested model: `gpt-5.6-terra` · Suggested thinking: `high`
>
> Heuristic: Implementation benefits from sustained reasoning and direct verification.

**3. [`/qs-design-modules`](https://github.com/quickstark/skills/blob/main/skills/engineering/qs-design-modules/SKILL.md)**

Resolve an important interface or module boundary before implementation.

```text
Use $qs-design-modules to design a clean, deep, and testable module for this problem.
```

> Suggested model: `gpt-5.6-sol` · Suggested thinking: `high`
>
> Heuristic: Module design benefits from carefully reasoning about interfaces and seams.

## Where it fits

`qs-plan-spec` is a step in the main build chain:

```txt
grill-with-docs → to-spec → to-tickets → implement → code-review
```

Reach for it after the plan and domain language are resolved, and before you break the work into implementation tickets. Its key neighbours are [qs-plan-clarify](https://aihero.dev/skills-grill-with-docs), which sharpens the context so the spec is precise, and [qs-plan-tickets](https://aihero.dev/skills-to-tickets), which turns the spec into a set of tickets for [qs-code-build](https://aihero.dev/skills-implement) to build. When you're unsure which skill or flow fits, [qs-help](https://aihero.dev/skills-ask-matt) routes you.
