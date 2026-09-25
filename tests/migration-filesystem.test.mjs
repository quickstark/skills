import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, writeFile, readFile, rename, cp, chmod, symlink, link, rm, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { captureMigrationPath, migrationSnapshotMatches, revalidateMigrationPath } from "../scripts/migration-filesystem.mjs";

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), "qs-migration-snapshot-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const payload = join(root, "payload");
  await mkdir(payload);
  await writeFile(join(payload, "SKILL.md"), "Selected original instructions.\n");
  return { root, payload };
}

test("absent migration paths remain absent and snapshotting never creates parents", async (t) => {
  const { root } = await fixture(t);
  const path = join(root, "absent", "selected");
  assert.deepEqual(await captureMigrationPath(path), { kind: "absent", path });
  assert.deepEqual(await readdir(root), ["payload"]);
});

test("complete content digest is portable while inode and path bind the observed instance", async (t) => {
  const { root, payload } = await fixture(t);
  await mkdir(join(payload, "empty"));
  const first = await captureMigrationPath(payload);
  const copy = join(root, "copy");
  await cp(payload, copy, { recursive: true });
  const second = await captureMigrationPath(copy);
  assert.equal(first.contentSha256, second.contentSha256);
  assert.notDeepEqual(first.identity, second.identity);
  assert.equal(migrationSnapshotMatches(first, second), false);
  assert.equal(migrationSnapshotMatches(first, await revalidateMigrationPath(first)), true);
});

test("normally ignored descendant files and empty directories participate in retirement evidence", async (t) => {
  const { payload } = await fixture(t);
  let before = await captureMigrationPath(payload);
  for (const directory of [".git", "node_modules", "local-empty-directory"]) {
    await mkdir(join(payload, directory));
    const empty = await captureMigrationPath(payload);
    assert.notEqual(empty.contentSha256, before.contentSha256, "even an empty user directory must invalidate retirement");
    await writeFile(join(payload, directory, "local-note"), "Do not delete my local file.");
    const withFile = await captureMigrationPath(payload);
    assert.notEqual(withFile.contentSha256, empty.contentSha256);
    before = withFile;
  }
  assert.equal(before.files, 4);
});

test("same-byte replacement, content changes, renames and mode changes invalidate physical evidence", async (t) => {
  const { root, payload } = await fixture(t);
  const path = join(payload, "SKILL.md");
  let before = await captureMigrationPath(payload);
  await writeFile(path, "Changed instructions.\n");
  await assert.rejects(revalidateMigrationPath(before), /changed after planning/);
  before = await captureMigrationPath(payload);
  await rename(path, join(payload, "REFERENCE.md"));
  await assert.rejects(revalidateMigrationPath(before), /changed after planning/);
  before = await captureMigrationPath(payload);
  await chmod(join(payload, "REFERENCE.md"), 0o700);
  await assert.rejects(revalidateMigrationPath(before), /changed after planning/);
  before = await captureMigrationPath(payload);
  const replacement = join(root, "replacement");
  await cp(payload, replacement, { recursive: true });
  await rename(payload, join(root, "original"));
  await rename(replacement, payload);
  const after = await captureMigrationPath(payload);
  assert.equal(after.contentSha256, before.contentSha256);
  await assert.rejects(revalidateMigrationPath(before), /changed after planning/);
});

test("top-level aliases record their literal target without following it", async (t) => {
  const { root, payload } = await fixture(t);
  const path = join(root, "alias");
  await symlink("payload", path);
  const original = await captureMigrationPath(path);
  assert.equal(original.kind, "symlink");
  assert.equal(original.target, "payload");
  assert.equal(migrationSnapshotMatches(original, await captureMigrationPath(path)), true);
  await rm(path);
  await symlink(payload, path);
  await assert.rejects(revalidateMigrationPath(original), /changed after planning/);
  await rm(path);
  await symlink("does-not-exist", path);
  assert.equal((await captureMigrationPath(path)).target, "does-not-exist");
});

test("descendant links, ancestor links and multiply linked files block evidence without modifying their targets", async (t) => {
  const { root, payload } = await fixture(t);
  const original = join(root, "outside");
  await writeFile(original, "Preserve external bytes.");
  const child = join(payload, "linked");
  await symlink(original, child);
  await assert.rejects(captureMigrationPath(payload), /descendant symbolic link/);
  await rm(child);
  await link(original, child);
  await assert.rejects(captureMigrationPath(payload), /unlinked regular files/);
  await rm(child);
  const parent = join(root, "linked-parent");
  await symlink(payload, parent);
  await assert.rejects(captureMigrationPath(join(parent, "SKILL.md")), /linked or non-directory ancestor/);
  assert.equal(await readFile(original, "utf8"), "Preserve external bytes.");
});

test("byte, entry and depth limits fail before providing a usable snapshot", async (t) => {
  const { payload } = await fixture(t);
  await assert.rejects(captureMigrationPath(payload, { limits: { bytes: 4 } }), /byte bound/);
  await assert.rejects(captureMigrationPath(payload, { limits: { entries: 1 } }), /entry bound/);
  await mkdir(join(payload, "a", "b"), { recursive: true });
  await assert.rejects(captureMigrationPath(payload, { limits: { depth: 1 } }), /depth or entry bound/);
  for (const limits of [{ entries: -1 }, { bytes: Infinity }, { unknown: 1 }]) {
    await assert.rejects(captureMigrationPath(payload, { limits }), /Invalid migration snapshot bounds/);
  }
});

test("single regular state files have content evidence and strict physical identity", async (t) => {
  const { payload } = await fixture(t);
  const path = join(payload, "SKILL.md");
  const snapshot = await captureMigrationPath(path);
  assert.equal(snapshot.kind, "file");
  assert.equal(snapshot.files, 1);
  assert.equal(snapshot.bytes, Buffer.byteLength(await readFile(path)));
  await writeFile(path, "A different state.");
  await assert.rejects(revalidateMigrationPath(snapshot), /changed after planning/);
});

test("POSIX FIFOs are rejected before a blocking read", { skip: process.platform === "win32" }, async (t) => {
  const { payload } = await fixture(t);
  const created = spawnSync("mkfifo", [join(payload, "stream")], { encoding: "utf8" });
  assert.equal(created.status, 0, created.stderr);
  await assert.rejects(captureMigrationPath(payload), /unlinked regular files/);
});
