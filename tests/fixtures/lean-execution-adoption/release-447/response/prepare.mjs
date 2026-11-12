import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, join } from 'node:path';
import { responsePrompt, verifyPlan } from '../../../scripts/lean-execution-trials.mjs';
import { readNativeControls } from '../../../scripts/frontend-native-capture.mjs';
const repo=resolve('.'), out=join(repo,'.unlazy/release-447/response'), fixture=join(repo,'tests/fixtures/lean-execution-adoption');
const sha=x=>createHash('sha256').update(x).digest('hex');
const json=async p=>JSON.parse(await readFile(p,'utf8'));
const write=async (p,v)=>writeFile(join(out,p),JSON.stringify(v,null,2)+'\n',{flag:'wx'});
await mkdir(out,{recursive:true});
const { plan }=await verifyPlan(fixture);
if(JSON.stringify(readNativeControls())!==JSON.stringify(plan.controls))throw Error('Controls differ');
const copies=new Set(['plan.json','baseline.json','control-sources.json','scenarios.json','schedule.json',...Object.keys(plan.files)]);
for(const p of copies)await copyFile(join(fixture,p),join(out,p),1);
const instructions={}, cases=[], origins=[];
const take=async(file,ids,batch)=>{
 const m=await json(join(fixture,file));
 for(const id of ids){
  const c=m.cases.find(c=>c.id===id);if(!c)throw Error('Missing '+id);
  const key=id+'-source'; instructions[key]=m.instructions[c.instructionKey];
  cases.push({...c,instructionKey:key,transportEncoding:'json-unicode-dollar'});
  origins.push({id,manifest:'tests/fixtures/lean-execution-adoption/'+file,originalCase:c,originalInstructionKey:c.instructionKey,legacyPrompt:'tests/fixtures/lean-execution-adoption/'+batch+'/'+id+'/prompt.txt'});
 }
};
const all=await json(join(fixture,'scenarios.json'));
for(const id of ['L1','L2','L4','L5']){
 const c=all.find(c=>c.id===id), prompt=await readFile(join(fixture,'candidate-pilot',id+'-1/prompt.txt'),'utf8');
 const instruction=prompt.split('<instructions>\n\n')[1].split('\n\n</instructions>')[0];
 if(!instruction)throw Error('Missing pilot body');
 instructions[id+'-source']=instruction;cases.push({...c,instructionKey:id+'-source',transportEncoding:'json-unicode-dollar'});
 origins.push({id,manifest:'tests/fixtures/lean-execution-adoption/scenarios.json',originalCase:c,legacyPrompt:'tests/fixtures/lean-execution-adoption/candidate-pilot/'+id+'-1/prompt.txt'});
}
await take('packages-inputs.json',['L7','L9','L10','L11','L12'],'packages-captures');
await take('generation-repair-inputs.json',Array.from({length:6},(_,i)=>'G'+(i+1)),'generation-repair-captures');
await take('one-shot-inputs.json',['E1'],'one-shot-captures');
await take('one-shot-recovery-inputs.json',[...Array.from({length:8},(_,i)=>'E'+(i+2)),...Array.from({length:9},(_,i)=>'P'+(i+1))],'one-shot-recovery-captures');
await take('qualification-extra-inputs.json',Array.from({length:7},(_,i)=>'B'+(i+1)),'qualification-extra-captures');
if(cases.length!==40)throw Error('Unexpected case inventory');
const input={kind:'append-only-corrected-transport-response-isolation-qualification',instructions,cases};
await write('isolation-inputs.json',input);
const protocol={kind:'preregistered-response-only-isolation-qualification',revision:'dcbc75b4a69ef2d7dfc39e582afd005dc2264b0c',version:'4.4.7',createdAt:new Date().toISOString(),controls:plan.controls,tokenBudget:null,operationalBounds:plan.operationalBounds,sampling:'One response per distinct contaminated non-mobile frozen scenario; no semantic retries; no comparative efficiency or reliability inference. An infrastructure retry requires separate decision and original attempt preservation.',caseIds:cases.map(c=>c.id),manifestSHA256:sha(await readFile(join(out,'isolation-inputs.json'))),runnerSHA256:sha(await readFile(join(repo,'scripts/lean-execution-trials.mjs'))),nativeRunnerSHA256:sha(await readFile(join(repo,'scripts/frontend-native-capture.mjs'))),promptSHA256:Object.fromEntries(cases.map(c=>[c.id,sha(responsePrompt(instructions[c.instructionKey],c))])),origins,reused:['L3 candidate-pilot repetitions 1–3: raw prompt dollar count zero; existing blinded acceptance remains scoped','L6 candidate-pilot repetitions 1–3: raw prompt dollar count zero; existing blinded acceptance remains scoped','P10 one-shot-recovery: raw prompt dollar count zero; existing independent acceptance remains scoped','MT1–MT3 corrected transport independently accepted; mobile original L8/B8 coverage not repeated'],boundaries:{semanticReview:'Parent independently reviews actual responses against unchanged frozen source/rubrics; capture integrity alone never acceptance',nativeExpansion:'Actual sent turn/start parsed text must have zero raw dollars; decode must equal exact paired original instruction, request, observations',authority:'No real tools, goals, installs, registrations, settings changes, publication, product actions or image calls',historical:'Retain all protocols/captures/failures untouched; never upgrade historical receipt or acceptance',efficiency:'Inconclusive; original 294-run comparison unexecuted'},rubricPaths:['tests/fixtures/lean-execution-adoption/rubric.json','tests/fixtures/lean-execution-adoption/qualification-extra-protocol.json','tests/fixtures/lean-execution-adoption/generation-review-final.json','tests/fixtures/lean-execution-adoption/execution-review.json','tests/fixtures/lean-execution-adoption/package-review.json']};
await write('protocol.json',protocol);
const paths=new Set([...copies].map(p=>'tests/fixtures/lean-execution-adoption/'+p));
for(const o of origins){paths.add(o.manifest);paths.add(o.legacyPrompt);}
for(const p of protocol.rubricPaths)paths.add(p);
for(const p of ['AGENTS.md','docs/skill-run-contract.md','scripts/lean-execution-trials.mjs','scripts/frontend-native-capture.mjs','scripts/frontend-adoption-trials.mjs','scripts/lean-mobile-report.mjs','tests/fixtures/lean-execution-adoption/README.md','tests/fixtures/lean-execution-adoption/lex12-acceptance.json','tests/fixtures/lean-execution-adoption/lex12-noninstall-evidence.json','tests/fixtures/lean-execution-adoption/lex12-mobile-report-resolution.json','tests/fixtures/lean-execution-adoption/mobile-report-transport-protocol.json','tests/fixtures/lean-execution-adoption/core-review.json','tests/fixtures/lean-execution-adoption/core-review-mapping.json','tests/fixtures/lean-execution-adoption/evaluation-disposition.json'])paths.add(p);
const sourceRecord=await json(join(fixture,'lex12-mobile-report-resolution.json'));
for(const p of Object.keys(sourceRecord.sourceSHA256))paths.add(p);
await write('frozen-bindings.json',{revision:protocol.revision,sourceAndEvidenceSHA256:Object.fromEntries(await Promise.all([...paths].sort().map(async p=>[p,sha(await readFile(join(repo,p)))]))),derivedSHA256:Object.fromEntries(await Promise.all(['protocol.json','isolation-inputs.json',...copies].sort().map(async p=>[p,sha(await readFile(join(out,p)))])))});
console.log('FROZEN_40_CASES');
