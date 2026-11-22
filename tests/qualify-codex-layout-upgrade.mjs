import assert from 'node:assert/strict';
import { execFile as execFileCallback } from 'node:child_process';
import { appendFile, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import { bootstrapManagedMarketplaces } from '../tooling/install/managed-marketplace-bootstrap.mjs';
import { resolveManagedSkillPaths } from '../tooling/install/managed-skill-paths.mjs';
import { executeManagedSkills } from '../tooling/install/managed-skills.mjs';
import { executeManagedSkillMigration, restoreManagedSkillMigration } from '../tooling/install/managed-skill-migration.mjs';
import { captureCodexForeignCaches, runNativePackageCommand } from '../tooling/install/migration-native-packages.mjs';
import { captureMigrationPath } from '../tooling/install/migration-filesystem.mjs';
import { readMigrationJournal } from '../tooling/install/migration-transaction.mjs';
import { updateInstalledHarnesses } from '../tooling/install/update-skills.mjs';

const execFile = promisify(execFileCallback);
const [candidateArg, priorArg, scenario] = process.argv.slice(2);
assert.ok(candidateArg && priorArg && ['fresh', 'upgrade', 'journal'].includes(scenario), 'Usage: node tests/qualify-codex-layout-upgrade.mjs <Codex candidate> <v4.4.7 checkout> <fresh|upgrade|journal>');
const [candidate, priorRelease] = await Promise.all([realpath(candidateArg), realpath(priorArg)]);
const work = await mkdtemp(path.join(await realpath(tmpdir()), 'qs-codex-qualification-'));
const git = async (cwd, ...args) => (await execFile('git', args, { cwd, encoding: 'utf8' })).stdout.trim();
const revision = await git(candidate, 'rev-parse', 'HEAD');
const priorRevision = await git(priorRelease, 'rev-parse', 'HEAD');
assert.equal(priorRevision, await git(priorRelease, 'rev-parse', 'v4.4.7^{commit}'));
assert.equal(await git(candidate, 'status', '--porcelain'), '');
assert.equal(await git(priorRelease, 'status', '--porcelain'), '');
const version = JSON.parse(await readFile(path.join(candidate, 'package.json'))).version;
const tag = 'v' + version;
const release = { tag, revision, version };
const homeDirectory = path.join(work, 'home');
const codexHomeDirectory = path.join(homeDirectory, scenario === 'fresh' ? '.codex' : 'codex-custom');
const native = { cwd: work, homeDirectory, codexHomeDirectory };
const homes = resolveManagedSkillPaths({ homeDirectory, codexHomeDirectory, agents: ['codex'], environment: {} });
const { selectionPath } = homes;
const config = path.join(codexHomeDirectory, 'config.toml');
const flags = ['--agent', 'codex', '--home', homeDirectory];
if (scenario !== 'fresh') flags.push('--codex-home', codexHomeDirectory);
const options = { repositoryRoot: candidate, homeDirectory, agents: ['codex'], codexHomeDirectory };
const command = (...args) => runNativePackageCommand('codex', args, native);
const inventory = async () => JSON.parse((await command('plugin', 'list', '--marketplace', 'quickstark', '--json')).stdout).installed;
const markets = async () => JSON.parse((await command('plugin', 'marketplace', 'list', '--json')).stdout).marketplaces;
const add = name => command('plugin', 'add', name, '--json');
const root = async () => (await markets()).find(m => m.name === 'quickstark').root;
const installed = async () => (await inventory()).map(p => p.name).sort();
const localEnvironment = {
  HOME: homeDirectory, USERPROFILE: homeDirectory, CODEX_HOME: codexHomeDirectory, PATH: process.env.PATH,
  XDG_CONFIG_HOME: path.join(homeDirectory, '.config'), LANG: 'C.UTF-8',
};

async function configurePublishedFixture() {
  const remote = path.join(work, 'release.git');
  await git(work, 'init', '--bare', '--quiet', remote);
  const objects = await git(candidate, 'rev-parse', '--path-format=absolute', '--git-path', 'objects');
  await writeFile(path.join(remote, 'objects/info/alternates'), objects + '\n');
  await git(remote, 'update-ref', 'refs/tags/' + tag, revision);
  await git(work, 'config', '--file', path.join(homeDirectory, '.gitconfig'), 'url.' + pathToFileURL(remote).href + '.insteadOf', 'https://github.com/quickstark/skills.git');
  Object.assign(process.env, localEnvironment);
  for (const name of Object.keys(process.env).filter(name => name.startsWith('GIT_') || name.startsWith('OPENAI_'))) delete process.env[name];
}

async function addUnrelatedMarketplace() {
  const market = path.join(work, 'unrelated');
  const manifest = path.join(market, 'fixture/.codex-plugin');
  await mkdir(path.join(market, '.agents/plugins'), { recursive: true });
  await mkdir(manifest, { recursive: true });
  await writeFile(path.join(manifest, 'plugin.json'), JSON.stringify({ name: 'fixture', version: '1.0.0' }));
  await writeFile(path.join(market, '.agents/plugins/marketplace.json'), JSON.stringify({
    name: 'community-fixture', plugins: [{ name: 'fixture', source: { source: 'local', path: './fixture' } }],
  }));
  await command('plugin', 'marketplace', 'add', market);
  await add('fixture@community-fixture');
  return async () => {
    const foreign = await captureCodexForeignCaches(codexHomeDirectory);
    return { markets: (await markets()).filter(m => m.name !== 'quickstark'), digest: foreign.hash };
  };
}

async function runUpdater(...extra) {
  try {
    const result = await execFile(process.execPath, [path.join(candidate, 'scripts/update-skills.mjs'),
      '--release', tag + '@' + revision, '--json', ...flags, ...extra],
      { cwd: work, env: localEnvironment, encoding: 'utf8', timeout: 180000 });
    return JSON.parse(result.stdout);
  } catch (error) {
    if (error.stdout) return JSON.parse(error.stdout);
    throw error;
  }
}

try {
  await mkdir(codexHomeDirectory, { recursive: true });
  await configurePublishedFixture();
  const unrelated = await addUnrelatedMarketplace();
  const initialUnrelated = await unrelated();

  if (scenario === 'fresh') {
    const result = await runUpdater();
    assert.equal(result.status, 'complete', JSON.stringify(result));
    assert.equal(await root(), candidate);
    assert.deepEqual(await installed(), ['qs-skills']);
    assert.equal((await inventory())[0].source.path, path.join(candidate, 'dist/codex/qs-skills'));
    assert.deepEqual(JSON.parse(await readFile(selectionPath)).targets.codex.packages, ['qs-skills']);
  }

  if (scenario === 'upgrade') {
    const prior = path.join(work, 'prior-release');
    await git(work, '-c', 'advice.detachedHead=false', 'clone', '--quiet', '--shared', '--branch', 'v4.4.7', priorRelease, prior);
    await git(prior, 'remote', 'set-url', 'origin', 'https://github.com/quickstark/skills.git');
    await command('plugin', 'marketplace', 'add', path.join(prior, 'codex'));
    for (const name of ['qs-skills', 'qs-specialists', 'ps-skills']) await add(name + '@quickstark');
    assert.equal(await root(), path.join(prior, 'codex'));
    const beforeConfig = await readFile(config);
    const beforeInventory = await inventory();
    const file = path.join(prior, 'codex/plugins/qs-skills/skills/qs-help/SKILL.md');
    const bytes = await readFile(file);
    try {
      await appendFile(file, '\nFixture edit.\n');
      const rejected = await updateInstalledHarnesses({ ...options, arguments_: flags });
      assert.match(rejected.results[0].error, /differs from every trusted prior release tree/);
      assert.deepEqual(await readFile(config), beforeConfig);
      assert.deepEqual(await inventory(), beforeInventory);
    } finally { await writeFile(file, bytes); }
    try {
      await git(prior, 'remote', 'set-url', 'origin', 'https://example.invalid/unrelated/skills.git');
      const rejected = await updateInstalledHarnesses({ ...options, arguments_: flags });
      assert.match(rejected.results[0].error, /origin is not the official/);
      assert.deepEqual(await readFile(config), beforeConfig);
      assert.deepEqual(await inventory(), beforeInventory);
    } finally { await git(prior, 'remote', 'set-url', 'origin', 'https://github.com/quickstark/skills.git'); }

    let withdrew = false;
    const runtime = { runCommand: async (bin, args, context) => {
      const result = await runNativePackageCommand(bin, args, context);
      if (!withdrew && args[0] === 'plugin' && args[1] === 'remove') {
        withdrew = true;
        throw new Error('Interrupted after native withdrawal.');
      }
      return result;
    } };
    const failed = await updateInstalledHarnesses({ ...options, arguments_: flags, release, runtime });
    assert.equal(failed.status, 'failed', JSON.stringify(failed));
    assert.ok(withdrew);
    assert.deepEqual(await readFile(path.join(failed.results[0].backupRoot, 'settings-original')), beforeConfig);
    const saved = JSON.parse(await readFile(selectionPath));
    assert.deepEqual([...saved.targets.codex.packages].sort(), ['qs-advanced', 'qs-skills', 'qs-specialists']);
    const result = await runUpdater();
    assert.equal(result.status, 'complete', JSON.stringify(result));
    assert.equal(await root(), candidate);
    assert.deepEqual(await installed(), ['qs-advanced', 'qs-skills', 'qs-specialists']);
    assert.ok((await inventory()).every(p => p.source.path === path.join(candidate, 'dist/codex', p.name)));
    assert.equal((await root()), candidate);
    assert.equal(await git(prior, 'status', '--porcelain'), '');
  }

  if (scenario === 'journal') {
    await bootstrapManagedMarketplaces({ repositoryRoot: candidate, agents: ['codex'], ...homes });
    assert.equal(await root(), candidate);
    await add('ps-skills@quickstark');
    const before = await inventory();
    let withdrew = false;
    const runtime = { runCommand: async (bin, args, context) => {
      const result = await runNativePackageCommand(bin, args, context);
      if (!withdrew && args[0] === 'plugin' && args[1] === 'remove' && args[2] === 'ps-skills@quickstark') {
        withdrew = true;
        throw new Error('Interrupted after retained PS withdrawal.');
      }
      return result;
    } };
    const failed = await executeManagedSkills({ ...options, action: 'sync', authorize: true, withPackages: ['qs-skills', 'qs-advanced', 'qs-specialists'], runtime });
    assert.equal(failed.status, 'failed', JSON.stringify(failed));
    assert.ok(withdrew);
    assert.match(failed.failedStep, /withdraw/);
    const journal = await readMigrationJournal(failed.journalPath);
    const bindings = journal.plan.controlPlane.nativeOptions.codex.packages;
    assert.ok(bindings.every(p => p.marketplaceRoot === candidate));
    assert.equal(bindings.find(p => p.name === 'ps-skills').source, path.join(candidate, 'codex/plugins/ps-skills'));
    assert.ok(bindings.filter(p => p.name !== 'ps-skills').every(p => p.source.startsWith(path.join(candidate, 'dist/codex') + path.sep)));
    const withdrawalBackup = journal.events.find(event => event.kind === 'backup-verified'
      && event.data.stepId === failed.failedStep).data.backup.reference;
    const backupBefore = await captureMigrationPath(withdrawalBackup);
    await assert.rejects(executeManagedSkills({ ...options, action: 'sync', authorize: true,
      resume: failed.journalPath, withPackages: ['qs-video'] }), /frozen journal selection/);
    const retry = await runUpdater('--resume', failed.journalPath);
    assert.equal(retry.status, 'complete', JSON.stringify(retry));
    assert.deepEqual(await installed(), ['qs-advanced', 'qs-skills', 'qs-specialists']);
    const restored = await restoreManagedSkillMigration({ journalPath: failed.journalPath });
    const rollback = await executeManagedSkillMigration(restored, {
      ownerId: 'isolated-layout17-test', mode: 'recover',
      recoveryAuthority: { transactionId: restored.plan.id, operation: 'restore-journaled-owned-effects', source: 'isolated-fixture' },
    });
    assert.equal(rollback.status, 'rolled-back', rollback.error);
    assert.deepEqual(await inventory(), before);
    assert.deepEqual(await captureMigrationPath(withdrawalBackup), backupBefore);
    assert.equal(await root(), candidate);
    await assert.rejects(readFile(selectionPath), { code: 'ENOENT' });
  }

  assert.deepEqual(await unrelated(), initialUnrelated);
  console.log(JSON.stringify({ scenario, candidate: revision, prior: priorRevision, status: 'passed' }));
} finally {
  await rm(work, { recursive: true, force: true });
}
