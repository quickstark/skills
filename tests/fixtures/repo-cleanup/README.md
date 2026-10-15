# Repository cleanup acceptance fixtures

`scenarios.json` defines synthetic behavioral cases. `scripts/repo-cleanup-trials.mjs` runs fresh Codex calls sequentially with the repository's existing process supervisor. It does not run as part of `npm test` and does not install, commit, or publish. Model, reasoning, approval, and sandbox overrides are not supplied to the model runner.

Run explicitly from the repository:

```sh
node scripts/repo-cleanup-trials.mjs capture /tmp/qs-repo-cleanup-new-run
```

The output directory must be new. Normal Codex runtime access is required. The first readiness attempt failed to initialize in a read-only runtime; its telemetry is retained as infrastructure failure, not behavior evidence.

Each run freezes the exact skill, scenarios, runner and source hashes. Each case stores its input, raw actions, response, process telemetry, and before/after file hashes. Git revision and staged-state facts are **simulated supplied observations**; these trials create no commits. Filesystem changes, check execution, preservation hashes, and external sentinels are real. Dependency cases use an inspectable fixture package manager without downloading software. They test the removal/churn decision, not npm's implementation. Response-only cases test decisions, not execution. A synthetic checker injects the concurrent edit in T08.

`evidence/current` contains reviewed current-source records, plus serialized after-file content so offline assertions can verify the actual changes. Symlinks are recorded as link strings, never copied as live external links. `review.json` binds each parent verdict to the exact response and state. Transport success alone is insufficient. `npm test` checks these recorded observations; it does not claim to run fresh models.

Raw responses are stored in `response.json` as lossless UTF-8 text, including original Markdown hard-break spaces. Decode the `text` string to reproduce the captured bytes; the stored SHA-256 and the original parent-verdict hash must both match. `evidence/lossless-storage.json` records the original capture paths and hashes, including the separately serialized release failure log. Historical runtime telemetry retains its original capture filenames. No response wording, verdict, or raw event stream was changed during serialization.

`evidence/rejected-initial` retains the initial unsafe guard sequence and known-churn execution, with their earlier source digest. Later preservation checks did not turn those actions into passes. The revised source requires a successful guard before each mutation and blocks known-invalid operations before execution.

`influences.json` records immutable reviewed source revisions, original file digests and root license evidence. All four are inspiration-only: this is original QuickStark wording, with no copied upstream skill/helper and no adopted upstream revision. The validation document explains what was retained or rejected from each influence.

These are single-sample controlled acceptance observations, not a reliability benchmark, proof of race-free transactions, installed-host acceptance, or security certification. See [validation](../../../docs/validation/repo-cleanup.md) for the acceptance matrix and the separate root Claude strict-validation blocker.
