# QuickStark v3 skill-run contract

Every public invocation has one root skill, one bounded outcome, and one normalized result presented directly in chat. Public skills never automatically start another public skill. Internal capabilities and bounded helpers remain evidence inside the root run and never appear as independent skills used.

## Modes

`effort=quick|standard|deep` controls investigation and validation depth. `standard` is the default. Quick uses one focused evidence pass and targeted checks. Standard performs the normal evidence pass and permits one bounded repair/recheck cycle where mutation is authorized. Deep broadens evidence and checks while remaining bounded to the requested outcome and mutation scope.

`report=brief|full` controls chat presentation independently. `brief` is the default and contains status, outcome, at most three decision-grade findings or decisions, noteworthy failed checks, material outputs, one preferred next prompt, and two alternatives. `full` adds the evidence trail, complete applicable checks and outputs, and secondary findings. It never adds more prompts.

## Completion state

- `complete`: the requested outcome is achieved, required checks pass, and no actionable P0/P1 finding remains.
- `continuation-required`: the bounded outcome is finished but a distinct public workflow is necessary for the larger stated goal.
- `input-required`: work requires one material user decision, permission, or unavailable input.
- `failed`: execution or validation did not produce a usable outcome.

Every non-release result emits three ranked copy-ready prompts regardless of completion state. The first is the opinionated preferred route; the remaining two are alternatives. A failed result promotes a catalog-approved recovery route when one exists. `/qs-deploy-release` is terminal and emits no next prompts.

When the catalog assigns a composite workflow to a root, the preferred prompt
may explicitly name several public roots for the same session. This is one user
authorization prompt, not an automatic skill hop: every root still emits its
own result, the sequence stops after any non-`complete` status, and later roots
receive no mutation, Git, installation, deployment, or publication authority
unless the prompt grants that exact action.

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
- `Remaining build:` gives a concise preview of up to three highest-priority
  pending requirements or tickets and includes a known total when available.
  It says `None identified against linked specs` only after verifying that
  conclusion against the linked specifications.

These fields summarize verified project state. They do not create a new spec,
expand mutation authority, or turn unrelated local notes into backlog scope.

## Continuation format

Write the first continuation beneath `Preferred next prompt:` and the other two beneath `Alternative next prompt:`. Put each in its own fenced `text` code block. The fence info string must be exactly `text` so the chat renders it as Plain text; never use `markdown`, `bash`, `json`, or another language.

In Codex each prompt begins with the exact installed plugin literal—`$qs-skills:<core-command>`, `$qs-specialists:<specialist-command>`, or `$ps-skills:<ps-command>`—in Claude it begins with `/<command>`, and in Pi it begins with `/skill:<command>`. Keep each prompt concise: carry forward the outcome and only the highest-value evidence needed to resume. Model and thinking guidance remains outside the fence in a separate muted blockquote.

## Safety

Effort never expands mutation scope, authorizes destructive work, permits publication, or turns monitoring into an indefinite loop. Only explicitly authorized roots edit files. Review defaults to read-only. Release and Git publication retain their independent approval and verification gates.

When a run claims behavior, prefer proof through the real artifact or public seam. Temporary evidence and bounded helpers remain inside the root; any state needed for resumption must be recorded explicitly rather than assumed to exist in private transcript history.
