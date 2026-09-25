import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { assertSkillProvenance, readSkillProvenance, renderSkillProvenanceMarkdown } from "./skill-provenance.mjs";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export async function syncUpstreamDocs({ root = repositoryRoot, check = false } = {}) {
  const record = assertSkillProvenance(readSkillProvenance(root), { root });
  const expected = renderSkillProvenanceMarkdown(record);
  const path = join(root, "docs", "upstream", "provenance.md");
  const current = await readFile(path, "utf8").catch((error) => error.code === "ENOENT" ? null : Promise.reject(error));
  if (current !== expected) {
    if (check) throw new Error("Generated provenance documentation is out of date; run npm run sync:upstream.");
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, expected);
  }
  return { changed: current !== expected, capabilities: record.capabilities.length };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const check = process.argv.includes("--check");
  const result = await syncUpstreamDocs({ check });
  process.stdout.write(`${check ? "Verified" : "Synchronized"} provenance documentation for ${result.capabilities} capabilities.\n`);
}
