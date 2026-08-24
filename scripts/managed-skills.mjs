import { execFile } from "node:child_process";
import { lstat, readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";

import { agentSkillResources } from "./personal-skills/manifest.mjs";
import { piSkillFilterAllows } from "./personal-skills/pi-discovery.mjs";
import { buildReconciliationPlan } from "./personal-skills/reconcile.mjs";
import { execute as executePersonalSkills, loadManifest } from "./sync-personal-skills.mjs";
import { SKILL_COLLECTIONS } from "./skill-collection-registry.mjs";

const runFile = promisify(execFile);
const defaultRepositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SUPPORTED_AGENTS = new Set(["codex", "claude-code", "pi"]);

function assertCondition(condition, message) {
  if (!condition) throw new Error(message);
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function packageManifestPaths(repositoryRoot, collection) {
  return {
    claude: join(repositoryRoot, collection.claudePackageRoot, ".claude-plugin", "plugin.json"),
    codex: join(repositoryRoot, collection.codexPackageRoot, ".codex-plugin", "plugin.json"),
    pi: join(repositoryRoot, collection.piPackageRoot, "package.json"),
  };
}

export async function validateMaintainedPackages({ repositoryRoot = defaultRepositoryRoot } = {}) {
  const repositoryPackage = await readJson(join(repositoryRoot, "package.json"));
  assertCondition(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(repositoryPackage.version ?? ""), "Repository package requires an exact semantic version.");
  const packages = [];
  for (const collection of SKILL_COLLECTIONS) {
    const paths = packageManifestPaths(repositoryRoot, collection);
    const [claude, codex, pi] = await Promise.all([readJson(paths.claude), readJson(paths.codex), readJson(paths.pi)]);
    for (const [harness, manifest] of [["Claude", claude], ["Codex", codex]]) {
      assertCondition(manifest.name === collection.packageName, `${harness} package identity differs for ${collection.id}.`);
      assertCondition(
        manifest.version === repositoryPackage.version,
        `Stale generated package ${collection.id}: ${harness} version ${manifest.version ?? "missing"} differs from ${repositoryPackage.version}.`,
      );
    }
    assertCondition(pi.name === collection.packageName, `Pi package identity differs for ${collection.id}.`);
    assertCondition(pi.version === repositoryPackage.version, `Stale generated package ${collection.id}: Pi version ${pi.version ?? "missing"} differs from ${repositoryPackage.version}.`);
    assertCondition(pi.private === true && JSON.stringify(pi.pi?.skills) === JSON.stringify(["./skills"]), `Pi package ${collection.id} has an invalid manager manifest.`);
    assertCondition(!pi.scripts && !pi.dependencies && !pi.devDependencies, `Pi package ${collection.id} must not contain lifecycle or dependency installation code.`);
    const claudeSkills = Array.isArray(claude.skills) ? claude.skills.length : 0;
    assertCondition(claudeSkills === collection.publicCommands.length, `Claude package ${collection.id} does not contain its registered public command count.`);
    packages.push(Object.freeze({
      name: collection.packageName,
      version: repositoryPackage.version,
      publicCommandCount: collection.publicCommands.length,
      publicCommands: Object.freeze([...collection.publicCommands]),
      claudePackageRoot: collection.claudePackageRoot,
      codexPackageRoot: collection.codexPackageRoot,
      piPackageRoot: collection.piPackageRoot,
      supportedAgents: Object.freeze(["codex", "claude-code", "pi"]),
    }));
  }
  return Object.freeze({ version: repositoryPackage.version, packages: Object.freeze(packages) });
}

function managerActions(repositoryRoot, agents, packages) {
  const actions = [];
  if (agents.includes("codex")) {
    actions.push({
      agent: "codex",
      kind: "add-marketplace",
      command: "codex",
      arguments: ["plugin", "marketplace", "add", join(repositoryRoot, "codex")],
    });
    for (const package_ of packages) actions.push({
      agent: "codex",
      kind: "install-maintained-package",
      package: package_.name,
      version: package_.version,
      command: "codex",
      arguments: ["plugin", "add", `${package_.name}@quickstark`],
    });
  }
  if (agents.includes("claude-code")) {
    actions.push({
      agent: "claude-code",
      kind: "add-marketplace",
      command: "claude",
      arguments: ["plugin", "marketplace", "add", repositoryRoot],
    });
    for (const package_ of packages) actions.push({
      agent: "claude-code",
      kind: "install-maintained-package",
      package: package_.name,
      version: package_.version,
      command: "claude",
      arguments: ["plugin", "install", `${package_.name}@quickstark`],
    });
  }
  if (agents.includes("pi")) {
    for (const package_ of packages) actions.push({
      agent: "pi",
      kind: "install-maintained-package",
      package: package_.name,
      version: package_.version,
      command: "pi",
      arguments: ["install", join(repositoryRoot, package_.piPackageRoot)],
    });
  }
  return actions;
}

function summarizePersonalPlan(plan) {
  return {
    targets: plan.targets,
    operationCount: plan.operations.length,
    operations: plan.operations.map(({ kind, name }) => ({ kind, name })),
    conflictCount: plan.conflicts.length,
    conflicts: plan.conflicts,
    externalActionCount: plan.externalActions.length,
    externalActions: plan.externalActions,
    states: plan.states,
  };
}

export async function buildManagedSkillsPlan({
  repositoryRoot = defaultRepositoryRoot,
  homeDirectory = homedir(),
  agents = ["codex"],
  manifestPath = join(repositoryRoot, "config", "personal-skills.manifest.json"),
} = {}) {
  assertCondition(Array.isArray(agents) && agents.length > 0, "Select at least one managed skill target.");
  const targets = [...new Set(agents)];
  for (const agent of targets) assertCondition(SUPPORTED_AGENTS.has(agent), `Unsupported managed skill target: ${agent}.`);
  const maintained = await validateMaintainedPackages({ repositoryRoot });
  const manifest = await loadManifest(manifestPath);
  const personalPlan = await buildReconciliationPlan({ manifest, homeDirectory, targets });
  return {
    repositoryVersion: maintained.version,
    targets,
    maintainedPackages: maintained.packages,
    approvedResourceCount: agentSkillResources(manifest).length,
    managerActions: managerActions(repositoryRoot, targets, maintained.packages),
    maintainedPackageBoundaries: {
      codex: "Repository-maintained packages use the local Codex marketplace projection.",
      "claude-code": "Repository-maintained packages use the local Claude marketplace projection.",
      pi: "Repository-maintained commands use generated Pi-native package projections; approved contributor skills remain portable resources in ~/.agents/skills.",
    },
    personalPlan: summarizePersonalPlan(personalPlan),
  };
}

async function defaultManagerCommand(command, arguments_, { homeDirectory }) {
  try {
    await runFile(command, arguments_, {
      encoding: "utf8",
      maxBuffer: 8 * 1024 * 1024,
      timeout: 120_000,
      env: {
        ...process.env,
        HOME: homeDirectory,
        USERPROFILE: homeDirectory,
        CODEX_HOME: join(homeDirectory, ".codex"),
      },
    });
  } catch (error) {
    const detail = String(error.stderr || error.stdout || error.message).trim().slice(0, 1_600);
    throw new Error(`${basename(command)} ${arguments_[0] ?? ""} failed: ${detail}`);
  }
}

function installedPackageEntries(inventory) {
  if (Array.isArray(inventory)) return inventory;
  if (Array.isArray(inventory?.installed)) return inventory.installed;
  if (Array.isArray(inventory?.plugins)) return inventory.plugins;
  throw new Error("Harness package inventory did not contain an installed plugin list.");
}

function findInstalledPackage(inventory, name) {
  return installedPackageEntries(inventory).find((item) => {
    if (item.pluginId) return item.pluginId === `${name}@quickstark`;
    const marketplace = item.marketplaceName ?? item.marketplace?.name ?? item.marketplace;
    return item.name === name && (marketplace === undefined || marketplace === "quickstark");
  });
}

export function verifyManagedPackageInventory(agent, inventory, packages) {
  const installed = installedPackageEntries(inventory);
  for (const package_ of packages) {
    const actual = findInstalledPackage(installed, package_.name);
    assertCondition(actual, `${agent} is missing maintained package ${package_.name} ${package_.version}.`);
    assertCondition(actual.installed !== false, `${agent} package ${package_.name} is not installed.`);
    assertCondition(actual.enabled !== false, `${agent} package ${package_.name} is disabled.`);
    assertCondition(
      actual.version === package_.version,
      `${agent} package ${package_.name} has version ${actual.version ?? "missing"}; expected ${package_.version}.`,
    );
  }
  return { agent, packageCount: packages.length, version: packages[0]?.version };
}

async function defaultInspectManagedPackages(agent, { homeDirectory }) {
  if (agent === "pi") throw new Error("Pi package inspection requires repository package context.");
  const [command, arguments_] = agent === "codex"
    ? ["codex", ["plugin", "list", "--json"]]
    : ["claude", ["plugin", "list", "--json"]];
  try {
    const result = await runFile(command, arguments_, {
      encoding: "utf8",
      maxBuffer: 8 * 1024 * 1024,
      timeout: 120_000,
      env: {
        ...process.env,
        HOME: homeDirectory,
        USERPROFILE: homeDirectory,
        CODEX_HOME: join(homeDirectory, ".codex"),
      },
    });
    return JSON.parse(result.stdout);
  } catch (error) {
    const detail = String(error.stderr || error.stdout || error.message).trim().slice(0, 1_600);
    throw new Error(`Unable to inspect ${agent} maintained packages: ${detail}`);
  }
}

async function inspectPiManagedPackages({ homeDirectory, repositoryRoot, packages }) {
  const settingsPath = join(homeDirectory, ".pi", "agent", "settings.json");
  const metadata = await lstat(settingsPath).catch((error) => error?.code === "ENOENT" ? null : Promise.reject(error));
  if (!metadata) return { installed: [] };
  assertCondition(metadata.isFile() && !metadata.isSymbolicLink(), "Pi settings must be a real regular file.");
  const contents = await readFile(settingsPath);
  assertCondition(contents.byteLength <= 1024 * 1024, "Pi settings exceed the managed verification size bound.");
  const settings = JSON.parse(contents.toString("utf8"));
  const configured = Array.isArray(settings.packages) ? settings.packages : [];
  const sources = configured.map((entry) => typeof entry === "string" ? { source: entry } : entry)
    .filter((entry) => entry && typeof entry.source === "string")
    .filter((entry) => isAbsolute(entry.source) || entry.source.startsWith("."))
    .map((entry) => ({
      ...entry,
      resolved: entry.source.startsWith(".")
        ? resolve(dirname(settingsPath), entry.source)
        : resolve(entry.source),
    }));
  const expectedRoots = new Map(packages.map((package_) => [
    package_.name,
    join(repositoryRoot, package_.piPackageRoot),
  ]));
  for (const entry of sources) {
    for (const [name, expected] of expectedRoots) {
      const suffix = join("pi", "packages", name);
      if (entry.resolved.endsWith(suffix) && entry.resolved !== expected) {
        throw new Error(`Pi has a stale QuickStark package path for ${name}: ${entry.resolved}.`);
      }
    }
  }
  return {
    installed: packages.flatMap((package_) => {
      const expected = expectedRoots.get(package_.name);
      const entry = sources.find((candidate) => candidate.resolved === expected);
      const enabled = entry && package_.publicCommands.every((name) => piSkillFilterAllows(entry.skills, {
        name,
        path: `skills/${name}/SKILL.md`,
      }));
      return entry ? [{
        name: package_.name,
        pluginId: `${package_.name}@quickstark`,
        marketplaceName: "quickstark",
        version: package_.version,
        installed: true,
        enabled,
        source: expected,
      }] : [];
    }),
  };
}

async function inspectPackages(agent, context, inspectManagedPackages) {
  if (agent !== "pi") return inspectManagedPackages(agent, context);
  return inspectManagedPackages === defaultInspectManagedPackages
    ? inspectPiManagedPackages(context)
    : inspectManagedPackages(agent, context);
}

async function defaultPersonalAction(options) {
  return executePersonalSkills(options, { write: () => {} });
}

export async function executeManagedSkills({
  action,
  repositoryRoot = defaultRepositoryRoot,
  homeDirectory = homedir(),
  agents = ["codex"],
  manifestPath = join(repositoryRoot, "config", "personal-skills.manifest.json"),
  authorize = false,
  runManagerCommand = defaultManagerCommand,
  inspectManagedPackages = defaultInspectManagedPackages,
  runPersonalAction = defaultPersonalAction,
} = {}) {
  assertCondition(["plan", "sync", "verify"].includes(action), "Managed skills action must be plan, sync, or verify.");
  const plan = await buildManagedSkillsPlan({ repositoryRoot, homeDirectory, agents, manifestPath });
  if (action === "plan") return { action, ...plan };
  if (action === "verify") {
    const personalVerification = await runPersonalAction({
      action: "verify",
      manifestPath,
      homeDirectory,
      agents,
      json: true,
    });
    const installedPackageVerification = [];
    for (const agent of agents) {
      const inventory = await inspectPackages(agent, { homeDirectory, repositoryRoot, packages: plan.maintainedPackages }, inspectManagedPackages);
      installedPackageVerification.push(verifyManagedPackageInventory(agent, inventory, plan.maintainedPackages));
    }
    return { action, ...plan, personalVerification, installedPackageVerification };
  }

  assertCondition(authorize, "Managed skill synchronization requires explicit --authorize after reviewing the plan.");
  assertCondition(plan.personalPlan.conflictCount === 0, "Refusing managed skill synchronization while contributor-skill conflicts exist.");
  const basePersonalOptions = {
    manifestPath,
    homeDirectory,
    agents,
    json: true,
  };
  const personalPreflight = await runPersonalAction({ ...basePersonalOptions, action: "plan" });
  assertCondition(personalPreflight.conflictCount === 0, "Contributor-skill state changed after the managed plan; review a fresh plan.");

  const beforeManagerInventory = new Map();
  for (const agent of agents) {
    beforeManagerInventory.set(agent, await inspectPackages(agent, { homeDirectory, repositoryRoot, packages: plan.maintainedPackages }, inspectManagedPackages));
  }

  let managerActionsCompleted = 0;
  let managerActionsAlreadySatisfied = 0;
  for (const managerAction of plan.managerActions) {
    const inventory = beforeManagerInventory.get(managerAction.agent);
    if (managerAction.kind === "add-marketplace"
      && plan.maintainedPackages.some((package_) => findInstalledPackage(inventory, package_.name))) {
      managerActionsAlreadySatisfied += 1;
      continue;
    }
    const installed = managerAction.package
      ? findInstalledPackage(inventory, managerAction.package)
      : null;
    if (installed
      && installed.installed !== false
      && installed.enabled !== false
      && installed.version === managerAction.version) {
      managerActionsAlreadySatisfied += 1;
      continue;
    }
    const arguments_ = managerAction.agent === "claude-code" && installed
      ? ["plugin", "update", `${managerAction.package}@quickstark`]
      : managerAction.arguments;
    try {
      await runManagerCommand(managerAction.command, arguments_, { homeDirectory });
      managerActionsCompleted += 1;
    } catch (error) {
      const alreadyRegistered = managerAction.kind === "add-marketplace"
        && /already (?:exists|added|configured|registered)|duplicate/i.test(error.message);
      if (!alreadyRegistered) throw error;
      managerActionsAlreadySatisfied += 1;
    }
  }
  const installedPackageVerification = [];
  for (const agent of agents) {
    const inventory = await inspectPackages(agent, { homeDirectory, repositoryRoot, packages: plan.maintainedPackages }, inspectManagedPackages);
    installedPackageVerification.push(verifyManagedPackageInventory(agent, inventory, plan.maintainedPackages));
  }
  const personalSync = await runPersonalAction({ ...basePersonalOptions, action: "sync" });
  const personalVerification = await runPersonalAction({ ...basePersonalOptions, action: "verify" });
  return {
    action,
    targets: plan.targets,
    repositoryVersion: plan.repositoryVersion,
    managerActionsCompleted,
    managerActionsAlreadySatisfied,
    installedPackageVerification,
    personalSync,
    personalVerification,
  };
}

function parseArguments(arguments_) {
  const [action, ...flags] = arguments_;
  const options = { action, agents: [], json: false, authorize: false };
  for (let index = 0; index < flags.length; index += 1) {
    const flag = flags[index];
    if (flag === "--json") { options.json = true; continue; }
    if (flag === "--authorize") { options.authorize = true; continue; }
    assertCondition(["--agent", "--target", "--home", "--manifest"].includes(flag), `Unknown managed skill option: ${flag}.`);
    const value = flags[index + 1];
    assertCondition(value && !value.startsWith("--"), `Missing value for ${flag}.`);
    if (flag === "--agent" || flag === "--target") options.agents.push(value);
    else if (flag === "--home") options.homeDirectory = resolve(value);
    else options.manifestPath = resolve(value);
    index += 1;
  }
  if (!options.agents.length) options.agents = ["codex"];
  return options;
}

const invokedDirectly = process.argv[1] !== undefined && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (invokedDirectly) {
  try {
    const options = parseArguments(process.argv.slice(2));
    const result = await executeManagedSkills(options);
    process.stdout.write(`${options.json ? JSON.stringify(result) : JSON.stringify(result, null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`Managed skills failed: ${error.message}\n`);
    process.exitCode = 1;
  }
}
