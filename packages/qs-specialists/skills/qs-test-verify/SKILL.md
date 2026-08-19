---
name: qs-test-verify
description: "Run and report a selected software verification matrix without changing the software."
disable-model-invocation: true
---

# Verify software without changing it

Execute and report one selected verification matrix. This is a read-only verification workflow: it does not diagnose or repair product failures and never changes expectations merely to obtain a passing result.

Verify the real artifact, interface, or user-visible seam whenever practical. Record the exact command, environment, observed result, and limitations so the evidence is independently rerunnable; a mocked internal assertion alone does not prove an end-to-end claim.

## Inputs and matrix selection

Accept a verification target such as a change set, component, package, application, suite, command, or named behavior. The user may also identify required suites, environments, platforms, browsers, services, allowed skips, retry policy, or required artifacts.

When no matrix is supplied, derive the smallest credible matrix from repository instructions, package scripts, CI configuration, changed paths, and the selected target. Do not claim that an unsupported platform or unavailable environment was tested.

## Read-only boundary

- The skill does not edit source, tests, snapshots, configuration, or expectations and does not fix failures.
- Test processes may create declared ephemeral outputs such as coverage, screenshots, traces, logs, or temporary databases. Detect material worktree changes, distinguish pre-existing files from run-created artifacts, and report unexpected results.
- Do not update snapshots, accept golden files, install dependencies, provision infrastructure, deploy software, or access production merely to make verification pass.
- External services, paid resources, privileged devices, production-like environments, and destructive commands require explicit authority and available task-relevant credentials.

## Behavior

1. Inspect repository instructions, dirty state, documented verification commands, CI configuration, available runtimes, and the selected target.
2. Resolve the requested or evidence-derived verification matrix before execution, marking checks as required, optional, or unavailable.
3. Run non-destructive focused checks first and broaden only within the agreed matrix and authority.
4. Record each suite or environment as passed, failed, skipped, or blocked with the actual command or observable interface and concise evidence.
5. Do not rerun failures merely to obtain a pass. Retry only an identified transient condition within a declared bound and retain both attempts.
6. Leave diagnosis and repair outside this run. Preserve the smallest reliable reproducer or failure boundary supported by the results for a separate `/qs-code-debug` workflow.
7. Inspect post-run state for source mutations, unexpected artifacts, secrets, and incomplete cleanup before reporting the outcome.

## Failure handling

- A failed required check prohibits completion.
- Treat an unavailable check as skipped only when the acceptance contract permits it; otherwise report it as blocked or failed.
- Keep product failures unfixed and classify infrastructure, credential, permission, runner, and environment failures separately.
- Never include secrets, full sensitive logs, or credential values in the readout.

A complete result executes every required feasible check in the agreed matrix, reports honest pass/fail/skipped evidence, leaves no unauthorized source mutation, and satisfies the stated acceptance requirements.

Do not automatically invoke debug, build, review, Git, deployment, or another public skill.

## Completion report and next steps

This invocation has one root skill: `/qs-test-verify`. Internal capabilities and bounded helpers remain part of this run; never automatically invoke another public skill or create another skill report.

Normalize explicit flags first, then unambiguous natural-language intent, then defaults: `effort=quick|standard|deep` defaults to `standard`; `report=brief|full` defaults to `brief`. Effort changes evidence depth, not mutation scope or report length.

Produce one normalized result using `complete`, `continuation-required`, `input-required`, or `failed`. Every result emits three ranked copy-ready prompts: one opinionated preferred prompt followed by two alternatives. Failed required checks or actionable P0/P1 findings prohibit `complete`.

The default ranked continuations are `/qs-git-merge`, `/qs-code-debug`, `/qs-review-code`. A failed result instead ranks `/qs-code-debug`, `/qs-review-code`, `/qs-flow-handoff`. Tailor each prompt to the actual result instead of starting it.

Create a small JSON input with the actual root `skill`, `effort`, `report`, `completionState`, concise `outcome`, and only real decisions, findings, outputs, checks, execution evidence, and continuation. List only the root public skill in `skillsUsed`; internal capabilities are evidence, not skills used. Follow the shared policy in `docs/skill-run-contract.md`.

Render the one authenticated report:

```bash
node "<QuickStark root>/scripts/qs-skill-readout.mjs" render --require-hosted --input "<absolute-path-to-readout.json>"
```

Present only the independently accepted `https://reports.quickstark.com/` URL. If authentication or hosted publication fails, state `Readout: Not created — <actual reason>` and preserve any private recovery artifact without exposing its path, localhost, or a private-IP URL.

Brief in-chat output contains Status, Outcome, up to three important findings or decisions, noteworthy failed checks, material outputs, Readout, one preferred prompt, and two alternatives. Full adds the evidence trail but never extra prompts. Omit empty sections and routine successful detail.

Status: Complete | Continuation required | Input required | Failed
Skills used: /qs-test-verify
Outcome: Concise verified result.
Readout: Verified https://reports.quickstark.com/ report URL only.
Preferred next prompt: one copy-ready prompt in a fenced `text` block
Alternative next prompts: two copy-ready prompts, each in its own fenced `text` block

Present prompts in normalized rank order. Label the first `Preferred next prompt:` and the remaining two `Alternative next prompt:`. Put each complete prompt in its own fenced `text` block beginning with its exact Codex skill literal ($qs-skills:qs-git-merge, $qs-skills:qs-code-debug, $qs-skills:qs-review-code, $qs-skills:qs-flow-handoff); Claude uses `/qs-git-merge`, `/qs-code-debug`, `/qs-review-code`, `/qs-flow-handoff`. The fence info string must be exactly `text` so the chat renders it as Plain text; never use `markdown`, `bash`, `json`, or another language. Keep every prompt concise and carry forward only the outcome plus the single highest-value evidence item. Put heuristic model/thinking guidance outside each fence in a muted blockquote. Never change the active model or reasoning setting.
