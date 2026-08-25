---
name: qs-learn-teach
description: "Teach one bounded subject through explanation, practice, and feedback."
disable-model-invocation: true
---

# Teach a subject

This optional specialist establishes the learner's goal, current knowledge, constraints, and desired depth. Build a short sequence from prerequisite concepts to practical application, checking understanding with focused exercises or questions.

Quick provides the minimum working mental model and one exercise. Standard provides a practical learning sequence with feedback. Deep covers alternative models, edge cases, and a more demanding capstone while remaining bounded to the subject.

Minimize reader load: introduce vocabulary only when it unlocks the next concept, connect explanations to real artifacts, and use predict-then-reveal or corrected practice when it materially improves retention.

Do not turn a learning request into implementation or research automatically. Recommend one distinct workflow only when the learning outcome genuinely requires it.

## Completion report and next steps

This invocation has one root skill: `/qs-learn-teach`. Internal capabilities and bounded helpers stay inside this run and never appear as separately used skills. Present the result directly in chat and create no secondary result artifact or URL.

Normalize explicit flags first, then clear natural-language intent, then defaults. `effort=quick|standard|deep` controls evidence depth and defaults to `standard`; `report=brief|full` controls presentation and defaults to `brief`. Neither changes mutation authority.

Use `complete`, `continuation-required`, `input-required`, or `failed`. Emit at most one copy-ready next-work prompt, and only when a distinct actionable item remains. Omit the prompt when the status is `complete` and there is no verified remaining work. Failed required checks or actionable P0/P1 findings prohibit `complete`.

Eligible next routes: `/qs-plan-research`, `/qs-design-prototype`, `/qs-skill-write`. Failure routes: `/qs-plan-research`, `/qs-design-prototype`, `/qs-skill-write`. Select one route only when it owns unfinished work. Do not recommend a review, verification, planning, diagnosis, or implementation step already completed without new evidence that it must be repeated.

Before responding, apply the internal clear-writing pass: lead with the outcome, use concrete nouns and verbs, preserve necessary qualifications and technical terms, and remove repetition. It never appears as another skill, status, or continuation.

Brief output contains status, outcome, up to three important findings or decisions, noteworthy failed checks, material outputs, the work summary when applicable, and the optional next-work prompt. Full adds the evidence trail, never more prompts. Omit empty sections and routine success detail.

Status: Complete | Continuation required | Input required | Failed
Skills used: /qs-learn-teach
Outcome: Concise verified result.
Next work prompt: None | one copy-ready prompt in a fenced `text` block

Label the optional continuation `Next work prompt:`. When present, put it in one fenced `text` block beginning with its exact Codex literal ($qs-specialists:qs-plan-research, $qs-specialists:qs-design-prototype, $qs-specialists:qs-skill-write); Claude uses `/qs-plan-research`, `/qs-design-prototype`, `/qs-skill-write`; Pi uses `/skill:qs-plan-research`, `/skill:qs-design-prototype`, `/skill:qs-skill-write`. Name the exact verified ticket, specification, issue, or grouped work item it advances and carry forward only decisive evidence. When absent, write `Next work prompt: None — no follow-on needed.` A host may offer an Add action for the fenced prompt, but never claim that it rendered. Keep model guidance outside the fence and never change the active model or reasoning setting.
