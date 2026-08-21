# Consolidate the QuickStark skill surface

> Historical baseline. ADR 0002 supersedes the five-specialist count, ADR 0003 supersedes continuation cardinality, and ADR 0004 supersedes the hosted-readout requirement. The twelve-command core, one-root rule, and internal-capability boundaries remain active.

QuickStark v3 will make a clean break from the 24-command collection: the default `qs-skills` plugin will expose 12 core skills, `qs-specialists` will optionally expose research, prototyping, documentation, teaching, and skill-authoring commands, and domain, module, ticket, and TDD behavior will become internal capabilities. This reduces command and report sprawl while preserving specialized behavior; retired commands will have migration guidance but no visible compatibility aliases.

## Consequences

- `qs-review-code` will cover changes or an existing codebase and can review or improve a user-selected scope; an unscoped review must stop for selection before editing.
- Every run has one root skill, one bounded result, and zero automatic public-skill hops.
- `effort=quick|standard|deep` bounds execution independently from `report=brief|full`; both default to `standard` and `brief`, respectively.
- `complete` produces no next prompt, while `continuation-required` and `input-required` produce exactly one.
- Catalog-owned lifecycle ordering groups commands without numeric prefixes, and the default plugin never depends on `qs-specialists`.
