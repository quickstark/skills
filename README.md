# QuickStark Skills

A focused, personal collection of engineering and productivity skills for Codex and Claude Code. Every promoted skill starts with `qs-`, so entering `/qs-` shows the collection together, and continuing with `/qs-plan-`, `/qs-code-`, `/qs-test-`, or `/qs-deploy-` narrows it by intent.

The engineering disciplines are adapted from [Matt Pocock's skills](https://github.com/mattpocock/skills). The upstream repository, original MIT license, and original source links remain available for reference.

## Project documentation

- [Architecture and trust boundaries](./docs/architecture.md) — canonical skills, plugin generation, reporting, and authenticated publication.
- [Readout operations](./docs/readout-operations.md) — local and hosted reports, cross-machine publishing, producer grants, and credential rotation.
- [Contributing](./docs/contributing.md) — catalog-first skill changes, synchronization, tests, and release safety.
- [Changelog](./CHANGELOG.md) — verified QuickStark changes and preserved upstream release history.

## Clone on another machine

```bash
git clone https://github.com/quickstark/skills.git
cd skills
```

## Install in Codex

From the root of this repository:

```bash
codex plugin marketplace add ./codex
codex plugin add qs-skills@quickstark
```

Start a new Codex task after installing. Type `/qs-` to see the whole collection or `/qs-help` to find the right workflow.

The Codex plugin packages only the promoted skills. Draft, personal, miscellaneous, and deprecated upstream skills do not appear in the installed collection.

## Install in Claude Code

From the root of this repository:

```bash
claude plugin marketplace add .
claude plugin install qs-skills@quickstark
```

Run `/qs-setup` once in a project to configure its issue tracker, domain documentation, and triage conventions.

## Browse by purpose

| Type | Commands | Purpose |
| --- | --- | --- |
| Help and setup | `/qs-help`, `/qs-setup` | Choose a workflow and configure a project. |
| Planning | `/qs-plan-clarify`, `/qs-plan-explore`, `/qs-plan-interview`, `/qs-plan-spec`, `/qs-plan-tickets`, `/qs-plan-roadmap`, `/qs-plan-research` | Turn an idea into researched, actionable work. |
| Design | `/qs-design-domain`, `/qs-design-modules`, `/qs-design-architecture`, `/qs-design-prototype` | Explore domain models, interfaces, architecture, and prototypes. |
| Coding and documentation | `/qs-code-build`, `/qs-code-debug`, `/qs-code-document` | Build, diagnose, and accurately document verified project behavior. |
| Testing | `/qs-test-tdd` | Build behavior using a test-first feedback loop. |
| Review | `/qs-review-code` | Review changes against code standards and requirements. |
| Deployment | `/qs-deploy-release` | Verify and execute an existing, documented deployment safely. |
| Git | `/qs-git-merge` | Resolve an in-progress merge or rebase. |
| Workflow | `/qs-flow-triage`, `/qs-flow-handoff` | Organize incoming issues and hand work to another session. |
| Learning and skill authoring | `/qs-learn-teach`, `/qs-skill-write` | Learn a subject or improve an agent skill. |

## The main engineering workflow

```text
/qs-setup
    ↓
/qs-plan-clarify
    ↓
/qs-plan-spec
    ↓
/qs-plan-tickets
    ↓
/qs-code-build  →  /qs-test-tdd
    ↓
/qs-code-document  (when documentation needs updating)
    ↓
/qs-review-code
    ↓
/qs-deploy-release
```

Use `/qs-plan-roadmap` before the main flow for a large, ambiguous project. Use `/qs-flow-triage` when the work starts as an incoming issue, `/qs-code-debug` when something is broken, and `/qs-help` whenever you are unsure where to start.

## The refactoring workflow

```text
/qs-design-architecture
    ↓
/qs-plan-clarify
    ↓
/qs-design-modules  →  /qs-design-domain
    ↓
/qs-test-tdd
    ↓
/qs-code-build
    ↓
/qs-code-document  (when documentation needs updating)
    ↓
/qs-review-code
    ↓
/qs-deploy-release  (only when requested and approved)
```

Use `/qs-plan-spec` and `/qs-plan-tickets` between design and implementation only when the refactor is large enough to justify them. `/qs-help` explains both workflows, every skill's purpose, and the top next prompts for the actual situation.

## Visual skill readouts

Every promoted skill automatically produces a compact, purpose-specific, self-contained HTML readout and starts or reuses its lightweight report viewer. The 24 report profiles keep an honest status, concise outcome, actual execution machine, verified deployment evidence, genuinely changed project files, findings, decisions, outputs, checks, and up to three copy-ready top next prompts; each foregrounds the information that matters for that particular skill. Every complete prompt appears in a prominent code block, embeds its catalog-approved next skill, and carries forward the actual outcome and relevant observed evidence. A quieter callout underneath suggests a heuristic model and thinking level.

| Skill purpose | Primary visual signal |
| --- | --- |
| Domain and architecture | Accessible maps of actual concepts, boundaries, and decisions. |
| Research and exploration | Evidence and observed findings visualized as compact charts. |
| Planning and implementation | Decision sequences, actual deliverables, and verified checks. |
| Test-driven development | Only the tests that actually passed, failed, or were skipped. |
| Code review and triage | Concise comparison of real findings, review axes, and outcomes. |
| Deployment and setup | Actual release gates, validation results, and deployment artifacts. |
| Guidance, handoff, and learning | Focused recommendations, current state, and real next steps. |

Visualizations are accessible, responsive, and self-contained; they never invent activity, progress, test results, or report data. Reports have no external JavaScript or stylesheet dependency and use the operating system's temporary `quickstark-readouts` directory by default.

Generate a clearly labeled preview for all 24 skills:

```bash
npm run readouts:gallery
```

Previews explicitly say that no skill has run and claim no project changes or checks. The gallery command starts its viewer automatically, verifies that it responds, and prints the clickable gallery URL.

When a skill runs on a Mac or graphical desktop, its viewer uses local loopback:

```text
http://127.0.0.1:4173/
```

When a skill runs on a headless or SSH-connected Linux dev box, it automatically detects the private home-network address and starts a capability-protected viewer:

```text
http://192.168.1.200:4173/r/<unguessable-access-token>/
```

Open the exact link returned by the skill on a laptop connected to the same home network. No Tailscale account, manual server startup, public listener, or always-on service is required. If port `4173` is already used by a web preview or another development tool, the viewer automatically chooses the next available port. On Linux, a temporary user-managed service keeps the viewer available after the Codex command finishes without installing a permanent startup service. The server binds to one private IP, serves only generated QuickStark HTML, and returns `404` without the access token.

### Viewing reports from a remote Codex machine

Home-network links work directly when the laptop can reach the dev box. For a stricter SSH-only setup, generate the gallery in SSH mode:

```bash
npm run readouts:gallery -- --access ssh
```

On your Mac, create an SSH tunnel to the remote machine:

```bash
ssh -N -L 4173:127.0.0.1:4173 your-user@your-codex-host
```

Then open `http://127.0.0.1:4173/` on your Mac. No report port is exposed to the home network. Set `QS_READOUT_ACCESS=ssh` for subsequent skill runs when SSH-only access should remain the default.

To explicitly generate a local-only report without starting any viewer, use the renderer's `--no-serve` option. Existing viewers are reused only after their health endpoint confirms that they are the expected QuickStark report service.

### Persistent, project-aware report library

The default viewer now combines three production views: a project-first library, a searchable project explorer, and a newest-first cross-project activity timeline. It discovers the active repository from its verified Git origin and groups reports under canonical identities such as `github.com/quickstark/skills`. Actual skill runs and catalog previews are always distinguished; previews stay out of project counts and activity until you explicitly choose **Show catalog previews**.

Temporary, flat report storage remains the backward-compatible default. To opt into durable, automatically project-organized reports on the dev box, configure a persistent report root:

```bash
export QS_READOUT_DIR=/docker/appdata/quickstark-readouts
```

New reports are then created under immutable paths such as:

```text
/docker/appdata/quickstark-readouts/
  github.com/quickstark/skills/2026/07/
    qs-code-build--2026-07-25T21-42-54-022Z--a417bd19.html
```

Existing flat reports remain available at their original addresses. Historical reports without verified project metadata appear as **Unassigned legacy reports**; their free-text headings are never represented as proof of repository ownership. Preview an explicit, non-mutating migration before applying it:

```bash
node scripts/qs-skill-readout.mjs migrate \
  --directory /tmp/quickstark-readouts \
  --target-directory /docker/appdata/quickstark-readouts \
  --project github.com/quickstark/skills \
  --json
```

The command makes no changes unless repeated with `--apply`. Migration preserves the original, writes an immutable verified copy, and can safely be repeated. Project-specific retention is also dry-run-first:

```bash
node scripts/qs-skill-readout.mjs prune \
  --directory /docker/appdata/quickstark-readouts \
  --project github.com/quickstark/skills \
  --retention-days 90 \
  --json
```

Inspect the selected reports before deliberately adding `--apply`. Neither command migrates, publishes, or deletes another project's reports.

### Authenticated hosted access

[`deploy/readouts/compose.yaml`](./deploy/readouts/compose.yaml) provides a dedicated persistent readout service for the existing Docker `proxy` network, Traefik HTTPS router, and Authelia authentication middleware. The running viewer publishes **only** explicitly allowlisted canonical project identities; `github.com/quickstark/skills` is the sole default. Unauthorized projects cannot appear in the library, project search, activity timeline, direct-report links, or error messages. The container has a read-only filesystem and report mount, drops Linux capabilities, exposes no host port, and serves no checkout files.

Validate and start the dedicated stack only after approving the configured hostname and publication policy:

```bash
docker compose -f /docker/stacks/quickstark-readouts/compose.yaml config --quiet
docker compose -f /docker/stacks/quickstark-readouts/compose.yaml up -d
```

The intended hostname is `reports.quickstark.com`. It is usable from a personal or managed laptop only after its real DNS record resolves, HTTPS works, Authelia rejects anonymous requests, and an approved user can retrieve an actual report. Do not treat a local reverse-proxy check as proof of remote reachability. No Tailscale, private-network client, or permanent SSH tunnel is required once those external prerequisites are explicitly configured and verified.

### Publishing reports from another harness or laptop

The report stack includes a separate, authenticated write interface:

```text
POST https://reports.quickstark.com/api/v1/readouts
```

Only the dedicated ingestion adapter accepts producer submissions. The existing browser gallery and report viewer remain Authelia-protected and read-only. Native QuickStark skills keep their registered, purpose-specific report profiles; explicitly authorized skills from Codex Desktop, Codex CLI, Claude Code, or an independent collection receive an honest external-skill profile and appear in the same approved project library.

Production ingestion starts only when an operator has explicitly configured hashed producer grants in `/docker/appdata/quickstark-readouts-config/readout-producers.json`:

```json
{
  "version": 1,
  "producers": [
    {
      "id": "personal-codex-laptop",
      "tokenSha256": "replace-with-the-64-character-sha256-digest-of-a-private-token",
      "projects": ["github.com/quickstark/skills"]
    }
  ]
}
```

The ingestion container mounts `/docker/appdata/quickstark-readouts-config/` read-only, so atomic producer-grant replacements become visible immediately and credentials can be rotated or revoked without restarting the service. Keep actual bearer tokens outside that mounted directory: the approved laptop credential is stored with `0600` permissions in `/docker/appdata/quickstark-readouts-credentials/personal-codex-laptop.token`, which is never mounted into either container. Supply a producer token only through its private environment; never commit it, insert it into a URL, store it in the report library, or pass it as a command-line argument. The producer's project grant and the hosted publication allowlist must both approve the canonical project.

Configure an explicitly authorized laptop or harness:

```bash
export QS_READOUT_INGESTION_URL=https://reports.quickstark.com/api/v1/readouts
export QS_READOUT_PRODUCER_ID=personal-codex-laptop
export QS_READOUT_PUBLISH_PROJECTS=github.com/quickstark/skills
export QS_READOUT_HARNESS=codex-desktop
export QS_READOUT_PUBLISH_MAX_ATTEMPTS=2
export QS_READOUT_PUBLISH_RETRY_DELAY=50
# Supply QS_READOUT_PRODUCER_TOKEN through the harness's private credential configuration.
```

With those explicit settings, a normal QuickStark skill readout is written locally first and then published automatically. Other harnesses can submit a versioned structured readout with the portable command:

```bash
node scripts/qs-skill-readout.mjs publish \
  --input /absolute/path/to/approved-readout-envelope.json \
  --allowed-projects github.com/quickstark/skills \
  --report-base-url https://reports.quickstark.com/ \
  --max-attempts 2 \
  --retry-delay 50 \
  --json
```

The command uses the privately configured `QS_READOUT_PRODUCER_TOKEN`; the report envelope includes the actual producer, harness, collection, canonical project, skill, immutable run identifier, actual UTC timestamp, observed status, and outcome. Namespaced plugin identifiers such as `compound-engineering:ce-code-review` are supported without misrepresenting external skills as native QuickStark skills. Publisher attempts are bounded to 1–5 and retry delays to 0–2,000 milliseconds; equivalent `QS_READOUT_PUBLISH_MAX_ATTEMPTS` and `QS_READOUT_PUBLISH_RETRY_DELAY` environment variables also apply to automatically published native readouts. The ingestion service emits only redacted JSON audit events containing the timestamp, authorized producer, authorized project, response status, and outcome. The server renders and escapes its own HTML and never accepts uploaded HTML or arbitrary files. First delivery returns `201`; an identical retry returns the same immutable report with `200`; changed content for the same run returns `409`.

Publishing is disabled by default. If the producer, project grant, remote endpoint, or applicable data-handling policy is missing, the local skill readout remains available and the outcome explicitly says that hosted publication did not happen. Do not publish employer, customer, or confidential project data to personal infrastructure without explicit applicable authorization.

Validate the isolated stack before intentionally activating a production route:

```bash
docker compose -f deploy/readouts/compose.yaml config --quiet
```

A real laptop-to-domain delivery, browser-authenticated report retrieval, anonymous browser rejection, producer denial, and live credential rotation must be verified after deployment; a local test or healthy container alone does not establish external delivery.

If a newly created hostname works through public DNS but still fails on the home network, compare the public resolver with the home router:

```bash
dig @1.1.1.1 reports.quickstark.com A
dig @192.168.1.1 reports.quickstark.com A
```

An `NXDOMAIN` from the router while Cloudflare returns public addresses means the router is caching the hostname's previous nonexistence. Wait for the router's negative-cache TTL to expire or clear that router's DNS cache; flushing only the dev box cannot remove an upstream cached result.

## Consistent skill output

Every promoted skill also finishes with the same concise, human-readable summary:

```text
Status: Completed
Skills used: /qs-design-architecture; /qs-design-modules
Outcome: Identified and prioritized the highest-value architectural refactor.
Execution: Actual development machine; only files changed by this skill run.
Readout: /tmp/quickstark-readouts/qs-design-architecture--2026-07-25T15-30-00-000Z--a1b2c3d4.html
Outputs: /absolute/path/to/architecture-review.html
Checks: Confirmed the affected modules and existing test coverage.
```

**Top next prompts:**

**1. Clarify the selected refactor**

```text
Use /qs-plan-clarify to agree on the selected architectural refactor's scope, preserved behavior, and existing test coverage.
```

> Suggested model: `gpt-5.6-sol` · Suggested thinking: `high`.
>
> Heuristic guidance; the active model and thinking level are not changed automatically.

**2. Design the selected architectural seam**

```text
Use /qs-design-modules to design the interface and seam for the architectural candidate identified in the review.
```

> Suggested model: `gpt-5.6-sol` · Suggested thinking: `high`.
>
> Heuristic guidance; the active model and thinking level are not changed automatically.

`Skills used` lists only skills that actually ran. `Execution` identifies the actual machine and includes deployment details or changed files only when independently verified. `Readout` is the actual generated HTML path or a verified private viewer URL. `Outputs`, `Checks`, and delivery evidence appear only when real artifacts, validations, or GitHub records exist. `Top next prompts` provides up to three copy-ready, context-aware prompts that explicitly invoke approved follow-on skills and build on what this run actually accomplished. Each includes a suggested model and suggested thinking level. These suggestions are heuristic starting points, not benchmarks or observed results; they never change the active model automatically. A recorded critical finding or failed check can suggest deeper reasoning. The report says `None — the requested work is complete` when no follow-up is needed; suggested skills never appear under `Skills used`.

Approved follow-on skills, their baseline actions, and their heuristic model and thinking guidance remain in [`scripts/qs-skill-catalog.mjs`](./scripts/qs-skill-catalog.mjs). The readout renderer specializes each prompt using the current run's recorded outcome, findings, decisions, outputs, and checks; skill instructions and documentation inherit the contract from [`scripts/sync-skill-output-contracts.mjs`](./scripts/sync-skill-output-contracts.mjs).

## Engineering

### User-invoked

These skills run only when explicitly requested.

- [qs-help](./skills/engineering/qs-help/SKILL.md) — Find the right skill and understand the end-to-end workflow.
- [qs-setup](./skills/engineering/qs-setup/SKILL.md) — Configure a project's issue tracker, labels, and domain documentation.
- [qs-plan-clarify](./skills/engineering/qs-plan-clarify/SKILL.md) — Clarify a project through questions and capture durable decisions.
- [qs-plan-spec](./skills/engineering/qs-plan-spec/SKILL.md) — Turn agreed requirements into an actionable specification.
- [qs-plan-tickets](./skills/engineering/qs-plan-tickets/SKILL.md) — Break a plan into small, dependency-aware implementation tickets.
- [qs-plan-roadmap](./skills/engineering/qs-plan-roadmap/SKILL.md) — Map a large, ambiguous project into manageable decisions.
- [qs-design-architecture](./skills/engineering/qs-design-architecture/SKILL.md) — Find and improve weak points in an existing architecture.
- [qs-code-build](./skills/engineering/qs-code-build/SKILL.md) — Implement a specification or tracked ticket.
- [qs-flow-triage](./skills/engineering/qs-flow-triage/SKILL.md) — Turn incoming issues into actionable work.
- [qs-deploy-release](./skills/engineering/qs-deploy-release/SKILL.md) — Verify and run a documented deployment after the required confirmation.

### Model-invoked

These skills can also be selected automatically when the task fits.

- [qs-plan-research](./skills/engineering/qs-plan-research/SKILL.md) — Research a question against reliable primary sources.
- [qs-design-prototype](./skills/engineering/qs-design-prototype/SKILL.md) — Build a focused prototype to answer a design question.
- [qs-design-domain](./skills/engineering/qs-design-domain/SKILL.md) — Develop a clear domain model and shared project vocabulary.
- [qs-design-modules](./skills/engineering/qs-design-modules/SKILL.md) — Design clean interfaces and deep, testable modules.
- [qs-code-debug](./skills/engineering/qs-code-debug/SKILL.md) — Reproduce, diagnose, and regression-test a bug.
- [qs-code-document](./skills/engineering/qs-code-document/SKILL.md) — Write accurate documentation from verified project behavior.
- [qs-test-tdd](./skills/engineering/qs-test-tdd/SKILL.md) — Implement behavior using a red-green test-driven loop.
- [qs-review-code](./skills/engineering/qs-review-code/SKILL.md) — Review code against its specification and project standards.
- [qs-git-merge](./skills/engineering/qs-git-merge/SKILL.md) — Resolve Git merge and rebase conflicts without losing work.

## Productivity

### User-invoked

- [qs-plan-explore](./skills/productivity/qs-plan-explore/SKILL.md) — Explore and pressure-test an idea without requiring a codebase.
- [qs-flow-handoff](./skills/productivity/qs-flow-handoff/SKILL.md) — Prepare a concise handoff for another agent or session.
- [qs-learn-teach](./skills/productivity/qs-learn-teach/SKILL.md) — Learn a subject through a practical, guided study plan.
- [qs-skill-write](./skills/productivity/qs-skill-write/SKILL.md) — Create or improve a focused, reliable agent skill.

### Model-invoked

- [qs-plan-interview](./skills/productivity/qs-plan-interview/SKILL.md) — Resolve a plan or decision through one focused question at a time.

## Updating the Codex plugin

The canonical skill files live under `skills/engineering` and `skills/productivity`. The Codex plugin contains a generated, curated snapshot because Codex accepts one skill directory, not the two promoted buckets.

After adding or changing a promoted skill:

```bash
npm run sync:codex
npm test
```

`npm run sync:codex` first regenerates the standardized HTML-readout contract, output, and context-aware next-prompt guidance in every skill and documentation page, then packages exactly the promoted skills and their shared readout helpers. The tests verify that every packaged file matches its canonical source; the only permitted transformation removes Claude-only invocation frontmatter, because Codex represents the same restriction in `agents/openai.yaml`.

## Keeping the upstream as a reference

The `origin` remote is the [QuickStark fork](https://github.com/quickstark/skills). Matt's original repository remains available through the `upstream` remote:

```bash
git fetch upstream
git log HEAD..upstream/main --oneline
git show upstream/main:skills/engineering/tdd/SKILL.md
```

Consult [`scripts/qs-skill-catalog.mjs`](./scripts/qs-skill-catalog.mjs) for the mapping from each original upstream name to its QuickStark command. Review useful upstream changes and adapt them to the namespaced skill rather than blindly overwriting the personalized collection.

## License and attribution

The 22 adapted skills originate from [Matt Pocock's skills](https://github.com/mattpocock/skills) and remain covered by the original [MIT license](./LICENSE). `/qs-deploy-release`, `/qs-code-document`, the QuickStark naming system, the Codex packaging, and the repository validation are personal additions.
