# Build a reusable design prompt

Translate the settled brief into a self-contained prompt. Preserve requested output
type and scope: one hero, a named set of sections, a mobile flow, or an implementation
reference. Do not silently expand a small request into six/eight images or extra
screens. If count is materially ambiguous, settle it before spending image calls.

Include audience/task, authoritative references, exact content, design bible,
composition, hierarchy, type scale, spacing, visual assets/treatment, requested
canvas and readable detail. State which elements are fixed and which permit design
exploration. For related outputs, repeat the shared identity constraints and state
the individual section/screen's purpose and transition from adjacent states.

Web prompts describe viewport, focal point, CTA hierarchy and section boundaries.
Use separate readable section images when requested, preserving their count and
continuity. Mobile prompts describe platform, navigation, safe areas, system regions,
keyboard/state handling, screen order and raw-screen versus device-frame preference.
Do not describe website hero/footer sections as mobile app screens.

Use specific visual instructions, not claims of an expensive agency aesthetic.
Describe image subject, crop, lighting/material and contrast where relevant; use
layout and typography when the brief asks for restraint. Tell the image model to
preserve supplied names/numbers/copy, then inspect whether it actually did.

For prompt-only work, return the reusable prompt(s) directly and stop before image
generation or code execution. Prompt construction is a private technique, never a
call to another public image skill. Deliverable prompts are distinct from the single
allowed next-work prompt in the completion report.
