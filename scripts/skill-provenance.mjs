import { createHash } from 'node:crypto';
import { existsSync, readFileSync, realpathSync, statSync, readdirSync, lstatSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SKILLS, V3_INTERNAL_CAPABILITIES } from './qs-skill-catalog.mjs';
import { PS_PUBLIC_COMMANDS, PS_INTERNAL_CAPABILITIES } from './ps-skill-catalog.mjs';

import { ADVANCED_PUBLIC_COMMANDS, ADVANCED_INTERNAL_CAPABILITIES } from './advanced-skill-catalog.mjs';
import { FRONTEND_PUBLIC_COMMANDS, FRONTEND_INTERNAL_CAPABILITIES } from './frontend-skill-catalog.mjs';
import { VIDEO_PUBLIC_COMMANDS, VIDEO_INTERNAL_CAPABILITIES } from './video-skill-catalog.mjs';
import { EXECUTION_PUBLIC_COMMANDS, EXECUTION_INTERNAL_CAPABILITIES } from './execution-skill-catalog.mjs';

export const PROVENANCE_SCHEMA_VERSION = 2;
const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const readJson = (root, relative) => JSON.parse(readFileSync(path.join(root, relative), 'utf8'));
const isText = (value) => typeof value === 'string' && value.trim().length > 0;
const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const sha = /^[a-f0-9]{40}$/;
const digest = /^[a-f0-9]{64}$/;
const relativePath = (value) => isText(value) && !path.isAbsolute(value) && !value.includes('\\') && !value.split('/').some((part) => ['', '.', '..'].includes(part));
const equalMembers = (left, right) => [...left].sort().join('\0') === [...right].sort().join('\0');
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

export function readSkillProvenance(root = repositoryRoot) {
  return readJson(root, 'config/skill-provenance.json');
}

// The original manifest authority survives retirement of live managed resources.
function readBaselineManifest(root) {
  const snapshot = readJson(root, 'config/skill-migrations.json').sourceManifestSnapshot;
  if (!isObject(snapshot) || !Array.isArray(snapshot.resources) || snapshot.resources.some(entry => !isObject(entry) || !isText(entry.name) || !isObject(entry.source)) || new Set(snapshot.resources.map(entry => entry.name)).size !== snapshot.resources.length || sha256(JSON.stringify(snapshot.resources)) !== snapshot.sha256) throw new Error('Invalid historical contributor manifest snapshot');
  return { canonicalDirectory: '~/.agents/skills', resources: snapshot.resources };
}

/** Baseline coverage remains historical after target activation; target coverage has its own inventory. */
export function getProvenanceInventory(root = repositoryRoot) {
  const manifest = readBaselineManifest(root);
  return [
    ...SKILLS.map((entry) => ({ collection: 'qs', currentName: entry.name, role: 'public', path: `skills/${entry.bucket}/${entry.name}/SKILL.md`, owners: [entry.name] })),
    ...V3_INTERNAL_CAPABILITIES.map((entry) => ({ collection: 'qs', currentName: entry.name, role: 'private', path: `skills/internal/${entry.name}.md`, owners: [...entry.owners] })),
    ...PS_PUBLIC_COMMANDS.map((entry) => ({ collection: 'ps', currentName: entry.name, role: 'public', path: `${entry.sourcePath}/SKILL.md`, owners: [entry.name] })),
    ...PS_INTERNAL_CAPABILITIES.map((entry) => ({ collection: 'ps', currentName: entry.name, role: 'private', path: entry.sourcePath, owners: [...entry.owners] })),
    ...manifest.resources.map((entry) => ({ collection: 'contributor', currentName: entry.name, role: 'public', path: `${manifest.canonicalDirectory}/${entry.name}/SKILL.md`, owners: [entry.name] })),
  ];
}

/** Separate target identities: importing this inventory never activates a collection. */
export function getTargetProvenanceInventory() {
  const publicEntries = [...SKILLS, ...ADVANCED_PUBLIC_COMMANDS, ...FRONTEND_PUBLIC_COMMANDS, ...VIDEO_PUBLIC_COMMANDS, ...EXECUTION_PUBLIC_COMMANDS].map(entry => ({
    id: `target:public:${entry.name}`, package: entry.packageName ?? entry.codexPlugin,
    name: entry.name, role: 'public', path: `${entry.sourcePath ?? `skills/${entry.bucket}/${entry.name}`}/SKILL.md`, owners: [entry.name],
  }));
  const privateEntries = [
    ...V3_INTERNAL_CAPABILITIES.map(entry => ({ ...entry, packageName: 'qs-skills', sourcePath: `skills/internal/${entry.name}.md` })),
    ...ADVANCED_INTERNAL_CAPABILITIES.map(entry => ({ ...entry, packageName: 'qs-advanced' })),
    ...FRONTEND_INTERNAL_CAPABILITIES, ...VIDEO_INTERNAL_CAPABILITIES, ...EXECUTION_INTERNAL_CAPABILITIES,
  ].map(entry => ({ id: `target:private:${entry.packageName}:${entry.name}`, package: entry.packageName, name: entry.name, role: 'private', path: entry.sourcePath, owners: [...(entry.owners ?? [entry.owner])] }));
  return [...publicEntries, ...privateEntries];
}

/** Scope links retain original IDs; owner-context is not a claim of copied source bytes. */
export function getTargetBaselineLinks(root = repositoryRoot) {
  const inventory = getTargetProvenanceInventory();
  const links = new Map(inventory.map(entry => [entry.id, new Set()]));
  for (const entry of inventory) {
    if (entry.package === 'qs-advanced') links.get(entry.id).add(entry.role === 'public' ? `ps:${entry.name.replace(/^qs-/, 'ps-')}` : `ps-internal:${entry.name}`);
    else if (SKILLS.some(skill => skill.name === entry.name) && entry.role === 'public') links.get(entry.id).add(`qs:${entry.name}`);
    else if (entry.role === 'private' && entry.package === 'qs-skills') links.get(entry.id).add(`qs-internal:${entry.name}`);
  }
  for (const migration of readJson(root, 'config/skill-migrations.json').migrations) for (const legacy of migration.legacy) for (const replacement of legacy.replacements) {
    const target = links.get(`target:public:${replacement.command}`);
    if (!target) throw new Error(`Migration replacement missing target: ${replacement.command}`);
    target.add(replacement.capabilityId);
    target.add(legacy.kind === 'package' ? `ps:${replacement.legacyPublicSkill}` : legacy.capabilityId);
  }
  for (const entry of inventory.filter(entry => entry.role === 'private' && !links.get(entry.id).size)) {
    for (const owner of entry.owners) for (const id of links.get(`target:public:${owner}`) ?? []) links.get(entry.id).add(id);
  }
  return new Map([...links].map(([id, values]) => [id, [...values].sort()]));
}

const closureDefinitions = [
  { owner: 'qs-video', root: 'skills/video/qs-video', moduleRoot: 'modules', repository: 'https://github.com/heygen-com/hyperframes', revision: VIDEO_INTERNAL_CAPABILITIES[0].sourceRevision },
  { owner: 'qs-unlazy', root: 'skills/engineering/qs-unlazy', moduleRoot: 'modules/unlazy', repository: 'https://github.com/Leonxlnx/unlazy', revision: EXECUTION_INTERNAL_CAPABILITIES[0].sourceRevision },
];

const targetNoticePaths = [
  ['qs-advanced', 'skills/advanced/THIRD_PARTY_NOTICES.md'],
  ['qs-frontend', 'skills/frontend/THIRD_PARTY_NOTICES.md'],
  ['qs-video', 'skills/video/qs-video/LICENSE'],
  ['qs-video', 'skills/video/qs-video/NOTICE'],
  ['qs-execution', 'skills/engineering/qs-unlazy/modules/unlazy/LICENSE'],
];

function validateTargetProvenance(document, { root, checkFiles, safeFile, require, stringArray }) {
  const target = document.target;
  if (!isObject(target)) { require(false, 'target: mappings required'); return; }
  require(target.schemaVersion === 1, 'target: unsupported schemaVersion');
  const expected = new Map(getTargetProvenanceInventory().map(entry => [entry.id, entry]));
  const links = getTargetBaselineLinks(root);
  const baselineIds = new Set(document.capabilities.map(entry => entry?.id));
  const seen = new Set(), covered = new Set();
  if (!Array.isArray(target.capabilities)) { require(false, 'target: capabilities must be an array'); return; }
  for (const entry of target.capabilities) {
    if (!isObject(entry)) { require(false, 'target: malformed capability'); continue; }
    const label = entry.id ?? 'target capability', catalog = expected.get(entry.id);
    require(!seen.has(entry.id), `${label}: duplicate target identity`); seen.add(entry.id);
    if (!catalog) { require(false, `${label}: not in target catalog`); continue; }
    for (const field of ['name', 'role', 'package', 'path']) require(entry[field] === catalog[field], `${label}: target ${field} differs from catalog`);
    if (stringArray(entry.owners, `${label} owners`)) require(equalMembers(entry.owners, catalog.owners), `${label}: target owner coverage differs`);
    if (stringArray(entry.baselineIds, `${label} baselineIds`)) {
      require(equalMembers(entry.baselineIds, links.get(entry.id)), `${label}: baseline origin coverage differs from catalogs/migrations`);
      for (const id of entry.baselineIds) { require(baselineIds.has(id), `${label}: unknown baseline stable ID ${id}`); covered.add(id); }
    }
    require(entry.originScope === (entry.role === 'public' || ['qs-skills', 'qs-advanced'].includes(entry.package) ? 'identity-and-migration' : 'owner-context'), `${label}: explicit origin scope required`);
    const decision = entry.decision;
    require(isObject(decision) && ['pending', 'reviewed', 'retained-baseline', 'adopted', 'unknown'].includes(decision.status) && isText(decision.note), `${label}: explicit target decision required`);
    if (isObject(decision)) {
      if (stringArray(decision.evidence, `${label} decision evidence`, { empty: ['pending', 'unknown'].includes(decision.status) })) for (const evidence of decision.evidence) safeFile(evidence, `${label} evidence`);
      require(['pending', 'unknown'].includes(decision.status) ? decision.revision === null : sha.test(decision.revision), `${label}: decision revision must distinguish unknown from evidenced revision`);
    }
    const fileOK = safeFile(entry.path, label);
    require(isObject(entry.derivedDigest) && entry.derivedDigest.algorithm === 'sha256' && entry.derivedDigest.kind === 'file' && digest.test(entry.derivedDigest.value), `${label}: derived file digest required`);
    if (fileOK && checkFiles && isObject(entry.derivedDigest)) require(sha256(readFileSync(path.join(root, entry.path))) === entry.derivedDigest.value, `${label}: target derived digest mismatch`);
  }
  for (const id of expected.keys()) require(seen.has(id), `target coverage: missing ${id}`);
  for (const id of baselineIds) require(covered.has(id), `target coverage: unmapped baseline ${id}`);
  if (!Array.isArray(target.closures)) { require(false, 'target: closures required'); return; }
  const notices = Array.isArray(target.notices) ? target.notices : [];
  require(Array.isArray(target.notices) && equalMembers(notices.map(entry => `${entry?.package}:${entry?.path}`), targetNoticePaths.map(([owner, file]) => `${owner}:${file}`)), 'target: notice coverage differs');
  for (const notice of notices) {
    if (!isObject(notice)) { require(false, 'target: malformed notice'); continue; }
    require(digest.test(notice.sha256), 'target: notice digest required');
    if (safeFile(notice.path, 'target notice') && checkFiles) require(sha256(readFileSync(path.join(root, notice.path))) === notice.sha256, 'target: notice digest mismatch');
  }
  const closureOwners = new Set();
  for (const closure of target.closures) {
    if (!isObject(closure)) { require(false, 'target: malformed closure'); continue; }
    const definition = closureDefinitions.find(entry => entry.owner === closure.owner);
    require(!closureOwners.has(closure.owner), 'target: duplicate closure owner'); closureOwners.add(closure.owner);
    if (!definition) { require(false, 'target: ownerless closure'); continue; }
    const indexPath = `${definition.root}/references/dependency-index.json`;
    require(closure.path === indexPath, `${closure.owner}: wrong closure path`);
    require(digest.test(closure.sha256), `${closure.owner}: closure digest required`);
    require(closure.reviewedRevision === definition.revision, `${closure.owner}: reviewed closure pin mismatch`);
    require(['unknown', 'not-adopted', 'adapted'].includes(closure.adoptionStatus), `${closure.owner}: explicit closure adoption status required`);
    const adopted = closure.adoptionStatus === 'adapted';
    require(adopted ? closure.adoptedRevision === definition.revision : closure.adoptedRevision === null, `${closure.owner}: reviewed closure pin is not an adopted revision without evidence`);
    if (stringArray(closure.adoptionEvidence, `${closure.owner} adoption evidence`, { empty: !adopted })) for (const evidence of closure.adoptionEvidence) safeFile(evidence, `${closure.owner} adoption evidence`);
    if (adopted) require(target.capabilities.some(entry => entry?.role === 'public' && entry.name === closure.owner && entry.decision?.status === 'adopted'), `${closure.owner}: closure adoption requires an adopted owner decision`);
    if (!safeFile(closure.path, closure.owner) || !checkFiles) continue;
    const bytes = readFileSync(path.join(root, closure.path));
    require(sha256(bytes) === closure.sha256, `${closure.owner}: closure digest mismatch`);
    let index;
    try { index = JSON.parse(bytes); } catch { require(false, `${closure.owner}: invalid closure JSON`); continue; }
    if (!isObject(index)) { require(false, `${closure.owner}: malformed closure index`); continue; }
    require(index.sourceRepository === definition.repository && index.sourceRevision === definition.revision, `${closure.owner}: closure source pin mismatch`);
    if (closure.owner === 'qs-video') {
      const modules = [...expected.values()].filter(entry => entry.role === 'private' && entry.owners.includes(closure.owner));
      require(Array.isArray(index.modules) && equalMembers(index.modules.map(entry => entry?.id), modules.map(entry => entry.name)), `${closure.owner}: module metadata coverage differs`);
      for (const module of Array.isArray(index.modules) ? index.modules : []) require(isObject(module) && module.entry === `modules/${module.id}/instructions.md` && sha.test(module.upstreamTreeHash), `${closure.owner}: invalid module metadata`);
    } else require(index.moduleRoot === definition.moduleRoot, `${closure.owner}: incorrect module root`);
    const destinations = new Set(), sources = new Set();
    if (!Array.isArray(index.files)) { require(false, `${closure.owner}: closure files required`); continue; }
    for (const file of index.files) {
      if (!isObject(file)) { require(false, `${closure.owner}: malformed closure file`); continue; }
      require(relativePath(file.sourcePath) && digest.test(file.sourceSha256) && !sources.has(file.sourcePath), `${closure.owner}: invalid/duplicate original source digest record`);
      sources.add(file.sourcePath);
      const destination = closure.owner === 'qs-video' ? file.destinationPath : `${index.moduleRoot}/${file.destination}`;
      if (destination === null && file.disposition === 'omit-public-invocation-metadata' && file.sourcePath.endsWith('/agents/openai.yaml')) continue;
      require(relativePath(destination) && !destinations.has(destination), `${closure.owner}: duplicate/unsafe destination`); destinations.add(destination);
      if (safeFile(`${definition.root}/${destination}`, closure.owner)) require(digest.test(file.derivedSha256) && sha256(readFileSync(path.join(root, definition.root, destination))) === file.derivedSha256, `${closure.owner}: closure derived digest mismatch ${destination}`);
    }
    require(index.localFiles === undefined || Array.isArray(index.localFiles), `${closure.owner}: localFiles must be an array`);
    for (const local of Array.isArray(index.localFiles) ? index.localFiles : []) {
      if (!isObject(local)) { require(false, `${closure.owner}: malformed local file`); continue; }
      require(!destinations.has(local.path), `${closure.owner}: duplicate local destination`); destinations.add(local.path);
      if (safeFile(`${definition.root}/${local.path}`, closure.owner)) require(digest.test(local.sha256) && sha256(readFileSync(path.join(root, definition.root, local.path))) === local.sha256, `${closure.owner}: local derived digest mismatch`);
    }
    const walk = directory => {
      for (const item of readdirSync(directory, { withFileTypes: true })) {
        const full = path.join(directory, item.name);
        if (item.isDirectory()) walk(full);
        else require(item.isFile() && destinations.has(path.relative(path.join(root, definition.root), full).split(path.sep).join('/')), `${closure.owner}: unindexed or nonregular private resource ${item.name}`);
      }
    };
    const moduleDirectory = path.join(root, definition.root, definition.moduleRoot);
    if (existsSync(moduleDirectory) && lstatSync(moduleDirectory).isDirectory()) walk(moduleDirectory); else require(false, `${closure.owner}: missing module closure`);
    for (const entry of expected.values()) if (entry.role === 'private' && entry.owners.includes(closure.owner)) require(destinations.has(path.relative(definition.root, entry.path)), `${closure.owner}: missing private module entry ${entry.name}`);
  }
  for (const definition of closureDefinitions) require(closureOwners.has(definition.owner), `target: missing closure ${definition.owner}`);
}

/** Validates records and evidence bindings without fetching upstreams or mutating files.
 * An inventory override is for baseline fixtures, never a substitute for target mappings.
 * checkFiles=false skips local artifact checks, not coverage/schema/digest-authority checks.
 */
export function validateSkillProvenance(document, { root = repositoryRoot, inventory = getProvenanceInventory(root), checkFiles = true } = {}) {
  const errors = [];
  const require = (condition, message) => { if (!condition) errors.push(message); };
  const safeFile = (relative, label) => {
    if (!relativePath(relative)) { errors.push(`${label}: unsafe repository path`); return false; }
    if (!checkFiles) return true;
    const target = path.join(root, relative);
    if (!existsSync(target)) { errors.push(`${label}: missing file ${relative}`); return false; }
    const resolved = realpathSync(target);
    const base = realpathSync(root);
    if (resolved !== base && !resolved.startsWith(base + path.sep)) { errors.push(`${label}: file escapes repository`); return false; }
    if (!statSync(resolved).isFile()) { errors.push(`${label}: expected regular file ${relative}`); return false; }
    return true;
  };
  const stringArray = (value, label, { empty = false } = {}) => {
    const valid = Array.isArray(value) && (empty || value.length > 0) && value.every(isText) && new Set(value).size === value.length;
    require(valid, `${label}: expected ${empty ? '' : 'nonempty '}unique string array`);
    return valid;
  };
  if (!isObject(document)) return { valid: false, errors: ['provenance: expected an object'] };
  require(document.schemaVersion === PROVENANCE_SCHEMA_VERSION, 'provenance: unsupported schemaVersion');
  if (!Array.isArray(document.capabilities)) return { valid: false, errors: [...errors, 'provenance: capabilities must be an array'] };
  const manifest = readBaselineManifest(root);
  const resources = new Map(manifest.resources.map((entry) => [entry.name, entry]));
  const expected = new Map(inventory.map((entry) => [`${entry.collection}:${entry.role}:${entry.currentName}`, entry]));
  const seen = new Set();
  const ids = new Set();
  for (const entry of document.capabilities) {
    if (!isObject(entry)) { errors.push('capability: expected an object'); continue; }
    const label = entry.id ?? 'capability';
    require(isText(entry.id) && /^[a-z0-9][a-z0-9:_-]*$/.test(entry.id), `${label}: stable id required`);
    require(!ids.has(entry.id), `${label}: duplicate stable id`); ids.add(entry.id);
    require(isText(entry.collection) && isText(entry.currentName), `${label}: collection and currentName required`);
    require(['public', 'private'].includes(entry.role), `${label}: invalid role`);
    const key = `${entry.collection}:${entry.role}:${entry.currentName}`;
    require(!seen.has(key), `${label}: duplicate capability coverage`); seen.add(key);
    const current = expected.get(key);
    require(Boolean(current), `${label}: not in current catalog/manifest inventory`);
    const canonical = entry.canonical;
    require(isObject(canonical) && isText(canonical.owner) && isText(canonical.path), `${label}: canonical owner/path required`);
    if (stringArray(entry.owners, `${label}.owners`) && current) require(equalMembers(entry.owners, current.owners), `${label}: owner coverage differs from catalog`);
    if (isObject(canonical)) {
      require(Array.isArray(entry.owners) && entry.owners.includes(canonical.owner), `${label}: canonical owner missing from owners`);
      require(['repository', 'managed-standalone'].includes(canonical.location), `${label}: invalid canonical location`);
      if (current) require(canonical.path === current.path, `${label}: canonical path differs from inventory`);
      if (entry.collection === 'contributor') require(canonical.location === 'managed-standalone', `${label}: baseline contributor location must remain historical managed standalone`);
      else {
        require(canonical.location === 'repository', `${label}: catalog capability must be repository-owned`);
        safeFile(canonical.path, label);
        require(!/(^|\/)(misc|personal|in-progress|deprecated)(\/|$)/.test(canonical.path ?? ''), `${label}: dormant content cannot be promoted by provenance`);
      }
    }
    stringArray(entry.legacyIdentities, `${label}.legacyIdentities`);
    stringArray(entry.plannedOwners, `${label}.plannedOwners`, { empty: true });
    require(['repository-authored', 'adapted', 'upstream-pinned'].includes(entry.disposition), `${label}: invalid disposition`);
    require(isText(entry.adaptationNotes), `${label}: adaptation notes required`);
    if (stringArray(entry.validationEvidence, `${label}.validationEvidence`)) for (const file of entry.validationEvidence) safeFile(file, `${label}.validationEvidence`);
    if (!Array.isArray(entry.sources)) { errors.push(`${label}: sources must be an array`); continue; }
    require(entry.disposition !== 'repository-authored' || entry.sources.length === 0, `${label}: repository-authored disposition must have no invented upstream sources`);
    require(entry.disposition === 'repository-authored' || entry.sources.length > 0, `${label}: upstream disposition requires sources`);
    const sourceIds = new Set();
    for (const source of entry.sources) {
      const sourceLabel = `${label}.source`;
      if (!isObject(source)) { errors.push(`${sourceLabel}: expected an object`); continue; }
      require(typeof source.repository === 'string' && /^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(source.repository), `${sourceLabel}: repository URL required`);
      require(isText(source.originalName) && relativePath(source.originalPath), `${sourceLabel}: original name/path required`);
      const sourceId = `${source.repository}:${source.originalPath}`;
      require(!sourceIds.has(sourceId), `${sourceLabel}: duplicate source identity`); sourceIds.add(sourceId);
      require(isText(source.license), `${sourceLabel}: explicit license required`);
      if (stringArray(source.licensePaths, `${sourceLabel}.licensePaths`)) require(source.licensePaths.every(relativePath), `${sourceLabel}: unsafe upstream license path`);
      if (stringArray(source.noticePaths, `${sourceLabel}.noticePaths`, { empty: true })) for (const file of source.noticePaths) safeFile(file, `${sourceLabel}.noticePaths`);
      require(typeof source.baselineRevision === 'string' && sha.test(source.baselineRevision), `${sourceLabel}: immutable baseline revision required`);
      require(typeof source.reviewedRevision === 'string' && sha.test(source.reviewedRevision), `${sourceLabel}: immutable reviewed revision required`);
      const adoption = source.adoption;
      require(isObject(adoption) && ['adapted', 'byte-identical', 'unknown', 'not-adopted'].includes(adoption.status) && isText(adoption.note), `${sourceLabel}: explicit adoption status/note required`);
      if (isObject(adoption)) {
        if (['unknown', 'not-adopted'].includes(adoption.status)) require(adoption.revision === null, `${sourceLabel}: unknown/not-adopted revision must be null`);
        else require(typeof adoption.revision === 'string' && sha.test(adoption.revision), `${sourceLabel}: immutable adopted revision required`);
        if (adoption.status === 'byte-identical') {
          require(isObject(source.digest), `${sourceLabel}: byte identity requires a verified source digest`);
          require(entry.collection === 'contributor' && canonical?.location === 'managed-standalone' && source.digest?.authority?.resource === entry.currentName, `${sourceLabel}: byte identity is only established for the matching managed contributor`);
        }
      }
      if (source.digest !== null) {
        const claim = source.digest;
        require(isObject(claim) && claim.algorithm === 'sha256' && claim.kind === 'portable-directory' && typeof claim.value === 'string' && digest.test(claim.value), `${sourceLabel}: invalid source digest`);
        const resource = isObject(claim) ? resources.get(claim.authority?.resource) : null;
        require(isObject(claim) && claim.authority?.path === 'config/personal-skills.manifest.json' && Boolean(resource), `${sourceLabel}: unverified source digest authority`);
        if (resource) {
          const pin = resource.source;
          require(source.repository === `https://github.com/${pin.repository}` && source.originalPath === pin.upstreamPath && source.adoption?.revision === pin.revision && claim.value === pin.contentSha256 && source.license === pin.license, `${sourceLabel}: source digest/revision does not match authoritative manifest`);
        }
      }
      if (source.secondaryAttribution !== undefined) {
        require(Array.isArray(source.secondaryAttribution), `${sourceLabel}: invalid secondary attribution`);
        if (Array.isArray(source.secondaryAttribution)) for (const credit of source.secondaryAttribution) require(isObject(credit) && isText(credit.name) && isText(credit.note) && typeof credit.reference === 'string' && /^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/blob\/[a-f0-9]{40}\/[A-Za-z0-9_./-]+$/.test(credit.reference), `${sourceLabel}: secondary credit requires a pinned evidence URL and note`);
      }
      if (source.successors !== undefined) {
        require(Array.isArray(source.successors) && source.successors.length > 0, `${sourceLabel}: invalid successor list`);
        if (Array.isArray(source.successors)) for (const successor of source.successors) require(isObject(successor) && isText(successor.name) && relativePath(successor.path) && typeof successor.revision === 'string' && sha.test(successor.revision), `${sourceLabel}: successor identity/path/revision required`);
      }
    }
    if (entry.derivedDigest !== null) {
      const claim = entry.derivedDigest;
      require(isObject(claim) && claim.algorithm === 'sha256' && claim.kind === 'file' && typeof claim.value === 'string' && digest.test(claim.value), `${label}: invalid derived digest`);
      require(canonical?.location === 'repository', `${label}: derived digests require repository-owned canonical content`);
      if (isObject(claim) && checkFiles && canonical?.location === 'repository' && safeFile(canonical.path, label)) require(sha256(readFileSync(path.join(root, canonical.path))) === claim.value, `${label}: derived digest does not match current canonical bytes`);
    }
  }
  for (const [key] of expected) require(seen.has(key), `coverage: missing ${key}`);
  // Preserve original PS inventory independently of current namespace or adopted revision.
  require(Array.isArray(document.historicalSnapshots) && document.historicalSnapshots.length > 0, 'historicalSnapshots: required');
  if (Array.isArray(document.historicalSnapshots)) {
    const snapshots = new Set();
    for (const snapshot of document.historicalSnapshots) {
      if (!isObject(snapshot)) { errors.push('historicalSnapshot: expected an object'); continue; }
      require(isText(snapshot.id) && !snapshots.has(snapshot.id), 'historicalSnapshot: duplicate/missing id'); snapshots.add(snapshot.id);
      require(typeof snapshot.revision === 'string' && sha.test(snapshot.revision), `${snapshot.id}: immutable snapshot revision required`);
      require(typeof snapshot.sha256 === 'string' && digest.test(snapshot.sha256), `${snapshot.id}: snapshot digest required`);
      require(Array.isArray(snapshot.dispositions) && typeof snapshot.dispositionsSha256 === 'string' && digest.test(snapshot.dispositionsSha256) && sha256(JSON.stringify(snapshot.dispositions)) === snapshot.dispositionsSha256, `${snapshot.id}: historical disposition digest mismatch`);
      if (safeFile(snapshot.path, snapshot.id) && checkFiles) {
        const bytes = readFileSync(path.join(root, snapshot.path));
        require(sha256(bytes) === snapshot.sha256, `${snapshot.id}: snapshot digest mismatch`);
        let original; try { original = JSON.parse(bytes); } catch { errors.push(`${snapshot.id}: invalid snapshot JSON`); continue; }
        require(snapshot.repository === original.upstream?.repository && snapshot.revision === original.upstream?.commit, `${snapshot.id}: historical source mismatch`);
        const candidates = original.candidates?.map((entry) => entry.id) ?? [];
        require(snapshot.candidateCount === candidates.length, `${snapshot.id}: snapshot candidate count mismatch`);
        require(Array.isArray(snapshot.dispositions) && snapshot.dispositions.length === candidates.length && equalMembers(snapshot.dispositions.map((entry) => entry?.candidateId), candidates), `${snapshot.id}: incomplete historical disposition coverage`);
      }
    }
    require(snapshots.has('pstack-0.14.1'), 'historicalSnapshots: original pstack-0.14.1 record missing');
  }
  validateTargetProvenance(document, { root, checkFiles, safeFile, require, stringArray });
  return { valid: errors.length === 0, errors };
}

export function assertSkillProvenance(document, options) {
  const result = validateSkillProvenance(document, options);
  if (!result.valid) throw new Error(`Invalid skill provenance:\n${result.errors.join('\n')}`);
  return document;
}

const escapeCell = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('|', '&#124;').replaceAll('\n', ' ');
const urlPath = (value) => value.split('/').map(encodeURIComponent).join('/');
const code = (value) => `\`${escapeCell(value).replaceAll('`', '&#96;')}\``;

/** Pure stable rendering; callers must validate before publishing generated documentation. */
export function renderSkillProvenanceMarkdown(document) {
  const sorted = entries => [...entries].sort((a, b) => a.id.localeCompare(b.id, 'en'));
  const lines = ['# Skill provenance', '',
    'Generated from [the provenance records](../../config/skill-provenance.json). Baseline installation history and target ownership are separate. Catalog mappings do not activate packages or adopt reviewed sources.', '',
    `${document.capabilities.length} baseline capabilities preserve ${document.capabilities.reduce((sum, entry) => sum + entry.sources.length, 0)} source mappings. Original paths, immutable revisions, license paths, local notices, adaptation notes and evidence remain in the records. Source directory digests measure upstream payloads; each is not a derived-content digest. Original manifest authority is preserved by the hashed contributor snapshot in config/skill-migrations.json even after live resources retire.`, '',
    '## Target ownership', '',
    'Target decisions remain explicit: pending/unknown make no revision claim; reviewed records assessment; retained-baseline records rejection of a proposed change; adopted requires separate evidence. Decision revisions identify the QuickStark implementation revision, not every upstream origin. Baseline source adoption is never inherited as target adoption. Owner-context links retain the public owner’s origin scope; they do not assert that every private helper copied every listed origin.', '',
    '| Target / role | Package / owners | Baseline stable IDs | Decision |', '| --- | --- | --- | --- |'];
  for (const entry of sorted(document.target.capabilities)) lines.push(`| ${code(entry.name)} / ${entry.role} | ${code(entry.package)} / ${entry.owners.map(code).join(', ')} | ${entry.baselineIds.map(code).join(', ')} | ${entry.decision.status}${entry.decision.revision ? ` ${code(entry.decision.revision)}` : ' (no revision claimed)'} |`);
  lines.push('', '### Complete private dependency indexes', '', 'Indexes retain individual original and derived hashes, source paths, destination paths and runtime resources. Their digest binds the complete index; validation also hashes every retained resource and rejects unindexed private files. Reviewed source pins below are not adoption claims.', '', '| Owner | Index | Reviewed source revision | Index SHA-256 / source adoption |', '| --- | --- | --- | --- |');
  for (const closure of [...document.target.closures].sort((a, b) => a.owner.localeCompare(b.owner, 'en'))) lines.push(`| ${code(closure.owner)} | [Dependency index](../../${closure.path}) | ${code(closure.reviewedRevision)} | ${code(closure.sha256)} / ${closure.adoptionStatus}${closure.adoptedRevision ? ` ${code(closure.adoptedRevision)}` : ' (no revision claimed)'} |`);
  lines.push('', 'Target notices: ' + [...document.target.notices].sort((a, b) => a.path.localeCompare(b.path, 'en')).map(entry => `[${entry.package}](${'../../' + entry.path})`).join(', ') + '.');
  lines.push('', '## Baseline identities', '', '| Stable capability | Baseline owners / role | Legacy identities |', '| --- | --- | --- |');
  for (const entry of sorted(document.capabilities)) lines.push(`| ${code(entry.id)} | ${entry.owners.map(code).join(', ')} / ${entry.role} | ${entry.legacyIdentities.map(code).join(', ')} |`);
  lines.push('', '## Baseline source history', '', 'Full source hashes, notices and validation evidence are authoritative in the JSON record. Unknown adoption stays unknown even when an upstream revision has been reviewed.', '', '| Capability | Source | Baseline | Reviewed | Adopted | License |', '| --- | --- | --- | --- | --- | --- |');
  for (const entry of sorted(document.capabilities)) {
    if (!entry.sources.length) lines.push(`| ${code(entry.id)} | Repository-authored | — | — | No upstream origin claimed | — |`);
    for (const source of [...entry.sources].sort((a, b) => `${a.repository}/${a.originalPath}`.localeCompare(`${b.repository}/${b.originalPath}`, 'en'))) lines.push(`| ${code(entry.id)} | [${escapeCell(source.originalName)}](${source.repository}/blob/${source.baselineRevision}/${urlPath(source.originalPath)}) | ${code(source.baselineRevision)} | ${code(source.reviewedRevision)} | ${escapeCell(source.adoption.status)} ${source.adoption.revision ? code(source.adoption.revision) : '(no revision claimed)'} | ${escapeCell(source.license)} |`);
  }
  const notes = new Set();
  for (const entry of sorted(document.capabilities)) for (const source of entry.sources) {
    for (const successor of source.successors ?? []) notes.add(`- Original ${code(source.originalName)} retains its identity; reviewed successor: [${escapeCell(successor.name)}](${source.repository}/blob/${successor.revision}/${urlPath(successor.path)}).`);
    for (const credit of source.secondaryAttribution ?? []) notes.add(`- Indirect credit: [${escapeCell(credit.name)}](${credit.reference}). ${escapeCell(credit.note)}`);
  }
  lines.push('', ...[...notes].sort(), '', '## Historical inventories', '');
  for (const snapshot of sorted(document.historicalSnapshots)) lines.push(`- ${code(snapshot.id)}: ${snapshot.candidateCount} candidate dispositions at ${code(snapshot.revision)}, preserved in [the original inventory](../../${snapshot.path}) (SHA-256 ${code(snapshot.sha256)}).`);
  return lines.join('\n') + '\n';
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const document = assertSkillProvenance(readSkillProvenance());
  if (process.argv.includes('--render')) process.stdout.write(renderSkillProvenanceMarkdown(document));
  else process.stdout.write(`Validated ${document.capabilities.length} capability provenance records.\n`);
}
