# Assessment: purpose-specific QuickStark skill reports

## Assessment goal

A report should answer the question that motivated its skill. Lead with the actual outcome, show the smallest useful visual, link only real artifacts, distinguish local from externally published work, and omit sections for evidence the run did not produce.

All 24 promoted skills share one report renderer and one generated completion contract. Keep report behavior in those sources rather than maintaining competing skill-specific templates. Every actual report automatically identifies its real execution machine and platform. Add a deployment URL, environment, or changed project file only when directly verified for that particular run.

## GitHub and release evidence

GitHub-related runs can include an optional, validated `provenance` object:

```json
{
  "provenance": {
    "pullRequests": [
      {
        "number": 42,
        "title": "Actual pull request title",
        "state": "merged",
        "url": "https://github.com/example/project/pull/42"
      }
    ],
    "closedIssues": [
      {
        "number": 17,
        "title": "Actual issue title",
        "state": "closed",
        "closedByRelease": true,
        "url": "https://github.com/example/project/issues/17"
      }
    ],
    "release": {
      "version": "v2.3.1",
      "url": "https://github.com/example/project/releases/tag/v2.3.1"
    },
    "commit": {
      "sha": "0123456789abcdef0123456789abcdef01234567",
      "published": true,
      "url": "https://github.com/example/project/commit/0123456789abcdef0123456789abcdef01234567"
    }
  }
}
```

This example describes the supported schema; it does not assert that an actual issue, pull request, version, commit, or release exists. Populate each field only from independently verified records belonging to the actual project.

- An unpushed commit can have `published: false` and a verified local hash. It cannot have a GitHub commit URL.
- A pull request can be described as merged only after its actual remote state has been observed.
- A closed issue can have `closedByRelease: true` only when that particular published release and its closure relationship have both been verified.
- Reject unsafe protocols, embedded credentials, unexpected GitHub paths, mismatched record identifiers, cross-project URLs, and invented version or hash formats.
- Omit the entire delivery-evidence section when no relevant evidence exists.
- Catalog previews cannot contain delivery provenance or observed work.

## Cross-harness report evidence

Authorized reports from another machine must retain their actual producer, harness, skill collection, verified canonical project, immutable run identity, UTC timestamp, and observed outcome. Native QuickStark skills keep their catalog-defined visual profiles; independently authored skills use an honest external-skill presentation.

The hosted browser viewer remains authenticated and read-only. Only the dedicated `/api/v1/readouts` service can accept a structured producer submission, and both its producer grant and hosted publication policy must authorize the project. Record a successful publication only after receiving and verifying the actual accepted report URL. Missing credentials, denied projects, unreachable endpoints, and revoked producers leave the real local report intact.

Do not promote an external skill, import arbitrary HTML, imply browser authentication bypass, fabricate remotely verified provenance, or count a preview as actual published work.

## Recommended view for each skill

| Skill | Lead with | Most useful visual | Relevant delivery evidence |
| --- | --- | --- | --- |
| `/qs-help` | Recommended workflow, reason, and the next actual action. | Ranked recommendation card. | Omit unless the recommendation itself concerns a verified GitHub artifact. |
| `/qs-setup` | Configured project, real prerequisites, and unresolved configuration. | Actual pass, fail, and skipped readiness checks. | Include only a directly verified project or tracker configuration. |
| `/qs-plan-clarify` | Decisions made, unanswered questions, and blockers. | Resolved-versus-open decision cards. | Include an actual source issue or PR only when verified. |
| `/qs-plan-explore` | Alternatives, observed opportunities, constraints, and trade-offs. | Evidence-backed option comparison. | Include only an actual GitHub source relevant to the exploration. |
| `/qs-plan-interview` | Confirmed answers, unresolved choices, and who must decide. | Answered-versus-open decision ledger. | Include verified issue or PR context when it was actually inspected. |
| `/qs-plan-spec` | Accepted requirements, boundaries, unresolved assumptions, and the actual spec. | Requirement and acceptance-criterion summary; draw links only when recorded. | Include an actual parent issue or reviewed PR only when verified. |
| `/qs-plan-tickets` | Actual tickets, acceptance criteria, blockers, and the available work frontier. | Dependency graph only from explicitly verified blocking edges. | Link only tickets or PRs that actually exist in the configured tracker. |
| `/qs-plan-roadmap` | Delivery decisions, real milestones, dependencies, and remaining decisions. | Timeline only from observed milestone dates or recorded ordering. | Include an actual milestone, release, or linked GitHub issue when verified. |
| `/qs-plan-research` | Sources inspected, evidence, conclusions, unknowns, and the recommendation. | Source and evidence comparison; show confidence only when explicitly assessed. | Link only actual GitHub issues, discussions, commits, or PRs used as evidence. |
| `/qs-design-prototype` | Explored alternatives, real prototype artifacts, observed trade-offs, and selected direction. | Comparison matrix of the actual prototype variants and criteria. | Include an actual prototype PR only when verified. |
| `/qs-design-domain` | Actual vocabulary, entities, boundaries, and established relationships. | Concept map with connections only from explicitly observed relationships. | Usually omit; link an actual domain-decision issue only when relevant. |
| `/qs-design-modules` | Module ownership, interfaces, contracts, and observed dependencies. | Dependency and interface map from verified relationships. | Include a reviewed design PR only when directly verified. |
| `/qs-design-architecture` | Architectural decision, evidence, risk, rejected alternatives, and affected boundaries. | Risk or architecture matrix grounded in actual findings. | Include a real architecture decision issue or PR when available. |
| `/qs-code-build` | Actual deliverables, changed artifacts, acceptance evidence, and executed checks. | Deliverable and verification summary with real observed relationships. | Show verified issue, PR, local-or-published commit, and release only when applicable. |
| `/qs-code-document` | Actual documentation files, audience, source evidence, coverage, and working examples. | Documentation artifacts and actual accuracy-check results. | Show a relevant documentation PR, verified release, or actual local-or-published commit only when observed. |
| `/qs-code-debug` | Reproduction, observed cause, actual fix, remaining uncertainty, and regression check. | Reproduction-to-cause-to-fix trace only from recorded evidence. | Show verified bug issue, fix PR, and actual local-or-published commit. |
| `/qs-test-tdd` | Tests actually run, explicit pass/fail/skipped results, and regression coverage. | Truthful check-status summary or recorded red/green transitions. | Show the tested commit or related PR only when directly verified. |
| `/qs-review-code` | Independent Standards and Specification findings, severity, exact evidence, and remediation. | Two separate axis-specific `P0`–`P3` review matrices. | Link the actual reviewed PR, compared commits, or tracked issue when verified. |
| `/qs-git-merge` | Real branch state, observed conflicts, resolution, executed checks, and remote divergence. | Conflict and resolution trace with arrows only for recorded relationships. | Show actual PR state, local-or-published commit, and a release or closed issues only if independently confirmed. |
| `/qs-flow-triage` | Actual issue and PR states, category, assignee, action, and blockers. | Observed issue-state and category matrix. | Link only issues and PRs actually queried or modified. |
| `/qs-flow-handoff` | Current state, preserved changes, blockers, next action, and real handoff artifact. | Compact state, blocker, and next-action cards. | Show the actual branch, commit, PR, or release that the next operator needs. |
| `/qs-learn-teach` | Actual concepts, prerequisite order, learning materials, and demonstrated understanding. | Lesson pathway only when the sequence was explicitly established. | Normally omit. |
| `/qs-skill-write` | Actual skill changes, completion-contract decisions, validation, and generated artifacts. | Skill-authoring and verification checklist. | Include a real skill-change PR or local-or-published commit only when relevant. |
| `/qs-deploy-release` | Target environment, deployed state, release gates, verified version, and smoke-test results. | Actual gate-status summary plus a compact verified release receipt. | Show the published version, release URL, actual merged PR, commit hash, and issues verified as closed by that exact release. |

## Review findings

### Standards

1. GitHub and release evidence previously disappeared during report normalization. Use one strictly validated provenance model in the shared report renderer and shared completion contract.
2. Review reports previously flattened both required review axes. Preserve `standards` and `specification` independently, along with actually assessed `P0`–`P3` priorities and evidence.
3. Visual connectors previously joined ordinary category counts and concept labels. Draw a connection only when an actual observed relationship explicitly connects recorded report items.
4. Record the actual execution machine and platform automatically. Never attribute pre-existing dirty files, an unverified deployment, credentials, or an absolute machine path to a skill run.
5. Cover actual browser-observable content, secure project-matched links, stable machine-readable metadata, and actual HTTP responses.

### Specification

1. Report actual GitHub records only when relevant to the run. Preview reports must reject rather than silently conceal invented release or issue evidence.
2. Preserve canonical project isolation, report immutability, self-contained HTML, escaping, existing public-viewer authentication, and source-synchronized Claude and Codex skill contracts.
3. Avoid visual evidence that implies an unobserved dependency, event sequence, issue closure, remote publication, pull-request merge, or deployment.
4. Keep reports concise: the primary result first, optional verified delivery evidence near the top, purpose-specific findings, actual checks, and relevant next actions.

## Suggested next refinements

1. Add real milestone timestamps when roadmap workflows actually capture dated milestones.
2. Add explicitly observed confidence or source quality to research only when the skill records it.
3. Show real screenshots or prototype artifact links when those files actually exist.
4. Add actual owner and transition history to issue-triage reports only when the configured tracker returns those fields.
5. Consider project-level activity summaries only from actual immutable reports; keep previews, predicted work, and inferred trends out of the metrics.
