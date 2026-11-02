import { createHash } from 'node:crypto';
import { lstat, readFile } from 'node:fs/promises';
import path from 'node:path';
import { V3_CORE_SKILLS } from './qs-skill-catalog.mjs';
import { adoptionSourceContentSha256 } from './adoption-acceptance.mjs';
import { assertMigrationParents, captureMigrationPath, revalidateMigrationPath } from './migration-filesystem.mjs';

const check = (condition, message) => { if (!condition) throw new Error(message); };
const sameNames = (first, second) => JSON.stringify([...first].sort()) === JSON.stringify([...second].sort());

// The former core plugin cached the repository root. Ownership covers its declared
// skill/private closure, not unrelated repository files. Withdrawal changes only
// registration metadata and the native orphan marker; the old cache stays intact.
export async function captureLegacyClaudeCore(root) {
  await assertMigrationParents(root);
  const identity = await lstat(root);
  check(identity.isDirectory() && !identity.isSymbolicLink(), 'Legacy Claude core must be a real directory.');
  const manifestPath = path.join(root, '.claude-plugin/plugin.json');
  const manifestSnapshot = await captureMigrationPath(manifestPath);
  check(manifestSnapshot.kind === 'file' && manifestSnapshot.bytes <= 256 * 1024, 'Legacy Claude core manifest must be a bounded regular file.');
  let manifest;
  try { manifest = JSON.parse(await readFile(manifestPath)); } catch { throw new Error('Legacy Claude core manifest is invalid; contents withheld.'); }
  await revalidateMigrationPath(manifestSnapshot);
  const skillPaths = V3_CORE_SKILLS.map((skill) => skill.sourcePath ?? `skills/${skill.bucket}/${skill.name}`);
  check(manifest.name === 'qs-skills' && /^\d+\.\d+\.\d+(?:-[\w.-]+)?$/.test(manifest.version ?? '')
    && Array.isArray(manifest.skills) && sameNames(manifest.skills, skillPaths.map((relative) => `./${relative}`))
    && !['hooks', 'mcpServers', 'commands', 'agents', 'dependencies'].some((key) => manifest[key]), 'Unsupported legacy Claude core manifest or public layout.');
  const snapshots = [manifestSnapshot];
  for (const relative of [...skillPaths, 'skills/internal']) {
    const snapshot = await captureMigrationPath(path.join(root, relative));
    check(snapshot.kind === 'directory', 'Legacy Claude core closure is missing.');
    snapshots.push(snapshot);
  }
  const names = [];
  for (const relative of skillPaths) {
    const text = await readFile(path.join(root, relative, 'SKILL.md'), 'utf8');
    const front = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)?.[1];
    const name = front?.match(/^name:\s*([a-z0-9-]+)\s*$/m)?.[1];
    check(name === path.posix.basename(relative), 'Legacy Claude core skill identity differs from its manifest.');
    names.push(name);
  }
  const entries = [{path:'', kind:'directory', mode:identity.mode & 0o777}];
  for (const snapshot of snapshots) {
    const relative = path.relative(root, snapshot.path).split(path.sep).join('/');
    for (const entry of snapshot.entries) entries.push({...entry, path:entry.path ? `${relative}/${entry.path}` : relative});
  }
  entries.sort((a,b) => Buffer.compare(Buffer.from(a.path), Buffer.from(b.path)));
  const digest = createHash('sha256');
  for (const entry of entries.filter((entry) => entry.kind === 'file').sort((a,b) => a.path.localeCompare(b.path))) {
    digest.update(entry.path); digest.update(await readFile(path.join(root, entry.path)));
  }
  for (const snapshot of snapshots) await revalidateMigrationPath(snapshot);
  const after = await lstat(root);
  check(after.ino === identity.ino && after.dev === identity.dev, 'Legacy Claude core root changed during inspection.');
  // This aggregate is never revalidated as a whole-directory snapshot. Callers
  // retain and revalidate the original individual snapshots above.
  const snapshot = {kind:'directory', path:root, entries, identity:{device:identity.dev,inode:identity.ino}, contentSha256:createHash('sha256').update(JSON.stringify(entries)).digest('hex')};
  return {name:manifest.name, version:manifest.version, publicNames:names.sort(), snapshots, snapshot,
    payloadSha256:adoptionSourceContentSha256(snapshot), payloadDigest:{kind:'portable-directory-sha256',value:digest.digest('hex')}};
}
