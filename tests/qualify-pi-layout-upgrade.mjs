import assert from 'node:assert/strict';
import { execFile as execFileCallback } from 'node:child_process';
import { appendFile, mkdir, mkdtemp, readFile, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import { captureMigrationPath } from '../tooling/install/migration-filesystem.mjs';
import { runNativePackageCommand } from '../tooling/install/migration-native-packages.mjs';
import { readMigrationJournal } from '../tooling/install/migration-transaction.mjs';
import { executeManagedSkillMigration, restoreManagedSkillMigration } from '../tooling/install/managed-skill-migration.mjs';
import { resolveManagedSkillPaths } from '../tooling/install/managed-skill-paths.mjs';
import { executeManagedSkills } from '../tooling/install/managed-skills.mjs';
import { updateInstalledHarnesses } from '../tooling/install/update-skills.mjs';

const execFile = promisify(execFileCallback);
const [candidateArg, scenario] = process.argv.slice(2);
assert.ok(candidateArg && ['fresh', 'upgrade', 'journal'].includes(scenario),
  'Usage: node tests/qualify-pi-layout-upgrade.mjs <Pi candidate> <fresh|upgrade|journal>');
const candidate = await realpath(candidateArg);
const git = async (cwd, ...args) => (await execFile('git', args, { cwd, encoding: 'utf8' })).stdout.trim();
const revision = await git(candidate, 'rev-parse', 'HEAD');
const originalTag = 'v4.4.7';
const originalRevision = await git(candidate, 'rev-parse', originalTag + '^{commit}');
const json = async file => JSON.parse(await readFile(file, 'utf8'));
const version = (await json(path.join(candidate, 'package.json'))).version;
const tag = 'v' + version;
const release = { tag, revision, version };
const origin = 'https://github.com/quickstark/skills.git';
assert.equal(await git(candidate, 'status', '--porcelain'), '');
const work = await mkdtemp(path.join(await realpath(tmpdir()), 'qs-pi-layout-'));
const homeDirectory = path.join(work, 'home');
const custom = scenario !== 'fresh';
const piHomeDirectory = path.join(homeDirectory, custom ? 'pi-custom' : '.pi/agent');
const options = { repositoryRoot: candidate, homeDirectory, piHomeDirectory, agents: ['pi'], environment: {} };
const { selectionPath } = resolveManagedSkillPaths(options);
const flags = ['--agent', 'pi', '--home', homeDirectory];
if (custom) flags.push('--pi-home', piHomeDirectory);
const config = path.join(piHomeDirectory, 'settings.json');
const target = custom ? path.join(homeDirectory, 'dotfiles', 'pi.json') : config;
const foreign = path.join(work, 'community-theme');
const native = { cwd: work, homeDirectory, piHomeDirectory };
const command = (...args) => runNativePackageCommand('pi', args, native);
const env = {
  HOME: homeDirectory, USERPROFILE: homeDirectory, PI_CODING_AGENT_DIR: piHomeDirectory,
  PATH: process.env.PATH, XDG_CONFIG_HOME: path.join(homeDirectory, '.config'),
  LANG: 'C.UTF-8', PI_OFFLINE: '1', PI_TELEMETRY: '0',
};

async function configurePublishedFixture() {
  const remote = path.join(work, 'release.git');
  await git(work, 'init', '--bare', '--quiet', remote);
  const objects = await git(candidate, 'rev-parse', '--path-format=absolute', '--git-path', 'objects');
  await writeFile(path.join(remote, 'objects/info/alternates'), objects + '\n');
  await git(remote, 'update-ref', 'refs/tags/' + tag, revision);
  await git(work, 'config', '--file', path.join(homeDirectory, '.gitconfig'), 'url.' + pathToFileURL(remote).href + '.insteadOf', origin);
  Object.assign(process.env, env);
  for (const name of Object.keys(process.env)) {
    if (/^(GIT_|OPENAI_|ANTHROPIC_|PI_API_KEY$)/.test(name)) delete process.env[name];
  }
}

async function runUpdater(...extra) {
  try {
    const result = await execFile(process.execPath, [path.join(candidate, 'scripts/update-skills.mjs'),
      '--release', tag + '@' + revision, '--json', ...flags, ...extra],
    { cwd: work, env, encoding: 'utf8', timeout: 180000 });
    return JSON.parse(result.stdout);
  } catch (error) {
    if (error.stdout) return JSON.parse(error.stdout);
    throw error;
  }
}

async function installPrior() {
  const prior = path.join(work, 'prior-release');
  await git(work, '-c', 'advice.detachedHead=false', 'clone', '--quiet', '--shared', '--branch', originalTag, candidate, prior);
  await git(prior, 'remote', 'set-url', 'origin', origin);
  const selected = ['ps-skills', 'qs-skills', 'qs-specialists'];
  for (const id of selected) await command('install', path.join(prior, 'pi/packages', id));
  assert.equal((await json(path.join(prior, 'pi/packages/ps-skills/package.json'))).version, '3.8.0');
  const listed = (await command('list')).stdout;
  for (const id of selected) assert.ok(listed.includes(path.join(prior, 'pi/packages', id)));
  await mkdir(path.dirname(selectionPath), { recursive: true });
  await writeFile(selectionPath, JSON.stringify({
    schemaVersion: 1,
    targets: { pi: { packages: selected, resources: [], profile: null, additions: ['qs-specialists'] } },
    templateRevision: originalRevision, lastSuccessfulTransaction: null,
  }) + '\n');
  return prior;
}

async function assertCandidateInstall(selected) {
  const sources = selected.map(id => path.join(candidate, 'dist/pi', id));
  const settings = await json(target);
  assert.deepEqual(settings.packages.map(source => path.resolve(path.dirname(config), source)).sort(), [foreign, ...sources].sort());
  assert.equal(settings.theme, 'community-preserved');
  const listed = (await command('list')).stdout;
  for (const source of [foreign, ...sources]) assert.ok(listed.includes(source));
  assert.deepEqual((await json(selectionPath)).targets.pi.packages.slice().sort(), selected);
}

try {
  await mkdir(piHomeDirectory, { recursive: true });
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, '{ "theme": "community-preserved" }\n');
  if (custom) await symlink(path.relative(path.dirname(config), target), config);
  const originalLink = custom ? await captureMigrationPath(config) : null;
  await configurePublishedFixture();
  await mkdir(path.join(foreign, 'skills/fixture-keep'), { recursive: true });
  await writeFile(path.join(foreign, 'package.json'), JSON.stringify({ name: 'fixture-keep', version: '1.0.0', pi: { skills: ['./skills'] } }));
  await writeFile(path.join(foreign, 'skills/fixture-keep/SKILL.md'), '---\nname: fixture-keep\ndescription: Unrelated fixture.\n---\n');
  await command('install', foreign);
  const foreignSnapshot = await captureMigrationPath(foreign);

  if (!custom) {
    const fresh = await runUpdater();
    assert.equal(fresh.status, 'complete', JSON.stringify(fresh));
    await assertCandidateInstall(['qs-skills']);
  } else {
    const prior = await installPrior();
    const oldCore = path.join(prior, 'pi/packages/qs-skills');
    const beforeSettings = await readFile(target);
    const beforeSelection = await readFile(selectionPath);
    const desired = ['qs-advanced', 'qs-skills', 'qs-specialists'];
    let effects = 0;
    const watch = { runCommand: async (bin, args, context) => {
      if (['install', 'remove'].includes(args[0])) effects++;
      return runNativePackageCommand(bin, args, context);
    } };

    async function assertRejected(reason) {
      const result = await updateInstalledHarnesses({ ...options, arguments_: flags, runtime: watch });
      assert.equal(result.status, 'failed', JSON.stringify(result));
      assert.match(result.results[0].error, reason);
      await assert.rejects(executeManagedSkills({ ...options, action: 'sync', authorize: true, runtime: watch }), reason);
      assert.equal(effects, 0);
      assert.deepEqual(await readFile(target), beforeSettings);
      assert.deepEqual(await readFile(selectionPath), beforeSelection);
      assert.deepEqual(await captureMigrationPath(config), originalLink);
    }

    if (scenario === 'upgrade') {
      const edited = path.join(oldCore, 'skills/qs-help/SKILL.md');
      const original = await readFile(edited);
      await appendFile(edited, '\nUnaccepted local edit.\n');
      try { await assertRejected(/differs from every trusted prior release tree/); }
      finally { await writeFile(edited, original); }
      await git(prior, 'remote', 'set-url', 'origin', 'https://example.invalid/fixture/skills.git');
      try { await assertRejected(/origin is not the official QuickStark repository/); }
      finally { await git(prior, 'remote', 'set-url', 'origin', origin); }
    }

    let withdrew = false;
    const runtime = { runCommand: async (bin, args, context) => {
      const result = await runNativePackageCommand(bin, args, context);
      if (!withdrew && args[0] === 'remove' && args[1] === oldCore) {
        withdrew = true;
        throw new Error('Interrupted after native Pi withdrawal.');
      }
      return result;
    } };

    if (scenario === 'upgrade') {
      const interrupted = await updateInstalledHarnesses({ ...options, arguments_: flags, release, runtime });
      assert.equal(interrupted.status, 'failed', JSON.stringify(interrupted));
      assert.ok(withdrew);
      const savedBackup = path.join(interrupted.results[0].backupRoot, 'settings-original');
      assert.deepEqual(await readFile(savedBackup), beforeSettings);
      assert.deepEqual(await captureMigrationPath(config), originalLink);
      const retried = await runUpdater();
      assert.equal(retried.status, 'complete', JSON.stringify(retried));
      await assertCandidateInstall(desired);
      assert.deepEqual(await readFile(savedBackup), beforeSettings);
    } else {
      const interrupted = await executeManagedSkills({ ...options, action: 'sync', authorize: true, runtime, withPackages: desired });
      assert.equal(interrupted.status, 'failed', JSON.stringify(interrupted));
      assert.ok(withdrew);
      assert.equal(interrupted.failedStep, 'withdraw-pi-observed-qs-skills');
      const journal = await readMigrationJournal(interrupted.journalPath);
      const binding = journal.plan.controlPlane.nativeOptions.pi;
      assert.equal(binding.piSettingsBinding.target, target);
      assert.deepEqual(binding.piSettingsBinding.link, originalLink);
      assert.ok(binding.packages.some(pkg => pkg.source === oldCore && pkg.version === version));
      assert.ok(binding.packages.some(pkg => pkg.source === path.join(candidate, 'dist/pi/qs-skills') && pkg.version === version));
      assert.ok(binding.packages.some(pkg => pkg.source === path.join(prior, 'pi/packages/ps-skills') && pkg.version === '3.8.0'));
      const firstWithdrawal = journal.plan.steps.find(step => step.operation === 'native-withdraw');
      const backup = journal.events.find(event => event.kind === 'backup-verified' && event.data.stepId === firstWithdrawal.id).data.backup.reference;
      const backupBefore = await captureMigrationPath(backup);
      assert.deepEqual(await readFile(path.join(backup, 'target-0')), beforeSettings);
      await assert.rejects(executeManagedSkills({ ...options, action: 'sync', authorize: true,
        resume: interrupted.journalPath, withPackages: ['qs-video'] }), /frozen journal selection/);
      const retried = await runUpdater('--resume', interrupted.journalPath);
      assert.equal(retried.status, 'complete', JSON.stringify(retried));
      await assertCandidateInstall(desired);
      assert.deepEqual(await captureMigrationPath(config), originalLink);
      const restored = await restoreManagedSkillMigration({ journalPath: interrupted.journalPath });
      const rollback = await executeManagedSkillMigration(restored, {
        ownerId: 'isolated-pi-layout-test', mode: 'recover',
        recoveryAuthority: { transactionId: restored.plan.id, operation: 'restore-journaled-owned-effects', source: 'isolated-fixture' },
      });
      assert.equal(rollback.status, 'rolled-back', rollback.error);
      const restoredSettings = await json(target);
      const originalSettings = JSON.parse(beforeSettings);
      // Pi re-adds managed sources during native rollback, which can change their order.
      restoredSettings.packages.sort();
      originalSettings.packages.sort();
      assert.deepEqual(restoredSettings, originalSettings);
      assert.deepEqual(await readFile(selectionPath), beforeSelection);
      assert.deepEqual(await captureMigrationPath(backup), backupBefore);
      const listed = (await command('list')).stdout;
      for (const id of ['ps-skills', 'qs-skills', 'qs-specialists']) assert.ok(listed.includes(path.join(prior, 'pi/packages', id)));
    }
    assert.deepEqual(await captureMigrationPath(config), originalLink);
    assert.equal(await git(prior, 'status', '--porcelain'), '');
    assert.equal((await captureMigrationPath(path.join(homeDirectory, '.pi/agent/settings.json'))).kind, 'absent');
  }

  assert.deepEqual(await captureMigrationPath(foreign), foreignSnapshot);
  console.log(JSON.stringify({ scenario, candidate: revision, prior: originalRevision, status: 'passed' }));
} finally {
  await rm(work, { recursive: true, force: true });
}
