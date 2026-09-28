# Test-driven development capability

Use only inside a root `qs-code-build` run when the requested behavior has a stable, meaningful test seam.

- Red: add one focused test that fails for the intended reason.
- Green: implement the smallest behavior that satisfies the test.
- Refactor: improve structure while the focused test remains green.
- Prefer proof through the real public seam or produced artifact over assertions coupled only to implementation details.
- Derive expectations independently from the behavior contract, not by reusing the implementation's calculation. When a tautological pass is plausible, verify a known-bad control fails for the intended defect; retain legitimate absence, configuration and structural contract tests.
- For existing code, add characterization coverage before mutation when behavior is insufficiently protected.
- When test-first work is impractical, record and perform a credible alternative validation strategy; never manufacture a failing test.
- Return all evidence to the owning root run. Do not emit a separate status, result, or continuation.

<!-- qs-progress:start -->
## Progress reporting

Contribute stage status and verification evidence to the parent skill's conversation checklist. Report the current stage, observed progress or waiting state, and any required user input to the parent during long operations, aiming for updates within sixty seconds when the host allows control to return. Distinguish running from confirmed progress; elapsed time alone is not evidence.

Supply relevant artifacts, command results, sources, or observable behavior before the parent checks off a stage. Identify failed checks, skipped work and reasons, blockers, and later evidence that requires reopening a verified stage. Supply findings or changes, passed and failed checks, and remaining work for the parent's final explanation. Never imply configuration in a read-only run. Do not create a separate checklist, completion report, skills-used entry, or continuation. Remain inside the public root regardless of effort or report mode.

Contribute observed partial work, remaining effort, uncertainty, and revision-bound evidence for the parent's stage and overall estimates. Waiting, elapsed time, token consumption, or a running process alone earns no progress. Flag invalidated evidence so the parent can lower estimates and reopen checks. Preserve valid evidence for resumption; do not count the same work twice or report an independent public percentage. Only the parent computes weighted progress and verifies 100% completion.
<!-- qs-progress:end -->
