import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { lstat, mkdir, mkdtemp, readFile, readlink, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  APPROVED_SOURCES,
  buildInstallerArguments,
  buildPlan,
  calculateSkillDirectoryHash,
  ensureRequestedAgentLinks,
  reconcileSkillLock,
  validateManifest,
} from "../scripts/sync-personal-skills.mjs";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = join(repositoryRoot, "config", "personal-skills.manifest.json");

async function manifestFixture() {
  return JSON.parse(await readFile(manifestPath, "utf8"));
}

async function privateFixture() {
  return mkdtemp(join(tmpdir(), "qs-personal-skills-test-"));
}

test("personal skill manifest declares only approved immutable sources and all eighteen skills", async () => {
  const manifest = await manifestFixture();
  const normalized = validateManifest(manifest);

  assert.equal(normalized.installer.package, "skills");
  assert.equal(normalized.installer.version, "1.5.23");
  assert.equal(normalized.canonicalDirectory, "~/.agents/skills");
  assert.equal(normalized.sources.length, 4);
  assert.equal(normalized.sources.flatMap((source) => source.skills).length, 18);
  assert.deepEqual(
    normalized.sources.map((source) => source.repository).sort(),
    Object.keys(APPROVED_SOURCES).sort(),
  );
});

test("the aggregate skill gate remains verification-only", async () => {
  const project = JSON.parse(await readFile(join(repositoryRoot, "package.json"), "utf8"));
  assert.equal(
    project.scripts["skills:verify"],
    "npm run check:codex && npm test && npm run personal-skills:verify -- --json",
  );
  assert.doesNotMatch(project.scripts["skills:verify"], /sync|install|add/);
});

test("manifest validation rejects unknown sources, duplicate names, mutable revisions, and hash drift", async () => {
  const fixture = await manifestFixture();

  const unknown = structuredClone(fixture);
  unknown.sources[0].repository = "someone/unapproved";
  assert.throws(() => validateManifest(unknown), /approved source/i);

  const duplicate = structuredClone(fixture);
  duplicate.sources[1].skills[0].name = duplicate.sources[0].skills[0].name;
  assert.throws(() => validateManifest(duplicate), /duplicate skill/i);

  const floating = structuredClone(fixture);
  floating.sources[0].revision = "main";
  assert.throws(() => validateManifest(floating), /immutable revision/i);

  const invalidHash = structuredClone(fixture);
  invalidHash.sources[0].skills[0].contentSha256 = "not-a-hash";
  assert.throws(() => validateManifest(invalidHash), /sha-256/i);

  const wrongInstaller = structuredClone(fixture);
  wrongInstaller.installer.version = "1.5.22";
  assert.throws(() => validateManifest(wrongInstaller), /pinned installer/i);
});

test("directory hashing matches installer localeCompare ordering and excludes Git and node_modules", async () => {
  const root = await privateFixture();
  try {
    await mkdir(join(root, "nested"), { recursive: true });
    await mkdir(join(root, ".git"), { recursive: true });
    await mkdir(join(root, "node_modules"), { recursive: true });
    await writeFile(join(root, "Zeta.md"), "z");
    await writeFile(join(root, "alpha.md"), "a");
    await writeFile(join(root, "nested", "Beta.md"), "b");
    await writeFile(join(root, ".git", "ignored"), "ignore");
    await writeFile(join(root, "node_modules", "ignored"), "ignore");

    const files = [
      ["Zeta.md", "z"],
      ["alpha.md", "a"],
      ["nested/Beta.md", "b"],
    ].sort(([first], [second]) => first.localeCompare(second));
    const expected = createHash("sha256");
    for (const [relative, contents] of files) {
      expected.update(relative);
      expected.update(contents);
    }

    const actual = await calculateSkillDirectoryHash(root);
    assert.equal(actual, expected.digest("hex"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("the Mac unlazy content hash reproduces the recorded installer-compatible digest", async () => {
  const manifest = await manifestFixture();
  const entry = manifest.sources.flatMap((source) => source.skills).find((skill) => skill.name === "unlazy");

  assert.equal(entry.contentSha256, "f93525f0a3dc840746eebeb6855b542862c4c92d3e5791b361ed3ed0fd1d7b85");
  assert.equal(entry.upstreamTreeHash, "754d9a68109e39b836cc72a39fb9a823f9d6b613");
});

test("lock reconciliation preserves unrelated entries, unknown fields, and original installation dates", async () => {
  const manifest = await manifestFixture();
  const source = manifest.sources.find((entry) => entry.repository === "Leonxlnx/unlazy");
  const skill = source.skills.find((entry) => entry.name === "unlazy");
  const original = {
    version: 3,
    customRoot: "keep",
    skills: {
      unrelated: { source: "someone/else", custom: true },
      unlazy: {
        source: "Leonxlnx/unlazy",
        sourceType: "github",
        skillPath: "SKILL.md",
        skillFolderHash: skill.upstreamTreeHash,
        installedAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
        preservedField: "yes",
      },
    },
  };

  const result = reconcileSkillLock(original, [{ source, skill }], "2026-08-23T00:00:00.000Z");
  assert.equal(result.changed, true);
  assert.equal(result.lock.customRoot, "keep");
  assert.deepEqual(result.lock.skills.unrelated, original.skills.unrelated);
  assert.equal(result.lock.skills.unlazy.installedAt, "2026-01-01T00:00:00.000Z");
  assert.equal(result.lock.skills.unlazy.preservedField, "yes");
  assert.equal(result.lock.skills.unlazy.ref, source.revision);

  const repeated = reconcileSkillLock(result.lock, [{ source, skill }], "2026-08-24T00:00:00.000Z");
  assert.equal(repeated.changed, false);
  assert.deepEqual(repeated.lock, result.lock);
});

test("plan reports missing skills, preserves matched skills, and rejects conflicting content", async () => {
  const root = await privateFixture();
  try {
    const skillRoot = join(root, ".agents", "skills");
    await mkdir(join(skillRoot, "present"), { recursive: true });
    await writeFile(join(skillRoot, "present", "SKILL.md"), "present");
    const matching = await calculateSkillDirectoryHash(join(skillRoot, "present"));
    const mini = {
      canonicalDirectory: "~/.agents/skills",
      sources: [{
        repository: "owner/repo",
        revision: "a".repeat(40),
        skills: [
          { name: "present", upstreamPath: "present/SKILL.md", upstreamTreeHash: "b".repeat(40), contentSha256: matching },
          { name: "missing", upstreamPath: "missing/SKILL.md", upstreamTreeHash: "c".repeat(40), contentSha256: "d".repeat(64) },
        ],
      }],
    };
    const lock = { version: 3, skills: { present: { source: "owner/repo", sourceType: "github", sourceUrl: "https://github.com/owner/repo.git", ref: "a".repeat(40), skillPath: "present/SKILL.md", skillFolderHash: "b".repeat(40) } } };
    const plan = await buildPlan(mini, { homeDirectory: root, lock });

    assert.deepEqual(plan.missing.map((entry) => entry.skill.name), ["missing"]);
    assert.deepEqual(plan.synced.map((entry) => entry.skill.name), ["present"]);
    assert.equal(plan.conflicts.length, 0);

    await writeFile(join(skillRoot, "present", "SKILL.md"), "changed");
    const conflict = await buildPlan(mini, { homeDirectory: root, lock });
    assert.deepEqual(conflict.conflicts.map((entry) => entry.skill.name), ["present"]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("installer arguments pin global Codex installation and explicit skill selection", () => {
  const arguments_ = buildInstallerArguments({
    sourceDirectory: "/tmp/source",
    names: ["first", "second"],
    agents: ["codex"],
  });

  assert.deepEqual(arguments_, [
    "add",
    "/tmp/source",
    "--global",
    "--agent",
    "codex",
    "--skill",
    "first",
    "second",
    "--yes",
  ]);
});

test("Claude links are opt-in, canonical, and idempotent after skills are already installed", async () => {
  const root = await privateFixture();
  try {
    const canonical = join(root, ".agents", "skills", "example");
    await mkdir(canonical, { recursive: true });
    await mkdir(join(root, ".claude"), { recursive: true });
    await writeFile(join(canonical, "SKILL.md"), "example");
    const selection = [{ skill: { name: "example" } }];

    assert.deepEqual(await ensureRequestedAgentLinks(selection, {
      homeDirectory: root,
      agents: ["codex"],
    }), []);

    const destination = join(root, ".claude", "skills", "example");
    assert.deepEqual(await ensureRequestedAgentLinks(selection, {
      homeDirectory: root,
      agents: ["codex", "claude-code"],
    }), [destination]);
    assert.equal((await lstat(destination)).isSymbolicLink(), true);
    assert.equal(resolve(dirname(destination), await readlink(destination)), canonical);
    assert.deepEqual(await ensureRequestedAgentLinks(selection, {
      homeDirectory: root,
      agents: ["claude-code"],
    }), []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
