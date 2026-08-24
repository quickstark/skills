import { createHash } from "node:crypto";
import { lstat, readFile, readdir, realpath } from "node:fs/promises";
import { isAbsolute, join, relative, sep } from "node:path";

export const DEFAULT_PORTABLE_LIMITS = Object.freeze({
  maximumEntries: 4_096,
  maximumFilesPerSkill: 4_096,
  maximumBytesPerSkill: 64 * 1024 * 1024,
  maximumSkillFileBytes: 1024 * 1024,
});

export function assertSafeRelativePath(value, label = "Path") {
  if (typeof value !== "string" || value.length === 0 || isAbsolute(value) || value.includes("\\")) {
    throw new Error(`${label} must be a safe relative path.`);
  }
  const segments = value.split("/");
  if (segments.some((segment) => segment === "" || segment === "." || segment === "..")) {
    throw new Error(`${label} must be a safe relative path.`);
  }
  return value;
}

function normalizeLimits(limits = {}) {
  const normalized = { ...DEFAULT_PORTABLE_LIMITS, ...limits };
  for (const [name, value] of Object.entries(normalized)) {
    if (!Number.isSafeInteger(value) || value < 1) throw new Error(`Invalid portable filesystem bound: ${name}.`);
  }
  return normalized;
}

function contained(root, path) {
  const fromRoot = relative(root, path);
  return fromRoot === "" || (fromRoot !== ".." && !fromRoot.startsWith(`..${sep}`) && !isAbsolute(fromRoot));
}

function portableSkillName(contents, label) {
  const frontmatter = contents.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)?.[1];
  const name = frontmatter?.match(/^name:\s*([a-z0-9][a-z0-9.-]*)\s*$/m)?.[1];
  if (!name) throw new Error(`${label} requires a safe lowercase frontmatter name.`);
  return name;
}

function gitObjectHash(type, contents) {
  return createHash("sha1")
    .update(`${type} ${contents.length}\0`)
    .update(contents)
    .digest();
}

function portableGitTreeHash(files) {
  const root = { directories: new Map(), files: new Map() };
  for (const file of files) {
    const segments = file.relativePath.split("/");
    const name = segments.pop();
    let directory = root;
    for (const segment of segments) {
      if (!directory.directories.has(segment)) {
        directory.directories.set(segment, { directories: new Map(), files: new Map() });
      }
      directory = directory.directories.get(segment);
    }
    directory.files.set(name, file);
  }

  function hashDirectory(directory) {
    const entries = [
      ...[...directory.directories].map(([name, child]) => ({
        name,
        sortName: `${name}/`,
        mode: "40000",
        hash: hashDirectory(child),
      })),
      ...[...directory.files].map(([name, file]) => ({
        name,
        sortName: name,
        mode: file.executable ? "100755" : "100644",
        hash: gitObjectHash("blob", file.content),
      })),
    ].sort((first, second) => Buffer.compare(Buffer.from(first.sortName), Buffer.from(second.sortName)));
    const contents = Buffer.concat(entries.flatMap((entry) => [
      Buffer.from(`${entry.mode} ${entry.name}\0`),
      entry.hash,
    ]));
    return gitObjectHash("tree", contents);
  }

  return hashDirectory(root).toString("hex");
}

export async function readPortableSkillName(root, limits = {}) {
  const maximum = normalizeLimits(limits).maximumSkillFileBytes;
  const path = join(root, "SKILL.md");
  const metadata = await lstat(path).catch(() => null);
  if (!metadata) throw new Error("Portable skill requires a SKILL.md file.");
  if (!metadata.isFile() || metadata.isSymbolicLink() || metadata.size > maximum) {
    throw new Error("Portable skill requires a bounded regular SKILL.md file.");
  }
  const contents = await readFile(path, "utf8");
  return portableSkillName(contents, "Portable skill SKILL.md");
}

export async function inspectPortableSkillFile(path, limits = {}) {
  const maximum = normalizeLimits(limits).maximumSkillFileBytes;
  try {
    const metadata = await lstat(path);
    if (!metadata.isFile() || metadata.isSymbolicLink() || metadata.size > maximum) {
      throw new Error("Portable skill file must be a bounded regular Markdown file.");
    }
    if (!path.endsWith(".md")) throw new Error("Portable skill file must use a Markdown extension.");
    const contents = await readFile(path);
    return {
      safe: true,
      name: portableSkillName(contents.toString("utf8"), "Portable skill file"),
      contentSha256: createHash("sha256").update(contents).digest("hex"),
      byteCount: contents.length,
    };
  } catch (error) {
    const reason = typeof error.message === "string" && error.message.startsWith("Portable skill")
      ? error.message
      : "Portable skill file could not be inspected safely.";
    return { safe: false, reason };
  }
}

export async function readBoundedPortableFile(root, relativePath, maximumBytes = 1024 * 1024) {
  assertSafeRelativePath(relativePath, "Portable source file path");
  const canonicalRoot = await realpath(root);
  const path = join(canonicalRoot, ...relativePath.split("/"));
  const metadata = await lstat(path).catch(() => null);
  if (!metadata?.isFile() || metadata.isSymbolicLink() || metadata.size > maximumBytes) {
    throw new Error("Portable source file must be a bounded regular file.");
  }
  const resolved = await realpath(path);
  if (!contained(canonicalRoot, resolved)) throw new Error("Portable source file escaped its source root.");
  return readFile(resolved, "utf8");
}

export async function inspectPortableDirectory(root, options = {}) {
  const limits = normalizeLimits(options);
  const files = [];
  let entries = 0;
  let bytes = 0;

  try {
    const rootMetadata = await lstat(root);
    if (!rootMetadata.isDirectory() || rootMetadata.isSymbolicLink()) {
      return { safe: false, reason: "Portable skill root must be a real directory." };
    }
    const canonicalRoot = await realpath(root);

    async function collect(current) {
      const currentReal = await realpath(current);
      if (!contained(canonicalRoot, currentReal)) throw new Error("Portable skill traversal escaped its root.");
      const children = await readdir(current, { withFileTypes: true });
      for (const child of children) {
        entries += 1;
        if (entries > limits.maximumEntries) throw new Error("Portable skill exceeds the entry bound.");
        const path = join(current, child.name);
        const metadata = await lstat(path);
        if (metadata.isSymbolicLink()) throw new Error("Portable skill contains a symbolic link.");
        if (metadata.isDirectory()) {
          if (child.name !== ".git" && child.name !== "node_modules") await collect(path);
          continue;
        }
        if (!metadata.isFile()) throw new Error("Portable skill contains a special file.");
        if (files.length + 1 > limits.maximumFilesPerSkill) throw new Error("Portable skill exceeds the file bound.");
        bytes += metadata.size;
        if (bytes > limits.maximumBytesPerSkill) throw new Error("Portable skill exceeds the byte bound.");
        files.push({
          relativePath: relative(canonicalRoot, path).split("\\").join("/"),
          content: await readFile(path),
          executable: Boolean(metadata.mode & 0o111),
        });
      }
    }

    await collect(canonicalRoot);
    await readPortableSkillName(canonicalRoot, limits);
    files.sort((first, second) => first.relativePath.localeCompare(second.relativePath));
    const digest = createHash("sha256");
    for (const file of files) {
      digest.update(file.relativePath);
      digest.update(file.content);
    }
    return {
      safe: true,
      contentSha256: digest.digest("hex"),
      gitTreeHash: portableGitTreeHash(files),
      fileCount: files.length,
      byteCount: bytes,
    };
  } catch (error) {
    const reason = typeof error.message === "string" && error.message.startsWith("Portable skill")
      ? error.message
      : "Portable skill could not be inspected safely.";
    return { safe: false, reason };
  }
}

export async function calculatePortableDirectoryHash(root, options = {}) {
  const inspection = await inspectPortableDirectory(root, options);
  if (!inspection.safe) throw new Error(inspection.reason);
  return inspection.contentSha256;
}

export async function calculatePortableGitTreeHash(root, options = {}) {
  const inspection = await inspectPortableDirectory(root, options);
  if (!inspection.safe) throw new Error(inspection.reason);
  return inspection.gitTreeHash;
}
