// Standalone bootstrap: no imports from the checkout that is being updated.
import { execFile, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { lstat, mkdir, mkdtemp, open, readFile, readlink, realpath, rename, symlink, unlink } from 'node:fs/promises';
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
export async function exactCheckout(root, revision) {
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

export function compareVersions(left, right) {
  const parts = value => {
    check(/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(value), 'An exact stable version is required.');
    return value.split('.').map(BigInt);
  };
  const a = parts(left), b = parts(right);
  for (let index = 0; index < 3; index++) if (a[index] !== b[index]) return a[index] > b[index] ? 1 : -1;
  return 0;
}

export async function resolvePublishedVersion({ remoteUrl = SKILLS_ORIGIN, cwd, version = null } = {}) {
  if (version !== null) compareVersions(version, version);
  const output = await git(['ls-remote', '--tags', remoteUrl, 'refs/tags/v*'], cwd);
  const tags = new Map();
  for (const line of output.split('\n')) {
    const match = line.match(/^([a-f0-9]{40})\s+refs\/tags\/v((?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*))(\^\{\})?$/);
    if (!match || version !== null && match[2] !== version) continue;
    const record = tags.get(match[2]) ?? { version: match[2], tag: `v${match[2]}` };
    record[match[3] ? 'peeled' : 'object'] = match[1]; tags.set(match[2], record);
  }
  const selected = [...tags.values()].sort((a, b) => compareVersions(b.version, a.version))[0];
  check(selected?.object, 'No published stable version tag is available; installed skills are unchanged.');
  return { tag: selected.tag, version: selected.version, revision: selected.peeled ?? selected.object };
}

async function runNode(file, args, cwd, environment = gitEnvironment()) {
  const result = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [file, ...args], { cwd, env: environment, stdio: 'inherit' });
    const handlers = ['SIGINT', 'SIGTERM', 'SIGHUP'].map(signal => [signal, () => child.kill(signal)]);
    for (const [signal, handler] of handlers) process.on(signal, handler);
    const cleanup = () => { for (const [signal, handler] of handlers) process.off(signal, handler); };
    child.once('error', error => { cleanup(); reject(error); });
    child.once('close', (code, signal) => { cleanup(); resolve({ code, signal }); });
  });
  check(result.code === 0, `Installer step ${path.basename(file)} failed; retained source checkouts and recovery records remain available.`);
}

export async function prepareSkillsCheckout({ homeDirectory = homedir(), remoteUrl = SKILLS_ORIGIN,
  resolveRelease = resolvePublishedVersion, version = null, resume = null, validateCandidate, useCheckout, onProgress = () => {} } = {}) {
  const home = await realpath(homeDirectory);
  const parent = path.join(home, '.local/share/quickstark');
  const sources = path.join(parent, 'releases');
  const current = path.join(parent, 'current');
  const state = path.join(home, '.local/state/quickstark/installer');
  await directory(sources); await directory(state);
  const lockPath = path.join(state, 'install.lock');
  const lock = await acquireInstallerLock(lockPath);
  await lock.writeFile(JSON.stringify({ schemaVersion: 1, pid: process.pid })); await lock.sync();
  const ownedLock = await lock.stat();
  try {
    const ownerPath = path.join(state, 'checkout.json');
    // Recover only the previous installer's recorded source swap. Its legacy
    // checkout otherwise stays untouched, including journals referring to it.
    const pendingPath = path.join(state, 'checkout-pending.json');
    const pendingStat = await optional(pendingPath);
    if (pendingStat) {
      check(pendingStat.isFile() && !pendingStat.isSymbolicLink(), 'Installer recovery record must be a regular file.');
      const pending = JSON.parse(await readFile(pendingPath));
      check(pending.repositoryRoot === path.join(parent, 'skills') && pending.remoteUrl === remoteUrl && path.dirname(pending.backup) === parent && path.basename(pending.backup).startsWith('checkout-backup-'), 'Installer recovery paths are invalid.');
      if (!await optional(pending.repositoryRoot)) await rename(pending.backup, pending.repositoryRoot);
      await unlink(pendingPath);
    }
    const owned = await optional(ownerPath);
    let owner = null;
    if (owned) {
      check(owned.isFile() && !owned.isSymbolicLink() && owned.nlink === 1 && owned.size <= 4 * 1024 * 1024, 'Installer ownership record must be a bounded regular file.');
      owner = JSON.parse(await readFile(ownerPath));
      check([1, 2].includes(owner.schemaVersion) && owner.remoteUrl === remoteUrl, 'Managed checkout ownership differs; preserve it.');
    }
    const records = owner?.schemaVersion === 2 ? owner.releases : [];
    check(Array.isArray(records) && records.length <= 1024 && records.every(entry => path.dirname(entry.repositoryRoot) === sources && /^[a-f0-9]{40}$/.test(entry.revision) && entry.tag === `v${entry.version}`), 'Versioned source ownership record is invalid.');
    const pointer = await optional(current);
    const linked = pointer?.isSymbolicLink() ? await readlink(current) : null;
    check(!pointer || pointer.isSymbolicLink() && records.some(entry => entry.repositoryRoot === linked), 'An unowned current path has been preserved.');
    let original = null;
    if (resume) {
      check(!version, 'Resume uses its original version; omit --version.');
      const metadata = await lstat(resume);
      check(metadata.isFile() && !metadata.isSymbolicLink() && metadata.nlink === 1 && metadata.size <= 16 * 1024 * 1024, 'Resume journal must be a bounded regular file.');
      // This header only chooses an already-owned source. The coordinator checks
      // the complete journal hash chain and profile before any native effects.
      const first = JSON.parse((await readFile(resume, 'utf8')).split('\n', 1)[0]);
      const plan = first.kind === 'begin' ? first.data?.plan : null;
      const roots = [...new Set(Object.values(plan?.controlPlane?.nativeOptions ?? {}).map(entry => entry.cwd))];
      const matches = records.filter(entry => entry.revision === plan?.revision && (!roots.length || roots.length === 1 && entry.repositoryRoot === roots[0]));
      check(matches.length === 1, 'Resume requires its original recorded versioned checkout; preserve the journal and legacy source for explicit recovery.');
      original = matches[0]; version = original.version;
    }
    onProgress('Checking published QuickStark versions…');
    const release = await resolveRelease({ remoteUrl, cwd: parent, version });
    const { revision } = release;
    check(/^v\d+\.\d+\.\d+$/.test(release.tag) && release.tag === `v${release.version}` && /^[a-f0-9]{40}$/.test(revision), 'Published version metadata is invalid.');
    const previous = records.filter(entry => entry.version === release.version);
    check(previous.every(entry => entry.revision === revision), 'The same version has a changed tag or source revision; publish a new version instead.');
    check(resume || records.every(entry => compareVersions(release.version, entry.version) >= 0), 'Refusing an automatic version downgrade; installed skills are unchanged.');
    if (owner?.schemaVersion === 1) {
      const legacy = owner.repositoryRoot;
      check(legacy === path.join(parent, 'skills') && /^[a-f0-9]{40}$/.test(owner.revision), 'Legacy source ownership is invalid; preserve it for explicit recovery.');
      const metadata = await optional(legacy);
      check(metadata?.isDirectory() && !metadata.isSymbolicLink() && await realpath(legacy) === legacy, 'Legacy source is missing or changed; preserve its ownership record for explicit recovery.');
      check(await git(['config', '--get', 'remote.origin.url'], legacy) === remoteUrl && await git(['rev-parse', 'HEAD'], legacy) === owner.revision, 'Legacy source ownership differs; preserve it for explicit recovery.');
      // Use the recorded commit, so edited legacy files remain untouched and
      // cannot conceal a downgrade or masquerade as a newly published version.
      const legacyVersion = JSON.parse(await git(['show', `${owner.revision}:package.json`], legacy)).version;
      check(compareVersions(release.version, legacyVersion) >= 0, 'Refusing an automatic version downgrade from the legacy installation; installed skills are unchanged.');
      check(release.version !== legacyVersion || revision === owner.revision, 'The same version has different legacy source; publish a new version instead.');
    }
    onProgress(`Installing QuickStark ${release.version} (${revision.slice(0, 12)})…`);
    let selected = null;
    for (const entry of original ? [original] : [...previous].reverse()) {
      const exists = await optional(entry.repositoryRoot);
      if (!exists) continue;
      check(exists.isDirectory() && !exists.isSymbolicLink() && await realpath(entry.repositoryRoot) === entry.repositoryRoot, 'Version source must be a real directory.');
      check(await git(['config', '--get', 'remote.origin.url'], entry.repositoryRoot) === remoteUrl, 'Version source ownership differs; preserve it.');
      if (await git(['rev-parse', 'HEAD'], entry.repositoryRoot) === revision && !await git(['status', '--porcelain', '--untracked-files=all', '--ignored=matching'], entry.repositoryRoot) && await exactCheckout(entry.repositoryRoot, revision)) { selected = entry; break; }
    }
    check(!resume || selected, 'The original recovery checkout is missing or changed; preserve its journal and source before explicit recovery.');
    const backup = previous.at(-1)?.repositoryRoot ?? (owner?.schemaVersion === 2 ? owner.repositoryRoot : null);
    if (!selected) {
      const repositoryRoot = await mkdtemp(path.join(sources, `${release.tag}-${revision.slice(0, 12)}-`));
      onProgress('Fetching the published version; previous source checkouts stay untouched…');
      await git(['clone', '--filter=blob:none', '--no-checkout', '--single-branch', '--branch', release.tag, remoteUrl, repositoryRoot], parent);
      await git(['checkout', '--detach', revision], repositoryRoot);
      check(await git(['rev-parse', 'HEAD'], repositoryRoot) === revision && !await git(['status', '--porcelain', '--untracked-files=all'], repositoryRoot) && await exactCheckout(repositoryRoot, revision), 'Candidate differs from the published tag commit.');
      check(JSON.parse(await readFile(path.join(repositoryRoot, 'package.json'))).version === release.version, 'Package version does not match the published tag.');
      onProgress('Validating generated packages and acceptance evidence…');
      if (validateCandidate) await validateCandidate({ repositoryRoot, revision });
      else {
        for (const entry of ['scripts/update-skills.mjs', 'scripts/validate-skill-release.mjs']) check((await optional(path.join(repositoryRoot, entry)))?.isFile(), `Published ${release.tag} predates the versioned installer. Publish the next version containing this repair; installed skills are unchanged.`);
        await runNode(path.join(repositoryRoot, 'scripts/sync-codex-plugin.mjs'), ['--check'], repositoryRoot);
        await runNode(path.join(repositoryRoot, 'scripts/validate-skill-release.mjs'), [repositoryRoot], repositoryRoot);
      }
      selected = { repositoryRoot, ...release };
      records.push(selected);
    }
    // Retain the complete source ledger before pointing current at a new source.
    // Native managers and journals use physical paths, never this convenience link.
    const record = { schemaVersion: 2, remoteUrl, releases: records, repositoryRoot: resume ? owner.repositoryRoot : selected.repositoryRoot, ...(owner?.schemaVersion === 1 ? { legacyCheckout: owner } : owner?.legacyCheckout ? { legacyCheckout: owner.legacyCheckout } : {}) };
    await save(ownerPath, record);
    if (!resume) {
      const now = await optional(current);
      check(pointer ? now?.isSymbolicLink() && now.ino === pointer.ino && now.dev === pointer.dev && now.mtimeMs === pointer.mtimeMs && now.ctimeMs === pointer.ctimeMs : !now, 'Current source pointer changed; preserve it.');
      const temporary = `${current}.${process.pid}.tmp`;
      await symlink(selected.repositoryRoot, temporary);
      await rename(temporary, current);
    }
    const result = { repositoryRoot: selected.repositoryRoot, revision, release, changed: !previous.some(entry => entry.repositoryRoot === selected.repositoryRoot), ...(backup && backup !== selected.repositoryRoot ? { backup } : {}) };
    if (useCheckout) await useCheckout(result);
    return result;
  } finally {
    await lock.close(); const actualLock = await lstat(lockPath);
    check(actualLock.ino === ownedLock.ino && actualLock.dev === ownedLock.dev && actualLock.mtimeMs === ownedLock.mtimeMs && actualLock.ctimeMs === ownedLock.ctimeMs, 'Installer lock was replaced; preserve it.');
    await unlink(lockPath);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(await realpath(process.argv[1]).catch(() => path.resolve(process.argv[1]))).href) {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) console.log('QuickStark installer: installs the latest stable version tag into a retained versioned checkout, then detects and updates harnesses. Use --version MAJOR.MINOR.PATCH to select a published version. Other update flags are forwarded.');
  else try {
    const versionIndex = args.indexOf('--version');
    let version = null;
    if (versionIndex !== -1) {
      version = args[versionIndex + 1]; check(version && !version.startsWith('--'), 'Missing --version value.');
      args.splice(versionIndex, 2); check(!args.includes('--version'), 'Choose one version.');
    }
    const resumeIndex = args.indexOf('--resume');
    const resume = resumeIndex === -1 ? null : args[resumeIndex + 1];
    check(resumeIndex === -1 || resume && !resume.startsWith('--'), 'Missing --resume journal.');
    await prepareSkillsCheckout({ version, resume, onProgress: text => console.error(text), useCheckout: source =>
      runNode(path.join(source.repositoryRoot, 'scripts/update-skills.mjs'), ['--release', `${source.release.tag}@${source.revision}`, ...args], source.repositoryRoot, { ...gitEnvironment(), QS_REPAIR_MANAGED: '1' }) });
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
