# Native frontend orchestrator controls

These ten non-model controls exercise the current native frontend runner with the shared executable mock in `../frontend-native-capture/fake-server.mjs`. They never call a model, freeze the canonical experiment, alter a skill, or grade frontend quality.

Run from the repository root:

```sh
node --test tests/fixtures/frontend-adoption-v3-controls/orchestrator.test.mjs
```

The tests read only the five selected native host controls, then start the fixture executable with actual app-server protocol messages. They do not change native settings or invent successful runtime acceptance. The dependency test creates a separate temporary Git repository with exact runner, adapter, original frozen inputs, relevant predecessor bindings and canonical source copies. It freezes only that temporary experiment. The original 11 tasks, 66 scheduled rows, three repetitions, both variant identities, rubric, assets and contributor bytes must match; candidate and private source hashes must also match the preceding V2 experiment.

The negative controls edit actual isolated dependency, readiness, predecessor, task and canonical-source files, add an unregistered input, and change an executable while preserving its reported version. Verification or launch must reject each alteration before creating launch output. A missing parent declaration also prevents launch. Restoring bytes recovers verification; an already frozen experiment cannot be overwritten.

F10 tests read the actual guidance file through the mock and deliver native command output with the exact `cat -- 'absolute/path'` form. Native user messages and the legitimate context-compaction/review-entry/review-exit metadata are allowed; opaque function-call output remains a tool violation. Actual image-generation/view, dynamic-tool and unknown-tool events remain violations even when the guidance read succeeded. Alternative paths, missing `--`, command chaining and output redirects cannot qualify as exact guidance reads.

The reviewer control exports an actual native capture with Unicode command deltas and a real raster file named by `imageGeneration.savedPath`. It compares exported PNG bytes against that file, preserves the raw normalized and native protocol bytes, and verifies context and per-field redaction hashes. A separate control keeps agent-response and unrelated product-output quotations unchanged while redacting only attributable guidance command output and its native duplicates. Partial guidance chunks are deliberately retained as a declared blinding limitation. The fixture PNG proves file transport, not image quality or a production model-generated result.

Pair controls wait for both partners after one rejects, and interrupt two actual native fixture processes before permitting another pair. Both captures retain protocol evidence, settle and report no observed owned residual processes; their leader PIDs must be absent. The separate native adapter suite covers detached-child cleanup. Neither suite proves that an unobserved process could never escape between samples.

Four passes completed:

1. Scope and invariants: checked the unchanged task/rubric/schedule/source contract, bounded ownership, native event schema and exact F10 allowance before implementation.
2. Implementation: added real protocol/temporary-repository controls and source-bound artifact checks. The first run correctly rejected the mock's `cat path` command; its owner repaired it to the exact contract, without relaxing the runner.
3. Review and simplification: shared one native mock, kept authority gates before effects, and reported unrestricted recursive redaction. The parent restricted redaction to exact guidance-command IDs; the negative quotation control verifies that repair.
4. Verification: exercised real corruption, native tool violations, raw-evidence preservation and paired interruption; then reran both gate groups against final executable/readiness bindings. Parent review remains independent.

`evidence.json` records exact reviewed source hashes, local test logs and retained temporary capture locations. `initial-failure.log` preserves the mock mismatch; later logs record its correction. These controls support infrastructure readiness only. They do not authorize a model launch, certify visual adoption, prove perfect blinding, or compare timing/efficiency across protocol versions.
