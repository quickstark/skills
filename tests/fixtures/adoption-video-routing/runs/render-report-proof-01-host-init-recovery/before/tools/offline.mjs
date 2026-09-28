// Test instrumentation only: keep the published CLI's home/cache writes in the
// fixture, refuse network, and halt init before its automatic preview startup.
import os from 'node:os';
import { syncBuiltinESMExports } from 'node:module';
import { appendFileSync } from 'node:fs';
const dir=process.env.HF_TEST_USER_DIRECTORY;
if (!dir?.startsWith('/tmp/')) throw new Error('HF_TEST_USER_DIRECTORY must be an isolated /tmp fixture');
os.homedir=()=>dir;
syncBuiltinESMExports();
globalThis.fetch=async(input)=>{appendFileSync(process.env.HF_TEST_NETWORK_LOG,JSON.stringify({url:String(input)})+'\n');throw new Error('fixture transport disabled');};
const write=process.stdout.write.bind(process.stdout);
process.stdout.write=function(chunk,...args){
 const result=write(chunk,...args);
 if(process.env.HF_TEST_STOP_BEFORE_PREVIEW==='1' && String(chunk).includes('Opening studio preview')){
  write('\nFIXTURE_STOP_BEFORE_PREVIEW\n');process.exit(73);
 }
 return result;
};
