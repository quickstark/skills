import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { constants } from 'node:fs';
import { cp, link, lstat, mkdir, open, readFile, readdir, realpath, rename, rm, unlink } from 'node:fs/promises';
import { hostname } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { TARGET_SKILL_COLLECTIONS } from './skill-collection-registry.mjs';
import { resolveManagedSkillPaths } from './managed-skill-paths.mjs';
import { normalizeSelectionRecord, readSelectionRecord, resolveTargetSelection } from './skill-selection.mjs';
import { inspectNativePayload, runNativePackageCommand } from './migration-native-packages.mjs';
import { validateSkillRelease } from './validate-skill-release.mjs';
import { assertMigrationParents } from './migration-filesystem.mjs';

const exec = promisify(execFile);
const check = (ok, message) => { if (!ok) throw new Error(message); };
const ids = new Set([...TARGET_SKILL_COLLECTIONS.map(c => c.id), 'ps-skills']);
const replacements = names => [...new Set(names.flatMap(id => id === 'ps-skills' ? ['qs-skills', 'qs-advanced'] : [id]))];
const optionalStat = file => lstat(file).catch(error => error.code === 'ENOENT' ? null : Promise.reject(error));
const json = text => { try { return JSON.parse(text); } catch { throw new Error('Installer metadata is invalid JSON; contents withheld.'); } };
const within = (root, file) => file === root || file.startsWith(root + path.sep);

async function acquireLock(file) {
  const temporary = `${file}.${randomUUID()}.tmp`;
  const handle = await open(temporary, 'wx', 0o600);
  try {
    await handle.writeFile(JSON.stringify({ kind: 'quickstark-clean-install', hostname: hostname(), pid: process.pid }));
    await handle.sync();
    for (let attempt = 0; attempt < 2; attempt++) {
      try { await link(temporary, file);return handle; }
      catch (error) { if (error.code !== 'EEXIST') throw error; }
      const blocked = 'Another installer owns the updater lock; finish that installation before retrying.';
      const current = await open(file, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
      try {
        const stat = await current.stat();
        check(stat.isFile() && stat.size <= 1024, blocked);
        const buffer = Buffer.alloc(1025);const { bytesRead } = await current.read(buffer, 0, buffer.length, 0);
        let owner;try { owner = JSON.parse(buffer.subarray(0, bytesRead).toString()); } catch { throw new Error(blocked); }
        check(owner.kind === 'quickstark-clean-install' && owner.hostname === hostname() && Number.isSafeInteger(owner.pid) && owner.pid > 0, blocked);
        let dead = false;
        try { process.kill(owner.pid, 0); } catch (error) { dead = error.code === 'ESRCH'; }
        const named = await optionalStat(file);
        check(dead && named?.dev === stat.dev && named?.ino === stat.ino, blocked);
        await unlink(file);
      } finally { await current.close(); }
    }
    throw new Error('Updater lock changed while retrying; rerun the installer.');
  } catch (error) { await handle.close();throw error; }
  finally { await unlink(temporary); }
}

async function saveCleanSelection(file, record, expectedFingerprint) {
  await assertMigrationParents(file);
  await mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
  check((await readSelectionRecord(file)).fingerprint === expectedFingerprint, 'Selection changed during installation; rerun the installer.');
  const temporary = `${file}.${randomUUID()}.tmp`;
  const handle = await open(temporary, 'wx', 0o600);
  try {
    await handle.writeFile(JSON.stringify(normalizeSelectionRecord(record), null, 2) + '\n');await handle.sync();
    check((await readSelectionRecord(file)).fingerprint === expectedFingerprint, 'Selection changed during installation; rerun the installer.');
    await rename(temporary, file);
  } finally { await handle.close();await rm(temporary, { force: true }); }
  return readSelectionRecord(file);
}

async function settings(file) {
  const stat = await optionalStat(file);
  if (!stat) return {};
  const target = await realpath(file);
  const metadata = await lstat(target);
  check(metadata.isFile() && metadata.size <= 2 * 1024 * 1024, 'Client settings must resolve to a bounded regular file.');
  const value = json(await readFile(target, 'utf8'));
  check(value && typeof value === 'object' && !Array.isArray(value), 'Client settings must contain an object.');
  return value;
}

async function officialSource(root, acceptedRoot) {
  // The replacement checkout is validated before effects, including for direct
  // local callers. Only historical bindings need a separate origin check.
  if (root === acceptedRoot) return;
  let origin;
  try { origin = (await exec('git', ['config', '--get', 'remote.origin.url'], {cwd: root, encoding: 'utf8', timeout: 30000})).stdout.trim(); }
  catch { throw new Error('Existing QuickStark source cannot be identified; it remains untouched.'); }
  check(/^(?:https:\/\/github\.com\/|git@github\.com:)quickstark\/skills(?:\.git)?$/.test(origin), 'Existing marketplace is not the official QuickStark source; it remains untouched.');
}

async function inventory(agent, options, run) {
  if (agent === 'pi') {
    const config = path.join(options.piHomeDirectory, 'settings.json');
    const value = await settings(config);
    check(!value.packages || Array.isArray(value.packages), 'Pi packages must be an array.');
    const packages = [];
    for (const entry of value.packages ?? []) {
      const source = typeof entry === 'string' ? entry : entry?.source;
      if (typeof source !== 'string' || !path.isAbsolute(source) && !source.startsWith('.')) continue;
      const absolute = path.resolve(path.dirname(config), source);
      const collection = [...ids].find(id => absolute.endsWith(`/pi/packages/${id}`));
      if (!collection) continue;
      await officialSource(absolute.slice(0, -`/pi/packages/${collection}`.length), options.cwd);
      check(typeof entry === 'string', 'Filtered Pi registrations are preserved; reconcile their filters before a clean install.');
      packages.push({ name: collection, source: absolute });
    }
    return { packages, config };
  }
  const markets = json((await run(options.command, ['plugin', 'marketplace', 'list', '--json'], options)).stdout);
  const matching = (agent === 'codex' ? markets.marketplaces : markets)?.filter(m => m.name === 'quickstark');
  check(Array.isArray(matching) && matching.length <= 1, 'QuickStark marketplace inventory is unsupported or ambiguous.');
  const market = matching[0];
  if (market) {
    check(agent === 'codex' ? market.marketplaceSource?.sourceType === 'local' && market.marketplaceSource.source === market.root
      : market.source === 'directory' && market.path === market.installLocation, 'Only a verified local QuickStark marketplace can be replaced.');
    await officialSource(agent === 'codex' ? path.dirname(market.root) : market.path, options.cwd);
  }
  const value = market ? json((await run(options.command, agent === 'codex'
    ? ['plugin', 'list', '--marketplace', 'quickstark', '--json'] : ['plugin', 'list', '--json'], options)).stdout) : agent === 'codex' ? { installed: [] } : [];
  const installed = agent === 'codex' ? value.installed : value;
  check(Array.isArray(installed), 'Installed package inventory is unsupported.');
  const owned = installed.filter(p => (agent === 'codex' ? p.pluginId : p.id)?.endsWith('@quickstark'));
  check(owned.every(p => ids.has((agent === 'codex' ? p.pluginId : p.id).split('@')[0]) && (agent !== 'claude-code' || p.scope === 'user')), 'Unknown or project-scoped QuickStark packages are preserved.');
  const names = owned.map(p => (agent === 'codex' ? p.pluginId : p.id).split('@')[0]);
  const config = path.join(agent === 'codex' ? options.codexHomeDirectory : options.claudeHomeDirectory, agent === 'codex' ? 'config.toml' : 'settings.json');
  if (agent === 'codex') {
    const text = await readFile(config, 'utf8').catch(error => error.code === 'ENOENT' ? '' : Promise.reject(error));
    for (const match of text.matchAll(/^\s*\[plugins\.(?:"([a-z0-9-]+)@quickstark"|'([a-z0-9-]+)@quickstark')\]\s*(?:#.*)?$/gm)) {
      const name = match[1] ?? match[2];check(ids.has(name), 'Unknown QuickStark configuration is preserved.');names.push(name);
    }
  } else {
    for (const id of Object.keys((await settings(config)).enabledPlugins ?? {}).filter(id => id.endsWith('@quickstark'))) {
      const name = id.split('@')[0];check(ids.has(name), 'Unknown QuickStark configuration is preserved.');names.push(name);
    }
  }
  check(market || names.length === 0, 'QuickStark registrations have no verifiable marketplace; they remain untouched.');
  return { market, packages: [...new Set(names)].map(name => {
    const entry = owned.find(p => (agent === 'codex' ? p.pluginId : p.id) === `${name}@quickstark`);
    return { name, enabled: entry?.enabled, version: entry?.version, source: agent === 'codex' ? entry?.source?.path : entry?.readFromFolder };
  }), config };
}

/** Ordinary installation replaces only QuickStark registrations. Historical
 * journals and unrelated caches are neither inputs nor prerequisites. */
export async function cleanInstallSkills({ repositoryRoot, homeDirectory, agents, environment = process.env,
  profile = null, withPackages = [], runtime = {}, verifyRepositoryFreshness, ...homes }) {
  check(agents?.length === 1, 'Clean installation handles one client at a time.');
  const agent = agents[0];
  const paths = resolveManagedSkillPaths({ ...homes, homeDirectory, agents, environment });
  await assertMigrationParents(paths.lockPath);
  await mkdir(path.dirname(paths.lockPath), { recursive: true, mode: 0o700 });
  const lock = await acquireLock(paths.lockPath);
  const lockIdentity = await lock.stat();
  let backupRoot;
  try {
    if (verifyRepositoryFreshness) await verifyRepositoryFreshness({ repositoryRoot, agents });
    const options = { ...paths, host: agent, cwd: repositoryRoot, command: runtime.commands?.[agent] ?? (agent === 'claude-code' ? 'claude' : agent) };
    const run = runtime.runCommand ?? runNativePackageCommand;
    const saved = await readSelectionRecord(paths.selectionPath);
    const record = saved.record ?? { schemaVersion: 1, targets: {}, templateRevision: null, lastSuccessfulTransaction: null };
    const prior = record.targets[agent];
    if (prior) record.targets[agent] = { ...prior, packages: replacements(prior.packages), additions: replacements(prior.additions) };
    const profiles = json(await readFile(path.join(repositoryRoot, 'config/skill-profiles.json'), 'utf8'));
    const selectionOptions = { agent, profiles, packageNames: TARGET_SKILL_COLLECTIONS.map(c => c.id), resourceNames: prior?.resources ?? [], savedRecord: record, profile, withPackages };
    const requested = resolveTargetSelection(selectionOptions).selection;
    await mkdir(agent === 'codex' ? paths.codexHomeDirectory : agent === 'claude-code' ? paths.claudeHomeDirectory : paths.piHomeDirectory, { recursive: true });
    const observed = await inventory(agent, options, run);
    if (await optionalStat(observed.config)) {
      const physical = await realpath(observed.config);
      check(!within(await realpath(repositoryRoot), physical), 'Client settings must remain outside the accepted release.');
      if (observed.market) {
        const sourceRoot = agent === 'codex' ? path.dirname(observed.market.root) : observed.market.path;
        check(!within(await realpath(sourceRoot), physical), 'Client settings must remain outside retained source checkouts.');
      }
      if (agent === 'pi') for (const pkg of observed.packages) {
        check(!within(await realpath(path.resolve(pkg.source, '../../..')), physical), 'Pi settings must remain outside retained source checkouts.');
      }
    }
    const hostHome = agent === 'codex' ? paths.codexHomeDirectory : paths.claudeHomeDirectory;
    if (agent !== 'pi') {
      const cache = path.join(hostHome, 'plugins/cache/quickstark');
      await assertMigrationParents(path.join(cache, '.guard'));
      const names = await readdir(cache).catch(error => error.code === 'ENOENT' ? [] : Promise.reject(error));
      check(names.every(name => ids.has(name)), 'Unknown QuickStark cache entries are preserved; reconcile them before a clean install.');
    }
    const desired = prior || profile ? requested : resolveTargetSelection({ ...selectionOptions,
      legacy: { packages: [...new Set(['qs-skills', ...replacements(observed.packages.map(p => p.name))])], resources: [], conflicts: [] } }).selection;
    const release = await (runtime.validateRepairRelease ?? validateSkillRelease)({ repositoryRoot, agents, packageIds: desired.packages });
    const accepted = new Map();
    for (const id of desired.packages) {
      const collection = TARGET_SKILL_COLLECTIONS.find(c => c.id === id);
      const source = path.join(repositoryRoot, agent === 'codex' ? collection.codexPackageRoot : agent === 'claude-code' ? collection.claudePackageRoot : collection.piPackageRoot);
      accepted.set(id, { source, payload: await inspectNativePayload(agent, source) });
    }
    record.targets[agent] = desired;
    const intended = await saveCleanSelection(paths.selectionPath, record, saved.fingerprint);
    backupRoot = path.join(paths.backupRoot, `clean-${agent}-${randomUUID()}`);
    await assertMigrationParents(backupRoot);
    await mkdir(backupRoot, { recursive: true, mode: 0o700 });
    if (await optionalStat(observed.config)) {
      const physical = await realpath(observed.config);
      await cp(physical, path.join(backupRoot, 'settings-original'), { preserveTimestamps: true });
    }
    if (agent !== 'pi') for (const id of ids) {
      const cache = path.join(hostHome, 'plugins/cache/quickstark', id);
      if (await optionalStat(cache)) await cp(cache, path.join(backupRoot, `cache-${id}`), { recursive: true, verbatimSymlinks: true, preserveTimestamps: true });
    }
    for (const pkg of observed.packages) {
      const args = agent === 'pi' ? ['remove', pkg.source] : agent === 'codex' ? ['plugin', 'remove', `${pkg.name}@quickstark`, '--json']
        : ['plugin', 'uninstall', `${pkg.name}@quickstark`, '--scope', 'user'];
      await run(options.command, args, options);
    }
    if (agent !== 'pi') {
      // Native managers can retain orphaned or same-version caches. Originals
      // were copied above; remove only the finite, known QuickStark package IDs.
      for (const id of ids) await rm(path.join(hostHome, 'plugins/cache/quickstark', id), { recursive: true, force: true });
      if (observed.market) await run(options.command, ['plugin', 'marketplace', 'remove', 'quickstark', ...(agent === 'claude-code' ? ['--scope', 'user'] : [])], options);
      await run(options.command, ['plugin', 'marketplace', 'add', agent === 'codex' ? path.join(repositoryRoot, 'codex') : repositoryRoot], options);
    }
    for (const id of desired.packages) {
      const collection = TARGET_SKILL_COLLECTIONS.find(c => c.id === id);
      await run(options.command, agent === 'pi' ? ['install', path.join(repositoryRoot, collection.piPackageRoot)]
        : agent === 'codex' ? ['plugin', 'add', `${id}@quickstark`, '--json'] : ['plugin', 'install', `${id}@quickstark`, '--scope', 'user'], options);
    }
    const installed = await inventory(agent, options, run);
    check(installed.packages.length === desired.packages.length && desired.packages.every(id => installed.packages.some(p => p.name === id)), 'Client did not register the selected QuickStark packages exactly; rerun the installer.');
    const version = json(await readFile(path.join(repositoryRoot, 'package.json'), 'utf8')).version;
    if (agent !== 'pi') check((agent === 'codex' ? installed.market?.root : installed.market?.path) === (agent === 'codex' ? path.join(repositoryRoot, 'codex') : repositoryRoot), 'Client registered a different marketplace source.');
    for (const id of desired.packages) {
      const { source, payload: expected } = accepted.get(id);
      const registration = installed.packages.find(pkg => pkg.name === id);
      check(registration.source === source && (agent === 'pi' || registration.enabled === true && registration.version === version), 'Client registration does not match the selected release.');
      const actual = agent === 'pi' ? source : path.join(hostHome, 'plugins/cache/quickstark', id, version);
      const payload = await inspectNativePayload(agent, actual);
      check(payload.name === id && payload.version === version && payload.payloadSha256 === expected.payloadSha256, 'Installed QuickStark package differs from the accepted release; rerun the installer.');
    }
    const completed = { ...intended.record, templateRevision: release.revision, lastSuccessfulTransaction: path.basename(backupRoot) };
    await saveCleanSelection(paths.selectionPath, completed, intended.fingerprint);
    return { action: 'update', status: 'complete', mode: 'clean-install', backupRoot, targets: { [agent]: { desired } } };
  } catch (error) {
    if (backupRoot) error.cleanBackupRoot = backupRoot;
    throw error;
  } finally {
    await lock.close();
    const actual = await optionalStat(paths.lockPath);
    if (actual?.dev === lockIdentity.dev && actual?.ino === lockIdentity.ino) await unlink(paths.lockPath);
  }
}
