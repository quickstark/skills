---
name: qs-plan-explore
description: A relentless interview to sharpen a plan or design.
---

Run a `/qs-plan-interview` session.

## Completion report and next steps

Finish with a concise, readable completion report. Plain text or restrained Markdown is sufficient; do not create a separate report or HTML file unless this skill's primary workflow requires one.

```text
Status: Completed | Awaiting input | Blocked
Skills used: /qs-plan-explore; /another-skill only if actually used
Outcome: What was completed, discovered, decided, or is blocking progress.
Outputs: Real files, reports, decisions, or changes, when applicable.
Checks: Only the tests, validations, or observations actually performed.
Next best: /qs-skill-name — why it is the best next step.
```

Always include **Status**, **Skills used**, **Outcome**, and **Next best**. Omit **Outputs** or **Checks** when none exist. List only skills that actually ran; a recommendation belongs under **Next best**, not **Skills used**. Never claim a check, artifact, or result you did not verify.

Select at most three genuinely relevant follow-ons from:

- `/qs-plan-clarify` — Ground the explored idea in an actual codebase and durable decisions.
- `/qs-plan-research` — Investigate assumptions or unknowns exposed during exploration.
- `/qs-plan-spec` — Capture a sufficiently settled idea as a specification.

Explain why the recommendation advances the actual work. If the request is finished, say `Next best: None — the requested work is complete.` If input or approval is required, name the decision and do not imply that a suggested skill has already run.
