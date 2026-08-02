import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { SKILLS, V3_INTERNAL_CAPABILITIES } from "./qs-skill-catalog.mjs";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export function validatePublicSkillText(text, name) {
  if (!text.includes("## Completion report and next steps")) {
    throw new Error(`/${name} is missing the shared completion contract.`);
  }

  const internalNames = V3_INTERNAL_CAPABILITIES.map((capability) => capability.legacySkillName);
  for (const legacyName of internalNames) {
    if (new RegExp(`(?:/|\\$)${legacyName}\\b`).test(text)) {
      throw new Error(`/${name} exposes internal capability ${legacyName} as a command.`);
    }
  }

  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line || /(?:do not|never|without)\s+(?:automatically\s+)?(?:invoke|run|execute|start|use)/i.test(line)) {
      continue;
    }
    if (/(?:once done|after(?:wards)?|then|next),?\s+(?:automatically\s+)?(?:invoke|run|execute|start|use)\s+(?:\/|\$)qs-/i.test(line)) {
      throw new Error(`/${name} contains an automatic public-skill hop: ${line}`);
    }
  }

  return true;
}

export async function validateV3Skills() {
  for (const skill of SKILLS) {
    const text = await readFile(
      join(repositoryRoot, "skills", skill.bucket, skill.name, "SKILL.md"),
      "utf8",
    );
    validatePublicSkillText(text, skill.name);
  }
  return true;
}

const invokedDirectly = process.argv[1] !== undefined
  && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (invokedDirectly) {
  await validateV3Skills();
  console.log(`Verified ${SKILLS.length} bounded v3 public skill contracts.`);
}
