import { createHash } from 'node:crypto';
import { existsSync, readFileSync, realpathSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SKILLS, V3_INTERNAL_CAPABILITIES } from './qs-skill-catalog.mjs';
import { PS_PUBLIC_COMMANDS, PS_INTERNAL_CAPABILITIES } from './ps-skill-catalog.mjs';

export const PROVENANCE_SCHEMA_VERSION = 1;
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

/** Current coverage is derived from catalogs/manifest; provenance does not activate commands. */
export function getProvenanceInventory(root = repositoryRoot) {
  const manifest = readJson(root, 'config/personal-skills.manifest.json');
  return [
    ...SKILLS.map((entry) => ({ collection: 'qs', currentName: entry.name, role: 'public', path: `skills/${entry.bucket}/${entry.name}/SKILL.md`, owners: [entry.name] })),
    ...V3_INTERNAL_CAPABILITIES.map((entry) => ({ collection: 'qs', currentName: entry.name, role: 'private', path: `skills/internal/${entry.name}.md`, owners: [...entry.owners] })),
    ...PS_PUBLIC_COMMANDS.map((entry) => ({ collection: 'ps', currentName: entry.name, role: 'public', path: `${entry.sourcePath}/SKILL.md`, owners: [entry.name] })),
    ...PS_INTERNAL_CAPABILITIES.map((entry) => ({ collection: 'ps', currentName: entry.name, role: 'private', path: entry.sourcePath, owners: [...entry.owners] })),
    ...manifest.resources.map((entry) => ({ collection: 'contributor', currentName: entry.name, role: 'public', path: `${manifest.canonicalDirectory}/${entry.name}/SKILL.md`, owners: [entry.name] })),
  ];
}

/** Validates records and evidence bindings without fetching upstreams or mutating files.
 * Inventory may be supplied by the registry during later catalog migrations.
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
  const manifest = readJson(root, 'config/personal-skills.manifest.json');
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
      if (entry.collection === 'contributor') require(canonical.location === 'managed-standalone', `${label}: contributor is managed standalone until migration`);
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
  const lines = ['# Skill provenance', '', 'Generated from `config/skill-provenance.json`. Current ownership is separate from planned migration; a reviewed revision is not automatically adopted.', '', '| Stable capability | Current owner / role | Legacy identities | Planned owners |', '| --- | --- | --- | --- |'];
  for (const entry of [...document.capabilities].sort((a, b) => a.id.localeCompare(b.id, 'en'))) {
    lines.push(`| ${code(entry.id)} | ${entry.owners.map(code).join(', ')} / ${escapeCell(entry.role)} | ${entry.legacyIdentities.map(code).join(', ')} | ${entry.plannedOwners.map(code).join(', ') || 'None'} |`);
  }
  for (const entry of [...document.capabilities].sort((a, b) => a.id.localeCompare(b.id, 'en'))) {
    lines.push('', `## ${escapeCell(entry.id)}`, '', `Canonical: ${code(entry.canonical.path)} (${escapeCell(entry.canonical.location)}). Disposition: ${escapeCell(entry.disposition)}.`, '', escapeCell(entry.adaptationNotes));
    if (!entry.sources.length) lines.push('', 'Repository-authored; no upstream origin claimed.');
    else {
      lines.push('', '| Source | Original path | Baseline | Reviewed | Adopted | License |', '| --- | --- | --- | --- | --- | --- |');
      for (const source of [...entry.sources].sort((a, b) => `${a.repository}/${a.originalPath}`.localeCompare(`${b.repository}/${b.originalPath}`, 'en'))) {
        lines.push(`| [${escapeCell(source.originalName)}](${source.repository}/blob/${source.baselineRevision}/${urlPath(source.originalPath)}) | ${code(source.originalPath)} | ${code(source.baselineRevision)} | ${code(source.reviewedRevision)} | ${escapeCell(source.adoption.status)} ${source.adoption.revision ? code(source.adoption.revision) : '(no revision claimed)'} | ${escapeCell(source.license)} |`);

      }
    }
    for (const source of [...entry.sources].sort((a, b) => `${a.repository}/${a.originalPath}`.localeCompare(`${b.repository}/${b.originalPath}`, 'en'))) {
      lines.push('', `${code(source.originalName)} adoption: ${escapeCell(source.adoption.note)}`);
      if (source.digest) lines.push(`Source directory SHA-256: ${code(source.digest.value)}; authority: ${code(source.digest.authority.path)} / ${code(source.digest.authority.resource)}. This is not a derived-content digest.`);
      lines.push(`License paths (upstream): ${source.licensePaths.map(code).join(', ')}. Local notices: ${source.noticePaths.map(code).join(', ') || 'Not incorporated locally; preserved by pinned upstream payload until adaptation'}.`);
      for (const successor of source.successors ?? []) lines.push(`Reviewed successor: [${escapeCell(successor.name)}](${source.repository}/blob/${successor.revision}/${urlPath(successor.path)}); original identity retained.`);
      for (const credit of source.secondaryAttribution ?? []) lines.push(`Indirect credit: [${escapeCell(credit.name)}](${credit.reference}). ${escapeCell(credit.note)}`);
    }
    if (entry.derivedDigest) lines.push('', `Derived file SHA-256: ${code(entry.derivedDigest.value)}.`);
    lines.push('', `Validation evidence: ${entry.validationEvidence.map(code).join(', ')}.`);
  }
  lines.push('', '## Historical inventories', '');
  for (const snapshot of [...document.historicalSnapshots].sort((a, b) => a.id.localeCompare(b.id, 'en'))) lines.push(`- ${code(snapshot.id)}: ${snapshot.candidateCount} candidate dispositions at ${code(snapshot.revision)}, preserved in ${code(snapshot.path)} (SHA-256 ${code(snapshot.sha256)}).`);
  return lines.join('\n') + '\n';
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const document = assertSkillProvenance(readSkillProvenance());
  if (process.argv.includes('--render')) process.stdout.write(renderSkillProvenanceMarkdown(document));
  else process.stdout.write(`Validated ${document.capabilities.length} capability provenance records.\n`);
}
