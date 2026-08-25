# QuickStark v3 skill-run contract

Every public invocation has one root skill, one bounded outcome, and one normalized result presented directly in chat. Public skills never automatically start another public skill. Internal capabilities and bounded helpers remain evidence inside the root run and never appear as independent skills used.

## Modes

`effort=quick|standard|deep` controls investigation and validation depth. `standard` is the default. Quick uses one focused evidence pass and targeted checks. Standard performs the normal evidence pass and permits one bounded repair/recheck cycle where mutation is authorized. Deep broadens evidence and checks while remaining bounded to the requested outcome and mutation scope.

`report=brief|full` controls chat presentation independently. `brief` is the default and contains status, outcome, at most three decision-grade findings or decisions, noteworthy failed checks, material outputs, the applicable work summary, and at most one next-work prompt. `full` adds the evidence trail, complete applicable checks and outputs, and secondary findings. It never adds more prompts.

## Completion state

- `complete`: the requested outcome is achieved, required checks pass, and no actionable P0/P1 finding remains.
- `continuation-required`: the bounded outcome is finished but a distinct public workflow is necessary for the larger stated goal.
- `input-required`: work requires one material user decision, permission, or unavailable input.
- `failed`: execution or validation did not produce a usable outcome.

A non-release result emits at most one copy-ready next-work prompt. Emit it only when a distinct, verified actionable item remains and the selected public root owns that unfinished work. A complete result with no verified remaining work emits none. A failed result promotes one catalog-approved recovery route when one exists. `/qs-deploy-release` is terminal and emits no next prompt.

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
- `Work summary:` records known done, pending, and blocked totals when
  available, then outlines up to three highest-priority verified tickets,
  specifications, issues, or grouped work items as `linked id — state — next
  action`. Group items only when they share the same state and next action. It
  says `None identified against linked specs` only after verifying that
  conclusion against the linked specifications.

These fields summarize verified project state. They do not create a new spec,
expand mutation authority, or turn unrelated local notes into backlog scope.

## Continuation format

Write the optional continuation beneath `Next work prompt:` in one fenced `text` code block. The fence info string must be exactly `text` so the chat renders it as Plain text; never use `markdown`, `bash`, `json`, or another language. When no continuation is warranted, write `Next work prompt: None — no follow-on needed.`

In Codex the prompt begins with the exact installed plugin literal—`$qs-skills:<core-command>`, `$qs-specialists:<specialist-command>`, or `$ps-skills:<ps-command>`—in Claude it begins with `/<command>`, and in Pi it begins with `/skill:<command>`. Name the exact verified ticket, specification, issue, or grouped work item it advances. Keep the prompt concise: carry forward the outcome and only decisive evidence needed to resume. Model and thinking guidance remains outside the fence in a separate muted blockquote.

The fenced prompt is copy-ready only. Plain skill Markdown cannot request or guarantee an Add action. Line-specific review findings keep the separate host inline-comment contract when the active client supplies it and the finding has a host-renderable file range. Never repurpose that contract for tickets, specifications, continuation prompts, or generic references, and never claim that an inline card rendered without host or user evidence.

## Safety

Effort never expands mutation scope, authorizes destructive work, permits publication, or turns monitoring into an indefinite loop. Only explicitly authorized roots edit files. Review defaults to read-only. Release and Git publication retain their independent approval and verification gates.

When a run claims behavior, prefer proof through the real artifact or public seam. Temporary evidence and bounded helpers remain inside the root; any state needed for resumption must be recorded explicitly rather than assumed to exist in private transcript history.
