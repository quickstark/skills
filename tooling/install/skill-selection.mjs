import { createHash, randomUUID } from "node:crypto";
import { constants } from "node:fs";
import { lstat, mkdir, open, rename, rm, rmdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

const AGENTS = new Set(["codex", "claude-code", "pi"]);
const MAX_BYTES = 1024 * 1024;
const own = (value, key) => Object.hasOwn(value, key);
const digest = (data) => createHash("sha256").update(data).digest("hex");
function requireCondition(condition, message) {
  if (!condition) throw new Error(message);
}
function object(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function fields(value, allowed, label) {
  requireCondition(Object.keys(value).every((key) => allowed.includes(key)), `${label} contains unsupported fields; migrate before saving.`);
}
function names(value, label) {
  requireCondition(Array.isArray(value), `${label} must be an array.`);
  requireCondition(value.every((name) => typeof name === "string" && /^[a-z0-9][a-z0-9.-]*$/.test(name)), `${label} contains an invalid identity.`);
  requireCondition(new Set(value).size === value.length, `${label} contains duplicate identities.`);
  return [...value];
}
function targetSelection(value) {
  requireCondition(object(value), "Target selection must be an object.");
  fields(value, ["packages", "resources", "profile", "additions"], "Target selection");
  const packages = names(value.packages, "Selected packages");
  const resources = names(value.resources, "Selected resources");
  requireCondition(value.profile === null || typeof value.profile === "string" && /^[a-z0-9][a-z0-9.-]*$/.test(value.profile), "Selection profile must be a name or null.");
  const additions = names(value.additions ?? [], "Selection additions");
  requireCondition(additions.every((name) => packages.includes(name)), "Selection additions must be selected packages.");
  return { packages, resources, profile: value.profile, additions };
}

export function normalizeSelectionRecord(value) {
  requireCondition(object(value) && value.schemaVersion === 1 && object(value.targets), "Unsupported skill selection record.");
  fields(value, ["schemaVersion", "targets", "templateRevision", "lastSuccessfulTransaction"], "Selection record");
  const targets = {};
  for (const [agent, selected] of Object.entries(value.targets)) {
    requireCondition(AGENTS.has(agent), `Unsupported selection target: ${agent}.`);
    targets[agent] = targetSelection(selected);
  }
  for (const field of ["templateRevision", "lastSuccessfulTransaction"]) {
    requireCondition(value[field] === null || typeof value[field] === "string" && value[field].length > 0 && value[field].length <= 256
      && !/[\u0000-\u001f\u007f]/.test(value[field]), `Selection ${field} must be a bounded string or null.`);
  }
  return { schemaVersion: 1, targets, templateRevision: value.templateRevision, lastSuccessfulTransaction: value.lastSuccessfulTransaction };
}

export function normalizeSkillProfiles(value, packageNames, resourceNames) {
  requireCondition(object(value) && value.schemaVersion === 1 && object(value.profiles), "Unsupported skill profiles record.");
  fields(value, ["schemaVersion", "defaultProfile", "profiles"], "Skill profiles");
  const profiles = {};
  for (const [id, profile] of Object.entries(value.profiles)) {
    requireCondition(/^[a-z0-9][a-z0-9.-]*$/.test(id) && object(profile), "Invalid skill profile.");
    fields(profile, ["packages", "resources"], `Profile ${id}`);
    const packages = names(profile.packages, `Profile ${id} packages`);
    const resources = names(profile.resources, `Profile ${id} resources`);
    requireCondition(packages.every((name) => packageNames.includes(name)), `Profile ${id} references an unknown package.`);
    requireCondition(resources.every((name) => resourceNames.includes(name)), `Profile ${id} references an unknown resource.`);
    Object.defineProperty(profiles, id, { value: { packages, resources }, enumerable: true });
  }
  requireCondition(typeof value.defaultProfile === "string" && own(profiles, value.defaultProfile), "Default skill profile is missing.");
  const defaults = profiles[value.defaultProfile];
  requireCondition(defaults.packages.length === 1 && defaults.packages[0] === "qs-skills" && defaults.resources.length === 0,
    "Fresh default must select only the QS core package.");
  return { schemaVersion: 1, defaultProfile: value.defaultProfile, profiles };
}

// Legacy inventory must be produced from verified manager/source ownership by the
// caller. This function never infers ownership from a folder or a familiar name.
export function resolveTargetSelection({ agent, profiles, packageNames, resourceNames, savedRecord = null,
  legacy = { packages: [], resources: [], conflicts: [] }, profile = null, withPackages = [] }) {
  requireCondition(AGENTS.has(agent), `Unsupported selection target: ${agent}.`);
  const availablePackages = names(packageNames, "Available packages");
  const availableResources = names(resourceNames, "Available resources");
  const definitions = normalizeSkillProfiles(profiles, availablePackages, availableResources);
  const record = savedRecord === null ? null : normalizeSelectionRecord(savedRecord);
  requireCondition(object(legacy) && Array.isArray(legacy.conflicts), "Legacy inventory requires explicit conflicts.");
  requireCondition(legacy.conflicts.length === 0, `Existing skill selection is ambiguous: ${legacy.conflicts.join("; ")}`);
  const priorPackages = names(legacy.packages, "Legacy packages");
  const priorResources = names(legacy.resources, "Legacy resources");
  const additions = names(withPackages, "Requested package additions");
  requireCondition(additions.every((name) => availablePackages.includes(name)), "Requested selection contains an unknown package.");
  let selected;
  let basis;
  if (profile !== null) {
    requireCondition(typeof profile === "string" && own(definitions.profiles, profile), `Unknown skill profile: ${profile}.`);
    selected = { ...definitions.profiles[profile], profile, additions: [] };
    basis = "explicit-profile";
  } else if (record && own(record.targets, agent)) {
    selected = record.targets[agent];
    basis = "saved";
  } else if (priorPackages.length || priorResources.length) {
    selected = { packages: priorPackages, resources: priorResources, profile: null, additions: [] };
    basis = "verified-legacy";
  } else {
    selected = { ...definitions.profiles[definitions.defaultProfile], profile: definitions.defaultProfile, additions: [] };
    basis = "fresh-default";
  }
  requireCondition(selected.packages.every((name) => availablePackages.includes(name)),
    "Saved or legacy selection references retired/unknown packages; an explicit verified migration is required.");
  requireCondition(selected.resources.every((name) => availableResources.includes(name)),
    "Saved or legacy selection references retired/unknown resources; an explicit verified migration is required.");
  const packages = [...new Set([...selected.packages, ...additions])];
  return {
    agent, basis,
    selection: { packages, resources: [...selected.resources], profile: selected.profile,
      additions: [...new Set([...selected.additions, ...additions])] },
    // A smaller desired selection is a plan, never permission to remove old data.
    retirements: { packages: priorPackages.filter((name) => !packages.includes(name)),
      resources: priorResources.filter((name) => !selected.resources.includes(name)) },
  };
}

export function selectionRecordPath(homeDirectory) {
  return join(resolve(homeDirectory), ".config", "quickstark", "skills-selection.json");
}

async function inspectParents(path) {
  let current = dirname(resolve(path));
  while (true) {
    const metadata = await lstat(current).catch((error) => error.code === "ENOENT" ? null : Promise.reject(error));
    requireCondition(!metadata || metadata.isDirectory() && !metadata.isSymbolicLink(), "Selection parent must be a real directory.");
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
}

export async function readSelectionRecord(path) {
  await inspectParents(path);
  const metadata = await lstat(path).catch((error) => error.code === "ENOENT" ? null : Promise.reject(error));
  if (!metadata) return { record: null, fingerprint: null };
  requireCondition(metadata.isFile() && !metadata.isSymbolicLink() && metadata.nlink === 1 && metadata.size <= MAX_BYTES,
    "Selection record must be a bounded, unlinked regular file.");
  const file = await open(path, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0) | (constants.O_NONBLOCK ?? 0));
  try {
    const before = await file.stat();
    requireCondition(before.isFile() && before.nlink === 1 && before.dev === metadata.dev && before.ino === metadata.ino,
      "Selection record changed while opening.");
    const buffer = Buffer.alloc(MAX_BYTES + 1);
    let length = 0;
    while (length < buffer.length) {
      const result = await file.read(buffer, length, buffer.length - length, null);
      if (!result.bytesRead) break;
      length += result.bytesRead;
    }
    const after = await file.stat();
    const named = await lstat(path);
    requireCondition(length <= MAX_BYTES && before.size === after.size && before.mtimeMs === after.mtimeMs
      && before.dev === named.dev && before.ino === named.ino && !named.isSymbolicLink() && named.nlink === 1,
    "Selection record changed or exceeded the size bound during reading.");
    const data = buffer.subarray(0, length);
    return { record: normalizeSelectionRecord(JSON.parse(data.toString("utf8"))), fingerprint: digest(data) };
  } finally { await file.close(); }
}

export async function saveSelectionRecord(path, record, { expectedFingerprint } = {}) {
  requireCondition(expectedFingerprint === null || typeof expectedFingerprint === "string", "Saving selection requires its observed fingerprint.");
  const normalized = normalizeSelectionRecord(record);
  await inspectParents(path);
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  await inspectParents(path);
  const lock = `${path}.lock`;
  // Never remove a lock we did not acquire; interrupted transactions need review.
  await mkdir(lock, { mode: 0o700 });
  const temporary = `${path}.${randomUUID()}.tmp`;
  try {
    const current = await readSelectionRecord(path);
    requireCondition(current.fingerprint === expectedFingerprint, "Selection changed after planning; replan before saving.");
    const file = await open(temporary, "wx", 0o600);
    try { await file.writeFile(`${JSON.stringify(normalized, null, 2)}\n`); await file.sync(); }
    finally { await file.close(); }
    const rechecked = await readSelectionRecord(path);
    requireCondition(rechecked.fingerprint === expectedFingerprint, "Selection changed before commit; replan before saving.");
    await rename(temporary, path);
  } finally {
    await rm(temporary, { force: true });
    await rmdir(lock);
  }
  return readSelectionRecord(path);
}
