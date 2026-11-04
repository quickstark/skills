import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, mkdir, readFile, readlink, writeFile, appendFile, rm, symlink, chmod, lchmod } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import test from 'node:test';
import { derivePackageAcceptanceObligations, buildManagedSkillInput } from '../scripts/managed-skill-input.mjs';
import { executeManagedSkills, parseManagedSkillsArguments } from '../scripts/managed-skills.mjs';
import { previewManagedSkillMigration, captureManagedSkillPayload, restoreManagedSkillMigration, executeManagedSkillMigration } from '../scripts/managed-skill-migration.mjs';
import { captureMigrationPath } from '../scripts/migration-filesystem.mjs';
import { TARGET_SKILL_COLLECTIONS, REGISTRY_STATE } from '../scripts/skill-collection-registry.mjs';
import { runNativePackageCommand } from '../scripts/migration-native-packages.mjs';
import { readMigrationJournal } from '../scripts/migration-transaction.mjs';
import { desiredLockFields } from '../scripts/personal-skills/lock.mjs';
import { resolveManagedSkillPaths } from '../scripts/managed-skill-paths.mjs';
import { fixtureHomeState } from './helpers/fixture-home-state.mjs';
import { updateInstalledHarnesses } from '../scripts/update-skills.mjs';
import { pendingManagedRepair, repairManagedPackages } from '../scripts/managed-package-repair.mjs';

const available = (host) => (process.env.PATH ?? '').split(path.delimiter).some((root) => existsSync(path.join(root, host)));
const nativeTest = (name, callback) => test(name, { skip: !available('codex') || name.startsWith('actual Pi') && !available('pi') ? 'Required native executable unavailable; no host support claimed.' : false }, callback);
const run = promisify(execFile); const actualRoot = path.resolve(import.meta.dirname, '..');
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const writeJSON = async (file, data) => { await mkdir(path.dirname(file), {recursive:true}); await writeFile(file, JSON.stringify(data,null,2)+'\n'); };
const readJSON = async (file) => JSON.parse(await readFile(file));
async function git(root, args) { return run('git', ['-c','core.hooksPath=/dev/null','-c','commit.gpgsign=false','-c','user.name=Isolated Fixture','-c','user.email=fixture@example.invalid',...args],{cwd:root,encoding:'utf8'}); }
async function fixture(t, {bootstrap = true, host = 'codex', version = '4.0.0'} = {}) {
  const base = await mkdtemp(path.join(tmpdir(),'qs-selected-caller-')); t.after(()=>rm(base,{recursive:true,force:true}));
  const repositoryRoot = path.join(base,'repo'); const homeDirectory = path.join(base,'home'); await mkdir(repositoryRoot); await mkdir(path.join(homeDirectory,'.codex'),{recursive:true}); await mkdir(path.join(homeDirectory,'.pi/agent'),{recursive:true});
  const document = await readJSON(path.join(actualRoot,'config/skill-migrations.json'));
  await writeJSON(path.join(repositoryRoot,'config/skill-migrations.json'),document);
  await writeJSON(path.join(repositoryRoot,'config/skill-profiles.json'),{schemaVersion:1,defaultProfile:'core',profiles:{core:{packages:['qs-skills'],resources:[]},advanced:{packages:['qs-skills','qs-advanced'],resources:[]}}});
  await writeJSON(path.join(repositoryRoot,'config/skill-provenance.json'),{fixture:'Synthetic test evidence only; never production acceptance.'});
  await writeJSON(path.join(repositoryRoot,'package.json'),{name:'isolated-selected-test',version});
  for(const collection of TARGET_SKILL_COLLECTIONS) for(const [agent,relative] of [['codex',collection.codexPackageRoot],['pi',collection.piPackageRoot],['claude-code',collection.claudePackageRoot]]) {
    const root=path.join(repositoryRoot,relative);
    for(const name of collection.publicCommands) { await mkdir(path.join(root,'skills',name),{recursive:true}); await writeFile(path.join(root,'skills',name,'SKILL.md'),`---\nname: ${name}\ndescription: Isolated synthetic fixture.\n---\nFixture only.\n`); }
    await writeJSON(path.join(root,agent==='codex'?'.codex-plugin/plugin.json':agent==='claude-code'?'.claude-plugin/plugin.json':'package.json'),agent==='codex'?{name:collection.id,version,skills:'./skills/'}:agent==='claude-code'?{name:collection.id,version,skills:collection.publicCommands.map(name=>`./skills/${name}`)}:{name:collection.id,version,private:true,pi:{skills:['./skills']}});
  }
  await writeJSON(path.join(repositoryRoot,'.claude-plugin/marketplace.json'),{name:'quickstark',owner:{name:'Fixture'},plugins:TARGET_SKILL_COLLECTIONS.map(entry=>({name:entry.id,source:`./${entry.claudePackageRoot}`}))});
  const definitions=TARGET_SKILL_COLLECTIONS.map(entry=>({name:entry.id,source:{source:'local',path:`./plugins/${entry.id}`},policy:{installation:'AVAILABLE',authentication:'ON_INSTALL'}}));
  await writeJSON(path.join(repositoryRoot,'codex/.agents/plugins/marketplace.json'),{name:'quickstark',plugins:definitions});
  const obligations=TARGET_SKILL_COLLECTIONS.map(collection=>derivePackageAcceptanceObligations(collection.id,document));
  for(const file of new Set(obligations.flatMap(entry=>entry.sourcePaths))) {
    if(file.startsWith('config/')) continue;
    if(!path.extname(file)) { await mkdir(path.join(repositoryRoot,file),{recursive:true}); await writeFile(path.join(repositoryRoot,file,'fixture.txt'),'Synthetic canonical criterion input.\n'); }
    else { await mkdir(path.dirname(path.join(repositoryRoot,file)),{recursive:true}); await writeFile(path.join(repositoryRoot,file),'Synthetic criterion input.\n'); }
  }
  const support='docs/validation/fixture-support.txt'; await mkdir(path.dirname(path.join(repositoryRoot,support)),{recursive:true}); await writeFile(path.join(repositoryRoot,support),'Synthetic isolated acceptance decisions; not release proof.\n');
  const audit={schemaVersion:1,kind:'reviewed-adoption-acceptance',packages:{},criteria:{},sources:{},evidence:{fixture:{path:support,sha256:sha(await readFile(path.join(repositoryRoot,support)))}}};
  for(const item of obligations) {
    audit.packages[item.packageId]={capabilityIds:item.capabilityIds,sourcePaths:item.sourcePaths,criteria:item.requiredCriteria,checks:Object.fromEntries(['codex','pi','claude-code'].map(agent=>[agent,Object.fromEntries(item.requiredChecks.map(name=>[name,{status:'passed',evidence:['fixture']}]))]))};
    for(const id of item.requiredCriteria) audit.criteria[id]={status:'passed',note:'Explicit synthetic fixture decision only.',evidence:['fixture']};
    for(const source of item.sourcePaths) { const snapshot=await captureMigrationPath(path.join(repositoryRoot,source)); audit.sources[source]={kind:snapshot.kind,contentSha256:snapshot.contentSha256}; }
  }
  await writeJSON(path.join(repositoryRoot,'docs/validation/upstream-adoption-acceptance.json'),audit);
  await git(repositoryRoot,['init','--quiet']); await git(repositoryRoot,['add','.']); await git(repositoryRoot,['commit','--quiet','-m','Synthetic fixture']);
  const revision=(await git(repositoryRoot,['rev-parse','HEAD'])).stdout.trim();
  const nativeOptions={homeDirectory,cwd:repositoryRoot};
  // Initialize launcher state before the nonmutation baseline; version managers
  // may create HOME-local state (including symlinks) even for read-only commands.
  await runNativePackageCommand('codex',['--version'],nativeOptions);
  if(bootstrap && host==='codex') await runNativePackageCommand('codex',['plugin','marketplace','add',path.join(repositoryRoot,'codex')],nativeOptions);
  if(bootstrap && host==='claude-code') await runNativePackageCommand('claude',['plugin','marketplace','add',repositoryRoot],nativeOptions);
  await writeJSON(path.join(homeDirectory,'.pi/agent/settings.json'),{theme:'community-preserved',packages:['npm:fixture-community-theme'],quietStartup:true});
  const options={repositoryRoot,homeDirectory,environment:{},agents:[host],registryState:'target',verifyRepositoryFreshness:async()=>({head:revision,originMain:revision})};
  return {base,repositoryRoot,homeDirectory,revision,document,options,nativeOptions,audit};
}

async function failedVersionedRepair(t) {
  const args=await fixture(t,{bootstrap:false,version:'4.4.1'});
  const releases=path.join(args.homeDirectory,'.local/share/quickstark/releases');await mkdir(releases,{recursive:true});
  const old=path.join(releases,'v4.4.1-fixture');await git(args.base,['clone','--quiet','--no-hardlinks',args.repositoryRoot,old]);
  await git(old,['remote','set-url','origin','https://github.com/quickstark/skills.git']);
  const agents=['codex','pi'];const paths=resolveManagedSkillPaths({...args.options,agents});
  const nativeOptions={...args.nativeOptions,cwd:old};
  await runNativePackageCommand('codex',['plugin','marketplace','add',path.join(old,'codex')],nativeOptions);
  for(const id of ['qs-skills','qs-advanced'])await runNativePackageCommand('codex',['plugin','add',`${id}@quickstark`,'--json'],nativeOptions);
  const repair=await repairManagedPackages({repositoryRoot:old,paths,agents});
  let interrupted=false;
  const runtime={runCommand:async(command,argv,context)=>{
    const result=await runNativePackageCommand(command,argv,context);
    if(!interrupted&&command==='codex'&&argv[1]==='add'&&argv[2]==='qs-advanced@quickstark') {
      interrupted=true;
      const file=path.join(args.homeDirectory,'.codex/config.toml');
      const text=await readFile(file,'utf8');const index=text.indexOf('[plugins."qs-advanced@quickstark"]');assert.ok(index>=0);
      await writeFile(file,text.slice(0,index)+'[projects."/fixture-preserved"]\ntrust_level = "trusted"\n\n'+text.slice(index).replace(/enabled\s*=\s*true/,'enabled = true # fixture inline note\n# fixture trailing note'));
      throw Error('Owned Codex table contains settings unsupported by reversible migration.');
    }
    return result;
  }};
  const failed=await updateInstalledHarnesses({...args.options,repositoryRoot:old,runtime,repairManagedPackages:true,arguments_:['--agent','codex','--agent','pi']});
  assert.equal(failed.status,'failed');assert.ok(interrupted);assert.equal((await readJSON(repair.recordPath)).status,'prepared-for-install');
  const journalPath=failed.results[0].journalPath;assert.ok(journalPath);await readMigrationJournal(journalPath);
  const priorRecord=await readFile(repair.recordPath,'utf8');const priorJournal=await readFile(journalPath,'utf8');
  for(const file of ['package.json',...TARGET_SKILL_COLLECTIONS.flatMap(c=>[`${c.codexPackageRoot}/.codex-plugin/plugin.json`,`${c.claudePackageRoot}/.claude-plugin/plugin.json`,`${c.piPackageRoot}/package.json`])]) {
    const data=await readJSON(path.join(args.repositoryRoot,file));data.version='4.4.2';await writeJSON(path.join(args.repositoryRoot,file),data);
  }
  const audit=await readJSON(path.join(args.repositoryRoot,'docs/validation/upstream-adoption-acceptance.json'));
  for(const source of Object.keys(audit.sources)) {const snapshot=await captureMigrationPath(path.join(args.repositoryRoot,source));audit.sources[source]={kind:snapshot.kind,contentSha256:snapshot.contentSha256};}
  await writeJSON(path.join(args.repositoryRoot,'docs/validation/upstream-adoption-acceptance.json'),audit);
  await git(args.repositoryRoot,['add','.']);await git(args.repositoryRoot,['commit','--quiet','-m','Synthetic published 4.4.2']);
  const revision=(await git(args.repositoryRoot,['rev-parse','HEAD'])).stdout.trim();
  const newer=path.join(releases,'v4.4.2-fixture');await git(args.base,['clone','--quiet','--no-hardlinks',args.repositoryRoot,newer]);
  await git(newer,['remote','set-url','origin','https://github.com/quickstark/skills.git']);
  const ownerPath=path.join(args.homeDirectory,'.local/state/quickstark/installer/checkout.json');
  const owner={schemaVersion:2,remoteUrl:'https://github.com/quickstark/skills.git',repositoryRoot:newer,releases:[{repositoryRoot:old,version:'4.4.1',tag:'v4.4.1',revision:args.revision},{repositoryRoot:newer,version:'4.4.2',tag:'v4.4.2',revision}]};
  await writeJSON(ownerPath,owner);
  const options={...args.options,repositoryRoot:newer,agents,verifyRepositoryFreshness:async()=>({head:revision,originMain:revision})};
  return {...args,old,newer,repair,priorRecord,priorJournal,journalPath,paths,agents,options,owner,ownerPath};
}

test('a failed 4.4.1 Codex and Pi install continues on 4.4.2 without discarding its receipt or journal', {skip:!['codex','pi'].every(available)}, async t=>{
  const f=await failedVersionedRepair(t);
  const oldBackups=await captureMigrationPath(path.dirname(f.repair.recordPath));
  const result=await updateInstalledHarnesses({...f.options,repairManagedPackages:true,arguments_:['--agent','codex','--agent','pi']});
  assert.equal(result.status,'complete',JSON.stringify(result.results));
  const successor=await readJSON(result.results[0].repairJournalPath);
  assert.notEqual(result.results[0].repairJournalPath,f.repair.recordPath);
  assert.equal(successor.previousRecord,f.repair.recordPath);assert.equal(successor.repositoryRoot,f.newer);assert.equal(successor.status,'complete');
  assert.equal(successor.previousRecordContentSha256,(await captureMigrationPath(f.repair.recordPath)).contentSha256);
  assert.equal(await readFile(f.repair.recordPath,'utf8'),f.priorRecord);assert.equal(await readFile(f.journalPath,'utf8'),f.priorJournal);
  assert.deepEqual(await captureMigrationPath(oldBackups.path),oldBackups);
  assert.equal(await pendingManagedRepair({repositoryRoot:f.newer,paths:f.paths,agents:f.agents}),null);
  assert.deepEqual([...result.results[0].targets.codex.desired.packages].sort(),['qs-advanced','qs-skills']);
  assert.deepEqual(result.results[0].targets.pi.desired.packages,['qs-skills']);
  const config=await readFile(path.join(f.homeDirectory,'.codex/config.toml'),'utf8');
  assert.match(config,/\[projects\."\/fixture-preserved"\]/);assert.match(config,/# fixture trailing note/);
  const settings=await readJSON(path.join(f.homeDirectory,'.pi/agent/settings.json'));
  assert.equal(settings.theme,'community-preserved');assert.ok(settings.packages.includes('npm:fixture-community-theme'));
  assert.equal((await executeManagedSkills({...f.options,action:'verify'})).status,'verified');
});

for(const defect of ['unrecorded source','edited old source','changed backup','different agents','different home','unrelated history','changed selection']) test(`published repair continuation rejects ${defect} before native effects`, {skip:!['codex','pi'].every(available)}, async t=>{
  const f=await failedVersionedRepair(t);let flags=['--agent','codex','--agent','pi'];let expected;
  if(defect==='unrecorded source') {f.owner.releases.pop();await writeJSON(f.ownerPath,f.owner);expected=/release ledger/;}
  if(defect==='edited old source') {await appendFile(path.join(f.old,'package.json'),' ');expected=/retained source changed/;}
  if(defect==='changed backup') {await appendFile(f.repair.snapshots.find(entry=>entry.snapshot.kind==='file').destination,'changed');expected=/backup changed/;}
  if(defect==='different agents') {flags=['--agent','codex'];expected=/harness group/;}
  if(defect==='different home') {
    const record=await readJSON(f.repair.recordPath);record.snapshots.find(entry=>entry.snapshot.path.endsWith('/config.toml')).snapshot.path=path.join(f.homeDirectory,'other-codex/config.toml');
    await writeJSON(f.repair.recordPath,record);expected=/configuration home/;
  }
  if(defect==='unrelated history') {
    await git(f.old,['checkout','--quiet','--orphan','unrelated-fixture']);await git(f.old,['commit','--quiet','-m','Unrelated history']);
    const revision=(await git(f.old,['rev-parse','HEAD'])).stdout.trim();f.owner.releases[0].revision=revision;await writeJSON(f.ownerPath,f.owner);
    const record=await readJSON(f.repair.recordPath);record.revision=revision;await writeJSON(f.repair.recordPath,record);expected=/not an ancestor/;
  }
  if(defect==='changed selection') {flags.push('--with','qs-video');expected=/frozen selection/;}
  const before=await fixtureHomeState(f.homeDirectory);let mutations=0;
  const runtime={runCommand:async(command,argv,context)=>{if(argv[0]==='install'||argv[0]==='remove'||argv[0]==='plugin'&&!(argv[1]==='list'||argv[1]==='marketplace'&&argv[2]==='list'))mutations++;return runNativePackageCommand(command,argv,context);}};
  const result=await updateInstalledHarnesses({...f.options,runtime,repairManagedPackages:true,arguments_:flags});
  assert.equal(result.status,'failed');assert.match(result.results[0].error,expected);assert.equal(mutations,0);
  assert.deepEqual(await fixtureHomeState(f.homeDirectory),before);
});

test('published repair continuation validates replacement packages before replacing its pointer', {skip:!['codex','pi'].every(available)}, async t=>{
  const f=await failedVersionedRepair(t);const before=await fixtureHomeState(f.homeDirectory);
  const result=await updateInstalledHarnesses({...f.options,repairManagedPackages:true,arguments_:['--agent','codex','--agent','pi'],runtime:{validateRepairRelease:async()=>{throw Error('Replacement acceptance rejected.');}}});
  assert.equal(result.status,'failed');assert.match(result.results[0].error,/Replacement acceptance rejected/);
  assert.deepEqual(await fixtureHomeState(f.homeDirectory),before);
});

test('published repair continuation retries a successor interrupted after withdrawal', {skip:!['codex','pi'].every(available)}, async t=>{
  const f=await failedVersionedRepair(t);let interrupted=false;
  const runtime={runCommand:async(command,argv,context)=>{const result=await runNativePackageCommand(command,argv,context);if(!interrupted&&command==='codex'&&argv[1]==='remove'){interrupted=true;throw Error('Interrupted successor withdrawal.');}return result;}};
  const failed=await updateInstalledHarnesses({...f.options,runtime,repairManagedPackages:true,arguments_:['--agent','codex','--agent','pi']});
  assert.equal(failed.status,'failed');assert.ok(interrupted);
  const successorPath=failed.results[0].repairJournalPath;assert.notEqual(successorPath,f.repair.recordPath);
  const successor=await readJSON(successorPath);assert.equal(successor.status,'failed');assert.equal(successor.previousRecord,f.repair.recordPath);
  assert.equal((await pendingManagedRepair({repositoryRoot:f.newer,paths:f.paths,agents:f.agents})).recordPath,successorPath);
  const retried=await updateInstalledHarnesses({...f.options,repairManagedPackages:true,arguments_:['--agent','codex','--agent','pi']});
  assert.equal(retried.status,'complete',JSON.stringify(retried.results));
  assert.deepEqual([...retried.results[0].targets.codex.desired.packages].sort(),['qs-advanced','qs-skills']);
  assert.equal(await readFile(f.repair.recordPath,'utf8'),f.priorRecord);assert.equal(await readFile(f.journalPath,'utf8'),f.priorJournal);
  assert.equal(await pendingManagedRepair({repositoryRoot:f.newer,paths:f.paths,agents:f.agents}),null);
  assert.equal((await executeManagedSkills({...f.options,action:'verify'})).status,'verified');
});

test('home nonmutation oracle observes links without following them and leaves payload rejection strict',async t=>{
  const base=await mkdtemp(path.join(tmpdir(),'qs-home-oracle-'));t.after(()=>rm(base,{recursive:true,force:true}));
  const home=path.join(base,'home');await mkdir(home);await writeFile(path.join(base,'external'),'original');
  const link=path.join(home,'link');await symlink('../external',link);
  const before=await fixtureHomeState(home);
  await writeFile(path.join(base,'external'),'outside home');assert.deepEqual(await fixtureHomeState(home),before);
  await assert.rejects(captureMigrationPath(home),/descendant symbolic link/);
  await rm(link);await symlink('../missing',link);assert.notDeepEqual(await fixtureHomeState(home),before);
  await rm(link);await symlink('../external',link);assert.deepEqual(await fixtureHomeState(home),before);
  await writeFile(path.join(home,'.hidden'),'new');assert.notDeepEqual(await fixtureHomeState(home),before);
  const withFile=await fixtureHomeState(home);await writeFile(path.join(home,'.hidden'),'changed');assert.notDeepEqual(await fixtureHomeState(home),withFile);
});

test('a large original-cache recovery record remains readable for ordinary repair retries',async t=>{
  const base=await mkdtemp(path.join(tmpdir(),'qs-large-repair-record-'));t.after(()=>rm(base,{recursive:true,force:true}));
  const paths={backupRoot:path.join(base,'backups'),transactionRoot:path.join(base,'transactions')};
  const repositoryRoot=path.join(base,'repo');const recordPath=path.join(paths.backupRoot,'repair-fixture/repair.json');
  const originalEvidence='x'.repeat(3*1024*1024);
  await writeJSON(recordPath,{schemaVersion:1,status:'prepared',selection:{},snapshots:[{originalEvidence}]});
  await writeJSON(path.join(paths.transactionRoot,'managed-repair-pending.json'),{schemaVersion:1,repositoryRoot,agents:['codex'],recordPath,selectionSha256:sha('{}')});
  const record=await pendingManagedRepair({paths,repositoryRoot,agents:['codex']});
  assert.equal(record.status,'prepared');assert.equal(record.snapshots[0].originalEvidence.length,originalEvidence.length);
});

test('catalog obligations retain prompt, parity, all video modules and measured efficiency decisions',async()=>{
  const document=await readJSON(path.join(actualRoot,'config/skill-migrations.json'));
  const advanced=derivePackageAcceptanceObligations('qs-advanced',document); assert.ok(advanced.capabilityIds.includes('ps:ps-visual-parity')); assert.equal(advanced.capabilityIds.filter(id=>id.startsWith('ps-internal:')).length,16);
  const video=derivePackageAcceptanceObligations('qs-video',document); assert.equal(video.capabilityIds.filter(id=>id.startsWith('video-internal:')).length,21); assert.ok(video.requiredChecks.includes('video-runtime'));
  assert.ok(derivePackageAcceptanceObligations('qs-specialists',document).capabilityIds.includes('qs:qs-deploy-prompt'));
  assert.ok(advanced.requiredCriteria.includes('AC-09')); assert.throws(()=>derivePackageAcceptanceObligations('ps-skills',document),/Unknown/);
});

test('actual Codex and Pi update accepts commented enablement while preserving optional selection', {skip:!['codex','pi'].every(available) ? 'Codex or Pi unavailable; combined native update unverified.' : false}, async t=>{
  const args=await fixture(t);
  assert.equal((await executeManagedSkills({...args.options,action:'update',withPackages:['qs-advanced']})).status,'complete');
  const file=path.join(args.homeDirectory,'.codex/config.toml');
  const original=await readFile(file,'utf8');
  const header='[plugins."qs-advanced@quickstark"]';
  const index=original.indexOf(header);assert.ok(index>=0);
  const commented=original.slice(0,index)+original.slice(index).replace(/enabled\s*=\s*true/,'# fixture setting note\nenabled = true # fixture inline note');
  await writeFile(file,commented);
  const result=await updateInstalledHarnesses({...args.options,repairManagedPackages:true,arguments_:['--agent','codex','--agent','pi']});
  assert.equal(result.status,'complete',JSON.stringify(result.results));
  assert.deepEqual([...result.results[0].targets.codex.desired.packages].sort(),['qs-advanced','qs-skills']);
  assert.deepEqual(result.results[0].targets.pi.desired.packages,['qs-skills']);
  assert.equal(await readFile(file,'utf8'),commented,'A same-version verification must retain the commented Codex config.');
  const settings=await readJSON(path.join(args.homeDirectory,'.pi/agent/settings.json'));
  assert.equal(settings.theme,'community-preserved');assert.ok(settings.packages.includes('npm:fixture-community-theme'));
  assert.equal((await executeManagedSkills({...args.options,agents:['codex','pi'],action:'verify'})).status,'verified');
});

test('a prepared Codex and Pi repair completes from its bound source with commented enablement', {skip:!['codex','pi'].every(available) ? 'Codex or Pi unavailable; pending native repair unverified.' : false}, async t=>{
  const args=await fixture(t,{bootstrap:false});const old=path.join(args.base,'old-source');
  await git(args.base,['clone','--quiet','--no-hardlinks',args.repositoryRoot,old]);
  await git(old,['remote','set-url','origin','https://github.com/quickstark/skills.git']);
  await runNativePackageCommand('codex',['plugin','marketplace','add',path.join(old,'codex')],args.nativeOptions);
  for(const id of ['qs-skills','qs-advanced']) await runNativePackageCommand('codex',['plugin','add',`${id}@quickstark`,'--json'],args.nativeOptions);
  const agents=['codex','pi'];const paths=resolveManagedSkillPaths({...args.options,agents});
  const repair=await repairManagedPackages({repositoryRoot:args.repositoryRoot,paths,agents});
  assert.equal(repair.status,'prepared-for-install');
  assert.equal((await pendingManagedRepair({repositoryRoot:args.repositoryRoot,paths,agents})).recordPath,repair.recordPath);
  await assert.rejects(pendingManagedRepair({repositoryRoot:old,paths,agents}),/another checkout/);
  await runNativePackageCommand('codex',['plugin','add','qs-advanced@quickstark','--json'],args.nativeOptions);
  const file=path.join(args.homeDirectory,'.codex/config.toml');
  await writeFile(file,(await readFile(file,'utf8')).replace(/enabled\s*=\s*true/,'# fixture setting note\nenabled = true # fixture inline note'));
  const result=await updateInstalledHarnesses({...args.options,repairManagedPackages:true,arguments_:['--agent','codex','--agent','pi']});
  assert.equal(result.status,'complete',JSON.stringify(result.results));
  assert.equal(result.results[0].repairJournalPath,repair.recordPath);
  assert.equal((await readJSON(repair.recordPath)).status,'complete');
  assert.equal(await pendingManagedRepair({repositoryRoot:args.repositoryRoot,paths,agents}),null);
  assert.deepEqual([...result.results[0].targets.codex.desired.packages].sort(),['qs-advanced','qs-skills']);
  assert.deepEqual(result.results[0].targets.pi.desired.packages,['qs-skills']);
  const settings=await readJSON(path.join(args.homeDirectory,'.pi/agent/settings.json'));
  assert.equal(settings.theme,'community-preserved');assert.ok(settings.packages.includes('npm:fixture-community-theme'));
  assert.equal((await executeManagedSkills({...args.options,agents,action:'verify'})).status,'verified');
});

nativeTest('automatic Codex update uses scoped inventory when global remote inventory is unavailable',async t=>{
  const args=await fixture(t);
  const foreign=path.join(args.homeDirectory,'.codex/plugins/cache/remote-vendor/demo/1.0.0/skills/vendor-helper');
  await mkdir(foreign,{recursive:true});await writeFile(path.join(foreign,'SKILL.md'),'---\nname: vendor-helper\ndescription: Preserve this foreign cache.\n---\nForeign instructions.\n');
  const before=await captureMigrationPath(path.join(args.homeDirectory,'.codex/plugins/cache/remote-vendor'));
  let scoped=0;
  const runtime={runCommand:async(command,argv,context)=>{
    if(command==='codex'&&argv[0]==='plugin'&&argv[1]==='list') {
      if(!argv.includes('--marketplace'))throw Error('Unrelated remote inventory is unavailable.');
      scoped++;
    }
    return runNativePackageCommand(command,argv,context);
  }};
  const result=await updateInstalledHarnesses({...args.options,runtime,arguments_:['--agent','codex']});
  assert.equal(result.status,'complete',JSON.stringify(result.results));assert.ok(scoped>0);
  assert.deepEqual(await captureMigrationPath(before.path),before);
  assert.equal((await executeManagedSkills({...args.options,runtime,action:'verify'})).status,'verified');
});

nativeTest('actual Codex same-version verification tolerates cache directory permissions without changing files',async t=>{
  const args=await fixture(t);
  const result=await executeManagedSkills({...args.options,action:'update'});
  assert.equal(result.status,'complete',result.error);
  const cache=path.join(args.homeDirectory,'.codex/plugins/cache/quickstark/qs-skills/4.0.0');
  const before=await captureMigrationPath(cache);
  for(const entry of before.entries.filter(entry=>entry.kind==='directory')) await chmod(path.join(cache,entry.path),0o700);
  const changed=await captureMigrationPath(cache);
  assert.notEqual(changed.contentSha256,before.contentSha256);
  const input=await buildManagedSkillInput(args.options);
  const preview=await previewManagedSkillMigration(input);
  assert.equal(preview.status,'ready',JSON.stringify(preview.conflicts));
  assert.equal((await executeManagedSkills({...args.options,action:'verify'})).status,'verified');
  assert.deepEqual(await captureMigrationPath(cache),changed,'Verification must not chmod the installed cache');
});

nativeTest('installer repairs edited Codex bytes only after retaining verified originals and accepted replacements',async t=>{
  const args=await fixture(t); await git(args.repositoryRoot,['remote','add','origin','https://github.com/quickstark/skills.git']);
  assert.equal((await executeManagedSkills({...args.options,action:'update'})).status,'complete');
  const cache=path.join(args.homeDirectory,'.codex/plugins/cache/quickstark/qs-skills/4.0.0');
  const file=path.join(cache,'skills/qs-help/SKILL.md'); await appendFile(file,'Local installed edit preserved by repair.\n');
  const before=await captureMigrationPath(cache);
  const result=await updateInstalledHarnesses({...args.options,repairManagedPackages:true,arguments_:['--agent','codex']});
  assert.equal(result.status,'complete',JSON.stringify(result.results));
  const record=await readJSON(result.results[0].repairJournalPath); assert.equal(record.status,'complete');
  const original=record.snapshots.find(entry=>entry.snapshot.path===path.dirname(path.dirname(cache)));
  assert.ok(original); assert.match(await readFile(path.join(original.destination,'qs-skills/4.0.0/skills/qs-help/SKILL.md'),'utf8'),/Local installed edit preserved/);
  assert.notEqual((await captureMigrationPath(cache)).contentSha256,before.contentSha256);
  assert.equal((await executeManagedSkills({...args.options,action:'verify'})).status,'verified');
});

nativeTest('repair preserves a package edited after another package was withdrawn',async t=>{
  const args=await fixture(t); await git(args.repositoryRoot,['remote','add','origin','https://github.com/quickstark/skills.git']);
  assert.equal((await executeManagedSkills({...args.options,action:'update',withPackages:['qs-advanced']})).status,'complete');
  const cache=path.join(args.homeDirectory,'.codex/plugins/cache/quickstark');
  await appendFile(path.join(cache,'qs-skills/4.0.0/skills/qs-help/SKILL.md'),'Trigger repair.');
  let changedFile; let withdrawals=0;
  const runtime={runCommand:async(command,argv,context)=>{
    const result=await runNativePackageCommand(command,argv,context);
    if(argv[1]==='remove') {
      withdrawals++;
      const other=argv[2]==='qs-skills@quickstark'?'qs-advanced':'qs-skills';
      const name=TARGET_SKILL_COLLECTIONS.find(c=>c.id===other).publicCommands[0];
      changedFile=path.join(cache,other,'4.0.0/skills',name,'SKILL.md');
      await appendFile(changedFile,'Concurrent installed edit must survive.');
    }
    return result;
  }};
  const result=await updateInstalledHarnesses({...args.options,runtime,repairManagedPackages:true,arguments_:['--agent','codex']});
  assert.equal(result.status,'failed'); assert.equal(withdrawals,1);
  assert.match(await readFile(changedFile,'utf8'),/Concurrent installed edit must survive/);
  assert.ok(result.results[0].repairJournalPath);
});

nativeTest('repair replacement validation failure leaves installed bytes and registration unchanged',async t=>{
  const args=await fixture(t); await git(args.repositoryRoot,['remote','add','origin','https://github.com/quickstark/skills.git']);
  assert.equal((await executeManagedSkills({...args.options,action:'update'})).status,'complete');
  await appendFile(path.join(args.homeDirectory,'.codex/plugins/cache/quickstark/qs-skills/4.0.0/skills/qs-help/SKILL.md'),'Edited.');
  const before=await fixtureHomeState(args.homeDirectory);
  const result=await updateInstalledHarnesses({...args.options,repairManagedPackages:true,arguments_:['--agent','codex'],runtime:{validateRepairRelease:async()=>{throw Error('Replacement acceptance rejected.');}}});
  assert.equal(result.status,'failed'); assert.match(result.results[0].error,/Replacement acceptance rejected/);
  assert.deepEqual(await fixtureHomeState(args.homeDirectory),before);
});

nativeTest('installer changes an old QuickStark source binding while preserving its dirty checkout',async t=>{
  const args=await fixture(t,{bootstrap:false}); const old=path.join(args.base,'old-source');
  await git(args.base,['clone','--quiet','--no-hardlinks',args.repositoryRoot,old]);
  await git(old,['remote','set-url','origin','https://github.com/quickstark/skills.git']);
  await runNativePackageCommand('codex',['plugin','marketplace','add',path.join(old,'codex')],args.nativeOptions);
  await runNativePackageCommand('codex',['plugin','add','qs-skills@quickstark','--json'],args.nativeOptions);
  await appendFile(path.join(old,'codex/plugins/qs-skills/skills/qs-help/SKILL.md'),'Dirty source edit must survive.\n');
  const before=await fixtureHomeState(old);
  const result=await updateInstalledHarnesses({...args.options,repairManagedPackages:true,arguments_:['--agent','codex']});
  assert.equal(result.status,'complete',JSON.stringify(result.results));
  assert.deepEqual(await fixtureHomeState(old),before);
  assert.equal((await executeManagedSkills({...args.options,action:'verify'})).status,'verified');
  const market=JSON.parse((await runNativePackageCommand('codex',['plugin','marketplace','list','--json'],args.nativeOptions)).stdout).marketplaces.find(m=>m.name==='quickstark');
  assert.equal(market.root,path.join(args.repositoryRoot,'codex'));
});

nativeTest('installer reconciles an old catalog while retaining later-package selections and caches',async t=>{
  const args=await fixture(t,{bootstrap:false});const old=path.join(args.base,'old-source');
  await git(args.base,['clone','--quiet','--no-hardlinks',args.repositoryRoot,old]);await git(old,['remote','set-url','origin','https://github.com/quickstark/skills.git']);
  await runNativePackageCommand('codex',['plugin','marketplace','add',path.join(old,'codex')],args.nativeOptions);
  for(const c of TARGET_SKILL_COLLECTIONS)await runNativePackageCommand('codex',['plugin','add',`${c.id}@quickstark`,'--json'],args.nativeOptions);
  const packages=TARGET_SKILL_COLLECTIONS.map(c=>c.id).sort();
  await writeJSON(path.join(args.homeDirectory,'.config/quickstark/skills-selection.json'),{schemaVersion:1,targets:{codex:{packages,resources:[],profile:null,additions:packages.filter(id=>id!=='qs-skills')}},templateRevision:args.revision,lastSuccessfulTransaction:null});
  const file=path.join(old,'codex/.agents/plugins/marketplace.json');const catalog=await readJSON(file);catalog.plugins=catalog.plugins.filter(p=>['qs-skills','qs-specialists'].includes(p.name));await writeJSON(file,catalog);const original=await readFile(file,'utf8');
  const result=await updateInstalledHarnesses({...args.options,repairManagedPackages:true,arguments_:['--agent','codex']});
  assert.equal(result.status,'complete',JSON.stringify(result.results));
  assert.deepEqual([...result.results[0].targets.codex.desired.packages].sort(),packages);
  assert.equal(await readFile(file,'utf8'),original);
  assert.equal((await executeManagedSkills({...args.options,action:'verify'})).status,'verified');
});

nativeTest('installer retries a failed-after-effect withdrawal without losing the frozen optional selection',async t=>{
  const args=await fixture(t); await git(args.repositoryRoot,['remote','add','origin','https://github.com/quickstark/skills.git']);
  assert.equal((await executeManagedSkills({...args.options,action:'update',withPackages:['qs-advanced']})).status,'complete');
  await appendFile(path.join(args.homeDirectory,'.codex/plugins/cache/quickstark/qs-skills/4.0.0/skills/qs-help/SKILL.md'),'Preserved edit.');
  let interrupted=false;
  const runtime={runCommand:async(command,argv,context)=>{const result=await runNativePackageCommand(command,argv,context);if(!interrupted&&argv[1]==='remove'){interrupted=true;throw Error('Interrupted after removal.');}return result;}};
  const failed=await updateInstalledHarnesses({...args.options,runtime,repairManagedPackages:true,arguments_:['--agent','codex']});
  assert.equal(failed.status,'failed');assert.ok(failed.results[0].repairJournalPath);
  const next=await updateInstalledHarnesses({...args.options,repairManagedPackages:true,arguments_:['--agent','codex']});
  assert.equal(next.status,'complete',JSON.stringify(next.results));
  assert.deepEqual([...next.results[0].targets.codex.desired.packages].sort(),['qs-advanced','qs-skills']);
  assert.equal((await readJSON(failed.results[0].repairJournalPath)).status,'complete');
});

test('installer reconciles all three old-source harnesses, retaining dirty source and unrelated settings', {skip:!['codex','claude','pi'].every(available)},async t=>{
  const args=await fixture(t,{bootstrap:false});const old=path.join(args.base,'old-source');
  await git(args.base,['clone','--quiet','--no-hardlinks',args.repositoryRoot,old]);await git(old,['remote','set-url','origin','https://github.com/quickstark/skills.git']);
  await runNativePackageCommand('codex',['plugin','marketplace','add',path.join(old,'codex')],args.nativeOptions);
  await runNativePackageCommand('claude',['plugin','marketplace','add',old],args.nativeOptions);
  for(const name of ['qs-skills','qs-advanced']) {
    await runNativePackageCommand('codex',['plugin','add',`${name}@quickstark`,'--json'],args.nativeOptions);
    await runNativePackageCommand('claude',['plugin','install',`${name}@quickstark`,'--scope','user'],args.nativeOptions);
  }
  const piRoot=id=>path.join(old,TARGET_SKILL_COLLECTIONS.find(c=>c.id===id).piPackageRoot);
  await writeJSON(path.join(args.homeDirectory,'.pi/agent/settings.json'),{theme:'preserve',packages:['npm:fixture-community-theme',piRoot('qs-skills'),piRoot('qs-advanced')]});
  const edited=path.join(piRoot('qs-skills'),'skills/qs-help/SKILL.md');await appendFile(edited,'Preserve this Pi source edit.');const original=await readFile(edited,'utf8');
  const historical=path.join(args.homeDirectory,'.claude/plugins/cache/quickstark/qs-skills/3.0.0/node_modules/.bin');
  await mkdir(historical,{recursive:true});await symlink('../../outside-cache-target',path.join(historical,'tool'));
  if(process.platform==='darwin') await lchmod(path.join(historical,'tool'),0o700);
  const agents=['codex','claude-code','pi'];
  const result=await updateInstalledHarnesses({...args.options,repairManagedPackages:true,detect:async()=>agents});
  assert.equal(result.status,'complete',JSON.stringify(result.results));
  assert.equal(await readFile(edited,'utf8'),original);
  const repair=await readJSON(result.results[0].repairJournalPath);
  const backup=repair.snapshots.find(entry=>entry.snapshot.path===path.join(args.homeDirectory,'.claude/plugins/cache/quickstark'));
  assert.equal(await readlink(path.join(backup.destination,'qs-skills/3.0.0/node_modules/.bin/tool')),'../../outside-cache-target');
  const settings=await readJSON(path.join(args.homeDirectory,'.pi/agent/settings.json'));assert.equal(settings.theme,'preserve');assert.ok(settings.packages.includes('npm:fixture-community-theme'));
  for(const agent of agents) assert.deepEqual([...result.results[0].targets[agent].desired.packages].sort(),['qs-advanced','qs-skills']);
  assert.equal((await executeManagedSkills({...args.options,agents,action:'verify'})).status,'verified');
});

for (const host of ['codex','claude-code']) test(`automatic updater bootstraps an absent ${host} marketplace and preserves core-only selection`, {skip:!available(host==='claude-code'?'claude':host)}, async t=>{
  const args=await fixture(t,{bootstrap:false,host});
  const result=await updateInstalledHarnesses({...args.options,arguments_:['--agent',host]});
  assert.equal(result.status,'complete',JSON.stringify(result.results.map(entry=>entry.error)));
  assert.equal(result.results[0].marketplaceActions.length,1);
  const paths=resolveManagedSkillPaths({...args.options,environment:{}});
  assert.deepEqual((await readJSON(paths.selectionPath)).targets[host].packages,['qs-skills']);
  assert.equal((await executeManagedSkills({...args.options,action:'verify'})).status,'verified');
});

test('automatic detection updates all three native harnesses in one default-home transaction', {skip:!['codex','claude','pi'].every(available)}, async t=>{
  const args=await fixture(t,{bootstrap:false});
  const agents=['codex','claude-code','pi'];
  const result=await updateInstalledHarnesses({...args.options,detect:async()=>agents});
  assert.equal(result.status,'complete',JSON.stringify(result.results.map(entry=>entry.error)));
  assert.equal(result.results.length,1);
  assert.equal(result.results[0].marketplaceActions.length,2);
  for(const agent of agents) assert.deepEqual(result.results[0].targets[agent].desired.packages,['qs-skills']);
  assert.equal((await executeManagedSkills({...args.options,agents,action:'verify'})).status,'verified');
});

nativeTest('automatic update preserves a saved optional selection on its next ordinary run',async t=>{
  const args=await fixture(t,{bootstrap:false});
  const added=await updateInstalledHarnesses({...args.options,arguments_:['--agent','codex','--with','qs-advanced']});
  assert.equal(added.status,'complete',JSON.stringify(added.results));
  const ordinary=await updateInstalledHarnesses({...args.options,detect:async()=>['codex']});
  assert.equal(ordinary.status,'complete',JSON.stringify(ordinary.results));
  assert.deepEqual([...ordinary.results[0].targets.codex.desired.packages].sort(),['qs-advanced','qs-skills']);
  assert.deepEqual(ordinary.results[0].marketplaceActions,[]);
});

nativeTest('automatic marketplace setup isolates an explicitly selected Codex home',async t=>{
  const args=await fixture(t,{bootstrap:false});
  const before=await captureMigrationPath(path.join(args.homeDirectory,'.codex'));
  const custom=path.join(args.homeDirectory,'.codex-demo');
  const result=await updateInstalledHarnesses({...args.options,arguments_:['--codex-home',custom]});
  assert.equal(result.status,'complete',JSON.stringify(result.results));
  assert.deepEqual(await captureMigrationPath(path.join(args.homeDirectory,'.codex')),before);
  assert.equal(result.results[0].marketplaceActions[0].root,path.join(args.repositoryRoot,'codex'));
  assert.equal((await executeManagedSkills({...args.options,action:'verify',codexHomeDirectory:custom})).status,'verified');
});

nativeTest('invalid selection fails before automatic marketplace registration',async t=>{
  const args=await fixture(t,{bootstrap:false}); let commands=0;
  const runtime={runCommand:async()=>{commands++;throw new Error('No native command expected.');}};
  for(const flags of [['--with','typo'],['--with','qs-video','--with','qs-video'],['--profile','typo']]) {
    const result=await updateInstalledHarnesses({...args.options,runtime,arguments_:['--agent','codex',...flags]});
    assert.equal(result.status,'failed');
    assert.match(result.results[0].error,/unknown package|duplicate|Unknown skill profile/);
  }
  assert.equal(commands,0);
});

nativeTest('actual isolated Codex bootstrap remains explicit, then selected fresh update exposes only core',async t=>{
  const args=await fixture(t,{bootstrap:false}); const before=await fixtureHomeState(args.homeDirectory);
  await assert.rejects(executeManagedSkills({...args.options,action:'plan',bootstrapMarketplaces:true}),/Codex prerequisite.*marketplace add/);
  await assert.rejects(executeManagedSkills({...args.options,action:'verify',bootstrapMarketplaces:true}),/Codex prerequisite.*marketplace add/);
  assert.deepEqual(await fixtureHomeState(args.homeDirectory),before);
  await runNativePackageCommand('codex',['plugin','marketplace','add',path.join(args.repositoryRoot,'codex')],args.nativeOptions);
  const plan=await executeManagedSkills({...args.options,action:'plan'}); assert.equal(plan.status,'ready',JSON.stringify(plan.conflicts)); assert.deepEqual(plan.targets.codex.desired.packages,['qs-skills']);
  const result=await executeManagedSkills({...args.options,action:'update'}); assert.equal(result.status,'complete',result.error);
  const inventory=JSON.parse((await runNativePackageCommand('codex',['plugin','list','--json'],args.nativeOptions)).stdout); assert.deepEqual(inventory.installed.map(entry=>entry.name),['qs-skills']);
  assert.equal((await executeManagedSkills({...args.options,action:'verify'})).status,'verified');
});

nativeTest('custom Codex home update isolates native and updater state from the default profile',async t=>{
  const args=await fixture(t,{bootstrap:false});const codexHomeDirectory=path.join(args.homeDirectory,'.codex-demo');await mkdir(codexHomeDirectory,{recursive:true});
  const sharedResource=path.join(args.homeDirectory,'.agents/skills/unlazy');await mkdir(sharedResource,{recursive:true});await writeFile(path.join(sharedResource,'SKILL.md'),'---\nname: unlazy\ndescription: Default-profile contributor fixture.\n---\nPreserve.\n');
  const digest=(await captureManagedSkillPayload(sharedResource)).payloadDigest;const legacy=args.document.migrations.flatMap(entry=>entry.legacy).find(entry=>entry.identity==='unlazy');legacy.acceptedPrior[0].digest=digest;
  const baseline=args.document.sourceManifestSnapshot.resources.find(entry=>entry.name==='unlazy');baseline.source.contentSha256=digest.value;args.document.sourceManifestSnapshot.sha256=sha(JSON.stringify(args.document.sourceManifestSnapshot.resources));
  await writeJSON(path.join(args.repositoryRoot,'config/skill-migrations.json'),args.document);const lockPath=path.join(args.homeDirectory,'.agents/.skill-lock.json');await writeJSON(lockPath,{version:3,skills:{unlazy:desiredLockFields({type:'agent-skill',source:baseline.source})}});await refreshFixtureAudit(args);
  const nativeOptions={...args.nativeOptions,codexHomeDirectory};
  await runNativePackageCommand('codex',['plugin','marketplace','add',path.join(args.repositoryRoot,'codex')],nativeOptions);
  const defaultSelectionPath=path.join(args.homeDirectory,'.config/quickstark/skills-selection.json');
  const defaultSelection={schemaVersion:1,targets:{codex:{packages:['qs-skills','qs-advanced'],resources:[],profile:'advanced',additions:[]}},templateRevision:args.revision,lastSuccessfulTransaction:'default-profile-sentinel'};
  await writeJSON(defaultSelectionPath,defaultSelection);await writeFile(path.join(args.homeDirectory,'.codex','default-profile-sentinel'),'preserve\n');
  const defaultBefore=await captureMigrationPath(path.join(args.homeDirectory,'.codex'));const sharedBefore=await captureMigrationPath(path.join(args.homeDirectory,'.agents'));
  const options={...args.options,codexHomeDirectory};const paths=resolveManagedSkillPaths({homeDirectory:args.homeDirectory,codexHomeDirectory,environment:{},agents:['codex']});
  const customSelection={schemaVersion:1,targets:{codex:{packages:['qs-skills'],resources:[],profile:'core',additions:[]}},templateRevision:args.revision,lastSuccessfulTransaction:'custom-profile-sentinel'};await writeJSON(paths.selectionPath,customSelection);
  const plan=await executeManagedSkills({...options,action:'plan',environment:{}});assert.equal(plan.status,'ready',JSON.stringify(plan.conflicts));assert.equal(plan.selectionPath,paths.selectionPath);assert.equal(plan.codexHomeDirectory,codexHomeDirectory);assert.equal(plan.targets.codex.basis,'saved');assert.deepEqual(plan.targets.codex.desired.packages,['qs-skills']);assert.deepEqual(plan.targets.codex.desired.resources,[]);
  const result=await executeManagedSkills({...options,action:'update',environment:{}});assert.equal(result.status,'complete',result.error);
  assert.ok(result.journalPath.startsWith(paths.transactionRoot+path.sep));const journal=await readMigrationJournal(result.journalPath);assert.ok(journal.plan.controlPlane.backupRoot.startsWith(paths.backupRoot+path.sep));
  const inventory=JSON.parse((await runNativePackageCommand('codex',['plugin','list','--json'],nativeOptions)).stdout);assert.deepEqual(inventory.installed.map(entry=>entry.name),['qs-skills']);
  assert.equal((await executeManagedSkills({...options,action:'verify',environment:{}})).status,'verified');
  assert.deepEqual((await readJSON(paths.selectionPath)).targets.codex.packages,['qs-skills']);assert.deepEqual(await readJSON(defaultSelectionPath),defaultSelection);
  assert.deepEqual(await captureMigrationPath(path.join(args.homeDirectory,'.codex')),defaultBefore);
  assert.deepEqual(await captureMigrationPath(path.join(args.homeDirectory,'.agents')),sharedBefore);
  const localLegacy=path.join(codexHomeDirectory,'skills/unlazy');await mkdir(localLegacy,{recursive:true});await writeFile(path.join(localLegacy,'SKILL.md'),'custom legacy');
  await assert.rejects(executeManagedSkills({...options,action:'plan',environment:{}}),/Custom Codex profile contains legacy standalone resource unlazy/);
});

nativeTest('external Codex home completes an isolated transaction',async t=>{
  const args=await fixture(t,{bootstrap:false});const codexHomeDirectory=path.join(args.base,'external-codex-home');await mkdir(codexHomeDirectory,{recursive:true});
  const nativeOptions={...args.nativeOptions,codexHomeDirectory};await runNativePackageCommand('codex',['plugin','marketplace','add',path.join(args.repositoryRoot,'codex')],nativeOptions);
  const options={...args.options,codexHomeDirectory};const result=await executeManagedSkills({...options,action:'update',environment:{}});assert.equal(result.status,'complete',result.error);
  const journal=await readMigrationJournal(result.journalPath);assert.ok(journal.plan.ownedRoots.includes(codexHomeDirectory));
  assert.equal((await executeManagedSkills({...options,action:'verify',environment:{}})).status,'verified');
});

nativeTest('read-only production input needs no handcrafted ownership receipt and rejects modified installed cache',async t=>{
  const args=await fixture(t); await runNativePackageCommand('codex',['plugin','add','qs-skills@quickstark','--json'],args.nativeOptions);
  const before=await fixtureHomeState(args.homeDirectory); const input=await buildManagedSkillInput(args.options); assert.equal(input.observations.length,1); assert.equal(input.observations[0].revision,args.revision); assert.deepEqual(await fixtureHomeState(args.homeDirectory),before);
  const preview=await previewManagedSkillMigration(input); assert.equal(preview.status,'ready',JSON.stringify(preview.conflicts));
  const file=path.join(args.homeDirectory,'.codex/plugins/cache/quickstark/qs-skills/4.0.0/skills/qs-help/SKILL.md'); await appendFile(file,'local edit');
  await assert.rejects(buildManagedSkillInput(args.options),/trusted prior release tree/); assert.ok((await readFile(file,'utf8')).endsWith('local edit'));
});

nativeTest('actual Pi update preserves unknown community package entries and saved subset',async t=>{
  const args=await fixture(t); const options={...args.options,agents:['pi']};
  const result=await executeManagedSkills({...options,action:'update'}); assert.equal(result.status,'complete',result.error);
  const settings=await readJSON(path.join(args.homeDirectory,'.pi/agent/settings.json')); assert.ok(settings.packages.includes('npm:fixture-community-theme')); assert.equal(settings.theme,'community-preserved'); assert.equal(settings.packages.length,2);
  const next=await executeManagedSkills({...options,action:'plan'}); assert.deepEqual(next.targets.pi.desired.packages,['qs-skills']); assert.equal(next.targets.pi.basis,'saved');
  const filtered={...settings,packages:settings.packages.map(entry=>entry.startsWith('npm:')?entry:{source:entry,skills:[]})}; await writeJSON(path.join(args.homeDirectory,'.pi/agent/settings.json'),filtered);
  await assert.rejects(buildManagedSkillInput(options),/Filtered Pi/); assert.deepEqual(await readJSON(path.join(args.homeDirectory,'.pi/agent/settings.json')),filtered);
});

nativeTest('unresolved or stale criterion audit blocks native update before effects',async t=>{
  const args=await fixture(t); const auditPath=path.join(args.repositoryRoot,'docs/validation/upstream-adoption-acceptance.json'); args.audit.criteria['AC-09'].status='failed'; await writeJSON(auditPath,args.audit);
  const before=await fixtureHomeState(args.homeDirectory); await assert.rejects(executeManagedSkills({...args.options,action:'update'}),/Unresolved acceptance criterion/); assert.deepEqual(await fixtureHomeState(args.homeDirectory),before);
  args.audit.criteria['AC-09'].status='passed'; await writeJSON(auditPath,args.audit); await appendFile(path.join(args.repositoryRoot,'skills/engineering/qs-help/fixture.txt'),'new unreviewed source');
  await assert.rejects(executeManagedSkills({...args.options,action:'update'}),/Acceptance source changed/);
});

nativeTest('explicit package addition installs only named broader selection and native failure retries frozen journal',async t=>{
  const args=await fixture(t); let failed=false; const commands=[];
  const runtime={runCommand:async(command,argv,options)=>{const result=await runNativePackageCommand(command,argv,options); if(argv[0]==='plugin'&&argv[1]==='add') {commands.push(argv[2]);if(!failed){failed=true;throw new Error('isolated after-effect failure');}} return result;}};
  const result=await executeManagedSkills({...args.options,action:'update',withPackages:['qs-advanced'],runtime}); assert.equal(result.status,'failed');
  assert.equal((await captureMigrationPath(path.join(args.homeDirectory,'.config/quickstark/skills-selection.json'))).kind,'absent');
  await assert.rejects(executeManagedSkills({...args.options,action:'update',resume:result.journalPath,withPackages:['qs-video']}),/frozen journal selection/);
  const otherCodexHome=path.join(args.homeDirectory,'.codex-other');await mkdir(otherCodexHome,{recursive:true});
  await assert.rejects(executeManagedSkills({...args.options,action:'update',resume:result.journalPath,codexHomeDirectory:otherCodexHome,environment:{}}),/another Codex home/);
  const resumed=await executeManagedSkills({...args.options,action:'update',resume:result.journalPath,runtime:{nativeOptions:{codex:{runCommand:runtime.runCommand}}}}); assert.equal(resumed.status,'complete',resumed.error);
  const inventory=JSON.parse((await runNativePackageCommand('codex',['plugin','list','--json'],args.nativeOptions)).stdout); assert.deepEqual(inventory.installed.map(entry=>entry.name).sort(),['qs-advanced','qs-skills']); assert.equal(commands.filter(entry=>entry===commands[0]).length,1);
});

nativeTest('target CLI flags remain explicit and unsupported target hosts never use legacy all-package installer',async t=>{
  assert.deepEqual(parseManagedSkillsArguments(['plan','--profile','advanced','--with','qs-video']).withPackages,['qs-video']);
  assert.throws(()=>parseManagedSkillsArguments(['plan','--profile','core','--profile','advanced']),/one explicit profile/);
  const args=await fixture(t); let mutations=0;
  await assert.rejects(executeManagedSkills({...args.options,action:'update',agents:['unknown'],runManagerCommand:async()=>mutations++}),/Unsupported managed skill target/); assert.equal(mutations,0);
  await assert.rejects(executeManagedSkills({...args.options,registryState:'legacy',action:'plan',withPackages:['qs-video']}),REGISTRY_STATE === 'target' ? /activated target registry cannot use the legacy all-package updater/ : /inactive legacy updater/);
});

async function refreshFixtureAudit(args) {
  for(const source of Object.keys(args.audit.sources)) { const snapshot=await captureMigrationPath(path.join(args.repositoryRoot,source)); args.audit.sources[source]={kind:snapshot.kind,contentSha256:snapshot.contentSha256}; }
  await writeJSON(path.join(args.repositoryRoot,'docs/validation/upstream-adoption-acceptance.json'),args.audit);
  await git(args.repositoryRoot,['add','.']); await git(args.repositoryRoot,['commit','--quiet','-m','Changed synthetic fixture']);
  args.revision=(await git(args.repositoryRoot,['rev-parse','HEAD'])).stdout.trim(); args.options.verifyRepositoryFreshness=async()=>({head:args.revision,originMain:args.revision});
}

nativeTest('ordinary same-selector release update binds saved prior Git tree and preserves exact selected package',async t=>{
  const args=await fixture(t); const first=await executeManagedSkills({...args.options,action:'update'}); assert.equal(first.status,'complete',first.error);
  const priorRevision=args.revision;
  await writeJSON(path.join(args.repositoryRoot,'package.json'),{name:'isolated-selected-test',version:'4.1.0'});
  for(const collection of TARGET_SKILL_COLLECTIONS) for(const [relative,file] of [[collection.codexPackageRoot,'.codex-plugin/plugin.json'],[collection.piPackageRoot,'package.json']]) { const location=path.join(args.repositoryRoot,relative,file); const manifest=await readJSON(location);manifest.version='4.1.0';await writeJSON(location,manifest); }
  await refreshFixtureAudit(args);
  const input=await buildManagedSkillInput(args.options); assert.equal(input.observations[0].revision,priorRevision); assert.equal(input.observations[0].version,'4.0.0');
  const update=await executeManagedSkills({...args.options,action:'update'}); assert.equal(update.status,'complete',update.error);
  const inventory=JSON.parse((await runNativePackageCommand('codex',['plugin','list','--json'],args.nativeOptions)).stdout); assert.deepEqual(inventory.installed.map(entry=>[entry.name,entry.version]),[['qs-skills','4.1.0']]);
});

nativeTest('additive specialist release accepts the exact prior catalog and rejects modified prior cache',async t=>{
  const args=await fixture(t);
  const collection=TARGET_SKILL_COLLECTIONS.find(entry=>entry.id==='qs-specialists');
  const skill='qs-repo-cleanup';
  const locations=[collection.codexPackageRoot,collection.piPackageRoot].map(relative=>path.join(args.repositoryRoot,relative,'skills',skill));
  const contents=await Promise.all(locations.map(location=>readFile(path.join(location,'SKILL.md'),'utf8')));
  for(const location of locations) await rm(location,{recursive:true});
  await git(args.repositoryRoot,['add','.']); await git(args.repositoryRoot,['commit','--quiet','-m','Synthetic prior specialist catalog']);
  const priorRevision=(await git(args.repositoryRoot,['rev-parse','HEAD'])).stdout.trim();
  await runNativePackageCommand('codex',['plugin','add','qs-specialists@quickstark','--json'],args.nativeOptions);
  await writeJSON(path.join(args.homeDirectory,'.config/quickstark/skills-selection.json'),{schemaVersion:1,targets:{codex:{packages:['qs-specialists'],resources:[],profile:null,additions:[]}},templateRevision:priorRevision,lastSuccessfulTransaction:'synthetic-prior-specialists'});
  for(let index=0;index<locations.length;index++) { await mkdir(locations[index],{recursive:true});await writeFile(path.join(locations[index],'SKILL.md'),contents[index]); }
  await writeJSON(path.join(args.repositoryRoot,'package.json'),{name:'isolated-selected-test',version:'4.1.0'});
  for(const entry of TARGET_SKILL_COLLECTIONS) for(const [relative,file] of [[entry.codexPackageRoot,'.codex-plugin/plugin.json'],[entry.piPackageRoot,'package.json']]) { const location=path.join(args.repositoryRoot,relative,file);const manifest=await readJSON(location);manifest.version='4.1.0';await writeJSON(location,manifest); }
  await refreshFixtureAudit(args);
  const before=await captureMigrationPath(args.homeDirectory);
  const input=await buildManagedSkillInput(args.options);
  assert.equal(input.observations[0].revision,priorRevision);
  assert.ok(!input.observations[0].publicSkills.includes(skill));
  assert.equal((await captureMigrationPath(args.homeDirectory)).contentSha256,before.contentSha256);
  const oldSkill=path.join(args.homeDirectory,'.codex/plugins/cache/quickstark/qs-specialists/4.0.0/skills/qs-deploy-prompt/SKILL.md');
  const original=await readFile(oldSkill);await appendFile(oldSkill,'untrusted local edit');
  await assert.rejects(buildManagedSkillInput(args.options),/trusted prior release tree/);
  await writeFile(oldSkill,original);
  const result=await executeManagedSkills({...args.options,action:'update'});assert.equal(result.status,'complete',result.error);
  const inventory=JSON.parse((await runNativePackageCommand('codex',['plugin','list','--json'],args.nativeOptions)).stdout);
  assert.deepEqual(inventory.installed.map(entry=>[entry.name,entry.version]),[['qs-specialists','4.1.0']]);
  assert.ok((await readFile(path.join(args.homeDirectory,'.codex/plugins/cache/quickstark/qs-specialists/4.1.0/skills',skill,'SKILL.md'),'utf8')).includes(`name: ${skill}`));
  assert.equal((await executeManagedSkills({...args.options,action:'verify'})).status,'verified');
});

nativeTest('original contributor lock and exact per-host alias derive ownership; changed link and lock fail without mutation',async t=>{
  const args=await fixture(t); const resource=path.join(args.homeDirectory,'.agents/skills/unlazy'); await mkdir(resource,{recursive:true}); await writeFile(path.join(resource,'SKILL.md'),'---\nname: unlazy\ndescription: Synthetic contributor fixture.\n---\nFixture only.\n');
  const digest=(await captureManagedSkillPayload(resource)).payloadDigest;
  const legacy=args.document.migrations.flatMap(entry=>entry.legacy).find(entry=>entry.identity==='unlazy'); legacy.acceptedPrior[0].digest=digest;
  const baseline=args.document.sourceManifestSnapshot.resources.find(entry=>entry.name==='unlazy'); baseline.source.contentSha256=digest.value;
  args.document.sourceManifestSnapshot.sha256=sha(JSON.stringify(args.document.sourceManifestSnapshot.resources));
  await writeJSON(path.join(args.repositoryRoot,'config/skill-migrations.json'),args.document); await refreshFixtureAudit(args);
  const lockPath=path.join(args.homeDirectory,'.agents/.skill-lock.json'); const lock={version:3,skills:{unlazy:desiredLockFields({type:'agent-skill',source:baseline.source})}}; await writeJSON(lockPath,lock);
  const alias=path.join(args.homeDirectory,'.pi/agent/skills/unlazy'); await mkdir(path.dirname(alias),{recursive:true});await symlink('../../../.agents/skills/unlazy',alias);
  const input=await buildManagedSkillInput({...args.options,agents:['codex','pi']}); const owned=input.observations.filter(entry=>entry.identity==='unlazy');assert.equal(owned.length,2);assert.equal(owned.find(entry=>entry.agent==='pi').path,alias);
  const preview=await previewManagedSkillMigration(input);assert.equal(preview.status,'ready',JSON.stringify(preview.conflicts));
  await rm(alias);await symlink('../../../.agents/skills/other',alias);
  await assert.rejects(buildManagedSkillInput({...args.options,agents:['codex','pi']}),/Changed or duplicate pi standalone/);
  await rm(alias);await symlink('../../../.agents/skills/unlazy',alias);lock.skills.unlazy.ref='0'.repeat(40);await writeJSON(lockPath,lock);
  await assert.rejects(buildManagedSkillInput({...args.options,agents:['codex','pi']}),/lock does not prove/);assert.equal((await captureMigrationPath(resource)).kind,'directory');
});

nativeTest('freshness failure precedes target input reads and retry rejects another release revision',async t=>{
  const args=await fixture(t);let commands=0;
  await assert.rejects(executeManagedSkills({...args.options,action:'update',bootstrapMarketplaces:true,verifyRepositoryFreshness:async()=>{throw new Error('fixture stale origin');},runtime:{runCommand:async()=>{commands++;}}}),/stale origin/);assert.equal(commands,0);
  let once=true;const runtime={runCommand:async(command,argv,context)=>{const result=await runNativePackageCommand(command,argv,context);if(once&&argv[1]==='add'){once=false;throw new Error('fixture interrupted');}return result;}};
  const failed=await executeManagedSkills({...args.options,action:'update',runtime});assert.equal(failed.status,'failed');
  await assert.rejects(executeManagedSkills({...args.options,action:'update',resume:failed.journalPath,verifyRepositoryFreshness:async()=>({head:'f'.repeat(40)})}),/different release revision/);
});

nativeTest('independent standalone public identity blocks selected native exposure and preserves its bytes',async t=>{
  const args=await fixture(t);const file=path.join(args.homeDirectory,'.agents/skills/qs-help/SKILL.md');await mkdir(path.dirname(file),{recursive:true});await writeFile(file,'independently managed user skill');
  await assert.rejects(executeManagedSkills({...args.options,action:'update'}),/independently managed standalone path/);assert.equal(await readFile(file,'utf8'),'independently managed user skill');
  const inventory=JSON.parse((await runNativePackageCommand('codex',['plugin','list','--json'],args.nativeOptions)).stdout);assert.equal(inventory.installed.length,0);
});

nativeTest('a locally edited passing audit is not published acceptance authority',async t=>{
  const args=await fixture(t);args.audit.criteria['AC-09'].note='Locally changed passing claim.';
  await writeJSON(path.join(args.repositoryRoot,'docs/validation/upstream-adoption-acceptance.json'),args.audit);
  const before=await fixtureHomeState(args.homeDirectory);
  await assert.rejects(executeManagedSkills({...args.options,action:'update'}),/uncommitted audit decisions/);
  assert.deepEqual(await fixtureHomeState(args.homeDirectory),before);
});

nativeTest('invalid native inventory output is redacted and never becomes ownership evidence',async t=>{
  const args=await fixture(t);const secret='synthetic-fixture-secret-do-not-echo';
  await assert.rejects(buildManagedSkillInput({...args.options,runtime:{runCommand:async()=>({stdout:secret})}}),error=>/(?:contents|output) withheld/.test(error.message)&&!error.message.includes(secret));
});

nativeTest('concurrent selected updaters cannot acquire different journals over one home',async t=>{
  const args=await fixture(t);let entered, release;const started=new Promise(resolve=>entered=resolve);const barrier=new Promise(resolve=>release=resolve);let first=true;
  const runtime={runCommand:async(command,argv,context)=>{if(first){first=false;entered();await barrier;}return runNativePackageCommand(command,argv,context);}};
  const active=executeManagedSkills({...args.options,action:'update',runtime});
  try {await started;await assert.rejects(executeManagedSkills({...args.options,action:'update'}),/Another updater owns.*never automatically stolen/);} finally {release();}
  const result=await active;assert.equal(result.status,'complete',result.error);assert.equal((await captureMigrationPath(path.join(args.homeDirectory,'.quickstark-skills-update.lock'))).kind,'absent');
});

nativeTest('unknown updater locks and replaced owned locks are preserved without theft',async t=>{
  const args=await fixture(t);const lock=path.join(args.homeDirectory,'.quickstark-skills-update.lock');await writeFile(lock,'unknown external owner');
  await assert.rejects(executeManagedSkills({...args.options,action:'update',bootstrapMarketplaces:true}),/never automatically stolen/);assert.equal(await readFile(lock,'utf8'),'unknown external owner');await rm(lock);
  const runtime={runCommand:async()=>{await rm(lock);await writeFile(lock,'replacement lock');throw new Error('synthetic interrupted observation');}};
  await assert.rejects(executeManagedSkills({...args.options,action:'update',runtime}),/Updater lock changed/);assert.equal(await readFile(lock,'utf8'),'replacement lock');
});

async function retainActualPsSnapshot(args, agent) {
  const legacy=args.document.migrations.flatMap(entry=>entry.legacy).find(entry=>entry.kind==='package'&&entry.identity==='ps-skills');
  const prior=agent==='pi'?legacy.acceptedPrior.find(entry=>entry.revision.startsWith('86bac7d')):legacy.acceptedPrior.find(entry=>entry.revision.startsWith('5d0d0b'));
  assert.ok(prior,'Expected immutable transition authority remains available.');
  const sourcePath=prior.digests[agent].authority.sourcePath;
  // Local object transfer only: actual source repository is read, never changed.
  await git(args.repositoryRoot,['fetch','--quiet','--no-tags',actualRoot,prior.revision]);
  await git(args.repositoryRoot,['checkout',prior.revision,'--',sourcePath]);
  const marketplaceFile=path.join(args.repositoryRoot,'codex/.agents/plugins/marketplace.json');const marketplace=await readJSON(marketplaceFile);
  marketplace.plugins.push({name:'ps-skills',source:{source:'local',path:'./plugins/ps-skills'},policy:{installation:'AVAILABLE',authentication:'ON_INSTALL'}});await writeJSON(marketplaceFile,marketplace);
  if(agent==='claude-code') {
    const file=path.join(args.repositoryRoot,'.claude-plugin/marketplace.json');const catalog=await readJSON(file);
    catalog.plugins.push({name:'ps-skills',source:'./packages/ps-skills'});await writeJSON(file,catalog);
  }
  await refreshFixtureAudit(args);
  const payload=await captureManagedSkillPayload(path.join(args.repositoryRoot,sourcePath));assert.deepEqual(payload.payloadDigest,{kind:prior.digests[agent].kind,value:prior.digests[agent].value});
  return prior;
}

nativeTest('actual Pi current direct-checkout core and specialists migrate retained PS while preserving old selection and theme',async t=>{
  const args=await fixture(t);const prior=await retainActualPsSnapshot(args,'pi');
  const piSource=name=>path.join(args.repositoryRoot,'pi/packages',name);
  for(const name of ['qs-skills','qs-specialists','ps-skills']) await runNativePackageCommand('pi',['install',piSource(name)],args.nativeOptions);
  const selectionPath=path.join(args.homeDirectory,'.config/quickstark/skills-selection.json');
  const previous={schemaVersion:1,targets:{pi:{packages:['qs-skills','qs-specialists','ps-skills'],resources:[],profile:null,additions:[]}},templateRevision:args.revision,lastSuccessfulTransaction:'prior-fixture'};await writeJSON(selectionPath,previous);
  await writeJSON(path.join(args.repositoryRoot,'package.json'),{name:'isolated-selected-test',version:'4.1.0'});
  for(const collection of TARGET_SKILL_COLLECTIONS) for(const [relative,file] of [[collection.codexPackageRoot,'.codex-plugin/plugin.json'],[collection.piPackageRoot,'package.json']]) {const location=path.join(args.repositoryRoot,relative,file);const manifest=await readJSON(location);manifest.version='4.1.0';await writeJSON(location,manifest);}
  await refreshFixtureAudit(args);
  const options={...args.options,agents:['pi']};const input=await buildManagedSkillInput(options);
  for(const name of ['qs-skills','qs-specialists']) {const observed=input.observations.find(entry=>entry.identity===name);assert.equal(observed.version,'4.1.0');assert.equal(observed.revision,args.revision);}
  const ps=input.observations.find(entry=>entry.identity==='ps-skills');assert.equal(ps.revision,prior.revision);assert.equal(ps.ownership.packageId,'ps-skills');assert.equal(ps.ownership.marketplace,'quickstark');
  const preview=await previewManagedSkillMigration(input);assert.equal(preview.status,'ready',JSON.stringify(preview.conflicts));assert.deepEqual(await readJSON(selectionPath),previous);
  const operations=[];const runtime={runCommand:async(command,argv,context)=>{if(command==='pi'&&['install','remove'].includes(argv[0]))operations.push([...argv]);return runNativePackageCommand(command,argv,context);}};
  const result=await executeManagedSkills({...options,action:'update',runtime});assert.equal(result.status,'complete',result.error);
  assert.deepEqual(operations,[['remove',piSource('ps-skills')],['install',piSource('qs-advanced')]]);
  const settings=await readJSON(path.join(args.homeDirectory,'.pi/agent/settings.json'));assert.equal(settings.theme,'community-preserved');assert.ok(settings.packages.includes('npm:fixture-community-theme'));
  const local=settings.packages.filter(entry=>!entry.startsWith('npm:')).map(entry=>path.basename(path.resolve(path.join(args.homeDirectory,'.pi/agent'),entry))).sort();assert.deepEqual(local,['qs-advanced','qs-skills','qs-specialists']);
  assert.deepEqual((await readJSON(selectionPath)).targets.pi.packages,['qs-advanced','qs-skills','qs-specialists']);
});

nativeTest('actual Codex retained PS ownership stays strict and maps to advanced with explicit core expansion',async t=>{
  const args=await fixture(t);const prior=await retainActualPsSnapshot(args,'codex');await runNativePackageCommand('codex',['plugin','add','ps-skills@quickstark','--json'],args.nativeOptions);
  const input=await buildManagedSkillInput({...args.options,withPackages:['qs-skills']});const ps=input.observations.find(entry=>entry.identity==='ps-skills');assert.equal(ps.revision,prior.revision);assert.equal(ps.ownership.packageId,'ps-skills');assert.equal(ps.ownership.marketplace,'quickstark');
  let preview=await previewManagedSkillMigration(input);assert.equal(preview.status,'ready',JSON.stringify(preview.conflicts));
  ps.ownership.marketplace='foreign';preview=await previewManagedSkillMigration(input);assert.equal(preview.status,'blocked');assert.ok(preview.conflicts.some(entry=>entry.reason==='wrong-native-package-owner'));
  const runtime={runCommand:async(command,argv,context)=>{const result=await runNativePackageCommand(command,argv,context);if(argv[1]==='list'){const data=JSON.parse(result.stdout);for(const entry of data.installed)entry.marketplaceName='foreign';return{...result,stdout:JSON.stringify(data)};}return result;}};
  await assert.rejects(buildManagedSkillInput({...args.options,runtime}),/owner conflicts/);
  const result=await executeManagedSkills({...args.options,action:'update',withPackages:['qs-skills']});assert.equal(result.status,'complete',result.error);
  const inventory=JSON.parse((await runNativePackageCommand('codex',['plugin','list','--json'],args.nativeOptions)).stdout);assert.deepEqual(inventory.installed.map(entry=>entry.name).sort(),['qs-advanced','qs-skills']);
});


test('actual isolated Claude alias installs only core, persists selection, verifies, and retries interrupted exposure', {skip:!available('claude') || !available('codex')}, async t => {
  const args=await fixture(t,{host:'claude-code'});
  const options={...args.options,agents:['claude']};
  const before=await fixtureHomeState(args.homeDirectory);
  const plan=await executeManagedSkills({...options,action:'plan'});
  assert.equal(plan.status,'ready',JSON.stringify(plan.conflicts));
  assert.deepEqual(plan.targets['claude-code'].desired.packages,['qs-skills']);
  assert.deepEqual(await fixtureHomeState(args.homeDirectory),before);
  let interrupted=false;
  const runtime={runCommand:async(command,argv,context)=>{
    const result=await runNativePackageCommand(command,argv,context);
    if(!interrupted && argv[1]==='install') {interrupted=true;throw new Error('fixture interruption after effect');}
    return result;
  }};
  const failed=await executeManagedSkills({...options,action:'update',runtime});
  assert.equal(failed.status,'failed',failed.error);
  await assert.rejects(executeManagedSkills({...options,agents:['codex'],action:'update',resume:failed.journalPath}),/different managed skill targets/);
  const resumed=await executeManagedSkills({...options,action:'update',resume:failed.journalPath});
  assert.equal(resumed.status,'complete',resumed.error);
  assert.equal((await executeManagedSkills({...options,action:'verify'})).status,'verified');
  const result=await executeManagedSkills({...options,action:'update',withPackages:['qs-specialists']});
  assert.equal(result.status,'complete',result.error);
  const inventory=JSON.parse((await runNativePackageCommand('claude',['plugin','list','--json'],args.nativeOptions)).stdout);
  assert.deepEqual(inventory.map(entry=>entry.id).sort(),['qs-skills@quickstark','qs-specialists@quickstark']);
  const saved=await readJSON(path.join(args.homeDirectory,'.config/quickstark/skills-selection.json'));
  assert.deepEqual(saved.targets['claude-code'].packages,['qs-skills','qs-specialists']);
  const ordinary=await executeManagedSkills({...options,action:'plan'});
  assert.equal(ordinary.targets['claude-code'].basis,'saved');
  assert.deepEqual(ordinary.targets['claude-code'].desired.packages,['qs-skills','qs-specialists']);
});

for (const host of ['claude-code','pi']) test(`actual isolated ${host} custom environment profile updates and verifies without touching the default profile`,{skip:!available(host==='claude-code'?'claude':host)||!available('codex')},async t=>{
  const args=await fixture(t,{bootstrap:false,host});
  const key=host==='claude-code'?'claudeHomeDirectory':'piHomeDirectory';
  const variable=host==='claude-code'?'CLAUDE_CONFIG_DIR':'PI_CODING_AGENT_DIR';
  const custom=path.join(args.base,`${host} custom profile`);
  await mkdir(custom,{recursive:true});
  const nativeOptions={...args.nativeOptions,[key]:custom};
  if(host==='claude-code') await runNativePackageCommand('claude',['plugin','marketplace','add',args.repositoryRoot],nativeOptions);
  const defaultConfig=path.join(args.homeDirectory,host==='claude-code'?'.claude':'.pi/agent');await mkdir(defaultConfig,{recursive:true});
  await writeFile(path.join(defaultConfig,'sentinel'),'preserve default');
  const before=await fixtureHomeState(defaultConfig);
  const options={...args.options,environment:{[variable]:custom}};
  const plan=await executeManagedSkills({...options,action:'plan'});assert.equal(plan.status,'ready',JSON.stringify(plan.conflicts));
  assert.equal(plan[key],custom);
  const result=await executeManagedSkills({...options,action:'update'});assert.equal(result.status,'complete',result.error);
  assert.equal((await executeManagedSkills({...options,action:'verify'})).status,'verified');
  assert.deepEqual(await fixtureHomeState(defaultConfig),before);
});

test('actual isolated combined update supports Codex, Claude, and Pi in one selection transaction',{skip:!['codex','claude','pi'].every(available)},async t=>{
  const args=await fixture(t,{host:'claude-code'});
  await runNativePackageCommand('codex',['plugin','marketplace','add',path.join(args.repositoryRoot,'codex')],args.nativeOptions);
  const options={...args.options,agents:['codex','claude','pi']};
  const result=await executeManagedSkills({...options,action:'update'});assert.equal(result.status,'complete',result.error);
  assert.equal((await executeManagedSkills({...options,action:'verify'})).status,'verified');
  const saved=await readJSON(path.join(args.homeDirectory,'.config/quickstark/skills-selection.json'));
  assert.deepEqual(Object.keys(saved.targets).sort(),['claude-code','codex','pi']);
  for(const target of Object.values(saved.targets)) assert.deepEqual(target.packages,['qs-skills']);
});


test('actual Claude retained PS package migrates to accepted QS replacements using original immutable ownership', {skip:!available('claude')||!available('codex')}, async t=>{
  const args=await fixture(t,{host:'claude-code'});
  const prior=await retainActualPsSnapshot(args,'claude-code');
  await runNativePackageCommand('claude',['plugin','install','ps-skills@quickstark','--scope','user'],args.nativeOptions);
  const options={...args.options,withPackages:['qs-skills']};
  const input=await buildManagedSkillInput(options);
  assert.equal(input.observations.find(entry=>entry.identity==='ps-skills').revision,prior.revision);
  const plan=await previewManagedSkillMigration(input);assert.equal(plan.status,'ready',JSON.stringify(plan.conflicts));
  const result=await executeManagedSkills({...options,action:'update'});assert.equal(result.status,'complete',result.error);
  const inventory=JSON.parse((await runNativePackageCommand('claude',['plugin','list','--json'],args.nativeOptions)).stdout);
  assert.deepEqual(inventory.map(entry=>entry.id).sort(),['qs-advanced@quickstark','qs-skills@quickstark']);
});

async function priorRootClaudeCore(t) {
  const args=await fixture(t,{host:'claude-code'});
  const core=TARGET_SKILL_COLLECTIONS.find(item=>item.id==='qs-skills');
  const catalogFile=path.join(args.repositoryRoot,'.claude-plugin/marketplace.json');
  const catalog=await readJSON(catalogFile);catalog.plugins.find(item=>item.name==='qs-skills').source='./';await writeJSON(catalogFile,catalog);
  const skills=core.publicCommands.map(name=>`./skills/${name==='qs-flow-handoff'?'productivity':'engineering'}/${name}`);
  await writeJSON(path.join(args.repositoryRoot,'.claude-plugin/plugin.json'),{name:'qs-skills',version:'4.0.0',skills});
  for(const relative of skills){const root=path.join(args.repositoryRoot,relative);await mkdir(root,{recursive:true});await writeFile(path.join(root,'SKILL.md'),`---\nname: ${path.basename(root)}\ndescription: Known prior root-based core fixture.\n---\nFixture only.\n`);}
  await refreshFixtureAudit(args);const priorRevision=args.revision;
  await runNativePackageCommand('claude',['plugin','install','qs-skills@quickstark','--scope','user'],args.nativeOptions);
  const cached=path.join(args.homeDirectory,'.claude/plugins/cache/quickstark/qs-skills/4.0.0');
  // Unrelated cache content is retained; migration must neither traverse nor back it up.
  await mkdir(path.join(cached,'unrelated-large-tree'),{recursive:true});
  await symlink('/unavailable-user-resource',path.join(cached,'unrelated-large-tree/link'));
  catalog.plugins.find(item=>item.name==='qs-skills').source='./packages/qs-skills';await writeJSON(catalogFile,catalog);
  await writeJSON(path.join(args.repositoryRoot,'package.json'),{name:'isolated-selected-test',version:'4.1.0'});
  for(const collection of TARGET_SKILL_COLLECTIONS){const file=path.join(args.repositoryRoot,collection.claudePackageRoot,'.claude-plugin/plugin.json');const manifest=await readJSON(file);manifest.version='4.1.0';await writeJSON(file,manifest);}
  const rootManifest=await readJSON(path.join(args.repositoryRoot,'.claude-plugin/plugin.json'));rootManifest.version='4.1.0';await writeJSON(path.join(args.repositoryRoot,'.claude-plugin/plugin.json'),rootManifest);
  // Include a later release commit so ownership must resolve the prior immutable tree.
  await refreshFixtureAudit(args);
  return {...args,priorRevision,cached};
}

test('Claude root-based core upgrades through a verified manifest closure and preserves the retained cache', {skip:!available('claude')||!available('codex')}, async t => {
  const args=await priorRootClaudeCore(t);
  const input=await buildManagedSkillInput(args.options);
  const prior=input.observations.find(item=>item.identity==='qs-skills');
  assert.equal(prior.revision,args.priorRevision);
  assert.equal(prior.layout,'claude-root-core');
  const before=await fixtureHomeState(args.cached);
  const result=await executeManagedSkills({...args.options,action:'update'});assert.equal(result.status,'complete',result.error);
  assert.equal((await executeManagedSkills({...args.options,action:'verify'})).status,'verified');
  const after=await fixtureHomeState(args.cached);
  assert.deepEqual(after.filter(entry=>entry.path!=='.orphaned_at'),before.filter(entry=>entry.path!=='.orphaned_at'));
  const inventory=JSON.parse((await runNativePackageCommand('claude',['plugin','list','--json'],args.nativeOptions)).stdout);
  assert.deepEqual(inventory.map(item=>[item.id,item.version]),[['qs-skills@quickstark','4.1.0']]);
});

for(const relative of ['skills/engineering/qs-help/SKILL.md','skills/internal/fixture.txt']) test(`Claude root-based core refuses edited declared resource ${relative} without changing native registration`, {skip:!available('claude')||!available('codex')}, async t => {
  const args=await priorRootClaudeCore(t);
  const file=path.join(args.cached,relative);await appendFile(file,'User edit.');
  const before=await fixtureHomeState(args.homeDirectory);
  await assert.rejects(buildManagedSkillInput(args.options),/trusted prior release tree/);
  assert.deepEqual(await fixtureHomeState(args.homeDirectory),before);
});


test('Claude root-based core resumes interrupted withdrawal and rollback restores its registration without copying unrelated cache files', {skip:!available('claude')||!available('codex')}, async t => {
  const args=await priorRootClaudeCore(t);
  const before=await fixtureHomeState(args.cached);
  let interrupted=false;
  const runtime={runCommand:async(command,argv,options)=>{
    const result=await runNativePackageCommand(command,argv,options);
    if(!interrupted && argv[1]==='uninstall'){interrupted=true;throw new Error('Interrupted after legacy withdrawal.');}
    return result;
  }};
  const failed=await executeManagedSkills({...args.options,action:'update',runtime});assert.equal(failed.status,'failed',failed.error);
  assert.match(failed.failedStep,/withdraw/);
  const file=path.join(args.cached,'skills/engineering/qs-help/SKILL.md');const contents=await readFile(file);await appendFile(file,'Concurrent user edit.');
  await assert.rejects(executeManagedSkills({...args.options,action:'update',resume:failed.journalPath}),/changed after planning/);
  await writeFile(file,contents);
  const resumed=await executeManagedSkills({...args.options,action:'update',resume:failed.journalPath});assert.equal(resumed.status,'complete',resumed.error);
  const assembly=await restoreManagedSkillMigration({journalPath:failed.journalPath});
  const result=await executeManagedSkillMigration(assembly,{ownerId:'isolated-root-core-recovery',mode:'recover',recoveryAuthority:{transactionId:assembly.plan.id,operation:'restore-journaled-owned-effects',source:'isolated-fixture'}});
  assert.equal(result.status,'rolled-back',result.error);
  assert.deepEqual(await fixtureHomeState(args.cached),before);
  const inventory=JSON.parse((await runNativePackageCommand('claude',['plugin','list','--json'],args.nativeOptions)).stdout);
  assert.deepEqual(inventory.map(item=>[item.id,item.version]),[['qs-skills@quickstark','4.0.0']]);
});

test('Claude root-based core rejects a same-version cache replacement before native effects', {skip:!available('claude')||!available('codex')}, async t => {
  const args=await priorRootClaudeCore(t);
  await writeJSON(path.join(args.repositoryRoot,'package.json'),{version:'4.0.0'});
  for(const collection of TARGET_SKILL_COLLECTIONS){const file=path.join(args.repositoryRoot,collection.claudePackageRoot,'.claude-plugin/plugin.json');const manifest=await readJSON(file);manifest.version='4.0.0';await writeJSON(file,manifest);}
  const before=await fixtureHomeState(args.homeDirectory);
  await assert.rejects(buildManagedSkillInput(args.options),/requires a new release version/);
  assert.deepEqual(await fixtureHomeState(args.homeDirectory),before);
});
