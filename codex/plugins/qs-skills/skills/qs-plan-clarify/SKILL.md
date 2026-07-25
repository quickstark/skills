---
name: qs-plan-clarify
description: A relentless interview to sharpen a plan or design, which also creates docs (ADR's and glossary) as we go.
---

Run a `/qs-plan-interview` session, using the `/qs-design-domain` skill.

## Completion report and next steps

Finish with a concise, readable completion report. Plain text or restrained Markdown is sufficient; do not create a separate report or HTML file unless this skill's primary workflow requires one.

```text
Status: Completed | Awaiting input | Blocked
Skills used: /qs-plan-clarify; /another-skill only if actually used
Outcome: What was completed, discovered, decided, or is blocking progress.
Outputs: Real files, reports, decisions, or changes, when applicable.
Checks: Only the tests, validations, or observations actually performed.
Next best: /qs-skill-name — why it is the best next step.
```

Always include **Status**, **Skills used**, **Outcome**, and **Next best**. Omit **Outputs** or **Checks** when none exist. List only skills that actually ran; a recommendation belongs under **Next best**, not **Skills used**. Never claim a check, artifact, or result you did not verify.

Select at most three genuinely relevant follow-ons from:

- `/qs-plan-spec` — Record the agreed requirements as an actionable specification.
- `/qs-plan-research` — Resolve an open question that needs external or primary-source evidence.
- `/qs-design-prototype` — Test a design question that conversation alone cannot settle.

Explain why the recommendation advances the actual work. If the request is finished, say `Next best: None — the requested work is complete.` If input or approval is required, name the decision and do not imply that a suggested skill has already run.
