import { lstat, mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, posix, relative, sep } from "node:path";
import { gunzipSync } from "node:zlib";

export const DEFAULT_NPM_ARCHIVE_LIMITS = Object.freeze({
  maximumCompressedBytes: 64 * 1024 * 1024,
  maximumExpandedBytes: 128 * 1024 * 1024,
  maximumPayloadBytes: 64 * 1024 * 1024,
  maximumFileBytes: 32 * 1024 * 1024,
  maximumEntries: 4_096,
});

function normalizeLimits(options = {}) {
  const limits = { ...DEFAULT_NPM_ARCHIVE_LIMITS, ...options };
  for (const [name, value] of Object.entries(limits)) {
    if (!Number.isSafeInteger(value) || value < 1) throw new Error(`Invalid npm archive bound: ${name}.`);
  }
  return limits;
}

function textField(buffer) {
  const end = buffer.indexOf(0);
  return buffer.subarray(0, end === -1 ? buffer.length : end).toString("utf8");
}

function octalField(buffer, label) {
  if (buffer[0] & 0x80) throw new Error(`Npm package archive uses an unsupported binary ${label} field.`);
  const value = textField(buffer).trim().replace(/\s+$/, "");
  if (!value) return 0;
  if (!/^[0-7]+$/.test(value)) throw new Error(`Npm package archive contains an invalid ${label} field.`);
  const parsed = Number.parseInt(value, 8);
  if (!Number.isSafeInteger(parsed) || parsed < 0) throw new Error(`Npm package archive ${label} exceeds its safe numeric bound.`);
  return parsed;
}

function verifyHeaderChecksum(header) {
  const expected = octalField(header.subarray(148, 156), "checksum");
  let actual = 0;
  for (let index = 0; index < header.length; index += 1) actual += index >= 148 && index < 156 ? 0x20 : header[index];
  if (actual !== expected) throw new Error("Npm package archive header checksum is invalid.");
}

function parsePax(contents) {
  const fields = {};
  let offset = 0;
  while (offset < contents.length) {
    const space = contents.indexOf(0x20, offset);
    if (space === -1) throw new Error("Npm package archive contains malformed PAX metadata.");
    const length = Number.parseInt(contents.subarray(offset, space).toString("ascii"), 10);
    if (!Number.isSafeInteger(length) || length < 4 || offset + length > contents.length || contents[offset + length - 1] !== 0x0a) {
      throw new Error("Npm package archive contains malformed PAX metadata.");
    }
    const record = contents.subarray(space + 1, offset + length - 1).toString("utf8");
    const separator = record.indexOf("=");
    if (separator <= 0) throw new Error("Npm package archive contains malformed PAX metadata.");
    fields[record.slice(0, separator)] = record.slice(separator + 1);
    offset += length;
  }
  return fields;
}

function safeArchivePath(value) {
  if (typeof value !== "string" || !value || value.includes("\\") || value.includes("\0") || isAbsolute(value)) {
    throw new Error("Npm package archive contains an unsafe entry path.");
  }
  const withoutTrailingSlash = value.replace(/\/+$/, "");
  const segments = withoutTrailingSlash.split("/");
  if (segments.some((segment) => !segment || segment === "." || segment === "..")) throw new Error("Npm package archive contains an unsafe entry path.");
  const normalized = posix.normalize(withoutTrailingSlash);
  if (normalized !== withoutTrailingSlash || (normalized !== "package" && !normalized.startsWith("package/"))) {
    throw new Error("Npm package archive entries must remain under package/.");
  }
  return normalized;
}

function parseArchive(expanded, limits) {
  const entries = [];
  const paths = new Map();
  let offset = 0;
  let payloadBytes = 0;
  let nextPax = null;
  let globalPax = {};
  let headerCount = 0;
  let ended = false;
  while (offset + 512 <= expanded.length) {
    const header = expanded.subarray(offset, offset + 512);
    if (header.every((byte) => byte === 0)) {
      const second = expanded.subarray(offset + 512, offset + 1024);
      if (second.length !== 512 || !second.every((byte) => byte === 0) || !expanded.subarray(offset + 1024).every((byte) => byte === 0)) {
        throw new Error("Npm package archive has an invalid end marker.");
      }
      ended = true;
      break;
    }
    verifyHeaderChecksum(header);
    headerCount += 1;
    if (headerCount > limits.maximumEntries) throw new Error("Npm package archive exceeds its entry bound.");
    const size = octalField(header.subarray(124, 136), "size");
    const contentStart = offset + 512;
    const contentEnd = contentStart + size;
    if (contentEnd > expanded.length) throw new Error("Npm package archive entry exceeds the expanded archive.");
    const type = String.fromCharCode(header[156] || 0x30);
    const headerName = textField(header.subarray(0, 100));
    const prefix = textField(header.subarray(345, 500));
    const headerPath = prefix ? `${prefix}/${headerName}` : headerName;
    const contents = expanded.subarray(contentStart, contentEnd);
    offset = contentStart + Math.ceil(size / 512) * 512;

    if (type === "x" || type === "g") {
      const values = parsePax(contents);
      if (type === "g") {
        if (["path", "linkpath", "size"].some((key) => Object.hasOwn(values, key))) throw new Error("Npm package archive contains unsafe global PAX metadata.");
        globalPax = { ...globalPax, ...values };
      }
      else nextPax = values;
      continue;
    }
    if (type === "L") {
      nextPax = { ...(nextPax ?? {}), path: textField(contents) };
      continue;
    }
    const metadata = { ...globalPax, ...(nextPax ?? {}) };
    nextPax = null;
    if (!["0", "5"].includes(type)) throw new Error("Npm package archive contains a link or special entry.");
    if (textField(header.subarray(157, 257)) || metadata.linkpath) throw new Error("Npm package archive regular entries must not contain link metadata.");
    if (metadata.size !== undefined && (!/^\d+$/.test(metadata.size) || Number(metadata.size) !== size)) {
      throw new Error("Npm package archive PAX size differs from its entry header.");
    }
    if (type === "5" && size !== 0) throw new Error("Npm package archive directory contains an invalid payload.");
    if (type === "0" && size > limits.maximumFileBytes) throw new Error("Npm package archive file exceeds its byte bound.");
    payloadBytes += size;
    if (payloadBytes > limits.maximumPayloadBytes) throw new Error("Npm package archive payload exceeds its byte bound.");
    const path = safeArchivePath(metadata.path ?? headerPath);
    if (paths.has(path) || [...paths.keys()].some((existing) => (paths.get(existing) === "file" && path.startsWith(`${existing}/`)) || (type === "0" && existing.startsWith(`${path}/`)))) {
      throw new Error("Npm package archive contains duplicate or conflicting entry paths.");
    }
    const kind = type === "5" ? "directory" : "file";
    paths.set(path, kind);
    entries.push({ path, kind, contents: type === "0" ? Buffer.from(contents) : null });
  }
  if (!ended) throw new Error("Npm package archive is missing its end marker.");
  if (!entries.length || (paths.has("package") && paths.get("package") !== "directory")) throw new Error("Npm package archive requires content under package/.");
  if (nextPax) throw new Error("Npm package archive ends with unapplied metadata.");
  return { entries, payloadBytes };
}

function contained(root, path) {
  const fromRoot = relative(root, path);
  return fromRoot === "" || (fromRoot !== ".." && !fromRoot.startsWith(`..${sep}`) && !isAbsolute(fromRoot));
}

export async function extractSafeNpmArchive(archive, destination, configuredLimits = {}) {
  if (!Buffer.isBuffer(archive)) throw new Error("Npm package archive must be provided as verified bytes.");
  const limits = normalizeLimits(configuredLimits);
  if (archive.length > limits.maximumCompressedBytes) throw new Error("Npm package archive exceeds its compressed-byte bound.");
  let expanded;
  try {
    expanded = gunzipSync(archive, { maxOutputLength: limits.maximumExpandedBytes });
  } catch {
    throw new Error("Npm package archive could not be decompressed within its expanded-byte bound.");
  }
  if (expanded.length > limits.maximumExpandedBytes) throw new Error("Npm package archive exceeds its expanded-byte bound.");
  const { entries, payloadBytes } = parseArchive(expanded, limits);
  const destinationMetadata = await lstat(destination).catch((error) => error?.code === "ENOENT" ? null : Promise.reject(error));
  if (destinationMetadata) throw new Error("Npm package archive destination must not already exist.");
  await mkdir(destination, { recursive: false, mode: 0o700 });
  try {
    for (const entry of entries.filter(({ kind }) => kind === "directory").sort((first, second) => first.path.length - second.path.length)) {
      const path = join(destination, ...entry.path.split("/"));
      if (!contained(destination, path)) throw new Error("Npm package archive extraction escaped its destination.");
      await mkdir(path, { recursive: true, mode: 0o700 });
    }
    for (const entry of entries.filter(({ kind }) => kind === "file")) {
      const path = join(destination, ...entry.path.split("/"));
      if (!contained(destination, path)) throw new Error("Npm package archive extraction escaped its destination.");
      await mkdir(dirname(path), { recursive: true, mode: 0o700 });
      await writeFile(path, entry.contents, { flag: "wx", mode: 0o600 });
    }
  } catch (error) {
    await rm(destination, { recursive: true, force: true });
    throw error;
  }
  return { entryCount: entries.length, expandedBytes: expanded.length, payloadBytes };
}
