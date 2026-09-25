import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { lstat, open, opendir, readlink } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

const LIMITS = Object.freeze({ entries: 8192, bytes: 128 * 1024 * 1024, depth: 32 });
const sha = (value) => createHash("sha256").update(value).digest("hex");
const fail = (condition, message) => { if (!condition) throw new Error(message); };
const identity = (stat) => ({ device: stat.dev, inode: stat.ino });
const unchanged = (before, after) => before.dev === after.dev && before.ino === after.ino
  && before.size === after.size && before.mtimeMs === after.mtimeMs && before.ctimeMs === after.ctimeMs
  && before.mode === after.mode && before.nlink === after.nlink;
const optionalStat = (path) => lstat(path).catch((error) => error.code === "ENOENT" ? null : Promise.reject(error));

export async function assertMigrationParents(path) {
  let parent = dirname(resolve(path));
  while (true) {
    const metadata = await optionalStat(parent);
    fail(!metadata || metadata.isDirectory() && !metadata.isSymbolicLink(), "Migration path has a linked or non-directory ancestor.");
    const next = dirname(parent);
    if (next === parent) return;
    parent = next;
  }
}

// Unlike the legacy upstream portable hash, this snapshot includes .git,
// node_modules, empty directories and file modes. It never follows descendant
// links. It is evidence for revalidation, not proof of ownership or authority.
export async function captureMigrationPath(path, { limits = {} } = {}) {
  const bounds = { ...LIMITS, ...limits };
  fail(Object.keys(bounds).every((key) => Object.hasOwn(LIMITS, key) && Number.isSafeInteger(bounds[key]) && bounds[key] > 0),
    "Invalid migration snapshot bounds.");
  const absolute = resolve(path);
  await assertMigrationParents(absolute);
  const root = await optionalStat(absolute);
  if (!root) return { kind: "absent", path: absolute };
  if (root.isSymbolicLink()) {
    const target = await readlink(absolute);
    fail(unchanged(root, await lstat(absolute)), "Migration link changed during inspection.");
    return { kind: "symlink", path: absolute, target, identity: identity(root), contentSha256: sha(JSON.stringify(["symlink", target])) };
  }
  const entries = [];
  let bytes = 0;
  let files = 0;
  async function collect(current, name, depth) {
    fail(depth <= bounds.depth && entries.length < bounds.entries, "Migration snapshot exceeds its depth or entry bound.");
    const before = await lstat(current);
    fail(!before.isSymbolicLink(), "Migration payload contains a descendant symbolic link.");
    const mode = before.mode & 0o777;
    if (before.isDirectory()) {
      entries.push({ path: name, kind: "directory", mode });
      const children = [];
      for await (const child of await opendir(current)) {
        fail(children.length < bounds.entries - entries.length, "Migration snapshot exceeds its entry bound.");
        children.push(child.name);
      }
      children.sort((a, b) => Buffer.compare(Buffer.from(a), Buffer.from(b)));
      for (const child of children) await collect(join(current, child), name ? `${name}/${child}` : child, depth + 1);
    } else {
      fail(before.isFile() && before.nlink === 1, "Migration payload must contain only unlinked regular files and directories.");
      fail(before.size <= bounds.bytes - bytes, "Migration snapshot exceeds its byte bound.");
      const handle = await open(current, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0) | (constants.O_NONBLOCK ?? 0));
      const hash = createHash("sha256");
      let size = 0;
      try {
        fail(unchanged(before, await handle.stat()), "Migration file changed while opening.");
        const buffer = Buffer.alloc(Math.min(64 * 1024, bounds.bytes + 1));
        while (true) {
          const { bytesRead } = await handle.read(buffer, 0, buffer.length, null);
          if (!bytesRead) break;
          size += bytesRead;
          fail(size <= bounds.bytes - bytes, "Migration snapshot exceeded its byte bound while reading.");
          hash.update(buffer.subarray(0, bytesRead));
        }
        fail(size === before.size && unchanged(before, await handle.stat()), "Migration file changed during reading.");
      } finally { await handle.close(); }
      bytes += size;
      files += 1;
      entries.push({ path: name, kind: "file", mode, bytes: size, sha256: hash.digest("hex") });
    }
    fail(unchanged(before, await lstat(current)), "Migration payload changed during inspection.");
  }
  await collect(absolute, "", 0);
  fail(unchanged(root, await lstat(absolute)), "Migration root changed during inspection.");
  await assertMigrationParents(absolute);
  return { kind: root.isDirectory() ? "directory" : "file", path: absolute,
    identity: identity(root), contentSha256: sha(JSON.stringify(entries)), files, bytes, entries };
}

export function migrationSnapshotMatches(expected, actual) {
  if (!expected || !actual || expected.path !== actual.path || expected.kind !== actual.kind) return false;
  if (expected.kind === "absent") return true;
  return expected.identity?.device === actual.identity?.device && expected.identity?.inode === actual.identity?.inode
    && typeof expected.contentSha256 === "string" && expected.contentSha256 === actual.contentSha256;
}

export async function revalidateMigrationPath(expected, options) {
  const actual = await captureMigrationPath(expected.path, options);
  fail(migrationSnapshotMatches(expected, actual), "Migration path changed after planning; preserve it and replan.");
  return actual;
}
