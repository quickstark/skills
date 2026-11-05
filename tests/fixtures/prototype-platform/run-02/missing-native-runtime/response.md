- [x] Verified — Assess supplied evidence (weight 20%).
- [ ] Blocked — Compare candidates through native build, rendering and interaction (weight 80%).

Stage: Native comparison | Stage estimate: ~0% | Overall estimate: ~20% | blocked — Only source sketches are reported. Input needed: a Mac with the project's supported native toolchain and observed native results. Estimates describe the prototype scope; no execution is underway.

Status: Input required
Skills used: /qs-design-prototype
Outcome: The prototype is **not complete**. Source sketches establish that candidate designs have been drafted. They do not establish compilation, menu routing, shortcut handling or correct behavior when the active window changes. No candidate can be selected from the supplied evidence.
Specs: Not located

The intended platform is native macOS using the existing SwiftUI project. The current environment is Linux with no native runtime available; no prototype runtime has been observed. A browser simulation cannot prove this native interaction.

**Hypothesis:** The menu command and its shortcut perform the same action on the currently active eligible window, without affecting an inactive or closed window.

Use common criteria across candidates: correct target window, equivalent menu and shortcut results, focus behavior, and safe handling when no eligible window exists. Candidate contents and revisions were not supplied, so their individual mechanisms and verdicts remain unassessed. Preserve materially different alternatives before polishing a direction.

Useful work can continue as a proposed, bounded source-preparation pass: compare the sketches, prepare identical in-memory window fixtures, and document candidate revisions, comparison controls and exact project run instructions once those instructions are available. Keep this work isolated to [/fixture/prototypes/active-window](/fixture/prototypes/active-window), limited to the command-routing experiment. The source, fixtures and comparison controls remain disposable; they are not production-ready implementation.

Required native evidence remains unavailable:

- Build and launch each candidate on the supported Mac target; record revision, environment and actual results separately.
- Capture native rendering for each candidate.
- With distinguishable windows A and B, invoke both the menu item and shortcut, switch the active window, and repeat. Observe that only the intended window changes.
- Exercise relevant field focus, window closure and no-eligible-window cases. Record expected and actual outcomes, including rejection or disabled behavior where appropriate.

No build, launch, rendering or interaction check has passed or failed: none was performed. A successful future build or screenshot alone would still leave command and shortcut behavior unproven.

Work summary:

- Finished — Assessed the supplied evidence and identified the native proof requirements. Existing material consists only of reported source sketches; no files were inspected, changed or created.
- Next — [Active-window command prototype](/fixture/prototypes/active-window) — blocked on native observation — prepare comparable disposable candidates, then build and exercise them on a Mac. Preserve alternatives and evidence; do not promote prototype code.

Next work prompt:
```text
$qs-skills:qs-code-build
Advance only the disposable active-window command prototype at /fixture/prototypes/active-window using the existing SwiftUI Mac target. Compare the existing candidate sketches against identical window fixtures and command/shortcut criteria; preserve alternatives, revisions and run instructions. Do not edit production paths or add dependencies. Current evidence is source-only on Linux. Native build, launch, rendering, active-window routing and shortcut behavior remain unverified. Perform native checks only when a supported Mac environment is available; otherwise report the blocker without claiming completion. This prompt is proposed follow-up work, not authorization to execute now.
```