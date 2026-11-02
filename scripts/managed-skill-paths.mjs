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
  claudeHomeDirectory,
  piHomeDirectory,
  environment = process.env,
  agents = ["codex"],
} = {}) {
  const userHome = normalizedAbsolute(homeDirectory, "User home");
  requireCondition(Array.isArray(agents) && agents.length > 0 && new Set(agents).size === agents.length, "Select distinct managed skill targets.");
  const targetsCodex = agents.includes("codex");
  requireCondition(targetsCodex || codexHomeDirectory === undefined, "A Codex home can only be selected for a Codex transaction.");
  const claudeHome = normalizedAbsolute(agents.includes('claude-code')
    ? claudeHomeDirectory ?? (environment?.CLAUDE_CONFIG_DIR || undefined) ?? join(userHome, '.claude') : join(userHome, '.claude'), 'Claude home');
  const piHome = normalizedAbsolute(agents.includes('pi')
    ? piHomeDirectory ?? (environment?.PI_CODING_AGENT_DIR || undefined) ?? join(userHome, '.pi/agent') : join(userHome, '.pi/agent'), 'Pi home');
  requireCondition(agents.includes('claude-code') || claudeHomeDirectory === undefined, 'A Claude home can only be selected for a Claude transaction.');
  requireCondition(agents.includes('pi') || piHomeDirectory === undefined, 'A Pi home can only be selected for a Pi transaction.');
  const customOther = claudeHome !== join(userHome, '.claude') ? { agent: 'claude-code', home: claudeHome, defaultHome: join(userHome, '.claude') }
    : piHome !== join(userHome, '.pi/agent') ? { agent: 'pi', home: piHome, defaultHome: join(userHome, '.pi/agent') } : null;
  if (customOther) {
    requireCondition(agents.length === 1 && agents[0] === customOther.agent, 'A custom Claude or Pi home requires a single-host transaction.');
    for (const protectedRoot of [userHome, join(userHome, '.codex'), join(userHome, '.agents'),
      join(userHome, '.config/quickstark'), join(userHome, '.local/state/quickstark'), customOther.defaultHome,
      ...(customOther.agent === 'pi' ? [join(userHome, '.claude')] : [join(userHome, '.pi')])]) {
      requireCondition(customOther.home !== protectedRoot && (protectedRoot === userHome ? !userHome.startsWith(customOther.home + sep) : !overlaps(customOther.home, protectedRoot)), 'Custom host home must remain separate from host discovery and updater state.');
    }
  }
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

  if (customOther) {
    const profileIdentity = createHash('sha256').update(customOther.home).digest('hex');
    const configRoot = join(userHome, '.config', 'quickstark', `${customOther.agent}-homes`, profileIdentity);
    const stateRoot = join(userHome, '.local', 'state', 'quickstark', `${customOther.agent}-homes`, profileIdentity);
    return Object.freeze({homeDirectory:userHome,codexHomeDirectory:codexHome,claudeHomeDirectory:claudeHome,piHomeDirectory:piHome,
      customCodexHome:false,customHostHome:true,profileIdentity,selectionPath:join(configRoot,'skills-selection.json'),
      lockPath:join(stateRoot,'skills-update.lock'),transactionRoot:join(stateRoot,'skill-migrations'),backupRoot:join(stateRoot,'skill-migration-backups')});
  }
  if (!custom) {
    return Object.freeze({
      homeDirectory: userHome,
      codexHomeDirectory: codexHome,
      claudeHomeDirectory: claudeHome,
      piHomeDirectory: piHome,
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
    claudeHomeDirectory: claudeHome,
    piHomeDirectory: piHome,
    customCodexHome: true,
    profileIdentity,
    selectionPath: join(configRoot, "skills-selection.json"),
    lockPath: join(stateRoot, "skills-update.lock"),
    transactionRoot: join(stateRoot, "skill-migrations"),
    backupRoot: join(stateRoot, "skill-migration-backups"),
  });
}
