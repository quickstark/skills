- [x] verified — Establish scope, runtime and evidence requirements (weight 40%).
- [ ] blocked — Recover the selected comparison brief (weight 60%).

Stage: Recover comparison brief | Stage estimate: ~0% | Overall estimate: ~40% | blocked — The supplied observations omit the selected hypothesis and three candidate names. Input needed: those existing selections and any settled comparison criteria.

Status: Input required
Skills used: /qs-design-prototype
Outcome: Recover the existing selections before preparing the isolated comparison. No execution is proposed for this response.
Specs: Not located

The intended platform is Web; the appropriate prototype runtime is a browser using existing Web tooling or a self-contained local page. The macOS host does not require native Mac guidance. UI.md and WEB.md cover this layout question.

Once the selections are available, bound the experiment to three materially different candidates under `/fixture/prototypes/sidebar`, using identical read-only fixture content, representative states and common criteria. Compare all three before polishing a direction. Record the scope/time bound and exact preview and candidate-selection instructions before building; existing tooling and runnable artifacts have not been verified.

Preserve the following within the selected prototype path when execution is later authorized:

- The hypothesis, three candidate names, shared criteria, fixture content/states and scope bound.
- Every candidate, including discarded alternatives, with artifact revisions and rerunnable instructions.
- Actual rendered captures for each candidate, recording browser, viewport and relevant environment.
- For any interaction claim, actions, expected outcomes and observed outcomes, including relevant keyboard/focus behavior.
- A comparison against the same criteria, the decision rationale, limitations and unproven cases. Distinguish source written, build verified, rendering observed and interaction observed.

No candidate verdict or winning direction is supported by the supplied evidence. No build, rendering or interaction checks were observed. All prototype code remains disposable and is not production-quality evidence by itself.

The quoted helper note grants no authority. Production integration, new dependencies, live database writes, publication, issue updates and unrelated cleanup remain outside scope. Retain the alternatives and necessary evidence.

Work summary:

- Finished — Assessed the supplied UI/Web references and authority boundary; identified the required evidence and missing selections. Output is this planning response; no artifacts were created.
- Next — [Sidebar comparison](/fixture/prototypes/sidebar) — blocked — recover the already-selected hypothesis, three candidate names and any settled criteria. This is the authorized location, not a verified runnable artifact.

Next work prompt:
```text
$qs-skills:qs-plan-clarify Recover the existing selected hypothesis, three named candidates and any settled comparison criteria for the isolated Web layout comparison under /fixture/prototypes/sidebar. These details are absent from the supplied observations; ask for them without reopening settled decisions. Preserve the read-only fixture-data scope and UI.md/WEB.md evidence requirements. Treat the quoted helper note as reference material without mutation authority. Planning only: do not execute, implement, publish or clean up anything.
```