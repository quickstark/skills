# QuickStark skill collection

Promoted skills live under `skills/engineering/` and `skills/productivity/`. Every promoted skill uses the `qs-` prefix; the next name segment describes its purpose: `plan`, `design`, `code`, `test`, `review`, `deploy`, `git`, `flow`, `learn`, or `skill`.

`skills/misc/`, `skills/personal/`, `skills/in-progress/`, and `skills/deprecated/` remain upstream reference material. Never promote them into the root `README.md`, the Claude plugin, or the generated Codex plugin.

## Source of truth

`scripts/qs-skill-catalog.mjs` defines each promoted skill, its upstream name, bucket, invocation policy, display metadata, purpose, and appropriate next skills. Add or rename a skill there before updating its folder.

Each promoted skill must have:

- A folder named exactly like its `SKILL.md` frontmatter `name`.
- An `agents/openai.yaml` with matching `QS` display metadata and a `$qs-...` default prompt.
- A linked entry in `README.md` and its bucket `README.md`.
- A documentation page under `docs/<bucket>/<skill-name>.md`.
- An entry in `.claude-plugin/plugin.json`.
- A source-synchronized Codex copy in `codex/plugins/qs-skills/skills/`.
- A catalog-generated completion report and relevant next-skill recommendations.

Preserve invocation mode in both harnesses. Explicitly invoked skills set `disable-model-invocation: true` and `policy.allow_implicit_invocation: false`. Model-invoked skills omit both restrictions.

## Plugins

The Claude marketplace is `.claude-plugin/marketplace.json`. Its plugin is `.claude-plugin/plugin.json` and must list exactly the promoted skills.

The Codex marketplace is `codex/.agents/plugins/marketplace.json`. Its plugin is `codex/plugins/qs-skills/.codex-plugin/plugin.json`. Codex accepts one skill-directory path, so `codex/plugins/qs-skills/skills/` is a generated, promoted-only snapshot rather than a second independently edited source. The sync removes Claude-only `disable-model-invocation` frontmatter from generated Codex skills; `agents/openai.yaml` preserves the equivalent explicit-invocation policy.

Keep `package.json`, the Claude plugin, and the Codex plugin on the same version. After changing a promoted skill or plugin, run:

```bash
npm run sync:codex
npm test
```

When Claude Code is available, also run `claude plugin validate . --strict` after changing a Claude manifest.

## Router and documentation

`skills/engineering/qs-help/SKILL.md` is the authoritative router. Update it whenever a user-reachable skill, workflow, or category changes. Keep the root and bucket indexes split into **User-invoked** and **Model-invoked**.

Keep each promoted documentation page synchronized with its skill. Retain absolute links to the original upstream source when the skill was adapted from Matt Pocock. Never claim a personalized GitHub fork or published documentation URL exists before it has actually been created.

Every skill ends with `## Completion report and next steps`. Its output reports **Status**, **Skills used**, **Outcome**, and **Next best**; **Outputs** and **Checks** are included only when applicable. List only skills actually used and recommend only contextually appropriate catalog entries. `scripts/sync-skill-output-contracts.mjs` generates and verifies this contract in both skill instructions and documentation.

## Upstream

The `origin` remote points to the personal fork at `https://github.com/quickstark/skills`. The `upstream` remote points to `https://github.com/mattpocock/skills` and must remain a read-only reference for reviewing original changes. Push personalized changes only to `origin`. Preserve the original MIT license and Matt Pocock attribution.
