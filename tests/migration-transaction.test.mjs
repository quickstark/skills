import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, readlink, writeFile, appendFile, rm, symlink, link } from 'node:fs/promises';
import { hostname, tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { runMigrationTransaction, readMigrationJournal, readMigrationTransactionLock, unlockAbandonedMigrationTransaction, validateMigrationTransactionPlan } from '../scripts/migration-transaction.mjs';

const sha = (value) => createHash('sha256').update(value).digest('hex');
const jsonFile = async (file) => JSON.parse(await readFile(file, 'utf8'));
const missingOrText = async (file) => readFile(file, 'utf8').catch((error) => error.code === 'ENOENT' ? null : Promise.reject(error));
const oldPackage = { source: '/fixture/release/3.8.0', version: '3.8.0', publicNames: ['ps-how', 'ps-visual-parity'] };
const newPackage = { source: '/fixture/release/4.0.0', version: '4.0.0', publicNames: ['qs-how', 'qs-visual-parity'] };

async function fixture(t) {
  const base = await mkdtemp(path.join(tmpdir(), 'qs-migration-transaction-'));
  t.after(() => rm(base, { recursive: true, force: true }));
  const discovery = path.join(base, 'discovery'), staging = path.join(base, 'staging'), config = path.join(base, 'config'), backups = path.join(base, 'backups');
  for (const dir of [discovery, staging, config, backups]) await mkdir(dir);
  const files = { stage: path.join(staging, 'payload.json'), manager: path.join(discovery, 'manager.json'), retired: path.join(config, 'legacy.json'), state: path.join(config, 'selection.json') };
  const old = JSON.stringify({ packages: [oldPackage] }), empty = JSON.stringify({ packages: [] }), newer = JSON.stringify({ packages: [newPackage] });
  await writeFile(files.manager, old); await writeFile(files.retired, 'legacy-owned'); await writeFile(files.state, 'old-selection'); await writeFile(path.join(discovery, 'unrelated.txt'), 'untouched');
  const state = (text) => ({ exists: text !== null, contentSha256: text === null ? null : sha(text), native: text?.startsWith('{"packages"') ? JSON.parse(text) : null });
  const description = (id, phase, file, before, after) => ({ id, phase, adapter: 'fixture', operation: id, ownedTargets: [{ path: file, ownershipRecord: 'fixture:' + file }], before: state(before), after: state(after), afterText: after });
  const plan = { schemaVersion: 1, id: 'isolated-upgrade', revision: 'a'.repeat(40), evidenceHash: 'b'.repeat(64), discoveryRoots: [discovery], stagingRoots: [staging], ownedRoots: [staging, discovery, config], steps: [
    description('stage', 'stage', files.stage, null, 'verified-new-payload'),
    description('withdraw', 'withdraw', files.manager, old, empty),
    description('expose', 'expose', files.manager, empty, newer),
    description('retire', 'retire', files.retired, 'legacy-owned', null),
    description('state', 'state', files.state, 'old-selection', 'new-selection'),
  ] };
  const journalPath = path.join(base, 'ledger', 'transaction.jsonl');
  const controls = { fail: null, when: 'before', failRecover: null, recoverWhen: 'before', recoverEffects: [], effects: [], history: [], pause: null };
  async function observed(step) { return state(await missingOrText(step.ownedTargets[0].path)); }
  async function recordDiscovery() {
    const current = await jsonFile(files.manager);
    controls.history.push(current.packages.flatMap((pkg) => pkg.publicNames));
    assert.equal(current.packages.length <= 1, true, 'old and replacement packages must never be exposed together');
    assert.equal(await readFile(path.join(discovery, 'unrelated.txt'), 'utf8'), 'untouched');
  }
  const adapter = {
    async inspect(step) { return observed(step); },
    async prepare(step) {
      const reference = path.join(backups, step.id + '.json');
      const text = await missingOrText(step.ownedTargets[0].path);
      const expectedState = { sourceState: state(text), backupSha256: sha(JSON.stringify({ text })) };
      const previous = await missingOrText(reference);
      if (previous === null) await writeFile(reference, JSON.stringify({ text }), { flag: 'wx' });
      else assert.deepEqual(JSON.parse(previous), { text }, 'backup preparation cannot overwrite unrelated state');
      return { reference, expectedState };
    },
    async inspectBackup(step, reference) { const bytes = await readFile(reference, 'utf8'); return { sourceState: state(JSON.parse(bytes).text), backupSha256: sha(bytes) }; },
    async apply(step) {
      const journal = await readMigrationJournal(journalPath);
      assert.equal(journal.events.at(-1).kind, 'apply-intent', 'durable intent must precede every actual side effect');
      if (controls.pause) await controls.pause(step);
      if (controls.fail === step.id && controls.when === 'before') throw new Error('injected before ' + step.id);
      const file = step.ownedTargets[0].path;
      if (step.afterText === null) await rm(file); else await writeFile(file, step.afterText);
      controls.effects.push(step.id); await recordDiscovery();
      if (controls.fail === step.id && controls.when === 'after') throw new Error('injected after ' + step.id);
    },
    async recover(step, reference) {
      const journal = await readMigrationJournal(journalPath);
      assert.equal(journal.events.at(-1).kind, 'recover-intent');
      if (controls.failRecover === step.id && controls.recoverWhen === 'before') throw new Error('injected recovery failure');
      const { text } = await jsonFile(reference);
      if (text === null) await rm(step.ownedTargets[0].path, { force: true }); else await writeFile(step.ownedTargets[0].path, text);
      controls.recoverEffects.push(step.id); await recordDiscovery();
      if (controls.failRecover === step.id && controls.recoverWhen === 'after') throw new Error('injected recovery after effect');
    },
  };
  return { base, plan, files, controls, journalPath, adapters: { fixture: adapter }, ownerId: 'fixture-owner', state };
}
const recover = (args) => runMigrationTransaction({ ...args, mode: 'recover', recoveryAuthority: { transactionId: args.plan.id, operation: 'restore-journaled-owned-effects', source: 'isolated-fixture' } });

test('fresh installation needs no withdrawal or retirement and recovery restores actual absence', async (t) => {
  const args = await fixture(t);
  const empty = JSON.stringify({ packages: [] });
  await writeFile(args.files.manager, empty);
  await rm(args.files.state);
  args.plan.steps = args.plan.steps.filter((step) => ['stage', 'expose', 'state'].includes(step.phase));
  args.plan.steps.find((step) => step.phase === 'state').before = args.state(null);
  assert.equal((await runMigrationTransaction(args)).status, 'complete');
  assert.deepEqual(args.controls.effects, ['stage', 'expose', 'state']);
  assert.deepEqual((await jsonFile(args.files.manager)).packages, [newPackage]);
  assert.equal(await readFile(args.files.retired, 'utf8'), 'legacy-owned');
  assert.equal((await recover(args)).status, 'rolled-back');
  assert.deepEqual((await jsonFile(args.files.manager)).packages, []);
  assert.equal(await missingOrText(args.files.state), null);
  assert.equal(await missingOrText(args.files.stage), null);
});

test('phase subsets reject empty plans, no-op effects, and state before exposure', async (t) => {
  const args = await fixture(t);
  const validate = (steps) => validateMigrationTransactionPlan({ ...args.plan, steps }, args.journalPath);
  assert.throws(() => validate([]), /Bounded transaction steps/);
  const selected = args.plan.steps.filter((step) => ['stage', 'expose', 'state'].includes(step.phase));
  assert.equal(validate(selected), true);
  assert.throws(() => validate([selected[0], selected[2], selected[1]]), /Steps must follow/);
  assert.throws(() => validate([{ ...selected[2], after: selected[2].before }]), /observable state transition/);
});

test('durable five-phase transaction verifies actual source/version/discovery and saves selection last', async (t) => {
  const args = await fixture(t);
  const result = await runMigrationTransaction(args);
  assert.equal(result.status, 'complete'); assert.deepEqual(args.controls.effects, ['stage', 'withdraw', 'expose', 'retire', 'state']);
  assert.equal(await readFile(args.files.state, 'utf8'), 'new-selection');
  assert.deepEqual((await jsonFile(args.files.manager)).packages, [newPackage]);
  const journal = await readMigrationJournal(args.journalPath);
  assert.equal(journal.events.at(-1).kind, 'complete');
  assert.equal(journal.events.filter((event) => event.kind === 'apply-intent').length, 5);
  const repeated = await runMigrationTransaction(args);
  assert.equal(repeated.status, 'complete'); assert.equal(args.controls.effects.length, 5, 'resume cannot repeat existing effects');
});

test('failures at every side of every phase remain durable and explicit recovery restores prior files', async (t) => {
  for (const phase of ['stage', 'withdraw', 'expose', 'retire', 'state']) for (const when of ['before', 'after']) {
    const args = await fixture(t); args.controls.fail = phase; args.controls.when = when;
    assert.equal((await runMigrationTransaction(args)).status, 'failed', `${phase}/${when}`);
    if (phase === 'stage') assert.deepEqual((await jsonFile(args.files.manager)).packages, [oldPackage]);
    if (phase !== 'state' || when === 'before') assert.equal(await readFile(args.files.state, 'utf8'), 'old-selection');
    assert.equal((await readMigrationJournal(args.journalPath)).events.at(-1).kind, 'failed');
    args.controls.fail = null;
    assert.equal((await recover(args)).status, 'rolled-back', `${phase}/${when}`);
    assert.deepEqual((await jsonFile(args.files.manager)).packages, [oldPackage]);
    assert.equal(await readFile(args.files.state, 'utf8'), 'old-selection');
    assert.equal(await readFile(args.files.retired, 'utf8'), 'legacy-owned');
    assert.equal(await missingOrText(args.files.stage), null);
  }
});

test('apply interruption after a real effect resumes from observed after-state without duplication', async (t) => {
  const args = await fixture(t); args.controls.fail = 'expose'; args.controls.when = 'after';
  assert.equal((await runMigrationTransaction(args)).status, 'failed');
  args.controls.fail = null;
  assert.equal((await runMigrationTransaction(args)).status, 'complete');
  assert.equal(args.controls.effects.filter((id) => id === 'expose').length, 1);
});

test('changed owned local state blocks resumed application and recovery while preserving edits', async (t) => {
  const args = await fixture(t); args.controls.fail = 'expose';
  await runMigrationTransaction(args);
  await writeFile(args.files.manager, JSON.stringify({ packages: [], userEdit: true }));
  args.controls.fail = null;
  assert.equal((await runMigrationTransaction(args)).status, 'failed');
  assert.equal((await recover(args)).status, 'recovery-failed');
  assert.equal((await jsonFile(args.files.manager)).userEdit, true);
});

test('recovery requires exact explicit authority and failed rollback retains observed residuals/backups', async (t) => {
  const args = await fixture(t); args.controls.fail = 'retire';
  await runMigrationTransaction(args);
  await assert.rejects(runMigrationTransaction({ ...args, mode: 'recover' }), /recovery authority/);
  await assert.rejects(runMigrationTransaction({ ...args, mode: 'recover', recoveryAuthority: { transactionId: 'other', operation: 'restore-journaled-owned-effects', source: 'user' } }), /recovery authority/);
  args.controls.failRecover = 'expose';
  const failed = await recover(args); assert.equal(failed.status, 'recovery-failed'); assert.equal(failed.backupsRetained, true);
  assert.ok(failed.residuals.some((entry) => entry.backup));
  assert.deepEqual((await jsonFile(args.files.manager)).packages, [newPackage]);
  args.controls.failRecover = null;
  assert.equal((await recover(args)).status, 'rolled-back');
});

test('changed plan, corrupt journal and unsafe targets fail before further effects', async (t) => {
  const args = await fixture(t); args.controls.fail = 'stage'; await runMigrationTransaction(args);
  const before = args.controls.effects.length;
  await assert.rejects(runMigrationTransaction({ ...args, plan: { ...args.plan, evidenceHash: 'c'.repeat(64) } }), /plan\/evidence changed/);
  const text = await readFile(args.journalPath, 'utf8'); await writeFile(args.journalPath, text.replace('prepare-intent', 'untrusted-event'));
  await assert.rejects(runMigrationTransaction(args), /hash chain/);
  assert.equal(args.controls.effects.length, before);
  const bad = structuredClone(args.plan); bad.steps[0].ownedTargets[0].path = '/';
  assert.throws(() => validateMigrationTransactionPlan(bad, args.journalPath), /Owned target/);
  assert.throws(() => validateMigrationTransactionPlan(args.plan, path.join(args.plan.discoveryRoots[0], 'journal')), /outside discovery/);
  assert.throws(() => validateMigrationTransactionPlan({ ...args.plan, discoveryRoots: [...args.plan.discoveryRoots, args.journalPath + '.lock'] }, args.journalPath), /outside discovery/);
  const discontinuous = structuredClone(args.plan); discontinuous.steps[2].before.contentSha256 = 'd'.repeat(64);
  assert.throws(() => validateMigrationTransactionPlan(discontinuous, args.journalPath), /continuous chain/);
  const nested = structuredClone(args.plan); nested.steps[4].ownedTargets[0].path = nested.steps[1].ownedTargets[0].path + '/child';
  assert.throws(() => validateMigrationTransactionPlan(nested, args.journalPath), /Nested owned/);
});

test('linked, hardlinked and directory journals cannot be used as transaction records', async (t) => {
  for (const kind of ['symlink', 'hardlink', 'directory']) {
    const args = await fixture(t); await mkdir(path.dirname(args.journalPath));
    const other = path.join(args.base, 'other'); await writeFile(other, 'unrelated');
    if (kind === 'symlink') await symlink(other, args.journalPath);
    if (kind === 'hardlink') await link(other, args.journalPath);
    if (kind === 'directory') await mkdir(args.journalPath);
    await assert.rejects(runMigrationTransaction(args), /bounded unlinked regular file/);
    assert.equal(await readFile(other, 'utf8'), 'unrelated'); assert.equal(args.controls.effects.length, 0);
  }
});

test('exclusive lock refuses a live concurrent owner and cannot be stolen', async (t) => {
  const args = await fixture(t); let release; let entered;
  const started = new Promise((resolve) => { entered = resolve; });
  args.controls.pause = async (step) => { if (step.id === 'stage') { entered(); await new Promise((resolve) => { release = resolve; }); } };
  const running = runMigrationTransaction(args); await started;
  await assert.rejects(runMigrationTransaction({ ...args, ownerId: 'competitor' }), /EEXIST/);
  const owner = await readMigrationTransactionLock(args.journalPath);
  await assert.rejects(unlockAbandonedMigrationTransaction({ journalPath: args.journalPath, expectedOwnerToken: owner.token }), /live or cannot be proven dead/);
  release(); assert.equal((await running).status, 'complete');
});

test('an actually terminated owner requires explicit verified-dead unlock before resumption', async (t) => {
  const args = await fixture(t);
  const modulePath = fileURLToPath(new URL('../scripts/migration-transaction.mjs', import.meta.url));
  const script = `import {runMigrationTransaction} from ${JSON.stringify('file://' + modulePath)};const input=JSON.parse(process.argv[1]);const adapter={inspect:async()=>{console.log('locked');await new Promise(()=>setInterval(()=>{},1000));},prepare(){},inspectBackup(){},apply(){},recover(){}};await runMigrationTransaction({...input,adapters:{fixture:adapter}});`;
  const child = spawn(process.execPath, ['--input-type=module', '-e', script, JSON.stringify({ journalPath: args.journalPath, plan: args.plan, ownerId: 'child-fixture' })], { stdio: ['ignore', 'pipe', 'pipe'] });
  t.after(() => { if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL'); });
  await once(child.stdout, 'data'); const exited = once(child, 'exit'); child.kill('SIGKILL'); await exited;
  const owner = await readMigrationTransactionLock(args.journalPath);
  await assert.rejects(runMigrationTransaction(args), /EEXIST/);
  assert.equal((await unlockAbandonedMigrationTransaction({ journalPath: args.journalPath, expectedOwnerToken: owner.token })).unlocked, true);
  assert.equal((await runMigrationTransaction(args)).status, 'complete');
});

test('same-host PID absence in a different namespace or boot never authorizes lock retirement', async (t) => {
  const args = await fixture(t); const directory = args.journalPath + '.lock';
  await mkdir(directory, { recursive: true });
  const ownerPath = path.join(directory, 'owner.json');
  const pidNamespace = await readlink('/proc/self/ns/pid');
  const bootId = (await readFile('/proc/sys/kernel/random/boot_id', 'utf8')).trim();
  const owner = { ownerId: 'external-context', token: 'fixture-external-token', hostname: hostname(), pid: 2147483647, processIdentity: { bootId, pidNamespace, startTime: '1' } };
  assert.throws(() => process.kill(owner.pid, 0), { code: 'ESRCH' }, 'this context cannot see the recorded PID');
  for (const identity of [null, { ...owner.processIdentity, pidNamespace: 'pid:[0]' }, { ...owner.processIdentity, bootId: '0'.repeat(36) }]) {
    const external = { ...owner, processIdentity: identity }; await writeFile(ownerPath, JSON.stringify(external));
    await assert.rejects(unlockAbandonedMigrationTransaction({ journalPath: args.journalPath, expectedOwnerToken: owner.token }), /namespace\/boot identity/);
    assert.deepEqual(await jsonFile(ownerPath), external, 'unknown-context ownership must remain intact');
    await assert.rejects(runMigrationTransaction(args), /EEXIST/);
  }
});


test('booleans alone cannot be accepted as meaningful observation evidence', async (t) => {
  const args = await fixture(t); args.adapters.fixture.inspect = async () => ({ verified: true });
  const result = await runMigrationTransaction(args);
  assert.equal(result.status, 'failed'); assert.match(result.error, /content\/snapshot digest/);
  assert.equal(args.controls.effects.length, 0);
});

test('journal write conflict reports actual residual selection instead of a false completion', async (t) => {
  const args = await fixture(t);
  args.controls.pause = async (step) => { if (step.id === 'state') await appendFile(args.journalPath, 'unexpected-partial-writer'); };
  const result = await runMigrationTransaction(args);
  assert.equal(result.status, 'failed'); assert.match(result.journalError, /Journal changed/);
  assert.equal(await readFile(args.files.state, 'utf8'), 'new-selection');
  assert.ok(result.residuals.some((entry) => entry.stepId === 'state' && entry.actual.contentSha256 === sha('new-selection')));
  await assert.rejects(readMigrationJournal(args.journalPath), /partial final record/);
});

test('changed backups cannot restore state and adapter attempts cannot rewrite the bound plan', async (t) => {
  const args = await fixture(t); args.controls.fail = 'retire'; await runMigrationTransaction(args);
  await writeFile(path.join(args.base, 'backups/expose.json'), JSON.stringify({ text: 'changed-backup' }));
  const result = await recover(args); assert.equal(result.status, 'recovery-failed'); assert.match(result.error, /Backup changed/);
  assert.deepEqual((await jsonFile(args.files.manager)).packages, [newPackage]);
  const other = await fixture(t);
  other.controls.pause = async (step) => { step.after.contentSha256 = 'c'.repeat(64); };
  assert.equal((await runMigrationTransaction(other)).status, 'failed');
  assert.equal(other.controls.effects.length, 0);
});


test('interrupted recovery resumes observed restored state without repeating the restore effect', async (t) => {
  const args = await fixture(t); args.controls.fail = 'retire'; await runMigrationTransaction(args);
  args.controls.failRecover = 'expose'; args.controls.recoverWhen = 'after';
  assert.equal((await recover(args)).status, 'recovery-failed');
  assert.equal((await runMigrationTransaction(args)).status, 'failed', 'unfinished recovery cannot silently switch back to forward effects');
  args.controls.failRecover = null;
  assert.equal((await recover(args)).status, 'rolled-back');
  assert.equal(args.controls.recoverEffects.filter((id) => id === 'expose').length, 1);
  assert.deepEqual((await jsonFile(args.files.manager)).packages, [oldPackage]);
});


test('a failed final inspection prohibits completion even after every side effect succeeded', async (t) => {
  const args = await fixture(t); const inspect = args.adapters.fixture.inspect; let finishedInspections = 0;
  args.adapters.fixture.inspect = async (step, context) => {
    if (step.id === 'state' && args.controls.effects.includes('state') && ++finishedInspections === 2) throw new Error('final native read unavailable');
    return inspect(step, context);
  };
  const result = await runMigrationTransaction(args);
  assert.equal(result.status, 'failed'); assert.match(result.error, /Final required inspection failed/);
  assert.equal(args.controls.effects.length, 5);
});
