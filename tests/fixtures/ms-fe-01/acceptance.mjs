import assert from 'node:assert/strict';
import {readFile,writeFile,readdir} from 'node:fs/promises';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {here,repository,snippets} from './runtime.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const read=async p=>JSON.parse(await readFile(p));
export async function qualify(){
 const base=join(here,'comparison-v5'),plan=await read(join(base,'plan.json'));
 for(const [file,digest]of Object.entries(plan.bindings))assert.equal(sha(await readFile(join(repository,file))),digest,'frozen harness binding '+file);
 assert.equal(plan.schedule.length,32);assert.equal(new Set(plan.schedule.map(r=>r.id)).size,32);
 for(const [id,files]of Object.entries(plan.retainedBindings))for(const [file,digest]of Object.entries(files))assert.equal(sha(await readFile(join(base,'runs',id,file))),digest,'retained attempt binding '+id+'/'+file);
 assert.equal(plan.rubric.adoption.minimumMeanImprovement,.25);
 for(const [file,digest]of Object.entries(plan.inputs))if(file.startsWith('guidance/candidate/skills/')&&file.endsWith('.md'))assert.equal(sha(await readFile(join(repository,file.slice('guidance/candidate/'.length)))),digest,'current guidance differs from frozen candidate: '+file);
 for(const [file,digest]of Object.entries(plan.assets))assert.equal(sha(await readFile(join(here,'assets',file))),digest,'asset binding '+file);
 for(const c of plan.scenarios)for(const variant of ['baseline','candidate'])for(const repetition of [1,2])assert.equal(plan.schedule.filter(r=>r.scenario===c.id&&r.variant===variant&&r.repetition===repetition).length,1);
 const observations=await read(join(base,'observations-visible/results.json'));
 assert.equal(observations.length,32);
 const runtime=await read(join(here,'runtime/evidence.json'));
 assert.deepEqual(runtime.failures,[]);assert.equal(runtime.cases.filter(c=>c.viewport).length,8);assert.equal(runtime.cases.filter(c=>c.fault).length,6);assert.equal(runtime.cases.find(c=>c.loop).wraps,3);
 for(const [name,code]of Object.entries(await snippets()))assert.equal(runtime.snippets[name],sha(code),'runtime snippet binding '+name);
 const touch=await read(join(here,'runtime-touch/evidence.json'));assert.ok(touch.pauseResumeAndPrimaryPassed&&touch.touchEvents>=3);
 const supplement=await read(join(here,'runtime-supplement/evidence.json'));assert.equal(supplement.checks.nativeLoopCycles,3);assert.ok(Object.values(supplement.checks).every(Boolean));for(const [name,code]of Object.entries(await snippets()))assert.equal(supplement.snippets[name],sha(code));
 const preservation=await read(join(base,'control-preservation.json'));
 assert.equal(preservation.results.filter(r=>r.variant==='candidate').length,8);assert.ok(preservation.results.filter(r=>r.variant==='candidate').every(r=>r.differences.length===0),'supplied control computed styles');
 const actions=await read(join(base,'output-actions.json'));assert.equal(actions.length,4);assert.ok(actions.every(r=>r.tapPause&&r.spaceResume&&r.reducedMotionPause&&r.noJSVisible),'output pause and fallback actions');
 const metrics=[];
 for(const row of plan.schedule){
  const directory=join(base,'runs',row.id),telemetry=await read(join(directory,'telemetry.json')),observation=observations.find(x=>x.id===row.id);
  assert.ok(telemetry.completedTurn&&telemetry.nativeStreamComplete,'complete native attempt: '+row.id);
  assert.equal(telemetry.observedNamedImageCalls,0,'no generated media');assert.deepEqual(telemetry.effectiveControls,plan.controls);assert.equal(telemetry.timedOut,false);assert.equal(telemetry.processObservation.complete,true);assert.deepEqual(telemetry.observedOwnedResidualProcesses,[]);
  assert.ok(observation,'missing observation '+row.id);
  // Quality of baseline artifacts is measured; candidate authority/runtime is mandatory.
  assert.deepEqual(observation.errors,[],'observed preservation/runtime '+row.id);
  const events=(await readFile(join(directory,'events.jsonl'),'utf8')).trim().split('\n').map(JSON.parse);
  const reads=new Set();
  for(const event of events)if(event.type==='item.completed'&&event.item.type==='command_execution'&&event.item.exit_code===0){
   for(const match of event.item.command.matchAll(/guidance\/skills\/[a-zA-Z0-9_./-]+\.md/g)){
    try{const content=await readFile(join(directory,'after',match[0]),'utf8');if(event.item.aggregated_output.includes(content.trim()))reads.add(match[0]);}catch{}
   }
  }
  let instructionBytes=0;for(const file of reads)instructionBytes+=(await readFile(join(directory,'after',file))).length;
  metrics.push({id:row.id,instructionFiles:[...reads],instructionBytes,toolCalls:telemetry.toolCount,durationMs:telemetry.elapsedMs,tokens:telemetry.usage});
 }
 const review=await read(join(base,'blind-review/review.json')),key=await read(join(base,'review-key.json'));
 assert.ok(review.independentAuthor&&review.variantLabelsConcealed,'independent blind review required');
 assert.equal(review.outputs.length,8);const quality=[];
 for(const output of review.outputs){const row=key.outputs.find(x=>x.blindId===output.id);assert.ok(row,'unknown blind review id');assert.equal(sha(await readFile(join(base,'runs',row.id,'after/index.html'))),row.htmlSHA256,'blind product binding');assert.equal(output.scores.length,5);assert.ok(output.scores.every(s=>Number.isFinite(s)&&s>=0&&s<=4));quality.push({...row,scores:output.scores,mean:output.scores.reduce((a,b)=>a+b,0)/5});}
 const mean=values=>values.reduce((a,b)=>a+b,0)/values.length,means={};
 for(const scenario of ['C1','C2']){means[scenario]={};for(const variant of ['baseline','candidate']){const rows=quality.filter(r=>r.scenario===scenario&&r.variant===variant);assert.equal(rows.length,2);means[scenario][variant]=mean(rows.map(r=>r.mean));}assert.ok(means[scenario].candidate>=means[scenario].baseline,'no declining scenario mean '+scenario);}
 const total=variant=>quality.filter(r=>r.variant===variant).reduce((sum,r)=>sum+r.scores.reduce((a,b)=>a+b,0),0);const baseline=total('baseline')/20,candidate=total('candidate')/20,improvement=(total('candidate')-total('baseline'))/20;assert.ok(improvement>=.25,'quality improvement threshold');
 const reviewEvents=await read(join(base,'tool-semantics-review.json'));assert.equal(reviewEvents.all32StreamsReviewed,true);assert.equal(reviewEvents.noGenerationOrUnauthorizedMutations,true);assert.deepEqual(reviewEvents.unresolved,[]);assert.equal(reviewEvents.streams.length,32);for(const stream of reviewEvents.streams)assert.equal(sha(await readFile(join(base,'runs',stream.id,'events.jsonl'))),stream.eventsSHA256,'reviewed native stream binding');
 const result={status:'qualified',at:new Date().toISOString(),baselineRevision:plan.baselineRevision,planSHA256:sha(await readFile(join(base,'plan.json'))),runtimeSHA256:sha(await readFile(join(here,'runtime/evidence.json'))),runtimeSupplementSHA256:sha(await readFile(join(here,'runtime-supplement/evidence.json'))),runtimeTouchSHA256:sha(await readFile(join(here,'runtime-touch/evidence.json'))),observationSHA256:sha(await readFile(join(base,'observations-visible/results.json'))),reviewSHA256:sha(await readFile(join(base,'blind-review/review.json'))),controlPreservationSHA256:sha(await readFile(join(base,'control-preservation.json'))),outputActionsSHA256:sha(await readFile(join(base,'output-actions.json'))),means,quality:{baseline,candidate,improvement},metrics,limitations:['Synthetic matched tasks','Emulated viewport/touch coverage','Browser observations do not establish author in-turn inspection','Earlier interrupted batches, failed 0.15-gain cohort and 0.30-gain preservation failure remain preserved; final amendment retains 24 unchanged attempts and reruns 8 affected attempts; no pooling with historical adoption experiments','Sampled process observation cannot prove absence of unseen processes detaching between samples; task-owned /tmp synthetic scratch deviations are explicitly recorded in tool semantics review']};
 if(process.argv.includes('--verify')){const recorded=await read(join(here,'qualification.json'));const {at:oldTime,...old}=recorded;const {at:newTime,...fresh}=result;assert.deepEqual(fresh,old,'qualification bindings changed');}
 else await writeFile(join(here,'qualification.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log('MS_FE_ACCEPTANCE_OK');return result;
}
if(process.argv[1]===new URL(import.meta.url).pathname)await qualify();
