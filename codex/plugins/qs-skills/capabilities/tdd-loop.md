# Test-driven development capability

Use only inside a root `qs-code-build` run when the requested behavior has a stable, meaningful test seam.

- Red: add one focused test that fails for the intended reason.
- Green: implement the smallest behavior that satisfies the test.
- Refactor: improve structure while the focused test remains green.
- Prefer proof through the real public seam or produced artifact over assertions coupled only to implementation details.
- For existing code, add characterization coverage before mutation when behavior is insufficiently protected.
- When test-first work is impractical, record and perform a credible alternative validation strategy; never manufacture a failing test.
- Return all evidence to the owning root run. Do not emit a separate status, result, or continuation.

<!-- qs-progress:start -->
## Progress reporting

Contribute stage status and verification evidence to the parent skill's conversation checklist. Report the current stage, observed progress or waiting state, and any required user input to the parent during long operations, aiming for updates within sixty seconds when the host allows control to return. Distinguish running from confirmed progress; elapsed time alone is not evidence.

Supply relevant artifacts, command results, sources, or observable behavior before the parent checks off a stage. Identify failed checks, skipped work and reasons, blockers, and later evidence that requires reopening a verified stage. Supply findings or changes, passed and failed checks, and remaining work for the parent's final explanation. Never imply configuration in a read-only run. Do not create a separate checklist, completion report, skills-used entry, or continuation. Remain inside the public root regardless of effort or report mode.
<!-- qs-progress:end -->
