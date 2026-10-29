import fs from 'node:fs';
import assert from 'node:assert/strict';
const port=process.argv[2] || '9331';
const reduced=process.argv[3]==='reduce';
const ws=new WebSocket(`ws://127.0.0.1:${port}/session`);
await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
let id=0;const pending=new Map();
ws.onmessage=e=>{const m=JSON.parse(e.data);if(pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);m.type==='error'?p.reject(m):p.resolve(m.result);}};
const cmd=(method,params={})=>new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}));});
let context;
const evaluate=async expression=>{const r=await cmd('script.evaluate',{expression:`JSON.stringify(${expression})`,target:{context},awaitPromise:true});if(r.type==='exception')throw Error(JSON.stringify(r));return r.result.value === undefined ? undefined : JSON.parse(r.result.value);};
const nav=path=>cmd('browsingContext.navigate',{context,url:`http://127.0.0.1:8931/${path}`,wait:'complete'});
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const key=async value=>cmd('input.performActions',{context,actions:[{type:'key',id:'keyboard',actions:[{type:'keyDown',value},{type:'keyUp',value}]}]});
const signature=`(() => {
 const styles=el=>{const s=getComputedStyle(el);return Object.fromEntries(['fontFamily','fontSize','fontWeight','lineHeight','borderRadius','backgroundColor','color','paddingTop','paddingRight','paddingBottom','paddingLeft','borderTopWidth','borderTopStyle','borderTopColor'].map(k=>[k,s[k]]));};
 return {copy:[...document.querySelectorAll('header span,header a,#intro p,h1,#explore,h2,#work p,#details')].map(el=>el.textContent),links:[...document.querySelectorAll('a')].map(el=>[el.textContent,el.getAttribute('href')]),ids:[...document.querySelectorAll('[id]')].map(el=>el.id),controls:[...document.querySelectorAll('a,button')].map(el=>({text:el.textContent,style:styles(el)})),tokens:Object.fromEntries(['--paper','--ink','--accent','--radius','--font'].map(k=>[k,getComputedStyle(document.documentElement).getPropertyValue(k)])),sections:document.querySelectorAll('section').length};
})()`;
try {
 await cmd('session.new',{capabilities:{alwaysMatch:{}}});
 ({contexts:[{context}]}=await cmd('browsingContext.getTree'));
 await cmd('browsingContext.setViewport',{context,viewport:{width:1440,height:1000},devicePixelRatio:1});
 await nav('.browser-check/baseline.html');
 const baseline=await evaluate(signature);
 await nav('index.html');
 await cmd('browsingContext.activate',{context});
 await wait(1100);
 const result=await evaluate(signature);
 // Hierarchy changes may affect headings and paragraphs; existing controls may not change.
 assert.deepEqual(result.links,baseline.links);assert.deepEqual(result.ids,baseline.ids);assert.deepEqual(result.tokens,baseline.tokens);assert.deepEqual(result.controls,baseline.controls);assert.deepEqual(result.copy,baseline.copy);assert.equal(result.sections,2);
 console.log('PASS: exact copy, destinations, IDs, brand tokens and computed control styles');
 const media=await evaluate(`({reduce:matchMedia('(prefers-reduced-motion: reduce)').matches,paused:document.querySelector('video').paused,time:document.querySelector('video').currentTime,ready:document.querySelector('video').readyState,error:document.querySelector('video').error?.code,controls:document.querySelector('video').controls,muted:document.querySelector('video').muted})`);
 assert.equal(media.reduce,reduced);assert.equal(media.controls,true);assert.equal(media.muted,true);
 if(reduced){assert.equal(media.paused,true);assert.equal(media.time,0);assert.equal(await evaluate(`document.querySelectorAll('.reveal-ready').length`),0);console.log('PASS: actual reduced-motion media query; no autoplay or reveal concealment');}
 else {assert.equal(media.paused,false);assert.ok(media.time>0);assert.ok(media.ready>=2);console.log('PASS: local WebM decodes and autoplays muted with native pause controls',media);}
 await evaluate(`document.activeElement.blur()`);
 await key('\uE004');assert.equal(await evaluate(`document.activeElement.textContent`),'Work');
 await key('\uE004');assert.equal(await evaluate(`document.activeElement.textContent`),'Contact');
 await key('\uE004');assert.equal(await evaluate(`document.activeElement.id`),'explore');
 console.log('Focus rendering observation:',await evaluate(`({focused:document.hasFocus(),visible:document.activeElement.matches(':focus-visible'),outline:getComputedStyle(document.activeElement).outline})`));
 await key('\uE007');await wait(150);
 assert.deepEqual(await evaluate('window.analytics'),['explore']);assert.equal(await evaluate('location.hash'),'#work');
 for(let i=0;i<18;i++){await key('\uE004');if(await evaluate(`document.activeElement.id === 'details'`))break;}
 assert.equal(await evaluate(`document.activeElement.id`),'details');
 await key('\uE007');await wait(100);assert.equal(await evaluate(`document.querySelector('#detail').hidden`),false);
 await key(' ');await wait(100);assert.equal(await evaluate(`document.querySelector('#detail').hidden`),true);
 console.log('PASS: keyboard navigation, CTA anchor + analytics, Enter/Space details toggle');
 if(!reduced){await cmd('browsingContext.setViewport',{context,viewport:{width:1440,height:500},devicePixelRatio:1});await evaluate('scrollTo(0,document.body.scrollHeight)');await wait(200);assert.equal(await evaluate(`document.querySelector('video').paused`),true);await evaluate('scrollTo(0,0)');await wait(200);assert.equal(await evaluate(`document.querySelector('video').paused`),true);console.log('PASS: media pauses outside viewport and does not override pause on re-entry');}
 for(const width of [1440,768,390,320]){
  await cmd('browsingContext.setViewport',{context,viewport:{width,height:900},devicePixelRatio:1});
  await evaluate(`scrollTo(0,document.body.scrollHeight)`);await wait(850);
  const layout=await evaluate(`({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,hidden:[...document.querySelectorAll('[data-reveal]')].filter(el=>el.getBoundingClientRect().bottom>0&&el.getBoundingClientRect().top<innerHeight&&+getComputedStyle(el).opacity!==1).length,controls:[...document.querySelectorAll('a,button')].map(el=>({text:el.textContent,size:getComputedStyle(el).fontSize,radius:getComputedStyle(el).borderRadius}))})`);
  assert.ok(layout.scrollWidth<=width,JSON.stringify(layout));assert.equal(layout.hidden,0);assert.ok(layout.controls.every(el=>el.radius==='0px'));assert.equal(layout.controls.find(el=>el.text==='Work').size,'18px');
  await evaluate('scrollTo(0,0)');await wait(850);
  if(width===1440||width===390){const shot=await cmd('browsingContext.captureScreenshot',{context,origin:'document',format:{type:'image/png'}});fs.writeFileSync(`.browser-check/${reduced?'reduced':'normal'}-${width}.png`,Buffer.from(shot.data,'base64'));}
  console.log(`PASS: ${width}px viewport, no overflow, visible reveals, square controls and unchanged navigation type`);
 }
} finally { await cmd('session.end');ws.close(); }
