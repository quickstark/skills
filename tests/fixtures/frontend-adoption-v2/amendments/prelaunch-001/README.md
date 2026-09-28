# Revised frontend comparison — file guidance

This is a separate comparison prepared after the original experiment stopped at
10 of 66 rows following a required F01 candidate failure. The original frozen
inputs, raw runs, reviews and failure evidence remain in
`../frontend-adoption/closed-comparison`; no results are pooled or replaced.

The limited F02 diagnostic used a guidance file and read exactly that file without
reading Handoff; the product remained unchanged. Both earlier F02 pasted-body runs
read Handoff. This suggests presentation sensitivity. It does not establish a
cause, solve every read-only formatter limitation, or establish adoption.

## Fixed comparison

`scenarios.json`, `common-scope.json`, `schedule.json`, `rubric.json`,
`operator-mapping.json`, browser observer and input assets are byte-identical to
the original fixture. Seven original contributor source snapshots remain exact.
The four current parent-approved candidate roots and nine actual private bodies
are copied verbatim with source hashes. Root and brief brand corrections and
three image-root final-newline normalizations are deliberate candidate revisions.

All 11 cases use three repetitions and both variants: 66 scheduled rows. Adjacent
schedule entries form one case/repetition pair. Two isolated workspaces run
concurrently; both settle before the next pair starts. The pair sequence remains
fixed and actual start times are recorded. Both variants use the same concurrency.
No latency, cost, source-word-count efficiency or transport-causation claim will
be made from this experiment. The unchanged historical rubric's source-size
comparison note does not authorize an efficiency adoption claim here.

Both variants receive one `trial-guidance.md` file. User text identifies its exact
path and read command without pasting instruction bodies. Selected source bodies
are embedded unchanged. The reference map identifies actual embedded private
sections and marks unselected references inapplicable. Relative links in copied
Markdown are labels, never an invitation to search installed skills or traverse
outside the workspace. Neither variant may read another public skill body.

F10 is prompt-only after reading guidance. Its **only** tool exception is the exact
`cat -- <bound absolute guidance path>` command, optionally wrapped by the host's
normal shell. Product reads, edits, execution, images and all other tools remain
forbidden. A live raw-event watcher and final snapshots detect violations; this
is post-dispatch observation, not a prevention sandbox. Audit/prompt-only product
mutation fails even if the tool stream omits the change. The actual instruction
read must finish successfully and return the complete bound body.

## Preparation and parent-owned execution

Preparation tests use executable fixtures with actual file reads/writes and
actual owned child processes, without model calls:

```sh
node --test tests/fixtures/frontend-adoption-v2/harness.test.mjs
node scripts/frontend-adoption-v2.mjs verify
```

The parent separately reviews the frozen `plan.json` and launches **one** supervisor
with the unchanged inherited model/reasoning defaults:

```sh
FRONTEND_BROWSER=/home/djn12313/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell FRONTEND_PUPPETEER=/tmp/qs-hf-probe/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js node scripts/frontend-adoption-v2.mjs compare /tmp/qs-frontend-comparison-v2-20260925 --parent-approved
```

The output directory must not exist. No takeover, retries, replacement trials or
resume are automatic. SIGINT/SIGTERM stops both registered identity-checked process
groups, awaits their cleanup, records interrupted results, and does not start the
next pair. Hard-kill/system failure may leave incomplete raw captures; it cannot
produce a complete run summary. Raw process records identify each leader and
observed descendants. The inherited helper cannot prove absence of a process
that detached and reparented between observations. Unknown cleanup is a failure.

The frozen plan binds the runner, original capture helper, host defaults, complete
input file inventory, source hashes, schedule, rubric and previous raw archive.
Each trial binds the plan hash and actual guidance hash. A changed source, input,
runner or configured host blocks execution. CLI version inspection during freeze
is not a model run.

## Reviewer evidence and limits

Pass only an opaque `reviewer-bundles/review-...` folder to an independent reviewer;
keep `reviewer-map.json`, raw trial folders and source maps operator-side. Exports
retain actual response, product files, browser outputs, tool commands and other
tool output. They omit the copied guidance file and replace only the exact bound
guidance body occurring in tool output. Other text in that output remains. The
redaction manifest records the original raw-events hash, physical event line,
field, original/redacted field hashes, guidance hash and source-body hashes.
Malformed and unmodified event lines remain unchanged. Raw captures are never
redacted. Truncated/partial guidance output is left visible and qualifies blinding;
a failed complete guidance-read check fails capture. Response/root names and
incidental references may reveal a variant, so blinding is partial.

`IMAGES.md` embeds actual retained raster files using absolute local paths. Browser
screenshots and workspace images are copied as bytes. Bounded regular raster files
actually named in completed image-tool result fields are copied by content hash;
`tool-images.json` preserves original path and event attribution. Remote, inline,
unknown or missing tool outputs remain unverified and need independent inspection
of raw evidence. Agent claims or image prompts do not become generated images.
Named image-call counting is a lower bound; inspect indirect/unknown tools too.

Capture success is not an adoption grade. Independent review must apply every
required behavioral check and the unchanged visual-quality floor to actual
responses, interactions and images, including controls' computed brand styles.
Missing browser/image evidence and a required failure must remain visible. The
complete 66-row comparison, review and any adoption decision are parent-owned work
that starts only after preparation review.
