# Validation-host portability review

## Scope and acceptance decision

This follow-up reviews the test-host repairs accompanying the README evidence and
PS 3.8.0 checkout-identity repair. It does not regrade historical model trials,
change their outcomes, certify a new release, or establish installed-host rollout.
All existing criterion status/note fields and host-check decisions remain intact.

The changed, hash-bound test sources support AC-14, AC-16 and AC-17. Their updated
bindings are justified by the following source review and targeted controls:

- **AC-14 / AC-16:** The selected-input tests previously treated an entire HOME as
  a package payload. The local Codex Node launcher invokes mise, which creates
  `.local/state/mise/tracked-configs/822c1419e27948c3` as a symlink to
  `/etc/mise/config.toml` in the isolated HOME. This is launcher state, not package
  content. The fixture now initializes the launcher with `codex --version` before
  taking its baseline. A test-only full-HOME inventory records every directory,
  file content/mode and symlink target without traversing links. It does not
  exclude launcher state or permit it to change silently. Controls detect added
  and changed files and retargeted links. The original selected-package,
  ownership, edited-cache and read-only assertions remain. An explicit control
  proves `captureMigrationPath` still rejects that same linked tree as a payload.
- **AC-17:** Linux lock tests retain their observed namespace/boot assertions and
  verified-dead recovery checks. On other hosts the current production contract
  returns unknown process identity and refuses dead-owner retirement. Tests now
  assert that refusal, preservation of the owner record, and continued exclusion
  of competing transactions. No PID-only recovery or weakened lock policy was
  introduced. The comparison-runner lock test likewise requires null, not an
  invented namespace, on unsupported hosts.

Previous test hashes (preserved here rather than silently discarded):

| Source | Previous SHA-256 |
| --- | --- |
| `tests/managed-skill-input.test.mjs` | `e3f4877b71fa009ae07df134663bdc5bb0af2aeb304a715bc5f7e762312366f7` |
| `tests/migration-transaction.test.mjs` | `b542fdc8fd00089ec1704635b97acb8430a57f58c7b5237f67cacd942ed66fe1` |

The audit binds the current sources and the new full-HOME inventory helper. These
are test-oracle corrections, not new adoption decisions. They do not turn a
failed runtime observation into a successful observation.

## Capture lifecycle

The frontend process observer has always required Linux procfs; its top-level
runner already rejects other hosts. The lower-level `execute` entry point now
checks platform and procfs availability before creating artifacts or spawning a
child. The previous order could throw while reading the boot ID after spawning
and leave the child waiting on stdin. An exceptional-path finalizer now closes
supervision timers, reaps its child and cleans observed descendants. Process-group
signals still require the original process identity; no broad process sweep or
PID-only descendant cleanup is added.

Portable tests cover unsupported-platform and missing-procfs rejection. A native
non-Linux subprocess test verifies prompt exit with no artifacts. Actual Linux
capture and exceptional spawned-child cleanup tests are explicitly Linux-only;
a macOS test-suite pass does not prove those Linux runtime paths. Frozen frontend
plans remain bound to their original runner hashes: changing current runner code
does not authorize replay under a historical plan or rewrite recorded trials.

## Temporary directories and video controls

The test runner creates its private temporary root from the canonical OS temp
path and passes that root through TMPDIR/TMP/TEMP. Thus strict production snapshot
checks need not accept symlinked ancestors such as macOS `/var` or `/tmp` aliases.
All fixture temporary data remains under the runner's cleanup root where callers
use the standard temporary-directory interface. Fixture shebangs also resolve
Node from the directory of the runner's actual `process.execPath` before inherited
PATH entries. This avoids invoking a version-manager shim that needs user trust
or writes launcher state inside a private HOME. It does not trust any additional
configuration or change globally installed tools.

Current video unit tests use `tests/helpers/isolated-video-runtime.mjs`, which
accepts only existing, canonical descendants of the OS temporary root. It rejects
the root itself, paths outside it and symlink escapes, and still disables network
transport. The historical HyperFrames instrumentation and its trial artifacts
remain unchanged. Caption CLI, cached-model, pinning and no-download assertions
are unchanged; these are synthetic adapter tests, not new real media evidence.

## Native package authentication isolation

The native package-command adapter inherited the parent environment, including
`OPENAI_IDENTITY_TOKEN_FILE`, `OPENAI_FEDERATION_RULE_ID` and
`OPENAI_WORKLOAD_IDENTITY_CONTEXT`. On the originating Linux host, Node 24.21.0
and Codex CLI 0.165.0 stalled during authentication even for an isolated plugin
inventory. The unfiltered command exceeded 32 seconds; removing the complete
identity triple reduced it to approximately 0.13 seconds. These are the supplied,
verified measurements from the originating host, not new measurements on the
receiving host. Partial removal can instead leave invalid authentication
configuration. The adapter's existing 30-second timeout killed the stalled child
with SIGKILL, producing the reported package-command failures.

`runNativePackageCommand` now builds a separate child environment with the same
home overrides, PATH, ordinary authentication and Pi settings, then deletes all
three workload-identity variables before calling `execFile`. It does not mutate
`process.env`, extend the timeout, narrow native inventory or change ownership
checks. Native package-manager children no longer inherit the enclosing
workload's identity context; ordinary authentication such as `OPENAI_API_KEY`
remains available.

The subprocess regression uses synthetic values and reports only presence and
equality booleans, never credential values. It checks absence of each identity
variable, preservation of the ordinary API key and the unchanged parent
environment, restoring every modified parent value in `finally`. On the receiving
checkout, the regression failed against the original adapter because all three
variables reached the child, then passed with the repair. Existing selected-home
and Claude/Pi override controls also passed. This verifies the environment
boundary without repeating the completed authentication diagnosis or changing
a real installed profile.

Prior bindings retained for provenance:

| Source | Binding kind | Previous value |
| --- | --- | --- |
| `scripts/migration-native-packages.mjs` | Portable source digest from `captureMigrationPath` and `adoptionSourceContentSha256` | `3bd288f32717905d20cd0ebecffaac3f1bf4cf1e9613d0f227f87b1a6faa88e3` |
| `tests/migration-native-packages.test.mjs` | File SHA-256 | `983af2e206ea64977ed5a92e311c3078c54233c4b7ac35611245dabfdd926e49` |

The originating validation reported 503 passes, 23 skips and zero failures.
Receiving-host results and native-CLI availability are reported separately;
those historical counts are not rewritten as current acceptance. Only the
adapter source binding and the evidence hashes for the regression file and this
review are refreshed. Criterion decisions, historical results and unrelated
bindings remain unchanged.

## Boundaries

No installed skill, user configuration, canonical skill body, package projection,
PS payload, version, historical trial result or migration authority is changed by
these portability repairs. Native integration tests use temporary isolated homes
and synthetic repositories. Conditional Claude validation remains unavailable
when the CLI is absent. Full-suite results and platform skips must be reported
separately from Linux runtime verification and installed-host acceptance.
