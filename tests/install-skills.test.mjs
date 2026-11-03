import assert from 'node:assert/strict';
import { execFile, spawn } from 'node:child_process';
import { once } from 'node:events';
import { appendFile, chmod, mkdir, mkdtemp, readFile, readdir, rename, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { promisify } from 'node:util';
import { prepareSkillsCheckout, waitForValidatedCommit } from '../scripts/install-skills.mjs';

const exec = promisify(execFile);
const revision = 'a'.repeat(40);
const run = (overrides = {}) => ({ head_sha: revision, head_branch: 'main', event: 'push', run_number: 1, status: 'completed', conclusion: 'success', html_url: 'https://github.com/quickstark/skills/actions/runs/1', ...overrides });
const response = runs => ({ ok: true, json: async () => ({ workflow_runs: runs }) });

test('GitHub gate waits for the exact main push workflow before accepting success', async () => {
  const results = [[run({ head_sha: 'b'.repeat(40) })], [run({ status: 'in_progress', conclusion: null })], [run()]];
  const waits = []; const requests = [];
  const accepted = await waitForValidatedCommit({ revision, fetchImpl: async (url, options) => { requests.push({ url, options }); return response(results.shift()); }, wait: async delay => waits.push(delay) });
  assert.equal(accepted.revision, revision); assert.equal(waits.length, 2);
  assert.ok(requests.every(r => r.url.includes('/actions/workflows/validate.yml/runs?') && r.url.includes(`head_sha=${revision}`)));
});

for (const conclusion of ['failure', 'cancelled', 'skipped', 'neutral']) test(`GitHub ${conclusion} is never an installation permit`, async () => {
  await assert.rejects(waitForValidatedCommit({ revision, fetchImpl: async () => response([run({ conclusion })]) }), /did not pass/);
});

test('unavailable or indefinitely pending validation cannot install', async () => {
  await assert.rejects(waitForValidatedCommit({ revision, fetchImpl: async () => ({ ok: false, status: 403 }) }), /HTTP 403/);
  await assert.rejects(waitForValidatedCommit({ revision, attempts: 2, fetchImpl: async () => response([]), wait: async () => {} }), /still pending/);
});

async function fixture(t) {
  const base = await mkdtemp(path.join(tmpdir(), 'qs-hosted-installer-')); t.after(() => rm(base, { recursive: true, force: true }));
  const origin = path.join(base, 'origin'); const home = path.join(base, 'home'); await mkdir(origin); await mkdir(home);
  const git = async (...args) => (await exec('git', ['-c','user.name=Fixture','-c','user.email=fixture@example.invalid','-c','commit.gpgsign=false','-c','core.hooksPath=/dev/null',...args], { cwd: origin, encoding: 'utf8' })).stdout.trim();
  await git('init', '-b', 'main', '--quiet'); await writeFile(path.join(origin, 'payload'), 'original\n'); await git('add', '.'); await git('commit', '--quiet', '-m', 'Initial published fixture');
  const validated = []; const inspected = [];
  const options = { homeDirectory: home, remoteUrl: origin, validateGitHub: async ({ revision }) => { validated.push(revision); return { revision }; }, validateCandidate: async ({ repositoryRoot, revision }) => { inspected.push({ repositoryRoot, revision }); assert.equal((await exec('git', ['rev-parse', 'HEAD'], { cwd: repositoryRoot, encoding: 'utf8' })).stdout.trim(), revision); } };
  return { base, home, origin, git, options, validated, inspected, install: overrides => prepareSkillsCheckout({ ...options, ...overrides }) };
}

test('first install uses an independently validated checkout and leaves a dirty developer clone untouched', async t => {
  const f = await fixture(t); await appendFile(path.join(f.origin, 'payload'), 'uncommitted developer edit\n');
  const installed = await f.install();
  assert.equal(installed.repositoryRoot, path.join(f.home, '.local/share/quickstark/skills'));
  assert.equal(await readFile(path.join(installed.repositoryRoot, 'payload'), 'utf8'), 'original\n');
  assert.match(await readFile(path.join(f.origin, 'payload'), 'utf8'), /developer edit/);
  assert.equal(f.validated.length, 1); assert.equal(f.inspected.length, 1);
  const again = await f.install(); assert.equal(again.changed, false); assert.equal(f.inspected.length, 1);
});

test('new published revision preserves all dirty managed-checkout files in a retained backup', async t => {
  const f = await fixture(t); const first = await f.install();
  await appendFile(path.join(first.repositoryRoot, 'payload'), 'local edit\n');
  await writeFile(path.join(first.repositoryRoot, 'untracked.txt'), 'local notes\n');
  await writeFile(path.join(f.origin, 'payload'), 'published replacement\n'); await f.git('add', '.'); await f.git('commit', '--quiet', '-m', 'Next validated release');
  const next = await f.install(); assert.equal(next.changed, true);
  assert.equal(await readFile(path.join(next.repositoryRoot, 'payload'), 'utf8'), 'published replacement\n');
  assert.match(await readFile(path.join(next.backup, 'payload'), 'utf8'), /local edit/);
  assert.equal(await readFile(path.join(next.backup, 'untracked.txt'), 'utf8'), 'local notes\n');
  assert.equal((await f.install()).changed, false);
});

test('failed GitHub or local package validation preserves the existing checkout', async t => {
  const f = await fixture(t); const first = await f.install();
  await writeFile(path.join(f.origin, 'payload'), 'next\n'); await f.git('add', '.'); await f.git('commit', '--quiet', '-m', 'Next');
  await assert.rejects(f.install({ validateGitHub: async () => { throw Error('CI failed'); } }), /CI failed/);
  await assert.rejects(f.install({ validateCandidate: async () => { throw Error('Package failed'); } }), /Package failed/);
  assert.equal(await readFile(path.join(first.repositoryRoot, 'payload'), 'utf8'), 'original\n');
});

test('an unowned install directory is preserved rather than replaced', async t => {
  const f = await fixture(t); const root = path.join(f.home, '.local/share/quickstark/skills');
  await mkdir(root, { recursive: true }); await writeFile(path.join(root, 'personal'), 'preserve');
  await assert.rejects(f.install(), /unowned directory/);
  assert.equal(await readFile(path.join(root, 'personal'), 'utf8'), 'preserve');
});

test('another running installer cannot alter the managed checkout', async t => {
  const f = await fixture(t); let release; let entered;
  const started = new Promise(resolve => entered = resolve); const blocked = new Promise(resolve => release = resolve);
  const active = f.install({ validateGitHub: async () => { entered(); await blocked; return { revision }; } });
  await started;
  try { await assert.rejects(f.install(), /Another installer owns/); } finally { release(); }
  await active;
  assert.ok(!(await readdir(path.join(f.home, '.local/state/quickstark/installer'))).includes('install.lock'));
});

test('the source lock stays held while the selected harnesses are being updated', async t => {
  const f=await fixture(t);let entered,release;const started=new Promise(r=>entered=r);const barrier=new Promise(r=>release=r);
  const active=f.install({useCheckout:async()=>{entered();await barrier;}});await started;
  try{await assert.rejects(f.install(),/Another installer owns/);}finally{release();}
  await active;
});

test('a proven dead installer lock is recovered while unknown locks are retained',async t=>{
  const f=await fixture(t);await f.install();const lock=path.join(f.home,'.local/state/quickstark/installer/install.lock');
  const child=spawn(process.execPath,['-e','']);await once(child,'close');
  await writeFile(lock,JSON.stringify({schemaVersion:1,pid:child.pid}));assert.equal((await f.install()).changed,false);
  await writeFile(lock,'unknown');await assert.rejects(f.install());assert.equal(await readFile(lock,'utf8'),'unknown');
});

test('an interrupted source swap restores the previous checkout before a failing GitHub check',async t=>{
  const f=await fixture(t);const first=await f.install();const backup=path.join(path.dirname(first.repositoryRoot),'checkout-backup-interrupted');
  await rename(first.repositoryRoot,backup);
  await writeFile(path.join(f.home,'.local/state/quickstark/installer/checkout-pending.json'),JSON.stringify({repositoryRoot:first.repositoryRoot,remoteUrl:f.origin,backup,revision:first.revision}));
  await assert.rejects(f.install({validateGitHub:async()=>{throw Error('CI unavailable');}}),/CI unavailable/);
  assert.equal(await readFile(path.join(first.repositoryRoot,'payload'),'utf8'),'original\n');
});

test('assume-unchanged cannot hide edited installer payload bytes',async t=>{
  const f=await fixture(t);const first=await f.install();
  await exec('git',['update-index','--assume-unchanged','payload'],{cwd:first.repositoryRoot});
  await appendFile(path.join(first.repositoryRoot,'payload'),'Hidden edit.');
  const next=await f.install();assert.ok(next.backup);assert.match(await readFile(path.join(next.backup,'payload'),'utf8'),/Hidden edit/);
  assert.equal(await readFile(path.join(next.repositoryRoot,'payload'),'utf8'),'original\n');
});

test('core.filemode cannot hide an executable-bit change from installer validation',async t=>{
  const f=await fixture(t);const first=await f.install();
  await exec('git',['config','core.filemode','false'],{cwd:first.repositoryRoot});await chmod(path.join(first.repositoryRoot,'payload'),0o755);
  const next=await f.install();assert.ok(next.backup);
  assert.equal(await readFile(path.join(next.repositoryRoot,'payload'),'utf8'),'original\n');
});

test('a bootstrap launched through an aliased temporary path still runs its entry point',async t=>{
  const f=await fixture(t);const alias=path.join(f.base,'bootstrap.mjs');
  await symlink(path.resolve(import.meta.dirname,'../scripts/install-skills.mjs'),alias);
  const result=await exec(process.execPath,[alias,'--help'],{encoding:'utf8'});
  assert.match(result.stdout,/QuickStark installer/);
});
