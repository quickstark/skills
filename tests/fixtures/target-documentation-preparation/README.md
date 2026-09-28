# Unapplied target documentation preparation

`target-documentation.patch` prepares five effective paths: README, CLAUDE (the
target of the existing AGENTS symlink), installation, control-plane administration
and the upstream review index. `base/` and `proposed/` make each change readable;
`inventory.json` binds their hashes and the consulted implementation sources.
No active documentation, registry, native configuration or installed package was
changed. No model was invoked for this leaf.

Run `python3 tests/fixtures/target-documentation-preparation/verify.py` from the
repository root to check active-base equality, patch applicability, local links,
the preserved AGENTS symlink and first-time Codex marketplace bootstrap. It does
not apply the patch. Any source drift needs review before activation.

The parent must resolve the acceptance/activation items in `inventory.json` before
applying this target patch. Pending 66-trial approval and video report validation
are preparation state, not permanent product documentation. Their earlier draft
sentences were removed from proposed shipped prose; replace the inventory status
only with actual verified decisions. Do not turn unverified runtime/provider paths
into supported claims while finalizing it.

## Generated ownership inventory

| Output | Owning implementation / final action |
| --- | --- |
| One page per registered root under `docs/<bucket>/` | `scripts/sync-v3-docs.mjs`; regenerate against the activated registry |
| Canonical completion sections and Help routing | `scripts/sync-skill-output-contracts.mjs`; keep exact literals derived from the registry |
| Codex, Claude and Pi projections/manifests/marketplaces | `scripts/sync-codex-plugin.mjs`; preserve complete video/execution indices and unchanged transition payload |
| `docs/upstream/provenance.md` | `scripts/sync-upstream-docs.mjs` from validated provenance records |
| Bucket READMEs and historical PS indexes | `scripts/sync-v3-docs.mjs` now generates all five target indexes; regenerate against the activated registry |

The generator owns `skills/engineering/README.md`,
`skills/productivity/README.md`, `skills/video/README.md`, `docs/pstack/index.md`
and `docs/pstack/using-ps-skills.md`.
The PS material must be scoped as historical compatibility rather than a fresh
target install recommendation. These paths are intentionally excluded from this
patch. Source runtime-profile wording also belongs to its existing owners and
must be reconciled with final package acceptance there.

After authorized target activation, run the normal source generators and checks:

```bash
npm run sync:codex
npm run check:codex
npm test
```

For a release, Changesets currently changes the root version and tags only. The
parent must synchronize root package/lockfile and all active host manifests and
projections after versioning, then run the required checks before intended
publication. Retain PS 3.8.0 outside active-version synchronization. Generation,
tests, tagging, publication and installed-host rollout need their own evidence;
none was performed by preparing this patch.

## Review history

Pass 1 mapped exact target membership and existing update/release code. Pass 2
preserved selection/ownership/provider boundaries and original source history.
Pass 3 found the AGENTS symlink (an initial textual patch dry-run failed without
changing it), the missing first-time Codex marketplace bootstrap, the spec/CLI
`--with-package` versus implemented `--with` difference, and incomplete index
generator ownership. Pass 4 removed temporary approval prose from shipped drafts,
made selection persistence say “saved,” and checked links and the revised patch.

Parent follow-up reviewed the new index generator and its identity, drift,
missing-source and symlink controls. Legacy generation retains its existing
indexes; target generation produces all 38 public entries and the historical PS
successor guides. Both dedicated prompt roles and visual parity remain explicit.
The preparation verifier now exits unsuccessfully when any bound source changes;
its initial negative check detected exactly the changed documentation generator.
The source binding was refreshed only after reviewing that implementation.
