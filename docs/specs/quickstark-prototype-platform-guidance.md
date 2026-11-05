# Web and native macOS guidance for qs-design-prototype

**Status:** Implemented and verified against AC-01 through AC-13.
**Date:** November 5, 2026.
**Decision:** Keep one public prototyping command and select private platform guidance by the experience being tested.
**Authority:** The user's specification request following the Web/macOS research in this chat, followed by explicit authorization to implement AC-01 through AC-13. Ticket creation, installation and publication remain outside this request.

## Problem and baseline evidence

`qs-design-prototype` answers one design question through disposable experiments. Its hypothesis, candidate comparison, isolation, and decision-evidence requirements apply across platforms. At specification time, its private references provided incomplete platform coverage:

- [SKILL.md](../../skills/engineering/qs-design-prototype/SKILL.md) conditionally loads UI or logic guidance, with no explicit platform selection.
- [UI.md](../../skills/engineering/qs-design-prototype/UI.md) discusses routes, responsive layouts, and `?variant=` selection.
- [LOGIC.md](../../skills/engineering/qs-design-prototype/LOGIC.md) prefers a local HTML demo for non-developers or an existing-language CLI/TUI for runtime-specific work.
- [The projector](../../scripts/sync-codex-plugin.mjs) copies each skill's private files into its owning package. [Existing reference tests](../../tests/upstream-adoption-qs.test.mjs) verify local reference resolution and authority boundaries.

Source inspected at `c99c906dc4e1ca768ac04e6b4f1a8c735e497aed` (November 4, 2026). The installed 4.4.3 UI/Logic references match that checkout. This is current-source evidence, not a claim that the checkout's package version has been published or installed.

The [architecture](../architecture.md), [skill-run contract](../skill-run-contract.md), and [upstream adoption specification](quickstark-upstream-adoption.md) govern package ownership, one-root reporting, prototype isolation, and conditional references. Historical command counts in older specifications do not override the active catalogs.

## Scope and settled decisions

1. Retain the public name `qs-design-prototype`, its `qs-specialists` ownership, and existing invocation policy, continuations, effort/report modes, and completion contract. Add no platform commands, aliases, packages, or public options.
2. Preserve `UI.md` and `LOGIC.md` as conditional references. The experiment's subject (UI, logic, or both) and its platform are independent choices.
3. Keep shared experiment requirements in `SKILL.md`; add private `WEB.md` and `MACOS.md` in the same canonical skill directory. Link all four directly from the root so selection does not require loading unrelated references.
4. Select the smallest artifact and runtime that can produce the required evidence. Retain the project's relevant stack and assets; do not introduce a framework merely to fit a platform label.
5. Preserve isolated prototype locations, comparable candidates, runnable evidence, and the prohibition on automatic production promotion.

Excluded: production implementation, new design systems, a full desktop-platform framework, mandatory browser/device matrices, distribution/signing/notarization work unrelated to the hypothesis, tracker mutations, version publication, and installed-host updates. This specification run creates no implementation tickets.

## Selection contract

Before building, state the question, hypothesis, common candidate criteria, scope/time bound, permitted artifact location, target experience, and evidence required to answer the question. Recover settled inputs from the request and project first. Ask only when an unresolved choice materially changes what must be demonstrated.

Select references from these two independent dimensions:

| Dimension | Selection rule |
| --- | --- |
| UI | Load `UI.md` for layout, information hierarchy, or interaction alternatives. |
| Logic | Load `LOGIC.md` for rules, data shape, or state behavior. Load both subject references when the hypothesis requires both. |
| Web | Load `WEB.md` for browser-rendered behavior, including a web app viewed on a Mac. |
| Native macOS | Load `MACOS.md` when the question depends on native Mac app presentation, controls, window lifecycle, menus, keyboard commands, focus, or OS integration. |
| Platform-independent logic | Use the smallest existing-language harness or local HTML shell that proves the rule; no platform reference is required solely because a computer has an operating system. |
| Hybrid or cross-platform | Select guidance for each surface the hypothesis actually exercises. Use the existing shell/runtime; do not equate every desktop app with SwiftUI. Load both platform references only when both surfaces matter. |

The host OS does not choose the target. A browser simulation of a Mac concept is acceptable for a question about content or approximate layout when its fidelity limits are stated. It cannot establish native window, menu, focus, or keyboard behavior. Label intended product platform and actual prototype runtime separately when they differ.

These selections are run decisions expressed in ordinary language, not a new configuration schema, parser, public flag, or router entry.

## Reference responsibilities

### Shared root and UI/Logic references

The root owns the hypothesis, reference selection, mutation authority, evidence limits, and final decision. Platform references supply execution and observation details; they cannot widen authority or produce independent runs or reports.

Keep candidate criteria and representative content/states consistent across alternatives. Compare materially different candidates before polishing a direction, with effort proportional to the question. Do not generate separate Web and Mac versions merely to satisfy the reference structure.

Keep UI comparison guidance applicable to the actual runtime. A named variant switcher may be an in-app selector, separate preview, or another existing mechanism; query parameters are an optional Web technique. Do not require URL routing or responsive-device checks for a native-only experiment.

Preserve the logic reference's separation of rules from presentation, in-memory fixtures, resettable scenarios, valid paths, boundaries, and rejected transitions. Choose its shell after determining whether native behavior matters. The existing HTML preference applies when a lightweight browser demo can answer the question; it must not override a requirement to observe native behavior.

### WEB.md

- Use existing Web tooling or a self-contained local page when sufficient. Give the exact local preview/open command or URL and candidate-selection instructions.
- Exercise the chosen interaction or state path in a real browser. Include viewport, keyboard/focus, pointer/touch, appearance, or other browser conditions only where they affect the hypothesis.
- For a visual/layout conclusion, retain a representative rendered capture and relevant viewport/browser context for each candidate. For an interaction conclusion, record actions and observed outcomes; a static capture alone is insufficient.
- Reuse existing browser automation when it materially proves the disputed behavior. Manual observed evidence is acceptable; adding a browser test framework or screenshot suite is not a universal prerequisite.
- Preserve any selected existing-route prototype's auth/data behavior and development-only variant guard. An isolated local preview remains the default.

### MACOS.md

- Identify the existing native stack, supported target, build/run instructions, and available Mac environment. Use SwiftUI, AppKit, or the existing application's appropriate runtime; do not impose an Xcode project or a new framework on every experiment.
- Recreate only the app/window context and native controls needed to judge the hypothesis. Provide a native candidate-selection mechanism appropriate to the existing stack.
- Build and launch a runnable native candidate when the hypothesis requires native interaction. Record build outcome separately from launch and observed behavior, including the actual target/environment. Existing previews may support a visual question; do not treat preview rendering as proof of unrelated app lifecycle behavior.
- Exercise relevant window opening/closing, resizing, menus, shortcuts, active-window selection, focus, settings, or OS integration only when the question depends on them. Include boundary/error behavior that could change the conclusion.
- For native visual conclusions, retain a representative native capture or suitable preview evidence with its limits. For behavior conclusions, retain action/outcome evidence through observation, recording, accessibility/UI automation, or existing tests as appropriate. A screenshot or successful build alone cannot prove an interaction.
- Use safe fixtures and temporary run-owned locations for file or OS interactions. Local prototyping does not automatically require distribution preparation, notarization, account provisioning, or signing changes; identify such prerequisites only when the selected capability actually requires them.

## Evidence, failure handling, and result

Choose required evidence before authoring and apply the same criteria to every candidate. Evidence must identify the candidate/artifact revision, run/open instructions, relevant environment, exercised scenario, expected result, actual result, and material limitations. Record measured values only when measured; use concise observations for qualitative criteria.

| Question | Minimum relevant evidence |
| --- | --- |
| Visual hierarchy/layout | Actual rendering of each candidate in the relevant runtime; representative content and target dimensions; comparison against stated criteria. |
| Web interaction | Browser actions and resulting visible/state behavior on the selected path, including hypothesis-relevant input or viewport conditions. |
| Native Mac interaction | Native build/run evidence and observed actions/outcomes for the relevant windows, controls, menus, focus, or OS behavior. |
| Platform-independent rule | Executed valid, boundary, rejected-transition, and reset scenarios using fixtures; automated checks only where they materially strengthen the conclusion. |
| Mixed UI and logic | Both subject-specific evidence sets in the chosen runtime; no duplicate platform implementation unless the question requires it. |

If a required toolchain, runtime, permission, dependency, or environment is unavailable, identify the exact missing prerequisite and evidence that remains unproven. Continue independent useful work within scope, but do not silently substitute a browser for required native observation, install tooling, publish an artifact, or expand production access.

Separate source-authored, build-verified, rendered, and interaction-observed claims in ordinary prose; these are evidence descriptions, not new completion states. A required check that fails or remains unavailable prevents claiming the hypothesis was validated or the prototype run is complete. Use the existing root completion states and continuation rules for the actual failure or missing input. Optional checks may be skipped with a reason when the hypothesis remains answerable.

The final root result states the selected runtime and why it fits the question, candidate verdicts against common criteria, actual evidence, unproven cases, runnable artifact location, and what remains disposable. Preserve the existing direct-chat report contract; references produce no extra result, URL, skill-used entry, or automatic follow-on execution.

No reference authorizes production edits, new dependencies, real-service mutations, tracker updates, publication, or cleanup of unrelated work. Preserve necessary evidence before authorized cleanup; redact sensitive data in retained or displayed captures/logs.

## Implementation boundaries and dependency order

1. Update the canonical root's selection instructions and add `WEB.md`/`MACOS.md`; adjust `UI.md` and `LOGIC.md` to remove contradictory platform assumptions while retaining their shared experiment requirements.
2. Add focused reference/authority and packaging coverage, plus bounded instruction trials for the acceptance cases below. Existing `tests/upstream-adoption-qs.test.mjs` and the collection/projection suites provide relevant seams; prose-presence assertions alone do not prove routing or evidence quality.
3. Regenerate owning package projections through the existing generators. Private files must reach the Claude, Codex, and Pi `qs-specialists` skill directories without becoming public commands or depending on another optional package.
4. Complete repository validation and inspect the resulting diff. Capture behavior-trial evidence before any later release decision.

No catalog membership, public identity, registry count, model selection, continuation destination, shared report contract, or installer change is required. If explanatory metadata or generated documentation needs an update, change its canonical owner and regenerate it. Never hand-edit generated outputs. Retain provenance/notices and distinguish inherited UI/Logic text from newly authored platform guidance where provenance records require it.

Implementation does not by itself publish a version or activate installed copies. Native Mac hypothesis validation requires its actual environment; documentation and projection checks can run on another host. Do not manufacture a Mac acceptance receipt from Linux packaging checks.

## Acceptance criteria and verification

| ID | Required behavior | Verification evidence |
| --- | --- | --- |
| AC-01 | One public `qs-design-prototype` command retains its current ownership and contract. | Registry/catalog comparison and package checks show no added platform commands, aliases, flags, or package dependencies. |
| AC-02 | Root directly links four private, locally resolving references; UI and logic remain available independently or together. | Reference resolution/authority checks and generated package file checks for all three hosts; no public skill metadata in the new references. |
| AC-03 | A website viewed on a Mac selects Web guidance. | Instruction trial names browser runtime and relevant browser evidence, without selecting native work solely from host OS. |
| AC-04 | A native window/menu/focus question selects macOS guidance. | Instruction trial requests the existing stack, native build/run and relevant interaction evidence; it does not use `?variant=` or HTML as native proof. |
| AC-05 | UI and logic may apply to the same Mac experiment. | Mixed-case trial retains rules/scenarios plus native UI evidence in one run, without spawning separate public workflows or duplicate implementations. |
| AC-06 | A platform-independent rule can use a lightweight existing harness. | Logic-only trial exercises valid, boundary, rejected, and reset paths without mandatory native tooling or unrelated UI/browser matrices. |
| AC-07 | Intended platform and actual prototype runtime are distinguished. | Mac-concept browser-mock trial limits its verdict to the question its rendering can answer; it explicitly leaves native interactions unproven. |
| AC-08 | An unavailable native environment cannot yield false native validation. | Negative trial on a non-Mac or missing-toolchain host names the missing prerequisite, preserves useful source work, and does not claim build/run or hypothesis completion. |
| AC-09 | Hybrid selection follows the disputed surface. | Paired trials distinguish browser-content layout from native shell/menu behavior using the existing application runtime; both references load only when needed. |
| AC-10 | Validation is proportional and candidate criteria remain consistent. | Web layout, Web interaction, native interaction, and logic trials produce the evidence required above without universal frameworks, full device matrices, or distribution gates. |
| AC-11 | Evidence claims cannot exceed actual observation. | Negative trials with source-only, build-only, screenshot-only, and failed required-check evidence reject unsupported interaction/success claims; final output names the limit. |
| AC-12 | Existing isolation, authority, and retention rules survive. | Authority tests plus an adversarial trial reject helper-driven production promotion, real mutations, dependency installation, publication, and unrelated cleanup; candidates/run instructions remain available. |
| AC-13 | Canonical instructions and all generated host packages agree. | Repository generation/check commands pass, package reference closure is verified, and a repeat generation produces no additional diff. |

Run bounded instruction trials against the changed skill in a fresh context for each case, using controlled project/runtime inputs and the same question/criteria when comparing candidates. Judge the produced plan or behavior against the expected observable decision in this table, rather than accepting copied source phrases. Trials that request a plan do not prove actual prototype execution; label them accordingly. Reuse valid case evidence across criteria instead of multiplying equivalent trials.

For implementation validation, run the commands required by `AGENTS.md`: `npm run sync:codex`, `npm run check:codex`, and `npm test`; when Claude is available, run the documented strict package validations. These verify repository integration, not native Mac interaction. If claiming a runnable native reference example, separately build, launch, and exercise that example on a Mac; no bundled native example is required by this specification.

## Open questions and pending work

No blocking product decisions or in-scope implementation work remain. The scoped implementation preserves the existing public command and adds the four-reference selection/validation contract. [The scoped review](../validation/prototype-platform-guidance-review.md) records source review, focused tests, generated-package checks and 14 independently reviewed response-only instruction cases. The full repository run passed 711 tests, with no failures and one platform-specific control skipped. Actual native runtime observations are not claimed; no runnable native reference example is bundled. Publication and installed-host rollout remain outside this implementation request.

## Primary platform references

Reviewed November 5, 2026 during the preceding research. These establish platform differences, not measured benefits from splitting skills:

- [Agent Skills specification](https://agentskills.io/specification): private references can be loaded as needed.
- [Playwright emulation](https://playwright.dev/docs/emulation): browser viewport/input and environment controls.
- [Apple: Building and customizing the menu bar with SwiftUI](https://developer.apple.com/documentation/swiftui/building-and-customizing-the-menu-bar-with-swiftui): native scenes, menus, focus, and keyboard commands.
- [Apple: Running your app on simulated or physical devices](https://developer.apple.com/documentation/xcode/running-your-app-on-simulated-or-physical-devices): build/run destinations and local Mac signing conditions.
