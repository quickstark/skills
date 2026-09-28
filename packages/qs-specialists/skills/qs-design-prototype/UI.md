# UI prototype reference

Use inside the selected prototype root when the question concerns layout, information hierarchy or interaction. For state/data behavior, use [LOGIC.md](LOGIC.md) instead; this is a conditional reference, not another public run.

## Scope and candidates

State one hypothesis, the candidate criteria, a scope/time bound and the permitted prototype location. Make a few materially different candidates (usually three) that answer the same question with the same content and constraints. Different colors alone do not establish different designs.

Default to an isolated prototype directory, standalone page or disposable checkout using existing tooling. Reuse safe assets and realistic read-only sample data. An existing production route may be changed only when that exact prototype integration is within the user's selected scope; resemblance to the app is not authorization to edit it. Never wire variants to live mutations.

## Compare in context

Recreate the relevant surrounding navigation, density and component conventions in the isolated prototype. Expose one switcher with named candidates; a `?variant=` parameter can make the selection reload-stable when supported. Keep keyboard controls usable without intercepting typing or native field navigation. Preserve responsive, keyboard and focus behavior needed to judge the hypothesis.

If the selected scope permits an existing-route prototype, leave its data fetching and auth behavior intact, keep the original rendering available, and isolate the experiment behind a development-only guard. Hiding only a switcher is insufficient: the variant rendering itself must not become an accidental production default. Do not alter deployment settings to expose it.

## Evaluate and retain evidence

Use the same observed criteria for every candidate. Report what the prototype demonstrates, which cases remain unproven, and why a direction was chosen. Preserve the variants and discarded alternatives at the selected prototype location with rerunnable instructions and decision evidence.

A selected winner is evidence for later implementation, not permission to promote prototype code. Do not fold it into production, create a release, move work to another branch or delete artifacts automatically. Cleanup is limited to explicitly disposable, run-owned material after its necessary evidence has been preserved; retain pre-existing and unrelated files.
