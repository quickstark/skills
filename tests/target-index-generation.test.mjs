import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, mkdir, readFile, writeFile, readdir, rm, symlink } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderTargetIndexDocuments, syncV3Documentation } from '../scripts/sync-v3-docs.mjs';
import { TARGET_PUBLIC_COMMANDS, REGISTRY_STATE } from '../scripts/skill-collection-registry.mjs';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const run = promisify(execFile);
const engineering = [
  'qs-help','qs-setup','qs-plan-clarify','qs-plan-roadmap','qs-plan-spec','qs-code-build','qs-code-debug','qs-review-code','qs-git-merge','qs-deploy-release','qs-flow-triage',
  'qs-plan-research','qs-design-prototype','qs-code-document','qs-test-author','qs-test-verify','qs-deploy-prompt',
  'qs-how','qs-why','qs-blast-radius','qs-runtime-forensics','qs-trace-forensics','qs-create-verification-skill','qs-maintain-verification-skill','qs-skill-eval','qs-hillclimb','qs-visual-parity','qs-pr-babysit','qs-worktree-cleanup',
  'qs-design-frontend','qs-design-image-web','qs-design-image-mobile','qs-design-image-to-code','qs-unlazy',
];
const productivity = ['qs-flow-handoff','qs-learn-teach','qs-skill-write'];
const video = ['qs-video'];
const psOriginals = ['ps-help','ps-how','ps-why','ps-blast-radius','ps-runtime-forensics','ps-trace-forensics','ps-create-verification-skill','ps-maintain-verification-skill','ps-skill-eval','ps-hillclimb','ps-visual-parity','ps-pr-babysit','ps-worktree-cleanup'];
const indexPaths=['skills/engineering/README.md','skills/productivity/README.md','skills/video/README.md','docs/pstack/index.md','docs/pstack/using-ps-skills.md'];
async function fixture(t) {
  const root=await mkdtemp(join(tmpdir(),'qs-target-index-')); t.after(()=>rm(root,{recursive:true,force:true}));
  for(const [bucket,names] of [['engineering',engineering],['productivity',productivity],['video',video]]) for(const name of names) {
    const directory=join(root,'skills',bucket,name); await mkdir(directory,{recursive:true}); await writeFile(join(directory,'SKILL.md'),`---\nname: ${name}\ndescription: Isolated fixture.\n---\n`);
  }
  return root;
}
const namesIn = text => [...text.matchAll(/^- \[(qs-[a-z-]+)\]\(\.\/(qs-[a-z-]+)\/SKILL\.md\)/gm)].map(match=>{assert.equal(match[1],match[2]);return match[1];});
async function snapshot(root) {
  const result={};
  async function visit(directory,prefix='') {for(const entry of await readdir(directory,{withFileTypes:true})) {const relative=prefix+entry.name;if(entry.isDirectory()) await visit(join(directory,entry.name),relative+'/');else if(entry.isFile()) result[relative]=await readFile(join(directory,entry.name),'utf8');else result[relative]='non-regular';}}
  await visit(root); return result;
}

test('target indexes expose exactly the independently expected 38 names in their lifecycle buckets',()=>{
  const documents=renderTargetIndexDocuments(); assert.deepEqual([...documents.keys()],indexPaths);
  const actual=[...namesIn(documents.get(indexPaths[0])),...namesIn(documents.get(indexPaths[1])),...namesIn(documents.get(indexPaths[2]))];
  assert.equal(actual.length,38); assert.equal(new Set(actual).size,38);
  assert.deepEqual(namesIn(documents.get(indexPaths[0])),engineering); assert.deepEqual(namesIn(documents.get(indexPaths[1])),productivity); assert.deepEqual(namesIn(documents.get(indexPaths[2])),video);
  for(const path of indexPaths.slice(0,3)) {
    const text=documents.get(path); assert.doesNotMatch(text,/\]\([^)]*(?:internal|modules|pstack\/commands|personal|deprecated|in-progress)[^)]*SKILL\.md\)/);
    assert.doesNotMatch(text,/^- \[ps-/m); assert.match(text,/default selection is the core package/); assert.match(text,/Optional packages are explicit choices/); assert.match(text,/not commands or additional picker entries/);
  }
  assert.equal(actual.filter(name=>name==='qs-deploy-prompt').length,1); assert.equal(actual.filter(name=>name==='qs-visual-parity').length,1);
  assert.deepEqual(renderTargetIndexDocuments({commands:[...TARGET_PUBLIC_COMMANDS].reverse()}),documents,'Lifecycle grouping must not inherit caller array order');
});
test('historical PS pages map every original identity to exact QS successor without fresh PS installation or alias recommendations',()=>{
  const docs=renderTargetIndexDocuments(), index=docs.get('docs/pstack/index.md'), using=docs.get('docs/pstack/using-ps-skills.md');
  const rows=index.split('\n').filter(line=>line.startsWith('| `ps-'));
  assert.equal(rows.length,13); assert.deepEqual(rows.map(row=>row.match(/^\| `(ps-[a-z-]+)`/)[1]),psOriginals);
  for(const [position,old] of psOriginals.entries()) {
    const next=old.replace(/^ps-/,'qs-'),pkg=old==='ps-help'?'qs-skills':'qs-advanced';
    assert.ok(rows[position].includes(`[\`${next}\`](../engineering/${next}.md)`));assert.ok(rows[position].includes(`$${pkg}:${next}`));
  }
  for(const text of [index,using]) {assert.match(text,/migration/); assert.match(text,/provenance/); assert.doesNotMatch(text,/(?:plugin (?:add|install)|npx skills add)[^\n]*ps-skills|\$ps-skills:|\/skill:ps-/);assert.match(text,/not.*alias|does not create an alias/);}
  assert.match(index,/3\.8\.0/); assert.match(index,/63d938c2e4a165a0fec1bd0f61a8e325f0cb751e/);assert.match(index,/Lauren Tan/);assert.match(index,/MIT notices/);
  assert.match(using,/live symptom.*existing artifact/);assert.match(using,/creates a missing.*reconciles an existing/);assert.match(using,/immutable visual baseline/);assert.match(using,/sixteen advanced private capabilities/);assert.match(using,/qs-deploy-prompt/);assert.match(using,/qs-skill-write/);assert.match(using,/deployment goal prompt without executing it/);assert.match(using,/reusable skill\/prompt writing/);assert.match(index,/qs-skill-write/);
});
test('target generation checks real local identity and every index link, preserves completion tails, and detects missing or wrong links without writes',async t=>{
  const root=await fixture(t);const result=await syncV3Documentation({root,registryState:'target'});assert.equal(result.commands,38);assert.equal(result.indexes,5);assert.equal(result.updated,43);
  for(const path of indexPaths.slice(0,3)) for(const name of namesIn(await readFile(join(root,path),'utf8'))) assert.match(await readFile(join(dirname(join(root,path)),name,'SKILL.md'),'utf8'),new RegExp(`^name: ${name}$`,'m'));
  const commandDoc=join(root,'docs/engineering/qs-code-build.md');await writeFile(commandDoc,(await readFile(commandDoc,'utf8'))+'retained generated completion contract\n');
  const stable=await snapshot(root);assert.equal((await syncV3Documentation({root,registryState:'target',check:true})).updated,0);assert.deepEqual(await snapshot(root),stable);
  const index=join(root,'skills/engineering/README.md');const original=await readFile(index,'utf8');
  for(const mutated of [original.replace('./qs-code-build/SKILL.md','./qs-code-debug/SKILL.md'),original.replace(/^- \[qs-deploy-prompt\].*\n/m,''),original+'\n- [ps-how](../../pstack/commands/ps-how/SKILL.md)\n']) {
    await writeFile(index,mutated);const before=await snapshot(root);await assert.rejects(syncV3Documentation({root,registryState:'target',check:true}),/skills\/engineering\/README.md/);assert.deepEqual(await snapshot(root),before);
  }
  await writeFile(index,original);await rm(join(root,'skills/video/README.md'));await assert.rejects(syncV3Documentation({root,registryState:'target',check:true}),/skills\/video\/README.md/);
});
test('missing, mismatched, linked canonical sources and unsafe output paths block before any generated writes',async t=>{
  const root=await fixture(t), file=join(root,'skills/engineering/qs-visual-parity/SKILL.md'), original=await readFile(file,'utf8');
  await rm(file);let before=await snapshot(root);await assert.rejects(syncV3Documentation({root,registryState:'target'}),/Missing canonical public source: qs-visual-parity/);assert.deepEqual(await snapshot(root),before);
  await writeFile(file,original.replace('name: qs-visual-parity','name: ps-visual-parity'));before=await snapshot(root);await assert.rejects(syncV3Documentation({root,registryState:'target'}),/Wrong canonical public identity/);assert.deepEqual(await snapshot(root),before);
  await rm(file);await symlink(join(root,'skills/engineering/qs-how/SKILL.md'),file);await assert.rejects(syncV3Documentation({root,registryState:'target'}),/regular local file/);await rm(file);await writeFile(file,original);
  await mkdir(join(root,'docs'));await symlink(join(root,'skills/engineering'),join(root,'docs/engineering'));before=await snapshot(root);await assert.rejects(syncV3Documentation({root,registryState:'target'}),/regular local entries/);assert.deepEqual(await snapshot(root),before);
});
test('malformed catalog identity and path controls reject rather than publish a private or misrouted root',()=>{
  for(const mutate of [commands=>commands.pop(),commands=>commands[0].name='domain-modeling',commands=>commands[0].name='qs-private-context',commands=>commands[0].name=commands[1].name,commands=>commands[0].sourcePath='skills/engineering/qs-how',commands=>commands[0].documentationPath='../outside.md',commands=>commands[0].bucket='video']) {
    const commands=structuredClone(TARGET_PUBLIC_COMMANDS);mutate(commands);assert.throws(()=>renderTargetIndexDocuments({commands}),/public|canonical|documentation|identit/);
  }
});
test('legacy generation leaves its existing indexes and PS guides unchanged; importing never runs the generator',async t=>{
  const root=await fixture(t);
  for(const path of indexPaths) {await mkdir(dirname(join(root,path)),{recursive:true});await writeFile(join(root,path),`Existing legacy content for ${path}\n`);}
  const before=Object.fromEntries(await Promise.all(indexPaths.map(async path=>[path,await readFile(join(root,path),'utf8')])));
  const result=await syncV3Documentation({root,registryState:'legacy'});assert.equal(result.commands,33);assert.equal(result.indexes,0);assert.equal(result.updated,33);
  for(const path of indexPaths) assert.equal(await readFile(join(root,path),'utf8'),before[path]);
  assert.equal((await syncV3Documentation({root,registryState:'legacy',check:true})).updated,0);
  const imported=await run(process.execPath,['--input-type=module','-e',`await import(${JSON.stringify(new URL('../scripts/sync-v3-docs.mjs',import.meta.url).href)})`],{cwd:root});assert.equal(imported.stdout,'');
  // The executable follows its repository's actual state, independently of the legacy helper probe above.
  await syncV3Documentation({root,registryState:REGISTRY_STATE});
  assert.equal((await run(process.execPath,[join(repositoryRoot,'scripts/sync-v3-docs.mjs'),'--root',root,'--check'],{cwd:root})).stderr,'');
});
