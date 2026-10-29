import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright-core';
import {here,browserPath,serve} from './runtime.mjs';
const base=join(here,'comparison-v5'),plan=JSON.parse(await readFile(join(base,'plan.json'))),sha=b=>createHash('sha256').update(b).digest('hex');
await writeFile(join(base,'output-actions-plan.json'),JSON.stringify({sourceSHA256:sha(await readFile(new URL(import.meta.url))),planSHA256:sha(await readFile(join(base,'plan.json'))),checks:['actual tap pauses','Space resumes','reduced motion pauses','no-JS keeps copy and poster'],scope:'Four fresh candidate C1/C2 outputs. Additive qualification, no product edits.'},null,2)+'\n',{flag:'wx'});
const browser=await chromium.launch({executablePath:browserPath,headless:true}),results=[];
try{for(const row of plan.schedule.filter(r=>r.variant==='candidate'&&['C1','C2'].includes(r.scenario))){const host=await serve(join(base,'runs',row.id,'after'));try{
 const context=await browser.newContext({viewport:{width:375,height:812},isMobile:true,hasTouch:true}),page=await context.newPage();await page.goto(host.url+'/index.html');const video=page.locator('video').first();await video.evaluate(v=>v.parentElement.scrollIntoView({block:'center'}));await page.waitForFunction(()=>{const v=document.querySelector('video');return !v.paused&&v.currentTime>0;});
 const button=page.getByRole('button',{name:/pause.*(?:video|motion)|pause background/i}).first();await button.tap();await page.waitForFunction(()=>document.querySelector('video').paused);const pausedLabel=await button.getAttribute('aria-label')||await button.textContent();assert.match(pausedLabel,/play|resume/i);
 await button.focus();await page.keyboard.press('Space');await page.waitForFunction(()=>!document.querySelector('video').paused);await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>document.querySelector('video').paused);await context.close();
 const staticContext=await browser.newContext({viewport:{width:375,height:812},javaScriptEnabled:false}),staticPage=await staticContext.newPage();await staticPage.goto(host.url+'/index.html');assert.ok(await staticPage.locator('h1').isVisible());assert.ok(await staticPage.locator('img').first().isVisible());assert.ok(await staticPage.locator('a[href="#work"]').first().isVisible());await staticContext.close();results.push({id:row.id,htmlSHA256:sha(await readFile(join(base,'runs',row.id,'after/index.html'))),tapPause:true,spaceResume:true,reducedMotionPause:true,noJSVisible:true});
}finally{await host.close();}}}finally{await browser.close();}
await writeFile(join(base,'output-actions.json'),JSON.stringify(results,null,2)+'\n',{flag:'wx'});console.log('MS_FE_OUTPUT_ACTIONS_OK');
