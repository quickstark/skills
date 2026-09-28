# Bound task guidance

The following source bodies are supplied verbatim as guidance, not invocations. Relative links are historical labels, NOT paths to open from this copied file. Resolve applicable private references only to the embedded sections below. Do not traverse parent directories, search installed skills, or read other public skill bodies. All scenario-required private guidance is included. The user task and explicit authority remain controlling.

{
  "skills/frontend/internal/brief.md": "Embedded section 2",
  "skills/frontend/internal/design-direction.md": "Not applicable to the selected scenario; do not load or search for it.",
  "skills/frontend/internal/dimensional-style.md": "Not applicable to the selected scenario; do not load or search for it.",
  "skills/frontend/internal/implementation.md": "Not applicable to the selected scenario; do not load or search for it.",
  "skills/frontend/internal/mobile-images.md": "Embedded section 4",
  "skills/frontend/internal/prompt-construction.md": "Embedded section 3",
  "skills/frontend/internal/redesign.md": "Not applicable to the selected scenario; do not load or search for it.",
  "skills/frontend/internal/restrained-style.md": "Not applicable to the selected scenario; do not load or search for it.",
  "skills/frontend/internal/web-images.md": "Not applicable to the selected scenario; do not load or search for it."
}


## Embedded section 1


---
name: qs-design-image-mobile
description: "Create mobile screen images or prompts"
disable-model-invocation: true
---

# Create mobile screen images or prompts

Deliver the requested mobile screen images or prompt-only output. Preserve iOS,
Android or cross-platform intent, screen/state coverage, logical flow, navigation,
safe areas, and raw-screen versus device-frame preference. These are app screens,
not website sections. This root never implements product code.

Recover the [shared brief](../../frontend/internal/brief.md), then use
[prompt construction](../../frontend/internal/prompt-construction.md) and
[mobile images](../../frontend/internal/mobile-images.md). Keep one design bible
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

Keep a checklist in the conversation. Report the current stage and estimated stage and overall completion, whether progress is continuing, and whether you need anything from me. Verify each completed stage. Finish with a short explanation of what was configured, which checks passed, and what remains.

Start with a concise checklist of meaningful stages; one stage is enough for a short task. Label stages pending, active, verified, skipped, blocked, or failed. Only verified stages receive completed checkboxes; explain skipped stages. Verify each stage against relevant artifacts, command results, sources, or observable behavior before checking it off. A failing required check prevents completion; reopen a verified stage when later evidence invalidates it.

During long operations, aim for updates within sixty seconds when the host allows control to return. State the current stage, observed progress or waiting state, and whether user input is needed. Distinguish a process that is running from confirmed progress; elapsed time alone proves neither progress nor completion. Finish with what changed or was configured, checks passed or failed, and remaining work. Read-only runs describe findings without implying mutations. Apply this contract regardless of effort or report mode; brief output may compress evidence but retains blockers and failed checks.

Report at task start, meaningful stage transitions, material progress changes, blockers, resumption, and completion. Use: `Stage: <name> | Stage estimate: ~<N>% | Overall estimate: ~<N>% | <state> — <observed progress or waiting>. Input needed: <none or exact need>`. Overall means the bounded root task for a standalone skill, or the entire authorized goal for a submitted multi-stage workflow. Within a goal, label a root's own completion separately; finishing one root does not make the goal 100% complete.

Assign meaningful stages approximate effort weights at the start and compute overall progress as sum(weight × stage estimate) / sum(in-scope weights). Base stage estimates on verified milestones, observed partial work, and remaining effort; checklist item counts, elapsed time, token consumption, or a running process alone are not progress. Use coarse estimates without decimal precision and explain low confidence. Keep weights stable unless evidence changes the work breakdown; explain recalibration, added work, reopened checks, and any decrease. Explain skipped stages: remove out-of-scope work from the denominator without awarding credit, and credit previously satisfied in-scope work only with current verification evidence; a skipped label alone earns nothing. Helpers contribute evidence to their parent's estimate without separate public reports or double-counting.

Keep the last defensible estimate while waiting or blocked unless evidence changes it; state the required input or external event. Preserve the scope, weights, estimates, and supporting revision/evidence for resumption; reuse only still-valid evidence and reopen invalidated checks. Never reset valid progress or count resumed work twice. Reserve stage 100% for verified stage completion and overall 100% for verified completion of the whole stated scope. Cap unverified estimates at 95% when rounding to coarse values so rounding cannot imply completion. Failed required checks, unresolved acceptance criteria, or actionable P0/P1 findings prohibit completion regardless of the estimate. Percentages never override status or verification gates.
A user-submitted explicit goal workflow may coordinate successive authorized roots after verified completion. Each root retains its report and authority. Suppress redundant continuation prompts only for work already scheduled by that coordinator; ordinary invocations never start another public skill automatically.

This invocation has one root skill: `/qs-design-image-mobile`. Internal capabilities and bounded helpers stay inside this run and never appear as separately used skills. Present the result directly in chat and create no secondary result artifact or URL.

Normalize explicit flags first, then clear natural-language intent, then defaults. `effort=quick|standard|deep` controls evidence depth and defaults to `standard`; `report=brief|full` controls presentation and defaults to `brief`. Neither changes mutation authority.

Resolve governing work context from explicit input, referenced task history available in the host, repository specifications or ticket plans, and a verified tracker when configured. Do not treat completion of the current root as proof that the larger project is complete. Every result must include `Specs:` with clickable Markdown links to verified specifications; when none can be located, write `Specs: Not located` and never invent a link. Never omit `Specs:` or `Work summary:`.
Write `Work summary:` as a compact readout with `Finished —` naming the bounded outcome, meaningful validation, and material outputs, followed by `Next —` outlining up to three highest-priority verified pending or blocked tickets, specifications, issues, or grouped work items as `linked id — state — next action`. Group items only when they share the same state and next action. When no remaining item can be verified, write `Next — None verified after checking the linked specs, available task history, and tracker context.`

Use `complete`, `continuation-required`, `input-required`, or `failed`. The current root being `complete` does not prove that the larger project is complete. Emit at most one copy-ready next-work prompt when a distinct verified actionable item remains and an eligible route owns it. Failed required checks or actionable P0/P1 findings prohibit `complete`.

Eligible next routes: `/qs-flow-handoff`. Failure routes: `/qs-flow-handoff`. Select one route only when it owns unfinished work. Do not recommend a review, verification, planning, diagnosis, or implementation step already completed without new evidence that it must be repeated.

Before responding, apply the internal clear-writing pass: lead with the outcome, use concrete nouns and verbs, preserve necessary qualifications and technical terms, and remove repetition. It never appears as another skill, status, or continuation.

Brief output always contains status, outcome, specs, the compact work summary with Finished and Next entries, noteworthy failed checks, material outputs, and the Next work prompt label. Full adds the evidence trail, never more prompts. Omit empty optional sections and routine success detail; never omit the required readout fields.

Status: Complete | Continuation required | Input required | Failed
Skills used: /qs-design-image-mobile
Outcome: Concise verified result.
Specs: verified specification link(s) | Not located
Work summary:
- Finished — exact bounded outcome, meaningful validation, and material outputs
- Next — up to three linked pending or blocked items with state and next action | None verified after checking available sources
Next work prompt: None | one copy-ready prompt in a fenced `text` block

Always write `Next work prompt:`. When a distinct verified actionable item exists, put one fenced `text` block beneath it beginning with its exact Codex literal ($qs-skills:qs-flow-handoff); Claude uses `/qs-flow-handoff`; Pi uses `/skill:qs-flow-handoff`. Name the exact verified ticket, specification, issue, or grouped work item it advances and carry forward only decisive evidence. Do not replace the fenced block with inline prose, a bare command, or a link. When `Next` lists a pending or blocked actionable item and an eligible route owns it, the fenced `text` prompt is required even when the current root is complete. Only when no eligible actionable item remains, write `Next work prompt: None — no follow-on needed.` The fenced prompt is copy-ready only; plain skill Markdown cannot request or guarantee an Add action. Keep model guidance outside the fence and never change the active model or reasoning setting.



## Embedded section 2


# Shared frontend brief

Recover settled decisions from the request and project before asking questions.
Keep this compact record in working context; create a file only when it is a
requested deliverable or useful project convention:

- Intent: audit, preserve, overhaul, image-only, prompt-only, or implementation.
- Audience and concrete task; existing product versus marketing concept.
- Authoritative references and relevant paths; identity/hash when exact parity
  matters. Record gaps as gaps, not permission to replace a supplied design.
- Brand, existing fonts/icons/tokens, exact copy, claims/data, URLs, analytics,
  stable IDs, integrations and behavior to preserve.
- Platform, requested states, viewports/screens, safe areas and accessibility.
- Deliverable, requested image/screen count and device-frame preference; available
  tool capability, time/iteration budget and already approved changes.

The user's brief and existing design system override style presets. Preserve real
round metrics, dates, prices, names and claims exactly; never randomize them to
look less generic. For a new concept, label draft copy and illustrative data.
Missing real content must not become an invented factual claim.

Carry explicit brand tokens into the components they govern. A declared font or
radius is not permission to invent a secondary face or smaller control radius.
Retain existing documented component variants; otherwise use the supplied values
consistently, including inputs and buttons. Verify computed styles at the target
sizes so browser defaults and later overrides cannot silently change the brand.

Do not turn this schema into a compulsory interview. Resolve routine choices from
evidence. Ask only when a missing choice materially changes the authorized result.
Prompt-only means no image calls, code edits or deployment. Audit-only means no
implementation edits. Image-only means primary images and no product code.

Private references guide this root; they never expand its authority, create another
public invocation or authorize dependency installation and external publication.



## Embedded section 3


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



## Embedded section 4


# Platform-aware mobile images

Preserve the selected iOS, Android or cross-platform mode. Use its established
navigation, controls and system-region conventions. Check current project/platform
references when details matter instead of inventing native components. A neutral
cross-platform design must not arbitrarily mix conflicting platform patterns.

Create the requested screens in a plausible flow. Retain state between screens and
make the action leading to the next screen clear. Onboarding, sign-in, permissions,
home, detail, checkout and confirmation are examples, not a mandatory screen pack.
Do not add unrequested states merely to make the output look larger.

Use the shared design bible for palette/type/spacing, navigation, surfaces, icons,
imagery and device framing. Respect raw-screen versus device-frame preference;
keep frame scale/style consistent if frames are requested. Allow text and controls
room for status regions, home indicators, keyboard, cutouts and comfortable touches.
Do not put decorative text inside reserved system regions or shrink a flow into
an unreadable collage.

Keep the first screen clear and subsequent screens purposefully varied. Use real
copy/data, strong contrast and legible labels. Image-bearing cards need intentional
aspect ratios/crops; background imagery cannot obscure text. Reflect loading, empty,
error and selected states when requested. An image cannot prove actual accessibility.

Prompt-only produces reusable screen prompts with zero image calls. Image-only
uses an available tool and presents the requested images with no product code.
Inspect results and refine only unmet requested outcomes within the budget; report
missing capability and imperfect rendering honestly.
