import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { chmod, lstat, mkdir, mkdtemp, open, readFile, rename, rm, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { promisify } from "node:util";

import { assertSafeRelativePath, calculatePortableDirectoryHash, inspectPortableSkillFile, readBoundedPortableFile, readPortableSkillName } from "./filesystem.mjs";
import { addManifestResource, normalizeManifest, serializeManifest } from "./manifest.mjs";
import { inventoryMachine } from "./inventory.mjs";
import { DEFAULT_NPM_ARCHIVE_LIMITS, extractSafeNpmArchive } from "./npm-archive.mjs";

const runFile = promisify(execFile);

async function runGit(arguments_, options = {}) {
  try {
    return await runFile("git", arguments_, { encoding: "utf8", maxBuffer: 8 * 1024 * 1024, timeout: 120_000, ...options });
  } catch (error) {
    const details = String(error.stderr || error.stdout || error.message).trim().slice(0, 1_600);
    throw new Error(`Git provenance verification failed: ${details}`);
  }
}

function verifyLicense(license, contents) {
  if (license === "MIT") {
    if (!contents.includes("Permission is hereby granted")) throw new Error("Upstream source does not contain the declared MIT license evidence.");
    return;
  }
  if (license === "Apache-2.0") {
    if (!contents.includes("Apache License") || !contents.includes("Version 2.0")) throw new Error("Upstream source does not contain the declared Apache-2.0 license evidence.");
    return;
  }
  throw new Error(`Unsupported adoption license: ${license}.`);
}

async function clonePinnedSource(repository, revision) {
  const staging = await mkdtemp(join(tmpdir(), "quickstark-adopt-"));
  const source = join(staging, "source");
  try {
    await runGit(["init", "--quiet", source], { env: { ...process.env, GIT_TERMINAL_PROMPT: "0" } });
    await runGit(["-C", source, "remote", "add", "origin", `https://github.com/${repository}.git`]);
    await runGit(["-C", source, "fetch", "--quiet", "--depth", "1", "origin", revision], { env: { ...process.env, GIT_TERMINAL_PROMPT: "0" } });
    await runGit(["-C", source, "checkout", "--quiet", "--detach", "FETCH_HEAD"]);
    return { source, cleanup: () => rm(staging, { recursive: true, force: true }) };
  } catch (error) {
    await rm(staging, { recursive: true, force: true });
    throw error;
  }
}

async function assertCleanPinnedSource(source, revision) {
  const status = (await runGit(["-C", source, "status", "--porcelain=v1", "--untracked-files=all"])).stdout;
  if (status.trim()) throw new Error("Git provenance verification failed: staged source contains working-tree changes.");
  const head = (await runGit(["-C", source, "rev-parse", "HEAD"])).stdout.trim();
  if (head !== revision) throw new Error("Git provenance verification failed: staged source revision differs from immutable provenance.");
}

function verifySri(contents, expected) {
  const [algorithm, digest] = String(expected).split("-", 2);
  return algorithm === "sha512" && Boolean(digest) && createHash(algorithm).update(contents).digest("base64") === digest;
}

async function stageNpmPackage(packageName, version, expectedIntegrity) {
  const staging = await mkdtemp(join(tmpdir(), "quickstark-adopt-npm-"));
  const downloads = join(staging, "downloads");
  const extracted = join(staging, "extracted");
  const cache = join(staging, "cache");
  await mkdir(downloads, { recursive: true });
  try {
    const packed = await runFile("npm", ["pack", `${packageName}@${version}`, "--json", "--ignore-scripts", "--pack-destination", downloads, "--cache", cache], { encoding: "utf8", timeout: 120_000 });
    const details = JSON.parse(packed.stdout).at(-1);
    if (details?.integrity !== expectedIntegrity) throw new Error("Registry Pi package integrity differs from the explicitly approved value.");
    if (typeof details.filename !== "string" || basename(details.filename) !== details.filename || !details.filename.endsWith(".tgz")) {
      throw new Error("Registry Pi package returned an unsafe archive filename.");
    }
    const tarball = join(downloads, details.filename);
    const tarballMetadata = await lstat(tarball);
    if (!tarballMetadata.isFile() || tarballMetadata.isSymbolicLink() || tarballMetadata.size > DEFAULT_NPM_ARCHIVE_LIMITS.maximumCompressedBytes) {
      throw new Error("Downloaded Pi package archive is not a bounded regular file.");
    }
    const archive = await readFile(tarball);
    if (!verifySri(archive, expectedIntegrity)) throw new Error("Downloaded Pi package failed SHA-512 verification.");
    await extractSafeNpmArchive(archive, extracted);
    return {
      source: join(extracted, "package"),
      integrity: expectedIntegrity,
      cleanup: () => rm(staging, { recursive: true, force: true }),
    };
  } catch (error) {
    await rm(staging, { recursive: true, force: true });
    throw error;
  }
}

async function writeManifestAtomically(path, originalContents, manifest) {
  await mkdir(dirname(path), { recursive: true });
  const guard = `${path}.quickstark-adopt.lock`;
  const handle = await open(guard, "wx", 0o600).catch((error) => {
    if (error?.code === "EEXIST") throw new Error("Another process is updating the personal skills manifest.");
    throw error;
  });
  let temporary;
  try {
    const current = await readFile(path, "utf8");
    if (current !== originalContents) throw new Error("Personal skills manifest changed during adoption.");
    const mode = (await lstat(path)).mode & 0o777;
    temporary = `${path}.${process.pid}.${Date.now()}.tmp`;
    await writeFile(temporary, serializeManifest(manifest), { mode: mode || 0o600 });
    await chmod(temporary, mode || 0o600);
    const file = await open(temporary, "r");
    try { await file.sync(); } finally { await file.close(); }
    await rename(temporary, path);
    temporary = null;
  } finally {
    if (temporary) await rm(temporary, { force: true }).catch(() => {});
    await handle.close();
    await rm(guard, { force: true });
  }
}

export async function adoptInventoryCandidate({
  manifestPath,
  homeDirectory,
  candidateIdentity,
  expectedStateToken,
  resourceType,
  targets,
  license,
  licensePath,
  sourceDirectory,
  packageIntegrity,
  resolveNpmPackage = stageNpmPackage,
}) {
  if (!["agent-skill", "pi-package"].includes(resourceType)) throw new Error("Adoption requires an explicit supported resource type.");
  assertSafeRelativePath(licensePath, "Adoption license path");
  const manifestMetadata = await lstat(manifestPath).catch(() => null);
  if (!manifestMetadata?.isFile() || manifestMetadata.isSymbolicLink()) throw new Error("Personal skills manifest must be a real regular file.");
  const originalContents = await readFile(manifestPath, "utf8");
  const manifest = normalizeManifest(JSON.parse(originalContents));
  const inventory = await inventoryMachine({ manifest, homeDirectory });
  if (!expectedStateToken || inventory.stateToken !== expectedStateToken) throw new Error("Saved inventory is stale because live machine state changed.");
  const candidate = inventory.resources.find((resource) => resource.identity === candidateIdentity);
  if (!candidate || candidate.classification !== "candidate" || !candidate.provenance) throw new Error("Selected inventory entry is not an adoptable candidate with immutable provenance.");
  const provenance = candidate.provenance;
  if (candidate.type !== resourceType) throw new Error("Selected candidate does not match the explicitly requested resource type.");
  let staged;
  if (resourceType === "pi-package" && provenance.kind === "npm") {
    if (!/^sha512-[A-Za-z0-9+/]+={0,2}$/.test(packageIntegrity ?? "")) throw new Error("Npm Pi package adoption requires an explicitly approved SHA-512 integrity value.");
    staged = await resolveNpmPackage(provenance.package, provenance.version, packageIntegrity);
    if (staged.integrity !== packageIntegrity) throw new Error("Resolved Pi package integrity differs from the approved value.");
  } else {
    staged = sourceDirectory ? { source: sourceDirectory, cleanup: async () => {} } : await clonePinnedSource(provenance.repository, provenance.revision);
  }

  try {
    if (resourceType === "pi-package") {
      let normalizedSource;
      if (provenance.kind === "npm") {
        const packageMetadata = JSON.parse(await readBoundedPortableFile(staged.source, "package.json"));
        if (packageMetadata.name !== provenance.package || packageMetadata.version !== provenance.version) throw new Error("Resolved npm Pi package metadata differs from inventory provenance.");
        verifyLicense(license, await readBoundedPortableFile(staged.source, licensePath));
        normalizedSource = { kind: "npm", package: provenance.package, version: provenance.version, integrity: packageIntegrity, license, licensePath };
      } else {
        await assertCleanPinnedSource(staged.source, provenance.revision);
        const revision = provenance.revision;
        verifyLicense(license, await readBoundedPortableFile(staged.source, licensePath));
        normalizedSource = { kind: "github", repository: provenance.repository, revision, license, licensePath };
      }
      const skills = [];
      for (const skill of candidate.discoveredSkills ?? []) {
        assertSafeRelativePath(skill.path, `Resolved Pi package skill path for ${skill.name}`);
        if (skill.kind === "file" || (skill.path.endsWith(".md") && !skill.path.endsWith("/SKILL.md") && skill.path !== "SKILL.md")) {
          const inspection = await inspectPortableSkillFile(join(staged.source, ...skill.path.split("/")));
          if (!inspection.safe || inspection.contentSha256 !== skill.contentSha256) throw new Error(`Resolved Pi package skill ${skill.name} differs from live inventory content.`);
          if (inspection.name !== skill.name) throw new Error(`Resolved Pi package skill ${skill.name} has a mismatched frontmatter name.`);
          skills.push({ name: skill.name, path: skill.path, kind: "file", contentSha256: inspection.contentSha256 });
          continue;
        }
        const skillDirectory = dirname(skill.path) === "." ? staged.source : join(staged.source, dirname(skill.path));
        const contentSha256 = await calculatePortableDirectoryHash(skillDirectory);
        if (contentSha256 !== skill.contentSha256) throw new Error(`Resolved Pi package skill ${skill.name} differs from live inventory content.`);
        if (await readPortableSkillName(skillDirectory) !== skill.name) throw new Error(`Resolved Pi package skill ${skill.name} has a mismatched frontmatter name.`);
        skills.push({ name: skill.name, path: skill.path, contentSha256 });
      }
      if (skills.length === 0) throw new Error("Pi package candidate does not contribute any verified Agent Skills.");
      const resource = { type: "pi-package", name: candidate.name.replace(/^@/, "").replaceAll("/", "-"), source: normalizedSource, skills, placement: { targets } };
      const finalInventory = await inventoryMachine({ manifest, homeDirectory });
      if (finalInventory.stateToken !== inventory.stateToken) throw new Error("Live machine state changed during Pi package adoption.");
      const updated = addManifestResource(manifest, resource);
      await writeManifestAtomically(manifestPath, originalContents, updated);
      return { resource: normalizeManifest(updated).resources.find((entry) => entry.type === "pi-package" && entry.name === resource.name), manifest: updated };
    }

    await assertCleanPinnedSource(staged.source, provenance.revision);
    const revision = provenance.revision;
    const upstreamDirectory = provenance.upstreamPath === "SKILL.md" ? "." : dirname(provenance.upstreamPath);
    const tree = upstreamDirectory === "."
      ? revision
      : (await runGit(["-C", staged.source, "rev-parse", `${revision}:${upstreamDirectory}`])).stdout.trim();
    if (tree !== provenance.upstreamTreeHash) throw new Error("Staged Git tree does not match candidate provenance.");
    verifyLicense(license, await readBoundedPortableFile(staged.source, licensePath));
    let upstreamHash;
    try {
      upstreamHash = await calculatePortableDirectoryHash(join(staged.source, upstreamDirectory));
    } catch {
      throw new Error("Immutable upstream contents are not a valid portable Agent Skill.");
    }
    if (upstreamHash !== candidate.contentSha256) throw new Error("Live candidate contents do not match the immutable upstream digest.");
    if (await readPortableSkillName(join(staged.source, upstreamDirectory)) !== candidate.name) throw new Error("Immutable upstream skill frontmatter name differs from the candidate identity.");

    const resource = {
      type: "agent-skill",
      name: candidate.name,
      source: {
        kind: "github",
        repository: provenance.repository,
        revision,
        license,
        licensePath,
        upstreamPath: provenance.upstreamPath,
        upstreamTreeHash: tree,
        contentSha256: upstreamHash,
      },
      placement: { canonical: "~/.agents/skills", targets },
    };
    const updated = addManifestResource(manifest, resource);
    const finalInventory = await inventoryMachine({ manifest, homeDirectory });
    if (finalInventory.stateToken !== inventory.stateToken) throw new Error("Live machine state changed during Agent Skill adoption.");
    await writeManifestAtomically(manifestPath, originalContents, updated);
    return { resource: normalizeManifest(updated).resources.find((entry) => entry.type === "agent-skill" && entry.name === candidate.name), manifest: updated };
  } finally {
    await staged.cleanup();
  }
}
