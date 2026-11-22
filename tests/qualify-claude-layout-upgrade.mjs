import assert from 'node:assert/strict';
import { execFile as execFileCallback } from 'node:child_process';
import { appendFile, mkdir, mkdtemp, readFile, realpath, rename, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import { captureLegacyClaudeCore } from '../tooling/install/claude-core-migration.mjs';
import { captureMigrationPath } from '../tooling/install/migration-filesystem.mjs';
import { runNativePackageCommand } from '../tooling/install/migration-native-packages.mjs';
import { readMigrationJournal } from '../tooling/install/migration-transaction.mjs';
import { executeManagedSkillMigration, restoreManagedSkillMigration } from '../tooling/install/managed-skill-migration.mjs';
import { resolveManagedSkillPaths } from '../tooling/install/managed-skill-paths.mjs';
import { executeManagedSkills } from '../tooling/install/managed-skills.mjs';
import { updateInstalledHarnesses } from '../tooling/install/update-skills.mjs';

const execFile = promisify(execFileCallback);
const [candidateArg, scenario] = process.argv.slice(2);
const legacy = scenario === 'journal' || scenario === 'root-upgrade';
assert.ok(candidateArg && ['fresh', 'upgrade', 'root-upgrade', 'journal'].includes(scenario),
  'Usage: node tests/qualify-claude-layout-upgrade.mjs <Claude candidate> <fresh|upgrade|root-upgrade|journal>');
const candidate = await realpath(candidateArg);
const git = async (cwd, ...args) => (await execFile('git', args, { cwd, encoding: 'utf8' })).stdout.trim();
const revision = await git(candidate, 'rev-parse', 'HEAD');
assert.equal(await git(candidate, 'status', '--porcelain'), '');
const version = JSON.parse(await readFile(path.join(candidate, 'package.json'))).version;
const tag = 'v' + version;
const release = { tag, revision, version };
const priorTag = legacy ? 'v4.0.0' : 'v4.4.7';
const priorRevision = await git(candidate, 'rev-parse', priorTag + '^{commit}');
const work = await mkdtemp(path.join(await realpath(tmpdir()), 'qs-claude-layout-'));
const homeDirectory = path.join(work, 'home');
const claudeHomeDirectory = path.join(homeDirectory, scenario === 'fresh' ? '.claude' : 'claude-custom');
const agents = ['claude-code'];
const { selectionPath } = resolveManagedSkillPaths({ homeDirectory, claudeHomeDirectory, agents, environment: {} });
const homeSettings = path.join(claudeHomeDirectory, 'settings.json');
const flags = ['--agent', 'claude-code', '--home', homeDirectory];
if (scenario !== 'fresh') flags.push('--claude-home', claudeHomeDirectory);
const native = { cwd: work, homeDirectory, claudeHomeDirectory };
const options = { repositoryRoot: candidate, homeDirectory, claudeHomeDirectory, agents, environment: {} };
const command = (...args) => runNativePackageCommand('claude', args, native);
const json = async file => JSON.parse(await readFile(file, 'utf8'));
const inventory = async () => JSON.parse((await command('plugin', 'list', '--json')).stdout);
const markets = async () => JSON.parse((await command('plugin', 'marketplace', 'list', '--json')).stdout);
const root = async () => (await markets()).find(m => m.name === 'quickstark')?.path;
const installed = async () => (await inventory()).filter(e => e.id.endsWith('@quickstark')).map(e => e.id.split('@')[0]).sort();
const add = name => command('plugin', 'install', name, '--scope', 'user');
const env = {
  HOME: homeDirectory, USERPROFILE: homeDirectory, CLAUDE_CONFIG_DIR: claudeHomeDirectory,
  PATH: process.env.PATH, XDG_CONFIG_HOME: path.join(homeDirectory, '.config'),
  LANG: 'C.UTF-8', DISABLE_TELEMETRY: '1',
};

async function configurePublishedFixture() {
  const remote = path.join(work, 'release.git');
  await git(work, 'init', '--bare', '--quiet', remote);
  const objects = await git(candidate, 'rev-parse', '--path-format=absolute', '--git-path', 'objects');
  await writeFile(path.join(remote, 'objects/info/alternates'), objects + '\n');
  await git(remote, 'update-ref', 'refs/tags/' + tag, revision);
  await git(work, 'config', '--file', path.join(homeDirectory, '.gitconfig'), 'url.' + pathToFileURL(remote).href + '.insteadOf', 'https://github.com/quickstark/skills.git');
  Object.assign(process.env, env);
  for (const name of Object.keys(process.env)) {
    if (/^(GIT_|OPENAI_|ANTHROPIC_|CLAUDE_CODE_OAUTH_TOKEN$)/.test(name)) delete process.env[name];
  }
}

async function addUnrelatedMarketplace() {
  const market = path.join(work, 'community');
  const manifest = path.join(market, 'fixture/.claude-plugin');
  const skill = path.join(market, 'fixture/skills/fixture-keep');
  await mkdir(path.join(market, '.claude-plugin'), { recursive: true });
  await mkdir(manifest, { recursive: true });
  await mkdir(skill, { recursive: true });
  await writeFile(path.join(skill, 'SKILL.md'), '---\nname: fixture-keep\ndescription: Unrelated fixture.\n---\n');
  await writeFile(path.join(manifest, 'plugin.json'), JSON.stringify({ name: 'fixture', version: '1.0.0', skills: ['./skills/fixture-keep'] }));
  await writeFile(path.join(market, '.claude-plugin/marketplace.json'), JSON.stringify({
    name: 'community-fixture', owner: { name: 'Fixture' }, plugins: [{ name: 'fixture', source: './fixture' }],
  }));
  await command('plugin', 'marketplace', 'add', market);
  await add('fixture@community-fixture');
  return async () => {
    const item = (await inventory()).find(e => e.id === 'fixture@community-fixture');
    assert.equal(item?.enabled, true);
    return {
      markets: (await markets()).filter(e => e.name !== 'quickstark'),
      plugin: item,
      settings: (await json(homeSettings)).enabledPlugins['fixture@community-fixture'],
      snapshot: await captureMigrationPath(item.installPath),
    };
  };
}

async function runUpdater(checkout = candidate, ...extra) {
  try {
    const result = await execFile(process.execPath, [path.join(checkout, 'scripts/update-skills.mjs'),
      '--release', tag + '@' + revision, '--json', ...flags, ...extra],
    { cwd: work, env, encoding: 'utf8', timeout: 240000 });
    return JSON.parse(result.stdout);
  } catch (error) {
    if (error.stdout) return JSON.parse(error.stdout);
    throw error;
  }
}

async function priorInstallation() {
  const prior = path.join(work, 'prior-release');
  await git(work, '-c', 'advice.detachedHead=false', 'clone', '--quiet', '--shared', '--branch', priorTag, candidate, prior);
  await git(prior, 'remote', 'set-url', 'origin', 'https://github.com/quickstark/skills.git');
  await command('plugin', 'marketplace', 'add', prior);
  const selected = ['ps-skills', 'qs-skills', 'qs-specialists'];
  for (const name of selected) await add(name + '@quickstark');
  assert.equal(await root(), prior);
  assert.deepEqual(await installed(), selected);
  const before = (await inventory()).filter(item => item.id.endsWith('@quickstark'));
  assert.equal(before.find(item => item.id === 'ps-skills@quickstark').version, '3.8.0');
  assert.equal(before.find(item => item.id === 'qs-skills@quickstark').readFromFolder, legacy ? prior : path.join(prior, 'packages/qs-skills'));
  return { prior, before };
}

const desired = ['qs-advanced', 'qs-skills', 'qs-specialists'];
async function assertCandidateInstallation(checkout, packages) {
  assert.equal(await root(), checkout);
  assert.deepEqual(await installed(), packages);
  for (const item of (await inventory()).filter(e => e.id.endsWith('@quickstark'))) {
    assert.equal(item.readFromFolder, path.join(checkout, 'dist/claude', item.id.split('@')[0]));
    assert.equal(item.version, version);
  }
  assert.deepEqual((await json(selectionPath)).targets['claude-code'].packages.slice().sort(), packages);
}

try {
  await mkdir(claudeHomeDirectory, { recursive: true });
  await configurePublishedFixture();
  const unrelated = await addUnrelatedMarketplace();
  const unrelatedBefore = await unrelated();

  if (scenario === 'fresh') {
    const result = await runUpdater();
    assert.equal(result.status, 'complete', JSON.stringify(result));
    await assertCandidateInstallation(candidate, ['qs-skills']);
  } else {
    const { prior, before } = await priorInstallation();
    const core = before.find(item => item.id === 'qs-skills@quickstark');
    const beforeSettings = await readFile(homeSettings);
    await mkdir(path.dirname(selectionPath), { recursive: true });
    await writeFile(selectionPath, JSON.stringify({
      schemaVersion: 1,
      targets: { 'claude-code': { packages: ['ps-skills', 'qs-skills', 'qs-specialists'], resources: [], profile: null, additions: ['qs-specialists'] } },
      templateRevision: priorRevision, lastSuccessfulTransaction: null,
    }) + '\n');
    const selectionBefore = await readFile(selectionPath);

    if (scenario !== 'journal') {
      const sourceSkill = path.join(core.readFromFolder, legacy ? 'skills/engineering/qs-help/SKILL.md' : 'skills/qs-help/SKILL.md');
      const original = await readFile(sourceSkill);
      try {
        await appendFile(sourceSkill, '\nFixture source edit.\n');
        const rejected = await updateInstalledHarnesses({ ...options, arguments_: flags });
        assert.match(rejected.results[0].error, /differs from every trusted prior release tree/);
        assert.deepEqual(await readFile(homeSettings), beforeSettings);
        assert.deepEqual(await readFile(selectionPath), selectionBefore);
      } finally { await writeFile(sourceSkill, original); }
      const movedCache = path.join(work, 'relocated-cache');
      await rename(core.installPath, movedCache);
      try {
        await symlink(movedCache, core.installPath);
        const rejected = await updateInstalledHarnesses({ ...options, arguments_: flags });
        assert.equal(rejected.status, 'failed', JSON.stringify(rejected));
        assert.match(rejected.results[0].error, /cache path|real directory|symbolic link|symlink/);
        assert.deepEqual(await readFile(homeSettings), beforeSettings);
        assert.deepEqual(await readFile(selectionPath), selectionBefore);
      } finally { await rm(core.installPath); await rename(movedCache, core.installPath); }

      let withdrew = false;
      const runtime = { runCommand: async (bin, args, context) => {
        const result = await runNativePackageCommand(bin, args, context);
        if (!withdrew && args[0] === 'plugin' && args[1] === 'uninstall') {
          withdrew = true;
          throw new Error('Interrupted after Claude withdrawal.');
        }
        return result;
      } };
      const interrupted = await updateInstalledHarnesses({ ...options, arguments_: flags, release, runtime });
      assert.equal(interrupted.status, 'failed', JSON.stringify(interrupted));
      assert.ok(withdrew);
      const backup = interrupted.results[0].backupRoot;
      assert.deepEqual(await readFile(path.join(backup, 'settings-original')), beforeSettings);
      const cached = path.join(backup, 'cache-qs-skills', core.version);
      assert.deepEqual(await readFile(path.join(cached, '.claude-plugin/plugin.json')), await readFile(path.join(core.installPath, '.claude-plugin/plugin.json')));
      const retried = await runUpdater();
      assert.equal(retried.status, 'complete', JSON.stringify(retried));
      await assertCandidateInstallation(candidate, desired);
      assert.equal(await git(prior, 'status', '--porcelain'), '');
    } else {
      const closure = await captureLegacyClaudeCore(core.installPath);
      const other = path.join(core.installPath, 'unrelated-local-resource');
      await mkdir(other);
      await symlink('/unavailable-library', path.join(other, 'external-link'));
      const beforeOther = await captureMigrationPath(other, { allowDescendantSymlinks: true });
      // Advance this disposable checkout while the native registrations still
      // refer to the older installed caches and the same physical marketplace.
      await git(prior, 'checkout', '--quiet', '--detach', revision);
      let withdrew = false;
      const runtime = { runCommand: async (bin, args, context) => {
        const result = await runNativePackageCommand(bin, args, context);
        if (!withdrew && args[0] === 'plugin' && args[1] === 'uninstall' && args[2] === 'qs-skills@quickstark') {
          withdrew = true;
          throw new Error('Interrupted after root-based core withdrawal.');
        }
        return result;
      } };
      const failed = await executeManagedSkills({
        ...options, repositoryRoot: prior, action: 'sync', authorize: true, withPackages: desired, runtime,
      });
      assert.equal(failed.status, 'failed', JSON.stringify(failed));
      assert.ok(withdrew);
      assert.match(failed.failedStep, /withdraw/);
      const journal = await readMigrationJournal(failed.journalPath);
      const bindings = journal.plan.controlPlane.nativeOptions['claude-code'].packages;
      assert.ok(bindings.every(p => p.marketplaceRoot === prior));
      assert.ok(bindings.some(p => p.name === 'qs-skills' && p.legacyRootCore && p.version === '4.0.0'));
      assert.ok(bindings.some(p => p.name === 'ps-skills' && p.version === '3.8.0'));
      assert.ok(bindings.filter(p => !p.installedOnly).every(p => p.source.startsWith(path.join(prior, 'dist/claude') + path.sep)));
      const savedBackup = journal.events.find(event => event.kind === 'backup-verified' && event.data.stepId === failed.failedStep).data.backup.reference;
      const backupBefore = await captureMigrationPath(savedBackup, { allowDescendantSymlinks: true });
      assert.deepEqual(await captureMigrationPath(other, { allowDescendantSymlinks: true }), beforeOther);
      await assert.rejects(executeManagedSkills({ ...options, repositoryRoot: prior, action: 'sync', authorize: true,
        resume: failed.journalPath, withPackages: ['qs-video'] }), /frozen journal selection/);
      const retried = await runUpdater(prior, '--resume', failed.journalPath);
      assert.equal(retried.status, 'complete', JSON.stringify(retried));
      await assertCandidateInstallation(prior, desired);

      const restored = await restoreManagedSkillMigration({ journalPath: failed.journalPath });
      const rollback = await executeManagedSkillMigration(restored, {
        ownerId: 'isolated-claude-layout-test', mode: 'recover',
        recoveryAuthority: { transactionId: restored.plan.id, operation: 'restore-journaled-owned-effects', source: 'isolated-fixture' },
      });
      assert.equal(rollback.status, 'rolled-back', rollback.error);
      const current = (await inventory()).filter(item => item.id.endsWith('@quickstark'));
      const identity = rows => rows.map(({ id, version, enabled, installPath }) => ({ id, version, enabled, installPath })).sort((a, b) => a.id.localeCompare(b.id));
      assert.deepEqual(identity(current), identity(before));
      assert.deepEqual(await readFile(selectionPath), selectionBefore);
      assert.equal((await captureLegacyClaudeCore(core.installPath)).payloadSha256, closure.payloadSha256);
      assert.deepEqual(await captureMigrationPath(other, { allowDescendantSymlinks: true }), beforeOther);
      assert.deepEqual(await captureMigrationPath(savedBackup, { allowDescendantSymlinks: true }), backupBefore);
    }
  }
  assert.deepEqual(await unrelated(), unrelatedBefore);
  console.log(JSON.stringify({ scenario, candidate: revision, prior: priorRevision, status: 'passed' }));
} finally {
  await rm(work, { recursive: true, force: true });
}
