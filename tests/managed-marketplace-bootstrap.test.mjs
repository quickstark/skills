import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { appendFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { promisify } from 'node:util';

import { bootstrapManagedMarketplaces } from '../scripts/managed-marketplace-bootstrap.mjs';

const exec = promisify(execFile);
const hosts = ['codex', 'claude-code'];

async function write(file, contents) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, contents);
}

async function fixture(t) {
  const base = await mkdtemp(path.join(tmpdir(), 'qs-marketplace-bootstrap-'));
  t.after(() => rm(base, { recursive: true, force: true }));
  const repositoryRoot = path.join(base, 'repository');
  const homeDirectory = path.join(base, 'home');
  const homes = {
    homeDirectory,
    codexHomeDirectory: path.join(homeDirectory, '.codex'),
    claudeHomeDirectory: path.join(homeDirectory, '.claude'),
    piHomeDirectory: path.join(homeDirectory, '.pi/agent'),
  };
  const roots = { codex: path.join(repositoryRoot, 'codex'), 'claude-code': repositoryRoot };
  const config = {
    codex: path.join(homes.codexHomeDirectory, 'config.toml'),
    'claude-code': path.join(homes.claudeHomeDirectory, 'settings.json'),
  };
  const definitions = {
    codex: path.join(roots.codex, '.agents/plugins/marketplace.json'),
    'claude-code': path.join(repositoryRoot, '.claude-plugin/marketplace.json'),
  };
  const sources = {
    codex: path.join(repositoryRoot, 'codex/plugins/qs-skills/SKILL.md'),
    'claude-code': path.join(repositoryRoot, 'packages/qs-skills/SKILL.md'),
  };
  await write(definitions.codex, JSON.stringify({ name: 'quickstark', plugins: [{ name: 'qs-skills', source: { source: 'local', path: './plugins/qs-skills' } }] }));
  await write(definitions['claude-code'], JSON.stringify({ name: 'quickstark', plugins: [{ name: 'qs-skills', source: './packages/qs-skills' }] }));
  for (const source of Object.values(sources)) await write(source, 'Fixture package source.\n');
  await write(config.codex, 'model = "unrelated-preserved"\n');
  await write(config['claude-code'], '{"enabledPlugins":{"community@elsewhere":true}}\n');
  const git = async (...args) => (await exec('git', ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', '-c', 'commit.gpgsign=false', '-c', 'core.hooksPath=/dev/null', ...args], { cwd: repositoryRoot, encoding: 'utf8' })).stdout;
  await git('init', '--quiet');
  await git('add', '.');
  await git('commit', '--quiet', '-m', 'Committed marketplace fixture');
  const registration = (host, root = roots[host]) => host === 'codex'
    ? { name: 'quickstark', root, marketplaceSource: { sourceType: 'local', source: root } }
    : { name: 'quickstark', source: 'directory', path: root, installLocation: root };
  const marketplaces = Object.fromEntries(hosts.map(host => [host, []]));
  const installed = Object.fromEntries(hosts.map(host => [host, []]));
  const calls = [];
  const hooks = {};
  const runCommand = async (command, args, options) => {
    const host = options.host;
    assert.ok(hosts.includes(host), 'Pi must not receive marketplace commands');
    assert.equal(options.homeDirectory, homeDirectory);
    assert.equal(options.cwd, repositoryRoot);
    calls.push({ host, command, args: [...args] });
    await hooks.beforeCommand?.({ host, command, args, options });
    if (args[1] === 'marketplace' && args[2] === 'list') {
      return { stdout: JSON.stringify(host === 'codex' ? { marketplaces: marketplaces[host] } : marketplaces[host]) };
    }
    if (args[1] === 'list') return { stdout: JSON.stringify(host === 'codex' ? { installed: installed[host] } : installed[host]) };
    if (args[1] === 'marketplace' && args[2] === 'add') {
      assert.equal(args[3], roots[host]);
      marketplaces[host].push(registration(host));
      await hooks.afterAdd?.({ host, command, args, options });
      return { stdout: '{}' };
    }
    throw new Error(`Unexpected native mutation: ${args.join(' ')}`);
  };
  return {
    base, repositoryRoot, homes, roots, config, definitions, sources, marketplaces, installed, calls, hooks, registration, git,
    adds: () => calls.filter(({ args }) => args[1] === 'marketplace' && args[2] === 'add'),
    run: (agents = hosts, runtime = {}) => bootstrapManagedMarketplaces({ repositoryRoot, ...homes, agents, runtime: { runCommand, ...runtime } }),
  };
}

test('absent unused marketplaces register both hosts against a clean committed checkout and ignore Pi', async (t) => {
  const f = await fixture(t);
  const before = await Promise.all(Object.values(f.config).map(file => readFile(file, 'utf8')));
  const actions = await f.run([...hosts, 'pi']);
  assert.deepEqual(actions, hosts.map(agent => ({ agent, status: 'registered', root: f.roots[agent] })));
  assert.deepEqual(f.adds().map(({ host }) => host), hosts);
  assert.deepEqual(await Promise.all(Object.values(f.config).map(file => readFile(file, 'utf8'))), before);
  const firstAdd = f.calls.findIndex(({ args }) => args[2] === 'add');
  for (const host of hosts) assert.ok(f.calls.slice(0, firstAdd).some(call => call.host === host && call.args[1] === 'list'));
  assert.equal(await f.git('status', '--porcelain'), '');
});

test('custom command names receive the selected host context', async (t) => {
  const f = await fixture(t);
  await f.run(hosts, { commands: { codex: 'codex-fixture', 'claude-code': 'claude-fixture' } });
  assert.ok(f.calls.every(({ host, command }) => command === (host === 'codex' ? 'codex-fixture' : 'claude-fixture')));
});

for (const host of hosts) {
  test(`${host}: a matching registration is preserved without adding or inspecting unrelated local state`, async (t) => {
    const f = await fixture(t);
    f.marketplaces[host].push(f.registration(host));
    await write(f.config[host], 'retained selector qs-skills@quickstark');
    assert.deepEqual(await f.run([host]), []);
    assert.equal(f.calls.length, 1);
    assert.deepEqual(f.adds(), []);
    assert.equal(await readFile(f.config[host], 'utf8'), 'retained selector qs-skills@quickstark');
  });

  test(`${host}: a different source is rejected and never repointed`, async (t) => {
    const f = await fixture(t);
    const retained = f.registration(host, path.join(f.base, 'another-checkout'));
    f.marketplaces[host].push(retained);
    await assert.rejects(f.run([host]), /points to another source/);
    assert.deepEqual(f.marketplaces[host], [retained]);
    assert.deepEqual(f.adds(), []);
  });

  test(`${host}: duplicate registrations are rejected before mutation`, async (t) => {
    const f = await fixture(t);
    f.marketplaces[host].push(f.registration(host), f.registration(host));
    await assert.rejects(f.run([host]), /duplicate QuickStark marketplace registrations/);
    assert.deepEqual(f.adds(), []);
  });

  test(`${host}: retained QuickStark cache contents block automatic registration`, async (t) => {
    const f = await fixture(t);
    const cache = path.join(host === 'codex' ? f.homes.codexHomeDirectory : f.homes.claudeHomeDirectory, 'plugins/cache/quickstark/qs-skills/1.0.0/manifest.json');
    await write(cache, '{"retained":true}');
    await assert.rejects(f.run([host]), /retained QuickStark caches/);
    assert.equal(await readFile(cache, 'utf8'), '{"retained":true}');
    assert.deepEqual(f.adds(), []);
  });

  test(`${host}: an empty QuickStark cache directory does not imply retained packages`, async (t) => {
    const f = await fixture(t);
    await mkdir(path.join(host === 'codex' ? f.homes.codexHomeDirectory : f.homes.claudeHomeDirectory, 'plugins/cache/quickstark'), { recursive: true });
    assert.equal((await f.run([host]))[0].status, 'registered');
  });

  test(`${host}: native installed package references block registration`, async (t) => {
    const f = await fixture(t);
    f.installed[host] = [{ [host === 'codex' ? 'pluginId' : 'id']: 'qs-skills@quickstark' }];
    await assert.rejects(f.run([host]), /QuickStark registrations without a marketplace/);
    assert.deepEqual(f.adds(), []);
  });

  test(`${host}: dirty tracked package sources block registration`, async (t) => {
    const f = await fixture(t);
    await appendFile(f.sources[host], 'Uncommitted change.\n');
    await assert.rejects(f.run([host]), /Commit or restore changed marketplace\/package sources/);
    assert.deepEqual(f.adds(), []);
  });

  test(`${host}: untracked package sources block registration`, async (t) => {
    const f = await fixture(t);
    await write(path.join(path.dirname(f.sources[host]), 'new-source.md'), 'Untracked source.\n');
    await assert.rejects(f.run([host]), /Commit or restore changed marketplace\/package sources/);
    assert.deepEqual(f.adds(), []);
  });

  test(`${host}: a dirty marketplace definition blocks registration`, async (t) => {
    const f = await fixture(t);
    await appendFile(f.definitions[host], '\n');
    await assert.rejects(f.run([host]), /Commit or restore changed marketplace\/package sources/);
    assert.deepEqual(f.adds(), []);
  });

  test(`${host}: unrelated native registrations are valid and remain untouched`, async (t) => {
    const f = await fixture(t);
    f.marketplaces[host].push({ name: 'community' });
    f.installed[host].push({ [host === 'codex' ? 'pluginId' : 'id']: 'community@elsewhere' });
    await f.run([host]);
    assert.deepEqual(f.marketplaces[host][0], { name: 'community' });
    assert.equal(f.installed[host].length, 1);
    assert.equal(f.adds().length, 1);
  });

  for (const entry of [null, 42, [], {}, { name: '' }, { name: 42 }]) {
    test(`${host}: unsupported marketplace entry ${JSON.stringify(entry)} blocks registration`, async (t) => {
      const f = await fixture(t);
      f.marketplaces[host].push(entry);
      await assert.rejects(f.run([host]), /marketplace inventory is unsupported/);
      assert.deepEqual(f.adds(), []);
    });
  }

  for (const entry of [null, 42, [], {}, { id: '' }, { pluginId: '' }, { id: 42, pluginId: 42 }]) {
    test(`${host}: unsupported installed entry ${JSON.stringify(entry)} blocks registration`, async (t) => {
      const f = await fixture(t);
      f.installed[host].push(entry);
      await assert.rejects(f.run([host]), /installed inventory is unsupported/);
      assert.deepEqual(f.adds(), []);
    });
  }

  test(`${host}: duplicate committed marketplace package mappings block registration`, async (t) => {
    const f = await fixture(t);
    const definition = JSON.parse(await readFile(f.definitions[host], 'utf8'));
    definition.plugins.push({ ...definition.plugins[0] });
    await write(f.definitions[host], JSON.stringify(definition));
    await f.git('add', '.');
    await f.git('commit', '--quiet', '-m', 'Duplicate package mapping fixture');
    await assert.rejects(f.run([host]), /duplicate package mappings/);
    assert.deepEqual(f.adds(), []);
  });
}

for (const [label, host, contents] of [
  ['ordinary TOML plugin selector', 'codex', '[plugins."qs-skills@quickstark"]\nenabled = true\n'],
  ['escaped TOML plugin selector', 'codex', String.raw`[plugins."qs-skills\u0040quickstark"]`],
  ['long escaped TOML plugin selector', 'codex', String.raw`[plugins."qs-skills\U00000040quickstark"]`],
  ['inline TOML plugin selector', 'codex', 'plugins = { "qs-skills@quickstark" = { enabled = true } }\n'],
  ['Claude enabled plugin selector', 'claude-code', '{"enabledPlugins":{"qs-skills@quickstark":false}}'],
  ['escaped Claude plugin selector', 'claude-code', String.raw`{"enabledPlugins":{"qs-skills\u0040quickstark":true}}`],
]) {
  test(`${label} without a marketplace is preserved and blocks registration`, async (t) => {
    const f = await fixture(t);
    await write(f.config[host], contents);
    await assert.rejects(f.run([host]), /QuickStark settings without a marketplace/);
    assert.equal(await readFile(f.config[host], 'utf8'), contents);
    assert.deepEqual(f.adds(), []);
  });
}

for (const [label, metadata] of [
  ['retained', { version: 2, plugins: { 'qs-skills@quickstark': [{ scope: 'user' }] } }],
  ['unsupported version', { version: 1, plugins: {} }],
  ['array instead of plugin map', { version: 2, plugins: [] }],
  ['string instead of plugin map', { version: 2, plugins: 'unsupported' }],
]) {
  test(`Claude ${label} installed metadata blocks registration`, async (t) => {
    const f = await fixture(t);
    const file = path.join(f.homes.claudeHomeDirectory, 'plugins/installed_plugins.json');
    const contents = JSON.stringify(metadata);
    await write(file, contents);
    await assert.rejects(f.run(['claude-code']), /unsupported or retained QuickStark installed metadata/);
    assert.equal(await readFile(file, 'utf8'), contents);
    assert.deepEqual(f.adds(), []);
  });
}

test('unrelated Claude installed metadata survives registration', async (t) => {
  const f = await fixture(t);
  const file = path.join(f.homes.claudeHomeDirectory, 'plugins/installed_plugins.json');
  const contents = '{"version":2,"plugins":{"community@elsewhere":[{"scope":"user"}]}}';
  await write(file, contents);
  await f.run(['claude-code']);
  assert.equal(await readFile(file, 'utf8'), contents);
});

for (const contents of ['null', '[]', '"unsupported"', '{"enabledPlugins":null}', '{"enabledPlugins":[]}', '{"enabledPlugins":"unsupported"}']) {
  test(`unsupported Claude settings shape ${contents} blocks registration`, async (t) => {
    const f = await fixture(t);
    await write(f.config['claude-code'], contents);
    await assert.rejects(f.run(['claude-code']), /Claude settings shape is unsupported/);
    assert.equal(await readFile(f.config['claude-code'], 'utf8'), contents);
    assert.deepEqual(f.adds(), []);
  });
}

test('malformed Claude settings fail without exposing their contents', async (t) => {
  const f = await fixture(t);
  await write(f.config['claude-code'], '{synthetic-secret-that-must-not-appear');
  await assert.rejects(f.run(['claude-code']), { message: 'Marketplace metadata is invalid JSON; contents withheld.' });
  assert.deepEqual(f.adds(), []);
});

test('all selected hosts are validated before any marketplace add', async (t) => {
  const f = await fixture(t);
  await write(f.config['claude-code'], '{"enabledPlugins":{"qs-skills@quickstark":true}}');
  await assert.rejects(f.run(hosts), /QuickStark settings without a marketplace/);
  assert.ok(f.calls.some(({ host, args }) => host === 'codex' && args[1] === 'list'));
  assert.deepEqual(f.adds(), []);
  assert.deepEqual(f.marketplaces.codex, []);
});

test('configuration changed after its first inspection blocks registration before add', async (t) => {
  const f = await fixture(t);
  f.hooks.beforeCommand = async ({ host, args }) => {
    if (host === 'codex' && args[1] === 'list') await appendFile(f.config.codex, '# changed during inventory\n');
  };
  await assert.rejects(f.run(['codex']), /Migration path changed after planning/);
  assert.deepEqual(f.adds(), []);
});

test('configuration changed during the final marketplace reinspection blocks registration', async (t) => {
  const f = await fixture(t);
  let inspections = 0;
  f.hooks.beforeCommand = async ({ args }) => {
    if (args[1] === 'marketplace' && args[2] === 'list' && ++inspections === 2) {
      await write(f.config.codex, '[plugins."qs-skills@quickstark"]\nenabled = true\n');
    }
  };
  await assert.rejects(f.run(['codex']), /Migration path changed after planning/);
  assert.deepEqual(f.adds(), []);
});

test('a marketplace appearing during final reinspection is preserved without a duplicate add', async (t) => {
  const f = await fixture(t);
  let inspections = 0;
  f.hooks.beforeCommand = async ({ args }) => {
    if (args[1] === 'marketplace' && args[2] === 'list' && ++inspections === 2) f.marketplaces.codex.push(f.registration('codex'));
  };
  await assert.rejects(f.run(['codex']), /registration changed before bootstrap/);
  assert.deepEqual(f.adds(), []);
  assert.equal(f.marketplaces.codex.length, 1);
});

test('add throwing after its effect leaves a matching registration that a retry safely accepts', async (t) => {
  const f = await fixture(t);
  f.hooks.afterAdd = async () => { throw new Error('native command failed after registering'); };
  await assert.rejects(f.run(['codex']), /failed after registering/);
  assert.equal(f.adds().length, 1);
  assert.deepEqual(f.marketplaces.codex, [f.registration('codex')]);
  delete f.hooks.afterAdd;
  assert.deepEqual(await f.run(['codex']), []);
  assert.equal(f.adds().length, 1);
});

test('a native add with an unexpected resulting binding fails verification without removal or repointing', async (t) => {
  const f = await fixture(t);
  f.hooks.afterAdd = async ({ host }) => { f.marketplaces[host] = [f.registration(host, path.join(f.base, 'unexpected-source'))]; };
  await assert.rejects(f.run(['claude-code']), /registration did not match the verified checkout/);
  assert.equal(f.adds().length, 1);
  assert.equal(f.marketplaces['claude-code'][0].path, path.join(f.base, 'unexpected-source'));
});

test('a second-host add failure reports the verified first registration and uncertain second effect', async (t) => {
  const f = await fixture(t);
  f.hooks.afterAdd = async ({ host }) => {
    if (host === 'claude-code') throw new Error('second registration failed after effect');
  };
  await assert.rejects(f.run(hosts), error => {
    assert.equal(error.message, 'second registration failed after effect');
    assert.deepEqual(error.marketplaceActions, [
      { agent: 'codex', status: 'registered', root: f.roots.codex },
      { agent: 'claude-code', status: 'registration-attempted', root: f.roots['claude-code'] },
    ]);
    return true;
  });
  assert.deepEqual(f.adds().map(({ host }) => host), hosts);
  delete f.hooks.afterAdd;
  assert.deepEqual(await f.run(hosts), []);
  assert.equal(f.adds().length, 2);
});
