{
  "response": "Stage: Git | Stage estimate: ~0% | Overall estimate: ~60% | blocked — Push authorization was revoked after Build verification. Input needed: renewed push authorization for origin/feature/export.\n\n- [x] Build: verified at abc123; build, tests, and diff review passed. Root status: continuation-required; nextSkill=qs-git-merge.\n- [ ] Git: blocked by revoked push authorization.\n- [ ] Release: pending verified Git completion.\n\nStable weights: Build 60, Git 10, Release 30. Build advanced from the earlier observed 50% to verified 100%; overall progress is (60 × 100% + 10 × 0% + 30 × 0%) / 100 = 60%.\n\nThe matching goal is confirmed. No Git or deployment action is proposed until authorization is restored. Deployment version and health evidence remain missing; the goal is incomplete.",
  "requestedActions": [
    "Request renewed push authorization for origin/feature/export before advancing to qs-git-merge."
  ]
}