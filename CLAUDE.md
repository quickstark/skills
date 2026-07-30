# QuickStark skill collection

Promoted skills live under `skills/engineering/` and `skills/productivity/`. Every promoted skill uses the `qs-` prefix; the next name segment describes its purpose: `plan`, `design`, `code`, `test`, `review`, `deploy`, `git`, `flow`, `learn`, or `skill`.

`skills/misc/`, `skills/personal/`, `skills/in-progress/`, and `skills/deprecated/` remain upstream reference material. Never promote them into the root `README.md`, the Claude plugin, or the generated Codex plugin.

## Source of truth

`scripts/qs-skill-catalog.mjs` defines each promoted skill, its upstream name, bucket, invocation policy, display metadata, baseline action, purpose, approved follow-on skills, and heuristic model and thinking guidance. Add or rename a skill there before updating its folder. Derive copy-ready next prompts and their suggested model and thinking level from that catalog and the actual run evidence; do not maintain an independent prompt-routing catalog.

Each promoted skill must have:

- A folder named exactly like its `SKILL.md` frontmatter `name`.
- An `agents/openai.yaml` with matching `QS` display metadata and a `$qs-...` default prompt.
- A linked entry in `README.md` and its bucket `README.md`.
- A documentation page under `docs/<bucket>/<skill-name>.md`.
- An entry in `.claude-plugin/plugin.json`.
- A source-synchronized Codex copy in `codex/plugins/qs-skills/skills/`.
- A catalog-generated, architecture-quality HTML readout, completion report, and up to three context-aware next prompts that explicitly embed approved follow-on skills and suggest a heuristic model and thinking level.

Preserve invocation mode in both harnesses. Explicitly invoked skills set `disable-model-invocation: true` and `policy.allow_implicit_invocation: false`. Model-invoked skills omit both restrictions.

## Plugins

The Claude marketplace is `.claude-plugin/marketplace.json`. Its plugin is `.claude-plugin/plugin.json` and must list exactly the promoted skills.

The Codex marketplace is `codex/.agents/plugins/marketplace.json`. Its plugin is `codex/plugins/qs-skills/.codex-plugin/plugin.json`. Codex accepts one skill-directory path, so `codex/plugins/qs-skills/skills/` is a generated, promoted-only snapshot rather than a second independently edited source. `codex/plugins/qs-skills/scripts/` is the generated snapshot of the shared skill catalog and HTML readout helper. The sync removes Claude-only `disable-model-invocation` frontmatter from generated Codex skills; `agents/openai.yaml` preserves the equivalent explicit-invocation policy.

Keep `package.json`, the Claude plugin, and the Codex plugin on the same version. After changing a promoted skill or plugin, run:

```bash
npm run sync:codex
npm test
```

When Claude Code is available, also run `claude plugin validate . --strict` after changing a Claude manifest.

## Router and documentation

`skills/engineering/qs-help/SKILL.md` is the authoritative router. Update it whenever a user-reachable skill, workflow, or category changes. Keep the root and bucket indexes split into **User-invoked** and **Model-invoked**.

Keep each promoted documentation page synchronized with its skill. Retain absolute links to the original upstream source when the skill was adapted from Matt Pocock. Never claim a personalized GitHub fork or published documentation URL exists before it has actually been created.

Every skill ends with `## Completion report and next steps`. Each run generates a self-contained HTML readout through `scripts/qs-skill-readout.mjs`. Its in-chat output reports **Status**, **Skills used**, **Outcome**, **Execution**, **Readout**, and **Top next prompts**; **Outputs** and **Checks** are included only when applicable. List only skills actually used. Offer at most three copy-ready prompts, each explicitly invoking a catalog-approved follow-on skill and carrying forward the run's actual outcome and relevant observed findings, decisions, outputs, and checks. Put every complete prompt in its own visually prominent fenced text code block. Put its heuristic suggested model and thinking level in a visually muted callout underneath. Never present a suggestion as observed quality or automatically change the active configuration. Report `None — the requested work is complete` when no follow-up is necessary. `scripts/sync-skill-output-contracts.mjs` generates and verifies this contract in both skill instructions and documentation.

Every actual promoted skill must render with `scripts/qs-skill-readout.mjs render --require-hosted` and return only an authenticated, independently accepted `https://reports.quickstark.com/` report URL. Validate the canonical ingestion origin before sending a producer credential. If the private token, safe current-project identity, or hosted service is unavailable, fail clearly and preserve the immutable local recovery artifact when it can be safely created; never substitute localhost, a private IP, or a filesystem path as the skill result. Readouts can remain in the OS temporary `quickstark-readouts` directory as private recovery artifacts. Only an explicitly requested local preview or gallery may start a health-checked viewer: localhost on a Mac or graphical desktop, or one capability-protected private home-network address on a headless or SSH-connected Linux dev box. Linux remote preview viewers run as temporary user-managed services so they survive isolated Codex commands without permanent setup. `QS_READOUT_ACCESS=ssh` forces localhost for explicitly requested SSH forwarding. Never bind to every network interface, expose the repository, require Tailscale, or present an unverified report URL as accessible.

## Upstream

The `origin` remote points to the personal fork at `https://github.com/quickstark/skills`. The `upstream` remote points to `https://github.com/mattpocock/skills` and must remain a read-only reference for reviewing original changes. Push personalized changes only to `origin`. Preserve the original MIT license and Matt Pocock attribution.
