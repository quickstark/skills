import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readlink,
  realpath,
  readdir,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { basename, dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";

import { adoptInventoryCandidate } from "./personal-skills/adopt.mjs";
import { calculatePortableDirectoryHash, readBoundedPortableFile, readPortableSkillName } from "./personal-skills/filesystem.mjs";
import { inventoryMachine } from "./personal-skills/inventory.mjs";
import {
  lockEntryMatches,
  reconcileAgentSkillLock,
  writeAgentSkillLock,
} from "./personal-skills/lock.mjs";
import {
  agentSkillResources,
  normalizeManifest,
  PINNED_INSTALLER_INTEGRITY,
  PINNED_INSTALLER_VERSION,
} from "./personal-skills/manifest.mjs";
import { applyHarnessProjections, buildReconciliationPlan } from "./personal-skills/reconcile.mjs";

const runFile = promisify(execFile);
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_MANIFEST = join(repositoryRoot, "config", "personal-skills.manifest.json");
const INSTALLER_LOCK = join(repositoryRoot, "config", "personal-skills-installer-lock.json");
const SUPPORTED_AGENTS = new Set(["codex", "claude-code", "pi"]);

function assertCondition(condition, message) {
  if (!condition) throw new Error(message);
}

async function runCommand(command, arguments_, options = {}) {
  try {
    return await runFile(command, arguments_, {
      encoding: "utf8",
      maxBuffer: 8 * 1024 * 1024,
      timeout: 120_000,
      ...options,
    });
  } catch (error) {
    const details = String(error.stderr || error.stdout || error.message).trim().slice(0, 1_600);
    throw new Error(`${basename(command)} ${arguments_[0] ?? ""} failed: ${details}`);
  }
}

export function validateManifest(manifest) {
  return normalizeManifest(manifest);
}

export async function loadManifest(path = DEFAULT_MANIFEST) {
  return normalizeManifest(JSON.parse(await readFile(path, "utf8")));
}

export async function calculateSkillDirectoryHash(root) {
  const files = [];
  async function collect(current) {
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const path = join(current, entry.name);
      const metadata = await lstat(path);
      if (metadata.isSymbolicLink()) throw new Error("Skill contents must not contain symbolic links.");
      if (metadata.isDirectory()) {
        if (entry.name !== ".git" && entry.name !== "node_modules") await collect(path);
      } else if (metadata.isFile()) {
        files.push({ relativePath: relative(root, path).split("\\").join("/"), content: await readFile(path) });
      } else {
        throw new Error("Skill contents must not contain special files.");
      }
    }
  }
  await collect(root);
  files.sort((first, second) => first.relativePath.localeCompare(second.relativePath));
  const digest = createHash("sha256");
  for (const file of files) {
    digest.update(file.relativePath);
    digest.update(file.content);
  }
  return digest.digest("hex");
}

function legacySelection(resource) {
  return {
    resource,
    source: {
      repository: resource.source.repository,
      revision: resource.source.revision,
      license: resource.source.license,
      licensePath: resource.source.licensePath,
    },
    skill: {
      name: resource.name,
      upstreamPath: resource.source.upstreamPath,
      upstreamTreeHash: resource.source.upstreamTreeHash,
      contentSha256: resource.source.contentSha256,
      ...(resource.source.pluginName ? { pluginName: resource.source.pluginName } : {}),
    },
  };
}

function resourceFromSelection(selection) {
  if (selection.resource) return selection.resource;
  const { source, skill } = selection;
  return {
    type: "agent-skill",
    name: skill.name,
    source: {
      kind: "github",
      repository: source.repository,
      revision: source.revision,
      license: source.license ?? "MIT",
      licensePath: source.licensePath ?? "LICENSE",
      upstreamPath: skill.upstreamPath,
      upstreamTreeHash: skill.upstreamTreeHash,
      contentSha256: skill.contentSha256 ?? "0".repeat(64),
      ...(skill.pluginName ? { pluginName: skill.pluginName } : {}),
    },
    placement: { canonical: "~/.agents/skills", targets: ["claude-code", "codex", "pi"] },
  };
}

export function reconcileSkillLock(original, selections, timestamp) {
  return reconcileAgentSkillLock(original, selections.map(resourceFromSelection), timestamp);
}

export async function buildPlan(manifest, { homeDirectory = homedir(), lock = { version: 3, skills: {} } } = {}) {
  const normalized = normalizeManifest(manifest);
  const result = { missing: [], synced: [], metadataUpdates: [], conflicts: [] };
  for (const resource of agentSkillResources(normalized)) {
    const selection = legacySelection(resource);
    const path = join(homeDirectory, ".agents", "skills", resource.name);
    const metadata = await lstat(path).catch((error) => error?.code === "ENOENT" ? null : Promise.reject(error));
    if (!metadata) {
      result.missing.push(selection);
      continue;
    }
    if (!metadata.isDirectory() || metadata.isSymbolicLink()) {
      result.conflicts.push({ ...selection, reason: "The canonical skill path is not a real directory." });
      continue;
    }
    let actualHash;
    try {
      actualHash = await calculateSkillDirectoryHash(path);
    } catch (error) {
      result.conflicts.push({ ...selection, reason: error.message });
      continue;
    }
    if (actualHash !== resource.source.contentSha256) {
      result.conflicts.push({ ...selection, actualHash, reason: "Installed skill contents do not match the approved manifest." });
    } else if (!lockEntryMatches(lock.skills?.[resource.name], resource)) {
      result.metadataUpdates.push(selection);
    } else {
      result.synced.push(selection);
    }
  }
  return result;
}

function summarizeLegacyPlan(plan) {
  return {
    missingCount: plan.missing.length,
    missingSkills: plan.missing.map(({ skill }) => skill.name).sort(),
    metadataUpdateCount: plan.metadataUpdates.length,
    metadataUpdates: plan.metadataUpdates.map(({ skill }) => skill.name).sort(),
    syncedCount: plan.synced.length,
    conflictCount: plan.conflicts.length,
    conflicts: plan.conflicts.map(({ skill, reason }) => ({ name: skill.name, reason })),
  };
}

export function buildInstallerArguments({ sourceDirectory, names, agents }) {
  assertCondition(typeof sourceDirectory === "string" && isAbsolute(sourceDirectory), "The staged source directory must be absolute.");
  assertCondition(Array.isArray(names) && names.length > 0, "The installer requires explicit skill names.");
  assertCondition(Array.isArray(agents) && agents.length === 1 && agents[0] === "codex", "Canonical installation uses the Codex-compatible Agent Skills target exactly once.");
  for (const name of names) assertCondition(/^[a-z0-9][a-z0-9.-]*$/.test(name), `Unsafe skill name: ${name}.`);
  return ["add", sourceDirectory, "--global", "--agent", "codex", "--skill", ...names, "--yes"];
}

export async function ensureRequestedAgentLinks(selections, { homeDirectory, agents }) {
  const created = [];
  if (!agents.includes("claude-code")) return created;
  const claudeRoot = join(homeDirectory, ".claude");
  const metadata = await lstat(claudeRoot).catch((error) => error?.code === "ENOENT" ? null : Promise.reject(error));
  assertCondition(metadata?.isDirectory() && !metadata.isSymbolicLink(), "Claude Code was requested but ~/.claude is not a real directory.");
  const linksRoot = join(claudeRoot, "skills");
  await mkdir(linksRoot, { recursive: true, mode: 0o700 });
  for (const selection of selections) {
    const name = selection.resource?.name ?? selection.skill?.name;
    assertCondition(/^[a-z0-9][a-z0-9.-]*$/.test(name ?? ""), "Claude link selection requires a safe skill name.");
    const canonical = join(homeDirectory, ".agents", "skills", name);
    const destination = join(linksRoot, name);
    const current = await lstat(destination).catch((error) => error?.code === "ENOENT" ? null : Promise.reject(error));
    if (current) {
      if (!current.isSymbolicLink()) throw new Error(`Refusing to overwrite existing Claude skill: ${destination}.`);
      const target = resolve(dirname(destination), await readlink(destination));
      assertCondition(await realpath(target) === await realpath(canonical), `Refusing to replace an unrelated Claude skill link: ${destination}.`);
      continue;
    }
    await symlink(relative(linksRoot, canonical), destination, "dir");
    created.push(destination);
  }
  return created;
}

async function verifyUpstreamLicense(resource, directory) {
  const contents = await readBoundedPortableFile(directory, resource.source.licensePath);
  if (resource.source.license === "MIT") assertCondition(contents.includes("Permission is hereby granted"), `Source ${resource.source.repository} does not contain the expected MIT license.`);
  else if (resource.source.license === "Apache-2.0") assertCondition(contents.includes("Apache License") && contents.includes("Version 2.0"), `Source ${resource.source.repository} does not contain the expected Apache-2.0 license.`);
  else throw new Error(`Unsupported upstream license for ${resource.source.repository}.`);
}

async function stageGithubResource(resource, stagingRoot, cache) {
  const key = `${resource.source.repository}@${resource.source.revision}`;
  let directory = cache.get(key);
  if (!directory) {
    directory = join(stagingRoot, resource.source.repository.replace("/", "--"));
    const environment = { ...process.env, GIT_TERMINAL_PROMPT: "0" };
    await runCommand("git", ["init", "--quiet", directory], { env: environment });
    await runCommand("git", ["-C", directory, "remote", "add", "origin", `https://github.com/${resource.source.repository}.git`], { env: environment });
    await runCommand("git", ["-C", directory, "fetch", "--quiet", "--depth", "1", "origin", resource.source.revision], { env: environment });
    await runCommand("git", ["-C", directory, "checkout", "--quiet", "--detach", "FETCH_HEAD"], { env: environment });
    cache.set(key, directory);
  }
  const revision = (await runCommand("git", ["-C", directory, "rev-parse", "HEAD"])).stdout.trim();
  assertCondition(revision === resource.source.revision, `The staged ${resource.source.repository} revision changed unexpectedly.`);
  await verifyUpstreamLicense(resource, directory);
  const upstreamDirectory = resource.source.upstreamPath === "SKILL.md" ? "." : dirname(resource.source.upstreamPath);
  const tree = upstreamDirectory === "." ? revision : (await runCommand("git", ["-C", directory, "rev-parse", `${revision}:${upstreamDirectory}`])).stdout.trim();
  assertCondition(tree === resource.source.upstreamTreeHash, `Unexpected upstream Git tree for ${resource.name}.`);
  assertCondition(await calculatePortableDirectoryHash(join(directory, upstreamDirectory)) === resource.source.contentSha256, `Pinned source contents do not match ${resource.name}.`);
  assertCondition(await readPortableSkillName(join(directory, upstreamDirectory)) === resource.name, `Pinned source frontmatter name does not match ${resource.name}.`);
  return directory;
}

export function verifyInstallerArchiveIntegrity(contents, expected) {
  const [algorithm, value] = expected.split("-", 2);
  assertCondition(algorithm === "sha512" && value, "Unsupported installer integrity value.");
  return createHash(algorithm).update(contents).digest("base64") === value;
}

export function validateInstallerLock(lock, manifest) {
  assertCondition(lock?.lockfileVersion === 3 && lock.packages && typeof lock.packages === "object", "Installer lock must use npm lockfile version 3.");
  assertCondition(lock.packages[""]?.dependencies?.skills === manifest.installer.version, "Installer lock root does not pin the approved Skills CLI version.");
  for (const [path, entry] of Object.entries(lock.packages)) {
    if (path === "") continue;
    assertCondition(path.startsWith("node_modules/") && /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(entry.version ?? ""), `Installer dependency ${path} requires an exact version.`);
    assertCondition(/^https:\/\/registry\.npmjs\.org\/.+\.tgz$/.test(entry.resolved ?? ""), `Installer dependency ${path} requires an approved npm registry artifact.`);
    assertCondition(/^sha512-[A-Za-z0-9+/]+={0,2}$/.test(entry.integrity ?? ""), `Installer dependency ${path} requires SHA-512 integrity.`);
  }
  const skills = lock.packages["node_modules/skills"];
  assertCondition(skills?.version === manifest.installer.version && skills.integrity === manifest.installer.integrity, "Installer lock Skills CLI artifact differs from desired state.");
  return lock;
}

async function resolvePinnedInstaller(manifest, stagingRoot) {
  const runtime = join(stagingRoot, "installer-runtime");
  const cache = join(stagingRoot, "npm-cache");
  await mkdir(runtime, { recursive: true });
  const lock = validateInstallerLock(JSON.parse(await readFile(INSTALLER_LOCK, "utf8")), manifest);
  await writeFile(join(runtime, "package.json"), `${JSON.stringify({
    name: "qs-skills-installer-lock",
    private: true,
    dependencies: { skills: manifest.installer.version },
  }, null, 2)}\n`, { mode: 0o600 });
  await writeFile(join(runtime, "package-lock.json"), `${JSON.stringify(lock, null, 2)}\n`, { mode: 0o600 });
  await runCommand("npm", [
    "ci",
    "--ignore-scripts",
    "--no-audit",
    "--no-fund",
    "--prefix",
    runtime,
    "--cache",
    cache,
  ]);
  const packageRoot = join(runtime, "node_modules", "skills");
  const packageMetadata = JSON.parse(await readFile(join(packageRoot, "package.json"), "utf8"));
  assertCondition(packageMetadata.version === PINNED_INSTALLER_VERSION && manifest.installer.integrity === PINNED_INSTALLER_INTEGRITY, "Extracted installer version is not approved.");
  const executable = join(packageRoot, "bin", "cli.mjs");
  const version = await runCommand(process.execPath, [executable, "--version"]);
  assertCondition(version.stdout.trim() === PINNED_INSTALLER_VERSION, "Installer executable version differs from its package metadata.");
  return { command: process.execPath, prefix: [executable] };
}

function parseArguments(arguments_) {
  const [action, ...flags] = arguments_;
  assertCondition(["inventory", "adopt", "plan", "sync", "verify"].includes(action), "Usage: sync-personal-skills.mjs [inventory|adopt|plan|sync|verify] [options]");
  const options = { action, json: false, agents: [], manifestPath: DEFAULT_MANIFEST, homeDirectory: homedir() };
  const valueFlags = new Map([
    ["--agent", "agent"], ["--target", "agent"], ["--manifest", "manifestPath"], ["--home", "homeDirectory"],
    ["--candidate", "candidateIdentity"], ["--state-token", "expectedStateToken"], ["--type", "resourceType"],
    ["--license", "license"], ["--license-path", "licensePath"], ["--integrity", "packageIntegrity"], ["--source-directory", "sourceDirectory"],
  ]);
  for (let index = 0; index < flags.length; index += 1) {
    const flag = flags[index];
    if (flag === "--json") { options.json = true; continue; }
    const key = valueFlags.get(flag);
    assertCondition(key, `Unknown personal skill option: ${flag}.`);
    const value = flags[index + 1];
    assertCondition(value && !value.startsWith("--"), `Missing value for ${flag}.`);
    if (key === "agent") {
      assertCondition(SUPPORTED_AGENTS.has(value), `Unsupported agent target: ${value}.`);
      options.agents.push(value);
    } else if (["manifestPath", "homeDirectory", "sourceDirectory"].includes(key)) options[key] = resolve(value);
    else options[key] = value;
    index += 1;
  }
  options.agents = [...new Set(options.agents.length ? options.agents : ["codex"])];
  return options;
}

function writeOutput(value, json) {
  if (json) process.stdout.write(`${JSON.stringify(value)}\n`);
  else process.stdout.write(`${value.message ?? JSON.stringify(value, null, 2)}\n`);
}

export async function execute(options, { write = writeOutput } = {}) {
  const manifest = await loadManifest(options.manifestPath);
  if (options.action === "inventory") {
    const report = await inventoryMachine({ manifest, homeDirectory: options.homeDirectory });
    write({ action: "inventory", ...report }, options.json);
    return report;
  }
  if (options.action === "adopt") {
    const result = await adoptInventoryCandidate({
      manifestPath: options.manifestPath,
      homeDirectory: options.homeDirectory,
      candidateIdentity: options.candidateIdentity,
      expectedStateToken: options.expectedStateToken,
      resourceType: options.resourceType,
      targets: options.agents,
      license: options.license,
      licensePath: options.licensePath,
      sourceDirectory: options.sourceDirectory,
      packageIntegrity: options.packageIntegrity,
    });
    write({ action: "adopt", adopted: result.resource.name, resource: result.resource }, options.json);
    return result;
  }

  const plan = await buildReconciliationPlan({ manifest, homeDirectory: options.homeDirectory, targets: options.agents });
  const summary = {
    action: options.action,
    targets: plan.targets,
    operationCount: plan.operations.length,
    operations: plan.operations.map(({ kind, name }) => ({ kind, name })),
    conflictCount: plan.conflicts.length,
    conflicts: plan.conflicts,
    externalActionCount: plan.externalActions.length,
    externalActions: plan.externalActions,
    states: plan.states,
  };
  if (options.action === "plan") {
    write(summary, options.json);
    if (plan.conflicts.length) process.exitCode = 1;
    return summary;
  }
  if (options.action === "verify") {
    assertCondition(!plan.operations.length && !plan.conflicts.length && !plan.externalActions.length, "Personal skill verification found unresolved reconciliation work.");
    write(summary, options.json);
    return summary;
  }

  assertCondition(!plan.conflicts.length, "Refusing to synchronize while reconciliation conflicts exist.");
  const needsInstall = plan.operations.some((operation) => operation.kind === "install-agent-skill");
  const staging = await mkdtemp(join(tmpdir(), "quickstark-personal-sync-"));
  const sourceCache = new Map();
  try {
    const installer = needsInstall ? await resolvePinnedInstaller(manifest, staging) : null;
    const result = await applyHarnessProjections(plan, {
      homeDirectory: options.homeDirectory,
      installAgentSkill: async (resource) => {
        const sourceDirectory = await stageGithubResource(resource, staging, sourceCache);
        await runCommand(installer.command, [
          ...installer.prefix,
          ...buildInstallerArguments({ sourceDirectory, names: [resource.name], agents: ["codex"] }),
        ], {
          cwd: repositoryRoot,
          env: {
            ...process.env,
            HOME: options.homeDirectory,
            CODEX_HOME: join(options.homeDirectory, ".codex"),
            GIT_TERMINAL_PROMPT: "0",
            DO_NOT_TRACK: "1",
          },
        });
      },
    });
    const final = await buildReconciliationPlan({ manifest, homeDirectory: options.homeDirectory, targets: options.agents });
    assertCondition(!final.operations.length && !final.conflicts.length, "Post-synchronization verification failed.");
    const output = { ...summary, action: "sync", createdCount: result.created.length, externalActions: final.externalActions, externalActionCount: final.externalActions.length };
    write(output, options.json);
    return output;
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
}

const invokedDirectly = process.argv[1] !== undefined && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (invokedDirectly) {
  try {
    await execute(parseArguments(process.argv.slice(2)));
  } catch (error) {
    process.stderr.write(`Personal skills failed: ${error.message}\n`);
    process.exitCode = 1;
  }
}
