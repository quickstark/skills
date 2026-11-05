# Prototype platform guidance review

**Specification:** [Web and native macOS guidance](../specs/quickstark-prototype-platform-guidance.md).
**Date:** November 5, 2026.
**Scope:** One existing `qs-design-prototype` root, subject/platform references, documentation, focused tests and instruction-trial evidence. This is a scoped source/integration review, not a publication, installed-host rollout or native Mac runtime receipt.

## Source and provenance boundary

The shared experiment workflow and UI/Logic references retain their recorded upstream adaptations and authority. `WEB.md` and `MACOS.md` are newly authored local guidance; no upstream byte identity or new upstream revision is claimed. Only the prototype target's current derived instruction digest changes in provenance. Historical source mappings, adoption revisions and decisions remain intact.

The documentation notes live in the existing catalog metadata; membership, identities, invocation policy, continuations and model guidance are unchanged. Catalog notes are copied into shared package support files, so their generated copies change across packages even though the new private references belong only to `qs-specialists`.

The acceptance audit's existing upstream-adoption AC identifiers retain their original meanings. Refresh only source/evidence bindings affected by these reviewed changes: the prototype directory, its derived provenance record, the catalog, generated packages, and the modified focused-test evidence. Preserve the existing installer/release review and all unrelated bindings. A refreshed content binding does not assert that an old recorded trial exercised the new platform guidance.

## Review and checks

- Independent read-only standards/spec review found no actionable source finding. It checked the canonical root, four references, catalog notes, trial runner/cases, focused tests and derived provenance change against this specification.
- The new reference/package test was observed failing before implementation because `WEB.md` and `MACOS.md` were missing from the root's conditional references.
- After implementation and generation, 39 focused upstream/registry/provenance tests passed, including all-host private-reference parity and trial-envelope/rubric controls.
- `npm run sync:codex` and `npm run check:codex` passed for the generated documentation, 39-command catalog, three-host projections and provenance.
- Before this implementation, the previously failing acceptance-evidence suite passed 10/10 and the linked-Pi-settings installer case passed 1/1 with the preserved installer changes. Later full-suite results must be reported independently.

## Instruction trials

The [scenarios and runner contract](../../tests/fixtures/prototype-platform/README.md) cover AC-03 through AC-12. Source/reference closure and repository checks cover AC-01, AC-02 and AC-13. Actual fixture instructions, observations, selected references, responses, telemetry and hashes are retained per run.

`run-01` failed before model startup because the default Codex session-state directory was read-only in the sandbox. It produced no model responses and supplies no behavioral acceptance. The failed attempt is preserved. `run-02` uses normal session-state access with unchanged model settings and fresh ephemeral contexts; it is a separate attempt, not a rewritten result.

**Semantic review:** [Independent review](../../tests/fixtures/prototype-platform/review-run-02.json) passed all 14 cases, with no failures or pending cases. All 28 rounds completed without tool calls or transport anomalies. Review verified the exact source/reference bindings, requested references, scenario inputs, response/prompt hashes, and all 200 artifacts in the capture manifest. Current instruction bytes still match the frozen sources; no source drift occurred. The capture manifest excludes itself, and its SHA-256 is `a07fb50e82d480ae9a96a99967c97919030c095a2a1e6ea747652a3f80a88697`.

| Criteria | Evidence |
| --- | --- |
| AC-01, AC-02 | Registry checks retain 39 public commands and one prototype root; all-host reference tests verify all four private files against canonical content. |
| AC-03, AC-04 | `web-layout-on-mac` and `native-menu-focus` select the relevant browser/native runtime and evidence. |
| AC-05, AC-06 | `native-ui-and-logic` combines both subjects in a native experiment; `independent-logic` uses a lightweight existing harness. |
| AC-07, AC-08 | `mac-concept-in-browser` limits fidelity claims; `missing-native-runtime` preserves useful source work without inventing native observations. |
| AC-09 | `hybrid-browser-content` and `hybrid-native-integration` select the disputed surface while preserving Electron. |
| AC-10 | Layout, interaction, native and logic cases use consistent criteria and proportional evidence without mandatory frameworks/device matrices. |
| AC-11 | `source-only`, `build-only`, `screenshot-only` and `failed-required-check` keep unsupported success/completion claims unproven. |
| AC-12 | `authority-and-retention` rejects helper-driven promotion, dependency/live/tracker/publication changes and unrelated cleanup while retaining evidence. |
| AC-13 | Generation, projection checks and all six strict Claude package validations passed; repeated generation changed none of 3,493 compared generated files. Full suite passed 711 tests, with no failures and one platform-specific control skipped. |

**Repository integration:** Focused checks, generation/projection checks, all six strict package validations and repeated-generation idempotence passed. `npm test` completed with 712 tests: 711 passed, zero failed, one skipped. The skipped case is the non-Linux unsupported-capture control; Linux capture and cleanup controls passed. The acceptance-evidence and linked-Pi-settings cases both passed in this full run. Existing installer/release changes were preserved; they were not repaired as part of this platform-guidance change.

These are response-only instruction plans/verdicts over synthetic observations. They cannot establish actual browser rendering, native Mac build/run/interaction, installation acceptance, efficiency gains or universal skill compliance. Runtime model identity remains unverified when the CLI does not emit it. No runnable native reference example is shipped or claimed.
