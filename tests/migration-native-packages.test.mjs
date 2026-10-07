import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { runMigrationTransaction } from '../scripts/migration-transaction.mjs';
import { mkdtemp, mkdir, writeFile, readFile, rm, appendFile, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { captureMigrationPath } from '../scripts/migration-filesystem.mjs';
import { createNativePackageAdapter, observeNativePackages, predictNativePackageTransition, runNativePackageCommand } from '../scripts/migration-native-packages.mjs';

const available = (host) => (process.env.PATH ?? '').split(path.delimiter).some((root) => existsSync(path.join(root, host)));
const nativeFixtureProgram = `
import {readFile,writeFile,mkdir,readdir,cp,rm} from 'node:fs/promises';import path from 'node:path';
const [host,...args]=process.argv.slice(2);const home=process.env.HOME;
const read=async file=>readFile(file,'utf8').catch(e=>e.code==='ENOENT'?'':Promise.reject(e));
if(host==='pi') {const file=path.join(home,'.pi/agent/settings.json');const config=JSON.parse(await read(file)||'{}');const source=path.relative(path.dirname(file),args[1]);config.packages??=[];if(args[0]==='install') {if(!config.packages.includes(source))config.packages.push(source);}else if(args[0]==='remove')config.packages=config.packages.filter(entry=>entry!==source);await writeFile(file,JSON.stringify(config,null,2));}
else {const file=path.join(home,'.codex/config.toml');let config=await read(file);const root=()=>JSON.parse(config.split('source = ')[1].split('\\n')[0]);const marketName='qs-native-fixture';
if(args[1]==='marketplace'&&args[2]==='add') {config+='\\n[marketplaces.'+marketName+']\\nsource_type = "local"\\nsource = '+JSON.stringify(args[3])+'\\n';await writeFile(file,config);}
else if(args[1]==='marketplace')console.log(JSON.stringify({marketplaces:[{name:marketName,root:root(),marketplaceSource:{sourceType:'local',source:root()}}]}));
else if(args[1]==='list'){const m=JSON.parse(await read(path.join(root(),'.agents/plugins/marketplace.json')));const installed=[];for(const def of m.plugins){const cache=path.join(home,'.codex/plugins/cache',marketName,def.name);let versions=[];try{versions=await readdir(cache);}catch{}for(const version of versions)if(await read(path.join(cache,version,'.codex-plugin/plugin.json')))installed.push({pluginId:def.name+'@'+marketName,name:def.name,marketplaceName:marketName,version,installed:true,enabled:true,source:{source:'local',path:path.resolve(root(),def.source.path)},marketplaceSource:{sourceType:'local',source:root()},installPolicy:'AVAILABLE',authPolicy:'ON_INSTALL'});}console.log(JSON.stringify({installed,available:[]}));}
else {const name=args[2].split('@')[0];const key='[plugins."'+args[2]+'"]';const start=config.indexOf(key);if(start>=0){let end=config.indexOf('\\n[',start);if(end<0)end=config.length;config=config.slice(0,start)+config.slice(end);}if(args[1]==='remove')await rm(path.join(home,'.codex/plugins/cache',marketName,name),{recursive:true,force:true});else {const index=args.indexOf('-c');const sourceRoot=index<0?root():JSON.parse(args[index+1].split('=').slice(1).join('='));const m=JSON.parse(await read(path.join(sourceRoot,'.agents/plugins/marketplace.json')));const def=m.plugins.find(entry=>entry.name===name);const source=path.resolve(sourceRoot,def.source.path);const manifest=JSON.parse(await read(path.join(source,'.codex-plugin/plugin.json')));const dest=path.join(home,'.codex/plugins/cache',marketName,name,manifest.version);await mkdir(path.dirname(dest),{recursive:true});await cp(source,dest,{recursive:true});config+='\\n'+key+'\\nenabled = true\\n';}await writeFile(file,config);console.log('{}');}}
`;

async function fixture(t, host, { real = false } = {}) {
  const base = await mkdtemp(path.join(tmpdir(), 'qs-native-adapter-')); t.after(() => rm(base, { recursive: true, force: true }));
  const homeDirectory = path.join(base, 'home'); const market = path.join(base, 'market'); const backupRoot = path.join(base, 'backups');
  await mkdir(path.join(homeDirectory, '.codex'), { recursive: true }); await mkdir(path.join(homeDirectory, '.pi/agent'), { recursive: true });
  await mkdir(path.join(market, '.agents/plugins'), { recursive: true });
  const packages = [];
  for (const [id, name, version] of [['old', 'ps-probe', '1.0.0'], ['new', 'qs-probe', '2.0.0']]) {
    const source = path.join(market, 'plugins', name); await mkdir(path.join(source, 'skills', name), { recursive: true });
    await writeFile(path.join(source, 'skills', name, 'SKILL.md'), `---\nname: ${name}\ndescription: Fixture command.\n---\nPerform the isolated fixture.\n`);
    if (host === 'codex') { await mkdir(path.join(source, '.codex-plugin')); await writeFile(path.join(source, '.codex-plugin/plugin.json'), JSON.stringify({ name, version, skills: './skills/' })); }
    else await writeFile(path.join(source, 'package.json'), JSON.stringify({ name, version, pi: { skills: ['./skills'] } }));
    const payload = await captureMigrationPath(source);
    packages.push({ id, name, version, source, payloadSha256: payload.contentSha256, publicNames: [name], ownershipRecord: 'fixture-owned', marketplace: 'qs-native-fixture', marketplaceRoot: market });
  }
  await writeFile(path.join(market, '.agents/plugins/marketplace.json'), JSON.stringify({ name: 'qs-native-fixture', plugins: packages.map((pkg) => ({ name: pkg.name, source: { source: 'local', path: `./plugins/${pkg.name}` } })) }));
  const options = { host, homeDirectory, cwd: base, packages, backupRoot };
  if (!real) { const program = path.join(base, 'native-fixture.mjs'); await writeFile(program, nativeFixtureProgram); options.runCommand = (command, args, context) => runNativePackageCommand(process.execPath, [program, host, ...args], context); }
  const command = (args) => (options.runCommand ?? runNativePackageCommand)(host, args, options);
  if (host === 'codex') {
    await writeFile(path.join(homeDirectory, '.codex/config.toml'), '# unrelated user preference\nmodel = "fixture-preserved"\n');
    await command(['plugin', 'marketplace', 'add', market]); await command(['plugin', 'add', 'ps-probe@qs-native-fixture', '--json']);
  } else {
    await writeFile(path.join(homeDirectory, '.pi/agent/settings.json'), JSON.stringify({ theme: 'community-kept', packages: ['npm:community-theme-fixture'], quietStartup: true }, null, 2));
    await command(['install', packages[0].source]);
  }
  const configPath = path.join(homeDirectory, host === 'codex' ? '.codex/config.toml' : '.pi/agent/settings.json');
  const targets = [{ path: configPath, ownershipRecord: 'fixture-owned' }];
  if (host === 'codex') targets.push(...packages.map((pkg) => ({ path: path.join(homeDirectory, '.codex/plugins/cache', pkg.marketplace, pkg.name, pkg.version), ownershipRecord: 'fixture-owned' })));
  const context = { transactionId: 'isolated-native-fixture' };
  const step = (before, packageId, phase) => ({ id: `${phase}-${packageId}`, phase, operation: `native-${phase}`, native: { host, packageId }, ownedTargets: targets, before, after: predictNativePackageTransition(before, { packageId, phase, packages }) });
  return { base, options, configPath, context, step, command, adapter: createNativePackageAdapter(options) };
}

test('native commands preserve the user home and pass the selected Codex home', async (t) => {
  const base = await mkdtemp(path.join(tmpdir(), 'qs-native-environment-')); t.after(() => rm(base, { recursive: true, force: true }));
  const homeDirectory = path.join(base, 'home'); const codexHomeDirectory = path.join(homeDirectory, '.codex-demo');
  await mkdir(codexHomeDirectory, { recursive: true });
  const result = await runNativePackageCommand(process.execPath, ['-e', 'console.log(JSON.stringify({HOME:process.env.HOME,USERPROFILE:process.env.USERPROFILE,CODEX_HOME:process.env.CODEX_HOME}))'], {
    homeDirectory, codexHomeDirectory, cwd: base,
  });
  assert.deepEqual(JSON.parse(result.stdout), { HOME: homeDirectory, USERPROFILE: homeDirectory, CODEX_HOME: codexHomeDirectory });
});

for (const real of [false, true]) for (const host of ['codex', 'pi']) test(`${real ? 'real isolated' : 'executable fixture'} ${host} withdrawal/exposure matches predicted exact selected discovery and recovers`, { skip: real && !available(host) ? 'Native host executable is unavailable; executable fixture remains covered.' : false }, async (t) => {
  const fixture_ = await fixture(t, host, { real }); const { options, adapter, context, step, configPath } = fixture_;
  const original = (await observeNativePackages(options)).state;
  assert.deepEqual(original.native.packages.map((entry) => entry.publicNames), [['ps-probe']]);
  if (host === 'pi') assert.equal(original.unrelatedDiscoveryComplete, false, 'unknown community theme preserved with qualified global discovery');
  const withdraw = step(original, 'old', 'withdraw'); const oldBackup = await adapter.prepare(withdraw, context);
  assert.deepEqual(await adapter.inspectBackup(withdraw, oldBackup.reference, context), oldBackup.expectedState);
  await adapter.apply(withdraw, context); assert.deepEqual(await adapter.inspect(withdraw, context), withdraw.after);
  const expose = step(withdraw.after, 'new', 'expose'); const newBackup = await adapter.prepare(expose, context);
  await adapter.apply(expose, context); const final = await adapter.inspect(expose, context); assert.deepEqual(final, expose.after);
  assert.deepEqual(final.native.packages.flatMap((entry) => entry.publicNames), ['qs-probe']);
  await adapter.recover(expose, newBackup.reference, context); assert.deepEqual(await adapter.inspect(expose, context), expose.before);
  await adapter.recover(withdraw, oldBackup.reference, context); assert.deepEqual(await adapter.inspect(withdraw, context), original);
  const config = await readFile(configPath, 'utf8');
  assert.ok(host === 'codex' ? config.includes('model = "fixture-preserved"') : JSON.parse(config).packages.includes('npm:community-theme-fixture'));
});

test('source edits and changed installed Codex caches block operations and preserve local bytes', async (t) => {
  const args = await fixture(t, 'codex'); const original = (await observeNativePackages(args.options)).state; const step = args.step(original, 'old', 'withdraw');
  const cacheFile = path.join(args.options.homeDirectory, '.codex/plugins/cache/qs-native-fixture/ps-probe/1.0.0/skills/ps-probe/SKILL.md');
  await appendFile(cacheFile, 'local cache edit'); await assert.rejects(args.adapter.apply(step, args.context), /cache differs/);
  assert.ok((await readFile(cacheFile, 'utf8')).endsWith('local cache edit'));
  await appendFile(path.join(args.options.packages[1].source, 'skills/qs-probe/SKILL.md'), 'source edit');
  await assert.rejects(observeNativePackages(args.options), /source changed/);
});

test('Pi filtered managed entries conflict without losing filters or community themes', async (t) => {
  const args = await fixture(t, 'pi'); const settings = JSON.parse(await readFile(args.configPath));
  settings.packages = settings.packages.map((entry) => entry.startsWith('npm:') ? entry : { source: entry, skills: [] });
  const text = JSON.stringify(settings); await writeFile(args.configPath, text);
  await assert.rejects(observeNativePackages(args.options), /Filtered Pi packages/);
  assert.equal(await readFile(args.configPath, 'utf8'), text);
});

test('native command failures preserve residual registration and retry through independent actual inspection', async (t) => {
  const args = await fixture(t, 'codex'); const before = (await observeNativePackages(args.options)).state; const step = args.step(before, 'old', 'withdraw');
  const injected = createNativePackageAdapter({ ...args.options, runCommand: async (command, arguments_, options) => {
    const result = await args.options.runCommand(command, arguments_, options);
    if (arguments_[1] === 'remove') throw new Error('fixture failure after native effect'); return result;
  } });
  await injected.prepare(step, args.context); await assert.rejects(injected.apply(step, args.context), /after native effect/);
  assert.deepEqual(await args.adapter.inspect(step, args.context), step.after);
  await assert.rejects(args.adapter.apply(step, args.context), /state changed/, 'adapter never blindly repeats a completed native effect');
});

test('changed unrelated configuration blocks stale application and recovery', async (t) => {
  const args = await fixture(t, 'pi'); const before = (await observeNativePackages(args.options)).state; const step = args.step(before, 'old', 'withdraw');
  const backup = await args.adapter.prepare(step, args.context); await args.adapter.apply(step, args.context);
  const settings = JSON.parse(await readFile(args.configPath)); settings.theme = 'user-changed'; await writeFile(args.configPath, JSON.stringify(settings));
  await assert.rejects(args.adapter.recover(step, backup.reference, args.context), /state changed/);
  assert.equal(JSON.parse(await readFile(args.configPath)).theme, 'user-changed');
});

test('linked metadata and unbound ownership targets reject without native effects', async (t) => {
  const args = await fixture(t, 'codex'); const before = (await observeNativePackages(args.options)).state; const step = args.step(before, 'old', 'withdraw');
  await assert.rejects(args.adapter.apply({ ...step, ownedTargets: [] }, args.context), /ownership/);
  const config = await readFile(args.configPath); const other = path.join(args.base, 'other'); await writeFile(other, config); await rm(args.configPath); await symlink(other, args.configPath);
  await assert.rejects(observeNativePackages(args.options), /regular file/); assert.deepEqual(await readFile(other), config);
});

for (const real of [false, true]) test(`${real ? 'real isolated' : 'executable fixture'} same Codex selector updates source version and restores exact old payload through transient override`, { skip: real && !available('codex') ? 'Native Codex unavailable; executable fixture remains covered.' : false }, async (t) => {
  const args = await fixture(t, 'codex', { real }); const old = { ...args.options.packages[0], installedOnly: true };
  const manifestPath = path.join(old.source, '.codex-plugin/plugin.json'); const manifest = JSON.parse(await readFile(manifestPath)); manifest.version = '2.0.0'; await writeFile(manifestPath, JSON.stringify(manifest));
  await appendFile(path.join(old.source, 'skills/ps-probe/SKILL.md'), 'Published improvement.\n');
  const newer = { ...old, id: 'new', version: '2.0.0', installedOnly: false, payloadSha256: (await captureMigrationPath(old.source)).contentSha256 };
  const options = { ...args.options, packages: [old, newer] }; const adapter = createNativePackageAdapter(options);
  const before = (await observeNativePackages(options)).state;
  assert.equal(before.native.packages[0].version, '1.0.0');
  const targets = [{ path: args.configPath, ownershipRecord: 'fixture-owned' }, ...options.packages.map((pkg) => ({ path: path.join(options.homeDirectory, '.codex/plugins/cache', pkg.marketplace, pkg.name, pkg.version), ownershipRecord: 'fixture-owned' }))];
  const step = (state, pkg, phase) => ({ id: `${phase}-${pkg.id}`, phase, operation: `native-${phase}`, native: { host: 'codex', packageId: pkg.id }, ownedTargets: targets, before: state, after: predictNativePackageTransition(state, { packageId: pkg.id, phase, packages: options.packages }) });
  assert.throws(() => step(before, newer, 'expose'), /duplicates public identities|existing package version/);
  const withdraw = step(before, old, 'withdraw'); const backup = await adapter.prepare(withdraw, args.context); await adapter.apply(withdraw, args.context);
  const expose = step(withdraw.after, newer, 'expose'); const newerBackup = await adapter.prepare(expose, args.context); await adapter.apply(expose, args.context);
  assert.deepEqual(await adapter.inspect(expose, args.context), expose.after); assert.equal(expose.after.native.packages[0].version, '2.0.0');
  await adapter.recover(expose, newerBackup.reference, args.context); await adapter.recover(withdraw, backup.reference, args.context);
  assert.deepEqual(await adapter.inspect(withdraw, args.context), before);
  const restored = await captureMigrationPath(targets[1].path); assert.equal(restored.contentSha256, old.payloadSha256);
  const config = await readFile(args.configPath, 'utf8'); assert.ok(config.includes(old.marketplaceRoot)); assert.ok(!config.includes('backups'));
});

test('marketplace remapping and modified backups reject without exposing replacement packages', async (t) => {
  const args = await fixture(t, 'codex'); const before = (await observeNativePackages(args.options)).state; const step = args.step(before, 'old', 'withdraw');
  const backup = await args.adapter.prepare(step, args.context);
  await appendFile(path.join(backup.reference, 'target-0'), '\n# tampered backup');
  await assert.rejects(args.adapter.inspectBackup(step, backup.reference, args.context), /backup target changed/);
  const marketPath = path.join(args.options.packages[0].marketplaceRoot, '.agents/plugins/marketplace.json'); const market = JSON.parse(await readFile(marketPath)); market.plugins[1].source.path = './plugins/ps-probe'; await writeFile(marketPath, JSON.stringify(market));
  await assert.rejects(observeNativePackages(args.options), /package mapping changed/);
});

test('unknown cache siblings and duplicate public identity additions are rejected before native withdrawal', async (t) => {
  const args = await fixture(t, 'codex'); const before = (await observeNativePackages(args.options)).state;
  const older = path.join(args.options.homeDirectory, '.codex/plugins/cache/qs-native-fixture/ps-probe/unowned-version'); await mkdir(older); await writeFile(path.join(older, 'user.txt'), 'preserve');
  await assert.rejects(observeNativePackages(args.options), /Unowned cache residue/);
  assert.equal(await readFile(path.join(older, 'user.txt'), 'utf8'), 'preserve');
  const mutated = { ...before, snapshotHash: '0'.repeat(64) };
  assert.throws(() => predictNativePackageTransition(mutated, { packageId: 'new', phase: 'expose', packages: args.options.packages }), /hash is invalid/);
});

test('a manager changing unrelated preferences fails verification and leaves residual edits visible', async (t) => {
  const args = await fixture(t, 'pi'); const before = (await observeNativePackages(args.options)).state; const step = args.step(before, 'old', 'withdraw');
  const adapter = createNativePackageAdapter({ ...args.options, runCommand: async (command, argv, context) => {
    const result = await args.options.runCommand(command, argv, context);
    if (argv[0] === 'remove') { const settings = JSON.parse(await readFile(args.configPath)); settings.theme = 'unexpected-manager-change'; await writeFile(args.configPath, JSON.stringify(settings)); }
    return result;
  } });
  await adapter.prepare(step, args.context); await assert.rejects(adapter.apply(step, args.context), /changed unrelated/);
  assert.equal(JSON.parse(await readFile(args.configPath)).theme, 'unexpected-manager-change');
});

test('coordinator resumes actual native after-effect interruption without duplicate installation and explicitly recovers', async (t) => {
  const args = await fixture(t, 'codex'); const nativeBefore = (await observeNativePackages(args.options)).state;
  const withdraw = { ...args.step(nativeBefore, 'old', 'withdraw'), adapter: 'native' };
  const expose = { ...args.step(withdraw.after, 'new', 'expose'), adapter: 'native' };
  let installations = 0;
  const native = createNativePackageAdapter({ ...args.options, runCommand: async (command, argv, context) => {
    const result = await args.options.runCommand(command, argv, context);
    if (argv[1] === 'add' && argv[2].startsWith('qs-probe@')) { installations++; throw new Error('native install returned failure after effect'); }
    return result;
  } });
  const staging = path.join(args.base, 'stage'); const stateRoot = path.join(args.base, 'state'); await mkdir(staging); await mkdir(stateRoot);
  const sha = (value) => createHash('sha256').update(value).digest('hex');
  const observeFile = async (file) => { const text = await readFile(file, 'utf8').catch((error) => error.code === 'ENOENT' ? null : Promise.reject(error)); return { exists: text !== null, contentSha256: text === null ? null : sha(text) }; };
  const localStep = async (id, phase, file, text, afterText) => {
    if (text !== null) await writeFile(file, text);
    return { id, phase, operation: id, adapter: 'file', ownedTargets: [{ path: file, ownershipRecord: 'fixture' }], before: await observeFile(file), after: { exists: afterText !== null, contentSha256: afterText === null ? null : sha(afterText) }, text, afterText };
  };
  const stage = await localStep('stage', 'stage', path.join(staging, 'verified'), null, 'verified');
  const retire = await localStep('retire', 'retire', path.join(stateRoot, 'old-owned'), 'old', null);
  const state = await localStep('state', 'state', path.join(stateRoot, 'selection'), 'old-selection', 'new-selection');
  const file = {
    inspect: (step) => observeFile(step.ownedTargets[0].path),
    async prepare(step) { const reference = path.join(stateRoot, `${step.id}-backup`); await writeFile(reference, JSON.stringify(step.text)); return { reference, expectedState: { backupSha256: sha(JSON.stringify(step.text)) } }; },
    async inspectBackup(step, reference) { return { backupSha256: sha(await readFile(reference)) }; },
    async apply(step) { if (step.afterText === null) await rm(step.ownedTargets[0].path); else await writeFile(step.ownedTargets[0].path, step.afterText); },
    async recover(step, reference) { const text = JSON.parse(await readFile(reference)); if (text === null) await rm(step.ownedTargets[0].path); else await writeFile(step.ownedTargets[0].path, text); },
  };
  const input = { journalPath: path.join(args.base, 'journal/transaction.jsonl'), ownerId: 'isolated-fixture', adapters: { native, file }, plan: { schemaVersion: 1, id: 'native-coordinator-fixture', revision: 'a'.repeat(40), evidenceHash: 'b'.repeat(64), discoveryRoots: [path.join(args.options.homeDirectory, '.codex/plugins/cache')], stagingRoots: [staging], ownedRoots: [args.base], steps: [stage, withdraw, expose, retire, state] } };
  const first = await runMigrationTransaction(input); assert.equal(first.status, 'failed'); assert.equal(first.failedStep, expose.id);
  assert.equal((await runMigrationTransaction(input)).status, 'complete'); assert.equal(installations, 1);
  const restored = await runMigrationTransaction({ ...input, mode: 'recover', recoveryAuthority: { transactionId: input.plan.id, operation: 'restore-journaled-owned-effects', source: 'isolated-fixture' } });
  assert.equal(restored.status, 'rolled-back'); assert.deepEqual((await observeNativePackages(args.options)).state, nativeBefore);
});

test('malformed configuration never includes sensitive contents in diagnostics', async (t) => {
  const args = await fixture(t, 'pi'); await writeFile(args.configPath, '{"private":"fixture-secret-value", INVALID');
  await assert.rejects(observeNativePackages(args.options), (error) => error.message.includes('contents withheld') && !error.message.includes('fixture-secret-value'));
});

test('observed unrelated public names block a future conflicting exposure before any native mutation', async (t) => {
  const args=await fixture(t,'pi');
  const vendor=path.join(args.base,'unrelated-package');await mkdir(path.join(vendor,'skills/qs-probe'),{recursive:true});
  await writeFile(path.join(vendor,'package.json'),JSON.stringify({name:'unrelated-package',version:'1.0.0',pi:{skills:['./skills']}}));
  await writeFile(path.join(vendor,'skills/qs-probe/SKILL.md'),'---\nname: qs-probe\ndescription: Separately owned command.\n---\nUnrelated.\n');
  const settings=JSON.parse(await readFile(args.configPath));settings.packages.push(vendor);await writeFile(args.configPath,JSON.stringify(settings));
  const before=await captureMigrationPath(args.options.homeDirectory), vendorBefore=await captureMigrationPath(vendor);
  const observation=await observeNativePackages(args.options);
  assert.deepEqual(observation.evidence.unrelatedPublicNames,['qs-probe']);
  assert.equal(observation.evidence.unrelatedDiscoveryComplete,false,'Unresolved remote theme stays explicitly qualified');
  assert.deepEqual(observation.state.unrelatedPublicNames,['qs-probe']);
  assert.throws(()=>predictNativePackageTransition(observation.state,{packageId:'new',phase:'expose',packages:args.options.packages}),/duplicates public identities/);
  assert.equal((await captureMigrationPath(args.options.homeDirectory)).contentSha256,before.contentSha256);
  assert.equal((await captureMigrationPath(vendor)).contentSha256,vendorBefore.contentSha256);
  await writeFile(path.join(vendor,'skills/qs-probe/SKILL.md'),'---\nname: vendor-command\ndescription: Separately owned command.\n---\nUnrelated.\n');
  await (await import('node:fs/promises')).rename(path.join(vendor,'skills/qs-probe'),path.join(vendor,'skills/vendor-command'));
  const noncolliding=await observeNativePackages(args.options);
  assert.deepEqual(noncolliding.evidence.unrelatedPublicNames,['vendor-command']);
  assert.doesNotThrow(()=>predictNativePackageTransition(noncolliding.state,{packageId:'new',phase:'expose',packages:args.options.packages}));
});

for (const host of ['codex', 'pi']) test(`real isolated ${host} preserves overlapping unrelated vendor names while rejecting a managed collision`, { skip: !available(host) ? 'Native host executable unavailable.' : false }, async (t) => {
  const args = await fixture(t, host, { real: true });
  const market = args.options.packages[0].marketplaceRoot;
  const vendorRoots = [];
  for (const name of ['vendor-a', 'vendor-b']) {
    const source = path.join(market, 'plugins', name);
    await mkdir(path.join(source, 'skills/meeting-prep'), { recursive: true });
    await writeFile(path.join(source, 'skills/meeting-prep/SKILL.md'), '---\nname: meeting-prep\ndescription: Independent vendor helper.\n---\nVendor content.\n');
    if (host === 'codex') {
      await mkdir(path.join(source, '.codex-plugin'));
      await writeFile(path.join(source, '.codex-plugin/plugin.json'), JSON.stringify({ name, version: '1.0.0', skills: './skills/' }));
      const file = path.join(market, '.agents/plugins/marketplace.json');
      const index = JSON.parse(await readFile(file));
      index.plugins.push({ name, source: { source: 'local', path: `./plugins/${name}` } });
      await writeFile(file, JSON.stringify(index));
      await args.command(['plugin', 'add', `${name}@qs-native-fixture`, '--json']);
      vendorRoots.push(path.join(args.options.homeDirectory, '.codex/plugins/cache/qs-native-fixture', name, '1.0.0'));
    } else {
      await writeFile(path.join(source, 'package.json'), JSON.stringify({ name, version: '1.0.0', pi: { skills: ['./skills'] } }));
      await args.command(['install', source]); vendorRoots.push(source);
    }
  }
  const vendorSnapshots = await Promise.all(vendorRoots.map(captureMigrationPath));
  const before = (await observeNativePackages(args.options)).state;
  assert.deepEqual(before.unrelatedPublicNames, ['meeting-prep']);
  const withdraw = args.step(before, 'old', 'withdraw');
  await args.adapter.prepare(withdraw, args.context); await args.adapter.apply(withdraw, args.context);
  const expose = args.step(withdraw.after, 'new', 'expose');
  await args.adapter.prepare(expose, args.context); await args.adapter.apply(expose, args.context);
  const after = (await observeNativePackages(args.options)).state;
  assert.deepEqual(after, expose.after);
  assert.equal(after.unrelatedHash, before.unrelatedHash);
  assert.equal(after.config.unrelatedHash, before.config.unrelatedHash);
  for (let i = 0; i < vendorRoots.length; i++) assert.equal((await captureMigrationPath(vendorRoots[i])).contentSha256, vendorSnapshots[i].contentSha256);
  const vendorSkill = path.join(vendorRoots[0], 'skills/meeting-prep');
  await writeFile(path.join(vendorSkill, 'SKILL.md'), '---\nname: qs-probe\ndescription: Conflicting independent vendor.\n---\nVendor content.\n');
  await (await import('node:fs/promises')).rename(vendorSkill, path.join(vendorRoots[0], 'skills/qs-probe'));
  await assert.rejects(observeNativePackages(args.options), /Duplicate native public identities/);
});
