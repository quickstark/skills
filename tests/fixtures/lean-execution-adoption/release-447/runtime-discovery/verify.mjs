import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import assert from 'node:assert/strict';
import {fileURLToPath,pathToFileURL} from 'node:url';
const out=path.dirname(fileURLToPath(import.meta.url));
function resolveRepositoryRoot(start){
 for(let dir=path.resolve(start);;dir=path.dirname(dir)){
  const pkg=path.join(dir,'package.json'),registry=path.join(dir,'scripts/skill-collection-registry.mjs');
  if(fs.existsSync(pkg)&&fs.existsSync(registry)){
   let metadata;try{metadata=JSON.parse(fs.readFileSync(pkg,'utf8'));}catch{}
   if(metadata?.name==='qs-skills'&&fs.statSync(registry).isFile())return dir;
  }
  if(path.dirname(dir)===dir)throw new Error('No QuickStark repository root above verifier');
 }
}
const repo=resolveRepositoryRoot(out),historicalRepo='/github/skills';
function sourceReadPath(file){
 if(file===historicalRepo)return repo;
 if(file.startsWith(historicalRepo+'/'))return path.join(repo,file.slice(historicalRepo.length+1));
 if(!path.isAbsolute(file))return path.join(repo,file);
 throw new Error('Source binding outside recorded repository: '+file);
}
const args=process.argv.slice(2);assert(args.every(a=>['--resolve-source-root','--live-context-controls'].includes(a)),'Unknown verification option');
if(args.includes('--resolve-source-root')){
 console.log('SOURCE_ROOT_RESOLUTION_OK '+JSON.stringify({repo,registryModule:path.join(repo,'scripts/skill-collection-registry.mjs'),sourceExample:sourceReadPath('/github/skills/skills/video/qs-video/SKILL.md')}));process.exit(0);
}
const {captureMigrationPath}=await import(pathToFileURL(path.join(repo,'scripts/migration-filesystem.mjs')));
const {TARGET_SKILL_COLLECTIONS}=await import(pathToFileURL(path.join(repo,'scripts/skill-collection-registry.mjs')));
const {verifyClosure}=await import(pathToFileURL(path.join(repo,'skills/video/qs-video/scripts/verify-closure.mjs')));
const read=p=>JSON.parse(fs.readFileSync(p)),hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const portability=read(out+'/source-root-portability.json');assert.equal(portability.allExpected,true);assert.equal(hash(path.join(out,'verify.mjs')),portability.sourceVerifierSHA256);assert.equal(hash(path.join(out,'verify-original.mjs')),portability.originalVerifierSHA256);assert.deepEqual(portability.records.map(r=>r.exitCode),[0,1,1,0]);
const bindings=read(out+'/bindings.json');assert.equal(JSON.parse(fs.readFileSync(repo+'/package.json')).version,'4.4.7');
// Recorded immutable Git identity is checked by parent integration; sources below bind actual bytes/modes without spawning Git.
for(const [file,want] of Object.entries(bindings.sourceFiles))assert.equal(hash(path.join(repo,file)),want,file);
for(const [file,want] of Object.entries(bindings.artifactFiles))assert.equal(hash(path.join(out,file)),want,file);
const projected=read(out+'/projected-closure/result.json');assert.equal(projected.status,'passed');assert.equal(projected.closure.length,3);assert.equal(projected.commands.length,30);
for(const record of projected.bindings){const ownedPrefix='.unlazy/release-447/runtime-discovery/';const target=record.path.startsWith(ownedPrefix)?path.join(out,record.path.slice(ownedPrefix.length)):path.join(repo,record.path);const now=await captureMigrationPath(target);assert.equal(now.contentSha256,record.contentSha256,record.path);}
for(const c of projected.closure){assert.deepEqual([c.video.modules,c.video.sourceFiles,c.video.privateFiles,c.video.relativeImports,c.executionFiles],[21,912,911,186,23]);}
for(const prefix of ['skills/video/qs-video','packages/qs-video/skills/qs-video','codex/plugins/qs-video/skills/qs-video','pi/packages/qs-video/skills/qs-video'])assert.equal(verifyClosure(repo+'/'+prefix).modules,21);
const native=read(out+'/isolated-native-attempt-1/result.json'),qualified=read(out+'/native-qualification.json');assert.equal(native.status,'passed');assert.equal(native.modelRequests,0);assert.equal(qualified.catalogDerived,true);
const codex=native.rpc.codex.responses.find(r=>r.id===2).result.data[0].skills.filter(s=>s.pluginId?.endsWith('@quickstark'));const pi=native.rpc.pi.responses.find(r=>r.id==='discovery').data.commands.filter(c=>c.source==='skill');
for(const c of TARGET_SKILL_COLLECTIONS){assert.deepEqual(codex.filter(s=>s.pluginId===c.id+'@quickstark').map(s=>s.name.slice(c.id.length+1)).sort(),[...c.publicCommands].sort());assert.deepEqual(pi.filter(s=>sourceReadPath(s.sourceInfo.baseDir)===repo+'/'+c.piPackageRoot).map(s=>s.name.slice(6)).sort(),[...c.publicCommands].sort());}
const total=TARGET_SKILL_COLLECTIONS.reduce((n,c)=>n+c.publicCommands.length,0);assert.equal(codex.length,total);assert.equal(pi.length,total);assert(codex.every(s=>s.enabled===true&&s.path.startsWith(native.home+'/.codex/plugins/cache/quickstark/')));for(const r of qualified.sourceBindings)assert.equal(hash(sourceReadPath(r.source)),r.sha256);
assert.deepEqual(read(out+'/controls-before.json'),read(out+'/controls-final.json'));if(args.includes('--live-context-controls'))for(const r of read(out+'/controls-final.json')){if(r.sha256)assert.equal(hash(r.path),r.sha256,r.path);else assert(!fs.existsSync(r.path),r.path);}
const prior=read(repo+'/tests/fixtures/lean-execution-adoption/lex12-noninstall-evidence.json');for(const records of [prior.sourceSHA256,prior.evidenceSHA256])for(const [p,h] of Object.entries(records))assert.equal(hash(repo+'/'+p),h,p);
const old=read(repo+'/tests/fixtures/lean-execution-adoption/lex12-acceptance.json');assert(old.closureAcceptance.every(r=>r.status==='unknown'&&r.adoptedRevision===null));
const video=read(out+'/video-fresh-run-attempt-2/results.json');const cases=['caption-only','hard-cut-and-zoom','visual-audio-crossfade-and-seek','subcomposition-local-font-asset','aspect-ratio','later-narration-carve-effects'];assert.deepEqual(video.outcomes.map(r=>r.case),cases);assert(video.outcomes.every(r=>r.status==='passed'));
const runtime=read(out+'/runtime-results-attempt-2.json');assert(runtime.results.every(r=>r.exitCode===0));assert.equal(runtime.results.find(r=>r.label==='hyperframes').stdout.trim(),'0.8.77');
const profile=read(repo+'/skills/video/qs-video/references/runtime-profile.json');const lock=read(out+'/runtime-package-lock-final.json');for(const [key,name] of [['cli','hyperframes'],['carveCore','@hyperframes/core']])assert.equal(lock.packages['node_modules/'+name].integrity,profile[key].integrity);
for(const [name,v] of Object.entries({'hyperframes':'0.8.77','@hyperframes/core':'0.8.77','gsap':'3.14.2','sharp':'0.35.4','puppeteer-core':'25.12.0'}))assert.equal(lock.packages['node_modules/'+name].version,v);
const base=out+'/video-fresh-run-attempt-2';const rgb=fs.readFileSync(base+'/fade-decoded-video.stdout');assert.equal(rgb.length,320*180*3);const pixel=[...rgb.subarray((20*320+20)*3,(20*320+20)*3+3)];assert(pixel[0]>80&&pixel[2]>80&&pixel[1]<40&&pixel[0]/pixel[2]>.75&&pixel[0]/pixel[2]<1.25);assert.throws(()=>assert(pixel[0]<20&&pixel[2]>240));
function energy(file,freq){const bytes=fs.readFileSync(file);let re=0,im=0;const n=bytes.length/2;assert(n>9000);for(let i=0;i<n;i++){const x=bytes.readInt16LE(i*2),phase=2*Math.PI*freq*i/48000;re+=x*Math.cos(phase);im-=x*Math.sin(phase);}return 2*Math.hypot(re,im)/n;}
const energies=[0,1,2].map(i=>[220,440].map(f=>energy(base+'/fade-energy'+i+'.stdout',f)));assert(energies[0][0]>2800&&energies[0][1]<30);assert(energies[1].every(x=>x>1200&&x<1800));assert(energies[2][0]<30&&energies[2][1]>2800);for(let i=0;i<3;i++)for(let j=0;j<2;j++)assert(Math.abs(energies[i][j]-video.outcomes[2].evidence.energies[i][String([220,440][j])])<1e-6);
assert.equal(hash(base+'/captions/result.mp4'),video.outcomes[0].evidence.video_sha256);assert.equal(hash(base+'/fade-snapshots/frame-02-at-1s.png'),hash(base+'/fade-snapshots/frame-05-at-1s.png'));assert.equal(hash(base+'/fade-snapshots/frame-00-at-0.25s.png'),hash(base+'/fade-snapshots/frame-06-at-0.25s.png'));
assert(read(out+'/video-fresh-run/results.json').outcomes.every(x=>x.status==='failed'));assert.equal(read(out+'/nonisolated-approval-rejection.json').decision,'rejected');
console.log('LEAF_BINDINGS_OK '+JSON.stringify({publicPerHost:total,projectedHostClosures:3,videoCases:cases.length,sourceFiles:Object.keys(bindings.sourceFiles).length,artifacts:Object.keys(bindings.artifactFiles).length,liveContextControls:args.includes('--live-context-controls'),preservationOracle:'portable root paths; exact captured modes required; metadata mismatch fails',scope:'isolated qualification; LEX-14..16 unperformed'}));
