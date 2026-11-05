import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmod, mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { detectInstalledHarnesses, formatUpdateResult, updateInstalledHarnesses } from '../scripts/update-skills.mjs';

const agents = ['codex', 'claude-code', 'pi'];
const repositoryRoot = path.resolve(import.meta.dirname, '..');
const script = path.join(repositoryRoot, 'scripts/update-skills.mjs');
const homeDirectory = '/users/update-skills-test';

async function temporaryDirectory(t) {
  const directory = await mkdtemp(path.join(tmpdir(), 'qs-update-skills-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return directory;
}

function harness(overrides = {}) {
  const calls = [];
  const progress = [];
  let detections = 0;
  return {
    calls, progress,
    get detections() { return detections; },
    run: (options = {}) => updateInstalledHarnesses({
      repositoryRoot, homeDirectory, environment: {},
      detect: async () => { detections += 1; return agents; },
      execute: async (selected) => { calls.push(selected); return { status: 'complete' }; },
      onProgress: (entry) => progress.push(entry),
      ...overrides, ...options,
    }),
  };
}

test('PATH detection finds all supported executable names without running them', async (t) => {
  const directory = await temporaryDirectory(t);
  for (const command of ['codex', 'claude', 'pi']) {
    const executable = path.join(directory, command);
    await writeFile(executable, 'not an executable program\n');
    await chmod(executable, 0o755);
  }
  assert.deepEqual(await detectInstalledHarnesses({ environment: { PATH: directory } }), agents);
});

test('PATH detection supports a subset across directories, deduplicates, and ignores non-executable files and directories', async (t) => {
  const directory = await temporaryDirectory(t);
  const second = path.join(directory, 'second');
  await mkdir(second);
  await mkdir(path.join(directory, 'pi'));
  await writeFile(path.join(directory, 'claude'), 'not executable');
  await chmod(path.join(directory, 'claude'), 0o644);
  for (const location of [directory, second]) {
    await writeFile(path.join(location, 'codex'), 'stub');
    await chmod(path.join(location, 'codex'), 0o755);
  }
  await writeFile(path.join(second, 'pi'), 'stub');
  await chmod(path.join(second, 'pi'), 0o755);
  assert.deepEqual(await detectInstalledHarnesses({ environment: { PATH: [directory, '/missing/qs-bin', second].join(path.delimiter) } }), ['codex', 'pi']);
});

test('PATH detection returns no targets when no supported executables exist', async (t) => {
  const directory = await temporaryDirectory(t);
  assert.deepEqual(await detectInstalledHarnesses({ environment: { PATH: directory } }), []);
});

test('clean updates try each client independently after a native failure', async () => {
  const fixture = harness({ execute: async selected => selected.agents.includes('codex')
    ? { status: 'failed', error: 'Codex unavailable' } : { status: 'complete' } });
  const result = await fixture.run();
  assert.deepEqual(result.results.map(result => result.agents), [['codex'], ['claude-code'], ['pi']]);
  assert.deepEqual(result.results.map(result => result.status), ['failed', 'complete', 'complete']);
  assert.deepEqual(result.pendingAgents, []);
});

test('an invalid client home is reported without preventing healthy clients', async () => {
  const fixture = harness();
  const result = await fixture.run({ environment: { CODEX_HOME: '/' } });
  assert.equal(result.status, 'failed');
  assert.deepEqual(result.results.map(result => result.status), ['failed', 'complete', 'complete']);
  assert.deepEqual(fixture.calls.map(call => call.agents), [['claude-code'], ['pi']]);
});

test('ordinary installation gives each client an independent clean install', async () => {
  const fixture = harness();
  const result = await fixture.run();
  assert.equal(fixture.detections, 1);
  assert.equal(fixture.calls.length, 3);
  assert.deepEqual(fixture.calls.map(call => call.agents), agents.map(agent => [agent]));
  assert.equal(fixture.calls[0].bootstrapMarketplaces, true);
  assert.deepEqual(fixture.calls[0].withPackages, []);
  assert.deepEqual(fixture.progress.map(({ agents }) => agents), agents.map(agent => [agent]));
  assert.equal(fixture.progress[0].homes.selectionPath, `${homeDirectory}/.config/quickstark/skills-selection.json`);
  assert.deepEqual(result, { action: 'update', status: 'complete', agents, results: agents.map(agent => ({ agents:[agent], status:'complete' })), pendingAgents: [] });
});

test('detected subset updates only that subset', async () => {
  const fixture = harness({ detect: async () => ['pi'] });
  const result = await fixture.run();
  assert.deepEqual(fixture.calls.map(({ agents }) => agents), [['pi']]);
  assert.deepEqual(result.agents, ['pi']);
});

test('a fresh host without a supported CLI fails before execution', async () => {
  const fixture = harness({ detect: async () => [] });
  await assert.rejects(fixture.run(), /No supported harness found on PATH/);
  assert.deepEqual(fixture.calls, []);
  assert.deepEqual(fixture.progress, []);
});

test('explicit agent and target options bypass discovery and normalize the Claude alias', async () => {
  const fixture = harness({ detect: async () => { throw new Error('discovery must not run'); } });
  const result = await fixture.run({ arguments_: ['--agent', 'claude', '--target', 'pi', '--agent', 'claude-code'] });
  assert.deepEqual(result.agents, ['claude-code', 'pi']);
  assert.deepEqual(fixture.calls.map(({ agents }) => agents), [['claude-code'], ['pi']]);
});

test('inherited custom profiles split from default targets and keep isolated updater state', async () => {
  const fixture = harness();
  const result = await fixture.run({ environment: { CODEX_HOME: '/profiles/codex', PI_CODING_AGENT_DIR: '/profiles/pi' } });
  assert.equal(result.status, 'complete');
  assert.deepEqual(fixture.calls.map(({ agents }) => agents), [['codex'], ['claude-code'], ['pi']]);
  assert.equal(new Set(fixture.progress.map(({ homes }) => homes.selectionPath)).size, 3);
  assert.equal(fixture.progress[0].homes.codexHomeDirectory, '/profiles/codex');
  assert.equal(fixture.progress[2].homes.piHomeDirectory, '/profiles/pi');
});

test('all inherited custom profiles run as three isolated single-host transactions', async () => {
  const fixture = harness();
  const result = await fixture.run({ environment: { CODEX_HOME: '/profiles/codex', CLAUDE_CONFIG_DIR: '/profiles/claude', PI_CODING_AGENT_DIR: '/profiles/pi' } });
  assert.equal(result.status, 'complete');
  assert.deepEqual(fixture.calls.map(({ agents }) => agents), agents.map(agent => [agent]));
  assert.equal(new Set(fixture.progress.map(({ homes }) => homes.selectionPath)).size, 3);
});

test('explicit homes select their hosts without detection and are filtered per transaction', async () => {
  const fixture = harness({ detect: async () => { throw new Error('discovery must not run'); } });
  const result = await fixture.run({ arguments_: ['--codex-home', '/profiles/codex', '--claude-home', '/profiles/claude', '--pi-home', '/profiles/pi'] });
  assert.equal(result.status, 'complete');
  for (const [index, field] of ['codexHomeDirectory', 'claudeHomeDirectory', 'piHomeDirectory'].entries()) {
    assert.deepEqual(fixture.calls[index].agents, [agents[index]]);
    assert.equal(fixture.calls[index][field], ['/profiles/codex', '/profiles/claude', '/profiles/pi'][index]);
    for (const other of ['codexHomeDirectory', 'claudeHomeDirectory', 'piHomeDirectory'].filter(value => value !== field)) {
      assert.equal(Object.hasOwn(fixture.calls[index], other), false);
    }
  }
});

test('an explicit home for an unselected host fails before executing', async () => {
  const fixture = harness();
  await assert.rejects(fixture.run({ arguments_: ['--agent', 'pi', '--codex-home', '/profiles/codex'] }), /configuration home.*unselected harness/);
  assert.deepEqual(fixture.calls, []);
});

test('older multi-host resume infers frozen native targets and bypasses PATH discovery', async () => {
  const reads = [];
  const fixture = harness({
    detect: async () => { throw new Error('discovery must not run'); },
    readJournal: async (file) => {
      reads.push(file);
      return { plan: { controlPlane: { nativeOptions: { pi: {}, 'claude-code': {} } } } };
    },
  });
  const result = await fixture.run({ arguments_: ['--resume', '/recovery/transaction.json'] });
  assert.deepEqual(reads, ['/recovery/transaction.json']);
  assert.deepEqual(result.agents, ['pi', 'claude-code']);
  assert.deepEqual(fixture.calls.map(({ agents }) => agents), [['pi', 'claude-code']]);
  assert.equal(fixture.calls[0].resume, '/recovery/transaction.json');
});

test('resume with explicit targets uses them without re-reading or detecting targets', async () => {
  const fixture = harness({
    detect: async () => { throw new Error('discovery must not run'); },
    readJournal: async () => { throw new Error('explicit targets require no inference'); },
  });
  await fixture.run({ arguments_: ['--target', 'claude', '--resume', '/recovery/transaction.json'] });
  assert.deepEqual(fixture.calls[0].agents, ['claude-code']);
});

test('resume without frozen native targets fails before executing', async () => {
  const fixture = harness({ readJournal: async () => ({ plan: {} }) });
  await assert.rejects(fixture.run({ arguments_: ['--resume', '/recovery/transaction.json'] }), /no frozen native targets/);
  assert.equal(fixture.detections, 0);
  assert.deepEqual(fixture.calls, []);
});

test('update forwards package selection, manifest, profile, JSON, authorization, home and execution hooks', async () => {
  const fixture = harness();
  const runtime = { marker: true };
  await fixture.run({ runtime, arguments_: ['--agent', 'pi', '--home', '/users/explicit', '--manifest', '/inputs/selection.json', '--profile', 'work', '--with', 'qs-video', '--with', 'qs-frontend', '--json', '--authorize'] });
  const selected = fixture.calls[0];
  assert.equal(selected.action, 'update');
  assert.equal(selected.homeDirectory, '/users/explicit');
  assert.equal(selected.repositoryRoot, repositoryRoot);
  assert.equal(selected.manifestPath, '/inputs/selection.json');
  assert.equal(selected.profile, 'work');
  assert.deepEqual(selected.withPackages, ['qs-video', 'qs-frontend']);
  assert.equal(selected.json, true);
  assert.equal(selected.authorize, true);
  assert.equal(selected.runtime, runtime);
});

test('an explicit legacy repair retains its recovery report and leaves later groups pending', async () => {
  const calls = [];
  const fixture = harness({ execute: async (selected) => {
    calls.push(selected.agents);
    return selected.agents.includes('codex') ? { status: 'failed', error: 'native verification failed', journalPath: '/recovery/codex.json' } : { status: 'complete' };
  } });
  const result = await fixture.run({ repairManagedPackages:true, environment: { CODEX_HOME: '/profiles/codex', PI_CODING_AGENT_DIR: '/profiles/pi' } });
  assert.deepEqual(calls, [['claude-code'], ['codex']]);
  assert.equal(result.status, 'failed');
  assert.deepEqual(result.pendingAgents, ['pi']);
  assert.equal(result.results[1].journalPath, '/recovery/codex.json');
  assert.equal(result.results[1].error, 'native verification failed');
});

test('a thrown manager error is reported for each independently attempted client', async () => {
  const fixture = harness({ execute: async () => { throw new Error('manager unavailable'); } });
  const result = await fixture.run({ environment: { CODEX_HOME: '/profiles/codex' } });
  assert.equal(result.status, 'failed');
  assert.deepEqual(result.results, agents.map(agent => ({ agents:[agent], status:'failed',error:'manager unavailable' })));
  assert.deepEqual(result.pendingAgents, []);
});

test('partial marketplace registrations survive a thrown error in the machine result and human report', async () => {
  const marketplaceActions = [
    { agent: 'codex', status: 'registered', root: '/checkout/codex' },
    { agent: 'claude-code', status: 'registration-attempted', root: '/checkout' },
  ];
  const fixture = harness({ execute: async () => {
    throw Object.assign(new Error('second marketplace add failed'), { marketplaceActions });
  } });
  const result = await fixture.run();
  assert.equal(result.status, 'failed');
  assert.deepEqual(JSON.parse(JSON.stringify(result)).results[0].marketplaceActions, marketplaceActions);
  assert.equal(result.results[0].error, 'second marketplace add failed');
  const report = formatUpdateResult(result);
  assert.match(report, /Codex marketplace: registered at \/checkout\/codex\./);
  assert.match(report, /Claude Code marketplace: registration attempted; inspect current state at \/checkout\./);
  assert.doesNotMatch(report, /Restart the updated clients/);
});

test('human formatter reports package counts and restart instructions after success', () => {
  assert.equal(formatUpdateResult({ status: 'complete', pendingAgents: [], results: [{ agents, status: 'complete', targets: { codex: { desired: { packages: ['core', 'video'] } }, pi: { desired: { packages: [] } } } }] }),
    'Codex: updated and verified (2 packages).\nClaude Code: updated and verified.\nPi: updated and verified.\nRestart the updated clients or start fresh sessions to load the skills.');
});

test('human formatter reports recovery and pending hosts without a success instruction', () => {
  assert.equal(formatUpdateResult({ status: 'failed', pendingAgents: ['claude-code', 'pi'], results: [{ agents: ['codex'], status: 'failed', error: 'verification failed', journalPath: '/recovery/transaction.json' }] }),
    'Codex: failed.\nverification failed\nRecovery journal: /recovery/transaction.json\nNot attempted: Claude Code, Pi.');
});

test('CLI help exits successfully without detecting managers or writing updater state', async (t) => {
  const home = await temporaryDirectory(t);
  const bin = path.join(home, 'bin');
  await mkdir(bin);
  await writeFile(path.join(bin, 'codex'), `#!/bin/sh\ntouch '${path.join(home, 'manager-was-run')}'\nexit 99\n`);
  await chmod(path.join(bin, 'codex'), 0o755);
  for (const flag of ['--help', '-h']) {
    const result = spawnSync(process.execPath, [script, flag, '--home', home], { encoding: 'utf8', env: { PATH: bin, HOME: home } });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Usage: npm run skills:update/);
    assert.equal(result.stderr, '');
  }
  assert.deepEqual(await readdir(home), ['bin']);
});

test('CLI JSON no-harness error is machine-readable and leaves a fresh home untouched', async (t) => {
  const home = await temporaryDirectory(t);
  const result = spawnSync(process.execPath, [script, '--json', '--home', home], { encoding: 'utf8', env: { PATH: home, HOME: home } });
  assert.equal(result.status, 1);
  assert.equal(result.stdout, '');
  const payload = JSON.parse(result.stderr);
  assert.deepEqual(Object.keys(payload).sort(), ['action', 'error', 'status']);
  assert.equal(payload.action, 'update');
  assert.equal(payload.status, 'failed');
  assert.match(payload.error, /No supported harness found on PATH/);
  assert.deepEqual(await readdir(home), []);
});
