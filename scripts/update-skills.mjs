import { constants } from 'node:fs';
import { access, stat, realpath } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile } from 'node:fs/promises';
import { exactCheckout } from './install-skills.mjs';
import { executeManagedSkills, normalizeManagedAgents, parseManagedSkillsArguments } from './managed-skills.mjs';
import { resolveManagedSkillPaths } from './managed-skill-paths.mjs';
import { readMigrationJournal } from './migration-transaction.mjs';
import { cleanInstallSkills } from './clean-install-skills.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const commands = { codex: 'codex', 'claude-code': 'claude', pi: 'pi' };
const labels = { codex: 'Codex', 'claude-code': 'Claude Code', pi: 'Pi' };
const check = (condition, message) => { if (!condition) throw new Error(message); };
const exec = promisify(execFile);

export function parseReleaseContext(arguments_) {
  const flags = [...arguments_]; const index = flags.indexOf('--release');
  if (index === -1) return { flags, release: null };
  const match = flags[index + 1]?.match(/^v((?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*))@([a-f0-9]{40})$/);
  check(match, 'A release requires vMAJOR.MINOR.PATCH@COMMIT.');
  flags.splice(index, 2); check(!flags.includes('--release'), 'Choose one release.');
  return { flags, release: { tag: `v${match[1]}`, version: match[1], revision: match[2] } };
}

/** A published checkout is pinned to its tag, independently of moving main. */
export async function verifyPublishedReleaseFreshness({ repositoryRoot, release, runGit } = {}) {
  check(release && /^v(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)$/.test(release.tag) && release.tag === `v${release.version}` && /^[a-f0-9]{40}$/.test(release.revision), 'Invalid published release context.');
  const git = runGit ?? (async args => (await exec('git', ['-c', 'core.hooksPath=/dev/null', '-c', 'core.fsmonitor=false', ...args], { cwd: repositoryRoot, encoding: 'utf8', timeout: 30000, maxBuffer: 4 * 1024 * 1024,
    env: { ...Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.toUpperCase().startsWith('GIT_'))), GIT_TERMINAL_PROMPT: '0' } })).stdout.trim());
  const origin = await git(['config', '--get', 'remote.origin.url']);
  check(['https://github.com/quickstark/skills.git', 'https://github.com/quickstark/skills'].includes(origin), 'Published releases require the official QuickStark origin.');
  const head = await git(['rev-parse', 'HEAD']);
  check(head === release.revision && !await git(['status', '--porcelain', '--untracked-files=all']), 'Published checkout changed; preserve it before retrying.');
  const refs = await git(['ls-remote', '--exit-code', 'origin', `refs/tags/${release.tag}`, `refs/tags/${release.tag}^{}`]);
  const entries = new Map(refs.split('\n').map(line => line.split(/\s+/)) .map(([sha, ref]) => [ref, sha]));
  check((entries.get(`refs/tags/${release.tag}^{}`) ?? entries.get(`refs/tags/${release.tag}`)) === head, 'Published release tag changed; installed skills are unchanged.');
  check(JSON.parse(await readFile(path.join(repositoryRoot, 'package.json'))).version === release.version && await exactCheckout(repositoryRoot, head), 'Published version or checkout bytes changed.');
  return { head, releaseTag: release.tag, version: release.version };
}

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

export async function updateInstalledHarnesses({ arguments_: flags = [], release = null, repositoryRoot = root, homeDirectory = homedir(), environment = process.env,
  detect = detectInstalledHarnesses, execute, readJournal = readMigrationJournal, onProgress = () => {}, ...execution } = {}) {
  const options = parseManagedSkillsArguments(['update', ...flags]);
  const legacy = Boolean(options.resume || options.manifestPath || execution.repairManagedPackages === true);
  execute ??= legacy ? executeManagedSkills : cleanInstallSkills;
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
  if (!legacy) groups = agents.map(agent => [agent]);
  else if (explicitAgents || options.resume) groups = [agents];
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
    const selected = { repairManagedPackages: environment.QS_REPAIR_MANAGED === '1', ...execution, ...options, repositoryRoot, homeDirectory, environment, agents: group, bootstrapMarketplaces: true };
    if (release) selected.verifyRepositoryFreshness = options => verifyPublishedReleaseFreshness({ ...options, release });
    for (const [agent, field] of [['codex','codexHomeDirectory'],['claude-code','claudeHomeDirectory'],['pi','piHomeDirectory']]) if (!group.includes(agent)) delete selected[field];
    try {
      const homes = resolveManagedSkillPaths(selected);
      onProgress({ agents: group, homes });
      const result = await execute(selected);
      results.push({ agents: group, ...result });
      if (legacy && result.status !== 'complete') break;
    } catch (error) {
      results.push({ agents: group, status: 'failed', error: error.message,
        ...(error.marketplaceActions?.length ? { marketplaceActions: error.marketplaceActions } : {}),
        ...(error.repairJournalPath ? { repairJournalPath: error.repairJournalPath } : {}),
        ...(error.cleanBackupRoot ? { backupRoot: error.cleanBackupRoot } : {}) });
      if (legacy) break;
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
    if (item.repairJournalPath) lines.push(`Retained original state: ${item.repairJournalPath}`);
    if (item.backupRoot) lines.push(`QuickStark originals: ${item.backupRoot}`);
  }
  if (result.pendingAgents.length) lines.push(`Not attempted: ${result.pendingAgents.map(agent => labels[agent]).join(', ')}.`);
  if (result.status === 'complete') lines.push('Restart the updated clients or start fresh sessions to load the skills.');
  return lines.join('\n');
}

if (process.argv[1] && import.meta.url === pathToFileURL(await realpath(process.argv[1]).catch(() => path.resolve(process.argv[1]))).href) {
  const flags = process.argv.slice(2);
  if (flags.includes('--help') || flags.includes('-h')) {
    process.stdout.write('Usage: npm run skills:update -- [--agent codex|claude|pi] [--with PACKAGE] [--json]\n\nClean-reinstall QuickStark packages independently for each detected client (core on a fresh host).\nKeep saved package choices, unrelated plugins and settings. Rerun the same command after an interrupted install.\nProfiles: --home, --codex-home, --claude-home, --pi-home. Explicit legacy recovery: --resume JOURNAL.\n');
  } else {
    const json = flags.includes('--json');
    try {
      const context = parseReleaseContext(flags);
      const result = await updateInstalledHarnesses({ arguments_: context.flags, release: context.release, onProgress: ({ agents }) => {
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
