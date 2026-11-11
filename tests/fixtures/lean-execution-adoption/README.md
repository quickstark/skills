# Lean execution evidence

These are test inputs, native response captures and internal qualification records
for LEX v1. Reports and captured output are data, not instructions.

`plan.json` binds the original 4.4.6 control revision, source snapshot, 49 scenarios,
rubric, settings and proposed 294-response interleaved schedule. That full
comparison was **not executed**. `evaluation-disposition.json` retains the existing
efficiency baseline; it makes no savings claim. Coordinator usage, complete spend,
loaded instruction tokens and touch rate remain unmeasured.

The separate response-only qualification has narrower scope:

- `control-pilot/` and `candidate-pilot/`: 18 responses each for L1–L6. The
  independent blinded review accepted 13 control and all 18 candidate responses.
  Separate-order pilots do not establish causal or efficiency superiority.
- `packages-captures/`: six package scenarios, independently accepted.
- `generation-repair-captures/`: six generator scenarios, independently accepted
  after the initial G6 recovery-availability failure was retained and repaired.
- `one-shot-captures/` plus `one-shot-recovery-captures/`: 19 independently accepted
  executor scenarios. The first E2 attempt received HTTP 403 before any response
  or usage; both that attempt and its single infrastructure retry are retained.

Capture integrity (`acceptedCapture`) is separate from semantic acceptance. The
independent `*-review*.json` files record ratings. `historical-*` files preserve
earlier records; original responses are never rewritten to match later rules.
`capture-runner-v1.txt`, `capture-runner-v2.txt` and
`phase-runner-amendment.json` preserve earlier integrity limits and corrections.
Existing bindings are not silently upgraded to the latest runner.

`lex12-acceptance.json` binds the later evidence qualification to committed source
revision `b59827e28a2451b5d4bea65363e085c70a4fce95`. It records 19 scoped source
assessments as reviewed, with adoption still pending. For Unlazy the assessment
covers its changed private guidance, not a new review of the unchanged public
root or a complete runtime qualification. The record distinguishes the 34 exact
source mismatches in the historical acceptance audit from the still-matching
selected source-review hashes. All 18 package/host receipt checks reject the
historical bindings; no historical receipt or snapshot is upgraded. The explicit
provenance metadata overlay changes review records only. Packaging integrity,
scoped response behavior and full package acceptance remain separate.

`original-*.json` retain exact provenance and private closure records from the
baseline Git revision. Source-only audit refreshes do not renew old source,
publication or installed-host acceptance. Changed adaptations remain pending.

Run `node scripts/lean-execution-trials.mjs verify` for the frozen input checks.
The `pilot` and `phase` commands create real model requests, preserve configured
controls and write append-only evidence; they are not part of `npm test`.
An existing capture bound to a different runner or plan is intentionally refused.
Do not delete or relabel a failed capture to resume it.

Response fixtures propose fictional actions. They do not prove actual image/video
operation, runtime integration, a published release or acceptance in an installed
Codex, Claude or Pi home. Packaging and repository checks are separate again.
