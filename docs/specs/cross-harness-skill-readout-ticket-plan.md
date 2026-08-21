# Ticket plan: authenticated cross-harness skill readout ingestion

> Historical record — superseded by the direct-chat completion contract in [`docs/skill-run-contract.md`](../skill-run-contract.md). No active command, package, deployment, or service implements this design.

Status: implementation plan for the authenticated cross-harness reporting delivered in QuickStark 2.4.0. The linked GitHub issues and dependency graph are historical planning references; inspect the actual tracker before claiming an issue is currently open, closed, released, or ready for an agent.

Implementation evidence: `scripts/qs-skill-readout.mjs`, `deploy/readouts/compose.yaml`, and the cross-harness ingestion, publication, immutable-retry, producer-authorization, safe-rendering, and live credential-rotation behavior tests in `tests/qs-skills.test.mjs`.

The original acceptance checkboxes below remain planning criteria, not an assertion that every GitHub issue was updated. A real separately located laptop, authorized cross-harness delivery, or browser-authenticated retrieval must be directly verified before declaring that operational acceptance complete.

See [`../readout-operations.md`](../readout-operations.md) for the current deployment, producer configuration, verification, and troubleshooting runbook.

Parent: GitHub issue [#1 — authenticated cross-harness skill readout ingestion](https://github.com/quickstark/skills/issues/1).

Primary test seam: an explicitly authorized harness submits one versioned skill-readout envelope, and the existing hosted project library exposes exactly the resulting immutable, approved-project report.

## 01 — Submit and view one authenticated native skill readout

**GitHub issue:** [#2](https://github.com/quickstark/skills/issues/2).

**Blocked by:** None — can start immediately.

**What it delivers:** An explicitly authorized producer submits one registered QuickStark skill readout to the dedicated versioned ingestion route, receives a truthful creation response, and opens the actual immutable report in the existing project library. The gallery remains read-only.

**Acceptance criteria:**

- [ ] An actual `POST` to the exact versioned ingestion route accepts one bounded JSON envelope for a registered QuickStark skill and an explicitly approved canonical project.
- [ ] A valid producer bearer credential is required; missing or invalid credentials fail without creating a report.
- [ ] A missing producer or project grant fails closed without disclosing private project information.
- [ ] An accepted request produces one real, server-rendered, immutable report under the authorized persistent project identity.
- [ ] The creation response is `201 Created` and contains the actual canonical direct-report location.
- [ ] The existing project library can retrieve the new report using its normal report-serving interface.
- [ ] Existing gallery, direct-report, and health routes still refuse unsupported write methods.
- [ ] End-to-end behavior tests exercise a real request, persisted report, and gallery retrieval without assuming desktop or CLI internals.

## 02 — Make submitted skill runs immutable and safe to retry

**GitHub issue:** [#3](https://github.com/quickstark/skills/issues/3).

**Blocked by:** 01 — Submit and view one authenticated native skill readout.

**What it delivers:** A user can safely retry a failed or interrupted report submission without duplicating a skill run or overwriting an accepted report.

**Acceptance criteria:**

- [ ] A first accepted producer-project-run combination returns `201 Created` with its actual immutable report location.
- [ ] An identical retry returns `200 OK` and the same report location without modifying the original document.
- [ ] Reusing a run identity with a different normalized payload returns `409 Conflict` and preserves the first report unchanged.
- [ ] Concurrent identical submissions create exactly one immutable report.
- [ ] Interrupted writes and unavailable report storage do not create visible partial reports or return successful hosted links.
- [ ] Request behavior and report retrieval are verified through real HTTP, persistent-storage, and viewer tests.

## 03 — Isolate producers, project grants, and credential lifecycle

**GitHub issue:** [#4](https://github.com/quickstark/skills/issues/4).

**Blocked by:** 01 — Submit and view one authenticated native skill readout.

**What it delivers:** Multiple harnesses can each publish only their explicitly authorized projects, while rotating or revoking one producer credential does not interrupt unrelated approved producers.

**Acceptance criteria:**

- [ ] Every configured producer has its own non-sensitive identity, bearer credential, and explicit canonical-project grants.
- [ ] Missing, invalid, revoked, and cross-producer credentials cannot create a report.
- [ ] A valid credential cannot publish an ungranted project or bypass the hosted project-publication allowlist.
- [ ] Equivalent safe SSH and HTTPS Git origins resolve to the same authorized canonical project.
- [ ] Forged project labels, token-bearing origins, traversal, mismatched canonical identities, and unsafe local paths are rejected.
- [ ] Rotating or revoking one producer preserves accepted immutable history and unrelated producers' access.
- [ ] Errors, logs, redirects, report documents, and generated URLs never expose bearer credentials or unauthorized project identities.
- [ ] Behavior tests demonstrate two producer identities, two projects, an approved submission, an unauthorized submission, and credential revocation.

## 04 — Publish independently named external skills into the gallery

**GitHub issue:** [#5](https://github.com/quickstark/skills/issues/5).

**Blocked by:** 01 — Submit and view one authenticated native skill readout.

**What it delivers:** An authorized non-QuickStark skill produces a genuine, searchable, project-organized hosted report showing its real harness, skill collection, skill, and observed outcome alongside native QuickStark reports.

**Acceptance criteria:**

- [ ] The versioned envelope accepts the actual authorized producer, harness family, skill collection, external skill identity, report status, UTC run time, and recorded outcome.
- [ ] The server renders an independently validated, safe external-skill report without requiring fabricated membership in the promoted QuickStark catalog.
- [ ] Native QuickStark reports retain registered-skill validation and their existing purpose-specific report profiles.
- [ ] External reports are discoverable in the existing project library, project explorer, project search, activity timeline, and immutable direct report routes.
- [ ] The report identifies externally produced findings, decisions, checks, next recommendations, and observed relationships accurately.
- [ ] Previews, fabricated completed checks, invalid relationships, and unverified delivery provenance are not presented as actual or independently verified work.
- [ ] Behavior tests submit and retrieve both a registered native skill and an independently named external skill for the same explicitly approved project.

## 05 — Publish a local skill run through a portable HTTPS adapter

**GitHub issue:** [#6](https://github.com/quickstark/skills/issues/6).

**Blocked by:** 02 — Make submitted skill runs immutable and safe to retry; 03 — Isolate producers, project grants, and credential lifecycle.

**What it delivers:** A locally running authorized skill creates its normal local readout, optionally publishes it over HTTPS using ordinary harness configuration, and accurately reports whether hosted publication succeeded.

**Acceptance criteria:**

- [ ] An explicitly configured publisher sends a supported versioned envelope to the exact report-ingestion route using a producer bearer credential.
- [ ] Endpoint selection, credential use, project opt-in, connection timeout, and bounded retry behavior come from documented task-relevant configuration.
- [ ] Publication is disabled by default and never infers permission from a local credential or reachable report domain.
- [ ] A successfully accepted native skill run returns the actual canonical hosted report location.
- [ ] An identical bounded retry resolves to the existing immutable report rather than creating duplicates.
- [ ] An offline endpoint, timeout, unauthorized project, denied publication, or invalid credential preserves the real local readout and truthfully reports that hosted publication did not occur.
- [ ] Local loopback, SSH-forwarded, private-LAN, and no-viewer reporting behavior remain functional when hosted publication is not configured.
- [ ] End-to-end tests exercise a real local readout, actual HTTP submission, successful gallery retrieval, and an honest local-only fallback.

## 06 — Prove independent harness and skill-collection interoperability

**GitHub issue:** [#7](https://github.com/quickstark/skills/issues/7).

**Blocked by:** 04 — Publish independently named external skills into the gallery; 05 — Publish a local skill run through a portable HTTPS adapter.

**What it delivers:** Two independently identified harnesses can publish native and external skills into the same approved project without depending on one another's skill catalogs, installations, filesystem paths, or interactive browser sessions.

**Acceptance criteria:**

- [ ] One supported Codex harness publishes a genuine registered QuickStark report through the portable producer contract.
- [ ] A second independently identified harness or skill collection publishes a genuine external skill report through the same contract.
- [ ] Both immutable reports appear under the same explicitly authorized canonical project with their actual distinct producer, harness, and collection identities.
- [ ] Neither producer requires a remote filesystem mount, desktop-specific integration, browser login, personal VPN, or shared source checkout.
- [ ] Existing native skill invocation policy and catalog-only validation remain unchanged.
- [ ] Canonical and generated Codex reporting helpers remain source-synchronized after implementation.
- [ ] Behavior tests verify both report locations, existing gallery discovery, actual metadata, and no fabricated skill or delivery claims.

## 07 — Reject unsafe submissions and redact sensitive audit data

**GitHub issue:** [#8](https://github.com/quickstark/skills/issues/8).

**Blocked by:** 01 — Submit and view one authenticated native skill readout.

**What it delivers:** The ingestion interface safely refuses hostile or excessive submissions while retaining a useful, non-sensitive record of actual producer activity.

**Acceptance criteria:**

- [ ] Unsupported contract versions, malformed JSON, unexpected content types, invalid timestamps, unsafe skill names, and invalid run identities fail with documented machine-readable status codes.
- [ ] Explicit bounded limits protect request bytes, collection lengths, field sizes, nesting, concurrency, timeouts, and per-producer submission rate.
- [ ] Raw HTML, scripts, unsafe URLs, archive content, binary attachments, compressed bodies, traversal, symbolic-link escapes, and remote fetch instructions are rejected or safely escaped.
- [ ] The server, not the submitting harness, produces the immutable report HTML and preserves restrictive browser response headers.
- [ ] The producer route accepts neither browser-session cookies nor permissive cross-origin browser submissions.
- [ ] Operational audit records omit bearer tokens, request bodies, sensitive findings, unauthorized project names, checkout paths, shell output, and conversation history.
- [ ] Hostile and oversized submissions create no report and cannot expose an existing unrelated report.
- [ ] Behavior tests assert observable status codes, output escaping, safe logs, response headers, bounded rejection, and unchanged gallery isolation.

## 08 — Deploy the isolated ingestion route without weakening the viewer

**GitHub issue:** [#9](https://github.com/quickstark/skills/issues/9).

**Blocked by:** 02 — Make submitted skill runs immutable and safe to retry; 03 — Isolate producers, project grants, and credential lifecycle; 07 — Reject unsafe submissions and redact sensitive audit data.

**What it delivers:** After explicit deployment authorization, the existing report hostname accepts only authorized machine-to-machine submissions at its dedicated write route, while authenticated browser access continues to use the existing read-only viewer.

**Acceptance criteria:**

- [ ] Only the exact versioned producer route is forwarded to the explicitly authenticated ingestion adapter.
- [ ] The existing gallery, report, and viewer routes retain their browser identity-provider protection and reject write methods.
- [ ] Only the ingestion adapter receives narrowly scoped writable access to the persistent approved-report directory.
- [ ] The browser-viewer container retains its read-only filesystem, read-only report mount, project allowlist, health behavior, and existing direct report links.
- [ ] The stack remains on the existing private proxy network without exposing a direct host port or binding a development viewer to every interface.
- [ ] Security settings preserve TLS, no-new-privileges, dropped unnecessary container capabilities, safe error responses, and explicit producer-grant failure behavior.
- [ ] The deployment is performed only after the user explicitly authorizes the route, credential issuance, and changes to the active reporting stack.
- [ ] Integration tests or explicitly authorized deployment checks verify route isolation, producer authentication, actual durable ingestion, viewer health, and authenticated report visibility.

## 09 — Verify a real laptop-to-domain, cross-harness report delivery

**GitHub issue:** [#10](https://github.com/quickstark/skills/issues/10).

**Blocked by:** 06 — Prove independent harness and skill-collection interoperability; 08 — Deploy the isolated ingestion route without weakening the viewer.

**What it delivers:** An explicitly authorized skill run on an actually separate laptop appears as an immutable report on the real authenticated reporting domain, with a second harness proving that the result is not specific to a QuickStark skill or one Codex installation.

**Acceptance criteria:**

- [ ] An authorized laptop uses ordinary HTTPS and its own producer credential to submit a genuine native skill run.
- [ ] An independently authorized harness submits a genuine external-skill report through the same deployed endpoint.
- [ ] An authenticated user opens both real report links in the existing authorized project library.
- [ ] Browser authentication, project isolation, report provenance, immutable identity, chronological activity, and actual producer metadata are verified end to end.
- [ ] An invalid credential, revoked producer, unapproved project, and unsupported route are denied without disclosing report content.
- [ ] A network failure preserves a real local report without claiming a hosted report exists.
- [ ] No employer, customer, or otherwise unapproved project data is exported during acceptance checks.
- [ ] Source synchronization and the complete repository test suite pass after final integration.
- [ ] Completion claims distinguish actual laptop and authenticated-browser verification from an origin-machine-only health check.

## Dependency frontier

- Start with **01**.
- After **01**, tickets **02**, **03**, **04**, and **07** can proceed independently.
- Start **05** after **02** and **03**.
- Start **06** after **04** and **05**.
- Start **08** after **02**, **03**, and **07**, and only after separately approving production deployment.
- Start **09** after **06** and **08**, and only when an approved separate laptop, producer credentials, and actual authenticated browser verification are available.

## Publication and approval

After explicit user approval, GitHub Issues were enabled for `quickstark/skills`, and the real `ready-for-agent` triage label was created. The specification was published as parent issue [#1](https://github.com/quickstark/skills/issues/1); every slice was published as its own labeled issue [#2](https://github.com/quickstark/skills/issues/2) through [#10](https://github.com/quickstark/skills/issues/10). All 13 blocking edges were created as native GitHub issue dependencies and verified directly against the project issue tracker.

Publishing these tickets does not, by itself, authorize changing active production routing, issuing a live producer credential, publishing confidential project material, or claiming that a separate laptop has completed an end-to-end check. Those deployment and delivery results must be directly observed before their corresponding tickets can be marked complete.
