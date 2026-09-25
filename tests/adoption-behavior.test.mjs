import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
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

test('actual capture caller supplies the executable and records a complete response-only stream',async()=>{
 const {mkdtemp,writeFile,chmod}=await import('node:fs/promises');const {capture}=await import('../scripts/adoption-behavior-trials.mjs');
 const directory=await mkdtemp('/tmp/qs-behavior-caller-test-'),cli=join(directory,'cli.cjs');
 await writeFile(cli,'#!/usr/bin/env node\nprocess.stdin.resume();process.stdin.on("end",()=>{console.log(JSON.stringify({type:"item.completed",item:{type:"agent_message",text:"Fixture only"}}));console.log(JSON.stringify({type:"turn.completed",usage:{input_tokens:1,output_tokens:1}}));});\n');await chmod(cli,0o755);
 const result=await capture({...cases[0],timeoutMs:5000},[{text:'Local fixture instruction'}],directory,directory,cli);
 assert.equal(result.exitCode,0);assert.equal(result.completedTurn,true);assert.equal(result.toolCount,0);assert.equal(result.processObservation.complete,true);
});
