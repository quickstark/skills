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

## Boundaries

No installed skill, user configuration, canonical skill body, package projection,
PS payload, version, historical trial result or migration authority is changed by
these test-host repairs. Native integration tests use temporary isolated homes
and synthetic repositories. Conditional Claude validation remains unavailable
when the CLI is absent. Full-suite results and platform skips must be reported
separately from Linux runtime verification and installed-host acceptance.
