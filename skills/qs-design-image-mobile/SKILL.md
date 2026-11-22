---
name: qs-design-image-mobile
description: "Create mobile screen images or prompts"
disable-model-invocation: true
---

# Create mobile screen images or prompts

<!-- qs-runtime-start -->
Before doing any task work, read [the shared run contract](../_shared/runtime/run-contract.md) relative to this invoked `SKILL.md`. Use the actual skill location supplied by the host to resolve it within the same package or canonical tree. Read through the end marker before selecting task tools, delegating, or acting. Then post the contract's initial checklist and progress update in the conversation before starting the task.
Confirm the file starts with `# QuickStark runtime run contract` and ends with `<!-- qs-runtime-run-contract:end -->`. If the host lacks usable read access or cannot locate this skill, report `Input required`. If the expected file is missing, unreadable, invalid, or resolves outside the owning tree, report `Failed`. Give `Status:`, `Skills used: /qs-design-image-mobile` and an `Outcome:` naming the owning package (qs-frontend) and prerequisite. Include `Specs: Not located` and a short `Work summary:` with `Finished —` and `Next —`. Write `Next work prompt: None — shared run contract unavailable.` Stop before task work. Emit no executable continuation, perform no repair, and use no alternate copy.
<!-- qs-runtime-end -->

Deliver the requested mobile screen images or prompt-only output. Preserve iOS,
Android or cross-platform intent, screen/state coverage, logical flow, navigation,
safe areas, and raw-screen versus device-frame preference. These are app screens,
not website sections. This root never implements product code.

Recover the [shared brief](../_shared/frontend/internal/brief.md), then use
[prompt construction](../_shared/frontend/internal/prompt-construction.md) and
[mobile images](../_shared/frontend/internal/mobile-images.md). Keep one design bible
across the screen set while varying composition according to the screen's task.
Preserve brand and factual content; do not randomize metrics, names or prices.

Prompt-only returns reusable prompts with no image calls or execution. Image-only
returns the actual requested images, with no code implementation. Respect count,
platform and framing rather than adding screens or shrinking them into a collage.
Inspect readability, system regions and continuity; refine only missing requested
outcomes within budget. Report unavailable image capability or failed generation
honestly without mandatory provider setup or invented images. Private references
stay inside this root and never invoke public skills.

## Completion report and next steps

Apply the shared run contract. Report `Status:`, `Skills used: /qs-design-image-mobile`, and `Outcome:`.
Include `Specs:` and `Work summary:` with `Finished —` and `Next —`.
Include `Next work prompt:`. Use the exact available literal for the active host. Route entries list Codex, bare slash, and Pi spellings in that order.
Normal routes: `$qs-skills:qs-flow-handoff` / `/qs-flow-handoff` / `/skill:qs-flow-handoff`.
Recovery routes: `$qs-skills:qs-flow-handoff` / `/qs-flow-handoff` / `/skill:qs-flow-handoff`.
