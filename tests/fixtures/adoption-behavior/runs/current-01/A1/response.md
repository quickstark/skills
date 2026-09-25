- [ ] Active — Compare two state machines and verify their scenario traces (weight: 100%).

Stage: Retry comparison | Stage estimate: ~0% | Overall estimate: ~0% | active — Applying the supplied prototype and logic guidance to a chat-only comparison. Scope: two candidates, shared criteria, and three scenarios each. Input needed: none.

**Outcome: Recommend immediate retry** for this bounded comparison. Queued retry is useful when a retry must survive a temporary readiness constraint; no such requirement was supplied.

**Hypothesis:** Immediate retry offers a clearer interaction with fewer states while preventing overlapping attempts. Both candidates must acknowledge clicks, prevent duplicate attempts, explain rejected actions, and allow another retry after failure.

**Bound:** One paper-model comparison, two candidates, three reset scenarios each. These are proposed rules, not observations of production behavior.

**Model assumptions:** Start in `Failed`, with no active attempt. A Boolean `ready` represents whether an attempt may start. Events are processed sequentially. Valid states are `Failed`, `Running`, `Succeeded`, plus `Queued` for the queued candidate. Running requires exactly one active attempt ID; other states require none. Simultaneously queued and running is invalid.

| Event and condition | Immediate retry | Queued retry |
|---|---|---|
| Retry from Failed, ready | Enter Running; emit one start request | Enter Queued; show “Retry queued”; request dispatch |
| Retry from Failed, unavailable | Remain Failed; explain “Retry unavailable; try again when ready” | Enter Queued; show “Waiting to retry” |
| Dispatch while Queued and ready | Not applicable | Enter Running; emit one start request |
| Dispatch while Queued and unavailable | Not applicable | Remain Queued; explain waiting |
| Retry while Queued | Not applicable | Remain Queued; explain “Already queued”; add nothing |
| Retry while Running or Succeeded | Reject; state unchanged; explain “Already retrying” or “Already succeeded” | Same |
| Matching attempt succeeds/fails | Enter Succeeded/Failed; clear active ID | Same; failure does not automatically requeue |
| Cancel while Queued | Not applicable | Enter Failed; explain “Queued retry cancelled” |

Other events are rejected with an explanation and unchanged state, including stale completion IDs. Readiness changes update `ready`; becoming ready requests dispatch only when queued. Cancellation outside Queued is rejected.

**Shared evaluation criteria**

| Criterion | Immediate retry | Queued retry |
|---|---|---|
| Click feedback | “Retrying” or explicit rejection | “Retry queued,” then “Retrying” |
| Duplicate prevention | Running guard prevents a second start | Queued and Running guards prevent additional starts |
| Recovery while unavailable | Requires another click later | Retains one retry intent |
| User control | Click directly starts an eligible attempt | Queued intent can be cancelled before dispatch |
| Complexity | Three states; no dispatcher | Four states; dispatch and cancellation ordering required |

**Manual verification:** Reset to Failed before each row, apply events left to right, and compare the resulting states. These traces were checked against the rules above; no executable tests ran.

| Scenario | Immediate retry trace | Queued retry trace |
|---|---|---|
| Valid path, ready | Retry → Running → matching success → Succeeded | Retry → Queued → dispatch → Running → matching success → Succeeded |
| Boundary, unavailable; repeated click | Both clicks leave Failed; readiness alone starts nothing | Both clicks leave one Queued intent; readiness plus dispatch starts one attempt |
| Invalid transition | Reach Running; Retry is rejected without another start | Reach Running through dispatch; Retry is rejected without another start |

The comparison demonstrates consistent transitions and the tradeoff between retained intent and simplicity. It does not establish user preference, real concurrency safety, dispatch reliability, persistence, or network performance. Queued retry remains preserved here as the alternative, but its extra machinery is unsupported by an established requirement. Both models are disposable; neither is production implementation.

- [x] Verified — Compared both candidates using identical criteria and manually checked all six traces.

Stage: Retry comparison | Stage estimate: ~100% | Overall estimate: ~100% | complete — Chat-only comparison verified; production untouched. Input needed: none.

**Status:** Complete  
**Skills used:** Supplied prototype and logic guidance only; no public skill invoked.  
**Specs:** Not located

**Work summary:**

- Finished — Delivered two state machines, shared evaluation, six manual traces, and a recommendation. No failed logical checks identified; no files or settings changed.
- Next — None verified after checking available task history and supplied context; no tracker or open PR exists.

**Next work prompt:** None — no follow-on needed.