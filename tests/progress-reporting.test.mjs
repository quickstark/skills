import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";

import {
  HELPER_PROGRESS_CONTRACT, PUBLIC_PROGRESS_CONTRACT, progressInventory,
  syncProgressContracts, validateProgressInventory, withProgressContract,
} from "../scripts/progress-reporting-contract.mjs";

const original = '---\nname: preserved\ndescription: "Keep literal $HOME and `code`."\n---\n\n# Original\n\nText with trailing spaces.  \n\n## Completion report and next steps\n\nOriginal completion policy.\n';

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), "qs-progress-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const path of Object.values(progressInventory()).flat()) {
    await mkdir(dirname(join(root, path)), { recursive: true });
    await writeFile(join(root, path), original);
  }
  return root;
}

test("repository inventory accounts for every canonical skill and internal reference", async () => {
  const inventory = await validateProgressInventory();
  assert.equal(inventory.standaloneSkills.length, 19);
  assert.equal(inventory.internalReferences.length, 20);
  assert.equal(inventory.publicSkills.length, 33, "twelve core, eight specialists, thirteen PS commands");
  assert.equal(inventory.publicSkills.length + inventory.standaloneSkills.length, 52);
  assert.equal(new Set(Object.values(inventory).flat()).size, inventory.publicSkills.length + 39);
});

test("sync covers every standalone and helper, preserving public source and unrelated bytes", async (t) => {
  const root = await fixture(t);
  const inventory = progressInventory();
  const result = await syncProgressContracts({ root });
  assert.equal(result.updated, 39);
  assert.equal(result.standaloneSkills, 19);
  assert.equal(result.internalReferences, 20);
  for (const path of inventory.publicSkills) assert.equal(await readFile(join(root, path), "utf8"), original);
  for (const [kind, paths] of Object.entries(inventory)) {
    if (kind === "publicSkills") continue;
    for (const path of paths) {
      const actual = await readFile(join(root, path), "utf8");
      const insertAt = original.indexOf("## Completion report and next steps");
      assert.ok(actual.startsWith(original.slice(0, insertAt)), path);
      assert.ok(actual.endsWith(original.slice(insertAt)), path);
      assert.ok(actual.includes(kind === "internalReferences" ? HELPER_PROGRESS_CONTRACT : PUBLIC_PROGRESS_CONTRACT), path);
      assert.equal(actual.match(/<!-- qs-progress:start -->/g).length, 1);
      assert.ok(actual.indexOf("## Progress reporting") < actual.indexOf("## Completion report and next steps"));
    }
  }
  assert.equal((await syncProgressContracts({ root })).updated, 0);
  assert.equal((await syncProgressContracts({ root, check: true })).updated, 0);
});

test("check mode reports drift without writing and catches a later removed contract", async (t) => {
  const root = await fixture(t);
  const path = join(root, progressInventory().standaloneSkills[0]);
  await assert.rejects(syncProgressContracts({ root, check: true }), /out of date/);
  assert.equal(await readFile(path, "utf8"), original);
  await syncProgressContracts({ root });
  await writeFile(path, original);
  await assert.rejects(syncProgressContracts({ root, check: true }), /out of date/);
  assert.equal(await readFile(path, "utf8"), original);
});

test("unknown public, standalone, internal, and new bucket sources cannot disappear from coverage", async (t) => {
  for (const unknown of [
    "skills/engineering/qs-unknown/SKILL.md", "skills/personal/unknown/SKILL.md",
    "skills/internal/unknown.md", "skills/pstack/internal/unknown.md", "skills/new-bucket/unknown/SKILL.md",
  ]) {
    await t.test(unknown, async (t) => {
      const root = await fixture(t);
      await mkdir(dirname(join(root, unknown)), { recursive: true });
      await writeFile(join(root, unknown), original);
      await assert.rejects(syncProgressContracts({ root }), /inventory mismatch.*Unknown:/);
      assert.equal(await readFile(join(root, progressInventory().standaloneSkills[0]), "utf8"), original);
    });
  }
});

test("missing public, standalone, or helper source fails inventory before writes", async (t) => {
  for (const kind of ["publicSkills", "standaloneSkills", "internalReferences"]) {
    await t.test(kind, async (t) => {
      const root = await fixture(t);
      const missing = progressInventory()[kind][0];
      await rm(join(root, missing));
      await assert.rejects(validateProgressInventory({ root }), (error) => error.message.includes(`Missing: ${missing}`));
    });
  }
});

test("managed replacement preserves all bytes outside its exact boundaries", () => {
  const prefix = original + "\n";
  const suffix = "\n\nPreserved suffix.  \n";
  const oldBlock = "<!-- qs-progress:start -->\nold guidance\n<!-- qs-progress:end -->";
  const actual = withProgressContract(prefix + oldBlock + suffix);
  assert.ok(actual.startsWith(prefix));
  assert.ok(actual.endsWith(suffix));
  assert.ok(!actual.includes("old guidance"));
  assert.equal(withProgressContract(actual), actual);
});

test("LF, CRLF, empty, and unterminated files remain idempotent and keep original bytes", () => {
  for (const source of [original, original.replaceAll("\n", "\r\n"), "", "# Heading\n\nNo final newline"]) {
    const actual = withProgressContract(source);
    assert.equal(withProgressContract(actual), actual);
    if (source.includes("\r\n")) assert.equal(actual.replaceAll("\r\n", "").includes("\n"), false);
    if (!source.includes("## Completion report")) assert.ok(actual.startsWith(source));
  }
});

test("appended standalone and helper sections end with exactly one newline without trimming original bytes", () => {
  for (const source of ["", "# Source", "# Source\n", "# Source\n\n", "# Source\r\n\r\n"]) {
    for (const helper of [false, true]) {
      const actual = withProgressContract(source, { helper });
      const newline = source.includes("\r\n") ? "\r\n" : "\n";
      assert.ok(actual.startsWith(source));
      assert.ok(actual.endsWith(`<!-- qs-progress:end -->${newline}`));
      assert.equal(withProgressContract(actual, { helper }), actual);
    }
  }
});

test("malformed, repeated, reversed, or inline marker boundaries fail safely", () => {
  for (const source of [
    "<!-- qs-progress:start -->\nmissing end", "<!-- qs-progress:end -->",
    "<!-- qs-progress:start -->\n<!-- qs-progress:start -->\n<!-- qs-progress:end -->",
    "<!-- qs-progress:end -->\n<!-- qs-progress:start -->",
    "<!-- qs-progress:star -->\n<!-- qs-progress:end -->",
    "inline <!-- qs-progress:start -->\n<!-- qs-progress:end -->",
    "<!-- qs-progress:start -->\ninline <!-- qs-progress:end -->",
    "<!-- qs-progress:start -->\n<!-- qs-progress:end --> inline",
  ]) assert.throws(() => withProgressContract(source), /Malformed/);
});

test("inventory refuses linked content rather than writing outside the selected source root", async (t) => {
  const root = await fixture(t);
  const path = progressInventory().standaloneSkills[0];
  const target = join(root, "untouched.md");
  await writeFile(target, original);
  await rm(join(root, path));
  await symlink(target, join(root, path));
  await assert.rejects(syncProgressContracts({ root }), /symbolic links/);
  assert.equal(await readFile(target, "utf8"), original);
});

test("a malformed late helper fails preflight without partially updating earlier standalone sources", async (t) => {
  const root = await fixture(t);
  const paths = progressInventory();
  const broken = paths.internalReferences.at(-1);
  await writeFile(join(root, broken), "<!-- qs-progress:start -->\nbroken");
  await assert.rejects(syncProgressContracts({ root }), (error) => error.message.includes(broken) && /Malformed/.test(error.message));
  assert.equal(await readFile(join(root, paths.standaloneSkills[0]), "utf8"), original);
});
