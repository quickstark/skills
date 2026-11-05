Status: Continuation required
Skills used: /qs-design-prototype
Outcome: Two content-layout variants are planned. Neither has been rendered, compared, or selected.
Specs: Not located

- [x] Verified — define the comparison plan (weight 30%).
- [ ] Pending — build and observe both variants (weight 70%).

Stage: Comparison plan | Stage estimate: ~100% | Overall estimate: ~30% | verified — planning is finished; prototype validation remains pending. Input needed: none for this plan.

The intended product is the existing Electron app; the proposed prototype runtime is its existing Chromium renderer with HTML/CSS. Keep the controller and native shell unchanged. UI.md and WEB.md apply. Native menus, window behavior, and logic changes are outside scope, so MACOS.md and LOGIC.md are unnecessary.

**Hypothesis:** Grouped content and aligned rows produce different scanability; comparing them with identical content will reveal which better supports finding and comparing information.

| Candidate | Proposed layout | Current verdict |
|---|---|---|
| A — Grouped reading | Single-column sections with clear headings; existing secondary fields sit beneath each primary label. | Unproven; may improve hierarchy. |
| B — Aligned comparison | Compact rows with consistent columns for existing fields; long primary text wraps. | Unproven; may improve comparison across items. |

Use the same representative read-only content, field order, surrounding navigation, typography, and window sizes for both. Compare finding a target item, locating its existing secondary information, comparing adjacent items, and retaining readable content without clipping. Record timing or accuracy only if actually measured.

**Proposed bound:** One content surface, exactly two variants, and a 90-minute initial implementation-and-observation timebox. Preserve unfinished checks if time expires. Use `/fixture/prototypes/renderer-layout` as the designated disposable location, subject to confirming how the existing Electron development runtime can load it. No runnable artifact or launch command is supplied.

Before selecting a direction, capture each variant in the actual Electron renderer at representative normal and dense content states. Record revision, Electron/Chromium version, viewport, scenario, expected result, observed result, and limitations. Exercise keyboard/focus behavior only where the candidate changes controls. Preserve both alternatives and the comparison rationale.

No build, rendering, or interaction checks have been performed. Native behavior remains outside the evidence claim. Prototype files and comparison controls remain disposable; production integration requires separate scope.

Work summary:

- Finished — produced two materially different layout plans and common evaluation criteria, consistent with the supplied Electron constraints. No files were changed.
- Next — [Renderer layout comparison](/fixture/prototypes/renderer-layout) — pending, designated location only — implement the disposable candidates and collect actual rendering evidence.

Next work prompt:
```text
$qs-skills:qs-code-build Implement the Renderer layout comparison planned above as a disposable prototype at /fixture/prototypes/renderer-layout. Keep the existing Electron runtime, controller, and native shell. Confirm the renderer entry point, existing launch command, and safe isolation mechanism before editing. Build exactly two HTML/CSS candidates: grouped single-column sections and aligned comparison rows, using identical existing read-only content and fields. Preserve production rendering. Observe both in the actual Electron renderer against the shared scanability criteria; record revisions, environment, captures, outcomes, limitations, and rerun instructions. No variants have yet been rendered. Do not claim a winner without observed evidence or promote prototype code into production.
```