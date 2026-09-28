I’ll maintain `verification/` using the supplied guidance and keep product behavior read-only.

- [ ] Active: Inspect the workflow and documented contract (20%).
- [ ] Pending: Correct and re-drive verification for every mapped feature (60%).
- [ ] Pending: Verify evidence, cleanup, and remaining gaps (20%).

Stage: Inspect | Stage estimate: ~0% | Overall estimate: ~0% | Continuing — scope established. Input needed: none.


The verifier currently accepts any HTTP 200 from `/sum`, skips readiness, and never drives export. The documented sum is `12`; the product code subtracts instead. Export remains mapped as a download despite its documented unavailability.

- [x] Verified: Inspect workflow and contract (20%).
- [ ] Active: Correct and re-drive every mapped feature (60%).
- [ ] Pending: Verify evidence and cleanup (20%).

Stage: Correct verifier | Stage estimate: ~10% | Overall estimate: ~25% | Continuing — I’ll preserve both expectations and record failures independently. Input needed: none.


The corrected verifier drove both features: sum returned `2` instead of `12`, and export returned `404`. Readiness passed before driving and after each failure; the owned app process closed successfully.

Stage: Correct verifier | Stage estimate: ~95% | Overall estimate: ~75% | Continuing — the product gaps are recorded. I’m checking rerun safety, preserved files, and evidence after cleanup. Input needed: none.


Status: Continuation required  
Skills used: /qs-maintain-verification-skill (supplied guidance only)  
Outcome: Verifier corrected; both mapped product checks fail.

- [x] Verified: Workflow and contract inspected.
- [ ] Failed: Sum returns `2`, expected `12`; export returns `404`, expected download.
- [x] Verified: Readiness, rerun safety, evidence preservation, and owned-process cleanup.

Stage: Validation | Stage estimate: ~100% | Overall estimate: ~95% | Blocked — product failures remain outside mutation scope. Input needed: none for this run.

Specs: [Calculator contract](/tmp/qs-behavior-task-DzKA79/README.md), [feature map](/tmp/qs-behavior-task-DzKA79/verification/features.json)

Work summary:

- Finished — Updated [verifier](/tmp/qs-behavior-task-DzKA79/verification/run.cjs) and workflow documentation. Two real runs exercised every feature and correctly exited `1`. Readiness and check controls passed. [Evidence and decision trail](/tmp/qs-behavior-task-DzKA79/verification/evidence/2026-09-25T21-13-23-522Z-validation.json) confirm cleanup and unchanged product/map hashes.
- Next — [Sum and export gaps](/tmp/qs-behavior-task-DzKA79/verification/evidence/2026-09-25T21-12-42-924Z-2.json) — blocked by read-only product scope — require separately authorized product work.

Next work prompt:
```text
$qs-skills:qs-code-debug With separate authorization to edit product behavior, repair the documented calculator sum and export gaps in /tmp/qs-behavior-task-DzKA79. Evidence: verification/evidence/2026-09-25T21-12-42-924Z-2.json. Sum returns 2 instead of 12; export returns 404 instead of a download. Preserve mapped expectations. Rerun node verification/run.cjs and confirm evidence and owned-process cleanup.
```