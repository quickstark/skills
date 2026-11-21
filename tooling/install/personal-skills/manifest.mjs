import { createHash } from "node:crypto";

import { assertSafeRelativePath } from "./filesystem.mjs";

export const MANIFEST_SCHEMA_VERSION = 2;
export const PINNED_INSTALLER_VERSION = "1.5.23";
export const PINNED_INSTALLER_INTEGRITY = "sha512-+hMNBSi35yfX0sKD+ZcRm9y5or7u313OdkcvrRvJAsAzGCaA8wRTu2OmVdN0KRbk9ybqKby5dijkn6OVvNTUmw==";
export const PORTABLE_TARGETS = Object.freeze(["claude-code", "codex", "pi"]);
const targetSet = new Set(PORTABLE_TARGETS);

function assertCondition(condition, message) {
  if (!condition) throw new Error(message);
}

function normalizeTargets(value, { portable = false } = {}) {
  assertCondition(Array.isArray(value) && value.length > 0, "Every resource requires explicit targets.");
  const targets = [...new Set(value)];
  assertCondition(targets.every((target) => targetSet.has(target)), "Resource contains an unsupported harness target.");
  targets.sort((first, second) => first.localeCompare(second));
  if (portable) {
    assertCondition(targets.includes("codex") && targets.includes("pi"), "Portable Agent Skills must target both Codex and Pi.");
  } else {
    assertCondition(targets.length === 1 && targets[0] === "pi", "Pi packages must remain targeted only to Pi.");
  }
  return targets;
}

function normalizeAgentSkill(resource) {
  assertCondition(/^[a-z0-9][a-z0-9.-]*$/.test(resource.name ?? ""), "Agent Skill requires a safe lowercase name.");
  const source = resource.source;
  assertCondition(source?.kind === "github", `Agent Skill ${resource.name} requires an immutable GitHub source.`);
  assertCondition(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(source.repository ?? ""), `Agent Skill ${resource.name} requires owner/repository provenance.`);
  assertCondition(/^[a-f0-9]{40}$/.test(source.revision ?? ""), `Agent Skill ${resource.name} requires an immutable Git revision.`);
  assertCondition(/^[A-Za-z0-9.+-]+$/.test(source.license ?? ""), `Agent Skill ${resource.name} requires license evidence.`);
  assertSafeRelativePath(source.licensePath, `License path for ${resource.name}`);
  assertSafeRelativePath(source.upstreamPath, `Upstream path for ${resource.name}`);
  assertCondition(source.upstreamPath === "SKILL.md" || source.upstreamPath.endsWith("/SKILL.md"), `Upstream path for ${resource.name} must resolve to SKILL.md.`);
  assertCondition(/^[a-f0-9]{40}$/.test(source.upstreamTreeHash ?? ""), `Agent Skill ${resource.name} requires an upstream Git tree hash.`);
  assertCondition(/^[a-f0-9]{64}$/.test(source.contentSha256 ?? ""), `Agent Skill ${resource.name} requires an independent content SHA-256.`);
  if (source.pluginName !== undefined) {
    assertCondition(/^[a-z0-9][a-z0-9-]*$/.test(source.pluginName), `Agent Skill ${resource.name} has an invalid plugin grouping.`);
  }
  assertCondition(resource.placement?.canonical === "~/.agents/skills", "Portable Agent Skills must use the canonical ~/.agents/skills directory.");
  return {
    type: "agent-skill",
    name: resource.name,
    source: {
      kind: "github",
      repository: source.repository,
      revision: source.revision,
      license: source.license,
      licensePath: source.licensePath,
      upstreamPath: source.upstreamPath,
      upstreamTreeHash: source.upstreamTreeHash,
      contentSha256: source.contentSha256,
      ...(source.pluginName ? { pluginName: source.pluginName } : {}),
    },
    placement: {
      canonical: "~/.agents/skills",
      targets: normalizeTargets(resource.placement.targets, { portable: true }),
    },
  };
}

function normalizePiPackage(resource) {
  assertCondition(/^[a-z0-9][a-z0-9.-]*$/.test(resource.name ?? ""), "Pi package requires a safe resource name.");
  const source = resource.source;
  assertCondition(source && ["npm", "github"].includes(source.kind), `Pi package ${resource.name} requires pinned npm or GitHub provenance.`);
  let normalizedSource;
  if (source.kind === "npm") {
    assertCondition(/^(?:@[a-z0-9_.-]+\/)?[a-z0-9_.-]+$/.test(source.package ?? ""), `Pi package ${resource.name} has an invalid npm package name.`);
    assertCondition(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(source.version ?? ""), `Pi package ${resource.name} requires an exact npm version.`);
    assertCondition(/^sha512-[A-Za-z0-9+/]+={0,2}$/.test(source.integrity ?? ""), `Pi package ${resource.name} requires pinned SHA-512 integrity.`);
    assertCondition(/^[A-Za-z0-9.+-]+$/.test(source.license ?? ""), `Pi package ${resource.name} requires license evidence.`);
    assertSafeRelativePath(source.licensePath, `Pi package license path for ${resource.name}`);
    normalizedSource = { kind: "npm", package: source.package, version: source.version, integrity: source.integrity, license: source.license, licensePath: source.licensePath };
  } else {
    assertCondition(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(source.repository ?? ""), `Pi package ${resource.name} requires owner/repository provenance.`);
    assertCondition(/^[a-f0-9]{40}$/.test(source.revision ?? ""), `Pi package ${resource.name} requires an immutable Git revision.`);
    assertCondition(/^[A-Za-z0-9.+-]+$/.test(source.license ?? ""), `Pi package ${resource.name} requires license evidence.`);
    assertSafeRelativePath(source.licensePath, `Pi package license path for ${resource.name}`);
    normalizedSource = { kind: "github", repository: source.repository, revision: source.revision, license: source.license, licensePath: source.licensePath };
  }
  assertCondition(Array.isArray(resource.skills) && resource.skills.length > 0, `Pi package ${resource.name} must identify contributed skills.`);
  const skillNames = new Set();
  const skills = resource.skills.map((skill) => {
    assertCondition(/^[a-z0-9][a-z0-9.-]*$/.test(skill?.name ?? ""), `Pi package ${resource.name} contains an invalid skill name.`);
    assertCondition(!skillNames.has(skill.name), `Pi package ${resource.name} contains a duplicate skill name.`);
    skillNames.add(skill.name);
    assertSafeRelativePath(skill.path, `Pi package skill path for ${skill.name}`);
    const kind = skill.kind ?? (skill.path === "SKILL.md" || skill.path.endsWith("/SKILL.md") ? "directory" : "file");
    assertCondition(["directory", "file"].includes(kind), `Pi package skill ${skill.name} has invalid path-kind metadata.`);
    assertCondition(kind === "directory"
      ? skill.path === "SKILL.md" || skill.path.endsWith("/SKILL.md")
      : skill.path.endsWith(".md"), `Pi package skill path for ${skill.name} is inconsistent with its kind.`);
    assertCondition(/^[a-f0-9]{64}$/.test(skill.contentSha256 ?? ""), `Pi package skill ${skill.name} requires an independent content SHA-256.`);
    return { name: skill.name, path: skill.path, ...(kind === "file" ? { kind } : {}), contentSha256: skill.contentSha256 };
  }).sort((first, second) => first.name.localeCompare(second.name));
  return {
    type: "pi-package",
    name: resource.name,
    source: normalizedSource,
    skills,
    placement: { targets: normalizeTargets(resource.placement?.targets, { portable: false }) },
  };
}

function normalizeV2(manifest) {
  assertCondition(manifest && typeof manifest === "object" && !Array.isArray(manifest), "The personal skills manifest must be an object.");
  assertCondition(manifest.schemaVersion === MANIFEST_SCHEMA_VERSION, "Unsupported personal skills manifest schema version.");
  assertCondition(manifest.installer?.package === "skills" && manifest.installer.version === PINNED_INSTALLER_VERSION, `The pinned installer must be skills ${PINNED_INSTALLER_VERSION}.`);
  assertCondition(manifest.installer.integrity === PINNED_INSTALLER_INTEGRITY, "The pinned installer requires its approved npm integrity value.");
  assertCondition(manifest.canonicalDirectory === "~/.agents/skills", "The canonical skills directory must be ~/.agents/skills.");
  assertCondition(Array.isArray(manifest.resources), "Schema-v2 manifest requires a resources array.");
  const names = new Set();
  const resources = manifest.resources.map((resource) => {
    assertCondition(resource && typeof resource === "object" && !Array.isArray(resource), "Manifest resources must be objects.");
    const normalized = resource.type === "agent-skill"
      ? normalizeAgentSkill(resource)
      : resource.type === "pi-package"
        ? normalizePiPackage(resource)
        : (() => { throw new Error(`Unsupported personal skill resource type: ${resource.type ?? "unknown"}.`); })();
    const identity = `${normalized.type}:${normalized.name}`;
    assertCondition(!names.has(identity), `Duplicate manifest resource: ${identity}.`);
    names.add(identity);
    return normalized;
  });
  resources.sort((first, second) => `${first.type}:${first.name}`.localeCompare(`${second.type}:${second.name}`));
  return {
    schemaVersion: MANIFEST_SCHEMA_VERSION,
    installer: { package: "skills", version: PINNED_INSTALLER_VERSION, integrity: PINNED_INSTALLER_INTEGRITY },
    canonicalDirectory: "~/.agents/skills",
    resources,
  };
}

export function migrateManifestV1(manifest) {
  assertCondition(manifest?.schemaVersion === 1, "Only schema-version-1 manifests can be migrated.");
  assertCondition(Array.isArray(manifest.sources), "Schema-v1 manifest requires sources.");
  const resources = manifest.sources.flatMap((source) => {
    assertCondition(Array.isArray(source.skills), "Schema-v1 source requires selected skills.");
    return source.skills.map((skill) => ({
      type: "agent-skill",
      name: skill.name,
      source: {
        kind: "github",
        repository: source.repository,
        revision: source.revision,
        license: source.license,
        licensePath: source.licensePath,
        upstreamPath: skill.upstreamPath,
        upstreamTreeHash: skill.upstreamTreeHash,
        contentSha256: skill.contentSha256,
        ...(skill.pluginName ? { pluginName: skill.pluginName } : {}),
      },
      placement: {
        canonical: manifest.canonicalDirectory,
        targets: PORTABLE_TARGETS,
      },
    }));
  });
  return normalizeV2({
    schemaVersion: MANIFEST_SCHEMA_VERSION,
    installer: { ...manifest.installer, integrity: PINNED_INSTALLER_INTEGRITY },
    canonicalDirectory: manifest.canonicalDirectory,
    resources,
  });
}

export function normalizeManifest(manifest) {
  return manifest?.schemaVersion === 1 ? migrateManifestV1(manifest) : normalizeV2(manifest);
}

export function addManifestResource(manifest, resource) {
  const normalized = normalizeManifest(manifest);
  return normalizeV2({ ...normalized, resources: [...normalized.resources, resource] });
}

export function manifestStateToken(manifest) {
  return createHash("sha256").update(JSON.stringify(normalizeManifest(manifest))).digest("hex");
}

export function agentSkillResources(manifest) {
  return normalizeManifest(manifest).resources.filter((resource) => resource.type === "agent-skill");
}

export function piPackageResources(manifest) {
  return normalizeManifest(manifest).resources.filter((resource) => resource.type === "pi-package");
}

export function serializeManifest(manifest) {
  return `${JSON.stringify(normalizeManifest(manifest), null, 2)}\n`;
}
