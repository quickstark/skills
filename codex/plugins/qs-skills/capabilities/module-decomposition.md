# Module decomposition capability

Use only inside a root `qs-plan-spec`, `qs-code-build`, or `qs-review-code` run when module boundaries materially improve the requested specification, implementation, review, or refactor.

- Prefer cohesive responsibilities, narrow public interfaces, and testable seams.
- Identify dependencies, invariants, ownership, and failure boundaries from actual evidence.
- Compare viable decompositions, separate independent work before serializing shared state, and make caller migration part of the boundary design.
- Avoid speculative abstractions and broad rewrites beyond the selected scope.
- Return decisions to the owning root run. Do not emit a separate status, readout, or continuation.
