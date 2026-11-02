import { PS_PUBLIC_COMMANDS, PS_INTERNAL_CAPABILITIES, PS_UPSTREAM } from './ps-skill-catalog.mjs';

// Historical PS metadata is retained independently; no upstream/public skill
// body is loaded at run time by these canonical QS commands.
const renamed = (name) => name.replace(/^ps-/, 'qs-');
function renameMetadata(value) {
  if (typeof value === 'string') return value.replace(/ps-skills/g, 'qs-advanced').replace(/\bps-/g, 'qs-').replace(/^PS /, 'QS ');
  if (Array.isArray(value)) return Object.freeze(value.map(renameMetadata));
  if (value && typeof value === 'object') return Object.freeze(Object.fromEntries(Object.entries(value).map(([key, item]) => [key, renameMetadata(item)])));
  return value;
}

export const ADVANCED_COLLECTION = Object.freeze({
  id: 'qs-advanced', name: 'QuickStark Advanced', packageName: 'qs-advanced', codexPlugin: 'qs-advanced',
  claudePackageRoot: 'packages/qs-advanced', codexPackageRoot: 'codex/plugins/qs-advanced', piPackageRoot: 'pi/packages/qs-advanced',
  canonicalRoot: 'skills/engineering', documentationRoot: 'docs/engineering', privateRoot: 'skills/advanced/internal',
});

export const ADVANCED_INTERNAL_CAPABILITIES = Object.freeze(PS_INTERNAL_CAPABILITIES.map((entry) => Object.freeze({
  name: entry.name, candidateId: entry.candidateId, sourcePath: `skills/advanced/internal/${entry.name}.md`,
  owners: Object.freeze(entry.owners.filter((name) => name !== 'ps-help').map(renamed)),
  provenance: Object.freeze({ legacyPath: entry.sourcePath, repository: PS_UPSTREAM.repository, baselineRevision: PS_UPSTREAM.commit }),
})));

export const ADVANCED_PUBLIC_COMMANDS = Object.freeze(PS_PUBLIC_COMMANDS.filter((entry) => entry.name !== 'ps-help').map((entry) => {
  const name = renamed(entry.name);
  return Object.freeze({
    ...renameMetadata(entry), name, bucket: 'engineering', distribution: 'advanced',
    collection: ADVANCED_COLLECTION.id, packageName: ADVANCED_COLLECTION.packageName, codexPlugin: ADVANCED_COLLECTION.codexPlugin,
    sourcePath: `skills/engineering/${name}`, documentationPath: `docs/engineering/${name}.md`,
    codexLiteral: `$qs-advanced:${name}`, claudeLiteral: `/${name}`, piLiteral: `/skill:${name}`,
    privateCapabilities: Object.freeze(ADVANCED_INTERNAL_CAPABILITIES.filter((capability) => capability.owners.includes(name)).map((capability) => capability.name)),
    provenance: Object.freeze({ ...entry.provenance, legacyName: entry.name, legacyPath: entry.sourcePath, repository: PS_UPSTREAM.repository, baselineRevision: PS_UPSTREAM.commit }),
  });
}));

export const ADVANCED_PUBLIC_COMMANDS_BY_NAME = new Map(ADVANCED_PUBLIC_COMMANDS.map((entry) => [entry.name, entry]));
export const ADVANCED_CATALOG = Object.freeze({ schemaVersion: 1, collection: ADVANCED_COLLECTION, publicCommands: ADVANCED_PUBLIC_COMMANDS, internalCapabilities: ADVANCED_INTERNAL_CAPABILITIES });
