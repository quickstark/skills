import assert from "node:assert/strict";
import { cp, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

import { resolvePublicCommand, SKILL_COLLECTIONS } from "../scripts/skill-collection-registry.mjs";

const runFile = promisify(execFile);
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

async function directoryNames(path) {
  return (await readdir(path, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

test("Pi package projection preserves all three maintained collection boundaries", async () => {
  const project = JSON.parse(await readFile(join(repositoryRoot, "package.json"), "utf8"));
  for (const collection of SKILL_COLLECTIONS) {
    const root = join(repositoryRoot, collection.piPackageRoot);
    const manifest = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
    assert.equal(manifest.name, collection.packageName);
    assert.equal(manifest.version, project.version);
    assert.equal(manifest.license, "MIT");
    assert.equal(manifest.private, true);
    assert.deepEqual(manifest.pi, { skills: ["./skills"] });
    assert.ok(manifest.keywords.includes("pi-package"));
    assert.equal(manifest.scripts, undefined);
    assert.deepEqual(await directoryNames(join(root, "skills")), [...collection.publicCommands].sort());
  }
});

test("Pi manifest projects canonical skill contents and required notices without lifecycle code", async () => {
  for (const collection of SKILL_COLLECTIONS) {
    const root = join(repositoryRoot, collection.piPackageRoot);
    for (const name of collection.publicCommands) {
      const sourceCommand = resolvePublicCommand(name);
      const sourceRoot = join(repositoryRoot, sourceCommand.sourcePath ?? `skills/${sourceCommand.bucket}/${name}`);
      assert.equal(
        await readFile(join(root, "skills", name, "SKILL.md"), "utf8"),
        await readFile(join(sourceRoot, "SKILL.md"), "utf8"),
        name,
      );
    }
    const topLevel = (await readdir(root)).sort();
    assert.deepEqual(
      topLevel,
      collection.id === "ps-skills"
        ? ["THIRD_PARTY_NOTICES.md", "package.json", "skills"]
        : ["package.json", "skills"],
    );
  }
});

test("Pi projection corruption is rejected by the projector entry point", async (context) => {
  const directory = await mkdtemp(join(tmpdir(), "qs-pi-projection-test-"));
  const projection = join(directory, "qs-skills");
  context.after(() => rm(directory, { recursive: true, force: true }));
  await cp(join(repositoryRoot, "pi", "packages", "qs-skills"), projection, { recursive: true });
  await writeFile(join(projection, "unexpected.txt"), "not projected\n");
  await assert.rejects(
    runFile(process.execPath, [
      "scripts/sync-codex-plugin.mjs",
      "--check",
      "--package",
      "qs-skills",
      "--root",
      projection,
      "--format",
      "pi",
    ], { cwd: repositoryRoot }),
    /unexpected top-level entries|invalid Pi package/i,
  );
});
