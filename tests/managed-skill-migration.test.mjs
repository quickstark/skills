import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, writeFile, appendFile, cp, rm, readdir, symlink, readlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { captureManagedSkillPayload, previewManagedSkillMigration, assembleManagedSkillMigration, executeManagedSkillMigration, restoreManagedSkillMigration } from '../scripts/managed-skill-migration.mjs';
import { captureMigrationPath } from '../scripts/migration-filesystem.mjs';
import { createOwnedPathAdapter } from '../scripts/migration-owned-paths.mjs';
import { readSkillMigrations } from '../scripts/skill-migrations.mjs';
import { desiredLockFields } from '../scripts/personal-skills/lock.mjs';
import { V3_CORE_SKILLS, V3_SPECIALIST_SKILLS } from '../scripts/qs-skill-catalog.mjs';

const sha = (value) => createHash('sha256').update(value).digest('hex');
const stable = (value) => JSON.stringify(value, function (key, entry) { return entry && typeof entry === 'object' && !Array.isArray(entry) ? Object.fromEntries(Object.keys(entry).sort().map((name) => [name, entry[name]])) : entry; });
const hash = (value) => sha(stable(value));
const fileJSON = async (file) => JSON.parse(await readFile(file));
const unique = (values) => [...new Set(values)];
const revision = 'a'.repeat(40);
const allLegacy = readSkillMigrations().migrations.flatMap((entry) => entry.legacy);
const allResources = allLegacy.filter((entry) => entry.kind === 'resource').map((entry) => entry.identity);
async function writeJSON(file, value) { await mkdir(path.dirname(file), { recursive: true }); await writeFile(file, JSON.stringify(value)); return { path: file, sha256: sha(JSON.stringify(value)) }; }
async function packageFiles(root, name, version, skills) {
  await mkdir(path.join(root, '.codex-plugin'), { recursive: true }); await writeJSON(path.join(root, '.codex-plugin/plugin.json'), { name, version, skills: './skills/' });
  for (const skill of skills) { await mkdir(path.join(root, 'skills', skill), { recursive: true }); await writeFile(path.join(root, 'skills', skill, 'SKILL.md'), `---\nname: ${skill}\ndescription: Isolated migration fixture.\n---\nFixture only.\n`); }
  await writeFile(path.join(root, 'LICENSE'), 'Synthetic test notice.');
}

// This fixture's receipts and migration pins are synthetic test authorities.
// They exercise actual filesystem orchestration, not production skill acceptance.
async function fixture(t, { installed = ['qs-skills', 'qs-specialists', 'ps-skills'], resources = allResources } = {}) {
  const base = await mkdtemp(path.join(tmpdir(), 'qs-control-plane-')); t.after(() => rm(base, { recursive: true, force: true }));
  const homeDirectory = path.join(base, 'home'), cwd = path.join(base, 'release'); await mkdir(cwd); await mkdir(path.join(homeDirectory, '.codex'), { recursive: true });
  const document = readSkillMigrations(); const legacy = document.migrations.flatMap((entry) => entry.legacy); const mappings = legacy.flatMap((entry) => entry.replacements);
  const packageIds = unique([...mappings.map((entry) => entry.packageId), 'qs-specialists']); const packages = []; const bindings = []; const observations = []; const records = []; const lock = { version: 3, skills: { 'unrelated-keep': { custom: 'preserved' } }, custom: true };
  const support = await writeJSON(path.join(base, 'evidence/support.json'), { fixtureOnly: true, note: 'Synthetic integration evidence; not release acceptance.' });
  const addObservation = (kind, identity, location, version, oldRevision, digest, publicSkills) => {
    const entry = { kind, identity, agent: 'codex', path: location, canonicalPath: location, linkTarget: null, version, revision: oldRevision, digest, publicSkills, dirty: false, consumers: ['codex'] };
    entry.ownership = { manager: 'quickstark', recordId: `${kind}:${identity}`, packageId: identity, marketplace: 'quickstark', expected: Object.fromEntries(['path', 'canonicalPath', 'linkTarget', 'version', 'revision', 'digest'].map((field) => [field, entry[field]])) };
    records.push({ recordId: entry.ownership.recordId, binding: Object.fromEntries(['kind', 'identity', 'agent', 'path', 'canonicalPath', 'linkTarget', 'version', 'revision', 'digest', 'publicSkills', 'consumers'].map((field) => [field, entry[field]])) }); observations.push(entry);
  };
  for (const id of packageIds) {
    const replacements = mappings.filter((entry) => entry.packageId === id);
    const publicSkills = id === 'qs-skills' ? V3_CORE_SKILLS.map((entry) => entry.name) : id === 'qs-specialists' ? V3_SPECIALIST_SKILLS.map((entry) => entry.name) : unique(replacements.map((entry) => entry.command));
    const capabilityIds = ['qs-skills', 'qs-specialists'].includes(id) ? publicSkills.map((name) => `qs:${name}`) : unique(replacements.map((entry) => entry.capabilityId));
    const source = path.join(cwd, 'codex/plugins', id); await packageFiles(source, id, '4.0.0', publicSkills); const payload = await captureManagedSkillPayload(source);
    const acceptance = await writeJSON(path.join(base, 'evidence', `${id}.json`), { schemaVersion: 1, agent: 'codex', packageId: id, version: '4.0.0', revision, payloadDigest: payload.payloadDigest, contentSha256: payload.snapshot.contentSha256, verifiedCapabilities: capabilityIds, checks: Object.fromEntries(['package-closure', 'notices', 'behavior', 'native-discovery'].map((name) => [name, 'passed'])), references: [support] });
    packages.push({ id, registered: true, version: '4.0.0', revision, publicSkills, capabilityIds, artifacts: { codex: { source, payloadDigest: payload.payloadDigest, contentSha256: payload.snapshot.contentSha256, acceptance } } });
    bindings.push({ id: `new-${id}`, name: id, source, version: '4.0.0', payloadSha256: payload.snapshot.contentSha256, publicNames: publicSkills, ownershipRecord: `package:${id}`, marketplace: 'quickstark', marketplaceRoot: path.join(cwd, 'codex') });
  }
  const installedBindings = [];
  for (const id of installed) {
    const skills = id === 'ps-skills' ? legacy.find((entry) => entry.identity === id).publicSkills : packages.find((entry) => entry.id === id).publicSkills;
    const cache = path.join(homeDirectory, '.codex/plugins/cache/quickstark', id, '3.8.0'); await packageFiles(cache, id, '3.8.0', skills); const payload = await captureManagedSkillPayload(cache);
    const source = path.join(cwd, 'codex/plugins', id); const binding = { id: `old-${id}`, name: id, source, version: '3.8.0', payloadSha256: payload.snapshot.contentSha256, publicNames: skills, ownershipRecord: `package:${id}`, marketplace: 'quickstark', marketplaceRoot: path.join(cwd, 'codex'), installedOnly: true };
    bindings.push(binding); installedBindings.push(binding.id);
    const oldRevision = id === 'ps-skills' ? legacy.find((entry) => entry.identity === id).acceptedPrior[0].revision : 'b'.repeat(40);
    if (id === 'ps-skills') for (const claim of Object.values(legacy.find((entry) => entry.identity === id).acceptedPrior[0].digests)) claim.value = payload.payloadDigest.value;
    addObservation('package', id, cache, '3.8.0', oldRevision, payload.payloadDigest, skills);
  }
  for (const entry of legacy.filter((entry) => entry.kind === 'resource')) {
    const baseline = path.join(base, 'baselines', entry.identity); await mkdir(baseline, { recursive: true }); await writeFile(path.join(baseline, 'SKILL.md'), `---\nname: ${entry.publicSkills[0]}\ndescription: Fixture upstream.\n---\nFixture baseline.\n`);
    const payload = await captureManagedSkillPayload(baseline); const source = document.sourceManifestSnapshot.resources.find((resource) => resource.name === entry.identity).source;
    source.contentSha256 = payload.payloadDigest.value; for (const prior of entry.acceptedPrior) prior.digest.value = payload.payloadDigest.value;
    if (!resources.includes(entry.identity)) continue;
    const destination = path.join(homeDirectory, '.agents/skills', entry.identity); await mkdir(path.dirname(destination), { recursive: true }); await cp(baseline, destination, { recursive: true });
    addObservation('resource', entry.identity, destination, null, source.revision, payload.payloadDigest, entry.publicSkills);
    lock.skills[entry.identity] = desiredLockFields({ type: 'agent-skill', source });
  }
  document.sourceManifestSnapshot.sha256 = sha(JSON.stringify(document.sourceManifestSnapshot.resources));
  const ownershipFile = path.join(base, 'evidence/ownership.json'); const ownership = await writeJSON(ownershipFile, { schemaVersion: 1, records });
  for (const observation of observations) observation.ownership.proof = ownership;
  await writeJSON(path.join(homeDirectory, '.agents/.skill-lock.json'), lock);
  const nativeConfigPath = path.join(homeDirectory, '.codex/config.toml'); await writeJSON(nativeConfigPath, { installed: installedBindings, theme: 'unrelated-keep' });
  const controls = { failBeforeState: false, failAfterExposure: false, nativeEffects: [], phaseEffects: [], resourcesToWithdraw: resources };
  const observeNative = async (options) => {
    const config = await fileJSON(nativeConfigPath); const selected = {}; const active = []; const caches = []; const sources = [];
    for (const binding of options.packages) {
      const cache = path.join(homeDirectory, '.codex/plugins/cache/quickstark', binding.name, binding.version); const snapshot = await captureMigrationPath(cache); caches.push({ id: binding.id, path: cache, kind: snapshot.kind, ...(snapshot.contentSha256 ? { contentSha256: snapshot.contentSha256 } : {}) });
      if (binding.installedOnly) sources.push({ id: binding.id, name: binding.name, version: binding.version, publicNames: [...binding.publicNames].sort(), role: 'installed-cache', expectedPayloadSha256: binding.payloadSha256 });
      else { const source = await captureMigrationPath(binding.source); assert.equal(source.contentSha256, binding.payloadSha256); sources.push({ id: binding.id, name: binding.name, version: binding.version, publicNames: [...binding.publicNames].sort(), snapshot: { path: source.path, kind: source.kind, contentSha256: source.contentSha256 } }); }
      if (config.installed.includes(binding.id)) { assert.equal(snapshot.contentSha256, binding.payloadSha256); const manifest = await fileJSON(path.join(cache, '.codex-plugin/plugin.json')); assert.equal(manifest.version, binding.version); selected[`${binding.name}@quickstark`] = { enabled: true }; active.push({ id: binding.id, source: binding.source, version: manifest.version, publicNames: [...binding.publicNames].sort() }); }
    }
    const state = { host: 'codex', configPath: nativeConfigPath, config: { selected, unrelatedHash: hash(config.theme) }, native: { packages: active.sort((a, b) => a.id.localeCompare(b.id)) }, sources, caches, unrelatedHash: hash(config.theme) };
    return { state: { snapshotHash: hash(state), ...state }, evidence: { configSnapshot: await captureMigrationPath(nativeConfigPath) } };
  };
  const nativeFactory = (options) => ({
    async inspect() { return (await observeNative(options)).state; },
    async prepare(step, context) {
      const reference = path.join(options.backupRoot, context.transactionId, step.id); await mkdir(reference, { recursive: true });
      await cp(nativeConfigPath, path.join(reference, 'config')); for (const actual of step.before.native.packages) { const binding = bindings.find((entry) => entry.id === actual.id); const cache = path.join(homeDirectory, '.codex/plugins/cache/quickstark', binding.name, binding.version); await cp(cache, path.join(reference, actual.id), { recursive: true }); }
      return { reference, expectedState: { backupSha256: (await captureMigrationPath(reference)).contentSha256 } };
    },
    async inspectBackup(step, reference) { return { backupSha256: (await captureMigrationPath(reference)).contentSha256 }; },
    async apply(step) {
      assert.deepEqual((await observeNative(options)).state, step.before); const binding = bindings.find((entry) => entry.id === step.native.packageId); const cache = path.join(homeDirectory, '.codex/plugins/cache/quickstark', binding.name, binding.version);
      if (step.phase === 'expose') { for (const identity of controls.resourcesToWithdraw) assert.equal((await captureMigrationPath(path.join(homeDirectory, '.agents/skills', identity))).kind, 'absent', 'all old discoverable standalone resources withdrawn before any native exposure'); await mkdir(path.dirname(cache), { recursive: true }); await cp(binding.source, cache, { recursive: true }); }
      else await rm(cache, { recursive: true });
      const config = await fileJSON(nativeConfigPath); config.installed = step.after.native.packages.map((entry) => entry.id); await writeJSON(nativeConfigPath, config); controls.nativeEffects.push(step.id);
      if (step.phase === 'expose' && controls.failAfterExposure) throw new Error('fixture native failure after exposure');
    },
    async recover(step, reference) {
      assert.deepEqual((await observeNative(options)).state, step.after);
      const binding = bindings.find((entry) => entry.id === step.native.packageId); const cache = path.join(homeDirectory, '.codex/plugins/cache/quickstark', binding.name, binding.version);
      if (step.phase === 'expose') await rm(cache, { recursive: true }); else { await mkdir(path.dirname(cache), { recursive: true }); await cp(path.join(reference, binding.id), cache, { recursive: true }); }
      await cp(path.join(reference, 'config'), nativeConfigPath);
    },
  });
  const runtime = { verifySourceRevision: async ({ revision: actual }) => assert.equal(actual, revision), observeNativePackages: observeNative, createNativePackageAdapter: nativeFactory,
    createOwnedPathAdapter(options) { const adapter = createOwnedPathAdapter(options); return { ...adapter, async apply(step, context) { controls.phaseEffects.push(step.phase); if (step.phase === 'state' && controls.failBeforeState) throw new Error('fixture final state write failure'); return adapter.apply(step, context); } }; } };
  const profiles = { schemaVersion: 1, defaultProfile: 'core', profiles: { core: { packages: ['qs-skills'], resources: [] }, full: { packages: packageIds, resources: [] } } };
  const input = { revision, homeDirectory, cwd, agents: ['codex'], profiles, packages, observations, document, native: { codex: { packages: bindings } }, runtime };
  const transactionId = 'fixture-selected-migration'; const stagingRoot = path.join(homeDirectory, '.config/quickstark/transactions', transactionId);
  const assemblyOptions = { transactionId, stagingRoot, journalPath: path.join(stagingRoot, 'journal.jsonl'), backupRoot: path.join(homeDirectory, '.config/quickstark/backups'), runtime };
  return { input, controls, base, ownershipFile, records, assemblyOptions, nativeConfigPath };
}

test('complete verified legacy 3 packages plus 18 resources previews six equivalent packages without side effects', async (t) => {
  const args = await fixture(t); const before = await captureMigrationPath(args.input.homeDirectory);
  const preview = await previewManagedSkillMigration(args.input);
  assert.equal(preview.status, 'ready', JSON.stringify(preview.conflicts)); assert.equal(preview.targets.codex.basis, 'verified-legacy');
  assert.deepEqual(preview.targets.codex.desired.packages, ['qs-advanced', 'qs-execution', 'qs-frontend', 'qs-skills', 'qs-specialists', 'qs-video']); assert.deepEqual(preview.targets.codex.desired.resources, []);
  assert.equal((await captureMigrationPath(args.input.homeDirectory)).contentSha256, before.contentSha256); assert.equal(preview.mutationAuthorized, false);
});

test('full transaction stages, withdraws all old exposure, installs selected packages and persists lock/selection last', async (t) => {
  const args = await fixture(t); const preview = await previewManagedSkillMigration(args.input); assert.equal(preview.status, 'ready', JSON.stringify(preview.conflicts));
  const assembly = await assembleManagedSkillMigration(preview, args.assemblyOptions); const result = await executeManagedSkillMigration(assembly, { ownerId: 'fixture' });
  assert.equal(result.status, 'complete', result.error); assert.equal(args.controls.phaseEffects.at(-1), 'state');
  const saved = await fileJSON(preview.selectionPath); assert.deepEqual(saved.targets.codex.packages, preview.targets.codex.desired.packages);
  assert.deepEqual((await fileJSON(path.join(args.input.homeDirectory, '.agents/.skill-lock.json'))).skills, { 'unrelated-keep': { custom: 'preserved' } });
  assert.equal((await fileJSON(args.nativeConfigPath)).theme, 'unrelated-keep');
});

test('fresh default activates only core through a legitimate phase subset', async (t) => {
  const args = await fixture(t, { installed: [], resources: [] }); const preview = await previewManagedSkillMigration(args.input);
  assert.equal(preview.status, 'ready', JSON.stringify(preview.conflicts)); assert.equal(preview.targets.codex.basis, 'fresh-default'); assert.deepEqual(preview.targets.codex.desired.packages, ['qs-skills']);
  const assembly = await assembleManagedSkillMigration(preview, args.assemblyOptions); assert.deepEqual(assembly.plan.steps.map((step) => step.phase), ['stage', 'expose', 'state']);
  assert.equal((await executeManagedSkillMigration(assembly, { ownerId: 'fixture' })).status, 'complete'); assert.deepEqual((await fileJSON(args.nativeConfigPath)).installed, ['new-qs-skills']);
});

test('PS-only and partial frontend selections retain old identities and show exact additional outcomes', async (t) => {
  for (const selected of [{ installed: ['ps-skills'], resources: [] }, { installed: [], resources: ['design-taste-frontend'] }]) {
    const args = await fixture(t, selected); const preview = await previewManagedSkillMigration(args.input);
    assert.equal(preview.status, 'blocked'); assert.ok(preview.conflicts.some((entry) => entry.reason === 'explicit-package-expansion-required'));
    await assert.rejects(assembleManagedSkillMigration(preview, args.assemblyOptions), /blocked/);
    for (const identity of selected.resources) assert.equal((await captureMigrationPath(path.join(args.input.homeDirectory, '.agents/skills', identity))).kind, 'directory');
  }
});

test('explicit package additions authorize only their named broader replacement', async (t) => {
  const args = await fixture(t, { installed: ['ps-skills'], resources: [] }); args.input.withPackages = ['qs-skills'];
  const preview = await previewManagedSkillMigration(args.input); assert.equal(preview.status, 'ready', JSON.stringify(preview.conflicts));
  assert.deepEqual(preview.targets.codex.desired.packages, ['qs-advanced', 'qs-skills']);
});

test('missing mandatory acceptance and changed payload bytes block assembly', async (t) => {
  const args = await fixture(t, { installed: [], resources: [] }); const pkg = args.input.packages.find((entry) => entry.id === 'qs-skills');
  const receipt = await fileJSON(pkg.artifacts.codex.acceptance.path); receipt.checks.behavior = 'pending'; pkg.artifacts.codex.acceptance = await writeJSON(pkg.artifacts.codex.acceptance.path, receipt);
  let preview = await previewManagedSkillMigration(args.input); assert.equal(preview.status, 'blocked'); assert.ok(preview.conflicts.some((entry) => entry.reason.includes('behavior')));
  receipt.checks.behavior = 'passed'; pkg.artifacts.codex.acceptance = await writeJSON(pkg.artifacts.codex.acceptance.path, receipt); await appendFile(path.join(pkg.artifacts.codex.source, 'LICENSE'), 'changed');
  preview = await previewManagedSkillMigration(args.input); assert.equal(preview.status, 'blocked'); assert.ok(preview.conflicts.some((entry) => entry.reason.includes('content differs')));
});

test('changed legacy bytes and unselected shared consumers preserve old resources', async (t) => {
  const args = await fixture(t, { installed: ['qs-skills'], resources: ['unlazy'] }); const old = args.input.observations.find((entry) => entry.identity === 'unlazy');
  await appendFile(path.join(old.path, 'SKILL.md'), 'user edit'); let preview = await previewManagedSkillMigration(args.input); assert.equal(preview.status, 'blocked'); assert.ok(preview.conflicts.some((entry) => entry.reason.includes('asserted baseline')));
  const second = await fixture(t, { installed: ['qs-skills'], resources: ['unlazy'] }); const shared = second.input.observations.find((entry) => entry.identity === 'unlazy'); shared.consumers = ['codex', 'pi']; second.records.find((entry) => entry.recordId === shared.ownership.recordId).binding.consumers = shared.consumers;
  const proof = await writeJSON(second.ownershipFile, { schemaVersion: 1, records: second.records }); second.input.observations.forEach((entry) => { entry.ownership.proof = proof; });
  preview = await previewManagedSkillMigration(second.input); assert.equal(preview.status, 'blocked'); assert.ok(preview.conflicts.some((entry) => entry.reason === 'shared-consumer-still-requires-old-resource'));
});

test('journal restoration resumes interrupted exposure once and explicit rollback restores original resource bytes', async (t) => {
  const args = await fixture(t, { installed: ['qs-skills'], resources: ['unlazy'] }); const preview = await previewManagedSkillMigration(args.input); assert.equal(preview.status, 'ready', JSON.stringify(preview.conflicts));
  const beforeLock = await readFile(path.join(args.input.homeDirectory, '.agents/.skill-lock.json')); args.controls.failAfterExposure = true;
  const assembly = await assembleManagedSkillMigration(preview, args.assemblyOptions); const failed = await executeManagedSkillMigration(assembly, { ownerId: 'fixture' }); assert.equal(failed.status, 'failed');
  assert.equal((await captureMigrationPath(preview.selectionPath)).kind, 'absent'); args.controls.failAfterExposure = false;
  const restored = await restoreManagedSkillMigration({ journalPath: assembly.journalPath, runtime: args.input.runtime });
  const completed = await executeManagedSkillMigration(restored, { ownerId: 'fixture-resume' }); assert.equal(completed.status, 'complete', completed.error);
  assert.equal(args.controls.nativeEffects.filter((id) => id === failed.failedStep).length, 1);
  await assert.rejects(executeManagedSkillMigration(restored, { ownerId: 'fixture', mode: 'recover' }), /recovery authority/);
  const recovered = await executeManagedSkillMigration(restored, { ownerId: 'fixture', mode: 'recover', recoveryAuthority: { transactionId: assembly.plan.id, operation: 'restore-journaled-owned-effects', source: 'isolated-fixture' } }); assert.equal(recovered.status, 'rolled-back', recovered.error);
  assert.deepEqual(await readFile(path.join(args.input.homeDirectory, '.agents/.skill-lock.json')), beforeLock); assert.equal((await captureMigrationPath(preview.selectionPath)).kind, 'absent');
});

test('derived production seams bind original config/lock and raw evidence without requiring new per-machine receipt files', async (t) => {
  const args = await fixture(t, { installed: ['qs-skills'], resources: ['unlazy'] }); const receipts = new Map();
  for (const pkg of args.input.packages) { receipts.set(pkg.id, await fileJSON(pkg.artifacts.codex.acceptance.path)); await rm(pkg.artifacts.codex.acceptance.path); delete pkg.artifacts.codex.acceptance; }
  await rm(args.ownershipFile); args.input.observations.forEach((entry) => { delete entry.ownership.proof; });
  const supportPath = path.join(args.base, 'evidence/support.json'); await writeFile(supportPath, Buffer.alloc(2 * 1024 * 1024, 42)); const support = await captureMigrationPath(supportPath);
  args.input.runtime.verifyAcceptance = async ({ pkg, payload, revision: actualRevision }) => ({ receipt: { ...receipts.get(pkg.id), revision: actualRevision, contentSha256: payload.snapshot.contentSha256, references: [] }, evidenceSnapshots: [support] });
  args.input.runtime.verifyOwnership = async (observed) => ({ binding: args.records.find((entry) => entry.recordId === observed.ownership.recordId).binding, evidenceSnapshots: [await captureMigrationPath(observed.kind === 'resource' ? path.join(args.input.homeDirectory, '.agents/.skill-lock.json') : args.nativeConfigPath)] });
  const before = await captureMigrationPath(args.input.homeDirectory); const preview = await previewManagedSkillMigration(args.input);
  assert.equal(preview.status, 'ready', JSON.stringify(preview.conflicts)); assert.equal((await captureMigrationPath(args.input.homeDirectory)).contentSha256, before.contentSha256);
  assert.ok(preview.snapshots.some((snapshot) => snapshot.path === supportPath && snapshot.bytes > 1024 * 1024));
  await appendFile(supportPath, 'new evidence edit'); await assert.rejects(assembleManagedSkillMigration(preview, args.assemblyOptions), /changed after planning/);
});

test('derived boolean-only acceptance and missing original ownership evidence cannot authorize activation', async (t) => {
  const args = await fixture(t, { installed: ['qs-skills'], resources: [] });
  args.input.runtime.verifyAcceptance = async () => ({ verified: true });
  let preview = await previewManagedSkillMigration(args.input); assert.equal(preview.status, 'blocked'); assert.ok(preview.conflicts.some((entry) => entry.reason.includes('original evidence-file snapshots')));
  delete args.input.runtime.verifyAcceptance;
  args.input.runtime.verifyOwnership = async (observed) => ({ binding: args.records.find((entry) => entry.recordId === observed.ownership.recordId).binding, evidenceSnapshots: [await captureMigrationPath(args.ownershipFile)] });
  preview = await previewManagedSkillMigration(args.input); assert.equal(preview.status, 'blocked'); assert.ok(preview.conflicts.some((entry) => entry.reason.includes('existing manager config')));
});

test('derived acceptance binds source trees and detects added or removed files while still requiring an evidence file', async (t) => {
  const args = await fixture(t, { installed: ['qs-skills'], resources: [] });
  const sourceTree = path.join(args.base, 'criterion-source'); await mkdir(sourceTree); await writeFile(path.join(sourceTree, 'original.txt'), 'criterion source');
  let includeEvidenceFile = true;
  args.input.runtime.verifyAcceptance = async ({ pkg }) => ({ receipt: await fileJSON(pkg.artifacts.codex.acceptance.path), evidenceSnapshots: [await captureMigrationPath(sourceTree), ...(includeEvidenceFile ? [await captureMigrationPath(pkg.artifacts.codex.acceptance.path)] : [])] });
  let preview = await previewManagedSkillMigration(args.input); assert.equal(preview.status, 'ready', JSON.stringify(preview.conflicts));
  assert.ok(preview.snapshots.some((snapshot) => snapshot.path === sourceTree && snapshot.kind === 'directory'));
  await writeFile(path.join(sourceTree, 'added.txt'), 'new source');
  await assert.rejects(assembleManagedSkillMigration(preview, args.assemblyOptions), /changed after planning/);
  preview = await previewManagedSkillMigration(args.input); assert.equal(preview.status, 'ready', JSON.stringify(preview.conflicts));
  await rm(path.join(sourceTree, 'original.txt'));
  await assert.rejects(assembleManagedSkillMigration(preview, args.assemblyOptions), /changed after planning/);
  includeEvidenceFile = false; preview = await previewManagedSkillMigration(args.input);
  assert.equal(preview.status, 'blocked'); assert.ok(preview.conflicts.some((entry) => entry.reason.includes('original evidence-file snapshots')));
});

test('saved selection updates only selected core and preserves unselected owned packages/resources', async (t) => {
  const args = await fixture(t); args.controls.resourcesToWithdraw = [];
  const selectionPath = path.join(args.input.homeDirectory, '.config/quickstark/skills-selection.json');
  await writeJSON(selectionPath, { schemaVersion: 1, targets: { codex: { packages: ['qs-skills'], resources: [], profile: 'core', additions: [] } }, templateRevision: 'old', lastSuccessfulTransaction: 'prior' });
  const resourcesBefore = await captureMigrationPath(path.join(args.input.homeDirectory, '.agents/skills'));
  const preview = await previewManagedSkillMigration(args.input); assert.equal(preview.status, 'ready', JSON.stringify(preview.conflicts)); assert.equal(preview.targets.codex.basis, 'saved'); assert.deepEqual(preview.targets.codex.desired.packages, ['qs-skills']);
  const assembly = await assembleManagedSkillMigration(preview, args.assemblyOptions); const result = await executeManagedSkillMigration(assembly, { ownerId: 'fixture' }); assert.equal(result.status, 'complete', result.error);
  assert.deepEqual((await fileJSON(args.nativeConfigPath)).installed.sort(), ['new-qs-skills', 'old-ps-skills', 'old-qs-specialists']);
  assert.equal((await captureMigrationPath(path.join(args.input.homeDirectory, '.agents/skills'))).contentSha256, resourcesBefore.contentSha256);
});

test('selection edits after preview and local edits after failure block overwrite/recovery', async (t) => {
  const args = await fixture(t, { installed: ['qs-skills'], resources: ['unlazy'] }); const preview = await previewManagedSkillMigration(args.input); const assembly = await assembleManagedSkillMigration(preview, args.assemblyOptions);
  await writeJSON(preview.selectionPath, { schemaVersion: 1, targets: {}, templateRevision: 'user', lastSuccessfulTransaction: null });
  await assert.rejects(executeManagedSkillMigration(assembly, { ownerId: 'fixture' }), /changed after planning/);
  assert.deepEqual((await fileJSON(args.nativeConfigPath)).installed, ['old-qs-skills']);
  const second = await fixture(t, { installed: ['qs-skills'], resources: ['unlazy'] }); const secondPreview = await previewManagedSkillMigration(second.input); const secondAssembly = await assembleManagedSkillMigration(secondPreview, second.assemblyOptions); second.controls.failAfterExposure = true;
  assert.equal((await executeManagedSkillMigration(secondAssembly, { ownerId: 'fixture' })).status, 'failed');
  const config = await fileJSON(second.nativeConfigPath); config.theme = 'user-edit'; await writeJSON(second.nativeConfigPath, config);
  const result = await executeManagedSkillMigration(secondAssembly, { ownerId: 'fixture', mode: 'recover', recoveryAuthority: { transactionId: secondAssembly.plan.id, operation: 'restore-journaled-owned-effects', source: 'isolated-fixture' } });
  assert.equal(result.status, 'recovery-failed'); assert.equal((await fileJSON(second.nativeConfigPath)).theme, 'user-edit');
});

test('an old archive cannot substitute for current native bytes and catalog omissions cannot hide extra public exposure', async (t) => {
  const args = await fixture(t, { installed: ['qs-skills'], resources: [] }); const observed = args.input.observations[0];
  const archive = path.join(args.base, 'retained-release'); await cp(observed.path, archive, { recursive: true }); observed.path = archive; observed.canonicalPath = archive; observed.ownership.expected.path = archive; observed.ownership.expected.canonicalPath = archive;
  const record = args.records.find((entry) => entry.recordId === observed.ownership.recordId); record.binding.path = archive; record.binding.canonicalPath = archive;
  observed.ownership.proof = await writeJSON(args.ownershipFile, { schemaVersion: 1, records: args.records });
  let preview = await previewManagedSkillMigration(args.input); assert.equal(preview.status, 'blocked'); assert.ok(preview.conflicts.some((entry) => entry.reason.includes('retained archives are separate')));
  const second = await fixture(t, { installed: [], resources: [] }); const reduced = second.input.packages.find((entry) => entry.id === 'qs-skills'); reduced.publicSkills = reduced.publicSkills.slice(0, -1);
  preview = await previewManagedSkillMigration(second.input); assert.equal(preview.status, 'blocked'); assert.ok(preview.conflicts.some((entry) => entry.reason.includes('public-identity bindings')));
});

test('an explicit addition with unresolved acceptance returns a blocked preview retaining prior selection', async (t) => {
  const args = await fixture(t, { installed: ['ps-skills'], resources: [] }); args.input.withPackages = ['qs-skills'];
  const pkg = args.input.packages.find((entry) => entry.id === 'qs-skills'); const receipt = await fileJSON(pkg.artifacts.codex.acceptance.path); receipt.checks['native-discovery'] = 'pending'; pkg.artifacts.codex.acceptance = await writeJSON(pkg.artifacts.codex.acceptance.path, receipt);
  const before = await readFile(args.nativeConfigPath); const preview = await previewManagedSkillMigration(args.input); assert.equal(preview.status, 'blocked'); assert.ok(preview.conflicts.some((entry) => entry.reason.includes('native-discovery')));
  assert.deepEqual(await readFile(args.nativeConfigPath), before); await assert.rejects(assembleManagedSkillMigration(preview, args.assemblyOptions), /blocked/);
});

test('failed final state write retains prior selection and journal retry completes without repeating native effects', async (t) => {
  const args = await fixture(t, { installed: ['qs-skills'], resources: ['unlazy'] });
  const selectionPath = path.join(args.input.homeDirectory, '.config/quickstark/skills-selection.json');
  const previous = { schemaVersion: 1, targets: { codex: { packages: ['qs-skills'], resources: ['unlazy'], profile: null, additions: [] } }, templateRevision: 'old', lastSuccessfulTransaction: 'prior' }; await writeJSON(selectionPath, previous);
  const preview = await previewManagedSkillMigration(args.input); const assembly = await assembleManagedSkillMigration(preview, args.assemblyOptions); args.controls.failBeforeState = true;
  const result = await executeManagedSkillMigration(assembly, { ownerId: 'fixture' }); assert.equal(result.status, 'failed'); assert.equal(result.failedStep, 'save-selection'); assert.deepEqual(await fileJSON(selectionPath), previous);
  const nativeCount = args.controls.nativeEffects.length; args.controls.failBeforeState = false;
  const resumed = await restoreManagedSkillMigration({ journalPath: assembly.journalPath, runtime: args.input.runtime }); assert.equal((await executeManagedSkillMigration(resumed, { ownerId: 'fixture' })).status, 'complete'); assert.equal(args.controls.nativeEffects.length, nativeCount);
});

test('a hidden owned cache cannot be inferred as a live native registration', async (t) => {
  const args = await fixture(t, { installed: ['qs-skills'], resources: [] }); const observe = args.input.runtime.observeNativePackages;
  args.input.runtime.observeNativePackages = async (options) => { const result = await observe(options); result.state.native.packages = []; const { snapshotHash, ...state } = result.state; result.state.snapshotHash = hash(state); return result; };
  const preview = await previewManagedSkillMigration(args.input); assert.equal(preview.status, 'blocked'); assert.ok(preview.conflicts.some((entry) => entry.reason.includes('not observable in the native manager')));
});

async function twoHostResourceFixture(t, { codexAlias = true } = {}) {
  const args = await fixture(t, { installed: [], resources: ['find-skills', 'unlazy'] });
  const { homeDirectory, cwd } = args.input;
  args.input.agents = ['codex', 'pi']; args.input.withPackages = ['qs-skills'];
  const aliases = [], canonicalPaths = [], observations = [];
  args.records.length = 0;
  for (const original of args.input.observations) {
    canonicalPaths.push(original.canonicalPath);
    for (const agent of args.input.agents) {
      const observed = structuredClone(original); observed.agent = agent; observed.consumers = ['codex', 'pi'];
      if (agent === 'pi' || codexAlias) {
        observed.path = path.join(homeDirectory, agent === 'codex' ? '.codex/skills' : '.pi/agent/skills', observed.identity);
        observed.linkTarget = observed.canonicalPath; await mkdir(path.dirname(observed.path), { recursive: true });
        const target = path.relative(path.dirname(observed.path), observed.canonicalPath); await symlink(target, observed.path);
        aliases.push({ path: observed.path, target });
      }
      observed.ownership.recordId = `resource:${observed.identity}:${agent}`;
      observed.ownership.expected = structuredClone(Object.fromEntries(['path', 'canonicalPath', 'linkTarget', 'version', 'revision', 'digest'].map(field => [field, observed[field]])));
      args.records.push({ recordId: observed.ownership.recordId, binding: Object.fromEntries(['kind', 'identity', 'agent', 'path', 'canonicalPath', 'linkTarget', 'version', 'revision', 'digest', 'publicSkills', 'consumers'].map(field => [field, observed[field]])) }); observations.push(observed);
    }
  }
  const ownership = await writeJSON(args.ownershipFile, { schemaVersion: 1, records: args.records });
  observations.forEach(observed => { observed.ownership.proof = ownership; }); args.input.observations = observations;
  const piBindings = [];
  for (const pkg of args.input.packages) {
    const source = path.join(cwd, 'pi/packages', pkg.id); await mkdir(path.dirname(source), { recursive: true }); await cp(pkg.artifacts.codex.source, source, { recursive: true });
    await writeJSON(path.join(source, 'package.json'), { name: pkg.id, version: pkg.version, pi: { skills: ['./skills'] } });
    const payload = await captureManagedSkillPayload(source), priorReceipt = await fileJSON(pkg.artifacts.codex.acceptance.path);
    const acceptance = await writeJSON(path.join(args.base, 'evidence', `pi-${pkg.id}.json`), { ...priorReceipt, agent: 'pi', payloadDigest: payload.payloadDigest, contentSha256: payload.snapshot.contentSha256 });
    pkg.artifacts.pi = { source, payloadDigest: payload.payloadDigest, contentSha256: payload.snapshot.contentSha256, acceptance };
    piBindings.push({ id: `pi-new-${pkg.id}`, name: pkg.id, source, version: pkg.version, publicNames: pkg.publicSkills, payloadSha256: payload.snapshot.contentSha256, ownershipRecord: `pi-package:${pkg.id}` });
  }
  args.input.native.pi = { packages: piBindings };
  const piConfig = path.join(homeDirectory, '.pi/agent/settings.json'); await writeJSON(piConfig, { packages: [], theme: 'keep-pi-settings' });
  const unrelated = [];
  for (const root of ['.agents/skills', '.codex/skills', '.pi/agent/skills']) {
    const file = path.join(homeDirectory, root, 'foreign-skill/SKILL.md'); await mkdir(path.dirname(file), { recursive: true }); await writeFile(file, 'Unrelated user skill; preserve exactly.'); unrelated.push(file);
  }
  const oldObserve = args.input.runtime.observeNativePackages, oldFactory = args.input.runtime.createNativePackageAdapter;
  const observePi = async options => {
    const config = await fileJSON(piConfig), sources = [], active = [];
    for (const binding of options.packages) {
      const snapshot = await captureMigrationPath(binding.source);
      assert.equal(snapshot.contentSha256, binding.payloadSha256);
      sources.push({ id: binding.id, name: binding.name, version: binding.version, publicNames: [...binding.publicNames].sort(), snapshot: { path: snapshot.path, kind: snapshot.kind, contentSha256: snapshot.contentSha256 } });
      if (config.packages.includes(binding.source)) active.push({ id: binding.id, source: binding.source, version: binding.version, publicNames: [...binding.publicNames].sort() });
    }
    const state = { host: 'pi', configPath: piConfig, config: { selected: active.map(pkg => pkg.source).sort(), unrelatedHash: hash(config.theme) }, native: { packages: active.sort((a, b) => a.id.localeCompare(b.id)) }, sources, caches: [], unrelatedHash: hash(config.theme) };
    return { state: { snapshotHash: hash(state), ...state }, evidence: { configSnapshot: await captureMigrationPath(piConfig) } };
  };
  const withdrawnPaths = [...aliases.map(alias => alias.path), ...canonicalPaths];
  const exposureChecks = [];
  args.input.runtime.observeNativePackages = options => options.host === 'pi' ? observePi(options) : oldObserve(options);
  args.input.runtime.createNativePackageAdapter = options => {
    const adapter = options.host === 'codex' ? oldFactory(options) : {
      async inspect() { return (await observePi(options)).state; },
      async prepare(step, context) { const reference = path.join(options.backupRoot, context.transactionId, step.id); await mkdir(reference, { recursive: true }); await cp(piConfig, path.join(reference, 'config')); return { reference, expectedState: { backupSha256: (await captureMigrationPath(reference)).contentSha256 } }; },
      async inspectBackup(step, reference) { return { backupSha256: (await captureMigrationPath(reference)).contentSha256 }; },
      async apply(step) { assert.deepEqual((await observePi(options)).state, step.before); const config = await fileJSON(piConfig); config.packages = step.after.native.packages.map(pkg => pkg.source); await writeJSON(piConfig, config); args.controls.nativeEffects.push(step.id); if (args.controls.failAfterExposure) throw new Error('fixture Pi failure after exposure'); },
      async recover(step, reference) { assert.deepEqual((await observePi(options)).state, step.after); await cp(path.join(reference, 'config'), piConfig); },
    };
    return { ...adapter, async apply(step, context) {
      if (step.phase === 'expose') {
        for (const location of withdrawnPaths) assert.equal((await captureMigrationPath(location)).kind, 'absent', `old discoverable path remains before ${step.id}: ${location}`);
        exposureChecks.push(step.id);
      }
      return adapter.apply(step, context);
    } };
  };
  return { ...args, aliases, canonicalPaths, withdrawnPaths, unrelated, exposureChecks, piConfig };
}

test('two-host shared resource observations remove every alias and canonical path once before exposure', async t => {
  for (const codexAlias of [true, false]) {
    const args = await twoHostResourceFixture(t, { codexAlias });
    if (!codexAlias) args.input.agents.reverse(); // Canonical-only Codex must not overwrite the earlier Pi alias.
    const preview = await previewManagedSkillMigration(args.input);
    assert.equal(preview.status, 'ready', JSON.stringify(preview.conflicts)); assert.equal(preview.resources.length, 4);
    assert.deepEqual(preview.resources.map(r => `${r.agent}:${r.identity}`).sort(), ['codex:find-skills', 'codex:unlazy', 'pi:find-skills', 'pi:unlazy']);
    const unsafeStage = path.join(args.input.homeDirectory, '.codex/skills/migration-staging');
    await assert.rejects(assembleManagedSkillMigration(preview, { ...args.assemblyOptions, stagingRoot: unsafeStage, journalPath: path.join(unsafeStage, 'journal.jsonl') }), /discovery/i);
    assert.equal((await captureMigrationPath(unsafeStage)).kind, 'absent');
    const assembly = await assembleManagedSkillMigration(preview, args.assemblyOptions);
    const withdrawals = assembly.plan.steps.filter(step => step.id.startsWith('withdraw-resource-'));
    assert.equal(withdrawals.length, args.withdrawnPaths.length); assert.equal(new Set(withdrawals.map(step => step.pathAction.beforeSnapshot.path)).size, withdrawals.length);
    assert.deepEqual(withdrawals.slice(0, args.aliases.length).map(step => step.before.kind), args.aliases.map(() => 'symlink'));
    assert.ok(assembly.plan.discoveryRoots.includes(path.join(args.input.homeDirectory, '.codex/skills')));
    assert.equal(assembly.plan.steps.filter(step => step.id === 'retire-resource-lock').length, 1);
    const result = await executeManagedSkillMigration(assembly, { ownerId: 'two-host-fixture' }); assert.equal(result.status, 'complete', result.error);
    assert.equal(args.exposureChecks.length, 4); // Core and execution package on each host.
    for (const location of args.withdrawnPaths) assert.equal((await captureMigrationPath(location)).kind, 'absent');
    for (const file of args.unrelated) assert.equal(await readFile(file, 'utf8'), 'Unrelated user skill; preserve exactly.');
    assert.deepEqual((await fileJSON(preview.lock.path)).skills, { 'unrelated-keep': { custom: 'preserved' } });
    const selection = await fileJSON(preview.selectionPath);
    for (const agent of ['codex', 'pi']) { assert.deepEqual(selection.targets[agent].resources, []); assert.deepEqual(selection.targets[agent].packages, ['qs-execution', 'qs-skills']); }
    for (const active of [(await fileJSON(args.nativeConfigPath)).installed, (await fileJSON(args.piConfig)).packages]) assert.equal(new Set(active).size, active.length);
  }
});

test('two-host alias interruption resumes once and recovery restores original relative links and unrelated state', async t => {
  const args = await twoHostResourceFixture(t);
  const originals = new Map(await Promise.all([...args.canonicalPaths, ...args.unrelated, args.nativeConfigPath, args.piConfig, path.join(args.input.homeDirectory, '.agents/.skill-lock.json')].map(async location => [location, await captureMigrationPath(location)])));
  const preview = await previewManagedSkillMigration(args.input), assembly = await assembleManagedSkillMigration(preview, args.assemblyOptions);
  args.controls.failAfterExposure = true;
  const failure = await executeManagedSkillMigration(assembly, { ownerId: 'two-host-fixture' }); assert.equal(failure.status, 'failed');
  for (const location of args.withdrawnPaths) assert.equal((await captureMigrationPath(location)).kind, 'absent');
  args.controls.failAfterExposure = false;
  const resumed = await restoreManagedSkillMigration({ journalPath: assembly.journalPath, runtime: args.input.runtime });
  assert.equal((await executeManagedSkillMigration(resumed, { ownerId: 'two-host-resume' })).status, 'complete');
  assert.equal(args.controls.nativeEffects.filter(id => id === failure.failedStep).length, 1);
  const restored = await executeManagedSkillMigration(resumed, { ownerId: 'two-host-rollback', mode: 'recover', recoveryAuthority: { transactionId: assembly.plan.id, operation: 'restore-journaled-owned-effects', source: 'isolated-fixture' } });
  assert.equal(restored.status, 'rolled-back', restored.error);
  for (const alias of args.aliases) { assert.equal(await readlink(alias.path), alias.target); assert.equal((await readFile(path.join(alias.path, 'SKILL.md'), 'utf8')).includes('Fixture baseline.'), true); }
  for (const [location, original] of originals) assert.equal((await captureMigrationPath(location)).contentSha256, original.contentSha256, location);
  assert.equal((await captureMigrationPath(preview.selectionPath)).kind, 'absent');
});

test('changed host alias after preview blocks retirement and leaves unrelated files intact', async t => {
  const args = await twoHostResourceFixture(t), preview = await previewManagedSkillMigration(args.input);
  const alias = args.aliases.find(item => item.path.includes('/.pi/'));
  await rm(alias.path); await symlink(path.dirname(alias.path), alias.path);
  await assert.rejects(assembleManagedSkillMigration(preview, args.assemblyOptions), /changed after planning/);
  assert.equal(await readlink(alias.path), path.dirname(alias.path));
  for (const location of args.canonicalPaths) assert.equal((await captureMigrationPath(location)).kind, 'directory');
  for (const file of args.unrelated) assert.equal(await readFile(file, 'utf8'), 'Unrelated user skill; preserve exactly.');
});

async function addFullAcceptanceObligations(args) {
  for (const pkg of args.input.packages) {
    pkg.selectionCapabilityIds = [...pkg.capabilityIds];
    pkg.capabilityIds = unique([...pkg.capabilityIds, ...pkg.publicSkills.map(name => `qs:${name}`), `private:${pkg.id}-implementation`]);
    for (const artifact of Object.values(pkg.artifacts)) {
      const receipt = await fileJSON(artifact.acceptance.path); receipt.verifiedCapabilities = [...pkg.capabilityIds];
      artifact.acceptance = await writeJSON(artifact.acceptance.path, receipt);
    }
  }
}

test('full acceptance obligations do not become extra selection outcomes for Unlazy or all historical resources', async t => {
  const args = await fixture(t, { installed: [], resources: ['unlazy'] }); await addFullAcceptanceObligations(args);
  const pkg = args.input.packages.find(pkg => pkg.id === 'qs-execution'), selectionIds = pkg.selectionCapabilityIds;
  delete pkg.selectionCapabilityIds;
  assert.equal((await previewManagedSkillMigration(args.input)).status, 'blocked', 'Full helper/root proof IDs alone reproduce the unintended selection expansion.');
  pkg.selectionCapabilityIds = selectionIds;
  const preview = await previewManagedSkillMigration(args.input);
  assert.equal(preview.status, 'ready', JSON.stringify(preview.conflicts));
  assert.deepEqual(preview.targets.codex.desired.packages, ['qs-execution']);
  assert.deepEqual(preview.packages.codex[0].capabilityIds, ['contributor:unlazy']);
  assert.deepEqual(preview.packages.codex[0].fullCapabilityIds, pkg.capabilityIds);
  assert.ok(preview.packages.codex[0].evidence.verifiedCapabilities.includes('private:qs-execution-implementation'));
  const full = await fixture(t); await addFullAcceptanceObligations(full);
  const complete = await previewManagedSkillMigration(full.input);
  assert.equal(complete.status, 'ready', JSON.stringify(complete.conflicts));
  assert.deepEqual(complete.targets.codex.desired.packages, ['qs-advanced', 'qs-execution', 'qs-frontend', 'qs-skills', 'qs-specialists', 'qs-video']);
});

test('invalid selection subsets and missing full or required replacement acceptance remain blocked', async t => {
  const args = await fixture(t, { installed: [], resources: ['unlazy'] }); await addFullAcceptanceObligations(args);
  const pkg = args.input.packages.find(pkg => pkg.id === 'qs-execution');
  for (const subset of [[], null, true, ['contributor:unlazy', 'contributor:unlazy'], ['unknown:outcome']]) {
    pkg.selectionCapabilityIds = subset;
    const preview = await previewManagedSkillMigration(args.input);
    assert.equal(preview.status, 'blocked'); assert.ok(preview.conflicts.some(conflict => conflict.reason.includes('nonempty unique subset')));
  }
  pkg.selectionCapabilityIds = ['private:qs-execution-implementation'];
  let preview = await previewManagedSkillMigration(args.input);
  assert.equal(preview.status, 'blocked'); assert.ok(preview.conflicts.some(conflict => conflict.reason === 'replacement-capability-missing'));
  pkg.selectionCapabilityIds = ['contributor:unlazy'];
  const receipt = await fileJSON(pkg.artifacts.codex.acceptance.path);
  receipt.verifiedCapabilities = receipt.verifiedCapabilities.filter(id => !id.startsWith('private:'));
  pkg.artifacts.codex.acceptance = await writeJSON(pkg.artifacts.codex.acceptance.path, receipt);
  preview = await previewManagedSkillMigration(args.input);
  assert.equal(preview.status, 'blocked'); assert.ok(preview.conflicts.some(conflict => conflict.reason.includes('omits package capability evidence')));
  assert.deepEqual(args.controls.nativeEffects, []);
});

test('selection outcomes still require explicit approval for a genuinely broader partial frontend migration', async t => {
  const args = await fixture(t, { installed: [], resources: ['design-taste-frontend'] }); await addFullAcceptanceObligations(args);
  const preview = await previewManagedSkillMigration(args.input);
  assert.equal(preview.status, 'blocked');
  const expansion = preview.conflicts.find(conflict => conflict.reason === 'explicit-package-expansion-required');
  assert.equal(expansion.publicSkills.length, 3); assert.equal(expansion.capabilityIds.length, 6);
  assert.ok(expansion.capabilityIds.every(id => !id.startsWith('private:')));
  await assert.rejects(assembleManagedSkillMigration(preview, args.assemblyOptions), /blocked/);
  assert.deepEqual(args.controls.nativeEffects, []);
});

async function withFuturePathEvidence(t) {
  const args = await fixture(t, { installed: ['qs-skills'], resources: ['unlazy'] });
  const name = args.input.packages.find(pkg => pkg.id === 'qs-execution').publicSkills[0];
  const future = path.join(args.input.homeDirectory, '.codex/skills', name);
  args.input.evidenceSnapshots = [await captureMigrationPath(future), await captureMigrationPath(args.nativeConfigPath)];
  return { ...args, future };
}

test('additional evidence rejects asserted receipts, unsafe paths and unsupported snapshot kinds without effects', async t => {
  const args = await withFuturePathEvidence(t);
  for (const snapshot of [true, { kind: 'absent', path: args.input.homeDirectory }, { kind: 'absent', path: path.join(args.base, 'outside-home') }, { kind: 'absent', path: path.join(args.input.homeDirectory, '.codex/skills/not-a-catalog-command') }, { kind: 'directory', path: args.future }, { kind: 'symlink', path: args.future }]) {
    args.input.evidenceSnapshots = [snapshot]; const preview = await previewManagedSkillMigration(args.input);
    assert.equal(preview.status, 'blocked'); assert.ok(preview.conflicts.some(conflict => conflict.reason.includes('Additional input evidence')));
  }
  args.input.evidenceSnapshots = { checksPassed: true };
  await assert.rejects(previewManagedSkillMigration(args.input), /original path snapshots/);
  assert.deepEqual(args.controls.nativeEffects, []); assert.deepEqual(args.controls.phaseEffects, []);
});

test('new standalone collision blocks preview, assembly or first execution at the actual revalidation boundary', async t => {
  for (const boundary of ['preview', 'assembly', 'execution']) {
    const args = await withFuturePathEvidence(t), config = await readFile(args.nativeConfigPath);
    let preview, assembly;
    if (boundary !== 'preview') {
      preview = await previewManagedSkillMigration(args.input); assert.equal(preview.status, 'ready', JSON.stringify(preview.conflicts));
      assert.ok(preview.snapshots.some(snapshot => snapshot.path === args.future && snapshot.kind === 'absent'));
      assert.equal(preview.snapshots.filter(snapshot => snapshot.path === args.nativeConfigPath).length, 1);
      if (boundary === 'execution') assembly = await assembleManagedSkillMigration(preview, args.assemblyOptions);
    }
    await mkdir(args.future, { recursive: true }); await writeFile(path.join(args.future, 'SKILL.md'), 'User-created collision; retain it.');
    if (boundary === 'preview') { preview = await previewManagedSkillMigration(args.input); assert.equal(preview.status, 'blocked'); assert.ok(preview.conflicts.some(conflict => conflict.reason.includes('changed after planning'))); }
    else if (boundary === 'assembly') await assert.rejects(assembleManagedSkillMigration(preview, args.assemblyOptions), /changed after planning/);
    else await assert.rejects(executeManagedSkillMigration(assembly, { ownerId: 'evidence-control' }), /changed after planning/);
    assert.deepEqual(args.controls.nativeEffects, []); assert.deepEqual(args.controls.phaseEffects, []);
    assert.deepEqual(await readFile(args.nativeConfigPath), config); assert.equal(await readFile(path.join(args.future, 'SKILL.md'), 'utf8'), 'User-created collision; retain it.');
  }
});

test('changed regular config evidence blocks assembly and new collision blocks journal retry before further effects', async t => {
  const changed = await withFuturePathEvidence(t), preview = await previewManagedSkillMigration(changed.input);
  await appendFile(changed.nativeConfigPath, '\n ');
  await assert.rejects(assembleManagedSkillMigration(preview, changed.assemblyOptions), /changed after planning/);
  assert.deepEqual(changed.controls.nativeEffects, []);
  const args = await withFuturePathEvidence(t), ready = await previewManagedSkillMigration(args.input), assembly = await assembleManagedSkillMigration(ready, args.assemblyOptions);
  args.controls.failAfterExposure = true;
  const first = await executeManagedSkillMigration(assembly, { ownerId: 'evidence-control' }); assert.equal(first.status, 'failed');
  const effects = [...args.controls.nativeEffects], config = await readFile(args.nativeConfigPath);
  await mkdir(path.dirname(args.future), { recursive: true }); await writeFile(args.future, 'Unrelated path appeared after interruption.');
  args.controls.failAfterExposure = false;
  const resumed = await restoreManagedSkillMigration({ journalPath: assembly.journalPath, runtime: args.input.runtime });
  await assert.rejects(executeManagedSkillMigration(resumed, { ownerId: 'evidence-retry' }), /changed after planning/);
  assert.deepEqual(args.controls.nativeEffects, effects); assert.deepEqual(await readFile(args.nativeConfigPath), config);
  assert.equal(await readFile(args.future, 'utf8'), 'Unrelated path appeared after interruption.');
});

test('shared, Codex and Pi future-name absence remains bound in a two-host preview', async t => {
  const args = await twoHostResourceFixture(t), name = args.input.packages.find(pkg => pkg.id === 'qs-execution').publicSkills[0];
  const paths = ['.agents/skills', '.codex/skills', '.pi/agent/skills'].map(root => path.join(args.input.homeDirectory, root, name));
  args.input.evidenceSnapshots = await Promise.all(paths.map(location => captureMigrationPath(location)));
  const preview = await previewManagedSkillMigration(args.input); assert.equal(preview.status, 'ready', JSON.stringify(preview.conflicts));
  for (const location of paths) assert.ok(preview.snapshots.some(snapshot => snapshot.path === location && snapshot.kind === 'absent'));
  await writeFile(paths[2], 'Pi discovery changed after preview.');
  await assert.rejects(assembleManagedSkillMigration(preview, args.assemblyOptions), /changed after planning/);
  assert.deepEqual(args.controls.nativeEffects, []); assert.deepEqual(args.controls.phaseEffects, []);
  for (const alias of args.aliases) assert.equal(await readlink(alias.path), alias.target);
});
