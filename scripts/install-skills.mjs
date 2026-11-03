// Standalone bootstrap: no imports from the checkout that is being updated.
import { execFile, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { lstat, mkdir, mkdtemp, open, readFile, readlink, realpath, rename, unlink } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { pathToFileURL } from 'node:url';

const exec = promisify(execFile);
export const SKILLS_ORIGIN = 'https://github.com/quickstark/skills.git';
const check = (ok, message) => { if (!ok) throw new Error(message); };
const optional = file => lstat(file).catch(error => error.code === 'ENOENT' ? null : Promise.reject(error));
const gitEnvironment = () => ({ ...Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.toUpperCase().startsWith('GIT_'))), GIT_TERMINAL_PROMPT: '0' });
async function git(args, cwd) {
  try { return (await exec('git', ['-c', 'core.hooksPath=/dev/null', '-c', 'core.fsmonitor=false', ...args], { cwd, env: gitEnvironment(), encoding: 'utf8', timeout: 180000, maxBuffer: 4 * 1024 * 1024 })).stdout.trim(); }
  catch { throw new Error(`Installer Git ${args[0]} failed; existing checkouts and backups are retained.`); }
}

// Do not let assume-unchanged or core.filemode hide modifications to executable
// installer code. Compare actual bytes and Git executable bits before loading it.
async function exactCheckout(root, revision) {
  const tree = await git(['ls-tree', '-rz', '--full-tree', revision], root);
  for (const line of tree.split('\0').filter(Boolean)) {
    const entry = line.match(/^(100644|100755|120000) blob ([a-f0-9]{40})\t(.+)$/s);
    if (!entry) return false;
    const file = path.join(root, entry[3]);
    const parent = await realpath(path.dirname(file)).catch(error => {
      if (['ENOENT', 'ENOTDIR', 'EACCES'].includes(error.code)) return null;
      throw error;
    });
    if (parent !== path.dirname(file)) return false;
    const metadata = await optional(file); if (!metadata) return false;
    const bytes = entry[1] === '120000'
      ? metadata.isSymbolicLink() ? Buffer.from(await readlink(file)) : null
      : metadata.isFile() && !metadata.isSymbolicLink() && metadata.nlink === 1 && Boolean(metadata.mode & 0o100) === (entry[1] === '100755') ? await readFile(file) : null;
    if (!bytes || createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex') !== entry[2]) return false;
  }
  return true;
}

async function directory(file) {
  const parent = path.dirname(file);
  if (parent !== file) await directory(parent);
  const stat = await optional(file);
  check(!stat || stat.isDirectory() && !stat.isSymbolicLink(), 'Installer paths must be real directories.');
  if (!stat) await mkdir(file, { mode: 0o700 });
}

async function save(file, value) {
  const temp = `${file}.${process.pid}.tmp`;
  const handle = await open(temp, 'wx', 0o600);
  try { await handle.writeFile(JSON.stringify(value, null, 2) + '\n'); await handle.sync(); } finally { await handle.close(); }
  await rename(temp, file);
  const directory = await open(path.dirname(file), 'r'); try { await directory.sync(); } finally { await directory.close(); }
}

async function acquireInstallerLock(file) {
  try { return await open(file, 'wx', 0o600); }
  catch (error) {
    if (error.code !== 'EEXIST') throw error;
    const before = await lstat(file);
    check(before.isFile() && !before.isSymbolicLink() && before.nlink === 1 && before.size < 4096, 'Unknown installer lock is preserved.');
    const lock = JSON.parse(await readFile(file));
    check(lock.schemaVersion === 1 && Number.isInteger(lock.pid) && lock.pid > 0, 'Unknown installer lock is preserved.');
    let dead = false; try { process.kill(lock.pid, 0); } catch (failure) { dead = failure.code === 'ESRCH'; }
    check(dead, `Another installer owns ${file}; no checkout was replaced.`);
    const after = await lstat(file);
    check(before.ino === after.ino && before.dev === after.dev && before.mtimeMs === after.mtimeMs && before.ctimeMs === after.ctimeMs, 'Installer lock changed; preserve it.');
    await unlink(file);
    return open(file, 'wx', 0o600);
  }
}

export async function waitForValidatedCommit({ revision, fetchImpl = fetch, wait = ms => new Promise(resolve => setTimeout(resolve, ms)), onProgress = () => {}, attempts = 30 } = {}) {
  check(/^[a-f0-9]{40}$/.test(revision), 'Exact published revision required.');
  for (let attempt = 0; attempt < attempts; attempt++) {
    const response = await fetchImpl(`https://api.github.com/repos/quickstark/skills/actions/workflows/validate.yml/runs?branch=main&event=push&head_sha=${revision}&per_page=10`,
      { headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'QuickStark-installer' }, signal: AbortSignal.timeout(30000) });
    check(response.ok, `Cannot verify GitHub validation (HTTP ${response.status}); installed skills are unchanged.`);
    const result = await response.json();
    check(Array.isArray(result.workflow_runs), 'GitHub validation response is unsupported.');
    const runs = result.workflow_runs.filter(run => run.head_sha === revision && run.head_branch === 'main' && run.event === 'push');
    const run = runs.sort((a, b) => b.run_number - a.run_number)[0];
    if (run?.status === 'completed') {
      check(run.conclusion === 'success', `GitHub validation did not pass for ${revision}; installed skills are unchanged.`);
      return { revision, runUrl: run.html_url };
    }
    onProgress(`Waiting for GitHub validation of ${revision.slice(0, 12)}…`);
    if (attempt + 1 < attempts) await wait(30000);
  }
  throw new Error('GitHub validation is still pending; installed skills are unchanged.');
}

async function runNode(file, args, cwd, environment = process.env) {
  const result = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [file, ...args], { cwd, env: environment, stdio: 'inherit' });
    const handlers = ['SIGINT', 'SIGTERM', 'SIGHUP'].map(signal => [signal, () => child.kill(signal)]);
    for (const [signal, handler] of handlers) process.on(signal, handler);
    const cleanup = () => { for (const [signal, handler] of handlers) process.off(signal, handler); };
    child.once('error', error => { cleanup(); reject(error); });
    child.once('close', (code, signal) => { cleanup(); resolve({ code, signal }); });
  });
  check(result.code === 0, `Installer step ${path.basename(file)} failed; preserved checkouts and recovery records remain available.`);
}

export async function prepareSkillsCheckout({ homeDirectory = homedir(), remoteUrl = SKILLS_ORIGIN,
  validateGitHub = waitForValidatedCommit, validateCandidate, useCheckout, onProgress = () => {} } = {}) {
  const home = await realpath(homeDirectory);
  const parent = path.join(home, '.local/share/quickstark');
  const repositoryRoot = path.join(parent, 'skills');
  const state = path.join(home, '.local/state/quickstark/installer');
  await directory(parent); await directory(state);
  const lockPath = path.join(state, 'install.lock');
  const lock = await acquireInstallerLock(lockPath);
  await lock.writeFile(JSON.stringify({ schemaVersion: 1, pid: process.pid })); await lock.sync();
  const ownedLock = await lock.stat();
  let candidate;
  try {
    const ownerPath = path.join(state, 'checkout.json');
    const pendingPath = path.join(state, 'checkout-pending.json');
    const pendingStat = await optional(pendingPath);
    if (pendingStat) {
      check(pendingStat.isFile() && !pendingStat.isSymbolicLink(), 'Installer recovery record must be a regular file.');
      const pending = JSON.parse(await readFile(pendingPath));
      check(pending.repositoryRoot === repositoryRoot && pending.remoteUrl === remoteUrl && path.dirname(pending.backup) === parent && path.basename(pending.backup).startsWith('checkout-backup-'), 'Installer recovery paths are invalid.');
      if (!await optional(repositoryRoot)) await rename(pending.backup, repositoryRoot);
      await unlink(pendingPath);
    }
    const published = await git(['ls-remote', '--exit-code', remoteUrl, 'refs/heads/main'], parent);
    const revision = published.split(/\s+/)[0]; check(/^[a-f0-9]{40}$/.test(revision), 'Published main revision is invalid.');
    onProgress(`Checking GitHub validation for ${revision.slice(0, 12)}…`);
    const validation = await validateGitHub({ revision, onProgress });
    const existing = await optional(repositoryRoot);
    let owner;
    if (existing) {
      check(existing.isDirectory() && !existing.isSymbolicLink(), 'Managed checkout must be a real directory.');
      const owned = await optional(ownerPath);
      check(owned?.isFile() && !owned.isSymbolicLink(), 'An unowned directory occupies the managed checkout; it has been preserved.');
      owner = JSON.parse(await readFile(ownerPath));
      check(owner.repositoryRoot === repositoryRoot && owner.remoteUrl === remoteUrl && await git(['config', '--get', 'remote.origin.url'], repositoryRoot) === remoteUrl, 'Managed checkout ownership differs; preserve it.');
      const head = await git(['rev-parse', 'HEAD'], repositoryRoot);
      const dirty = await git(['status', '--porcelain', '--untracked-files=all', '--ignored=matching'], repositoryRoot);
      if (head === revision && !dirty && await exactCheckout(repositoryRoot, revision)) {
        onProgress('Managed checkout already matches the validated commit.');
        const result = { repositoryRoot, revision, validation, changed: false };
        if (useCheckout) await useCheckout(result);
        return result;
      }
    }
    candidate = await mkdtemp(path.join(parent, '.skills-candidate-'));
    onProgress('Fetching a clean replacement; development checkouts stay untouched…');
    await git(['clone', '--filter=blob:none', '--no-checkout', '--single-branch', '--branch', 'main', remoteUrl, candidate], parent);
    await git(['checkout', '--detach', revision], candidate);
    check(await git(['rev-parse', 'HEAD'], candidate) === revision && !await git(['status', '--porcelain', '--untracked-files=all'], candidate) && await exactCheckout(candidate, revision), 'Candidate differs from the validated commit.');
    onProgress('Validating generated packages and acceptance evidence…');
    if (validateCandidate) await validateCandidate({ repositoryRoot: candidate, revision });
    else {
      await runNode(path.join(candidate, 'scripts/sync-codex-plugin.mjs'), ['--check'], candidate);
      await runNode(path.join(candidate, 'scripts/validate-skill-release.mjs'), [candidate], candidate);
    }
    let backup;
    if (existing) {
      backup = path.join(parent, `checkout-backup-${Date.now()}-${process.pid}`);
      await save(pendingPath, { repositoryRoot, remoteUrl, backup, revision });
      await rename(repositoryRoot, backup);
    }
    try { await rename(candidate, repositoryRoot); candidate = null; }
    catch (error) { if (backup && !await optional(repositoryRoot)) await rename(backup, repositoryRoot); throw error; }
    await save(ownerPath, { schemaVersion: 1, repositoryRoot, remoteUrl, revision, validation, ...(backup ? { backup } : {}) });
    if (await optional(pendingPath)) await unlink(pendingPath);
    onProgress(backup ? `Previous managed checkout retained at ${backup}` : 'Validated managed checkout is ready.');
    const result = { repositoryRoot, revision, validation, changed: true, backup };
    if (useCheckout) await useCheckout(result);
    return result;
  } finally {
    // Failed candidates are retained for inspection; never recursively remove an existing checkout.
    await lock.close(); const actualLock = await lstat(lockPath);
    check(actualLock.ino === ownedLock.ino && actualLock.dev === ownedLock.dev && actualLock.mtimeMs === ownedLock.mtimeMs && actualLock.ctimeMs === ownedLock.ctimeMs, 'Installer lock was replaced; preserve it.');
    await unlink(lockPath);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(await realpath(process.argv[1]).catch(() => path.resolve(process.argv[1]))).href) {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) console.log('QuickStark installer: validates GitHub main, maintains a private clean checkout, then detects and updates harnesses. All update flags are forwarded.');
  else try {
    await prepareSkillsCheckout({ onProgress: text => console.error(text), useCheckout: source =>
      runNode(path.join(source.repositoryRoot, 'scripts/update-skills.mjs'), args, source.repositoryRoot, { ...process.env, QS_REPAIR_MANAGED: '1' }) });
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
