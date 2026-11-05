- [x] Verified — Plan the bounded logic demo against the supplied constraints (weight: 1).

Stage: Demo planning | Stage estimate: ~100% | Overall estimate: ~100% | verified — The requested plan is complete; implementation and execution are outside this request. Input needed: none for planning.

Status: Complete
Skills used: /qs-design-prototype
Outcome: Plan two small rule candidates that expose the consequences of allowing payment after cancellation. No candidate has been implemented or validated.
Specs: Not located

**Hypothesis and boundary**

A deterministic rule demo can make the policy choice concrete: should `PAY` reject a canceled, unpaid order, or accept payment while preserving cancellation? Assertions can prove that each candidate follows its proposed policy; they cannot establish which policy the business wants.

The intended behavior is platform independent. Use the existing Node runtime and built-in assertions as the prototype runtime. macOS presentation and native tooling are irrelevant to this question. Only the supplied logic reference applies.

Proposed location: `/fixture/prototypes/order-rule/`. Bound the eventual experiment to 30 minutes, two candidates, one payment action, and in-memory fixtures. Exclude UI, services, persistence, refunds, concurrency, and production changes.

**Smallest proposed artifact**

- `rule.cjs`: a pure `pay(policy, order)` function returning `{ accepted, state, reason }` without mutating its input.
- `demo.cjs`: the local harness, shared scenarios, built-in assertions, and printed before/action/after results. An optional policy and state argument permits free play through the same function.

Represent cancellation and payment separately: `{ status: 'active' | 'canceled', payment: 'unpaid' | 'paid' }`. Start each scenario from a fresh fixture.

**Candidates and common criteria**

| Candidate | Canceled, unpaid order receives PAY | Planned assessment |
|---|---|---|
| A: reject | Reject with `ORDER_CANCELED`; preserve state | Demonstrates cancellation closing payment eligibility |
| B: allow | Accept; retain `canceled`, change payment to `paid` | Demonstrates payment and cancellation remaining independent |

Evaluate both for deterministic results, unchanged inputs, explicit rejection reasons, preserved cancellation status, and prevention of repeated payment. Neither is a verified winner. Keep both candidates and their rationale until the business decision is recorded.

**Reproducible scenarios — expected results only**

| Fresh initial state | Action | Candidate A | Candidate B |
|---|---|---|---|
| Active, unpaid | PAY | Accept → active, paid | Same |
| Canceled, unpaid | PAY | Reject; unchanged | Accept → canceled, paid |
| Active, paid | PAY | Reject `ALREADY_PAID`; unchanged | Same |
| Canceled, unpaid | PAY, then PAY | Both rejected; unchanged | First accepted; second rejects `ALREADY_PAID` |

After every action, assert the expected result and that the original input remains unchanged. Rejection must return an explanation. Cancellation itself is a fixture condition; this demo does not define cancellation-after-payment behavior.

Proposed run instruction, **not executed**:

```sh
node /fixture/prototypes/order-rule/demo.cjs --all
```

The harness should run both policies against the same fixtures. For manual exploration, its planned interface is:

```sh
node /fixture/prototypes/order-rule/demo.cjs --policy allow --status canceled --payment unpaid
```

For eventual evidence, retain the artifact revision, Node version, command, scenario, expected result, actual result, assertion output, limitations, and decision rationale inside the prototype directory. Actual results remain missing until execution.

No source, build, rendering, or interaction evidence exists in the supplied observations. No checks were run or reported failed. Payment-provider behavior and production safety remain unproven. Both rule implementations and the harness would remain disposable; any production implementation requires separate authorization.

Work summary:

- Finished — Delivered the bounded demo plan, two policy candidates, common criteria, reproducible scenarios, and proposed run instructions. Checked the plan against the supplied Node and logic-only constraints; no files were created.
- Next — None verified after checking the supplied task history; no linked specifications or tracker context were supplied. Building and running the proposed demo are outside this request.

Next work prompt: None — no follow-on needed.