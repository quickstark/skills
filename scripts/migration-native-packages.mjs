import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { constants } from 'node:fs';
import { cp, lstat, mkdir, open, readdir } from 'node:fs/promises';
import path from 'node:path';
import { captureMigrationPath, assertMigrationParents } from './migration-filesystem.mjs';

const execute = promisify(execFile);
const check = (condition, message) => { if (!condition) throw new Error(message); };
const stable = (value) => JSON.stringify(value, function (key, entry) { return entry && typeof entry === 'object' && !Array.isArray(entry) ? Object.fromEntries(Object.keys(entry).sort().map((name) => [name, entry[name]])) : entry; });
const sha = (value) => createHash('sha256').update(value).digest('hex');
const digest = (value) => sha(stable(value));
const absolute = (value) => typeof value === 'string' && path.isAbsolute(value) && path.normalize(value) === value && value !== '/' && !/[\0-\x1f]/.test(value);
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
export async function runNativePackageCommand(command, args, { homeDirectory, cwd, timeout = 30000 } = {}) {
  check(absolute(homeDirectory) && absolute(cwd), 'Explicit native home and working directory required.');
  try {
    return await execute(command, args, { cwd, encoding: 'utf8', timeout, killSignal: 'SIGKILL', maxBuffer: 4 * 1024 * 1024,
      env: { ...process.env, HOME: homeDirectory, USERPROFILE: homeDirectory, CODEX_HOME: path.join(homeDirectory, '.codex'), PI_CODING_AGENT_DIR: path.join(homeDirectory, '.pi/agent'), PI_OFFLINE: '1', PI_TELEMETRY: '0' } });
  } catch (error) { throw new Error(`Native ${path.basename(command)} ${args[0]} command failed (${error.code ?? error.signal ?? 'unknown'}); output withheld.`); }
}

function optionsFor(options) {
  check(['codex', 'pi'].includes(options.host) && absolute(options.homeDirectory) && absolute(options.cwd), 'Explicit supported native host and isolated/resolved paths required.');
  check(Array.isArray(options.packages) && options.packages.length > 0 && options.packages.length <= 32, 'Bounded owned package bindings required.');
  const ids = new Set();
  for (const pkg of options.packages) {
    check(pkg && /^[a-z0-9][a-z0-9-]*$/.test(pkg.id) && !ids.has(pkg.id), 'Unique package binding ID required.'); ids.add(pkg.id);
    check(/^[a-z0-9][a-z0-9-]*$/.test(pkg.name) && typeof pkg.version === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9.+-]*$/.test(pkg.version) && absolute(pkg.source) && /^[a-f0-9]{64}$/.test(pkg.payloadSha256), 'Exact package source/version/full payload digest required.');
    check(typeof pkg.ownershipRecord === 'string' && pkg.ownershipRecord.length > 0 && Array.isArray(pkg.publicNames) && pkg.publicNames.length > 0 && pkg.publicNames.every((name) => /^[a-z0-9][a-z0-9-]*$/.test(name)) && new Set(pkg.publicNames).size === pkg.publicNames.length, 'Package ownership and exact public names required.');
    if (options.host === 'codex') check(/^[a-z0-9][a-z0-9-]*$/.test(pkg.marketplace) && absolute(pkg.marketplaceRoot), 'Codex package requires an exact local marketplace binding.');
  }
  check(new Set(options.packages.map((pkg) => options.host === 'codex' ? `${pkg.name}@${pkg.marketplace}/${pkg.version}` : pkg.source)).size === options.packages.length, 'Package selector/version bindings must be unique within an adapter.');
  check(options.packages.every((pkg) => !pkg.installedOnly || options.host === 'codex'), 'Installed-cache-only bindings are specific to Codex.');
  return { ...options, packages: JSON.parse(JSON.stringify(options.packages)), runCommand: options.runCommand ?? runNativePackageCommand, command: options.command ?? options.host,
    configPath: path.join(options.homeDirectory, options.host === 'codex' ? '.codex/config.toml' : '.pi/agent/settings.json') };
}
const selector = (options, pkg) => options.host === 'codex' ? `${pkg.name}@${pkg.marketplace}` : pkg.source;

// Deliberately narrow managed-package contract: generated skills-only packages,
// literal ./skills roots, no hooks/dependencies/extensions or executable install code.
async function inspectPayload(host, root) {
  const snapshot = await captureMigrationPath(root);
  check(snapshot.kind === 'directory', 'Native package payload must be a real directory.');
  const manifest = parseMetadata((await boundedRead(path.join(root, host === 'codex' ? '.codex-plugin/plugin.json' : 'package.json'))).toString());
  check(typeof manifest.name === 'string' && typeof manifest.version === 'string', 'Native package manifest identity required.');
  if (host === 'codex') check(['./skills/', './skills', 'skills'].includes(manifest.skills) && !['hooks', 'mcpServers', 'apps'].some((key) => manifest[key]), 'Only literal skills-only Codex packages are supported.');
  else check(!manifest.scripts && !manifest.dependencies && !manifest.devDependencies && manifest.pi && same(manifest.pi.skills, ['./skills']) && Object.keys(manifest.pi).every((key) => key === 'skills'), 'Only literal skills-only Pi packages are supported.');
  const rootSkills = path.join(root, 'skills'); const commands = [];
  for (const entry of snapshot.entries.filter((entry) => entry.kind === 'file' && entry.path.startsWith('skills/') && entry.path.endsWith('/SKILL.md'))) {
    check(entry.path.split('/').length === 3, 'Nested discoverable SKILL.md requires explicit package closure review.');
    const text = (await boundedRead(path.join(root, entry.path), 256 * 1024)).toString();
    const front = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)?.[1];
    const name = front?.match(/^name:\s*([a-z0-9][a-z0-9-]*)\s*$/m)?.[1];
    check(name && name === entry.path.split('/')[1] && /^description:\s*\S/m.test(front), 'Discovered skill identity/description is invalid.'); commands.push(name);
  }
  check(commands.length > 0 && new Set(commands).size === commands.length, 'Native package must expose distinct public roots.');
  // Top-level markdown is also discoverable by Pi; reject rather than ignore it.
  check(!snapshot.entries.some((entry) => entry.kind === 'file' && entry.path.startsWith('skills/') && entry.path.split('/').length === 2 && entry.path.endsWith('.md')), 'Unexpected top-level skill discovery file.');
  check((await optional(rootSkills))?.isDirectory(), 'Skills directory unavailable.');
  check(same(shortSnapshot(await captureMigrationPath(root)), shortSnapshot(snapshot)), 'Native payload changed during discovery.');
  return { name: manifest.name, version: manifest.version, publicNames: commands.sort(), snapshot: shortSnapshot(snapshot) };
}

function codexConfig(text, packages) {
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

/** Actual state excludes inode and harmless selected-table placement/JSON spacing.
 * Full raw config/payload snapshots remain available separately as evidence.
 * Unrelated config/package ordering remains part of the comparison.
 */
export async function observeNativePackages(input) {
  const options = optionsFor(input); const { packages, host, configPath } = options;
  const configSnapshot = await captureMigrationPath(configPath); check(['file', 'absent'].includes(configSnapshot.kind), 'Native config must be a regular file.');
  const bytes = configSnapshot.kind === 'absent' ? Buffer.alloc(0) : await boundedRead(configPath);
  const sourcePayloads = [];
  for (const pkg of packages) {
    if (pkg.installedOnly) { sourcePayloads.push({ id: pkg.id, name: pkg.name, version: pkg.version, publicNames: [...pkg.publicNames].sort(), role: 'installed-cache', expectedPayloadSha256: pkg.payloadSha256 }); continue; }
    const actual = await inspectPayload(host, pkg.source);
    check(actual.name === pkg.name && actual.version === pkg.version && same(actual.publicNames, [...pkg.publicNames].sort()) && actual.snapshot.contentSha256 === pkg.payloadSha256, 'Owned package source changed or disagrees with approved binding.');
    sourcePayloads.push({ id: pkg.id, ...actual });
  }
  let config; let registrations; let unrelated; let unrelatedDiscoveryComplete = true; const active = []; const caches = [];
  if (host === 'codex') {
    config = codexConfig(bytes.toString(), packages);
    const inventory = await commandJson(options, ['plugin', 'list', '--json']);
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
      const cache = path.join(options.homeDirectory, '.codex/plugins/cache', pkg.marketplace, pkg.name, pkg.version);
      const cacheParent = path.dirname(cache);
      if (await optional(cacheParent)) {
        const tree = await captureMigrationPath(cacheParent);
        check(tree.kind === 'directory', 'Native package cache parent is unsafe.');
        const knownVersions = new Set(packages.filter((binding) => selector(options, binding) === selector(options, pkg)).map((binding) => binding.version));
        check(tree.entries.every((entry) => !entry.path || knownVersions.has(entry.path.split('/')[0])), 'Unowned cache residue would be removed by the native manager; retain and replan.');
      }
      const cacheSnapshot = await captureMigrationPath(cache); check(['directory', 'absent'].includes(cacheSnapshot.kind), 'Owned native cache is not a regular payload directory.');
      caches.push({ id: pkg.id, ...shortSnapshot(cacheSnapshot) });
      if (!installed.length) { check((matchingSelector.length || !Object.hasOwn(config.selected, selector(options, pkg))) && cacheSnapshot.kind === 'absent', 'Unregistered owned package/cache requires explicit reconciliation.'); continue; }
      const item = installed[0];
      check(item.installed === true && item.enabled === true && config.selected[selector(options, pkg)]?.enabled === true && item.version === pkg.version && item.source?.source === 'local' && item.source.path === pkg.source, 'Native Codex installed source/version/enablement conflicts with binding.');
      const payload = await inspectPayload(host, cache);
      check(payload.snapshot.contentSha256 === pkg.payloadSha256 && same(payload.publicNames, [...pkg.publicNames].sort()), 'Native installed cache differs from verified source.');
      active.push({ id: pkg.id, source: pkg.source, version: payload.version, publicNames: payload.publicNames });
    }
    unrelated = registrations.filter((item) => !packages.some((pkg) => item.pluginId === selector(options, pkg)));
    // Validate all native cache names for collisions without claiming their ownership.
    for (const item of unrelated) {
      if (!/^[a-z0-9-]+$/.test(item.marketplaceName) || !/^[a-z0-9-]+$/.test(item.name) || !/^[a-zA-Z0-9.+-]+$/.test(item.version)) { unrelatedDiscoveryComplete = false; continue; }
      if (item.enabled === false) continue;
      const root = path.join(options.homeDirectory, '.codex/plugins/cache', item.marketplaceName, item.name, item.version);
      let snapshot; try { snapshot = await captureMigrationPath(root); } catch { unrelatedDiscoveryComplete = false; continue; }
      if (snapshot.kind !== 'directory') { unrelatedDiscoveryComplete = false; continue; }
      const names = [];
      for (const entry of snapshot.entries.filter((entry) => entry.kind === 'file' && entry.path.endsWith('/SKILL.md'))) {
        const text = (await boundedRead(path.join(root, entry.path), 256 * 1024)).toString(); const name = text.match(/^name:\s*([a-z0-9-]+)\s*$/m)?.[1]; if (name) names.push(name);
      }
      item.observedPublicNames = names.sort(); item.payloadSha256 = snapshot.contentSha256;
    }
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
      try { const payload = await inspectPayload(host, item.source); item.observedPublicNames = payload.publicNames; item.payloadSha256 = payload.snapshot.contentSha256; }
      catch { unrelatedDiscoveryComplete = false; }
    }
    const { packages: ignored, ...other } = settings;
    config = { selected: active.map((pkg) => pkg.source).sort(), unrelatedHash: digest({ other, packages: unrelated.map((item) => item.entry) }) };
  }
  // Independent vendor packages may share local names (Codex qualifies them by
  // plugin). Preserve every registration/payload in unrelatedHash; existing
  // vendor-to-vendor overlap must not block an unrelated managed transition.
  // Managed-to-managed and managed-to-vendor collisions still fail closed.
  const unrelatedPublicNames = [...new Set(unrelated.flatMap((item) => item.observedPublicNames ?? []))].sort();
  const allNames = [...active.flatMap((item) => item.publicNames), ...unrelatedPublicNames];
  check(new Set(allNames).size === allNames.length, 'Duplicate native public identities are exposed.');
  const data = { host, scope: 'native-packages-only', configPath, config, unrelatedDiscoveryComplete, unrelatedPublicNames, native: { packages: active.sort((a, b) => a.id.localeCompare(b.id)) }, sources: sourcePayloads, caches, unrelatedHash: digest(unrelated) };
  return { state: { snapshotHash: digest(data), ...data }, evidence: { configSnapshot, rawConfigSha256: sha(bytes), unrelatedPublicNames, unrelatedDiscoveryComplete } };
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
  if (state.host === 'codex') {
    const key = `${pkg.name}@${pkg.marketplace}`;
    check(!adding || !Object.hasOwn(state.config.selected, key), 'An existing package version must be withdrawn before same-selector exposure.');
    if (adding) state.config.selected[key] = { enabled: true }; else delete state.config.selected[key];
    const cache = state.caches.find((entry) => entry.id === packageId); check(cache, 'Cache binding unavailable.');
    cache.kind = adding ? 'directory' : 'absent'; if (adding) cache.contentSha256 = pkg.payloadSha256; else delete cache.contentSha256;
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
  check(['.codex', '.pi'].every((directory) => { const root = path.join(options.homeDirectory, directory); return options.backupRoot !== root && !within(options.backupRoot, root) && !within(root, options.backupRoot); }), 'Backups must remain outside host discovery roots.');
  check(options.packages.every((pkg) => options.backupRoot !== pkg.source && !within(options.backupRoot, pkg.source) && !within(pkg.source, options.backupRoot)), 'Backups must remain separate from bound source payloads.');
  const contextCheck = (step, context) => {
    check(context && /^[a-z0-9][a-z0-9-]*$/.test(context.transactionId) && /^[a-z0-9][a-z0-9-]*$/.test(step.id), 'Bounded transaction/step identity required.');
    check(['withdraw', 'expose'].includes(step.phase) && step.operation === `native-${step.phase}` && step.native?.host === options.host, 'Native adapter only accepts explicit package withdrawal/exposure.');
    const pkg = options.packages.find((item) => item.id === step.native.packageId); check(pkg, 'Step package lacks approved ownership binding.');
    const required = [options.configPath];
    if (options.host === 'codex') required.push(path.join(options.homeDirectory, '.codex/plugins/cache', pkg.marketplace, pkg.name, pkg.version));
    const allowed = new Set([options.configPath, ...(options.host === 'codex' ? options.packages.map((binding) => path.join(options.homeDirectory, '.codex/plugins/cache', binding.marketplace, binding.name, binding.version)) : [])]);
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
      const payload = await inspectPayload('codex', path.join(reference, 'market/payload'));
      check(payload.version === pkg.version && payload.name === pkg.name && payload.snapshot.contentSha256 === pkg.payloadSha256, 'Recovery marketplace payload differs from the old cache.');
      const market = parseMetadata((await boundedRead(path.join(reference, 'market/.agents/plugins/marketplace.json'))).toString());
      check(same(market, { name: pkg.marketplace, plugins: [{ name: pkg.name, source: { source: 'local', path: './payload' } }] }), 'Recovery marketplace binding changed.');
    }
    return { backupSha256: snapshot.contentSha256, receiptHash: digest(receipt) };
  };
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
    const args = options.host === 'codex' ? ['plugin', adding ? 'add' : 'remove', selector(options, pkg), '--json'] : [adding ? 'install' : 'remove', pkg.source];
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
          const cache = path.join(options.homeDirectory, '.codex/plugins/cache', pkg.marketplace, pkg.name, pkg.version);
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
    async recover(step, reference, context) { await inspectBackup(step, reference, context); await mutate(step, context, true, reference); },
  };
}
