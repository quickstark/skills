import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { root, run } from './run.mjs';
import { runPairs, buildPrompt } from '../../../scripts/frontend-adoption-v3.mjs';
import { sha } from '../../../scripts/frontend-adoption-trials.mjs';
const old=resolve(root,'../frontend-adoption-v3'),repo=resolve(root,'../../..');
const json=async p=>JSON.parse(await readFile(p));
test('only declared numeric-target sentence changes task; original checks/budget/authority/floor retained',async()=>{
 const prior=(await json(join(old,'scenarios.json'))).find(x=>x.id==='F09');
 const [actual]=await json(join(root,'scenarios.json')),q=await json(join(root,'qualification.json'));
 assert.equal(actual.input,prior.input.replace(q.requestChange.removed,q.requestChange.replacement));
 assert.equal(actual.input.includes('1179'),false);
 const restored=structuredClone(actual);restored.input=prior.input;restored.requiredChecks=restored.requiredChecks.filter(x=>x!=='native-portrait-actual-size-reporting');
 assert.deepEqual(restored,prior);assert.equal(actual.requiredChecks.length,prior.requiredChecks.length+1);
 for(const file of ['common-scope.json','rubric.json','assets/empty/README.md'])assert.deepEqual(await readFile(join(root,file)),await readFile(join(old,file)));
});
test('exact six matched original-order attempts; no added scenarios or budget expansion',async()=>{
 const s=await json(join(root,'schedule.json'));
 assert.deepEqual(s,(await json(join(old,'schedule.json'))).filter(x=>x.scenarioId==='F09'));
 assert.equal(s.length,6);assert.equal(new Set(s.map(x=>x.trialId)).size,6);
 for(let i=0;i<6;i+=2){assert.equal(s[i].repetition,i/2+1);assert.equal(s[i+1].repetition,s[i].repetition);assert.notEqual(s[i].variant,s[i+1].variant);}
});
test('baseline and all other guidance unchanged; only private mobile patch differs and applies cleanly without mutation',async()=>{
 const before=await json(join(old,'sources/index.json')),after=await json(join(root,'sources/index.json'));
 assert.equal(Object.keys(after).length,5);
 for(const [key,s] of Object.entries(after)){
  const bytes=await readFile(join(root,s.path));assert.equal(sha(bytes),s.sha256);
  if(key==='mobile-images'){assert.notEqual(s.sha256,before[key].sha256);assert.equal(s.priorQualificationSourceSha256,before[key].sha256);}
  else assert.deepEqual(bytes,await readFile(join(old,before[key].path)));
 }
 const path=join(repo,'skills/frontend/internal/mobile-images.md'),original=await readFile(path);
 const check=spawnSync('git',['apply','--check',join(root,'mobile-guidance.patch')],{cwd:repo,encoding:'utf8'});
 assert.equal(check.status,0,check.stderr);assert.deepEqual(await readFile(path),original);
 assert.equal(sha(original),before['mobile-images'].sha256);
});
test('supplied prompt retains explicit image-only/authority contract and actual-size request',async()=>{
 const [scenario]=await json(join(root,'scenarios.json')),common=await json(join(root,'common-scope.json'));
 const prompt=buildPrompt({scenario,common,cwd:'/tmp/synthetic-mobile-control',guidance:{guidancePath:'/tmp/synthetic-mobile-control/trial-guidance.md',readCommand:"cat -- '/tmp/synthetic-mobile-control/trial-guidance.md'"}});
 assert.match(prompt,/Image-call maximum: 2; required actual images: 2/);assert.match(prompt,/Product edits: false/);
 assert.match(prompt,/actual pixel dimensions/);assert.match(prompt,/not an invocation of any public skill/);assert.match(prompt,/Never fabricate calls/);
});
test('existing paired scheduler awaits both failures and stops before next pair without retry',async()=>{
 const schedule=await json(join(root,'schedule.json'));const started=[],finished=[];
 const settled=await runPairs({schedule,start:async row=>{started.push(row.trialId);if(row.variant==='v31')throw new Error('synthetic failure');await new Promise(r=>setTimeout(r,15));finished.push(row.trialId);return row;}});
 assert.equal(started.length,2);assert.equal(finished.length,1);assert.equal(settled.length,2);assert.ok(settled.some(x=>x.status==='rejected'));assert.ok(settled.some(x=>x.status==='fulfilled'));
});
test('existing scheduler completes exactly six bounded simulated attempts',async()=>{
 const schedule=await json(join(root,'schedule.json')),seen=[];
 const settled=await runPairs({schedule,start:async row=>{seen.push(row.trialId);return row;}});
 assert.equal(settled.length,6);assert.deepEqual(seen,schedule.map(x=>x.trialId));
});
test('launch without parent approval fails before any capture or filesystem mutation',async()=>{await assert.rejects(run(false),/Parent source\/criteria\/authority approval required/);});
