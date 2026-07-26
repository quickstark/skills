# Specification: private, project-aware QuickStark skill readouts

Status: implementation-ready historical specification; GitHub Issues and the `ready-for-agent` label are now enabled, but publication of this particular specification has not been independently verified.

Owner: QuickStark Skills.

Prototype decision: combine the approved project-first library, split-pane project explorer, and cross-project activity timeline into a single production report gallery.

## Problem Statement

A QuickStark skill produces a valuable, self-contained HTML readout, but a readout created on a remote development machine is not automatically available on the laptop where the user is reading Codex. A temporary report path disappears, a remote loopback URL points at the wrong machine, and a home-network URL stops working when the reader leaves the home network. A managed work laptop may not permit Tailscale, a personal VPN, or another installed network client.

The existing gallery also intermixes actual completed work with skill previews, does not durably organize reports by project, and cannot safely infer a canonical Git project from older human-written report headings. The user needs a trusted way to find the active project, browse its previous skill outputs, and discover recent work across projects without publicly exposing reports or transferring confidential work to an unapproved personal service.

## Solution

Provide one private QuickStark readout library with three complementary views:

1. **Project library:** the default landing page groups actual reports by verified project, highlights the current project, and shows recent activity for each project.
2. **Project explorer:** selecting a project opens a persistent project sidebar and a complete, searchable report list for that project.
3. **Activity timeline:** a secondary recent-activity view shows real skill runs across authorized projects in reverse chronological order.

Automatically identify the active project using a sanitized Git origin, write durable project metadata into every newly created report, and store immutable reports beneath a configurable persistent report root. Keep old reports discoverable without fabricating project ownership. Preserve the current self-contained HTML renderer, verified viewer, health endpoint, source-synchronized plugin, strict security headers, preview semantics, local-only access, SSH-forwarding mode, and capability-protected home-network mode.

When deliberately deployed, publish the same report-only viewer through the existing HTTPS reverse proxy at a dedicated authenticated hostname. Require browser-based Cloudflare Access or correctly enforced Authelia before any project list or readout is disclosed. Personal and managed laptops must require only an authorized web browser. A public hostname does not imply publicly readable report content.

## User Stories

1. As a QuickStark user, I want a project-first report library, so that I can immediately identify the workspaces that have actual skill outputs.
2. As a remote development-box user, I want to open a report from my laptop browser, so that the HTML does not remain trapped on the remote filesystem.
3. As a managed-laptop user, I want browser-based access, so that I do not need to install Tailscale, a VPN, or a personal networking client.
4. As a home-network user, I want the existing capability-protected viewer to keep working, so that current workflows do not regress.
5. As an SSH user, I want explicit loopback and forwarding modes to remain available, so that I can avoid exposing a listener on my home network.
6. As a user working in several repositories, I want reports grouped by canonical Git project, so that unrelated projects do not mix together.
7. As a user opening a workspace through a symlink or alternate mount, I want project identity to come from Git origin, so that the same repository is not split into duplicate projects.
8. As a user with SSH and HTTPS Git remotes, I want equivalent sanitized remotes to identify the same project, so that my report history remains consistent across clone methods.
9. As a user in a repository without a remote, I want a clearly labeled collision-resistant local-project fallback, so that reports are still organized without leaking machine paths.
10. As a user outside a Git repository, I want a clearly labeled collision-resistant workspace fallback, so that a non-Git project remains usable.
11. As a security-conscious user, I want credential-bearing and unsafe remotes rejected, so that tokens, usernames, and arbitrary paths never enter a report or URL.
12. As a skill user, I want the current project highlighted, so that I can tell whether I am reading the project where the active skill ran.
13. As a returning user, I want each project card to show its latest actual reports, so that I can resume work without searching the entire library.
14. As a returning user, I want project cards ordered by their most recent activity, so that active work appears first.
15. As a user drilling into a project, I want a persistent project sidebar, so that I can switch repositories without losing my orientation.
16. As a project owner, I want a complete report list for the selected project, so that I can inspect its previous decisions, research, implementation, and reviews.
17. As a user monitoring several projects, I want a cross-project activity timeline, so that I can find the newest completed skill runs.
18. As a user revisiting an activity item, I want to see which project produced it, so that a familiar skill name is not detached from its context.
19. As a user looking for prior work, I want to search project names, skill names, and report outcomes, so that I can locate a report without knowing its filename.
20. As a user sharing a specific view between browsers, I want view selection, search, and project selection expressed as safe URL state, so that the selected gallery state can be restored.
21. As a user browsing many reports, I want readable skill names, report statuses, and timestamps, so that I can distinguish meaningful work at a glance.
22. As a user opening a specific run, I want an immutable direct report link, so that later runs never silently overwrite an earlier decision.
23. As a user generating skill previews, I want previews hidden from actual-work views by default, so that samples are not misrepresented as completed reports.
24. As a user evaluating the skill catalog, I want an explicit option to include clearly labeled previews, so that previews remain accessible without polluting work history.
25. As a user with older reports, I want existing reports to remain readable, so that a project-aware upgrade does not discard useful history.
26. As a user with legacy report headings, I want uncertain project assignments labeled honestly, so that descriptive headings are never presented as verified Git identities.
27. As an administrator, I want an explicit, reviewable migration for older reports, so that assigning history to a project is intentional and reversible.
28. As a user concerned about retention, I want an opt-in persistent report directory, so that useful reports survive temporary-directory cleanup and service restarts.
29. As an existing QuickStark user, I want temporary storage to remain the default until persistent hosting is configured, so that installation does not unexpectedly change local behavior.
30. As an operator, I want the report library mounted separately from source checkouts, so that serving reports never exposes a Git repository.
31. As an operator, I want one report-only service behind the existing HTTPS reverse proxy, so that I do not need to maintain a duplicate public web stack.
32. As a personal-laptop user, I want the authenticated report hostname reachable away from home, so that travel does not prevent me from reading my reports.
33. As a managed-laptop user, I want an approved identity or email allowlist, so that access is possible without weakening the report library's security.
34. As a security-conscious user, I want authentication enforced before the dashboard, report links, search results, and sensitive service metadata are disclosed, so that anonymous visitors learn nothing about my projects.
35. As a security-conscious user, I want a guessed or missing capability token to return no report, so that local and home-network access retains its existing protections.
36. As a security-conscious user, I want path traversal, symbolic-link escapes, unexpected filenames, and unsupported HTTP methods rejected, so that the report viewer cannot read unrelated files.
37. As a user of self-contained reports, I want individual readouts to retain strict browser security headers and no executable or external dependencies, so that reports remain safe and portable.
38. As a user operating more than one report library, I want the renderer to verify the viewer's health and directory identity, so that a report URL cannot accidentally point at the wrong service.
39. As a user with a busy dev box, I want occupied default ports handled predictably, so that creating a report does not conflict with existing services.
40. As an operator, I want startup, readiness, and report links verified before they are displayed, so that the application does not claim an unreachable URL works.
41. As an operator, I want the canonical and installed Codex skill helpers synchronized, so that installed skills generate reports using the same production behavior as the repository.
42. As a Claude Code user, I want existing skill invocation policy and plugin behavior preserved, so that report improvements do not change which skills are promoted or how they are invoked.
43. As a user working with confidential material, I want publication to personal infrastructure to be explicitly controlled per project, so that employer or customer data is never exported without authorization.
44. As an administrator, I want work and personal projects isolated or excluded from personal publication, so that an accessible browser does not bypass data-handling policies.
45. As an administrator, I want retention and deletion expectations documented, so that persisted HTML does not become an unbounded archive of sensitive work.
46. As an operator behind a restrictive home firewall, I want an optional outbound-only tunnel, so that the report service can be exposed without requiring an inbound home-network port.
47. As an operator whose current HTTPS routing already works, I want the tunnel to be optional, so that the simplest existing deployment is not burdened by unnecessary infrastructure.
48. As a user needing access while the dev box is powered off, I want a separately evaluated authenticated static mirror, so that off-site availability can be added without weakening the default deployment.
49. As a user of the activity timeline, I want reports grouped by time and sorted newest first, so that I can reconstruct what work happened and when.
50. As a user with no reports, I want accurate empty and filtered-empty states, so that the application explains whether reports are missing or merely excluded.
51. As a keyboard user, I want accessible navigation, labels, links, and focus behavior, so that every production view is usable without a pointer.
52. As a mobile or small-screen user, I want responsive project cards, report lists, and navigation, so that reports can be read on smaller displays.
53. As an operator, I want production behavior tested through the actual renderer and HTTP viewer, so that passing tests demonstrate the user-visible workflow rather than internal layout details.
54. As a future implementer, I want the throwaway prototype kept separate from production, so that temporary variant-switching code is not mistaken for the maintained report library.

## Implementation Decisions

1. **One production gallery, three coordinated views.** Combine the approved prototypes instead of shipping mutually exclusive alternatives. Make the project library the default landing page, use the split-pane project explorer for a selected project, and provide the recent-activity timeline as a normal secondary navigation destination. Remove throwaway-only variant labels and floating prototype controls from production.

2. **One authoritative readout boundary.** Extend the existing canonical readout-renderer and HTTP-viewer boundary rather than introducing an independent renderer, unrelated web application, second skill catalog, or separate static-file contract. Preserve the current command surface, report normalization, rendering, server startup, viewer reuse, health verification, and generated plugin synchronization.

3. **Canonical project identity.** Determine a project's stable identity from an explicitly supplied identity when present; otherwise use its sanitized Git origin, its canonical Git-root fallback, or a collision-resistant non-Git workspace fallback. Normalize equivalent SSH and HTTPS remote forms. Persist the repository host, canonical owner and repository, display label, identity source, and a safe URL or storage key. Never serialize credentials, raw host paths, shell environment, or an unsafe remote.

4. **Machine-readable report metadata.** Include the canonical project identity, skill identifier, skill display name, actual status, UTC creation timestamp, immutable report identifier, and report format version in newly generated readouts. Keep metadata readable without executing report HTML. Retain the existing distinction between actual skill usage, next-skill recommendations, and catalog previews.

5. **Durable, opt-in report library.** Support a configurable persistent library root outside every working checkout, organized by canonical project and time. Preserve temporary storage as the compatibility default. Do not create or expose a persistent location until it has been intentionally configured.

6. **Safe nested discovery.** Enumerate only recognized report documents beneath the configured report root. Reject symbolic links, traversal, unrecognized files, excessive nesting, and files outside the authorized report library. Sort discovered reports deterministically by actual generation time.

7. **Legacy compatibility and migration.** Display existing flat reports without rewriting them. Show verified canonical assignments only where the metadata establishes ownership; display legacy heading-derived labels and unassigned history as such. Provide an explicit, idempotent, reviewable migration before assigning legacy reports to canonical projects. Never infer that two descriptions or similar titles refer to the same repository.

8. **Project-first landing page.** Render one project card per authorized canonical project, ordered by latest actual activity. Display the project label, verification source, actual report count, recent actual reports, and an unmistakable current-project indicator. Provide a safe empty state and clear access to the explorer and activity timeline.

9. **Persistent split-pane project explorer.** Render a project sidebar and a selected-project report list on one route. Keep the selected project and current query in validated, shareable URL state. Report rows show human-readable skill, actual status, timestamp, outcome summary, and immutable report link. The active project remains visible when it appears in the authorized library.

10. **Cross-project activity timeline.** Render only authorized actual reports by default, grouped by date and ordered newest first. Show project identity on every activity entry. Link each entry to the same immutable report used by the library and explorer. Treat the timeline as a navigation destination rather than the primary organization of the report library.

11. **Preview policy.** Hide catalog previews from all actual-work views, counts, latest-activity ordering, and project-card summaries by default. Permit explicit preview inclusion using validated URL state and visibly mark every preview. Previews must never claim that a skill ran or that an issue, output, check, or deployment exists.

12. **Search and navigation state.** Support case-insensitive search of authorized project labels, canonical skill names, readable skill names, and report outcomes. Preserve safe search and navigation state across project and view changes. Avoid exposing sensitive project names in unauthenticated responses, redirects, browser-referrer headers, or external scripts.

13. **Private browser-first hosted access.** When intentionally deployed, publish only the verified report-viewer service through the existing dedicated HTTPS reverse proxy and a dedicated report hostname. Enforce exactly one clearly documented authentication boundary using a browser-based Cloudflare Access application with an explicit approved-identity policy, or properly attached existing Authelia middleware. Test unauthenticated denial before presenting the hostname as usable.

14. **No personal client requirement.** Hosted report viewing must work through normal browser HTTPS and approved identity authentication. Do not require Tailscale, a private-network Cloudflare client, a browser extension, an active SSH tunnel, or arbitrary custom software on a managed laptop.

15. **Preserve local privacy modes.** Keep local loopback, explicit SSH forwarding, and capability-protected single-interface home-network modes. Never bind the development viewer to every network interface or assume that a private network address is reachable from the public internet.

16. **Verified viewer compatibility.** Preserve the viewer health response, service identifier, version, and configured report-root identity. Verify the published base URL against the actual expected report root before returning a hosted readout link. Fail clearly when a configured viewer is unavailable, unauthenticated, misconfigured, or points at another library.

17. **Immutable HTML and response security.** Preserve unique report filenames, safe output escaping, report-only serving, private file permissions where supported, the existing non-executable self-contained report format, strict content-security headers, no-store behavior, referrer isolation, and allowed HTTP methods. Apply similarly restrictive defaults to gallery responses without depending on external assets.

18. **Port selection and readiness.** Reuse the existing available-port selection, temporary viewer-service lifecycle, readiness validation, and safe failure behavior. Do not present a hostname, report link, or prototype endpoint until its real service responds successfully.

19. **Deliberate publication boundaries.** Enable durable hosted publication only for explicitly permitted projects. Never publish employer-confidential work, customer data, credentials, raw execution logs, source checkouts, personal access tokens, or Codex conversation state to personal infrastructure without applicable authorization.

20. **Deployment separation.** Implement and verify local project-aware rendering before changing DNS, proxy routes, identity policies, or persistent infrastructure. Treat creation of a public DNS record, activation of external authentication, and exposure of the origin as separately authorized deployment operations.

21. **Optional outbound tunnel.** Add an outbound-only Cloudflare Tunnel only when existing externally reachable routing cannot safely reach the report origin. Pair it with a browser-accessible public-hostname application and enforced access policy; do not make a private-network client a requirement for the reader.

22. **Optional off-site availability.** Consider an authenticated static mirror only as a later enhancement for availability when the dev box is offline. Require explicit protection for production domains and direct deployment aliases, controlled publishing, cumulative report history, and approved data handling.

23. **Repository and plugin invariants.** Keep promoted skill definitions, invocation policies, upstream attribution, plugin versions, catalog recommendations, documentation contracts, generated Codex snapshots, and existing CLI behavior consistent. Regenerate the installed Codex helper from its canonical source when the canonical readout behavior changes.

24. **Accessibility and responsive behavior.** Support semantic headings, keyboard-accessible navigation, explicit form labels, visible focus, responsive single-column layouts, readable status indicators, and reduced-motion-friendly interactions. Do not rely on color alone to distinguish status or project selection.

25. **Operational clarity.** Document whether a returned URL is local-only, reachable on a private home network, or externally authenticated. Surface truthful persistence, project-verification, preview, and publication states. Do not imply the proposed report hostname exists until its DNS, TLS, access policy, and full external route have actually been verified.

## Testing Decisions

1. **Primary test seam: render through the actual viewer.** Prefer the existing public renderer and HTTP-viewer interface as the single highest-value behavior seam. Create real temporary report libraries, render actual promoted skills, start the existing viewer on an ephemeral trusted-interface port, and verify the resulting HTML, navigation, direct report URLs, response headers, health contract, and authorization behavior using ordinary HTTP requests.

2. **Observe behavior, not implementation details.** Assert what a user, caller, or HTTP client can see: project grouping, stable metadata, report order, preview visibility, selected-project results, timeline contents, reachable direct links, safe errors, and unchanged CLI output. Do not couple tests to CSS class names, private helper calls, internal iteration order, component structure, or prototype-only controls.

3. **Project-identity fixtures.** Verify equivalent SSH and HTTPS origins normalize to the same canonical repository. Cover alternate checkout paths, explicit identities, missing origins, local Git roots, non-Git workspaces, collisions, malicious paths, credential-bearing remotes, and absent machine-readable legacy project metadata.

4. **Project-library behavior.** Render reports for multiple canonical projects. Assert correct project grouping, latest-first project ordering, truthful actual-report counts, current-project highlighting, distinct direct links, filtered empty states, and exclusion of preview-only projects from actual-work summaries.

5. **Explorer behavior.** Select projects through public URL state. Verify project isolation, stable project selection, search behavior, safe query validation, deterministic latest-first report ordering, direct-report navigation, and keyboard-accessible native navigation where observable.

6. **Timeline behavior.** Verify cross-project entries are grouped by actual date, ordered newest first, labeled with their verified project, and linked to the correct immutable report. Confirm previews appear only after an explicit preview request.

7. **Legacy compatibility.** Verify existing flat reports remain readable. Assert reports without canonical metadata remain explicitly legacy or unassigned, that migration never overwrites a report, that dry runs do not mutate history, and that repeated explicit migration is idempotent.

8. **Storage behavior.** Verify temporary storage remains the default, persistent storage is opt-in, nested project libraries are recursively discoverable, immutable report names do not collide, and repeated skill runs preserve earlier report links.

9. **Viewer and health behavior.** Reuse the existing tests for service identity, report-directory hashing, viewer reuse, wrong-directory rejection, local loopback, home-network host selection, explicit SSH access, port conflicts, and real readiness checks. Add project-aware coverage at the same existing seam rather than replacing the tested viewer.

10. **Filesystem and HTTP security.** Verify missing or incorrect capabilities, unauthenticated root requests, traversal encodings, repository-file requests, symbolic-link escapes, invalid project slugs, unsafe report names, unsupported methods, hostile HTML input, unsafe artifact links, information-leaking errors, and stale directory identities are denied.

11. **Preview honesty.** Verify every preview is labeled as a preview, contains no fabricated completed work, claims no skill usage or checks, and is excluded from actual work counts until explicitly included.

12. **Hosted acceptance checks.** After separately authorized deployment, verify real DNS resolution, HTTPS, reverse-proxy routing, expected viewer health, anonymous denial, approved identity access, report retrieval, and project isolation from both laptop contexts. Do not replace real remote validation with a passing test from the origin machine.

13. **Source synchronization.** Run the complete existing repository test suite and generated-plugin consistency checks after changing canonical readout behavior. Regenerate the Codex snapshot from the canonical source and rerun the tests. Preserve existing checks for promoted-only packaging, synchronized plugin versions, original upstream attribution, and both plugin invocation modes.

14. **Prior art.** Extend the repository's existing behavior tests for self-contained skill rendering, honest preview galleries, unique report generation, viewer health, capability protection, route traversal, unsupported HTTP methods, background viewer reuse, safe host selection, occupied-port handling, and synchronized Codex plugin helpers.

## Out of Scope

- Automatically enabling GitHub Issues, creating repository labels, or choosing a new project issue tracker without explicit authorization.
- Presenting the proposed report hostname as deployed before DNS, TLS, authentication, and external access have actually been verified.
- Publishing report contents, repository names, source code, or work-confidential data to an unapproved personal service.
- Automatically exposing every workspace, every machine, or every historical report to the public internet.
- Binding the report service to every network interface or serving an entire repository, home directory, container filesystem, or arbitrary static directory.
- Requiring personal VPN software, Tailscale, a private Cloudflare client, or persistent SSH forwarding on a managed laptop.
- Replacing the canonical skill catalog, production HTML renderer, report health contract, or maintained viewer with the throwaway prototype.
- Adding a general-purpose web framework, database, telemetry product, account-management system, or separate second source of truth for report metadata.
- Building an authenticated static mirror or offline cloud-hosted report archive as part of the initial implementation.
- Silently assigning old free-text report headings to canonical repositories, overwriting old reports, or automatically migrating confidential project history.
- Changing Claude or Codex skill invocation policy, publishing a plugin release, pushing Git commits, or editing the original upstream repository.

## Further Notes

- The user explicitly approved integrating aspects of all three prototype layouts. This approval settles the product direction: project-first library, persistent project explorer, and optional recent-activity timeline are complementary views of the same report library.
- The preferred test seam is the existing canonical readout-renderer and HTTP-viewer contract. It is already covered by behavior-based repository tests and should remain the authoritative integration boundary.
- The prototype proves that current legacy report headings describe projects but do not establish canonical repository identity. New reports must record canonical machine-readable project metadata before production grouping can be treated as authoritative.
- When this gallery specification was originally drafted, no project issue tracker or `ready-for-agent` triage label had been authorized. GitHub Issues and that label have since been independently verified for `quickstark/skills`. Their existence does not establish that this particular gallery specification was published or labeled.
- Publishing this exact specification, creating implementation tickets, or changing issue-tracker configuration still requires explicit user approval. Verify the actual tracker, issue identity, and triage label before claiming publication or creating new issues.
