# Present every QuickStark result in chat

> The direct-chat decision remains active. Its three-prompt continuation rule is superseded by [ADR 0005](./0005-finish-work-before-continuing.md).

QuickStark will present every QS and PS result directly in the current conversation. A public run returns one normalized result containing its status, outcome, decision-grade evidence, material failures or outputs, and catalog-approved continuation prompts. Non-release commands emit one preferred prompt and two alternatives; `qs-deploy-release` remains terminal.

Before presentation, every public command applies the same internal clear-writing pass: lead with the outcome, use concrete language, preserve necessary technical terms and uncertainty, and remove repetition. This pass is part of the root run. It is never listed as another skill, given its own status, or exposed as a continuation.

This decision supersedes hosted-output requirements in ADR 0001, historical specifications, and prior generated contracts. It does not change the twelve core, seven specialist, or thirteen explicit-only PS commands; package isolation; invocation modes; completion states; or continuation routing.

## Consequences

- Canonical skills, concise documentation, and generated Claude, Codex, and Pi projections share one direct-chat completion contract.
- The reporting renderer, portfolio and settings helpers, browser prototypes, ingestion API description, deployment definition, operational guide, browser-only tests, and package support copies are removed.
- Historical specifications and research remain available with explicit supersession notices.
- Production service retirement is staged: release and verify the chat-only packages first, then stop the reporting containers and routes. Preserve historical report data and dormant producer configuration for rollback unless a later authorized cleanup removes them.
