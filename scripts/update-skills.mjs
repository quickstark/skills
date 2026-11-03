import { constants } from 'node:fs';
import { access, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { executeManagedSkills, normalizeManagedAgents, parseManagedSkillsArguments } from './managed-skills.mjs';
import { resolveManagedSkillPaths } from './managed-skill-paths.mjs';
import { readMigrationJournal } from './migration-transaction.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const commands = { codex: 'codex', 'claude-code': 'claude', pi: 'pi' };
const labels = { codex: 'Codex', 'claude-code': 'Claude Code', pi: 'Pi' };
const check = (condition, message) => { if (!condition) throw new Error(message); };

export async function detectInstalledHarnesses({ environment = process.env } = {}) {
  const agents = [];
  for (const [agent, command] of Object.entries(commands)) {
    for (const directory of (environment.PATH ?? '').split(path.delimiter)) {
      const executable = path.resolve(directory || '.', command);
      try {
        await access(executable, constants.X_OK);
        if (!(await stat(executable)).isFile()) continue;
        agents.push(agent); break;
      } catch (error) {
        if (!['ENOENT', 'EACCES', 'ENOTDIR'].includes(error.code)) throw error;
      }
    }
  }
  return agents;
}

export async function updateInstalledHarnesses({ arguments_: flags = [], repositoryRoot = root, homeDirectory = homedir(), environment = process.env,
  detect = detectInstalledHarnesses, execute = executeManagedSkills, readJournal = readMigrationJournal, onProgress = () => {}, ...execution } = {}) {
  const options = parseManagedSkillsArguments(['update', ...flags]);
  const explicitAgents = flags.some(flag => flag === '--agent' || flag === '--target');
  homeDirectory = options.homeDirectory ?? homeDirectory;
  const explicitHomes = [['codex', 'codexHomeDirectory'], ['claude-code', 'claudeHomeDirectory'], ['pi', 'piHomeDirectory']].filter(([, field]) => options[field]);
  let agents;
  if (explicitAgents) agents = options.agents;
  else if (options.resume) {
    const journal = await readJournal(options.resume);
    check(journal?.plan?.controlPlane?.nativeOptions, 'Resume journal has no frozen native targets.');
    agents = normalizeManagedAgents(Object.keys(journal.plan.controlPlane.nativeOptions));
  } else if (explicitHomes.length) agents = explicitHomes.map(([agent]) => agent);
  else agents = await detect({ environment });
  check(agents.length > 0, 'No supported harness found on PATH. Install or expose Codex, Claude Code, or Pi, then rerun skills:update.');
  check(explicitHomes.every(([agent]) => agents.includes(agent)), 'A configuration home was supplied for an unselected harness.');
  let groups;
  if (explicitAgents || options.resume) groups = [agents];
  else {
    const defaults = []; const custom = [];
    for (const agent of agents) {
      const selected = { ...options, agents: [agent], homeDirectory, environment };
      for (const [other, field] of [['codex','codexHomeDirectory'],['claude-code','claudeHomeDirectory'],['pi','piHomeDirectory']]) if (other !== agent) delete selected[field];
      const paths = resolveManagedSkillPaths(selected);
      (paths.customCodexHome || paths.customHostHome ? custom : defaults).push(agent);
    }
    groups = [...(defaults.length ? [defaults] : []), ...custom.map(agent => [agent])];
  }
  const results = [];
  for (const group of groups) {
    const selected = { ...execution, ...options, repositoryRoot, homeDirectory, environment, agents: group, bootstrapMarketplaces: true };
    for (const [agent, field] of [['codex','codexHomeDirectory'],['claude-code','claudeHomeDirectory'],['pi','piHomeDirectory']]) if (!group.includes(agent)) delete selected[field];
    // Validate profiles before touching managers; resume remains one frozen call.
    const homes = resolveManagedSkillPaths(selected);
    onProgress({ agents: group, homes });
    try {
      const result = await execute(selected);
      results.push({ agents: group, ...result });
      if (result.status !== 'complete') break;
    } catch (error) {
      results.push({ agents: group, status: 'failed', error: error.message,
        ...(error.marketplaceActions?.length ? { marketplaceActions: error.marketplaceActions } : {}) }); break;
    }
  }
  const completed = results.flatMap(result => result.agents);
  return { action: 'update', status: results.every(result => result.status === 'complete') && completed.length === agents.length ? 'complete' : 'failed',
    agents, results, pendingAgents: agents.filter(agent => !completed.includes(agent)) };
}

export function formatUpdateResult(result) {
  const lines = [];
  for (const item of result.results) {
    for (const agent of item.agents) {
      const count = item.targets?.[agent]?.desired?.packages?.length;
      lines.push(`${labels[agent]}: ${item.status === 'complete' ? `updated and verified${count ? ` (${count} packages)` : ''}` : 'failed'}.`);
    }
    if (item.error) lines.push(item.error);
    for (const action of item.marketplaceActions ?? []) lines.push(`${labels[action.agent]} marketplace: ${action.status === 'registered' ? 'registered' : 'registration attempted; inspect current state'} at ${action.root}.`);
    if (item.status !== 'complete' && item.journalPath) lines.push(`Recovery journal: ${item.journalPath}`);
  }
  if (result.pendingAgents.length) lines.push(`Not attempted: ${result.pendingAgents.map(agent => labels[agent]).join(', ')}.`);
  if (result.status === 'complete') lines.push('Restart the updated clients or start fresh sessions to load the skills.');
  return lines.join('\n');
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const flags = process.argv.slice(2);
  if (flags.includes('--help') || flags.includes('-h')) {
    process.stdout.write('Usage: npm run skills:update -- [--agent codex|claude|pi] [--with PACKAGE] [--json]\n\nWith no --agent, detect harnesses on PATH and update their saved selection (core on a fresh host).\nAbsent, unused local marketplaces are registered automatically. Conflicting sources are preserved.\nProfiles: --home, --codex-home, --claude-home, --pi-home. Recovery: --resume JOURNAL.\n');
  } else {
    const json = flags.includes('--json');
    try {
      const result = await updateInstalledHarnesses({ arguments_: flags, onProgress: ({ agents }) => {
        if (!json) process.stdout.write(`Updating ${agents.map(agent => labels[agent]).join(', ')}…\n`);
      } });
      process.stdout.write(`${json ? JSON.stringify(result) : formatUpdateResult(result)}\n`);
      if (result.status !== 'complete') process.exitCode = 1;
    } catch (error) {
      process.stderr.write(`${json ? JSON.stringify({ action: 'update', status: 'failed', error: error.message }) : `Skills update failed: ${error.message}`}\n`);
      process.exitCode = 1;
    }
  }
}
