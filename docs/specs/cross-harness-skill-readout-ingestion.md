# Specification: authenticated cross-harness skill readout ingestion

Status: implemented in QuickStark 2.4.0. The original parent specification was published as GitHub issue [#1](https://github.com/quickstark/skills/issues/1).

Implementation evidence: `scripts/qs-skill-readout.mjs`, `deploy/readouts/compose.yaml`, and the authenticated-ingestion, immutable-retry, producer-isolation, external-skill, credential-rotation, and portable-publisher tests in `tests/qs-skills.test.mjs`.

Operational guidance: [`../readout-operations.md`](../readout-operations.md). Architecture and security boundaries: [`../architecture.md`](../architecture.md).

The requirements below preserve the original design and acceptance intent. Their presence does not independently establish the current state of a GitHub issue, a published GitHub release, or a real separately located laptop.

Owner: QuickStark Skills.

Primary test seam: an authorized harness submits one versioned skill-readout envelope to the hosted ingestion interface, and an authenticated reader can retrieve the resulting immutable, approved-project report from the existing project library.

## Problem Statement

QuickStark already provides an authenticated hosted project library at its report domain, but the reporting container can display only immutable reports present in the remote machine's persistent report directory. Its viewer deliberately accepts `GET` and `HEAD`, rejects `POST`, and mounts the report directory read-only. A skill run on a laptop or another machine therefore creates a skill readout on that machine, not in the hosted project library.

The problem is broader than the existing QuickStark catalog. The user may run Codex Desktop, Codex CLI, another Codex harness, Claude Code, another agent harness, a local skill, an installed skill, or an independently maintained skill collection. Those producers must not need to execute on the remote box, mount its filesystem, share a checkout, imitate a QuickStark-promoted skill, or complete an interactive browser login merely to publish an explicitly authorized skill run.

Opening the existing viewer to arbitrary public `POST` requests would introduce a worse problem: forged reports, overwritten history, unbounded uploads, credential leakage, unwanted disclosure of private repository names, malicious HTML, unauthorized project publication, and export of confidential work to personal infrastructure. The reporting container needs an interoperable, narrowly authenticated, project-authorized way to receive a report without weakening the existing browser-authenticated, read-only viewer.

## Solution

Extend the hosted reporting stack with one explicit, versioned skill-readout ingestion seam on the existing report hostname. An authorized agent harness sends structured JSON describing one actual skill run; the ingestion module authenticates the producer, validates its project grant and publication policy, normalizes the readout, renders safe server-owned HTML, writes one immutable report into durable project-organized storage, and returns its actual hosted report location. The existing browser-authenticated project library discovers and presents the report without becoming a general-purpose writable web server.

Make the producer contract harness-neutral and skill-catalog-neutral. A producer identifies its harness, producer instance, originating skill collection, skill, canonical project, actual run, UTC generation time, observed status, outcome, findings, decisions, outputs, checks, and explicitly observed relationships. Preserve native QuickStark report profiles for registered QuickStark skills while providing an honest, self-contained external-skill report profile for authorized skills that do not belong to the QuickStark catalog.

Provide one portable publisher adapter that any authorized harness can invoke using ordinary HTTPS, an explicitly configured ingestion URL, and a narrowly scoped producer credential. Publication is opt-in per producer and project. A local skill readout must remain usable when publication is disabled, unauthorized, unreachable, or explicitly forbidden by project or employer policy.

## User Stories

1. As a QuickStark user, I want a report generated on my laptop to appear in the hosted project library, so that its availability does not depend on running Codex on the remote box.
2. As a Codex Desktop user, I want to publish a completed skill run over HTTPS, so that I do not need access to the report server's filesystem.
3. As a Codex CLI user, I want the same publication contract as Codex Desktop, so that changing harnesses does not fragment my project history.
4. As a user of another Codex harness, I want publication to depend on an open versioned request rather than desktop internals, so that newly supported harnesses can integrate without redesigning the server.
5. As a Claude Code user, I want an authorized Claude skill to submit a skill readout, so that the library can include work from more than one coding harness.
6. As a user of an independent skill collection, I want a non-QuickStark skill to retain its genuine name and collection, so that it is not falsely represented as a promoted QuickStark skill.
7. As a user of a local unpublished skill, I want an approved readout to identify its actual producer and skill, so that local development remains interoperable.
8. As a user with multiple machines, I want the same canonical project to collect reports from each authorized machine, so that project history is not split by hostname or checkout path.
9. As a user with multiple harnesses, I want a report to identify the harness that produced it, so that I can distinguish how each skill run happened.
10. As a user with repeated skill runs, I want each accepted report to be immutable, so that a later run cannot silently alter an earlier outcome.
11. As a user retrying an interrupted upload, I want an identical retry to return the existing accepted report, so that transient network failures do not create duplicates.
12. As a user retrying a conflicting run identifier, I want the changed request rejected, so that one run identifier cannot overwrite or misrepresent existing history.
13. As a user opening a published report, I want an actual canonical HTTPS report link, so that I can reach the report through the existing authenticated domain.
14. As a user browsing the project library, I want externally produced reports grouped with the same verified project, so that I do not have to use a second gallery.
15. As a user searching previous work, I want externally produced skills and outcomes included in authorized project search, so that harness-neutral reports are discoverable.
16. As a user reviewing recent work, I want authorized external reports included in the activity timeline, so that cross-harness activity appears in actual chronological order.
17. As a user inspecting one report, I want its producer, harness, collection, skill, project, generation time, and report identity recorded honestly, so that its origin is explainable.
18. As a user of native QuickStark skills, I want their existing purpose-specific report profiles preserved, so that interoperability does not flatten established readouts.
19. As a user of an unknown skill collection, I want a safe generic report profile, so that a missing local catalog registration does not prevent authorized ingestion.
20. As a user of the hosted library, I want catalog previews excluded from published actual work, so that a demonstration is never counted as a completed skill run.
21. As a user reading a finding, I want only producer-recorded observations rendered, so that ingestion does not invent evidence.
22. As a user reviewing checks, I want only actually performed validations reported, so that a submitted readout cannot imply tests were run when they were not.
23. As a user reviewing delivery provenance, I want provenance either verifiable or clearly identified as producer-reported, so that an upload cannot manufacture a published pull request or release.
24. As a harness integrator, I want a documented versioned JSON envelope, so that I can implement a compatible producer in any language.
25. As a harness integrator, I want stable success and error responses, so that automated publishers can retry or fail safely.
26. As a harness integrator, I want to authenticate using a configured machine credential, so that publication does not depend on an interactive Authelia browser session.
27. As an operator, I want a separate credential for each producer, so that I can identify and revoke one laptop without disabling other harnesses.
28. As an operator, I want each producer credential scoped to explicitly approved projects, so that one producer cannot publish another project's readouts.
29. As an operator, I want an independent publication policy for hosted projects, so that an otherwise valid producer cannot make an unapproved project visible.
30. As an operator, I want adding a producer to require an explicit grant, so that installing a harness does not silently authorize report publication.
31. As an operator, I want rotating or revoking credentials to take effect predictably, so that lost or compromised credentials can be contained.
32. As a security-conscious user, I want bearer credentials excluded from reports, URLs, logs, and browser responses, so that ingestion does not expose publishing access.
33. As a security-conscious user, I want authentication checked before sensitive request details are disclosed, so that anonymous users cannot enumerate projects or producers.
34. As a security-conscious user, I want unauthorized project submissions rejected without confirming project existence, so that the endpoint does not disclose the project library.
35. As a security-conscious user, I want only the dedicated ingestion route to accept `POST`, so that the gallery and direct report viewer remain read-only.
36. As a security-conscious user, I want browser authentication to remain enforced for report viewing, so that a producer credential does not become unrestricted browser access.
37. As a security-conscious user, I want producer authentication separate from browser-session authentication, so that a cross-origin browser cannot publish using an existing Authelia cookie.
38. As a security-conscious user, I want request size, item counts, field lengths, and nesting bounded, so that a producer cannot exhaust memory, storage, or CPU.
39. As a security-conscious user, I want rate limits and bounded timeouts, so that a leaked or abusive credential cannot overwhelm the reporting stack.
40. As a security-conscious user, I want malformed JSON and unsupported content types rejected, so that uploads have one predictable ingestion format.
41. As a security-conscious user, I want arbitrary uploaded HTML rejected, so that a submitted report cannot execute scripts in the authenticated report domain.
42. As a security-conscious user, I want all report HTML rendered and escaped by the trusted server, so that submitted findings cannot introduce script execution or active unsafe links.
43. As a security-conscious user, I want traversal, absolute paths, credential-bearing Git origins, and symbolic-link escapes rejected, so that the report writer cannot touch unrelated files.
44. As a security-conscious user, I want archive, attachment, remote-fetch, and compressed-upload support excluded by default, so that ingestion cannot become a file-transfer or request-forgery mechanism.
45. As a project owner, I want equivalent safe SSH and HTTPS origins normalized to one verified project, so that authorized submissions are grouped consistently.
46. As a project owner, I want producer-supplied display labels prevented from determining project authorization, so that a forged heading cannot bypass project grants.
47. As a project owner, I want employer-confidential and customer-confidential projects excluded unless explicitly authorized, so that report publishing never assumes permission to export work.
48. As a managed-laptop user, I want publication disabled by default, so that installing a skill does not transfer local project data to a personal domain.
49. As a managed-laptop user, I want a clear local-only failure mode, so that corporate egress restrictions do not prevent a skill run from completing.
50. As a user of a disconnected laptop, I want local readout generation to remain functional, so that hosted availability is not a prerequisite for using a skill.
51. As an operator, I want the browser viewer to keep its read-only report mount, so that accepting uploads does not expand its write privileges.
52. As an operator, I want write access confined to an ingestion adapter, so that the module that displays reports cannot modify report history.
53. As an operator, I want the ingestion route to share the existing HTTPS domain, so that producers do not need a second public hostname.
54. As an operator, I want route precedence to send only the exact ingestion prefix to the ingestion adapter, so that gallery authentication and read-only behavior remain intact.
55. As an operator, I want the ingestion adapter to run on the existing private proxy network without publishing a host port, so that the report stack does not expose an additional direct network listener.
56. As an operator, I want immutable writes to use restrictive permissions, so that other processes cannot replace an accepted report.
57. As an operator, I want a success response issued only after an immutable report is durably accepted, so that a client never receives a link to a report that was not created.
58. As an operator, I want safe request audit records without report contents or credentials, so that security events can be investigated without creating a sensitive shadow archive.
59. As a user with an existing report history, I want existing report links and project discovery preserved, so that ingestion does not break stored readouts.
60. As a native QuickStark user, I want unknown external skills accepted only through the ingestion contract, so that the existing native catalog still rejects fabricated promoted skills.
61. As a plugin maintainer, I want canonical and generated Codex reporting helpers kept synchronized, so that a supported harness uses the documented production contract.
62. As an implementer, I want end-to-end tests through actual HTTP submission and authenticated gallery behavior, so that passing tests demonstrate useful cross-machine publication.
63. As an administrator, I want the publication feature disabled when no producer grants are configured, so that deployment fails closed rather than accepting arbitrary posts.
64. As an administrator, I want retention and deletion to remain deliberate and project-scoped, so that ingestion does not unexpectedly remove another project's history.
65. As a user, I want the reporting stack to distinguish local generation, durable ingestion, and hosted publication, so that a displayed URL never implies work was transferred when it was not.
66. As an operator, I want external deployment and credential issuance treated as separately authorized actions, so that an approved specification does not itself change public infrastructure.

## Implementation Decisions

1. **One highest-level ingestion seam.** Add one externally documented, versioned HTTPS submission interface for a complete skill readout. Test the contract by posting an authorized readout and retrieving the resulting immutable document from the existing hosted library. Do not make Codex Desktop internals, CLI internals, browser automation, mounted remote directories, or individual skill implementations the primary testing seam.

2. **Same report hostname, dedicated write route.** Expose the producer interface as `POST /api/v1/readouts` on the existing authenticated report hostname. Route that exact prefix explicitly to an ingestion adapter. Keep the browser gallery, report documents, and existing viewer health contract on their present read-only route. Do not make the entire report viewer accept `POST`.

3. **Separate read and write authority.** Retain the browser viewer's read-only container filesystem and read-only report-library mount. Give only the ingestion adapter the narrowly scoped writable report-library mount it requires. Prefer a separately hardened ingestion process or companion container within the reporting stack over granting the browser viewer unnecessary write authority.

4. **Proxy and browser-authentication separation.** Keep browser requests protected by the existing approved authentication middleware. Route producer submissions using a dedicated machine-authentication policy rather than requiring an interactive Authelia session. The ingestion endpoint must not accept browser-session cookies as publishing credentials, publish permissive cross-origin headers, or allow an authenticated browser to issue an implicit cross-origin submission.

5. **Producer-scoped machine authentication.** Require an explicitly configured `Authorization: Bearer` producer credential on every submission. Represent each producer with its own revocable producer identity and allowed canonical projects. Validate secrets using safe constant-time comparison against server-side protected credential material. Never embed credentials in a report, request URL, response, frontend configuration, checkout, generated plugin, or audit record.

6. **Explicit producer and project grants.** Default to deny when ingestion, producer credentials, producer identity, canonical project grants, or publication policy are absent. Verify both that the producer may submit for the canonical project and that the hosted library explicitly permits that project. A producer-provided project label is not authorization.

7. **Harness-neutral identity.** Record the actual harness family, optional validated harness version, stable non-sensitive producer identity, skill collection, skill identifier, and human-readable skill display name. Do not require an external skill to be registered in the QuickStark promoted-skill catalog.

8. **Preserve native catalog guarantees.** Continue rejecting unregistered or fabricated skills in the existing native QuickStark renderer. Native QuickStark reports retain their validated catalog membership, actual used-skill checks, allowed next-skill checks, and purpose-specific report profiles. Normalize authorized external skills through an independently validated external-readout profile rather than quietly widening native catalog validation.

9. **Versioned structured request.** Accept one UTF-8 `application/json` envelope carrying a supported contract version, canonical project identity, producer identity, harness identity, skill identity, immutable run identifier, UTC creation time, actual report status, nonempty outcome, and bounded observed findings, decisions, outputs, checks, optional next recommendations, and explicitly observed relationships. Unknown required versions fail clearly; forward-compatible optional fields are deliberately validated or ignored without changing actual results.

10. **Verified project identity.** Normalize sanitized canonical Git-origin identity on the server and reject credentials, fragments, query strings, unsafe segments, arbitrary files, absolute machine paths, and mismatched canonical keys. Permit only explicit, pre-authorized local-project identities when their publication policy has deliberately allowed them. Never infer ownership from an outcome, heading, working-directory name, or client-provided display label.

11. **Server-owned HTML.** Producers submit structured results, not raw HTML. The server validates and renders the immutable self-contained report using the maintained safe readout contract. Escape every producer-supplied field, exclude executable or external assets, and preserve restrictive viewer response headers. Do not accept multipart content, attachments, archives, arbitrary templates, markdown-to-HTML executable content, remote image downloads, or client-generated scripts.

12. **External report compatibility.** Extend report metadata and discovery deliberately so an external skill readout appears in the existing project library, project explorer, project search, immutable direct links, and activity timeline. Preserve its actual skill and harness identity without pretending it is a promoted QuickStark report or relying on a forged QuickStark filename.

13. **Truthful actual-run semantics.** Accept only actual completed, awaiting-input, or blocked skill runs. Catalog previews cannot be submitted as actual hosted activity. Actual used skills, findings, decisions, checks, and observed relationships must represent producer-supplied records rather than server-generated guesses.

14. **Provenance must not be silently elevated.** A submitted Git commit, pull request, closed issue, release version, or deployment is producer-reported unless independently verified against the existing provenance rules. Never present an uploaded claim as server-verified delivery provenance solely because a producer was authenticated.

15. **Immutable project-organized storage.** Store accepted reports outside source checkouts beneath the existing durable report root, grouped by the authorized canonical project and UTC year and month. Derive safe report names and filesystem paths on the server; never trust client-supplied filenames or target locations.

16. **Atomic creation and durability.** Create reports using exclusive, race-safe writes and restrictive permissions. Return successful creation only when the report and its project metadata have been durably accepted and are discoverable by the existing viewer. Do not leave partial HTML visible after failed requests.

17. **Idempotent retries.** Scope a submitted immutable run identifier to the authenticated producer and authorized project. An identical normalized retry returns the previously accepted report without rewriting it; reusing the identifier with a different normalized payload returns a conflict and preserves the original report.

18. **Stable machine-readable responses.** Return `201 Created` and a verified canonical hosted report location for a new durable report; return `200 OK` with the same location for an identical retry. Return `400` for malformed JSON, `401` for missing or invalid producer authentication, `403` for a producer not granted publication, `404` for unavailable routes without leaking private projects, `405` for unsupported methods, `409` for conflicting run identity, `413` for bounded-size violations, `415` for unsupported content type, `422` for invalid readout semantics, `429` for rate limits, and `503` for an unavailable durable writer. Error bodies must not include credentials, report content, full local paths, or unauthorized project names.

19. **Producer and request limits.** Apply explicit maximum request bytes, field sizes, collection lengths, nesting depth, request duration, concurrency, and per-producer rate limits. Reject unsupported transfer encodings, compressed request bodies, remote fetch instructions, binary data, archives, and unexpectedly large requests before expensive rendering or storage.

20. **Safe operational auditing.** Record only the time, non-secret producer identity, safe request identity, outcome category, response status, and explicitly authorized canonical project where appropriate. Redact authorization headers and never store complete submitted findings, raw request bodies, employee or customer information, tokens, shell output, or conversation history in logs.

21. **One portable publishing adapter.** Add a harness-independent HTTPS publisher that constructs, validates, and submits the versioned envelope. Keep the interface invocable from any supported harness and any approved skill collection. Avoid requiring an SDK, browser extension, device VPN, interactive login, or shared repository checkout.

22. **Explicit client configuration.** Configure ingestion endpoint, producer credential, project publication opt-in, bounded retry policy, and connection timeout through normal harness configuration or task-relevant environment variables. Never automatically discover a personal ingestion endpoint or publish a project merely because a compatible credential exists.

23. **Local-first fallback.** Generate and preserve the local report before optional remote publication. When ingestion is disabled, declined by policy, offline, unauthorized, or unavailable, report the actual local artifact and explain that hosted publication did not occur. Do not fail the underlying skill run or invent a hosted report link.

24. **Canonical hosted link verification.** Return only a link derived from the configured trusted hosted origin and server-created project-relative report identity. Do not trust a client-supplied report URL, `Host` header, forwarded host, open redirect, or alternate public hostname. Distinguish durable acceptance from whether an unauthenticated browser may retrieve the document.

25. **Preserve report isolation.** A successfully ingested report must be visible only when its project is explicitly allowed by hosted publication policy. Existing library, explorer, activity, search, and direct-report isolation must remain effective for both native and external reports.

26. **Hardened stack deployment.** Keep producer ingress on the existing private proxy network, with no public host port, no `0.0.0.0` development listener, dropped unnecessary Linux capabilities, no-new-privileges, narrowly selected write access, and explicit health behavior. Preserve TLS termination, viewer authentication, existing readout links, and remote container health.

27. **Retention and revocation.** Retain existing explicit, project-scoped report retention. Producer revocation prevents subsequent submissions without retroactively rewriting or deleting accepted immutable reports. Any deletion, migration, backfill, or cross-project publication remains an explicitly authorized separate operation.

28. **Compatibility and source synchronization.** Preserve existing local, SSH-forwarded, and capability-protected LAN reporting; native CLI output; project-aware storage; previews; viewer health and directory identity; catalog and plugin invocation policy; and generated Codex helper synchronization. Existing users who configure no producer endpoint see no behavior change.

29. **No unauthorized deployment.** Writing and approving this specification does not create credentials, modify DNS, change reverse-proxy routes, expose a new public endpoint, restart the report container, enable GitHub Issues, create labels, publish employer information, or authorize publication of an additional project. Those changes require their own applicable approval.

## Testing Decisions

1. **Test user-visible behavior at the ingestion seam.** Start the real ingestion adapter and existing report viewer with temporary report storage; submit an actual HTTPS-equivalent HTTP JSON request, inspect its response, and retrieve the resulting actual immutable report through the hosted project library.

2. **Use two real harness adapters.** Demonstrate one authorized native QuickStark skill run and one independently named non-QuickStark skill run. Both must appear in the same authorized project without weakening native skill-catalog validation.

3. **Cover machine independence without mocking filesystems.** Submit reports representing separate producer identities and safe alternate checkout origins. Assert canonical project grouping and actual producer metadata rather than internal adapter calls or fake mount assumptions.

4. **Test missing, malformed, invalid, revoked, and unrelated producer credentials.** Assert the externally observed authorization status, safe error body, absent durable report, and continued isolation of the existing project library.

5. **Test producer-project authorization independently of hosted publication policy.** Cover a producer lacking a project grant, a granted project excluded from hosted publication, and a separately authorized project. Confirm an unapproved project never appears in the library, explorer, search, timeline, direct report routes, or safe error responses.

6. **Test browser and producer authentication separately.** Verify anonymous browser requests still redirect to or are rejected by the configured identity gate. Verify bearer-authenticated producer submissions do not require an interactive browser login and that browser cookies alone cannot publish a report.

7. **Test route and method isolation.** Confirm only the exact versioned ingestion route accepts `POST`; gallery, report, health, unrelated paths, `PUT`, `PATCH`, and `DELETE` remain rejected. Confirm no permissive browser cross-origin policy or cookie-based publication is introduced.

8. **Test structured-envelope validation.** Cover missing and unsupported contract versions, malformed JSON, unexpected content types, absent outcomes, invalid statuses, unsafe skill identifiers, ambiguous producer identities, incorrect timestamps, invalid run identifiers, and excessive field or collection sizes.

9. **Test canonical project normalization.** Verify safe equivalent SSH and HTTPS origins map to one project. Reject token-bearing origins, unsafe project segments, absolute paths, traversal, forged project keys, unknown local identities, and client-controlled target paths.

10. **Test native and external report rendering independently.** Assert registered QuickStark reports retain their real purpose-specific profile, while external reports honestly display their actual harness, collection, skill, results, and provenance without fabricated catalog membership.

11. **Test executable-content rejection and escaping.** Submit script fragments, event handlers, unsafe links, HTML, markdown payloads, archive or attachment markers, remote fetch instructions, and hostile field content. Assert safe text rendering, restrictive headers, and absence of executable external content.

12. **Test actual-skill-run honesty.** Reject catalog previews and fabricated checks, used skills, recommendations, relationships, or unsupported delivery provenance. Verify an unverified producer claim is never displayed as independently verified release evidence.

13. **Test immutable success.** Assert a new report returns `201`, resides inside the approved durable project directory, is readable from its canonical hosted location, appears in project discovery, and cannot replace an earlier report.

14. **Test idempotency and race behavior.** Submit identical retries, simultaneous identical submissions, and the same run identifier with changed content. Assert a single immutable report, `200` for safe retry, and `409` for a conflicting payload.

15. **Test partial-write and storage failures.** Simulate an unavailable writer, unwritable report storage, interrupted creation, and viewer discovery failure. Assert no successful hosted claim, no visible partial report, no overwritten existing readout, and a safe failure response.

16. **Test request limits.** Cover excessive byte counts, item counts, field lengths, nesting, concurrency, rate, and request duration using bounded fixtures. Assert a deterministic rejection without persistent report creation or leakage of another project's information.

17. **Test existing gallery behavior as a regression seam.** Reuse prior behavior tests covering project isolation, search, direct reports, recent-activity ordering, preview honesty, existing immutable metadata, safe traversal rejection, and strict viewer response headers.

18. **Test portable publisher behavior.** Assert correctly configured HTTPS submission, authentication header handling, safe bounded retry, conflict handling, endpoint failure, timeout, explicit publication disablement, and accurate distinction between local-only and hosted outcomes.

19. **Test deployed-manifest security behavior.** Verify browser-viewer report storage remains read-only, writable access is confined to the ingestion adapter, the private proxy exposes no host port, browser middleware is preserved, the exact producer route is intentionally configured, and producer grants fail closed.

20. **Test privacy and log redaction.** Verify credentials, request bodies, full local checkout paths, tokens, unauthorized repository identities, report findings, shell output, and conversation contents are absent from logs, redirects, errors, report metadata, and generated URLs.

21. **Run existing repository consistency checks.** After implementation, synchronize the generated Codex helper and run the full repository test suite. Assert native skill restrictions, promoted-only packaging, synchronized versions, upstream attribution, and invocation policies remain unchanged.

22. **Perform authorized end-to-end deployment checks separately.** Only after explicit deployment and credential authorization, verify public HTTPS routing, producer authentication, durable ingestion, authenticated report retrieval, read-only viewer isolation, revocation, safe anonymous behavior, and the same approved report from an actual separately running laptop.

23. **Avoid implementation-detail tests.** Do not couple acceptance to a private helper name, CSS class, HTML layout, Docker container name, filesystem iteration order, internal mock call count, or a particular harness executable. Validate documented input, returned result, immutable storage, observable security behavior, and the authenticated report seen by the user.

## Out of Scope

- Anonymous, unauthenticated, arbitrary public report submission.
- Automatically authorizing every producer, every harness, every repository, or every skill collection.
- Sending employer-confidential, customer-confidential, or regulated project information to personal infrastructure without explicit applicable authorization.
- Treating Codex conversation history, full source repositories, `.env` files, credentials, shell transcripts, screenshots, binary attachments, arbitrary HTML, or user-selected filesystem paths as report payloads.
- Weakening, bypassing, or replacing existing browser authentication, project publication allowlists, content-security headers, immutable-report protections, or the read-only hosted viewer.
- Requiring a shared network drive, inbound workstation access, a VPN, Tailscale, Cloudflare client software, browser automation, or an always-on SSH tunnel.
- Introducing a separate public domain, general-purpose file hosting, user account-management platform, relational database, external queue, telemetry product, or second production report gallery.
- Promoting unknown external skills into the QuickStark catalog or changing existing QuickStark skill invocation rules.
- Re-rendering, modifying, or migrating historical reports automatically.
- Publishing report history to GitHub Pages, Cloudflare Pages, object storage, or another external mirror.
- Automatically enabling GitHub Issues, creating a project issue tracker, creating `ready-for-agent`, publishing a GitHub issue, creating implementation tickets, or changing repository settings without the required authorization.
- Creating or distributing live producer credentials, modifying existing Traefik or Authelia configuration, deploying containers, restarting production, or adding a public ingestion route as part of writing this specification.

## Further Notes

- The existing hosted readout library is deployed and its report container was previously observed as healthy; the report hostname redirects anonymous requests to its existing identity provider. This proves a real protected viewing surface, not a working ingestion interface.
- The current hosted viewer intentionally rejects `POST` with `405 Method Not Allowed`. Existing behavior tests explicitly preserve its `GET, HEAD` contract. The feature must introduce a deliberate producer route rather than silently reversing that security guarantee.
- Native QuickStark readout normalization intentionally rejects skills absent from its promoted catalog. Supporting arbitrary authorized external skills therefore requires an explicit external-readout contract and rendering adapter, not disabling a valuable native validation rule.
- After explicit user approval, GitHub Issues were enabled for `quickstark/skills`, the `ready-for-agent` label was created, and this specification was published as the real labeled parent issue [#1](https://github.com/quickstark/skills/issues/1).
- The approved implementation slices were published as real issues [#2](https://github.com/quickstark/skills/issues/2) through [#10](https://github.com/quickstark/skills/issues/10), with verified native GitHub blocking relationships.
- The recommended implementation sequence is: versioned readout and producer grants; validated durable ingestion and immutable retry; native and external renderer integration; portable optional publisher; authenticated proxy deployment and actual cross-machine acceptance checks.
