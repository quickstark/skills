#!/usr/bin/env node
// Standalone module: documentation embeds this file verbatim.
import fs from 'node:fs/promises';
import {constants} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {execFile,spawn} from 'node:child_process';
import {promisify} from 'node:util';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

const exec=promisify(execFile),sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
class Refusal extends Error {}
const stop=message=>{throw new Refusal(message);};
const same=(a,b)=>Boolean(a&&b&&a.pid===b.pid&&a.start===b.start&&a.exe===b.exe);
const socketFor=home=>path.join(home,'app-server-control','app-server-control.sock');
const help=`Restart Codex on its server host, as its existing account.
Usage: node restart-codex.mjs [--check] [--codex-home PATH]
Supports Codex-managed daemons on Linux/macOS and the known detached Linux
launch: codex -c features.code_mode_host=true app-server --listen unix://
--check inspects without restarting. --help shows this help.
Finish active work first. Uncertain targets stop without a restart.`;

export function options(args,env=process.env) {
  const result={home:env.CODEX_HOME||path.join(env.HOME||os.homedir(),'.codex')};
  const seen=new Set();
  for(let i=0;i<args.length;i++) {
    const arg=args[i];if(seen.has(arg))stop('Duplicate option. Use --help.');seen.add(arg);
    if(arg==='--help')result.help=true;
    else if(arg==='--check')result.check=true;
    else if(arg==='--codex-home'&&args[i+1]&&!args[i+1].startsWith('--'))result.home=args[++i];
    else stop('Unknown or incomplete option. Use --help.');
  }
  result.home=path.resolve(result.home);return result;
}
function ready(version,home) {
  return version?.status==='running'&&version.socketPath===socketFor(home)&&typeof version.appServerVersion==='string'&&version.appServerVersion.length>0;
}
export async function main(args=process.argv.slice(2),{world,output=console.log,environment=process.env}={}) {
  let unlock,plan,changed=false;
  try {
    const opts=options(args,environment);if(opts.help){output(help);return 0;}
    world??=await systemWorld(opts.home,environment);
    if(!opts.check)unlock=await world.lock();
    const version=await world.version();
    if(!ready(version,world.home))stop('Codex did not respond on the selected profile socket. No restart attempted.');
    if(version.backend==='pid') {
      if(opts.check){output('Codex-managed server found. No restart performed.');return 0;}
      changed=true;await world.nativeRestart();
      const after=await world.version();
      if(!ready(after,world.home)||after.backend!=='pid')stop('Native restart returned, but Codex readiness was not verified.');
    } else {
      if(version.backend!==undefined)stop('Unknown Codex manager. Use the original launcher; no restart attempted.');
      if(world.platform!=='linux')stop('This server uses an external launcher. Use that original launcher, or quit and reopen its owning app. No restart attempted.');
      const candidates=await world.legacyServers();
      if(candidates.length!==1)stop('Expected exactly one supported background server. No restart attempted.');
      const target=candidates[0];plan=await world.prepare(target);
      await world.revalidate(target,plan);
      if(opts.check){output(`Background server PID ${target.pid}; launch context verified. No restart performed.`);return 0;}
      changed=true;await world.stop(target);
      const deadline=world.now()+world.stopTimeout;
      while(same(target,await world.inspect(target.pid))) {
        if(world.now()>=deadline)stop('Stop timed out; no replacement launched.');
        await world.sleep(100);
      }
      if(!await world.listenerFree())stop('Socket remains occupied; no replacement launched.');
      const replacement=await world.launch(plan),until=world.now()+world.readyTimeout;
      let verified=false;
      while(world.now()<until) {
        if(!same(replacement,await world.inspect(replacement.pid)))stop('Replacement exited or changed identity; readiness unverified.');
        try {
          if(ready(await world.version(replacement),world.home)&&await world.ownsListener(replacement.pid)) {
            if(!same(replacement,await world.inspect(replacement.pid)))stop('Replacement identity changed.');
            verified=true;break;
          }
        } catch(error) {if(error instanceof Refusal)throw error;}
        await world.sleep(200);
      }
      if(!verified)stop('Replacement started, but Codex readiness timed out.');
    }
    output('Codex restarted and responding. Reconnect your client and open a fresh chat.');return 0;
  } catch(error) {
    output(error instanceof Refusal?error.message:changed?'Restart failed; current state is unverified. No second launch attempted.':'Cannot verify the restart context. No restart attempted. Run with --check or use the original launcher.');
    return changed?4:2;
  } finally {
    let failed=false;try{await plan?.release();}catch{failed=true;}try{await unlock?.();}catch{failed=true;}
    if(failed){output('Restart helper cleanup failed; inspect the current state before retrying.');return 4;}
  }
}

// OS observations are injectable for isolated fixtures; the CLI always uses real OS data.
export async function systemWorld(selectedHome,environment=process.env,{proc='/proc',runCommand=exec,signal=process.kill.bind(process),spawnProcess=spawn}={}) {
  const home=await fs.realpath(selectedHome),uid=process.getuid?.();
  const read=async(file,limit=1048576)=>{
    const h=await fs.open(file,constants.O_RDONLY|constants.O_NOFOLLOW);
    try {
      const data=Buffer.alloc(limit+1);let n=0;
      while(n<=limit){const r=await h.read(data,n,data.length-n,null);if(!r.bytesRead)break;n+=r.bytesRead;}
      if(n>limit)stop('Process metadata exceeds the inspection limit.');
      return new TextDecoder('utf-8',{fatal:true}).decode(data.subarray(0,n));
    } finally {await h.close();}
  };
  const status=text=>Object.fromEntries(text.trim().split('\n').map(line=>{const i=line.indexOf(':');return [line.slice(0,i),line.slice(i+1).trim()];}));
  const command=(exe,args,context={})=>runCommand(exe,args,{env:{...environment,CODEX_HOME:home},timeout:5000,maxBuffer:1048576,...context});
  const version=async target=>JSON.parse((await command(target?.exe||'codex',['app-server','daemon','version'],target?{env:{...target.env,CODEX_HOME:home},cwd:target.cwd}:{})).stdout);
  const listeners=async()=>{
    const rows=(await read(proc+'/net/unix')).split('\n').slice(1).filter(Boolean);
    return rows.map(row=>row.trim().match(/^\S+\s+\S+\s+\S+\s+(\S+)\s+(\S+)\s+\S+\s+(\d+)(?:\s+(.*))?$/)).filter(m=>m&&(parseInt(m[1],16)&0x10000)&&m[2]==='0001'&&m[4]===socketFor(home)).map(m=>m[3]);
  };
  const ownsListener=async pid=>{
    const inodes=new Set(await listeners());
    for(const fd of await fs.readdir(`${proc}/${pid}/fd`)) {
      try {const m=(await fs.readlink(`${proc}/${pid}/fd/${fd}`)).match(/^socket:\[(\d+)\]$/);if(m&&inodes.has(m[1]))return true;}
      catch(error){if(error.code!=='ENOENT')throw error;}
    }
    return false;
  };
  const inspect=async pid=>{
    try {
      const root=`${proc}/${pid}`,s=status(await read(root+'/status',16384));
      if(!s.Uid||s.Uid.split(/\s+/).some(value=>Number(value)!==uid))return null;
      const argv=(await read(root+'/cmdline',65536)).split('\0');if(argv.at(-1)==='')argv.pop();
      if(path.basename(argv[0]||'')!=='codex'||JSON.stringify(argv.slice(1))!==JSON.stringify(['-c','features.code_mode_host=true','app-server','--listen','unix://']))return null;
      const text=await read(root+'/stat',16384),fields=text.slice(text.lastIndexOf(')')+2).trim().split(/\s+/);
      if(!/^\d+$/.test(fields[19]||'')||fields[0]==='Z')return null;
      const env={};for(const entry of (await read(root+'/environ')).split('\0').filter(Boolean)) {
        const i=entry.indexOf('=');if(i<1||Object.hasOwn(env,entry.slice(0,i)))stop('Unsupported process environment.');env[entry.slice(0,i)]=entry.slice(i+1);
      }
      const cwd=await fs.realpath(root+'/cwd');if(!env.HOME)return null;
      if(await fs.realpath(path.resolve(cwd,env.CODEX_HOME||path.join(env.HOME,'.codex')))!==home)return null;
      const exe=await fs.realpath(root+'/exe');if(path.basename(exe)!=='codex')return null;
      return {pid,start:fields[19],ppid:Number(fields[1]),exe,argv,env,cwd,home,status:Object.fromEntries(['Uid','Gid','Groups','NoNewPrivs','Seccomp','CapEff','Umask'].map(key=>[key,s[key]]))};
    } catch(error){if(['ENOENT','ESRCH'].includes(error.code))return null;throw error;}
  };
  const prepare=async target=>{
    const root=`${proc}/${target.pid}`,own=status(await read(proc+'/self/status',16384));
    if(target.ppid!==1||!(await read(root+'/cgroup',16384)).trim().split('\n').some(line=>/^0::\/user\.slice\/user-\d+\.slice\/session-[\w-]+\.scope$/.test(line)))stop('Use the original launcher for this supervised or foreground server.');
    for(const key of ['Uid','Gid','Groups','NoNewPrivs','Seccomp','CapEff'])if(target.status[key]!==own[key])stop('Server credentials or sandbox cannot be preserved.');
    if(await read(root+'/limits',16384)!==await read(proc+'/self/limits',16384))stop('Server resource limits cannot be preserved.');
    if(!/^[0-7]{3,4}$/.test(target.status.Umask||''))stop('Server umask cannot be preserved.');
    for(const fd of await fs.readdir(root+'/fd'))if(Number(fd)>2) {
      const flags=(await read(root+'/fdinfo/'+fd,16384)).match(/^flags:\s*([0-7]+)$/m);
      if(!flags||(parseInt(flags[1],8)&0o2000000)===0)stop('Server has an unsupported inherited file descriptor.');
    }
    if(await fs.readlink(root+'/fd/0')!=='/dev/null'||!await ownsListener(target.pid))stop('Server stdin or socket ownership is unsupported.');
    const logs=[];
    try {
      for(const fd of [1,2]) {
        const name=await fs.readlink(root+'/fd/'+fd),original=await fs.stat(root+'/fd/'+fd);
        const flags=(await read(root+'/fdinfo/'+fd,16384)).match(/^flags:\s*([0-7]+)$/m);
        if(!path.isAbsolute(name)||!original.isFile()||original.uid!==uid||!flags||(parseInt(flags[1],8)&constants.O_APPEND)===0)stop('Server output must use owned append log files.');
        const h=await fs.open(name,constants.O_WRONLY|constants.O_APPEND|constants.O_NOFOLLOW);logs.push(h);
        const opened=await h.stat();if(opened.dev!==original.dev||opened.ino!==original.ino)stop('Server log changed during inspection.');
      }
      return {target,logs,release:async()=>{await Promise.all(logs.map(h=>h.close()));}};
    } catch(error){await Promise.all(logs.map(h=>h.close()));throw error;}
  };
  return {
    home,platform:process.platform,version,inspect,prepare,ownsListener,sleep,now:Date.now,stopTimeout:10000,readyTimeout:30000,
    nativeRestart:()=>command('codex',['app-server','daemon','restart'],{timeout:30000}),
    legacyServers:async()=>{
      const names=(await fs.readdir(proc)).filter(name=>/^\d+$/.test(name));if(names.length>16384)stop('Too many processes to inspect safely.');
      const result=[];for(const name of names){const p=await inspect(Number(name));if(p)result.push(p);}return result;
    },
    revalidate:async (target,plan)=>{
      const current=await inspect(target.pid);
      if(!same(target,current)||JSON.stringify(current)!==JSON.stringify(target)||!await ownsListener(target.pid))stop('Server identity or launch context changed; no restart attempted.');
      const fresh=await prepare(current);
      try {if(plan)for(let i=0;i<2;i++){const a=await plan.logs[i].stat(),b=await fresh.logs[i].stat();if(a.dev!==b.dev||a.ino!==b.ino)stop('Server log changed; no restart attempted.');}}finally{await fresh.release();}
    },
    listenerFree:async()=>!(await listeners()).length,
    stop:async target=>signal(target.pid,'SIGTERM'),
    launch:async plan=>{
      const target=plan.target,mask=process.umask(parseInt(target.status.Umask,8));let child;
      try {child=spawnProcess(target.exe,target.argv.slice(1),{argv0:target.argv[0],cwd:target.cwd,env:target.env,detached:true,stdio:['ignore',...plan.logs.map(h=>h.fd)]});}
      finally {process.umask(mask);}
      await new Promise((resolve,reject)=>{child.once('spawn',resolve);child.once('error',reject);});child.unref();
      const result=await inspect(child.pid);if(!result)stop('Replacement exited before its identity could be verified.');return result;
    },
    lock:async()=>{
      const dir=path.join(os.tmpdir(),`quickstark-codex-restart-${uid}-${createHash('sha256').update(home).digest('hex').slice(0,24)}`);
      try {await fs.mkdir(dir,{mode:0o700});}catch(error){if(error.code==='EEXIST')stop(`Another helper or retained lock exists: ${dir}. No restart attempted.`);throw error;}
      const original=await fs.lstat(dir);
      return async()=>{const current=await fs.lstat(dir);if(current.ino===original.ino&&current.dev===original.dev)await fs.rmdir(dir);};
    },
  };
}
const invoked=process.argv[1]&&process.argv[1]!=='-'&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(invoked||process.argv[1]==='-')process.exitCode=await main();
