# Frozen instruction-efficiency experiment

The full matched comparison is authorized and capture is underway. No candidate
has been adopted; independent semantic/quality review remains required.

- `plan.json` records scope, source hashes, unchanged host settings, trial order,
  three repetitions, retry rules, telemetry and acceptance requirements. The
  pre-comparison amendment extends only execution infrastructure; original inputs,
  instructions, rubric and scheduled run order remain frozen.
- `scenarios.json` preserves all 25 historical inputs plus 12 additional cases.
- `variants/r17` and `variants/r42` are neutral, non-discoverable instruction and
  private-reference snapshots. The plan's role mapping must stay hidden from the
  responder and blinded reviewer until ratings are complete.
- `reviewer-only.json` contains the frozen hard gates and quality rubric. The
  responder never receives it or historical expected responses.
- `schedule.json` specifies 222 matched/interleaved runs. A separate blinded
  reviewer and explicit authorization of the comparison are still required.
- `pilot/` retains the failed read-only initialization and the successful permitted
  retry. Each includes exact prompts, raw JSONL/stderr, usage and response records.
  These infrastructure attempts are excluded from comparison repetitions.

Run `node scripts/skill-efficiency-trials.mjs verify` to validate frozen evidence.
The two pilot attempts are already consumed. The authorized `compare` command
executes/resumes the frozen schedule, refusing a duplicate live runner. It retains
every attempt and streams raw evidence before completion. `export-review` emits a
neutral response/rubric bundle; do not give reviewers the adjacent operator-only
mapping. Do not rewrite failed attempts or update historical response hashes.
There is no adoption command.

The successful pilot used two actual Codex rounds with a controller-supplied
ROUTING.md reference. No real tool events or temporary file changes occurred.
Usage includes substantial opaque host context and full replay overhead. Effective
runtime model identity and skill-only tokenizer counts were not exposed; the
configured model was recorded separately. Empty-CWD/tool-event detection is not a
hard pre-execution isolation guarantee.

`plan-before-permitted-state-retry.json` and `plan-used-for-permitted-pilot.json`
preserve the exact plans bound by the two attempt summaries. The current plan
corrects the timing label to Date.now wall-clock measurement; no task, threshold,
variant or order changed. No latency/cost improvement is established.

Comparison capture uses a monotonic elapsed timer and also records wall-clock delta.
`runner-before-comparison.mjs` and `plan-before-comparison.json` preserve the earlier
pilot infrastructure. Completed run records are ungraded, not semantic passes.
A predeclared baseline-token variance trigger can expand the matched workload to
five repetitions; baseline-quality variance remains for the independent reviewer.
