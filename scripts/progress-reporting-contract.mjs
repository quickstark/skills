import { readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { PUBLIC_COMMANDS } from "./skill-collection-registry.mjs";
import { V3_INTERNAL_CAPABILITIES } from "./qs-skill-catalog.mjs";
import { PS_INTERNAL_CAPABILITIES } from "./ps-skill-catalog.mjs";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const START = "<!-- qs-progress:start -->";
const END = "<!-- qs-progress:end -->";

export const PUBLIC_PROGRESS_CONTRACT = [
  'Keep a checklist in the conversation. During long operations, tell me the current stage, whether progress is continuing, and whether you need anything from me. Verify each completed stage. Finish with a short explanation of what was configured, which checks passed, and what remains.',
  "",
  "Start with a concise checklist of meaningful stages; one stage is enough for a short task. Label stages pending, active, verified, skipped, blocked, or failed. Only verified stages receive completed checkboxes; explain skipped stages. Verify each stage against relevant artifacts, command results, sources, or observable behavior before checking it off. A failing required check prevents completion; reopen a verified stage when later evidence invalidates it.",
  "",
  "During long operations, aim for updates within sixty seconds when the host allows control to return. State the current stage, observed progress or waiting state, and whether user input is needed. Distinguish a process that is running from confirmed progress; elapsed time alone proves neither progress nor completion. Finish with what changed or was configured, checks passed or failed, and remaining work. Read-only runs describe findings without implying mutations. Apply this contract regardless of effort or report mode; brief output may compress evidence but retains blockers and failed checks.",
].join("\n");

export const HELPER_PROGRESS_CONTRACT = [
  "Contribute stage status and verification evidence to the parent skill's conversation checklist. Report the current stage, observed progress or waiting state, and any required user input to the parent during long operations, aiming for updates within sixty seconds when the host allows control to return. Distinguish running from confirmed progress; elapsed time alone is not evidence.",
  "",
  "Supply relevant artifacts, command results, sources, or observable behavior before the parent checks off a stage. Identify failed checks, skipped work and reasons, blockers, and later evidence that requires reopening a verified stage. Supply findings or changes, passed and failed checks, and remaining work for the parent's final explanation. Never imply configuration in a read-only run. Do not create a separate checklist, completion report, skills-used entry, or continuation. Remain inside the public root regardless of effort or report mode.",
].join("\n");

// Non-command sources are deliberately enumerated: adding or removing one requires
// an explicit coverage decision without promoting it into a package catalog.
export const STANDALONE_PROGRESS_PATHS = Object.freeze([
  "deprecated/design-an-interface", "deprecated/qa", "deprecated/request-refactor-plan",
  "deprecated/ubiquitous-language", "in-progress/batch-grill-me", "in-progress/claude-handoff",
  "in-progress/loop-me", "in-progress/setup-ts-deep-modules", "in-progress/to-questionnaire",
  "in-progress/wizard", "in-progress/writing-beats", "in-progress/writing-fragments",
  "in-progress/writing-shape", "misc/git-guardrails-claude-code", "misc/migrate-to-shoehorn",
  "misc/scaffold-exercises", "misc/setup-pre-commit", "personal/edit-article", "personal/obsidian-vault",
].map((path) => `skills/${path}/SKILL.md`));

export function progressInventory() {
  return {
    publicSkills: PUBLIC_COMMANDS.map((skill) => `${skill.sourcePath ?? `skills/${skill.bucket}/${skill.name}`}/SKILL.md`).sort(),
    standaloneSkills: [...STANDALONE_PROGRESS_PATHS].sort(),
    internalReferences: [
      ...V3_INTERNAL_CAPABILITIES.map((capability) => `skills/internal/${capability.name}.md`),
      ...PS_INTERNAL_CAPABILITIES.map((capability) => capability.sourcePath),
    ].sort(),
  };
}

async function walk(root, path) {
  const entries = await readdir(join(root, path), { withFileTypes: true });
  const paths = [];
  for (const entry of entries) {
    const child = `${path}/${entry.name}`;
    if (entry.isSymbolicLink()) throw new Error(`Progress inventory does not follow symbolic links: ${child}.`);
    if (entry.isDirectory()) paths.push(...await walk(root, child));
    else if (entry.isFile()) paths.push(child);
  }
  return paths;
}

export async function validateProgressInventory({ root = repositoryRoot } = {}) {
  const inventory = progressInventory();
  const expected = Object.values(inventory).flat();
  if (new Set(expected).size !== expected.length) throw new Error("Progress inventory contains duplicate source ownership.");
  const actual = (await walk(root, "skills")).filter((path) => path.endsWith("/SKILL.md")
    || (/^skills\/(?:pstack\/)?internal\//.test(path) && path.endsWith(".md")));
  const unknown = actual.filter((path) => !expected.includes(path));
  const missing = expected.filter((path) => !actual.includes(path));
  if (unknown.length || missing.length) {
    throw new Error(`Progress inventory mismatch. Unknown: ${unknown.join(", ") || "none"}. Missing: ${missing.join(", ") || "none"}.`);
  }
  return inventory;
}

export function withProgressContract(content, { helper = false } = {}) {
  const newline = content.includes("\r\n") ? "\r\n" : "\n";
  const contract = helper ? HELPER_PROGRESS_CONTRACT : PUBLIC_PROGRESS_CONTRACT;
  const block = [START, "## Progress reporting", "", contract, END].join("\n").replaceAll("\n", newline);
  const starts = [...content.matchAll(/<!-- qs-progress:start -->/g)];
  const ends = [...content.matchAll(/<!-- qs-progress:end -->/g)];
  const markerMentions = [...content.matchAll(/<!--\s*qs-progress\b/g)].length;
  if (starts.length || ends.length || markerMentions) {
    const start = starts[0]?.index;
    const end = ends[0]?.index;
    const suffixAt = (end ?? 0) + END.length;
    if (starts.length !== 1 || ends.length !== 1 || markerMentions !== 2 || start >= end
      || (start !== 0 && content[start - 1] !== "\n")
      || content[end - 1] !== "\n"
      || (suffixAt < content.length && !content.slice(suffixAt).startsWith(newline))) {
      throw new Error("Malformed progress-reporting managed section; refusing to replace unrelated content.");
    }
    return content.slice(0, start) + block + content.slice(suffixAt);
  }
  // Insert before an existing final completion section; never trim source bytes.
  const heading = /^## Completion report and next steps\r?$/m.exec(content);
  const at = heading?.index ?? content.length;
  const prefix = content.slice(0, at);
  const separator = prefix.length && !prefix.endsWith(newline) ? newline : "";
  return prefix + separator + newline + block + newline + (heading ? newline + content.slice(at) : "");
}

export async function syncProgressContracts({ check = false, root = repositoryRoot } = {}) {
  const inventory = await validateProgressInventory({ root });
  const changes = [];
  // Preflight every replacement before writing any source, so malformed markers
  // cannot leave a partially synchronized set of canonical documents.
  for (const [kind, paths] of Object.entries(inventory)) {
    if (kind === "publicSkills") continue; // Public completion renderer owns these.
    for (const path of paths) {
      const content = await readFile(join(root, path), "utf8");
      let expected;
      try { expected = withProgressContract(content, { helper: kind === "internalReferences" }); }
      catch (error) { throw new Error(`${path}: ${error.message}`, { cause: error }); }
      if (content !== expected) changes.push({ path, expected });
    }
  }
  if (check && changes.length) throw new Error(`Progress contracts are out of date: ${changes.map(({ path }) => path).join(", ")}.`);
  for (const { path, expected } of changes) await writeFile(join(root, path), expected);
  return { updated: changes.length, ...Object.fromEntries(Object.entries(inventory).map(([kind, paths]) => [kind, paths.length])) };
}
