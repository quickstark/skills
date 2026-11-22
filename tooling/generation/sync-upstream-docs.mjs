import { repositoryRoot } from '../repository-root.mjs';
import { createHash } from "node:crypto";
import { listPublicSources } from "./sync-v3-docs.mjs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { assertSkillProvenance, readSkillProvenance, renderSkillProvenanceMarkdown } from "../catalog/skill-provenance.mjs";

export async function syncUpstreamDocs({ root = repositoryRoot, check = false, refreshPublicDigests = false } = {}) {
  const record = readSkillProvenance(root);
  let digestsUpdated = false;
  if (refreshPublicDigests && !check) {
    // Only refresh generated public-file hashes. Release receipts and decision history
    // keep their reviewed values and are checked separately by adoption validation.
    const sources = new Set(await listPublicSources(root));
    for (const entry of record.target.capabilities) {
      if (entry.role !== "public" || !sources.has(entry.path) || !entry.derivedDigest) continue;
      const value = createHash("sha256").update(await readFile(join(root, entry.path))).digest("hex");
      if (entry.derivedDigest.value !== value) {
        entry.derivedDigest.value = value;
        digestsUpdated = true;
      }
    }
  }
  assertSkillProvenance(record, { root });
  if (digestsUpdated) await writeFile(join(root, "tooling/catalog/skill-provenance.json"), JSON.stringify(record, null, 2) + "\n");
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
  const result = await syncUpstreamDocs({ check, refreshPublicDigests: process.argv.includes("--refresh-public-digests") });
  process.stdout.write(`${check ? "Verified" : "Synchronized"} provenance documentation for ${result.capabilities} capabilities.\n`);
}
