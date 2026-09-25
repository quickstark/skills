import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { verifySelectedControls, captureWithAfterState } from './proof-launch-support.mjs';
import { manifest } from '../../../../scripts/frontend-adoption-trials.mjs';
const expected={model:'fixture-model',model_reasoning_effort:'high',sandbox_mode:'workspace-write',approval_policy:'on-request'};
const toml=values=>Object.entries(values).map(([k,v])=>`${k} = ${JSON.stringify(v)}`).join('\n');
async function fixture(t){const base=await mkdtemp(join(tmpdir(),'qs-proof-launch-control-'));t.after(()=>rm(base,{recursive:true,force:true}));return base;}
test('selected controls match without returning unrelated configuration',async t=>{
 const base=await fixture(t),file=join(base,'config.toml');await writeFile(file,toml({...expected,unrelated_secret:'synthetic-do-not-expose'}));
 assert.deepEqual(verifySelectedControls(file,expected),expected);
});
test('each changed selected control rejects, before any capture can be selected',async t=>{
 const base=await fixture(t),file=join(base,'config.toml');
 for(const key of Object.keys(expected)){await writeFile(file,toml({...expected,[key]:'changed'}));assert.throws(()=>verifySelectedControls(file,expected),new RegExp('Host controls changed: '+key));}
 await writeFile(file,toml({model:expected.model}));assert.throws(()=>verifySelectedControls(file,expected),/Host controls changed/);
});
test('malformed or missing config cannot expose parser input in diagnostics',async t=>{
 const base=await fixture(t),file=join(base,'config.toml');await writeFile(file,'model = "synthetic-do-not-expose\n');
 assert.throws(()=>verifySelectedControls(file,expected),e=>e.message==='Unable to read selected host controls'&&!e.message.includes('synthetic'));
 assert.throws(()=>verifySelectedControls(join(base,'absent'),expected),/Unable to read selected host controls/);
});
for(const failure of [false,true])test(`${failure?'throwing':'successful'} capture retains actual after files and hashes`,async t=>{
 const base=await fixture(t),cwd=join(base,'workspace'),directory=join(base,'capture');await mkdir(cwd);await mkdir(directory);
 await writeFile(join(cwd,'input.txt'),'original');
 const result=await captureWithAfterState({directory,cwd,manifest,capture:async()=>{await writeFile(join(cwd,'partial-output.txt'),'actual created bytes');if(failure)throw new Error('controlled execute failure');return {exitCode:0};}});
 assert.equal(await readFile(join(directory,'after/partial-output.txt'),'utf8'),'actual created bytes');
 const actual=JSON.parse(await readFile(join(directory,'after-binding.json')));assert.deepEqual(actual,await manifest(cwd));
 const receipt=JSON.parse(await readFile(join(directory,'capture-outcome.json')));assert.deepEqual(receipt.snapshotErrors,[]);assert.equal(receipt.telemetryReturned,!failure);
 if(failure){assert.match(result.captureError,/controlled execute failure/);assert.equal(result.telemetry,null);}else{assert.equal(result.captureError,null);assert.equal(result.telemetry.exitCode,0);}
});
test('after-copy failure cannot hide original capture failure or suppress manifest',async t=>{
 const base=await fixture(t),cwd=join(base,'workspace'),directory=join(base,'capture');await mkdir(cwd);await mkdir(directory);await writeFile(join(cwd,'input.txt'),'original');await writeFile(join(directory,'after'),'occupied');
 const result=await captureWithAfterState({directory,cwd,manifest,capture:async()=>{throw new Error('original failure');}});
 assert.match(result.captureError,/original failure/);assert.equal(result.snapshotErrors[0].step,'copy-after');assert.deepEqual(JSON.parse(await readFile(join(directory,'after-binding.json'))),await manifest(cwd));
});
