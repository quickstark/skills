import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

import {
  executeManagedSkills,
  verifyOriginMainFreshness,
  verifyManagedPackageInventory,
  validateMaintainedPackages,
} from "../scripts/managed-skills.mjs";
import { SKILL_COLLECTIONS } from "../scripts/skill-collection-registry.mjs";

const repositoryRoot = resolve(import.meta.dirname, "..");
const repositoryVersion = JSON.parse(await readFile(join(repositoryRoot, "package.json"), "utf8")).version;
const repositoryVersionPattern = repositoryVersion.replaceAll(".", "\\.");

async function temporaryHome() {
  const home = await mkdtemp(join(tmpdir(), "qs-managed-skills-test-"));
  await mkdir(join(home, ".agents", "skills"), { recursive: true });
  await mkdir(join(home, ".codex"), { recursive: true });
  await mkdir(join(home, ".claude"), { recursive: true });
  return home;
}

function gitFreshnessFixture({
  head = "a".repeat(40),
  remote = head,
  branch = "main",
  status = "",
} = {}) {
  const calls = [];
  const responses = new Map([
    [["rev-parse", "HEAD"].join("\0"), { stdout: `${head}\n` }],
    [["symbolic-ref", "--quiet", "--short", "HEAD"].join("\0"), { stdout: `${branch}\n` }],
    [["status", "--porcelain", "--untracked-files=all"].join("\0"), { stdout: status }],
    [["ls-remote", "--exit-code", "origin", "refs/heads/main"].join("\0"), { stdout: `${remote}\trefs/heads/main\n` }],
  ]);
  return {
    calls,
    runGit: async (arguments_) => {
      calls.push(arguments_);
      const response = responses.get(arguments_.join("\0"));
      if (!response) throw new Error(`Unexpected Git command: ${arguments_.join(" ")}`);
      return response;
    },
  };
}

// Selected target behavior, real native isolation, failure/retry, and state preservation
// are exercised in managed-skill-input.test.mjs. Obsolete all-package convergence
// and implicit marketplace-repoint assertions were replaced by that contract.

test("skills:update freshness accepts an exact origin/main checkout without mutation", async () => {
  const fixture = gitFreshnessFixture();
  const result = await verifyOriginMainFreshness({ repositoryRoot: "/workspace/skills", runGit: fixture.runGit });
  assert.deepEqual(result, { head: "a".repeat(40), originMain: "a".repeat(40) });
  assert.deepEqual(fixture.calls, [
    ["rev-parse", "HEAD"],
    ["symbolic-ref", "--quiet", "--short", "HEAD"],
    ["status", "--porcelain", "--untracked-files=all"],
    ["ls-remote", "--exit-code", "origin", "refs/heads/main"],
  ]);
});

test("skills:update freshness rejects unsupported agents before querying Git", async () => {
  const fixture = gitFreshnessFixture();
  await assert.rejects(
    verifyOriginMainFreshness({ repositoryRoot: "/workspace/skills", agents: ["unsafe;command"], runGit: fixture.runGit }),
    /Unsupported managed skill target/,
  );
  assert.deepEqual(fixture.calls, []);
});

test("skills:update freshness gives an exact fast-forward command for a clean stale main", async () => {
  const fixture = gitFreshnessFixture({ head: "a".repeat(40), remote: "b".repeat(40) });
  await assert.rejects(
    verifyOriginMainFreshness({ repositoryRoot: "/workspace/skills", runGit: fixture.runGit }),
    /git -C '\/workspace\/skills' pull --ff-only origin main/,
  );
});

test("skills:update freshness gives an isolated worktree command for dirty or non-main checkouts", async () => {
  for (const state of [
    { branch: "main", status: " M README.md\n" },
    { branch: "feature", status: "" },
  ]) {
    const fixture = gitFreshnessFixture({ head: "a".repeat(40), remote: "b".repeat(40), ...state });
    await assert.rejects(
      verifyOriginMainFreshness({ repositoryRoot: "/workspace/skills", runGit: fixture.runGit }),
      (error) => {
        assert.doesNotMatch(error.message, /pull --ff-only/);
        assert.match(error.message, /git -C '\/workspace\/skills' fetch origin main/);
        assert.match(error.message, /git -C '\/workspace\/skills' worktree add --detach '\/workspace\/skills-origin-main-bbbbbbbbbbbb' FETCH_HEAD/);
        return true;
      },
    );
  }
});

test("skills:update freshness fails before plan or manager mutation", async () => {
  let personalActions = 0;
  let managerActions = 0;
  await assert.rejects(
    executeManagedSkills({
      action: "update",
      repositoryRoot,
      homeDirectory: await temporaryHome(),
      verifyRepositoryFreshness: async () => { throw new Error("checkout is stale"); },
      runPersonalAction: async () => { personalActions += 1; },
      runManagerCommand: async () => { managerActions += 1; },
    }),
    /checkout is stale/,
  );
  assert.equal(personalActions, 0);
  assert.equal(managerActions, 0);
});

test("managed skills authorization is required before apply", async () => {
  await assert.rejects(
    executeManagedSkills({
      action: "sync",
      registryState: "target",
      repositoryRoot,
      homeDirectory: await temporaryHome(),
      agents: ["pi"],
      authorize: false,
    }),
    /explicit --authorize/i,
  );
});

test("managed package inventory requires every selected package at the checked-out version", () => {
  const packages = ["qs-skills", "qs-specialists", "qs-advanced"].map((name) => ({ name, version: repositoryVersion }));
  assert.deepEqual(
    verifyManagedPackageInventory("codex", {
      installed: packages.map(({ name, version }) => ({ name, version, installed: true, enabled: true })),
    }, packages),
    { agent: "codex", packageCount: 3, version: repositoryVersion },
  );
  assert.throws(
    () => verifyManagedPackageInventory("codex", {
      installed: packages.map(({ name }) => ({ name, version: name === "qs-advanced" ? "3.4.0" : repositoryVersion, installed: true, enabled: true })),
    }, packages),
    new RegExp(`qs-advanced.*3\\.4\\.0.*${repositoryVersionPattern}`, "i"),
  );
  assert.throws(
    () => verifyManagedPackageInventory("codex", {
      installed: packages.map(({ name, version }) => ({ name, version, marketplaceName: "unrelated", installed: true, enabled: true })),
    }, packages),
    /missing maintained package qs-skills/i,
  );
});

test("package registry validation rejects a stale generated package", async () => {
  const root = await mkdtemp(join(tmpdir(), "qs-managed-package-test-"));
  await writeFile(join(root, "package.json"), JSON.stringify({ version: repositoryVersion }));
  for (const collection of SKILL_COLLECTIONS) {
    const claudeDirectory = join(root, collection.claudePackageRoot, ".claude-plugin");
    const codexDirectory = join(root, collection.codexPackageRoot, ".codex-plugin");
    const piDirectory = join(root, collection.piPackageRoot);
    await mkdir(claudeDirectory, { recursive: true });
    await mkdir(codexDirectory, { recursive: true });
    await mkdir(piDirectory, { recursive: true });
    const skills = collection.publicCommands.map((name) => `./skills/${name}`);
    await writeFile(join(claudeDirectory, "plugin.json"), JSON.stringify({ name: collection.packageName, version: repositoryVersion, skills }));
    await writeFile(join(codexDirectory, "plugin.json"), JSON.stringify({
      name: collection.packageName,
      version: collection.id === "qs-skills" ? "3.4.0" : repositoryVersion,
    }));
    await writeFile(join(piDirectory, "package.json"), JSON.stringify({
      name: collection.packageName,
      version: repositoryVersion,
      private: true,
      pi: { skills: ["./skills"] },
    }));
  }
  await assert.rejects(validateMaintainedPackages({ repositoryRoot: root }), /stale generated package|version/i);
});
