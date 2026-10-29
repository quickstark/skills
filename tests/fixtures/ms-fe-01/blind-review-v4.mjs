import {readFile,writeFile,mkdir,cp} from 'node:fs/promises';
import {join} from 'node:path';
import {createHash,randomBytes} from 'node:crypto';
import {chromium} from 'playwright-core';
import {here,browserPath,serve} from './runtime.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const base=join(here,'comparison-v4'),plan=JSON.parse(await readFile(join(base,'plan.json')));
let key;try{key=JSON.parse(await readFile(join(base,'review-key.json')));}catch{key={outputs:[]};}
const rows=[];for(const row of plan.schedule.filter(r=>['C1','C2'].includes(r.scenario)&&!key.outputs.some(k=>k.id===r.id))){
if(process.argv.includes('--available')){try{await readFile(join(base,'runs',row.id,'telemetry.json'));}catch{continue;}}
rows.push(row);}
for(const row of rows){const t=JSON.parse(await readFile(join(base,'runs',row.id,'telemetry.json')));if(!t.completedTurn||!t.nativeStreamComplete)throw Error('Unqualified capture '+row.id);}
await mkdir(join(base,'blind-review'),{recursive:true});
const ordered=rows.map(row=>({row,sort:randomBytes(12).toString('hex')})).sort((a,b)=>a.sort.localeCompare(b.sort));
const browser=await chromium.launch({executablePath:browserPath,headless:true});
try{for(const {row}of ordered){
 const blindId=randomBytes(8).toString('hex'),directory=join(base,'blind-review',blindId);await mkdir(directory);
 const source=join(base,'runs',row.id,'after');await cp(join(source,'index.html'),join(directory,'index.html'));await cp(join(source,'assets'),join(directory,'assets'),{recursive:true});
 const html=await readFile(join(directory,'index.html'));key.outputs.push({blindId,id:row.id,scenario:row.scenario,variant:row.variant,repetition:row.repetition,htmlSHA256:sha(html)});
 const host=await serve(directory),views=[];
 try{for(const viewport of [{width:375,height:812},{width:1440,height:900}])for(const reducedMotion of ['no-preference','reduce']){
   const context=await browser.newContext({viewport,reducedMotion,hasTouch:viewport.width===375}),page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>errors.push(r.url()));await page.goto(host.url+'/index.html');await page.waitForTimeout(1600);const image=`${viewport.width}-${reducedMotion}.png`;await page.screenshot({path:join(directory,image),fullPage:true});views.push({viewport,reducedMotion,image,errors,playback:await page.locator('video').evaluateAll(videos=>videos.map(v=>({paused:v.paused,time:v.currentTime,hidden:v.hidden}))) });await context.close();
 }}finally{await host.close();}
 await writeFile(join(directory,'views.json'),JSON.stringify(views,null,2)+'\n');
}
}finally{await browser.close();}
await writeFile(join(base,'review-key.json'),JSON.stringify(key,null,2)+'\n');
await writeFile(join(base,'blind-review/rubric.json'),JSON.stringify({scale:plan.rubric.scale,dimensions:plan.rubric.dimensions,notes:'Judge each output independently on the five dimensions using 0–4 scores. Variant identity is concealed. Inspect actual images, source, motion logic and views. Record concrete strengths/defects, including mobile composition, legibility, content preservation and failure handling. Do not open parent directories, decode output identities or infer scores from source length. Do not change products. Authoring task browser verification was centrally owned; do not penalize truthful author limitations as product defects.'},null,2)+'\n');
console.log('MS_FE_BLIND_REVIEW_READY');
