import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  normalizeSkillReadout,
  renderSkillReadout,
  writeSkillReadout,
} from "../scripts/qs-skill-readout.mjs";

function resultInput(skill) {
  return {
    skill,
    completionState: "complete",
    outcome: `Completed the bounded ${skill} result.`,
    generatedAt: "2026-08-19T18:00:00.000Z",
    reportId: "11111111-2222-4333-8444-555555555555",
  };
}

test("PS-07 normalizes PS as a native collection with exact package literals", () => {
  const report = normalizeSkillReadout(resultInput("ps-how"));

  assert.equal(report.collection, "quickstark/ps-skills");
  assert.equal(report.skill.collectionId, "ps-skills");
  assert.deepEqual(report.skillsUsed, ["ps-how"]);
  assert.deepEqual(report.nextSkills.map((item) => item.name), [
    "ps-blast-radius", "qs-plan-spec", "ps-why",
  ]);
  assert.match(report.nextSkills[0].prompt, /^Use \$ps-skills:ps-blast-radius\b/);
  assert.match(report.nextSkills[1].prompt, /^Use \$qs-skills:qs-plan-spec\b/);
  assert.throws(
    () => normalizeSkillReadout({ ...resultInput("ps-how"), collection: "quickstark/qs-skills" }),
    /does not match.*native collection/i,
  );
});

test("PS-07 preserves distinct native collection identity for core and specialists", () => {
  assert.equal(normalizeSkillReadout(resultInput("qs-help")).collection, "quickstark/qs-skills");
  assert.equal(
    normalizeSkillReadout(resultInput("qs-plan-research")).collection,
    "quickstark/qs-specialists",
  );
  assert.equal(normalizeSkillReadout(resultInput("ps-how")).collection, "quickstark/ps-skills");
});

test("PS-07 renders and writes PS readouts with native metadata and collision-safe names", async (context) => {
  const directory = await mkdtemp(join(tmpdir(), "ps-readout-test-"));
  context.after(() => rm(directory, { recursive: true, force: true }));

  const html = renderSkillReadout(resultInput("ps-how"));
  assert.match(html, /<meta name="quickstark:skill-collection" content="quickstark\/ps-skills">/);
  assert.match(html, /<h1>PS How<\/h1>/);
  assert.match(html, /Use \$ps-skills:ps-blast-radius/);

  const written = await writeSkillReadout(resultInput("ps-how"), {
    directory,
    projectIdentity: {
      key: "workspace/pstack-tests",
      label: "pstack-tests",
      source: "workspace",
    },
  });
  assert.match(written.filename, /^ps-how--/);
  assert.equal(written.collection, "quickstark/ps-skills");
  assert.match(await readFile(written.path, "utf8"), /quickstark\/ps-skills/);
});

test("PS-10 redacts sensitive forensic evidence before normalization and rendering", () => {
  const credential = `ghp_${"a".repeat(40)}`;
  const privatePath = "/home/alice/private/run.json";
  const windowsPrivatePath = "C:\\Users\\alice\\private\\run.json";
  const input = {
    skill: "ps-trace-forensics",
    completionState: "complete",
    report: "full",
    outcome: `Diagnosed ${credential} from ${privatePath}.`,
    findings: [{ title: `Trace ${credential}`, detail: `Observed ${privatePath} and ${windowsPrivatePath}.` }],
    checks: [{ title: "Trace inspected", detail: `Source ${privatePath} contained ${credential}.`, status: "passed" }],
  };

  const normalized = normalizeSkillReadout(input);
  const serialized = JSON.stringify(normalized);
  const html = renderSkillReadout(input);

  for (const value of [credential, privatePath, windowsPrivatePath]) {
    assert.doesNotMatch(serialized, new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.doesNotMatch(html, new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(serialized, /\[redacted credential\]/);
  assert.match(serialized, /\[redacted path\]/);
});

test("PS-18 requires substantive command-specific evidence before high-risk completion", () => {
  assert.throws(() => normalizeSkillReadout({
    skill: "ps-visual-parity",
    completionState: "complete",
    outcome: "Claimed parity without a comparison.",
    checks: [{ title: "No comparison ran", status: "info" }],
  }), /substantive completion evidence/i);

  assert.throws(() => normalizeSkillReadout({
    skill: "ps-visual-parity",
    completionState: "complete",
    outcome: "Claimed parity without measured comparison fields.",
    checks: [{ title: "Comparison", detail: "Looks close.", status: "passed" }],
  }), /metric.*tolerance.*residual/i);

  assert.throws(() => normalizeSkillReadout({
    skill: "ps-visual-parity",
    completionState: "complete",
    outcome: "Claimed parity with empty comparison fields.",
    checks: [{ title: "Comparison", detail: "metric=; tolerance=; residual=", status: "passed" }],
  }), /metric.*tolerance.*residual/i);

  assert.doesNotThrow(() => normalizeSkillReadout({
    skill: "ps-visual-parity",
    completionState: "complete",
    outcome: "Measured parity is within the declared tolerance.",
    checks: [{ title: "Visual comparison", detail: "metric=pixel-diff; tolerance=0; residual=0", status: "passed" }],
  }));

  assert.throws(() => normalizeSkillReadout({
    skill: "ps-worktree-cleanup",
    completionState: "complete",
    outcome: "Claimed cleanup without an audit check.",
    decisions: [{ title: "No cleanup audit", detail: "Arbitrary placeholder." }],
  }), /substantive completion evidence/i);

  assert.doesNotThrow(() => normalizeSkillReadout({
    skill: "ps-worktree-cleanup",
    completionState: "complete",
    outcome: "Completed the audited exact-target cleanup.",
    checks: [{ title: "Read-only audit", detail: "Exact targets were resolved and found safe.", status: "passed" }],
    decisions: [{ title: "Confirmed targets", detail: "Removed only the separately confirmed exact target list." }],
  }));
});
