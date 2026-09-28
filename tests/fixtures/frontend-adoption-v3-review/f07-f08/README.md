# Independent F07/F08 reviews

Each `review-*.json` is an original judgment on one opaque completed reviewer bundle. Reviews bind every bundle file by SHA-256 and byte size, the frozen rubric, and every unique normalized completed tool item by event line and item hash. Tool hashes use Python compact, sorted-key JSON with the default ASCII escaping. Native duplicate notifications and deltas are not extra tool calls.

The reviewer reads the fixed task/common facts, original product files, final product changes, complete tool actions and helper bodies, relevant non-guidance results, response and uniform HTTP observations. Actual wide/narrow images and the listed supplementary state images were opened. No product rerender, model call, source instruction inspection, operator mapping lookup or other reviewer grade calibration is part of this review. These records do not compare variants or authorize adoption.

F07 requests only a reduced-motion repair: inherited narrow overflow and the original nonfocusable div-button remain explicitly documented, distinct from content hidden by a motion repair. F08 expressly requires keyboard submission, labels, focus, validation and a working390px layout; those outcomes are assessed directly. Browser-native/inline validation details and unsuccessful test attempts remain in the individual rationales. Screen-reader speech and other browser engines were not tested. Native process observations cover observed owned processes, not unknowable unsampled processes.

Exact guidance command outputs are suppressed by the inspection helper. Partial guidance chunks are a known export limitation and are not used as evidence of skill identity. Incidental workspace links and response conventions remain visible; no mapping is inferred. Source bundles and raw captures remain unchanged.

`review_inspect.py` and `observations.py` are read-only inspection conveniences. `record.py` binds explicitly supplied human/agent judgments and classifies each inspected tool; it supplies no default grades. `decision.py` formats explicitly supplied F08 criterion results/grades. `verify.py` checks completeness and exact bindings, not visual quality or adoption.

Run the completed-set binding check from the repository root:

```sh
PYTHONDONTWRITEBYTECODE=1 python3 tests/fixtures/frontend-adoption-v3-review/f07-f08/verify.py
```

It requires exactly six F07 and six F08 original records with the exact required criterion sets, five dimension judgments and rationales, opened wide/narrow image references, and complete tool classification. `--partial` reports only the currently bound records and does not claim completion. A failed required check or grade below3 remains a failed review; completing the review set does not turn that result into a pass.
