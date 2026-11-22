import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { chmod, cp, mkdir, mkdtemp, readdir, readFile, realpath, rename, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { stageDistributionLayout } from '../tooling/generation/stage-distribution-layout.mjs';
import { verifyTransitionPayloads } from '../tooling/generation/skill-transition-packages.mjs';
import { repositoryRoot } from '../tooling/repository-root.mjs';
import { captureMigrationPath } from '../tooling/install/migration-filesystem.mjs';
import { adoptionSourceContentSha256 } from '../tooling/verification/adoption-acceptance.mjs';
import { distributionPaths, recognizeDistributionSource } from '../tooling/install/distribution-layout.mjs';
import { TARGET_SKILL_COLLECTIONS } from '../tooling/catalog/skill-collection-registry.mjs';

const official = 'https://github.com/quickstark/skills.git';
const collection = TARGET_SKILL_COLLECTIONS.find(pkg => pkg.id === 'qs-execution');
const hosts = ['claude-code', 'codex', 'pi'];
const git = (root, ...args) => execFileSync('git', ['-c', 'advice.detachedHead=false', '-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', '-c', 'commit.gpgsign=false', ...args], { cwd: root, encoding: 'utf8' }).trim();

async function fixture(t, layout) {
  const base = await mkdtemp(path.join(await realpath(tmpdir()), 'qs-distribution-test-'));
  t.after(() => rm(base, { recursive: true, force: true }));
  const root = path.join(base, 'checkout');
  await mkdir(root);
  git(root, 'init', '-q');
  git(root, 'remote', 'add', 'origin', official);
  await writeFile(path.join(root, 'package.json'), JSON.stringify({version: '4.4.7'}));
  const source = host => path.join(root, distributionPaths(host, collection.id)[layout]);
  for (const host of hosts) {
    const dir = source(host);
    const skill = path.join(dir, 'skills/qs-unlazy');
    await mkdir(skill, { recursive: true });
    await writeFile(path.join(skill, 'SKILL.md'), '---\nname: qs-unlazy\ndescription: Fixture.\n---\n');
    const manifest = host === 'codex' ? '.codex-plugin/plugin.json' : host === 'claude-code' ? '.claude-plugin/plugin.json' : 'package.json';
    await mkdir(path.dirname(path.join(dir, manifest)), {recursive: true});
    const discovery = host === 'pi' ? {pi: {skills: ['./skills']}} : {skills: host === 'codex' ? './skills/' : ['./skills/qs-unlazy']};
    await writeFile(path.join(dir, manifest), JSON.stringify({name: collection.id, version: '4.4.7', ...discovery}));
  }
  git(root, 'add', '.'); git(root, 'commit', '-qm', 'Fixture release');
  const revision = git(root, 'rev-parse', 'HEAD');
  const inspect = (host, overrides = {}) => recognizeDistributionSource({ repositoryRoot: root, revision, host, packageId: collection.id, source: source(host), ...overrides });
  return { base, root, revision, source, inspect };
}

test('six active package identities map to distinct original and dist paths on all hosts', () => {
  const paths = new Set();
  for (const pkg of TARGET_SKILL_COLLECTIONS) for (const host of hosts) {
    const pair = distributionPaths(host, pkg.id);
    assert.equal(pair.original, path.posix.join({codex:'codex/plugins', 'claude-code':'packages', pi:'pi/packages'}[host], pkg.id));
    assert.equal(pair.dist, 'dist/' + (host === 'claude-code' ? 'claude' : host) + '/' + pkg.id);
    paths.add(pair.original); paths.add(pair.dist);
  }
  assert.equal(paths.size, 36);
  for (const id of ['ps-skills', '../qs-execution', 'unregistered']) assert.throws(() => distributionPaths('pi', id));
  assert.throws(() => distributionPaths('unknown', collection.id));
});

for (const layout of ['original', 'dist']) {
  test(layout + ' sources bind the physical path, host, package, origin, pinned commit and payload', async t => {
    const f = await fixture(t, layout);
    for (const host of hosts) {
      const proof = await f.inspect(host);
      assert.equal(proof.layout, layout);
      assert.equal(proof.revision, f.revision);
      assert.equal(proof.source, f.source(host));
      assert.match(proof.contentSha256, /^[a-f0-9]{64}$/);
      await assert.rejects(f.inspect(host, {source: f.source(host === 'codex' ? 'pi' : 'codex')}));
      await assert.rejects(f.inspect(host, {packageId:'qs-video'}));
    }
    const source = f.source('pi');
    await assert.rejects(f.inspect('pi', {source: source + '/../' + collection.id}));
    await assert.rejects(f.inspect('pi', {revision: 'f'.repeat(40)}));
    await assert.rejects(f.inspect('pi', {repositoryRoot: path.dirname(source)}));
    const other = path.join(f.root, distributionPaths('pi', collection.id)[layout === 'dist' ? 'original' : 'dist']);
    await cp(source, other, {recursive:true});
    await assert.rejects(f.inspect('pi'), /ambiguous/i);
    await rm(other, {recursive:true});
    const alias = path.join(f.base, 'alias');
    await symlink(f.root, alias);
    await assert.rejects(f.inspect('pi', {repositoryRoot:alias, source:source.replace(f.root, alias)}));
    const saved = path.join(f.base, collection.id);
    await rename(source, saved); await symlink(saved, source);
    await assert.rejects(f.inspect('pi'));
    await rm(source); await rename(saved, source);
    const foreign = path.join(f.base, 'foreign');
    await cp(f.root, foreign, {recursive:true});
    git(foreign, 'remote', 'set-url', 'origin', 'https://github.com/other/skills.git');
    await assert.rejects(f.inspect('pi', {repositoryRoot:foreign, source:source.replace(f.root, foreign)}), /origin/i);
    const file = path.join(source, 'skills/qs-unlazy/SKILL.md');
    const original = await readFile(file);
    await writeFile(file, 'staged edit');
    git(f.root, 'add', file);
    await writeFile(file, original);
    await assert.rejects(f.inspect('pi'));
    git(f.root, 'restore', '--staged', file);
    await chmod(file, 0o755);
    await assert.rejects(f.inspect('pi'));
    await chmod(file, 0o644);
    git(f.root, 'update-index', '--assume-unchanged', file);
    await writeFile(file, '---\nname: qs-unlazy\ndescription: Changed.\n---\n');
    await assert.rejects(f.inspect('pi'));
  });
}


test('removing a committed alternate layout cannot conceal ambiguous ownership', async t => {
  const f = await fixture(t, 'original');
  const alternate = path.join(f.root, distributionPaths('pi', collection.id).dist);
  await cp(f.source('pi'), alternate, {recursive:true});
  git(f.root, 'add', '-f', alternate);
  git(f.root, 'commit', '-qm', 'Both layouts');
  await rm(alternate, {recursive:true});
  await assert.rejects(f.inspect('pi', {revision:git(f.root, 'rev-parse', 'HEAD')}), /ambiguous/i);
});

test('a tracked package in the right folder must declare the requested native identity', async t => {
  const f = await fixture(t, 'dist');
  const file = path.join(f.source('pi'), 'package.json');
  const manifest = JSON.parse(await readFile(file));
  manifest.name = 'other-package';
  await writeFile(file, JSON.stringify(manifest));
  git(f.root, 'add', file);
  git(f.root, 'commit', '-qm', 'Mismatched manifest');
  await assert.rejects(f.inspect('pi', {revision:git(f.root, 'rev-parse', 'HEAD')}), /identity/i);
});

test('historical Claude core ownership covers only its declared root closure', async t => {
  const base = await mkdtemp(path.join(await realpath(tmpdir()), 'qs-claude-root-test-'));
  t.after(() => rm(base, {recursive:true, force:true}));
  const root = path.join(base, 'release');
  const revision = git(import.meta.dirname, 'rev-parse', 'v4.1.0^{commit}');
  git(base, 'clone', '--quiet', '--shared', '--no-checkout', '--branch', 'v4.1.0', path.dirname(import.meta.dirname), root);
  git(root, 'remote', 'set-url', 'origin', official);
  git(root, 'read-tree', 'HEAD');
  const paths = git(root, 'ls-tree', '-r', '--name-only', 'HEAD', '--', '.claude-plugin', 'skills/internal', 'skills/engineering', 'skills/productivity').split('\n');
  git(root, 'checkout-index', '--', ...paths);
  const input = {repositoryRoot: root, source: root, host:'claude-code', packageId:'qs-skills', revision};
  assert.equal((await recognizeDistributionSource(input)).layout, 'claude-root-core');
  await assert.rejects(recognizeDistributionSource({...input, host:'pi'}));
  await assert.rejects(recognizeDistributionSource({...input, packageId:'qs-specialists'}));
  const market = path.join(root, '.claude-plugin/marketplace.json');
  const bytes = await readFile(market);
  await writeFile(market, '{}');
  await assert.rejects(recognizeDistributionSource(input));
  await writeFile(market, bytes);
  await writeFile(path.join(root, 'skills/internal/tdd-loop.md'), 'changed');
  await assert.rejects(recognizeDistributionSource(input));
});

test('stage the published package trees under dist and retain all three pinned PS payloads', async t => {
  const base = await mkdtemp(path.join(await realpath(tmpdir()), 'qs-stage-test-'));
  t.after(() => rm(base, {recursive:true, force:true}));
  const root = path.join(base, 'release');
  git(base, 'clone', '--shared', '--quiet', '--branch', 'v4.4.7', repositoryRoot, root);
  git(root, 'remote', 'set-url', 'origin', official);
  const revision = git(root, 'rev-parse', 'HEAD');
  const output = await stageDistributionLayout(root, revision);
  t.after(() => rm(output, {recursive:true, force:true}));
  const expected = TARGET_SKILL_COLLECTIONS.map(pkg => pkg.id).sort();
  for (const host of hosts) {
    const {original, dist} = distributionPaths(host, 'qs-skills');
    assert.deepEqual((await readdir(path.join(output, path.dirname(dist)))).sort(), expected);
    assert.deepEqual(await readdir(path.join(output, path.dirname(original))), ['ps-skills']);
  }
  assert.equal((await verifyTransitionPayloads(repositoryRoot, output))[0].version, '3.8.0');
  assert.equal(git(root, 'status', '--porcelain'), '');
});


test('dist projection changes only package paths and marketplace discovery', async t => {
  const base = await mkdtemp(path.join(await realpath(tmpdir()), 'qs-dist-projection-'));
  t.after(() => rm(base, { recursive: true, force: true }));
  const candidate = path.join(base, 'candidate');
  const args = ['--candidate', '--layout', 'dist', '--output-root', candidate];
  const generate = (...flags) => execFileSync(process.execPath, [
    path.join(repositoryRoot, 'tooling/generation/sync-codex-plugin.mjs'), ...flags,
  ], { cwd: base, stdio: 'pipe' });
  const json = async file => JSON.parse(await readFile(path.join(candidate, file)));
  generate(...args);
  generate(...args, '--check');
  for (const host of hosts) {
    for (const pkg of TARGET_SKILL_COLLECTIONS) {
      const roots = distributionPaths(host, pkg.id);
      const before = await captureMigrationPath(path.join(repositoryRoot, roots.dist));
      const after = await captureMigrationPath(path.join(candidate, roots.dist));
      assert.equal(adoptionSourceContentSha256(after), adoptionSourceContentSha256(before), host + '/' + pkg.id);
    }
  }
  const claude = await json('.claude-plugin/marketplace.json');
  const codex = await json('.agents/plugins/marketplace.json');
  const active = TARGET_SKILL_COLLECTIONS.map(pkg => pkg.id);
  for (const market of [claude, codex]) {
    assert.deepEqual(market.plugins.map(plugin => plugin.name), [...active, 'ps-skills']);
  }
  for (const plugin of claude.plugins) {
    assert.equal(plugin.source, plugin.name === 'ps-skills' ? './packages/ps-skills' : './dist/claude/' + plugin.name);
  }
  for (const plugin of codex.plugins) {
    assert.deepEqual(plugin.source, { source: 'local', path: plugin.name === 'ps-skills' ? './codex/plugins/ps-skills' : './dist/codex/' + plugin.name });
  }
  const core = await json('.claude-plugin/plugin.json');
  assert.deepEqual(core.skills, TARGET_SKILL_COLLECTIONS.find(pkg => pkg.id === 'qs-skills').publicCommands
    .map(name => './dist/claude/qs-skills/skills/' + name));
  await verifyTransitionPayloads(repositoryRoot, candidate);
  await mkdir(path.join(candidate, 'dist/pi/foreign'));
  assert.throws(() => generate(...args, '--check'), /unexpected package/i);
  assert.throws(() => generate('--layout', 'dist'), /candidate/i);
});
