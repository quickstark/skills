# QuickStark v3 skill-run contract

Every public invocation has one root skill, one bounded outcome, one normalized result, and one authenticated hosted readout. Public skills never automatically start another public skill. Internal capabilities and bounded helpers remain evidence inside the root run and never appear as independent skills used.

## Modes

`effort=quick|standard|deep` controls investigation and validation depth. `standard` is the default. Quick uses one focused evidence pass and targeted checks. Standard performs the normal evidence pass and permits one bounded repair/recheck cycle where mutation is authorized. Deep broadens evidence and checks while remaining bounded to the requested outcome and mutation scope.

`report=brief|full` controls presentation independently. `brief` is the default and contains the status, outcome, at most three decision-grade findings or decisions, noteworthy failed checks, material outputs, hosted URL, one preferred next prompt, and two alternatives. `full` adds the evidence trail, complete applicable checks and outputs, and secondary findings. It never adds more prompts.

## Completion state

- `complete`: the requested outcome is achieved, required checks pass, and no actionable P0/P1 finding remains.
- `continuation-required`: the bounded outcome is finished but a distinct public workflow is necessary for the larger stated goal.
- `input-required`: work requires one material user decision, permission, or unavailable input.
- `failed`: execution or validation did not produce a usable outcome.

Every non-release result emits three ranked copy-ready prompts regardless of completion state. The first is the opinionated preferred route; the remaining two are alternatives. A failed result promotes a catalog-approved recovery route when one exists. `/qs-deploy-release` is terminal and emits no next prompts.

## In-chat continuation format

Write the first continuation beneath `Preferred next prompt:` and the other two beneath `Alternative next prompt:`. Put each in its own fenced `text` code block. The fence info string must be exactly `text` so the chat renders it as Plain text; never use `markdown`, `bash`, `json`, or another language. In Codex each prompt begins with the exact installed plugin literal—`$qs-skills:<core-command>`, `$qs-specialists:<specialist-command>`, or `$ps-skills:<ps-command>`—and in Claude it begins with `/<command>`. Keep each prompt concise: carry forward the outcome and only the single highest-value evidence item. Model and thinking guidance remains outside the fence in a separate muted blockquote.

## Normalized result

The result records the root skill, effort, report mode, completion state, concise outcome, real decisions and findings, material outputs, checks actually performed, verified execution evidence, and its ranked prompt set. Failed required checks and actionable P0/P1 findings cannot normalize as complete. The renderer applies omission rules and projects both the in-chat summary and hosted report from this result.

## Safety

Effort never expands mutation scope, authorizes destructive work, permits publication, or turns monitoring into an indefinite loop. Only explicitly authorized roots edit files. Review defaults to read-only. Release and Git publication retain their independent approval and verification gates.

When a run claims behavior, prefer proof through the real artifact or public seam. Temporary evidence and bounded helpers remain inside the root; any state needed for resumption must be recorded explicitly rather than assumed to exist in private transcript history.
