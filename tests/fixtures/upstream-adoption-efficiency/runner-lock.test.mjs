import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { acquireComparisonLock } from '../../../scripts/skill-efficiency-trials.mjs';

test('existing comparison lock fails closed for a PID invisible in this namespace', async () => {
  const root = await mkdtemp(join(tmpdir(), 'qs-lock-negative-'));
  try {
    const lock = join(root, '.runner-lock');
    await mkdir(lock);
    const owner = JSON.stringify({ pid: 2147483647, start: 'foreign-namespace:recorded-start', pidNamespace: 'pid:[foreign]', runnerSHA256: 'frozen' });
    await writeFile(join(lock, 'owner.json'), owner);
    await assert.rejects(acquireComparisonLock(lock, 'new'), /already exists.*verified operator recovery/);
    assert.equal(await readFile(join(lock, 'owner.json'), 'utf8'), owner);
    assert.deepEqual(await readdir(root), ['.runner-lock']);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('incomplete lock also fails closed without creating an owner', async () => {
  const root = await mkdtemp(join(tmpdir(), 'qs-lock-incomplete-'));
  try {
    const lock = join(root, '.runner-lock');
    await mkdir(lock);
    await assert.rejects(acquireComparisonLock(lock, 'new'), /already exists/);
    assert.deepEqual(await readdir(lock), []);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('new isolated lock records namespace availability and cannot be acquired twice', async () => {
  const root = await mkdtemp(join(tmpdir(), 'qs-lock-new-'));
  try {
    const lock = join(root, '.runner-lock');
    await acquireComparisonLock(lock, 'test-runner');
    const owner = JSON.parse(await readFile(join(lock, 'owner.json'), 'utf8'));
    assert.equal(owner.pid, process.pid);
    if (process.platform === 'linux') assert.match(owner.pidNamespace, /^pid:\[\d+\]$/);
    else assert.equal(owner.pidNamespace, null, 'unsupported namespace observation is not invented');
    assert.equal(owner.runnerSHA256, 'test-runner');
    await assert.rejects(acquireComparisonLock(lock, 'duplicate'), /already exists/);
  } finally { await rm(root, { recursive: true, force: true }); }
});
