# Pre-comparison infrastructure amendments

The original plan and `frozen-v1/frontend-adoption-trials.mjs` preserve the first frozen protocol. Its one F10/v84 pilot failed before Codex initialized its app-server client: the runtime state directory was read-only. There were no events, model response, tokens, tools or product edits. The original attempt marker, output directory and supervisor log are hash-bound by `infrastructure-amendment.json` and remain untouched.

The parent authorized exactly one corrected pilot initialization through `exec_command` with `sandbox_permissions: require_escalated`, so the existing Codex client can perform its normal runtime state writes. This changes the execution interface, with no model/reasoning/sandbox/approval flags or configuration overrides. The preparation agent did not run the corrected attempt. Verify the interface first:

```sh
node tests/fixtures/frontend-adoption/infrastructure-amendment.mjs verify
```

The parent launches this command through that approved tool interface. The output directory must not already exist. The declaration flag records the expected parent interface; it does not claim to introspect the launcher sandbox.

```sh
node tests/fixtures/frontend-adoption/infrastructure-amendment.mjs pilot /tmp/qs-frontend-corrected-pilot-20260925 --parent-approved-runtime-write
```

The separate exclusive `corrected-pilot-attempt.json` marker prevents another corrected attempt. No marker is deleted or budget reset. Both pilots remain excluded from the 66 matched comparison trials; successful prompt capture would still require independent review and would establish no rendered or generated-image quality result.

Before any model response existed, the parent also found a harness authority contradiction: F09 explicitly permits an existing image-generation tool, but the generic prompt prohibited all external services and outside-workspace outputs. `amended-plan.json` binds the corrected runner and the unchanged original plan, original runner snapshot and corrected-pilot interface. The correction exempts **only** the requested existing image tool within the unchanged call budget, including its own returned primary images at tool-managed output paths. Manual/product edits remain inside the task workspace. It grants no general browsing, downloads, installs, uploads, substitute images, extra generations or other external services. Candidate and baseline instruction bodies, private references, common facts, rubric and schedule are unchanged.

Runtime telemetry binds the exact active runner hash. Full comparison has not started. The original runner's comparison summary must be inspected for failed/incomplete rows even when its process exits zero; a zero supervisor exit is not adoption evidence. An interrupted comparison retains its persistent lock and requires an explicit continuation decision; no automatic lock takeover or sample replacement exists.
