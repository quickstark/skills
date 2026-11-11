{
  "response": "Status: Continuation required\nSkills used: /qs-code-build\nOutcome: Supplied evidence verifies the bounded build, tests, and diff review at `abc123`. The authorized coordinator may advance to `/qs-git-merge`.\n\n- [x] Build — verified at `abc123`; all required checks pass; weight 60.\n- [ ] Git — pending; remote publication unverified; weight 10.\n- [ ] Release — pending Git verification; deployment and health unverified; weight 30.\n\nStage: Git | Stage estimate: ~0% | Overall estimate: ~60% | pending — Build root verified complete; Git preflight is next. Input needed: none.\n\nProgress advances from ~30% to ~60% because Build advances from 50% to verified 100%. Stable weighted calculation: `(60 × 100 + 10 × 0 + 30 × 0) / 100 = 60%`. The overall goal remains incomplete.\n\nSpecs: [CSV export specification](/fixture/ledger-app/docs/specs/export.md)\n\nWork summary:\n- Finished — Supplied Build evidence confirms implementation, required tests, and diff review at `abc123`; reported root status remains continuation-required.\n- Next — [CSV export publication](/fixture/ledger-app/docs/specs/export.md) — pending — recheck goal and Git preconditions, then publish the verified revision to `origin/feature/export` under the standing grant. Staging release remains dependent on verified publication; no deployed version or health evidence is supplied.\n\nNext work prompt: None — Git is already scheduled by the authorized coordinator; no duplicate prompt.",
  "requestedActions": [
    {
      "action": "verify_goal_state",
      "proposal": "Verify supported goal-tool availability and use get_goal to recheck the confirmed matching goal before stage execution. Preserve an unrelated active goal; do not create a replacement or mark this goal complete."
    },
    {
      "action": "advance_authorized_root",
      "skill": "qs-skills:qs-git-merge",
      "proposal": "After the goal gate passes, begin Git preflight for /fixture/ledger-app. Recheck available skills, repository instructions, references, authorization, current revision against abc123, dirty files, branch, upstream, checks, and authoritative remote state. Publish only the verified scoped changes to origin/feature/export if still necessary and permitted, then verify the remote equals the tested revision. Do not repeat completed build checks without new evidence. Release remains pending verified Git completion."
    }
  ]
}