# QuickStark multi-agent delegation

Status: implemented in the working tree; not yet committed, reviewed for adoption, versioned or released.

## Problem

Core QuickStark roots never started subagents. No core skill requested delegation, the advanced-package capabilities only permitted it ("Optional helpers may run concurrently when available"), and Codex starts subagents only on a direct request or when skill instructions request delegation. Ticket plans were ordered lists without explicit blocking edges, so no root could run independent tickets concurrently.

## Governing decisions

1. The graph is ticket data walked by one authorized root. Public roots never start other public roots; there is no skill-to-skill graph.
2. Delegation rules live once in the [skill-run contract](../skill-run-contract.md#delegation) and once in the core-private `delegation` capability. Packages keep their own private closure; the specialists and advanced packages state the same rule inline.
3. Every subagent starts with a fresh context window, not a fork of the parent conversation. Communication uses context pointers and bounded returns of at most 400 words or a declared schema.
4. Delegation never expands mutation, Git, publication or installation authority. Without subagent support the same units run serially with identical acceptance criteria.
5. Nesting depth, concurrency and tool access are host controls. Skills do not restate recursion guards.
6. Ticket-graph execution is `qs-code-build mode=graph`, not a new public command. It stays lighter than `qs-unlazy` orchestrated mode, which keeps its gate-ledger driver for work that needs per-leaf acceptance gates.
7. Packages stay generic and skills-only. QuickStark ships no host-specific agent declarations; roots use each host's generic subagents and the brief carries scope, tool limits and the return shape. The native installer's skills-only package contract stays unchanged.

## Required behavior

### Phase 1 — portable delegation prose

- `docs/skill-run-contract.md` has a Delegation section with the fresh-context rule, context pointers, bounded returns, root ownership, serial fallback, effort mapping (`quick` none, `standard` at least two independent units, `deep` broader) and the authority limit.
- `skills/internal/delegation.md` is a v3-native core capability owned by `qs-code-build`, `qs-review-code` and `qs-plan-spec`, projected into every core host package.
- `qs-review-code` validates its target before fan-out, runs Standards and Spec axes (plus Security at `effort=deep` or for security-sensitive targets) as parallel read-only fresh-context reviewers, presents axes side by side without cross-axis reranking, and falls back to serial review.
- Ticket decomposition records explicit `Blocked by` edges, defines the frontier, sizes each ticket to one fresh context window, wires edges after identifiers exist, and keeps the wide-refactor expand/migrate/contract exception.
- `qs-plan-research` may delegate substantial reading to one background fresh-context helper that writes a notes file and returns a pointer; the root verifies cited sources before reporting.
- Advanced `parallel-coverage` and `concurrency-ownership` use the conditional fresh-context directive instead of permissive wording.

### Phase 2 — `qs-code-build mode=graph`

- `mode=single` (default) is unchanged. `mode=graph` requires a specification and a ticket graph with `Blocked by` edges; otherwise it ends `input-required` and routes to `qs-plan-spec`.
- Integration-branch and worktree creation require explicit authority in the request. Without it, frontier tickets run serially in the current working tree.
- With that authority: optional read-only exploration helper writing notes outside the repository; one fresh implementer per frontier ticket in its own worktree based on the integration-branch tip; implementers use the internal TDD loop and merge the integration tip before reporting; the root serializes merges, re-checks shared state, recomputes the frontier and launches newly unblocked tickets.
- After the last ticket: one internal parallel review pass using the `qs-review-code` axes (without invoking that public skill), one fresh fixer, then full validation.
- Cleanup removes only worktrees the run created. Progress is weighted by verified tickets; a resumable record keeps ticket states, branch and revisions.
- Commit, push and pull-request creation still require explicit authority. Commit authority without push authority yields a local integration branch.

### Phase 3 — host behavior without declarations

- No package ships agent definitions: the Claude manifests declare no `agents`, and no generated package contains `agents/` or `agent-roles/`.
- Pi has no built-in subagents and uses the serial fallback.
- Host behavior is documented in [multi-agent delegation](../multi-agent.md).

## Verification

- `tests/multi-agent-delegation.test.mjs` asserts the wording, registration, projection and skills-only package contracts above.
- Required checks: `npm run sync:codex` (no further diff), `npm run check:codex`, `npm test`, and `claude plugin validate <root> --strict` for all six package roots.

## Provenance

Repository-authored. Requirements were informed by `mattpocock/skills` commits `7739eaed7f8f3915437a8def198a6d0d7206dbc7` (fresh context, not a fork), `a496f5513d4a4cf889bc48e189e579f4b0bdf6aa` (implement-spec task graph) and `3da8c01116264675eeefbd6e9d59c734de9095cc` (parallel review axes). No upstream skill body is copied. Changed target entries are recorded as `pending` until an adoption review records new evidence.
