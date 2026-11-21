# Native macOS prototype reference

Use only inside the selected prototype root when the question depends on native Mac app presentation, controls, windows, menus, keyboard commands, focus or OS integration. The root selects UI and/or logic guidance independently. This is private execution advice, not another public command or run.

## Establish the native runtime

Identify the project's existing stack, supported target, build/run instructions and available Mac environment before choosing the artifact. Use SwiftUI, AppKit or the existing application's appropriate runtime. Do not impose an Xcode project or another framework on every experiment. For a hybrid application, use its existing shell and distinguish native OS integration from browser content; a desktop app is not automatically a SwiftUI app.

Recreate only the app/window context and controls needed to judge the hypothesis. Keep candidates isolated at the selected prototype location and make them comparable with a native selector, separate preview or another mechanism the runtime supports. Preserve the same criteria and representative content/states across candidates. Native-only experiments do not require URL routing or a browser/device matrix.

## Build, render and interact separately

When the hypothesis requires native interaction, build and launch a runnable native candidate using the available target environment. Record build outcome separately from launch and behavior, with the candidate/artifact revision, target, relevant environment and exact run instructions. A successful build alone does not establish that the interaction works.

For a native visual question, inspect actual native rendering and retain a representative capture for each candidate. An existing preview can support a visual conclusion when its environment and limits are stated; preview rendering does not establish app lifecycle or menu behavior.

Exercise only the native behavior that could change the conclusion: window opening/closing or resizing, menus, shortcuts, active-window selection, focus, settings, controls or OS integration as appropriate. Record the actions, expected results, actual outcomes, and relevant boundary/error behavior. Use direct observation, recordings, accessibility/UI automation or existing tests as appropriate. A screenshot alone does not prove a keyboard, focus or window-lifecycle interaction.

Use in-memory fixtures and temporary run-owned locations for file and OS interactions. Do not add signing changes, account provisioning, distribution preparation or notarization as universal prototype prerequisites. Identify such prerequisites only when the selected capability actually requires them.

## Handle missing native evidence

If Mac tooling, the required runtime, permission or observation is unavailable, name the exact missing prerequisite and native behavior that remains unproven. Continue independent useful work such as scoped source authoring or fixture preparation, but distinguish source written from build verified, rendering observed and interaction observed. Never invent a native build/run result.

A browser simulation may demonstrate content or approximate layout when that is the selected question. State its actual runtime and fidelity limits; it cannot replace required native observation. Source-only, build-only or screenshot-only evidence cannot close a native interaction hypothesis. A failed or unavailable required check prevents claiming prototype completion or hypothesis validation; optional checks may be skipped with reasons when the question remains answerable. Keep the root's existing completion states and continuation rules.

Preserve candidates, run/open instructions, actual evidence and decision rationale. Retain necessary evidence before authorized cleanup and redact sensitive data from captures/logs. This reference grants no authority for production promotion, new dependencies, real-service mutations, tracker updates, publication or unrelated cleanup.
