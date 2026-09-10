# Domain modeling capability

Use only inside a root `qs-plan-clarify`, `qs-plan-spec`, or `qs-review-code` run when unclear concepts or inconsistent vocabulary materially affect the requested outcome.

- Inspect existing code, docs, schemas, and user language before proposing terms.
- Define concepts by observable responsibility, identity, lifecycle, and relationships.
- Model valid and invalid states, ownership, transitions, and invariants before naming modules or transport shapes.
- Reuse established project language unless changing it resolves a demonstrated ambiguity.
- Return findings to the owning root run. Do not emit a separate status, result, or continuation.

<!-- qs-progress:start -->
## Progress reporting

Contribute stage status and verification evidence to the parent skill's conversation checklist. Report the current stage, observed progress or waiting state, and any required user input to the parent during long operations, aiming for updates within sixty seconds when the host allows control to return. Distinguish running from confirmed progress; elapsed time alone is not evidence.

Supply relevant artifacts, command results, sources, or observable behavior before the parent checks off a stage. Identify failed checks, skipped work and reasons, blockers, and later evidence that requires reopening a verified stage. Supply findings or changes, passed and failed checks, and remaining work for the parent's final explanation. Never imply configuration in a read-only run. Do not create a separate checklist, completion report, skills-used entry, or continuation. Remain inside the public root regardless of effort or report mode.
<!-- qs-progress:end -->
