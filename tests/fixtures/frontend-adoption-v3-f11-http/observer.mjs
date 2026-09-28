import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { lstat, readdir, readFile, mkdir, writeFile, realpath } from 'node:fs/promises';
import { dirname, resolve, join, relative, extname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { observe } from './browser-observe-http.mjs';

const here=dirname(fileURLToPath(import.meta.url));
export const browserPath='/home/djn12313/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell';
export const puppeteerPath='/tmp/qs-hf-probe/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
export const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const json=(file,value)=>writeFile(file,JSON.stringify(value,null,2)+'\n',{flag:'wx'});
const check=(value,message)=>{if(!value)throw new Error(message);};
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.woff':'font/woff','.woff2':'font/woff2','.ico':'image/x-icon'};
export async function snapshot(project) {
  project=resolve(project);const root=await lstat(project);check(root.isDirectory()&&!root.isSymbolicLink()&&await realpath(project)===project,'Artifact root must be a regular local directory without symlink traversal.');
  const files=new Map(),manifest={};let total=0;
  async function visit(directory) {
    for(const entry of (await readdir(directory)).sort()) {
      const file=join(directory,entry),stat=await lstat(file),name=relative(project,file).replaceAll('\\','/');
      check(!stat.isSymbolicLink(),'Artifact symlinks are forbidden.');
      if(stat.isDirectory()) await visit(file);else {
        check(stat.isFile()&&stat.size<=64*1024*1024,'Only bounded regular artifact files are allowed.');
        check(files.size<4096,'Artifact file count exceeds limit.');const bytes=await readFile(file);total+=bytes.length;check(total<=128*1024*1024,'Artifact snapshot exceeds byte limit.');
        const after=await lstat(file);check(after.isFile()&&!after.isSymbolicLink()&&after.ino===stat.ino&&after.size===stat.size&&after.mtimeMs===stat.mtimeMs&&await realpath(file)===file,'Artifact changed while reading.');
        files.set(name,bytes);manifest[name]={sha256:sha(bytes),bytes:bytes.length};
      }
    }
  }
  await visit(project);return {files,manifest};
}
async function listen(server) {await new Promise((done,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',done);});return `http://127.0.0.1:${server.address().port}`;}
async function close(server) {server.closeAllConnections();await new Promise((done,reject)=>server.close(error=>error?reject(error):done()));}
export async function serveSnapshot(files) {
  const requests=[];let origin;
  const server=createServer((request,response)=>{
    const record={method:request.method,url:request.url,status:null};requests.push(record);
    const finish=(status,body='')=>{record.status=status;response.writeHead(status,{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});response.end(body);};
    if(!['GET','HEAD'].includes(request.method)) return finish(405);
    if(request.headers.host!==new URL(origin).host) return finish(403);
    let pathname;try{pathname=decodeURIComponent(request.url.split('?')[0]);}catch{return finish(400);}
    if(!pathname.startsWith('/')||pathname.startsWith('//')||/[\\\0]/.test(pathname)||pathname.split('/').some(part=>part==='.'||part==='..')) return finish(403);
    const name=pathname==='/'?'index.html':pathname.slice(1);const bytes=files.get(name);if(!bytes)return finish(404);
    record.status=200;response.writeHead(200,{'Content-Type':mime[extname(name).toLowerCase()]??'application/octet-stream','Content-Length':bytes.length,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});response.end(request.method==='HEAD'?undefined:bytes);
  });
  origin=await listen(server);return {origin,requests,close:()=>close(server)};
}
async function denyProxy() {
  const requests=[];const server=createServer((request,response)=>{requests.push({method:request.method,url:request.url});response.writeHead(403);response.end();});
  server.on('connect',(request,socket)=>{requests.push({method:'CONNECT',url:request.url});socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');});
  server.on('upgrade',(request,socket)=>{requests.push({method:'UPGRADE',url:request.url});socket.destroy();});
  const origin=await listen(server);return {origin,requests,close:()=>close(server)};
}
export async function observeHttp({project,output,reference=false,browser=browserPath,puppeteer=puppeteerPath}) {
  project=resolve(project);output=resolve(output);check(output!==project&&!output.startsWith(project+'/')&&!project.startsWith(output+'/'),'Supplemental output must be disjoint from original artifacts.');
  const sourceBefore=await snapshot(project);await mkdir(output);const copy=join(output,'artifact-copy');await mkdir(copy);
  for(const [name,bytes]of sourceBefore.files){await mkdir(dirname(join(copy,name)),{recursive:true});await writeFile(join(copy,name),bytes,{flag:'wx',mode:0o444});}
  const copyBefore=await snapshot(copy);check(JSON.stringify(copyBefore.manifest)===JSON.stringify(sourceBefore.manifest),'Artifact copy differs.');
  let server,proxy,report=null,failure=null;
  try {server=await serveSnapshot(copyBefore.files);proxy=await denyProxy();report=await observe({project:copy,output:join(output,'browser'),browserPath:browser,puppeteerPath:puppeteer,reference,httpOrigin:server.origin,proxyOrigin:proxy.origin});}
  catch(error){failure=error.stack;}
  finally {await Promise.all([server,proxy].filter(Boolean).map(service=>service.close()));}
  let sourceAfter=null,copyAfter=null;
  try {sourceAfter=await snapshot(project);copyAfter=await snapshot(copy);} catch(error) {failure=[failure,error.stack].filter(Boolean).join('\n');}
  const unchanged=sourceAfter!==null&&copyAfter!==null&&JSON.stringify(sourceBefore.manifest)===JSON.stringify(sourceAfter.manifest)&&JSON.stringify(copyBefore.manifest)===JSON.stringify(copyAfter.manifest);
  if(!unchanged&&!failure)failure='Artifact source/copy changed during observation.';
  const evidence={schemaVersion:1,project,reference,transport:'Supplementary loopback HTTP over an immutable in-memory snapshot of artifact-copy; original file:// evidence unchanged.',sourceBefore:sourceBefore.manifest,sourceAfter:sourceAfter?.manifest??null,copyBefore:copyBefore.manifest,copyAfter:copyAfter?.manifest??null,unchanged,requests:server?.requests??[],deniedProxyRequests:proxy?.requests??[],reportComplete:report!==null,failure,qualityJudgment:'Not evaluated; original rubric and independent review still required.'};
  await json(join(output,'transport-evidence.json'),evidence);check(!failure&&unchanged,failure??'Artifact source/copy changed during observation.');return {report,evidence};
}
export async function verifyPlan() {
  const plan=JSON.parse(await readFile(join(here,'plan.json'),'utf8'));check(plan.runtime.node===process.version,'Node runtime changed.');
  for(const [path,hash]of Object.entries(plan.files))check(sha(await readFile(resolve(here,path)))===hash,`Frozen supplementary input changed: ${path}`);
  check(sha(await readFile(plan.runtime.browserPath))===plan.runtime.browserSHA256,'Browser binary changed.');
  check(sha(await readFile(plan.runtime.puppeteerPath))===plan.runtime.puppeteerSHA256,'Puppeteer entry changed.');return plan;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  const [command,project,output,mode]=process.argv.slice(2);const plan=await verifyPlan();
  if(command==='verify') console.log('SUPPLEMENTAL_PLAN_VERIFIED');
  else {check(command==='observe'&&project&&output&&(!mode||mode==='reference'),'Use observe PROJECT FRESH_OUTPUT [reference] or verify.');await observeHttp({project,output,reference:mode==='reference',browser:plan.runtime.browserPath,puppeteer:plan.runtime.puppeteerPath});console.log('SUPPLEMENTAL_HTTP_OBSERVATION_COMPLETE');}
}
