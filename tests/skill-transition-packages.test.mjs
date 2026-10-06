import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { cp, mkdtemp, mkdir, readFile, writeFile, rm, chmod } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { copyTransitionPayloads, readTransitionPackages, verifyTransitionPayloads } from '../scripts/skill-transition-packages.mjs';
import { captureMigrationPath, revalidateMigrationPath } from '../scripts/migration-filesystem.mjs';
import { runNativePackageCommand } from '../scripts/migration-native-packages.mjs';
import { TARGET_SKILL_COLLECTIONS } from '../scripts/skill-collection-registry.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const temporary = async (t) => { const dir = await mkdtemp(path.join(tmpdir(), 'qs-transition-')); t.after(() => rm(dir, { recursive: true, force: true })); return dir; };

test('retained projection copies preserve all three historical payloads outside target membership', async (t) => {
  const target = await temporary(t); await mkdir(path.join(target, 'config'));
  await cp(path.join(root, 'config/skill-transition-packages.json'), path.join(target, 'config/skill-transition-packages.json'));
  await copyTransitionPayloads(root, target);
  const packages = await verifyTransitionPayloads(target);
  assert.deepEqual(packages.map((pkg) => pkg.id), ['ps-skills']);
  assert.equal(TARGET_SKILL_COLLECTIONS.some((pkg) => pkg.id === 'ps-skills'), false);
  await assert.rejects(copyTransitionPayloads(root, target), /exists|EEXIST/);
  await assert.rejects(copyTransitionPayloads(root, root), /Never overwrite/);
});

test('changed, missing and unrecognized retained payloads fail without overwriting the prior state', async (t) => {
  const target = await temporary(t); await mkdir(path.join(target, 'config'));
  const file = path.join(target, 'config/skill-transition-packages.json'); await cp(path.join(root, 'config/skill-transition-packages.json'), file);
  await copyTransitionPayloads(root, target);
  const changed = path.join(target, 'pi/packages/ps-skills/skills/ps-help/SKILL.md');
  await writeFile(changed, 'local modification');
  await assert.rejects(verifyTransitionPayloads(target), /legacy payload changed/);
  assert.equal(await readFile(changed, 'utf8'), 'local modification');
  await rm(changed); await assert.rejects(verifyTransitionPayloads(target), /legacy payload changed/);
  const doc = JSON.parse(await readFile(file)); doc.packages[0].id = 'unrelated'; await writeFile(file, JSON.stringify(doc));
  await assert.rejects(readTransitionPackages(target), /Unknown legacy/);
});

async function copiedFixture(t) {
  const target = await temporary(t); await mkdir(path.join(target, 'config'));
  const file = path.join(target, 'config/skill-transition-packages.json');
  await cp(path.join(root, 'config/skill-transition-packages.json'), file);
  await copyTransitionPayloads(root, target);
  return { target, file, document: JSON.parse(await readFile(file)) };
}

async function setModes(directory, directoryMode, fileMode) {
  const snapshot = await captureMigrationPath(directory);
  for (const entry of snapshot.entries) await chmod(path.join(directory, entry.path), entry.kind === 'directory' ? directoryMode : fileMode);
}

const sha = (value) => createHash('sha256').update(value).digest('hex');

test('checkout digests retain the exact historical full-mode and portable identities for every host', async () => {
  const [pkg] = await readTransitionPackages(root);
  for (const payload of Object.values(pkg.payloads)) {
    const snapshot = await captureMigrationPath(path.join(root, payload.path));
    // Independently reconstruct the recorded transition snapshot, not a new
    // baseline silently replacing it. The original files were all non-executable.
    const historical = snapshot.entries.map(entry => ({ ...entry, mode: entry.kind === 'directory' ? 0o775 : 0o664 }));
    assert.equal(sha(JSON.stringify(historical)), payload.contentSha256);
    const portable = snapshot.entries.map(entry => ({ ...entry, mode: entry.kind === 'directory' ? 0o755 : 0o644 }));
    assert.equal(sha(JSON.stringify(portable)), payload.checkoutDigest.value);
  }
  await verifyTransitionPayloads(root);
});

test('755/644 and 775/664 retained checkouts verify but permission changes invalidate local snapshots', async (t) => {
  const { target, document } = await copiedFixture(t);
  for (const payload of Object.values(document.packages[0].payloads)) await setModes(path.join(target, payload.path), 0o755, 0o644);
  await verifyTransitionPayloads(target);
  const snapshots = await Promise.all(Object.values(document.packages[0].payloads).map(payload => captureMigrationPath(path.join(target, payload.path))));
  for (const payload of Object.values(document.packages[0].payloads)) await setModes(path.join(target, payload.path), 0o775, 0o664);
  await verifyTransitionPayloads(target);
  for (const snapshot of snapshots) await assert.rejects(revalidateMigrationPath(snapshot), /changed after planning/);
  const destination = await temporary(t);
  await copyTransitionPayloads(target, destination);
  await verifyTransitionPayloads(target, destination);
});

test('retained identity rejects executable changes and added hidden files or empty directories for every host', async (t) => {
  const { target, document } = await copiedFixture(t);
  for (const payload of Object.values(document.packages[0].payloads)) {
    const directory = path.join(target, payload.path);
    const snapshot = await captureMigrationPath(directory);
    const entry = snapshot.entries.find(entry => entry.kind === 'file');
    const file = path.join(directory, entry.path);
    await chmod(file, entry.mode | 0o100);
    await assert.rejects(verifyTransitionPayloads(target), /legacy payload changed/);
    await chmod(file, entry.mode);
    for (const kind of ['file', 'directory']) {
      const extra = path.join(directory, '.extra');
      if (kind === 'file') await writeFile(extra, 'unrecorded'); else await mkdir(extra);
      await assert.rejects(verifyTransitionPayloads(target), /legacy payload changed/);
      await rm(extra, { recursive: true });
    }
  }
  await verifyTransitionPayloads(target);
});

test('transition schema versions fail closed and schema 1 retains full-mode semantics', async (t) => {
  const { target, file, document } = await copiedFixture(t);
  for (const schemaVersion of [0, 3]) {
    await writeFile(file, JSON.stringify({ ...document, schemaVersion }));
    await assert.rejects(readTransitionPackages(target), /inventory required/);
  }
  for (const digest of [undefined, { kind: 'ignore-modes', value: 'a'.repeat(64) }, { kind: 'git-content-and-executable-bits-sha256', value: 'bad' }]) {
    const changed = structuredClone(document); changed.packages[0].payloads.codex.checkoutDigest = digest;
    await writeFile(file, JSON.stringify(changed));
    await assert.rejects(readTransitionPackages(target), /checkout digest required/);
  }
  document.schemaVersion = 1;
  await writeFile(file, JSON.stringify(document));
  await assert.rejects(readTransitionPackages(target), /requires transition schema 2/);
  for (const payload of Object.values(document.packages[0].payloads)) {
    delete payload.checkoutDigest;
    await setModes(path.join(target, payload.path), 0o775, 0o664);
  }
  await writeFile(file, JSON.stringify(document));
  await verifyTransitionPayloads(target);
  await setModes(path.join(target, document.packages[0].payloads.codex.path), 0o755, 0o644);
  await assert.rejects(verifyTransitionPayloads(target), /legacy payload changed/);
});

const codexAvailable = (process.env.PATH ?? '').split(path.delimiter).some((dir) => existsSync(path.join(dir, 'codex')));
test('actual isolated Codex hides a retained installed cache when its marketplace entry is removed', { skip: !codexAvailable ? 'Codex unavailable on this test host.' : false }, async (t) => {
  const base = await temporary(t), homeDirectory = path.join(base, 'home'), market = path.join(base, 'market');
  await mkdir(path.join(homeDirectory, '.codex'), { recursive: true });
  await mkdir(path.join(market, '.agents/plugins'), { recursive: true });
  await cp(path.join(root, 'codex/plugins/ps-skills'), path.join(market, 'ps-skills'), { recursive: true });
  const manifest = path.join(market, '.agents/plugins/marketplace.json');
  const definition = { name: 'qs-transition-fixture', plugins: [{ name: 'ps-skills', source: { source: 'local', path: './ps-skills' } }] };
  await writeFile(manifest, JSON.stringify(definition));
  const run = (args) => runNativePackageCommand('codex', args, { homeDirectory, cwd: base });
  await run(['plugin', 'marketplace', 'add', market]); await run(['plugin', 'add', 'ps-skills@qs-transition-fixture', '--json']);
  const cache = path.join(homeDirectory, '.codex/plugins/cache/qs-transition-fixture/ps-skills/3.8.0');
  const before = await captureMigrationPath(cache);
  assert.equal(JSON.parse((await run(['plugin', 'list', '--json'])).stdout).installed.length, 1);
  await writeFile(manifest, JSON.stringify({ ...definition, plugins: [] }));
  assert.equal(JSON.parse((await run(['plugin', 'list', '--json'])).stdout).installed.length, 0);
  assert.equal((await captureMigrationPath(cache)).contentSha256, before.contentSha256);
  await writeFile(manifest, JSON.stringify(definition));
  assert.equal(JSON.parse((await run(['plugin', 'list', '--json'])).stdout).installed.length, 1);
});
