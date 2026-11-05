Status: Complete
Skills used: /qs-design-prototype
Outcome: Two-placement comparison plan completed. Only sketches exist; keyboard behavior remains unproven. Nothing was executed.
Specs: Not located

- [x] Verified — define the bounded comparison and required evidence from the supplied request (weight: 100%).

Stage: Comparison plan | Stage estimate: ~100% | Overall estimate: ~100% | verified — planning scope complete; prototype execution remains outside this request. Input needed: none.

**Hypothesis:** Search placement affects how easily keyboard users reach the field and return to results, even when both placements use the identical established search controller.

| Candidate | Placement | Current verdict |
|---|---|---|
| A | Search in the page header, before the main content | Unproven; compare navigation distance from page entry and results. |
| B | Search immediately above the results, within the main content | Unproven; compare the same paths and content. |

Use the existing browser app runtime because the question concerns website keyboard interaction. UI and Web guidance apply; the controller’s rules remain settled and unchanged.

**Proposed actions, without execution:**

1. Bound the experiment to two disposable variants and one keyboard comparison session, with a proposed 60-minute limit. Use only `/fixture/prototypes/search`, existing tooling, and read-only fixtures. Reproduce relevant navigation and page density; preserve both alternatives.
2. Connect each placement to the same controller and preserve its established submission and focus behavior. Use the same labels, results, queries, starting focus positions, and viewport. Placement is the experimental variable.
3. For each candidate, start at page entry and separately at a result link. Use Tab and Shift+Tab to reach search, type the same query, and submit with Enter. Follow the established keyboard path back to results. Observe whether focus transfers automatically or requires further keys; do not introduce a new focus policy.
4. Repeat with populated and empty results, plus existing asynchronous states that could affect focus. Check visible focus, logical order, backward navigation, and whether focus is lost or trapped. Confirm the existing results focus target before evaluating it.

**Common criteria and decision rule:** Both candidates must permit keyboard access, submission, and return to the established results target without a trap or lost focus. Compare measured navigation steps from both starting positions, visible focus, and predictability. Prefer a candidate only when observed evidence supports it; report a tie or unresolved tradeoff when appropriate.

**Evidence required:** Retain each variant’s revision, exact preview command or URL, selection instructions, browser and viewport, representative content, and starting focus. Record actions, expected outcomes, actual focus targets, and key counts. Capture rendered focus states for both candidates and preserve the decision rationale, including the discarded alternative. Record measurements only when collected. Screenshots or a successful build alone cannot establish keyboard interaction.

**Limits:** Browser availability is supplied, but no runnable artifact, preview command, rendering, or interaction results are supplied. No candidate can currently be selected. Any later prototype wiring and fixtures remain disposable and must not be promoted into production automatically.

Work summary:
- Finished — produced two placement candidates, shared acceptance criteria, proposed actions, and an evidence plan; checked against the supplied UI and Web guidance.
- Next — None verified after checking the supplied task history and references; specification and tracker context were not supplied. The actions above remain proposals.

Next work prompt: None — no follow-on needed for this response-only planning request.