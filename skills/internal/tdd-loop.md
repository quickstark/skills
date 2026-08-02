# Test-driven development capability

Use only inside a root `qs-code-build` run when the requested behavior has a stable, meaningful test seam.

- Red: add one focused test that fails for the intended reason.
- Green: implement the smallest behavior that satisfies the test.
- Refactor: improve structure while the focused test remains green.
- For existing code, add characterization coverage before mutation when behavior is insufficiently protected.
- When test-first work is impractical, record and perform a credible alternative validation strategy; never manufacture a failing test.
- Return all evidence to the owning root run. Do not emit a separate status, readout, or continuation.
