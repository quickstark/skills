Status: Complete
Skills used: /qs-design-prototype
Outcome: Two candidate approaches planned. No source, build, rendering or interaction evidence was supplied; native correctness remains unproven.
Specs: Not located

- [x] Verified — Compare two plans against the supplied runtime, scope and native-evidence requirements (weight 100%).

Stage: Planning | Stage estimate: ~100% | Overall estimate: ~100% | verified — The bounded planning request is complete. Input needed: none. These estimates cover planning only.

**Hypothesis:** A command dispatched through the native menu and its keyboard shortcut should affect exactly the active eligible window, including immediately after a window switch.

**Runtime:** Keep the existing Electron shell and native macOS menu APIs. The intended platform and proposed runtime are both macOS/Electron. UI, logic and macOS guidance apply; browser presentation is outside this question.

| Candidate | Proposed behavior | Provisional assessment |
|---|---|---|
| A — Resolve on invocation | Keep one application menu. Route its item and accelerator through one handler that resolves the active eligible window when invoked, then calls the existing command. | Preferred starting hypothesis: target selection happens close to execution. No correctness claim without native observation. |
| B — Rebind on focus changes | Update the application menu's command target and availability as windows gain or lose focus. Both invocation paths use that binding, with a final eligibility and target check. Reject a stale binding. | Viable alternative, but correctness also depends on focus-event ordering and binding freshness. Native evidence must establish whether it rejects legitimate invocations or retains stale state. |

**Common criteria:** correct target, exactly one execution, matching menu/shortcut behavior, correct command availability, and safe rejection when no eligible window exists. Use identical command content, accelerator and window fixtures for both candidates.

**Bound:** Propose one 60-minute comparison under `/fixture/prototypes/electron-menu`, using existing tooling and in-memory fixtures. This is a proposed location, not a verified runnable artifact. Preserve both candidates and their decision evidence. Production integration, browser-layout changes, new dependencies and publication are excluded.

**Required native evidence:**

1. Start with eligible window A active and window B inactive. Invoke through both the menu and shortcut; expect one execution in A.
2. Switch to B and immediately repeat. Alternate rapidly; expect execution only in the active eligible window.
3. Repeat with different command eligibility in A and B, then close the targeted window and invoke with no eligible window. Expect rejection with no command side effect where execution is invalid.
4. Exercise native menu opening and dismissal during switching, recording which window the command should target and what actually happened.

For each candidate, retain its revision, exact existing launch instructions, Electron/macOS versions, action sequence, expected and actual outcomes, and representative native captures. Record build, launch, rendering and interaction separately. Screenshots alone cannot establish shortcut or focus correctness. Exact command wiring, accelerator, launch instructions and all runtime results remain missing.

Work summary:
- Finished — Prepared two materially different approaches, shared acceptance criteria and a bounded native comparison plan. Checked the plan against supplied constraints; no runtime checks were performed. The material output is this plan.
- Next — [Native comparison](/fixture/prototypes/electron-menu) — pending; proposed location only — create and observe the disposable candidates before choosing a winner. Retain alternatives and evidence; prototype code remains disposable.

Next work prompt:
```text
$qs-skills:qs-code-build Implement only the disposable native-menu comparison planned above under /fixture/prototypes/electron-menu. Preserve the existing Electron runtime, APIs and production paths. Compare invocation-time active-window resolution against focus-driven menu rebinding, using the same command, accelerator, eligibility fixtures and scenarios. First establish existing command wiring and launch instructions. Record build, native rendering and menu/shortcut interaction evidence separately, including rapid switching, differing eligibility, closed windows and no eligible window. Preserve both candidates and their rationale. Do not promote prototype code or claim a winner without observed native outcomes.
```