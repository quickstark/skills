# Restore specs-and-tickets visibility in the core planner

**Implementation status:** Complete; focused TDD coverage, generated projections, and the full repository validation suite pass.

## Outcome

Make the existing core `qs-plan-spec` command visibly advertise both outcomes under the exact user-facing name **QS Plan: Specs & Tickets**. Preserve the twelve-command `qs-skills` core, the seven-command `qs-specialists` package, and ticket decomposition as an internal capability owned only by `qs-plan-spec`.

## Problem

QuickStark v3 retained ticket decomposition but internalized the former `qs-plan-tickets` command into `qs-plan-spec`. The canonical skill already creates dependency-ordered, independently verifiable tickets when requested, required by the configured tracker, or needed for safe assignment. However, the catalog and picker currently present the command as **QS Plan: Specification**, describe only a spec, and default to a specification-only prompt. A user browsing installed skills can therefore reasonably conclude that ticketing disappeared.

This is a discovery defect. It does not require another public command or a change to the underlying ticket-decomposition behavior.

## Governing decisions

1. The exact display name is **QS Plan: Specs & Tickets**.
2. The public command remains `qs-plan-spec`; do not add, restore, alias, or route through `qs-plan-tickets`.
3. `ticket-decomposition` remains an internal capability owned only by `qs-plan-spec` and produces no independent status, readout, or continuation.
4. The default core remains exactly twelve commands. The specialists package remains exactly seven commands and does not gain a ticket command.
5. A specification-only request still produces no tickets. A ticket request still produces dependency-ordered, independently verifiable slices in the same `qs-plan-spec` run.
6. Existing continuation destinations, lifecycle order, invocation policy, report profile, completion contract, and model guidance remain unchanged.

## Required behavior

### Catalog and picker metadata

Update the canonical `qs-plan-spec` metadata to these exact user-facing strings:

- Display name: `QS Plan: Specs & Tickets`
- Short description: `Turn agreed requirements into a spec or tickets`
- Default intent: `turn the agreed requirements into an actionable specification or dependency-aware implementation tickets`
- Codex default prompt: `Use $qs-plan-spec to turn the agreed requirements into an actionable specification or dependency-aware implementation tickets.`

The catalog remains the source of truth for display metadata. The matching canonical `agents/openai.yaml` must use the same display name and semantically identical description and prompt. Generated Codex projections must be regenerated, not edited independently.

### Canonical skill instructions

Keep the current behavioral boundary while making both modes obvious at first read:

- Describe the root outcome as an actionable specification, dependency-aware tickets, or both when explicitly requested.
- Retain the rule that settled product decisions are not reopened without contradictory project evidence.
- Retain the internal domain-modeling, module-decomposition, and ticket-decomposition capability rules.
- Retain the ticket contents: one independently verifiable outcome per slice, scope, acceptance evidence, dependencies, and explicit exclusions.
- Retain the prohibition on automatically starting implementation.

The public command name and skill frontmatter name remain `qs-plan-spec`.

### Help, routing, and continuations

Update user-facing routing copy so a user looking for ticketing is directed to `qs-plan-spec`:

- `qs-help` should describe the lifecycle position as confirmed work needing an actionable spec or dependency-aware tickets.
- The root README should describe `qs-plan-spec` as writing actionable specifications or dependency-aware tickets.
- Catalog-approved continuation instructions that recommend `qs-plan-spec` should mention the ticket outcome where doing so remains concise and truthful. Do not change their destination, rank, availability, or recovery role.
- Do not add `qs-plan-tickets` to help tables, aliases, wrappers, manifests, marketplaces, first-action validation, or continuation routes.

### Documentation

Regenerate the concise `docs/engineering/qs-plan-spec.md` page so it:

- Uses the title `QS Plan: Specs & Tickets`.
- States that the same root command can produce a specification, tickets, or both when requested.
- Explains that specification-only requests do not create tickets.
- Identifies ticket decomposition as internal behavior rather than another installable command.

Keep the v2-to-v3 migration row unchanged: `qs-plan-tickets` remains an internal capability whose destination is ticket decomposition in `qs-plan-spec`. Existing architecture and v3 consolidation documents remain authoritative unless an implementation check finds a statement that incorrectly claims tickets are unavailable.

## Implementation boundaries

Expected source changes are limited to:

- `scripts/qs-skill-catalog.mjs`
- `scripts/sync-v3-docs.mjs`
- `skills/engineering/qs-plan-spec/SKILL.md`
- `skills/engineering/qs-plan-spec/agents/openai.yaml`
- `skills/engineering/qs-help/SKILL.md`
- `README.md`
- Focused behavior tests under `tests/`
- A patch changeset for `qs-skills`

Expected generated changes are limited to the synchronized concise documentation and Claude/Codex package projections owned by the existing generation scripts. The shared catalog projection may update inside both generated packages even though `qs-plan-spec` remains core-only.

## Exclusions

- No thirteenth core command.
- No specialist ticket command.
- No public `qs-plan-tickets` alias, compatibility wrapper, folder, picker entry, or marketplace entry.
- No change to the fixed 24-command v2 migration inventory.
- No change to the underlying tracker integration or automatic publication behavior.
- No implementation-ticket creation as part of this specification-only run.
- No commit, push, merge, tag, release, or deployment as part of implementation unless separately authorized.

## Acceptance criteria

1. Every generated and canonical picker surface displays `QS Plan: Specs & Tickets` for `qs-plan-spec`.
2. Picker descriptions and the default prompt visibly offer both an actionable specification and dependency-aware implementation tickets.
3. `qs-help`, the root README, and the generated command page direct ticketing requests to `qs-plan-spec`.
4. The canonical skill still creates no tickets for a specification-only request and creates dependency-ordered, independently verifiable tickets when tickets are requested.
5. `V3_CORE_SKILLS` contains exactly twelve commands in the existing lifecycle order, with `qs-plan-spec` still at position 50.
6. `V3_SPECIALIST_SKILLS` contains exactly the existing seven commands and no ticket command.
7. `V3_INTERNAL_CAPABILITIES` still maps `ticket-decomposition` from legacy `qs-plan-tickets` to owner `qs-plan-spec` only.
8. The fixed v2 migration inventory still contains exactly 24 dispositions, with the existing `qs-plan-tickets` internal-capability disposition unchanged.
9. No public or generated plugin tree contains an installable `qs-plan-tickets` skill directory or manifest entry.
10. Existing report profiles, invocation policy, continuation destinations and ranking, first-action validation, and terminal release behavior remain unchanged.
11. Canonical sources and generated Claude/Codex projections are synchronized.
12. A patch changeset describes the restored ticketing visibility without claiming a new command or capability.

## Verification

Add focused behavior assertions for the exact display name, short description, default prompt, help text, generated documentation title, and canonical/generated picker metadata. Retain or extend invariant tests for the twelve core commands, seven specialists, internal ticket capability ownership, fixed v2 inventory, and absence of public retired names.

Run:

```bash
npm run sync:codex
npm run check:codex
npm test
```

When Claude Code is available, also run:

```bash
claude plugin validate . --strict
claude plugin validate ./packages/qs-specialists --strict
```

Claude validation must be reported as unavailable when the CLI is absent; it must not be claimed as passed.

## Rollback

The change is metadata- and documentation-led. Rollback consists of reverting the display copy, canonical skill wording, focused tests, generated projections, and patch changeset together. Do not alter the internal ticket-decomposition capability or reintroduce the retired public command during rollback.

## Open questions

None. The display name, package boundary, command count, and internal ownership are confirmed.
