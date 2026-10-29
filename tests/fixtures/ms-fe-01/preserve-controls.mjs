import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright-core';
import {here,browserPath,serve} from './runtime.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const base=join(here,'comparison-v5'),plan=JSON.parse(await readFile(join(base,'plan.json')));
// Additive authority check; freezes computed-style criteria before browser execution.
const properties=['fontFamily','fontSize','fontWeight','fontStyle','lineHeight','color','backgroundColor','paddingTop','paddingRight','paddingBottom','paddingLeft','borderTopWidth','borderRightWidth','borderBottomWidth','borderLeftWidth','borderTopStyle','borderTopColor','borderRadius','textDecorationLine'];
const selectors=['header a[href="#work"]','header a[href="mailto:studio@example.test"]','#explore','#details'];
const definition={planSHA256:sha(await readFile(join(base,'plan.json'))),sourceSHA256:sha(await readFile(new URL(import.meta.url))),properties,selectors,viewports:[{width:375,height:812},{width:768,height:1024},{width:1440,height:900},{width:812,height:375}],note:'Same browser computes supplied original and final C2 controls; no authoring retries. Checks supplied control style preservation beyond existing token/radius assertions. Baseline defects are recorded; candidate preservation is mandatory.'};
await writeFile(join(base,'control-preservation-plan.json'),JSON.stringify(definition,null,2)+'\n',{flag:'wx'});
const browser=await chromium.launch({executablePath:browserPath,headless:true}),results=[];
const original=await serve(join(base,'project'));
try{
 for(const row of plan.schedule.filter(r=>r.scenario==='C2')){
  const host=await serve(join(base,'runs',row.id,'after'));try{for(const viewport of definition.viewports){
   const context=await browser.newContext({viewport,reducedMotion:'reduce'}),page=await context.newPage();
   const sample=async url=>{await page.goto(url);return page.evaluate(({selectors,properties})=>Object.fromEntries(selectors.map(selector=>{const s=getComputedStyle(document.querySelector(selector));return [selector,Object.fromEntries(properties.map(p=>[p,s[p]]))];})),{selectors,properties});};
   const before=await sample(original.url+'/branded.html'),after=await sample(host.url+'/index.html');
   const differences=[];for(const selector of selectors)for(const property of properties)if(before[selector][property]!==after[selector][property])differences.push({selector,property,before:before[selector][property],after:after[selector][property]});
   results.push({id:row.id,variant:row.variant,viewport,differences,before,after});await context.close();
  }}finally{await host.close();}
 }
}finally{await original.close();await browser.close();}
await writeFile(join(base,'control-preservation.json'),JSON.stringify({definition,results},null,2)+'\n',{flag:'wx'});
assert.ok(results.filter(r=>r.variant==='candidate').every(r=>r.differences.length===0),'control preservation differences recorded');console.log('MS_FE_CONTROLS_PRESERVED');
