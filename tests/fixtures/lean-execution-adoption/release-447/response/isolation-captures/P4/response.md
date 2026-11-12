{
  "response": "Stage: Release | Stage estimate: ~50% | Overall estimate: ~85% | waiting — Supplied resumption evidence remains valid at the unchanged revision. Job J42 remains live with no new progress. Input needed: none currently.\n\n- [x] Build — verified 100%; weight 60.\n- [x] Git — verified 100%; weight 10.\n- [ ] Release — waiting at 50%; weight 30.\n\nOverall: (60 × 100% + 10 × 100% + 30 × 50%) / 100 = 85%. Preserve these weights and estimates.\n\nProposed action: verify supported goal tools and inspect the authoritative goal state before further stage execution, then monitor existing job J42 without restarting deployment. Goal state, deployed version, and health results remain unobserved; the goal is incomplete.",
  "requestedActions": [
    "Verify goal-tool availability and inspect the existing goal with get_goal. Require input if support is unavailable or an unrelated goal is active.",
    "Read the authoritative status of existing job J42 without restarting or duplicating deployment."
  ]
}