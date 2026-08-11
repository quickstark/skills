# Specification: QuickStark v3 skill consolidation

**Status:** Implemented for QuickStark 3.0.0
**Release boundary:** QuickStark v3
**Decision sources:** `CONTEXT.md` and ADR 0001
**Implementation status:** Complete; release validation is recorded by the v3 test and package gates.

> Continuation cardinality in this historical specification is superseded by ADR 0003. The one-root and no-automatic-hop boundaries remain active.

## Problem Statement

QuickStark exposes too many user-facing commands for the number of distinct jobs users actually need to perform. Several commands represent techniques or intermediate phases rather than durable user intents. Users must understand internal workflow boundaries, choose among overlapping planning and design commands, and repeatedly approve or invoke follow-on skills to finish one outcome.

The current completion contract compounds that problem. Every public skill can recommend several other public skills, so a single request can become an open-ended chain. Reports repeat execution detail and multiple next prompts even when the work is complete. The resulting output is harder to scan than the work warrants, and the user cannot reliably tell whether another action is required.

There is also no single command whose primary contract is to review an existing codebase and, when explicitly and safely scoped, improve it. The current review command emphasizes changed code. Architecture review is presented as a separate design command, and the boundary between findings-only review and mutation is not sufficiently explicit.

Finally, command discovery is not governed by one semantic order. Planning commands can be separated in host command lists because manifests and indexes inherit incidental grouping or alphabetical behavior. This makes a large command surface feel larger and less coherent.

QuickStark v3 must reduce the public surface without discarding valuable domain modeling, module decomposition, ticket decomposition, or TDD behavior. It must bound each invocation, make report length predictable, and make continuation deterministic.

## Solution

QuickStark v3 will provide a twelve-command core package organized around durable user intents. Five narrow, independently useful commands will move into an optional `qs-specialists` package. Four techniques will cease to be public commands and become internal capabilities used by the core workflows when relevant.

The release is a clean major-version break. Removed command names will not remain as aliases or hidden compatibility commands. Migration documentation will map every v2 command to its v3 destination.

Every public invocation will have one root skill, one bounded execution, and one completion report. A public skill may use internal capabilities and implementation helpers, but it will never automatically invoke another public skill. When work must continue, the completion contract will emit exactly one copy-ready next prompt. Completed work will emit none.

The reporting contract will separate execution effort from report detail. `effort=quick|standard|deep` controls the amount of investigation and validation. `report=brief|full` controls presentation. Both default independently to `standard` and `brief`.

### Twelve-command core

| Lifecycle position | Command | Primary user intent |
| ---: | --- | --- |
| 10 | `qs-help` | Discover the available workflow and choose a command. |
| 20 | `qs-setup` | Prepare or verify QuickStark in a project. |
| 30 | `qs-plan-clarify` | Turn ambiguity into a confirmed problem, scope, and decisions. |
| 40 | `qs-plan-roadmap` | Organize confirmed outcomes into a sequenced roadmap. |
| 50 | `qs-plan-spec` | Produce an actionable implementation specification, including ticket-level decomposition when requested. |
| 60 | `qs-code-build` | Implement a scoped change, using a TDD loop when valuable. |
| 70 | `qs-code-debug` | Diagnose and repair a reproducible defect. |
| 80 | `qs-review-code` | Review a change or existing codebase and optionally improve a user-selected scope. |
| 90 | `qs-git-merge` | Inspect and safely integrate branches or changes. |
| 100 | `qs-deploy-release` | Validate and execute a release or deployment. |
| 110 | `qs-flow-triage` | Assess incoming work and route it to a bounded next action. |
| 120 | `qs-flow-handoff` | Preserve verified state for another person or invocation. |

### Optional specialist package

The same marketplace will offer a separate `qs-specialists` package containing:

- `qs-plan-research`
- `qs-design-prototype`
- `qs-code-document`
- `qs-learn-teach`
- `qs-skill-write`

Each specialist command remains independently invocable. The core package must install and operate without the specialist package. Core workflows may suggest a specialist only through the single deterministic continuation prompt; they may not depend on or automatically invoke it.

### Internal capabilities

The following v2 commands become non-command capabilities inside appropriate root skills:

| v2 command | v3 capability | Owning core workflow |
| --- | --- | --- |
| `qs-design-domain` | Domain modeling and glossary refinement | Planning and review workflows |
| `qs-design-modules` | Module-boundary and dependency decomposition | Specification, build, and review workflows |
| `qs-plan-tickets` | Ticket-sized implementation decomposition | `qs-plan-spec` |
| `qs-test-tdd` | Red-green-refactor implementation loop | `qs-code-build` |

Internal capabilities are reusable instructions, templates, or orchestration primitives. They are not installable skills, slash commands, catalog entries, completion-report owners, or independently recommended continuations.

### Absorbed and removed commands

| v2 command | v3 disposition |
| --- | --- |
| `qs-plan-explore` | Absorbed into `qs-plan-clarify` as repository and problem exploration. |
| `qs-plan-interview` | Absorbed into `qs-plan-clarify` as targeted decision clarification. |
| `qs-design-architecture` | Absorbed into `qs-review-code` as architecture and codebase review. |

## User Stories

### Command discovery and package boundaries

- As a user, I want a twelve-command default installation so that I can understand the product without learning every internal technique.
- As a user, I want the twelve core commands to cover the full planning-to-delivery lifecycle so that the smaller surface does not create workflow gaps.
- As a user, I want specialist commands to be optional so that a focused installation stays focused.
- As a specialist-package user, I want each specialist command to work when explicitly invoked so that I do not need to enter through a core workflow.
- As a core-only user, I want every core command to work without the specialist package so that optional installation is a real package boundary.
- As a marketplace user, I want core and specialist packages to be clearly distinguished so that installation choices are obvious.
- As a user upgrading from v2, I want a complete old-to-new command map so that removed names have an unambiguous destination.
- As a user upgrading from v2, I want removed commands to fail clearly instead of silently aliasing to changed behavior so that automation cannot appear to succeed under a different contract.
- As a user, I want command names to remain readable and free of numeric prefixes so that ordering metadata does not leak into the interface.
- As a user, I want planning commands adjacent in command lists so that related intents are easy to scan.
- As a maintainer, I want one catalog-owned lifecycle order so that manifests, indexes, help, and generated packages do not invent conflicting orders.
- As a maintainer, I want deterministic fallback ordering where a host cannot honor explicit order so that command lists remain stable.

### Planning and internal capabilities

- As a user with an ambiguous request, I want `qs-plan-clarify` to explore the project and ask only decision-changing questions so that clarification converges.
- As a user with already sufficient context, I want `qs-plan-clarify` to infer explicit decisions and avoid a mandatory interview so that I am not slowed down.
- As a user, I want clarification to stop after the problem, constraints, and material exceptions are confirmed so that exploration does not become an endless prerequisite chain.
- As a user requesting a specification, I want `qs-plan-spec` to use established domain language when it matters so that the spec matches the project.
- As a user requesting implementation decomposition, I want `qs-plan-spec` to include ticket-sized units in the same bounded outcome so that a separate public ticket skill is unnecessary.
- As a user, I want ticket decomposition to remain optional when a specification alone is sufficient so that every spec does not become backlog administration.
- As a maintainer, I want domain, module, ticket, and TDD methods preserved as internal capabilities so that consolidation does not remove useful behavior.
- As a maintainer, I want internal capabilities to be incapable of emitting their own completion reports so that one invocation still has one owner.

### Build, debug, and review

- As a developer, I want `qs-code-build` to select a TDD loop when the change has a useful test seam so that test-first behavior remains available without another command.
- As a developer, I want `qs-code-build` to explain when TDD is not useful or practical so that the capability is applied deliberately rather than ceremonially.
- As a developer, I want `qs-code-debug` to remain a diagnosis-first workflow so that consolidation does not blur building with debugging.
- As a reviewer, I want `qs-review-code` to review either a change set or an existing codebase so that one command covers both common review scopes.
- As a reviewer, I want `qs-review-code` to assess correctness, maintainability, architecture, testability, security, and operational risk as relevant so that architecture review is not lost.
- As a user who requests review only, I want no files changed so that review remains non-mutating by default.
- As a user who explicitly requests improvement and selects a narrow target, I want `qs-review-code` to make safe improvements immediately so that review and repair can be one bounded action.
- As a user who asks to improve an unscoped codebase, I want ranked findings and a requested scope before edits so that broad mutation is not inferred.
- As a user, I want findings prioritized by impact and confidence so that I can act without reading an undifferentiated audit.
- As a user, I want failed checks or actionable P0/P1 findings to prevent a completed status so that the report cannot declare success prematurely.

### Bounded execution and effort

- As a user, I want `effort=quick` to perform the smallest credible investigation and validation so that I can get a fast directional result.
- As a user, I want `effort=standard` to be the default so that normal requests receive balanced investigation without configuration.
- As a user, I want `effort=deep` to allow broader evidence gathering and validation while remaining bounded to the stated outcome so that depth does not become an endless chain.
- As a user, I want explicit natural-language requests such as “quick pass” or “deep review” to select the matching effort mode so that flags are optional.
- As a user, I want to be asked about effort only when ambiguity would materially change cost, scope, or risk so that routine requests do not add setup questions.
- As a user, I want effort to control work performed rather than report length so that a deep run can still produce a concise summary.
- As a user, I want every public invocation to have exactly one root skill so that ownership and completion are clear.
- As a user, I want public skills never to invoke other public skills automatically so that I retain control over meaningful workflow transitions.
- As a maintainer, I want helper agents and internal capabilities to be allowed inside one root invocation so that bounded execution can still use concurrency and specialized reasoning.
- As a user, I want helper work to be summarized by the root skill rather than surfaced as additional reports so that the result remains coherent.

### Reports and continuation

- As a user, I want `report=brief` by default so that the completion message is readable in one screen under normal conditions.
- As a user, I want a full report on demand so that evidence and execution detail remain available for audits or complex work.
- As a user, I want report mode to be independent of effort mode so that presentation and execution depth can be chosen separately.
- As a user, I want the brief report to lead with status and outcome so that I know the result immediately.
- As a user, I want routine execution detail omitted from brief reports so that signal is not buried.
- As a user, I want important failed or noteworthy checks visible even in brief mode so that concision cannot conceal risk.
- As a user, I want the hosted readout and in-chat report derived from the same normalized run result so that they cannot contradict each other.
- As a user, I want no next prompt when the requested work is genuinely complete so that completion does not manufacture work.
- As a user, I want exactly one copy-ready next prompt when continuation or input is required so that the next action is deterministic.
- As a user, I want the continuation prompt to preserve the actual outcome, unresolved condition, and relevant evidence so that context is not lost.
- As a user requesting a full report, I want alternatives recorded as secondary options without turning them into multiple competing next prompts so that there is still one recommended path.
- As a maintainer, I want completion states validated centrally so that individual skills cannot reinterpret when a next prompt is required.

### Documentation, validation, and release

- As a user, I want help and documentation to present the same command membership and order so that discovery is trustworthy.
- As a user, I want documentation to explain effort and report modes once in shared language so that each skill does not repeat a long contract.
- As a maintainer, I want generated Claude and Codex packages to come from the same catalog so that harnesses remain synchronized.
- As a maintainer, I want package membership, invocation policy, display metadata, and ordering tested as catalog behavior so that drift fails validation.
- As a maintainer, I want the v3 change released atomically across package metadata and manifests so that users cannot install mixed surface versions.
- As a maintainer, I want attribution and license obligations preserved when commands are merged or internalized so that consolidation does not erase provenance.

## Implementation Decisions

### 1. The catalog owns the complete public surface

The catalog will model package membership, public visibility, lifecycle position, invocation policy, baseline action, effort support, report support, and approved continuation for every public command. Generated manifests, indexes, help output, documentation navigation, and package snapshots will consume that model.

Core membership is exactly the twelve commands listed in this specification. Specialist membership is exactly the five commands listed here. Internal capabilities are modeled separately from installable skills and are excluded from all user-facing command collections.

### 2. Ordering is semantic, explicit, and deterministic

The canonical category sequence is help, setup, plan, code, review, git, deploy, flow. Commands within each category use catalog-defined lifecycle positions. Generators must preserve the canonical sequence where their target supports ordering and verify the exact result.

When a host ignores explicit order and sorts by name, readable names remain unchanged and the host's stable alphabetical grouping is accepted. Numeric or symbolic name prefixes will not be introduced merely to force display order.

### 3. The package split is real but release-coordinated

The marketplace will expose a core plugin and an optional `qs-specialists` plugin. Both are released under the v3 version line from the same source catalog and shared generation machinery. The core plugin has no dependency on the optional plugin and contains no specialist command directories. Shared infrastructure may be packaged into both generated outputs, but installing core alone must be sufficient for all core behavior.

### 4. Internal capabilities are implementation primitives

Domain modeling, module decomposition, ticket decomposition, and TDD are invoked only inside a root workflow. They may define decision rules, templates, and validation steps, but they do not have public metadata, independent invocation policies, completion states, hosted readouts, or continuation prompts.

The root skill decides whether an internal capability is relevant and remains accountable for its result. Internal capability use may be disclosed in a full report as execution detail but must not appear as an additional skill run.

### 5. Clarification absorbs exploration and interview behavior

`qs-plan-clarify` begins by determining whether repository evidence and the user's request already resolve the material decisions. It explores available evidence before questioning the user. It asks only questions whose answers change scope, behavior, risk, or acceptance criteria. It stops once those decisions and any exceptions are confirmed.

Clarification does not automatically proceed into roadmap, specification, or implementation. If another public workflow is required, it ends with one continuation-required prompt.

### 6. Specification absorbs optional ticket decomposition

`qs-plan-spec` produces an implementation-ready behavioral specification. When the user requests executable work units, when the target tracker requires them, or when the implementation cannot be safely assigned as one unit, the root skill applies the internal ticket-decomposition capability before completing. Ticket decomposition remains part of the same specification run and report.

Publishing a specification or tickets is an explicit output of the invoked root skill, not an automatic invocation of a separate planning command.

### 7. Build owns the TDD decision

`qs-code-build` evaluates whether the requested behavior has a stable, meaningful test seam. It uses the internal red-green-refactor loop when that loop improves confidence or design. It may use characterization tests before mutation in an existing codebase. When test-first work is impractical, it records the alternative validation strategy without manufacturing a failing test.

The TDD capability does not create a nested run or separate report.

### 8. Review covers changes, codebases, and scoped improvement

`qs-review-code` accepts two orthogonal inputs: review target and action. The target is either a change set or a user-selected codebase scope. The action is either `review` or `improve`, with `review` as the safe default.

Review action is read-only and produces prioritized findings. Improve action may edit immediately only when the user has explicitly requested improvement and selected a narrow target such as a change set, module, component, package, or named concern. The skill validates the target before mutation and confines edits to that target plus directly required tests or configuration.

An unscoped request to improve an entire codebase does not authorize broad edits. The skill performs a bounded review, ranks the most valuable improvements, and ends in input-required state with one prompt asking the user to select the improvement scope. Architecture review is one dimension of the unified review contract rather than a separate command.

### 9. Effort modes use bounded budgets

Every supporting root skill accepts `quick`, `standard`, or `deep` effort. Explicit flags take precedence, followed by unambiguous natural-language intent, then the `standard` default.

- **Quick** performs one focused evidence pass, favors existing targeted checks, avoids optional helper-agent fan-out, and reports only the highest-impact findings needed for the requested decision.
- **Standard** performs the normal evidence pass, may use a small bounded helper wave when work is separable, runs relevant targeted checks, and allows one bounded repair-and-recheck cycle where mutation is authorized.
- **Deep** broadens evidence and validation, may use parallel specialist perspectives and wider checks, and may include additional repair-and-recheck cycles when justified by the explicit scope. It remains bounded to one requested outcome, phase, or ticket per invocation.

Effort never authorizes a new public workflow, an expanded mutation scope, indefinite monitoring, or repeated execution until perfection. Skills that cannot meaningfully vary effort accept the normalized value for reporting consistency but need not manufacture extra work.

### 10. Report modes use progressive disclosure

Every root skill accepts `brief` or `full` report mode. Explicit flags take precedence, followed by unambiguous natural-language intent, then the `brief` default.

Brief mode contains status, outcome, up to the three most important decisions or findings, failed or noteworthy checks, material outputs, the authenticated hosted readout URL, and the deterministic continuation when required. Routine file lists, elapsed-time metrics, helper details, and successful low-signal checks are omitted.

Full mode adds the evidence trail, execution summary, complete applicable checks and outputs, secondary findings, and considered alternatives. It does not add extra continuation prompts. The hosted report may provide structured progressive disclosure, but the in-chat report remains useful without opening it.

### 11. One normalized result drives every report surface

The root skill produces a normalized run result containing status, completion state, root skill, effort, report mode, outcome, decisions, findings, outputs, checks, execution evidence, and continuation. Both the in-chat completion and hosted readout are projections of that same result.

The renderer owns shared labels, omission rules, limits, prompt formatting, and the brief/full projection. Individual skill instructions provide skill-specific evidence and outcomes rather than duplicating a long presentation contract.

### 12. Completion and continuation form a validated state machine

The normalized completion state is one of:

- **Complete:** The requested outcome is achieved, required checks pass, and no actionable P0/P1 finding remains. It emits zero next prompts.
- **Continuation required:** The requested bounded unit is finished but a distinct public workflow is necessary to reach the larger stated goal. It emits exactly one copy-ready prompt for the recommended public skill.
- **Input required:** Progress is blocked on a material user decision, permission, or safely unavailable input. It emits exactly one copy-ready prompt that requests or carries that input into the appropriate public skill.
- **Failed:** The run did not produce a usable outcome because of an execution, validation, or publication failure. It emits at most one recovery prompt when a concrete user action can resolve the failure; otherwise it reports no next prompt.

Failed required checks and actionable P0/P1 findings prohibit Complete. Alternative actions may appear in full-report evidence, but exactly one continuation remains designated when continuation is required.

### 13. Public-skill chaining is prohibited

A public skill instruction must not direct the agent to automatically execute another public skill. Catalog recommendations are routing metadata for a possible deterministic continuation, not executable chains. Static validation will reject automatic public-skill invocation language and recommendation graphs that imply a single invocation owns multiple public runs.

Internal capabilities, bounded helper agents, shared scripts, and renderers are allowed because they remain under the root skill's scope and produce no independent completion report.

### 14. v3 is a clean migration

The core and specialist manifests will contain only v3 public commands. Removed v2 names will not be shipped as aliases, deprecated command folders, or implicit routers. Help, release notes, and migration documentation will give a direct disposition for all twenty-four v2 commands: retained in core, moved to specialists, internalized, or absorbed.

Unknown removed commands fail through the host's normal unknown-command behavior. Documentation may explain the replacement but runtime compatibility shims are out of scope.

### 15. Shared policy remains visible without repeated prose

The authoritative documentation will define effort modes, report modes, completion states, package boundaries, internal capabilities, and ordering once. Individual skill pages will state their specific inputs, behavior, outputs, and supported variations, then refer to the shared contract.

The router presents the core first in canonical order and the optional specialists in a separate section. Generated indexes distinguish user-invoked and model-invoked policy without changing the canonical lifecycle sequence.

### 16. Release integrity is atomic

The source package, core plugin, optional specialist plugin, documentation, and generated snapshots move to v3 together. Synchronization and validation must fail when package versions, catalog membership, generated skill directories, manifests, or documentation indexes disagree.

The release preserves upstream source links, attribution, and the MIT license for adapted material.

## Testing Decisions

### Catalog and generation seam

The primary contract test will load the canonical catalog and assert the exact twelve core commands, exact five specialist commands, exact four internal capabilities, and exact canonical lifecycle order. It will assert unique names and positions, valid package membership, invocation policy, supported modes, and at most one designated continuation per public command.

Generated-artifact tests will compare catalog projections with both plugin manifests, generated skill snapshots, the router, root and bucket indexes, and documentation navigation. Core outputs must contain no specialist or internal skill directory. Specialist outputs must contain exactly the specialist commands and required shared runtime assets. Re-running generation without source changes must produce no diff.

### Completion-report seam

The renderer will be tested through normalized run-result fixtures rather than skill-specific prose. A matrix will cover every completion state in both report modes and representative effort modes.

Required invariants include:

- Complete produces zero next prompts.
- Continuation required and input required each produce exactly one copy-ready next prompt.
- Failed produces zero or one recovery prompt, never several competing prompts.
- A failed required check prevents Complete.
- An actionable P0/P1 finding prevents Complete.
- Brief mode applies omission and item limits without hiding failed or noteworthy checks.
- Full mode preserves evidence and alternatives while retaining one designated continuation.
- In-chat and hosted projections share status, outcome, checks, outputs, and continuation.
- Only the root public skill is reported as the run owner.

Rendered reports will retain accessibility, escaping, authentication, and external-dependency checks already required by the hosted readout system.

### Orchestration seam

Static contract tests will inspect public skill instructions and catalog routing to reject automatic public-skill hops. Internal capability fixtures will verify that capabilities cannot render, publish, or recommend independently.

Representative workflow tests will demonstrate that helper-agent or internal-capability use returns to one root result, with one report and no nested public run.

### Consolidated behavior seams

Focused behavior fixtures will cover the four highest-risk consolidations:

1. `qs-plan-clarify` explores evidence, asks only unresolved decision-changing questions, and stops before another public workflow.
2. `qs-plan-spec` can apply internal domain, module, and ticket decomposition while producing one specification result.
3. `qs-code-build` chooses TDD, characterization tests, or another validation strategy based on the observable seam and reports one build result.
4. `qs-review-code` distinguishes change-set from codebase scope and review from improve action; it mutates only under explicit improve intent plus a narrow selected target.

Review fixtures will include a scoped improvement that permits edits, an unscoped whole-codebase improvement that requires input before edits, a findings-only review, a failing required check, and an actionable P0/P1 finding.

### Migration and ordering seam

Migration tests will account for all twenty-four v2 public names exactly once. They will assert that removed names are absent from installable v3 command directories and manifests while present in the migration map.

Ordering tests will verify canonical catalog order in every target that supports it and stable documented fallback behavior in hosts that impose their own sorting. Tests will reject numeric command-name prefixes and independent hand-maintained ordering lists.

### End-to-end validation

The implementation is not complete until source-to-plugin synchronization and the full test suite pass with no generated diff. Both plugin manifests must validate under their available host tooling. Representative core and specialist commands must each render an authenticated hosted report successfully, and a core-only installation smoke test must run without specialist assets.

## Out of Scope

- Implementing any part of the consolidation in this specification run.
- Shipping v2 command aliases, compatibility routers, deprecated public folders, or warning-only commands.
- Adding more than the twelve core or five specialist commands named here.
- Turning internal capabilities into separately installable or report-producing skills.
- Allowing automatic public-skill chains, even in deep effort mode.
- Making report mode implicitly follow effort mode.
- Automatically changing the user's selected model or reasoning configuration.
- Redesigning hosted-report authentication, storage, ingestion, gallery, or dashboard architecture beyond the normalized reporting contract required here.
- Replacing the existing issue tracker or defining a new organization-wide triage taxonomy.
- Implementing unrelated dashboard, telemetry, or settings work currently present in the repository.
- Publishing, tagging, or deploying v3 as part of specification work.

## Further Notes

### Acceptance criteria

The consolidation is ready to release when all of the following are true:

1. A default installation exposes exactly the twelve core commands in the canonical lifecycle order where supported.
2. Installing `qs-specialists` exposes exactly the five specialist commands, and core works without it.
3. Domain, module, ticket, and TDD behavior remains demonstrably available only as internal capabilities.
4. No v2-only or absorbed name is shipped as a command or alias.
5. `qs-review-code` reviews existing codebases and enforces explicit improve intent plus narrow target scope before mutation.
6. Quick, standard, and deep effort modes are accepted with standard as the default.
7. Brief and full report modes are accepted independently with brief as the default.
8. Complete runs emit no next prompt; continuation-required and input-required runs emit exactly one.
9. Failed required checks and actionable P0/P1 findings cannot be reported as complete.
10. No public skill automatically invokes another public skill.
11. Catalog-derived manifests, indexes, docs, skill snapshots, and ordering pass synchronization tests.
12. Core-only and specialist smoke runs each publish one authenticated hosted report owned by the invoked root skill.

### Recommended implementation sequence

Implementation planning should decompose this specification into independently verifiable work in this order: catalog schema and v3 membership; package generation; shared orchestration and reporting contracts; consolidation of the four internal capabilities; root-skill behavior changes; router and documentation migration; generated snapshots; contract and end-to-end validation; coordinated v3 release.

The specification deliberately records observable contracts before implementation structure. Implementers may choose internal module boundaries as long as the package, behavior, reporting, ordering, safety, and migration contracts above remain true.
