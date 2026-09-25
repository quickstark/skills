- [ ] Active — Select the command using the supplied routing metadata and host catalog (weight: 100%).

Stage: Command selection | Stage estimate: ~0% | Overall estimate: ~0% | active — Applying the supplied qs-help guidance. Input needed: none.


Use `$qs-specialists:qs-deploy-prompt`. It authors an autonomous deployment prompt, and your supplied host catalog confirms it is available.

- [x] Verified — Command outcome and exact literal match the supplied routing metadata and host catalog.

Stage: Command selection | Stage estimate: ~100% | Overall estimate: ~100% | complete — Recommendation verified. Input needed: none.

Status: Complete  
Skills used: /qs-help (supplied guidance only)  
Outcome: Command selected; nothing executed or configured.

Next work prompt:

```text
$qs-specialists:qs-deploy-prompt Generate one copy-ready autonomous deployment prompt from my finished spec. Author the prompt only; do not execute it or create a goal. There is no tracker and no open PR. Report any missing material prerequisites without inventing project evidence or authorization.
```