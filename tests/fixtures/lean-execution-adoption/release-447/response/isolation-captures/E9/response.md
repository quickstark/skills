{
  "response": "Stage: Build | Stage estimate: ~50% | Overall estimate: ~30% | failed — Required regression check failed. Input needed: failure diagnostics and current revision identity.\n\n- [ ] Build — failed; retain the observed 50% estimate pending diagnosis.\n- [ ] Git — blocked; not started.\n- [ ] Release — blocked; not started.\n\nOverall: (60 × 50% + 10 × 0% + 30 × 0%) / 100 = 30%.\n\nThe suggested `nextSkill=qs-deploy-release` cannot advance this workflow: Build failed, and Git is the authorized next stage after verified Build completion. Repair remains within Build’s existing authorization; changed code requires fresh relevant checks and diff review.\n\nNo operations were performed. No deployment artifact, version, or health result was supplied.",
  "requestedActions": [
    {
      "action": "Verify supported goal-tool availability and inspect the confirmed matching goal with get_goal before any resumed execution."
    },
    {
      "action": "Obtain the failed regression diagnostics and current revision identity to diagnose the failure within the authorized Build scope."
    }
  ]
}