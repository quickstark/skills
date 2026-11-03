import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { TARGET_SKILL_COLLECTIONS, TARGET_PUBLIC_COMMANDS, LEGACY_SKILL_COLLECTIONS } from './skill-collection-registry.mjs';
import { V3_INTERNAL_CAPABILITIES } from './qs-skill-catalog.mjs';
import { ADVANCED_INTERNAL_CAPABILITIES } from './advanced-skill-catalog.mjs';
import { FRONTEND_INTERNAL_CAPABILITIES } from './frontend-skill-catalog.mjs';
import { VIDEO_INTERNAL_CAPABILITIES } from './video-skill-catalog.mjs';
import { EXECUTION_INTERNAL_CAPABILITIES } from './execution-skill-catalog.mjs';
import { captureLegacyClaudeCore } from './claude-core-migration.mjs';
import { captureManagedSkillPayload } from './managed-skill-migration.mjs';
import { captureMigrationPath, revalidateMigrationPath } from './migration-filesystem.mjs';
import { observeNativePackages, runNativePackageCommand, nativePayloadSha256 } from './migration-native-packages.mjs';
import { verifyAdoptionAcceptance } from './adoption-acceptance.mjs';
import { readSelectionRecord, resolveTargetSelection, selectionRecordPath } from './skill-selection.mjs';
import { validateSkillMigrations } from './skill-migrations.mjs';
import { lockEntryMatches } from './personal-skills/lock.mjs';

const exec = promisify(execFile);
const check = (condition, message) => { if (!condition) throw new Error(message); };
const unique = (values) => [...new Set(values)].sort();
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const hash = (value) => createHash('sha256').update(value).digest('hex');
const ids = (commands) => commands.map((command) => command.name);
const roots = { codex: '.codex/skills', pi: '.pi/agent/skills', 'claude-code': '.claude/skills' };
const commonCriteria = ['AC-01', 'AC-08', 'AC-09', 'AC-13', 'AC-14', 'AC-15', 'AC-16', 'AC-17', 'AC-22', 'AC-23', 'AC-24'];
const packageCriteria = { 'qs-skills': ['AC-03', 'AC-04', 'AC-05', 'AC-06'], 'qs-specialists': ['AC-02', 'AC-04'], 'qs-advanced': ['AC-07', 'AC-11', 'AC-12'], 'qs-frontend': ['AC-02', 'AC-10', 'AC-20'], 'qs-video': ['AC-02', 'AC-18', 'AC-19', 'AC-20'], 'qs-execution': ['AC-21'] };
const privateCapabilities = { 'qs-skills': V3_INTERNAL_CAPABILITIES, 'qs-specialists': [], 'qs-advanced': ADVANCED_INTERNAL_CAPABILITIES, 'qs-frontend': FRONTEND_INTERNAL_CAPABILITIES, 'qs-video': VIDEO_INTERNAL_CAPABILITIES, 'qs-execution': EXECUTION_INTERNAL_CAPABILITIES };
const privatePrefixes = { 'qs-skills': 'qs-internal', 'qs-advanced': 'ps-internal', 'qs-frontend': 'frontend-internal', 'qs-video': 'video-internal', 'qs-execution': 'execution-internal' };

/** Pure catalog-derived audit obligations. No criterion is passed here. */
export function derivePackageAcceptanceObligations(packageId, document) {
  const collection = TARGET_SKILL_COLLECTIONS.find((entry) => entry.id === packageId); check(collection, 'Unknown target package.');
  const commands = TARGET_PUBLIC_COMMANDS.filter((entry) => entry.collectionId === packageId);
  const replacements = document.migrations.flatMap((migration) => migration.legacy.flatMap((entry) => entry.replacements.filter((replacement) => replacement.packageId === packageId)));
  const replacementIds = replacements.map((replacement) => replacement.capabilityId);
  const commandId = (command) => command.provenance?.legacyName ? `ps:${command.provenance.legacyName}` : `qs:${command.name}`;
  const selectionCapabilityIds = unique([...replacementIds, ...commands.filter((command) => !replacements.some((replacement) => replacement.command === command.name)).map(commandId)]);
  const sourcePaths = commands.map((command) => command.sourcePath ?? `skills/${command.bucket}/${command.name}`);
  if (packageId === 'qs-skills') sourcePaths.push('skills/internal');
  if (packageId === 'qs-advanced') sourcePaths.push('skills/advanced');
  if (packageId === 'qs-frontend') sourcePaths.push('skills/frontend');
  return { packageId, publicSkills: ids(commands), selectionCapabilityIds, capabilityIds: unique([...commands.map(commandId), ...replacementIds, ...privateCapabilities[packageId].map((entry) => `${privatePrefixes[packageId]}:${entry.name}`)]),
    sourcePaths: unique([...sourcePaths, collection.codexPackageRoot, collection.piPackageRoot, collection.claudePackageRoot === '.' ? '.claude-plugin/plugin.json' : collection.claudePackageRoot,
      'config/skill-migrations.json', 'config/skill-provenance.json', 'config/skill-profiles.json', 'docs/skill-run-contract.md',
      'install.sh', '.github/workflows/validate.yml',
      ...['adoption-acceptance', 'claude-core-migration', 'managed-skills', 'managed-skill-input', 'managed-skill-migration', 'managed-skill-paths', 'managed-marketplace-bootstrap', 'managed-package-repair', 'install-skills', 'validate-skill-release', 'update-skills', 'migration-filesystem', 'migration-native-packages', 'migration-owned-paths', 'migration-transaction', 'skill-selection', 'skill-migrations'].map((name) => `scripts/${name}.mjs`),
      ...['qs-skill-catalog', 'ps-skill-catalog', 'skill-collection-registry', 'advanced-skill-catalog', 'frontend-skill-catalog', 'video-skill-catalog', 'execution-skill-catalog', 'optional-command-definition'].map((name) => `scripts/${name}.mjs`)]),
    requiredCriteria: unique([...commonCriteria, ...packageCriteria[packageId]]), requiredChecks: ['package-closure', 'notices', 'behavior', 'native-discovery', ...(packageId === 'qs-video' ? ['video-runtime'] : packageId === 'qs-execution' ? ['unlazy-runtime'] : [])] };
}

async function jsonFile(file, fallback) {
  const snapshot = await captureMigrationPath(file);
  if (snapshot.kind === 'absent' && fallback !== undefined) return { value: fallback, snapshot };
  check(snapshot.kind === 'file' && snapshot.bytes <= 2 * 1024 * 1024, 'Input metadata must be a bounded regular file.');
  let value; try { value = JSON.parse(await readFile(file)); } catch { throw new Error('Input metadata JSON is invalid; contents withheld.'); }
  await revalidateMigrationPath(snapshot); return { value, snapshot };
}
async function runGit(args, cwd) {
  try { return await exec('git', args, { cwd, encoding: 'utf8', timeout: 30000, maxBuffer: 8 * 1024 * 1024, env: { ...process.env, GIT_OPTIONAL_LOCKS: '0', GIT_TERMINAL_PROMPT: '0' } }); }
  catch { throw new Error('Unable to inspect immutable release Git objects; no files were changed.'); }
}
function nativeJson(result) {
  check(typeof result?.stdout === 'string' && Buffer.byteLength(result.stdout) <= 4 * 1024 * 1024, 'Native inventory is unavailable or exceeds its bound.');
  try { return JSON.parse(result.stdout); } catch { throw new Error('Native inventory JSON is invalid; contents withheld.'); }
}
async function gitIdentity(payload, relative, revisions, repositoryRoot, git) {
  const prefix = relative === '.' ? '' : `${relative}/`;
  const files = payload.snapshot.entries.filter((entry) => entry.kind === 'file');
  const actual = new Map();
  for (const entry of files) { const bytes = await readFile(path.join(payload.snapshot.path, entry.path)); actual.set(`${prefix}${entry.path}`, { mode: entry.mode & 0o100 ? '100755' : '100644', oid: createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex') }); }
  for (const snapshot of payload.snapshots ?? [payload.snapshot]) await revalidateMigrationPath(snapshot);
  for (const revision of revisions) {
    let tree; try { tree = await git(['ls-tree', '-rz', '--full-tree', revision, '--', relative], repositoryRoot); } catch { continue; }
    let entries = tree.stdout.split('\0').filter(Boolean).map((line) => line.match(/^(\d+) (\w+) ([a-f0-9]{40})\t(.+)$/s));
    if (payload.snapshots) {
      const closure = payload.snapshots.map((snapshot) => path.relative(payload.snapshot.path,snapshot.path).split(path.sep).join('/'));
      entries = entries.filter((entry) => entry && closure.some((root) => entry[4] === `${prefix}${root}` || entry[4].startsWith(`${prefix}${root}/`)));
    }
    const directoryPaths = payload.snapshot.entries.filter((entry) => entry.kind === 'directory' && entry.path).map((entry) => `${prefix}${entry.path}/`);
    if (entries.length === actual.size && entries.length > 0 && entries.every((entry) => entry && entry[2] === 'blob' && actual.get(entry[4])?.oid === entry[3] && actual.get(entry[4])?.mode === entry[1]) && directoryPaths.every((directory) => entries.some((entry) => entry?.[4].startsWith(directory)))) return revision;
  }
  throw new Error('Installed package differs from every trusted prior release tree; preserve modified or unknown bytes.');
}

export async function verifyManagedReleasePackage({ repositoryRoot, auditPath = 'docs/validation/upstream-adoption-acceptance.json', pkg, agent, payload, revision, git = runGit }) {
  const verified = await verifyAdoptionAcceptance({ repositoryRoot, auditPath, packageId: pkg.id, agent,
    capabilityIds: pkg.capabilityIds, sourcePaths: pkg.sourcePaths, requiredCriteria: pkg.requiredCriteria,
    requiredChecks: pkg.requiredChecks, revision, version: pkg.version, payloadDigest: payload.payloadDigest,
    contentSha256: payload.snapshot.contentSha256 });
  const paths = unique(verified.evidenceSnapshots.map(snapshot => path.relative(repositoryRoot, snapshot.path)));
  check(paths.every(relative => relative && !relative.startsWith('../') && !path.isAbsolute(relative)), 'Acceptance evidence escaped the release checkout.');
  const tracked = (await git(['ls-files', '-z', '--', ...paths], repositoryRoot)).stdout.split('\0').filter(Boolean);
  const dirty = (await git(['status', '--porcelain', '--untracked-files=all', '--', ...paths], repositoryRoot)).stdout.trim();
  check(!dirty && paths.every(relative => tracked.some(file => file === relative || file.startsWith(relative + '/'))), 'Acceptance source and evidence must be tracked, unchanged release files; uncommitted audit decisions cannot authorize rollout.');
  check((await git(['rev-parse', 'HEAD'], repositoryRoot)).stdout.trim() === revision, 'Release HEAD changed during evidence verification.');
  return verified;
}
async function publicNames(root, payload) {
  const names = [];
  for (const entry of payload.snapshot.entries.filter((entry) => entry.kind === 'file' && entry.path.startsWith('skills/') && entry.path.endsWith('/SKILL.md'))) {
    check(entry.path.split('/').length === 3, 'Unexpected nested public skill.');
    const text = await readFile(path.join(root, entry.path), 'utf8'); const front = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)?.[1]; const name = front?.match(/^name:\s*([a-z0-9-]+)\s*$/m)?.[1];
    check(name === entry.path.split('/')[1], 'Installed public identity differs from its folder.'); names.push(name);
  }
  await revalidateMigrationPath(payload.snapshot); return names.sort();
}
const proofBinding = (observed) => ({...(observed.layout ? {layout:observed.layout} : {}), ...Object.fromEntries(['kind', 'identity', 'agent', 'path', 'canonicalPath', 'linkTarget', 'version', 'revision', 'digest', 'publicSkills', 'consumers'].map((field) => [field, observed[field] ?? (field === 'consumers' ? [] : null)]))});
function ownedObservation(value, nativeOwner = null) { return { ...value, dirty: false, ownership: { manager: 'quickstark', ...(nativeOwner ?? {}), recordId: `${value.agent}:${value.kind}:${value.identity}`, expected: Object.fromEntries(['path', 'canonicalPath', 'linkTarget', 'version', 'revision', 'digest'].map((field) => [field, value[field]])) } }; }

/** Reject invalid requested/saved selection before an optional marketplace prerequisite. */
export async function validateManagedSkillSelection({ repositoryRoot, selectionPath, agents, profile, withPackages }) {
  const [migration, profiles, saved] = await Promise.all([
    jsonFile(path.join(repositoryRoot, 'config/skill-migrations.json')),
    jsonFile(path.join(repositoryRoot, 'config/skill-profiles.json')),
    readSelectionRecord(selectionPath),
  ]);
  check(validateSkillMigrations(migration.value).valid, 'Migration authority is invalid.');
  for (const agent of agents) resolveTargetSelection({ agent, profiles: profiles.value,
    packageNames: unique([...TARGET_SKILL_COLLECTIONS, ...LEGACY_SKILL_COLLECTIONS].map(entry => entry.id)),
    resourceNames: migration.value.sourceManifestSnapshot.resources.map(entry => entry.name),
    savedRecord: saved.record, profile, withPackages });
}

/** Observe production inputs without creating receipts, staging, or changing managers.
 * Inject command execution only for isolated caller fixtures; it is not evidence. */
export async function buildManagedSkillInput({ repositoryRoot, homeDirectory, codexHomeDirectory = path.join(homeDirectory, '.codex'), claudeHomeDirectory = path.join(homeDirectory, '.claude'), piHomeDirectory = path.join(homeDirectory, '.pi/agent'), selectionPath = selectionRecordPath(homeDirectory), agents = ['codex'], profile = null, withPackages = [], auditPath = 'docs/validation/upstream-adoption-acceptance.json', repairSelection = null, runtime = {} }) {
  check(path.isAbsolute(repositoryRoot) && path.isAbsolute(homeDirectory) && path.isAbsolute(codexHomeDirectory) && path.isAbsolute(selectionPath), 'Absolute repository/user home/Codex home/state paths required.');
  check(agents.length > 0 && new Set(agents).size === agents.length && agents.every((agent) => ['codex', 'claude-code', 'pi'].includes(agent)), 'Select Codex, Claude Code, or Pi for native transactions.');
  const git = runtime.runGit ?? runGit; const command = runtime.runCommand ?? runNativePackageCommand;
  const customOtherHome = claudeHomeDirectory !== path.join(homeDirectory, '.claude') || piHomeDirectory !== path.join(homeDirectory, '.pi/agent');
  const customCodexHome = codexHomeDirectory !== path.join(homeDirectory, '.codex');
  const revision = (await git(['rev-parse', 'HEAD'], repositoryRoot)).stdout.trim(); check(/^[a-f0-9]{40}$/.test(revision), 'Release HEAD is invalid.');
  const [migrationFile, profileFile, repositoryPackage, saved] = await Promise.all([jsonFile(path.join(repositoryRoot, 'config/skill-migrations.json')), jsonFile(path.join(repositoryRoot, 'config/skill-profiles.json')), jsonFile(path.join(repositoryRoot, 'package.json')), readSelectionRecord(selectionPath)]);
  if (repairSelection) saved.record = repairSelection;
  const document = migrationFile.value; const validation = validateSkillMigrations(document); check(validation.valid, 'Migration authority is invalid.');
  const version = repositoryPackage.value.version; check(/^\d+\.\d+\.\d+(?:-[\w.-]+)?$/.test(version), 'Release version is invalid.');
  const knownRevisions = [...new Set([revision, ...(/^[a-f0-9]{40}$/.test(saved.record?.templateRevision) ? [saved.record.templateRevision] : []), ...document.migrations.flatMap((migration) => migration.legacy.filter((entry) => entry.kind === 'package').flatMap((entry) => entry.acceptedPrior.map((prior) => prior.revision)))])];
  const packages = []; const native = {}; const observations = []; const verifiedOwnership = new Map(); const configs = {}; const unrelatedNames = {};
  for (const collection of TARGET_SKILL_COLLECTIONS) {
    const obligations = derivePackageAcceptanceObligations(collection.id, document); const artifacts = {};
    for (const agent of agents) {
      const source = path.join(repositoryRoot, agent === 'codex' ? collection.codexPackageRoot : agent === 'claude-code' ? collection.claudePackageRoot : collection.piPackageRoot);
      const payload = await captureManagedSkillPayload(source); const manifest = await jsonFile(path.join(source, agent === 'codex' ? '.codex-plugin/plugin.json' : agent === 'claude-code' ? '.claude-plugin/plugin.json' : 'package.json'));
      check(manifest.value.name === collection.id && manifest.value.version === version, 'Target projection manifest differs from release version/identity.');
      artifacts[agent] = { source, payloadDigest: payload.payloadDigest, contentSha256: payload.snapshot.contentSha256, nativePayloadSha256: nativePayloadSha256(agent,payload.snapshot) };
    }
    packages.push({ id: collection.id, registered: true, version, revision, ...obligations, artifacts });
  }
  const allCollections = [...TARGET_SKILL_COLLECTIONS, LEGACY_SKILL_COLLECTIONS.find((entry) => entry.id === 'ps-skills')];
  const evidenceSnapshots = [];
  for (const agent of agents) {
    const configPath = agent === 'codex' ? path.join(codexHomeDirectory, 'config.toml') : path.join(agent === 'claude-code' ? claudeHomeDirectory : piHomeDirectory, 'settings.json');
    const configSnapshot = await captureMigrationPath(configPath); check(['file', 'absent'].includes(configSnapshot.kind), 'Native config must be a regular file.'); configs[agent] = configSnapshot;
    const nativeOptions = { host: agent, homeDirectory, codexHomeDirectory, claudeHomeDirectory, piHomeDirectory, cwd: repositoryRoot, runCommand: command, command: runtime.commands?.[agent] ?? (agent === 'claude-code' ? 'claude' : agent) };
    let installed;
    if (agent === 'codex') {
      const inventory = nativeJson(await command(nativeOptions.command, ['plugin', 'list', '--json'], nativeOptions));
      const markets = nativeJson(await command(nativeOptions.command, ['plugin', 'marketplace', 'list', '--json'], nativeOptions));
      const market = markets.marketplaces?.filter((entry) => entry.name === 'quickstark');
      check(market?.length === 1 && market[0].root === path.join(repositoryRoot, 'codex') && market[0].marketplaceSource?.sourceType === 'local' && market[0].marketplaceSource.source === path.join(repositoryRoot, 'codex'), `Codex prerequisite: register this verified local marketplace with codex plugin marketplace add ${JSON.stringify(path.join(repositoryRoot, 'codex'))}; then rerun the selected plan. Existing different registrations require a separate reviewed marketplace transition.`);
      check(Array.isArray(inventory.installed), 'Codex inventory lacks installed entries.');
      installed = inventory.installed.filter((entry) => entry.pluginId?.endsWith('@quickstark'));
      check(installed.every((entry) => allCollections.some((collection) => entry.pluginId === `${collection.id}@quickstark`)), 'Unknown QuickStark native package must be reconciled before migration.');
    } else if (agent === 'claude-code') {
      const inventory = nativeJson(await command(nativeOptions.command, ['plugin', 'list', '--json'], nativeOptions));
      const markets = nativeJson(await command(nativeOptions.command, ['plugin', 'marketplace', 'list', '--json'], nativeOptions));
      check(Array.isArray(inventory) && Array.isArray(markets), 'Claude native inventory shape is unsupported.');
      const market = markets.filter((entry) => entry.name === 'quickstark');
      check(market.length === 1 && market[0].source === 'directory' && market[0].path === repositoryRoot && market[0].installLocation === repositoryRoot, `Claude prerequisite: register this verified local marketplace with claude plugin marketplace add ${JSON.stringify(repositoryRoot)}; then rerun the selected plan. Existing different registrations require a separate reviewed marketplace transition.`);
      installed = inventory.filter((entry) => entry.id?.endsWith('@quickstark')).map((entry) => {
        check(entry.scope === 'user' && entry.enabled === true, 'Claude managed plugins require enabled user-scoped registrations.');
        check(allCollections.some((collection) => entry.id === `${collection.id}@quickstark`), 'Unknown QuickStark Claude package must be reconciled before migration.');
        return { ...entry, name: entry.id.split('@')[0], installed: true, source: { source: 'local', path: entry.readFromFolder } };
      });
    } else {
      const settings = await jsonFile(configPath, {}); check(settings.value && !Array.isArray(settings.value) && (!settings.value.packages || Array.isArray(settings.value.packages)), 'Pi settings shape is unsupported.');
      installed = [];
      for (const entry of settings.value.packages ?? []) {
        const value = typeof entry === 'string' ? entry : entry?.source;
        if (typeof value !== 'string' || !path.isAbsolute(value) && !value.startsWith('.')) continue;
        const source = path.resolve(path.dirname(configPath), value); const collection = allCollections.find((candidate) => source === path.join(repositoryRoot, candidate.piPackageRoot));
        if (!collection) { check(!allCollections.some((candidate) => source.endsWith('/' + candidate.piPackageRoot)), 'Pi has a stale QuickStark checkout path; preserve and explicitly reconcile it.'); continue; }
        check(typeof entry === 'string', 'Filtered Pi QuickStark entry requires an explicit filter-preserving migration.');
        const manifest = await jsonFile(path.join(source, 'package.json')); installed.push({ name: collection.id, version: manifest.value.version, source: { source: 'local', path: source }, installed: true, enabled: true });
      }
    }
    const bindings = [];
    for (const item of installed) {
      const name = agent === 'codex' ? item.pluginId.split('@')[0] : item.name; const collection = allCollections.find((entry) => entry.id === name);
      check(/^\d+\.\d+\.\d+(?:-[\w.-]+)?$/.test(item.version ?? ''), 'Native installed version must be an exact semantic version.');
      check(item.installed === true && item.enabled === true && item.source?.source === 'local', 'Native ownership requires enabled exact local package registration.');
      if (agent === 'codex') check(item.pluginId === `${name}@quickstark` && item.marketplaceName === 'quickstark', 'Native package owner conflicts with the observed QuickStark marketplace.');
      const canonicalPath = agent !== 'pi' ? path.join(agent === 'codex' ? codexHomeDirectory : claudeHomeDirectory, 'plugins/cache/quickstark', name, item.version) : item.source.path;
      const cachedManifest = agent === 'claude-code' && name === 'qs-skills' ? await jsonFile(path.join(canonicalPath,'.claude-plugin/plugin.json')) : null;
      const legacyRootCore = cachedManifest && Array.isArray(cachedManifest.value.skills) && cachedManifest.value.skills.some((skill) => typeof skill === 'string' && /^\.\/skills\/(engineering|productivity)\//.test(skill));
      const expectedSource = path.join(repositoryRoot, agent === 'codex' ? collection.codexPackageRoot : agent === 'claude-code' ? collection.claudePackageRoot : collection.piPackageRoot);
      check(item.source.path === expectedSource || legacyRootCore && item.source.path === repositoryRoot, 'Native ownership requires enabled exact local package registration.');
      const payload = legacyRootCore ? await captureLegacyClaudeCore(canonicalPath) : await captureManagedSkillPayload(canonicalPath);
      check(!legacyRootCore || payload.version === item.version, 'Legacy Claude core cache version differs from registration.');
      const observedNames = legacyRootCore ? payload.publicNames : await publicNames(canonicalPath, payload);
      // An older active package may lack newly added commands. It must still
      // match an entire trusted Git tree below; a subset alone proves no ownership.
      // Removed/renamed commands and the retained PS payload need explicit migration.
      const additivePrior = item.version !== version && TARGET_SKILL_COLLECTIONS.includes(collection)
        && observedNames.every((name) => collection.publicCommands.includes(name));
      check(same(observedNames, [...collection.publicCommands].sort()) || additivePrior, 'Installed public names differ from the known package catalog.');
      const legacy = document.migrations.flatMap((migration) => migration.legacy).find((entry) => entry.kind === 'package' && entry.identity === name);
      const revisions = legacy ? legacy.acceptedPrior.filter((prior) => prior.version === item.version && prior.digests[agent]?.value === payload.payloadDigest.value).map((prior) => prior.revision) : [...knownRevisions];
      if (!revisions.length) {
        const error = new Error('Retained package version and bytes have no accepted immutable baseline.');
        error.code = 'QS_MANAGED_PACKAGE_DRIFT'; throw error;
      }
      if (legacyRootCore) {
        // Bounded ancestor history discovers installations made before selection records
        // existed. Exact manifest, declared skills and private bytes still have to match.
        const history = await git(['log','-n','32','--format=%H','HEAD','--','.claude-plugin/plugin.json'],repositoryRoot);
        revisions.push(...history.stdout.trim().split(/\s+/).filter((value) => /^[a-f0-9]{40}$/.test(value)));
      }
      const relative = legacyRootCore ? '.' : agent === 'codex' ? collection.codexPackageRoot : agent === 'claude-code' ? collection.claudePackageRoot : collection.piPackageRoot;
      if (!legacy && !legacyRootCore) {
        const history = await git(['log', '-n', '32', '--format=%H', 'HEAD', '--', path.posix.join(relative, agent === 'codex' ? '.codex-plugin/plugin.json' : agent === 'claude-code' ? '.claude-plugin/plugin.json' : 'package.json')], repositoryRoot);
        revisions.push(...history.stdout.trim().split(/\s+/).filter(value => /^[a-f0-9]{40}$/.test(value)));
      }
      let priorRevision;
      try { priorRevision = await gitIdentity(payload, relative, unique(revisions), repositoryRoot, git); }
      catch (error) { error.code = 'QS_MANAGED_PACKAGE_DRIFT'; error.package = { agent, name, path: canonicalPath }; throw error; }
      // Pi ownership follows its exact maintained local source registration; Codex
      // additionally supplies and verifies the actual marketplace owner above.
      const observed = ownedObservation({ kind: 'package', identity: name, agent, path: canonicalPath, canonicalPath, linkTarget: null, version: item.version, revision: priorRevision, digest: payload.payloadDigest, publicSkills: observedNames, consumers: [], ...(legacyRootCore ? {layout:'claude-root-core'} : {}) }, { packageId: name, marketplace: 'quickstark' });
      observations.push(observed); verifiedOwnership.set(observed.ownership.recordId, { binding: proofBinding(observed), evidenceSnapshots: [configSnapshot, migrationFile.snapshot] });
      bindings.push({ id: `observed-${name}`, name, version: item.version, source: legacyRootCore ? expectedSource : item.source.path, ...(legacyRootCore ? {legacyRootCore:true} : {}), payloadSha256: nativePayloadSha256(agent,payload.snapshot), publicNames: observedNames, ownershipRecord: observed.ownership.recordId, ...(agent !== 'pi' ? { marketplace: 'quickstark', marketplaceRoot: agent === 'codex' ? path.join(repositoryRoot, 'codex') : repositoryRoot, installedOnly: Boolean(legacyRootCore) || item.version !== version || name === 'ps-skills' } : {}) });
    }
    for (const pkg of packages) {
      const artifact = pkg.artifacts[agent]; const existing = bindings.find((binding) => binding.name === pkg.id && binding.version === pkg.version);
      if (existing) {
        if (existing.legacyRootCore || existing.payloadSha256 !== artifact.nativePayloadSha256) {
          const error = new Error(existing.legacyRootCore ? 'Replacing a root-based Claude core requires a new release version; preserve its existing cache.' : 'Same-version installed package differs from current release; a new version is required.');
          error.code = 'QS_MANAGED_PACKAGE_DRIFT'; throw error;
        }
        existing.installedOnly = false; continue;
      }
      bindings.push({ id: `release-${pkg.id}`, name: pkg.id, version: pkg.version, source: artifact.source, payloadSha256: artifact.nativePayloadSha256, publicNames: pkg.publicSkills, ownershipRecord: `release:${revision}:${pkg.id}`, ...(agent !== 'pi' ? { marketplace: 'quickstark', marketplaceRoot: agent === 'codex' ? path.join(repositoryRoot, 'codex') : repositoryRoot } : {}) });
    }
    const observedNative = await observeNativePackages({ ...nativeOptions, packages: bindings });
    unrelatedNames[agent] = observedNative.evidence.unrelatedPublicNames ?? [];
    await revalidateMigrationPath(configSnapshot);
    native[agent] = { packages: bindings, command: nativeOptions.command }; configs[agent] = observedNative.evidence.configSnapshot;
  }
  if (customCodexHome || customOtherHome) {
    for (const legacy of document.migrations.flatMap((migration) => migration.legacy).filter((entry) => entry.kind === 'resource')) {
      const local = await captureMigrationPath(path.join(agents[0] === 'codex' ? codexHomeDirectory : agents[0] === 'claude-code' ? claudeHomeDirectory : piHomeDirectory, 'skills', legacy.identity));
      check(local.kind === 'absent', `Custom Codex profile contains legacy standalone resource ${legacy.identity}; preserve it and reconcile explicitly.`);
    }
  } else {
    const lockPath = path.join(homeDirectory, '.agents/.skill-lock.json'); const lock = await jsonFile(lockPath, { version: 3, skills: {} });
    check(lock.value.version === 3 && lock.value.skills && !Array.isArray(lock.value.skills), 'Contributor lock must use version3.');
    for (const legacy of document.migrations.flatMap((migration) => migration.legacy).filter((entry) => entry.kind === 'resource')) {
    const canonicalPath = path.join(homeDirectory, '.agents/skills', legacy.identity); const canonical = await captureMigrationPath(canonicalPath);
    const aliases = {};
    for (const [agent, root] of Object.entries(roots)) {
      const aliasPath = agent === 'codex' ? path.join(codexHomeDirectory, 'skills', legacy.identity) : path.join(agent === 'claude-code' ? claudeHomeDirectory : piHomeDirectory, 'skills', legacy.identity);
      const alias = await captureMigrationPath(aliasPath);
      if (alias.kind !== 'absent') { check(alias.kind === 'symlink' && path.resolve(path.dirname(alias.path), alias.target) === canonicalPath, `Changed or duplicate ${agent} standalone resource ${legacy.identity}; preserve and reconcile.`); aliases[agent] = alias; }
    }
    if (canonical.kind === 'absent') { check(!Object.keys(aliases).length && !lock.value.skills[legacy.identity], `Contributor ${legacy.identity} has stale lock/link state.`); continue; }
    const authority = document.sourceManifestSnapshot.resources.find((entry) => entry.name === legacy.identity);
    check(lockEntryMatches(lock.value.skills[legacy.identity], { type: 'agent-skill', source: authority.source }), `Contributor lock does not prove ${legacy.identity} ownership.`);
    const payload = await captureManagedSkillPayload(canonicalPath);
    check(legacy.acceptedPrior.some((prior) => prior.revision === authority.source.revision && prior.digest.value === payload.payloadDigest.value), `Contributor ${legacy.identity} has modified or unknown content; retain it.`);
    const consumers = unique([...agents, ...Object.keys(aliases), ...Object.keys(configs)]);
    for (const [other, config] of [['codex', path.join(codexHomeDirectory, 'config.toml')], ['pi', path.join(piHomeDirectory, 'settings.json')], ['claude-code', path.join(claudeHomeDirectory, 'settings.json')]]) if (!consumers.includes(other) && (await captureMigrationPath(config)).kind !== 'absent') consumers.push(other);
    for (const agent of agents) {
      const alias = aliases[agent]; const observed = ownedObservation({ kind: 'resource', identity: legacy.identity, agent, path: alias?.path ?? canonicalPath, canonicalPath, linkTarget: alias ? canonicalPath : null, version: null, revision: authority.source.revision, digest: payload.payloadDigest, publicSkills: legacy.publicSkills, consumers });
      observations.push(observed); verifiedOwnership.set(observed.ownership.recordId, { binding: proofBinding(observed), evidenceSnapshots: [lock.snapshot, migrationFile.snapshot] });
    }
  }
  }
  for (const agent of agents) {
    const observed = observations.filter((entry) => entry.agent === agent);
    const { selection } = resolveTargetSelection({ agent, profiles: profileFile.value, packageNames: allCollections.map((entry) => entry.id), resourceNames: document.sourceManifestSnapshot.resources.map((entry) => entry.name), savedRecord: saved.record,
      legacy: { packages: observed.filter((entry) => entry.kind === 'package').map((entry) => entry.identity), resources: observed.filter((entry) => entry.kind === 'resource').map((entry) => entry.identity), conflicts: [] }, profile, withPackages });
    const replacements = document.migrations.flatMap((migration) => migration.legacy.filter((entry) => selection[entry.kind === 'package' ? 'packages' : 'resources'].includes(entry.identity)).flatMap((entry) => entry.replacements.map((replacement) => replacement.packageId)));
    const selectedNames = packages.filter((pkg) => selection.packages.includes(pkg.id) || replacements.includes(pkg.id)).flatMap((pkg) => pkg.publicSkills);
    check(!selectedNames.some((name) => unrelatedNames[agent].includes(name)), 'Selected future public identities conflict with an observed unrelated native package; preserve and reconcile before update.');
    for (const root of ['shared', agent]) for (const name of selectedNames) {
      const exactPath = root === 'shared' ? path.join(homeDirectory, '.agents/skills', name)
        : agent === 'codex' ? path.join(codexHomeDirectory, 'skills', name) : path.join(agent === 'claude-code' ? claudeHomeDirectory : piHomeDirectory, 'skills', name);
      const existing = await captureMigrationPath(exactPath);
      check(existing.kind === 'absent', `Selected public identity ${name} already has an independently managed standalone path; preserve and reconcile before update.`);
      evidenceSnapshots.push(existing);
    }
  }
  const acceptance = async ({ pkg, agent, payload }) => {
    return verifyManagedReleasePackage({ repositoryRoot, auditPath, pkg, agent, payload, revision, git });
  };
  return { revision, cwd: repositoryRoot, homeDirectory, codexHomeDirectory, claudeHomeDirectory, piHomeDirectory, selectionPath, agents, profile, withPackages, repairSelection, profiles: profileFile.value, document, packages, observations, native, evidenceSnapshots,
    runtime: { observeNativePackages: (options) => observeNativePackages({ ...options, runCommand: command }), verifyAcceptance: acceptance,
      verifyOwnership: async (observed) => { const proof = verifiedOwnership.get(observed.ownership.recordId); check(proof && same(proof.binding, proofBinding(observed)), 'Ownership observation changed after native/lock verification.'); for (const snapshot of proof.evidenceSnapshots) await revalidateMigrationPath(snapshot); return proof; },
      nativeOptions: Object.fromEntries(agents.map((agent) => [agent, { runCommand: command }])) } };
}
