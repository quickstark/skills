import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { assertControls, signalExactProcess, captureSucceeded } from './support.mjs';
import { verifyBindings, verifyExactTree } from './verify.mjs';
import { captureWithAfterState } from '../adoption-video-routing/amendments/proof-launch-support.mjs';
import { manifest, sha } from '../../../scripts/frontend-adoption-trials.mjs';
const controls = { model: 'synthetic', model_reasoning_effort: 'high', sandbox_mode: 'workspace-write', approval_policy: 'on-request', approvals_reviewer: 'auto_review' };
async function fixture(t) { const p = await mkdtemp(join(tmpdir(), 'qs-video-native-prep-test-')); t.after(() => rm(p, { recursive: true, force: true })); return p; }
test('all five controls required and each drift rejected without a capture', () => {
  assert.deepEqual(assertControls(controls, { ...controls }), controls);
  for (const key of Object.keys(controls)) assert.throws(() => assertControls(controls, { ...controls, [key]: 'changed' }), /changed/);
  const partial = { ...controls }; delete partial.approvals_reviewer;
  assert.throws(() => assertControls(partial, controls), /five fields/);
});
test('identity-scoped interruption refuses stale/missing identities and protected PIDs', () => {
  const signals = [], deps = { identity: () => 'current', kill: (...a) => signals.push(a) };
  for (const record of [null, { pid: 1, identity: 'current' }, { pid: 99, identity: 'old' }, { pid: 99 }]) assert.equal(signalExactProcess(record, 'SIGTERM', deps), false);
  assert.deepEqual(signals, []);
  assert.equal(signalExactProcess({ pid: 99, identity: 'current' }, 'SIGTERM', deps), true);
  assert.deepEqual(signals, [[-99, 'SIGTERM']]);
});
test('digest drift and absent bound input fail closed', async t => {
  const p = await fixture(t); await writeFile(join(p, 'bound'), 'original');
  await verifyBindings({ bound: sha('original') }, p);
  await writeFile(join(p, 'bound'), 'changed');
  await assert.rejects(verifyBindings({ bound: sha('original') }, p), /Bound bytes changed/);
  await assert.rejects(verifyBindings({ absent: sha('original') }, p));
});
test('unbound additional input cannot silently enter a copied guidance tree', async t => {
  const p = await fixture(t); await writeFile(join(p, 'bound'), 'original');
  await verifyExactTree(p, ['bound']);
  await writeFile(join(p, 'extra'), 'unreviewed');
  await assert.rejects(verifyExactTree(p, ['bound']), /membership changed/);
});
for (const failure of [false, true]) test(`synthetic ${failure ? 'failure' : 'completion'} preserves before and after evidence`, async t => {
  const p = await fixture(t), cwd = join(p, 'work'), directory = join(p, 'capture'); await mkdir(cwd); await mkdir(directory);
  await writeFile(join(cwd, 'input'), 'original');
  const before = await manifest(cwd);
  const result = await captureWithAfterState({ cwd, directory, manifest, capture: async () => {
    await writeFile(join(directory, 'before-binding.json'), JSON.stringify(before));
    await writeFile(join(cwd, 'partial-output'), 'retained actual synthetic bytes');
    if (failure) throw new Error('synthetic preparation/capture failure');
    return { exitCode: 0 };
  } });
  assert.equal(await readFile(join(directory, 'after/partial-output'), 'utf8'), 'retained actual synthetic bytes');
  assert.deepEqual(JSON.parse(await readFile(join(directory, 'after-binding.json'))), await manifest(cwd));
  assert.equal(Boolean(result.captureError), failure);
  assert.deepEqual(JSON.parse(await readFile(join(directory, 'before-binding.json'))), before);
});
test('snapshot error retains original failure and independently records manifest', async t => {
  const p = await fixture(t), cwd = join(p, 'work'), directory = join(p, 'capture'); await mkdir(cwd); await mkdir(directory); await writeFile(join(directory, 'after'), 'occupied');
  const result = await captureWithAfterState({ cwd, directory, manifest, capture: async () => { throw new Error('original synthetic failure'); } });
  assert.match(result.captureError, /original synthetic failure/); assert.equal(result.snapshotErrors[0].step, 'copy-after');
  assert.deepEqual(JSON.parse(await readFile(join(directory, 'after-binding.json'))), {});
});
test('completed model turn cannot mask incomplete native stream, residuals or interruption', () => {
  const t = { exitCode: 0, completedTurn: true, responsePresent: true, nativeStreamComplete: true, timedOut: false, stopReason: null, protocolErrors: [], processObservation: { complete: true }, observedOwnedResidualProcesses: [] };
  const result = telemetry => ({ telemetry, captureError: null, snapshotErrors: [] });
  assert.equal(captureSucceeded(result(t), null), true);
  for (const patch of [{ nativeStreamComplete: false }, { observedOwnedResidualProcesses: [{}] }, { protocolErrors: ['gap'] }, { stopReason: 'incomplete' }, { completedTurn: false }, { processObservation: { complete: false } }]) assert.equal(Boolean(captureSucceeded(result({ ...t, ...patch }), null)), false);
  assert.equal(captureSucceeded(result(t), 'SIGINT'), false);
});
