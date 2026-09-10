# Progress reporting and deployment-prompt acceptance evidence

This implementation follows the conversation specification “QS progress reporting and deployment-prompt generation” (AC-01 through AC-12). The change adds the eighth specialist, `qs-deploy-prompt`, and applies progress reporting to all 52 canonical skills and 20 internal references. The 19 non-packaged skills remain non-packaged. Public packages contain 12 core, 8 specialist, and 13 PS commands. The implementation was verified with package versions aligned at 3.6.5 before the separately authorized 3.7.0 release. These trials do not publish or install an update.

## Architecture and reproducible structural checks

- `scripts/progress-reporting-contract.mjs` owns rendered public/helper progress text, exhaustive inventory validation, and bounded standalone/helper synchronization. The existing output generator invokes it and renders public contracts. It preserves non-managed source content and refuses unknown/missing sources and malformed managed sections.
- `scripts/qs-skill-catalog.mjs` declares the new command and its `goal-workflow-prompt` output kind. The registry validates this exception is confined to the generator; its successful output is a primary execution prompt, not a normal continuation.
- `scripts/goal-workflow.mjs` extends the existing registry-based composition approach with explicit goal selection, rendering, and a pure transition oracle. Existing generic composite workflows retain their previous behavior. This module is a repository validation/reference implementation, not a shipped host runner: skill instructions remain self-contained and packages do not import each other's skill bodies.
- `tests/progress-reporting.test.mjs`, `tests/goal-workflow.test.mjs`, and `tests/deploy-prompt.test.mjs` run through `npm test`. They include preservation/idempotence, malformed and unknown inventory controls, exact literals, authorization and submitted-scope binding, active goal verification, current required check coverage, unchanged ordinary composites, output-kind validation, and prompt/evidence integrity.
- Required checks: `npm run sync:codex`, `npm run check:codex`, `npm test`, and `git diff --check`. Three `claude plugin validate ... --strict` checks are conditional on Claude Code being installed; it was unavailable in this environment, so those CLI checks were not run. Projection integrity tests still exercise all three harnesses.

## Actual agent trials and limitations

Two independent trial agents read the actual canonical skill or rendered execution prompt and generated responses to supplied observations. Their verbatim responses are recorded in `tests/fixtures/progress-deploy-agent-trials/generation.json` and `execution.json`. These are actual model responses to controlled fixture observations. They are not executions against a deployment service, real goal-tool traces, timing benchmarks, or proof of reliable behavior across every model. Intended next tool actions are recorded as data and were not executed. Harness file writes record evidence only, not product mutations.

The generation record hashes the exact tested canonical source. The execution record includes and hashes the exact prompt, rerenderable from `execution-input.json`. Integrity tests fail after a source/prompt change until trials are rerun. The parent reviewed complete responses independently; the responder did not grade itself. Deterministic helper tests are structural policy checks, not evidence that a model followed instructions.

Initial responses remain in `generation-initial.json` and `execution-initial.json`. Initial generation G1/G2 treated documented rollback as authorized recovery, and G1 assigned a file path to a chat-only specification. Instructions were corrected to preserve root output boundaries and require actual rollback authority; the final trial reran those cases. The initial execution record predates the clarified renderer and was superseded by a rerun against the current prompt. No initial response was silently rewritten into a passing result.

## Acceptance audit

| Criterion | Evidence reviewed | Result |
| --- | --- | --- |
| AC-01 exhaustive coverage | Inventory validator compares actual filesystem against catalog public sources, all 19 standalone paths, and all 20 registered internal references; missing/unknown controls | Met |
| AC-02 preservation | Byte-preservation, LF/CRLF/EOF, malformed-marker and idempotence tests; final source diff review | Met |
| AC-03 registration | 33 public commands, eight specialists; canonical metadata, root/bucket indexes, shared registry and package membership tests | Met |
| AC-04 projections | Required synchronization/check plus source equality, explicit-invocation transformations, isolation and manifest-version tests for Claude/Codex/Pi | Met |
| AC-05 truthful progress | E1 distinguishes live process from new progress and polls handle 81; E2 reopens stale build evidence after a CSV regression | Met in controlled agent trial |
| AC-06 generation only | G1/G2/G5 produce a sole prompt and state execution has not started; all generation cases request no goal, publication or mutation actions | Met in controlled agent trial |
| AC-07 stage selection | G1 selects missing specification and build; G5 starts from the existing spec; G2 omits already-satisfied build/review work; selector negative controls | Met in controlled agent trial and structural checks |
| AC-08 prerequisites | G3 reports missing target/authority/goal support; G4 reports unavailable build skill; G6 isolates absent goal tools despite otherwise complete scope | Met in controlled agent trial |
| AC-09 authorization | E3 advances under existing commit/push grant; E4 blocks revoked authorization; E8 blocks target drift; structural scope checks reject even broadly granted alternate targets | Met in controlled agent trial and structural checks |
| AC-10 orchestration | E3 advances verified matching continuation; E9 rejects failed-root deployment suggestion; ordinary-composite negative checks and output-kind isolation tests | Met in controlled agent trial and structural checks |
| AC-11 failure/resumption | E2/E9 repair in the current root; E5 reuses valid build/Git evidence and monitors existing J42 without republishing | Met in controlled agent trial |
| AC-12 deployment evidence | E5 rejects queued job/old health version as delivery; E6 requires exact artifact/version, target, HTTP health and acceptance evidence before requesting goal completion | Met in controlled agent trial; no actual deployment performed |

## Operational boundary

Generation is read-only and returns one execution prompt. Submission authorizes only its named sequence, operations and targets; it cannot alter host controls or erase an unrelated goal. Changed scope, revoked grants, missing credentials/capabilities and unverified checks stop dependent work. No live goal or deployment is required to verify this generator change, and none was started by the trial agents. The implementation task itself uses the user's separately established active goal.
