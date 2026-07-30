Quickstart:

```bash
codex plugin marketplace add ./codex
codex plugin add qs-skills@quickstark
```

[Source](https://github.com/mattpocock/skills/tree/main/skills/engineering/improve-codebase-architecture)

## What it does

`qs-design-architecture` scans a codebase for **deepening opportunities** — places where a shallow module (an interface nearly as complex as the thing it hides) could become a deep one — presents them as a self-contained visual HTML report, then grills through whichever one you pick.

It does **not** hand you a flat list of refactors. Every candidate has to pass the **deletion test** — would removing this module *concentrate* complexity behind a smaller interface, or just move it around? Only the "concentrates" cases earn a card. That filter is what stops the report from becoming generic cleanup advice.

Unless you point it at a specific area, it also scopes itself to where development is actually landing — reading the recent commits to bias toward the code you're still changing. Deepening a module pays off by making future changes to it easier, so it puts extra weight on the parts of the repo that have recently changed.

## When to reach for it

You invoke this by typing `/qs-design-architecture` — the agent won't reach for it on its own.

Reach for it as a periodic health check: every few days, or whenever a codebase has started to feel like it takes too much bouncing between small modules to understand one concept. It reads the existing architecture and proposes where to deepen it. If you already know the module you want to redesign and just need the vocabulary to think it through, use [qs-design-modules](https://aihero.dev/skills-codebase-design) instead — this skill is the survey that finds the candidates; that one is the design bench.

## Deepening opportunities

The whole skill turns on one idea: **depth**. A deep module hides a lot of functionality behind a small, stable interface; a shallow one leaks its implementation through an interface almost as wide as the code beneath it. The report hunts for shallowness — pure functions extracted only for testability while the real bugs hide in how they're called (no **locality**), modules that leak across their **seams**, concepts you can't understand without opening five files — and proposes the deepening that would fix it.

It speaks in the shared design vocabulary (**module**, **interface**, **depth**, **seam**, **adapter**, **leverage**, **locality**) and in your project's own domain language from `CONTEXT.md`, so a candidate reads as "deepen the Order intake module," never "refactor the FooBarHandler."

## The report, then the grill

The output is a browser-ready HTML file written to your OS temp directory — nothing lands in the repo. Each candidate is a card with the files involved, the friction, a plain-English solution, the benefit in terms of locality and leverage, a before/after diagram, and a `Strong` / `Worth exploring` / `Speculative` badge. It closes with the one it would tackle first.

Then it stops and asks which one you want to explore. Pick one and it runs the [qs-plan-interview](https://aihero.dev/skills-grilling) loop over that design — constraints, what sits behind the seam, which tests survive — updating the domain model inline as decisions crystallise.

## Output and next steps

`/qs-design-architecture` automatically starts or reuses a private, health-checked readout viewer; generates an architecture-quality, self-contained HTML readout; and closes with the same concise report used across the collection: status, skills actually used, outcome, actual execution machine, the verified viewer link and real readout path, real outputs or checks where applicable, and up to three copy-ready top next prompts. Present each complete prompt prominently in its own fenced text code block and place its suggested model and suggested thinking underneath in a visually muted callout. Each prompt embeds its catalog-approved follow-on skill and builds on the actual outcome, findings, decisions, outputs, and checks rather than merely recommending a skill name. Automatically generated prompts use the Codex-native `$qs-...` skill spelling; legacy explicit `/qs-...` prompts remain valid. Only the Codex composer and its skill picker can resolve a native skill mention into a blue token; a report cannot manufacture that UI state. Model and thinking guidance are explicitly heuristic; they are not measured model performance and never change the active configuration. Each skill uses its own compact, purpose-specific visual report profile; charts, concept maps, review matrices, and check summaries represent only actual recorded results. Relevant runs can include verified deployment environments and URLs, repository-relative files actually changed, independently verified GitHub pull requests, actually closed issues, released versions, complete Git commit hashes, and explicitly observed visual relationships. Local commits are never labeled as published, and issue closure is never attributed to an unverified release. On a Mac the viewer uses localhost; on a headless or SSH-connected Linux dev box it uses a protected private home-network URL. Tailscale is not required. Its readout uses the shared `scripts/qs-skill-readout.mjs` generator and defaults to the OS temporary `quickstark-readouts` directory. Set `QS_READOUT_DIR=/docker/appdata/quickstark-readouts` to opt into durable, project-organized storage and open one full-height, project-first Project Workbench with verified project navigation, searchable actual skill runs, and complete immutable readouts. Catalog previews remain explicitly identified, and no report claims that a suggested skill has already run.

To automatically publish actual skill reports from Linux, macOS, or Windows, `QS_READOUT_PRODUCER_TOKEN` remains the only required setting when no owner-only profile credential is installed. Linux and Windows preserve valid explicit-token precedence. On macOS the renderer first selects the current `.codex` or `.codex-demo` profile's private file or named Keychain token so a shared desktop environment cannot replace that profile's producer; the valid explicit token remains supported when neither profile credential exists. A safely installed machine token and the legacy macOS Keychain entry remain supported. Reject user-home escapes and symbolic links in every profile or credential ancestor. The reporting API derives the producer identity, while the skill automatically identifies the Codex harness and the project from its current working directory. Use the Git origin when available; otherwise derive a safe, stable local-workspace identity without revealing the absolute filesystem path. The default reports endpoint is `https://reports.quickstark.com/api/v1/readouts`; ordinary runs require no project list, owner pattern, producer identifier, harness setting, GitHub verification, Git remote, or private-IP viewer. Generate the immutable local report first and present the hosted `https://reports.quickstark.com/` report URL only after authenticated acceptance. Explicit local, LAN, or SSH viewers remain available. Never expose the private token, mislabel another project, accept unsafe project paths, or claim that a failed submission succeeded.
A completed report displays a compact Skill run metrics section near the top, immediately after Top next prompts. It shows actual skill-attributed model, reasoning effort, provider-reported input and output tokens, total tokens, and active duration only when the running harness or provider genuinely captured them. Show `Not captured` for unavailable values, preserve thread-level evidence under its actual scope, and never invent measurements or attach skill-run metrics to a catalog preview.

When this skill leaves a genuine user action, its readout may include `commands` containing the exact terminal command, a clear title, and a `detail` explaining why or when the user should run it. When actual source deserves attention, its readout may include `keyCode` containing the exact code, language, and optional safe repository-relative file path. Both appear as separate, copyable code blocks. Execution logs and already executed commands are not user instructions; omit both sections when they are not applicable. Never include secrets, credentials, tokens, private keys, invented code, or speculative terminal instructions.

Depending on the actual completed work, tailor one to three top next prompts from:

**1. [`/qs-design-modules`](https://github.com/quickstark/skills/blob/main/skills/engineering/qs-design-modules/SKILL.md)**

Design the interface and seam for the selected architecture candidate.

```text
Use $qs-design-modules to design a clean, deep, and testable module for this problem.
```

> Suggested model: `gpt-5.6-sol` · Suggested thinking: `high`
>
> Heuristic: Module design benefits from carefully reasoning about interfaces and seams.

**2. [`/qs-plan-clarify`](https://github.com/quickstark/skills/blob/main/skills/engineering/qs-plan-clarify/SKILL.md)**

Confirm the refactor's scope, constraints, and expected outcome.

```text
Use $qs-plan-clarify to clarify this project and document the resulting decisions.
```

> Suggested model: `gpt-5.6-sol` · Suggested thinking: `high`
>
> Heuristic: Clarification benefits from deeper reasoning about requirements and trade-offs.

**3. [`/qs-plan-spec`](https://github.com/quickstark/skills/blob/main/skills/engineering/qs-plan-spec/SKILL.md)**

Document a selected, nontrivial refactoring before implementation.

```text
Use $qs-plan-spec to turn the agreed requirements into an actionable specification.
```

> Suggested model: `gpt-5.6-sol` · Suggested thinking: `high`
>
> Heuristic: A specification benefits from reconciling boundaries, decisions, and requirements.

## Where it fits

`qs-design-architecture` is **periodic maintenance** — run it every few days, not as a step in a chain. Its neighbours are [qs-design-modules](https://aihero.dev/skills-codebase-design), which owns the depth-and-seam vocabulary every candidate is written in, [qs-plan-interview](https://aihero.dev/skills-grilling), which walks the decision tree once you've chosen a candidate, and [qs-design-domain](https://aihero.dev/skills-domain-modeling), which keeps `CONTEXT.md` and the ADRs current as the redesign settles. When you're unsure which skill or flow fits, [qs-help](https://aihero.dev/skills-ask-matt) routes you.
