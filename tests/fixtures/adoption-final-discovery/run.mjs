#!/usr/bin/env node
// Actual native enumeration, then relocated projected-resource execution. No model turns.
import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { captureMigrationPath } from '../../../scripts/migration-filesystem.mjs';

const repo=resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const packages=['qs-skills','qs-specialists','qs-advanced','qs-frontend','qs-video','qs-execution'];
const roots=packages.flatMap(p=>['codex/plugins/'+p,'pi/packages/'+p,
  ...(p==='qs-skills'?[]:['packages/'+p])]);
const paths=[...roots,'.claude-plugin/plugin.json','package.json', 'skills/engineering','skills/productivity',
  'skills/frontend','skills/video', 'scripts/skill-collection-registry.mjs',
  'scripts/migration-filesystem.mjs','tests/fixtures/target-activation-probe/native-discovery.py',
  'tests/fixtures/adoption-final-discovery/run.mjs'];
const digest=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const write=(p,v)=>writeFileSync(p,JSON.stringify(v,null,2)+'\n');
const mode=process.argv[2], out=resolve(process.argv[3] ?? '');
assert(['run','verify'].includes(mode) && process.argv[3], 'Usage: node run.mjs run|verify OUTPUT');
async function snapshots() {
  const records=[];
  for(const p of paths) {
    const s=await captureMigrationPath(join(repo,p));
    assert(s.contentSha256, `Missing ${p}`);
    records.push({path:p,kind:s.kind,contentSha256:s.contentSha256,files:s.files,bytes:s.bytes});
  }
  return records;
}
if(mode==='verify') {
  const record=JSON.parse(readFileSync(join(out,'result.json')));
  assert.equal(record.status,'passed');
  assert.deepEqual(await snapshots(),record.bindings);
  for(const f of record.evidence) assert.equal(digest(join(out,f.path)),f.sha256,f.path);
  assert.equal(record.modelRequests,0);
  console.log(JSON.stringify({status:'passed',bindings:record.bindings.length,hostClosures:record.closure.length,modelRequests:0}));
  process.exit(0);
}
assert(!existsSync(out),'Output must be a fresh directory; original failures stay intact');
mkdirSync(out,{recursive:true});
const record={schemaVersion:1,status:'running',repository:repo,version:JSON.parse(readFileSync(join(repo,'package.json'))).version,
  checkedAt:new Date().toISOString(),runtime:{node:process.version,platform:process.platform,arch:process.arch},modelRequests:0,
  commands:[],closure:[],bindings:await snapshots(),evidence:[],
  limitations:['Native enumeration is not model routing or actual machine migration.',
    'This run checks projected private closure and relocated local helpers; no fresh render, provider or speech-model execution.',
    'Unlazy checker status binds definitions, not transitive input contents; explicit reverify is required.',
    'Only this Linux runtime is exercised; historical Node16 and media-runtime evidence remains separately scoped.']};
const save=()=>write(join(out,'result.json'),record);
function command(args,{cwd=repo,env=process.env,expected=0,timeout=90000}={}) {
  const r=spawnSync(args[0],args.slice(1),{cwd,env,encoding:'utf8',timeout});
  record.commands.push({args,cwd,status:r.status,signal:r.signal,stdout:r.stdout,stderr:r.stderr,error:r.error?.message});save();
  assert.equal(r.status,expected,JSON.stringify(record.commands.at(-1)));
  return r;
}
try {
  record.nativeVersions={codex:command(['codex','--version']).stdout.trim(),pi:command(['pi','--version']).stdout.trim()};
  command(['python3',join(repo,'tests/fixtures/target-activation-probe/native-discovery.py'),'--repository',repo,'--output',join(out,'native')],{timeout:180000});
  const native=JSON.parse(readFileSync(join(out,'native/result.json')));
  assert.equal(native.status,'passed');assert.deepEqual(native.counts,{codex:38,pi:38});assert.equal(native.modelRequests,0);
  assert.deepEqual(native.rpc.codex.requests.map(x=>x.method),['initialize','initialized','skills/list']);
  assert.deepEqual(native.rpc.pi.requests.map(x=>x.type),['get_commands']);
  record.native={counts:native.counts,modelRequests:native.modelRequests,home:native.home};
  const scratch=mkdtempSync(join(tmpdir(),'qs-final-projected-'));record.scratch=scratch;
  for(const [host,prefix] of [['claude','packages'],['codex','codex/plugins'],['pi','pi/packages']]) {
    const video=join(repo,prefix,'qs-video/skills/qs-video');
    const execution=join(repo,prefix,'qs-execution/skills/qs-unlazy');
    const hostRoot=join(scratch,host);mkdirSync(hostRoot);
    const first=join(hostRoot,'initial');mkdirSync(first);
    cpSync(video,join(first,'video'),{recursive:true});cpSync(execution,join(first,'execution'),{recursive:true});
    const moved=join(hostRoot,'relocated');renameSync(first,moved);
    const closure=JSON.parse(command([process.execPath,join(moved,'video/scripts/verify-closure.mjs')]).stdout);
    assert.deepEqual([closure.modules,closure.sourceFiles,closure.privateFiles,closure.relativeImports],[21,912,911,186]);
    const sfxLib=join(moved,'video/modules/media-use/audio/assets/sfx');
    const manifest=JSON.parse(readFileSync(join(sfxLib,'manifest.json'))),name=Object.keys(manifest)[0];
    const {resolveSfx}=await import(pathToFileURL(join(moved,'video/modules/media-use/audio/scripts/lib/sfx.mjs')));
    const project=join(hostRoot,'project');mkdirSync(project);
    const sfx=await resolveSfx({cues:[{id:'known',name},{id:'missing',name:'qs-no-such-cue'}],heygenOK:false,headers:{},hyperframesDir:project,sfxLibDir:sfxLib});
    assert.equal(sfx.sfx.length,1);assert.equal(sfx.sfx[0].source,'local');assert.equal(sfx.anomalies.length,1);
    assert.equal(digest(join(project,sfx.sfx[0].file)),digest(join(sfxLib,manifest[name].file)));
    const index=JSON.parse(readFileSync(join(moved,'execution/references/dependency-index.json')));
    const module=join(moved,'execution',index.moduleRoot);
    for(const file of index.files) assert.equal(digest(join(module,file.destination)),file.derivedSha256,file.destination);
    const fixture=join(hostRoot,'checker');mkdirSync(fixture);
    const approvals=join(hostRoot,'approvals');mkdirSync(approvals,{mode:0o700});
    const env={...process.env,UNLAZY_APPROVAL_DIR:approvals};
    const run=(script,args=[],expected=0)=>command([process.execPath,join(module,'scripts',script),...args],{cwd:fixture,env,expected});
    for(const script of ['gate-check.mjs','gate-lint.mjs','dispatch-check.mjs']) run(script,['--help']);
    const ledger=join(fixture,'GATES.md'),oracle=join(fixture,'oracle.mjs');
    writeFileSync(oracle,"console.log('ORACLE-OK')\n");
    writeFileSync(ledger,'# Gates\n- [ ] G1: Projected checker works\n  CHECK: node oracle.mjs\n  EXPECT: ORACLE-OK\n  EVIDENCE: pending\n');
    run('gate-check.mjs',['--approve','--shell','/bin/sh','--root',fixture,'GATES.md']);
    assert.match(readFileSync(ledger,'utf8'),/automatic-evidence=/);
    writeFileSync(ledger,readFileSync(ledger,'utf8').replace('EXPECT: ORACLE-OK','EXPECT: CHANGED-OK'));
    run('gate-check.mjs',['--status','--root',fixture,'GATES.md'],1);
    writeFileSync(ledger,readFileSync(ledger,'utf8').replace('EXPECT: CHANGED-OK','EXPECT: ORACLE-OK'));
    writeFileSync(oracle,"console.log('BROKEN')\n");
    run('gate-check.mjs',['--status','--root',fixture,'GATES.md']); // documented status limitation
    run('gate-check.mjs',['--reverify','--shell','/bin/sh','--root',fixture,'GATES.md'],1);
    assert.match(readFileSync(ledger,'utf8'),/- \[ \] G1/);
    writeFileSync(oracle,"console.log('ORACLE-OK')\n");
    run('gate-check.mjs',['--reverify','--shell','/bin/sh','--root',fixture,'GATES.md']);
    writeFileSync(ledger,'# Gates\n- [ ] G1: Not achieved\n  EVIDENCE: pending\nABANDON: G1 unsupported fixture\n');
    assert.match(run('gate-check.mjs',['--status','--root',fixture,'GATES.md'],1).stdout,/HANDOFF REQUIRED/);
    record.closure.push({host,video:closure,executionFiles:index.files.length,sfx:'known bytes retained; missing cue reported',checker:'moved imports, positive, stale definition, changed artifact reverify, restored oracle and abandoned gate checks passed'});save();
  }
  assert.deepEqual(await snapshots(),record.bindings,'Source changed during check; repeat on stable payloads');
  record.evidence=[{path:'native/result.json',sha256:digest(join(out,'native/result.json'))}];
  record.status='passed';
} catch(e) {record.status='failed';record.error=e.stack;process.exitCode=1;}
save();console.log(JSON.stringify({status:record.status,error:record.error,counts:record.native?.counts,hostClosures:record.closure.length,modelRequests:0}));
