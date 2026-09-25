import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, cpSync, readFileSync, writeFileSync, rmSync, mkdirSync, readdirSync, renameSync, symlinkSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { VIDEO_MODULE_NAMES } from '../scripts/video-skill-catalog.mjs';
import { TARGET_PUBLIC_COMMANDS_BY_NAME } from '../scripts/skill-collection-registry.mjs';
import { renderSkillOutputContract, SKILL_OUTPUT_HEADING } from '../scripts/sync-skill-output-contracts.mjs';
import { verifyClosure } from '../skills/video/qs-video/scripts/verify-closure.mjs';
import { scaffold } from '../skills/video/qs-video/scripts/scaffold.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../skills/video/qs-video');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const fixture=fn=>{const dir=mkdtempSync(join(tmpdir(),'qs-video-test-'));try{return fn(dir);}finally{rmSync(dir,{recursive:true,force:true});}};

test('catalog and provenance cover 21 private modules with complete hashed resources',()=>{
 const result=verifyClosure(root), index=JSON.parse(readFileSync(join(root,'references/dependency-index.json')));
 assert.equal(result.modules,21);assert.equal(result.privateFiles,911);assert.equal(result.sourceFiles,912);
 assert.deepEqual(index.modules.map(x=>x.id),[...VIDEO_MODULE_NAMES]);
 assert(index.files.some(x=>x.sourceSha256!==x.derivedSha256 && x.destinationPath));
 assert.equal(index.files.filter(x=>x.destinationPath===null).length,1);
 assert.match(readFileSync(join(root,'LICENSE'),'utf8'),/Apache License/);
 assert.match(readFileSync(join(root,'agents/openai.yaml'),'utf8'),/\$qs-video:qs-video/);
 const tail=readFileSync(join(root,'SKILL.md'),'utf8').split(SKILL_OUTPUT_HEADING)[1];
 assert.equal(SKILL_OUTPUT_HEADING+tail,renderSkillOutputContract(TARGET_PUBLIC_COMMANDS_BY_NAME.get('qs-video'),{commandsByName:TARGET_PUBLIC_COMMANDS_BY_NAME})+'\n');
});

test('moved installed copy validates; missing, modified, unindexed and symlink resources fail',()=>fixture(dir=>{
 const installed=join(dir,'first');cpSync(root,installed,{recursive:true});const moved=join(dir,'moved');renameSync(installed,moved);
 assert.equal(verifyClosure(moved).modules,21);
 const asset=join(moved,'modules/media-use/audio/assets/sfx/manifest.json');const bytes=readFileSync(asset);rmSync(asset);
 assert.throws(()=>verifyClosure(moved),/Missing or nonregular resource/);writeFileSync(asset,bytes);
 const runtime=join(moved,'scripts/runtime.mjs'), runtimeBytes=readFileSync(runtime);writeFileSync(runtime,'throw new Error("changed")');assert.throws(()=>verifyClosure(moved),/Local helper hash mismatch/);writeFileSync(runtime,runtimeBytes);
 writeFileSync(asset,'{}');assert.throws(()=>verifyClosure(moved),/Derived hash mismatch/);writeFileSync(asset,bytes);
 const unexpected=join(moved,'modules/media-use/SKILL.md');writeFileSync(unexpected,'unexpected');assert.throws(()=>verifyClosure(moved),/Unindexed private resource/);rmSync(unexpected);
 rmSync(asset);symlinkSync(join(root,'modules/media-use/audio/assets/sfx/manifest.json'),asset);assert.throws(()=>verifyClosure(moved),/Missing or nonregular resource/);
}));

test('scaffold rejects existing content, symlink targets, unsafe options before launching runtime',()=>fixture(dir=>{
 const target=join(dir,'existing');mkdirSync(target);writeFileSync(join(target,'BRIEF.md'),'preserve');
 assert.throws(()=>scaffold({cli:process.execPath,args:[target]}),/nonempty/);
 assert.equal(readFileSync(join(target,'BRIEF.md'),'utf8'),'preserve');
 const link=join(dir,'dangling');symlinkSync(join(dir,'absent'),link);assert.throws(()=>scaffold({cli:process.execPath,args:[link]}),/symbolic/);
 for(const args of [['new','--example','remote'],['new','--non-interactive=false'],['new','--unknown']]) assert.throws(()=>scaffold({cli:process.execPath,args,cwd:dir}),/blank example|Boolean|Unsupported/);
 assert.equal(readdirSync(dir).length,2);
}));

test('installed media wrapper refuses missing runtime without fetching one',()=>fixture(dir=>{
 const installed=join(dir,'installed');cpSync(root,installed,{recursive:true});
 const run=spawnSync(process.execPath,[join(installed,'modules/media-use/scripts/resolve.mjs'),'--help'],{env:{...process.env,QS_VIDEO_CLI:''},encoding:'utf8',cwd:dir});
 assert.notEqual(run.status,0);assert.match(run.stderr,/QS_VIDEO_CLI.*existing absolute/);assert.deepEqual(readdirSync(dir),['installed']);
}));

test('installed modules load offline SFX with exact source bytes; unknown required cue stays missing',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'qs-video-sfx-'));
 try {
  const installed=join(dir,'installed');cpSync(root,installed,{recursive:true});
  const {resolveSfx}=await import(pathToFileURL(join(installed,'modules/media-use/audio/scripts/lib/sfx.mjs')));
  const library=join(installed,'modules/media-use/audio/assets/sfx');const manifest=JSON.parse(readFileSync(join(library,'manifest.json')));const name=Object.keys(manifest)[0];
  const result=await resolveSfx({cues:[{id:'first',name},{id:'bad',name:'qs-no-such-cue'}],heygenOK:false,headers:{},hyperframesDir:join(dir,'project'),sfxLibDir:library});
  assert.equal(result.sfx.length,1);assert.equal(result.sfx[0].source,'local');assert.equal(result.sfx[0].id,'first');
  assert.equal(hash(readFileSync(join(dir,'project',result.sfx[0].file))),hash(readFileSync(join(library,manifest[name].file))));
  assert.equal(result.anomalies.length,1);assert.match(result.anomalies[0],/not in bundled library/);
  const {requireLocalProvider}=await import(pathToFileURL(join(installed,'scripts/runtime.mjs')));
  assert.throws(()=>requireLocalProvider('kokoro',{}),/prerequisites have not been verified/);
  const {importPackagesOrBootstrap}=await import(pathToFileURL(join(installed,'modules/hyperframes-animation/scripts/package-loader.mjs')));
  await assert.rejects(()=>importPackagesOrBootstrap(['qs-video-intentionally-missing-package']),/Could not resolve required package/);
 }finally{rmSync(dir,{recursive:true,force:true});}
});

function fakeScaffoldCli(dir, extra='') {
 const cli=join(dir,'fake-cli.mjs');
 writeFileSync(cli,`#!/usr/bin/env node\nimport fs from 'node:fs';\nimport path from 'node:path';\nif(process.argv[2]==='--version'){console.log('0.8.77');process.exit(0);}\nconst staged=process.argv[3];\nfs.mkdirSync(staged,{recursive:true});\nfs.writeFileSync(path.join(staged,'package.json'),'{}');\nfs.writeFileSync(path.join(staged,'index.html'),'<!doctype html><title>fixture</title>');\nfs.writeFileSync(path.join(staged,'AGENTS.md'),'upstream refresh instruction');\nfs.writeFileSync(path.join(staged,'CLAUDE.md'),'upstream refresh instruction');\n${extra}\n`,{mode:0o755});
 return cli;
}

test('staged init preserves concurrently created or changed destination guidance',()=>{
 for(const wasEmpty of [false,true]) fixture(dir=>{
  const target=join(dir,'destination');if(wasEmpty)mkdirSync(target);
  const cli=fakeScaffoldCli(dir,`fs.mkdirSync(${JSON.stringify(target)},{recursive:true});fs.writeFileSync(path.join(${JSON.stringify(target)},'AGENTS.md'),'concurrent user guidance');`);
  assert.throws(()=>scaffold({cli,args:[target],cwd:dir}),/target was created or changed.*Staged output retained/);
  assert.equal(readFileSync(join(target,'AGENTS.md'),'utf8'),'concurrent user guidance');
  assert.deepEqual(readdirSync(target),['AGENTS.md']);
  const stage=readdirSync(dir).find(x=>x.startsWith('.qs-video-scaffold-'));assert(stage);
  assert(existsSync(join(dir,stage,'destination','index.html')));
  assert(existsSync(join(dir,stage,'init.stdout')));
 });
});

test('staged init detects replacement of an initially empty destination',()=>fixture(dir=>{
 const target=join(dir,'destination');mkdirSync(target);
 const cli=fakeScaffoldCli(dir,`fs.renameSync(${JSON.stringify(target)},${JSON.stringify(target+'-original')});fs.mkdirSync(${JSON.stringify(target)});`);
 assert.throws(()=>scaffold({cli,args:[target],cwd:dir}),/target was created or changed/);
 assert.deepEqual(readdirSync(target),[]);assert(existsSync(target+'-original'));
}));

test('failed staged init retains diagnostics and never creates destination',()=>fixture(dir=>{
 const target=join(dir,'destination'),cli=fakeScaffoldCli(dir,"console.error('fixture partial init failure');process.exit(17);");
 assert.throws(()=>scaffold({cli,args:[target],cwd:dir}),/Scaffold CLI failed \(17\).*Destination publication did not start/);
 assert(!existsSync(target));const stage=readdirSync(dir).find(x=>x.startsWith('.qs-video-scaffold-'));assert(stage);
 assert.match(readFileSync(join(dir,stage,'init.stderr'),'utf8'),/fixture partial init failure/);
}));

test('successful staged init publishes QS guidance to absent and empty targets',()=>{
 for(const wasEmpty of [false,true]) fixture(dir=>{
  const target=join(dir,'destination');if(wasEmpty)mkdirSync(target);
  const cli=fakeScaffoldCli(dir),result=scaffold({cli,args:[target],cwd:dir});
  assert.equal(result.target,target);assert.match(readFileSync(join(target,'AGENTS.md'),'utf8'),/\$qs-video:qs-video/);
  assert.equal(readFileSync(join(target,'AGENTS.md'),'utf8'),readFileSync(join(target,'CLAUDE.md'),'utf8'));
  assert(!readdirSync(dir).some(x=>x.startsWith('.qs-video-scaffold-')));
 });
});

test('caption transcription rejects missing runtime before source/project mutations',()=>fixture(dir=>{
 const project=join(dir,'project');mkdirSync(project);writeFileSync(join(project,'input.mp4'),'source');
 const script=join(root,'modules/embedded-captions/scripts/transcribe.cjs');
 const run=spawnSync(process.execPath,[script,project],{env:{...process.env,QS_VIDEO_CLI:''},encoding:'utf8'});
 assert.notEqual(run.status,0);assert.match(run.stderr,/QS_VIDEO_CLI/);assert.deepEqual(readdirSync(project),['input.mp4']);
}));

test('caption adapter runs exact injected CLI with explicit engine and normalizes real output shape',()=>fixture(dir=>{
 const project=join(dir,'project'),user=join(dir,'user');mkdirSync(project);mkdirSync(user);
 writeFileSync(join(project,'source.mp4'),'fixture');writeFileSync(join(project,'audio.mp3'),'fixture');writeFileSync(join(project,'package.json'),JSON.stringify({devDependencies:{hyperframes:'0.8.77'}}));
 const cache=join(user,'.cache/hyperframes/whisper/models');mkdirSync(cache,{recursive:true});writeFileSync(join(cache,'ggml-small.bin'),'fixture model; not real speech evidence');
 const argvLog=join(dir,'argv.jsonl'),cli=join(dir,'injected-cli.mjs');
 writeFileSync(cli,`#!/usr/bin/env node\nimport fs from 'node:fs';import path from 'node:path';\nconst args=process.argv.slice(2);fs.appendFileSync(${JSON.stringify(argvLog)},JSON.stringify(args)+'\\n');\nif(args[0]==='--version'){console.log('0.8.77');process.exit(0);}\nif(args[0]!=='transcribe')process.exit(4);const dest=path.join(args[args.indexOf('-d')+1],'transcript.json');\nfs.writeFileSync(dest,JSON.stringify([{word:'Hola',start:0.1,end:0.5},{word:'mundo',start:0.6,end:1.0}]));console.log(JSON.stringify({transcriptPath:dest}));\n`,{mode:0o755});
 const env={...process.env,QS_VIDEO_CLI:cli,QS_VIDEO_VERIFIED_LOCAL_PROVIDERS:'whisper',HYPERFRAMES_WHISPER_PATH:process.execPath,TRANSCRIBE_ENGINE:'whisper',HF_TEST_USER_DIRECTORY:user,HF_TEST_NETWORK_LOG:join(dir,'network.jsonl'),NODE_OPTIONS:'--import='+resolve('tests/fixtures/hyperframes-adoption/isolated-runtime.mjs')};
 const script=join(root,'modules/embedded-captions/scripts/transcribe.cjs');
 const run=spawnSync(process.execPath,[script,project,'small','es'],{env,encoding:'utf8'});assert.equal(run.status,0,run.stderr);
 const calls=readFileSync(argvLog,'utf8').trim().split('\n').map(JSON.parse);
 assert.deepEqual(calls,[['--version'],['transcribe',join(project,'audio.mp3'),'-d',project,'--json','--engine','whisper','--model','small','--language','es']]);
 const output=JSON.parse(readFileSync(join(project,'transcript.json')));assert.equal(output.text,'Hola mundo');assert.equal(output.language_code,'es');assert.equal(output.engine,'whisper.cpp(small)');assert.deepEqual(output.words,[{text:'Hola',start:0.1,end:0.5,type:'word'},{text:'mundo',start:0.6,end:1,type:'word'}]);
 // An existing unsupported pin stays intact and prevents transcription.
 rmSync(join(project,'transcript.json'));const oldPin=JSON.stringify({devDependencies:{hyperframes:'0.8.76'}});writeFileSync(join(project,'package.json'),oldPin);
 const mismatch=spawnSync(process.execPath,[script,project,'small','es'],{env,encoding:'utf8'});assert.notEqual(mismatch.status,0);assert.match(mismatch.stderr,/pin 0.8.76/);assert.equal(readFileSync(join(project,'package.json'),'utf8'),oldPin);assert(!existsSync(join(project,'transcript.json')));
 // A missing model fails before the actual transcribe command, even if marked verified.
 writeFileSync(join(project,'package.json'),JSON.stringify({devDependencies:{hyperframes:'0.8.77'}}));rmSync(join(cache,'ggml-small.bin'));
 const missing=spawnSync(process.execPath,[script,project,'small','es'],{env,encoding:'utf8'});assert.notEqual(missing.status,0);assert.match(missing.stderr,/Whisper cached model/);assert(!existsSync(join(project,'transcript.json')));
}));

test('installed caption helpers reject missing CLI and browser before adopting input',()=>fixture(dir=>{
 const project=join(dir,'project');mkdirSync(project);writeFileSync(join(project,'input.mp4'),'source');
 for(const file of ['matte.cjs','safe-zones.cjs','measure-layout.cjs','check-occlusion.cjs','check-overflow.cjs','preview-frames.cjs']) {
  const result=spawnSync(process.execPath,[join(root,'modules/embedded-captions/scripts',file),project],{env:{...process.env,QS_VIDEO_CLI:''},encoding:'utf8'});
  assert.notEqual(result.status,0,file);assert.match(result.stderr,/QS_VIDEO_CLI/);
  assert.deepEqual(readdirSync(project),['input.mp4']);
 }
 const adapter=join(root,'scripts/caption-runtime.cjs');
 const result=spawnSync(process.execPath,['-e',`require(${JSON.stringify(adapter)}).browserPath()`],{env:{...process.env,HYPERFRAMES_BROWSER_PATH:join(dir,'missing-browser')},encoding:'utf8'});
 assert.notEqual(result.status,0);assert.match(result.stderr,/HYPERFRAMES_BROWSER_PATH/);
}));

test('matte missing or corrupt cached model cannot call download-capable CLI command',()=>fixture(dir=>{
 const project=join(dir,'project'),user=join(dir,'user');mkdirSync(project);mkdirSync(user);
 writeFileSync(join(project,'input.mp4'),'must remain untouched');
 const pkg=join(dir,'node_modules/sharp');mkdirSync(pkg,{recursive:true});writeFileSync(join(pkg,'index.js'),'module.exports = {};');
 const log=join(dir,'cli-calls.jsonl'),cli=join(dir,'cli.mjs');
 writeFileSync(cli,`#!/usr/bin/env node\nimport fs from 'node:fs';const args=process.argv.slice(2);fs.appendFileSync(${JSON.stringify(log)},JSON.stringify(args)+'\\n');if(args[0]==='--version')console.log('0.8.77');else throw new Error('download-capable command must never run');`,{mode:0o755});
 const env={...process.env,QS_VIDEO_CLI:cli,HF_TEST_USER_DIRECTORY:user,HF_TEST_NETWORK_LOG:join(dir,'network.jsonl'),NODE_OPTIONS:'--import='+resolve('tests/fixtures/hyperframes-adoption/isolated-runtime.mjs')};
 const script=join(root,'modules/embedded-captions/scripts/matte.cjs');
 const missing=spawnSync(process.execPath,[script,project],{env,encoding:'utf8'});
 assert.notEqual(missing.status,0);assert.match(missing.stderr,/Cached u2net_human_seg model/);
 const model=join(user,'.cache/hyperframes/background-removal/models/u2net_human_seg.onnx');mkdirSync(dirname(model),{recursive:true});writeFileSync(model,'corrupt');
 const corrupt=spawnSync(process.execPath,[script,project],{env,encoding:'utf8'});
 assert.notEqual(corrupt.status,0);assert.match(corrupt.stderr,/digest mismatch/);
 assert.deepEqual(readFileSync(log,'utf8').trim().split('\n').map(JSON.parse),[['--version'],['--version']]);
 assert.deepEqual(readdirSync(project),['input.mp4']);assert(!existsSync(join(dir,'network.jsonl')));
 // A project pin is authoritative even when a compatible CLI is supplied.
 writeFileSync(join(project,'package.json'),'{"devDependencies":{"hyperframes":"0.8.76"}}');
 const incompatible=spawnSync(process.execPath,[script,project],{env,encoding:'utf8'});
 assert.notEqual(incompatible.status,0);assert.match(incompatible.stderr,/pin 0.8.76/);
 assert.equal(readFileSync(log,'utf8').trim().split('\n').length,2);
}));

test('caption render timeout fails despite stale output and cleans its own child group',()=>fixture(dir=>{
 const cli=join(dir,'cli.mjs'),childPid=join(dir,'child.pid'),stale=join(dir,'result.mp4');
 writeFileSync(stale,'preexisting artifact is not success');
 writeFileSync(cli,`#!/usr/bin/env node\nimport fs from 'node:fs';import {spawn} from 'node:child_process';if(process.argv[2]==='--version'){console.log('0.8.77');process.exit(0);}const child=spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{stdio:'ignore'});fs.writeFileSync(${JSON.stringify(childPid)},String(child.pid));setInterval(()=>{},1000);`,{mode:0o755});
 const probe=join(dir,'probe.cjs');
 writeFileSync(probe,`const fs=require('node:fs');const a=require(${JSON.stringify(join(root,'scripts/caption-runtime.cjs'))});a.runCli(['render'],{timeoutMs:400}).then(()=>process.exit(10)).catch(async e=>{if(!/timed out/.test(e.message))throw e;await new Promise(r=>setTimeout(r,100));const pid=Number(fs.readFileSync(${JSON.stringify(childPid)},'utf8'));try{process.kill(pid,0);if(process.platform==='linux' && fs.readFileSync('/proc/'+pid+'/stat','utf8').split(' ')[2]==='Z')return;process.exitCode=11;}catch(e){if(e.code!=='ESRCH')throw e;}});`);
 const result=spawnSync(process.execPath,[probe],{env:{...process.env,QS_VIDEO_CLI:cli},encoding:'utf8',timeout:5000});
 assert.equal(result.status,0,result.stderr);assert.equal(readFileSync(stale,'utf8'),'preexisting artifact is not success');
}));
