# Using PS skills

`ps-skills` is an optional toolkit for evidence-heavy investigation, controlled experiments, reusable verification, and bounded repository operations. Use it when the immediate outcome is to understand, diagnose, measure, compare, or safely operate on a specific target. Use the core QS workflow when the outcome is broader planning, implementation, repair, review, Git integration, or release.

The package is Cursor-neutral. It does not require Cursor services, transcript access, issue trackers, chat, observability, or other optional providers.

## Invocation contract

All thirteen PS commands are explicit-only: the model does not invoke them automatically. In Codex, start the request with the installed plugin literal:

```text
$ps-skills:ps-how Explain how authentication state moves from the API boundary to the session store.
```

Claude Code uses the slash form:

```text
/ps-how Explain how authentication state moves from the API boundary to the session store.
```

Every invocation has one public root command, one bounded result, and no automatic public-command chaining. A result can recommend a PS or QS command, but you decide whether to run it. Add `effort=quick|standard|deep` to control evidence depth and `report=brief|full` to control presentation; the defaults are `standard` and `brief`.

If the correct root is unclear, use `ps-help`. It recommends one PS or QS workflow without starting it or changing files.

## Command chooser

| Command | Use it when you need to… | Authority and stopping point |
| --- | --- | --- |
| [`ps-help`](./ps-help.md) | choose the right PS or QS workflow from a desired outcome | Read-only routing. It does not run the selected command. |
| [`ps-how`](./ps-how.md) | understand how one subsystem works through entry points, state transitions, boundaries, and outputs | Read-only. It explains verified behavior but does not implement changes. |
| [`ps-why`](./ps-why.md) | investigate why a behavior or design exists using attributable evidence | Read-only. It distinguishes supported rationale from inference and does not redesign the behavior. |
| [`ps-blast-radius`](./ps-blast-radius.md) | map the callers, contracts, data, tests, deployment, and operational surfaces affected by one proposed change | Read-only. It ranks evidence and leaves implementation or repair to a separate workflow. |
| [`ps-runtime-forensics`](./ps-runtime-forensics.md) | diagnose one live runtime symptom from bounded measurements | Diagnosis only. Temporary evidence artifacts are allowed; tracked product changes are not. |
| [`ps-trace-forensics`](./ps-trace-forensics.md) | diagnose one supplied trace, profile, recording, or diagnostic artifact | Read-only. It does not repair product behavior or add durable instrumentation. |
| [`ps-create-verification-skill`](./ps-create-verification-skill.md) | create a project-local, rerunnable verification driver and feature map | May change only selected verification assets, never product behavior or publication state. |
| [`ps-maintain-verification-skill`](./ps-maintain-verification-skill.md) | reconcile an existing verification workflow with observed product behavior | May update only selected verification assets. Product defects are reported, not repaired. |
| [`ps-skill-eval`](./ps-skill-eval.md) | compare a skill or prompt variant with its control through blinded, recorded trials | Limited to evaluation fixtures and the selected skill source. Failed trials remain visible. |
| [`ps-hillclimb`](./ps-hillclimb.md) | improve one declared metric through bounded, measured experiments | May edit only the selected implementation scope. It never commits, pushes, opens a PR, merges, deploys, or releases. |
| [`ps-visual-parity`](./ps-visual-parity.md) | converge a selected implementation toward an immutable visual baseline | May edit only the selected implementation. A declared tolerance is required and the baseline cannot be altered. |
| [`ps-pr-babysit`](./ps-pr-babysit.md) | assess one pull request and, when authorized, repair blockers on its selected branch or worktree | Inspect-only by default. Pushes require explicit authority; merging, auto-merge, deployment, and release are always out of scope. |
| [`ps-worktree-cleanup`](./ps-worktree-cleanup.md) | audit reclaimable Git worktrees and remove exact confirmed targets | Read-only first. Removal requires confirmation bound to the exact eligible worktree list; other caches or application data are separate scopes. |

## Choosing between similar commands

### `ps-how` or `ps-why`

Use `ps-how` for mechanics: “What path does this request take?” or “How is this state updated?” Use `ps-why` for rationale: “Why is this boundary asynchronous?” or “Why was this fallback retained?” Chronology alone does not prove intent, so `ps-why` may conclude that the rationale is unknown.

### Runtime or trace forensics

Use `ps-runtime-forensics` when the symptom is currently observable and measurements must be collected from a bounded environment and time window. Use `ps-trace-forensics` when you already have a trace, profile, recording, or similar artifact. Both stop at diagnosis; use `qs-code-debug` separately when a product repair is desired.

### Create or maintain verification

Use `ps-create-verification-skill` when no suitable project-local verification workflow exists. Use `ps-maintain-verification-skill` when a driver and feature map already exist but may have drifted. Both require a real harness and update verification assets only.

### Evaluation, hillclimbing, or visual parity

- Use `ps-skill-eval` to compare a skill or prompt control and variant across a declared task set and rubric.
- Use `ps-hillclimb` to improve one numeric or otherwise objectively measured implementation metric through keep-or-revert experiments.
- Use `ps-visual-parity` for an image-based target with a fixed baseline, stable capture environment, declared comparison metric, and approved tolerance.

These commands do not accept “looks better” as sufficient proof. They require a baseline or control, a measurement method, a bounded budget, and a stopping rule.

### PR babysitting or Git integration

Use `ps-pr-babysit` to monitor and truthfully assess one PR, or to repair its branch when that authority is explicit. Use `qs-git-merge` for the separate decision to integrate approved changes. `ps-pr-babysit` never merges or enables auto-merge.

## Inputs that prevent ambiguous runs

Give the command a narrow target and the evidence contract it needs:

- For `ps-how`, `ps-why`, and `ps-blast-radius`, name the subsystem, behavior, symbol, contract, schema, or proposed change and the question you need answered.
- For runtime forensics, include the symptom, environment, time window, expected baseline, and access limits.
- For trace forensics, supply the artifact plus its capture context, tool/version, time range, and expected baseline. Redact secrets and sensitive payloads before sharing it.
- For verification creation or maintenance, identify the project-local asset scope, real harness, target behavior, and repository conventions.
- For skill evaluation, declare the control, variant, task set, rubric, assignment method, retry policy, budget, and stopping rule. Transcript or run-history evidence is optional and must be explicitly selected and scoped.
- For hillclimbing, declare the metric, credible baseline, target, experiment budget, measurement command, accepted-change rule, rollback criterion, and noise handling.
- For visual parity, provide the immutable baseline and hash, stable capture environment, comparison metric, iteration budget, and repository-declared or user-approved tolerance.
- For PR babysitting, identify the repository and PR and say whether the run is inspect-only or authorized to repair and push the selected branch.
- For worktree cleanup, request an audit first. Confirm removal only after reviewing the exact canonical paths, branches, revisions, dirty state, and merge state.

## How PS and QS fit together

PS commands usually produce evidence or a tightly bounded operational result. QS commands own the broader engineering lifecycle:

| After the PS result… | Use a separate QS command when you want to… |
| --- | --- |
| `ps-how`, `ps-why`, or `ps-blast-radius` established the current behavior or impact | clarify a material decision with `qs-plan-clarify`, write the implementation contract with `qs-plan-spec`, or build with `qs-code-build` |
| runtime or trace forensics isolated a reproducible defect | repair it with `qs-code-debug` |
| verification assets, an experiment, or visual parity work changed selected files | independently inspect them with `qs-review-code` or verify behavior with `qs-test-verify` |
| a PR is assessed as ready | integrate it through `qs-git-merge` |
| work must continue in another task or environment | preserve the verified state with `qs-flow-handoff` |

Recommendations are copy-ready handoffs, not automatic execution. Effort never expands mutation authority, and a PS command cannot turn an analysis request into implementation, publication, or destructive cleanup.

## Internal capabilities are not commands

The package also contains sixteen host-neutral capabilities used inside PS runs, such as boundary discipline, context discipline, rerunnable tooling, structural enforcement, and type-system discipline. They are implementation techniques, not public picker entries; invoke one of the thirteen `ps-` commands instead.

See the [PS command index](./index.md) for individual reference pages and the [shared skill-run contract](../skill-run-contract.md) for completion states, direct chat results, and continuation behavior.
