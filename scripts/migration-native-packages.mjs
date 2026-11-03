import { createHash, randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { constants } from 'node:fs';
import { cp, lstat, mkdir, open, readdir, rm, rename, unlink, rmdir } from 'node:fs/promises';
import path from 'node:path';
import { captureLegacyClaudeCore } from './claude-core-migration.mjs';
import { adoptionSourceContentSha256 } from './adoption-acceptance.mjs';
import { captureMigrationPath, assertMigrationParents, revalidateMigrationPath, migrationSnapshotMatches } from './migration-filesystem.mjs';

const execute = promisify(execFile);
const check = (condition, message) => { if (!condition) throw new Error(message); };
const stable = (value) => JSON.stringify(value, function (key, entry) { return entry && typeof entry === 'object' && !Array.isArray(entry) ? Object.fromEntries(Object.keys(entry).sort().map((name) => [name, entry[name]])) : entry; });
const sha = (value) => createHash('sha256').update(value).digest('hex');
const digest = (value) => sha(stable(value));
const absolute = (value) => typeof value === 'string' && path.isAbsolute(value) && path.normalize(value) === value && value !== path.parse(value).root && !/[\0-\x1f]/.test(value);
const within = (file, root) => file.startsWith(root + path.sep);
const optional = (file) => lstat(file).catch((error) => error.code === 'ENOENT' ? null : Promise.reject(error));
const shortSnapshot = (snapshot) => ({ path: snapshot.path, kind: snapshot.kind, ...(snapshot.contentSha256 ? { contentSha256: snapshot.contentSha256 } : {}) });
const same = (first, second) => digest(first) === digest(second);
function parseMetadata(text) { try { return JSON.parse(text); } catch { throw new Error('Native metadata contains invalid JSON; contents withheld.'); } }

async function boundedRead(file, maximum = 1024 * 1024) {
  await assertMigrationParents(file);
  const before = await lstat(file);
  check(before.isFile() && !before.isSymbolicLink() && before.nlink === 1 && before.size <= maximum, 'Native metadata must be bounded regular unlinked files.');
  const handle = await open(file, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const opened = await handle.stat(); check(opened.ino === before.ino && opened.dev === before.dev, 'Native metadata changed while opening.');
    const buffer = Buffer.alloc(maximum + 1); let size = 0;
    while (size < buffer.length) { const read = await handle.read(buffer, size, buffer.length - size, null); if (!read.bytesRead) break; size += read.bytesRead; }
    const after = await handle.stat(); const named = await lstat(file);
    check(size === before.size && size <= maximum && after.size === before.size && after.mtimeMs === before.mtimeMs && after.ctimeMs === before.ctimeMs && named.ino === before.ino && named.dev === before.dev && named.nlink === 1, 'Native metadata changed during inspection.');
    return buffer.subarray(0, size);
  } finally { await handle.close(); }
}

/** No shell, bounded output, isolated path overrides, and no command output in errors. */
export async function runNativePackageCommand(command, args, { homeDirectory, codexHomeDirectory = path.join(homeDirectory, '.codex'), claudeHomeDirectory = path.join(homeDirectory, '.claude'), piHomeDirectory = path.join(homeDirectory, '.pi/agent'), cwd, timeout = 30000 } = {}) {
  check(absolute(homeDirectory) && absolute(codexHomeDirectory) && absolute(cwd) && absolute(claudeHomeDirectory) && absolute(piHomeDirectory), 'Explicit native user/Codex homes and working directory required.');
  const environment = { ...process.env, HOME: homeDirectory, USERPROFILE: homeDirectory, CODEX_HOME: codexHomeDirectory, CLAUDE_CONFIG_DIR: claudeHomeDirectory, PI_CODING_AGENT_DIR: piHomeDirectory, PI_OFFLINE: '1', PI_TELEMETRY: '0' };
  // Native package management must not inherit the parent workload identity.
  // Remove the complete triple; partial identity configuration can fail auth.
  delete environment.OPENAI_IDENTITY_TOKEN_FILE;
  delete environment.OPENAI_FEDERATION_RULE_ID;
  delete environment.OPENAI_WORKLOAD_IDENTITY_CONTEXT;
  try {
    return await execute(command, args, { cwd, encoding: 'utf8', timeout, killSignal: 'SIGKILL', maxBuffer: 4 * 1024 * 1024,
      env: environment });
  } catch (error) {
    if (error.code === 'ENOENT') throw new Error(`Required ${path.basename(command)} CLI is unavailable on PATH; install or expose the selected host CLI before retrying.`);
    throw new Error(`Native ${path.basename(command)} ${args[0]} command failed (${error.code ?? error.signal ?? 'unknown'}); output withheld.`); }
}

function optionsFor(options) {
  check(['codex', 'claude-code', 'pi'].includes(options.host) && absolute(options.homeDirectory) && absolute(options.cwd), 'Explicit supported native host and isolated/resolved paths required.');
  check(Array.isArray(options.packages) && options.packages.length > 0 && options.packages.length <= 32, 'Bounded owned package bindings required.');
  const ids = new Set();
  for (const pkg of options.packages) {
    check(pkg && /^[a-z0-9][a-z0-9-]*$/.test(pkg.id) && !ids.has(pkg.id), 'Unique package binding ID required.'); ids.add(pkg.id);
    check(/^[a-z0-9][a-z0-9-]*$/.test(pkg.name) && typeof pkg.version === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9.+-]*$/.test(pkg.version) && absolute(pkg.source) && /^[a-f0-9]{64}$/.test(pkg.payloadSha256), 'Exact package source/version/full payload digest required.');
    check(typeof pkg.ownershipRecord === 'string' && pkg.ownershipRecord.length > 0 && Array.isArray(pkg.publicNames) && pkg.publicNames.length > 0 && pkg.publicNames.every((name) => /^[a-z0-9][a-z0-9-]*$/.test(name)) && new Set(pkg.publicNames).size === pkg.publicNames.length, 'Package ownership and exact public names required.');
    check(!pkg.legacyRootCore || options.host === 'claude-code' && pkg.name === 'qs-skills' && pkg.installedOnly === true, 'Legacy root layout is restricted to installed Claude core.');
    if (options.host !== 'pi') check(/^[a-z0-9][a-z0-9-]*$/.test(pkg.marketplace) && absolute(pkg.marketplaceRoot), 'Codex package requires an exact local marketplace binding.');
  }
  check(new Set(options.packages.map((pkg) => options.host !== 'pi' ? `${pkg.name}@${pkg.marketplace}/${pkg.version}` : pkg.source)).size === options.packages.length, 'Package selector/version bindings must be unique within an adapter.');
  check(options.packages.every((pkg) => !pkg.installedOnly || options.host !== 'pi'), 'Installed-cache-only bindings are specific to Codex.');
  const codexHomeDirectory = options.codexHomeDirectory ?? path.join(options.homeDirectory, '.codex');
  check(absolute(codexHomeDirectory), 'Explicit normalized Codex home required.');
  const claudeHomeDirectory = options.claudeHomeDirectory ?? path.join(options.homeDirectory, '.claude');
  const piHomeDirectory = options.piHomeDirectory ?? path.join(options.homeDirectory, '.pi/agent');
  check(absolute(claudeHomeDirectory) && absolute(piHomeDirectory), 'Explicit normalized Claude and Pi homes required.');
  return { ...options, codexHomeDirectory, claudeHomeDirectory, piHomeDirectory, packages: JSON.parse(JSON.stringify(options.packages)), runCommand: options.runCommand ?? runNativePackageCommand, command: options.command ?? (options.host === 'claude-code' ? 'claude' : options.host),
    configPath: options.host === 'codex' ? path.join(codexHomeDirectory, 'config.toml') : path.join(options.host === 'claude-code' ? claudeHomeDirectory : piHomeDirectory, 'settings.json') };
}
const selector = (options, pkg) => options.host !== 'pi' ? `${pkg.name}@${pkg.marketplace}` : pkg.source;


export function nativePackageOwnedTargets(options) {
  const config = options.host === 'codex' ? path.join(options.codexHomeDirectory, 'config.toml')
    : path.join(options.host === 'claude-code' ? options.claudeHomeDirectory ?? path.join(options.homeDirectory, '.claude') : options.piHomeDirectory ?? path.join(options.homeDirectory, '.pi/agent'), 'settings.json');
  return [{ path: config, ownershipRecord: options.packages[0].ownershipRecord },
    ...(options.host === 'claude-code' ? [{ path: path.join(options.claudeHomeDirectory ?? path.join(options.homeDirectory, '.claude'), 'plugins/installed_plugins.json'), ownershipRecord: options.packages[0].ownershipRecord }] : []),
    ...(options.host !== 'pi' ? options.packages.map((pkg) => ({ path: path.join(options.host === 'codex' ? options.codexHomeDirectory : (options.claudeHomeDirectory ?? path.join(options.homeDirectory, '.claude')), 'plugins/cache', pkg.marketplace, pkg.name, pkg.version, ...(pkg.legacyRootCore ? ['.orphaned_at'] : [])), ownershipRecord: pkg.ownershipRecord })) : [])];
}

// Native copiers recreate directories under the destination umask. Compare
// copied payloads with Git executable-bit semantics; local backups retain full modes.
export function nativePayloadSha256(host, snapshot) {
  return host === 'codex' || host === 'claude-code' ? adoptionSourceContentSha256(snapshot) : snapshot.contentSha256;
}

// Deliberately narrow managed-package contract: generated skills-only packages,
// literal ./skills roots, no hooks/dependencies/extensions or executable install code.
export async function inspectNativePayload(host, root) {
  const snapshot = await captureMigrationPath(root);
  check(snapshot.kind === 'directory', 'Native package payload must be a real directory.');
  const manifest = parseMetadata((await boundedRead(path.join(root, host === 'codex' ? '.codex-plugin/plugin.json' : host === 'claude-code' ? '.claude-plugin/plugin.json' : 'package.json'))).toString());
  check(typeof manifest.name === 'string' && typeof manifest.version === 'string', 'Native package manifest identity required.');
  if (host === 'codex') check(['./skills/', './skills', 'skills'].includes(manifest.skills) && !['hooks', 'mcpServers', 'apps'].some((key) => manifest[key]), 'Only literal skills-only Codex packages are supported.');
  else if (host === 'claude-code') check(Array.isArray(manifest.skills) && manifest.skills.length > 0 && manifest.skills.every((skill) => /^\.\/skills\/[a-z0-9-]+$/.test(skill)) && !['hooks', 'mcpServers', 'commands', 'agents', 'dependencies'].some((key) => manifest[key]), 'Only explicit skills-only Claude packages are supported.');
  else check(!manifest.scripts && !manifest.dependencies && !manifest.devDependencies && manifest.pi && same(manifest.pi.skills, ['./skills']) && Object.keys(manifest.pi).every((key) => key === 'skills'), 'Only literal skills-only Pi packages are supported.');
  const rootSkills = path.join(root, 'skills'); const commands = [];
  for (const entry of snapshot.entries.filter((entry) => entry.kind === 'file' && entry.path.startsWith('skills/') && entry.path.endsWith('/SKILL.md'))) {
    check(entry.path.split('/').length === 3, 'Nested discoverable SKILL.md requires explicit package closure review.');
    const text = (await boundedRead(path.join(root, entry.path), 256 * 1024)).toString();
    const front = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)?.[1];
    const name = front?.match(/^name:\s*([a-z0-9][a-z0-9-]*)\s*$/m)?.[1];
    check(name && name === entry.path.split('/')[1] && /^description:\s*\S/m.test(front), 'Discovered skill identity/description is invalid.'); commands.push(name);
  }
  if (host === 'claude-code') check(same([...manifest.skills].sort(), commands.map((name) => `./skills/${name}`).sort()), 'Claude manifest skills differ from the payload.');
  check(commands.length > 0 && new Set(commands).size === commands.length, 'Native package must expose distinct public roots.');
  // Top-level markdown is also discoverable by Pi; reject rather than ignore it.
  check(!snapshot.entries.some((entry) => entry.kind === 'file' && entry.path.startsWith('skills/') && entry.path.split('/').length === 2 && entry.path.endsWith('.md')), 'Unexpected top-level skill discovery file.');
  check((await optional(rootSkills))?.isDirectory(), 'Skills directory unavailable.');
  check(same(shortSnapshot(await captureMigrationPath(root)), shortSnapshot(snapshot)), 'Native payload changed during discovery.');
  return { name: manifest.name, version: manifest.version, publicNames: commands.sort(), payloadSha256: nativePayloadSha256(host, snapshot), snapshot: shortSnapshot(snapshot) };
}

export function codexConfig(text, packages) {
  check(!text.includes('"""') && !text.includes("'''"), 'Multiline TOML requires a separately verified native config adapter.');
  const owned = new Set(packages.map((pkg) => `${pkg.name}@${pkg.marketplace}`));
  const selected = {}; const opaque = []; let current = null;
  for (const line of text.split(/\r?\n/)) {
    if (/^\s*\[/.test(line)) {
      const match = line.match(/^\s*\[plugins\."([a-z0-9-]+@[a-z0-9-]+)"\]\s*$/);
      current = match && owned.has(match[1]) ? match[1] : null;
      if (current) { check(!Object.hasOwn(selected, current), 'Duplicate owned Codex configuration table.'); selected[current] = {}; continue; }
    }
    if (current) {
      if (!line.trim()) continue;
      const enabled = line.match(/^\s*enabled\s*=\s*(true|false)\s*$/);
      check(enabled && !Object.hasOwn(selected[current], 'enabled'), 'Owned Codex table contains settings unsupported by reversible migration.'); selected[current].enabled = enabled[1] === 'true';
    } else if (line.trim()) opaque.push(line);
  }
  for (const value of Object.values(selected)) check(typeof value.enabled === 'boolean', 'Owned Codex table lacks explicit enablement.');
  return { selected, unrelatedHash: digest(opaque) };
}

async function commandJson(options, args) {
  const result = await options.runCommand(options.command, args, options);
  check(typeof result.stdout === 'string' && Buffer.byteLength(result.stdout) <= 4 * 1024 * 1024, 'Native inventory output is unavailable or exceeds bounds.');
  try { return JSON.parse(result.stdout); } catch { throw new Error('Native inventory returned invalid JSON; output withheld.'); }
}

// A bare Codex list refreshes remote catalogs. Local package management scopes
// its native queries to the managed marketplaces; other caches remain opaque
// preservation/collision evidence, never ownership or adoption authority.
export async function listCodexPlugins(options, marketplaces = ['quickstark']) {
  const installed = new Map();
  for (const marketplace of [...new Set(marketplaces)].sort()) {
    check(/^[a-z0-9][a-z0-9-]*$/.test(marketplace), 'Literal native marketplace required.');
    const data = await commandJson({ ...options, command: options.command ?? 'codex', runCommand: options.runCommand ?? runNativePackageCommand }, ['plugin', 'list', '--marketplace', marketplace, '--json']);
    check(Array.isArray(data.installed), 'Native Codex installed inventory is unsupported.');
    for (const entry of data.installed) {
      check(typeof entry.pluginId === 'string', 'Native Codex installed identity is missing.');
      check(!installed.has(entry.pluginId) || same(installed.get(entry.pluginId), entry), 'Native Codex inventories disagree.');
      installed.set(entry.pluginId, entry);
    }
  }
  return { installed: [...installed.values()], available: [] };
}

export async function captureCodexForeignCaches(codexHomeDirectory, managedMarketplaces = ['quickstark']) {
  const root = path.join(codexHomeDirectory, 'plugins/cache');
  await assertMigrationParents(path.join(root, '.guard'));
  const options = { allowDescendantSymlinks: true, limits: { entries: 131072, bytes: 2 * 1024 * 1024 * 1024, depth: 64 } };
  const foreignNames = async () => (await readdir(root).catch(error => error.code === 'ENOENT' ? [] : Promise.reject(error)))
    .filter(name => /^[a-z0-9][a-z0-9-]*$/.test(name) && !managedMarketplaces.includes(name)).sort();
  const namespaces = await foreignNames(); const snapshots = []; const records = []; const publicNames = new Set(); let complete = true;
  for (const namespace of namespaces) {
    const snapshot = await captureMigrationPath(path.join(root, namespace), options); snapshots.push(snapshot);
    records.push({ namespace, kind: snapshot.kind, contentSha256: snapshot.contentSha256 ?? null });
    if (snapshot.kind !== 'directory') { complete = false; continue; }
    for (const entry of snapshot.entries) {
      if (entry.kind === 'symlink') {
        complete = false;
        const candidate = entry.path.match(/(?:^|\/)skills\/([a-z0-9-]+)(?:\/SKILL\.md)?$/)?.[1];
        if (candidate) publicNames.add(candidate);
      } else if (entry.kind === 'file' && entry.path.endsWith('/SKILL.md')) {
        const text = (await boundedRead(path.join(snapshot.path, entry.path), 256 * 1024)).toString();
        const name = text.match(/^name:\s*([a-z0-9-]+)\s*$/m)?.[1]; if (name) publicNames.add(name);
      }
    }
  }
  for (const snapshot of snapshots) await revalidateMigrationPath(snapshot, options);
  check(same(namespaces, await foreignNames()), 'Unrelated Codex cache namespaces changed during inspection.');
  return { hash: digest(records), publicNames: [...publicNames].sort(), complete };
}

/** Actual state excludes inode and harmless selected-table placement/JSON spacing.
 * Full raw config/payload snapshots remain available separately as evidence.
 * Unrelated config/package ordering remains part of the comparison.
 */
export async function observeNativePackages(input) {
  const options = optionsFor(input); const { packages, host, configPath } = options;
  const configSnapshot = await captureMigrationPath(configPath); check(['file', 'absent'].includes(configSnapshot.kind), 'Native config must be a regular file.');
  const mutableSnapshots = [configSnapshot];
  const payloadSnapshots = [];
  const bytes = configSnapshot.kind === 'absent' ? Buffer.alloc(0) : await boundedRead(configPath);
  const sourcePayloads = [];
  for (const pkg of packages) {
    if (pkg.installedOnly) { sourcePayloads.push({ id: pkg.id, name: pkg.name, version: pkg.version, publicNames: [...pkg.publicNames].sort(), role: 'installed-cache', expectedPayloadSha256: pkg.payloadSha256 }); continue; }
    const actual = await inspectNativePayload(host, pkg.source);
    check(actual.name === pkg.name && actual.version === pkg.version && same(actual.publicNames, [...pkg.publicNames].sort()) && actual.payloadSha256 === pkg.payloadSha256, 'Owned package source changed or disagrees with approved binding.');
    sourcePayloads.push({ id: pkg.id, ...actual });
  }
  let config; let registrations; let unrelated; let foreignCaches; let unrelatedDiscoveryComplete = true; const active = []; const caches = [];
  if (host === 'codex') {
    config = codexConfig(bytes.toString(), packages);
    const inventory = await listCodexPlugins(options, packages.map(pkg => pkg.marketplace));
    const markets = await commandJson(options, ['plugin', 'marketplace', 'list', '--json']);
    check(Array.isArray(inventory.installed) && Array.isArray(markets.marketplaces), 'Native Codex inventory shape is unsupported.');
    registrations = inventory.installed;
    for (const pkg of packages) {
      const market = markets.marketplaces.filter((entry) => entry.name === pkg.marketplace);
      check(market.length === 1 && market[0].marketplaceSource?.sourceType === 'local' && market[0].marketplaceSource.source === pkg.marketplaceRoot && market[0].root === pkg.marketplaceRoot, 'Codex marketplace source changed; separate marketplace transaction required.');
      if (!pkg.installedOnly) {
        const manifest = parseMetadata((await boundedRead(path.join(pkg.marketplaceRoot, '.agents/plugins/marketplace.json'))).toString());
        const definitions = manifest.plugins?.filter((entry) => entry.name === pkg.name);
        check(manifest.name === pkg.marketplace && definitions?.length === 1 && definitions[0].source?.source === 'local' && typeof definitions[0].source.path === 'string' && path.resolve(pkg.marketplaceRoot, definitions[0].source.path) === pkg.source, 'Codex marketplace package mapping changed.');
      }
      const matchingSelector = registrations.filter((entry) => entry.pluginId === selector(options, pkg)); check(matchingSelector.length <= 1, 'Duplicate native package registration.');
      const installed = matchingSelector.filter((entry) => entry.version === pkg.version);
      check(!matchingSelector.length || packages.some((candidate) => selector(options, candidate) === selector(options, pkg) && candidate.version === matchingSelector[0].version), 'Installed native version has no approved binding.');
      const cache = path.join(options.codexHomeDirectory, 'plugins/cache', pkg.marketplace, pkg.name, pkg.version);
      const cacheParent = path.dirname(cache);
      if (await optional(cacheParent)) {
        const tree = await captureMigrationPath(cacheParent);
        check(tree.kind === 'directory', 'Native package cache parent is unsafe.');
        const knownVersions = new Set(packages.filter((binding) => selector(options, binding) === selector(options, pkg)).map((binding) => binding.version));
        check(tree.entries.every((entry) => !entry.path || knownVersions.has(entry.path.split('/')[0])), 'Unowned cache residue would be removed by the native manager; retain and replan.');
      }
      const cacheSnapshot = await captureMigrationPath(cache); check(['directory', 'absent'].includes(cacheSnapshot.kind), 'Owned native cache is not a regular payload directory.');
      caches.push({ id: pkg.id, ...shortSnapshot(cacheSnapshot), ...(cacheSnapshot.kind === 'directory' ? { contentSha256: nativePayloadSha256(host, cacheSnapshot) } : {}) });
      if (!installed.length) { check((matchingSelector.length || !Object.hasOwn(config.selected, selector(options, pkg))) && cacheSnapshot.kind === 'absent', 'Unregistered owned package/cache requires explicit reconciliation.'); continue; }
      const item = installed[0];
      check(item.installed === true && item.enabled === true && config.selected[selector(options, pkg)]?.enabled === true && item.version === pkg.version && item.source?.source === 'local' && item.source.path === pkg.source, 'Native Codex installed source/version/enablement conflicts with binding.');
      const payload = await inspectNativePayload(host, cache);
      check(payload.payloadSha256 === pkg.payloadSha256 && same(payload.publicNames, [...pkg.publicNames].sort()), 'Native installed cache differs from verified source.');
      active.push({ id: pkg.id, source: pkg.source, version: payload.version, publicNames: payload.publicNames });
    }
    unrelated = registrations.filter((item) => !packages.some((pkg) => item.pluginId === selector(options, pkg)));
    // Validate all native cache names for collisions without claiming their ownership.
    for (const item of unrelated) {
      if (!/^[a-z0-9-]+$/.test(item.marketplaceName) || !/^[a-z0-9-]+$/.test(item.name) || !/^[a-zA-Z0-9.+-]+$/.test(item.version)) { unrelatedDiscoveryComplete = false; continue; }
      if (item.enabled === false) continue;
      const root = path.join(options.codexHomeDirectory, 'plugins/cache', item.marketplaceName, item.name, item.version);
      let snapshot; try { snapshot = await captureMigrationPath(root); } catch { unrelatedDiscoveryComplete = false; continue; }
      if (snapshot.kind !== 'directory') { unrelatedDiscoveryComplete = false; continue; }
      const names = [];
      for (const entry of snapshot.entries.filter((entry) => entry.kind === 'file' && entry.path.endsWith('/SKILL.md'))) {
        const text = (await boundedRead(path.join(root, entry.path), 256 * 1024)).toString(); const name = text.match(/^name:\s*([a-z0-9-]+)\s*$/m)?.[1]; if (name) names.push(name);
      }
      item.observedPublicNames = names.sort(); item.payloadSha256 = snapshot.contentSha256;
    }
    foreignCaches = await captureCodexForeignCaches(options.codexHomeDirectory, packages.map(pkg => pkg.marketplace));
    unrelatedDiscoveryComplete &&= foreignCaches.complete;
  } else if (host === 'claude-code') {
    const settings = bytes.length ? parseMetadata(bytes.toString()) : {};
    check(settings && typeof settings === 'object' && !Array.isArray(settings) && (!settings.enabledPlugins || typeof settings.enabledPlugins === 'object' && !Array.isArray(settings.enabledPlugins)), 'Claude settings shape is unsupported.');
    const metadataPath = path.join(options.claudeHomeDirectory ?? path.join(options.homeDirectory, '.claude'), 'plugins/installed_plugins.json');
    const metadataSnapshot = await captureMigrationPath(metadataPath);
    check(['file', 'absent'].includes(metadataSnapshot.kind), 'Claude installed metadata must be a regular file.');
    mutableSnapshots.push(metadataSnapshot);
    const metadata = metadataSnapshot.kind === 'file' ? parseMetadata((await boundedRead(metadataPath)).toString()) : { version: 2, plugins: {} };
    check(metadata.version === 2 && metadata.plugins && typeof metadata.plugins === 'object' && !Array.isArray(metadata.plugins), 'Claude installed metadata shape is unsupported.');
    registrations = await commandJson(options, ['plugin', 'list', '--json']);
    const markets = await commandJson(options, ['plugin', 'marketplace', 'list', '--json']);
    check(Array.isArray(registrations) && Array.isArray(markets), 'Native Claude inventory shape is unsupported.');
    const selected = {};
    for (const pkg of packages) {
      const market = markets.filter((entry) => entry.name === pkg.marketplace);
      check(market.length === 1 && market[0].source === 'directory' && market[0].path === pkg.marketplaceRoot && market[0].installLocation === pkg.marketplaceRoot, 'Claude marketplace must reference the verified local checkout; register it explicitly with claude plugin marketplace add.');
      if (!pkg.installedOnly) {
        const catalog = parseMetadata((await boundedRead(path.join(pkg.marketplaceRoot, '.claude-plugin/marketplace.json'))).toString());
        const definitions = catalog.plugins?.filter((entry) => entry.name === pkg.name);
        check(catalog.name === pkg.marketplace && definitions?.length === 1 && typeof definitions[0].source === 'string' && definitions[0].source.startsWith('./') && path.resolve(pkg.marketplaceRoot, definitions[0].source) === pkg.source, 'Claude marketplace package mapping changed.');
      }
      const key = selector(options, pkg);
      const matches = registrations.filter((entry) => entry.id === key);
      check(matches.length <= 1 && matches.every((entry) => entry.scope === 'user'), 'Claude managed plugins require one user-scoped registration; reconcile project/local registrations separately.');
      check(!matches.length || packages.some((binding) => selector(options, binding) === key && binding.version === matches[0].version), 'Installed Claude version has no approved binding.');
      const cache = path.join(options.claudeHomeDirectory, 'plugins/cache', pkg.marketplace, pkg.name, pkg.version);
      const legacy = pkg.legacyRootCore ? await captureLegacyClaudeCore(cache) : null;
      const cacheSnapshot = legacy?.snapshot ?? await captureMigrationPath(cache);
      if (legacy) {
        check(legacy.version === pkg.version && legacy.payloadSha256 === pkg.payloadSha256 && same(legacy.publicNames, [...pkg.publicNames].sort()), 'Legacy Claude core cache differs from its verified closure.');
        payloadSnapshots.push(...legacy.snapshots);
        const marker = await captureMigrationPath(path.join(cache, '.orphaned_at'));
        check(['file','absent'].includes(marker.kind), 'Legacy Claude orphan marker must be a regular file.');
        if (marker.kind === 'file') check(!matches.some((item) => item.version === pkg.version) && marker.bytes <= 32 && /^\d{10,16}$/.test((await boundedRead(marker.path,32)).toString()), 'Legacy Claude orphan marker conflicts with registration.');
        mutableSnapshots.push(marker);
      } else mutableSnapshots.push(cacheSnapshot);
      check(['directory', 'absent'].includes(cacheSnapshot.kind), 'Claude cache must be a regular payload directory.');
      let cacheHash = cacheSnapshot.kind === 'directory' ? nativePayloadSha256(host, cacheSnapshot) : undefined;
      if (cacheSnapshot.kind === 'directory') {
        // Claude marks retained uninstalled caches with a timestamp; it is manager metadata,
        // not source payload. Every other path and byte must still match the release.
        const orphan = cacheSnapshot.entries.find((entry) => entry.path === '.orphaned_at');
        if (orphan) {
          check(orphan.kind === 'file' && orphan.bytes <= 32 && !matches.some((item) => item.version === pkg.version), 'Claude orphan marker conflicts with active registration.');
          check(/^\d{10,16}$/.test((await boundedRead(path.join(cache, '.orphaned_at'), 32)).toString()), 'Claude orphan marker is invalid.');
          cacheHash = nativePayloadSha256(host, {...cacheSnapshot,entries:cacheSnapshot.entries.filter((entry) => entry.path !== '.orphaned_at')});
        }
        check(cacheHash === pkg.payloadSha256, 'Claude cached payload differs from the verified release; preserve local edits.');
      }
      caches.push({ id: pkg.id, ...shortSnapshot(cacheSnapshot), ...(cacheHash ? {contentSha256:cacheHash} : {}) });
      if (!matches.length || matches[0].version !== pkg.version) continue;
      const item = matches[0]; const recorded = metadata.plugins[key];
      check(item.enabled === true && settings.enabledPlugins?.[key] === true && item.installPath === cache && (item.readFromFolder === pkg.source || pkg.legacyRootCore && item.readFromFolder === pkg.marketplaceRoot) && cacheSnapshot.kind === 'directory'
        && Array.isArray(recorded) && recorded.length === 1 && recorded[0].scope === 'user' && recorded[0].version === pkg.version && recorded[0].installPath === cache, 'Claude installed source/version/enablement conflicts with binding.');
      const payload = legacy ?? await inspectNativePayload(host, cache);
      check(same(payload.publicNames, [...pkg.publicNames].sort()), 'Claude installed public identities differ from binding.');
      selected[key] = { enabled: true };
      active.push({ id: pkg.id, source: pkg.source, version: pkg.version, publicNames: payload.publicNames });
    }
    const owned = new Set(packages.map((pkg) => selector(options, pkg)));
    for (const key of owned) {
      check(!Object.hasOwn(settings.enabledPlugins ?? {}, key) || Object.hasOwn(selected, key), 'Unregistered or disabled Claude managed setting requires explicit reconciliation.');
      check(!Object.hasOwn(metadata.plugins, key) || Object.hasOwn(selected, key), 'Claude installed metadata lacks a matching native registration.');
    }
    unrelated = registrations.filter((entry) => !owned.has(entry.id));
    for (const item of unrelated) {
      if (item.enabled === false) continue;
      if (!absolute(item.installPath)) { unrelatedDiscoveryComplete = false; continue; }
      try {
        const snapshot = await captureMigrationPath(item.installPath);
        check(snapshot.kind === 'directory', 'Unrelated Claude payload unavailable.');
        // Bind the payload inspected for discovery, including unrelated plugins,
        // so recovery cannot adopt later edits as its immutable baseline.
        payloadSnapshots.push(snapshot);
        const names = [];
        for (const entry of snapshot.entries.filter((entry) => entry.kind === 'file' && entry.path.endsWith('/SKILL.md'))) {
          const text = (await boundedRead(path.join(item.installPath, entry.path), 256 * 1024)).toString();
          const name = text.match(/^name:\s*([a-z0-9-]+)\s*$/m)?.[1]; if (name) names.push(name);
        }
        item.observedPublicNames = names.sort(); item.payloadSha256 = snapshot.contentSha256;
      } catch { unrelatedDiscoveryComplete = false; }
    }
    const { enabledPlugins, ...other } = settings;
    const unrelatedEnabled = Object.fromEntries(Object.entries(enabledPlugins ?? {}).filter(([key]) => !owned.has(key)));
    const unrelatedMetadata = Object.fromEntries(Object.entries(metadata.plugins).filter(([key]) => !owned.has(key)));
    config = { selected, unrelatedHash: digest({ other, enabledPlugins: unrelatedEnabled, metadata: { ...metadata, plugins: unrelatedMetadata } }) };
  } else {
    const settings = bytes.length ? parseMetadata(bytes.toString()) : {}; check(settings && !Array.isArray(settings) && typeof settings === 'object' && (!Object.hasOwn(settings, 'packages') || Array.isArray(settings.packages)), 'Pi settings shape is unsupported.');
    registrations = settings.packages ?? [];
    const resolveSource = (entry) => { const source = typeof entry === 'string' ? entry : entry?.source; check(typeof source === 'string' && source.length > 0, 'Unknown Pi package source.'); return source.startsWith('.') || path.isAbsolute(source) ? path.resolve(path.dirname(configPath), source) : null; };
    const selectedEntries = registrations.filter((entry) => packages.some((pkg) => pkg.source === resolveSource(entry)));
    check(selectedEntries.every((entry) => typeof entry === 'string'), 'Filtered Pi packages require explicit filter-preserving migration; retain current entry.');
    for (const pkg of packages) {
      const matches = selectedEntries.filter((entry) => resolveSource(entry) === pkg.source); check(matches.length <= 1, 'Duplicate Pi package registration.');
      if (matches.length) active.push({ id: pkg.id, source: pkg.source, version: pkg.version, publicNames: [...pkg.publicNames].sort() });
    }
    unrelated = registrations.filter((entry) => !selectedEntries.includes(entry)).map((entry) => ({ entry, source: resolveSource(entry) }));
    for (const item of unrelated) {
      if (!item.source || typeof item.entry !== 'string') { unrelatedDiscoveryComplete = false; continue; }
      try { const payload = await inspectNativePayload(host, item.source); item.observedPublicNames = payload.publicNames; item.payloadSha256 = payload.snapshot.contentSha256; }
      catch { unrelatedDiscoveryComplete = false; }
    }
    const { packages: ignored, ...other } = settings;
    config = { selected: active.map((pkg) => pkg.source).sort(), unrelatedHash: digest({ other, packages: unrelated.map((item) => item.entry) }) };
  }
  // Independent vendor packages may share local names (Codex qualifies them by
  // plugin). Preserve every registration/payload in unrelatedHash; existing
  // vendor-to-vendor overlap must not block an unrelated managed transition.
  // Managed-to-managed and managed-to-vendor collisions still fail closed.
  const unrelatedPublicNames = [...new Set([...unrelated.flatMap((item) => item.observedPublicNames ?? []), ...(foreignCaches?.publicNames ?? [])])].sort();
  const allNames = [...active.flatMap((item) => item.publicNames), ...unrelatedPublicNames];
  check(new Set(allNames).size === allNames.length, 'Duplicate native public identities are exposed.');
  const data = { host, scope: 'native-packages-only', configPath, config, unrelatedDiscoveryComplete, unrelatedPublicNames, native: { packages: active.sort((a, b) => a.id.localeCompare(b.id)) }, sources: sourcePayloads, caches, unrelatedHash: digest(foreignCaches ? { registrations: unrelated, caches: foreignCaches.hash } : unrelated) };
  if (host === 'claude-code') for (const snapshot of [...mutableSnapshots,...payloadSnapshots]) await revalidateMigrationPath(snapshot);
  return { state: { snapshotHash: digest(data), ...data }, evidence: { mutableSnapshots, payloadSnapshots, configSnapshot, rawConfigSha256: sha(bytes), unrelatedPublicNames, unrelatedDiscoveryComplete } };
}

/** Predict only the supported one-package registration transition. Actual native
 * inspection must match this after-state; this helper provides no mutation grant. */
export function predictNativePackageTransition(before, { packageId, phase, packages }) {
  check(['withdraw', 'expose'].includes(phase), 'Only package registration transitions are predictable.');
  const { snapshotHash, ...original } = before; check(snapshotHash === digest(original), 'Observation hash is invalid.');
  const state = JSON.parse(stable(original)); const pkg = packages.find((entry) => entry.id === packageId);
  const source = state.sources.find((entry) => entry.id === packageId); check(pkg && source, 'Package is not bound by this observation.');
  const adding = phase === 'expose'; const present = state.native.packages.some((entry) => entry.id === packageId);
  check(adding !== present, 'Package transition disagrees with observed registration.');
  state.native.packages = state.native.packages.filter((entry) => entry.id !== packageId);
  if (adding) state.native.packages.push({ id: packageId, source: pkg.source, version: source.version, publicNames: source.publicNames });
  state.native.packages.sort((a, b) => a.id.localeCompare(b.id));
  const names = [...state.native.packages.flatMap((entry) => entry.publicNames), ...(state.unrelatedPublicNames ?? [])]; check(new Set(names).size === names.length, 'Predicted transition duplicates public identities.');
  if (state.host !== 'pi') {
    const key = `${pkg.name}@${pkg.marketplace}`;
    check(!adding || !Object.hasOwn(state.config.selected, key), 'An existing package version must be withdrawn before same-selector exposure.');
    if (adding) state.config.selected[key] = { enabled: true }; else delete state.config.selected[key];
    const cache = state.caches.find((entry) => entry.id === packageId); check(cache, 'Cache binding unavailable.');
    if (adding || state.host === 'codex') { cache.kind = adding ? 'directory' : 'absent'; if (adding) cache.contentSha256 = pkg.payloadSha256; else delete cache.contentSha256; }
  } else state.config.selected = state.native.packages.map((entry) => entry.source).sort();
  return { snapshotHash: digest(state), ...state };
}

async function writeDurable(file, contents) { const handle = await open(file, 'wx', 0o600); try { await handle.writeFile(contents); await handle.sync(); } finally { await handle.close(); } }

async function syncTree(root) {
  const metadata = await lstat(root);
  if (metadata.isDirectory()) for (const child of await readdir(root)) await syncTree(path.join(root, child));
  const handle = await open(root, constants.O_RDONLY); try { await handle.sync(); } finally { await handle.close(); }
}

/** Package-only adapter. Parent stages sources, registers marketplaces and owns
 * payload retirement/selection steps. This never changes marketplace registrations.
 */
export function createNativePackageAdapter(input) {
  const options = optionsFor(input); check(absolute(options.backupRoot), 'Explicit backup root required.');
  check([options.codexHomeDirectory, (options.claudeHomeDirectory ?? path.join(options.homeDirectory, '.claude')), options.piHomeDirectory].every((root) => options.backupRoot !== root && !within(options.backupRoot, root) && !within(root, options.backupRoot)), 'Backups must remain outside host discovery roots.');
  check(options.packages.every((pkg) => options.backupRoot !== pkg.source && !within(options.backupRoot, pkg.source) && !within(pkg.source, options.backupRoot)), 'Backups must remain separate from bound source payloads.');
  const contextCheck = (step, context) => {
    check(context && /^[a-z0-9][a-z0-9-]*$/.test(context.transactionId) && /^[a-z0-9][a-z0-9-]*$/.test(step.id), 'Bounded transaction/step identity required.');
    check(['withdraw', 'expose'].includes(step.phase) && step.operation === `native-${step.phase}` && step.native?.host === options.host, 'Native adapter only accepts explicit package withdrawal/exposure.');
    const pkg = options.packages.find((item) => item.id === step.native.packageId); check(pkg, 'Step package lacks approved ownership binding.');
    const allowed = new Set(nativePackageOwnedTargets(options).map((target) => target.path));
    const required = [options.configPath, ...(options.host !== 'pi' ? [path.join(options.host === 'codex' ? options.codexHomeDirectory : (options.claudeHomeDirectory ?? path.join(options.homeDirectory, '.claude')), 'plugins/cache', pkg.marketplace, pkg.name, pkg.version, ...(pkg.legacyRootCore ? ['.orphaned_at'] : []))] : [])];
    check(step.ownedTargets.length === allowed.size && new Set(step.ownedTargets.map((target) => target.path)).size === allowed.size && step.ownedTargets.every((target) => allowed.has(target.path)), 'Native step ownership must cover the exact config and all bound cache targets.');
    check(required.every((file) => step.ownedTargets.some((target) => target.path === file && target.ownershipRecord === pkg.ownershipRecord)), 'Native effect targets/ownership do not bind config and cache.');
    return pkg;
  };
  const inspect = async () => (await observeNativePackages(options)).state;
  const backupReference = (step, context) => path.join(options.backupRoot, context.transactionId, step.id);
  const inspectBackup = async (step, reference, context) => {
    contextCheck(step, context); check(reference === backupReference(step, context), 'Backup reference escaped its transaction.');
    const snapshot = await captureMigrationPath(reference); check(snapshot.kind === 'directory', 'Native backup directory unavailable.');
    const receipt = parseMetadata((await boundedRead(path.join(reference, 'receipt.json'))).toString());
    check(receipt.transactionId === context.transactionId && receipt.stepId === step.id && receipt.packageId === step.native.packageId && receipt.beforeHash === digest(step.before) && same(receipt.targets, step.ownedTargets) && Array.isArray(receipt.snapshots) && receipt.snapshots.length === step.ownedTargets.length, 'Backup receipt does not bind this operation.');
    for (let index = 0; index < receipt.snapshots.length; index++) {
      const expected = receipt.snapshots[index]; const copied = await captureMigrationPath(path.join(reference, `target-${index}`));
      check(copied.kind === expected.kind && copied.contentSha256 === expected.contentSha256, 'Native backup target changed or is incomplete.');
    }
    if (options.host === 'codex' && step.phase === 'withdraw') {
      const pkg = options.packages.find((binding) => binding.id === step.native.packageId);
      const payload = await inspectNativePayload('codex', path.join(reference, 'market/payload'));
      check(payload.version === pkg.version && payload.name === pkg.name && payload.payloadSha256 === pkg.payloadSha256, 'Recovery marketplace payload differs from the old cache.');
      const market = parseMetadata((await boundedRead(path.join(reference, 'market/.agents/plugins/marketplace.json'))).toString());
      check(same(market, { name: pkg.marketplace, plugins: [{ name: pkg.name, source: { source: 'local', path: './payload' } }] }), 'Recovery marketplace binding changed.');
    }
    return { backupSha256: snapshot.contentSha256, receiptHash: digest(receipt) };
  };
  async function prepareRecovery(step, reference, context) {
    const backup = await inspectBackup(step, reference, context);
    const observation = await observeNativePackages(options);
    check(same(observation.state, step.after), 'Claude state changed before recovery.');
    check(observation.evidence.unrelatedDiscoveryComplete, 'Active unrelated plugin payloads must be inspectable before Claude recovery.');
    const receipt = parseMetadata((await boundedRead(path.join(reference, 'receipt.json'))).toString());
    const targets = [];
    for (let index = 0; index < step.ownedTargets.length; index++) {
      const target = step.ownedTargets[index].path;
      const after = observation.evidence.mutableSnapshots.find((snapshot) => snapshot.path === target);
      check(after, 'Claude recovery requires original snapshots for every owned target.');
      const before = receipt.snapshots[index];
      const entry = { before, after, backupPath: path.join(reference, `target-${index}`) };
      if (before.kind === 'directory') {
        // Native Claude retains caches. Only its orphan marker changes on withdrawal
        // or re-exposure; never delete and recopy an intact retained payload.
        const saved = await captureMigrationPath(entry.backupPath);
        check(after.kind === 'directory' && same(saved.entries.filter((item) => item.path !== '.orphaned_at'), after.entries.filter((item) => item.path !== '.orphaned_at')), 'Claude recovery cannot replace changed retained cache bytes.');
        const markerPath = path.join(target, '.orphaned_at');
        const backupPath = path.join(entry.backupPath, '.orphaned_at');
        const savedMarker = await captureMigrationPath(backupPath);
        check(['file', 'absent'].includes(savedMarker.kind), 'Claude recovery orphan marker must be regular.');
        entry.marker = { before: { ...shortSnapshot(savedMarker), path: markerPath }, backupPath };
      }
      targets.push(entry);
    }
    const immutable = [...observation.evidence.payloadSnapshots];
    for (const source of new Set(options.packages.filter((pkg) => !pkg.installedOnly).map((pkg) => pkg.source))) immutable.push(await captureMigrationPath(source));
    immutable.push(await captureMigrationPath(path.join(options.claudeHomeDirectory, 'plugins/known_marketplaces.json')));
    for (const snapshot of [...targets.map((entry) => entry.after), ...immutable]) await revalidateMigrationPath(snapshot);
    const contents = stable({ schemaVersion: 1, transactionId: context.transactionId, stepId: step.id,
      beforeHash: digest(step.before), afterHash: digest(step.after), backup, targets, immutable });
    check(Buffer.byteLength(contents) <= 4 * 1024 * 1024, 'Claude recovery evidence exceeds its bound.');
    // Keep immutable backup contents unchanged. The journal binds this separate,
    // immutable receipt before any restoration, including raw after-state bytes.
    const file = `${reference}.recovery-${randomUUID()}.json`;
    await writeDurable(file, contents);
    const directory = await open(path.dirname(file), constants.O_RDONLY);
    try { await directory.sync(); } finally { await directory.close(); }
    return { path: file, snapshotHash: sha(contents) };
  }
  async function recoveryEvidence(step, reference, context) {
    contextCheck(step, context);
    const evidence = context.recovery;
    const prefix = `${backupReference(step, context)}.recovery-`;
    check(reference === backupReference(step, context) && evidence?.path?.startsWith(prefix)
      && /^[a-f0-9-]{36}\.json$/.test(evidence.path.slice(prefix.length)), 'Claude recovery evidence escaped its transaction.');
    const snapshot = await captureMigrationPath(evidence.path);
    const bytes = await boundedRead(evidence.path, 4 * 1024 * 1024);
    check(snapshot.kind === 'file' && sha(bytes) === evidence.snapshotHash, 'Claude recovery evidence changed.');
    await revalidateMigrationPath(snapshot);
    const data = parseMetadata(bytes.toString());
    check(data.schemaVersion === 1 && data.transactionId === context.transactionId && data.stepId === step.id
      && data.beforeHash === digest(step.before) && data.afterHash === digest(step.after)
      && same(data.targets.map((entry) => entry.after.path), step.ownedTargets.map((target) => target.path))
      && same(await inspectBackup(step, reference, context), data.backup), 'Claude recovery evidence does not bind the verified operation.');
    for (const original of data.immutable) await revalidateMigrationPath(original);
    return data;
  }
  async function inspectRecoveryTargets(step, reference, context) {
    const data = await recoveryEvidence(step, reference, context);
    const targets = [];
    const snapshots = [];
    for (const entry of data.targets) {
      const actual = await captureMigrationPath(entry.after.path);
      let accepted = same(shortSnapshot(actual), entry.before) || migrationSnapshotMatches(entry.after, actual);
      if (!accepted && entry.before.kind === 'absent' && entry.after.kind === 'directory' && actual.kind === 'directory') {
        // Recursive removal can stop between unlinks. Every remaining path must
        // retain its original bytes/mode and the original directory identity.
        const originals = new Map(entry.after.entries.map((item) => [item.path, item]));
        accepted = same(actual.identity, entry.after.identity) && actual.entries.every((item) => same(item, originals.get(item.path) ?? null));
      }
      check(accepted, 'Claude recovery target changed; preserve local edits and reconcile.');
      targets.push(shortSnapshot(actual));
      snapshots.push(actual);
    }
    return { state: { snapshotHash: digest(targets), targets }, snapshots };
  }
  async function inspectRecovery(step, reference, context) {
    return (await inspectRecoveryTargets(step, reference, context)).state;
  }
  async function restoreFile(target, before, backupPath, current) {
    await revalidateMigrationPath(current);
    await assertMigrationParents(target);
    if (before.kind === 'file') {
      const temporary = path.join(path.basename(target) === '.orphaned_at' ? path.dirname(path.dirname(target)) : path.dirname(target), `.qs-restore-${randomUUID()}`);
      try {
        await cp(backupPath, temporary, { force: false, errorOnExist: true, preserveTimestamps: true });
        await syncTree(temporary);
        await revalidateMigrationPath(current);
        await rename(temporary, target);
      } finally { await rm(temporary, { force: true }); }
    } else {
      check(before.kind === 'absent', 'Claude recovery only restores regular files or removes owned paths.');
      if (current.kind === 'directory') {
        // Delete only paths observed in the receipt. An unexpected new file makes
        // rmdir fail instead of disappearing in an unchecked recursive removal.
        for (const entry of [...current.entries].reverse()) {
          const file = entry.path ? path.join(target, entry.path) : target;
          await assertMigrationParents(file);
          if (entry.kind === 'directory') {
            const metadata = await lstat(file);
            check(metadata.isDirectory() && !metadata.isSymbolicLink() && (metadata.mode & 0o777) === entry.mode, 'Claude recovery directory changed; preserve local edits.');
            await rmdir(file);
          } else {
            const observed = await captureMigrationPath(file);
            check(observed.kind === 'file' && same({ ...observed.entries[0], path: entry.path }, entry), 'Claude recovery file changed; preserve local edits.');
            await revalidateMigrationPath(observed);
            await unlink(file);
          }
        }
      } else await rm(target, { force: true });
    }
    const directory = await open(path.dirname(target), constants.O_RDONLY);
    try { await directory.sync(); } finally { await directory.close(); }
  }
  async function recoverClaude(step, reference, context) {
    if (!context.recovery) context = { ...context, recovery: await prepareRecovery(step, reference, context) };
    const data = await recoveryEvidence(step, reference, context);
    const current = await inspectRecovery(step, reference, context);
    if (same(current.targets, data.targets.map((entry) => shortSnapshot(entry.after)))) {
      // A coherent after-state still gets native inspection; raw receipt validation
      // catches an edit made during inventory before any file is replaced.
      check(same(await inspect(), step.after), 'Claude state changed before recovery.');
    }
    for (const [index, entry] of data.targets.entries()) {
      // Reuse the snapshot that passed receipt validation. A fresh capture here
      // could adopt a concurrent edit as the replacement baseline.
      const observation = await inspectRecoveryTargets(step, reference, context);
      const snapshot = observation.snapshots[index];
      if (same(shortSnapshot(snapshot), entry.before)) continue;
      if (entry.marker) {
        await revalidateMigrationPath(snapshot);
        const marker = await captureMigrationPath(entry.marker.before.path);
        await revalidateMigrationPath(snapshot);
        await restoreFile(marker.path, entry.marker.before, entry.marker.backupPath, marker);
      } else await restoreFile(snapshot.path, entry.before, entry.backupPath, snapshot);
    }
    await inspectRecovery(step, reference, context);
    check(same(await inspect(), step.before), 'Claude recovery did not restore the verified state.');
  }
  async function mutate(step, context, recovering = false, backup = null) {
    const pkg = contextCheck(step, context); const before = await inspect();
    check(same(before, recovering ? step.after : step.before), 'Native state changed before manager operation.');
    const adding = (step.phase === 'expose') !== recovering;
    const present = before.native.packages.some((entry) => entry.id === pkg.id);
    check(adding ? !present : present, 'Native operation disagrees with observed registration.');
    if (adding) {
      if (options.host === 'codex') check(!Object.hasOwn(before.config.selected, selector(options, pkg)), 'Same-selector package must be withdrawn before replacement exposure.');
      const occupied = [...before.native.packages.flatMap((entry) => entry.publicNames), ...(before.unrelatedPublicNames ?? [])];
      check(pkg.publicNames.every((name) => !occupied.includes(name)), 'Replacement would duplicate native public identities.');
    }
    const args = options.host === 'claude-code' ? ['plugin', adding ? 'install' : 'uninstall', selector(options, pkg), '--scope', 'user', ...(!adding ? ['--keep-data'] : [])] : options.host === 'codex' ? ['plugin', adding ? 'add' : 'remove', selector(options, pkg), '--json'] : [adding ? 'install' : 'remove', pkg.source];
    if (adding && options.host === 'codex' && recovering) {
      check(backup, 'Native recovery requires its verified cache backup.');
      args.push('-c', `marketplaces.${pkg.marketplace}.source=${JSON.stringify(path.join(backup, 'market'))}`);
    } else if (adding && options.host === 'codex') check(!pkg.installedOnly, 'Historical installed-cache binding can only be restored from verified backup.');
    await options.runCommand(options.command, args, options);
    const after = await inspect();
    check(after.config.unrelatedHash === before.config.unrelatedHash && after.unrelatedHash === before.unrelatedHash, 'Native manager changed unrelated configuration or packages; inspect residual state.');
    const retained = (state) => state.native.packages.filter((entry) => entry.id !== pkg.id);
    check(same(retained(before), retained(after)) && after.native.packages.some((entry) => entry.id === pkg.id) === adding, 'Native manager changed the wrong selected package.');
  }
  return {
    async inspect(step, context) { contextCheck(step, context); return inspect(); },
    async prepare(step, context) {
      const pkg = contextCheck(step, context); check(same(await inspect(), step.before), 'Native state changed before backup.');
      const reference = backupReference(step, context); await assertMigrationParents(reference);
      if (!await optional(reference)) {
        await mkdir(reference, { recursive: true, mode: 0o700 });
        const snapshots = [];
        for (let index = 0; index < step.ownedTargets.length; index++) {
          const target = step.ownedTargets[index]; const snapshot = await captureMigrationPath(target.path);
          check(['absent', 'file', 'directory'].includes(snapshot.kind), 'Native backup target must be regular.');
          snapshots.push(shortSnapshot(snapshot));
          if (snapshot.kind !== 'absent') {
            const destination = path.join(reference, `target-${index}`);
            await cp(target.path, destination, { recursive: true, force: false, errorOnExist: true, preserveTimestamps: true });
            const copied = await captureMigrationPath(destination); const reobserved = await captureMigrationPath(target.path);
            check(copied.contentSha256 === snapshot.contentSha256 && same(shortSnapshot(reobserved), shortSnapshot(snapshot)), 'Native backup copy or source changed during preparation.');
          }
        }
        if (options.host === 'codex' && step.phase === 'withdraw') {
          const cache = path.join(options.codexHomeDirectory, 'plugins/cache', pkg.marketplace, pkg.name, pkg.version);
          const index = step.ownedTargets.findIndex((target) => target.path === cache);
          await mkdir(path.join(reference, 'market/.agents/plugins'), { recursive: true });
          // Supported transient marketplace override; live registration is untouched.
          await cp(path.join(reference, `target-${index}`), path.join(reference, 'market/payload'), { recursive: true });
          await writeDurable(path.join(reference, 'market/.agents/plugins/marketplace.json'), stable({ name: pkg.marketplace, plugins: [{ name: pkg.name, source: { source: 'local', path: './payload' } }] }));
        }
        const receipt = { transactionId: context.transactionId, stepId: step.id, packageId: step.native.packageId, beforeHash: digest(step.before), targets: step.ownedTargets, snapshots };
        const handle = await open(path.join(reference, 'receipt.json'), 'wx', 0o600); try { await handle.writeFile(stable(receipt)); await handle.sync(); } finally { await handle.close(); }
        await syncTree(reference);
        for (const directory of [path.dirname(reference), options.backupRoot, path.dirname(options.backupRoot)]) {
          const handle = await open(directory, constants.O_RDONLY); try { await handle.sync(); } finally { await handle.close(); }
        }
      }
      const expectedState = await inspectBackup(step, reference, context);
      const receipt = parseMetadata((await boundedRead(path.join(reference, 'receipt.json'))).toString());
      check(receipt.beforeHash === digest(step.before) && same(receipt.targets, step.ownedTargets), 'Prior native backup belongs to different planned state.');
      for (let index = 0; index < step.ownedTargets.length; index++) check(same(shortSnapshot(await captureMigrationPath(step.ownedTargets[index].path)), receipt.snapshots[index]), 'Prior backup no longer matches actual owned bytes.');
      check(same(await inspect(), step.before), 'Native state changed while preparing backup.');
      return { reference, expectedState };
    },
    inspectBackup,
    apply: (step, context) => mutate(step, context),
    ...(options.host === 'claude-code' ? { prepareRecovery, inspectRecovery } : {}),
    async recover(step, reference, context) {
      await inspectBackup(step, reference, context);
      if (options.host === 'claude-code') return recoverClaude(step, reference, context);
      return mutate(step, context, true, reference);
    },
  };
}
