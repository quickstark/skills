# Optional Pstack skills

`ps-skills` is an independently installable package of thirteen explicit-only, Cursor-neutral workflows. Every invocation owns one bounded result presented directly in chat; no command starts another public skill automatically.

For outcome-based selection, required inputs, and PS-to-QS handoff boundaries, start with [Using PS skills](./using-ps-skills.md).

Install it after adding the QuickStark marketplace:

```bash
codex plugin marketplace add ./codex
codex plugin add ps-skills@quickstark
```

Claude uses `claude plugin install ps-skills@quickstark`. Codex commands use `$ps-skills:<command>` and Claude commands use `/<command>`.

## Commands

1. [`ps-help`](./ps-help.md) — choose a PS or QS workflow without starting it.
2. [`ps-how`](./ps-how.md) — explain how a subsystem works.
3. [`ps-why`](./ps-why.md) — explain attributable rationale.
4. [`ps-blast-radius`](./ps-blast-radius.md) — map the impact of one proposed change.
5. [`ps-runtime-forensics`](./ps-runtime-forensics.md) — diagnose one live runtime symptom.
6. [`ps-trace-forensics`](./ps-trace-forensics.md) — diagnose one supplied trace artifact.
7. [`ps-create-verification-skill`](./ps-create-verification-skill.md) — create a rerunnable verification workflow.
8. [`ps-maintain-verification-skill`](./ps-maintain-verification-skill.md) — reconcile verification coverage with reality.
9. [`ps-skill-eval`](./ps-skill-eval.md) — compare a control and variant through blinded trials.
10. [`ps-hillclimb`](./ps-hillclimb.md) — improve one metric through bounded experiments.
11. [`ps-visual-parity`](./ps-visual-parity.md) — converge to an immutable visual baseline using a declared tolerance.
12. [`ps-pr-babysit`](./ps-pr-babysit.md) — assess and, when authorized, repair one pull request without merging it.
13. [`ps-worktree-cleanup`](./ps-worktree-cleanup.md) — audit and remove only exact confirmed worktrees by default.

The adaptation is based on pstack `0.14.1` at commit `63d938c2e4a165a0fec1bd0f61a8e325f0cb751e`. See [third-party notices](../../THIRD_PARTY_NOTICES.md).
