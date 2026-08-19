import { basename, dirname, isAbsolute, parse } from "node:path";

export const TEST_FILES = Object.freeze([
  "tests/qs-v3.test.mjs",
  "tests/qs-skills.test.mjs",
  "tests/qs-readout-workbench.test.mjs",
  "tests/qs-readout-observation.test.mjs",
  "tests/qs-report-presentation.test.mjs",
  "tests/qs-readout-visual-artifact.test.mjs",
  "tests/qs-readout-settings.test.mjs",
  "tests/qs-readout-portfolio.test.mjs",
  "tests/ps-skill-catalog.test.mjs",
  "tests/ps-behavior.test.mjs",
  "tests/skill-collection-registry.test.mjs",
  "tests/ps-internal-capabilities.test.mjs",
  "tests/ps-readout.test.mjs",
  "tests/ps-projection-integrity.test.mjs",
  "tests/ps-skills.test.mjs",
  "tests/qs-test-baseline.test.mjs",
]);

const STRIPPED_EXACT_KEYS = new Set(["CODEX_THREAD_ID"]);
const STRIPPED_PREFIXES = ["QS_READOUT_", "QS_PROTOTYPE_", "GIT_"];

export function isStrippedTestEnvironmentKey(key) {
  const normalized = String(key).toUpperCase();
  return STRIPPED_EXACT_KEYS.has(normalized)
    || STRIPPED_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

export function playwrightBrowsersPathFromExecutable(executablePath) {
  if (typeof executablePath !== "string" || !isAbsolute(executablePath)) return null;

  let candidate = dirname(executablePath);
  const filesystemRoot = parse(candidate).root;
  while (candidate !== filesystemRoot) {
    if (/^(?:chromium(?:_headless_shell)?|firefox|webkit|ffmpeg)-\d+$/i.test(basename(candidate))) {
      return dirname(candidate);
    }
    candidate = dirname(candidate);
  }

  return null;
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
    if (!isStrippedTestEnvironmentKey(key) && value !== undefined) {
      environment[key] = value;
    }
  }

  environment.HOME = home;
  environment.USERPROFILE = home;
  environment.XDG_CONFIG_HOME = xdgConfigHome;
  environment.CODEX_HOME = codexHome;

  return environment;
}
