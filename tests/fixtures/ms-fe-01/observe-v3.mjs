import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright-core';
import {here,browserPath,serve} from './runtime.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const json=(p,v)=>writeFile(p,JSON.stringify(v,null,2)+'\n',{flag:'wx'});
export async function observe(batch='comparison-v3'){
 const base=join(here,batch),plan=JSON.parse(await readFile(join(base,'plan.json')));await mkdir(join(base,'observations'));const browser=await chromium.launch({executablePath:browserPath,headless:true});const results=[];
 try{for(const row of plan.schedule){
   const dir=join(base,'runs',row.id),result={id:row.id,scenario:row.scenario,errors:[],views:[],checks:{}};results.push(result);
   try{
    const telemetry=JSON.parse(await readFile(join(dir,'telemetry.json')));result.transport={completedTurn:telemetry.completedTurn,nativeStreamComplete:telemetry.nativeStreamComplete,stopReason:telemetry.stopReason,toolCount:telemetry.toolCount,durationMs:telemetry.elapsedMs,usage:telemetry.usage};assert.ok(telemetry.completedTurn&&telemetry.nativeStreamComplete,'complete observed native attempt');
    const events=(await readFile(join(dir,'events.jsonl'),'utf8')).trim().split('\n').map(x=>JSON.parse(x));const commands=events.filter(e=>e.type==='item.completed'&&e.item.type==='command_execution').map(e=>({command:e.item.command,exit:e.item.exit_code,output:e.item.aggregated_output}));result.commands=commands.map(({command,exit})=>({command,exit}));
    result.reads=Object.fromEntries(['cinematic-landing','motion-recipes','media-recipes'].map(name=>[name,commands.some(c=>c.exit===0&&c.command.includes(name+'.md')&&c.output.includes(name==='cinematic-landing'?'# Cinematic marketing':name==='motion-recipes'?'# Motion recipes':'# Media recipes'))]));
    const before=JSON.parse(await readFile(join(dir,'before.json'))),after=JSON.parse(await readFile(join(dir,'after.json')));result.changed=Object.keys({...before,...after}).filter(p=>before[p]!==after[p]);
    assert.ok(result.changed.every(p=>!p.startsWith('guidance/')&&!p.startsWith('assets/')&&p!=='reference.svg'),'guidance/assets/reference preserved');
    if(row.variant==='candidate'&&['C3','C4','C6','C7'].includes(row.scenario))assert.ok(Object.values(result.reads).every(v=>!v),'cinematic guidance stays unloaded');
    if(['C5','C6'].includes(row.scenario)){assert.deepEqual(result.changed,[],'read-only boundary');result.response=await readFile(join(dir,'response.md'),'utf8');assert.ok(result.response.trim());result.checks.authority=true;continue;}
    if(row.variant==='candidate'&&['C3','C4','C6','C7'].includes(row.scenario))assert.ok(Object.values(result.reads).every(v=>!v),'cinematic guidance stays unloaded');
    if(row.variant==='candidate'&&['C1','C2'].includes(row.scenario))assert.ok(result.reads['cinematic-landing']&&result.reads['media-recipes'],'selected media references actually read');
    const html=await readFile(join(dir,'after/index.html'),'utf8');
    if(row.variant==='candidate'&&['C1','C2'].includes(row.scenario)&&/data-enter|data-reveal|@keyframes|\.animate\s*\(/.test(html))assert.ok(result.reads['motion-recipes'],'selected motion technique reference read');result.htmlSHA256=hash(html);result.response=await readFile(join(dir,'response.md'),'utf8');
    const host=await serve(join(dir,'after'));
    try{for(const viewport of [{width:375,height:812},{width:768,height:1024},{width:1440,height:900},{width:812,height:375}])for(const reducedMotion of ['no-preference','reduce']){
      const context=await browser.newContext({viewport,reducedMotion,hasTouch:viewport.width===375}),page=await context.newPage(),unexpected=[];
      page.on('pageerror',e=>unexpected.push(e.message));page.on('requestfailed',r=>unexpected.push('request: '+r.url()));page.on('response',r=>{if(r.status()>=400)unexpected.push('HTTP '+r.status()+': '+r.url());});
      await page.goto(host.url+'/index.html');await page.waitForTimeout(100);
      const stem=hash(row.id).slice(0,16)+'-'+viewport.width+'-'+reducedMotion;
      if(['C1','C2'].includes(row.scenario))await page.screenshot({path:join(base,'observations',stem+'-early.png'),fullPage:true});
      await page.waitForTimeout(1200);
      const metrics=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,animations:document.getAnimations().filter(a=>a.playState==='running').length,videos:[...document.querySelectorAll('video')].map(v=>({paused:v.paused,time:v.currentTime,hidden:v.hidden,src:v.getAttribute('src'),loop:v.loop})),text:document.body.innerText,headings:[...document.querySelectorAll('h1,h2')].map(x=>x.textContent.trim()),links:[...document.querySelectorAll('a')].map(x=>({text:x.textContent.trim(),href:x.getAttribute('href')})),sections:document.querySelectorAll('main section').length}));
      assert.equal(metrics.overflow,false,'horizontal overflow');
      if(['C3','C4','C7'].includes(row.scenario)){assert.equal(metrics.animations,0,'static/restrained runtime');assert.equal(metrics.videos.length,0,'no invented media');assert.ok(!/@keyframes|\.animate\s*\(/.test(html),'no decorative animation implementation');}
      if(row.scenario==='C8'){assert.ok(metrics.videos.every(v=>!v.src),'no fabricated footage');assert.ok(/unavailable|not supplied|missing|not verified|could not|static|cannot|not tested|unverified/i.test(result.response+' '+metrics.text),'honest limitation');}
      if(row.scenario==='C3'){await page.selectOption('#filter',{label:'Ready'});assert.equal(await page.locator('#count').textContent(),'1 projects');assert.equal(await page.locator('[data-row]:visible').count(),1);}
      if(row.scenario==='C2'){
        await page.locator('video').first().evaluate(v=>v.parentElement.scrollIntoView({block:'center'}));
        for(const copy of ['INDEPENDENT FILM / 2026','Make room for the moving world.','Thoughtful films, clear stories, lasting places.','Explore the work','Selected work','Tidal study / 2026','Show details'])assert.ok(metrics.text.includes(copy),'preserved copy: '+copy);
        assert.equal(metrics.sections,2,'section count');const tokens=await page.evaluate(()=>{const s=getComputedStyle(document.documentElement);return ['--paper','--ink','--accent','--radius','--font'].map(k=>s.getPropertyValue(k).trim());});assert.deepEqual(tokens,['#f6f3eb','#163b43','#bf4e2e','0px','system-ui']);
        await page.locator('#details').click();assert.ok(await page.locator('#detail').isVisible());await page.locator('#details').click();assert.equal(await page.locator('#detail').isVisible(),false);await page.locator('#explore').click();assert.deepEqual(await page.evaluate(()=>window.analytics),['explore']);
        assert.equal(await page.locator('#explore').evaluate(el=>getComputedStyle(el).borderRadius),'0px');
      }
      if(['C1','C2'].includes(row.scenario)){
        await page.locator('video').first().evaluate(v=>v.parentElement.scrollIntoView({block:'center'}));await page.waitForTimeout(300);
        if(reducedMotion==='reduce')assert.ok(metrics.videos.every(v=>v.paused),'reduced-motion stops playback');
        else {await page.waitForFunction(()=>[...document.querySelectorAll('video')].some(v=>!v.paused&&v.currentTime>0));const firstTime=await page.locator('video').first().evaluate(v=>v.currentTime);await page.waitForTimeout(200);assert.notEqual(await page.locator('video').first().evaluate(v=>v.currentTime),firstTime);}
        await page.goto(host.url+'/index.html');await page.waitForTimeout(1500);await page.keyboard.press('Tab');const focus=await page.evaluate(()=>({tag:document.activeElement.tagName,outline:getComputedStyle(document.activeElement).outlineStyle}));assert.notEqual(focus.tag,'BODY');
        await page.screenshot({path:join(base,'observations',stem+'-settled.png'),fullPage:true});
      }
      assert.deepEqual(unexpected,[],'unexpected console/network failures');result.views.push({viewport,reducedMotion,touchEmulated:viewport.width===375,metrics,screenshots:['C1','C2'].includes(row.scenario)?[stem+'-early.png',stem+'-settled.png']:[]});await context.close();
    }}finally{await host.close();}result.checks.authority=true;result.checks.browser=true;
   }catch(error){result.errors.push(error.stack);}
   await json(join(base,'observations',row.id+'.json'),result);console.log('OBSERVED',row.id,result.errors.length?'FAIL':'PASS');
 }}finally{await browser.close();}
 await json(join(base,'observations/results.json'),results);console.log('MS_FE_OBSERVATION_COMPLETE');
}
if(process.argv[1]===fileURLToPath(import.meta.url))await observe(process.argv[2]??'comparison-v3');
