import { execFile } from 'node:child_process';
import { lstat, readFile, realpath } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { TARGET_SKILL_COLLECTIONS } from '../catalog/skill-collection-registry.mjs';
import { verifyTransitionPayloads } from '../generation/skill-transition-packages.mjs';
import { adoptionSourceContentSha256 } from '../verification/adoption-acceptance.mjs';
import { captureLegacyClaudeCore } from './claude-core-migration.mjs';
import { verifyPackageGitTree } from './managed-skill-input.mjs';
import { assertMigrationParents, captureMigrationPath, revalidateMigrationPath } from './migration-filesystem.mjs';
import { inspectNativePayload } from './migration-native-packages.mjs';

const exec = promisify(execFile);
const hosts = {
  'claude-code': { original: 'packages', directory: 'claude' },
  codex: { original: 'codex/plugins', directory: 'codex' },
  pi: { original: 'pi/packages', directory: 'pi' },
};
export const distributionHosts = Object.freeze(Object.keys(hosts));

export function distributionPaths(host, packageId) {
  const collection = TARGET_SKILL_COLLECTIONS.find(entry => entry.id === packageId);
  if (!collection || !Object.hasOwn(hosts, host)) throw new Error('Expected a registered active package and supported host.');
  return {
    original: path.posix.join(hosts[host].original, packageId),
    dist: path.posix.join('dist', hosts[host].directory, packageId),
  };
}

function git(args, cwd) {
  const env = Object.fromEntries(Object.entries(process.env).filter(([name]) => !name.toUpperCase().startsWith('GIT_')));
  return exec('git', ['--no-replace-objects', ...args], { cwd, env, encoding: 'utf8', timeout: 30000, maxBuffer: 8 * 1024 * 1024 });
}

async function checkCheckout(root, revision) {
  if (await realpath(root) !== root || !/^[0-9a-f]{40}$/.test(revision)) throw new Error('Expected a physical checkout and pinned full Git commit.');
  const [top, head, origin] = await Promise.all([
    git(['rev-parse', '--show-toplevel'], root), git(['rev-parse', 'HEAD'], root),
    git(['config', '--local', '--get-all', 'remote.origin.url'], root),
  ]);
  if (top.stdout.trimEnd() !== root || head.stdout.trimEnd() !== revision) throw new Error('Checkout root or revision differs from the trusted release.');
  if (!/^(?:https:\/\/github\.com\/|git@github\.com:)quickstark\/skills(?:\.git)?$/.test(origin.stdout.trimEnd())) throw new Error('Checkout origin is not the official QuickStark repository.');
}

async function matchesRootMarketplace(root, revision) {
  const file = claudeManifest;
  const { stdout } = await git(['show', revision + ':' + file], root);
  const market = JSON.parse(stdout);
  const core = market.plugins.filter(pkg => pkg.name === 'qs-skills');
  const rootSources = market.plugins.filter(pkg => ['.', './'].includes(pkg.source));
  return market.name === 'quickstark' && core.length === 1 && rootSources.length === 1 && rootSources[0] === core[0]
    && await realpath(path.join(root, file)) === path.join(root, file)
    && await readFile(path.join(root, file), 'utf8') === stdout;
}

// The caller supplies the trusted checkout and revision independently of the observed registration.
export async function recognizeDistributionSource({ repositoryRoot, revision, host, packageId, source }) {
  const paths = distributionPaths(host, packageId);
  await checkCheckout(repositoryRoot, revision);
  const version = JSON.parse((await git(['show', revision + ':package.json'], repositoryRoot)).stdout).version;
  let layout, relative, payload, manifest;
  if (host === 'claude-code' && packageId === 'qs-skills' && source === repositoryRoot) {
    if (!await matchesRootMarketplace(repositoryRoot, revision)) throw new Error('Revision does not declare the repository-root Claude core.');
    layout = 'claude-root-core';
    relative = '.';
    payload = await captureLegacyClaudeCore(source);
    manifest = payload;
  } else {
    layout = Object.keys(paths).find(key => source === path.join(repositoryRoot, paths[key]));
    if (!layout) throw new Error('Registered source differs from the declared host/package paths.');
    relative = paths[layout];
    const otherPath = paths[layout === 'dist' ? 'original' : 'dist'];
    const alternate = path.join(repositoryRoot, otherPath);
    await assertMigrationParents(alternate);
    const other = await lstat(alternate).catch(error => {
      if (error.code !== 'ENOENT') throw error;
      return null;
    });
    if (other || (await git(['ls-tree', '-z', revision, '--', otherPath], repositoryRoot)).stdout) {
      throw new Error('Both package layout paths exist; ownership is ambiguous.');
    }
    payload = { snapshot: await captureMigrationPath(source) };
    manifest = await inspectNativePayload(host, source);
    if (manifest.snapshot.contentSha256 !== payload.snapshot.contentSha256) {
      throw new Error('Package bytes changed between source capture and native discovery.');
    }
  }
  if (manifest.name !== packageId || manifest.version !== version) throw new Error('Native package identity differs from the pinned release.');
  const collection = TARGET_SKILL_COLLECTIONS.find(entry => entry.id === packageId);
  if (!manifest.publicNames.every(name => collection.publicCommands.includes(name))) throw new Error('Release contains a command belonging to another package.');
  const ownedPaths = payload.snapshots
    ? ['.claude-plugin/marketplace.json', ...payload.snapshots.map(snapshot => path.relative(repositoryRoot, snapshot.path))]
    : Object.values(paths);
  await git(['diff-index', '--cached', '--quiet', revision, '--', ...ownedPaths], repositoryRoot);
  await verifyPackageGitTree(payload, relative, [revision], repositoryRoot, git);
  await checkCheckout(repositoryRoot, revision);
  return { repositoryRoot, revision, host, packageId, source, version, layout, contentSha256: adoptionSourceContentSha256(payload.snapshot) };
}


const codexManifest = '.agents/plugins/marketplace.json';
const claudeManifest = '.claude-plugin/marketplace.json';
const optional = file => lstat(file).catch(error => {
  if (error.code === 'ENOENT') return null;
  throw error;
});

export async function resolveCodexLayout(repositoryRoot) {
  const traditional = path.join(repositoryRoot, 'codex');
  const candidate = await optional(path.join(repositoryRoot, codexManifest));
  if (!candidate) return { name: 'original', marketplaceRoot: traditional };
  if (!candidate.isFile() || await optional(path.join(traditional, codexManifest))) {
    throw new Error('Ambiguous or non-regular Codex marketplace layout.');
  }
  return { name: 'dist', marketplaceRoot: repositoryRoot };
}

export function codexPackagePath(packageId, layout = 'original') {
  return packageId === 'ps-skills' ? 'codex/plugins/ps-skills' : distributionPaths('codex', packageId)[layout];
}

export async function verifyCodexMarketplace(repositoryRoot, revision, layout) {
  const file = path.posix.join(layout.name === 'original' ? 'codex' : '', codexManifest);
  const market = await readPinnedMarketplace(repositoryRoot, revision, file, 'Codex');
  verifyMarketplaceInventory(market, layout, 'Codex');
  for (const plugin of market.plugins) {
    const packagePath = codexPackagePath(plugin.name, layout.name);
    const expected = './' + (layout.name === 'original' ? packagePath.slice('codex/'.length) : packagePath);
    if (plugin.source?.source !== 'local' || plugin.source.path !== expected) throw new Error('Codex marketplace package mapping differs from the declared layout.');
  }
}

async function readPinnedMarketplace(repositoryRoot, revision, file, label) {
  await checkCheckout(repositoryRoot, revision);
  const snapshot = await captureMigrationPath(path.join(repositoryRoot, file));
  if (snapshot.kind !== 'file') throw new Error('Expected a regular ' + label + ' marketplace manifest.');
  const committed = (await git(['show', revision + ':' + file], repositoryRoot)).stdout;
  if (await readFile(snapshot.path, 'utf8') !== committed) throw new Error(label + ' marketplace manifest changed from the pinned source.');
  await git(['diff-index', '--cached', '--quiet', revision, '--', file], repositoryRoot);
  return JSON.parse(committed);
}

function verifyMarketplaceInventory(market, layout, label) {
  const names = market.plugins?.map(p => p.name);
  const allowed = [...TARGET_SKILL_COLLECTIONS.map(pkg => pkg.id), 'ps-skills'];
  if (market.name !== 'quickstark' || !names?.length || names.length !== new Set(names).size
    || names.some(name => !allowed.includes(name)) || layout.name === 'dist' && names.length !== allowed.length) {
    throw new Error(label + ' marketplace has an unexpected package inventory.');
  }
}

async function verifyPriorRelease(revision, replacementRoot, label) {
  try { await git(['merge-base', '--is-ancestor', revision, 'HEAD'], replacementRoot); }
  catch { throw new Error('Existing ' + label + ' checkout revision is not in the accepted release history.'); }
}

export async function resolvePriorCodexCheckout(marketplaceRoot, replacementRoot) {
  const { stdout } = await git(['rev-parse', '--show-toplevel'], marketplaceRoot);
  const repositoryRoot = stdout.trimEnd();
  const revision = (await git(['rev-parse', 'HEAD'], repositoryRoot)).stdout.trimEnd();
  const layout = await resolveCodexLayout(repositoryRoot);
  if (marketplaceRoot !== layout.marketplaceRoot) throw new Error('Existing Codex marketplace is not at its declared checkout root.');
  await verifyCodexMarketplace(repositoryRoot, revision, layout);
  await verifyPriorRelease(revision, replacementRoot, 'Codex');
  return { repositoryRoot, revision, layout };
}


export async function resolveClaudeLayout(repositoryRoot) {
  const dist = path.join(repositoryRoot, 'dist/claude');
  const candidate = await optional(dist);
  if (!candidate) return { name: 'original' };
  await assertMigrationParents(dist);
  if (!candidate.isDirectory()) throw new Error('Claude distribution root must be a real directory.');
  return { name: 'dist' };
}

export function claudePackagePath(packageId, layout = 'original') {
  return packageId === 'ps-skills' ? 'packages/ps-skills' : distributionPaths('claude-code', packageId)[layout];
}

export async function verifyClaudeMarketplace(repositoryRoot, revision, layout) {
  const market = await readPinnedMarketplace(repositoryRoot, revision, claudeManifest, 'Claude');
  verifyMarketplaceInventory(market, layout, 'Claude');
  for (const plugin of market.plugins) {
    if (layout.name === 'original' && plugin.name === 'qs-skills' && plugin.source === './') continue;
    if (plugin.source !== './' + claudePackagePath(plugin.name, layout.name)) {
      throw new Error('Claude marketplace package mapping differs from the declared layout.');
    }
  }
  return market;
}

export async function resolvePriorClaudeCheckout(repositoryRoot, replacementRoot) {
  const revision = (await git(['rev-parse', 'HEAD'], repositoryRoot)).stdout.trimEnd();
  const layout = await resolveClaudeLayout(repositoryRoot);
  const market = await verifyClaudeMarketplace(repositoryRoot, revision, layout);
  await verifyPriorRelease(revision, replacementRoot, 'Claude');
  const rootCore = market.plugins.some(pkg => pkg.name === 'qs-skills' && pkg.source === './');
  return { repositoryRoot, revision, layout, rootCore };
}

export async function resolvePiLayout(repositoryRoot) {
  const dist = path.join(repositoryRoot, 'dist/pi');
  const candidate = await optional(dist);
  if (!candidate) return 'original';
  await assertMigrationParents(dist);
  if (!candidate.isDirectory()) throw new Error('Pi distribution root must be a real directory.');
  return 'dist';
}

export function piPackagePath(packageId, layout = 'original') {
  return packageId === 'ps-skills' ? 'pi/packages/ps-skills' : distributionPaths('pi', packageId)[layout];
}

export function matchPiPackageSource(source) {
  const id = path.basename(source);
  if (id !== 'ps-skills' && !TARGET_SKILL_COLLECTIONS.some(pkg => pkg.id === id)) return null;
  for (const relative of new Set([piPackagePath(id), piPackagePath(id, 'dist')])) {
    if (source.endsWith(path.sep + relative)) {
      return { id, relative, repositoryRoot: source.slice(0, -(relative.length + 1)), source };
    }
  }
  return null;
}

export async function verifyPriorPiPackage(binding, replacementRoot) {
  const { id, source, repositoryRoot } = binding;
  const revision = (await git(['rev-parse', 'HEAD'], repositoryRoot)).stdout.trimEnd();
  await checkCheckout(repositoryRoot, revision);
  await verifyPriorRelease(revision, replacementRoot, 'Pi');
  if (id !== 'ps-skills') {
    return recognizeDistributionSource({ repositoryRoot, revision, host: 'pi', packageId: id, source });
  }
  const snapshot = await captureMigrationPath(source);
  const [retained] = await verifyTransitionPayloads(replacementRoot, repositoryRoot);
  await revalidateMigrationPath(snapshot);
  return { revision, version: retained.version, contentSha256: adoptionSourceContentSha256(snapshot) };
}
