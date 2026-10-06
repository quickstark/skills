import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, writeFile, chmod, rm, readdir } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { tmpdir } from 'node:os';
import { captureProcessSupport } from '../scripts/frontend-adoption-trials.mjs';
import { join } from 'node:path';
import { root, instruction, promptFor } from '../scripts/adoption-behavior-trials.mjs';
const cases=JSON.parse(await readFile(join(root,'scenarios.json'),'utf8'));
test('behavior fixtures preserve all declared scopes and resolve exact candidate instructions',async()=>{
 assert.equal(cases.length,24);assert.equal(new Set(cases.map(c=>c.id)).size,24);
 for(const c of cases){assert.ok(c.expected.length>=3);assert.ok(c.criteria.length);for(const p of[c.source,...c.references]){const s=await instruction(c,p);assert.ok(s.bytes>0);assert.match(s.derivedSHA256,/^[a-f0-9]{64}$/);}}
 const c=cases.find(c=>c.id==='H3');const reference=await instruction(c,c.references[0]);assert.match(reference.text,/\$qs-advanced:qs-visual-parity/);assert.doesNotMatch(reference.text,/\$ps-skills:ps-visual-parity/);
});
test('scoring criteria stay out of model input while complete request and source guidance remain',async()=>{
 for(const c of cases){const sources=await Promise.all([c.source,...c.references].map(p=>instruction(c,p)));const prompt=promptFor(c,sources,'/tmp/fixture');assert.ok(prompt.includes(c.request));assert.ok(sources.every(s=>prompt.includes(s.text)));const changed={...c,expected:['WITHHELD_RUBRIC_CANARY'],criteria:['WITHHELD_CRITERION']};assert.equal(promptFor(changed,sources,'/tmp/fixture'),prompt);assert.ok(!prompt.includes('WITHHELD_RUBRIC_CANARY'));}
});
test('execution fixtures distinguish real product failure from successful transport',()=>{
 const a=cases.find(c=>c.id==='X1'),b=cases.find(c=>c.id==='X2');assert.equal(a.mode,'execution');assert.match(a.files['app.cjs'],/result:a\+b/);assert.match(b.files['app.cjs'],/result:a-b/);assert.equal(JSON.parse(b.files['verification/features.json']).sum.expected,12);assert.ok(JSON.parse(b.files['verification/features.json']).export);assert.match(b.request,/without modifying app.cjs/);
});

test('actual capture caller supplies the executable and records a complete response-only stream', { skip: process.platform !== 'linux' ? 'Actual process observation requires Linux /proc; no native capture acceptance claimed.' : false }, async(t)=>{
 const {capture}=await import('../scripts/adoption-behavior-trials.mjs');
 const directory=await mkdtemp(join(tmpdir(),'qs-behavior-caller-test-')),cli=join(directory,'cli.cjs');
 t.after(()=>rm(directory,{recursive:true,force:true}));
 await writeFile(cli,'#!/usr/bin/env node\nprocess.stdin.resume();process.stdin.on("end",()=>{console.log(JSON.stringify({type:"item.completed",item:{type:"agent_message",text:"Fixture only"}}));console.log(JSON.stringify({type:"turn.completed",usage:{input_tokens:1,output_tokens:1}}));});\n');await chmod(cli,0o755);
 const result=await capture({...cases[0],timeoutMs:5000},[{text:'Local fixture instruction'}],directory,directory,cli);
 assert.equal(result.exitCode,0);assert.equal(result.completedTurn,true);assert.equal(result.toolCount,0);assert.equal(result.processObservation.complete,true);
});

test('capture preflight rejects unsupported platforms and unavailable proc before acquiring a child',()=>{
 let reads=0;
 assert.throws(()=>captureProcessSupport({platform:'darwin',read:()=>{reads++;}}),/requires Linux \/proc/);
 assert.equal(reads,0);
 assert.throws(()=>captureProcessSupport({platform:'linux',read:()=>{throw new Error('proc unavailable');}}),/proc unavailable/);
 assert.throws(()=>captureProcessSupport({platform:'linux',read:()=>''}),/Invalid capture boot identity/);
});

test('unsupported native capture exits without artifacts or a leaked child', { skip: process.platform === 'linux' ? 'Unsupported-platform control runs on non-Linux; Linux capture is tested separately.' : false },async(t)=>{
 const directory=await mkdtemp(join(tmpdir(),'qs-capture-unsupported-'));
 t.after(()=>rm(directory,{recursive:true,force:true}));
 const module=new URL('../scripts/adoption-behavior-trials.mjs',import.meta.url).href;
 const script=`import {capture} from ${JSON.stringify(module)};try{await capture({request:'Fixture',timeoutMs:1000},[],process.argv[1],process.argv[1],process.execPath);throw Error('Unexpected capture success');}catch(e){if(!e.message.includes('requires Linux /proc'))throw e;console.log('UNSUPPORTED_BEFORE_SPAWN');}`;
 const result=await promisify(execFile)(process.execPath,['--input-type=module','-e',script,directory],{timeout:5000});
 assert.match(result.stdout,/UNSUPPORTED_BEFORE_SPAWN/);
 assert.deepEqual(await readdir(directory),[]);
});

test('capture startup failure reaps its spawned child and exits without success telemetry', { skip: process.platform !== 'linux' ? 'Exceptional child cleanup requires the Linux process-observation interface.' : false },async(t)=>{
 const directory=await mkdtemp(join(tmpdir(),'qs-capture-cleanup-'));
 t.after(()=>rm(directory,{recursive:true,force:true}));
 const cli=join(directory,'wait.cjs');
 await writeFile(cli,'#!/usr/bin/env node\nprocess.stdin.resume();\n');await chmod(cli,0o755);
 await writeFile(join(directory,'process.json'),'Preserve conflicting artifact');
 const module=new URL('../scripts/frontend-adoption-trials.mjs',import.meta.url).href;
 const script=`import {execute} from ${JSON.stringify(module)};try{await execute({prompt:'Fixture',cwd:process.argv[1],directory:process.argv[1],executable:process.argv[2],scenario:{mode:'prompt-only',budget:{timeoutMs:1000,maximumImageCalls:0}}});throw Error('Unexpected success');}catch(e){if(e.code!=='EEXIST')throw e;console.log('CHILD_REAPED');}`;
 const result=await promisify(execFile)(process.execPath,['--input-type=module','-e',script,directory,cli],{timeout:5000});
 assert.match(result.stdout,/CHILD_REAPED/);
 assert.equal(await readFile(join(directory,'process.json'),'utf8'),'Preserve conflicting artifact');
 assert.ok(!(await readdir(directory)).includes('telemetry.json'));
});
