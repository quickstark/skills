import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { isDeepStrictEqual } from 'node:util';
import { manifest, sha } from '../../../scripts/frontend-adoption-trials.mjs';
import { readNativeControls } from '../../../scripts/frontend-native-capture.mjs';
import { captureTrial, runPairs, interruptCaptures } from '../../../scripts/frontend-adoption-v3.mjs';
export const root = dirname(fileURLToPath(import.meta.url));
const repository = resolve(root, '../../..');
const old = resolve(root, '../frontend-adoption-v3');
const outputPath = '/tmp/qs-frontend-mobile-native-qualification-20260926';
const json = async p => JSON.parse(await readFile(p));
const put = (p,x) => writeFile(p,JSON.stringify(x,null,2)+'\n',{flag:'wx'});
const check = (ok,message) => { if (!ok) throw new Error(message); };
const excluded = new Set(['plan.json','preparation-verification.json','run-claim.json']);
const inputs = async () => Object.fromEntries(Object.entries(await manifest(root)).filter(([p])=>!excluded.has(p)));
export async function freeze() {
 const prior = await json(join(old,'plan.json'));
 const dependencies = [...new Set(['scripts/frontend-adoption-v3.mjs',...Object.keys(prior.dependencies),
   'tests/fixtures/frontend-adoption-v3/plan.json','tests/fixtures/frontend-adoption-v3/scenarios.json',
   'tests/fixtures/frontend-adoption-v3/schedule.json','tests/fixtures/frontend-adoption-v3/sources/index.json',
   'tests/fixtures/frontend-adoption-v3/common-scope.json','tests/fixtures/frontend-adoption-v3/rubric.json'])];
 const originals = await json(join(old,'sources/index.json'));
 const selected = await json(join(root,'sources/index.json'));
 for(const key of Object.keys(selected)) dependencies.push('tests/fixtures/frontend-adoption-v3/'+originals[key].path);
 for(const p of Object.keys(await manifest(resolve(root,'../frontend-adoption-v3-image-resolution')))) dependencies.push('tests/fixtures/frontend-adoption-v3-image-resolution/'+p);
 const bound = Object.fromEntries(await Promise.all(dependencies.map(async p=>[p,sha(await readFile(join(repository,p)))])));
 check(bound['scripts/frontend-adoption-v3.mjs']===prior.runnerSHA256,'Original native runner changed.');
 for(const [p,h] of Object.entries(prior.dependencies)) check(bound[p]===h,'Original dependency changed: '+p);
 const plan={schemaVersion:1,experiment:'mobile-native-portrait-qualification-01',fileManifest:await inputs(),dependencies:bound,host:prior.host,outputPath,
  controls:'All five controls inherited unchanged and checked again before launch and by native recorder before turn.',
  execution:'Existing captureTrial/runPairs; three original matched pairs; six total attempts, no retry/expansion; one fresh fixed output and persistent exclusive run claim. Identity-scoped SIGINT/SIGTERM interruption uses existing recorder.',
  outcome:'Independent review pending. Original F09 remains failed; no pooling/regrade/exact-resolution qualification.',
  launchAuthority:'Parent source/criteria/authority review required before --parent-approved; freeze alone authorizes no model call.'};
 await validateHost(plan); await put(join(root,'plan.json'),plan); return sha(await readFile(join(root,'plan.json')));
}
async function validateHost(plan) {
 check(process.version===plan.host.node && process.platform===plan.host.platform,'Host runtime changed.');
 check(sha(await readFile(plan.host.executablePath))===plan.host.executableSHA256,'Codex executable changed.');
 check(isDeepStrictEqual(readNativeControls(),plan.host.configured),'Configured controls changed.');
 const v=spawnSync(plan.host.executablePath,['--version'],{encoding:'utf8'});
 check(v.status===0 && v.stdout.trim()===plan.host.cliVersion,'CLI version changed.');
}
export async function verify() {
 const bytes=await readFile(join(root,'plan.json')),plan=JSON.parse(bytes);
 check(isDeepStrictEqual(await inputs(),plan.fileManifest),'Frozen qualification input changed.');
 for(const [p,h] of Object.entries(plan.dependencies)) check(sha(await readFile(join(repository,p)))===h,'Frozen dependency changed: '+p);
 await validateHost(plan);
 const cases=await json(join(root,'scenarios.json')),schedule=await json(join(root,'schedule.json')),sources=await json(join(root,'sources/index.json'));
 check(cases.length===1 && schedule.length===6,'Qualification must remain one case and six trials.');
 for(const s of Object.values(sources)) check(sha(await readFile(join(root,s.path)))===s.sha256,'Source snapshot hash mismatch.');
 return {plan,planSHA256:sha(bytes),cases,schedule,sources,common:await json(join(root,'common-scope.json'))};
}
export async function run(parentApproved=false) {
 check(parentApproved===true,'Parent source/criteria/authority approval required.');
 const snapshot=await verify(),output=snapshot.plan.outputPath;
 // Claim survives every failure, including output creation failure. Never silently retry.
 await put(join(root,'run-claim.json'),{planSha256:snapshot.planSHA256,output,pid:process.pid,startedAt:new Date().toISOString()});
 await mkdir(output);
 await put(join(output,'attempt-schedule.json'),snapshot.schedule);
 let interrupted=false;
 const onSignal=()=>{interrupted=true;void interruptCaptures().then(results=>{for(const r of results)if(r.status==='rejected')console.error(r.reason);});};
 process.on('SIGINT',onSignal);process.on('SIGTERM',onSignal);
 let settled;
 try {
  settled=await runPairs({schedule:snapshot.schedule,shouldStop:()=>interrupted,start:async row=>{
   await verify();const directory=join(output,row.trialId);await mkdir(directory);
   console.log(JSON.stringify({state:'started',trialId:row.trialId}));
   try {
    const result=await captureTrial({root,snapshot,row,directory,exportRoot:join(output,'reviewer-bundles'),executable:snapshot.plan.host.executablePath,browserPaths:null});
    console.log(JSON.stringify({state:'recorded',trialId:row.trialId,reviewId:result.reviewId,failed:result.failed}));return result;
   } catch(error) {await put(join(directory,'launcher-failure.json'),{message:error.message,stack:error.stack,retain:'All native/before/tool evidence retained; no retry.'});throw error;}
  }});
 } finally {process.removeListener('SIGINT',onSignal);process.removeListener('SIGTERM',onSignal);}
 const records=settled.map(r=>r.status==='fulfilled'?{row:r.row,status:r.status,result:r.value}:{row:r.row,status:r.status,error:r.reason?.stack??String(r.reason)});
 const summary={expected:6,settled:records.length,interrupted,records,independentReview:'pending; no automatic quality verdict',noncomparability:'Separate native portrait qualification; original F09 failed and unchanged. No pooling or exact-size claim.'};
 await put(join(output,'run-summary.json'),summary);return summary;
}
if(process.argv[1] && import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const [command,approval]=process.argv.slice(2);
 try{
  if(command==='freeze')console.log(await freeze());
  else if(command==='verify')console.log(JSON.stringify({verified:true,planSha256:(await verify()).planSHA256}));
  else if(command==='run'){const r=await run(approval==='--parent-approved');console.log(JSON.stringify(r));if(r.interrupted||r.settled!==6||r.records.some(x=>x.status!=='fulfilled'||x.result.failed))process.exitCode=1;}
  else throw new Error('Use freeze, verify, or run --parent-approved after review.');
 }catch(e){console.error(e.stack);process.exitCode=1;}
}
