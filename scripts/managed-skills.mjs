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

function quoteShellPath(path) {
  return `'${path.replaceAll("'", `'\\''`)}'`;
}

async function defaultGitCommand(arguments_, { repositoryRoot }) {
  try {
    return await runFile("git", ["-C", repositoryRoot, ...arguments_], {
      encoding: "utf8",
      maxBuffer: 1024 * 1024,
      timeout: 30_000,
      env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
    });
  } catch (error) {
    const detail = String(error.stderr || error.stdout || error.message).trim().slice(0, 1_600);
    const failure = new Error(`git ${arguments_[0] ?? ""} failed: ${detail}`);
    failure.exitCode = error.code;
    throw failure;
  }
}

export async function verifyOriginMainFreshness({
  repositoryRoot = defaultRepositoryRoot,
  agents = ["codex"],
  runGit = defaultGitCommand,
} = {}) {
  assertCondition(Array.isArray(agents) && agents.length > 0, "Select at least one managed skill target.");
  for (const agent of agents) assertCondition(SUPPORTED_AGENTS.has(agent), `Unsupported managed skill target: ${agent}.`);
  let headResult;
  let branchResult;
  let statusResult;
  let remoteResult;
  try {
    headResult = await runGit(["rev-parse", "HEAD"], { repositoryRoot });
    branchResult = await runGit(["symbolic-ref", "--quiet", "--short", "HEAD"], { repositoryRoot })
      .catch((error) => error.exitCode === 1 ? { stdout: "" } : Promise.reject(error));
    statusResult = await runGit(["status", "--porcelain", "--untracked-files=all"], { repositoryRoot });
    remoteResult = await runGit(["ls-remote", "--exit-code", "origin", "refs/heads/main"], { repositoryRoot });
  } catch (error) {
    throw new Error(`Unable to verify origin/main freshness before skills:update: ${error.message}`);
  }

  const head = headResult.stdout.trim();
  const branch = branchResult.stdout.trim();
  const dirty = statusResult.stdout.trim().length > 0;
  const originMain = remoteResult.stdout.trim().split(/\s+/)[0] ?? "";
  assertCondition(/^[0-9a-f]{40}$/i.test(head), "Unable to verify origin/main freshness before skills:update: local HEAD is invalid.");
  assertCondition(/^[0-9a-f]{40}$/i.test(originMain), "Unable to verify origin/main freshness before skills:update: origin/main is unavailable.");
  if (head === originMain) return { head, originMain };

  const root = quoteShellPath(repositoryRoot);
  const updateFlags = agents.map((agent) => `--agent ${agent}`).join(" ");
  const rerun = `npm run skills:update -- ${updateFlags}`;
  if (branch === "main" && !dirty) {
    throw new Error([
      `Checkout HEAD ${head} does not match origin/main ${originMain}.`,
      "Refresh this clean main checkout, then rerun skills:update:",
      `git -C ${root} pull --ff-only origin main`,
      rerun,
    ].join("\n"));
  }

  const worktree = join(dirname(repositoryRoot), `${basename(repositoryRoot)}-origin-main-${originMain.slice(0, 12)}`);
  throw new Error([
    `Checkout HEAD ${head} does not match origin/main ${originMain}.`,
    "Preserve this checkout and run skills:update from an isolated clean worktree:",
    `git -C ${root} fetch origin main && git -C ${root} worktree add --detach ${quoteShellPath(worktree)} FETCH_HEAD`,
    `cd ${quoteShellPath(worktree)} && ${rerun}`,
  ].join("\n"));
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

function findMarketplace(inventory, name) {
  const marketplaces = Array.isArray(inventory?.marketplaces) ? inventory.marketplaces : [];
  return marketplaces.find((marketplace) => marketplace?.name === name);
}

function marketplaceSource(marketplace) {
  const source = marketplace?.marketplaceSource?.source ?? marketplace?.root;
  return typeof source === "string" && source.length > 0 ? source : null;
}

function marketplaceMatchesLocalRoot(marketplace, expectedRoot) {
  if (!marketplace) return false;
  const sourceType = marketplace.marketplaceSource?.sourceType;
  if (sourceType !== undefined && sourceType !== "local") return false;
  return [marketplace.root, marketplaceSource(marketplace)]
    .filter((value) => typeof value === "string")
    .some((value) => resolve(value) === resolve(expectedRoot));
}

function verifyManagedMarketplace(agent, inventory, repositoryRoot) {
  if (agent !== "codex" || !Array.isArray(inventory?.marketplaces)) return;
  const expectedRoot = join(repositoryRoot, "codex");
  const registration = findMarketplace(inventory, "quickstark");
  const actualSource = marketplaceSource(registration) ?? "missing";
  assertCondition(
    marketplaceMatchesLocalRoot(registration, expectedRoot),
    `Codex QuickStark marketplace is ${actualSource}; expected ${expectedRoot}.`,
  );
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
  const command = agent === "codex" ? "codex" : "claude";
  const inspect = async (arguments_) => {
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
  };
  try {
    if (agent === "codex") {
      const [plugins, marketplaceInventory] = await Promise.all([
        inspect(["plugin", "list", "--json"]),
        inspect(["plugin", "marketplace", "list", "--json"]),
      ]);
      return {
        ...plugins,
        marketplaces: Array.isArray(marketplaceInventory?.marketplaces)
          ? marketplaceInventory.marketplaces
          : [],
      };
    }
    return await inspect(["plugin", "list", "--json"]);
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
  onManagerAction = () => {},
  verifyRepositoryFreshness = verifyOriginMainFreshness,
} = {}) {
  assertCondition(["plan", "sync", "update", "verify"].includes(action), "Managed skills action must be plan, sync, update, or verify.");
  if (action === "update") await verifyRepositoryFreshness({ repositoryRoot, agents });
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
      verifyManagedMarketplace(agent, inventory, repositoryRoot);
      installedPackageVerification.push(verifyManagedPackageInventory(agent, inventory, plan.maintainedPackages));
    }
    return { action, ...plan, personalVerification, installedPackageVerification };
  }

  assertCondition(action === "update" || authorize, "Managed skill synchronization requires explicit --authorize after reviewing the plan.");
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
  const managerActionResults = [];
  const recordManagerAction = (managerAction, status, operation, details = {}) => {
    const result = {
      agent: managerAction.agent,
      kind: managerAction.kind,
      ...(managerAction.package ? { package: managerAction.package, version: managerAction.version } : {}),
      status,
      operation,
      ...details,
    };
    managerActionResults.push(result);
    onManagerAction(result);
  };
  const refreshedMarketplaces = new Set();
  for (const managerAction of plan.managerActions) {
    const inventory = beforeManagerInventory.get(managerAction.agent);
    if (managerAction.kind === "add-marketplace" && managerAction.agent === "codex") {
      const expectedRoot = managerAction.arguments.at(-1);
      const registration = findMarketplace(inventory, "quickstark");
      if (marketplaceMatchesLocalRoot(registration, expectedRoot)) {
        managerActionsAlreadySatisfied += 1;
        recordManagerAction(managerAction, "already-satisfied", "marketplace-current");
        continue;
      }
      const previousSource = marketplaceSource(registration);
      if (registration && !previousSource) {
        recordManagerAction(managerAction, "failed", "marketplace-repoint", { restoration: "unavailable" });
        throw new Error("Cannot safely repoint the Codex QuickStark marketplace because its previous source is unavailable.");
      }
      if (registration) {
        try {
          await runManagerCommand("codex", ["plugin", "marketplace", "remove", "quickstark"], { homeDirectory });
        } catch (error) {
          let afterFailure;
          try {
            afterFailure = await inspectPackages(
              "codex",
              { homeDirectory, repositoryRoot, packages: plan.maintainedPackages },
              inspectManagedPackages,
            );
          } catch (inspectionError) {
            recordManagerAction(managerAction, "failed", "marketplace-removal", { restoration: "state-unknown" });
            throw new Error(`${error.message} Unable to verify the previous marketplace after the failed removal: ${inspectionError.message}`);
          }
          const remaining = findMarketplace(afterFailure, "quickstark");
          if (marketplaceMatchesLocalRoot(remaining, previousSource)) {
            recordManagerAction(managerAction, "failed", "marketplace-removal", { restoration: "not-required" });
            throw error;
          }
          if (remaining) {
            recordManagerAction(managerAction, "failed", "marketplace-removal", { restoration: "state-unknown" });
            throw new Error(`${error.message} QuickStark marketplace state changed unexpectedly after the failed removal.`);
          }
          try {
            await runManagerCommand("codex", ["plugin", "marketplace", "add", previousSource], { homeDirectory });
          } catch (restoreError) {
            recordManagerAction(managerAction, "failed", "marketplace-removal", { restoration: "failed" });
            throw new Error(`${error.message} The previous QuickStark marketplace could not be restored: ${restoreError.message}`);
          }
          recordManagerAction(managerAction, "failed", "marketplace-removal", { restoration: "completed" });
          throw new Error(`${error.message} The previous QuickStark marketplace was restored.`);
        }
      }
      try {
        await runManagerCommand(managerAction.command, managerAction.arguments, { homeDirectory });
        managerActionsCompleted += 1;
        refreshedMarketplaces.add(managerAction.agent);
        recordManagerAction(
          managerAction,
          "completed",
          registration ? "marketplace-repointed" : "marketplace-registered",
        );
      } catch (error) {
        if (registration && previousSource) {
          try {
            await runManagerCommand("codex", ["plugin", "marketplace", "add", previousSource], { homeDirectory });
          } catch (restoreError) {
            recordManagerAction(managerAction, "failed", "marketplace-repoint", { restoration: "failed" });
            throw new Error(`${error.message} The previous QuickStark marketplace could not be restored: ${restoreError.message}`);
          }
          recordManagerAction(managerAction, "failed", "marketplace-repoint", { restoration: "completed" });
          throw new Error(`${error.message} The previous QuickStark marketplace was restored.`);
        }
        const alreadyRegistered = /already (?:exists|added|configured|registered)|duplicate/i.test(error.message);
        if (!alreadyRegistered) {
          recordManagerAction(managerAction, "failed", "marketplace-registration");
          throw error;
        }
        managerActionsAlreadySatisfied += 1;
        recordManagerAction(managerAction, "already-satisfied", "marketplace-already-registered");
      }
      continue;
    }
    if (managerAction.kind === "add-marketplace"
      && plan.maintainedPackages.some((package_) => findInstalledPackage(inventory, package_.name))) {
      managerActionsAlreadySatisfied += 1;
      recordManagerAction(managerAction, "already-satisfied", "marketplace-current");
      continue;
    }
    const installed = managerAction.package
      ? findInstalledPackage(inventory, managerAction.package)
      : null;
    if (installed
      && installed.installed !== false
      && installed.enabled !== false
      && installed.version === managerAction.version
      && !refreshedMarketplaces.has(managerAction.agent)) {
      managerActionsAlreadySatisfied += 1;
      recordManagerAction(managerAction, "already-satisfied", "package-current");
      continue;
    }
    const arguments_ = managerAction.agent === "claude-code" && installed
      ? ["plugin", "update", `${managerAction.package}@quickstark`]
      : managerAction.arguments;
    try {
      await runManagerCommand(managerAction.command, arguments_, { homeDirectory });
      managerActionsCompleted += 1;
      recordManagerAction(
        managerAction,
        "completed",
        installed
          ? (refreshedMarketplaces.has(managerAction.agent) ? "package-refreshed" : "package-updated")
          : (managerAction.kind === "add-marketplace" ? "marketplace-registered" : "package-installed"),
      );
    } catch (error) {
      const alreadyRegistered = managerAction.kind === "add-marketplace"
        && /already (?:exists|added|configured|registered)|duplicate/i.test(error.message);
      if (!alreadyRegistered) {
        recordManagerAction(
          managerAction,
          "failed",
          managerAction.kind === "add-marketplace" ? "marketplace-registration" : (installed ? "package-update" : "package-installation"),
        );
        throw error;
      }
      managerActionsAlreadySatisfied += 1;
      recordManagerAction(managerAction, "already-satisfied", "marketplace-already-registered");
    }
  }
  const installedPackageVerification = [];
  for (const agent of agents) {
    const inventory = await inspectPackages(agent, { homeDirectory, repositoryRoot, packages: plan.maintainedPackages }, inspectManagedPackages);
    verifyManagedMarketplace(agent, inventory, repositoryRoot);
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
    managerActionResults,
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
  let options;
  const managerActionResults = [];
  try {
    options = parseArguments(process.argv.slice(2));
    const result = await executeManagedSkills({
      ...options,
      onManagerAction: (result) => managerActionResults.push(result),
    });
    process.stdout.write(`${options.json ? JSON.stringify(result) : JSON.stringify(result, null, 2)}\n`);
  } catch (error) {
    if (options?.json) {
      process.stderr.write(`${JSON.stringify({
        action: options.action,
        status: "failed",
        error: error.message,
        managerActionResults,
      })}\n`);
    } else {
      if (managerActionResults.length > 0) {
        process.stderr.write("Package-manager results before failure:\n");
        for (const result of managerActionResults) {
          const subject = result.package ?? "marketplace";
          const restoration = result.restoration ? `; restoration ${result.restoration}` : "";
          process.stderr.write(`- ${result.agent} ${subject}: ${result.status} (${result.operation}${restoration})\n`);
        }
      }
      process.stderr.write(`Managed skills failed: ${error.message}\n`);
    }
    process.exitCode = 1;
  }
}
