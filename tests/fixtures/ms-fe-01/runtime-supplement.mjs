import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright-core';
import {here,browserPath,serve,snippets} from './runtime.mjs';
const directory=join(here,'runtime-supplement');await mkdir(directory,{recursive:true});
const host=await serve(here),browser=await chromium.launch({executablePath:browserPath,headless:true});
const evidence={browser:browser.version(),snippets:Object.fromEntries(Object.entries(await snippets()).map(([k,v])=>[k,createHash('sha256').update(v).digest('hex')])),checks:{},screenshots:[]};
try{
 const context=await browser.newContext({viewport:{width:375,height:812}}),page=await context.newPage();const errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>errors.push(r.url()));
 await page.addInitScript(()=>{
  window.observedTargets=new Set();const Original=IntersectionObserver;
  window.IntersectionObserver=class extends Original{
   constructor(...args){super(...args);this.owned=new Set();}
   observe(el){this.owned.add(el);observedTargets.add(el);super.observe(el);}
   unobserve(el){this.owned.delete(el);observedTargets.delete(el);super.unobserve(el);}
   disconnect(){for(const el of this.owned)observedTargets.delete(el);this.owned.clear();super.disconnect();}
  };
 });
 await page.goto(host.url+'/runtime/index.html');await page.waitForFunction(()=>document.querySelector('video').currentTime>.1);
 await page.locator('[data-pause]').focus();await page.keyboard.press('Space');assert.equal(await page.locator('video').evaluate(v=>v.paused&&v.hidden),true);await page.keyboard.press('Space');await page.waitForFunction(()=>!document.querySelector('video').paused);evidence.checks.keyboardPauseResume=true;
 let wraps=0,previous=0;const checkpoints=new Set();
 for(let i=0;i<100&&wraps<3;i++){
  const state=await page.locator('video').evaluate(v=>({time:v.currentTime,duration:v.duration}));if(state.time<previous-.5)wraps++;previous=state.time;
  const phase=state.time<.3?'start':Math.abs(state.time-state.duration/2)<.16?'midpoint':state.duration-state.time<.25?'end':null;
  if(phase&&!checkpoints.has(phase)){const file=phase+'.png';await page.screenshot({path:join(directory,file)});evidence.screenshots.push({phase,time:state.time,duration:state.duration,file});checkpoints.add(phase);}
  await page.waitForTimeout(80);
 }
 assert.equal(wraps,3);assert.equal(checkpoints.size,3);evidence.checks.nativeLoopCycles=wraps;
 await page.locator('#primary').focus();await page.keyboard.press('Enter');assert.equal(new URL(page.url()).hash,'#work');await page.waitForTimeout(100);assert.equal(await page.locator('video').evaluate(v=>v.paused),true);evidence.checks.keyboardPrimaryAndOffscreenPause=true;
 await page.locator('#tall').scrollIntoViewIfNeeded();await page.waitForTimeout(700);const count=await page.evaluate(()=>document.querySelector('#tall').getAnimations().length);assert.equal(count,0);evidence.checks.tallRevealSettles=true;
 await page.evaluate(()=>{cleanupMotion();cleanupMedia();});assert.equal(await page.evaluate(()=>observedTargets.size),0);assert.equal(await page.evaluate(()=>document.getAnimations().length),0);evidence.checks.observersAndAnimationsReleased=true;
 assert.deepEqual(errors,[]);await context.close();
 const fault=await browser.newPage({viewport:{width:375,height:812}});await fault.addInitScript(()=>{window.IntersectionObserver=class{observe(){throw Error('Injected interrupted observer setup');}disconnect(){}};});await fault.goto(host.url+'/runtime/index.html');await fault.waitForTimeout(700);assert.ok(await fault.locator('h1').isVisible());assert.ok(await fault.locator('#primary').isVisible());assert.equal(await fault.locator('video').evaluate(v=>v.paused&&v.hidden),true);await fault.screenshot({path:join(directory,'interrupted-initialization.png')});evidence.checks.interruptedObserverSetupLeavesContentVisible=true;
 await writeFile(join(directory,'evidence.json'),JSON.stringify(evidence,null,2)+'\n');console.log('MS_FE_RUNTIME_SUPPLEMENT_OK');
}finally{await browser.close();await host.close();}
