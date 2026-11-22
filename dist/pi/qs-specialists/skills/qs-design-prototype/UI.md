# UI prototype reference

Use inside the selected prototype root when the question concerns layout, information hierarchy or interaction. Load [LOGIC.md](LOGIC.md) alongside this reference when state/data behavior also matters. Subject and platform selection belong to the root; this is a conditional reference, not another public run.

## Scope and candidates

State one hypothesis, the candidate criteria, a scope/time bound and the permitted prototype location. Make a few materially different candidates (usually three) that answer the same question with the same content and constraints. Different colors alone do not establish different designs.

Default to an isolated prototype directory, standalone page, small native app or disposable checkout using existing tooling appropriate to the question. Reuse safe assets and realistic read-only sample data. An existing production entry point may be changed only when that exact prototype integration is within the user's selected scope; resemblance to the app is not authorization to edit it. Never wire variants to live mutations.

## Compare in context

Recreate the relevant surrounding navigation, density and component conventions in the isolated prototype. Make named candidates easy to compare using an in-app selector, separate preview or another mechanism supported by the actual runtime. Keep keyboard controls usable without intercepting typing or native field navigation. Preserve keyboard, focus and resizing behavior needed to judge the hypothesis; responsive-device checks apply only when the question requires them. Native-only experiments do not require URL routing.

If the selected scope permits a prototype in an existing entry point, leave its data fetching and auth behavior intact, keep the original rendering available, and isolate the experiment behind a development-only guard. Hiding only a switcher is insufficient: the variant rendering itself must not become an accidental production default. Do not alter deployment settings to expose it.

## Evaluate and retain evidence

Use the same observed criteria for every candidate. Report what the prototype demonstrates, which cases remain unproven, and why a direction was chosen. Preserve the variants and discarded alternatives at the selected prototype location with rerunnable instructions and decision evidence.

A selected winner is evidence for later implementation, not permission to promote prototype code. Do not fold it into production, create a release, move work to another branch or delete artifacts automatically. Cleanup is limited to explicitly disposable, run-owned material after its necessary evidence has been preserved; retain pre-existing and unrelated files.
