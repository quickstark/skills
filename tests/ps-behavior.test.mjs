import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { runPsSafetyScenario } from "./helpers/ps-safety-harness.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const scenarios = JSON.parse(await readFile(join(root, "tests", "fixtures", "ps-safety-scenarios.json"), "utf8"));

const requiredScenarioIds = [
  "blast-executable-proof", "blast-unproven-claim",
  "runtime-diagnosis-only", "runtime-repair-required", "trace-sensitive-redaction",
  "verification-declared-directory", "verification-generic-directory", "verification-missing-harness",
  "verification-feature-map-drift", "verification-product-source-rejected",
  "eval-control-variant-isolation", "eval-without-history", "eval-selected-history",
  "eval-unselected-history-rejected", "eval-broad-history-rejected", "eval-failed-trial-visible",
  "hillclimb-improvement", "hillclimb-regression-rollback", "hillclimb-noisy-measurement",
  "hillclimb-exhausted-budget", "hillclimb-missing-baseline", "hillclimb-publication-rejected",
  "visual-baseline-hash-change", "visual-zero-tolerance-exact", "visual-within-tolerance",
  "visual-above-tolerance", "visual-missing-tolerance", "visual-missing-assets", "visual-environment-drift",
  "pr-inspect-only-rejects-push", "pr-authorized-repair-selected-branch",
  "pr-authorized-repair-cannot-merge", "pr-repair-branch-mismatch", "pr-wait-cancelled", "pr-wait-timeout",
  "cleanup-worktree-default", "cleanup-audit-before-delete", "cleanup-confirmation-binding",
  "cleanup-dirty-protection", "cleanup-unmerged-protection", "cleanup-unresolved-target",
  "cleanup-secondary-needs-separate-authorization", "cleanup-confirmed-removal-report",
];

const defaultRootSkillByKind = {
  "blast-radius": "ps-blast-radius",
  forensics: "ps-runtime-forensics",
  verification: "ps-create-verification-skill",
  evaluation: "ps-skill-eval",
  hillclimb: "ps-hillclimb",
  visual: "ps-visual-parity",
  pr: "ps-pr-babysit",
  cleanup: "ps-worktree-cleanup",
};

function rootSkillForScenario(scenario) {
  if (scenario.id.startsWith("trace-")) return "ps-trace-forensics";
  if (scenario.id === "verification-feature-map-drift") return "ps-maintain-verification-skill";
  return defaultRootSkillByKind[scenario.kind];
}

test("PS-18 covers the complete required deterministic safety scenario matrix", () => {
  assert.deepEqual(scenarios.map((scenario) => scenario.id), requiredScenarioIds);
  assert.equal(new Set(requiredScenarioIds).size, requiredScenarioIds.length);
});

for (const scenario of scenarios) {
  test(`PS-18 safety fixture: ${scenario.id}`, () => {
    const observed = runPsSafetyScenario(scenario);
    assert.equal(observed.completionState, scenario.expectedState);
    if (scenario.allowedMutations) assert.deepEqual(observed.allowedMutations, scenario.allowedMutations);

    const skill = rootSkillForScenario(scenario);
    assert.match(skill, /^ps-/);
    if (scenario.evidenceIncludes) assert.match(observed.evidence, new RegExp(scenario.evidenceIncludes.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    for (const excluded of scenario.evidenceExcludes ?? []) assert.doesNotMatch(observed.evidence, new RegExp(excluded.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.doesNotMatch(observed.evidence, /ghp_[A-Za-z0-9]+|\/Users\/[^/]+|\/home\/[^/]+/i);
  });
}
