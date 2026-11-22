---
name: qs-learn-teach
description: "Teach one bounded subject through explanation, practice, and feedback."
---

# Teach a subject

<!-- qs-runtime-start -->
Before doing any task work, read [the shared run contract](../../capabilities/runtime/run-contract.md) relative to this invoked `SKILL.md`. Use the actual skill location supplied by the host to resolve it within the same package or canonical tree. Read through the end marker before selecting task tools, delegating, or acting. Then post the contract's initial checklist and progress update in the conversation before starting the task.
Confirm the file starts with `# QuickStark runtime run contract` and ends with `<!-- qs-runtime-run-contract:end -->`. If the host lacks usable read access or cannot locate this skill, report `Input required`. If the expected file is missing, unreadable, invalid, or resolves outside the owning tree, report `Failed`. Give `Status:`, `Skills used: /qs-learn-teach` and an `Outcome:` naming the owning package (qs-specialists) and prerequisite. Write `Next work prompt: None — shared run contract unavailable.` Stop before task work. Emit no executable continuation, perform no repair, and use no alternate copy.
<!-- qs-runtime-end -->

This optional specialist establishes the learner's goal, current knowledge, constraints, and desired depth. Build a short sequence from prerequisite concepts to practical application, checking understanding with focused exercises or questions.

Quick provides the minimum working mental model and one exercise. Standard provides a practical learning sequence with feedback. Deep covers alternative models, edge cases, and a more demanding capstone while remaining bounded to the subject.

Minimize reader load: introduce vocabulary only when it unlocks the next concept, connect explanations to real artifacts, and use predict-then-reveal or corrected practice when it materially improves retention.

Do not turn a learning request into implementation or research automatically. Recommend one distinct workflow only when the learning outcome genuinely requires it.

Only for a requested durable learning workspace, load the needed formats: [MISSION-FORMAT.md](MISSION-FORMAT.md) for goals, [GLOSSARY-FORMAT.md](GLOSSARY-FORMAT.md) for established vocabulary, [LEARNING-RECORD-FORMAT.md](LEARNING-RECORD-FORMAT.md) for demonstrated understanding, and [RESOURCES-FORMAT.md](RESOURCES-FORMAT.md) for sources. Reuse existing paths and requested scope. An explanation or deeper effort alone does not authorize course scaffolding, file writes, resource subscriptions, or joining communities.

## Completion report and next steps

Apply the shared run contract. Report `Status:`, `Skills used: /qs-learn-teach`, and `Outcome:`.
Include `Next work prompt:`. Use the exact available literal for the active host. Route entries list Codex, bare slash, and Pi spellings in that order.
Normal routes: `$qs-specialists:qs-plan-research` / `/qs-plan-research` / `/skill:qs-plan-research`, `$qs-specialists:qs-design-prototype` / `/qs-design-prototype` / `/skill:qs-design-prototype`, `$qs-specialists:qs-skill-write` / `/qs-skill-write` / `/skill:qs-skill-write`.
Recovery routes: `$qs-specialists:qs-plan-research` / `/qs-plan-research` / `/skill:qs-plan-research`, `$qs-specialists:qs-design-prototype` / `/qs-design-prototype` / `/skill:qs-design-prototype`, `$qs-specialists:qs-skill-write` / `/qs-skill-write` / `/skill:qs-skill-write`.
