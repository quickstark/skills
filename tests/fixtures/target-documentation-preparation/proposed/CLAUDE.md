# QuickStark skill collection

The target consists of six QS packages and 38 public commands: core 12,
specialists 8, advanced 12, frontend 4, video 1 and execution 1. Core and
specialist names and membership are retained. Catalog membership is authoritative;
the total is a checked consequence, not a policy cap.

Reference material under `skills/misc/`, `skills/personal/`, `skills/in-progress/`
and `skills/deprecated/` is never promoted or packaged by implication.

## Source of truth

Collection catalogs are `scripts/qs-skill-catalog.mjs`,
`scripts/advanced-skill-catalog.mjs`, `scripts/frontend-skill-catalog.mjs`,
`scripts/video-skill-catalog.mjs` and `scripts/execution-skill-catalog.mjs`.
`scripts/skill-collection-registry.mjs` owns active identity and exact host literals.
The PS catalog preserves original identities and dispositions for provenance and
migration; it does not create QS aliases. Add or rename a root in its catalog first.

Every public command has matching canonical `SKILL.md`, display metadata, exact
package prompt, generated page and source-synchronized projection in its owning
package for each generated host. Packages include their own private closure.
Preserve all 21 video modules and the complete execution module/dependency index.
Preserve original versus derived hashes, source revisions, notices, stable migration
IDs and many-to-one provenance mappings when adapting content.

Explicit-only canonical, Claude and Pi metadata retain
`disable-model-invocation: true` and `policy.allow_implicit_invocation: false`.
Generated Codex projections omit those markers only in the existing projector
compatibility exception. Never weaken canonical policy to repair host discovery.

## Packages and installation

Fresh selection is core only. Ordinary update uses saved selection; optional
packages require explicit selection and accepted replacement evidence. A known
package, helper reference or source directory does not authorize installation.
Target native transactions support Codex and Pi only. Generated Claude packaging
does not establish a supported Claude transaction adapter.

Retain the PS 3.8.0 transition artifact, its marked marketplace visibility and exact
recorded payload while old registrations need observation and safe withdrawal.
It is excluded from target selection and active-version synchronization. Do not
regenerate, remove or rename it as if it were a current QS package.

Codex, Claude and Pi package snapshots and generated documentation are outputs.
Never edit them independently. Root package and lockfile versions must match all
active generated manifests. After source/catalog/documentation/plugin changes run:

```bash
npm run sync:codex
npm run check:codex
npm test
```

When Claude is available, validate `.`, `packages/qs-specialists`,
`packages/qs-advanced`, `packages/qs-frontend`, `packages/qs-video` and
`packages/qs-execution` using `claude plugin validate <root> --strict`.
Packaging validation is separate from native install/migration acceptance.

The current Changesets workflow versions the root and tags; it does not run the
required projection synchronization after versioning. Before any intended release,
regenerate all active versioned outputs and run required checks. Do not infer
publication, installed-host rollout or acceptance from a queued command or a tag.

## Root-run contract

`skills/engineering/qs-help/SKILL.md` is the target collection router. The retained PS Help source is historical compatibility material, not a target alias. `docs/skill-run-contract.md` owns shared execution and presentation policy.

Every invocation has one public root and one bounded result presented directly in chat. Public skills never automatically execute other public skills. A user-submitted explicit goal workflow may coordinate successive authorized roots under the narrow exception in docs/skill-run-contract.md; generation alone never executes it. Internal capabilities and bounded helpers remain inside the root run and do not produce their own result, status, skill-used entry, or continuation.

`effort=quick|standard|deep` controls evidence depth and defaults to `standard`. `report=brief|full` independently controls presentation and defaults to `brief`. Effort never expands mutation scope or authorizes publication.

Completion is one of `complete`, `continuation-required`, `input-required`, or `failed`. Tracked engineering results always include a compact `Work summary:` with `Finished —` and `Next —`; completion of the current root does not prove that the larger project is complete. A non-release result always shows `Next work prompt:` and emits at most one fenced copy-ready prompt for a verified actionable item that remains. Prompts name the exact ticket, specification, issue, or grouped work item they advance; they never prescribe a repeat review or validation without new evidence. Failed results promote a safe recovery route and exclude publication-only routes when the catalog defines them. `qs-deploy-release` is terminal and emits none. Failed required checks and actionable P0/P1 findings prohibit complete.

Every public `SKILL.md` ends with `## Completion report and next steps`. Shared text is generated by `scripts/sync-skill-output-contracts.mjs`; concise documentation is generated by `scripts/sync-v3-docs.mjs`.

## Chat results

Every public result applies the internal clear-writing pass before it is shown: lead with the outcome, use concrete language, preserve necessary qualifications, and remove repetition. Present the result in the current conversation without a secondary artifact or external URL.

## Upstream and activation evidence

`origin` is the personal fork at `https://github.com/quickstark/skills`.
`upstream` is the read-only reference at `https://github.com/mattpocock/skills`.
Preserve all recorded MIT/Apache notices, including Matt Pocock and Lauren Tan.
Push personalized changes only to `origin` when authorized.

Source-body presence, generated projection success, behavior trials, runtime checks
and installed-host acceptance prove different things. Keep unverified source/package
acceptance explicit until independently verified. Documentation preparation never
activates the registry.
