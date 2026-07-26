# Specification: Project Workbench and observed skill-run telemetry

Status: implementation-ready specification.

Approved design: Project Workbench, prototype A.

Decision: make the selected Project Workbench the production experience at the existing authenticated QuickStark reports hostname. Treat Codex OpenTelemetry as an independently optional, per-machine enhancement, not as a dependency of the workbench or skill readout delivery.

Approved prototype: [Project Workbench A](https://reports.quickstark.com/prototype/?variant=A).

## Problem Statement

QuickStark already produces immutable skill readouts, publishes authorized reports to a private project library, and serves those reports through an authenticated public HTTPS address. However, the existing production library spreads related work across multiple views and provides too little visual hierarchy for quickly moving between verified projects, skill runs, and individual readouts. A user who wants to resume a project must spend unnecessary screen space and navigation effort answering basic questions: which project is selected, which skill ran, what happened, and which report to open next.

The existing reports also do not consistently capture the observed inference model, reasoning effort, token usage, active duration, or quality evidence for an actual skill run. Consequently, counting skills, comparing successful outcomes, or recommending a more efficient model and reasoning level risks conflating a suggested skill with an invocation, a conversation with an individual run, or speed with output quality. Codex OpenTelemetry can expose useful conversation, response, tool, model, and timing information, but it cannot independently prove that a particular completed model response belongs to exactly one promoted skill.

The GMK currently runs Codex without an enabled user-level OpenTelemetry exporter. A laptop has its own machine-local Codex configuration. Neither cloning a repository nor changing project configuration can enable or route Codex telemetry on those machines. Requiring an observability platform, a new database, shared secrets, a VPN, prompt logging, or an unauthenticated network listener would make a desirable improvement unnecessarily difficult or unsafe.

## Solution

Promote the user-approved Project Workbench into the single, project-first production interface. Present a compact verified-project navigator, a searchable and filterable skill-run list, an integrated selected-readout panel, and a narrow summary of actual run activity together on one page. Preserve immutable direct links, meaningful URL state, responsive layouts, browser authentication, project publication policy, and the separation between the read-only report viewer and authenticated producer ingestion.

Build the workbench from one verified project-library snapshot. Derive project navigation, visible runs, selected-readout metadata, and honest analytics from that same snapshot rather than maintaining multiple independently counted sources of truth. Count actual immutable skill runs, not catalog previews, proposed next skills, internal Codex tool calls, or duplicated entries in a `skillsUsed` list.

Extend new skill readouts with an optional, versioned observed skill-run measurement. When directly available, display the actual model, reasoning effort, final provider-reported tokens, active duration, measurement source, attribution scope, and independently observed quality evidence. Show missing information as **Not captured**. Keep existing reports readable and never retrospectively assign guessed values.

Support Codex OpenTelemetry only as an optional adapter. On the GMK or an independently opted-in laptop, a user-level OTLP/HTTP configuration can export privacy-preserving Codex events to a bounded, authenticated collector. Keep prompt capture disabled. Attach response, timing, and model measurements to a readout only when the originating harness can prove the skill-run correlation. Otherwise display the information explicitly as a thread-turn or thread-cumulative observation, never as an individual skill's usage. The workbench, readout generation, local report, and authenticated hosted report must continue working when telemetry is disabled, unreachable, or unsupported.

Present efficiency guidance only after enough comparable, quality-verified observations exist for the same skill and meaningful task category. A recommendation such as “next best: `/qs-code-build` on Terra at medium reasoning” must remain advisory, explain its observed sample and confidence, respect catalog-approved next skills, and never silently change the active model or reasoning effort.

## User Stories

1. As a QuickStark user, I want Project Workbench A to become the production report experience, so that the approved design is the one I use every day.
2. As a returning user, I want verified projects, skill runs, and the selected readout on one page, so that I can resume work without moving between disconnected screens.
3. As a user with several repositories, I want a persistent verified-project navigator, so that I can switch projects without losing orientation.
4. As a user working on the current repository, I want the active verified project distinguished visually, so that I can immediately identify relevant work.
5. As a user with many reports, I want project activity ordered by actual recent skill runs, so that active projects appear before dormant projects.
6. As a user opening the workbench for the first time, I want a meaningful default project and report selection, so that the page is useful immediately.
7. As a user revisiting an older task, I want to select a report without losing the project list, so that exploration remains efficient.
8. As a user reading a report, I want the selected report visibly distinguished from adjacent skill runs, so that I always know what I am viewing.
9. As a user scanning project history, I want human-readable skill names, timestamps, actual statuses, and concise outcomes, so that meaningful work is recognizable at a glance.
10. As a user examining project activity, I want compact and accessible status cues, so that completed, blocked, and awaiting-input work is distinguishable without relying on color alone.
11. As a user with a wide display, I want the navigator, report list, and readout to make good use of horizontal space, so that the workbench avoids oversized cards and wasted whitespace.
12. As a laptop user, I want panels to adapt to a narrower viewport, so that the one-page workbench remains readable without horizontal page scrolling.
13. As a mobile user, I want project navigation, report selection, and readout content to stack predictably, so that no part of the workbench becomes inaccessible.
14. As a keyboard user, I want every navigation control, search input, filter, and report link to have visible focus and meaningful labels, so that I can use the workbench without a pointer.
15. As a user of assistive technology, I want headings, live feedback, navigation landmarks, and status text to remain semantic, so that visual improvements do not reduce accessibility.
16. As a user searching project history, I want to search verified project identity, actual skill name, and report outcome, so that I can find a run without remembering its filename.
17. As a user investigating a particular workflow, I want to filter by observed skill and actual outcome, so that relevant reports surface quickly.
18. As a user restoring a browser tab, I want selected project, report, search, and filters represented by safe URL state, so that the workbench can be reopened accurately.
19. As a user sharing a link with an authorized reader, I want a direct selected-report link, so that the intended project and immutable readout are restored.
20. As a user reviewing reports from multiple machines, I want the observed execution machine and platform available when actually captured, so that I understand where a run happened.
21. As a user opening an immutable report, I want the original standalone report to remain available, so that the workbench does not replace portable primary artifacts.
22. As a user with historical reports, I want older reports to remain readable without migration, so that adopting the workbench does not discard previous decisions.
23. As a user with unverified legacy reports, I want them labeled as unassigned rather than assigned to a guessed project, so that repository ownership remains honest.
24. As a user with no reports, I want an explanatory empty state, so that an empty project library is not confused with a failed service.
25. As a user with a search yielding no matches, I want a distinct filtered-empty state and an easy way to clear filters, so that I can recover the full list.
26. As a user viewing previews, I want catalog previews excluded from actual work by default, so that demonstrations cannot inflate activity.
27. As a user intentionally exploring the skill catalog, I want previews clearly labeled and explicitly selectable, so that examples remain useful without being mistaken for runs.
28. As a project owner, I want an exact count of actual immutable skill runs, so that analytics describe work that really happened.
29. As a user comparing projects, I want run totals scoped to the selected verified project, so that another project's activity is not mixed into my metrics.
30. As a user applying a report filter, I want the interface to distinguish visible results from project-wide totals, so that a filter does not silently redefine the underlying metric.
31. As a user monitoring workflow activity, I want counts by observed primary skill, so that I can see which promoted skills were actually invoked.
32. As a user of collaborative skill workflows, I want participating skills distinguished from independently completed skill runs, so that one report is not counted as several executions.
33. As a user reviewing recent work, I want activity windows computed from observed report timestamps, so that the interface does not invent streaks or progress.
34. As a user comparing report outcomes, I want actual completed, blocked, and awaiting-input counts, so that statuses reflect recorded results.
35. As a user checking model efficiency, I want the actual provider and model shown when observed, so that I can understand which model produced a run.
36. As a user controlling inference depth, I want the observed reasoning effort shown when available, so that low, medium, and higher-effort runs can be compared accurately.
37. As a user tracking model usage, I want final provider-reported input, output, cached, reasoning, and total token counts when actually available, so that token analytics are based on completed responses.
38. As a user examining an older or uninstrumented report, I want unavailable measurements labeled **Not captured**, so that missing values are never shown as zero.
39. As a user measuring latency, I want observed active run duration distinguished from request duration and full conversation duration, so that unlike measurements are not compared.
40. As a user reviewing telemetry, I want the measurement source identified, so that a provider response, verified harness, user report, and Codex OpenTelemetry are not presented as equivalent evidence.
41. As a user reviewing token usage, I want skill-run, thread-turn, and thread-cumulative attribution visibly distinguished, so that a whole conversation is never attributed to one skill.
42. As a user running several skills in one turn, I want ambiguous completed-response usage kept at turn level, so that token counts are not split or duplicated without evidence.
43. As a user checking a generated readout, I want the same honest measurements available in the report and the workbench, so that summaries agree with their primary artifact.
44. As a user submitting a readout from another harness, I want optional observations validated consistently, so that external producers cannot introduce fabricated or malformed measurements.
45. As a user retrying a submission, I want immutable observation identity and conflict handling preserved, so that duplicate delivery cannot inflate analytics.
46. As a GMK operator, I want a small, optional user-level Codex telemetry setup, so that enabling observability does not require changing every project.
47. As a laptop user, I want to opt in on my own machine independently, so that laptop telemetry is never presumed to be enabled by the GMK configuration.
48. As a managed-laptop user, I want an approved browser and HTTPS route rather than a required VPN or Tailscale installation, so that normal corporate device restrictions are respected.
49. As a privacy-conscious user, I want Codex prompt logging disabled, so that instructions and user messages are not exported into the report system.
50. As a security-conscious user, I want credentials, authorization headers, raw tool output, absolute paths, and prompt bodies excluded from reports, so that telemetry cannot expose sensitive information.
51. As an operator, I want telemetry transport authenticated independently from browser authentication, so that producer credentials are not treated as a viewer session.
52. As an operator, I want any telemetry collector reachable only through an intentionally bounded authenticated route or trusted interface, so that there is no anonymous or all-interface OTLP listener.
53. As an operator, I want existing Authelia protection to remain in front of the report library, so that the public hostname does not expose project identities.
54. As an operator, I want readout ingestion and telemetry collection to remain separate capabilities, so that receiving a machine observation does not make the report viewer writable.
55. As a user with telemetry disabled, I want report generation, ingestion, hosted browsing, and skill execution to continue normally, so that observability never blocks useful work.
56. As a user with an unavailable collector, I want failures bounded and local reports preserved, so that a temporary observability outage does not destroy or delay a skill readout.
57. As an operator, I want deployment to avoid a mandatory observability platform, database, or vendor subscription, so that the feature remains proportionate to a personal GMK.
58. As a user assessing output quality, I want passed checks, failed checks, review outcomes, and explicit feedback reported separately from token and timing metrics, so that fast answers are not mislabeled as good answers.
59. As a user providing feedback, I want accepted, needs-revision, and rejected outcomes explicitly sourced, so that recommendations use real quality signals.
60. As a user comparing model configurations, I want only comparable skill, task-category, outcome, and measurement-scope samples grouped together, so that recommendations do not combine unlike work.
61. As a user with limited historical data, I want the interface to say that evidence is insufficient, so that a single successful run does not become a confident optimization.
62. As a user considering a cheaper model, I want recommended model, reasoning effort, sample size, quality evidence, and confidence explained together, so that the tradeoff is understandable.
63. As a user following the QuickStark catalog, I want next-skill suggestions limited to catalog-approved transitions, so that telemetry cannot invent new workflow policy.
64. As a user selecting Sol or Terra, I want model recommendations expressed as suggestions, so that Codex never silently changes my selected model.
65. As a user choosing reasoning effort, I want a medium-effort suggestion made only when comparable accepted evidence supports it, so that a default preference is not presented as measured fact.
66. As a user whose task involves higher stakes or complexity, I want higher-effort configurations retained when quality evidence requires them, so that token minimization does not degrade results.
67. As a user viewing efficiency guidance, I want confidence to fall when checks fail or feedback is missing, so that recommendations remain calibrated.
68. As a project administrator, I want per-project publication policy and per-producer grants enforced for measured reports, so that telemetry cannot bypass existing project authorization.
69. As an administrator rotating a machine credential, I want revoked telemetry and readout grants to stop working independently, so that each integration can be disabled safely.
70. As a user changing machines, I want normalized project identity to remain stable across approved producers, so that authorized GMK and laptop history is grouped correctly.
71. As a user loading a report containing unusual or malicious text, I want all visible metadata safely escaped, so that projects, models, and outcomes cannot execute browser content.
72. As an operator testing a deployment, I want actual application health and route authentication verified independently, so that a DNS record or configuration alone is not called a working release.
73. As a maintainer, I want the canonical renderer, generated output contracts, and generated Codex plugin to remain synchronized, so that both supported harnesses describe the same observation behavior.
74. As a maintainer, I want the selected workbench implemented against the existing project-library and ingestion seams, so that the feature does not create a parallel reporting architecture.
75. As a user, I want the approved prototype to remain accessible until its production replacement is verified, so that promoting the design does not interrupt access.
76. As a user using a personal or managed laptop away from home, I want the existing authenticated public report address to remain the entry point, so that I never have to open a GMK loopback URL.

## Implementation Decisions

1. **Approved experience.** Project Workbench A is the authoritative production interaction model. Promote its project navigator, dense skill-run list, integrated selected-readout presentation, compact truthful analytics, accessible visual cues, and responsive layout into the existing authenticated report library. The approved experience replaces fragmented top-level navigation without removing immutable standalone reports.
2. **Single high-level seam.** Use one verified project-library snapshot as the source of truth for verified projects, immutable readouts, selection, search, filtering, project summaries, recent activity, and run counts. Apply observations as an optional, validated extension of that snapshot. Test the visible workbench and report-delivery behaviors at this existing high-level seam instead of introducing independent metric stores or parallel gallery implementations.
3. **Honest project identity.** Group only by canonical, sanitized, verified project identity. Keep uncertain legacy reports visibly unassigned. Enforce the existing hosted publication allowlist and per-producer project grants before a project, report, observation, or summary enters the hosted snapshot.
4. **Deterministic one-page state.** Restore selected project, immutable report, search, visible skill, outcome, preview visibility, and any documented activity window from bounded, validated URL state. Provide deterministic defaults, accessible panel navigation, filtered-empty recovery, and direct immutable report links. Do not expose unsanitized project identifiers or filesystem paths.
5. **Run-count semantics.** Count one actual skill run per unique immutable, non-preview report identity and recorded primary skill. Treat additional `skillsUsed` entries as participating skills, not separately completed runs. Do not count previews, proposed next skills, internal Codex tools, repeated ingestion attempts, or OpenTelemetry tool events as promoted skill invocations.
6. **Observable, not decorative, analytics.** Display only project-scoped actual run totals, visible filtered counts, recorded status counts, observed primary-skill frequencies, and explicitly timestamped recent activity. Distinguish project-wide totals from the currently filtered list. Do not invent progress percentages, estimated cost, streaks, baseline improvements, output quality, or historical values.
7. **Versioned optional observation.** Extend newly generated and externally ingested actual skill readouts with a bounded optional observation contract containing version, measurement source, attribution scope, capture timestamp, optional inference, optional token usage, optional timing, optional independent quality evidence, and optional recommendation evidence. Preserve old envelopes and reports without rewriting or reassigning their measurements.
8. **Strict measurement provenance.** Permit only explicitly identified measurement sources: final provider response, Codex OpenTelemetry, verified harness observation, and clearly marked user report. Permit only `skill-run`, `thread-turn`, and `thread-cumulative` attribution scopes. Aggregate and display a measurement as individual skill usage only for a proven `skill-run`; preserve thread-level measurements as thread-level information.
9. **Final-response token accounting.** Accept bounded, nonnegative, provider-observed input, cached-input, cache-write, output, reasoning-output, and total token counts only from a completed response or equivalently verified harness result. Validate consistent counts. Never estimate tokens from characters, confuse authentication tokens with model tokens, or divide one response among several skills.
10. **Timing semantics.** Separately label directly observed skill active duration, provider-request duration, and turn-level duration. Validate start and completion ordering. A report creation timestamp, collector arrival time, browser render time, or conversation age is not a skill execution duration.
11. **Independent quality evidence.** Record only observed check results, explicitly recorded user feedback, a documented review rubric, or a human-calibrated evaluation. Keep output quality independent from speed, token usage, response length, model price, and a generated self-assessment. Do not introduce a judge-model requirement into ordinary readout generation.
12. **Official Codex telemetry boundary.** Codex OpenTelemetry is disabled until the operator deliberately opts in. Telemetry routing belongs to user-level configuration on each individual machine; repository-local configuration cannot enable or route it. Configure the GMK and each authorized laptop independently. Keep user prompt logging disabled and treat model, reasoning settings, completed-response token events, and request/tool timings only as the observations actually emitted by the supported client.
13. **Minimal transport.** Prefer the supported asynchronous OTLP/HTTP log exporter over introducing a full observability platform. A collector is acceptable only when one small isolated receiver, a bounded existing HTTPS route or explicitly selected private interface, per-machine authentication, safe metadata filtering, and straightforward health and disable procedures are sufficient. Otherwise defer centralized OpenTelemetry and ship directly observed report measurements without it.
14. **Fail-open behavior.** The viewer, skill runner, immutable local readout, hosted readout publisher, and ingestion service must not depend on exporter availability. Use bounded telemetry work and preserve the original local report when a collector is unavailable, credentials are absent, or a source cannot establish attribution.
15. **Separate security boundaries.** Keep the public report hostname HTTPS-protected by the existing authenticated reverse proxy and Authelia. Keep the read-only viewer, scoped readout ingestion, and any optional telemetry receiver separate. Never open an unauthenticated receiver, bind a collector to every interface, expose source checkouts, log bearer values, use browser authentication as a machine producer credential, or require Tailscale.
16. **Privacy-preserving payloads.** Persist only safe allowlisted model identifiers, bounded effort labels, numeric usage and timing, sanitized project and immutable run identities, explicit confidence, check counts, and approved feedback. Reject prompt and response bodies, internal tool-output snippets, authorization headers, credential material, absolute paths, environment values, raw traces, and arbitrary uploaded HTML.
17. **Recommendations with confidence.** Recommend only catalog-approved next skills. A model or reasoning-effort hint requires comparable, successfully checked or independently accepted observations for the same skill and task category, a displayed sample count, an explicit confidence level, and a stated quality-versus-efficiency rationale. Below the defined threshold, display insufficient evidence and omit configuration-specific advice. Hints are advisory and never alter the active model, reasoning level, or invocation policy.
18. **Cross-harness consistency.** Normalize observations consistently for canonical QuickStark readouts, authorized externally produced readouts, immutable hosted reports, safe gallery metadata, completion reports, and synchronized generated Codex skill copies. Preserve the existing explicit-versus-implicit invocation policies and the distinction between promoted and external skills.
19. **Immutable delivery.** Keep report identity and accepted payload stable across retries. Preserve existing duplicate-idempotency and conflicting-submission rejection. A later telemetry observation must not retroactively rewrite, reattribute, or replace an existing immutable report.
20. **Release sequencing.** First ship and verify the one-page workbench and honest run analytics against existing report data. Then ship optional observation capture, normalization, standalone-report rendering, and hosted ingestion. Enable GMK or laptop OpenTelemetry only after its small authenticated transport and actual attribution have been separately verified. Retain the prototype until the production route, old direct links, authorization, and health checks all pass.

## Testing Decisions

1. Favor behavior-focused tests of the verified project-library snapshot and observable HTTP, normalization, immutable-delivery, and rendered-document boundaries. Assert what a user or authorized producer can observe; do not couple tests to HTML formatting, private helper names, CSS class strings, or collector internals.
2. Test that the approved workbench presents one project navigator, one selected project's real run list, and one integrated selected-report experience from the same library snapshot.
3. Test verified project grouping, safe canonical identity, alternate Git-remote normalization, current-project indication, unassigned legacy reports, exact project authorization, and cross-machine producer grants.
4. Test deterministic default selection, safe shareable URL state, project switching, report switching, search, outcome and skill filters, filtered-empty recovery, keyboard-accessible navigation, semantic accessible labels, narrow layouts, and immutable report direct links.
5. Test actual run totals against multiple projects, duplicate report identities, retries, mixed recorded statuses, participating `skillsUsed` entries, clearly marked catalog previews, recommended next skills, and internal tool-call events. Verify that each actual immutable report contributes exactly one primary skill run.
6. Test that legacy reports without observations remain readable, independently generated reports without telemetry still render, and every unavailable field is displayed as **Not captured** rather than zero or an invented default.
7. Test each supported observation source and each attribution scope. Accept valid skill-run measurements; preserve turn and cumulative measurements under their true scope; reject attempts to aggregate either scope as per-skill usage.
8. Test final completed-response usage, cached and reasoning token breakdowns, oversized and negative numeric values, inconsistent totals, repeated completion events, incomplete responses, and multi-skill conversations. Confirm that token values never enter reports before their actual provider measurement is available.
9. Test actual skill timing, separate request timing, reversed timestamps, missing boundaries, repeated events, collector delivery time, and report creation time. Confirm that unrelated durations are not displayed as active skill execution.
10. Test independent observed passed and failed checks, explicit accepted and rejected feedback, missing quality evidence, and documented confidence thresholds. Confirm that low token count, short duration, output length, and a model's self-assessment do not create a quality score.
11. Test recommendation grouping by skill, task category, quality outcome, measurement source, and attribution scope. Confirm that inadequate sample sizes suppress model and effort hints, failing samples reduce confidence, hints remain catalog-approved, and no recommendation changes the actual selected model.
12. Test canonical and authorized external observation normalization at the existing high-level report-generation and ingestion boundaries. Exercise valid, missing, additional, malformed, unsafe, cross-project, duplicate, and conflicting observation payloads.
13. Test the viewer's existing browser authentication and read-only methods independently from producer authentication and any future optional telemetry receiver. Confirm rejected anonymous requests, traversals, symbolic-link escapes, unapproved projects, unsafe report metadata, raw HTML, secrets, and unsupported methods.
14. Test that a disabled exporter, absent per-machine configuration, bad machine credential, offline collector, expired or revoked producer grant, collector timeout, and unsupported harness do not prevent local report creation or normal workbench browsing.
15. Test that prompts, model instructions, response bodies, tool-output snippets, bearer credentials, telemetry headers, absolute machine paths, and environment-variable values never appear in generated HTML, workbench metadata, ingestion responses, or collector-derived observations.
16. Test immutable standalone reports for the existing restrictive security headers, correctly escaped values, preserved offline readability, and absence of executable scripts or externally loaded resources.
17. Test production routing with the actual healthy service, the expected anonymous authentication redirect, the authenticated existing report route, preserved historical links, and deliberate rollback. Treat configured DNS, a container definition, or an unverified URL as insufficient proof of deployment.
18. Reuse and extend the project's existing skill-catalog, immutable-report, project-library, preview, readout-ingestion, security-header, producer-policy, renderer, output-contract, and generated-plugin behavioral test coverage. Run the complete repository test suite and verify the generated Codex snapshot before accepting the change.

## Out of Scope

- Automatically editing or enabling the GMK's user-level Codex configuration.
- Changing, inspecting, or enabling Codex configuration on a laptop that has not explicitly opted in.
- Claiming that repository-local Codex configuration enables telemetry.
- Logging prompts, model instructions, model response bodies, raw traces, tool-output snippets, environment contents, authorization headers, or bearer credentials.
- Treating a Codex internal tool call as proof that a promoted QuickStark skill ran.
- Estimating, backfilling, dividing, or duplicating response-level token usage across individual skills.
- Assigning timing, model, effort, quality, or token measurements to historical reports that did not capture them.
- Silently switching a Codex model, changing reasoning effort, invoking a suggested skill, or overriding the catalog's invocation policy.
- Inventing financial cost, productivity improvements, quality scores, comparative model rankings, or confidence without observed and comparable evidence.
- Mandating an external analytics service, paid observability vendor, full tracing platform, dedicated database, Grafana stack, VPN, Tailscale, or public all-interface collector.
- Replacing the existing reverse proxy, Authelia browser authentication, per-project publication policy, read-only report viewer, or authenticated readout ingestion.
- Serving a source repository, accepting arbitrary HTML, allowing anonymous publication, or sharing a producer credential between machines.
- Migrating or reclassifying unverified legacy project ownership without an explicit, independently reviewed migration.
- Deleting prototype variants before the production Project Workbench and existing report links are independently verified.

## Further Notes

The user selected [Project Workbench A](https://reports.quickstark.com/prototype/?variant=A) after reviewing the published design variants. The existing reports hostname is already reachable through public HTTPS and protects anonymous browser requests with the existing authentication flow. Publicly addressable does not mean publicly readable.

As verified for this specification, the GMK has Codex installed but does not currently configure a user-level OpenTelemetry exporter. This specification deliberately does not enable one or access a laptop. The low-friction decision is therefore: deliver the workbench and direct readout observations first; add per-machine OTLP/HTTP export only when an isolated authenticated receiver, prompt redaction, and skill-run correlation are all practical.

Official Codex guidance confirms that OpenTelemetry is disabled by default, supports asynchronous OTLP/HTTP and OTLP/gRPC export, and redacts prompts unless prompt logging is deliberately enabled. Its documented conversation-start events report model and reasoning settings; completed server-sent events expose response token counts; API and tool events expose their actual durations. These are useful signals, not proof of promoted skill invocation. See [Codex observability and telemetry](https://learn.chatgpt.com/docs/config-file/config-advanced#observability-and-telemetry) and [Codex emitted OpenTelemetry events](https://learn.chatgpt.com/docs/config-file/config-advanced#what-gets-emitted).

The official [Codex configuration reference](https://learn.chatgpt.com/docs/config-file/config-reference#configtoml) explicitly states that telemetry routing belongs to user-level configuration and that project-level telemetry settings are ignored. Consequently, configuring the GMK never configures a laptop, and placing telemetry settings in a repository cannot make this feature automatically portable.

When considering richer quality evaluation in the future, follow [OpenAI evaluation best practices](https://developers.openai.com/api/docs/guides/evaluation-best-practices#llm-as-a-judge-and-model-graders): use a task-specific rubric, observable checks, representative examples, and human-calibrated agreement. A lower-cost or faster model is an efficiency observation, not an independently validated quality judgment.

Implementation should be decomposed into dependency-aware tickets covering the approved one-page workbench, exact report-derived analytics, backward-compatible observed-readout contracts, optional authenticated GMK and laptop telemetry, and quality-gated advisory recommendations.
