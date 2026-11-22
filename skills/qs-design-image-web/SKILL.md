---
name: qs-design-image-web
description: "Create web design images or prompts"
disable-model-invocation: true
---

# Create web design images or prompts

<!-- qs-runtime-start -->
Before doing any task work, read [the shared run contract](../_shared/runtime/run-contract.md) relative to this invoked `SKILL.md`. Use the actual skill location supplied by the host to resolve it within the same package or canonical tree. Read through the end marker before selecting task tools, delegating, or acting. Then post the contract's initial checklist and progress update in the conversation before starting the task.
Confirm the file starts with `# QuickStark runtime run contract` and ends with `<!-- qs-runtime-run-contract:end -->`. If the host lacks usable read access or cannot locate this skill, report `Input required`. If the expected file is missing, unreadable, invalid, or resolves outside the owning tree, report `Failed`. Give `Status:`, `Skills used: /qs-design-image-web` and an `Outcome:` naming the owning package (qs-frontend) and prerequisite. Include `Specs: Not located` and a short `Work summary:` with `Finished —` and `Next —`. Write `Next work prompt: None — shared run contract unavailable.` Stop before task work. Emit no executable continuation, perform no repair, and use no alternate copy.
<!-- qs-runtime-end -->

Deliver the requested web reference images, or reusable design prompts when the
user asks for prompt-only output. This root does not implement product code.
Prompt-only means zero image calls and zero code execution. Image-only means the
actual requested images are the primary deliverable, accompanied by a concise
chat result. Missing image capability is an unmet requirement, not a generated
image or permission to install an alternate provider.
For prompt-only work, post the initial stage and overall estimates, then
deliver the reusable prompt and the required completion report in chat.

Recover the [shared brief](../_shared/frontend/internal/brief.md), then use
[prompt construction](../_shared/frontend/internal/prompt-construction.md) and
[web images](../_shared/frontend/internal/web-images.md). Load
[design direction](../_shared/frontend/internal/design-direction.md) when direction is
not already fixed. Preserve supplied references, brand and real copy/data.

Set the requested visual scope and image count before allocating calls. Do not
expand a hero into six/eight sections, merge requested readable sections into an
unreadable collage, or silently omit requested images. Keep the shared design
bible consistent. Inspect actual images for clarity and content accuracy; refine
only a missing requested outcome within the available budget. Use actual tool
parameters and report unresolved legibility honestly. Never invoke another public
root automatically.

## Completion report and next steps

Apply the shared run contract. Report `Status:`, `Skills used: /qs-design-image-web`, and `Outcome:`.
Include `Specs:` and `Work summary:` with `Finished —` and `Next —`.
Include `Next work prompt:`. Use the exact available literal for the active host. Route entries list Codex, bare slash, and Pi spellings in that order.
Normal routes: `$qs-skills:qs-flow-handoff` / `/qs-flow-handoff` / `/skill:qs-flow-handoff`.
Recovery routes: `$qs-skills:qs-flow-handoff` / `/qs-flow-handoff` / `/skill:qs-flow-handoff`.
