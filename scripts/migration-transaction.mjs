import { createHash, randomUUID } from 'node:crypto';
import { constants } from 'node:fs';
import { lstat, mkdir, open, readFile, readlink, rmdir, unlink } from 'node:fs/promises';
import { hostname } from 'node:os';
import path from 'node:path';
import { assertMigrationParents } from './migration-filesystem.mjs';

// Full six-package/two-host adoption includes reviewed source and resource snapshots.
// Keep finite bounds with room for durable intents, verified backups and residuals.
const MAX_JOURNAL = 16 * 1024 * 1024;
const MAX_PLAN = 4 * 1024 * 1024;
const MAX_STATE = 256 * 1024;
const PHASES = ['stage', 'withdraw', 'expose', 'retire', 'state'];
const require = (condition, message) => { if (!condition) throw new Error(message); };
const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const absolute = (value) => typeof value === 'string' && path.isAbsolute(value) && path.normalize(value) === value && value !== path.parse(value).root && !/[\u0000-\u001f]/.test(value);
const footprint = (step) => step.ownedTargets.map((target) => target.path).sort().join('\0');
const inside = (value, root) => value.startsWith(root + path.sep);
const overlaps = (a, b) => a === b || inside(a, b) || inside(b, a);
function canonical(value, depth = 0) {
  require(depth < 40, 'Transaction data exceeds nesting bound.');
  if (value === null || typeof value === 'string' || typeof value === 'boolean' || typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map((item) => canonical(item, depth + 1)).join(',') + ']';
  require(object(value) && Object.getPrototypeOf(value) === Object.prototype, 'Transaction data must be plain JSON.');
  return '{' + Object.keys(value).sort().map((key) => JSON.stringify(key) + ':' + canonical(value[key], depth + 1)).join(',') + '}';
}
const hash = (value) => createHash('sha256').update(canonical(value)).digest('hex');
function state(value) {
  require(object(value) && Object.keys(value).length > 0 && Buffer.byteLength(canonical(value)) <= MAX_STATE, 'Adapter state must be a bounded nonempty observation object.');
  const contentBound = ['contentSha256', 'snapshotHash', 'backupSha256'].some((key) => typeof value[key] === 'string' && /^[a-f0-9]{64}$/.test(value[key]));
  const absent = value.kind === 'absent' && absolute(value.path) || value.exists === false && value.contentSha256 === null;
  require(contentBound || absent, 'Adapter observations require a content/snapshot digest or explicit path absence; status booleans are insufficient.');
  if (value.native !== undefined && value.native !== null) {
    require(object(value.native) && Array.isArray(value.native.packages), 'Native observation requires actual registered packages.');
    for (const pkg of value.native.packages) require(object(pkg) && absolute(pkg.source) && typeof pkg.version === 'string' && pkg.version.length > 0 && Array.isArray(pkg.publicNames) && pkg.publicNames.every((name) => typeof name === 'string' && name.length > 0) && new Set(pkg.publicNames).size === pkg.publicNames.length, 'Native observation requires source, version and actual public names.');
  }
  return JSON.parse(canonical(value));
}
async function optionalStat(file) { return lstat(file).catch((error) => error.code === 'ENOENT' ? null : Promise.reject(error)); }
function processStat(text) {
  const end = text.lastIndexOf(')'); const fields = text.slice(end + 2).trim().split(/\s+/);
  const pid = Number(text.slice(0, text.indexOf(' '))); const startTime = fields[19];
  require(end > 0 && Number.isSafeInteger(pid) && /^[0-9]+$/.test(startTime), 'Process identity is unavailable.');
  return { pid, startTime };
}
async function currentProcessIdentity() {
  if (process.platform !== 'linux') return null;
  try {
    const bootId = (await readFile('/proc/sys/kernel/random/boot_id', 'utf8')).trim();
    const pidNamespace = await readlink('/proc/self/ns/pid');
    const self = processStat(await readFile('/proc/self/stat', 'utf8'));
    const named = processStat(await readFile(`/proc/${process.pid}/stat`, 'utf8'));
    require(/^[a-f0-9-]{36}$/.test(bootId) && /^pid:\[[0-9]+\]$/.test(pidNamespace) && self.pid === process.pid && named.pid === self.pid && named.startTime === self.startTime, 'Process visibility is not bound to this owner.');
    return { bootId, pidNamespace, startTime: self.startTime };
  } catch { return null; }
}
async function fsyncDirectory(directory) { const handle = await open(directory, constants.O_RDONLY); try { await handle.sync(); } finally { await handle.close(); } }
async function readBounded(file, limit = MAX_JOURNAL) {
  await assertMigrationParents(file);
  const before = await lstat(file);
  require(before.isFile() && !before.isSymbolicLink() && before.nlink === 1 && before.size <= limit, 'Journal/lock must be a bounded unlinked regular file.');
  const handle = await open(file, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0) | (constants.O_NONBLOCK ?? 0));
  try {
    const opened = await handle.stat();
    require(opened.dev === before.dev && opened.ino === before.ino, 'Journal/lock changed while opening.');
    const bytes = Buffer.alloc(limit + 1); let size = 0;
    while (size < bytes.length) { const result = await handle.read(bytes, size, bytes.length - size, null); if (!result.bytesRead) break; size += result.bytesRead; }
    const after = await handle.stat(); const named = await lstat(file);
    require(size <= limit && size === before.size && after.size === before.size && after.mtimeMs === before.mtimeMs && after.ctimeMs === before.ctimeMs && named.dev === before.dev && named.ino === before.ino && named.nlink === 1 && !named.isSymbolicLink(), 'Journal/lock changed during reading.');
    await assertMigrationParents(file);
    return { text: bytes.subarray(0, size).toString('utf8'), identity: { dev: before.dev, ino: before.ino }, bytes: size };
  } finally { await handle.close(); }
}

export function validateMigrationTransactionPlan(plan, journalPath) {
  require(object(plan) && plan.schemaVersion === 1 && typeof plan.id === 'string' && /^[a-z0-9][a-z0-9-]*$/.test(plan.id) && /^[a-f0-9]{40}$/.test(plan.revision) && /^[a-f0-9]{64}$/.test(plan.evidenceHash), 'Transaction plan identity/revision/evidence binding required.');
  require(absolute(journalPath), 'Exact absolute journal path required.');
  for (const field of ['discoveryRoots', 'stagingRoots', 'ownedRoots']) require(Array.isArray(plan[field]) && plan[field].length > 0 && plan[field].every(absolute), `Exact ${field} required.`);
  require(plan.stagingRoots.every((root) => plan.discoveryRoots.every((discovery) => !overlaps(root, discovery))), 'Staging must remain outside discovery.');
  require(plan.discoveryRoots.every((root) => !overlaps(journalPath, root) && !overlaps(journalPath + '.lock', root)), 'Journal and lock must remain outside discovery.');
  require(Array.isArray(plan.steps) && plan.steps.length > 0 && plan.steps.length <= 128, 'Bounded transaction steps required.');
  const ids = new Set(); const targets = new Set(); let lastPhase = -1;
  for (const step of plan.steps) {
    require(object(step) && typeof step.id === 'string' && /^[a-z0-9][a-z0-9-]*$/.test(step.id) && !ids.has(step.id), 'Unique step identities required.'); ids.add(step.id);
    const phase = PHASES.indexOf(step.phase); require(phase >= 0 && phase >= lastPhase, 'Steps must follow stage, withdraw, expose, retire, state order.'); lastPhase = phase;
    require(typeof step.adapter === 'string' && step.adapter.length > 0 && typeof step.operation === 'string' && step.operation.length > 0, 'Named adapter operation required.');
    require(Array.isArray(step.ownedTargets) && step.ownedTargets.length > 0, 'Step must bind exact owned targets.');
    const local = new Set();
    for (const target of step.ownedTargets) {
      require(object(target) && absolute(target.path) && typeof target.ownershipRecord === 'string' && target.ownershipRecord.length > 0, 'Owned target path and provenance required.');
      require(plan.ownedRoots.some((root) => inside(target.path, root)) && !local.has(target.path), 'Target must be a unique descendant of an owned root.'); local.add(target.path);
      require(![...plan.discoveryRoots, ...plan.stagingRoots, ...plan.ownedRoots].includes(target.path), 'Do not mutate a discovery, staging or ownership root wholesale.');
      require(!overlaps(target.path, journalPath) && !overlaps(target.path, journalPath + '.lock'), 'Targets cannot contain transaction journal/lock.');
      if (step.phase === 'stage') require(plan.stagingRoots.some((root) => inside(target.path, root)), 'Stage effects must stay in staging roots.');
      if (step.phase !== 'stage') require(!plan.stagingRoots.some((root) => target.path === root), 'Do not mutate a staging root wholesale.');
      targets.add(target.path);
    }
    state(step.before); state(step.after);
    require(hash(step.before) !== hash(step.after), 'Each step must describe an observable state transition.');
  }
  // Fresh installs have nothing to withdraw or retire. Keep phase ordering above,
  // but require only real, content-bound transitions rather than invented effects.
  for (const first of plan.steps) for (const second of plan.steps) {
    const shared = first.ownedTargets.some((target) => second.ownedTargets.some((other) => other.path === target.path));
    require(!shared || footprint(first) === footprint(second), 'Shared step footprints must match exactly; partial target overlap is ambiguous.');
  }
  for (const key of new Set(plan.steps.map(footprint))) {
    const group = plan.steps.filter((step) => footprint(step) === key);
    for (let index = 1; index < group.length; index++) require(hash(group[index - 1].after) === hash(group[index].before), 'Shared target state transitions must form a continuous chain.');
  }
  const paths = [...targets]; require(paths.every((entry, i) => paths.every((other, j) => i === j || !inside(entry, other))), 'Nested owned targets are forbidden.');
  require(Buffer.byteLength(canonical(plan)) <= MAX_PLAN, 'Transaction plan exceeds size bound.');
  return true;
}

export async function readMigrationJournal(journalPath) {
  const file = await optionalStat(journalPath); if (!file) return null;
  const loaded = await readBounded(journalPath);
  require(loaded.text.endsWith('\n'), 'Journal has a partial final record; preserve it for explicit recovery.');
  const events = []; let previousHash = null;
  for (const line of loaded.text.trimEnd().split('\n')) {
    const event = JSON.parse(line);
    const { eventHash, ...content } = event;
    require(content.sequence === events.length && content.previousHash === previousHash && hash(content) === eventHash, 'Journal hash chain is invalid.');
    events.push(event); previousHash = eventHash;
  }
  require(events[0]?.kind === 'begin' && object(events[0].data.plan), 'Journal lacks its bound plan.');
  return { events, plan: events[0].data.plan, planHash: events[0].data.planHash, identity: loaded.identity, bytes: loaded.bytes };
}

async function acquireLock(journalPath, ownerId) {
  const directory = journalPath + '.lock';
  await assertMigrationParents(journalPath);
  const missing = []; let ancestor = path.dirname(journalPath);
  while (!await optionalStat(ancestor)) { missing.push(ancestor); ancestor = path.dirname(ancestor); }
  await mkdir(path.dirname(journalPath), { recursive: true, mode: 0o700 }); await assertMigrationParents(journalPath);
  for (const directory of missing.reverse()) await fsyncDirectory(path.dirname(directory));
  await mkdir(directory, { mode: 0o700 });
  const owner = { ownerId, token: randomUUID(), pid: process.pid, hostname: hostname(), processIdentity: await currentProcessIdentity() };
  try {
    const handle = await open(path.join(directory, 'owner.json'), 'wx', 0o600);
    try { await handle.writeFile(canonical(owner)); await handle.sync(); } finally { await handle.close(); }
    await fsyncDirectory(directory); await fsyncDirectory(path.dirname(directory));
  } catch (error) { /* An incomplete ownership lock is not automatically stolen. */ throw error; }
  return { directory, owner, async release() {
    const current = JSON.parse((await readBounded(path.join(directory, 'owner.json'), 4096)).text);
    require(current.token === owner.token, 'Transaction lock ownership changed.');
    await unlink(path.join(directory, 'owner.json')); await rmdir(directory); await fsyncDirectory(path.dirname(directory));
  } };
}

export async function readMigrationTransactionLock(journalPath) {
  return JSON.parse((await readBounded(path.join(journalPath + '.lock', 'owner.json'), 4096)).text);
}

/** Explicit stale-lock recovery only: never steals live, foreign-host or unknown owners. */
export async function unlockAbandonedMigrationTransaction({ journalPath, expectedOwnerToken }) {
  require(absolute(journalPath) && typeof expectedOwnerToken === 'string' && expectedOwnerToken.length > 0, 'Explicit journal path and owner token required for unlock.');
  const owner = await readMigrationTransactionLock(journalPath);
  require(owner.token === expectedOwnerToken && owner.hostname === hostname() && Number.isSafeInteger(owner.pid) && owner.pid > 0, 'Lock owner identity is unknown or changed.');
  const identity = await currentProcessIdentity();
  require(identity && object(owner.processIdentity) && identity.bootId === owner.processIdentity.bootId && identity.pidNamespace === owner.processIdentity.pidNamespace && /^[0-9]+$/.test(owner.processIdentity.startTime), 'Lock process namespace/boot identity is unknown or differs; absence cannot prove death.');
  // PID absence is meaningful only in the recorded boot and PID namespace.
  // Existing PIDs (including reused ones) are conservatively left locked.
  let absent = false;
  try { processStat(await readFile(`/proc/${owner.pid}/stat`, 'utf8')); } catch (error) { absent = error.code === 'ENOENT'; }
  require(absent, 'Lock owner is live or cannot be proven dead.');
  let dead = false;
  try { process.kill(owner.pid, 0); } catch (error) { dead = error.code === 'ESRCH'; }
  require(dead, 'Lock owner is live or cannot be proven dead.');
  const recoveryGuard = path.join(journalPath + '.lock', 'recovery');
  await mkdir(recoveryGuard, { mode: 0o700 });
  // Serializes explicit unlock attempts while the original lock directory still
  // prevents a new transaction owner from entering. Partial recovery stays visible.
  require((await readMigrationTransactionLock(journalPath)).token === owner.token, 'Lock changed during dead-owner check.');
  await unlink(path.join(journalPath + '.lock', 'owner.json')); await rmdir(recoveryGuard); await rmdir(journalPath + '.lock'); await fsyncDirectory(path.dirname(journalPath));
  return { unlocked: true, owner };
}

/** Adapters must implement inspect, prepare, inspectBackup, apply and recover.
 * inspect returns actual meaningful bounded state, including native source/version
 * and discovered public identities. prepare is idempotent and returns a backup
 * {reference, expectedState}; inspectBackup independently verifies its contents.
 * The coordinator supplies no new ownership or mutation/recovery authority.
 */
export async function runMigrationTransaction({ journalPath, plan, adapters, ownerId, mode = 'forward', recoveryAuthority = null }) {
  validateMigrationTransactionPlan(plan, journalPath);
  plan = JSON.parse(canonical(plan));
  const freeze = (value) => { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } };
  freeze(plan);
  require(typeof ownerId === 'string' && ownerId.length > 0 && ownerId.length <= 256 && !/[\u0000-\u001f]/.test(ownerId) && ['forward', 'recover'].includes(mode), 'Explicit transaction owner/mode required.');
  if (mode === 'recover') require(object(recoveryAuthority) && recoveryAuthority.transactionId === plan.id && recoveryAuthority.operation === 'restore-journaled-owned-effects' && ['user', 'isolated-fixture'].includes(recoveryAuthority.source), 'Transaction-specific recovery authority required.');
  for (const step of plan.steps) require(['inspect', 'prepare', 'inspectBackup', 'apply', 'recover'].every((method) => typeof adapters?.[step.adapter]?.[method] === 'function'), `Incomplete adapter: ${step.adapter}.`);
  const lock = await acquireLock(journalPath, ownerId);
  let journal; let handle; let bytes; let expectedIdentity;
  try {
    journal = await readMigrationJournal(journalPath);
    require(mode !== 'recover' || journal !== null, 'Cannot recover a transaction with no prior journal.');
    if (journal) require(journal.planHash === hash(plan) && hash(journal.plan) === hash(plan), 'Transaction plan/evidence changed; preserve journal and replan.');
    handle = await open(journalPath, constants.O_WRONLY | constants.O_APPEND | (journal ? 0 : constants.O_CREAT | constants.O_EXCL) | (constants.O_NOFOLLOW ?? 0), 0o600);
    expectedIdentity = await handle.stat();
    require(expectedIdentity.isFile() && expectedIdentity.nlink === 1 && (!journal || journal.identity.dev === expectedIdentity.dev && journal.identity.ino === expectedIdentity.ino), 'Journal identity changed before append.');
    const events = journal?.events ?? []; bytes = journal?.bytes ?? 0;
    async function append(kind, data) {
      const content = { sequence: events.length, previousHash: events.at(-1)?.eventHash ?? null, kind, data };
      const event = { ...content, eventHash: hash(content) }; const line = canonical(event) + '\n';
      require(bytes + Buffer.byteLength(line) <= MAX_JOURNAL, 'Transaction journal size bound exceeded.');
      await assertMigrationParents(journalPath);
      const current = await lstat(journalPath); const fd = await handle.stat();
      require(!current.isSymbolicLink() && current.nlink === 1 && current.dev === expectedIdentity.dev && current.ino === expectedIdentity.ino && current.size === bytes && fd.size === bytes && current.mtimeMs === expectedIdentity.mtimeMs && current.ctimeMs === expectedIdentity.ctimeMs, 'Journal changed outside its owner.');
      await handle.writeFile(line); await handle.sync(); expectedIdentity = await handle.stat(); bytes += Buffer.byteLength(line); events.push(event);
    }
    if (!journal) { await append('begin', { planHash: hash(plan), plan, ownerId }); await fsyncDirectory(path.dirname(journalPath)); }
    const context = { transactionId: plan.id, journalPath, ownerId };
    const stepEvents = (id) => events.filter((event) => event.data.stepId === id);
    const latestBackup = (id) => stepEvents(id).findLast((event) => event.kind === 'backup-verified')?.data.backup;
    async function inspect(step) { return state(await adapters[step.adapter].inspect(step, context)); }
    async function inspectAll() {
      const observations = [];
      for (const step of plan.steps) { try { observations.push({ stepId: step.id, actual: await inspect(step), backup: latestBackup(step.id) ?? null }); } catch (error) { observations.push({ stepId: step.id, inspectionError: String(error.message), backup: latestBackup(step.id) ?? null }); } }
      return observations;
    }
    async function failure(error, kind, stepId = null) {
      const residuals = await inspectAll(); let journalError = null;
      try { await append(kind, { stepId, error: String(error.message), residuals }); } catch (recordError) { journalError = String(recordError.message); }
      return { status: mode === 'recover' ? 'recovery-failed' : 'failed', transactionId: plan.id, ...(stepId ? { failedStep: stepId } : {}), error: String(error.message), residuals, journalPath, journalError, backupsRetained: true };
    }
    const groups = [...new Set(plan.steps.map(footprint))].map((key) => plan.steps.filter((step) => footprint(step) === key));
    const effectState = (id) => stepEvents(id).findLast((event) => ['apply-intent', 'verified', 'recover-intent', 'recovered'].includes(event.kind))?.kind;
    // A native manager configuration can be changed by several phases. Earlier
    // intermediate states are superseded only by later journaled steps with the
    // same complete footprint; latest actual state remains independently checked.
    try {
      require(mode === 'recover' || plan.steps.every((step) => effectState(step.id) !== 'recover-intent'), 'Resume authorized recovery before forward execution.');
      for (const group of groups) {
        const active = group.findLast((step) => ['apply-intent', 'verified', 'recover-intent'].includes(effectState(step.id)));
        const inspected = active ?? group[0]; const actual = await inspect(inspected);
        const accepted = active ? hash(actual) === hash(active.after) || ['apply-intent', 'recover-intent'].includes(effectState(active.id)) && hash(actual) === hash(active.before) : hash(actual) === hash(group[0].before);
        require(accepted, 'Current owned state changed or has uncertain residual effects.');
      }
    } catch (error) {
      return await failure(error, 'preflight-failed');
    }
    const steps = mode === 'recover' ? [...plan.steps].reverse() : plan.steps;
    for (const step of steps) {
      const history = stepEvents(step.id); const adapter = adapters[step.adapter]; let observed;
      if (mode === 'recover' && (!history.some((event) => event.kind === 'apply-intent') || effectState(step.id) === 'recovered')) continue;
      if (mode === 'forward' && effectState(step.id) === 'verified' && plan.steps.slice(plan.steps.indexOf(step) + 1).some((later) => footprint(later) === footprint(step) && ['apply-intent', 'verified'].includes(effectState(later.id)))) continue;
      try {
        observed = await inspect(step);
        if (mode === 'recover') {
          if (hash(observed) === hash(step.before)) { await append('recovered', { stepId: step.id, observedHash: hash(observed), resumed: true }); continue; }
          require(hash(observed) === hash(step.after), 'Changed or uncertain state blocks recovery; preserve local edits.');
          const backup = latestBackup(step.id); require(backup, 'Verified backup unavailable; recovery blocked.');
          require(hash(state(await adapter.inspectBackup(step, backup.reference, context))) === hash(backup.expectedState), 'Backup changed; recovery blocked.');
          await append('recover-intent', { stepId: step.id, observedHash: hash(observed), backup });
          require(hash(await inspect(step)) === hash(step.after), 'State changed immediately before recovery.');
          await adapter.recover(step, backup.reference, context);
          observed = await inspect(step); require(hash(observed) === hash(step.before), 'Recovery did not restore the observed prior state.');
          await append('recovered', { stepId: step.id, observedHash: hash(observed), resumed: false });
          continue;
        }
        if (hash(observed) === hash(step.after) && history.some((event) => event.kind === 'apply-intent')) { await append('verified', { stepId: step.id, observedHash: hash(observed), resumed: true }); continue; }
        require(hash(observed) === hash(step.before), 'Changed or uncertain state conflicts with planned before/after evidence.');
        require(!history.some((event) => event.kind === 'verified') || history.some((event) => event.kind === 'recovered'), 'Previously verified state changed outside this transaction.');
        let backup = latestBackup(step.id);
        if (!backup) {
          await append('prepare-intent', { stepId: step.id, observedHash: hash(observed) });
          backup = await adapter.prepare(step, context);
          require(object(backup) && typeof backup.reference === 'string' && backup.reference.length > 0 && backup.reference.length <= 4096 && !/[\u0000-\u001f]/.test(backup.reference), 'Adapter must return an independently inspectable backup.'); backup = { reference: backup.reference, expectedState: state(backup.expectedState) };
          require(hash(state(await adapter.inspectBackup(step, backup.reference, context))) === hash(backup.expectedState), 'Prepared backup verification failed.');
          await append('backup-verified', { stepId: step.id, backup });
        } else require(hash(state(await adapter.inspectBackup(step, backup.reference, context))) === hash(backup.expectedState), 'Prior backup changed.');
        await append('apply-intent', { stepId: step.id, phase: step.phase, beforeHash: hash(step.before), afterHash: hash(step.after), backup });
        require(hash(await inspect(step)) === hash(step.before), 'State changed immediately before application.');
        await adapter.apply(step, context);
        observed = await inspect(step); require(hash(observed) === hash(step.after), 'Applied state does not match required after-state.');
        await append('verified', { stepId: step.id, observedHash: hash(observed), resumed: false });
      } catch (error) {
        return await failure(error, mode === 'recover' ? 'recovery-failed' : 'failed', step.id);
      }
    }
    const residuals = await inspectAll();
    try {
      require(residuals.every((entry) => !entry.inspectionError), 'Final required inspection failed.');
      for (const group of groups) { const last = mode === 'recover' ? group[0] : group.at(-1); require(hash(await inspect(last)) === hash(mode === 'recover' ? last.before : last.after), 'Final owned state does not match the verified transaction outcome.'); }
    } catch (error) {
      return await failure(error, mode === 'recover' ? 'recovery-failed' : 'failed');
    }
    try { await append(mode === 'recover' ? 'rolled-back' : 'complete', { residuals }); } catch (error) { return await failure(error, 'completion-record-failed'); }
    return { status: mode === 'recover' ? 'rolled-back' : 'complete', transactionId: plan.id, residuals, journalPath, backupsRetained: true };
  } finally {
    if (handle) await handle.close();
    await lock.release();
  }
}
