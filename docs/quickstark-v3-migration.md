# QuickStark v2 to v3 migration

QuickStark v3 is a clean break. Removed names are not aliases, wrappers, implicit routers, or installable commands.

| v2 command | v3 disposition | Destination |
| --- | --- | --- |
| `qs-help` | Core | `qs-help` |
| `qs-setup` | Core | `qs-setup` |
| `qs-plan-clarify` | Core | `qs-plan-clarify` |
| `qs-plan-explore` | Absorbed | `qs-plan-clarify` |
| `qs-plan-interview` | Absorbed | `qs-plan-clarify` |
| `qs-plan-spec` | Core | `qs-plan-spec` |
| `qs-plan-tickets` | Internal capability | Ticket decomposition in `qs-plan-spec` |
| `qs-plan-roadmap` | Core | `qs-plan-roadmap` |
| `qs-plan-research` | Specialist | `qs-specialists`: `qs-plan-research` |
| `qs-design-prototype` | Specialist | `qs-specialists`: `qs-design-prototype` |
| `qs-design-domain` | Internal capability | Domain modeling in planning and review |
| `qs-design-modules` | Internal capability | Module decomposition in spec, build, and review |
| `qs-design-architecture` | Absorbed | Architecture dimension in `qs-review-code` |
| `qs-code-build` | Core | `qs-code-build` |
| `qs-code-document` | Specialist | `qs-specialists`: `qs-code-document` |
| `qs-code-debug` | Core | `qs-code-debug` |
| `qs-test-tdd` | Internal capability | TDD loop in `qs-code-build` |
| `qs-review-code` | Core | `qs-review-code` |
| `qs-git-merge` | Core | `qs-git-merge` |
| `qs-flow-triage` | Core | `qs-flow-triage` |
| `qs-flow-handoff` | Core | `qs-flow-handoff` |
| `qs-learn-teach` | Specialist | `qs-specialists`: `qs-learn-teach` |
| `qs-skill-write` | Specialist | `qs-specialists`: `qs-skill-write` |
| `qs-deploy-release` | Core | `qs-deploy-release` |

For refactoring, use `qs-review-code action=refactor target=<module|component|package|path|named concern>`. A whole-codebase request first returns ranked candidates and asks for one selected scope before editing.
