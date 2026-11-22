import { cp, mkdir, mkdtemp, realpath, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { TARGET_SKILL_COLLECTIONS } from '../catalog/skill-collection-registry.mjs';
import { distributionHosts, distributionPaths, recognizeDistributionSource } from '../install/distribution-layout.mjs';
import { captureMigrationPath } from '../install/migration-filesystem.mjs';
import { repositoryRoot as toolingCheckout } from '../repository-root.mjs';
import { adoptionSourceContentSha256 } from '../verification/adoption-acceptance.mjs';
import { copyTransitionPayloads } from './skill-transition-packages.mjs';

// Stage existing release bytes for layout qualification. Marketplace generation belongs to the projector.
export async function stageDistributionLayout(repositoryRoot, revision) {
  const parent = await realpath(tmpdir());
  if (!path.isAbsolute(repositoryRoot) || parent === repositoryRoot || parent.startsWith(repositoryRoot + path.sep)) {
    throw new Error('Staging requires a separate temporary directory outside the source checkout.');
  }
  const output = await mkdtemp(path.join(parent, 'qs-dist-layout-'));
  try {
    for (const { id } of TARGET_SKILL_COLLECTIONS) for (const host of distributionHosts) {
      const paths = distributionPaths(host, id);
      const source = path.join(repositoryRoot, paths.original);
      const proof = await recognizeDistributionSource({ repositoryRoot, revision, host, packageId: id, source });
      const target = path.join(output, paths.dist);
      await mkdir(path.dirname(target), { recursive: true });
      await cp(source, target, { recursive: true, force: false, errorOnExist: true });
      if (adoptionSourceContentSha256(await captureMigrationPath(target)) !== proof.contentSha256) {
        throw new Error('Staged package differs from its verified release tree.');
      }
    }
    await copyTransitionPayloads(repositoryRoot, output, toolingCheckout);
    return output;
  } catch (error) {
    await rm(output, { recursive: true, force: true });
    throw error;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  if (process.argv.length !== 4) throw new Error('Usage: node stage-distribution-layout.mjs <physical-release-checkout> <trusted-commit>');
  console.log(await stageDistributionLayout(process.argv[2], process.argv[3]));
}
