import { claudePackagePath, codexPackagePath, piPackagePath } from '../tooling/install/distribution-layout.mjs';
import assert from "node:assert/strict";
import { readFile, readdir, realpath, stat } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { PUBLIC_COMMANDS, SKILL_COLLECTIONS, REGISTRY_STATE } from "../tooling/catalog/skill-collection-registry.mjs";
import { renderSkillOutputContract } from "../tooling/generation/sync-skill-output-contracts.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
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

test("active skills load one private runtime contract from their own source or package", async () => {
  const sourceContract = join(root, "skills/_shared/runtime/run-contract.md");
  const expected = await readFile(sourceContract, "utf8");
  assert.match(expected, /^# QuickStark runtime run contract$/m);
  assert.doesNotMatch(expected, /^---$/m);
  for (const collection of SKILL_COLLECTIONS.filter(({ id }) => id !== "ps-skills")) {
    for (const packageRoot of [codexPackagePath(collection.id, 'dist'), claudePackagePath(collection.id, 'dist'), piPackagePath(collection.id, 'dist')]) {
      const packageContract = join(root, packageRoot, "capabilities/runtime/run-contract.md");
      assert.equal(await realpath(packageContract), packageContract);
      assert.equal(await readFile(packageContract, "utf8"), expected);
      assert.deepEqual(await readdir(dirname(packageContract)), ["run-contract.md"]);
      for (const command of PUBLIC_COMMANDS.filter(({ collectionId }) => collectionId === collection.id)) {
        const paths = [
          [join(root, command.sourcePath, "SKILL.md"), sourceContract],
          [join(root, packageRoot, "skills", command.name, "SKILL.md"), packageContract],
        ];
        for (const [path, contract] of paths) {
          const body = await readFile(path, "utf8");
          const link = body.match(/^Before doing any task work, read \[the shared run contract\]\(([^)]+)\)/m);
          assert.ok(link, path);
          assert.equal(await realpath(resolve(dirname(path), link[1])), contract);
          assert.doesNotMatch(body, /Assign meaningful stages approximate effort weights/, path);
          assert.match(body, /stop before task work/i, path);
        }
      }
    }
  }
});

test("every public command has matching source, metadata, documentation, and package projection", async () => {
  assert.equal(PUBLIC_COMMANDS.length, REGISTRY_STATE === "target" ? 39 : 34);
  for (const command of PUBLIC_COMMANDS) {
    const sourceRoot = join(root, command.sourcePath);
    const documentation = join(root, command.documentationPath ?? `docs/${command.bucket}/${command.name}.md`);
    const source = await readFile(join(sourceRoot, "SKILL.md"), "utf8");
    const metadata = await readFile(join(sourceRoot, "agents", "openai.yaml"), "utf8");
    const docs = await readFile(documentation, "utf8");

    assert.match(source, new RegExp(`^name: ${command.name}$`, "m"));
    if (REGISTRY_STATE === "target") assert.doesNotMatch(source, /claude/i, command.name);
    assert.equal((source.match(/^## Completion report and next steps$/gm) ?? []).length, 1);
    assert.match(source, /Apply the shared run contract/);
    assert.match(metadata, new RegExp(`display_name: "${command.displayName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`));
    assert.match(metadata, /effort=quick\|standard\|deep/);
    assert.match(metadata, /report=brief\|full/);
    assert.match(docs, new RegExp(`^# ${command.displayName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "m"));
    assert.match(docs, /produces one normalized root result directly in chat/i);

    const collection = SKILL_COLLECTIONS.find((item) => item.id === command.collectionId);
    const codexCopy = join(root, codexPackagePath(collection.id, 'dist'), "skills", command.name, "SKILL.md");
    const piCopy = join(root, piPackagePath(collection.id, 'dist'), "skills", command.name, "SKILL.md");
    assert.equal(await exists(codexCopy), true);
    assert.equal(await exists(piCopy), true);
    if (claudePackagePath(collection.id, 'dist') !== ".") {
      assert.equal(await exists(join(root, claudePackagePath(collection.id, 'dist'), "skills", command.name, "SKILL.md")), true);
    }
  }
});

test("public completion footers contain only the concise result fields and routing rules", () => {
  for (const command of PUBLIC_COMMANDS) {
    const contract = renderSkillOutputContract(command);
    const lines = contract.split("\n").length;
    assert.ok(lines <= 10, `${command.name} completion contract is ${lines} lines`);
    assert.match(contract, /`Status:`/);
    assert.match(contract, /`Outcome:`/);
    assert.doesNotMatch(contract, /Assign meaningful stages|internal clear-writing pass/i);
    assert.doesNotMatch(contract, /JSON input|report file|qs-skill-readout|require-hosted|reports\.quickstark\.com|Readout:/i);
  }
});

test("active repository guidance contains no reporting-service dependency", async () => {
  const activePaths = [
    "README.md", "AGENTS.md", ".claude/CLAUDE.md", "CONTEXT.md",
    "docs/architecture.md", "docs/contributing.md", "docs/skill-run-contract.md",
    "docs/pstack/index.md",
  ];
  for (const path of activePaths) {
    const content = await readFile(join(root, path), "utf8");
    assert.doesNotMatch(content, /reports\.quickstark\.com|require-hosted|qs-skill-readout|readout-operations|producer credential is required/i, path);
  }

  const generatedDocs = [
    ...(await filesRecursively(join(root, "docs", "engineering"))),
    ...(await filesRecursively(join(root, "docs", "productivity"))),
    ...(await filesRecursively(join(root, "docs", "pstack"))),
  ];
  for (const path of generatedDocs) {
    if (!path.endsWith(".md")) continue;
    const content = await readFile(path, "utf8");
    assert.doesNotMatch(content, /reports\.quickstark\.com|require-hosted|qs-skill-readout|authenticated hosted readout/i, path);
  }
});

test("reporting runtime, deployment, operational API, and browser dependency are absent", async () => {
  const removed = [
    "deploy/readouts/compose.yaml",
    "docs/readout-operations.md",
    "docs/specs/quickstark-chatgpt-readout.openapi.json",
    "scripts/qs-readout-gallery.prototype.mjs",
    "scripts/qs-readout-observation.prototype.schema.json",
    "scripts/qs-readout-portfolio.mjs",
    "scripts/qs-readout-producer-token.mjs",
    "scripts/qs-readout-settings.mjs",
    "scripts/qs-skill-readout.mjs",
    "scripts/qs-skill-readout.prototype.mjs",
    "scripts/qs-skill-report-presentation.mjs",
  ];
  for (const path of removed) assert.equal(await exists(join(root, path)), false, `${path} still exists`);

  const project = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
  assert.equal(project.devDependencies?.["playwright-core"], undefined);
  assert.ok(Object.keys(project.scripts).every((name) => !name.startsWith("readouts:")));
});

test("active packages share the release version while target marketplaces retain only the pinned PS transition exception", async () => {
  const project = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
  const claudeMarketplace = JSON.parse(await readFile(join(root, ".claude-plugin/marketplace.json"), "utf8"));
  const codexMarketplace = JSON.parse(await readFile(join(root, ".agents/plugins/marketplace.json"), "utf8"));
  const target = REGISTRY_STATE === "target";
  const activeNames = target ? ["qs-skills", "qs-specialists", "qs-advanced", "qs-frontend", "qs-video", "qs-execution"] : ["qs-skills", "qs-specialists", "ps-skills"];
  const marketplaceNames = target ? [...activeNames, "ps-skills"] : activeNames;
  assert.deepEqual(SKILL_COLLECTIONS.map(collection => collection.id), activeNames);
  assert.deepEqual(claudeMarketplace.plugins.map(plugin => plugin.name), marketplaceNames);
  assert.deepEqual(codexMarketplace.plugins.map(plugin => plugin.name), marketplaceNames);
  for (const name of marketplaceNames) {
    const expectedVersion = target && name === "ps-skills" ? "3.8.0" : project.version;
    for (const manifestPath of [name === "qs-skills" ? ".claude-plugin/plugin.json" : `${claudePackagePath(name, "dist")}/.claude-plugin/plugin.json`, `${codexPackagePath(name, "dist")}/.codex-plugin/plugin.json`, `${piPackagePath(name, "dist")}/package.json`]) {
      const manifest = JSON.parse(await readFile(join(root, manifestPath), "utf8")); assert.equal(manifest.name, name, manifestPath); assert.equal(manifest.version, expectedVersion, manifestPath);
    }
  }
  if (target) {
    const transition = JSON.parse(await readFile(join(root, "tooling/generation/skill-transition-packages.json"), "utf8"));
    assert.deepEqual(transition.packages.map(pkg => [pkg.id, pkg.state, pkg.version, pkg.sourceRevision]), [["ps-skills", "retained-for-migration", "3.8.0", "86bac7dd82fe3812c9b459cc6bfa7454df9aa3ac"]]);
    assert.equal(claudeMarketplace.plugins.at(-1).source, "./packages/ps-skills");
    assert.deepEqual(codexMarketplace.plugins.at(-1).source, { source: "local", path: "./codex/plugins/ps-skills" });
    assert.match(claudeMarketplace.plugins.at(-1).description, /Legacy migration compatibility only/);
    assert.ok(!PUBLIC_COMMANDS.some(command => command.collectionId === "ps-skills"));
  }
});

test("MIT attribution and upstream boundaries remain intact", async () => {
  const [license, notices, psNotices, readme] = await Promise.all([
    readFile(join(root, "LICENSE"), "utf8"),
    readFile(join(root, "THIRD_PARTY_NOTICES.md"), "utf8"),
    readFile(join(root, "packages", "ps-skills", "THIRD_PARTY_NOTICES.md"), "utf8"),
    readFile(join(root, "README.md"), "utf8"),
  ]);
  assert.match(license, /MIT License/);
  assert.match(notices, /Matt Pocock/i);
  assert.match(notices, /Lauren Tan/i);
  assert.match(psNotices, /Lauren Tan/i);
  assert.match(readme, /github\.com\/mattpocock\/skills/);
});
