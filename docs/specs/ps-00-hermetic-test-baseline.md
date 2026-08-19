# Specification: PS-00 hermetic test baseline and safe Git readability

Status: Implemented (2026-08-19)

Parent decision: [Cursor-neutral pstack incorporation](./pstack-skills-incorporation.md#pre-implementation-baseline-gate)

Owning ticket: [PS-00 — Restore a trustworthy green repository baseline](./pstack-skills-incorporation-ticket-plan.md#ps-00--restore-a-trustworthy-green-repository-baseline)

Release boundary: This specification restores the reliability of the existing repository test gate. It does not add PS catalogs, commands, capabilities, manifests, or package projections.

## Decision

`ps-skills` implementation must not begin from the current red suite. PS-00 must first:

1. restore safe readability of the checkout's actual Git metadata;
2. make the documented `npm test` entrypoint independent of ambient QuickStark reporting credentials, destinations, Codex session identity, and Git redirection variables;
3. run the existing complete test inventory without weakening assertions; and
4. produce one ordinary green `npm test` result.

The current failures are execution-environment failures until proven otherwise. Do not change production readout, Workbench, GitHub, or Changesets behavior unless an assertion still fails after the Git and environment boundaries are corrected.

## Problem

Before PS-00, the repository's required test gate consumed host state that the tests did not own:

- `.git/config` was owned by `nobody` with mode `0700`, so the ordinary test user could not read the repository origin;
- `git remote get-url origin`, `git branch --show-current`, and `git rev-parse HEAD` all failed before returning repository evidence;
- the process inherited active `QS_READOUT_*` producer, endpoint, harness, and project-scope variables;
- test cases frequently derive child environments from `process.env`, allowing those values to override fixture-owned settings;
- production code can discover real credentials through the user's home and Codex profile even when a direct token variable is absent.

These conditions make unrelated assertions fail together: repository publication authorization, current-project selection, Git branch/revision evidence, GitHub issue observation, hosted-report metadata, and Changesets divergence.

A known red list is not a useful baseline for PS work because PS-02, PS-03, and PS-07 will modify catalog, package, and readout seams covered by the same suite. New failures could not be attributed confidently.

## Pre-implementation evidence

| Observation | Verified result | Interpretation |
|---|---|---|
| `.git/config` metadata | `-rwx------` (`0700`), owner `nobody`, group `djn12313` | The ordinary user cannot read the local repository configuration |
| Ordinary isolated `qs-skills` file | 8 failures out of 223 tests | The default environment is not a trustworthy baseline |
| Same file without inherited reporting variables | 4 failures out of 223 tests | Four failures are caused by ambient `QS_READOUT_*` state |
| Remaining isolated failures | publication, Workbench project selection, and Changesets | Each requires real repository identity unavailable through the unreadable config |
| Explicit verified Workbench project | current badge, both project outcomes, and activity ordering all passed | The observed Workbench failures do not demonstrate a rendering defect |
| Core v3 contract suite | 15 of 15 passed | Catalog/output v3 behavior is independently green |
| `npm run check:codex` | passed | Existing generated docs, contracts, and package projections are synchronized |

## Completion evidence

| Gate | Verified result |
|---|---|
| `.git/config` metadata | Regular non-symlink file, `-rw-------` (`0600`), owner and group `djn12313` |
| Git identity | Intended origin, `main` branch, full `HEAD`, local `main`, and worktree are observable |
| Safe preflight | `npm run test:preflight` passes and JSON output contains only approved repository identity and booleans |
| Focused PS-00 coverage | 11 of 11 tests pass, including environment isolation, every stable preflight failure, browser dependency preservation, cleanup, and signal behavior |
| Changesets | `npm run changeset -- status` passes with no package bump required |
| Codex synchronization | `npm run sync:codex` and `npm run check:codex` pass with zero unexpected generated changes |
| Ordinary repository gate | `npm test` passes 429 tests: 409 passed, 20 intentionally skipped, and 0 failed |

## Goals

- Make `npm test` the one reproducible, hermetic repository test command.
- Fail quickly and safely when the checkout's Git identity cannot be observed.
- Prevent inherited reporting configuration and real user credentials from entering test fixtures.
- Preserve all existing test files, assertions, local browser checks, and Changesets validation.
- Keep Git permission repair explicit, exact-targeted, and outside automatic test execution.
- Produce actionable diagnostics without printing config contents, credential values, or private paths unnecessarily.
- Keep PS-00 small enough to review independently before PS-01.

## Non-goals

- Do not fix, skip, weaken, rewrite, or snapshot over production assertions based on the contaminated runs.
- Do not change `scripts/qs-skill-readout.mjs`, `scripts/qs-skill-report-presentation.mjs`, Workbench rendering, hosted ingestion, or Changesets configuration unless a clean run proves a separate defect.
- Do not make the test runner silently repair ownership or permissions.
- Do not copy, replace, parse, print, or normalize `.git/config` contents.
- Do not contact GitHub or another remote to infer an origin when local Git metadata is unreadable.
- Do not introduce containers, a new test framework, or a second authoritative test command.
- Do not add any PS implementation artifact.

## Terminology and invariants

| Term | Meaning | Invariant |
|---|---|---|
| Ordinary test user | The unprivileged user executing `npm test` | Must be able to read the checkout's local Git configuration |
| Git preflight | Read-only proof that the current checkout has usable local identity | Never changes Git metadata or filesystem permissions |
| Hermetic child environment | A copied environment with host-owned reporting, credential, session, and Git-redirection state removed | The parent environment is never mutated |
| Test home | A private temporary home/config root created for one test run | Mode `0700`, unique per run, removed on exit |
| Fixture-owned configuration | Environment values explicitly installed inside a test | Remains allowed and authoritative within that fixture |
| Baseline gate | The complete command set required before PS-01 | No permanent expected failures |

## Governing decisions

### The permission repair is operator-owned

The repository code diagnoses Git unreadability but never performs `chown`, `chmod`, ACL changes, file replacement, or config rewriting.

Before changing permissions, the implementation workflow must resolve and display only:

- the exact checkout root;
- the exact local Git config path when safely discoverable;
- current file type, owner, group, and permission bits;
- the current ordinary user's identity; and
- the failed Git operation category.

Any permission mutation requires separate explicit authority and targets only the resolved config file. The desired postcondition is:

- the ordinary test user can read the file;
- the file is not group- or world-writable;
- contents and timestamps unrelated to the permission operation are preserved;
- the file is not replaced with a symlink; and
- Git resolves the existing origin, current branch, revision, and `main` reference.

The implementation must prefer correcting ownership or a narrowly scoped read permission over broad modes such as world readability. It must not guess the intended owner when the operator identity is ambiguous.

### The test entrypoint owns isolation

Individual tests should continue to create explicit fixture environments where needed. They must not each grow ad hoc cleanup lists. The repository test launcher establishes a safe base environment once, and tests opt values back in explicitly.

### The preflight runs before the suite

`npm test` runs the Git preflight before starting Node's test runner. An unreadable or ambiguous repository fails immediately with a concise remediation message rather than producing dozens of secondary assertion failures.

### Production behavior is not a fallback

The test launcher must not inject an explicit project identity to make tests pass. It must restore real Git readability so tests exercising discovery continue to prove discovery.

## Module boundaries

| Module | Responsibility | Public interface | Must not own |
|---|---|---|---|
| `scripts/qs-test-environment.mjs` | Pure environment sanitization, browser-installation path extraction, and test-file inventory | `sanitizeTestEnvironment(source, roots)`, `playwrightBrowsersPathFromExecutable(path)`, `TEST_FILES`, stripped-key predicates | Process spawning, filesystem mutation, Git inspection |
| `scripts/qs-test-preflight.mjs` | Read-only Git identity checks and safe diagnostics | `inspectGitBaseline(options)`, CLI with human and `--json` output | Permission repair, remote access, test execution |
| `scripts/qs-test-runner.mjs` | Temporary test home lifecycle, preflight orchestration, installed-browser handoff, Node test subprocess, exit/signal propagation | CLI invoked by `npm test` | Production readout behavior, assertion logic, privilege escalation |
| `tests/qs-test-baseline.test.mjs` | Unit and integration coverage for the three boundaries | Node test file | Real credentials, privileged permission changes, recursive full-suite invocation |
| `package.json` | Stable user-facing command wiring | `npm test`, optional `npm run test:preflight` | Environment policy details or duplicated test-file list |

Each module must be import-safe: importing it in a unit test performs no preflight, spawning, environment mutation, or CLI action. CLI execution uses the repository's existing direct-invocation guard pattern.

## Required interfaces

### `sanitizeTestEnvironment(source, roots)`

Input:

- a plain environment object;
- absolute, already-created private paths for `home`, `xdgConfigHome`, and `codexHome`.

Output:

- a new plain environment object;
- no mutation of `source`;
- `HOME`, `USERPROFILE`, `XDG_CONFIG_HOME`, and `CODEX_HOME` pointing at the private test roots;
- `CODEX_THREAD_ID` absent;
- all keys beginning `QS_READOUT_` or `QS_PROTOTYPE_` absent;
- all inherited keys beginning `GIT_` absent so repository/config/object redirection cannot escape the checkout;
- ordinary process necessities such as `PATH`, locale, temporary-directory configuration, and platform variables preserved.

The sanitizer never returns removed values, includes them in diagnostics, or writes them to disk. Tests may explicitly add fixture-owned `QS_READOUT_*`, `CODEX_THREAD_ID`, `HOME`, or `CODEX_HOME` values to a child environment after sanitization.

### `inspectGitBaseline(options)`

Input:

- absolute repository candidate `cwd`;
- injectable process and filesystem adapters for unit testing;
- optional safe `--json` presentation mode at the CLI boundary.

Git subprocesses receive a copied environment with inherited `GIT_*` redirection variables removed, while retaining the ordinary user's home only for standard Git ownership/safe-directory policy. The preflight never uses a temporary home to bypass a real checkout permission problem.

Checks, in order:

1. `cwd` resolves to an existing directory.
2. Git identifies it as a worktree and returns the repository top level.
3. The observed top level equals the expected repository root.
4. `remote.origin.url` is readable and normalizes to `github.com/quickstark/skills`.
5. the current branch is non-empty;
6. `HEAD` is a full 40-character revision;
7. `refs/heads/main` exists; and
8. the working tree can be inspected without a config or ownership error.

The function returns structured evidence only:

```json
{
  "ok": true,
  "repository": "github.com/quickstark/skills",
  "branchObserved": true,
  "revisionObserved": true,
  "mainObserved": true,
  "worktreeObserved": true
}
```

It does not return the raw remote, branch, revision, Git stderr, config contents, or credential-bearing URLs to the normal test log. Tests may inspect richer internal results only with synthetic values.

Failure codes are exact and stable:

- `repository_unavailable`;
- `git_config_unreadable`;
- `repository_root_mismatch`;
- `origin_unavailable`;
- `origin_unexpected`;
- `branch_unavailable`;
- `revision_unavailable`;
- `main_unavailable`; and
- `worktree_unavailable`.

The CLI exits `0` on success and `2` on preflight failure. Its human message names the failed category and a safe next action. It never includes environment values or Git-config contents.

### `qs-test-runner.mjs`

The runner:

1. resolves the repository root from its own module location;
2. executes `inspectGitBaseline` against that root before creating test subprocesses;
3. creates one private temporary root with child home, XDG config, and Codex profile directories;
4. resolves Playwright's installed browser root before switching to the private test home;
5. derives a sanitized environment without mutating `process.env`, carrying only that browser root as `PLAYWRIGHT_BROWSERS_PATH`;
6. spawns `process.execPath` with `--test` and the exact exported `TEST_FILES` list;
7. inherits standard input/output/error so Node test reporting remains unchanged;
8. forwards termination signals and exits with the child test status;
9. removes the temporary root in `finally`; and
10. emits no credential or removed environment value.

The exact test inventory remains:

1. `tests/qs-v3.test.mjs`
2. `tests/qs-skills.test.mjs`
3. `tests/qs-readout-workbench.test.mjs`
4. `tests/qs-readout-observation.test.mjs`
5. `tests/qs-report-presentation.test.mjs`
6. `tests/qs-readout-visual-artifact.test.mjs`
7. `tests/qs-readout-settings.test.mjs`
8. `tests/qs-readout-portfolio.test.mjs`
9. `tests/qs-test-baseline.test.mjs`

`package.json` changes `test` to `node scripts/qs-test-runner.mjs`. An optional `test:preflight` command may expose `node scripts/qs-test-preflight.mjs`; no raw bypass command is documented as an equivalent acceptance gate.

## Failure handling

| Failure | Required behavior | Prohibited response |
|---|---|---|
| Git config unreadable | Exit before tests with `git_config_unreadable` and operator-owned remediation guidance | Automatic permission mutation or fallback project identity |
| Origin missing | Exit with `origin_unavailable` | Network lookup or assuming the package repository field is the checkout origin |
| Origin unexpected | Exit with `origin_unexpected` | Running release/GitHub identity tests against another checkout |
| `main` missing | Exit with `main_unavailable` | Skipping Changesets or substituting an arbitrary branch |
| Temporary test home cannot be created securely | Exit nonzero before tests | Reusing the real user home |
| Test subprocess fails | Preserve the Node test exit code | Reclassifying failures as baseline or success |
| Runner receives termination signal | Forward it, clean temporary state, and terminate consistently | Leaving a background suite or credential sandbox behind |
| Cleanup fails after a test failure | Preserve the test failure and add a concise cleanup diagnostic | Replacing the primary failure with an unrelated success |

## Implementation order

1. Perform read-only Git diagnostics and obtain explicit authority for the exact permission repair if required.
2. Restore the ordinary user's safe access to the existing config file; verify Git identity without printing config contents.
3. Add the pure environment module and its unit tests.
4. Add the Git preflight module and synthetic failure tests.
5. Add the runner and package-script wiring.
6. Add the baseline test file to the single exported inventory.
7. Run the focused baseline tests.
8. Run Changesets, synchronization checks, and the ordinary full suite.
9. Stop after PS-00 evidence is green; do not begin PS-01 automatically.

## Verification matrix

| Acceptance criterion | Evidence |
|---|---|
| Unreadable Git metadata fails clearly | Synthetic permission-denied adapter returns `git_config_unreadable`; no raw stderr or content appears |
| The actual checkout is readable | `npm run test:preflight` exits `0` and reports only safe booleans |
| Origin is the intended fork | Preflight validates normalized `github.com/quickstark/skills` |
| Branch, revision, `main`, and worktree are observable | Preflight checks all four before tests |
| Ambient readout values cannot contaminate tests | Unit fixture supplies sentinel values for every stripped prefix and proves absence from the child environment and output |
| Actual producer credentials cannot be auto-discovered | Child `HOME`, `USERPROFILE`, `XDG_CONFIG_HOME`, and `CODEX_HOME` are private temporary roots |
| Browser tests remain runnable from a private test home | The runner resolves and passes only Playwright's installed browser root; actual Chromium portfolio, Settings, and Workbench tests pass |
| Tests can still configure reporting explicitly | A focused child fixture adds test-only reporting values after sanitization and observes them |
| The parent environment is unchanged | Deep equality or selected-value assertions before and after sanitization/runner execution |
| Test inventory is complete and singular | `TEST_FILES` contains the nine exact paths and `package.json` delegates only to the runner |
| Exit behavior is truthful | Spawn fakes cover pass, fail, signal, and cleanup-failure paths |
| Existing generated assets remain stable | `npm run sync:codex` reports no unexpected source changes and `npm run check:codex` passes |
| Changesets can inspect the repository | `npm run changeset -- status` passes |
| Repository baseline is green | Ordinary `npm test` passes with no shell-prefixed environment cleanup |

## Security and privacy

- Never print values of removed environment variables.
- Never read or copy producer credential files from the real home.
- Preserve only Playwright's browser-installation root from the host; do not reuse the host home or cache root generally.
- Create the test home with owner-only permissions and unique paths.
- Never replace `.git/config`, follow a newly introduced symlink as a repair target, or broaden it to group/world write.
- Do not send producer credentials, Git evidence, or test results to the hosted readout service during `npm test` unless a fixture explicitly uses its local fake ingestion server.
- Do not perform remote Git operations in the preflight.
- Keep subprocess arguments free of tokens and raw configuration data.

## Compatibility and migration

- `npm test` remains the documented interface; contributors do not learn a second command.
- Test output remains Node's existing test output because stdio is inherited.
- CI checkouts with readable local config pass the new preflight without permission changes.
- Regular repositories and linked worktrees are supported through Git commands rather than a hardcoded `.git/config` parser.
- Windows uses the same read-only Git checks and temporary environment isolation; permission repair remains operator/platform-specific.
- Existing individual test files remain directly runnable for diagnosis, but only `npm test` is the repository acceptance gate.
- The change requires no version bump or package release by itself unless repository policy separately requires one.

## Rollout and rollback

Roll out PS-00 as one reviewable repository change after the one-time operational permission repair. Record the preflight, Changesets, Codex synchronization, and full-suite results in its completion evidence.

Rollback restores the previous `package.json` test command and removes the three test-support modules plus `tests/qs-test-baseline.test.mjs`. Do not roll back a safe ownership/readability correction to `.git/config`; reintroducing the unreadable state is not part of source rollback.

## Acceptance criteria

- The ordinary user safely reads the existing Git config and Git resolves the intended origin, current branch, revision, `main`, and worktree.
- `npm test` strips ambient host reporting/session/Git-redirection state and uses a private temporary credential home.
- Fixture-owned configuration still works.
- No production readout, Workbench, GitHub, or Changesets behavior changes unless a clean run proves a separate defect.
- No test is skipped, weakened, deleted, or converted to an expected failure.
- `npm run changeset -- status`, `npm run sync:codex`, `npm run check:codex`, and ordinary `npm test` pass.
- PS-01 remains unstarted until all PS-00 evidence is green.

## Open questions

None. The behavior, ownership, failure policy, and acceptance gate are fully specified.
