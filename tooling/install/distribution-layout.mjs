import { execFile } from 'node:child_process';
import { lstat, readFile, realpath } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { TARGET_SKILL_COLLECTIONS } from '../catalog/skill-collection-registry.mjs';
import { adoptionSourceContentSha256 } from '../verification/adoption-acceptance.mjs';
import { captureLegacyClaudeCore } from './claude-core-migration.mjs';
import { verifyPackageGitTree } from './managed-skill-input.mjs';
import { assertMigrationParents, captureMigrationPath } from './migration-filesystem.mjs';
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
  const file = '.claude-plugin/marketplace.json';
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
