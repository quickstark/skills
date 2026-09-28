import { createHash } from 'node:crypto';
import { constants } from 'node:fs';
import { chmod, cp, lstat, mkdir, open, readFile, rename, symlink } from 'node:fs/promises';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { assertMigrationParents, captureMigrationPath, revalidateMigrationPath } from './migration-filesystem.mjs';

const require = (condition, message) => { if (!condition) throw new Error(message); };
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const absent = async (path) => (await lstat(path).catch((error) => error.code === 'ENOENT' ? null : Promise.reject(error))) === null;
const sameContent = (a, b) => a.kind === b.kind && (a.kind === 'absent' || a.contentSha256 === b.contentSha256);
const sameState = (a, b) => a?.path === b?.path && sameContent(a, b);
const absolute = (path) => typeof path === 'string' && isAbsolute(path) && resolve(path) === path && path !== '/' && !/[\u0000-\u001f]/.test(path);

export function ownedPathState(snapshot, destination = snapshot.path) {
  require(absolute(destination), 'An exact destination path is required.');
  return snapshot.kind === 'absent' ? { kind: 'absent', path: destination }
    : { kind: snapshot.kind, path: destination, contentSha256: snapshot.contentSha256 };
}

export function ownedFileState(path, contents, mode = 0o600) {
  require(absolute(path) && typeof contents === 'string' && Number.isInteger(mode) && mode >= 0 && mode <= 0o777, 'Exact file contents/mode required.');
  const entries = [{ path: '', kind: 'file', mode, bytes: Buffer.byteLength(contents), sha256: sha(contents) }];
  return { kind: 'file', path, contentSha256: sha(JSON.stringify(entries)) };
}

async function syncDirectory(path) {
  const handle = await open(path, 'r');
  try { await handle.sync(); } finally { await handle.close(); }
}

async function copyBound(source, target, expected) {
  await revalidateMigrationPath(expected);
  await assertMigrationParents(target);
  require(await absent(target), 'Owned copy destination already exists; preserve it.');
  if (expected.kind === 'symlink') await symlink(expected.target, target);
  else {
    require(['file', 'directory'].includes(expected.kind), 'Only existing bounded payloads can be copied.');
    await cp(source, target, { recursive: expected.kind === 'directory', dereference: false, force: false, errorOnExist: true });
    await chmod(target, expected.entries[0].mode);
  }
  await revalidateMigrationPath(expected);
  const actual = await captureMigrationPath(target);
  require(sameContent(expected, actual), 'Copied payload changed; preserve partial output and replan.');
  // Flush payload data as well as directory entries before the coordinator can
  // record a verified backup. Never open the destination of a literal symlink.
  for (const entry of [...(actual.entries ?? [])].reverse()) {
    const handle = await open(join(target, entry.path), constants.O_RDONLY | constants.O_NOFOLLOW);
    try { await handle.sync(); } finally { await handle.close(); }
  }
  await syncDirectory(dirname(target));
  return actual;
}

/** Filesystem phases only. Ownership and capability acceptance are supplied by
 * the verified migration planner; a snapshot is never an ownership grant.
 * All removed objects are renamed into retained quarantine, never recursively
 * deleted. The transaction coordinator separately controls recovery authority.
 */
export function createOwnedPathAdapter({ backupRoot, discoveryRoots }) {
  require(absolute(backupRoot) && Array.isArray(discoveryRoots) && discoveryRoots.length > 0 && discoveryRoots.every(absolute), 'Exact backup/discovery roots required.');
  require(discoveryRoots.every((root) => backupRoot !== root && !backupRoot.startsWith(root + '/') && !root.startsWith(backupRoot + '/')), 'Backup must remain outside discovery.');
  function binding(step, context) {
    require(/^[a-z0-9][a-z0-9-]*$/.test(context.transactionId) && /^[a-z0-9][a-z0-9-]*$/.test(step.id), 'Bound transaction/step identities required.');
    require(step.ownedTargets?.length === 1 && typeof step.ownedTargets[0].ownershipRecord === 'string' && step.ownedTargets[0].ownershipRecord.length > 0, 'One proven-owned target required.');
    const target = step.ownedTargets[0].path, action = step.pathAction;
    require(absolute(target) && action && ['copy', 'retire', 'write-state'].includes(action.kind), 'Supported owned path action required.');
    require(target !== backupRoot && !target.startsWith(backupRoot + '/') && !backupRoot.startsWith(target + '/'), 'Target must be separate from retained backups.');
    require(action.beforeSnapshot?.path === target && sameState(ownedPathState(action.beforeSnapshot), step.before), 'Before-state must bind the original complete snapshot.');
    require((action.kind === 'copy' && step.phase === 'stage') || (action.kind === 'retire' && ['withdraw', 'retire'].includes(step.phase)) || (action.kind === 'write-state' && ['retire', 'state'].includes(step.phase)), 'Owned operation does not match its transaction phase.');
    if (action.kind === 'copy') require(action.beforeSnapshot.kind === 'absent' && ['file', 'directory'].includes(action.sourceSnapshot?.kind) && absolute(action.sourceSnapshot.path) && sameState(step.after, ownedPathState(action.sourceSnapshot, target)), 'Staging requires an absent target and bound regular source/after-state.');
    if (action.kind === 'copy') require(target !== action.sourceSnapshot.path && !target.startsWith(action.sourceSnapshot.path + '/') && !action.sourceSnapshot.path.startsWith(target + '/'), 'Staging source and destination must not overlap.');
    if (action.kind === 'retire') require(action.beforeSnapshot.kind !== 'absent' && sameState(step.after, { kind: 'absent', path: target }), 'Retirement requires an existing owned object.');
    if (action.kind === 'write-state') require(['absent', 'file'].includes(action.beforeSnapshot.kind) && typeof action.contents === 'string' && Buffer.byteLength(action.contents) <= 1024 * 1024 && sameState(step.after, ownedFileState(target, action.contents, action.mode)), 'Bounded state contents and file mode must match after-state.');
    return { target, action, slot: join(backupRoot, context.transactionId, step.id) };
  }
  async function backupObservation(slot) {
    await assertMigrationParents(join(slot, 'record.json'));
    const recordSnapshot = await captureMigrationPath(join(slot, 'record.json'));
    require(recordSnapshot.kind === 'file' && recordSnapshot.bytes <= 1024 * 1024, 'Backup record missing or invalid.');
    const record = JSON.parse(await readFile(recordSnapshot.path, 'utf8'));
    await revalidateMigrationPath(recordSnapshot);
    const payload = await captureMigrationPath(join(slot, 'before'));
    require(sameContent(record.before, payload), 'Backup payload differs from its bound record.');
    return { record, state: { backupSha256: sha(JSON.stringify({ record: recordSnapshot.contentSha256, payload: ownedPathState(payload) })) } };
  }
  return {
    async inspect(step, context) { const { target } = binding(step, context); return ownedPathState(await captureMigrationPath(target)); },
    async prepare(step, context) {
      const { target, action, slot } = binding(step, context);
      await assertMigrationParents(slot);
      await revalidateMigrationPath(action.beforeSnapshot);
      if (!await absent(slot)) {
        const prior = await backupObservation(slot);
        require(prior.record.target === target && sameContent(prior.record.before, action.beforeSnapshot), 'Existing backup is not this planned state.');
        return { reference: slot, expectedState: prior.state };
      }
      await mkdir(dirname(slot), { recursive: true, mode: 0o700 });
      await assertMigrationParents(slot); await mkdir(slot, { mode: 0o700 });
      if (action.beforeSnapshot.kind !== 'absent') await copyBound(target, join(slot, 'before'), action.beforeSnapshot);
      const record = { target, before: ownedPathState(action.beforeSnapshot), transactionId: context.transactionId, stepId: step.id };
      const handle = await open(join(slot, 'record.json'), 'wx', 0o600);
      try { await handle.writeFile(JSON.stringify(record)); await handle.sync(); } finally { await handle.close(); }
      await syncDirectory(slot); await syncDirectory(dirname(slot));
      return { reference: slot, expectedState: (await backupObservation(slot)).state };
    },
    async inspectBackup(step, reference, context) {
      const { slot, target } = binding(step, context); require(reference === slot, 'Foreign backup reference refused.');
      const result = await backupObservation(slot);
      require(result.record.target === target && result.record.transactionId === context.transactionId && result.record.stepId === step.id, 'Backup identity mismatch.');
      return result.state;
    },
    async apply(step, context) {
      const { target, action, slot } = binding(step, context);
      await revalidateMigrationPath(action.beforeSnapshot);
      await backupObservation(slot);
      if (action.kind === 'copy') { await copyBound(action.sourceSnapshot.path, target, action.sourceSnapshot); return; }
      if (action.kind === 'write-state') {
        const next = join(slot, 'next');
        if (await absent(next)) {
          const handle = await open(next, 'wx', action.mode);
          try { await handle.writeFile(action.contents); await handle.chmod(action.mode); await handle.sync(); } finally { await handle.close(); }
        }
        require(sameState(ownedPathState(await captureMigrationPath(next), target), step.after), 'Prepared state content changed; preserve it.');
      }
      await revalidateMigrationPath(action.beforeSnapshot);
      if (action.beforeSnapshot.kind !== 'absent') {
        require(await absent(join(slot, 'retired')), 'Retirement quarantine already exists.');
        await rename(target, join(slot, 'retired'));
        require(sameContent(action.beforeSnapshot, await captureMigrationPath(join(slot, 'retired'))), 'Retired content changed; preserve quarantine.');
      }
      if (action.kind === 'write-state') {
        require(await absent(target), 'State target appeared during publication; preserve it.');
        // Exclusive copy cannot overwrite a competing new state file.
        await copyBound(join(slot, 'next'), target, await captureMigrationPath(join(slot, 'next')));
      }
      await syncDirectory(dirname(target)); await syncDirectory(slot);
    },
    async recover(step, reference, context) {
      const { target, action, slot } = binding(step, context); require(reference === slot, 'Foreign recovery backup refused.');
      await backupObservation(slot);
      const current = await captureMigrationPath(target);
      require(sameState(ownedPathState(current), step.after), 'Changed target blocks recovery.');
      let retired;
      if (action.beforeSnapshot.kind !== 'absent') {
        retired = await captureMigrationPath(join(slot, 'retired'));
        require(sameContent(action.beforeSnapshot, retired) && retired.identity.device === action.beforeSnapshot.identity.device && retired.identity.inode === action.beforeSnapshot.identity.inode, 'Original quarantined object is missing or changed; retain backups for bounded recovery.');
      }
      if (current.kind !== 'absent') {
        require(await absent(join(slot, 'replaced')), 'Recovery quarantine already exists.');
        await revalidateMigrationPath(current); await rename(target, join(slot, 'replaced'));
      }
      if (retired) {
        require(await absent(target), 'Recovery target appeared; preserve it.');
        await rename(retired.path, target);
      }
      await syncDirectory(dirname(target)); await syncDirectory(slot);
    },
  };
}
