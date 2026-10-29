import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,cp} from 'node:fs/promises';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {here} from './runtime.mjs';
import {observe} from './observe-final.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const read=async p=>JSON.parse(await readFile(p));
const base=join(here,'comparison-v4'),plan=await read(join(base,'plan.json'));
if(process.argv.includes('--fresh')){
 const name='comparison-v4-fresh-observation',out=join(here,name);await mkdir(join(out,'runs'),{recursive:true});
 const fresh=plan.schedule.filter(row=>!row.reuseFrom);assert.equal(fresh.length,8);
 for(const row of fresh){const from=join(base,'runs',row.id),telemetry=await read(join(from,'telemetry.json'));assert.ok(telemetry.completedTurn&&telemetry.nativeStreamComplete);await cp(from,join(out,'runs',row.id),{recursive:true});}
 await writeFile(join(out,'plan.json'),JSON.stringify({...plan,schedule:fresh,observationSubsetOnly:{parent:'comparison-v4',parentPlanSHA256:hash(await readFile(join(base,'plan.json'))),note:'No new authoring attempts; same frozen observer applied to exactly the8 fresh affected outputs. Retained outputs use byte-identical prior browser observations.'}},null,2)+'\n',{flag:'wx'});
 await observe(name);
}else if(process.argv.includes('--combine')){
 const prior=await read(join(here,'comparison-v3/observations-final/results.json')),fresh=await read(join(here,'comparison-v4-fresh-observation/observations-final/results.json'));
 const records=[],reuse=[];await mkdir(join(base,'observations-final'));
 for(const row of plan.schedule){const inherited=Boolean(row.reuseFrom),record=(inherited?prior:fresh).find(r=>r.id===row.id);assert.ok(record,'missing observation '+row.id);assert.deepEqual(record.errors,[],'unresolved observation '+row.id);
  const from=join(here,inherited?'comparison-v3':'comparison-v4-fresh-observation','observations-final');
  for(const view of record.views)for(const image of view.screenshots??[])await cp(join(from,image),join(base,'observations-final',image));
  await writeFile(join(base,'observations-final',row.id+'.json'),JSON.stringify(record,null,2)+'\n');records.push(record);
  if(inherited)reuse.push({id:row.id,from:row.reuseFrom,sourceObservationSHA256:hash(Buffer.from(JSON.stringify(record))),artifactBindings:plan.retainedBindings[row.id]});
 }
 await writeFile(join(base,'observations-final/results.json'),JSON.stringify(records,null,2)+'\n');await writeFile(join(base,'observation-reuse.json'),JSON.stringify({observer:'tests/fixtures/ms-fe-01/observe-final.mjs',observerSHA256:hash(await readFile(join(here,'observe-final.mjs'))),retained:reuse,freshCount:fresh.length,total:records.length},null,2)+'\n');console.log('MS_FE_AMENDED_OBSERVATIONS_OK');
}else throw Error('explicit --fresh or --combine required');
