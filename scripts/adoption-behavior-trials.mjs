// Actual bounded behavior capture. Model responses are evidence, never auto-scored.
import { readFile, writeFile, mkdir, mkdtemp, cp } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execute, manifest, sha } from './frontend-adoption-trials.mjs';
import { TARGET_PUBLIC_COMMANDS, TARGET_PUBLIC_COMMANDS_BY_NAME } from './skill-collection-registry.mjs';
import { renderHelpRoutingReference, renderSkillOutputContract } from './sync-skill-output-contracts.mjs';
const repository=resolve(dirname(fileURLToPath(import.meta.url)),'..');
export const root=join(repository,'tests/fixtures/adoption-behavior');
const runner=fileURLToPath(import.meta.url);
let stopRequested=false,activeDirectory=null;
function cancelCurrent(){
 stopRequested=true;
 const signal=kind=>{try{const b=JSON.parse(readFileSync(join(activeDirectory,'process.json'),'utf8'));const stat=readFileSync(`/proc/${b.pid}/stat`,'utf8');const identity=readFileSync('/proc/sys/kernel/random/boot_id','utf8').trim()+':'+stat.slice(stat.lastIndexOf(')')+2).split(' ')[19];if(identity===b.identity)process.kill(-b.pid,kind);}catch{}};
 signal('SIGTERM');const timer=setTimeout(()=>signal('SIGKILL'),5000);timer.unref();
}
const readJSON=async p=>JSON.parse(await readFile(p,'utf8'));
const json=async(p,d)=>writeFile(p,JSON.stringify(d,null,2)+'\n',{flag:'wx'});
function host(){
 const version=spawnSync('codex',['--version'],{encoding:'utf8'});
 const settings=spawnSync('python3',['-c','import os,json,tomllib,pathlib;p=pathlib.Path(os.environ.get("CODEX_HOME",str(pathlib.Path.home()/".codex")))/"config.toml";d=tomllib.loads(p.read_text()) if p.exists() else {};print(json.dumps({k:d.get(k) for k in ["model","model_reasoning_effort","sandbox_mode","approval_policy"]}))'],{encoding:'utf8'});
 if(version.status!==0||settings.status!==0)throw Error('Existing Codex/version/config unavailable.');
 return {cli:version.stdout.trim(),configured:JSON.parse(settings.stdout),platform:process.platform,node:process.version,overrides:[]};
}
export async function instruction(c,path){
 const raw=await readFile(join(repository,path),'utf8'); let text=raw;
 if(path===c.source){const skill=TARGET_PUBLIC_COMMANDS_BY_NAME.get(c.skill);if(!skill)throw Error('Unknown target root');const marker='## Completion report and next steps';if(!raw.includes(marker))throw Error('Missing completion contract');text=raw.slice(0,raw.indexOf(marker))+renderSkillOutputContract(skill,{commandsByName:TARGET_PUBLIC_COMMANDS_BY_NAME});}
 if(path==='skills/engineering/qs-help/ROUTING.md')text=renderHelpRoutingReference(TARGET_PUBLIC_COMMANDS);
 return {path,sourceSHA256:sha(raw),derivedSHA256:sha(text),text,bytes:Buffer.byteLength(text)};
}
export async function freeze(){
 const cases=await readJSON(join(root,'scenarios.json'));if(!cases.length||new Set(cases.map(c=>c.id)).size!==cases.length)throw Error('Unique cases required');
 const sources={};for(const c of cases){sources[c.id]=[];for(const p of[c.source,...c.references])sources[c.id].push(await instruction(c,p));}
 const plan={schemaVersion:1,kind:'current-instruction-preservation',host:host(),runnerSHA256:sha(await readFile(runner)),supervisorSHA256:sha(await readFile(join(repository,'scripts/frontend-adoption-trials.mjs'))),scenariosSHA256:sha(await readFile(join(root,'scenarios.json'))),sources,attemptsPerCase:1,retries:0,scope:'Single current-instruction preservation trials; no matched efficiency or universal compliance claim. Expected rubric withheld from responders. Rendered target completion/routing metadata is the exact candidate projector path; original and derived hashes separate.'};
 await json(join(root,'plan.json'),plan);return plan;
}
export async function verify(){
 const plan=await readJSON(join(root,'plan.json')),cases=await readJSON(join(root,'scenarios.json'));
 if(plan.runnerSHA256!==sha(await readFile(runner))||plan.supervisorSHA256!==sha(await readFile(join(repository,'scripts/frontend-adoption-trials.mjs')))||plan.scenariosSHA256!==sha(await readFile(join(root,'scenarios.json'))))throw Error('Frozen runner/supervisor/scenarios changed');
 if(JSON.stringify(host())!==JSON.stringify(plan.host))throw Error('Host defaults changed');
 for(const c of cases)for(const old of plan.sources[c.id]){const now=await instruction(c,old.path);if(now.derivedSHA256!==old.derivedSHA256)throw Error('Rendered instruction changed: '+old.path);}
 return {plan,cases};
}
export function promptFor(c,sources,cwd){
 return ['Perform one bounded task using the supplied root and private instructions as task guidance. Do not invoke any public skill, create goals, contact external services, install dependencies, inspect secrets, publish, or change model/reasoning/sandbox/approval settings. No delegation. Fixture facts below are synthetic authoritative observations for this task, not claims about real external systems.',
 `Task workspace: ${cwd}. `+(c.mode==='response-only'?'Respond directly in chat only. Do not call tools or write files; all needed task facts are supplied.':'Only local tools and edits explicitly named in the request are authorized. Preserve product and unrelated files. Do not leave running processes. Existing Node built-ins suffice; no dependencies or network beyond your own loopback fixture.'),
 '<user_request>',c.request,'</user_request>',...sources.flatMap(s=>['<instruction>',s.text,'</instruction>'])].join('\n\n');
}
export async function capture(c,sources,cwd,directory,executable='codex'){
 return execute({executable,prompt:promptFor(c,sources,cwd),cwd,directory,scenario:{mode:c.mode==='response-only'?'prompt-only':'implementation',budget:{timeoutMs:c.timeoutMs,maximumImageCalls:0}}});
}
export async function run(output){
 if(!/^\/tmp\/qs-adoption-behavior-[a-z0-9-]+$/.test(output))throw Error('Fresh explicit /tmp output required');
 const {plan,cases}=await verify();await mkdir(output);await json(join(output,'run-binding.json'),{pid:process.pid,startedAt:new Date().toISOString(),planSHA256:sha(await readFile(join(root,'plan.json'))),attempts:1,retries:0});
 const results=[];
 for(const c of cases){
  if(stopRequested)break;
  const directory=join(output,c.id);await mkdir(directory);const cwd=await mkdtemp('/tmp/qs-behavior-task-');
  for(const[p,text]of Object.entries(c.files)){if(p.startsWith('/')||p.split('/').includes('..'))throw Error('Unsafe fixture path');await mkdir(dirname(join(cwd,p)),{recursive:true});await writeFile(join(cwd,p),text);}
  const before=await manifest(cwd);await cp(cwd,join(directory,'before'),{recursive:true});
  await json(join(directory,'binding.json'),{id:c.id,cwd,host:plan.host,instructions:plan.sources[c.id].map(({text,...binding})=>binding)});
  activeDirectory=directory;console.log(JSON.stringify({state:'started',id:c.id}));
  const telemetry=await capture(c,plan.sources[c.id],cwd,directory);
  const after=await manifest(cwd);await cp(cwd,join(directory,'after'),{recursive:true});
  activeDirectory=null;
  const failure=stopRequested||telemetry.exitCode!==0||!telemetry.completedTurn||!telemetry.responsePresent||telemetry.timedOut||telemetry.stopReason||telemetry.malformedLines||!telemetry.processObservation.complete||telemetry.observedOwnedResidualProcesses.length||c.mode==='response-only'&&JSON.stringify(before)!==JSON.stringify(after);
  await json(join(directory,'review-context.json'),{case:c,before,after,execution:telemetry,reviewStatus:'Independent review required; no automatic behavioral score'});
  const record={id:c.id,failure:Boolean(failure),completedTurn:telemetry.completedTurn};results.push(record);console.log(JSON.stringify({state:'recorded',...record}));
 }
 await json(join(output,'summary.json'),{results,requested:cases.length,interrupted:stopRequested,adoption:'Pending independent review',efficiencyClaim:false});return {recorded:results.length,executionFailures:results.filter(x=>x.failure).length+cases.length-results.length};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){process.on('SIGTERM',cancelCurrent);process.on('SIGINT',cancelCurrent);try{const [op,out]=process.argv.slice(2);const result=op==='freeze'?await freeze():op==='verify'?(await verify()).plan:op==='run'?await run(out):(()=>{throw Error('Expected freeze/verify/run')})();console.log(JSON.stringify(op==='run'?result:{verified:true,caseCount:Object.keys(result.sources).length}));if(result.executionFailures)process.exitCode=1;}catch(e){console.error(e.stack);process.exitCode=1;}}
