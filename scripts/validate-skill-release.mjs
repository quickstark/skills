import { execFile } from 'node:child_process';
import { readFile, realpath } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { pathToFileURL } from 'node:url';
import { TARGET_SKILL_COLLECTIONS } from './skill-collection-registry.mjs';
import { derivePackageAcceptanceObligations, verifyManagedReleasePackage } from './managed-skill-input.mjs';
import { captureManagedSkillPayload } from './managed-skill-migration.mjs';
import { inspectNativePayload } from './migration-native-packages.mjs';

const exec = promisify(execFile);
const check = (condition, message) => { if (!condition) throw new Error(message); };

/** Validate the replacement before withdrawing any installed package. */
export async function validateSkillRelease({ repositoryRoot, agents = ['codex', 'claude-code', 'pi'], packageIds = TARGET_SKILL_COLLECTIONS.map(c => c.id), onProgress = () => {} }) {
  const revision = (await exec('git', ['rev-parse', 'HEAD'], { cwd: repositoryRoot, encoding: 'utf8' })).stdout.trim();
  const version = JSON.parse(await readFile(path.join(repositoryRoot, 'package.json'))).version;
  const document = JSON.parse(await readFile(path.join(repositoryRoot, 'config/skill-migrations.json')));
  const evidence = [];
  for (const agent of agents) for (const id of packageIds) {
    const collection = TARGET_SKILL_COLLECTIONS.find(c => c.id === id);
    check(collection, 'Unknown replacement package.');
    const source = path.join(repositoryRoot, agent === 'codex' ? collection.codexPackageRoot : agent === 'claude-code' ? collection.claudePackageRoot : collection.piPackageRoot);
    const native = await inspectNativePayload(agent, source);
    check(native.name === id && native.version === version && JSON.stringify(native.publicNames) === JSON.stringify([...collection.publicCommands].sort()), 'Replacement package identity or public catalog differs from the release.');
    const payload = await captureManagedSkillPayload(source);
    const pkg = { id, version, ...derivePackageAcceptanceObligations(id, document) };
    const verified = await verifyManagedReleasePackage({ repositoryRoot, pkg, agent, payload, revision });
    evidence.push(...verified.evidenceSnapshots);
    onProgress({ agent, packageId: id });
  }
  return { revision, version, evidenceSnapshots: evidence };
}

if (process.argv[1] && import.meta.url === pathToFileURL(await realpath(process.argv[1]).catch(() => path.resolve(process.argv[1]))).href) {
  try {
    const result = await validateSkillRelease({ repositoryRoot: path.resolve(process.argv[2] ?? '.') });
    console.log(`Validated replacement ${result.version} at ${result.revision}.`);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
