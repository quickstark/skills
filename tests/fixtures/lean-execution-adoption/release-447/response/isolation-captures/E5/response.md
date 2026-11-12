{
  "response": "Stage: Build | Stage estimate: ~50% | Overall estimate: ~40% | blocked — P1 supplies the last explicit Build estimate; resumed evidence remains valid at abc123, but completed CSV and existing-screen checks are not supplied. Input needed: those check results and verification of authoritative matching-goal state.\n\nWeights remain Build 60, Git 10, Release 30. Overall: (60 × 50% + 10 × 100% + 30 × 0%) / 100 = 40%.\n\n- [ ] Build — blocked at 50%; implementation and review evidence retained.\n- [x] Git — verified; authoritative origin/feature/export=abc123.\n- [ ] Release — waiting at 0% verified progress; J42 is already queued for export:abc123, while staging /health serves the previous version.\n\nThe queued job does not establish successful delivery. Preserve J42 and avoid duplicate publication or deployment. The goal remains incomplete. No operations were performed.",
  "requestedActions": [
    {
      "action": "Verify supported goal-tool availability and inspect the matching goal with get_goal before stage execution; preserve unrelated goals and do not invent a token budget."
    },
    {
      "action": "Resolve the missing Build check outcomes for abc123, retaining valid implementation and review evidence."
    },
    {
      "action": "Inspect existing job J42 and staging health/version without requeuing deployment; require HTTP 200 and the exact version matching verified abc123 before marking Release or the goal complete."
    }
  ]
}