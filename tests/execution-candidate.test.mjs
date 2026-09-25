import { cpSync, mkdirSync, readFileSync, writeFileSync, renameSync, existsSync, chmodSync, readdirSync, mkdtempSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import test from 'node:test';
import { EXECUTION_PUBLIC_COMMANDS } from '../scripts/execution-skill-catalog.mjs';
const rootSource=fileURLToPath(new URL('../skills/engineering/qs-unlazy/',import.meta.url));
const privateRoot=join(rootSource,'modules/unlazy');
const index=JSON.parse(readFileSync(join(rootSource,'references/dependency-index.json')));
const hash=(bytes)=>createHash('sha256').update(bytes).digest('hex');

function verifyClosure(base) {
  const found=[];
  function walk(dir,prefix='') { for(const entry of readdirSync(dir,{withFileTypes:true})) {
    const name=prefix+entry.name;
    if(entry.isDirectory()) walk(join(dir,entry.name),name+'/');
    else { assert.ok(entry.isFile()); found.push(name); }
  }}
  walk(base);
  assert.deepEqual(found.sort(),index.files.map(entry=>entry.destination).sort());
  for(const entry of index.files) {
    assert.equal(hash(readFileSync(join(base,entry.destination))),entry.derivedSha256);
    assert.match(entry.sourceSha256,/^[a-f0-9]{64}$/);
    assert.notEqual(entry.destination.split('/').at(-1),'SKILL.md');
    if(entry.destination.endsWith('.md')) {
      const text=readFileSync(join(base,entry.destination),'utf8');
      for(const match of text.matchAll(/\]\(([^)]+)\)/g)) {
        const target=match[1].split('#')[0];
        if(!target || /^(?:https?:|mailto:)/.test(target)) continue;
        assert.ok(existsSync(resolve(dirname(join(base,entry.destination)),target)),target);
      }
    }
  }
}

test('Unlazy candidate has explicit metadata and complete private derived closure',()=>{
  const command=EXECUTION_PUBLIC_COMMANDS[0];
  assert.equal(command.codexLiteral,'$qs-execution:qs-unlazy');
  assert.match(readFileSync(join(rootSource,'SKILL.md'),'utf8'),/^name: qs-unlazy$/m);
  assert.match(readFileSync(join(rootSource,'agents/openai.yaml'),'utf8'),/allow_implicit_invocation: false/);
  verifyClosure(privateRoot);
});

test('missing or changed private dependency fails closure independently',()=>{
  const base=mkdtempSync(join(tmpdir(),'qs-unlazy-closure-'));
  try {
    cpSync(privateRoot,join(base,'payload'),{recursive:true});
    verifyClosure(join(base,'payload'));
    writeFileSync(join(base,'payload/scripts/lib/regex-worker.mjs'),'changed');
    assert.throws(()=>verifyClosure(join(base,'payload')));
    rmSync(join(base,'payload/scripts/lib/regex-worker.mjs'));
    assert.throws(()=>verifyClosure(join(base,'payload')));
  } finally { rmSync(base,{recursive:true,force:true}); }
});

test('installed and moved Unlazy engine rejects stale/abandoned evidence and preserves unrelated hook settings', {skip:process.platform!=='linux' && 'Actual Linux host probe; other platforms require native evidence'},()=>{
 const root=mkdtempSync(join(tmpdir(),'qs-unlazy-candidate-'));
 try {
const fixture=join(root,'fixture'); const approvals=join(root,'approvals');
for(const p of [fixture,approvals])mkdirSync(p,{recursive:true});chmodSync(approvals,0o700);
const original=privateRoot;const install=join(root,'install-one');const moved=join(root,'install-moved');
mkdirSync(install,{recursive:true});
for(const p of ['scripts','references','templates','research','instructions.md','SECURITY.md','LICENSE']) cpSync(join(original,p),join(install,p),{recursive:true});
const log=[];
function run(base,script,args=[],input){const r=spawnSync(process.execPath,[join(base,'scripts',script),...args],{cwd:fixture,encoding:'utf8',input,timeout:15000,env:{...process.env,UNLAZY_APPROVAL_DIR:approvals}});log.push({script,args,status:r.status,stdout:r.stdout,stderr:r.stderr,error:r.error?.message});writeFileSync(join(root,'installed-probe-results.json'),JSON.stringify(log,null,2));return r;}
const ledger=join(fixture,'GATES.md');const oracle=join(fixture,'oracle.mjs');
writeFileSync(oracle,"console.log('ORACLE-OK')\n");
writeFileSync(ledger,'# Gates\n- [ ] G1: Oracle verified\n  CHECK: node oracle.mjs\n  EXPECT: ORACLE-OK\n  EVIDENCE: pending\n');
assert.equal(run(install,'gate-check.mjs',['--approve','--shell','/bin/sh','--root',fixture,'GATES.md']).status,0);
assert.match(readFileSync(ledger,'utf8'),/automatic-evidence=/);
writeFileSync(ledger,readFileSync(ledger,'utf8').replace('EXPECT: ORACLE-OK','EXPECT: CHANGED-OK'));
const stale=run(install,'gate-check.mjs',['--status','--root',fixture,'GATES.md']);assert.equal(stale.status,1);assert.doesNotMatch(stale.stdout,/ALL MET/);
writeFileSync(ledger,readFileSync(ledger,'utf8').replace('EXPECT: CHANGED-OK','EXPECT: ORACLE-OK'));
assert.equal(run(install,'gate-check.mjs',['--status','--root',fixture,'GATES.md']).status,0);
writeFileSync(oracle,"console.log('BROKEN')\n");
// Status detects definition changes, not transitive artifact changes; reproduce this documented limitation.
assert.equal(run(install,'gate-check.mjs',['--status','--root',fixture,'GATES.md']).status,0);
const failed=run(install,'gate-check.mjs',['--reverify','--shell','/bin/sh','--root',fixture,'GATES.md']);assert.equal(failed.status,1);assert.match(readFileSync(ledger,'utf8'),/- \[ \] G1/);
writeFileSync(oracle,"console.log('ORACLE-OK')\n");
assert.equal(run(install,'gate-check.mjs',['--reverify','--shell','/bin/sh','--root',fixture,'GATES.md']).status,0);
writeFileSync(ledger,'# Gates\n- [ ] G1: Not achieved\n  EVIDENCE: pending\nABANDON: G1 fixture unsupported\n');
const abandoned=run(install,'gate-check.mjs',['--status','--root',fixture,'GATES.md']);assert.equal(abandoned.status,1);assert.match(abandoned.stdout,/HANDOFF REQUIRED/);assert.doesNotMatch(abandoned.stdout,/ALL MET/);
const claude=join(fixture,'.claude');mkdirSync(claude,{recursive:true});const settingsPath=join(claude,'settings.local.json');
const unrelated={model:'keep-model',permissions:{deny:['WebFetch']},hooks:{Stop:[{matcher:'',hooks:[{type:'command',command:'node unrelated-check.mjs',timeout:20}]}],SessionStart:[{hooks:[{type:'command',command:'node unrelated-start.mjs'}]}]}};
writeFileSync(settingsPath,JSON.stringify(unrelated,null,2));
assert.equal(run(install,'install-hooks.mjs',['--scope','fixture']).status,0);
assert.equal(run(install,'install-hooks.mjs',['--scope','fixture']).status,0);
renameSync(install,moved);
assert.equal(run(moved,'gate-check.mjs',['--help']).status,0);
assert.equal(run(moved,'gate-lint.mjs',['--help']).status,0);
assert.equal(run(moved,'dispatch-check.mjs',['--help']).status,0);
assert.equal(run(moved,'install-hooks.mjs',['--scope','fixture']).status,0);
let settings=JSON.parse(readFileSync(settingsPath));let handlers=settings.hooks.Stop.flatMap(x=>x.hooks);const ours=handlers.filter(x=>x.command.includes('--unlazy-hook-v2'));
assert.equal(ours.length,1);assert.ok(ours[0].command.includes(moved));assert.ok(!ours[0].command.includes(install));
assert.deepEqual(settings.permissions,unrelated.permissions);assert.deepEqual(settings.hooks.SessionStart,unrelated.hooks.SessionStart);assert.ok(handlers.some(x=>x.command==='node unrelated-check.mjs'));
assert.equal(run(moved,'install-hooks.mjs',['--uninstall']).status,0);assert.deepEqual(JSON.parse(readFileSync(settingsPath)),unrelated);assert.ok(existsSync(settingsPath+'.unlazy.bak'));


 } finally { rmSync(root,{recursive:true,force:true}); }
});
