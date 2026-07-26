Quickstart:

```bash
codex plugin marketplace add ./codex
codex plugin add qs-skills@quickstark
```

## What it does

`/qs-code-document` creates or updates accurate project documentation from the actual implementation, tests, configuration, and verified deployment evidence.

Use it for README files, setup instructions, API and module references, architectural decisions, operational runbooks, deployment guides, migration notes, and genuine release notes. It records the machine where the skill actually ran and identifies only the documentation files it actually modified.

The skill separates verified information from open questions. It will not describe an unpublished commit as a release, invent a pull request or issue, expose credentials, or document an unverified deployment URL.

## When to reach for it

Invoke `/qs-code-document` when a code change, design decision, release, deployment, or existing project behavior needs accurate reader-facing documentation. The agent can also select it automatically when documentation is the actual task.

Use `/qs-code-build` for implementation, `/qs-design-architecture` for an architectural assessment, and `/qs-deploy-release` for an explicitly approved deployment. Use `/qs-code-document` to record the verified results of those workflows.

## Output and next steps

`/qs-code-document` automatically starts or reuses a private, health-checked readout viewer; generates an architecture-quality, self-contained HTML readout; and closes with the same concise report used across the collection: status, skills actually used, outcome, actual execution machine, the verified viewer link and real readout path, real outputs or checks where applicable, and the best next step. Each skill uses its own compact, purpose-specific visual report profile; charts, concept maps, review matrices, and check summaries represent only actual recorded results. Relevant runs can include verified deployment environments and URLs, repository-relative files actually changed, independently verified GitHub pull requests, actually closed issues, released versions, complete Git commit hashes, and explicitly observed visual relationships. Local commits are never labeled as published, and issue closure is never attributed to an unverified release. On a Mac the viewer uses localhost; on a headless or SSH-connected Linux dev box it uses a protected private home-network URL. Tailscale is not required. Its readout uses the shared `scripts/qs-skill-readout.mjs` generator and defaults to the OS temporary `quickstark-readouts` directory. Set `QS_READOUT_DIR=/docker/appdata/quickstark-readouts` to opt into durable, project-organized storage and browse verified projects, searchable reports, and actual recent activity. Catalog previews remain explicitly identified, and no report claims that a suggested skill has already run.

Depending on what actually happened, the next step may be:

- [`/qs-review-code`](https://github.com/quickstark/skills/blob/main/skills/engineering/qs-review-code/SKILL.md) — Verify that the documentation accurately reflects the actual implementation.
- [`/qs-flow-handoff`](https://github.com/quickstark/skills/blob/main/skills/productivity/qs-flow-handoff/SKILL.md) — Hand documented operational knowledge and remaining work to the next session.
- [`/qs-deploy-release`](https://github.com/quickstark/skills/blob/main/skills/engineering/qs-deploy-release/SKILL.md) — Use the verified deployment documentation when a release is explicitly approved.

## Where it fits

Documentation follows evidence rather than predicting it:

```text
/qs-code-build or /qs-design-architecture
    ↓
/qs-code-document
    ↓
/qs-review-code
    ↓
/qs-deploy-release, only when explicitly requested
```

Document a completed release afterward when the actual environment, version, deployment URL, commit, pull request, and issue closures can be independently verified.
