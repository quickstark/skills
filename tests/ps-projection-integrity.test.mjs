import assert from "node:assert/strict";
import { cp, mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

import { assertGeneratedPackageRoot } from "../scripts/skill-package-projection.mjs";

const execFileAsync = promisify(execFile);
const repositoryRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

async function fixture(context) {
  const root = await mkdtemp(join(tmpdir(), "ps-projection-root-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  await Promise.all([
    mkdir(join(root, ".claude-plugin")),
    mkdir(join(root, "skills")),
    mkdir(join(root, "scripts")),
    mkdir(join(root, "capabilities")),
  ]);
  await writeFile(join(root, ".claude-plugin", "plugin.json"), "{}\n");
  await writeFile(join(root, "THIRD_PARTY_NOTICES.md"), "notice\n");
  return root;
}

const options = {
  manifestDirectory: ".claude-plugin",
  includeCapabilities: true,
  noticeFiles: ["THIRD_PARTY_NOTICES.md"],
};

test("PS-03 rejects extra top-level generated package files", async (context) => {
  const root = await fixture(context);
  await assert.doesNotReject(assertGeneratedPackageRoot(root, options));
  await writeFile(join(root, "unexpected.txt"), "not projected\n");
  await assert.rejects(assertGeneratedPackageRoot(root, options), /unexpected top-level entries/i);
});

test("PS-03 rejects top-level and manifest symlinks", async (context) => {
  const root = await fixture(context);
  const outside = join(root, "skills", "outside.txt");
  await writeFile(outside, "outside\n");
  await symlink(outside, join(root, "unsafe-link"));
  await assert.rejects(assertGeneratedPackageRoot(root, options), /unexpected top-level entries|regular files and directories/i);
  await rm(join(root, "unsafe-link"));
  await rm(join(root, ".claude-plugin", "plugin.json"));
  await symlink(outside, join(root, ".claude-plugin", "plugin.json"));
  await assert.rejects(assertGeneratedPackageRoot(root, options), /manifest.*regular file/i);
});

test("PS-03 rejects extra manifest entries and missing declared notices", async (context) => {
  const root = await fixture(context);
  await writeFile(join(root, ".claude-plugin", "extra.json"), "{}\n");
  await assert.rejects(assertGeneratedPackageRoot(root, options), /manifest.*exactly plugin\.json/i);
  await rm(join(root, ".claude-plugin", "extra.json"));
  await rm(join(root, "THIRD_PARTY_NOTICES.md"));
  await assert.rejects(assertGeneratedPackageRoot(root, options), /unexpected top-level entries/i);
});

test("PS-03 projector entry point rejects a corrupted disposable PS package", async (context) => {
  const directory = await mkdtemp(join(tmpdir(), "ps-projector-entry-"));
  const projection = join(directory, "ps-skills");
  context.after(() => rm(directory, { recursive: true, force: true }));
  await cp(join(repositoryRoot, "packages", "ps-skills"), projection, { recursive: true });
  await writeFile(join(projection, "unexpected.txt"), "not projected\n");

  await assert.rejects(
    execFileAsync(process.execPath, [
      "scripts/sync-codex-plugin.mjs",
      "--check",
      "--package",
      "ps-skills",
      "--root",
      projection,
      "--format",
      "claude",
    ], { cwd: repositoryRoot }),
    /unexpected top-level entries/i,
  );
});
