import { spawnSync } from 'node:child_process';
import { cp, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
const fields = ['model', 'model_reasoning_effort', 'sandbox_mode', 'approval_policy'];
const query = `import json,sys,tomllib
with open(sys.argv[1], 'rb') as f: config=tomllib.load(f)
print(json.dumps({k:config.get(k) for k in ['model','model_reasoning_effort','sandbox_mode','approval_policy']}))`;
export function verifySelectedControls(configPath, expected) {
  const result=spawnSync('/usr/bin/python3',['-c',query,configPath],{encoding:'utf8',timeout:5000,maxBuffer:8192});
  // Withhold parser stderr/raw configuration, including on malformed input.
  if(result.status!==0 || result.error)throw new Error('Unable to read selected host controls');
  let observed;try{observed=JSON.parse(result.stdout);}catch{throw new Error('Invalid selected host control response');}
  const changed=fields.filter(key=>typeof expected[key]!=='string' || observed[key]!==expected[key]);
  if(changed.length)throw new Error('Host controls changed: '+changed.join(', '));
  return Object.fromEntries(fields.map(key=>[key,observed[key]]));
}
export async function captureWithAfterState({directory,cwd,capture,manifest}) {
  let telemetry=null,captureError=null;
  const snapshotErrors=[];
  try { telemetry=await capture(); }
  catch(error) { captureError=String(error?.stack ?? error); }
  finally {
    // Independently attempt each artifact so a copy failure cannot suppress
    // the manifest attempt or the original execute failure record.
    try { await cp(cwd,join(directory,'after'),{recursive:true}); }
    catch(error) { snapshotErrors.push({step:'copy-after',error:String(error)}); }
    try { await writeFile(join(directory,'after-binding.json'),JSON.stringify(await manifest(cwd),null,2)); }
    catch(error) { snapshotErrors.push({step:'after-manifest',error:String(error)}); }
    await writeFile(join(directory,'capture-outcome.json'),JSON.stringify({captureError,snapshotErrors,telemetryReturned:telemetry!==null},null,2));
  }
  return {telemetry,captureError,snapshotErrors};
}
