---
name: qs-setup
description: "Prepare or verify QuickStark configuration for one project."
disable-model-invocation: true
---

# QuickStark setup

<!-- qs-runtime-start -->
Before doing any task work, read [the shared run contract](../_shared/runtime/run-contract.md) relative to this invoked `SKILL.md`. Use the actual skill location supplied by the host to resolve it within the same package or canonical tree. Read through the end marker before selecting task tools, delegating, or acting. Then post the contract's initial checklist and progress update in the conversation before starting the task.
Confirm the file starts with `# QuickStark runtime run contract` and ends with `<!-- qs-runtime-run-contract:end -->`. If the host lacks usable read access or cannot locate this skill, report `Input required`. If the expected file is missing, unreadable, invalid, or resolves outside the owning tree, report `Failed`. Give `Status:`, `Skills used: /qs-setup` and an `Outcome:` naming the owning package (qs-skills) and prerequisite. Write `Next work prompt: None — shared run contract unavailable.` Stop before task work. Emit no executable continuation, perform no repair, and use no alternate copy.
<!-- qs-runtime-end -->

Prepare or verify only the selected project. Inspect existing configuration before editing and preserve project conventions.

## Behavior

1. Resolve the repository root and read its agent instructions.
2. Detect the issue tracker, documentation conventions, test commands, release workflow, and existing QuickStark configuration.
3. Ask only for a material choice that cannot be inferred safely.
4. Create or repair the minimum project-owned configuration needed for the confirmed workflow.
5. Run targeted validation and report actual readiness.

Never create remote resources, credentials, releases, or deployments unless separately requested. Setup ends after configuration verification; it does not start planning or implementation.

## Modes

- Quick: verify the existing configuration and report the first blocking gap.
- Standard: verify and safely repair the normal project configuration.
- Deep: include wider integration and documentation checks without expanding project scope.

## Conditional project references

For a confirmed tracker, read only its adapter: [GitHub](issue-tracker-github.md), [GitLab](issue-tracker-gitlab.md), or [local Markdown](issue-tracker-local.md). Read [triage-labels.md](triage-labels.md) only when configuring an existing triage workflow, and [domain.md](domain.md) when domain documentation exists or terminology affects setup. Use verified project conventions rather than imposing the examples. These references describe formats and operations; loading them never authorizes issue creation, claiming, comments, closing, or another public workflow.

## Completion report and next steps

Apply the shared run contract. Report `Status:`, `Skills used: /qs-setup`, and `Outcome:`.
Include `Next work prompt:`. Use the exact available literal for the active host. Route entries list Codex, bare slash, and Pi spellings in that order.
Normal routes: `$qs-skills:qs-plan-clarify` / `/qs-plan-clarify` / `/skill:qs-plan-clarify`, `$qs-skills:qs-flow-triage` / `/qs-flow-triage` / `/skill:qs-flow-triage`, `$qs-skills:qs-plan-roadmap` / `/qs-plan-roadmap` / `/skill:qs-plan-roadmap`.
Recovery routes: `$qs-skills:qs-plan-clarify` / `/qs-plan-clarify` / `/skill:qs-plan-clarify`, `$qs-skills:qs-flow-triage` / `/qs-flow-triage` / `/skill:qs-flow-triage`, `$qs-skills:qs-plan-roadmap` / `/qs-plan-roadmap` / `/skill:qs-plan-roadmap`.
