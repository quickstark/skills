import { lstat, readdir } from 'node:fs/promises';
import path from 'node:path';
import { captureMigrationPath } from '../../scripts/migration-filesystem.mjs';

// Test-only nonmutation oracle for a heterogeneous HOME, not a package payload
// validator. Observe symlink targets without traversing them. Production payload
// snapshots must continue rejecting all descendant links.
export async function fixtureHomeState(root) {
  const entries = [];
  async function visit(relative) {
    const file = path.join(root, relative);
    const stat = await lstat(file);
    if (stat.isDirectory()) {
      entries.push({ path: relative, kind: 'directory', mode: stat.mode & 0o777 });
      for (const name of (await readdir(file)).sort()) await visit(path.join(relative, name));
    } else {
      const snapshot = await captureMigrationPath(file);
      if (!['file', 'symlink'].includes(snapshot.kind)) throw new Error('Unsupported fixture home entry.');
      entries.push({ path: relative, kind: snapshot.kind, mode: stat.mode & 0o777,
        ...(snapshot.kind === 'symlink' ? { target: snapshot.target } : { contentSha256: snapshot.contentSha256 }) });
    }
  }
  await visit('');
  return entries;
}
