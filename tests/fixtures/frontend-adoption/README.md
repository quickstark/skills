# Frontend adoption trials

This is a frozen behavioral comparison for spec Group C. Eleven realistic cases cover all seven original Taste sources, four local roots, and nine relevant private references. Each case has three matched repetitions per variant (66 task turns). The independent rubric is fixed before the first model pilot. Tests and the pilot do not certify adoption.

`common-scope.json` contains every shared product fact, route, stable ID, behavior, authority limit and brand constraint. The model and reviewer both receive all of it. `scenarios.json` adds the exact request, applicable preservation checks, output type and image/time budget. Shared facts are context; they do not expand the requested output. The panel-only overhaul and surface-polish checks do not demand unrelated repairs outside the authorized scope.

The existing museum page deliberately has a missing input label, an unfocusable continuation control, narrow overflow and animation without a reduced-motion override. Real browser controls distinguish those defects from an isolated repaired fixture. They test the observer, not a candidate implementation. The 1280 × 900 supplied reference PNG is a deterministic local HTML render, prepared before the trials. It is not an AI-generated image or an adoption result. F11 receives the PNG only; its source HTML is withheld from the authoring workspace.

The seven original skill bodies are complete snapshots at `e988add20dab0fa97d7a76781c48961c8184288e`; the later reviewed revision is recorded separately. Whole candidate roots, including their completion contracts, and only scenario-relevant private reference bodies are supplied. References are preloaded, so these trials cannot establish a demand-loading improvement. `sources/index.json` separates original, current candidate and private resource hashes. Verification rejects drift in frozen files or their live candidate bindings.

Run harness checks with existing runtime paths; no downloads or installs occur:

```sh
FRONTEND_BROWSER=/home/djn12313/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell \
FRONTEND_PUPPETEER=/tmp/qs-hf-probe/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js \
node --test tests/fixtures/frontend-adoption/harness.test.mjs
```

After freeze, verify without invoking a model:

```sh
node scripts/frontend-adoption-trials.mjs verify
```

The preparation agent may execute only the predeclared F10/v84 prompt-only pilot, once. Its exclusive attempt marker prevents a second pilot and its output stays outside comparison data. It proves event/response capture only. The parent launches and owns the full comparison process:

```sh
FRONTEND_BROWSER=/home/djn12313/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell \
FRONTEND_PUPPETEER=/tmp/qs-hf-probe/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js \
node scripts/frontend-adoption-trials.mjs compare /tmp/qs-frontend-comparison-20260925
```

`FRONTEND_CODEX` optionally names an existing Codex executable. Defaults remain unchanged: no model, reasoning, sandbox or approval flags are added. Selected non-secret configured defaults and CLI version must match the freeze. Runtime model identity is recorded only when emitted. The complete runtime input/output token telemetry includes host overhead; loaded instruction UTF-8 bytes are a separate measurement, never tokens. No source-size result certifies response quality or runtime efficiency.

Each fresh temporary workspace retains before/after artifacts, raw prompt, event JSONL, stderr, actual response, instruction/context hashes, telemetry, and a reviewer bundle. Implementations receive actual wide/narrow screenshots plus DOM, tab navigation, validation, local form analytics and reduced-motion observations when the explicit browser paths work. Every reviewer bundle contains **all** common facts and actual baseline files, not just the top-level request. The bundle omits instruction bodies and operator mapping; names in raw responses may partially reveal identity. Unknown tool-event classifications and missing image files stay unverified. Reviewers must inspect actual image outputs for F09's count, platform, flow and visual quality; prose or an HTML/SVG substitute does not satisfy it.

The Linux supervisor stops on forbidden prompt-only tools or observed named image-call budget excess. This is detection after an event, not a guarantee that a dispatched operation never ran. It records observed descendants and terminates only processes whose recorded identity still matches; no global orphan cleanup runs. The unchanged host sandbox and task prompt provide scope, not a new isolation boundary. Do not hand off a live helper-owned process.

No automatic retries, replacement samples, model switches or added image budget are permitted. Failed trials remain failures and the schedule continues. A persistent output lock prevents accidental reruns; interruption leaves the comparison incomplete and requires an explicit continuation decision. The runner does not silently take over an old lock. Independent reviewers assign every required check and applicable quality dimension; unverified required outcomes block adoption. No quality scores are generated by the authoring run or harness.
