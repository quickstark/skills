import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const SKILL_MIGRATIONS_SCHEMA_VERSION = 1;
const root = fileURLToPath(new URL('../', import.meta.url));
const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const name = (value) => typeof value === 'string' && /^[a-z0-9][a-z0-9:-]*$/.test(value);
const text = (value) => typeof value === 'string' && value.length > 0 && !/[\u0000-\u001f]/.test(value);
const names = (value) => Array.isArray(value) && value.every(name) && new Set(value).size === value.length;
const sha = (value) => typeof value === 'string' && /^[a-f0-9]{40}$/.test(value);
const digest = (value) => object(value) && value.kind === 'portable-directory-sha256' && typeof value.value === 'string' && /^[a-f0-9]{64}$/.test(value.value);
const sameDigest = (a, b) => digest(a) && digest(b) && a.kind === b.kind && a.value === b.value;
const hash = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const sameNames = (a, b) => names(a) && names(b) && [...a].sort().join('\0') === [...b].sort().join('\0');
const sorted = (values) => [...new Set(values)].sort();
const key = (entry) => `${entry.kind}:${entry.identity}`;
const resourceAliases = {
  'claude-code': { surface: 'claude-link', directory: '.claude/skills' },
  codex: { surface: 'codex-link', directory: '.codex/skills' },
  pi: { surface: 'pi-link', directory: '.pi/agent/skills' },
};
const requirementNames = [
  'fresh-path-link-version-digest-revalidation', 'complete-selected-capability-proof',
  'replacement-package-closure-and-notices', 'no-old-new-duplicate-discovery',
  'all-shared-consumers-migrated-or-old-resource-retained', 'verified-backup-and-durable-journal',
  'selection-persisted-only-after-success',
];

export function readSkillMigrations(repositoryRoot = root) {
  return JSON.parse(readFileSync(path.join(repositoryRoot, 'config/skill-migrations.json'), 'utf8'));
}

/** Record validation is independent of current package registration: planned names remain inert. */
export function validateSkillMigrations(document, { manifest } = {}) {
  const errors = [];
  const require = (condition, message) => { if (!condition) errors.push(message); };
  if (!object(document) || document.schemaVersion !== SKILL_MIGRATIONS_SCHEMA_VERSION || !Array.isArray(document.migrations)) return { valid: false, errors: ['Unsupported migration record schema.'] };
  const snapshot = document.sourceManifestSnapshot;
  if (!object(snapshot) || !Array.isArray(snapshot.resources) || snapshot.resources.some((entry) => !object(entry) || !name(entry.name) || !object(entry.source)) || new Set(snapshot.resources.map((entry) => entry.name)).size !== snapshot.resources.length || hash(snapshot.resources) !== snapshot.sha256) return { valid: false, errors: ['Historical contributor manifest snapshot is invalid.'] };
  if (manifest !== undefined && (!object(manifest) || !Array.isArray(manifest.resources) || manifest.resources.some((entry) => !object(entry) || !name(entry.name) || !object(entry.source)) || hash(manifest.resources.map((entry) => ({ name: entry.name, source: entry.source }))) !== snapshot.sha256)) return { valid: false, errors: ['Historical contributor manifest differs from supplied authority.'] };
  const resources = new Map(snapshot.resources.map((entry) => [entry.name, entry]));
  const ids = new Set(); const legacyIds = new Set();
  for (const migration of document.migrations) {
    if (!object(migration)) { errors.push('Migration must be an object.'); continue; }
    require(name(migration.id) && !ids.has(migration.id), 'Migration id must be unique.'); ids.add(migration.id);
    require(Number.isInteger(migration.version) && migration.version > 0 && migration.state === 'planned', `${migration.id}: versioned planned state required.`);
    require(Array.isArray(migration.legacy) && migration.legacy.length > 0, `${migration.id}: legacy identities required.`);
    for (const entry of Array.isArray(migration.legacy) ? migration.legacy : []) {
      if (!object(entry)) { errors.push(`${migration.id}: invalid legacy record.`); continue; }
      require(['package', 'resource'].includes(entry.kind) && name(entry.identity) && name(entry.capabilityId), `${migration.id}: invalid legacy identity.`);
      require(!legacyIds.has(key(entry)), `${migration.id}: duplicate legacy ownership.`); legacyIds.add(key(entry));
      require(names(entry.publicSkills) && entry.publicSkills.length > 0, `${entry.identity}: exact old public identities required.`);
      require(Array.isArray(entry.acceptedPrior) && entry.acceptedPrior.length > 0, `${entry.identity}: accepted prior evidence required.`);
      for (const prior of Array.isArray(entry.acceptedPrior) ? entry.acceptedPrior : []) {
        if (!object(prior)) { errors.push(`${entry.identity}: malformed prior evidence.`); continue; }
        require(sha(prior.revision), `${entry.identity}: immutable prior revision required.`);
        if (entry.kind === 'resource') {
          require(digest(prior.digest), `${entry.identity}: complete prior directory digest required.`);
          const resource = resources.get(entry.identity);
          require(Boolean(resource), `${entry.identity}: missing historical managed resource authority.`);
          if (resource) require(prior.revision === resource.source.revision && prior.digest?.value === resource.source.contentSha256 && prior.repository === resource.source.repository && prior.upstreamPath === resource.source.upstreamPath, `${entry.identity}: prior pin/digest disagrees with managed manifest.`);
        } else {
          require(typeof prior.version === 'string' && /^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?$/.test(prior.version), `${entry.identity}: accepted package version required.`);
          require(sameNames(prior.publicSkills, entry.publicSkills), `${entry.identity}: old public identities differ from accepted package evidence.`);
          for (const agent of ['codex', 'claude-code', 'pi']) {
            const claim = prior.digests?.[agent];
            require(digest(claim) && object(claim.authority) && claim.authority.repository === 'https://github.com/quickstark/skills' && claim.authority.revision === prior.revision && claim.authority.sourcePath === ({ codex: `codex/plugins/${entry.identity}`, 'claude-code': `packages/${entry.identity}`, pi: `pi/packages/${entry.identity}` })[agent], `${entry.identity}: ${agent} prior package digest/source authority required.`);
          }
        }
      }
      require(Array.isArray(entry.ownedLocations) && entry.ownedLocations.length > 0, `${entry.identity}: owned location scope required.`);
      if (entry.kind === 'resource') require(Array.isArray(entry.ownedLocations) && entry.ownedLocations.some((location) => location?.surface === 'shared-canonical' && location.path === `~/.agents/skills/${entry.identity}`), `${entry.identity}: exact managed canonical location required.`);
      else require(Array.isArray(entry.ownedLocations) && entry.ownedLocations.some((location) => location?.surface === 'native-manager' && location.packageId === entry.identity && location.marketplace === 'quickstark'), `${entry.identity}: native manager identity required.`);
      if (Array.isArray(entry.ownedLocations)) for (const location of entry.ownedLocations) {
        require(object(location) && (entry.kind === 'package'
          ? location.surface === 'native-manager' && location.packageId === entry.identity && location.marketplace === 'quickstark'
          : location.surface === 'shared-canonical' && location.path === `~/.agents/skills/${entry.identity}`
            || Object.values(resourceAliases).some((alias) => location.surface === alias.surface && location.path === `~/${alias.directory}/${entry.identity}` && location.linkTarget === `~/.agents/skills/${entry.identity}`)), `${entry.identity}: unknown or unsafe owned location.`);
      }
      require(Array.isArray(entry.replacements) && entry.replacements.length > 0, `${entry.identity}: replacement coverage required.`);
      const replacementKeys = new Set();
      for (const replacement of Array.isArray(entry.replacements) ? entry.replacements : []) {
        require(object(replacement) && name(replacement.packageId) && name(replacement.command) && name(replacement.capabilityId) && Array.isArray(entry.publicSkills) && entry.publicSkills.includes(replacement.legacyPublicSkill), `${entry.identity}: malformed replacement mapping.`);
        if (!object(replacement)) continue;
        const identity = `${replacement.packageId}:${replacement.command}:${replacement.capabilityId}`;
        require(!replacementKeys.has(identity), `${entry.identity}: duplicate replacement mapping.`); replacementKeys.add(identity);
      }
      require(Array.isArray(entry.replacements) && sameNames(sorted(entry.replacements.map((replacement) => replacement?.legacyPublicSkill)), entry.publicSkills), `${entry.identity}: replacement mapping loses an old public outcome.`);
      if (entry.kind === 'package') require(entry.replacements?.length === entry.publicSkills?.length, `${entry.identity}: package mapping must account for every old public outcome.`);
    }
    require(object(migration.retirement) && sameNames(migration.retirement.requirements, requirementNames) && ['unregister-owned-package', 'retire-unchanged-owned-resource-after-all-consumers'].includes(migration.retirement.operation), `${migration.id}: complete retirement prerequisites required.`);
    require(object(migration.rollback) && migration.rollback.scope === 'journaled-owned-operations-only' && migration.rollback.backup === 'preserve-verified-prior-payload-and-selection' && migration.rollback.verification === 'restore-prior-discovery-and-selection' && migration.rollback.onFailure === 'retain-journal-backups-and-report-actual-residual-state' && migration.rollback.executionAuthority === 'separate-from-planning', `${migration.id}: bounded rollback metadata required.`);
  }
  for (const identity of resources.keys()) require(legacyIds.has(`resource:${identity}`), `Missing historical contributor migration: ${identity}.`);
  require(legacyIds.has('package:ps-skills'), 'Missing ps-skills package migration.');
  return { valid: errors.length === 0, errors };
}

function safeAbsolute(value) {
  return text(value) && path.isAbsolute(value) && path.normalize(value) === value && value !== path.parse(value).root;
}

function observationConflicts(entry, observed, agent, homeDirectory) {
  if (!object(observed)) return ['missing-observation'];
  const failures = [];
  const owned = observed.ownership;
  if (!object(owned) || owned.manager !== 'quickstark' || !text(owned.recordId) || !object(owned.expected)) return ['unproven-ownership'];
  const expected = owned.expected;
  if (observed.agent !== agent) failures.push('wrong-agent');
  if (observed.dirty !== false) failures.push('dirty-or-uninspected');
  if (!safeAbsolute(observed.path) || !safeAbsolute(observed.canonicalPath) || observed.path === homeDirectory || observed.canonicalPath === homeDirectory) failures.push('unsafe-path');
  for (const field of ['path', 'canonicalPath', 'linkTarget', 'version', 'revision']) if (observed[field] !== expected[field]) failures.push(`changed-${field}`);
  if (!digest(observed.digest) || !digest(expected.digest) || observed.digest.value !== expected.digest.value) failures.push('changed-digest');
  if (!sameNames(observed.publicSkills, entry.publicSkills)) failures.push('changed-public-identities');
  if (observed.linkTarget !== null && !safeAbsolute(observed.linkTarget)) failures.push('unsafe-link-target');
  if (entry.kind === 'resource') {
    const canonical = path.join(homeDirectory, '.agents', 'skills', entry.identity);
    const alias = path.join(homeDirectory, resourceAliases[agent].directory, entry.identity);
    if (observed.canonicalPath !== canonical || !(observed.path === canonical && observed.linkTarget === null || observed.path === alias && observed.linkTarget === canonical)) failures.push('outside-managed-location');
    if (!entry.acceptedPrior.some((prior) => prior.revision === observed.revision && prior.digest.value === observed.digest?.value)) failures.push('unaccepted-prior-pin-or-digest');
    if (!names(observed.consumers) || observed.consumers.some((consumer) => !['codex', 'claude-code', 'pi'].includes(consumer)) || !observed.consumers.includes(agent)) failures.push('unproven-shared-consumers');
  } else {
    if (owned.packageId !== entry.identity || owned.marketplace !== 'quickstark') failures.push('wrong-native-package-owner');
    if (!entry.acceptedPrior.some((prior) => prior.version === observed.version && prior.revision === observed.revision && prior.digests[agent]?.value === observed.digest?.value)) failures.push('unaccepted-prior-version-or-digest');
  }
  return sorted(failures);
}

/** Pure preview. `explicitPackages` comes only from this invocation's --with-package.
 * `explicitProfile` must name a user-requested profile, not a saved profile or fresh default.
 * Package capabilityIds denote user-visible outcomes/domains, not implementation helpers.
 * Observations/evidence must come from independent current manager/filesystem checks.
 * ready-to-stage never authorizes exposure, retirement, deletion, or rollback execution.
 */
export function planSkillMigrations({ document = readSkillMigrations(), agent, homeDirectory, selection, packages, observations, explicitPackages = [], explicitProfile = null, manifest } = {}) {
  const validated = validateSkillMigrations(document, { manifest });
  if (!validated.valid) throw new Error(`Invalid migration records: ${validated.errors.join('; ')}`);
  if (!['codex', 'claude-code', 'pi'].includes(agent) || !safeAbsolute(homeDirectory)) throw new Error('Migration preview requires the selected agent and exact home directory.');
  if (!object(selection) || !names(selection.packages) || !names(selection.resources) || !names(explicitPackages)) throw new Error('Migration preview requires exact package/resource selections.');
  if (!Array.isArray(packages) || !Array.isArray(observations)) throw new Error('Package metadata and independent observations are required.');
  if (explicitProfile !== null && (!object(explicitProfile) || explicitProfile.source !== 'user-request' || !name(explicitProfile.id) || !names(explicitProfile.packages))) throw new Error('Only a user-requested explicit profile authorizes expanded package selection; saved/fresh defaults do not.');
  const registered = new Map();
  for (const pkg of packages) {
    if (!object(pkg) || !name(pkg.id) || !names(pkg.publicSkills) || !names(pkg.capabilityIds) || registered.has(pkg.id)) throw new Error('Invalid or duplicate package metadata.');
    registered.set(pkg.id, pkg);
  }
  const explicit = new Set([...explicitPackages, ...(explicitProfile?.packages ?? [])]);
  if ([...explicit].some((id) => registered.get(id)?.registered !== true)) throw new Error('Explicit package selection references an unavailable package.');
  const observedById = new Map();
  for (const observed of observations) {
    if (!object(observed) || !['package', 'resource'].includes(observed.kind) || !name(observed.identity) || observedById.has(key(observed))) throw new Error('Invalid or duplicate observed identity.');
    observedById.set(key(observed), observed);
  }
  // The intended replacement of every selected legacy outcome is the equivalence
  // boundary; metadata alone cannot expand that boundary during an ordinary update.
  const selectedLegacy = document.migrations.flatMap((migration) => migration.legacy).filter((entry) => selection[entry.kind === 'package' ? 'packages' : 'resources'].includes(entry.identity));
  const equivalentCommands = new Set(selectedLegacy.flatMap((entry) => entry.replacements.map((replacement) => replacement.command)));
  const equivalentCapabilities = new Set(selectedLegacy.flatMap((entry) => entry.replacements.map((replacement) => replacement.capabilityId)));
  for (const id of selection.packages) {
    const pkg = registered.get(id);
    if (!pkg || pkg.registered !== true) continue;
    for (const command of pkg.publicSkills) equivalentCommands.add(command);
    for (const capability of pkg.capabilityIds) equivalentCapabilities.add(capability);
  }
  const results = [];
  for (const migration of document.migrations) {
    const selected = migration.legacy.filter((entry) => selectedLegacy.includes(entry));
    if (!selected.length) continue;
    const conflicts = [];
    const bindings = [];
    for (const entry of selected) {
      const observed = observedById.get(key(entry));
      const issues = observationConflicts(entry, observed, agent, homeDirectory);
      conflicts.push(...issues.map((reason) => ({ identity: entry.identity, reason })));
      if (observed) bindings.push(structuredClone({ kind: observed.kind, identity: observed.identity, agent: observed.agent, path: observed.path, canonicalPath: observed.canonicalPath, linkTarget: observed.linkTarget, version: observed.version, revision: observed.revision, digest: observed.digest, publicSkills: observed.publicSkills, consumers: observed.consumers ?? [], ownershipRecord: observed.ownership?.recordId }));
    }
    const requirements = selected.flatMap((entry) => entry.replacements);
    const additions = []; const targets = [];
    for (const packageId of sorted(requirements.map((replacement) => replacement.packageId))) {
      const pkg = registered.get(packageId);
      const required = requirements.filter((replacement) => replacement.packageId === packageId);
      if (!pkg || pkg.registered !== true) { conflicts.push({ packageId, reason: 'replacement-package-unavailable' }); continue; }
      if (!text(pkg.version) || !sha(pkg.revision) || !digest(pkg.payloadDigest)) conflicts.push({ packageId, reason: 'replacement-artifact-unbound' });
      if (required.some((replacement) => !pkg.publicSkills.includes(replacement.command) || !pkg.capabilityIds.includes(replacement.capabilityId))) conflicts.push({ packageId, reason: 'replacement-capability-missing' });
      const evidence = pkg.evidence;
      if (!object(evidence) || evidence.revision !== pkg.revision || evidence.version !== pkg.version || !sameDigest(evidence.payloadDigest, pkg.payloadDigest) || evidence.agent !== agent || evidence.checksPassed !== true || evidence.closurePassed !== true || evidence.noticesPassed !== true || !text(evidence.reference) || !names(evidence.verifiedCapabilities) || required.some((replacement) => !evidence.verifiedCapabilities.includes(replacement.capabilityId))) conflicts.push({ packageId, reason: 'replacement-evidence-unverified' });
      const commands = sorted(pkg.publicSkills.filter((command) => !equivalentCommands.has(command)));
      const capabilities = sorted(pkg.capabilityIds.filter((capability) => !equivalentCapabilities.has(capability)));
      if ((commands.length || capabilities.length) && !explicit.has(packageId)) additions.push({ packageId, publicSkills: commands, capabilityIds: capabilities, selectionRequired: true });
      targets.push({ packageId, version: pkg.version, revision: pkg.revision, payloadDigest: structuredClone(pkg.payloadDigest), requiredCapabilities: sorted(required.map((replacement) => replacement.capabilityId)), explicitExpansion: explicit.has(packageId), additionalPublicSkills: commands, additionalCapabilityIds: capabilities });
    }
    results.push({ migrationId: migration.id, migrationVersion: migration.version, status: conflicts.length ? 'blocked' : additions.length ? 'selection-required' : 'ready-to-stage', retained: selected.map((entry) => ({ kind: entry.kind, identity: entry.identity })), targets, additions, conflicts, observedBindings: bindings, retirement: structuredClone(migration.retirement), rollback: structuredClone(migration.rollback), mutationAuthorized: false, deletePaths: [] });
  }
  return { schemaVersion: 1, agent, status: results.some((entry) => entry.status === 'blocked') ? 'blocked' : results.some((entry) => entry.status === 'selection-required') ? 'selection-required' : results.length ? 'ready-to-stage' : 'no-migration', selection: structuredClone(selection), migrations: results, mutationAuthorized: false, deletePaths: [], nextAction: results.length ? 'Stage only after resolving conflicts and explicit additions; revalidate all bindings and retirement prerequisites before any later exposure transaction.' : 'No selected legacy identities require these migrations.' };
}
