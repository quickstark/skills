import { lstat, readdir } from "node:fs/promises";
import { join } from "node:path";

function sameInventory(actual, expected) {
  return actual.length === expected.length
    && actual.every((name, index) => name === expected[index]);
}

export async function assertGeneratedPackageRoot(root, {
  manifestDirectory,
  includeCapabilities = false,
  noticeFiles = [],
}) {
  const rootMetadata = await lstat(root);
  if (!rootMetadata.isDirectory() || rootMetadata.isSymbolicLink()) {
    throw new Error("Generated package root must be a real directory.");
  }

  const expectedDirectories = [manifestDirectory, "scripts", "skills"];
  if (includeCapabilities) expectedDirectories.push("capabilities");
  const expectedEntries = [...expectedDirectories, ...noticeFiles].sort();
  const entries = await readdir(root, { withFileTypes: true });
  const actualEntries = entries.map((entry) => entry.name).sort();

  if (!sameInventory(actualEntries, expectedEntries)) {
    throw new Error("Generated package has unexpected top-level entries or is missing declared entries.");
  }

  for (const entry of entries) {
    const path = join(root, entry.name);
    const metadata = await lstat(path);
    if (metadata.isSymbolicLink()) {
      throw new Error("Generated package entries must be regular files and directories, not symlinks.");
    }
    if (expectedDirectories.includes(entry.name) ? !metadata.isDirectory() : !metadata.isFile()) {
      throw new Error("Generated package entries must be regular files and directories of the declared type.");
    }
  }

  const manifestRoot = join(root, manifestDirectory);
  const manifestEntries = await readdir(manifestRoot, { withFileTypes: true });
  if (manifestEntries.length !== 1 || manifestEntries[0].name !== "plugin.json") {
    throw new Error("Generated package manifest directory must contain exactly plugin.json.");
  }
  const manifestMetadata = await lstat(join(manifestRoot, "plugin.json"));
  if (!manifestMetadata.isFile() || manifestMetadata.isSymbolicLink()) {
    throw new Error("Generated package manifest must be one regular file.");
  }

  return true;
}
