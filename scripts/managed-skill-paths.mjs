import { createHash } from "node:crypto";
import { isAbsolute, join, normalize, parse, resolve, sep } from "node:path";

function requireCondition(condition, message) {
  if (!condition) throw new Error(message);
}

function normalizedAbsolute(value, label) {
  requireCondition(typeof value === "string" && value.length > 0 && !/[\u0000-\u001f\u007f]/.test(value), `${label} must be a non-empty path.`);
  const absolute = resolve(value);
  requireCondition(isAbsolute(absolute) && normalize(absolute) === absolute && absolute !== parse(absolute).root, `${label} must resolve to a safe non-root path.`);
  return absolute;
}

function overlaps(first, second) {
  return first === second || first.startsWith(`${second}${sep}`) || second.startsWith(`${first}${sep}`);
}

export function resolveManagedSkillPaths({
  homeDirectory,
  codexHomeDirectory,
  environment = process.env,
  agents = ["codex"],
} = {}) {
  const userHome = normalizedAbsolute(homeDirectory, "User home");
  requireCondition(Array.isArray(agents) && agents.length > 0 && new Set(agents).size === agents.length, "Select distinct managed skill targets.");
  const targetsCodex = agents.includes("codex");
  requireCondition(targetsCodex || codexHomeDirectory === undefined, "A Codex home can only be selected for a Codex transaction.");
  const inherited = environment?.CODEX_HOME;
  const selected = targetsCodex
    ? codexHomeDirectory ?? (typeof inherited === "string" && inherited.length > 0 ? inherited : join(userHome, ".codex"))
    : join(userHome, ".codex");
  const codexHome = normalizedAbsolute(selected, "Codex home");
  requireCondition(codexHome !== userHome, "Codex home must not be the user home.");

  const defaultCodexHome = join(userHome, ".codex");
  const custom = codexHome !== defaultCodexHome;
  requireCondition(!custom || agents.length === 1 && agents[0] === "codex", "A custom Codex home currently requires a Codex-only transaction.");
  if (custom) {
    requireCondition(!overlaps(codexHome, defaultCodexHome), "A custom Codex home must remain separate from the default Codex home.");
    for (const root of [join(userHome, ".agents"), join(userHome, ".claude"), join(userHome, ".pi"),
      join(userHome, ".config", "quickstark"), join(userHome, ".local", "state", "quickstark")]) {
      requireCondition(!overlaps(codexHome, root), "A custom Codex home must remain separate from QuickStark updater state.");
    }
  }

  if (!custom) {
    return Object.freeze({
      homeDirectory: userHome,
      codexHomeDirectory: codexHome,
      customCodexHome: false,
      profileIdentity: null,
      selectionPath: join(userHome, ".config", "quickstark", "skills-selection.json"),
      lockPath: join(userHome, ".quickstark-skills-update.lock"),
      transactionRoot: join(userHome, ".local", "state", "quickstark", "skill-migrations"),
      backupRoot: join(userHome, ".local", "state", "quickstark", "skill-migration-backups"),
    });
  }

  const profileIdentity = createHash("sha256").update(codexHome).digest("hex");
  const configRoot = join(userHome, ".config", "quickstark", "codex-homes", profileIdentity);
  const stateRoot = join(userHome, ".local", "state", "quickstark", "codex-homes", profileIdentity);
  return Object.freeze({
    homeDirectory: userHome,
    codexHomeDirectory: codexHome,
    customCodexHome: true,
    profileIdentity,
    selectionPath: join(configRoot, "skills-selection.json"),
    lockPath: join(stateRoot, "skills-update.lock"),
    transactionRoot: join(stateRoot, "skill-migrations"),
    backupRoot: join(stateRoot, "skill-migration-backups"),
  });
}
