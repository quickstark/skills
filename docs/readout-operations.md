# Skill readout operations

## Purpose

Use this runbook to view a report locally, publish an explicitly approved report from another machine, operate the authenticated project library, and investigate delivery problems without exposing credentials or unpublished project data.

The repository's authoritative deployment definition is `deploy/readouts/compose.yaml`. The running production stack is managed from `/docker/stacks/quickstark-readouts/compose.yaml`. Check the actual configuration before changing or restarting either service.

## Choose the appropriate access mode

| Situation | Readout location | Access |
| --- | --- | --- |
| Same machine or graphical desktop | Operating-system temporary `quickstark-readouts` directory | Automatically verified localhost viewer. |
| Laptop on the same trusted home network | Private remote-machine report directory | Capability-protected private-IP viewer. |
| SSH-only remote access | Remote localhost | `QS_READOUT_ACCESS=ssh` and an explicit SSH tunnel. |
| Durable project history | `/docker/appdata/quickstark-readouts` | Canonical project, year, and month directories. |
| Authorized report from another machine | Existing authenticated project library | Explicit producer grant and `POST /api/v1/readouts`. |

Generate the complete, clearly marked skill-preview gallery:

```bash
npm run readouts:gallery
```

Previews are demonstrations. They are not completed work, test evidence, production deployments, or project activity.

For a durable local library:

```bash
export QS_READOUT_DIR=/docker/appdata/quickstark-readouts
npm run readouts:gallery
```

For SSH-only access:

```bash
npm run readouts:gallery -- --access ssh
ssh -N -L 4173:127.0.0.1:4173 your-user@your-codex-host
```

Use the actual URL returned by the health-checked viewer. A private home-network address is not a public or remotely reachable HTTPS address.

## Hosted service architecture

The dedicated Docker stack runs two independently bounded services:

- `quickstark-readouts` serves immutable reports with a read-only report mount, Traefik HTTPS, and Authelia browser authentication.
- `quickstark-readout-ingestion` accepts only authenticated, structured JSON at `https://reports.quickstark.com/api/v1/readouts` and has the report-library write permission required for accepted submissions.

Neither service publishes a host port, serves the Git checkout, binds a public listener, or stores producer bearer credentials in the report library.

Validate the repository definition without starting anything:

```bash
docker compose -f deploy/readouts/compose.yaml config --quiet
```

Inspect the actual deployed stack:

```bash
docker compose -f /docker/stacks/quickstark-readouts/compose.yaml ps
```

A real external browser request should redirect an anonymous user to the existing identity provider:

```bash
curl -fsS -o /dev/null -w 'HTTP %{http_code}; redirect %{redirect_url}\n' \
  https://reports.quickstark.com/
```

A real, anonymous producer request should be rejected with `401`:

```bash
curl -sS -o /dev/null -w 'HTTP %{http_code}\n' \
  -X POST -H 'Content-Type: application/json' --data '{}' \
  https://reports.quickstark.com/api/v1/readouts
```

Do not treat a healthy local container as proof that public DNS, TLS, external routing, browser authentication, or laptop-to-server delivery works.

## Authorize one reporting machine

Production producer grants reside in `/docker/appdata/quickstark-readouts-config/readout-producers.json`. The ingestion service reads the directory through its restricted mount and requires versioned, explicitly scoped grants:

```json
{
  "version": 1,
  "producers": [
    {
      "id": "personal-codex-laptop",
      "tokenSha256": "REPLACE_WITH_THE_SHA256_DIGEST_OF_THE_PRIVATE_TOKEN",
      "projects": ["github.com/quickstark/skills"]
    }
  ]
}
```

The value above is an illustrative placeholder, not a valid credential or an existing grant. Generate a distinct, high-entropy token per producer; store it with restricted permissions outside the mounted configuration and report directories; place only its SHA-256 digest in the server grant. Supply the actual token through the approved harness's private environment or credential storage.

Never commit, print, log, pass as a command-line argument, place in a URL, or mount the bearer token into the viewer or ingestion container. Do not grant employer, customer, or private projects without explicit permission.

Configure the authorized publishing machine:

```bash
export QS_READOUT_INGESTION_URL=https://reports.quickstark.com/api/v1/readouts
export QS_READOUT_PRODUCER_ID=personal-codex-laptop
export QS_READOUT_PUBLISH_PROJECTS=github.com/quickstark/skills
export QS_READOUT_HARNESS=codex-desktop
export QS_READOUT_PUBLISH_MAX_ATTEMPTS=2
export QS_READOUT_PUBLISH_RETRY_DELAY=50
# Supply QS_READOUT_PRODUCER_TOKEN using private harness credential configuration.
```

Once configured, native QuickStark skill rendering first creates the real local report and then attempts bounded hosted publication. Remote publication is disabled when these explicit settings or the producer token are absent.

## Publish an external skill

Other Codex harnesses, Claude Code, and approved independent skill collections can submit a versioned structured envelope. Preserve the actual producer, harness, collection, canonical project, skill name, UTC run timestamp, observed completion status, and real findings. Do not send HTML, source trees, screenshots, shell logs, credentials, or unverified release claims.

```bash
node scripts/qs-skill-readout.mjs publish \
  --input /absolute/path/to/approved-readout-envelope.json \
  --allowed-projects github.com/quickstark/skills \
  --report-base-url https://reports.quickstark.com/ \
  --max-attempts 2 \
  --retry-delay 50 \
  --json
```

The publisher reads `QS_READOUT_PRODUCER_TOKEN` from its private environment. It verifies the returned report origin and path. An external skill retains its genuine name and collection; it is never portrayed as a promoted QuickStark skill.

## Interpret producer responses

| Response | Meaning | Operator action |
| --- | --- | --- |
| `201 Created` | A new verified immutable report was accepted. | Open the returned report through the authenticated browser. |
| `200 OK` | The identical skill run was already accepted. | Reuse the existing immutable report URL. |
| `401 Unauthorized` | The producer credential is missing, invalid, expired, or revoked. | Verify private producer configuration; never display the token. |
| `403 Forbidden` | The producer or hosted project is not explicitly authorized. | Review both independent project allowlists and applicable data-handling policy. |
| `409 Conflict` | Different content reused an existing immutable run identity. | Generate an actual new run; never overwrite historical evidence. |
| `413 Content Too Large` | The structured submission exceeded the bounded request size. | Remove unsupported logs, HTML, attachments, or excess results. |
| `429 Too Many Requests` | The producer exceeded its bounded request rate. | Respect the limit and retry only within the supported bounds. |
| Local-only result | Publication is absent, unavailable, refused, or unsafe. | Preserve and use the locally generated report; diagnose the explicit reason. |

## Rotate or revoke credentials

Producer rotation uses an atomic replacement of `readout-producers.json` in its mounted directory. Preserve unrelated producer grants, install the replacement with restricted permissions, and validate the new digest and approved projects. The ingestion service reloads the current grant file for producer requests; rotation or revocation does not require a container restart.

After rotation, verify that the previous credential is rejected, the replacement credential can publish only its approved project, and existing report URLs remain immutable. Never log either credential while testing.

## Migrate or retain existing reports

Migration and retention preview their actions by default. Always review the project-specific plan before explicitly applying it.

```bash
node scripts/qs-skill-readout.mjs migrate \
  --directory /tmp/quickstark-readouts \
  --target-directory /docker/appdata/quickstark-readouts \
  --project github.com/quickstark/skills \
  --json

node scripts/qs-skill-readout.mjs prune \
  --directory /docker/appdata/quickstark-readouts \
  --project github.com/quickstark/skills \
  --retention-days 90 \
  --json
```

Neither command writes or deletes unless explicitly rerun with `--apply`. Do not migrate or prune another project's history.

## Troubleshoot

- If the browser URL redirects unexpectedly, verify the intended hostname, Traefik route, HTTPS, and Authelia rather than bypassing authentication.
- If the producer gets `401`, verify the producer identity and current grant without printing its bearer token.
- If it gets `403`, compare the canonical project with both the producer grant and hosted publication allowlist.
- If publication is local-only, retain the local report and check the explicit HTTPS endpoint, private token configuration, bounded retry settings, and network reachability.
- If a new hostname fails only on the home network, compare the public and router DNS resolvers; an `NXDOMAIN` can be the home router's negative DNS cache.
- If identical retries return `409`, inspect the actual run identity and submitted content; never replace an existing immutable report.
