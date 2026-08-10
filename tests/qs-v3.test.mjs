import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readFile, readdir, stat } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import {
  READOUT_PROFILES_BY_NAME,
  SKILLS,
  V3_CORE_SKILLS,
  V3_INTERNAL_CAPABILITIES,
  V3_SKILL_DISPOSITIONS_BY_NAME,
  V3_SPECIALIST_SKILLS,
} from "../scripts/qs-skill-catalog.mjs";
import { normalizeSkillReadout, renderSkillReadout } from "../scripts/qs-skill-readout.mjs";
import { renderSkillOutputContract } from "../scripts/sync-skill-output-contracts.mjs";
import { validatePublicSkillText, validateV3Skills } from "../scripts/validate-v3-skills.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const execFileAsync = promisify(execFile);
const coreNames = [
  "qs-help", "qs-setup", "qs-plan-clarify", "qs-plan-roadmap", "qs-plan-spec",
  "qs-code-build", "qs-code-debug", "qs-review-code", "qs-git-merge",
  "qs-deploy-release", "qs-flow-triage", "qs-flow-handoff",
];
const specialistNames = [
  "qs-plan-research", "qs-design-prototype", "qs-code-document", "qs-test-author",
  "qs-test-verify", "qs-learn-teach", "qs-skill-write",
];
const retiredNames = [
  "qs-plan-explore", "qs-plan-interview", "qs-plan-tickets", "qs-design-domain",
  "qs-design-modules", "qs-design-architecture", "qs-test-tdd",
];

async function directories(path) {
  return (await readdir(path, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

async function filesRecursively(path) {
  const entries = await readdir(path, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = join(path, entry.name);

    if (entry.isDirectory()) files.push(...await filesRecursively(entryPath));
    else if (entry.isFile()) files.push(entryPath);
  }

  return files;
}

test("v3 exposes the exact ordered core and specialist command surfaces", () => {
  assert.deepEqual(V3_CORE_SKILLS.map((skill) => skill.name), coreNames);
  assert.deepEqual(V3_SPECIALIST_SKILLS.map((skill) => skill.name), specialistNames);
  assert.deepEqual(SKILLS.map((skill) => skill.name), [...coreNames, ...specialistNames]);
  assert.deepEqual(SKILLS.map((skill) => skill.lifecycle.position), Array.from({ length: 19 }, (_, index) => (index + 1) * 10));
  assert.deepEqual(V3_INTERNAL_CAPABILITIES.map((item) => item.name), [
    "domain-modeling", "module-decomposition", "ticket-decomposition", "tdd-loop",
  ]);
});

test("generated core and specialist packages are isolated and versioned together", async () => {
  const project = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
  const lock = JSON.parse(await readFile(join(root, "package-lock.json"), "utf8"));
  const claude = JSON.parse(await readFile(join(root, ".claude-plugin", "plugin.json"), "utf8"));
  const claudeSpecialists = JSON.parse(await readFile(join(root, "packages", "qs-specialists", ".claude-plugin", "plugin.json"), "utf8"));
  const codexCore = JSON.parse(await readFile(join(root, "codex", "plugins", "qs-skills", ".codex-plugin", "plugin.json"), "utf8"));
  const codexSpecialists = JSON.parse(await readFile(join(root, "codex", "plugins", "qs-specialists", ".codex-plugin", "plugin.json"), "utf8"));

  assert.equal(project.version, "3.1.0");
  assert.equal(lock.version, project.version);
  assert.equal(lock.packages[""].version, project.version);
  for (const manifest of [claude, claudeSpecialists, codexCore, codexSpecialists]) assert.equal(manifest.version, project.version);
  assert.deepEqual(await directories(join(root, "codex", "plugins", "qs-skills", "skills")), [...coreNames].sort());
  assert.deepEqual(await directories(join(root, "codex", "plugins", "qs-specialists", "skills")), [...specialistNames].sort());
  assert.deepEqual(await directories(join(root, "packages", "qs-specialists", "skills")), [...specialistNames].sort());
  await assert.rejects(stat(join(root, "codex", "plugins", "qs-specialists", "capabilities")), /ENOENT/);
});

test("retired commands are absent and all four internal capabilities are non-command files", async () => {
  const promoted = new Set(SKILLS.map((skill) => skill.name));
  for (const name of retiredNames) assert.equal(promoted.has(name), false);
  for (const capability of V3_INTERNAL_CAPABILITIES) {
    const path = join(root, "skills", "internal", `${capability.name}.md`);
    assert.match(await readFile(path, "utf8"), /Do not emit a separate status, readout, or continuation/i);
  }
});

test("normalized v3 results enforce modes, completion, and deterministic continuation", () => {
  const complete = normalizeSkillReadout({
    skill: "qs-code-build",
    completionState: "complete",
    outcome: "Implemented the selected change.",
  });
  assert.equal(complete.effort, "standard");
  assert.equal(complete.report, "brief");
  assert.equal(complete.completionState, "complete");
  assert.deepEqual(complete.nextSkills, []);

  const continuation = normalizeSkillReadout({
    skill: "qs-code-build",
    status: "Completed",
    completionState: "continuation-required",
    effort: "deep",
    report: "full",
    outcome: "Implementation is ready for an independent review.",
  });
  assert.equal(continuation.nextSkills.length, 1);
  assert.equal(continuation.nextSkills[0].name, "qs-review-code");
  assert.equal(continuation.effort, "deep");
  assert.equal(continuation.report, "full");

  assert.throws(() => normalizeSkillReadout({
    skill: "qs-review-code",
    completionState: "complete",
    outcome: "Unsafe completion.",
    findings: [{ title: "Critical", priority: "P1" }],
  }), /prohibit a complete result/i);
  assert.throws(() => normalizeSkillReadout({
    skill: "qs-code-build",
    outcome: "Too many continuations.",
    completionState: "continuation-required",
    nextSkills: ["qs-review-code", "qs-review-code"],
  }), /at most one/i);
});

test("all active commands default to v3 and emit only their current deterministic prompt", () => {
  for (const skill of SKILLS) {
    const complete = normalizeSkillReadout({
      skill: skill.name,
      outcome: `Completed the bounded ${skill.name} result.`,
    });

    assert.equal(complete.report, "brief", `${skill.name} must default to the v3 brief report`);
    assert.equal(complete.completionState, "complete", `${skill.name} must default to v3 completion`);
    assert.deepEqual(complete.nextSkills, [], `${skill.name} must not manufacture follow-on work`);

    for (const [status, completionState] of [
      ["Completed", "continuation-required"],
      ["Awaiting input", "input-required"],
    ]) {
      const result = normalizeSkillReadout({
        skill: skill.name,
        status,
        completionState,
        outcome: `The bounded ${skill.name} result requires its approved continuation.`,
      });
      const approved = skill.continuation.approvedSkills[0];
      const target = SKILLS.find((candidate) => candidate.name === approved);
      const literal = `$${target.distribution === "core" ? "qs-skills" : "qs-specialists"}:${approved}`;

      assert.equal(result.nextSkills.length, 1, `${skill.name} must emit exactly one prompt`);
      assert.equal(result.nextSkills[0].name, approved, `${skill.name} must use its catalog route`);
      assert.match(
        result.nextSkills[0].prompt,
        new RegExp(`^Use \\${literal}\\b`),
        `${skill.name} must emit the exact package-qualified Codex invocation`,
      );
      assert.doesNotMatch(
        result.nextSkills[0].prompt,
        new RegExp(`^Use \\$${approved}\\b`),
        `${skill.name} must not emit an unqualified Codex invocation`,
      );
      for (const retired of retiredNames) {
        assert.doesNotMatch(
          result.nextSkills[0].prompt,
          new RegExp(`[$/]${retired}\\b`),
          `${skill.name} must not recommend retired ${retired}`,
        );
      }
    }
  }
});

test("all active completion contracts present exact continuations as unfenced chat text", async () => {
  for (const skill of SKILLS) {
    const approved = skill.continuation.approvedSkills[0];
    const target = SKILLS.find((candidate) => candidate.name === approved);
    const literal = `$${target.distribution === "core" ? "qs-skills" : "qs-specialists"}:${approved}`;
    const contract = renderSkillOutputContract(skill);

    assert.match(contract, /plain Markdown paragraph/i, `${skill.name} must request ordinary chat text`);
    assert.match(contract, new RegExp(`\\${literal}\\b`), `${skill.name} must cite the exact Codex literal`);
    assert.doesNotMatch(contract, /```text|fenced copy-ready prompt|own fenced `text` block/i);
  }

  for (const path of [
    join(root, "docs", "skill-run-contract.md"),
    join(root, "CONTEXT.md"),
    join(root, "skills", "productivity", "qs-skill-write", "GLOSSARY.md"),
  ]) {
    const content = await readFile(path, "utf8");

    assert.match(content, /plain Markdown paragraph/i, `${path} must document unfenced chat prompts`);
    assert.doesNotMatch(content, /prominent fenced code block|own fenced `text` block/i);
  }
});

test("active canonical and generated skill files contain no retired public command references", async () => {
  const roots = [
    ...SKILLS.map((skill) => join(root, "skills", skill.bucket, skill.name)),
    join(root, "codex", "plugins", "qs-skills", "skills"),
    join(root, "codex", "plugins", "qs-specialists", "skills"),
    join(root, "packages", "qs-specialists", "skills"),
  ];

  for (const path of roots) {
    for (const file of await filesRecursively(path)) {
      const content = await readFile(file, "utf8");

      for (const retired of retiredNames) {
        assert.doesNotMatch(content, new RegExp(`\\b${retired}\\b`), `${file} references ${retired}`);
      }
    }
  }
});

test("brief and full reports project different evidence from the same result", () => {
  const input = {
    skill: "qs-review-code",
    status: "Completed",
    completionState: "complete",
    outcome: "Reviewed the selected module.",
    findings: [1, 2, 3, 4].map((number) => ({ title: `Finding ${number}` })),
  };
  const brief = renderSkillReadout({ ...input, report: "brief" });
  const full = renderSkillReadout({ ...input, report: "full" });
  assert.doesNotMatch(brief, /Finding 4/);
  assert.match(full, /Finding 4/);
  assert.doesNotMatch(brief, /Execution context/);
  assert.match(full, /Execution context/);
  assert.doesNotMatch(brief, /<pre class="next-prompt-block">/);
});

test("public skill validation rejects automatic public hops and accepts the repository", async () => {
  assert.throws(() => validatePublicSkillText([
    "# Unsafe", "Once done, use /qs-review-code.", "## Completion report and next steps",
  ].join("\n"), "unsafe"), /automatic public-skill hop/i);
  assert.equal(await validateV3Skills(), true);
});

test("review owns safe first-class refactoring without authorizing whole-codebase mutation", async () => {
  const skill = await readFile(join(root, "skills", "engineering", "qs-review-code", "SKILL.md"), "utf8");
  assert.match(skill, /action=review\|improve\|refactor/);
  assert.match(skill, /characterization tests/i);
  assert.match(skill, /whole codebase.*does not authorize broad edits/i);
  assert.match(skill, /input-required/i);
});

test("testing specialists separate test mutation from read-only verification while TDD stays internal", async () => {
  const author = await readFile(
    join(root, "skills", "engineering", "qs-test-author", "SKILL.md"),
    "utf8",
  );
  const verify = await readFile(
    join(root, "skills", "engineering", "qs-test-verify", "SKILL.md"),
    "utf8",
  );

  assert.match(author, /already-established behavior/i);
  assert.match(author, /must not change product behavior/i);
  assert.match(author, /production testability seam/i);
  assert.match(author, /\/qs-code-build/);

  assert.match(verify, /verification matrix/i);
  assert.match(verify, /does not edit source, tests, snapshots, configuration, or expectations/i);
  assert.match(verify, /does not fix failures/i);
  assert.match(verify, /\/qs-code-debug/);

  assert.equal(SKILLS.some((skill) => skill.name === "qs-test-tdd"), false);
  assert.equal(Object.keys(V3_SKILL_DISPOSITIONS_BY_NAME).length, 24);
  assert.equal(V3_SKILL_DISPOSITIONS_BY_NAME["qs-test-author"], undefined);
  assert.equal(V3_SKILL_DISPOSITIONS_BY_NAME["qs-test-verify"], undefined);
  assert.equal(READOUT_PROFILES_BY_NAME["qs-test-author"].title, "Test coverage change");
  assert.equal(READOUT_PROFILES_BY_NAME["qs-test-verify"].title, "Verification matrix");
  assert.equal(
    V3_SPECIALIST_SKILLS.find((skill) => skill.name === "qs-test-author")?.invocationPolicy,
    "explicit",
  );
  assert.equal(
    V3_SPECIALIST_SKILLS.find((skill) => skill.name === "qs-test-verify")?.invocationPolicy,
    "explicit",
  );
  assert.deepEqual(
    V3_SPECIALIST_SKILLS.find((skill) => skill.name === "qs-test-author")?.continuation.approvedSkills,
    ["qs-code-build"],
  );
  assert.deepEqual(
    V3_SPECIALIST_SKILLS.find((skill) => skill.name === "qs-test-verify")?.continuation.approvedSkills,
    ["qs-code-debug"],
  );
  const authorReadout = normalizeSkillReadout({
    skill: "qs-test-author",
    outcome: "Added focused tests for established behavior.",
  });
  assert.equal(authorReadout.completionState, "complete");
  assert.deepEqual(authorReadout.nextSkills, []);

  const verifyContinuation = normalizeSkillReadout({
    skill: "qs-test-verify",
    status: "Completed",
    completionState: "continuation-required",
    outcome: "Observed a reproducible verification failure.",
  });
  assert.equal(verifyContinuation.nextSkills[0].name, "qs-code-debug");
  assert.deepEqual(
    V3_INTERNAL_CAPABILITIES.find((capability) => capability.name === "tdd-loop")?.owners,
    ["qs-code-build"],
  );
});

test("migration documentation accounts for every v2 command exactly once", async () => {
  const migration = await readFile(join(root, "docs", "quickstark-v3-migration.md"), "utf8");
  const rows = migration.split("\n").filter((line) => /^\| `qs-[^`]+` \|/.test(line));
  assert.equal(rows.length, 24);
  assert.equal(new Set(rows.map((line) => line.match(/`(qs-[^`]+)`/)[1])).size, 24);
});

test("package projections are deterministic and synchronized", async () => {
  const { stdout } = await execFileAsync(process.execPath, ["scripts/sync-codex-plugin.mjs", "--check"], { cwd: root });
  assert.match(stdout, /Verified deterministic QuickStark v3/);
});
