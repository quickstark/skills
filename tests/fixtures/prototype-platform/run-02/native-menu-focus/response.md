- [x] Verified — Define the prototype plan and required evidence (weight: 100% of this planning request).

Stage: Prototype planning | Stage estimate: ~100% | Overall estimate: ~100% | verified — Plan checked against the supplied requirements and UI, logic, and macOS guidance. Execution remains separate. Input needed: none for planning.

Status: Complete
Skills used: /qs-design-prototype
Outcome: Planning is complete. No source, build, native rendering, interaction, or winning placement has been verified.
Specs: Not located

**Proposed experiment**

Use the existing app’s **SwiftUI macOS runtime** and documented build/run target. Both the intended product and prototype runtime are native macOS. Active-window routing, menus, keyboard shortcuts, and focus require a launched native app; a browser simulation cannot establish these behaviors.

Hypothesis: One placement makes the existing document command easier to discover and invoke while preserving its behavior across active document windows, the existing menu item, and the existing shortcut.

Compare two proposed candidates:

- **A: Window toolbar** — place the command in the document window’s toolbar.
- **B: Document header** — place the command beside the document’s title/context within its content area.

Keep the command label, icon, availability rules, menu location, shortcut, document fixtures, and surrounding navigation identical. These placements are proposals, not observations of the current app. Neither candidate has an evidence-based verdict yet.

Bound execution to one two-hour experiment at `/fixture/prototypes/document-command`, using existing tooling and in-memory documents. Preserve both candidates and their decision evidence there. Stop at comparison evidence; production integration, dependencies, publication, and unrelated cleanup are outside scope. The shell, fixtures, and routing model remain disposable.

**Common criteria and required evidence**

| Criterion | Required observation for both candidates |
|---|---|
| Discoverability and context | Capture actual native rendering at the same window sizes; record whether a representative user can locate the command without prompting. |
| Correct document targeting | Open distinct document windows A and B, alternate the active window, and invoke the placement, menu item, and shortcut. Only the active document receives each action. |
| Menu and shortcut parity | Confirm the existing menu identity, shortcut, availability, and resulting action match across candidates. |
| Focus and lifecycle | Repeat with an editor focused, after closing the active window, and with no eligible document. Observe documented availability/rejection behavior and verify no stale document changes. |
| Layout and keyboard usability | Resize each candidate and check control visibility, focus movement, and ordinary text editing. |

Model document eligibility and action routing separately from presentation, without UI or service effects. Use identifiable in-memory documents and an action log to expose the target and rejection reason. Reset before each guided scenario; include a normal invocation, rapid window switching, and an attempted invocation without an eligible document. Preserve the app’s existing rules once recovered rather than inventing new command semantics.

Before building, recover the exact command definition, shortcut, availability rules, target name, and documented run instructions. Their values were not supplied. Record them rather than guessing.

For each candidate, retain its revision, exact build/run instructions, target, macOS/toolchain environment, scenario, expected result, actual result, native captures, and limitations. Record source authoring, build success, rendering, and interaction separately. A screenshot or successful build cannot verify command routing. Use a focused routing check if a stable seam exists, alongside native interaction observation.

Select a placement only after both meet the correctness criteria and the observed comparison supports a preference. Report an inconclusive result if neither direction has sufficient evidence. No checks have run or failed; every runtime acceptance check remains unproven.

Work summary:
- Finished — Produced a bounded native comparison plan with two candidates, shared criteria, and an evidence protocol; no artifact was created.
- Next — [Document-command prototype](/fixture/prototypes/document-command) — pending; proposed location only — build and observe both disposable candidates in a separately authorized execution run.

Next work prompt:
```text
$qs-skills:qs-code-build
Implement only the disposable document-command prototype planned in this conversation at /fixture/prototypes/document-command. Use the existing SwiftUI macOS stack and documented target. Compare window-toolbar and document-header placements with identical existing command semantics, menu item, shortcut, fixtures, and criteria. Recover exact build/run instructions and command rules first. Preserve both candidates and record build, native rendering, and interaction evidence separately. Verify active-window targeting, focus, window closure, and unavailable-document behavior through each invocation path. Report missing prerequisites and unproven behavior explicitly. Do not promote prototype code, edit production paths, add dependencies, or publish. No execution evidence currently exists.
```