import { readdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { SKILLS, UPSTREAM_REPOSITORY, UPSTREAM_SKILLS } from "./qs-skill-catalog.mjs";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const apply = process.argv.includes("--apply");

if (!apply) {
  console.error("Usage: node scripts/migrate-qs-skills.mjs --apply");
  process.exitCode = 1;
} else {
  await migrate();
}

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function updateSkillReferences(content) {
  const urls = [];
  let updated = content.replace(/https?:\/\/[^\s)>\]]+/g, (url) => {
    urls.push(url);
    return `\u0000QS_URL_${urls.length - 1}\u0000`;
  });

  for (const skill of [...UPSTREAM_SKILLS].sort(
    (left, right) => right.upstreamName.length - left.upstreamName.length,
  )) {
    const oldName = escapeRegExp(skill.upstreamName);
    updated = updated
      .replace(
        new RegExp(`(?<![A-Za-z0-9_-])\\/${oldName}(?![A-Za-z0-9_-])`, "g"),
        `/${skill.name}`,
      )
      .replace(new RegExp(`\`${oldName}\``, "g"), `\`${skill.name}\``)
      .replace(new RegExp(`\\[${oldName}\\]`, "g"), `[${skill.name}]`)
      .replace(
        new RegExp(`(--skill=|skills update\\s+)${oldName}(?![A-Za-z0-9_-])`, "g"),
        `$1${skill.name}`,
      );
  }

  return updated.replace(/\u0000QS_URL_(\d+)\u0000/g, (_, index) => urls[index]);
}

async function markdownFiles(directory) {
  const files = [];

  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await markdownFiles(path)));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(path);
    }
  }

  return files;
}

function renderMetadata(skill) {
  const quote = (value) => JSON.stringify(value);
  const lines = [
    "interface:",
    `  display_name: ${quote(skill.displayName)}`,
    `  short_description: ${quote(skill.shortDescription)}`,
    `  default_prompt: ${quote(`Use $${skill.name} to ${skill.prompt}.`)}`,
  ];

  if (skill.userInvoked) {
    lines.push("policy:", "  allow_implicit_invocation: false");
  }

  return `${lines.join("\n")}\n`;
}

function updateDocumentation(content, skill) {
  const upstreamSource = `${UPSTREAM_REPOSITORY}/tree/main/skills/${skill.bucket}/${skill.upstreamName}`;
  const quickstart = [
    "Quickstart:",
    "",
    "```bash",
    "codex plugin marketplace add ./codex",
    "codex plugin add qs-skills@quickstark",
    "```",
    "",
    `[Source](${upstreamSource})`,
    "",
    "",
  ].join("\n");

  return updateSkillReferences(content).replace(
    /^Quickstart:\s*\n[\s\S]*?^\[Source\]\([^\n]+\)[\t ]*\r?\n[\t\r\n ]*/m,
    quickstart,
  );
}

async function migrate() {
  for (const skill of UPSTREAM_SKILLS) {
    const original = join(repositoryRoot, "skills", skill.bucket, skill.upstreamName);
    const destination = join(repositoryRoot, "skills", skill.bucket, skill.name);
    const oldExists = await exists(original);
    const newExists = await exists(destination);

    if (oldExists && newExists) {
      throw new Error(`Both skill directories exist; refusing to overwrite: ${skill.upstreamName}`);
    }

    if (!oldExists && !newExists) {
      throw new Error(`Missing original and renamed skill: ${skill.upstreamName}`);
    }

    const originalDoc = join(repositoryRoot, "docs", skill.bucket, `${skill.upstreamName}.md`);
    const destinationDoc = join(repositoryRoot, "docs", skill.bucket, `${skill.name}.md`);
    const oldDocExists = await exists(originalDoc);
    const newDocExists = await exists(destinationDoc);

    if (oldDocExists && newDocExists) {
      throw new Error(`Both documentation pages exist; refusing to overwrite: ${skill.upstreamName}`);
    }

    if (!oldDocExists && !newDocExists) {
      throw new Error(`Missing original and renamed docs: ${skill.upstreamName}`);
    }
  }

  for (const skill of UPSTREAM_SKILLS) {
    const original = join(repositoryRoot, "skills", skill.bucket, skill.upstreamName);
    const destination = join(repositoryRoot, "skills", skill.bucket, skill.name);
    if (await exists(original)) await rename(original, destination);

    const originalDoc = join(repositoryRoot, "docs", skill.bucket, `${skill.upstreamName}.md`);
    const destinationDoc = join(repositoryRoot, "docs", skill.bucket, `${skill.name}.md`);
    if (await exists(originalDoc)) await rename(originalDoc, destinationDoc);
  }

  for (const skill of SKILLS) {
    const directory = join(repositoryRoot, "skills", skill.bucket, skill.name);
    const skillFile = join(directory, "SKILL.md");
    let content = updateSkillReferences(await readFile(skillFile, "utf8"));

    if (skill.upstreamName !== null) {
      content = content.replace(
        new RegExp(`^name:\\s*${escapeRegExp(skill.upstreamName)}\\s*$`, "m"),
        `name: ${skill.name}`,
      );
    }

    content = content.replace(/^# .+$/m, `# ${skill.displayName}`);
    await writeFile(skillFile, content);

    for (const file of await markdownFiles(directory)) {
      if (file === skillFile) continue;
      const previous = await readFile(file, "utf8");
      const updated = updateSkillReferences(previous);
      if (updated !== previous) await writeFile(file, updated);
    }

    await writeFile(join(directory, "agents", "openai.yaml"), renderMetadata(skill));

    if (skill.upstreamName !== null) {
      const doc = join(repositoryRoot, "docs", skill.bucket, `${skill.name}.md`);
      const previous = await readFile(doc, "utf8");
      const updated = updateDocumentation(previous, skill);
      if (updated !== previous) await writeFile(doc, updated);
    }
  }

  console.log(`Migrated ${UPSTREAM_SKILLS.length} upstream skills into ${SKILLS.length} namespaced QuickStark skills.`);
}
