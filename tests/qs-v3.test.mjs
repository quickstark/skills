import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readFile, readdir, stat } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import {
  NEXT_SKILLS_BY_NAME,
  SKILLS,
  V3_CATALOG,
  V3_CORE_SKILLS,
  V3_INTERNAL_CAPABILITIES,
  V3_SKILL_DISPOSITIONS_BY_NAME,
  V3_SPECIALIST_SKILLS,
  validateV3CatalogModel,
} from "../scripts/qs-skill-catalog.mjs";
import {
  PUBLIC_COMMANDS,
  codexPublicSkillLiteral,
} from "../scripts/skill-collection-registry.mjs";
import {
  renderDocumentationOutputContract,
  renderSkillOutputContract,
} from "../scripts/sync-skill-output-contracts.mjs";
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
  assert.equal(validateV3CatalogModel(V3_CATALOG), true);
  assert.deepEqual(V3_CORE_SKILLS.map((skill) => skill.name), coreNames);
  assert.deepEqual(V3_SPECIALIST_SKILLS.map((skill) => skill.name), specialistNames);
  assert.deepEqual(SKILLS.map((skill) => skill.name), [...coreNames, ...specialistNames]);
  assert.deepEqual(SKILLS.map((skill) => skill.lifecycle.position), Array.from({ length: 19 }, (_, index) => (index + 1) * 10));
  assert.deepEqual(V3_INTERNAL_CAPABILITIES.map((item) => item.name), [
    "domain-modeling", "module-decomposition", "ticket-decomposition", "tdd-loop",
  ]);
});

test("qs-plan-spec owns specs and tickets without changing the fixed v2 inventory", async () => {
  const planner = V3_CORE_SKILLS.find((skill) => skill.name === "qs-plan-spec");
  const skill = await readFile(join(root, "skills", "engineering", "qs-plan-spec", "SKILL.md"), "utf8");
  const metadata = await readFile(join(root, "skills", "engineering", "qs-plan-spec", "agents", "openai.yaml"), "utf8");
  const documentation = await readFile(join(root, "docs", "engineering", "qs-plan-spec.md"), "utf8");

  assert.equal(planner?.displayName, "QS Plan: Specs & Tickets");
  assert.match(skill, /specification, dependency-aware tickets, or both/i);
  assert.match(skill, /Specification-only requests do not create tickets/i);
  assert.match(metadata, /display_name: "QS Plan: Specs & Tickets"/);
  assert.match(documentation, /same root command can produce a specification, dependency-aware tickets, or both/i);
  assert.equal(Object.keys(V3_SKILL_DISPOSITIONS_BY_NAME).length, 24);
  assert.equal(V3_SKILL_DISPOSITIONS_BY_NAME["qs-test-author"], undefined);
  assert.equal(V3_SKILL_DISPOSITIONS_BY_NAME["qs-test-verify"], undefined);
  assert.deepEqual(
    V3_INTERNAL_CAPABILITIES.find((capability) => capability.name === "ticket-decomposition")?.owners,
    ["qs-plan-spec"],
  );
});

test("all public Codex picker prompts expose invocation modes", async () => {
  for (const skill of PUBLIC_COMMANDS) {
    const path = skill.sourcePath ?? `skills/${skill.bucket}/${skill.name}`;
    const metadata = await readFile(join(root, path, "agents", "openai.yaml"), "utf8");
    const defaultPrompt = metadata.match(/^\s*default_prompt:\s*"([^"]+)"\s*$/m)?.[1];
    assert.ok(defaultPrompt, `${skill.name} omits its Codex default prompt`);
    assert.match(defaultPrompt, /effort=quick\|standard\|deep/);
    assert.match(defaultPrompt, /report=brief\|full/);
  }
});

test("generated packages are isolated, synchronized, and free of reporting runtime", async () => {
  const project = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
  const lock = JSON.parse(await readFile(join(root, "package-lock.json"), "utf8"));
  const manifests = await Promise.all([
    ".claude-plugin/plugin.json",
    "packages/qs-specialists/.claude-plugin/plugin.json",
    "packages/ps-skills/.claude-plugin/plugin.json",
    "codex/plugins/qs-skills/.codex-plugin/plugin.json",
    "codex/plugins/qs-specialists/.codex-plugin/plugin.json",
    "codex/plugins/ps-skills/.codex-plugin/plugin.json",
  ].map((path) => readFile(join(root, path), "utf8").then(JSON.parse)));

  assert.equal(lock.version, project.version);
  assert.equal(lock.packages[""].version, project.version);
  for (const manifest of manifests) assert.equal(manifest.version, project.version);
  assert.deepEqual(await directories(join(root, "codex", "plugins", "qs-skills", "skills")), [...coreNames].sort());
  assert.deepEqual(await directories(join(root, "codex", "plugins", "qs-specialists", "skills")), [...specialistNames].sort());
  await assert.rejects(stat(join(root, "codex", "plugins", "qs-specialists", "capabilities")), /ENOENT/);

  const expectedSupport = ["ps-skill-catalog.mjs", "qs-skill-catalog.mjs", "skill-collection-registry.mjs"];
  for (const packageRoot of [
    "codex/plugins/qs-skills", "codex/plugins/qs-specialists", "codex/plugins/ps-skills",
    "packages/qs-specialists", "packages/ps-skills",
  ]) {
    assert.deepEqual((await readdir(join(root, packageRoot, "scripts"))).sort(), expectedSupport);
  }
});

test("retired commands remain absent and internal capabilities remain non-command results", async () => {
  const promoted = new Set(SKILLS.map((skill) => skill.name));
  for (const name of retiredNames) assert.equal(promoted.has(name), false);
  for (const capability of V3_INTERNAL_CAPABILITIES) {
    const content = await readFile(join(root, "skills", "internal", `${capability.name}.md`), "utf8");
    assert.match(content, /Do not emit a separate status, result, or continuation/i);
    assert.doesNotMatch(content, /^---$/m);
  }
  assert.deepEqual(
    V3_INTERNAL_CAPABILITIES.find((capability) => capability.name === "tdd-loop")?.owners,
    ["qs-code-build"],
  );
});

test("all 32 completion contracts present direct chat results and apply clear writing", () => {
  for (const skill of PUBLIC_COMMANDS) {
    const contract = renderSkillOutputContract(skill);
    const documentation = renderDocumentationOutputContract(skill);

    assert.match(contract, /Present the result directly in chat/i);
    assert.match(contract, /internal clear-writing pass/i);
    assert.match(contract, /lead with the outcome/i);
    assert.match(contract, /Status: Complete \| Continuation required \| Input required \| Failed/);
    assert.match(contract, new RegExp(`Skills used: /${skill.name}\\b`));
    assert.doesNotMatch(contract, /qs-skill-readout|require-hosted|reports\.quickstark\.com|Create a small JSON|Readout:/i);
    assert.match(documentation, /directly in chat/i);
    assert.match(documentation, /internal clear-writing pass/i);
    assert.doesNotMatch(documentation, /hosted|producer credential|reports\.quickstark\.com/i);

    if (skill.name === "qs-deploy-release") {
      assert.match(contract, /release is terminal/i);
      assert.match(contract, /Next prompts: None/);
      assert.doesNotMatch(contract, /Preferred next prompt:/);
      continue;
    }

    assert.match(contract, /Preferred next prompt:.*fenced `text` block/i);
    assert.match(contract, /Alternative next prompts: two copy-ready prompts/i);
    assert.match(contract, /Put each in its own fenced `text` block/i);
    for (const route of [...skill.continuation.normal, ...skill.continuation.failure]) {
      assert.match(contract, new RegExp(`\\${codexPublicSkillLiteral(route.name)}\\b`));
    }
  }
});

test("eligible completion contracts expose catalog-owned same-session workflow prompts", () => {
  for (const name of ["qs-plan-spec", "qs-code-build", "qs-code-debug", "qs-review-code", "ps-hillclimb"]) {
    const command = PUBLIC_COMMANDS.find((item) => item.name === name);
    const contract = renderSkillOutputContract(command);
    assert.match(contract, /catalog-approved composite workflow/i, name);
    assert.match(contract, /separate public root/i, name);
    assert.match(contract, /stop on a non-complete result/i, name);
    assert.match(contract, /does not add mutation authority/i, name);
  }
});

test("Pi continuation literals are included in every non-terminal completion contract", () => {
  for (const command of PUBLIC_COMMANDS.filter((item) => item.name !== "qs-deploy-release")) {
    assert.match(renderSkillOutputContract(command), /Pi uses `\/skill:/, command.name);
  }
});

test("catalog continuation routes remain valid, ranked, and package-safe", () => {
  const names = new Set(PUBLIC_COMMANDS.map((command) => command.name));
  for (const command of PUBLIC_COMMANDS) {
    for (const routes of [command.continuation.normal, command.continuation.failure]) {
      assert.equal(routes.length, command.name === "qs-deploy-release" ? 0 : 3);
      assert.equal(new Set(routes.map((route) => route.name)).size, routes.length);
      for (const route of routes) {
        assert.ok(names.has(route.name));
        assert.notEqual(route.name, command.name);
      }
    }
    if (command.collectionId === "qs-skills") {
      assert.ok(command.continuation.normal.every((route) => route.name.startsWith("qs-")
        && PUBLIC_COMMANDS.find((candidate) => candidate.name === route.name)?.collectionId === "qs-skills"));
    }
  }

  for (const skill of SKILLS) {
    assert.deepEqual(
      NEXT_SKILLS_BY_NAME[skill.name].filter((route) => route.availability !== "failure").map((route) => route.name),
      skill.continuation.approvedSkills.slice(0, skill.name === "qs-deploy-release" ? 0 : 3),
    );
  }
});

test("canonical and generated skill files contain no retired or hosted-reporting references", async () => {
  const roots = [
    ...PUBLIC_COMMANDS.map((skill) => join(root, skill.sourcePath ?? `skills/${skill.bucket}/${skill.name}`)),
    join(root, "codex", "plugins", "qs-skills", "skills"),
    join(root, "codex", "plugins", "qs-specialists", "skills"),
    join(root, "codex", "plugins", "ps-skills", "skills"),
    join(root, "packages", "qs-specialists", "skills"),
    join(root, "packages", "ps-skills", "skills"),
  ];
  for (const path of roots) {
    for (const file of await filesRecursively(path)) {
      const content = await readFile(file, "utf8");
      for (const retired of retiredNames) assert.doesNotMatch(content, new RegExp(`\\b${retired}\\b`), `${file} references ${retired}`);
      assert.doesNotMatch(content, /qs-skill-readout|require-hosted|reports\.quickstark\.com|hosted readout/i, `${file} retains hosted reporting`);
    }
  }
});

test("public skill validation accepts direct-chat contracts and rejects automatic hops", async () => {
  assert.throws(() => validatePublicSkillText([
    "# Unsafe", "Once done, use /qs-review-code.", "## Completion report and next steps",
  ].join("\n"), "unsafe"), /automatic public-skill hop/i);
  assert.equal(await validateV3Skills(), true);
});

test("review and testing specialists retain their distinct boundaries", async () => {
  const review = await readFile(join(root, "skills", "engineering", "qs-review-code", "SKILL.md"), "utf8");
  const author = await readFile(join(root, "skills", "engineering", "qs-test-author", "SKILL.md"), "utf8");
  const verify = await readFile(join(root, "skills", "engineering", "qs-test-verify", "SKILL.md"), "utf8");
  assert.match(review, /action=review\|improve\|refactor/);
  assert.match(review, /Review is read-only/);
  assert.match(author, /must not change product behavior/i);
  assert.match(verify, /does not edit source, tests, snapshots, configuration, or expectations/i);
  assert.match(verify, /does not fix failures/i);
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
