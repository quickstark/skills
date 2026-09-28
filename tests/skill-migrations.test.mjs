import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { V3_CORE_SKILLS } from '../scripts/qs-skill-catalog.mjs';
import { planSkillMigrations, readSkillMigrations, validateSkillMigrations } from '../scripts/skill-migrations.mjs';

const document = readSkillMigrations();
const homeDirectory = '/home/migration-fixture';
const digest = (value) => ({ kind: 'portable-directory-sha256', value });
const legacy = document.migrations.flatMap((migration) => migration.legacy);
const byId = (identity) => legacy.find((entry) => entry.identity === identity);
const resourcesFor = (migrationId) => document.migrations.find((migration) => migration.id === migrationId).legacy.map((entry) => entry.identity);

// Synthetic package/evidence records exercise planning decisions only. They do
// not claim that the currently unregistered replacement packages have passed QA.
function packageFixtures() {
  const mappings = legacy.flatMap((entry) => entry.replacements);
  const ids = [...new Set(mappings.map((entry) => entry.packageId))];
  return ids.map((id) => {
    const replacements = mappings.filter((entry) => entry.packageId === id);
    const publicSkills = id === 'qs-skills' ? V3_CORE_SKILLS.map((entry) => entry.name) : [...new Set(replacements.map((entry) => entry.command))];
    const capabilityIds = id === 'qs-skills' ? publicSkills.map((name) => 'qs:' + name) : [...new Set(replacements.map((entry) => entry.capabilityId))];
    const pkg = { id, registered: true, version: '4.0.0', revision: 'a'.repeat(40), payloadDigest: digest('b'.repeat(64)), publicSkills, capabilityIds };
    pkg.evidence = { agent: 'codex', version: pkg.version, revision: pkg.revision, payloadDigest: { ...pkg.payloadDigest }, checksPassed: true, closurePassed: true, noticesPassed: true, reference: 'isolated-fixture-proof', verifiedCapabilities: [...capabilityIds] };
    return pkg;
  });
}
function observation(identity) {
  const entry = byId(identity); const prior = entry.acceptedPrior[0];
  const observed = { kind: entry.kind, identity, agent: 'codex', path: entry.kind === 'resource' ? `${homeDirectory}/.agents/skills/${identity}` : `${homeDirectory}/.codex/plugins/cache/quickstark/${identity}/3.8.0`, linkTarget: null, version: prior.version ?? null, revision: prior.revision, digest: digest(entry.kind === 'resource' ? prior.digest.value : prior.digests.codex.value), publicSkills: [...entry.publicSkills], dirty: false, consumers: ['codex', 'pi'] };
  observed.canonicalPath = observed.path;
  observed.ownership = { manager: 'quickstark', recordId: 'fixture-owned:' + identity, ...(entry.kind === 'package' ? { packageId: identity, marketplace: 'quickstark' } : {}), expected: Object.fromEntries(['path', 'canonicalPath', 'linkTarget', 'version', 'revision', 'digest'].map((key) => [key, structuredClone(observed[key])])) };
  return observed;
}
function input({ packages = [], resources = [] } = {}) {
  return { document: structuredClone(document), agent: 'codex', homeDirectory, selection: { packages, resources }, packages: packageFixtures(), observations: [...packages.filter((id) => byId(id)), ...resources].map(observation) };
}
const plan = (selection) => planSkillMigrations(input(selection));
const conflicts = (result) => result.migrations.flatMap((migration) => migration.conflicts.map((conflict) => conflict.reason));

test('five historical migration records account for all contributor and PS identities', () => {
  const manifest = JSON.parse(readFileSync(new URL('../config/personal-skills.manifest.json', import.meta.url), 'utf8'));
  assert.deepEqual(validateSkillMigrations(document, { manifest }), { valid: true, errors: [] });
  assert.equal(document.migrations.length, 5);
  assert.equal(legacy.filter((entry) => entry.kind === 'resource').length, 18);
  assert.equal(byId('ps-skills').publicSkills.length, 13);
  assert.equal(byId('ps-skills').replacements.find((entry) => entry.legacyPublicSkill === 'ps-help').packageId, 'qs-skills');
  assert.ok(document.migrations.every((migration) => migration.state === 'planned'));
});

test('corrupt pins, missing mappings and lost contributor coverage cannot validate', () => {
  for (const mutate of [
    (doc) => { doc.migrations[1].legacy[0].acceptedPrior[0].digest.value = 'c'.repeat(64); },
    (doc) => { doc.migrations[0].legacy[0].replacements.pop(); },
    (doc) => { doc.migrations[0].legacy[0].replacements.pop(); doc.migrations[0].legacy[0].publicSkills.pop(); },
    (doc) => { doc.migrations[1].legacy[0].ownedLocations.push({ surface: 'other', path: '/etc' }); },
    (doc) => { doc.migrations[0].legacy[0].replacements[1].legacyPublicSkill = 'ps-help'; },
    (doc) => { doc.migrations[1].legacy.pop(); },
    (doc) => { doc.migrations[0].retirement.requirements.pop(); },
    (doc) => { doc.migrations[0].rollback.scope = 'any-files'; },
    (doc) => { doc.sourceManifestSnapshot.resources[0].source.contentSha256 = 'd'.repeat(64); },
  ]) { const broken = structuredClone(document); mutate(broken); assert.equal(validateSkillMigrations(broken).valid, false); }
});

test('malformed migration fields produce diagnostics rather than runtime exceptions', () => {
  for (const change of [
    (doc) => { doc.migrations[0].legacy[0].publicSkills = {}; },
    (doc) => { doc.migrations[1].legacy[0].ownedLocations = {}; },
    (doc) => { doc.migrations[1].legacy[0].replacements = [null]; },
    (doc) => { doc.sourceManifestSnapshot.resources[0] = null; },
  ]) { const broken = structuredClone(document); change(broken); assert.equal(validateSkillMigrations(broken).valid, false); }
});

test('a fresh/default selection does not select optional migrations', () => {
  const result = plan({ packages: ['qs-skills'] });
  assert.equal(result.status, 'no-migration');
  assert.deepEqual(result.migrations, []);
  assert.equal(result.mutationAuthorized, false);
});

test('PS-only selection cannot gain eleven core workflows merely to replace Help', () => {
  const result = plan({ packages: ['ps-skills'] });
  assert.equal(result.status, 'selection-required');
  const addition = result.migrations[0].additions.find((entry) => entry.packageId === 'qs-skills');
  assert.equal(addition.publicSkills.length, 11);
  assert.equal(addition.capabilityIds.length, 11);
  assert.equal(addition.publicSkills.includes('qs-help'), false);
  assert.deepEqual(result.migrations[0].retained, [{ kind: 'package', identity: 'ps-skills' }]);
});

test('selected core plus PS can stage equivalent replacements without deleting old exposure', () => {
  const result = plan({ packages: ['qs-skills', 'ps-skills'] });
  assert.equal(result.status, 'ready-to-stage');
  assert.deepEqual(result.migrations[0].additions, []);
  assert.deepEqual(result.deletePaths, []);
  assert.equal(result.migrations[0].mutationAuthorized, false);
  assert.equal(result.migrations[0].retirement.operation, 'unregister-owned-package');
});

test('explicit additions or user-requested profiles authorize only their named expansion', () => {
  for (const authority of [{ explicitPackages: ['qs-skills'] }, { explicitProfile: { source: 'user-request', id: 'core', packages: ['qs-skills'] } }]) {
    const result = planSkillMigrations({ ...input({ packages: ['ps-skills'] }), ...authority });
    assert.equal(result.status, 'ready-to-stage');
    const core = result.migrations[0].targets.find((target) => target.packageId === 'qs-skills');
    assert.equal(core.additionalPublicSkills.length, 11);
    assert.equal(core.explicitExpansion, true);
  }
  for (const source of ['saved', 'fresh-default', undefined]) assert.throws(() => planSkillMigrations({ ...input({ packages: ['ps-skills'] }), explicitProfile: { source, id: 'core', packages: ['qs-skills'] } }), /user-requested explicit profile/);
  assert.throws(() => planSkillMigrations({ ...input(), explicitPackages: ['qs-unknown'] }), /unavailable package/);
});

test('partial frontend selection retains old resource and lists exact broader outcomes', () => {
  const result = plan({ resources: ['design-taste-frontend'] });
  assert.equal(result.status, 'selection-required');
  assert.deepEqual(result.migrations[0].additions[0].publicSkills, ['qs-design-image-mobile', 'qs-design-image-to-code', 'qs-design-image-web']);
  assert.equal(result.migrations[0].additions[0].capabilityIds.length, 6);
  assert.equal(result.migrations[0].retained[0].identity, 'design-taste-frontend');
});

test('all seven frontend capabilities map to four roots without extra exposure', () => {
  const result = plan({ resources: resourcesFor('frontend-to-qs-v1') });
  assert.equal(result.status, 'ready-to-stage');
  assert.equal(result.migrations[0].targets[0].requiredCapabilities.length, 7);
  assert.deepEqual(result.migrations[0].targets[0].additionalPublicSkills, []);
});

test('single audio selection cannot silently acquire eight video domains behind one root', () => {
  const result = plan({ resources: ['hyperframes-audio'] });
  assert.equal(result.status, 'selection-required');
  assert.deepEqual(result.migrations[0].additions[0].publicSkills, []);
  assert.equal(result.migrations[0].additions[0].capabilityIds.length, 8);
  const full = plan({ resources: resourcesFor('hyperframes-to-qs-video-v1') });
  assert.equal(full.status, 'ready-to-stage');
  assert.equal(full.migrations[0].targets[0].requiredCapabilities.length, 9);
});

test('Finder Help/Setup mapping does not imply consent to ten other core roots', () => {
  const result = plan({ resources: ['find-skills'] });
  assert.equal(result.status, 'selection-required');
  assert.equal(result.migrations[0].additions[0].publicSkills.length, 10);
  assert.equal(plan({ resources: ['find-skills'], packages: ['qs-skills'] }).status, 'ready-to-stage');
});

test('planned or unregistered package records are never treated as available', () => {
  const missing = input({ resources: ['unlazy'] }); missing.packages = [];
  assert.ok(conflicts(planSkillMigrations(missing)).includes('replacement-package-unavailable'));
  const unregistered = input({ resources: ['unlazy'] }); unregistered.packages.find((pkg) => pkg.id === 'qs-execution').registered = false;
  assert.equal(planSkillMigrations(unregistered).status, 'blocked');
});

test('stale or incomplete independent replacement evidence blocks staging', () => {
  for (const mutate of [
    (pkg) => { delete pkg.evidence; },
    (pkg) => { pkg.evidence = true; },
    (pkg) => { pkg.evidence.revision = 'e'.repeat(40); },
    (pkg) => { pkg.evidence.payloadDigest.value = 'f'.repeat(64); },
    (pkg) => { pkg.evidence.verifiedCapabilities = []; },
    (pkg) => { pkg.evidence.closurePassed = false; },
    (pkg) => { pkg.evidence.noticesPassed = false; },
    (pkg) => { pkg.evidence.agent = 'pi'; },
  ]) { const args = input({ resources: ['unlazy'] }); mutate(args.packages.find((pkg) => pkg.id === 'qs-execution')); assert.ok(conflicts(planSkillMigrations(args)).includes('replacement-evidence-unverified')); }
});

test('unknown, changed and dirty legacy ownership cannot produce a stageable plan', () => {
  for (const [mutate, reason] of [
    [(observed) => { delete observed.ownership; }, 'unproven-ownership'],
    [(observed) => { observed.dirty = true; }, 'dirty-or-uninspected'],
    [(observed) => { observed.digest.value = 'c'.repeat(64); }, 'changed-digest'],
    [(observed) => { observed.linkTarget = homeDirectory + '/foreign'; }, 'changed-linkTarget'],
    [(observed) => { observed.path = homeDirectory + '/moved'; }, 'changed-path'],
    [(observed) => { observed.revision = 'e'.repeat(40); }, 'changed-revision'],
    [(observed) => { observed.publicSkills = []; }, 'changed-public-identities'],
    [(observed) => { observed.consumers = []; }, 'unproven-shared-consumers'],
  ]) { const args = input({ resources: ['unlazy'] }); mutate(args.observations[0]); assert.ok(conflicts(planSkillMigrations(args)).includes(reason), reason); }
});

test('a self-consistent but unaccepted package version or digest is rejected', () => {
  const args = input({ packages: ['ps-skills', 'qs-skills'] });
  args.observations[0].version = args.observations[0].ownership.expected.version = '3.7.0';
  assert.ok(conflicts(planSkillMigrations(args)).includes('unaccepted-prior-version-or-digest'));
});

test('self-consistent broad-root and foreign-resource paths do not establish ownership', () => {
  for (const location of ['/', homeDirectory, homeDirectory + '/foreign']) {
    const args = input({ resources: ['unlazy'] });
    for (const field of ['path', 'canonicalPath']) args.observations[0][field] = args.observations[0].ownership.expected[field] = location;
    assert.equal(planSkillMigrations(args).status, 'blocked');
  }
});

test('shared consumers and rollback prerequisites survive a pure repeatable preview', () => {
  const args = input({ resources: ['unlazy'] }); const before = JSON.stringify(args);
  const first = planSkillMigrations(args); const second = planSkillMigrations(args);
  assert.deepEqual(first, second); assert.equal(JSON.stringify(args), before);
  assert.deepEqual(first.migrations[0].observedBindings[0].consumers, ['codex', 'pi']);
  assert.ok(first.migrations[0].retirement.requirements.includes('all-shared-consumers-migrated-or-old-resource-retained'));
  assert.equal(first.migrations[0].rollback.executionAuthority, 'separate-from-planning');
  assert.deepEqual(first.deletePaths, []);
});

test('exact canonical and supported host aliases retain complete ownership checks', () => {
  const directories = { codex: '.codex/skills', 'claude-code': '.claude/skills', pi: '.pi/agent/skills' };
  for (const [agent, directory] of Object.entries(directories)) for (const alias of [false, true]) {
    const args = input({ resources: ['unlazy'] }); args.agent = agent;
    args.packages.forEach(pkg => { pkg.evidence.agent = agent; });
    const observed = args.observations[0]; observed.agent = agent; observed.consumers = [agent];
    if (alias) { observed.path = `${homeDirectory}/${directory}/unlazy`; observed.linkTarget = observed.canonicalPath; }
    observed.ownership.expected = structuredClone(Object.fromEntries(['path', 'canonicalPath', 'linkTarget', 'version', 'revision', 'digest'].map(field => [field, observed[field]])));
    assert.equal(planSkillMigrations(args).status, 'ready-to-stage', `${agent}: ${alias ? 'alias' : 'canonical'}`);
    for (const mutate of [
      entry => { entry.path = entry.ownership.expected.path = `${homeDirectory}/foreign/unlazy`; },
      entry => { entry.path = entry.ownership.expected.path = `${homeDirectory}/${directory}/other`; },
      entry => { entry.linkTarget = entry.ownership.expected.linkTarget = `${homeDirectory}/foreign`; },
      entry => { entry.path += '-changed'; },
      entry => { entry.digest.value = 'f'.repeat(64); },
    ]) { const bad = structuredClone(args); mutate(bad.observations[0]); assert.equal(planSkillMigrations(bad).status, 'blocked'); }
    const otherHost = Object.values(directories).find(value => value !== directory);
    const crossHost = structuredClone(args); crossHost.observations[0].path = crossHost.observations[0].ownership.expected.path = `${homeDirectory}/${otherHost}/unlazy`;
    crossHost.observations[0].linkTarget = crossHost.observations[0].ownership.expected.linkTarget = observed.canonicalPath;
    assert.ok(conflicts(planSkillMigrations(crossHost)).includes('outside-managed-location'));
  }
});

test('declared Codex and Pi alias locations must use exact surface, identity and target', () => {
  for (const [surface, directory] of [['codex-link', '.codex/skills'], ['pi-link', '.pi/agent/skills']]) {
    const doc = structuredClone(document), entry = doc.migrations.flatMap(m => m.legacy).find(e => e.identity === 'unlazy');
    const location = { surface, path: `~/${directory}/unlazy`, linkTarget: '~/.agents/skills/unlazy' }; entry.ownedLocations.push(location);
    assert.equal(validateSkillMigrations(doc).valid, true);
    for (const change of [{ path: `~/${directory}/unlazy/../other` }, { linkTarget: '~/.agents/skills/foreign' }, { surface: 'arbitrary-link' }]) {
      const bad = structuredClone(doc); Object.assign(bad.migrations.flatMap(m => m.legacy).find(e => e.identity === 'unlazy').ownedLocations.at(-1), change);
      assert.equal(validateSkillMigrations(bad).valid, false);
    }
  }
});
