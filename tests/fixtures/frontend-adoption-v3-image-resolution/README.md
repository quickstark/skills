# F09 image-resolution diagnosis

The twelve F09 images already arrive below the requested1179×2556 resolution in the native image-generation result. All twelve prompts explicitly request those dimensions. The model-facing image tool in the matching Codex0.153.4 source exposes no numeric size control: generation and editing both send `size: "auto"`. This is a demonstrated client-interface limitation on explicit size selection, **not proof that the provider cannot generate the requested dimensions**, or that different prompt wording could never affect the result.

The original six failed fidelity assessments remain unchanged. Nothing here rescales images, reruns models, changes the rubric, or grants adoption.

## Actual evidence

`observed-images.json` binds all six original captures and twelve image items by raw-protocol path/line/hash, native item ID, exact prompt, output hash/size and actual PNG dimensions. Every prompt contains1179 and2556. The observed dimensions are851×1848,852×1846 or853×1844; none meets1179×2556.

Read-only base64 decoding and full Pillow decoding show that each native result, the tool-managed original saved PNG, capture archive and reviewer-exported PNG are byte-for-byte identical. The resolution loss did not occur during local saving, archive collection, reviewer export or image viewing. This check concerns primary stored pixels, not a UI thumbnail.

The capture adapter copies returned bytes directly at `scripts/frontend-native-capture.mjs:211–223`; reviewer collection does the same at `scripts/frontend-adoption-v3.mjs:205–214`. Their exact hashes are retained with the source provenance. No image-generation HTTP request/response capture is available here, so the outgoing request defaults are established from matching source rather than a network trace.

## Matching interface and source

`source-provenance.json` records the installed executable SHA-256, official release tag `rust-v0.153.4`, resolved commit `3d2ee51ca2d5db578f328aa75e20aa22c0197c9a`, downloaded source URLs/hashes and the Apache license. The executable reports0.153.4 and matches the earlier native capture audit. Matching release source is not a reproducible-build attestation.

- [Tool arguments, lines87–95](https://github.com/openai/codex/blob/3d2ee51ca2d5db578f328aa75e20aa22c0197c9a/codex-rs/ext/image-generation/src/tool.rs#L87): only prompt and two alternative image-reference fields; unknown fields are rejected. There is no model-facing size/quality parameter.
- [Request construction, lines419–429 and469–477](https://github.com/openai/codex/blob/3d2ee51ca2d5db578f328aa75e20aa22c0197c9a/codex-rs/ext/image-generation/src/tool.rs#L419): both generation and editing use auto size, quality and background. A reference-image edit does not expose a separate fixed-size option.
- [Native item creation, lines169–230](https://github.com/openai/codex/blob/3d2ee51ca2d5db578f328aa75e20aa22c0197c9a/codex-rs/ext/image-generation/src/tool.rs#L169): the completed `revisedPrompt` comes directly from the tool argument; it is not evidence of a provider rewrite. The selected response base64 is carried into the native result unchanged.
- [Saving, lines268–383](https://github.com/openai/codex/blob/3d2ee51ca2d5db578f328aa75e20aa22c0197c9a/codex-rs/ext/image-generation/src/tool.rs#L268): base64 is decoded and written, without pixel resizing. This agrees with all twelve actual byte comparisons.
- [Lower-level request types](https://github.com/openai/codex/blob/3d2ee51ca2d5db578f328aa75e20aa22c0197c9a/codex-rs/codex-api/src/images.rs#L5) contain an optional size string, and [the HTTP client](https://github.com/openai/codex/blob/3d2ee51ca2d5db578f328aa75e20aa22c0197c9a/codex-rs/codex-api/src/endpoint/images.rs#L58) serializes it. That establishes a possible integration seam, not an exposed tool option or proof that arbitrary dimensions are accepted by this provider/model/account. The source’s mocked transport test uses1024×1536; it is not a real provider-resolution test.

## Remedy boundary

No demonstrated exact-resolution remedy exists within the current frozen tool interface and consumed two-call budget. Adding a fictitious `size` argument would violate the current schema; repeating the same trial or silently stretching the PNG would not repair the original evidence.

Supported next actions are bounded:

1. Preserve the failures and report requested versus actual pixels. A future image workflow can check returned PNG dimensions before claiming an exact-size deliverable; this diagnosis demonstrates that check without altering images.
2. If exact pixel delivery remains mandatory, separately qualify an image interface that exposes a documented supported size control. The lower-level type supplies a possible implementation seam, but provider acceptance, account support and actual returned pixels require a new explicitly approved capability test. No such test was run here.
3. If native portrait composition is the intended requirement and exact raster dimensions are negotiable, the user can choose a revised requirement for a separate future evaluation. Do not reinterpret or pool the frozen F09 failures.
4. Explicitly authorized resizing could produce a derivative with target dimensions, but cannot add native detail or establish original generator compliance. It was neither performed nor proposed as retrospective acceptance.

Provider-side sizing policy, hidden server transforms and the cause of the narrow851–853px output band remain unobserved. Six trials cannot establish a universal cap. Prompt-level size influence also remains unqualified.

## Verification

From the repository root:

```sh
PYTHONDONTWRITEBYTECODE=1 python3 tests/fixtures/frontend-adoption-v3-image-resolution/verify.py
```

This rechecks source/executable bindings, all original prompt/result records, actual PNG decoding and all four byte-identical copies. It requires twelve preserved target misses. It makes no model, image-generation or network call and writes no images.

Four passes: inspect actual prompts/native image items; compare original/archived/reviewer bytes; trace exact tagged argument/request/save code; challenge the diagnosis against the lower-level size field and separate missing controls from unknown provider capabilities. Parent review is required before choosing any next action.
