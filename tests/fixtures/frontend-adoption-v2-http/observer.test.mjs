import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer, request } from 'node:http';
import { mkdtemp, mkdir, readFile, writeFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { snapshot, serveSnapshot, observeHttp, sha } from './observer.mjs';

async function fixture(t) {const base=await mkdtemp(join(tmpdir(),'qs-http-browser-control-'));t.after(()=>rm(base,{recursive:true,force:true}));return base;}
async function get(origin,path,method='GET',headers={}) {return new Promise((done,reject)=>{const req=request(origin,{path,method,headers},res=>{const chunks=[];res.on('data',chunk=>chunks.push(chunk));res.on('end',()=>done({status:res.statusCode,body:Buffer.concat(chunks).toString(),headers:res.headers}));});req.on('error',reject);req.end();});}
async function product(base,name,prefix,{external=''}={}) {
  const project=join(base,name);await mkdir(project);
  await writeFile(join(project,'index.html'),`<!doctype html><html><head><meta charset="UTF-8"><link rel="stylesheet" href="${prefix}style.css"><script defer src="${prefix}script.js"></script></head><body><h1>Northstar fixture</h1><p id="member-count">Waiting for script</p><form id="join-form"><label for="member-email">Email</label><input id="member-email" type="email" required><button id="join-button" type="submit">Join</button></form><p id="form-message"></p></body></html>`);
  await writeFile(join(project,'style.css'),'body { font-family: Georgia, serif; color: #182d2a; background: #f7f5ef; max-width: 32rem; margin: 1rem; } button { background: #086b64; color:white; border-radius:12px; } :focus-visible { outline: 3px solid blue; }');
  await writeFile(join(project,'script.js'),`window.__events=[];document.querySelector('#member-count').textContent='Script loaded';document.querySelector('#join-form').addEventListener('submit',event=>{event.preventDefault();window.__events.push({name:'join_started',plan:'family'});document.querySelector('#form-message').textContent='Ready to continue with Family membership.';});${external?`fetch('${external}/fetch').catch(()=>{});new Worker('/worker.js');new WebSocket('${external.replace('http:','ws:')}/socket');`:''}`);
  if(external)await writeFile(join(project,'worker.js'),`fetch('${external}/worker-fetch').catch(()=>{});`);
  return project;
}
test('static server serves immutable bytes, allows GET/HEAD, and rejects traversal, unsafe methods, wrong host and symlink payloads',async t=>{
  const base=await fixture(t),project=await product(base,'server','/'),snap=await snapshot(project),server=await serveSnapshot(snap.files);t.after(()=>server.close());
  assert.equal((await get(server.origin,'/style.css')).status,200);assert.equal((await get(server.origin,'/style.css','HEAD')).body,'');assert.equal((await get(server.origin,'/style.css?version=1')).status,200);
  for(const path of ['/../secret.txt','/%2e%2e/secret.txt','/%2F..%2Fsecret.txt','/a%5c..%5csecret.txt','/bad%00file','//outside/path'])assert.equal((await get(server.origin,path)).status,403,path);
  assert.equal((await get(server.origin,'/%zz')).status,400);assert.equal((await get(server.origin,'/style.css','POST')).status,405);assert.equal((await get(server.origin,'/style.css','GET',{Host:'unrelated.invalid'})).status,403);assert.equal((await get(server.origin,'/not-in-snapshot')).status,404);
  await writeFile(join(project,'style.css'),'changed on disk');assert.equal((await get(server.origin,'/style.css')).body,snap.files.get('style.css').toString(),'Snapshot bytes cannot drift during browser observation');
  await writeFile(join(base,'secret.txt'),'outside');await symlink(join(base,'secret.txt'),join(project,'secret.txt'));await assert.rejects(snapshot(project),/symlinks/);
});
test('actual browser loads root-relative and relative CSS/JS with identical frozen measurements and screenshots',async t=>{
  const base=await fixture(t);const results=[];
  for(const [name,prefix]of [['root-relative','/'],['relative','./']]) {
    const project=await product(base,name,prefix),output=join(base,name+'-observation');const before=(await snapshot(project)).manifest;
    const result=await observeHttp({project,output});assert.equal(result.evidence.unchanged,true);assert.deepEqual((await snapshot(project)).manifest,before);assert.deepEqual(result.evidence.sourceBefore,result.evidence.copyAfter);
    assert.match(result.report.views.wide.typography.bodyFont,/Georgia/);assert.match(result.report.views.wide.text,/Script loaded/);assert.equal(result.report.invalidEmail.valid,false);assert.equal(result.report.keyboardSubmission.reachedJoin,true);assert.deepEqual(result.report.keyboardSubmission.events,[{name:'join_started',plan:'family'}]);assert.equal(result.report.keyboardSubmission.message,'Ready to continue with Family membership.');
    assert.deepEqual(result.report.views.wide.viewport,{width:1280,height:900});assert.deepEqual(result.report.views.narrow.viewport,{width:390,height:844});assert.equal(result.report.tabSequence.length,14);assert.equal(result.report.reducedMotion.matches,true);
    assert.ok(result.evidence.requests.some(row=>row.url==='/style.css'&&row.status===200));assert.ok(result.evidence.requests.some(row=>row.url==='/script.js'&&row.status===200));
    results.push({report:result.report,wide:sha(await readFile(join(output,'browser/wide.png'))),narrow:sha(await readFile(join(output,'browser/narrow.png')))});
  }
  assert.deepEqual(results[0].report.views,results[1].report.views);assert.equal(results[0].wide,results[1].wide);assert.equal(results[0].narrow,results[1].narrow);
});
test('actual browser blocks other origins including fetch, worker requests and WebSockets without contacting the sentinel',async t=>{
  const base=await fixture(t);let hits=0;const sentinel=createServer((req,res)=>{hits++;res.end('not allowed');});sentinel.on('upgrade',(req,socket)=>{hits++;socket.destroy();});await new Promise(done=>sentinel.listen(0,'127.0.0.1',done));t.after(()=>new Promise(done=>sentinel.close(done)));
  const external=`http://127.0.0.1:${sentinel.address().port}`,project=await product(base,'network','/',{external}),output=join(base,'network-observation');const result=await observeHttp({project,output});
  assert.equal(hits,0);assert.ok(result.report.blockedRequests.includes(external+'/fetch'));assert.ok(result.evidence.deniedProxyRequests.some(row=>row.url.includes(String(sentinel.address().port))),JSON.stringify(result.evidence.deniedProxyRequests));assert.equal(result.evidence.unchanged,true);
});
test('failed browser launch preserves separate failure evidence and leaves original bytes untouched',async t=>{
  const base=await fixture(t),project=await product(base,'failure','/'),output=join(base,'failure-observation');const before=(await snapshot(project)).manifest;
  await assert.rejects(observeHttp({project,output,browser:join(base,'missing-browser')}),/Browser was not found|Failed to launch|executable|ENOENT/);
  const evidence=JSON.parse(await readFile(join(output,'transport-evidence.json'),'utf8'));assert.equal(evidence.reportComplete,false);assert.ok(evidence.failure);assert.equal(evidence.unchanged,true);assert.deepEqual((await snapshot(project)).manifest,before);
});

test('HTTP derivative preserves the exact frozen measurement block',async()=>{
  const original=await readFile(new URL('../frontend-adoption-v2/browser-observe.mjs',import.meta.url),'utf8');
  const derivative=await readFile(new URL('./browser-observe-http.mjs',import.meta.url),'utf8');
  const measurements=text=>text.slice(text.indexOf("    for (const [name, width, height]"),text.indexOf("  } finally { await browser.close(); }"));
  assert.ok(measurements(original).length>3000);assert.equal(measurements(derivative),measurements(original));
});
