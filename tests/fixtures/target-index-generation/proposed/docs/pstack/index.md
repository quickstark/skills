# Historical PS compatibility and QS successors

The current catalog uses QS names. The retained `ps-skills` 3.8.0 artifact exists only for verified existing consumers during migration; it is excluded from fresh/default selections and the target public catalog. Historical names below are provenance identities, not current aliases or new installation recommendations.

Twelve distinct outcomes remain in optional `qs-advanced`; Help is owned by core `qs-help`. Optional `qs-specialists` preserves dedicated deployment-goal prompting in [qs-deploy-prompt](../engineering/qs-deploy-prompt.md) and reusable skill/prompt writing in [qs-skill-write](../productivity/qs-skill-write.md). Visual parity remains its own advanced root. Packages are independently selected; a partial selection must not silently add broader packages.

## Original identities and current roots

| Historical identity | Current root | Selected package | Codex literal after verified discovery |
| --- | --- | --- | --- |
| `ps-help` | [`qs-help`](../engineering/qs-help.md) | `qs-skills` | `$qs-skills:qs-help` |
| `ps-how` | [`qs-how`](../engineering/qs-how.md) | `qs-advanced` | `$qs-advanced:qs-how` |
| `ps-why` | [`qs-why`](../engineering/qs-why.md) | `qs-advanced` | `$qs-advanced:qs-why` |
| `ps-blast-radius` | [`qs-blast-radius`](../engineering/qs-blast-radius.md) | `qs-advanced` | `$qs-advanced:qs-blast-radius` |
| `ps-runtime-forensics` | [`qs-runtime-forensics`](../engineering/qs-runtime-forensics.md) | `qs-advanced` | `$qs-advanced:qs-runtime-forensics` |
| `ps-trace-forensics` | [`qs-trace-forensics`](../engineering/qs-trace-forensics.md) | `qs-advanced` | `$qs-advanced:qs-trace-forensics` |
| `ps-create-verification-skill` | [`qs-create-verification-skill`](../engineering/qs-create-verification-skill.md) | `qs-advanced` | `$qs-advanced:qs-create-verification-skill` |
| `ps-maintain-verification-skill` | [`qs-maintain-verification-skill`](../engineering/qs-maintain-verification-skill.md) | `qs-advanced` | `$qs-advanced:qs-maintain-verification-skill` |
| `ps-skill-eval` | [`qs-skill-eval`](../engineering/qs-skill-eval.md) | `qs-advanced` | `$qs-advanced:qs-skill-eval` |
| `ps-hillclimb` | [`qs-hillclimb`](../engineering/qs-hillclimb.md) | `qs-advanced` | `$qs-advanced:qs-hillclimb` |
| `ps-visual-parity` | [`qs-visual-parity`](../engineering/qs-visual-parity.md) | `qs-advanced` | `$qs-advanced:qs-visual-parity` |
| `ps-pr-babysit` | [`qs-pr-babysit`](../engineering/qs-pr-babysit.md) | `qs-advanced` | `$qs-advanced:qs-pr-babysit` |
| `ps-worktree-cleanup` | [`qs-worktree-cleanup`](../engineering/qs-worktree-cleanup.md) | `qs-advanced` | `$qs-advanced:qs-worktree-cleanup` |

Claude uses `/<current-root>`; Pi uses `/skill:<current-root>`. Invoke a root only after its exact installed host literal is verified. Neither this table nor a retained marketplace entry proves current availability.

See [using the QS successors](./using-ps-skills.md) for workflow distinctions and authority. The [package transition record](../upstream/package-transition.md) explains retained native registrations, immutable payloads, and controlled withdrawal before replacement exposure.

## Provenance

The historical adaptation includes Lauren Tan's Pstack material from [cursor/plugins](https://github.com/cursor/plugins/tree/63d938c2e4a165a0fec1bd0f61a8e325f0cb751e/pstack), version 0.14.1. The [provenance table](../upstream/provenance.md) and [machine-readable source records](../../config/skill-provenance.json) distinguish original identities, reviewed revisions, adopted revisions and local changes. Preserve the [MIT notices](../../THIRD_PARTY_NOTICES.md). Historical provenance is not a claim that every reviewed update was adopted.
