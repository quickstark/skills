import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { cp, mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { copyTransitionPayloads, readTransitionPackages, verifyTransitionPayloads } from '../scripts/skill-transition-packages.mjs';
import { captureMigrationPath } from '../scripts/migration-filesystem.mjs';
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
