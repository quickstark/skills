{
  "response": "Stage: Build | Stage estimate: ~50% | Overall estimate: ~30% | active — Process 81 remains live. Last observed output was `124/180 tests passed`, 70 seconds ago. No new progress is verified; retain the milestone-supported estimates. Input needed: none.\n\n- [ ] Build — active, ~50%; required verification remains incomplete.\n- [ ] Git — pending, 0%; depends on verified Build completion.\n- [ ] Release — pending, 0%; depends on verified Git completion.\n\nStable effort weights: Build 60, Git 10, Release 30. Overall = (60 × 50% + 10 × 0% + 30 × 0%) / 100 = 30%. Process liveness and elapsed time add no progress credit.",
  "requestedActions": [
    "Check process 81 for new output and current status using a bounded observation.",
    "If it remains silent, inspect relevant test-runner activity and wait state to distinguish ongoing work from a stall before proposing recovery."
  ]
}