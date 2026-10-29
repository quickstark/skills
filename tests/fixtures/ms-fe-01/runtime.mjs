import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
export const here = dirname(fileURLToPath(import.meta.url)), repository = resolve(here, '../../..');
export const browserPath = '/home/djn12313/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
export async function snippets() {
  return Object.fromEntries(await Promise.all(['motion','media'].map(async name => {
    const content = await readFile(join(repository, `skills/frontend/internal/${name}-recipes.md`),'utf8');
    return [name, [...content.matchAll(/```js\n([\s\S]*?)```/g)].map(m=>m[1]).join('\n')];
  })));
}
export async function serve(base) {
  const server = createServer(async (req,res) => {
    try {
      const file = resolve(base, '.' + new URL(req.url,'http://localhost').pathname);
      if (!file.startsWith(resolve(base) + '/')) throw Error('path');
      const bytes=await readFile(file);res.setHeader('Content-Type',file.endsWith('.webm')?'video/webm':file.endsWith('.svg')?'image/svg+xml':file.endsWith('.js')?'text/javascript':'text/html');res.end(bytes);
    } catch {res.statusCode=404;res.end('missing');}
  });
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  return { url:`http://127.0.0.1:${server.address().port}`,close:()=>new Promise(r=>server.close(r)) };
}
export async function assets() {
  await mkdir(join(here,'assets'),{recursive:true});
  const poster='<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540"><rect width="960" height="540" fill="#173f49"/><circle cx="720" cy="270" r="90" fill="#f1b85b"/><path d="M0 420Q480 300 960 450V540H0" fill="#6c9b93"/></svg>';
  await writeFile(join(here,'assets/poster.svg'),poster);
  const browser=await chromium.launch({executablePath:browserPath,headless:true});
  try {
    const page=await browser.newPage();
    const bytes=await page.evaluate(async()=>{
      const canvas=document.createElement('canvas');canvas.width=960;canvas.height=540;
      const ctx=canvas.getContext('2d'),stream=canvas.captureStream(24),parts=[];
      const mime='video/webm;codecs=vp8';if(!MediaRecorder.isTypeSupported(mime))throw Error('VP8 recording unavailable');
      const recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:220000});
      recorder.ondataavailable=e=>parts.push(e.data);
      const done=new Promise(r=>recorder.onstop=r);recorder.start();
      const start=performance.now();
      await new Promise(resolve=>{function draw(t){const p=(t-start)/2000;ctx.fillStyle='#173f49';ctx.fillRect(0,0,960,540);ctx.fillStyle='#f1b85b';ctx.beginPath();ctx.arc(720,270,90+Math.sin(p*Math.PI*2)*8,0,Math.PI*2);ctx.fill();ctx.fillStyle='#6c9b93';ctx.fillRect(0,440,960,100);if(p<1)requestAnimationFrame(draw);else resolve();}requestAnimationFrame(draw);});
      recorder.stop();await done;stream.getTracks().forEach(t=>t.stop());return Array.from(new Uint8Array(await new Blob(parts).arrayBuffer()));
    });
    await writeFile(join(here,'assets/scene.webm'),Buffer.from(bytes));
  } finally {await browser.close();}
  await writeFile(join(here,'assets/rights.json'),JSON.stringify({source:'Locally authored synthetic geometric fixture, recorded using canvas and browser MediaRecorder; no upstream media or generated-media service used.',rights:'Repository-owned test fixture',files:Object.fromEntries(await Promise.all(['poster.svg','scene.webm'].map(async f=>[f,sha(await readFile(join(here,'assets',f)))])))},null,2)+'\n');
}
export async function runtime() {
  const code=await snippets();await mkdir(join(here,'runtime'),{recursive:true});
  const html=`<!doctype html><html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Motion recipe qualification</title><style>*{box-sizing:border-box}body{margin:0;font:18px system-ui;color:#fff;background:#173f49}[hidden]{display:none!important}a,button{color:#173f49;background:#fff;padding:14px;display:inline-block;border:2px solid #173f49;border-radius:0}a:focus-visible,button:focus-visible{outline:4px solid #ffdc00;outline-offset:4px}[data-media]{position:relative;min-height:100svh;overflow:clip}.plate{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:70% center;pointer-events:none}.copy{position:relative;z-index:1;padding:clamp(24px,5vw,72px);max-width:650px}.copy h1,.copy p{background:#173f49;padding:8px}h1{font-size:clamp(36px,5vw,64px);line-height:1.05}section.below{min-height:180vh;padding:32px;background:#fff;color:#173f49}#tall{min-height:800vh} @media(max-width:600px){.copy{max-width:100%;padding:24px}.plate{object-position:85% center}}</style><body><main><section data-media><img class="plate" src="../assets/poster.svg" alt=""><video class="plate" src="../assets/scene.webm" muted playsinline preload="metadata" aria-hidden="true" hidden></video><div class="copy"><p data-enter>FIELD NOTES / 2026</p><h1 data-enter>Make room for the moving world.</h1><p data-enter>Thoughtful films, clear stories, lasting places.</p><a href="#work" id="primary">Explore the work</a><button type="button" data-pause hidden>Play background video</button><span data-media-status></span></div></section><section class="below" id="work"><h2 data-reveal>Selected work</h2><a href="#primary">Back to introduction</a><div id="tall" data-reveal>A tall visible story.</div></section></main><script>${code.motion}\n${code.media}\nif(new URLSearchParams(location.search).has('fade'))document.querySelector('video').setAttribute('data-fade-loop','');window.cleanupMotion=mountMotion(document);if(!new URLSearchParams(location.search).has('interrupt'))window.cleanupMedia=mountMedia(document.querySelector('[data-media]'));</script></body></html>`;
  await writeFile(join(here,'runtime/index.html'),html);
  const host=await serve(here),browser=await chromium.launch({executablePath:browserPath,headless:true});
  const evidence={browser:browser.version(),codec:'video/webm; codecs="vp8"',snippets:Object.fromEntries(Object.entries(code).map(([k,v])=>[k,sha(v)])),cases:[],failures:[]};
  try {
    for(const viewport of [{width:375,height:812},{width:768,height:1024},{width:1440,height:900},{width:812,height:375}])for(const reducedMotion of ['no-preference','reduce']){
      const context=await browser.newContext({viewport,reducedMotion,hasTouch:viewport.width===375});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>errors.push(r.url()));
      await page.goto(host.url+'/runtime/index.html');await page.locator('#primary').focus();
      await page.screenshot({path:join(here,`runtime/${viewport.width}-${reducedMotion}-early.png`)});
      assert.ok(await page.locator('#primary').evaluate(el=>getComputedStyle(el).opacity==='1' && getComputedStyle(el).outlineStyle!=='none'));
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      await page.waitForTimeout(750);await page.screenshot({path:join(here,`runtime/${viewport.width}-${reducedMotion}-normal-settled.png`)});
      const codec=await page.locator('video').evaluate(v=>v.canPlayType('video/webm; codecs="vp8"'));assert.ok(codec);
      if(reducedMotion==='reduce')assert.equal(await page.locator('video').evaluate(v=>v.paused&&v.hidden),true);
      else{
        await page.waitForFunction(()=>document.querySelector('video').currentTime>.2);
        await page.locator('[data-pause]').click();assert.equal(await page.locator('video').evaluate(v=>v.paused&&v.hidden),true);
        await page.locator('#work').scrollIntoViewIfNeeded();await page.waitForTimeout(100);
        await page.locator('#primary').scrollIntoViewIfNeeded();await page.waitForTimeout(100);assert.equal(await page.locator('video').evaluate(v=>v.paused),true,'user pause survives visibility changes');
        await page.locator('[data-pause]').click();await page.waitForFunction(()=>!document.querySelector('video').paused);
        await page.locator('#work').scrollIntoViewIfNeeded();await page.waitForTimeout(150);assert.equal(await page.locator('video').evaluate(v=>v.paused),true,'offscreen paused');
        await page.locator('#tall').scrollIntoViewIfNeeded();assert.ok(Number(await page.locator('#tall').evaluate(el=>getComputedStyle(el).opacity))>0);
        await page.locator('#primary').scrollIntoViewIfNeeded();await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(100);assert.equal(await page.locator('video').evaluate(v=>v.paused&&v.hidden),true);
      }
      await page.screenshot({path:join(here,`runtime/${viewport.width}-${reducedMotion}-settled.png`)});
      await page.locator('#primary').click();assert.equal(new URL(page.url()).hash,'#work');
      await page.evaluate(()=>{cleanupMotion();cleanupMedia();});await page.waitForTimeout(200);
      assert.equal(await page.evaluate(()=>document.getAnimations().length),0);assert.equal(await page.locator('video').evaluate(v=>v.paused&&v.hidden),true);assert.deepEqual(errors,[]);
      evidence.cases.push({viewport,reducedMotion,touchEmulated:viewport.width===375,codec,pass:true});await context.close();
    }
    for(const fault of ['no-js','interrupt','autoplay-rejected','missing-media','no-observer','delayed-fonts']){
      const context=await browser.newContext({viewport:{width:375,height:812},javaScriptEnabled:fault!=='no-js'}),page=await context.newPage();
      if(fault==='autoplay-rejected')await page.addInitScript(()=>{HTMLMediaElement.prototype.play=()=>Promise.reject(new DOMException('Injected rejection','NotAllowedError'));});
      if(fault==='no-observer')await page.addInitScript(()=>{delete window.IntersectionObserver;});
      if(fault==='missing-media')await page.route('**/scene.webm',route=>route.abort('failed'));
      if(fault==='delayed-fonts')await page.addInitScript(()=>{Object.defineProperty(document.fonts,'ready',{value:new Promise(()=>{})});});
      await page.goto(host.url+'/runtime/index.html'+(fault==='interrupt'?'?interrupt':''));await page.waitForTimeout(700);
      assert.ok(await page.locator('h1').isVisible());assert.ok(await page.locator('#primary').isVisible());
      if(!['delayed-fonts'].includes(fault))assert.equal(await page.locator('video').evaluate(v=>v.paused&&v.hidden),true);
      await page.screenshot({path:join(here,`runtime/${fault}.png`)});evidence.cases.push({fault,injected:true,pass:true});await context.close();
    }
    const page=await browser.newPage({viewport:{width:1440,height:900}});await page.goto(host.url+'/runtime/index.html?fade');
    await page.waitForFunction(()=>document.querySelector('video').currentTime>.1);
    let wraps=0,previous=0;const samples=[];
    for(let i=0;i<80&&wraps<3;i++){
      const time=await page.locator('video').evaluate(v=>v.currentTime);if(time<previous-.5)wraps++;previous=time;
      if(i%10===0){const file=`loop-${i}.png`;await page.screenshot({path:join(here,'runtime',file)});samples.push({time,file});}await page.waitForTimeout(100);
    }
    assert.equal(wraps,3,'three observed fade loop cycles');await page.evaluate(()=>cleanupMedia());const time=await page.locator('video').evaluate(v=>v.currentTime);await page.waitForTimeout(500);assert.equal(await page.locator('video').evaluate(v=>v.currentTime),time);
    evidence.cases.push({loop:'optional fade',wraps,samples,teardownStopsTime:true});
    await writeFile(join(here,'runtime/evidence.json'),JSON.stringify(evidence,null,2)+'\n');console.log('MS_FE_RUNTIME_OK');
  } catch(error){evidence.failures.push(error.stack);await writeFile(join(here,'runtime/evidence-failed-'+Date.now()+'.json'),JSON.stringify(evidence,null,2)+'\n');throw error;}
  finally{await browser.close();await host.close();}
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 if(process.argv.includes('--assets'))await assets();
 else await runtime();
}
