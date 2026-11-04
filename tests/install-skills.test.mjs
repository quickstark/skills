import assert from 'node:assert/strict';
import { execFile, spawn } from 'node:child_process';
import { once } from 'node:events';
import { appendFile, chmod, mkdir, mkdtemp, readFile, readdir, rename, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { promisify } from 'node:util';
import { prepareSkillsCheckout, resolvePublishedVersion } from '../scripts/install-skills.mjs';
import { parseReleaseContext, verifyPublishedReleaseFreshness } from '../scripts/update-skills.mjs';
import { runMigrationTransaction, readMigrationJournal } from '../scripts/migration-transaction.mjs';

const exec = promisify(execFile);
async function fixture(t) {
  const base = await mkdtemp(path.join(tmpdir(), 'qs-hosted-installer-')); t.after(() => rm(base, { recursive: true, force: true }));
  const origin = path.join(base, 'origin'); const home = path.join(base, 'home'); await mkdir(origin); await mkdir(home);
  const git = async (...args) => (await exec('git', ['-c','user.name=Fixture','-c','user.email=fixture@example.invalid','-c','commit.gpgsign=false','-c','core.hooksPath=/dev/null',...args], { cwd: origin, encoding: 'utf8' })).stdout.trim();
  await git('init', '-b', 'main', '--quiet'); await writeFile(path.join(origin, 'payload'), 'original\n'); await writeFile(path.join(origin, 'package.json'), JSON.stringify({version:'4.4.1'})); await git('add', '.'); await git('commit', '--quiet', '-m', 'Initial published fixture'); await git('tag', 'v4.4.1');
  const validated = []; const inspected = [];
  const options = { homeDirectory: home, remoteUrl: origin, resolveRelease: async options => { const release=await resolvePublishedVersion(options); validated.push(release.revision); return release; }, validateCandidate: async ({ repositoryRoot, revision }) => { inspected.push({ repositoryRoot, revision }); assert.equal((await exec('git', ['rev-parse', 'HEAD'], { cwd: repositoryRoot, encoding: 'utf8' })).stdout.trim(), revision); } };
  return { base, home, origin, git, options, validated, inspected, install: overrides => prepareSkillsCheckout({ ...options, ...overrides }) };
}

test('first install uses an independently validated checkout and leaves a dirty developer clone untouched', async t => {
  const f = await fixture(t); await appendFile(path.join(f.origin, 'payload'), 'uncommitted developer edit\n');
  const installed = await f.install();
  assert.equal(path.dirname(installed.repositoryRoot), path.join(f.home, '.local/share/quickstark/releases'));
  assert.equal(await readFile(path.join(f.home,'.local/share/quickstark/current/payload'),'utf8'),'original\n');
  assert.equal(await readFile(path.join(installed.repositoryRoot, 'payload'), 'utf8'), 'original\n');
  assert.match(await readFile(path.join(f.origin, 'payload'), 'utf8'), /developer edit/);
  assert.equal(f.validated.length, 1); assert.equal(f.inspected.length, 1);
  const again = await f.install(); assert.equal(again.changed, false); assert.equal(f.inspected.length, 1);
});

test('ordinary update ignores newer main and prerelease tags; stable versions sort numerically and annotated tags peel', async t => {
  const f=await fixture(t);
  for(const version of ['4.9.0','4.10.0','5.0.0-beta.1']) {
    await writeFile(path.join(f.origin,'package.json'),JSON.stringify({version}));
    await writeFile(path.join(f.origin,'payload'),version); await f.git('add','.'); await f.git('commit','--quiet','-m',version); await f.git('tag','-a',`v${version}`,'-m',version);
  }
  await writeFile(path.join(f.origin,'payload'),'unreleased main'); await f.git('add','.'); await f.git('commit','--quiet','-m','Unreleased');
  const result=await f.install();
  assert.equal(result.release.version,'4.10.0');
  assert.equal(await readFile(path.join(result.repositoryRoot,'payload'),'utf8'),'4.10.0');
  assert.equal((await exec('git',['rev-parse','HEAD'],{cwd:result.repositoryRoot,encoding:'utf8'})).stdout.trim(),await f.git('rev-parse','v4.10.0^{}'));
});

test('missing stable tags, mismatched package version, moved same-version tags and downgrades preserve installed checkout', async t => {
  const f=await fixture(t); const first=await f.install();
  await writeFile(path.join(f.origin,'payload'),'different'); await f.git('add','.'); await f.git('commit','--quiet','-m','different');
  await f.git('tag','-f','v4.4.1'); await assert.rejects(f.install(),/same version|changed.*tag/i);
  await f.git('tag','-d','v4.4.1'); await assert.rejects(f.install(),/No published stable/);
  await f.git('tag','v4.4.0'); await assert.rejects(f.install(),/downgrade/i);
  await f.git('tag','v4.4.2'); await assert.rejects(f.install(),/version.*tag/i);
  assert.equal(await readFile(path.join(first.repositoryRoot,'payload'),'utf8'),'original\n');
});

test('legacy ownership rejects a downgrade or changed source under the same version before native effects', async t => {
  for (const version of ['4.4.0', '4.4.1']) {
    const f = await fixture(t);
    await f.git('tag', '-d', 'v4.4.1');
    await writeFile(path.join(f.origin, 'package.json'), JSON.stringify({ version }));
    await f.git('add', '.'); await f.git('commit', '--quiet', '--allow-empty', '-m', 'Published version');
    await f.git('tag', `v${version}`);
    await writeFile(path.join(f.origin, 'package.json'), JSON.stringify({ version: '4.4.1' }));
    await appendFile(path.join(f.origin, 'payload'), 'unreleased legacy main\n');
    await f.git('add', '.'); await f.git('commit', '--quiet', '-m', 'Legacy main');
    const legacy = path.join(f.home, '.local/share/quickstark/skills');
    await mkdir(path.dirname(legacy), { recursive: true });
    await exec('git', ['clone', '--quiet', f.origin, legacy]);
    const state = path.join(f.home, '.local/state/quickstark/installer'); await mkdir(state, { recursive: true });
    const owner = JSON.stringify({ schemaVersion: 1, repositoryRoot: legacy, remoteUrl: f.origin, revision: await f.git('rev-parse', 'HEAD') });
    await writeFile(path.join(state, 'checkout.json'), owner);
    let effects = 0;
    await assert.rejects(f.install({ useCheckout: async () => { effects++; } }), /downgrade|same version/i);
    assert.equal(effects, 0);
    assert.equal(await readFile(path.join(state, 'checkout.json'), 'utf8'), owner);
    assert.match(await readFile(path.join(legacy, 'payload'), 'utf8'), /unreleased legacy main/);
  }
});

test('a newer published version migrates legacy ownership while retaining its source and provenance', async t => {
  const f = await fixture(t);
  const legacy = path.join(f.home, '.local/share/quickstark/skills');
  await mkdir(path.dirname(legacy), { recursive: true });
  await exec('git', ['clone', '--quiet', f.origin, legacy]);
  const state = path.join(f.home, '.local/state/quickstark/installer'); await mkdir(state, { recursive: true });
  const owner = { schemaVersion: 1, repositoryRoot: legacy, remoteUrl: f.origin, revision: await f.git('rev-parse', 'HEAD') };
  await writeFile(path.join(state, 'checkout.json'), JSON.stringify(owner));
  await appendFile(path.join(legacy, 'payload'), 'local notes\n');
  await writeFile(path.join(f.origin, 'package.json'), JSON.stringify({ version: '4.4.2' }));
  await f.git('add', '.'); await f.git('commit', '--quiet', '-m', 'Next version'); await f.git('tag', 'v4.4.2');
  assert.equal((await f.install()).release.version, '4.4.2');
  assert.deepEqual(JSON.parse(await readFile(path.join(state, 'checkout.json'))).legacyCheckout, owner);
  assert.match(await readFile(path.join(legacy, 'payload'), 'utf8'), /local notes/);
  await rm(legacy, { recursive: true });
  assert.equal((await f.install()).changed, false);
});

test('real failed journals resume at retained source after another profile installs a newer version', async t => {
  const f=await fixture(t); const first=await f.install(); const journal=path.join(f.base,'ledger','journal.jsonl');
  const discovery=path.join(f.base,'discovery'),staging=path.join(f.base,'staging'); await mkdir(discovery); await mkdir(staging);
  const target=path.join(staging,'payload');
  const plan={schemaVersion:1,id:'release-resume',revision:first.revision,evidenceHash:'b'.repeat(64),discoveryRoots:[discovery],stagingRoots:[staging],ownedRoots:[discovery,staging],steps:[{id:'stage',phase:'stage',adapter:'fixture',operation:'stage',ownedTargets:[{path:target,ownershipRecord:'fixture'}],before:{kind:'absent',path:target},after:{exists:true,contentSha256:'c'.repeat(64)}}]};
  const adapter={inspect:async()=>({kind:'absent',path:target}),prepare:async()=>{throw Error('fixture interruption');},inspectBackup:async()=>{},apply:async()=>{},recover:async()=>{}};
  const failed=await runMigrationTransaction({journalPath:journal,plan,adapters:{fixture:adapter},ownerId:'fixture'}); assert.equal(failed.status,'failed');
  assert.ok((await readMigrationJournal(journal)).events.length>1);
  await assert.rejects(f.install({useCheckout:async()=>{throw Error('native update failed');}}),/native update failed/);
  await writeFile(path.join(f.origin,'package.json'),JSON.stringify({version:'4.4.2'})); await f.git('add','.'); await f.git('commit','--quiet','-m','Next'); await f.git('tag','v4.4.2');
  const newer=await f.install(); assert.equal(newer.release.version,'4.4.2');
  assert.equal(await readFile(path.join(first.repositoryRoot,'payload'),'utf8'),'original\n');
  const originalJournal=await readFile(journal,'utf8'); await appendFile(journal,'invalid final event\n');
  let recoveryEffects=0;
  await assert.rejects(f.install({resume:journal,useCheckout:async()=>{await readMigrationJournal(journal);recoveryEffects++;return {status:'complete',results:[]};}}));
  assert.equal(recoveryEffects,0); await writeFile(journal,originalJournal);
  const resumed=await f.install({resume:journal,useCheckout:async()=>{assert.equal((await readMigrationJournal(journal)).plan.revision,first.revision);return {status:'complete',results:[]};}});
  assert.equal(resumed.revision,first.revision); assert.equal(resumed.changed,false);
  assert.equal((await f.install()).release.version,'4.4.2');
});

test('a lost child result leaves the exact old source intact across later installations', async t => {
  const f=await fixture(t); const first=await f.install();
  await assert.rejects(f.install({useCheckout:async()=>{throw Error('child interrupted');}}),/child interrupted/);
  await writeFile(path.join(f.origin,'package.json'),JSON.stringify({version:'4.4.2'})); await f.git('add','.'); await f.git('commit','--quiet','-m','Next'); await f.git('tag','v4.4.2');
  const newer=await f.install(); assert.notEqual(newer.repositoryRoot,first.repositoryRoot);
  assert.equal(await readFile(path.join(first.repositoryRoot,'payload'),'utf8'),'original\n');
});

test('explicit version selection stays pinned and unsupported old entry points fail before native effects', async t => {
  const f=await fixture(t); await writeFile(path.join(f.origin,'package.json'),JSON.stringify({version:'4.4.2'})); await f.git('add','.'); await f.git('commit','--quiet','-m','Next'); await f.git('tag','v4.4.2');
  assert.equal((await f.install({version:'4.4.1'})).release.version,'4.4.1');
  const older=await fixture(t); let effects=0;
  await assert.rejects(older.install({validateCandidate:null,useCheckout:async()=>{effects++;}}),/predates the versioned installer/);
  assert.equal(effects,0);
});

test('release transaction verifies the published tag after main advances and rejects moved tags or hidden dirty bytes', async t => {
  const f=await fixture(t); const installed=await f.install();
  const runGit=async args => {
    if(args[0]==='config') return 'https://github.com/quickstark/skills.git';
    const actual=args[0]==='ls-remote' ? ['ls-remote','--exit-code',f.origin,...args.slice(3)] : args;
    return (await exec('git',actual,{cwd:installed.repositoryRoot,encoding:'utf8'})).stdout.trim();
  };
  await writeFile(path.join(f.origin,'payload'),'unreleased main'); await f.git('add','.'); await f.git('commit','--quiet','-m','Main advances');
  const options={repositoryRoot:installed.repositoryRoot,release:installed.release,runGit};
  assert.equal((await verifyPublishedReleaseFreshness(options)).head,installed.revision);
  await assert.rejects(verifyPublishedReleaseFreshness({...options,runGit:async()=>'/foreign'}),/official/);
  await exec('git',['update-index','--assume-unchanged','payload'],{cwd:installed.repositoryRoot});
  await appendFile(path.join(installed.repositoryRoot,'payload'),'hidden edit');
  await assert.rejects(verifyPublishedReleaseFreshness(options),/bytes changed/);
  await writeFile(path.join(installed.repositoryRoot,'payload'),'original\n');
  await f.git('tag','-f','v4.4.1');
  await assert.rejects(verifyPublishedReleaseFreshness(options),/tag changed/);
});

test('release context is explicit, bounded and removed before managed flag parsing', () => {
  const value=`v4.4.1@${'a'.repeat(40)}`;
  const parsed=parseReleaseContext(['--release',value,'--agent','claude']);
  assert.deepEqual(parsed.flags,['--agent','claude']); assert.equal(parsed.release.version,'4.4.1');
  for(const args of [['--release'],['--release','main'],['--release',value,'--release',value]]) assert.throws(()=>parseReleaseContext(args));
});

test('manual publication has no test-job dependency and tags only the prepared commit, with safe retries', async t => {
  const f=await fixture(t); const remote=path.join(f.base,'published.git');
  await exec('git',['init','--bare','--quiet',remote]); await f.git('remote','add','origin',remote);
  await writeFile(path.join(f.origin,'package.json'),JSON.stringify({version:'4.4.2'})); await f.git('add','.'); await f.git('commit','--quiet','-m','Prepared version');
  const head=await f.git('rev-parse','HEAD'); const bin=path.join(f.base,'bin'); await mkdir(bin);
  const record=path.join(f.base,'release-record.json');
  await writeFile(path.join(bin,'gh'),`#!${process.execPath}\nconst fs=require('node:fs');const args=process.argv.slice(2);if(args[1]==='view')process.exit(fs.existsSync(process.env.QS_TEST_RELEASE_RECORD)?0:1);fs.writeFileSync(process.env.QS_TEST_RELEASE_RECORD,JSON.stringify(args));\n`,{mode:0o755});
  const workflow=await readFile(path.resolve(import.meta.dirname,'../.github/workflows/release.yml'),'utf8');
  assert.match(workflow,/on:\s*\n  workflow_dispatch:/); assert.doesNotMatch(workflow,/\n  push:|changeset version/);
  assert.doesNotMatch(workflow,/\bneeds:|uses: \.\/\.github\/workflows\/validate.yml|npm (?:ci|test)|validate-skill-release/);
  const validation=await readFile(path.resolve(import.meta.dirname,'../.github/workflows/validate.yml'),'utf8');
  assert.match(validation,/on:\s*\n  workflow_dispatch:/);
  assert.doesNotMatch(validation,/\n  (?:push|pull_request|workflow_call):/);
  const body=workflow.split('        run: |\n')[1].split('\n').map(line=>line.replace(/^          /,'')).join('\n');
  const script=path.join(f.base,'publish.sh'); await writeFile(script,body);
  const env={...process.env,PATH:`${bin}${path.delimiter}${process.env.PATH}`,GITHUB_SHA:head,GITHUB_REPOSITORY:'fixture/skills',QS_TEST_RELEASE_RECORD:record};
  await exec('bash',['-e',script],{cwd:f.origin,env});
  assert.equal((await exec('git',['ls-remote',remote,'refs/tags/v4.4.2^{}'],{encoding:'utf8'})).stdout.trim().split(/\s+/)[0],head);
  const first=await readFile(record,'utf8'); await exec('bash',['-e',script],{cwd:f.origin,env}); assert.equal(await readFile(record,'utf8'),first);
  await assert.rejects(exec('bash',['-e',script],{cwd:f.origin,env:{...env,GITHUB_SHA:'0'.repeat(40)}}));
});

test('new published revision preserves all dirty managed-checkout files in a retained backup', async t => {
  const f = await fixture(t); const first = await f.install();
  await appendFile(path.join(first.repositoryRoot, 'payload'), 'local edit\n');
  await writeFile(path.join(first.repositoryRoot, 'untracked.txt'), 'local notes\n');
  await writeFile(path.join(f.origin, 'payload'), 'published replacement\n'); await writeFile(path.join(f.origin,'package.json'),JSON.stringify({version:'4.4.2'})); await f.git('add', '.'); await f.git('commit', '--quiet', '-m', 'Next validated release'); await f.git('tag','v4.4.2');
  const next = await f.install(); assert.equal(next.changed, true);
  assert.equal(await readFile(path.join(next.repositoryRoot, 'payload'), 'utf8'), 'published replacement\n');
  assert.match(await readFile(path.join(next.backup, 'payload'), 'utf8'), /local edit/);
  assert.equal(await readFile(path.join(next.backup, 'untracked.txt'), 'utf8'), 'local notes\n');
  assert.equal((await f.install()).changed, false);
});

test('unavailable published tags or failed local package validation preserves the existing checkout', async t => {
  const f = await fixture(t); const first = await f.install();
  await writeFile(path.join(f.origin, 'payload'), 'next\n'); await writeFile(path.join(f.origin,'package.json'),JSON.stringify({version:'4.4.2'})); await f.git('add', '.'); await f.git('commit', '--quiet', '-m', 'Next'); await f.git('tag','v4.4.2');
  await assert.rejects(f.install({ resolveRelease: async () => { throw Error('Tags unavailable'); } }), /Tags unavailable/);
  await assert.rejects(f.install({ validateCandidate: async () => { throw Error('Package failed'); } }), /Package failed/);
  assert.equal(await readFile(path.join(first.repositoryRoot, 'payload'), 'utf8'), 'original\n');
});

test('an unowned install directory is preserved rather than replaced', async t => {
  const f = await fixture(t); const root = path.join(f.home, '.local/share/quickstark/current');
  await mkdir(root, { recursive: true }); await writeFile(path.join(root, 'personal'), 'preserve');
  await assert.rejects(f.install(), /unowned.*path/);
  assert.equal(await readFile(path.join(root, 'personal'), 'utf8'), 'preserve');
});

test('another running installer cannot alter the managed checkout', async t => {
  const f = await fixture(t); let release; let entered;
  const started = new Promise(resolve => entered = resolve); const blocked = new Promise(resolve => release = resolve);
  const active = f.install({ resolveRelease: async options => { entered(); await blocked; return resolvePublishedVersion(options); } });
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

test('a legacy interrupted source swap is restored before a failed version lookup',async t=>{
  const f=await fixture(t);const parent=path.join(f.home,'.local/share/quickstark');const legacy=path.join(parent,'skills');
  await mkdir(parent,{recursive:true}); await exec('git',['clone','--quiet',f.origin,legacy]);
  const backup=path.join(parent,'checkout-backup-interrupted');await rename(legacy,backup);
  const state=path.join(f.home,'.local/state/quickstark/installer');await mkdir(state,{recursive:true});
  await writeFile(path.join(state,'checkout-pending.json'),JSON.stringify({repositoryRoot:legacy,remoteUrl:f.origin,backup}));
  await assert.rejects(f.install({resolveRelease:async()=>{throw Error('Tags unavailable');}}),/Tags unavailable/);
  assert.equal(await readFile(path.join(legacy,'payload'),'utf8'),'original\n');
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
