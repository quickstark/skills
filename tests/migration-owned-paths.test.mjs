import test from 'node:test';
import assert from 'node:assert/strict';
import { chmod, mkdir, mkdtemp, readFile, readlink, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { captureMigrationPath } from '../scripts/migration-filesystem.mjs';
import { createOwnedPathAdapter, ownedPathState, ownedFileState } from '../scripts/migration-owned-paths.mjs';
import { runMigrationTransaction } from '../scripts/migration-transaction.mjs';

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'qs-owned-adapter-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const discovery = join(root, 'discovery'); await mkdir(discovery);
  await writeFile(join(discovery, 'unrelated.txt'), 'keep');
  const backupRoot = join(root, 'backups');
  return { root, discovery, backupRoot, adapter: createOwnedPathAdapter({ backupRoot, discoveryRoots: [discovery] }), context: { transactionId: 'fixture', ownerId: 'test' } };
}
async function descriptor(path, action, phase, after, id = 'effect') {
  const beforeSnapshot = await captureMigrationPath(path);
  return { id, phase, adapter: 'paths', operation: action.kind, ownedTargets: [{ path, ownershipRecord: 'fixture-bound-authority' }], before: ownedPathState(beforeSnapshot), after, pathAction: { ...action, beforeSnapshot } };
}

test('staging uses a complete source snapshot, preserves modes and keeps actual backup evidence', async (t) => {
  const f = await fixture(t), source = join(f.root, 'source'), target = join(f.root, 'staged');
  await mkdir(source); await mkdir(join(source, 'empty')); await writeFile(join(source, 'run'), 'payload'); await chmod(join(source, 'run'), 0o755);
  const sourceSnapshot = await captureMigrationPath(source);
  const step = await descriptor(target, { kind: 'copy', sourceSnapshot }, 'stage', ownedPathState(sourceSnapshot, target));
  const backup = await f.adapter.prepare(step, f.context);
  assert.deepEqual(await f.adapter.inspectBackup(step, backup.reference, f.context), backup.expectedState);
  await f.adapter.apply(step, f.context);
  assert.deepEqual(await f.adapter.inspect(step, f.context), step.after);
  await f.adapter.recover(step, backup.reference, f.context);
  assert.deepEqual(await f.adapter.inspect(step, f.context), step.before);
  assert.equal(await readFile(join(backup.reference, 'replaced/run'), 'utf8'), 'payload');
  assert.equal(await readFile(join(f.discovery, 'unrelated.txt'), 'utf8'), 'keep');
});

test('owned directory and literal link withdrawal round-trip original identities without deleting their contents', async (t) => {
  for (const kind of ['directory', 'symlink']) {
    const f = await fixture(t), target = join(f.discovery, 'legacy');
    if (kind === 'directory') { await mkdir(target); await mkdir(join(target, '.git')); await writeFile(join(target, '.git/config'), 'owned content'); }
    else await symlink('/unrelated/not-followed', target);
    const step = await descriptor(target, { kind: 'retire' }, 'withdraw', { kind: 'absent', path: target });
    const backup = await f.adapter.prepare(step, f.context);
    await f.adapter.apply(step, f.context);
    assert.deepEqual(await f.adapter.inspect(step, f.context), step.after);
    await f.adapter.recover(step, backup.reference, f.context);
    const restored = await captureMigrationPath(target);
    assert.deepEqual(restored.identity, step.pathAction.beforeSnapshot.identity);
    assert.equal(restored.contentSha256, step.before.contentSha256);
    if (kind === 'symlink') assert.equal(await readlink(target), '/unrelated/not-followed');
    else assert.equal(await readFile(join(target, '.git/config'), 'utf8'), 'owned content');
  }
});

test('state publication binds exact contents/mode and recovery preserves the original file identity', async (t) => {
  for (const existed of [false, true]) {
    const f = await fixture(t), target = join(f.discovery, 'selection.json');
    if (existed) await writeFile(target, '{"old":true}', { mode: 0o640 });
    const contents = '{"selected":["qs-skills"]}\n';
    const step = await descriptor(target, { kind: 'write-state', contents, mode: 0o600 }, 'state', ownedFileState(target, contents, 0o600));
    // Coordinator canonical JSON sorts keys; key order is not state identity.
    step.before = Object.fromEntries(Object.entries(step.before).sort());
    step.after = Object.fromEntries(Object.entries(step.after).sort());
    const backup = await f.adapter.prepare(step, f.context);
    await f.adapter.apply(step, f.context);
    assert.equal(await readFile(target, 'utf8'), contents);
    assert.equal((await f.adapter.inspect(step, f.context)).contentSha256, step.after.contentSha256);
    await f.adapter.recover(step, backup.reference, f.context);
    const restored = await captureMigrationPath(target);
    assert.equal(restored.kind, step.before.kind);
    if (existed) assert.deepEqual(restored.identity, step.pathAction.beforeSnapshot.identity);
  }
});

test('changed source, target and backup fail without replacing unrelated state', async (t) => {
  const f = await fixture(t), source = join(f.root, 'source'), target = join(f.root, 'staged');
  await writeFile(source, 'original');
  const sourceSnapshot = await captureMigrationPath(source);
  const step = await descriptor(target, { kind: 'copy', sourceSnapshot }, 'stage', ownedPathState(sourceSnapshot, target));
  const backup = await f.adapter.prepare(step, f.context);
  await writeFile(source, 'changed');
  await assert.rejects(f.adapter.apply(step, f.context), /changed after planning/);
  assert.equal((await f.adapter.inspect(step, f.context)).kind, 'absent');
  await writeFile(target, 'new local edit');
  await assert.rejects(f.adapter.apply(step, f.context), /changed after planning/);
  assert.equal(await readFile(target, 'utf8'), 'new local edit');
  await writeFile(join(backup.reference, 'before'), 'unrelated backup');
  await assert.rejects(f.adapter.inspectBackup(step, backup.reference, f.context), /Backup payload differs/);
  await assert.rejects(f.adapter.recover(step, backup.reference, f.context), /Backup payload differs/);
  assert.equal(await readFile(target, 'utf8'), 'new local edit');
});

test('invalid source identity, phase, content binding or backup location is rejected before effects', async (t) => {
  const f = await fixture(t), target = join(f.discovery, 'state');
  const step = await descriptor(target, { kind: 'write-state', contents: 'expected', mode: 0o600 }, 'state', ownedFileState(target, 'expected'));
  await assert.rejects(f.adapter.prepare({ ...step, phase: 'expose' }, f.context), /does not match/);
  await assert.rejects(f.adapter.prepare({ ...step, pathAction: { ...step.pathAction, contents: 'different' } }, f.context), /must match after-state/);
  await assert.rejects(f.adapter.prepare({ ...step, ownedTargets: [{ path: target, ownershipRecord: '' }] }, f.context), /proven-owned/);
  assert.throws(() => createOwnedPathAdapter({ backupRoot: join(f.discovery, 'backup'), discoveryRoots: [f.discovery] }), /outside discovery/);
  assert.deepEqual(await readdir(f.discovery), ['unrelated.txt']);
});

test('changed quarantine blocks recovery before withdrawing the usable replacement', async (t) => {
  const f = await fixture(t), target = join(f.discovery, 'selection.json');
  await writeFile(target, 'old');
  const step = await descriptor(target, { kind: 'write-state', contents: 'new', mode: 0o600 }, 'state', ownedFileState(target, 'new'));
  const backup = await f.adapter.prepare(step, f.context);
  await f.adapter.apply(step, f.context);
  await writeFile(join(backup.reference, 'retired'), 'concurrent old-state edit');
  await assert.rejects(f.adapter.recover(step, backup.reference, f.context), /quarantined object is missing or changed/);
  assert.equal(await readFile(target, 'utf8'), 'new');
  assert.equal(await readFile(join(backup.reference, 'retired'), 'utf8'), 'concurrent old-state edit');
});

test('a matching prepared state survives interruption before publication; a different one is retained and refused', async (t) => {
  const f = await fixture(t), target = join(f.discovery, 'selection.json');
  await writeFile(target, 'old');
  const step = await descriptor(target, { kind: 'write-state', contents: 'new', mode: 0o600 }, 'state', ownedFileState(target, 'new'));
  const backup = await f.adapter.prepare(step, f.context);
  await writeFile(join(backup.reference, 'next'), 'wrong', { mode: 0o600 });
  await assert.rejects(f.adapter.apply(step, f.context), /Prepared state content changed/);
  assert.equal(await readFile(target, 'utf8'), 'old');
  await writeFile(join(backup.reference, 'next'), 'new');
  await f.adapter.apply(step, f.context);
  assert.equal(await readFile(target, 'utf8'), 'new');
});

test('coordinator composes owned phases and resumes a completed withdrawal without repeating it', async (t) => {
  const f = await fixture(t), staging = join(f.root, 'staging'); await mkdir(staging);
  const source = join(f.root, 'source'); await writeFile(source, 'new payload');
  const legacy = join(f.discovery, 'legacy'); await writeFile(legacy, 'old payload');
  const lock = join(f.discovery, 'lock.json'); await writeFile(lock, 'old lock');
  const selection = join(f.discovery, 'selection.json'); await writeFile(selection, 'old selection');
  const sourceSnapshot = await captureMigrationPath(source), staged = join(staging, 'payload');
  const stage = await descriptor(staged, { kind: 'copy', sourceSnapshot }, 'stage', ownedPathState(sourceSnapshot, staged), 'stage');
  const withdraw = await descriptor(legacy, { kind: 'retire' }, 'withdraw', { kind: 'absent', path: legacy }, 'withdraw');
  const retire = await descriptor(lock, { kind: 'write-state', contents: 'new lock', mode: 0o600 }, 'retire', ownedFileState(lock, 'new lock'), 'retire');
  const state = await descriptor(selection, { kind: 'write-state', contents: 'new selection', mode: 0o600 }, 'state', ownedFileState(selection, 'new selection'), 'state');
  // The native adapter has its own real-host tests. This actual registration file
  // exercises the shared state interface without requiring host tools here.
  const registration = join(f.discovery, 'registration');
  const expose = { id: 'expose', phase: 'expose', adapter: 'registration', operation: 'fixture-register', ownedTargets: [{ path: registration, ownershipRecord: 'fixture' }], before: { kind: 'absent', path: registration }, after: ownedFileState(registration, 'registered') };
  const registrationAdapter = {
    inspect: async () => ownedPathState(await captureMigrationPath(registration)),
    prepare: async () => ({ reference: 'fixture-absence', expectedState: { kind: 'absent', path: registration } }),
    inspectBackup: async () => ({ kind: 'absent', path: registration }),
    apply: async () => { await writeFile(registration, 'registered', { flag: 'wx', mode: 0o600 }); },
    recover: async () => { await rm(registration); },
  };
  let withdrawals = 0;
  const paths = { ...f.adapter, apply: async (step, context) => {
    await f.adapter.apply(step, context);
    if (step.id === 'withdraw' && ++withdrawals === 1) throw new Error('interruption after owned withdrawal');
  } };
  const input = { journalPath: join(f.root, 'journal/transaction.jsonl'), ownerId: 'fixture', adapters: { paths, registration: registrationAdapter }, plan: { schemaVersion: 1, id: 'owned-phases', revision: 'a'.repeat(40), evidenceHash: 'b'.repeat(64), ownedRoots: [f.root], discoveryRoots: [f.discovery], stagingRoots: [staging], steps: [stage, withdraw, expose, retire, state] } };
  assert.equal((await runMigrationTransaction(input)).status, 'failed');
  assert.equal((await runMigrationTransaction(input)).status, 'complete');
  assert.equal(withdrawals, 1);
  assert.equal(await readFile(selection, 'utf8'), 'new selection');
  const recovered = await runMigrationTransaction({ ...input, mode: 'recover', recoveryAuthority: { source: 'isolated-fixture', transactionId: 'owned-phases', operation: 'restore-journaled-owned-effects' } });
  assert.equal(recovered.status, 'rolled-back');
  assert.equal(await readFile(selection, 'utf8'), 'old selection');
  assert.equal(await readFile(legacy, 'utf8'), 'old payload');
  assert.equal(await readFile(lock, 'utf8'), 'old lock');
  assert.equal(await readFile(join(f.discovery, 'unrelated.txt'), 'utf8'), 'keep');
});
