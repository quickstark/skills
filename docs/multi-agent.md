# Multi-agent delegation

QuickStark roots can split independent work across subagents. The rules are in the [skill-run contract](skill-run-contract.md#delegation); the design record is the [multi-agent delegation spec](specs/quickstark-multi-agent-delegation.md).

## What delegates

| Root | Delegated work | Fallback |
| --- | --- | --- |
| `qs-review-code` | Standards, Spec and (deep or security-sensitive) Security axes as parallel read-only reviewers | Same axes reviewed serially |
| `qs-plan-spec` | Read-only exploration of independent evidence surfaces | Serial exploration |
| `qs-plan-research` (specialists) | One background reader that writes a notes file | Reading in the root |
| `qs-code-build mode=graph` | One implementer per frontier ticket in its own worktree, optional explorer, final review axes and one fixer | Frontier tickets one at a time in the current tree |
| `qs-how`, `qs-why`, `qs-blast-radius`, `qs-skill-eval`, `qs-hillclimb`, `qs-pr-babysit` (advanced) | Independent evidence partitions or units | Serial partitions |

Every helper starts with a fresh context window, receives context pointers instead of copied history, and returns at most 400 words or a declared schema. The root owns synthesis, merges and completion. `effort=quick` never fans out. Delegation never widens edit, Git, publication or installation authority; graph mode needs explicit branch and worktree authority before it creates either.

## Per host

QuickStark packages stay skills-only and generic: they ship no host-specific agent definitions. Each host's own generic subagents receive the brief, which carries the scope, read-only or write limits and the return shape.

- **Claude Code.** Roots start Claude Code's general-purpose subagents. They follow your permission rules; nesting depth and concurrency follow Claude Code's own limits.
- **Codex.** Codex starts subagents when skill instructions request delegation. Roots use Codex's built-in agents with the same briefs; sandbox and approval settings stay inherited from the parent session. Project-defined custom agents in `.codex/agents/` remain your own configuration.
- **Pi.** Pi has no built-in subagents. QuickStark runs every delegated unit serially with the same acceptance criteria.

## Choosing graph mode or qs-unlazy

Use `qs-code-build mode=graph` for a specification whose tickets carry `Blocked by` edges. Use `qs-unlazy` from the optional `qs-execution` package when substantial work needs explicit per-leaf acceptance gates, claims and ledgers.
