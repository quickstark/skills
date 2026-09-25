# Target activation rehearsal

The separate `/tmp/qs-target-activation-probe-20260925` checkout started at d4ae73ebd9bab390f50e8e3483e5b4626864a21c. Its registry was switched to target only in that checkout; canonical final-newline and required ignored transcript fixes from 5bcf302 were applied as working overlays. The active repository registry remained legacy.

Target synchronization and package verification passed for six packages and38 public roots. The full test suite passed439 of455 tests, with16 failures retained in the log. Test repair and identified metadata defects are subsequent work, not retroactive passing grades. Initial test attempts stopped in Git preflight: the temporary clone had a local-path origin and lacked a local main branch. Correcting only its origin identity and adding main at the verified baseline allowed actual tests; neither failure was a network/authentication issue.

Actual isolated Codex plugin installation plus `skills/list`, and Pi `get_commands`, observed all38 intended public commands, including dedicated prompt building, visual parity and video. No model turn/request was sent. Codex's actual names include the package namespace; the initial oracle incorrectly expected bare names and failed. Its raw response and original script remain archived; the corrected oracle checks exact package-qualified names and enabled flags. Pi reports the bare skill names with its native invocation prefix.

This is discovery evidence for the rehearsal, not final revision-bound release acceptance or actual-machine migration. The rehearsal source can receive subsequent reviewed fixes, so fresh final-artifact discovery remains required. Temporary homes are retained as evidence; no user's package configuration was changed.

## Reviewed repairs

Parent reviewed nine state-aware test repairs and fixed six missing picker-mode prompts, retaining independent expected membership and mode assertions. A subsequent full sync/check/test sequence passed in both states:456 tests,456 passes,zero failures/skips each. Current video report clarification and provenance digest were copied into the target rehearsal before that run. Logs and exact repaired-source hashes are retained in `evidence/repair-bindings.json`; the original439/455 result remains unchanged. This establishes integration of the reviewed candidate, not behavioral adoption or release readiness.
