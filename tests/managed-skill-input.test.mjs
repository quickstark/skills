import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, mkdir, readFile, writeFile, appendFile, rm, symlink } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import test from 'node:test';
import { derivePackageAcceptanceObligations, buildManagedSkillInput } from '../scripts/managed-skill-input.mjs';
import { executeManagedSkills, parseManagedSkillsArguments } from '../scripts/managed-skills.mjs';
import { previewManagedSkillMigration, captureManagedSkillPayload } from '../scripts/managed-skill-migration.mjs';
import { captureMigrationPath } from '../scripts/migration-filesystem.mjs';
import { TARGET_SKILL_COLLECTIONS, REGISTRY_STATE } from '../scripts/skill-collection-registry.mjs';
import { runNativePackageCommand } from '../scripts/migration-native-packages.mjs';
import { readMigrationJournal } from '../scripts/migration-transaction.mjs';
import { desiredLockFields } from '../scripts/personal-skills/lock.mjs';
import { resolveManagedSkillPaths } from '../scripts/managed-skill-paths.mjs';
import { fixtureHomeState } from './helpers/fixture-home-state.mjs';

const available = (host) => (process.env.PATH ?? '').split(path.delimiter).some((root) => existsSync(path.join(root, host)));
const nativeTest = (name, callback) => test(name, { skip: !available('codex') || name.startsWith('actual Pi') && !available('pi') ? 'Required native executable unavailable; no host support claimed.' : false }, callback);
const run = promisify(execFile); const actualRoot = path.resolve(import.meta.dirname, '..');
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const writeJSON = async (file, data) => { await mkdir(path.dirname(file), {recursive:true}); await writeFile(file, JSON.stringify(data,null,2)+'\n'); };
const readJSON = async (file) => JSON.parse(await readFile(file));
async function git(root, args) { return run('git', ['-c','core.hooksPath=/dev/null','-c','commit.gpgsign=false','-c','user.name=Isolated Fixture','-c','user.email=fixture@example.invalid',...args],{cwd:root,encoding:'utf8'}); }
async function fixture(t, {bootstrap = true} = {}) {
  const base = await mkdtemp(path.join(tmpdir(),'qs-selected-caller-')); t.after(()=>rm(base,{recursive:true,force:true}));
  const repositoryRoot = path.join(base,'repo'); const homeDirectory = path.join(base,'home'); await mkdir(repositoryRoot); await mkdir(path.join(homeDirectory,'.codex'),{recursive:true}); await mkdir(path.join(homeDirectory,'.pi/agent'),{recursive:true});
  const document = await readJSON(path.join(actualRoot,'config/skill-migrations.json'));
  await writeJSON(path.join(repositoryRoot,'config/skill-migrations.json'),document);
  await writeJSON(path.join(repositoryRoot,'config/skill-profiles.json'),{schemaVersion:1,defaultProfile:'core',profiles:{core:{packages:['qs-skills'],resources:[]},advanced:{packages:['qs-skills','qs-advanced'],resources:[]}}});
  await writeJSON(path.join(repositoryRoot,'config/skill-provenance.json'),{fixture:'Synthetic test evidence only; never production acceptance.'});
  await writeJSON(path.join(repositoryRoot,'package.json'),{name:'isolated-selected-test',version:'4.0.0'});
  for(const collection of TARGET_SKILL_COLLECTIONS) for(const [agent,relative] of [['codex',collection.codexPackageRoot],['pi',collection.piPackageRoot]]) {
    const root=path.join(repositoryRoot,relative);
    for(const name of collection.publicCommands) { await mkdir(path.join(root,'skills',name),{recursive:true}); await writeFile(path.join(root,'skills',name,'SKILL.md'),`---\nname: ${name}\ndescription: Isolated synthetic fixture.\n---\nFixture only.\n`); }
    await writeJSON(path.join(root,agent==='codex'?'.codex-plugin/plugin.json':'package.json'),agent==='codex'?{name:collection.id,version:'4.0.0',skills:'./skills/'}:{name:collection.id,version:'4.0.0',private:true,pi:{skills:['./skills']}});
  }
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
    audit.packages[item.packageId]={capabilityIds:item.capabilityIds,sourcePaths:item.sourcePaths,criteria:item.requiredCriteria,checks:Object.fromEntries(['codex','pi'].map(agent=>[agent,Object.fromEntries(item.requiredChecks.map(name=>[name,{status:'passed',evidence:['fixture']}]))]))};
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
  if(bootstrap) await runNativePackageCommand('codex',['plugin','marketplace','add',path.join(repositoryRoot,'codex')],nativeOptions);
  await writeJSON(path.join(homeDirectory,'.pi/agent/settings.json'),{theme:'community-preserved',packages:['npm:fixture-community-theme'],quietStartup:true});
  const options={repositoryRoot,homeDirectory,environment:{},agents:['codex'],registryState:'target',verifyRepositoryFreshness:async()=>({head:revision,originMain:revision})};
  return {base,repositoryRoot,homeDirectory,revision,document,options,nativeOptions,audit};
}

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

test('catalog obligations retain prompt, parity, all video modules and measured efficiency decisions',async()=>{
  const document=await readJSON(path.join(actualRoot,'config/skill-migrations.json'));
  const advanced=derivePackageAcceptanceObligations('qs-advanced',document); assert.ok(advanced.capabilityIds.includes('ps:ps-visual-parity')); assert.equal(advanced.capabilityIds.filter(id=>id.startsWith('ps-internal:')).length,16);
  const video=derivePackageAcceptanceObligations('qs-video',document); assert.equal(video.capabilityIds.filter(id=>id.startsWith('video-internal:')).length,21); assert.ok(video.requiredChecks.includes('video-runtime'));
  assert.ok(derivePackageAcceptanceObligations('qs-specialists',document).capabilityIds.includes('qs:qs-deploy-prompt'));
  assert.ok(advanced.requiredCriteria.includes('AC-09')); assert.throws(()=>derivePackageAcceptanceObligations('ps-skills',document),/Unknown/);
});

nativeTest('actual isolated Codex bootstrap remains explicit, then selected fresh update exposes only core',async t=>{
  const args=await fixture(t,{bootstrap:false}); const before=await fixtureHomeState(args.homeDirectory);
  await assert.rejects(executeManagedSkills({...args.options,action:'plan'}),/Codex prerequisite.*marketplace add/);
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
  await assert.rejects(executeManagedSkills({...args.options,action:'update',agents:['claude-code'],runManagerCommand:async()=>mutations++}),/Codex and Pi only/); assert.equal(mutations,0);
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
  await assert.rejects(executeManagedSkills({...args.options,action:'update',verifyRepositoryFreshness:async()=>{throw new Error('fixture stale origin');},runtime:{runCommand:async()=>{commands++;}}}),/stale origin/);assert.equal(commands,0);
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
  await assert.rejects(buildManagedSkillInput({...args.options,runtime:{runCommand:async()=>({stdout:secret})}}),error=>error.message.includes('contents withheld')&&!error.message.includes(secret));
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
  await assert.rejects(executeManagedSkills({...args.options,action:'update'}),/never automatically stolen/);assert.equal(await readFile(lock,'utf8'),'unknown external owner');await rm(lock);
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
