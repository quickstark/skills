import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

import {
  buildManagedSkillsPlan,
  executeManagedSkills,
  verifyManagedPackageInventory,
  validateMaintainedPackages,
} from "../scripts/managed-skills.mjs";
import { SKILL_COLLECTIONS } from "../scripts/skill-collection-registry.mjs";

const repositoryRoot = resolve(import.meta.dirname, "..");

async function temporaryHome() {
  const home = await mkdtemp(join(tmpdir(), "qs-managed-skills-test-"));
  await mkdir(join(home, ".agents", "skills"), { recursive: true });
  await mkdir(join(home, ".codex"), { recursive: true });
  await mkdir(join(home, ".claude"), { recursive: true });
  return home;
}

test("managed skills plan combines maintained package plan and approved resources without mutation", async () => {
  const homeDirectory = await temporaryHome();
  const before = JSON.stringify(await readFile(join(repositoryRoot, "config", "personal-skills.manifest.json"), "utf8"));
  const plan = await buildManagedSkillsPlan({
    repositoryRoot,
    homeDirectory,
    agents: ["codex", "claude-code", "pi"],
  });

  assert.equal(plan.repositoryVersion, "3.5.0");
  assert.deepEqual(plan.maintainedPackages.map(({ name }) => name), ["qs-skills", "qs-specialists", "ps-skills"]);
  assert.equal(plan.approvedResourceCount, 18);
  assert.deepEqual(plan.targets, ["codex", "claude-code", "pi"]);
  assert.equal(plan.managerActions.filter(({ agent }) => agent === "codex").length, 4);
  assert.equal(plan.managerActions.filter(({ agent }) => agent === "claude-code").length, 4);
  assert.equal(plan.managerActions.filter(({ agent }) => agent === "pi").length, 3);
  assert.match(plan.maintainedPackageBoundaries.pi, /Pi-native package projection/i);
  assert.equal(plan.approvedResourceCount, 18);
  assert.equal(JSON.stringify(await readFile(join(repositoryRoot, "config", "personal-skills.manifest.json"), "utf8")), before);
});

test("maintained package plan uses exact manager commands from the local checkout", async () => {
  const plan = await buildManagedSkillsPlan({
    repositoryRoot,
    homeDirectory: await temporaryHome(),
    agents: ["codex", "claude-code"],
  });
  assert.deepEqual(
    plan.managerActions.map(({ command, arguments: arguments_ }) => [command, ...arguments_]),
    [
      ["codex", "plugin", "marketplace", "add", join(repositoryRoot, "codex")],
      ["codex", "plugin", "add", "qs-skills@quickstark"],
      ["codex", "plugin", "add", "qs-specialists@quickstark"],
      ["codex", "plugin", "add", "ps-skills@quickstark"],
      ["claude", "plugin", "marketplace", "add", repositoryRoot],
      ["claude", "plugin", "install", "qs-skills@quickstark"],
      ["claude", "plugin", "install", "qs-specialists@quickstark"],
      ["claude", "plugin", "install", "ps-skills@quickstark"],
    ],
  );
});

test("managed skills authorization is required before apply", async () => {
  await assert.rejects(
    executeManagedSkills({
      action: "sync",
      repositoryRoot,
      homeDirectory: await temporaryHome(),
      agents: ["pi"],
      authorize: false,
    }),
    /explicit --authorize/i,
  );
});

test("managed skills apply executes reviewed manager commands and delegates contributor sync", async () => {
  const commands = [];
  const personalActions = [];
  let inspection = 0;
  const result = await executeManagedSkills({
    action: "sync",
    repositoryRoot,
    homeDirectory: await temporaryHome(),
    agents: ["codex"],
    authorize: true,
    runManagerCommand: async (command, arguments_) => commands.push([command, ...arguments_]),
    inspectManagedPackages: async () => {
      inspection += 1;
      return { installed: inspection === 1 ? [] : [
        { name: "qs-skills", version: "3.5.0", installed: true, enabled: true },
        { name: "qs-specialists", version: "3.5.0", installed: true, enabled: true },
        { name: "ps-skills", version: "3.5.0", installed: true, enabled: true },
      ] };
    },
    runPersonalAction: async (options) => {
      personalActions.push(options.action);
      return { operationCount: 0, conflictCount: 0, externalActionCount: 0 };
    },
  });

  assert.deepEqual(personalActions, ["plan", "sync", "verify"]);
  assert.equal(commands.length, 4);
  assert.equal(result.managerActionsCompleted, 4);
  assert.equal(result.personalVerification.operationCount, 0);
});

test("managed skills apply updates existing Claude packages and skips current ones", async () => {
  const commands = [];
  let inspection = 0;
  await executeManagedSkills({
    action: "sync",
    repositoryRoot,
    homeDirectory: await temporaryHome(),
    agents: ["claude-code"],
    authorize: true,
    runManagerCommand: async (command, arguments_) => commands.push([command, ...arguments_]),
    inspectManagedPackages: async () => {
      inspection += 1;
      return { installed: [
        { name: "qs-skills", version: inspection === 1 ? "3.4.0" : "3.5.0", installed: true, enabled: true },
        { name: "qs-specialists", version: "3.5.0", installed: true, enabled: true },
        { name: "ps-skills", version: "3.5.0", installed: true, enabled: true },
      ] };
    },
    runPersonalAction: async () => ({ operationCount: 0, conflictCount: 0, externalActionCount: 0 }),
  });
  assert.deepEqual(commands, [["claude", "plugin", "update", "qs-skills@quickstark"]]);
});

test("manager command failure stops before contributor mutation", async () => {
  const personalActions = [];
  await assert.rejects(
    executeManagedSkills({
      action: "sync",
      repositoryRoot,
      homeDirectory: await temporaryHome(),
      agents: ["codex"],
      authorize: true,
      runManagerCommand: async () => { throw new Error("manager failed"); },
      runPersonalAction: async (options) => {
        personalActions.push(options.action);
        return { operationCount: 0, conflictCount: 0, externalActionCount: 0 };
      },
    }),
    /manager failed/i,
  );
  assert.deepEqual(personalActions, ["plan"]);
});

test("managed package inventory requires every selected package at the checked-out version", () => {
  const packages = ["qs-skills", "qs-specialists", "ps-skills"].map((name) => ({ name, version: "3.5.0" }));
  assert.deepEqual(
    verifyManagedPackageInventory("codex", {
      installed: packages.map(({ name, version }) => ({ name, version, installed: true, enabled: true })),
    }, packages),
    { agent: "codex", packageCount: 3, version: "3.5.0" },
  );
  assert.throws(
    () => verifyManagedPackageInventory("codex", {
      installed: packages.map(({ name }) => ({ name, version: name === "ps-skills" ? "3.4.0" : "3.5.0", installed: true, enabled: true })),
    }, packages),
    /ps-skills.*3\.4\.0.*3\.5\.0/i,
  );
  assert.throws(
    () => verifyManagedPackageInventory("codex", {
      installed: packages.map(({ name, version }) => ({ name, version, marketplaceName: "unrelated", installed: true, enabled: true })),
    }, packages),
    /missing maintained package qs-skills/i,
  );
});

test("managed skills verify checks installed package versions as well as portable resources", async () => {
  const inspected = [];
  const result = await executeManagedSkills({
    action: "verify",
    repositoryRoot,
    homeDirectory: await temporaryHome(),
    agents: ["codex", "pi"],
    inspectManagedPackages: async (agent) => {
      inspected.push(agent);
      return { installed: [
        { name: "qs-skills", version: "3.5.0", installed: true, enabled: true },
        { name: "qs-specialists", version: "3.5.0", installed: true, enabled: true },
        { name: "ps-skills", version: "3.5.0", installed: true, enabled: true },
      ] };
    },
    runPersonalAction: async () => ({ operationCount: 0, conflictCount: 0, externalActionCount: 0 }),
  });
  assert.deepEqual(inspected, ["codex", "pi"]);
  assert.equal(result.installedPackageVerification[0].packageCount, 3);
});

test("existing marketplace registration is idempotent but other manager failures remain fatal", async () => {
  const personalActions = [];
  let inspection = 0;
  const result = await executeManagedSkills({
    action: "sync",
    repositoryRoot,
    homeDirectory: await temporaryHome(),
    agents: ["codex"],
    authorize: true,
    runManagerCommand: async (_command, arguments_) => {
      if (arguments_.includes("marketplace")) throw new Error("marketplace quickstark already configured");
    },
    inspectManagedPackages: async () => {
      inspection += 1;
      return { installed: inspection === 1 ? [] : [
        { name: "qs-skills", version: "3.5.0", installed: true, enabled: true },
        { name: "qs-specialists", version: "3.5.0", installed: true, enabled: true },
        { name: "ps-skills", version: "3.5.0", installed: true, enabled: true },
      ] };
    },
    runPersonalAction: async (options) => {
      personalActions.push(options.action);
      return { operationCount: 0, conflictCount: 0, externalActionCount: 0 };
    },
  });
  assert.equal(result.managerActionsAlreadySatisfied, 1);
  assert.deepEqual(personalActions, ["plan", "sync", "verify"]);
});

test("package registry validation rejects a stale generated package", async () => {
  const root = await mkdtemp(join(tmpdir(), "qs-managed-package-test-"));
  await writeFile(join(root, "package.json"), JSON.stringify({ version: "3.5.0" }));
  for (const collection of SKILL_COLLECTIONS) {
    const claudeDirectory = join(root, collection.claudePackageRoot, ".claude-plugin");
    const codexDirectory = join(root, collection.codexPackageRoot, ".codex-plugin");
    const piDirectory = join(root, collection.piPackageRoot);
    await mkdir(claudeDirectory, { recursive: true });
    await mkdir(codexDirectory, { recursive: true });
    await mkdir(piDirectory, { recursive: true });
    const skills = collection.publicCommands.map((name) => `./skills/${name}`);
    await writeFile(join(claudeDirectory, "plugin.json"), JSON.stringify({ name: collection.packageName, version: "3.5.0", skills }));
    await writeFile(join(codexDirectory, "plugin.json"), JSON.stringify({
      name: collection.packageName,
      version: collection.id === "qs-skills" ? "3.4.0" : "3.5.0",
    }));
    await writeFile(join(piDirectory, "package.json"), JSON.stringify({
      name: collection.packageName,
      version: "3.5.0",
      private: true,
      pi: { skills: ["./skills"] },
    }));
  }
  await assert.rejects(validateMaintainedPackages({ repositoryRoot: root }), /stale generated package|version/i);
});

test("Pi maintained package boundary excludes repository plugins", async () => {
  const plan = await buildManagedSkillsPlan({
    repositoryRoot,
    homeDirectory: await temporaryHome(),
    agents: ["pi"],
  });
  assert.deepEqual(plan.managerActions.map(({ command, arguments: arguments_ }) => [command, ...arguments_]), [
    ["pi", "install", join(repositoryRoot, "pi", "packages", "qs-skills")],
    ["pi", "install", join(repositoryRoot, "pi", "packages", "qs-specialists")],
    ["pi", "install", join(repositoryRoot, "pi", "packages", "ps-skills")],
  ]);
  assert.equal(plan.personalPlan.targets[0], "pi");
  assert.equal(plan.maintainedPackages.every(({ supportedAgents }) => supportedAgents.includes("pi")), true);
  assert.equal(plan.approvedResourceCount, 18);
});

test("Pi managed sync registers missing local packages then verifies them", async () => {
  const commands = [];
  let inspection = 0;
  const current = ["qs-skills", "qs-specialists", "ps-skills"].map((name) => ({
    name, version: "3.5.0", installed: true, enabled: true, marketplaceName: "quickstark",
  }));
  const result = await executeManagedSkills({
    action: "sync",
    repositoryRoot,
    homeDirectory: await temporaryHome(),
    agents: ["pi"],
    authorize: true,
    runManagerCommand: async (command, arguments_) => commands.push([command, ...arguments_]),
    inspectManagedPackages: async () => ({ installed: inspection++ === 0 ? [] : current }),
    runPersonalAction: async () => ({ operationCount: 0, conflictCount: 0, externalActionCount: 0 }),
  });
  assert.equal(commands.length, 3);
  assert.equal(result.installedPackageVerification[0].agent, "pi");
});

test("Pi managed verification reads exact local package settings without invoking Pi", async () => {
  const homeDirectory = await temporaryHome();
  await mkdir(join(homeDirectory, ".pi", "agent"), { recursive: true });
  await writeFile(join(homeDirectory, ".pi", "agent", "settings.json"), JSON.stringify({
    packages: ["qs-skills", "qs-specialists", "ps-skills"].map((name) => join(repositoryRoot, "pi", "packages", name)),
  }));
  const result = await executeManagedSkills({
    action: "verify",
    repositoryRoot,
    homeDirectory,
    agents: ["pi"],
    runPersonalAction: async () => ({ operationCount: 0, conflictCount: 0, externalActionCount: 0 }),
  });
  assert.deepEqual(result.installedPackageVerification, [{ agent: "pi", packageCount: 3, version: "3.5.0" }]);
});

test("Pi managed verification rejects selectors that disable projected commands", async () => {
  const homeDirectory = await temporaryHome();
  await mkdir(join(homeDirectory, ".pi", "agent"), { recursive: true });
  await writeFile(join(homeDirectory, ".pi", "agent", "settings.json"), JSON.stringify({
    packages: [
      {
        source: join(repositoryRoot, "pi", "packages", "qs-skills"),
        skills: ["!skills/**"],
      },
      join(repositoryRoot, "pi", "packages", "qs-specialists"),
      join(repositoryRoot, "pi", "packages", "ps-skills"),
    ],
  }));
  await assert.rejects(
    executeManagedSkills({
      action: "verify",
      repositoryRoot,
      homeDirectory,
      agents: ["pi"],
      runPersonalAction: async () => ({ operationCount: 0, conflictCount: 0, externalActionCount: 0 }),
    }),
    /qs-skills is disabled/i,
  );
});

test("portable boundary keeps maintained Pi packages outside approved contributor resources", async () => {
  const plan = await buildManagedSkillsPlan({ repositoryRoot, homeDirectory: await temporaryHome(), agents: ["pi"] });
  assert.equal(plan.approvedResourceCount, 18);
  assert.equal(plan.maintainedPackages.reduce((sum, package_) => sum + package_.publicCommandCount, 0), 32);
  assert.equal(plan.personalPlan.operations.every(({ name }) => !/^(?:qs|ps)-/.test(name)), true);
});
