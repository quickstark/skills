import { execFile } from 'node:child_process';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { assertMigrationParents, captureMigrationPath, revalidateMigrationPath } from './migration-filesystem.mjs';
import { runNativePackageCommand } from './migration-native-packages.mjs';
import { TARGET_SKILL_COLLECTIONS, LEGACY_SKILL_COLLECTIONS } from './skill-collection-registry.mjs';

const exec = promisify(execFile);
const check = (condition, message) => { if (!condition) throw new Error(message); };
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const collections = [...new Map([...TARGET_SKILL_COLLECTIONS, ...LEGACY_SKILL_COLLECTIONS].map(item => [item.id, item])).values()];

async function metadata(file, fallback = '') {
  const snapshot = await captureMigrationPath(file);
  check(snapshot.kind === 'absent' || snapshot.kind === 'file' && snapshot.bytes <= 2 * 1024 * 1024, 'Marketplace metadata must be a bounded regular file.');
  const text = snapshot.kind === 'file' ? await readFile(file, 'utf8') : fallback;
  await revalidateMigrationPath(snapshot);
  return { snapshot, text };
}

function json(text) {
  try { return JSON.parse(text); } catch { throw new Error('Marketplace metadata is invalid JSON; contents withheld.'); }
}

function matches(agent, market, root) {
  return agent === 'codex'
    ? market.root === root && market.marketplaceSource?.sourceType === 'local' && market.marketplaceSource.source === root
    : market.source === 'directory' && market.path === root && market.installLocation === root;
}

// Registration is a prerequisite, not package installation. Only bootstrap an
// absent, unused namespace; an existing binding or cache is never repointed.
export async function bootstrapManagedMarketplaces({ repositoryRoot, agents, runtime = {}, actions = [], ...homes }) {
  const run = runtime.runCommand ?? runNativePackageCommand;
  const pending = [];
  for (const agent of agents.filter(agent => agent !== 'pi')) {
    const hostHome = agent === 'codex' ? homes.codexHomeDirectory : homes.claudeHomeDirectory;
    const configPath = path.join(hostHome, agent === 'codex' ? 'config.toml' : 'settings.json');
    // Codex requires an existing configuration home even for inventory queries.
    await assertMigrationParents(configPath);
    await mkdir(hostHome, { recursive: true, mode: 0o700 });
    await assertMigrationParents(configPath);
    const command = runtime.commands?.[agent] ?? (agent === 'codex' ? 'codex' : 'claude');
    const options = { ...homes, host: agent, cwd: repositoryRoot };
    const inspect = async () => {
      const result = json((await run(command, ['plugin', 'marketplace', 'list', '--json'], options)).stdout);
      const markets = agent === 'codex' ? result.marketplaces : result;
      check(Array.isArray(markets) && markets.every(market => object(market) && typeof market.name === 'string' && market.name.length > 0), `${agent} marketplace inventory is unsupported.`);
      return markets.filter(market => market.name === 'quickstark');
    };
    const root = agent === 'codex' ? path.join(repositoryRoot, 'codex') : repositoryRoot;
    const existing = await inspect();
    check(existing.length <= 1, `${agent} has duplicate QuickStark marketplace registrations.`);
    if (existing.length) {
      if (!matches(agent, existing[0], root)) {
        const error = new Error(`${agent} QuickStark marketplace points to another source; preserve it and reconcile the binding before retrying.`);
        error.code = 'QS_MARKETPLACE_MISMATCH'; error.agent = agent; throw error;
      }
      continue;
    }
    const config = await metadata(configPath);
    if (agent === 'claude-code') {
      const settings = json(config.snapshot.kind === 'absent' ? '{}' : config.text);
      check(object(settings) && (!Object.hasOwn(settings, 'enabledPlugins') || object(settings.enabledPlugins)), 'Claude settings shape is unsupported.');
    }
    // A conservative selector scan also catches TOML Unicode-escaped keys and
    // inline tables. Comments may block bootstrap; they never establish absence.
    const decoded = config.text.replace(/\\(?:U([\da-fA-F]{8})|u([\da-fA-F]{4}))/g, (_, long, short) => {
      const point = Number.parseInt(short ?? long, 16);
      check(point <= 0x10ffff, 'Codex configuration contains an unsupported Unicode escape.');
      return String.fromCodePoint(point);
    });
    check(!/@quickstark/i.test(decoded), `${agent} has QuickStark settings without a marketplace; preserve and reconcile them before retrying.`);
    const cache = await captureMigrationPath(path.join(hostHome, 'plugins/cache/quickstark'));
    check(cache.kind === 'absent' || cache.kind === 'directory' && cache.entries.length === 1, `${agent} has retained QuickStark caches without a marketplace; preserve and reconcile them before retrying.`);
    const inventory = json((await run(command, agent === 'codex' ? ['plugin', 'list', '--marketplace', 'quickstark', '--json'] : ['plugin', 'list', '--json'], options)).stdout);
    const installed = agent === 'codex' ? inventory.installed : inventory;
    const identity = item => agent === 'codex' ? item?.pluginId : item?.id;
    check(Array.isArray(installed) && installed.every(item => object(item) && typeof identity(item) === 'string' && identity(item).length > 0), `${agent} installed inventory is unsupported.`);
    check(!installed.some(item => identity(item).endsWith('@quickstark')), `${agent} has QuickStark registrations without a marketplace.`);
    const snapshots = [config.snapshot, cache];
    if (agent === 'claude-code') {
      const plugins = await metadata(path.join(hostHome, 'plugins/installed_plugins.json'), '{"version":2,"plugins":{}}');
      const value = json(plugins.text);
      check(object(value) && value.version === 2 && object(value.plugins) && !Object.keys(value.plugins).some(key => key.endsWith('@quickstark')), 'Claude has unsupported or retained QuickStark installed metadata.');
      snapshots.push(plugins.snapshot);
    }
    const definitionPath = path.join(root, agent === 'codex' ? '.agents/plugins/marketplace.json' : '.claude-plugin/marketplace.json');
    const definition = await metadata(definitionPath);
    const market = json(definition.text);
    check(market.name === 'quickstark' && Array.isArray(market.plugins) && market.plugins.length > 0, 'Local QuickStark marketplace definition is invalid.');
    check(new Set(market.plugins.map(plugin => plugin?.name)).size === market.plugins.length, 'Local marketplace has duplicate package mappings.');
    const sources = [];
    for (const plugin of market.plugins) {
      const collection = collections.find(item => item.id === plugin.name);
      const source = agent === 'codex' ? plugin.source?.path : plugin.source;
      check(collection && typeof source === 'string' && (agent !== 'codex' || plugin.source.source === 'local')
        && path.resolve(root, source) === path.join(repositoryRoot, agent === 'codex' ? collection.codexPackageRoot : collection.claudePackageRoot), 'Local marketplace package mapping is unsupported.');
      sources.push(source);
    }
    const paths = [path.relative(repositoryRoot, definitionPath), ...sources.map(source => path.relative(repositoryRoot, path.resolve(root, source)))];
    await exec('git', ['ls-files', '--error-unmatch', '--', paths[0]], { cwd: repositoryRoot, encoding: 'utf8' });
    const status = await exec('git', ['status', '--porcelain', '--untracked-files=all', '--', ...paths], { cwd: repositoryRoot, encoding: 'utf8' });
    check(!status.stdout.trim(), 'Commit or restore changed marketplace/package sources before automatic registration.');
    pending.push({ agent, root, command, options, inspect, snapshots: [...snapshots, definition.snapshot] });
  }
  // Validate every selected host before registering any absent marketplace.
  try {
    for (const item of pending) {
      for (const snapshot of item.snapshots) await revalidateMigrationPath(snapshot);
      check((await item.inspect()).length === 0, 'Marketplace registration changed before bootstrap; retry from current state.');
      for (const snapshot of item.snapshots) await revalidateMigrationPath(snapshot);
      const action = { agent: item.agent, status: 'registration-attempted', root: item.root };
      actions.push(action);
      await run(item.command, ['plugin', 'marketplace', 'add', item.root], item.options);
      const actual = await item.inspect();
      check(actual.length === 1 && matches(item.agent, actual[0], item.root), 'Native marketplace registration did not match the verified checkout; inspect current state.');
      action.status = 'registered';
    }
  } catch (error) {
    error.marketplaceActions = actions;
    throw error;
  }
  return actions;
}
