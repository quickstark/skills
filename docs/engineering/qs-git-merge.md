Quickstart:

```bash
codex plugin marketplace add ./codex
codex plugin add qs-skills@quickstark
```

[Source](https://github.com/mattpocock/skills/tree/main/skills/engineering/resolving-merge-conflicts)

## What it does

`qs-git-merge` checks the actual branch, tracked remote, GitHub pull request, merge or rebase, and publication state. It recommends or completes only the integration operation that actually exists and has been explicitly requested or approved.

When reviewed changes are already committed on `main` and `main` is ahead of `origin/main`, no branch merge is required. The correct explicitly approved GitHub action is `git push origin main`. A feature branch may instead require an approved branch push, pull-request creation, required checks, and a pull-request merge. A release is a separate explicitly approved `/qs-deploy-release` operation.

## When to reach for it

Type `/qs-git-merge`, or the agent reaches for it automatically when a task fits.

Reach for this after an implemented, tested, and independently reviewed change still needs Git integration or GitHub publication, or when an actual merge or rebase stops on a conflict. Verify repository ownership, the default branch, the remote tracking state, and any real pull request before selecting a path. Never push to `upstream`; it remains the read-only Matt Pocock reference.

## Resolving by intent

The trap in a conflict is treating it as a text problem — picking "ours" or "theirs" to make the markers go away. This skill treats it as an **intent** problem. Each side of a hunk exists because someone wanted something; the resolution has to honour both wants where it can, and where they're genuinely incompatible, pick the one that matches the merge's stated goal and note the trade-off out loud.

That's why the primary sources matter. You can't preserve an intent you haven't read, so the work starts in the history — commits, PRs, tickets — not in the diff.

## It's working if

- Each resolved hunk keeps both sides' behaviour, or names the trade-off where it couldn't.
- No new behaviour appears that wasn't on either branch.
- The project's own checks — typecheck, tests, format — are found and run green before the commit.
- An actual merge or rebase is carried all the way to a finished commit, never aborted.
- A default-branch push, feature-branch pull request, GitHub merge, and production release are correctly identified as separate operations.
- Publication is claimed only after the exact GitHub repository, remote branch, and commit have been verified.

## Output and next steps

`/qs-git-merge` automatically starts or reuses a private, health-checked readout viewer; generates an architecture-quality, self-contained HTML readout; and closes with the same concise report used across the collection: status, skills actually used, outcome, actual execution machine, the verified viewer link and real readout path, real outputs or checks where applicable, and up to three copy-ready top next prompts. Present each complete prompt prominently in its own fenced text code block and place its suggested model and suggested thinking underneath in a visually muted callout. Each prompt embeds its catalog-approved follow-on skill and builds on the actual outcome, findings, decisions, outputs, and checks rather than merely recommending a skill name. Automatically generated prompts use the Codex-native `$qs-...` skill spelling; legacy explicit `/qs-...` prompts remain valid. Only the Codex composer and its skill picker can resolve a native skill mention into a blue token; a report cannot manufacture that UI state. Model and thinking guidance are explicitly heuristic; they are not measured model performance and never change the active configuration. Each skill uses its own compact, purpose-specific visual report profile; charts, concept maps, review matrices, and check summaries represent only actual recorded results. Relevant runs can include verified deployment environments and URLs, repository-relative files actually changed, independently verified GitHub pull requests, actually closed issues, released versions, complete Git commit hashes, and explicitly observed visual relationships. Local commits are never labeled as published, and issue closure is never attributed to an unverified release. On a Mac the viewer uses localhost; on a headless or SSH-connected Linux dev box it uses a protected private home-network URL. Tailscale is not required. Its readout uses the shared `scripts/qs-skill-readout.mjs` generator and defaults to the OS temporary `quickstark-readouts` directory. Set `QS_READOUT_DIR=/docker/appdata/quickstark-readouts` to opt into durable, project-organized storage and open one full-height, project-first Project Workbench with verified project navigation, searchable actual skill runs, and complete immutable readouts. Catalog previews remain explicitly identified, and no report claims that a suggested skill has already run.

To automatically publish actual skill reports from Linux, macOS, or Windows, `QS_READOUT_PRODUCER_TOKEN` is the only required setting. Configure that authorized token privately; the reporting API derives the producer identity, while the skill automatically identifies the Codex harness and the project from its current working directory. Use the Git origin when available; otherwise derive a safe, stable local-workspace identity without revealing the absolute filesystem path. The default reports endpoint is `https://reports.quickstark.com/api/v1/readouts`; ordinary runs require no project list, owner pattern, producer identifier, harness setting, GitHub verification, Git remote, or locally running viewer. Generate the immutable local report first and present a hosted report URL only after authenticated acceptance. Never expose the private token, mislabel another project, accept unsafe project paths, or claim that a failed submission succeeded.
A completed report displays a compact Skill run metrics section near the top, immediately after Top next prompts. It shows actual skill-attributed model, reasoning effort, provider-reported input and output tokens, total tokens, and active duration only when the running harness or provider genuinely captured them. Show `Not captured` for unavailable values, preserve thread-level evidence under its actual scope, and never invent measurements or attach skill-run metrics to a catalog preview.

When this skill leaves a genuine user action, its readout may include `commands` containing the exact terminal command, a clear title, and a `detail` explaining why or when the user should run it. When actual source deserves attention, its readout may include `keyCode` containing the exact code, language, and optional safe repository-relative file path. Both appear as separate, copyable code blocks. Execution logs and already executed commands are not user instructions; omit both sections when they are not applicable. Never include secrets, credentials, tokens, private keys, invented code, or speculative terminal instructions.

Depending on the actual completed work, tailor one to three top next prompts from:

**1. [`/qs-test-tdd`](https://github.com/quickstark/skills/blob/main/skills/engineering/qs-test-tdd/SKILL.md)**

Verify that Git integration or conflict resolution preserved observable behavior.

```text
Use $qs-test-tdd to implement this behavior using a red-green test-driven loop.
```

> Suggested model: `gpt-5.6-terra` · Suggested thinking: `high`
>
> Heuristic: Test-driven work benefits from reasoning through behavior and regression seams.

**2. [`/qs-review-code`](https://github.com/quickstark/skills/blob/main/skills/engineering/qs-review-code/SKILL.md)**

Review the integrated changes, actual branch state, and any conflict resolution.

```text
Use $qs-review-code to review these changes for correctness, standards, and requirements.
```

> Suggested model: `gpt-5.6-sol` · Suggested thinking: `high`
>
> Heuristic: Code review benefits from deeper correctness, security, and standards analysis.

**3. [`/qs-deploy-release`](https://github.com/quickstark/skills/blob/main/skills/engineering/qs-deploy-release/SKILL.md)**

Run the documented release workflow only after GitHub publication is verified and deployment is explicitly approved.

```text
Use $qs-deploy-release to verify and run this project's documented release workflow.
```

> Suggested model: `gpt-5.6-terra` · Suggested thinking: `high`
>
> Heuristic: An approved release benefits from deliberate prerequisite and smoke-test checks.

## Where it fits

A reach-for-it-anytime standalone: you invoke it at the moment a merge or rebase stalls, and it hands you back a clean, committed tree. Its natural neighbour is [qs-code-debug](https://aihero.dev/skills-diagnosing-bugs), because a merge that resolves cleanly but misbehaves afterwards is a diagnosis problem, not a conflict one. When you're unsure which skill fits, [qs-help](https://aihero.dev/skills-ask-matt) routes you.
