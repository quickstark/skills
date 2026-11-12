import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
const root=dirname(fileURLToPath(import.meta.url));
const sha=x=>createHash('sha256').update(x).digest('hex');
const json=async p=>JSON.parse(await readFile(p,'utf8'));
const protocol=await json(join(root,'protocol.json')),manifest=await json(join(root,'isolation-inputs.json'));
const result=[];
for(const id of protocol.caseIds){
 const dir=join(root,'isolation-captures',id);
 if(!(await readdir(join(root,'isolation-captures'))).includes(id))continue;
 let r;try{r=await json(join(dir,'result.json'));}catch{continue;}
 const raw=(await readFile(join(dir,'raw-protocol.jsonl'),'utf8')).trim().split('\n').map(JSON.parse);
 const sent=raw.filter(x=>x.direction==='sent'&&x.message.method==='turn/start');
 const text=sent[0]?.message.params.input.filter(i=>i.type==='text').map(i=>i.text).join('')??'';
 const scenario=manifest.cases.find(c=>c.id===id),origin=protocol.origins.find(o=>o.id===id);
 let decoded;try{decoded=JSON.parse(text.split('<fixture_json>\n\n')[1]?.split('\n\n</fixture_json>')[0]);}catch{}
 const t=await json(join(dir,'telemetry.json'));
 result.push({id,acceptedCapture:r.acceptedCapture,completedTurn:t.completedTurn,stopReason:t.stopReason,sentTurnCount:sent.length,parsedNativeTextRawDollarBytes:Buffer.from(text).filter(x=>x===36).length,promptSHA256:sha(text),matchesFrozenPromptHash:sha(text)===protocol.promptSHA256[id],decodedInstructionExactlyEqual:decoded?.instructions===manifest.instructions[scenario.instructionKey],decodedRequestExactlyEqual:decoded?.user_request===origin.originalCase.input,decodedObservationsEqual:JSON.stringify(decoded?.observations)===JSON.stringify(origin.originalCase.sharedContext??{}),toolCount:t.toolCount,imageCalls:t.observedNamedImageCalls,configuredControlsMatch:JSON.stringify(t.configuredControls)===JSON.stringify(protocol.controls),effectiveControlsMatch:JSON.stringify(t.effectiveControls)===JSON.stringify(protocol.controls),runtimeFileHashChecks:Object.fromEntries(await Promise.all(Object.entries(t.runtimeFiles).map(async([p,h])=>[p,sha(await readFile(join(dir,p)))===h]))),independentSemanticReview:'pending parent',responseSHA256:sha(await readFile(join(dir,'response.md')))});
}
const audit={kind:'actual-native-text-transport-and-capture-integrity-not-semantic-acceptance',cases:result};
if(process.argv.includes('--write'))await writeFile(join(root,'capture-audit.json'),JSON.stringify(audit,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(audit,null,2));
