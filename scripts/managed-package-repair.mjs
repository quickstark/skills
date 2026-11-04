import { execFile } from 'node:child_process';
import { randomUUID, createHash } from 'node:crypto';
import { constants } from 'node:fs';
import { chmod, cp, lchmod, lstat, mkdir, open, readFile, realpath, rename, unlink } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { TARGET_SKILL_COLLECTIONS, LEGACY_SKILL_COLLECTIONS } from './skill-collection-registry.mjs';
import { captureMigrationPath, revalidateMigrationPath, assertMigrationParents } from './migration-filesystem.mjs';
import { readSelectionRecord, resolveTargetSelection } from './skill-selection.mjs';
import { runNativePackageCommand, captureCodexForeignCaches, codexConfig } from './migration-native-packages.mjs';
import { validateSkillRelease } from './validate-skill-release.mjs';
import { compareVersions, exactCheckout, SKILLS_ORIGIN } from './install-skills.mjs';

const exec = promisify(execFile);
const check = (ok, message) => { if (!ok) throw new Error(message); };
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const collections = [...new Map([...LEGACY_SKILL_COLLECTIONS, ...TARGET_SKILL_COLLECTIONS].map(c => [c.id, c])).values()];
const ids = new Set(collections.map(c => c.id));
const json = text => { try { return JSON.parse(text); } catch { throw new Error('Repair metadata is invalid JSON; contents withheld.'); } };
const stable = value => JSON.stringify(value, (_, item) => object(item) ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);
const sha = value => createHash('sha256').update(stable(value)).digest('hex');
const pointerPath = paths => path.join(paths.transactionRoot, 'managed-repair-pending.json');
const maximumRepairRecordBytes = 128 * 1024 * 1024;
// Old root-based Claude caches can contain complete repositories and dependency
// links. Backups retain literal links without inspecting their external targets;
// accepted source/package payload verification keeps its strict default policy.
const backupOptions = { allowDescendantSymlinks: true, limits: { entries: 131072, bytes: 2 * 1024 * 1024 * 1024, depth: 64 } };
const captureBackup = file => captureMigrationPath(file, backupOptions);
const revalidateBackup = snapshot => revalidateMigrationPath(snapshot, backupOptions);

async function save(file, value) {
  const content = JSON.stringify(value, null, 2) + '\n';
  check(Buffer.byteLength(content) <= maximumRepairRecordBytes, 'Repair recovery record exceeds its bound.');
  await assertMigrationParents(file); await mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
  const temp = `${file}.${randomUUID()}.tmp`;
  const handle = await open(temp, 'wx', 0o600);
  try { await handle.writeFile(content); await handle.sync(); } finally { await handle.close(); }
  await rename(temp, file);
  const directory = await open(path.dirname(file), 'r'); try { await directory.sync(); } finally { await directory.close(); }
}

async function read(file, fallback, maximumBytes = 2 * 1024 * 1024) {
  const snapshot = await captureMigrationPath(file);
  if (snapshot.kind === 'absent' && fallback !== undefined) return { value: fallback, snapshot };
  check(snapshot.kind === 'file' && snapshot.bytes <= maximumBytes, 'Repair metadata must be a bounded regular file.');
  const value = json(await readFile(file, 'utf8')); await revalidateMigrationPath(snapshot); return { value, snapshot };
}

async function repairContinuationEvidence({ paths, agents, repositoryRoot, pending, record }) {
  const prior = record.value;
  check(prior.schemaVersion === 1 && prior.status === 'prepared-for-install' && prior.repositoryRoot === pending.value.repositoryRoot
    && stable(prior.agents) === stable(agents), 'Pending repair is not prepared for continuation; its original state remains retained.');
  const owner = await read(path.join(paths.homeDirectory, '.local/state/quickstark/installer/checkout.json'), null);
  check(owner.value?.schemaVersion === 2 && owner.value.remoteUrl === SKILLS_ORIGIN && Array.isArray(owner.value.releases), 'Pending repair continuation requires recorded official versioned sources.');
  const sources = path.join(paths.homeDirectory, '.local/share/quickstark/releases');
  const find = root => {
    const matches = owner.value.releases.filter(entry => entry.repositoryRoot === root);
    check(matches.length === 1, 'Pending repair source is absent or ambiguous in the retained release ledger.');
    const entry = matches[0];
    check(path.dirname(root) === sources && /^[a-f0-9]{40}$/.test(entry.revision) && entry.tag === `v${entry.version}`, 'Pending repair source binding is invalid.');
    return entry;
  };
  const oldSource = find(prior.repositoryRoot); const newSource = find(repositoryRoot);
  check(oldSource.revision === prior.revision && compareVersions(newSource.version, oldSource.version) > 0, 'Pending repair continuation requires a newer recorded release.');
  const git = async (root, args) => (await exec('git', ['-c', 'core.hooksPath=/dev/null', '-c', 'core.fsmonitor=false', ...args], {
    cwd: root, encoding: 'utf8', timeout: 30000, maxBuffer: 4 * 1024 * 1024,
    env: { ...Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.toUpperCase().startsWith('GIT_'))), GIT_TERMINAL_PROMPT: '0' },
  })).stdout.trim();
  for (const entry of [oldSource, newSource]) {
    await assertMigrationParents(entry.repositoryRoot);
    check(await realpath(entry.repositoryRoot) === entry.repositoryRoot, 'Pending repair source must remain at its original physical path.');
    check(await git(entry.repositoryRoot, ['config', '--get', 'remote.origin.url']) === SKILLS_ORIGIN
      && await git(entry.repositoryRoot, ['rev-parse', 'HEAD']) === entry.revision
      && JSON.parse(await readFile(path.join(entry.repositoryRoot, 'package.json'), 'utf8')).version === entry.version
      && await exactCheckout(entry.repositoryRoot, entry.revision), 'Pending repair retained source changed; preserve it for explicit recovery.');
  }
  try { await git(repositoryRoot, ['merge-base', '--is-ancestor', oldSource.revision, newSource.revision]); }
  catch { throw new Error('Pending repair source is not an ancestor of the verified newer release.'); }
  check(Array.isArray(prior.snapshots) && prior.snapshots.length > 0, 'Pending repair has no retained original-state snapshots.');
  for (const agent of agents) {
    const config = agent === 'codex' ? path.join(paths.codexHomeDirectory, 'config.toml')
      : path.join(agent === 'pi' ? paths.piHomeDirectory : paths.claudeHomeDirectory, 'settings.json');
    check(prior.snapshots.some(entry => entry.snapshot?.path === config), 'Pending repair belongs to another configuration home.');
  }
  const backups = [];
  for (const [index, entry] of prior.snapshots.entries()) {
    check(entry.destination === path.join(path.dirname(pending.value.recordPath), `original-${index}`)
      && ['absent', 'file', 'directory'].includes(entry.snapshot?.kind), 'Pending repair backup binding is invalid.');
    const actual = await captureBackup(entry.destination);
    check(actual.kind === entry.snapshot.kind && actual.contentSha256 === entry.snapshot.contentSha256, 'Pending repair original backup changed; originals remain retained.');
    backups.push(actual);
  }
  return { records: [pending.snapshot, record.snapshot, owner.snapshot], backups, recordContentSha256: record.snapshot.contentSha256, nextRevision: newSource.revision };
}

export async function pendingManagedRepair({ paths, agents, repositoryRoot, allowPublishedContinuation = false }) {
  const pending = await read(pointerPath(paths), null);
  if (!pending.value) return null;
  const p = pending.value;
  check(p.schemaVersion === 1 && (p.repositoryRoot === repositoryRoot || allowPublishedContinuation) && stable(p.agents) === stable(agents)
    && path.resolve(p.recordPath) === p.recordPath && p.recordPath.startsWith(paths.backupRoot + path.sep)
    && path.basename(p.recordPath) === 'repair.json', 'Pending repair belongs to another checkout or harness group.');
  const record = await read(p.recordPath, undefined, maximumRepairRecordBytes);
  check(sha(record.value.selection) === p.selectionSha256, 'Pending repair selection changed; originals remain retained.');
  const continuationEvidence = p.repositoryRoot === repositoryRoot ? null : await repairContinuationEvidence({ paths, agents, repositoryRoot, pending, record });
  return { ...record.value, recordPath: p.recordPath, ...(continuationEvidence ? { continuationEvidence } : {}) };
}

async function trustedSource(root) {
  let result;
  try { result = await exec('git', ['config', '--get', 'remote.origin.url'], { cwd: root, encoding: 'utf8' }); }
  catch { throw new Error('Cannot prove that the old package source is a QuickStark checkout; it remains untouched.'); }
  check(/^(?:https:\/\/github\.com\/|git@github\.com:)quickstark\/skills(?:\.git)?\s*$/.test(result.stdout), 'Old marketplace is not the official QuickStark repository; it remains untouched.');
}

async function inventory(agent, options, run) {
  const command = options.command;
  const result = json((await run(command, agent === 'codex' ? ['plugin', 'list', '--marketplace', 'quickstark', '--json'] : ['plugin', 'list', '--json'], options)).stdout);
  const packages = agent === 'codex' ? result.installed : result;
  check(Array.isArray(packages), 'Unsupported native package inventory.');
  return packages;
}

function codexUnrelated(text) {
  const lines = []; let owned = false; let comments = [];
  for (const line of text.split(/\r?\n/)) {
    if (/^\s*#/.test(line)) { comments.push(line.trim()); continue; }
    if (!line.trim()) continue;
    if (/^\s*\[/.test(line)) owned = /^\s*\[(?:plugins\."[a-z0-9-]+@quickstark"|marketplaces\.(?:quickstark|"quickstark"))\]\s*(?:#.*)?$/.test(line);
    if (!owned) { for (const comment of comments) lines.push(comment); lines.push(line.trim()); }
    comments = [];
  }
  // Match native TOML editing: trailing comments survive removal of an owned table.
  for (const comment of comments) lines.push(comment);
  return lines;
}

async function unrelated(agent, options, run) {
  if (agent === 'codex') {
    const snapshot = await captureMigrationPath(path.join(options.codexHomeDirectory, 'config.toml'));
    const text = snapshot.kind === 'absent' ? '' : await readFile(snapshot.path, 'utf8');
    await revalidateMigrationPath(snapshot);
    const caches = await captureCodexForeignCaches(options.codexHomeDirectory);
    return sha({ settings: codexUnrelated(text), caches: caches.hash });
  }
  const home = agent === 'pi' ? options.piHomeDirectory : options.claudeHomeDirectory;
  const settings = (await read(path.join(home, 'settings.json'), {})).value;
  check(object(settings), 'Native settings must be an object.');
  if (agent === 'pi') return sha({ ...settings, packages: (settings.packages ?? []).filter(item => !options.sources.includes(typeof item === 'string' ? item : item?.source)) });
  const plugins = (await read(path.join(home, 'plugins/installed_plugins.json'), { version: 2, plugins: {} })).value;
  const markets = (await read(path.join(home, 'plugins/known_marketplaces.json'), {})).value;
  check(object(plugins.plugins) && object(markets), 'Claude metadata shape is unsupported.');
  return sha({ settings: { ...settings,
    enabledPlugins: Object.fromEntries(Object.entries(settings.enabledPlugins ?? {}).filter(([id]) => !id.endsWith('@quickstark'))),
    extraKnownMarketplaces: Object.fromEntries(Object.entries(settings.extraKnownMarketplaces ?? {}).filter(([id]) => id !== 'quickstark')) },
    plugins: { ...plugins, plugins: Object.fromEntries(Object.entries(plugins.plugins).filter(([id]) => !id.endsWith('@quickstark'))) },
    markets: Object.fromEntries(Object.entries(markets).filter(([id]) => id !== 'quickstark')) });
}

/** Replacement authority comes from the installer, not from treating unknown bytes as trusted history. */
export async function repairManagedPackages({ repositoryRoot, paths, agents, profile = null, withPackages = [], runtime = {}, onProgress = () => {}, allowPublishedContinuation = false }) {
  const run = runtime.runCommand ?? runNativePackageCommand;
  const saved = await readSelectionRecord(paths.selectionPath);
  const previous = await pendingManagedRepair({ paths, agents, repositoryRoot, allowPublishedContinuation });
  check(!previous?.continuationEvidence || !profile && withPackages.length === 0, 'Pending repair continues its frozen selection; omit profile/addition flags.');
  const selection = structuredClone(previous?.selection ?? saved.record ?? { schemaVersion: 1, targets: {}, templateRevision: null, lastSuccessfulTransaction: null });
  const profiles = json(await readFile(path.join(repositoryRoot, 'config/skill-profiles.json'), 'utf8'));
  const hosts = [];
  for (const agent of agents) {
    const options = { ...paths, homeDirectory: paths.homeDirectory, cwd: repositoryRoot, host: agent, command: runtime.commands?.[agent] ?? (agent === 'claude-code' ? 'claude' : agent), sources: [] };
    let packages, market, root;
    const targets = [];
    if (agent === 'pi') {
      const config = path.join(paths.piHomeDirectory, 'settings.json'); targets.push(config);
      const settings = (await read(config, {})).value; check(object(settings) && (!settings.packages || Array.isArray(settings.packages)), 'Pi settings shape is unsupported.');
      packages = [];
      for (const entry of settings.packages ?? []) {
        const value = typeof entry === 'string' ? entry : entry?.source;
        if (typeof value !== 'string' || !path.isAbsolute(value) && !value.startsWith('.')) continue;
        const source = path.resolve(path.dirname(config), value);
        const c = collections.find(c => source.endsWith('/' + c.piPackageRoot));
        if (!c) continue;
        check(typeof entry === 'string', 'Filtered Pi entries are preserved; automatic replacement cannot discard filters.');
        const oldRoot = source.slice(0, -('/' + c.piPackageRoot).length); await trustedSource(oldRoot);
        packages.push({ name: c.id, source }); options.sources.push(value); targets.push(source);
      }
    } else {
      const result = json((await run(options.command, ['plugin', 'marketplace', 'list', '--json'], options)).stdout);
      const markets = agent === 'codex' ? result.marketplaces : result;
      check(Array.isArray(markets), 'Native marketplace inventory is unsupported.');
      const matches = markets.filter(m => m.name === 'quickstark'); check(matches.length <= 1, 'Duplicate QuickStark marketplaces cannot be replaced automatically.');
      market = matches[0];
      packages = (await inventory(agent, options, run)).filter(p => (agent === 'codex' ? p.pluginId : p.id)?.endsWith('@quickstark'));
      if (market) {
        check(agent === 'codex' ? market.marketplaceSource?.sourceType === 'local' && market.marketplaceSource.source === market.root : market.source === 'directory' && market.path === market.installLocation, 'Only verified local QuickStark marketplaces can be repaired automatically.');
        root = agent === 'codex' ? path.dirname(market.root) : market.path;
        await trustedSource(root);
      }
      check(!packages.length || market, 'Installed packages lack a verifiable marketplace source.');
      for (const pkg of packages) {
        const id = agent === 'codex' ? pkg.pluginId : pkg.id; pkg.name = id.slice(0, -'@quickstark'.length);
        check(ids.has(pkg.name) && pkg.enabled === true && (agent === 'codex' ? pkg.installed === true && pkg.marketplaceName === 'quickstark' && pkg.source?.source === 'local' : pkg.scope === 'user'), 'Unknown, disabled or non-user QuickStark registrations remain untouched.');
        const c = collections.find(c => c.id === pkg.name);
        const source = agent === 'codex' ? pkg.source?.path : pkg.readFromFolder;
        const relative = agent === 'codex' ? c.codexPackageRoot : c.claudePackageRoot;
        if (!(agent === 'claude-code' && pkg.name === 'qs-skills' && source === root)) {
          check(typeof source === 'string' && source.endsWith('/' + relative), 'Installed source is outside the known QuickStark package path.');
          await trustedSource(source.slice(0, -('/' + relative).length));
        }
        pkg.cacheSnapshot = await captureBackup(path.join(agent === 'codex' ? paths.codexHomeDirectory : paths.claudeHomeDirectory, 'plugins/cache/quickstark', pkg.name));
      }
      if (agent === 'codex') {
        // An older catalog omits newer enabled packages even when their cache
        // and user configuration remain. Native remove accepts these selectors
        // without needing the old catalog to advertise them.
        const config = await captureMigrationPath(path.join(paths.codexHomeDirectory, 'config.toml'));
        check(config.kind === 'absent' || config.kind === 'file' && config.bytes <= 2 * 1024 * 1024, 'Codex repair configuration must be a bounded regular file.');
        const text = config.kind === 'absent' ? '' : await readFile(config.path, 'utf8');
        const selected = codexConfig(text, collections.map(c => ({ name: c.id, marketplace: 'quickstark' }))).selected;
        await revalidateMigrationPath(config);
        for (const [id, state] of Object.entries(selected)) {
          check(market && state.enabled === true, 'Disabled or unbound QuickStark configuration remains untouched.');
          const name = id.slice(0, -'@quickstark'.length);
          if (!packages.some(pkg => pkg.name === name)) packages.push({ name, configurationOnly: true,
            cacheSnapshot: await captureBackup(path.join(paths.codexHomeDirectory, 'plugins/cache/quickstark', name)) });
        }
      }
      const home = agent === 'codex' ? paths.codexHomeDirectory : paths.claudeHomeDirectory;
      targets.push(path.join(home, agent === 'codex' ? 'config.toml' : 'settings.json'), path.join(home, 'plugins/cache/quickstark'));
      if (agent === 'claude-code') targets.push(path.join(home, 'plugins/installed_plugins.json'), path.join(home, 'plugins/known_marketplaces.json'));
    }
    const observed = packages.flatMap(p => p.name === 'ps-skills' ? ['qs-advanced', 'qs-skills'] : [p.name]);
    const base = (selection.targets[agent]?.packages ?? (observed.length ? [] : ['qs-skills'])).flatMap(id => id === 'ps-skills' ? ['qs-advanced', 'qs-skills'] : [id]);
    const prior = selection.targets[agent];
    const seed = { packages: [...new Set([...base, ...observed])], resources: [], profile: prior?.profile ?? null,
      additions: (prior?.additions ?? []).flatMap(id => id === 'ps-skills' ? ['qs-advanced', 'qs-skills'] : [id]) };
    const selected = resolveTargetSelection({ agent, profiles, packageNames: TARGET_SKILL_COLLECTIONS.map(c => c.id), resourceNames: [],
      savedRecord: { ...selection, targets: { ...selection.targets, [agent]: seed } }, profile, withPackages }).selection;
    check(observed.every(id => selected.packages.includes(id)), 'Requested reduction would remove installed capabilities; they remain untouched.');
    check(!(selection.targets[agent]?.resources?.length), 'Managed standalone resources require their existing migration; automatic cache repair preserves them.');
    selection.targets[agent] = selected;
    hosts.push({ agent, options, packages, market, targets, unrelated: await unrelated(agent, options, run) });
  }
  // Validate every replacement before creating any withdrawal effect.
  onProgress('Validating accepted replacement packages before repairing installed state…');
  const release = await (runtime.validateRepairRelease ?? validateSkillRelease)({ repositoryRoot, agents, packageIds: [...new Set(agents.flatMap(a => selection.targets[a].packages))] });
  check(!previous?.continuationEvidence || release.revision === previous.continuationEvidence.nextRevision, 'Pending repair replacement revision changed before continuation.');
  const backupRoot = path.join(paths.backupRoot, `repair-${randomUUID()}`);
  await assertMigrationParents(backupRoot); await mkdir(backupRoot, { recursive: true, mode: 0o700 });
  const snapshots = [];
  for (const host of hosts) for (const target of host.targets) {
    const snapshot = await captureBackup(target); check(['absent', 'file', 'directory'].includes(snapshot.kind), 'Repair targets must be regular files or directories.');
    const destination = path.join(backupRoot, `original-${snapshots.length}`);
    if (snapshot.kind !== 'absent') {
      await cp(target, destination, { recursive: true, force: false, errorOnExist: true, preserveTimestamps: true, verbatimSymlinks: true });
      for (const entry of snapshot.entries.filter(entry => entry.kind === 'symlink')) {
        const copied = path.join(destination, entry.path);
        if (((await lstat(copied)).mode & 0o777) !== entry.mode) {
          check(process.platform === 'darwin', 'Cannot preserve original symbolic-link permissions.');
          await lchmod(copied, entry.mode);
        }
      }
      for (const entry of [...snapshot.entries].reverse().filter(entry => entry.kind !== 'symlink')) await chmod(path.join(destination, entry.path), entry.mode);
      check((await captureBackup(destination)).contentSha256 === snapshot.contentSha256, 'Repair backup differs from original bytes or permissions.');
      for (const entry of [...snapshot.entries].reverse().filter(entry => entry.kind !== 'symlink')) {
        const handle = await open(path.join(destination, entry.path), constants.O_RDONLY | constants.O_NOFOLLOW);
        try { await handle.sync(); } finally { await handle.close(); }
      }
    }
    await revalidateBackup(snapshot); snapshots.push({ snapshot, destination });
  }
  for (const snapshot of release.evidenceSnapshots ?? []) await revalidateMigrationPath(snapshot);
  const recordPath = path.join(backupRoot, 'repair.json');
  const record = { schemaVersion: 1, status: 'prepared', repositoryRoot, agents, selection, revision: release.revision, snapshots, actions: [], previousRecord: previous?.recordPath ?? null,
    ...(previous?.continuationEvidence ? { previousRecordContentSha256: previous.continuationEvidence.recordContentSha256 } : {}) };
  await save(recordPath, record);
  if (previous?.continuationEvidence) {
    for (const snapshot of previous.continuationEvidence.records) await revalidateMigrationPath(snapshot);
    for (const snapshot of previous.continuationEvidence.backups) await revalidateBackup(snapshot);
  }
  await save(pointerPath(paths), { schemaVersion: 1, repositoryRoot, agents, recordPath, selectionSha256: sha(selection) });
  onProgress(`Original QuickStark state retained at ${backupRoot}`);
  try {
    for (const entry of snapshots) await revalidateBackup(entry.snapshot);
    for (const host of hosts) {
      const { agent, options } = host;
      check(await unrelated(agent, options, run) === host.unrelated, 'Unrelated settings changed before repair; they remain preserved.');
      for (const pkg of host.packages) {
        const args = agent === 'pi' ? ['remove', pkg.source] : agent === 'codex' ? ['plugin', 'remove', `${pkg.name}@quickstark`, '--json'] : ['plugin', 'uninstall', `${pkg.name}@quickstark`, '--scope', 'user', '--keep-data'];
        record.actions.push({ agent, packageId: pkg.name, operation: 'withdraw', status: 'attempted' }); await save(recordPath, record);
        if (pkg.cacheSnapshot) await revalidateBackup(pkg.cacheSnapshot);
        await run(options.command, args, options);
        check(await unrelated(agent, options, run) === host.unrelated, 'Native manager changed unrelated state; originals and recovery records are retained.');
        record.actions.at(-1).status = 'complete'; await save(recordPath, record);
      }
      if (agent !== 'pi') {
        const home = agent === 'codex' ? paths.codexHomeDirectory : paths.claudeHomeDirectory;
        const cache = path.join(home, 'plugins/cache/quickstark');
        const remaining = await captureBackup(cache);
        if (remaining.kind !== 'absent') { await revalidateBackup(remaining); await rename(cache, path.join(backupRoot, `${agent}-retained-cache`)); }
        const newRoot = agent === 'codex' ? path.join(repositoryRoot, 'codex') : repositoryRoot;
        const oldRoot = agent === 'codex' ? host.market?.root : host.market?.path;
        if (host.market && oldRoot !== newRoot) {
          record.actions.push({ agent, operation: 'marketplace-remove', status: 'attempted' }); await save(recordPath, record);
          await run(options.command, ['plugin', 'marketplace', 'remove', 'quickstark', ...(agent === 'claude-code' ? ['--scope', 'user'] : [])], options);
          record.actions.at(-1).status = 'complete'; await save(recordPath, record);
        }
        if (!host.market || oldRoot !== newRoot) {
          record.actions.push({ agent, operation: 'marketplace-add', source: newRoot, status: 'attempted' }); await save(recordPath, record);
          await run(options.command, ['plugin', 'marketplace', 'add', newRoot], options);
          record.actions.at(-1).status = 'complete'; await save(recordPath, record);
        }
        check(await unrelated(agent, options, run) === host.unrelated, 'Marketplace repair changed unrelated state; recovery records are retained.');
      }
    }
    record.status = 'prepared-for-install'; await save(recordPath, record);
    return { ...record, recordPath, backupRoot };
  } catch (error) { record.status = 'failed'; record.error = error.message; await save(recordPath, record); error.repairJournalPath = recordPath; throw error; }
}

export async function completeManagedRepair({ paths, record }) {
  const pending = await read(pointerPath(paths), null);
  if (pending.value?.recordPath !== record.recordPath) return;
  const actual = await read(record.recordPath, undefined, maximumRepairRecordBytes); actual.value.status = 'complete'; await save(record.recordPath, actual.value);
  await revalidateMigrationPath(pending.snapshot); await unlink(pointerPath(paths));
}
