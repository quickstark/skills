# 4.4.0 acceptance delta review

The release adds multi-agent delegation to the unpublished 4.3.3 source at `1edd4a5b79b672cde866765c23c6108fde156105`. Existing source-bound behavioral decisions remain scoped to their original evidence; failed historical trials and the retained efficiency baseline are unchanged. This review does not assert live-machine rollout or publication.

**Reviewer limitation.** This delta was reviewed by the same agent session that authored it, at the maintainer's request to release. No independent or blinded behavioral trial was run for the new delegation wording. Acceptance of the new behavior rests on contract tests, projection checks and native discovery only, and does not certify future model delegation behavior.

## Reviewed changes and evidence

- A shared Delegation section in `docs/skill-run-contract.md` and the new v3-native private capability `qs-internal:delegation` (`skills/internal/delegation.md`, owned by `qs-code-build`, `qs-review-code` and `qs-plan-spec`) require fresh-context helpers, context pointers, bounded returns, root-owned synthesis and completion, a serial fallback and no authority expansion. The capability is repository-authored; requirements were informed by `mattpocock/skills` commits `7739eaed7f8f3915437a8def198a6d0d7206dbc7`, `a496f5513d4a4cf889bc48e189e579f4b0bdf6aa` and `3da8c01116264675eeefbd6e9d59c734de9095cc`, and no upstream body is copied.
- `qs-review-code` adds parallel read-only review axes; ticket decomposition and `qs-plan-spec` record `Blocked by` edges and a frontier; `qs-code-build` adds `mode=graph` (default `single` unchanged), which needs explicit branch and worktree authority before creating either; `qs-plan-research` may use one background helper; advanced `parallel-coverage` and `concurrency-ownership` use the conditional fresh-context directive. `qs-help` routes graph mode separately from `qs-unlazy`.
- Packages remain skills-only. No Claude manifest declares `agents` and no projection contains agent definitions, so the native installer's skills-only contract is unchanged.
- Catalog, metadata and all three host projections still expose 39 commands. The core private capability count is 21 and provenance covers 73 capabilities. Changed provenance target entries are recorded as `pending`, not adopted.
- `tests/multi-agent-delegation.test.mjs` asserts the contract, capability registration and projection, review axes, ticket graph, research helper, advanced capabilities, graph mode, help routing, skills-only packages and host documentation.
- `check.log` passes all projection and documentation checks. `claude-strict.json` passes all six strict Claude roots. Fresh actual-host enumeration from `adoption-final-discovery/release-4.4.0` finds exactly 39 commands in Codex and Pi, using initialization and enumeration only with no model requests, and all three relocated video/execution closures pass.
- Before this refresh, the updater acceptance check rejected all six packages on all three hosts: `qs-skills` lacked the new capability obligation and every package had changed source bindings. The final suite and updater probe results are recorded after refresh in `tests.log`.

## Decision and limits

Retain prior criterion decisions for unchanged capabilities and their original evidence. Extend package closure, notices, native discovery and updater evidence with this release's checks, and add `qs-internal:delegation` to the `qs-skills` obligations. Bind acceptance to the exact 4.4.0 source and projected bytes.

No evidence here grants mutation authority. Production rollout still requires tracked, unchanged release source and evidence, exact `origin/main` HEAD, and successful ownership and selection preflight. Codex, Claude and Pi user configuration were not changed.
