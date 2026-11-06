# Codex restart script

Date: 2026-11-05. Build: current checkout `codex/docs-446-restart`, base
`f9ce331c9fc8bd0d19a1d1e0fe161e6fb97851f8`. No new worktrees.

The owner requested completion on 2026-11-06 after the dirk-dev systemd restart
was verified manually. The current scope is one copy/paste entry point using the
existing Codex-managed daemon on Linux/macOS, a verified dedicated Linux systemd
user/system service, or the known detached GMK Linux launch. Keep the existing
setup and configuration. Unknown launchers stop. No migration or service creation.
External launchd jobs and app-owned servers retain their documented original
restart controls. Actual Mac execution remains unverified. This completion request
supersedes the earlier exclusion of the narrow systemd adapter; a universal
launcher framework remains outside this change.

## Behavior and evidence

| Criteria | Current scope and verification |
| --- | --- |
| AC-01 | Bash/zsh copy block downloads the complete helper from immutable commit `2a885c9155bc4885182874dc3a945963d784e5f4` before running it; no predefined PID variables or inline heredoc. Failed downloads prevent execution; temporary files are removed on all exits. |
| AC-02 | Explicit profile, inherited CODEX_HOME, then account default. Linux owner/profile and app-server/listener argument parsing excludes proxies, exec-server, stdio and other profiles. Repeated configuration arguments are retained for systemd services; the detached manual path still requires its exact known command. Zero/multiple matches refuse. |
| AC-03/AC-04 | Codex-managed daemons use their native command on Linux/macOS. Linux systemd discovers the selected server’s live cgroup and verifies its dedicated service, main process or direct root sudo wrapper, current configuration and socket ownership. It delegates to the original user/system manager. External launchd jobs remain outside the helper. |
| AC-05 | Known Linux command preserves executable, argv, initial environment, cwd, umask, /dev/null stdin and owned regular log destinations without truncating prior contents. Synthetic proc fixtures cover context; owned process/socket fixture covers stop/start. |
| AC-06 | Revalidate PID/start identity, context and listener before TERM; unsupported credentials/hard limits/FDs/logs stop; the helper temporarily adopts the server's open-file soft limit and restores its own afterward. Per-profile helper lock rejects concurrent runs. |
| AC-07 | Bounded stop; occupied listener prevents launch; launch at most once; native failure never falls back to manual killing. |
| AC-08/AC-09 | All paths use a bounded readiness poll after restart; require a running server version on the selected profile socket. Manual/systemd replacements must retain identity and own that listening socket. Systemd also requires a new invocation and stable loaded configuration. Native restart owns its PID validation. Timeouts never trigger a second restart or manual fallback. |
| AC-10 | No configuration/skills edits, credentials printed, KILL, new manager or alternate listener. A verified system-level service may use cached sudo permission only for `/usr/bin/systemctl ... try-restart -- <verified unit>`; user services and `--check` never invoke sudo. Missing permission produces an instruction to run `sudo -v` separately. Subprocess failure details remain withheld. |
| AC-11 | README, installation guide and both existing Notion pages include the same short pinned download block at the top. Existing history remains. |
| AC-12 | Injected observations, private fixture metadata and owned process/socket only; full repository checks and internal Standards/Spec review. No live restart, release or tag change. Maintenance commits/pushes make the pinned standalone script available independently of release installation. |

Node is already an installation prerequisite. The standalone source is
[scripts/restart-codex.mjs](../../scripts/restart-codex.mjs); focused tests are
[tests/restart-codex.test.mjs](../../tests/restart-codex.test.mjs).
`--check` performs no restart; Codex's own version query may clean stale native
PID metadata. Native restart uses Codex's saved daemon settings. Linux manual
restart preserves the process's initial environment; unavailable context refuses.
The copy block downloads the already-pushed standalone script from its immutable
commit; the existing 4.4.6 release does not contain this maintenance tool.

## Serial ticket graph

| Ticket | Blocked by | Scope | State |
| --- | --- | --- | --- |
| RH-01 | none | CLI and exact discovery | verified |
| RH-02 | RH-01 | Delegate native/systemd restart; refuse unsupported launchers | verified in isolated fixtures |
| RH-03 | RH-01 | Preserve known manual launch and verify readiness | verified |
| RH-04 | RH-02, RH-03 | README, guide, two Notion copy blocks | verified |
| RH-05 | RH-04 | Review, acceptance bindings and repository validation | verified |

Root integration remains serial in the existing checkout. Maintenance commits
carry the standalone script and synchronized documentation; no release is published. Verification logs remain in
`/tmp/qs-restart-*`; these are session evidence, not packaged release evidence.

## References

- [Installation guide](../install-and-update-skills.md).
- [Codex native lifecycle](https://github.com/openai/codex/blob/rust-v0.162.1/codex-rs/app-server-daemon/src/lib.rs): backend PID ownership, restart ordering and protocol readiness.
- [Codex PID backend](https://github.com/openai/codex/blob/rust-v0.162.1/codex-rs/app-server-daemon/src/backend/pid.rs): PID and start-identity validation.
- Notion: [QuickStark Skills](https://app.notion.com/p/3a9238a125b28031bbbee1fcba64733f), [Codex Commands](https://app.notion.com/p/3be238a125b280a29cc9d255a7ca2a7a).

## Original build validation

30 focused restart-script tests passed; full `npm test` passed 751 tests with
zero failures and one expected platform skip. `npm run sync:codex`, generated
checks, ten adoption-acceptance checks, release acceptance across 18 package/host
pairs and six isolated strict Claude validations passed. Standards review found
a volatile process-counter comparison; the repair and regression test passed
re-review. Spec review found no remaining actionable issue. Both existing Notion
pages accepted the identical copy block without warnings. No live restart or
Mac execution was performed. Changes remain local; no publication is included.

## Copy/paste correction

The reported terminal input joined the closing heredoc marker to another copy
of the opening command (`QUICKSTARK_RESTARTnode ...`). The marker was no longer
a standalone shell line, so Node parsed shell syntax as JavaScript and stopped
before the restart entry point. The saved Notion blocks contained one correctly
separated marker each; where the pasted text was joined was not established.

Replace the long inline module with a short subshell that downloads a complete,
commit-pinned file, checks curl's exit status before Node runs, and removes the
temporary file on exit. Verify the actual remote source against the local script;
run downloaded help only. Isolated Bash/zsh tests cover success, partial-download
failure, helper failure and cleanup. No live server restart is part of this fix.

## Reported GMK and dirk-dev refusals

The operator clarified that the resource-limit refusal occurred on GMK and the
zero-match refusal occurred on dirk-dev. Read-only GMK inspection confirmed PID
17930, the known detached command, and matching hard limits. Node raised the
helper's open-file soft limit to 1,048,576 while the server retained 1,024. The
helper now temporarily adopts that original soft limit before launch, verifies
it, and restores its own afterward. The live server's limits are never edited.
Other limit differences still refuse before signals.

GMK's logical control socket is a symlink to a shorter hashed `/tmp` path. Match
kernel listeners against the resolved path, retain it through socket removal,
and reject alias changes before effects. Its stdout/stderr are owned regular
logs positioned at EOF, without O_APPEND; retain their content by reopening for
append rather than rejecting or truncating them.

The repaired local helper completed `--check` on GMK: “Background server PID
17930; launch context verified. No restart performed.” Isolated regression tests
cover resource-limit adoption/restoration/inheritance, unreproducible/denied
limits, socket aliases and regular EOF logs. No live server was restarted.

Dirk-dev is not reachable from this chat. The operator supplied its exact process
and cgroup evidence: a system-level transient service with a root sudo wrapper
launching Codex as `dirk`, profile `/home/dev-user/.codex`, and repeated `-c` flags.
The operator restarted its live service manually. The first immediate version
query found no socket; later checks showed active/running, Result=success, and
Codex `0.168.0-alpha.7` responding (CLI `0.165.0`). This verifies that manual route.

The completed adapter keeps all flags under the existing systemd definition and
resolves the live unit on every invocation. It refuses broad supervisors,
configuration changes, ambiguous targets, wrong profiles and unverified sockets.
The new systemd path and macOS native startup-delay behavior pass isolated
regression fixtures. No live helper restart on dirk-dev or the Mac is claimed.


## Completion validation (2026-11-06)

The source commit pinned by the copy block is `2a885c9155bc4885182874dc3a945963d784e5f4`.
Focused validation passed 58 restart tests, including systemd user/system services,
startup delays, permission denial, changing configuration, wrong profiles and
socket ownership, no-op restarts, ambiguity, and macOS native readiness polling.
Full repository, generated-package, release-acceptance and strict Claude checks
are required before the documentation promotion is committed. No live servers
are restarted by those checks. The package version remains 4.4.6.
