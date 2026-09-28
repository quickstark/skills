import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, chmod, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { createBoundedSampler, scopedProcessReader, discoverOwnedProcesses, cleanupObservedProcesses, execute, continuationSchedule, fixtureRoot, buildPrompt, reviewerBundle } from '../../../scripts/frontend-adoption-trials.mjs';

const wait = ms => new Promise(done => setTimeout(done, ms));
const json = async path => JSON.parse(await readFile(path, 'utf8'));

test('slow observation skips ticks with one active pass and no shutdown backlog', async () => {
  let resolvePass, calls = 0;
  const sampler = createBoundedSampler({ automatic: false, scan: async () => { calls++; await new Promise(done => { resolvePass = done; }); } });
  sampler.tick(); await Promise.resolve();
  for (let i = 0; i < 1000; i++) sampler.tick();
  assert.equal(calls, 1); assert.equal(sampler.stats.skippedTicks, 1000);
  const finished = sampler.finish(); resolvePass(); await finished;
  sampler.tick(); await Promise.resolve(); assert.equal(calls, 1);
  let inFlight = 0, maximum = 0;
  const timed = createBoundedSampler({ intervalMs: 10, scan: async () => { maximum = Math.max(maximum, ++inFlight); await wait(100); inFlight--; } });
  await wait(235); const start = performance.now(); await timed.finish();
  assert.equal(maximum, 1); assert.ok(timed.stats.skippedTicks >= 10);
  assert.ok(timed.stats.passes <= 3); assert.ok(performance.now() - start < 180, 'Only the current pass may remain at shutdown.');
});

test('sampling rejection is recorded once without unhandled rejection or automatic retry', async () => {
  let stopped = 0;
  const sampler = createBoundedSampler({ automatic: false, scan: async () => { throw Object.assign(new Error('permission fixture'), { code: 'EACCES' }); }, onError: () => { stopped++; } });
  sampler.tick(); await sampler.finish(); sampler.tick();
  assert.equal(stopped, 1); assert.equal(sampler.stats.passes, 1);
  assert.deepEqual(sampler.stats.errors, [{ message: 'permission fixture', code: 'EACCES' }]);
});

test('reader visits only owned process task children; unrelated and reused PIDs are excluded', async () => {
  const reads = [], rows = new Map([[10, { parent: 1, start: 100 }], [11, { parent: 10, start: 101 }], [666, { parent: 999, start: 600 }]]);
  const stat = (pid, data) => { const fields = Array(20).fill('0'); fields[0] = 'S'; fields[1] = String(data.parent); fields[19] = String(data.start); return `${pid} (fixture with ) parenthesis) ${fields.join(' ')}`; };
  const reader = scopedProcessReader({ bootId: 'boot', io: {
    async readdir(path) { reads.push(path); assert.notEqual(path, '/proc'); return [path.split('/')[2]]; },
    async readFile(path) { reads.push(path); const pid = Number(path.split('/')[2]); if (path.endsWith('/children')) return pid === 10 ? '11 666' : ''; if (!rows.has(pid)) throw Object.assign(new Error('gone'), { code: 'ENOENT' }); return stat(pid, rows.get(pid)); }
  } });
  const owned = new Map(); await discoverOwnedProcesses({ leader: { pid: 10, identity: 'boot:100' }, owned, reader });
  assert.deepEqual([...owned.keys()], [11]); assert.ok(reads.every(path => /^\/proc\/(10|11|666)\//.test(path)));
  rows.set(11, { parent: 999, start: 777 }); const signals = [];
  const result = await cleanupObservedProcesses({ owned, reader, signal: (...args) => signals.push(args), delay: async () => {} });
  assert.deepEqual(signals, []); assert.deepEqual(result.residual, []);
});

test('observation and cleanup errors remain incomplete, and process-count guard is explicit', async () => {
  const reader = { row: async () => { throw Object.assign(new Error('denied fixture'), { code: 'EACCES' }); } };
  const result = await cleanupObservedProcesses({ owned: new Map([[20, { pid: 20, identity: 'old' }]]), reader, signal: () => assert.fail('Unverified identity must never be signaled.'), delay: async () => {} });
  assert.equal(result.complete, false); assert.ok(result.errors.length > 0); assert.deepEqual(result.residual, []);
  await assert.rejects(discoverOwnedProcesses({ leader: { pid: 10, identity: 'boot:100' }, owned: new Map(), maximumProcesses: 1,
    reader: { row: async pid => ({ pid, parent: pid === 11 ? 10 : 1, identity: `boot:${pid === 10 ? 100 : 101}`, state: 'S' }), children: async () => [11] } }), /budget exceeded/);
});

test('actual long-lived child and detached grandchild are observed and cleaned without whole-host scans', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'qs-frontend-sampling-process-'));
  const childSource = join(directory, 'child.cjs'), executable = join(directory, 'fake-cli.cjs');
  await writeFile(childSource, 'const{spawn}=require("node:child_process"),fs=require("node:fs");process.on("SIGTERM",()=>{});const grandchild=spawn(process.execPath,["-e",\'process.on("SIGTERM",()=>{});setInterval(()=>{},1000)\'],{stdio:"ignore",detached:true});fs.writeFileSync("owned-pids.json",JSON.stringify([process.pid,grandchild.pid]));setInterval(()=>{},1000);\n');
  await writeFile(executable, '#!/usr/bin/env node\nconst{spawn}=require("node:child_process");spawn(process.execPath,[' + JSON.stringify(childSource) + '],{stdio:"ignore",detached:true});setTimeout(()=>{console.log(JSON.stringify({type:"item.completed",item:{type:"agent_message",text:"Fixture response"}}));console.log(JSON.stringify({type:"turn.completed",usage:{input_tokens:1,output_tokens:1}}));process.exit(0);},1300);\n');
  await chmod(executable, 0o755);
  const start = performance.now();
  const result = await execute({ prompt: 'Local supervisor control only', cwd: directory, directory, executable, scenario: { mode: 'implementation', budget: { timeoutMs: 5000, maximumImageCalls: 0 } } });
  assert.equal(result.exitCode, 0); assert.equal(result.completedTurn, true);
  assert.equal(result.processObservation.complete, true); assert.equal(result.processObservation.maximumInFlight, 1);
  assert.ok(result.processObservation.passes >= 5);
  const pids = await json(join(directory, 'owned-pids.json'));
  for (const pid of pids) assert.ok(result.processCleanup.some(row => row.pid === pid));
  assert.equal(result.observedOwnedResidualProcesses.length, 0);
  assert.ok(performance.now() - start < 4000, 'Runtime plus bounded cleanup must finish without queued scan backlog.');
});

test('missing executable retains spawn failure and incomplete observation instead of crashing', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'qs-frontend-sampling-missing-'));
  const result = await execute({ prompt: 'No model', cwd: directory, directory, executable: join(directory, 'absent-cli'), scenario: { mode: 'implementation', budget: { timeoutMs: 1000, maximumImageCalls: 0 } } });
  assert.match(result.spawnError, /ENOENT/); assert.equal(result.processObservation.complete, false); assert.equal(result.completedTurn, false);
});

test('continuation requires explicit exact replacement and preserves all 66 original row identities', async () => {
  const schedule = await json(join(fixtureRoot, 'schedule.json')), cases = await json(join(fixtureRoot, 'scenarios.json'));
  const snapshot = { schedule, cases, plan: { continuation: { kind: 'one-complete-matched-infrastructure-replacement', replacementTrialIds: ['F01-r1-v31'], maximumRuns: 1, authority: 'Parent test fixture' }, preservedAttempt: { directory: '/tmp/retained-original' } } };
  assert.throws(() => continuationSchedule(snapshot, false), /declaration/);
  const selected = continuationSchedule(snapshot, true);
  assert.deepEqual(selected.map(row => row.trialId), schedule.map(row => row.trialId));
  assert.equal(selected.filter(row => row.attemptType === 'parent-authorized-infrastructure-replacement').length, 1);
  assert.equal(selected.filter(row => row.attemptType === 'first-attempt').length, 65);
  assert.equal(selected[0].replacesIncompleteEvidence, '/tmp/retained-original/F01-r1-v31');
  snapshot.plan.continuation.replacementTrialIds.push('F02-r1-v31'); assert.throws(() => continuationSchedule(snapshot, true), /exact parent-authorized/);
});

test('all model prompts are byte-identical to the prior authority-amended runner', async () => {
  const prior = await import(pathToFileURL(join(fixtureRoot, 'frozen-v2/frontend-adoption-trials.mjs')).href);
  const sources = await json(join(fixtureRoot, 'sources/index.json')), common = await json(join(fixtureRoot, 'common-scope.json'));
  for (const scenario of await json(join(fixtureRoot, 'scenarios.json'))) for (const variant of ['v31', 'v84']) {
    const args = { root: fixtureRoot, sources, common, scenario, variant, cwd: '/tmp/identical-trial-path', browserPaths: { browserPath: '/existing/browser', puppeteerPath: '/existing/module' } };
    assert.deepEqual(await buildPrompt(args), await prior.buildPrompt(args));
  }
});

test('independent reviewer sees incomplete process observation even when the CLI exits zero', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'qs-frontend-sampling-review-'));
  for (const folder of ['before', 'after']) await mkdir(join(directory, folder));
  for (const file of ['response.md', 'events.jsonl']) await writeFile(join(directory, file), 'Injected control evidence only.');
  const scenario = (await json(join(fixtureRoot, 'scenarios.json')))[0], common = await json(join(fixtureRoot, 'common-scope.json'));
  const telemetry = { exitCode: 0, completedTurn: true, toolItems: [], processObservation: { complete: false, cleanupErrors: [{ message: 'Injected cleanup observation error' }] }, observedOwnedResidualProcesses: [] };
  const path = await reviewerBundle({ root: fixtureRoot, directory, scenario, common, before: {}, after: {}, trialId: 'control-only', telemetry, browserStatus: 'unavailable' });
  const context = await json(join(path, 'context.json'));
  assert.equal(context.execution.exitCode, 0); assert.equal(context.execution.processObservation.complete, false);
  assert.equal(context.execution.processObservation.cleanupErrors[0].message, 'Injected cleanup observation error');
});
