import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {here,snippets} from './runtime.mjs';
const evidence=JSON.parse(await readFile(join(here,'runtime/evidence.json')));
assert.deepEqual(evidence.failures,[]);
for(const [name,code]of Object.entries(await snippets()))assert.equal(evidence.snippets[name],createHash('sha256').update(code).digest('hex'),'current snippet binding');
assert.equal(evidence.cases.filter(c=>c.viewport).length,8);
assert.deepEqual(evidence.cases.filter(c=>c.fault).map(c=>c.fault).sort(),['no-js','interrupt','autoplay-rejected','missing-media','no-observer','delayed-fonts'].sort());
assert.ok(evidence.cases.every(c=>c.pass||c.loop));assert.equal(evidence.cases.find(c=>c.loop).wraps,3);assert.ok(evidence.cases.find(c=>c.loop).teardownStopsTime);
const files=(await readdir(join(here,'runtime'))).filter(f=>f.endsWith('.png'));
assert.ok(files.length>=30);
for(const f of files){const b=await readFile(join(here,'runtime',f));assert.ok(b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])));}

const supplement=JSON.parse(await readFile(join(here,'runtime-supplement/evidence.json')));assert.equal(supplement.checks.nativeLoopCycles,3);assert.ok(Object.values(supplement.checks).every(Boolean));assert.deepEqual(supplement.snippets,evidence.snippets);
const touch=JSON.parse(await readFile(join(here,'runtime-touch/evidence.json')));assert.ok(touch.pauseResumeAndPrimaryPassed&&touch.touchEvents>=3);
console.log('MS_FE_RUNTIME_OK');
