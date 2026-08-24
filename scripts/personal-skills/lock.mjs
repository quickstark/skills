import { chmod, lstat, mkdir, open, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export function desiredLockFields(resource) {
  if (resource?.type !== "agent-skill") throw new Error("Agent Skills lock metadata requires an Agent Skill resource.");
  return {
    source: resource.source.repository,
    sourceType: "github",
    sourceUrl: `https://github.com/${resource.source.repository}.git`,
    ref: resource.source.revision,
    skillPath: resource.source.upstreamPath,
    skillFolderHash: resource.source.upstreamTreeHash,
    ...(resource.source.pluginName ? { pluginName: resource.source.pluginName } : {}),
  };
}

export function lockEntryMatches(entry, resource) {
  if (!entry || typeof entry !== "object") return false;
  return Object.entries(desiredLockFields(resource)).every(([key, value]) => entry[key] === value);
}

export function reconcileAgentSkillLock(original, resources, timestamp = new Date().toISOString()) {
  const initial = original ?? { version: 3, skills: {} };
  if (initial.version !== 3 || !initial.skills || typeof initial.skills !== "object" || Array.isArray(initial.skills)) {
    throw new Error("The global Agent Skills lock must use version 3.");
  }
  const lock = structuredClone(initial);
  let changed = false;
  for (const resource of resources) {
    const current = lock.skills[resource.name];
    if (lockEntryMatches(current, resource)) continue;
    lock.skills[resource.name] = {
      ...(current ?? {}),
      ...desiredLockFields(resource),
      installedAt: current?.installedAt ?? timestamp,
      updatedAt: timestamp,
    };
    changed = true;
  }
  return { lock, changed };
}

export async function readAgentSkillLock(path) {
  try {
    const metadata = await lstat(path);
    if (!metadata.isFile() || metadata.isSymbolicLink()) throw new Error("Global Agent Skills lock must be a real regular file.");
    const value = JSON.parse(await readFile(path, "utf8"));
    if (value.version !== 3 || !value.skills || typeof value.skills !== "object" || Array.isArray(value.skills)) {
      throw new Error("Unsupported global Agent Skills lock format.");
    }
    return value;
  } catch (error) {
    if (error?.code === "ENOENT") return { version: 3, skills: {} };
    throw error;
  }
}

export async function writeAgentSkillLock(path, resources, timestamp) {
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  const guard = `${path}.quickstark-sync.lock`;
  const handle = await open(guard, "wx", 0o600).catch((error) => {
    if (error?.code === "EEXIST") throw new Error("Another process is updating the global Agent Skills lock.");
    throw error;
  });
  let temporary;
  try {
    const current = await readAgentSkillLock(path);
    const result = reconcileAgentSkillLock(current, resources, timestamp);
    if (!result.changed) return false;
    const metadata = await lstat(path).catch((error) => error?.code === "ENOENT" ? null : Promise.reject(error));
    const mode = metadata ? metadata.mode & 0o777 : 0o600;
    temporary = `${path}.${process.pid}.${Date.now()}.tmp`;
    await writeFile(temporary, `${JSON.stringify(result.lock, null, 2)}\n`, { mode });
    await chmod(temporary, mode);
    const file = await open(temporary, "r");
    try { await file.sync(); } finally { await file.close(); }
    await rename(temporary, path);
    temporary = null;
    return true;
  } finally {
    if (temporary) await rm(temporary, { force: true }).catch(() => {});
    await handle.close();
    await rm(guard, { force: true });
  }
}
