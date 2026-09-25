- [ ] Active — Plan one bounded observation from the supplied facts (weight: 100%).

Stage: Observation plan | Stage estimate: ~0% | Overall estimate: ~0% | Active — Using the supplied runtime-forensics guidance; scope is diagnosis advice only. Input needed: none for planning.

Status: Complete — observation planning only.  
Skills used: Supplied `/qs-runtime-forensics` guidance; no public skill invoked.  
Outcome: Plan prepared. Writer overlap correlates with increased request p95; the causal mechanism remains unknown.  
Specs: Not located

- [x] Verified — Observation plan checked against supplied facts and diagnosis-only authority.

Stage: Observation plan | Stage estimate: ~100% | Overall estimate: ~100% | Complete — Advice finished; live diagnosis remains blocked. Input needed: trace owner and explicit target, time-window, and read-access authorization before collection.

The next observation should compare request latency and writer activity using **existing telemetry**, after an authorized owner confirms its availability and access scope.

1. **Bound the capture:** Propose a maximum 15-minute window observing naturally occurring writer activity. Compare non-overlap → overlap → non-overlap periods; record their actual order and duration. Do not start writers, attach profilers, or change instrumentation.
2. **Define the evidence:** One sample means one completed request in the same endpoint/workload cohort. Record sample counts, p95, request rate, error rate, and writer overlap timing for each period. Use equivalent aggregation methods; flag sparse or unmatched periods as inconclusive.
3. **Discriminate between explanations:** If existing telemetry provides request-level waits, check whether added latency coincides with lock waits, connection-pool waits, or CPU/I/O pressure. Also compare request mix and arrival rate. Lock waits support contention; resource pressure supports capacity competition; workload changes weaken attribution to writer overlap. Missing wait telemetry cannot falsify contention.
4. **Preserve provenance:** Record capture identity, environment, observed build/source revision, collection method, and timestamps. Environment, revision, numeric baseline, and historical symptom window are currently unspecified. Mark unavailable identities unknown. Retain only redacted diagnostic fields.

Stop at the window limit. If comparable periods or discriminating telemetry are unavailable, report the evidence gap. Any new instrumentation or process access needs separate authorization. No mechanism should be declared solely from overlapping writers and elevated p95.

Work summary:

- Finished — Produced a bounded comparison plan and checked its scope against the supplied observations. No tools, runtime checks, configuration changes, or artifacts.
- Next — Writer-overlap observation — blocked — identify the trace owner and obtain explicit collection scope; no tracker or linked work item was supplied.

Next work prompt:
```text
$qs-skills:qs-flow-handoff
Preserve the blocked writer-overlap observation boundary: request p95 rises only when two writers overlap; causality and trace ownership are unknown. Diagnosis advice alone is authorized. Carry forward the proposed bounded comparison using existing telemetry. Identify the owner and obtain explicit target, time-window, and read-access authorization before collection. Do not collect data, instrument processes, repair code, or invent revision or tracker evidence.
```