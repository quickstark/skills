# Research: durable, browser-accessible QuickStark skill readouts

> Historical record — superseded by the direct-chat completion contract in [`docs/skill-run-contract.md`](../skill-run-contract.md). No active command, package, deployment, or service implements this design.

Date: 2026-07-25

Status: researched; no hosting, DNS, access policies, or deployment have been changed.

## Recommendation

Create one private, browser-accessible report library at a proposed hostname such as `reports.quickstark.com`. Store self-contained QuickStark HTML in persistent storage on the existing dev box, identify each project from its Git origin, and route the library through the existing Traefik and either Cloudflare Access or the existing Authelia authentication system. Use a Cloudflare Tunnel only if the existing externally accessible Traefik route cannot safely reach the dev box. The laptop should need nothing beyond an ordinary HTTPS browser and an approved login: no Tailscale, personal VPN, installed client, or SSH session.

`reports.quickstark.com` is a **proposed** hostname, not a verified existing or reachable service. Configuration, DNS, authentication, and end-to-end access must be implemented and tested before presenting a report link as working.

This recommendation preserves the existing, already-functional readout renderer instead of introducing a separate report-generation system. For availability when the dev box is offline, a separately authenticated Cloudflare Pages publication is the best optional second phase; it is not a reason to make all reports public.

## The actual problem

A skill running on a remote computer can return a clickable HTML path, but that file belongs to the remote filesystem. A remote loopback URL such as `http://127.0.0.1:4173/` belongs to the remote computer as well, not the laptop's browser. A private home-network address only works when the laptop can reach that home network. An Nginx container does not change this network boundary by itself. Therefore, the essential requirement is not simply “host HTML”; it is:

> Open any authorized skill report from either laptop in a normal web browser, on or off the home network, organized by the actual project, without installing a personal-network client on a managed machine.

An ordinary internet-routable HTTPS hostname, protected by authentication, is the natural fit. Cloudflare documents browser-based access to self-hosted web applications, including identity-provider or email-code authentication; the browser user need not install the Cloudflare One client for this public-hostname HTTP application. Private-network and infrastructure applications are different products and may require a device client. Sources: [Cloudflare: choose an application type](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/choose-application-type/), [Cloudflare: add web applications](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/), and [Cloudflare: private web application](https://developers.cloudflare.com/cloudflare-one/setup/secure-private-apps/private-web-app/).

## Verified existing capabilities

The repository already contains most of the report-generation pieces:

- [scripts/qs-skill-readout.mjs](../../scripts/qs-skill-readout.mjs) defines the default report directory as `join(tmpdir(), "quickstark-readouts")`, exposes `QS_READOUT_DIR`, accepts `--directory`, and produces uniquely named self-contained HTML.
- The renderer already accepts `project` in its JSON input and displays it in the report heading. Project metadata exists conceptually; automatic identification, project-specific storage, and project-aware gallery indexing do not yet exist.
- `QS_READOUT_BASE_URL` and `--base-url` already permit an existing HTTP(S) report viewer to be reused, but the renderer verifies that viewer's health endpoint and report-directory identity. A generic Nginx directory listing is therefore **not** automatically a compatible replacement for the current verified Node viewer.
- The current gallery reads HTML files directly from one directory. It does not recurse through project subdirectories. A nested persistent library therefore requires a deliberately project-aware gallery or metadata index, not simply setting the output directory to the library root.
- The existing [README](../../README.md#visual-skill-readouts) accurately describes a LAN-capability viewer and optional SSH forwarding. Neither claims to make the remote machine accessible from arbitrary networks.
- The dev box already has an active Traefik reverse proxy, Authelia, Cloudflare-backed TLS, and existing `*.quickstark.com` routing. Consequently, deploying a second stand-alone internet-facing Nginx server is unnecessary unless a static-file component is specifically preferred. This infrastructure observation establishes existing local components; it does **not** establish that the proposed report hostname, policy, or route already exists.

### Important source-code detail

Preserve the existing verifier rather than circumventing it. If Traefik publishes the existing readout service, proxy the service's real health and HTML endpoints, configure its durable report directory, and have the renderer verify the true configured base URL. If a new static library service is used instead, provide a deliberately compatible health/identity contract or explicitly extend the renderer to understand the new publisher. Do not point `QS_READOUT_BASE_URL` at an ordinary static host and claim it was verified.

## How to identify the current project

A skill does not need privileged access to the Codex application or sidebar to identify the working project. The authoritative, portable identity is the Git checkout that the skill is operating in.

Use the following hierarchy:

1. An explicitly provided project identifier, if a caller intentionally supplies one.
2. The sanitized Git `origin` URL, normalized to `github.com/quickstark/skills` and displayed as `quickstark/skills`.
3. The canonical Git top-level directory from `git rev-parse --show-toplevel`.
4. The canonical workspace directory for a non-Git project, with a short hash to avoid collisions.

Normalize SSH and HTTPS remote forms, remove the `.git` suffix, reject userinfo and credential-bearing URLs, and use only a strictly sanitized slug in filesystem or URL paths. Do not publish the full absolute machine path, SSH username, embedded credentials, environment, or arbitrary remote parameters.

This checkout demonstrates why the origin is a better identifier than the display path: a Codex session's reported working directory can differ from the canonical top-level directory returned by `git rev-parse --show-toplevel`, even when both identify the same checkout. The verified Git origin is `https://github.com/quickstark/skills.git`. The stable public project identity is `quickstark/skills`, not either machine-specific filesystem spelling.

Recommended layout:

```text
/docker/appdata/quickstark-readouts/
  github.com/
    quickstark/
      skills/
        project.json
        2026/
          07/
            qs-plan-research--2026-07-25T15-30-00-000Z--a1b2c3d4.html
            qs-design-prototype--2026-07-25T16-10-00-000Z--b2c3d4e5.html
```

Suggested, **not yet deployed**, browser paths:

```text
https://reports.quickstark.com/
https://reports.quickstark.com/projects/github.com/quickstark/skills/
https://reports.quickstark.com/projects/github.com/quickstark/skills/2026/07/...
```

A global index should group by project, show the most recent reports first, expose skill name, status, and timestamp, and link directly to the individual immutable HTML. Maintain the existing self-contained HTML and its restrictive browser security headers. Store report files outside any working checkout to avoid dirty Git trees, accidental commits, and unintentional publication.

## Architecture options

| Option | Accessible off the home network? | Access control | Dev box must stay online? | Recommendation |
| --- | --- | --- | --- | --- |
| Existing temporary LAN or SSH viewer | Only with home-network reachability or an active SSH tunnel | Unguessable capability URL or SSH | Yes | Keep as an explicit local fallback; it does not solve managed-laptop access. |
| Nginx/container on the home LAN | No, unless separately exposed | Must be added explicitly | Yes | Useful as a static origin, but insufficient on its own. |
| Existing Traefik plus Authelia at a public HTTPS hostname | Yes, if the existing public route is externally reachable | Existing authenticated browser session and route middleware | Yes | Lowest moving parts if the existing domain route is verified. |
| Existing Traefik plus Cloudflare Access | Yes, through an ordinary browser | Email/identity allowlist enforced before origin access | Yes | Strong recommended default when Cloudflare Access is available. |
| Cloudflare Tunnel plus Access plus existing viewer/static origin | Yes, without opening an inbound home-network port | Cloudflare Access identity policy | Yes | Use if inbound DNS/proxy routing is unavailable or avoiding inbound access is preferable. |
| Cloudflare Pages plus explicitly protected production/custom domain | Yes | Must protect **all** production, custom-domain, and direct deployment routes | No, after a successful publication | Optional durable off-site mirror; more publication machinery and a higher data-egress risk. |
| Public GitHub Pages | Yes | Public by default for the relevant personal-account case | No | Only for intentionally public, reviewed outputs. |
| GitHub Actions artifacts | Yes, with GitHub login and repository access | GitHub repository authorization | No | Reasonable download/archive fallback; unsuitable as a permanent browsable report library. |

### Why existing Traefik is simpler than adding Nginx

Traefik is already running, terminates HTTPS, and routes services under the existing domain. The smallest useful deployment is a dedicated report viewer or static origin on the existing Docker network, with a bind-mounted persistent report directory and a single authenticated hostname route.

An Nginx container is optional: choose it only if an intentionally static, read-only origin simplifies the implementation. It does not independently supply authentication, a project index, verified base-URL integration, or internet reachability. Avoid binding a report service to `0.0.0.0`; publish it through the existing reverse-proxy network and authentication middleware instead.

### When a Cloudflare Tunnel helps

Cloudflare describes Tunnel as an outbound-only connection from `cloudflared` to its network; it can publish an HTTP application without opening an inbound home-network port. Pair it with a **public-hostname HTTP Access application**, not a private-network route that would require an installed client. The managed laptop then accesses an ordinary authenticated HTTPS website.

Tunnel is helpful if the dev box cannot be safely reached through the current externally accessible Traefik setup. It is not intrinsically required simply because the report consumer is remote, and it does not keep reports available when the origin dev box is offline. Sources: [Cloudflare Tunnel](https://developers.cloudflare.com/tunnel/), [Cloudflare Tunnel and firewall requirements](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/configure-tunnels/tunnel-with-firewall/), and [Cloudflare application types](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/choose-application-type/).

### When Cloudflare Pages is the better answer

If “reliably” means reports must remain available while the dev box is shut down, Cloudflare Pages Direct Upload can publish a generated, project-indexed static report collection independently of the home machine. Cloudflare documents deployment using `wrangler pages deploy <OUTPUT_DIRECTORY>`. Source: [Cloudflare Pages Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/).

However, Pages previews are public by default, and the built-in preview Access toggle protects previews, **not automatically the production `*.pages.dev` hostname or a custom production hostname**. The production/custom domain and any alternate direct deployment routes must be intentionally protected with Cloudflare Access; validate that unauthenticated requests do not return report content. Sources: [Cloudflare Pages preview deployment access](https://developers.cloudflare.com/pages/configuration/preview-deployments/) and [Cloudflare Pages known issues](https://developers.cloudflare.com/pages/platform/known-issues/).

A Pages-based architecture should deploy one accumulated report library, not just the latest report. Publishing only an individual report directory per run could replace the live site and discard access to earlier reports. Keep the publisher credential narrowly scoped, server-side, and separate from generated HTML.

### Why GitHub Pages is not the private default

GitHub's official documentation says privately published GitHub Pages sites require an organization using GitHub Enterprise Cloud, and applies that access-control feature to eligible private or internal organization project sites. A personal GitHub account or a private repository does not, by itself, make its GitHub Pages website private. Therefore, do not publish project reports to GitHub Pages unless every report is intended to be internet-public or an independently verified enterprise-private setup exists. Source: [GitHub Pages visibility and access control](https://docs.github.com/en/enterprise-cloud@latest/pages/getting-started-with-github-pages/changing-the-visibility-of-your-github-pages-site).

GitHub Actions artifacts are downloadable by signed-in users with repository read access, but they expire and are not a browsable HTML website. GitHub documents a default 90-day artifact retention, subject to configuration. Sources: [GitHub: downloading workflow artifacts](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/download-workflow-artifacts) and [GitHub: removing workflow artifacts](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/remove-workflow-artifacts).

## Privacy and managed-laptop boundaries

Treat every report as potentially sensitive. Research, debugging, architectural reviews, and code-review readouts can disclose unpublished code, internal hostnames, employee or customer information, credentials accidentally included in command output, private repository names, or employer-confidential material.

- Default to deny; require explicit authentication before any HTML, listing, health metadata, or project index is disclosed.
- Use Cloudflare Access with an explicit approved-email policy or a verified identity provider, or correctly configured existing Authelia. A one-time-password login policy without a restricted email allowlist is not sufficient; Cloudflare explicitly warns that an unrestricted OTP policy can admit anyone with an email address. Source: [Cloudflare: common Access policies](https://developers.cloudflare.com/cloudflare-one/access-controls/policies/common-policies/).
- Do not assume a capability URL is equivalent to authentication for an internet-facing archive; URLs can appear in browser history, logs, support screenshots, and forwarded messages.
- Do not upload work-confidential content to a personally administered domain, Cloudflare account, GitHub repository, or home server unless the applicable employer policy explicitly permits it. Being able to open a page from a work laptop does not authorize exporting employer material to personal infrastructure.
- Separate personal and work projects into separate policies, or omit work projects entirely from personal publication. Report publication should be opt-in per project.
- Never copy `.env` files, shell history, private keys, Git remotes containing credentials, Codex conversation state, full repositories, or raw execution logs into the report library.
- Use persistent storage with an explicit retention and deletion policy. Temporary `/tmp` data, static-site deployment history, caches, and object-storage backups have materially different deletion and retention behavior.
- Verify from an actual authorized browser on each laptop and, separately, an unauthorized browser session. A successful local health check alone does not prove external reachability or correct access control.

## Suggested implementation phases

### Phase 1: durable, project-aware report generation

1. Add automatic project detection to the canonical `scripts/qs-skill-readout.mjs`, using normalized Git origin and documented fallbacks.
2. Support a persistent report root, such as `/docker/appdata/quickstark-readouts`, via the existing `QS_READOUT_DIR` mechanism while retaining the temporary default for users who have not opted in.
3. Add a nested project-aware index, immutable report links, safe slugs, and a lightweight `project.json` metadata file.
4. Preserve the current health check, report-directory identity, restrictive response headers, capability-mode local viewer, and `--no-serve` behavior.
5. Synchronize the generated Codex copy with `npm run sync:codex`, and run `npm test` as required by repository instructions.

### Phase 2: private browser access

1. Add a report-only Traefik route under a proposed authenticated hostname.
2. Use a persistent bind mount for the report library and serve no checkout files.
3. Choose exactly one intentional primary authentication boundary: Cloudflare Access at the public edge, or existing verified Authelia middleware.
4. Add Cloudflare Tunnel only if public origin reachability or home-firewall constraints require it.
5. Verify DNS, TLS, the exact report viewer identity, anonymous denial, authorized access, project isolation, and direct report links from both laptop environments.

### Phase 3: optional off-site availability

If access must survive a powered-off dev box, publish the accumulated library to a dedicated Cloudflare Pages project. Protect every production, custom-domain, and deployment-alias entry point; implement explicit project publication policy and a scoped deployment credential. Test an actual publish before claiming off-site availability.

## Decision

Start with **persistent, project-aware reports behind the existing Traefik and authenticated `quickstark.com` infrastructure**. This matches infrastructure already in place, keeps report generation on the dev box, works from any allowed browser without Tailscale, and avoids automatically uploading potentially sensitive output to a public site. Add Cloudflare Tunnel only when the existing route cannot provide safe external access. Add Cloudflare Pages only when reports genuinely need to remain available independently of the dev box.
