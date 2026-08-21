# Ticket decomposition capability

Use only inside a root `qs-plan-spec` run when the user requests tickets, the configured tracker requires them, or the work cannot otherwise be assigned safely.

- Produce dependency-ordered slices with one independently verifiable outcome each.
- Include scope, acceptance evidence, dependencies, and explicit exclusions.
- Do not create tracker work for a specification-only request.
- Return ticket artifacts to the owning root run. Do not emit a separate status, result, or continuation.
