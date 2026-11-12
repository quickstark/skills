{
  "response": "Stage: Build | Stage estimate: ~50% | Overall estimate: ~30% | waiting — Process 81 remains authoritatively live after 70 seconds without new output. No new evidence supports increasing progress. Input needed: none.\n\n- [ ] Build — active, waiting; weight 60, estimate 50%.\n- [ ] Git — pending; weight 10, estimate 0%.\n- [ ] Release — pending; weight 30, estimate 0%.\n\nOverall: (60 × 50% + 10 × 0% + 30 × 0%) / 100 = 30%. Weights and valid revision evidence remain unchanged.\n\nProposed next action: verify supported goal tools and inspect goal state with `get_goal`. After confirming a matching goal, check process 81 for status and new output with a bounded wait of at most 60 seconds. Keep dependent stages pending.",
  "requestedActions": [
    "Verify goal-tool availability and inspect goal state with get_goal before further stage execution; preserve any unrelated active goal.",
    "Conditional on confirming the matching goal, poll existing process 81 for status and new output with a wait bounded to 60 seconds."
  ]
}