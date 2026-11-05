# Codex restart script

Date: 2026-11-05. Build: current checkout `codex/docs-446-restart`, base
`f9ce331c9fc8bd0d19a1d1e0fe161e6fb97851f8`. No new worktrees.

The owner asked for a copy/paste restart script and rejected changing how Codex
starts. This supersedes the earlier universal-launcher design: keep the existing
setup, use Codex's native restart when managed, support the known GMK detached
Linux command, and stop for other launchers. No migration or service creation.
Systemd/launchd automation from original AC-03/AC-04 is out of scope; their manual
reference remains available. Actual macOS runtime validation remains unverified.

## Behavior and evidence

| Criteria | Current scope and verification |
| --- | --- |
| AC-01 | Self-contained Node heredoc runs from any directory; no downloads or predefined PID variables. CLI and pasted-source help tested in a different directory. |
| AC-02 | Explicit profile, inherited CODEX_HOME, then account default. Exact Linux argv/owner/profile match excludes proxies, stdio and other profiles; zero/multiple matches refuse. |
| AC-03/AC-04 | Dedicated systemd/launchd adapters removed after owner requested simplification. Codex's own managed daemon works through its native command on Linux/macOS; external launchers stop. |
| AC-05 | Known Linux command preserves executable, argv, initial environment, cwd, umask, /dev/null stdin and owned append logs. Synthetic proc fixtures cover context; owned process/socket fixture covers stop/start. |
| AC-06 | Revalidate PID/start identity, context and listener before TERM; unsupported credentials/limits/FDs/logs stop. Per-profile helper lock rejects concurrent runs. |
| AC-07 | Bounded stop; occupied listener prevents launch; launch at most once; native failure never falls back to manual killing. |
| AC-08/AC-09 | Query selected profile through native daemon version; require running server version and correct socket. Manual replacement must retain identity and own that listening socket. Native restart owns its PID validation and protocol readiness. |
| AC-10 | No configuration/skills edits, credentials printed, sudo, KILL, new manager or alternate listener. Output from subprocess failures is withheld. |
| AC-11 | README, installation guide and both existing Notion pages include the same inline source at the top. Existing history remains. |
| AC-12 | Injected observations, private fixture metadata and owned process/socket only; full repository checks and internal Standards/Spec review. No live restart, release, tag change, commit or push. |

Node is already an installation prerequisite. The standalone source is
[scripts/restart-codex.mjs](../../scripts/restart-codex.mjs); focused tests are
[tests/restart-codex.test.mjs](../../tests/restart-codex.test.mjs).
`--check` performs no restart; Codex's own version query may clean stale native
PID metadata. Native restart uses Codex's saved daemon settings. Linux manual
restart preserves the process's initial environment; unavailable context refuses.
The copy block includes the source so it works before Git publication and does
not imply the existing 4.4.6 release contains this unpublished maintenance tool.

## Serial ticket graph

| Ticket | Blocked by | Scope | State |
| --- | --- | --- | --- |
| RH-01 | none | CLI and exact discovery | verified |
| RH-02 | RH-01 | Delegate managed restart; refuse other managers | verified |
| RH-03 | RH-01 | Preserve known manual launch and verify readiness | verified |
| RH-04 | RH-02, RH-03 | README, guide, two Notion copy blocks | verified |
| RH-05 | RH-04 | Review, acceptance bindings and repository validation | verified |

Root integration is serial in the existing checkout, with read-only review
helpers. No commits, branches or worktrees created. Verification logs remain in
`/tmp/qs-restart-*`; these are session evidence, not packaged release evidence.

## References

- [Installation guide](../install-and-update-skills.md).
- [Codex native lifecycle](https://github.com/openai/codex/blob/rust-v0.162.1/codex-rs/app-server-daemon/src/lib.rs): backend PID ownership, restart ordering and protocol readiness.
- [Codex PID backend](https://github.com/openai/codex/blob/rust-v0.162.1/codex-rs/app-server-daemon/src/backend/pid.rs): PID and start-identity validation.
- Notion: [QuickStark Skills](https://app.notion.com/p/3a9238a125b28031bbbee1fcba64733f), [Codex Commands](https://app.notion.com/p/3be238a125b280a29cc9d255a7ca2a7a).

## Completed validation

30 focused restart-script tests passed; full `npm test` passed 751 tests with
zero failures and one expected platform skip. `npm run sync:codex`, generated
checks, ten adoption-acceptance checks, release acceptance across 18 package/host
pairs and six isolated strict Claude validations passed. Standards review found
a volatile process-counter comparison; the repair and regression test passed
re-review. Spec review found no remaining actionable issue. Both existing Notion
pages accepted the identical copy block without warnings. No live restart or
Mac execution was performed. Changes remain local; no publication is included.
