import { createHash } from "node:crypto";
import { lstat, readdir, realpath } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import * as nodePath from "node:path";

import { inspectPortableDirectory, inspectPortableSkillFile, readPortableSkillName } from "./filesystem.mjs";

function contained(root, path) {
  const fromRoot = relative(root, path);
  return fromRoot === "" || (fromRoot !== ".." && !fromRoot.startsWith(`..${sep}`) && !isAbsolute(fromRoot));
}

function selectorParts(value, { allowForce = false } = {}) {
  if (typeof value !== "string" || value.length === 0 || value.includes("\\") || value.includes("\0")) {
    throw new Error("Pi skill selector must be a non-empty portable path pattern.");
  }
  let mode = "include";
  let selector = value;
  if (selector.startsWith("!")) { mode = "exclude"; selector = selector.slice(1); }
  else if (allowForce && selector.startsWith("+")) { mode = "force-include"; selector = selector.slice(1); }
  else if (allowForce && selector.startsWith("-")) { mode = "force-exclude"; selector = selector.slice(1); }
  selector = selector.replace(/^\.\//, "").replace(/\/$/, "");
  if (!selector || isAbsolute(selector) || selector.split("/").some((segment) => segment === "" || segment === "." || segment === "..")) {
    throw new Error("Pi skill selector must remain inside its declared root.");
  }
  return { mode, selector };
}

function hasGlob(value) {
  return /[*?\[\]{}]/.test(value);
}

function fallbackGlobExpression(pattern) {
  let expression = "";
  for (let index = 0; index < pattern.length; index += 1) {
    const character = pattern[index];
    if (character === "*") {
      if (pattern[index + 1] === "*") {
        index += 1;
        if (pattern[index + 1] === "/") {
          index += 1;
          expression += "(?:.*/)?";
        } else expression += ".*";
      } else expression += "[^/]*";
    } else if (character === "?") expression += "[^/]";
    else if (character === "[") {
      const end = pattern.indexOf("]", index + 1);
      if (end === -1) expression += "\\[";
      else {
        const value = pattern.slice(index + 1, end);
        expression += `[${value.startsWith("!") ? `^${value.slice(1)}` : value}]`;
        index = end;
      }
    } else if (character === "{") {
      const end = pattern.indexOf("}", index + 1);
      if (end === -1) expression += "\\{";
      else {
        const alternatives = pattern.slice(index + 1, end).split(",").map((value) => fallbackGlobExpression(value).source.replace(/^\^|\$$/g, ""));
        expression += `(?:${alternatives.join("|")})`;
        index = end;
      }
    } else expression += /[\\^$+?.()|{}\[\]]/.test(character) ? `\\${character}` : character;
  }
  return new RegExp(`^${expression}$`);
}

export function matchesPiGlob(path, pattern, nativeMatcher = nodePath.matchesGlob) {
  return typeof nativeMatcher === "function" ? nativeMatcher(path, pattern) : fallbackGlobExpression(pattern).test(path);
}

function selectorBase(selector) {
  const segments = selector.split("/");
  const staticSegments = [];
  for (const segment of segments) {
    if (hasGlob(segment)) break;
    staticSegments.push(segment);
  }
  if (!staticSegments.length) return ".";
  if (!hasGlob(selector)) return staticSegments.join("/");
  return staticSegments.join("/");
}

function selectorMatchesPath(selector, path) {
  if (hasGlob(selector)) return matchesPiGlob(path, selector);
  return path === selector || path.startsWith(`${selector}/`);
}

export function piSkillFilterAllows(filters, skill) {
  if (filters === undefined) return true;
  if (!Array.isArray(filters)) return false;
  if (filters.length === 0) return false;
  const parsed = filters.map((filter) => selectorParts(filter, { allowForce: true }));
  const hasPositive = parsed.some(({ mode }) => ["include", "force-include"].includes(mode));
  let allowed = !hasPositive;
  const candidates = [skill.name, skill.path, dirname(skill.path).split(sep).join("/")];
  for (const { mode, selector } of parsed) {
    const matches = ["force-include", "force-exclude"].includes(mode)
      ? candidates.includes(selector)
      : candidates.some((candidate) => selectorMatchesPath(selector, candidate));
    if (!matches) continue;
    if (["exclude", "force-exclude"].includes(mode)) allowed = false;
    else allowed = true;
  }
  return allowed;
}

async function inspectSkillPath(path, root, limits) {
  const metadata = await lstat(path);
  if (metadata.isSymbolicLink()) throw new Error("Pi skill discovery refuses symbolic links.");
  if (metadata.isFile()) {
    const inspection = await inspectPortableSkillFile(path, limits);
    if (!inspection.safe) throw new Error(inspection.reason);
    return {
      name: inspection.name,
      path: relative(root, path).split(sep).join("/"),
      kind: "file",
      contentSha256: inspection.contentSha256,
    };
  }
  if (!metadata.isDirectory()) throw new Error("Pi skill discovery refuses special files.");
  const inspection = await inspectPortableDirectory(path, limits);
  if (!inspection.safe) throw new Error(inspection.reason);
  return {
    name: await readPortableSkillName(path, limits),
    path: `${relative(root, path).split(sep).join("/")}/SKILL.md`.replace(/^\.\//, ""),
    kind: "directory",
    contentSha256: inspection.contentSha256,
  };
}

async function collectFromDirectory(scanRoot, root, limits, budget, results) {
  const scanRootReal = await realpath(scanRoot);
  const rootReal = await realpath(root);
  if (!contained(rootReal, scanRootReal)) throw new Error("Pi skill discovery escaped its declared root.");
  async function visit(current, depth) {
    const entries = await readdir(current, { withFileTypes: true });
    budget.entries += entries.length;
    if (budget.entries > limits.maximumSurfaceEntries) throw new Error("Pi skill discovery exceeds its entry bound.");
    const skillFile = entries.find((entry) => entry.name === "SKILL.md");
    if (skillFile) {
      const skill = await inspectSkillPath(current, rootReal, limits);
      results.set(skill.path, skill);
      return;
    }
    for (const entry of entries) {
      const path = join(current, entry.name);
      const metadata = await lstat(path);
      if (metadata.isSymbolicLink()) throw new Error("Pi skill discovery refuses symbolic links.");
      if (metadata.isDirectory()) {
        if (entry.name !== ".git" && entry.name !== "node_modules") await visit(path, depth + 1);
      } else if (metadata.isFile()) {
        if (depth === 0 && entry.name.endsWith(".md")) {
          const skill = await inspectSkillPath(path, rootReal, limits);
          results.set(skill.path, skill);
        }
      } else {
        throw new Error("Pi skill discovery refuses special files.");
      }
    }
  }
  await visit(scanRootReal, 0);
}

async function enumerateSelectorMatches(root, selector, limits, budget) {
  const rootReal = await realpath(root);
  const baseRelative = selectorBase(selector);
  const base = baseRelative === "." ? rootReal : join(rootReal, ...baseRelative.split("/"));
  const baseMetadata = await lstat(base).catch((error) => error?.code === "ENOENT" ? null : Promise.reject(error));
  if (!baseMetadata) return [];
  if (baseMetadata.isSymbolicLink()) throw new Error("Pi skill selector base must not be a symbolic link.");
  const baseReal = await realpath(base);
  if (!contained(rootReal, baseReal)) throw new Error("Pi skill selector escaped its declared root.");
  if (!hasGlob(selector)) return [baseReal];
  const matches = [];
  async function visit(current) {
    const entries = await readdir(current, { withFileTypes: true });
    budget.entries += entries.length;
    if (budget.entries > limits.maximumSurfaceEntries) throw new Error("Pi skill selector exceeds its entry bound.");
    for (const entry of entries) {
      const path = join(current, entry.name);
      const metadata = await lstat(path);
      if (metadata.isSymbolicLink()) throw new Error("Pi skill selector refuses symbolic links.");
      if (!metadata.isFile() && !metadata.isDirectory()) throw new Error("Pi skill selector refuses special files.");
      const relativePath = relative(rootReal, path).split(sep).join("/");
      if (matchesPiGlob(relativePath, selector)) {
        matches.push(path);
        if (metadata.isDirectory()) continue;
      }
      if (metadata.isDirectory() && entry.name !== ".git" && entry.name !== "node_modules") await visit(path);
    }
  }
  if (baseMetadata.isDirectory()) await visit(baseReal);
  return matches;
}

export async function discoverPiSkills({ root, selectors, limits }) {
  const parsed = selectors.map((selector) => selectorParts(selector, { allowForce: true }));
  const positives = parsed.filter(({ mode }) => ["include", "force-include"].includes(mode));
  if (!positives.length) return [];
  const results = new Map();
  const budget = { entries: 0 };
  for (const { selector } of positives) {
    for (const match of await enumerateSelectorMatches(root, selector, limits, budget)) {
      const metadata = await lstat(match);
      if (metadata.isDirectory()) await collectFromDirectory(match, root, limits, budget, results);
      else if (metadata.isFile() && match.endsWith(".md")) {
        const skill = await inspectSkillPath(match, await realpath(root), limits);
        results.set(skill.path, skill);
      }
    }
  }
  return [...results.values()]
    .filter((skill) => piSkillFilterAllows(selectors, skill))
    .sort((first, second) => first.name.localeCompare(second.name) || first.path.localeCompare(second.path));
}

export async function discoverPiPackageSkills(packageRoot, packageMetadata, limits) {
  if (packageMetadata && Object.hasOwn(packageMetadata, "pi")) {
    if (!packageMetadata.pi || typeof packageMetadata.pi !== "object" || Array.isArray(packageMetadata.pi)) {
      throw new Error("Pi package manifest must be an object.");
    }
    const manifestSkills = packageMetadata.pi.skills;
    if (manifestSkills === undefined) return [];
    if (!Array.isArray(manifestSkills) || !manifestSkills.every((entry) => typeof entry === "string")) {
      throw new Error("Pi package manifest skills must be an array of path selectors.");
    }
    return discoverPiSkills({ root: packageRoot, selectors: manifestSkills, limits });
  }
  const conventional = join(packageRoot, "skills");
  const metadata = await lstat(conventional).catch((error) => error?.code === "ENOENT" ? null : Promise.reject(error));
  if (!metadata) return [];
  if (!metadata.isDirectory() || metadata.isSymbolicLink()) throw new Error("Pi package skills root must be a real directory.");
  return discoverPiSkills({ root: packageRoot, selectors: ["skills"], limits });
}

export function normalizePiSettingsSkillSelectors(values, homeDirectory) {
  if (!Array.isArray(values)) return [];
  const agentRoot = join(homeDirectory, ".pi", "agent");
  return values.map((value) => {
    if (typeof value !== "string" || value.length === 0 || value.includes("\\") || value.includes("\0")) {
      throw new Error("Pi settings skill selector must be a non-empty path pattern.");
    }
    let mode = "include";
    let selector = value;
    if (selector.startsWith("!")) { mode = "exclude"; selector = selector.slice(1); }
    else if (selector.startsWith("+")) { mode = "force-include"; selector = selector.slice(1); }
    else if (selector.startsWith("-")) { mode = "force-exclude"; selector = selector.slice(1); }
    if (!selector) throw new Error("Pi settings skill selector must contain a path.");
    const prefix = mode === "exclude" ? "!" : mode === "force-exclude" ? "-" : mode === "force-include" ? "+" : "";
    let absolutePattern;
    if (selector === "~") absolutePattern = homeDirectory;
    else if (selector.startsWith("~/")) absolutePattern = join(homeDirectory, selector.slice(2));
    else absolutePattern = isAbsolute(selector) ? selector : resolve(agentRoot, selector);
    const relativePattern = relative(homeDirectory, absolutePattern).split(sep).join("/");
    if (!relativePattern || relativePattern === ".." || relativePattern.startsWith("../") || isAbsolute(relativePattern)) {
      throw new Error("Pi settings skill selector escapes the selected home directory.");
    }
    return `${prefix}${relativePattern}`;
  });
}

export function opaquePiSelectorIdentity(value) {
  return createHash("sha256").update(String(value)).digest("hex").slice(0, 16);
}
