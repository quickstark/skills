// Release evidence keeps the paths recorded before the flat authoring layout.
// Only use this crosswalk when a historical record refers to a present-day file.
import { readFileSync } from "node:fs";
import { TARGET_PUBLIC_COMMANDS } from "./skill-collection-registry.mjs";

const baseline = JSON.parse(readFileSync(new URL("../../tests/fixtures/lean-execution-adoption/baseline.json", import.meta.url), "utf8"));
const recordedRoots = new Map(baseline.commands.map(command => [command.name, command.path]));

export function recordedPublicRoot(name) {
  return recordedRoots.get(name);
}

const relocations = new Map([
  ["config/skill-migrations.json", "tooling/install/skill-migrations.json"],
  ["config/skill-profiles.json", "tooling/install/skill-profiles.json"],
  ["config/skill-provenance.json", "tooling/catalog/skill-provenance.json"],
  ["scripts/adoption-acceptance.mjs", "tooling/verification/adoption-acceptance.mjs"],
  ["scripts/advanced-skill-catalog.mjs", "tooling/catalog/advanced-skill-catalog.mjs"],
  ["scripts/claude-core-migration.mjs", "tooling/install/claude-core-migration.mjs"],
  ["scripts/clean-install-skills.mjs", "tooling/install/clean-install-skills.mjs"],
  ["scripts/execution-skill-catalog.mjs", "tooling/catalog/execution-skill-catalog.mjs"],
  ["scripts/frontend-skill-catalog.mjs", "tooling/catalog/frontend-skill-catalog.mjs"],
  ["scripts/managed-marketplace-bootstrap.mjs", "tooling/install/managed-marketplace-bootstrap.mjs"],
  ["scripts/managed-package-repair.mjs", "tooling/install/managed-package-repair.mjs"],
  ["scripts/managed-skill-input.mjs", "tooling/install/managed-skill-input.mjs"],
  ["scripts/managed-skill-migration.mjs", "tooling/install/managed-skill-migration.mjs"],
  ["scripts/managed-skill-paths.mjs", "tooling/install/managed-skill-paths.mjs"],
  ["scripts/managed-skills.mjs", "tooling/install/managed-skills.mjs"],
  ["scripts/migration-filesystem.mjs", "tooling/install/migration-filesystem.mjs"],
  ["scripts/migration-native-packages.mjs", "tooling/install/migration-native-packages.mjs"],
  ["scripts/migration-owned-paths.mjs", "tooling/install/migration-owned-paths.mjs"],
  ["scripts/migration-transaction.mjs", "tooling/install/migration-transaction.mjs"],
  ["scripts/optional-command-definition.mjs", "tooling/catalog/optional-command-definition.mjs"],
  ["scripts/ps-skill-catalog.mjs", "tooling/catalog/ps-skill-catalog.mjs"],
  ["scripts/qs-skill-catalog.mjs", "tooling/catalog/qs-skill-catalog.mjs"],
  ["scripts/qs-test-environment.mjs", "tooling/verification/qs-test-environment.mjs"],
  ["scripts/skill-collection-registry.mjs", "tooling/catalog/skill-collection-registry.mjs"],
  ["scripts/skill-migrations.mjs", "tooling/install/skill-migrations.mjs"],
  ["scripts/skill-selection.mjs", "tooling/install/skill-selection.mjs"],
  ["scripts/update-skills.mjs", "tooling/install/update-skills.mjs"],
  ["scripts/validate-skill-release.mjs", "tooling/release/validate-skill-release.mjs"],
  ["scripts/video-skill-catalog.mjs", "tooling/catalog/video-skill-catalog.mjs"],
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
