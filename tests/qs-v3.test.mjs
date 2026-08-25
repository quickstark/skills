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
  SKILL_COLLECTIONS,
  SPEC_PROGRESS_COMMAND_NAMES,
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

test("Codex projections keep explicit commands visible without weakening other harness policies", async () => {
  const explicitCommands = PUBLIC_COMMANDS.filter(
    (command) => command.userInvoked || command.disableModelInvocation,
  );
  assert.equal(explicitCommands.length, 26);

  for (const command of explicitCommands) {
    const sourcePath = command.sourcePath ?? `skills/${command.bucket}/${command.name}`;
    const sourceMetadata = await readFile(join(root, sourcePath, "agents", "openai.yaml"), "utf8");
    assert.match(sourceMetadata, /^policy:\s*\n\s+allow_implicit_invocation:\s*false\s*$/m);

    const collection = SKILL_COLLECTIONS.find((candidate) => candidate.id === command.collectionId);
    assert.ok(collection, `${command.name} is missing its collection`);
    const codexMetadata = await readFile(
      join(root, collection.codexPackageRoot, "skills", command.name, "agents", "openai.yaml"),
      "utf8",
    );
    assert.doesNotMatch(codexMetadata, /allow_implicit_invocation/);
    assert.doesNotMatch(codexMetadata, /^policy:\s*$/m);

    const piMetadata = await readFile(
      join(root, collection.piPackageRoot, "skills", command.name, "agents", "openai.yaml"),
      "utf8",
    );
    assert.match(piMetadata, /^policy:\s*\n\s+allow_implicit_invocation:\s*false\s*$/m);

    if (collection.claudePackageRoot !== ".") {
      const claudeMetadata = await readFile(
        join(root, collection.claudePackageRoot, "skills", command.name, "agents", "openai.yaml"),
        "utf8",
      );
      assert.match(claudeMetadata, /^policy:\s*\n\s+allow_implicit_invocation:\s*false\s*$/m);
    }
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

    assert.match(contract, /Next work prompt:.*fenced `text` block/i);
    assert.match(contract, /one fenced `text` block/i);
    for (const route of [...skill.continuation.normal, ...skill.continuation.failure]) {
      assert.match(contract, new RegExp(`\\${codexPublicSkillLiteral(route.name)}\\b`));
    }
  }
});

test("completion contract avoids circular prompts", () => {
  for (const command of PUBLIC_COMMANDS) {
    const contract = renderSkillOutputContract(command);
    if (command.name === "qs-deploy-release") continue;

    assert.equal(command.continuation.maximumPrompts, 1, command.name);
    assert.equal(command.continuation.defaultPrompts, 0, command.name);
    assert.match(contract, /at most one copy-ready next-work prompt/i, command.name);
    assert.match(contract, /omit the prompt when.*complete.*no verified remaining work/i, command.name);
    assert.match(contract, /do not recommend.*already completed.*without new evidence/i, command.name);
    assert.doesNotMatch(contract, /Alternative next prompt|exactly three|all three prompts/i, command.name);
  }

  for (const name of ["qs-code-build", "qs-code-debug", "qs-review-code"]) {
    const command = PUBLIC_COMMANDS.find((item) => item.name === name);
    const contract = renderSkillOutputContract(command);
    assert.doesNotMatch(contract, /catalog-approved composite workflow/i, name);
    assert.match(contract, /exact verified ticket, specification, issue, or grouped work item/i, name);
  }
});

test("execution skills finish authorized code work", async () => {
  const read = (name) => readFile(join(root, "skills", "engineering", name, "SKILL.md"), "utf8");
  const [build, debug, review] = await Promise.all([
    read("qs-code-build"), read("qs-code-debug"), read("qs-review-code"),
  ]);

  assert.match(build, /finish every in-scope acceptance requirement/i);
  assert.match(build, /review and repair the resulting diff inside this root/i);
  assert.match(debug, /diagnosis, repair, regression coverage, and validation are one owned outcome/i);
  assert.match(debug, /do not stop after identifying the cause/i);
  assert.match(review, /clear natural-language mutation intent/i);
  assert.match(review, /resolve every in-scope actionable finding/i);
  for (const [name, source] of [["build", build], ["debug", debug], ["review", review]]) {
    assert.match(source, /Do not return `continuation-required` merely to ask another public skill/i, name);
  }
});

test("applicable engineering results link governing specs and summarize verified work", () => {
  const expected = [
    "qs-plan-clarify", "qs-plan-roadmap", "qs-plan-spec", "qs-code-build",
    "qs-code-debug", "qs-review-code", "qs-git-merge", "qs-deploy-release",
    "qs-flow-triage", "qs-flow-handoff", "qs-plan-research", "qs-design-prototype",
    "qs-code-document", "qs-test-author", "qs-test-verify", "qs-skill-write",
    "ps-blast-radius", "ps-runtime-forensics", "ps-trace-forensics",
    "ps-create-verification-skill", "ps-maintain-verification-skill",
    "ps-skill-eval", "ps-hillclimb", "ps-visual-parity", "ps-pr-babysit",
    "ps-worktree-cleanup",
  ];
  assert.deepEqual(SPEC_PROGRESS_COMMAND_NAMES, expected);

  for (const command of PUBLIC_COMMANDS) {
    const contract = renderSkillOutputContract(command);
    const documentation = renderDocumentationOutputContract(command);
    if (expected.includes(command.name)) {
      assert.equal(command.resultContext.specProgress, true, command.name);
      assert.match(contract, /^Specs: /m, command.name);
      assert.match(contract, /^Work summary: /m, command.name);
      assert.match(contract, /clickable Markdown links/i, command.name);
      assert.match(contract, /Not located/i, command.name);
      assert.match(contract, /highest-priority verified/i, command.name);
      assert.match(documentation, /governing specification/i, command.name);
      assert.match(documentation, /pending, and blocked work/i, command.name);
    } else {
      assert.equal(command.resultContext.specProgress, false, command.name);
      assert.doesNotMatch(contract, /^Specs: /m, command.name);
      assert.doesNotMatch(contract, /^Work summary: /m, command.name);
    }
  }
});

test("completion contracts do not chain same-session public workflow prompts", () => {
  for (const name of ["qs-plan-spec", "qs-code-build", "qs-code-debug", "qs-review-code", "ps-hillclimb"]) {
    const command = PUBLIC_COMMANDS.find((item) => item.name === name);
    const contract = renderSkillOutputContract(command);
    assert.doesNotMatch(contract, /catalog-approved composite workflow/i, name);
    assert.doesNotMatch(contract, /then \$qs-/i, name);
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
      if (command.name === "qs-deploy-release") assert.equal(routes.length, 0);
      else assert.ok(routes.length >= 1 && routes.length <= 3, command.name);
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
      NEXT_SKILLS_BY_NAME[skill.name].map((route) => route.name),
      skill.continuation.approvedSkills,
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

test("qs-review-code conditionally emits truthful host inline comments", async () => {
  const review = await readFile(join(root, "skills", "engineering", "qs-review-code", "SKILL.md"), "utf8");

  assert.match(review, /active client supplies the `::code-comment\{\.\.\.\}` inline-comment contract/i);
  assert.match(review, /each reported actionable, line-specific finding/i);
  assert.match(review, /supplements the readable report and never replaces it/i);
  assert.match(review, /never fabricate a file or line range/i);
  assert.match(review, /generic references remain ordinary Markdown links/i);
  assert.match(review, /does not supply the contract, omit the directives/i);
  assert.match(review, /active review diff/i);
  assert.match(review, /existing file does not by itself make a line renderable/i);
  assert.match(review, /native `\/review`/i);
  assert.match(review, /never claim that a comment card or Add action rendered/i);

  for (const skill of SKILLS.filter((candidate) => candidate.name !== "qs-review-code")) {
    const path = skill.sourcePath ?? `skills/${skill.bucket}/${skill.name}`;
    const content = await readFile(join(root, path, "SKILL.md"), "utf8");
    assert.doesNotMatch(content, /::code-comment\{/, `${skill.name} unexpectedly owns inline code comments`);
  }
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
