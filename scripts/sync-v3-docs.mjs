import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { UPSTREAM_REPOSITORY } from "./qs-skill-catalog.mjs";
import { PUBLIC_COMMANDS } from "./skill-collection-registry.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const check = process.argv.includes("--check");

function render(skill) {
  const packageName = skill.collectionId;
  const install = `codex plugin add ${packageName}@quickstark`;
  const sourcePath = skill.sourcePath ?? `skills/${skill.bucket}/${skill.name}`;
  const source = `https://github.com/quickstark/skills/blob/main/${sourcePath}/SKILL.md`;
  const upstream = skill.upstreamName
    ? ` · [Upstream inspiration](${UPSTREAM_REPOSITORY}/tree/main/skills/${skill.bucket}/${skill.upstreamName})`
    : "";

  return [
    `# ${skill.displayName}`,
    "",
    "Quickstart:",
    "",
    "```bash",
    "codex plugin marketplace add ./codex",
    install,
    "```",
    "",
    `[Source](${source})${upstream}`,
    "",
    "## What it does",
    "",
    `\`/${skill.name}\` ${skill.shortDescription[0].toLowerCase()}${skill.shortDescription.slice(1)}. Its detailed scope and safety behavior live in the canonical [skill instructions](../../${sourcePath}/SKILL.md).`,
    "",
    "## When to reach for it",
    "",
    `Use \`/${skill.name}\` when the requested primary outcome is: ${skill.prompt}. Choose another root command when that would be only an intermediate technique.`,
    "",
    ...(skill.documentationNotes?.length ? [
      "## Command behavior",
      "",
      ...skill.documentationNotes.map((note) => `- ${note}`),
      "",
    ] : []),
    "## Where it fits",
    "",
    `This is lifecycle position ${skill.lifecycle.position} in the ${skill.distribution ?? "optional PS"} projection and is installed through \`${packageName}\`. It owns one bounded root run and never starts another public skill automatically.`,
    "",
    "## Output and next steps",
    "",
    "",
  ].join("\n");
}

let updated = 0;
for (const skill of PUBLIC_COMMANDS) {
  const path = join(root, skill.documentationPath ?? `docs/${skill.bucket}/${skill.name}.md`);
  const expected = render(skill);
  let actual = "";
  try {
    actual = await readFile(path, "utf8");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  const current = actual.slice(0, actual.indexOf("## Output and next steps"))
    + "## Output and next steps\n\n";
  if (current !== expected) {
    if (check) throw new Error(`v3 command documentation is stale: ${skill.name}.`);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, expected);
    updated += 1;
  }
}

console.log(check
  ? `Verified concise v3 documentation for ${PUBLIC_COMMANDS.length} commands.`
  : `Synchronized ${updated} concise v3 command documentation pages.`);
