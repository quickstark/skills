import { chmod, lstat, mkdir, open, readFile, readlink, realpath, rename, rm, rmdir, symlink, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";

import { inspectPortableDirectory } from "./filesystem.mjs";
import { agentSkillResources, normalizeManifest, piPackageResources } from "./manifest.mjs";
import { inventoryMachine } from "./inventory.mjs";
import { writeAgentSkillLock } from "./lock.mjs";

const supportedTargets = new Set(["codex", "claude-code", "pi"]);
const surfaceTargets = new Map([
  ["codex-user", "codex"],
  ["codex-system", "codex"],
  ["codex-plugin", "codex"],
  ["claude-user", "claude-code"],
  ["claude-plugin", "claude-code"],
  ["pi-user", "pi"],
  ["pi-settings", "pi"],
  ["pi-package", "pi"],
]);

function normalizeSelectedTargets(targets) {
  const selected = [...new Set(targets?.length ? targets : ["codex"])];
  if (selected.some((target) => !supportedTargets.has(target))) throw new Error("Unsupported reconciliation target.");
  return selected.sort((first, second) => first.localeCompare(second));
}

export function buildPiPackageAction(resource) {
  if (resource?.type !== "pi-package" || !["npm", "github"].includes(resource.source?.kind)) throw new Error("Pi manager action requires a typed pinned Pi package resource.");
  const spec = resource.source.kind === "npm"
    ? `npm:${resource.source.package}@${resource.source.version}`
    : `git:github.com/${resource.source.repository}@${resource.source.revision}`;
  return {
    command: "pi",
    arguments: ["install", spec],
    integrity: resource.source.integrity ?? resource.source.revision,
    authorization: "separate",
  };
}

export async function buildReconciliationPlan({ manifest, homeDirectory, targets }) {
  const normalizedManifest = normalizeManifest(manifest);
  const selectedTargets = normalizeSelectedTargets(targets);
  const inventory = await inventoryMachine({ manifest: normalizedManifest, homeDirectory });
  const byIdentity = new Map(inventory.resources.map((resource) => [resource.identity, resource]));
  const operations = [];
  const conflicts = [];
  const externalActions = [];

  for (const resource of agentSkillResources(normalizedManifest)) {
    if (!resource.placement.targets.some((target) => selectedTargets.includes(target))) continue;
    const canonical = byIdentity.get(`agent-skills:${resource.name}`);
    if (!canonical) {
      operations.push({ kind: "install-agent-skill", name: resource.name, resource });
    } else if (canonical.classification === "outdated-managed") {
      operations.push({ kind: "update-agent-skill", name: resource.name, resource, previous: canonical.provenance });
    } else if (canonical.classification === "conflict" && canonical.drift === "metadata") {
      operations.push({ kind: "update-agent-lock", name: resource.name, resource });
    } else if (canonical.classification !== "managed") {
      conflicts.push({ identity: canonical.identity, name: resource.name, reason: canonical.reason ?? "Canonical skill is not converged." });
    }

    if (selectedTargets.includes("claude-code") && resource.placement.targets.includes("claude-code")) {
      const claude = byIdentity.get(`claude-user:${resource.name}`);
      if (!claude) operations.push({ kind: "create-claude-link", name: resource.name, resource });
      else if (claude.classification !== "alias" || claude.canonicalIdentity !== `agent-skills:${resource.name}`) {
        conflicts.push({ identity: claude.identity, name: resource.name, reason: claude.reason ?? "Claude skill path is not the canonical link." });
      }
    }
  }

  const selectedDesiredNames = new Set(agentSkillResources(normalizedManifest)
    .filter((resource) => resource.placement.targets.some((target) => selectedTargets.includes(target)))
    .map((resource) => resource.name));
  for (const observed of inventory.resources) {
    const target = surfaceTargets.get(observed.surface);
    if (!target || !selectedTargets.includes(target)) continue;
    const effectiveNames = observed.effectiveNames ?? (observed.effectiveName ? [observed.effectiveName] : []);
    for (const effectiveName of effectiveNames) {
      if (!selectedDesiredNames.has(effectiveName)) continue;
      if (observed.identity === `agent-skills:${effectiveName}`) continue;
      if (observed.classification === "alias" && observed.canonicalIdentity === `agent-skills:${effectiveName}`) continue;
      conflicts.push({
        identity: observed.identity,
        name: effectiveName,
        reason: observed.reason ?? `Selected harness already exposes ${effectiveName} outside its canonical projection.`,
      });
    }
  }

  if (selectedTargets.includes("pi")) {
    for (const resource of piPackageResources(normalizedManifest)) {
      const packageIdentity = resource.source.kind === "npm" ? resource.source.package : resource.source.repository;
      const installed = byIdentity.get(`pi-package:${packageIdentity}`);
      if (!installed) externalActions.push(buildPiPackageAction(resource));
      else if (installed.classification !== "managed" && installed.drift !== "policy") externalActions.push(buildPiPackageAction(resource));
      else if (installed.classification !== "managed") conflicts.push({ identity: installed.identity, name: resource.name, reason: installed.reason ?? "Pi package is not converged." });
    }
  }

  const uniqueConflicts = [...new Map(conflicts.map((conflict) => [`${conflict.identity}:${conflict.reason}`, conflict])).values()]
    .sort((first, second) => first.identity.localeCompare(second.identity));
  const priority = { "update-agent-skill": 1, "install-agent-skill": 2, "update-agent-lock": 3, "create-claude-link": 4 };
  operations.sort((first, second) => (priority[first.kind] - priority[second.kind]) || first.name.localeCompare(second.name));
  const states = {
    missing: operations.filter((operation) => operation.kind === "install-agent-skill").map((operation) => operation.name),
    outdated: operations.filter((operation) => operation.kind === "update-agent-skill").map((operation) => operation.name),
    matching: inventory.resources.filter((resource) => resource.surface === "agent-skills" && resource.classification === "managed").map((resource) => resource.name),
    metadataDrifted: inventory.resources.filter((resource) => resource.drift === "metadata").map((resource) => resource.name),
    contentDrifted: inventory.resources.filter((resource) => resource.drift === "content").map((resource) => resource.name),
    unmanaged: inventory.resources.filter((resource) => ["candidate", "unresolved"].includes(resource.classification)).map((resource) => resource.identity),
    ignored: inventory.resources.filter((resource) => resource.classification === "ignored").map((resource) => resource.identity),
    separatelyManaged: inventory.resources.filter((resource) => resource.classification === "separately-managed").map((resource) => resource.identity),
    aliases: inventory.resources.filter((resource) => resource.classification === "alias").map((resource) => resource.identity),
  };
  for (const values of Object.values(states)) values.sort();
  const uniqueExternalActions = [...new Map(externalActions.map((action) => [`${action.command}:${action.arguments.join("\0")}`, action])).values()];
  return {
    schemaVersion: 1,
    manifest: normalizedManifest,
    stateToken: inventory.stateToken,
    targets: selectedTargets,
    operations,
    conflicts: uniqueConflicts,
    externalActions: uniqueExternalActions,
    states,
  };
}

async function assertCanonicalResource(homeDirectory, resource) {
  const path = join(homeDirectory, ".agents", "skills", resource.name);
  const inspection = await inspectPortableDirectory(path);
  if (!inspection.safe || inspection.contentSha256 !== resource.source.contentSha256) {
    throw new Error(`Canonical skill ${resource.name} does not match desired state.`);
  }
  return realpath(path);
}

async function optionalMetadata(path) {
  return lstat(path).catch((error) => error?.code === "ENOENT" ? null : Promise.reject(error));
}

async function captureRegularFile(path) {
  const metadata = await optionalMetadata(path);
  if (!metadata) return { exists: false };
  if (!metadata.isFile() || metadata.isSymbolicLink()) throw new Error("Reconciliation state file must be a real regular file.");
  return { exists: true, contents: await readFile(path), mode: metadata.mode & 0o777 };
}

async function restoreRegularFile(path, snapshot) {
  const current = await optionalMetadata(path);
  if (!snapshot.exists) {
    if (!current) return false;
    await rm(path, { force: true });
    return true;
  }
  if (current && (!current.isFile() || current.isSymbolicLink())) throw new Error("Reconciliation cannot restore an occupied state-file path.");
  if (current && Buffer.compare(await readFile(path), snapshot.contents) === 0 && (current.mode & 0o777) === snapshot.mode) return false;
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  const temporary = `${path}.${process.pid}.${Date.now()}.restore`;
  try {
    await writeFile(temporary, snapshot.contents, { mode: snapshot.mode });
    await chmod(temporary, snapshot.mode);
    const file = await open(temporary, "r");
    try { await file.sync(); } finally { await file.close(); }
    await rename(temporary, path);
  } finally {
    await rm(temporary, { force: true }).catch(() => {});
  }
  return true;
}

async function removeCreatedPath(path) {
  const metadata = await optionalMetadata(path);
  if (!metadata) return false;
  await rm(path, { recursive: true, force: true });
  return true;
}

async function removeEmptyCreatedDirectory(path, existedBefore) {
  if (existedBefore) return false;
  try {
    await rmdir(path);
    return true;
  } catch (error) {
    if (["ENOENT", "ENOTEMPTY"].includes(error?.code)) return false;
    throw error;
  }
}

export async function applyHarnessProjections(plan, {
  homeDirectory,
  installAgentSkill,
  beforeOperation,
} = {}) {
  if (plan.conflicts.length) throw new Error("Reconciliation has unresolved conflicts and cannot mutate any selected surface.");
  const current = await inventoryMachine({ manifest: plan.manifest, homeDirectory });
  if (current.stateToken !== plan.stateToken) throw new Error("Reconciliation plan is stale because machine skill state changed.");
  if (plan.operations.length === 0) return { outcome: "complete", created: [], updated: [], completedOperations: [], cleanupErrors: [], externalActions: plan.externalActions };
  const homeMetadata = await lstat(homeDirectory);
  if (!homeMetadata.isDirectory() || homeMetadata.isSymbolicLink()) throw new Error("Reconciliation home must be a real directory.");
  const transactionGuardPath = join(homeDirectory, ".quickstark-personal-skills-sync.lock");
  const transactionGuard = await open(transactionGuardPath, "wx", 0o600).catch((error) => {
    if (error?.code === "EEXIST") throw new Error("Another personal skill reconciliation is already running.");
    throw error;
  });
  const created = [];
  const updated = [];
  const completedOperations = [];
  const attemptedOperations = [];
  const journal = [];
  const agentsRoot = join(homeDirectory, ".agents");
  const canonicalRoot = join(agentsRoot, "skills");
  const updateBackupRoot = join(agentsRoot, `.quickstark-update-${process.pid}-${Date.now()}`);
  let updateBackupRootCreated = false;
  let agentsRootExisted;
  let canonicalRootExisted;
  const lockPath = join(agentsRoot, ".skill-lock.json");
  const mutatesLock = plan.operations.some((operation) => ["install-agent-skill", "update-agent-skill", "update-agent-lock"].includes(operation.kind));
  try {
    agentsRootExisted = Boolean(await optionalMetadata(agentsRoot));
    canonicalRootExisted = Boolean(await optionalMetadata(canonicalRoot));
    if (mutatesLock) {
      const snapshot = await captureRegularFile(lockPath);
      journal.push({ path: lockPath, undo: () => restoreRegularFile(lockPath, snapshot) });
    }
  } catch (error) {
    await transactionGuard.close();
    await rm(transactionGuardPath, { force: true });
    throw error;
  }

  try {
    for (let index = 0; index < plan.operations.length; index += 1) {
      const operation = plan.operations[index];
      if (typeof beforeOperation === "function") await beforeOperation(operation, index);
      attemptedOperations.push({ kind: operation.kind, name: operation.name });
      if (operation.kind === "install-agent-skill") {
        if (typeof installAgentSkill !== "function") throw new Error(`Installing ${operation.name} requires the authorized pinned installer adapter.`);
        const destination = join(homeDirectory, ".agents", "skills", operation.name);
        const existing = await lstat(destination).catch((error) => error?.code === "ENOENT" ? null : Promise.reject(error));
        if (existing) throw new Error(`Refusing to overwrite occupied canonical skill: ${operation.name}.`);
        journal.push({ path: destination, undo: () => removeCreatedPath(destination) });
        await installAgentSkill(operation.resource);
        await assertCanonicalResource(homeDirectory, operation.resource);
        await writeAgentSkillLock(join(homeDirectory, ".agents", ".skill-lock.json"), [operation.resource]);
        created.push(destination);
        completedOperations.push({ kind: operation.kind, name: operation.name });
        continue;
      }

      if (operation.kind === "update-agent-skill") {
        if (typeof installAgentSkill !== "function") throw new Error(`Updating ${operation.name} requires the authorized pinned installer adapter.`);
        const destination = join(canonicalRoot, operation.name);
        const existing = await lstat(destination).catch((error) => error?.code === "ENOENT" ? null : Promise.reject(error));
        if (!existing?.isDirectory() || existing.isSymbolicLink()) throw new Error(`Managed skill update source is not a real directory: ${operation.name}.`);
        if (!updateBackupRootCreated) {
          await mkdir(updateBackupRoot, { mode: 0o700 });
          updateBackupRootCreated = true;
        }
        const backup = join(updateBackupRoot, operation.name);
        journal.push({
          path: destination,
          undo: async () => {
            const backupMetadata = await optionalMetadata(backup);
            if (!backupMetadata) return false;
            await removeCreatedPath(destination);
            await rename(backup, destination);
            return true;
          },
        });
        await rename(destination, backup);
        await installAgentSkill(operation.resource);
        await assertCanonicalResource(homeDirectory, operation.resource);
        await writeAgentSkillLock(lockPath, [operation.resource]);
        updated.push(destination);
        completedOperations.push({ kind: operation.kind, name: operation.name });
        continue;
      }

      if (operation.kind === "create-claude-link") {
        const canonical = await assertCanonicalResource(homeDirectory, operation.resource);
        const claudeRoot = join(homeDirectory, ".claude");
        const claudeMetadata = await lstat(claudeRoot).catch((error) => error?.code === "ENOENT" ? null : Promise.reject(error));
        if (!claudeMetadata?.isDirectory() || claudeMetadata.isSymbolicLink()) throw new Error("Claude Code was selected but ~/.claude is not a real directory.");
        const linksRoot = join(claudeRoot, "skills");
        const linksRootMetadata = await optionalMetadata(linksRoot);
        if (linksRootMetadata && (!linksRootMetadata.isDirectory() || linksRootMetadata.isSymbolicLink())) throw new Error("Claude skills root must be a real directory.");
        if (!linksRootMetadata) journal.push({ path: linksRoot, undo: () => removeEmptyCreatedDirectory(linksRoot, false) });
        await mkdir(linksRoot, { recursive: true, mode: 0o700 });
        const destination = join(linksRoot, operation.name);
        const occupied = await lstat(destination).catch((error) => error?.code === "ENOENT" ? null : Promise.reject(error));
        if (occupied) {
          if (!occupied.isSymbolicLink()) throw new Error(`Refusing to overwrite occupied Claude skill: ${operation.name}.`);
          const target = resolve(dirname(destination), await readlink(destination));
          if (await realpath(target) !== canonical) throw new Error(`Refusing to replace unrelated Claude link: ${operation.name}.`);
          continue;
        }
        journal.push({ path: destination, undo: () => removeCreatedPath(destination) });
        await symlink(relative(linksRoot, canonical), destination, "dir");
        created.push(destination);
        completedOperations.push({ kind: operation.kind, name: operation.name });
        continue;
      }

      if (operation.kind === "update-agent-lock") {
        await assertCanonicalResource(homeDirectory, operation.resource);
        await writeAgentSkillLock(join(homeDirectory, ".agents", ".skill-lock.json"), [operation.resource]);
        completedOperations.push({ kind: operation.kind, name: operation.name });
        continue;
      }

      throw new Error(`Unsupported reconciliation operation: ${operation.kind}.`);
    }
    const verified = await buildReconciliationPlan({ manifest: plan.manifest, homeDirectory, targets: plan.targets });
    if (verified.operations.length || verified.conflicts.length) throw new Error("Post-synchronization verification failed inside the reconciliation transaction.");
    const cleanupErrors = [];
    if (updateBackupRootCreated) {
      await rm(updateBackupRoot, { recursive: true, force: true }).catch((error) => {
        cleanupErrors.push({ path: updateBackupRoot, reason: error.message });
      });
    }
    return { outcome: "complete", created, updated, completedOperations, cleanupErrors, externalActions: plan.externalActions };
  } catch (error) {
    const compensatedPaths = [];
    const compensationErrors = [];
    for (const entry of [...journal].reverse()) {
      try {
        if (await entry.undo()) compensatedPaths.push(entry.path);
      } catch (compensationError) {
        compensationErrors.push({ path: entry.path, reason: compensationError.message });
      }
    }
    for (const [path, existedBefore] of [[canonicalRoot, canonicalRootExisted], [agentsRoot, agentsRootExisted]]) {
      try {
        if (await removeEmptyCreatedDirectory(path, existedBefore)) compensatedPaths.push(path);
      } catch (compensationError) {
        compensationErrors.push({ path, reason: compensationError.message });
      }
    }
    if (updateBackupRootCreated) {
      try {
        if (await removeEmptyCreatedDirectory(updateBackupRoot, false)) compensatedPaths.push(updateBackupRoot);
      } catch (compensationError) {
        compensationErrors.push({ path: updateBackupRoot, reason: compensationError.message });
      }
    }
    error.reconciliation = {
      outcome: compensationErrors.length
        ? "partial-reconciliation"
        : attemptedOperations.length
          ? "rolled-back"
          : "failed-before-change",
      attemptedOperations,
      completedOperations,
      compensatedPaths,
      compensationErrors,
    };
    throw error;
  } finally {
    await transactionGuard.close();
    await rm(transactionGuardPath, { force: true });
  }
}
