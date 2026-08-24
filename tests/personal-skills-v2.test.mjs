import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { gzipSync } from "node:zlib";

import {
  addManifestResource,
  migrateManifestV1,
  normalizeManifest,
} from "../scripts/personal-skills/manifest.mjs";
import {
  calculatePortableDirectoryHash,
  calculatePortableGitTreeHash,
  inspectPortableDirectory,
} from "../scripts/personal-skills/filesystem.mjs";
import { inventoryMachine } from "../scripts/personal-skills/inventory.mjs";
import { matchesPiGlob } from "../scripts/personal-skills/pi-discovery.mjs";
import { adoptInventoryCandidate } from "../scripts/personal-skills/adopt.mjs";
import {
  applyHarnessProjections,
  buildPiPackageAction,
  buildReconciliationPlan,
} from "../scripts/personal-skills/reconcile.mjs";
import { validateInstallerLock, verifyInstallerArchiveIntegrity } from "../scripts/sync-personal-skills.mjs";

const runFile = promisify(execFile);
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const v1ManifestPath = join(repositoryRoot, "config", "personal-skills.manifest.json");

async function fixtureRoot() {
  return mkdtemp(join(tmpdir(), "qs-personal-v2-"));
}

function agentResource(name, contentSha256, overrides = {}) {
  return {
    type: "agent-skill",
    name,
    source: {
      kind: "github",
      repository: "owner/repository",
      revision: "a".repeat(40),
      license: "MIT",
      licensePath: "LICENSE",
      upstreamPath: `skills/${name}/SKILL.md`,
      upstreamTreeHash: "b".repeat(40),
      contentSha256,
    },
    placement: {
      canonical: "~/.agents/skills",
      targets: ["codex", "pi", "claude-code"],
    },
    ...overrides,
  };
}

function piPackageResource(name = "pi-skill-pack", contentSha256 = "f".repeat(64)) {
  return {
    type: "pi-package",
    name,
    source: {
      kind: "npm",
      package: `@example/${name}`,
      version: "2.3.4",
      integrity: `sha512-${Buffer.alloc(64, 7).toString("base64")}`,
      license: "MIT",
      licensePath: "LICENSE",
    },
    skills: [{ name: "pi-example", path: "skills/pi-example/SKILL.md", contentSha256 }],
    placement: { targets: ["pi"] },
  };
}

function piGitPackageResource(revision, contentSha256) {
  return {
    type: "pi-package",
    name: "pi-git-pack",
    source: {
      kind: "github",
      repository: "example/pi-git-pack",
      revision,
      license: "MIT",
      licensePath: "LICENSE",
    },
    skills: [{ name: "pi-git-skill", path: "skills/pi-git-skill/SKILL.md", contentSha256 }],
    placement: { targets: ["pi"] },
  };
}

function manifest(resources = []) {
  return {
    schemaVersion: 2,
    installer: {
      package: "skills",
      version: "1.5.23",
      integrity: "sha512-+hMNBSi35yfX0sKD+ZcRm9y5or7u313OdkcvrRvJAsAzGCaA8wRTu2OmVdN0KRbk9ybqKby5dijkn6OVvNTUmw==",
    },
    canonicalDirectory: "~/.agents/skills",
    resources,
  };
}

async function writeSkill(path, name, body = name) {
  await mkdir(path, { recursive: true });
  await writeFile(join(path, "SKILL.md"), `---\nname: ${name}\ndescription: test skill\n---\n\n${body}\n`);
}

async function makeManagedSkill(root, name = "managed") {
  const path = join(root, ".agents", "skills", name);
  await writeSkill(path, name);
  const hash = await calculatePortableDirectoryHash(path);
  await mkdir(join(root, ".agents"), { recursive: true });
  await writeFile(join(root, ".agents", ".skill-lock.json"), JSON.stringify({ version: 3, skills: {
    [name]: {
      source: "owner/repository",
      sourceType: "github",
      sourceUrl: "https://github.com/owner/repository.git",
      ref: "a".repeat(40),
      skillPath: `skills/${name}/SKILL.md`,
      skillFolderHash: "b".repeat(40),
      contentSha256: hash,
    },
  } }));
  return {
    path,
    hash,
  };
}

function skillContents(name, body = name) {
  return `---\nname: ${name}\ndescription: test skill\n---\n\n${body}\n`;
}

function skillDirectoryHash(name, body = name) {
  return createHash("sha256").update("SKILL.md").update(skillContents(name, body)).digest("hex");
}

function tarField(buffer, offset, length, value) {
  const encoded = Buffer.from(value);
  encoded.copy(buffer, offset, 0, Math.min(encoded.length, length));
}

function tarOctal(buffer, offset, length, value) {
  tarField(buffer, offset, length, `${value.toString(8).padStart(length - 1, "0")}\0`);
}

function makeTarGzip(entries) {
  const chunks = [];
  for (const entry of entries) {
    const contents = Buffer.from(entry.contents ?? "");
    const header = Buffer.alloc(512);
    tarField(header, 0, 100, entry.path);
    tarOctal(header, 100, 8, entry.mode ?? (entry.type === "5" ? 0o755 : 0o644));
    tarOctal(header, 108, 8, 0);
    tarOctal(header, 116, 8, 0);
    tarOctal(header, 124, 12, contents.length);
    tarOctal(header, 136, 12, 0);
    header.fill(0x20, 148, 156);
    tarField(header, 156, 1, entry.type ?? "0");
    tarField(header, 157, 100, entry.linkPath ?? "");
    tarField(header, 257, 6, "ustar\0");
    tarField(header, 263, 2, "00");
    const checksum = header.reduce((sum, byte) => sum + byte, 0);
    tarField(header, 148, 8, `${checksum.toString(8).padStart(6, "0")}\0 `);
    chunks.push(header, contents, Buffer.alloc((512 - (contents.length % 512)) % 512));
  }
  chunks.push(Buffer.alloc(1024));
  return gzipSync(Buffer.concat(chunks));
}

async function initializeGitSource(root, name = "candidate") {
  const source = join(root, "source");
  await writeSkill(join(source, "skills", name), name, "candidate body");
  await writeFile(join(source, "LICENSE"), "MIT License\n\nPermission is hereby granted, free of charge, to any person obtaining a copy.\n");
  await runFile("git", ["init", "--quiet", source]);
  await runFile("git", ["-C", source, "config", "user.email", "fixture@example.invalid"]);
  await runFile("git", ["-C", source, "config", "user.name", "Fixture"]);
  await runFile("git", ["-C", source, "add", "."]);
  await runFile("git", ["-C", source, "commit", "--quiet", "-m", "fixture"]);
  const revision = (await runFile("git", ["-C", source, "rev-parse", "HEAD"])).stdout.trim();
  const tree = (await runFile("git", ["-C", source, "rev-parse", `${revision}:skills/${name}`])).stdout.trim();
  return { source, revision, tree };
}

test("manifest migration preserves every v1 skill and immutable source field", async () => {
  const current = JSON.parse(await readFile(v1ManifestPath, "utf8"));
  const grouped = new Map();
  for (const resource of current.resources.filter((entry) => entry.type === "agent-skill")) {
    const key = `${resource.source.repository}@${resource.source.revision}`;
    const source = grouped.get(key) ?? {
      repository: resource.source.repository,
      revision: resource.source.revision,
      license: resource.source.license,
      licensePath: resource.source.licensePath,
      skills: [],
    };
    source.skills.push({
      name: resource.name,
      upstreamPath: resource.source.upstreamPath,
      upstreamTreeHash: resource.source.upstreamTreeHash,
      contentSha256: resource.source.contentSha256,
      ...(resource.source.pluginName ? { pluginName: resource.source.pluginName } : {}),
    });
    grouped.set(key, source);
  }
  const legacy = {
    schemaVersion: 1,
    installer: { package: "skills", version: "1.5.23" },
    canonicalDirectory: "~/.agents/skills",
    sources: [...grouped.values()],
  };
  const migrated = migrateManifestV1(legacy);
  const normalized = normalizeManifest(legacy);

  assert.equal(migrated.schemaVersion, 2);
  assert.equal(migrated.resources.length, current.resources.filter((entry) => entry.type === "agent-skill").length);
  assert.deepEqual(normalized, migrated);
  assert.deepEqual(
    migrated.resources.map((resource) => resource.name).sort(),
    legacy.sources.flatMap((source) => source.skills.map((skill) => skill.name)).sort(),
  );

  for (const source of legacy.sources) {
    for (const skill of source.skills) {
      const resource = migrated.resources.find((entry) => entry.name === skill.name);
      assert.equal(resource.source.repository, source.repository);
      assert.equal(resource.source.revision, source.revision);
      assert.equal(resource.source.license, source.license);
      assert.equal(resource.source.upstreamPath, skill.upstreamPath);
      assert.equal(resource.source.upstreamTreeHash, skill.upstreamTreeHash);
      assert.equal(resource.source.contentSha256, skill.contentSha256);
      assert.deepEqual(resource.placement.targets, ["claude-code", "codex", "pi"]);
    }
  }
});

test("portable Git tree hashing matches the immutable upstream tree identity", async () => {
  const root = await fixtureRoot();
  try {
    const git = await initializeGitSource(root, "tree-hash");
    assert.equal(await calculatePortableGitTreeHash(join(git.source, "skills", "tree-hash")), git.tree);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("schema-v2 manifest validation accepts new immutable resources and rejects unsafe placement", () => {
  const value = manifest([
    agentResource("example", "c".repeat(64)),
    piPackageResource(),
  ]);
  assert.equal(normalizeManifest(value).resources.length, 2);
  assert.equal(addManifestResource(manifest(), value.resources[0]).resources.length, 1);
  assert.throws(
    () => normalizeManifest(manifest([agentResource("example", "c".repeat(64), {
      placement: { canonical: "~/.codex/skills", targets: ["codex"] },
    })])),
    /canonical|Codex and Pi/i,
  );
  assert.throws(
    () => normalizeManifest(manifest([piPackageResource("floating").source = {
      kind: "npm", package: "floating", version: "latest", integrity: "sha512-nope",
    }])),
  );
});

test("inventory classifies canonical and harness surfaces without promoting vendor ownership", async () => {
  const root = await fixtureRoot();
  try {
    const managed = await makeManagedSkill(root);
    const candidatePath = join(root, ".agents", "skills", "candidate");
    await writeSkill(candidatePath, "candidate");
    const unresolvedPath = join(root, ".agents", "skills", "unresolved");
    await writeSkill(unresolvedPath, "unresolved");
    await mkdir(join(root, ".agents"), { recursive: true });
    await writeFile(join(root, ".agents", ".skill-lock.json"), JSON.stringify({
      version: 3,
      skills: {
        managed: {
          source: "owner/repository",
          sourceType: "github",
          sourceUrl: "https://github.com/owner/repository.git",
          ref: "a".repeat(40),
          skillPath: "skills/managed/SKILL.md",
          skillFolderHash: "b".repeat(40),
          contentSha256: managed.hash,
        },
        candidate: {
          source: "owner/candidate",
          sourceType: "github",
          ref: "d".repeat(40),
          skillPath: "skills/candidate/SKILL.md",
          skillFolderHash: "e".repeat(40),
        },
      },
    }));

    await writeSkill(join(root, ".codex", "skills", ".system", "vendor-owned"), "vendor-owned");
    await mkdir(join(root, ".codex", "skills"), { recursive: true });
    await symlink(join(root, ".agents", "skills", "managed"), join(root, ".codex", "skills", "managed"), "dir");
    await mkdir(join(root, ".codex", "plugins", "cache", "publisher", "plugin", "1.0.0"), { recursive: true });
    await mkdir(join(root, ".claude", "skills"), { recursive: true });
    await symlink(join(root, ".agents", "skills", "managed"), join(root, ".claude", "skills", "managed"), "dir");
    await mkdir(join(root, ".pi", "agent", "skills"), { recursive: true });
    await symlink(join(root, ".agents", "skills", "managed"), join(root, ".pi", "agent", "skills", "managed"), "dir");
    await mkdir(join(root, ".pi", "agent"), { recursive: true });
    await writeFile(join(root, ".pi", "agent", "settings.json"), JSON.stringify({
      packages: ["npm:@example/pi-skill-pack@2.3.4"],
      apiKey: "must-not-appear",
    }));

    const piInstalled = join(root, ".pi", "agent", "npm", "node_modules", "@example", "pi-skill-pack");
    await writeSkill(join(piInstalled, "skills", "pi-example"), "pi-example");
    await writeFile(join(piInstalled, "package.json"), JSON.stringify({ name: "@example/pi-skill-pack", version: "2.3.4" }));
    const piSkillHash = await calculatePortableDirectoryHash(join(piInstalled, "skills", "pi-example"));

    const report = await inventoryMachine({
      manifest: manifest([
        agentResource("managed", managed.hash),
        piPackageResource("pi-skill-pack", piSkillHash),
      ]),
      homeDirectory: root,
    });
    const byIdentity = new Map(report.resources.map((resource) => [resource.identity, resource]));

    assert.equal(byIdentity.get("agent-skills:managed").classification, "managed");
    assert.equal(byIdentity.get("agent-skills:candidate").classification, "candidate");
    assert.equal(byIdentity.get("agent-skills:unresolved").classification, "unresolved");
    assert.equal(byIdentity.get("codex-user:managed").classification, "alias");
    assert.equal(byIdentity.get("claude-user:managed").classification, "alias");
    assert.equal(byIdentity.get("pi-user:managed").classification, "alias");
    assert.equal(byIdentity.get("codex-system:vendor-owned").classification, "ignored");
    assert.equal(byIdentity.get("codex-plugin:publisher/plugin@1.0.0").classification, "separately-managed");
    assert.equal(byIdentity.get("pi-package:@example/pi-skill-pack").classification, "managed");
    assert.equal(JSON.stringify(report).includes(root), false, JSON.stringify(report, null, 2));
    assert.equal(JSON.stringify(report).includes("must-not-appear"), false);

    const repeated = await inventoryMachine({
      manifest: report.manifest,
      homeDirectory: root,
    });
    assert.equal(repeated.stateToken, report.stateToken);
    assert.deepEqual(repeated.resources, report.resources);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("inventory rejects nested symlinks, special files, oversized trees, and effective-name collisions", async () => {
  const root = await fixtureRoot();
  try {
    const skill = join(root, ".agents", "skills", "unsafe");
    await writeSkill(skill, "shared-name");
    await symlink("/tmp", join(skill, "nested"), "dir");
    const inspection = await inspectPortableDirectory(skill);
    assert.equal(inspection.safe, false);
    assert.match(inspection.reason, /symbolic link/i);

    const bounded = join(root, ".agents", "skills", "bounded");
    await writeSkill(bounded, "bounded");
    await writeFile(join(bounded, "large.bin"), Buffer.alloc(128));
    const report = await inventoryMachine({
      manifest: manifest(),
      homeDirectory: root,
      limits: { maximumEntries: 20, maximumFilesPerSkill: 8, maximumBytesPerSkill: 64 },
    });
    assert.equal(report.resources.find((entry) => entry.identity === "agent-skills:unsafe").classification, "conflict");
    assert.equal(report.resources.find((entry) => entry.identity === "agent-skills:bounded").classification, "conflict");

    await writeSkill(join(root, ".claude", "skills", "other-folder"), "shared-name");
    const collisions = await inventoryMachine({ manifest: manifest(), homeDirectory: root });
    assert.ok(collisions.collisions.some((entry) => entry.effectiveName === "shared-name"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("inventory and adoption reject traversal provenance before reading outside selected roots", async () => {
  const root = await fixtureRoot();
  try {
    await writeSkill(join(root, ".agents", "skills", "unsafe-provenance"), "unsafe-provenance");
    await mkdir(join(root, ".agents"), { recursive: true });
    await writeFile(join(root, ".agents", ".skill-lock.json"), JSON.stringify({ version: 3, skills: {
      "unsafe-provenance": {
        source: "owner/repo", sourceType: "github", ref: "a".repeat(40),
        skillPath: "../../outside/SKILL.md", skillFolderHash: "b".repeat(40),
      },
    } }));
    const manifestPath = join(root, "manifest.json");
    await writeFile(manifestPath, `${JSON.stringify(manifest(), null, 2)}\n`);
    const report = await inventoryMachine({ manifest: manifest(), homeDirectory: root });
    const resource = report.resources.find((entry) => entry.identity === "agent-skills:unsafe-provenance");
    assert.equal(resource.classification, "unresolved");
    await assert.rejects(() => adoptInventoryCandidate({
      manifestPath,
      homeDirectory: root,
      candidateIdentity: resource.identity,
      expectedStateToken: report.stateToken,
      resourceType: "agent-skill",
      targets: ["codex", "pi"],
      license: "MIT",
      licensePath: "../../outside/LICENSE",
    }), /safe relative path/i);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("portable inventory rejects directory and frontmatter name mismatches", async () => {
  const root = await fixtureRoot();
  try {
    await writeSkill(join(root, ".agents", "skills", "folder-name"), "different-name");
    const report = await inventoryMachine({ manifest: manifest(), homeDirectory: root });
    const resource = report.resources.find((entry) => entry.identity === "agent-skills:folder-name");
    assert.equal(resource.classification, "conflict");
    assert.match(resource.reason, /frontmatter names must match/i);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("adopt re-inventories a candidate and records verified immutable provenance without installing it", async () => {
  const root = await fixtureRoot();
  try {
    const git = await initializeGitSource(root);
    const live = join(root, ".agents", "skills", "candidate");
    await writeSkill(live, "candidate", "candidate body");
    await mkdir(join(root, ".agents"), { recursive: true });
    await writeFile(join(root, ".agents", ".skill-lock.json"), JSON.stringify({
      version: 3,
      skills: {
        candidate: {
          source: "owner/source",
          sourceType: "github",
          ref: git.revision,
          skillPath: "skills/candidate/SKILL.md",
          skillFolderHash: git.tree,
        },
      },
    }));
    const manifestPath = join(root, "manifest.json");
    await writeFile(manifestPath, `${JSON.stringify(manifest(), null, 2)}\n`);
    const before = await inventoryMachine({ manifest: manifest(), homeDirectory: root });

    const result = await adoptInventoryCandidate({
      manifestPath,
      homeDirectory: root,
      candidateIdentity: "agent-skills:candidate",
      expectedStateToken: before.stateToken,
      resourceType: "agent-skill",
      targets: ["codex", "pi", "claude-code"],
      license: "MIT",
      licensePath: "LICENSE",
      sourceDirectory: git.source,
    });
    const written = JSON.parse(await readFile(manifestPath, "utf8"));

    assert.equal(result.resource.source.revision, git.revision);
    assert.equal(result.resource.source.upstreamTreeHash, git.tree);
    assert.equal(result.resource.source.contentSha256, await calculatePortableDirectoryHash(live));
    assert.equal(written.resources.length, 1);
    assert.equal((await lstat(live)).isDirectory(), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("adopt rejects stale inventory, unresolved provenance, and tampered upstream content", async () => {
  const root = await fixtureRoot();
  try {
    const git = await initializeGitSource(root);
    const live = join(root, ".agents", "skills", "candidate");
    await writeSkill(live, "candidate", "candidate body");
    await mkdir(join(root, ".agents"), { recursive: true });
    await writeFile(join(root, ".agents", ".skill-lock.json"), JSON.stringify({ version: 3, skills: {
      candidate: { source: "owner/source", sourceType: "github", ref: git.revision, skillPath: "skills/candidate/SKILL.md", skillFolderHash: git.tree },
    } }));
    const manifestPath = join(root, "manifest.json");
    await writeFile(manifestPath, `${JSON.stringify(manifest(), null, 2)}\n`);
    const before = await inventoryMachine({ manifest: manifest(), homeDirectory: root });
    await writeFile(join(live, "changed.txt"), "changed");

    await assert.rejects(() => adoptInventoryCandidate({
      manifestPath,
      homeDirectory: root,
      candidateIdentity: "agent-skills:candidate",
      expectedStateToken: before.stateToken,
      resourceType: "agent-skill",
      targets: ["codex", "pi"],
      license: "MIT",
      licensePath: "LICENSE",
      sourceDirectory: git.source,
    }), /stale|changed/i);

    await rm(join(live, "changed.txt"));
    await writeFile(join(git.source, "skills", "candidate", "SKILL.md"), "tampered");
    const current = await inventoryMachine({ manifest: manifest(), homeDirectory: root });
    await assert.rejects(() => adoptInventoryCandidate({
      manifestPath,
      homeDirectory: root,
      candidateIdentity: "agent-skills:candidate",
      expectedStateToken: current.stateToken,
      resourceType: "agent-skill",
      targets: ["codex", "pi"],
      license: "MIT",
      licensePath: "LICENSE",
      sourceDirectory: git.source,
    }), /contents|digest|Git/i);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("adopt verifies a pinned npm Pi package and records only its contributed skills", async () => {
  const root = await fixtureRoot();
  try {
    const installed = join(root, ".pi", "agent", "npm", "node_modules", "@example", "candidate-pack");
    const staged = join(root, "verified-package");
    for (const packageRoot of [installed, staged]) {
      await writeSkill(join(packageRoot, "skills", "pi-candidate"), "pi-candidate");
      await writeFile(join(packageRoot, "LICENSE"), "MIT License\nPermission is hereby granted\n");
      await writeFile(join(packageRoot, "package.json"), JSON.stringify({ name: "@example/candidate-pack", version: "1.2.3", license: "MIT" }));
    }
    await mkdir(join(root, ".pi", "agent"), { recursive: true });
    await writeFile(join(root, ".pi", "agent", "settings.json"), JSON.stringify({ packages: ["npm:@example/candidate-pack@1.2.3"] }));
    const manifestPath = join(root, "manifest.json");
    await writeFile(manifestPath, `${JSON.stringify(manifest(), null, 2)}\n`);
    const before = await inventoryMachine({ manifest: manifest(), homeDirectory: root });
    assert.equal(before.resources.find((entry) => entry.identity === "pi-package:@example/candidate-pack").classification, "candidate");
    const integrity = `sha512-${Buffer.alloc(64, 11).toString("base64")}`;

    const result = await adoptInventoryCandidate({
      manifestPath,
      homeDirectory: root,
      candidateIdentity: "pi-package:@example/candidate-pack",
      expectedStateToken: before.stateToken,
      resourceType: "pi-package",
      targets: ["pi"],
      license: "MIT",
      licensePath: "LICENSE",
      packageIntegrity: integrity,
      resolveNpmPackage: async (packageName, version, expectedIntegrity) => {
        assert.equal(packageName, "@example/candidate-pack");
        assert.equal(version, "1.2.3");
        assert.equal(expectedIntegrity, integrity);
        return { source: staged, integrity, cleanup: async () => {} };
      },
    });

    assert.equal(result.resource.type, "pi-package");
    assert.equal(result.resource.source.integrity, integrity);
    assert.deepEqual(result.resource.skills.map((skill) => skill.name), ["pi-candidate"]);
    assert.equal(JSON.parse(await readFile(manifestPath, "utf8")).resources.length, 1);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("adopt verifies a file-backed npm Pi package skill without executing the package", async () => {
  const root = await fixtureRoot();
  try {
    const installed = join(root, ".pi", "agent", "npm", "node_modules", "file-skill-pack");
    const staged = join(root, "verified-file-package");
    for (const packageRoot of [installed, staged]) {
      await mkdir(join(packageRoot, "resources"), { recursive: true });
      await writeFile(join(packageRoot, "resources", "single.md"), skillContents("single"));
      await writeFile(join(packageRoot, "LICENSE"), "MIT License\nPermission is hereby granted\n");
      await writeFile(join(packageRoot, "package.json"), JSON.stringify({
        name: "file-skill-pack",
        version: "1.0.0",
        pi: { skills: ["./resources/*.md"] },
      }));
    }
    await mkdir(join(root, ".pi", "agent"), { recursive: true });
    await writeFile(join(root, ".pi", "agent", "settings.json"), JSON.stringify({ packages: ["npm:file-skill-pack@1.0.0"] }));
    const manifestPath = join(root, "manifest.json");
    await writeFile(manifestPath, `${JSON.stringify(manifest(), null, 2)}\n`);
    const before = await inventoryMachine({ manifest: manifest(), homeDirectory: root });
    const integrity = `sha512-${Buffer.alloc(64, 12).toString("base64")}`;

    const result = await adoptInventoryCandidate({
      manifestPath,
      homeDirectory: root,
      candidateIdentity: "pi-package:file-skill-pack",
      expectedStateToken: before.stateToken,
      resourceType: "pi-package",
      targets: ["pi"],
      license: "MIT",
      licensePath: "LICENSE",
      packageIntegrity: integrity,
      resolveNpmPackage: async () => ({ source: staged, integrity, cleanup: async () => {} }),
    });

    assert.deepEqual(result.resource.skills, [{
      name: "single",
      path: "resources/single.md",
      kind: "file",
      contentSha256: createHash("sha256").update(skillContents("single")).digest("hex"),
    }]);
    const converged = await inventoryMachine({ manifest: result.manifest, homeDirectory: root });
    assert.equal(converged.resources.find((entry) => entry.identity === "pi-package:file-skill-pack").classification, "managed");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("adoption rechecks live state after source verification and rejects mid-run changes", async () => {
  const root = await fixtureRoot();
  try {
    const installed = join(root, ".pi", "agent", "npm", "node_modules", "@example", "candidate-pack");
    const staged = join(root, "verified-package");
    for (const packageRoot of [installed, staged]) {
      await writeSkill(join(packageRoot, "skills", "pi-candidate"), "pi-candidate");
      await writeFile(join(packageRoot, "LICENSE"), "MIT License\nPermission is hereby granted\n");
      await writeFile(join(packageRoot, "package.json"), JSON.stringify({ name: "@example/candidate-pack", version: "1.2.3" }));
    }
    await mkdir(join(root, ".pi", "agent"), { recursive: true });
    await writeFile(join(root, ".pi", "agent", "settings.json"), JSON.stringify({ packages: ["npm:@example/candidate-pack@1.2.3"] }));
    const manifestPath = join(root, "manifest.json");
    await writeFile(manifestPath, `${JSON.stringify(manifest(), null, 2)}\n`);
    const before = await inventoryMachine({ manifest: manifest(), homeDirectory: root });
    const integrity = `sha512-${Buffer.alloc(64, 13).toString("base64")}`;

    await assert.rejects(() => adoptInventoryCandidate({
      manifestPath,
      homeDirectory: root,
      candidateIdentity: "pi-package:@example/candidate-pack",
      expectedStateToken: before.stateToken,
      resourceType: "pi-package",
      targets: ["pi"],
      license: "MIT",
      licensePath: "LICENSE",
      packageIntegrity: integrity,
      resolveNpmPackage: async () => {
        await writeFile(join(installed, "skills", "pi-candidate", "changed.txt"), "changed");
        return { source: staged, integrity, cleanup: async () => {} };
      },
    }), /state changed/i);
    assert.equal(JSON.parse(await readFile(manifestPath, "utf8")).resources.length, 0);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("adoption refuses a symlinked manifest before inspecting a candidate", async () => {
  const root = await fixtureRoot();
  try {
    const realManifest = join(root, "real-manifest.json");
    const manifestPath = join(root, "manifest.json");
    await writeFile(realManifest, `${JSON.stringify(manifest(), null, 2)}\n`);
    await symlink(realManifest, manifestPath);
    await assert.rejects(() => adoptInventoryCandidate({
      manifestPath,
      homeDirectory: root,
      candidateIdentity: "agent-skills:none",
      expectedStateToken: "a".repeat(64),
      resourceType: "agent-skill",
      targets: ["codex", "pi"],
      license: "MIT",
      licensePath: "LICENSE",
    }), /real regular file/i);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("reconciliation plans canonical content and Claude links while Pi uses the same copy", async () => {
  const root = await fixtureRoot();
  try {
    const managed = await makeManagedSkill(root);
    await mkdir(join(root, ".claude"), { recursive: true });
    const desired = manifest([agentResource("managed", managed.hash)]);
    const plan = await buildReconciliationPlan({
      manifest: desired,
      homeDirectory: root,
      targets: ["codex", "pi", "claude-code"],
    });

    assert.equal(plan.operations.filter((entry) => entry.kind === "install-agent-skill").length, 0);
    assert.deepEqual(plan.operations.filter((entry) => entry.kind === "create-claude-link").map((entry) => entry.name), ["managed"]);
    assert.equal(plan.operations.some((entry) => entry.kind === "copy-pi-skill"), false);
    assert.deepEqual(plan.states.matching, ["managed"]);

    const first = await applyHarnessProjections(plan, { homeDirectory: root });
    assert.equal(first.created.length, 1);
    const secondPlan = await buildReconciliationPlan({ manifest: desired, homeDirectory: root, targets: ["codex", "pi", "claude-code"] });
    assert.equal(secondPlan.operations.length, 0);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("reconciliation plans an update for clean managed content pinned to an older GitHub revision", async () => {
  const root = await fixtureRoot();
  try {
    const path = join(root, ".agents", "skills", "managed");
    await writeSkill(path, "managed", "old body");
    const oldTree = await calculatePortableGitTreeHash(path);
    await writeFile(join(root, ".agents", ".skill-lock.json"), JSON.stringify({ version: 3, skills: {
      managed: {
        source: "owner/repository",
        sourceType: "github",
        sourceUrl: "https://github.com/owner/repository.git",
        ref: "1".repeat(40),
        skillPath: "skills/managed/SKILL.md",
        skillFolderHash: oldTree,
      },
    } }));
    const desired = agentResource("managed", skillDirectoryHash("managed", "new body"));
    desired.source.revision = "2".repeat(40);
    desired.source.upstreamTreeHash = "3".repeat(40);

    const plan = await buildReconciliationPlan({ manifest: manifest([desired]), homeDirectory: root, targets: ["codex", "pi"] });

    assert.deepEqual(plan.operations.map(({ kind, name }) => ({ kind, name })), [
      { kind: "update-agent-skill", name: "managed" },
    ]);
    assert.deepEqual(plan.states.outdated, ["managed"]);
    assert.equal(plan.conflicts.length, 0);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("reconciliation updates a clean legacy root-level GitHub skill from its tree proof", async () => {
  const root = await fixtureRoot();
  try {
    const path = join(root, ".agents", "skills", "managed");
    await writeSkill(path, "managed", "old body");
    const oldTree = await calculatePortableGitTreeHash(path);
    await writeFile(join(root, ".agents", ".skill-lock.json"), JSON.stringify({ version: 3, skills: {
      managed: {
        source: "owner/repository",
        sourceType: "github",
        sourceUrl: "https://github.com/owner/repository.git",
        ref: "1".repeat(40),
        skillPath: "SKILL.md",
        skillFolderHash: oldTree,
      },
    } }));
    const desired = agentResource("managed", skillDirectoryHash("managed", "new body"));
    desired.source.revision = "2".repeat(40);
    desired.source.upstreamPath = "SKILL.md";
    desired.source.upstreamTreeHash = "2".repeat(40);

    const plan = await buildReconciliationPlan({ manifest: manifest([desired]), homeDirectory: root, targets: ["codex"] });

    assert.deepEqual(plan.operations.map(({ kind, name }) => ({ kind, name })), [
      { kind: "update-agent-skill", name: "managed" },
    ]);
    assert.equal(plan.conflicts.length, 0);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("reconciliation upgrades a matching legacy lock without reinstalling skill content", async () => {
  const root = await fixtureRoot();
  try {
    const path = join(root, ".agents", "skills", "managed");
    await writeSkill(path, "managed");
    const hash = await calculatePortableDirectoryHash(path);
    await writeFile(join(root, ".agents", ".skill-lock.json"), JSON.stringify({ version: 3, skills: {
      managed: {
        source: "owner/repository",
        sourceType: "github",
        sourceUrl: "https://github.com/owner/repository.git",
        ref: "a".repeat(40),
        skillPath: "skills/managed/SKILL.md",
        skillFolderHash: "b".repeat(40),
      },
    } }));

    const plan = await buildReconciliationPlan({
      manifest: manifest([agentResource("managed", hash)]),
      homeDirectory: root,
      targets: ["codex"],
    });

    assert.deepEqual(plan.operations.map(({ kind, name }) => ({ kind, name })), [
      { kind: "update-agent-lock", name: "managed" },
    ]);
    assert.equal(plan.operations.some(({ kind }) => kind === "update-agent-skill"), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("reconciliation keeps locally edited managed content as a conflict", async () => {
  const root = await fixtureRoot();
  try {
    const path = join(root, ".agents", "skills", "managed");
    await writeSkill(path, "managed", "old body");
    const oldTree = await calculatePortableGitTreeHash(path);
    await writeFile(join(root, ".agents", ".skill-lock.json"), JSON.stringify({ version: 3, skills: {
      managed: {
        source: "owner/repository",
        sourceType: "github",
        ref: "1".repeat(40),
        skillPath: "skills/managed/SKILL.md",
        skillFolderHash: oldTree,
      },
    } }));
    await writeSkill(path, "managed", "locally edited body");
    const desired = agentResource("managed", skillDirectoryHash("managed", "new body"));
    desired.source.revision = "2".repeat(40);
    desired.source.upstreamTreeHash = "3".repeat(40);

    const plan = await buildReconciliationPlan({ manifest: manifest([desired]), homeDirectory: root, targets: ["codex"] });

    assert.equal(plan.operations.some(({ kind }) => kind === "update-agent-skill"), false);
    assert.equal(plan.conflicts.some(({ identity }) => identity === "agent-skills:managed"), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("reconciliation transaction replaces a clean older GitHub skill", async () => {
  const root = await fixtureRoot();
  try {
    const path = join(root, ".agents", "skills", "managed");
    await writeSkill(path, "managed", "old body");
    const oldTree = await calculatePortableGitTreeHash(path);
    await writeFile(join(root, ".agents", ".skill-lock.json"), JSON.stringify({ version: 3, skills: {
      managed: {
        source: "owner/repository",
        sourceType: "github",
        ref: "1".repeat(40),
        skillPath: "skills/managed/SKILL.md",
        skillFolderHash: oldTree,
      },
    } }));
    const desired = agentResource("managed", skillDirectoryHash("managed", "new body"));
    desired.source.revision = "2".repeat(40);
    desired.source.upstreamTreeHash = "3".repeat(40);
    const plan = await buildReconciliationPlan({ manifest: manifest([desired]), homeDirectory: root, targets: ["codex"] });

    const result = await applyHarnessProjections(plan, {
      homeDirectory: root,
      installAgentSkill: async () => writeSkill(path, "managed", "new body"),
    });

    assert.deepEqual(result.completedOperations, [{ kind: "update-agent-skill", name: "managed" }]);
    assert.deepEqual(result.updated, [path]);
    assert.match(await readFile(join(path, "SKILL.md"), "utf8"), /new body/);
    const lock = JSON.parse(await readFile(join(root, ".agents", ".skill-lock.json"), "utf8"));
    assert.equal(lock.skills.managed.ref, "2".repeat(40));
    assert.equal((await readdir(join(root, ".agents"))).some((name) => name.startsWith(".quickstark-update-")), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("a later reconciliation failure restores the exact older skill and lock", async () => {
  const root = await fixtureRoot();
  try {
    const path = join(root, ".agents", "skills", "first");
    await writeSkill(path, "first", "old body");
    const oldContents = await readFile(join(path, "SKILL.md"));
    const oldTree = await calculatePortableGitTreeHash(path);
    const originalLock = `${JSON.stringify({ version: 3, skills: {
      first: {
        source: "owner/repository",
        sourceType: "github",
        ref: "1".repeat(40),
        skillPath: "skills/first/SKILL.md",
        skillFolderHash: oldTree,
      },
    } })}\n`;
    await writeFile(join(root, ".agents", ".skill-lock.json"), originalLock);
    const first = agentResource("first", skillDirectoryHash("first", "new body"));
    first.source.revision = "2".repeat(40);
    first.source.upstreamTreeHash = "3".repeat(40);
    const desired = manifest([first, agentResource("second", skillDirectoryHash("second"))]);
    const plan = await buildReconciliationPlan({ manifest: desired, homeDirectory: root, targets: ["codex"] });

    await assert.rejects(() => applyHarnessProjections(plan, {
      homeDirectory: root,
      beforeOperation: async (_operation, index) => { if (index === 1) throw new Error("simulated later failure"); },
      installAgentSkill: async (resource) => writeSkill(
        join(root, ".agents", "skills", resource.name),
        resource.name,
        "new body",
      ),
    }), (error) => {
      assert.equal(error.reconciliation.outcome, "rolled-back");
      assert.deepEqual(error.reconciliation.completedOperations, [{ kind: "update-agent-skill", name: "first" }]);
      return true;
    });

    assert.deepEqual(await readFile(join(path, "SKILL.md")), oldContents);
    assert.equal(await readFile(join(root, ".agents", ".skill-lock.json"), "utf8"), originalLock);
    assert.equal(await lstat(join(root, ".agents", "skills", "second")).catch(() => null), null);
    assert.equal((await readdir(join(root, ".agents"))).some((name) => name.startsWith(".quickstark-update-")), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("reconciliation refuses an occupied Claude path and any effective-name collision before mutation", async () => {
  const root = await fixtureRoot();
  try {
    const managed = await makeManagedSkill(root);
    await writeSkill(join(root, ".claude", "skills", "managed"), "managed", "different");
    const plan = await buildReconciliationPlan({
      manifest: manifest([agentResource("managed", managed.hash)]),
      homeDirectory: root,
      targets: ["codex", "claude-code"],
    });
    assert.ok(plan.conflicts.length > 0);
    await assert.rejects(() => applyHarnessProjections(plan, { homeDirectory: root }), /conflict/i);
    assert.equal((await lstat(join(root, ".claude", "skills", "managed"))).isDirectory(), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("plugin-provided skills retain manager namespaces instead of shadowing portable names", async () => {
  const root = await fixtureRoot();
  try {
    const managed = await makeManagedSkill(root);
    await writeSkill(join(root, ".codex", "plugins", "cache", "publisher", "plugin", "1.0.0", "skills", "shadow"), "managed");
    const plan = await buildReconciliationPlan({
      manifest: manifest([agentResource("managed", managed.hash)]),
      homeDirectory: root,
      targets: ["codex"],
    });
    assert.equal(plan.conflicts.length, 0);
    assert.equal(plan.operations.length, 0);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("preflight conflict blocks a harness-local desired skill before mutation", async () => {
  const root = await fixtureRoot();
  try {
    const local = join(root, ".codex", "skills", "example");
    await writeSkill(local, "example");
    const desired = manifest([agentResource("example", await calculatePortableDirectoryHash(local))]);
    const plan = await buildReconciliationPlan({ manifest: desired, homeDirectory: root, targets: ["codex"] });
    let installerCalled = false;

    assert.equal(plan.conflicts.some((entry) => entry.identity === "codex-user:example"), true);
    await assert.rejects(() => applyHarnessProjections(plan, {
      homeDirectory: root,
      installAgentSkill: async () => { installerCalled = true; },
    }), /conflict/i);
    assert.equal(installerCalled, false);
    assert.equal(await lstat(join(root, ".agents")).catch(() => null), null);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("preflight conflict scope does not let an unselected harness block reconciliation", async () => {
  const root = await fixtureRoot();
  try {
    const managed = await makeManagedSkill(root, "example");
    await writeSkill(join(root, ".pi", "agent", "skills", "example"), "example", "different");
    const desired = manifest([agentResource("example", managed.hash)]);

    const codex = await buildReconciliationPlan({ manifest: desired, homeDirectory: root, targets: ["codex"] });
    const pi = await buildReconciliationPlan({ manifest: desired, homeDirectory: root, targets: ["pi"] });
    assert.equal(codex.conflicts.length, 0);
    assert.equal(pi.conflicts.some((entry) => entry.identity === "pi-user:example"), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("installer failure receives transactional compensation and reports the restored state truthfully", async () => {
  const root = await fixtureRoot();
  try {
    const desired = manifest([agentResource("example", skillDirectoryHash("example"))]);
    const plan = await buildReconciliationPlan({ manifest: desired, homeDirectory: root, targets: ["codex"] });

    await assert.rejects(() => applyHarnessProjections(plan, {
      homeDirectory: root,
      installAgentSkill: async () => {
        const destination = join(root, ".agents", "skills", "example");
        await mkdir(destination, { recursive: true });
        await writeFile(join(destination, "SKILL.md"), skillContents("example"));
        throw new Error("simulated installer failure");
      },
    }), (error) => {
      assert.equal(error.reconciliation.outcome, "rolled-back");
      assert.equal(error.reconciliation.compensationErrors.length, 0);
      return true;
    });
    assert.equal(await lstat(join(root, ".agents")).catch(() => null), null);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("transactional compensation restores lock metadata after a later operation fails", async () => {
  const root = await fixtureRoot();
  try {
    const desired = manifest([
      agentResource("first", skillDirectoryHash("first")),
      agentResource("second", skillDirectoryHash("second")),
    ]);
    const plan = await buildReconciliationPlan({ manifest: desired, homeDirectory: root, targets: ["codex"] });

    await assert.rejects(() => applyHarnessProjections(plan, {
      homeDirectory: root,
      beforeOperation: async (_operation, index) => { if (index === 1) throw new Error("simulated later failure"); },
      installAgentSkill: async (resource) => {
        const destination = join(root, ".agents", "skills", resource.name);
        await mkdir(destination, { recursive: true });
        await writeFile(join(destination, "SKILL.md"), skillContents(resource.name));
      },
    }), (error) => {
      assert.equal(error.reconciliation.outcome, "rolled-back");
      assert.deepEqual(error.reconciliation.completedOperations, [{ kind: "install-agent-skill", name: "first" }]);
      return true;
    });
    assert.equal(await lstat(join(root, ".agents")).catch(() => null), null);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("partial reconciliation compensates only links created by the current run", async () => {
  const root = await fixtureRoot();
  try {
    const first = await makeManagedSkill(root, "first");
    const secondPath = join(root, ".agents", "skills", "second");
    await writeSkill(secondPath, "second");
    const secondHash = await calculatePortableDirectoryHash(secondPath);
    const lock = JSON.parse(await readFile(join(root, ".agents", ".skill-lock.json"), "utf8"));
    lock.skills.second = {
      source: "owner/repository", sourceType: "github", sourceUrl: "https://github.com/owner/repository.git",
      ref: "a".repeat(40), skillPath: "skills/second/SKILL.md", skillFolderHash: "b".repeat(40),
      contentSha256: secondHash,
    };
    await writeFile(join(root, ".agents", ".skill-lock.json"), JSON.stringify(lock));
    await mkdir(join(root, ".claude"), { recursive: true });
    const desired = manifest([agentResource("first", first.hash), agentResource("second", secondHash)]);
    const plan = await buildReconciliationPlan({ manifest: desired, homeDirectory: root, targets: ["claude-code"] });

    await assert.rejects(
      () => applyHarnessProjections(plan, {
        homeDirectory: root,
        beforeOperation: async (_operation, index) => { if (index === 1) throw new Error("injected operation failure"); },
      }),
      (error) => {
        assert.equal(error.reconciliation.outcome, "rolled-back");
        assert.equal(error.reconciliation.completedOperations.length, 1);
        assert.equal(error.reconciliation.compensatedPaths.includes(join(root, ".claude", "skills", "first")), true);
        assert.equal(error.reconciliation.compensatedPaths.includes(join(root, ".claude", "skills")), true);
        assert.equal(error.reconciliation.compensationErrors.length, 0);
        return true;
      },
    );
    assert.equal(await lstat(join(root, ".claude", "skills", "first")).catch(() => null), null);
    assert.equal(await lstat(join(root, ".claude", "skills", "second")).catch(() => null), null);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("Pi package resources emit exact pinned manager actions but reconciliation never invokes them", async () => {
  const root = await fixtureRoot();
  try {
    const resource = piPackageResource();
    assert.deepEqual(buildPiPackageAction(resource), {
      command: "pi",
      arguments: ["install", "npm:@example/pi-skill-pack@2.3.4"],
      integrity: resource.source.integrity,
      authorization: "separate",
    });
    const plan = await buildReconciliationPlan({ manifest: manifest([resource]), homeDirectory: root, targets: ["pi"] });
    assert.deepEqual(plan.externalActions, [buildPiPackageAction(resource)]);
    const result = await applyHarnessProjections(plan, { homeDirectory: root });
    assert.equal(result.externalActions.length, 1);
    assert.equal((await lstat(join(root, ".pi")).catch(() => null)), null);

    await mkdir(join(root, ".pi", "agent"), { recursive: true });
    const installed = join(root, ".pi", "agent", "npm", "node_modules", "@example", "pi-skill-pack");
    await writeSkill(join(installed, "skills", "pi-example"), "pi-example");
    await writeFile(join(installed, "package.json"), JSON.stringify({ name: "@example/pi-skill-pack", version: "2.3.4" }));
    const installedHash = await calculatePortableDirectoryHash(join(installed, "skills", "pi-example"));
    const convergedResource = piPackageResource("pi-skill-pack", installedHash);
    await writeFile(join(root, ".pi", "agent", "settings.json"), JSON.stringify({ packages: ["npm:@example/pi-skill-pack@2.3.4"] }));
    const converged = await buildReconciliationPlan({ manifest: manifest([convergedResource]), homeDirectory: root, targets: ["pi"] });
    assert.equal(converged.externalActions.length, 0);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("Pi package verification fails closed when settings disable approved skills", async () => {
  const root = await fixtureRoot();
  try {
    const installed = join(root, ".pi", "agent", "npm", "node_modules", "@example", "pi-skill-pack");
    await writeSkill(join(installed, "skills", "pi-example"), "pi-example");
    await writeFile(join(installed, "package.json"), JSON.stringify({ name: "@example/pi-skill-pack", version: "2.3.4" }));
    const hash = await calculatePortableDirectoryHash(join(installed, "skills", "pi-example"));
    const resource = piPackageResource("pi-skill-pack", hash);
    await mkdir(join(root, ".pi", "agent"), { recursive: true });
    await writeFile(join(root, ".pi", "agent", "settings.json"), JSON.stringify({ packages: [{ source: "npm:@example/pi-skill-pack@2.3.4", skills: [] }] }));
    const plan = await buildReconciliationPlan({ manifest: manifest([resource]), homeDirectory: root, targets: ["pi"] });
    assert.equal(plan.conflicts.length, 1);
    assert.match(plan.conflicts[0].reason, /filter out/i);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("Pi package manager drift emits an exact separately authorized repair action", async () => {
  const root = await fixtureRoot();
  try {
    const installed = join(root, ".pi", "agent", "npm", "node_modules", "@example", "pi-skill-pack");
    await writeSkill(join(installed, "skills", "pi-example"), "pi-example");
    await writeFile(join(installed, "package.json"), JSON.stringify({ name: "@example/pi-skill-pack", version: "1.0.0" }));
    const hash = await calculatePortableDirectoryHash(join(installed, "skills", "pi-example"));
    const resource = piPackageResource("pi-skill-pack", hash);
    await mkdir(join(root, ".pi", "agent"), { recursive: true });
    await writeFile(join(root, ".pi", "agent", "settings.json"), JSON.stringify({ packages: ["npm:@example/pi-skill-pack@1.0.0"] }));
    const plan = await buildReconciliationPlan({ manifest: manifest([resource]), homeDirectory: root, targets: ["pi"] });
    assert.equal(plan.conflicts.length, 0);
    assert.deepEqual(plan.externalActions, [buildPiPackageAction(resource)]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("Pi manifest discovery finds declared directory and file skills without a conventional skills root", async () => {
  const root = await fixtureRoot();
  try {
    const packageRoot = join(root, ".pi", "agent", "npm", "node_modules", "example-pi-pack");
    await writeSkill(join(packageRoot, "resources", "declared"), "declared");
    await mkdir(join(packageRoot, "resources"), { recursive: true });
    await writeFile(join(packageRoot, "resources", "single.md"), skillContents("single"));
    await writeFile(join(packageRoot, "package.json"), JSON.stringify({
      name: "example-pi-pack",
      version: "1.0.0",
      pi: { skills: ["./resources/*"] },
    }));
    await mkdir(join(root, ".pi", "agent"), { recursive: true });
    await writeFile(join(root, ".pi", "agent", "settings.json"), JSON.stringify({ packages: ["npm:example-pi-pack@1.0.0"] }));

    const report = await inventoryMachine({ manifest: manifest(), homeDirectory: root });
    const candidate = report.resources.find((entry) => entry.identity === "pi-package:example-pi-pack");
    assert.equal(candidate.classification, "candidate");
    assert.deepEqual(candidate.discoveredSkills.map((entry) => [entry.name, entry.path, entry.kind]), [
      ["declared", "resources/declared/SKILL.md", "directory"],
      ["single", "resources/single.md", "file"],
    ]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("Pi settings skill paths inventory configured directory and file skills inside the selected home", async () => {
  const root = await fixtureRoot();
  try {
    await writeSkill(join(root, "shared-skills", "directory-skill"), "directory-skill");
    await mkdir(join(root, "shared-skills"), { recursive: true });
    await writeFile(join(root, "shared-skills", "file-skill.md"), skillContents("file-skill"));
    await mkdir(join(root, ".pi", "agent"), { recursive: true });
    await writeFile(join(root, ".pi", "agent", "settings.json"), JSON.stringify({ skills: [join(root, "shared-skills")] }));

    const report = await inventoryMachine({ manifest: manifest(), homeDirectory: root });
    const settingsSkills = report.resources.filter((entry) => entry.surface === "pi-settings");
    assert.deepEqual(settingsSkills.map((entry) => entry.effectiveName).sort(), ["directory-skill", "file-skill"]);
    assert.equal(settingsSkills.every((entry) => entry.classification === "unresolved"), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("Pi settings skill inventory recognizes direct Markdown skills in the Pi user root", async () => {
  const root = await fixtureRoot();
  try {
    const piRoot = join(root, ".pi", "agent", "skills");
    await mkdir(piRoot, { recursive: true });
    await writeFile(join(piRoot, "direct.md"), skillContents("direct"));
    const report = await inventoryMachine({ manifest: manifest(), homeDirectory: root });
    const direct = report.resources.find((entry) => entry.identity === "pi-user:direct.md");
    assert.equal(direct.effectiveName, "direct");
    assert.equal(direct.kind, "file");
    assert.equal(direct.classification, "unresolved");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("Pi package filter applies globs and exclusions to each approved skill path", async () => {
  const root = await fixtureRoot();
  try {
    const packageRoot = join(root, ".pi", "agent", "npm", "node_modules", "@example", "pi-skill-pack");
    const skillRoot = join(packageRoot, "resources", "pi-example");
    await writeSkill(skillRoot, "pi-example");
    await writeFile(join(packageRoot, "package.json"), JSON.stringify({
      name: "@example/pi-skill-pack",
      version: "2.3.4",
      pi: { skills: ["./resources/**"] },
    }));
    const resource = piPackageResource("pi-skill-pack", await calculatePortableDirectoryHash(skillRoot));
    resource.skills[0].path = "resources/pi-example/SKILL.md";
    await mkdir(join(root, ".pi", "agent"), { recursive: true });
    const settingsPath = join(root, ".pi", "agent", "settings.json");

    await writeFile(settingsPath, JSON.stringify({ packages: [{
      source: "npm:@example/pi-skill-pack@2.3.4",
      skills: ["resources/**", "!resources/pi-example/**"],
    }] }));
    const excluded = await inventoryMachine({ manifest: manifest([resource]), homeDirectory: root });
    assert.equal(excluded.resources.find((entry) => entry.identity === "pi-package:@example/pi-skill-pack").drift, "policy");

    await writeFile(settingsPath, JSON.stringify({ packages: [{
      source: "npm:@example/pi-skill-pack@2.3.4",
      skills: ["resources/**", "!resources/disabled/**"],
    }] }));
    const enabled = await inventoryMachine({ manifest: manifest([resource]), homeDirectory: root });
    assert.equal(enabled.resources.find((entry) => entry.identity === "pi-package:@example/pi-skill-pack").classification, "managed");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("Pi package filter glob matching retains a Node-version-independent fallback", () => {
  assert.equal(matchesPiGlob("resources/pi-example/SKILL.md", "resources/**", null), true);
  assert.equal(matchesPiGlob("resources/pi-example/SKILL.md", "resources/*/SKILL.{md,txt}", null), true);
  assert.equal(matchesPiGlob("resources/nested/pi-example/SKILL.md", "resources/*/SKILL.md", null), false);
});

test("Git-backed Pi packages and Claude plugin payloads remain manager-owned and verifiable", async () => {
  const root = await fixtureRoot();
  try {
    const packageRoot = join(root, ".pi", "agent", "git", "github.com", "example", "pi-git-pack");
    await writeSkill(join(packageRoot, "skills", "pi-git-skill"), "pi-git-skill");
    await writeFile(join(packageRoot, "LICENSE"), "MIT License\nPermission is hereby granted\n");
    await runFile("git", ["init", "--quiet", packageRoot]);
    await runFile("git", ["-C", packageRoot, "config", "user.email", "fixture@example.invalid"]);
    await runFile("git", ["-C", packageRoot, "config", "user.name", "Fixture"]);
    await runFile("git", ["-C", packageRoot, "add", "."]);
    await runFile("git", ["-C", packageRoot, "commit", "--quiet", "-m", "fixture"]);
    const revision = (await runFile("git", ["-C", packageRoot, "rev-parse", "HEAD"])).stdout.trim();
    const hash = await calculatePortableDirectoryHash(join(packageRoot, "skills", "pi-git-skill"));
    const resource = piGitPackageResource(revision, hash);
    await mkdir(join(root, ".pi", "agent"), { recursive: true });
    await writeFile(join(root, ".pi", "agent", "settings.json"), JSON.stringify({ packages: [`git:github.com/example/pi-git-pack@${revision}`] }));
    await mkdir(join(root, ".claude", "plugins", "cache", "publisher", "plugin", "3.0.0"), { recursive: true });

    const report = await inventoryMachine({ manifest: manifest([resource]), homeDirectory: root });
    const byIdentity = new Map(report.resources.map((entry) => [entry.identity, entry]));
    assert.equal(byIdentity.get("pi-package:example/pi-git-pack").classification, "managed");
    assert.equal(byIdentity.get("claude-plugin:publisher/plugin@3.0.0").classification, "separately-managed");
    assert.deepEqual(buildPiPackageAction(resource), {
      command: "pi",
      arguments: ["install", `git:github.com/example/pi-git-pack@${revision}`],
      integrity: revision,
      authorization: "separate",
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("inventory accounts for mutable and local Pi package settings without exposing their source text", async () => {
  const root = await fixtureRoot();
  try {
    await mkdir(join(root, ".pi", "agent"), { recursive: true });
    await writeFile(join(root, ".pi", "agent", "settings.json"), JSON.stringify({
      packages: ["npm:mutable-package", "/private/operator/package"],
    }));
    const report = await inventoryMachine({ manifest: manifest(), homeDirectory: root });
    const unresolved = report.resources.filter((entry) => entry.surface === "pi-package");
    assert.equal(unresolved.length, 2);
    assert.ok(unresolved.every((entry) => entry.classification === "unresolved"));
    assert.doesNotMatch(JSON.stringify(report), /mutable-package|private\/operator/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("inventory ignores an installed mutable Pi package that contributes no skills", async () => {
  const root = await fixtureRoot();
  try {
    await mkdir(join(root, ".pi", "agent", "git", "github.com", "hasit", "pi-community-themes", "themes"), { recursive: true });
    await mkdir(join(root, ".pi", "agent"), { recursive: true });
    await writeFile(join(root, ".pi", "agent", "settings.json"), JSON.stringify({ packages: ["git:https://github.com/hasit/pi-community-themes"] }));
    const report = await inventoryMachine({ manifest: manifest(), homeDirectory: root });
    const resource = report.resources.find((entry) => entry.identity === "pi-package:hasit/pi-community-themes");
    assert.equal(resource.classification, "ignored");
    assert.match(resource.reason, /no Agent Skills/i);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("package commands expose inventory and adopt while aggregate verification stays read-only", async () => {
  const project = JSON.parse(await readFile(join(repositoryRoot, "package.json"), "utf8"));
  assert.equal(project.scripts["skills:update"], "node scripts/managed-skills.mjs update");
  assert.equal(project.scripts["personal-skills:inventory"], "node scripts/sync-personal-skills.mjs inventory");
  assert.equal(project.scripts["personal-skills:adopt"], "node scripts/sync-personal-skills.mjs adopt");
  assert.doesNotMatch(project.scripts["skills:verify"], /sync|adopt|install|add/);
});

test("inventory and plan CLI paths are machine-readable and do not mutate the selected home", async () => {
  const root = await fixtureRoot();
  try {
    const manifestPath = join(root, "manifest.json");
    const original = `${JSON.stringify(manifest(), null, 2)}\n`;
    await writeFile(manifestPath, original);
    const executable = join(repositoryRoot, "scripts", "sync-personal-skills.mjs");
    const inventory = await runFile(process.execPath, [executable, "inventory", "--json", "--manifest", manifestPath, "--home", root]);
    const report = JSON.parse(inventory.stdout);
    assert.equal(report.action, "inventory");
    assert.deepEqual(report.resources, []);

    const planned = await runFile(process.execPath, [executable, "plan", "--json", "--manifest", manifestPath, "--home", root, "--agent", "pi"]);
    const plan = JSON.parse(planned.stdout);
    assert.equal(plan.action, "plan");
    assert.equal(plan.operationCount, 0);
    assert.equal(await readFile(manifestPath, "utf8"), original);
    assert.equal(await lstat(join(root, ".agents")).catch(() => null), null);
    assert.equal(await lstat(join(root, ".pi")).catch(() => null), null);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("sync CLI repairs metadata and creates a Claude projection without duplicating canonical content", async () => {
  const root = await fixtureRoot();
  try {
    const canonical = join(root, ".agents", "skills", "managed");
    await writeSkill(canonical, "managed");
    const hash = await calculatePortableDirectoryHash(canonical);
    await mkdir(join(root, ".claude"), { recursive: true });
    const manifestPath = join(root, "manifest.json");
    await writeFile(manifestPath, `${JSON.stringify(manifest([agentResource("managed", hash)]), null, 2)}\n`);
    const executable = join(repositoryRoot, "scripts", "sync-personal-skills.mjs");
    const synced = await runFile(process.execPath, [
      executable, "sync", "--json", "--manifest", manifestPath, "--home", root,
      "--agent", "codex", "--agent", "claude-code",
    ]);
    const result = JSON.parse(synced.stdout);
    assert.equal(result.createdCount, 1);
    assert.equal((await lstat(join(root, ".claude", "skills", "managed"))).isSymbolicLink(), true);
    assert.equal((await lstat(canonical)).isDirectory(), true);
    const lock = JSON.parse(await readFile(join(root, ".agents", ".skill-lock.json"), "utf8"));
    assert.equal(lock.skills.managed.ref, "a".repeat(40));

    const verified = await runFile(process.execPath, [
      executable, "verify", "--json", "--manifest", manifestPath, "--home", root,
      "--agent", "codex", "--agent", "claude-code",
    ]);
    assert.equal(JSON.parse(verified.stdout).operationCount, 0);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("installer integrity verification has a working positive and negative control", () => {
  const contents = Buffer.from("verified installer archive");
  const integrity = `sha512-${createHash("sha512").update(contents).digest("base64")}`;
  assert.equal(verifyInstallerArchiveIntegrity(contents, integrity), true);
  assert.equal(verifyInstallerArchiveIntegrity(Buffer.from("tampered"), integrity), false);
});

test("installer dependency lock pins every downloaded archive by exact version and integrity", async () => {
  const desired = normalizeManifest(JSON.parse(await readFile(v1ManifestPath, "utf8")));
  const lock = JSON.parse(await readFile(join(repositoryRoot, "config", "personal-skills-installer-lock.json"), "utf8"));
  assert.equal(lock.packages[""].name, lock.name);
  assert.equal(lock.packages[""].version, lock.version);
  assert.equal(validateInstallerLock(lock, desired), lock);
  const missingRootIdentity = structuredClone(lock);
  delete missingRootIdentity.packages[""].version;
  assert.throws(() => validateInstallerLock(missingRootIdentity, desired), /root identity/i);
  const tampered = structuredClone(lock);
  delete tampered.packages["node_modules/yaml"].integrity;
  assert.throws(() => validateInstallerLock(tampered, desired), /integrity/i);
});

test("extensible adoption remains manifest-driven instead of requiring a source-code allowlist", async () => {
  const syncModule = await import("../scripts/sync-personal-skills.mjs");
  assert.equal(Object.hasOwn(syncModule, "APPROVED_SOURCES"), false);
  const current = normalizeManifest(JSON.parse(await readFile(v1ManifestPath, "utf8")));
  const added = addManifestResource(current, agentResource("new-third-party", "c".repeat(64), {
    source: {
      ...agentResource("new-third-party", "c".repeat(64)).source,
      repository: "third-party/new-skill",
      revision: "d".repeat(40),
      upstreamTreeHash: "e".repeat(40),
    },
  }));
  assert.equal(added.resources.length, current.resources.length + 1);
  assert.equal(added.resources.some((entry) => entry.source.repository === "third-party/new-skill"), true);
});

test("safe npm archive extraction rejects links special entries traversal and expanded-byte overflow", async () => {
  const { extractSafeNpmArchive } = await import("../scripts/personal-skills/npm-archive.mjs");
  const root = await fixtureRoot();
  try {
    const unsafe = [
      makeTarGzip([{ path: "package/", type: "5" }, { path: "package/link", type: "2", linkPath: "../../outside" }]),
      makeTarGzip([{ path: "package/", type: "5" }, { path: "package/pipe", type: "6" }]),
      makeTarGzip([{ path: "package/", type: "5" }, { path: "package/../escape", contents: "escape" }]),
    ];
    for (let index = 0; index < unsafe.length; index += 1) {
      const destination = join(root, `unsafe-${index}`);
      await assert.rejects(() => extractSafeNpmArchive(unsafe[index], destination), /archive|entry|path|link|special/i);
      assert.equal(await lstat(destination).catch(() => null), null);
    }

    const oversizedDestination = join(root, "oversized");
    const oversized = makeTarGzip([{ path: "package/", type: "5" }, { path: "package/large", contents: "x".repeat(4_096) }]);
    await assert.rejects(() => extractSafeNpmArchive(oversized, oversizedDestination, { maximumExpandedBytes: 2_048 }), /expanded|bound/i);
    assert.equal(await lstat(oversizedDestination).catch(() => null), null);

    const validDestination = join(root, "valid");
    const valid = makeTarGzip([
      { path: "package/package.json", contents: "{\"name\":\"safe\"}\n" },
    ]);
    const result = await extractSafeNpmArchive(valid, validDestination);
    assert.equal(result.entryCount, 1);
    assert.equal(await readFile(join(validDestination, "package", "package.json"), "utf8"), "{\"name\":\"safe\"}\n");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
