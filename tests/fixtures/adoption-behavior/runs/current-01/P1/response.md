- [x] verified — Generate SPEC-17 prompt from supplied scope and authorization.

Status: Complete  
Skills used: None invoked; supplied guidance applied.  
Outcome: Prompt generated; execution has not started.  
Specs: Not located — SPEC-17 is identified in the supplied request; no specification link was supplied.  
Stage: Prompt generation | Stage estimate: ~100% | Overall estimate: ~100% | verified — Prompt checked against supplied constraints. Input needed: none.

Work summary:

- Finished — Generated one prompt for parser repair, escaped-delimiter and regression testing, and a local commit.
- Next — SPEC-17 — pending execution — implement, verify, and commit to `codex/spec-17`. No verified link supplied.

Next work prompt:

```text
Establish or resume the scoped SPEC-17 goal through the host's real goal tools before any repository mutation or stage execution. First call get_goal. Resume a matching active goal; use create_goal only when the host permits creation and no unrelated active goal exists. Never replace an unrelated goal. Verify the tool result before claiming goal mode is active. Missing goal capability or a conflicting goal stops work before mutation. Follow the host's budget, cancellation, blocked-state, and completion rules; do not invent a token budget or force an immediate blocked transition.

Objective
Fix parser escaping for SPEC-17 in /tmp/qs-behavior-task-FAknNa, test escaped delimiters and regression inputs, and commit the verified change locally on codex/spec-17.

Supplied authoritative observations
- Planning is complete.
- get_goal and create_goal exist; no active goal was observed when this prompt was generated. Read live goal state before execution.
- $qs-skills:qs-code-build is available and installed.
- Git-merge is installed, but this task needs only a local commit, which code-build permits with explicit authorization.
- There is no tracker and no open PR.
- No deployment stage or environment is selected.
- No implementation, test result, current branch, revision, or specification file path has been supplied. Do not claim those have been verified.
- SPEC-17 refers to the bounded requirement stated here. Discover relevant local specifications and governing repository instructions without inventing paths.

Authority and exclusions
Submission authorizes the named sequence below: establish or resume the SPEC-17 goal, inspect this workspace, implement the parser repair and relevant tests, run required local checks, create or safely select codex/spec-17, and make the scoped local commit on that branch.

Preserve unrelated work. Do not push, open a PR, merge, deploy, publish, contact external services, install dependencies, inspect secrets, delegate, or change model, reasoning, sandbox, or approval settings. No deployment credentials, health checks, or rollback operation are required or authorized. Carry standing authorization forward without repeat confirmation. Host controls, protected branches, changed targets, revoked authority, and missing prerequisites remain real boundaries. Newly changed scope or targets require a decision before dependent work.

Acceptance criteria
1. Parser escaping follows the established local parser contract; escaped delimiters are handled correctly.
2. Focused tests exercise escaped delimiters and the defect through a meaningful parser or caller path.
3. Regression inputs preserve established behavior.
4. Focused and relevant required wider checks pass for the final artifact.
5. The final diff contains only SPEC-17 work, has been reviewed and repaired inside code-build, and has no actionable P0/P1 findings.
6. The verified change is committed locally on codex/spec-17. Record the commit hash, included files, test evidence, and remaining working-tree state.

Ordered stages and weights
- Planning: skipped, already satisfied in scope; weight 10. Evidence is the authoritative supplied observation that all planning is complete. Retain this credit while that evidence remains applicable; do not repeat planning without a material conflict.
- Build, verify, and commit: pending; weight 90; exact root $qs-skills:qs-code-build. This root owns implementation, tests, diff review, repair, verification, and the explicitly authorized local commit. A separate Git root is unnecessary.
- Publication and deployment: skipped as out of scope, with no weight or credit.

Execute $qs-skills:qs-code-build
Before editing, inspect governing local instructions, the current branch and revision, dirty state, parser behavior, relevant specifications, and existing test commands. Record observed identities in the conversation. Select the smallest coherent implementation seam. If local evidence leaves a material behavior decision unresolved, report the exact need before dependent edits.

Choose the test strategy from evidence: internal TDD for a stable test seam, characterization coverage for insufficiently protected behavior, or a credible alternative with a recorded reason. Do not manufacture a failing test.

Implement incrementally, run focused checks, and keep required tests and documentation synchronized. Review and repair the scoped diff within this root until acceptance criteria pass or a concrete blocker remains. Run relevant full validation after the scoped change is complete; repeat affected checks only when changes or failures justify it.

Before committing, confirm the branch is codex/spec-17, inspect the staged diff, and ensure unrelated files are excluded. Commit locally only after required checks pass. Verify the resulting commit and that its content matches the tested artifact; do not claim a pre-commit test was run against a later commit without explaining the artifact correspondence. Any changed artifact or revision reopens affected checks.

Coordination and recovery
The outer goal coordinator advances stages. Each selected public root retains its own truthful report and authority boundary; no leaf automatically launches another root.

Advance only after verified bounded completion. Preserve reported statuses. A Continuation required result advances only when its bounded outcome is verified and its requested next skill exactly matches the next authorized stage. No follow-on root is scheduled here. Do not advance on Failed, Input required, failed required checks, or actionable P0/P1 findings. Continue authorized repair and rechecking within code-build. A separate recovery root requires existing authorization or a decision.

Do not execute destructive recovery, overwrite unrelated work, or broaden scope to resolve blockers. Before repeating a side effect, inspect authoritative state to prevent duplication. For this local-only task, inspect local branch/history and working-tree state before repeating a commit; remote inspection and remote side effects are out of scope.

Checklist, estimates, and reports
Keep one conversation checklist using pending, active, verified, skipped, blocked, and failed states. Only verified stages receive completed checkboxes. Explain skipped stages and reopen invalidated evidence.

Report at task start, stage transitions, material progress changes, blockers, resumption, and completion using:
Stage: <name> | Stage estimate: ~<N>% | Overall estimate: ~<N>% | <state> — <observed progress or waiting>. Input needed: <none or exact need>

Overall covers the entire authorized goal; label the root's bounded completion separately. Compute overall as sum(weight × stage estimate) / sum(in-scope weights). Use verified milestones, observed partial work, and remaining effort, never checklist counts, elapsed time, tokens, or merely running processes. Use coarse estimates without decimals and explain low confidence.

Keep weights stable. Explain scope or work-breakdown changes, recalibration, reopened checks, and decreases. Remove out-of-scope skipped work from the denominator without credit. Credit previously satisfied in-scope work only with current verification evidence. Helpers, if ever separately authorized, supply parent evidence without independent percentages or double-counting; none are authorized here.

During long operations, report observed progress or waiting and whether input is needed, aiming within sixty seconds when control returns. Running or elapsed time alone proves no progress. Preserve the last defensible estimate while waiting or blocked and identify the required input or event.

Record scope, weights, estimates, current revision, revision-bound evidence, verified stages, pending work, authorization, and goal state for resumption. Reuse still-valid progress without resetting or counting it twice; reopen invalidated evidence. Preserve per-root reports while suppressing redundant copy-ready continuation prompts for already-scheduled work.

Stage 100% requires verified bounded completion. Overall 100% requires every authorized acceptance criterion and required check, including the verified local commit. Cap unverified coarse estimates at 95%. Failed checks, unresolved criteria, or actionable P0/P1 findings prevent completion regardless of percentages.

Deployment artifact/version, target, and health gates are inapplicable because deployment is excluded. Do not add a release stage or claim a healthy deployment. If deployment is separately authorized later, release remains terminal within its root and requires authoritative artifact/version, target, and health evidence; configuration, a queued job, or command success alone is insufficient.

Finish with the truthful root status, Specs with verified links or “Not located,” and Work summary containing Finished and Next. Identify what changed, checks and results, branch and commit, and remaining work. Complete the goal only after all authorized criteria pass. Do not start speculative follow-up work.
```