# Finish bounded work before recommending continuation

QuickStark completions expose verified project state without manufacturing a workflow loop. The readout separates the bounded root outcome from the larger project state: `Finished —` records what the run completed and validated, while `Next —` records up to three verified pending or blocked work items. Completion of the current root never proves that the project backlog is empty.

Build, Review with mutation authority, and Debug finish their authorized implementation, repair, internal review, testing, and validation within the active root. They return `continuation-required` only for genuinely distinct work or separately authorized scope, not to delegate an unfinished part of their own outcome to another evaluation skill.

This replaces ADR 0003's fixed three-prompt rule and the corresponding continuation paragraph in ADR 0004. It preserves one-root reporting, mutation boundaries, terminal release behavior, and the rule that public skills never start automatically.

A non-release result always shows the `Next work prompt:` label. When `Next —` contains an actionable item owned by an eligible route, the result includes one fenced `text` block that names the exact ticket, specification, issue, or grouped work item—even when the current root completed successfully. It writes `None` only after checking the available governing specs, task history, ticket plans, and tracker context. Plain skill Markdown cannot request or guarantee a host Add or context action. Line-specific code-review findings continue to use the separate inline-comment directive contract only when the active client supplies it and the finding has a host-renderable file range.
