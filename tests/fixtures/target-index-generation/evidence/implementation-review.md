# Leaf49 — target lifecycle indexes and historical PS guidance

Implementation and isolated checks are complete. The generator/test bytes are
frozen for parent verification. Parent owns actual target activation, generated
root outputs, required full-suite runs and the leaf48 documentation binding.

## Result and boundaries

`scripts/sync-v3-docs.mjs` is import-safe and exports:

- `renderCommandDocumentation(skill)` for existing concise command-page prefixes.
- `renderTargetIndexDocuments({commands})` for deterministic target indexes.
- `syncV3Documentation({root,check,registryState})` for isolated generation/checking.

The CLI keeps the actual registry state and accepts `--root` plus `--check`.
Default actual state remains legacy. Legacy generation still updates only its
33 concise command pages and preserves the original success messages; it leaves
bucket indexes and historical PS guidance untouched. Target generation includes
38 concise pages and exactly five additional outputs:

- skills/engineering/README.md — 34 public roots.
- skills/productivity/README.md — 3 public roots.
- skills/video/README.md — 1 public root.
- docs/pstack/index.md — historical identity/successor table and provenance.
- docs/pstack/using-ps-skills.md — current successor distinctions and authority.

The three bucket indexes group independently selected packages in lifecycle order.
Only public roots receive canonical SKILL.md links. Private capabilities, bundled
modules, dormant skills and original PS identities are not added to the picker.
Fresh selection defaults to core; optional package presence never authorizes
silent additions. All thirteen original PS names map to exact current roots:
Help to core qs-help; the other twelve to optional qs-advanced. Neither historical
page recommends a fresh PS installation or presents old names as aliases.

Both pages preserve deployment-goal prompting in qs-deploy-prompt, which generates
a goal prompt without executing it, and reusable skill/prompt writing in
qs-skill-write. Both are dedicated specialist roots. Visual parity remains its
own advanced root. Live-vs-artifact diagnosis, create-vs-maintain verification,
measured experiments, immutable visual baselines and exact cleanup authority stay
distinct. Provenance links preserve original names, Lauren Tan/MIT attribution,
the original Pstack snapshot and separate reviewed/adopted records.

The five proposed files are available under
`tests/fixtures/target-index-generation/proposed/` for review. They exactly match
the final generated isolated-target files. No actual root indexes, public skill
bodies, completion contracts, source registry or actual installation was changed
by this leaf. Historical individual PS reference pages remain outside this leaf's
five generated targets; the new guides do not route current selection through them.

## Four passes and meaningful controls

1. Inspected original engineering/productivity indexes, stale PS install/chooser
   guidance, active/target registry, projector entry points and provenance records.
2. Implemented target-only index generation, import-safe/root-selectable helpers,
   source identity and path preflight, and read-only drift checks. Existing
   generated completion tails remain untouched when their concise prefix is valid.
3. Six tests establish independently enumerated 38 names/buckets, all thirteen
   successor rows, exact literals and provenance; reversed input still renders
   lifecycle order. Missing prompt entry, wrong build link, old PS alias, missing
   video index, mismatched source identity, missing source, private/duplicate names,
   wrong paths and source/output symlinks reject. Invalid inputs/check failures
   leave file snapshots unchanged. Legacy sentinel indexes remain byte-identical;
   importing emits no generator output. Parent requested separate prompt-role
   wording; both pages and focused assertions now cover both dedicated roots.
4. Copied only the owned generator/test to the existing isolated target. The first
   actual --check failed on the five stale indexes, demonstrating the original
   gap. Generated only there; final --check and all six target tests pass. Actual
   legacy --check passes. Final runnable G3 reexecutes the same six tests in root.
   All command sessions finish before handback. No full suites or model trials
   were launched by this leaf.

Parent already registered the exact line
`"tests/target-index-generation.test.mjs",` in TEST_FILES. No registration edit
was made by this leaf. Parent independent gate/full-suite review remains required.

## Bound final implementation

- `scripts/sync-v3-docs.mjs`: `e157c60a87645782b4e630031a0a84417cc394592876f7a13fd71cd4009dfe16`
- `tests/target-index-generation.test.mjs`: `950cb47eebad582dad7d98cbe681528e266e5b92534b76dbbc0aea4953d3d255`

## Isolated execution logs

- `/tmp/qs-leaf49-target-stale-check.log`: `0b861e7ca28fd6b01e2d5590c9644946c58558e32c7a26d2850f1b9722c15c89`
- `/tmp/qs-leaf49-target-sync.log`: `f01b935f41a34b7f3644f8fe566a06582b61f26d32fb4a060d69fecb2b18e93d`
- `/tmp/qs-leaf49-target-final-sync.log`: `4536e9b226a25c97da14217f4e2299e1f9ba25a7d2aa1d80df2ded58b7aad440`
- `/tmp/qs-leaf49-target-final-check.log`: `0798c5be9a330818c4ce1204441fa2b4ebd7b5609215740aca04effd7f37cdf0`
- `/tmp/qs-leaf49-target-final-tests.log`: `aad61754091c1e930a8d85808c081337a713bffc12f124f026e613513476d93b`
- `/tmp/qs-leaf49-legacy-final-check.log`: `e05297b8349c8e8c9b1fbb07bc38478e948240dd83b86393a475d61a220f40ba`

Final target tests: six passed, zero failed/skipped; final target check reports 38 commands and 5 indexes. Final legacy check reports 33 commands. Proposed and generated target index bytes were compared directly and match.
