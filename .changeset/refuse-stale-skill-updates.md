---
"qs-skills": patch
---

Make `skills:update` verify checkout HEAD against the live `origin/main` before
planning or mutation. Stale clean main checkouts receive an exact fast-forward
command, while dirty, detached, and non-main checkouts receive an isolated
worktree command that preserves local changes.
