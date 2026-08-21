# Draft ticket plan: private, project-aware QuickStark readouts

> Historical record — superseded by the direct-chat completion contract in [`docs/skill-run-contract.md`](../skill-run-contract.md). No active command, package, deployment, or service implements this design.

Status: historical draft; these gallery implementation slices have not been independently verified as published issues. GitHub Issues and the `ready-for-agent` label are now enabled.

Parent: the approved specification for private, project-aware QuickStark skill readouts.

Testing seam: each completed slice must be demonstrable through the existing production readout renderer, verified HTTP viewer, and generated plugin contract. Tests should observe actual rendered reports, real HTTP responses, public navigation behavior, persisted output, security boundaries, and honest status rather than prototype internals.

## 01 — Generate verified project-aware skill readouts

**Blocked by:** None — can start immediately.

**What it delivers:** A skill run automatically identifies its real Git project and produces a self-contained readout carrying a canonical, machine-readable project identity; the existing viewer can still open that report normally.

**Acceptance criteria:**

- [ ] Equivalent HTTPS and SSH remotes identify the same canonical repository without disclosing credentials or absolute machine paths.
- [ ] Alternate mounts and symlinked workspace paths do not split one Git project into multiple project identities.
- [ ] Repositories without a remote and non-Git workspaces receive clearly labeled, safe, collision-resistant fallback identities.
- [ ] New reports include validated canonical project identity, skill, actual status, timestamp, immutable run identity, and format version.
- [ ] The existing report URL, report content, preview honesty, viewer health contract, and source-synchronized Codex helper remain functional.
- [ ] Behavior tests render and fetch an actual project-aware readout through the production viewer.

## 02 — Persist and reopen project-organized report history

**Blocked by:** 01 — Generate verified project-aware skill readouts.

**What it delivers:** A user can opt into durable project-organized report storage, restart the report viewer, and reopen both new and earlier direct report links without losing temporary-storage compatibility.

**Acceptance criteria:**

- [ ] A configured persistent report root stores immutable reports under safe, canonical project-specific nesting.
- [ ] Repeated runs of the same skill never overwrite previous reports or reuse an existing immutable link.
- [ ] The production viewer securely discovers and serves recognized nested readouts without exposing arbitrary files.
- [ ] Temporary report storage remains the unchanged default when persistent storage has not been explicitly configured.
- [ ] Viewer readiness, health, report-library identity, and wrong-directory rejection remain truthful for both temporary and durable roots.
- [ ] Behavior tests restart a real viewer and retrieve multiple immutable reports from the persistent fixture library.

## 03 — Browse the project-first report library

**Blocked by:** 02 — Persist and reopen project-organized report history.

**What it delivers:** Opening the existing report gallery shows the approved project-first landing page, highlights the active project, and makes actual recent reports across multiple projects directly discoverable.

**Acceptance criteria:**

- [ ] The default gallery displays one card per verified project and orders projects by their most recent actual skill run.
- [ ] The active project is identified from its canonical Git identity and visibly distinguished from other projects.
- [ ] Each project card displays truthful actual-report counts, verification status, recent skill runs, and working immutable report links.
- [ ] Skill previews are excluded from project counts and recent activity unless the user explicitly opts in.
- [ ] Empty report libraries and preview-only libraries display honest, usable empty states.
- [ ] Behavior tests fetch the real production gallery using reports from more than one project and verify user-visible grouping and links.

## 04 — Explore and search a selected project

**Blocked by:** 03 — Browse the project-first report library.

**What it delivers:** Selecting a project opens the approved split-pane experience, keeps the project list visible, and lets a user search and open all actual reports belonging to that project.

**Acceptance criteria:**

- [ ] A project can be selected from the project-first landing page using stable, validated navigation state.
- [ ] A persistent project sidebar identifies the selected project and keeps other authorized projects available.
- [ ] The selected-project pane lists only that project's actual reports in newest-first order.
- [ ] Project name, skill name, human-readable title, and report outcome can be searched without leaking unauthorized projects.
- [ ] Report rows show truthful status, timestamp, outcome, and a working immutable direct link.
- [ ] Filtering and empty results remain understandable and shareable through safe URL state.
- [ ] Behavior tests request actual project and search routes and verify isolation between different projects.

## 05 — Review cross-project recent activity

**Blocked by:** 03 — Browse the project-first report library.

**What it delivers:** A secondary navigation view displays the approved recent-activity timeline across all authorized projects without replacing the project-first library.

**Acceptance criteria:**

- [ ] The project library and activity timeline are normal production navigation destinations, not prototype-only variants.
- [ ] Actual skill runs are grouped by their true creation date and sorted newest first across projects.
- [ ] Every timeline entry displays its verified project, readable skill, actual status, timestamp, and working immutable report link.
- [ ] Previews do not appear until an explicit, clearly labeled preview option is selected.
- [ ] Empty and filtered timelines clearly distinguish missing reports from intentionally excluded previews.
- [ ] Behavior tests fetch the timeline through the real viewer and verify cross-project chronology and direct links.

## 06 — Preserve and explicitly migrate legacy reports

**Blocked by:** 03 — Browse the project-first report library.

**What it delivers:** Existing flat readouts remain readable and discoverable, while older reports can be deliberately associated with a canonical project without guessing, overwriting history, or claiming unverified ownership.

**Acceptance criteria:**

- [ ] Previously generated flat readouts remain accessible through the production viewer and their existing report links.
- [ ] Reports without canonical machine-readable project metadata appear in an explicitly identified legacy or unassigned section.
- [ ] Free-text project headings are never described as verified Git repository identities.
- [ ] Migration requires an explicit target project and offers a reviewable non-mutating preview before any change.
- [ ] Repeating an approved migration is safe, idempotent, and preserves original report content and immutable history.
- [ ] Behavior tests cover mixed old and new libraries, ambiguous legacy headings, dry-run behavior, direct links, and repeat migration.

## 07 — Enforce project publication and retention policy

**Blocked by:** 03 — Browse the project-first report library.

**What it delivers:** Only projects explicitly approved for hosted publication appear in an externally served library, and report retention can be understood and managed without accidentally exposing personal, employer, or customer material.

**Acceptance criteria:**

- [ ] Projects are not eligible for externally hosted publication unless explicitly approved.
- [ ] Personal and work projects can be isolated, and unapproved projects never appear in hosted project lists, search, timeline results, or direct reports.
- [ ] Project policy cannot leak sensitive project names through error pages, redirects, metadata, or referrer headers.
- [ ] Retention and deliberate deletion behavior are documented and verifiable without destroying unrelated report history.
- [ ] Confidential files, source checkouts, raw logs, credentials, and environment data are never included in the report library.
- [ ] Behavior tests demonstrate that one approved project is visible while another remains inaccessible across all production views.

## 08 — Publish an authenticated browser-accessible report service

**Blocked by:** 04 — Explore and search a selected project; 05 — Review cross-project recent activity; 06 — Preserve and explicitly migrate legacy reports; 07 — Enforce project publication and retention policy.

**What it delivers:** After explicit deployment authorization, an approved user can open the complete combined A/B/C report library from a personal or managed laptop through a verified authenticated HTTPS hostname without Tailscale or a client installation.

**Acceptance criteria:**

- [ ] The existing reverse proxy serves only the verified, persistent report viewer on an explicitly authorized dedicated HTTPS hostname.
- [ ] Cloudflare Access with an explicit approved-identity policy, or correctly attached existing Authelia, blocks anonymous access before any project or report content is disclosed.
- [ ] Authenticated users can reach the project library, selected-project explorer, activity timeline, and immutable direct reports in an ordinary browser.
- [ ] The service remains limited to its approved report library and refuses arbitrary repository files, traversal, unsupported methods, and incorrect library identities.
- [ ] No laptop requires Tailscale, a private-network client, custom VPN software, browser extensions, or a permanent SSH tunnel.
- [ ] An outbound-only tunnel is introduced only when existing safe reverse-proxy routing cannot make the approved origin reachable.
- [ ] DNS, TLS, identity enforcement, actual report retrieval, and external reachability are verified before any hosted link is presented as working.
- [ ] Temporary, loopback, SSH-forwarded, and capability-protected home-network workflows remain functional.
- [ ] The full repository test suite and generated Codex-plugin synchronization checks pass after production implementation.

## Dependency frontier

- Start with **01**.
- Once 01 is complete, start **02**.
- Once 02 is complete, start **03**.
- Once 03 is complete, **04, 05, 06, and 07** can proceed independently.
- Start **08** only after 04, 05, 06, and 07 have completed and external deployment has been explicitly authorized; completion of 02 and 03 is already guaranteed by those tickets' dependency chains.

## Publication and approval

This remains a **historical draft plan for review**, not an issue tracker. The separately published cross-harness and Workbench issues do not establish that these particular gallery slices were published or linked. Do not invent issue numbers, native dependency links, tracker settings, or approval.

The verified personal GitHub repository now has GitHub Issues enabled and contains the existing `ready-for-agent` label. If the user explicitly approves this exact gallery breakdown, first check whether matching tickets already exist. Create only the approved missing tickets, apply the verified triage label, and use real native blocking relationships when supported; do not change repository settings or imply publication without direct verification.
