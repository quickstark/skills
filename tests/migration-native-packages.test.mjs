import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { runMigrationTransaction, readMigrationJournal } from '../scripts/migration-transaction.mjs';
import { mkdtemp, mkdir, writeFile, readFile, rm, appendFile, symlink, chmod } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { captureMigrationPath } from '../scripts/migration-filesystem.mjs';
import { createNativePackageAdapter, observeNativePackages, predictNativePackageTransition, runNativePackageCommand, nativePackageOwnedTargets, nativePayloadSha256 } from '../scripts/migration-native-packages.mjs';

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
    else if (host === 'claude-code') { await mkdir(path.join(source,'.claude-plugin')); await writeFile(path.join(source,'.claude-plugin/plugin.json'),JSON.stringify({name,version,skills:[`./skills/${name}`]})); }
    else await writeFile(path.join(source, 'package.json'), JSON.stringify({ name, version, pi: { skills: ['./skills'] } }));
    const payload = await captureMigrationPath(source);
    packages.push({ id, name, version, source, payloadSha256: nativePayloadSha256(host,payload), publicNames: [name], ownershipRecord: 'fixture-owned', marketplace: 'qs-native-fixture', marketplaceRoot: market });
  }
  await writeFile(path.join(market, '.agents/plugins/marketplace.json'), JSON.stringify({ name: 'qs-native-fixture', plugins: packages.map((pkg) => ({ name: pkg.name, source: { source: 'local', path: `./plugins/${pkg.name}` } })) }));
  const options = { host, homeDirectory, codexHomeDirectory:path.join(homeDirectory,'.codex'), cwd: base, packages, backupRoot };
  if (!real) { const program = path.join(base, 'native-fixture.mjs'); await writeFile(program, nativeFixtureProgram); options.runCommand = (command, args, context) => runNativePackageCommand(process.execPath, [program, host, ...args], context); }
  const command = (args) => (options.runCommand ?? runNativePackageCommand)(host === 'claude-code' ? 'claude' : host, args, options);
  if (host === 'codex') {
    await writeFile(path.join(homeDirectory, '.codex/config.toml'), '# unrelated user preference\nmodel = "fixture-preserved"\n');
    await command(['plugin', 'marketplace', 'add', market]); await command(['plugin', 'add', 'ps-probe@qs-native-fixture', '--json']);
  } else if (host === 'claude-code') {
    await mkdir(path.join(market, '.claude-plugin'), {recursive:true});
    await writeFile(path.join(market, '.claude-plugin/marketplace.json'), JSON.stringify({name:'qs-native-fixture',owner:{name:'Fixture'},plugins:packages.map(pkg=>({name:pkg.name,source:`./plugins/${pkg.name}`}))}));
    await command(['plugin','marketplace','add',market]);
    await command(['plugin','install','ps-probe@qs-native-fixture','--scope','user']);
  } else {
    await writeFile(path.join(homeDirectory, '.pi/agent/settings.json'), JSON.stringify({ theme: 'community-kept', packages: ['npm:community-theme-fixture'], quietStartup: true }, null, 2));
    await command(['install', packages[0].source]);
  }
  const configPath = path.join(homeDirectory, host === 'codex' ? '.codex/config.toml' : host === 'claude-code' ? '.claude/settings.json' : '.pi/agent/settings.json');
  const targets = nativePackageOwnedTargets(options);
  const context = { transactionId: 'isolated-native-fixture' };
  const step = (before, packageId, phase) => ({ id: `${phase}-${packageId}`, phase, operation: `native-${phase}`, native: { host, packageId }, ownedTargets: targets, before, after: predictNativePackageTransition(before, { packageId, phase, packages }) });
  return { base, options, configPath, context, step, command, adapter: createNativePackageAdapter(options) };
}

test('unlisted foreign Codex caches remain collision and preservation guards', async (t) => {
  const args=await fixture(t,'codex');
  const foreign=path.join(args.options.codexHomeDirectory,'plugins/cache/remote-vendor/demo/1.0.0/skills/vendor-helper');
  await mkdir(foreign,{recursive:true});const file=path.join(foreign,'SKILL.md');
  const text='---\nname: vendor-helper\ndescription: Opaque foreign cache.\n---\nOriginal.\n';await writeFile(file,text);
  const before=(await observeNativePackages(args.options)).state;
  assert.ok(before.unrelatedPublicNames.includes('vendor-helper'));
  await appendFile(file,'Concurrent foreign edit.\n');
  assert.notEqual((await observeNativePackages(args.options)).state.unrelatedHash,before.unrelatedHash);
  await writeFile(file,text.replace('name: vendor-helper','name: ps-probe'));
  const config=await readFile(args.configPath);
  await assert.rejects(observeNativePackages(args.options),/Duplicate native public identities/);
  assert.deepEqual(await readFile(args.configPath),config);
});

test('native commands preserve the user home and pass the selected Codex home', async (t) => {
  const base = await mkdtemp(path.join(tmpdir(), 'qs-native-environment-')); t.after(() => rm(base, { recursive: true, force: true }));
  const homeDirectory = path.join(base, 'home'); const codexHomeDirectory = path.join(homeDirectory, '.codex-demo');
  await mkdir(codexHomeDirectory, { recursive: true });
  const result = await runNativePackageCommand(process.execPath, ['-e', 'console.log(JSON.stringify({HOME:process.env.HOME,USERPROFILE:process.env.USERPROFILE,CODEX_HOME:process.env.CODEX_HOME}))'], {
    homeDirectory, codexHomeDirectory, cwd: base,
  });
  assert.deepEqual(JSON.parse(result.stdout), { HOME: homeDirectory, USERPROFILE: homeDirectory, CODEX_HOME: codexHomeDirectory });
});

test('native commands omit inherited workload identity, preserve ordinary authentication and leave the parent unchanged', async (t) => {
  const base = await mkdtemp(path.join(tmpdir(), 'qs-native-identity-'));
  t.after(() => rm(base, { recursive: true, force: true }));
  const identityKeys = ['OPENAI_IDENTITY_TOKEN_FILE', 'OPENAI_FEDERATION_RULE_ID', 'OPENAI_WORKLOAD_IDENTITY_CONTEXT'];
  const synthetic = Object.fromEntries([...identityKeys, 'OPENAI_API_KEY'].map((key) => [key, `synthetic-${key}`]));
  const previous = new Map(Object.keys(synthetic).map((key) => [key, process.env[key]]));
  try {
    Object.assign(process.env, synthetic);
    const program = `
      const keys = ${JSON.stringify(identityKeys)};
      console.log(JSON.stringify({
        identityPresent: Object.fromEntries(keys.map(key => [key, Object.hasOwn(process.env, key)])),
        ordinaryAuthenticationPreserved: process.env.OPENAI_API_KEY === 'synthetic-OPENAI_API_KEY'
      }));
    `;
    const result = await runNativePackageCommand(process.execPath, ['-e', program], { homeDirectory: base, cwd: base });
    assert.deepEqual(JSON.parse(result.stdout), {
      identityPresent: Object.fromEntries(identityKeys.map((key) => [key, false])),
      ordinaryAuthenticationPreserved: true,
    });
    for (const [key, value] of Object.entries(synthetic)) {
      assert.equal(process.env[key] === value, true, `Parent ${key} changed during the native command.`);
    }
  } finally {
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
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

for (const real of [false, true]) test(`${real ? 'real isolated' : 'executable fixture'} Codex verifies, replaces and recovers packages across directory permissions`, { skip: real && !available('codex') }, async (t) => {
  const args = await fixture(t, 'codex', { real });
  for (const pkg of args.options.packages) {
    const source = await captureMigrationPath(pkg.source);
    for (const entry of source.entries.filter(entry => entry.kind === 'directory')) {
      await chmod(path.join(pkg.source, entry.path), 0o700);
    }
  }
  const cache = path.join(args.options.codexHomeDirectory, 'plugins/cache/qs-native-fixture/ps-probe/1.0.0');
  const installed = await captureMigrationPath(cache);
  for (const entry of installed.entries.filter(entry => entry.kind === 'directory')) {
    await chmod(path.join(cache, entry.path), 0o755);
  }
  const source = await captureMigrationPath(args.options.packages[0].source);
  assert.notEqual(source.contentSha256, (await captureMigrationPath(cache)).contentSha256);
  const original = (await observeNativePackages(args.options)).state;
  const withdraw = args.step(original, 'old', 'withdraw');
  const oldBackup = await args.adapter.prepare(withdraw, args.context);
  await args.adapter.apply(withdraw, args.context);
  const expose = args.step(withdraw.after, 'new', 'expose');
  const newBackup = await args.adapter.prepare(expose, args.context);
  await args.adapter.apply(expose, args.context);
  assert.deepEqual(await args.adapter.inspect(expose, args.context), expose.after);
  await args.adapter.recover(expose, newBackup.reference, args.context);
  await args.adapter.recover(withdraw, oldBackup.reference, args.context);
  assert.deepEqual(await args.adapter.inspect(withdraw, args.context), original);
});

for (const target of ['source', 'cache']) test(`Codex rejects an executable-bit change in the ${target}`, async (t) => {
  const args = await fixture(t, 'codex');
  const before = (await observeNativePackages(args.options)).state;
  const root = target === 'source' ? args.options.packages[0].source
    : path.join(args.options.codexHomeDirectory, 'plugins/cache/qs-native-fixture/ps-probe/1.0.0');
  await chmod(path.join(root, 'skills/ps-probe/SKILL.md'), 0o755);
  await assert.rejects(args.adapter.apply(args.step(before, 'old', 'withdraw'), args.context), /source changed|cache differs/);
});

test('Codex backup validation retains exact directory permissions', async (t) => {
  const args = await fixture(t, 'codex');
  const before = (await observeNativePackages(args.options)).state;
  const step = args.step(before, 'old', 'withdraw');
  const backup = await args.adapter.prepare(step, args.context);
  const cacheIndex = step.ownedTargets.findIndex(target => target.path.endsWith('/ps-probe/1.0.0'));
  const directory = path.join(backup.reference, `target-${cacheIndex}`, 'skills');
  const snapshot = await captureMigrationPath(directory);
  await chmod(directory, snapshot.entries[0].mode === 0o700 ? 0o755 : 0o700);
  await assert.rejects(args.adapter.inspectBackup(step, backup.reference, args.context), /backup target changed/);
});

test('Codex still rejects a source directory permission change after planning', async (t) => {
  const args = await fixture(t, 'codex');
  const before = (await observeNativePackages(args.options)).state;
  const source = args.options.packages[0].source;
  const snapshot = await captureMigrationPath(source);
  await chmod(source, snapshot.entries[0].mode === 0o700 ? 0o755 : 0o700);
  await assert.rejects(args.adapter.prepare(args.step(before, 'old', 'withdraw'), args.context), /state changed before backup/);
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
  for (const entry of (await captureMigrationPath(old.source)).entries.filter(entry => entry.kind === 'directory')) {
    await chmod(path.join(old.source, entry.path), 0o700);
  }
  const newer = { ...old, id: 'new', version: '2.0.0', installedOnly: false, payloadSha256: nativePayloadSha256('codex', await captureMigrationPath(old.source)) };
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
  const restored = await captureMigrationPath(targets[1].path); assert.equal(nativePayloadSha256('codex', restored), old.payloadSha256);
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


test('real isolated Claude withdrawal/exposure retains caches, preserves settings, and restores exact backups', {skip:!available('claude')}, async t => {
  const args = await fixture(t, 'claude-code', {real:true});
  const originalSettings = await readFile(args.configPath);
  const original = (await observeNativePackages(args.options)).state;
  const withdraw = args.step(original, 'old', 'withdraw');
  const oldBackup = await args.adapter.prepare(withdraw, args.context);
  await args.adapter.apply(withdraw, args.context);
  assert.deepEqual(await args.adapter.inspect(withdraw, args.context), withdraw.after);
  assert.equal(withdraw.after.caches.find(entry=>entry.id==='old').kind, 'directory');
  const expose = args.step(withdraw.after, 'new', 'expose');
  const newBackup = await args.adapter.prepare(expose, args.context);
  await args.adapter.apply(expose, args.context);
  assert.deepEqual(await args.adapter.inspect(expose, args.context), expose.after);
  await args.adapter.recover(expose, newBackup.reference, args.context);
  await args.adapter.recover(withdraw, oldBackup.reference, args.context);
  assert.deepEqual(await args.adapter.inspect(withdraw, args.context), original);
  assert.deepEqual(await readFile(args.configPath), originalSettings);
  await appendFile(path.join(args.options.homeDirectory,'.claude/plugins/cache/qs-native-fixture/ps-probe/1.0.0/skills/ps-probe/SKILL.md'), 'user edit');
  await assert.rejects(observeNativePackages(args.options), /cached payload differs/);
});

test('native commands isolate inherited Claude and Pi config overrides in explicit homes', async t => {
  const base=await mkdtemp(path.join(tmpdir(),'qs-native-profile-'));t.after(()=>rm(base,{recursive:true,force:true}));
  const result=await runNativePackageCommand(process.execPath,['-e','console.log(JSON.stringify({claude:process.env.CLAUDE_CONFIG_DIR,pi:process.env.PI_CODING_AGENT_DIR}))'],{homeDirectory:base,cwd:base});
  assert.deepEqual(JSON.parse(result.stdout),{claude:path.join(base,'.claude'),pi:path.join(base,'.pi/agent')});
});

test('real isolated Claude updates the same selector and recovers the old version without changing its marketplace', {skip:!available('claude')}, async t => {
  const args=await fixture(t,'claude-code',{real:true});
  const old={...args.options.packages[0],installedOnly:true};
  const manifestPath=path.join(old.source,'.claude-plugin/plugin.json');
  const manifest=JSON.parse(await readFile(manifestPath));manifest.version='2.0.0';await writeFile(manifestPath,JSON.stringify(manifest));
  const newer={...old,id:'release',version:'2.0.0',installedOnly:false,payloadSha256:nativePayloadSha256('claude-code',await captureMigrationPath(old.source))};
  const options={...args.options,packages:[old,newer]};const adapter=createNativePackageAdapter(options);
  const original=(await observeNativePackages(options)).state;
  const step=(before,pkg,phase)=>({id:`${phase}-${pkg.id}`,phase,operation:`native-${phase}`,native:{host:'claude-code',packageId:pkg.id},ownedTargets:nativePackageOwnedTargets(options),before,after:predictNativePackageTransition(before,{packageId:pkg.id,phase,packages:options.packages})});
  const withdraw=step(original,old,'withdraw');const oldBackup=await adapter.prepare(withdraw,args.context);await adapter.apply(withdraw,args.context);
  const expose=step(withdraw.after,newer,'expose');const newBackup=await adapter.prepare(expose,args.context);await adapter.apply(expose,args.context);
  assert.deepEqual(await adapter.inspect(expose,args.context),expose.after);
  await adapter.recover(expose,newBackup.reference,args.context);await adapter.recover(withdraw,oldBackup.reference,args.context);
  assert.deepEqual(await adapter.inspect(withdraw,args.context),original);
});

async function claudeDiscoveredCommands({homeDirectory,cwd}) {
  // Initialization enumerates commands without submitting a model turn.
  return new Promise((resolve,reject)=>{
    const child=spawn('claude',['--print','--input-format','stream-json','--output-format','stream-json','--verbose'],{cwd,
      env:{...process.env,HOME:homeDirectory,USERPROFILE:homeDirectory,CLAUDE_CONFIG_DIR:path.join(homeDirectory,'.claude')}});
    let buffer='';let settled=false;
    const finish=(error,names)=>{if(settled)return;settled=true;clearTimeout(timer);
      const complete=()=>error?reject(error):resolve(names);
      // Fixture cleanup must wait until the CLI stops writing to its isolated home.
      if(child.exitCode!==null||child.signalCode!==null)complete();else child.once('close',complete);
      child.stdin.end();child.kill('SIGTERM');};
    const timer=setTimeout(()=>finish(new Error('Claude native command discovery timed out.')),30000);
    child.stderr.resume();
    child.on('error',error=>finish(error));child.on('close',()=>{if(!settled)finish(new Error('Claude exited before command discovery.'));});
    child.stdout.on('data',bytes=>{
      buffer+=bytes;assert.ok(buffer.length<4*1024*1024,'Bounded Claude discovery response required.');
      let end;while((end=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,end);buffer=buffer.slice(end+1);if(!line.trim())continue;
        const value=JSON.parse(line);if(value.type==='control_response'&&value.response?.request_id==='fixture-init'){
          const commands=value.response.response?.commands;
          if(!Array.isArray(commands))finish(new Error('Claude initialization omitted commands.'));
          else finish(null,commands.map(entry=>entry.name));
        }
      }
    });
    child.stdin.write(JSON.stringify({type:'control_request',request_id:'fixture-init',request:{subtype:'initialize'}})+'\n');
  });
}

test('real isolated Claude installs every maintained projection with exactly the registered public names', {skip:!available('claude')}, async t=>{
  const {TARGET_SKILL_COLLECTIONS}=await import('../scripts/skill-collection-registry.mjs');
  const repositoryRoot=path.resolve(import.meta.dirname,'..');
  const homeDirectory=await mkdtemp(path.join(tmpdir(),'qs-maintained-claude-'));t.after(()=>rm(homeDirectory,{recursive:true,force:true}));
  const options={host:'claude-code',homeDirectory,cwd:repositoryRoot};
  await runNativePackageCommand('claude',['plugin','marketplace','add',repositoryRoot],options);
  const packages=[];
  for(const collection of TARGET_SKILL_COLLECTIONS) {
    const source=path.join(repositoryRoot,collection.claudePackageRoot);
    const manifest=JSON.parse(await readFile(path.join(source,'.claude-plugin/plugin.json')));
    packages.push({id:collection.id,name:collection.id,version:manifest.version,source,payloadSha256:nativePayloadSha256('claude-code',await captureMigrationPath(source)),
      publicNames:collection.publicCommands,ownershipRecord:'isolated-maintained-projection',marketplace:'quickstark',marketplaceRoot:repositoryRoot});
    await runNativePackageCommand('claude',['plugin','validate',source,'--strict'],options);
    await runNativePackageCommand('claude',['plugin','install',`${collection.id}@quickstark`,'--scope','user'],options);
  }
  const state=(await observeNativePackages({...options,packages})).state;
  assert.deepEqual(state.native.packages.map(entry=>entry.id).sort(),TARGET_SKILL_COLLECTIONS.map(entry=>entry.id).sort());
  assert.deepEqual(state.native.packages.flatMap(entry=>entry.publicNames).sort(),TARGET_SKILL_COLLECTIONS.flatMap(entry=>entry.publicCommands).sort());
  assert.equal(state.native.packages.flatMap(entry=>entry.publicNames).length,39);
  const workspace=path.join(homeDirectory,'workspace');await mkdir(workspace);
  const discovered=(await claudeDiscoveredCommands({homeDirectory,cwd:workspace})).filter(name=>name.startsWith('qs-')).sort();
  const expected=TARGET_SKILL_COLLECTIONS.flatMap(collection=>collection.publicCommands.map(name=>`${collection.id}:${name}`)).sort();
  assert.deepEqual(discovered,expected);

});

test('Claude recovery preserves a concurrent settings edit made during native inspection', {skip:!available('claude')}, async t => {
  const args=await fixture(t,'claude-code',{real:true});
  const original=(await observeNativePackages(args.options)).state;
  const step={...args.step(original,'old','withdraw'),adapter:'native'};
  let recovering=false;let injected=false;
  const adapter=createNativePackageAdapter({...args.options,runCommand:async(command,argv,options)=>{
    const result=await runNativePackageCommand(command,argv,options);
    if(recovering&&!injected&&argv[1]==='marketplace'&&argv[2]==='list'){
      injected=true;const settings=JSON.parse(await readFile(args.configPath));settings.theme='concurrent-user-edit';await writeFile(args.configPath,JSON.stringify(settings));
    }
    return result;
  }});
  const input={journalPath:path.join(args.base,'journal/transaction.jsonl'),ownerId:'isolated-regression',
    adapters:{native:{...adapter,recover:async(...values)=>{recovering=true;return adapter.recover(...values);}}},
    plan:{schemaVersion:1,id:args.context.transactionId,revision:'a'.repeat(40),evidenceHash:'b'.repeat(64),discoveryRoots:[path.join(args.options.homeDirectory,'.claude/plugins/cache')],stagingRoots:[path.join(args.base,'staging')],ownedRoots:[args.base],steps:[step]}};
  assert.equal((await runMigrationTransaction(input)).status,'complete');
  const result=await runMigrationTransaction({...input,mode:'recover',recoveryAuthority:{transactionId:input.plan.id,operation:'restore-journaled-owned-effects',source:'isolated-fixture'}});
  assert.equal(injected,true);
  assert.equal(JSON.parse(await readFile(args.configPath)).theme,'concurrent-user-edit');
  assert.equal(result.status,'recovery-failed');
});

async function interruptClaudeRecovery(args, recovery, cache = null) {
  // A separate process loses all adapter memory after the selected filesystem effect.
  const program=`import fs from 'node:fs';import path from 'node:path';import {syncBuiltinESMExports} from 'node:module';
    import {runMigrationTransaction} from ${JSON.stringify(new URL('../scripts/migration-transaction.mjs',import.meta.url).href)};
    import {createNativePackageAdapter} from ${JSON.stringify(new URL('../scripts/migration-native-packages.mjs',import.meta.url).href)};
    const {input,options,settings,cache}=JSON.parse(process.argv[1]);const rename=fs.promises.rename;const unlink=fs.promises.unlink;
    fs.promises.rename=async(from,to)=>{const result=await rename(from,to);if(!cache&&to===settings)throw new Error('Interrupted after atomic settings restore.');return result;};
    fs.promises.unlink=async(file)=>{const result=await unlink(file);if(cache&&file.startsWith(cache+path.sep))throw new Error('Interrupted during owned cache removal.');return result;};syncBuiltinESMExports();
    console.log(JSON.stringify(await runMigrationTransaction({...input,adapters:{native:createNativePackageAdapter(options)}})));`;
  return JSON.parse((await runNativePackageCommand(process.execPath,['--input-type=module','-e',program,JSON.stringify({input:recovery,options:args.options,settings:args.configPath,cache})],args.options)).stdout);
}

for (const edit of [null, 'settings', 'metadata', 'receipt']) test(`Claude interrupted rollback resumes between settings and metadata${edit ? ` and preserves edited ${edit}` : ''}`, {skip:!available('claude')}, async t => {
  const args=await fixture(t,'claude-code',{real:true});
  const original=(await observeNativePackages(args.options)).state;
  const step={...args.step(original,'old','withdraw'),adapter:'native'};
  const input={journalPath:path.join(args.base,'journal/transaction.jsonl'),ownerId:'isolated-rollback-regression',
    plan:{schemaVersion:1,id:args.context.transactionId,revision:'a'.repeat(40),evidenceHash:'b'.repeat(64),discoveryRoots:[path.join(args.options.homeDirectory,'.claude/plugins/cache')],stagingRoots:[path.join(args.base,'staging')],ownedRoots:[args.base],steps:[step]}};
  assert.equal((await runMigrationTransaction({...input,adapters:{native:args.adapter}})).status,'complete');
  const recovery={...input,mode:'recover',recoveryAuthority:{transactionId:input.plan.id,operation:'restore-journaled-owned-effects',source:'isolated-fixture'}};
  const failed=await interruptClaudeRecovery(args,recovery);
  assert.equal(failed.status,'recovery-failed');assert.match(failed.error,/Interrupted after atomic settings restore/);
  const metadata=path.join(args.options.homeDirectory,'.claude/plugins/installed_plugins.json');
  assert.equal(JSON.parse(await readFile(args.configPath)).enabledPlugins['ps-probe@qs-native-fixture'],true);
  assert.deepEqual(JSON.parse(await readFile(metadata)).plugins,{});
  const file=edit==='settings'?args.configPath:metadata;
  if(edit==='receipt'){
    const journal=await readMigrationJournal(input.journalPath);
    const evidence=journal.events.findLast(event=>event.kind==='recover-intent').data.recovery;
    await appendFile(evidence.path,'tampered receipt');
  } else if(edit){const value=JSON.parse(await readFile(file));value.concurrentEdit='preserve this edit';await writeFile(file,JSON.stringify(value));}
  const before=await Promise.all([args.configPath,metadata].map(file=>readFile(file,'utf8')));
  if(!edit){const forward=await runMigrationTransaction({...input,adapters:{native:createNativePackageAdapter(args.options)}});assert.equal(forward.status,'failed');assert.match(forward.error,/Resume authorized recovery/);}
  const result=await runMigrationTransaction({...recovery,adapters:{native:createNativePackageAdapter(args.options)}});
  if(edit){assert.equal(result.status,'recovery-failed');assert.deepEqual(await Promise.all([args.configPath,metadata].map(file=>readFile(file,'utf8'))),before);}
  else {assert.equal(result.status,'rolled-back',result.error);assert.deepEqual((await observeNativePackages(args.options)).state,original);}
});


test('Claude interrupted rollback resumes partial removal of a newly exposed cache', {skip:!available('claude')}, async t => {
  const args=await fixture(t,'claude-code',{real:true});
  const original=(await observeNativePackages(args.options)).state;
  const step={...args.step(original,'new','expose'),adapter:'native'};
  const input={journalPath:path.join(args.base,'journal/transaction.jsonl'),ownerId:'isolated-cache-rollback-regression',
    plan:{schemaVersion:1,id:args.context.transactionId,revision:'a'.repeat(40),evidenceHash:'b'.repeat(64),discoveryRoots:[path.join(args.options.homeDirectory,'.claude/plugins/cache')],stagingRoots:[path.join(args.base,'staging')],ownedRoots:[args.base],steps:[step]}};
  assert.equal((await runMigrationTransaction({...input,adapters:{native:args.adapter}})).status,'complete');
  const recovery={...input,mode:'recover',recoveryAuthority:{transactionId:input.plan.id,operation:'restore-journaled-owned-effects',source:'isolated-fixture'}};
  const cache=path.join(args.options.homeDirectory,'.claude/plugins/cache/qs-native-fixture/qs-probe/2.0.0');
  const failed=await interruptClaudeRecovery(args,recovery,cache);
  assert.equal(failed.status,'recovery-failed');assert.match(failed.error,/Interrupted during owned cache removal/);
  assert.equal((await captureMigrationPath(cache)).kind,'directory');
  const result=await runMigrationTransaction({...recovery,adapters:{native:createNativePackageAdapter(args.options)}});
  assert.equal(result.status,'rolled-back',result.error);
  assert.equal((await captureMigrationPath(cache)).kind,'absent');
  assert.deepEqual((await observeNativePackages(args.options)).state,original);
});

async function claudeRecoveryWithUnrelatedPlugin(t, { inspectable = true } = {}) {
  const args=await fixture(t,'claude-code',{real:true});
  await args.command(['plugin','install','qs-probe@qs-native-fixture','--scope','user']);
  const unrelatedCache=path.join(args.options.homeDirectory,'.claude/plugins/cache/qs-native-fixture/qs-probe/2.0.0');
  if(!inspectable) await symlink('/unavailable-plugin-resource',path.join(unrelatedCache,'unverifiable-link'));
  // Bind only the old package. The second installed plugin remains unrelated.
  const options={...args.options,packages:[args.options.packages[0]]};
  const original=(await observeNativePackages(options)).state;
  const step={id:'withdraw-old',phase:'withdraw',operation:'native-withdraw',adapter:'native',native:{host:'claude-code',packageId:'old'},
    ownedTargets:nativePackageOwnedTargets(options),before:original,
    after:predictNativePackageTransition(original,{packageId:'old',phase:'withdraw',packages:options.packages})};
  const input={journalPath:path.join(args.base,'journal/transaction.jsonl'),ownerId:'isolated-unrelated-rollback-regression',
    plan:{schemaVersion:1,id:args.context.transactionId,revision:'a'.repeat(40),evidenceHash:'b'.repeat(64),discoveryRoots:[path.join(options.homeDirectory,'.claude/plugins/cache')],stagingRoots:[path.join(args.base,'staging')],ownedRoots:[args.base],steps:[step]}};
  assert.equal((await runMigrationTransaction({...input,adapters:{native:createNativePackageAdapter(options)}})).status,'complete');
  const recovery={...input,mode:'recover',recoveryAuthority:{transactionId:input.plan.id,operation:'restore-journaled-owned-effects',source:'isolated-fixture'}};
  return {...args,options,original,step,recovery,unrelatedCache};
}

for(const edit of [null,'body','identity']) test(`Claude paused rollback ${edit ? `rejects unrelated plugin ${edit} drift before restoring registrations` : 'resumes with an unchanged unrelated plugin'}`, {skip:!available('claude')}, async t => {
  const args=await claudeRecoveryWithUnrelatedPlugin(t);
  const interrupted=await interruptClaudeRecovery(args,args.recovery);
  assert.equal(interrupted.status,'recovery-failed');assert.match(interrupted.error,/Interrupted after atomic settings restore/);
  const file=path.join(args.unrelatedCache,'skills/qs-probe/SKILL.md');
  if(edit==='identity')await writeFile(file,(await readFile(file,'utf8')).replace('name: qs-probe','name: ps-probe'));
  else if(edit==='body')await appendFile(file,'Concurrent unrelated plugin edit.\n');
  const ownedBefore=await Promise.all(args.step.ownedTargets.map(target=>captureMigrationPath(target.path)));
  const unrelatedBefore=await captureMigrationPath(args.unrelatedCache);
  const result=await runMigrationTransaction({...args.recovery,adapters:{native:createNativePackageAdapter(args.options)}});
  if(edit){
    assert.equal(result.status,'recovery-failed');
    assert.deepEqual(await Promise.all(args.step.ownedTargets.map(target=>captureMigrationPath(target.path))),ownedBefore,'Drift must block before changing any owned file or registration.');
    assert.match(result.error,/changed after planning/);
  }else{
    assert.equal(result.status,'rolled-back',result.error);
    assert.deepEqual((await observeNativePackages(args.options)).state,args.original);
  }
  assert.deepEqual(await captureMigrationPath(args.unrelatedCache),unrelatedBefore,'Recovery must preserve unrelated payload bytes.');
});

test('Claude recovery refuses an unverifiable active unrelated payload before any restoration', {skip:!available('claude')}, async t => {
  const args=await claudeRecoveryWithUnrelatedPlugin(t,{inspectable:false});
  const before=await Promise.all(args.step.ownedTargets.map(target=>captureMigrationPath(target.path)));
  const result=await runMigrationTransaction({...args.recovery,adapters:{native:createNativePackageAdapter(args.options)}});
  assert.equal(result.status,'recovery-failed');assert.match(result.error,/unrelated plugin payloads must be inspectable/);
  assert.deepEqual(await Promise.all(args.step.ownedTargets.map(target=>captureMigrationPath(target.path))),before);
  const journal=await readMigrationJournal(args.recovery.journalPath);
  assert.equal(journal.events.some(event=>event.kind==='recover-intent'),false,'Unverifiable payloads must fail before preparing restoration effects.');
});
