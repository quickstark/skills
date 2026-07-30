# Skill readout operations

## Purpose

Use this runbook to view a report locally, automatically publish verified skill runs from another machine using a single private token, operate the authenticated project library, and investigate delivery problems without exposing credentials or unpublished project data.

The repository's authoritative deployment definition is `deploy/readouts/compose.yaml`. The running production stack is managed from `/docker/stacks/quickstark-readouts/compose.yaml`. Check the actual configuration before changing or restarting either service.

## Choose the appropriate access mode

| Situation | Readout location | Access |
| --- | --- | --- |
| Actual promoted skill on any authorized platform | Authenticated immutable report library | Required verified `https://reports.quickstark.com/` URL; fail clearly when the producer credential or delivery is unavailable. |
| Explicitly requested same-machine preview | Operating-system temporary `quickstark-readouts` directory | Deliberately selected verified localhost viewer. |
| Explicitly requested trusted-home-network preview | Private remote-machine report directory | Deliberately selected capability-protected private-IP viewer. |
| Explicitly requested SSH-only preview | Remote localhost | `QS_READOUT_ACCESS=ssh` and an explicit SSH tunnel. |
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

Use the actual URL returned by a deliberately requested, health-checked preview viewer. A private home-network address is not a public or remotely reachable HTTPS address and is never the normal skill-readout link.

## Hosted service architecture

The prepared Docker stack separates the read-only viewer, producer ingestion, and privileged Dashboard Settings into three independently scoped runtimes:

- `quickstark-readouts` serves immutable reports with a read-only report mount, Traefik HTTPS, and Authelia browser authentication.
- `quickstark-readout-ingestion` accepts only authenticated, structured JSON at `https://reports.quickstark.com/api/v1/readouts` and has the report-library write permission required for accepted submissions.
- `quickstark-readout-settings`, when explicitly deployed, serves `/settings` behind Authelia on the private, internal `quickstark-readout-settings-auth` network. Only Traefik's explicitly configured `10.250.12.2` address can supply a trusted user identity. Only this administrator-checked runtime receives the writable producer-grant and private-credential mounts required for one-time token generation.

None of these runtimes publishes a host port, serves the Git checkout, binds a wildcard listener, or stores producer bearer credentials in the report library. The viewer and ingestion runtimes never receive the private producer-credential mount. Preparing the Settings deployment definition does not restart or deploy production.

When the Settings runtime has been explicitly approved and deployed, authenticated users can open `/settings` for **Profile & personal settings** or `/settings?tab=producer-tokens` for the administrator-managed token table. Only a configured administrator can create, inspect, rename, or revoke a producer. Token issuance and mutations require the isolated proxy address, user-bound anti-CSRF protection, same-origin requests, and bounded JSON; creation is independently rate-limited to 30 requests per administrator per minute. **Create new token** opens the only platform selector. Its original no-store response contains the actual one-time token and a complete copy-ready Linux, macOS, Windows, or ChatGPT instruction block with that exact token already embedded. The token and token-bearing command disappear when the creation modal closes or reloads; existing table rows expose only metadata and a short digest fingerprint. A bounded interprocess lock serializes every producer-grant update, preserving unrelated credentials.

Token-embedded shell commands are secrets: execute them only on the intended machine, account, and Codex profile, and be aware that local shell or PowerShell history can retain a pasted command. Linux commands establish an owner-only credential file and use `systemctl --user import-environment` so the bearer never enters `systemctl` process arguments. For macOS, select **Default · ~/.codex** or **Demo · ~/.codex-demo** inside the token-creation wizard. The generated command explicitly installs a `0600` credential in that exact profile and creates its independently named Keychain item through `security` standard input. It works in an ordinary Terminal without inherited `CODEX_HOME`; it never calls `launchctl setenv` or overrides another Codex application's producer. Windows uses a protected user-owned file and its current and persistent user environments. ChatGPT receives private GPT Action authentication instructions instead of an operating-system command. Never paste any producer token into a chat, issue, URL, or report.

Appearance changes are signed with the owner-only `/docker/appdata/quickstark-readouts-config/readout-preferences.key`, bound to the authenticated user, and stored in an `HttpOnly`, `Secure`, `SameSite=Strict`, root-path cookie. The viewer mounts only that signing-key file read-only, not the credential directory. Text size and information density apply to the live authenticated Workbench and Settings without modifying an immutable report.

For ChatGPT, open **Producer tokens**, choose **Create new token**, and select **ChatGPT GPT Action**. Import `/settings/chatgpt/openapi.json` into the GPT Action and copy that token's **API key → Bearer** instructions into the private authentication setting. The action submits to the existing `/api/v1/readouts` endpoint; it does not require a local shell, a Codex environment variable, or a shared machine token.

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

## Authorize each reporting machine

Production producer grants reside in `/docker/appdata/quickstark-readouts-config/readout-producers.json`. The ingestion service reads the directory through its restricted mount and requires versioned, explicitly scoped grants:

```json
{
  "version": 1,
  "producers": [
    {
      "id": "personal-codex-laptop",
      "tokenSha256": "REPLACE_WITH_THE_SHA256_DIGEST_OF_THE_PRIVATE_TOKEN",
      "projects": ["*"]
    }
  ]
}
```

The digest above is an illustrative placeholder, not a valid credential or an existing grant. Generate a high-entropy producer token, store it with restricted permissions outside the mounted configuration and report directories, and place only its SHA-256 digest in the server grant. `"*"` is an explicit server-side decision allowing this authenticated producer to submit any safely identified project, whether it has a Git remote or is an ordinary local workspace. Token authentication authorizes publication; the project identity only organizes the immutable report. Never permit anonymous submission, unsafe project paths, absolute local path disclosure, or a report that claims to belong to a different actual workspace. Supply the actual token through the approved harness's private environment or credential storage.

Never commit, log, place in a URL, or mount the bearer token into the viewer or ingestion container. A user-requested one-time, token-bearing setup command must be copied only to its intended machine and profile. Avoid passing the bearer as a subprocess argument or configuring a shared macOS `launchctl` token; the selected macOS application automatically discovers its own owner-only profile credential. Treat local shell history as secret. Do not grant employer, customer, or private projects without explicit permission.

Generate an independently revocable credential for each submitting machine with the dedicated producer utility:

```bash
node scripts/qs-readout-producer-token.mjs --producer openai-codex-laptop --json
node scripts/qs-readout-producer-token.mjs --producer linux-codex-dev-server --json
```

The utility generates 48 cryptographically random bytes per token, creates a `0600` private file in `/docker/appdata/quickstark-readouts-credentials/`, and atomically registers only its SHA-256 digest in the server's producer-grant file. Existing credentials and unrelated grants remain intact. Console output contains the producer identity and credential path, never the bearer token. The ingestion service reloads the updated grant without a restart.

Native skill rendering validates an explicitly configured producer token and securely discovers an owner-only token in the active profile before checking the standard operating-system credential location. Linux and Windows preserve explicit-token precedence. On macOS, the active profile's installed file or separately named Keychain token wins over a legacy shared desktop token; the explicit token remains available when the profile has no file or named Keychain credential:

```text
~/.codex/quickstark/producer.token
~/.codex-demo/quickstark/producer.token
~/.config/quickstark/producer.token
```

The default and demo profiles retain independent producer identities even when both applications inherited an older shared macOS environment. The active macOS profile's named Keychain entry is checked before a shared token; the existing legacy Keychain entry remains a backward-compatible fallback. The generated installer rejects symbolic-link profile, credential-directory, and token paths before disclosure; it atomically replaces regular tokens with a new `0600` file rather than inheriting unsafe prior permissions. Windows discovers the protected `~/.quickstark/producer.token` generated by its setup wizard. Reject another user's profile, symbolic links in any profile or credential ancestor, unsafe permissions, unexpected credential contents, outside-home real paths, and changed file or directory identities. A deliberately requested `--access local`, `--access lan`, or `--access ssh` remains a private viewer rather than silently publishing.

An explicit inherited credential remains supported. An existing restricted Linux or macOS credential can be loaded without printing its contents:

```bash
export QS_READOUT_PRODUCER_TOKEN="$(< /docker/appdata/quickstark-readouts-credentials/personal-codex-laptop.token)"
```

On Windows, load the token from an operator-authorized private credential file:

```powershell
$env:QS_READOUT_PRODUCER_TOKEN = (Get-Content -Raw "C:\path\to\your\private\quickstark-reporting.token").Trim()
```

`QS_READOUT_PRODUCER_TOKEN` remains the only required setting when an owner-only installed profile credential is unavailable. Either the explicit token or its securely discovered private profile credential authenticates publication. The reporting endpoint defaults to `https://reports.quickstark.com/api/v1/readouts`; the server authenticates the token and derives its registered producer; the harness defaults to `codex`; and the project is inferred from the current working directory. Use a Git origin when available; workspaces without a Git remote receive a safely fingerprinted local project identity. Do not maintain GitHub verification, project lists, owner patterns, producer names, harness settings, or endpoint variables for ordinary skill runs. All 24 native QuickStark skills invoke `render --require-hosted`, write an immutable local recovery artifact, and publish their actual structured results without first starting a private-IP viewer. Return only the verified `https://reports.quickstark.com/` hosted URL after authenticated API acceptance. Missing credentials, unsafe project identities, failed submissions, and invalid hosted responses fail clearly, preserve the private recovery report, and never present localhost, a private IP, or a filesystem path as the skill readout.

### Skill-run metrics

Every completed report places **Skill run metrics** immediately after **Top next prompts**. For Codex, the normal renderer privately locates only the exact current task's bounded session tail, verifies that the user invoked exactly the reported skill, and subtracts the directly observed pre-task provider counters. It records the observed model, reasoning effort, input and output tokens, total usage, and elapsed active task time without exposing message contents, tool outputs, task-wide totals, credentials, or absolute paths. The measurement source is `verified-harness` and the scope is `skill-run`.

If the skill invocation, baseline, consistent model, safe counters, or readable task boundary cannot be verified, the renderer fails closed and shows `Not captured`. Thread-turn or cumulative conversation measurements remain explicitly thread-level and are never reassigned to an individual skill. Catalog previews do not claim run measurements.

Repository metadata is independent of model telemetry. For a Git-backed run, the publishing machine captures its actual branch, full revision, upstream counts when available, and changed-worktree count before submitting the report. Hosted ingestion validates that snapshot against the authorized canonical project and preserves it in immutable report metadata even when the reporting container does not have Git installed. Public GitHub default branch, visibility, and issue counts are shown only when independently verified. An unavailable per-skill model or token count must never suppress available repository evidence.

## Publish an external skill

Other Codex harnesses, Claude Code, and approved independent skill collections can submit a versioned structured envelope. Preserve the actual producer, harness, collection, canonical project, skill name, UTC run timestamp, observed completion status, and real findings. Include optional `commands` only for terminal actions the user still needs to run, each with an exact command and an explanation of why or when it is needed. Include optional `keyCode` only for relevant, safely scoped source excerpts. Both are part of the immutable submission: changing either for the same run returns `409 Conflict`. Do not send HTML, source trees, screenshots, shell logs, credentials, private keys, or unverified release claims.

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
- If publication is local-only, retain the local report and check the private token, automatically detected current project, server-side grant, default HTTPS endpoint, and network reachability.
- If a new hostname fails only on the home network, compare the public and router DNS resolvers; an `NXDOMAIN` can be the home router's negative DNS cache.
- If identical retries return `409`, inspect the actual run identity and submitted content; never replace an existing immutable report.
