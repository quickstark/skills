# Read-only native frontend aggregation

`aggregate.mjs` verifies the fixed native 66-row comparison after independent reviews finish. It is a fixture-scoped utility, not a new production command or an adoption decision. During preparation only synthetic temporary captures were aggregated. The real operator mapping, review grades and comparison results were not inspected.

The parent must explicitly authorize final aggregation and supply the independently retained frozen plan digest and independent reviewer identity allowlist. An absent authorization returns `incomplete/unverified` before opening the mapping or run. The exact mapping file must belong to the frozen fixture; its labels remain opaque in the output, with original variant IDs retained.

```js
import { verifyAndSummarize } from './aggregate.mjs';
const report = await verifyAndSummarize({
  fixtureRoot: '/absolute/frozen/native-fixture',
  runRoot: '/absolute/completed/native-run',
  reviewFiles: ['/absolute/independent/review-opaque.json'], // all 66 exact reviews
  operatorMappingPath: '/absolute/frozen/native-fixture/operator-mapping.json',
  expectedPlanSHA256: '<independently retained frozen plan SHA256>',
  reviewerIdentities: ['<independent review author identity>'],
  finalAggregationAuthorized: true,
});
```

For a parent-approved final call, put those fields in an input JSON and run:

```sh
node tests/fixtures/frontend-adoption-v3-aggregation/aggregate.mjs --final-aggregation-authorized /absolute/inputs.json
```

The utility writes JSON only to stdout. It performs no model call, source edit, package installation, retry, repair, grading or publication. Dependencies are Node, Python 3, and the already installed Pillow decoder. Missing decoding/serialization capabilities remain unverified. Image reads are bounded to 32 MiB, decoding to 40 million pixels; evidence files and inventories also have explicit bounds. Links and unsafe paths are rejected.

Verification covers the exact frozen input inventory, 11 cases, three paired repetitions, 66 unique rows and opaque IDs; run/attempt summaries; native completion, host controls, raw stdout/protocol/events and token usage; guidance source identity and bytes; before/after artifacts; uniform HTTP transfer and actual viewport images; full independent review manifest hash **and size**; exact required-check sets without duplicates; numeric 0–4 grades and the existing floor; rationale-bearing `not-applicable` dimensions consistent across matched rows; and every tool classification bound to its exact reviewed normalized item, line and digest. Raw native messages are replayed with the exact frozen adapter and must reconstruct the captured normalized stream. Unsupported tool evidence cannot disappear behind a `nativeStreamComplete` boolean.

Reviewer item and bundle digests use the reviewers' confirmed Python `json.dumps(value, sort_keys=True, separators=(',', ':'))` encoding, including default `ensure_ascii=True`. Native/normalized duplicates are not extra image calls. Each reviewed tool must explicitly classify image-generation and publication semantics; unresolved wrapper/function/MCP semantics fail. Named native image IDs and independently reviewed image-call IDs remain separately visible. Required generated image files must be bound to actual tool events, decode successfully and appear in the independent review's opened-image list; positive grades cannot replace absent images.

Original reviews and grades remain unchanged in the output, including below-floor or failed-check results. Validly bound grades are tabulated by case, repetition and opaque variant. Aggregate quality is the mean of all applicable dimension observations; the same applicability and balanced repetitions are required. The original aggregate rule is included verbatim. The parent must interpret the frozen labels and compare candidate against baseline; there is no new margin, resampling rule or automatic adoption. All-non-applicable, mixed applicability, partial, stale or failed evidence produces `incomplete/unverified`. Fully verified evidence produces only `evidence-complete-review-required`.

Native input/output/cached-input totals, total-token observations, image-call identities and instruction-source UTF-8 bytes are reported separately. Cached input is not added again to input totals. Source instruction bytes exclude the guidance wrapper; full supplied guidance bytes are separately recorded. Neither is a token count. Native tokens include host overhead. Medians and totals are descriptive observations, not a skill-only token saving, causal, latency or cost claim. No previous protocol's trials are pooled.

Controls:

```sh
node --test tests/fixtures/frontend-adoption-v3-aggregation/aggregate.test.mjs
```

The synthetic fixture creates 66 tiny, explicitly fabricated test captures under `/tmp`; it never claims they are real model or acceptance evidence. Negative controls alter actual files, review records, token/native records, item digests, image bytes, HTTP copies and applicability. Initial and final logs are retained beside this README.

Four passes: (1) read only the frozen rubric and review schema/serialization definitions, preserving blinding; (2) implement bounded read-only evidence joins with a synthetic full matrix; (3) review source/host/native/image/grade boundaries and simplify around the existing frozen transcript adapter; (4) execute positive and deliberately corrupted controls and record exact source bindings. Parent review and real final aggregation remain separate and unperformed.
