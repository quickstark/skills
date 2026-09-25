import test from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdtemp, mkdir, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TARGET_COLLECTION_REGISTRY, TARGET_PUBLIC_COMMANDS, TARGET_SKILL_COLLECTIONS, validateSkillCollectionRegistryModel } from '../scripts/skill-collection-registry.mjs';

const run = promisify(execFile);
const repository = fileURLToPath(new URL('..', import.meta.url));
const source = (skill) => join(repository, skill.sourcePath ?? `skills/${skill.bucket}/${skill.name}`);
const projector = join(repository, 'scripts/sync-codex-plugin.mjs');
const json = async (path) => JSON.parse(await readFile(path, 'utf8'));
async function temporary(t) {
  const base = await mkdtemp(join(tmpdir(), 'qs-projection-test-'));
  t.after(() => rm(base, { recursive: true, force: true }));
  return base;
}
const invoke = (output, args = [], script = projector) => run(process.execPath, [script, '--candidate', '--output-root', output, ...args], { maxBuffer: 1024 * 1024 });
async function files(root) {
  const result = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    if (entry.isDirectory()) result.push(...(await files(join(root, entry.name))).map((file) => `${entry.name}/${file}`));
    else result.push(entry.name);
  }
  return result.sort();
}

test('target registry owns exactly the specified six collections and rejects missing, duplicate and misowned commands', () => {
  assert.deepEqual(TARGET_SKILL_COLLECTIONS.map((item) => [item.id, item.publicCommands.length]), [
    ['qs-skills', 12], ['qs-specialists', 8], ['qs-advanced', 12], ['qs-frontend', 4], ['qs-video', 1], ['qs-execution', 1],
  ]);
  assert.equal(TARGET_PUBLIC_COMMANDS.length, 38);
  for (const mutate of [
    (model) => model.publicCommands.pop(),
    (model) => model.publicCommands.push(model.publicCommands[0]),
    (model) => { model.publicCommands[0].collectionId = 'qs-video'; },
    (model) => { model.publicCommands[0].name = 'qs-unregistered'; },
  ]) {
    const model = structuredClone(TARGET_COLLECTION_REGISTRY); mutate(model);
    assert.throws(() => validateSkillCollectionRegistryModel(model, { target: true }));
  }
});

test('isolated projections expose only public roots, preserve private dependencies and detect tampering on all hosts', async (t) => {
  const output = join(await temporary(t), 'candidate');
  await invoke(output);
  await invoke(output, ['--check']);
  const version = (await json(join(repository, 'package.json'))).version;
  for (const collection of TARGET_SKILL_COLLECTIONS) {
    for (const [format, path] of [['codex', 'codex/plugins'], ['claude', 'packages'], ['pi', 'pi/packages']]) {
      const root = join(output, path, collection.id);
      const actual = (await files(root)).filter((file) => file.endsWith('/SKILL.md'));
      assert.deepEqual(actual, collection.publicCommands.map((name) => `skills/${name}/SKILL.md`).sort());
      const manifest = await json(join(root, format === 'pi' ? 'package.json' : `.${format}-plugin/plugin.json`));
      assert.equal(manifest.version, version);
      for (const name of collection.publicCommands) {
        const skill = TARGET_PUBLIC_COMMANDS.find((item) => item.name === name);
        const body = await readFile(join(root, 'skills', name, 'SKILL.md'), 'utf8');
        const metadata = await readFile(join(root, 'skills', name, 'agents/openai.yaml'), 'utf8');
        assert.match(body, new RegExp(`^name: ${name}$`, 'm'));
        assert.ok(metadata.includes(`$${collection.id}:${name}`), `${format}/${name} must use the exact package literal`);
        const canonical = await readFile(join(source(skill), 'SKILL.md'), 'utf8');
        if (format === 'codex') {
          assert.doesNotMatch(body, /^disable-model-invocation:/m);
          assert.doesNotMatch(metadata, /allow_implicit_invocation:/);
        } else {
          assert.equal(/^disable-model-invocation: true$/m.test(body), /^disable-model-invocation: true$/m.test(canonical));
        }
      }
      if (format !== 'pi') {
        const imported = await run(process.execPath, ['--input-type=module', '-e', 'const m=await import(process.argv[1]); console.log(m.PUBLIC_COMMANDS.length); console.log(m.codexPublicSkillLiteral("qs-visual-parity"));', join(root, 'scripts/skill-collection-registry.mjs')]);
        assert.equal(imported.stdout.trim(), '38\n$qs-advanced:qs-visual-parity');
      }
      if (collection.id === 'qs-frontend') {
        const body = await readFile(join(root, 'skills/qs-design-image-web/SKILL.md'), 'utf8');
        assert.ok(body.includes('../../capabilities/frontend/internal/'));
        const privateFile = join(root, 'capabilities/frontend/internal/prompt-construction.md');
        const before = await readFile(privateFile);
        await writeFile(privateFile, 'changed private behavior');
        await assert.rejects(invoke(output, ['--check', '--package', collection.id, '--format', format, '--root', root]), /stale private content/);
        await writeFile(privateFile, before);
        const hidden = join(root, 'capabilities/frontend/SKILL.md');
        await writeFile(hidden, 'unintended public command');
        await assert.rejects(invoke(output, ['--check', '--package', collection.id, '--format', format, '--root', root]), /invalid internal-capability projection/);
        await rm(hidden);
      }
      if (collection.id === 'qs-video') {
        const verified = await run(process.execPath, [join(root, 'skills/qs-video/scripts/verify-closure.mjs')]);
        assert.match(verified.stdout, /21/);
      }
    }
  }
  await assert.rejects(invoke(output), /existing evidence is never overwritten/);
});

test('candidate output refuses discovery paths and linked ancestors before writing', async (t) => {
  const base = await temporary(t);
  await assert.rejects(invoke(join(base, '.agents/skills')), /outside source and discovery/);
  const actual = join(base, 'actual'); await mkdir(actual);
  const linked = join(base, 'linked'); await symlink(actual, linked);
  await assert.rejects(invoke(join(linked, 'candidate')), /linked\/non-directory ancestor/);
  assert.deepEqual(await readdir(actual), []);
});

test('a linked canonical root cannot cause Codex formatting to mutate source bytes', async (t) => {
  const base = await temporary(t), fixture = join(base, 'fixture');
  await mkdir(fixture);
  await cp(join(repository, 'scripts'), join(fixture, 'scripts'), { recursive: true });
  await cp(join(repository, 'package.json'), join(fixture, 'package.json'));
  const skill = TARGET_PUBLIC_COMMANDS[0];
  const external = join(base, 'external-skill'); await cp(source(skill), external, { recursive: true });
  const before = await readFile(join(external, 'SKILL.md'));
  const canonical = join(fixture, skill.sourcePath ?? `skills/${skill.bucket}/${skill.name}`);
  await mkdir(dirname(canonical), { recursive: true }); await symlink(external, canonical);
  await assert.rejects(invoke(join(base, 'candidate'), [], join(fixture, 'scripts/sync-codex-plugin.mjs')), /real directory, not a symlink/);
  assert.deepEqual(await readFile(join(external, 'SKILL.md')), before);
});

test('a linked private source tree is rejected instead of silently copied', async (t) => {
  const base = await temporary(t), fixture = join(base, 'fixture');
  await mkdir(fixture);
  await cp(join(repository, 'scripts'), join(fixture, 'scripts'), { recursive: true });
  await cp(join(repository, 'package.json'), join(fixture, 'package.json'));
  for (const skill of TARGET_PUBLIC_COMMANDS.filter((item) => ['qs-skills', 'qs-specialists', 'qs-advanced'].includes(item.collectionId))) {
    const target = join(fixture, skill.sourcePath ?? `skills/${skill.bucket}/${skill.name}`);
    await mkdir(dirname(target), { recursive: true }); await cp(source(skill), target, { recursive: true });
  }
  await cp(join(repository, 'skills/internal'), join(fixture, 'skills/internal'), { recursive: true });
  const external = join(base, 'external-private');
  await cp(join(repository, 'skills/advanced'), external, { recursive: true });
  const before = await readFile(join(external, 'THIRD_PARTY_NOTICES.md'));
  await symlink(external, join(fixture, 'skills/advanced'));
  await assert.rejects(invoke(join(base, 'candidate'), [], join(fixture, 'scripts/sync-codex-plugin.mjs')), /real directory, not a symlink/);
  assert.deepEqual(await readFile(join(external, 'THIRD_PARTY_NOTICES.md')), before);
});
