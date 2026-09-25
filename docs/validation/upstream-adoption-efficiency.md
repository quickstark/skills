# Upstream adoption: instruction-efficiency experiment

**Decision:** retain the post-Group-A reporting instructions. The compression
comparison is inconclusive; no efficiency, latency, cost or quality improvement is
claimed. This is the retained-baseline outcome permitted by
[Group B of the specification](../specs/quickstark-upstream-adoption.md).

The experiment compared complete post-A instructions with a compressed candidate
using a frozen workload of 37 scenarios, three repetitions and two variants
(222 scheduled responses). It recorded 45 completed responses: 23 baseline and
22 candidate. The interrupted 46th run produced no completed response or token
telemetry. These incomplete repetitions cannot establish baseline variability,
matched workload medians or candidate acceptance.

The existing reporting text remains in the generator and canonical skills.
Registry parameterization for the new package identities is a separate functional
change; it does not adopt the experimental compressed text. Group A's verified
clarity fixes remain independent of this decision.

## Evidence and limitations

The [frozen inputs and schedule](../../tests/fixtures/upstream-adoption-efficiency/plan.json),
[raw comparison records](../../tests/fixtures/upstream-adoption-efficiency/comparison),
and [closure receipt](../../tests/fixtures/upstream-adoption-efficiency/comparison/inconclusive-retained-baseline.json)
retain actual responses, source/prompt bindings, process evidence and token
observations. Runtime input-token totals include opaque host context; they are
not isolated skill-instruction costs. Configured model identity is recorded
separately from unverified effective runtime identity. Source bytes and word counts
do not substitute for measured instruction tokens.

An initial process-visibility error let a duplicate supervisor overwrite recovery
state. Its 134 initialization failures are preserved in the
[incident archive](../../tests/fixtures/upstream-adoption-efficiency/comparison-namespace-incident-20260925).
The recorded amendment allowed one corrected initialization for affected rows;
it did not replace semantic failures. The resumed supervisor then ended during
helper handoff. The interrupted row had exhausted that amendment's allowance,
so the comparison was closed and the baseline retained. Remaining scheduled
trials were not run. The abandoned full-comparison gate is not a passed trial.

An independent reviewer evaluated a partial batch of 20 baseline responses.
The exporter initially omitted common facts that responders had received. The
[effective review index](../../tests/fixtures/upstream-adoption-efficiency-review/baseline/index.json)
binds an append-only correction using the exact missing context and excludes the
retained preliminary ratings from aggregation. Effective ratings contain 18
passes, two failures and 210/240 quality points. One failure concerns ambiguous
rubric wording about a clarification prompt; another unnecessarily blocks on
goal-state evidence already supplied. These partial ratings neither establish
baseline variance nor justify adopting the candidate.

Any future compression experiment needs a fresh declared comparison, complete
reviewer context and a supervisor whose lifetime covers capture. It must retain
this experiment's failures and use new evidence before claiming an improvement.
