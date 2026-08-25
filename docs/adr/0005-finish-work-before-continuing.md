# Finish bounded work before recommending continuation

QuickStark completions expose verified project state without manufacturing a workflow loop. A non-release result emits at most one copy-ready next-work prompt, tied to an exact verified ticket, specification, issue, or grouped work item. A complete result with no verified remaining work emits none.

Build, Review with mutation authority, and Debug finish their authorized implementation, repair, internal review, testing, and validation within the active root. They return `continuation-required` only for genuinely distinct work or separately authorized scope, not to delegate an unfinished part of their own outcome to another evaluation skill.

This replaces ADR 0003's fixed three-prompt rule and the corresponding continuation paragraph in ADR 0004. It preserves one-root reporting, mutation boundaries, terminal release behavior, and the rule that public skills never start automatically.

The optional prompt remains a single fenced `text` block as copy-ready text. Plain skill Markdown cannot request or guarantee a host Add or context action. Line-specific code-review findings continue to use the separate inline-comment directive contract only when the active client supplies it and the finding has a host-renderable file range.
