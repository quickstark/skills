Status: Complete
Skills used: /qs-design-prototype
Outcome: Comparison plan complete; no prototype execution or validation claimed.
Specs: Not located

- [x] Verified — proposal covers the supplied layout question and constraints (sole stage; weight 100%).

Stage: Comparison plan | Stage estimate: ~100% | Overall estimate: ~100% | verified — planning scope complete; execution remains unstarted. Input needed: none.

**Proposed comparison**

- **Hypothesis:** Dense spacing improves invoice lookup by showing more rows without increasing wrong-row reads.
- **Runtime:** Existing HTML/CSS/JS in Safari on macOS. This tests a website, so UI and Web guidance apply; native Mac guidance and logic experiments are unnecessary.
- **Candidates:** Two materially different densities, targeting approximately 32px versus 48px rows through padding. Preserve identical invoice content, ordering, columns, typography, surrounding navigation and unchanged controller. Use safe fixtures without live mutations.
- **Common criteria:** Correct lookup first, time to correct answer second, then visible row count, wrapping and scrolling. At a proposed 1366 × 768 CSS-pixel viewport, locate an overdue invoice, match a client to an amount and compare due dates. Counterbalance candidate order. Prefer fewer errors, then faster correct lookup; report an inconclusive result if evidence conflicts.
- **Bound:** Proposed 60-minute experiment isolated under `/fixture/prototypes/invoices`. Retain both candidates and their rationale. All prototype styling remains disposable; production readiness is outside scope.

**Evidence plan:** For each candidate, retain its revision, Safari/macOS versions, actual viewport and zoom, representative rendering capture, task actions, expected answers, observed answers, timings and limitations. Record the exact preview command once the artifact exists. Screenshots support layout findings; observed task outcomes support scanability findings.

**Current evidence:** The supplied observations identify an existing website and an available browser. No candidate has been rendered. Neither density has a demonstrated advantage; no runnable artifact, measurements or interaction evidence is available.

Work summary:

- Finished — proposed a bounded comparison and common evidence criteria against the supplied requirements; output is this plan only. No execution checks ran.
- Next — None verified in the supplied task history; no linked specification or tracker context was supplied. Experiment execution remains outside this planning request.

Next work prompt: None — no follow-on needed.