import { isAbsolute } from "node:path";

export const TEST_FILES = Object.freeze([
  "tests/qs-v3.test.mjs",
  "tests/progress-reporting.test.mjs",
  "tests/goal-workflow.test.mjs",
  "tests/deploy-prompt.test.mjs",
  "tests/qs-skills.test.mjs",
  "tests/ps-skill-catalog.test.mjs",
  "tests/ps-behavior.test.mjs",
  "tests/skill-collection-registry.test.mjs",
  "tests/ps-internal-capabilities.test.mjs",
  "tests/ps-projection-integrity.test.mjs",
  "tests/ps-skills.test.mjs",
  "tests/qs-test-baseline.test.mjs",
  "tests/personal-skills.test.mjs",
  "tests/personal-skills-v2.test.mjs",
  "tests/managed-skills.test.mjs",
  "tests/pi-package-projection.test.mjs",
  "tests/skill-selection.test.mjs",
  "tests/managed-skill-selection.test.mjs",
  "tests/upstream-adoption-qs.test.mjs",
  "tests/upstream-adoption-ps.test.mjs",
  "tests/upstream-adoption-routing.test.mjs",
  "tests/skill-provenance.test.mjs",
  "tests/adoption-projection.test.mjs",
  "tests/adoption-acceptance.test.mjs",
  "tests/adoption-behavior.test.mjs",
  "tests/managed-skill-input.test.mjs",
  "tests/managed-skill-migration.test.mjs",
  "tests/skill-transition-packages.test.mjs",
  "tests/advanced-candidates.test.mjs",
  "tests/execution-candidate.test.mjs",
  "tests/frontend-candidate.test.mjs",
  "tests/migration-filesystem.test.mjs",
  "tests/migration-native-packages.test.mjs",
  "tests/migration-owned-paths.test.mjs",
  "tests/migration-transaction.test.mjs",
  "tests/skill-migrations.test.mjs",
  "tests/video-candidate.test.mjs",
  "tests/fixtures/upstream-adoption-efficiency/runner-lock.test.mjs",
]);

const STRIPPED_EXACT_KEYS = new Set(["CODEX_THREAD_ID"]);
const STRIPPED_PREFIXES = ["GIT_"];

export function isStrippedTestEnvironmentKey(key) {
  const normalized = String(key).toUpperCase();
  return STRIPPED_EXACT_KEYS.has(normalized)
    || STRIPPED_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

function assertPrivateRoot(name, value) {
  if (typeof value !== "string" || !isAbsolute(value)) {
    throw new TypeError(`${name} must be an absolute path.`);
  }
}

export function sanitizeTestEnvironment(source, roots) {
  if (!source || typeof source !== "object" || Array.isArray(source)) {
    throw new TypeError("source must be an environment object.");
  }

  const { home, xdgConfigHome, codexHome } = roots ?? {};
  assertPrivateRoot("home", home);
  assertPrivateRoot("xdgConfigHome", xdgConfigHome);
  assertPrivateRoot("codexHome", codexHome);

  const environment = {};
  for (const [key, value] of Object.entries(source)) {
    if (!isStrippedTestEnvironmentKey(key) && value !== undefined) environment[key] = value;
  }

  environment.HOME = home;
  environment.USERPROFILE = home;
  environment.XDG_CONFIG_HOME = xdgConfigHome;
  environment.CODEX_HOME = codexHome;
  return environment;
}
