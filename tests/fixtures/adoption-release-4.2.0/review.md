# 4.2.0 acceptance delta review

The release combines the published 4.1.0 baseline at `73d5a3cc5bf4913d0b21aca771179ca5ea4e2f21` with the cleanup specialist, supported guidance layout, and additive-package update repair. The existing source-bound behavioral decisions remain scoped to their original evidence; failed historical trials and the retained efficiency baseline are unchanged. This review does not assert live-machine rollout or publication.

## Reviewed changes and evidence

- The canonical cleanup skill is byte-identical to the nine accepted trials (SHA-256 `0b03d6d92c1820c780b4fd2d648cf022853f0d11dc6fa0b7be3f83adc65a07a4`). Its eight automated evidence/contract checks pass. Cleanup AC01–AC20 is a separate acceptance set from the existing upstream AC-01–AC-24; neither is silently renumbered.
- Existing public skill bodies are unchanged apart from Help discovery of the new explicit specialist. Catalog, metadata, provenance and all three host projections expose 39 commands, with nine specialists. New wording is original; prior notices and the exact PS 3.8.0 payload remain intact.
- Guidance contents retain SHA-256 `26a229c5dcfba56244073506e3777c127a87e2bc19eeb1e144881cc3aaf2a456`; `.claude/CLAUDE.md` and the `AGENTS.md` link replace the unsupported root layout. All six strict Claude roots pass, without suppressing checks. The previously documented nested-core discovery limitation remains.
- The updater permits a different-version active package with a subset of the current names only in combination with an exact trusted prior Git-tree match. Same-version mismatches, removed/renamed identities, altered historical bytes and PS transition checks remain enforced. The isolated native regression passes and includes rejection of a modified prior cache. The published Codex-home targeting implementation is preserved; its default/custom/external-home tests pass.
- Fresh actual-host enumeration from `adoption-final-discovery/release-4.2.0` finds exactly 39 commands in both Codex and Pi, using initialization/enumeration only and no model requests. All three relocated video/execution closures pass. This establishes local discovery and helper closure, not actual-machine migration or new provider/media execution.
- The initial full suite has 496 cases: 494 passed, one failed on stale evidence hashing, and one intentionally skipped non-Linux control. The failure is retained in `tests-before-audit-refresh.json`; it requires refreshed reviewed evidence, not a weaker assertion. Final suite and audit results are recorded separately after refresh.

## Decision and limits

Retain the prior criterion decisions for unchanged capabilities and their original evidence. Extend specialist behavior acceptance with the existing source-bound cleanup trials and current assertions; extend package closure, notices, native discovery and updater safety evidence with this release's checks. Bind acceptance to the exact merged 4.2.0 source and projected bytes. Original root-warning records, rejected cleanup trials, image-font limitations, media-runtime limits and efficiency decisions remain historical evidence.

No evidence here grants mutation authority. Production rollout still requires tracked, unchanged release source/evidence, exact `origin/main` HEAD, and successful ownership/selection preflight. The original `/github/skills` files and symlinks were preserved while preparing this isolated release worktree. Codex cache/configuration and Pi configuration were not changed.
