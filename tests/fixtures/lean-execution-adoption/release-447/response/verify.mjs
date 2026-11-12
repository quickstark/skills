import {readFile, readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {responsePrompt, verifyPlan} from '../../../scripts/lean-execution-trials.mjs';
import {auditE4Amendment} from './e4-amendment-audit.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url))),repo=resolve(root,'../../..'),fixture=join(repo,'tests/fixtures/lean-execution-adoption');
const sha=x=>createHash('sha256').update(x).digest('hex');
const json=async p=>JSON.parse(await readFile(p,'utf8'));
function check(v,why){if(!v)throw Error(why);}
const b=await json(join(root,'frozen-bindings.json')),p=await json(join(root,'protocol.json')),m=await json(join(root,'isolation-inputs.json'));
for(const [path,hash]of Object.entries(b.sourceAndEvidenceSHA256))check(sha(await readFile(join(repo,path)))===hash,'Source/evidence changed: '+path);
for(const [path,hash]of Object.entries(b.derivedSHA256))check(sha(await readFile(join(root,path)))===hash,'Frozen derived changed: '+path);
await verifyPlan(root);
check(sha(await readFile(join(root,'isolation-inputs.json')))===p.manifestSHA256,'Manifest hash');
check(m.cases.length===40&&new Set(m.cases.map(c=>c.id)).size===40,'Case inventory');
check(JSON.stringify(m.cases.map(c=>c.id))===JSON.stringify(p.caseIds),'Case ids');
check(!m.cases.some(c=>['L3','L6','L8','B8','P10','MT1','MT2','MT3'].includes(c.id)),'Reused case repeated');
for(const c of m.cases){
 const o=p.origins.find(o=>o.id===c.id);check(o,'Missing origin');
 const old=await readFile(join(repo,o.legacyPrompt),'utf8');
 const legacy=responsePrompt(m.instructions[c.instructionKey],o.originalCase);
 check(old===legacy,'Legacy inputs changed '+c.id);check(old.includes('$'),'Uncontaminated case repeated '+c.id);
 const prompt=responsePrompt(m.instructions[c.instructionKey],c);
 check(!prompt.includes('$'),'Raw dollar '+c.id);check(sha(prompt)===p.promptSHA256[c.id],'Prompt hash '+c.id);
 const decoded=JSON.parse(prompt.split('<fixture_json>\n\n')[1].split('\n\n</fixture_json>')[0]);
 check(decoded.instructions===m.instructions[c.instructionKey]&&decoded.user_request===o.originalCase.input&&JSON.stringify(decoded.observations)===JSON.stringify(o.originalCase.sharedContext??{}),'Decode '+c.id);
 const copy={...c};delete copy.transportEncoding;copy.instructionKey=o.originalCase.instructionKey;
 check(JSON.stringify(copy)===JSON.stringify(o.originalCase),'Scenario changed '+c.id);
}
// Positive control proves absence checking sees the actual dangerous byte.
check(responsePrompt('raw $qs-skills:qs-flow-handoff',{input:'control'}).includes('$'),'Dollar absence positive control ineffective');
const reuse=await json(join(root,'reuse-assessment.json'));
const core=await json(join(fixture,'core-review.json')),mapping=await json(join(fixture,'core-review-mapping.json')),exec=await json(join(fixture,'execution-review.json'));
for(const r of reuse.zeroDollarCaptures){
 const raw=(await readFile(join(fixture,r.capture,'raw-protocol.jsonl'),'utf8')).trim().split('\n').map(JSON.parse);
 const sends=raw.filter(r=>r.direction==='sent'&&r.message.method==='turn/start');check(sends.length===1,'Reuse sent turn count');
 const text=sends[0].message.params.input.filter(x=>x.type==='text').map(x=>x.text).join('');
 check(!text.includes('$'),'Reuse actual sent text contaminated');
 check(text===await readFile(join(fixture,r.capture,'prompt.txt'),'utf8'),'Reuse prompt mismatch');
 check((await json(join(fixture,r.capture,'result.json'))).acceptedCapture,'Reuse capture integrity');
 if(r.capture.includes('candidate-pilot')){const sample=Object.entries(mapping).find(([,v])=>v===r.capture+'/result.json')?.[0];check(core.finalRatings.find(r=>r.id===sample)?.passed,'Reusable blinded acceptance');}
 else check(exec.ratings.find(r=>r.id==='P10')?.passed,'Reusable executor acceptance');
}
const mtReview=await json(join(fixture,'mobile-report-transport-review.json'));
const mobileInputs=await json(join(fixture,'mobile-report-transport-inputs.json'));
const mobileLegacy=await json(join(fixture,'mobile-report-followup-inputs.json'));
for(const id of ['MT1','MT2','MT3']){
 check(mtReview.cases.find(r=>r.id===id)?.qualified,'Mobile independent acceptance');
 check((await json(join(fixture,'mobile-report-transport-captures',id,'result.json'))).acceptedCapture,'Mobile integrity');
 const raw=(await readFile(join(fixture,'mobile-report-transport-captures',id,'raw-protocol.jsonl'),'utf8')).trim().split('\n').map(JSON.parse);
 const sent=raw.filter(x=>x.direction==='sent'&&x.message.method==='turn/start');check(sent.length===1,'Mobile sent turn count');
 const text=sent[0].message.params.input.filter(x=>x.type==='text').map(x=>x.text).join('');check(!text.includes('$'),'Mobile parsed text raw dollar');
 const decoded=JSON.parse(text.split('<fixture_json>\n\n')[1].split('\n\n</fixture_json>')[0]);
 const c=mobileInputs.cases.find(c=>c.id===id),legacy=mobileLegacy.cases.find(c=>c.id==='MR'+id.slice(2));
 check(decoded.instructions===mobileInputs.instructions[c.instructionKey]&&decoded.instructions===mobileLegacy.instructions[legacy.instructionKey],'Mobile decoded instructions');
 check(decoded.user_request===legacy.input&&JSON.stringify(decoded.observations)===JSON.stringify(legacy.sharedContext??{}),'Mobile decoded case');
}
const instructionSources=await json(join(root,'instruction-source-bindings.json'));
for(const [path,hash]of Object.entries(instructionSources.sha256)){const body=await readFile(join(repo,path),'utf8');check(sha(body)===hash&&Object.values(m.instructions).some(x=>x.includes(body)),'Instruction source body '+path);}
const reuseBindings=await json(join(root,'reuse-bindings.json'));
for(const [path,hash]of Object.entries(reuseBindings.sha256))check(sha(await readFile(join(repo,path)))===hash,'Reuse binding '+path);
const a=await json(join(root,'assessment.json'));
const found=await readdir(join(root,'isolation-captures'));
const results=[];
for(const c of m.cases){
 if(!found.includes(c.id))continue;
 const dir=join(root,'isolation-captures',c.id),r=await json(join(dir,'result.json')),t=await json(join(dir,'telemetry.json'));
 results.push(r);
 const prompt=await readFile(join(dir,'prompt.txt'),'utf8');
 check(prompt===responsePrompt(m.instructions[c.instructionKey],c),'Actual prompt changed '+c.id);
 check(sha(prompt)===r.promptSHA256&&sha(prompt)===t.promptSHA256,'Actual prompt hash '+c.id);
 const raw=(await readFile(join(dir,'raw-protocol.jsonl'),'utf8')).trim().split('\n').map(JSON.parse);
 const sends=raw.filter(x=>x.direction==='sent'&&x.message.method==='turn/start');
 check(sends.length===1,'Actual sent turn count '+c.id);
 const actual=sends[0].message.params.input.filter(x=>x.type==='text').map(x=>x.text).join('');
 check(actual===prompt&&!actual.includes('$'),'Actual sent parsed text contaminated '+c.id);
 check(JSON.stringify(await json(join(dir,'configured-controls.json')))===JSON.stringify(p.controls),'Configured controls '+c.id);
 if(r.acceptedCapture){
  check(t.completedTurn&&t.nativeStreamComplete&&t.processObservation.complete&&t.toolCount===0&&t.observedNamedImageCalls===0&&t.serverRequests.length===0,'Capture integrity '+c.id);
  check(JSON.stringify(t.effectiveControls)===JSON.stringify(p.controls),'Effective controls '+c.id);
  check(t.runnerSHA256===p.nativeRunnerSHA256,'Native runner '+c.id);
  check(JSON.stringify(JSON.parse(await readFile(join(dir,'response.md'),'utf8')))===JSON.stringify(r.envelope),'Envelope changed '+c.id);
  const finals=raw.filter(x=>x.direction==='received'&&x.message.method==='item/completed'&&x.message.params?.item?.type==='agentMessage');
  check(finals.map(x=>x.message.params.item.text).join('\n\n')===await readFile(join(dir,'response.md'),'utf8'),'Native final response '+c.id);
 }
 for(const [path,hash]of Object.entries(t.runtimeFiles))check(sha(await readFile(join(dir,path)))===hash,'Native runtime file '+c.id+'/'+path);
}
check(results.length===a.captureAttempts&&results.filter(r=>r.acceptedCapture).length===a.newResponses,'Measured capture counts');
check(a.newResponses+a.unresolvedCaptureCaseIds.length===40,'Remaining isolation obligations');
check(a.independentlyQualifiedNewCases.length===0&&JSON.stringify(a.semanticReviewPendingCaseIds)===JSON.stringify(p.caseIds.filter(id=>id!=='E4'))&&JSON.stringify(a.knownParentSemanticFailureIds)===JSON.stringify(['E4']),'No self independent acceptance');
const amendment=await auditE4Amendment(root);
check(JSON.stringify(amendment)===JSON.stringify(a.e4Amendment)&&a.totalNativeCaptureAttempts===results.length+1&&a.totalCaptureIntegrityAccepted===a.newResponses+Number(amendment.acceptedCapture),'Amendment measured counts');
check((await json(join(root,'infrastructure-rejection.json'))).executed===false,'Original rejection preserved');
check((await json(join(root,'authorization-resolution.json'))).hostDecision.includes('approved'),'Approved resolution');
const artifactBindings=await json(join(root,'artifact-bindings.json'));
for(const [path,hash]of Object.entries(artifactBindings.sha256))check(sha(await readFile(join(root,path)))===hash,'Artifact changed '+path);
console.log('LEAF_BINDINGS_OK');
