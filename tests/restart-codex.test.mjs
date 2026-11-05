import test from 'node:test';
import assert from 'node:assert/strict';
import {main} from '../scripts/restart-codex.mjs';

const home='/profiles/test';
const old={pid:40,start:'old',home,exe:'/original/codex',argv:['codex','-c','features.code_mode_host=true','app-server','--listen','unix://'],env:{HOME:'/users/test',SECRET:'private'},cwd:'/work with spaces'};
function fixture(overrides={}) {
  const events=[]; let current=old,time=0;
  const world={
    home,platform:'linux',
    version:async()=>({status:'running',backend:'pid',socketPath:home+'/app-server-control/app-server-control.sock',appServerVersion:'0.162.1'}),
    lock:async()=>{events.push('lock');return async()=>events.push('unlock');},
    nativeRestart:async()=>events.push('native'),
    legacyServers:async()=>[current],
    prepare:async target=>{events.push('prepare');return {target,release:async()=>events.push('release')};},
    revalidate:async()=>events.push('revalidate'),
    stop:async()=>{events.push('stop');current=null;},
    inspect:async pid=>current?.pid===pid?current:null,
    listenerFree:async()=>true,
    launch:async plan=>{assert.deepEqual(plan.target,old);events.push('launch');current={...old,pid:41,start:'new'};return {...current};},
    ownsListener:async()=>true,now:()=>time,sleep:async ms=>{time+=ms;},stopTimeout:300,readyTimeout:600,
    ...overrides,
  };
  return {world,events,set:value=>{current=value;}};
}
async function run(f,args=[]) {
  const output=[];
  const code=await main(args,{world:f.world,output:value=>output.push(value)});
  return {code,text:output.join('\n')};
}
const unmanaged=async()=>({status:'running',socketPath:home+'/app-server-control/app-server-control.sock',appServerVersion:'0.162.1'});

test('native managed restart delegates without manual discovery',async()=>{
  const f=fixture({legacyServers:()=>assert.fail('manual fallback')});
  assert.equal((await run(f)).code,0);assert.deepEqual(f.events,['lock','native','unlock']);
});
test('native failure never falls back or discloses command output',async()=>{
  const f=fixture({nativeRestart:async()=>{throw Error('SECRET=private');}});
  const result=await run(f);assert.notEqual(result.code,0);assert.doesNotMatch(result.text,/private/);assert.deepEqual(f.events,['lock','unlock']);
});
test('check does not restart or lock',async()=>{
  const f=fixture();const result=await run(f,['--check']);assert.equal(result.code,0);assert.match(result.text,/No restart/);assert.deepEqual(f.events,[]);
});
test('known unmanaged launch preserves captured plan and launches once',async()=>{
  const f=fixture({version:unmanaged});const result=await run(f);
  assert.equal(result.code,0,result.text);assert.deepEqual(f.events,['lock','prepare','revalidate','stop','launch','release','unlock']);
});
for(const candidates of [[],[old,{...old,pid:50}]])test(`ambiguous candidate count ${candidates.length} refuses`,async()=>{
  const f=fixture({version:unmanaged,legacyServers:async()=>candidates});assert.notEqual((await run(f)).code,0);assert.ok(!f.events.includes('stop'));
});
test('failed native discovery never triggers manual fallback',async()=>{
  const f=fixture({version:async()=>{throw Error();},legacyServers:()=>assert.fail('manual fallback')});assert.notEqual((await run(f)).code,0);assert.ok(!f.events.includes('stop'));
});
for(const [name,override] of [
  ['changed identity',{revalidate:async()=>{throw Error();}}],
  ['stop timeout',{stop:async()=>{}}],
  ['occupied listener',{listenerFree:async()=>false}],
])test(`${name} prevents launch`,async()=>{
  const f=fixture({version:unmanaged,...override});assert.notEqual((await run(f)).code,0);assert.ok(!f.events.includes('launch'));
});
for(const [name,override] of [
  ['wrong endpoint',{version:async()=>({status:'running',socketPath:'/wrong',backend:'pid',appServerVersion:'x'})}],
  ['not running',{version:async()=>({status:'stopped',socketPath:home+'/app-server-control/app-server-control.sock',backend:'pid',appServerVersion:'x'})}],
  ['unknown backend',{version:async()=>({status:'running',socketPath:home+'/app-server-control/app-server-control.sock',backend:'unknown',appServerVersion:'x'})}],
])test(`${name} refuses before action`,async()=>{
  const f=fixture(override);assert.notEqual((await run(f)).code,0);assert.deepEqual(f.events,['lock','unlock']);
});
test('replacement must retain identity and own listening socket',async()=>{
  const f=fixture({version:unmanaged,ownsListener:async()=>false});assert.notEqual((await run(f)).code,0);assert.equal(f.events.filter(x=>x==='launch').length,1);
  const reused=fixture({version:unmanaged});reused.world.launch=async()=>{reused.set({...old,pid:41,start:'reused'});return {...old,pid:41,start:'new'};};assert.notEqual((await run(reused)).code,0);
});
test('unsupported unmanaged macOS launch stops with useful instruction',async()=>{
  const f=fixture({version:unmanaged,platform:'darwin'});const result=await run(f);assert.notEqual(result.code,0);assert.match(result.text,/original launcher|quit and reopen/i);assert.ok(!f.events.includes('stop'));
});
test('CLI help requires no discovery; unsupported PID override refuses',async()=>{
  const f=fixture({version:()=>assert.fail('discovery')});assert.equal((await run(f,['--help'])).code,0);assert.notEqual((await run(f,['--pid','40'])).code,0);
});

import fs from 'node:fs/promises';
import {constants} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import {spawn,execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {systemWorld,options} from '../scripts/restart-codex.mjs';
const exec=promisify(execFile);

test('explicit profile overrides environment and default',()=>{
  assert.equal(options(['--codex-home','/explicit'],{CODEX_HOME:'/inherited',HOME:'/default'}).home,'/explicit');
  assert.equal(options([],{CODEX_HOME:'/inherited',HOME:'/default'}).home,'/inherited');
  assert.equal(options([],{HOME:'/default'}).home,'/default/.codex');
});

async function procFixture(t) {
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'qs-restart-proc-'));
  t.after(()=>fs.rm(root,{recursive:true,force:true}));
  const profile=path.join(root,'profile with spaces'),proc=path.join(root,'proc'),pid=40;
  await fs.mkdir(profile,{recursive:true});await fs.mkdir(proc+'/self',{recursive:true});await fs.mkdir(proc+'/net');
  const uid=process.getuid(),s=`Uid:\t${uid}\t${uid}\t${uid}\t${uid}\nGid:\t1\t1\t1\t1\nGroups:\t1\nNoNewPrivs:\t0\nSeccomp:\t0\nCapEff:\t0\nUmask:\t0027\n`;
  await fs.writeFile(proc+'/self/status',s);await fs.writeFile(proc+'/self/limits','fixture limits');
  const exe=path.join(root,'codex');await fs.writeFile(exe,'fixture executable');
  const log=path.join(root,'server log');await fs.writeFile(log,'retained\n');
  const socket=path.join(profile,'app-server-control/app-server-control.sock');
  await fs.writeFile(proc+'/net/unix',`Num RefCount Protocol Flags Type St Inode Path\nx: 2 0 00010000 0001 01 123 ${socket}\n`);
  async function processEntry(number,args=old.argv,env={HOME:root,CODEX_HOME:profile,SECRET:'never print this'},start='700') {
    const dir=`${proc}/${number}`;await fs.mkdir(dir+'/fd',{recursive:true});await fs.mkdir(dir+'/fdinfo');
    await fs.writeFile(dir+'/status',s);await fs.writeFile(dir+'/limits','fixture limits');
    await fs.writeFile(dir+'/cgroup',`0::/user.slice/user-${uid}.slice/session-6.scope\n`);
    await fs.writeFile(dir+'/cmdline',args.join('\0')+'\0');
    await fs.writeFile(dir+'/environ',Object.entries(env).map(([k,v])=>k+'='+v).join('\0')+'\0');
    await fs.writeFile(dir+'/stat',`${number} (codex (fixture)) S 1 ${Array(17).fill('0').join(' ')} ${start} 0 0\n`);
    await fs.symlink(exe,dir+'/exe');await fs.symlink(root,dir+'/cwd');
    for(const [fd,name] of [[0,'/dev/null'],[1,log],[2,log],[3,'socket:[123]']]) {
      await fs.symlink(name,dir+'/fd/'+fd);await fs.writeFile(dir+'/fdinfo/'+fd,'flags:\t02002001\n');
    }
  }
  await processEntry(pid);
  const commands=[],effects=[];
  const world=await systemWorld(profile,{HOME:root,CODEX_HOME:'/wrong'}, {
    proc,
    runCommand:async(executable,args,opts)=>{commands.push({executable,args,opts});return {stdout:JSON.stringify({status:'running',appServerVersion:'fixture',socketPath:socket})};},
    signal:(...args)=>effects.push(args),
    spawnProcess:()=>assert.fail('unexpected launch'),
  });
  world.platform='linux'; // Recorded Linux observations run on either test host.
  return {root,proc,profile,pid,world,commands,effects,processEntry,log};
}

test('Linux observations exclude proxies, stdio and other profiles; preserve exact context',async t=>{
  const f=await procFixture(t);
  await f.processEntry(41,['codex','app-server','proxy']);
  await f.processEntry(42,['codex','app-server']);
  await fs.mkdir(f.root+'/other');await f.processEntry(43,old.argv,{HOME:f.root,CODEX_HOME:f.root+'/other'});
  const servers=await f.world.legacyServers();assert.equal(servers.length,1);
  const target=servers[0];assert.equal(target.start,'700');assert.equal(target.env.SECRET,'never print this');
  const plan=await f.world.prepare(target);await f.world.revalidate(target);await plan.release();
  const result=await run({world:f.world},['--check']);assert.equal(result.code,0,result.text);assert.doesNotMatch(result.text,/never print/);assert.deepEqual(f.effects,[]);
  assert.equal(f.commands[0].opts.env.CODEX_HOME,f.profile);
  assert.equal(await fs.readFile(f.log,'utf8'),'retained\n');
});
for(const [name,alter] of [
  ['system service',f=>fs.writeFile(`${f.proc}/40/cgroup`,'0::/system.slice/codex.service\n')],
  ['foreground process',async f=>fs.writeFile(`${f.proc}/40/stat`,(await fs.readFile(`${f.proc}/40/stat`,'utf8')).replace(' S 1 ',' S 99 '))],
  ['nonappend log',f=>fs.writeFile(`${f.proc}/40/fdinfo/1`,'flags:\t02000001\n')],
  ['inherited descriptor',f=>fs.writeFile(`${f.proc}/40/fdinfo/3`,'flags:\t02\n')],
  ['changed limits',f=>fs.writeFile(`${f.proc}/40/limits`,'different limits')],
  ['changed credentials',async f=>fs.writeFile(`${f.proc}/40/status`,(await fs.readFile(`${f.proc}/40/status`,'utf8')).replace('Seccomp:\t0','Seccomp:\t2'))],
])test(`unsupported ${name} refuses without signals`,async t=>{
  const f=await procFixture(t);await alter(f);const result=await run({world:f.world});assert.notEqual(result.code,0);assert.deepEqual(f.effects,[]);
});
test('changed Linux start identity and concurrent helper stop before signals',async t=>{
  const f=await procFixture(t),target=(await f.world.legacyServers())[0];
  await fs.writeFile(`${f.proc}/40/stat`,(await fs.readFile(`${f.proc}/40/stat`,'utf8')).replace('700','701'));
  await assert.rejects(f.world.revalidate(target),/identity/);
  const unlock=await f.world.lock();try{await assert.rejects(f.world.lock(),/Another helper/);}finally{await unlock();}
  assert.deepEqual(f.effects,[]);
});
test('real owned process and Unix socket restart once, preserving launch values',async t=>{
  const root=await fs.mkdtemp('/tmp/qs-restart-owned-');t.after(()=>fs.rm(root,{recursive:true,force:true}));
  const home=root,socket=path.join(root,'app-server-control/app-server-control.sock');await fs.mkdir(path.dirname(socket));
  const script=path.join(root,'fixture.cjs');await fs.writeFile(script,`const net=require('node:net'),fs=require('node:fs');try{fs.unlinkSync(process.env.FIXTURE_SOCKET);}catch(e){if(e.code!=='ENOENT')throw e;}net.createServer(c=>c.end('fixture-ready')).listen(process.env.FIXTURE_SOCKET);`);
  const log=await fs.open(path.join(root,'append.log'),constants.O_WRONLY|constants.O_CREAT|constants.O_APPEND,0o600);t.after(()=>log.close());
  const children=[];
  const launch=async()=>{
    const child=spawn(process.execPath,[script],{cwd:root,env:{HOME:root,FIXTURE_SOCKET:socket,FIXTURE_SECRET:'retained'},stdio:['ignore',log.fd,log.fd]});
    children.push(child);await new Promise((resolve,reject)=>{child.once('spawn',resolve);child.once('error',reject);});return child;
  };
  t.after(async()=>{for(const child of children){if(child.exitCode===null&&child.signalCode===null){child.kill('SIGTERM');await new Promise(resolve=>child.once('exit',resolve));}}});
  const query=()=>new Promise((resolve,reject)=>{
    const client=net.connect(socket);client.setTimeout(300,()=>client.destroy(Error('timeout')));client.on('error',reject);client.on('data',data=>{client.destroy();data.toString()==='fixture-ready'?resolve({status:'running',appServerVersion:'fixture',socketPath:socket}):reject(Error('wrong endpoint'));});
  });
  const until=async callback=>{for(let i=0;i<100;i++){try{return await callback();}catch{await new Promise(resolve=>setTimeout(resolve,20));}}throw Error('fixture timeout');};
  let current=await launch();await until(query);let launches=0;
  const identity=child=>({pid:child.pid,start:String(child.pid),exe:process.execPath,home,env:{HOME:root,FIXTURE_SOCKET:socket,FIXTURE_SECRET:'retained'},cwd:root,argv:[process.execPath,script]});
  const target=identity(current),f=fixture({home,version:query,legacyServers:async()=>[target],
    prepare:async p=>({target:p,release:async()=>{}}),revalidate:async p=>assert.equal(p.pid,current.pid),
    inspect:async pid=>current?.pid===pid&&current.exitCode===null&&current.signalCode===null?identity(current):null,
    stop:async()=>{current.kill('SIGTERM');await new Promise(resolve=>current.once('exit',resolve));},
    listenerFree:async()=>true,
    launch:async plan=>{assert.deepEqual(plan.target,target);launches++;current=await launch();return identity(current);},
    ownsListener:async()=>true,now:Date.now,sleep:ms=>new Promise(resolve=>setTimeout(resolve,ms)),stopTimeout:2000,readyTimeout:3000,
  });
  const result=await run(f);assert.equal(result.code,0,result.text);assert.equal(launches,1);assert.notEqual(current.pid,target.pid);
});

test('real CLI --help and pasted source run from another directory without discovery',async()=>{
  const source=await fs.readFile(new URL('../scripts/restart-codex.mjs',import.meta.url),'utf8');
  const modulePath=new URL('../scripts/restart-codex.mjs',import.meta.url).pathname;
  const result=await exec(process.execPath,[modulePath,'--help'],{cwd:os.tmpdir()});assert.match(result.stdout,/Restart Codex/);
  const pasted=spawn(process.execPath,['--input-type=module','-','--help'],{cwd:os.tmpdir(),stdio:['pipe','pipe','pipe']});
  let out='';pasted.stdout.on('data',data=>out+=data);pasted.stdin.end(source);
  assert.equal(await new Promise(resolve=>pasted.once('exit',resolve)),0);assert.match(out,/Restart Codex/);
});

test('ordinary Linux runtime counters may change without invalidating launch context',async t=>{
  const f=await procFixture(t);await fs.appendFile(`${f.proc}/40/status`,'voluntary_ctxt_switches:\t100\n');
  const target=(await f.world.legacyServers())[0],plan=await f.world.prepare(target);
  try {
    await fs.writeFile(`${f.proc}/40/status`,(await fs.readFile(`${f.proc}/40/status`,'utf8')).replace('voluntary_ctxt_switches:\t100','voluntary_ctxt_switches:\t101'));
    await f.world.revalidate(target,plan);
  } finally {await plan.release();}
});
test('cleanup failures are redacted and return nonzero',async()=>{
  const f=fixture({lock:async()=>async()=>{throw Error('private token');}});const result=await run(f);assert.notEqual(result.code,0);assert.doesNotMatch(result.text,/private token/);
});

test('README and installation guide embed the exact executable source',async()=>{
  const source=await fs.readFile(new URL('../scripts/restart-codex.mjs',import.meta.url),'utf8');
  for(const file of ['README.md','docs/install-and-update-skills.md']) {
    const text=await fs.readFile(new URL('../'+file,import.meta.url),'utf8');
    const embedded=text.match(/node --input-type=module - <<'QUICKSTARK_RESTART'\n([\s\S]*?)QUICKSTARK_RESTART\n```/);
    assert.equal(embedded?.[1],source,file+' copy block must match standalone source');
  }
});
