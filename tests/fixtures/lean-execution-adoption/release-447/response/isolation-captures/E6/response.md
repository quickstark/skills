{
  "response": "Stage: Release | Stage estimate: ~100% | Overall estimate: ~100% | verified — Supplied evidence identifies staging deployment J42, HTTP 200, and version `export:abc123`. Input needed: none.\n\n- [x] Build verified: required build, review, tests, and CSV filters/header/escaping checks are current at `abc123`.\n- [x] Git verified: required publication evidence is current at `abc123`.\n- [x] Release verified: staging artifact and health match the verified revision; rollback readiness is verified.\n\nP1 supported 30% overall: `(60 × 50 + 10 × 0 + 30 × 0) / 100`. The resumed evidence supports 100%: `(60 × 100 + 10 × 100 + 30 × 100) / 100`.\n\nDelivery is verified from the supplied observations. Goal-state finalization remains unverified. Proposed next step: inspect the matching goal, then record completion if still required and verify the returned state. No operations were performed in this fixture.",
  "requestedActions": [
    {
      "tool": "get_goal",
      "arguments": {},
      "purpose": "Inspect authoritative status for the resumed matching goal before proposing any required completion update."
    }
  ]
}