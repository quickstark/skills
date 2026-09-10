# QuickStark v3 skill-run contract

Every public invocation has one root skill, one bounded outcome, and one normalized result presented directly in chat. Public skills never automatically start another public skill. Internal capabilities and bounded helpers remain evidence inside the root run and never appear as independent skills used.

## Conversation progress

Keep a checklist in the conversation. During long operations, tell me the current stage, whether progress is continuing, and whether you need anything from me. Verify each completed stage. Finish with a short explanation of what was configured, which checks passed, and what remains.

Use pending, active, verified, skipped, blocked, and failed stage states. Only verified stages receive completed checkboxes. Cite evidence for skipped work and reopen stages invalidated by later observations. Running processes and elapsed time alone do not prove progress. Aim for updates within sixty seconds while work is active when the host allows control to return; say when waiting and whether user input is needed. Read-only runs describe findings rather than claiming configuration. This applies independently of effort and report modes.

All canonical skills receive this contract, including non-packaged reference skills. Internal capabilities contribute evidence to the parent's checklist without producing their own reports or status. Bounded managed sections preserve unrelated source content; generated packages remain projections.

## Explicit goal workflow exception

`qs-deploy-prompt` is a read-only generator. Its sole successful copy-ready output is an execution prompt beginning with an instruction to establish or resume the scoped goal before mutations. This output kind is declared explicitly in the catalog. Generating, displaying, or quoting it does not execute it or grant permissions. Missing material inputs produce Input required instead of an execution-ready prompt.

Only user submission explicitly requesting the goal sequence activates the outer coordinator. Each stage remains a separate public root with its own authority and truthful report. Ordinary public skills never start other roots. Existing generic composite workflows keep their existing stop behavior.

The goal coordinator advances only after verified bounded completion; a Continuation required result advances only when its verified bounded outcome and exact requested next skill match the next preauthorized stage. Failed checks, actionable P0/P1 findings, Failed and Input required prevent dependent stages. Authorized in-root repair can continue. Separate recovery workflows must already be authorized; otherwise request the missing decision. Suppress redundant copy-ready prompts only for already-scheduled work, preserving per-root reports.

Carry the submitted scope's standing authorization forward without repeated confirmations. Bind it to repository, operations, branch/remote and selected environment, and honor changed targets, revocations and host controls. Do not manufacture permission from the words goal mode or implicit approvals. Check installed skills and real goal tools, read goal state, never replace an unrelated active goal, and verify goal establishment before mutation. Preserve only explicitly supplied budgets and follow host goal status/cancellation rules. Unsupported goal capability is an input blocker, not ordinary execution mislabeled as goal mode.

Persist stage/revision evidence, authorization and remaining work in conversation for resumption. Inspect remote state before repeating publication or deployment. Changed artifacts invalidate relevant earlier checks. A terminal release result closes that root; the coordinator closes the goal only after all required stages pass and authoritative target, deployed artifact/version, and health evidence agree. Configured, queued, and command success alone are insufficient.

Packages may contain generated routing metadata but never import another package's skill bodies. Missing required skills are reported without installation. Readiness depends on verified actual availability, not catalog membership alone.

## Modes

`effort=quick|standard|deep` controls investigation and validation depth. `standard` is the default. Quick uses one focused evidence pass and targeted checks. Standard performs the normal evidence pass and permits one bounded repair/recheck cycle where mutation is authorized. Deep broadens evidence and checks while remaining bounded to the requested outcome and mutation scope.

`report=brief|full` controls chat presentation independently. `brief` is the default and contains status, outcome, at most three decision-grade findings or decisions, noteworthy failed checks, material outputs, the required work summary for tracked engineering work, and the next-work prompt label. `full` adds the evidence trail, complete applicable checks and outputs, and secondary findings. It never adds more prompts.

## Completion state

- `complete`: the requested outcome is achieved, required checks pass, and no actionable P0/P1 finding remains.
- `continuation-required`: the bounded outcome is finished but a distinct public workflow is necessary for the larger stated goal.
- `input-required`: work requires one material user decision, permission, or unavailable input.
- `failed`: execution or validation did not produce a usable outcome.

A non-release result emits at most one copy-ready next-work prompt. For `qs-deploy-prompt`, that single prompt is its generated goal workflow rather than an ordinary continuation. Completion of the current root does not prove that the larger project is complete. Emit a prompt when a distinct, verified actionable item remains and a catalog-approved public root owns that work, even when the current root completed successfully. A failed result promotes one catalog-approved recovery route when one exists. `/qs-deploy-release` is terminal and emits no next prompt.

Do not chain several public roots into a generic re-evaluation pipeline. Build, Review with mutation authority, and Debug own the implementation, repair, review, testing, and validation required to finish their bounded outcome. A continuation must move to genuinely distinct work; it must not repeat planning, review, debugging, implementation, or verification that already succeeded without new evidence.

## Clear-writing pass

Apply the internal clear-writing pass to every QS and PS result after facts, inferences, and uncertainties are separated:

1. Lead with the outcome or finding.
2. Use concrete nouns and verbs and remove empty intensifiers.
3. Preserve necessary technical terms, citations, qualifications, and uncertainty labels.
4. Remove repetition that does not change the reader's decision.

This is an internal synthesis step, not another public invocation. It never receives a separate status, skills-used entry, output, or continuation.

## In-chat result

Present the result directly in the current conversation. Create no secondary result artifact or external URL.

Use these labels when their sections are present:

```text
Status: Complete | Continuation required | Input required | Failed
Skills used: /<root-command>
Outcome: <concise verified result>
```

Omit empty sections and routine successful detail. A brief result shows no more than three important findings or decisions. A full result may add supporting evidence but must preserve the same outcome and prompt set.

## Specifications and remaining build

Engineering workflows that plan, implement, diagnose, review, test, integrate,
release, or hand off tracked work add two fields to every result:

- `Specs:` contains clickable Markdown links to the verified governing
  specifications found in explicit input, repository documentation, or a
  verified tracker. When none can be located, it says `Not located`; it never
  invents a link.
- `Work summary:` is a compact readout with `Finished —` naming the bounded
  outcome, meaningful validation, and material outputs, followed by `Next —`
  listing up to three highest-priority verified pending or blocked tickets,
  specifications, issues, or grouped work items as `linked id — state — next
  action`. Resolve that state from explicit input, available task history,
  repository specifications or ticket plans, and a configured tracker. Group
  items only when they share the same state and next action. Say no work was
  verified only after checking the available governing sources.

These fields summarize verified project state. They do not create a new spec,
expand mutation authority, or turn unrelated local notes into backlog scope.

## Continuation format

Always write the `Next work prompt:` label. When the `Next —` readout contains a distinct actionable item owned by an eligible route, write one copy-ready prompt in a fenced `text` code block even if the current root is complete. The fence info string must be exactly `text` so the chat renders it as Plain text; never use `markdown`, `bash`, `json`, or another language. Do not replace the fence with inline prose, a bare command, or a link. When no eligible continuation is warranted after checking the governing sources, write `Next work prompt: None — no follow-on needed.`

In Codex the prompt begins with the exact installed plugin literal—`$qs-skills:<core-command>`, `$qs-specialists:<specialist-command>`, or `$ps-skills:<ps-command>`—in Claude it begins with `/<command>`, and in Pi it begins with `/skill:<command>`. Name the exact verified ticket, specification, issue, or grouped work item it advances. Keep the prompt concise: carry forward the outcome and only decisive evidence needed to resume. Model and thinking guidance remains outside the fence in a separate muted blockquote.

The fenced prompt is copy-ready only. Plain skill Markdown cannot request or guarantee an Add action. Line-specific review findings keep the separate host inline-comment contract when the active client supplies it and the finding has a host-renderable file range. Never repurpose that contract for tickets, specifications, continuation prompts, or generic references, and never claim that an inline card rendered without host or user evidence.

## Safety

Effort never expands mutation scope, authorizes destructive work, permits publication, or turns monitoring into an indefinite loop. Only explicitly authorized roots edit files. Review defaults to read-only. Release and Git publication retain their independent approval and verification gates.

When a run claims behavior, prefer proof through the real artifact or public seam. Temporary evidence and bounded helpers remain inside the root; any state needed for resumption must be recorded explicitly rather than assumed to exist in private transcript history.
