# Gates: Stage and estimated percentage reporting

OWNS: scripts/progress-reporting-contract.mjs, scripts/sync-skill-output-contracts.mjs, scripts/goal-workflow.mjs, skills/**, docs/**, tests/**, codex/plugins/**, packages/**, pi/packages/**, GATES.md

Scope: Implement the in-chat AC1–AC8 specification across canonical skill instructions and generated workflow prompts; finish with verified local changes only.

Mode: Solo implementation with two bounded behavioral trial leaves coordinated in ignored `.unlazy/stage-percent/`. Specification weight 15%; build/review/verification weight 85%. No publication or installed-plugin mutation.

- [x] G1: Canonical contracts and all package projections are synchronized (AC1, AC2, AC6, AC7).
  CHECK: npm run check:codex
  EXPECT: Verified
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/github/skills; path=8668fd0886c5/13 entries; output=Verified bounded v3 output contracts for all 33 public commands. | Verified deterministic QuickStark v3 core, specialist, and PS projections for Codex, Claude, and Pi.

- [x] G2: Required regression suite passes, including coverage, preservation, prompt integrity, and current recorded trial evidence (AC1–AC7).
  CHECK: npm test
  EXPECT: /# fail 0|ℹ fail 0/
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/github/skills; path=8668fd0886c5/13 entries; output=ℹ todo 0 | ℹ duration_ms 1079.75024

- [x] G3: Final tracked diff has no whitespace errors (AC8).
  CHECK: git diff --check && node -e "console.log('DIFF_WHITESPACE_OK')"
  EXPECT: DIFF_WHITESPACE_OK
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/github/skills; path=8668fd0886c5/13 entries; output=DIFF_WHITESPACE_OK

- [x] G4: Actual fresh model responses demonstrate AC2–AC6 and preserve prior authority and release cases; historical records remain intact.
  EVIDENCE: Parent read all six generation-percentage.json and nineteen execution-percentage.json responses independently. G1/G2/G5 include self-contained estimates and generation-only completion; G3/G4/G6 withhold execution prompts for missing inputs. E1–E9 preserve live polling, stale-check reopening, authorization, resumption and healthy-release boundaries. P1–P10 demonstrate weighted math, waiting, decreases, skip semantics, preserved 85% on resumption, 95% cap, standalone scope and parent-only helper evidence. Both leaf integrity gates were re-executed by the parent with /bin/sh, CWD /github/skills, exit 0 and TRIAL_INTEGRITY_OK. Historical fixture files compare byte-for-byte with HEAD. After the wording-only helper correction, P10 was freshly rerun and independently reviewed; other scenario responses and their inputs remained unchanged. Controlled response trials are not real deployment/timing measurements.

- [x] G5: Final expert review and defect-hunting pass verify AC1–AC8 against actual changes, package/version preservation, scope, and evidence limitations.
  EVIDENCE: Final independent source audit returned FINAL_SCOPE_AND_PRESERVATION_OK: 33 public + 19 standalone skills and 20 internal references contain their complete contracts; rendered goal prompts embed the estimator. All unmanaged canonical bytes, historical trials, versions (3.7.1), and nine package manifests equal HEAD. A deliberately changed unmanaged prefix was rejected as a negative control. Reviewed the three source modules, canonical deployment instructions, docs and test diffs; no unrelated or authority changes remain. The full suite passed after preserving the first trial record, fixing ambiguous helper wording without weakening delegation checks, rerunning P10, and rechecking both its evidence and unchanged remaining scenarios. Source/projection, regression and diff gates G1–G3 passed at this final state. Fresh responses cover 25 scenarios; their controlled-fixture and host-cadence limits are documented. No actionable P0/P1 finding or unfulfilled AC1–AC8 criterion remains.

- [x] G6: Conditional Claude validation is run for all three package roots when available, or its unavailability is established and reported.
  EVIDENCE: Node spawnSync('claude', ['--version']) returned ENOENT (CLAUDE_UNAVAILABLE). All three conditional CLI validations are skipped, not passed; source/projection checks cover the package outputs independently.
