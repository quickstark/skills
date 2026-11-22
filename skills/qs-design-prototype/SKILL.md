---
name: qs-design-prototype
description: "Build a disposable prototype to answer one design question."
---

# Prototype a design decision

<!-- qs-runtime-start -->
Before doing any task work, read [the shared run contract](../_shared/runtime/run-contract.md) relative to this invoked `SKILL.md`. Use the actual skill location supplied by the host to resolve it within the same package or canonical tree. Read through the end marker before selecting task tools, delegating, or acting. Then post the contract's initial checklist and progress update in the conversation before starting the task.
Confirm the file starts with `# QuickStark runtime run contract` and ends with `<!-- qs-runtime-run-contract:end -->`. If the host lacks usable read access or cannot locate this skill, report `Input required`. If the expected file is missing, unreadable, invalid, or resolves outside the owning tree, report `Failed`. Give `Status:`, `Skills used: /qs-design-prototype` and an `Outcome:` naming the owning package (qs-specialists) and prerequisite. Include `Specs: Not located` and a short `Work summary:` with `Finished —` and `Next —`. Write `Next work prompt: None — shared run contract unavailable.` Stop before task work. Emit no executable continuation, perform no repair, and use no alternate copy.
<!-- qs-runtime-end -->

This optional specialist creates the smallest disposable artifact that can answer the selected question. Before building, state the hypothesis, common candidate criteria, required evidence, time/scope bound, permitted artifact location, and what must not be mistaken for production quality. Recover settled inputs from the request and project; ask only when an unresolved choice changes what must be demonstrated.

Explore materially different candidates before polishing one direction. Evaluate each against the same user outcome, constraints, and observable experience; preserve discarded alternatives and the decision rationale as evidence inside this run.

Reuse safe existing assets when helpful, isolate prototype code from production paths, and validate the hypothesis directly. Report what the prototype demonstrated, failed to demonstrate, and which parts must be discarded. Do not promote prototype code or begin production implementation automatically.

## Select subject and platform independently

- Load [UI.md](UI.md) for layout, information hierarchy or interaction alternatives, and [LOGIC.md](LOGIC.md) for rules, state or data behavior. Load both when the hypothesis requires both.
- Load [WEB.md](WEB.md) when browser presentation or interaction is being tested, including a website viewed on a Mac. Load [MACOS.md](MACOS.md) when the question depends on native Mac app presentation, controls, windows, menus, shortcuts, focus or OS integration.

Select by the experience being tested, not the host operating system. State the intended product platform and actual prototype runtime separately when they differ. A browser mock of a Mac concept can answer content or approximate-layout questions; it does not establish native interaction. For platform-independent logic, use the smallest existing-language harness or suitable local HTML shell without requiring platform guidance solely from the host OS.

For hybrid or cross-platform questions, use the existing application runtime and select guidance for each disputed surface. Load both platform references only when both surfaces matter. Do not equate every desktop application with SwiftUI or build separate Web and Mac candidates merely to satisfy this structure. Reuse the relevant project stack; do not add a framework just to fit a platform label.

## Bound evidence to observation

Keep the same hypothesis, criteria and representative content/states across candidates. Record each candidate's artifact revision, run/open instructions, relevant environment, scenario, expected and actual result, and limitations. Record measured values only when measured. Capture actual rendering for visual conclusions and actions with observed outcomes for interaction conclusions. Use existing automation when it materially proves the question; neither a new test framework nor a full device matrix is a universal prerequisite.

Distinguish source written, build verified, rendering observed and interaction observed. A successful build or screenshot alone does not establish interaction. If required tooling, permission or runtime evidence is unavailable, name the exact missing prerequisite and unproven behavior. Continue independent useful work within scope, but never silently replace required native observation with a browser simulation or claim hypothesis validation or prototype completion while a required check is failed or unavailable. Optional checks may be skipped with a reason when the question remains answerable. Use the existing completion states and continuations; these evidence descriptions are not new statuses.

The root result states the selected runtime and why it fits, candidate verdicts against common criteria, actual evidence, unproven cases, runnable artifact location and what remains disposable. Preserve necessary evidence before authorized cleanup and redact sensitive data in captures/logs. These private references cannot authorize production edits, new dependencies, real-service mutations, tracker changes, publication or cleanup of unrelated work; they produce no independent run or report.

## Completion report and next steps

Apply the shared run contract. Report `Status:`, `Skills used: /qs-design-prototype`, and `Outcome:`.
Include `Specs:` and `Work summary:` with `Finished —` and `Next —`.
Include `Next work prompt:`. Use the exact available literal for the active host. Route entries list Codex, bare slash, and Pi spellings in that order.
Normal routes: `$qs-skills:qs-plan-spec` / `/qs-plan-spec` / `/skill:qs-plan-spec`, `$qs-skills:qs-code-build` / `/qs-code-build` / `/skill:qs-code-build`, `$qs-skills:qs-plan-clarify` / `/qs-plan-clarify` / `/skill:qs-plan-clarify`.
Recovery routes: `$qs-skills:qs-plan-spec` / `/qs-plan-spec` / `/skill:qs-plan-spec`, `$qs-skills:qs-code-build` / `/qs-code-build` / `/skill:qs-code-build`, `$qs-skills:qs-plan-clarify` / `/qs-plan-clarify` / `/skill:qs-plan-clarify`.
