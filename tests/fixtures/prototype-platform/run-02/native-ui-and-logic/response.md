- [x] Verified — prepare the comparison plan (100% of planning scope).

Stage: Comparison plan | Stage estimate: ~100% | Overall estimate: ~100% | verified — both candidates, shared criteria, and reproducible scenarios are specified below. Input needed: none.

Status: Complete
Skills used: /qs-design-prototype
Outcome: Planning is complete. No prototype was created or executed, and neither candidate is validated.
Specs: Not located

**Hypothesis and bounds**

A native payment toolbar can make payment easy to find and explain canceled-order restrictions while the domain model independently rejects illegal payment without changing the order.

Intended platform and proposed runtime: native macOS using the existing AppKit stack. Native toolbar validation, menus, keyboard access, and focus are part of the question, so a browser simulation would not establish the required behavior.

Proposed bound: one 90-minute disposable experiment, with two candidates under `/fixture/prototypes/order-payment`. Use in-memory fixtures and existing tooling. Preserve both alternatives and their comparison evidence. Production integration, dependencies, real payments, and publication are excluded.

**Two candidates**

| Candidate | Native presentation | Canceled-order behavior | Tradeoff to test |
|---|---|---|---|
| A: Direct payment | Prominent `Pay Order` toolbar button | Disable payment and display a persistent cancellation explanation near the order status | Immediate discoverability and prevention; users must still understand why payment is unavailable |
| B: Action menu | `Order Actions` toolbar menu containing `Pay Order…` | Keep the payment command discoverable; invoking it produces a native rejection alert explaining that canceled orders cannot be paid | Explicit feedback on attempted payment; requires an extra step and may imply payment is available |

These compare presentation and UI gating policies. Both must enforce the same authoritative payment rule: a canceled order cannot be paid. Candidate A's disabled control must never be the only protection.

**Common model and comparison criteria**

Use a pure payment transition behind both AppKit shells. Proposed fixtures: an open unpaid order for $42, the same order canceled and unpaid, and a paid order. These are planned examples, not observed project states.

For this experiment, successful payment changes an eligible open order's payment state. Canceled-order payment returns a rejection reason and an order value identical to its pre-action snapshot. Keep rejection feedback outside the order model. Treat duplicate payment as another proposed invalid transition.

Compare both candidates using identical order content, window context, and scenarios:

- Can users locate payment and identify the selected order and amount?
- Can they explain why a canceled order cannot be paid?
- Does every rejected payment preserve the entire order state?
- Do toolbar and menu actions behave consistently through keyboard access, focus changes, and resizing?
- Is rejection feedback understandable, with predictable focus recovery?

**Reproducible scenarios**

Reset to the named fixture before each scenario and record expected versus actual outcomes.

1. **Valid path:** open unpaid order → invoke payment → expect payment recorded in memory and clear success feedback.
2. **Canceled order:** canceled unpaid order → inspect availability and explanation. For B, invoke payment and expect a rejection alert. For both, dispatch the payment action directly through the model interface and require exact pre/post order equality.
3. **Stale availability boundary:** begin with an eligible order, then cancel it before dispatching payment → expect authoritative rejection and unchanged canceled state, regardless of earlier toolbar availability.
4. **Repeated payment:** pay the open fixture, then attempt payment again → expect rejection without another payment or order mutation.
5. **Native interaction:** repeat relevant scenarios through keyboard/menu access; resize the window and dismiss feedback → inspect labels, focus recovery, and agreement between displayed availability and command behavior.

**Evidence and decision plan**

For each candidate, retain its revision, exact build/run instructions once the existing target is identified, macOS environment, native captures, action traces, and model snapshots. Use focused automated model checks for rejection and state preservation. Record build, launch, rendering, and interaction evidence separately.

Current evidence is limited to the supplied AppKit stack, in-memory model, proposed location, and available native toolchain. Target details and run instructions were not supplied. No source, build, rendering, interaction, or rule-check results exist. Neither candidate has a verdict yet; choose only after comparing observed outcomes against the shared criteria.

All future prototype code, sample data, and experimental UI remain disposable. Preserve discarded alternatives and rationale; do not promote them automatically.

Work summary:

- Finished — produced two native toolbar plans, shared criteria, and reproducible acceptance scenarios; checked the plan against the supplied UI, logic, and macOS guidance. Material output: this chat plan only.
- Next — None verified after checking the supplied task history and context; no linked specification, ticket, or tracker evidence was supplied. Execution remains outside this request.

Next work prompt: None — no follow-on needed.