import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { PS_INTERNAL_CAPABILITIES, PS_PUBLIC_COMMANDS } from "../scripts/ps-skill-catalog.mjs";
import { normalizeSkillReadout, writeSkillGallery } from "../scripts/qs-skill-readout.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const commandRoot = join(root, "skills", "pstack", "commands");
const execFileAsync = promisify(execFile);

async function filesUnder(base, current = base) {
  const files = [];
  for (const entry of await readdir(current, { withFileTypes: true })) {
    const path = join(current, entry.name);
    if (entry.isDirectory()) files.push(...await filesUnder(base, path));
    else if (entry.isFile()) files.push(relative(base, path));
    else throw new Error(`Unexpected non-file projection entry: ${path}`);
  }
  return files.sort();
}

test("PS-08..15 expose exactly thirteen explicit-only canonical commands", async () => {
  const entries = (await readdir(commandRoot, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  assert.deepEqual(entries, PS_PUBLIC_COMMANDS.map((command) => command.name).sort());

  for (const command of PS_PUBLIC_COMMANDS) {
    const source = join(commandRoot, command.name);
    const [skill, metadata, documentation] = await Promise.all([
      readFile(join(source, "SKILL.md"), "utf8"),
      readFile(join(source, "agents", "openai.yaml"), "utf8"),
      readFile(join(root, "docs", "pstack", `${command.name}.md`), "utf8"),
    ]);
    assert.match(skill, new RegExp(`^name: ${command.name}$`, "m"));
    assert.match(skill, /^disable-model-invocation: true$/m);
    assert.match(skill, /^## Completion report and next steps$/m);
    assert.match(metadata, /allow_implicit_invocation: false/);
    assert.match(metadata, new RegExp(`\\$ps-skills:${command.name}\\b`));
    assert.match(documentation, new RegExp(`codex plugin add ps-skills@quickstark`));
    assert.match(documentation, /never starts another public skill automatically/i);
  }
});

test("PS-17 keeps canonical commands and capabilities Cursor-neutral and package-safe", async () => {
  for (const base of [commandRoot, join(root, "skills", "pstack", "internal")]) {
    for (const file of await filesUnder(base)) {
      const content = await readFile(join(base, file), "utf8");
      assert.doesNotMatch(content, /\.cursor\b|cursor\/plugins|cursor-specific|Task\(|subagent_type|claude-(?:3|sonnet|opus)|gpt-[0-9]/i, file);
      assert.doesNotMatch(content, /benny|poteto|comment-sicko/i, file);
    }
  }

  for (const capability of PS_INTERNAL_CAPABILITIES) {
    const content = await readFile(join(root, capability.sourcePath), "utf8");
    assert.doesNotMatch(content, /^---$/m);
    assert.doesNotMatch(content, /^name:/m);
    assert.doesNotMatch(content, /^## Completion report and next steps$/m);
  }
});

test("PS-17 projects isolated Claude and Codex packages with exact notices", async () => {
  const expectedNames = PS_PUBLIC_COMMANDS.map((command) => command.name).sort();
  const expectedCapabilities = PS_INTERNAL_CAPABILITIES.map((capability) => `${capability.name}.md`).sort();
  const roots = [join(root, "packages", "ps-skills"), join(root, "codex", "plugins", "ps-skills")];
  const notice = await readFile(join(root, "THIRD_PARTY_NOTICES.md"), "utf8");

  for (const packageRoot of roots) {
    assert.deepEqual((await readdir(join(packageRoot, "skills"))).sort(), expectedNames);
    assert.deepEqual((await readdir(join(packageRoot, "capabilities"))).sort(), expectedCapabilities);
    assert.equal(await readFile(join(packageRoot, "THIRD_PARTY_NOTICES.md"), "utf8"), notice);
    const allFiles = await filesUnder(packageRoot);
    assert.ok(allFiles.every((file) => !/benny|poteto|comment-sicko/i.test(file)));
  }

  for (const command of PS_PUBLIC_COMMANDS) {
    const claude = await readFile(join(roots[0], "skills", command.name, "SKILL.md"), "utf8");
    const codex = await readFile(join(roots[1], "skills", command.name, "SKILL.md"), "utf8");
    assert.match(claude, /^disable-model-invocation: true$/m);
    assert.doesNotMatch(codex, /^disable-model-invocation:/m);
  }
});

test("PS-03 marketplaces expose three isolated same-version packages", async () => {
  const [project, claude, codex, psClaude, psCodex] = await Promise.all([
    readFile(join(root, "package.json"), "utf8").then(JSON.parse),
    readFile(join(root, ".claude-plugin", "marketplace.json"), "utf8").then(JSON.parse),
    readFile(join(root, "codex", ".agents", "plugins", "marketplace.json"), "utf8").then(JSON.parse),
    readFile(join(root, "packages", "ps-skills", ".claude-plugin", "plugin.json"), "utf8").then(JSON.parse),
    readFile(join(root, "codex", "plugins", "ps-skills", ".codex-plugin", "plugin.json"), "utf8").then(JSON.parse),
  ]);
  const names = ["qs-skills", "qs-specialists", "ps-skills"];
  assert.deepEqual(claude.plugins.map((plugin) => plugin.name), names);
  assert.deepEqual(codex.plugins.map((plugin) => plugin.name), names);
  assert.equal(claude.plugins[2].source, "./packages/ps-skills");
  assert.equal(codex.plugins[2].source.path, "./plugins/ps-skills");
  assert.equal(psClaude.version, project.version);
  assert.equal(psCodex.version, project.version);
});

test("PS-18 normalizes all root states with one skill and exactly three ranked prompts", () => {
  const states = [
    ["Completed", "complete"],
    ["Completed", "continuation-required"],
    ["Awaiting input", "input-required"],
    ["Failed", "failed"],
  ];
  for (const command of PS_PUBLIC_COMMANDS) {
    for (const [status, completionState] of states) {
      const result = normalizeSkillReadout({
        skill: command.name,
        status,
        completionState,
        outcome: `Exercise ${command.name} in ${completionState}.`,
        ...(completionState === "complete" ? {
          checks: [{
            title: "Root completion evidence",
            detail: command.name === "ps-visual-parity"
              ? "metric=pixel-diff; tolerance=0; residual=0"
              : "The required bounded check passed with recorded evidence.",
            status: "passed",
          }],
          ...(command.name === "ps-worktree-cleanup" ? {
            decisions: [{ title: "Confirmed cleanup scope", detail: "Only exact audited targets were selected." }],
          } : {}),
        } : {}),
      });
      assert.deepEqual(result.skillsUsed, [command.name]);
      assert.equal(result.collection, "quickstark/ps-skills");
      assert.equal(result.nextSkills.length, 3);
      assert.deepEqual(result.nextSkills.map((next) => next.rank), [1, 2, 3]);
      for (const next of result.nextSkills) {
        assert.match(next.prompt, /^Use \$(?:ps-skills|qs-skills|qs-specialists):/);
      }
    }
  }
});

test("PS-18 preserves safety gates for evaluation, visual parity, PRs, and cleanup", async () => {
  const read = async (name) => readFile(join(commandRoot, name, "SKILL.md"), "utf8");
  const [evaluation, visual, babysit, cleanup, runtime, create, maintain] = await Promise.all([
    read("ps-skill-eval"), read("ps-visual-parity"), read("ps-pr-babysit"),
    read("ps-worktree-cleanup"), read("ps-runtime-forensics"),
    read("ps-create-verification-skill"), read("ps-maintain-verification-skill"),
  ]);
  assert.match(evaluation, /transcript or run-history evidence is optional/i);
  assert.match(evaluation, /explicitly selects its source and scope/i);
  assert.match(visual, /repository-declared or user-approved tolerance/i);
  assert.match(visual, /return `input-required` before implementation edits/i);
  assert.match(visual, /baseline is immutable/i);
  assert.match(babysit, /inspect-only: observe and report; never edit/i);
  assert.match(babysit, /never merge, enable auto-merge or merge-when-ready/i);
  assert.match(cleanup, /default scope is Git worktrees only/i);
  assert.match(cleanup, /separate secondary scopes/i);
  assert.match(cleanup, /separate exact-target confirmation/i);
  assert.match(runtime, /return `continuation-required` before changing tracked product source/i);
  assert.match(create, /do not change product behavior/i);
  assert.match(maintain, /product behavior remains outside/i);

  assert.throws(() => normalizeSkillReadout({
    skill: "ps-visual-parity",
    completionState: "complete",
    outcome: "Incorrectly claim completion with a failed comparison.",
    checks: [{ title: "Visual residual", status: "failed" }],
  }), /prohibit a complete result/);
  for (const skill of [
    "ps-blast-radius", "ps-runtime-forensics", "ps-trace-forensics",
    "ps-create-verification-skill", "ps-maintain-verification-skill",
    "ps-skill-eval", "ps-hillclimb", "ps-visual-parity",
    "ps-pr-babysit", "ps-worktree-cleanup",
  ]) {
    assert.throws(() => normalizeSkillReadout({
      skill,
      completionState: "complete",
      outcome: "Incorrectly claim a high-risk completion without contract evidence.",
    }), /requires substantive completion evidence/);
  }
});

test("PS-07 provides a thirteen-command PS-only preview gallery", async (context) => {
  const { mkdtemp, rm } = await import("node:fs/promises");
  const { tmpdir } = await import("node:os");
  const directory = await mkdtemp(join(tmpdir(), "ps-gallery-"));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const previews = await writeSkillGallery({ directory, collection: "ps-skills" });
  assert.deepEqual(previews.map((preview) => preview.skill), PS_PUBLIC_COMMANDS.map((command) => command.name));
  assert.ok(previews.every((preview) => preview.collection === "quickstark/ps-skills"));
});

test("PS-07 exposes collection filtering through the gallery CLI", async (context) => {
  const { mkdtemp, rm } = await import("node:fs/promises");
  const { tmpdir } = await import("node:os");
  const directory = await mkdtemp(join(tmpdir(), "ps-gallery-cli-"));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const { stdout } = await execFileAsync(process.execPath, [
    join(root, "scripts", "qs-skill-readout.mjs"),
    "gallery",
    "--collection", "ps-skills",
    "--directory", directory,
    "--no-serve",
    "--json",
  ]);
  const previews = JSON.parse(stdout);
  assert.deepEqual(previews.map((preview) => preview.skill), PS_PUBLIC_COMMANDS.map((command) => command.name));
  assert.ok(previews.every((preview) => preview.collection === "quickstark/ps-skills"));
});
