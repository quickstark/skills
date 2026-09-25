import { readFile, writeFile, mkdir, cp } from 'node:fs/promises';
import { readFileSync, appendFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { execute, manifest } from '../../../../scripts/frontend-adoption-trials.mjs';
if (process.argv.length !== 3 || process.argv[2] !== '--parent-approved-proof-trial') throw new Error('Parent review and explicit trial approval required');
const amendment = dirname(fileURLToPath(import.meta.url)), root=resolve(amendment,'..');
const sha=b=>createHash('sha256').update(b).digest('hex');
const planBytes=await readFile(join(amendment,'render-report-proof-plan.json')), plan=JSON.parse(planBytes);
for(const [name,h] of Object.entries(plan.files)) if(sha(await readFile(resolve(root,name)))!==h)throw new Error('Bound input changed: '+name);
for(const [name,h] of Object.entries(plan.canonicalSources)) if(sha(await readFile(resolve(root,'../../..',name)))!==h)throw new Error('Canonical source changed: '+name);
for(const [name,h] of Object.entries(plan.preservedArchiveFiles)) if(sha(await readFile(resolve(root,name)))!==h)throw new Error('Original history changed: '+name);
if(sha(await readFile(plan.executable))!==plan.executableSHA256)throw new Error('Model executable changed');
const directory=plan.captureDirectory,cwd=plan.workspace;
let interruptionSignal=null, sent=false, killTimer=null;
const stopEvents=[];
function identity(pid) { try { const raw=readFileSync(`/proc/${pid}/stat`,'utf8');return readFileSync('/proc/sys/kernel/random/boot_id','utf8').trim()+':'+raw.slice(raw.lastIndexOf(')')+2).split(' ')[19]; } catch { return null; } }
function stopOwned() {
 if(!interruptionSignal || sent)return;
 let record;try{record=JSON.parse(readFileSync(join(directory,'process.json'),'utf8'));}catch{return;}
 if(!Number.isInteger(record.pid) || !record.identity || identity(record.pid)!==record.identity)return;
 sent=true;
 try{process.kill(-record.pid,'SIGTERM');stopEvents.push({pid:record.pid,identity:record.identity,action:'SIGTERM',reason:interruptionSignal});}catch(e){stopEvents.push({action:'SIGTERM failed',code:e.code});}
 killTimer=setTimeout(()=>{if(identity(record.pid)===record.identity){try{process.kill(-record.pid,'SIGKILL');stopEvents.push({pid:record.pid,identity:record.identity,action:'SIGKILL'});}catch(e){stopEvents.push({action:'SIGKILL failed',code:e.code});}}},5000);
}
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{interruptionSignal??=signal;stopOwned();});
await mkdir(directory);await mkdir(cwd); // exclusive new attempt; never reuse old directories
await cp(join(root,'project'),cwd,{recursive:true});
await cp(join(root,'guidance'),join(cwd,'guidance'),{recursive:true});
await cp(join(amendment,'render-report-proof-root.md'),join(cwd,'guidance/instructions.md'));
await cp(cwd,join(directory,'before'),{recursive:true});
await writeFile(join(directory,'before-binding.json'),JSON.stringify(await manifest(cwd),null,2));
await writeFile(join(directory,'run-binding.json'),JSON.stringify({id:plan.id,planSHA256:sha(planBytes),node:process.version,platform:process.platform,amendedRootSHA256:plan.amendedRootSHA256},null,2));
if(interruptionSignal)throw new Error('Interrupted before capture');
const timer=setInterval(stopOwned,100);
let telemetry;
try { telemetry=await execute({prompt:await readFile(join(root,'render-prompt.txt'),'utf8'),cwd,directory,scenario:{mode:'implementation',budget:{timeoutMs:360000,maximumImageCalls:0}},executable:plan.executable}); }
finally { clearInterval(timer);clearTimeout(killTimer);await writeFile(join(directory,'supervisor-interruption.json'),JSON.stringify({interruptionSignal,stopEvents},null,2)); }
await cp(cwd,join(directory,'after'),{recursive:true});
await writeFile(join(directory,'after-binding.json'),JSON.stringify(await manifest(cwd),null,2));
console.log(JSON.stringify({id:plan.id,directory,cwd,exitCode:telemetry.exitCode,completedTurn:telemetry.completedTurn,timedOut:telemetry.timedOut,interruptionSignal,elapsedMs:telemetry.elapsedMs,processObservationComplete:telemetry.processObservation.complete,ownedResiduals:telemetry.observedOwnedResidualProcesses.length}));
if(interruptionSignal || telemetry.exitCode!==0 || !telemetry.completedTurn || telemetry.timedOut || !telemetry.processObservation.complete || telemetry.observedOwnedResidualProcesses.length)process.exitCode=1;
