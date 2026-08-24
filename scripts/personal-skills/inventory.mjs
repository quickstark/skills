import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { lstat, readFile, readdir, readlink, realpath } from "node:fs/promises";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import { promisify } from "node:util";

import {
  DEFAULT_PORTABLE_LIMITS,
  assertSafeRelativePath,
  inspectPortableDirectory,
  inspectPortableSkillFile,
  readPortableSkillName,
} from "./filesystem.mjs";
import { agentSkillResources, normalizeManifest, piPackageResources } from "./manifest.mjs";
import { lockEntryMatches } from "./lock.mjs";
import {
  discoverPiPackageSkills,
  discoverPiSkills,
  normalizePiSettingsSkillSelectors,
  opaquePiSelectorIdentity,
  piSkillFilterAllows,
} from "./pi-discovery.mjs";

const runFile = promisify(execFile);

export const DEFAULT_INVENTORY_LIMITS = Object.freeze({
  ...DEFAULT_PORTABLE_LIMITS,
  maximumSurfaceEntries: 4_096,
  maximumSettingsBytes: 1024 * 1024,
});

function homeRelative(homeDirectory, path) {
  const fromHome = relative(homeDirectory, path);
  if (fromHome === "") return "~";
  if (fromHome === ".." || fromHome.startsWith(`..${sep}`)) throw new Error("Inventory path escaped the selected home directory.");
  return `~/${fromHome.split(sep).join("/")}`;
}

async function readJsonFile(path, maximumBytes, fallback) {
  try {
    const metadata = await lstat(path);
    if (!metadata.isFile() || metadata.isSymbolicLink() || metadata.size > maximumBytes) {
      throw new Error(`Inventory input must be a bounded regular file: ${basename(path)}.`);
    }
    return JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return fallback;
    throw error;
  }
}

function immutableLockProvenance(entry) {
  let safePath = false;
  try {
    assertSafeRelativePath(entry?.skillPath, "Agent Skills lock path");
    safePath = entry.skillPath === "SKILL.md" || entry.skillPath.endsWith("/SKILL.md");
  } catch {
    safePath = false;
  }
  if (
    !entry
    || entry.sourceType !== "github"
    || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(entry.source ?? "")
    || !/^[a-f0-9]{40}$/.test(entry.ref ?? "")
    || !safePath
    || !/^[a-f0-9]{40}$/.test(entry.skillFolderHash ?? "")
  ) return null;
  return {
    kind: "github",
    repository: entry.source,
    revision: entry.ref,
    upstreamPath: entry.skillPath,
    upstreamTreeHash: entry.skillFolderHash,
    ...(/^[a-f0-9]{64}$/.test(entry.contentSha256 ?? "") ? { contentSha256: entry.contentSha256 } : {}),
  };
}

async function listDirectory(path, maximumEntries) {
  try {
    const metadata = await lstat(path);
    if (!metadata.isDirectory() || metadata.isSymbolicLink()) throw new Error(`Inventory root must be a real directory: ${basename(path)}.`);
    const entries = await readdir(path, { withFileTypes: true });
    if (entries.length > maximumEntries) throw new Error(`Inventory surface exceeds its entry bound: ${basename(path)}.`);
    return entries.sort((first, second) => first.name.localeCompare(second.name));
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
}

async function canonicalAliasTarget(path, canonicalRoot) {
  const target = resolve(dirname(path), await readlink(path));
  const targetReal = await realpath(target);
  const rootReal = await realpath(canonicalRoot).catch(() => canonicalRoot);
  const fromRoot = relative(rootReal, targetReal);
  if (fromRoot === "" || fromRoot === ".." || fromRoot.startsWith(`..${sep}`) || fromRoot.includes(sep)) return null;
  return { target: targetReal, name: fromRoot };
}

async function scanSkillSurface({
  surface,
  path,
  homeDirectory,
  canonicalRoot,
  desiredByName,
  lockSkills,
  limits,
  ownership,
  excludedNames = [],
}) {
  const records = [];
  const entries = await listDirectory(path, limits.maximumSurfaceEntries);
  for (const entry of entries) {
    if (excludedNames.includes(entry.name)) continue;
    const entryPath = join(path, entry.name);
    const identity = `${surface}:${entry.name}`;
    if (ownership === "ignored") {
      records.push({
        identity,
        type: "agent-skill",
        surface,
        name: entry.name,
        effectiveName: entry.name,
        path: homeRelative(homeDirectory, entryPath),
        classification: "ignored",
        reason: "Harness-owned system skill.",
      });
      continue;
    }
    const metadata = await lstat(entryPath);
    if (metadata.isSymbolicLink()) {
      try {
        const alias = await canonicalAliasTarget(entryPath, canonicalRoot);
        if (!alias) throw new Error("Alias does not target one canonical skill directory.");
        records.push({
          identity,
          type: "agent-skill",
          surface,
          name: entry.name,
          effectiveName: await readPortableSkillName(alias.target, limits),
          path: homeRelative(homeDirectory, entryPath),
          classification: "alias",
          canonicalIdentity: `agent-skills:${alias.name}`,
        });
      } catch (error) {
        records.push({
          identity,
          type: "agent-skill",
          surface,
          name: entry.name,
          effectiveName: entry.name,
          path: homeRelative(homeDirectory, entryPath),
          classification: "conflict",
          reason: error.message,
        });
      }
      continue;
    }
    if (!metadata.isDirectory()) {
      if (surface === "pi-user" && metadata.isFile() && entry.name.endsWith(".md")) {
        const inspection = await inspectPortableSkillFile(entryPath, limits);
        if (!inspection.safe) {
          records.push({ identity, type: "agent-skill", surface, name: entry.name, effectiveName: entry.name, path: homeRelative(homeDirectory, entryPath), classification: "conflict", reason: inspection.reason });
          continue;
        }
        const common = { identity, type: "agent-skill", surface, name: entry.name, effectiveName: inspection.name, path: homeRelative(homeDirectory, entryPath), kind: "file", contentSha256: inspection.contentSha256 };
        if (desiredByName.has(inspection.name)) records.push({ ...common, classification: "conflict", reason: "File-backed Pi skill occupies an approved portable skill identity." });
        else if (/^(?:qs|ps)-/.test(inspection.name)) records.push({ ...common, classification: "separately-managed", reason: "QuickStark packages retain their harness-native release path." });
        else records.push({ ...common, classification: "unresolved", reason: "File-backed Pi skill has no approved portable provenance." });
        continue;
      }
      records.push({ identity, type: "agent-skill", surface, name: entry.name, effectiveName: entry.name, path: homeRelative(homeDirectory, entryPath), classification: "conflict", reason: "Skill surface entry is a special file." });
      continue;
    }
    let effectiveName = entry.name;
    try {
      effectiveName = await readPortableSkillName(entryPath, limits);
    } catch {
      // The bounded directory inspection below owns the complete diagnostic.
    }
    const inspection = await inspectPortableDirectory(entryPath, limits);
    if (!inspection.safe) {
      records.push({ identity, type: "agent-skill", surface, name: entry.name, effectiveName, path: homeRelative(homeDirectory, entryPath), classification: "conflict", reason: inspection.reason });
      continue;
    }
    const desired = desiredByName.get(entry.name);
    const common = {
      identity,
      type: "agent-skill",
      surface,
      name: entry.name,
      effectiveName,
      path: homeRelative(homeDirectory, entryPath),
      contentSha256: inspection.contentSha256,
    };
    if (effectiveName !== entry.name) {
      records.push({ ...common, classification: "conflict", reason: "Portable skill directory and frontmatter names must match." });
      continue;
    }
    if (surface === "agent-skills") {
      if (desired) {
        if (inspection.contentSha256 !== desired.source.contentSha256) {
          const provenance = immutableLockProvenance(lockSkills[entry.name]);
          const matchesPreviousManagedContent = provenance
            && (provenance.contentSha256 === inspection.contentSha256
              || provenance.upstreamTreeHash === inspection.gitTreeHash);
          records.push(matchesPreviousManagedContent
            ? {
                ...common,
                classification: "outdated-managed",
                drift: "version",
                provenance,
                reason: "Installed content matches an older managed GitHub revision.",
              }
            : { ...common, classification: "conflict", drift: "content", reason: "Installed content differs from desired state and its prior managed revision." });
        } else if (!lockEntryMatches(lockSkills[entry.name], desired)) {
          records.push({ ...common, classification: "conflict", drift: "metadata", reason: "Installed lock metadata differs from desired state." });
        } else {
          records.push({ ...common, classification: "managed" });
        }
      } else {
        const provenance = immutableLockProvenance(lockSkills[entry.name]);
        records.push(provenance
          ? { ...common, classification: "candidate", provenance }
          : { ...common, classification: "unresolved", reason: "No immutable upstream provenance is recoverable." });
      }
    } else if (/^(?:qs|ps)-/.test(effectiveName)) {
      records.push({ ...common, classification: "separately-managed", reason: "QuickStark packages retain their harness-native release path." });
    } else if (desired && inspection.contentSha256 === desired.source.contentSha256) {
      records.push({ ...common, classification: "conflict", reason: "Equivalent portable content is duplicated instead of linked to the canonical root." });
    } else {
      const provenance = immutableLockProvenance(lockSkills[entry.name]);
      records.push(provenance
        ? { ...common, classification: "candidate", provenance }
        : { ...common, classification: "unresolved", reason: "Harness-local skill has no approved portable identity." });
    }
  }
  return records;
}

async function scanPluginCache(root, homeDirectory, limits, surface, reason) {
  const records = [];
  for (const publisher of await listDirectory(root, limits.maximumSurfaceEntries)) {
    if (!publisher.isDirectory()) continue;
    const publisherPath = join(root, publisher.name);
    for (const plugin of await listDirectory(publisherPath, limits.maximumSurfaceEntries)) {
      if (!plugin.isDirectory()) continue;
      const pluginPath = join(publisherPath, plugin.name);
      for (const version of await listDirectory(pluginPath, limits.maximumSurfaceEntries)) {
        if (!version.isDirectory()) continue;
        const path = join(pluginPath, version.name);
        const providedSkills = await discoverPackageSkills(path, limits).catch(() => []);
        records.push({
          identity: `${surface}:${publisher.name}/${plugin.name}@${version.name}`,
          type: "harness-package",
          surface,
          name: `${publisher.name}/${plugin.name}`,
          path: homeRelative(homeDirectory, path),
          classification: "separately-managed",
          reason,
          ...(providedSkills.length ? { effectiveNames: providedSkills.map((skill) => `${plugin.name}:${skill.name}`) } : {}),
        });
      }
    }
  }
  return records;
}

async function discoverPackageSkills(packageRoot, limits) {
  const skills = [];
  let observedEntries = 0;
  async function visit(current) {
    const entries = await readdir(current, { withFileTypes: true });
    observedEntries += entries.length;
    if (observedEntries > limits.maximumSurfaceEntries) throw new Error("Pi package exceeds the inventory entry bound.");
    const skillFile = entries.find((entry) => entry.name === "SKILL.md");
    if (skillFile) {
      const inspection = await inspectPortableDirectory(current, limits);
      if (!inspection.safe) throw new Error(inspection.reason);
      skills.push({
        name: await readPortableSkillName(current, limits),
        path: `${relative(packageRoot, current).split(sep).join("/")}/SKILL.md`.replace(/^\.\//, ""),
        contentSha256: inspection.contentSha256,
      });
      return;
    }
    for (const entry of entries) {
      const path = join(current, entry.name);
      const metadata = await lstat(path);
      if (metadata.isSymbolicLink()) throw new Error("Pi package contains a symbolic link in its skill tree.");
      if (metadata.isDirectory()) {
        if (entry.name !== ".git" && entry.name !== "node_modules") await visit(path);
      } else if (!metadata.isFile()) {
        throw new Error("Pi package contains a special file in its skill tree.");
      }
    }
  }
  const conventional = join(packageRoot, "skills");
  const metadata = await lstat(conventional).catch((error) => error?.code === "ENOENT" ? null : Promise.reject(error));
  if (metadata) {
    if (!metadata.isDirectory() || metadata.isSymbolicLink()) throw new Error("Pi package skills root must be a real directory.");
    await visit(conventional);
  }
  return skills.sort((first, second) => first.name.localeCompare(second.name));
}

function parseNpmSpec(value) {
  if (typeof value !== "string") return null;
  const normalized = value.startsWith("npm:") ? value.slice("npm:".length) : value;
  const separator = normalized.lastIndexOf("@");
  if (separator <= 0) return null;
  const packageName = normalized.slice(0, separator);
  const version = normalized.slice(separator + 1);
  if (!packageName || !version) return null;
  return { package: packageName, version };
}

function parseGitSpec(value) {
  if (typeof value !== "string" || !value.startsWith("git:github.com/")) return null;
  const normalized = value.slice("git:github.com/".length);
  const separator = normalized.lastIndexOf("@");
  if (separator <= 0) return null;
  const repository = normalized.slice(0, separator);
  const revision = normalized.slice(separator + 1);
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository) || !/^[a-f0-9]{40}$/.test(revision)) return null;
  return { kind: "github", repository, revision };
}

function parseMutablePackageSpec(value) {
  if (typeof value !== "string") return null;
  const npmValue = value.startsWith("npm:") ? value.slice(4) : value;
  if (/^(?:@[a-z0-9_.-]+\/)?[a-z0-9_.-]+$/.test(npmValue)) return { kind: "npm", package: npmValue };
  const gitMatch = value.match(/^git:(?:https:\/\/)?github\.com\/([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+?)(?:\.git)?$/);
  if (gitMatch) return { kind: "github", repository: gitMatch[1] };
  return null;
}

async function scanPiPackages(path, homeDirectory, desired, limits, settings) {
  const configured = Array.isArray(settings.packages) ? settings.packages : [];
  const records = [];
  for (const item of configured) {
    const rawSpec = typeof item === "string" ? item : item?.source;
    const parsedNpm = parseNpmSpec(rawSpec);
    const parsedGit = parseGitSpec(rawSpec);
    const parsed = parsedGit ?? (parsedNpm ? { kind: "npm", ...parsedNpm } : null);
    if (!parsed) {
      const mutable = parseMutablePackageSpec(rawSpec);
      if (mutable) {
        const packageIdentity = mutable.kind === "npm" ? mutable.package : mutable.repository;
        const packageRoot = mutable.kind === "npm"
          ? join(homeDirectory, ".pi", "agent", "npm", "node_modules", ...mutable.package.split("/"))
          : join(homeDirectory, ".pi", "agent", "git", "github.com", ...mutable.repository.split("/"));
        try {
          const packageRootMetadata = await lstat(packageRoot);
          if (!packageRootMetadata.isDirectory() || packageRootMetadata.isSymbolicLink()) throw new Error("Mutable Pi package root is unavailable.");
          const packageMetadata = await readJsonFile(join(packageRoot, "package.json"), limits.maximumSettingsBytes, null);
          const discoveredSkills = await discoverPiPackageSkills(packageRoot, packageMetadata, limits);
          records.push({
            identity: `pi-package:${packageIdentity}`,
            type: "pi-package",
            surface: "pi-package",
            name: packageIdentity,
            path: homeRelative(homeDirectory, path),
            classification: discoveredSkills.length ? "unresolved" : "ignored",
            reason: discoveredSkills.length
              ? "Pi package contributes skills but is not pinned to an immutable source."
              : "Pi package contributes no Agent Skills.",
            ...(discoveredSkills.length ? { effectiveNames: discoveredSkills.map((skill) => skill.name) } : {}),
          });
          continue;
        } catch {
          // Fall through to a redacted unresolved record when installation state is unavailable.
        }
      }
      const opaqueIdentity = createHash("sha256").update(String(rawSpec ?? "invalid")).digest("hex").slice(0, 16);
      records.push({
        identity: `pi-package:unresolved-${opaqueIdentity}`,
        type: "pi-package",
        surface: "pi-package",
        name: `unresolved-${opaqueIdentity}`,
        path: homeRelative(homeDirectory, path),
        classification: "unresolved",
        reason: "Pi package source is local, mutable, malformed, or not pinned to an immutable version.",
      });
      continue;
    }
    const packageIdentity = parsed.kind === "npm" ? parsed.package : parsed.repository;
    const resource = desired.find((entry) => entry.source.kind === parsed.kind && (parsed.kind === "npm" ? entry.source.package === parsed.package : entry.source.repository === parsed.repository));
    let installed = false;
    let contentMatches = false;
    let installedVersion = null;
    let installationReason = null;
    const packageRoot = parsed.kind === "npm"
      ? join(homeDirectory, ".pi", "agent", "npm", "node_modules", ...parsed.package.split("/"))
      : join(homeDirectory, ".pi", "agent", "git", "github.com", ...parsed.repository.split("/"));
    let packageMetadata = null;
    if (resource) {
      try {
        const packageRootMetadata = await lstat(packageRoot);
        if (!packageRootMetadata.isDirectory() || packageRootMetadata.isSymbolicLink()) throw new Error("Installed Pi package root is unsafe.");
        if (parsed.kind === "npm") {
          packageMetadata = await readJsonFile(join(packageRoot, "package.json"), limits.maximumSettingsBytes, null);
          installedVersion = packageMetadata?.version ?? null;
          if (packageMetadata?.name !== parsed.package || installedVersion !== resource.source.version) {
            installationReason = "Installed Pi package metadata differs from desired state.";
          } else {
            installed = true;
          }
        } else {
          const revision = (await runFile("git", ["-C", packageRoot, "rev-parse", "HEAD"], { encoding: "utf8", timeout: 10_000 })).stdout.trim();
          installedVersion = revision;
          if (revision !== resource.source.revision) installationReason = "Installed Pi Git package revision differs from desired state.";
          else {
            installed = true;
            packageMetadata = await readJsonFile(join(packageRoot, "package.json"), limits.maximumSettingsBytes, null);
          }
        }
        if (installed) {
          const discoveredSkills = await discoverPiPackageSkills(packageRoot, packageMetadata, limits);
          const discoveredByPath = new Map(discoveredSkills.map((skill) => [skill.path, skill]));
          contentMatches = true;
          for (const skill of resource.skills) {
            const discovered = discoveredByPath.get(skill.path);
            if (!discovered || discovered.name !== skill.name || discovered.contentSha256 !== skill.contentSha256) {
              contentMatches = false;
              installationReason = `Installed Pi package skill ${skill.name} differs from desired state.`;
              break;
            }
          }
          if (contentMatches && item && typeof item === "object" && Object.hasOwn(item, "skills")) {
            const filters = item.skills;
            const explicitlyEnabled = resource.skills.every((skill) => piSkillFilterAllows(filters, skill));
            if (!explicitlyEnabled) {
              contentMatches = false;
              installationReason = "Pi package settings filter out one or more approved skills.";
            }
          }
        }
      } catch (error) {
        if (error?.code !== "ENOENT") installationReason = "Installed Pi package could not be verified safely.";
      }
    }
    const pinMatches = Boolean(resource && (parsed.kind === "npm" ? resource.source.version === parsed.version : resource.source.revision === parsed.revision));
    const classification = resource && pinMatches && installed && contentMatches ? "managed" : resource ? "conflict" : "unresolved";
    let unknownDetails = null;
    if (!resource) {
      try {
        if (parsed.kind === "npm") {
          packageMetadata = await readJsonFile(join(packageRoot, "package.json"), limits.maximumSettingsBytes, null);
          installed = packageMetadata?.name === parsed.package && packageMetadata?.version === parsed.version;
        } else {
          installedVersion = (await runFile("git", ["-C", packageRoot, "rev-parse", "HEAD"], { encoding: "utf8", timeout: 10_000 })).stdout.trim();
          installed = installedVersion === parsed.revision;
          if (installed) packageMetadata = await readJsonFile(join(packageRoot, "package.json"), limits.maximumSettingsBytes, null);
        }
        if (installed) {
          const discoveredSkills = await discoverPiPackageSkills(packageRoot, packageMetadata, limits);
          unknownDetails = discoveredSkills.length > 0 ? {
            classification: "candidate",
            provenance: parsed.kind === "npm"
              ? { kind: "npm", package: parsed.package, version: parsed.version }
              : { kind: "github", repository: parsed.repository, revision: parsed.revision },
            discoveredSkills,
            installedPath: homeRelative(homeDirectory, packageRoot),
          } : {
            classification: "ignored",
            reason: "Pi package contributes no Agent Skills.",
          };
        }
      } catch {
        unknownDetails = { classification: "unresolved", reason: "Pi package installation could not be verified safely." };
      }
    }
    let drift = null;
    if (resource && !pinMatches) drift = "manager";
    else if (resource && !installed) drift = "manager";
    else if (resource && !contentMatches) drift = /filter out/.test(installationReason ?? "") ? "policy" : "content";
    const effectiveNames = resource?.skills.map((skill) => skill.name) ?? unknownDetails?.discoveredSkills?.map((skill) => skill.name);
    records.push({
      identity: `pi-package:${packageIdentity}`,
      type: "pi-package",
      surface: "pi-package",
      name: packageIdentity,
      path: homeRelative(homeDirectory, path),
      version: parsed.version ?? parsed.revision,
      ...(installedVersion ? { installedVersion } : {}),
      classification: unknownDetails?.classification ?? classification,
      ...(drift ? { drift } : {}),
      ...(effectiveNames?.length ? { effectiveNames } : {}),
      ...(resource && !pinMatches ? { reason: "Installed Pi package pin differs from desired state." } : {}),
      ...(resource && pinMatches && (!installed || !contentMatches) ? { reason: installationReason ?? "Pinned Pi package is configured but not installed." } : {}),
      ...(!resource && !unknownDetails ? { reason: "Pi package is not approved in desired state." } : {}),
      ...(unknownDetails?.reason ? { reason: unknownDetails.reason } : {}),
      ...(unknownDetails?.provenance ? { provenance: unknownDetails.provenance } : {}),
      ...(unknownDetails?.discoveredSkills ? { discoveredSkills: unknownDetails.discoveredSkills, installedPath: unknownDetails.installedPath } : {}),
    });
  }
  return records;
}

async function scanPiSettingsSkills(settings, homeDirectory, desiredByName, limits) {
  if (!Array.isArray(settings.skills) || settings.skills.length === 0) return [];
  let selectors;
  try {
    selectors = normalizePiSettingsSkillSelectors(settings.skills, homeDirectory);
  } catch {
    const identity = opaquePiSelectorIdentity(JSON.stringify(settings.skills));
    return [{
      identity: `pi-settings:unresolved-${identity}`,
      type: "agent-skill",
      surface: "pi-settings",
      name: `unresolved-${identity}`,
      path: "~/.pi/agent/settings.json",
      classification: "unresolved",
      reason: "Pi settings skill selector is malformed or escapes the selected home directory.",
    }];
  }
  const discovered = await discoverPiSkills({ root: homeDirectory, selectors, limits });
  return discovered.map((skill) => {
    const entryPath = skill.kind === "file"
      ? join(homeDirectory, ...skill.path.split("/"))
      : join(homeDirectory, ...dirname(skill.path).split("/"));
    const relativePath = homeRelative(homeDirectory, entryPath);
    const identityHash = createHash("sha256").update(relativePath).digest("hex").slice(0, 16);
    const identity = `pi-settings:${skill.name}@${identityHash}`;
    const common = {
      identity,
      type: "agent-skill",
      surface: "pi-settings",
      name: skill.name,
      effectiveName: skill.name,
      path: relativePath,
      kind: skill.kind,
      contentSha256: skill.contentSha256,
    };
    const canonicalPath = `~/.agents/skills/${skill.name}`;
    if (skill.kind === "directory" && relativePath === canonicalPath) {
      return { ...common, classification: "alias", canonicalIdentity: `agent-skills:${skill.name}` };
    }
    const desired = desiredByName.get(skill.name);
    if (desired) {
      return {
        ...common,
        classification: "conflict",
        reason: skill.kind === "directory" && skill.contentSha256 === desired.source.contentSha256
          ? "Equivalent portable content is configured outside the canonical projection."
          : "Configured Pi skill occupies an approved portable skill identity.",
      };
    }
    if (/^(?:qs|ps)-/.test(skill.name)) return { ...common, classification: "separately-managed", reason: "QuickStark packages retain their harness-native release path." };
    return { ...common, classification: "unresolved", reason: "Configured Pi skill has no approved portable provenance." };
  });
}

function detectCollisions(resources) {
  const indexed = new Map();
  for (const resource of resources) {
    if (["alias", "ignored"].includes(resource.classification)) continue;
    const names = resource.effectiveNames ?? (resource.effectiveName ? [resource.effectiveName] : []);
    for (const name of names) {
      const entries = indexed.get(name) ?? [];
      const identity = resource.effectiveNames ? `${resource.identity}#${name}` : resource.identity;
      if (!entries.some((entry) => entry.path && resource.type === "agent-skill" && entry.path === resource.path)) {
        entries.push({ identity, path: resource.type === "agent-skill" ? resource.path : null });
      }
      indexed.set(name, entries);
    }
  }
  return [...indexed.entries()]
    .filter(([, entries]) => entries.length > 1)
    .map(([effectiveName, entries]) => ({ effectiveName, identities: entries.map((entry) => entry.identity).sort() }))
    .sort((first, second) => first.effectiveName.localeCompare(second.effectiveName));
}

export async function inventoryMachine({ manifest, homeDirectory, limits: configuredLimits = {} }) {
  const normalizedManifest = normalizeManifest(manifest);
  const limits = { ...DEFAULT_INVENTORY_LIMITS, ...configuredLimits };
  const canonicalRoot = join(homeDirectory, ".agents", "skills");
  const lock = await readJsonFile(join(homeDirectory, ".agents", ".skill-lock.json"), limits.maximumSettingsBytes, { version: 3, skills: {} });
  if (lock.version !== 3 || !lock.skills || typeof lock.skills !== "object") throw new Error("Unsupported global Agent Skills lock format.");
  const desiredSkills = agentSkillResources(normalizedManifest);
  const desiredByName = new Map(desiredSkills.map((resource) => [resource.name, resource]));
  const shared = { homeDirectory, canonicalRoot, desiredByName, lockSkills: lock.skills, limits };
  const piSettingsPath = join(homeDirectory, ".pi", "agent", "settings.json");
  const piSettings = await readJsonFile(piSettingsPath, limits.maximumSettingsBytes, {});

  const resources = [
    ...await scanSkillSurface({ ...shared, surface: "agent-skills", path: canonicalRoot }),
    ...await scanSkillSurface({ ...shared, surface: "codex-user", path: join(homeDirectory, ".codex", "skills"), excludedNames: [".system"] }),
    ...await scanSkillSurface({ ...shared, surface: "codex-system", path: join(homeDirectory, ".codex", "skills", ".system"), ownership: "ignored" }),
    ...await scanSkillSurface({ ...shared, surface: "claude-user", path: join(homeDirectory, ".claude", "skills") }),
    ...await scanSkillSurface({ ...shared, surface: "pi-user", path: join(homeDirectory, ".pi", "agent", "skills") }),
    ...await scanPluginCache(join(homeDirectory, ".codex", "plugins", "cache"), homeDirectory, limits, "codex-plugin", "Codex plugin-manager payload."),
    ...await scanPluginCache(join(homeDirectory, ".claude", "plugins", "cache"), homeDirectory, limits, "claude-plugin", "Claude plugin-manager payload."),
    ...await scanPiSettingsSkills(piSettings, homeDirectory, desiredByName, limits),
    ...await scanPiPackages(piSettingsPath, homeDirectory, piPackageResources(normalizedManifest), limits, piSettings),
  ];
  for (const resource of resources) {
    if (resource.classification === "candidate") {
      resource.nextAction = {
        command: "npm run personal-skills:adopt",
        requires: resource.type === "pi-package"
          ? ["candidate", "state-token", "type", "license", "license-path", "integrity", "agent=pi"]
          : ["candidate", "state-token", "type", "license", "license-path", "agent=codex", "agent=pi"],
      };
    } else if (resource.classification === "unresolved") {
      resource.nextAction = { command: "supply-immutable-provenance" };
    } else if (resource.classification === "conflict") {
      resource.nextAction = { command: "resolve-conflict-before-sync" };
    }
  }
  resources.sort((first, second) => first.identity.localeCompare(second.identity));
  const collisions = detectCollisions(resources);
  const stateToken = createHash("sha256").update(JSON.stringify({ resources, collisions })).digest("hex");
  return {
    schemaVersion: 1,
    manifest: normalizedManifest,
    stateToken,
    resources,
    collisions,
    summary: Object.fromEntries(["managed", "candidate", "alias", "conflict", "ignored", "separately-managed", "unresolved"].map((classification) => [
      classification,
      resources.filter((resource) => resource.classification === classification).length,
    ])),
  };
}
