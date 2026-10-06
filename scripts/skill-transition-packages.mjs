import { cp, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { captureMigrationPath, revalidateMigrationPath } from './migration-filesystem.mjs';
import { PS_PUBLIC_COMMANDS } from './ps-skill-catalog.mjs';
import { adoptionSourceContentSha256 } from './adoption-acceptance.mjs';

const roots = { codex: 'codex/plugins/ps-skills', 'claude-code': 'packages/ps-skills', pi: 'pi/packages/ps-skills' };
const check = (condition, message) => { if (!condition) throw new Error(message); };

// Historical compatibility artifacts have no target registry membership. Their
// version stays pinned; regenerating them would change live direct-checkout users.
export async function readTransitionPackages(repositoryRoot) {
  const document = JSON.parse(await readFile(path.join(repositoryRoot, 'config/skill-transition-packages.json'), 'utf8'));
  check([1, 2].includes(document.schemaVersion) && document.packages?.length === 1, 'Explicit legacy transition inventory required.');
  const pkg = document.packages[0];
  check(pkg.id === 'ps-skills' && pkg.state === 'retained-for-migration' && pkg.version === '3.8.0'
    && /^[a-f0-9]{40}$/.test(pkg.sourceRevision), 'Unknown legacy transition package.');
  check(JSON.stringify(pkg.publicNames) === JSON.stringify(PS_PUBLIC_COMMANDS.map((entry) => entry.name)), 'Legacy public inventory changed.');
  for (const [host, expected] of Object.entries(roots)) {
    const payload = pkg.payloads?.[host];
    check(payload?.path === expected && /^[a-f0-9]{64}$/.test(payload.contentSha256), 'Exact retained payload path/hash required.');
    if (document.schemaVersion === 2) {
      check(payload.checkoutDigest?.kind === 'git-content-and-executable-bits-sha256'
        && /^[a-f0-9]{64}$/.test(payload.checkoutDigest.value), 'Exact retained checkout digest required.');
    } else check(payload.checkoutDigest === undefined, 'Checkout digest requires transition schema 2.');
  }
  return document.packages;
}

export async function verifyTransitionPayloads(repositoryRoot, outputRoot = repositoryRoot) {
  const packages = await readTransitionPackages(repositoryRoot);
  for (const pkg of packages) for (const [host, payload] of Object.entries(pkg.payloads)) {
    check(Object.hasOwn(roots, host), 'Unknown transition host.');
    const snapshot = await captureMigrationPath(path.join(outputRoot, payload.path));
    // Schema 2 keeps contentSha256 as the original full-mode provenance hash.
    // Only cross-checkout identity is normalized; local revalidation below still
    // binds every permission bit, inode and path from the observed snapshot.
    const contentMatches = snapshot.kind === 'directory' && (payload.checkoutDigest
      ? adoptionSourceContentSha256(snapshot) === payload.checkoutDigest.value
      : snapshot.contentSha256 === payload.contentSha256);
    check(contentMatches, `Retained ${host} legacy payload changed; preserve and replan.`);
    const portable = createHash('sha256');
    for (const entry of snapshot.entries.filter((entry) => entry.kind === 'file').sort((a, b) => a.path.localeCompare(b.path))) {
      portable.update(entry.path); portable.update(await readFile(path.join(snapshot.path, entry.path)));
    }
    check(payload.payloadDigest?.kind === 'portable-directory-sha256' && portable.digest('hex') === payload.payloadDigest.value, 'Retained portable digest differs from actual content.');
    const relativeManifest = host === 'pi' ? 'package.json' : host === 'codex' ? '.codex-plugin/plugin.json' : '.claude-plugin/plugin.json';
    const manifest = JSON.parse(await readFile(path.join(snapshot.path, relativeManifest), 'utf8'));
    check(manifest.name === pkg.id && manifest.version === pkg.version, 'Legacy manifest identity changed.');
    await revalidateMigrationPath(snapshot);
  }
  return packages;
}

export async function copyTransitionPayloads(repositoryRoot, outputRoot) {
  const packages = await verifyTransitionPayloads(repositoryRoot);
  check(path.resolve(outputRoot) !== path.resolve(repositoryRoot), 'Never overwrite an existing transition source.');
  for (const pkg of packages) for (const payload of Object.values(pkg.payloads)) {
    await cp(path.join(repositoryRoot, payload.path), path.join(outputRoot, payload.path), { recursive: true, force: false, errorOnExist: true, preserveTimestamps: true });
  }
  await verifyTransitionPayloads(repositoryRoot);
  await verifyTransitionPayloads(repositoryRoot, outputRoot);
}
