# QuickStark Dashboard Settings module design

> Historical record — this settings, renderer, ingestion, and credential design is superseded by the direct-chat completion contract. It is not part of the active command, package, deployment, or test architecture.

## Decision

Provide one authenticated Dashboard Settings experience without giving the read-only Project Workbench, immutable report renderer, or report ingestion interface the ability to generate producer credentials.

## Module interfaces

### Dashboard Settings

Own the protected Settings document, authenticated account, bounded appearance preferences, nonce-scoped browser interaction, and administrator-only producer administration. Mirror the Project Workbench with a real left Settings sidebar containing exactly two independently restorable administrator destinations: **Profile & personal settings** and **Producer tokens**. Profile contains the signed-in account and appearance controls. Producer tokens contains one accessible, conventional table row per independently registered producer. Ordinary authenticated users retain their personal profile but never receive producer metadata, even in a hidden HTML panel; a direct attempt to open the producer-token destination returns `403`. There is no standalone Platform setup page. Read-only project browsing and immutable historical readouts never import or execute Settings scripts.

Observable interface:

    normalizeReadoutPreferences(preferences)
    readoutPlatformSetup()
    renderReadoutSettings(settings)
    startReadoutSettingsServer(configuration)

### Appearance

Normalize three allowed text sizes and two information densities. The default preserves the approved B presentation: 13 px featured details and 12 px native prompt content. Provide actual, separately actionable text-size and density controls. Apply accepted preferences immediately without refreshing the page, preserve the other setting when either control changes, and restore only the authenticated user's signed, `HttpOnly`, `Secure`, `SameSite=Strict` preference. User adjustments must not rewrite existing report bytes, inferred metrics, or evidence.

### Producer token administration

Keep the existing producer issuer as the deep credential module. Ordinary command-line invocation never prints a secret. Only an administrator-authenticated Settings mutation may explicitly request one-time disclosure. Store a 0600 private token and only its SHA-256 digest, display name, selected platform, and actual creation time in the producer grant.

Render icon-labelled **View**, **Edit**, and **Delete** actions in the first table column. View displays only the producer identity, platform, actual creation date, and a short SHA-256 fingerprint; it can never reconstruct a previously issued token. Edit changes only the display name, preserving the stable producer identity and bearer authorization. Delete requires an explicit confirmation, removes only that producer's private credential and grant, and immediately prevents that token from publishing. Preserve every unrelated producer and historical report.

Token generation requires a trusted forward-authenticated user, an explicitly authorized administrator or administrator group, a user-bound anti-CSRF token, bounded JSON, an independently bounded per-administrator request rate, and a no-store response. Simultaneous requests must preserve unrelated producer grants, disclose each actual credential only once, and return a conflict instead of replacing an existing token. The existing viewer and ingestion mounts never gain credential-directory access.

### Token-specific platform installation

Use one interface with exactly four adapters:

- Linux: the actual one-time token, an owner-only credential file, the current shell, and the user service environment inherited by Codex.
- macOS: the actual one-time token, an explicitly selected owner-only `.codex` or `.codex-demo` profile credential, an independently named profile Keychain entry, and an ordinary-Terminal installation command that never changes the shared desktop launch environment.
- Windows: the actual one-time token, a restricted credential file, the current PowerShell process, and the persistent user environment.
- ChatGPT: the actual one-time token, private GPT Action bearer authentication, and the authenticated `/settings/chatgpt/openapi.json` schema.

Every submitter receives its own independently revocable token. Codex and ChatGPT use the same server-side bearer authentication and the same structured immutable readout ingestion.

The renderer automatically discovers the active Codex profile credential and returns the verified `https://reports.quickstark.com/` report URL. Default and demo profiles never share or replace each other's credential, even if both inherited a legacy shared macOS environment token. The selected profile's owner-only file or independently named Keychain item takes precedence over that shared token; a valid explicitly configured token remains available when no profile-specific credential exists. When no profile credential exists, Linux and macOS can use the owner-only `~/.config/quickstark/producer.token`; Windows can use its protected `~/.quickstark/producer.token`; macOS can use the existing legacy Keychain item. The macOS installer rejects symlinked profile, credential-directory, and token paths before disclosing the one-time bearer and atomically writes or rotates its private `0600` file. Unsafe permissions, symbolic links at any profile or credential ancestor, invalid tokens, and profiles whose real path escapes the current user home fail closed.

### Guided producer setup

Open a compact, accessible creation modal only when the administrator clicks **Create new token** on the producer table. First choose whether the token belongs to Codex or ChatGPT. Codex then offers Linux, macOS, or Windows; ChatGPT skips the operating-system choice and provides GPT Action, bearer authentication, and a directly browser-openable authenticated OpenAPI schema. The ChatGPT-only schema link remains hidden for Codex setup.

The flow remains explicit:

1. Choose Codex or ChatGPT.
2. Select the Codex operating system and, on macOS, explicitly choose the default `.codex` or demo `.codex-demo` profile.
3. Name and generate one separately identified producer token and reveal it once.
4. Copy the exact platform-specific instructions with that actual token already embedded; no manual token substitution is required.
5. Verify the integration by publishing and opening a real immutable skill readout.

Do not display platform setup outside this modal. A token-bearing copy command is explicitly shown only during original credential creation; closing the modal or reloading the page removes it. Never place the token in a URL, immutable report, producer-list response, browser persistence, audit log, or GPT conversation. Treat a copied shell command as secret because a user's local shell history can record it.

### Browser visual delivery

Place standalone visual HTML inside the existing protected readout library under a safe, unique visual-artifact name. Return a verified HTTP or HTTPS URL rather than a temporary filesystem link. Preserve the source document, project access rules, restrictive report headers, and immutable historical readouts.

Reject arbitrary HTML uploads, executable content, frames, unsafe navigation, secrets, symbolic links, oversized source documents, unknown skills, and cross-project access. A visual artifact is not a completed skill run and must never appear as one in the Project Workbench.

Observable interface:

    writeReadoutVisualArtifact(artifact, browserDestination)

## Regression coverage

Test actual report-style Settings navigation and independently restored sidebar tabs; responsive, accessible producer-table rows; the real browser create/view/edit/delete flow; native Bash, Zsh, and PowerShell syntax; exact per-platform token-bearing copy commands; ordinary-Terminal execution of both independently selected macOS profile commands; inherited shared-token isolation; intermediate profile symlink and outside-home real-path rejection; project isolation; source immutability; the default 13 px and 12 px typography; anonymous and non-administrator denial; invalid anti-CSRF tokens and hostile origins; one-time browser-visible producer disclosure; concurrent Codex and ChatGPT issuance; bounded token generation; SHA-256-only grants; immediate revocation without affecting another producer; user-bound preference restoration; the authenticated ChatGPT schema; an actual cross-project ChatGPT submission, idempotent retry, and immutable conflict; safe permissions; and restrictive, route-specific browser policies.

## Deployment

Prepare a third separately routed Settings runtime behind the existing Authelia forward-auth middleware. Mount producer grants and private credentials only in this dedicated runtime. Do not deploy, restart, or grant administrator access without explicit approval.
