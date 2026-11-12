import test from 'node:test';
import assert from 'node:assert/strict';
import {main,preserveLimits} from '../scripts/restart-codex.mjs';

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
  await fs.mkdir(path.dirname(socket),{recursive:true});await fs.writeFile(socket,'synthetic socket');
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

const restartCommit='2a885c9155bc4885182874dc3a945963d784e5f4';
const restartURL=`https://raw.githubusercontent.com/quickstark/skills/${restartCommit}/scripts/restart-codex.mjs`;
async function copyBlock(file='README.md') {
  const text=await fs.readFile(new URL('../'+file,import.meta.url),'utf8');
  const section=text.split('<!-- quickstark-codex-restart:start -->')[1]?.split('<!-- quickstark-codex-restart:end -->')[0];
  const block=section?.match(/```bash\n([\s\S]*?)```/)?.[1];
  assert.ok(block?.includes(restartURL),'copy block must download the published script at its immutable commit');
  assert.doesNotMatch(block,/QUICKSTARK_RESTART|<<|import fs/,'no inline module or heredoc terminator');
  return block;
}

test('README and installation guide use the same short pinned download block',async()=>{
  const block=await copyBlock();assert.equal(await copyBlock('docs/install-and-update-skills.md'),block);
});

for(const shell of ['/bin/bash','/bin/zsh']) {
  for(const [label,curlExit,nodeExit] of [['success',0,0],['failed partial download',22,0],['helper failure',0,7]]) {
    test(`${shell} copy block: ${label}`,async t=>{
      try{await fs.access(shell,constants.X_OK);}catch{t.skip('shell unavailable on this test host');return;}
      const block=await copyBlock(); // Refuse old inline source before executing any artifact.
      const root=await fs.mkdtemp(path.join(os.tmpdir(),'qs-restart-copy with spaces-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
      const bin=path.join(root,'bin');await fs.mkdir(bin);
      await fs.writeFile(bin+'/curl',`#!/bin/sh
out=
for arg do
  if [ "$previous" = '--output' ]; then out="$arg"; fi
  previous="$arg"
done
[ -n "$out" ] || exit 99
printf '%s\\n' 'process.stdout.write("isolated helper ran\\n"); process.exitCode=Number(process.env.QS_FIXTURE_NODE_EXIT);' > "$out"
exit "$QS_FIXTURE_CURL_EXIT"
`,{mode:0o700});
      const env={...process.env,PATH:bin+':'+process.env.PATH,TMPDIR:root,CODEX_HOME:root+'/private-profile',QS_FIXTURE_CURL_EXIT:String(curlExit),QS_FIXTURE_NODE_EXIT:String(nodeExit)};
      let result;
      try{result=await exec(shell,[...(shell.endsWith('zsh')?['-f']:['--noprofile','--norc']),'-c',block],{cwd:root,env});result.code=0;}catch(error){result=error;}
      assert.equal(result.code,curlExit||nodeExit,result.stderr);
      if(curlExit)assert.doesNotMatch(result.stdout,/isolated helper ran/);else assert.match(result.stdout,/isolated helper ran/);
      assert.deepEqual((await fs.readdir(root)).sort(),['bin'],'temporary download must be removed on success and failure');
    });
  }
}


test('Node-raised open-file limit is restored for the launch, then reset in the helper',async t=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'qs-limit-child-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
  const moduleURL=new URL('../scripts/restart-codex.mjs',import.meta.url).href;
  const source=`import {preserveLimits} from ${JSON.stringify(moduleURL)};
import fs from 'node:fs/promises';
const before=await fs.readFile('/proc/self/limits','utf8');
const pattern=/^Max open files[ \\t]+(\\d+)[ \\t]+(\\d+)[^\\n]*$/m,row=before.match(pattern);
if(!row||BigInt(row[1])<1024n)throw Error('unsupported owned fixture limits');
const desired=before.replace(row[0],row[0].replace(row[1],'1024'));
const release=await preserveLimits(desired);
try{
const after=await fs.readFile('/proc/self/limits','utf8');if(after.match(pattern)[1]!=='1024'||after.match(pattern)[2]!==row[2]||after.replace(pattern,'')!==before.replace(pattern,''))throw Error('original launch limit was not adopted');
const {execFile}=await import('node:child_process');
const childLimits=await new Promise((resolve,reject)=>execFile('/bin/cat',['/proc/self/limits'],(error,stdout)=>error?reject(error):resolve(stdout)));
if(childLimits.match(pattern)[1]!=='1024')throw Error('replacement did not inherit the original limit');
}
finally{await release();}
if(await fs.readFile('/proc/self/limits','utf8')!==before)throw Error('helper limits were not restored');
console.log('owned child adopted and restored limits');`;
  if(process.platform!=='linux'){t.skip('Linux process-limit fixture');return;}
  const result=await exec(process.execPath,['--input-type=module','-e',source],{cwd:root});assert.match(result.stdout,/adopted and restored/);
});


test('logical control-socket symlink resolves to the owned kernel listener',async t=>{
  const f=await procFixture(t),logical=path.join(f.profile,'app-server-control/app-server-control.sock'),physical=path.join(f.root,'short-socket');
  await fs.unlink(logical);await fs.writeFile(physical,'synthetic socket');await fs.symlink(physical,logical);
  await fs.writeFile(f.proc+'/net/unix',(await fs.readFile(f.proc+'/net/unix','utf8')).replace(logical,physical));
  const target=(await f.world.legacyServers())[0],plan=await f.world.prepare(target);
  try{await f.world.revalidate(target,plan);}finally{await plan.release();}
  await fs.unlink(physical);
  assert.equal(await f.world.listenerFree(),false,'the original listening inode still owns the real path');
  await fs.writeFile(f.proc+'/net/unix','Num RefCount Protocol Flags Type St Inode Path\n');
  assert.equal(await f.world.listenerFree(),true,'cached physical path remains usable after the old socket file is removed');
  assert.deepEqual(f.effects,[]);
});

test('ordinary Codex log handles at EOF retain existing bytes on restart preparation',async t=>{
  const f=await procFixture(t),size=(await fs.stat(f.log)).size;
  for(const fd of [1,2])await fs.writeFile(`${f.proc}/40/fdinfo/${fd}`,`pos:\t${size}\nflags:\t0100001\n`);
  const target=(await f.world.legacyServers())[0],plan=await f.world.prepare(target);
  try{await f.world.revalidate(target,plan);assert.equal(await fs.readFile(f.log,'utf8'),'retained\n');}finally{await plan.release();}
  assert.deepEqual(f.effects,[]);
});

test('unreproducible hard limits refuse before running prlimit',async t=>{
  if(process.platform!=='linux'){t.skip('Linux resource metadata');return;}
  const before=await fs.readFile('/proc/self/limits','utf8'),row=before.match(/^Max open files[ \t]+(\d+)[ \t]+(\d+)[^\n]*$/m);
  const different=before.replace(row[0],`Max open files            1024                 ${BigInt(row[2])+1n}              files`);
  await assert.rejects(preserveLimits(different,{readFile:async()=>before,run:async()=>assert.fail('cannot change a hard limit')}),/differ beyond/);
});

test('denied prlimit refuses without touching a server',async t=>{
  if(process.platform!=='linux'){t.skip('Linux resource metadata');return;}
  const before=await fs.readFile('/proc/self/limits','utf8'),row=before.match(/^Max open files[ \t]+(\d+)[ \t]+(\d+)[^\n]*$/m);
  const target=before.replace(row[0],row[0].replace(row[1],'512'));let attempts=0;
  await assert.rejects(preserveLimits(target,{readFile:async()=>before,run:async()=>{attempts++;throw Error('denied');}}),/Cannot preserve/);
  assert.equal(attempts,1);
});


async function systemdFixture(t,{user=false}={}) {
  const f=await procFixture(t),uid=process.getuid(),unit='run-fixture.service';
  const group=user?`/user.slice/user-${uid}.slice/user@${uid}.service/app.slice/${unit}`:`/system.slice/${unit}`;
  const argv=['codex','-c','features.example=true','-c','features.example=true',...old.argv.slice(1)];
  const info={Id:unit,LoadState:'loaded',ActiveState:'active',SubState:'running',MainPID:user?'40':'55',ControlGroup:group,InvocationID:'a'.repeat(32),NeedDaemonReload:'no',ExecStart:'{ path=/usr/bin/sudo ; argv[]=sudo -u fixture codex ... ; pid=55 ; }',User:'',Group:'',WorkingDirectory:f.root,Environment:'SECRET=never print this',EnvironmentFiles:''};
  const state={info,definition:'[Service]\nExecStart=/fixture/saved-launch\n',pending:0,versionDelay:0,auto:true,denied:false,catCalls:0};
  const events=[];
  async function wrapper(pid) {
    await fs.mkdir(`${f.proc}/${pid}`,{recursive:true});
    await fs.writeFile(`${f.proc}/${pid}/status`,'Uid:\t0\t0\t0\t0\n');
    await fs.writeFile(`${f.proc}/${pid}/cmdline`,'/usr/bin/sudo\0-n\0-H\0-u\0fixture\0');
  }
  async function server(pid,parent) {
    if(pid!==40)await f.processEntry(pid,argv);
    await fs.writeFile(`${f.proc}/${pid}/cmdline`,argv.join('\0')+'\0');
    await fs.writeFile(`${f.proc}/${pid}/cgroup`,'0::'+group+'\n');
    await fs.writeFile(`${f.proc}/${pid}/stat`,(await fs.readFile(`${f.proc}/${pid}/stat`,'utf8')).replace(' S 1 ',` S ${parent} `));
  }
  await wrapper(55);await server(40,user?1:55);
  const world=await systemWorld(f.profile,{HOME:f.root},{proc:f.proc,
    signal:()=>assert.fail('systemd must never manually signal'),spawnProcess:()=>assert.fail('systemd must never manually launch'),
    runCommand:async(executable,args,opts)=>{
      events.push({executable,args});
      if(executable==='/usr/bin/sudo'||args.includes('try-restart')) {
        assert.ok(args.includes('try-restart'));assert.equal(args.at(-1),unit);assert.equal(args.at(-2),'--');
        assert.equal(opts.timeout,30000);
        if(!user&&uid!==0){assert.equal(executable,'/usr/bin/sudo');assert.deepEqual(args.slice(0,3),['-n','--','/usr/bin/systemctl']);}
        else assert.equal(executable,'/usr/bin/systemctl');
        if(state.denied)throw Error('SECRET=never print this');
        if(state.auto){await fs.rm(`${f.proc}/40`,{recursive:true});await wrapper(56);await server(41,user?1:56);Object.assign(info,{MainPID:user?'41':'56',InvocationID:'b'.repeat(32),ExecStart:'{ path=/usr/bin/sudo ; argv[]=sudo -u fixture codex ... ; pid=56 ; }'});}
        await state.afterRestart?.();return {stdout:''};
      }
      if(executable==='/usr/bin/systemctl') {
        assert.equal(args.includes('--user'),user);assert.equal(args.at(-1),unit);
        if(args.includes('show')) {
          const snapshot={...info};
          if(events.some(e=>e.args.includes('try-restart'))&&state.pending-->0)Object.assign(snapshot,{ActiveState:'activating',SubState:'start',MainPID:'0',ControlGroup:'',InvocationID:''});
          return {stdout:Object.entries(snapshot).map(([k,v])=>`${k}=${v}`).join('\n')+'\n'};
        }
        assert.ok(args.includes('cat'));state.catCalls++;
        if(state.changeDefinition&&state.catCalls>1)return {stdout:'changed unit definition'};
        return {stdout:state.definition};
      }
      assert.deepEqual(args,['app-server','daemon','version']);
      assert.equal(opts.env.CODEX_HOME,f.profile);
      if(events.some(e=>e.args.includes('try-restart'))&&state.versionDelay-->0)throw Error('socket missing during startup');
      return {stdout:JSON.stringify({status:'running',socketPath:path.join(f.profile,'app-server-control/app-server-control.sock'),appServerVersion:'fixture-alpha'})};
    },
  });
  let time=0;world.now=()=>time;world.sleep=async ms=>{time+=ms;};world.readyTimeout=1200;world.platform='linux';
  return {...f,world,events,state,info,argv,server,unit,group};
}

test('system service uses its saved sudo launcher and waits through socket startup',async t=>{
  const f=await systemdFixture(t);f.state.pending=1;f.state.versionDelay=1;
  const result=await run(f);assert.equal(result.code,0,result.text);
  assert.equal(f.events.filter(e=>e.args.includes('try-restart')).length,1);
  assert.ok(f.events.filter(e=>e.args.includes('version')).length>=3);
  assert.doesNotMatch(result.text,/never print this/);
  assert.deepEqual((await f.world.inspect(41)).argv,f.argv,'all repeated configuration flags remain intact');
});
test('systemd user service restarts through the owning user manager without sudo',async t=>{
  const f=await systemdFixture(t,{user:true});assert.equal((await run(f)).code,0);
  const restart=f.events.find(e=>e.args.includes('try-restart'));assert.equal(restart.executable,'/usr/bin/systemctl');assert.ok(restart.args.includes('--user'));
});
test('systemd --check verifies service and socket without sudo or restart',async t=>{
  const f=await systemdFixture(t),result=await run(f,['--check']);assert.equal(result.code,0,result.text);assert.match(result.text,/systemd system service/);
  assert.equal(f.events.filter(e=>e.args.includes('try-restart')||e.executable==='/usr/bin/sudo').length,0);
});
for(const [name,alter] of [
  ['unrelated main process',async f=>{f.info.MainPID='99';}],
  ['shell rather than sudo wrapper',async f=>fs.writeFile(f.proc+'/55/cmdline','/bin/sh\0-c\0some work\0')],
  ['changed loaded configuration',async f=>{f.state.changeDefinition=true;}],
  ['pending daemon reload',async f=>{f.info.NeedDaemonReload='yes';}],
  ['wrong service cgroup',async f=>{f.info.ControlGroup='/system.slice/other.service';}],
  ['multiple matching servers',async f=>{await f.server(41,55);} ],
])test(`systemd refuses ${name} before any restart`,async t=>{
  const f=await systemdFixture(t);await alter(f);assert.notEqual((await run(f)).code,0);assert.ok(!f.events.some(e=>e.args.includes('try-restart')));
});
test('systemd permission failure is actionable and never retries or falls back',async t=>{
  const f=await systemdFixture(t);f.state.denied=true;const result=await run(f);
  assert.notEqual(result.code,0);assert.match(result.text,/sudo -v/);assert.doesNotMatch(result.text,/never print this/);assert.equal(f.events.filter(e=>e.args.includes('try-restart')).length,1);assert.ok(await f.world.inspect(40));
});
for(const [name,alter] of [
  ['no new service invocation',async f=>{f.state.auto=false;}],
  ['socket never ready',async f=>{f.state.versionDelay=100;}],
  ['replacement does not own socket',async f=>{f.state.afterRestart=()=>fs.unlink(f.proc+'/41/fd/3');}],
  ['replacement has another profile',async f=>{await fs.mkdir(f.root+'/other');f.state.afterRestart=()=>fs.writeFile(f.proc+'/41/environ',`HOME=${f.root}\0CODEX_HOME=${f.root}/other\0`);} ],
])test(`systemd ${name} cannot report success or trigger a second restart`,async t=>{
  const f=await systemdFixture(t);await alter(f);const result=await run(f);assert.notEqual(result.code,0);assert.doesNotMatch(result.text,/Codex restarted and responding/);assert.equal(f.events.filter(e=>e.args.includes('try-restart')).length,1);
});
test('macOS managed restart waits through a temporary missing socket',async()=>{
  let calls=0;const f=fixture({platform:'darwin',version:async()=>{
    calls++;if(calls===2)throw Error('socket not yet ready');
    return {status:'running',backend:'pid',socketPath:home+'/app-server-control/app-server-control.sock',appServerVersion:'fixture'};
  }});
  const result=await run(f);assert.equal(result.code,0,result.text);assert.equal(calls,3);assert.deepEqual(f.events,['lock','native','unlock']);
});

test('systemd changing configuration during restart cannot report success',async t=>{
  const f=await systemdFixture(t);f.state.afterRestart=async()=>{f.state.definition='different launch configuration';};
  const result=await run(f);assert.notEqual(result.code,0);assert.match(result.text,/configuration changed/);assert.equal(f.events.filter(e=>e.args.includes('try-restart')).length,1);
});
test('managed restart never accepts another profile or launches a fallback',async()=>{
  let calls=0;const f=fixture({version:async()=>({status:'running',backend:'pid',socketPath:++calls===1?home+'/app-server-control/app-server-control.sock':'/other/app-server-control/app-server-control.sock',appServerVersion:'fixture'})});
  const result=await run(f);assert.notEqual(result.code,0);assert.match(result.text,/readiness timed out/);assert.deepEqual(f.events,['lock','native','unlock']);
});
