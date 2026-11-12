import{readFile,readdir}from'node:fs/promises';
import{createHash}from'node:crypto';
import{join,dirname,resolve}from'node:path';
import{fileURLToPath,pathToFileURL}from'node:url';
const sha=x=>createHash('sha256').update(x).digest('hex'),json=async p=>JSON.parse(await readFile(p,'utf8'));
const check=(x,why)=>{if(!x)throw Error(why);};
export async function auditE4Amendment(root=dirname(fileURLToPath(import.meta.url))){
 const p=await json(join(root,'e4-amendment-protocol.json')),m=await json(join(root,'e4-amendment-inputs.json')),original=await json(join(root,'isolation-inputs.json'));
 const old=original.cases.find(c=>c.id==='E4'),e3=original.cases.find(c=>c.id==='E3'),c=m.cases[0];
 check(m.cases.length===1&&c.id==='E4-AM1'&&p.oneRequestOnly,'Amendment scope');
 check(sha(await readFile(join(root,'e4-amendment-inputs.json')))===p.manifestSHA256,'Amended manifest hash');
 const freeze=await json(join(root,'e4-amendment-preregistration/E4-AM1-freeze.json'));
 for(const [name,hash]of Object.entries(p.preregistrationSHA256))check(sha(await readFile(join(root,'e4-amendment-preregistration',name)))===hash,'Amendment preregistration hash '+name);
 check(m.instructions[c.instructionKey]===original.instructions[old.instructionKey]&&c.input===old.input,'Source/E4 request changed');
 check(c.sharedContext.P1===old.sharedContext.P1&&c.sharedContext.E3===e3.input&&JSON.stringify(Object.keys(c.sharedContext))===JSON.stringify(['P1','E3']),'Only exact E3 observation may be added');
 const expected=await readFile(join(root,'e4-amendment-preregistration/E4-AM1-prompt.txt'),'utf8');
 check(sha(expected)==='b82c8417dabd94028f18be8ab0bf24b1f715f35df7540bea961b35c8d9d2ab5b'&&p.promptSHA256===sha(expected)&&freeze.promptSHA256===sha(expected),'Frozen amendment prompt');
 const directory=join(root,'e4-amendment-captures/E4-AM1'),r=await json(join(directory,'result.json')),t=await json(join(directory,'telemetry.json'));
 const dirs=(await readdir(join(root,'e4-amendment-captures'),{withFileTypes:true})).filter(x=>x.isDirectory()).map(x=>x.name);
 check(JSON.stringify(dirs)===JSON.stringify(['E4-AM1']),'Unexpected amendment attempts');
 check(await readFile(join(directory,'prompt.txt'),'utf8')===expected,'Capture prompt differs from preregistration');
 const raw=(await readFile(join(directory,'raw-protocol.jsonl'),'utf8')).trim().split('\n').map(JSON.parse);
 const sent=raw.filter(x=>x.direction==='sent'&&x.message.method==='turn/start');
 check(sent.length===1,'Expected exactly one actual amendment turn');
 const text=sent[0].message.params.input.filter(x=>x.type==='text').map(x=>x.text).join('');
 check(text===expected&&!text.includes('$'),'Actual native amendment text');
 const decoded=JSON.parse(text.split('<fixture_json>\n\n')[1].split('\n\n</fixture_json>')[0]);
 check(decoded.instructions===original.instructions[old.instructionKey]&&decoded.user_request===old.input&&decoded.observations.P1===old.sharedContext.P1&&decoded.observations.E3===e3.input,'Actual decoded source/request/P1/E3');
 check(JSON.stringify(decoded.observations)===JSON.stringify(c.sharedContext),'Unexpected amendment observations');
 check(JSON.stringify(t.configuredControls)===JSON.stringify(p.controls)&&JSON.stringify(t.effectiveControls)===JSON.stringify(p.controls),'Amendment controls');
 check(t.runnerSHA256===p.nativeRunnerSHA256&&r.promptSHA256===sha(expected),'Amendment runner/prompt binding');
 for(const [name,hash]of Object.entries(t.runtimeFiles))check(sha(await readFile(join(directory,name)))===hash,'Amendment runtime hash '+name);
 if(r.acceptedCapture){check(t.completedTurn&&t.nativeStreamComplete&&t.processObservation.complete&&t.toolCount===0&&t.observedNamedImageCalls===0&&t.serverRequests.length===0,'Amendment capture integrity');
 check(JSON.stringify(JSON.parse(await readFile(join(directory,'response.md'),'utf8')))===JSON.stringify(r.envelope),'Amendment envelope equality');
 const finals=raw.filter(x=>x.direction==='received'&&x.message.method==='item/completed'&&x.message.params?.item?.type==='agentMessage');
 check(finals.map(x=>x.message.params.item.text).join('\n\n')===await readFile(join(directory,'response.md'),'utf8'),'Amendment native final response');}
 return{id:'E4-AM1',acceptedCapture:r.acceptedCapture,promptSHA256:sha(text),parsedNativeRawDollarBytes:0,decodedSourceE4RequestP1Unchanged:true,addedOnlyExactOriginalE3:true,configuredControls:p.controls,toolCount:t.toolCount,imageCalls:t.observedNamedImageCalls,semanticReview:'Separate independent parent decision required; original E4 remains unqualified',responseSHA256:sha(await readFile(join(directory,'response.md')))};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){console.log(JSON.stringify(await auditE4Amendment(),null,2));}
