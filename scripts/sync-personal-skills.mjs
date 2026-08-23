import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import {
  chmod,
  lstat,
  mkdir,
  mkdtemp,
  open,
  readFile,
  readdir,
  readlink,
  realpath,
  rename,
  rm,
  stat,
  symlink,
  writeFile,
} from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { basename, dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";

const runFile = promisify(execFile);
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_MANIFEST = join(repositoryRoot, "config", "personal-skills.manifest.json");
const PINNED_INSTALLER_VERSION = "1.5.23";
const EXPECTED_SKILL_COUNT = 18;
const SUPPORTED_AGENTS = new Set(["codex", "claude-code"]);

export const APPROVED_SOURCES = Object.freeze({
  "heygen-com/hyperframes": Object.freeze({
    revision: "de4062a93300cbe1826edfbd8d71fbc44be25cb7",
    license: "Apache-2.0",
  }),
  "Leonxlnx/taste-skill": Object.freeze({
    revision: "e988add20dab0fa97d7a76781c48961c8184288e",
    license: "MIT",
  }),
  "vercel-labs/skills": Object.freeze({
    revision: "c6f69c631292444cc541ac6d91e2226b0ff247da",
    license: "MIT",
  }),
  "Leonxlnx/unlazy": Object.freeze({
    revision: "754d9a68109e39b836cc72a39fb9a823f9d6b613",
    license: "MIT",
  }),
});

function assertCondition(condition, message) {
  if (!condition) throw new Error(message);
}

function assertSafeRelativePath(value, label) {
  assertCondition(typeof value === "string" && value.length > 0, `${label} is required.`);
  assertCondition(!isAbsolute(value) && !value.includes("\\"), `${label} must be a safe relative path.`);
  const segments = value.split("/");
  assertCondition(!segments.some((segment) => segment === "" || segment === "." || segment === ".."), `${label} must be a safe relative path.`);
}

export function validateManifest(manifest) {
  assertCondition(manifest && typeof manifest === "object" && !Array.isArray(manifest), "The personal skills manifest must be an object.");
  assertCondition(manifest.schemaVersion === 1, "Unsupported personal skills manifest schema version.");
  assertCondition(manifest.installer?.package === "skills" && manifest.installer?.version === PINNED_INSTALLER_VERSION, `The pinned installer must be skills ${PINNED_INSTALLER_VERSION}.`);
  assertCondition(manifest.canonicalDirectory === "~/.agents/skills", "The canonical skills directory must be ~/.agents/skills.");
  assertCondition(Array.isArray(manifest.sources) && manifest.sources.length === Object.keys(APPROVED_SOURCES).length, "The manifest must contain exactly the approved source repositories.");

  const seenRepositories = new Set();
  const seenSkills = new Set();
  for (const source of manifest.sources) {
    const approved = APPROVED_SOURCES[source?.repository];
    assertCondition(approved, `Unapproved source repository: ${source?.repository ?? "unknown"}.`);
    assertCondition(!seenRepositories.has(source.repository), `Duplicate approved source: ${source.repository}.`);
    seenRepositories.add(source.repository);
    assertCondition(/^[a-f0-9]{40}$/.test(source.revision), `Source ${source.repository} requires an immutable revision.`);
    assertCondition(source.revision === approved.revision, `Unexpected immutable revision for ${source.repository}.`);
    assertCondition(source.license === approved.license, `Unexpected upstream license for ${source.repository}.`);
    assertCondition(source.licensePath === "LICENSE", `Unexpected upstream license path for ${source.repository}.`);
    assertCondition(Array.isArray(source.skills) && source.skills.length > 0, `Source ${source.repository} has no selected skills.`);

    for (const skill of source.skills) {
      assertCondition(typeof skill.name === "string" && /^[a-z0-9][a-z0-9.-]*$/.test(skill.name), "Each personal skill requires a safe lowercase name.");
      assertCondition(!seenSkills.has(skill.name), `Duplicate skill in the manifest: ${skill.name}.`);
      seenSkills.add(skill.name);
      assertSafeRelativePath(skill.upstreamPath, `Upstream path for ${skill.name}`);
      assertCondition(skill.upstreamPath === "SKILL.md" || skill.upstreamPath.endsWith("/SKILL.md"), `Upstream path for ${skill.name} must resolve to SKILL.md.`);
      assertCondition(/^[a-f0-9]{40}$/.test(skill.upstreamTreeHash), `Skill ${skill.name} requires an approved upstream Git tree hash.`);
      assertCondition(/^[a-f0-9]{64}$/.test(skill.contentSha256), `Skill ${skill.name} requires an approved content SHA-256 hash.`);
      if (skill.pluginName !== undefined) {
        assertCondition(typeof skill.pluginName === "string" && /^[a-z0-9-]+$/.test(skill.pluginName), `Invalid plugin grouping for ${skill.name}.`);
      }
    }
  }
  assertCondition(seenSkills.size === EXPECTED_SKILL_COUNT, `The manifest must contain exactly ${EXPECTED_SKILL_COUNT} personal skills.`);
  return manifest;
}

export async function loadManifest(path = DEFAULT_MANIFEST) {
  const contents = await readFile(path, "utf8");
  return validateManifest(JSON.parse(contents));
}

export async function calculateSkillDirectoryHash(root) {
  const files = [];
  async function collect(current) {
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const path = join(current, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== ".git" && entry.name !== "node_modules") await collect(path);
      } else if (entry.isFile()) {
        files.push({
          relativePath: relative(root, path).split("\\").join("/"),
          content: await readFile(path),
        });
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

function desiredLockFields(source, skill) {
  return {
    source: source.repository,
    sourceType: "github",
    sourceUrl: `https://github.com/${source.repository}.git`,
    ref: source.revision,
    skillPath: skill.upstreamPath,
    skillFolderHash: skill.upstreamTreeHash,
    ...(skill.pluginName ? { pluginName: skill.pluginName } : {}),
  };
}

function metadataMatches(entry, source, skill) {
  if (!entry || typeof entry !== "object") return false;
  const expected = desiredLockFields(source, skill);
  return Object.entries(expected).every(([key, value]) => entry[key] === value);
}

export function reconcileSkillLock(original, selections, timestamp = new Date().toISOString()) {
  const initial = original ?? { version: 3, skills: {} };
  assertCondition(initial.version === 3 && initial.skills && typeof initial.skills === "object", "The existing global skill lock must use version 3.");
  const lock = structuredClone(initial);
  let changed = false;

  for (const { source, skill } of selections) {
    const current = lock.skills[skill.name];
    if (metadataMatches(current, source, skill)) continue;
    const expected = desiredLockFields(source, skill);
    lock.skills[skill.name] = {
      ...(current ?? {}),
      ...expected,
      installedAt: current?.installedAt ?? timestamp,
      updatedAt: timestamp,
    };
    changed = true;
  }
  return { lock, changed };
}

async function readGlobalLock(path) {
  try {
    const value = JSON.parse(await readFile(path, "utf8"));
    assertCondition(value.version === 3 && value.skills && typeof value.skills === "object", `Unsupported global skill lock at ${path}.`);
    return value;
  } catch (error) {
    if (error?.code === "ENOENT") return { version: 3, skills: {} };
    throw error;
  }
}

function canonicalRoot(homeDirectory) {
  return join(homeDirectory, ".agents", "skills");
}

export async function buildPlan(manifest, { homeDirectory = homedir(), lock } = {}) {
  const globalLock = lock ?? await readGlobalLock(join(homeDirectory, ".agents", ".skill-lock.json"));
  const result = { missing: [], synced: [], metadataUpdates: [], conflicts: [] };

  for (const source of manifest.sources) {
    for (const skill of source.skills) {
      const selection = { source, skill };
      const path = join(canonicalRoot(homeDirectory), skill.name);
      let details;
      try {
        details = await lstat(path);
      } catch (error) {
        if (error?.code === "ENOENT") {
          result.missing.push(selection);
          continue;
        }
        throw error;
      }
      if (!details.isDirectory() || details.isSymbolicLink()) {
        result.conflicts.push({ ...selection, reason: "The canonical skill path is not a real directory." });
        continue;
      }
      const actualHash = await calculateSkillDirectoryHash(path);
      if (actualHash !== skill.contentSha256) {
        result.conflicts.push({ ...selection, actualHash, reason: "Installed skill contents do not match the approved manifest." });
        continue;
      }
      if (!metadataMatches(globalLock.skills[skill.name], source, skill)) {
        result.metadataUpdates.push(selection);
      } else {
        result.synced.push(selection);
      }
    }
  }
  return result;
}

function summarizePlan(plan) {
  return {
    missingCount: plan.missing.length,
    missingSkills: plan.missing.map(({ skill }) => skill.name).sort((first, second) => first.localeCompare(second)),
    metadataUpdateCount: plan.metadataUpdates.length,
    metadataUpdates: plan.metadataUpdates.map(({ skill }) => skill.name).sort((first, second) => first.localeCompare(second)),
    syncedCount: plan.synced.length,
    conflictCount: plan.conflicts.length,
    conflicts: plan.conflicts.map(({ skill, reason }) => ({ name: skill.name, reason })),
  };
}

export function buildInstallerArguments({ sourceDirectory, names, agents }) {
  assertCondition(typeof sourceDirectory === "string" && isAbsolute(sourceDirectory), "The staged source directory must be absolute.");
  assertCondition(Array.isArray(names) && names.length > 0, "The installer requires explicit skill names.");
  assertCondition(Array.isArray(agents) && agents.length > 0, "The installer requires explicit agent targets.");
  for (const name of names) assertCondition(/^[a-z0-9][a-z0-9.-]*$/.test(name), `Unsafe skill name: ${name}.`);
  for (const agent of agents) assertCondition(SUPPORTED_AGENTS.has(agent), `Unsupported agent target: ${agent}.`);
  return ["add", sourceDirectory, "--global", "--agent", ...agents, "--skill", ...names, "--yes"];
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
    const details = String(error.stderr || error.stdout || error.message).trim().slice(0, 1600);
    throw new Error(`${basename(command)} ${arguments_[0] ?? ""} failed: ${details}`);
  }
}

async function findCachedInstaller(homeDirectory, expectedVersion) {
  const cacheRoot = join(homeDirectory, ".npm", "_npx");
  let entries = [];
  try {
    entries = await readdir(cacheRoot, { withFileTypes: true });
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const packagePath = join(cacheRoot, entry.name, "node_modules", "skills", "package.json");
    try {
      const value = JSON.parse(await readFile(packagePath, "utf8"));
      if (value.version !== expectedVersion) continue;
      const executable = join(dirname(packagePath), "bin", "cli.mjs");
      const result = await runCommand(process.execPath, [executable, "--version"]);
      assertCondition(result.stdout.trim() === expectedVersion, "The cached Skills CLI version does not match its package metadata.");
      return { command: process.execPath, prefix: [executable], version: expectedVersion, cached: true };
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }

  return null;
}

async function resolvePinnedInstaller(homeDirectory, expectedVersion) {
  const cached = await findCachedInstaller(homeDirectory, expectedVersion);
  if (cached) return cached;

  const arguments_ = ["--yes", `skills@${expectedVersion}`, "--version"];
  const result = await runCommand("npx", arguments_);
  assertCondition(result.stdout.trim().split(/\s+/).at(-1) === expectedVersion, `Unable to resolve pinned Skills CLI ${expectedVersion}.`);
  return { command: "npx", prefix: ["--yes", `skills@${expectedVersion}`], version: expectedVersion, cached: false };
}

async function verifyUpstreamLicense(source, directory) {
  const contents = await readFile(join(directory, source.licensePath), "utf8");
  if (source.license === "MIT") {
    assertCondition(contents.includes("Permission is hereby granted"), `Source ${source.repository} does not contain the expected MIT license.`);
  } else if (source.license === "Apache-2.0") {
    assertCondition(contents.includes("Apache License") && contents.includes("Version 2.0"), `Source ${source.repository} does not contain the expected Apache-2.0 license.`);
  } else {
    throw new Error(`Unsupported upstream license for ${source.repository}.`);
  }
}

async function stageSource(source, root) {
  const directory = join(root, source.repository.replace("/", "--"));
  await mkdir(directory, { recursive: true });
  const environment = { ...process.env, GIT_TERMINAL_PROMPT: "0" };
  await runCommand("git", ["init", "--quiet", directory], { env: environment });
  await runCommand("git", ["-C", directory, "remote", "add", "origin", `https://github.com/${source.repository}.git`], { env: environment });
  await runCommand("git", ["-C", directory, "fetch", "--quiet", "--depth", "1", "origin", source.revision], { env: environment });
  await runCommand("git", ["-C", directory, "checkout", "--quiet", "--detach", "FETCH_HEAD"], { env: environment });
  const revision = (await runCommand("git", ["-C", directory, "rev-parse", "HEAD"], { env: environment })).stdout.trim();
  assertCondition(revision === source.revision, `The staged ${source.repository} revision changed unexpectedly.`);
  await verifyUpstreamLicense(source, directory);

  for (const skill of source.skills) {
    const upstreamDirectory = skill.upstreamPath === "SKILL.md" ? "." : dirname(skill.upstreamPath);
    if (upstreamDirectory === ".") {
      assertCondition(source.revision === skill.upstreamTreeHash, `Unexpected root Git identifier for ${skill.name}.`);
    } else {
      const tree = (await runCommand("git", ["-C", directory, "rev-parse", `${source.revision}:${upstreamDirectory}`], { env: environment })).stdout.trim();
      assertCondition(tree === skill.upstreamTreeHash, `Unexpected upstream Git tree hash for ${skill.name}.`);
    }
    const actual = await calculateSkillDirectoryHash(join(directory, upstreamDirectory));
    assertCondition(actual === skill.contentSha256, `Pinned source contents do not match the approved SHA-256 for ${skill.name}.`);
  }
  return directory;
}

async function reconcileGlobalLock(path, selections) {
  await mkdir(dirname(path), { recursive: true });
  const guard = `${path}.quickstark-sync.lock`;
  let handle;
  try {
    handle = await open(guard, "wx", 0o600);
  } catch (error) {
    if (error?.code === "EEXIST") throw new Error(`Another process is updating the global skill lock: ${path}.`);
    throw error;
  }

  let temporary;
  try {
    const current = await readGlobalLock(path);
    const result = reconcileSkillLock(current, selections);
    if (!result.changed) return false;
    let mode = 0o600;
    try {
      mode = (await stat(path)).mode & 0o777;
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
    temporary = join(dirname(path), `.${basename(path)}.${process.pid}.${Date.now()}.tmp`);
    await writeFile(temporary, `${JSON.stringify(result.lock, null, 2)}\n`, { mode });
    await chmod(temporary, mode);
    const file = await open(temporary, "r");
    try {
      await file.sync();
    } finally {
      await file.close();
    }
    await rename(temporary, path);
    temporary = undefined;
    return true;
  } finally {
    if (temporary) await rm(temporary, { force: true }).catch(() => {});
    await handle.close();
    await rm(guard, { force: true });
  }
}

export async function ensureRequestedAgentLinks(selections, { homeDirectory, agents }) {
  const created = [];
  if (!agents.includes("claude-code")) return created;
  const claudeRoot = join(homeDirectory, ".claude");
  const details = await stat(claudeRoot).catch(() => null);
  assertCondition(details?.isDirectory(), "Claude Code was requested but ~/.claude does not exist.");
  const destinationRoot = join(claudeRoot, "skills");
  await mkdir(destinationRoot, { recursive: true });

  for (const { skill } of selections) {
    const destination = join(destinationRoot, skill.name);
    const canonical = join(canonicalRoot(homeDirectory), skill.name);
    try {
      const current = await lstat(destination);
      if (!current.isSymbolicLink()) throw new Error(`Refusing to overwrite existing Claude skill: ${destination}.`);
      const target = resolve(dirname(destination), await readlink(destination));
      assertCondition(target === await realpath(canonical), `Refusing to replace an unrelated Claude skill link: ${destination}.`);
      continue;
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
    await symlink(relative(destinationRoot, canonical), destination, "dir");
    created.push(destination);
  }
  return created;
}

function selectionsForManifest(manifest) {
  return manifest.sources.flatMap((source) => source.skills.map((skill) => ({ source, skill })));
}

function parseArguments(arguments_) {
  const [action, ...flags] = arguments_;
  assertCondition(["plan", "sync", "verify"].includes(action), "Usage: sync-personal-skills.mjs [plan|sync|verify] [--json] [--agent codex|claude-code]");
  let json = false;
  const explicitAgents = [];
  for (let index = 0; index < flags.length; index += 1) {
    const flag = flags[index];
    if (flag === "--json") json = true;
    else if (flag === "--agent") {
      const agent = flags[index + 1];
      assertCondition(SUPPORTED_AGENTS.has(agent), `Unsupported agent target: ${agent ?? "missing"}.`);
      explicitAgents.push(agent);
      index += 1;
    } else {
      throw new Error(`Unknown personal skill option: ${flag}.`);
    }
  }
  return { action, json, agents: [...new Set(explicitAgents.length ? explicitAgents : ["codex"])] };
}

function printSummary(action, summary, json) {
  const output = { action, ...summary };
  if (json) {
    process.stdout.write(`${JSON.stringify(output)}\n`);
    return;
  }
  const parts = [
    `missing=${summary.missingCount}`,
    `metadata=${summary.metadataUpdateCount}`,
    `synced=${summary.syncedCount}`,
    `conflicts=${summary.conflictCount}`,
  ];
  if (summary.installedCount !== undefined) parts.push(`installed=${summary.installedCount}`);
  if (summary.installerVersion) parts.push(`installer=${summary.installerVersion}`);
  process.stdout.write(`Personal skills ${action}: ${parts.join(" ")}\n`);
  if (summary.missingSkills?.length) process.stdout.write(`Missing skills: ${summary.missingSkills.join(", ")}\n`);
  if (summary.conflicts?.length) process.stderr.write(`Conflicts: ${summary.conflicts.map(({ name }) => name).join(", ")}\n`);
}

export async function execute({ action, json = false, agents = ["codex"], manifestPath = DEFAULT_MANIFEST, homeDirectory = homedir() }) {
  const manifest = await loadManifest(manifestPath);
  const initial = await buildPlan(manifest, { homeDirectory });
  const initialSummary = summarizePlan(initial);

  if (action === "plan") {
    printSummary(action, initialSummary, json);
    if (initial.conflicts.length) process.exitCode = 1;
    return initialSummary;
  }

  if (action === "verify") {
    const summary = {
      ...initialSummary,
      pinnedInstallerVersion: manifest.installer.version,
    };
    printSummary(action, summary, json);
    assertCondition(!initial.missing.length && !initial.metadataUpdates.length && !initial.conflicts.length, "Personal skill verification failed because installed skills or source metadata do not match the manifest.");
    return summary;
  }

  assertCondition(!initial.conflicts.length, "Refusing to overwrite conflicting existing personal skills.");
  const managed = selectionsForManifest(manifest);
  if (!initial.missing.length && !initial.metadataUpdates.length) {
    const createdLinks = await ensureRequestedAgentLinks(managed, { homeDirectory, agents });
    const summary = {
      ...initialSummary,
      installedCount: 0,
      metadataChanged: false,
      createdAgentLinks: createdLinks.length,
    };
    printSummary(action, summary, json);
    return summary;
  }

  const installer = initial.missing.length
    ? await resolvePinnedInstaller(homeDirectory, manifest.installer.version)
    : null;
  const staging = await mkdtemp(join(tmpdir(), "quickstark-personal-skills-"));
  const missingNames = new Set(initial.missing.map(({ skill }) => skill.name));
  const createdLinks = [];
  try {
    for (const source of manifest.sources) {
      const missing = source.skills.filter((skill) => missingNames.has(skill.name));
      if (!missing.length) continue;
      const directory = await stageSource(source, staging);
      const arguments_ = buildInstallerArguments({
        sourceDirectory: directory,
        names: missing.map((skill) => skill.name),
        agents: ["codex"],
      });
      await runCommand(installer.command, [...installer.prefix, ...arguments_], {
        cwd: repositoryRoot,
        env: { ...process.env, GIT_TERMINAL_PROMPT: "0", DO_NOT_TRACK: "1" },
      });
    }

    const afterInstall = await buildPlan(manifest, { homeDirectory });
    assertCondition(!afterInstall.missing.length && !afterInstall.conflicts.length, "Installer did not reproduce the approved personal skill contents.");
    createdLinks.push(...await ensureRequestedAgentLinks(managed, { homeDirectory, agents }));
    const metadataChanged = await reconcileGlobalLock(join(homeDirectory, ".agents", ".skill-lock.json"), managed);
    const final = await buildPlan(manifest, { homeDirectory });
    assertCondition(!final.missing.length && !final.metadataUpdates.length && !final.conflicts.length, "Post-installation skill verification failed.");
    const summary = {
      ...summarizePlan(final),
      installedCount: initial.missing.length,
      metadataChanged,
      createdAgentLinks: createdLinks.length,
      ...(installer ? { installerVersion: installer.version } : {}),
    };
    printSummary(action, summary, json);
    return summary;
  } catch (error) {
    for (const path of createdLinks.reverse()) await rm(path, { force: true }).catch(() => {});
    for (const name of missingNames) {
      await rm(join(canonicalRoot(homeDirectory), name), { recursive: true, force: true }).catch(() => {});
    }
    throw error;
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
}

const invokedDirectly = process.argv[1] !== undefined
  && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (invokedDirectly) {
  try {
    await execute(parseArguments(process.argv.slice(2)));
  } catch (error) {
    process.stderr.write(`Personal skills failed: ${error.message}\n`);
    process.exitCode = 1;
  }
}
