// Release evidence keeps the paths recorded before the flat authoring layout.
// Only use this crosswalk when a historical record refers to a present-day file.
import { readFileSync } from "node:fs";
import { TARGET_PUBLIC_COMMANDS } from "./skill-collection-registry.mjs";

const baseline = JSON.parse(readFileSync(new URL("../tests/fixtures/lean-execution-adoption/baseline.json", import.meta.url), "utf8"));
const recordedRoots = new Map(baseline.commands.map(command => [command.name, command.path]));

export function recordedPublicRoot(name) {
  return recordedRoots.get(name);
}

const relocations = new Map([
  ...TARGET_PUBLIC_COMMANDS.filter(command => recordedRoots.has(command.name))
    .map(command => [recordedPublicRoot(command.name), command.sourcePath]),
  ["skills/internal", "skills/_shared/core"],
  ["skills/advanced", "skills/_shared/advanced"],
  ["skills/frontend", "skills/_shared/frontend"],
  ["skills/pstack", "docs/reference/skills/pstack"],
]);

export function currentSourcePath(recordedPath) {
  if (typeof recordedPath !== "string") return recordedPath;
  for (const [original, current] of relocations) {
    if (recordedPath === original || recordedPath.startsWith(original + "/")) {
      return current + recordedPath.slice(original.length);
    }
  }
  return recordedPath;
}
