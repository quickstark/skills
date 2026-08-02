# QuickStark v3 skill-run contract

Every public invocation has one root skill, one bounded outcome, one normalized result, and one authenticated hosted readout. Public skills never automatically start another public skill. Internal capabilities and bounded helpers remain evidence inside the root run and never appear as independent skills used.

## Modes

`effort=quick|standard|deep` controls investigation and validation depth. `standard` is the default. Quick uses one focused evidence pass and targeted checks. Standard performs the normal evidence pass and permits one bounded repair/recheck cycle where mutation is authorized. Deep broadens evidence and checks while remaining bounded to the requested outcome and mutation scope.

`report=brief|full` controls presentation independently. `brief` is the default and contains the status, outcome, at most three decision-grade findings or decisions, noteworthy failed checks, material outputs, hosted URL, and required continuation. `full` adds the evidence trail, complete applicable checks and outputs, secondary findings, and alternatives. It never adds another continuation.

## Completion state

- `complete`: the requested outcome is achieved, required checks pass, and no actionable P0/P1 finding remains. It emits no next prompt.
- `continuation-required`: the bounded outcome is finished but a distinct public workflow is necessary for the larger stated goal. It emits exactly one copy-ready prompt.
- `input-required`: work requires one material user decision, permission, or unavailable input. It emits exactly one prompt that requests and carries that input forward.
- `failed`: execution or validation did not produce a usable outcome. It emits at most one recovery prompt when a concrete action can resolve the failure.

## Normalized result

The result records the root skill, effort, report mode, completion state, concise outcome, real decisions and findings, material outputs, checks actually performed, verified execution evidence, and zero or one continuation. Failed required checks and actionable P0/P1 findings cannot normalize as complete. The renderer applies omission rules and projects both the in-chat summary and hosted report from this result.

## Safety

Effort never expands mutation scope, authorizes destructive work, permits publication, or turns monitoring into an indefinite loop. Only explicitly authorized roots edit files. Review defaults to read-only. Release and Git publication retain their independent approval and verification gates.
