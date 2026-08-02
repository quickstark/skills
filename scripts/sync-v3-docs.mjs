import { readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { SKILLS, UPSTREAM_REPOSITORY } from "./qs-skill-catalog.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const check = process.argv.includes("--check");

function render(skill) {
  const packageName = skill.distribution === "core" ? "qs-skills" : "qs-specialists";
  const install = skill.distribution === "core"
    ? "codex plugin add qs-skills@quickstark"
    : "codex plugin add qs-specialists@quickstark";
  const source = `https://github.com/quickstark/skills/blob/main/skills/${skill.bucket}/${skill.name}/SKILL.md`;
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
    `\`/${skill.name}\` ${skill.shortDescription[0].toLowerCase()}${skill.shortDescription.slice(1)}. Its detailed scope and safety behavior live in the canonical [skill instructions](../../skills/${skill.bucket}/${skill.name}/SKILL.md).`,
    "",
    "## When to reach for it",
    "",
    `Use \`/${skill.name}\` when the requested primary outcome is: ${skill.prompt}. Choose another root command when that would be only an intermediate technique.`,
    "",
    "## Where it fits",
    "",
    `This is lifecycle position ${skill.lifecycle.position} in the ${skill.distribution} projection and is installed through \`${packageName}\`. It owns one bounded root run and never starts another public skill automatically.`,
    "",
    "## Output and next steps",
    "",
    "",
  ].join("\n");
}

let updated = 0;
for (const skill of SKILLS) {
  const path = join(root, "docs", skill.bucket, `${skill.name}.md`);
  const expected = render(skill);
  const actual = await readFile(path, "utf8");
  const current = actual.slice(0, actual.indexOf("## Output and next steps"))
    + "## Output and next steps\n\n";
  if (current !== expected) {
    if (check) throw new Error(`v3 command documentation is stale: ${skill.name}.`);
    await writeFile(path, expected);
    updated += 1;
  }
}

console.log(check
  ? `Verified concise v3 documentation for ${SKILLS.length} commands.`
  : `Synchronized ${updated} concise v3 command documentation pages.`);
