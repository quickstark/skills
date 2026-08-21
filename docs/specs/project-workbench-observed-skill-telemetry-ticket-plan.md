# Ticket plan: Project Workbench and observed skill-run telemetry

> Historical record — the Workbench, hosted-output, ingestion, and producer-credential portions are superseded by the direct-chat contract in [`docs/skill-run-contract.md`](../skill-run-contract.md). They are not part of the active command, package, deployment, or test architecture.

Status: approved, published, and verified; all 11 implementation tickets are open and labeled `ready-for-agent`.

Parent: [Specification: Project Workbench and observed skill-run telemetry, issue #11](https://github.com/quickstark/skills/issues/11).

Tracker: GitHub Issues for `quickstark/skills`.

Triage: apply the existing `ready-for-agent` label to each approved implementation ticket.

Dependency policy: all approved issues were published in dependency order, each ticket records its actual blocking issue references, and all 16 blocking edges use GitHub-native issue relationships. Each implementation ticket references the existing parent without closing, editing, or otherwise changing that parent issue.

Delivery policy: first deliver the approved Project Workbench and honest analytics without requiring Codex OpenTelemetry. Treat the collector and per-machine onboarding as independently optional. Preserve verified projects, immutable skill readouts, authenticated browser access, producer grants, publication policy, and the distinction between actual skill runs and previews.

## 01 — Deliver the production Project Workbench from one verified project snapshot

**Published issue:** [#12](https://github.com/quickstark/skills/issues/12).

**What to build:** a working one-page Project Workbench that presents verified projects, the selected project's actual immutable skill runs, and a selected skill readout together using the approved prototype A and the existing report library as their single source of truth.

**Blocked by:** None — can start immediately.

**Native GitHub blockers:** None.

**Acceptance criteria:**

- [ ] The hosted gallery renders verified project navigation, a real skill-run list, and a selected immutable skill readout together on one page.
- [ ] Project, report, and selection data come from one verified project-library snapshot; no parallel gallery, fabricated report, or secondary activity database is introduced.
- [ ] Default selection is deterministic, the current verified project is identifiable, and the selected report is clearly indicated.
- [ ] Legacy standalone reports, unassigned legacy reports, browser authentication, publication policy, and the read-only viewer remain intact.
- [ ] Behavioral tests verify the complete project-to-report path and the existing repository and generated-plugin checks remain green.

## 02 — Make workbench navigation, search, and report links shareable

**Published issue:** [#13](https://github.com/quickstark/skills/issues/13).

**What to build:** accessible project switching, skill-run search and filtering, safe shareable URL state, filtered-empty recovery, and responsive workbench panels that remain usable on laptops and narrower screens.

**Blocked by:** 01.

**Native GitHub blockers:** [#12](https://github.com/quickstark/skills/issues/12).

**Acceptance criteria:**

- [ ] Project selection, report selection, search text, skill filters, status filters, and preview visibility round-trip through bounded and validated URL state.
- [ ] Search operates on actual verified project identity, recorded skill name, and observed readout outcome.
- [ ] A report link restores the selected project and immutable report without exposing an absolute filesystem path or unsafe identifier.
- [ ] Keyboard navigation, visible focus, accessible names, semantically meaningful status text, filtered-empty recovery, and small-screen layouts are verifiable.
- [ ] Catalog previews remain hidden from real work by default and are clearly labeled when explicitly enabled.
- [ ] Behavioral and security regression tests pass for navigation, hostile query values, historical reports, and authenticated hosted access.

## 03 — Count actual skill runs and show truthful project analytics

**Published issue:** [#14](https://github.com/quickstark/skills/issues/14).

**What to build:** compact workbench analytics showing the selected verified project's real skill-run total, actual recorded statuses, observed primary-skill usage, recent report activity, and the distinction between project-wide and filtered results.

**Blocked by:** 01.

**Native GitHub blockers:** [#12](https://github.com/quickstark/skills/issues/12).

**Acceptance criteria:**

- [ ] Each unique, immutable, non-preview readout counts as exactly one actual skill run.
- [ ] Participating `skillsUsed` values, catalog previews, recommended next skills, Codex internal tools, duplicate submissions, and ingestion retries never inflate run counts.
- [ ] Actual completed, blocked, and awaiting-input counts are derived from recorded readout statuses.
- [ ] Primary-skill totals and recent activity remain scoped to the selected verified project.
- [ ] Project-wide totals and the current filtered result count are explicitly distinguishable.
- [ ] Mixed-project, preview, retry, duplicate, legacy, and empty-state behavioral tests prove the visible counts.

## 04 — Capture and render one honestly observed native skill run

**Published issue:** [#15](https://github.com/quickstark/skills/issues/15).

**What to build:** a backward-compatible native skill readout that accepts, validates, preserves, and visibly renders an optional observed model, reasoning effort, final response token usage, active timing, measurement source, and attribution scope without requiring a collector.

**Blocked by:** None — can start immediately.

**Native GitHub blockers:** None.

**Acceptance criteria:**

- [ ] A directly observed native run can render safe provider, model, reasoning effort, completed-response token values, and actual active duration in its immutable standalone readout.
- [ ] Each observation identifies its supported measurement source and whether it belongs to a `skill-run`, `thread-turn`, or `thread-cumulative` scope.
- [ ] Thread and cumulative measurements are never displayed or aggregated as individual skill usage.
- [ ] Missing fields are displayed as **Not captured**; old reports and catalog previews remain honest and backward-compatible.
- [ ] Invalid totals, negative or oversized counts, reversed timestamps, unknown sources, unsafe model identifiers, and fabricated attribution are rejected.
- [ ] Native rendering, security, immutable report, synchronization, and generated Codex-plugin checks pass without OpenTelemetry configuration.

## 05 — Deliver observed readouts safely through authorized hosted ingestion

**Published issue:** [#16](https://github.com/quickstark/skills/issues/16).

**What to build:** one end-to-end observed native or external skill readout that an authorized producer can submit, validate, persist immutably, retry safely, and open in the authenticated hosted project library without changing its measured values.

**Blocked by:** 04.

**Native GitHub blockers:** [#15](https://github.com/quickstark/skills/issues/15).

**Acceptance criteria:**

- [ ] Authorized native and external producers preserve the same validated optional observation through hosted report submission and safe server-owned rendering.
- [ ] Producer-specific project grants and the independent publication policy both apply to observed reports.
- [ ] Identical retries remain idempotent; conflicting observations cannot replace an immutable accepted report.
- [ ] Thread-level observations retain their actual scope throughout ingestion and hosted rendering.
- [ ] Prompts, raw model responses, internal tool output, bearer credentials, request headers, secret paths, and arbitrary uploaded HTML are rejected or excluded.
- [ ] Existing cross-harness, producer-isolation, project-policy, hosted-viewer, and immutable-delivery tests remain green.

## 06 — Record independent run-quality evidence

**Published issue:** [#17](https://github.com/quickstark/skills/issues/17).

**What to build:** a native or authorized hosted readout that accurately carries separately sourced passed checks, failed checks, accepted or rejected feedback, or documented review evidence without turning latency or token usage into a quality score.

**Blocked by:** 04.

**Native GitHub blockers:** [#15](https://github.com/quickstark/skills/issues/15).

**Acceptance criteria:**

- [ ] A completed readout displays directly observed check outcomes or explicitly sourced user and review feedback alongside, but separately from, run measurements.
- [ ] Missing quality evidence is explicitly identified rather than inferred.
- [ ] Short duration, low token usage, low reasoning effort, output length, and model-generated self-assessment do not create or improve a quality result.
- [ ] Passed and failed counts are bounded, valid, and consistent with observed check results.
- [ ] Authorized external delivery preserves supported quality evidence without weakening existing producer, project, or immutability guarantees.
- [ ] Behavioral tests cover successful checks, failures, explicit feedback, missing evidence, malformed payloads, and misleading efficiency inputs.

## 07 — Surface observed model, effort, tokens, and duration in the workbench

**Published issue:** [#18](https://github.com/quickstark/skills/issues/18).

**What to build:** an end-to-end Project Workbench that displays accurately attributed observation details for actual native and authorized external runs in both the dense run list and integrated selected-readout presentation.

**Blocked by:** 01, 04, 05.

**Native GitHub blockers:** [#12](https://github.com/quickstark/skills/issues/12), [#15](https://github.com/quickstark/skills/issues/15), [#16](https://github.com/quickstark/skills/issues/16).

**Acceptance criteria:**

- [ ] An observed native or authorized external run displays its actual model, reasoning effort, provider-reported tokens, measurement source, attribution scope, and active duration.
- [ ] Individual skill usage is shown only for a proven `skill-run`; thread-turn and thread-cumulative observations remain explicitly labeled.
- [ ] Older and uninstrumented reports remain readable and show **Not captured** rather than zeros or guessed measurements.
- [ ] Workbench summaries and individual standalone readouts agree on immutable report identity and observed values.
- [ ] Unsafe, excessively large, missing, cross-project, or fabricated observation values do not enter the visible project snapshot.
- [ ] The full report-to-workbench path is protected by behavior-focused rendering, ingestion, project isolation, escaping, and legacy compatibility tests.

## 08 — Add an optional bounded and authenticated Codex telemetry receiver

**Published issue:** [#19](https://github.com/quickstark/skills/issues/19).

**What to build:** an independently optional and lightweight OTLP/HTTP receiver that accepts authenticated, privacy-filtered Codex events, correlates only provable skill runs, and preserves normal skill and readout operation when telemetry is unavailable.

**Blocked by:** 04, 05.

**Native GitHub blockers:** [#15](https://github.com/quickstark/skills/issues/15), [#16](https://github.com/quickstark/skills/issues/16).

**Acceptance criteria:**

- [ ] The receiver accepts supported Codex events only through an intentionally bounded authenticated route or explicitly selected trusted network interface.
- [ ] Prompt capture stays disabled; prompts, model instructions, raw output, tool snippets, bearer tokens, headers, and absolute paths never enter persisted observation data.
- [ ] Final response token counts, actual model and reasoning settings, and timing are attached to an individual skill only when the originating harness proves the exact run correlation.
- [ ] Uncorrelated or multi-skill events remain thread-level or are discarded rather than assigned to a promoted skill.
- [ ] No listener binds to every interface; no public anonymous OTLP endpoint, database, third-party platform, VPN, or Tailscale requirement is introduced.
- [ ] Disabled export, malformed events, bad credentials, timeouts, and an offline receiver do not block skill execution, immutable local reports, hosted delivery, or workbench access.
- [ ] Security and failure-mode tests prove that browser authentication, readout ingestion, and telemetry producer authentication remain separate.

## 09 — Verify independent GMK and laptop telemetry opt-in

**Published issue:** [#20](https://github.com/quickstark/skills/issues/20).

**What to build:** a documented and verifiable per-machine Codex telemetry onboarding flow that allows the GMK and any explicitly authorized laptop to opt into the bounded receiver independently, without making telemetry mandatory.

**Blocked by:** 08.

**Native GitHub blockers:** [#19](https://github.com/quickstark/skills/issues/19).

**Acceptance criteria:**

- [ ] The onboarding explains that Codex telemetry routing is user-level and must be configured independently on each participating machine.
- [ ] Each authorized machine uses a distinct scoped producer credential and the supported authenticated OTLP/HTTP transport.
- [ ] The verification flow proves expected model, effort, token, timing, and safe attribution behavior without exposing a secret or logging prompt text.
- [ ] Revoking one machine does not revoke or authorize another machine.
- [ ] Work continues correctly when a machine never opts in or a collector is unavailable.
- [ ] No laptop is accessed, inspected, or reconfigured, and no existing GMK configuration is edited, without the explicit authorization required for that machine.
- [ ] Tests or documented health checks verify machine isolation, safe credential rotation, prompt redaction, bounded failure, and the existing authenticated public route.

## 10 — Recommend next skills and model effort only from verified outcomes

**Published issue:** [#21](https://github.com/quickstark/skills/issues/21).

**What to build:** an evidence-backed workbench and readout recommendation that identifies the catalog-approved next skill and suggests a model or reasoning effort only when enough comparable, successfully checked skill-run observations justify the displayed confidence.

**Blocked by:** 03, 06, 07.

**Native GitHub blockers:** [#14](https://github.com/quickstark/skills/issues/14), [#17](https://github.com/quickstark/skills/issues/17), [#18](https://github.com/quickstark/skills/issues/18).

**Acceptance criteria:**

- [ ] Recommendations group only comparable skill, task category, proven attribution scope, model configuration, and independently observed quality outcome.
- [ ] Each model or reasoning suggestion displays its comparable sample size, quality evidence, confidence, and efficiency rationale.
- [ ] Missing quality data, insufficient samples, failed checks, rejected feedback, and thread-level-only measurements suppress configuration-specific advice.
- [ ] Every recommended next skill is permitted by the existing QuickStark skill catalog.
- [ ] A suggested Sol, Terra, or medium reasoning effort remains advisory and never silently changes the active model or invokes a skill.
- [ ] Behavioral tests cover low-sample, mixed-project, failed-quality, successful comparative, unsupported-transition, and model-preservation scenarios.

## 11 — Promote and verify the protected production Project Workbench

**Published issue:** [#22](https://github.com/quickstark/skills/issues/22).

**What to build:** the approved Project Workbench deployed and independently verified at the existing authenticated production reports address, with historical direct links, readout ingestion, healthy services, rollback, and correct real-run analytics intact.

**Blocked by:** 02, 03, 07.

**Native GitHub blockers:** [#13](https://github.com/quickstark/skills/issues/13), [#14](https://github.com/quickstark/skills/issues/14), [#18](https://github.com/quickstark/skills/issues/18).

**Acceptance criteria:**

- [ ] The existing public reports address serves the approved project-first one-page experience after authentication.
- [ ] Anonymous access to the project library and immutable readouts is still redirected or rejected before project data is disclosed.
- [ ] Existing verified project reports, direct immutable links, authorized producer submissions, and unassigned legacy readouts still work.
- [ ] Actual service health and a successful internal production response are independently verified rather than inferred from routing configuration.
- [ ] The production workbench displays honest skill-run counts and available measured observations without requiring any OpenTelemetry exporter or collector.
- [ ] The approved prototype remains accessible until the production replacement passes health, authentication, behavior, rollback, and generated-plugin verification.
- [ ] Optional collector onboarding and advisory recommendation work do not block the core Project Workbench release.

## Verified dependency frontier

- Immediately unblocked: **01** ([#12](https://github.com/quickstark/skills/issues/12)) production Project Workbench and **04** ([#15](https://github.com/quickstark/skills/issues/15)) directly observed native readout.
- Once **01** completes: **02** ([#13](https://github.com/quickstark/skills/issues/13)) accessible navigation and **03** ([#14](https://github.com/quickstark/skills/issues/14)) honest analytics.
- Once **04** completes: **05** ([#16](https://github.com/quickstark/skills/issues/16)) authorized observed delivery and **06** ([#17](https://github.com/quickstark/skills/issues/17)) independent quality evidence.
- Once **01**, **04**, and **05** complete: **07** ([#18](https://github.com/quickstark/skills/issues/18)) workbench-visible observed runs.
- Once **04** and **05** complete: **08** ([#19](https://github.com/quickstark/skills/issues/19)) optional authenticated Codex telemetry receiver.
- Once **08** completes: **09** ([#20](https://github.com/quickstark/skills/issues/20)) independently authorized GMK and laptop onboarding.
- Once **03**, **06**, and **07** complete: **10** ([#21](https://github.com/quickstark/skills/issues/21)) evidence-based model, effort, and next-skill recommendations.
- Once **02**, **03**, and **07** complete: **11** ([#22](https://github.com/quickstark/skills/issues/22)) core production promotion, without waiting for optional telemetry or recommendations.

## Publication verification

The user approved the 11-ticket breakdown before publication. GitHub issues [#12 through #22](https://github.com/quickstark/skills/issues?q=is%3Aissue%20%22Project%20Workbench%22%20in%3Atitle) are independently published, labeled `ready-for-agent`, and connected by 16 verified native GitHub blocker relationships. Parent issue [#11](https://github.com/quickstark/skills/issues/11) remains open and unmodified. No implementation or telemetry configuration has been claimed or performed.
